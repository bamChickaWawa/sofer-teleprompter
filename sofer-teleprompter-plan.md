# Sofer Teleprompter — Project Plan (Final)

Real-time text display for sofrim writing tefillin / mezuzot / megillah. Phone/tablet v1 now, smart-glasses HUD later.

## 1. Core Concept

The app is a hands-free tikkun. It shows the sofer the exact word to write next, in large ktav-Ashuri text, and advances when the sofer **says the word aloud** — which is itself the halachic requirement (amirah before ktivah, Keset HaSofer 4:6). The mic listens; the eyes stay on the klaf; the hands stay on the kulmus.

## 2. Halachic Requirements → Features

| Halachic requirement | Feature |
|---|---|
| Say every word aloud before writing (KhS 4:6) | Voice-advance |
| Lishmah declaration before beginning (KhS 4) | Session-start declaration gate |
| Fresh sanctification for every Shem (KhS 10:1) | Shem declaration screen, unskippable |
| Exact text, no chaser/yeter | Verified digital tikkun, ktiv (no nikud) |
| Special letters: rabati/zeira/tagin | Inline flags + tagin overlay |
| Kesidran (tefillin/mezuzah) | Locked sequential mode; separate review mode |
| Petuchot/setumot | Section-break markers |

## 3. v1 Scope

1. **Text library**: 4 parshiyot of tefillin + mezuzah. JSON, per-word metadata: `{ text, isShem, specialLetters[], tagin[], lineBreakAfter, parshiaBreak }`.
2. **Display**: current word huge in a STAM font; previous 2 words dimmed, next 3 smaller (RTL). Line/column counter.
3. **Advance**: voice (Web Speech API `he-IL`, fuzzy match against the single expected word — consonant-skeleton compare) with tap/spacebar fallback.
4. **Shem flow**: next word is a Shem — screen state changes (gold border, dimmed), shows **"הריני כותב לשם קדושת השם"** (configurable nusach). Advance only by voice-match of the declaration or long-press "אמרתי" — a normal tap won't pass. Reminder: session kavana is NOT sufficient, each Shem needs its own (KhS 10:1). Matcher accepts kinnui ("Hashem") since the Shem isn't pronounced as written.
5. **Session-start lishmah gate** (KhS 4): writing mode locked until the opening declaration is confirmed.
6. **Resume**: session state persists; resume at the exact word.
7. **Settings**: font size, colors, advance sensitivity, tefillin shel yad/rosh vs mezuzah.
8. **Font toggle**: live switch — **Stam Ashkenaz CLM** (default), **Stam Sefarad CLM** (both Culmus, free), plain fallback (David/Frank Ruehl). CSS-variable swap; persisted. Custom SVG-glyph fonts pluggable (§3d).
9. **Halacha panel (מראה מקומות)**: side drawer, texts pulled **live from Sefaria API** (`GET https://www.sefaria.org/api/v3/texts/{ref}`), cached offline. Context-aware: Shem flow → KhS 10; correction mode → KhS 8–9, 11–12.

## 3b. Halachic Source Index (`halachot.json`)

Entries: `{ topic, ref, sefariaRef, summary }`; full text fetched on demand.

**Keset HaSofer — all 28 chapters (`Keset_HaSofer.N` on Sefaria):**
1. Who may write & deal in STa"M
2. Klaf — processing lishmah
3. Ink, sirtut, quill, right hand
4. 🔑 Lishmah; saying each word before writing (4:6) — voice-advance source
5. Letterforms & tagin
6. Tinok — determining letterform via a child
7. Ketivah tamah; spacing
8. Chok tochot
9. Kesidran (tefillin & mezuzah)
10. 🔑 Kedushat HaShem (18 se'ifim) — Shem-flow source
11. Mechikat HaShem prohibition
12. Fixing a damaged/wrong Shem
13. Sefer Torah — columns & lines
14. Sefer Torah — blank spaces
15. Petuchot, setumot, inverted nunim
16. Shirot layout
17. Sewing a Sefer Torah
18. Torn sheet
19. Not leaving a sefer unfixed
20. Writing tefillin
21. Batim
22. Inserting parshiyot; sewing batim
23. Straps
24. Checking tefillin; damage
25. Kedusha levels — no lowering
26. Rabbeinu Tam tefillin
27. Writing mezuzot
28. Writing & sewing Megillat Esther

**Shulchan Aruch:** OC 32 + Mishna Berura (master siman, tefillin writing); OC 36 + **Mishnat Sofrim** (letter-by-letter tzurat ha'otiyot — the practice-sheet reference); YD 270–284 (Sefer Torah; 274 = copy + amirah); YD 288 (mezuzah). **Also:** Rambam Hil. Tefillin 1:19; Masechet Sofrim.

*License:* Sefaria's English KhS translation (Jen Taylor Friedman) — display via API with its returned attribution/license; don't bundle. Hebrew original is public domain.

## 3c. Megillat Esther Module

One verified base text + swappable **layout files** (the sofer writes to a specific tikkun's line breaks).

| Layout | Lines/col | Notes |
|---|---|---|
| 28-line HaMelech | 28 | Most common; columns 2+ open with והיה |
| 21-line HaMelech | 21 | Popular Ashkenazi |
| 42-line | 42 | Sefer-Torah-like; Chabad standard |
| 11-line (Gra) | 11 | Bnei Haman fit naturally; not HaMelech |
| Pasuk-start | var. | Yemenite: each column begins a new pasuk |

**Data model:** `megillah-esther.json` + `layouts/esther-28-hamelech.json` etc. (columns → lines → word-index ranges). Display shows "line 14/28, column 7" + end-of-line/column spacing warnings.

**Special:** Aseret Bnei Haman (9:7–9) as the traditional two-column list, large/small letters flagged (large ו in ואת/חמש; small ת/ש/ן per minhag); Shem module auto-off (no Shem in Esther).

**Sources:** base text Sefaria `Esther.1–10`, verified against print. **Layout-editor mode**: open your printed tikkun, tap the last word of each line — full layout digitized in ~30 min, any tikkun you own, no copyright issues. Free refs: public-domain Tikkun Korim scan (Wikimedia Commons), Chabad.org Esther PDF, lashon.net tikkun generator.

## 3d. Custom Fonts from Photographs

**A — SVG glyph map (first):** photograph one clean sample per letterform (27 glyphs) → threshold → crop → `potrace` vectorize → SVG per glyph → app maps char→SVG on a shared baseline. Plugs into the font toggle. ~1 evening per ktav.
**B — real .woff2 (later):** same vectors assembled via FontForge Python scripting, proper RTL metrics.
**Photo specs:** straight-on, letter ≥200px tall, dark ink/light ground, even light (no shadow gradients).

## 3e. Feature Backlog (from all 28 KhS chapters)

**High (v1–v2):**
1. Session-start lishmah gate (ch. 4) — in v1 scope.
2. **Rashi ↔ Rabbeinu Tam toggle** (ch. 26) — flips parshiyot order (havayot in the middle).
3. **Tagin overlay** (ch. 5) — שעטנ"ז ג"ץ markers over the current word; Mishnat Sofrim letter popup.
4. **Tinok mode** (ch. 6) — display/photo the word, black out all but the questioned letter (digital "covering the neighbors"); log verdicts.
5. **Correction wizard** (ch. 8–9, 11–12) — decision tree: error type → location (kesidran constraints; megillah lenient) → repair path; chok-tochot warning always; Shem damage → hard stop-gate → ch. 11–12.
6. **Spacing warnings** (ch. 7) — end-of-line: word-space, letter-space, mukaf gevil.

**Medium (v2–v3):**
7. Materials checklist (ch. 2–3): klaf lishmah / sirtut / ink / kulmus.
8. Klaf & project tracker (ch. 2, 19) with "open defects" nag list.
9. Mezuzah 22-line layout module (ch. 27).
10. Tefillin completion checklists + periodic-check reminders (ch. 20–24).
11. Kedusha-level guard on repurposing materials (ch. 25).

**Sefer Torah (v3+, ch. 13–18):**
12. Yeriah calculator (ktav height → column width/lines/margins).
13. Petuchot/setumot navigator incl. inverted nunim (ch. 15).
14. Shirot brick layouts — Az Yashir / Ha'azinu (ch. 16).

## 3f. Post-Writing Photo Check (Hagahah Module)

Photograph the finished column; app checks vs expected text. **Framing: supplement only — final hagahah is human**; results screen must say so; uncertain letterforms route to Tinok mode, never auto-ruled.

**Tier 1 — geometry & counting (OpenCV.js, no ML):** perspective-correct → adaptive-threshold binarize (handles uneven light) → deskew via sirtut → line segmentation (horizontal projection) → word segmentation (gaps). Checks: **line count + words-per-line vs layout file** (one missing/extra word shifts all downstream counts — catches whole-word chaser/yeter with zero OCR); **negiot** via connected components (shared blob where letters shouldn't touch — zoomed-crop flag); broken-letter candidates (fragments ≪ median letter size).

**Tier 2 — letter counting:** segment letters per word (vertical projection); **letter count per word vs expected** — catches missing/extra letters. Side-by-side output: photo crop vs expected word rendered in STAM font.

**Tier 3 — STAM OCR (later):** 27-class CNN; bootstrap on augmented renders of free STAM fonts, fine-tune on your writing; catches ד/ר, ב/כ substitutions; TensorFlow.js in-browser.

**Capture screen:** straight-on, fill frame, even light, live alignment overlay.
**Reuse:** Tier 1 segmentation = the §3d glyph-extraction pipeline, and powers a **practice-sheet analyzer** (per-letter height/width/spacing variance stats on drill sheets).

## 4. Architecture

```
/sofer-teleprompter
├── index.html
├── src/
│   ├── main.js            # bootstrap, state machine
│   ├── texts/             # tefillin.json, mezuzah.json, megillah-esther.json
│   ├── layouts/           # esther-28-hamelech.json, esther-11-gra.json, mezuzah-22.json
│   ├── display.js         # word rendering, RTL, tagin overlay
│   ├── voice.js           # SpeechRecognition + fuzzy matcher + declaration phrases
│   ├── shem.js            # Shem detection + declaration flow
│   ├── halacha.js          # Sefaria API client + cache + context panel
│   ├── halachot.json      # curated ref index (§3b)
│   ├── layout-editor.js   # tap-to-digitize tikkun layouts
│   ├── scan/              # hagahah: OpenCV.js pipeline (tiers 1–2)
│   └── store.js           # position + settings persistence
├── styles.css
└── fonts/                 # Stam Ashkenaz CLM, Stam Sefarad CLM, custom SVG glyphs
```

**Stack:** vanilla JS (+ Vite optional). No backend v1. OpenCV.js lazy-loaded in scan mode only.
**State machine:** `IDLE → LISHMAH_GATE → LISTENING → MATCHED → (shem? WARN → DECLARE → CONFIRM) → ADVANCE → … → PARSHIA_DONE → NEXT/COMPLETE`, plus `REVIEW` and `SCAN` modes.

## 5. Hard Problems

1. Hebrew speech rec: compare consonant skeleton vs the single expected word (forgiving); tap fallback is halachically fine.
2. Shem pronunciation: matcher accepts configured kinnui.
3. **Verified text**: Sefaria/Mechon Mamre source → hand-verify vs printed tikkun; per-parshia word-count checksums. Non-negotiable.
4. Review-mode UX: grey overlay, "NOT WRITING" banner (kesidran safety).
5. Scan lighting: adaptive threshold + capture guidance; tiers flag candidates, human decides.

## 6. Glasses Path (v2+)

No open Meta Ray-Ban Display SDK yet. Options: wait for Meta; open platforms (Even Realities G1, Brilliant Labs Frame, Vuzix); interim audio prompts on regular Ray-Bans. Display keeps a "HUD profile" (single word, white-on-black, no chrome) so porting = render-target swap.

## 7. Build Order

1. Scaffold; Shema word-by-word, tap-advance. **→ demo in ~1 hr**
2. Culmus fonts + font toggle.
3. Word metadata + lishmah gate + Shem declaration flow.
4. Voice advance + declaration detection.
5. `halacha.js` (KhS 4 + 10 via Sefaria) + full `halachot.json`.
6. Full tefillin/mezuzah JSON, verified.
7. Layout-file format + layout-editor mode.
8. Settings, resume, review mode, R"T toggle.
9. Scan Tier 1 (counting + negiot).
10. Real writing test; tune at klaf distance.

## 8. Ask a Posek

- Screen as "mitoch haktav" for a Sefer Torah?
- Device near the table during kedushat Hashem?
- Tap-advance — hefsek concern vs voice?
- Computer checking = supplement only; confirm parameters with your rav.
