// Nusach here is a reasonable default, NOT a psak. Confirm wording with your rav
// before relying on it; both are configurable per plan §3 items 4-5.
// Per KhS 4:1 the declaration names what is being written: sefer torah /
// tefillin / mezuzah each get their own wording.

export const LISHMAH_NUSACH_BY_KIND = {
  mezuzah: "הריני כותב מזוזה זו לשם קדושת מזוזה",
  tefillin: "הריני כותב פרשיות אלו לשם קדושת תפילין",
  torah: "ספר זה אני כותב לשם קדושת ספר תורה",
};

export function lishmahNusach(kind) {
  return LISHMAH_NUSACH_BY_KIND[kind] ?? LISHMAH_NUSACH_BY_KIND.mezuzah;
}

export const SHEM_NUSACH = "הריני כותב לשם קדושת השם";

// Words accepted as a spoken match for a Shem, since the Shem itself is not
// pronounced as written (Keset HaSofer ch. 10).
export const SHEM_KINUI = ["השם", "hashem"];

export function isShemWord(word) {
  return word?.isShem === true;
}

// Certain-Shem detection: the Tetragrammaton, bare or behind prefix letters.
export const SHEM_RE = /^[ולבמכ]{0,2}יהוה$/;

// Doubtful-Name detection (שמות מסופקין): the אלהים family. Usually kodesh
// but sometimes chol - flagged for the sofer's attention, never gated.
export const SAFEK_RE = /^[ולבמכהש]{0,2}אלה(ים|יך|ינו|יכם|יהם|י)$/;
