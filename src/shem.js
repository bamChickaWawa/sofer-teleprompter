import { lishmahNusach, SHEM_NUSACH } from "./declarations.js";

const LONG_PRESS_MS = 750;

function createLongPressButton({ label, onConfirm }) {
  const btn = document.createElement("button");
  btn.className = "long-press-btn";
  btn.type = "button";

  const fill = document.createElement("span");
  fill.className = "lp-fill";
  const text = document.createElement("span");
  text.className = "lp-label";
  text.textContent = label;

  btn.appendChild(fill);
  btn.appendChild(text);

  let timer = null;

  const start = (e) => {
    e.preventDefault();
    e.stopPropagation();
    btn.classList.add("pressing");
    timer = setTimeout(() => {
      btn.classList.remove("pressing");
      onConfirm();
    }, LONG_PRESS_MS);
  };

  const cancel = (e) => {
    e.stopPropagation();
    clearTimeout(timer);
    btn.classList.remove("pressing");
  };

  btn.addEventListener("pointerdown", start);
  btn.addEventListener("pointerup", cancel);
  btn.addEventListener("pointerleave", cancel);
  btn.addEventListener("pointercancel", cancel);
  btn.addEventListener("click", (e) => e.stopPropagation());

  return btn;
}

// Bottom panel, not a full-screen block: the text stays visible and
// scrollable for reference, but advancing is locked until the declaration
// is confirmed (KhS 4:1 gates the WRITING, not the reading).
export function renderLishmahPanel({ kind, onConfirm }) {
  const wrap = document.createElement("div");
  wrap.className = "shem-panel lishmah-panel";

  const label = document.createElement("div");
  label.className = "gate-label";
  label.textContent = "Before writing — declare aloud (Keset HaSofer 4):";

  const nusach = document.createElement("div");
  nusach.className = "gate-nusach shem-nusach";
  nusach.textContent = lishmahNusach(kind);

  const btn = createLongPressButton({ label: "Hold: I have declared", onConfirm });

  wrap.appendChild(label);
  wrap.appendChild(nusach);
  wrap.appendChild(btn);
  return wrap;
}

export function renderShemGate({ onConfirm }) {
  const wrap = document.createElement("div");
  wrap.className = "shem-panel";

  const nusach = document.createElement("div");
  nusach.className = "gate-nusach shem-nusach";
  nusach.textContent = SHEM_NUSACH;

  const note = document.createElement("div");
  note.className = "gate-note";
  note.textContent =
    "Divine Name ahead — every Shem needs its own sanctification (Keset HaSofer 10:1); the session declaration is not enough. Say aloud:";

  const btn = createLongPressButton({ label: "Hold: I have said it", onConfirm });

  wrap.appendChild(nusach);
  wrap.appendChild(note);
  wrap.appendChild(btn);
  return wrap;
}
