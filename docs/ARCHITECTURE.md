# Architektur

## Datenfluss (verbindlich)

```text
Text ──► Regel-Parser (parseDescription) ─┐
     └─► optional: lokale KI (Ollama) ────┤  (Wunsch-Patch; KI-Plan ersetzt den Parser nur für genau diesen Text)
UI-Einstellungen (manuell, Vorrang) ──────┤
Seed, Minecraft-Version ──────────────────┘
        ▼ resolveSpec
BuildSpec (Zod-validiert, inkl. options)
        ▼ generateBuilding (deterministisch)
kanonisches VoxelModel ◄──── Editor (setzen/entfernen/ersetzen, Undo/Redo) ───┐
   ├─► 3D-Vorschau (buildVoxelMesh → VoxelScene)                               │
   ├─► Materialliste (countMaterials)                                         │
   ├─► Projekte (IndexedDB, VoxelTransport)                                   │
   └─► .schem-Export (writeSpongeV3 → validateSchematic) ──────────────────────┘
```

Es gibt genau **ein** Blockmodell pro Variante.

- Vorschau, Materialliste, Speichern und Export lesen es unverändert. Der Editor erzeugt bei jeder Änderung ein neues, neu gehashtes Modell.
- Die Kamera zentriert das Modell nur visuell: Eine Three.js-Gruppe wird verschoben, die Blockkoordinaten bleiben unverändert.
- `POST /api/export` exportiert das übergebene Modell und generiert nie neu.

## Datenmodelle

### BuildSpec (`src/core/schema/buildSpec.ts`, `buildOptions.ts`)

| Feld | Werte |
|---|---|
| `kind` | `house`, `tree`, `market_stall`, `station` |
| `style` | `christmas`, `fairytale`, `realistic` |
| `size` | `small`, `medium`, `large` |
| `materialTheme` | `spruce`, `oak`, `stone` |
| `colorTheme` | `red_green`, `ice_blue`, `natural` |
| `detailLevel` | 1, 2, 3 |
| `seed` | 0 … 2³¹−1 |
| `targetMinecraftVersion` | `1.21.11` (Standard), `1.21.1` |
| `options` | alles optional (`undefined` = automatisch aus Größe, Stil und Detailgrad), siehe unten |

Die Felder in `options`:

- **Maße:** `width` (ungerade 7–33), `depth` (ungerade 5–25), `wallHeight` (3–8).
- **Form:** `roofShape` (`gable`, `steep`, `hip`), `windows` (`few`, `normal`, `many`).
- **Schalter:** `snow`, `chimney`, `lights`, `garland`, `christmasTree`, `presents`.
- **Bauteile:** `tower` und `annex` (`none`, `left`, `right`), `porch`, `hedge`.
- **Material:** `frameWood` (`spruce`, `oak`, `dark_oak`, `birch`) und `materials.{wall, roof, floor, foundation, accent}`. Jedes Bauteil hat eine feste Liste erlaubter Blöcke.

Welche Optionen ein Bauwerkstyp nutzt, steht in `APPLICABLE_OPTIONS` (`generateBuilding.ts`). Optionen ohne Wirkung werden in der API-Antwort als Hinweis gemeldet.

### VoxelModel (`src/core/schema/voxelModel.ts`)

```ts
interface VoxelModel {
  schemaVersion: 1;
  dimensions: { width; height; length }; // X, Y, Z
  palette: string[];                     // eindeutige, vollständige, kanonische Blockstates
  indices: Uint16Array;                  // ein Paletten-Index pro Block, inkl. Luft
  origin: { x: 0; y: 0; z: 0 };
  spec: BuildSpec;
  hash: string;                          // SHA-256 (hex)
}
```

- **Koordinaten:** X = Breite (Osten), Y = Höhe, Z = Tiefe (Süden). Der Index ist `x + width * (z + length * y)`, also dieselbe Reihenfolge wie bei Sponge v3.
- **Blockstates:** alle Eigenschaften angegeben, alphabetisch sortiert, z. B. `minecraft:rail[shape=east_west,waterlogged=false]`. Das entspricht WorldEdits `getAsString()`.
- **Palette:** Luft auf Index 0, danach in der Reihenfolge des ersten Auftretens; ungenutzte Einträge werden entfernt. Gleiche Blöcke ergeben so immer denselben Hash.
- **Hash:** SHA-256 über einen Kopf aus Maßen und Palette und über die Indizes als little-endian uint16.
- **Grenzen:** 48 × 32 × 48 Blöcke und 1024 Paletteneinträge. Geprüft wird im Generator, im Transport, beim Speichern, im Export und im Validator.

## Text, Einstellungen und Herkunft (`resolveSpec`)

Der wirksame Spec wird schichtweise zusammengesetzt; spätere Schichten gewinnen:

1. Standardwerte, Seed und Version;
2. Wünsche aus dem Text, entweder vom Regel-Parser oder, falls aktiv, aus dem KI-Plan;
3. **manuelle UI-Einstellungen**.

Jedes Feld kennt seine Herkunft (`standard`, `text`, `ki`, `manuell`); die Oberfläche zeigt sie als Etikett an. Widersprüche zwischen Text und Einstellung werden aufgelistet.

Der Parser (`parseDescription.ts`) arbeitet mit deutschen Wortstämmen und Komposita:

- Er akzeptiert Umlaute in beiden Schreibweisen und erkennt Verneinungen („ohne“, „kein“), Maße („15 x 11“), Farbe plus Bauteil („rotes Dach“) und Seitenangaben bei Turm und Anbau.
- Bekannte, aber nicht baubare Wünsche (Pool, Treppen, Türblöcke, Möbel …) und unverstandene Satzteile werden als **Warnung** gemeldet.

## Generatoren

`VoxelBuilder` (`geometry.ts`) prüft alle Grenzen und arbeitet mit Schreibprioritäten:

| Priorität | Wert |
|---|---|
| `DECOR` | 10 |
| `ROOF_COVER` | 20 |
| `ROOF` | 30 |
| `STRUCTURE` | 50 |
| `CHIMNEY` | 60 |
| `ANNEX` | 70 |
| `OPENING` | 80 |
| `CLEARANCE` | 100 |

Ein Block wird nur gesetzt, wenn seine Priorität mindestens so hoch ist wie die gespeicherte. Deko kann deshalb nie den Eingang zustellen oder ein Fenster überschreiben.

Helfer: `setBlock`, `fillBox`, `hollowBox`, `line`, `placeSymmetric`, `roofGable`, `roofHip`, `firstSolidAbove`.

### Haus (`buildHouse.ts`, `houseComponents.ts`, `decorations.ts`)

1. **Ränder planen:** Dachüberstand plus Platz für Turm, Anbau, Vordach und Hecke.
2. **Fundament und Boden.**
3. **Wände:** vier Wände mit Eckpfosten und Balken.
4. **Eingang:** offen, 2 Blöcke hoch, mit Freiraum davor und dahinter.
5. **Bauteile:**
   - Turm: 5×5, Pyramidendach, offener Schacht mit Durchgang ins Haus.
   - Anbau: eigenes Satteldach und Durchgang.
   - Vordach und Hecke mit Weg und Eckleuchten.
6. **Fenster:** aus Glas, je nach Dichte; Fenster hinter Bauteilen entfallen.
7. **Dach:** gestuftes Sattel- oder Walmdach aus vollen Blöcken, Stufen zwei Blöcke tief, optional mit Schnee.
8. **Schornstein:** auf der hinteren Dachseite, die Seite bestimmt der Seed.
9. **Deko:** Licht, Bodenleuchten, Giebelfenster, Girlanden, Kranz, Baum mit Kugeln und Geschenken.

### Weitere Typen

- **Weihnachtsbaum** (`buildTree.ts`):
  - Bodenscheibe, Stamm, kegelförmige Stufen in Sägezahnform.
  - Schmuck und Lichter am Rand, Lichterspirale, Schnee auf den Stufen, Stern und Geschenke.
- **Marktstand** (`buildMarketStall.ts`):
  - 1–3 Buden mit gemeinsamen Pfosten, Theke mit freier Ausgabestelle und Waren.
  - Rückwand mit Lampe, Seitenwände mit Händlerzugang.
  - Gestreiftes Satteldach, Girlande, gepflasterter Kundenbereich.
- **Bahnhof** (`buildStation.ts`):
  - 1–2 Gleise aus Bett, Schwellen und `minecraft:rail[shape=east_west]` auf festem Grund.
  - Bahnsteig mit gelber Kante und Überdachung (Licht, Girlande).
  - Gebäude mit Tür zum Bahnsteig, Uhr, Fenstern, Dach und Schornstein; Baum auf dem Bahnsteig.

Zufall gibt es nur über `createSeededRandom(spec.seed)` (mulberry32).

## Editor (`src/core/editor/editOperations.ts`)

- **Befehle** speichern pro Zelle den Blockstate vorher und nachher: `setBlockCommand`, `removeBlockCommand`, `replaceAllCommand` und `fillBoxCommand`. `applyCommand` erzeugt ein neues, kanonisches und neu gehashtes Modell.
- **Rückgängig** stellt den ursprünglichen Hash exakt wieder her.
- **Verlauf:** `EditHistory` hält begrenztes Undo/Redo pro Variante.
- **Picking in 3D:** Jede Fläche des Mesh merkt sich ihren Block (`faceCells`). Ein Klick bestimmt daraus den getroffenen Block und die freie Nachbarzelle. Das funktioniert auch für flache Blöcke. Ziehen gilt als Kamerabewegung, nicht als Klick.

## Vorschau (`buildVoxelMesh.ts`, `VoxelScene.tsx`)

- `buildVoxelMesh` ist eine reine Funktion. Sie erzeugt nur Flächen zu nicht verdeckenden Nachbarn.
- Glas bekommt einen eigenen transparenten Mesh, Leuchtblöcke werden unbeleuchtet gezeichnet.
- Schienen sind flache Platten mit 1/16 Blockhöhe und verdecken keine Nachbarflächen.
- `maxY` schaltet den Ebenenschnitt.

## Projekte (`src/lib/persistence/projects.ts`)

- Speicher ist IndexedDB über Dexie, Datenbankschema Version 1.
- **Gespeichert:** Beschreibung, manuelle Einstellungen, Seed, Version, die Voxeldaten aller Varianten (inklusive Bearbeitungen), Bearbeitungszähler, Auswahl und ein eventueller KI-Plan.
- **Beim Laden geprüft:** Schema, Registry, Grenzen und Hashes. Beschädigte Datensätze erzeugen eine sichtbare Fehlermeldung.

## API-Verträge

| Route | Request | Antwort / Fehler |
|---|---|---|
| `POST /api/generate` | `{ spec, variants? }` (max. 16 KB) | `{ generator, profile, variants[{ seed, hash, dimensions, totalBlocks, model }], warnings }`. Fehler: 400 (Schema/JSON), 413 (zu groß), 422 (passt nicht in die Grenzen) |
| `POST /api/export` | `VoxelTransport` (max. 512 KB) | `.schem` mit `Content-Disposition: attachment` und `X-MCB-Voxel-Hash`. Fehler: 400 (Modell abgelehnt, inkl. Hash/Registry), 413, 422 (Selbstprüfung) |
| `GET /api/ai/status` | – | `{ enabled, provider, model, reachable, modelInstalled, installedModels, message }` |
| `POST /api/ai/plan` | `{ description }` | `{ source: 'ollama', model, durationMs, attempts, plan, patch }`. Fehler: 503 (aus/nicht erreichbar), 504 (Zeit), 502 (ungültig/HTTP) |

### Transportformat `VoxelTransport`

```json
{ "schemaVersion": 1, "dimensions": {…}, "palette": […], "indexEncoding": "u16le-base64",
  "indices": "<base64>", "origin": {"x":0,"y":0,"z":0}, "spec": BuildSpec, "hash": "<64 hex>" }
```

- `indices`: little-endian uint16 pro Block, base64-kodiert.
- Größe bei 48 × 32 × 48: höchstens 147 456 Bytes, also 196 608 base64-Zeichen.
- `decodeVoxelTransport` prüft auf Server **und** Client: Schema, Grenzen, Base64, Länge, Registry, Indizes und Hash.

## Export (Sponge Schematic v3)

1. Das Modell wird geprüft und die Zielversion bestimmt das Profil: 1.21.11 ergibt DataVersion 4671, 1.21.1 ergibt 3955.
2. Der NBT-Baum ist `""` → `Schematic` mit:
   - `Version` 3 und `DataVersion`;
   - `Metadata`;
   - `Width`/`Height`/`Length` (Short) und `Offset` [0,0,0];
   - `Blocks` mit `Palette`, `Data` (VarInt-ByteArray) und `BlockEntities` (leere Liste).
3. Big-Endian-NBT, danach GZip. Strings werden auf Kompatibilität mit Javas „modified UTF-8“ geprüft.
4. Ein **eigener, unabhängiger NBT-Leser** liest die Datei sofort wieder ein und vergleicht Layout, Typen, VarInts, jeden Block und den Hash. Erst danach startet der Download.
