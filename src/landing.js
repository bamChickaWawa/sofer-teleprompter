import { MEGILLAH_FORMATS } from "./texts/loader.js";

// Landing page: the sofer picks what they're sitting down to write.
// view: "main" | "torah" | "torah:<sefer>" | "megillah"

function tile({ he, en, onClick, small = false }) {
  const btn = document.createElement("button");
  btn.className = small ? "landing-tile landing-tile-small" : "landing-tile";
  const heEl = document.createElement("span");
  heEl.className = "tile-he";
  heEl.textContent = he;
  btn.appendChild(heEl);
  if (en) {
    const enEl = document.createElement("span");
    enEl.className = "tile-en";
    enEl.textContent = en;
    btn.appendChild(enEl);
  }
  btn.addEventListener("click", onClick);
  return btn;
}

function backRow(label, onBack) {
  const row = document.createElement("button");
  row.className = "landing-back";
  row.textContent = `‹ ${label}`;
  row.addEventListener("click", onBack);
  return row;
}

export function renderLanding({ view, torahSection, continueInfo, onSetView, onSelectText }) {
  const wrap = document.createElement("div");
  wrap.className = "landing";

  const heading = document.createElement("div");
  heading.className = "landing-heading";
  const heTitle = document.createElement("div");
  heTitle.className = "landing-title";
  heTitle.textContent = "מה כותבים היום?";
  const enTitle = document.createElement("div");
  enTitle.className = "landing-sub";
  enTitle.textContent = "What are you writing today?";
  heading.appendChild(heTitle);
  heading.appendChild(enTitle);
  wrap.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "landing-grid";

  if (view === "main") {
    if (continueInfo) {
      const cont = tile({
        he: "המשך היכן שהפסקת",
        en: continueInfo.label,
        onClick: () => onSelectText(continueInfo.id),
      });
      cont.classList.add("landing-continue");
      grid.appendChild(cont);
    }
    grid.appendChild(tile({ he: "מזוזה", en: "Mezuzah · 22 lines", onClick: () => onSelectText("mezuzah") }));
    grid.appendChild(tile({ he: "תפילין", en: "Tefillin · 4 parshiyot", onClick: () => onSelectText("tefillin") }));
    grid.appendChild(tile({ he: "ספר תורה", en: "Torah · 54 parshiyot", onClick: () => onSetView("torah") }));
    grid.appendChild(tile({ he: "מגילת אסתר", en: "Megillah · 5 formats", onClick: () => onSetView("megillah") }));
  } else if (view === "megillah") {
    wrap.appendChild(backRow("Back", () => onSetView("main")));
    for (const [key, fmt] of Object.entries(MEGILLAH_FORMATS)) {
      grid.appendChild(tile({ he: fmt.heLabel, en: fmt.label, small: true, onClick: () => onSelectText(`megillah:${key}`) }));
    }
  } else if (view === "torah") {
    wrap.appendChild(backRow("Back", () => onSetView("main")));
    if (!torahSection) {
      const loading = document.createElement("div");
      loading.className = "landing-sub";
      loading.textContent = "Loading…";
      grid.appendChild(loading);
    } else {
      for (const book of torahSection) {
        grid.appendChild(
          tile({ he: `ספר ${book.seferHe}`, en: book.sefer, small: true, onClick: () => onSetView(`torah:${book.sefer}`) })
        );
      }
    }
  } else if (view.startsWith("torah:")) {
    const sefer = view.slice("torah:".length);
    wrap.appendChild(backRow("Back to sfarim", () => onSetView("torah")));
    const book = torahSection?.find((b) => b.sefer === sefer);
    if (book) {
      for (const p of book.parshiyot) {
        grid.appendChild(
          tile({ he: p.heTitle, en: `${p.title} · ${p.wordCount} words`, small: true, onClick: () => onSelectText(`torah:${p.slug}`) })
        );
      }
    }
  }

  wrap.appendChild(grid);
  return wrap;
}
