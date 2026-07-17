import { textManifest } from "./texts/manifest.js";
import { loadText, loadTorahManifest } from "./texts/loader.js";
import {
  renderHeader,
  renderTikkun,
  renderControlBar,
  renderDone,
  renderReview,
  renderLoading,
  wordClass,
  positionLabel,
  applyLetterJustify,
} from "./display.js";
import { renderDrawer } from "./menu.js";
import { renderLayoutEditor } from "./layout-editor.js";
import { renderLishmahPanel, renderShemGate } from "./shem.js";
import { isShemWord } from "./declarations.js";
import { createVoiceController, isSpeechRecognitionSupported } from "./voice.js";
import { fetchHalachaText, renderHalachaPanel } from "./halacha.js";
import { renderLetterCounter } from "./letter-counter.js";
import { renderLanding } from "./landing.js";
import {
  loadPosition,
  savePosition,
  loadLastTextId,
  loadSettings,
  saveSettings,
  loadBookmarks,
  addBookmark,
  removeBookmark,
} from "./store.js";

const State = Object.freeze({
  LANDING: "LANDING",
  LOADING: "LOADING",
  READY: "READY",
  DONE: "DONE",
  REVIEW: "REVIEW",
  LAYOUT_EDITOR: "LAYOUT_EDITOR",
});

const settings = loadSettings();

function updateSettings(patch) {
  Object.assign(settings, patch);
  saveSettings(settings);
}

const app = {
  state: State.LANDING,
  landingView: "main",
  // KhS 4:1 - the declaration names what is being written, so confirming for
  // a mezuzah does not cover tefillin or a sefer. Per-kind, session only.
  lishmahByKind: { mezuzah: false, tefillin: false, torah: false, megillah: false },
  textId: "mezuzah",
  textKind: "mezuzah",
  text: null,
  index: 0,
  shemConfirmed: new Set(),
  menuOpen: false,
  torahSection: null,
  expandedSefer: null,
  font: settings.font ?? "ashkenaz",
  fontScale: settings.fontScale ?? 1,
  rtOrder: settings.rtOrder ?? "rashi",
  substituteSafek: settings.substituteSafek ?? true,
  justifyMode: settings.justifyMode ?? "word",
  lineHeight: settings.lineHeight ?? 1.9,
  wordGap: settings.wordGap ?? 0.15,
  voiceEnabled: settings.voiceEnabled ?? true,
  voiceSensitivity: settings.voiceSensitivity ?? "normal",
  voiceStatus: isSpeechRecognitionSupported() ? "stopped" : "unsupported",
  voiceStarted: false,
  halachaOpen: false,
  halachaExpanded: null,
  halachaEntryStates: {},
  counterOpen: false,
  reviewReturnState: null,
  reviewSelectedIndex: null,
  layoutReturnState: null,
  layoutBreaks: new Set(),
};

function kindOf(textId) {
  if (textId.startsWith("torah:")) return "torah";
  if (textId.startsWith("megillah:")) return "megillah";
  return textId; // "mezuzah" | "tefillin"
}

function lishmahPending() {
  return !app.lishmahByKind[app.textKind];
}

function verifyChecksum(text, textId) {
  if (text.words.length !== text.wordCount) {
    console.warn(
      `[${textId}] word-count checksum MISMATCH: wordCount says ${text.wordCount}, ` +
        `but words array has ${text.words.length}. Do not use for writing until resolved.`
    );
  } else {
    console.info(`[${textId}] word-count checksum OK: ${text.wordCount} words.`);
  }
  if (!text.verified) {
    console.warn(`[${textId}] text is UNVERIFIED against a printed tikkun. ${text._UNVERIFIED ?? ""}`);
  }
}

function isCurrentWordShemPending() {
  const word = app.text?.words[app.index];
  return isShemWord(word) && !app.shemConfirmed.has(app.index);
}

async function switchToText(id) {
  app.state = State.LOADING;
  app.menuOpen = false;
  render();
  try {
    const text = await loadText(id, { rtOrder: app.rtOrder });
    app.textId = id;
    app.textKind = kindOf(id);
    app.text = text;
    verifyChecksum(text, id);
    app.shemConfirmed = new Set();
    app.layoutBreaks = new Set();
    const saved = loadPosition(id);
    app.index = saved < text.words.length ? saved : 0;
    app.state = State.READY;
  } catch (err) {
    console.error("[loader] failed to load text:", err);
    if (!app.text) {
      app.text = await loadText("mezuzah", {});
      app.textId = "mezuzah";
      app.textKind = "mezuzah";
      app.index = 0;
    }
    app.state = State.READY;
  }
  render();
  scrollCurrentIntoView("auto");
}

// ---------- advancing (incremental DOM updates - no full rebuild) ----------

function scrollCurrentIntoView(behavior = "smooth") {
  const current = document.querySelector(".word.current");
  if (!current) return;
  const rect = current.getBoundingClientRect();
  const topBand = window.innerHeight * 0.2;
  const bottomBand = window.innerHeight * 0.65; // above the control bar
  if (rect.top < topBand || rect.bottom > bottomBand) {
    current.scrollIntoView({ block: "center", behavior });
  }
}

function applyIndexChange(prevIndex) {
  const spans = document.querySelectorAll(".tikkun-column .word");
  const words = app.text.words;
  if (!spans.length) {
    render();
    return;
  }
  spans[prevIndex].className = wordClass(words[prevIndex], prevIndex, app.index, false);
  spans[app.index].className = wordClass(words[app.index], app.index, app.index, false);

  // fixed-line mode: move the current-line emphasis band with the word
  const prevLine = spans[prevIndex].closest(".klaf-row");
  const newLine = spans[app.index].closest(".klaf-row");
  if (prevLine && prevLine !== newLine) prevLine.classList.remove("current-line");
  if (newLine) newLine.classList.add("current-line");

  const position = document.querySelector(".ctrl-position");
  if (position) position.textContent = positionLabel(words, app.index);
  const backBtn = document.querySelector(".ctrl-back");
  if (backBtn) backBtn.disabled = app.index === 0;
  scrollCurrentIntoView();
}

function moveTo(newIndex) {
  const prev = app.index;
  const wasShem = isCurrentWordShemPending();
  app.index = newIndex;
  savePosition(app.textId, app.index);
  const isShemNow = isCurrentWordShemPending();
  if (wasShem || isShemNow) {
    // entering/leaving a Shem word changes the bottom panel - full render
    render();
    scrollCurrentIntoView();
  } else {
    applyIndexChange(prev);
  }
}

function doAdvance() {
  if (app.index >= app.text.words.length - 1) {
    app.state = State.DONE;
    render();
    return;
  }
  moveTo(app.index + 1);
}

function goBack() {
  if (app.index === 0) return;
  moveTo(app.index - 1);
}

function advance() {
  if (app.state !== State.READY || app.menuOpen || app.halachaOpen || app.counterOpen) return;
  if (lishmahPending()) return;
  if (isCurrentWordShemPending()) return;
  doAdvance();
}

function confirmLishmah() {
  app.lishmahByKind[app.textKind] = true;
  // First user-blessed moment to ask for the mic - never at page load.
  if (app.voiceEnabled && !app.voiceStarted && isSpeechRecognitionSupported()) {
    app.voiceStarted = true;
    voiceController.start();
  }
  render();
  scrollCurrentIntoView("auto");
}

function confirmShem() {
  app.shemConfirmed.add(app.index);
  doAdvance();
  // the shem panel must always swap back to the control bar, even when
  // moveTo took the incremental path
  if (app.state === State.READY) {
    render();
    scrollCurrentIntoView();
  }
}

// ---------- voice ----------

function getVoiceTarget() {
  if (app.state !== State.READY || app.menuOpen || lishmahPending()) return null;
  const word = app.text?.words[app.index];
  if (!word) return null;
  return { text: word.text, isShem: isCurrentWordShemPending() };
}

function handleVoiceMatch() {
  if (app.state !== State.READY || app.menuOpen || lishmahPending()) return;
  if (isCurrentWordShemPending()) {
    confirmShem();
  } else {
    doAdvance();
  }
}

const voiceController = createVoiceController({
  getTarget: getVoiceTarget,
  getSensitivity: () => app.voiceSensitivity,
  onMatch: handleVoiceMatch,
  onStatusChange: (status) => {
    if (status === app.voiceStatus) return;
    app.voiceStatus = status;
    render();
  },
});

function toggleVoice() {
  if (!isSpeechRecognitionSupported()) return;
  const nowOn = !(app.voiceStarted && app.voiceEnabled);
  app.voiceEnabled = nowOn;
  updateSettings({ voiceEnabled: nowOn });
  if (nowOn) {
    app.voiceStarted = true;
    voiceController.start();
  } else {
    voiceController.stop();
  }
  render();
}

// ---------- settings ----------

function selectLineHeight(v) {
  app.lineHeight = v;
  document.documentElement.style.setProperty("--klaf-line-height", v);
  updateSettings({ lineHeight: v });
  render();
}

function selectWordGap(v) {
  app.wordGap = v;
  document.documentElement.style.setProperty("--word-gap", v + "em");
  updateSettings({ wordGap: v });
  render();
}

function selectJustifyMode(mode) {
  app.justifyMode = mode;
  updateSettings({ justifyMode: mode });
  render();
}

function toggleSubstituteSafek() {
  app.substituteSafek = !app.substituteSafek;
  updateSettings({ substituteSafek: app.substituteSafek });
  render();
}

function selectVoiceSensitivity(sensitivity) {
  app.voiceSensitivity = sensitivity;
  updateSettings({ voiceSensitivity: sensitivity });
  render();
}

function selectFont(font) {
  app.font = font;
  document.documentElement.dataset.font = font;
  updateSettings({ font });
  render();
}

function selectFontScale(scale) {
  app.fontScale = scale;
  document.documentElement.style.setProperty("--font-scale", scale);
  updateSettings({ fontScale: scale });
  render();
}

function selectRTOrder(order) {
  app.rtOrder = order;
  updateSettings({ rtOrder: order });
  if (app.textId === "tefillin") {
    switchToText("tefillin");
    return;
  }
  render();
}

// ---------- panels/modes ----------

function goHome() {
  app.state = State.LANDING;
  app.landingView = "main";
  app.menuOpen = false;
  render();
}

function setLandingView(view) {
  app.landingView = view;
  render();
}

function toggleMenu() {
  app.menuOpen = !app.menuOpen;
  render();
}

function toggleSefer(sefer) {
  app.expandedSefer = app.expandedSefer === sefer ? null : sefer;
  render();
}

function toggleReviewMode() {
  if (app.state === State.REVIEW) {
    app.state = app.reviewReturnState.state;
    app.index = app.reviewReturnState.index;
    app.reviewReturnState = null;
    app.reviewSelectedIndex = null;
  } else if (app.state === State.READY || app.state === State.DONE) {
    app.reviewReturnState = { state: app.state, index: app.index };
    app.reviewSelectedIndex = null;
    app.state = State.REVIEW;
  }
  app.menuOpen = false;
  render();
}

function selectReviewWord(i) {
  app.reviewSelectedIndex = i;
  render();
}

// "start in the middle": deliberate two-step (tap word -> read location ->
// confirm). Exits review into writing mode at the chosen word; the lishmah
// gate for this kind still applies as usual.
function confirmReviewPosition(i) {
  app.index = i;
  savePosition(app.textId, app.index);
  app.reviewReturnState = null;
  app.reviewSelectedIndex = null;
  app.state = State.READY;
  render();
  scrollCurrentIntoView("auto");
}

function saveCurrentBookmark() {
  const label = `${app.text?.heTitle ?? app.textId} · מילה ${app.index + 1}`;
  addBookmark({ textId: app.textId, index: app.index, label, rtOrder: app.textId === "tefillin" ? app.rtOrder : null });
  render();
}

async function jumpToBookmark(bm) {
  if (bm.rtOrder && bm.rtOrder !== app.rtOrder) {
    app.rtOrder = bm.rtOrder;
    updateSettings({ rtOrder: bm.rtOrder });
  }
  if (bm.textId !== app.textId || app.state === State.LANDING) {
    await switchToText(bm.textId);
  }
  if (bm.index < app.text.words.length) {
    app.index = bm.index;
    savePosition(app.textId, app.index);
  }
  app.menuOpen = false;
  app.state = State.READY;
  render();
  scrollCurrentIntoView("auto");
}

function deleteBookmark(id) {
  removeBookmark(id);
  render();
}

function toggleLayoutEditor() {
  if (app.state === State.LAYOUT_EDITOR) {
    app.state = app.layoutReturnState.state;
    app.index = app.layoutReturnState.index;
    app.layoutReturnState = null;
  } else if (app.state === State.READY || app.state === State.DONE) {
    app.layoutReturnState = { state: app.state, index: app.index };
    app.state = State.LAYOUT_EDITOR;
  }
  app.menuOpen = false;
  render();
}

function toggleLineBreak(index) {
  if (app.layoutBreaks.has(index)) {
    app.layoutBreaks.delete(index);
  } else {
    app.layoutBreaks.add(index);
  }
  render();
}

function clearLayoutBreaks() {
  app.layoutBreaks = new Set();
  render();
}

function toggleLetterCounter() {
  app.counterOpen = !app.counterOpen;
  app.menuOpen = false;
  render();
}

function contextHalachaRef() {
  if (app.state === State.READY && lishmahPending()) return "Keset HaSofer.4";
  if (app.state === State.READY && isCurrentWordShemPending()) return "Keset HaSofer.10";
  return null;
}

function toggleHalacha() {
  app.halachaOpen = !app.halachaOpen;
  if (app.halachaOpen && !app.halachaExpanded) {
    const ctx = contextHalachaRef();
    if (ctx) openHalachaEntry(ctx);
  }
  render();
}

async function openHalachaEntry(ref) {
  if (!ref) return;
  if (app.halachaExpanded === ref) {
    app.halachaExpanded = null;
    render();
    return;
  }
  app.halachaExpanded = ref;
  const existing = app.halachaEntryStates[ref];
  if (!existing || existing.status === "error") {
    app.halachaEntryStates[ref] = { status: "loading" };
    render();
    const data = await fetchHalachaText(ref);
    app.halachaEntryStates[ref] = data ? { status: "loaded", data } : { status: "error" };
  }
  render();
}

// ---------- render ----------

function render() {
  const root = document.getElementById("app");
  root.innerHTML = "";

  root.appendChild(
    renderHeader({
      heTitle: app.state === State.LANDING ? "תיקון סופרים" : app.text?.heTitle ?? app.text?.title ?? "…",
      subtitle: app.state === State.LANDING ? "Sofer Teleprompter" : app.text?.title,
      onMenuToggle: toggleMenu,
      voiceStatus: app.voiceEnabled && app.voiceStarted ? app.voiceStatus : "stopped",
      onToggleVoice: toggleVoice,
      onToggleHalacha: toggleHalacha,
    })
  );

  if (app.state === State.LANDING) {
    const lastId = loadLastTextId();
    const valid =
      lastId && (lastId === "mezuzah" || lastId === "tefillin" || lastId.startsWith("torah:") || lastId.startsWith("megillah:"));
    root.appendChild(
      renderLanding({
        view: app.landingView,
        torahSection: app.torahSection,
        continueInfo: valid
          ? { id: lastId, label: lastId.replace("torah:", "Torah · ").replace("megillah:", "Megillah · ") }
          : null,
        onSetView: setLandingView,
        onSelectText: switchToText,
      })
    );
  } else if (app.state === State.LOADING) {
    root.appendChild(renderLoading());
  } else if (app.state === State.READY) {
    const shemPending = !lishmahPending() && isCurrentWordShemPending();
    root.appendChild(
      renderTikkun({
        words: app.text.words,
        index: app.index,
        verified: app.text.verified,
        shemPending,
        hasLines: app.text.hasLines,
        layoutNote: app.text.layoutNote,
        wordOpts: { substituteSafek: app.substituteSafek, justifyMode: app.justifyMode },
      })
    );
    if (lishmahPending()) {
      root.appendChild(renderLishmahPanel({ kind: app.textKind, onConfirm: confirmLishmah }));
    } else if (shemPending) {
      root.appendChild(renderShemGate({ onConfirm: confirmShem }));
    } else {
      root.appendChild(
        renderControlBar({
          words: app.text.words,
          index: app.index,
          locked: false,
          onBack: goBack,
          onAdvance: advance,
        })
      );
    }
  } else if (app.state === State.DONE) {
    root.appendChild(
      renderDone({
        wordCount: app.text.words.length,
        onBack: () => {
          app.state = State.READY;
          render();
          scrollCurrentIntoView("auto");
        },
      })
    );
  } else if (app.state === State.REVIEW) {
    root.appendChild(
      renderReview({
        words: app.text.words,
        index: app.index,
        selectedIndex: app.reviewSelectedIndex,
        onSelectWord: selectReviewWord,
        onConfirmPosition: confirmReviewPosition,
        onExit: toggleReviewMode,
        wordOpts: { substituteSafek: app.substituteSafek },
      })
    );
  } else if (app.state === State.LAYOUT_EDITOR) {
    root.appendChild(
      renderLayoutEditor({
        textId: app.textId,
        words: app.text.words,
        lineBreakIndices: app.layoutBreaks,
        onToggleBreak: toggleLineBreak,
        onClear: clearLayoutBreaks,
        onExit: toggleLayoutEditor,
      })
    );
  }

  if (app.counterOpen && app.text) {
    root.appendChild(renderLetterCounter({ text: app.text, onClose: toggleLetterCounter }));
  }

  if (app.halachaOpen) {
    root.appendChild(
      renderHalachaPanel({
        contextRef: contextHalachaRef(),
        expandedRef: app.halachaExpanded,
        entryStates: app.halachaEntryStates,
        onToggleEntry: openHalachaEntry,
        onClose: toggleHalacha,
      })
    );
  }

  queueMicrotask(() => applyLetterJustify(root));

  if (app.menuOpen) {
    root.appendChild(
      renderDrawer({
        manifest: textManifest,
        torahSection: app.torahSection,
        expandedSefer: app.expandedSefer,
        onToggleSefer: toggleSefer,
        activeId: app.textId,
        activeFont: app.font,
        fontScale: app.fontScale,
        rtOrder: app.rtOrder,
        voiceSensitivity: app.voiceSensitivity,
        substituteSafek: app.substituteSafek,
        onToggleSubstituteSafek: toggleSubstituteSafek,
        justifyMode: app.justifyMode,
        onSelectJustifyMode: selectJustifyMode,
        lineHeight: app.lineHeight,
        onSelectLineHeight: selectLineHeight,
        wordGap: app.wordGap,
        onSelectWordGap: selectWordGap,
        onSelectText: switchToText,
        onSelectFont: selectFont,
        onSelectFontScale: selectFontScale,
        onSelectRTOrder: selectRTOrder,
        onSelectVoiceSensitivity: selectVoiceSensitivity,
        onToggleReview: toggleReviewMode,
        reviewActive: app.state === State.REVIEW,
        onToggleLayoutEditor: toggleLayoutEditor,
        layoutEditorActive: app.state === State.LAYOUT_EDITOR,
        onToggleLetterCounter: toggleLetterCounter,
        onGoHome: goHome,
        bookmarks: loadBookmarks(),
        canBookmark: app.state === State.READY || app.state === State.REVIEW,
        onSaveBookmark: saveCurrentBookmark,
        onJumpBookmark: jumpToBookmark,
        onDeleteBookmark: deleteBookmark,
        onClose: toggleMenu,
      })
    );
  }
}

async function init() {
  document.documentElement.dataset.font = app.font;
  document.documentElement.style.setProperty("--font-scale", app.fontScale);
  document.documentElement.style.setProperty("--klaf-line-height", app.lineHeight);
  document.documentElement.style.setProperty("--word-gap", app.wordGap + "em");
  render();

  loadTorahManifest()
    .then((manifest) => {
      app.torahSection = manifest;
      if (app.menuOpen) render();
    })
    .catch((err) => console.warn("[torah] manifest unavailable:", err));

  render(); // landing

  // NOTE: voice deliberately does NOT start here - no mic permission prompt
  // at page load. It starts on lishmah confirm or the header toggle.

  document.fonts.ready.then(() => applyLetterJustify());
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => applyLetterJustify(), 150);
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      advance();
    } else if (e.code === "ArrowRight") {
      // RTL: right arrow = back
      if (app.state === State.READY && !app.menuOpen && !lishmahPending()) goBack();
    }
  });
}

init();
