import mezuzah from "./texts/mezuzah.json";
import { renderWords, renderDone } from "./display.js";
import { loadPosition, savePosition } from "./store.js";

const TEXT_ID = "mezuzah";

const State = Object.freeze({
  LOADING: "LOADING",
  READY: "READY",
  DONE: "DONE",
});

const app = {
  state: State.LOADING,
  words: mezuzah.words,
  index: 0,
};

function verifyChecksum(text) {
  if (text.words.length !== text.wordCount) {
    console.warn(
      `[${TEXT_ID}] word-count checksum MISMATCH: wordCount says ${text.wordCount}, ` +
        `but words array has ${text.words.length}. Do not use for writing until resolved.`
    );
  } else {
    console.info(`[${TEXT_ID}] word-count checksum OK: ${text.wordCount} words.`);
  }
  if (!text.verified) {
    console.warn(`[${TEXT_ID}] text is UNVERIFIED against a printed tikkun. ${text._UNVERIFIED ?? ""}`);
  }
}

function advance() {
  if (app.state !== State.READY) return;
  if (app.index >= app.words.length - 1) {
    app.state = State.DONE;
    render();
    return;
  }
  app.index += 1;
  savePosition(TEXT_ID, app.index);
  render();
}

function render() {
  const root = document.getElementById("app");
  if (app.state === State.READY) {
    renderWords(root, { words: app.words, index: app.index });
  } else if (app.state === State.DONE) {
    renderDone(root, { wordCount: app.words.length });
  }
}

function init() {
  verifyChecksum(mezuzah);

  const saved = loadPosition();
  if (saved.textId === TEXT_ID && saved.wordIndex < app.words.length) {
    app.index = saved.wordIndex;
  }
  app.state = State.READY;
  render();

  document.addEventListener("click", advance);
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      advance();
    }
  });
}

init();
