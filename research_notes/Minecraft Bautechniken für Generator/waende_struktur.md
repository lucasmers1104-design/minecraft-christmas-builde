# Wände, Fachwerk & Fassadenstruktur – Regeln für einen prozeduralen Hausgenerator (Minecraft Java 1.21.11, DataVersion 4671)

> Konventionen dieser Notizen
> - Block-IDs/States wurden gegen die 1.21.11-Blockdaten geprüft: [misode mcmeta 1.21.11 blocks/data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json).
> - "Cited Findings" = belegt (mit Quelle). "Inferences" = daraus abgeleitete Generatorregeln/Diagramme (eigene Synthese, im Spiel testen).
> - Blickrichtungs-Konvention für Fassaden: "rechts/links" = aus Sicht eines Betrachters, der draußen vor der Fassade steht. Südfassade: rechts = east, links = west. Nordfassade: rechts = west. Ostfassade: rechts = north. Westfassade: rechts = south. "innen" = Richtung von der Fassade ins Gebäude (Südfassade: innen = north).
> - Quellenqualität: minecraft.wiki-Tutorials und minecraft.net = am verlässlichsten (aber teils allgemein). Craftdex, Gamertag Mythras, Sereyka, Blockwerk, minecraftgradient.blog, BlockBlend, ByPixelbot, minecraft.how = neuere Builder-/Schematic-/SEO-Seiten mit konkreten Zahlen, aber Einzelmeinungen. Einige davon nennen bereits neuere Spielversionen (z. B. "Java 26.x"); die Techniken sind versionsunabhängig, Block-IDs wurden separat für 1.21.11 geprüft.
> - Nicht erreichbar: Reddit (HTTP 403 per curl; WebSearch lässt reddit.com nicht zu), planetminecraft.com (403), minecraftforum.net (Cloudflare-Block), forum.westeroscraft.com (Fehler 526). Zwei Aussagen aus diesen Quellen stammen nur aus Suchmaschinen-Zusammenfassungen und sind entsprechend markiert.

## 1. Rahmen/Umrisse: Ständer, Balken (axis), entrindete vs. Rinden-Stämme, Wood-Blöcke, Rahmen- vs. Füllmaterial, Abstände

### Takeaway
Standardregel der Builder: senkrechte Stämme (axis=y) an jeder Ecke und alle 3–5 Blöcke entlang der Wand, liegende Stämme (axis=x bzw. z) an jeder Geschosslinie (Schwelle/Rähm), Füllung in einem helleren/kontrastierenden Block – idealerweise 1 Block hinter der Rahmenebene. Ecken/Knoten mit `*_wood` (Rinde auf 6 Seiten) oder durchlaufendem Ständer lösen das Hirnholz-Problem.

### Cited Findings
- "Put vertical logs at every corner and every three to five blocks along the wall, lay sideways logs along each floor line, and fill the panels with a lighter block." Dunkler Rahmen über hellen Gefachen gibt den stärksten Kontrast: spruce/dark oak logs mit calcite, white terracotta, birch planks oder mud bricks; "Stripped logs make a softer frame" — [Sereyka: Minecraft Medieval House](https://sereyka.com/minecraft-medieval-house)
- Sereyka-FAQ: Ständer an Ecken und alle 3–5 Blöcke, liegende Stämme an Boden- und Deckenlinie, Füllung "one block back for extra depth" — [Sereyka](https://sereyka.com/minecraft-medieval-house)
- Konkreter Bauplan (11×11 Layer-Plan, Grundriss 9×7): Ständer aus dark oak logs "on every corner and in the middle of each side", oben durch liegende Stämme verbunden; Gefache mit calcite; "Always put the beams on the outer edge and the filling one block further in – that creates depth." Ebene 8 ist ein kompletter Ring aus 32 dark_oak_log (Rähm); Ebenen 6–7 je 8 Stämme (4 Ecken + 4 Seitenmitten) + 20 calcite + 4 Glas — [Blockwerk: Medieval Timber-Frame House](https://blockwerks.netlify.app/en/builds/medieval-timber-frame-house/)
- minecraft.wiki "Simple-framed Building": 4–5 Blöcke hohe Pfeiler im Rechteck, oben mit Balken verbunden, Lücken mit Planken füllen; "Logs and white stained clay (or wool) can be used instead to make a Tudor house." (white stained clay = heutiges `white_terracotta`) — [minecraft.wiki Tutorial:Construction](https://minecraft.wiki/w/Tutorial:Construction)
- Log-Blockzustand `axis`: x = Ost–West liegend, y = senkrecht, z = Nord–Süd liegend — [minecraft.wiki Log](https://minecraft.wiki/w/Log)
- 1.21.11-Daten: alle `*_log`, `stripped_*_log`, `*_wood`, `stripped_*_wood` (inkl. `pale_oak_*`, `cherry_*`, `mangrove_*`), `bamboo_block`, `quartz_pillar`, `bone_block`, `basalt` haben nur `axis: x|y|z` — [misode 1.21.11 data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- `*_wood` hat die Rinden-Textur des Stamms auf allen sechs Seiten — [minecraft.wiki Wood](https://minecraft.wiki/w/Wood)
- Entrindete Stämme: Ringe auf den Stirnseiten, Maserung an den Seiten; für Säulen/Pfeiler/Balkenkonstruktionen seien stripped logs besser ("rings give the ends a finished look"), stripped wood (6-seitig) sauberer für Flächen; Stamm neben entrindetem Stamm derselben Holzart erzeugt eine sichtbare "bark line" für Fenster-/Türrahmen, Stützen, Balkendecken — [1337wiki: Stripped logs](https://minecraft.1337wiki.com/stripped-logs/)
- Mehrere Holzarten mischen und Stamm/entrindeten Stamm zusätzlich zu Planken einsetzen erzeugt "really striking designs" — [TheGamer: 15 Quick Tips](https://www.thegamer.com/minecraft-build-tips-tricks-methods-detail-realistic/)
- Rahmen kontrastiert mit Wänden (Beispiel: dark oak vs. birch Rahmen) – Rahmenfarbe ist der zentrale Hebel einer Palette — [minecraft.wiki Tutorial:Color palette](https://minecraft.wiki/w/Tutorial:Color_palette)
- Palette-Gewichtung "60/30/10": Primär (Wand, 60 %), Sekundär (Rahmen/Dach, 30 %, z. B. Dark Oak/Deepslate), Akzent (10 %); 3–4 Kernmaterialien — [Craftdex: The Architecture of Builds](https://craftdex.net/articles/the-architecture-of-builds)
- 3–5 Blocktypen pro Bau: Primär (Wand), Sekundär (Trim, Rahmen, Ecken), Akzent; "Run vertical strips of a contrasting block (logs, a different stone) every few blocks" — [Gamertag Mythras: Building Tips](https://gamertagmythras.com/blog/minecraft/minecraft-building-tips)
- Reales Fachwerk (Fig. 1 der Wikipedia): Schwelle, Eckpfosten, Fenster-/Türpfosten, Zwischen-/Bundpfosten, wandhohe Streben, Riegel, Sturz; Rähm oben auf den Pfosten. Ständerbau (Pfosten von Schwelle bis Traufe durchgehend) vs. Stockwerkbau (jedes Geschoss als eigenes Modul) — [de.wikipedia Fachwerkhaus](https://de.wikipedia.org/wiki/Fachwerkhaus)
- Englisches "close studding": Ständer weniger als 60 cm auseinander, weitgehend ohne Riegel — [de.wikipedia Fachwerkhaus](https://de.wikipedia.org/wiki/Fachwerkhaus)
- Fachwerk-Hölzer haben real ca. 10×10 bis 18×18 cm Querschnitt — [de.wikipedia Fachwerkhaus](https://de.wikipedia.org/wiki/Fachwerkhaus)

### Inferences
- Begriffs-Mapping Generator: Ständer = `<holz>_log[axis=y]`; Schwelle (Unterkante Geschoss) und Rähm (Oberkante Geschoss) = `<holz>_log[axis=x]` an Nord/Süd-Fassaden bzw. `[axis=z]` an Ost/West-Fassaden; Riegel (optionaler Zwischenbalken, z. B. Brüstungshöhe) = wie Schwelle; Füllung = Gefach.
- Ständer-Raster als Formel: Fassadenbreite W (inkl. Eckständer) = 1 + Σ(p_i + 1), p_i = Gefachbreite. Zielbereich p ∈ {2,3,4}; p=1 nur für Tür-/Fensterständer-Paare oder bewusstes close studding. Für zentrierte Tür: ungerade Anzahl Gefache, symmetrisch, mittleres Gefach ungerade breit. Fertige Raster:

```
W   Ständer-x (0-basiert)     Gefache       Bemerkung
5   0,4                       [3]           Tür mittig x=2
7   0,2,4,6                   [1,1,1]       Tür x=3 zwischen Türständern (close-studding-Look)
7   0,3,6                     [2,2]         Mitte = Ständer -> Tür außermittig
9   0,3,5,8                   [2,1,2]       Tür x=4 zwischen Türständern
9   0,2,6,8                   [1,3,1]       mittleres Gefach 3 breit (Tür + 2 Füllung)
11  0,3,7,10                  [2,3,2]       Standard; Tür x=5
13  0,4,8,12                  [3,3,3]       Tür x=6
15  0,5,9,14                  [4,3,4]       ab hier >15: Flügel/2. Masse statt längerer Wand
Traufseite ohne Tür: beliebige gerade/ungerade Gefachzahl, p in 3..4 bevorzugt
```

- Hirnholz-Regel: Wo ein liegender Balken sichtbar endet (Gebäudeecke) zeigt `axis=x/z` die Jahresringe zur Seitenfassade. Optionen: (a) Eckständer `axis=y` läuft durch die Balkenlage (Ringe zeigen nur nach oben/unten – unsichtbar), (b) `<holz>_wood` an Kreuzungsknoten. Für "gezimmerte" Optik an vorstehenden Balkenköpfen (Auskragung) die Ringe dagegen bewusst zeigen (siehe Abschnitt 5).
- Material-Rollen: Rahmen = Rinden-Stamm (dunkler, rauer) oder entrindet (weicher, heller). Kombination "Ständer = Rinde, Riegel/Fensterrahmen = entrindet derselben Holzart" ergibt die "bark line" ohne neue Farbe.
- Kontrast-Paarungen für Rahmen/Füllung (1.21.11-IDs): `dark_oak_log`/`spruce_log` + `calcite` | `white_terracotta` | `birch_planks` | `mud_bricks` | `pale_oak_planks` (sehr hell, Familie mit stairs/slab/fence/trapdoor verfügbar); "weicher": `stripped_spruce_log` + `packed_mud` (Lehm-Optik, siehe Abschnitt 2).
- Weil reale Hölzer 10–18 cm stark sind, ein Minecraft-Block aber 1 m: Rahmen sparsamer als real (alle 3–5 statt <1 m) — sonst wirkt die Wand wie eine Holzwand. Ausnahme: absichtlicher close-studding-Look (Raster 0,2,4,6…).

### Gaps
- Kein direkt erreichbarer Builder-Beleg für "Knoten mit `*_wood` statt Log" als verbreitete Praxis; Regel ist abgeleitet aus der Texturdefinition (Wood = 6 Seiten Rinde).
- Reddit/YouTube-Builder (Grian, BlueNerd u. a.) nicht auswertbar (Zugriff blockiert, keine Transkripte).

## 2. Fachwerk/Tudor (half-timbering): Füllmaterialien, Diagonalstreben, Muster

### Takeaway
Belegte Füllungen: `calcite`, `white_terracotta`, `birch_planks`, `mud_bricks` (+ `white_concrete` sparsam als "Kalklinien"). Diagonalstreben werden mit Treppenstufen im Gefach oder treppenartig versetzten Stämmen angedeutet. Reale Muster (Mann, Andreaskreuz, Kopf-/Fußbänder ~45°) lassen sich auf 3×3-Gefache mit 1–4 Treppenstufen abbilden; wichtig ist, dass hinter jeder Stufe ein voller Block sitzt (sonst Lichtlücke).

### Cited Findings
- Pale Füllungen: "calcite, white terracotta, birch planks or mud bricks"; "a stair set into a panel can stand in for a diagonal brace" — [Sereyka](https://sereyka.com/minecraft-medieval-house)
- Blockwerk füllt mit `calcite` (80 Stück) zwischen `dark_oak_log`; "A few diagonal logs make the frame look even more real." — [Blockwerk](https://blockwerks.netlify.app/en/builds/medieval-timber-frame-house/)
- Tudor-Haus: Stämme + white stained clay (= white_terracotta) oder Wolle — [minecraft.wiki Tutorial:Construction](https://minecraft.wiki/w/Tutorial:Construction)
- "Whitewash"-Effekt: dünne Linien aus white concrete (oder Pulver) zwischen Holzblöcken – "One or two accent lines, not every other block." — [minecraft.how: Cozy Cottage](https://minecraft.how/blog/post/build-cottage-minecraft)
- Kontrastfarben wie white concrete oder terracotta lassen Abschnitte hervortreten — [Sportskeeda: 4 ways to add depth](https://www.sportskeeda.com/minecraft/4-best-ways-add-depth-minecraft-build)
- Gradient-Rezept für Fachwerk: "stripped dark oak -> spruce planks -> oak planks -> calcite -> white terracotta – Use wood for frames and lower supports, with lighter plaster panels in the center." — [minecraftgradient.blog: Wall Gradient](https://minecraftgradient.blog/minecraft-wall-gradient/)
- Real: Gefache gefüllt mit Flechtwerk + Lehmbewurf, Lehmwickel mit Kalk-/Lehmputz oder Ausmauerung (Backstein, Bruchstein, Lehmziegel), ggf. verputzt; Schmuck durch Strebenfiguren: Andreaskreuz, Doppelstrebe, "Mann" (Strebenkreuz-Variante, "Wilder Mann"), geschnitzte Knaggen (Konsolen); 45°-Hölzer zur Querstabilisierung heißen Bänder/Kopfbänder ("Bug") — [de.wikipedia Fachwerkhaus](https://de.wikipedia.org/wiki/Fachwerkhaus)
- Schweizer Riegelhaus: typisch rot bemalte Balken + weiße Ausfachung, Rechteckraster fast immer von Diagonalbalken durchzogen; Barock: Doppelständer bilden rhythmisierte Fensterachsen, Auskragungen werden reduziert; Technisches Fachwerk (19. Jh.): Rasterfachwerk mit zurückliegenden Sichtziegelgefachen — [de.wikipedia Fachwerkhaus](https://de.wikipedia.org/wiki/Fachwerkhaus)
- 1.21.11-Daten: `calcite`, `white_terracotta`, `white_concrete`, `packed_mud`, `mushroom_stem`, `bone_block`, `white_wool`, `quartz_bricks` haben KEINE stairs/slab-Varianten; mit voller Familie: `birch_*`, `pale_oak_*`, `cherry_*`, `mud_brick_stairs/_slab/_wall`, `smooth_quartz_stairs/_slab`, `polished_diorite_stairs/_slab`, `diorite_stairs/_slab/_wall`, `smooth_sandstone_stairs/_slab`, `resin_brick_stairs/_slab/_wall`, `tuff_brick_*` — [misode 1.21.11 data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Terracotta und Concrete haben keine Treppen/Stufen; Concrete wirkt glatt/"modern", Terracotta zeigt Farbe über Grundton (leicht dunkler) — [minecraft.wiki Tutorial:Best building materials](https://minecraft.wiki/w/Tutorial:Best_building_materials)
- `mushroom_stem` hat 6 Bool-States (`up/down/north/south/east/west`, Default alle `true` = Stamm-Textur); `false` = Poren-Textur. In Java wechseln Seiten, die einen gleichartigen Pilzblock berühren, die Textur — [minecraft.wiki Mushroom Block](https://minecraft.wiki/w/Mushroom_Block); [misode data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Treppen-States: `facing` = Richtung, in die die volle Rückseite zeigt; `half=top` = kopfüber; kopfüber- und normale Treppen verbinden sich nicht miteinander; Treppen formen sich bei seitlich angrenzenden Treppen zu inner/outer-Ecken um — [minecraft.wiki Stairs](https://minecraft.wiki/w/Stairs)
- Community-Faustregel (nur via Suchzusammenfassung, Thread nicht abrufbar – Fehler 526): Da Lehmfüllung nicht trägt, wurden schwere Überhänge gemieden; Überhänge > ca. 2 Blöcke seien in Minecraft "nicht tragfähig" darstellbar — [WesterosCraft Forum: Medieval German Half Timbered](https://forum.westeroscraft.com/threads/medieval-german-half-timbered-deutsches-fachwerk.3611/)

### Inferences
- Treppen als Dreiecks-"Pixel" im Gefach (Fassadenansicht, Treppe steht in der Rahmenebene, Füllblock direkt dahinter). Die Stufe zeigt ihr L-Profil nur, wenn `facing` parallel zur Wand liegt (rechts/links), nicht innen/außen:

```
Symbol  sichtbar fest        Blockstate
 ◣      unten-links          *_stairs[half=bottom, facing=<links>]
 ◢      unten-rechts         *_stairs[half=bottom, facing=<rechts>]
 ◤      oben-links           *_stairs[half=top,    facing=<links>]
 ◥      oben-rechts          *_stairs[half=top,    facing=<rechts>]
(Südfassade: rechts=east, links=west | Nord: rechts=west | Ost: rechts=north | West: rechts=south)
shape=straight; waterlogged=false
```

- Muster für ein 3×3-Gefach (L = Ständer, = = Schwelle/Rähm, # = Füllung, g = glass_pane, X = `<holz>_wood` oder Log):

```
Kopf-/Fußbänder        "Mann" (Mittelständer)   Andreaskreuz            Streben "/" (2-Zellen-Band)
L = = = L              L = = = L                L = = = L               L = = = L
L ◤ # ◥ L              L ◥ L ◤ L                L ◤ # ◥ L               L # # ◢ L
L # g # L              L # L # L                L # X # L               L # ◢ ◤ L
L ◣ # ◢ L              L ◢ L ◣ L                L ◣ # ◢ L               L ◢ ◤ # L
L = = = L              L = = = L                L = = = L               L = = = L
```
  (Kopf-/Fußbänder: festes Dreieck immer in der Ecke zwischen Ständer und Schwelle/Rähm. "Mann": Dreiecke am Mittelständer. Andreaskreuz: Dreiecke in den Gefachecken + Knotenblock in der Mitte. Strebe "/": Gefachzellen (a,b,c) × Reihen (1 = unten); pro Stufe k Zelle (a+k, 1+k) = ◢ und (a+k+1, 1+k) = ◤ (letztes ◤ entfällt, wo der Ständer steht) → 45°-Band mit Halbblock-Kanten, unten an Schwelle/linkem Ständer, oben an Rähm/rechtem Ständer angeschlossen; für "\" spiegeln (rechts↔links).)
- Kein Shape-Konflikt: In diesen Mustern grenzen gleich-halbe Treppen nie seitlich aneinander (◢ neben ◤ = verschiedene `half` → verbinden sich laut Wiki nicht), daher bleibt `shape=straight` stabil.
- Licht-/Sichtlücken vermeiden: Jede Treppe lässt ¼ Block offen. Entweder Rahmen + Streben in Ebene F−1 und Füllung in Ebene F dahinter (empfohlen, deckt sich mit "filling one block further in"), oder bei bündiger Füllung eine zweite (Innen-)Wandschicht hinter den Streben.
- Streben aus dem Rahmenholz (z. B. `spruce_stairs` bei `spruce_log`-Rahmen); Füllung kann dann ein Block ohne Treppenvariante sein (`calcite`, `white_terracotta`). Alternative "grobe" Strebe: treppenförmig versetzte `<holz>_log`/`_wood`-Blöcke (Blockwerk-Variante).
- `packed_mud` (beige) als "Lehmputz"-Füllung und `mushroom_stem[alle sechs = true]` als gebrochenes Weiß sind naheliegend (reale Lehm-/Kalkgefache), aber nicht durch Builder-Quellen belegt; bei `mushroom_stem` alle sechs Seiten explizit `true` setzen, damit benachbarte Stems keine Poren zeigen.
- Mustervergabe pro Geschoss: EG oft ohne Streben (Stein oder schlichte Gefache), OG mit Kopf-/Fußbändern an Eck- und Bundständern, Giebeldreieck mit Andreaskreuz/"Mann" in der Mitte; Fenstergefache nur Kopf-/Fußbänder (keine Strebe durchs Glas). Max. 1–2 Mustertypen pro Fassade (vgl. Abschnitt 3: "1−4 Möglichkeiten konsistent").
- Palettenvarianten (Ableitung aus Quellen oben): Tudor dunkel = `dark_oak_log` + `calcite`; deutsch/warm = `spruce_log` + `white_terracotta`/`packed_mud`; Schweizer Riegelhaus = rötliches Holz (`stripped_mangrove_log` oder `mangrove_log`) + `white_terracotta`/`calcite` (Farbanalogie, ungetestet).

### Gaps
- Keine erreichbare Quelle beschreibt explizit Fences oder Trapdoors als Diagonalstrebe; Reddit/YouTube-Tutorials (z. B. "Tudor House Tutorial"-Videos) konnten nicht ausgewertet werden.
- Keine Quelle für `smooth_quartz`, `mushroom_stem` oder `packed_mud` als Fachwerk-Füllung gefunden (nur Ableitung).
- Die WesterosCraft-"max 2 Blöcke Überhang"-Regel ist nur indirekt (Suchsnippet) belegt.

## 3. Tiefe und Schichtung: Einrücken, vorstehende Pfeiler, Stairs/Slabs/Trapdoors/Walls/Fences, "3-Layer-Regel", günstige Details

### Takeaway
Kernregel: Wand und Pfeiler nie in derselben Ebene – Rahmen/Pfeiler 1 Block vor die Füllung (oder Füllung 1 Block zurück). Darüber Mikro-Tiefe (Stairs/Slabs ½ Block, Trapdoors/Panes <½ Block). Eine Wand >5 Blöcke ohne Tiefensprung wirkt flach; 2–3 Schichten (Wand / Rahmen+Fensterrahmen / Kleinteile) sind die Faustregel.

### Cited Findings
- "The One-Block-In Rule: Never place your walls and your pillars on the same vertical plane. Pull your pillars out by 1 block from the wall surface." Mikro-Tiefe: Stairs/Slabs = 0,5 Block Trim; Trapdoors/Walls < 0,5 Block "lip"; Glasscheiben (Panes) sitzen mittig → 0,4375 Block (7 px) Rücksprung; mit vorgezogenem Rahmen ~1,5 Block Schattentiefe. "If your wall is more than 5 blocks wide and doesn't have at least one layer of depth, it will look flat from a distance." — [Craftdex](https://craftdex.net/articles/the-architecture-of-builds)
- "Place stripped spruce logs in front of the stone bricks to create more depth" (Pfeiler vor die Wand gesetzt); Trapdoors um die Pfeiler herum am 1. und 3. Block; Fenster: kopfüber Stone-Brick-Stairs (+ Mossy-Variante) oben und unten an der Fensteröffnung, Oak-Trapdoor; kopfüber Stair über der Tür — [ByPixelbot: Simple Medieval House](https://www.bypixelbot.com/blog/minecraft-medieval-house-step-by-step)
- Offizielles Minecraft-Magazin (Zusammenfassung eines Avomance-Tutorials): Tiefe durch Dachüberstände, Materialvariation, keine großen "flat areas": Glas-Panes statt Glasblöcke, Haustür in eine kleine Nische setzen, Gebäudesockel mit Stufen dekorieren; Details mit Zaunpfosten, Slabs, Buttons, Trapdoors — [minecraft.net: Make Your Houses Better](https://www.minecraft.net/en-us/article/make-your-houses-better)
- "Set windows one block back from the frame and hang trapdoors beside them as shutters"; Blumenkästen = Reihe dirt, vorne mit Trapdoors verkleidet, bepflanzt; Laternen unter der Traufe; etwas Ranken am Stein — [Sereyka](https://sereyka.com/minecraft-medieval-house)
- Wände über ein paar Blöcke Tiefe bauen "with beams sticking out across the front", oder Stairs, Walls, Slabs mischen — [TheGamer](https://www.thegamer.com/minecraft-build-tips-tricks-methods-detail-realistic/)
- Fenster leicht in die Wand setzen und mit Trapdoors, Stairs oder Fences rahmen; Erker/Vorbauten, Balkone, Vordächer; Obergeschoss-Erweiterung auf Pfeilern; mehrstufiges Dach mit unterschiedlichen Höhen — [Sportskeeda: 4 ways to add depth](https://www.sportskeeda.com/minecraft/4-best-ways-add-depth-minecraft-build)
- "Step the wall in and out. Recess a section by one block, or bump out a bay window"; "never leave a wall a single uninterrupted plane"; Pfeiler + 1-Block-Rücksprung "turns a flat box into something with bones" — [Gamertag Mythras](https://gamertagmythras.com/blog/minecraft/minecraft-building-tips)
- "Recess windows by one block, project the foundation, step the roof edge outward and use logs or stairs to frame the door." — [minecraftgradient.blog: House Design](https://minecraftgradient.blog/minecraft-house-design/)
- Zaunpfosten alle 4–6 Blöcke entlang der Wand als angedeutete Stützbalken — [minecraft.how](https://minecraft.how/blog/post/build-cottage-minecraft)
- Wiki-Wandstile: Plain wall nur, wenn der Rest detailliert ist; "Two tone" (dunkler unten, heller oben); "Separator" (Band in einer Höhe); "Flourish" (Knick in Bandgrenzen, bei 2–4 hohen Wänden 1 Block Versatz; bei hohen Wänden 1–2 Lagen oben/unten unberührt lassen); "3D texture" (Schilder, Buttons, Leitern, Stairs, Fences, Fence Gates, eingesetzte Slabs …); nicht alles auf jeder Wand; normalerweise 1–4 Möglichkeiten konsistent im ganzen Bau — [minecraft.wiki Tutorial:Walls and buttresses](https://minecraft.wiki/w/Tutorial:Walls_and_buttresses)
- Fenster: Tiefe ist entscheidend; Erkerfenster ("bay windows") oder Rahmen mit dahinterliegendem Glas; bei 1×2-Fenstern Holzblöcke/Trapdoors als Läden — [minecraft.wiki Tutorial:Adding beauty to constructions](https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions)
- Burg-Trim: auf der Oberkante jede zweite Position Block oder Stair — [minecraft.wiki Tutorial:Construction](https://minecraft.wiki/w/Tutorial:Construction)
- "3-Layer"-Regel (nur via Suchzusammenfassung; Seite selbst per Cloudflare blockiert): jede Struktur sollte mindestens 2–3 Schichten haben – hinten die Hauptwand, Mitte Fensterrahmen/Stützen, vorne Kleinteile wie Fences/Buttons; Ausnahmen für sehr große/sehr kleine Bauten — [Minecraft Forum: Depth in Building](https://www.minecraftforum.net/forums/minecraft-java-edition/creative-mode/369294-depth-in-building-a-simple-way-to-improve-all)
- Trapdoor-States: `facing` = Richtung, in die die Klappe aufschwingt = Gegenseite des Scharniers; `half` top/bottom; `open` — [minecraft.wiki Trapdoor](https://minecraft.wiki/w/Trapdoor)
- Fence: verbindet sich automatisch mit soliden Blöcken; Fences/Panes/Bars verbinden sich visuell mit der vollen Rückseite einer Treppe — [minecraft.wiki Fence](https://minecraft.wiki/w/Fence); [minecraft.wiki Stairs](https://minecraft.wiki/w/Stairs)
- Wall-Block: States `north/east/south/west = none|low|tall`, `up` (Mittelpfosten); verbindet sich nicht mit Fences (aber mit Fence Gates, Bars, Panes); ohne Mittelpfosten nur bei genau zwei gegenüberliegenden oder allen vier Verbindungen — [minecraft.wiki Wall](https://minecraft.wiki/w/Wall)
- 1.21.11: `chain` existiert nicht mehr als ID – heißt `iron_chain` (`axis`, `waterlogged`); `lantern` hat `hanging` — [misode 1.21.11 data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)

### Inferences
- Tiefenebenen relativ zur Füllebene F (Wandaußenfläche der Gefache), außen = negative Werte:

```
Ebene   Inhalt
F-2     Dachtraufe/Ortgang-Überstand (1 über Rahmen), ggf. Jetty-Ebene des OG (s. Abschn. 5)
F-1     Ständer, Schwelle/Rähm, Streben-Treppen, Sockel-Schürze, Fensterbänke (Stairs half=top),
        Fensterläden (Trapdoor open), Laternen, Blumenkästen
F       Füllung (calcite etc.), Türen
F+0,44  glass_pane (mittig im Block -> automatisch 7/16 zurück)
F+1     Innenraum
```

- Generator-Pflichtregeln: (1) Kein ununterbrochenes Wandfeld breiter als 5 (Ständerraster ≤4 Gefachbreite erfüllt das automatisch). (2) Kein Wandfeld höher als ~3–4 ohne horizontales Element (Schwelle/Rähm/Band). (3) Fenster nie bündig mit Rahmen: Panes in Ebene F. (4) Tür in Ebene F (Nische) mit kopfüber-Stair als Sturz über der Tür in F-1. (5) Max. 1–4 Detailtypen pro Fassade, wiederholt (Wiki-Regel).
- Blockstates für Standarddetails (Südfassade; für andere Fassaden Richtungen rotieren):
  - Fensterladen links/rechts neben dem Fenster (Luftblock in F-1, flach an der Wand): `spruce_trapdoor[facing=south, open=true, half=bottom]` (Scharnier an der Nordseite = Wand). Allgemein: `facing` = Außennormale der Fassade.
  - Fensterbank: `<stein/holz>_stairs[half=top, facing=north]` in F-1 direkt unter der Fensteröffnung (volle Rückseite zur Wand).
  - Sturz/Überdachung über Tür: `<x>_stairs[half=top, facing=north]` in F-1 über der Tür.
  - Pfeiler-Manschette (ByPixelbot): an einem frei vor der Wand stehenden Pfeiler auf Höhe 1 und 3 je Seite `*_trapdoor[open=true, facing=<weg vom Pfeiler>]`.
  - Blumenkasten: unter Fenster in F-1 `dirt`/`coarse_dirt`, davor (F-2) `*_trapdoor[open=true, facing=south]`, seitlich ebenso, Blume oben drauf.
  - Hängelaterne unter Traufe/Jetty: `lantern[hanging=true]` (ggf. `iron_chain[axis=y]` darüber).
  - Zaun-"Stütze" an der Wand: `spruce_fence[north=true]` (verbindet zur Wand im Norden), übrige Seiten `false`.
- Kosten/Nutzen (günstigste zuerst): Füllung 1 zurück (0 Zusatzblöcke) → Panes statt Glas → Treppen-Schürze am Sockel → Fensterbank/-sturz-Stairs → Trapdoor-Läden → Balkenring an Geschosslinie → Laternen/Blumenkästen → Erker/Vorbau (teuer, aber stärkster Silhouetteneffekt).
- Statt Rahmen vorziehen geht auch "Wand zurück": Für Generator einfacher, die Gebäudehülle (Rahmen) auf die Grundrisskante zu legen und alle Füllungen um 1 nach innen zu versetzen (Innenraum verliert 1 Block je Seite – bei Grundrissplanung berücksichtigen).

### Gaps
- Die oft zitierte "3-Layer-Regel" konnte nur über eine Suchzusammenfassung, nicht im Original geprüft werden; keine Primärquelle mit exakter Definition.
- Keine Builder-Quelle mit konkreten Prozentzahlen, wie viele Details pro Fassadenmeter "richtig" sind.

## 4. Fundament/Sockel: Steinsockel (1–3 hoch), Treppen-Schürze, Übergang Sockel–Wand, Hanglage

### Takeaway
Steinsockel 1–3 Blöcke unter Fachwerk/Holz (oder ein ganzes Stein-Erdgeschoss), mit eingemischten moosigen/rissigen Varianten; Basis mit Treppenstufen "einfassen" und den Sockel leicht vorziehen. Am Hang den Sockel bis zum Gelände hinunterziehen statt das Gelände zu planieren.

### Cited Findings
- "Give the house a plinth or a whole ground floor of cobblestone, stone bricks or andesite, with a few mossy or cracked bricks mixed in. One to three blocks is enough under a cottage. It reads as a real foundation, lifts the wood off the grass" — [Sereyka](https://sereyka.com/minecraft-medieval-house)
- Blockwerk: Stein-EG 9×7, Wände 3 hoch aus cobblestone; Layer 1–4 enthalten 111 `cobblestone` + 30 `mossy_cobblestone` (~21 % moosig) — [Blockwerk](https://blockwerks.netlify.app/en/builds/medieval-timber-frame-house/)
- ByPixelbot: Wände 3 hoch aus Mischung `stone_bricks`, `mossy_stone_bricks`, `cracked_stone_bricks`; Boden 1 Block eingegraben; in Reihe 4 ein Band aus smooth sandstone — [ByPixelbot](https://www.bypixelbot.com/blog/minecraft-medieval-house-step-by-step)
- "decorating the base of your house with steps to make it look less like a big ol' block on the landscape" — [minecraft.net: Make Your Houses Better](https://www.minecraft.net/en-us/article/make-your-houses-better)
- "a foundation that separates the building from the terrain" als eines der Erkennungssignale eines Hauses; "project the foundation"; dunklere Varianten an Basis, Ecken, geschützten Stellen — [minecraftgradient.blog: House Design](https://minecraftgradient.blog/minecraft-house-design/)
- "Your foundation should follow the landscape rather than fight it … Flatten only what you absolutely need … asymmetrical foundations look intentional"; Fundament aus stone, deepslate oder gravel — [minecraft.how](https://minecraft.how/blog/post/build-cottage-minecraft)
- Stützmauer-Typen (gravity, piling, cantilevered, anchored); Ha-ha (versenkte Mauer ½ Block unter Gelände); prächtigere Bauten: Wände unten dicker, oben dünner (tapered wall) — [minecraft.wiki Tutorial:Walls and buttresses](https://minecraft.wiki/w/Tutorial:Walls_and_buttresses)
- Beim Auffüllen Stein-Gradient nach unten dunkler/rauer (siehe Abschnitt 8) — [minecraftgradient.blog: Wall Gradient](https://minecraftgradient.blog/minecraft-wall-gradient/)

### Inferences
- Sockelhöhe nach Hausgröße: Hütte/Cottage 1; 2-geschossig 1–2; großes/städtisches Haus oder Hang: 2–3 bzw. ganzes Stein-EG (3–4 hoch). Sockel = Ebene F (bündig mit Füllung) oder F-1 (bündig mit Rahmen); vorgezogen = F-1 plus Schürze in F-2.
- Schnitt Sockel-Übergang (Südfassade, außen links):

```
          F-2  F-1  F    innen
y=3            L    #          EG-Fachwerk
y=2            L    #
y=1            =    =   (Schwelle, axis=x, liegt auf dem Sockel)
y=0       ^    S    S   ^ = cobblestone_stairs[half=bottom, facing=north] (Schürze/Stufe)
y=-1  ~~~~~~~~ S    S   ~ = Gelände; Sockel 1 Block ins Gelände einbinden
```

- Eckstücke der Schürze: Vanilla-Eckregel (aus Wiki-Beschreibung + Treppenlogik abgeleitet, im Spiel prüfen): SO-Ecke mit Südseite `facing=north` und Ostseite `facing=west` → Eckstufe `facing=north, shape=outer_left` (die Nachbarstufe zeigt nach `west` = gegen den Uhrzeigersinn von `north` → `outer_left`, sonst `outer_right`). Generator sollte die Vanilla-Shape-Berechnung nachbilden oder Ecken mit Vollblock/`*_wall` ausführen, weil das Spiel `shape` bei Nachbar-Updates neu berechnet.
- Übergang Sockel→Holz: immer ein liegender Balken (Schwelle) direkt auf dem Sockel; optional Wasserschlag = Stufenreihe `stone_brick_stairs[half=bottom, facing=<innen>]` auf einem vorgezogenen Sockel (F-1) unter einer zurückgesetzten Wand (F).
- Hang-Algorithmus: Sockeloberkante y_s = max(Geländehöhe unter Grundriss) + 1 (bzw. + gewünschte Sockelhöhe auf der Bergseite); pro Säule Sockelblöcke bis min. 1 unter lokale Geländehöhe; Schürze nur dort, wo das Gelände direkt vor dem Sockel liegt (jede Geländestufe bekommt eigene Stufe). Freiliegende Sockelhöhe >3 auf Talseite: Fenster/Kellertür oder Strebepfeiler (Abschnitt 7) einfügen, unterste 1–2 Lagen stärker moosig.

```
Hang-Ansicht (Gelände fällt nach rechts):
y=2   L # # # L # # # L
y=1   = = = = = = = = =        Schwelle
y=0   S S S S S S S S S        Sockeloberkante konstant
y=-1  ~ ~ S S S S S S S ^
y=-2  ~ ~ ~ ~ M S M S S S ^    M = mossy-Variante, häufiger nach unten
y=-3  ~ ~ ~ ~ ~ ~ ~ M S M S ^
```

### Gaps
- Keine erreichbare Builder-Quelle mit konkreten Blockregeln für Sockel am Hang (nur qualitative "follow the landscape"-Aussagen).
- Keine Quelle zu Sockel-Höhe in Abhängigkeit von Geschosszahl; obige Staffelung ist abgeleitet.

## 5. Obergeschosse: Auskragung (Jetty) mit Konsolen, Geschossbänder, Material pro Geschoss, Geschosshöhen

### Takeaway
Belegter Standard: Obergeschoss 1 Block über das EG auskragen lassen (meist an den Traufseiten), getragen von kopfüber-Treppen oder vorstehenden Balkenköpfen; Geschosslinien als durchlaufender Balkenring; EG aus Stein, OG aus Holz/Fachwerk. Geschosshöhe ~4–5 Blöcke (3–4 lichte Höhe + 1 Decke/Balken); Dach 1–2 Geschosse hoch.

### Cited Findings
- "Run the upper floor one block past the wall below on upside-down stairs or log ends – it breaks up a flat wall and makes even a small cottage look built rather than placed." — [Sereyka](https://sereyka.com/minecraft-medieval-house)
- Blockwerk: Decke aus dark oak planks auf Höhe 4, "It sticks out one block on the long sides – that's the overhang"; Ständer auf der Außenkante dieser Decke (Layer 5 = 81 Planken = 9×7 + 2×9 Überstand) — [Blockwerk](https://blockwerks.netlify.app/en/builds/medieval-timber-frame-house/)
- Medieval-Tutorials (nur via Suchzusammenfassung; minecraftforum.net blockiert): Jettying = zweites Geschoss nach außen schieben; Schritt "move out one block and up one block" für die OG-Basis; kopfüber Stairs unter der Traufe bzw. am oberen Wandrand als umlaufender Überstand — [Minecraft Forum: Medieval House Tutorial](https://www.minecraftforum.net/forums/minecraft-java-edition/creative-mode/365543-minecraft-medieval-house-tutorial); [Rillian's Advanced Medieval House Tutorial](https://www.minecraftforum.net/forums/show-your-creation/screenshots/1601499-rillians-advanced-medieval-house-tutorial-pic)
- Real: Jetty = Obergeschoss ragt über das darunterliegende hinaus (Kragträger); Jetty-Bressummer = horizontaler Balken über die ganze Fassadenbreite, auf dem die vorgezogene Wand steht, ruht auf den Köpfen der Jetty-Balken; an den Ecken diagonaler Gratstichbalken ("dragon beam") im 45°-Winkel; überkragende Eckpfosten oft mit geschwungenen Jetty-Konsolen ("brackets") verstärkt; Typen: auf vielen Balken, auf wenigen Balken, auf Konsolen an den Pfosten, "false jetty" auf verlängerten Pfosten; Zweck u. a. Raumgewinn, Wetterschutz der unteren Wand, Status — [Wikipedia: Jettying](https://en.wikipedia.org/wiki/Jettying)
- Real (DE): allseitig vorkragendes OG auf vorspringenden Balkenköpfen; diagonaler Eckstichbalken + Stichbalken; Knaggen (Konsolen) oft verziert; Barock: Auskragungen verringert/entfallen — [de.wikipedia Fachwerkhaus](https://de.wikipedia.org/wiki/Fachwerkhaus)
- Material pro Geschoss: "stone ground floors, wooden upper storeys and steep roofs"; Beispiel Spruce House 2: Stein-EG, Fichten-OG — [Sereyka](https://sereyka.com/minecraft-medieval-house); Blockwerk: Stein-EG + Fachwerk-OG, "light walls, dark wooden beams and a stone ground floor" — [Blockwerk](https://blockwerks.netlify.app/en/builds/medieval-timber-frame-house/)
- Real (Baskenland): Obergeschoss oft in Fachwerk, wenn das Geld für Mauerwerk ausging — [de.wikipedia Fachwerkhaus](https://de.wikipedia.org/wiki/Fachwerkhaus)
- Geschossbänder: liegende Stämme an jeder Geschosslinie — [Sereyka](https://sereyka.com/minecraft-medieval-house); kompletter Log-Ring als Rähm (Layer 8, 32 dark_oak_log) — [Blockwerk](https://blockwerks.netlify.app/en/builds/medieval-timber-frame-house/); Band aus smooth sandstone über 3 Lagen Steinmauer — [ByPixelbot](https://www.bypixelbot.com/blog/minecraft-medieval-house-step-by-step); "Separator"-Band und "Two tone" (dunkel unten, hell oben) — [minecraft.wiki Tutorial:Walls and buttresses](https://minecraft.wiki/w/Tutorial:Walls_and_buttresses)
- Höhen: "Assuming 4–5 block stories"; Dach für bewohnte Gebäude 1–2 Geschosse hoch — [minecraft.wiki Tutorial:Roof construction guidelines](https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines); Decken 3–4 hoch (2 = man kann nicht springen), optisch 4–5 für kleine Räume, mittelalterliches Wohnzimmer 5–6, Saal 10–12 — [minecraft.wiki Tutorial:Adding beauty to constructions](https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions); Cottage-Wände 4–5 hoch, Innenhöhe ~3 (2,5 mit Slab-Decke) — [minecraft.how](https://minecraft.how/blog/post/build-cottage-minecraft); Wandhöhe 5–7 bis Dachansatz — [minecraftgradient.blog: House Design](https://minecraftgradient.blog/minecraft-house-design/); Blockwerk: EG 3 Wand + 1 Decke, OG 2 Füllung + 1 Rähm, Dach ab Layer 9 — [Blockwerk](https://blockwerks.netlify.app/en/builds/medieval-timber-frame-house/)
- Stadthaus: meist 3 Geschosse, selten über 8×10; Landhaus 1–2 Geschosse bis ~20×15 — [minecraft.wiki Tutorial:Building a metropolis/Buildings](https://minecraft.wiki/w/Tutorial:Building_a_metropolis/Buildings)

### Inferences
- Schnitt durch eine auskragende Traufseite (Südfassade; außen links; Spalten = Tiefenebenen):

```
            c0   c1   c2        c0 = OG-Rahmenebene (1 vor EG)
y=9    ^    ^    ^              Dach-Stairs; Traufe 1 vor c0 (Ebene c-1)
y=8         =    #              OG-Rähm  [log axis=x]
y=7         L    #              OG: Rahmen c0, Füllung c1
y=6         L    #
y=5         L    #
y=4         =    =    =         Deckenbalken/OG-Schwelle bis c0 (Bressummer) [log axis=x]
y=3         v    L    #         v = <holz>_stairs[half=top, facing=north] unter jedem Ständer
y=2              L    #         EG: Rahmen c1, Füllung c2
y=1              L    #
y=0         ^    S    S         Sockel + Schürze
```

- Komplette Beispiel-Ansicht derselben Südfassade (W=11, Ständer x=0,3,7,10 nach Raster [2,3,2], Tür mittig; EG-Rahmen in c1, OG-Rahmen in c0, in der Ansicht überlagert):

```
x:      0  1  2  3  4  5  6  7  8  9  10
y=8     =  =  =  =  =  =  =  =  =  =  =    OG-Rähm spruce_log[axis=x]; darüber Traufe (Dach)
y=7     L  #  #  L  ◤  #  ◥  L  #  #  L    Kopfbänder: ◤=spruce_stairs[half=top,facing=west], ◥=[half=top,facing=east]
y=6     L  g  g  L  #  g  #  L  g  g  L    glass_pane in Füllebene; # = calcite
y=5     L  #  #  L  ◣  #  ◢  L  #  #  L    Fußbänder: ◣=[half=bottom,facing=west], ◢=[half=bottom,facing=east]
y=4     W  =  =  =  =  =  =  =  =  =  W    Deckenbalken/OG-Schwelle ragt 1 vor; W = spruce_wood an den Ecken
y=3     v  #  #  v  #  #  #  v  #  #  v    v = spruce_stairs[half=top,facing=north] vor den EG-Ständern
y=2     L  g  g  L  #  D  #  L  g  g  L    EG-Fenster 1 hoch
y=1     L  #  #  L  #  D  #  L  #  #  L    spruce_door mittig (x=5), half=lower/upper; facing=north ≙ von außen platziert (Türblatt an Südkante) – prüfen
y=0     ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^    cobblestone_stairs[half=bottom,facing=north] vor Sockel S; x=5 = Eingangsstufe
```
  (EG wahlweise komplett Stein statt Fachwerk: dann y=1–3 als Stein-Mix nach Abschnitt 8, Konsolen bleiben.)
- Konsolenvarianten (eine pro Haus wählen): (a) `*_stairs[half=top, facing=<innen>]` nur unter den Ständerpositionen (Knaggen-Look, sparsam); (b) durchgehende Reihe kopfüber-Stairs (Hohlkehle/Gesims-Look); (c) Balkenköpfe: unter der Auskragung in Ebene c0 an Ständerpositionen `<holz>_log[axis=z]` (bei Süd-/Nordfassade; Ringe zeigen nach außen = "log ends"), dazwischen Luft; (d) Ecke: zwei Stairs übers Eck mit `shape=outer_*` (Vanilla-Eckregel, Abschn. 4) als Eck-Knagge (Analogon zum "dragon beam"/Eckkonsole).
- Auskragung nur an Trauf-/Straßenseiten (wie Blockwerk) oder allseitig; je Geschoss max. +1; gesamt max. +2 über dem Sockel (deckt sich mit der Community-Grenze). Das Dach kragt zusätzlich 1 über die OG-Rahmenebene.
- Stockwerkbau-Logik: jedes Geschoss = [Schwelle 1] + [Wand 2–3] + [Rähm 1, kann zugleich Deckenbalken des nächsten sein]. Empfohlene Raster (Geschoss-zu-Geschoss): klein 4 (3 Wand + 1 Balken), normal 5 (4 + 1), EG darf 1 höher sein als OG. Wand-zu-Dach-Verhältnis: Dachhöhe ≈ 1–2 × Geschosshöhe; bei 45°-Satteldach ist Dachhöhe ≈ (Breite+1)/2 (Wiki-Beispiel: 20 breit → 10–11 hoch) → sobald die Dachhöhe > 2 Geschosse wird bzw. ab ~15×15 Grundfläche (Wiki) Dach teilen/Flügel/Dachgeschoss einplanen (Abschn. 6).
- Materialwechsel pro Geschoss: EG Stein (bzw. Sockel + Stein-EG), OG Fachwerk, Giebeldreieck Holz (Planken/Bretter, z. B. `spruce_planks` oder senkrechte `stripped_spruce_log`) – dunkel→hell nach oben oder umgekehrt Holz dunkel/Gefach hell; Geschossgrenze immer als Balkenband sichtbar machen.
- Auskragung zusätzlich als Licht-/Schattenkante nutzen: Laternen `lantern[hanging=true]` unter dem Bressummer zwischen den Konsolen.

### Gaps
- Kein abrufbarer Minecraft-Builder-Text mit expliziten Zahlen für Mehrfach-Auskragung (z. B. 3-geschossige Jetties); WesterosCraft/Minecraft-Forum-Threads blockiert.
- Keine Quelle für "typische Geschosshöhe" speziell bei Fachwerk in Minecraft jenseits der genannten Einzelbeispiele.

## 6. Gebäudeformen & Proportionen: L-/T-Formen, Flügel, Quergiebel, Erker, Asymmetrie, Verhältnisse, ungerade Breiten

### Takeaway
Keine einfache Box: 2–4 Quader-Massen (Hauptmasse + Nebenmassen von ⅓–½ Größe), L/T/Kreuz über Quergiebel; ab ~15×15 mehrere Dachabschnitte. Ungerade Breiten für mittige Tür/First (Wand-Segmente 5/7/9). Wohnhaus-Grundriss typisch 8×10 bis 13×11, Wandhöhe 4–7, Dach 1–2 Geschosse.

### Cited Findings
- Massing: Hauptmasse + Nebenmassen (Flügel, Balkone, Türme, Veranden), "Silhouette Test": 3–4 Quader unterschiedlicher Höhe/Breite; Nebenmassen ≈ 1/3–1/2 der Hauptmasse; Fokuspunkt ≥ 25 % höher/breiter als Umgebung, Detaildichte steigt zum Fokuspunkt (Eingang = "boss", Fenster = "minions") — [Craftdex](https://craftdex.net/articles/the-architecture-of-builds)
- "Rule of Odds": Wandsegmente ungerade (5, 7, 9); 5er-Wand = 3er-Fenster mit 1er-Pfeilern; ungerade Dachbreite (z. B. 11) endet in einem sauberen Firststein; gerade Breite → 2 Blöcke breiter flacher First — [Craftdex](https://craftdex.net/articles/the-architecture-of-builds)
- Ungerade Breite, wenn ein ungerades Mittelelement (Tür) unter der Spitze liegen soll; bei Doppeltür/geradem Mittelelement gerade Breite; Neigungen 63,4° (Doppelblöcke), 45° (Stufen), 22,5° (Slabs abwechselnd); Muster slab/kopfüber-stair/stair steigt 5 auf 7 — [minecraft.wiki Tutorial:Roof construction guidelines](https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines)
- Ab ca. 15×15 wirkt ein einfaches Dach "barnlike" → mehrere Dachabschnitte (z. B. Herrenhaus mit 2 Flügeln); Querfirst ergibt T- oder L-Form, auch Kreuz/H; Beispiel: Breite 20 bei 45° → Dachhöhe 10–11 = 2–2½ Geschosse → Dach teilen (Steigung je Abschnitt 5–7) oder Dachgeschoss ausbauen; Anbauten mit Wandhöhe 2/4/6 neben 4er-Hauptbau, bei 8 wird der Anbau zum Turm; Dächer vom höchsten zum niedrigsten bauen und verschneiden — [minecraft.wiki Tutorial:Roof construction guidelines](https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines)
- Grundriss Hauptraum 9–13 breit, 7–11 tief, Wände 5–7 bis Dach; L-Grundriss: öffentlicher Raum + Eingang im höheren Teil, niedrigerer Küchen-/Lager-/Werkstattflügel angehängt, Dach stuft sich ab; "A narrow house with an oversized roof can look top-heavy, while a wide box with a flat roof often feels unfinished"; erst ein Wand-Dach-Modul ("wall bay") testen, dann wiederholen — [minecraftgradient.blog: House Design](https://minecraftgradient.blog/minecraft-house-design/)
- Cottage: Hauptwohnraum ~8×10 bis 12×12; Rechtecke ok, L-Formen/unregelmäßige Umrisse "work beautifully"; Cottages "naturally asymmetrical"; Dach mit Höhenvariation, Schornstein 3–4 Blöcke durchs Dach — [minecraft.how](https://minecraft.how/blog/post/build-cottage-minecraft)
- "Avoid the perfect rectangle. An L-shape, a cross, an attached tower, or an offset wing"; "Go bigger than feels natural" (ein paar Blöcke mehr in jeder Dimension) — [Gamertag Mythras](https://gamertagmythras.com/blog/minecraft/minecraft-building-tips)
- Dach: Überstand ≥1, Giebel mit Logs oder Wandblock schließen, Gaube oder Schornstein, damit der First nicht eine lange Linie ist; Fenster 1 zurück — [Sereyka](https://sereyka.com/minecraft-medieval-house)
- Mehrstufiges Dach mit unterschiedlichen Höhen; OG-Erweiterung auf Pfeilern — [Sportskeeda](https://www.sportskeeda.com/minecraft/4-best-ways-add-depth-minecraft-build)
- Größenreferenzen: Stadthaus 3 Geschosse ≤8×10; Landhaus 1–2 Geschosse bis 20×15; Duplex ~14×14; modulare Häuser aus ~5×5-Modulen — [minecraft.wiki Tutorial:Building a metropolis/Buildings](https://minecraft.wiki/w/Tutorial:Building_a_metropolis/Buildings); Blockwerk-Fachwerkhaus 9×7 (+ Überstände 11×11) — [Blockwerk](https://blockwerks.netlify.app/en/builds/medieval-timber-frame-house/)
- Erker ("bay windows") als Mini-Raum mit vorgezogenem Glas — [minecraft.wiki Tutorial:Adding beauty to constructions](https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions)

### Inferences
- Generator-Massenregel: Hauptkörper B×T mit B ungerade (7…13), T = B−2…B+4; optional Nebenkörper (Flügel) mit Breite ≈ ½–⅔ B (ungerade), Länge ≈ ⅓–½ der Hauptlänge, Traufhöhe 1 Geschoss niedriger oder gleich, Firsthöhe stets niedriger als Hauptfirst (Dachverschnitt einfach, Hierarchie klar). L = Flügel an einem Ende, T = Flügel mittig (Quergiebel über dem Eingang), Kreuz = zwei Flügel gegenüber.
- Ungerade Breiten pro Masse, damit First und Tür zentriert liegen; gerade Breite nur bei Doppeltür. Ständerraster (Abschnitt 1) pro Masse separat; Querflügel-Giebel bekommt das prächtigste Fachwerkmuster (Fokuspunkt).
- Asymmetrie-Regeln: Haupteingang nicht in der Mitte der Gesamtfassade, sondern mittig im Fokus-Giebel; Schornstein außermittig; Fenster rhythmisch (gleiches Raster), aber Flügel in anderer Höhe. Zufall nur in Details (Textur, Blumen), nicht im Raster.
- Erker/"bay section": 1 Block tiefer Vorbau, Breite 3 oder 5 (ungerade), über 1–2 Geschosse, eigenes Mini-Dach (Pultdach/Slabs) oder vom Jetty überdacht; Unterseite mit Konsolen wie Jetty.
- Proportion Wand:Dach: Traufhöhe ≈ 1–2 Geschosse (4–9 Blöcke), Dachhöhe ≈ 0,5 × Breite bei 45° bzw. ≈ 1 × Breite bei 63°; bei Breite >13 und 45° → Dachhöhe ≥7 = über "1–2 Geschosse"-Regel → Mansarde/Dachgeschossfenster oder Teilung in Flügel.

### Gaps
- Die Craftdex-Zahlen (1/3–1/2, ≥25 %) sind Einzelmeinungen ohne Belege; ein Golden-Ratio-Ansatz wurde nur in Forensnippets gefunden (nicht verifiziert) und ist hier nicht übernommen.
- Keine Builder-Quelle mit festen Breite:Tiefe-Verhältnissen; nur Spannen aus Beispielbauten.

## 7. Strebepfeiler, Konsolen, Kopfbänder/Brackets unter Überständen, Eckbehandlung

### Takeaway
Belegte Typologie (Wiki): Strebepfeiler angled/setback/clasping/diagonal, Strebebogen; in Minecraft sind Konsole und Kragstein meist nicht unterscheidbar – Standardwerkzeug ist die kopfüber-Treppe. Ecken: Eckständer/-pfeiler, oft vorgezogen, mit Trapdoor-Manschetten.

### Cited Findings
- Strebepfeiler verhindern das Ausbauchen einer Wand; Typen an 2 Block dicker Wand: "angled", "setback", "clamped/clasping", "diagonal/French"; Strebebogen = Pfeiler mit Abstand + Bogen; "remedial buttress" (nachträglich); bei Dämmen/Stützmauern "counterfort" — [minecraft.wiki Tutorial:Walls and buttresses](https://minecraft.wiki/w/Tutorial:Walls_and_buttresses)
- "Console": ornamentale Konsole; "Corbel": eingebundene Steinkonsole; "In Minecraft, a console and a corbel will often be indistinguishable." Corbel-Bogen = Steine schrittweise auskragen lassen — [minecraft.wiki Tutorial:Architectural terms](https://minecraft.wiki/w/Tutorial:Architectural_terms)
- Kopfüber-Stairs als Hohlkehle ("coving") ab ca. 6–10 Blöcken Raumhöhe (innen) — [minecraft.wiki Tutorial:Walls and buttresses](https://minecraft.wiki/w/Tutorial:Walls_and_buttresses)
- Jetty-Ecken: Eckpfosten oft mit geschwungenen Konsolen verstärkt — [Wikipedia: Jettying](https://en.wikipedia.org/wiki/Jettying)
- Knaggen (Konsolen) und Kopfbänder (~45°) im Fachwerk — [de.wikipedia Fachwerkhaus](https://de.wikipedia.org/wiki/Fachwerkhaus)
- Kopfüber-Treppen tragen Auskragungen bzw. Log-Enden — [Sereyka](https://sereyka.com/minecraft-medieval-house)
- Trapdoors um Pfeiler am 1. und 3. Block; Pfeiler vor der Wand — [ByPixelbot](https://www.bypixelbot.com/blog/minecraft-medieval-house-step-by-step)
- Zaunpfosten alle 4–6 Blöcke als "support beams" — [minecraft.how](https://minecraft.how/blog/post/build-cottage-minecraft)
- Stair-Shape-Regeln (inner/outer corner, top/bottom verbinden nicht) — [minecraft.wiki Stairs](https://minecraft.wiki/w/Stairs)
- Mauer-Gradient: rauhste Blöcke "beside buttresses", unter Zinnen, an Ablauflinien konzentrieren — [minecraftgradient.blog: Wall Gradient](https://minecraftgradient.blog/minecraft-wall-gradient/)

### Inferences
- Strebepfeiler für Stein-EG/Sockel (nur bei Steinbauten oder freiliegendem Hangsockel ≥3 hoch, an Ständer-/Achspositionen, Abstand = Ständerraster 4–6):

```
Schnitt (außen links; W = Wand in Ebene F)
         F-2  F-1  F
y=3                W
y=2            s   W      s = stone_brick_stairs[half=bottom, facing=<innen>] (Abschrägung/Wasserschlag)
y=1       s    B   W      B = stone_bricks; Pfeiler 1 breit (in Fassadenrichtung)
y=0       B    B   W      unten 2 tief, darüber 1 tief = gestufter "setback"-Pfeiler
```
  Abdeckung oben alternativ `stone_brick_wall[up=true]` oder `*_slab[type=bottom]`.
- Konsolen-Bibliothek (alle in Ebene vor der Wand, unter dem auskragenden Bauteil):
  - Einfach: `<x>_stairs[half=top, facing=<innen>]`.
  - Zweistufig (größere Auskragung, z. B. Erker 1 tief über 2 Lagen): unten `<x>_stairs[half=top, facing=<innen>]` in F-1 auf Höhe h, darüber Vollblock in F-1 und `<x>_stairs[half=top, facing=<innen>]` in F-2 auf h+1 (Kragstein-Treppung).
  - Holz-Knagge: `<holz>_log` als Balkenkopf (axis senkrecht zur Fassade) + darunter kopfüber-Stair.
  - Leicht: `<holz>_fence` unter dem Überstand (verbindet zur Wand mit `<innen>=true`) bzw. `<holz>_trapdoor[half=top, open=false]` als dünne Leiste.
- Eckbehandlung: (1) Eckständer `axis=y` immer durchgehend bis Rähm; (2) bei Steinwänden Eckpfeiler 1 vorziehen (Ebene F-1 auf beiden Fassaden → 3-Block-L um die Ecke) oder Eck-`*_wall`-Säule; (3) Ecken als Ort der stärksten Verwitterung (mehr mossy/cracked); (4) Jetty-Ecke mit Eck-Konsole (`outer_*`-Stair); (5) Trapdoor-Manschetten (`open=true`, `facing` weg vom Pfeiler) auf Höhe 1 und 3 an freistehenden Eckpfeilern.

### Gaps
- Keine Minecraft-spezifische Quelle zu Abständen/Proportionen von Strebepfeilern an Wohnhäusern.
- Keine abrufbare Quelle zu Fence-/Trapdoor-Brackets unter Überständen mit genauen States (nur Mechanikbelege).

## 8. Texturvariation: Zufallsmischungen (Stone Bricks + cracked/mossy), Verwitterung zum Boden hin

### Takeaway
Gleiche Farbfamilie, unterschiedliche Oberfläche; Anteil Variante ~20–35 % (Hauptblock ≈ 50–60 %), in Clustern statt Streifen oder 50/50; Verwitterung (mossy, cracked, rauer, dunkler) nach unten, an Ecken, unter Vorsprüngen; oben ruhiger/heller.

### Cited Findings
- Texturtrick der Profis: ähnlich gefärbte Blöcke mischen (cobblestone, stone, stone bricks, andesite) — [minecraft.net: Make Your Houses Better](https://www.minecraft.net/en-us/article/make-your-houses-better)
- Wand statt nur cobblestone: andesite, stone bricks, mossy cobblestone mischen; bei Holzhäusern stripped oak logs, dark oak planks, spruce slabs; Gradienten dunkel→hell — [Sportskeeda](https://www.sportskeeda.com/minecraft/4-best-ways-add-depth-minecraft-build)
- Mischen "either randomly or in patches"; Ausmaß per Trial-and-Error, v. a. bei großen Bauten — [TheGamer](https://www.thegamer.com/minecraft-build-tips-tricks-methods-detail-realistic/)
- "A handful of texture blocks sprinkled into a wall reads as detail; an even 50/50 mix usually reads as a mess"; Gradienten mit steigenden Anteilen verzahnen, Blöcke ähnlicher Helligkeit wählen — [Gamertag Mythras](https://gamertagmythras.com/blog/minecraft/minecraft-building-tips)
- Wall-Gradient: dunkler/rauer/moosiger unten, sauberer oben ("Lower blocks collect mud, moss, impact damage and shadow"); Hauptblock ~½ der Fläche; Übergangsblöcke in Clustern statt horizontaler Streifen; Split 50/30/15/5; zuerst Form mit Hauptblock, dann 25–35 % ersetzen, stärkste Akzente nur an Stellen mit Gewicht/Schaden; Stone-Brick-Variante: ~60 % stone bricks, ~30 % cobblestone+tuff, ≤10 % cracked/mossy/deepslate; Rezepte z. B. `mossy_cobblestone → cobblestone → andesite → stone → stone_bricks` und `mossy_stone_bricks → cracked_stone_bricks → stone_bricks → tuff_bricks → deepslate_bricks` — [minecraftgradient.blog: Wall Gradient](https://minecraftgradient.blog/minecraft-wall-gradient/)
- Band-Rezepte (je Band 2–4 Blöcke hoch): Rustikal: Basis 40 % cobblestone/30 % mossy_cobblestone/20 % stone/10 % stone_bricks → Mitte 25/20/30/25 → oben 10/10/30/50; Ruine: Basis 45 % cobblestone/30 % cracked_stone_bricks/15 % mossy_stone_bricks/10 % stone_bricks → … → oben 5/15/20/60; 2–3 % seitlich gesetzte Stairs als "ausgebrochene" Kanten — [BlockBlend: Cobblestone Gradient](https://blockblend.app/guides/cobblestone-gradient-guide)
- Gealterte Optik durch beschädigte Varianten (stone bricks + cracked + cobblestone/gravel; mossy) – je rissiger, desto älter — [minecraft.wiki Tutorial:Adding beauty to constructions](https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions)
- Für Steinwände Varianten derselben Farbe statt nur stone bricks; Stonecutter-Varianten — [minecraft.wiki Tutorial:Best building materials](https://minecraft.wiki/w/Tutorial:Best_building_materials)
- Gradient = 3–4 Blöcke derselben Farbe, hell→dunkel angeordnet — [minecraft.wiki Tutorial:Color palette](https://minecraft.wiki/w/Tutorial:Color_palette)
- Holzwand unregelmäßig: z. B. 3 oak, 1 dark oak, 2 oak, 1 stone — [minecraft.how](https://minecraft.how/blog/post/build-cottage-minecraft)
- Blockwerk-Stein-EG: ~21 % mossy_cobblestone in cobblestone; ByPixelbot: stone_bricks + mossy_stone_bricks + cracked_stone_bricks gemischt — [Blockwerk](https://blockwerks.netlify.app/en/builds/medieval-timber-frame-house/); [ByPixelbot](https://www.bypixelbot.com/blog/minecraft-medieval-house-step-by-step)
- Familien in 1.21.11 mit passenden stairs/slab/wall (für Trims in derselben Mischung): stone_bricks, mossy_stone_bricks, cobblestone, mossy_cobblestone, cobbled_deepslate, deepslate_bricks/tiles, tuff_bricks, polished_tuff, andesite, blackstone u. a.; `cracked_stone_bricks` hat keine Treppen — [misode 1.21.11 data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)

### Inferences
- Generator-Formel Verwitterung: für jeden Wandblock in Höhe h über Gelände (h=0 unterste sichtbare Lage) und Hauptblock B: p_weather(h) = p0 · max(0, 1 − h/Hw) + p_min, mit p0 ≈ 0,35–0,45, Hw ≈ 3–4, p_min ≈ 0,05–0,10; Wahl der Variante gewichtet (z. B. mossy 60 % / cracked 40 % am Boden, darüber cracked > mossy). Zusätzlich +0,10 an Ecken, neben Strebepfeilern und direkt unter Vorsprüngen (Fensterbank, Jetty, Traufe), da die Quellen die dunkelsten/moosigsten Blöcke "under ledges", an Ecken und in "sheltered areas" verorten.
- Cluster statt Rauschen: Zufallsfeld mit geringer Frequenz (z. B. 2D-Value-Noise mit Zellgröße 2–3 Blöcke) über die Fassade legen und Schwellwert auf p_weather anwenden → Flecken statt Salz-und-Pfeffer und keine horizontalen Streifen.
- Gesamtanteile prüfen: Hauptblock ≥ 50 %, keine Einzelvariante > 30 %, stärkster Akzent ≤ 5–10 %; Treppen/Slabs/Wände der Trims aus derselben Variante wie der darunterliegende Block (z. B. `mossy_stone_brick_stairs` über mossy-Bereich), da `cracked_stone_bricks` keine Treppe hat → dort `stone_brick_stairs`.
- Holz-Fachwerk-Textur: Rahmen konstant (eine Holzart, ggf. stripped/bark-Wechsel nach Rolle), Füllung höchstens 5–10 % Variation (z. B. `calcite` mit vereinzelt `diorite`/`white_terracotta`) – Rahmen trägt die Struktur, Füllung soll ruhig bleiben (Ableitung aus "Upper blocks … calmer"/Hierarchie-Regeln).
- Begrünung als Verwitterungsabschluss: `vine` (States `north/east/south/west/up` – Seite = Wand, an der sie hängt) und `moss_carpet` nur auf den untersten 1–2 Lagen bzw. Sockel; sparsam.

### Gaps
- Prozentwerte stammen von zwei Gradient-Tool-Seiten (minecraftgradient.blog, BlockBlend) – Einzelquellen mit kommerziellem Hintergrund, nicht von bekannten Buildern verifiziert.
- blockpalettes.com nicht ausgewertet (keine Textdaten abgerufen); Reddit-Diskussionen zu Mischungsverhältnissen nicht zugänglich.
