# Testbericht

## Ausbaustufe „Profi-Builds“ (Stand 2026-10-24, Arbeits-Laptop)

Auftrag: [`docs/AUFTRAG_PROFI_BUILDS.md`](AUFTRAG_PROFI_BUILDS.md), Phasen 1–7 auf Branch `feature/profi-builds` (nur lokal, Push erst nach Freigabe). Alle Zahlen stammen aus Befehlen auf dem **Arbeits-Laptop** (Windows 10 Home 10.0.19045, Intel i3, 8 GB RAM, Node.js 24.22.1, Microsoft Edge statt Playwright-Chromium).

| Befehl | Ergebnis |
|---|---|
| `npx tsc --noEmit` | ✅ keine Fehler |
| `npx eslint .` | ✅ 0 Fehler, 0 Warnungen |
| `npx vitest run` (ohne Minecraft-Datei) | ✅ 49 Dateien, **1056 Tests bestanden**, 44 übersprungen (WorldEdit-Reader, echte Client-Datei, Iso-Renderer und KI-Testset als Opt-in); Dauer 215 s |
| `npm run build` | ✅ Produktions-Build ohne Fehler und ohne Warnungen (Turbopack) |
| `PW_CHANNEL=msedge npx playwright test --trace=off` gegen den Produktions-Build (`next start`) | ✅ **28 von 28** (Desktop 27, Mobil 1), Dauer 11 min. Vorher: Mit Trace-Aufzeichnung (Standard `retain-on-failure`) liefen auf dem Laptop 10 Tests ins 15-s-Zeitlimit, weil die Bildschirmaufnahme Server und Software-WebGL die CPU nimmt; ohne Trace scheiterten nur noch 8 Maß-Erwartungen (Bauformen und Variantenauswahl ändern die Maße – aus den echten Werten übernommen). Ein weiterer Lauf hatte 4 Zeitüberschreitungen beim Warten auf Generieren + Rendern bzw. Texturaufbereitung, die einzeln grün waren; diese Wartezeiten sind jetzt 45 s statt 15 s. |

### Breitendurchlauf (temporärer Vitest-Lauf, nicht eingecheckt)

Jedes Bauwerk wurde vollständig erzeugt (inklusive Landschaft, Festschicht, Zustandsauflöser und Validator) und mit `lintHouse` (Häuser, Türme) geprüft:

| Umfang | Bauwerke | Reparaturen | Lint-Befunde | Fehler |
|---|---|---|---|---|
| Häuser: 8 Stile × 4 Größen × 3 Themen × 3 Detailgrade × Seeds 1–2 × Minecraft 1.21.11 und 1.21.1 | 1152 | 0 | 0 | 0 |
| Optionen: 10 Sätze (Schnee, Schnee + Fundament 2, Fundament 4, ohne Garten, keine/viele Laternen, viele Fenster + Balkon + Erker, ohne Kamin + Veranda, Rundturm, U-Flügel) × 8 Stile × klein/groß × ohne Thema/Weihnachten × Seeds 1–2 × beide Versionen | 1280 | 0 | 0 | 0 |
| Weitere Bauwerkstypen: Baum, Marktstand, Bahnhof, Turm × 8 Stile × 4 Größen × 3 Themen × mit/ohne Schnee × beide Versionen | 1280 | 0 | 0 | 0 |
| Alle 15 Bauformen × 8 Stile × 4 Größen × Seeds 1–3, ohne Thema und Weihnachten | 2880 | 0 | 0 | 0 |

Gefunden und behoben (je ein Regressionstest in `tests/unit/breadthRegression.test.ts`): ein Ersatzfenster überschrieb bei U-Flügeln die Hintertür; das Laibungsfutter eines Ersatzfensters überschrieb an einer Innenecke die Laterne eines tiefen Türportals; Türlaternen fanden neben tiefen Portalen keinen Platz.

**Kennzahlen** (1152 Häuser des ersten Laufs): mittlere Wertung **0,973** (niedrigste 0,823). Anteil im Zielbereich je Kennzahl: Hauptfassaden mit drei Tiefenebenen 0,90, Relief 0,82, Giebeltiefe 0,98, Massen 0,81, Traufhöhen 0,78, Firsthöhen 0,81, Akzente 0,97, Dachanteil 0,97, Hauptmaterial 1,00, Materialfamilien 0,93, Detaildichte 0,84, dichteste Fassade 0,76, Rückseite 0,92, Seiten 0,99, Traufecken mit Licht 0,97, Eingang und Fenster mit Licht 1,00. Generierungszeit je Bauwerk (ein Seed, ohne Variantenauswahl): Median 53 ms, p95 108 ms, höchstens 219 ms.

### Während der Stufe gefundene und behobene Fehler (Auswahl)

- Türen fehlten, wenn die Türachse auf ein einspaltiges Ständerfeld fiel (alter, unentdeckter Fehler): Ständer neben der Tür entfallen, Ersatztür, neuer Lint „eingang“.
- Außenkamin stand vor einem Fenster und mitten durch einen Balkon; bei vorkragendem Giebel stand er frei vor dem Erdgeschoss.
- Innentreppen an der Rückwand liefen durch das Türblatt der neuen Hintertür.
- Große Mini-Tannen schwebten (Stamm fehlte); Bordsteine im mittelalterlichen Stil hatten das Material des Weges; der Zaun der Vogelscheuche war in 1.21.1 ein Block, den es dort nicht gibt.
- Schneeboden aus Schneeblöcken widersprach der Entscheidung des Creative Directors: jetzt nur Schneeschichten.
- Die drei Funde des Breitendurchlaufs (siehe oben).

### Kennzahlen je Phase (8 Stile × klein/mittel/groß × Seeds 1–2)

| Stand | mittlere Wertung | 3 Tiefenebenen | Traufecken mit Licht | Rückseite | Massen | Firsthöhen |
|---|---|---|---|---|---|---|
| vor der Stufe (Phase 1) | 0,85 | 0,21 | 0,13 | 0,50 | 0,50 | 0,50 |
| Phase 2 (Bauformen) | 0,87 | – | – | – | 0,79 | 0,79 |
| Phase 3 (Tiefe, Dachkanten, Licht) | 0,97 | 0,92 | 0,94 | 0,50 | – | – |
| Phase 4 (Umgebung, Hintertür) | 0,98 | 0,92 | 0,94 | 0,96 | – | – |

Die Untergrenzen hält `tests/unit/buildQuality.test.ts` fest.

### Variantenauswahl: gemessene Zeit (Laptop, warmer Prozess)

| Größe | vorher: 3 Seeds | jetzt: neue Eingabe | jetzt: Seed + 1 / erneut |
|---|---|---|---|
| klein (16 Kandidaten) | 182 ms | 462 ms | 186 ms |
| mittel (16) | 218 ms | 613 ms | 245 ms |
| groß (12) | 295 ms | 657 ms | 325 ms |
| riesig (8) | 341 ms | 676 ms | 402 ms |

Eine neue Eingabe kostet auf dem Laptop 0,3–0,4 s mehr; Seed-Schritte und erneutes Generieren nutzen die zwischengespeicherten Bewertungen. Auf dem Haupt-PC **nicht gemessen**.

**Nicht geprüft (Stufe „Profi-Builds“):**

- **Echte Texturen:** Sichtprüfung nur mit dem Farb-Renderer (`tests/integration/renderIso.test.ts`); Screenshots mit echten Texturen (`scripts/screenshots.mjs`) auf dem Haupt-PC nachholen.
- **WorldEdit-Reader** (`npm run test:worldedit`) und **Einfügen in eine echte Welt** – inklusive Fundament-Offset `[0, −N, 0]`, Kerzen auf Falltüren, hohem Gras, Ranken, Hintertür.
- **Detail-Kits aus echtem WorldEdit-Export:** nur mit im Test geschriebenen Kits geprüft.
- **KI-Testset** mit echtem Modell (neues Planfeld `composition`).
- **Laufzeit auf dem Haupt-PC** (Variantenauswahl) und Playwright mit Trace-Aufzeichnung auf dem Haupt-PC.

**Galerie** vorher/nachher je Stil (Farb-Renderer): als private Artifact-Seite veröffentlicht, Link im Abschlussbericht an den Creative Director.

---

## Ausbaustufe „OpenRouter und neue Oberfläche“ (Stand 2026-10-23, Arbeits-Laptop)

KI-Planung über OpenRouter (Einstellungsdialog „KI einrichten“, Schlüssel nur lokal, Modellempfehlung), überarbeitete Oberfläche (`docs/UI_DESIGN.md`). Alle Ergebnisse stammen aus Befehlen auf dem **Arbeits-Laptop** (Windows 10 Home, Node.js 24.22.1, Microsoft Edge statt Playwright-Chromium), Branch `feature/openrouter-gui`.

| Befehl | Ergebnis |
|---|---|
| `npx tsc --noEmit` | ✅ keine Fehler |
| `npx eslint . --max-warnings=0` | ✅ 0 Fehler, 0 Warnungen |
| `npx vitest run` (ohne Minecraft-Datei) | ✅ 41 Dateien, **964 Tests bestanden**, 44 übersprungen (WorldEdit-Reader, echte Client-Datei, Opt-in-Werkzeuge, echter KI-Testset-Lauf); Dauer 184 s |
| `npm run build` | ✅ Produktions-Build ohne Fehler |
| `PW_CHANNEL=msedge npx playwright test --project=desktop-chromium` gegen `next dev --webpack` | ✅ **27 von 27** (`builder` 14, `editor` 4, `projects` 3, `ai` 5, `textures` 1) – über zwei Läufe: im ersten scheiterten 8 Tests an veralteten Maß-Erwartungen aus der Stufe „Bauqualität“ (größere Grundstücke, z. B. jetzt `33 × 15 × 29` statt `27 × 16 × 26`; in diesem Commit korrigiert) und `textures` an einem Zeitlimit; danach alle grün |
| `PW_CHANNEL=msedge npx playwright test --project=mobile-chromium` | ✅ 1 von 1, aber nur mit 60 s statt 15 s Wartezeit für Prüfungen (`ui-shots/pw-slow.config.ts`, nicht eingecheckt): mit 15 s lief die Erzeugung auf dem langsamen Laptop zweimal in das Zeitlimit, der Seitenzustand zeigte danach das fertige Bauwerk |

**Nicht geprüft:**

- ein Lauf gegen das **echte OpenRouter** (kein Schlüssel auf dem Laptop). Client, Status, Einstellungen und Routen sind nur gegen einen simulierten OpenRouter-Server getestet (`tests/integration/openRouter.test.ts`, `aiSettings.test.ts`). Die Live-Modellliste mit Preisen kam beim Test der Oberfläche tatsächlich von OpenRouter (öffentlich, ohne Schlüssel).
- das KI-Testset mit den empfohlenen Modellen (`MCB_AI_TESTSET=1`, siehe `docs/KI.md`) – die Empfehlung beruht auf Preisen und Benchmarks vom 23.10.2026, nicht auf eigenen Messungen.
- die Browsertests gegen den Produktions-Build (`npx playwright test` ohne laufenden Dev-Server), WorldEdit- und Jar-Tests, Import in eine echte Welt – auf dem Haupt-PC nachzuholen.

Sichtprüfung: Screenshots aller Bereiche (Desktop 1440 × 900, Mobil 412 × 915) mit `scripts/ui-shots.mjs`.

---

## Ausbaustufe „Bauqualität“ (Stand 2026-10-23, Arbeits-Laptop)

Grundlage: 20 Rechercheberichte in `research_notes/Bauqualitaet 2026-10/`. Alle Ergebnisse dieses Abschnitts stammen aus Befehlen, die auf dem **Arbeits-Laptop** ausgeführt wurden (Windows 10 Home 10.0.19045, Node.js 24.22.1, npm 11.19.1, TypeScript 6.0.2), Branch `feature/bauqualitaet`.

| Befehl | Ergebnis |
|---|---|
| `npx tsc --noEmit` | ✅ keine Fehler |
| `npx eslint .` | ✅ 0 Fehler, 0 Warnungen |
| `npx vitest run` (ohne Minecraft-Datei) | ✅ 38 Dateien, **924 Tests bestanden**, 44 übersprungen (WorldEdit-Reader und echte Client-Datei fehlen auf diesem Rechner, dazu die Opt-in-Werkzeuge); Dauer 185 s |
| `npm run build` | ✅ Produktions-Build ohne Fehler |
| Breitendurchlauf (temporärer Vitest-Lauf, nicht eingecheckt) | ✅ **2920 Kombinationen, 0 Befunde**: Haus in allen 8 Stilen × 4 Größen × 3 Themen × 3 Detailgraden × 6 Seeds; Turm, Bahnhof, Marktstand und Baum je Stil, Größe, Thema und Detailgrad; je Stil Haus, Bahnhof, Turm und Markt in 1.21.1; je Stil Winter mit Schnee. Geprüft: null Validator-Reparaturen, Häuser ohne Befund der Bau-Lints. Zwei Befunde eines ersten Durchlaufs (Traufgesims im Türfreiraum, Trampelpfad unter Deko) sind behoben und als Regressionstests eingecheckt. |

**Nicht ausgeführt auf diesem Rechner** (auf dem Haupt-PC nachzuholen, dort ist alles eingerichtet):

- `npm run test:worldedit` (echter WorldEdit-7.4.2-Reader; Java und Maven fehlen hier),
- `MCB_MINECRAFT_JAR=<1.21.11-Client-Datei> npx vitest run` (Tests gegen die echte Client-Datei, u. a. Formen und Texturen der neuen Blöcke Kies und Podsol),
- `npx playwright test` (Browser- und Mobiltests),
- `node scripts/screenshots.mjs docs/screenshots/faelle.json` (Screenshots mit echten Texturen; die Bilder in `docs/screenshots/` zeigen noch den Stand vor dieser Ausbaustufe),
- ein Import in eine echte Minecraft-Welt.

Sichtprüfungen dieser Stufe liefen nur mit dem Iso-Renderer (`tests/integration/renderIso.test.ts`, Farben statt Texturen).

---

## Ausbaustufe Phasen 1–8

**Stand:** 2026-10-22, Ausbaustufe Phasen 1–8. Alle Ergebnisse unten stammen aus tatsächlich ausgeführten Befehlen **auf dem Windows-PC des Nutzers** (keine Simulation). Frühere Stände (Linux-Container) sind in der Git-Historie dieses Dokuments nachlesbar.

## Umgebung

| Komponente | Version |
|---|---|
| Rechner | Windows 11 Pro 10.0.26200, AMD Ryzen 5 5600X, 16 GB RAM, AMD Radeon RX 6600 |
| Node.js / npm | 24.20.0 / 11.19.0 |
| Next.js / React | 16.4.2 / 19.3.1 |
| TypeScript | 6.0.2 (`strict: true`, `noUncheckedIndexedAccess`) |
| ESLint | 9.39.5 mit `eslint-config-next` 16.4.2 |
| Vitest | 5.0.5 (IndexedDB-Tests mit `fake-indexeddb` 6.2.6) |
| Playwright / Chromium | 1.56.1 (headless, SwiftShader-WebGL) |
| three / @react-three/fiber / drei | 0.186.1 / 9.8.2 / 10.7.9 |
| prismarine-nbt / zod / dexie / minecraft-data | 2.8.0 / 4.6.7 / 4.4.6 / 3.117.0 |
| Java / Maven / Python (WorldEdit-Reader, Werkzeuge) | OpenJDK 21.0.12.1 / 3.9.11 / 3.12.10 |
| WorldEdit (Reader) | EngineHub **7.4.2** @ `eb8e82c3d8843bed3f71e82ea974122415645178`, aus Quellcode gebaut (Git Bash, Maven) |
| Minecraft-Client-Datei | 1.21.11 aus der Modrinth-App (`1.21.11-0.19.3.jar`), nur zur Laufzeit gelesen, nicht im Repo |
| Ollama | **nicht installiert** |

## Ausgeführte Befehle und Ergebnisse

Abschlusslauf am 2026-10-22 auf diesem PC, nacheinander auf demselben Stand (dem Stand des Phase-8-Commits):

| Befehl | Ergebnis |
|---|---|
| `npm run typecheck` | ✅ keine Fehler |
| `npm run lint` | ✅ 0 Fehler, 0 Warnungen |
| `MCB_MINECRAFT_JAR=<1.21.11-Client-Datei> npx vitest run` (= `npm test` mit echter Client-Datei) | ✅ 30 Dateien, **620 Tests bestanden**, 4 übersprungen (die vier Opt-in-Werkzeuge: echte KI-Messung, Großmessung, Iso-Renderer, Texturstatistik-Erzeugung); Dauer 59 s |
| `npm run test:worldedit` | ✅ **36/36 bestanden** (echter WorldEdit-7.4.2-Reader, Pflichtmodus); Dauer 54 s |
| `npx playwright test` (baut die App mit `npm run build` und startet sie) | ✅ **26/26 bestanden** (25 Desktop, 1 Mobil/Pixel 7), Laufzeit 4,7 min |
| `npm audit --omit=dev` | ✅ 0 Schwachstellen in Laufzeitabhängigkeiten |

`npm audit` über alle Abhängigkeiten meldet weiterhin 5 „high“-Funde, ausschließlich in der Dev-Toolchain (`eslint-config-next` → … → `braces`); der angebotene Fix wäre ein Downgrade, das nicht zu Next 16 passt.

Commits nur nach grünem Lauf: Phase 1 (`9af27ba`), Phasen 2–7 (`b494355`, nach typecheck, lint, 620 Vitest-Tests, 36 WorldEdit-Tests und 26 E2E-Tests) und Phase 8 (dieser Lauf).

## Testinhalte

### Blöcke: Registry, Formen, Auflöser, Validator

- **Registry** (`tests/unit/registry.test.ts`): 541 Blöcke; jeder Block existiert in den Versionen seines Profils mit exakt den Eigenschaften, Werten und Standardwerten aus `minecraft-data` (1.21.11 und 1.21.1); Stackgrößen; Umbenennung `iron_chain` ↔ `chain`; `checkBlockState` lehnt unbekannte Blöcke, Werte, fehlende und überzählige Eigenschaften, falsche Reihenfolge und Blöcke einer anderen Version ab.
- **Formen gegen die echte Client-Datei** (`tests/integration/vanillaShapes.test.ts`): Die Flächenabdeckung jeder Formklasse (Treppen in allen Formen, Stufen, Zäune, Mauern, Scheiben, Türen, Falltüren, Laternen, Kerzen, Endstab, Blitzableiter …) stimmt mit den gebackenen Original-Modellen überein; Leiter-Ausrichtung geprüft.
- **Zustandsauflöser** (`tests/unit/stateResolver.test.ts`): Treppenformen (gerade, innen, außen, links/rechts), Zaun-, Scheiben- und Gitterverbindungen inkl. Ausnahmen, Mauerseiten und -pfosten, obere Türhälfte, Zauntor in Mauer, `snowy`, Laubdistanzen; ein zweiter Lauf ändert nichts.
- **Validator**: Laterne, Kerze, Tür, Teppich, Pflanze, Schiene, Knopf, Leiter ohne Halt; Schnee auf ungeeignetem Grund und neben Licht; Golem-Muster; `dirt_path` unter festen Blöcken – jeweils repariert und protokolliert.

### Stile, Paletten, Lints (`tests/unit/styles.test.ts`)

- Jede Palette besteht die Lints (Helligkeitsabstand Wand/Rahmen, Dach ≠ Wand, 3–5 Familien, Dach mit Treppen, verbotene Namensteile je Stil); jede Rolle hat gültige Materialien mit den nötigen Formen.

### Dach-Engine (`tests/unit/roofEngine.test.ts`)

- Profile haben die dokumentierte Form und gerade Treppenoberkanten; Walm- und L-Dächer mit Außen- und Innenecken; Kehlen; Anstieg ≤ 7 Blöcke auch bei breiten Häusern (`planRoofs` kennt die Höhe vorab); das Glockenprofil bleibt geschwungen (unten Stufen, oben Block + Treppe).

### Fassadenvorlagen (`tests/unit/templates.test.ts`)

- Katalog W01–W18, T01–T10 mit Varianten: jede Vorlage im Spiel gültig – alle Paletten × 4 Richtungen × gespiegelt × 1.21.11/1.21.1, ohne Validator-Reparatur; Stilzuordnung passt zu `styles.ts`; Bögen von W07b, W17b und T04 entsprechen der Bogen-Bibliothek.

### Geometrie (`tests/unit/geometry.test.ts`, `geometryLibrary.test.ts`)

- Kreis D5 = 12/16/21, D15 = 40/56/177, Kugel D15 hohl = 530, Kegel D15/H15 massiv = 919; Bögen, Zinnen-Symmetrie (D 7, 9, 15, 17, 21, 23), Rotationskörper, Zwiebelprofil.

### Generatoren (`tests/unit/generator.test.ts`, `buildingTypes.test.ts`, `wishesEndToEnd.test.ts`)

- **Häuser:** alle 8 Stile × klein/mittel/groß × ohne Thema/Weihnachten × Seed 1 und 2 (96 Häuser): alle Blockzustände gültig in 1.21.11, **null Validator-Reparaturen**, **kein Befund der Bau-Lints** (nichts schwebt, Auflöser-Fixpunkt, keine flache Wand > 5, Überstand ≥ 1, Anstieg ≤ 7 + First, Dach ohne Lücken, Türen vollständig und frei, Laterne am Eingang). Dazu riesige Häuser und 6 Geschosse.
- **Feinparameter:** 23 Optionen (Maße, Geschosse, Dachformen, Überstand, Gauben, Flügel, Anbau, eckiger und runder Turm, verwinkelt, Veranda, Kamin, Laternen, Seelenlaternen, Garten, Palette, Material, Fenster- und Türfamilie) verändern das Modell und bleiben lint-sauber; Dachprofile wirken, Dachformen mit festem Querschnitt melden das; Erker und Balkon in allen Stilen; v1-Specs werden in gültige v2-Specs übersetzt.
- **Echte Geschosse:** jedes Geschoss hat einen Boden (> 60 % der Fläche), Treppe oder Leiter verbindet sie; Jetty im Mittelalter.
- **Thema:** Weihnachten mit Girlanden aus persistentem Laub, Lichtern, Schleifen und Laternen an Ketten; Winter ohne Schleifen, aber mit Laternen; **kein Schnee und keine Eiszapfen ohne Wunsch**; mit Wunsch Bodenfläche und Schneeschichten in allen Stilen und Typen ohne Reparatur; Profil 1.21.1 nutzt `chain`.
- **Weitere Typen:** Baum, Marktstand, Bahnhof, Turm in klein/mittel/groß und mit/ohne Thema ohne Reparatur, nichts schwebt, Fixpunkt; Turm in allen Stilen und vier Größen lint-sauber mit Tür und Laterne; Rundturm-Ring = dicker Kreis der Bibliothek, Zinnen nur bei symmetrischem D, Böden und Leiter; Haus mit Rundturm in allen Stilen; belegte Ecke wird mit Hinweis gewechselt.
- **Determinismus:** gleiche Eingabe → bitgleiche Daten; drei Seeds → drei verschiedene Varianten; jeder Stil hat andere Hauptmaterialien.
- **Wunsch → Bauwerk:** alle 77 Wünsche des Testsets werden geparst, erzeugt und bestehen Gültigkeit, Reparatur- und Lint-Prüfung; jede erkannte Einstellung ändert das Modell oder liefert einen Hinweis, warum nicht.
- **Leistung:** ein großes Haus entsteht in < 2 s.

### Parser, Bauplan, lokale KI

- **Parser** (`tests/unit/parseDescription.test.ts`): Typen, Stile, Thema, Dach, Bauteile, Turmposition, Maße, Geschosse, Verneinungen über Aufzählungen, Fehlalarme („Schornstein“, „Schneesturm“, „türkis“, „Haustür“, „Kirschbaum“ …), nicht umsetzbare Wünsche, Erklärung.
- **Testset** (`tests/unit/planTestset.test.ts`): **77/77 Wünsche** vom Parser vollständig richtig; die 26 Few-Shot-Beispiele stimmen mit dem Parser überein und sind vom Testset getrennt; Parser → Plan → Patch ohne Verlust.
- **Ollama-Client** (`tests/integration/ai.test.ts`, gegen einen simulierten Ollama-Server): gültiger Plan, Korrekturrunde, Unsinn, Zeitüberschreitung, fehlendes Modell, nicht erreichbar, Modell ohne „think“, Antwort im `thinking`-Feld, beide API-Routen. **Ein echtes Sprachmodell lief nicht** (Ollama nicht installiert); der Messlauf `tests/integration/ollamaTestset.test.ts` lief nur als Trockenlauf.

### Editor, Projekte, Transport, Export, API

- **Editor:** Setzen, Entfernen, Ersetzen, Füllen ergeben valide, neu gehashte Modelle; Rückgängig stellt den Hash exakt her; Nachbartreppe wird zur Ecke, Türhälften, Zaunverbindungen, schwebende Laterne wird gemeldet.
- **Projekte:** Speichern → Laden identisch inkl. Bearbeitungen; Upgrade der Datenbank v1 → v2 und Migration alter Specs; beschädigte Daten werden verständlich abgelehnt.
- **Transport:** RLE und u16le verlustfrei, Manipulationen werden abgelehnt.
- **Export:** Sponge-v3-Layout (zweiter Leser `prismarine-nbt`), Roundtrip jedes Blocks, Mehrbyte-VarInts, Negativfälle (Hash, Block, Eigenschaft, Größe, Version), Abweichungen vom erwarteten Modell (Block und Maße).
- **API:** `/api/generate` (200, 400, 413, 422), `/api/export` (200, 400, 413).

### Echter WorldEdit-Reader (`tests/integration/worldedit.test.ts`)

Jede `.schem` wird mit `SpongeSchematicV3Reader` von EngineHub WorldEdit 7.4.2 gelesen; erwartet: Format, DataVersion, keine Warnungen (`--require-canonical`), gleiche Maße und **jeder Block identisch**.

- Drei Standardvarianten; **alle 8 Stile** weihnachtlich (mittel) und ohne Thema (groß); Profil 1.21.1; verwinkeltes Haus mit Turm, Anbau, Veranda, Gauben, Walmdach; Winter mit Seelenlaternen; großer Baum, großer Marktstand, große und kleine Bahnhöfe (1.21.11/1.21.1); Turm (Fantasy, groß), Turm mit Zinnen; Haus mit Rundturm, Erker, Balkon und Bogenfenstern; Schneeschichten auf Wunsch; Feinparameter mit Ziegel und Kupferdach.
- Ein im Editor bearbeitetes Modell; Palette > 127 Einträge.
- **Jeder Blockzustand der Registry**: 18 128 Zustände in 1.21.11 und 17 350 in 1.21.1, in Stücken zu höchstens 4096.
- Große Modelle (siehe Messung) und eine Gegenprobe mit ungültigem Zustand (exit 2).

### Messung großer Bauwerke (Querschnitt A)

`MCB_MEASURE=1 MCB_MEASURE_SIZES=128x384x128,192x384x192 npx vitest run tests/integration/largeModels.test.ts -t misst` am 22.10.2026 auf diesem PC (Node 24.20.0, win32/x64). Testmodell: 23 % nicht Luft, Palette 150.

| Schritt | 128 × 384 × 128 (6,3 Mio. Blöcke) | 192 × 384 × 192 (14,2 Mio. Blöcke) |
|---|---|---|
| Modell erzeugen (kanonisieren, Registry, Hash, Prüfung) | 102 ms | 210 ms |
| SHA-256 über die Indizes | 63 ms (12 MiB) | 148 ms (27 MiB) |
| Transport alt (`u16le-base64`) | 16,0 MiB JSON | 36,0 MiB JSON |
| Transport neu (`rle-varint-base64`) | **1,23 MiB** JSON, dekodieren + prüfen 95 ms | **2,68 MiB** JSON, dekodieren + prüfen 194 ms |
| Export `.schem` (schreiben + Selbstprüfung) | 667 ms → 139 KiB | 1 550 ms → 303 KiB |
| Unabhängiger Validator (Block für Block + Hash) | 152 ms | 359 ms |
| **WorldEdit-7.4.2-Reader** (JVM-Start, Lesen, Ausgabe) | 1,9 s, **Block für Block identisch** | 2,8 s, **Block für Block identisch** |

Nicht gemessen: Meshing und Darstellung so großer Modelle im Browser auf einer echten Grafikkarte (die E2E-Tests laufen mit Software-WebGL und normalen Bauwerken).

### Echte Minecraft-Texturen

- Unit- und Integrationstests wie bisher (ZIP-Leser, Modell-Backen, UV, `uvlock`, Ausblendung, Launcher-Suche inkl. Modrinth-Dateinamen, Datei-Übernahme, Mojang-Download nur mit Zustimmung).
- Mit der echten 1.21.11-Client-Datei dieses PCs wurden alle Registry-Zustände aus den Original-Modellen gebacken (keine fehlenden Modelle oder Texturen) und die Texturstatistik (`textureStats.ts`, abgeleitete Zahlen) erzeugt.

### UI (Playwright, `tests/e2e`, 26 Tests)

1. Durchlauf Haus: Text → 3D (Szene zeigt nachweislich das gewählte Modell) → Materialliste (Zeilensumme = Item-Summe) → echter `.schem`-Download, vom Validator geprüft.
2. Varianten, Größe, Tastatur, Serverfehler.
3. Freitext: erkannte Wünsche, Erklärung, nicht umsetzbare Wünsche, Vorrang manueller Einstellungen, Feinparameter (Breite, Dachmaterial).
4. Alle fünf Bauwerkstypen generieren, ansehen, exportieren; Bauteile nur beim Haus.
5. Editor (Klick, Setzen, Pipette, Koordinaten, Material austauschen, Ebenenansicht, Speichern bearbeiteter Modelle).
6. Projekte (Speichern → Reload → Öffnen, Umbenennen, Duplizieren, Löschen, ungespeicherte Änderungen).
7. Lokale KI mit simulierten Endpunkten (gekennzeichnet, Plan angewendet, Rückfall).
8. Echte Texturen (Datei auswählen, texturierte Vorschau, umschaltbar).
9. Mobil (Pixel 7): Tabs, Szene ≥ 300 × 300, kein Überlauf, Export.

### Sichtprüfung

Screenshots mit echten Texturen (`docs/screenshots/`, erzeugt mit `scripts/screenshots.mjs` gegen die laufende App) und isometrische Prüfbilder (`MCB_RENDER=1 npx vitest run tests/integration/renderIso.test.ts`) aller Stile, Größen und Typen; nach jeder Runde nachgebessert (Details im Abschlussbericht).

## Während der Entwicklung gefundene und behobene Fehler (Auswahl, Phasen 1–8)

- Standard-Ausrichtung des Fasses war `up` statt `north`; Endstab und Blitzableiter waren gekippt modelliert (Vergleich mit den Originalmodellen).
- Türen wurden nicht gesetzt (Stufe über dem Sockel abgelehnt), Fenster lagen in der Türspalte, Streben blockierten Fenster – Reihenfolge und Prüfungen korrigiert.
- `dirt_path` lag unter festen Blöcken (wäre im Spiel zu Erde geworden).
- Leiter im Turm hing vor einem Fenster (Validator entfernte sie) – Leiter sucht jetzt eine volle Wand.
- Marktmarkise bestand nur aus Stufen statt aus Treppen.
- Glockenprofil überschritt den Anstieg ab Wandoberkante; die Begrenzung flachte es zur Gerade ab – jetzt bleibt die Krümmung.
- Girlanden hingen in die Türfreiheit.
- Gebäudetitel ignorierte das Thema.
- Bahnhof wuchs nicht mit der Größe.
- Fenster-/Türfamilie, Erker und Balkon standen im Schema, wirkten aber nicht – jetzt umgesetzt bzw. mit Hinweis, wenn sie nicht passen.
- **Sichtprüfung mit echten Texturen:** Das Pultdach des Anbaus stieg am Giebel über den Ortgang und schnitt durchs Hauptdach (jetzt Pultdach nur unter ausreichend hoher Traufe, sonst eigener niedrigerer Giebel); Walmdächer auf fast quadratischem Grundriss wirkten wie Stufenpyramiden (Japanisch/Kirschblüte jetzt breiter als tief mit Krüppelwalm, Bahnhofsflügel mit Giebeln); Kamine neben Walmdächern standen wie freie Säulen (jetzt durch die Dachfläche); moderne Häuser mit Steildach hatten keinen Überstand; die Bahnhofsuhr war nicht als Uhr lesbar.

## Nicht getestet bzw. offen

- **In-Game-Import noch nicht verifiziert.** Auf diesem PC lief keine Minecraft-Welt mit WorldEdit; Schritte und Checkliste stehen in `docs/WORLD_EDIT_IMPORT.md`. Das Release-Gate „In Minecraft mit WorldEdit getestet“ ist **nicht erfüllt**.
- **Lauf mit einem echten Sprachmodell:** Ollama ist nicht installiert, und die OpenRouter-Anbindung ist nur gegen einen simulierten Server getestet (kein Schlüssel auf dem Arbeitsrechner); es gibt keine echten Messwerte (Befehle in `docs/KI.md`).
- **WorldEdit-Varianten:** andere Versionen als 7.4.2, FastAsyncWorldEdit, DataFixer, gedrehtes Einfügen nicht getestet.
- **Browser:** nur Chromium; die E2E-Tests laufen mit Software-WebGL.
- **Registries des WorldEdit-Readers** sind selbst erzeugt (Vorbehalt in `docs/COMPATIBILITY.md`).

## In-Game-Abnahme (manuell auszufüllen)

| Datum | Minecraft | WorldEdit | Datei / Hash | Ergebnis | Screenshots / Log |
|---|---|---|---|---|---|
| – | – | – | – | ausstehend | – |
