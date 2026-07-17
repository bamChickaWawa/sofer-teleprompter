// Auto-generated DRAFT layouts. A real tikkun's line breaks are the tikkun
// author's craft; these are mechanical approximations so the sofer gets the
// tikkun presentation (numbered ruled lines, letter counts, amud structure)
// for texts we have no verified line data for. Always labeled as a draft -
// the mezuzah's curated traditional 22 lines are NOT generated here.
//
// Returns { lineEnds: Set<wordIdx>, colEnds: Set<wordIdx>, note }.

// letters + inter-word spaces, the same metric the line badges show
function lineWidthOf(words, start, end) {
  let letters = 0;
  for (let i = start; i <= end; i++) letters += words[i].text.length;
  return letters + (end - start);
}

const SETUMA_GAP = 10; // ~9 letter-widths, the closed-parsha gap

// Packs words into lines, structuring parsha breaks per YD 275 (simplified,
// Rambam-style): petucha = line ends, remainder left open, next parsha
// starts a fresh line; setuma = 9-letter gap inside the line when it fits,
// otherwise the gap carries to the start of the next line.
function packLines(words, start, end, targetWidth, forcedEnds, marks) {
  const lineEnds = [];
  let lineStart = start;
  let width = 0;
  const endLine = (i) => {
    lineEnds.push(i);
    lineStart = i + 1;
    width = 0;
  };
  for (let i = start; i <= end; i++) {
    const w = words[i].text.length + (i > lineStart ? 1 : 0);
    if (width + w > targetWidth && i > lineStart) {
      lineEnds.push(i - 1);
      lineStart = i;
      width = words[i].text.length;
    } else {
      width += w;
    }
    const brk = words[i].parshaBreakAfter;
    if (brk === "petucha" && i < end) {
      marks?.openEnds.add(i);
      endLine(i);
    } else if (brk === "setuma" && i < end) {
      const nextW = words[i + 1] ? words[i + 1].text.length + 1 : 0;
      if (width + SETUMA_GAP + nextW <= targetWidth) {
        marks?.inlineGaps.add(i);
        width += SETUMA_GAP;
      } else {
        marks?.leadGaps.add(i);
        endLine(i);
      }
    } else if (forcedEnds?.has(i)) {
      endLine(i);
    }
  }
  if (lineStart <= end) lineEnds.push(end);
  return lineEnds;
}

// The Aseret Bnei Haman block (Esther 9:7-9): each "ואת <name>" pair gets
// its own line; two-word justified lines produce the traditional two-column
// list (names under names, ואת under ואת) automatically.
const BNEI_HAMAN = ["פרשנדתא", "דלפון", "אספתא", "פורתא", "אדליא", "ארידתא", "פרמשתא", "אריסי", "ארדי", "ארידי", "ויזתא"];

function bneiHamanForcedEnds(words) {
  const forced = new Set();
  for (let i = 1; i < words.length; i++) {
    if (BNEI_HAMAN.includes(words[i].text) && words[i - 1].text === "ואת") {
      forced.add(i); // line ends after the name
      forced.add(i - 2 >= 0 ? i - 2 : 0); // and the previous line ends before ואת
    }
  }
  return forced;
}

export function generateLayout(words, { linesPerColumn = null, charsPerLine = 44, columnStartWord = null, note }) {
  const forced = bneiHamanForcedEnds(words);
  const lineEnds = new Set();
  const colEnds = new Set();
  const marks = { openEnds: new Set(), inlineGaps: new Set(), leadGaps: new Set() };

  if (!columnStartWord) {
    const ends = packLines(words, 0, words.length - 1, charsPerLine, forced, marks);
    ends.forEach((e) => lineEnds.add(e));
    if (linesPerColumn) {
      let count = 0;
      for (const e of ends) {
        count++;
        if (count === linesPerColumn && e !== words.length - 1) {
          colEnds.add(e);
          count = 0;
        }
      }
    }
    return { lineEnds, colEnds, marks, note };
  }

  // HaMelech constraint: every column after the first opens with המלך.
  // Pick the המלך occurrence nearest each ideal column boundary, then pack
  // each column's lines independently.
  const totalWidth = lineWidthOf(words, 0, words.length - 1);
  const colWidth = linesPerColumn * charsPerLine;
  const nCols = Math.max(2, Math.round(totalWidth / colWidth));

  const hamelechIdx = [];
  words.forEach((w, i) => {
    if (w.text === columnStartWord) hamelechIdx.push(i);
  });

  const starts = [0];
  let cum = 0;
  const cumWidths = words.map((w, i) => (cum += w.text.length + 1));
  for (let k = 1; k < nCols; k++) {
    const ideal = (k * totalWidth) / nCols;
    let best = null;
    let bestDist = Infinity;
    for (const hi of hamelechIdx) {
      const d = Math.abs(cumWidths[hi] - ideal);
      if (d < bestDist && hi > starts[starts.length - 1] + linesPerColumn) {
        bestDist = d;
        best = hi;
      }
    }
    if (best !== null && best > starts[starts.length - 1]) starts.push(best);
  }

  for (let k = 0; k < starts.length; k++) {
    const colStart = starts[k];
    const colEnd = (k + 1 < starts.length ? starts[k + 1] : words.length) - 1;
    const colTarget = Math.max(20, Math.ceil(lineWidthOf(words, colStart, colEnd) / linesPerColumn));
    const ends = packLines(words, colStart, colEnd, colTarget, forced, marks);
    ends.forEach((e) => lineEnds.add(e));
    if (colEnd !== words.length - 1) colEnds.add(colEnd);
  }

  return { lineEnds, colEnds, marks, note };
}

export const MEGILLAH_FORMATS = {
  flow: { label: "Flow (no layout)", heLabel: "רציף" },
  gra11: { label: "11 lines (Gra)", heLabel: "י״א שורות", linesPerColumn: 11, charsPerLine: 44 },
  hamelech21: { label: "21 lines — HaMelech", heLabel: "כ״א שורות המלך", linesPerColumn: 21, charsPerLine: 46, columnStartWord: "המלך" },
  hamelech28: { label: "28 lines — HaMelech", heLabel: "כ״ח שורות המלך", linesPerColumn: 28, charsPerLine: 60, columnStartWord: "המלך" },
  lines42: { label: "42 lines", heLabel: "מ״ב שורות", linesPerColumn: 42, charsPerLine: 44 },
};
