# Kompatibilität

## Zielprofil (gepinnt)

| | Wert | Quelle / Nachweis |
|---|---|---|
| Edition | Minecraft **Java**, nur Vanilla-Blöcke | – |
| Minecraft-Version | **1.21.1** | vorläufiges Testprofil laut Auftrag (Server- und WorldEdit-Version wurden nicht genannt) |
| DataVersion | **3955** | Test `tests/unit/registry.test.ts` gegen `minecraft-data@3.117.0` (`pc/common/protocolVersions.json`: 1.21.1 → 3955) |
| Schematic-Format | **Sponge Schematic v3** (`.schem`, GZip, Big-Endian-NBT) | [Spezifikation](https://github.com/SpongePowered/Schematic-Specification/blob/master/versions/schematic-3.md) |
| WorldEdit | **7.3.8** (EngineHub, Commit `7d32b456e7c3237a70e19cca129e51b790c33b73`) | automatisierter Lesetest, siehe unten |

Das Profil steht in `src/core/compat/profile.ts`. Weitere Profile (andere Minecraft-Versionen) sind vorgesehen, aber nicht angelegt. Der Generator, der Transport und der Export lehnen jede andere `targetMinecraftVersion` ab.

**Keine pauschale Kompatibilitätsaussage.** Geprüft ist genau diese Kombination: Dateien mit DataVersion 3955, gelesen von WorldEdit 7.3.8 mit einer 1.21.1-Blockregistry.

- Neuere WorldEdit-Versionen auf neueren Minecraft-Servern lesen v3-Dateien älterer DataVersion üblicherweise über ihren DataFixer ein. Das ist hier **nicht getestet**.
- Sponge v2 (für ältere WorldEdit-Versionen) wird absichtlich nicht exportiert.
- Bedrock wird nicht unterstützt.

## Blockstate-Registry

Die Datei `src/core/blocks/registry.ts` enthält 88 Blöcke bzw. 152 vollständige Blockstates. Erlaubt sind nur Blöcke mit vollem Würfel. Treppen, Stufen, Scheiben und Schneeschichten fehlen bewusst, bis Vorschau und Export ihre Form und Ausrichtung übereinstimmend unterstützen.

Ein Unit-Test prüft **jeden** Registry-Block gegen `minecraft-data` für 1.21.1: Der Block muss existieren, und Eigenschaftsnamen sowie erlaubte Werte müssen exakt übereinstimmen.

Zusätzlich liest der WorldEdit-Test die Paletten mit WorldEdits eigenem Block-Parser. Dabei wird `--require-canonical` verwendet, also müssen die Blockstates genau so formatiert sein wie bei WorldEdits `getAsString()`.

| Block-ID | Anzeige | Eigenschaften (1.21.1) | Vorschau |
|---|---|---|---|
| `minecraft:air` | Luft | – | none |
| `minecraft:spruce_planks` | Fichtenholzbretter | – | opaque |
| `minecraft:spruce_log` | Fichtenstamm | axis∈{x,y,z} | opaque |
| `minecraft:stripped_spruce_log` | Entrindeter Fichtenstamm | axis∈{x,y,z} | opaque |
| `minecraft:oak_planks` | Eichenholzbretter | – | opaque |
| `minecraft:oak_log` | Eichenstamm | axis∈{x,y,z} | opaque |
| `minecraft:stripped_oak_log` | Entrindeter Eichenstamm | axis∈{x,y,z} | opaque |
| `minecraft:dark_oak_planks` | Schwarzeichenholzbretter | – | opaque |
| `minecraft:dark_oak_log` | Schwarzeichenstamm | axis∈{x,y,z} | opaque |
| `minecraft:cobblestone` | Bruchstein | – | opaque |
| `minecraft:stone_bricks` | Steinziegel | – | opaque |
| `minecraft:smooth_stone` | Glatter Stein | – | opaque |
| `minecraft:polished_andesite` | Polierter Andesit | – | opaque |
| `minecraft:deepslate_tiles` | Tiefenschieferfliesen | – | opaque |
| `minecraft:bricks` | Ziegelsteine | – | opaque |
| `minecraft:terracotta` | Keramik | – | opaque |
| `minecraft:glass` | Glas | – | translucent |
| `minecraft:snow_block` | Schneeblock | – | opaque |
| `minecraft:packed_ice` | Packeis | – | opaque |
| `minecraft:spruce_leaves` | Fichtenlaub | distance∈{1,2,3,4,5,6,7}; persistent∈{true,false}; waterlogged∈{true,false} | opaque |
| `minecraft:oak_leaves` | Eichenlaub | distance∈{1,2,3,4,5,6,7}; persistent∈{true,false}; waterlogged∈{true,false} | opaque |
| `minecraft:glowstone` | Leuchtstein | – | emissive |
| `minecraft:sea_lantern` | Seelaterne | – | emissive |
| `minecraft:gold_block` | Goldblock | – | opaque |

Dazu kommen vier Farbfamilien in allen 16 Farben (`white, orange, magenta, light_blue, yellow, lime, pink, gray, light_gray, cyan, purple, blue, brown, green, red, black`), jeweils ohne Eigenschaften:

- `minecraft:<farbe>_wool` (Wolle)
- `minecraft:<farbe>_concrete` (Beton)
- `minecraft:<farbe>_terracotta` (gefärbte Keramik)
- `minecraft:<farbe>_stained_glass` (Buntglas, transluzent)

Laub wird immer mit `persistent=true` platziert, damit es in der Welt nicht zerfällt.

## WorldEdit-Lesetest: so wurde er aufgebaut

Details stehen in `tests/worldedit/README.md`; die Pins in `tests/worldedit/upstream.lock`.

- In der Entwicklungsumgebung war `maven.enginehub.org` gesperrt. WorldEdit 7.3.8 wurde deshalb aus dem **unveränderten GitHub-Quellcode** gebaut, zusammen mit Piston, lin-bus und jlibnoise; gebaut wurde mit Maven statt Gradle.
- Gelesen wird mit `SpongeSchematicV3Reader` (Format `SPONGE_V3_SCHEMATIC`) auf der `worldedit-cli`-Plattform.
- **Abweichungen von einem offiziellen Build**, keine davon im Lesepfad:
  - `jchronic` ist durch einen Stub ersetzt. Es wird nur für Snapshot-Datumsangaben gebraucht.
  - `lang/i18n.zip` ist leer. Englisch kommt weiterhin aus `strings.json`.
  - Das Arbeitsverzeichnis der CLI wird per Reflection auf ein temporäres Verzeichnis gesetzt.
- **Wichtiger Vorbehalt zur Registry:** Keine 7.3.x-Version von WorldEdit-CLI liefert Blockdaten für 1.21.1 mit. Die Daten reichen nur bis DataVersion 3105 (1.19). Die Datei `3955.json` wurde deshalb aus der offiziellen Minecraft-1.21.1-Data-Generator-Ausgabe erzeugt (gespiegelt in `misode/mcmeta`, Tag `1.21.1-summary`).
  - Der Konverter ist dadurch abgesichert, dass er aus den 1.19-Daten **exakt** EngineHubs eigene `3105.json` reproduziert.
  - Für 1.21.1 ist die Datei trotzdem selbst erzeugt und nicht von EngineHub.
- Auf einem normalen Rechner kann `WE_MODE=enginehub tests/worldedit/build.sh` die Binärdateien direkt von EngineHub holen. Dieser Modus wurde hier nicht getestet, weil der Host gesperrt war.

## Bekannte Eigenheiten von WorldEdit 7.3.8

Festgestellt mit den Fixtures in `tests/worldedit/fixtures-src`; der Exporter vermeidet alle diese Fälle.

- **Unbekannte Eigenschaftsnamen** verwirft WorldEdit ohne Warnung und fällt auf den Standardzustand zurück. Der Exporter schreibt deshalb nur Registry-geprüfte, vollständige Zustände, und das Harness schlägt in diesem Fall fehl.
- **Zu wenige oder zu viele VarInts** bemerkt WorldEdit nicht: Fehlende Blöcke werden zu Luft, überzählige ignoriert. Der eigene Validator prüft die Anzahl exakt.
- **Strings** müssen Javas „modified UTF-8“ sein. Der Exporter lehnt Zeichen außerhalb der BMP und NUL ab.
- **`Width`, `Height` und `Length`** müssen `TAG_Short` sein. **`Blocks`** ist für WorldEdit Pflicht.
