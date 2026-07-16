const FONT_OPTIONS = [
  { id: "ashkenaz", label: "Ashkenaz" },
  { id: "sefarad", label: "Sefarad" },
  { id: "fallback", label: "Plain" },
];

const RT_OPTIONS = [
  { id: "rashi", label: "Rashi" },
  { id: "rt", label: "Rabbeinu Tam" },
];

const SENSITIVITY_OPTIONS = [
  { id: "strict", label: "Strict" },
  { id: "normal", label: "Normal" },
  { id: "loose", label: "Loose" },
];

const FONT_SCALE_OPTIONS = [
  { id: 0.8, label: "א" },
  { id: 1, label: "א+" },
  { id: 1.3, label: "א++" },
  { id: 1.6, label: "א+++" },
];

export function renderDrawer({
  manifest,
  torahSection,
  expandedSefer,
  onToggleSefer,
  activeId,
  activeFont,
  fontScale,
  rtOrder,
  voiceSensitivity,
  substituteSafek,
  onToggleSubstituteSafek,
  onSelectText,
  onSelectFont,
  onSelectFontScale,
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
  reviewBtn.textContent = reviewActive ? "‹ Back to writing" : "👁 Review mode (not for writing)";
  reviewBtn.addEventListener("click", onToggleReview);
  drawer.appendChild(reviewBtn);

  const layoutBtn = document.createElement("button");
  layoutBtn.className = `nav-item${layoutEditorActive ? " active" : ""}`;
  layoutBtn.textContent = layoutEditorActive ? "‹ Back to writing" : "✂ Layout editor (mark lines)";
  layoutBtn.addEventListener("click", onToggleLayoutEditor);
  drawer.appendChild(layoutBtn);

  const counterBtn = document.createElement("button");
  counterBtn.className = "nav-item";
  counterBtn.textContent = "🔢 Letter counter";
  counterBtn.addEventListener("click", onToggleLetterCounter);
  drawer.appendChild(counterBtn);

  const fontHeading = document.createElement("h2");
  fontHeading.textContent = "Font";
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

  const scaleHeading = document.createElement("h2");
  scaleHeading.textContent = "Ktav size";
  drawer.appendChild(scaleHeading);

  const scaleRow = document.createElement("div");
  scaleRow.className = "font-choice-row";
  for (const opt of FONT_SCALE_OPTIONS) {
    const btn = document.createElement("button");
    btn.className = `font-choice${opt.id === fontScale ? " active" : ""}`;
    btn.textContent = opt.label;
    btn.addEventListener("click", () => onSelectFontScale(opt.id));
    scaleRow.appendChild(btn);
  }
  drawer.appendChild(scaleRow);

  const rtHeading = document.createElement("h2");
  rtHeading.textContent = "Tefillin parsha order";
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

  const displayHeading = document.createElement("h2");
  displayHeading.textContent = "Shem display";
  drawer.appendChild(displayHeading);

  const safekRow = document.createElement("div");
  safekRow.className = "font-choice-row";
  const safekBtn = document.createElement("button");
  safekBtn.className = `font-choice${substituteSafek ? " active" : ""}`;
  safekBtn.textContent = substituteSafek ? "Safek-Shem glyphs: on" : "Safek-Shem glyphs: off";
  safekBtn.addEventListener("click", onToggleSubstituteSafek);
  safekRow.appendChild(safekBtn);
  drawer.appendChild(safekRow);

  const sensitivityHeading = document.createElement("h2");
  sensitivityHeading.textContent = "Voice match sensitivity";
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
  torahHeading.textContent = "Tikkun Soferim — Torah";
  drawer.appendChild(torahHeading);

  if (!torahSection) {
    const loading = document.createElement("div");
    loading.className = "nav-loading";
    loading.textContent = "Loading…";
    drawer.appendChild(loading);
  } else {
    for (const book of torahSection) {
      const seferBtn = document.createElement("button");
      const isOpen = expandedSefer === book.sefer;
      seferBtn.className = `nav-item sefer-toggle${isOpen ? " open" : ""}`;
      seferBtn.textContent = `${isOpen ? "▼" : "›"} ${book.sefer} (${book.seferHe})`;
      seferBtn.addEventListener("click", () => onToggleSefer(book.sefer));
      drawer.appendChild(seferBtn);

      if (isOpen) {
        for (const p of book.parshiyot) {
          const id = `torah:${p.slug}`;
          const btn = document.createElement("button");
          btn.className = `nav-item nav-subitem${id === activeId ? " active" : ""}`;
          btn.textContent = `${p.title} — ${p.heTitle}`;
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
