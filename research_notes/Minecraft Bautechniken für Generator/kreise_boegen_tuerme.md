# Kreise, Bögen, Rundtürme & Burgelemente – Geometrie für einen prozeduralen Generator (Minecraft Java Edition 1.21.11, DataVersion 4671)

Hinweise zur Methode: Die Quellen sind die Generator-Quellcodes und -Seiten (donatj/Circle-Generator, pixelcircles.com), minecraft.wiki-Tutorials und Blockseiten, die Blockdaten von misode/mcmeta (Branch `1.21.11-summary`/`1.21.11-assets`) sowie eine Server-Neuimplementierung der Treppen-Logik (Pumpkin). Alle Tabellen mit dem Vermerk „berechnet“ habe ich selbst erzeugt: Ich habe den zitierten Algorithmus nachprogrammiert (Python) und die Ergebnisse gegen veröffentlichte Blockzahlen geprüft. Reddit (403/Crawler-Sperre), planetminecraft.com (403) und plotz.co.uk (Verbindungsabbruch) waren nicht erreichbar. Mehrere Treffer der Websuche waren SEO-Spamseiten und wurden nicht verwendet.

Koordinaten-Konvention in allen Diagrammen: Draufsicht mit Norden oben, x nach Osten (rechts), z nach Süden (unten). In Wandansichten zeigt die Ansicht von Süden auf eine West-Ost-Wand (x nach rechts, y nach oben). `#` = Vollblock, `.` = Luft.

---

## 1. Pixelkreise: welche Algorithmen „gute“ Kreise liefern, ungerade/gerade Durchmesser, dick/dünn/gefüllt, Zeilentabelle für D = 5–21

### Takeaway
Der De-facto-Standard der Builder ist das Kriterium „Blockmittelpunkt liegt im Kreis mit Radius D/2“ (donatstudios und pixelcircles rechnen identisch). Daraus entsteht der Umriss: „dünn“ (thin) ist der Rand nach dem 4er-Nachbarschaftstest und nur über Ecken verbunden. „Dick“ (thick) ist der Rand nach dem 8er-Nachbarschaftstest und über Flächen verbunden, also geschlossen für Zäune und Glasscheiben. Ungerade Durchmesser haben einen Mittelblock und eignen sich für 1 breite Türen und Fenster, gerade Durchmesser ein 2×2-Zentrum für 2 breite Öffnungen.

### Cited Findings
- **Exakter Algorithmus von donatstudios (Quellcode):** Für ein Raster W×H gilt pro Zelle (i,j): `x = -0.5*(W - 2*(i+0.5))`, `y = -0.5*(H - 2*(j+0.5))`, also die Koordinaten des Zellmittelpunkts relativ zur Mitte. `filled(x,y) = sqrt((y*ratio)^2 + x^2) <= W/2` mit `ratio = W/H`. Daraus folgt `thin = filled(x,y) && !(alle 4 Kantennachbarn filled)` und `thick = filled(x,y) && !(alle 8 Nachbarn inkl. Diagonalen filled)`. Der Default-Modus ist `thick`, „Force Circle“ (W=H) ist standardmäßig an. — [donatj/Circle-Generator, src/Generators/Circle.ts](https://github.com/donatj/Circle-Generator/blob/master/src/Generators/Circle.ts); [src/Math.ts](https://github.com/donatj/Circle-Generator/blob/master/src/Math.ts); [src/Controller.ts](https://github.com/donatj/Circle-Generator/blob/master/src/Controller.ts)
- Der Autor betont: Ein Radius von 128 ergibt einen Durchmesser von 255 statt 256, „because one of those blocks is the center“. Um ein 50×50-Gebäude einzukreisen, rechnet er mit Pythagoras (≈70,7 → 71) und rundet auf den geraden Wert 72, „to nicely wrap your 50 which is an even number“. Die Parität des umschlossenen Objekts soll also zur Parität des Kreises passen. — [donatstudios.com/PixelCircleGenerator (Kommentare von Jesse G. Donat)](https://donatstudios.com/PixelCircleGenerator)
- pixelcircles.com: „This Minecraft circle generator places a block when the centre of that block is inside the circle, which keeps every size symmetric in all four directions.“ Es gibt die Stile Thin, Thick und Filled: „Thin uses the fewest blocks. Thick closes the corner steps so fences and glass panes join up. Filled gives a solid disc.“ Veröffentlichte Blockzahlen (dünn/dick/gefüllt): D5 12/16/21, D7 16/24/37, D9 24/32/69, D11 28/40/97, D15 40/56/177, D21 56/80/349, D31 84/120/749, D41 112/160/1313, D61 172/240/2933. — [pixelcircles.com](https://pixelcircles.com/)
- pixelcircles zur Parität: „Odd diameters have one centre block, which suits a beacon, a fountain spout or a 1-wide door on each side. Even diameters have a 2 × 2 centre and suit 2-wide doors and double staircases.“ Außerdem: „Below about 7 blocks a circle looks more like a rounded square.“ Bauempfehlung: Zuerst die Mitte markieren, dann die vier äußersten Achsblöcke setzen, dann einen Quadranten bauen und spiegeln. — [pixelcircles.com](https://pixelcircles.com/)
- pixelcircles zu Abweichungen zwischen Generatoren: „Generators use different rounding rules.“ — [pixelcircles.com](https://pixelcircles.com/)
- Der Mittelpunkt-/Bresenham-Kreisalgorithmus nähert `x²+y²=r²` für einen **ganzzahligen Radius r** um den Mittelpunkt (0,0) an. Er berechnet nur ein Oktant und spiegelt es siebenmal. Integer-Variante: `x,y,p = r,0,1-r; while x>=y: plot; x -= (p>0); y += 1; p += (1-2x+2y if p>0 else 1+2y)`. — [Wikipedia: Midpoint circle algorithm](https://en.wikipedia.org/wiki/Midpoint_circle_algorithm)
- minecraft.wiki empfiehlt für Kreise donatstudios, champbop und pixelcircles.com, für Kugeln oranj.io („includes some hints on stair use“) und für weitere Formen plotz.co.uk. Zitat: „each size uses a completely different arrangement of blocks“. Die Diagramme dort zeigen Viertelkreise, die an den Kanten gespiegelt werden. Bei ungeraden Durchmessern wird an der Mitte der ersten Blockreihe gespiegelt. — [minecraft.wiki: Tutorial:Creating shapes](https://minecraft.wiki/w/Tutorial:Creating_shapes)
- minecraft.wiki gibt für schräge Linien eine Lauflängen-Formel an: Stufenfolge `Round[n/m] - Round[(n-1)/m]` für die Steigung m ≤ 1, bei m > 1 vertikal mit 1/m. Beispiele: 1/2 → „2,2,2…“, 2/3 → „1,2,…“, 3/5 → „1,2,2,…“. — [minecraft.wiki: Tutorial:Creating shapes](https://minecraft.wiki/w/Tutorial:Creating_shapes)
- champbop (Plus-Zeichen-Methode für Handbau): Ungerade Durchmesser verwenden, z. B. D=19 mit „8 blocks on each side“ der Mitte. Zuerst das Plus aus vier Achsen bauen, dann die geraden Läufe an den Achsenden setzen (je nach Größe 3–7 Blöcke) und dann die Diagonalen auffüllen. — [champbop.com: How to make a circle in Minecraft](https://champbop.com/minecraft/how-to-make-a-circle-in-minecraft/)

### Inferences
**(a) Formel für den Generator (Referenzimplementierung, identisch zu donatstudios/pixelcircles):**
```
c = (D-1)/2                                   # Mittelpunkt in Blockkoordinaten (halbzahlig bei geradem D)
inside(i,j) = (i-c)^2 + (j-c)^2 <= (D/2)^2    # Blockmittelpunkt im Kreis
filled = {(i,j) | inside(i,j)}
thin   = {p in filled | nicht alle 4 Kantennachbarn in filled}    # 8-zusammenhängend, wenige Blöcke
thick  = {p in filled | nicht alle 8 Nachbarn in filled}          # 4-zusammenhängend, "dicht"
Ellipse W×H: inside(i,j) = ((i-cx)/(W/2))^2 + ((j-cz)/(H/2))^2 <= 1   (äquivalent zu donatj ratio=W/H)
```
- Meine Nachimplementierung trifft **alle** von pixelcircles veröffentlichten Blockzahlen exakt (D5, 7, 9, 11, 15, 21). Beide Seiten nutzen also dasselbe Kriterium.
- **Vergleich mit Mittelpunkt/Bresenham (berechnet):** Der Algorithmus funktioniert nur für ungerade D = 2r+1. Für r = 2, 3, 5, 7 und 10 (D = 5, 7, 11, 15, 21) liefert er exakt den „thin“-Ring. Für r = 4, 6, 8 und 9 (D = 9, 13, 17, 19) weicht er um einige Blöcke ab: Bei D=13 hat Bresenham 32 Blöcke statt 36, bei D=17 sind es 44 statt 48, bei D=9 und D=19 liegen die Diagonalblöcke an anderen Stellen. Da Builder-Charts dem Mittelpunkt-im-Kreis-Kriterium folgen, sollte der Generator dieses verwenden und **kein** Bresenham.
- Die Varianten „r ± 0,5“ und „Abstandsband“ sind für ungerade D gleichwertig zu `dist ≤ r + 0,5` mit ganzzahligem r = (D−1)/2. Das ist genau das obige Kriterium, denn D/2 = r + 0,5.
- **Ringe mit Dicke t (Turmmauer):** `ring_t = filled(D) \ filled(D−2t)`, konzentrisch bei gleicher Parität. Für t=1 entspricht das nicht immer `thin`: Bei D=15 und D=21 kommt dasselbe heraus, bei D=9 dagegen die thick-Zahl 32. Für Mauern lieber direkt `thin`/`thick` des äußeren Kreises nehmen und für t ≥ 2 die Differenzmethode verwenden (berechnet für D=11, t=2: 60 Blöcke, lückenlos).

**(b) Tabelle D = 5–21 (berechnet mit dem donatj-Algorithmus).**
„Zeilenbreiten“ = Breite des gefüllten Kreises je Zeile, von der obersten Zeile bis zur Mittelzeile; die untere Hälfte ist gespiegelt. Daraus lässt sich jeder Stil rekonstruieren. „Viertelbogen-Segmente (dünn)“ = Lauflängen entlang des Viertelbogens von der Nordachse zur Ostachse. Oberhalb der 45°-Diagonale sind es waagerechte Läufe, unterhalb senkrechte. Bei ungeradem D zählt der Achsblock im ersten und letzten Wert mit.

| D | Zeilenbreiten oben→Mitte | Viertelbogen-Segmente (dünn) | dünn | dick | gefüllt |
|---|---|---|---|---|---|
| 5 | 3,5,5 | 2,2 | 12 | 16 | 21 |
| 6 | 4,6,6 | 2,2 | 16 | 20 | 32 |
| 7 | 3,5,7,7 | 2,1,2 | 16 | 24 | 37 |
| 8 | 4,6,8,8 | 2,1,2 | 20 | 28 | 52 |
| 9 | 5,7,9,9,9 | 3,1,3 | 24 | 32 | 69 |
| 10 | 4,8,8,10,10 | 2,2,1,2 | 28 | 36 | 80 |
| 11 | 5,7,9,11,11,11 | 3,1,1,3 | 28 | 40 | 97 |
| 12 | 4,8,10,10,12,12 | 2,2,2,2 | 32 | 44 | 112 |
| 13 | 5,9,11,11,13,13,13 | 3,2,2,3 | 36 | 48 | 137 |
| 14 | 6,8,10,12,14,14,14 | 3,1,1,1,3 | 36 | 52 | 156 |
| 15 | 5,9,11,13,13,15,15,15 | 3,2,1,2,3 | 40 | 56 | 177 |
| 16 | 6,10,12,14,14,16,16,16 | 3,2,1,2,3 | 44 | 60 | 208 |
| 17 | 5,9,13,13,15,15,17,17,17 | 3,2,2,1,2,3 | 48 | 64 | 225 |
| 18 | 6,10,12,14,16,16,18,18,18 | 3,2,1,1,2,3 | 48 | 68 | 256 |
| 19 | 7,11,13,15,17,17,19,19,19,19 | 4,2,1,1,2,4 | 52 | 72 | 293 |
| 20 | 6,10,14,16,16,18,18,20,20,20 | 3,2,2,2,2,3 | 56 | 76 | 316 |
| 21 | 7,11,13,15,17,19,19,21,21,21,21 | 4,2,1,1,1,2,4 | 56 | 80 | 349 |

Die Länge der geraden Achsstrecke, also der Platz für Tür oder Fenster, entspricht der ersten Zeilenbreite:
- ungerade D 5–7: 3 Blöcke; ungerade D 9–17: 5; D 19 und 21: 7
- gerade D 6–12: 4 Blöcke; gerade D 14–20: 6

**(c) Beispiele (berechnet):**
```
D=7 dünn        D=9 dünn          D=13 dünn
..###..         ..#####..         ....#####....
.#...#.         .#.....#.         ..##.....##..
#.....#         #.......#         .#.........#.
#.....#         #.......#         .#.........#.
#.....#         #.......#         #...........#
.#...#.         #.......#         #...........#
..###..         #.......#         #...........#
                .#.....#.         #...........#
                ..#####..         #...........#
                                  .#.........#.
                                  .#.........#.
                                  ..##.....##..
                                  ....#####....
D=15 dünn            D=15 dick
.....#####.....      .....#####.....
...##.....##...      ...###...###...
..#.........#..      ..##.......##..
.#...........#.      .##.........##.
.#...........#.      .#...........#.
#.............#      ##...........##
#.............#      #.............#
#.............#      #.............#
#.............#      #.............#
#.............#      ##...........##
.#...........#.      .#...........#.
.#...........#.      .##.........##.
..#.........#..      ..##.......##..
...##.....##...      ...###...###...
.....#####.....      .....#####.....
```
- Empfehlung für den Generator: Für sichtbare Turmmauern genügt **dünn** (wenig Material, klassischer Look). **Dick** oder 2 Blöcke starke Ringe verwenden, wenn Zäune, Glasscheiben, Eisengitter oder Mauern (wall-Blöcke) im Ring verlaufen, Treppen auf dem Ring Ecken bilden sollen oder die Mauer massiv wirken soll.

### Gaps
- Die Quellcodes von plotz.co.uk und minecraftshapes.com waren nicht einsehbar (plotz: Verbindungsabbruch; minecraftshapes lieferte nur eine Startseite, Algorithmus nicht dokumentiert). Ob plotz dasselbe Kriterium nutzt, ist offen. pixelcircles sagt nur allgemein, dass Generatoren unterschiedlich runden.
- Es gibt keine Quelle dafür, welche Variante Builder ästhetisch „besser“ finden. Belegt ist nur die faktische Verbreitung (donatstudios seit 2012, minecraft.wiki verlinkt sie, pixelcircles rechnet identisch).

---

## 2. Ellipsen, Kugeln, Kuppeln (Radius pro Schicht), Kegel/Spitzhelme, Zwiebelkuppeln

### Takeaway
Kugel und Kuppel: Pro Schicht y gilt Mittelpunkt-im-Kreis mit `x²+z² ≤ R² − y²` (Blockmittelpunkte, R = D/2). Die Hohlschale besteht aus allen Kugelblöcken mit mindestens einem leeren Flächennachbarn (6er-Test); damit stimmen die pixelcircles-Zahlen exakt. Kegel: lineare Radiusabnahme `r_i = (D/2)·(1 − i/(H−1))` (berechnet, gefüllte Zahl exakt reproduziert). Die Kuppel schrumpft unten langsam und oben schnell, der Kegel gleichmäßig. Zwiebelkuppeln sind in den Quellen nicht dokumentiert; ein Profilvorschlag steht unter „Inferences“.

### Cited Findings
- **Kuppel:** „A dome is a stack of shrinking circles… The rings shrink slowly near the base and quickly near the top. That is what makes a dome look round and not like a cone, so copy each layer exactly rather than stepping in by one block every time.“ Dome-Höhe = „Half its diameter, rounded up. A dome with a 31-block base is 16 layers tall.“ Für eine Kuppel auf einem Rundturm soll derselbe Durchmesser wie der Turm gewählt werden. — [pixelcircles.com/dome-generator](https://pixelcircles.com/dome-generator/)
- Kuppel auf quadratischen Mauern: „give it the same diameter as the length of a wall. The base ring touches the middle of each wall, and the four corners can be closed with a flat roof or with stairs.“ Für ein flacheres Dach sollen nur die ersten Schichten einer größeren Kuppel gebaut und mit einer flachen Kappe geschlossen werden. Stretch-Option: „a height of a quarter of the width gives a low saucer roof“. Streifen: alle 2–3 Schichten den Block wechseln. „For a smooth outline… place stairs on the outer steps after the dome is finished.“ Materialvorschläge: Glas, Kupfer (patiniert grün), Quarz bzw. weißer Beton. — [pixelcircles.com/dome-generator](https://pixelcircles.com/dome-generator/)
- **Kugel-/Kuppel-Blockzahlen (Auszug):** D5: hohl 54, massiv 81, Kuppel 3 Schichten/33 Blöcke. D7: 98/179, Kuppel 4/57. D9: 186/389, 5/105. D11: 278/739, 6/153. D13: 414/1189, 7/225. D15: 530/1791, 8/285. D17: 690/2553, 9/369. D19: 894/3695, 10/473. D21: 1082/4945, 11/569. Bei geradem D hat die Kuppel D/2 Schichten (z. B. D16: 8 Schichten/316). — [pixelcircles.com/sphere-chart](https://pixelcircles.com/sphere-chart/)
- **Kegel:** „A cone roof is a stack of circles that shrink by the same amount on every layer, from the full width of the tower at the base to a single block at the tip, or 2 × 2 on even sizes.“ Höhe: „A roof as tall as the tower is wide gives the classic wizard-tower spire; half that height gives a squat roof… Past about twice the width the roof turns into a needle, which suits a church spire.“ Hohlkegel-Abdichtung: „where a ring steps in by more than one block, the ring below it gets wider, so the roof stays sealed.“ Blockzahl: D15/H15 hohl 302, mit 1 Block Überstand 365, massiv 919. Spitze: „Top it with a lightning rod, an end rod or a flag“. Ungerade D enden in einem Einzelblock, gerade in 2×2 („room for a flagpole“). — [pixelcircles.com/cone-generator](https://pixelcircles.com/cone-generator/)
- minecraft.wiki zum Kegel: „Start with a circular base and decrease the size of the circle as you go up. To create a concave or narrowing cone, increase the height of each layer as you rise. For a convex cone, start with thicker layers and decrease the height of each layer.“ — [minecraft.wiki: Tutorial:Creating shapes](https://minecraft.wiki/w/Tutorial:Creating_shapes)
- Dachneigungen: „it is easy to get a roof pitch with an angle of 63.4°, 45° or 22.5° – just use double blocks for 63.4°, steps for 45° and alternate upper and lower slabs for 22.5°.“ Für andere Neigungen sollen sich wiederholende Muster aus 2–3 Elementen verwendet werden, z. B. „slab, upside down stair, stair, slab, upside down stair, stair, rises five blocks vertically for every seven horizontally“. — [minecraft.wiki: Tutorial:Roof construction guidelines](https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines)
- oranj.io hat seinen Voxel-Generator 2012 um „cones and domes“ und später um Bezier-Kurven für eigene Profile erweitert, also um Rotationskörper aus beliebigen Kurven. — [oranj.io: Voxel Shape Generator](https://oranj.io/blog/VoxelSphereGenerator)
- Ellipse/Oval: donatj berechnet Ovale mit `ratio = W/H` in derselben Distanzfunktion (siehe Abschnitt 1). — [donatj Circle.ts](https://github.com/donatj/Circle-Generator/blob/master/src/Generators/Circle.ts)

### Inferences
**(a) Kugel/Kuppel – exakte Formel (berechnet; reproduziert die pixelcircles-Zahlen für D = 5, 7, 9, 15 und 21 exakt):**
```
R = D/2 ; c = (D-1)/2
solid  = {(i,j,k) | (i-c)^2 + (j-c)^2 + (k-c)^2 <= R^2}
hollow = {p in solid | mindestens einer der 6 Flächennachbarn nicht in solid}
dome   = {p in hollow | j >= c}        # bei ungeradem D inkl. Äquatorschicht
Ellipsoid/flache Kuppel: ((x/a)^2 + (y/b)^2 + (z/c)^2 <= 1) mit a=W/2, b=Höhe, c=T/2 (analog donatj-ratio)
```
Ein 18er- oder 26er-Nachbarschaftstest liefert deutlich mehr Blöcke (D15: 770 bzw. 890 statt 530) und entspricht nicht dem Builder-Standard.

**(b) Schichtbreiten der Kuppel (Breite der gefüllten Schicht von der Äquatorschicht aufwärts; berechnet):**

| D | Breiten je Schicht (unten → oben) |
|---|---|
| 5 | 5, 5, 3 |
| 7 | 7, 7, 5, 3 |
| 9 | 9, 9, 9, 7, 5 |
| 11 | 11, 11, 11, 9, 7, 5 |
| 13 | 13, 13, 13, 11, 11, 9, 5 |
| 15 | 15, 15, 15, 13, 13, 11, 9, 5 |
| 17 | 17, 17, 17, 15, 15, 13, 13, 9, 5 |
| 19 | 19, 19, 19, 19, 17, 17, 15, 13, 11, 7 |
| 21 | 21, 21, 21, 21, 19, 19, 17, 15, 13, 11, 7 |
| 25 | 25, 25, 25, 25, 23, 23, 21, 21, 19, 17, 15, 11, 7 |
| 31 | 31, 31, 31, 31, 29, 29, 29, 27, 27, 25, 23, 21, 19, 17, 13, 7 |
| 8 | 8, 8, 6, 4 |
| 12 | 12, 12, 10, 10, 8, 4 |
| 16 | 16, 16, 16, 14, 14, 12, 10, 6 |
| 20 | 20, 20, 20, 18, 18, 16, 16, 14, 10, 6 |

Wichtig: Jede Schicht ist der Kreis `x²+z² ≤ R²−y²` mit **nicht-halbzahligem** Radius. Sie ist also *nicht* identisch mit dem Standardkreis (Abschnitt 1) gleicher Breite. Der Generator muss die 3D-Formel direkt auswerten.

**(c) Kegel/Spitzhelm (berechnet):** `r_i = (D/2)·(1 − i/(H−1))` für i = 0…H−1, Mindestradius 0,5 (ungerade D → 1 Block) bzw. 0,71 (gerade D → 2×2). Jede Schicht ist `{(x,z) | (x−c)²+(z−c)² ≤ r_i²}`. Das ergibt für D15/H15 massiv **genau 919** (pixelcircles-Wert). Hohl ergibt meine einfache Variante (4er-Rand jeder Schicht ∪ von oben sichtbare Zellen) 290 statt 302. Die exakte pixelcircles-Abdichtungsregel konnte ich nicht reproduzieren (siehe Gaps).
Schichtbreiten (berechnet):
- D7/H7: 7,5,5,3,3,1,1
- D9/H9: 9,7,7,5,5,3,3,1,1
- D9/H14: 9,9,7,7,7,5,5,5,3,3,3,1,1,1
- D11/H11: 11,9,9,7,7,5,5,3,3,1,1
- D11/H22: 11,11,9,9,9,9,7,7,7,7,5,5,5,5,3,3,3,3,1,1,1,1
- D13/H13: 13,11,11,9,9,7,7,5,5,3,3,1,1
- D15/H15: 15,13,13,11,11,9,9,7,7,5,5,3,3,1,1

Überstand: Kegel mit D_Dach = D_Turm + 2 (gleiche Parität, bleibt zentriert) direkt auf die Mauerkrone setzen.
- Neigung: 1 Block Einzug pro Schicht entspricht 45°, ideal für Treppen. 1 Block pro 2 Schichten entspricht ≈ 63,4° (steiler Turmhelm). 2 Blöcke pro Schicht entsprechen 26,6° (das Wiki nennt dafür „22,5°“, Slab-Wechsel). Für gerade Treppenflächen sollte H so gewählt werden, dass (D/2)/(H−1) nahe 1 oder 0,5 liegt.

**(d) Konkave/konvexe Spitzen und Zwiebelkuppel (eigener Vorschlag, nicht belegt):** Ein Rotationskörper mit Profil r(t), t = Höhe/H ∈ [0,1], wird schichtweise als Kreis mit Radius r(t) gerastert (wie beim Kegel).
- Konkav, also „Nadel“ bzw. ausgestellter Helm (Wiki: Schichten nach oben höher): `r(t) = R·(1−t)^p` mit p ≈ 1,5–2.
- Konvex bzw. glockig: p ≈ 0,5–0,7, oder Kuppelformel `r = R·sqrt(1−t²)`.
- Zwiebel: Bauch bei t_b ≈ 0,3 mit R_max ≈ 1,25–1,4·R_Tambour, darüber konkav zur Spitze:
  `r(t) = R_t·(1 + (k−1)·sin(π/2·t/t_b))` für t ≤ t_b, sonst `r(t) = k·R_t·cos(π/2·(t−t_b)/(1−t_b))^1.6`.
  Gesamthöhe ≈ 1,5–2·D_Tambour. Spitze mit `lightning_rod`, `end_rod` oder Zaun plus `iron_chain`.
- Beispiel (Hand-Schätzung) für einen 7er-Tambour: Schichtbreiten 7, 9, 11, 11, 11, 9, 7, 5, 3, 3, 1, 1. Wegen der Überhänge im Bauch sind Treppen mit half=top (unter dem Bauch) und half=bottom (über dem Bauch) nötig, siehe Abschnitt 3.

### Gaps
- Für Zwiebelkuppeln fand ich keine zitierfähige Anleitung mit Schichtmaßen (Reddit und planetminecraft waren nicht erreichbar). Das Profil oben ist eine eigene Konstruktion.
- Die exakte Abdichtungsregel des pixelcircles-Hohlkegels (302 Blöcke) ist nicht reproduziert. Der Quelltext liegt nur als minifiziertes JS vor und wurde nicht analysiert.
- Die oranj.io-Hinweise zu Treppen konnten nicht gelesen werden: Der Generator liegt unter new.oranj.io, und die Seite enthielt keinen Text dazu.

---

## 3. Kurven glätten mit Treppen (stairs) und Stufen (slabs): Block-States und Regeln

### Takeaway
Grundregel: Die volle Seite einer Treppe (`facing`) zeigt zur Masse, die abgeschnittene Ecke zur Luft. Im Bogen sind das Treppen mit `half=top` und `facing` weg von der Bogenmitte. Auf Kuppel- und Kegelstufen sind es `half=bottom` mit `facing` zur Turmmitte, unter Überständen `half=top` mit `facing` zur Wand. Ecken entstehen über `shape` (`inner_*`/`outer_*`). Ein Generator, der States direkt schreibt, muss `shape` selbst berechnen; die Regel steht unten.

### Cited Findings
- Blockzustände in 1.21.11 (alle `*_stairs`): `facing` ∈ {north, south, west, east}, `half` ∈ {top, bottom}, `shape` ∈ {straight, inner_left, inner_right, outer_left, outer_right}, `waterlogged`. Default: `facing=north, half=bottom, shape=straight`. Slabs: `type` ∈ {top, bottom, double}. Wände (`*_wall`): `north/east/south/west` ∈ {none, low, tall}, `up` ∈ {true, false}. — [misode/mcmeta 1.21.11-summary blocks/data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)
- Semantik: `facing` = „The direction the stairs' full-block side faces. When placed in-game by a player, this matches the direction the player faces.“ `half=top` = „if the stairs are upside-down“. „left“/„right“ bei shape = „in which direction is the higher part of the step“. Inner = Innenecke (L-Form), outer = Außenecke. Aufrechte und umgedrehte Treppen verbinden sich nicht. — [minecraft.wiki: Stairs](https://minecraft.wiki/w/Stairs)
- Modellgeometrie (Vanilla-Assets): `block/stairs` = Bodenplatte [0,0,0]–[16,8,16] plus obere Hälfte [8,8,0]–[16,16,16], also bei `facing=east, half=bottom` die Osthälfte. `outer_stairs` = Platte plus Viertel [8,8,8]–[16,16,16]. `inner_stairs` = Platte plus Osthälfte plus Viertel [0,8,8]–[8,16,16]. Blockstates für facing=east, half=bottom: `outer_right` ohne Rotation (erhöhtes Viertel SO), `outer_left` y=270 (NO), `inner_right` ohne Rotation (fehlendes Viertel NW), `inner_left` y=270 (fehlendes Viertel SW). half=top nutzt x=180, also dieselbe Grundfläche, vertikal gespiegelt. — [mcmeta 1.21.11-assets: blockstates/stone_brick_stairs.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-assets/assets/minecraft/blockstates/stone_brick_stairs.json); [models/block/stairs.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-assets/assets/minecraft/models/block/stairs.json); [outer_stairs.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-assets/assets/minecraft/models/block/outer_stairs.json); [inner_stairs.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-assets/assets/minecraft/models/block/inner_stairs.json)
- **Shape-Berechnung** (Neuimplementierung des Vanilla-Verhaltens im Rust-Server Pumpkin, `compute_stair_shape`): `right_locked` bzw. `left_locked` gilt, wenn der Nachbar rechts (`facing.rotate_clockwise`) bzw. links (`rotate_counter_clockwise`) eine Treppe mit gleichem facing und half ist. Sind beide gesperrt → straight. Ist der Nachbar bei `pos+facing` eine Treppe mit gleichem half, folgt `outer_right`, wenn deren facing = CW(facing) und nicht left_locked, und `outer_left`, wenn deren facing = CCW(facing) und nicht right_locked. Sonst wird der Nachbar bei `pos−facing` mit gleichem half geprüft: facing = CW → `inner_right` (nicht right_locked), facing = CCW → `inner_left` (nicht left_locked). Andernfalls straight. — [Pumpkin-MC/Pumpkin: crates/pumpkin-core/src/block/blocks/stairs.rs](https://github.com/Pumpkin-MC/Pumpkin/blob/master/crates/pumpkin-core/src/block/blocks/stairs.rs)
- Platzierung im Spiel: „Pointing at a block top or the bottom half of a block side places the stairs right side up. Pointing at a block bottom or the top half of a block side places the stairs upside-down.“ — [minecraft.wiki: Stairs](https://minecraft.wiki/w/Stairs)
- Wandverbindungen: Eine Wand verbindet sich mit angrenzenden „connectable block surfaces“, Gittern und Glasscheiben, aber nicht mit Zäunen (Zauntore schon). Die Seite wird „tall“, wenn ein Block darüber den Bereich abdeckt. Ein Pfosten (`up=true`) ist vorhanden, „unless connecting to only two opposite sides or all four sides“, oder wenn bestimmte Blöcke darüber sitzen (Fackel, Banner, Schild, Wand mit Pfosten usw.). — [minecraft.wiki: Wall](https://minecraft.wiki/w/Wall)
- Kuppel glätten: „place stairs on the outer steps after the dome is finished“. Bögen glätten: „swap the outer corner block of each step for a stair block, with the tall side facing away from the opening“. — [pixelcircles dome-generator](https://pixelcircles.com/dome-generator/); [pixelcircles arch-generator](https://pixelcircles.com/arch-generator/)
- Hohlkehle/Gesims: „upside down stair blocks become usable as coving once a room has a ceiling height of about 6—10 meters“. — [minecraft.wiki: Tutorial:Walls and buttresses](https://minecraft.wiki/w/Tutorial:Walls_and_buttresses)
- Dachkanten: Dachränder aus anderem Material, z. B. Slabs oder „backwards stairs, forming a gutter“. Helmdach: „To avoid gaps in the roof, slabs are usually needed under the main roof blocks… stair blocks should be placed to face in only two directions“. — [minecraft.wiki: Tutorial:Roof types](https://minecraft.wiki/w/Tutorial:Roof_types)
- Version: In 1.21.11 heißt die Kette `minecraft:iron_chain`, die ID `chain` existiert nicht mehr. Dazu kommen `copper_chain`, `copper_bars`, `copper_lantern` mit Oxidationsstufen und gewachsten Varianten, jeweils mit `axis` bzw. Verbindungseigenschaften. — [mcmeta 1.21.11-summary blocks/data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)

### Inferences
**(a) Shape-Geometrie als Nachschlagetabelle** (aus den Modellen abgeleitet; F = facing, L = CCW(F), also links von F aus gesehen, R = CW(F); Beispiel F=east → L=north, R=south):

| shape | half=bottom: erhöhter Teil (oben) | half=top: hängender Teil (unten) |
|---|---|---|
| straight | Hälfte auf Seite F | Hälfte auf Seite F |
| outer_left | nur Viertel F∩L | nur Viertel F∩L |
| outer_right | nur Viertel F∩R | nur Viertel F∩R |
| inner_left | 3 Viertel, fehlt (−F)∩R | 3 Viertel, fehlt (−F)∩R |
| inner_right | 3 Viertel, fehlt (−F)∩L | 3 Viertel, fehlt (−F)∩L |

**(b) Regeln für den Generator:**
1. **Treppen-Ring auf Kuppel- oder Kegelstufe** (Außenhaut): Für Schicht k und jede Zelle c mit c ∈ footprint(k) \ footprint(k+1) (Trittfläche), die 4-benachbart zu footprint(k+1) ist: Treppe auf (c, y_{k+1}) mit `half=bottom` und `facing` = Richtung zum Nachbarn in footprint(k+1), also zur Mitte. Bei Trittbreite ≥ 2 die äußeren Zellen mit `*_slab[type=bottom]` belegen (ergibt ≈ 26,6°). Die Treppe ersetzt optisch die Stufenkante, ohne die Silhouette nach außen zu vergrößern.
2. **Unterseite von Überständen** (Kegeldach-Traufe, Zwiebelbauch, Maschikulis): `half=top`, `facing` zur Wand bzw. Mitte. Die volle Seite liegt an der Wand, die abgeschnittene untere Ecke zeigt nach außen und unten.
3. **Ecken im Ring:** Der dünne Ring ist an den Diagonalstufen nur über Ecken verbunden. Treppen dort bilden keine Ecken, und es entstehen sichtbare Kerben. Für Treppenringe daher den **dicken** Ring (4-zusammenhängend) als Footprint nehmen und `shape` per Regel aus Pumpkin (oben) berechnen. Beispiel Pyramiden- oder Kegelecke NO: Die Treppe facing=south hat davor (Süden) eine Treppe facing=west = R → `outer_right`, und das erhöhte Viertel liegt zur Mitte hin (SW). Das ist korrekt.
4. **Facing-Quantisierung:** Für Zellen auf der Diagonalen ist die Richtung zur Mitte nicht eindeutig. Dann die Achse mit dem größeren |Δ| wählen, bei Gleichstand die Achse mit dem Nachbarn in footprint(k+1). Die Shape-Regel macht daraus anschließend die Ecke.
5. **Bögen in der Wandebene** (West-Ost-Wand): `half=top`. Linke Bogenhälfte `facing=west`, rechte `facing=east`. Bei einer Nord-Süd-Wand west → north und east → south. Benachbarte Treppen gleichen facings entlang der Wandtiefe bleiben `straight`.
6. Beim Schreiben über `/setblock` oder `/fill` erhalten Nachbarn ein Shape-Update, der zuletzt gesetzte Block behält aber den übergebenen State. Deshalb `shape` immer explizit setzen. Das ist eine Ableitung aus der Update-Logik; das genaue Verhalten bei Strukturvorlagen ist nicht geprüft.
7. **Wände als Zinnen** direkt mit States schreiben. Einzeln stehende Wand-Merlone: `stone_brick_wall[up=true,north=none,east=none,south=none,west=none]` (Default). Durchlaufende Wand-Brüstung W–O: Innenstücke `[east=low,west=low,up=false]`, Enden und Ecken `up=true`. Liegt ein Block darauf, wird die betroffene Seite `tall`.

### Gaps
- Die Shape-Regel stammt aus einer Drittimplementierung (Pumpkin), nicht aus dem Mojang-Code selbst. Sie deckt sich mit der Wiki-Beschreibung von Innen- und Außenecken, ist aber nicht zeilengenau gegen Vanilla 1.21.11 verifiziert.
- Wie Strukturdateien (NBT/litematic) Treppen-Shapes beim Platzieren behandeln (Neuberechnung oder nicht), wurde nicht recherchiert.

---

## 4. Bögen: Rundbogen aus umgedrehten Treppen, Spitzbogen (gotisch), Segmentbogen, Breiten 3/5/7 mit exakter Platzierung, Arkaden

### Takeaway
Bogen = obere Hälfte eines gefüllten Pixelkreises (Rundbogen), Schnittmenge zweier Kreise mit Radius = Spannweite (gleichseitiger Spitzbogen, Höhe ≈ 0,87·W) oder ein flacher Kreisabschnitt (Segmentbogen). Danach wird jeder „Stufeneckblock“ im Intrados, also ein Block mit Luft darunter und Luft zur Bogenmitte hin, durch eine Treppe `half=top` ersetzt, deren `facing` von der Öffnung weg zeigt. Ein 1 breiter Scheitelschlitz bleibt beim Spitzbogen offen oder wird beim Rundbogen mit `*_slab[type=top]` geschlossen.

### Cited Findings
- pixelcircles: „It fills every block whose centre lies inside the curve, then keeps a ring of the thickness you ask for… The curve of a one-block round arch is exactly the top half of a thin circle.“ Rundbogen: „Its curve rises half the width, so a 15-wide arch has a curve 8 rows tall“. Darunter folgen gerade Leibungen. Spitzbogen: „two arcs that each have the width of the opening as their radius and meet in a point at the top. It needs about 87% of its width in height“. Elliptischer Bogen: Breite und Höhe unabhängig, „low and wide for a bridge“. — [pixelcircles.com/arch-generator](https://pixelcircles.com/arch-generator/)
- pixelcircles: „On a pointed arch an odd width ends in a single block at the peak, the keystone… an even width ends in two. To smooth the steps, swap the outer corner block of each step for a stair block, with the tall side facing away from the opening“. Weiter: „For a bridge, make the ring at least two blocks thick“. — [pixelcircles.com/arch-generator](https://pixelcircles.com/arch-generator/)
- pixelcircles-Größen: Türbogen 3×4 (lichte Öffnung 1×3 bei 1er-Ring), Fenster 5×8, Tor 9×11 (Ring 2 dick, 2 tief), gotisches Fenster 7×14 (27 Blöcke), Brücke 21×11. Rundbogen 15×12 = 29 Blöcke bei 1er-Ring, 56 bei 2er-Ring, 87 bei 3 Tiefe. Brückenspannweiten (Breite×Höhe, Kurve, Ring, Tiefe, Blöcke): Gartenbrücke 9×7 rund 1/2 = 34; Burgtorbrücke 15×9 rund 2/3 = 132; Flussbrücke 21×11 rund 2/5 = 280; Viadukt 31×16 rund 3/7 = 861; Aquädukt 31×10 elliptisch 2/3 = 204. „Tunnels and colonnades made by setting the depth to 10 or 16 and placing arches side by side“. — [pixelcircles.com/arch-generator](https://pixelcircles.com/arch-generator/)
- minecraft.wiki: Rahmen um Fenster schaffen Tiefe. „It is highly recommended to use the circular frame, however, if it doesn't fit your build, an arch will do the same job.“ — [minecraft.wiki: Tutorial:Adding beauty to constructions](https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions)
- „Corbel arch“ (Kragbogen) = Steine werden schrittweise auskragend vorgesetzt, bis sie sich treffen. Das ist die natürliche Minecraft-Bogenform aus Stufen. — [minecraft.wiki: Tutorial:Architectural terms](https://minecraft.wiki/w/Tutorial:Architectural_terms)
- Ein Planet-Minecraft-Tutorial („Gothic Tutorial Series: Pointed Arches“) konstruiert jede Seite eines Spitzbogens als Halbkreis mit ungeradem Durchmesser, zentriert am gegenüberliegenden Pfeiler (Beispiele 21 und 45). Die Seite selbst war nicht abrufbar (403); der Inhalt ist nur über eine Suchmaschinenzusammenfassung bekannt. — [planetminecraft.com: Gothic tutorial series – pointed arches](https://www.planetminecraft.com/project/gothic-tutorial-series-pointed-arches/)

### Inferences
**Konstruktion (berechnet, Python-Nachbau):** Die lichte Weite W liegt zwischen den Leibungen x = 0…W−1. Öffnung = Blockmittelpunkt im Bogen. Varianten:
- Rund (Kreisgenerator-Konvention): Mittelpunkt bei x = W/2. Bei ungeradem W liegt er in der Mitte von Zeile y=0, bei geradem W an der Unterkante von Zeile 0. r = W/2.
- Spitz (gleichseitig): `x² + y² ≤ W²  ∧  (x−W)² + y² ≤ W²`, y ab Kämpferlinie.
- Segment mit Stich h: `r = (W²/4 + h²)/(2h)`, Mittelpunkt bei y = h − r, also unter der Kämpferlinie.
Danach wird die **Stufeneck-Regel** angewendet: Ein fester Block mit Luft direkt darunter und Luft auf der Seite zur Bogenmitte wird zu `*_stairs[half=top, facing=west]` (linke Hälfte, Kürzel tW) bzw. `facing=east` (rechte Hälfte, tE). Ein 1 breiter Scheitelschlitz mit Block links, rechts und oben wird optional zu `*_slab[type=top]` (Ts).

Legende: `##` = z. B. `stone_bricks`, `tW` = `stone_brick_stairs[facing=west,half=top,shape=straight]`, `tE` = `…[facing=east,half=top,shape=straight]`, `Ts` = `stone_brick_slab[type=top]`, `..` = Luft. Die äußerste linke und rechte Spalte ist die Leibung bzw. Wand. Die Zeilen sind von oben nach unten gelistet. Unterhalb der letzten Zeile setzt sich die volle Öffnung bis zum Boden fort (Türhöhe = Leibungshöhe + Bogenzeilen). Durch die ganze Wandtiefe wird dasselbe Muster wiederholt.

```
RUNDBOGEN, lichte Weite 3 (klassisch; Halbblock-Raster)    RUNDBOGEN, Weite 4
  ## ## ## ## ##                                             ## ## ## ## ## ##
  ## tW Ts tE ##   <- oberste Öffnungszeile                  ## tW .. .. tE ##
  ## .. .. .. ##                                             ## .. .. .. .. ##
  (Ts weglassen = kleiner Spitz-/Kleeblattschlitz)

RUNDBOGEN, Weite 5                      RUNDBOGEN, Weite 6
  ## ## ## ## ## ## ##                    ## ## ## ## ## ## ## ##
  ## tW .. .. .. tE ##                    ## tW .. .. .. .. tE ##
  ## .. .. .. .. .. ##                    ## .. .. .. .. .. .. ##
  ## .. .. .. .. .. ##                    ## .. .. .. .. .. .. ##

RUNDBOGEN, Weite 7
  ## ## ## ## ## ## ## ## ##
  ## ## tW .. .. .. tE ## ##
  ## tW .. .. .. .. .. tE ##
  ## .. .. .. .. .. .. .. ##
  ## .. .. .. .. .. .. .. ##

RUNDBOGEN, Weite 9                          RUNDBOGEN, Weite 11
  ## ## ## ## ## ## ## ## ## ## ##            ## ## ## ## ## ## ## ## ## ## ## ## ##
  ## ## tW .. .. .. .. .. tE ## ##            ## ## ## tW .. .. .. .. .. tE ## ## ##
  ## tW .. .. .. .. .. .. .. tE ##            ## ## tW .. .. .. .. .. .. .. tE ## ##
  ## .. .. .. .. .. .. .. .. .. ##            ## tW .. .. .. .. .. .. .. .. .. tE ##
  (+2 volle Zeilen)                           ## .. .. .. .. .. .. .. .. .. .. .. ##  (+2)

SPITZBOGEN (gleichseitig, r=W), Weite 3     Weite 7
  ## ## ## ## ##                              ## ## ## ## ## ## ## ## ##
  ## tW ..|Ts tE ##   <- Scheitel             ## ## ## tW ..|Ts tE ## ## ##  <- Schlitz offen = spitz
  ## .. .. .. ##                              ## ## tW .. .. .. tE ## ##
  ## .. .. .. ##                              ## tW .. .. .. .. .. tE ##
                                              ## .. .. .. .. .. .. .. ##  (+2 volle Zeilen)
SPITZBOGEN, Weite 9
  ## ## ## ## ## ## ## ## ## ## ##
  ## ## ## ## tW ..|Ts tE ## ## ## ##
  ## ## ## tW .. .. .. tE ## ## ##
  ## ## tW .. .. .. .. .. tE ## ##
  ## ## .. .. .. .. .. .. .. ## ##
  ## tW .. .. .. .. .. .. .. tE ##
  ## .. .. .. .. .. .. .. .. .. ##  (+2 volle Zeilen)

SPITZBOGEN Weite 5 – das Raster ergibt nur einen flachen 3er-Scheitel:
  ## ## ## ## ## ## ##
  ## ## .. .. .. ## ##
  ## tW .. .. .. tE ##
  ## .. .. .. .. .. ##
-> für einen echten Spitz besser das 45°-Muster (eigener Vorschlag):
  ## ## ## .. ## ## ##   <- 1er-Schlitz (oder Ts)
  ## ## tW .. tE ## ##
  ## tW .. .. .. tE ##
  ## .. .. .. .. .. ##

SEGMENTBOGEN (flach; Zeile unter y=0 ist volle Öffnung)
  Weite 5, Stich 1:   ## tW .. .. .. tE ##
  Weite 7, Stich 1,5: ## ## ## tW Ts tE ## ## ##
                      ## tW .. .. .. .. .. tE ##
  Weite 9, Stich 2:   ## ## tW .. .. .. .. .. tE ## ##
                      ## tW .. .. .. .. .. .. .. tE ##
```
- Bogenring (Archivolte): Für einen sichtbaren Ring von t Blöcken die äußere Kontur mit W + 2t berechnen und den Ring = Außen \ Innen in einem Kontrastblock setzen, z. B. `polished_andesite` oder `deepslate_bricks`. Zusätzlich die Bogenfront 1 Block vor die Wandflucht setzen und die Öffnung in der zweiten Wandschicht ausführen. Das gibt Tiefe (siehe Wiki-Zitat oben).
- **Arkade/Kolonnade:** Ein Modul aus Pfeiler (Breite p = 1–2) und Bogen (Weite W) wiederholt sich mit Raster W + p. Wiederholen; darüber Gebälk oder Wehrgang. Bei W = 3 ergibt sich das typische „tW Ts tE“-Arkadenmuster. Pfeiler aus `*_wall` oder Säulen aus `stripped_*_log`/`polished_*`; die Säulenbasis kann ein `*_stairs[half=bottom]`-Kranz sein.
- **Brücken:** Mehrere Segment- oder elliptische Bögen nebeneinander mit Ring ≥ 2 und Tiefe = Fahrbahnbreite (pixelcircles). Darüber die Deckschicht und eine Brüstung aus `*_wall` (siehe Abschnitt 6).

### Gaps
- Für die Breiten 3/5/7 gibt es keine zugängliche Builder-Quelle mit exakt diesen Treppenpositionen. Die Muster oben sind aus dem zitierten Generator-Kriterium plus der zitierten Treppenregel abgeleitet und nicht durch Fremdquellen bestätigt.
- Die Planet-Minecraft-Anleitung (Konstruktion der Spitzbögen) und Reddit-Beispiele konnten nicht direkt gelesen werden.

---

## 5. Rundtürme: Radius, Wandstärke, Fenster in runder Wand, Kegeldach mit Überstand, Anschluss an rechteckige Gebäude

### Takeaway
Typische Turmdurchmesser liegen bei 9–15, Bergfriede bei etwa 21. Darunter (< 7) wirkt ein Turm eckig. Die Mauer ist dünn oder dick (1 Block) bzw. 2-lagig (Differenz zweier Kreise). Fenster gehören auf die geraden Achsstrecken; die Parität des Durchmessers bestimmt, ob 1 oder 2 breite Öffnungen mittig sitzen. Dach: Kegel mit H ≈ D (klassisch), H ≈ D/2 (flach) oder H ≈ 2–3·D (Spitzhelm), mit 1 Block Überstand (D + 2). Die Verjüngung darf nur paritätserhaltend einrücken.

### Cited Findings
- pixelcircles: „What is a good circle size for a tower? Between 9 and 15 blocks across. A 9-block tower leaves room for a ladder or a spiral staircase; a 21-block keep has space for rooms on each floor“. Größen nach Zweck: 5 = Laternenpfahl/Schornstein/kleine Säule, 7 = Brunnen/Starterturm, 9 = Wachturm/Silo, 11 = Zaubererturm/Wendeltreppenschacht, 15 = Hauptturm/Rundraum, 21 = Bergfried/Kuppelhalle. „For towers, build the first ring, check it against the plan, and only then stack the walls.“ „Decide where the door goes before you build. An odd diameter gives a single centre block on each side for a 1-wide door; an even one fits a 2-wide door.“ — [pixelcircles.com](https://pixelcircles.com/)
- Verjüngung: „The taper moves in by one block on each side only at a layer where the parity still matches the base. That prevents the common Minecraft tower problem where the top drifts half a block to one side.“ Turm-Presets: Zaubererturm (rund, Spitzhelm), Burgturm (quadratisch mit Zinnen, damit er „can meet a wall without awkward corner gaps“), Wachturm (achteckig, Fenster in 4 Richtungen). Spitzhelm „overhangs by one block and follows the same plan shape as the wall“. Fenster „are carved from the wall rather than placed as a dark sticker on top of it“. Geschossdecken alle 6–8 Ebenen. — [pixelcircles.com/tower-generator](https://pixelcircles.com/tower-generator/)
- Leuchtturm: „A base that is 13 blocks wide and a top of 9 gives a readable taper without making the upper gallery cramped“. Farbbänder alle 6 Ebenen. Dach dunkler als die Bänder. Kuppel „softer and traditional“, Kegel „sharper and easier to spot from far away“. — [pixelcircles.com/lighthouse-generator](https://pixelcircles.com/lighthouse-generator/)
- Kegeldach: Überstand-Option „for a roof one block wider on every side, so its edge hangs over the wall“. „Castle turrets with a roof that hangs one block over the wall.“ Zweifarbig: Block alle 2–3 Schichten wechseln oder den Basisring dunkler als Traufkante setzen. — [pixelcircles.com/cone-generator](https://pixelcircles.com/cone-generator/)
- Dachüberstand allgemein: 1–2 Blöcke Überstand für Tiefe und Schatten. Diese Angabe stammt von einer Seite unklarer Herkunft, die in einer Suchzusammenfassung auftauchte, und wurde daher **nicht** als belastbar übernommen. Belastbar ist die pixelcircles-Aussage oben (1 Block).
- Anschluss Turm an Gebäude: Eine Seitenerweiterung wird „almost a tower“ bzw. zu einem echten Turm gemacht, um den Dachanschluss zu vereinfachen („The final picture simplifies the join considerably by making the side extension into a tower“). Ungerade Gebäudebreite bei mittigem ungeradem Element (Tür), damit der Dachfirst genau darüber liegt. — [minecraft.wiki: Tutorial:Roof construction guidelines](https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines)
- Wehrmauer-Ecktürme sollen „protrude from the corners so that you can clearly see and shoot anything near your wall“. — [minecraft.wiki: Tutorial:Construction](https://minecraft.wiki/w/Tutorial:Construction)
- minecraft.how (Blog, geringere Verlässlichkeit, widerspricht sich zwischen zwei Artikeln): Ecktürme „jut out three to four blocks from the walls“ und „four to five blocks in diameter, rising three to four blocks above the main walls“. Der andere Artikel sagt „Towers should be 2-3 blocks wider in diameter than the walls“ und „rise slightly higher“. Fenster: „Tiny openings for arrow slits along lower levels, larger windows at mid-levels. Scatter your windows irregularly“. — [minecraft.how: How to build a Minecraft castle](https://minecraft.how/blog/post/how-build-minecraft-castle); [minecraft.how: Medieval castle building guide](https://minecraft.how/blog/post/minecraft-castle-medieval-building-guide)
- Fenster mit Tiefe: Erker oder „circular framed windows, which have an outer frame with the glass placed behind“. 1×2-Fenster mit Fensterläden aus Holzblöcken oder Falltüren. — [minecraft.wiki: Tutorial:Adding beauty to constructions](https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions)
- Helmdach (Rhenish helm) für quadratische Türme: „This design tends to work better with square towers of an odd width“. Treppen nur in zwei Richtungen ausrichten, Slabs unter die Dachblöcke. — [minecraft.wiki: Tutorial:Roof types](https://minecraft.wiki/w/Tutorial:Roof_types)

### Inferences
- **Durchmesser-Wahl für Generator-Presets:**
  - Erker- oder Treppentürmchen: D = 5–7, nur außen sichtbar, gern auskragend auf Konsolen.
  - Wehr- oder Ecktürme: D = 9–11.
  - Haupttürme: D = 13–15.
  - Bergfried: D = 19–21.
  - Ungerade D bevorzugen, wenn mittige 1er- oder 3er-Tore, -Fenster oder Schießscharten gewünscht sind; gerade D für 2er-Türen. Für symmetrische Zinnen D ∈ {7, 9, 15, 17, 21} wählen, siehe Abschnitt 6.
- **Wandstärke:**
  - Dünn: 1 Block. Ausreichend, da Minecraft keine Statik hat; pixelcircles: „an arch is about how it looks“.
  - Dick: für dichte Optik.
  - Wehrhaft wirkend: 2 Lagen (`filled(D) \ filled(D−4)`).
  - Fensterlaibungen bei 2 Lagen: Außenlage offen, Glas bzw. `*_pane`/`iron_bars` in der Innenlage. Das ergibt 1 Block Tiefe.
- **Fensterplatzierung** auf der runden Wand: nur auf den 4 Achsstrecken (Länge = erste Zeilenbreite aus Tabelle 1: 5 bei ungeraden D 9–17, 7 bei D 19/21, 4 bzw. 6 bei geraden D) bzw. bei großen D auch auf den kurzen 45°-Diagonalstufen als 1-breite Schlitze. Die Fenster pro Geschoss rotieren (N/O/S/W versetzt) oder entlang der Wendeltreppe stufen (siehe Abschnitt 7).
- **Kegeldach-Standard:** `D_Dach = D_Turm + 2` (1 Block Überstand). Höhe:
  - H = D_Dach für den Zaubererturm.
  - H ≈ D/2 für Rundhaus oder Windmühle.
  - H = 2–3·D für den Kirchenspitzhelm.

  Die Unterseite der Traufe erhält einen Ring aus `*_stairs[half=top, facing→Turmmitte]` auf dem Mauerkronen-Ring, wenn ein Gesims gewünscht ist. Zur Spitze passen `lightning_rod`, `end_rod` oder Zaun plus Banner.
- **Turm und Rechteckbau:**
  - Ecktürme: Turmmittelpunkt auf die Gebäudeecke oder leicht nach außen versetzt, sodass mindestens die Hälfte des Durchmessers vorsteht.
  - Flankentürme an langen Mauern: Turmmitte auf der Außenflucht der Mauer, Abstand 8–16 Blöcke.
  - Mauerblöcke innerhalb des Turminneren entfernen, die Mauerkrone in den Turm einbinden (Wehrgang-Durchgang als Rundbogentür aus Abschnitt 4).
  - Parität angleichen: Ist die Mauerdicke ungerade, ungerades D wählen, damit die Mauerachse durch die Turmmitte läuft.
- **Verjüngung (Taper):** Radius nur in Schritten von 1 Block je Seite verringern, also D − 2. So bleibt die Parität erhalten, wie im zitierten Tower-Generator. Den Einzug bevorzugt mit einem Gesimsring aus `*_stairs[half=bottom, facing→Mitte]` kaschieren.

### Gaps
- Es gibt keine belastbaren, quellengestützten Zahlen zur „richtigen“ Wandstärke oder zum Fensterabstand bei Rundtürmen von erfahrenen Buildern. Builder-Galerien (Reddit, Planet Minecraft) waren nicht abrufbar.
- Die Turmmaße von minecraft.how sind widersprüchlich (Ecktürme 4–5 Durchmesser vs. „2–3 Blöcke breiter als die Mauern“; Mauerhöhe 30–40 vs. 12–15 Blöcke) und stammen aus einem Blog mittlerer Qualität. Sie dienen nur als Orientierung.

---

## 6. Burgelemente: Zinnen/Battlements, Maschikulis, Schießscharten, Strebepfeiler, Torhaus, Wehrgang, Brücken

### Takeaway
Zinnen entstehen im Wechsel Merlon/Lücke (Periode 2, auch 3) entlang der Außenkante bei durchgehender Rücklage. Maschikulis sind eine 1 Block auskragende Brüstung auf Konsolen aus umgedrehten Treppen. Schießscharten sind 1 breite vertikale Schlitze mit festem Abstand (Standard 8), Strebepfeiler stehen alle 8–10 Blöcke 1 Block vor und überragen die Krone um 1 Block. Das Tor ist ein Rundbogen von etwa 7–9 Weite mit 2er-Ring und Flankentürmen. Die Mauer ist 2 (bis 3) Blöcke dick mit Wehrgang hinter einer 1-Block-Brüstung.

### Cited Findings
- **Zinnen:** „Battlements alternate a raised block with a gap along the front edge and keep a solid rear course. They are the classic castle wall profile.“ „Guarded walkway puts a one-block guard wall on the outer front edge and leaves the wall behind it open as a walking strip.“ „A sloped cap keeps the wall-thickness course and overhangs one block at both the front and back; Minecraft stairs can replace those full blocks“. Für eine Palisade die Kappenblöcke durch „pointed fences“ ersetzen. — [pixelcircles.com/wall-generator](https://pixelcircles.com/wall-generator/)
- **Pfeiler und Sockel:** Pfeilerabstand 4–16 (Default 8), Breite 1–3. „Every pillar starts at the base, projects one block beyond the wall depth and rises one block above the wall top.“ Sockel als eigenes Materialband: „one layer is subtle, two layers look like a plinth, and three layers suit a heavy gatehouse“. Wanddicke: „One block is enough for a boundary. Two blocks is a good default for a castle wall, and three blocks gives a heavier fortress section or room for a walkable edge.“ — [pixelcircles.com/wall-generator](https://pixelcircles.com/wall-generator/)
- **Schießscharten:** „Arrow slits are one-block vertical openings through the middle of the wall, repeated at the spacing you choose and skipped where they would collide with the gate“ (Default-Abstand 8). **Tor:** „The centre gate reuses the arch engine“ (Default-Torweite 7). — [pixelcircles.com/wall-generator](https://pixelcircles.com/wall-generator/)
- Wand-Presets (L×H×Dicke, Blöcke, Krone): Castle wall 32×12×2, 778, Battlements. Stone wall with pillars 28×10×2, 728, flach. Desert wall 24×9×2, 443, Guarded walkway. Nether fortress wall 30×14×3, 1233, Battlements. Mossy garden wall 20×6×1, 140. Wood palisade 26×10×1, 298 (Material `oak_log`). — [pixelcircles.com/wall-generator](https://pixelcircles.com/wall-generator/)
- Burgturm-Preset: „the roof deck is a solid floor and the crown alternates blocks around its edge“. — [pixelcircles.com/tower-generator](https://pixelcircles.com/tower-generator/)
- Torbogen-Empfehlung: „Castle gates around 9 wide and 11 tall with a ring two blocks thick, run 2 blocks deep so the gate reads as a passage through a wall.“ — [pixelcircles.com/arch-generator](https://pixelcircles.com/arch-generator/)
- **Strebepfeiler** (Wiki): Typen „angled“, „setback“, „clamped/clasping“, „diagonal/French“. Strebebogen = Pfeiler mit Abstand zur Wand plus „arched flyer“. Die verjüngte Mauer (tapered wall) ist unten dicker als oben. Die **Embrasure** (Schießschartennische) ist eine von innen ausgehöhlte Wand als „site for arrow slits“. Die **Bastion** ist eine keilförmige, angewinkelte Mauer. — [minecraft.wiki: Tutorial:Walls and buttresses](https://minecraft.wiki/w/Tutorial:Walls_and_buttresses)
- **Burgblog (minecraft.how, mittlere Qualität):**
  - Zinnen: „Simple 1-block-out, 1-block-gap pattern works. More complex versions alternate materials or add thicker blocks.“
  - Maschikulis: „you can suggest machicolations with slabs and stairs jutting out from the wall.“
  - Strebepfeiler: „place them every 8-10 blocks“.
  - Schießscharten: „Use trapdoors or pressure plates… place a trapdoor half-open“. Das ist technisch unscharf, da eine Falltür nur offen oder geschlossen sein kann.
  - Tor: „4-5 blocks tall and 3-4 wide“, Fallgitter aus Eisengittern, Pechnase (murder hole), mehrere Tore hintereinander.
  - Mauern: „at least 3-4 blocks wide at ground level, tapering“.

  — [minecraft.how: Medieval castle building guide](https://minecraft.how/blog/post/minecraft-castle-medieval-building-guide)
- Zweiter minecraft.how-Artikel: „Crenellations… Space them two blocks apart, one block tall“, Mauern „at least three blocks wide at the base, tapering to two blocks at the top“, Höhe 12–15, Turmzinnen „using stairs and slabs“. — [minecraft.how: How to build a Minecraft castle](https://minecraft.how/blog/post/how-build-minecraft-castle)
- Wehrmauer mit Überhang gegen Spinnen; Ecktürme stehen vor. — [minecraft.wiki: Tutorial:Construction](https://minecraft.wiki/w/Tutorial:Construction)
- Brücken: siehe Spannweitentabelle in Abschnitt 4 („A bridge is a row of thick arches with a deck laid across the top“). — [pixelcircles.com/arch-generator](https://pixelcircles.com/arch-generator/)
- Verfügbare Mauer-Blöcke (`*_wall`) in 1.21.11 (26): andesite, blackstone, brick, cobbled_deepslate, cobblestone, deepslate_brick, deepslate_tile, diorite, end_stone_brick, granite, mossy_cobblestone, mossy_stone_brick, mud_brick, nether_brick, polished_blackstone_brick, polished_blackstone, polished_deepslate, polished_tuff, prismarine, red_nether_brick, red_sandstone, resin_brick, sandstone, stone_brick, tuff_brick, tuff. Treppen gibt es u. a. als stone_brick, mossy_stone_brick, cobblestone, deepslate_brick/tile, tuff_brick, polished_blackstone_brick und resin_brick. — [mcmeta 1.21.11-summary blocks/data.json](https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json)

### Inferences
**Zinnenmuster (Querschnitt, Außenseite links; M = Merlon, w = Wehrgang):**
```
A) klassisch, Periode 2 (Draufsicht Mauerkrone, Mauer 2 dick)   B) Periode 3 (2 Merlon, 1 Lücke) – wuchtiger
   außen: M . M . M . M .                                          außen: M M . M M . M M
   innen: w w w w w w w w   (Rücklage = Lauffläche)                innen: w w w w w w w w
C) Ansicht von außen, Höhe 2 (Merlon 2 hoch, z. B. Mauer + Slab-Kappe):
   S . S . S       S = *_slab[type=bottom] auf Merlon (oder Treppenkappe)
   # . # . #       Lücke (Crenel) evtl. mit *_slab[type=bottom] als Brüstung
   #########
D) leichte Variante: *_wall-Blöcke als Brüstung/Merlone (siehe Abschnitt 3 für States)
```
- **Rundturm-Zinnen:** Den Ring nach Winkel `atan2` sortieren und nach Indexparität abwechselnd Merlon und Lücke setzen. Geprüft für dünne Ringe D 5–21 (berechnet):
  - Volle Symmetrie (90°-Drehung und beide Spiegelachsen) gibt es nur bei **ungeradem D mit gerader Zahl (Ringblöcke/4)**: D = 7, 9, 15, 17, 21.
  - Ungerade D mit ungerader Viertelzahl (D = 5, 11, 13, 19) sind nur spiegelsymmetrisch (N–S und O–W), aber nicht drehsymmetrisch.
  - Gerade D (6, 12, 18, 20) sind nur drehsymmetrisch; 8, 10, 14 und 16 sind gar nicht symmetrisch.
  - Bei geraden D besser ein Oktant-Muster definieren und spiegeln. An den Achsen-Nahtstellen stehen dann zwei gleiche Zellen nebeneinander.

  Für D=15 dünn ergibt das:
```
.....oMoMo.....
...oM.....Mo...
..M.........M..
.o...........o.
.M...........M.
o.............o
M.............M
o.............o      (M = Merlon, o = Lücke; Lauffläche/Deck innen)
M.............M
o.............o
.M...........M.
.o...........o.
..M.........M..
...oM.....Mo...
.....oMoMo.....
```
- **Auskragende Brüstung und Maschikulis am Rundturm** (eigener Vorschlag):
  - Ebene h−1: Konsolenring = Zellen von `thin(D+2)`, die 4-benachbart zu `ring(D)` sind. Darauf `*_stairs[half=top, facing→Turm]`, jede zweite Zelle oder alle; Lücken zwischen den Konsolen bleiben offen (Pechnasen-Optik).
  - Ebene h: Brüstungsboden bzw. Ring `ring(D+2)` als Vollblock.
  - Ebene h+1: Zinnen auf `ring(D+2)`.
  - An geraden Mauern analog: 1 Block vor die Flucht, Konsolen als umgedrehte Treppen mit facing zur Mauer, Abstand 1 oder 2.
- **Schießscharten:** In 2 dicken Mauern außen 1×2 oder 1×3 öffnen (Abstand 6–8). Innen optional eine 3 breite Nische (Embrasure). Optional ein Kreuz (zusätzliche 1×1-Öffnungen links und rechts in mittlerer Höhe). Alternativ den Schlitz mit `iron_bars` füllen. Am Rundturm die Scharten nur auf die Achsstrecken setzen (siehe Abschnitt 5).
- **Strebepfeiler:** Alle 8–10 Blöcke ein Pfeiler 1 Block vor der Mauer, der die Krone um 1 Block überragt. Treppenförmig abtreppen (setback), d. h. jede Stufe mit `*_stairs[half=bottom, facing→Mauer]` als Wasserschlag-Abdeckung. Diagonale Strebepfeiler an Ecken (French buttress) als 45°-Treppenlinie.
- **Torhaus:**
  - Zwei Flankentürme (rund D 9–11 oder quadratisch) neben einem Rundbogentor (lichte Weite 5–7 bzw. 7–9 mit 2er-Ring) und einem 2–3 tiefen Torgang.
  - Fallgitter aus `iron_bars` (oder `copper_bars`) in einer Ebene im Torgang, darüber ein Schlitz.
  - Darüber Maschikulis und Zinnen; eine Zugbrücke als Holz-Slab-Deck mit `iron_chain[axis=y]`-Ketten (ID in 1.21.11 `iron_chain`!).
- **Wehrgang:** Mauer 2 (bis 3) dick, Außenbrüstung 1 Block (Zinnen), dahinter 1–2 Blöcke Lauffläche. Zu Türmen hin Durchgang als 3er-Rundbogen.
- **Mauerhöhe:** Die Quellen widersprechen sich. Für einen Generator wirken Mauerhöhen von 8–15 Blöcken und Türme 3–5 Blöcke höher plausibel (Ableitung aus beiden Blogartikeln plus Wiki-Faustregel „roof 1–2 storeys“), nicht belegt.

### Gaps
- Für Maschikulis, Zinnenrhythmen und Torhäuser fand ich keine Builder-Quelle mit exakten Blockplänen. Nur Generator-Beschreibungen und Blogs mittlerer Qualität waren abrufbar. Die Pläne oben sind eigene Ableitungen.
- Die minecraft.how-Angabe „trapdoor half-open“ für Schießscharten ist unklar, da Falltüren nur `open=true/false` kennen. Sie wurde nicht übernommen.

---

## 7. Wendeltreppen in Türmen (relevant, soweit von außen sichtbar)

### Takeaway
Eine Wendeltreppe ist ein Ring aus Treppen, der pro Stufe 1 Block steigt. Pro Umdrehung braucht sie mindestens 3–4 Stufen, damit 2 Blöcke Kopfhöhe bleiben; komfortabel sind 12. Jede Treppe hat `facing` = Laufrichtung zur nächsten Stufe. Der klassische Schacht hat D = 9 (pixelcircles), in Mini-Türmen (D 7) läuft ein 8er-Ring um eine Mittelsäule. Von außen sichtbar wird sie nur über Fenster, die der Treppe folgen.

### Cited Findings
- „A spiral staircase is a ring of stairs that climbs one block per step. Seen from above, the ring is cut into wedges like a pie. Each level gets the next wedge, one block higher than the last“. „A stair block climbs toward the way it faces.“ — [pixelcircles.com/spiral-staircase-generator](https://pixelcircles.com/spiral-staircase-generator/)
- „Nine blocks across is the classic tower staircase. With a wall and 12 steps per turn, 20 levels take 75 stairs and 480 wall blocks.“ „With 8 steps, a full turn climbs 8 blocks… With 24 steps… each step is a thin slice. Twelve is a comfortable middle.“ „You need two free blocks above each step… The next step above the same spot is a full turn higher“. Ein 5er-Treppenhaus „cannot fit more than a handful of steps per turn“. — [pixelcircles.com/spiral-staircase-generator](https://pixelcircles.com/spiral-staircase-generator/)
- Varianten: Tower (Wand an, Säule aus), Open (ohne Wand), Pillar (Wand und Mittelsäule aus Stämmen oder Steinziegeln). Mittelalter-Turm: „cobblestone or stone brick stairs, stone wall, no pillar“. Drehsinn: „Many castle stairs turn clockwise going up, and a popular story says that helped right-handed defenders.“ Alle paar Ebenen Fackel oder Laterne gegen Mob-Spawns. — [pixelcircles.com/spiral-staircase-generator](https://pixelcircles.com/spiral-staircase-generator/)
- Turm-Generator: „The engine leaves a two-block headroom above every stair step and opens the slab over the stairwell“. Window sides 0–4 erzeugen Öffnungen „on each storey where there is enough wall and headroom“. — [pixelcircles.com/tower-generator](https://pixelcircles.com/tower-generator/)
- Burgblog: „Wind stone block stairs with a center pillar, slowly rotating as they climb… each step advancing one block higher and rotating ninety degrees“. — [minecraft.how: How to build a Minecraft castle](https://minecraft.how/blog/post/how-build-minecraft-castle)

### Inferences
**Algorithmus (eigener Vorschlag, konsistent mit den Zitaten):**
```
innen = filled(D) \ ring(D)                  # Turminneres
pfeiler = optional: Mittelblock (ungerades D) bzw. 2x2 (gerades D)
lauf = Zellen von innen, die 8-benachbart zum Pfeiler liegen (oder Ring mit Radius r_lauf),
       sortiert nach Winkel (Uhrzeigersinn aufwärts = Burgtradition)
n = len(lauf)  (Stufen pro Umdrehung; muss >= 3, empfohlen >= 8)
für k = 0..K:  zelle = lauf[k mod n];  y = y0 + k
    setze *_stairs[half=bottom, facing = Richtung(zelle -> lauf[(k+1) mod n]), shape=straight]
    (bei diagonalem Übergang facing auf die dominante Achse runden)
optional unter jede Stufe: *_stairs[half=top] oder Vollblock als "Untersicht" (sieht von unten sauber aus)
Geschossdecken: Öffnung über den nächsten n/2 Stufen freilassen (2 Blöcke Kopfhöhe)
```
- Für D = 7 (Innenraum = gefüllter 5er-Kreis mit 21 Zellen) ergibt ein 1×1-Pfeiler einen 8er-Lauf, also 8 Stufen pro Umdrehung. Für D = 9 passen ein 1×1-Pfeiler und ein 2 breiter Lauf.
- **Außenwirkung:** Schmale Fenster (1×2) entlang der Treppe, je eine pro Viertelumdrehung um n/4 Blöcke höher versetzt, erzeugen die typische „steigende Fensterreihe“ eines Treppenturms. Ein außen angesetzter Treppenturm (D 5–7) in der Ecke zwischen Bergfried und Mauer ist ein klassisches Silhouettenelement.

### Gaps
- Keine Quelle beschreibt explizit gestaffelte Fenster entlang einer Wendeltreppe als Außendetail. Das ist eine eigene Ableitung.
- Die genauen pixelcircles-Zahlen je Durchmesser („Most steps per turn“-Tabelle) sind clientseitig berechnet und standen nicht im abgerufenen HTML.
