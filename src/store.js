const KEY_POSITIONS = "sofer-teleprompter:positions";
const KEY_POSITION_LEGACY = "sofer-teleprompter:position";
const KEY_LAST_TEXT = "sofer-teleprompter:last-text";
const KEY_SETTINGS = "sofer-teleprompter:settings";

const DEFAULT_SETTINGS = {
  font: "ashkenaz",
  voiceEnabled: true,
  voiceSensitivity: "normal",
};

function loadPositionMap() {
  const raw = localStorage.getItem(KEY_POSITIONS);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  // migrate the old single-position format
  const legacy = localStorage.getItem(KEY_POSITION_LEGACY);
  if (legacy) {
    try {
      const { textId, wordIndex } = JSON.parse(legacy);
      if (textId) return { [textId]: wordIndex };
    } catch {
      /* ignore corrupt legacy entry */
    }
  }
  return {};
}

export function loadPosition(textId) {
  const map = loadPositionMap();
  return map[textId] ?? 0;
}

export function savePosition(textId, wordIndex) {
  const map = loadPositionMap();
  map[textId] = wordIndex;
  localStorage.setItem(KEY_POSITIONS, JSON.stringify(map));
  localStorage.setItem(KEY_LAST_TEXT, textId);
}

export function loadLastTextId() {
  return localStorage.getItem(KEY_LAST_TEXT);
}

const KEY_BOOKMARKS = "sofer-teleprompter:bookmarks";

// Named save points, on top of the automatic per-text position save - a
// sofer working on several klafim of the same text tracks each one here.
export function loadBookmarks() {
  const raw = localStorage.getItem(KEY_BOOKMARKS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addBookmark({ textId, index, label, rtOrder }) {
  const list = loadBookmarks();
  const bm = { id: Date.now(), textId, index, label, rtOrder: rtOrder ?? null, savedAt: new Date().toISOString() };
  list.unshift(bm);
  localStorage.setItem(KEY_BOOKMARKS, JSON.stringify(list.slice(0, 50)));
  return bm;
}

export function removeBookmark(id) {
  const list = loadBookmarks().filter((b) => b.id !== id);
  localStorage.setItem(KEY_BOOKMARKS, JSON.stringify(list));
}

export function loadSettings() {
  const raw = localStorage.getItem(KEY_SETTINGS);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
}
