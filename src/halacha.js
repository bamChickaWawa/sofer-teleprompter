import halachot from "./halachot.json";

const SEFARIA_BASE = "https://www.sefaria.org/api/v3/texts/";
const CACHE_PREFIX = "sofer-teleprompter:halacha:";

export { halachot };

function toApiRef(ref) {
  return encodeURIComponent(ref.replace(/ /g, "_"));
}

async function fetchVersion(ref, versionParam) {
  const url = `${SEFARIA_BASE}${toApiRef(ref)}${versionParam ? `?version=${versionParam}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sefaria fetch failed: ${res.status} for ${ref}`);
  const data = await res.json();
  const v = data.versions?.[0];
  if (!v) return null;
  return {
    text: v.text,
    versionTitle: v.versionTitle,
    versionSource: v.versionSource,
    license: v.license,
  };
}

// Cached in localStorage so the panel works offline after first view.
export async function fetchHalachaText(sefariaRef) {
  if (!sefariaRef) return null;
  const cacheKey = CACHE_PREFIX + sefariaRef;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* corrupt cache entry, fall through to refetch */
    }
  }
  const [he, en] = await Promise.all([
    fetchVersion(sefariaRef, null).catch(() => null),
    fetchVersion(sefariaRef, "english").catch(() => null),
  ]);
  if (!he && !en) return null;
  const result = { he, en };
  try {
    localStorage.setItem(cacheKey, JSON.stringify(result));
  } catch {
    /* localStorage full/unavailable - still return the fetched result */
  }
  return result;
}

function renderEntryContent(state) {
  const box = document.createElement("div");
  box.className = "halacha-content";

  if (state.status === "loading") {
    box.textContent = "טוען...";
    return box;
  }
  if (state.status === "error" || (state.status === "loaded" && !state.data)) {
    box.textContent = "לא ניתן לטעון כעת (בדוק חיבור לאינטרנט)";
    return box;
  }
  if (state.status === "unavailable") {
    box.textContent = "אין מקור זמין דרך ה-API של ספריא";
    return box;
  }
  if (state.status !== "loaded") return box;

  const { he, en } = state.data;
  if (he?.text?.length) {
    const heBlock = document.createElement("div");
    heBlock.className = "halacha-he";
    heBlock.textContent = he.text.join(" ");
    box.appendChild(heBlock);
  }
  if (en?.text?.length) {
    const enBlock = document.createElement("div");
    enBlock.className = "halacha-en";
    enBlock.textContent = en.text.join(" ");
    box.appendChild(enBlock);

    const attribution = document.createElement("div");
    attribution.className = "halacha-attribution";
    attribution.textContent = `${en.versionTitle ?? ""}${en.versionSource ? " - " + en.versionSource : ""}${
      en.license && en.license !== "unknown" ? " (" + en.license + ")" : ""
    }`;
    box.appendChild(attribution);
  }
  return box;
}

export function renderHalachaPanel({ contextRef, expandedRef, entryStates, onToggleEntry, onClose }) {
  const overlay = document.createElement("div");
  overlay.className = "nav-overlay";
  overlay.addEventListener("click", (e) => {
    e.stopPropagation();
    onClose();
  });

  const drawer = document.createElement("div");
  drawer.className = "nav-drawer halacha-drawer";
  drawer.addEventListener("click", (e) => e.stopPropagation());

  const heading = document.createElement("h2");
  heading.textContent = "מראה מקומות";
  drawer.appendChild(heading);

  if (contextRef) {
    const contextNote = document.createElement("div");
    contextNote.className = "halacha-context-note";
    contextNote.textContent = "רלוונטי כעת:";
    drawer.appendChild(contextNote);
  }

  for (const section of halachot.sections) {
    const sectionHeading = document.createElement("h2");
    sectionHeading.textContent = section.title;
    drawer.appendChild(sectionHeading);

    for (const entry of section.entries) {
      const row = document.createElement("div");
      row.className = "halacha-entry";

      const btn = document.createElement("button");
      btn.className = `halacha-entry-btn${entry.sefariaRef === contextRef ? " context-active" : ""}`;
      btn.textContent = `${entry.topic} (${entry.summary})`;
      btn.disabled = !entry.sefariaRef;
      btn.addEventListener("click", () => onToggleEntry(entry.sefariaRef));
      row.appendChild(btn);

      if (entry.sefariaRef && entry.sefariaRef === expandedRef) {
        row.appendChild(renderEntryContent(entryStates[entry.sefariaRef] ?? { status: "loading" }));
      }

      drawer.appendChild(row);
    }
  }

  const container = document.createElement("div");
  container.appendChild(overlay);
  container.appendChild(drawer);
  return container;
}
