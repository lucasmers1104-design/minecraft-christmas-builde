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

`src/core/blocks/registry.ts` (Daten in `families.ts`) enthält **541 Blöcke**. Zusammen sind das **18 131 vollständige Blockzustände in 1.21.11** und **17 353 in 1.21.1**.

- **Formklassen:** volle Würfel (159), Säulen/Stämme (53), Treppen (54), Stufen (57), Mauern (26), Zäune (12), Zauntore (12), Scheiben und Gitter (18), Türen (17), Falltüren (17), Teppiche (17), Kerzen (17), Knöpfe (13), Blumentöpfe (14), Pflanzen (13), Setzlinge (3), Laub (11), Laternen (2), Ketten (2), Blitzableiter (2), Lagerfeuer (2), Kupfergitter und -lampen (je 4), Endstab, Fass, Leiter, Ranken, Blütenteppich, Schneeschicht, Gras und Podsol (2), Trampelpfad, Schiene. Jede Formklasse hat die Vanilla-Boxen in 1/16 (`shapes.ts`); ein Test vergleicht sie mit den Modellen der echten Client-Datei.
- **Zustände wie im Spiel:** Treppenformen, Verbindungen von Zäunen, Scheiben, Gittern und Mauern, obere Türhälften, Zauntore in Mauern, `snowy` bei Gras und Laubdistanzen berechnet der Zustandsauflöser so, wie Minecraft sie beim Setzen berechnet. WorldEdit fügt mit `//paste` ohne Nachbar-Updates ein; deshalb stehen die fertigen Zustände in der Datei.
- **Halt:** Der Validator verhindert Blöcke, die im Spiel abfallen oder schmelzen würden (Laternen, Kerzen, Türen, Teppiche, Pflanzen, Schienen, Knöpfe, Leitern, Schnee, Kies über Luft); erzeugte Bauwerke brauchen keine einzige Reparatur.
- Laub wird immer mit `persistent=true` gesetzt, `waterlogged` ist immer `false`.

### Unterschiede zwischen den Profilen

| Block | 1.21.11 | 1.21.1 |
|---|---|---|
| Kette | `minecraft:iron_chain` | `minecraft:chain` (wird beim Export für 1.21.1 umbenannt) |
| Blitzableiter (gewachst) | `minecraft:waxed_lightning_rod` | `minecraft:lightning_rod` |
| Blassen-Eichenholz (Bretter, Stämme, Treppen, Stufen, Zäune, Tore, Türen, Falltüren, Knöpfe, Laub) | vorhanden | fehlt – wird für 1.21.1 nicht verwendet |
| Harzziegel (Block, Treppe, Stufe, Mauer) | vorhanden | fehlt – wird für 1.21.1 nicht verwendet |

`checkBlockState(state, version)` prüft jeden Zustand gegen die Zielversion; Generator, Transport, Speichern und Export lehnen Zustände ab, die es in der gewählten Version nicht gibt.

### Prüfungen

1. **Unit-Test gegen `minecraft-data@3.117.0`:** Jeder Block muss in den Versionen seines Profils mit exakt denselben Eigenschaftsnamen, Werten und Standardwerten existieren (`tests/unit/registry.test.ts`).
2. **WorldEdit-Lesetest:** Synthetische Modelle enthalten **jeden** Zustand beider Versionen (in Stücken, weil eine Palette höchstens 4096 Einträge hat). Der WorldEdit-7.4.2-Reader liest sie mit der Registry der jeweiligen Version und `--require-canonical` Block für Block identisch; die Schreibweise entspricht also genau WorldEdits `getAsString()`.
3. **Formen gegen die echte Client-Datei:** `tests/integration/vanillaShapes.test.ts` backt die Original-Blockmodelle aus der Minecraft-Datei des Nutzers und vergleicht die Flächenabdeckung mit `shapes.ts` (läuft nur, wenn die Datei vorhanden ist).

### Blockliste nach Kategorie

| Kategorie | Anzahl | Blöcke (ohne `minecraft:`) |
|---|---|---|
| Technik | 2 | air, rail |
| Glas | 35 | glass, tinted_glass, glass_pane, white_stained_glass, white_stained_glass_pane, orange_stained_glass, orange_stained_glass_pane, magenta_stained_glass, magenta_stained_glass_pane, light_blue_stained_glass, light_blue_stained_glass_pane, yellow_stained_glass, yellow_stained_glass_pane, lime_stained_glass, lime_stained_glass_pane, pink_stained_glass, pink_stained_glass_pane, gray_stained_glass, gray_stained_glass_pane, light_gray_stained_glass, light_gray_stained_glass_pane, cyan_stained_glass, cyan_stained_glass_pane, purple_stained_glass, purple_stained_glass_pane, blue_stained_glass, blue_stained_glass_pane, brown_stained_glass, brown_stained_glass_pane, green_stained_glass, green_stained_glass_pane, red_stained_glass, red_stained_glass_pane, black_stained_glass, black_stained_glass_pane |
| Metall | 37 | iron_bars, iron_block, gold_block, iron_door, iron_trapdoor, iron_chain, chain, lightning_rod, waxed_lightning_rod, waxed_copper_block, waxed_cut_copper, waxed_cut_copper_stairs, waxed_cut_copper_slab, waxed_copper_door, waxed_copper_trapdoor, waxed_copper_grate, waxed_exposed_copper, waxed_exposed_cut_copper, waxed_exposed_cut_copper_stairs, waxed_exposed_cut_copper_slab, waxed_exposed_copper_door, waxed_exposed_copper_trapdoor, waxed_exposed_copper_grate, waxed_weathered_copper, waxed_weathered_cut_copper, waxed_weathered_cut_copper_stairs, waxed_weathered_cut_copper_slab, waxed_weathered_copper_door, waxed_weathered_copper_trapdoor, waxed_weathered_copper_grate, waxed_oxidized_copper, waxed_oxidized_cut_copper, waxed_oxidized_cut_copper_stairs, waxed_oxidized_cut_copper_slab, waxed_oxidized_copper_door, waxed_oxidized_copper_trapdoor, waxed_oxidized_copper_grate |
| Licht | 33 | lantern, soul_lantern, glowstone, sea_lantern, shroomlight, ochre_froglight, pearlescent_froglight, verdant_froglight, jack_o_lantern, candle, campfire, soul_campfire, end_rod, waxed_copper_bulb, waxed_exposed_copper_bulb, waxed_weathered_copper_bulb, waxed_oxidized_copper_bulb, white_candle, orange_candle, magenta_candle, light_blue_candle, yellow_candle, lime_candle, pink_candle, gray_candle, light_gray_candle, cyan_candle, purple_candle, blue_candle, brown_candle, green_candle, red_candle, black_candle |
| Deko | 51 | bookshelf, crafting_table, hay_block, barrel, pumpkin, carved_pumpkin, melon, flower_pot, stone_button, ladder, potted_spruce_sapling, potted_oak_sapling, potted_cherry_sapling, potted_azalea_bush, potted_flowering_azalea_bush, potted_fern, potted_poppy, potted_red_tulip, potted_white_tulip, potted_dandelion, potted_cornflower, potted_lily_of_the_valley, potted_bamboo, oak_button, spruce_button, birch_button, jungle_button, acacia_button, dark_oak_button, mangrove_button, cherry_button, pale_oak_button, bamboo_button, crimson_button, warped_button, white_carpet, orange_carpet, magenta_carpet, light_blue_carpet, yellow_carpet, lime_carpet, pink_carpet, gray_carpet, light_gray_carpet, cyan_carpet, purple_carpet, blue_carpet, brown_carpet, green_carpet, red_carpet, black_carpet |
| Natur | 38 | grass_block, dirt, coarse_dirt, rooted_dirt, dirt_path, moss_block, moss_carpet, azalea_leaves, flowering_azalea_leaves, pink_petals, vine, short_grass, fern, azalea, flowering_azalea, poppy, dandelion, cornflower, lily_of_the_valley, allium, oxeye_daisy, red_tulip, white_tulip, pink_tulip, oak_sapling, spruce_sapling, cherry_sapling, gravel, podzol, oak_leaves, spruce_leaves, birch_leaves, jungle_leaves, acacia_leaves, dark_oak_leaves, mangrove_leaves, cherry_leaves, pale_oak_leaves |
| Winter | 5 | snow_block, snow, packed_ice, blue_ice, ice |
| Holz | 133 | oak_planks, oak_log, stripped_oak_log, oak_wood, stripped_oak_wood, oak_stairs, oak_slab, oak_fence, oak_fence_gate, oak_door, oak_trapdoor, spruce_planks, spruce_log, stripped_spruce_log, spruce_wood, stripped_spruce_wood, spruce_stairs, spruce_slab, spruce_fence, spruce_fence_gate, spruce_door, spruce_trapdoor, birch_planks, birch_log, stripped_birch_log, birch_wood, stripped_birch_wood, birch_stairs, birch_slab, birch_fence, birch_fence_gate, birch_door, birch_trapdoor, jungle_planks, jungle_log, stripped_jungle_log, jungle_wood, stripped_jungle_wood, jungle_stairs, jungle_slab, jungle_fence, jungle_fence_gate, jungle_door, jungle_trapdoor, acacia_planks, acacia_log, stripped_acacia_log, acacia_wood, stripped_acacia_wood, acacia_stairs, acacia_slab, acacia_fence, acacia_fence_gate, acacia_door, acacia_trapdoor, dark_oak_planks, dark_oak_log, stripped_dark_oak_log, dark_oak_wood, stripped_dark_oak_wood, dark_oak_stairs, dark_oak_slab, dark_oak_fence, dark_oak_fence_gate, dark_oak_door, dark_oak_trapdoor, mangrove_planks, mangrove_log, stripped_mangrove_log, mangrove_wood, stripped_mangrove_wood, mangrove_stairs, mangrove_slab, mangrove_fence, mangrove_fence_gate, mangrove_door, mangrove_trapdoor, cherry_planks, cherry_log, stripped_cherry_log, cherry_wood, stripped_cherry_wood, cherry_stairs, cherry_slab, cherry_fence, cherry_fence_gate, cherry_door, cherry_trapdoor, pale_oak_planks, pale_oak_log, stripped_pale_oak_log, pale_oak_wood, stripped_pale_oak_wood, pale_oak_stairs, pale_oak_slab, pale_oak_fence, pale_oak_fence_gate, pale_oak_door, pale_oak_trapdoor, bamboo_planks, bamboo_block, stripped_bamboo_block, bamboo_mosaic, bamboo_mosaic_stairs, bamboo_mosaic_slab, bamboo_stairs, bamboo_slab, bamboo_fence, bamboo_fence_gate, bamboo_door, bamboo_trapdoor, crimson_planks, crimson_stem, stripped_crimson_stem, crimson_hyphae, stripped_crimson_hyphae, crimson_stairs, crimson_slab, crimson_fence, crimson_fence_gate, crimson_door, crimson_trapdoor, warped_planks, warped_stem, stripped_warped_stem, warped_hyphae, stripped_warped_hyphae, warped_stairs, warped_slab, warped_fence, warped_fence_gate, warped_door, warped_trapdoor |
| Stein | 158 | stone, stone_stairs, stone_slab, cobblestone, cobblestone_stairs, cobblestone_slab, cobblestone_wall, mossy_cobblestone, mossy_cobblestone_stairs, mossy_cobblestone_slab, mossy_cobblestone_wall, stone_bricks, stone_brick_stairs, stone_brick_slab, stone_brick_wall, mossy_stone_bricks, mossy_stone_brick_stairs, mossy_stone_brick_slab, mossy_stone_brick_wall, cracked_stone_bricks, chiseled_stone_bricks, smooth_stone, smooth_stone_slab, granite, granite_stairs, granite_slab, granite_wall, polished_granite, polished_granite_stairs, polished_granite_slab, diorite, diorite_stairs, diorite_slab, diorite_wall, polished_diorite, polished_diorite_stairs, polished_diorite_slab, andesite, andesite_stairs, andesite_slab, andesite_wall, polished_andesite, polished_andesite_stairs, polished_andesite_slab, deepslate, cobbled_deepslate, cobbled_deepslate_stairs, cobbled_deepslate_slab, cobbled_deepslate_wall, polished_deepslate, polished_deepslate_stairs, polished_deepslate_slab, polished_deepslate_wall, deepslate_bricks, deepslate_brick_stairs, deepslate_brick_slab, deepslate_brick_wall, cracked_deepslate_bricks, deepslate_tiles, deepslate_tile_stairs, deepslate_tile_slab, deepslate_tile_wall, cracked_deepslate_tiles, chiseled_deepslate, bricks, brick_stairs, brick_slab, brick_wall, mud_bricks, mud_brick_stairs, mud_brick_slab, mud_brick_wall, packed_mud, tuff, tuff_stairs, tuff_slab, tuff_wall, polished_tuff, polished_tuff_stairs, polished_tuff_slab, polished_tuff_wall, tuff_bricks, tuff_brick_stairs, tuff_brick_slab, tuff_brick_wall, chiseled_tuff_bricks, sandstone, sandstone_stairs, sandstone_slab, sandstone_wall, smooth_sandstone, smooth_sandstone_stairs, smooth_sandstone_slab, cut_sandstone, cut_sandstone_slab, chiseled_sandstone, red_sandstone, red_sandstone_stairs, red_sandstone_slab, red_sandstone_wall, smooth_red_sandstone, smooth_red_sandstone_stairs, smooth_red_sandstone_slab, cut_red_sandstone, cut_red_sandstone_slab, quartz_block, quartz_stairs, quartz_slab, smooth_quartz, smooth_quartz_stairs, smooth_quartz_slab, quartz_bricks, quartz_pillar, chiseled_quartz_block, calcite, prismarine, prismarine_stairs, prismarine_slab, prismarine_wall, prismarine_bricks, prismarine_brick_stairs, prismarine_brick_slab, dark_prismarine, dark_prismarine_stairs, dark_prismarine_slab, blackstone, blackstone_stairs, blackstone_slab, blackstone_wall, polished_blackstone, polished_blackstone_stairs, polished_blackstone_slab, polished_blackstone_wall, polished_blackstone_bricks, polished_blackstone_brick_stairs, polished_blackstone_brick_slab, polished_blackstone_brick_wall, chiseled_polished_blackstone, end_stone_bricks, end_stone_brick_stairs, end_stone_brick_slab, end_stone_brick_wall, purpur_block, purpur_stairs, purpur_slab, purpur_pillar, nether_bricks, nether_brick_stairs, nether_brick_slab, nether_brick_wall, red_nether_bricks, red_nether_brick_stairs, red_nether_brick_slab, red_nether_brick_wall, resin_bricks, resin_brick_stairs, resin_brick_slab, resin_brick_wall |
| Farbe | 49 | terracotta, white_wool, white_concrete, white_terracotta, orange_wool, orange_concrete, orange_terracotta, magenta_wool, magenta_concrete, magenta_terracotta, light_blue_wool, light_blue_concrete, light_blue_terracotta, yellow_wool, yellow_concrete, yellow_terracotta, lime_wool, lime_concrete, lime_terracotta, pink_wool, pink_concrete, pink_terracotta, gray_wool, gray_concrete, gray_terracotta, light_gray_wool, light_gray_concrete, light_gray_terracotta, cyan_wool, cyan_concrete, cyan_terracotta, purple_wool, purple_concrete, purple_terracotta, blue_wool, blue_concrete, blue_terracotta, brown_wool, brown_concrete, brown_terracotta, green_wool, green_concrete, green_terracotta, red_wool, red_concrete, red_terracotta, black_wool, black_concrete, black_terracotta |

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
- Unter Windows läuft `build.sh` in Git Bash (JDK 21, Maven; hinter Avast mit `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT`). So wurde der Reader am 22.10.2026 auf diesem PC gebaut und für alle Tests benutzt. Für die App selbst wird der Reader nicht gebraucht.

## Bekannte Eigenheiten von WorldEdit

Festgestellt mit den Fixtures in `tests/worldedit/fixtures-src`; der Exporter vermeidet alle diese Fälle.

- **Unbekannte Eigenschaftsnamen** verwirft WorldEdit ohne Warnung und fällt auf den Standardzustand zurück. Der Exporter schreibt deshalb nur Registry-geprüfte, vollständige Zustände, und das Harness schlägt in diesem Fall fehl.
- **Zu wenige oder zu viele VarInts** bemerkt WorldEdit nicht: Fehlende Blöcke werden zu Luft, überzählige ignoriert. Der eigene Validator prüft die Anzahl exakt.
- **Strings** müssen Javas „modified UTF-8“ sein. Der Exporter lehnt Zeichen außerhalb der BMP und NUL ab.
- **`Width`, `Height` und `Length`** müssen `TAG_Short` sein. **`Blocks`** ist für WorldEdit Pflicht.
