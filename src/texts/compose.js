import kadesh from "./parshiyot/kadesh.json";
import vhayaKi from "./parshiyot/vhaya-ki.json";
import shema from "./parshiyot/shema.json";
import vhayaIm from "./parshiyot/vhaya-im.json";

const PARSHIYOT = { kadesh, vhayaKi, shema, vhayaIm };

function markParshiaBreaks(words, breakIndices) {
  return words.map((w, i) => (breakIndices.has(i) ? { ...w, parshiaBreak: true } : { ...w, parshiaBreak: false }));
}

function compose(parshiot, title) {
  const words = [];
  const breakIndices = new Set();
  for (const p of parshiot) {
    words.push(...p.words);
    breakIndices.add(words.length - 1);
  }
  return {
    verified: parshiot.every((p) => p.verified),
    _UNVERIFIED: "Composed from individually-fetched parshiyot; see src/texts/parshiyot/*.json for per-parsha verification status.",
    title,
    sefariaRef: parshiot.map((p) => p.sefariaRef).join(" + "),
    wordCount: words.length,
    words: markParshiaBreaks(words, breakIndices),
  };
}

export function buildMezuzah() {
  return compose([PARSHIYOT.shema, PARSHIYOT.vhayaIm], "Mezuzah");
}

// Rashi order: Torah reading order (Shemot before Devarim; Shema before V'haya im shamoa).
export function buildTefillinRashi() {
  return compose(
    [PARSHIYOT.kadesh, PARSHIYOT.vhayaKi, PARSHIYOT.shema, PARSHIYOT.vhayaIm],
    "Tefillin (Rashi order)"
  );
}

// Rabbeinu Tam order: last two parshiyot swapped. Flagged for confirmation like
// everything else - the shel-rosh compartment arrangement is a separate, more
// involved question than this flat shel-yad-style word sequence models (v2+).
export function buildTefillinRT() {
  return compose(
    [PARSHIYOT.kadesh, PARSHIYOT.vhayaKi, PARSHIYOT.vhayaIm, PARSHIYOT.shema],
    "Tefillin (Rabbeinu Tam order)"
  );
}
