# Fenster, Türen/Eingänge und kleine Fassadendetails als Generator-Templates (Minecraft Java 1.21.11, DataVersion 4671)

> Rechercheumfang: Außenansichten (Fassaden), nur Blöcke. Alle Block-IDs und Block-States in diesem Dokument wurden gegen den offiziellen Block-State-Dump für 1.21.11 geprüft ([misode/mcmeta 1.21.11-summary blocks/data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)); die Bedeutung der Properties stammt von minecraft.wiki (per MediaWiki-API abgerufen). Design-Ideen stammen aus Builder-Guides (Qualität gemischt, jeweils gekennzeichnet). Reddit, Planet Minecraft und Pinterest waren aus der Rechercheumgebung nicht abrufbar (siehe Gaps).

---

## 1. Technische Grundlagen: Block-States, Verbindungslogik und was beim Einfügen (WorldEdit/Schematic) passiert

### Takeaway
Glasscheiben, Eisengitter, Zäune und Mauern speichern ihre Verbindungen als Block-State-Properties (`north/east/south/west` = `true/false` bzw. bei Mauern `none/low/tall` plus `up`). Ein Generator muss diese States nach dem Zusammenbau des ganzen Gebäudes selbst berechnen (Post-Pass) – nicht darauf vertrauen, dass das Einfüge-Tool sie korrigiert. Türen bestehen aus zwei Blöcken (`half=lower/upper`), Treppen-`facing` zeigt die hohe (volle) Seite, offene Falltüren liegen an der dem `facing` **gegenüberliegenden** Blockkante. Die Kette heißt in 1.21.11 `minecraft:iron_chain` (nicht mehr `minecraft:chain`).

### Cited Findings

**Kette / Iron Chain (ID-Frage)**
- In 1.21.11 existiert `minecraft:iron_chain` mit States `axis=x|y|z` (Default `y`) und `waterlogged`; `minecraft:chain` existiert **nicht** mehr. Zusätzlich gibt es `copper_chain`, `exposed_copper_chain`, `weathered_copper_chain`, `oxidized_copper_chain` und die `waxed_*`-Varianten — [mcmeta 1.21.11 blocks](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Umbenennung: Java 1.21.9 (Snapshot 25w32a) „Chain“ → „Iron Chain“ (Anzeigename); Java 1.21.9 (25w35a) „Renamed `chain` to `iron_chain`“ (ID) — [minecraft.wiki: Iron Chain](https://minecraft.wiki/w/Iron_Chain)
- Ketten brauchen keinen Stützblock („can exist completely free-standing in mid air“), verbinden sich nur in gleicher Orientierung, und Laternen (normal, Seelen-, Kupfer-) sowie Hängeschilder und Glocken können an Ketten hängen; die Kettentextur geht nahtlos in die Laterne über — [minecraft.wiki: Chain](https://minecraft.wiki/w/Chain)

**Glasscheiben (glass_pane, *_stained_glass_pane)**
- States (JE): `east`, `north`, `south`, `west` (`true|false`, „When true, the glass pane extends from the center post to the …“) und `waterlogged`; Default alles `false` — [minecraft.wiki: Glass Pane](https://minecraft.wiki/w/Glass_Pane); bestätigt in [mcmeta](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Ohne Nachbarn erscheint eine Scheibe als dünner 2×2-Pixel-Pfosten; mit Nachbarn wird sie flach, L-, T- oder kreuzförmig. Scheiben sind nie horizontal – horizontale Glasflächen müssen aus Glasblöcken bestehen — [minecraft.wiki: Glass Pane](https://minecraft.wiki/w/Glass_Pane)
- Glasscheiben nutzen dasselbe Modell wie Eisengitter (Historie 1.8 pre); 16 Scheiben aus 6 Glasblöcken — [minecraft.wiki: Glass Pane](https://minecraft.wiki/w/Glass_Pane)
- In 1.21.11 gibt es 16 gefärbte Scheiben (`white_stained_glass_pane` … `black_stained_glass_pane`) plus `glass_pane`; Glasblöcke `glass`, `tinted_glass`, `*_stained_glass` haben keine States — [mcmeta](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)

**Eisengitter / Kupfergitter (iron_bars, *copper_bars)**
- Gleiche States wie Glasscheiben (`east/north/south/west/waterlogged`); Platzierung „in much the same way as fences or glass panes“ — [minecraft.wiki: Bars](https://minecraft.wiki/w/Bars)
- Neu in 1.21.9+: `copper_bars`, `exposed_/weathered_/oxidized_copper_bars` und `waxed_*`-Varianten existieren in 1.21.11 — [mcmeta](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json); ungewachste Kupfergitter oxidieren in 4 Stufen, Wachs (Honigwabe) stoppt das — [minecraft.wiki: Copper Bars](https://minecraft.wiki/w/Copper_Bars)

**Zäune (*_fence)**
- States: `east/north/south/west` (`true|false`), `waterlogged`. Ein Zaun „automatically connects to any solid block that is placed next to it“; Holzzäune verbinden sich mit Holzzäunen, aber nicht mit Netherziegelzäunen; Netherziegelzäune verbinden sich mit Holz-Zauntoren — [minecraft.wiki: Fence](https://minecraft.wiki/w/Fence)

**Mauern (*_wall)**
- States: `east/north/south/west` = `none|low|tall`, `up` (`true` = Mittelpfosten), `waterlogged`; Default `up=true`, Seiten `none` — [minecraft.wiki: Wall](https://minecraft.wiki/w/Wall); [mcmeta](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Mauern verbinden sich mit jedem horizontal angrenzenden verbindbaren Block, mit Gittern und Glasscheiben, aber **nicht** mit Zäunen (Zauntore schon). Die Seite wird erhöht („tall“), wenn darüber ein Block die Seite abdeckt. Ein Mittelpfosten entsteht immer, wenn oben ein Banner, eine Druckplatte, eine Bodenfackel, ein Schild, Stolperdraht oder eine Mauer mit Pfosten sitzt; ansonsten hat die Mauer einen Pfosten, „unless connecting to only two opposite sides or all four sides“ — [minecraft.wiki: Wall](https://minecraft.wiki/w/Wall)
- Block-Tag `wall_post_override` (1.21.11): torch, soul_torch, redstone_torch, copper_torch, tripwire, #signs, #banners, #pressure_plates, cactus_flower — [mcmeta 1.21.11-data tags](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/tags/block/wall_post_override.json)

**Treppen (*_stairs)**
- `facing`: „The direction the stairs' full-block side faces“ (bei Spieler-Platzierung = Blickrichtung des Spielers); `half=top` = umgedreht; `shape` = `straight|inner_left|inner_right|outer_left|outer_right` („left“/„right“ = Richtung der höheren Stufe) — [minecraft.wiki: Stairs](https://minecraft.wiki/w/Stairs)
- Treppen ändern ihre Form automatisch beim Angrenzen an andere Treppen (inner/outer corner); „Right side up stairs do not join with upside-down stairs and vice versa.“ — [minecraft.wiki: Stairs](https://minecraft.wiki/w/Stairs)
- Historie: „Snow layers can now be placed on top of upside-down stairs.“ — [minecraft.wiki: Stairs](https://minecraft.wiki/w/Stairs)

**Falltüren (*_trapdoor)**
- `facing`: „The direction the trapdoor swings open. The opposite from the side its hinge is attached to.“; `half=bottom|top` (oberer/unterer Teil des Blocks); `open`; `powered`; `waterlogged` — [minecraft.wiki: Trapdoor](https://minecraft.wiki/w/Trapdoor)
- Seit Java 1.9 (15w31a) brauchen Falltüren keinen Befestigungsblock mehr; nach dem Platzieren kann der Befestigungsblock entfernt werden — [minecraft.wiki: Trapdoor](https://minecraft.wiki/w/Trapdoor)
- Geschlossene Falltüren wirken als fester Untergrund: Laternen können **auf** eine geschlossene Falltür mit `half=top` und **unter** eine geschlossene Falltür mit `half=bottom` gesetzt werden; offene Falltüren sind nicht tragfähig — [minecraft.wiki: Trapdoor](https://minecraft.wiki/w/Trapdoor)
- 21 Falltür-Varianten in 1.21.11 (alle Hölzer inkl. `pale_oak`, `cherry`, `bamboo`, `crimson`, `warped`, plus `iron_trapdoor` und 8 Kupfer-Varianten) — [mcmeta](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)

**Türen (*_door)**
- States: `facing` („The direction the door's 'inside' is facing. The direction the player faces while placing the door. For example, a door facing east occupies the west part of its block when closed.“), `half=lower|upper`, `hinge=left|right` („the side the hinge is on (when facing the same direction as the door's inside)“), `open`, `powered` — [minecraft.wiki: Door](https://minecraft.wiki/w/Door)
- „Doors must be supported by a full solid block face beneath them.“ Doppeltür-Regel beim Platzieren: Steht eine passende Tür daneben, deren Griffseite die neue Tür berührt, bildet sich eine Doppeltür „with its handle touching the existing door's handle, with hinges opposite“ — [minecraft.wiki: Door](https://minecraft.wiki/w/Door)
- „When placed using the /setblock command, only one half of a door is placed, because doors are actually two separate blocks.“ — [minecraft.wiki: Door](https://minecraft.wiki/w/Door)
- 21 Türvarianten in 1.21.11 (inkl. `pale_oak_door`, `bamboo_door`, `cherry_door`, `iron_door`, Kupfertüren inkl. `waxed_*`) — [mcmeta](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)

**Laternen**
- `lantern`, `soul_lantern`, `copper_lantern` (+ exposed/weathered/oxidized/waxed) mit States `hanging` und `waterlogged` — [mcmeta](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json); `hanging`: „If the lantern is hanging from a block.“ — [minecraft.wiki: Lantern](https://minecraft.wiki/w/Lantern)
- Liegt eine Laterne auf einer ungültigen Fläche, „the lantern will break and drop itself when the invalid surface receives a block update“. Laternen haben Lichtstufe 15 und „melt snow layers within 2 blocks and ice within 3 blocks (taxicab distance)“ — [minecraft.wiki: Lantern](https://minecraft.wiki/w/Lantern)

**Einfügen per WorldEdit (Side Effects)**
- WorldEdit 7.3.x Standard-Side-Effects: `LIGHTING` ON, `NEIGHBORS` ON („Notifies nearby blocks of changes“), `UPDATE` ON („Notifies the changed block“), `VALIDATION` OFF („Validates and fixes inconsistent world state, such as disconnected blocks“), `ENTITY_AI` OFF, `EVENTS` OFF — [WorldEdit SideEffect.java (7.3.x)](https://github.com/EngineHub/WorldEdit/blob/version/7.3.x/worldedit-core/src/main/java/com/sk89q/worldedit/util/SideEffect.java); Beschreibungen aus [WorldEdit strings.json](https://github.com/EngineHub/WorldEdit/blob/version/7.3.x/worldedit-core/src/main/resources/lang/strings.json)
- Die Side Effects sind per `//perf [sideEffect] [newState]` umschaltbar („Toggle side effects for performance“); `//fast` ist veraltet und dupliziert `//perf` — [WorldEdit Commands](https://worldedit.enginehub.org/en/latest/commands/)

### Inferences

#### Template-Konventionen (gelten für alle Templates in Abschnitt 2–4)
- **Kanonische Ausrichtung:** Jede Vorlage ist für eine Fassade entworfen, deren Außenseite nach **Süden** (+Z) zeigt. Frontansicht = Blick nach Norden auf die Fassade; `x` wächst nach rechts (= Osten), `y` nach oben.
- **Tiefenebenen `d`:** `d=0` = Wandebene; `d=+1` = 1 Block vor der Wand (außen, Süden); `d=+2` = 2 Blöcke vor der Wand; `d=-1` = innen (Norden).
- **Nullpunkt:** `x=0` = linke Spalte der Öffnung, `y=0` = unterste Zeile der Öffnung (bei Türen: die Zeile der unteren Türhälfte).
- **Seitenansicht (Schnitt):** Blick nach Osten → links = innen (`d=-1`), rechts = außen (`d=+1`, `d=+2`).
- **Legende:** `#` = Fassadenmaterial (voller Block), `.` = Luft, weitere Zeichen pro Template erklärt. Wo nicht anders angegeben, gilt `waterlogged=false`, `powered=false`.
- **Rotation auf andere Fassaden** (abgeleitet aus den Richtungs-Properties): Außenseite West = 90° im Uhrzeigersinn (north→east→south→west→north), Außenseite Nord = 180° (n↔s, e↔w), Außenseite Ost = 90° gegen den Uhrzeigersinn (north→west, west→south, south→east, east→north). Rotiert werden **alle** `facing`-Werte **und** die Verbindungs-Properties (`north/east/south/west` von Scheiben, Gittern, Zäunen, Mauern, Ranken). `axis=x` ↔ `axis=z` bei 90°/270° (Stämme, Ketten). Positionen: Außen Ost → Welt-x = x0 + d, Welt-z = z0 − x; Außen West → Welt-x = x0 − d, Welt-z = z0 + x; Außen Nord → Welt-x = x0 − x, Welt-z = z0 − d.
- **Spiegelung (links/rechts):** `hinge` left↔right, Treppen-`shape` `*_left`↔`*_right`, `east`↔`west` (bei Fassaden-Spiegelung entlang x).

#### Verbindungs-Post-Pass (Pseudo-Code, aus den Wiki-Regeln abgeleitet)
```
für jeden Block B in {glass_pane, *_stained_glass_pane, iron_bars, *copper_bars}:
    für jede Richtung r in {north,east,south,west}:
        N = Nachbar(B, r)
        B[r] = (N ist Scheibe/Gitter) oder (N ist *_wall) oder (Seite von N zu B ist volle, tragfähige Fläche)
für jeden Zaun Z (*_fence):
    Z[r] = (N ist Zaun derselben Familie: Holz↔Holz, nether_brick↔nether_brick)
           oder (N ist Zauntor, passend ausgerichtet) oder (N hat volle Fläche zu Z)
    // KEINE Verbindung zu Scheiben, Gittern oder Mauern
für jede Mauer M (*_wall):
    verbunden(r) = (N ist Mauer) oder (N ist Scheibe/Gitter) oder (N ist Zauntor) oder (volle Fläche)
    M[r] = none, wenn nicht verbunden; sonst tall, wenn der Block über M diese Seite abdeckt, sonst low
    M.up = true, wenn Block darüber in #wall_post_override oder Mauer mit up=true;
           sonst false NUR bei genau zwei gegenüberliegenden oder allen vier Seiten verbunden
           (Ausnahme: dann trotzdem true, wenn etwas den Mittelpunkt oben bedeckt) – sonst true
```
- Der Post-Pass muss **nach** dem Zusammensetzen aller Templates und der Wand laufen, weil Template-Ränder an Wandblöcke grenzen, die das Template selbst nicht kennt.
- Volle Würfel (Planken, Stein, Stämme, Glasblock) gelten als tragfähige Seiten. Treppen haben nur auf ihrer `facing`-Seite eine volle Fläche, Platten (`type=top/bottom`) seitlich nie → Scheiben neben Treppen-Schrägen/Platten bleiben ohne Verbindung (dünner Pfosten). Deshalb nutzen die Rundfenster unten Glas**blöcke**.
- **Tiefen-Falle:** Steht ein Gitter/eine Scheibe in `d=+1` direkt vor einer Scheibe in `d=0`, verbinden sie sich (`south=true` bzw. `north=true`) → T-förmige Stummel. Entweder bewusst so speichern (realistisch) oder Ebenen nicht direkt hintereinander setzen.
- **WorldEdit:** Weil in 7.3.x `NEIGHBORS`/`UPDATE` standardmäßig an sind, können beim Einfügen Nachbar-Updates ausgelöst werden – das kann falsche Verbindungen korrigieren, aber auch nicht gestützte Blöcke (Laternen, Türhälften, Schnee) abbrechen lassen. Für reproduzierbare Ergebnisse: States **immer korrekt speichern** und Stützregeln einhalten, unabhängig vom Tool.

#### Stütz-Regeln (für alle Templates)
- Türen: unter `half=lower` immer ein voller Block; beide Hälften mit identischem `facing/hinge/open/powered` speichern.
- Laternen `hanging=false`: Block darunter mit tragfähiger Mitte (voller Block, Zaun-/Mauerpfosten, geschlossene Falltür `half=top`). `hanging=true`: Block darüber mit tragfähiger Unterseite (voller Block, Platte `type=bottom` oder `top`, geschlossene Falltür `half=bottom`, `iron_chain[axis=y]`).
- Schnee: nur auf voller Oberseite (inkl. umgedrehter Treppen) und mindestens 3 Blöcke Abstand zu Laternen (Wiki: Schmelzen im Umkreis von 2 Blöcken).
- Blätter immer mit `persistent=true` speichern (siehe Abschnitt 4).

### Gaps
- Die genaue Ausnahmeliste, mit welchen vollen Blöcken sich Scheiben/Zäune trotz voller Fläche **nicht** verbinden (z. B. Blätter, Kürbisse), wurde nicht in einer Quelle gefunden – in-game prüfen.
- Ob WorldEdits `NEIGHBORS`-Side-Effect beim `//paste` tatsächlich die Formen (Verbindungen) von Scheiben/Zäunen neu berechnet, ist aus Quellcode-Enum und Beschreibung nicht eindeutig; FastAsyncWorldEdit (FAWE) wurde nicht geprüft.
- Strukturblöcke/`/place template` und Litematica wurden nicht untersucht.

---

## 2. Fenster-Katalog (Templates)

### Takeaway
Gute Minecraft-Fenster entstehen fast nie aus „Loch + Glas“: Builder-Guides kombinieren Rahmen (entrindete Stämme, Stein), Sims (Treppen/Platten/Falltüren), Läden (offene Falltüren), Sturz und Pflanzen und arbeiten mit **Tiefe** – entweder 1 Block zurückgesetzt oder 1 Block vorgesetzt. Für einen Generator lassen sich daraus ~18 parametrisierbare Templates ableiten; die Block-States sind unten exakt angegeben.

### Cited Findings
- Die meisten Fensterdesigns brauchen 1–2 Blöcke Wandtiefe; wer keinen Platz hat, baut sie aus der Wand heraus („extending them out of the walls … many Minecrafters use this method“) — [Gamer Empire: 11 Fancy Minecraft Window Design Ideas](https://gamerempire.net/minecraft-window-design-ideas/)
- Holzart passend zum Biom: „oak wood for plains and forest biomes, birch for desert biomes, acacia for savanna“, Fichte für Taiga — [Gamer Empire](https://gamerempire.net/minecraft-window-design-ideas/)
- Materiallisten konkreter Fensterdesigns (Auswahl) — [Gamer Empire](https://gamerempire.net/minecraft-window-design-ideas/):
  - Spruce Window: Spruce Log, Spruce Stairs, Spruce Fences, Spruce Trapdoors, Spruce Button, Coarse Dirt, Glass Panes, Sweet Berries
  - Dark Oak Window: Dark Oak Slabs, Trapdoors, Fence Gates, Signs, Leaves, Glass Panes, Chains („more mysterious, like it's from witch huts' windows“)
  - Desert Village Window: Cut Sandstone (+Slabs), Birch Fences, Glass Panes, Flower Pot, Cactus
  - Brick Window: Bricks, Brick Stairs, Granite (+Stairs/Slabs), Iron Bars, Spruce Trapdoors, Glass Panes
  - Mushroom Forest Window: Red Mushroom Blocks, Mushroom Stem, Iron Bars, Flower Pot, Glass Panes
  - Overgrown Window: Moss, Mossy Cobblestone (+Slabs), Cobblestone Stairs, Pointed Dripstone, Spruce Trapdoor, Hanging Roots, Stone Button, Lime Glass Panes
  - Steampunk/Acacia Window: Stripped Acacia Logs, Acacia Fences/Trapdoors, Cut Copper (+Stairs), Exposed Cut Copper Stairs, Vines, Glass Panes, Stone Bricks
  - Underground Window: Deepslate Bricks, Calcite, Diorite, Dark Oak Fences, Magenta Glass
- „Stone-Surrounded Windows“: Steintreppen an den Ecken und eine Säule aus Chiseled Stone Bricks als Stützoptik; „Spruce Wood Build“: Spruce Stairs, Fences, Stripped Wood, Mossy/normale Stone Brick Stairs, Cobblestone Fences, braunes Buntglas; großes Fichtenfenster mit Treppen, Platten, Falltüren, Blättern, Laternen und Shroomlight dahinter — [NameHero: Minecraft Window Designs (Nov 2024)](https://www.namehero.com/gaming-blog/minecraft-window-designs-the-complete-guide/)
- Falltüren neben Fenstern wirken wie Fensterläden (Sportskeeda, nur als Such-Snippet gesehen, Seite lieferte HTTP 405) — [Sportskeeda: 5 best ways to use spruce trapdoors](https://sportskeeda.com/minecraft/5-best-ways-use-spruce-trapdoors-minecraft-1-18-update)
- Mittelalter: Holztreppen „for the roof and small details like window ledges“, Glasscheiben für Fenster, Laternen/Zäune/Blumentöpfe als Abschluss — [The Spike: Minecraft medieval house](https://thespike.gg/minecraft/house-ideas/medieval-house)
- Burgen: Schießscharten mit Falltüren („place a trapdoor half-open and it becomes a believable narrow window“); Pechnasen mit vorspringenden Platten/Treppen; Fallgatter-Optik mit Eisengittern — [minecraft.how: Castle building guide](https://minecraft.how/blog/post/minecraft-castle-medieval-building-guide)
- Japanisch: Shoji-Wände aus weißen Buntglasscheiben (`white stained glass panes`); Fenster aus weißem Beton, Dark-Oak-Platten, Treppen und Falltüren; Wände mit abwechselnd normalen und umgedrehten Fichtentreppen — [The Spike: Minecraft Japanese house](https://www.thespike.gg/minecraft/house-ideas/minecraft-japanese-house)
- Bleiglas-Optik mit Buntglas und Eisengittern, Bogenfenster aus Treppen/Platten (nur Such-Snippet aus mehreren Guides, Einzelquellen von geringer Qualität) — [Gamer Empire](https://gamerempire.net/minecraft-window-design-ideas/)

### Inferences (Template-Katalog; aus den oben zitierten Mechaniken und Guides abgeleitet)

Abkürzungen für häufige States:
- `P` = `minecraft:glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]` (Scheibe in einer Reihe zwischen festen Blöcken oder anderen Scheiben)
- `Pns` = `minecraft:glass_pane[east=false,north=true,south=true,waterlogged=false,west=false]` (Scheibe quer zur Fassade)
- `L|` = `minecraft:stripped_spruce_log[axis=y]` (Pfosten), `L-` = `minecraft:stripped_spruce_log[axis=x]` (Riegel/Sturz)
- `Sims` = `minecraft:spruce_stairs[facing=north,half=top,shape=straight,waterlogged=false]` (umgedrehte Treppe vor der Wand, volle Seite an der Wand)
- `Sw^` / `Se^` = `<mat>_stairs[facing=west|east,half=top,shape=straight,waterlogged=false]` (Bogenecke oben links/rechts)
- `Sw_` / `Se_` = `<mat>_stairs[facing=west|east,half=bottom,shape=straight,waterlogged=false]` (Bogenecke unten links/rechts)

#### W01 – Basisfenster 1×1 / 1×2 / 2×2 (Scheibe in der Wandebene)
- Größe: Öffnung w×h (1×1 … 3×3), Tiefe 1 (`d=0`). Stile: alle (Basis für alle anderen).
```
Front (d=0), 1x2          2x2
      x=-1 x=0 x=1         x=-1 x=0 x=1 x=2
y=1    #    P   #           #    P   P   #
y=0    #    P   #           #    P   P   #
```
- Alle Scheiben `P` (`east=true,west=true`), da links/rechts Wand oder Scheibe. Glasblock-Variante: `minecraft:glass` / `minecraft:<farbe>_stained_glass` (keine States, wirkt bündig/massiv); `minecraft:tinted_glass` für dunkle, lichtdichte Fenster.
- Regel: Scheiben bündig in `d=0` wirken flach – mindestens ein Tiefenelement (W02–W06) ergänzen.

#### W02 – Hochfenster 1×2 mit Sims (Treppe) und Sturz (Platte)
- Größe: 3 breit × 4 hoch × 2 tief (`d=0..+1`). Stile: rustikal, mittelalterlich, nordisch, Weihnachten.
```
Front                        Seitenansicht (Blick nach Osten)
      x=-1 x=0 x=1                  d=0  d=+1
y=2    #   [_]  #             y=2    #    _      _ = minecraft:spruce_slab[type=top,waterlogged=false] (d=+1)
y=1    #    P   #             y=1    P    .
y=0    #    P   #             y=0    P    .
y=-1   #   [S]  #             y=-1   #    S      S = Sims (spruce_stairs facing=north, half=top) (d=+1)
[ ] = Block liegt in d=+1
```
- Varianten: Sims als `minecraft:spruce_trapdoor[facing=south,half=top,open=false,powered=false,waterlogged=false]` (dünne Kante) oder 3 breit (x=-1..1, alle `Sims`, bleiben `shape=straight`, da gleiche Richtung). Sturz alternativ in der Wandebene als `L-` über x=-1..1.
- Platzierung: Sims und Sturz brauchen `d=+1` frei (Kollision mit Vordächern/Erkern prüfen).

#### W03 – 2×2-Fenster mit Stammrahmen und Fensterbank
- Größe: 4×4 Rahmen in `d=0` + Bank in `d=+1`. Stile: rustikal, mittelalterlich (Fachwerk), nordisch.
```
Front (d=0)                   d=+1, y=-1
      x=-1 x=0 x=1 x=2
y=2    L|   L-  L-  L|        x=-1..2: Sims (4 Treppen, facing=north, half=top)
y=1    L|   P   P   L|
y=0    L|   P   P   L|
y=-1   L|   L-  L-  L|
```
- Material tauschbar: `stripped_oak_log`, `stripped_dark_oak_log`, `stripped_birch_log`, `stripped_cherry_log`, `stripped_pale_oak_log` (alle `axis=x|y|z`). Ecken als Pfosten (`axis=y`).

#### W04 – Fensterläden (Zusatzmodul für jedes Fenster der Höhe h)
- Größe: +1 Spalte links und rechts in `d=+1`. Stile: rustikal, mittelalterlich, nordisch, mediterran, Weihnachten.
```
Variante A „flach an der Wand“ (Front)      Draufsicht A           Draufsicht B „90° aufgeklappt“
      x=-1 x=0 x=1 x=2                        x=-1 x=0 x=1 x=2          x=-1 x=0 x=1 x=2
y=1   [T]   P   P  [T]                d=+1    [‾]  .   .  [‾]      d=+1  [ |]  .   .  [| ]
y=0   [T]   P   P  [T]                d=0      #   P   P   #       d=0     #   P   P   #
```
- A: `minecraft:spruce_trapdoor[facing=south,half=bottom,open=true,powered=false,waterlogged=false]` an x=-1 und x=w (Platte liegt an der Nordkante = an der Wand, weil die offene Platte an der dem `facing` gegenüberliegenden Seite liegt).
- B: links `…_trapdoor[facing=west,half=bottom,open=true,…]` (Platte an der Ostkante = Fensterkante), rechts `…[facing=east,…]`.
- Pro Fensterzeile eine Falltür; obere Zeile optional `half=top` (Textur gespiegelt).
- Materialien: `spruce_trapdoor` (rustikal/nordisch), `dark_oak_trapdoor` (mittelalterlich/Hexe), `birch_trapdoor` (hell), `warped_trapdoor` (türkis – mediterraner Akzent), `cherry_trapdoor`/`pale_oak_trapdoor` (Fantasy), `iron_trapdoor` bzw. `waxed_copper_trapdoor` (modern/steampunk).
- **Platzierungsregel:** Zwei Fenster mit Läden brauchen mindestens 2 Wandblöcke Abstand (sonst teilen sich die Läden eine Spalte); Läden nicht an Gebäudeecken, wenn die Nachbarfassade in `d=+1` etwas platziert.

#### W05 – Blumenkasten (Window Box)
- Größe: w breit, unter dem Fenster, `d=+1..+2`. Stile: rustikal, mediterran, Fantasy, Weihnachten (mit Fichtensetzling).
```
Variante A (Töpfe auf Sims)        Variante B (Pflanzkasten mit Falltür-Verkleidung), Seitenansicht
Front                                     d=0  d=+1 d=+2
      x=0 x=1                       y=0    P    V    .      V = Bepflanzung
y=0  [o] [o]   (vor der Scheibe)    y=-1   #    E    T      E = Erde, T = Falltür (Platte an Nordkante)
y=-1 [S] [S]                        y=-2   #    K    .      K = Konsole (Sims-Treppe), optional
```
- A: `S` = `Sims`; `o` = `minecraft:potted_red_tulip`, `potted_poppy`, `potted_azalea_bush`, `potted_flowering_azalea_bush`, `potted_fern`, `potted_spruce_sapling`, `potted_lily_of_the_valley` (keine States). In Java können Blumentöpfe auf jedem Block oder über Luft stehen (robust).
- B: `E` = `minecraft:moss_block` oder `rooted_dirt` (beide im Block-Tag `#dirt`, Blumen dürfen darauf); `V` = Blume (`poppy`, `red_tulip`, `allium` …) oder Hecke `minecraft:azalea_leaves[distance=7,persistent=true,waterlogged=false]` / `flowering_azalea_leaves[…]` / `spruce_leaves[…]`; `T` vorn (`d=+2`) = `spruce_trapdoor[facing=south,half=bottom,open=true]`; Seiten (`d=+1`, x=-1 bzw. x=w) = `…[facing=west,open=true]` links, `…[facing=east,open=true]` rechts.
- Hinweis: Lose Blumen brechen bei Block-Update ohne passenden Boden ab; Töpfe und persistente Blätter sind robuster.

#### W06 – Zurückgesetztes Fenster durch vorgesetzten Rahmen (Laibung)
- Größe: Öffnung 2×2 in `d=0`, Rahmenring 4×4 in `d=+1`. Stile: mittelalterlich, nordisch, Fantasy, Burg.
```
Front (Rahmen d=+1, Glas d=0)        Seitenansicht
      x=-1 x=0 x=1 x=2                      d=0  d=+1
y=2   [L|] [L-][L-][L|]               y=2    #    L-
y=1   [L|]  P   P  [L|]               y=1    P    .
y=0   [L|]  P   P  [L|]               y=0    P    .
y=-1  [L|] [L-][L-][L|]               y=-1   #    L-
```
- Glas in `d=0` = `P` (`south=false`, da davor Luft). Rahmen alternativ aus `stone_bricks`, `polished_andesite`, `deepslate_bricks`. Bei 2 Block dicken Wänden: Glas in `d=-1` setzen, Rahmen = Wand.

#### W07 – Bogenfenster (umgedrehte Treppen)
- 7a Spitzbogen 2×3, 7b Rundbogen 3×4. Rahmen in `d=+1` (wie W06), Glas in allen Zeilen in `d=0`. Stile: mittelalterlich, Fantasy, mediterran, Kirche.
```
7a: Front                                 7b: Front
      x=-1 x=0  x=1  x=2                        x=-1 x=0  x=1  x=2  x=3
y=3   [R]  [R]  [R]  [R]                  y=4   [R]  [R]  [K]  [R]  [R]     K = chiseled_stone_bricks (Schlussstein)
y=2   [R]  [Sw^][Se^][R]                  y=3   [R]  [Sw^][_]  [Se^][R]     _ = stone_brick_slab[type=top]
y=1   [R]   P    P   [R]                  y=2   [R]   P    P    P   [R]
y=0   [R]   P    P   [R]                  y=1   [R]   P    P    P   [R]
y=-1  [R]  [R]  [R]  [R]                  y=0   [R]   P    P    P   [R]
                                          y=-1  [R]  [R]  [R]  [R]  [R]
```
- `R` = Rahmen (`stone_bricks`), `Sw^` = `minecraft:stone_brick_stairs[facing=west,half=top,shape=straight,waterlogged=false]`, `Se^` = `…[facing=east,…]`. Die volle Seite zeigt zur jeweiligen Rahmensäule; die offene untere Innenecke bildet die Rundung. Zwei gegenläufige Treppen bleiben `shape=straight`.
- Bei 1 Block dicker Wand ohne Rahmen: Treppen direkt in `d=0` – die offene Viertelecke zeigt dann ins Innere (optional Glasblock in `d=-1` dahinter).

#### W08 – Rundfenster / Rosette (3×3 und 5×5, Wandebene)
- Stile: Fantasy, Kirche/Kloster, mittelalterlich (Giebel), Weihnachten (rot/grüne Rosette).
```
3x3 (d=0)                    5x5 (d=0)
     x=0  x=1  x=2                x=0  x=1  x=2  x=3  x=4
y=2  Sw^   G   Se^           y=4   #   Sw^   G   Se^   #
y=1   G    G    G            y=3  Sw^   G    G    G   Se^
y=0  Sw_   G   Se_           y=2   G    G    C    G    G       C = Zentrum (andere Farbe)
                             y=1  Sw_   G    G    G   Se_
                             y=0   #   Sw_   G   Se_   #
```
- `G` = Glas**block** (`glass` oder `<farbe>_stained_glass`), weil Scheiben neben den Schrägen der Treppen keine Verbindung bekommen. `Sw^`/`Se^`/`Sw_`/`Se_` aus Wandmaterial (z. B. `stone_brick_stairs`, `deepslate_brick_stairs`, `brick_stairs`, `spruce_stairs`). Treppen liegen auf verschiedenen Höhen → keine automatische Eckform.
- Rosette: Zentrum `yellow_stained_glass`, innerer Ring `red_stained_glass`, Rand `blue_stained_glass` (Beispielpalette).

#### W09 – Erkerfenster (Bay Window), 5 breit × 2 tief × 2 hoch
- Stile: rustikal, nordisch, viktorianisch/Stadthaus, Weihnachten (Kerzen im Erker).
```
Draufsicht (y=0 und y=1)                    Seitenansicht bei x=1 (Blick nach Osten)
          x=-1 x=0 x=1 x=2 x=3                       d=-1 d=0 d=+1 d=+2
d=0        #    .   .   .   #               y=3       .    #    S    .
d=+1      Pns   .   .   .  Pns              y=2       .    #    =    S
d=+2       L|   P   P   P   L|              y=1       .    .    .    P
                                            y=0       .    .    .    P
                                            y=-1      =    =    =    =
                                            y=-2      .    #    K    .
```
- Wandöffnung `d=0`, x=0..2, y=0..1 = Luft. `Pns` an x=-1 und x=3 in `d=+1` (Nord = Wand, Süd = Pfosten). Front `P` in `d=+2`. Eckpfosten `L|` in `d=+2`, y=-1..1.
- Boden y=-1, `d=+1..+2`, x=-1..3: `spruce_planks`. Konsole y=-2, `d=+1`: `Sims` (x=-1..3). Dach: y=2 `d=+1` = `spruce_planks`, y=2 `d=+2` und y=3 `d=+1` = `minecraft:spruce_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]` (x=-1..3).
- Platzierung: nur im Erdgeschoss mit Bodenabstand oder im Obergeschoss; Freiraum `d=+1..+2` über die volle Breite + 1 Block seitlich.

#### W10 – Gaubenfenster (Dormer) für Satteldächer
- Größe: 3 breit, Fenster 1×2, Tiefe = bis zur Dachfläche (bei 45°-Dach ca. 3 Blöcke). Stile: rustikal, nordisch, mittelalterlich, Weihnachten (Schnee auf Gaubendach).
```
Front (Gaubenstirn)
        x=-1 x=0 x=1
y=3           _              _  = spruce_slab[type=bottom] (First)
y=2     Se    #    Sw        Se = spruce_stairs[facing=east,half=bottom], Sw = spruce_stairs[facing=west,half=bottom], # = spruce_planks
y=1     L|    P    L|
y=0     L|    P    L|
y=-1   (Hauptdachfläche)
```
- Regel: Gaubenwangen (x=-1, x=1) und Gaubendach (Treppen + First) Reihe für Reihe nach hinten (Richtung Hauptfirst) wiederholen, bis die Hauptdachfläche die Gauben-Firsthöhe erreicht; Hauptdach-Treppen innerhalb der Gaubengrundfläche entfernen. Fenster nicht über der Traufe-Kante platzieren; Mindestabstand 2 Blöcke zum Giebelrand.

#### W11 – Giebelfenster (Okulus in Plus-Form, Lünette)
- Stile: alle mit Satteldach; Weihnachten (Kerzen/Laterne dahinter).
```
Okulus 3x3 (d=0)            Lünette = W07b ohne untere Zeilen (Halbkreis unter dem First)
     x=0 x=1 x=2
y=2   #   P   #
y=1   P   P   P
y=0   #   P   #
```
- Alle Scheiben `P` (`east=true,west=true`), da jede Scheibe links/rechts Wand oder Scheibe hat. Mittelscheibe optional `yellow_stained_glass_pane` (gleiche States).
- Platzierung: zentriert im Giebeldreieck, mindestens 1 Block unter der Dachschräge.

#### W12 – Schaufenster mit Brüstung, Sturzbalken und Markise
- Größe: Öffnung 4×2 über 1er-Brüstung, Rahmen 6 breit. Stile: Markt/Stadt, mittelalterlicher Laden, Weihnachtsmarkt.
```
Front (hier: y=0 = Brüstungszeile, Glas ab y=1)
      x=-1 x=0 x=1 x=2 x=3 x=4
y=4   [M]  [M] [M] [M] [M] [M]     M = Markise (d=+1)
y=3    L-   L-  L-  L-  L-  L-     Sturzbalken (d=0)
y=2    L|   P   P   P   P   L|
y=1    L|   P   P   P   P   L|
y=0    L|   B   B   B   B   L|     B = Brüstung (d=0) + Paneel davor (d=+1)
```
- `M` = `minecraft:spruce_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]` oder abwechselnd `red_nether_brick_stairs` / `smooth_quartz_stairs` mit denselben States („Zuckerstangen“-Markise); `B` = `spruce_planks` in `d=0`, davor in `d=+1` `spruce_trapdoor[facing=south,half=bottom,open=true,powered=false,waterlogged=false]`; Scheiben `P`.
- Ergänzungen: Hängeschild seitlich (D08), Laterne an Kette unter der Markise (D01), `barrel[facing=up,open=false]` oder `spruce_shelf` innen als Auslage (Shelf-Inhalte wären Block-Entity-Daten).

#### W13 – Kirchen-/Bleiglasfenster 3×5 mit Gitter-Mittelpfosten
- Rahmen mit Bogen wie W07 in `d=+1` (Bogentreppen in Zeile y=4), Glas in `d=0`. Stile: Fantasy, mittelalterliche Kirche, Weihnachten (rot/grün).
```
Front (d=0; Bogen und Rahmen in d=+1 wie W07)
      x=-1 x=0 x=1 x=2 x=3
y=4   [R] [Sw^] B  [Se^][R]
y=3   [R]   C1  B   C1  [R]
y=2   [R]   C2  B   C2  [R]
y=1   [R]   C1  B   C1  [R]
y=0   [R]   C2  B   C2  [R]
```
- `B` = `minecraft:iron_bars[east=true,north=false,south=false,waterlogged=false,west=true]`; `C1`/`C2` = z. B. `blue_stained_glass_pane` / `red_stained_glass_pane` mit `east=true,west=true`. Scheiben und Gitter verbinden sich gegenseitig (gleiche Bauart).
- Steampunk-Variante: `waxed_copper_bars` statt `iron_bars` (gewachst = keine Oxidation).

#### W14 – Schießscharte (Burg)
- Größe 1×3 in dicker Burgmauer. Stile: Burg, mittelalterliche Befestigung.
```
Front (d=0)                    Variante B (nach minecraft.how): offene Falltür in der Öffnung
     x=-1 x=0 x=1
y=2   #    #   #
y=1   #    B   #               B = iron_bars[east=true,west=true,north=false,south=false]
y=0   #    B   #                   oder: spruce_trapdoor[facing=east,half=bottom,open=true] (Platte an der Westkante)
```

#### W15 – Shoji-Fenster (Japanisch) und Bambus-Variante
```
Front (d=0)                                   Bambus-Variante (d=+1 vor dem Glas)
      x=-1 x=0 x=1 x=2 x=3                         x=0 x=1 x=2
y=2    D-   D-  D-  D-  D-                   y=1   [F] [F] [F]   F = bamboo_fence (siehe unten)
y=1    D|   W   W   W   D|                   y=0   [F] [F] [F]
y=0    D|   W   W   W   D|
y=-1   D-   D-  D-  D-  D-     + d=+1, y=-1: dark_oak_slab[type=top] als schmale Engawa-Kante
```
- `D|`/`D-` = `stripped_dark_oak_log[axis=y|x]`; `W` = `minecraft:white_stained_glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]`.
- Bambus: Rahmen `stripped_bamboo_block[axis=y|x]`; Gitter `minecraft:bamboo_fence` in `d=+1`: Zäune verbinden sich nicht mit Scheiben → `north=false`; untereinander `east/west=true`, an den Enden zur Luft `false`.

#### W16 – Modernes Bandfenster mit Rahmenbox
```
Front (Box in d=+1, Glas in d=0)
      x=-1 x=0 x=1 x=2 x=3 x=4 x=5
y=2   [K]  [K] [K] [K] [K] [K] [K]      K = black_concrete (oder smooth_quartz)
y=1   [K]   G   G   G   G   G  [K]      G = light_gray_stained_glass_pane bzw. glass_pane (east=true,west=true)
y=0   [K]   G   G   G   G   G  [K]          oder bündige Glasblöcke tinted_glass / gray_stained_glass
y=-1  [K]  [K] [K] [K] [K] [K] [K]
```
- Ohne Läden, ohne Pflanzen; Sims höchstens als `smooth_stone_slab[type=top]` oder `iron_trapdoor[half=top,open=false]`.

#### W17 – Mediterranes Bogenfenster mit Ziergitter
- W07a/b in weißer Wand (`smooth_sandstone`, `white_concrete`, `calcite`; Treppen aus `smooth_sandstone_stairs`/`smooth_quartz_stairs`), Läden W04 mit `warped_trapdoor`, davor Ziergitter:
```
Seitenansicht                     Ziergitter (d=+1, y=0), x=0..w-1:
       d=0  d=+1                  iron_bars (States siehe unten)
y=1     P    o                    o = Topf auf dem Gitter (z. B. potted_red_tulip, potted_allium) in d=+1, y=1
y=0     P    B                    Scheiben in d=0, y=0: south=true (Verbindung zum Gitter davor)
y=-1    #    S                    S = Sims (smooth_sandstone_stairs[facing=north,half=top])
```
- Gitter-States: innere Gitter `minecraft:iron_bars[east=true,north=true,south=false,waterlogged=false,west=true]`; linkes Ende `…[east=true,north=true,south=false,waterlogged=false,west=false]`; rechtes Ende `…[east=false,north=true,south=false,waterlogged=false,west=true]` (`north=true`, weil dahinter eine Scheibe steht). Die Enden gelten für Luft oder Läden (offene Falltüren haben keine volle Seitenfläche); steht seitlich in `d=+1` ein voller Rahmenblock (W07-Rahmen), dort ebenfalls `true` setzen.

#### W18 – Nordisches Winter-/Weihnachtsfenster
- Kombination W02 + W04 (`dark_oak_trapdoor` oder `spruce_trapdoor`) + Schnee + Kerzen + Girlande:
```
Front                                       Seitenansicht
      x=-2 x=-1 x=0 x=1 x=2                       d=0  d=+1
y=3    .   [s]  [s] [s]  .                  y=3    #    s      s = snow[layers=1]
y=2    .   [g]  [g] [g]  .                  y=2    #    g      g = spruce_leaves[distance=7,persistent=true,waterlogged=false] (Girlande)
y=1        [T]   P  [T]                     y=1    P    .
y=0        [T]   P  [T]                     y=0    P    k      k = red_candle[candles=3,lit=true,waterlogged=false]
y=-1        #   [S]  #                      y=-1   #    S      S = Sims
```
- Keine Laterne näher als 3 Blöcke an Schnee (Schmelzen). Kerzen stehen auf der vollen Oberseite der umgedrehten Treppe.

### Gaps
- Für nordische, mediterrane und moderne Fenster wurden keine dedizierten, hochwertigen Quellen gefunden; W15–W18 sind Synthesen aus allgemeinen Guides und Block-Mechanik.
- Ob Schnee auf Blättern und Kerzen auf Blättern platzierbar sind (Tragfähigkeit von Laub), wurde nicht verifiziert – in-game prüfen (W18 setzt deshalb Kerzen auf die Treppe, Schnee auf das Laub nur optional).
- Reddit-/Planet-Minecraft-Designsammlungen (Bilder) waren nicht abrufbar; Gamer-Empire- und NameHero-Designs sind nur als Materiallisten ohne Blockraster dokumentiert.
- W12-Diagramm: Höhenzuordnung ist im Text korrigiert (Scheiben y=1..2); Generator sollte die Textregel verwenden.

---

## 3. Türen und Eingänge (Templates)

### Takeaway
Ein Eingang wirkt fertig, wenn er Rahmen/Sturz, eine Stufe oder einen Weg, Licht (Laternen) und oft ein kleines Vordach hat. Technisch kritisch sind die Tür-States: beide Hälften speichern, `facing` = Blickrichtung beim Platzieren (bestimmt, ob die Tür außen bündig oder innen zurückgesetzt sitzt), bei Doppeltüren `hinge=left` links und `hinge=right` rechts (vom Platzierenden aus gesehen).

### Cited Findings
- Tür-States, Facing-Semantik („a door facing east occupies the west part of its block when closed“), Hinge-Definition, Doppeltür-Regel „handle touching … hinges opposite“, Stützblock-Pflicht, zwei getrennte Blöcke — [minecraft.wiki: Door](https://minecraft.wiki/w/Door)
- Falltüren als Tür-Alternative: Zombies können Holzfalltüren nicht einschlagen; Falltür als „bardoor“ (Ästhetik) — [minecraft.wiki: Tutorial:Trapdoor uses](https://minecraft.wiki/w/Tutorial:Trapdoor_uses)
- Mittelalterliche Häuser: Tür mit zwei Falltüren als Mini-Vordach; Falltüren als Markisen (nur Such-Snippet; Seiten architecturelab.net/exitlag.com waren per Fetch blockiert) — [ExitLag: Minecraft Medieval House](https://www.exitlag.com/blog/minecraft-medieval-house/)
- Türwahl nach Stil: Holztüren für rustikal, glatte Materialien (Beton, Glas, Eisen) für minimalistisch-modern; Eisentüren nur per Redstone zu öffnen (nur Such-Snippet) — [ExitLag: Minecraft Doors](https://www.exitlag.com/blog/minecraft-doors/)
- Burgtor: „Make it an archway, not just a hole in the wall. Build it 4-5 blocks tall and 3-4 wide.“ Fallgatter-Optik aus Eisengittern; Laternen an Ketten; Banner über Toren — [minecraft.how: Castle building guide](https://minecraft.how/blog/post/minecraft-castle-medieval-building-guide)
- Torbogen-Designs (Materiallisten): Torii (White Terracotta, Spruce Trapdoors, Mossy Stone Brick Walls, Spruce Fences, Acacia Fence Gates, Dark Prismarine Slabs, Lanterns, Leaves, Dirt Paths, Flowers); Wooden Archway (Oak Logs, Barrels, Spruce Fence Gates/Trapdoors, Brick Walls, Coarse Dirt, Dirt Paths, Stone Buttons, Tulips); Diagonal Stone Bricks Archway (Light Gray Concrete, Stone Brick Walls/Stairs, Polished Andesite, Lanterns, Birch Leaves, Rose Bushes, Spruce Fences, Podzol, Dirt Paths) — [Gamer Empire: 5 Minecraft Archway Design Ideas](https://gamerempire.net/minecraft-archway-design-ideas/)
- Japanischer Eingang aus Fichtenplanken und -platten; Haus mit Fichtenzäunen und Laternen umgeben; Gärten mit Bambus, Steinpfad, Teich — [The Spike: Minecraft Japanese house](https://www.thespike.gg/minecraft/house-ideas/minecraft-japanese-house)
- Glocke: `attachment=floor|ceiling|single_wall|double_wall`, `facing` = „Opposite from the direction the player faces when placing a bell“ — [minecraft.wiki: Bell](https://minecraft.wiki/w/Bell)

### Inferences (Template-Katalog)

Abkürzungen: `Du`/`Dl` = obere/untere Türhälfte, z. B. `minecraft:spruce_door[facing=north,half=upper|lower,hinge=left,open=false,powered=false]`.

**Facing-Trick (aus Wiki-Definition abgeleitet):** In einer Südfassade sitzt eine Tür mit `facing=north` (von außen platziert) an der **Außenkante** des Blocks (bündig); mit `facing=south` an der **Innenkante** → von außen ca. 13/16 Block zurückgesetzt (Laibung ohne Extra-Block).

#### T01 – Standard-Eingang 1×2 mit Rahmen, Sturz und Stufe
```
Front                              Seitenansicht (Gelände 1 Block tiefer)
      x=-1 x=0 x=1                         d=-1 d=0 d=+1
y=2    L-   L-  L-                  y=1     .    Du   .
y=1    L|   Du  L|                  y=0     .    Dl   .
y=0    L|   Dl  L|                  y=-1    =    #    S      S = spruce_stairs[facing=north,half=bottom,shape=straight]
y=-1   #    #   #                   y=-2    #    #    #      (Gelände)
```
- Stile: alle (Holzart variieren). Pflicht: voller Block unter `Dl`. Liegt das Gelände auf Bodenhöhe, statt Stufe `dirt_path`/Platte.

#### T02 – Tür mit Oberlicht (Transom) und Wandlaternen
```
Front (Zellen „a/b“ = Block in d=0 / Block in d=+1)
      x=-1    x=0   x=1
y=3    L-      L-    L-
y=2    L|/f    P     L|/f      P = glass_pane[east=true,west=true,north=false,south=false] (Oberlicht)
y=1    L|/*    Du    L|/*      f = spruce_fence[north=true,east=false,south=false,west=false,waterlogged=false] (Wandarm)
y=0    L|      Dl    L|        * = lantern[hanging=true,waterlogged=false] unter dem Wandarm
```
- Laternen stehen vor den Pfosten, nicht im Laufweg (x=0). Stile: rustikal, mittelalterlich, nordisch, Weihnachten.

#### T03 – Doppeltür mit Spitzbogen (2 breit)
```
Front (d=0)
      x=-1 x=0  x=1  x=2
y=3    #    #    #    #
y=2    #   Sw^  Se^   #      Sw^/Se^ = stone_brick_stairs[facing=west|east,half=top,shape=straight]
y=1    #   DuL  DuR   #      DuL/DlL = oak_door[facing=north,half=…,hinge=left,open=false,powered=false]
y=0    #   DlL  DlR   #      DuR/DlR = oak_door[facing=north,half=…,hinge=right,open=false,powered=false]
```
- Stile: mittelalterlich, Fantasy, Kirche, Kloster. Für Dunkel-/Burgstil `dark_oak_door`, für Weihnachten `spruce_door`.

#### T04 – Portalnische mit Rundbogen (vorgesetzter Rahmen, Doppeltür)
```
Front (Rahmen d=+1, Türen d=0)               Seitenansicht
      x=-1 x=0  x=1  x=2                            d=0  d=+1 d=+2
y=3   [R]  [R]  [R]  [R]                     y=3     #    R    .
y=2   [R] [Sw^][Se^] [R]                     y=2     #    S^   .
y=1   [R]  DuL  DuR  [R]                     y=1     Du   .    .
y=0   [R]  DlL  DlR  [R]                     y=0     Dl   .    .
y=-1  [R]  [F]  [F]  [R]                     y=-1    #    F    S      F = polished_andesite (Schwelle), S = Stufe
```
- `R` = `stone_bricks` (Mitte von y=3 optional `chiseled_stone_bricks`). Für 3-breites Burgtor (minecraft.how: 3–4 breit, 4–5 hoch) Rundbogen nach W07b und Fallgatter-Optik: Zeile unter dem Bogen in `d=0` aus `iron_bars[east=true,west=true]`.

#### T05 – Vordächer (Awnings)
```
5a Falltür-Vordach (Front)                   5b Platten-Vordach 2 tief (Seitenansicht)
      x=-2 x=-1 x=0 x=1 x=2                         d=0  d=+1 d=+2
y=2   [t]  [t]  [t] [t] [t]   t = d=+1          y=2  #    _    _      _ = spruce_slab[type=bottom]
y=1   [*]  [k]  Du  [k] [*]   k = Konsole       y=1  Du   .    v      v = spruce_trapdoor[facing=north,half=top,open=true] (Volant)
y=0         .   Dl   .                          y=0  Dl   .    .
```
- 5a: `t` = `minecraft:spruce_trapdoor[facing=south,half=bottom,open=false,powered=false,waterlogged=false]` (Platte unten im Block → direkt über Türoberkante; Laternen können darunter hängen); `k` = `Sims` (umgedrehte Treppe als Konsole); `*` = `lantern[hanging=true]`.
- 5b: Unter Platten `type=bottom` können Laternen hängen (`d=+1,y=1`, nicht im Laufweg). Volant-Falltür in `d=+2` mit Platte an der Südkante (`facing=north`).
- 5c Streifenmarkise (Weihnachtsmarkt): `d=+1,y=2` abwechselnd `red_nether_brick_stairs` und `smooth_quartz_stairs` `[facing=north,half=bottom,shape=straight]`.

#### T06 – Veranda / Porch mit Säulen, Geländer und Stufe (5 breit × 2 tief)
```
Draufsicht (y=0)                              Seitenansicht bei x=-2
          x=-2 x=-1 x=0 x=1 x=2                       d=0  d=+1 d=+2
d=0        #    #    D   #   #               y=2       #    _    _     Dach: spruce_slab[type=bottom] (x=-2..2)
d=+1       Fs   .    .   .   Fs              y=1       #    .    C
d=+2       C    Fw   .   Fe  C               y=0       #    Fs   C
d=+3       .    .    S   .   .               y=-1      =    =    =     Boden: spruce_planks
```
- `C` = Säule `stripped_spruce_log[axis=y]` (y=0..1); `Fw` (x=-1) = `spruce_fence[west=true,east=false,north=false,south=false]`, `Fe` (x=1) = `…[east=true,west=false,…]`; `Fs` (Seitengeländer, x=±2, `d=+1`) = `spruce_fence[north=true,south=true,east=false,west=false]`; `S` = `spruce_stairs[facing=north,half=bottom]`; Laternen `hanging=true` unter dem Dach bei `d=+1`, x=±1.

#### T07 – Erhöhter Eingang mit zwei Stufen und Wangen
```
Seitenansicht (Gelände-Oberkante y=-3)
        d=0  d=+1 d=+2 d=+3
y=0      Dl   .    .    .
y=-1     #    =    S1   .        = = stone_bricks (Podest), S1/S2 = stone_brick_stairs[facing=north,half=bottom,shape=straight]
y=-2     #    #    #    S2
```
- Wangen bei x=-1 und x=+1 (`d=+1..+3`) gefüllt bis Stufenhöhe; obenauf `stone_brick_wall` (bei einzelnem Pfosten `up=true`, alle Seiten `none`) mit `lantern[hanging=false]` am vorderen Ende.

#### T08 – Weg zur Tür
- `minecraft:dirt_path`, `gravel`, `coarse_dirt`, `podzol[snowy=false]` gemischt; Trittsteine `stone_brick_slab[type=bottom]`/`smooth_stone_slab[type=bottom]`; Rand mit Blumen (`poppy`, `red_tulip` …) und Laternen auf Mauerpfosten alle 3–4 Blöcke. Muster aus Gamer-Empire-Torbögen (Dirt Paths, Coarse Dirt, Podzol, Flowers).

#### T09 – Japanischer Eingang (Genkan) mit Noren-Optik
- Tür `spruce_door` oder `bamboo_door`; Rahmen `stripped_dark_oak_log`; über der Tür in `d=+1,y=2` ein `white_wall_banner[facing=south]` (hängt optisch in die obere Türhälfte, kein Kollisionskörper); seitlich `spruce_fence` + `lantern`. Torii-Tor nach Gamer Empire (Pfosten, Querbalken aus `dark_prismarine_slab`, `acacia_fence_gate`, Laternen).

#### T10 – Weihnachtlicher Eingang
```
Front
      x=-2 x=-1 x=0 x=1 x=2
y=3         [s]  [s] [s]          s = snow[layers=1] (nur auf voller Oberseite)
y=2         [g]  [g] [g]          g = spruce_leaves[distance=7,persistent=true,waterlogged=false] (Girlande, d=+1)
y=1   [*]   [g]   Du [g]  [*]     * = lantern[hanging=false] auf Mauerpfosten in d=+2 (≥3 Blöcke vom Schnee)
y=0   [p]   [g]   Dl [g]  [p]     p = potted_spruce_sapling (Mini-Tanne) in d=+1
y=-1              [r]             r = red_carpet in d=+1 auf dem Boden (Fußmatte)
```
- Optional: `red_wall_banner[facing=south]` neben der Tür; Muster (z. B. Kranz-Optik) sind Block-Entity-Daten.

### Gaps
- Keine qualitativ hochwertige Einzelquelle mit Blockrastern für Türdesigns erreichbar (ExitLag/architecturelab: Cloudflare/403; Reddit: blockiert). Die Türtemplates sind aus Wiki-Mechanik und den Materiallisten der Torbogen-/Hausguides synthetisiert.
- Optische Wirkung der Noren-Banner-Lösung und genaue Banner-Hängehöhe wurden nicht verifiziert.

---

## 4. Kleine Fassadendetails: Blöcke vs. Block-Entities vs. Entities

### Takeaway
Fast alle „Fertig-Details“ sind normale Blöcke (Laternen, Ketten, Töpfe, Knöpfe, Falltüren, Kerzen, Schnee, Ranken). Banner, Schilder, Glocken und Lagerfeuer sind Block-Entities – exportierbar, aber Muster/Texte brauchen NBT. Rahmen (item frames), Bilder (paintings) und Rüstungsständer sind **Entities** und gehören nicht in ein reines Block-Schematic.

### Cited Findings
- Hängelaterne an Kette: Laterne unter `iron_chain` verbindet sich nahtlos; Ketten schweben frei — [minecraft.wiki: Chain](https://minecraft.wiki/w/Chain), [minecraft.wiki: Lantern](https://minecraft.wiki/w/Lantern)
- Kupferlaternen existieren in allen Oxidationsstufen und gewachst; Platzierung wie normale Laternen — [minecraft.wiki: Copper Lantern](https://minecraft.wiki/w/Copper_Lantern); IDs `copper_lantern`, `exposed_copper_lantern`, `weathered_copper_lantern`, `oxidized_copper_lantern`, `waxed_*` — [mcmeta](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Fackeln: `wall_torch`, `soul_wall_torch`, `copper_wall_torch`, `redstone_wall_torch` mit `facing`; Bodenvarianten `torch`, `soul_torch`, `copper_torch` ohne States — [mcmeta](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Blumentöpfe: In Java „can be placed on any block or over air“; 37 `potted_*`-Blöcke in 1.21.11 (u. a. `potted_red_tulip`, `potted_azalea_bush`, `potted_flowering_azalea_bush`, `potted_spruce_sapling`, `potted_fern`, `potted_cactus`, `potted_bamboo`, `potted_open_eyeblossom`, `potted_pale_oak_sapling`); in Bedrock dagegen Block-Entity — [minecraft.wiki: Flower Pot](https://minecraft.wiki/w/Flower_Pot); [mcmeta](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Lagerfeuer: States `facing`, `lit` (Default `true`), `signal_fire`, `waterlogged`; Rauch steigt ca. 10 Blöcke, mit Heuballen darunter 24 Blöcke; Rauch „can partially pass through a block directly above it, but do not pass through blocks any higher“ — [minecraft.wiki: Campfire](https://minecraft.wiki/w/Campfire)
- Kerzen: `candles=1..4`, `lit`, `waterlogged`; Licht 3 pro Kerze, max. 12; 17 Farbvarianten (`candle`, `red_candle`, …) — [minecraft.wiki: Candle](https://minecraft.wiki/w/Candle); [mcmeta](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Schnee: `snow[layers=1..8]`; in Java nur auf Blöcken mit voller Oberseite (bzw. Override-Tag); bricht ohne Stützblock — [minecraft.wiki: Snow](https://minecraft.wiki/w/Snow); Laternen schmelzen Schnee im Umkreis von 2 Blöcken — [minecraft.wiki: Lantern](https://minecraft.wiki/w/Lantern); `grass_block` hat in 1.21.11 den State `snowy` — [mcmeta](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Blätter: `persistent` „If the block persists regardless of having no wood nearby. true for player-placed leaves.“; nicht verbundene Blätter zerfallen (JE: max. 6 Blöcke zum Stamm) — [minecraft.wiki: Leaves](https://minecraft.wiki/w/Leaves)
- Banner: Block-Entity mit `patterns`-Liste; Wandbanner `<farbe>_wall_banner[facing]`, Standbanner `<farbe>_banner[rotation=0..15]`; Tag `wall_post_override` — [minecraft.wiki: Banner](https://minecraft.wiki/w/Banner); [mcmeta](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Hängeschilder: Decken-Variante `*_hanging_sign[attached,rotation,waterlogged]`, Wand-Variante `*_wall_hanging_sign[facing,waterlogged]`; an der Seite eines vollen Blocks platziert entsteht ein selbsttragender Halter („can then float freely even if said full block is broken“) — [minecraft.wiki: Hanging Sign](https://minecraft.wiki/w/Hanging_Sign)
- Item Frame ist in Java eine Entity (nur in Bedrock ein Block) — [minecraft.wiki: Item Frame](https://minecraft.wiki/w/Item_Frame); Painting ist eine Entity — [minecraft.wiki: Painting](https://minecraft.wiki/w/Painting); Armor Stand ist eine Entity („Infobox item entity“) — [minecraft.wiki: Armor Stand](https://minecraft.wiki/w/Armor_Stand)
- Gamer-Empire-Designs nutzen Knöpfe (Stone Button, Polished Blackstone Buttons), Ketten, Hanging Roots, Pointed Dripstone, Vines, End Rods, Lightning Rod und Lecterns als Fassadendetails — [Gamer Empire Fenster](https://gamerempire.net/minecraft-window-design-ideas/), [Gamer Empire Torbögen](https://gamerempire.net/minecraft-archway-design-ideas/)
- Banner „break up large flat surfaces and add color“; Laternen an Außenmauern und Türmen; Laternen an Ketten innen — [minecraft.how](https://minecraft.how/blog/post/minecraft-castle-medieval-building-guide)
- Shelves (`*_shelf`, neu in 1.21.9+) existieren mit `facing`, `powered`, `side_chain=unconnected|right|center|left`, `waterlogged` — [mcmeta](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)

### Inferences (Detail-Bausteine)

| ID | Detail | Exakte Blöcke/States (Südfassade) | Stütz-/Platzierungsregel | Typ |
|---|---|---|---|---|
| D01 | Hängelaterne an Kette | `iron_chain[axis=y,waterlogged=false]` ×1–3, darunter `lantern[hanging=true,waterlogged=false]` (alt. `soul_lantern`, `waxed_copper_lantern`) | oberstes Kettenglied unter Überhang/Traufe; nicht im Laufweg | Block |
| D02 | Laterne auf Pfosten | `cobblestone_wall[east=none,north=none,south=none,west=none,up=true,waterlogged=false]` oder `spruce_fence[alle false]`, darauf `lantern[hanging=false]` | Abstand zu Schnee ≥3 | Block |
| D03 | Wandarm-Laterne | `d=+1`: `spruce_fence[north=true,…false]` (Arm), darunter `lantern[hanging=true]` | Wandblock hinter dem Zaun muss voll sein | Block |
| D04 | Wandfackel | `wall_torch[facing=south]` / `soul_wall_torch` / `copper_wall_torch` | an vollem Wandblock (Richtung in-game prüfen, s. Gaps) | Block |
| D05 | Blumentöpfe | `potted_*` (siehe Liste), auf Sims, Mauerkrone, Treppenwange | Java: überall platzierbar | Block |
| D06 | Kamin mit Rauch | Schornstein aus `bricks`/`cobblestone`; oben `campfire[facing=north,lit=true,signal_fire=false,waterlogged=false]`, optional `hay_block[axis=y]` darunter und `signal_fire=true` | oberstes Element offen lassen (Rauch geht max. 1 Block durch) | Block-Entity (ohne NBT ok) |
| D07 | Knöpfe als Nieten/Steinköpfe | `stone_button[face=wall,facing=south,powered=false]`, `polished_blackstone_button`, `spruce_button` | an Wandblock, Muster z. B. an Türrahmen/Toren | Block |
| D08 | Falltür-Paneele | `<holz>_trapdoor[facing=south,half=bottom,open=true]` flach auf der Wand; geschlossene `half=top` unter Traufen als Kante | schweben erlaubt | Block |
| D09 | Ladenschild | `spruce_wall_hanging_sign[facing=east|west]` (Halter seitlich aus der Wand) oder `oak_wall_sign[facing=south]` flach | Texte = Block-Entity-NBT | Block-Entity |
| D10 | Banner | `<farbe>_wall_banner[facing=south]`; auf Pfosten `<farbe>_banner[rotation=0]` (0 = Süden) | Muster = Block-Entity-NBT; auf Mauer erzwingt Pfosten | Block-Entity |
| D11 | Glocke über Ladentür | `bell[attachment=single_wall,facing=south,powered=false]` | Wandblock dahinter | Block-Entity (ohne NBT ok) |
| D12 | Kerzen (Fensterbank) | `<farbe>_candle[candles=1..4,lit=true,waterlogged=false]` | auf voller Oberseite (Sims-Treppe, Platte top) | Block |
| D13 | Schnee-Akzente | `snow[layers=1]` (bis 2) auf Sims, Sturz, Vordach, Mauerkronen; darunter `grass_block[snowy=true]` | volle Oberseite; ≥3 Blöcke von Laternen | Block |
| D14 | Bewuchs | `vine[north=true,east=false,south=false,west=false,up=false]` in `d=+1` (haftet an Wand im Norden); `glow_lichen[north=true,…]`; `hanging_roots` unter Überhängen | an Wandfläche | Block |
| D15 | „Eiszapfen“ (Notlösung) | `pointed_dripstone[thickness=tip,vertical_direction=down,waterlogged=false]` unter Traufen | farblich Tropfstein, nicht Eis | Block |
| D16 | Dachspitze/Blitzableiter | `waxed_lightning_rod[facing=up,powered=false,waterlogged=false]`, `end_rod[facing=up]` | First/Turmspitze | Block |
| D17 | Glas-/Blätter-Hecke | `<baum>_leaves[distance=7,persistent=true,waterlogged=false]` | immer `persistent=true` | Block |

**Nicht exportierbar als reines Block-Schematic (Entities):** `item_frame`, `glow_item_frame`, `painting`, `armor_stand` (sowie Leinenknoten). Im Generator höchstens als optionale „Entity-Layer“-Liste markieren.

**Block-Entities (exportierbar; Sponge-Schematic braucht ggf. BlockEntity-Einträge):** Banner (Muster), Schilder/Hängeschilder (Text), Lagerfeuer (Kochslots leer ok), Glocke, `decorated_pot` (Scherben), `*_shelf` (Inhalte), `barrel`, `lectern`. Ohne NBT erscheinen sie leer/neutral.

### Gaps
- Richtungssemantik von `wall_torch.facing`, `*_wall_hanging_sign.facing` (laut Spielcode-Erinnerung parallel zur Wand, also `east|west` an einer Südfassade) und Glocken-`single_wall` wurde nicht mit einer zitierbaren Quelle bestätigt – in-game testen.
- Tragfähigkeit von Laub (für Kerzen/Laternen/Schnee) nicht verifiziert.
- Ob Kupfergitter sich mit Glasscheiben und Eisengittern verbinden (sehr wahrscheinlich, gleiche Bauart), wurde nicht explizit bestätigt.

---

## 5. Stil-Zuordnung (welche Templates und Details zu welchem Stil passen)

### Takeaway
Stil entsteht vor allem über Materialpalette + 2–3 wiederkehrende Details. Die Templates aus Abschnitt 2–4 lassen sich per Material-Tausch wiederverwenden; die Tabelle unten ordnet zu.

### Cited Findings
- Mittelalter: Steinfundament (Cobblestone/Stone Bricks), Fachwerk aus Eichen-/Fichtenstämmen, Treppen für Dach und Fensterbänke, Laternen, Zäune, Blumentöpfe — [The Spike: medieval house](https://thespike.gg/minecraft/house-ideas/medieval-house)
- Burg: Stone/Cobblestone/Stone Bricks/Deepslate gemischt (cracked/mossy), Fichte/Eiche/Dark-Oak-Stämme als Akzente; „For a lighter, Mediterranean aesthetic, use sandstone or light gray concrete“; Banner und Laternen — [minecraft.how](https://minecraft.how/blog/post/minecraft-castle-medieval-building-guide)
- Japanisch: weiße Buntglasscheiben (Shoji), weiße Betonwände, Fichte/Dark Oak, Falltüren und Laternen, glasierte Terrakotta als Dachziegel-Ersatz, Bambus im Garten — [The Spike: Japanese house](https://www.thespike.gg/minecraft/house-ideas/minecraft-japanese-house)
- Fantasy/überwuchert: Pilzblöcke + Eisengitter + Blumentopf; Moos, Hanging Roots, Pointed Dripstone, Lime Glass; Steampunk: Akazie + Kupfer + Blitzableiter — [Gamer Empire](https://gamerempire.net/minecraft-window-design-ideas/)
- Nether/Fantasy-Torbogen: Warped-Holz, Soul Lanterns, Polished Blackstone Buttons — [Gamer Empire Torbögen](https://gamerempire.net/minecraft-archway-design-ideas/)
- Modern: glatte Materialien (Beton, Glas, Eisenblöcke) (nur Such-Snippet) — [ExitLag: Minecraft Doors](https://www.exitlag.com/blog/minecraft-doors/)
- Winter/Weihnachten-Guides: Lebkuchen-Stil mit Terrakotta/braunem Beton und Buntglas; Eiszapfen an Traufen/Fensterbänken; Kerzen auf Fensterbänken (teils Real-Deko-Quellen; nur Such-Snippets) — [GGServers: prepare Minecraft for Christmas](https://ggservers.com/blog/prepare-minecraft-for-christmas/)

### Inferences

| Stil | Fenster | Türen/Eingänge | Details | Typische Materialien |
|---|---|---|---|---|
| Mittelalterlich | W02, W03, W04, W06, W07a, W14 (Burg) | T01, T03, T04, T05a | D01, D02, D04, D08, D10 | `cobblestone`, `stone_bricks`, `stripped_oak_log`/`stripped_spruce_log`, `dark_oak_trapdoor`, `oak_door` |
| Fantasy | W07b, W08 (Rosette), W13, W05 mit Azaleen | T04 (Rundbogen), T03 | D01 mit `soul_lantern`, D14 Ranken/Glow Lichen, `potted_flowering_azalea_bush` | `deepslate_bricks`, `cherry_*`, `pale_oak_*`, Pilzblöcke, Buntglas |
| Rustikal | W02, W03, W04, W05 | T01, T02, T05a, T06 | D02, D03, D05, D06 (Kamin), `barrel` | `spruce_*`, `oak_*`, `coarse_dirt`, `dirt_path` |
| Nordisch | W02 + W04 (dunkle Läden), W06, W10, W18 | T01 (zurückgesetzt), T06 | D01, D06, D13 Schnee | `spruce_*`, `dark_oak_*`, `cobblestone`/`stone_bricks`-Sockel |
| Japanisch | W15 (Shoji/Bambus) | T09 (Genkan, Torii) | D02 auf `spruce_fence`, D17 Hecke | `stripped_dark_oak_log`, `white_stained_glass_pane`, `spruce_trapdoor`, `bamboo_*`, `white_terracotta` |
| Modern | W16, W12 (große Scheiben) | T01 bündig mit `iron_door`/`waxed_copper_door` | D16 `end_rod`, `waxed_copper_lantern` | `black_concrete`, `white_concrete`, `smooth_quartz`, `tinted_glass`, `iron_trapdoor` |
| Mediterran | W07, W17, W04 mit `warped_trapdoor`, W05 | T03/T04 (Bogen) | D05 Töpfe, Ziergitter `iron_bars` | `smooth_sandstone`, `calcite`, `white_concrete`, `terracotta`, `smooth_quartz_stairs` |
| Winter/Weihnachten | W18, W11 mit Kerzen, W05 mit `potted_spruce_sapling`, W13 rot/grün | T10, T05c (Streifenmarkise), T06 | D12 Kerzen, D13 Schnee, D17 Fichtengirlande, rote Banner, Laternen (Abstand zu Schnee!) | `spruce_*`, `spruce_leaves[persistent=true]`, `red_candle`, `red_wool`/`red_carpet`, `snow` |

Allgemeine Platzierungsregeln für den Generator (abgeleitet):
- Fenster pro Geschoss auf gleicher Sturzhöhe ausrichten; Fensterachsen über die Geschosse fluchten lassen.
- Mindestabstand Fenster–Fenster 1 Block (ohne Läden) bzw. 2 Blöcke (mit Läden W04); Abstand zur Gebäudeecke ≥1 Block (≥2 mit Läden).
- Tiefenelemente (`d=+1/+2`) gegen Vordächer, Veranden, Erker und Traufen per Bounding-Box prüfen; Templates mit Tiefe dürfen sich nicht überlappen.
- Tür bevorzugt mittig oder auf Fensterachse; vor der Tür immer 1–2 Blöcke freier Weg (`d=+1..+2`).
- Pro Stil max. 2–3 Detailtypen wiederholen (z. B. Mittelalter: Läden + Laterne an Kette + Blumenkasten) statt alle Details zu mischen.
- Licht und Schnee entkoppeln (Weihnachten): Laternen an Pfosten/Ketten ≥3 Blöcke von Schneeflächen; auf verschneiten Simsen nur Kerzen.

### Gaps
- Für Nordisch, Mediterran und Modern fehlen hochwertige Primärquellen mit konkreten Blockrastern; Zuordnung ist teilweise eigene Synthese.
- Weihnachts-Quellen waren überwiegend Real-Deko- oder Low-Quality-Seiten; Minecraft-spezifische Weihnachtsfassaden-Guides (Reddit/Planet Minecraft/YouTube) waren nicht abrufbar.
