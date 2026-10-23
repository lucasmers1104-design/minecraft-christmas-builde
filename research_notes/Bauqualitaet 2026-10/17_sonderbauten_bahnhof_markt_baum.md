# Sonderbauten: Bahnhof, Weihnachtsmarktbude und großer Weihnachtsbaum

Stand: 2026-10-23 · Thema 17 von 20

Wie Profi-Builder einen Kleinstadtbahnhof, eine Weihnachtsmarktbude samt Budengasse und einen großen Weihnachtsbaum aus Vanilla-Blöcken bauen, was unser Generator davon heute schon kann und welche Vorlagen und Regeln er bekommen sollte.

Abgrenzung: Girlanden, Kränze, Schneeregeln und Laternenpfähle stehen schon in der vorhandenen Notiz `Minecraft Bautechniken für Generator/winter_weihnachten_landschaft.md` [52], darauf wird hier nur verwiesen. Dachformen, Fenster- und Türvorlagen sowie Paletten gehören zu den Themen Dächer, Fenster und Paletten. Hier geht es um die drei Sonderbauten.

Methodik und Grenzen dieser Recherche:
- Quellen sind Minecraft-Wiki-Seiten zur Mechanik, Builder-Artikel, eine selbst ausgewertete Vanilla-Struktur (NBT aus misode/mcmeta 1.21.11), reale Vorgaben deutscher Weihnachtsmärkte (Merkblätter und Bauanleitungen als PDF) sowie Wikipedia und USDA zu realer Architektur und Baumform.
- Reddit und Planet Minecraft blockierten jeden Abruf (403). Das Suchbudget der Sitzung war nach wenigen Suchen erschöpft. Viele Profi-Techniken, vor allem zu Bäumen, sind deshalb nur als **Einschätzung** markiert. Sie stützen sich auf die Mechanik-Quellen und auf Erfahrungswerte und müssen am Modell geprüft werden.
- Blöcke, die es in 1.21.11 gibt, die aber in `src/core/blocks/families.ts` fehlen, sind mit **(nicht in Registry)** markiert.

---

## Kurzfassung

Nach Wirkung sortiert:

1. **Baum: Die Silhouette entscheidet, nicht der Schmuck.** Unser Baum ist ein fast glatter Kegel aus perfekten Kreisscheiben. Profis bauen ausgeprägte Astetagen (Tiers) mit tiefem Rücksprung, hängenden Astspitzen und unregelmäßigem, gelapptem Rand. Neue Etagen sollten bei etwa 55 % des vorigen Etagenradius beginnen (mindestens 2 Blöcke Rücksprung) statt bei Radius − 1. Vanilla-Fichten springen sogar auf Radius 1 zurück. [20][21][40][41][46]
2. **Baum: weniger, ruhigerer Schmuck.** 8–12 % der Hülle als Vollblock-Kugeln in sechs Farben (`christmasTree.ts:58–62`, `:109`) sind deutlich zu viel. Empfehlung: 3–6 % in 2–3 Farben je Stil, dazu eine einzige warme Lichtfarbe. Auf kleinen Bäumen wirken Wollkugeln klobig. [40], Einschätzung
3. **Bude: Eine Weihnachtsmarktbude ist ein Holzhäuschen mit Satteldach (Giebel zur Gasse), Dachüberstand, Tannengrün und weißem Licht**, kein Haus mit rot-weißem Steindach. Vorgaben echter Märkte sagen genau das. [1][2][3]
4. **Bude: Klappladen und Theke sind das Erkennungszeichen.** Der untere Laden wird zur Auslage heruntergeklappt (`spruce_trapdoor[half=top,open=false]` bei d=+1), der obere wird je nach Markt als Vordach hochgestellt oder ist sogar verboten. [1][2]
5. **Bahnhof: Der Hausbahnsteig gehört direkt an das Gebäude.** Das Bahnsteigdach ist dort ein Pultdach am Gebäude, getragen von einer Säulenreihe mit Konsolen und einem Volant (Lambrequin oder Glasschürze). Heute steht ein freies Satteldach auf zwei Pfostenreihen, und zwischen Bahnsteig und Gleis liegt ein Grasstreifen (`station.ts:84–126`). [27][28][38]
6. **Bahnhof: Das Gleisbett macht den Realismus.** Schwellen sollten quer über drei Blöcke sichtbar sein (`stripped_spruce_log[axis=z]` jede zweite Position). Dazwischen liegt Schotter aus drei bis vier grauen Blöcken. Die Bahnsteigkante steht 1,5 Blöcke von der Gleismitte (real ca. 1,65 m). [19][28][35]
7. **Bahnhof: Die Uhr ist heute ein Quadrat mit einem schwarzen „L“.** Profis bauen ein rundes Zifferblatt (Kreis D5 oder D7) mit Rahmen und dünnen Zeigern. Dünne Zeiger gehen in Vanilla nur mit Kettengliedern oder Stäben vor dem Blatt. Am Bahnsteig hängt zusätzlich eine kleine Doppeluhr. [36], Einschätzung
8. **Baum: Der Stern muss mit dem Baum wachsen.** Ein Block mit fünf Endstäben passt auf 12 Blöcke Höhe. Ab etwa 24 Blöcken braucht es einen Pixelstern (5×5 oder 7×7) in zwei gekreuzten Ebenen. [40], Einschätzung
9. **Laub nur in fester Farbe mischen.** Fichte (#619961) und Birke haben feste Farben, Kirsche, Blasseiche und Azalee feste Texturfarben. Eiche, Schwarzeiche, Tropenbaum, Akazie und Mangrove werden je nach Biom eingefärbt. Ein Schematic mit Schwarzeichenlaub sieht deshalb an jedem Einfügeort anders aus. [20]
10. **Lichter im Baum teils hinter die Hülle setzen.** Laub lässt Licht durch, also glimmt eine Lichtquelle einen Block tief durch die Nadeln. Heute ersetzen Lichter Hüllblöcke, obwohl der Kommentar in `christmasTree.ts:116` „inside“ sagt. [40], Einschätzung
11. **Registry-Fehler mit Folgen für Schnee:** Alle gewachsten Kupferleuchten haben `light: 15` (`families.ts:229`). Real leuchtet exposed mit 12, weathered mit 8 und oxidized mit 4 (Lichttabelle der Wiki, zitiert in [52]). Gerade die exposed-Leuchte (12) wäre die einzige warme Block-Leuchte für Baum und Bude, neben der Schnee liegen bleibt.
12. **Bude: Waren in Halbblock-Größe.** Kürbis, Melone und Heuballen als Vollblöcke auf der Theke (`marketStall.ts:33`, `:98–100`) machen die Theke zur Wand. Besser sind Kerzen, Töpfe, `potted_spruce_sapling` (Mini-Christbaum), Kuchen (nicht in Registry) und Laternen, Fässer nur hinter der Theke. [9][11], Einschätzung
13. **Budengasse: Variation statt Kopie.** Jede Bude bekommt ein eigenes Holz, eine eigene Dachfarbe und ein eigenes Warenthema. Dazu kommen eine größere Glühweinhütte mit Fass-Stehtischen und ein Platz mit Baum am Gassenende. Echte Hütten messen 3×2 m (Standard), Glühweinhütten 7×3 m. [3][4][5][7]
14. **Bahnhof: Nebengebäude erzählen die Funktion.** Güterschuppen mit Laderampe auf Wagenbodenhöhe, Wasserturm, Wasserkran am Bahnsteigende und Formsignal. Ab Größe medium bzw. large kostet das wenig und wirkt stark. [30][31][32][33]
15. **Geschenke gehören unter den Baum, nicht verstreut.** Gruppen von 3–5, teils unter der untersten Etage, in mehreren Größen (1×1×1, 1×1×2, 3×3×2 mit Bandkreuz). Heute liegen sie zufällig im Ring vor dem Baum bzw. in der Marktgasse (`generateBuilding.ts:170–176`, `marketStall.ts:150–152`). Einschätzung

---

## Schwächen des aktuellen Generators

### Weihnachtsbaum (`src/core/generator/christmasTree.ts`, Screenshot `weihnachtsbaum.jpg`)

| # | Befund | Stelle | Wirkung im Bild |
|---|---|---|---|
| B1 | **Kaum Etagen:** Jede neue Etage startet bei `max(start+1, end−1)`, also nur einen Block kleiner als die vorige endete. Für H=18 ergibt das 0,1, 1,2,3,4, 3,4,5,6, 5,6,7,7, 6. Die Rücksprünge sind 1 Block tief. | `christmasTree.ts:22–35` | Glatter, stumpfer Kegel („Bienenkorb“), keine Schattenfugen unter den Ästen |
| B2 | **Perfekte Kreisscheiben** je Lage (`circle(d,'filled')`), keine Lappen, kein Randrauschen, keine Drehung zwischen den Etagen | `:79–85` | Künstlich, gedrechselt; jede Lage gleich |
| B3 | **Massiv gefüllt.** Jede Lage ist eine volle Scheibe. Bei H=40 und R≈15 sind das tausende unsichtbare Laubblöcke in der Materialliste | `:81–85` | Kein Bildfehler, aber Survival-unfreundlich |
| B4 | **Stamm immer 1×1**, auch bei 40 Blöcken Höhe; kein Wurzelanlauf | `:90` | Baum „schwebt“ auf einem Stiel (Screenshot: 2 Blöcke Stamm sichtbar) |
| B5 | **Schmuck zu dicht und zu bunt:** 8/10/12 % der Hülle, sechs Farben zufällig (rot, gelb, weiß, blau, Gold) | `:58–62`, `:107–115` | Konfetti-Effekt, die Farbe überdeckt die Form |
| B6 | **Lichter auf statt in der Hülle:** `pickNear` wählt aus `hull` (Außenring) und ersetzt Laub durch Froschlicht | `:116–125` | Cremefarbene Würfel wirken wie weitere Kugeln, nicht wie Lichter |
| B7 | **Schmuck auch oben auf den Etagen,** nicht an den Astspitzen; Kugeln „liegen“ statt zu hängen | `:86` (Hülle = Ring jeder Lage) | Flach, keine Hängelogik |
| B8 | **Stern 1 Block + 5 Endstäbe,** egal wie hoch der Baum ist | `:127–139` | Bei 26/40 Blöcken winzig („Plus-Zeichen“) |
| B9 | **Gartenbaum H=7 mit vollem Schmuckanteil** | `generateBuilding.ts:145` | 1-Block-Kugeln auf 7 Blöcken Höhe sind klobig [40] |
| B10 | **Geschenke zufällig im Ring** r = R+0,5 … R+2,5, einzeln, immer 1×1×1 | `generateBuilding.ts:170–176`, `festive.ts:163–174` | Im Screenshot liegen drei Würfel verloren vor dem Baum |

### Marktstand (`src/core/generator/marketStall.ts`, Screenshot `marktstand.jpg`)

| # | Befund | Stelle | Wirkung |
|---|---|---|---|
| M1 | **Hausdach statt Budendach:** Satteldach der Dach-Engine über die ganze Bude, First parallel zur Gasse, Giebel mit Wandmaterial gefüllt | `marketStall.ts:106–121` | Liest sich als Reihenhaus, nicht als Bude |
| M2 | **Streifen aus `red_nether_bricks` und `smooth_quartz`** über das ganze Dach | `:117`, `:125–137` | Dunkles Ziegel-Weinrot, wirkt wie Stein statt Stoff; Weihnachtsmärkte nutzen Holz oder Plane, gestreifter Stoff ist der Nürnberger Sonderfall [1][6] |
| M3 | **Feste Größe 7×5×4** für jede Bude | `:32` | Gasse wie aus einer Form gegossen |
| M4 | **Abstand 1 Block zwischen Buden, Dachüberstand 1:** Die Dächer stoßen aneinander | `:52`, `:67`, `:116` | Zwei Buden einer Reihe verschmelzen zu einem langen Dach (Screenshot) |
| M5 | **Vollblock-Waren auf der Theke** (barrel, pumpkin, melon, hay_block) | `:33`, `:98–100` | Theke wird zur zweiten Wand, Maßstab kippt |
| M6 | **Theke aus abwechselnd Fass und Rahmenblock,** keine Auslage davor, kein Klappladen | `:94–97` | Fehlt das wichtigste Bauteil echter Buden [2] |
| M7 | **Keine Lichter im Inneren,** nur zwei Laternen vor der Traufe; Girlande nur an den Traufkanten | `:139–147`, `:152` | Buden glühen nicht von innen, obwohl genau das die Atmosphäre ausmacht |
| M8 | **Geschenke mitten in der Gasse** (jede 7. freie Zelle) | `:150–152` | Hindernisse im Laufweg |
| M9 | **Baum am Gassenende nur 12 hoch** und ohne Platz drumherum | `:161–168` | Kein Zentrum, kein Platz |

### Bahnhof (`src/core/generator/station.ts`, Screenshot `bahnhof-mittelalter.jpg`)

| # | Befund | Stelle | Wirkung |
|---|---|---|---|
| S1 | **Bahnsteig abgesetzt:** `pz0 = main.rect.z1 + 2`, also ein Block Gras zwischen Halle und Bahnsteig. Nur ein Pfad verbindet die Hintertür | `station.ts:84`, `:92–93` | Kein Hausbahnsteig, Gebäude und Bahnsteig gehören nicht zusammen |
| S2 | **Grasstreifen zwischen Bahnsteigkante und Schotter** (z = pz1+1). Kante bis Gleismitte 2,5 Blöcke | `:96–101` | Gleis liegt „neben“ dem Bahnsteig, nicht an ihm |
| S3 | **Bahnsteigkante aus `yellow_concrete`** als Kantenblock selbst | `:89` | Grelle Linie direkt an der Kante; real ist die Kante heller Stein, die Sicherheitslinie liegt rund 1 Block dahinter [28][29] |
| S4 | **Gleisbett flach im Boden, 3 breit,** Schwellen nur in der Mitte unter der Schiene (`spruce_planks` jede 2. x), Rand `coarse_dirt` | `:96–101` | Schwellen unter der Schiene sind unsichtbar (die Schienen-Textur hat eigene), Schotter einfarbig |
| S5 | **Bahnsteigdach als freies flaches Satteldach** auf Pfosten an beiden Bahnsteigrändern, Pfosten `log` der Rahmenrolle, ohne Konsolen und Volant | `:104–126` | Wirkt wie Carport; zweite Pfostenreihe steht 1 Block vor der Kante im Weg |
| S6 | **Uhr: 5×5-Quadrat** (Ecken frei) aus `white_concrete`, Zeiger aus `black_concrete` 1 Block breit, Rahmen aus Stamm-Stirnseiten | `:146–160` | Im Screenshot ein weißes Feld mit schwarzem „L“, nicht als Uhr lesbar |
| S7 | **Keine Nebengebäude, keine Signale, kein Bahnsteigmobiliar** außer Bänken alle 7 Blöcke | `:139–145` | Bahnhof erklärt sich nicht; sieht aus wie ein großes Haus mit Seitenflügeln |
| S8 | **Stiltreue fehlt am Bahnsteig:** Dachmaterial = Hausdach, Pfosten = Rahmen; kein Unterschied zwischen Holz-Landbahnhof und gusseiserner Halle | `:107`, `:121` | Alle Stile gleich |

---

## Techniken und Regeln

Konventionen: Tiefe d relativ zur Wandebene (−1 innen, 0 Wand, +1/+2 davor), Vorlagen kanonisch für die Südfassade wie in `src/core/templates/`. „Einschätzung“ heißt: plausibel aus Mechanik und Praxis abgeleitet, nicht durch eine Builder-Quelle belegt.

### Teil A: Großer Weihnachtsbaum

#### A1 Etagenprofil mit tiefem Rücksprung („Astetagen“)

- **Beschreibung.** Nadelbäume tragen ihre Äste in Quirlen. Bei der Fichte hängen die unteren Äste nach unten, bei der Kammfichte hängen die Zweige zweiter Ordnung durch [46]. In Minecraft liest sich das als Etagen: Jede Etage wächst nach unten um 1 Block Radius pro Lage, die nächste beginnt deutlich kleiner. Vanilla-Fichten wachsen in „discrete rows“ [21].
  - Nach dem Vanilla-Quelltext (`SpruceFoliagePlacer`, Einschätzung, nicht per URL belegt) springt Vanilla nach jeder Etage auf Radius 1 zurück: 0,1 | 0,1,2 | 1,2,3 | 1,2,3,4 … Das ist sehr zackig.
  - Unser Generator springt nur um 1 zurück (B1). Die Mitte dazwischen ergibt den Christbaum-Look.
- **Regel (Einschätzung, Startwerte):**
  - Kronenhöhe `C = H − hStern − hStammSichtbar`, Basisradius `R = round(0.35·C)`. Die Basisbreite ≈ 0,7·C liegt innerhalb der USDA-Spanne „normal taper“ (Basis 40–100 % der Höhe) [44].
  - Unterer Radius der Etage i (0 = oben) bei T Etagen: `rb_i = max(1, round(R · ((i+1)/T)^0.7))`.
  - Etagenstart `rs_0 = 0`, `rs_i = max(1, rb_{i−1} − max(2, round(0.45·rb_{i−1})))`. Das ergibt ≈ 55 % des vorigen Radius und mindestens 2 Blöcke Rücksprung, sobald die vorige Etage groß genug ist.
  - In der Etage wächst der Radius um 1 je Lage.
  - **T** ist die größte Etagenzahl von 2 bis `min(8, max(2, floor(C/3)))`, deren Lagen in C passen. Übrige Lagen werden aufgefüllt, indem von unten nach oben je Etage der unterste Radius doppelt gesetzt wird (untere Etagen sind höher).
- **Durchgerechnet** (eigenes Skript):

| H | C | R | T | Radien von oben (Etagen durch \| getrennt) | Rücksprünge |
|---|---|---|---|---|---|
| 7 (Garten) | 5 | 2 | 2 | 0,1 \| 1,2,2 | 0 |
| 12 | 9 | 3 | 3 | 0,1 \| 1,2,2 \| 1,2,3,3 | 0,1 |
| 18 | 14 | 5 | 4 | 0,1,2 \| 1,2,3 \| 1,2,3,4 \| 2,3,4,5 | 1,2,2 |
| 26 | 19 | 7 | 4 | 0,1,2,3 \| 1,2,3,4 \| 2,3,4,5,6 \| 3,4,5,6,7,7 | 2,2,3 |
| 40 | 30 | 11 | 5 | 0–4 \| 2–6 \| 3–8 \| 4–9 \| 5–11,11 | 2,3,4,4 |

  Heute ergibt H=18 dagegen `0,1,1,2,3,4,3,4,5,6,5,6,7,7,6` mit Rücksprüngen von je 1.

```
Seitenansicht H=18 (Schnitt durch die Stammachse, ohne Lappen aus A2), x = −6..6
Legende: L=spruce_leaves[persistent=true], h=hängende Astspitze (spruce_leaves), |=spruce_log[axis=y],
         *=Stern (3×3-Plus, untere Zelle ersetzt die Kronenspitze, siehe A6), .=Luft
y17  ......*......
y16  .....***.....
y15  ......*......   r0 (Stern statt Laub)
y14  .....LLL.....   r1
y13  ....LLLLL....   r2   Etage 0 Ende
y12  ....hLLLh....   r1 (Etage 1) + Spitzen der Etage 0 eine Lage tiefer
y11  ....LLLLL....   r2
y10  ...LLLLLLL...   r3   Etage 1 Ende
y9   ...h.LLL.h...   r1 (Etage 2) + Spitzen, Rücksprung 2
y8   ....LLLLL....   r2
y7   ...LLLLLLL...   r3
y6   ..LLLLLLLLL..   r4   Etage 2 Ende
y5   ..h.LLLLL.h..   r2 (Etage 3) + Spitzen, Rücksprung 2
y4   ...LLLLLLL...   r3
y3   ..LLLLLLLLL..   r4
y2   .LLLLLLLLLLL.   r5   unterste Etage, breiteste Lage
y1   .h....|....h.   Spitzen + Stamm
y0   ......|......   Stamm (sichtbar 2)
```

- **Einsatz:** alle Stile. Baumgrößen 12/18/26/40 (`generateBuilding.ts:162`) und der Gartenbaum (H=7: nur 2 Etagen, kein Schmuck außer Lichtern).
- **Wirkung hoch · Aufwand mittel** (reine Profilfunktion `treeProfile` plus Spitzen-Lage).
- Quellen: [21][44][46][47], Einschätzung für die Zahlen.

#### A2 Gelappte, unregelmäßige Lagen statt Kreisscheiben

- **Beschreibung.** Jede Etage besteht aus 5–9 Ästen. Ihre Spitzen bilden Lappen am Rand. Die Lappen jeder Etage sind gegen die vorige verdreht, damit keine senkrechten Rippen entstehen. Builder-Regeln dazu: Äste „nie identisch und nie auf derselben Höhe“ [41], Laub „am breitesten an der Astbasis“, kreisförmig statt eckig [41].
- **Regel (Einschätzung):**
  - Für Lagen mit r ≥ 3 gilt `r(θ) = r · (1 + a·cos(n_i·(θ − φ_i)))` mit `a = 0.15`, `n_i = clamp(round(2π·rb_i/3), 5, 9)` (ein Ast je ~3 Blöcke Umfang) und `φ_i = i · 137.5°`. Zelle gesetzt, wenn `dist ≤ r(θ) + 0.5`.
  - **Randrauschen:** Außenzellen mit p = 0,12 weglassen, aber nie zwei benachbarte. Mit p = 0,08 eine Zelle 1 weiter außen setzen („Fransen“).
  - **Hängende Spitzen (A1):** nur in Lappenrichtung (±12°), p = 0,7.
- **Draufsicht** einer Etagenunterkante, mit eigenem Skript aus der Formel gerechnet: rb = 5, n = 5 Lappen, Phase 137,5°, a = 0,15. Lappen zeigen nach O, NO, NW, SW und S.
  - Legende: L=spruce_leaves[persistent=true], B=Ast (spruce_log[axis=x] bzw. [axis=z] auf geraden Stücken, spruce_wood auf Diagonalschritten), F=spruce_fence (Astende), +=Stamm, .=Luft.

```
x: −7 … +7, z: −7 … +7 (Norden oben)
. . . . . . . . . . . . . . .
. . . . . . . . . . . . . . .
. . . . . . . L L L L . . . .
. . . L L L L L L F L . . . .
. . L L F L L L B L L . . . .
. . . L L B L L B L L L . . .
. . . L L L B B L L L L L . .
. . . L L L B + B B B F L L .
. . L L B B L B L L L L L L .
. . L L F L L B L L L L L . .
. . L L L L L L B L L . . . .
. . . L L L L L F L L . . . .
. . . . . . L L L L . . . . .
. . . . . . . . L . . . . . .
. . . . . . . . . . . . . . .
```

- **Äste** nur in Etagen mit rb ≥ 4: liegende Stämme in Lappenrichtung, Länge `round(0.6·rb)`, am Ende ein `spruce_fence` [42]. Sie sitzen in der breitesten Lage und sind von unten sichtbar. Diagonalen werden treppig aus `spruce_wood` gesetzt (Einschätzung).
- **Nächste Etage:** Phase um 137,5° weiterdrehen, damit die Lappen nicht übereinander stehen.
- **Einsatz:** alle Stile, H ≥ 12. **Wirkung hoch · Aufwand mittel.** Quellen: [41][42][50], Einschätzung.

#### A3 Hohlbauweise und Stamm nach Größe

- **Hülle.** Laub wird nur bis 3 Blöcke Tiefe unter der Außenkontur jeder Lage gesetzt. Stamm und Äste bleiben ganz. Bei H=40 spart das grob die Hälfte des Laubs (Einschätzung). Große Profi-Bäume sind innen oft hohl [43].
- **Stamm:**
  - H < 24: 1×1 `spruce_log[axis=y]`.
  - 24 ≤ H < 36: Plus-Form aus 5 Stämmen bis etwa 1/3 der Kronenhöhe, darüber 1×1.
  - H ≥ 36: 3×3 bis 1/4, dann Plus, dann 1×1.
  - 1×1, 2×2 oder 3×3 sind laut Guide üblich; 3×3 hat eine Mitte für den Stern [40]. Eine ungerade Breite hält die Mittelachse für Stern und Spitze.
- **Wurzelanlauf** bei H ≥ 24: je Seite 1–2 `spruce_log[axis=x|z]` flach auf dem Boden, dazwischen `spruce_stairs[half=bottom]` zum Stamm hin. Darum `coarse_dirt`/`rooted_dirt` und `podzol` (nicht in Registry) im Radius R/2. Wurzeln mit Stämmen und Treppen empfiehlt der Custom-Tree-Guide [41], Wurzeln am Weihnachtsbaum der Christmas-Guide [40].

```
Ansicht Süd Stammfuß H≥36, y=1..3, x=−3..3
Legende: |=spruce_log[axis=y], W=spruce_wood, X=spruce_log[axis=x], s=spruce_stairs[facing=east,half=bottom] (links) / [facing=west] (rechts), r=rooted_dirt (y=0)
y3  . . | | | . .
y2  . . | | | . .
y1  X s | | | s X
y0  r r r r r r r
```

- **Wirkung mittel · Aufwand niedrig.** Quellen: [40][41][43].

#### A4 Laubmischung nur aus farbfesten Arten

- **Fakten:**
  - `spruce_leaves` ist fest #619961, `birch_leaves` fest #80a755.
  - Kirsche, Blasseiche, Azalee und blühende Azalee haben vorgefärbte Texturen.
  - Eiche, Tropenbaum, Akazie, Schwarzeiche und Mangrove werden nach Biom eingefärbt [20].
  - Das „Weißwerden“ von Laub bei Schneefall gibt es nur in Bedrock [20].
- **Regel:**
  - Basis 85–90 % `spruce_leaves`.
  - Akzente in der Außenhülle der Etagen-Oberseiten: Winter/Weihnachten 1.21.11 mit 6–10 % `pale_oak_leaves` (graugrün, wirkt bereift, nur 1.21.11). Sonst 3–5 % `azalea_leaves` als hellere Spitzen (Einschätzung).
  - Keine biomgefärbten Arten. Die Vorschau zeigt sonst eine andere Farbe als die Welt.
  - Für 1.21.1 fällt `pale_oak_leaves` weg (Profil) und wird durch `spruce_leaves` ersetzt.
- **Wirkung mittel · Aufwand niedrig** (eine gewichtete Laubrolle). Stile: nordic, rustic, medieval (Blasseiche-Reif), cherry (zusätzlich 3 % `cherry_leaves` nur im Stil „Kirschblüte“). Quellen: [20], Einschätzung.

#### A5 Schmuck: Kugeln an den Astspitzen, Lichter in der Hülle

- **Kugeln** sind das klassische Element, die Glaskugel stammt aus Lauscha [48][49]:
  - **Wo:** Kandidaten sind seitlich freie Hüllzellen (Luft in x oder z). 70 % davon in der breitesten Lage einer Etage oder auf hängenden Spitzen, also dort, wo echte Kugeln hängen. Auf der Oberseite einer Etage hängt nichts (Einschätzung).
  - **Dichte:** Anteil der Kandidaten 3 % (Detail 1), 4,5 % (2), 6 % (3). Bei H ≤ 12 halbieren, denn Wolle als Kugeln wirkt auf kleinen Bäumen klobig [40]. Mindestabstand Chebyshev 2 zu jedem Schmuck, 4 zu gleicher Farbe.
  - **Farben als Daten je Stil (2–3 Farben, Gewichte):**

| Stil | Kugeln (Gewicht) | Licht |
|---|---|---|
| medieval | red_concrete 5, gold_block 3, white_concrete 2 | glowstone |
| fantasy | purple_concrete 4, gold_block 3, light_blue_concrete 3 | ochre_froglight |
| rustic | red_wool 6, white_wool 4 | shroomlight |
| nordic | red_concrete 6, white_concrete 4 | ochre_froglight |
| japanese | gold_block 6, white_concrete 4 (sparsam, Detail −1) | ochre_froglight |
| cherry | pink_concrete 5, white_concrete 3, gold_block 2 | pearlescent_froglight |
| modern | white_concrete 5, iron_block 3, gold_block 2 | sea_lantern |
| mediterranean | orange_terracotta 4, gold_block 4, white_concrete 2 | ochre_froglight |
| Thema Winter | white_concrete 5, light_blue_concrete 3, iron_block 2 | pearlescent_froglight |

- **Aufhänger** ab H ≥ 26: Ist die Zelle über einer Kugel Laub, wird sie mit p = 0,5 zu `iron_chain[axis=y]`. Ketten brauchen keinen Halt und wirken wie die Kugelöse (Einschätzung).
- **Lichter:**
  - Nur **eine** warme Lichtart je Baum (Tabelle). Real sind Lichterketten oft einfarbig, manche Märkte schreiben „nur weiße Beleuchtung“ vor [1].
  - 3–5 % der Hülle. 50 % ersetzen Hüllblöcke, 50 % sitzen **einen Block hinter** einer Hüllzelle und glimmen durch das Laub. Laub blockiert kein Licht; Froschlicht und Pilzlicht im Baum empfiehlt der Christmas-Guide [40].
  - Mindestabstand 3 zwischen Lichtern.
- **Schnee am Baum:**
  - Mit Schnee schmelzen Lichtquellen der Stufe 15 die Schneeschichten auf den Etagen im Taxicab-Radius 3 weg (→ vorhandene Notiz Winter).
  - Schneesicher ist `waxed_exposed_copper_bulb[lit=true,powered=false]` (Licht 12: Schnee daneben bekommt 11 und bleibt liegen). Dafür muss zuerst `families.ts:229` korrigiert werden.
- **Lichterkette als Spirale (optional, Detail 3):**
  - Für jede Lage y ist der Winkel `θ(y) = θ0 + 2π·(yTop − y)/P` mit `P = max(6, round(C/3))`, also etwa 3 Windungen. An der Hüllzelle, die θ am nächsten liegt, wird jede zweite Lage ein Licht gesetzt.
  - Die zweite Spirale um π versetzt nur bei H ≥ 26. Echte Großbäume tragen Zehntausende Lichter, gleichmäßig um den Baum geführt [45].
- **Wirkung hoch · Aufwand niedrig** (Zahlen und Palette als Daten). Stile: alle. Quellen: [1][40][45], Einschätzung.

```
Ansicht einer Etagenkante (Blick von Süden, Ausschnitt), y relativ zur breitesten Lage
Legende: L=spruce_leaves, K=red_concrete (Kugel), c=iron_chain[axis=y] (Öse), g=ochre_froglight hinter der Hülle (d=−1, durchscheinend), G=ochre_froglight in der Hülle, h=hängende Spitze
y+2  . L L L L L L L L L .
y+1  L L L c L L L g L L L      g sitzt eine Zelle tiefer im Baum
y 0  L L L K L L L L L G L      breiteste Lage: Kugel an der Astspitze
y−1  h . . . . h . . . . h      hängende Spitzen
```

#### A6 Stern, der mit dem Baum wächst

- **Größenstufen (Einschätzung):**
  - H ≤ 14: kompakt, wie heute. Kern `gold_block` bzw. `glowstone`, 4 `end_rod` waagerecht, 1 `end_rod[facing=up]`.
  - H 15–22: 3×3-Plus in zwei gekreuzten Ebenen (7 Blöcke, Kern Licht).
  - H 23–32: 5×5-Pixelstern doppelt.
  - H ≥ 33: 7×7 doppelt, dazu `end_rod`-Strahlen an den fünf Spitzen.
- **Vorbild:** Ein Guide baut den Stern aus Seelaternen mit Quarztreppen ringsum [40], ein anderer aus Glowstone und Endstäben [43].

```
5×5-Pixelstern, Ebene x/y (dieselbe Figur zusätzlich in der Ebene z/y, Mittelspalte geteilt)
Legende: O=gold_block (Umriss), Y=glowstone bzw. ochre_froglight (Kern), e=end_rod[facing=up] (Stiel), L=Kronenspitze
y+5  . . O . .
y+4  O O Y O O
y+3  . O Y O .
y+2  . O e O .
y+1  O . e . O
y 0  . . L . .
```

- Für Winter: Umriss `white_concrete` oder `quartz_block`, Kern `pearlescent_froglight`.
- **Wirkung hoch** (Silhouette der Spitze) **· Aufwand niedrig.** Quellen: [40][43][48] (Stern, Engel oder Glasspitze als traditionelle Spitze), Einschätzung.

#### A7 Fuß: Baumscheibe, Zaun und Geschenkgruppen

- **Baumscheibe:**
  - Kleiner Baum: Ring aus `red_carpet`/`white_carpet` (Christbaumdecke) im Radius 1–2 um den Stamm.
  - Großer Platzbaum: Ring aus `spruce_fence` mit einem `spruce_fence_gate` im Radius `R_unten + 1`, Pfosten jede 4. Position als `spruce_log`, darauf `white_candle[candles=3,lit=true]` (Kerzen brauchen mittige Stütze, die Zaun- und Stammköpfe bieten [18]).
  - Die Idee, Falltüren um den Baumfuß zu legen, stammt aus einem Builder-Guide [43].
- **Geschenke in Gruppen** von 3–5 je Gruppe, 1–3 Gruppen. 50 % der Gruppen stehen unter der untersten Etage (r ≤ 0,7·R_unten), der Rest direkt davor.
  - Größen: 1×1×1 (60 %), 1×1×2 hoch (15 %), 2×1×1 (15 %), 3×3×2 mit Bandkreuz (10 %, nur H ≥ 26).
  - Farben aus der Kugelpalette des Stils plus Weiß.

```
Großgeschenk 3×3×2, Draufsicht (beide Lagen gleich), Ansicht von jeder Seite zeigt das Band
Legende: A=red_wool (Papier), B=white_wool (Band), oben auf der Mitte: b=white_carpet (Schleife)
y1: A B A   y2: A B A   y3: . b .
    B B B       B B B
    A B A       A B A
```

- **Wirkung mittel · Aufwand niedrig.** Quellen: [18][40][43], Einschätzung.

### Teil B: Weihnachtsmarktbude und Budengasse

#### B1 Hüttentyp „Weihnachtsmarkt“: Satteldach mit Giebel zur Gasse

- **Belege:**
  - Aschaffenburg schreibt vor: „Holzhäuschen mit Satteldach (Giebel nach vorne), möglichst mit einem Dachüberstand in die Verkaufsgasse“. Dazu „Tannengrün sowie nur weiße Beleuchtung“ und „Die Dächer … sind mit Girlanden aus Tannengrün zu schmücken“; an Eckständen wird der Schmuck ausgedehnt [1].
  - Bad Soden: Im Dachgiebel ist ein Lichterschlauch montiert [2].
  - Typische Maße: 3×2 m [3], Glühweinhütte 7×3×3 m [4], 3-m-Hütte 3,00×2,15 m mit den Designs „Rustikal“, „Nordisch“ und „Fachwerk“ [5].
- **Maßstab im Spiel (Einschätzung):**
  - Ein Block entspricht 1 m, Builder vergrößern Kleinbauten aber etwa um das 1,5- bis 2-Fache.
  - Größen: klein 5×4 (Front × Tiefe), mittel 7×5, Doppel- oder Glühweinhütte 9–11×5.
  - Wandhöhe 4 (Theke y1, Öffnung y2–y3, Sturz y4), Dachüberstand vorn 1–2, seitlich 1.
- **Vorlage Front** (klein, 5 breit, Giebel nach Süden zur Gasse).
  - Legende Wandebene (d=0): P=spruce_log[axis=y] (Eckpfosten), H=stripped_spruce_log[axis=y] (senkrechte Bretter), Z=stripped_spruce_log[axis=x] (Sturzbalken), T=spruce_slab[type=top] (Theke), O=Öffnung (Luft).
  - Legende vor der Wand: D=spruce_trapdoor[facing=south,half=top,open=false] (heruntergeklappter Laden, Auslage, d=+1), R=Ortgang-Treppe aus der Dach-Engine (Satteldach, ridgeAxis=z, overhang 1 vorn), N=First spruce_slab, G=spruce_leaves[persistent=true] (Girlande unter dem Ortgang, d=+1), l=pearlescent_froglight bzw. ochre_froglight in der Girlande.

```
Ansicht Süd (Gasse), x = −1..5
y8   . . . N . . .
y7   . . R l R . .
y6   . R G H G R .
y5   R G H H H l R
y4   . P Z Z Z P .
y3   . P O O O P .
y2   . P O O O P .
y1   . P T T T P .      d=+1 davor: . . D D D . .
y0   s s s s s s s      s = spruce_slab[type=top] oder Sockel (plinth)
```

```
Schnitt in Hüttenmitte unter dem First (Blick nach Osten), d: Rückwand −3 … Front 0 … Gasse +2
Legende: N=First (spruce_slab aus der Dach-Engine, läuft von Überstand hinten bis Überstand vorn), H=Giebelfüllung,
         c=iron_chain[axis=y], Q=lantern[hanging=true], W=Rückwand stripped_spruce_log[axis=y], b=Regal spruce_slab[type=top],
         w=Ware (Kerze, Topf), Z=Sturz stripped_spruce_log[axis=x], O=Öffnung, T=Theke spruce_slab[type=top],
         D=Auslage spruce_trapdoor[facing=south,half=top,open=false], l=Licht der Girlande unter dem Firstüberstand, s=Boden
y8   N N N N N N .
y7   . H . c H l .
y6   . H . c H . .
y5   . H . Q H . .
y4   . H . . Z . .
y3   . W w . O . .
y2   . W b . O . .
y1   . W . . T D .      Waren auch auf T und D
y0   . s s s s . .
d:  −4 −3 −2 −1 0 +1 +2
```

- Falltüren brauchen seit 1.9 keinen Halteblock, und eine geschlossene obere Falltür trägt Waren wie ein fester Block [14]. Die Auslage D hält also frei vor der Theke.
- **Varianten:**
  - **Oberer Klappladen als Vordach:** `spruce_trapdoor[facing=south,half=top,open=false]` bei d=+1 auf Sturzhöhe y4. In Aschaffenburg ist das verboten, anderswo üblich [1]. Deshalb nur als Variante mit p = 0,3.
  - **Eckbude:** zwei offene Seiten mit Theke, Girlande um die Ecke geführt [1].
- **Einsatz:** alle Stile, Thema Weihnachten und Winter; ohne Thema dieselbe Hütte ohne Grün. **Wirkung hoch · Aufwand mittel** (neue Vorlage, Dach-Engine wiederverwenden). Quellen: [1][2][3][4][5].

#### B2 Wandbilder je Stil (Daten)

Die Hersteller-Designs Rustikal, Nordisch und Fachwerk [5] lassen sich direkt auf unsere Stile abbilden. Die Blöcke sind eine Einschätzung:

| Stil | Pfosten (frame) | Wand (wall) | Dach (roof) | Akzent |
|---|---|---|---|---|
| rustic | spruce_log | stripped_spruce_log[axis=y] | spruce_stairs | dark_oak_trapdoor Läden |
| nordic | dark_oak_log | red_terracotta oder mangrove_planks („Falunrot“) | dark_oak_stairs | birch_trapdoor/pale_oak_trapdoor weiß, Ortgang weiß |
| medieval | dark_oak_log, Streben | white_terracotta/calcite-Gefache (Fachwerk) | spruce_stairs | spruce_trapdoor |
| fantasy | stripped_dark_oak_log | spruce_planks | warped_stairs (türkis) oder crimson_stairs (rotviolett) | gold_block-Kugeln am First |
| japanese (Yatai) | stripped_spruce_log | bamboo_planks | dark_oak_slab flach | white_wall_banner als Noren (nicht in Registry) |
| cherry | stripped_cherry_log | cherry_planks | cherry_stairs | pink_candle |
| modern | stripped_birch_log | smooth_quartz | smooth_stone_slab (Flachdach) | black_concrete-Rahmen |
| mediterranean | stripped_oak_log | white_terracotta/smooth_sandstone | brick_stairs | gestreifte Markise B4 |

- Tannengrün und Lichter kommen in allen Stilen aus der Festschicht.
- Dachfarben für eine „Plane“ in Rot oder Grün, wie Aschaffenburg sie neben Holzschindeln erlaubt: `mangrove_stairs` bzw. `red_nether_brick_stairs` als dunkles Rot, `dark_prismarine_stairs` bzw. `warped_stairs` als Grün. Einschätzung.
- **Wirkung mittel · Aufwand niedrig.**

#### B3 Waren und Auslage im richtigen Maßstab

- **Regel (Einschätzung):**
  - Auf Theke und Auslage stehen mindestens 70 % Waren unter halber Blockhöhe.
  - Vollblöcke (Fass, Heu, Bücherregal) nur hinter der Theke, an der Rückwand oder als Stapel neben der Bude.
  - Die Thekenmaße aus dem Builder-Guide passen: 1–2 hoch, 3–5 breit, Falltüren als „Beine“ [9].
- **Halbblock-Waren (registriert):**
  - `candle`/`<farbe>_candle[candles=1..4,lit=true]`: Kerzenstand. Kerzen brauchen eine mittige Stütze; Stufe oben und geschlossene obere Falltür haben eine volle Oberseite [18].
  - `potted_spruce_sapling` als Mini-Christbäume (Christbaumverkauf), `potted_azalea_bush`, `potted_fern`, `flower_pot`.
  - `lantern` stehend (Laternenstand).
  - `*_carpet` als Tücher auf der Auslage.
- **Halbblock-Waren (nicht in Registry):**
  - `cake`: 0,5 Blöcke hoch, braucht festen Block darunter, auf einer Stufe geht es [11].
  - `<farbe>_candle_cake[lit=true]` [11][17] für Lebkuchen und Stollen.
  - `decorated_pot`: schlichte Ziegeloptik ohne Scherben. Die Wiki nennt Block-Entity-Daten, schlicht ginge also nur mit Standardwerten [12]; vorher am Export prüfen.
  - `sea_pickle` (Pralinen-Anmutung), `bell` (Glockenstand, `attachment=floor`) [13].
- **Warenthemen je Bude (Daten):**

| Thema | Theke/Auslage | Rückwand/Hintergrund |
|---|---|---|
| Kerzen | 6–8 Kerzen gemischt 1–4, 2–3 Farben | Regal mit Kerzen |
| Christbäume | 3–5 potted_spruce_sapling | spruce_leaves-Bündel, spruce_log liegend |
| Glühwein | lantern, red_candle | barrel[facing=north|…] liegend gestapelt, campfire nur draußen mit Abstand |
| Lebkuchen | cake/candle_cake (nicht in Registry), brown_carpet | bookshelf als „Kistenregal“ |
| Holzspielzeug | spruce_trapdoor als Kisten, flower_pot | barrel, crafting_table |
| Gestecke | potted_azalea_bush, potted_fern, red_candle | azalea_leaves-Kranz |

- **Licht innen:** eine `lantern[hanging=true]` an `iron_chain[axis=y]` unter dem First. Laternen dürfen nicht an Laub hängen (→ vorhandene Notiz). Laut Bad Soden kommt die Innenbeleuchtung vom Betreiber, die Stadt Landsberg stellt „dezente Dekoration und Beleuchtung“ [2][3].
- **Wirkung hoch · Aufwand niedrig.** Quellen: [2][3][9][11][12][13][17][18].

#### B4 Gestreifte Markise (Nürnberger Tuch, Sommer- und Mittelaltermarkt)

- **Beleg.** Der Nürnberger Christkindlesmarkt hat rund 180 Holzbuden, „traditionsgemäß mit rot-weiß gestreiftem Stoff“, die „Städtlein aus Holz und Tuch“. Plastik-Tannengirlanden sind verboten [6].
- **Vanilla-Vorbild.** Die Marktbude im Dorf-Treffpunkt `plains_meeting_point_4` (eigene NBT-Auswertung) [8]:
  - 4 Eckpfosten aus `oak_fence`, 3 hoch.
  - Theke als Mittelreihe aus `oak_planks` mit Fackeln.
  - Flaches Dach auf y4 als Schachbrett aus `white_wool`/`yellow_wool`, seitlich gerahmt von `oak_slab[type=bottom]`.
- **Regel (Einschätzung):**
  - Der Stoff ist **Wolle** (`red_wool`/`white_wool`), nicht Stein. Die Streifen laufen in Gefällerichtung, je 1 Spalte breit.
  - Die Markise hängt **vor** der Front und ist kein Hausdach. Neigung 1:1 als Vollblock-Stufen, höchstens 2 Stufen tief.
  - An der Unterkante hängt ein Volant aus offenen Falltüren im selben Streifenwechsel: rot `mangrove_trapdoor`, weiß `pale_oak_trapdoor` (1.21.11) bzw. `birch_trapdoor`.
  - Alternative für Volants: `red_wall_banner`/`white_wall_banner` (nicht in Registry). Ein Banner hat eine Hitbox von 1 Block, erscheint aber 2 Blöcke hoch [10]. Ohne Muster braucht es keine Musterdaten, den Export vorher prüfen.

```
Schnitt Markise (Blick nach Osten), d relativ zur Frontwand, Spalte mit rotem Streifen
Legende: H=Wand, W=red_wool (Nachbarspalte white_wool), V=mangrove_trapdoor[facing=north,half=top,open=true] (Nachbarspalte pale_oak_trapdoor), O=Öffnung
y5   H W . .
y4   H . W .
y3   O . V .      V hängt unter der äußeren Stufe, Platte an der Außenseite (facing=north → Platte im Süden der Zelle)
y2   O . . .
d:   0 +1 +2 +3
```

- **Einsatz:** mediterranean, medieval (Sommermarkt), fantasy; im Thema Weihnachten nur als Variante „Nürnberg“ mit Holzbude darunter. **Wirkung mittel · Aufwand niedrig.** Quellen: [6][8][10].

#### B5 Budengasse

- **Belege:** Märkte liegen traditionell auf dem Stadtplatz, teils mit Eisbahn oder Krippe [7]. Eckstände tragen den Schmuck rundum [1]. Für mehrere Händler braucht es „actual walkway space“ [9].
- **Vorlage (Einschätzung):**
  - Zwei Reihen, Fronten zur Gasse, Gassenbreite 5 (klein), 7 (groß).
  - Zwischen zwei Buden 2 Blöcke Luft, damit die Dachüberstände nicht verschmelzen (heute 1, M4). Alternativ eine Doppelhütte mit durchlaufendem First.
  - Jede 4. Bude ist eine Glühweinhütte (9×5) mit 2–3 **Fass-Stehtischen** davor: `barrel[facing=up]`, Oberkante auf Hüfthöhe, mit `red_candle[candles=1,lit=true]` darauf.
  - Endbuden als Eckbuden.
  - Am Gassenende oder in der Mitte ein **Platz** 9×9 bis 15×15 mit Baum H 14–18 (A1–A7) und Bänken zum Baum.
  - **Lichterketten quer über die Gasse** alle 6 Blöcke zwischen gegenüberliegenden Giebelspitzen: `iron_chain[axis=z]` mit jedem 3. Glied als Licht (`pearlescent_froglight` bzw. `waxed_exposed_copper_bulb[lit=true]`). Ketten und Vollblöcke brauchen keinen Halt; Laternen können **nicht** unter waagerechten Ketten hängen (keine mittige Unterseite, [15][18]).
  - Geschenke **nicht** in der Gasse, nur unter dem Baum.
  - Laternenpfähle (Vanilla-Schneedorf, → vorhandene Notiz) an den Gassenenden.

```
Draufsicht Gasse groß (5 Buden + Glühweinhütte + Platz), Norden oben, in z nicht maßstäblich (Budentiefe weggelassen)
Legende: K=Bude 5 breit (Front zur Gasse), G=Glühweinhütte 9 breit, f=Fass-Stehtisch, -=Lichterkette über der Gasse (alle 6 x),
         T=Baum mit Zaunring, b=Bank zum Baum, P=Laternenpfahl, .=Pflaster
x:   0         10        20        30
     P K K K K K . . K K K K K . . G G G G G G G G G . . . b b b .
     . . . . . . . . . . . . . . . . f . . f . . . . . . . T T T .
     - - - - - - - - - - - - - - - - - - - - - - - - - - b T T T b
     . . . . . . . . . . . . . . . . . . . . . . . . . . . T T T .
     P K K K K K . . K K K K K . . K K K K K . . . . . . . b b b .
```

- **Wirkung hoch · Aufwand mittel.** Quellen: [1][7][9][15][18].

### Teil C: Bahnhof

#### C1 Bautyp Kleinstadt- und Dorfbahnhof

- **Reale Gliederung:**
  - Empfangsgebäude mit 2-geschossigem Mittelbau (oben Dienstwohnung) und 1-geschossigen Flügeln (Warteraum, Schalter, Gepäck). Kleine Güterschuppen sitzen meist seitlich am Empfangsgebäude, größere stehen frei, oft mit Laderampe. Der Schuppenboden liegt auf Höhe der Wagenböden; auf einer Seite liegt das Gleis, auf der anderen die Straße [30].
  - Davor der Hausbahnsteig, „direkt vor dem Empfangsgebäude“ [28].
  - Viele Bahnen bauten nach Typenplänen [39]. Der Schweizerstil mit flach geneigten, weit vorkragenden Pfettendächern und Brettschnitzereien wurde „bevorzugt für Bahnhöfe“ verwendet [37].
- **Unser Generator** hat Halle plus zwei Flügel mit eigenen Dächern, das ist richtig. Es fehlen der Hausbahnsteig am Gebäude, ein Güterschuppen als Flügelende und die stilgerechten Bahnsteigbauteile.
- **Proportionen (Einschätzung):**
  - Flügel-Traufhöhe 0,55–0,7 der Hallen-Traufhöhe.
  - Bahnsteig mindestens so lang wie das Gebäude plus je 4–6 Blöcke.
  - Bahnsteigtiefe 4–6, Gleisbett 3 (+1 Schulter je Seite).
  - Güterschuppen 7–11 lang, 5–7 tief, Boden +1.
- **Stilzuordnung (Daten):**

| Stil | Vorbild | Bahnsteigdach | Stützen | Volant |
|---|---|---|---|---|
| medieval | Fachwerk-Landbahnhof | Pultdach Holz | spruce_log + Kopfbänder | spruce_trapdoor-Band |
| rustic | Holzbahnhof Alpen/Western | Pultdach Schindel | spruce_log | spruce_trapdoor-Band oder keiner |
| nordic | Schweizerstil/Norwegen [37] | Pultdach, weit auskragend | dark_oak_log | Brettschnitzerei (Lambrequin) [38] |
| fantasy | viktorianisch, Gusseisen | Pultdach oder Schirmdach | polished_blackstone_wall | glass_pane-Schürze [27] |
| modern | Betonbahnsteig | Flugdach flach (Schirm) | polished_deepslate_wall | keiner |
| mediterranean | Putzbahnhof | Arkade/Pultdach Ziegel | sandstone_wall (kein smooth_sandstone_wall im Spiel) | keiner |
| japanese | Landbahnhof | Pultdach dark_oak_slab | stripped_dark_oak_log | keiner |
| cherry | wie japanese | Pultdach cherry | stripped_cherry_log | keiner |

Quellen: [27][28][30][37][38][39].

#### C2 Hausbahnsteig mit Pultdach, Säulen, Konsolen und Volant

- **Belege:**
  - Historisch waren „flach geneigte Satteldächer auf zwei Reihen von Stützen“ bis Anfang des 20. Jh. verbreitet, heute oft Flugdächer von einer mittleren Stützenreihe. Ältere Dächer stehen auf „historisierenden Gusseisen-Säulen“, Dachränder trugen „fast 1 m nach unten reichende Schürzen aus Glasplatten“ [27].
  - Builder-Rhythmus: Stützen „spaced about 4 blocks apart“, dazwischen hängende Ketten oder Laternen [25].
  - Lambrequin: zacken- oder zungenförmige Zierblende an Dachkanten, aus Holz oder Metall [38].
- **Regel (Einschätzung):**
  - Am Gebäude ein Pultdach (Neigung 1:2 aus Treppen und Stufen, wie das Profil „flach“ der Dach-Engine), Wandanschluss unter der Hallentraufe.
  - Eine Säulenreihe 2 Blöcke hinter der Bahnsteigkante, also hinter der Sicherheitslinie. Säulenabstand 4–6, auf die Fensterachsen der Fassade ausgerichtet.
  - Je Säule zwei Konsolen. Untersicht aus `soffit`-Stufen `[type=top]` wie in der Dach-Engine. Volant an der Gleisseite bei Detail ≥ 2.
  - Lichte Höhe unter Kapitell, Treppen und Traufstufe mindestens 3 über dem Bahnsteig.

```
Querschnitt (Blick nach Osten), z: Gebäudewand z0 … Gleis
Legende: W=Gebäudewand, s=roof-Treppe[facing=north,half=bottom], h=roof-Stufe[type=bottom],
         C=Säule polished_blackstone_wall (Stil fantasy) bzw. spruce_log (rustic), A=Kapitell polished_blackstone,
         K=Konsole polished_blackstone_brick_stairs[half=top] links/rechts der Säule (Längsrichtung, siehe Ansicht unten),
         V=Volant spruce_trapdoor[facing=north,half=top,open=true] bzw. glass_pane (Glasschürze), P=Bahnsteigbelag (path),
         L=Sicherheitslinie white_concrete, E=Kante stone_brick_stairs[half=top,facing=north], B=Bahnsteig-/Gebäudesockel (plinth),
         S=Schwelle stripped_spruce_log[axis=z] (an dieser x-Position; an der nächsten Schotter), r=rail[shape=east_west], o=Schulter
y8   W . . . . . . . . . .
y7   W s h . . . . . . . .      Dachoberkante 8,0 / 7,5
y6   W . . s h . . . . . .      7,0 / 6,5
y5   W . . . A s h . . . .      6,0 / 5,5 an der Traufe
y4   W . . . C . V . . . .      V hängt außen unter der Traufstufe
y3   W . . . C . . . . . .
y2   W . . . C . . . . . .      Bahnsteigoberkante = 2,0
y1   W P P P P L E . r . .      Schiene auf y1
y0   B B B B B B B S S S o      Gleisbett bündig mit dem Gelände
z:   0 1 2 3 4 5 6 7 8 9 10
```

- Kante E bei z6, Schienenmitte bei z = 8,5: Von der Kantenfläche (z = 7,0) sind es 1,5 Blöcke, real ca. 1,65 m Einbaumaß [28]. Die Treppe E mit `half=top, facing=north` lässt unten zur Gleisseite eine Kehle frei, das ergibt die Schattenfuge unter der Kantenplatte.
- Höhe: Ein voller Block über Schwellenoberkante liest sich gut. Real sind es 55 oder 76 cm über Schienenoberkante [28]. Für den Stil „rustic“ geht auch ein Holzbahnsteig aus `spruce_slab[type=bottom]` (Oberkante +0,5).

```
Ansicht vom Gleis (Blick nach Norden), x = 0..12, Säulen bei x=0, 6, 12
Vordere Ebene z6: h=Traufstufe roof[type=bottom] (y5), V=Volant spruce_trapdoor[facing=north,half=top,open=true] (y4), E=Kante (y1)
Säulenebene z4:   A=Kapitell (y5), K=Konsole stairs[half=top] (y5; rechts der Säule facing=west, links facing=east),
                  C=Säule (y2–y4), c=iron_chain[axis=y] (y5), Q=lantern[hanging=true] (y4), alle 6 Blöcke mittig zwischen den Säulen
            vorn (z6)                    dahinter (z4)
y5   h h h h h h h h h h h h h    A K . c . K A K . c . K A
y4   V V V V V V V V V V V V V    C . . Q . . C . . Q . . C
y3   . . . . . . . . . . . . .    C . . . . . C . . . . . C
y2   . . . . . . . . . . . . .    C . . . . . C . . . . . C
y1   E E E E E E E E E E E E E    P P P P P P P P P P P P P
```

- Die Kette hängt direkt unter der Pultdach-Stufe bei z4/y6, deren Unterseite voll ist; die Laterne hängt an der Kette [15][16]. Die Laterne sitzt auf y4 (Unterkante ≈ 4,06), also über Kopfhöhe (Bahnsteig 2,0 + 1,8).

- **Einsatz:** alle Stile mit Volant laut Tabelle C1. **Wirkung hoch · Aufwand mittel** (Pultdach-Abschnitt in der Dach-Engine gibt es schon für Anbau und Vordach). Quellen: [25][27][28][38].

#### C3 Gleisbett mit sichtbaren Schwellen und gemischtem Schotter

- **Belege:**
  - Schotter ist kantiger Brechschotter. Die Schulter reicht 150–450 mm über die Schwellenenden hinaus, meist 300–400 mm. Unter der Schwelle liegen mindestens 150 mm [35].
  - Schienen halten auf Blöcken mit umlaufendem Rand der Oberseite: Vollblock, obere Stufe, Kopfüber-Treppe, obere Falltür; seit 1.15 auch auf Glas, Eis, Glowstone und Seelaterne [19].
- **Regel (Einschätzung):**
  - Gleisbett 3 breit: z−1, z, z+1 auf y=0 bzw. auf Dammhöhe.
  - **Schwellen** quer, jede 2. Position entlang des Gleises: `stripped_spruce_log[axis=z]` oder `spruce_planks`, dazu 30 % `stripped_dark_oak_log[axis=z]` für ältere Schwellen. Sie sind links und rechts der Schiene sichtbar, das ist der Effekt.
  - **Schotter** zwischen den Schwellen: `andesite` 40 %, `tuff` 25 %, `cobblestone` 20 %, `gravel` 15 % (nicht in Registry). Keine zwei gleichen nebeneinander (Pfadregel, → vorhandene Notiz).
  - **Schulter** z±2: `coarse_dirt` 50 %, `andesite` 30 %, Gras 20 %. Bei Schnee: Schicht 1 nur auf der Schulter, nicht auf dem Bett.
  - **Damm** (optional, Gelände): Bett um +1 angehoben, Böschung als `andesite_slab[type=bottom]` und `cobblestone_stairs`.
- Das Gleis bleibt eine echte `rail` (funktionsfähig). Builder kaschieren Antriebsschienen gern unter Teppich [25], das ist hier nicht nötig.

```
Draufsicht Gleisbett y0, x entlang, z quer (Bahnsteig oben, Indizes wie im Querschnitt C2)
Legende: E=Bahnsteigkante (y1), S=Schwelle stripped_spruce_log[axis=z], a/t/c=andesite/tuff/cobblestone, o=Schulter coarse_dirt bzw. andesite
z6   E E E E E E E E E E
z7   S a S t S c S a S t
z8   S c S a S t S a S c      darüber auf y1 durchgehend rail[shape=east_west]
z9   S t S c S a S t S a
z10  o o a o o o a o o o
```

- **Wirkung hoch · Aufwand niedrig.** Quellen: [19][25][35].

#### C4 Bahnhofsuhr: rundes Blatt, dünne Zeiger, Doppeluhr am Bahnsteig

- **Belege:**
  - Die Schweizer Bahnhofsuhr ist eine Ikone: rote Kelle als Sekundenzeiger, Minutensprung [36].
  - Das Wiki-Tutorial empfiehlt „a clock in an item frame“ [24]. Das ist ein Entity und für uns verboten.
- **Regel (Einschätzung):**
  - Zifferblatt rund (Kreis D5, D7 bei Hallenbreite ≥ 15) aus `white_concrete` bzw. `smooth_quartz`.
  - Rahmen 1 Ring aus `polished_blackstone` (Stil fantasy, modern) bzw. `stripped_dark_oak_wood` (medieval, rustic).
  - Zeiger **vor** dem Blatt (d=+1) als `iron_chain`: dunkel, 3 px dünn, braucht keinen Halt [15].
  - Stundenmarken bei D7 als `spruce_button`/`dark_oak_button` auf dem Rahmen bei 12/3/6/9. Knöpfe brauchen eine volle Fläche [18]; `polished_blackstone_button` wäre schwarz (nicht in Registry).
  - Platz: im Giebel der Halle oder in einem Dachreiter (C5), nicht flach vor das Fachwerk.

```
Uhr D5, Ansicht Nord (Straßengiebel)
d=0 (Blatt):        d=+1 (Zeiger):
. R R R .           . . . . .
R W W W R           . . c . .      c = iron_chain[axis=y] (Minutenzeiger, 12 Uhr)
R W W W R           . . c h .      h = iron_chain[axis=x] (Stundenzeiger, 3 Uhr)
R W W W R           . . . . .
. R R R .           . . . . .
R=Rahmen, W=white_concrete; die Diagonalecken bleiben Wand → runder Umriss
```

- **Bahnsteiguhr** (Doppeluhr) mittig über der Tür, unter dem Bahnsteigdach: `iron_chain[axis=y]` ×1 vom Dach, darunter `white_concrete` mit `stone_button` auf Nord- und Südseite als Zeigernabe. Sie ist klein, aber als „Uhr am Bügel“ lesbar.
- **Wirkung mittel · Aufwand niedrig.** Quellen: [15][18][24][36].

#### C5 Dachreiter mit Uhr und Wetterfahne

- **Beschreibung (Einschätzung):** Ein kleiner quadratischer Aufsatz auf dem Hallenfirst macht den Bahnhof als Bahnhof erkennbar, auch von der Straßenseite.
  - Ab Hallenbreite ≥ 11: 3×3 Grundfläche, 3 hoch, Wände `wall` oder Brettschalung, auf den Giebelseiten je eine Uhr D3. Die D3-Uhr hat Mitte `white_concrete` und `iron_chain[axis=y]` davor.
  - Darauf eine Pyramide aus `roof`-Treppen. Spitze `waxed_lightning_rod[facing=up]` (registriert) als Wetterfahne. Blitzableiter brauchen keinen Stützblock [23].
- **Wirkung mittel · Aufwand mittel** (kleiner Pyramidenabschnitt in der Dach-Engine). Quellen: [23], Einschätzung.

#### C6 Güterschuppen mit Laderampe

- **Belege:** seitlich am Empfangsgebäude oder frei stehend, Rampe angebaut, Boden auf Ladehöhe, Gleis- und Straßenseite [30].
- **Vorlage (Einschätzung):**
  - Flügelende oder eigene Masse, 1 Geschoss, Boden +1 auf `plinth`.
  - Wände in senkrechter Brettschalung (`stripped_spruce_log[axis=y]` bzw. `spruce_planks`), Rahmen `dark_oak_log`.
  - Tore 2 breit × 3 hoch: `spruce_door` als Doppeltür (T-Vorlage) oder „Schiebetor“ als offene Falltüren bei d=+1 vor geschlossener Wand.
  - Rampe 2 tief entlang Gleis- und Straßenseite: `stone_bricks` mit Kante `stone_brick_slab[type=top]`.
  - Ladedach 2 tief auf Kopfüber-Treppen-Konsolen.
  - Stückgut auf der Rampe: `barrel[facing=up|north…]` in Gruppen von 2–3, `hay_block[axis=x]`, gestapelte `spruce_slab`.

```
Schnitt Güterschuppen (Blick nach Osten), Gleisseite rechts
Legende: W=Wand, F=Boden spruce_planks (y1), R=Rampe stone_bricks, k=stone_brick_slab[type=top], s/h=Ladedach-Treppe/Stufe,
         K=Konsole spruce_stairs[half=top,facing=north] an der Wand, b=barrel, B=Sockel (plinth)
y5   W s . .
y4   W K h .
y3   W . . .
y2   W . b .
y1   F F R k      Rampe bündig mit dem Schuppenboden (Wagenbodenhöhe)
y0   B B B a      a = Gleisbett beginnt
```

- **Einsatz:** Größe ≥ medium. **Wirkung mittel · Aufwand mittel.** Quellen: [30].

#### C7 Wasserturm und Wasserkran

- **Belege:**
  - Bahnwassertürme sind massiv (Backstein, Beton) oder Stahlskelett, mit Behältern nach Intze, Barkhausen (Kugelboden) oder Klönne, typisch um 400 m³ [31].
  - Der Wasserkran ist ein stehendes Rohr (0,2–0,3 m) mit schwenkbarem Arm, in Ruhe parallel zu den Gleisen, oft am Bahnsteigende [32].
- **Vorlage (Einschätzung):**
  - **Turm:** Rundschaft D5 aus `bricks` (Ring aus der Geometriebibliothek, `roundTower.ts`), Höhe 8–10, Sockel `stone_bricks`.
  - **Behälter:** Ring D7 auf Konsolenkranz (Kopfüber-Treppen), 3 hoch aus `spruce_planks` mit Bändern `polished_blackstone_slab` (Holzbehälter-Optik) oder `waxed_weathered_cut_copper` (Stahlbehälter).
  - **Dach:** Kegel D9 flach.
  - **Wasserkran** am Bahnsteigende, 2 Blöcke neben der Gleismitte:
    - Säule `polished_blackstone_wall` 3 hoch auf `polished_blackstone`.
    - Arm `iron_bars` 2 Blöcke parallel zum Gleis. Gitterstäbe verbinden sich zur Seite, eine waagerechte Reihe wirkt wie ein Rohr; das wäre zu prüfen.
    - An der Armspitze `iron_chain[axis=y]` als Schlauch, oben `lantern`.

```
Wasserkran, Ansicht vom Bahnsteig (Gleis vorn, x entlang)
Legende: A=polished_blackstone, w=polished_blackstone_wall, i=iron_bars, c=iron_chain[axis=y], Q=lantern (stehend)
y5   Q . .
y4   w i i
y3   w . c
y2   w . .
y1   A . .
```

- **Einsatz:** Größe ≥ large (Turm), Kran ab medium. **Wirkung mittel · Aufwand mittel** (Turm) bzw. **niedrig** (Kran). Quellen: [31][32].

#### C8 Formsignal und Bahnsteigausstattung

- **Belege:**
  - Hp0 ist der waagerechte Flügel, Hp1 der Flügel 45° nach oben. Flügel sind „ein längliches Rechteck“, deren Ende auch „kreisförmig gestaltet“ sein kann; Laternen zeigen nachts farbige Lichtpunkte [33].
  - Masten aus Holz, Gitterstahl oder Beton. Hauptsignale rot mit weißem Band, Vorsignale gelb (UK) [34]; in Deutschland orange Klappscheiben [33].
  - Ein Stationsgenerator-Mod erzeugt automatisch genau diese Liste: „Pillars, canopys, safety lines/doors, PIDS, station buildings and ballasts“ [26].
- **Formsignal (Einschätzung):**
  - 6–10 Blöcke hinter dem Bahnsteigende, 2 Blöcke neben der Gleismitte.
  - Mast 5 hoch auf `stone_bricks`: `stripped_birch_log[axis=y]` (weiß gestrichener Holzmast) mit `ladder[facing=…]`. Eine Leiter braucht eine volle Fläche, an einem Gittermast aus `iron_bars` geht deshalb keine; der Gittermast ist die Variante ohne Leiter.
  - Flügel oben als offene Falltüren quer zum Gleis, damit der Zug die Fläche sieht: `mangrove_trapdoor[facing=east,open=true]` + `pale_oak_trapdoor` (weißes Band). Mit `facing=east` ist die Platte vertikal in der y/z-Ebene.
  - Hp1 als treppige Diagonale (2. Feld eine Lage höher).
  - Spitze `waxed_lightning_rod[facing=up]`.

```
Formsignal Hp0, Ansicht in Gleisrichtung (Gleis rechts)
Legende: q=waxed_lightning_rod[facing=up], I=stripped_birch_log[axis=y], F=mangrove_trapdoor[facing=east,half=top,open=true], f=pale_oak_trapdoor[…] (weißes Band), l=ladder, S=stone_bricks
y7   q . .
y6   I F f        Hp1-Variante: f auf y7
y5   I . .
y4   I l .
y3   I l .
y2   I l .
y1   S . .
```

- **Ausstattung (Einschätzung, Rhythmus):**
  - Bänke zwischen den Säulen an der Gebäudewand mit Blick zum Gleis (heute frei auf dem Bahnsteig alle 7, `station.ts:140`). Bauweise wie heute: Treppen mit Falltür-Armlehnen.
  - Laternen hängend zwischen den Säulen (heute ok).
  - **Stationsschild** an beiden Bahnsteigenden: 2 `spruce_fence` hoch, darüber 3×1 `white_concrete` mit `black_concrete`-Rahmenenden bzw. `smooth_quartz` (Schild ohne Text).
  - **Fahrkartenschalter:** Fensterfeld am Flügel mit `iron_bars` im unteren Mittelfeld (der Wiki-Tipp „glass screen with a 1×1 hole“ [24]) und `spruce_slab[type=top]` als Ablage bei d=+1.
  - **Gepäckkarren:** 2×1 `spruce_trapdoor[half=top]` auf `spruce_fence`-Beinen, darauf 1–2 `barrel`.
- **Wirkung mittel · Aufwand niedrig** (Ausstattung) bzw. **mittel** (Signal). Quellen: [24][26][33][34].

---

## Leitfragen: Wo steht die Antwort?

| Bauwerk | Leitfrage | Abschnitt |
|---|---|---|
| Bahnhof | Dorf-, Kleinstadt-, viktorianischer, Alpenbahnhof; Proportionen | C1 |
| Bahnhof | Bahnsteigdach mit Gusseisen-Stützen und Konsolen | C2 |
| Bahnhof | Bahnsteigkante, Gleise auf Schotter, Schwellen | C2, C3 |
| Bahnhof | Uhr, Bänke, Signale, Laternen | C4, C8 |
| Bahnhof | Schalter, Wartehalle (Flügel mit großen Fenstern), Güterschuppen, Wasserturm | C6–C8 |
| Bude | echte Weihnachtsmarktbuden | B1, B2 |
| Bude | Markisen, Auslagen, Waren, Theke | B3, B4 |
| Bude | Gasse mehrerer Buden | B5 |
| Baum | Kegelprofil, Ast-Etagen, Ränder, Laubmischung | A1–A4 |
| Baum | Kugeln, Kerzen, Lichter, Spirale, Stern, Geschenke, Sockel | A5–A7 |

- **Falltüren oder Stufen als Schwellen?** Nein. Eine Schiene hält nur auf einer **oberen** Falltür, und die sitzt am oberen Rand ihrer Zelle, schwebt also über dem Schotter. Stufen und Treppen tragen nur als obere Stufe bzw. Kopfüber-Treppe [19]. Am besten wirkt ein ganzer Block `stripped_spruce_log[axis=z]` bündig im Bett, mit sichtbaren Enden neben der Schiene (C3).
- **Was machen Profis am Baum besser als unser „klobiger“ Baum?**
  - (1) tiefe Etagen-Rücksprünge mit hängenden Spitzen,
  - (2) gelappte Ränder, die sich je Etage drehen,
  - (3) sparsamer Schmuck an den Astspitzen,
  - (4) eine Lichtfarbe, teils hinter der Hülle,
  - (5) ein mitwachsender Stern,
  - (6) ein Fuß mit Wurzeln, Baumscheibe und gruppierten Geschenken.

---

## Fehler, die Profis vermeiden

1. **Gedrechselte Bäume:** konzentrische Kreisscheiben ohne Lappen und ohne Drehung zwischen den Etagen. Äste dürfen nie identisch sein und nie auf derselben Höhe abgehen [41].
2. **Konfetti-Schmuck:** mehr als drei Farben, Kugeln auf jeder zweiten Hüllzelle, Lichter in Kugelgröße und Kugelfarbe.
3. **Wollwürfel auf kleinen Bäumen** wirken klobig [40]. Kleine Bäume schmückt man mit Licht.
4. **Biomgefärbtes Laub im Schematic:** Die Farbe ändert sich mit dem Einfügeort [20].
5. **Lichter und Kerzen auf Laub:** Laub hat keine Stützform (→ vorhandene Notiz). Frei schwebende Kerzen halten zwar, bis ein Block-Update kommt [40], überleben aber WorldEdit-Nachbar-Updates nicht.
6. **Starke Lichter neben Schnee:** Stufe 15 schmilzt Schnee in 3 Blöcken Umkreis, Endstäbe (14) in 2 [22].
7. **Hausdach auf der Bude:** Eine Bude braucht Dachüberstand zur Gasse und eine offene Front, kein geschlossenes Gebäude [1][9].
8. **Stein-„Stoff“:** Gestreifte Markisen aus Ziegel- oder Quarzblöcken lesen sich als Mauerwerk.
9. **Vollblock-Waren auf der Theke** zerstören den Maßstab.
10. **Kopierte Buden in einer Reihe** ohne Holz-, Dach- und Warenwechsel. Ohne Abstand verschmelzen sie zu einem Riegel.
11. **Dekoration im Laufweg:** Geschenke, Tische und Laternen stehen nie in der Gassenmitte [9].
12. **Abgesetzter Bahnsteig:** Gras zwischen Gebäude und Bahnsteig oder zwischen Kante und Gleis [28].
13. **Grelle Kantenlinie direkt an der Kante:** Die Kante ist heller Stein, die Markierung liegt dahinter [28][29].
14. **Unsichtbare Schwellen:** Nur die Mittelreihe zu tauschen bringt nichts, weil die Schienen-Textur sie überdeckt.
15. **Carport-Bahnsteigdach** auf zwei Pfostenreihen ohne Konsolen, Volant und Stil. Tiefe entsteht erst durch Kapitell, Konsole und Volant; die Wiki nennt Tiefe „crucial“ [51].
16. **Pixel-Uhren mit Vollblock-Zeigern:** Zeiger müssen dünn sein.
17. **Entities als Abkürzung:** Uhr im Rahmen, Item-Frame-Kugeln, Endkristall-Stern. Diese Tipps stehen in vielen Guides [24][40], sind aber in einem Block-Schematic nicht exportierbar (→ vorhandene Notiz).

---

## Empfehlungen für den Generator

Priorisiert nach Wirkung pro Aufwand. „Daten“ heißt Tabelle in Stil- oder Vorlagendaten, „Regel“ heißt Code.

| Prio | Was ändern | Modul | Daten/Regel | Akzeptanzkriterium |
|---|---|---|---|---|
| 1 | **Neues Baumprofil** (A1): Etagenstart `0.55·rb_{i−1}`, Etagenzahl aus C, hängende Spitzen eine Lage unter jeder Etage | `christmasTree.ts` `treeProfile`/`radiiFor` | Regel + Parameter (Startfaktor, Exponent) als Daten | Radien je Lage wie Tabelle A1 (H=18: Rücksprünge 1,2,2; H=26: 2,2,3); Basisbreite 0,6–0,85·C; 0 Validator-Reparaturen; Gartenbaum H=7 hat 2 Etagen |
| 2 | **Gelappte Lagen + Randrauschen + Äste** (A2), **Hohlbau** (A3) | `christmasTree.ts` | Regel | In jeder Lage mit r ≥ 3 unterscheiden sich größter und kleinster Randradius um ≥ 1 Zelle (Lappen vorhanden); Lappenphase je Etage um ≈137,5° gedreht; Laubzahl bei H=40 −40 % gegenüber heute; nichts schwebt |
| 3 | **Schmuck- und Lichtdichte, Paletten je Stil, Lichter teils hinter der Hülle** (A5) | `christmasTree.ts` (`ORNAMENTS` ersetzen), Stil-Daten in `src/core/style/styles.ts` | Daten (Tabelle A5) + Regel (Kandidaten an Astspitzen, Mindestabstände) | Kugeln 3–6 % der seitlichen Hüllzellen; ≤ 3 Kugelfarben; keine zwei Schmuckblöcke Chebyshev-benachbart; genau eine Lichtart; ≥ 40 % der Lichter bei d=−1 |
| 4 | **Registry-Fix Kupferleuchten** (12/8/4) und `waxed_exposed_copper_bulb` als schneesichere Licht-Option | `src/core/blocks/families.ts:229` | Daten | Unit-Test: Lichtwerte 15/12/8/4; mit Schnee und Bulb-Lichtern bleiben ≥ 90 % der Etagen-Oberseiten verschneit |
| 5 | **Weihnachtsmarkthütte als eigene Vorlage** (B1): Satteldach Giebel zur Gasse, Überstand 1–2, Theke + Auslage-Falltür, Innenlaterne, Tannengrün und weißes Licht an Traufe **und** Ortgang | neues `src/core/templates/stalls.ts` (Daten wie W/T-Vorlagen), `marketStall.ts` | Daten (Zellen mit Rollen, d-Werten) + Dach-Engine `ridgeAxis` quer zur Gasse | Im Thema Weihnachten kein `red_nether_brick`-Dach; jede Bude hat Auslage bei d=+1 und eine Innenlichtquelle; Abstand zwischen Dachüberständen ≥ 1 Block Luft |
| 6 | **Stilwerte für Buden** (B2) und **Waren in Halbblock-Größe** mit Warenthemen (B3) | `marketStall.ts` (`GOODS` ersetzen), Stil-Daten | Daten | ≥ 70 % der Theken-Waren sind Kerze, Topf oder Laterne; Vollblöcke nur bei d ≤ −2; 2 nebeneinanderliegende Buden unterscheiden sich in ≥ 2 von {Wand, Dach, Warenthema} |
| 7 | **Hausbahnsteig am Gebäude mit Pultdach, Säulen, Konsolen, Volant** (C2) | `station.ts`, Pultdach-Abschnitt der Dach-Engine | Regel + Stiltabelle C1 als Daten | Kein Gras zwischen Gebäudewand und Bahnsteig; Säulenabstand 4–6; jede Säule mit 2 Konsolen; lichte Höhe ≥ 3; Volant bei Detail ≥ 2 |
| 8 | **Gleisbett** (C3): Kante direkt am Bett, Schwellen quer über 3 Blöcke, Schottermix, Schulter | `station.ts:96–102` | Regel + Mischtabelle als Daten | Abstand Kantenfläche bis Schienenmitte = 1,5 Blöcke (heute 2,5); kein Gras zwischen Kante und Bett; ≥ 45 % der Bettzellen sind Schwellen; kein Schotterblock hat einen gleichen Nachbarn in x |
| 9 | **Uhr neu** (C4): runder Rahmen D5/D7 im Giebel, Zeiger aus `iron_chain` vor dem Blatt; Doppeluhr unter dem Bahnsteigdach | `station.ts:146–160` | Regel (Vorlage) | Kein Vollblock-Zeiger; Blatt rund (Diagonalecken frei); Zeiger d = Blatt + 1 |
| 10 | **Bahnsteigkante** als Kopfüber-Treppe, Sicherheitslinie 1 dahinter | `station.ts:89` | Regel | Keine farbige Linie im Kantenblock; Linie bei d=Kante−1 |
| 11 | **Geschenkgruppen unter dem Baum** (A7), keine Geschenke in der Marktgasse | `festive.ts:163–174`, `generateBuilding.ts:170`, `marketStall.ts:150–152` | Regel | Geschenke in Gruppen von 3–5; ≥ 50 % mit r ≤ 0,7·R_unten; 0 Geschenke auf Gassenzellen |
| 12 | **Mitwachsender Stern** (A6) | `christmasTree.ts:127–139` | Daten (Pixelmasken) | Sternbreite: H ≤ 14 → 3, H 15–22 → 3 (Plus), H 23–32 → 5, ≥ 33 → 7; in beiden Ebenen gleich |
| 13 | **Budengasse** (B5): Abstand 2, Glühweinhütte mit Fass-Tischen, Platz mit Baum H 14–18 ab large, Lichterketten über die Gasse | `marketStall.ts:46–70`, `:161–168` | Regel + Layout-Daten | Ab large ein Platz ≥ 9×9; Lichterketten alle 6 ± 1; keine Laterne unter waagerechter Kette (Validator) |
| 14 | **Nebengebäude nach Größe:** Güterschuppen (≥ medium), Wasserkran (≥ medium), Wasserturm und Formsignal (≥ large), Dachreiter mit Uhr (Hallenbreite ≥ 11) | `station.ts`, `roundTower.ts` wiederverwenden | Regel + Vorlagen-Daten (C5–C8) | large enthält Schuppen, Kran, Turm, 2 Signale; alle ohne Validator-Reparatur; Gesamtmaß ≤ Grenzen |
| 15 | **Registry ergänzen** (nur, wenn eine Empfehlung sie nutzt): `gravel`, `podzol`, `cake` und `*_candle_cake`, `bell`, `*_wall_banner`/`*_banner` (ohne Muster), `decorated_pot`, `polished_blackstone_button`, `cauldron` | `families.ts`, `shapes.ts` (Formklassen: cake, bell, banner) | Daten | Registry-Test gegen minecraft-data grün; WorldEdit-Lesetest grün; für Banner und Topf prüfen, dass der Export ohne Block-Entity-Daten das schlichte Aussehen ergibt |

Reihenfolge für eine Etappe (Einschätzung): 1–4 (Baum) bringen den größten sichtbaren Sprung bei kleinstem Risiko. 5–6 (Bude) ersetzen das schwächste Bild. 7–10 (Bahnsteig) folgen als eigene Etappe. 11–15 kommen nach Bedarf.

---

## Quellen

1. Stadt Aschaffenburg, Merkblatt Weihnachtsmarkt 2025 – https://mein.aschaffenburg.de/wp-content/uploads/2025/11/WM25-Merkblatt.pdf – Satteldach „Giebel nach vorne“, Überstand in die Gasse, keine Klappläden als Vordach, nur Tannengrün und weißes Licht, Tannengirlanden auf den Dächern.
2. Stadt Bad Soden, Bauanleitung Holzhütte – https://www.bad-soden.de/freizeit/veranstaltungen-feste/bewerbung-als-standbetreiber/informationen-fuer-standbetreiber-1/informationen-fuer-standbetreiber-weihnachtsmarkt/bauanleitung.pdf?cid=wyf – Fassadendeckel wird zur Theke heruntergelassen, Lichterschlauch im Giebel, Doppelhütte.
3. Stadt Landsberg am Lech, Teilnahmebedingungen LechStadtHütte 2025 – https://www.landsberg.de/fileadmin/user_upload/download/Rathaus-Maerkte/Teilnahmebedingungen_LechStadtHuette_25.pdf – Budenmaß 3×2 m, außen geschmückt, innen dezente Beleuchtung.
4. schausteller.de, Datenblatt Glühwein-Hütte – https://schausteller.de/geschaefte/pdf/generate/detail/2677 – 7,0 × 3,0 × 3,0 m.
5. Fjord Hütten GmbH, Christmasworld-Ausstellerseite (nur per Suchmaschinen-Snippet bestätigt) – https://christmasworld.messefrankfurt.com/frankfurt/en/exhibitor-search.detail.html/fjord-huetten-gmbh.html – 3-m-Hütte 3,00×2,15 m; Designs Rustikal, Nordisch, Fachwerk.
6. Wikipedia: Nürnberger Christkindlesmarkt – https://de.wikipedia.org/wiki/N%C3%BCrnberger_Christkindlesmarkt – ca. 180 Buden mit rot-weiß gestreiftem Stoff; Plastikgirlanden verboten.
7. Wikipedia: Christmas market – https://en.wikipedia.org/wiki/Christmas_market – Chalets auf dem Stadtplatz, Eisbahn, Krippe.
8. Vanilla-Struktur plains_meeting_point_4.nbt, 1.21.11 (eigene Auswertung) – https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/structure/village/plains/houses/plains_meeting_point_4.nbt – Zaunpfosten-Bude, Woll-Schachbrettdach mit Stufenrand.
9. minecraft.how, Market Stall – https://minecraft.how/blog/post/build-minecraft-market-stall – Thekenmaße, Falltürbeine, 3–4 Blöcke Luft, Laufweg, wenige Lichter.
10. Minecraft Wiki: Banner – https://minecraft.wiki/w/Banner – Wandbanner `facing`; Hitbox 1 Block, wirkt 2 Blöcke hoch.
11. Minecraft Wiki: Cake – https://minecraft.wiki/w/Cake – 0,5 hoch, braucht festen Block oder Stufe; Kerzenkuchen.
12. Minecraft Wiki: Decorated Pot – https://minecraft.wiki/w/Decorated_Pot – schlicht mit Ziegeln; Block-Entity mit `sherds`.
13. Minecraft Wiki: Bell – https://minecraft.wiki/w/Bell – `attachment` floor/ceiling/single_wall/double_wall; Block-Entity.
14. Minecraft Wiki: Trapdoor – https://minecraft.wiki/w/Trapdoor – Zustände; seit 1.9 kein Halteblock; geschlossen tragend.
15. Minecraft Wiki: Iron Chain – https://minecraft.wiki/w/Iron_Chain – axis; Laterne an Kette; Umbenennung in 1.21.9.
16. Minecraft Wiki: Lantern – https://minecraft.wiki/w/Lantern – an den meisten festen Blöcken, an Gittern und Scheiben; nahtlos an Kette.
17. Minecraft Wiki: Candle – https://minecraft.wiki/w/Candle – Licht 3/6/9/12; Kerzenkuchen.
18. Minecraft Wiki: Opacity/Placement – https://minecraft.wiki/w/Opacity/Placement – Stützflächen: Kerze und Laterne „small square“, Schiene „hollow square“, Knopf „full square“.
19. Minecraft Wiki: Rail – https://minecraft.wiki/w/Rail – Schiene auf Vollblock, oberer Stufe, Kopfüber-Treppe, oberer Falltür, Glas, Eis.
20. Minecraft Wiki: Leaves – https://minecraft.wiki/w/Leaves – feste vs. biomgefärbte Laubfarben; Schneefall-Weißfärbung nur Bedrock.
21. Minecraft Wiki: Spruce – https://minecraft.wiki/w/Spruce – Laub in „discrete rows“; Mega-Fichte 2×2.
22. Minecraft Wiki: End Rod – https://minecraft.wiki/w/End_Rod – haftet überall, Licht 14, schmilzt Schnee im Radius 2.
23. Minecraft Wiki: Lightning Rod – https://minecraft.wiki/w/Lightning_Rod – 6 Richtungen, ohne Stützblock, dünner Stab.
24. Minecraft Wiki: Tutorial:Train station – https://minecraft.wiki/w/Tutorial:Train_station – Seiten- und Mittelbahnsteig, Schalter mit 1×1-Loch, Uhr im Item-Frame.
25. minecraft.how, Train Station Guide – https://minecraft.how/blog/post/build-minecraft-train-station-guide – Stützen etwa alle 4 Blöcke, Ketten und Laternen, Treppensitze.
26. Modrinth: Station Builder – https://modrinth.com/mod/station-builder – Bauteilliste eines Stationsgenerators.
27. Wikipedia: Bahnsteigdach – https://de.wikipedia.org/wiki/Bahnsteigdach – Bauformen; Gusseisen-Säulen; Glasschürzen fast 1 m.
28. Wikipedia: Bahnsteig – https://de.wikipedia.org/wiki/Bahnsteig – 550/760 mm; Einbaumaß ca. 1,65 m; Sicherheitslinie; Hausbahnsteig.
29. Wikipedia: Railway platform – https://en.wikipedia.org/wiki/Railway_platform – Kantenmarkierung, Warnstreifen, Wetterschutz.
30. Wikipedia: Güterschuppen – https://de.wikipedia.org/wiki/G%C3%BCterschuppen – Lage am Empfangsgebäude, Rampe, Boden auf Ladehöhe.
31. Wikipedia: Bahnwasserturm – https://de.wikipedia.org/wiki/Bahnwasserturm – Behälterformen, Material, ca. 400 m³.
32. Wikipedia: Water crane – https://en.wikipedia.org/wiki/Water_crane – Rohr mit Schwenkarm parallel zum Gleis, am Bahnsteigende.
33. Wikipedia: Formsignal – https://de.wikipedia.org/wiki/Formsignal – Hp0 waagerecht, Hp1 45°, Flügelformen, Laternen.
34. Wikipedia: Railway semaphore signal – https://en.wikipedia.org/wiki/Railway_semaphore_signal – Mastmaterial, Flügelfarben, Flügellänge 1,2 m.
35. Wikipedia: Track ballast – https://en.wikipedia.org/wiki/Track_ballast – Schulter 150–450 mm, Brechschotter.
36. Wikipedia: Swiss railway clock – https://en.wikipedia.org/wiki/Swiss_railway_clock – rote Kelle als Sekundenzeiger.
37. Wikipedia: Schweizerstil – https://de.wikipedia.org/wiki/Schweizerhausstil – weit vorkragende Pfettendächer, Brettschnitzerei, bevorzugt für Bahnhöfe.
38. Wikipedia: Lambrequin – https://de.wikipedia.org/wiki/Lambrequin – gezackte Zierblende an Dachkanten.
39. Wikipedia: Empfangsgebäude – https://de.wikipedia.org/wiki/Empfangsgeb%C3%A4ude – Typenbauten der Bahngesellschaften.
40. DiamondLobby, Christmas tree – https://diamondlobby.com/minecraft/how-to-make-christmas-tree-minecraft/ – Stammbreiten, Spiegeln, klobige Wollkugeln, Froschlicht, Seelaternen-Stern, Wurzeln.
41. DiamondLobby, Custom tree – https://diamondlobby.com/minecraft/how-to-build-custom-tree-in-minecraft/ – Treppen an Knicken, Äste nie gleich, Laub rund und an der Astbasis breit, Zäune als Zweige.
42. Sportskeeda, Custom tree designs – https://www.sportskeeda.com/minecraft/5-best-custom-tree-designs-minecraft-bedrock-edition-beginners – Fichtenzaun-Äste verbreitern das Laub.
43. GuruGamer, Christmas tree ideas – https://gurugamer.com/pc-console/minecraft-christmas-tree-ideas-23354/amp – Bäume 40–50 hoch, hohler 26er, Falltüren am Fuß, Glowstone-Stern.
44. USDA, Christmas Tree Grade Standards – https://www.ams.usda.gov/sites/default/files/media/Christmas_Tree_Standard%5B1%5D.pdf – „Normal taper“ 40–100 %, Kegelumriss.
45. Wikipedia: Rockefeller Center Christmas Tree – https://en.wikipedia.org/wiki/Rockefeller_Center_Christmas_Tree – 21–30 m, ca. 50.000 LEDs, Stern mit 70 Zacken.
46. Wikipedia: Gemeine Fichte – https://de.wikipedia.org/wiki/Gemeine_Fichte – Kegelkrone, Quirle, hängende Unteräste, Kammfichte.
47. Wikipedia: Nordmanntanne – https://de.wikipedia.org/wiki/Nordmanntanne – Pyramidenkrone, bis zum Boden beastet.
48. Wikipedia: Weihnachtsbaum – https://de.wikipedia.org/wiki/Weihnachtsbaum – Schmuck und Spitze (Stern, Engel, Glasspitze).
49. Wikipedia: Christmas ornament – https://en.wikipedia.org/wiki/Christmas_ornament – Glaskugeln aus Lauscha, Lametta.
50. 4netplayers, Build your own trees – https://www.4netplayers.com/en-au/blog/minecraft/minecraft-build-your-own-trees/ – Laub an den Astenden, kaum am Stamm.
51. Minecraft Wiki: Tutorial:Adding beauty to constructions – https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions – Tiefe ist entscheidend.
52. Vorhandene Notiz `research_notes/Minecraft Bautechniken für Generator/winter_weihnachten_landschaft.md` – Schneeschmelze, Laub ohne Stützform, Laternenpfähle, Entity-Liste.
