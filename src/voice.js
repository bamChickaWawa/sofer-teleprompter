import { SHEM_KINUI } from "./declarations.js";

// Consonant-skeleton normalize: strip nikud/teamim (defensive; our source
// texts already have none), keep only Hebrew letters, and collapse final
// letter forms to their base form so recognition quirks don't cause misses.
function normalizeHebrew(s) {
  return s
    .replace(new RegExp("[\\u0591-\\u05C7]", "g"), "")
    .replace(new RegExp("[^\\u05D0-\\u05EA]", "g"), "")
    .replace(/ך/g, "כ")
    .replace(/ם/g, "מ")
    .replace(/ן/g, "נ")
    .replace(/ף/g, "פ")
    .replace(/ץ/g, "צ");
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// Divisor: lower = more forgiving (bigger allowed edit distance).
export const SENSITIVITY_DIVISORS = { loose: 2, normal: 3, strict: 4 };

// Forgiving on purpose: tap/spacebar is always the halachically-fine
// fallback, so voice only needs to be generously right, not exact.
export function fuzzyMatchesWord(spoken, expected, sensitivity = "normal") {
  const a = normalizeHebrew(spoken);
  const b = normalizeHebrew(expected);
  if (!a || !b) return false;
  if (a === b) return true;
  const divisor = SENSITIVITY_DIVISORS[sensitivity] ?? SENSITIVITY_DIVISORS.normal;
  const threshold = Math.max(1, Math.ceil(Math.max(a.length, b.length) / divisor));
  return levenshtein(a, b) <= threshold;
}

// A Shem is never pronounced as written (Keset HaSofer ch. 10), so match
// the kinui instead of the word's actual letters.
export function matchesKinui(spoken) {
  const normalizedSpoken = normalizeHebrew(spoken);
  const lowerSpoken = spoken.trim().toLowerCase();
  return SHEM_KINUI.some((k) => {
    const normalizedK = normalizeHebrew(k);
    return (normalizedK && normalizedSpoken === normalizedK) || lowerSpoken === k.toLowerCase();
  });
}

export function isSpeechRecognitionSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

const BASE_RETRY_MS = 300;
const MAX_RETRY_MS = 4000;

// getTarget(): () => { text, isShem } | null  -- null means "not listening for anything right now"
// getSensitivity(): () => "loose" | "normal" | "strict"
// onMatch(): called when the spoken word matches the current target
export function createVoiceController({ getTarget, getSensitivity, onMatch, onStatusChange }) {
  let current = null; // the recognition instance we currently consider "ours"
  let active = false; // user/app intent: should we be listening at all
  let restartTimer = null;
  let retryDelay = BASE_RETRY_MS;

  function setStatus(status) {
    if (onStatusChange) onStatusChange(status);
  }

  function handleResult(event) {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (!result.isFinal) continue;
      const target = getTarget();
      if (!target) continue;
      const tokens = result[0].transcript.trim().split(/\s+/).filter(Boolean);
      const sensitivity = getSensitivity ? getSensitivity() : "normal";
      const matched = tokens.some((tok) =>
        target.isShem ? matchesKinui(tok) : fuzzyMatchesWord(tok, target.text, sensitivity)
      );
      if (matched) onMatch();
    }
  }

  // Chrome ends a "continuous" recognition session on its own every so
  // often (after silence, or a rolling ~60s cap) regardless of the
  // continuous flag - that is expected, not an error, and this loop exists
  // specifically to transparently restart it. Each instance's handlers close
  // over THAT instance (never the shared `current`), and only act while it
  // is still the instance we consider current - so a stale instance whose
  // onend fires late (e.g. right after a toggle-driven restart) can never
  // clobber a newer, already-running one. A failed start() is retried with
  // capped backoff instead of being silently dropped.
  function spawn() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = "he-IL";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = handleResult;

    rec.onerror = (e) => {
      if (current !== rec) return;
      console.warn("[voice] recognition error:", e.error);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        active = false;
        clearTimeout(restartTimer);
        setStatus("denied");
        return;
      }
      setStatus(e.error === "no-speech" ? "listening" : "error");
    };

    rec.onend = () => {
      if (current !== rec || !active) return;
      clearTimeout(restartTimer);
      restartTimer = setTimeout(attemptStart, retryDelay);
    };

    function attemptStart() {
      if (current !== rec || !active) return;
      try {
        rec.start();
        retryDelay = BASE_RETRY_MS;
        setStatus("listening");
      } catch (err) {
        console.warn("[voice] restart failed, backing off:", err?.message ?? err);
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS);
        clearTimeout(restartTimer);
        restartTimer = setTimeout(attemptStart, retryDelay);
      }
    }

    return { rec, attemptStart };
  }

  function start() {
    if (!isSpeechRecognitionSupported() || active) return;
    active = true;
    retryDelay = BASE_RETRY_MS;
    const { rec, attemptStart } = spawn();
    current = rec;
    attemptStart();
  }

  function stop() {
    active = false;
    clearTimeout(restartTimer);
    if (current) {
      const rec = current;
      current = null; // any in-flight handler for `rec` now sees itself as stale
      rec.onend = null;
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    setStatus("stopped");
  }

  return { start, stop };
}
