const VOICE_LABELS = {
  listening: "🎤 מאזין",
  denied: "🎤 נדחתה הרשאה",
  error: "🎤 שגיאה",
  stopped: "🎤 כבוי",
  unsupported: "🎤 לא נתמך",
};

export function renderHeader({ title, onMenuToggle, voiceStatus, onToggleVoice, onToggleHalacha }) {
  const header = document.createElement("header");
  header.className = "app-header";

  const titleEl = document.createElement("div");
  titleEl.className = "title";
  titleEl.textContent = title;

  const controls = document.createElement("div");
  controls.className = "header-controls";

  if (voiceStatus) {
    const voiceBtn = document.createElement("button");
    voiceBtn.className = `voice-status voice-status-${voiceStatus}`;
    voiceBtn.textContent = VOICE_LABELS[voiceStatus] ?? "🎤";
    voiceBtn.disabled = voiceStatus === "unsupported";
    if (onToggleVoice) voiceBtn.addEventListener("click", onToggleVoice);
    controls.appendChild(voiceBtn);
  }

  const halachaBtn = document.createElement("button");
  halachaBtn.textContent = "📖 הלכה";
  halachaBtn.addEventListener("click", onToggleHalacha);
  controls.appendChild(halachaBtn);

  const menuBtn = document.createElement("button");
  menuBtn.textContent = "☰ תפריט";
  menuBtn.addEventListener("click", onMenuToggle);
  controls.appendChild(menuBtn);

  header.appendChild(titleEl);
  header.appendChild(controls);
  return header;
}

export function wordClass(word, i, index, shemPending) {
  const isCurrent = i === index;
  return `word ${i < index ? "written" : isCurrent ? "current" : "upcoming"}${
    isCurrent && shemPending ? " shem-pending" : ""
  }${word.isSafekShem ? " safek-shem" : ""}`;
}

export function positionLabel(words, index) {
  const current = words[index];
  const pasukPart = current?.perek ? ` | פרק ${current.perek} פסוק ${current.pasuk}` : "";
  return `מילה ${index + 1} מתוך ${words.length}${pasukPart}`;
}

export function renderTikkun({ words, index, verified, shemPending }) {
  const wrap = document.createElement("div");
  wrap.className = "tikkun-wrap with-bottom-bar";

  const column = document.createElement("div");
  column.className = shemPending ? "tikkun-column shem-active" : "tikkun-column";

  if (!verified) {
    const banner = document.createElement("div");
    banner.className = "unverified-banner";
    banner.textContent = "טקסט לא מאומת - יש לבדוק מול תיקון מודפס";
    column.appendChild(banner);
  }

  const text = document.createElement("div");
  text.className = "tikkun-text";

  words.forEach((word, i) => {
    const span = document.createElement("span");
    span.className = wordClass(word, i, index, shemPending);
    span.textContent = word.text;
    if (word.isSafekShem) span.title = "שם מסופק - בדוק לפני כתיבה (כתב הסופר י')";
    text.appendChild(span);
    if (i < words.length - 1) text.appendChild(document.createTextNode(" "));
  });

  column.appendChild(text);
  wrap.appendChild(column);
  return wrap;
}

// Fixed bottom bar in writing mode: explicit back/advance controls instead
// of tap-anywhere (stray taps were silently advancing the text), plus the
// live position readout.
export function renderControlBar({ words, index, locked, onBack, onAdvance }) {
  const bar = document.createElement("div");
  bar.className = "control-bar";

  const backBtn = document.createElement("button");
  backBtn.className = "ctrl-back";
  backBtn.textContent = "→ אחורה";
  backBtn.disabled = index === 0;
  backBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onBack();
  });

  const position = document.createElement("div");
  position.className = "ctrl-position tikkun-footer";
  position.textContent = positionLabel(words, index);

  const nextBtn = document.createElement("button");
  nextBtn.className = "ctrl-next";
  nextBtn.textContent = locked ? "🔒" : "הבא ←";
  nextBtn.disabled = locked;
  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onAdvance();
  });

  bar.appendChild(backBtn);
  bar.appendChild(position);
  bar.appendChild(nextBtn);
  return bar;
}

export function renderReview({ words, index, onExit }) {
  const wrap = document.createElement("div");
  wrap.className = "review-mode";

  const banner = document.createElement("div");
  banner.className = "review-banner";
  const bannerText = document.createElement("span");
  bannerText.textContent = "מצב עיון - לא לכתיבה!";
  const exitBtn = document.createElement("button");
  exitBtn.textContent = "חזרה לכתיבה";
  exitBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onExit();
  });
  banner.appendChild(bannerText);
  banner.appendChild(exitBtn);
  wrap.appendChild(banner);

  const scroll = document.createElement("div");
  scroll.className = "tikkun-wrap review-tikkun-wrap";

  const column = document.createElement("div");
  column.className = "tikkun-column review-column";

  const text = document.createElement("div");
  text.className = "tikkun-text";
  words.forEach((word, i) => {
    const span = document.createElement("span");
    span.className = `word ${i === index ? "review-position" : i < index ? "written" : "upcoming"}`;
    span.textContent = word.text;
    text.appendChild(span);
    if (i < words.length - 1) text.appendChild(document.createTextNode(" "));
  });
  column.appendChild(text);
  scroll.appendChild(column);
  wrap.appendChild(scroll);

  return wrap;
}

export function renderLoading() {
  const stage = document.createElement("div");
  stage.className = "stage-done";
  const msg = document.createElement("div");
  msg.className = "counter";
  msg.textContent = "טוען...";
  stage.appendChild(msg);
  return stage;
}

export function renderDone({ wordCount, onBack }) {
  const stage = document.createElement("div");
  stage.className = "stage-done";
  const msg = document.createElement("div");
  msg.className = "done-message";
  msg.textContent = "הפרשה הושלמה";
  const sub = document.createElement("div");
  sub.className = "counter";
  sub.textContent = `${wordCount} מילים`;
  stage.appendChild(msg);
  stage.appendChild(sub);
  if (onBack) {
    const backBtn = document.createElement("button");
    backBtn.className = "done-back";
    backBtn.textContent = "→ חזרה לטקסט";
    backBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onBack();
    });
    stage.appendChild(backBtn);
  }
  return stage;
}
