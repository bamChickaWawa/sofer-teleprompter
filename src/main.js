import mezuzah from "./texts/mezuzah.json";
import { textManifest } from "./texts/manifest.js";
import { renderHeader, renderTikkun, renderDone } from "./display.js";
import { renderDrawer } from "./menu.js";
import { loadPosition, savePosition, loadSettings, saveSettings } from "./store.js";

const TEXTS = { mezuzah };

const State = Object.freeze({
  READY: "READY",
  DONE: "DONE",
});

const settings = loadSettings();

const app = {
  state: State.READY,
  textId: "mezuzah-shema",
  index: 0,
  menuOpen: false,
  font: settings.font ?? "ashkenaz",
};

function currentText() {
  const item = textManifest.flatMap((g) => g.items).find((i) => i.id === app.textId);
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

function advance() {
  if (app.state !== State.READY || app.menuOpen) return;
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

function selectText(id) {
  app.textId = id;
  app.index = 0;
  app.state = State.READY;
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
  const item = textManifest.flatMap((g) => g.items).find((i) => i.id === app.textId);

  root.appendChild(renderHeader({ title: item.title, onMenuToggle: toggleMenu }));

  if (app.state === State.READY) {
    root.appendChild(renderTikkun({ words: text.words, index: app.index, verified: text.verified }));
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
