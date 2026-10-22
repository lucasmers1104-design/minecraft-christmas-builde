# Block-Paletten nach Baustil für einen prozeduralen Hausgenerator (Minecraft Java 1.21.11, DataVersion 4671)

> Konventionen dieser Notizen
> - Alle Block-IDs wurden gegen die 1.21.11-Blockliste geprüft: [misode/mcmeta 1.21.11-summary blocks/data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json). Am Ende der Arbeit hat ein Skript jede `minecraft:`-ID in dieser Datei gegen die Liste geprüft.
> - **L\*** ist die Helligkeit nach CIELAB (0 = schwarz, 100 = weiß). **C** ist die Buntheit (Chroma), **H** der Farbton in Grad. Ich habe diese Werte selbst berechnet, und zwar aus der Durchschnittsfarbe der Vanilla-1.21.11-Texturen in [misode/mcmeta 1.21.11-assets textures/block](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-assets/assets/minecraft/textures/block/). Das sind Primärdaten, aber nur eine **Näherung**. Ingame-Licht und Face-Shading verändern den Eindruck (Oberseiten wirken heller, Seiten dunkler), und bei Logs wurde die Seitentextur gemessen.
> - Quellenqualität: minecraft.wiki, Conquest Reforged und WesterosCraft (Build-Team-Doku) sind die stärksten Quellen. switchbladegaming.com und minecraft.how sind Blog-Guides von gemischter Qualität. Bei minecraft.how stehen teils sachliche Fehler (siehe Gaps). Mit „(nur Such-Snippet)“ markierte Aussagen stammen aus Suchmaschinen-Zusammenfassungen. Die Seite selbst konnte ich dort nicht abrufen.
> - Nicht erreichbar waren: Reddit (curl → 403), planetminecraft (403), blockpalettes.com-Listen (JS + Rate-Limit 429). Nur die Startseite mit den „Featured“-Paletten war lesbar.

---

## Frage 1: Welche Paletten empfehlen erfahrene Builder für die 13 Stile?

### Takeaway
Fast alle Quellen beschreiben dasselbe Schema. Ein **dominanter Wandblock** (oft mit 2–3 Texturvarianten gemischt) wird mit einem **kontrastierenden Rahmen/Holz** kombiniert, dazu ein **dunklerer oder farblich abgesetzter Dachblock**, ein **schwerer, dunkler Sockel** und wenige Akzente (Laternen, Trapdoors, Pflanzen). Pro Stil ändern sich vor allem die Holzart, die Stein-Familie und die Dachfarbe. Für Medieval, Rustic, Nordic, Japanese, Modern, Desert, Winter, Gothic und Steampunk sind die Belege gut. Für Fantasy/Storybook, Elven, Mediterranean, Pale Garden und Cherry sind sie dünn, dort sind die Paletten stärker abgeleitet (siehe Inferences).

### Cited Findings

#### Allgemein / Vanilla-Referenzpaletten (Mojang-Strukturen als „offizielle“ Paletten)
- Plains-Dorf: oak_planks/log/stripped_oak_log/stairs/slab/fence/door/trapdoor, cobblestone (+stairs/slab/wall), mossy_cobblestone, smooth_stone (+slab), white_terracotta, terracotta, bricks, glass_pane, white/yellow/brown_stained_glass_pane, iron_bars, hay_block, white/yellow_wool — [minecraft.wiki: Village](https://minecraft.wiki/w/Village)
- Taiga-Dorf: spruce_log/planks/stairs/trapdoor/door/fence/wood, cobblestone (+stairs/wall), mossy_cobblestone, gravel, campfire, pumpkin/jack_o_lantern, sweet_berry_bush, fern. Die Dächer sind teilweise aus spruce_log gebaut (Bildunterschrift „roofs made of spruce logs“) — [minecraft.wiki: Village](https://minecraft.wiki/w/Village)
- Snowy-Dorf: spruce_log/planks/stairs/slab/door/fence, stripped_spruce_log/wood, snow_block, snow, packed_ice, blue_ice, stone_bricks, diorite (+stairs/wall), cobblestone (+wall), smooth_stone (+slab), lantern, light_gray_wool, red/blue/white bed, red/blue carpet — [minecraft.wiki: Village](https://minecraft.wiki/w/Village)
- Desert-Dorf: sandstone (+slab/wall), smooth_sandstone (+slab/stairs), cut_sandstone, chiseled_sandstone, granite (+stairs/wall), terracotta, lime_terracotta, white/lime/light_blue_glazed_terracotta, jungle_door/trapdoor/fence/button, cactus, dead_bush — [minecraft.wiki: Village](https://minecraft.wiki/w/Village)
- Savanna-Dorf: acacia_log/planks/stairs/slab/wood/fence/door, stripped_acacia_log, orange/red/yellow_terracotta, orange/yellow_glazed_terracotta, orange/yellow/brown_stained_glass_pane, cobblestone, smooth_stone — [minecraft.wiki: Village](https://minecraft.wiki/w/Village)
- Woodland Mansion: dark_oak_log/planks/fence/door, birch_planks/stairs/slab/fence, cobblestone (+slab/stairs/wall) — [minecraft.wiki: Woodland Mansion](https://minecraft.wiki/w/Woodland_Mansion)
- Trial Chambers „bestehen größtenteils aus Kupferblöcken und tuff bricks“. Die Eingangs-Türrahmen sind aus waxed oxidized copper inklusive cut/chiseled Varianten, dazu Laufstege aus copper grates. Tuff bricks sind „primärer Decken- und Wandblock vieler Räume“ — [minecraft.wiki: Trial Chambers](https://minecraft.wiki/w/Trial_Chambers); [minecraft.wiki: Tuff Bricks](https://minecraft.wiki/w/Tuff_Bricks)
- Pale Garden: pale oak trees, pale_moss_block, pale_moss_carpet, pale_hanging_moss, eyeblossoms, creaking_heart (seit 1.21.4 ohne Experiment) — [minecraft.wiki: Pale Garden](https://minecraft.wiki/w/Pale_Garden)

#### Medieval
- Grundregel: „stone carries the structure, wood carries the warmth“. stone_bricks ist der Primär-Wandblock. Dazu kommen ca. 20–25 % cracked_stone_bricks und 10–15 % mossy_stone_bricks (konzentriert am Sockel). Für einen Turm gilt explizit 60 % stone_bricks / 25 % cracked / 15 % mossy. Spruce wirkt kühler und grauer (Cottages, Windmühlen), dark_oak schwerer und wärmer (Tavernen, Manors). Vertikale oak_log-Pfosten an den Ecken nennt der Guide das „wirkungsvollste“ Detail — [Switchblade Gaming: Medieval House Ideas](https://www.switchbladegaming.com/minecraft/medieval-house-ideas/)
- Cottage: cobblestone für das Erdgeschoss, spruce_planks für Obergeschoss und Giebel, stripped_spruce_log an allen Ecken, Dach aus spruce stairs/slabs, glass_pane, hängende Laternen. Steiles Dach 1:1. „shallow reads modern“ — [Switchblade Gaming](https://www.switchbladegaming.com/minecraft/medieval-house-ideas/)
- Schmiede: stone_bricks als Wand, cobblestone für die unteren 2 Blöcke und den Sockel („rough foundation under dressed masonry“), dark_oak_planks für Überstand und Fensterrahmen, stone_brick_stairs fürs Dach, iron_bars als Fenstergitter — [Switchblade Gaming](https://www.switchbladegaming.com/minecraft/medieval-house-ideas/)
- Manor: stone_bricks im EG, spruce_planks im OG mit einem Fachwerk-Raster aus stripped_oak_log (flush, „Tudor half-timbering“), cobblestone-Kamin, Walmdach aus stone_brick_stairs, Gartenmauer aus cobblestone_wall. Spitzbogenfenster werden als glass_pane mit einer dark_oak_trapdoor oben gebaut — [Switchblade Gaming](https://www.switchbladegaming.com/minecraft/medieval-house-ideas/)
- Ein Gurtgesims (belt course) aus tuff_bricks oder polished_andesite. Schießscharten aus dark_oak_trapdoor. Zinnen aus stone_brick_wall im Muster 2 hoch / 1 Lücke. tuff_bricks und polished_tuff „ergänzen stone bricks gut“ — [Switchblade Gaming](https://www.switchbladegaming.com/minecraft/medieval-house-ideas/)
- Dach: spruce- oder dark_oak-Stairs für einen „thatched“-Look, stone_brick_stairs für Schiefer oder Ziegel. Immer 1–2 Blöcke Überstand und ein Slab-First — [Switchblade Gaming](https://www.switchbladegaming.com/minecraft/medieval-house-ideas/)
- Zu vermeiden: acacia und bamboo, weil ihre warmen Rot- und Gelbtöne mit der kühlen, gedeckten Steinpalette kollidieren. Ebenso Wandfackeln in bewusst mittelalterlichen Builds — [Switchblade Gaming](https://www.switchbladegaming.com/minecraft/medieval-house-ideas/)
- cobblestone passt zum Frühmittelalter, stone_bricks zum Hoch- und Spätmittelalter und zu Burgen — [minecraft.wiki: Tutorial:Best building materials](https://minecraft.wiki/w/Tutorial:Best_building_materials)
- Taverne: dark_oak-Fachwerk mit stone_bricks-Sockel — [8BitToast: Minecraft House Ideas](https://8bittoast.com/minecraft-house-ideas/)

#### Fantasy / Storybook (Märchen)
- Mushroom Cottage: red_mushroom_block oder brown_mushroom_block für Dach und Wände, oak/dark_oak als Rahmen, moss, vines, flower pots, Steinkamin, Kerzen und Laternen — [8BitToast](https://8bittoast.com/minecraft-house-ideas/)
- Witch's Hut: auf Stelzen, spitzes Dach aus dark_oak, hängende Laternen, vines, soul_lantern für ein bläuliches Licht — [8BitToast](https://8bittoast.com/minecraft-house-ideas/)
- Nether-Holz (crimson/warped) hat eine ungewöhnliche Cyan/Magenta-Palette und eignet sich für „fantasy-esque wooden structures“. Purpur wirkt „magisch“ — [minecraft.wiki: Tutorial:Best building materials](https://minecraft.wiki/w/Tutorial:Best_building_materials)
- Cottage-Prinzip: Wände nicht perfekt uniform („drei oak, ein dark oak, zwei oak, ein stone“). Asymmetrische Dächer und Fenster, Trapdoor-Läden auf wechselnden Seiten, viele Blumen — [minecraft.how: Build a Cottage](https://minecraft.how/blog/post/build-cottage-minecraft)
- blockpalettes.com Featured-Palette 79136: spruce_planks, barrel, brown_mushroom_block, brown_glazed_terracotta, cyan_concrete, cyan_shulker_box — [blockpalettes.com/palette/79136](https://www.blockpalettes.com/palette/79136) (gelesen über die Startseite [blockpalettes.com](https://www.blockpalettes.com/))
- Planet Minecraft „Rustic Fantasy House“ wird in 9 Palettenvarianten angeboten. Die Seite selbst war nicht abrufbar — [planetminecraft (nur Such-Snippet)](https://www.planetminecraft.com/project/rustic-fantasy-house/)

#### Rustic / Cabin / Cottage
- Fundament aus stone, deepslate oder gravel. Wände aus oak, spruce oder dark_oak: eine Primär-Holzart, dazu Sekundärmaterial für Textur. Ein Weißputz-Effekt ist mit white_concrete möglich. Zaunpfosten alle 4–6 Blöcke als „Stützbalken“. Wände 4–5 Blöcke hoch. Dach ca. 45° mit Thatch aus hay_block, spruce stairs oder Leaves. Kamin aus 3–4 dark_oak- oder brick-Blöcken. Fenster 1 Block zurückgesetzt, trapdoor-Läden, Geländer aus spruce_fence — [minecraft.how: Build a Cottage](https://minecraft.how/blog/post/build-cottage-minecraft)
- „Cosy cottage“: oak_planks (primär) + spruce_planks (sekundär) + cobblestone (Akzent für Kamin und Sockel) + oak_leaves (Trim entlang der Dachkante) — [Switchblade Gaming: Building Tips](https://www.switchbladegaming.com/minecraft/building-tips/)
- Holzhütte: Dach aus Holz-Stairs, kleine überdachte Veranda, Steinfundament. Spruce gilt als beliebteste Rustic-Wahl. 60/30/10-Beispiel: spruce_planks primär, stone_bricks für Sockel und Kamin, dark_oak für Balken und Türrahmen — [8BitToast](https://8bittoast.com/minecraft-house-ideas/)

#### Nordic / Viking
- dark_oak und spruce sind die Hauptholzarten. Stripped-Varianten bringen Variation. Fundament dunkel (blackstone, deepslate, cobblestone oder dirt), 3–4 Blöcke tief, weil der Kontrast zwischen dunklem Fundament und hellerem Holz das Gebäude „erdet“. Kleine Fenster aus dunklem stained glass. spruce stairs/slabs brechen Flächen auf. Doppelt dicke Wände mit vertikalen Logs außen und Planks/Logs dahinter. Dach 45–50° mit Firstbalken (2–3 Logs) und 2–3 Blöcken Überstand, die unteren Dachpartien dunkler. Sichtbare Log-Stützen unter dem Überstand. Proportion 30–50 × 12–15 Blöcke, Türen versetzt — [minecraft.how: Viking Longhouse](https://minecraft.how/blog/post/viking-longhouse-minecraft-building)
- Longhouse aus stripped dark oak mit einem Thatch-Dach aus spruce stairs. Ein Nordic Village wirkt durch die einheitliche dark_oak+spruce-Palette kohärent — [8BitToast](https://8bittoast.com/minecraft-house-ideas/)
- pale oak (1.21.4) liegt tonlich zwischen birch und grauem Concrete und passt laut Guide zu Nordic-, Modern- und Coastal-Builds — [Switchblade Gaming: Building Tips](https://www.switchbladegaming.com/minecraft/building-tips/)
- Biome-gerechte Materialien: Stein und Spruce in kalten Biomen — [Switchblade Gaming: Building Tips](https://www.switchbladegaming.com/minecraft/building-tips/)

#### Japanese (traditionell)
- In traditioneller japanischer Architektur ist Holz das häufigste Material. Dächer sind gedeckt oder gedeckt-strohartig, Gebäude stehen leicht erhöht — [minecraft.wiki: Tutorial:Building a metropolis/City themes](https://minecraft.wiki/w/Tutorial:Building_a_metropolis/City_themes)
- Pagode: Struktur aus dark_oak (spruce als kühlere Alternative), Kontrast durch stone oder deepslate. Dächer klassisch aus red_terracotta + dark_oak_stairs, mit einem 1 Block hohen red_terracotta-Ring unter den Stairs als „Ziegel“. Fundament aus stone_bricks oder deepslate. Wandrhythmus 2 Logs, 1 Luft. Dachüberstand 2–3. dark_oak_trapdoors als Gitter, Laternen unter den Traufen, scaffolding als „Papierwand“ (Shoji). Jede Ebene ca. 75 % der darunterliegenden — [minecraft.how: Japanese Pagoda](https://minecraft.how/blog/post/build-japanese-pagoda-minecraft)
- Pagode: Dächer aus dark_oak- oder spruce-Stairs, Wände in „Papier-Weiß“ (white_concrete oder quartz), Schiebetüren aus Trapdoors. Dorfhaus: spruce/dark_oak-Rahmen, white_concrete-Paneele, Walmdach, Schiebetür aus iron_trapdoors, Bambusgarten — [8BitToast](https://8bittoast.com/minecraft-house-ideas/)
- dark_oak + white_concrete + deepslate_tiles als starke Kombination. Shoji aus white_stained_glass_pane oder white_wool mit spruce- oder dark_oak-Rahmen. Fundament aus stone, andesite oder smooth_stone — [ExitLag: Minecraft Japanese House (nur Such-Snippet, Seite 403)](https://www.exitlag.com/blog/minecraft-japanese-house/)
- Eine Material-Tabelle eines KI-Bau-Tools führt „Japanese | Spruce | Deepslate tiles | Dark oak“ — [skills.sh/amenti-labs/vibecraft: choosing-materials (nur Such-Snippet)](https://skills.sh/amenti-labs/vibecraft/choosing-materials)

#### Modern / Contemporary
- Helle Blöcke (white_concrete, light_gray_concrete, calcite) mit dunklen Akzenten kombinieren (blackstone, deepslate, dark_oak). smooth_stone, cut_copper (besonders weathered) und polished_blackstone geben einen „sleek, industrial“ Look. Maximal 3–4 Blocktypen. Viel Glas, Geländer aus glass_pane oder iron_bars. Dunkle Trim-Linien um Fenster und Kanten. Fundament als klares Podest 1–2 Blöcke über Gelände. Explizit nicht modern: „some deepslate + some oak“ — [minecraft.how: Build a Modern House](https://minecraft.how/blog/post/build-modern-minecraft-house)
- Modern: white_concrete (primär) + gray_concrete (sekundär) + glass (Akzent) + iron_bars (Balkone, Fenster). Flachdach nur bei modernen Builds — [Switchblade Gaming: Building Tips](https://www.switchbladegaming.com/minecraft/building-tips/)
- Modern Mansion: white_concrete, gray_concrete, dark_oak, Flachdach mit Dachterrasse. Minimal-Haus: white_concrete, glass, dark_oak, sea_lantern unter Slabs als „recessed lighting“. Brutalismus: smooth_stone, gray_concrete, iron_bars — [8BitToast](https://8bittoast.com/minecraft-house-ideas/)
- Concrete hat eine glatte, makellose Oberfläche und eignet sich für moderne Architektur. Es gibt keine Stairs oder Slabs davon. quartz_block wirkt „sehr sauber“ und hat Säulen-, Brick- und Chiseled-Varianten — [minecraft.wiki: Tutorial:Best building materials](https://minecraft.wiki/w/Tutorial:Best_building_materials)
- smooth_quartz wirkt edler (Luxus-Builds). Quarz sollte durch gröbere Texturen gebrochen werden — (nur Such-Snippets) [Sportskeeda: modern builds tips](https://sportskeeda.com/minecraft/helpful-tips-tricks-ideas-modern-minecraft-builds); [myshare-cms (Spam-Verdacht)](https://myshare-cms.siemens.com/color-palette-for-quartz-minecraft)

#### Mediterranean / Desert
- Desert/Sandstein-Palette: sandstone (primär) + smooth_sandstone (sekundär) + cut_sandstone (Akzent) + terracotta für Farbe — [Switchblade Gaming: Building Tips](https://www.switchbladegaming.com/minecraft/building-tips/)
- Sandstein eignet sich für Wüstenhäuser und ägyptische Architektur. Red sandstone und acacia erzeugen einen „Wasteland“-Eindruck — [minecraft.wiki: Tutorial:Best building materials](https://minecraft.wiki/w/Tutorial:Best_building_materials); [minecraft.wiki: City themes](https://minecraft.wiki/w/Tutorial:Building_a_metropolis/City_themes)
- Vanilla-Desert-Dorf (siehe oben): Sandstein-Familie + granite-Stairs/-Wall + jungle-Holz für Türen und Trapdoors + glasierte Terrakotta als Farbakzent — [minecraft.wiki: Village](https://minecraft.wiki/w/Village)
- Mediterranes Dach: geneigt, aus gelber, oranger und roter Terrakotta, eventuell mit red sandstone. Weiße oder helle Wände ergänzen das. Stairs und Slabs für Ziegeldetails — (nur Such-Snippet, Spam-artige Seite) [bakerroofing.com „Top 10 Minecraft Roof Designs“](https://bakerroofing.com/?p=7290)
- Ein Mediterranean-Schematic nutzt Sandsteinwände (smooth/cut/sandstone) mit einem Dach aus granite/brick — (nur Such-Snippet) [createmod.com: Medium-sized Mediterranean house](https://createmod.com/schematics/medium-sized-mediterranean-house)

#### Cherry Blossom
- Cherry wirkt „Japanese minimalist“. Kombiniert wird es mit Laternen, „Papierfenstern“ aus white_concrete und Kirschblüten in Töpfen. cherry_planks werden mit diorite oder light_gray_wool kontrastiert, alternativ mit white_concrete oder diorite für einen minimalistischen Look — [minecraft.how: Cherry Grove Guide](https://minecraft.how/blog/post/cherry-grove-biome-guide)
- Cherry-Cottage: cherry_planks, cherry_log, pinkfarbene Terrakotta, Dachlinie aus cherry_stairs, Laternen an den Überständen — [8BitToast](https://8bittoast.com/minecraft-house-ideas/)
- Dunkles Dach (dark_prismarine oder deepslate_tiles) „verankert“ die hellrosa Wände. Weiße Materialien (quartz, white_wool, white_concrete) verhindern, dass das Pink dominiert. stripped_cherry_log/cherry_log für Balken und Eckpfosten — (nur Such-Snippet, Spam-artige Seite) [slbubble.studentbridge.com „Cherry Blossom House“](https://slbubble.studentbridge.com/celebnews014/7-breathtaking-cherry-blossom-house-minecraft-designs-for-a-perfect-pink-aesthetic-2024-o5jys.html)
- blockpalettes.com Featured 81906: bamboo_block, cherry_planks, stripped_cherry_log, green_wool (+ zwei Blöcke, die es in 1.21.11 nicht gibt) — [blockpalettes.com/palette/81906](https://www.blockpalettes.com/palette/81906)

#### Dark / Gothic
- Kathedrale: stone_bricks als Basis, variiert mit stone, deepslate oder andesite. Dach in „Schieferfarben“ aus blackstone, deepslate_tiles oder vorsichtig dark_oak, „nichts zu Helles“. Bunte Glasfenster in Mustern statt einfarbig. Strebepfeiler alle 8–12 Blöcke, 2–3 tief, nach oben verjüngt. Turmspitzen aus dunklen Blöcken. soul_lantern für mysteriöses Licht. Warnung: 90 % stone_bricks wirkt flach — [minecraft.how: Build a Cathedral](https://minecraft.how/blog/post/build-cathedral-minecraft)
- Ein Gothic-Cathedral-Schematic hat als größte Posten deepslate_bricks (1150), deepslate_tiles (1141), deepslate_brick_stairs (459) und dark_oak_slab (352) — (nur Such-Snippet) [mc-mod.net: Medieval Gothic Cathedral](https://www.mc-mod.net/schematics/medieval-gothic-cathedral/)
- Blackstone eignet sich für „dark or evil“-Builds, gilded_blackstone für „Gier/Gold unter der Oberfläche“. Nether bricks wirken „sinister“ — [minecraft.wiki: Tutorial:Best building materials](https://minecraft.wiki/w/Tutorial:Best_building_materials)
- „Dark and spooky“: black_concrete, black_concrete_powder, black_wool, blackstone, polished_blackstone_bricks, sculk. „Black and red“: chiseled_polished_blackstone, polished_blackstone_bricks, polished_blackstone, black_glazed_terracotta, crimson_stem, nether_wart_block. „Dark grey“: stone_bricks, polished_blackstone_bricks, deepslate_bricks, deepslate, deepslate_tiles, obsidian — [Sportskeeda: 10 best block palettes](https://www.sportskeeda.com/minecraft/best-block-palettes-next-minecraft-build)
- Spukvilla: stone_bricks + cracked + mossy, cobwebs, vines, „Schutt“ aus Stairs, soul_lantern — [8BitToast](https://8bittoast.com/minecraft-house-ideas/)

#### Pale Garden (pale oak, 1.21.4+)
- pale oak ist ein weiß-grauer Holzton zwischen birch und grauem Concrete und passt zu Nordic, Modern und Coastal, wo ein helles Holz ohne den Gelbstich von birch gebraucht wird — [Switchblade Gaming: Building Tips](https://www.switchbladegaming.com/minecraft/building-tips/)
- blockpalettes.com Featured-Paletten mit pale oak oder Pale-Garden-Blöcken:
  - 81518: pale_oak_planks, pale_oak_log, stripped_pale_oak_log, deepslate_bricks, orange_stained_glass (+1 Block, den es in 1.21.11 nicht gibt) — [blockpalettes.com/palette/81518](https://www.blockpalettes.com/palette/81518)
  - 67702: mushroom_stem, pale_oak_leaves, quartz_block, pale_oak_log, bone_block, light_gray_terracotta — [blockpalettes.com/palette/67702](https://www.blockpalettes.com/palette/67702)
  - 82034: pale_moss_block, tuff_bricks, cyan_terracotta, iron_bars, polished_tuff, white_concrete — [blockpalettes.com/palette/82034](https://www.blockpalettes.com/palette/82034)
  - 81820: pale_oak_planks, stripped_pale_oak_log, calcite, polished_andesite (+2 Blöcke, die es in 1.21.11 nicht gibt) — [blockpalettes.com/palette/81820](https://www.blockpalettes.com/palette/81820)
- Resin bricks (1.21.4, gleiches Drop wie der Pale Garden) haben slab, stairs, wall und eine chiseled-Variante — [minecraft.wiki: Resin Bricks](https://minecraft.wiki/w/Resin_Bricks)

#### Steampunk / Industrial (Kupfer)
- Frisches Kupfer hat einen warmen Ton und passt zu concrete, dark_oak und Stein. Für Gothic- und Steampunk-Ästhetik eignet es sich mit Ketten, Kesseln und Laternen („reads as mechanical“). Kupferdächer altern von orange zu türkis, Waxing (Honeycomb) friert die Stufe ein — [minecraft.how: Copper Uses Guide](https://minecraft.how/blog/post/minecraft-copper-uses-guide)
- Waxed copper gibt es in jeder Oxidationsstufe, dazu copper doors und trapdoors. copper_bulb ist eine Lichtquelle, die mit der Oxidation schwächer wird: Wax fixiert die Lichtstärke. copper_grate ist hohl und lässt Licht durch (Gitter, Lüftung) — [Switchblade Gaming: Building Tips](https://www.switchbladegaming.com/minecraft/building-tips/)
- Lichtstärken des copper_bulb: unoxidized 15, exposed 12, weathered 8, oxidized 4. Er schaltet per Redstone-Puls um und braucht keine Dauerversorgung — [minecraft.wiki: Copper Bulb](https://minecraft.wiki/w/Copper_Bulb)
- Trial Chambers als Mojang-Referenz: Kupfer + tuff_bricks. Laufstege aus copper_grate, Türen aus copper_door — [minecraft.wiki: Trial Chambers](https://minecraft.wiki/w/Trial_Chambers)
- Industrial-Stadt: „grimy metal and stone“ — [minecraft.wiki: City themes](https://minecraft.wiki/w/Tutorial:Building_a_metropolis/City_themes)
- copper_lantern (alle Oxidationsstufen) kam in 1.21.9. Seit 1.21.9 gibt es copper_chain, und der alte Block `chain` heißt jetzt **iron_chain** — [minecraft.wiki: Copper Lantern](https://minecraft.wiki/w/Copper_Lantern); [minecraft.wiki: Chain](https://minecraft.wiki/w/Chain)

#### Elven / Nature
- High Elven: quartz als Hauptblock, alternativ white_concrete, „white stone“ oder smooth_stone. Holz aus oak, spruce oder birch. Spitze Dächer aus Stairs und Slabs. Gärten, vines und leaves für eine magische Wirkung — (nur Such-Snippets, Spam-artige Seiten) [arktimes „High Elven House“](https://001.arktimes.com/?p=4170)
- „Lush green and woody“: flowering_azalea_leaves, lime_terracotta, green_terracotta, mossy_cobblestone, stripped_dark_oak_log, spruce_planks. „Stony and woody green“: green_terracotta, moss_block, cobblestone, mossy_cobblestone, oak_planks, stripped_oak_log — [Sportskeeda: 10 best block palettes](https://www.sportskeeda.com/minecraft/best-block-palettes-next-minecraft-build)
- blockpalettes.com Featured 79134: birch_log, calcite, diorite, lime_stained_glass, slime_block, verdant_froglight — [blockpalettes.com/palette/79134](https://www.blockpalettes.com/palette/79134)
- Greenhouse: glass_pane + iron_bars, moss-Boden, glow berries, azalea bushes, hanging roots — [8BitToast](https://8bittoast.com/minecraft-house-ideas/)

#### Winter / Christmas
- spruce ist der „golden standard“ für Schneehütten, weil es dunkel genug für Kontrast zu Schnee ist. dark_oak geht auch, ist aber schwerer. acacia „absolutely not“. Wände aus snow_block, gebrochen durch spruce_planks, spruce_log an den Ecken und spruce_trapdoor als Läden. Fundament aus stone oder deepslate, leicht erhöht. Dach aus spruce-Slabs als First und abwechselnd Slabs und Stairs, darauf 2–3 Schneeschichten. Überstand 1–2. glass_pane mit spruce-Rahmen, Hängelaternen. Weg aus snow blocks im Wechsel mit dunklen Holz-Slabs. Veranda mit Log-Stützen, spruce_fence — [minecraft.how: Snow Cabin](https://minecraft.how/blog/post/how-build-snow-cabin-minecraft)
- Snowy-Dorf als Vanilla-Referenz: spruce + snow_block + packed_ice/blue_ice + diorite-Stairs/-Wall + stone_bricks + lantern + rote Betten und Teppiche — [minecraft.wiki: Village](https://minecraft.wiki/w/Village)
- „Frozen“-Stadt: snow und Eisformen. Normales `ice` wird nicht empfohlen, weil es bei Licht schmilzt — [minecraft.wiki: City themes](https://minecraft.wiki/w/Tutorial:Building_a_metropolis/City_themes)
- Weihnachtsakzente: rot-weißes stained glass für „Zuckerstangen“-Details. glowstone oder sea_lantern als „Lichterketten“. Winterpalette mit spruce_planks und kühlen Wollfarben (eisblau, frostweiß, softgrau) — (nur Such-Snippets, Spam-artige Seiten) [cdn.dji.nl winter build tips](https://cdn.dji.nl/social-clips/minecraft-winter-haus-build-tips-1769517533); [ggservers: prepare Minecraft for Christmas](https://ggservers.com/blog/prepare-minecraft-for-christmas/?amp=1)

### Inferences

**Hinweis:** Die folgenden Rollen-Paletten sind meine Synthese aus den oben zitierten Quellen. Jede Zeile nennt in Klammern, woher die Wahl stammt. Gewichte sind Vorschläge für den Zufallsmix innerhalb einer Rolle (Summe 100). L\*-Werte stammen aus meiner Texturanalyse (siehe Frage 3). Rollen: `foundation` = Sockel/Plinthe, `wall` = Hauptwand, `wall_accent` = Füllung/Akzent, `frame` = Pfosten/Balken, `roof` = Dachfläche (muss Stairs/Slabs haben), `roof_trim` = First/Ortgang/Traufe, `window`, `door`, `details`, `blends` = Texturmischungen.

```yaml
medieval:   # Quellen: Switchblade Medieval, minecraft.wiki Best materials, Village (plains/taiga)
  foundation: [[minecraft:cobblestone,60],[minecraft:mossy_cobblestone,25],[minecraft:stone,15]]
  foundation_trim: [minecraft:cobblestone_stairs, minecraft:stone_brick_stairs]     # umgedrehte Stairs als Sockelkante
  wall_stone: [[minecraft:stone_bricks,60],[minecraft:cracked_stone_bricks,25],[minecraft:mossy_stone_bricks,15]]  # mossy nur unten
  wall_timber_upper: [[minecraft:spruce_planks,100]]          # alt: minecraft:dark_oak_planks (Taverne/Manor)
  frame: [minecraft:stripped_spruce_log, minecraft:oak_log, minecraft:stripped_dark_oak_log, minecraft:stripped_oak_log]
  belt_course: [minecraft:tuff_bricks, minecraft:polished_andesite]
  roof: [minecraft:spruce_stairs, minecraft:dark_oak_stairs, minecraft:stone_brick_stairs]   # Holz = "Thatch", Stein = Schiefer
  roof_trim: [minecraft:spruce_slab, minecraft:dark_oak_slab, minecraft:stone_brick_slab]   # Firstkappe
  window: [minecraft:glass_pane, minecraft:iron_bars, minecraft:dark_oak_trapdoor]
  door: [minecraft:spruce_door, minecraft:dark_oak_door]
  details: [minecraft:lantern, minecraft:barrel, minecraft:hay_block, minecraft:cobblestone_wall, minecraft:stone_brick_wall, minecraft:flower_pot, minecraft:campfire]
  forbid: [minecraft:acacia_planks, minecraft:bamboo_planks, minecraft:wall_torch]

fantasy_storybook:   # Quellen: 8BitToast (mushroom cottage, witch hut), wiki Best materials (Nether-Holz/purpur), minecraft.how Cottage; Rest = Ableitung
  foundation: [[minecraft:cobblestone,45],[minecraft:mossy_cobblestone,35],[minecraft:moss_block,20]]   # Moos-Gradient nach unten
  wall: [[minecraft:white_terracotta,60],[minecraft:mushroom_stem,40]]      # "Putz"-Optik, warmweiß (L* 75/80) – Ableitung
  wall_accent: [minecraft:oak_planks, minecraft:spruce_planks]
  frame: [minecraft:stripped_dark_oak_log, minecraft:dark_oak_log, minecraft:spruce_log]
  roof_variant_mushroom: [minecraft:red_mushroom_block, minecraft:brown_mushroom_block]   # Vollblöcke, keine Stairs!
  roof_variant_stairs: [minecraft:dark_oak_stairs, minecraft:crimson_stairs, minecraft:warped_stairs, minecraft:mangrove_stairs]
  roof_trim: [minecraft:dark_oak_slab, minecraft:spruce_slab]
  chimney: [minecraft:bricks, minecraft:cobblestone, minecraft:stone_bricks]
  window: [minecraft:glass_pane, minecraft:spruce_trapdoor]    # Läden asymmetrisch
  door: [minecraft:spruce_door, minecraft:dark_oak_door]
  details: [minecraft:vine, minecraft:moss_carpet, minecraft:flower_pot, minecraft:lantern, minecraft:soul_lantern, minecraft:candle, minecraft:azalea, minecraft:glow_lichen]

rustic_cabin:   # Quellen: minecraft.how Cottage/Snow cabin, Switchblade "cosy cottage", 8BitToast
  foundation: [[minecraft:cobblestone,50],[minecraft:stone,30],[minecraft:mossy_cobblestone,20]]   # alt: minecraft:cobbled_deepslate
  wall: [[minecraft:spruce_planks,70],[minecraft:oak_planks,20],[minecraft:dark_oak_planks,10]]   # "nicht perfekt uniform"
  frame: [minecraft:spruce_log, minecraft:dark_oak_log, minecraft:stripped_dark_oak_log]
  wall_posts: [minecraft:spruce_fence]          # alle 4–6 Blöcke als Stützbalken
  roof: [minecraft:spruce_stairs, minecraft:dark_oak_stairs]
  roof_thatch_alt: [minecraft:hay_block]
  roof_trim: [minecraft:spruce_slab, minecraft:oak_leaves]   # Laub als Dachkante (Switchblade); Leaves persistent=true!
  chimney: [minecraft:bricks, minecraft:cobblestone, minecraft:stone_bricks]
  window: [minecraft:glass_pane, minecraft:spruce_trapdoor]   # Fenster 1 Block zurückgesetzt
  door: [minecraft:spruce_door, minecraft:oak_door]
  details: [minecraft:spruce_fence, minecraft:lantern, minecraft:barrel, minecraft:composter, minecraft:flower_pot, minecraft:wildflowers]

nordic_viking:   # Quellen: minecraft.how Viking Longhouse, 8BitToast, Village (taiga), Switchblade (pale oak)
  foundation: [[minecraft:cobbled_deepslate,40],[minecraft:blackstone,30],[minecraft:cobblestone,30]]  # 3–4 tief, dunkel
  wall: [[minecraft:spruce_planks,60],[minecraft:dark_oak_planks,40]]
  frame: [minecraft:spruce_log, minecraft:dark_oak_log, minecraft:stripped_spruce_log, minecraft:stripped_dark_oak_log]  # vertikal außen
  roof: [[minecraft:spruce_stairs,70],[minecraft:dark_oak_stairs,30]]   # dark_oak bevorzugt in den unteren Reihen
  roof_ridge: [minecraft:spruce_log, minecraft:dark_oak_log]          # 2–3 Logs entlang des Firsts, axis entlang Firstrichtung
  roof_trim: [minecraft:spruce_slab, minecraft:dark_oak_slab]
  window: [minecraft:gray_stained_glass_pane, minecraft:brown_stained_glass_pane]   # klein, dunkel
  door: [minecraft:spruce_door, minecraft:dark_oak_door]
  details: [minecraft:lantern, minecraft:campfire, minecraft:spruce_trapdoor, minecraft:barrel, minecraft:moss_carpet]
  light_variant: {wall: minecraft:pale_oak_planks, frame: minecraft:pale_oak_log, roof: minecraft:dark_oak_stairs}   # "Modern Nordic"

japanese:   # Quellen: minecraft.how Pagoda, 8BitToast, wiki City themes, ExitLag-/vibecraft-Snippets
  foundation: [[minecraft:stone_bricks,50],[minecraft:smooth_stone,30],[minecraft:andesite,20]]   # erhöht (1–2 Blöcke)
  wall: [[minecraft:white_concrete,70],[minecraft:smooth_quartz,30]]   # alt: minecraft:calcite (rauer)
  wall_shoji: [minecraft:white_stained_glass_pane, minecraft:scaffolding, minecraft:white_wool]
  frame: [minecraft:dark_oak_log, minecraft:stripped_dark_oak_log, minecraft:spruce_log, minecraft:stripped_spruce_log]
  roof: [minecraft:deepslate_tile_stairs, minecraft:dark_oak_stairs, minecraft:spruce_stairs]
  roof_trim: [minecraft:deepslate_tile_slab, minecraft:dark_oak_slab]   # Traufe: umgedrehte Stairs für "geschwungene" Enden
  roof_variant_pagoda: {roof: minecraft:dark_oak_stairs, tile_ring: minecraft:red_terracotta}
  window: [minecraft:spruce_trapdoor, minecraft:dark_oak_trapdoor, minecraft:iron_trapdoor]   # Gitter bzw. Schiebetür
  door: [minecraft:spruce_door, minecraft:dark_oak_door, minecraft:bamboo_door]
  details: [minecraft:lantern, minecraft:bamboo_fence, minecraft:stone_brick_wall, minecraft:cherry_leaves, minecraft:moss_carpet]

modern:   # Quellen: minecraft.how Modern, Switchblade Tips, 8BitToast, wiki Best materials
  foundation: [minecraft:smooth_stone, minecraft:polished_deepslate, minecraft:gray_concrete]   # klares Podest +1..2
  wall: [[minecraft:white_concrete,100]]               # alt: minecraft:smooth_quartz (Luxus), minecraft:calcite
  wall_accent: [minecraft:light_gray_concrete, minecraft:gray_concrete, minecraft:dark_oak_planks, minecraft:waxed_weathered_cut_copper]
  frame: [minecraft:black_concrete, minecraft:polished_blackstone, minecraft:gray_concrete, minecraft:stripped_dark_oak_log]   # Trim-Linien
  roof: flat
  roof_trim: [minecraft:smooth_stone_slab, minecraft:smooth_quartz_slab, minecraft:polished_blackstone_slab]
  window: [minecraft:glass, minecraft:glass_pane, minecraft:tinted_glass, minecraft:gray_stained_glass_pane]
  door: [minecraft:iron_door, minecraft:dark_oak_door]
  railing: [minecraft:glass_pane, minecraft:iron_bars]
  details: [minecraft:sea_lantern, minecraft:lantern, minecraft:flower_pot]   # sea_lantern unter Slabs = "recessed lighting"
  brutalist_variant: [minecraft:smooth_stone, minecraft:gray_concrete, minecraft:iron_bars]

desert:   # Quellen: Village (desert), Switchblade Tips, wiki Best materials
  foundation: [minecraft:cut_sandstone, minecraft:sandstone]
  wall: [[minecraft:sandstone,50],[minecraft:smooth_sandstone,35],[minecraft:cut_sandstone,15]]
  wall_accent: [minecraft:chiseled_sandstone, minecraft:terracotta, minecraft:white_glazed_terracotta, minecraft:light_blue_glazed_terracotta, minecraft:lime_glazed_terracotta]
  frame: [minecraft:cut_sandstone, minecraft:smooth_sandstone, minecraft:stripped_jungle_log]
  roof: flat   # mit Brüstung
  roof_trim: [minecraft:smooth_sandstone_slab, minecraft:sandstone_slab, minecraft:smooth_sandstone_stairs, minecraft:sandstone_wall]
  window: [minecraft:glass_pane, minecraft:jungle_trapdoor]
  door: [minecraft:jungle_door]
  details: [minecraft:granite_wall, minecraft:granite_stairs, minecraft:potted_cactus, minecraft:dead_bush, minecraft:decorated_pot, minecraft:hay_block]

mediterranean:   # Quellen: Terrakotta-Dach-Snippet, Mediterranean-Schematic-Snippet, Village (savanna/desert); stark abgeleitet
  foundation: [minecraft:stone_bricks, minecraft:sandstone, minecraft:polished_andesite]
  wall: [[minecraft:white_concrete,50],[minecraft:calcite,30],[minecraft:smooth_quartz,20]]   # alt warm: minecraft:smooth_sandstone, minecraft:white_terracotta
  frame: [minecraft:stripped_oak_log, minecraft:smooth_sandstone, minecraft:cut_sandstone]
  roof: [[minecraft:brick_stairs,50],[minecraft:granite_stairs,30],[minecraft:red_sandstone_stairs,20]]   # "Terrakotta-Ziegel"; nur Familien mit Stairs
  roof_trim: [minecraft:brick_slab, minecraft:smooth_red_sandstone_slab, minecraft:mud_brick_slab]
  roof_fill_full_blocks: [minecraft:terracotta, minecraft:orange_terracotta, minecraft:red_terracotta]   # nur Giebel/Füllung, keine Stairs!
  window: [minecraft:glass_pane, minecraft:warped_trapdoor]    # blau-grüne "Fensterläden" (Ableitung)
  door: [minecraft:spruce_door, minecraft:warped_door]
  details: [minecraft:decorated_pot, minecraft:flower_pot, minecraft:vine, minecraft:lantern, minecraft:light_blue_glazed_terracotta]

cherry:   # Quellen: minecraft.how Cherry Grove, 8BitToast, Cherry-Snippet, blockpalettes 81906
  foundation: [minecraft:stone_bricks, minecraft:polished_deepslate, minecraft:deepslate_bricks]
  wall: [[minecraft:cherry_planks,60],[minecraft:white_concrete,40]]   # alt: minecraft:calcite, minecraft:diorite
  frame: [minecraft:cherry_log, minecraft:stripped_cherry_log, minecraft:dark_oak_log]   # cherry_log-Rinde ist sehr dunkel (L* 16) → guter Rahmen
  roof: [minecraft:deepslate_tile_stairs, minecraft:dark_oak_stairs, minecraft:cherry_stairs]
  roof_trim: [minecraft:deepslate_tile_slab, minecraft:cherry_slab]
  window: [minecraft:glass_pane, minecraft:white_stained_glass_pane, minecraft:cherry_trapdoor]
  door: [minecraft:cherry_door]
  details: [minecraft:cherry_leaves, minecraft:pink_petals, minecraft:lantern, minecraft:flower_pot, minecraft:bamboo_fence, minecraft:pink_terracotta]

gothic_dark:   # Quellen: minecraft.how Cathedral, mc-mod Schematic-Snippet, Sportskeeda, wiki Best materials
  foundation: [[minecraft:polished_blackstone_bricks,50],[minecraft:cobbled_deepslate,30],[minecraft:blackstone,20]]
  wall: [[minecraft:deepslate_bricks,55],[minecraft:deepslate_tiles,20],[minecraft:cracked_deepslate_bricks,15],[minecraft:polished_deepslate,10]]
  wall_alt_lighter: [[minecraft:stone_bricks,60],[minecraft:andesite,20],[minecraft:cobbled_deepslate,20]]   # Kathedrale "stone brick baseline"
  frame: [minecraft:polished_blackstone, minecraft:polished_basalt, minecraft:dark_oak_log, minecraft:stripped_dark_oak_log]
  buttress: [minecraft:deepslate_brick_stairs, minecraft:deepslate_brick_wall]
  roof: [minecraft:deepslate_tile_stairs, minecraft:blackstone_stairs, minecraft:dark_oak_stairs]
  roof_trim: [minecraft:dark_oak_slab, minecraft:polished_blackstone_brick_slab, minecraft:deepslate_tile_slab]
  window: [minecraft:red_stained_glass_pane, minecraft:purple_stained_glass_pane, minecraft:blue_stained_glass_pane, minecraft:iron_bars, minecraft:tinted_glass]
  door: [minecraft:dark_oak_door, minecraft:iron_door]
  details: [minecraft:soul_lantern, minecraft:iron_chain, minecraft:candle, minecraft:cobweb, minecraft:polished_blackstone_wall, minecraft:gilded_blackstone]

pale_garden:   # Quellen: blockpalettes 81518/67702/82034/81820, Switchblade, wiki Pale Garden/Resin Bricks; Rest abgeleitet
  foundation: [[minecraft:deepslate_bricks,50],[minecraft:tuff_bricks,30],[minecraft:pale_moss_block,20]]
  wall: [[minecraft:pale_oak_planks,80],[minecraft:stripped_pale_oak_log,20]]   # sehr hell, kühl (L* 88/95)
  wall_accent: [minecraft:calcite, minecraft:mushroom_stem, minecraft:bone_block, minecraft:polished_tuff]
  frame: [minecraft:pale_oak_log, minecraft:stripped_dark_oak_log]    # graue Rinde (L* 34) = natürlicher Kontrast
  roof: [minecraft:deepslate_tile_stairs, minecraft:tuff_brick_stairs, minecraft:pale_oak_stairs]
  roof_trim: [minecraft:pale_oak_slab, minecraft:deepslate_tile_slab]
  accent_warm: [minecraft:resin_bricks, minecraft:chiseled_resin_bricks, minecraft:resin_brick_stairs]   # Komplementär-Orange, sparsam ≤10 %
  window: [minecraft:glass_pane, minecraft:light_gray_stained_glass_pane, minecraft:orange_stained_glass_pane, minecraft:iron_bars]
  door: [minecraft:pale_oak_door]
  details: [minecraft:pale_hanging_moss, minecraft:pale_moss_carpet, minecraft:potted_open_eyeblossom, minecraft:resin_clump, minecraft:pale_oak_trapdoor, minecraft:soul_lantern]

steampunk_industrial:   # Quellen: wiki Trial Chambers/Copper Bulb/Copper Lantern/Chain, minecraft.how Copper, Switchblade, wiki City themes
  foundation: [minecraft:polished_blackstone_bricks, minecraft:deepslate_bricks, minecraft:tuff_bricks]
  wall: [[minecraft:bricks,60],[minecraft:tuff_bricks,40]]   # alt: minecraft:polished_tuff; bricks = Ableitung "Fabrik"
  wall_accent: [minecraft:waxed_cut_copper, minecraft:waxed_exposed_cut_copper, minecraft:waxed_chiseled_copper]
  frame: [minecraft:stripped_dark_oak_log, minecraft:dark_oak_planks, minecraft:polished_blackstone]
  roof: [[minecraft:waxed_weathered_cut_copper_stairs,50],[minecraft:waxed_oxidized_cut_copper_stairs,30],[minecraft:waxed_exposed_cut_copper_stairs,20]]
  roof_trim: [minecraft:waxed_cut_copper_slab, minecraft:waxed_oxidized_cut_copper_slab]
  window: [minecraft:waxed_copper_grate, minecraft:glass_pane, minecraft:iron_bars, minecraft:waxed_copper_bars]
  door: [minecraft:waxed_copper_door, minecraft:iron_door]
  details: [minecraft:waxed_copper_bulb, minecraft:waxed_copper_lantern, minecraft:iron_chain, minecraft:waxed_copper_chain, minecraft:waxed_lightning_rod, minecraft:cauldron, minecraft:hopper, minecraft:waxed_copper_trapdoor, minecraft:barrel]

elven_nature:   # Quellen dünn: High-Elven-Snippet, Sportskeeda Grün-Paletten, blockpalettes 79134; überwiegend Ableitung
  foundation: [[minecraft:mossy_stone_bricks,50],[minecraft:mossy_cobblestone,30],[minecraft:moss_block,20]]
  wall: [[minecraft:calcite,50],[minecraft:smooth_quartz,30],[minecraft:diorite,20]]
  wall_accent: [minecraft:birch_planks, minecraft:stripped_birch_log]
  frame: [minecraft:birch_log, minecraft:stripped_birch_log, minecraft:oak_log]
  roof: [minecraft:waxed_oxidized_cut_copper_stairs, minecraft:prismarine_stairs, minecraft:mossy_stone_brick_stairs, minecraft:warped_stairs]   # grün-türkis
  roof_overlay: [minecraft:azalea_leaves, minecraft:flowering_azalea_leaves, minecraft:moss_carpet]   # persistent=true
  window: [minecraft:glass_pane, minecraft:lime_stained_glass_pane]
  door: [minecraft:birch_door]
  details: [minecraft:vine, minecraft:glow_lichen, minecraft:spore_blossom, minecraft:hanging_roots, minecraft:flowering_azalea, minecraft:verdant_froglight, minecraft:ochre_froglight, minecraft:lantern]

winter_christmas:   # Quellen: minecraft.how Snow Cabin, Village (snowy), wiki City themes; Weihnachtsakzente = Snippets + Ableitung
  foundation: [[minecraft:stone_bricks,50],[minecraft:cobblestone,30],[minecraft:cobbled_deepslate,20]]
  foundation_trim: [minecraft:diorite_stairs, minecraft:diorite_wall, minecraft:stone_brick_stairs]
  wall: [[minecraft:spruce_planks,80],[minecraft:stripped_spruce_log,20]]    # Variante: minecraft:snow_block-Wände mit spruce-Unterbrechungen
  frame: [minecraft:spruce_log, minecraft:stripped_spruce_log, minecraft:dark_oak_log]
  roof: [minecraft:spruce_stairs, minecraft:dark_oak_stairs, minecraft:deepslate_tile_stairs]
  roof_trim: [minecraft:spruce_slab]
  roof_snow: {block: minecraft:snow, layers: [2,3]}          # auf Slabs/Stairs-Oberseiten
  window: [minecraft:glass_pane, minecraft:spruce_trapdoor]
  door: [minecraft:spruce_door]
  accent_red: [minecraft:red_wool, minecraft:red_concrete, minecraft:red_candle, minecraft:red_carpet]
  accent_green: [minecraft:spruce_leaves, minecraft:green_wool]   # Girlanden: leaves mit persistent=true
  accent_gold: [minecraft:gold_block, minecraft:bell, minecraft:lantern]
  ice: [minecraft:packed_ice, minecraft:blue_ice]                   # nicht minecraft:ice (schmilzt)
  lights: [minecraft:lantern, minecraft:sea_lantern, minecraft:glowstone, minecraft:white_candle]
  ground: [minecraft:snow_block, minecraft:spruce_slab]           # Weg: Schnee im Wechsel mit dunklen Holz-Slabs
```

- Medieval, Rustic, Nordic und Winter teilen sich das Grundgerüst „spruce/dark_oak + grauer Stein + dunkles Holzdach“. Ein Generator kann sie als eine Familie mit Parametern modellieren: Holzhelligkeit, Moos-Anteil, Schnee-Overlay.
- Japanese, Cherry, Modern und Pale Garden teilen sich „sehr helle Wand (L\* > 75) + sehr dunkler Rahmen/Dach (L\* < 35)“. Das ist ein Hochkontrast-Archetyp.
- Desert ist ein **Niedrigkontrast**-Stil: Die Sandsteinvarianten liegen bei L\* 82–86. Er lebt von Texturvarianten und Formen und braucht dunklere Akzente (terracotta L\* 46, jungle L\* 52).
- Gothic ist ebenfalls niedrigkontrastig, aber dunkel (deepslate_bricks L\* 30, deepslate_tiles 23, polished_blackstone_bricks 18). Kontrast entsteht dort über Licht (Laternen) und farbiges Glas.

### Gaps
- Direkte Paletten von Grian, Mythical Sausage, BdoubleO100, fWhip, Jerac und Goodtimeswithscar habe ich nicht gefunden. Keine Suche lieferte Transkripte oder Artikel mit deren konkreten Block-Listen.
- Fantasy/Storybook, Elven, Mediterranean und Pale Garden: Es gibt keine hochwertige Primärquelle mit vollständiger Rollen-Palette. Die YAML-Einträge sind dort weitgehend Ableitungen und sollten ingame getestet werden.
- Reddit (r/Minecraftbuilds) war per curl gesperrt (403), blockpalettes.com-Listen nur per JS und mit Rate-Limit 429. Häufigkeitsdaten zur Popularität („welche Blöcke werden am häufigsten kombiniert“) liegen daher nicht vor. Eine Seite mit Paar-Statistiken aus blockpalettes (blocks-0w3d.onrender.com, laut Snippet „62.839 Paletten“) lieferte 404.

---

## Frage 2: Welche Holz + Stein + Dach-Kombinationen gelten als harmonisch, und was sind typische Anfängerfehler?

### Takeaway
Harmonisch sind Kombinationen mit **gleicher Temperatur und unterschiedlicher Textur**, einem **deutlich dunkleren oder farblich abgesetzten Dach** und einem **dunklen Sockel**. Die häufigsten Fehler sind ein Material für alles (z. B. nur oak_planks oder nur cobblestone), flache Wände, ein Dach im gleichen Material wie die Wand ohne Überstand, zu viele konkurrierende Blöcke und zufälliges „Splattering“.

### Cited Findings
- Paletten-Blöcke sollen einen ähnlichen Ton (warm oder kalt) haben, aber in der Textur variieren. Vor dem Bauen wird ein 5×5-Teststück platziert, und alles, was „kämpft“, wird ausgetauscht — [Switchblade Gaming: Building Tips](https://www.switchbladegaming.com/minecraft/building-tips/)
- Häufigster Anfängerfehler: ein Block für den ganzen Bau. Zweithäufigster: flache Wände. Das Dach soll ein anderes Material sein, eine echte Neigung haben und mindestens 2 Blöcke überstehen. Beispiele für Kontrast: „dark oak stairs on a stone brick build, spruce stairs on an oak plank cottage“ — [Switchblade Gaming: Building Tips](https://www.switchbladegaming.com/minecraft/building-tips/)
- Medieval: Der häufigste Fehler ist „palette chaos – too many competing materials with no hierarchy“. Acacia und bamboo kollidieren mit kühlem Stein — [Switchblade Gaming: Medieval](https://www.switchbladegaming.com/minecraft/medieval-house-ideas/)
- „Never build an entire wall in one block type“. Ecken sollen in einem anderen Block als die Wand gebaut werden (cobblestone-Pfeiler an Holzwand, stone_brick-Säule an cobblestone-Wand). glass_pane statt voller glass-Blöcke — [Switchblade Gaming: How to Build a House](https://www.switchbladegaming.com/minecraft/how-to-build-a-house/)
- Der typische erste Bau ist ein flaches Rechteck aus einem Block, „probably oak planks or cobblestone“. Ein Block auf großen Flächen ist „one of the biggest mistakes“. 3–5 Blöcke sind der „sweet spot“: zu wenige wirken flach, zu viele „like a junk pile“ — (nur Such-Snippets) [mc-mod.net: common mistakes new builders make](https://www.mc-mod.net/common-mistakes-new-builders-make/); [gamertagmythras: Building Tips](https://gamertagmythras.com/blog/minecraft/minecraft-building-tips)
- Weniger Blöcke verbessern die Qualität eines Builds („using fewer blocks improves the quality appearance of a build“) — [minecraft.wiki: City themes](https://minecraft.wiki/w/Tutorial:Building_a_metropolis/City_themes)
- Ohne bewusste Materialwahl wirkt das Ergebnis „strange at best and unappealing/haphazard at worst“ — [minecraft.wiki: Best building materials](https://minecraft.wiki/w/Tutorial:Best_building_materials)
- Modern-Fehler: „some deepslate + some oak“ ist „not modern, just plain“ — [minecraft.how: Modern](https://minecraft.how/blog/post/build-modern-minecraft-house)
- Kathedralen-Fehler: „Material saturation kills visual interest“ (90 % stone_bricks). Ein zu hohes Dach im Verhältnis zu den Wänden wirkt kopflastig — [minecraft.how: Cathedral](https://minecraft.how/blog/post/build-cathedral-minecraft)
- Schneehütten-Fehler: das nächstbeste Holz nehmen. Acacia „absolutely not“. Flache Dächer „look wrong“ — [minecraft.how: Snow Cabin](https://minecraft.how/blog/post/how-build-snow-cabin-minecraft)
- Gebäude über ca. 15×15 sehen mit einem einfachen Dach zunehmend „barnlike“ aus und brauchen mehrere Dachsektionen. Dachhöhe 1–2 Geschosse. Die Neigung folgt der Niederschlagsmenge: 63,4° mit Doppelblöcken, 45° mit Stairs, 22,5° mit abwechselnd Slab oben/unten — [minecraft.wiki: Roof construction guidelines](https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines)
- Belegte harmonische Kombinationen (Holz | Stein | Dach):
  - spruce | cobblestone + stone_bricks | spruce_stairs (Medieval-Cottage) — [Switchblade Medieval](https://www.switchbladegaming.com/minecraft/medieval-house-ideas/)
  - dark_oak | cobblestone | spruce_stairs (Taverne) — [Switchblade Medieval](https://www.switchbladegaming.com/minecraft/medieval-house-ideas/)
  - spruce_planks + stripped_oak_log | stone_bricks + cobblestone | stone_brick_stairs (Manor) — [Switchblade Medieval](https://www.switchbladegaming.com/minecraft/medieval-house-ideas/)
  - dark_oak + spruce | blackstone/deepslate/cobblestone | spruce + dunklere untere Reihen (Viking) — [minecraft.how Viking](https://minecraft.how/blog/post/viking-longhouse-minecraft-building)
  - spruce | snow_block + stone/deepslate | spruce_slab/stairs + Schnee (Winter) — [minecraft.how Snow Cabin](https://minecraft.how/blog/post/how-build-snow-cabin-minecraft)
  - dark_oak | white_concrete + stone_bricks | deepslate_tiles oder dark_oak_stairs (Japan) — [minecraft.how Pagoda](https://minecraft.how/blog/post/build-japanese-pagoda-minecraft); [ExitLag (Snippet)](https://www.exitlag.com/blog/minecraft-japanese-house/)
  - dark_oak + birch | cobblestone | dark_oak (Woodland Mansion) — [minecraft.wiki: Woodland Mansion](https://minecraft.wiki/w/Woodland_Mansion)
  - oak | cobblestone + smooth_stone + white_terracotta | oak_stairs (Plains-Dorf) — [minecraft.wiki: Village](https://minecraft.wiki/w/Village)
  - acacia | terracotta (orange/rot/gelb) | acacia_stairs (Savanna-Dorf) — [minecraft.wiki: Village](https://minecraft.wiki/w/Village)
  - deepslate + calcite (hoher Kontrast), deepslate + tuff (tonale Tiefe). Struktur: ein Anker (deepslate oder sandstone), ein Akzent (cherry oder bamboo_mosaic), ein Detail (calcite oder smooth_quartz) — (nur Such-Snippet) [craftdex: best blocks for building](https://craftdex.net/de/best/best-blocks-for-building)

### Inferences
- Wand-zu-Rahmen- und Wand-zu-Dach-Helligkeitsabstände der belegten Kombinationen (L\* aus meiner Texturanalyse):
  - Medieval: stone_bricks 51 / spruce_planks 38 (ΔL ≈ 13) / dark_oak_planks 20 (ΔL ≈ 31).
  - Japan: white_concrete 85 / dark_oak_log 20 (ΔL ≈ 65) / deepslate_tiles 23 (ΔL ≈ 62).
  - Winter: snow_block 99 / spruce_planks 38 (ΔL ≈ 61) / spruce_log 17.
  - Viking: spruce_planks 38 / dark_oak_planks 20 / blackstone 15. Die Abstände sind klein, Kontrast entsteht über Holz gegen Stein-Textur.
  - Cherry: cherry_planks 77 / white_concrete 85. ΔL ≈ 8 ist **zu wenig**, deshalb brauchen Cherry-Builds einen dunklen Rahmen oder ein dunkles Dach (cherry_log 16, deepslate_tiles 23).

  Für Code ergibt sich daraus als Faustregel: Mindestens eine der Rollen frame oder roof sollte ΔL ≥ 15 zur Hauptwand haben. Bei hellen Wänden (L\* > 75) sollte das Dach L\* < 40 haben. Das ist eine Ableitung, keine Quellenregel.
- Temperatur-Klassen für einen Harmonie-Check: Warmes Holz liegt bei H ≈ 60–95° (oak, spruce, birch, jungle, bamboo, dark_oak). Cherry und Mangrove sind rötlich (H ≈ 18–32°). Pale oak ist fast neutral (C < 5). Stein-Grautöne sind neutral (C < 1). Tuff und Moos-Varianten sind leicht grünlich (H ≈ 115–155°). Acacia (C ≈ 46, H ≈ 52) und Bamboo (C ≈ 49) sind die **gesättigtsten** Hölzer. Das erklärt, warum Quellen sie in Medieval- und Winter-Builds ablehnen: Neben gedecktem Stein (C < 1) springen sie heraus.
- Anti-Pattern-Regeln für den Generator:
  1. Nie eine Rolle mit nur einem Block füllen, wenn die Fläche > ~20 Blöcke ist.
  2. Dachmaterial ≠ Wandmaterial.
  3. Dachüberstand ≥ 1 (besser 2).
  4. Ecken und Pfosten in Rahmenmaterial.
  5. Maximal 5 Hauptblöcke + 1 Akzent.
  6. acacia und bamboo nicht in medieval, nordic oder winter.
  7. Fenster als `glass_pane`, 1 Block zurückgesetzt.

### Gaps
- Es gibt keine quantitative Studie (z. B. Umfrage oder Paletten-Statistik), welche Kombinationen am beliebtesten sind. Die Paarstatistik-Seite war offline.
- „oak_planks + cobblestone only“ als Fehler ist nur über Such-Snippets belegt, nicht über eine abrufbare Primärquelle.

---

## Frage 3: Welche Textur-Blends und Gradienten werden empfohlen, und welche Blöcke eignen sich als Übergang?

### Takeaway
Builder arbeiten mit **geordneten Hell-→-Dunkel-Paletten** und wenden sie **schrittweise** an: Nachbarn in der Palette berühren sich, Stufen werden nicht übersprungen. Das passiert als „Drip“ (vertikal, Wetter- oder Wasserspuren) oder als „Cluster“ (unregelmäßige Kleckse). Zufälliges Streuen („Splattering“) und horizontales Schichten („Sandwiching“) gelten als Fehler. Dunkles kommt nach unten, an Öffnungen, Ecken und Traufen, Helles nach oben. Die Reihenfolge richtet sich zuerst nach Helligkeit, dann nach Farbe, dann nach Textur.

### Cited Findings
- Ein Gradient ist ein Übergang von einem Helligkeits- oder Farbwert zum anderen. Splattering (zufälliges Streuen) „rarely looks good“. Blöcke sollen „successively“ wechseln, also Rot nicht neben Gelb. Übersprungene Stufen nur sparsam als Akzent für stärkeren Kontrast. Diagonale Treppchen sind ein häufiger Fehler und wirken bei Übermaß splattery. Cluster-Gradienten mit variierender Größe, Form und Position vermeiden Reihen und Spalten — [Conquest Reforged: Gradienting your Builds](https://www.conquestreforged.com/guides/gradients)
- Blockwahl: Die Blöcke sollen in **Helligkeit, Farbe und Form** möglichst nah beieinander liegen. Bei Steinwänden wird mit minimalem Kontrast zwischen Nachbarblöcken von hell nach dunkel gearbeitet. Dächer bekommen Drip-Gradienten dort, wo Regen sich sammelt. Unter Fenstern wird die Wand dunkler (Wassertropf-Spuren). Hellere Kanten um Bögen definieren deren Form. Selektive Gradienten machen Tiefenstufen und Zinnen lesbar. Moos wird über dunklere Elemente in die Wand geführt — [Conquest Reforged](https://www.conquestreforged.com/guides/gradients)
- Eine Palette ist eine geordnete Liste von hell nach dunkel mit 3 bis über 20 Elementen. Die Reihenfolge richtet sich nach **Helligkeit (wichtigster Faktor)**, dann Farbe (Unterton), dann Textur. Drei Fehler: **Splattering** (Stufe übersprungen), **Smallpox** (fleckig, zu flache Palette), **Sandwiching** (horizontale Sediment-Schichten). Standardmuster ist ein radialer Cluster mit dem hellsten Kern am Blickfang. Verwitterung gehört an Öffnungen, Ecken, Basen und Traufen — [WesterosCraft Docs: Gradients](https://westeroscraft.com/docs/building/fundamentals/gradients)
- Gradient = 3–4 Blöcke derselben Farbe in verschiedenen Schattierungen, hell→dunkel angeordnet. Ähnliche Blöcke nebeneinander sehen nah gut aus, sind aus der Distanz aber schwer zu unterscheiden — [minecraft.wiki: Tutorial:Color palette](https://minecraft.wiki/w/Tutorial:Color_palette)
- Hellere Farben gehören weiter nach oben, damit das Auge nach oben gezogen wird — [minecraft.wiki: Best building materials](https://minecraft.wiki/w/Tutorial:Best_building_materials)
- Dunkelste Blöcke unten, Mitteltöne in der Mitte, hell oben, wie Licht von oben — (nur Such-Snippet) [mc-mod.net](https://www.mc-mod.net/?p=517409)
- Konkrete Mischungen: stone_bricks 60 / cracked 25 / mossy 15, mossy konzentriert an der Basis. mossy_cobblestone für ärmere oder verfallene Bauten — [Switchblade Medieval](https://www.switchbladegaming.com/minecraft/medieval-house-ideas/)
- Viking-Dach: unten dunklere Blöcke einmischen, stripped wood stellenweise — [minecraft.how Viking](https://minecraft.how/blog/post/viking-longhouse-minecraft-building)
- Kupfer altert in 4 Stufen: unoxidized (orange) → exposed → weathered (grünlich) → oxidized (türkis). Wax friert die Stufe ein, eine Axt entfernt das Wachs — [minecraft.how: Copper](https://minecraft.how/blog/post/minecraft-copper-uses-guide)
- Tuff-Familie: tuff, polished_tuff und tuff_bricks gemischt erzeugen Tiefe ohne Materialwechsel. polished_tuff als Wand, tuff als Trim — [minecraft.how: Tuff Guide](https://minecraft.how/blog/post/tuff-minecraft-building-guide) (Vorsicht: Der Artikel erwähnt „deepslate tuff“-Blöcke, die es in 1.21.11 **nicht** gibt.)
- Gemessene Texturhelligkeit (CIELAB L\*, Chroma C, Farbton H), berechnet aus den 1.21.11-Texturen [mcmeta 1.21.11-assets](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-assets/assets/minecraft/textures/block/). Auszug, sortiert hell→dunkel:

| Block | L\* | C | H° | Block | L\* | C | H° |
|---|---|---|---|---|---|---|---|
| snow_block | 99.4 | 1.8 | 200 | stone_bricks | 51.2 | 0.5 | 324 |
| stripped_pale_oak_log | 94.7 | 2.8 | 32 | mossy_stone_bricks | 50.0 | 9.6 | 123 |
| smooth_quartz | 91.8 | 4.1 | 75 | cracked_stone_bricks | 49.6 | 0.5 | 324 |
| quartz_bricks | 91.2 | 4.3 | 82 | mossy_cobblestone | 48.5 | 14.2 | 123 |
| bone_block | 89.7 | 9.5 | 101 | granite | 48.1 | 23.7 | 46 |
| calcite | 89.2 | 2.0 | 120 | packed_mud | 48.0 | 23.1 | 63 |
| pale_oak_planks | 87.6 | 3.7 | 29 | dripstone_block | 47.6 | 15.0 | 56 |
| birch_log (Seite) | 86.0 | 2.5 | 97 | bricks | 46.8 | 26.3 | 41 |
| smooth_sandstone | 85.5 | 23.2 | 99 | pale_moss_block | 46.7 | 5.0 | 138 |
| white_concrete | 84.9 | 2.2 | 213 | mud_bricks | 46.6 | 21.5 | 63 |
| cut_sandstone | 82.8 | 24.9 | 98 | tuff | 45.8 | 3.9 | 116 |
| sandstone | 81.8 | 25.5 | 96 | terracotta | 45.8 | 32.5 | 50 |
| mushroom_stem | 79.6 | 6.3 | 87 | polished_tuff | 43.4 | 3.7 | 156 |
| polished_diorite | 78.1 | 0.8 | 288 | moss_block | 43.4 | 37.8 | 120 |
| cherry_planks | 76.9 | 19.1 | 31 | tuff_bricks | 42.9 | 4.8 | 133 |
| diorite | 76.4 | 0.3 | 309 | stripped_spruce_log | 40.0 | 26.1 | 78 |
| white_terracotta | 74.9 | 15.5 | 55 | spruce_planks | 38.4 | 27.0 | 73 |
| birch_planks | 71.8 | 30.0 | 93 | oak_log (Seite) | 37.9 | 24.3 | 78 |
| bamboo_planks | 70.8 | 49.5 | 95 | polished_basalt | 37.6 | 2.0 | 294 |
| stripped_cherry_log | 67.2 | 28.4 | 18 | red_terracotta | 36.7 | 42.4 | 37 |
| smooth_stone | 65.4 | 0.0 | – | deepslate | 34.2 | 1.5 | 290 |
| stripped_oak_log | 61.7 | 35.8 | 82 | pale_oak_log (Seite) | 33.9 | 4.8 | 40 |
| oxidized_copper | 61.3 | 32.9 | 166 | cobbled_deepslate | 33.0 | 2.1 | 291 |
| weathered_copper | 59.1 | 29.9 | 144 | mangrove_planks | 31.1 | 32.1 | 31 |
| andesite | 56.8 | 0.3 | – | polished_deepslate | 30.9 | 0.4 | – |
| oak_planks | 56.5 | 33.0 | 81 | deepslate_bricks | 30.1 | 0.2 | – |
| polished_andesite | 56.0 | 1.1 | – | cracked_deepslate_bricks | 27.5 | 0.2 | – |
| resin_block | 55.9 | 72.6 | 54 | stripped_dark_oak_log | 25.1 | 16.1 | 76 |
| exposed_copper | 55.5 | 20.1 | 58 | deepslate_tiles | 23.0 | 0.2 | – |
| copper_block | 54.5 | 43.3 | 44 | polished_blackstone | 20.9 | 5.9 | 312 |
| cut_copper | 54.2 | 42.7 | 43 | dark_oak_planks | 19.9 | 20.7 | 67 |
| cobblestone | 53.4 | 0.3 | – | polished_blackstone_bricks | 18.2 | 5.7 | 319 |
| stone | 52.6 | 0.0 | – | spruce_log (Seite) | 17.1 | 19.0 | 67 |
| jungle_planks | 52.3 | 29.3 | 62 | cherry_log (Seite) | 15.9 | 13.0 | 345 |
| resin_bricks | 52.1 | 70.4 | 52 | blackstone | 14.9 | 4.9 | 332 |
| red_sandstone | 51.4 | 60.1 | 60 | nether_bricks | 10.5 | 12.2 | 9 |
| acacia_planks | 46.9 | 46.4 | 52 | black_concrete | 2.9 | 2.4 | – |

(Die vollständige Tabelle mit 134 Blöcken ist reproduzierbar: Mittelwert der deckenden Pixel der jeweiligen Textur, sRGB → CIELAB D65. Bei animierten Texturen wurde der erste Frame genommen.)

### Inferences
- **Gradient-Sequenzen für Code** (hell → dunkel, Nachbarn ΔL meist ≤ 6 und ähnlicher Farbton). Basis sind die gemessenen L\*-Werte und die Regel „Helligkeit > Farbe > Textur“ (WesterosCraft):
  - *Neutraler Stein (Ziegelform)*: `quartz_bricks (91) → [Lücke] → stone_bricks (51) → cracked_stone_bricks (50) → tuff_bricks (43) → deepslate_bricks (30) → cracked_deepslate_bricks (27.5) → polished_blackstone_bricks (18)`. Zwischen quartz_bricks und stone_bricks fehlt ein Ziegel-Block mittlerer Helligkeit, dort polished_diorite/diorite (76–78) einsetzen (Formbruch).
  - *Neutraler Stein (glatt/roh)*: `calcite (89) → polished_diorite (78) / diorite (76) → smooth_stone (65) → andesite (57) / polished_andesite (56) → cobblestone (53) / stone (53) → tuff (46) → polished_tuff (43) → polished_basalt (38) → deepslate (34) / cobbled_deepslate (33) → polished_deepslate (31) → deepslate_tiles (23) → polished_blackstone (21) → blackstone (15)`.
  - *Moos/Verwitterung (Sockel nach oben auslaufend)*: `moss_block (43, C38) → mossy_cobblestone (48.5, C14) → mossy_stone_bricks (50, C10) → stone_bricks (51) / cracked_stone_bricks`. Die Helligkeit bleibt fast gleich, es ist ein **Chroma-Gradient** (grün → grau).
  - *Pale-Garden-Moos*: `pale_moss_block (46.7, C5, H138)` liegt in Helligkeit und Farbton fast exakt auf `tuff (45.8, H116)` und `tuff_bricks (42.9, H133)`. Damit ist er ein nahtloser Übergangsblock zwischen Tuff und Pale-Garden-Boden.
  - *Holz*: `stripped_pale_oak_log (95) → pale_oak_planks (88) → cherry_planks (77, rosa) → birch_planks (72) → stripped_oak_log (62) → oak_planks (56.5) → jungle_planks (52) → stripped_spruce_log (40) → spruce_planks (38) → mangrove_planks (31, rot) → stripped_dark_oak_log (25) → dark_oak_planks (20) → spruce_log (17)`. Für Dachgradienten (unten dunkler, laut Viking-Guide) eignen sich `spruce_stairs → dark_oak_stairs`.
  - *Warme Erde / Desert → Lehm*: `smooth_sandstone (85.5) → cut_sandstone (83) → sandstone (82) → white_terracotta (75) → [Lücke] → packed_mud (48) / dripstone_block (47.6) / mud_bricks (46.6) / granite (48) → bricks (47) → terracotta (46) → brown_terracotta (24)`.
  - *Kupfer-Patina*: `cut_copper (54, H43) → exposed_cut_copper (54, H59, C19) → weathered_cut_copper (57, H142) → oxidized_cut_copper (58, H166)`. Fast **konstante Helligkeit**, reiner Farbton-Gradient. Laut Conquest-Dachregel gehört Patina an Stellen, wo Wasser abläuft (Traufe, Kehlen, unter Firsten). Für dauerhafte Ergebnisse die `waxed_*`-Varianten setzen.
  - *Orange-Akzent*: `resin_bricks (52, C70)` passt in der Helligkeit zu `red_sandstone (51)`, `cut_red_sandstone (52)` und `stone_bricks (51)`. Es ist ein Farbakzent ohne Helligkeitssprung und lässt sich gut als Band in Grau einsetzen.
- **Übergangsblöcke (bridge blocks)**:
  - andesite/polished_andesite: stone ↔ diorite.
  - Tuff-Familie: stone_bricks ↔ deepslate_bricks.
  - cobbled_deepslate: cobblestone ↔ deepslate.
  - mossy_*: Stein ↔ Moos/Gras.
  - packed_mud/mud_bricks/dripstone_block: Sandstein-Beige ↔ Ziegelbraun.
  - exposed_copper: frisches ↔ grünes Kupfer.
  - Stripped Logs: Planks ↔ Rinde.
  - pale_moss_block: Tuff ↔ Pale Garden.
  - gravel bzw. coarse_dirt als Bodenübergang am Sockel (Ableitung; Quellen nennen gravel und Kies-Wege).
- **Algorithmische Umsetzung** (Ableitung aus Conquest und WesterosCraft):
  1. Palette als sortiertes Array nach L\*.
  2. Ein „Weathering-Feld“ pro Wand berechnen: Höhe (unten = dunkel), Nähe zu Öffnungen und Ecken, Drip-Streifen unter Fenstern, Traufe.
  3. Feldwert per Schwelle auf einen Palettenindex abbilden, mit Rauschen auf den **Schwellen** (cluster-artig), nicht pro Block.
  4. Sicherstellen, dass benachbarte Blöcke sich maximal um 1 Index unterscheiden. Ausnahme: seltene Akzent-Sprünge.
  5. Keine horizontalen Bänder gleicher Indexe (Anti-Sandwiching).
  6. Niedrigkontrast-Sets (z. B. stone/andesite, Grasvarianten) dürfen gestreut werden. Conquest nennt das als einzige akzeptable Splatter-Ausnahme.

### Gaps
- Die L\*-Werte sind Textur-Mittelwerte und keine gerenderten Ingame-Werte. Face-Shading (Oben/Seite/Unten), Biome-Tint (Leaves, Gras) und Texturkontrast (Standardabweichung) ändern die Wahrnehmung. Vor allem Logs (Seite gegen Stirnseite) und stark gemusterte Blöcke (birch_log sd ≈ 20) weichen ab.
- Für Dach-Gradienten mit Stairs fehlen in mehreren Helligkeitsbereichen Stairs-Familien (z. B. kein calcite-, terracotta- oder concrete-Stairs), deshalb sind Stairs-Gradienten auf die Familien in Frage 6 begrenzt.

---

## Frage 4: Welche Farbtheorie-Regeln nutzen Builder?

### Takeaway
Die Kernregeln sind 3–5 Hauptblöcke plus 1 Akzent, eine feste Rollenverteilung (≈ 60/30/10 oder 50/30/20) und gleiche Farbtemperatur bei unterschiedlicher Textur. Wichtiger als der Farbton ist der **Helligkeitskontrast** zwischen Wand, Rahmen und Dach. Komplementärfarben (z. B. Orange gegen Blaugrau oder Türkis) dienen nur als kleiner Akzent.

### Cited Findings
- 3–5 komplementäre Blöcke. Rollen: Primary 50 % (Wände), Secondary 30 % (ähnlicher Ton, andere Oberfläche), Accent 20 % (Ecken, Trims, Highlights). Ähnlicher Ton (warm oder kalt), aber unterschiedliche Textur — [Switchblade Gaming: Building Tips](https://www.switchbladegaming.com/minecraft/building-tips/)
- 60/30/10: Primärblock 60 %, Sekundär 30 % für Details, Akzent 10 % für Trim, Fenster und Möbel — [8BitToast](https://8bittoast.com/minecraft-house-ideas/); identisch in [vibecraft „choosing-materials“: Primary 60 % Walls / Secondary 30 % Roof, accents, trim / Detail 10 %](https://skills.sh/amenti-labs/vibecraft/choosing-materials)
- Modern: maximal 3–4 Blocktypen, helle Blöcke gegen dunkle Akzente, „clean visual separation without chaos“ — [minecraft.how: Modern](https://minecraft.how/blog/post/build-modern-minecraft-house)
- Ein Rahmen, der sich in Farbe **und** Textur abhebt (z. B. oak_log statt Planks), macht die Struktur lesbar. Kontrast ist bei der Blockwahl zu prüfen. Ähnliche Blöcke verschwimmen aus der Distanz — [minecraft.wiki: Tutorial:Color palette](https://minecraft.wiki/w/Tutorial:Color_palette)
- Helligkeit ist der wichtigste Faktor beim Ordnen einer Palette, danach Farbe, danach Textur — [WesterosCraft: Gradients](https://westeroscraft.com/docs/building/fundamentals/gradients)
- Dach in kontrastierendem Material, damit die Dachlinie auch aus der Distanz lesbar ist — [Switchblade Gaming: Building Tips](https://www.switchbladegaming.com/minecraft/building-tips/)
- Dunkles Fundament gegen helleres Holz „erdet“ den Bau — [minecraft.how: Viking](https://minecraft.how/blog/post/viking-longhouse-minecraft-building)
- Komplementärfarben liefern den höchsten Kontrast. Graus lassen sich als kühl, warm oder neutral einordnen. Haupt- und Sekundärfarbe sollten mindestens 3 Schattierungen als Minecraft-Blöcke haben — (nur Such-Snippets) [mc-mod.net](https://www.mc-mod.net/?p=517409); [ghostnet.vcu.edu (Spam-Verdacht)](https://ghostnet.vcu.edu/most-downloaded-minecraft-building-tips-right-now-most-players-miss)
- Kontrastpaare als Beispiele: dried_kelp_block + bone_block, amethyst_block + warped_planks — [minecraft.wiki: Tutorial:Color palette](https://minecraft.wiki/w/Tutorial:Color_palette)
- Bei glatten Flächen (Quarz) zusätzlich gröbere Texturen einsetzen. Varianten wie quartz_bricks oder chiseled_quartz_block bringen Detail — (nur Such-Snippet) [myshare-cms.siemens.com (Spam-Verdacht)](https://myshare-cms.siemens.com/color-palette-for-quartz-minecraft)

### Inferences
- **Regelsatz für den Generator** (abgeleitet):
  1. `count(main_blocks) ∈ [3,5]`, `count(accent) ≤ 1–2`.
  2. Flächenanteile Wand ≈ 50–60 %, Rahmen/Dach/Sockel ≈ 30 %, Akzent ≤ 10–20 %.
  3. Hauptblöcke innerhalb einer Temperaturklasse: warmes Holz H 50–100°, Stein neutral C < 6, rötliche Hölzer H 15–35°.
  4. Mindestens ein Helligkeitssprung ΔL ≥ 15 zwischen Wand und Rahmen oder Dach (siehe die gemessenen Beispiele in Frage 2).
  5. Akzent darf hohe Sättigung haben (C > 40, z. B. resin_bricks C70, gold_block C73, red_wool C59, waxed_copper_block C43), aber nur ≤ 10 % Fläche.
  6. Komplementär-Akzent nach Stil: Pale Garden (neutral-grau) mit resin-Orange; Gothic (neutral-dunkel) mit roten oder violetten Glasfenstern; Winter (spruce-braun + weiß) mit Rot und Gold; Steampunk (Kupferorange) mit Patina-Türkis.
  7. Helligkeitsverlauf vertikal: Sockel dunkler als Wand, Wand heller nach oben. Ausnahme: dunkle Dächer, die als Masse bewusst „schwer“ wirken sollen (Kathedrale „roof should feel heavy“, Japan, Cherry).
- Ein Generator sollte pro Stil eine „Kontrast-Signatur“ speichern, etwa `{wall_L, frame_L, roof_L}` aus den YAML-Paletten. Abgeleitete Zufallspaletten lassen sich damit validieren, bevor sie gebaut werden.

### Gaps
- Keine primäre Quelle bei bekannten YouTube-Buildern konnte bestätigt werden. Die 50/30/20- und 60/30/10-Regeln stammen aus Blog-Guides und sind dort nicht empirisch belegt.
- Schwellenwerte wie „ΔL ≥ 15“ sind meine Ableitung aus wenigen gemessenen Beispielen und nicht quellenbelegt.

---

## Frage 5: Welche neueren Blöcke (1.20–1.21.x) sind heute in Paletten beliebt?

### Takeaway
Tuff (1.21), Kupfer-Dekoblöcke (1.21 Grates, Bulbs, Doors, Trapdoors, Chiseled; 1.21.9 Lanterns, Chains, Bars), Cherry und Bamboo (1.20), Pale Oak und Pale Moss sowie Resin (1.21.4) und Mud bricks (1.19) tauchen in aktuellen Guides und Featured-Paletten auf. Beliebtheitsdaten in Zahlen habe ich nicht gefunden. In 1.21.11 heißt `chain` jetzt `iron_chain`. Community-Seiten führen bereits Blöcke aus Versionen nach 1.21.11, ein Generator muss daher gegen die Zielversion validieren.

### Cited Findings
- Tuff-Familie: tuff_bricks, polished_tuff und chiseled_tuff „fill a gap that stone brick has occupied“, etwas dunkler und variabler. Passend für Medieval und Burgen, mit Stairs, Slabs und Walls. Chiseled tuff als Akzent an Säulen und Türrahmen — [Switchblade Gaming: Building Tips](https://www.switchbladegaming.com/minecraft/building-tips/)
- tuff_bricks wurden in 1.21 offiziell (vorher Experiment ab 1.20.3). Stonecutter-Produkte: chiseled_tuff_bricks, tuff_brick_slab, tuff_brick_stairs, tuff_brick_wall — [minecraft.wiki: Tuff Bricks](https://minecraft.wiki/w/Tuff_Bricks)
- Kupfer-Familie: waxed copper in allen Stufen für Patina-Effekte, copper doors und trapdoors, copper_bulb (Licht nach Oxidation), copper_grate (hohl, lichtdurchlässig) — [Switchblade Gaming: Building Tips](https://www.switchbladegaming.com/minecraft/building-tips/); [minecraft.wiki: Copper Bulb](https://minecraft.wiki/w/Copper_Bulb)
- 1.21.9: copper_lantern (4 Oxidationsstufen), copper_chain, Umbenennung `chain` → `iron_chain` — [minecraft.wiki: Copper Lantern](https://minecraft.wiki/w/Copper_Lantern); [minecraft.wiki: Chain](https://minecraft.wiki/w/Chain)
- Resin bricks (1.21.4) mit slab, stairs, wall und chiseled — [minecraft.wiki: Resin Bricks](https://minecraft.wiki/w/Resin_Bricks)
- Pale oak (1.21.4) für Nordic, Modern und Coastal — [Switchblade Gaming: Building Tips](https://www.switchbladegaming.com/minecraft/building-tips/); Pale-Garden-Blöcke — [minecraft.wiki: Pale Garden](https://minecraft.wiki/w/Pale_Garden)
- Cherry: einziges natürlich rosa Holz, Standard für Frühlings- und Sakura-Builds. Japan-Builds und Cherry-Cottages sind laut 8BitToast 2026 die dominante Ästhetik — (Snippet) [craftdex](https://craftdex.net/de/best/best-blocks-for-building); [8BitToast](https://8bittoast.com/minecraft-house-ideas/)
- „Muddy Mangrove“-Palette: mangrove_planks, stripped_mangrove_log, netherrack, packed_mud, brown_mushroom_block, mud_bricks — [Sportskeeda: 10 best block palettes](https://www.sportskeeda.com/minecraft/best-block-palettes-next-minecraft-build)
- blockpalettes.com Featured (Stand Okt. 2026) enthält pale_oak_*, pale_moss_block, tuff_bricks, polished_tuff, cherry_planks, stripped_cherry_log und bamboo_block. Daneben stehen poplar_*-, cinnabar_*- und sulfur-Blöcke, die es in 1.21.11 **nicht** gibt — [blockpalettes.com](https://www.blockpalettes.com/) (Paletten 81518, 81820, 81881, 81906, 81945, 82034); Abgleich mit [mcmeta 1.21.11 data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Die minecraft.wiki-Seiten führen bereits Versionen „26.2“ und „26.3“ mit neuen Blöcken (z. B. sulfur cube interagiert mit resin/tuff bricks). Quellen ab 2026 können also Blöcke nennen, die in 1.21.11 fehlen — [minecraft.wiki: Resin Bricks](https://minecraft.wiki/w/Resin_Bricks); [minecraft.wiki: Tuff Bricks](https://minecraft.wiki/w/Tuff_Bricks)
- In 1.21.11 vorhandene neuere Exterieur-Details (Existenz geprüft): `minecraft:leaf_litter` (facing, segment_amount 1–4), `minecraft:wildflowers`, `minecraft:bush`, `minecraft:firefly_bush`, `minecraft:cactus_flower`, `minecraft:pink_petals` (flower_amount 1–4), `minecraft:pale_hanging_moss` (tip), `minecraft:resin_clump`, `minecraft:*_shelf` für alle Holzarten, `minecraft:copper_bars`, `minecraft:copper_torch`, `minecraft:lightning_rod` (+Oxidationsstufen) — [mcmeta 1.21.11 data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)

### Inferences
- Neuere Blöcke nach Rolle:
  - Tuff: Mittelton-Stein und Gurtgesims.
  - Resin: gesättigter Orange-Akzent, gleich hell wie stone_bricks.
  - Pale oak: neutral-helles Holz als Ersatz für birch ohne Gelbstich.
  - Cherry: rosa Holz, braucht dunklen Kontrast.
  - Bamboo/bamboo_mosaic: gelb und sehr gesättigt, nur Akzent.
  - Kupfer: Dach, Details, Licht.
  - Mud bricks/packed_mud: warmer Mittelton für Desert und Mediterranean.
- Kupfer im Generator immer als `waxed_*` setzen. Sonst oxidiert es nach dem Platzieren weiter, und der Look sowie (bei copper_bulb) die Lichtstärke ändern sich. Leuchtende Bulbs per State `lit=true` platzieren. Der Bulb braucht keine Dauerversorgung.
- Version-Gate: Jede Palette sollte beim Laden gegen die Blockliste der Zielversion geprüft werden (`data.json`). Community-Quellen (blockpalettes, minecraft.how mit „26.x“-Bezug) enthalten Blöcke außerhalb von 1.21.11.

### Gaps
- Keine Zahlen zur Beliebtheit neuer Blöcke in Paletten, weil die blockpalettes-Statistikseite nicht erreichbar war.
- Die Einführungsversion von leaf_litter, wildflowers, bush, firefly_bush und cactus_flower habe ich nicht separat auf minecraft.wiki geprüft. Bestätigt ist nur ihre Existenz in 1.21.11.

---

## Frage 6: Welche Blockfamilien haben Stairs-, Slab- und Wall-Varianten?

### Takeaway
Dächer können nur aus Familien mit **Stairs** gebaut werden. Viele beliebte Wandblöcke haben keine: calcite, alle concretes und terracottas, packed_mud, smooth_stone (nur Slab), cut_sandstone (nur Slab), quartz_bricks, basalt-Varianten, dripstone_block, snow_block, Eisblöcke, moss_block (nur Carpet), Kupfer-Vollblock (nur cut_copper hat Stairs und Slabs), logs. Holz hat nie Walls. Kupfer hat keine Walls.

### Cited Findings
- Vollständige Liste der Familien mit `_stairs`/`_slab`/`_wall` in 1.21.11, aus [mcmeta 1.21.11 data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json) extrahiert. Präfix ist die ID ohne Suffix. Achtung: Der Familienname weicht oft vom Vollblock ab (z. B. `stone_brick_stairs` ↔ `stone_bricks`, `brick_stairs` ↔ `bricks`, `deepslate_tile_stairs` ↔ `deepslate_tiles`):

| Familie (Präfix) | Vollblock | stairs | slab | wall |
|---|---|---|---|---|
| stone | stone | ✓ | ✓ | – |
| cobblestone | cobblestone | ✓ | ✓ | ✓ |
| mossy_cobblestone | mossy_cobblestone | ✓ | ✓ | ✓ |
| stone_brick | stone_bricks | ✓ | ✓ | ✓ |
| mossy_stone_brick | mossy_stone_bricks | ✓ | ✓ | ✓ |
| smooth_stone | smooth_stone | – | ✓ | – |
| andesite / diorite / granite | andesite / diorite / granite | ✓ | ✓ | ✓ |
| polished_andesite / polished_diorite / polished_granite | polished_* | ✓ | ✓ | – |
| tuff | tuff | ✓ | ✓ | ✓ |
| polished_tuff | polished_tuff | ✓ | ✓ | ✓ |
| tuff_brick | tuff_bricks | ✓ | ✓ | ✓ |
| cobbled_deepslate | cobbled_deepslate | ✓ | ✓ | ✓ |
| polished_deepslate | polished_deepslate | ✓ | ✓ | ✓ |
| deepslate_brick | deepslate_bricks | ✓ | ✓ | ✓ |
| deepslate_tile | deepslate_tiles | ✓ | ✓ | ✓ |
| blackstone | blackstone | ✓ | ✓ | ✓ |
| polished_blackstone | polished_blackstone | ✓ | ✓ | ✓ |
| polished_blackstone_brick | polished_blackstone_bricks | ✓ | ✓ | ✓ |
| brick | bricks | ✓ | ✓ | ✓ |
| mud_brick | mud_bricks | ✓ | ✓ | ✓ |
| resin_brick | resin_bricks | ✓ | ✓ | ✓ |
| sandstone / red_sandstone | sandstone / red_sandstone | ✓ | ✓ | ✓ |
| smooth_sandstone / smooth_red_sandstone | smooth_* | ✓ | ✓ | – |
| cut_sandstone / cut_red_sandstone | cut_* | – | ✓ | – |
| quartz | quartz_block | ✓ | ✓ | – |
| smooth_quartz | smooth_quartz | ✓ | ✓ | – |
| prismarine | prismarine | ✓ | ✓ | ✓ |
| prismarine_brick | prismarine_bricks | ✓ | ✓ | – |
| dark_prismarine | dark_prismarine | ✓ | ✓ | – |
| nether_brick / red_nether_brick | nether_bricks / red_nether_bricks | ✓ | ✓ | ✓ |
| end_stone_brick | end_stone_bricks | ✓ | ✓ | ✓ |
| purpur | purpur_block | ✓ | ✓ | – |
| cut_copper (+ exposed_/weathered_/oxidized_ + waxed_*) | cut_copper usw. | ✓ | ✓ | – |
| Holz: oak, spruce, birch, jungle, acacia, dark_oak, mangrove, cherry, pale_oak, bamboo, crimson, warped | *_planks | ✓ | ✓ | – |
| bamboo_mosaic | bamboo_mosaic | ✓ | ✓ | – |

- Jede Holzart (oak, spruce, birch, jungle, acacia, dark_oak, mangrove, cherry, pale_oak, bamboo, crimson, warped) hat in 1.21.11 planks, fence, fence_gate, door, trapdoor, stairs, slab, hanging_sign und shelf. Die Baumhölzer haben zusätzlich log, wood und stripped_log. Bamboo hat stattdessen bamboo_block und stripped_bamboo_block, Nether-Holz hat stem und hyphae — [mcmeta 1.21.11 data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Geprüft **nicht** vorhanden: calcite_stairs, terracotta_stairs, packed_mud_stairs, smooth_stone_stairs, quartz_wall, cut_copper_wall, tinted_glass_pane. Ebenso nicht vorhanden: die alte ID `chain` (heißt jetzt `minecraft:iron_chain`) und `paper` als Block — [mcmeta 1.21.11 data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Terracotta und Concrete haben keine Stairs- oder Slab-Versionen. Basalt hat keine Stairs, Slabs oder Walls — [minecraft.wiki: Best building materials](https://minecraft.wiki/w/Tutorial:Best_building_materials)
- Generator-relevante Block-States (1.21.11):
  - Leaves: `persistent` true/false, Default false, also Zerfall ohne Stamm.
  - `minecraft:snow`: `layers` 1–8.
  - `copper_bulb`/`waxed_copper_bulb`: `lit`, `powered`.
  - `lantern`: `hanging`.
  - Stairs: `facing`, `half` top/bottom, `shape` straight/inner_left/inner_right/outer_left/outer_right.
  - `iron_chain`: `axis`.
  - `candle`: `candles` 1–4, `lit`.
  - `pale_hanging_moss`: `tip`.

  Quelle: [mcmeta 1.21.11 data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)

### Inferences
- Für Rollen mit Stairs-Pflicht (roof, roof_trim, Sockelkante) muss der Generator auf Familien mit Stairs mappen. Mapping für beliebte Wandblöcke ohne Stairs:
  - calcite → `diorite_stairs` oder `smooth_quartz_stairs` (Helligkeit 76–92).
  - white_concrete → `smooth_quartz_stairs`.
  - gray_concrete → `polished_deepslate_stairs` oder `deepslate_tile_stairs`.
  - terracotta / orange_terracotta → `brick_stairs`, `granite_stairs` oder `mud_brick_stairs`.
  - red_terracotta → `brick_stairs` oder `mangrove_stairs`.
  - packed_mud → `mud_brick_stairs`.
  - smooth_stone → `stone_stairs` oder `andesite_stairs`.
  - cut_sandstone → `smooth_sandstone_stairs` oder `sandstone_stairs`.
  - snow_block → Holz-Stairs + `snow`-Layer.
  - copper_block → `waxed_cut_copper_stairs`.
  - Logs → `*_stairs` der gleichen Holzart (Planks-Textur) bzw. stripped_log als Balken.

  Begründung: L\*- und Farbton-Nähe laut meiner Texturtabelle.
- Wall-Varianten (für Zinnen, Säulen, Geländer, Schornsteinkappen) gibt es nur bei Steinfamilien. Für Holz-Geländer `*_fence` verwenden, für Metall `iron_bars` oder `*_copper_bars`.

### Gaps
- Keine. Die Liste ist vollständig maschinell aus der 1.21.11-Blockliste extrahiert. Ob eine bestimmte Stairs-Familie auf einem Dach optisch zu einem Vollblock ohne Stairs passt, ist eine Ableitung und muss ingame verifiziert werden.
