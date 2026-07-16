const ICONS = {
  mic: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/></svg>',
  book: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>',
};

const VOICE_TITLES = {
  listening: "Voice: listening (tap to turn off)",
  denied: "Voice: microphone permission denied",
  error: "Voice: error",
  stopped: "Voice: off (tap to turn on)",
  unsupported: "Voice: not supported in this browser",
};

function iconButton({ icon, label, title, onClick, className = "" }) {
  const btn = document.createElement("button");
  btn.className = `icon-btn ${className}`;
  btn.innerHTML = ICONS[icon];
  if (label) {
    const text = document.createElement("span");
    text.className = "icon-btn-label";
    text.textContent = label;
    btn.appendChild(text);
  }
  btn.title = title ?? label ?? "";
  btn.setAttribute("aria-label", title ?? label ?? "");
  if (onClick) btn.addEventListener("click", onClick);
  return btn;
}

export function renderHeader({ heTitle, subtitle, onMenuToggle, voiceStatus, onToggleVoice, onToggleHalacha }) {
  const header = document.createElement("header");
  header.className = "app-header";

  const titleEl = document.createElement("div");
  titleEl.className = "title";
  const heEl = document.createElement("span");
  heEl.className = "title-he";
  heEl.textContent = heTitle;
  titleEl.appendChild(heEl);
  if (subtitle) {
    const subEl = document.createElement("span");
    subEl.className = "title-sub";
    subEl.textContent = subtitle;
    titleEl.appendChild(subEl);
  }

  const controls = document.createElement("div");
  controls.className = "header-controls";

  if (voiceStatus) {
    const voiceBtn = iconButton({
      icon: "mic",
      title: VOICE_TITLES[voiceStatus],
      onClick: onToggleVoice,
      className: `voice-status voice-status-${voiceStatus}`,
    });
    voiceBtn.disabled = voiceStatus === "unsupported";
    controls.appendChild(voiceBtn);
  }

  controls.appendChild(iconButton({ icon: "book", label: "הלכה", title: "Halacha sources", onClick: onToggleHalacha }));
  controls.appendChild(iconButton({ icon: "menu", label: "תפריט", title: "Menu", onClick: onMenuToggle }));

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
  const pasukPart = current?.perek ? ` | ${current.perek}:${current.pasuk}` : "";
  return `Word ${index + 1} of ${words.length}${pasukPart}`;
}

// Shem substitute glyphs (sofrus convention) - DISPLAY ONLY. The underlying
// word.text keeps the true letters for voice matching, letter counts, and
// verification; only what's painted on screen changes, so the actual Shem is
// never displayed. יהוה -> יﬣוה (first ה becomes U+FB23 wide-he, matching the
// sofrus rendering); אלהים-family -> ﭏ (U+FB4F alef-lamed ligature) for the
// leading אל.
const HE_SUBSTITUTE = "ﬣ";
const ALEF_LAMED = "ﭏ";

export function shemDisplayText(word, { substituteSafek = true } = {}) {
  if (word.isShem) return word.text.replace("ה", HE_SUBSTITUTE);
  if (word.isSafekShem && substituteSafek) return word.text.replace("אל", ALEF_LAMED);
  return word.text;
}

export function makeWordSpan(word, i, index, shemPending, opts = {}) {
  const span = document.createElement("span");
  span.className = wordClass(word, i, index, shemPending);

  const display = shemDisplayText(word, opts);
  if (word.specialLetters?.length && display === word.text) {
    // per-letter sizing for rabati/zeira; letter-spacing stays 0 so the
    // word still reads as one word. (Shem-substituted words never carry
    // specialLetters, so the index alignment is safe.)
    const specials = new Map(word.specialLetters.map((s) => [s.index, s.type]));
    [...display].forEach((ch, ci) => {
      const type = specials.get(ci);
      if (type) {
        const letterEl = document.createElement("span");
        letterEl.className = `letter-${type}`;
        letterEl.textContent = ch;
        span.appendChild(letterEl);
      } else {
        span.appendChild(document.createTextNode(ch));
      }
    });
  } else {
    span.textContent = display;
  }

  if (word.isSafekShem) span.title = "Possible Divine Name — check before writing (Keset HaSofer 10)";
  return span;
}

function splitIntoLines(words) {
  const lines = [];
  let start = 0;
  words.forEach((w, i) => {
    if (w.lineBreakAfter || i === words.length - 1) {
      lines.push({ start, end: i, endsParshia: w.parshiaBreak });
      start = i + 1;
    }
  });
  return lines;
}

export function renderTikkun({ words, index, verified, shemPending, hasLines, wordOpts = {} }) {
  const wrap = document.createElement("div");
  wrap.className = "tikkun-wrap with-bottom-bar";

  const column = document.createElement("div");
  column.className = shemPending ? "tikkun-column shem-active" : "tikkun-column";

  if (!verified) {
    const banner = document.createElement("div");
    banner.className = "unverified-banner";
    banner.textContent = "UNVERIFIED TEXT — check against a printed tikkun before writing";
    column.appendChild(banner);
  }

  if (hasLines) {
    // Fixed-line klaf mode: one justified block per line, edge to edge like a
    // written mezuzah. The setumah gap renders as an explicit blank at the
    // start of the line after a parshia break. Only the very last line is
    // left unjustified.
    const linesEl = document.createElement("div");
    linesEl.className = "klaf-lines";
    const lines = splitIntoLines(words);

    lines.forEach((line, li) => {
      const lineEl = document.createElement("div");
      const isLast = li === lines.length - 1;
      const afterParshia = li > 0 && lines[li - 1].endsParshia;
      lineEl.className = `klaf-line${isLast ? " line-unjustified" : ""}${
        index >= line.start && index <= line.end ? " current-line" : ""
      }`;

      if (afterParshia) {
        const gap = document.createElement("span");
        gap.className = "setumah-gap";
        gap.setAttribute("aria-label", "setumah");
        lineEl.appendChild(gap);
      }

      for (let i = line.start; i <= line.end; i++) {
        lineEl.appendChild(makeWordSpan(words[i], i, index, shemPending, wordOpts));
        if (i < line.end) lineEl.appendChild(document.createTextNode(" "));
      }
      linesEl.appendChild(lineEl);
    });

    column.appendChild(linesEl);
  } else {
    const text = document.createElement("div");
    text.className = "tikkun-text";
    words.forEach((word, i) => {
      text.appendChild(makeWordSpan(word, i, index, shemPending, wordOpts));
      if (i < words.length - 1) text.appendChild(document.createTextNode(" "));
    });
    column.appendChild(text);
  }

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
  backBtn.textContent = "הקודם";
  backBtn.disabled = index === 0;
  backBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onBack();
  });

  const position = document.createElement("div");
  position.className = "ctrl-position tikkun-footer";
  position.textContent = positionLabel(words, index);

  const nextBtn = document.createElement("button");
  nextBtn.className = locked ? "ctrl-next ctrl-locked" : "ctrl-next";
  nextBtn.textContent = locked ? "נעול" : "הבא";
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

export function renderReview({ words, index, onExit, wordOpts = {} }) {
  const wrap = document.createElement("div");
  wrap.className = "review-mode";

  const banner = document.createElement("div");
  banner.className = "review-banner";
  const bannerText = document.createElement("span");
  bannerText.textContent = "REVIEW MODE — NOT FOR WRITING!";
  const exitBtn = document.createElement("button");
  exitBtn.textContent = "Back to writing";
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
    span.textContent = shemDisplayText(word, wordOpts);
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
  msg.textContent = "Loading…";
  stage.appendChild(msg);
  return stage;
}

export function renderDone({ wordCount, onBack }) {
  const stage = document.createElement("div");
  stage.className = "stage-done";
  const panel = document.createElement("div");
  panel.className = "tikkun-column done-panel";
  const msg = document.createElement("div");
  msg.className = "done-message";
  msg.textContent = "הפרשה הושלמה";
  const sub = document.createElement("div");
  sub.className = "done-count";
  sub.textContent = `${wordCount} words`;
  panel.appendChild(msg);
  panel.appendChild(sub);
  stage.appendChild(panel);
  if (onBack) {
    const backBtn = document.createElement("button");
    backBtn.className = "done-back";
    backBtn.textContent = "חזרה לטקסט";
    backBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onBack();
    });
    stage.appendChild(backBtn);
  }
  return stage;
}
