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

export function renderLishmahGate({ kind, onConfirm }) {
  const stage = document.createElement("div");
  stage.className = "gate-stage";

  const label = document.createElement("div");
  label.className = "gate-label";
  label.textContent = "לפני תחילת הכתיבה";

  const nusach = document.createElement("div");
  nusach.className = "gate-nusach";
  nusach.textContent = lishmahNusach(kind);

  const note = document.createElement("div");
  note.className = "gate-note";
  note.textContent = "יש להצהיר בפה לפני תחילת הכתיבה (כתב הסופר ד')";

  const btn = createLongPressButton({ label: "הצהרתי", onConfirm });

  stage.appendChild(label);
  stage.appendChild(nusach);
  stage.appendChild(note);
  stage.appendChild(btn);
  return stage;
}

export function renderShemGate({ onConfirm }) {
  const wrap = document.createElement("div");
  wrap.className = "shem-panel";

  const nusach = document.createElement("div");
  nusach.className = "gate-nusach shem-nusach";
  nusach.textContent = SHEM_NUSACH;

  const note = document.createElement("div");
  note.className = "gate-note";
  note.textContent = "כל שם קדוש טעון קידוש משלו (כתב הסופר י' א') - הצהרה חדשה, לא די בכוונת התחלת הכתיבה";

  const btn = createLongPressButton({ label: "אמרתי", onConfirm });

  wrap.appendChild(nusach);
  wrap.appendChild(note);
  wrap.appendChild(btn);
  return wrap;
}
