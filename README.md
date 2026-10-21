# Minecraft Christmas Builder

Webanwendung, die aus einer Beschreibung und Einstellungen ein **echtes Minecraft-Java-Bauwerk** erzeugt: Die Blockdaten werden regelbasiert generiert, als drehbare 3D-Vorschau angezeigt, als Materialliste gezählt und als **Sponge-Schematic-v3-Datei (`.schem`)** für WorldEdit exportiert. Vorschau, Materialliste und Export lesen dabei **dasselbe** kanonische Voxelmodell.

**Stand: Phase 0 (Fundament) und Phase 1 (Vertical Slice) abgeschlossen.** Details und echte Testergebnisse: [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md).

## Was funktioniert (implementiert und getestet)

- Begehbares Weihnachtshaus mit Fundament, vier Wänden mit Eckpfosten, offenem 2 Blöcke hohem Eingang, Glasfenstern, geschlossenem Satteldach mit Schnee, Schornstein am First, Girlanden, Kranz, Leuchtstein-Licht, Weihnachtsbaum und Geschenken.
- Einstellungen Größe (klein/mittel/groß), Stil (weihnachtlich/märchenhaft/realistisch), Material (Fichte/Eiche/Stein), Farbthema (Rot-Grün/Eisblau/Natur), Detailgrad (1–3) und Seed. Jede Einstellung ändert die Blockdaten nachweisbar (Unit- und E2E-Tests).
- Drei echte Varianten pro Generierung (Seed, Seed+1, Seed+2), reproduzierbar bis auf das Bit genau.
- 3D-Vorschau (Three.js / React Three Fiber) mit Drehen, Zoomen, Verschieben, „Ansicht zurücksetzen“ und Raster. Verdeckte Flächen werden ausgeblendet, Glas wird gesondert transparent dargestellt.
- Materialliste direkt aus den Blockdaten, ohne Luft, mit 64er-Stacks.
- `.schem`-Export im Sponge-v3-Format (DataVersion 3955). Ablauf: Prüfung auf dem Server, dann Schreiben, dann Gegenlesen mit einem unabhängigen NBT-Leser, erst danach der Download.
- Exportierte Dateien werden in einem automatisierten Test vom **echten EngineHub-WorldEdit-7.3.8-Reader** Block für Block identisch gelesen.

**Noch nicht umgesetzt:**

- Der Freitext wird noch nicht ausgewertet (Phase 2). Die Oberfläche weist darauf hin.
- Projekte lassen sich noch nicht speichern (Phase 3). Der Button dafür ist deaktiviert.
- Weitere Bauwerkstypen fehlen noch (Phase 4). Sie sind in der Oberfläche als „noch nicht verfügbar“ markiert.
- **Der In-Game-Import ist noch nicht verifiziert**, siehe unten.

## Voraussetzungen

- Node.js **≥ 22.12** (getestet mit 22.22.0) und npm
- Nur für den WorldEdit-Reader-Test: JDK 21, Maven 3.9, git, python3

## Starten

```sh
npm ci
npm run dev          # Entwicklung: http://localhost:3000
```

Produktionsbuild:

```sh
npm run build
npm start            # http://localhost:3000
```

Es sind keine Umgebungsvariablen nötig (siehe [`.env.example`](.env.example)). Die Anwendung braucht weder Login noch Datenbank noch KI.

## Bedienung

1. Links die Einstellungen wählen und auf **„Bauwerk generieren“** klicken.
2. In der Mitte das Modell drehen (ziehen), zoomen (Mausrad oder Pinch) und verschieben (Rechtsklick oder zwei Finger).
3. Rechts eine Variante wählen, die Materialliste prüfen und **„.schem herunterladen“** klicken.
4. Import in Minecraft: siehe [`docs/WORLD_EDIT_IMPORT.md`](docs/WORLD_EDIT_IMPORT.md).

## Tests

| Befehl | Inhalt |
|---|---|
| `npm run typecheck` | TypeScript (`strict`) |
| `npm run lint` | ESLint (Next.js Core Web Vitals + TypeScript) |
| `npm test` | Vitest: Unit- und Integrationstests (Generator, Registry gegen `minecraft-data`, VarInt, NBT/Sponge v3, Roundtrip, API) |
| `npm run worldedit:build` | baut den WorldEdit-Reader (`tests/worldedit/target/schem-reader.jar`) |
| `npm run test:worldedit` | öffnet exportierte Dateien mit dem echten WorldEdit-7.3.8-Reader; schlägt fehl, wenn der Reader nicht gebaut ist |
| `npm run test:e2e` | Playwright (Desktop + Mobil); baut und startet die App selbst |
| `npm run check` | Typecheck, Lint, Tests, Build |

Ohne gebauten Reader überspringt `npm test` die WorldEdit-Suite. `npm run test:worldedit` erzwingt sie.

Playwright ist auf Version 1.56.1 festgelegt. Wird der Browser lokal noch nicht gefunden: `npx playwright install chromium`.

## Projektstruktur

```text
src/app/                 Next.js App Router: Seite, /api/generate, /api/export
src/components/builder/  Panels (Eingabe, Einstellungen, Varianten, Materialliste, Export)
src/components/preview/  3D-Szene, Mesh-Erzeugung mit Face-Culling, Toolbar
src/core/schema/         BuildSpec (Zod), VoxelModel, Limits, Hash
src/core/blocks/         geprüfte Blockstate-Registry, Material-/Farbpaletten
src/core/generator/      Geometrie-Helfer, Haus-Generator, Dekoration, Seeded RNG
src/core/analysis/       Materialzählung
src/core/export/         VarInt, Sponge-v3-Writer, unabhängiger NBT-Leser, Validator
src/lib/                 Transportformat, Hash (SHA-256), API-Helfer
tests/unit|integration|e2e|worldedit   Tests, WorldEdit-Reader-Harness (Java)
docs/                    Architektur, Kompatibilität, Import-Anleitung, Testbericht
```

## Grenzen

- Nur Minecraft Java 1.21.1 (DataVersion 3955), nur Vanilla-Blöcke und nur volle Würfel. Treppen, Stufen, Scheiben und Schneeschichten sind bewusst noch nicht enthalten.
- Maximales Volumen 48 × 32 × 48 Blöcke.
- Die Vorschau ist eine vereinfachte Voxel-Darstellung mit Einheitsfarben, ohne Original-Texturen.
- Der Eingang ist eine echte Luftöffnung ohne Tür.

## Dokumentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): Datenfluss, Datenmodell, API-Verträge, Transportformat
- [`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md): Zielprofil, Verifikation, Blockliste
- [`docs/WORLD_EDIT_IMPORT.md`](docs/WORLD_EDIT_IMPORT.md): Import-Anleitung
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md): ausgeführte Prüfungen mit echten Ergebnissen
- [`tests/worldedit/README.md`](tests/worldedit/README.md): Aufbau des WorldEdit-Readers
