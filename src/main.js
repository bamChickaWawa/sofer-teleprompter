import { textManifest } from "./texts/manifest.js";
import { loadText, loadTorahManifest } from "./texts/loader.js";
import { renderHeader, renderTikkun, renderDone, renderReview, renderLoading } from "./display.js";
import { renderDrawer } from "./menu.js";
import { renderLayoutEditor } from "./layout-editor.js";
import { renderLishmahGate, renderShemGate } from "./shem.js";
import { isShemWord } from "./declarations.js";
import { createVoiceController, isSpeechRecognitionSupported } from "./voice.js";
import { fetchHalachaText, renderHalachaPanel } from "./halacha.js";
import { renderLetterCounter } from "./letter-counter.js";
import { loadPosition, savePosition, loadLastTextId, loadSettings, saveSettings } from "./store.js";

const State = Object.freeze({
  LOADING: "LOADING",
  LISHMAH_GATE: "LISHMAH_GATE",
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
  state: State.LOADING,
  lishmahConfirmed: false,
  textId: "mezuzah",
  textKind: "mezuzah",
  text: null,
  index: 0,
  shemConfirmed: new Set(),
  menuOpen: false,
  torahSection: null, // populated from torah-manifest.json
  expandedSefer: null,
  font: settings.font ?? "ashkenaz",
  rtOrder: settings.rtOrder ?? "rashi",
  voiceEnabled: settings.voiceEnabled ?? true,
  voiceSensitivity: settings.voiceSensitivity ?? "normal",
  voiceStatus: isSpeechRecognitionSupported() ? "stopped" : "unsupported",
  halachaOpen: false,
  halachaExpanded: null,
  halachaEntryStates: {},
  counterOpen: false,
  reviewReturnState: null,
  layoutReturnState: null,
  layoutBreaks: new Set(),
};

function kindOf(textId) {
  if (textId.startsWith("torah:")) return "torah";
  return textId; // "mezuzah" | "tefillin"
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
    app.state = app.lishmahConfirmed ? State.READY : State.LISHMAH_GATE;
  } catch (err) {
    console.error("[loader] failed to load text:", err);
    app.state = State.READY;
    if (!app.text) {
      // nothing loaded at all - retry the default rather than render nothing
      app.text = await loadText("mezuzah", {});
      app.textId = "mezuzah";
      app.textKind = "mezuzah";
    }
  }
  render();
}

function doAdvance() {
  if (app.index >= app.text.words.length - 1) {
    app.state = State.DONE;
    render();
    return;
  }
  app.index += 1;
  savePosition(app.textId, app.index);
  render();
}

function advance() {
  if (app.state !== State.READY || app.menuOpen || app.halachaOpen || app.counterOpen) return;
  if (isCurrentWordShemPending()) return;
  doAdvance();
}

function confirmLishmah() {
  app.lishmahConfirmed = true;
  app.state = State.READY;
  render();
}

function confirmShem() {
  app.shemConfirmed.add(app.index);
  doAdvance();
}

function getVoiceTarget() {
  if (app.state !== State.READY || app.menuOpen) return null;
  const word = app.text?.words[app.index];
  if (!word) return null;
  return { text: word.text, isShem: isCurrentWordShemPending() };
}

function handleVoiceMatch() {
  if (app.state !== State.READY || app.menuOpen) return;
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
    app.voiceStatus = status;
    render();
  },
});

function toggleVoice() {
  if (!isSpeechRecognitionSupported()) return;
  app.voiceEnabled = !app.voiceEnabled;
  updateSettings({ voiceEnabled: app.voiceEnabled });
  if (app.voiceEnabled) {
    voiceController.start();
  } else {
    voiceController.stop();
  }
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

function selectRTOrder(order) {
  app.rtOrder = order;
  updateSettings({ rtOrder: order });
  if (app.textId === "tefillin") {
    switchToText("tefillin");
    return;
  }
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
  } else if (app.state === State.READY || app.state === State.DONE) {
    app.reviewReturnState = { state: app.state, index: app.index };
    app.state = State.REVIEW;
  }
  app.menuOpen = false;
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
  if (app.state === State.LISHMAH_GATE) return "Keset HaSofer.4";
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

function render() {
  const root = document.getElementById("app");
  root.innerHTML = "";

  root.appendChild(
    renderHeader({
      title: app.text?.title ?? "טוען...",
      onMenuToggle: toggleMenu,
      voiceStatus: app.voiceEnabled ? app.voiceStatus : "stopped",
      onToggleVoice: toggleVoice,
      onToggleHalacha: toggleHalacha,
    })
  );

  if (app.state === State.LOADING) {
    root.appendChild(renderLoading());
  } else if (app.state === State.LISHMAH_GATE) {
    root.appendChild(renderLishmahGate({ kind: app.textKind, onConfirm: confirmLishmah }));
  } else if (app.state === State.READY) {
    const shemPending = isCurrentWordShemPending();
    root.appendChild(
      renderTikkun({ words: app.text.words, index: app.index, verified: app.text.verified, shemPending })
    );
    if (shemPending) root.appendChild(renderShemGate({ onConfirm: confirmShem }));
  } else if (app.state === State.DONE) {
    root.appendChild(renderDone({ wordCount: app.text.words.length }));
  } else if (app.state === State.REVIEW) {
    root.appendChild(renderReview({ words: app.text.words, index: app.index, onExit: toggleReviewMode }));
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

  if (app.menuOpen) {
    root.appendChild(
      renderDrawer({
        manifest: textManifest,
        torahSection: app.torahSection,
        expandedSefer: app.expandedSefer,
        onToggleSefer: toggleSefer,
        activeId: app.textId,
        activeFont: app.font,
        rtOrder: app.rtOrder,
        voiceSensitivity: app.voiceSensitivity,
        onSelectText: switchToText,
        onSelectFont: selectFont,
        onSelectRTOrder: selectRTOrder,
        onSelectVoiceSensitivity: selectVoiceSensitivity,
        onToggleReview: toggleReviewMode,
        reviewActive: app.state === State.REVIEW,
        onToggleLayoutEditor: toggleLayoutEditor,
        layoutEditorActive: app.state === State.LAYOUT_EDITOR,
        onToggleLetterCounter: toggleLetterCounter,
        onClose: toggleMenu,
      })
    );
  }

  const current = root.querySelector(".word.current");
  if (current) current.scrollIntoView({ block: "center", behavior: "smooth" });
}

async function init() {
  document.documentElement.dataset.font = app.font;
  render();

  // Torah nav loads in parallel with the initial text; menu just shows the
  // static sections until it lands.
  loadTorahManifest()
    .then((manifest) => {
      app.torahSection = manifest;
      if (app.menuOpen) render();
    })
    .catch((err) => console.warn("[torah] manifest unavailable:", err));

  const last = loadLastTextId();
  await switchToText(last && (last === "tefillin" || last === "mezuzah" || last.startsWith("torah:")) ? last : "mezuzah");

  if (app.voiceEnabled) voiceController.start();

  document.addEventListener("click", (e) => {
    if (e.target.closest(".app-header") || e.target.closest(".nav-drawer")) return;
    advance();
  });
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      advance();
    }
  });
}

init();
