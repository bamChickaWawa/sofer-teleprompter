import kadesh from "./parshiyot/kadesh.json";
import vhayaKi from "./parshiyot/vhaya-ki.json";
import shema from "./parshiyot/shema.json";
import vhayaIm from "./parshiyot/vhaya-im.json";

const PARSHIYOT = { kadesh, vhayaKi, shema, vhayaIm };

// layoutKey selects a per-parsha line layout (e.g. "mezuzah22"). When every
// composed parsha carries that layout, the flat per-word lineBreakAfter flags
// are derived from it and hasLines is set - the renderer then draws fixed,
// justified lines instead of flowing text. Parshiyot without layout data
// (tefillin, for now) stay free-flowing.
function compose(parshiot, title, heTitle, { layoutKey } = {}) {
  const words = [];
  const hasLines = Boolean(layoutKey) && parshiot.every((p) => p.layouts?.[layoutKey]);

  for (const p of parshiot) {
    const layout = hasLines ? p.layouts[layoutKey] : null;
    const lineEnds = new Set(layout ? layout.lineEnds : []);
    p.words.forEach((w, i) => {
      words.push({
        ...w,
        lineBreakAfter: lineEnds.has(i),
        parshiaBreak: false,
      });
    });
    words[words.length - 1].parshiaBreak = true;
  }

  return {
    verified: parshiot.every((p) => p.verified),
    _UNVERIFIED: "Composed from individually-fetched parshiyot; see src/texts/parshiyot/*.json for per-parsha verification status.",
    title,
    heTitle,
    hasLines,
    sefariaRef: parshiot.map((p) => p.sefariaRef).join(" + "),
    wordCount: words.length,
    words,
  };
}

export function buildMezuzah() {
  return compose([PARSHIYOT.shema, PARSHIYOT.vhayaIm], "Mezuzah", "מזוזה", { layoutKey: "mezuzah22" });
}

// Rashi order: Torah reading order (Shemot before Devarim; Shema before V'haya im shamoa).
export function buildTefillinRashi() {
  return compose(
    [PARSHIYOT.kadesh, PARSHIYOT.vhayaKi, PARSHIYOT.shema, PARSHIYOT.vhayaIm],
    "Tefillin (Rashi order)",
    "תפילין רש״י"
  );
}

// Rabbeinu Tam order: last two parshiyot swapped. Flagged for confirmation like
// everything else - the shel-rosh compartment arrangement is a separate, more
// involved question than this flat shel-yad-style word sequence models (v2+).
export function buildTefillinRT() {
  return compose(
    [PARSHIYOT.kadesh, PARSHIYOT.vhayaKi, PARSHIYOT.vhayaIm, PARSHIYOT.shema],
    "Tefillin (Rabbeinu Tam order)",
    "תפילין ר״ת"
  );
}
