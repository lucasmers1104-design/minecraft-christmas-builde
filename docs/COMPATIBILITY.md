# Kompatibilität

## Profile

| | Standardprofil | Zweites Profil | Nachweis |
|---|---|---|---|
| Edition | Minecraft **Java**, nur Vanilla-Blöcke | dasselbe | – |
| Minecraft-Version | **1.21.11** | 1.21.1 | Vorgabe des Nutzers: 1.21.11 |
| DataVersion | **4671** | 3955 | `tests/unit/registry.test.ts` gegen `minecraft-data@3.117.0` (`pc/common/protocolVersions.json`) sowie `version.json` der mcmeta-Tags `1.21.11-summary` und `1.21.1-summary` |
| Schematic-Format | **Sponge Schematic v3** (`.schem`, GZip, Big-Endian-NBT) | dasselbe | [Spezifikation](https://github.com/SpongePowered/Schematic-Specification/blob/master/versions/schematic-3.md) |
| WorldEdit im Spiel | 7.3.18 oder neuer (ab dort „Added support for 1.21.11“), z. B. 7.4.2 | 7.3.x | Changelog von WorldEdit, siehe `tests/worldedit/README.md` |
| WorldEdit-Reader im Test | **EngineHub WorldEdit 7.4.2**, Commit `eb8e82c3d8843bed3f71e82ea974122415645178` | derselbe Reader | automatisierter Lesetest, siehe unten |

Die Profile stehen in `src/core/compat/profile.ts`.

- Die Version wählst du in der App unter „Einstellungen“. Sie wird mit dem Projekt gespeichert.
- Der Exporter schreibt die DataVersion des gewählten Profils. Der Validator akzeptiert nur DataVersions der bekannten Profile.
- Jede andere `targetMinecraftVersion` lehnen Generator, Transport und Export ab.

**Keine pauschale Kompatibilitätsaussage.** Geprüft ist genau Folgendes: Dateien mit DataVersion 4671 und 3955, gelesen vom WorldEdit-7.4.2-Reader mit selbst erzeugten Blockregistries für genau diese Versionen.

- Andere Minecraft-Versionen, das Laden älterer Dateien über WorldEdits DataFixer und FastAsyncWorldEdit sind **nicht getestet**.
- Sponge v2 (für ältere WorldEdit-Versionen) wird absichtlich nicht exportiert.
- Bedrock wird nicht unterstützt.
- **Der Import in einer echten Minecraft-Welt ist noch nicht verifiziert** (siehe `docs/WORLD_EDIT_IMPORT.md`).

## Blockstate-Registry

`src/core/blocks/registry.ts` enthält **128 Blöcke mit zusammen 248 vollständigen Blockstates**.

- Bis auf Schienen sind nur Blöcke mit vollem Würfel erlaubt. Treppen, Stufen, Scheiben, Zäune, Türen und Schneeschichten fehlen bewusst, bis Vorschau und Export ihre Form und Ausrichtung übereinstimmend unterstützen.
- **Schienen** (`minecraft:rail`) zeigt die Vorschau als flache Platte. In der Welt brauchen sie einen festen Block darunter; der Bahnhofsgenerator legt sie immer auf ein Gleisbett aus Bruchstein und Holzschwellen.
- Laub wird immer mit `persistent=true` platziert, damit es in der Welt nicht zerfällt.

Drei unabhängige Prüfungen:

1. **Unit-Test gegen `minecraft-data`:** Jeder Registry-Block muss in 1.21.11 **und** in 1.21.1 existieren, mit exakt denselben Eigenschaftsnamen und Werten (`tests/unit/registry.test.ts`).
2. **WorldEdit-Lesetest:** Ein synthetisches Modell enthält alle 248 Zustände. Der WorldEdit-Reader liest es mit der 1.21.11-Registry und `--require-canonical` Block für Block identisch. Die Schreibweise muss also genau WorldEdits `getAsString()` entsprechen.
3. **Einmaliger Abgleich per Skript** (nicht Teil der Testsuite, ausgeführt am 2026-10-21) gegen die beiden erzeugten WorldEdit-Registries `4671_1.json` und `3955_1.json` aus dem Reader-Jar: Für alle 128 Blöcke sind Eigenschaften, Werte und Standardzustand in beiden Versionen identisch.

| Block-ID | Anzeige | Eigenschaften | Vorschau |
|---|---|---|---|
| `minecraft:air` | Luft | – | none |
| `minecraft:spruce_planks` | Fichtenholzbretter | – | opaque |
| `minecraft:spruce_log` | Fichtenstamm | axis: x, y, z | opaque |
| `minecraft:stripped_spruce_log` | Entrindeter Fichtenstamm | axis: x, y, z | opaque |
| `minecraft:oak_planks` | Eichenholzbretter | – | opaque |
| `minecraft:oak_log` | Eichenstamm | axis: x, y, z | opaque |
| `minecraft:stripped_oak_log` | Entrindeter Eichenstamm | axis: x, y, z | opaque |
| `minecraft:dark_oak_planks` | Schwarzeichenholzbretter | – | opaque |
| `minecraft:dark_oak_log` | Schwarzeichenstamm | axis: x, y, z | opaque |
| `minecraft:stripped_dark_oak_log` | Entrindeter Schwarzeichenstamm | axis: x, y, z | opaque |
| `minecraft:birch_planks` | Birkenholzbretter | – | opaque |
| `minecraft:birch_log` | Birkenstamm | axis: x, y, z | opaque |
| `minecraft:stripped_birch_log` | Entrindeter Birkenstamm | axis: x, y, z | opaque |
| `minecraft:spruce_wood` | Fichtenholz | axis: x, y, z | opaque |
| `minecraft:oak_wood` | Eichenholz | axis: x, y, z | opaque |
| `minecraft:dark_oak_wood` | Schwarzeichenholz | axis: x, y, z | opaque |
| `minecraft:cobblestone` | Bruchstein | – | opaque |
| `minecraft:stone_bricks` | Steinziegel | – | opaque |
| `minecraft:smooth_stone` | Glatter Stein | – | opaque |
| `minecraft:polished_andesite` | Polierter Andesit | – | opaque |
| `minecraft:deepslate_tiles` | Tiefenschieferfliesen | – | opaque |
| `minecraft:bricks` | Ziegelsteine | – | opaque |
| `minecraft:stone` | Stein | – | opaque |
| `minecraft:mossy_cobblestone` | Bemooster Bruchstein | – | opaque |
| `minecraft:chiseled_stone_bricks` | Gemeißelte Steinziegel | – | opaque |
| `minecraft:cracked_stone_bricks` | Rissige Steinziegel | – | opaque |
| `minecraft:polished_deepslate` | Polierter Tiefenschiefer | – | opaque |
| `minecraft:tuff_bricks` | Tuffziegel | – | opaque |
| `minecraft:mud_bricks` | Lehmziegel | – | opaque |
| `minecraft:quartz_block` | Quarzblock | – | opaque |
| `minecraft:smooth_quartz` | Glatter Quarz | – | opaque |
| `minecraft:calcite` | Calcit | – | opaque |
| `minecraft:sandstone` | Sandstein | – | opaque |
| `minecraft:smooth_sandstone` | Glatter Sandstein | – | opaque |
| `minecraft:red_sandstone` | Roter Sandstein | – | opaque |
| `minecraft:iron_block` | Eisenblock | – | opaque |
| `minecraft:waxed_copper_block` | Gewachster Kupferblock | – | opaque |
| `minecraft:dirt` | Erde | – | opaque |
| `minecraft:coarse_dirt` | Grobe Erde | – | opaque |
| `minecraft:moss_block` | Moosblock | – | opaque |
| `minecraft:terracotta` | Keramik | – | opaque |
| `minecraft:glass` | Glas | – | translucent |
| `minecraft:snow_block` | Schneeblock | – | opaque |
| `minecraft:packed_ice` | Packeis | – | opaque |
| `minecraft:blue_ice` | Blaueis | – | opaque |
| `minecraft:ice` | Eis | – | translucent |
| `minecraft:spruce_leaves` | Fichtenlaub | distance: 1/2/3/4/5/6/7; persistent: true/false; waterlogged: true/false | opaque |
| `minecraft:oak_leaves` | Eichenlaub | distance: 1/2/3/4/5/6/7; persistent: true/false; waterlogged: true/false | opaque |
| `minecraft:glowstone` | Leuchtstein | – | emissive |
| `minecraft:sea_lantern` | Seelaterne | – | emissive |
| `minecraft:gold_block` | Goldblock | – | opaque |
| `minecraft:shroomlight` | Pilzlicht | – | emissive |
| `minecraft:ochre_froglight` | Ockerfarbenes Froschlicht | axis: x, y, z | emissive |
| `minecraft:pearlescent_froglight` | Perlmuttfarbenes Froschlicht | axis: x, y, z | emissive |
| `minecraft:verdant_froglight` | Grünliches Froschlicht | axis: x, y, z | emissive |
| `minecraft:jack_o_lantern` | Kürbislaterne | facing: north/south/west/east | emissive |
| `minecraft:bookshelf` | Bücherregal | – | opaque |
| `minecraft:crafting_table` | Werkbank | – | opaque |
| `minecraft:hay_block` | Heuballen | axis: x, y, z | opaque |
| `minecraft:barrel` | Fass | facing: north/east/south/west/up/down; open: true/false | opaque |
| `minecraft:pumpkin` | Kürbis | – | opaque |
| `minecraft:carved_pumpkin` | Geschnitzter Kürbis | facing: north/south/west/east | opaque |
| `minecraft:melon` | Melone | – | opaque |
| `minecraft:rail` | Schiene | shape: north_south/east_west/ascending_east/ascending_west/ascending_north/ascending_south/south_east/south_west/north_west/north_east; waterlogged: true/false | flach |

Dazu kommen vier Farbfamilien in allen 16 Farben (`white, orange, magenta, light_blue, yellow, lime, pink, gray, light_gray, cyan, purple, blue, brown, green, red, black`), jeweils ohne Eigenschaften. Das sind 64 weitere Blöcke:

- `minecraft:<farbe>_wool` (Wolle)
- `minecraft:<farbe>_concrete` (Beton)
- `minecraft:<farbe>_terracotta` (gefärbte Keramik)
- `minecraft:<farbe>_stained_glass` (Buntglas, transluzent)

## WorldEdit-Lesetest: so wurde er aufgebaut

Details stehen in `tests/worldedit/README.md`; alle Pins in `tests/worldedit/upstream.lock`.

- **Warum 7.4.2:** Es ist die neueste Version, in der alle Plattformen (Bukkit/Paper, Fabric, NeoForge, Sponge) auf 1.21.11 zielen und die mit Java 21 läuft. Ab 7.4.3 sind Fabric, NeoForge und Sponge auf Minecraft 26.x umgestellt, und der Kern braucht Java 25.
- **Aus Quellcode gebaut:** In der Entwicklungsumgebung waren `maven.enginehub.org`, `repo.enginehub.org` und `services.enginehub.org` gesperrt. WorldEdit 7.4.2 wurde deshalb aus dem **unveränderten GitHub-Quellcode** gebaut, zusammen mit Piston v0.5.11, lin-bus v0.2.0 und jlibnoise. Gebaut wurde mit Maven statt Gradle.
- **Lesepfad:** `SpongeSchematicV3Reader` (Format `SPONGE_V3_SCHEMATIC`) auf der `worldedit-cli`-Plattform, gestartet für die DataVersion der Datei.
- **Abweichungen von einem offiziellen Build**, keine davon im Lesepfad:
  - `jchronic` ist durch einen Stub ersetzt. Es wird nur für Snapshot-Datumsangaben gebraucht.
  - `lang/i18n.zip` ist leer. Englisch kommt weiterhin aus `strings.json`.
  - Das Arbeitsverzeichnis der CLI wird per Reflection auf ein temporäres Verzeichnis gesetzt.
- **Wichtiger Vorbehalt zur Registry:** WorldEdit-CLI 7.4 enthält keine Blockdaten. Es lädt sie zur Laufzeit von `services.enginehub.org` herunter, und dieser Host war gesperrt.
  - Das Harness legt deshalb vorher selbst erzeugte Dateien in WorldEdits Download-Cache (`cli-data/4671_1.json`, `cli-data/3955_1.json`). WorldEdit lädt sie über seinen eigenen Code und lädt nie etwas herunter.
  - Erzeugt werden sie aus Mojangs Data-Generator-Ausgabe, gespiegelt in `misode/mcmeta`: Tag `1.21.11-summary` @ `c976eb3b2cfcb9f205171527dec46b266afa3ac9` und `1.21.1-summary` @ `7cffbcdad5fa36f22acef6bd4b869ecad4ca3fd9`.
  - Der Konverter ist dadurch abgesichert, dass er aus den 1.19-Daten **exakt** EngineHubs eigene `3105.json` reproduziert (Referenz aus WorldEdit 7.3.19, Blob `4d1436e8`).
  - **Nicht geprüft:** ob die Dateien für 4671 und 3955 identisch mit EngineHubs eigenen Downloads sind. Der Vergleichsbefehl steht in `tests/worldedit/README.md`.
- Auf einem normalen Rechner kann `WE_MODE=enginehub tests/worldedit/build.sh` die WorldEdit-Binärdateien direkt von EngineHub holen. Dieser Modus wurde hier nicht getestet, weil die Hosts gesperrt waren.
- Unter Windows läuft `build.sh` in Git Bash oder WSL2. Das ist **nicht auf Windows getestet**; der Linux-Build ist verifiziert. Für die App selbst wird der Reader nicht gebraucht.

## Bekannte Eigenheiten von WorldEdit

Festgestellt mit den Fixtures in `tests/worldedit/fixtures-src`; der Exporter vermeidet alle diese Fälle.

- **Unbekannte Eigenschaftsnamen** verwirft WorldEdit ohne Warnung und fällt auf den Standardzustand zurück. Der Exporter schreibt deshalb nur Registry-geprüfte, vollständige Zustände, und das Harness schlägt in diesem Fall fehl.
- **Zu wenige oder zu viele VarInts** bemerkt WorldEdit nicht: Fehlende Blöcke werden zu Luft, überzählige ignoriert. Der eigene Validator prüft die Anzahl exakt.
- **Strings** müssen Javas „modified UTF-8“ sein. Der Exporter lehnt Zeichen außerhalb der BMP und NUL ab.
- **`Width`, `Height` und `Length`** müssen `TAG_Short` sein. **`Blocks`** ist für WorldEdit Pflicht.
