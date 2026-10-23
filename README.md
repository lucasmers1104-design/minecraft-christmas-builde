# Minecraft Christmas Builder

Eine lokale Website für Minecraft-Bauwerke. Du beschreibst deine Idee, bekommst ein **echtes Minecraft-Java-Bauwerk** aus Blöcken, kannst es in 3D ansehen und bearbeiten und exportierst es als **`.schem`-Datei für WorldEdit**. Vorschau, Materialliste, Editor, Speichern und Export lesen dabei **dasselbe** Blockmodell.

Zielversion ist **Minecraft Java 1.21.11** (DataVersion 4671); 1.21.1 ist als zweites Profil wählbar. Echte Prüfergebnisse stehen in [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md).

## Was die App kann

- **Fünf Bauwerkstypen:** Haus, Weihnachtsbaum, Marktstand, Bahnhof und Turm (Rundturm mit Kegel, Kuppel oder Zinnen).
- **Acht Baustile als Daten:** Mittelalter, Fantasy/Märchen, Rustikal, Nordisch, Japanisch, Kirschblüte, Modern, Mediterran – mit 18 Paletten, Materialrollen (Wand, Rahmen, Dach, Sockel …), Proportionen, Dachvorlieben und Fenster- und Türvorlagen. Dazu das **Thema** unabhängig vom Stil: kein Thema, Winter oder Weihnachten.
- **Häuser mit echter Bautechnik:**
  - Sockel mit Treppenschürze, Rahmen und Ständer eine Ebene vor der Wand, Fachwerk mit Streben, Geschossbänder, Auskragung (Jetty) auf Konsolen – keine flache Wand breiter als 5 Blöcke.
  - Echte Geschosse mit Böden und Treppe oder Leiter; Innenräume bleiben frei.
  - Dächer aus Treppen und Stufen: Sattel, Walm, Krüppelwalm, Pyramide, Mansard, Gambrel, Saltbox, A-Frame, Flach, Pult, Pagode; Profile gerade, steil, flach, ausgestellt, Glocke, konvex; Überstand mit Untersicht, Kontrastkante, First-Varianten, Gauben, Kehlen bei Flügeln.
  - Fenster W01–W18 und Türen T01–T10 als Vorlagen (Simse, Läden, Blumenkästen, Bögen, Rundfenster, Shoji, Bandfenster, Bleiglas, Doppeltür, Portal …), Laternen an jedem Eingang.
  - Flügel (L/T/U), Zwerchgiebel, Anbau, eckiger oder runder Turm, Erker, Balkon, Veranda, Kamin mit Rauch.
- **Festschicht:** Weihnachtsbaum mit Etagen, Schmuck in Stilfarben und mitwachsendem Stern; Geschenkgruppen unter dem Baum oder neben dem Eingang; Girlanden mit Durchhang, Schleifen an Ankerpunkten und verstecktem Licht; Kränze als Ring; Kerzen je Fassade einheitlich; Laternen an Ketten. Jeder Stil hat ein eigenes Fest-Kit (z. B. Japanisch mit Kadomatsu statt Baum, Nordisch mit Julbock, Modern mit Lichtband). Schnee nur auf ausdrücklichen Wunsch, und nur dort, wo er im Spiel liegen bleibt; keine Eiszapfen.
- **Geformte Blöcke wie im Spiel:** Treppen, Stufen, Zäune, Mauern, Scheiben, Türen, Falltüren, Laternen, Ketten, Kerzen, Leitern … Ein Zustandsauflöser berechnet Treppenecken und Verbindungen so, wie Minecraft es beim Setzen täte; ein Validator verhindert Blöcke, die im Spiel abfallen würden.
- **Freitext auf Deutsch**, z. B. „mittelalterliches Fachwerkhaus mit zwei Geschossen, Erker und rundem Turm vorne links“:
  - Ein regelbasierter Parser erkennt Typ, Stil, Thema, Größe, Maße, Dach, Bauteile, Fenster- und Türformen, Materialien und Verneinungen und erklärt, was er verstanden hat.
  - Wünsche, die nicht gebaut werden (z. B. Pool, Möbel), erscheinen als „nicht umsetzbar“.
- **Einstellungen und Feinparameter:** Typ, Stil, Thema, Größe, Detailgrad, Seed, Minecraft-Version; dazu Maße, Geschosse, Dach, Form und Bauteile, Fenster- und Türform, Licht und Festschmuck, Palette und Material je Rolle. Manuelle Einstellungen haben Vorrang vor dem Text; Konflikte und angepasste Wünsche werden angezeigt.
- **Drei echte Varianten** pro Generierung, bei gleicher Eingabe bitgenau reproduzierbar.
- **Große Bauwerke** bis 192 × 384 × 192 Blöcke (volle Bauhöhe), komprimierter Transport, Vorschau in Chunks im Web Worker.
- **3D-Vorschau mit echten Minecraft-Texturen** aus deiner eigenen Installation (offizieller Launcher, CurseForge, Modrinth, Prism) oder nach Bestätigung der EULA direkt von Mojang; geformte Blöcke mit ihrer echten Geometrie. Ohne Texturen zeigt sie Farben. Details: [`docs/TEXTURES.md`](docs/TEXTURES.md).
- **Editor:** Blöcke in 3D setzen, entfernen, ersetzen, per Pipette aufnehmen; Blockzustände wählen; Material global austauschen; Rückgängig/Wiederholen. Nachbarn (Treppenecken, Zäune, Türhälften) passen sich wie im Spiel an.
- **Materialliste** mit Blöcken, Items und Stacks (Türen zählen einmal, doppelte Stufen zweimal, Kerzen je Kerze).
- **Projekte speichern** im Browser (IndexedDB): öffnen, umbenennen, duplizieren und löschen, inklusive Bearbeitungen; alte Projekte werden beim Laden übersetzt.
- **`.schem`-Export** (Sponge Schematic v3): Der Server prüft das Modell, schreibt die Datei und liest sie mit einem unabhängigen Leser zurück; erst dann startet der Download. Im Test liest der **echte EngineHub-WorldEdit-7.4.2-Reader** jeden Blockzustand und alle Bauwerke identisch.
- **Optionale lokale KI** über Ollama auf deinem PC, ohne Kosten und ohne Cloud: Die KI liefert nur einen geprüften Bauplan; alle Blöcke setzt immer der regelbasierte Generator.

**Noch offen:** Der Import in einer echten Minecraft-Welt ist **noch nicht verifiziert**, siehe unten.

## Schnellstart unter Windows

1. **Node.js 22 LTS** von <https://nodejs.org> installieren (Standardoptionen).
2. Den Projektordner herunterladen, z. B. per Git oder als ZIP von GitHub, und entpacken.
3. **`start-windows.cmd` doppelklicken.** Beim ersten Mal werden die Abhängigkeiten installiert und die App gebaut. Sobald die App antwortet, öffnet sich <http://localhost:3000> im Browser.
4. Zum Beenden das schwarze Fenster schließen. Bricht die App mit einem Fehler ab, bleibt das Fenster offen und zeigt die Meldung.

Optional für die lokale KI: [`docs/LOCAL_AI.md`](docs/LOCAL_AI.md), also Ollama installieren, ein Modell laden und `.env.local` anlegen.

## Starten (alle Systeme, Kommandozeile)

```sh
npm ci
npm run dev          # Entwicklung mit automatischem Neuladen: http://localhost:3000
```

Produktionsbetrieb (schneller):

```sh
npm run build
npm start            # http://localhost:3000
```

Voraussetzung: Node.js **≥ 22.12**.

## Bedienung in Kürze

1. **Beschreibung** eintippen oder ein Beispiel anklicken. Darunter erscheinen die erkannten Wünsche, eine kurze Erklärung und Wünsche, die nicht umsetzbar sind.
2. Bei Bedarf **Einstellungen** oder **Feinparameter** ändern und **„Bauwerk generieren“** klicken.
3. Eine **Variante** wählen. Im **Editor** einen Werkzeugmodus wählen (Setzen, Entfernen, Ersetzen, Pipette) und auf das Modell klicken; Ziehen dreht weiterhin die Ansicht.
4. **„.schem herunterladen“**, danach in Minecraft einfügen: [`docs/WORLD_EDIT_IMPORT.md`](docs/WORLD_EDIT_IMPORT.md).
5. **„Projekt speichern“**, um später weiterzuarbeiten (Menü „Projekte“ oben rechts).

## Tests

| Befehl | Inhalt |
|---|---|
| `npm run typecheck` | TypeScript (`strict`) |
| `npm run lint` | ESLint |
| `npm test` | Vitest: Generatoren, Parser, Registry, Editor, Export, Speichern, API, KI-Client (gegen simulierten Ollama-Server), WorldEdit-Reader (falls gebaut) |
| `npm run worldedit:build` | baut den WorldEdit-7.4.2-Reader (JDK 21, Maven, git, python3; unter Windows Git Bash oder WSL) |
| `npm run test:worldedit` | Exporte werden mit dem echten WorldEdit-Reader gelesen; schlägt fehl, wenn der Reader fehlt |
| `npm run test:e2e` | Playwright-Browsertests (Desktop und Handy); baut und startet die App selbst |
| `npm run check` | Typecheck, Lint, Tests und Build |
| `node scripts/screenshots.mjs <fälle.json>` | Screenshots der laufenden App mit echten Texturen (siehe Kopf des Skripts) |

Playwright ist auf 1.56.1 festgelegt. Beim ersten Mal muss der Browser installiert werden: `npx playwright install chromium`.

## Projektstruktur

```text
src/app/                 Seite und API: /api/generate, /api/export, /api/ai/*, /api/textures/*
src/components/builder/  Eingabe, Stil und Thema, Feinparameter, KI, Varianten, Material, Export, Projekte
src/components/editor/   Block-Auswahl, Editor-Panel
src/components/preview/  3D-Szene, Chunk-Meshing im Web Worker, Werkzeugleisten
src/core/blocks/         Registry, Formen (1/16-Boxen), Zustandsauflöser, Validator, Drehen/Spiegeln
src/core/style/          Materialien, Paletten, Stile, Lints, Verwitterung, Texturstatistik
src/core/generator/      Parser, Haus (Plan, Wände, Dächer, Öffnungen, Bauteile, Rundturm), Baum, Markt, Bahnhof, Turm, Landschaft, Festschicht
src/core/templates/      Fenster- und Türvorlagen als Daten, Balkon
src/core/geometry/       Kreise, Kugeln, Kegel, Bögen, Zinnen
src/core/analysis/       Materialliste, Bau-Lints
src/core/schema/         BuildSpec v2 (Zod), Migration, VoxelModel, Text/Einstellungs-Auflösung
src/core/editor/         Editier-Operationen und Verlauf
src/core/export/         VarInt, Sponge-v3-Writer, unabhängiger NBT-Leser, Validator
src/core/ai/             Bauplan-Schema, Prompt, Beispiele
src/lib/                 Ollama-Client, Transportformat, IndexedDB-Projekte, Texturen, API-Helfer
scripts/                 Screenshot-Skript (echte Texturen), WorldEdit-Testlauf
tests/                   unit, integration, e2e, fixtures, helpers, worldedit (Java-Reader)
docs/                    Architektur, Kompatibilität, Import, lokale KI, Texturen, Testbericht, Screenshots
```

## Grenzen

- Nur Minecraft **Java** und Vanilla-Blöcke; Block-Entities (Truhen-Inhalte, Schilder-Texte, Banner) werden nicht geschrieben.
- Maximales Volumen 192 × 384 × 192 Blöcke, 4096 verschiedene Blockzustände.
- Innenräume bleiben bewusst leer (keine Möbel).
- Die Vorschau zeigt Original-Texturen nur, wenn eine Minecraft-Installation gefunden oder ausgewählt wurde. Animationen, Licht und Schatten des Spiels gibt es in der Vorschau nicht.
- Projekte liegen nur in diesem Browser auf diesem Gerät.
- Die lokale KI kann nur kombinieren, was der Generator kennt. Ein Lauf mit einem echten Modell wurde hier nicht durchgeführt, weil Ollama nicht installiert ist (siehe `docs/LOCAL_AI.md`).

## Dokumentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): Datenfluss, Datenmodell, Generatoren, Editor, API-Verträge
- [`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md): Versionsprofile, Verifikation, Blockliste
- [`docs/WORLD_EDIT_IMPORT.md`](docs/WORLD_EDIT_IMPORT.md): Import in Minecraft
- [`docs/LOCAL_AI.md`](docs/LOCAL_AI.md): lokale KI mit Ollama einrichten (Windows)
- [`docs/TEXTURES.md`](docs/TEXTURES.md): echte Minecraft-Texturen in der Vorschau
- [`docs/AUFTRAG_PHASEN_1-8.md`](docs/AUFTRAG_PHASEN_1-8.md) und [`docs/PLAN_PHASEN_1-8.md`](docs/PLAN_PHASEN_1-8.md): Auftrag und Umsetzungsplan der Ausbaustufe (Phasen 1–8)
- [`docs/screenshots/`](docs/screenshots/): Bilder aller Stile und Bauwerkstypen mit echten Texturen
- [`reports/Minecraft Bautechniken für Generator.md`](<reports/Minecraft Bautechniken für Generator.md>): Recherche zu Minecraft-Bautechniken und Umsetzungsplan für den nächsten Generator (Quellennotizen in `research_notes/`)
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md): ausgeführte Prüfungen mit Ergebnissen
- [`tests/worldedit/README.md`](tests/worldedit/README.md): Aufbau des WorldEdit-Readers
