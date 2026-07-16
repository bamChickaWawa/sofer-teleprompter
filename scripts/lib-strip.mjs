// Shared text-cleaning for Sefaria MAM fetches.
//
// MAM marks otiyot rabati/zeira with <big>/<small> tags - we extract those
// into per-verse "specials" ([wordIdx, charIdx, "r"|"z"]) before stripping.
// Ketiv/qere: the scroll contains the ketiv; qere spans ([...]) are dropped.
// Maqaf becomes a space: maqaf-joined words are written separately on klaf.

const OPEN_BIG = "";
const CLOSE_BIG = "";
const OPEN_SMALL = "";
const CLOSE_SMALL = "";

function stripKeepingSentinels(s) {
  return s
    .replace(/<sup[^>]*>.*?<\/sup>/g, "")
    .replace(/<i class="footnote">.*?<\/i>/g, "")
    .replace(/<big>/g, OPEN_BIG)
    .replace(/<\/big>/g, CLOSE_BIG)
    .replace(/<small>/g, OPEN_SMALL)
    .replace(/<\/small>/g, CLOSE_SMALL)
    .replace(/<[^>]+>/g, "")
    .replace(/\*\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[()]/g, "")
    .replace(new RegExp("\\u05BE", "g"), " ")
    .replace(new RegExp("[\\u0591-\\u05C7]", "g"), "")
    .replace(new RegExp("[\\u200E\\u200F\\u200D\\u034F]", "g"), "")
    .replace(/&nbsp;/g, " ")
    .replace(/&thinsp;/g, " ")
    .replace(/\{[פסר]\}/g, "")
    .replace(/[*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Returns { words: string[], specials: [wordIdx, charIdx, "r"|"z"][] }
export function cleanVerse(raw) {
  const withSentinels = stripKeepingSentinels(raw);
  const words = [];
  const specials = [];
  let wordIdx = 0;
  let charIdx = 0;
  let current = "";
  let mode = null; // "r" | "z" | null

  const pushWord = () => {
    if (current) {
      words.push(current);
      wordIdx++;
      current = "";
      charIdx = 0;
    }
  };

  for (const ch of withSentinels) {
    if (ch === OPEN_BIG) mode = "r";
    else if (ch === OPEN_SMALL) mode = "z";
    else if (ch === CLOSE_BIG || ch === CLOSE_SMALL) mode = null;
    else if (ch === " ") pushWord();
    else if (/[א-ת]/.test(ch)) {
      if (mode) specials.push([wordIdx, charIdx, mode]);
      current += ch;
      charIdx++;
    }
    // anything else (stray punctuation like sof-pasuk already stripped) is dropped
  }
  pushWord();
  return { words, specials };
}
