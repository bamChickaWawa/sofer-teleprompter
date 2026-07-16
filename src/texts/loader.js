import { buildMezuzah, buildTefillinRashi, buildTefillinRT } from "./compose.js";
import { SHEM_RE, SAFEK_RE } from "../declarations.js";
import { generateLayout, MEGILLAH_FORMATS } from "./layout-gen.js";

export { MEGILLAH_FORMATS };

const SPECIAL_TYPE = { r: "rabati", z: "zeira" };

// Adapts the compact format ({verses:[{c,v,words:[...],s?:[[wi,ci,t]]}]})
// into the word-object shape the display/state machine uses.
function adaptCompact(compact) {
  const words = [];
  for (const verse of compact.verses) {
    const specialsByWord = new Map();
    if (verse.s) {
      for (const [wi, ci, t] of verse.s) {
        if (!specialsByWord.has(wi)) specialsByWord.set(wi, []);
        specialsByWord.get(wi).push({ index: ci, type: SPECIAL_TYPE[t] });
      }
    }
    verse.words.forEach((text, i) => {
      words.push({
        text,
        isShem: SHEM_RE.test(text),
        isSafekShem: SAFEK_RE.test(text),
        specialLetters: specialsByWord.get(i) ?? [],
        tagin: [],
        lineBreakAfter: false,
        columnBreakAfter: false,
        parshiaBreak: false,
        perek: verse.c,
        pasuk: verse.v,
        pasukStart: i === 0,
      });
    });
  }
  return words;
}

// Applies a generated draft layout: flat lineBreakAfter/columnBreakAfter
// flags plus per-word amud/line numbers for the position readout.
function applyGeneratedLayout(words, opts) {
  const { lineEnds, colEnds, note } = generateLayout(words, opts);
  let amud = 1;
  let line = 1;
  for (let i = 0; i < words.length; i++) {
    words[i].amud = amud;
    words[i].line = line;
    if (lineEnds.has(i)) {
      words[i].lineBreakAfter = true;
      line++;
    }
    if (colEnds.has(i)) {
      words[i].columnBreakAfter = true;
      amud++;
      line = 1;
    }
  }
  return note;
}

const cache = new Map();

export async function loadTorahManifest() {
  if (cache.has("torah-manifest")) return cache.get("torah-manifest");
  const res = await fetch("/texts/torah/torah-manifest.json");
  if (!res.ok) throw new Error(`torah manifest fetch failed: ${res.status}`);
  const manifest = await res.json();
  cache.set("torah-manifest", manifest);
  return manifest;
}

async function fetchCompact(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`text fetch failed: ${res.status} for ${path}`);
  return res.json();
}

const DRAFT_NOTE = "Auto-generated draft layout — not a traditional tikkun layout. Line breaks are mechanical approximations.";

// id forms:
//   "mezuzah" | "tefillin" (order passed separately)
//   "torah:<slug>"
//   "megillah:<format>"  (format keys of MEGILLAH_FORMATS)
export async function loadText(id, { rtOrder } = {}) {
  const cacheKey = id === "tefillin" ? `tefillin:${rtOrder}` : id;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let text;
  if (id === "mezuzah") {
    text = buildMezuzah();
    text.layoutNote = "Traditional 22-line mezuzah layout";
  } else if (id === "tefillin") {
    text = rtOrder === "rt" ? buildTefillinRT() : buildTefillinRashi();
    // draft flat lines, tefillin-parchment width (no verified line data yet)
    text.words = text.words.map((w) => ({ ...w }));
    text.layoutNote = applyGeneratedLayout(text.words, { charsPerLine: 30, note: DRAFT_NOTE }) ?? DRAFT_NOTE;
    text.hasLines = true;
  } else if (id.startsWith("torah:")) {
    const slug = id.slice("torah:".length);
    const compact = await fetchCompact(`/texts/torah/${slug}.json`);
    const words = adaptCompact(compact);
    const note = applyGeneratedLayout(words, { linesPerColumn: 42, charsPerLine: 30, note: DRAFT_NOTE });
    text = {
      verified: compact.verified,
      _UNVERIFIED: compact._UNVERIFIED,
      title: `${compact.sefer} — ${compact.parsha}`,
      heTitle: `${compact.seferHe} · ${compact.parshaHe}`,
      hasLines: true,
      layoutNote: note ?? DRAFT_NOTE,
      sefariaRef: compact.sefariaRef,
      wordCount: compact.wordCount,
      words,
    };
  } else if (id.startsWith("megillah:")) {
    const format = id.slice("megillah:".length);
    const fmt = MEGILLAH_FORMATS[format];
    if (!fmt) throw new Error(`unknown megillah format: ${format}`);
    const compact = await fetchCompact("/texts/megillah/esther.json");
    const words = adaptCompact(compact);
    let layoutNote = null;
    let hasLines = false;
    if (fmt.linesPerColumn) {
      layoutNote = applyGeneratedLayout(words, {
        linesPerColumn: fmt.linesPerColumn,
        charsPerLine: fmt.charsPerLine,
        columnStartWord: fmt.columnStartWord ?? null,
        note: DRAFT_NOTE,
      });
      hasLines = true;
    }
    text = {
      verified: compact.verified,
      _UNVERIFIED: compact._UNVERIFIED,
      title: `Megillat Esther — ${fmt.label}`,
      heTitle: `מגילת אסתר · ${fmt.heLabel}`,
      hasLines,
      layoutNote: layoutNote ?? (fmt.linesPerColumn ? DRAFT_NOTE : null),
      sefariaRef: compact.sefariaRef,
      wordCount: compact.wordCount,
      words,
    };
  } else {
    throw new Error(`unknown text id: ${id}`);
  }

  cache.set(cacheKey, text);
  return text;
}
