// Nusach here is a reasonable default, NOT a psak. Confirm wording with your rav
// before relying on it; both are configurable per plan §3 items 4-5.

export const LISHMAH_NUSACH = "הריני כותב מזוזה זו לשם קדושת מזוזה";

export const SHEM_NUSACH = "הריני כותב לשם קדושת השם";

// Words accepted as a spoken match for a Shem, since the Shem itself is not
// pronounced as written (Keset HaSofer ch. 10).
export const SHEM_KINUI = ["השם", "hashem"];

export function isShemWord(word) {
  return word?.isShem === true;
}
