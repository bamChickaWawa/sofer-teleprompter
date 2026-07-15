export function renderHeader({ title, onMenuToggle }) {
  const header = document.createElement("header");
  header.className = "app-header";

  const titleEl = document.createElement("div");
  titleEl.className = "title";
  titleEl.textContent = title;

  const controls = document.createElement("div");
  controls.className = "header-controls";

  const menuBtn = document.createElement("button");
  menuBtn.textContent = "☰ תפריט";
  menuBtn.addEventListener("click", onMenuToggle);
  controls.appendChild(menuBtn);

  header.appendChild(titleEl);
  header.appendChild(controls);
  return header;
}

export function renderTikkun({ words, index, verified, shemPending }) {
  const wrap = document.createElement("div");
  wrap.className = shemPending ? "tikkun-wrap with-shem-panel" : "tikkun-wrap";

  const column = document.createElement("div");
  column.className = shemPending ? "tikkun-column shem-active" : "tikkun-column";

  if (!verified) {
    const banner = document.createElement("div");
    banner.className = "unverified-banner";
    banner.textContent = "טקסט לא מאומת - יש לבדוק מול תיקון מודפס";
    column.appendChild(banner);
  }

  const text = document.createElement("div");
  text.className = "tikkun-text";

  words.forEach((word, i) => {
    const span = document.createElement("span");
    const isCurrent = i === index;
    span.className = `word ${i < index ? "written" : isCurrent ? "current" : "upcoming"}${
      isCurrent && shemPending ? " shem-pending" : ""
    }`;
    span.textContent = word.text;
    text.appendChild(span);
    if (i < words.length - 1) text.appendChild(document.createTextNode(" "));
  });

  column.appendChild(text);

  const footer = document.createElement("div");
  footer.className = "tikkun-footer";
  footer.textContent = `מילה ${index + 1} מתוך ${words.length}`;
  column.appendChild(footer);

  wrap.appendChild(column);
  return wrap;
}

export function renderDone({ wordCount }) {
  const stage = document.createElement("div");
  stage.className = "stage-done";
  const msg = document.createElement("div");
  msg.className = "done-message";
  msg.textContent = "הפרשה הושלמה";
  const sub = document.createElement("div");
  sub.className = "counter";
  sub.textContent = `${wordCount} מילים`;
  stage.appendChild(msg);
  stage.appendChild(sub);
  return stage;
}
