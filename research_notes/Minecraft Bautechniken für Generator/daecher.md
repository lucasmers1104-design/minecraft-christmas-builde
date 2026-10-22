# Dächer in Minecraft (Java 1.21.11) – Bautechniken als Generator-Vorlage

Konventionen in diesen Notizen: +x = Ost, −x = West, +z = Süd, −z = Nord, +y = oben (Minecraft-Standard). `L(F)` = Richtung gegen den Uhrzeigersinn von oben gesehen (north→west→south→east→north), `R(F)` = im Uhrzeigersinn (north→east→south→west→north), `B(F)` = Gegenrichtung. Höhen in „Halbblöcken“ (hb): 1 hb = 0,5 Block. Alle Block-IDs und Zustände wurden gegen `1.21.11-summary/blocks/data.json` (mcmeta) geprüft. **Quellenqualität:** minecraft.wiki / de.minecraft.wiki und Mojang-Daten (mcmeta) sowie WorldEdit-Quellcode = hoch; Blogs (Astroworld, buildingguide.app, CozyGameBuilds, CurseForge-Blog, alle 2026) = Hobby-/SEO-Artikel, teils vermutlich KI-geschrieben, nur als Indiz für gängige Praxis. Reddit, Planet Minecraft, YouTube, blockpalettes.com, Fandom und Shockbyte waren aus dieser Umgebung nicht abrufbar (403/429/Domain gesperrt). Alles, was unter „Inferences“ steht, sind von mir abgeleitete Baurezepte; die Treppengeometrie darin ist gegen die Vanilla-Modelldaten geprüft, die Ästhetik nicht.

## 1. Treppen-Blockzustände, Ecklogik (`shape`) und Verhalten beim WorldEdit-Einfügen

### Takeaway
In 1.21.11 haben Treppen `facing` (Seite der hohen Hälfte = Aufstiegsrichtung), `half`, `shape` und `waterlogged`. `shape` ergibt sich nur aus `facing`/`half` der waagerechten Nachbartreppen (Material egal): `outer_*` an konvexen Ecken (Grate/Walmecken), `inner_*` an konkaven Ecken (Kehlen, Dachrinnen-Ringe). WorldEdit (ab 7.3) setzt beim Einfügen zuerst alle Blöcke ohne Nebenwirkungen und führt danach standardmäßig die Nachbar-Updates aus. Der Generator sollte deshalb die `shape`-Werte speichern, die Vanilla selbst berechnen würde, sonst werden sie nach dem Einfügen „korrigiert“.

### Cited Findings
- 1.21.11-Zustände jeder Treppe: `facing` ∈ {north, south, west, east}, `half` ∈ {top, bottom}, `shape` ∈ {straight, inner_left, inner_right, outer_left, outer_right}, `waterlogged` ∈ {true,false}; Default `facing=north, half=bottom, shape=straight, waterlogged=false`. Stufen: `type` ∈ {top, bottom, double}, `waterlogged`. — [mcmeta 1.21.11 blocks/data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- 1.21.11 hat genau 58 Treppen-IDs: acacia, andesite, bamboo_mosaic, bamboo, birch, blackstone, brick, cherry, cobbled_deepslate, cobblestone, crimson, cut_copper, dark_oak, dark_prismarine, deepslate_brick, deepslate_tile, diorite, end_stone_brick, exposed_cut_copper, granite, jungle, mangrove, mossy_cobblestone, mossy_stone_brick, mud_brick, nether_brick, oak, oxidized_cut_copper, pale_oak, polished_andesite, polished_blackstone_brick, polished_blackstone, polished_deepslate, polished_diorite, polished_granite, polished_tuff, prismarine_brick, prismarine, purpur, quartz, red_nether_brick, red_sandstone, resin_brick, sandstone, smooth_quartz, smooth_red_sandstone, smooth_sandstone, spruce, stone_brick, stone, tuff_brick, tuff, warped, waxed_cut_copper, waxed_exposed_cut_copper, waxed_oxidized_cut_copper, waxed_weathered_cut_copper, weathered_cut_copper (jeweils `<name>_stairs`). — [mcmeta data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- **Versionsfalle:** Die aktuelle Wiki-Seite listet inzwischen „97 variants of stairs“ inklusive Woll- und Betontreppen („Matching Wool Stairs“, „Matching Concrete Stairs“). Diese gibt es in den 1.21.11-Daten **nicht**. Das Wiki beschreibt also bereits spätere Versionen. — [minecraft.wiki Stairs](https://minecraft.wiki/w/Stairs); Gegenprüfung [mcmeta data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Platzieren durch Spieler: „When placed, a stair orients itself with the half-block side closest to the player.“ Klick auf Oberseite oder untere Hälfte einer Seite → aufrecht; Klick auf Unterseite oder obere Hälfte einer Seite → kopfüber. — [minecraft.wiki Stairs](https://minecraft.wiki/w/Stairs)
- Eckbildung (wörtlich): „When a stairs' half-block side is adjacent to the side of another stairs […], the stairs' full-block side wraps into an "L" shape to join the other stairs (it creates an "inner corner").“ / „When a stairs' full-block side is adjacent to the side of another stairs, the stairs' full-block side shortens to join the other stairs' full-block side (it creates an "outer corner").“ / „Right side up stairs do not join with upside-down stairs and vice versa.“ Treppen verbinden sich mit Nachbartreppen „(of any material)“. — [minecraft.wiki Stairs](https://minecraft.wiki/w/Stairs)
- `shape`-Doku: „"left" and "right" specify in which direction is the higher part of the step.“ inner = zwei volle und zwei treppenförmige Seitenflächen, outer = zwei treppenförmige und zwei Halbblock-Seitenflächen. — [minecraft.wiki Stairs](https://minecraft.wiki/w/Stairs)
- **Geometrie aus den Vanilla-Modellen** (Blockstate `oak_stairs.json` + Modelle `stairs`, `inner_stairs`, `outer_stairs`, per Skript in Viertel-Quadranten ausgewertet; gilt für alle Treppen, da alle dieselben Vorlagen nutzen). „Hohe Quadranten“ = obere Blockhälfte bei `half=bottom` bzw. untere Hälfte bei `half=top` (die andere Hälfte ist voll):

  | facing | straight | outer_left | outer_right | inner_left | inner_right |
  |---|---|---|---|---|---|
  | north | NW,NE | NW | NE | NW,NE,SW | NW,NE,SE |
  | east | NE,SE | NE | SE | NE,SE,NW | NE,SE,SW |
  | south | SE,SW | SE | SW | SE,SW,NE | SE,SW,NW |
  | west | NW,SW | SW | NW | NW,SW,SE | NW,SW,NE |

  Daraus folgt die allgemeine Formel: straight = {F∧L(F), F∧R(F)}; outer_left = {F∧L(F)}; outer_right = {F∧R(F)}; inner_left = straight ∪ {B(F)∧L(F)}; inner_right = straight ∪ {B(F)∧R(F)}. `half=top` spiegelt nur vertikal, die Quadranten bleiben dieselben. — [mcmeta blockstates/oak_stairs.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-assets/assets/minecraft/blockstates/oak_stairs.json), [models/block/stairs.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-assets/assets/minecraft/models/block/stairs.json), [inner_stairs.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-assets/assets/minecraft/models/block/inner_stairs.json), [outer_stairs.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-assets/assets/minecraft/models/block/outer_stairs.json)
- `/setblock … strict` (seit 1.21.5 / 25w02a): „Place blocks as-is without triggering block updates and shape updates.“ Ohne `strict` (Default `replace`) laufen Updates. — [minecraft.wiki Commands/setblock](https://minecraft.wiki/w/Commands/setblock)
- WorldEdit-Nebenwirkungen und ihre Defaults: `LIGHTING(ON)`, `NEIGHBORS(ON)`, `UPDATE(ON)`, `VALIDATION(OFF)`, `ENTITY_AI(OFF)`, `EVENTS(OFF)`, `POI_UPDATE(ON)`, `NETWORK(ON)`. — [WorldEdit SideEffect.java](https://github.com/EngineHub/WorldEdit/blob/master/worldedit-core/src/main/java/com/sk89q/worldedit/util/SideEffect.java). Beschreibungen: Neighbors = „Notifies nearby blocks of changes“, Update = „Notifies the changed block“, Validation = „Validates and fixes inconsistent world state, such as disconnected blocks“. — [WorldEdit strings.json](https://github.com/EngineHub/WorldEdit/blob/master/worldedit-core/src/main/resources/lang/strings.json)
- In `WorldNativeAccess` ruft `NEIGHBORS` sowohl `notifyNeighbors(...)` als auch `updateNeighbors(pos, oldState, newState, 512)` auf (Kommentar im Code: „Make connection updates optional“). `VALIDATION` würde `getValidBlockForPosition` auf den eigenen Block anwenden, ist aber standardmäßig aus. — [WorldEdit WorldNativeAccess.java](https://github.com/EngineHub/WorldEdit/blob/master/worldedit-core/src/main/java/com/sk89q/worldedit/internal/wna/WorldNativeAccess.java)
- Der Standard-Reorder-Modus ist `FAST` ([LocalSession.java](https://github.com/EngineHub/WorldEdit/blob/master/worldedit-core/src/main/java/com/sk89q/worldedit/LocalSession.java)). Er arbeitet so: „performing the edit without any side effects, and then running the side effects after the edit has completed“. Seit 7.3 ist er der Default. Mit `//update neighbors` lassen sich Nebenwirkungen nachträglich auf eine Auswahl anwenden. — [Madeline Miller: What's new in WorldEdit 7.3](https://madelinemiller.dev/blog/introducing-worldedit-7-3/); `//perf` schaltet die einzelnen Nebenwirkungen um. — [Madeline Miller: WorldEdit 7.2](https://madelinemiller.dev/blog/introducing-worldedit-72/)

### Inferences
- **Vanilla-Algorithmus (rekonstruiert aus dem dekompilierten Java-Code `StairBlock#getStairsShape`/`canTakeShape`; dafür habe ich keine öffentliche URL abgerufen).** Er passt zur Wiki-Beschreibung und zur Quadranten-Tabelle oben:
  ```
  shape(p):  F = facing(p), H = half(p)
    v = block(p + F)                         # Nachbar hinter der HOHEN Seite
    if isStairs(v) && half(v)==H && axis(facing(v)) != axis(F)
       && !sameStair(p + B(facing(v))):      # canTakeShape
         return facing(v)==L(F) ? outer_left : outer_right
    h = block(p + B(F))                      # Nachbar vor der NIEDRIGEN Seite
    if isStairs(h) && half(h)==H && axis(facing(h)) != axis(F)
       && !sameStair(p + facing(h)):
         return facing(h)==L(F) ? inner_left : inner_right
    return straight
  sameStair(q) := isStairs(q) && facing(q)==F && half(q)==H
  ```
  `shape` hängt nur von `facing`/`half` der Nachbarn ab, nicht von deren `shape`. **Ein einziger Durchlauf über alle Treppen genügt**, nachdem alle `facing`/`half` feststehen.
- **WorldEdit-Konsequenz für den `.schem`-Export (Sponge v3 → WorldEdit 7.4.x):** Der eingefügte Block selbst behält seinen gespeicherten Zustand (VALIDATION aus). Weil aber nach dem Einfügen die NEIGHBORS-Updates laufen, wird jede Treppe neu berechnet, deren Nachbarposition sich geändert hat, also praktisch jede Treppe im Bauwerk. Daraus folgt: (a) Der Generator berechnet `shape` mit obigem Algorithmus, dann ist das Ergebnis stabil. (b) „Unnatürliche“ Formen, etwa eine gerade Treppe neben einer quer stehenden, bleiben nur mit `//perf neighbors off` oder `/setblock … strict` erhalten. Für einen Generator eignen sie sich nicht. Dasselbe gilt für Zäune, Mauern, Glasscheiben und Eisengitter (Verbindungs-Properties): natürliche Werte speichern.
- **Typische Eckzustände** (alle `half=bottom`, Walmring k, Grundriss x∈[a,b], z∈[c,d]): Nordkante `facing=south`, Südkante `facing=north`, Westkante `facing=east`, Ostkante `facing=west`. Die Ecken ergeben (mit facing aus der N/S-Kante): NW `south, outer_left`; NE `south, outer_right`; SW `north, outer_right`; SE `north, outer_left`. Der hohe Quadrant zeigt dabei jeweils zur Dachmitte, das ist geprüft. Gleichwertig wäre das facing der O/W-Kante mit dem jeweils anderen left/right, denn das Modell ist identisch.
- **Kehle (konkave Ecke):** Die Südtraufe eines Hauptdachs (facing=north) trifft auf die Westseite eines nach Süden laufenden Flügels (facing=east). Die Ecktreppe ist dann `facing=north, shape=inner_right` (niedriger Quadrant SW = Außenraum). Auf der Ostseite des Flügels (facing=west) ergibt sich `facing=north, shape=inner_left`.
- **Ring aus nach außen zeigenden Treppen** (Dachrinne/Brüstung, „backwards stairs“): An den Ecken entstehen automatisch `inner_*`, z. B. SE-Ecke `facing=south` mit Nachbar `facing=east` dahinter → `inner_left`.
- `waterlogged=false` immer explizit setzen. Für runde Formen (Kegel, Kuppeln) reicht es, jeder Ringtreppe als `facing` die zur Mitte zeigende Hauptachse zu geben (|dx|>|dz| → west/east, sonst north/south; bei Gleichstand beliebig) und dann den Algorithmus laufen zu lassen. Die Ecken der Pixelkreis-Treppen werden so automatisch outer/inner.

### Gaps
- Den Vanilla-Quellcode für `getStairsShape` konnte ich nicht aus einer zitierbaren öffentlichen Quelle laden. Der Pseudocode stammt aus Code-Kenntnis und ist mit Wiki-Text und Modelldaten konsistent, aber nicht Zeile für Zeile verifiziert.
- Wie Strukturblöcke (`.nbt`, `StructureTemplate`) Zustände beim Platzieren aktualisieren (nur am Rand? gar nicht?), habe ich nicht geprüft.
- Nicht verifiziert ist auch, ob jede WorldEdit-Plattformimplementierung von `updateNeighbors` intern Vanillas `updateNeighbourShapes` aufruft. Der Code-Kommentar „connection updates“ spricht dafür. Der Fabric-Adapterpfad lieferte 404.

## 2. Satteldach: 45°-Standard, Neigungsvarianten, First und Giebel

### Takeaway
Mit Vanilla-Blöcken gibt es drei saubere Grundneigungen: Vollblock + Treppe je Spalte (2:1, 63,4°), Treppe je Spalte (1:1, 45°) und abwechselnd untere/obere Stufe (1:2, ≈26,6°; das Wiki schreibt fälschlich 22,5°). Gemischte Muster aus 2–3 Elementen ergeben Zwischenneigungen. Bei ungerader Tiefe sitzt der First auf einer Mittelreihe, die mit einer Stufe oder einem Vollblock abgedeckt wird; bei gerader Tiefe stoßen zwei Treppenreihen Rücken an Rücken. Das Giebeldreieck wird mit Wand- oder Fachwerkmaterial gefüllt, gern um 1 Block eingerückt.

### Cited Findings
- „In Minecraft it is easy to get a roof pitch with an angle of 63.4°, 45° or 22.5° – just use double blocks for 63.4°, steps for 45° and alternate upper and lower slabs for 22.5°.“ — [minecraft.wiki Roof construction guidelines](https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines) (Hinweis: Abwechselnd untere/obere Stufe ergibt rechnerisch 0,5 Block Anstieg pro Block = atan(0,5) ≈ 26,6°, nicht 22,5°.)
- Zwischenneigungen: „a sequence of slab, upside down stair, stair, slab, upside down stair, stair, rises five blocks vertically for every seven horizontally. As a general rule, the more complex the pattern, the bigger the roof you will need before you can use it.“ Dazu ein Bild „An intermediate roof pitch using slabs, stairs and upside-down stairs“. — [minecraft.wiki Roof construction guidelines](https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines)
- Gerade/ungerade Breite: Bei steilen Dächern oder einem ungeraden Mittelelement (z. B. Tür) soll das ganze Gebäude ungerade breit sein, damit der First genau darüber spitz zuläuft. Bei Doppeltür o. Ä. sollte die Breite gerade sein. Die Gebäudebreite beeinflusst stark, wie das steilste Dach aussieht. — [minecraft.wiki Roof construction guidelines](https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines)
- Bildunterschrift zum einfachen Satteldach: „not suitable for buildings with widths greater than about 12 blocks“. Das Beispielhaus ist 6×10 und passt zu Dorfgebäuden. — [minecraft.wiki Roof types](https://minecraft.wiki/w/Tutorial:Roof_types)
- „Normales Treppendach“: Bei ungerader Hausbreite „oben auf dem Dachfirst halbe Blöcke platzieren, damit das Dach nicht so stumpf wirkt“; ungeeignet für größere Gebäude. „Stufendach“: nur Stufen verwenden ergibt ein flacheres Dach, dabei entstehen Vollblock-Flächen, auf denen Monster spawnen können. — [de.minecraft.wiki Anleitungen/Dach](https://de.minecraft.wiki/w/Anleitungen/Dach)
- Firstdekoration: z. B. „eine Reihe Bruchsteinmauern“; Giebel lassen sich mit andersfarbigem Material verbinden; „Wikingergiebel“ = großer, kurviger Giebelaufsatz. — [de.minecraft.wiki Anleitungen/Dach](https://de.minecraft.wiki/w/Anleitungen/Dach)
- Steileres A-Frame: „try adding a regular block in between each vertical layer of stair blocks“; ungerade Breite empfohlen. Bei gerader Breite: „Two stair blocks, mirroring each other, will give the illusion of a one-block wide top“. — [CurseForge Blog: Top Minecraft Roof Designs](https://blog.curseforge.com/top-minecraft-roof-designs-to-try/)
- Gerade Breite → „the ridge sits two blocks wide. Use a slab cap or top the ridge with a fence or wall post to hide the seam.“ Giebeldreieck mit Wand- oder Trim-Block füllen, „recess the gable wall back one block under the overhang, and put a window or beam detail in the triangle“. Eine Neigung für den ganzen Bau beibehalten, 1:1 lässt sich am leichtesten ausrichten. — [Astroworld Guide: How to Build a Roof](https://guide.astroworldmc.com/how-to-build-a-roof)
- Beispiel-Palette: Fichtentreppen bis zum First, Firstlinie aus Fichtenstufen, Giebel aus `stripped_spruce_log`-Rahmen mit Fichtenbrett-Füllung und Falltür als Fensterladen. Fachwerkgiebel mit Dunkeleichenstämmen über weißer Terrakotta. — [CozyGameBuilds: 27 Roof Design Ideas](https://cozygamebuilds.com/minecraft-roof-design-ideas/) (Hobby-Blog)
- Helmdach-Hinweis: „slabs are usually needed under the main roof blocks“, Treppen nur in zwei Richtungen ausrichten, besser bei ungerader Turmbreite (Beispiel 7×7). — [minecraft.wiki Roof types](https://minecraft.wiki/w/Tutorial:Roof_types)

### Inferences
- **Parameter:** Wände x∈[x0,x1], z∈[z0,z1] (Außenkanten), First entlang x, Wandkrone auf y = yb−1. Überstand Traufe `oe` (Default 1), Ortgang `og` (Default 1). Dachtiefe D = (z1−z0+1) + 2·oe. Treppenlagen k = 0 … ⌊D/2⌋−1; bei ungeradem D zusätzlich eine Firstreihe bei k = (D−1)/2.
- **Variante A (Traufreihe auf Wandkrone +1):** Lage k: y = yb+k; Nordreihe z = z0−oe+k mit `facing=south`, Südreihe z = z1+oe−k mit `facing=north`, x von x0−og bis x1+og, alle `half=bottom, shape=straight`. Querschnitt für 7 Block Breite (z0=0, z1=6), oe=1, D=9:
  ```
  Legende: / = <mat>_stairs[facing=south,half=bottom]   \ = <mat>_stairs[facing=north,half=bottom]
           s = <mat>_slab[type=bottom]   G = Giebelfüllung (nur in der Giebelwand-Ebene, sonst Luft/Dachboden)
           | = Wand
   y\z    -1  0  1  2  3  4  5  6  7
   yb+4    .  .  .  .  s  .  .  .  .     First (D ungerade)
   yb+3    .  .  .  /  G  \  .  .  .
   yb+2    .  .  /  G  G  G  \  .  .
   yb+1    .  /  G  G  G  G  G  \  .
   yb      /  G  G  G  G  G  G  G  \     Traufreihe = Überstand
   yb-1    .  |  .  .  .  .  .  |  .     Wandkrone
  ```
- **Variante B (abgesenkte Traufe, Dachfläche läuft an der Wand vorbei):** Lage k auf y = yb−oe+k. Die Traufreihe hängt neben der obersten Wandlage, das Dach wird um oe niedriger. Wirkt realistischer und „sitzt“ auf dem Haus.
  ```
   y\z    -1  0  1  2  3  4  5  6  7
   yb+3    .  .  .  .  s  .  .  .  .
   yb+2    .  .  .  /  G  \  .  .  .
   yb+1    .  .  /  G  G  G  \  .  .
   yb      .  /  G  G  G  G  G  \  .
   yb-1    /  |  G  G  G  G  G  |  \
  ```
- **Giebelfüllung:** In den Ebenen x = x0 und x = x1 je Lage k: z von max(z0, zN(k)+1) bis min(z1, zS(k)−1), unterhalb der Treppen. **Eingerückter Giebel:** Füllung in x0+1 bzw. x1−1. Die Ortgang-Treppen bei x0−og…x0 bilden dann ein Vordach, das einen Schatten wirft.
- **Firstvarianten bei ungeradem D** (Mittelreihe zM, y = yb+kF):
  - (a) `<mat>_slab[type=bottom]` – weicher, flacher Abschluss (de.wiki).
  - (b) Vollblock oder `<mat>_slab[type=double]` – kantiger Firstbalken.
  - (c) Vollblock + Stufe darüber – betonter, höherer First.
  - (d) Mauerreihe `<stein>_wall` auf (b): nur für Materialien mit Mauer (Liste in Abschnitt 6); natürliche Zustände im geraden Lauf `east=low, west=low, north=none, south=none, up=false`, an den Enden `up=true` (nicht verifiziert, siehe Gaps).
  - (e) Kontrastmaterial (z. B. `polished_deepslate_slab` auf `spruce_stairs`).
- **Firstvarianten bei geradem D:** Die zwei letzten Treppenreihen stehen Rücken an Rücken (Oberkante flach). Optional eine Reihe `type=bottom`-Stufen auf beide (+0,5) oder Zaun-/Mauerpfosten im Abstand von 2–4 Blöcken (Astroworld).
- **Neigungstabelle als Spaltenmuster** (Spalte i = i-te Reihe von der Traufe zum First, y0 = Traufhöhe; Treppen `half=bottom`, facing zum First):
  | Neigung | Spalte i | Anstieg/Spalte |
  |---|---|---|
  | 2:1 (63,4°) | Vollblock bei y0+2i, Treppe bei y0+2i+1 | 2 Blöcke |
  | 1:1 (45°) | Treppe bei y0+i | 1 Block |
  | 2:3 (≈33,7°) | Muster Treppe(y), Treppe(y+1), Stufe `top`(y+1), dann von vorn mit y+2 | 2 Blöcke / 3 Spalten |
  | 1:2 (≈26,6°) | i gerade: `slab[type=bottom]` bei y0+i/2; i ungerade: `slab[type=top]` bei y0+(i−1)/2 | 0,5 Block |
  | 1:2, „gestuft“ | Treppe (y0+j) und dahinter `slab[type=top]` (y0+j), j = i/2 | 0,5 Block |
- **Allgemeiner Spalten-Algorithmus (für beliebige und gekrümmte Profile):** Ein Profil ist eine Folge von Anstiegen Δi in hb. Mit t0 = Δ0 und ti = ti−1 + Δi ist ti die Oberkante der Spalte i. Belegung:
  - Δ=1: Stufe; ti ungerade → `slab[type=bottom]` bei y=(ti−1)/2, ti gerade → `slab[type=top]` bei y=ti/2−1.
  - Δ≥2 mit ti gerade: Treppe bei y=ti/2−1. Darunter wird die Lücke bis zur Vorderkante der vorigen Spalte gefüllt: ganze Blöcke für jede volle Blockhöhe, bei ungeradem Rest eine `slab[type=top]`. Beispiele: Δ=3 → `slab[type=top]` + Treppe; Δ=4 → Vollblock + Treppe.
  - Treppen nur dort setzen, wo ti gerade ist (eine Treppe steigt immer von x,5 auf x+1). Bei ungeradem ti vor einer Treppen-Spalte erst eine Δ=1-Stufe oder ein Δ=3 einschieben.
- Für Weihnachtshäuser mit 7–11 Block Breite: 45° als Standard, 63,4° für „Alpen-/Hexenhaus“-Wirkung bei schmalen Häusern (≤9 Breite inkl. Überstand), Stufendach 1:2 nur für breite Nebengebäude (Markthallen, Bahnhof).

### Gaps
- Die Wiki-Folge „slab, upside down stair, stair“ (5:7) ist ohne Bild nicht eindeutig zu rekonstruieren: Welche Teile wo gestapelt sind, bleibt offen.
- CozyGameBuilds nennt 2:1 „squat alpine“, also gedrungen. Das widerspricht der Geometrie (2:1 ist steiler) und ist vermutlich als Lauf:Steigung gemeint, aber unklar.
- Quellen zur Mauer-Logik (`up`/`low`/`tall`) habe ich nicht abgerufen. Die genannten Zustände sind aus dem Spielverhalten abgeleitet.

## 3. Überstände, Traufe, Ortgang, Zierleisten und zweilagige Dächer

### Takeaway
Fast alle Quellen empfehlen 1 Block Überstand rundum, auch am Giebel. 2 Blöcke gelten als „tiefes“ Dach (Chalet). Kopfüber-Treppen unter Traufe und Ortgang glätten die Unterseite zu einer sauberen Diagonale. Eine Randleiste aus kontrastierendem Material (Holzdach mit Steinrand oder umgekehrt) und eine Unterkonstruktion (Konsolen, Balken, Untersicht) erzeugen Tiefe.

### Cited Findings
- „Ein Überhang verleiht dem Gebäude ohne viel Aufwand mehr Tiefe. Dabei ist darauf zu achten, den Überhang nicht nur an den Dachkanten, sondern auch am Giebel fortzuführen. Dazu macht man das Dach einfach auf allen vier Seiten einen Block größer als das eigentliche Gebäude.“ — [de.minecraft.wiki Anleitungen/Dach](https://de.minecraft.wiki/w/Anleitungen/Dach)
- Umrandung: auf Kontrast achten. Holzstufen/-treppen als Hauptmaterial, Rand aus Steinziegel- oder Bruchsteinstufen/-treppen. „Eine Umrandung ist bei einem Dach aus bunten Tonblöcken ein Muss.“ Variation: passende Blöcke mischen (Eiche+Fichte, Steinziegel+Bruchstein). „Unterteilung“: an Gebäudeabschnitten das Dach einen Block höher setzen. — [de.minecraft.wiki Anleitungen/Dach](https://de.minecraft.wiki/w/Anleitungen/Dach)
- Flachdach-Rand: immer andere Blocktypen als für den Rest des Gebäudes. Stufen, „backwards stairs, forming a gutter“, Schilder oder eine Brüstung. — [minecraft.wiki Roof types](https://minecraft.wiki/w/Tutorial:Roof_types)
- Überstand 1–2 Blöcke: „casts a shadow line and stops the roof looking stuck on“. Eine Fascia/Trim-Leiste schärft die Kante. „Run a slab or stair fascia under the overhang and the roof gains a shadow line and depth.“ Gegen Lichtlöcher: Unterseite mit Kopfüber-Treppen oder oberen Stufen auskleiden oder eine Vollblock-Decke eine Lage tiefer. — [Astroworld Guide](https://guide.astroworldmc.com/how-to-build-a-roof)
- „(OPTIONAL) Extend the edges out from the front and back by one block for extra depth. You can also place upside down stairs underneath to give the diagonal a cleaner look.“ — [CurseForge Blog](https://blog.curseforge.com/top-minecraft-roof-designs-to-try/)
- Überstand 1–2 Blöcke, „use slabs and upside-down stairs to soften the eaves, and vary the material so a big roof is not one flat color“. Falltüren entlang der Giebelkanten als Zierleiste. — [buildingguide.app: Minecraft Roof Designs](https://buildingguide.app/minecraft-roof-designs)
- Chalet: „extend the eaves two blocks past the wall“. Auskragendes Flachdach: Auskragung höchstens etwa das Dreifache der Dachdicke. Flachdach mit 1 Block Überstand aus `smooth_quartz_slab` als Schattenkante. Tempel: Untersicht aus `stripped_spruce_log`. Pavillon: Untersicht aus rosa Teppich. — [CozyGameBuilds](https://cozygamebuilds.com/minecraft-roof-design-ideas/) (Hobby-Blog)

### Inferences
- **Ortgang-Spalte (x = x0−og) mit glatter Untersicht**, Querschnitt wie Variante A. Unter jeder Ortgang-Treppe der Lage k ≥ 1 sitzt eine Kopfüber-Treppe mit der **Gegen**richtung (weg vom First):
  ```
  / \ = Trim-Treppen half=bottom (facing south / north)
  < = <trim>_stairs[facing=north,half=top]   > = <trim>_stairs[facing=south,half=top]
  S = <trim>_slab[type=top]   s = <trim>_slab[type=bottom]
   y\z    -1  0  1  2  3  4  5  6  7
   yb+4    .  .  .  .  s  .  .  .  .
   yb+3    .  .  .  /  S  \  .  .  .     S schließt die Spitze unter dem First
   yb+2    .  .  /  <  .  >  \  .  .
   yb+1    .  /  <  .  .  .  >  \  .
   yb      /  <  .  .  .  .  .  >  \
  ```
  Ergebnis: ein 1 Block dickes, diagonales „Brett“, dessen Unterseite pro Halbblock um einen Halbblock steigt. Bei den Kopfüber-Treppen gibt es keine Eckbildung mit den Dachtreppen (andere `half`).
- **Traufgesims/Konsolen:** Unter der Traufreihe, direkt an der Wandaußenseite (z = z1+1, y = Traufhöhe−1), steht eine Kopfüber-Treppe, deren volle Unterseite zur Wand zeigt (Südseite `facing=north, half=top`; Nordseite `facing=south, half=top`). Durchgehend oder nur alle 2–3 Blöcke (rhythmische Konsolen). Alternativen: `<holz>_fence` als Stütze, `stripped_<holz>_log[axis=x]` als durchlaufender Balken.
- **Zweilagiges Dach / Randleiste:**
  - (1) Die äußerste Reihe (Traufreihe k=0 und Ortgang-Spalten) im Trim-Material, Fläche im Hauptmaterial. Bewährte Paare aus den Quellen: `spruce_stairs` + `stone_brick_stairs` bzw. `cobblestone_stairs`, `deepslate_tile_stairs` + `dark_oak_stairs`, bunte Terrakotta-Vollblöcke + beliebige Steintreppe als Pflicht-Rand.
  - (2) Zwei Lagen übereinander: Hauptdach in Variante B plus eine zweite, um 1 nach außen versetzte Traufreihe aus Stufen (`type=bottom`, Δ=1) – ergibt einen leichten Knick und eine Art Glockenfuß (siehe Abschnitt 4).
- **Untersicht im Weihnachtskontext:** Laternen (`lantern[hanging=true]`) oder Lichterketten hängen unter Vollblock-/`half=bottom`-Unterseiten der Traufe (Lantern-Regeln siehe Abschnitt 6).
- Trapdoor-Zierleisten: Die genaue Ausrichtung (`facing`/`open`/`half`) habe ich nicht geprüft. Vor der Nutzung in-game testen oder im Wiki nachlesen.

### Gaps
- Keine abrufbare Quelle mit Messwerten wie „Überstand X bei Breite Y“. Die Empfehlungen (1 Standard, 2 tief) sind Konsens von Wiki und Blogs, keine Regel.
- Die genaue Blockausrichtung von Falltür-Zierleisten habe ich nicht verifiziert.

## 4. Geschwungene, glockenförmige Dächer und aufgebogene Traufen

### Takeaway
Gekrümmte Dächer entstehen, indem man die Neigung abschnittsweise wechselt: konkav (Glocke, Gull-Wing, Flügeldach) = unten flach (Stufen), oben steil (Treppe, dann Block+Treppe); konvex (Gambrel, Kuppel) = umgekehrt. Laut Wiki lesen sich Kurven erst ab etwa 6 Blöcken Radius als Kurven. Konkave „japanische“ Kurven gelten als am schwersten und sollten im Kleinen mit geraden Abschnitten angenähert werden. Für hochgezogene Pagoden-Ecken fand ich keine verlässliche Blockfolge.

### Cited Findings
- „If the curve radius is less than about six meters, the roof will tend to look like a normal pitched roof with a strange mixture of pitches.“ Ein Pixel entspricht einem Block. „By using stairs and half-slabs it is sometimes possible to treat one pixel as a quarter of a block“. — [minecraft.wiki Tutorial:Curved roofs (archivierte Revision vom 21.10.2025, heute Weiterleitung auf Roof types)](https://minecraft.wiki/index.php?oldid=3226751)
- Konkave Kurven: „Roofs with concave curves, as in the style of some traditional Japanese buildings […] are by far the hardest shapes to model well“. Im Kleinen mit geraden Abschnitten annähern, „possibly using fence posts, signs, or different materials to make the straight lines less obvious.“ Komplexe Kurven (Ogee, Sattel) erst ab ≥20×20 Grundfläche. — [minecraft.wiki Curved roofs (Rev. 3226751)](https://minecraft.wiki/index.php?oldid=3226751)
- Kegel mit leicht gekrümmtem Profil: „You can also change the rate at which the cone reduces in size to give it a slightly curved profile. For example, instead of a radius reduction every 5 meters, you might start at 4, then increase to 6, 8, 10 as you work up the spire.“ — [minecraft.wiki Curved roofs (Rev. 3226751)](https://minecraft.wiki/index.php?oldid=3226751)
- Bell-cast-Dach: „two distinct roof pitches, but it is shallow lower down, and steep higher up“ (auch „bonnet roof“). Gull-Wing: „shallow pitch lower down, and steep higher up“, oft mit großem Überstand. Gambrel: „steep lower down, and shallow or flat higher up“, Kurven eher unten. — [minecraft.wiki Roof types](https://minecraft.wiki/w/Tutorial:Roof_types)
- Flügeldach: Die Überhänge haben einen anderen, flacheren Winkel als der Rest und sind oft sehr groß. Oben ein normales Treppendach, die Überhänge aus Stufen, „Dadurch bekommt man eine typische, kurvige Form.“ Glockenförmiges Dach: läuft um das ganze Gebäude und wird nach oben immer steiler, „jedoch nicht so schnell wie bei einem Mansarddach“. — [de.minecraft.wiki Anleitungen/Dach](https://de.minecraft.wiki/w/Anleitungen/Dach)
- Gullwing nach CurseForge: das Kreismuster eines Kreises, der 2–3× so groß ist wie die gewünschte Dachhöhe, ausschnittweise verwenden. Pagode: „requires two different materials, one outlining the other“; Satteldach oder Gullwing mit andersfarbiger Außenkante bauen, dann „a gentle upper slope border on all four sides in the same trim material“, schließlich „a small protrusion at the end of the top peak using a couple of slabs or stair blocks“. — [CurseForge Blog](https://blog.curseforge.com/top-minecraft-roof-designs-to-try/)
- Tempeldach: Hauptdach aus `deepslate_tile_stairs`, „extend the eaves out and curl them up using upside-down stairs at the tips“, Untersicht aus `stripped_spruce_log`, First aus `chiseled_deepslate`, Laterne an jeder Ecke. Pagode: jede Stufe um 1 Block Radius kleiner, kleine vertikale Abstände. — [CozyGameBuilds](https://cozygamebuilds.com/minecraft-roof-design-ideas/) (Hobby-Blog, ohne Bilder geprüft)

### Inferences
- **Profile als Δ-Folgen (in hb, von der Traufe zum First), umgesetzt mit dem Spalten-Algorithmus aus Abschnitt 2:**
  | Profil | Δ-Folge | Wirkung |
  |---|---|---|
  | Glockenfuß / flared eave auf 45°-Dach | 1,1, dann 2,2,2,… | 2 flache Stufenreihen vor der normalen Treppenfläche |
  | Konkav (Bell-cast, Gull-Wing) | 1,1,2,2,2,4,4 | flach → 45° → 63° |
  | Konvex (Gambrel-ähnlich, Kuppelsegment) | 4,4,2,2,1,1 | steil → 45° → flach |
  | S-/Ogee-Kurve (nur große Dächer) | 1,1,2,4,4,2,1,1 | flach-steil-flach |
  | Sanfte Konkave für Turmhelme | Ringe nach Wiki-Raten 4,6,8,10 statt konstant | konkave Spitze |
- **Ausgeschriebenes Beispiel konkav (Δ = 1,1,2,2,4)**, y relativ zur Traufe, Treppen mit facing zum First:
  ```
  Spalte: 0              1             2          3          4
  Block : slab[bottom]   slab[top]     stairs     stairs     Vollblock + stairs
  y     : 0              0             1          2          3 (Block), 4 (Treppe)
  Oberk.: 0,5            1,0           1,5→2,0    2,5→3,0    4,5→5,0
  ```
- **Flared eave rundum (Walm/Pagode):** Ring 0 (2. Überstand) aus `slab[type=bottom]`, Ring 1 aus `slab[type=top]`, ab Ring 2 Treppenringe mit Ecken `outer_*` (Abschnitt 1). Die Untersicht des Stufenrings bleibt flach, deshalb mit Balken (`stripped_<holz>_log`) oder Zäunen darunter abstützen.
- **Aufgebogene Ecken (Vorschlag, nicht aus Quellen verifiziert):** Auf den letzten 2 Blöcken vor jeder Ecke den Traufring um +1 hb anheben (statt `bottom` eine `top`-Stufe). Auf den Eckblock eine Treppe `half=bottom` mit facing nach außen entlang der Längskante, sodass die hohe Seite außen liegt und die Spitze nach oben zeigt. Alternativ nach CozyGameBuilds eine Kopfüber-Treppe an der Spitze. Darunter `lantern[hanging=true]` an einer `iron_chain[axis=y]`. In-game prüfen: Die Ecktreppe kann mit benachbarten Treppen Ecken bilden. Das ist dann gewollt, sofern der Algorithmus es so berechnet.
- **Mehrstufige Pagode:** Pro Geschoss ein Walmring-Dach mit flared eave, nächstes Geschoss 1 Block (Radius) kleiner. Ein kurzes Wandstück (1–2 Blöcke) zwischen den Dachringen, Trim in Kontrastfarbe (z. B. `dark_oak_stairs` + Trim `red_nether_brick_stairs` oder Rand aus `stripped_dark_oak_log`).

### Gaps
- Für Pagoden-/Tempelecken habe ich keine Blockfolge aus einer verlässlichen Quelle gefunden (Reddit, YouTube und Planet Minecraft waren nicht erreichbar). Die vorgeschlagene Ecke ist ungetestet.
- Den Sportskeeda-Artikel zu gekrümmten Dächern (2021) konnte ich nicht inhaltlich auswerten, die Seite lieferte nur Navigation.
- Keine Quelle mit erprobten Δ-Folgen. Die Tabelle ist aus Wiki-Grundneigungen und der Kegel-Raten-Idee abgeleitet.

## 5. Weitere Dachformen: Walm, Krüppelwalm, Mansard, Gambrel, A-Frame, Saltbox, Kreuzgiebel/Kehlen, Gauben, Pagode, Kegel/Turm, Kuppel/Zwiebel, Flachdach mit Attika

### Takeaway
Alle Formen lassen sich aus zwei Bausteinen erzeugen: „Lagen-Ringen“ (Walm, Pyramide, Mansard, Kegel/Kuppel als Kreisringe) und „Lagen-Reihen“ (Sattel, Gambrel, Saltbox, A-Frame), jeweils mit einem Spaltenprofil (Δ-Folge). Verschneidungen (Kreuzgiebel) baut man vom höchsten Dach zum niedrigsten und entfernt die Blöcke innerhalb der V-förmigen Kehle. Die Ecken ergeben sich danach automatisch aus der Treppenlogik.

### Cited Findings
- Walmdach: „sloped in both directions“, weniger Dachvolumen; auf quadratischem Grundriss eine Pyramide. Krüppelwalm/Dutch Gable = Mischung aus Sattel- und Walmanteil, Wechsel an beliebiger Höhe (Beispiel: 3 Reihen Satteldach + 2½ Reihen Walm inkl. Stufenreihe am First). Dutch Gable = Walmdach mit kleinem Giebel oben, oft mit Fenster. — [minecraft.wiki Roof types](https://minecraft.wiki/w/Tutorial:Roof_types)
- Pyramidendach: Stufen im Rechteck, „An der Spitze wird oft eine Stufe verwendet“, abwechselnd Stufen und Treppen möglich. Halbes Pyramidendach / holländisches Treppendach wie oben. — [de.minecraft.wiki Anleitungen/Dach](https://de.minecraft.wiki/w/Anleitungen/Dach)
- Mansard: meist steil, oben flacher oder flacher Abschnitt, Neigung in N-S- und O-W-Richtung, fast immer mit Gauben. Wirkt erst bei großen Gebäuden passend (Beispiel ca. 16×20, mit Attika und 1 m Umgang 20×24). Gambrel: 2–3 Neigungen, unten steil, oben flach. Saltbox: eine Seite deutlich länger, vorne 2 Geschosse, hinten 1. Skillion/Pultdach: eine Fläche, Beispiel mit 1:1 und 2:1. Weitere: Clerestory, Monitor, Sägezahn, Schmetterling, Helmdach. — [minecraft.wiki Roof types](https://minecraft.wiki/w/Tutorial:Roof_types)
- Mansarddach (de.wiki-Bild): untere Neigung aus „einem Block und einer daran angrenzenden Stufe“ (flach), andere Neigung aus „einem Block mit einer Treppe darüber“ (steil). Die Dunkeleichen-Markierung zeigt zum Vergleich 45°. — [de.minecraft.wiki Anleitungen/Dach](https://de.minecraft.wiki/w/Anleitungen/Dach)
- Gambrel nach CozyGameBuilds: unten `red_terracotta`-Treppen (1.21.11 hat keine Terrakotta-Treppen, siehe Abschnitt 1!), oben Stufen, First `smooth_stone_slab`. „a stair, then a slab one block in and up, then continuing at the gentler angle“. — [CozyGameBuilds](https://cozygamebuilds.com/minecraft-roof-design-ideas/) (Materialangabe für 1.21.11 ungültig)
- Gambrel nach CurseForge: Kopfüber-Treppe hinter die erste Treppe, Vollblock darauf, bis etwa zur Mitte. Danach im Wechsel Stufen und Vollblöcke (Text teils widersprüchlich). Optional Querbalken am Neigungswechsel. A-Frame: Dach bis zum Boden, steiler mit Block zwischen den Treppenlagen, ungerade Breite. — [CurseForge Blog](https://blog.curseforge.com/top-minecraft-roof-designs-to-try/)
- A-Frame-Grundfläche 5–7 Block breit, sonst wird die Neigung zu flach. Gauben nur 2 Block breit, drei gleichmäßig verteilt. — [CozyGameBuilds](https://cozygamebuilds.com/minecraft-roof-design-ideas/)
- Gaube nach buildingguide.app: 2 Block breite Lücke ins Dach schneiden, Wände 2–3 Blöcke hochziehen, kleines Sattel- oder Flachdach darauf, Glasscheiben. Kreuzgiebel: jede Satteldach-Sektion einzeln bauen, „The valley where the two roofs meet can be filled with stairs or slabs.“ Kegel: Treppenringe, „step inward every 1-2 layers“, Spitze aus Stufe oder spitzem Block. — [buildingguide.app](https://buildingguide.app/minecraft-roof-designs)
- Dachverschneidung (Wiki-Ablauf): 1) Mit dem höchsten Dachabschnitt beginnen und ihn komplett bauen. 2) Den zweithöchsten bauen und an der Verschneidung anpassen. 3) Weiter von hoch nach niedrig. 4) Zum Schluss überflüssige Blöcke entfernen. „when roofs join, they usually do so along a V-shaped line, and roof blocks inside that V will be removed“. Bei gedrehten (nicht achsparallelen) Gebäuden eher Stufen oder Vollblöcke als Treppen verwenden. — [minecraft.wiki Roof construction guidelines](https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines)
- Gaubentypen: Giebel-/„dog-house“-, Walm-, Flach-, Schlepp-, Fledermaus-, Verbindungs-, Kamin-, Nantucket-Gaube; Wandgaube (Wand läuft hoch), Blindgaube (nur außen). — [minecraft.wiki Roof types](https://minecraft.wiki/w/Tutorial:Roof_types). Funktionsgaube: Loch ins Dach, die Dachblöcke „im 90° Winkel zum restlichen Dach“ hochziehen, Fenster in den Zwischenraum. — [de.minecraft.wiki Anleitungen/Dach](https://de.minecraft.wiki/w/Anleitungen/Dach)
- Kegeldach (Wiki-Verfahren): Durchmesser und Mitte wählen (ungerader Durchmesser ergibt eine schärfere Spitze), Pixelkreis-Muster, „Höhenschritt“ wählen. Beispiel Durchmesser 8: Ringliste 8,8,8,6,6,6,4,4,4,2,2,2 (12 hoch). Scharfe Turmspitzen steigen oft 3–5 Blöcke, bevor der Radius schrumpft. Ringdurchmesser bleiben immer alle gerade oder alle ungerade. Spitze: Zaunpfosten oben drauf, den 3er-Ring durch eine Raute aus 4 Blöcken ersetzen. — [minecraft.wiki Curved roofs (Rev. 3226751)](https://minecraft.wiki/index.php?oldid=3226751)
- Kuppel: Ringliste aus dem Kreis-Querschnitt ablesen, z. B. Durchmesser 17 → 17,17,15,15,13,11,9,5. Segmentkuppel = obere Ringe eines größeren Kreises (Durchmesser 22 → 14,12,6 für ein 14 breites Gebäude, nur 3 hoch). Überhöhte Kuppel = unterste Durchmesser wiederholen (17,17,17,17,15,15,13,11,9,5). Tonnendach: z. B. Kreisbogen Durchmesser 18, 7 hoch. Gotischer Bogen = zwei überlappende Kreise. Zwiebel-, Glocken- und Ellipsoidkuppeln sind schwerer, „probably best to avoid them“ ohne Computerhilfe. Kuppeln aus Treppen und Stufen von Hand gelten als sehr fummelig, ein externes Werkzeug wird empfohlen. — [minecraft.wiki Curved roofs (Rev. 3226751)](https://minecraft.wiki/index.php?oldid=3226751)
- Pyramide/Kegel allgemein: konkaver Kegel = Lagenhöhe nach oben steigern, konvexer Kegel = unten dicke Lagen, nach oben dünner. — [minecraft.wiki Creating shapes](https://minecraft.wiki/w/Tutorial:Creating_shapes)
- Turmkegel nach CozyGameBuilds: `blackstone_stairs`, pro Ring 1 nach innen und 1 nach oben, Spitze `polished_blackstone_wall` + `lightning_rod`. „Cones only look right on odd-diameter towers“. Kupferkuppel aus `oxidized_cut_copper_stairs`, Abschluss `chiseled_copper` + `lightning_rod`, ungerader Durchmesser (7 oder 9). — [CozyGameBuilds](https://cozygamebuilds.com/minecraft-roof-design-ideas/)
- Flachdach: Rand wie bei der Schmiede im Dorf (Stufen), „backwards stairs, forming a gutter“, Brüstung. Mob-Spawning auf Flachdächern beachten. — [minecraft.wiki Roof types](https://minecraft.wiki/w/Tutorial:Roof_types). Brüstung/Geländer aus Falltüren, Mauern oder `iron_bars`. — [buildingguide.app](https://buildingguide.app/minecraft-roof-designs). Zinnen: Rhythmus 1 Block voll / 1 Lücke, bei großen Burgen 2 voll / 1 Lücke. — [CozyGameBuilds](https://cozygamebuilds.com/minecraft-roof-design-ideas/)

### Inferences
- **Walmdach-Rezept** (Grundriss inkl. Überstand x∈[a,b], z∈[c,d], W=b−a+1, D=d−c+1, D≤W): Lage k (y = yb+k) ist ein Rechteckring [a+k, b−k]×[c+k, d−k] mit Treppen zur Mitte und Ecken `outer_*` (Zustände in Abschnitt 1). Abbruch, sobald D−2k = 1 (eine Firstreihe aus `slab[type=bottom]` von a+k bis b−k) oder D−2k = 2 (zwei Reihen Rücken an Rücken, Ringenden outer). Bei W = D (Pyramide, ungerade) Spitze `slab[type=bottom]` oder Vollblock + Abschluss (`lightning_rod[facing=up]`, `<holz>_fence`, `<stein>_wall`). Draufsicht der Lage 0 bei 7×5 (Pfeil = facing):
  ```
  z=0:  o v v v v v o      v = facing=south   ^ = facing=north
  z=1:  > . . . . . <      > = facing=east    < = facing=west
  z=2:  > . . . . . <      o = Ecke: NW south/outer_left, NE south/outer_right,
  z=3:  > . . . . . <                SW north/outer_right, SE north/outer_left
  z=4:  o ^ ^ ^ ^ ^ o
  Lage 1: Ring x1..5, z1..3;  Lage 2: Firstreihe x2..4, z2 = slab[type=bottom]
  ```
- **Krüppelwalm / Dutch Gable:** Lagen 0…m−1 als Walmringe, ab Lage m nur noch Reihen (Satteldach) mit kleinem Giebeldreieck (Fenster). Umgekehrt (unten Sattel, oben Walm) ergibt das „half-hipped roof“.
- **Mansard:** Walmringe mit Profil Δ = 4,4(,4), danach Δ = 1,1 (Stufen) bis zur Mitte oder eine flache Decke aus `slab[type=bottom]`. Gauben in die steile Zone setzen. Erst ab etwa 16 Block Breite.
- **Gambrel (Scheune):** Satteldach-Reihen mit Δ = 4,4,2,1,1. Am Knick ein Querbalken `stripped_<holz>_log[axis=x]`. Giebelfüllung nach demselben Profil.
- **Saltbox:** First außermittig. Vordere Seite Lagen k = 0…n1, hintere Seite startet (bei gleicher Neigung) tiefer, d. h. die hintere Traufe liegt 1 Geschoss (4–5 Blöcke) tiefer und die hintere Dachfläche ist entsprechend länger.
- **A-Frame:** Variante B ab Bodenhöhe, Profil Δ=4 (Block+Treppe), Breite 5–7, Front als Glas-Dreieck (`glass_pane`, natürliche Verbindungs-Properties!).
- **Kreuzgiebel / Kehle:** Hauptdach (First entlang x) und Flügel (First entlang z) mit gleicher Neigung und gleicher Traufhöhe. Die Kehle verläuft diagonal: In Lage k liegt der Schnittpunkt bei (xW+k, zS−k) bzw. (xE−k, zS−k). Dort stehen Ecktreppen (`facing=north, inner_right` bzw. `inner_left`, siehe Abschnitt 1). Blöcke der Hauptreihe zwischen den Flügelseiten und Flügelblöcke nördlich der Hauptreihe entfallen. Der Flügelfirst endet dort, wo er die Hauptdachfläche trifft. Ist der Flügel niedriger, liegt seine Kehle entsprechend tiefer, und es gilt dieselbe Regel.
- **Gaube (Giebelgaube, 3 breit inkl. Wangen):** Im Hauptdach eine 1–3 breite Lücke über 2–3 Lagen, Gaubenwände senkrecht bis Traufhöhe der Gaube, darauf ein Mini-Satteldach (D = 3+2 → 2 Treppenlagen + Firststufe) mit First senkrecht zum Hauptfirst. Den Gaubenfirst auf Höhe der Hauptdachfläche enden lassen. Die Verschneidung erzeugt automatisch `inner_*`-Kehltreppen. Fenster: `glass_pane` oder `<holz>_trapdoor` als Läden.
- **Kegel/Spitzhelm auf Rundturm:** Ringliste nach dem Wiki-Verfahren. Jeder Ring aus Treppen (facing zur Mitte, Shapes per Algorithmus) oder Vollblöcken mit Treppen nur in der obersten Reihe jeder Höhenstufe. Höhenschritt 1 für einen stumpfen 45°-Kegel, 2–5 für einen spitzen Helm. Steigende Raten (2,3,4,5…) für einen konkaven Helm. Spitze: `<holz>_fence` + `lightning_rod[facing=up]` oder `end_rod[facing=up]`.
- **Turm mit quadratischem Querschnitt:** Pyramide (Walmrezept mit W=D), Helmdach nach Wiki (Treppen nur in 2 Richtungen, Stufen unter den Firstblöcken) oder hoher Spitzhelm mit Profil Δ=4.
- **Kuppel / Zwiebel:** Kuppel = Wiki-Ringliste. Zwiebel = Ringliste, die zuerst über den Turmdurchmesser hinaus wächst und dann schnell schrumpft, z. B. für einen 7er-Turm: 7, 9, 9, 9, 7, 5, 3, 1 + Spitze. Stufen- und Treppenglättung nur an den Ringrändern, Material z. B. `oxidized_cut_copper_*` oder `waxed_*`, damit die Farbe stabil bleibt.
- **Flachdach mit Attika:** Fläche aus `smooth_stone_slab[type=bottom]` (reduziert Mob-Spawning). Brüstungsring 1 Block hoch aus `<stein>_wall` oder Treppen nach außen (Rinne, Ecken `inner_*`). Optional Zinnen (1:1). Eine Krone aus Kopfüber-Treppen nach außen unter der Brüstung erzeugt ein Gesims.

### Gaps
- Erprobte Blocklisten für Zwiebeltürme und Pagodenecken habe ich nicht gefunden. Die Zwiebel-Ringliste ist ein Vorschlag.
- Von den Wiki-Bildern (Kreuzgiebel, Walm mit Giebel usw.) liegen nur die Texte vor, die Bilder habe ich nicht ausgewertet.

## 6. Schornsteine, Dachfenster, Schnee auf Dächern und Dachmaterialien

### Takeaway
Schornstein = Stein- oder Ziegelsäule durch die Dachfläche mit `campfire` oben. Rauch steigt etwa 10 Blöcke, mit `hay_block` darunter (`signal_fire=true`) 24 Blöcke. Schnee (`snow[layers=1..8]`) darf in Java nur auf Blöcken mit voller Oberseite liegen: Vollblock, obere oder doppelte Stufe, Kopfüber-Treppe. **Nicht** auf normalen Treppen oder unteren Stufen. Ungültiger Schnee wird beim WorldEdit-Einfügen durch die Nachbar-Updates sehr wahrscheinlich gelöscht. Alle 58 Treppenmaterialien haben eine gleichnamige Stufe, 26 davon auch eine Mauer. Holz und Kupfer haben keine Mauern. Woll-, Beton- und Terrakotta-Treppen gibt es in 1.21.11 nicht.

### Cited Findings
- Schnee-Platzierung: „In Java, snow can be placed on a block with the `support_override_snow_layer` tag, or a block with a full top face and not with the `cannot_support_snow_layer` tag. In Java, snow breaks if its support block is removed.“ Schneefall setzt Schnee nur auf Blöcke „with a complete solid top surface“. — [minecraft.wiki Snow](https://minecraft.wiki/w/Snow)
- Seit 1.12 (17w15a): „Snow can now be placed on top of upside-down stairs.“ Stairs-Seite: „Snow cannot accumulate on top of stair blocks“. — [minecraft.wiki Snow](https://minecraft.wiki/w/Snow), [minecraft.wiki Stairs](https://minecraft.wiki/w/Stairs)
- `snow` hat in 1.21.11 `layers` 1–8. Es gibt `snow_block` und `powder_snow`. `grass_block` hat `snowy`. — [mcmeta data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Chalet-Idee: Dach „blanket the top with snow blocks and snow layers, and hang pointed dripstone from the eaves as icicles“, Überstand 2 Blöcke. — [CozyGameBuilds](https://cozygamebuilds.com/minecraft-roof-design-ideas/)
- WorldEdit `//snow -s` stapelt Schneeschichten. — [Madeline Miller: WorldEdit 7.2](https://madelinemiller.dev/blog/introducing-worldedit-72/)
- Campfire: Rauch steigt „around 10 blocks“, mit `hay_block` darunter Signalfeuer „24 blocks“. Rauch dringt teilweise durch einen Block direkt darüber, aber nicht weiter. Eine Falltür blockiert den Rauch vollständig. Zustand `signal_fire` = „Whether the campfire has a hay bale below it.“ — [minecraft.wiki Campfire](https://minecraft.wiki/w/Campfire). In 1.21.11: `campfire[facing, lit, signal_fire, waterlogged]`. — [mcmeta data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Schornstein aus Steinsorte, meist Ziegel, mit dem Kamin darunter verbunden. (Rauch aus Spinnweben ist ein alter Tipp.) — [de.minecraft.wiki Anleitungen/Dach](https://de.minecraft.wiki/w/Anleitungen/Dach). Schornstein aus Steinziegeln mit Lagerfeuer oben, Blitzableiter oder Banner auf dem First. — [buildingguide.app](https://buildingguide.app/minecraft-roof-designs)
- Laternen hängen unter Blöcken. Steht eine Laterne auf einer ungültigen Fläche, „the lantern will break and drop itself when the invalid surface receives a block update.“ An Ketten schließen sie nahtlos an. — [minecraft.wiki Lantern](https://minecraft.wiki/w/Lantern). In 1.21.11 heißt die Kette `iron_chain` (`chain` existiert nicht mehr). Dazu gibt es `copper_chain` (+ Oxidations-/Wachsvarianten), `copper_lantern`, `copper_bars`, `lightning_rod` (+ Varianten). — [mcmeta data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Material-Abgleich 1.21.11: Alle 58 Treppen haben eine gleichnamige `_slab`. Nur als Stufe gibt es zusätzlich `cut_sandstone_slab`, `cut_red_sandstone_slab`, `smooth_stone_slab`, `petrified_oak_slab`. Eine `_wall` haben: andesite, blackstone, brick, cobbled_deepslate, cobblestone, deepslate_brick, deepslate_tile, diorite, end_stone_brick, granite, mossy_cobblestone, mossy_stone_brick, mud_brick, nether_brick, polished_blackstone, polished_blackstone_brick, polished_deepslate, polished_tuff, prismarine, red_nether_brick, red_sandstone, resin_brick, sandstone, stone_brick, tuff, tuff_brick. — [mcmeta data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Materialwirkung: „Deepslate tiles, dark prismarine and blackstone read as slate. Bricks, mud bricks and granite stairs read as clay tile. Spruce and dark oak suit cottages, copper and its weathered stages suit fantasy and steampunk. Pick a stair, a slab and a trim block from the same family“. — [Astroworld Guide](https://guide.astroworldmc.com/how-to-build-a-roof)
- Ziegeltreppen und -stufen gehören zu den häufigsten Dachdeckungen (passend vor allem für Mittelalter). Holz ist billig und vielseitig. Gefärbte Terrakotta in zwei Farbstufen (z. B. Hellblau/Blau) ist eine beliebte Deckung, Umrandung dann Pflicht. Strohballen (`hay_block`) einheitlich ausrichten, Problemstellen mit gelbem Teppich abdecken. — [de.minecraft.wiki Anleitungen/Dach](https://de.minecraft.wiki/w/Anleitungen/Dach)
- Stein/Deepslate für Burgen, Fichte/Dunkeleiche für Mittelalter und Rustikal, weißer Beton/Quarz modern, Kupfer Fantasy/Steampunk. — [buildingguide.app](https://buildingguide.app/minecraft-roof-designs). „Waxing keeps copper from oxidizing over time“. Gewachstes Kupfer behält seine Stufe. — [CozyGameBuilds](https://cozygamebuilds.com/minecraft-roof-design-ideas/)
- Dachfenster/Belichtung: Gauben (s. o.), Clerestory/Monitor-Dächer mit Fenstern im Aufbau, Sägezahndach mit verglasten Steilflächen. — [minecraft.wiki Roof types](https://minecraft.wiki/w/Tutorial:Roof_types). Fenster im Giebeldreieck. — [Astroworld Guide](https://guide.astroworldmc.com/how-to-build-a-roof). Glasblöcke als Oberlicht in der Pultdachfläche. — [CozyGameBuilds](https://cozygamebuilds.com/minecraft-roof-design-ideas/)

### Inferences
- **Schnee für das Weihnachts-Generator-Dach:**
  - (1) Auf 45°-Treppenflächen keine `snow`-Blöcke setzen: Sie wären ungültig, und die WorldEdit-NEIGHBORS-Updates würden sie beim Einfügen sehr wahrscheinlich entfernen, weil ein Schnee-Layer bei einem Shape-Update seine Stütze prüft.
  - (2) Gültige Schneeflächen: First aus Vollblock, `slab[type=top|double]` oder Kopfüber-Treppe, Flachdachteile, Gaubendächer mit Stufe-oben, Schornsteinköpfe, Ringe von Kuppeln aus Vollblöcken. Dort `snow[layers=1..3]` für eine Puderzucker-Schicht.
  - (3) „Verschneites Treppendach“: Eine 45°-Fläche aus **Vollblöcken** (Stufenpyramide) mit `snow[layers=4]` auf jeder Stufe sieht wie schneebedeckte Treppen aus und ist gültig.
  - (4) Weiße Treppen als „Schneekappe“ in den obersten 1–2 Lagen oder als Traufkante: `smooth_quartz_stairs`, `quartz_stairs`, `polished_diorite_stairs`, `diorite_stairs` (alle in 1.21.11 vorhanden). Für Vollblock-Partien `snow_block`.
  - (5) Eiszapfen: `pointed_dripstone[vertical_direction=down, thickness=tip]` unter der Traufe. Hängen sollte er nur unter Blöcken mit voller Unterseite: Vollblock, `half=bottom`-Treppe, `type=bottom`-Stufe. Kopfüber-Treppen und obere Stufen haben keine volle Unterseite. Die Regel habe ich nicht in einer Quelle verifiziert (siehe Gaps).
- **Schornstein-Rezept:** 1×1-Rauchzug (bei großen Häusern 2×2-Mantel) aus `bricks`/`stone_bricks`/`mud_bricks`, 1–3 Blöcke über die Dachfläche an der Durchstoßstelle bzw. mindestens bis Firsthöhe bei firstnahen Kaminen. Oben im Zug `campfire[lit=true, signal_fire=false, facing=north, waterlogged=false]`; für hohen Rauch `hay_block` direkt darunter und dann `signal_fire=true` (natürlicher Wert, wird sonst per Update gesetzt). Abdeckung höchstens als `<stein>_slab[type=top]` einen Block höher. Keine Falltür direkt darüber, denn sie blockiert den Rauch. Der Kopf kann mit `<stein>_wall` oder Kopfüber-Treppen als Gesims verziert werden.
- **Dachfenster-Optionen für den Generator:** Giebelgaube (Abschnitt 5), Fenster im Giebeldreieck (`glass_pane`, natürliche Verbindungen), Oberlicht als Vollblock-`glass` in der Treppenfläche (bricht die Treppenoptik, eher für Pult- oder Stufendächer), Monitor-Aufbau mit Fensterband für Markthallen und Bahnhof.
- **Material-Presets** (Treppe / Stufe / Vollblock / Trim / First):
  - Schiefer: `deepslate_tile_stairs` / `deepslate_tile_slab` / `deepslate_tiles` / `dark_oak_*` oder `polished_deepslate_*` / `deepslate_tile_wall`
  - Tonziegel: `brick_stairs` / `brick_slab` / `bricks` / `stone_brick_*` / `brick_wall`; erdig: `mud_brick_*` / `packed_mud`
  - Rustikal: `spruce_stairs` / `spruce_slab` / `spruce_planks` / `stripped_spruce_log` / `cobblestone_wall`
  - Hexenhaus: `dark_oak_stairs` + `mossy_cobblestone_stairs`-Flecken
  - Kirsche: `cherry_stairs` / `cherry_slab` / `cherry_planks` / `stripped_cherry_log`
  - Kupfer: `waxed_oxidized_cut_copper_stairs` / `waxed_oxidized_cut_copper_slab` / `waxed_oxidized_cut_copper` / `waxed_cut_copper_*` als Trim; First `waxed_copper_grate` oder `lightning_rod`
  - Bunt (Weihnachtsmarkt): Vollblock-Terrakotta oder -Beton als Stufendach plus Pflicht-Rand aus Stein- oder Holztreppen, da es keine Terrakotta-, Woll- oder Betontreppen gibt.

### Gaps
- Inhalt der Snow-Tags `cannot_support_snow_layer` / `support_override_snow_layer` für 1.21.11 nicht abrufbar (mcmeta-Pfad 404).
- Die Platzierungsregel für hängenden `pointed_dripstone` habe ich im Wiki nicht eindeutig gefunden. Die genaue Stützlogik von `lantern[hanging=true]` unter Kopfüber-Treppen ist nicht verifiziert.
- blockpalettes.com war gesperrt (HTTP 429). Erprobte Community-Paletten fehlen daher.
- Dass WorldEdit ungültigen Schnee entfernt, ist aus Code-Struktur und Vanilla-Verhalten abgeleitet, nicht in-game getestet.

## 7. Proportionsregeln: Dachhöhe, Dach-zu-Wand-Verhältnis, Überstand

### Takeaway
Wohngebäude: Dach etwa 1–2 Geschosse hoch (Geschoss = 4–5 Blöcke). Ab etwa 15×15 Grundfläche (bzw. für ein einfaches Satteldach ab etwa 12 Block Breite) teilt man das Dach in mehrere Abschnitte mit jeweils etwa 5–7 Block Anstieg. Ungerade Breiten ergeben spitze Firste, gerade Breiten einen 2 Block breiten First. Überstand 1 Block als Standard, 2 Blöcke für tiefe, schützende Dächer. Bei Monumentalbauten darf das Dach dominieren.

### Cited Findings
- „For inhabited buildings, a good guide is to make the roof between one and two stories tall.“ Beispiel: 20 breit bei 45° ergibt 10–11 Blöcke Dachhöhe = 2–2½ Geschosse bei 4–5 Block hohen Geschossen. Dann ein Dachgeschoss einbauen oder in 2–3 Abschnitte teilen, „so that the rise per section is around 5–7 blocks“. Alternativ 1 Block Brüstung + 1 Block Umgang → scheinbare Höhe 7. Bei Monumentalbauten (Kirchen) haben Ästhetik und Architektur Vorrang. — [minecraft.wiki Roof construction guidelines](https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines)
- „Once a building is larger than about 15×15 blocks, it will begin to look increasingly strange (or, at best, barnlike) if it continues to have a simple roof.“ Große Gebäude brauchen mehrere Dachabschnitte (z. B. Herrenhaus mit Flügeln). Höhere Seitenanbauten eher als Turm ausführen. — [minecraft.wiki Roof construction guidelines](https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines)
- Mansarddächer passen erst bei großen Gebäuden (≈16×20). Varianten wie Krüppelwalm sind bei kleinen Gebäuden kaum erkennbar. — [minecraft.wiki Roof types](https://minecraft.wiki/w/Tutorial:Roof_types)
- Steile Dächer wirken nach Cottage, Mittelalter und Fantasy, flache nach Moderne und Industrie. „On large roofs, step every two or three blocks for a shallower, calmer slope.“ — [Astroworld Guide](https://guide.astroworldmc.com/how-to-build-a-roof)
- Cottages und Mittelalterbauten wollen steile, überstehende Dächer, moderne Bauten flache. Alles Große profitiert von Abschnitten statt einer einzigen Fläche. — [buildingguide.app](https://buildingguide.app/minecraft-roof-designs)
- „Unterteilung“: an Gebäudeabschnitten das Dach 1 Block höher setzen. „Rand“ mit Zinnen hilft, wenn das Dach bei großen Gebäuden „aus den Fugen“ gerät. Ein normales Treppendach ist für größere Gebäude ungeeignet, weil die Höhenzunahme das Gebäude aus dem Gleichgewicht bringt. — [de.minecraft.wiki Anleitungen/Dach](https://de.minecraft.wiki/w/Anleitungen/Dach)
- Straßenzüge: Firsthöhen zwischen Häusern um 1–2 Blöcke variieren. Gleiche Spitzen wirken flach. — [CozyGameBuilds](https://cozygamebuilds.com/minecraft-roof-design-ideas/)

### Inferences
- **Faustformeln für den Generator** (B = Tiefe quer zum First inkl. Wände, o = Überstand, Wandhöhe hW ≈ 4–5 je Geschoss):
  - 45°-Satteldach: Dachhöhe ≈ (B+2o)/2 (Variante A) bzw. ≈ (B+2o)/2 − o (Variante B). Für B=7, o=1 → 4,5 bzw. 3,5 Blöcke ≈ 0,7–1 × eine Geschosshöhe. Das Dach wirkt so ähnlich groß wie die Wand eines einstöckigen Hauses („Dach als dominantes Element“ bei Weihnachtshäusern).
  - 63,4°: Höhe ≈ B+2o. Nur bis B≈7–9, sonst über 2 Geschosse.
  - Grenzwerte: Satteldach bis B≈12. Darüber Walm, Krüppelwalm, Abschnitte, Mansard (≥16) oder Profil-Wechsel (Gambrel). Kein Abschnitt mit mehr als 7 Blöcken Anstieg, außer bei Türmen oder Kirchen.
  - Ungerade B bevorzugen (spitzer First, mittige Tür, Kegel/Kuppel mit Spitze). Bei gerader B Firstkappe aus Stufen oder Pfosten.
  - Überstand: 1 Standard. 2 bei Chalet/Alpen-/Schneehaus (passt zu Weihnachten) und bei konkaven, „flared“ Traufen. Am Giebel denselben Überstand wie an der Traufe.
- Anbauten und Türme: Dachhöhe des Anbaus ≤ Hauptdach, mit eigener Kehle. Ein Turm ist mindestens 1 Geschoss höher als die Hauptfirsthöhe und bekommt eine eigene Spitze (Kegel/Pyramide/Helm).

### Gaps
- Kein harter, quellengestützter Zahlenwert für das ideale Verhältnis Dachhöhe : Wandhöhe. Die Aussage „Dach dominiert“ ist Community-Konsens bzw. abgeleitet. Reddit-, YouTube- und Planet-Minecraft-Diskussionen dazu waren nicht erreichbar.
