# Minecraft Christmas Builder

Eine lokale Website für Minecraft-Bauwerke. Du beschreibst deine Idee, bekommst ein **echtes Minecraft-Java-Bauwerk** aus Blöcken, kannst es in 3D ansehen und bearbeiten und exportierst es als **`.schem`-Datei für WorldEdit**. Vorschau, Materialliste, Editor, Speichern und Export lesen dabei **dasselbe** Blockmodell.

Zielversion ist **Minecraft Java 1.21.11** (DataVersion 4671); 1.21.1 ist als zweites Profil wählbar. Echte Prüfergebnisse stehen in [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md).

## Was die App kann

- **Vier Bauwerkstypen:**
  - **Haus:** Fundament, Wände, offener Eingang, Fenster, Satteldach, steiles Satteldach oder Walmdach, Schornstein, Deko, Baum und Geschenke innen.
  - **Bauteile für das Haus:** Turm, Anbau, Vordach und Hecke mit Weg.
  - **Weihnachtsbaum:** Schmuck, Lichterkette, Stern und Geschenke.
  - **Weihnachtsmarktstand:** 1–3 Buden mit Theke, Waren und Streifendach.
  - **Winterbahnhof:** Gleise mit echten Schienen, Bahnsteig, Überdachung und Bahnhofsgebäude.
- **Freitext auf Deutsch**, z. B. „großes Steinhaus mit Turm rechts, rotem Dach, ohne Schnee, 15 x 11“:
  - Ein regelbasierter Parser erkennt Typ, Stil, Größe, Material, Farben, Maße, Bauteile und Verneinungen.
  - Wünsche, die nicht gebaut werden (z. B. Pool, Treppen, Türblöcke), erscheinen **als Warnung**.
- **Einstellungen und Feinparameter:**
  - Grundeinstellungen: Stil, Größe, Material, Farbe, Detailgrad, Seed und Minecraft-Version.
  - Feinparameter: Breite, Tiefe, Wandhöhe, Dach, Fensterdichte, Bauteile, Material pro Bauteil, Balkenholz sowie Schalter für Schnee, Schornstein, Licht, Girlanden, Baum und Geschenke.
  - Manuelle Einstellungen haben Vorrang vor dem Text; Konflikte werden angezeigt.
- **Drei echte Varianten** pro Generierung, bei gleicher Eingabe bitgenau reproduzierbar.
- **3D-Vorschau** mit Drehen, Zoomen und Verschieben, Kamerabuttons und Ebenenschnitt. Verdeckte Flächen werden ausgeblendet, Glas ist transparent, Schienen sind flach.
- **Editor:**
  - Blöcke in 3D anklicken: setzen, entfernen, ersetzen oder per Pipette aufnehmen.
  - Block-Auswahl mit Suche und Blockzuständen (z. B. Ausrichtung).
  - Setzen über Koordinaten, Material global austauschen.
  - Rückgängig/Wiederholen (Strg+Z / Strg+Y).
- **Materialliste** mit Stack-Angaben, direkt aus den Blockdaten.
- **Projekte speichern** im Browser (IndexedDB): öffnen, umbenennen, duplizieren und löschen (mit Bestätigung), inklusive deiner Bearbeitungen. Beim Laden wird alles geprüft.
- **`.schem`-Export** (Sponge Schematic v3):
  - Der Server prüft das Modell, schreibt die Datei und liest sie mit einem unabhängigen Leser zurück; erst dann startet der Download.
  - Exportierte Dateien werden im Test vom **echten EngineHub-WorldEdit-7.4.2-Reader** Block für Block identisch gelesen.
- **Optionale lokale KI** über Ollama auf deinem PC, ohne Kosten und ohne Cloud:
  - Die KI plant nur; alle Blöcke setzt immer der regelbasierte Generator.
  - Ohne KI läuft alles regelbasiert, und das wird auch so angezeigt.

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

1. **Beschreibung** eintippen oder ein Beispiel anklicken. Darunter erscheinen die erkannten Wünsche und Warnungen.
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

Playwright ist auf 1.56.1 festgelegt. Beim ersten Mal muss der Browser installiert werden: `npx playwright install chromium`.

## Projektstruktur

```text
src/app/                 Seite und API: /api/generate, /api/export, /api/ai/status, /api/ai/plan
src/components/builder/  Eingabe, Einstellungen, Feinparameter, KI, Varianten, Material, Export, Projekte
src/components/editor/   Block-Auswahl, Editor-Panel
src/components/preview/  3D-Szene, Mesh mit Face-Culling, Werkzeugleisten
src/core/schema/         BuildSpec + Feinparameter (Zod), VoxelModel, Text/Einstellungs-Auflösung
src/core/blocks/         geprüfte Blockstate-Registry, Material- und Farbpaletten
src/core/generator/      Parser, Geometrie, Haus + Bauteile, Baum, Marktstand, Bahnhof
src/core/editor/         Editier-Operationen und Verlauf
src/core/export/         VarInt, Sponge-v3-Writer, unabhängiger NBT-Leser, Validator
src/core/ai/             KI-Bauplan-Schema und Prompt
src/lib/                 Ollama-Client, Transportformat, IndexedDB-Projekte, Hash, API-Helfer
tests/                   unit, integration, e2e, helpers, worldedit (Java-Reader-Harness)
docs/                    Architektur, Kompatibilität, Import, lokale KI, Testbericht
```

## Grenzen

- Nur Minecraft **Java**, Vanilla-Blöcke und volle Würfel. Einzige Ausnahme sind Schienen. Treppen, Stufen, Scheiben, Zäune, Türen und Schneeschichten fehlen bewusst. Der Eingang ist eine offene Öffnung.
- Maximales Volumen 48 × 32 × 48 Blöcke.
- Kein echtes Obergeschoss: „zweistöckig“ ergibt höhere Wände mit Hinweis.
- Die Vorschau ist eine vereinfachte Voxel-Darstellung ohne Original-Texturen.
- Projekte liegen nur in diesem Browser auf diesem Gerät; es gibt keine Cloud-Synchronisierung.
- Die lokale KI kann nur kombinieren, was der Generator kennt. Ein echter Lauf mit einem Modell wurde hier nicht getestet (siehe `docs/LOCAL_AI.md`).

## Dokumentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): Datenfluss, Datenmodell, Generatoren, Editor, API-Verträge
- [`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md): Versionsprofile, Verifikation, Blockliste
- [`docs/WORLD_EDIT_IMPORT.md`](docs/WORLD_EDIT_IMPORT.md): Import in Minecraft
- [`docs/LOCAL_AI.md`](docs/LOCAL_AI.md): lokale KI mit Ollama einrichten (Windows)
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md): ausgeführte Prüfungen mit Ergebnissen
- [`tests/worldedit/README.md`](tests/worldedit/README.md): Aufbau des WorldEdit-Readers
