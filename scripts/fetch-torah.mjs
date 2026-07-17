// Fetches the full Torah, parsha by parsha, from Sefaria's "Miqra according
// to the Masorah" edition and writes compact per-parsha JSON into
// public/texts/torah/ plus a generated manifest (torah-manifest.json).
//
// Same nikud/teamim-stripping rules as the tefillin/mezuzah generator,
// including the critical maqaf -> space rule (maqaf-joined words are still
// written as separate words on a klaf).
//
// Output is a DRAFT: verified:false everywhere. A sofer must check any
// parsha against a printed tikkun before writing from it.

import fs from "node:fs";
import path from "node:path";
import { cleanVerse } from "./lib-strip.mjs";

const BOOKS = [
  { en: "Genesis", he: "בראשית" },
  { en: "Exodus", he: "שמות" },
  { en: "Leviticus", he: "ויקרא" },
  { en: "Numbers", he: "במדבר" },
  { en: "Deuteronomy", he: "דברים" },
];

const OUT_DIR = "public/texts/torah";


async function fetchJson(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const manifest = [];

for (const book of BOOKS) {
  const index = await fetchJson(`https://www.sefaria.org/api/v2/index/${book.en}`);
  const parshiyot = index.alts?.Parasha?.nodes ?? [];
  console.log(`${book.en}: ${parshiyot.length} parshiyot`);

  const bookEntry = { sefer: book.en, seferHe: book.he, parshiyot: [] };

  for (const p of parshiyot) {
    const slug = slugify(p.title);
    const apiRef = encodeURIComponent(p.wholeRef.replace(/ /g, "_"));
    const data = await fetchJson(`https://www.sefaria.org/api/v3/texts/${apiRef}`);
    const v =
      data.versions.find((x) => x.language === "he" && x.isPrimary) ??
      data.versions.find((x) => x.language === "he");

    // v.text: array of chapters (each an array of verse strings) for
    // multi-chapter ranges, or a flat array of verse strings for
    // single-chapter ranges.
    const chapters = Array.isArray(v.text[0]) ? v.text : [v.text];
    const startChapter = parseInt(p.wholeRef.match(/ (\d+):/)[1], 10);
    const startVerse = parseInt(p.wholeRef.match(/:(\d+)/)[1], 10);

    const verses = [];
    let wordCount = 0;
    chapters.forEach((chapterVerses, ci) => {
      const chapterNum = startChapter + ci;
      chapterVerses.forEach((verseRaw, vi) => {
        const verseNum = ci === 0 ? startVerse + vi : vi + 1;
        const { words, specials, breaks } = cleanVerse(verseRaw);
        if (!words.length) return;
        wordCount += words.length;
        const verse = { c: chapterNum, v: verseNum, words };
        if (specials.length) verse.s = specials;
        if (breaks.length) verse.br = breaks;
        verses.push(verse);
      });
    });

    const out = {
      _UNVERIFIED:
        "Fetched from Sefaria (Miqra according to the Masorah), nikud/teamim stripped mechanically; rabati/zeira letters extracted from MAM's big/small markup - NOT hand-verified against a printed tikkun. Do not write from this text until 'verified' is flipped to true by the sofer.",
      verified: false,
      sefer: book.en,
      seferHe: book.he,
      parsha: p.title,
      parshaHe: p.heTitle,
      sefariaRef: p.wholeRef,
      wordCount,
      verses,
    };

    fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(out));
    bookEntry.parshiyot.push({ slug, title: p.title, heTitle: p.heTitle, ref: p.wholeRef, wordCount });
    console.log(`  ${p.heTitle} (${p.wholeRef}): ${wordCount} words`);
  }

  manifest.push(bookEntry);
}

fs.writeFileSync(path.join(OUT_DIR, "torah-manifest.json"), JSON.stringify(manifest, null, 2));

const totalWords = manifest.flatMap((b) => b.parshiyot).reduce((sum, p) => sum + p.wordCount, 0);
console.log(`\nTotal: ${manifest.length} books, ${manifest.flatMap((b) => b.parshiyot).length} parshiyot, ${totalWords} words`);
console.log("Expected total per Masoretic tradition: 79,976-80,000ish words (majority count 79,976).");
