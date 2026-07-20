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

  // Live proof-of-listening: shows the raw (interim or final) transcript
  // Chrome is actually hearing, so "is voice even working?" has a visible
  // answer instead of being a black box. Updated directly by main.js
  // without a full re-render on every partial speech result.
  if (voiceStatus === "listening") {
    const heard = document.createElement("div");
    heard.className = "voice-heard";
    header.appendChild(heard);
  }

  return header;
}

export function wordClass(word, i, index, shemPending) {
  const isCurrent = i === index;
  return `word ${i < index ? "written" : isCurrent ? "current" : "upcoming"}${
    isCurrent && shemPending ? " shem-pending" : ""
  }${word.isSafekShem ? " safek-shem" : ""}`;
}

// Hebrew numerals for amud headers (א, ב ... יא, יב ... כח), the way a
// sofer counts columns.
export function hebrewNumeral(n) {
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  if (n === 15) return "טו";
  if (n === 16) return "טז";
  const t = Math.floor(n / 10) % 10;
  const o = n % 10;
  const h = Math.floor(n / 100);
  return "ק".repeat(h) + tens[t] + ones[o];
}

export function positionLabel(words, index) {
  const current = words[index];
  const amudPart = current?.amud ? `עמוד ${hebrewNumeral(current.amud)} · שורה ${current.line} · ` : "";
  const pasukPart = current?.perek ? ` | ${current.perek}:${current.pasuk}` : "";
  return `${amudPart}Word ${index + 1} of ${words.length}${pasukPart}`;
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

// Letter-spacing justification (sofrus's second justify mode): instead of
// stretching the gaps between words, stretch the spacing between letters -
// closer to how a sofer actually fills a line. Measured from the real DOM
// (Range width) so rabati letters and the setumah gap are accounted for.
// Runs after render; the CSS class justify-letter disables the browser's
// word-gap justification so the two modes never stack.
export function applyLetterJustify(root = document) {
  const lines = root.querySelectorAll(".klaf-lines.justify-letter .klaf-line");
  const range = document.createRange();
  lines.forEach((el) => {
    el.style.letterSpacing = "0px";
    if (el.classList.contains("line-unjustified") || el.classList.contains("line-open")) return;
    range.selectNodeContents(el);
    const natural = range.getBoundingClientRect().width;
    const cs = getComputedStyle(el);
    const target = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    // letter-spacing is added after EVERY char including the last, and it
    // also wraps atomic inlines like the setumah gap span - a safety margin
    // keeps a line from ever wrapping (falling a hair short beats breaking
    // the line). The gap line needs extra headroom for the spacing added
    // around the inline-block itself.
    const chars = el.textContent.length;
    const hasGap = Boolean(el.querySelector(".setumah-gap"));
    const deficit = target - natural - (hasGap ? 6 : 3);
    if (chars > 1 && deficit > 0) {
      el.style.letterSpacing = `${(Math.floor((deficit / chars) * 100) / 100).toFixed(2)}px`;
    }
  });
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

export function renderTikkun({ words, index, verified, shemPending, hasLines, layoutNote, wordOpts = {} }) {
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

  if (layoutNote) {
    const noteEl = document.createElement("div");
    noteEl.className = "layout-note";
    noteEl.textContent = layoutNote;
    column.appendChild(noteEl);
  }

  if (hasLines) {
    // Fixed-line klaf mode, sofrus-tikkun style: each line is a row with a
    // letter-count badge at the line start (right, RTL), the justified text,
    // and a line-number badge at the line end. The setumah gap renders as an
    // explicit blank at the start of the line after a parshia break. Only the
    // very last line is left unjustified.
    const linesEl = document.createElement("div");
    linesEl.className = `klaf-lines${wordOpts.justifyMode === "letter" ? " justify-letter" : ""}`;
    const lines = splitIntoLines(words);

    let amud = 1;
    let lineInAmud = 0;
    if (words.some((w) => w.columnBreakAfter)) {
      const first = document.createElement("div");
      first.className = "amud-divider";
      first.textContent = "עמוד א";
      linesEl.appendChild(first);
    }
    lines.forEach((line, li) => {
      // amud divider: the previous line ended a column
      if (li > 0 && words[lines[li - 1].end].columnBreakAfter) {
        amud++;
        lineInAmud = 0;
        const divider = document.createElement("div");
        divider.className = "amud-divider";
        divider.textContent = `עמוד ${hebrewNumeral(amud)}`;
        linesEl.appendChild(divider);
      }
      lineInAmud++;
      const rowEl = document.createElement("div");
      const isLast = li === lines.length - 1;
      const prevLastWord = li > 0 ? words[lines[li - 1].end] : null;
      const afterParshia = Boolean(prevLastWord && (prevLastWord.parshiaBreak || prevLastWord.leadGapNext));
      rowEl.className = `klaf-row${index >= line.start && index <= line.end ? " current-line" : ""}`;

      // letter count from the TRUE text (word.text), never the display
      // substitutes - this is the checking aid, it must match the klaf.
      let letterCount = 0;
      for (let i = line.start; i <= line.end; i++) {
        letterCount += words[i].text.length;
      }
      const countBadge = document.createElement("span");
      countBadge.className = "line-count";
      countBadge.textContent = letterCount;
      countBadge.title = `${letterCount} letters`;
      rowEl.appendChild(countBadge);

      const endsOpen = Boolean(words[line.end].openLineEnd);
      const lineEl = document.createElement("div");
      lineEl.className = `klaf-line${isLast ? " line-unjustified" : ""}${endsOpen ? " line-open" : ""}`;

      if (afterParshia) {
        const gap = document.createElement("span");
        gap.className = "setumah-gap";
        gap.setAttribute("aria-label", "setumah");
        if (prevLastWord?.leadGapNext) gap.textContent = "ס";
        lineEl.appendChild(gap);
      }

      for (let i = line.start; i <= line.end; i++) {
        lineEl.appendChild(makeWordSpan(words[i], i, index, shemPending, wordOpts));
        if (words[i].inlineGapAfter && i < line.end) {
          // setuma: closed-parsha gap inside the line
          const gap = document.createElement("span");
          gap.className = "setumah-gap setumah-inline";
          gap.setAttribute("aria-label", "setumah");
          gap.textContent = "ס";
          lineEl.appendChild(gap);
        }
        if (i < line.end) lineEl.appendChild(document.createTextNode(" "));
      }
      if (endsOpen) {
        // petucha: the rest of the line stays open; faint marker for the sofer
        const pe = document.createElement("span");
        pe.className = "petucha-marker";
        pe.setAttribute("aria-label", "petucha");
        pe.textContent = "פ";
        lineEl.appendChild(pe);
      }
      rowEl.appendChild(lineEl);

      const numBadge = document.createElement("span");
      numBadge.className = "line-num";
      numBadge.textContent = lineInAmud;
      rowEl.appendChild(numBadge);

      linesEl.appendChild(rowEl);
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

export function renderReview({ words, index, selectedIndex, onSelectWord, onConfirmPosition, onExit, wordOpts = {} }) {
  const wrap = document.createElement("div");
  wrap.className = "review-mode";

  const banner = document.createElement("div");
  banner.className = "review-banner";
  const bannerText = document.createElement("span");
  bannerText.textContent = "REVIEW — tap a word to set the writing position";
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
  if (selectedIndex != null) scroll.classList.add("with-shem-panel");

  const column = document.createElement("div");
  column.className = "tikkun-column review-column";

  const text = document.createElement("div");
  text.className = "tikkun-text";
  words.forEach((word, i) => {
    const span = document.createElement("span");
    span.className = `word ${i === index ? "review-position" : i < index ? "written" : "upcoming"}${
      i === selectedIndex ? " review-selected" : ""
    }`;
    span.textContent = shemDisplayText(word, wordOpts);
    span.addEventListener("click", (e) => {
      e.stopPropagation();
      onSelectWord(i);
    });
    text.appendChild(span);
    if (i < words.length - 1) text.appendChild(document.createTextNode(" "));
  });
  column.appendChild(text);

  // selection confirm panel: setting a position is deliberate - tap, read
  // the exact location back, then confirm
  if (selectedIndex != null) {
    const panel = document.createElement("div");
    panel.className = "shem-panel jump-panel";

    const label = document.createElement("div");
    label.className = "gate-label";
    label.textContent = "Set writing position here?";
    panel.appendChild(label);

    const detail = document.createElement("div");
    detail.className = "jump-detail";
    detail.textContent = `"${shemDisplayText(words[selectedIndex], wordOpts)}" — ${positionLabel(words, selectedIndex)}`;
    panel.appendChild(detail);

    const row = document.createElement("div");
    row.className = "jump-actions";
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "jump-confirm";
    confirmBtn.textContent = "Start here";
    confirmBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onConfirmPosition(selectedIndex);
    });
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "jump-cancel";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onSelectWord(null);
    });
    row.appendChild(confirmBtn);
    row.appendChild(cancelBtn);
    panel.appendChild(row);
    wrap.appendChild(panel);
  }
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
