# Winter-/Weihnachtsdekoration und Landschaftsgestaltung für einen prozeduralen Generator (Java Edition 1.21.11, DataVersion 4671)

Methodik: Blockzustände wurden direkt aus den Daten für 1.21.11 gelesen (misode/mcmeta `1.21.11-summary/blocks/data.json`, Tags und Weltgenerierungsdateien aus `1.21.11-data`). Die drei verschneiten Laternenpfähle aus dem Vanilla-Dorf und zwei weitere Dorfstrukturen wurden als NBT heruntergeladen und ausgewertet. Die Mechanik stammt aus dem Rohtext von minecraft.wiki (über `?action=raw`). Bautechniken kommen aus Builder- und Blog-Artikeln. Reddit (403), planetminecraft (403) und einige Blogs (badlion, kzone: 403) waren nicht erreichbar. Was nur aus Suchmaschinen-Snippets stammt, ist als solches markiert.

Hauptquellen, die immer wieder vorkommen:
- Blockdaten 1.21.11: https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json
- Vanilla-Daten 1.21.11 (Tags, Strukturen, Prozessoren): https://github.com/misode/mcmeta/tree/1.21.11-data/data/minecraft

---

## 1. Schnee und Eis (Schneeschichten, Pulverschnee, Eisarten, Eiszapfen, gefrorene Teiche, verschneite Fichten)

### Takeaway
`snow[layers=1..8]` braucht darunter einen Block mit voller Oberseite. Ausnahmen per Tag: honey_block, soul_sand und mud gehen, ice, packed_ice und barrier nicht. Schnee schmilzt bei Blocklicht ≥ 12. Für einen Generator heißt das: Lichtquellen der Stufe 15 brauchen mindestens 4 Blöcke Taxicab-Abstand zu Schneeschichten, Stufe-14-Quellen mindestens 3. Wer gar nicht rechnen will, nimmt Schneeblöcke, packed_ice und blue_ice, die schmelzen nie. Einen echten Eiszapfen-Block gibt es in Vanilla nicht. pointed_dripstone (mit korrekter Dicken-Kette) und end_rod[facing=down] sind die üblichen Behelfe.

### Cited Findings
**Blockzustände (1.21.11, verifiziert):**
- `snow`: `layers` = 1–8, Standard 1. `snow_block`, `powder_snow`, `ice`, `packed_ice` und `blue_ice` haben keine Zustände. `grass_block`, `podzol` und `mycelium` haben `snowy=true|false`. `frosted_ice` hat `age` 0–3. — [misode blocks 1.21.11](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- `pointed_dripstone`: `thickness` = tip_merge|tip|frustum|middle|base, `vertical_direction` = up|down, `waterlogged`. — [misode blocks 1.21.11](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- `spruce_leaves` (wie alle Laubarten): `distance` 1–7, `persistent` true|false, `waterlogged`. Standard ist distance=7, persistent=false. — [misode blocks 1.21.11](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Block-Tag `minecraft:snow` = snow, snow_block, powder_snow (aus diesem Tag wird `snowy` am Grasblock abgeleitet). — [tags/block/snow.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/tags/block/snow.json)

**Platzierung von Schneeschichten:**
- In Java hält Schnee auf Blöcken mit dem Tag `support_override_snow_layer` oder auf Blöcken mit voller Oberseite, sofern sie nicht `cannot_support_snow_layer` tragen. Wird der Stützblock entfernt, bricht der Schnee. Ein Spieler springt maximal 1 Block plus 3 Schichten hoch. — [minecraft.wiki/Snow](https://minecraft.wiki/w/Snow)
- In 1.21.11 heißen die Tags tatsächlich `snow_layer_can_survive_on` = honey_block, soul_sand, mud und `snow_layer_cannot_survive_on` = ice, packed_ice, barrier. blue_ice steht nicht in der Ausschlussliste. — [can_survive_on](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/tags/block/snow_layer_can_survive_on.json), [cannot_survive_on](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/tags/block/snow_layer_cannot_survive_on.json)
- Auf Ackerboden lässt sich Schnee nicht setzen. Ein fallender Kies- oder Sandblock ersetzt eine Schneeschicht. — [minecraft.wiki/Snow](https://minecraft.wiki/w/Snow)
- Jede Schicht ist 2 Pixel hoch. Ab der zweiten Schicht wächst die Kollisionsbox um je 2 Pixel. Eine einzelne Schicht hat praktisch keine eigene Kollision und läuft sich wie der Block darunter. — [minecraft.wiki/Snow](https://minecraft.wiki/w/Snow)
- Liegt eine Schicht auf grass_block, mycelium oder podzol, werden diese oben und an den Seiten weiß. Unter dickeren Schichten (≥ 2) wird Gras beim nächsten Random Tick zu normaler Erde. — [minecraft.wiki/Snow](https://minecraft.wiki/w/Snow)
- Wer layers=8 mit Silk Touch abbaut, bekommt einen snow_block. — [minecraft.wiki/Snow](https://minecraft.wiki/w/Snow)
- Auf powder_snow kann keine Schneeschicht liegen. — [minecraft.wiki/Powder_Snow](https://minecraft.wiki/w/Powder_Snow)
- dirt_path ist nur 15/16 Block hoch. Gegenstände, die einen vollen Block brauchen (Fackeln, Knöpfe), lassen sich darauf nicht setzen. Wird ein fester Block darauf gesetzt, wird der Pfad sofort zu Erde. — [minecraft.wiki/Dirt_Path](https://minecraft.wiki/w/Dirt_Path)
- Laub hat in Java die volle Kollisionsform, aber eine **leere Support-Form**. — [minecraft.wiki/Opacity/Placement](https://minecraft.wiki/w/Opacity/Placement)

**Schmelzen (wichtig für Lichtplatzierung):**
- Schnee schmilzt bei Blocklicht ≥ 12. In Java schmelzen dabei alle Schichten auf einmal. Der Schmelzradius wird in Taxicab-Distanz gemessen: Leuchtfeuer, Lagerfeuer, Kupferbirne und End-Portal (Licht 15) schmelzen im Radius 3, copper_lantern (15) laut Wiki-Tabelle im Radius 2, copper_torch und end_rod (14) im Radius 2. Kerzen mit 1–4 Stück (Licht 3/6/9/12) haben keinen Schmelzradius. — [minecraft.wiki/Snow](https://minecraft.wiki/w/Snow)
- Laut Licht-Tabelle bildet sich Schnee bei Blocklicht 0–9. Bei 10–11 bildet er sich in Java weder neu noch schmilzt er (MC-217420), ab 12 schmilzt er. Eis bildet sich bei 0–9, bei 10 passiert in Java nichts (MC-217424), ab 11 schmilzt es. — [minecraft.wiki/Light](https://minecraft.wiki/w/Light)
- Die Seite zu Eis formuliert es etwas anders: Eis schmilzt, wenn das Blocklicht direkt daneben auf irgendeiner Seite „higher than 11“ ist. Himmelslicht wird ignoriert, Sonne schmilzt also kein Eis. — [minecraft.wiki/Ice](https://minecraft.wiki/w/Ice) (leichter Widerspruch zur Light-Tabelle, die schon ab 11 „Melts“ zeigt)
- packed_ice schmilzt nicht und ist **opak**. blue_ice schmilzt ebenfalls nicht in Lichtnähe. — [minecraft.wiki/Packed_Ice](https://minecraft.wiki/w/Packed_Ice), [minecraft.wiki/Blue_Ice](https://minecraft.wiki/w/Blue_Ice)
- snow_block schmilzt nicht neben Lichtquellen. — [minecraft.wiki/Snow_Block](https://minecraft.wiki/w/Snow_Block)
- Eis ist transparent und rutschig und wird beim Abbauen über einem festen Block zu einer Wasserquelle. — [minecraft.wiki/Ice](https://minecraft.wiki/w/Ice)

**Pulverschnee:**
- Pulverschnee ist ein nicht-fester Block. Wesen sinken darin ein, werden verlangsamt und erleiden Frostschaden. Nur mit Lederstiefeln kann man darauf laufen. In Wasser schmilzt er. Natürlich kommt er in Groves und Snowy Slopes in Streifen vor. — [minecraft.wiki/Powder_Snow](https://minecraft.wiki/w/Powder_Snow)
- Ein Weihnachtsdorf-Guide schlägt vor, Schneeschichten oder Pulverschnee manuell zu verlegen, wenn kein Schneebiom vorhanden ist. — [G-Portal](https://www.g-portal.com/en/blog/minecraft-christmas-village-en)

**Eiszapfen:**
- Stalaktiten (pointed_dripstone mit vertical_direction=down) hängen an der Unterseite von Blöcken. Bricht der Stützblock weg, fallen sie herunter und verursachen Schaden. Gesetzte Stalaktiten wachsen nur unter einem dripstone_block mit Wasser darüber, normale Deko wächst also nicht. — [minecraft.wiki/Pointed_Dripstone](https://minecraft.wiki/w/Pointed_Dripstone)
- Die Dicken-Kette lässt sich aus dem BlockGrid der Wiki ablesen, vom Stützblock aus gezählt: Länge 1 = `tip`. Länge 2 = `frustum`, `tip`. Länge 3 = `base`, `frustum`, `tip`. Länge ≥ 4 = `base`, `middle`…, `frustum`, `tip`. Treffen sich ein Stalaktit und ein Stalagmit, enden beide auf `tip_merge`. — [minecraft.wiki/Pointed_Dripstone (Data values)](https://minecraft.wiki/w/Pointed_Dripstone)
- End-Stäbe kann man an jede Seite jedes Blocks setzen, auch an andere End-Stäbe. Sie brechen nicht, wenn ihr Stützblock entfernt wird. Licht 14, sie schmelzen Schnee und Eis im Radius 2. — [minecraft.wiki/End_Rod](https://minecraft.wiki/w/End_Rod)
- Im Mojang-Feedbackforum werden Eiszapfen seit Langem gewünscht. Ein Kommentar erwähnt, dass jemand End-Stäbe als Eiszapfen in einer Eishöhle nutzt. — [feedback.minecraft.net (Snippet über Suchmaschine)](https://feedback.minecraft.net/hc/en-us/community/posts/360074693791)
- G-Portal nennt hängende „Icicle“-Töpfe aus Fichtenlaub und Redstone-Fackeln. Die Beschreibung ist unscharf. — [G-Portal](https://www.g-portal.com/en/blog/minecraft-christmas-village-en)

**Gefrorene Teiche, Eisbahn, Iglu:**
- Für Eisbahnen packed_ice oder blue_ice verwenden, mit Zäunen einfassen, Glowstone darunter zur Beleuchtung und Bänke für Zuschauer. — [G-Portal](https://www.g-portal.com/en/blog/minecraft-christmas-village-en)
- „Eisflecken“ für gefrorene Flüsse und Seen verstreuen. — [G-Portal](https://www.g-portal.com/en/blog/minecraft-christmas-village-en)
- Iglu: nur mit Redstone-Fackeln beleuchten, „as any other light source will melt your precious abode“. — [PCGamesN](https://www.pcgamesn.com/minecraft/christmas). Das widerspricht der Wiki für die Schneeblöcke selbst, die nicht schmelzen ([Snow_Block](https://minecraft.wiki/w/Snow_Block)). Zutreffen dürfte die Warnung nur für Eisfenster und Schneeschichten.
- Im Vanilla-Treffpunkt `snowy_meeting_point_1` (12×8×8) stecken 17 packed_ice, 45 dirt_path, 29 snow[layers=1], 12 stripped_spruce_wood und 1 bell. Die Schneeschichten liegen nur auf grass_block und stripped_spruce_wood. — [NBT village/snowy/town_centers/snowy_meeting_point_1.nbt](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/structure/village/snowy/town_centers/snowy_meeting_point_1.nbt) (selbst ausgewertet)
- Der Straßenprozessor für Schnee-/Taiga-Dörfer ersetzt dirt_path über Wasser **oder Eis** durch spruce_planks. Vanilla baut so automatisch kleine Stege über gefrorene Flächen. — [processor_list/street_snowy_or_taiga.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/worldgen/processor_list/street_snowy_or_taiga.json)

**Verschneite Dächer, verschneite Fichten:**
- Das Vanilla-Haus `snowy_medium_house_1` (7×6×8) besteht aus 64 snow_block, 48 snow[layers=1], 37 grass_block und 17 dirt. Die Schneeschichten liegen auf snow_block (29×) und grass_block (19×). Die Dachhaut ist hier also Schneeblock mit einer Schicht darüber. — [NBT village/snowy/houses/snowy_medium_house_1.nbt](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/structure/village/snowy/houses/snowy_medium_house_1.nbt) (selbst ausgewertet)
- Für Weihnachtsdörfer: Fichten- und Dunkeleichenbretter, steile Dächer aus Treppen und Stufen, Schneeschichten als „fresh snowfall“ auf den Dächern, Schornsteine aus Ziegel oder Steinziegel mit Lagerfeuer für Rauch. — [G-Portal](https://www.g-portal.com/en/blog/minecraft-christmas-village-en)
- spruce_leaves haben die feste Farbe #619961, unabhängig vom Biom. — [minecraft.wiki/Leaves](https://minecraft.wiki/w/Leaves)
- Von Spielern gesetztes Laub zerfällt nie. Natürliches Laub zerfällt bei mehr als 6 Blöcken Abstand zum Stamm (Java). — [minecraft.wiki/Leaves](https://minecraft.wiki/w/Leaves)

### Inferences
- **Schnee-Sicherheitsregel für den Generator.** Licht fällt pro Block um 1. Eine Schneeschicht schmilzt, wenn `L_quelle − d ≥ 12` (d = Taxicab-Abstand durch Luft oder transparente Blöcke). Das ergibt folgende Mindestabstände:
  - Licht 15 (glowstone, sea_lantern, froglights, shroomlight, lantern, copper_lantern, jack_o_lantern, campfire, copper_bulb, redstone_lamp[lit]): **d ≥ 4**
  - Licht 14 (torch, end_rod, copper_torch): **d ≥ 3**
  - Licht ≤ 12 (Kerzen 1–4, soul_lantern 10, soul_torch 10): unkritisch für Schnee
  - Eis (ice): wegen der Grenze ab 11 vorsichtshalber **d ≥ 5** bei Licht 15. Sonst immer packed_ice oder blue_ice nehmen.
  - Opake Blöcke schirmen ab, Laub nicht (es lässt Licht durch, siehe Abschnitt 3).
  - Im statischen Schematic bleibt der Schnee zunächst liegen. Das Schmelzen passiert erst über Random Ticks, wenn die Welt geladen ist.
- **Dachschnee.** Normale Treppen (`half=bottom`) und untere Stufen (`type=bottom`) haben keine volle Oberseite, darauf hält keine Schneeschicht. Möglich sind Vollblöcke, `type=top`/`double`-Stufen und umgedrehte Treppen (`half=top`). Das ist aus der Regel „full top face“ abgeleitet. Daraus ergeben sich zwei Dach-Strategien:
  1. Treppendach ohne Schnee, Schnee nur auf First, Gauben und Vollblock-Kanten.
  2. Ein „Schneedach“ aus snow_block bzw. Vollblöcken mit Schichten darauf, wie bei Vanilla `snowy_medium_house_1`.
- **Glatte Schneeschräge mit Schichten.** Auf einer Treppenstufen-Kontur aus Vollblöcken steigen die Schichtenhöhen in 2-px-Schritten. Beispielprofil quer zum Dach (Vollblock-Stufen darunter):
  ```
  Höhe (px):   2   6  10  14 | 2   6  10  14 | ...   (layers 1,3,5,7 je Stufe)
  layers:      1   3   5   7 | 1   3   5   7
  ```
  Die Werte sind eine Idee, keine dokumentierte Builder-Konvention.
- **Bodenschnee.** grass_block unter einer einzelnen Schicht als `grass_block[snowy=true]` exportieren. Unter Schichten ≥ 2 gleich `dirt` (oder snow_block) setzen, weil das Spiel Gras dort später ohnehin zu Erde macht. Verwehungen vor Hauswänden und Zäunen: Schichten 2–4 direkt an der Wand, nach außen auf 1 abfallend, z. B. `[4,3,2,1]` über 4 Blöcke.
- **Pfade bleiben schneefrei.** Auf dirt_path hält keine Schicht (15/16-Höhe, analog zu Fackel und Knopf; nicht explizit für Schnee dokumentiert). Das passt zum Vanilla-Look „freigetretener Pfad im Schnee“.
- **Eis als Teich.** ice oder packed_ice in die Wasserebene, darauf keinen Schnee (Tag-Ausschluss). Am Ufer Schicht 1 auf Gras, vereinzelt Schicht 2. Auf blue_ice ist Schnee laut Tag erlaubt, sinnvoll für teilweise überschneite Eisflächen.
- **Eiszapfen-Rezepte**, beginnend mit der robustesten Variante:
  - (a) `end_rod[facing=down]` unter der Traufe: weiß, leuchtet, bricht nie. Im Abstand d ≤ 2 schmilzt aber Schnee.
  - (b) `pointed_dripstone[vertical_direction=down]` in Ketten von 1–3 mit korrekter `thickness`-Folge: braun, eher „Höhleneiszapfen“. Fällt herunter, wenn der Stützblock fehlt.
  - (c) Rein visuell und unbelegt: hängende Stränge aus ice-, packed_ice- oder Glasscheiben-Blöcken.
  - Längen entlang der Traufe zufällig 1–3 variieren, Abstand 1–2 Blöcke.
- **Verschneite Fichte.** `spruce_leaves[persistent=true]` mit `snow[layers=1]` auf jeder nach oben freien Laubfläche. Laub hat volle Kollision, Schnee hält dort in Java also (Herleitung aus Kollisions- und Support-Form; dass in Bedrock Schneepartikel durch Laub fallen, deutet auf dasselbe hin).

### Gaps
- Keine Primärquelle mit Builder-Konventionen für Eiszapfen-Längen oder -Dichte. Reddit war per Fetch blockiert (403).
- Ob Schnee auf Laub in Java ausdrücklich erlaubt ist, steht nicht wörtlich in der Wiki. Hergeleitet aus „full top face“ und Kollisionsform.
- Uneinheitliche Eis-Schmelzschwelle (Wiki-Light-Tabelle: ab 11; Ice-Seite: „higher than 11“ angrenzend). Deshalb ist die Empfehlung konservativ.

---

## 2. Weihnachtsbeleuchtung und Dekoration (Lichterketten, Girlanden, Kränze, Zuckerstangen, Geschenke, Bäume, Schneemänner, Stände, Dorflayout)

### Takeaway
In Java ist Blocklicht farblos. „Bunte Lichter“ entstehen nur über die Farbe der leuchtenden Blöcke (Froschlichter gelb/grün/lila, Shroomlight orange, Seelaterne cyan-weiß, Kerzen in 16 Farben, Kupferlaterne grünlich) oder über Buntglas vor einer Lichtquelle. Laternen und Kerzen halten nicht auf Laub, weil Laub eine leere Support-Form hat. Baumlichter setzt man deshalb als Leuchtblock **in** das Laub. Vanilla kennt keine Kranz-, Girlanden- oder Zuckerstangenblöcke, sie werden aus Laub, Wolle, Beton und Lichtblöcken nachgebaut. Ein Schneemann aus zwei snow_block plus carved_pumpkin wird zum Schneegolem-Entity und darf in dieser Form nicht generiert werden.

### Cited Findings
**Leuchtblöcke und Lichtstufen (Java):**
- **Licht 15:** beacon, copper_lantern, sea_pickle (4, waterlogged), ochre/verdant/pearlescent_froglight, glowstone, jack_o_lantern, lantern, campfire (lit), redstone_lamp (lit), sea_lantern, shroomlight, copper_bulb (lit)
- **Licht 14:** copper_torch, end_rod, torch, cave_vines mit Beeren
- **Licht 12:** candle ×4 (lit), exposed_copper_bulb
- **Licht 10:** soul_lantern, soul_torch, soul_campfire, crying_obsidian
- **Licht 9:** candle ×3
- **Licht 8:** weathered_copper_bulb
- **Licht 7:** glow_lichen, redstone_torch
- **Licht 6:** candle ×2
- **Licht 3:** candle ×1, candle_cake
- **Licht 2:** firefly_bush
- Die Spalte „Experimental color“ gilt nur für Vibrant Visuals in Bedrock Preview, nicht für Java.
- Quelle für alle Werte: [minecraft.wiki/Light](https://minecraft.wiki/w/Light)
- Kerzen: bis zu 4 **gleichfarbige** pro Block, je +3 Licht (max. 12). Waterlogged Kerzen lassen sich nicht anzünden. Ein Kuchen trägt genau eine Kerze (candle_cake). — [minecraft.wiki/Candle](https://minecraft.wiki/w/Candle)
- Blockzustände: `candle`/`<farbe>_candle` mit `candles` 1–4, `lit`, `waterlogged`; `lantern`, `soul_lantern`, `copper_lantern` (+ Oxidations- und waxed-Varianten) mit `hanging`, `waterlogged`; `end_rod` mit `facing` (6 Richtungen); Froschlichter mit `axis`; `redstone_lamp` mit `lit`; `copper_bulb` mit `lit`, `powered`; `light` mit `level` 0–15. — [misode blocks 1.21.11](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- **ID-Änderung:** In 1.21.11 gibt es keine `minecraft:chain` mehr, sondern `iron_chain` (axis x|y|z, waterlogged) sowie `copper_chain` mit Oxidations- und waxed-Varianten. — [misode blocks 1.21.11](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json), [minecraft.wiki/Iron_Chain](https://minecraft.wiki/w/Iron_Chain)
- Laternen stehen auf der Oberseite oder hängen an der Unterseite „der meisten“ Blöcke. Eine Laterne an der Unterseite einer Kette verbindet sich nahtlos mit ihr. Steht eine Laterne auf einer ungültigen Fläche, bricht sie beim nächsten Block-Update. — [minecraft.wiki/Lantern](https://minecraft.wiki/w/Lantern)
- Laub: volle Kollisionsform, **leere Support-Form** (Java). — [minecraft.wiki/Opacity/Placement](https://minecraft.wiki/w/Opacity/Placement)
- DiamondLobby bestätigt das praktisch: „not many things can be placed directly on leaf blocks. Lanterns, soul lanterns, candles, and many others are not an option.“ Auf oder an Bäumen gehen Froglight, Shroomlight, Moos, Ranken und Glow Lichen. — [DiamondLobby Christmas tree](https://diamondlobby.com/minecraft/how-to-make-christmas-tree-minecraft/). Sportskeeda beschreibt dagegen einen Baum (Kwell) mit „candles on top“ der Blätter und hängenden Laternen. Wahrscheinlich Bedrock oder andere Trägerblöcke, das wird nicht aufgelöst. — [Sportskeeda 5 best trees](https://www.sportskeeda.com/minecraft/5-best-minecraft-christmas-tree-builds)
- Kupferbirne: schaltet bei einem Redstone-**Impuls** um und braucht keine Dauerversorgung, um zu leuchten. Die Helligkeit hängt von der Oxidation ab. — [minecraft.wiki/Copper_Bulb](https://minecraft.wiki/w/Copper_Bulb)
- Redstone-Lampe: leuchtet nur, **solange** sie Redstone-Strom bekommt, etwa von einem angrenzenden block of redstone. — [minecraft.wiki/Redstone_Lamp](https://minecraft.wiki/w/Redstone_Lamp)
- Feuerkäfer-Busch: gibt Partikel ab, wenn das interne Licht an seiner Position ≤ 13 ist. Die Partikel leuchten, erhellen aber nichts. Eigenes Licht 2. — [minecraft.wiki/Firefly_Bush](https://minecraft.wiki/w/Firefly_Bush)
- Meerespflanzen-Licht (sea_pickle) zählt nur waterlogged. — [minecraft.wiki/Light](https://minecraft.wiki/w/Light)

**Lichterketten, Girlanden, Dekor am Haus:**
- Girlanden aus grüner Wolle oder Laub. Redstone-Blöcke oder rote Banner als Kugeln oder Beeren. Laternen oder End-Stäbe als „makeshift twinkling Christmas lights“. Buntglasscheiben als Illusion bunter Lichterketten über Veranden. Fensterläden aus Falltüren. — [G-Portal](https://www.g-portal.com/en/blog/minecraft-christmas-village-en)
- Kamin aus Ziegel oder Steinziegel mit Lagerfeuer und Eisengittern davor. — [G-Portal](https://www.g-portal.com/en/blog/minecraft-christmas-village-en)
- Vanilla hat keine Kranz-, Girlanden-, Zuckerstangen- oder Strumpfblöcke. Datapacks und Mods wie „Santa's Delight“ fügen Kränze, Girlanden, Lichterketten, Strümpfe, Geschenke und einen Zuckerstangenblock hinzu. — [modpackindex Santa's Delight (Snippet)](https://www.modpackindex.com/mod/118863/santas-delight); Kranz als Feature-Wunsch: [feedback.minecraft.net Wreaths (Snippet)](https://feedback.minecraft.net/hc/en-us/community/posts/360050368771-Wreaths)

**Weihnachtsbaum:**
- Sportskeeda-Anleitung: Sockel aus 3×3 sea_lantern, darauf farbige Wolle, darauf Falltüren. Stamm aus 10 spruce_log in der Mitte. Fichtenlaub-Ringe, die nach oben schmaler werden. Lücken für Froschlichter und farbige Wolle („colored wool will be visible through the leaves“). Spitze: obsidian plus end_crystal, danach Obsidian vorsichtig durch Laub ersetzen. Item Frames außen als Behang. — [Sportskeeda how-to](https://www.sportskeeda.com/minecraft/how-build-christmas-tree-minecraft)
- DiamondLobby: Stamm 1×1, 2×2 oder 3×3. 3×3 hat eine Mitte für den Stern. Je höher der Baum, desto weiter muss die Krone unten ausladen. Erst eine Seite gestalten, dann spiegeln. Wolle als Kugeln oder Geschenke („large and look clunky on the smaller trees“). Wurzeln um die Basis. — [DiamondLobby Christmas tree](https://diamondlobby.com/minecraft/how-to-make-christmas-tree-minecraft/)
- Pyramidenförmiger Baum aus spruce_leaves. Lichter: glowstone, sea_lantern, redstone_lamp. Kugeln: Item Frames mit Wolle, Smaragden oder Goldbarren. Stern aus gelbem Buntglas oder Glowstone. Geschenke aus gefärbten Shulkerkisten oder Truhen. — [G-Portal](https://www.g-portal.com/en/blog/minecraft-christmas-village-en)
- Spitzenvarianten aus Community-Builds: Amethystblock mit Amethyst-Scherben (TheLob); blinkende Redstone-Lampen (TheLob, AdieCraft); einfacher Baum aus Laub und Conduits (HALNY). — [Sportskeeda 5 best trees](https://www.sportskeeda.com/minecraft/5-best-minecraft-christmas-tree-builds). BlenDigi: Spitze aus Amethystblöcken, Item Frames und Buntglasscheiben als sternförmige Kugeln. — [PCGamesN](https://www.pcgamesn.com/minecraft/christmas)
- Riesenkugeln aus Buntglas mit sea_lantern innen (Bobicraft). — [Sportskeeda Christmas 2022](https://www.sportskeeda.com/minecraft/5-best-minecraft-build-ideas-christmas-2022)
- Vanilla-Fichte als Formreferenz: `spruce` = straight_trunk_placer (base_height 5, rand_a 2, rand_b 1) mit spruce_foliage_placer (radius 2–3, offset 0–2, trunk_height 1–2). `pine` = Stamm 6 + 0..4, pine_foliage_placer (radius 1, height 3–4). `mega_spruce` = giant_trunk_placer (13 + 0..2 + 0..14), mega_pine_foliage_placer (crown_height 13–17). — [configured_feature/spruce.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/worldgen/configured_feature/spruce.json), [pine.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/worldgen/configured_feature/pine.json), [mega_spruce.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/worldgen/configured_feature/mega_spruce.json)

**Geschenke, Zuckerstangen, Strümpfe, Schlitten, Schneemann:**
- Zuckerstangen aus roter und weißer Wolle als Wegsäume. Riesengeschenke, Mini-Weihnachtsmann, Eisbahn. — [HerCampus](https://www.hercampus.com/school/fsu/culture-5-holiday-themed-build-ideas-for-your-winter-break-minecraft-phase/)
- Zuckerstange aus Beton und Quarz mit Treppen für den Bogen. — [kzone (nur Such-Snippet, Seite 403)](https://www.kzone.com.au/article/festive-holiday-minecraft-ideas-602760)
- Geschenke aus gefärbten Shulkerkisten oder Truhen. Schlitten aus Loren oder Holzblöcken. Rentiere = umbenannte Pferde (Entity). — [G-Portal](https://www.g-portal.com/en/blog/minecraft-christmas-village-en)
- Truhen (auch große und Fallen-Truhen) zeigen vom 24. bis 26. Dezember eine Geschenk-Textur. Das läuft clientseitig über das Systemdatum. — [minecraft.wiki/Chest](https://minecraft.wiki/w/Chest)
- Strümpfe am Kamin: Stiefel in **unsichtbaren Item Frames** (Befehl nötig). — [PCGamesN](https://www.pcgamesn.com/minecraft/christmas). Der dort genannte Befehl `item_frame{EntityTag:{Invisible:1b}}` ist alte Syntax vor 1.20.5.
- Lebkuchenhaus: brauner Beton mit Eis und Schneeblöcken, Beton- und Terrakotta-Varianten als Gumdrops, Zuckerstangen-Bäume und Schlitten. — [Sportskeeda Christmas 2022](https://www.sportskeeda.com/minecraft/5-best-minecraft-build-ideas-christmas-2022). Spieler-Köpfe und Item Frames als Details: [BisectHosting](https://www.bisecthosting.com/blog/5-festive-minecraft-build-guides)
- Schneekugel aus Glas mit Schnee- und Eisblöcken innen, Heuballen als Besen-Borsten. — [Sportskeeda Christmas 2022](https://www.sportskeeda.com/minecraft/5-best-minecraft-build-ideas-christmas-2022)
- **Schneegolem-Falle:** 2 snow_block senkrecht plus carved_pumpkin oder jack_o_lantern oben ergibt einen Schneegolem. Das funktioniert auch liegend oder kopfüber, solange der Kürbis zuletzt gesetzt wird. Der Kürbis kann von Spielern, Werfern, Endermen **oder Befehlen** gesetzt werden. — [minecraft.wiki/Snow_Golem](https://minecraft.wiki/w/Snow_Golem)
- Ähnlich: carved_pumpkin auf einem Kupferblock (jede Oxidationsstufe, auch gewachst) ergibt einen Kupfergolem. Ausrichtung egal, Kürbis zuletzt. — [minecraft.wiki/Copper_Golem](https://minecraft.wiki/w/Copper_Golem), [minecraft.wiki/Carved_Pumpkin](https://minecraft.wiki/w/Carved_Pumpkin)

**Marktstände:**
- Grundfläche 5×5 oder 7×7 für einen Händler, 10×10 und mehr für mehrere. Theke 1–2 hoch, 3–5 breit, 2–3 tief. Unten Falltüren, Zaunpfosten oder Säulen als „Beine“. Thekenplatte im Kontrastmaterial, z. B. Holzstufe auf Steinziegel. Dach aus Treppen, schräg nach außen, mindestens 3–4 Blöcke über der Theke. Eine Seite offen lassen. 1–2 hängende Laternen über der Theke. Fässer, Truhen und Item Frames als Ware. Azaleen und Blumen. Hängeschilder. Wege zum Stand. — [minecraft.how market stall](https://minecraft.how/blog/post/build-minecraft-market-stall)
- Kleine Stände aus Holz und Wolle. Kuchen, Kekse und goldene Äpfel als Auslage. — [G-Portal](https://www.g-portal.com/en/blog/minecraft-christmas-village-en)
- In verschneiten Biomen weiße Wollabdeckungen; Stufen und Treppen kombiniert als sanfter Markisenbogen. — [minecraft.how (Such-Snippet)](https://minecraft.how/nl/blog/bericht/build-minecraft-market-stall)

**Dorf-Layout:**
- Zentraler Platz mit großem Baum, ringsum Häuser, Läden, Kapelle, Rathaus, Bäckerei. Platz um den Baum zum Versammeln oder für eine Eisbahn. Hanglage für gewundene Wege und gestaffelte Häuser, alternativ Tal zwischen Gipfeln. Wege aus Bruchstein oder Kies, gesäumt von Glowstone-Laternen oder Redstone-Lampen. Optional ein Dorf auf Stelzen über einem gefrorenen See. — [G-Portal](https://www.g-portal.com/en/blog/minecraft-christmas-village-en)
- Idee „Wintermarkt rund um eine Eisbahn“ mit Riesenbaum in der Mitte. — [PCGamesN](https://www.pcgamesn.com/minecraft/christmas)
- Die Vanilla-Straßen in Schnee- und Taigadörfern sind dirt_path. 20 % davon werden zufällig zu grass_block, in der Ebene 10 %. — [street_snowy_or_taiga.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/worldgen/processor_list/street_snowy_or_taiga.json), [street_plains.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/worldgen/processor_list/street_plains.json)

### Inferences
- **Farbige Lichterkette (nur Blöcke, Java), Palette:**
  - `ochre_froglight` (gelb-warm), `verdant_froglight` (grün), `pearlescent_froglight` (lila-rosa), `shroomlight` (orange), `sea_lantern` (weiß-cyan), `glowstone` (gelb), `redstone_lamp[lit=true]` (warm)
  - `<farbe>_candle[candles=1..4,lit=true]` für 16 Farben (kleine, „punktförmige“ Lämpchen)
  - `copper_lantern` (grünliche Flamme), `soul_lantern` (blau, Licht 10, schneesicher)
- **Lichterketten-Regeln:**
  - **Kette an Dachtraufen und Zäunen:** Kerzen (1–2 Stück, lit) auf jedem 2. Zaunpfosten oder jeder 2. Wandkrone. Fence- und Wall-Pfosten haben eine mittige Stütze; das stammt aus der Lantern-Mechanik, für Kerzen nicht ausdrücklich bestätigt. Farben zyklisch rot, grün, gelb, weiß, blau. Kerzen sind die einzige wirklich schneesichere farbige Variante (Licht ≤ 12).
  - **Hängende Kette:** `iron_chain[axis=y]` (1–2) plus `lantern[hanging=true]` an Balken oder Dachüberstand, Abstand 3–4 Blöcke. Zu Schnee mindestens 4 Blöcke Abstand halten.
  - **„Durchhängende“ Lichterkette zwischen zwei Pfosten:** abwechselnd `iron_chain[axis=x|z]` und hängende Laternen geht nicht, weil Laternen nur unter Blöcken mit mittiger Unterseite hängen. Ob horizontale Ketten das leisten, ist ungeprüft. Robust ist eine Reihe `end_rod[facing=east|west]` horizontal oder Buntglasscheiben vor Leuchtblöcken.
  - **Redstone-Lampen** in einem reinen Block-Schematic nur mit unsichtbar angrenzendem `redstone_block` (z. B. im Dach oder Boden). Sonst gehen sie beim ersten Block-Update aus.
  - **Kupferbirnen** sind die bessere „Dauer-an“-Lösung: `waxed_copper_bulb[lit=true,powered=false]` bleibt ohne Strom an. Gewachst, damit keine Oxidation eintritt, die das Licht über 12 → 8 → 4 dimmt.
- **Unsichtbares Licht.** Der Block `light[level=N]` (0–15) kann Szenen ohne sichtbare Quelle ausleuchten. Mit `level ≤ 11` schmilzt er nie Schnee (Stufe 11 an der eigenen Position, Nachbarn ≤ 10). Gut, um Mob-Spawns um Schnee herum zu unterdrücken: hostile Mobs spawnen nur bei Blocklicht 0, siehe Abschnitt 3. Für Eis `level ≤ 10`.
- **Weihnachtsbaum-Profil (Vorschlag für den Generator, keine dokumentierte Norm).** Stufenkegel aus `spruce_leaves[persistent=true]` mit Absätzen, angelehnt an den Vanilla-Radius-„Sägezahn“ der Fichte (das genaue Vanilla-Algorithmusdetail ist nicht verifiziert):
  - Höhe H (Laubteil), Stamm `spruce_log` von Boden bis H−1. Ab H ≥ 16 einen 2×2- oder 3×3-Stamm.
  - Max-Radius R ≈ round(0.38·H), Minimum 2.
  - Der Baum wird von oben in Tiers à 3–4 Lagen eingeteilt. In jedem Tier wächst der Radius um 1 pro Lage. Das nächste Tier startet 1–2 kleiner als das vorige endete, das erzeugt die typischen „Röcke“.
  - Lage-Form: Kreisscheibe `dx²+dz² ≤ (r+0.5)²`. Bei r ≤ 2 einfach das Quadrat ohne Ecken.
  - Beispiel H=12, Radien von oben: `0,1 | 1,2,3 | 2,3,4 | 3,4,5 | 4` → R=5.
  ```
  Seitenansicht H=12 (L=Laub, |=Stamm, *=Stern)
          *
          L
         LLL
         LLL
        LLLLL
       LLLLLLL
        LLLLL
       LLLLLLL
      LLLLLLLLL
       LLLLLLL
     LLLLLLLLLLL
      LLLLLLLLL
          |
  ```
- **Ornamente und Lichter am Baum:**
  - Nur Hüllblöcke ersetzen, also Laub mit mindestens einer freien Seite.
  - 8–12 % der Hülle als Kugeln: `red_wool`/`red_concrete`, `yellow_concrete`/`gold_block`, `light_blue_concrete`, `white_concrete`, Raw-Gold- oder Kupferblöcke für Glanz.
  - 4–6 % der Hülle als Lichter (Froschlichter oder Shroomlight), nicht zwei gleiche nebeneinander.
  - Zusätzlich 1 Block hinter der Hülle Glowstone oder Seelaterne: scheint durch, weil Laub kein Licht blockiert.
  - Spirale: Ornamente entlang `angle = k·137.5°` (goldener Winkel) mit wachsender Höhe für gleichmäßige Verteilung.
  - Girlande als Spirale: z. B. `white_wool`- oder `red_wool`-Bänder.
  - Stern: Glowstone- oder gold_block-Kern, darum 4 `end_rod` horizontal als Strahlen, oben ein `end_rod[facing=up]`. Alternativ Amethystblock mit `amethyst_cluster`.
- **Geschenke (reine Blöcke):**
  - 1×1×1: `<farbe>_wool` oder `<farbe>_concrete` mit `<andere_farbe>_carpet` oben als Deckel, oder `<farbe>_shulker_box[facing=up]`.
  - 2×2×2-Großgeschenk: Würfel aus Wolle oder Beton, eine Kreuzbahn („Schleife“) in Kontrastfarbe über die Mitte jeder Seite, oben mittig 1 Teppich oder `red_candle` als Schleifenknoten.
  - Unter dem Baum 3–7 Geschenke in einem Ring bei r = R_unten−1 … R_unten+1, in Höhe und Farbe gemischt.
- **Zuckerstange (Höhe 5–7):**
  - Stab: Spalte aus abwechselnd `red_wool` und `white_wool` (oder Beton), 1 rot, 1 weiß.
  - Haken: oben 2 Blöcke seitlich und 1–2 Blöcke abwärts, Bogenenden mit Treppen geglättet (`red_concrete` hat keine Treppen; `quartz_stairs` oder `red_nether_brick_stairs` als Ersatz).
  - Als Wegsaum alle 4–6 Blöcke abwechselnd links und rechts.
- **Kranz an Tür oder Wand (unbelegtes Muster, 3×3 bzw. 5×5):**
  ```
  3x3 (an der Wand, Tür darunter/daneben):   5x5:
   L L L                                       . L L L .
   L R L    L=spruce_leaves[persistent]        L L r L L
   L L L    R=red_wool/red_candle-Halter       L r . r L
                                               L L r L L
                                               . L R L .   R=red_wool (Schleife), r=red_concrete/rote Beeren
  ```
  Die Mitte bleibt in der 5×5-Variante Luft oder Wand. Leuchten über `red_candle` auf einer oberen Stufe direkt über dem Kranz, nicht auf dem Laub.
- **Girlande unter der Traufe:** Reihe `spruce_leaves[persistent=true]` direkt unter dem Dachüberstand, alle 3 Blöcke ein Leuchtblock (Froschlicht oder Shroomlight) in der Reihe, alle 4–6 Blöcke ein `red_wool` als Schleife. Laternen nicht ans Laub hängen, nur an Balken oder Stufen.
- **Schneemann ohne Golem-Spawn:** Das Golem-Muster funktioniert in jeder Achse, auch liegend oder kopfüber. Deshalb gilt als Generator-Regel: `carved_pumpkin` und `jack_o_lantern` dürfen in **keiner** der 6 Richtungen an einen snow_block grenzen, hinter dem in gleicher Linie ein zweiter snow_block liegt. Außerdem dürfen sie nie an einen Kupferblock grenzen. Alternativen:
  - (a) Körper `snow_block` ×2–3, Kopf `snow_block` oder `white_concrete` **ohne** Kürbis, Gesicht aus Knöpfen oder `black_carpet`-freien Details (Knöpfe halten an Blockseiten).
  - (b) Wenn ein Kürbis-Kopf gewünscht ist: Kürbis über `white_wool` (oder `white_concrete`) über `snow_block`. Das Muster greift dann nicht.
  - Hut: `black_carpet` auf dem Kopf oder ein `black_wool`-Block plus Teppich-Krempe.
  - Arme: `spruce_fence` seitlich. Nase: `orange_wool`/`orange_concrete`-Block oder ein Knopf.
- **Schlitten (Blockvariante):** Kufen aus `spruce_trapdoor[open=true]` oder `dark_oak_fence`, Körper aus `red_wool`/`red_concrete` 3×2×2 mit `spruce_stairs` als hochgebogene Front, Geschenke (Shulkerkisten) hinten. Rentiere sind Entities, also weglassen oder als Blockskulptur aus `brown_terracotta` und `spruce_fence` als Geweih bauen.
- **Marktstand-Template (aus den Maßen oben abgeleitet), Grundfläche 5×4:**
  ```
  Draufsicht (Front nach Süden)        Seitenansicht
   S S S S S   S=spruce_stairs Dach    y5  S S S S S   (Dachkante, half=bottom, facing=außen)
   P . . . P   P=spruce_log Pfosten    y4  P w r w P   w/r=white_wool/red_wool Markisenstreifen
   P B C B P   B=barrel, C=chest       y3  P . L . P   L=lantern[hanging=true]
   T T T T T   T=Theke                 y2  P . . . P
                                       y1  T T T T T   Theke: spruce_trapdoor vorne, spruce_slab[type=top] oben
  ```
  Rot-weiße Markise: abwechselnd `red_wool` und `white_wool` in Streifen senkrecht zur Front. Auf die Theke Kuchen (`cake`), `candle_cake[lit=true]`, Fässer, `decorated_pot`. Lichtquelle 15 unter dem Dach hält Schnee in d ≤ 3 frei, der Stand-Vorplatz bekommt dann keine Schneeschichten.

### Gaps
- Keine belastbare Quelle mit konkreten Lagen-Radien für Weihnachtsbäume (Videos ohne Transkript). Das Profil oben ist ein abgeleiteter Vorschlag.
- Keine primären Builder-Quellen zu Kränzen, Strümpfen (außer Item-Frame-Methode) und Schlitten-Bauplänen. Reddit-Beiträge waren per Fetch nicht erreichbar.
- Nicht verifiziert: ob Kerzen auf Zaunpfosten oder Mauerkronen halten (mechanisch zu erwarten wie bei Laternen) und ob Laternen unter horizontalen `iron_chain` hängen können.
- Der Widerspruch „Kerzen auf Laub“ (Sportskeeda/Kwell) gegen „nicht möglich“ (DiamondLobby, Opacity/Placement) ist nur für Java eindeutig. Kwells Edition ist unbekannt.

---

## 3. Landschaftsgestaltung um Gebäude (Pfade, Gärten, Zäune, Hecken, Laternenpfähle, Bänke, Brunnen, Büsche, Gelände, Lichtregeln)

### Takeaway
Pfade wirken natürlich, wenn sie aus mehreren Blöcken gemischt sind, ohne dass zwei gleiche nebeneinander liegen, und wenn sie Höhen mit Stufen und Treppen überbrücken. Organische Linien sollten nie länger als 7 Blöcke gerade laufen. Vanilla mischt in Schneedörfern 20 % Gras in dirt_path. Die Laternenpfähle in Vanilla-Schneedörfern sind exakt bekannt: 3 Fichtenzäune hoch, Arme aus Zäunen oben, Laternen hängend darunter. Für Spawn-Schutz reicht in 1.21 schon Blocklicht ≥ 1; die Abstände der Lichter sind also rein gestalterisch.

### Cited Findings
**Pfade und Mischungen:**
- „never placing more than seven blocks in a straight line when you're building something organic“ (gilt für Hänge, Wege, Gärten, Bäume, nicht für Häuser). An Flussufern Gras teils durch coarse_dirt und Pfad ersetzen, Grau (Kies, Ton) gegen Erde, Granit und Seegras tauschen. Gelände doppellagig bauen. — [minecraft.net, BlueNerd-Tutorial](https://www.minecraft.net/en-us/article/tutorial--tips-for-landscaping-and-terraforming)
- Waldweg-Palette: coarse_dirt als Basis (überwächst nicht mit Gras), dazu rooted_dirt, granite, packed_mud und dripstone_block, an „durchstoßenden“ Stellen mossy_cobblestone und gravel. Zuerst eine grobe Linie mit einem Block legen, dann zufällig mischen und darauf achten, dass keine zwei gleichen Blöcke nebeneinander liegen. Höhenwechsel mit granite_slab. Gras und Farne direkt auf den Weg setzen. Steinknöpfe und Steindruckplatten als Kiesel am Rand. — [4NetPlayers](https://www.4netplayers.com/en-au/blog/minecraft/minecraft-ways-build-paths-roads-tutorial/)
- Vanilla-Straßenprozessor Schnee/Taiga: dirt_path wird mit p=0.2 zu `grass_block[snowy=false]`, über Wasser oder Eis zu `spruce_planks`. Ebene: p=0.1, über Wasser `oak_planks`. — [street_snowy_or_taiga.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/worldgen/processor_list/street_snowy_or_taiga.json), [street_plains.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/worldgen/processor_list/street_plains.json)
- dirt_path entsteht aus dirt, grass_block, coarse_dirt, mycelium, podzol und rooted_dirt. Er ist 15/16 hoch, wird unter einem festen Block sofort zu Erde, und Fackeln oder Knöpfe lassen sich darauf nicht setzen. — [minecraft.wiki/Dirt_Path](https://minecraft.wiki/w/Dirt_Path)
- Block-Tag `dirt` (1.21.11): dirt, grass_block, podzol, coarse_dirt, mycelium, rooted_dirt, moss_block, pale_moss_block, mud, muddy_mangrove_roots. — [tags/block/dirt.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/tags/block/dirt.json)
- Coarse dirt wird beim Bearbeiten mit Schaufel oder Hacke zu normaler Erde. — [feedback.minecraft.net (Snippet)](https://feedback.minecraft.net/hc/en-us/community/posts/7439045249677-Coarse-Dirt-Paths-Farmland)
- Wege im Weihnachtsdorf: Bruchstein oder Kies, gesäumt mit Laternen oder Redstone-Lampen. — [G-Portal](https://www.g-portal.com/en/blog/minecraft-christmas-village-en)

**Laternenpfähle (Vanilla, exakt aus NBT 1.21.11):**
- `snowy_lamp_post_01` (3×4×1), y0 = Anschluss an den Weg (Jigsaw):
  ```
  y3:  F═F═F      F = spruce_fence (Arme verbunden east/west)
  y2:  L F L      L = lantern[hanging=true]
  y1:  . F .
  ```
- `snowy_lamp_post_02` (2×4×1): wie 01, aber nur ein Arm mit einer Laterne.
- `snowy_lamp_post_03` (3×4×3): Kreuz aus 4 Armen, an jedem eine hängende Laterne, am Fuß 3× `snow[layers=1]`.
  ```
  Draufsicht y3:   . F .      y2:  . L .      y0: . s .   s = snow[layers=1]
                   F F F           L F L          . J s   J = Jigsaw/Boden
                   . F .           . L .          . s .
  ```
- Quellen: [snowy_lamp_post_01.nbt](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/structure/village/snowy/snowy_lamp_post_01.nbt), [_02](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/structure/village/snowy/snowy_lamp_post_02.nbt), [_03](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/structure/village/snowy/snowy_lamp_post_03.nbt) (selbst ausgewertet; Blueprints auch auf [minecraft.wiki/Village/Structure/Blueprints](https://minecraft.wiki/w/Village/Structure/Blueprints))
- Weitere Pfahl-Ideen:
  - Zaun senkrecht plus ein waagerechter Zaun als Arm, daran eine hängende Laterne.
  - Froschlicht auf gestapelten Zäunen, oder darunter hängend.
  - „Baum-Laterne“: Leuchtblock auf dem Zaun, mit Laub ummantelt. Laub ist transparent und blockiert kein Licht.
  - Redstone-Lampe mit invertiertem Tageslichtsensor.
  - Quelle: [Sportskeeda lamp posts](https://www.sportskeeda.com/minecraft/5-best-lamp-post-ideas-minecraft-beginners)
- Mob-Spawning: Die meisten feindlichen Mobs brauchen internes Himmelslicht ≤ 7 **und Blocklicht 0**. — [minecraft.wiki/Light](https://minecraft.wiki/w/Light)

**Zäune, Mauern, Hecken, Bäume, Büsche, Gärten:**
- Zustände: `spruce_fence` hat north/east/south/west true|false plus waterlogged. `spruce_fence_gate` hat facing, in_wall, open, powered. Mauern wie `cobblestone_wall`, `mossy_cobblestone_wall` und `stone_brick_wall` haben north/east/south/west = none|low|tall, `up` true|false und waterlogged. — [misode blocks 1.21.11](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Neuere Bodendecker und Pflanzen in 1.21.11: `bush`, `firefly_bush`, `leaf_litter[segment_amount=1..4,facing]`, `wildflowers[flower_amount=1..4,facing]`, `pink_petals`, `short_dry_grass`, `tall_dry_grass`, `pale_moss_carpet`, `moss_carpet`, `azalea`, `flowering_azalea`, `sweet_berry_bush[age 0..3]`, `fern`, `large_fern[half]`. — [misode blocks 1.21.11](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Eigene Bäume:
  - Äste in unterschiedlicher Höhe und Länge, nie gleich.
  - Treppen und Stufen an Knickstellen, damit Äste dicker wirken.
  - Laub an den Astenden am breitesten, nach oben kuppelförmig einziehend, unten weniger Laub als oben.
  - Basis mit 2–3 Blöcke hohen Stammanbauten und Wurzeln (`mangrove_roots`).
  - Zäune als Zweige. Bei schiefem Baum zeigen die meisten Äste in Neigungsrichtung.
  - Quelle: [DiamondLobby custom tree](https://diamondlobby.com/minecraft/how-to-build-custom-tree-in-minecraft/)
- Fichten mit `spruce_fence` als Ästen wirken voller. — [Sportskeeda custom trees](https://www.sportskeeda.com/minecraft/5-best-custom-tree-designs-minecraft-bedrock-edition-beginners)
- Um Marktstände Azaleen, Blumen, Blumentöpfe und Pfade. — [minecraft.how](https://minecraft.how/blog/post/build-minecraft-market-stall)

### Inferences
- **Pfad-Mischungen** (Gewichte als Startwerte, angelehnt an Vanilla 80/20 und die 4NetPlayers-Regel „keine zwei gleichen nebeneinander“):
  - *Schneedorf-Hauptweg:* `dirt_path` 65 %, `coarse_dirt` 15 %, `gravel` 10 %, `packed_mud` 5 %, `grass_block[snowy=true]` mit Schnee 5 % am Rand. Auf dirt_path keinen Schnee, auf coarse_dirt, gravel und packed_mud optional `snow[layers=1]` (20–40 % am Rand, 0 % in der Mitte), damit eine „freigetretene Spur“ entsteht.
  - *Dorfplatz/Markt (gepflastert):* `cobblestone` 40 %, `stone_bricks` 25 %, `mossy_cobblestone` 10 %, `cracked_stone_bricks` 10 %, `andesite` 10 %, `gravel` 5 %. Ränder mit `stone_brick_slab[type=bottom]` oder `cobblestone_slab`.
  - *Waldpfad:* `coarse_dirt` 40 %, `rooted_dirt` 15 %, `packed_mud` 15 %, `granite` 10 %, `dirt_path` 10 %, `mossy_cobblestone`/`gravel` 10 %, dazu `fern`/`short_grass` auf 5 % der Pfadblöcke.
- **Breite und Ränder (keine Quelle, Vorschlag):**
  - Hauptwege 3 breit (Platz/Bahnhof 5–7), Nebenwege 1–2.
  - Rand mit 30–50 % Wahrscheinlichkeit zufällig ±1 „ausfransen“ lassen.
  - Kurven so legen, dass kein gerades Stück > 7 Blöcke entsteht (BlueNerd-Regel).
  - Höhenwechsel über 1 Block: Stufe → Treppe. Mehr als 2 Höhe auf 3 Länge vermeiden.
- **Laternenpfahl-Raster:**
  - Vanilla-Pfähle (3 Zäune plus Arm) im Abstand 8–12 Blöcke entlang der Hauptwege, abwechselnd links und rechts.
  - An Kreuzungen das 4-Arm-Modell `snowy_lamp_post_03`.
  - Laternen (15) halten Schnee im Taxicab-Radius 3 frei. Hängt die Laterne h Blöcke über der Schneeebene, schmilzt Schnee am Boden in einem horizontalen Taxicab-Radius von 3−h. Bei den Vanilla-Pfählen ist h=2, also Radius 1. Auffällig: Vanilla `snowy_lamp_post_03` setzt `snow[layers=1]` genau 2 Blöcke unter drei der vier Laternen (Abstand 2 → Licht 13). Diese Schichten müssten im Spiel wegschmelzen (eigene Auswertung der NBT plus Schmelzregel). Generator-Regel: unter Laternen keine Schneeschichten, höchstens snow_block, oder die Laterne um mindestens 4 Blöcke anheben.
  - Varianten: Pfosten aus `cobblestone_wall` oder `stone_brick_wall` mit Zaun-Arm; `iron_chain[axis=y]` zwischen Arm und `lantern[hanging=true]`; `soul_lantern` als „kühle“ Variante (Licht 10, schneesicher).
- **Hecken:** `spruce_leaves`, `azalea_leaves`, `flowering_azalea_leaves` oder `dark_oak_leaves`, immer `persistent=true`.
  - 1 hoch entlang Wegen und Gärten, 2 hoch als Grundstücksgrenze.
  - Ober- und Unterkante unregelmäßig: 10–20 % der Krone fehlen oder sitzen 1 höher.
  - Im Winter-Setting `snow[layers=1]` auf die Hecke.
- **Büsche (1–3 Blöcke):** Kern `oak_log` oder `spruce_log` (1 Block, kann entfallen), drum herum 4–8 Laubblöcke als „+“ plus zufällige Ecken, 1 Laub oben. Kleinste Variante: `azalea`/`flowering_azalea` (Pflanzenblock) oder `bush`. In Schnee-Szenen Laub mit Schneeschicht oben.
- **Zäune um Gärten:**
  - `spruce_fence` mit korrekten Verbindungs-Properties; der Generator muss north/east/south/west aus den Nachbarn berechnen.
  - Tor `spruce_fence_gate[facing=…]` an der Pfadeinmündung.
  - Pfosten-Akzent alle 4–6 Blöcke: `spruce_log`, oder `cobblestone_wall` mit `up=true` und einer Kerze darauf.
  - Mauern: `low` für normale Seiten, `tall` nur unter Blöcken.
- **Bank (Vorschlag):** 2–3 `spruce_stairs[facing=zum Weg weg]` nebeneinander, Seitenlehnen aus `spruce_trapdoor[open=true]` (facing jeweils nach außen), dahinter optional Hecke. Abstand zum Weg 1 Block, Ausrichtung zum Baum, Brunnen oder Platz.
- **Brunnen (Vorschlag):** 3×3-Ring `cobblestone`/`stone_bricks` mit Wasser oder `ice` in der Mitte (im Winter packed_ice nehmen, um Schmelzen zu vermeiden), 4 Eck-Pfosten `spruce_fence` (2 hoch), Dach aus `spruce_stairs` und `spruce_slab`, optional `bell[attachment=ceiling]` oder `iron_chain` plus Eimer-Ersatz `cauldron`.
- **Gelände-Integration an Hängen:**
  - Fundament unter dem Haus bis auf den tiefsten Geländepunkt plus 1 auffüllen, sichtbare Teile als „Sockel“ aus `cobblestone`/`stone_bricks`/`mossy_cobblestone` (1–3 hoch).
  - Bei mehr als 3 Blöcken Höhenunterschied: Stützmauer aus `stone_bricks` mit `stone_brick_wall` als Krone, oberste Lage 1 Block zurückgesetzt.
  - Gelände doppellagig.
  - Übergang zum Gelände: 1–2 Ringe `coarse_dirt`/`rooted_dirt`/`gravel` (30–50 %) am Fundamentrand.
- **Licht-Ästhetik-Regeln:**
  - (1) Pro Gebäudeeingang eine warme Quelle (Laterne, Kerze).
  - (2) Entlang der Wege gleichmäßige Abstände wie oben.
  - (3) Große Lichtmengen (Baum, Markt) bündeln statt verstreuen; „A few well-placed light sources beat dozens of lanterns“, siehe [minecraft.how](https://minecraft.how/blog/post/build-minecraft-market-stall).
  - (4) Für Spawn-Schutz zwischen den Akzenten `light[level=1..11]` unter Schnee oder in Laub, weil Blocklicht ≥ 1 reicht und Schnee bei ≤ 11 nicht schmilzt.

### Gaps
- Keine zitierfähige Quelle für konkrete Pfadbreiten, Laternenabstände (die Lamp-Post-Suchtreffer nannten keine Zahlen), Bank- und Brunnenmaße, Stützmauer-Proportionen. Die Werte oben sind Vorschläge.
- Vanilla-Brunnen und -Bänke aus anderen Dorf-Typen wurden nicht als NBT ausgewertet. Möglich wäre das, z. B. `village/plains/town_centers/plains_fountain_01.nbt` mit demselben Parser.
- Das minecraftdesign.fandom-Lighting-Tutorial war nicht erreichbar (403).

---

## 4. Blöcke vs. Entities (Exportierbarkeit in ein reines Block-Schematic)

### Takeaway
Alles mit Licht, Schnee, Eis, Laub, Kerzen, Laternen, Ketten, Zäunen und Köpfen ist ein Block. Item Frames (auch glow), Rüstungsständer, Gemälde, End-Kristalle, Loren, Pferde/„Rentiere“, Schneegolems und Villager sind Entities und fallen in einem reinen Block-Schematic weg. Banner, Schilder, Spielerköpfe und Truhen sind Blöcke mit Block-Entity-Daten. Ohne diese NBT erscheinen sie leer: Banner ohne Muster, Kopf ohne Skin.

### Cited Findings
- Rüstungsständer: „an inanimate entity“. — [minecraft.wiki/Armor_Stand](https://minecraft.wiki/w/Armor_Stand)
- Item Frame ist in Java ein Entity (Infobox „Block in BE and item entity in JE“). — [minecraft.wiki/Item_Frame](https://minecraft.wiki/w/Item_Frame)
- Gemälde: Item-Entity-Infobox. — [minecraft.wiki/Painting](https://minecraft.wiki/w/Painting)
- Schneegolem ist ein Mob, der aus dem Blockmuster entsteht (siehe Abschnitt 2). — [minecraft.wiki/Snow_Golem](https://minecraft.wiki/w/Snow_Golem)
- Builder-Tipps, die Entities voraussetzen: Item Frames als Ornamente, Weihnachtsbaum-Sterne aus end_crystal, Strümpfe in unsichtbaren Item Frames, Rentiere als Pferde, Schlitten aus Loren. — [Sportskeeda how-to](https://www.sportskeeda.com/minecraft/how-build-christmas-tree-minecraft), [G-Portal](https://www.g-portal.com/en/blog/minecraft-christmas-village-en), [PCGamesN](https://www.pcgamesn.com/minecraft/christmas)
- Blockzustände für Köpfe und Banner: `player_head[rotation=0..15]` (Wandvariante `player_wall_head`), `red_banner[rotation=0..15]`; `decorated_pot` mit facing, cracked, waterlogged; Hängeschilder `spruce_hanging_sign[attached,rotation]` und `spruce_wall_hanging_sign[facing]`; `bell[attachment,facing]`; `campfire[lit,signal_fire,facing]`. — [misode blocks 1.21.11](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Spielerköpfe übernehmen die zweite Skin-Ebene, also das Profil eines Spielers. — [minecraft.wiki/Head](https://minecraft.wiki/w/Head)
- Weihnachts-Truhentextur: automatisch vom 24. bis 26.12., ohne Daten. — [minecraft.wiki/Chest](https://minecraft.wiki/w/Chest)

### Inferences
- **Reine Blöcke (sicher exportierbar):**
  - Schnee und Eis: snow, snow_block, powder_snow, ice, packed_ice, blue_ice, pointed_dripstone
  - Laub, Pflanzen und Böden: alle Leaves (persistent=true), Pflanzen, dirt_path, coarse_dirt usw.
  - Licht: lantern, soul_lantern, copper_lantern, iron_chain, copper_chain, end_rod, alle Froschlichter, shroomlight, glowstone, sea_lantern, redstone_lamp, copper_bulb, candle (lit), light, jack_o_lantern, carved_pumpkin
  - Konstruktion: Zäune, Mauern, Falltüren, Treppen, Stufen, Wolle, Beton, Teppich, Buntglas
  - Ohne nötige Zusatzdaten: shulker_box (Kisten ohne Inhalt), cake, candle_cake, flower_pot und potted_*
- **Blöcke mit Block-Entity (NBT nötig, sonst Default-Optik):**
  - banner: Muster
  - player_head: `profile`, sonst Steve/Alex
  - Schilder und Hängeschilder: Text
  - decorated_pot: Scherben
  - campfire: Items
  - chest, barrel, shulker_box: Inhalt (optisch egal)
  - lectern, bell
  - Wenn das Schematic-Format keine Block Entities trägt, nur „leere“ Varianten verwenden.
- **Entities (nicht exportierbar, durch Blöcke ersetzen):**
  - item_frame und glow_item_frame → Ornament aus Wolle oder Beton als Block
  - armor_stand → Vogelscheuche oder Figur aus Zäunen und Köpfen
  - painting → Banner bzw. Wolle-Pixel-Art
  - end_crystal → Glowstone- oder end_rod-Stern
  - minecart- oder boat-Schlitten → Block-Schlitten
  - horse („Rentier“) → Blockskulptur
  - snow_golem → Schneemann ohne Kürbis-Muster
  - villager, Display-Entities (block_display/item_display/text_display), Leinen-Knoten, Feuerwerk
- **Schematic-Fallstricke (Block-Updates nach dem Einfügen):**
  - Kerzen und Laternen auf Laub bzw. ohne gültige Stütze fallen beim ersten Nachbar-Update ab ([Lantern](https://minecraft.wiki/w/Lantern)).
  - `redstone_lamp[lit=true]` ohne Stromquelle geht aus.
  - `carved_pumpkin` auf 2× snow_block oder auf einem Kupferblock kann je nach Einfüge-Reihenfolge und Methode (Befehle zählen) einen Golem spawnen.
  - Leaves mit `persistent=false` zerfallen, wenn kein Stamm in ≤ 6 Blöcken ist.
  - Schnee und Eis in Lichtnähe schmelzen per Random Tick.
  - `dirt_path` unter festen Blöcken wird zu Erde.

### Gaps
- Nicht geprüft, wie die eingesetzte Export-Pipeline (z. B. Sponge `.schem` v3 oder Litematica) Block Entities behandelt. Davon hängt ab, ob Banner-Muster und Kopf-Skins möglich sind.
- Ob ein per Structure-Template oder WorldEdit eingefügter Kürbis den Golem-Check auslöst, hängt vom Einfügeweg ab. Die Wiki bestätigt nur Spieler, Werfer, Endermen und Befehle.
