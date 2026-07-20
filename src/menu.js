import { MEGILLAH_FORMATS } from "./texts/loader.js";
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
  voiceSupported,
  substituteSafek,
  onToggleSubstituteSafek,
  justifyMode,
  onSelectJustifyMode,
  lineHeight,
  onSelectLineHeight,
  wordGap,
  onSelectWordGap,
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
  onGoHome,
  bookmarks = [],
  canBookmark = false,
  onSaveBookmark,
  onJumpBookmark,
  onDeleteBookmark,
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

  const homeBtn = document.createElement("button");
  homeBtn.className = "nav-item";
  homeBtn.textContent = "Home — בחירת כתיבה";
  homeBtn.addEventListener("click", onGoHome);
  drawer.appendChild(homeBtn);

  const reviewBtn = document.createElement("button");
  reviewBtn.className = `nav-item review-toggle${reviewActive ? " active" : ""}`;
  reviewBtn.textContent = reviewActive ? "‹ Back to writing" : "Review mode (not for writing)";
  reviewBtn.addEventListener("click", onToggleReview);
  drawer.appendChild(reviewBtn);

  const layoutBtn = document.createElement("button");
  layoutBtn.className = `nav-item${layoutEditorActive ? " active" : ""}`;
  layoutBtn.textContent = layoutEditorActive ? "‹ Back to writing" : "Layout editor (mark lines)";
  layoutBtn.addEventListener("click", onToggleLayoutEditor);
  drawer.appendChild(layoutBtn);

  const counterBtn = document.createElement("button");
  counterBtn.className = "nav-item";
  counterBtn.textContent = "Letter counter";
  counterBtn.addEventListener("click", onToggleLetterCounter);
  drawer.appendChild(counterBtn);

  const bmHeading = document.createElement("h2");
  bmHeading.textContent = "Bookmarks — סימניות";
  drawer.appendChild(bmHeading);

  const bmNote = document.createElement("div");
  bmNote.className = "nav-loading";
  bmNote.textContent = "Position is saved automatically per text. Bookmarks are named save points for tracking several works.";
  drawer.appendChild(bmNote);

  if (canBookmark) {
    const saveBtn = document.createElement("button");
    saveBtn.className = "nav-item bookmark-save";
    saveBtn.textContent = "+ Save current position";
    saveBtn.addEventListener("click", onSaveBookmark);
    drawer.appendChild(saveBtn);
  }

  for (const bm of bookmarks) {
    const row = document.createElement("div");
    row.className = "bookmark-row";
    const jump = document.createElement("button");
    jump.className = "nav-item bookmark-jump";
    const when = new Date(bm.savedAt);
    jump.textContent = `${bm.label} · ${when.toLocaleDateString()}`;
    jump.addEventListener("click", () => onJumpBookmark(bm));
    const del = document.createElement("button");
    del.className = "bookmark-del";
    del.textContent = "✕";
    del.title = "Delete bookmark";
    del.setAttribute("aria-label", "Delete bookmark");
    del.addEventListener("click", () => onDeleteBookmark(bm.id));
    row.appendChild(jump);
    row.appendChild(del);
    drawer.appendChild(row);
  }

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

  const lhHeading = document.createElement("h2");
  lhHeading.textContent = "Line spacing";
  drawer.appendChild(lhHeading);
  const lhRow = document.createElement("div");
  lhRow.className = "font-choice-row";
  for (const opt of [
    { id: 1.7, label: "Tight" },
    { id: 1.9, label: "Normal" },
    { id: 2.2, label: "Loose" },
    { id: 2.6, label: "Wide" },
  ]) {
    const btn = document.createElement("button");
    btn.className = `font-choice${opt.id === lineHeight ? " active" : ""}`;
    btn.textContent = opt.label;
    btn.addEventListener("click", () => onSelectLineHeight(opt.id));
    lhRow.appendChild(btn);
  }
  drawer.appendChild(lhRow);

  const wgHeading = document.createElement("h2");
  wgHeading.textContent = "Word spacing";
  drawer.appendChild(wgHeading);
  const wgRow = document.createElement("div");
  wgRow.className = "font-choice-row";
  for (const opt of [
    { id: 0.05, label: "Tight" },
    { id: 0.15, label: "Normal" },
    { id: 0.35, label: "Wide" },
  ]) {
    const btn = document.createElement("button");
    btn.className = `font-choice${opt.id === wordGap ? " active" : ""}`;
    btn.textContent = opt.label;
    btn.addEventListener("click", () => onSelectWordGap(opt.id));
    wgRow.appendChild(btn);
  }
  drawer.appendChild(wgRow);

  const justifyHeading = document.createElement("h2");
  justifyHeading.textContent = "Line justification";
  drawer.appendChild(justifyHeading);

  const justifyRow = document.createElement("div");
  justifyRow.className = "font-choice-row";
  for (const opt of [
    { id: "word", label: "Word spacing" },
    { id: "letter", label: "Letter spacing" },
  ]) {
    const btn = document.createElement("button");
    btn.className = `font-choice${opt.id === justifyMode ? " active" : ""}`;
    btn.textContent = opt.label;
    btn.addEventListener("click", () => onSelectJustifyMode(opt.id));
    justifyRow.appendChild(btn);
  }
  drawer.appendChild(justifyRow);

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

  if (!voiceSupported) {
    const note = document.createElement("div");
    note.className = "nav-loading voice-unsupported-note";
    note.textContent =
      "Voice advance isn't available in this browser (no speech recognition API - notably Firefox, and iOS Safari). Tap, the Next button, or spacebar always work as the halachically-fine fallback.";
    drawer.appendChild(note);
  } else {
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
  }

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

  const megillahHeading = document.createElement("h2");
  megillahHeading.textContent = "Megillat Esther";
  drawer.appendChild(megillahHeading);
  for (const [key, fmt] of Object.entries(MEGILLAH_FORMATS)) {
    const id = `megillah:${key}`;
    const btn = document.createElement("button");
    btn.className = `nav-item nav-subitem${id === activeId ? " active" : ""}`;
    btn.textContent = `${fmt.heLabel} — ${fmt.label}`;
    btn.addEventListener("click", () => onSelectText(id));
    drawer.appendChild(btn);
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
