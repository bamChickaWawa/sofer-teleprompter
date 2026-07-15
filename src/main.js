import { buildMezuzah, buildTefillinRashi, buildTefillinRT } from "./texts/compose.js";
import { textManifest } from "./texts/manifest.js";
import { renderHeader, renderTikkun, renderDone, renderReview } from "./display.js";
import { renderDrawer } from "./menu.js";
import { renderLishmahGate, renderShemGate } from "./shem.js";
import { isShemWord } from "./declarations.js";
import { createVoiceController, isSpeechRecognitionSupported } from "./voice.js";
import { fetchHalachaText, renderHalachaPanel } from "./halacha.js";
import { loadPosition, savePosition, loadSettings, saveSettings } from "./store.js";

const TEXTS = {
  mezuzah: buildMezuzah(),
};

const State = Object.freeze({
  LISHMAH_GATE: "LISHMAH_GATE",
  READY: "READY",
  DONE: "DONE",
  REVIEW: "REVIEW",
});

const settings = loadSettings();

function updateSettings(patch) {
  Object.assign(settings, patch);
  saveSettings(settings);
}

const app = {
  state: State.LISHMAH_GATE,
  lishmahConfirmed: false,
  textId: "mezuzah",
  index: 0,
  shemConfirmed: new Set(),
  menuOpen: false,
  font: settings.font ?? "ashkenaz",
  rtOrder: settings.rtOrder ?? "rashi",
  voiceEnabled: settings.voiceEnabled ?? true,
  voiceSensitivity: settings.voiceSensitivity ?? "normal",
  voiceStatus: isSpeechRecognitionSupported() ? "stopped" : "unsupported",
  halachaOpen: false,
  halachaExpanded: null,
  halachaEntryStates: {},
  reviewReturnState: null,
};

function currentItem() {
  return textManifest.flatMap((g) => g.items).find((i) => i.id === app.textId);
}

function currentText() {
  const item = currentItem();
  if (item.file === "tefillin") {
    return app.rtOrder === "rt" ? buildTefillinRT() : buildTefillinRashi();
  }
  return TEXTS[item.file];
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
  const word = currentText().words[app.index];
  return isShemWord(word) && !app.shemConfirmed.has(app.index);
}

function doAdvance() {
  const text = currentText();
  if (app.index >= text.words.length - 1) {
    app.state = State.DONE;
    render();
    return;
  }
  app.index += 1;
  savePosition(app.textId, app.index);
  render();
}

function advance() {
  if (app.state !== State.READY || app.menuOpen) return;
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
  const word = currentText().words[app.index];
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

function selectText(id) {
  app.textId = id;
  app.index = 0;
  app.shemConfirmed = new Set();
  app.state = app.lishmahConfirmed ? State.READY : State.LISHMAH_GATE;
  app.menuOpen = false;
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
  if (currentItem().file === "tefillin") {
    app.index = 0;
    app.shemConfirmed = new Set();
  }
  render();
}

function toggleMenu() {
  app.menuOpen = !app.menuOpen;
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

  const text = currentText();
  const item = currentItem();

  root.appendChild(
    renderHeader({
      title: item.title,
      onMenuToggle: toggleMenu,
      voiceStatus: app.voiceEnabled ? app.voiceStatus : "stopped",
      onToggleVoice: toggleVoice,
      onToggleHalacha: toggleHalacha,
    })
  );

  if (app.state === State.LISHMAH_GATE) {
    root.appendChild(renderLishmahGate({ onConfirm: confirmLishmah }));
  } else if (app.state === State.READY) {
    const shemPending = isCurrentWordShemPending();
    root.appendChild(renderTikkun({ words: text.words, index: app.index, verified: text.verified, shemPending }));
    if (shemPending) root.appendChild(renderShemGate({ onConfirm: confirmShem }));
  } else if (app.state === State.DONE) {
    root.appendChild(renderDone({ wordCount: text.words.length }));
  } else if (app.state === State.REVIEW) {
    root.appendChild(renderReview({ words: text.words, index: app.index, onExit: toggleReviewMode }));
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
        activeId: app.textId,
        activeFont: app.font,
        rtOrder: app.rtOrder,
        voiceSensitivity: app.voiceSensitivity,
        onSelectText: selectText,
        onSelectFont: selectFont,
        onSelectRTOrder: selectRTOrder,
        onSelectVoiceSensitivity: selectVoiceSensitivity,
        onToggleReview: toggleReviewMode,
        reviewActive: app.state === State.REVIEW,
        onClose: toggleMenu,
      })
    );
  }

  const current = root.querySelector(".word.current");
  if (current) current.scrollIntoView({ block: "center", behavior: "smooth" });
}

function init() {
  document.documentElement.dataset.font = app.font;
  verifyChecksum(TEXTS.mezuzah, "mezuzah");
  verifyChecksum(buildTefillinRashi(), "tefillin-rashi");
  verifyChecksum(buildTefillinRT(), "tefillin-rt");

  const saved = loadPosition();
  if (saved.textId === app.textId && saved.wordIndex < currentText().words.length) {
    app.index = saved.wordIndex;
  }
  render();

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
