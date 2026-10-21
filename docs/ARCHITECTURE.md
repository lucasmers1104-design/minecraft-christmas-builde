# Architektur

## Datenfluss (verbindlich)

```text
Text + Einstellungen
  -> BuildSpec (Zod-validiert, src/core/schema/buildSpec.ts)
  -> deterministischer Generator (src/core/generator/*)
  -> kanonisches VoxelModel (src/core/schema/voxelModel.ts)
       ├─> 3D-Vorschau        (src/components/preview/buildVoxelMesh.ts -> VoxelScene.tsx)
       ├─> Materialliste      (src/core/analysis/materialCounts.ts)
       ├─> Transport/Speichern (src/lib/serialization/voxelTransport.ts)
       └─> .schem-Encoder     (src/core/export/writeSpongeV3.ts)
```

Die Vorschau und der Export erzeugen **keine eigene Geometrie**. Beide lesen dasselbe, unveränderte `VoxelModel`.

- Für die Kamera wird das Modell nur visuell zentriert: Eine Three.js-Gruppe wird um `(-width/2, 0, -length/2)` verschoben. Die gespeicherten Blockkoordinaten bleiben unverändert.
- Der Export nimmt das ausgewählte Modell entgegen (`POST /api/export`). Er generiert nie aus dem Prompt neu.

## Kanonisches Datenmodell

```ts
interface VoxelModel {
  schemaVersion: 1;
  dimensions: { width; height; length };   // X, Y, Z
  palette: string[];                        // eindeutige, vollständige, kanonische Blockstates
  indices: Uint16Array;                     // ein Paletten-Index pro Block, inkl. Luft
  origin: { x: 0; y: 0; z: 0 };
  spec: BuildSpec;
  hash: string;                             // SHA-256 (hex)
}
```

- **Koordinaten:** X = Breite (Osten), Y = Höhe, Z = Tiefe (Süden). Index: `x + width * (z + length * y)`, d. h. X läuft am schnellsten. Das ist dieselbe Reihenfolge wie bei Sponge v3.
- **Blockstates** sind kanonisch: `minecraft:<id>`, *alle* Eigenschaften angegeben, alphabetisch sortiert (z. B. `minecraft:spruce_leaves[distance=7,persistent=true,waterlogged=false]`). Das entspricht der Ausgabe von WorldEdits `BlockState#getAsString()`. `checkBlockState` lehnt alles ab, was nicht in der Registry steht oder nicht kanonisch ist.
- **Palette** in kanonischer Reihenfolge: Luft auf Index 0, danach die Blockstates in der Reihenfolge ihres ersten Auftretens in Indexreihenfolge. Ungenutzte Einträge werden entfernt (`canonicalizeVoxelData`). Gleiche Blockdaten ergeben so immer dieselbe Palette und denselben Hash.
- **Hash:** SHA-256 über `"mcb-voxel-v1\n{w}x{h}x{l}\n" + palette.join("\n") + "\n"`, danach die Indizes als little-endian uint16. Die Implementierung ist eine synchrone SHA-256-Funktion in reinem TypeScript, die in Node und im Browser gleich arbeitet. Sie ist gegen `node:crypto` getestet.
- **Limits:** maximal 48 × 32 × 48 Blöcke (73 728) und maximal 1024 Paletteneinträge. Geprüft werden sie im Generator (`VoxelBuilder`), im Transport, im Export und im Validator.

## Generator

`generateBuilding(spec)` validiert die Spec und ruft den Generator für den Bauwerkstyp auf. Derzeit gibt es nur `house`. Andere Typen werfen `NotImplementedBuildingError`, die API antwortet dann mit HTTP 422.

`VoxelBuilder` (`geometry.ts`) arbeitet mit Grenzprüfungen und **Schreibprioritäten**. Ein Block wird nur gesetzt, wenn seine Priorität mindestens so hoch ist wie die bereits gespeicherte:

| Priorität | Verwendung |
|---|---|
| `CLEARANCE` (100) | Durchgang und Freiraum vor bzw. hinter dem Eingang; danach überschreibt nichts mehr diese Zellen |
| `OPENING` (80) | Glasfenster |
| `CHIMNEY` (60) | Schornstein (durchstößt das Dach) |
| `STRUCTURE` (50) | Fundament, Wände, Pfosten, Balken, Giebel |
| `ROOF` (30) / `ROOF_COVER` (20) | Dach und Schneeauflage |
| `DECOR` (10) | Girlanden, Kranz, Baum, Geschenke, Licht |

Helfer: `setBlock`, `fillBox`, `hollowBox`, `line`, `placeSymmetric`, `roofGable`, `firstSolidAbove`.

Arbeitsschritte von `buildHouse` (Mittelgröße: Grundfläche 13 × 11, Volumen 15 × 14 × 13):

1. **Fundament:** ein Ring aus Fundamentblöcken, darin der Holzboden (y = 0).
2. **Wände:** vier geschlossene Wände (y = 1 … Wandhöhe) mit Eckpfosten (Stamm, `axis=y`) und umlaufendem Balken (`axis=x` bzw. `axis=z`).
3. **Eingang:** in der Frontwand (−Z / Norden), 1 × 2 Blöcke echte Luft, mit Rahmen und Sturz. Freigehalten werden außerdem eine Zelle davor und zwei dahinter. Davor liegt ein Wegblock.
4. **Fenster:** aus `glass` bzw. Buntglas in allen vier Wänden, symmetrisch angeordnet, ab Detailgrad 2 mit Fensterläden.
5. **Satteldach:** gestuft aus vollen Blöcken, jede Stufe zwei Blöcke tief (also ohne diagonale Lücken), mit 1 Block Überstand rundum, Giebelwänden und Schneeauflage. Der Stil „märchenhaft“ ist doppelt so steil.
6. **Schornstein:** auf der hinteren Dachseite neben dem First. Die Seite (links oder rechts) hängt vom Seed ab. Er ragt über den First.
7. **Dekoration** (`decorations.ts`), je nach Detailgrad und Stil: Leuchtstein unter dem First, Bodenleuchten, Giebelfenster, Girlande mit Schleifen (Versatz per Seed), Kranz über der Tür, Weihnachtsbaum an der fensterlosen Mitte der Rückwand mit Kugeln (Seed) und Geschenken (Seed).

Der Zufall kommt ausschließlich aus `createSeededRandom(spec.seed)` (mulberry32). Die Beschreibung fließt noch nicht in die Geometrie ein; das kommt mit dem Parser in Phase 2.

## Export (Sponge Schematic v3)

`exportSchematic(model, profile)`:

1. `buildSpongeV3Nbt` prüft das Modell: Maße, Palette gegen die Registry, Indexgrenzen, Hash und Zielversion. Bei Fehlern wirft es `SchematicExportError`, und es entsteht kein Download.
2. Danach baut es den NBT-Baum: Root-Compound `""` → Compound `Schematic` mit
   - `Version` (Int 3),
   - `DataVersion` (Int 3955),
   - `Metadata` (Name, Author, `MCBVoxelHash`, `MCBMinecraftVersion`),
   - `Width`/`Height`/`Length` (Short),
   - `Offset` (IntArray [0,0,0]),
   - `Blocks` mit `Palette` (Compound: Blockstate → Int), `Data` (ByteArray der VarInt-Bytes) und `BlockEntities` (leere Liste von Compounds).
3. `prismarine-nbt` serialisiert das als Big-Endian-NBT, danach folgt GZip (`node:zlib`). Strings werden auf Zeichen geprüft, bei denen sich UTF-8 und Javas „modified UTF-8“ unterscheiden.
4. `validateSchematic` liest die Datei sofort wieder ein, und zwar über einen **eigenen, unabhängigen NBT-Leser** (`nbtReader.ts`). Geprüft werden:
   - Root und `Schematic`, Tag-Typen, `Version`, `DataVersion` und Maße;
   - Palette-IDs (0 … n−1) und Registry;
   - alle VarInts, ohne Abschneiden und ohne Restbytes;
   - jeder Block gegen das Modell, dazu der Hash.

   Nur wenn alles stimmt, liefert die Route die Datei aus.

## API-Verträge

### `POST /api/generate`

Request (max. 16 KB):

```json
{ "spec": BuildSpec, "variants": 1..3 (optional, Standard 3) }
```

Antwort 200:

```json
{
  "generator": "rule-based",
  "profile": { "minecraftVersion": "1.21.1", "dataVersion": 3955, "schematic": "Sponge Schematic v3" },
  "variants": [ { "seed": 1, "hash": "…", "dimensions": {…}, "totalBlocks": 976, "model": VoxelTransport } ],
  "warnings": []
}
```

Fehler: 400 (ungültiges JSON oder Schema, mit `issues`), 413 (zu groß), 422 (Bauwerkstyp noch nicht verfügbar), 500.

### `POST /api/export`

- **Request:** ein `VoxelTransport` (max. 512 KB), also das ausgewählte Modell.
- **Antwort 200:** die `.schem`-Bytes mit folgenden Headern:
  - `Content-Type: application/octet-stream`
  - `Content-Disposition: attachment; filename="christmas-house-<size>-seed<n>-<hash8>.schem"`
  - `X-MCB-Voxel-Hash`, `X-MCB-Schematic-Version`, `X-MCB-Data-Version`
- **Fehler:**
  - 400: Modell abgelehnt, z. B. wegen Hash, Registry, Grenzen oder Schema; mit `issues`.
  - 413: Anfrage zu groß.
  - 422: Export oder Selbstprüfung verweigert.
  - 500: sonstiger Serverfehler.

Der Client vergleicht `X-MCB-Voxel-Hash` mit dem ausgewählten Modell und meldet einen Fehler, wenn er abweicht.

### Transportformat `VoxelTransport`

```json
{
  "schemaVersion": 1,
  "dimensions": { "width": 15, "height": 14, "length": 13 },
  "palette": ["minecraft:air", "…"],
  "indexEncoding": "u16le-base64",
  "indices": "<base64>",
  "origin": { "x": 0, "y": 0, "z": 0 },
  "spec": BuildSpec,
  "hash": "<64 hex>"
}
```

- `indices` enthält die Paletten-Indizes in Indexreihenfolge als **little-endian uint16** (2 Bytes pro Block), base64-kodiert.
- Maximale Größe bei 48 × 32 × 48: 147 456 Bytes roh bzw. 196 608 base64-Zeichen.
- `decodeVoxelTransport` prüft Schema, Grenzen, Base64, Länge, Registry, Indexgrenzen und Hash, und zwar auf dem Server *und* im Browser.

## Vorschau

`buildVoxelMesh` ist eine reine Funktion ohne Abhängigkeit von Three.js und ist getestet:

- Luft erzeugt keine Geometrie.
- Undurchsichtige und leuchtende Blöcke geben nur Flächen zu nicht verdeckenden Nachbarn aus.
- Glas bekommt einen eigenen, transparenten Mesh (`depthWrite: false`). Flächen zwischen gleichem Glas werden ausgelassen.
- Ein 3 × 3 × 3-Würfel ergibt 54 statt 162 Flächen.

`VoxelScene` rendert drei Meshes:

- opak: `MeshLambertMaterial`;
- leuchtend: `MeshBasicMaterial`, unbeleuchtet;
- transluzent.

Die Kamera passt sich an die Größe des Modells und das Seitenverhältnis an. Für E2E-Tests setzt die Szene `data-model-hash`, `data-rendered-hash` und `data-face-count`.
