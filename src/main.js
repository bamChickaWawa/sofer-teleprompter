import mezuzah from "./texts/mezuzah.json";
import { textManifest } from "./texts/manifest.js";
import { renderHeader, renderTikkun, renderDone } from "./display.js";
import { renderDrawer } from "./menu.js";
import { renderLishmahGate, renderShemGate } from "./shem.js";
import { isShemWord } from "./declarations.js";
import { loadPosition, savePosition, loadSettings, saveSettings } from "./store.js";

const TEXTS = { mezuzah };

const State = Object.freeze({
  LISHMAH_GATE: "LISHMAH_GATE",
  READY: "READY",
  DONE: "DONE",
});

const settings = loadSettings();

const app = {
  state: State.LISHMAH_GATE,
  lishmahConfirmed: false,
  textId: "mezuzah-shema",
  index: 0,
  shemConfirmed: new Set(),
  menuOpen: false,
  font: settings.font ?? "ashkenaz",
};

function currentItem() {
  return textManifest.flatMap((g) => g.items).find((i) => i.id === app.textId);
}

function currentText() {
  return TEXTS[currentItem().file];
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
  saveSettings({ ...settings, font });
  render();
}

function toggleMenu() {
  app.menuOpen = !app.menuOpen;
  render();
}

function render() {
  const root = document.getElementById("app");
  root.innerHTML = "";

  const text = currentText();
  const item = currentItem();

  root.appendChild(renderHeader({ title: item.title, onMenuToggle: toggleMenu }));

  if (app.state === State.LISHMAH_GATE) {
    root.appendChild(renderLishmahGate({ onConfirm: confirmLishmah }));
  } else if (app.state === State.READY) {
    const shemPending = isCurrentWordShemPending();
    root.appendChild(renderTikkun({ words: text.words, index: app.index, verified: text.verified, shemPending }));
    if (shemPending) root.appendChild(renderShemGate({ onConfirm: confirmShem }));
  } else if (app.state === State.DONE) {
    root.appendChild(renderDone({ wordCount: text.words.length }));
  }

  if (app.menuOpen) {
    root.appendChild(
      renderDrawer({
        manifest: textManifest,
        activeId: app.textId,
        activeFont: app.font,
        onSelectText: selectText,
        onSelectFont: selectFont,
        onClose: toggleMenu,
      })
    );
  }

  const current = root.querySelector(".word.current");
  if (current) current.scrollIntoView({ block: "center", behavior: "smooth" });
}

function init() {
  document.documentElement.dataset.font = app.font;
  verifyChecksum(mezuzah, "mezuzah-shema");

  const saved = loadPosition();
  if (saved.textId === app.textId && saved.wordIndex < currentText().words.length) {
    app.index = saved.wordIndex;
  }
  render();

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
