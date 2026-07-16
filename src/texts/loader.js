import { buildMezuzah, buildTefillinRashi, buildTefillinRT } from "./compose.js";

// Certain-Shem detection: the Tetragrammaton, bare or behind prefix letters.
const SHEM_RE = /^[ולבמכ]{0,2}יהוה$/;

// Doubtful-Name detection (שמות מסופקין): the אלהים family. These are
// USUALLY kodesh but sometimes chol (judges, idols), which is exactly why
// they get flagged for the sofer's attention rather than gated - the app
// must not rule on safek Names. See Keset HaSofer ch. 10.
const SAFEK_RE = /^[ולבמכהש]{0,2}אלה(ים|יך|ינו|יכם|יהם|י)$/;

// Adapts the compact Torah format ({verses:[{c,v,words:[...]}]}) into the
// word-object shape the display/state machine uses.
function adaptCompact(compact) {
  const words = [];
  for (const verse of compact.verses) {
    verse.words.forEach((text, i) => {
      words.push({
        text,
        isShem: SHEM_RE.test(text),
        isSafekShem: SAFEK_RE.test(text),
        specialLetters: [],
        tagin: [],
        lineBreakAfter: false,
        parshiaBreak: false,
        perek: verse.c,
        pasuk: verse.v,
        pasukStart: i === 0,
      });
    });
  }
  return {
    verified: compact.verified,
    _UNVERIFIED: compact._UNVERIFIED,
    title: `${compact.sefer} — ${compact.parsha}`,
    heTitle: `${compact.seferHe} · ${compact.parshaHe}`,
    hasLines: false,
    sefariaRef: compact.sefariaRef,
    wordCount: compact.wordCount,
    words,
  };
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

// id forms: "mezuzah" | "tefillin" (order passed separately) | "torah:<slug>"
export async function loadText(id, { rtOrder } = {}) {
  const cacheKey = id === "tefillin" ? `tefillin:${rtOrder}` : id;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let text;
  if (id === "mezuzah") {
    text = buildMezuzah();
  } else if (id === "tefillin") {
    text = rtOrder === "rt" ? buildTefillinRT() : buildTefillinRashi();
  } else if (id.startsWith("torah:")) {
    const slug = id.slice("torah:".length);
    const res = await fetch(`/texts/torah/${slug}.json`);
    if (!res.ok) throw new Error(`torah text fetch failed: ${res.status} for ${slug}`);
    text = adaptCompact(await res.json());
  } else {
    throw new Error(`unknown text id: ${id}`);
  }

  cache.set(cacheKey, text);
  return text;
}
