const SLOT_OFFSETS = [-2, -1, 0, 1, 2, 3];

export function renderWords(root, { words, index }) {
  root.innerHTML = "";

  const stage = document.createElement("div");
  stage.className = "stage";

  const row = document.createElement("div");
  row.className = "word-row";

  for (const offset of SLOT_OFFSETS) {
    const wordIndex = index + offset;
    const slot = document.createElement("span");
    slot.className = `word-slot slot-offset-${offset}`;
    if (wordIndex >= 0 && wordIndex < words.length) {
      slot.textContent = words[wordIndex].text;
    } else {
      slot.classList.add("word-slot-empty");
    }
    row.appendChild(slot);
  }

  const counter = document.createElement("div");
  counter.className = "counter";
  counter.textContent = `מילה ${index + 1} מתוך ${words.length}`;

  stage.appendChild(row);
  stage.appendChild(counter);
  root.appendChild(stage);
}

export function renderDone(root, { wordCount }) {
  root.innerHTML = "";
  const stage = document.createElement("div");
  stage.className = "stage stage-done";
  const msg = document.createElement("div");
  msg.className = "done-message";
  msg.textContent = "הפרשה הושלמה";
  const sub = document.createElement("div");
  sub.className = "counter";
  sub.textContent = `${wordCount} מילים`;
  stage.appendChild(msg);
  stage.appendChild(sub);
  root.appendChild(stage);
}
