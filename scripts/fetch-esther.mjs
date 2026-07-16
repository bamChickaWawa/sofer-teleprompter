// Fetches Megillat Esther (all 10 chapters) from Sefaria's "Miqra according
// to the Masorah" edition into public/texts/megillah/esther.json, compact
// verses format. Special letters (rabati/zeira) are extracted mechanically
// from MAM's <big>/<small> markup into per-verse "s" entries.

import fs from "node:fs";
import { cleanVerse } from "./lib-strip.mjs";

const res = await fetch("https://www.sefaria.org/api/v3/texts/Esther.1-10");
const data = await res.json();
const v =
  data.versions.find((x) => x.language === "he" && x.isPrimary) ??
  data.versions.find((x) => x.language === "he");

const chapters = Array.isArray(v.text[0]) ? v.text : [v.text];
const verses = [];
let wordCount = 0;
let specialCount = 0;
chapters.forEach((chapterVerses, ci) => {
  chapterVerses.forEach((verseRaw, vi) => {
    const { words, specials } = cleanVerse(verseRaw);
    if (!words.length) return;
    wordCount += words.length;
    specialCount += specials.length;
    const verse = { c: ci + 1, v: vi + 1, words };
    if (specials.length) verse.s = specials;
    verses.push(verse);
  });
});

const out = {
  _UNVERIFIED:
    "Fetched from Sefaria (Miqra according to the Masorah), nikud/teamim stripped mechanically; rabati/zeira letters extracted from MAM's big/small markup - NOT hand-verified against a printed tikkun. Note: MAM writes ארדי (9:9) with a note that many megillot write ארידי - confirm with your tikkun/posek. Do not write from this text until 'verified' is flipped to true by the sofer.",
  verified: false,
  title: "Megillat Esther",
  heTitle: "מגילת אסתר",
  sefariaRef: "Esther 1-10",
  wordCount,
  verses,
};

fs.mkdirSync("public/texts/megillah", { recursive: true });
fs.writeFileSync("public/texts/megillah/esther.json", JSON.stringify(out));

let nonHebrew = 0;
for (const vv of verses) for (const w of vv.words) for (const ch of w) if (!/[א-ת]/.test(ch)) nonHebrew++;
console.log(`Esther: ${verses.length} verses (want 167), ${wordCount} words, ${specialCount} special letters, non-Hebrew: ${nonHebrew}`);
for (const vv of verses.filter((x) => x.s)) {
  for (const [wi, ci, t] of vv.s) {
    console.log(`  ${vv.c}:${vv.v} word "${vv.words[wi]}" letter ${ci} (${vv.words[wi][ci]}) -> ${t === "r" ? "rabati" : "zeira"}`);
  }
}
