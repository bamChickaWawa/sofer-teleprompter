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

// getTarget(): () => { text, isShem } | null  -- null means "not listening for anything right now"
// getSensitivity(): () => "loose" | "normal" | "strict"
// onMatch(): called when the spoken word matches the current target
export function createVoiceController({ getTarget, getSensitivity, onMatch, onStatusChange }) {
  let recognition = null;
  let active = false;
  let restartTimer = null;

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

  function start() {
    if (!isSpeechRecognitionSupported() || active) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = "he-IL";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = handleResult;
    recognition.onerror = (e) => {
      console.warn("[voice] recognition error:", e.error);
      setStatus(e.error === "not-allowed" ? "denied" : "error");
    };
    recognition.onend = () => {
      if (!active) return;
      restartTimer = setTimeout(() => {
        try {
          recognition.start();
        } catch {
          /* already running / transient - next onend will retry */
        }
      }, 300);
    };
    try {
      recognition.start();
      active = true;
      setStatus("listening");
    } catch (err) {
      console.warn("[voice] failed to start recognition:", err);
      setStatus("error");
    }
  }

  function stop() {
    active = false;
    clearTimeout(restartTimer);
    if (recognition) {
      recognition.onend = null;
      recognition.stop();
    }
    setStatus("stopped");
  }

  return { start, stop };
}
