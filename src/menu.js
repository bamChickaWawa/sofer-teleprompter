const FONT_OPTIONS = [
  { id: "ashkenaz", label: "אשכנז" },
  { id: "sefarad", label: "ספרד" },
  { id: "fallback", label: "רגיל" },
];

const RT_OPTIONS = [
  { id: "rashi", label: "רש\"י" },
  { id: "rt", label: "ר\"ת" },
];

const SENSITIVITY_OPTIONS = [
  { id: "strict", label: "מדויק" },
  { id: "normal", label: "רגיל" },
  { id: "loose", label: "סלחני" },
];

export function renderDrawer({
  manifest,
  torahSection,
  expandedSefer,
  onToggleSefer,
  activeId,
  activeFont,
  rtOrder,
  voiceSensitivity,
  onSelectText,
  onSelectFont,
  onSelectRTOrder,
  onSelectVoiceSensitivity,
  onToggleReview,
  reviewActive,
  onToggleLayoutEditor,
  layoutEditorActive,
  onToggleLetterCounter,
  onClose,
}) {
  const overlay = document.createElement("div");
  overlay.className = "nav-overlay";
  overlay.addEventListener("click", (e) => {
    e.stopPropagation();
    onClose();
  });

  const drawer = document.createElement("div");
  drawer.className = "nav-drawer";
  drawer.addEventListener("click", (e) => e.stopPropagation());

  const reviewBtn = document.createElement("button");
  reviewBtn.className = `nav-item review-toggle${reviewActive ? " active" : ""}`;
  reviewBtn.textContent = reviewActive ? "◀ חזרה לכתיבה" : "👁 מצב עיון (לא לכתיבה)";
  reviewBtn.addEventListener("click", onToggleReview);
  drawer.appendChild(reviewBtn);

  const layoutBtn = document.createElement("button");
  layoutBtn.className = `nav-item${layoutEditorActive ? " active" : ""}`;
  layoutBtn.textContent = layoutEditorActive ? "◀ חזרה לכתיבה" : "✂ עורך פריסה (תיוג שורות)";
  layoutBtn.addEventListener("click", onToggleLayoutEditor);
  drawer.appendChild(layoutBtn);

  const counterBtn = document.createElement("button");
  counterBtn.className = "nav-item";
  counterBtn.textContent = "🔢 מונה אותיות";
  counterBtn.addEventListener("click", onToggleLetterCounter);
  drawer.appendChild(counterBtn);

  const fontHeading = document.createElement("h2");
  fontHeading.textContent = "גופן";
  drawer.appendChild(fontHeading);

  const fontRow = document.createElement("div");
  fontRow.className = "font-choice-row";
  for (const opt of FONT_OPTIONS) {
    const btn = document.createElement("button");
    btn.className = `font-choice${opt.id === activeFont ? " active" : ""}`;
    btn.textContent = opt.label;
    btn.addEventListener("click", () => onSelectFont(opt.id));
    fontRow.appendChild(btn);
  }
  drawer.appendChild(fontRow);

  const rtHeading = document.createElement("h2");
  rtHeading.textContent = "סדר פרשיות בתפילין";
  drawer.appendChild(rtHeading);

  const rtRow = document.createElement("div");
  rtRow.className = "font-choice-row";
  for (const opt of RT_OPTIONS) {
    const btn = document.createElement("button");
    btn.className = `font-choice${opt.id === rtOrder ? " active" : ""}`;
    btn.textContent = opt.label;
    btn.addEventListener("click", () => onSelectRTOrder(opt.id));
    rtRow.appendChild(btn);
  }
  drawer.appendChild(rtRow);

  const sensitivityHeading = document.createElement("h2");
  sensitivityHeading.textContent = "רגישות זיהוי קול";
  drawer.appendChild(sensitivityHeading);

  const sensitivityRow = document.createElement("div");
  sensitivityRow.className = "font-choice-row";
  for (const opt of SENSITIVITY_OPTIONS) {
    const btn = document.createElement("button");
    btn.className = `font-choice${opt.id === voiceSensitivity ? " active" : ""}`;
    btn.textContent = opt.label;
    btn.addEventListener("click", () => onSelectVoiceSensitivity(opt.id));
    sensitivityRow.appendChild(btn);
  }
  drawer.appendChild(sensitivityRow);

  for (const group of manifest) {
    const heading = document.createElement("h2");
    heading.textContent = group.category;
    drawer.appendChild(heading);

    for (const item of group.items) {
      const btn = document.createElement("button");
      btn.className = `nav-item${item.id === activeId ? " active" : ""}`;
      btn.textContent = item.title;
      btn.addEventListener("click", () => onSelectText(item.id));
      drawer.appendChild(btn);
    }
  }

  // Torah: sefer -> parsha, sofrus-style. Appears once the runtime manifest loads.
  const torahHeading = document.createElement("h2");
  torahHeading.textContent = "תיקון סופרים - תורה";
  drawer.appendChild(torahHeading);

  if (!torahSection) {
    const loading = document.createElement("div");
    loading.className = "nav-loading";
    loading.textContent = "טוען...";
    drawer.appendChild(loading);
  } else {
    for (const book of torahSection) {
      const seferBtn = document.createElement("button");
      const isOpen = expandedSefer === book.sefer;
      seferBtn.className = `nav-item sefer-toggle${isOpen ? " open" : ""}`;
      seferBtn.textContent = `${isOpen ? "▼" : "◀"} ספר ${book.seferHe}`;
      seferBtn.addEventListener("click", () => onToggleSefer(book.sefer));
      drawer.appendChild(seferBtn);

      if (isOpen) {
        for (const p of book.parshiyot) {
          const id = `torah:${p.slug}`;
          const btn = document.createElement("button");
          btn.className = `nav-item nav-subitem${id === activeId ? " active" : ""}`;
          btn.textContent = `${p.heTitle} (${p.wordCount})`;
          btn.addEventListener("click", () => onSelectText(id));
          drawer.appendChild(btn);
        }
      }
    }
  }

  const container = document.createElement("div");
  container.appendChild(overlay);
  container.appendChild(drawer);
  return container;
}
