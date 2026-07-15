const FONT_OPTIONS = [
  { id: "ashkenaz", label: "אשכנז" },
  { id: "sefarad", label: "ספרד" },
  { id: "fallback", label: "רגיל" },
];

export function renderDrawer({ manifest, activeId, activeFont, onSelectText, onSelectFont, onClose }) {
  const overlay = document.createElement("div");
  overlay.className = "nav-overlay";
  overlay.addEventListener("click", (e) => {
    e.stopPropagation();
    onClose();
  });

  const drawer = document.createElement("div");
  drawer.className = "nav-drawer";
  drawer.addEventListener("click", (e) => e.stopPropagation());

  const fontHeading = document.createElement("h2");
  fontHeading.textContent = "גופן";
  drawer.appendChild(fontHeading);

  const fontRow = document.createElement("div");
  fontRow.className = "font-choice-row";
  for (const opt of FONT_OPTIONS) {
    const btn = document.createElement("button");
    btn.className = `font-choice${opt.id === activeFont ? " active" : ""}`;
    btn.textContent = opt.label;
    btn.addEventListener("click", () => onSelectFont(opt.id));
    fontRow.appendChild(btn);
  }
  drawer.appendChild(fontRow);

  for (const group of manifest) {
    const heading = document.createElement("h2");
    heading.textContent = group.category;
    drawer.appendChild(heading);

    for (const item of group.items) {
      const btn = document.createElement("button");
      btn.className = `nav-item${item.id === activeId ? " active" : ""}`;
      btn.textContent = item.title;
      btn.addEventListener("click", () => onSelectText(item.id));
      drawer.appendChild(btn);
    }
  }

  const container = document.createElement("div");
  container.appendChild(overlay);
  container.appendChild(drawer);
  return container;
}
