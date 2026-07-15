const KEY_POSITION = "sofer-teleprompter:position";
const KEY_SETTINGS = "sofer-teleprompter:settings";

const DEFAULT_SETTINGS = {
  font: "ashkenaz",
  voiceEnabled: true,
  voiceSensitivity: "normal",
};

export function loadPosition() {
  const raw = localStorage.getItem(KEY_POSITION);
  if (!raw) return { textId: null, wordIndex: 0 };
  try {
    return JSON.parse(raw);
  } catch {
    return { textId: null, wordIndex: 0 };
  }
}

export function savePosition(textId, wordIndex) {
  localStorage.setItem(KEY_POSITION, JSON.stringify({ textId, wordIndex }));
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
