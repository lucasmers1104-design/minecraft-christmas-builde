# Stilbibel Mittelalter, Tudor und Fachwerk (Stil-ID `medieval`)

Stand 2026-10-23. Thema: Wie der Stil `medieval` mit seinen Untervarianten (englisches Tudor, alemannisches, fränkisches und niedersächsisches Fachwerk, Steinhaus, Handwerkerhaus, Burgnebenbau) so gebaut wird, dass er nach erfahrenen Buildern aussieht, und was dafür im Generator zu ändern ist.

Vorhandene Grundlagen werden nicht wiederholt: Ständerraster-Formel, Dreiecks-„Pixel“ aus Treppen, Jetty-Grundschnitt und Kontrastpaare stehen in `research_notes/Minecraft Bautechniken für Generator/waende_struktur.md` (Abschnitte 1, 2, 5), die Grundpalette in `paletten.md` (Frage 1). Diese Datei geht darüber hinaus. Sie liefert die Hierarchie der Hölzer, eine Figurenbibliothek als Raster, den Fachwerkgiebel, Varianten mit eigenen Parametern, regelkonforme Paletten und Korrekturen an Code und alter Notiz.

Konventionen der Skizzen: Ansicht immer **kanonisch auf die Südfassade** (Blick nach Norden, rechts = Osten), wie bei den Vorlagen W/T. Tiefe d: −1 innen, 0 Wand/Gefach, +1 Rahmenebene, +2 davor. Reihen r0 = Schwelle bzw. Balkenlage, r1 … = Wandreihen, oberste Reihe = Rähm. Die vier Treppen-Symbole bedeuten überall:

| Symbol | Blockzustand (Südfassade, Rahmenebene d=+1) | sichtbar voll |
|---|---|---|
| ◢ | `<holz>_stairs[facing=east,half=bottom,shape=straight]` | unten + oben rechts |
| ◣ | `<holz>_stairs[facing=west,half=bottom,shape=straight]` | unten + oben links |
| ◥ | `<holz>_stairs[facing=east,half=top,shape=straight]` | oben + unten rechts |
| ◤ | `<holz>_stairs[facing=west,half=top,shape=straight]` | oben + unten links |

Andere Fassaden drehen sich wie die Vorlagen (`transform.ts`). Weitere Kürzel: `L` = `<holz>_log[axis=y]` (Ständer), `=` = `<holz>_log[axis=x]` (Riegel, Schwelle, Rähm), `W` = `<holz>_wood` (Knoten), `#` = Gefach (Rolle `infill`, d=0), `g` = `glass_pane` (d=0), `.` = Luft.

---

## Kurzfassung

Nach Wirkung sortiert:

1. **Hierarchie statt Gitter.** Profis bauen kein gleichmäßiges Balkengitter. Sie setzen schwere Eck- und Bundständer, dazwischen Fensterständer und Riegel, und **Figuren nur an festen Stellen**: Mann und K-Strebe an Eck- und Bundständern, Andreaskreuz und Raute in Brüstungsfeldern [23][28][30]. Der Generator setzt heute nur vier Eckkehlen in fensterlose Felder (`walls.ts:200–214`). Das ist der größte Hebel.
2. **Der Giebel ist die Schauseite.** Im deutschen Fachwerk trägt der Giebel die reichsten Figuren, Kehlbalken und Firstständer; Fächerrosetten stehen in den Brüstungen der Obergeschosse **und des Giebels** [30]. Der Generator füllt das Giebeldreieck flach (`roofEngine.ts:406`); die aufgezeichneten `gableCells` werden nicht genutzt.
3. **Untervarianten als Daten.** Tudor, fränkisch, alemannisch, niedersächsisch, Steinhaus, Handwerkerhaus und Burgnebenbau unterscheiden sich in messbaren Parametern: Ständerabstand, Figurensatz, Ausfachung, Holzfarbe, Trauf- oder Giebelstellung, Dachform. Heute gibt es einen Stil mit drei Paletten und einem globalen `timber: 'upper'` (`styles.ts:80`).
4. **Längliche Grundrisse, steile Dächer.** Alle Größen sind fast quadratisch (`styles.ts:77`: 7×7 … 15×13). Die Anstiegsgrenze von 7 Blöcken (`roofEngine.ts:217–222`) flacht steile Dächer **vom First her** ab, sodass das Profil oben flacher und konvex wird. Mittelalterliche Dächer liegen bei 45–60°, Strohdächer bei 45–55° [50]. Der Knick gehört an die Traufe, als Aufschiebling.
5. **Kein Fachwerk auf Stein.** `medieval_stone` setzt ein volles Ständerraster mit Steinziegel-Gefach (`palettes.ts:70–91`) und Holzständer vor das Stein-EG (`walls.ts:166`). Das ist kein historischer Bau und wirkt im Screenshot wie ein Gerüst. Ein Steinhaus bekommt Eckquader, Gewände und ein Gurtgesims; Holz erscheint erst ab der Schwelle über dem Stein.
6. **Streben in der Farbe der Ständer.** Es gibt keine Treppen aus Stämmen; Streben kommen aus der Bretter-Treppe derselben Holzart. Bei `spruce_log` (L* 17) gegen `spruce_stairs` (L* 38) leuchten die Streben heller als die Ständer (`medieval_tudor`, `palettes.ts:100`). Regel: |ΔL*| ≤ 8 zwischen Stamm und Strebentreppe, sonst eine eigene Strebenrolle.
7. **Fensterbänder direkt unter dem Rähm, verzierte Brüstungen.** Heute steht in fast jedem Feld ein Fenster (`openings.ts:260–275`). Richtig sind 40–60 % der Felder auf Fachwerkgeschossen, gruppiert. Darunter liegen Brüstungsfelder mit Figuren [28][30].
8. **Das Stockwerksband trägt den Look.** Unter jedem Ständer der Auskragung sitzt eine Knagge, an der Ecke ein Knaggenbündel [31]. Dazu kommt optional ein Balkenkopf-Rhythmus. Heute sitzt eine Konsole an jeder zweiten Spalte, unabhängig von den Ständern (`walls.ts:186–190`).
9. **Ortgangbrett aus Holz.** Fachwerkhäuser bekommen eine dunkle Holzkante am Ortgang. Die helle Steinziegelkante von `medieval_stone` (`palettes.ts:80`) zeichnet im Screenshot eine Comic-Kontur auf das Schieferdach. Stein am Ortgang gehört nur zu einem Steingiebel oder Treppengiebel [51].
10. **Schwarz-weiß ist viktorianisch.** Schwarze Balken auf weißem Gefach sind eine Mode des 19. Jahrhunderts [44][45]. Historisch waren Holz und Gefach gekalkt, mit Ocker oder Rot gefasst oder als Eiche roh, die silbergrau verwittert [45][46]. Das ergibt zusätzliche, glaubwürdige Paletten: rot gefasst (Schweiz, Hessen), Ziegelausfachung (Norden) [25][26].
11. **Der Schornstein als Silhouette.** Massiv und mindestens 2 Blöcke über dem Dach [4]. Das Lagerfeuer steht eine Ebene unter der Krone und ist damit unsichtbar; heute brennt es offen auf dem Kopf (`components.ts:144,162`). Tudor-Variante: Schaftgruppe aus Ziegel [41].
12. **Burg- und Turmteile stimmig.** Der Rundturm nimmt das Mauerwerk des Hauses, nicht die Sockelrolle (`roundTower.ts:78`). Er bekommt wenige Gurtbänder statt eines Rings pro Geschoss und Zinnen im Verhältnis 2:1 bis 3:1 statt 1:1 [52]. Hölzerne Wehrgänge (Hoarding) sind ein starker Akzent [53].
13. **Mittelalterliche Weihnacht.** Tannengrün, Kerzen in den Fenstern, Holzstapel, hoher Kaminrauch (`signal_fire`) und Marktbuden davor [54][55]. Rote Wollwürfel als Schleifen, bunte Geschenkwürfel und eine amerikanische Veranda (`festive.ts:80,171`) brechen den Stil.
14. **Close studding mit Zäunen (Einschätzung).** Für englisches Tudor stellen `dark_oak_fence`-Säulen in d=+1 vor dem Gefach dünne, eng stehende Ständer dar, ohne den Bau in einen Holzkäfig zu verwandeln. Ein Zaun verbindet sich nicht senkrecht und dockt nur an volle Blöcke an [19].

---

## Schwächen des aktuellen Generators

**Aus den Screenshots**

- `haus-mittelalter-gross-ohne-thema.jpg` (Palette `medieval_stone`):
  - Ein gleichförmiges Gitter aus `stripped_spruce_log` liegt vor grauen Steinziegeln, im EG wie im OG. Es wirkt wie ein Gerüst. Rahmen gegen Wand haben nur ΔL* 11 (40,0 gegen 51,1); der Lint besteht nur über das Dach.
  - Es gibt keine einzige Strebe.
  - Das Giebeldreieck ist eine glatte Steinfläche.
  - Das Schieferdach ist eine ungeteilte Fläche mit hellgrauer Steintreppen-Kontur an Ortgang und Traufe.
  - Der fast quadratische Grundriss macht das Dach zum Zelt.
  - Fenster erscheinen als kleine dunkle Punkte ohne Läden.
  - Das offene Lagerfeuer auf dem Kamin liest sich wie eine Fackel.
- `haus-mittelalter-weihnachten.jpg`:
  - Zwerchgiebel und Girlande funktionieren.
  - Die Veranda auf Zaunpfosten mit Steinplatten-Dach und Bretterdeck ist eine amerikanische Bauform.
  - Rote Wollwürfel in der Girlande und gelb, weiß und grün gefärbte Geschenkwürfel wirken wie Spielzeug.
- `haus-mittelalter-rundturm-erker-balkon-1/2.jpg`:
  - Der Rundturm aus `cobblestone` steht neben einem Haus aus `stone_bricks`, zwei Steinfamilien ohne Grund.
  - Ein vorspringendes Band pro Geschoss ergibt einen „Reifenstapel“.
  - Die Zinnen haben das Verhältnis 1:1, sind also Zähne statt Mauerzinnen.
- `turm-mittelalter-zinnen.jpg`:
  - Reiner Bruchstein mit vier gleichen Konsolbändern.
  - Kein Anlauf am Fuß, keine Maschikulis, nur zwei Fenster.
- `bahnhof-mittelalter.jpg`:
  - Große ungegliederte Bretterflächen.
  - Die Uhr aus schwarz-weißen Würfeln wirkt wie ein QR-Code. Das ist nicht dieses Thema, aber derselbe Stil.

**Aus dem Code**

| Stelle | Befund | Folge |
|---|---|---|
| `styles.ts:77` | Größen 7×7×1, 9×9×2, 11×11×2, 15×13×3 | quadratisch, kein trauf- oder giebelständiges Haus; klein = 1 Geschoss, also nie Jetty |
| `styles.ts:71` | `gambrel: 0.1` | Gambrel (Mansarde mit zwei Neigungen) ist kein mittelalterliches Dach (Einschätzung: Gambrel und Mansard sind neuzeitlich; [13] nennt sie für große Bauten) |
| `styles.ts:80–81` | `timber: 'upper'`, `jetty: true` für alle Paletten | kein Tudor ganz in Fachwerk, Steinhaus trotzdem gerastert |
| `styles.ts:83` | Türen `['T03','T01','T02']`, T03 zuerst | Doppeltür im Spitzbogenportal wird als erstes probiert, auch an der Kate |
| `palettes.ts:70–91` | `medieval_stone`: `infill: stone_bricks`, Rahmen `stripped_spruce_log`, `roofTrim: stone_bricks` | Fachwerk mit Steingefach, helle Steinkontur auf dem Schieferdach |
| `palettes.ts:100` | `medieval_tudor`: `frame: spruce_log` | Streben aus `spruce_stairs` (L* 38,3) gegen Ständer (L* 17,1): ΔL* 21 |
| `palettes.ts:47–114` | Alle drei Paletten nutzen `white_terracotta` als Gefach, Akzent `red_wool` | keine Ziegel- oder Kalkvarianten, wenig Vielfalt |
| `studs.ts:8` | Feldzahl ≈ (e−1)/4,5, Felder 1–4 | ein Raster für alle Varianten (eng niedersächsisch, weit alemannisch nicht abbildbar) |
| `walls.ts:166` | Stein-EG bekommt Eckständer in d=+1 | Holzpfosten vor Stein („Stelzen“) |
| `walls.ts:186–190` | Konsole bei `(u+1) % 2 === 0` | Konsolen nicht unter den Ständern |
| `walls.ts:200–214` | `addBraces`: vier Eckkehlen, nur in fensterlosen Feldern ≥ 3 breit | immer dieselbe „abgerundete Box“; bei normaler Fensterdichte praktisch nie sichtbar |
| `walls.ts:208` | Streben = `stairs('frame')` | Farbbruch bei Rindenstämmen (siehe 6. in der Kurzfassung) |
| `openings.ts:260–275` | Fenster in jedem Feld, Brace nur als Ersatz | Fassade voller Löcher, keine Brüstungsfelder |
| `roofEngine.ts:406`, `plan.ts:423` | Giebel flach, `gableRecess: false` | leere Giebel, der schönste Teil des Fachwerks fehlt |
| `roofEngine.ts:217–222` | Anstieg ≤ 7, Abflachung vom First her | steiles Dach wird oben flacher |
| `plan.ts:200` | `ridgeStyle: 'block_slab'` | schwerer First, bei Schindel- oder Ziegeldach passt `slab` besser |
| `components.ts:144,162` | Lagerfeuer offen auf dem Kamin | sichtbare Flamme statt Rauchfahne |
| `roundTower.ts:78` | Turmwand = Rolle `plinth`, wenn Fachwerk | Bruchsteinturm neben Steinziegelhaus |
| `festive.ts:80,171` | Schleife = `red_wool`, Geschenke = Wollwürfel | Spielzeugoptik im Mittelalterstil |

---

## Techniken und Regeln

### T1 Holzhierarchie und Ständerraster je Variante
- **Beschreibung:** Drei Gewichte statt einem.
  - Schwer: Eckständer, Schwelle und Rähm als durchlaufender Ring, Knoten als `*_wood`.
  - Mittel: Bund- und Fensterständer.
  - Leicht: Streben und Figuren als Treppen, Zaunständer.
- **Reale Regeln:** Englisches close studding hat Abstände bis etwa 60 cm [39]. Bei Eliten-Bauten standen 6-Zoll-Hölzer im Abstand von 6 Zoll [40]. Im Osten Englands herrscht close studding, im Westen ein Quadratraster mit Zierformen [40][41]. Alemannisch: weiter Ständerabstand mit angeblatteten Kopf- und Fußbändern [24]. Kopfbänder stehen bei Zwischenständern immer beidseitig [32].
- **Blöcke:** `<holz>_log[axis=y]` für Ständer, `<holz>_log[axis=x|z]` für Riegel, Schwelle und Rähm, `<holz>_wood` an Knoten, `<holz>_stairs` für Streben, `<holz>_fence` für Zierständer.
- **Maße (Feldbreite p zwischen Ständern):**

| Variante | p (Blöcke) | Zierständer | Bemerkung |
|---|---|---|---|
| Tudor Ost (close studding) | 4–6 zwischen Hauptständern | Zaun jede 2. Spalte | Riegel selten [39] |
| Tudor West (Quadratfelder) | 2–3 | – | Zierfelder (Raute) [40] |
| fränkisch / hessisch | 3 | – | Mann an Eck- und Bundständern [23][27] |
| alemannisch | 4–5 | – | lange Streben [24] |
| niedersächsisch | 2 | – | dichte Ständer, Fächerrosetten und Fußwinkel in der Brüstung [30] |
| Steinhaus | – | – | keine Holzständer |

- **Skizze:** Ansicht Süd, OG, W=11 (u=0…10), fränkisch. Eckständer u=−1 und 11, Bundständer u=3 und 7. Legende wie im Kopf.
```
u:   -1  0  1  2  3  4  5  6  7  8  9 10 11
r4    W  =  =  =  W  =  =  =  W  =  =  =  W      Rähm
r3    L  F  F  F  L  #  g  #  L  F  F  F  L      F = Feld mit Figur (siehe T2/F-Muster)
r2    L  F  F  F  L  #  g  #  L  F  F  F  L      g = Fenster direkt unter dem Rähm
r1    L  F  F  F  L  B  B  B  L  F  F  F  L      B = Brüstungsfeld (Figur F5–F7)
r0    W  =  =  =  W  =  =  =  W  =  =  =  W      Schwelle
```
- **Einsatz:** alle Fachwerkvarianten. Das Raster kommt als Feldbreite p aus der Variante, nicht aus einer festen Formel.
- **Wirkung/Aufwand:** hoch / mittel.
- **Stile:** medieval, fantasy, rustic (eingeschränkt), cherry/japanese (nur Raster ohne Figuren).
- **Quellen:** [23][24][32][39][40][41]

### T2 Strebenband 45° aus Treppen (Grundbaustein aller Figuren)
- **Beschreibung:** Eine schräge Strebe mit 1,5 Halbblöcken Breite. Pro Reihe steht ein Paar aus ◢ und ◤, um eine Spalte versetzt. Die alte Notiz nennt die Regel; hier kommen der Beweis der Stetigkeit und die Spiegelung dazu. Jede Reihe deckt unten die Halbblöcke [2x, 2x+2] und oben [2x+1, 2x+3]; die nächste Reihe setzt nahtlos fort. Gleiche Hälften liegen nie nebeneinander, die Treppen bleiben also `shape=straight` (Zustandsauflöser, Fixpunkt-Test).
- **Regel:**
  - Strebe „/“ ab Spalte a über h Reihen: Reihe k hat ◢ bei a+k und ◤ bei a+k+1.
  - Strebe „\“ ab Spalte a: Reihe k hat ◣ bei a−k und ◥ bei a−k−1.
  - Wo ein Ständer, ein Riegel oder die andere Strebe liegt, entfällt die Treppe. Ein Kreuzungspunkt wird `<holz>_wood`.
  - Hinter jeder Treppe liegt in d=0 ein voller Gefachblock, sonst bleibt eine Lichtlücke.
- **Skizze:** Strebe „/“ über 3 Reihen zum Ständer bei u=3 (Ansicht Süd, d=+1):
```
u:    0  1  2  3
r3    #  #  ◢  L
r2    #  ◢  ◤  L
r1    ◢  ◤  #  L
r0    =  =  =  W
```
- **Einsatz:** Fachwerkgeschosse mit 3–4 Wandreihen (Geschosshöhe 4–5).
- **Wirkung/Aufwand:** hoch / niedrig, als Funktion `braceBand(a, k, dir)`.
- **Stile:** medieval, fantasy.
- **Quellen:** Ableitung aus [2] („a stair set into a panel can stand in for a diagonal brace“) und der alten Notiz. Die Stetigkeit ist eigene Rechnung.

### T3 Streben in der Farbe der Ständer (ΔL*-Regel)
- **Beschreibung:** Treppen gibt es nur in Bretter-Textur. Die Streben passen deshalb nur zu Stämmen, deren Seite so hell ist wie die Bretter. Messwerte aus `textureStats.ts`:

| Ständer | L* | Strebentreppe | L* | ΔL* | Urteil |
|---|---|---|---|---|---|
| `dark_oak_log` | 20,2 | `dark_oak_stairs` | 19,8 | 0,4 | ✓ |
| `stripped_dark_oak_log` | 25,1 | `dark_oak_stairs` | 19,8 | 5,3 | ✓ |
| `stripped_spruce_log` | 40,0 | `spruce_stairs` | 38,3 | 1,7 | ✓ |
| `stripped_oak_log` | 61,7 | `oak_stairs` | 56,4 | 5,3 | ✓ |
| `stripped_mangrove_log` | 31,5 | `mangrove_stairs` | 31,2 | 0,3 | ✓ (rot) |
| `spruce_log` | 17,1 | `spruce_stairs` | 38,3 | 21,2 | ✗ → `dark_oak_stairs` (19,8, Farbton 67° gegen 66°) |
| `oak_log` | 37,7 | `oak_stairs` | 56,4 | 18,7 | ✗ → `spruce_stairs` (38,3) |

- **Regel:** Lint: |L*(Ständer) − L*(Strebentreppe)| ≤ 8. Andernfalls nimmt die Palette eine Rolle `brace` (neu) mit passendem Material.
- **Einsatz:** alle Fachwerkpaletten, auch fantasy und rustic.
- **Wirkung/Aufwand:** mittel bis hoch / niedrig.
- **Stile:** medieval, fantasy, rustic.
- **Quellen:** Texturmessung im Repo; Einschätzung zur Wirkung.

### T4 Stockwerksband mit Knaggen und Balkenköpfen (Jetty)
- **Beschreibung:** Zum realen Band gehören Rähm, Deckenbalkenköpfe, Schwelle und Knaggen unter den vorkragenden Balken. Knaggen sind oft verziert; an vorkragenden Ecken sitzen Knaggenbündel [31]. Bressummer und Eck-Gratbalken (dragon beam) [42]. In Deutschland verkleiden teils Windbretter die Untersicht [42].
- **Darstellung:** Die Blockauflösung lässt nur zwei Ebenen zu. Daher ein Kniff (Einschätzung): Die OG-Schwelle in d=+2 wechselt zwischen liegendem Stamm quer zur Fassade (Hirnholz sichtbar = Balkenkopf) und längs liegendem Stamm (Füllholz). Knaggen stehen nur unter OG-Ständern.
- **Blöcke:**
  - `<holz>_log[axis=x]` (Schwelle an der Süd- oder Nordfassade), `<holz>_log[axis=z]` (Balkenkopf an der Süd- oder Nordfassade).
  - Knagge: `<holz>_stairs[facing=north,half=top]` an der Südfassade, die volle Seite zeigt zur Wand.
  - Eckknagge: zwei Knaggen übers Eck; der Auflöser setzt `shape=outer_*`.
  - Optional `lantern[hanging=true]` unter der Schwelle zwischen zwei Knaggen.
- **Maße:** Jetty 1 Block je Geschoss, höchstens 2 über dem Sockel. Knaggen unter jedem OG-Ständer. Balkenköpfe jede 2. Spalte (niedersächsisch) oder keine (Tudor, Bressummer glatt).
- **Skizze 1:** Schnitt an einer Ständerachse (Außen rechts):
```
            d:  0    +1   +2
y1+2            #    #    L      OG: Gefach d=+1, Ständer d=+2
y1+1            #    #    L
y1              F    =    =      F = Boden (Rolle floor); d=+1 EG-Rähm; d=+2 OG-Schwelle
y1-1            #    L    K      K = <holz>_stairs[facing=north,half=top] (Knagge)
y1-2            #    L    .
```
- **Skizze 2:** Ebene d=+2, Ansicht Süd, Reihen y1 und y1−1 (W=11, OG-Ständer bei u=−1, 3, 7, 11):
```
u:     -1  0  1  2  3  4  5  6  7  8  9 10 11
y1      W  =  o  =  W  =  o  =  W  =  o  =  W     o = <holz>_log[axis=z] (Balkenkopf), = = [axis=x]
y1-1    K  .  .  .  K  .  .  .  K  .  .  .  K     K nur unter Ständern; Ecke: Knaggenbündel
```
- **Einsatz:** Fachwerk-OG über EG, mittel bis riesig. Traufständige Häuser (Tudor) kragen an der Traufseite aus, giebelständige (fränkisch, niedersächsisch) an der Giebel- und Straßenseite. Der heutige Plan (`plan.ts:211`) kragt nach Norden und Süden aus; das passt zu beiden, sobald W<D (Giebel vorn) oder W>D (Traufe vorn) gewählt wird.
- **Wirkung/Aufwand:** hoch / niedrig, eine Änderung in `walls.ts:180–192`.
- **Stile:** medieval, fantasy.
- **Quellen:** [31][42][2][4]

### T5 Fachwerkgiebel: Dachbalkenlage, Kehlbalken, Firstständer
- **Beschreibung:** Der Giebel wiederholt das Geschossraster.
  - Die Dachbalkenlage ist der Rähm-Ring, wie heute in `buildTop`.
  - Alle 4 Reihen Anstieg folgt eine Kehlbalkenlage als liegender Stamm über die ganze Giebelbreite.
  - Ein Firstständer steht in der Mitte bis unter den First.
  - Im untersten Giebelgeschoss sitzen zwei Fenster symmetrisch, in der Mitte K-Strebe oder Mann.
  - In der Spitze kann eine kleine dunkle Öffnung als Uhlenloch (Eulenloch) sitzen [33].
- **Blöcke:**
  - Rahmenebene d=+1 unter dem Ortgang, der mit Überstand 1 genau diese Ebene deckt.
  - Gefach d=0 (Rolle `infill`).
  - Fenster W03c/W10-artig 1×2.
  - Uhlenloch: `spruce_trapdoor[facing=south,half=bottom,open=true]` in d=0. Die offene Falltür liegt an der Nordkante der Zelle, also innen, und lässt eine dunkle Nische (Einschätzung).
- **Skizze:** Ansicht Süd, Giebel W=9 (u=0…8), Dach 45° (für 63° jede Reihe doppelt):
```
u:    -1  0  1  2  3  4  5  6  7  8  9
g4                  R  L  R                    R = Dachtreppe/Ortgang, L = Firstständer
g3               R  ◢  L  ◣  R                 Fußbänder auf dem Kehlbalken
g2            R  =  =  W  =  =  R              Kehlbalken (log axis=x), W = <holz>_wood
g1         R  #  g  ◢  L  ◣  g  #  R           g = glass_pane in d=0
g0      W  =  =  =  =  =  =  =  =  =  W        Dachbalkenlage (Rähm-Ring)
```
- **Regeln:**
  - Kehlbalken bei g = 4, 8 … (bei Geschosshöhe 5: 5, 10).
  - Mann statt K-Strebe nur, wenn das Giebelgeschoss 4 Reihen hat und je Seite 3 Zellen frei sind (F3).
  - Steinhaus und Treppengiebel: kein Holzgiebel (T12).
  - Tudor: Holzgiebel mit dunklem Ortgangbrett.
- **Einsatz:** alle Fachwerkvarianten, vor allem der Hauptgiebel zur Straße und Zwerchhäuser.
- **Wirkung/Aufwand:** hoch / mittel. `gableCells` sind vorhanden; dazu kommt eine neue Funktion `gableFrame()`.
- **Stile:** medieval, fantasy, rustic (nur Kehlbalken und Ständer).
- **Quellen:** [30][33][25]; Raster als Einschätzung.

### T6 Close studding mit Zaunständern (englisches Tudor)
- **Beschreibung:** Viele dünne senkrechte Hölzer, damit der Bau „teuer“ wirkt [39][40]. Volle Stämme jede 2. Spalte ergäben einen Holzkäfig. `dark_oak_fence` in d=+1 vor dem Gefach ist nur 4 px breit. Zäune verbinden sich mit vollen Blöcken und anderen Holzzäunen, nicht senkrecht [19]. Die Verbindung zum Gefach in d=0 liegt direkt hinter dem Pfosten und ist von vorn unsichtbar. Seitlich darf kein voller Block und kein Zaun direkt danebenstehen, sonst entsteht ein waagerechter Steg.
- **Blöcke:** `dark_oak_fence` (Zustände vom Auflöser), Gefach `white_terracotta` oder `calcite`, Hauptständer `dark_oak_log`.
- **Maße:** Zaun auf jeder 2. Spalte zwischen Hauptständern im Abstand 4–6, nie direkt neben einem Ständer. Brüstungsriegel nur bei Geschosshöhe 5 (Midlands-Stil; im Osten selten [39]).
- **Skizze:** Ansicht Süd, OG, W=11, Geschosshöhe 4:
```
u:   -1  0  1  2  3  4  5  6  7  8  9 10 11
r4    W  =  =  =  =  =  =  =  =  =  =  =  W      Rähm
r3    L  #  |  #  |  g  F  g  |  #  |  #  L      | = dark_oak_fence in d=+1 (vor Gefach #)
r2    L  #  |  #  |  g  F  g  |  #  |  #  L      g = glass_pane d=0; F = Fensterständer dark_oak_log[axis=y] d=0 (W19)
r1    L  #  |  #  |  #  #  #  |  #  |  #  L      Zäune bei u=1,3,7,9: nie direkt neben L
r0    W  =  =  =  =  =  =  =  =  =  =  =  W      Bressummer über der Auskragung
```
  (Hauptständer nur an den Ecken u=−1 und 11; bei W ≥ 13 zusätzlich ein Bundständer in der Mitte.)
- **Einsatz:** Tudor-Variante, Obergeschosse und Giebel; das EG in Stein oder Ziegel.
- **Wirkung/Aufwand:** hoch / niedrig.
- **Stile:** medieval (tudor), fantasy (Storybook).
- **Quellen:** [19][39][40]; Technik als Einschätzung, im Spiel nicht getestet.

### T7 Stein-EG und Steinhaus: Eckquader, Gewände, Gurtgesims, Schwelle auf Stein
- **Beschreibung:** Ein Stein-EG hat keine Holzständer. Ecken bekommen eine Verzahnung aus helleren oder dunkleren Quadern, Fenster steinerne Gewände. Ein Gurtgesims markiert die Geschosslinie; darauf liegt die hölzerne Schwelle des Fachwerk-OG.
- **Belege:** Stein trägt die Struktur, Holz die Wärme. Ein Gurtgesims aus `tuff_bricks` oder `polished_andesite`; Tuff ergänzt Steinziegel [1]. Steinwerke hatten massive Mauern (1–3 m), einen hohen Eingang und gewölbte Geschosse, oft mit Fachwerk-Vorderhaus [36].
- **Blöcke:**
  - Wand `stone_bricks` mit Verwitterung `cracked_stone_bricks` und `mossy_stone_bricks` unten.
  - Quader und Gewände `tuff_bricks` (L* 42,7) oder `polished_andesite` (55,9).
  - Gesims `tuff_brick_stairs[half=top,facing=north]` in d=+1.
- **Skizze:** Ansicht Süd, Ostecke des EG (Ecke u=10, Wand d=0), y=1…5:
```
u:     7  8  9 10       (ab u=10 Ecke; auf der Ostseite gegengleich)
y5     s  s  Q  Q        Q = tuff_bricks (Eckquader), s = stone_bricks-Mix
y4     s  s  s  Q
y3     s  s  Q  Q        Verzahnung: abwechselnd 2 und 1 Block in die Fassade
y2     s  s  s  Q
y1     s  s  Q  Q
y0     P  P  P  P        P = Sockel
```
- **Einsatz:**
  - Stein-EG aller Fachwerkvarianten: in `walls.ts:166` bei Stein-EG keine Ständer setzen.
  - Steinhaus und Burgnebenbau komplett.
- **Wirkung/Aufwand:** hoch / niedrig.
- **Stile:** medieval, nordic (Sockel), mediterranean (Quader in Kalk).
- **Quellen:** [1][36]; Verzahnung als Einschätzung.

### T8 Steildach mit Aufschiebling und Ortgangbrett
- **Beschreibung:** Neigungen: 45–60° in der Regel, Stroh 45–55° [50]; „shallow reads modern“ [1]. Der Schwarzwald hat einen weit herabgezogenen Walm oder Krüppelwalm mit 45–50° [35]. Das niederdeutsche Hallenhaus hat ein weit heruntergezogenes Dach, in Mecklenburg und Holstein als Krüppelwalm, in Westfalen als Sattel [33][34]. An der Traufe flacht ein Aufschiebling ab (die Kurve, die heute `flared` heißt); oben bleibt das Dach steil.
- **Generator:**
  - Neue Profile `steep_flared` (Δ 2, dann 4, 4, …) und `steep56` (Δ 4, 2, 4, 2, …; ≈ 56°).
  - Anstiegsgrenze für medieval auf `min(10, 2 × Geschosshöhe)`.
  - Abflachen von der Traufe her statt vom First, damit das Dach nicht konvex wird.
  - Ortgang (`roofTrim`) aus dunklem Holz bei Fachwerkgiebeln.
- **Skizze:** Profil `steep_flared`, Querschnitt einer Dachhälfte (W=9), Spalte c=0 ist die Traufe:
```
c:    0  1  2  3  4
y8                 ^       ^ = First (Stufe)
y7              S  ■
y6              ■  ■       S = <dach>_stairs, ■ = voller Dachblock
y5           S  ■  ■
y4           ■  ■  ■
y3        S  ■  ■  ■
y2        ■  ■  ■  ■
y1     S  ■  ■  ■  ■       c=0: Δ=2 (45°), ab c=1: Δ=4 (63°)
```
- **Einsatz:** alle medieval-Varianten, Handwerkerhaus auch 45°.
- **Wirkung/Aufwand:** hoch / niedrig, als Daten in `profiles.ts` plus eine Zeile in `roofEngine.ts`.
- **Stile:** medieval, fantasy, nordic.
- **Quellen:** [1][33][35][50]; Details zum Dach → Dach-Thema.

### T9 Schornstein: massiv, Krone, verdecktes Feuer
- **Beschreibung:** Schornsteine ragen mindestens 2 Blöcke über das Dach [4]. Rauch steigt beim Lagerfeuer etwa 10 Blöcke, mit `hay_block` darunter 24 Blöcke. Er dringt nur durch einen Block direkt darüber; eine Falltür sperrt ihn ganz [18]. Tudor: prunkvolle Ziegelschornsteine in gedrehten Mustern, sogar Attrappen ohne Feuerstelle [41].
- **Blöcke:**
  - Bruchsteinkamin: `bricks` oder `cobblestone` als Schaft, Kragband `brick_stairs[half=top]`, Krone `brick_wall` als Ring.
  - Feuer: `campfire[lit=true,signal_fire=true]` eine Ebene unter der Krone, darunter `hay_block`.
- **Skizze:** Draufsicht auf den Kaminkopf (3×3):
```
Krone y=t:      darunter y=t-1:    y=t-2:
w  w  w         B  B  B            B  B  B      w = brick_wall (Ring, Ecken als Pfosten)
w  .  w         B  C  B            B  H  B      C = campfire[lit=true,signal_fire=true]
w  w  w         B  B  B            B  B  B      H = hay_block (hoher Rauch), B = bricks
```
- **Tudor-Variante:** zwei Schäfte `brick_wall` auf einem 3×1-Sockel mit Lücke dazwischen; das Feuer steht in der Lücke eine Ebene unter den Kappen (`brick_slab[type=bottom]`).
- **Einsatz:**
  - Mittelgroße und größere Häuser.
  - Handwerkerhaus: Schmiedeesse mit Ziegelkamin über der Ecke [5].
  - Winter: immer `signal_fire=true`.
- **Wirkung/Aufwand:** mittel / niedrig.
- **Stile:** medieval, rustic, nordic, fantasy.
- **Quellen:** [4][5][18][41]

### T10 Ladenluke (Verkaufsfenster des Handwerkerhauses)
- **Beschreibung:** Eine Erdgeschossöffnung mit hochgeklapptem Laden als Vordach und heruntergeklapptem Laden als Theke. Waren stehen als kleine Blöcke auf der Theke.
- **Blöcke:**
  - Vordach: `spruce_trapdoor[facing=south,half=top,open=false]` in d=+1, oberste Öffnungsreihe.
  - Theke: `spruce_slab[type=top]` in d=+1, eine Reihe unter der Öffnung.
  - Waren: `flower_pot`, `potted_fern`, `candle[candles=1..3]`, `lantern[hanging=false]`.
  - Öffnung: `glass_pane` in d=0, weil die Innenräume leer bleiben.
  - Rahmen: Ständer und Sturz (Rähm).
- **Skizze:** Ansicht Süd, EG, Öffnung 3×2:
```
u:     -1  0  1  2  3
y4      W  =  =  =  W      Rähm/Sturz
y3      L  T  T  T  L      T = spruce_trapdoor[facing=south,half=top,open=false] d=+1 (darunter g in d=0)
y2      L  g  g  g  L      g = glass_pane d=0; auf der Theke davor: c = candle / flower_pot (d=+1, y2)
y1      L  S  S  S  L      S = spruce_slab[type=top] d=+1 (Theke), dahinter Wand d=0
y0      P  P  P  P  P
```
- **Einsatz:** Handwerkerhaus und Laden, EG zur Straße; als neue Vorlage **W20**.
- **Wirkung/Aufwand:** hoch (sofort lesbar „Werkstatt“) / niedrig.
- **Stile:** medieval, rustic, Marktstand-Kontext.
- **Quellen:** Einschätzung; Falltüren als Markisen bei mittelalterlichen Häusern [57] (ExitLag-Snippet in `fenster_tueren_details.md`).

### T11 Wandarm-Laterne (Ausleger)
- **Beschreibung:** Ein Ausleger aus zwei Zäunen, der vom Ständer absteht, mit einer Hängelaterne. Laternen hängen unter Ketten, Gittern, Scheiben und vollen Unterseiten [17]; T02 nutzt Zaun-Arme bereits im Repo.
- **Blöcke:** `dark_oak_fence` in d=+1 und d=+2 (verbinden sich zur Wand und miteinander), `lantern[hanging=true]` unter dem äußeren Zaun.
- **Skizze:** Schnitt, Außen rechts:
```
         d:  0    +1   +2
y            L    f    f       f = dark_oak_fence (Arm)
y-1          #    .    Λ       Λ = lantern[hanging=true]
```
- **Einsatz:** neben der Tür auf Sturzhöhe; an Wirtshaus und Handwerkerhaus 1–2 je Straßenfassade; Laternen sonst unter der Schwelle (T4).
- **Wirkung/Aufwand:** mittel / niedrig.
- **Stile:** medieval, rustic, fantasy, nordic.
- **Quellen:** [17], `doors.ts:84–94`.

### T12 Treppengiebel (Steinhaus der Nordvariante)
- **Beschreibung:** Die Giebelmauer steigt in Stufen über die Dachfläche. Das ist typisch für Flandern, die Niederlande und die norddeutsche Backsteingotik; in Flandern sind die Stufen kleiner und zahlreicher, in Norddeutschland größer [51].
- **Blöcke:**
  - Mauer: `stone_bricks` oder `bricks`.
  - Abdeckung: `stone_brick_slab[type=bottom]` bzw. `brick_slab`.
  - Mittelpfeiler: Kappe `stone_brick_wall`.
  - Das Dach endet hinter der Mauer: auf dieser Seite kein Ortgangüberstand.
- **Maße:** Stufe 2 breit × 2 hoch bei 45°, 2 × 4 bei 63°. Die Oberkante liegt 1 über der Dachfläche, der Mittelpfeiler 1–2 über dem First.
- **Skizze:** Ansicht Süd, Giebel W=9 (u=0…8), Dach 45°:
```
u:    0  1  2  3  4  5  6  7  8
h7                S                     S = stone_brick_slab[type=bottom]
h6                B
h5          S  S  B  S  S               B = stone_bricks (Giebelmauer d=0)
h4          B  B  B  B  B
h3    S  S  B  B  B  B  B  S  S
h2    B  B  B  B  B  B  B  B  B
h1    B  B  B  B  B  B  B  B  B
```
- **Einsatz:** Steinhaus (niedersächsisch-hanseatisch), groß und riesig; nie mit Fachwerkgiebel kombiniert.
- **Wirkung/Aufwand:** hoch / mittel, braucht eine Option `gable: 'stepped'` in der Dach-Engine.
- **Stile:** medieval (steinhaus), nordic.
- **Quellen:** [51][36]

### T13 Hölzerner Wehrgang (Hoarding) am Burgnebenbau und Turm
- **Beschreibung:** Eine hölzerne Galerie auf Balken durch Rüstlöcher (Putlogs) oder auf Kragsteinen, überdacht. Später wurde sie durch steinerne Maschikulis ersetzt [53].
- **Blöcke:**
  - Balkenköpfe `spruce_log[axis=z]` (Süd) alle 3 Blöcke.
  - Boden `spruce_slab[type=top]`, Wand `spruce_planks`.
  - Schießluke `spruce_trapdoor[open=true]`.
  - Pultdach `spruce_stairs[half=bottom]`, steigend zur Mauer.
- **Skizze:** Schnitt durch die Mauerkrone, Außen rechts:
```
          d:  -1   0    +1   +2
y+4                R    R    .      R = spruce_stairs[facing=north,half=bottom]
y+3                #    P    .      P = spruce_planks, je 3. Spalte spruce_trapdoor[facing=south,half=bottom,open=true]
y+2                #    P    .
y+1           .    #    F    .      F = spruce_slab[type=top] (Galerieboden)
y             .    #    C    .      C = spruce_log[axis=z] alle 3 Blöcke, dazwischen Luft
```
- **Einsatz:** Burgnebenbau, Torhaus, Turm (statt Zinnen bei Detailgrad 3).
- **Wirkung/Aufwand:** hoch / mittel.
- **Stile:** medieval (burg), nordic (Holzburg).
- **Quellen:** [53][7]

### T14 Zinnen 2:1 bis 3:1, Schießscharten, Anlauf
- **Beschreibung:**
  - Die Zinnenlücke misst real ein Drittel der Zinne [52]; Builder-Guides nehmen 1:1 [6][7] oder „2 hoch / 1 Lücke“ [1].
  - Empfehlung (Einschätzung): Periode 3 (Zinne 2, Lücke 1) an Türmen, Periode 4 (3:1) an langen Mauern.
  - Schießscharten aus halb offenen Falltüren [7].
  - Mauern unten 3–4 dick, nach oben verjüngt; Strebepfeiler alle 8–10 Blöcke [7].
- **Skizze:** Brüstung abgewickelt, Periode 3:
```
       M  M  .  M  M  .  M  M  .
oben   S  S     S  S     S  S        S = stone_brick_slab[type=bottom] (Abdeckung, optional)
       B  B  .  B  B  .  B  B  .     B = Wandmaterial, . = Scharte
       B  B  B  B  B  B  B  B  B     Brüstung 1 hoch
```
- **Regel Rundturm:** Ringlänge N wird in Perioden zu 3 geteilt; ein Rest von 1–2 verteilt sich als breitere Zinnen auf die Achsen.
- **Einsatz:** Turm, Burgnebenbau, Torhaus.
- **Wirkung/Aufwand:** mittel / niedrig.
- **Stile:** medieval (burg).
- **Quellen:** [1][6][7][52]

---

## (a) Kennzeichen des Stils

**In echter Architektur**
- Sockel und oft das EG aus Stein; Obergeschosse als Fachwerk; Stockwerkbau mit Auskragung, Knaggen und Balkenköpfen [25][31][42].
- Steiles Sattel- oder Krüppelwalmdach, Ziegel, Schiefer, Schindel oder Stroh [33][35][50]. Massive Schornsteine, beim Tudor prunkvoll [41].
- Kleine Fenster, im Fachwerk direkt unter dem Rähm. Butzenscheiben (7–15 cm, grünliches Waldglas, in Blei) sind seit dem 14. Jahrhundert belegt [38]; im Tudor Sprossen- und Kreuzstockfenster sowie Erker (Oriel) auf Konsolen [41][49].
- Holzfarbe: Eiche roh (silbergrau verwittert), gekalkt, ocker oder rot gefasst; schwarz-weiß erst im 19. Jahrhundert [44][45][46]. In der Schweiz rote Balken auf weißem Gefach [25].

**In Minecraft**
- Stein trägt, Holz wärmt [1]. Wand eine Ebene hinter dem Rahmen [2][8]. Jetty mit Kopfüber-Treppen [2][4].
- Dachüberstand ≥ 1, Kamin oder Gaube, damit der First keine lange Linie bleibt [2].
- Laternen statt Fackeln [1]; Laternen hängen von Ständern und Auslegern.
- Wenige Materialien mit klarer Rangordnung: „palette chaos“ ist der häufigste Fehler; nur Stein wirkt drückend, nur Holz haltlos [1].
- Profis variieren über Untertypen mit eigener Größe:
  - Switchblade: Kate 10×8, Schmiede 12×8, Taverne 14×10, Herrenhaus 18×14 [1].
  - Blockwerk: Herrenhaus 17×9 mit Flügel 7×8 [4], Schmiede 8×6 [5].

---

## (b) Untervarianten mit Erkennungsmerkmalen

| Variante | Erkennungsmerkmale (real) | Umsetzung im Generator | Quellen |
|---|---|---|---|
| **Englisches Tudor** | Close studding (Osten) oder Quadratfelder mit Zierformen (Westen); Jetty mit Bressummer; Oriel; Ziegelschornsteine; Tudorbogen; Pargeting in Suffolk und Essex | `timber:'all'` oder Ziegel-EG; T6 Zaunständer; Bogen-Kehlen an den Ecken; traufständig (W>D); Dach `bricks` oder Schindel; Kamin T9-Tudor; Fenster W19, Erker W09 | [39][40][41][42][47][49] |
| **Fachwerk alemannisch** | Weite Ständerstellung, angeblattete lange Kopf- und Fußbänder, klare Konstruktionslinien, Fenstererker; Südwesten, Schweiz, Elsass; großer Krüppelwalm im Schwarzwald | p=4–5; F2 lange Streben an den Ecken; Fensterband (W19 gereiht); Dach `half_hip` und `steep_flared`; traufständig; Rahmen dunkel | [24][25][35] |
| **Fachwerk fränkisch / hessisch** | Mann, Wilder Mann, Hessenmann an Eck- und Bundständern; geschweifte Andreaskreuze, Rauten; zierreich; 1470–1550 Übergang | p=3; F3 Mann (Geschosshöhe 5) oder F1 K-Strebe (Geschosshöhe 4) an den Ecken; F5 Raute und F6 Andreaskreuz in Brüstungen; giebelständig (W<D); Holz natur oder rot gefasst | [23][27][28][25][56] |
| **Fachwerk niedersächsisch** | Enges Ständerraster, Fußstreben, ab 1532 Fächerrosetten in den Brüstungen; Balkenköpfe mit Knaggen; Ziegelausfachung im Norden; Hallenhaus mit Dielentor im Giebel, Pferdeköpfen und Uhlenloch | p=2; F7 Fächerrosette und F8 Fußwinkel; T4 mit Balkenköpfen; Gefach `bricks`; giebelständig; Dielentor T12; Uhlenloch | [30][26][33][34] |
| **Steinhaus / Steinwerk** | Massiv, fast quadratisch, mehrgeschossig, hoher Eingang, kleine Fenster; Treppengiebel im Norden | `timber:'none'`; T7 Quader und Gewände; T12 Treppengiebel; Fenster W06, W02, W07 (Spitzbogen nur oben); Tür T04 oder T03 erhöht (T07); Dach Schiefer | [36][51] |
| **Handwerkerhaus** | Niedriges Bruchstein-EG, Werkstatt offen, Bretter-OG, Ziegelkamin über der Esse, Ladenluke | EG `cobblestone`, OG Bretter; T10 Ladenluke; T9 Kamin an der Ecke; Anbau als Pultdach (Schmiede offen auf Ständern, 2 Wände Stein [5]) | [5][1] |
| **Burgnebenbau** | Stall, Scheune, Torhaus an der Mauer: Stein-EG, hölzernes Obergeschoss oder Wehrgang, Zinnen, Schießscharten | `timber:'upper'` nur zur Hofseite; T13 Hoarding; T14 Zinnen; Fenster W14; Pultdach an die Mauer | [7][52][53] |

---

## (c) Paletten nach unseren Rollen (mit Gewichten)

Alle sechs bestehen die Lints in `lints.ts`:
- Rahmen oder Dach mit ΔL* ≥ 15 zur Wand;
- Dach ≠ Wand;
- 3–5 Familien, auch für jede Alternative einzeln geprüft;
- keine verbotenen Teile;
- Dach mit Treppen;
- alle Formen in 1.21.1 und 1.21.11.

`pale_oak_*` (silbergraue Eiche) wäre ideal für „verwitterte Eiche“, fällt aber durch den Versionslint, der beide Profile verlangt. Brauchbar wäre es nur in einem Paletten-Zusatz, der allein für 1.21.11 gilt.

Rollen, die nicht genannt sind: `window: glass`, `floor: spruce_planks`, `path: cobblestone`, `accent: red_wool` (unverändert; der Akzent wird nur vom Parser genutzt).

```ts
// P1 Englisches Tudor – Fachwerk über Stein-EG, Ziegeldach, Ziegelkamin
{ id: 'medieval_tudor_en', roles: {
  plinth: [['stone_bricks', 3], ['cobblestone', 1]],
  wall: one('stone_bricks'),                         // L* 51,1
  upperWall: [['white_terracotta', 3], ['calcite', 1]],
  infill: [['white_terracotta', 3], ['calcite', 1]],  // 74,9 / 89,1
  frame: [['dark_oak_log', 3], ['stripped_dark_oak_log', 1]], // 20,2 / 25,1 – Streben dark_oak_stairs 19,8
  beam: one('dark_oak_log'),
  roof: one('bricks'),                               // Ziegel 46,9 (Mittelalter-Ziegeldach, de.minecraft.wiki)
  roofTrim: one('dark_oak_planks'),                  // Ortgangbrett
  ridge: one('bricks'), soffit: one('dark_oak_planks'),
  shutter: one('dark_oak_planks'), door: one('spruce_planks'), chimney: one('bricks'),
}}  // Familien: stone, white_terracotta(+calcite), dark_oak, brick (+cobblestone) → 4–5; ΔL Rahmen/Wand 30,9

// P2 Fränkisch-hessisch, rot gefasst („Ochsenblut“, Einschätzung; belegt für die Schweiz [25])
{ id: 'medieval_franken', roles: {
  plinth: [['cobblestone', 2], ['granite', 1]],       // granite als Buntsandstein-Anmutung (Einschätzung)
  wall: [['white_terracotta', 2], ['stone_bricks', 1]],// verputztes oder steinernes EG
  upperWall: [['white_terracotta', 3], ['calcite', 1]],
  infill: [['white_terracotta', 3], ['calcite', 1]],
  frame: one('stripped_mangrove_log'),               // 31,5, rot; Streben mangrove_stairs 31,2
  beam: one('stripped_mangrove_log'),
  roof: one('bricks'), ridge: one('bricks'),         // Biberschwanz-Anmutung
  roofTrim: one('mangrove_planks'), soffit: one('mangrove_planks'),
  shutter: one('spruce_planks'), door: one('spruce_planks'), chimney: one('bricks'),
}}  // Familien: cobblestone, white_terracotta, mangrove, brick (+granite/stone/calcite) → 4–5; ΔL 43,4

// P3 Alemannisch – dunkles Holz, Kalkputz, Schindeldach
{ id: 'medieval_alemannisch', roles: {
  plinth: [['cobblestone', 2], ['mossy_cobblestone', 1]],
  wall: [['calcite', 2], ['white_terracotta', 1]],    // gekalktes Stein-EG
  upperWall: [['white_terracotta', 2], ['calcite', 1]],
  infill: [['white_terracotta', 2], ['calcite', 1]],
  frame: [['dark_oak_log', 2], ['stripped_spruce_log', 1]], // Streben dark_oak_stairs bzw. spruce_stairs (ΔL ≤ 2)
  beam: one('dark_oak_log'),
  roof: one('spruce_planks'), ridge: one('spruce_planks'), soffit: one('spruce_planks'), // Schindeln 38,3
  roofTrim: one('dark_oak_planks'),
  shutter: one('spruce_planks'), door: one('spruce_planks'), chimney: one('cobblestone'),
}}  // Familien: cobblestone, calcite, white_terracotta, dark_oak, spruce → 5; ΔL 68,9; Dach < 40 → keine Warnung

// P4 Niedersächsisch – Ziegelausfachung, Schiefer
{ id: 'medieval_niedersachsen', roles: {
  plinth: [['cobblestone', 2], ['mossy_cobblestone', 1]],  // Feldstein
  wall: one('bricks'),                               // 46,9
  upperWall: one('bricks'),
  infill: [['bricks', 3], ['white_terracotta', 1]],  // Backstein- oder Putzgefach
  frame: [['dark_oak_log', 2], ['stripped_dark_oak_log', 1]],
  beam: one('dark_oak_log'),
  roof: one('deepslate_tiles'), ridge: one('deepslate_tiles'), // 22,9 (Harz/Weser-Schiefer)
  roofTrim: one('dark_oak_planks'), soffit: one('dark_oak_planks'),
  shutter: one('dark_oak_planks'), door: one('dark_oak_planks'), chimney: one('bricks'),
}}  // Familien: cobblestone, brick, dark_oak, deepslate (+white_terracotta) → 4–5; ΔL Rahmen 26,7, Dach 24,0

// P5 Steinhaus / Burgnebenbau – Steinziegel, Tuff-Gewände, Schiefer (timber: 'none')
{ id: 'medieval_steinhaus', roles: {
  plinth: [['cobblestone', 2], ['cobbled_deepslate', 1]],
  wall: [['stone_bricks', 3], ['tuff_bricks', 1]],
  upperWall: [['stone_bricks', 3], ['spruce_planks', 1]], // Holz-OG auf Stein (Sereyka „Spruce House 2“ [2])
  infill: one('stone_bricks'),
  frame: one('tuff_bricks'), beam: one('tuff_bricks'), // Eckquader, Gewände, Gurtgesims (Säulenform fällt auf Block zurück)
  roof: one('deepslate_tiles'), ridge: one('deepslate_tiles'),
  roofTrim: one('deepslate_bricks'),                 // 29,9: leise Kante statt heller Steinkontur
  soffit: one('spruce_planks'),
  shutter: one('dark_oak_planks'), door: one('dark_oak_planks'), chimney: one('stone_bricks'),
}}  // Familien: cobblestone, stone, tuff, deepslate, spruce → 5; ΔL Dach/Wand 28,2

// P6 Handwerkerhaus – Bruchstein-EG, Bretter-OG, dunkles Schindeldach
{ id: 'medieval_handwerk', roles: {
  plinth: [['mossy_cobblestone', 2], ['cobbled_deepslate', 1]],
  wall: one('cobblestone'),                          // 53,1
  upperWall: [['spruce_planks', 2], ['stripped_spruce_log', 1]], // stripped log = senkrechte Bohlen (Einschätzung)
  infill: one('spruce_planks'),
  frame: [['dark_oak_log', 2], ['stripped_spruce_log', 1]],
  beam: one('dark_oak_log'),
  roof: one('dark_oak_planks'), ridge: one('dark_oak_planks'), // 19,8
  roofTrim: one('spruce_planks'), soffit: one('spruce_planks'), // helle Kante auf dunklem Dach [8]
  shutter: one('spruce_planks'), door: one('spruce_planks'), chimney: one('bricks'),
}}  // Familien: cobblestone, spruce, dark_oak (+deepslate) → 3–4; ΔL 32,9
```

Hinweis zur Mischung: Die Generator-Regel „ein Material pro Rolle und Gebäude“ (`palettes.ts:2–4`) bleibt richtig. Die Textur-Mischung kommt aus den Verwitterungslisten. Für P5 empfiehlt die alte Notiz stone_bricks 60 / cracked 25 / mossy 15 [1]; das steht schon in `materials.ts` als Verwitterung von `stone_bricks`.

---

## (d) Proportionen je Größe

Vorschlag für die Hauptmasse. W ist die Nordfassade (Eingang), D die Tiefe. Die Firstrichtung folgt heute der längeren Seite (`plan.ts:199`):
- giebelständig: W<D (Giebel zur Straße);
- traufständig: W>D.

| Größe | giebelständig W×D | traufständig W×D | Geschosse | Geschosshöhe EG/OG | Dach (Profil, Anstieg) | Überstand Traufe/Ortgang | Sockel | Jetty |
|---|---|---|---|---|---|---|---|---|
| klein | 7×11 | 11×7 | 1 + Dachgeschoss | 5 | `steep_flared`, Anstieg 6–7 | 1 / 1 | 1 | 0 |
| mittel | 9×13 | 13×9 | 2 | 5 / 4 | `steep_flared` oder `steep56`, 7–8 | 1 / 1 | 1–2 | 1 an 2 Seiten |
| groß | 11×17 (+ Zwerchhaus) | 17×11 | 2–3 | 5 / 4 / 4 | `steep56`, 8–9 | 1 / 1 | 2 | 1 je OG, max. 2 |
| riesig | 13×21 + Flügel 9×11 (L/T) | 21×13 + Flügel | 3 | 5 / 5 / 4 | `standard`–`steep56`, Walm oder Krüppelwalm, 9–10 je Abschnitt | 1–2 / 1 | 2–3 | 1 je OG, max. 2 |

Begründung:
- Builder-Größen: Kate 10×8 bis Herrenhaus 18×14 [1]; Herrenhaus 17×9 + 7×8 [4]. Stadthaus ≤ 8×10 bei 3 Geschossen, Landhaus bis 20×15 (alte Notiz). Hallenhaus 13×27 m, also 1:2 [34].
- Verhältnis Tiefe zu Breite: 1,4–1,9 (Einschätzung aus diesen Beispielen).
- Das EG ist 1 höher als die OG (alte Notiz, „EG darf 1 höher sein“).
- Der Dachanstieg entspricht 1–2 Geschossen; das Blockwerk-Herrenhaus hat 7 Lagen Dach über 9 Tiefe (≈ 57°) [4].
- Grenzen: ab Breite 13 und 45° ist der Anstieg ≥ 7. Dann den Baukörper teilen (Flügel, Zwerchhaus) statt das Dach abzuflachen → Thema 19.

Varianten-Abweichungen:
- Tudor: traufständig, Jetty an der Traufe.
- Niedersachsen: giebelständig, D ≈ 2 × W, Traufe niedrig (Wandhöhe 1 Geschoss + hohes Dach) [33][34].
- Steinhaus: fast quadratisch (W ≈ D) [36], 2–3 Geschosse, Jetty 0.
- Handwerkerhaus: klein oder mittel, 1–2 Geschosse, Anbau mit Pultdach.

---

## (e) Bevorzugte Dachformen und -profile

| Form | Gewicht neu (heute) | Varianten | Bemerkung |
|---|---|---|---|
| Sattel `gable` | 0,50 (0,55) | alle | Standard |
| Krüppelwalm `half_hip` | 0,25 (0,25) | alemannisch, niedersächsisch, groß | Walmteil ≈ ⅓ der Giebelhöhe [13][33][35] |
| Walm `hip` | 0,10 (0,10) | Steinhaus, riesig | bei großer Tiefe |
| Saltbox / Pult `saltbox` | 0,15 (0) | Handwerkerhaus, Anbau (englisch „catslide“) | lange Seite zur Wetterseite [13] |
| Gambrel, Mansard, Pagode, Kuppel | 0 (0,10) | – | neuzeitlich bzw. fremd |

Profile neu: `steep_flared` 0,35 (neu), `steep` 0,25, `steep56` 0,20 (neu), `standard` 0,10, `flared` 0,10. Der First als `slab` bei Holz- und Ziegeldach, `block_slab` bei Schiefer.

Ergänzungen:
- **Zwerchhaus** statt Gaube auf der Traufseite großer Häuser: die Fassade läuft durch, eigener Giebel, Höhe ≈ 150 % der Breite [37].
- **Schleppgaube** (Pult) für Dachgeschosse kleiner Häuser.
- **Ortgang:** immer 1 Überstand mit Untersicht aus Kopfüber-Treppen (vorhanden). Kante in dunklem Holz (P1–P4, P6) oder dunklem Schiefer (P5).

---

## (f) Fachwerkmuster als Raster

Alle Muster liegen in der Rahmenebene d=+1, das Gefach in d=0 dahinter. Sie werden als Daten wie W/T abgelegt (`timberPatterns.ts`) und in Feld-Koordinaten gesetzt (u relativ zum linken Feldrand, r ab Schwelle). Gespiegelte Fassung = Spalten umkehren und ◢↔◣, ◥↔◤ tauschen.

**F1 K-Strebe** (Geschosshöhe 4, 3 Wandreihen; links und rechts eines Ständers p; je 2 Zellen):
```
u:   p-2 p-1  p  p+1 p+2
r4    =   =   W   =   =
r3    ◥   ◣   L   ◢   ◤
r2    #   ◢   L   ◣   #
r1    ◢   ◤   L   ◥   ◣
r0    =   =   W   =   =
```
Eckständer: nur die innere Hälfte. Bundständer: beide Hälften. Wurde um 1500 durch den Mann verdrängt; als „Halber Mann“ an Ecken verbreitet [24][23].

**F2 Lange Strebe** (alemannisch, geschosshoch, zum Eckständer steigend), Feld 4 breit, 3 Reihen (Eckständer rechts bei u=4):
```
u:    0  1  2  3  L
r3    #  #  #  ◢  L
r2    #  #  ◢  ◤  L
r1    #  ◢  ◤  #  L
r0    =  =  =  =  W
```
Regel: Band „/“ ab a = Feldbreite − Reihen (T2); links am anderen Eckständer gespiegelt. Fenster sitzen nur in den Feldern zwischen den beiden Streben.

**F3 Mann** (Geschosshöhe 5, 4 Wandreihen, je Seite 3 Zellen; „Fußbänder von unten, überschneidende Kopfbänder von oben“ an Eck- und Bundständern [23]):
```
u:   p-3 p-2 p-1  p  p+1 p+2 p+3
r5    =   =   =   W   =   =   =
r4    ◥   ◣   #   L   #   ◢   ◤
r3    #   ◥   W   L   W   ◤   #
r2    #   ◢   ◤   L   ◥   ◣   #
r1    ◢   ◤   #   L   #   ◥   ◣
r0    =   =   =   W   =   =   =
```
Beine („/“ bzw. „\“) laufen von den unteren Feldecken zum Ständer, Arme von oben zum Ständer. Kreuzung bei r3 als `<holz>_wood`. Alle Treppen-Nachbarn haben verschiedene Hälften oder gegensinnige Facings, bleiben also `straight`. Hessenmann: Arme nur eine Reihe (r4: `◥ ◣` bzw. `◢ ◤` direkt am Ständer), Beine wie F3 [27].

**F4 Andreaskreuz** (geschlossenes Feld 4 breit × 3 Reihen; ab dem 19. Jahrhundert geschosshoch, vorher in Brüstungen [28]):
```
u:    L  0  1  2  3  L
r3    L  ◥  ◣  ◢  ◤  L
r2    L  #  W  W  #  L
r1    L  ◢  ◤  ◥  ◣  L
```

**F5 Raute** (Brüstung 2×2, unter einem 2 breiten Fenster bei Geschosshöhe 5):
```
u:    0  1
r2    ◢  ◣
r1    ◥  ◤
```
Gefüllte Mitte, offene Ecken. Barocke Rauten und geschweifte Andreaskreuze „mit Nasen“ waren Zierformen [28].

**F6 Brüstungskreuz** (Brüstung 3×2, unter einem 1 breiten Fenster mit Gefach links und rechts):
```
u:    0  1  2
r2    ◥  W  ◤
r1    ◢  W  ◣
```

**F7 Fächerrosette, halb** (Brüstung 2×1 oder 3×1; niedersächsisch, seit 1532, Brüstungen der Obergeschosse und des Giebels [30]):
```
2 breit:  r1   ◢  ◣          3 breit:  r1   ◢  W  ◣
```

**F8 Fußwinkel / Fußbänder** (Brüstung 1 Reihe, Kehlen an beide Ständer; gotische Fußstreben vor der Rosette [30]):
```
2 breit:  r1   ◣  ◢          3 breit:  r1   ◣  #  ◢
```

**F9 Kopfwinkel am Fenster** (Kehlen unter dem Rähm beidseits eines Fensters, nur wenn das Fenster nicht bis unter den Rähm reicht):
```
u:    0  1  2
r3    ◤  .  ◥        Mitte = Fenster (g in d=0); Kehlen an den Fensterständern
```

**Regeln: wann welches Muster**

1. **Felder klassifizieren** je Fassade und Geschoss:
   - E = Eckfeld (grenzt an einen Eckständer);
   - B = Bundfeld (grenzt an einen Bundständer in der Fassadenmitte oder an der Grenze eines Zwerchhauses);
   - F = Fensterfeld; T = Türfeld; G = Giebelfeld.
2. **Fenster zuerst, aber höchstens 40–60 %** der Felder eines Fachwerkgeschosses (Einschätzung): Mittelfelder bevorzugt, symmetrisch zur Fassadenachse bzw. Türachse. Eckfelder bleiben geschlossen; dort sitzen die aussteifenden Figuren, real ist das ihr Zweck [32].
3. **Figur je Variante:**

| Feld | Tudor Ost | Tudor West | alemannisch | fränkisch / hessisch | niedersächsisch |
|---|---|---|---|---|---|
| E (Geschosshöhe 4) | Kehle F8 + Zaunständer | F4 | F2 | F1 (Halber Mann) | F8 + Kopfwinkel |
| E (Geschosshöhe 5) | wie oben | F4 | F2 | F3 (Halbmann) | F8 |
| B | Zaunständer | F5 (2×2) | F2 gespiegelt | F3 voll | Ständer ohne Figur |
| Brüstung unter F | – | F5 | F8 | F5 / F6 | F7 |
| G (Giebel) | Ständer + Zäune | F4 | T5 + F2 | T5 + F3 | T5 + F7 |

4. **Höchstens zwei Figurentypen je Fassade plus ein Brüstungstyp.** Gleicher Typ auf allen Geschossen einer Fassade. Spiegelsymmetrisch zur Achse. Kopfbänder an Zwischenständern immer beidseitig [32].
5. **Schauseite reicher.** Straßenfassade und Hauptgiebel bekommen Figuren, Rück- und Hofseiten nur F8 (Fokuspunkt, alte Notiz [Craftdex]; Einschätzung).
6. **Stein-EG nie mit Figuren.** Fachwerk-EG (Tudor `all`) nur mit F8 und Türständern.
7. **Mindestmaße:** F1 braucht 2 Zellen je Seite, F3 und F4 3–4 Zellen bzw. 4 Reihen. Passt die Figur nicht, wird sie zum nächstkleineren Muster herabgestuft, nicht weggelassen (F3 → F1 → F8).
8. **Benennung:** „Feuerbock“ für geschweifte Andreaskreuze stammt aus der NS-Zeit und wird von Fachleuten abgelehnt [29]. In der UI heißt es „geschweiftes Andreaskreuz“.

**Bewertung der Bibliothek F1–F9:**
- Wirkung hoch. Figuren sind das Erkennungszeichen des deutschen Fachwerks.
- Aufwand mittel: Rasterdaten, Feldklassifikation und Spiegelung.
- Stile: medieval (alle Fachwerkvarianten), fantasy (F1, F4, F5 als „krumme“ Märchenbalken), rustic (nur F8).
- Die Raster F1–F9 sind eigene Ableitung aus T2 und den realen Formen [23][27][28][30]. Im Spiel sind sie nicht getestet: Jede Figur muss einmal mit echten Texturen geprüft werden (`scripts/screenshots.mjs`).

---

## (g) Fenster- und Türtypen

| Typ | Verwendung im Stil | Bewertung / Änderung |
|---|---|---|
| W02 Hochfenster mit Sims und Sturz | Steinhaus, Stein-EG | gut; Sturz aus `frame` (bei P5 Tuff-Gewände) |
| W03 Fenster mit Stammrahmen | Fachwerk-OG | gut; Oberkante = Rähm (Fenster direkt darunter); W03b (3×2) für Fensterbänder |
| W04 Fenster mit Klappläden | fränkisch, alemannisch | in Deutschland gängig, Tudor ohne Läden; Läden nur 1 von 2 Fenstern (Einschätzung) |
| W05 Blumenkasten | Handwerkerhaus, Gasthaus | sparsam, höchstens 1 je Fassade |
| W06 tiefe Laibung | Steinhaus, Burgnebenbau | gut |
| W07 Spitzbogen | Steinhaus (OG, Kapelle), Torhaus | nicht im Fachwerk |
| W09 Erker | Tudor (Oriel auf Konsolen) [49], alemannisch (Fenstererker [24]) | Konsolen = Knaggen wie T4 |
| W10 Gaube | Dachgeschoss | als Schleppgaube |
| W13 Bleiglas bunt | nur Kapelle oder Zunfthaus | bunte Scheiben gehören nicht ins Wohnhaus |
| W14 Schießscharte | Burgnebenbau, Turm | gut |
| **W19 neu: gekuppeltes Fenster** | Fachwerk, Tudor | 2× `glass_pane`-Spalte, dazwischen 1 Fensterständer `<holz>_log[axis=y]`, gemeinsamer Sims `<holz>_stairs[half=top]` und Rähm als Sturz; Breite 3 (1+1+1) oder 5 (2+1+2) |
| **W20 neu: Ladenluke** | Handwerkerhaus | siehe T10 |
| T01 Haustür mit Rahmen | Kate, Fachwerk | gut; sollte zuerst gewählt werden |
| T02 Oberlicht + Wandlaternen | Gasthaus, Tudor | gut (Ausleger T11) |
| T03 Doppeltür im Spitzbogen | Steinhaus groß, Burg | nach hinten in der Reihenfolge |
| T04 Rundbogennische | Steinhaus | gut |
| T05 Falltür-Vordach | Handwerkerhaus | gut |
| T06 Veranda | – | im Stil verbieten |
| **T11 neu: Tudorbogen in Holz** | Tudor | Doppeltür 2 breit; darüber in d=+1 `◤ ◥` aus der Rahmenrolle (Kehlen des gedrückten Vierpassbogens [41]), dahinter 2 `glass_pane` als Oberlicht in d=0 (wie T03, aber Holz) |
| **T12 neu: Dielentor mit Schlupftür** | niedersächsisch, Scheune | Öffnung 4×3 im Giebel; geschlossene Torflügel aus `spruce_trapdoor[open=true]` in d=0 an der Außenkante; eine echte `spruce_door` als Schlupftür; Torbalken `<holz>_log[axis=x]` darüber [33] (Einschätzung) |

---

## (h) Signatur-Details (machen den Stil sofort erkennbar)

1. **Stockwerksband mit Knaggen** unter jedem OG-Ständer, Knaggenbündel an der Ecke, Laterne dazwischen (T4).
2. **Figurenfachwerk an den Ecken** (K-Strebe, Mann oder Andreaskreuz) und **verzierte Brüstungen** unter den Fenstern (F1–F8).
3. **Fachwerkgiebel zur Straße** mit Kehlbalken, Firstständer und zwei Fenstern (T5); beim Steinhaus Treppengiebel (T12).
4. **Steiles Dach mit Aufschiebling** und dunklem Ortgangbrett (T8).
5. **Massiver Schornstein** über dem First mit hoher Rauchfahne (T9).
6. **Steinsockel mit Treppenschürze**, beim Stein-EG Eckquader (T7). Die Schürze ist vorhanden.
7. **Ausleger-Laterne** neben der Tür (T11) und Ladenluke beim Handwerker (T10).
8. **Holzstapel unter dem Vordach** (siehe (i)), ein kleines, sofort „bewohntes“ Detail.

---

## (i) Deko und Umgebung

Alle Elemente müssen Halt haben; sie stehen auf Grund oder an Wänden.
- **Holzstapel** an der Wand unter dem Dachüberstand:
  - Stämme `spruce_log[axis=x]` bzw. `[axis=z]` parallel zur Wand, 2–4 lang, 1–2 hoch.
  - Stirnseite mit Hirnholz zur Straße, darüber `spruce_slab[type=bottom]` als Abdeckung.
  - Einschätzung; jeder Block ist ein voller Block, daher stabil.
- **Brunnen:**
  - Ring aus `cobblestone_wall` 3×3 um eine vertiefte `cobblestone`-Sohle. Wasser (`water`, nicht in Registry) und Eis als Attrappe entfallen, Eis wirkt zu glatt.
  - Zwei `spruce_fence`-Pfosten, Querbalken `spruce_log[axis=x]`, daran `iron_chain` und `lantern[hanging=true]`.
  - Kleines Satteldach aus `spruce_stairs`.
- **Zäune:**
  - Flechtzaun-Anmutung aus `spruce_fence` mit Toren `spruce_fence_gate`.
  - Gartenmauer `cobblestone_wall` am Steinhaus [1].
- **Wege:**
  - Kopfsteinpflaster `cobblestone` und `stone`, Ränder `coarse_dirt`, `dirt_path` zum Eingang.
  - `gravel` (nicht in Registry).
- **Pflanzen:**
  - `vine` am Stein-EG der Nord- und Wetterseite, `moss_carpet` auf Sockel und Treppenschürze.
  - Kräutertöpfe `potted_fern` und `potted_red_tulip` auf Fensterbänken.
  - Hausbaum (Eiche) aus `oak_log` und `oak_leaves[persistent=true]`.
- **Werkstatt:**
  - `barrel`, `hay_block`, `campfire` in der Esse, `iron_bars` als Gitter vor der Glut [1].
  - Amboss, Schleifstein, Kessel, Glocke (`anvil`, `grindstone`, `cauldron`, `bell`; alle nicht in Registry) und Marktwaren `pumpkin`, `melon`.
- **Banner nur einfarbig.** Einfarbige Banner (`red_banner`, nicht in Registry) sind Block-Entities ohne Muster und damit erlaubt. Sie brauchen aber einen Registry-Eintrag und Halt; Bannermuster sind ausgeschlossen.
- **Keine Fackeln** [1]. `torch` und `wall_torch` (nicht in Registry) werden im Stil verboten.
- **Dichte (Einschätzung):** auf mittlerer Größe 2–3 Umgebungselemente, auf großer 4–5. Nie alles gleichzeitig; Profis wiederholen 2–3 Detailtypen (alte Notiz).

---

## (j) Winter- und Weihnachtsvariante

**Historischer Rahmen**
- Weihnachts- und Dezembermärkte gibt es seit 1296 (Wien), 1310 (München) und 1384 (Bautzen). Dort gab es geröstete Kastanien, Nüsse und Mandeln, später Spielzeug und Backwaren [54].
- Immergrün (Stechpalme, Efeu, Mistel) als Zeichen ewigen Lebens [55].
- Der erste Christbaum ist 1539 im Straßburger Münster belegt, Kerzen am Baum im 16. Jahrhundert, der Stern erst um 1840 [55].
- Der Adventskranz ist neuzeitlich (19. Jahrhundert). Als Türschmuck ist er stilistisch erlaubt, aber nicht „mittelalterlich“ (Einschätzung).

**Regeln für den Stil**

1. **Tannengrün statt Schleifenwürfel.**
   - Bündel aus `spruce_leaves[persistent=true]` über Tür und Erdgeschossfenstern, entlang des Stockwerksbandes (unter der Schwelle zwischen den Knaggen) statt nur unter der Traufe.
   - Akzent: `red_candle` auf Simsen. Die roten Schleifen aus `red_wool` entfallen im Stil medieval.
2. **Warmes Licht.**
   - Kerzen in allen Fenstern des OG (vorhanden).
   - Ausleger-Laternen (T11), Laternen unter dem Stockwerksband.
   - Keine Seelenlaternen.
3. **Kaminrauch:** `signal_fire=true` mit `hay_block` darunter, Rauch 24 Blöcke [18]; das Feuer liegt verdeckt (T9).
4. **Holzstapel** an jeder Haupt- und Hofseite (siehe (i)).
5. **Markt statt Geschenkwürfel.**
   - Statt bunter Wollwürfel 1–2 Marktbuden (Bautyp Marktstand) vor der Straßenfassade.
   - Waren: `barrel`, `pumpkin`, `hay_block` und `candle`.
   - Bei Weihnachten ein Baum mit `red_candle` bzw. `white_candle` statt farbiger Kugelwürfel (→ Winter-Thema).
6. **Schnee nur, wo er liegen bleibt.**
   - Schneeschichten nur auf vollen Oberseiten, nicht auf Eis; auf Kopfüber-Treppen geht es [15].
   - Ein Dach aus Normaltreppen trägt keinen Schnee. Schnee taut bei Blocklicht ≥ 12 [15]; um den Kamin (Lagerfeuer Licht 15 [18]) und unter Laternen bleibt es daher frei, und das ist realistisch.
   - Die Schneetechnik für Dächer gehört ins Winter-Thema.
7. **Kein amerikanisches Vordach.** Statt Veranda ein Pultvordach auf Kopfbändern über der Tür (T05/T05b).

---

## (k) Was den Stil kaputt macht

- **Wandfackeln** [1]; Akazie und Bambus [1]; Beton (Forbidden-Liste vorhanden); Quarz-Weiß als großes Gefach (zu glatt); gesättigte Farben (Wolle, Beton) als Flächen.
- **Gleichförmiges Holzgitter** ohne Rangordnung; Holzständer vor Steinwänden; Fachwerk mit Steingefach.
- **Streben in anderer Helligkeit als die Ständer** (siehe T3); Figuren zufällig verteilt oder asymmetrisch; mehr als zwei Figurentypen je Fassade.
- **Flache Dächer** („shallow reads modern“ [1]); Gambrel, Mansarde, Pagode, Kuppel; konvexe Dächer; helle Steinkontur auf dem Holz- oder Ziegeldach eines Fachwerkhauses.
- **Fenster in jedem Feld**; große Glasflächen; Glasblöcke; bunte Bleiglasfenster am Wohnhaus; Spitzbögen im Fachwerk.
- **Quadratischer Kasten** mit Zeltdach; leerer Giebel; Kamin mit offener Flamme.
- **Veranda, Doppeltür-Portal an der Kate, Eisentür.**
- **Bruchsteinturm neben Steinziegelhaus**; 1:1-Zinnen; ein Gurtband pro Geschoss.
- **Weihnachten:** farbige Geschenkwürfel, rote Wollschleifen, Seelenlaternen, Lichterketten aus Froglights.

---

## (l) Bewertung des aktuellen Stils `medieval` und konkrete Änderungen

| Aspekt | Ist | Soll (Recherche) | Änderung |
|---|---|---|---|
| Untervarianten | 3 Paletten, ein Regelwerk | 7 Varianten mit eigenen Regeln | `MEDIEVAL_VARIANTS` als Daten (Empfehlung 1) |
| Fachwerkbild | Gitter + seltene Eckkehlen | Hierarchie, Figuren F1–F9, Brüstungen | Figurenbibliothek + Feldklassifikation (2) |
| Giebel | flach | Kehlbalken, Firstständer, Figuren | `gableFrame()` (3) |
| Streben-Farbe | Tudor ΔL* 21 | ≤ 8 | Lint + Rolle `brace` (4) |
| Grundriss | quadratisch | 1:1,4–1:2, trauf- oder giebelständig | `styles.ts` Größen (5) |
| Dach | Anstieg ≤ 7, vom First abgeflacht | 55–63°, Aufschiebling | Profile, Kappe (5) |
| Stein-EG | Eckständer davor | Quader, Gesims | `walls.ts:166` (7) |
| Jetty | Konsole jede 2. Spalte | Knagge unter Ständer | `walls.ts:186` (6) |
| Fenster | in jedem Feld | 40–60 %, unter dem Rähm, gruppiert | `openings.ts` (8) |
| Paletten | Steingefach, Steinkontur, nur `white_terracotta` | P1–P6 | `palettes.ts` (1) |
| Dachformen | Gambrel 0,1 | Saltbox statt Gambrel | `styles.ts:71` (5) |
| Türen | T03 zuerst | T01 zuerst, T03 nur Steinhaus | `styles.ts:83` (9) |
| Turm | Bruchstein, Bänder je Geschoss, 1:1 | Hausmauerwerk, wenige Bänder, 2:1 | `roundTower.ts` (10) |
| Kamin | Flamme sichtbar | verdeckt, `signal_fire` im Winter | `components.ts` (11) |
| Festlich | Wollschleifen, Geschenkwürfel, Veranda | Tannengrün, Kerzen, Holz, Markt | `festive.ts`, `styles.ts` (12) |

---

## Fehler, die Profis vermeiden

1. **Wand bündig mit dem Rahmen.** Profis setzen das Gefach 1 Ebene zurück [2][8]. Der Generator tut das bereits; bei neuen Mustern beibehalten.
2. **Strebe ohne vollen Block dahinter.** Dann entstehen Lichtlücken, weil jede Treppe ¼ offen lässt (alte Notiz).
3. **Streben einseitig.** An Zwischenständern stehen Kopfbänder immer paarweise [32]; einseitige Figuren wirken schief.
4. **Holz auf Stein „angelehnt“.** Holz beginnt auf einer Schwelle, die auf dem Stein liegt, nicht davor.
5. **Rahmen und Dach in derselben Farbe wie die Wand.** Die ΔL*-Regel ist vorhanden; neu ist die Streben-Regel T3.
6. **Konsolen ohne Bezug.** Knaggen gehören unter Ständer oder Balkenköpfe [31], nicht in festem Takt.
7. **Steildach wird oben flach.** Abflachen gehört an die Traufe (Aufschiebling), nie an den First.
8. **Überall Fenster.** Real stehen Fenster in Bändern zwischen Fensterständern; Eckfelder bleiben zum Aussteifen geschlossen [32].
9. **Zu viele Materialien.** 3–5 Familien, eine Hierarchie [1]. Die Lints sind vorhanden.
10. **Anachronismus nach Gefühl.** Schwarz-weiß ist viktorianisch [44]; der Adventskranz stammt aus dem 19. Jahrhundert. Beides ist erlaubt, aber als bewusste Wahl. Für „historisch“ gibt es Ocker, Rot, rohe Eiche und Ziegel [45][46].
11. **Gleichförmigkeit über mehrere Häuser.** GDMC bewertet „consistent look“ und gleichzeitig „appropriate level of variation“; Wiederholung derselben Vorlage gilt als Fehler [22]. Daher: Variante und Figurensatz je Haus per Seed, Palette je Variante.

---

## Empfehlungen für den Generator (priorisiert)

| # | Was ändern | Modul | Daten / Regel | Akzeptanzkriterium |
|---|---|---|---|---|
| 1 | **Untervarianten** `tudor_en`, `alemannisch`, `franken`, `niedersachsen`, `steinhaus`, `handwerk`, `burg` mit Palette (P1–P6), `timber`, Feldbreite p, Figurentabelle, Orientierung (W<D oder W>D), Dachprioren, Fenster- und Türliste; Parser-Stichwörter („tudor“, „schwarzwald“, „franken“, „schmiede“, „burg“). Paletten P1–P6 ersetzen die drei heutigen. | `src/core/style/styles.ts`, neue `styleVariants.ts`, `palettes.ts`, `parseDescription.ts` | Daten | Lint grün für alle Paletten. Je Variante und Größe wird gebaut, mit null Validator-Reparaturen. `steinhaus` hat 0 Stämme in d=+1. `tudor_en` enthält `dark_oak_fence` in der Fassade. |
| 2 | **Figurenbibliothek F1–F9** als Rasterdaten und Feldklassifikation (E/B/F/T/G). `addBraces` wird ersetzt. Fensteranteil 40–60 % auf Fachwerkgeschossen. | neue `src/core/templates/timberPatterns.ts`, `walls.ts`, `openings.ts` | Daten + Regel | Nach dem Auflöser haben alle Figur-Treppen `shape=straight` (Fixpunkt). Jede Fassade hat ≤ 2 Figurentypen und ist spiegelsymmetrisch. Jedes Eckfeld ≥ 2 breit auf Fachwerkgeschossen trägt eine Figur. Herabstufung F3→F1→F8 wird getestet. |
| 3 | **Fachwerkgiebel** aus `gableCells` mit Kehlbalken je 4 (bzw. 5) Reihen, Firstständer, Fußbändern und 2 Fenstern; Uhlenloch bei Detailgrad 3. | `roof/roofEngine.ts` (Zellen und Seite liefern), neue `house/gableFrame.ts` | Regel | Bei Fachwerkhäusern hat jeder Giebel mit ≥ 3 Reihen ≥ 1 liegenden Balken und 1 Mittelständer. Die Regel „keine flache Fläche > 5 ohne Tiefensprung“ gilt auch für Giebel. |
| 4 | **Streben-Farbregel:** neue Rolle `brace` (optional, Standard = Treppe der Rahmenrolle) und Lint ΔL* ≤ 8 zwischen `frame` (Säulenform) und `brace` (Treppe). | `palettes.ts`, `lints.ts`, `walls.ts:208` | Daten + Lint | Kein medieval-, fantasy- oder rustic-Paar überschreitet ΔL* 8. `spruce_log` als Rahmen nur mit `dark_oak`-Streben. |
| 5 | **Proportionen und Dach:** Größen 7×11, 9×13, 11×17, 13×21 (Orientierung aus der Variante); Profile `steep_flared` und `steep56`; Anstiegsgrenze `min(10, 2×Geschosshöhe)` für medieval, Abflachen von der Traufe her; `gambrel` → `saltbox`; Geschosshöhe je Geschoss (EG +1). | `styles.ts:71–77`, `roof/profiles.ts`, `roof/roofEngine.ts:217–222`, `plan.ts` | Daten + Regel | Mittelgroßes medieval-Haus: Tiefe/Breite ≥ 1,4. Anstieg 7–9 bei W=9. Das Δ der obersten Dachspalte ist ≥ dem der untersten. Kein Gambrel mehr in medieval. |
| 6 | **Jetty-Band:** Knagge unter jedem OG-Ständer, Knaggenbündel an der Ecke, Balkenkopf-Rhythmus (`axis` quer) für niedersächsisch; Laterne zwischen zwei Knaggen bei Detailgrad ≥ 2. | `walls.ts:180–192` | Regel | Unter jedem OG-Ständer über einer Auskragung sitzt eine Treppe `half=top`. Zwischen Ständern keine Konsole im Modus „Knaggen“. |
| 7 | **Stein-EG ohne Holzständer**, Eckquader aus der Rolle `frame` bei `timber:'none'`, Gurtgesims als Kopfüber-Treppe. | `walls.ts:161–177` | Regel | `timber:'upper'`: Geschoss 0 hat keinen senkrechten Stamm (`axis=y`) in d=+1; die Schwelle darüber bleibt. `steinhaus`: Ecken zeigen die Verzahnung 2/1. |
| 8 | **Fensterlage:** Oberkante auf Fachwerkgeschossen = Reihe unter dem Rähm; Fenster gruppiert (W19); Brüstungsfelder mit F5–F8. | `openings.ts:243–275`, `templates/windows.ts` (W19) | Regel + Daten | Jedes Fenster auf einem Fachwerkgeschoss endet bei y1−1. Unter jedem Fenster mit ≥ 1 freier Reihe liegt ein Brüstungsmuster. |
| 9 | **Neue Vorlagen** W19, W20, T11, T12; Türreihenfolge `['T01','T02','T11']`, T03/T04 nur Steinhaus und Burg; T06 (Veranda) im Stil sperren. | `templates/*.ts`, `styles.ts:82–85` | Daten | Kate (klein) bekommt nie eine Doppeltür. Veranda erscheint nie bei medieval. |
| 10 | **Rundturm:** Wandrolle `wall` (oder die Mauerrolle der Variante); Gurtband nur bei jedem 2. Geschoss und unter der Brüstung; Zinnen Periode 3; optional Anlauf (Sockel 1 breiter, 2 hoch) und Hoarding (T13). | `roundTower.ts:78`, `geometry` (Zinnen) | Regel | Turm und Haus haben dieselbe Mauerfamilie. Zinnenanteil (Lücken) ≤ 34 %. Bei 4 Geschossen ≤ 3 Bänder. |
| 11 | **Kamin:** Feuer 1 unter der Krone, Krone aus `*_wall`-Ring; Winter `signal_fire=true` mit `hay_block`; Tudor-Schaftgruppe. | `components.ts:129–163` | Regel | Kein Lagerfeuer ist von der Seite sichtbar, die Rauchsäule bleibt frei (Auflöser). Im Winter `signal_fire=true`. |
| 12 | **Festschicht je Stil:** medieval ohne `red_wool`-Schleife und ohne Wollgeschenke; Girlande am Stockwerksband; Holzstapel; Marktbude statt Geschenke. | `festive.ts:78–171`, `styles.ts` (neues Feld `festive`) | Daten | medieval-Weihnachten enthält 0 Woll- und Betonblöcke, ≥ 1 Holzstapel, ≥ 1 `red_candle`. |
| 13 | **Treppengiebel** (Option `gable: 'stepped'`) für Steinhaus; **Ortgang aus Holz** bei Fachwerkgiebeln. | `roofEngine.ts`, `plan.ts` | Regel | Bei `stepped` ragt der Giebel 1 über die Dachfläche. Fachwerkgiebel haben einen Holz-`roofTrim`. |
| 14 | **Close studding** (T6) für `tudor_en` bei Detailgrad ≥ 2. | `walls.ts` | Regel | Zaun-Säulen stehen nie neben einem Ständer oder einem anderen Zaun. Kein waagerechter Steg nach dem Auflöser. |

---

## Quellen

1. Switchblade Gaming: Medieval House Ideas – https://www.switchbladegaming.com/minecraft/medieval-house-ideas/ – Stein trägt, Holz wärmt; Typen mit Größen (Kate 10×8, Schmiede 12×8, Taverne 14×10, Herrenhaus 18×14); Zinnen 2 hoch / 1 Lücke; keine Wandfackeln; Spitzbogen mit Falltür; „palette chaos“.
2. Sereyka: Minecraft Medieval House – https://sereyka.com/minecraft-medieval-house – Treppe als Strebe; Jetty auf Kopfüber-Treppen; Fenster 1 zurück; Überstand ≥ 1; Gaube oder Kamin brechen den First; Stein-EG + Fichten-OG.
3. Blockwerk: Medieval Timber-Frame House – https://blockwerks.netlify.app/en/builds/medieval-timber-frame-house/ – Lagenplan Fachwerk über Stein (über die vorhandene Notiz).
4. Blockwerk: Medieval Manor House – https://blockwerks.netlify.app/en/builds/medieval-manor-house/ – L-Form 17×9 + 7×8; Stein-EG 4 Lagen; Überstand ringsum; 7 Lagen Dach aus `deepslate_tile_stairs`; Kamine ≥ 2 über dem Dach.
5. Blockwerk: Medieval Blacksmith – https://blockwerks.netlify.app/en/builds/medieval-blacksmith/ – 8×6, zwei Steinwände, Ständer für die offene Seite, Pyramidendach aus Fichte, Ziegelkamin mit Lagerfeuer.
6. Blockwerk: Round Castle Tower – https://blockwerks.netlify.app/en/builds/round-castle-tower/ – 7×7, 20 hoch, Steinziegel + Moos, Zinnen 1:1, ungerade Durchmesser.
7. minecraft.how: Castle building guide – https://minecraft.how/blog/post/minecraft-castle-medieval-building-guide – Mauern 3–4 dick, Türme, Zinnen 1:1, Falltür-Scharten, Maschikulis aus Treppen, Tor 4–5 × 3–4, Strebepfeiler alle 8–10.
8. PirateCraft: Houses – Better builds – https://piratemc.com/2015/11/26/houses-better-builds/ – Geschoss 4 hoch, Felder 3–5, Wand 1 hinter dem Rahmen, Dach mit zweiter Holzart als Kante.
9. ArchitectureLab: Minecraft Medieval House – https://dev.architecturelab.net/how-to-build-minecraft-medieval-house/ – Rahmen 7×11, Pfosten 5 hoch, Steinmix mit `cracked_stone_bricks`, Kamin mit Lagerfeuer.
10. NameHero: 5 elegant medieval house ideas – https://www.namehero.com/gaming-blog/the-5-most-elegant-minecraft-medieval-house-ideas/ – Wände ≥ 5 hoch, gemischte Steine, Falltür-Fenster.
11. ModBay: Half-Timbered Cottage – https://modbay.org/maps/6210-minecraft-half-timbered-cottage.html – Fachwerk-Look aus Mangrovenstämmen und Falltüren.
12. TheGamer: 15 Quick Tips – https://www.thegamer.com/minecraft-build-tips-tricks-methods-detail-realistic/ – Balken vor der Front, Holzarten und Stammformen mischen.
13. minecraft.wiki: Tutorial:Roof types – https://minecraft.wiki/w/Tutorial:Roof_types – Sattel, Walm, Krüppelwalm, Saltbox, Gambrel und Mansard (große Bauten), Stroh, Gauben, Dachkante.
14. minecraft.wiki: Tutorial:Architectural terms – https://minecraft.wiki/w/Tutorial:Architectural_terms – Konsole (Corbel), Pfosten (Mullion), Kämpfer (Transom).
15. minecraft.wiki: Snow – https://minecraft.wiki/w/Snow – Schnee nur auf voller Oberseite (auch Kopfüber-Treppe), nicht auf Eis; taut bei Blocklicht ≥ 12; bricht ohne Träger.
16. minecraft.wiki: Trapdoor – https://minecraft.wiki/w/Trapdoor – Zustände; `facing` = Richtung des Aufschwingens; kein Träger nötig.
17. minecraft.wiki: Lantern – https://minecraft.wiki/w/Lantern – Licht 15; hängt an Ketten, Gittern, Scheiben und vollen Unterseiten.
18. minecraft.wiki: Campfire – https://minecraft.wiki/w/Campfire – Rauch ~10 Blöcke, mit Heuballen 24; dringt nur durch einen Block darüber; Falltür sperrt; Licht 15; `signal_fire`.
19. minecraft.wiki: Fence – https://minecraft.wiki/w/Fence – Zäune verbinden sich mit vollen Blöcken und Holzzäunen; stapelbar.
20. minecraft.wiki: Java Edition 1.21.9 – https://minecraft.wiki/w/Java_Edition_1.21.9 – neue Blöcke (Regale, Kupferlaternen, Kupferketten), teils Block-Entities.
21. minecraft.wiki: Java Edition 1.21.5 – https://minecraft.wiki/w/Java_Edition_1.21.5 – `leaf_litter`, `wildflowers`, `bush`, `firefly_bush` (alle nicht in Registry).
22. Salge et al.: Generative Design in Minecraft (GDMC) – https://arxiv.org/html/1803.09853 – Kriterien Anpassung, Funktion, Narrativ, Ästhetik; „consistent look“ plus „appropriate level of variation“.
23. de.wikipedia: Mann (Fachwerk) – https://de.wikipedia.org/wiki/Mann_(Fachwerk) – Fußbänder und überschneidende Kopfbänder an Eck- und Bundständern; 1470–1550.
24. de.wikipedia: Alemannisches Fachwerk – https://de.wikipedia.org/wiki/Alemannisches_Fachwerk – weiter Ständerabstand, angeblattete Kopf- und Fußbänder, Fenstererker, um 1480 Zapfung.
25. de.wikipedia: Fachwerkhaus – https://de.wikipedia.org/wiki/Fachwerkhaus – Verbreitung der drei Stilgruppen; geschweifte Andreaskreuze in Franken und Württemberg; Schweiz: rote Balken, weißes Gefach.
26. Baunetz Wissen: Baualtersstufe Fachwerkhäuser – https://www.baunetzwissen.de/bauen-im-bestand/fachwissen/baualtersstufen/baualtersstufe-fachwerkhaeuser-148196 – alemannisch mit geschnitzten Wandbändern und vorkragenden Rähmbauten; Ziegelausfachung im Norden; Lehmstaken in Hessen und Franken.
27. de.wikipedia: Hessenmann – https://de.wikipedia.org/wiki/Hessenmann – verkürzte Kopfstreben (Kopfwinkelhölzer) mit dreiviertelgeschosshohen Fußstreben.
28. de.wikipedia: Andreaskreuz (Fachwerk) – https://de.wikipedia.org/wiki/Andreaskreuz_(Fachwerk) – zuerst in Brüstungsfeldern, im 19. Jahrhundert geschosshoch; geschweift mit Nasen ab dem 16. Jahrhundert.
29. de.wikipedia: Feuerbock (Fachwerk) – https://de.wikipedia.org/wiki/Feuerbock_(Fachwerk) – Begriff aus der NS-Zeit, von Fachleuten abgelehnt.
30. de.wikipedia: Fächerrosette – https://de.wikipedia.org/wiki/Fächerrosette – Brüstungen der Obergeschosse und des Giebels, ersetzte gotische Fußstreben, ab 1532, Weserraum.
31. de.wikipedia: Knagge – https://de.wikipedia.org/wiki/Knagge – dreieckige Stütze unter vorkragenden Balken, verziert; Knaggenbündel an Ecken.
32. de.wikipedia: Kopfband – https://de.wikipedia.org/wiki/Kopfband – 45°; bei Zwischenstielen immer beidseitig.
33. de.wikipedia: Niederdeutsches Hallenhaus – https://de.wikipedia.org/wiki/Niederdeutsches_Hallenhaus – Dielentor im Giebel, Krüppelwalm oder Sattel, Pferdeköpfe, Uhlenloch, tief herabgezogenes Dach.
34. en.wikipedia: Low German house – https://en.wikipedia.org/wiki/Low_German_house – bis 27 × 13 m, Traufe knapp über Kopfhöhe, Gefach Flechtwerk + Lehm, später Ziegel.
35. de.wikipedia: Schwarzwaldhaus – https://de.wikipedia.org/wiki/Schwarzwaldhaus – weit herabgezogener Walm oder Krüppelwalm, 45–50°, Steinsockel.
36. de.wikipedia: Steinwerk – https://de.wikipedia.org/wiki/Steinwerk – fast quadratisch, mehrgeschossig, Mauern 1–3 m, Fachwerk-Vorderhaus, 1177–16. Jahrhundert.
37. de.wikipedia: Zwerchhaus – https://de.wikipedia.org/wiki/Zwerchhaus – Fassade bündig, eigener Giebel quer zum First, Höhe ≈ 150 % der Breite.
38. de.wikipedia: Butzenscheibe – https://de.wikipedia.org/wiki/Butzenscheibe – 7–15 cm, grünliches Waldglas, Bleifassung, seit dem 14. Jahrhundert.
39. en.wikipedia: Close studding – https://en.wikipedia.org/wiki/Close_studding – Abstand ≤ ~600 mm; Mittelriegel in den Midlands, selten im Osten; Statussymbol.
40. en.wikipedia: Timber framing – https://en.wikipedia.org/wiki/Timber_framing – östliche, westliche und nördliche Schule; Quadratfelder mit Rauten, Sternen, Vierpässen; Nogging; Bressummer.
41. en.wikipedia: Tudor architecture – https://en.wikipedia.org/wiki/Tudor_architecture – Tudorbogen, Erker, Kreuzstockfenster, gedrehte Ziegelschornsteine (auch Attrappen), close studding Ost / Quadratfelder West.
42. en.wikipedia: Jettying – https://en.wikipedia.org/wiki/Jettying – Bressummer, Gratbalken 45°, Eckkonsolen, Gründe, Windbretter in Deutschland.
43. en.wikipedia: Wealden hall house – https://en.wikipedia.org/wiki/Wealden_hall_house – offene Halle zwischen auskragenden Endjochen, „fliegender“ Rähm, später Kamine.
44. en.wikipedia: Black-and-white Revival architecture – https://en.wikipedia.org/wiki/Black-and-white_Revival_architecture – Schwarz-weiß als Bewegung des 19. Jahrhunderts.
45. Building Conservation: Paint Removal from Historic Timbers – https://www.buildingconservation.com/articles/paint-removal/paint-removal.htm – Holz und Gefach gekalkt, Ocker- und Rotfassungen, oft roh; Schwarz als Mode des 19. Jahrhunderts.
46. National Trust: Limewashing at Lavenham Guildhall – https://www.nationaltrust.org.uk/visit/suffolk/lavenham-guildhall/limewashing-at-lavenham-guildhall – Kalk auf Holz und Putz; verwitterte Eiche silbergrau.
47. en.wikipedia: Pargeting – https://en.wikipedia.org/wiki/Pargeting – Zierputz in den Gefachen, Suffolk und Essex, elisabethanisch.
48. en.wikipedia: Cruck – https://en.wikipedia.org/wiki/Cruck – gebogene A-Paare, England und Wales, Häuser und Scheunen, ab etwa 1250.
49. en.wikipedia: Oriel window – https://en.wikipedia.org/wiki/Oriel_window – Erker vom Obergeschoss auf Konsolen, reicht nicht zum Boden; 15. Jahrhundert.
50. en.wikipedia: Thatching – https://en.wikipedia.org/wiki/Thatching – Strohdach 45–55°.
51. en.wikipedia: Crow-stepped gable – https://en.wikipedia.org/wiki/Crow-stepped_gable – Flandern, Niederlande, norddeutsche Backsteingotik; Stufen dort größer.
52. en.wikipedia: Battlement – https://en.wikipedia.org/wiki/Battlement – Zinnenlücke ≈ ⅓ der Zinne; Schwalbenschwanzzinnen in Italien.
53. en.wikipedia: Hoarding (castle) – https://en.wikipedia.org/wiki/Hoarding_(castle) – Holzgalerien auf Balken in Rüstlöchern, später Maschikulis.
54. de.wikipedia: Weihnachtsmarkt – https://de.wikipedia.org/wiki/Weihnachtsmarkt – Wien 1296, München 1310, Bautzen 1384; Kastanien, Nüsse, Mandeln.
55. en.wikipedia: Christmas decoration – https://en.wikipedia.org/wiki/Christmas_decoration – Stechpalme, Efeu, Mistel; Straßburg 1539; Kerzen im 16. Jahrhundert; Stern um 1840.
56. Nomad Epicureans: Half-timbered towns in Germany – https://nomadepicureans.com/europe/ultimate-guide-to-half-timbered-towns-in-germany/ – Reiseblog (schwach): fränkisch dicht und zierreich, niedersächsisch farbig.
57. Repo-intern: `research_notes/Minecraft Bautechniken für Generator/waende_struktur.md`, `paletten.md`, `daecher.md`, `fenster_tueren_details.md`; `src/core/style/textureStats.ts` (L*-Werte).
