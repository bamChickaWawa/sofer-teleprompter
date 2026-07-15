// Letter-frequency tool (generalization of sofrus.com's "Yudin counter"):
// counts every letter in the current text, final forms shown separately.
// Useful for checking a written column: compare counts of a suspect letter
// against the expected text.

const ALEF_BET = "אבגדהוזחטיכךלמםנןסעפףצץקרשת".split("");

export function countLetters(words) {
  const counts = Object.fromEntries(ALEF_BET.map((l) => [l, 0]));
  let total = 0;
  for (const w of words) {
    for (const ch of w.text) {
      if (counts[ch] !== undefined) {
        counts[ch] += 1;
        total += 1;
      }
    }
  }
  return { counts, total };
}

export function renderLetterCounter({ text, onClose }) {
  const overlay = document.createElement("div");
  overlay.className = "nav-overlay";
  overlay.addEventListener("click", (e) => {
    e.stopPropagation();
    onClose();
  });

  const panel = document.createElement("div");
  panel.className = "counter-panel";
  panel.addEventListener("click", (e) => e.stopPropagation());

  const heading = document.createElement("h2");
  heading.textContent = "מונה אותיות";
  panel.appendChild(heading);

  const subtitle = document.createElement("div");
  subtitle.className = "counter-subtitle";
  subtitle.textContent = text.title;
  panel.appendChild(subtitle);

  const { counts, total } = countLetters(text.words);

  const grid = document.createElement("div");
  grid.className = "counter-grid";
  for (const letter of ALEF_BET) {
    const cell = document.createElement("div");
    cell.className = "counter-cell";
    const letterEl = document.createElement("div");
    letterEl.className = "counter-letter";
    letterEl.textContent = letter;
    const countEl = document.createElement("div");
    countEl.className = "counter-count";
    countEl.textContent = counts[letter];
    cell.appendChild(letterEl);
    cell.appendChild(countEl);
    grid.appendChild(cell);
  }
  panel.appendChild(grid);

  const totals = document.createElement("div");
  totals.className = "counter-totals";
  totals.textContent = `סה"כ: ${total} אותיות, ${text.words.length} מילים`;
  panel.appendChild(totals);

  const closeBtn = document.createElement("button");
  closeBtn.className = "counter-close";
  closeBtn.textContent = "סגור";
  closeBtn.addEventListener("click", onClose);
  panel.appendChild(closeBtn);

  const container = document.createElement("div");
  container.appendChild(overlay);
  container.appendChild(panel);
  return container;
}
