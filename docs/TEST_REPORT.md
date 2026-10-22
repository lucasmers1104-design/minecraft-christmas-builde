# Testbericht

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

- **Registry** (`tests/unit/registry.test.ts`): 539 Blöcke; jeder Block existiert in den Versionen seines Profils mit exakt den Eigenschaften, Werten und Standardwerten aus `minecraft-data` (1.21.11 und 1.21.1); Stackgrößen; Umbenennung `iron_chain` ↔ `chain`; `checkBlockState` lehnt unbekannte Blöcke, Werte, fehlende und überzählige Eigenschaften, falsche Reihenfolge und Blöcke einer anderen Version ab.
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
- **Lauf mit einem echten Sprachmodell:** Ollama ist nicht installiert; es gibt keine echten Messwerte (Befehl in `docs/LOCAL_AI.md`).
- **WorldEdit-Varianten:** andere Versionen als 7.4.2, FastAsyncWorldEdit, DataFixer, gedrehtes Einfügen nicht getestet.
- **Browser:** nur Chromium; die E2E-Tests laufen mit Software-WebGL.
- **Registries des WorldEdit-Readers** sind selbst erzeugt (Vorbehalt in `docs/COMPATIBILITY.md`).

## In-Game-Abnahme (manuell auszufüllen)

| Datum | Minecraft | WorldEdit | Datei / Hash | Ergebnis | Screenshots / Log |
|---|---|---|---|---|---|
| – | – | – | – | ausstehend | – |
