// Tap-to-digitize: open your printed tikkun, tap the last word of each
// line as you read down it, export the resulting line-break map. No
// columns yet (mezuzah/tefillin are single-column) - Esther's multi-column
// layouts are a separate future model (plan §3c).

export function computeLines(words, lineBreakIndices) {
  const sorted = [...lineBreakIndices].sort((a, b) => a - b);
  const lines = [];
  let start = 0;
  for (const endIndex of sorted) {
    lines.push({ startIndex: start, endIndex, wordCount: endIndex - start + 1 });
    start = endIndex + 1;
  }
  if (start < words.length) {
    lines.push({ startIndex: start, endIndex: words.length - 1, wordCount: words.length - start });
  }
  return lines;
}

export function renderLayoutEditor({ textId, words, lineBreakIndices, onToggleBreak, onClear, onExit }) {
  const wrap = document.createElement("div");
  wrap.className = "layout-editor";

  const banner = document.createElement("div");
  banner.className = "editor-banner";

  const lines = computeLines(words, lineBreakIndices);
  const info = document.createElement("span");
  info.textContent = `עורך פריסה - ${lines.length} שורות עד כה`;
  banner.appendChild(info);

  const actions = document.createElement("div");
  actions.className = "editor-actions";

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "נקה";
  clearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onClear();
  });
  actions.appendChild(clearBtn);

  const exportBtn = document.createElement("button");
  exportBtn.textContent = "ייצוא";
  exportBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    exportLayout(textId, lines);
  });
  actions.appendChild(exportBtn);

  const exitBtn = document.createElement("button");
  exitBtn.textContent = "סיום";
  exitBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onExit();
  });
  actions.appendChild(exitBtn);

  banner.appendChild(actions);
  wrap.appendChild(banner);

  const hint = document.createElement("div");
  hint.className = "editor-hint";
  hint.textContent = "הקש על המילה האחרונה בכל שורה בתיקון המודפס שלך";
  wrap.appendChild(hint);

  const scroll = document.createElement("div");
  scroll.className = "tikkun-wrap";

  const column = document.createElement("div");
  column.className = "tikkun-column";

  const text = document.createElement("div");
  text.className = "tikkun-text";
  words.forEach((word, i) => {
    const span = document.createElement("span");
    span.className = `word upcoming${lineBreakIndices.has(i) ? " line-break-marker" : ""}`;
    span.textContent = word.text;
    span.addEventListener("click", (e) => {
      e.stopPropagation();
      onToggleBreak(i);
    });
    text.appendChild(span);
    if (i < words.length - 1) text.appendChild(document.createTextNode(" "));
  });
  column.appendChild(text);
  scroll.appendChild(column);
  wrap.appendChild(scroll);

  return wrap;
}

function exportLayout(textId, lines) {
  const payload = {
    sourceTextId: textId,
    createdAt: new Date().toISOString(),
    lines: lines.map((l, i) => ({ lineNumber: i + 1, ...l })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${textId}-layout.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
