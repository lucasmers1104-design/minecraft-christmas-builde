# Stilbibel Fantasy und Märchen (Stil-ID `fantasy`)

Stand 2026-10-23. Thema: Wie ein Märchen-, Hexen-, Elfen-, Zwergen- und Pilzhaus im Stil von Storybook-Architektur, Disney und Ghibli blockgerecht aussieht, und wie unser Stil `fantasy` dahin kommt.

Abgrenzung: Allgemeine Dachgeometrie, Fenster- und Türvorlagen und die Winter- bzw. Festschicht haben eigene Themen. Hier steht nur, was davon für Fantasy gilt oder neu dazukommen muss. Die alten Notizen `paletten.md` (Fantasy/Storybook, Elven, Pale Garden) und `daecher.md` (Abschnitt 4, Glocke und Flared) wiederhole ich nicht. Ich baue darauf auf und korrigiere sie, wo nötig.

Verifikation der Block-IDs: Alle IDs sind gegen `misode/mcmeta 1.21.11-summary/blocks/data.json` [Q41] geprüft (1166 Blöcke). „(nicht in Registry)“ heißt: Der Block existiert in 1.21.11, fehlt aber in `src/core/blocks/families.ts`. „(nicht im Materialkatalog)“ heißt: Der Block ist in der Registry, aber kein Material in `src/core/style/materials.ts`.

---

## Kurzfassung

Nach Wirkung sortiert:

1. **Das Dach ist das Haus.** Storybook-Häuser haben übertriebene, steile, unregelmäßige Dächer mit Rollkanten, Krüppelwalm und Katzenbuckel [Q1][Q3][Q4]. Ziel: Dachhöhe ≥ 1,5 × Wandhöhe bei kleinen Häusern. Heute deckelt der Generator jeden Dachabschnitt auf 7 Blöcke Anstieg. `steep` wird dadurch ab 5 Spalten oben flach (n=5 → `[4,4,4,1,1]`, n=8 → `[4,4,1,1,1,1,1,1]`), also wie ein Mansard- oder Scheunendach. Genau das zeigen die Screenshots.
2. **Neues Profil „Storybook“: Δ = 1,3,4,4,4,… in halben Blöcken.** Ein kurzer Glockenfuß, dann sofort 63°. Der Anstieg wird stilabhängig gedeckelt (klein 9, mittel 10, groß 12). Beim Kürzen bleibt die Steilheit am First erhalten.
3. **`gambrel` aus Fantasy entfernen** (konvexes Profil = Scheune). Stattdessen `half_hip` (Krüppelwalm, „jerkinhead“ [Q3][Q4][Q5]) und `saltbox` als Katzenbuckel.
4. **Hexenhut-Türmchen als Standardsignatur.** Ab Größe `medium` gibt es automatisch einen Rundturm oder ein Erkertürmchen mit breiter Krempe aus Stufen, Hutband, konkavem Kegel, um 1–2 Blöcke abgeknickter Spitze und `waxed_lightning_rod` als Spitze. Heute gibt es Türme nur auf Wunsch, und der Kegel ist gerade.
5. **Warmes Licht statt Seelenlaternen.** Aktuell bekommt jede Laterne im Stil `soul_lantern` (`styles.ts:111`, `openings.ts:80`). Bei Weihnachten widerspricht das „Gelbes Licht“. Künftig `soul_lantern` nur für die Hexen-Palette, nie beim Thema `christmas`.
6. **Weniger Fachwerk, mehr Putz.** `timber: 'all'` stellt Pfosten in jedes 1–4-Feld vor die Wand. Die Fassade liest sich dann als Holzgitter. Storybook heißt „thick white stucco“ mit wenig, schiefem Fachwerk [Q3]. Also Fachwerk nur im Obergeschoss oder Giebel, Felder bis 5 breit.
7. **Grundriss tiefer als breit (7×9, 9×11 …),** damit der Giebel zur Straße zeigt (Tür unter dem Giebel). Heute sind alle Fantasy-Grundrisse quadratisch (`styles.ts:104`), und der First liegt parallel zur Front.
8. **Schiefe blockgerecht, aber dosiert:** 2–3 bewusste Unregelmäßigkeiten je Haus, nie alles. Zur Auswahl: einseitige Auskragung, schiefes Dach (zwei Profile), Kamin mit Versatz, geknickte Turmspitze, wellige Traufe, Firstspitzen, Fensterhöhen ±1. Wände nie diagonal treppen.
9. **Sechs neue Paletten statt drei:** Märchencottage, Hexenhaus, Kupferhut (Disney), Elfenhaus, Lebkuchenhaus und Pilzhaus. Die heutigen drei unterscheiden sich nur in der Dachfarbe. `white_terracotta` liest sich als lachsfarben (L\* 75, Chroma 15,5) und nicht als weißer Putz. Standard wird `calcite`.
10. **Bewuchs-Schicht:** `vine` nur an vollen Flächen und nie unter Treppen (sie werden sonst beim ersten Update gelöscht [Q19]). Dazu `moss_carpet` nur auf vollen Oberseiten, `glow_lichen` (Licht 7, schmilzt keinen Schnee [Q20]) und Pilze nur im Topf. Lose Pilze brechen bei Licht ≥ 13 ab, außer auf Podsol oder Myzel [Q18].
11. **Schiefer Kamin mit Krone und Aufsatz** statt eines geraden 1×1-Zugs (`components.ts:149–162`). Storybook-Kamine sind „crooked“, „exposed on side of house“, mit „chimney pots“ [Q3][Q4].
12. **Neue Vorlagen:** T11 Rundtür (Hobbit [Q11]), W20 Vierpass-Rundfenster 2×2 aus vier Treppen, W19 Kreuzstock- bzw. Butzenfenster [Q8], W22 Ovalfenster, W04c mit nur einem Laden. W13 (Kirchen-Bleiglas) nicht mehr an Cottages.
13. **Lebkuchenhaus als Weihnachtsvariante:** `terracotta`-Wände, `smooth_quartz` als Zuckergussrahmen und Rollkante, `dark_oak`-Schokoladendach und Kandisfenster aus `orange_stained_glass` bzw. `yellow_stained_glass` [Q12][Q13]. Aktivierung über Thema Weihnachten und Stichwort „Lebkuchen“.
14. **Pilzhaus als eigene Form:** Stiel aus `mushroom_stem` und Kappe aus `red_mushroom_block[down=false]` mit Poren unten (alle nicht in Registry) nach der Vanilla-Riesenpilz-Form [Q16][Q17]. Der Zustandsauflöser muss dazu Pilzblock-Nachbarflächen auf `false` setzen, wie das Spiel es tut [Q16].
15. **Turm nicht ganz aus Stein:** `roundTower.ts:78` nimmt bei Fachwerkstilen das Sockelmaterial für die ganze Turmwand. Dazu kommen Bänder an jedem Geschoss, und das Ergebnis wirkt wie ein Leuchtturm. Besser: Stein nur unten, darüber Putz mit Pfosten, oben Auskragung.

---

## Schwächen des aktuellen Generators

Die Belege stammen aus `docs/screenshots/haus-fantasy-gross-ohne-thema.jpg` (S1), `haus-fantasy-weihnachten.jpg` (S2), `turm-fantasy-weihnachten.jpg` (S3) und dem Code.

| # | Schwäche | Beleg | Wirkung |
|---|---|---|---|
| 1 | **Anstiegsdeckel 7 zerstört steile Profile.** `capRise` macht steile Spalten vom First abwärts flacher. Nachgerechnet mit dem Code aus `profiles.ts`: `steep` n=5 → `[4,4,4,1,1]`, n=6 → `[4,4,2,1,1,1]`, n=8 → `[4,4,1,1,1,1,1,1]`. `bell` n=8 → `[1,1,1,1,1,1,4,4]` (lange flache Traufe, dann ein Knick), n=9 → `[1,1,1,3,1,1,1,1,4]` (wellig) | `profiles.ts:75–105`, `roofEngine.ts:217–223` (`maxRise ?? 7`); S1/S2: große Dächer mit flacher Oberseite wie eine Tonne | hoch |
| 2 | **Gambrel im Stil** (0,15): Das Profil wird konvex, das Dach sieht aus wie eine Scheune. `hip` auf fast quadratischem Grundriss wird zur Pyramide | `styles.ts:98`, `roofEngine.ts:137` | hoch |
| 3 | **Quadratische Grundrisse** 7×7 … 13×13. Bei W ≥ D liegt der First entlang x, und die Front zeigt die Traufseite statt eines Giebels | `styles.ts:104`, `plan.ts:202` (`ridgeMain`) | hoch |
| 4 | **Fachwerk überall** (`timber: 'all'`, Rahmen d=+1). Die Felder sind höchstens 4 breit, die Wand verschwindet hinter Stämmen. In S1/S2 ist das Erdgeschoss eine Pfostenreihe | `styles.ts:107`, `walls.ts:166`, `studs.ts` | hoch |
| 5 | **Seelenlaternen für alle Laternen** im Stil, auch beim Thema Weihnachten (S2: blaue Lichter an jedem Eingang) | `styles.ts:111`, `openings.ts:80` | hoch |
| 6 | **Keine automatischen Türmchen,** obwohl die Stilbeschreibung „Türmchen“ verspricht | `resolveInput.ts:99` (`tower: wishes.tower ?? 'none'`) | hoch |
| 7 | **Turmdach ohne Krempe und Knick:** Der Kegel ist nur D+2 breit, die Spitze ist ein Zaun. Der Kegel ist hoch (S3), aber gerade und ohne Hutband | `roundTower.ts:33–37`, `roundTower.ts:195`, `plan.ts:159` | mittel |
| 8 | **Turmwand ganz aus Sockelmaterial** mit Treppenband an jedem Geschoss: Rippenoptik wie bei einem Leuchtturm (S3) | `roundTower.ts:78`, `roundTower.ts:131` | mittel |
| 9 | **Kamin gerade** (1×1, Campfire oben), ohne Krone, Versatz oder Aufsatz. In S1 steht er als Stab mitten im Dach | `components.ts:135–162` | mittel |
| 10 | **Paletten zu ähnlich:** Alle drei haben Putz aus `white_terracotta`/`calcite` mit Schwarzeiche, nur die Dachfarbe wechselt. `white_terracotta` wirkt lachsrosa (S1). Nether-Hölzer lesen sich als „Nether“, nicht als Märchen. `accent: moss_block` wird im Haus nie benutzt | `palettes.ts:116–184`, `textureStats` (white_terracotta L\* 74,9, C 15,5, h 55°) | mittel |
| 11 | **Kirchenfenster am Cottage:** W13 (blau-rotes Bleiglas, 3×5) steht in der Fantasy-Liste | `styles.ts:109`, `windows.ts:117` | mittel |
| 12 | **Keine Rundtür, kein Rundfenster in Cottage-Größe:** W08 ist 3×3 (für den Giebel ok), T04 ist eine Portalnische | `doors.ts:21–32`, `windows.ts:104–123` | mittel |
| 13 | **Kein Bewuchs am Gebäude:** Die Landschaft setzt nur Wegmix, Blumen und eine Azaleenhecke | `landscape.ts:34,45,108` | mittel |
| 14 | **Registry-Lücken für den Stil:** `mushroom_stem`, `red_mushroom_block`, `brown_mushroom_block`, `glow_lichen`, `hanging_roots`, `spore_blossom`, `potted_red_mushroom`, `potted_brown_mushroom`, `potted_allium`, `potted_blue_orchid`, `podzol`, `mycelium`, `red_mushroom`, `cauldron`; `purpur_*` und `yellow_terracotta` fehlen im Materialkatalog | `families.ts:276–380`, `materials.ts:84–157` | mittel |
| 15 | **Gauben als Kastengauben** (W10) statt Fledermausgauben | `styles.ts:112` (`dormers: 0.5`), `windows.ts:359` | niedrig |
| 16 | **Hohe Traufen:** Sockel 1–2 plus Geschoss 4–5 ergibt die Traufe bei y 5–7. Storybook-Traufen hängen tief | `styles.ts:101–103` | niedrig |

---

## Techniken und Regeln

Konventionen: Facade kanonisch Süd wie in den Vorlagen, sonst die Richtung angegeben. d = Tiefe relativ zur Wandebene (−1 innen, 0 Wand, +1/+2 davor). „hb“ = halbe Blöcke. `<roof>` = Material der Dachrolle. Treppen `facing` = Richtung der hohen Seite, also die Richtung, in die man hinaufsteigt.

### T1 Storybook-Profil „Glockenfuß steil“

- **Beschreibung:** Eine flache Traufkante (Stufe), dann ein Übergang (Δ3 = obere Stufe + Treppe), dann 63° (Vollblock + Treppe). Das Dach hängt tief über die Wandkrone, und die Silhouette ist eine Spitzhaube. Reale Vorlage: „steep-pitched roof“, „curved roof peaks“, „rolled shingles over eaves“ [Q3]. Reetdach 45–55°, in Schneeregionen steiler [Q6].
- **Δ-Folge (hb, Traufe → First):** `1,3` und dann `4` bis zum First. Für n ≥ 7: `1,1,2` und dann `4`. Die Parität stimmt: t = 1, 4, 8, 12 … (Treppen nur auf geraden Oberkanten).
- **Maße:** Anstieg n=4 → 6, n=5 → 8, n=6 → 10, n=8 → 12 Blöcke. Deckel stilabhängig (siehe d). Überstand an der Traufe 2, am Ortgang 1.
- **Skizze:** Schnitt quer zum First, Blick nach Westen, Nordseite (Front) links, W=7, Überstand 2, n=5, Δ = 1,3,4,4,4.
  Legende: b=`dark_oak_slab[type=bottom]`, t=`dark_oak_slab[type=top]`, S=`dark_oak_stairs[facing=south,half=bottom]` (steigt nach Süden zum First), #=`dark_oak_planks`, r=`dark_oak_slab[type=bottom]` (First), W=Wand (`calcite`) in der Wandebene c2.
  ```
         c0 c1 c2 c3 c4 c5(First)
  y+8    .  .  .  .  .  r
  y+7    .  .  .  .  S  #
  y+6    .  .  .  .  #  .
  y+5    .  .  .  S  .  .
  y+4    .  .  .  #  .  .
  y+3    .  .  S  .  .  .
  y+2    .  .  #  .  .  .     ← Wandkrone (wallTop)
  y+1    .  S  W  .  .  .
  y+0    b  t  W  .  .  .     ← Traufe hängt 2 unter der Wandkrone
  ```
- **Einsatz:** Fantasy Haupt- und Flügeldächer, alle Größen; Gaube und Vordach weiter `standard`. Auch `rustic` (Alpenhütte) und `nordic`.
- **Wirkung/Aufwand:** hoch / niedrig (neuer Profilname in `profiles.ts` plus stilabhängiger Deckel).
- **Quellen:** [Q3][Q6]; Δ-Folge und Deckel sind Einschätzung auf Basis des vorhandenen Spaltenalgorithmus.

### T2 Rollkante (rolled eave)

- **Beschreibung:** Reetdachkanten sind dick und nach unten gerollt [Q3][Q4]. Im Block: Die äußerste Traufspalte ist eine Kopfüber-Treppe, deren unteres Viertel außen hängt. Dahinter bleibt eine 1 hb hohe Fuge. So entsteht eine runde, dicke Lippe.
- **Blöcke/Zustände:** R=`<roof>_stairs[facing=<außen>,half=top]` (bei einer Nordtraufe `facing=north`), dahinter normale Dachtreppen. Als Δ gilt die Spalte c0 wie t=2 (Oberkante voll), danach Δ2 oder Δ4.
- **Skizze:** Schnitt wie T1, Nordtraufe.
  Legende: R=`spruce_stairs[facing=north,half=top]`, S=`spruce_stairs[facing=south,half=bottom]`, #=`spruce_planks`, W=Wand.
  ```
         c0 c1 c2
  y+2    .  .  S
  y+1    .  S  #
  y+0    R  .  W      ← R: oben voll, unten nur die äußere Hälfte (Lippe)
  ```
- **Einsatz:** Märchencottage und Hexenhaus (Thatch-Variante mit `spruce`/`dark_oak`), Lebkuchenhaus mit `smooth_quartz_stairs` als Zuckerguss (T14). Nur an Trauflinien. Am Ortgang reicht eine Kontrastkante.
- **Wirkung/Aufwand:** hoch / mittel (neues Stück `stairs_out_top` in `columnPieces`; die Ecken an Walm und Kehle braucht der Zustandsauflöser).
- **Quellen:** [Q3][Q4]; Blockumsetzung Einschätzung (Geometrie der Kopfüber-Treppe wie die Sims-Treppe in `windows.ts:65`).

### T3 Wellige Traufe (wavy thatch)

- **Beschreibung:** Real: „wooden shingles steamed into wave pattern imitating thatching“, „roofs that undulate“ [Q3][Q4]. Ein Builder-Guide nennt dafür „alternating stair and slab rows at slightly different depths“ [Q39]. Im Block wechselt die unterste Traufspalte entlang der Traufe zwischen unterer und oberer Stufe.
- **Regel:** Periode 5 (3 unten, 2 oben) oder 7 (4/3), Phase aus dem Seed. Nur Spalte c0. c1 bleibt, wie sie ist, denn sie schließt lückenlos an (c0 oben = t 2 hb, c1 beginnt ab tPrev=2). Nicht an Ecken: 2 Spalten vor jeder Ecke gilt der Normalzustand.
- **Skizze:** Ansicht Nord auf die Traufkante c0, x=0..10 (beide Stufen liegen in derselben Blockzeile).
  Legende: b=`<roof>_slab[type=bottom]`, t=`<roof>_slab[type=top]`.
  ```
  x:       0 1 2 3 4 5 6 7 8 9 10
  obere ½  . . . t t . . . t t .
  untere ½ b b b . . b b b . . b
  ```
- **Einsatz:** Cottage, Hexenhaus, Rustikal. Nicht zusammen mit der Rollkante auf derselben Traufe.
- **Wirkung/Aufwand:** mittel / niedrig (ein Versatz im Höhenfeld der Traufspalte).
- **Quellen:** [Q3][Q4][Q39]; Periode ist Einschätzung.

### T4 Krüppelwalm und Katzenbuckel (catslide)

- **Beschreibung:** Typische Storybook-Dachformen sind „jerkin-head roof“, „sloped-to-ground on one side roof“ und „cat slide“ mit „exaggerated curve“ [Q3]. Der Krüppelwalm ersetzt die Giebelspitze durch einen kleinen Walm [Q5]. Der Katzenbuckel führt eine Dachseite bis auf Erdgeschoss-Traufhöhe hinunter.
- **Regeln:**
  - Krüppelwalm: Walmanteil = oberstes Drittel des Anstiegs (gerundet), mindestens 2 Lagen. Gibt es in der Engine schon (`half_hip`), für Fantasy auf 0,35 hochsetzen.
  - Katzenbuckel: `saltbox`, dessen lange Seite über einem Anbau bis Traufe = Sockel + 3 läuft. Lange Seite Δ2 (45°), kurze Seite Δ4 (Storybook). Die lange Seite immer hinten oder seitlich, nie über der Eingangsseite.
- **Skizze (schematisch):** Schnitt quer, Nord links (Front, steil, Vollblock + Treppe je Lage), Süd rechts (Katzenbuckel 45° über dem Anbau).
  Legende: S=`<roof>_stairs[facing=south,half=bottom]`, Z=`<roof>_stairs[facing=north,half=bottom]`, #=Vollblock Dach, r=First-Stufe, W=Wand, A=Anbauwand.
  ```
          Nord ←                        → Süd
  y+10            r
  y+9           S # Z
  y+8           # . . Z
  y+7         S . . . . Z
  y+6         # . . . . . Z
  y+5       S W . . . . . . Z
  y+4       # W . . . . . . . Z
  y+3     S . W . . . . . . . . Z
  y+2     b . W . . . . . . . . A Z
  y+1     . . W . . . . . . . . A . Z  ← Traufe Süd auf EG-Höhe
  ```
- **Einsatz:** Hexenhaus (lopsided [Q2]), Cottage mit Anbau, Zwergenhaus. Größen medium bis huge.
- **Wirkung/Aufwand:** hoch / niedrig (Daten: Gewichte und Profil je Seite).
- **Quellen:** [Q2][Q3][Q5].

### T5 Schiefes Dach (zwei Profile je Seite)

- **Beschreibung:** „Pointy, lopsided roof“ beim Spadena House [Q2], „lopsided gable: one side built taller and steeper than the other“ [Q39]. Blockgerecht ohne Diagonalen: Beide Dachseiten bekommen unterschiedliche Δ-Folgen. Die Engine vereinigt die Höhenfelder je Spalte mit dem Maximum, und der First rutscht von selbst 1–2 Spalten aus der Mitte.
- **Regel:** Seite A Storybook (1,3,4,…), Seite B Glocke (1,1,2,2,4,…). Der First muss eine geschlossene Kante bilden: Wo beide Seiten gleich hoch sind, wird der First gesetzt. Die Differenz der Firstposition ist ≤ 2 Spalten. Nur bei Grundrissbreite ≥ 9.
- **Einsatz:** Hexenhaus 60 %, Cottage 20 %.
- **Wirkung/Aufwand:** mittel / mittel (Profil je Seite im `RoofSectionSpec`).
- **Quellen:** [Q2][Q39]; Umsetzung Einschätzung.

### T6 Firstspitzen (curved roof peaks)

- **Beschreibung:** Die Firstenden biegen nach oben [Q3]. Über die letzten 2 Firstspalten steigt der First um 1,5 Blöcke.
- **Skizze:** Ansicht Süd auf die Traufseite, Firstreihe in x-Richtung, rechtes Ende (Ostgiebel).
  Legende: r=`<roof>_slab[type=bottom]` (normaler First), t=`<roof>_slab[type=top]`, #=Vollblock, E=`<roof>_stairs[facing=east,half=bottom]` (hohe Seite außen = Spitze).
  ```
  x:     …  5  6  7  8(Giebel)
  y+1    .  .  .  .  E
  y+0    r  r  r  t  #
  ```
  Westende gespiegelt (`facing=west`).
- **Einsatz:** Cottage, Elfenhaus (fein), Lebkuchen (mit `smooth_quartz`). Nicht am Krüppelwalm.
- **Wirkung/Aufwand:** mittel / niedrig.
- **Quellen:** [Q3]; Umsetzung Einschätzung.

### T7 Hexenhut-Kegel mit Krempe, Hutband und Knick

- **Beschreibung:** Spitzkegel auf Rundtürmen („pepperpot turret“ [Q9]). Der Zaubererturm verlangt „a sharp pyramid, a dome, or a cluster of spires“ [Q29]. Für den Hexenhut gilt: breite Krempe aus Stufen, 1–2 Lagen senkrechtes Hutband, dann ein konkav schlanker Kegel (Radien schrumpfen oben langsamer, nach der Wiki-Idee „4, dann 6, 8, 10“ aus `daecher.md`) und eine leicht geknickte Spitze. Eine gewundene Naht, bei der die Starttreppe je Lage um 1 weiterrückt, empfiehlt CozyGameBuilds [Q33].
- **Lagenliste (Durchmesser, Versatz in Knickrichtung):**
  - Turm D5 (Krempe 9): `9, 7, 7, 5, 5, 5, 3@0, 3@0, 3@+1, 3@+1, 1@+2, 1@+2`, dann Spitze.
  - Turm D7 (Krempe 11): `11, 9, 9, 7, 7, 7, 5, 5, 5, 5, 3@0, 3@0, 3@+1, 3@+1, 3@+1, 1@+2, 1@+2, 1@+2`.
  - Regeln: Die äußerste Lage ist immer der Krempenring aus `slab[type=bottom]`, auch wenn darüber eine Lage folgt. Das weicht von `roundTower.ts:185` ab und muss geändert werden. Der Knick beginnt erst bei D ≤ 3. Jede versetzte Lage überlappt die darunter mit mindestens einer Fläche, also Versatz ≤ 1 je Lage. Spitze: `waxed_lightning_rod[facing=up]` (nur 1.21.11), sonst `end_rod[facing=up]` (Licht 14, Schneeabstand beachten).
- **Skizze:** Ansicht Süd, Turm D5, Knick nach Osten (+x). y relativ zur Wandkrone+1.
  Legende: b=`deepslate_tile_slab[type=bottom]` (Krempe), S=`deepslate_tile_stairs[half=bottom,facing=<zur Lagenmitte>]`, #=`deepslate_tiles`, i=`waxed_lightning_rod[facing=up]`.
  ```
  x:    -4 -3 -2 -1  0 +1 +2 +3 +4
  y+12   .  .  .  .  .  .  i  .  .
  y+11   .  .  .  .  .  .  #  .  .
  y+10   .  .  .  .  .  .  #  .  .
  y+9    .  .  .  .  S  S  #  .  .
  y+8    .  .  .  .  #  #  #  .  .     ← Knick: Lage D3 um +1
  y+7    .  .  .  S  #  #  .  .  .
  y+6    .  .  .  #  #  #  .  .  .
  y+5    .  .  S  #  #  #  S  .  .
  y+4    .  .  #  #  #  #  #  .  .
  y+3    .  .  #  #  #  #  #  .  .
  y+2    .  S  #  #  #  #  #  S  .
  y+1    .  #  #  #  #  #  #  #  .     ← Hutband (senkrecht)
  y+0    b  #  #  #  #  #  #  #  b     ← Krempe
  ```
- **Maße:** Kegelhöhe ≈ 1,4–1,7 × Krempendurchmesser. Spitze ≥ 3 Blöcke über dem Hauptfirst (Hierarchie, Einschätzung).
- **Material:** Dachrolle des Hauses oder Kontrast: `deepslate_tiles`, `dark_oak`, `waxed_oxidized_cut_copper`, `warped`. Bei Kupfer die gewachste Form, sonst ändert sich die Farbe in der Welt.
- **Einsatz:** Fantasy alle Türme; `medieval` ohne Knick.
- **Wirkung/Aufwand:** hoch / mittel (Lagenliste als Daten statt Exponent, Krempenregel, Versatz).
- **Quellen:** [Q9][Q29][Q33]; Lagenliste Einschätzung.

### T8 Erkertürmchen auf Konsolen (Bartizan)

- **Beschreibung:** Ein Türmchen an der Hausecke ab dem Obergeschoss, getragen von gestuften Konsolen [Q10]. Typisch Storybook („towers, turret[s], rounded walls“ [Q3]) und Disney.
- **Regeln:** Ring D5 (Kreisbibliothek). Mittelpunkt um (1,1) diagonal vor der Eckstütze, damit etwa ⅓ des Rings über der Hauswand steht und der Raum innen offen ist. Beginn auf der Höhe des ersten Obergeschoss-Bodens. Darunter zwei Konsolenringe aus Kopfüber-Treppen (D5, dann D3), ganz unten ein `stone_brick_wall`-Zapfen mit Hängelaterne. Dach nach T7.
- **Skizze:** Ansicht Nord auf die Hausecke.
  Legende: K=`stone_brick_stairs[half=top,facing=<zur Turmmitte>]` (unteres Viertel innen = Konsole), F=`stripped_dark_oak_log[axis=y]`, W=`calcite`, G=`glass_pane`, P=`stone_brick_wall`, L=`lantern[hanging=true]`, b/S wie T7.
  ```
  x:     -2 -1  0 +1 +2
  y+5     S  #  #  #  S     Hutband/Kegelansatz (T7)
  y+4     F  G  G  G  F
  y+3     F  W  W  W  F
  y+2     F  W  W  W  F
  y+1     K  K  K  K  K     Konsolenring 1 (D5)
  y+0     .  K  K  K  .     Konsolenring 2 (D3)
  y-1     .  .  P  .  .
  y-2     .  .  L  .  .
  ```
  Die Ecken der K-Ringe formt der Zustandsauflöser (`outer_*`). Das ist erwünscht und rundet die Konsole ab.
- **Einsatz:** Fantasy medium/large, alternativ zum Rundturm; Mittelalter (ohne Knick).
- **Wirkung/Aufwand:** hoch / mittel (neue Masse `oriel_turret` in `plan.ts` mit Bibliotheksring).
- **Quellen:** [Q3][Q10].

### T9 Vorkragender Giebel und einseitige Auskragung (Schiefe)

- **Beschreibung:** Die Front lehnt sich nach vorn. Das Obergeschoss kragt nur an der Front 1 aus, das Giebeldreieck noch einmal 1. Dazu Konsolen. Das ist kopflastig wie bei Tudor und Storybook [Q4]. Wände nie diagonal treppen.
- **Skizze:** Schnitt quer durch die Frontwand (Nord links), d relativ zur Erdgeschosswand.
  Legende: W=`calcite`, B=`stripped_dark_oak_log[axis=x]` (Geschossbalken), K=`spruce_stairs[facing=south,half=top]` (Konsole, unteres Viertel an der Wand), G=Giebelwand (`upperWall`), S=Ortgang-Treppen.
  ```
  d:     +2 +1  0
  y+9     S  .  .
  y+8     G  .  .     Giebel d=+2
  y+7     B  K  .     Balken + Konsole
  y+6     .  W  .     OG d=+1
  y+5     .  W  .
  y+4     .  B  K
  y+3     .  .  W     EG d=0
  y+2     .  .  W
  ```
- **Einsatz:** Cottage, Hexenhaus, Ghibli-Stadthaus; nur 1–2 Seiten. Die bestehende Jetty-Logik (`plan.ts:211`, Nord und Süd) erweitern um „nur Front“ und „Giebel +1“.
- **Wirkung/Aufwand:** mittel / mittel.
- **Quellen:** [Q4]; Umsetzung Einschätzung.

### T10 Fledermausgaube (eyebrow dormer)

- **Beschreibung:** Gaube mit bogenförmiger Stirn, die weich in die Dachfläche übergeht. Ideal ist Höhe : halbe Breite = 1 : 3 [Q7]. Storybook: „nested dormers“ [Q3]. Im Block: ein Buckel im Dach-Höhenfeld über 7 Spalten. Die Flanken heben die Fläche um +1 hb, die Mitte (3 Spalten) um +2 hb. In der dadurch entstehenden senkrechten Stirn (1 Block hoch, 3 breit) sitzt `glass_pane`.
- **Skizze (schematisch):** Ansicht Nord auf die Dachfläche, y relativ zur Traufe.
  Legende: S=Dachtreppe, s=`<roof>_slab[type=bottom]` (+1 hb), t=`<roof>_slab[type=top]` (+2 hb), G=`glass_pane`, b=Traufstufe.
  ```
  x:     0  1  2  3  4  5  6  7  8
  y+3    S  S  S  S  S  S  S  S  S
  y+2    S  S  s  t  t  t  s  S  S
  y+1    S  S  S  G  G  G  S  S  S
  y+0    b  b  b  b  b  b  b  b  b
  ```
- **Einsatz:** Ersetzt in Fantasy 60 % der Kastengauben (W10). Nur auf Dachflächen mit Profil Storybook oder Glocke. Mindestens 2 Spalten Abstand zu Kehle und Grat.
- **Wirkung/Aufwand:** mittel / hoch (neuer Abschnittstyp `eyebrow` und Fensterlogik; ungetestet).
- **Quellen:** [Q3][Q7].

### T11 Schiefer Kamin mit Krone und Aufsatz

- **Beschreibung:** „Crooked chimneys“ [Q4], „exposed chimney on side of house“, „round stones“, „chimney pots“, „ivy covered“ [Q3]. Dazu „a chimney that leans slightly“ [Q39].
- **Regeln:** Zug 1×1 (klein/mittel) oder 2×1 (groß), außen am Giebel. Genau ein Versatz um 1 Block auf 60–70 % der Höhe über dem Dachdurchstoß. Am Versatz liegt eine Lage 2 breit (alte und neue Position), damit der Zug flächig verbunden bleibt. Oben eine Krone aus Kopfüber-Treppen auf 2–3 Seiten. Auf dem Kopf `campfire[lit=true,signal_fire=false]` und bei 2×1 daneben `flower_pot` als Kaminaufsatz (Einschätzung; Töpfe brauchen in Java keinen Halt [Q24]). Oberkante ≥ First + 1 bei firstnahen Kaminen, sonst Dachfläche + 2. Material über Verwitterung gemischt (`cobblestone` → `mossy_cobblestone`, gelegentlich `bricks`).
- **Skizze:** Ansicht von der Giebelseite (Ost), x entlang der Wand.
  Legende: C=`cobblestone`/`mossy_cobblestone`, k=`campfire[lit=true,signal_fire=false,facing=north]`, p=`flower_pot`, s=`cobblestone_stairs[half=top,facing=<zum Zug>]` (Krone), v=`vine[west=true]`.
  ```
  x:      0  1  2
  y+13    .  k  p
  y+12    s  C  C
  y+11    .  C  .
  y+10    .  C  .
  y+9     C  C  .     ← Versatz-Lage 2 breit
  y+8     C  v  .
  y+7     C  .  .     ← Dachdurchstoß
  y+1..6  C  C  .     Fuß 2 breit bis OG (wie heute)
  ```
- **Einsatz:** Fantasy alle Größen (Wahrscheinlichkeit 0,8); Rustikal ohne Versatz.
- **Wirkung/Aufwand:** mittel / niedrig (`components.ts`).
- **Quellen:** [Q3][Q4][Q24][Q39].

### T12 Bewuchs-Schicht (Ranken, Moos, Flechte)

- **Beschreibung:** „Ivy and other climbing plants growing on exterior walls“ [Q3], „an intentionally overgrown English-style garden“ [Q2]. Overgrown-Dächer aus `mossy_cobblestone_stairs` und `cobblestone_stairs` gemischt, Firstkappe aus `moss_carpet`, „drape vines down the gutter line“ [Q33].
- **Regeln:**
  - `vine` nur in Luftzellen vor einer vollen Fläche (Planks, Stamm, Putz, Stein, Glasblock), Zustand zur Wand hin (`south=true`, wenn die Wand südlich der Ranke liegt). Nie unter Treppen: „Vines attached to the bottom of stairs are completely deleted by any block update“ [Q19]. Hängende Ranken unter Ranken mit gleicher Fläche sind ok. Länge 1–4, von oben (unter einem Vollblock-Gesims oder einer Wandkrone) nach unten. Höchstens 15 % der Fassadenspalten, bevorzugt an Ecken, am Kamin und unter Fenstern.
  - `moss_carpet` nur auf vollen Oberseiten (Vollblock, `slab[type=top]`, Kopfüber-Treppe). Auf Treppen schwebt der Teppich sichtbar über der Stufe (Einschätzung aus der Blockgeometrie). Einsatz: Firstblöcke, Kaminkrone, Sockelkante, Mauerkronen.
  - `glow_lichen` (nicht in Registry) als 1–3 Flächen am Sockel und unter Traufen, Licht 7 [Q20]. Schmilzt damit keinen Schnee (Grenze > 11), gut für Winter. Zustand z. B. `glow_lichen[north=true,…alle anderen false,waterlogged=false]`.
  - `hanging_roots` (nicht in Registry) nur an der Unterseite von Blöcken [Q22], z. B. unter Erkerkonsolen. `spore_blossom` (nicht in Registry) nur an der Unterseite, nicht an Laub [Q21]; ein Exemplar unter Vordächern ist ein „magisches“ Detail.
  - `pale_hanging_moss[tip=true]` nur für 1.21.11 und nur unter Blasseiche oder Laub [Q23]. Sonst weglassen.
  - Dichte nach Detailgrad: 1 → nur Sockelmoos; 2 → Moos + 2–4 Rankenbahnen; 3 → zusätzlich Flechte und Dachmoos.
- **Skizze:** Ansicht Nord, Zellen in d=+1 vor einer Putzwand (d=0, `calcite`) zwischen zwei Pfosten.
  Legende: F=Pfosten `dark_oak_log[axis=y]` (d=+1), v=`vine[south=true]`, l=`glow_lichen[south=true]`, G=Fenster (d=0), m=`moss_carpet` auf `mossy_cobblestone`-Sockel (Vollblock).
  ```
  x:     0  1  2  3  4  5
  y+5    F  v  v  .  .  F     ← unter der Wandkrone/Vollblock-Balken
  y+4    F  v  v  .  .  F
  y+3    F  .  v  G  G  F
  y+2    F  .  .  G  G  F
  y+1    F  l  .  .  .  F
  y+0    m  m  .  .  m  m     Sockel
  ```
- **Einsatz:** Fantasy (alle Unterarten außer Lebkuchen), Mittelalter-Ruine, Rustikal sparsam. Nie bei `modern`/`japanese`.
- **Wirkung/Aufwand:** hoch / mittel (neuer Schritt nach den Öffnungen, Validator-Regeln für Ranke, Flechte und Wurzel).
- **Quellen:** [Q2][Q3][Q19][Q20][Q21][Q22][Q23][Q33].

### T13 Pilzhut-Kappe (Pilzhaus)

- **Beschreibung:** Vanilla-Vorbild: roter Riesenpilz mit gewölbter Kappe aus fünf 3×3-Platten, brauner Riesenpilz mit flacher 7×7-Kappe ohne Ecken. Stiel 5–7 hoch, selten bis 13 [Q17]. Für Häuser kuppelt man rote Kappen; braune breiten sich flach und niedrig aus. Jede Kappenstufe 1–2 breiter als die darüber, damit die Überstände als Etagen lesbar sind [Q34].
- **Zustände:** Alle drei Pilzblöcke haben `up/down/north/south/east/west`, Standard `true`; `false` zeigt Poren. Berührt ein Pilzblock einen gleichartigen, zeigt die berührende Seite Poren [Q16]. Der Zustandsauflöser muss diese Flächen auf `false` setzen, sonst weichen Vorschau und WorldEdit-Import ab. Eine bewusst gesetzte `down=false`-Unterseite bleibt stabil (Einschätzung nach dem Java-Verhalten „nur zu false“). Die weißen Punkte der Kappe sind schon in der Textur von `red_mushroom_block` (Einschätzung), also keine eigenen Punkt-Blöcke setzen.
- **Lagenliste (Stiel D5):** Kappe `11 (nur Rand 3 breit, down=false), 11, 9, 7, 5 (gefüllt)`. Stiel `mushroom_stem` als Ring D5, Höhe 5–6, Fenster als `glass_pane` im Stiel mit Falltür-Läden [Q34].
- **Skizze:** Schnitt durch die Mitte (x), y relativ zur Kappenunterkante.
  Legende: R=`red_mushroom_block` (Außenflächen true), P=`red_mushroom_block[down=false]` (Poren unten), M=`mushroom_stem`, D=Tür (`oak_door`, siehe T11-Tür), .=Luft/Innenraum.
  ```
  x:    -5 -4 -3 -2 -1  0 +1 +2 +3 +4 +5
  y+4    .  .  .  R  R  R  R  R  .  .  .
  y+3    .  .  R  .  .  .  .  .  R  .  .
  y+2    .  R  .  .  .  .  .  .  .  R  .
  y+1    R  .  .  .  .  .  .  .  .  .  R
  y+0    P  P  P  M  .  .  .  M  P  P  P
  y-1    .  .  .  M  .  .  .  M  .  .  .
  y-5    .  .  .  M  .  D  .  M  .  .  .
  ```
- **Einsatz:** Neue Form „Pilzhaus“ (Stichwort „Pilzhaus“, „Pilz“), Größen small und medium. Gartenpilze als Skulptur (Stiel 3–5, Kappe 5) für alle Fantasy-Häuser mit Garten.
- **Wirkung/Aufwand:** hoch / mittel (Registry, Zustandsauflöser, Formbauer aus `revolve`).
- **Quellen:** [Q16][Q17][Q34].

### T14 Zuckerguss-Kanten (Lebkuchenhaus)

- **Beschreibung:** Lebkuchenhäuser haben Dach und Giebel mit Zuckerguss als „Schnee“, Gummibonbons, Zuckerstangen und Fenster aus geschmolzenem Zucker [Q12]. Das Knusperhäuschen geht auf Hänsel und Gretel zurück [Q12][Q13].
- **Regeln (Einschätzung, Umsetzung aus [Q12]):**
  - Rollkante (T2) aus `smooth_quartz_stairs[half=top,facing=<außen>]` als weißer Tropfrand; Ortgang `smooth_quartz_stairs`; First `smooth_quartz_slab[type=bottom]`.
  - Rahmenrolle `smooth_quartz` (weiße Gusslinien vor `terracotta`), Fenster `orange_stained_glass_pane`/`yellow_stained_glass_pane`.
  - „Zuckerstangen“ an den Ecken: Eckpfosten in d=+1 im Wechsel `red_wool` / `white_wool`, Periode 1 (neue Rahmen-Musterregel).
  - „Gummibonbons“: auf dem First alle 2 Blöcke ein Vollblock `lime_stained_glass`, `red_stained_glass` oder `orange_stained_glass` (kein Halt nötig).
  - Fensterbänke: je 1 Kerze bunt (`red_candle`, `lime_candle`, `white_candle`, `lit=true`, Licht 3 [Q25]), nur auf voller Oberseite (Sims-Treppe).
  - Keine Eiszapfen (Projektregel). Schnee nur auf ausdrücklichen Wunsch.
- **Skizze:** Schnitt Nordtraufe.
  Legende: Q=`smooth_quartz_stairs[facing=north,half=top]`, S=`dark_oak_stairs[facing=south,half=bottom]`, #=`dark_oak_planks`, T=`terracotta` (Wand), F=`smooth_quartz` (Rahmen d=+1), c=`red_candle[candles=1,lit=true]` auf Sims q=`smooth_quartz_stairs[facing=south,half=top]`.
  ```
  d:     +2 +1  0
  y+2     .  S  #
  y+1     Q  F  T
  y+0     .  F  T
  y-1     .  c  O      O = orange_stained_glass_pane (Fenster d=0)
  y-2     .  q  T
  ```
- **Einsatz:** Palette E bei Thema `christmas` oder Stichwort „Lebkuchen“ (der Parser erkennt es schon, `parseDescription.ts:1385`).
- **Wirkung/Aufwand:** hoch / mittel.
- **Quellen:** [Q12][Q13][Q25].

---

## (a) Kennzeichen des Stils

- **Verspieltheit vor Regel:** „a sense of playfulness and whimsy“; „intentionally uneven roofs, many cobblestone, doors and windows which may look mismatched and odd-shaped“; steile Dächer mit unregelmäßigen Schindeln wie Stroh, „multiple gables, turrets and dovecotes“ [Q1].
- **Merkmalliste der Storybook-Häuser:** steile, bis zum Boden gezogene, Krüppelwalm- und Katzenbuckeldächer; Rollkanten; gewellte Schindeln; gebogene Firstspitzen; kleine gotische, gebleite, runde Fenster; verschachtelte Gauben; Holzläden; schwere, oft gerundete Holztüren in einer gerahmten Eingangsform; dicker weißer Putz, Fachwerk, Zierziegel, Flusssteine; Türme, gerundete Wände, „cartoony shapes“; Kamine aus Rundsteinen mit Aufsatz und Efeu; üppige Blumen [Q3]. Krumme Kamine, schiefe Wände, „rolled eaves and jerkinhead gables“, Rautenscheiben [Q4].
- **Hexenhaus:** spitzes, schiefes Dach, winzige Fenster, rustikaler Putz, verwilderter Garten, Teich [Q2]. In Vanilla steht die Sumpfhütte aus `spruce_planks` auf Stelzen aus `oak_log`, mit einem Dach aus `spruce_stairs` und `spruce_planks`; innen ein Topf mit rotem Pilz [Q15].
- **Ghibli:** Für „Das wandelnde Schloss“ studierte Miyazaki Colmar und Riquewihr im Elsass [Q14]. Daraus folgen bunte Putzfassaden mit Fachwerk und Erkern (Einschätzung).
- **Disney/Elfen:** hell, schlank, Türmchen mit Spitzhut, farbige Dächer (Einschätzung). Elfen-Baumhäuser: „lighter woods like birch feel more delicate“ [Q31].
- **Generator-Merksatz (Einschätzung):** großes Dach, kleine Wand, eine große Tür, ein Turm, ein krummer Kamin, viel Grün und warmes Licht.

## (b) Untervarianten mit Erkennungsmerkmalen

| Unterart | Erkennung (Silhouette / Material) | Paletten | Pflicht-Details | Größen |
|---|---|---|---|---|
| Märchencottage (Disney „Schneewittchen“) | Dach ≥ 1,5 × Wand, Rollkante, Krüppelwalm, Giebel vorn; Weißputz, sparsames dunkles Holz | A, C | Kamin T11, Blumenkästen W05, Rundbogentür | S, M |
| Hexenhaus | schmal, hoch, schief (T5), Katzenbuckel; dunkles Holz, Moos, wenig Glas; optional Stelzen aus `oak_log` [Q15] | B | Hexenhut T7, Kamin mit Versatz, Pilze im Topf, `cauldron` (nicht in Registry), Seelenlaterne erlaubt | S, M |
| Elfenhaus | schlank, Bögen, Türmchen, kein schwerer Kamin; Calcit, Birke, Türkis-/Patinadach | D | Spitzbogen W07, Ranken, Laub am Dach | M, L |
| Zwergenhaus (Einschätzung) | gedrungen, Wand 3 hoch, breites tiefes Dach, Rundtür im Hang; Tuff, Tiefenschiefer, Kupferakzent | B-Variante: `tuff_bricks`/`deepslate_tiles` | Schmiedekamin 2×2, Laternen an Ketten | S, M |
| Pilzhaus | Stiel und Kappe statt Wand und Dach | F | T13, Rundtür, Fenster im Stiel | S, M |
| Hobbit-/Hügelhaus | im Hang, runde Türen und Fenster [Q11], Moosdach | A/D mit Erdhügel | T11 Rundtür in `warped_door`, W20 | S |
| Ghibli-Stadthaus | 2–3 Geschosse, Auskragung, Erker, bunter Putz (`yellow_terracotta`, nicht im Materialkatalog), rote Dächer | A-Variante mit `bricks`/`mangrove` | T9, T8, Blumen | M, L |
| Zaubererturm | Rundturm mit Hexenhut, Balkon unter dem Kegel; Purpur, Kupfer, Schwarzstein [Q29] | C/B | T7, Aussichtsplattform [Q29] | Turm |
| Lebkuchenhaus | wie Cottage, aber braun-weiß mit bunten Punkten | E | T14 | S, M |

Hinweis: Der Wizard-Tower-Guide [Q29] nennt auch „Poplar wood“. Das gibt es in 1.21.11 nicht (siehe Fehler).

## (c) Paletten nach Rollen (mit Gewichten)

Gewicht = Auswahlwahrscheinlichkeit; je Gebäude wird pro Rolle ein Material gewählt. Die L\*-Werte stammen aus `textureStats.ts`. Die Paletten A–E habe ich gegen die Lints nachgerechnet: ΔL Wand↔Rahmen ≥ 15, Dach ≠ Wand, Dach mit Treppe, 3–5 Hauptfamilien in jeder Ein-Tausch-Variante, alle Blöcke in 1.21.1 und 1.21.11. F braucht Registry-Erweiterungen und einen Formbauer.

**Tabelle 1: A Märchencottage · B Hexenhaus · C Kupferhut (Disney)**

| Rolle | A `fantasy_storybook` | B `fantasy_witch` | C `fantasy_copper` |
|---|---|---|---|
| plinth | cobblestone 3, mossy_cobblestone 2, cobbled_deepslate 1 | mossy_cobblestone 2, cobbled_deepslate 2 | stone_bricks 2, mossy_stone_bricks 1 |
| wall | calcite 3, white_terracotta 1 | spruce_planks 2, packed_mud 1 | calcite |
| upperWall | calcite | spruce_planks | calcite |
| infill | calcite | packed_mud | calcite |
| frame | dark_oak_log 2, stripped_dark_oak_log 1 | dark_oak_log | dark_oak_log 1, spruce_log 1 |
| beam | stripped_dark_oak_log | dark_oak_log | stripped_dark_oak_log |
| roof | dark_oak_planks 3, deepslate_tiles 2, spruce_planks 1 | deepslate_tiles 2, dark_oak_planks 1, crimson_planks 1 | waxed_weathered_cut_copper 2, waxed_oxidized_cut_copper 2, warped_planks 1 |
| roofTrim | spruce_planks 2, dark_oak_planks 1 | mossy_cobblestone 1, dark_oak_planks 1 | dark_oak_planks |
| ridge | dark_oak_planks | dark_oak_planks | dark_oak_planks 2, waxed_cut_copper 1 |
| soffit | spruce_planks | dark_oak_planks | dark_oak_planks |
| window | glass | glass 3, purple_stained_glass 1 | glass |
| shutter | spruce_planks 2, dark_oak_planks 1 | dark_oak_planks 2, crimson_planks 1 | warped_planks 1, spruce_planks 1 |
| door | spruce_planks 2, dark_oak_planks 1 | dark_oak_planks 2, crimson_planks 1 | dark_oak_planks |
| floor | spruce_planks | spruce_planks | spruce_planks |
| path | cobblestone | cobbled_deepslate | stone_bricks |
| chimney | cobblestone 2, bricks 1 | mossy_cobblestone 1, cobbled_deepslate 1 | bricks 2, stone_bricks 1 |
| accent | moss_block | moss_block | moss_block |
| Laterne | lantern | soul_lantern | lantern |
| ΔL Wand↔Rahmen | 89,1↔20,2 = 69 | 38,3↔20,2 = 18 | 89,1↔20,2 = 69 |
| Familien (erste Wahl) | cobblestone, calcite, dark_oak, spruce (4) | cobblestone, spruce, packed_mud, dark_oak, deepslate (5) | stone, calcite, dark_oak, Kupfer (4) |

**Tabelle 2: D Elfenhaus · E Lebkuchenhaus · F Pilzhaus**

| Rolle | D `fantasy_elven` | E `fantasy_gingerbread` | F `fantasy_mushroom` (Ziel) |
|---|---|---|---|
| plinth | mossy_stone_bricks 2, stone_bricks 1 | bricks 1, smooth_quartz 1 | mossy_cobblestone 2, cobblestone 1 |
| wall | calcite | terracotta 2, packed_mud 1 | mushroom_stem (nicht in Registry, L\* ≈ 79,6) |
| upperWall | calcite | terracotta | mushroom_stem |
| infill | calcite | terracotta | mushroom_stem |
| frame | stripped_birch_log | smooth_quartz | stripped_oak_log 1, dark_oak_log 1 |
| beam | stripped_birch_log | smooth_quartz | stripped_oak_log |
| roof | waxed_oxidized_cut_copper 3, dark_prismarine 1 | dark_oak_planks 2, mud_bricks 1 | red_mushroom_block 3, brown_mushroom_block 1 (nicht in Registry; keine Treppen → Kappenbauer T13) |
| roofTrim | birch_planks | smooth_quartz | mangrove_planks (Vordächer) |
| ridge | dark_prismarine | smooth_quartz | red_mushroom_block |
| soffit | birch_planks | smooth_quartz | oak_planks |
| window | glass 3, lime_stained_glass 1 | orange_stained_glass 1, yellow_stained_glass 1 | glass |
| shutter | birch_planks | cherry_planks 1, mangrove_planks 1 | birch_planks |
| door | birch_planks | mangrove_planks | oak_planks 1, warped_planks 1 |
| floor | birch_planks | spruce_planks | oak_planks |
| path | mossy_stone_bricks | smooth_quartz | mossy_cobblestone |
| chimney | stone_bricks | bricks | cobblestone |
| accent | moss_block | red_wool | moss_block |
| Laterne | lantern | lantern | lantern |
| ΔL Wand↔Rahmen | 89,1↔72,4 = 16,7 (knapp; Dach 89,1↔58,1 = 31) | 45,8↔91,8 = 46 | 79,6↔61,7 = 18 |
| Familien | stone, calcite, birch, Kupfer, dark_prismarine (5) | bricks, terracotta, quartz, dark_oak (4) | erst nach Erweiterung prüfbar |

Hinweise:

- D löst die Lint-Warnung „helle Wand mit hellem Dach“ aus (Kupfer L\* 58). Laut Lint-Text braucht das eine dunkle Dachkante. Bei D ist die Kante bewusst hell (`birch`); der First (`dark_prismarine`) sorgt für den Kontrast. Prismarin ist animiert, deshalb ist `dark_prismarine` nur das Nebendach.
- `upperWall` und `infill` werden heute unabhängig von `wall` gezogen. Bei A muss die Regel „upperWall folgt wall, wenn beide Putz sind“ gelten, sonst entstehen calcite-unten- und white_terracotta-oben-Mischungen ohne Absicht.
- Die alten Paletten `fantasy_crimson` und `fantasy_warped` gehen in B (Karmesin als Nebendach, Tür und Laden) und C (Wirrholz als Nebendach und Laden) auf. Die alte Notiz `paletten.md` schlug `mushroom_stem` als 40-%-Wandmischung vor. Das widerspricht unserem Grundsatz „ein Material je Rolle“ und gehört höchstens als Verwitterungsvariante zu `calcite`.
- Nicht verwenden, solange die Lints beide Versionen verlangen: `pale_oak_*`, `resin_bricks` (nur 1.21.4+), `copper_lantern` (1.21.9+).

## (d) Proportionen je Größe, Übertreibung und Schiefe

**Tabelle Proportionen (Ziel; Einschätzung, abgeleitet aus [Q3][Q6][Q36]):**

| Größe | B × T (ungerade, T > B) | Geschosse | Geschosshöhe (inkl. Boden) | Sockel | Traufe über Gelände | Dachanstieg (Deckel) | Überstand Traufe / Ortgang | Dach : Wand | Extras |
|---|---|---|---|---|---|---|---|---|---|
| small | 7 × 9 | 1 + Dachgeschoss | 4 | 1 | 5 (Rollkante hängt bis 3) | 7–9 (9) | 2 / 1 | ≥ 1,5 | Kamin; 1 Signatur |
| medium | 9 × 11 | 2, OG kragt vorn aus | 4 | 1 | 9 | 9–10 (10) | 2 / 1 | ≥ 1,0 | Erkertürmchen D5 (50 %) |
| large | 11 × 13 | 2 | 4–5 | 1–2 | 9–11 | 10–12 (12) | 2 / 1 | ≥ 1,0 | Rundturm D5–7 (80 %), Zwerchgiebel |
| huge | 13 × 15 + L-Flügel | 2–3 | 4–5 | 2 | 9–16 | 12 (12) | 2 / 1 | ≥ 0,8 | Turm D7 (90 %), Anbau mit Katzenbuckel |

- „Two storeys plus a steep attic gable make it read as far bigger than its footprint“ [Q36]. Storybook-Häuser bleiben deshalb eher klein und gewinnen Wirkung über die Höhe. `huge` für Fantasy sollte als Ensemble (Haupthaus + Flügel + Turm) entstehen, nicht als ein großer Kasten (Einschätzung).
- Dachneigung: Hauptdach Storybook (T1). Flügel und Zwerchgiebel 1 Block niedriger als der Hauptfirst und mit anderem Profil (Glocke). Turm ≥ Hauptfirst + 3.
- Fenster: 1×2 Standard, je Fassade genau ein Hauptfenster 2×2 oder 3×2 („one deliberately oversized window“ [Q39]); Fensterhöhen je Fenster ±1 (seedbasiert, nur wo die Geschosshöhe es zulässt).
- Tür: 1 breit; bei large ein 2-breites Portal (T01b oder T04). Die Tür liegt unter dem Frontgiebel oder an einem Winkel zwischen zwei Baukörpern („set into angled entrance“ [Q3]).

**Schiefe blockgerecht (Regeln):**

1. Je Haus 2–3 Unregelmäßigkeiten aus dieser Liste, seedbasiert, nie alle: T5 schiefes Dach · T9 einseitige Auskragung · T11 Kamin-Versatz · T7 Turmknick · T3 wellige Traufe · T6 Firstspitzen · Fensterhöhen ±1.
2. Versätze nur in ganzen Blöcken je Geschoss (Wand) oder in halben Blöcken im Dach. Nie eine Wand als Diagonaltreppe „kippen“, denn das liest sich als Baufehler (Einschätzung).
3. Höchstens ein Versatz je 3 Blöcke Höhe (Kamin, Turmspitze).
4. Symmetrie bewusst brechen: Tür aus der Mitte (vorhanden), Laden nur auf einer Seite (W04c), Turm an einer Ecke, Gaube nur auf einer Dachseite. „Asymmetrical windows feel more organic and cottage-like“ [Q30].
5. Die Übertreibung sitzt in wenigen großen Gesten (Dach, Turm, Kamin, Tür), nicht in vielen kleinen.

## (e) Bevorzugte Dachformen und Profile

**Dachtypen (neue Gewichte für `styles.ts:98`):** `gable` 0,40 · `half_hip` 0,35 · `saltbox` 0,15 (als Katzenbuckel, wenn ein Anbau da ist; sonst `gable`) · `hip` 0,10 (nur bei B ≠ T). `gambrel` entfällt. `roofTypeFor` (`plan.ts:186–191`) wandelt Satteldächer über 13 Tiefe in Walmdächer um. Bei Fantasy stattdessen auf `half_hip` ausweichen, das hält den Giebelcharakter.

**Profile (neue Gewichte für `styles.ts:99`):** `storybook` 0,50 (neu) · `bell` 0,30 · `steep` 0,10 · `flared` 0,10.

**Δ-Profile (hb, Traufe → First, normalisiert):**

| Profil | n=4 | n=5 | n=6 | n=8 | Anstieg n=5/6/8 | Wirkung |
|---|---|---|---|---|---|---|
| Storybook (neu) | 1,3,4,4 | 1,3,4,4,4 | 1,3,4,4,4,4 | 1,1,2,4,4,4,4,4 | 8 / 10 / 12 | Glockenfuß, dann 63° |
| Storybook mit Rollkante (R zählt als t=2) | R,2,4,4 | R,2,4,4,4 | R,2,4,4,4,4 | R,1,1,4,4,4,4,4 | 8 / 10 / 12 | dicke runde Kante |
| Glocke (vorhanden, ohne Deckel 7) | 1,3,2,4 | 1,3,2,4,4 | 1,1,2,2,4,4 | 1,1,2,2,2,2,4,4 | 7 / 7 / 9 | weich konkav |
| Katzenbuckel lange Seite | 2,2,2,2 | 2,2,2,2,2 | … | … | Länge nach Anbau | asymmetrisch |
| Fledermausgaube (quer zur Traufe) | – | 0,1,2,2,2,1,0 über 7 Spalten | – | – | +1 Block | Welle im Dach |

**Deckel-Regel (Änderung `profiles.ts`/`roofEngine.ts`):** `maxRise` je Stil und Größe (Fantasy 9/10/12/12). Wird der Deckel überschritten, verkürzt man bei konkaven und steilen Profilen zuerst die Traufseite: Eine 4 im unteren Drittel wird zur 2, und die oberen zwei Spalten bleiben 4. Reicht das nicht, wird der Dachtyp `half_hip`, statt den First flach zu machen. So entsteht nie wieder ein oben flaches Profil wie `[4,4,1,1,1,1,1,1]`.

**Hexenhut-Türme:** Lagenlisten aus T7. Nur Daten, kein Exponent. Kegel immer mit Krempe (Stufenring) und Hutband.

## (f) Fenster- und Türtypen

| Typ | Vorlage | Status | Einsatz in Fantasy | Gewicht (Vorschlag) |
|---|---|---|---|---|
| Spitzbogen 2×3 | W07 | vorhanden | Elfen, Hexe, Turm | 0,25 |
| Rundbogen 3×4 | W07b | vorhanden | large, Giebel | (Variante von W07) |
| Rundfenster 3×3 | W08 | vorhanden | nur Giebel und Turm | 0,10 |
| Blumenkasten / Töpfe | W05/W05b/W05c | vorhanden | Cottage, Lebkuchen | 0,25 |
| **Vierpass-Rundfenster 2×2** | W20 (neu) | Vorschlag | Cottage, Hobbit, Pilzstiel | 0,20 |
| **Kreuzstock/Butzen 3×3** | W19 (neu) | Vorschlag | Hauptfenster je Fassade | 0,15 |
| **Ovalfenster 2×3** | W22 (neu) | Vorschlag | Elfen, Turm | (Variante von W20) |
| **Ein Laden** | W04c (neu) | Vorschlag | Hexe, Cottage | 0,10 |
| Bleiglas 3×5 | W13 | vorhanden | nur Turm/huge, nicht am Cottage | 0 im Haus |

Die Stil-Lint erlaubt 1–4 Fenstervorlagen je Stil (`lints.ts`). Vorschlag für die Liste: `['W20', 'W07', 'W05', 'W19']`. W08 setzt die Giebel-/Turmlogik, nicht die Fassadenliste.

**W20 Vierpass-Rundfenster 2×2:** Vier Treppen in d=+1 vor 2×2 Glas lassen in der Mitte je ein Viertel offen, zusammen eine runde Öffnung von 1 Block.
Ansicht Süd, d=+1 (vor `glass_pane` 2×2 in d=0). Legende: a=`<frame>_stairs[facing=west,half=top]`, c=`<frame>_stairs[facing=east,half=top]`, e=`<frame>_stairs[facing=west,half=bottom]`, f=`<frame>_stairs[facing=east,half=bottom]`, B=`<frame>` Stamm `axis=x` (Sturz/Bank), P=Stamm `axis=y`.
```
x:    -1  0  1  2
y2     .  B  B  .
y1     P  a  c  P
y0     P  e  f  P
y-1    .  B  B  .
```
Die Treppen mit `facing` west und ost bilden keine Eckformen (parallele Achsen, verschiedene `half`). Das Prinzip ist W08 in klein. Aufwand niedrig.

**W19 Kreuzstock-/Butzenfenster 3×3:** `glass_pane` in den Ecken, `iron_bars` als Mittelkreuz in d=0 (Scheiben und Gitter verbinden sich, wie in W13), Sims-Treppe darunter, `<shutter>`-Läden. Butzenscheiben waren runde, grünliche Scheiben von 7–15 cm in Bleifassung [Q8]. Rautenglas gibt es im Block nicht; das Gitterkreuz ist die beste Annäherung (Einschätzung). Nicht `spruce_fence` als Sprosse nehmen, denn Scheiben verbinden sich nicht mit Zäunen.

**W22 Ovalfenster 2×3:** wie W20, mittlere Zeile ohne Treppen (nur Pfosten). Oben `a c`, Mitte frei vor Glas, unten `e f`.

**W04c Ein Laden:** W04 mit nur `shutter(-1, …)` oder `shutter(w, …)`, Seite seedbasiert.

**Türen:**

| Typ | Vorlage | Status | Einsatz | Gewicht |
|---|---|---|---|---|
| **Rundtür (Hobbit)** | T11 (neu) | Vorschlag | Cottage, Hobbit, Pilz, Zwerg | 0,35 |
| Rundbogen-Nische | T04 | vorhanden | Elfen, large | 0,25 |
| Oberlicht + Wandlaternen | T02 | vorhanden | Hexe, Cottage | 0,20 |
| **Türgiebelchen** (Vordach mit Glockenprofil) | T12 (neu) | Vorschlag | Cottage, Lebkuchen | 0,20 |

**T11 Rundtür:** Hobbit-Architektur „favours round doors and windows“ [Q11]. Die Tür bleibt 1×2. Die Rundung entsteht durch Türblatt-farbige Planken daneben (d=0) und einen achteckigen Ring in d=+1. Grün mit `warped_door` (Türkis) oder rot mit `mangrove_door`.
Ansicht Süd (kanonisch). Legende: D=`warped_door[facing=south,half=lower/upper,hinge=right]`, w=`warped_planks` (d=0), g=`glass_pane` (d=0, Oberlicht), Ring in d=+1: o=`spruce_stairs`, oben `half=top`, unten `half=bottom`, links `facing=west`, rechts `facing=east` (so zeigt das offene Viertel zur Türmitte, wie in W20), O=`stripped_spruce_log[axis=x]`, |=`stripped_spruce_log[axis=y]`, s=`<plinth>_stairs[facing=north,half=bottom]` (Stufe d=+1), Luft vor D in d=+1.
```
x:    -2 -1  0  1  2
y3     .  o  O  o  .      d=+1
y2     o  w  g  w  o      Ring d=+1 außen, Mitte d=0
y1     |  w  D  w  |
y0     o  w  D  w  o      untere Ecken half=bottom
y-1    .  s  s  s  .
```
Die Ecken `o` bei x=±2 stehen in d=+1, vor der Wand und nicht vor der Tür. Die Zelle (0, 0..1, +1) bleibt frei, wie es `doorway()` verlangt.

**T12 Türgiebelchen:** T01-Vordach ersetzen durch einen kleinen Sattel über d=+1..+2 mit Δ 1,3 (Mini-Storybook-Profil), zwei Konsolen (Kopfüber-Treppen) und `lantern[hanging=true]` unter dem First. Ein „covered entryway with elaborate entry shape“ [Q3].

## (g) Signatur-Details (Auswahl 5–8 je Haus nach Größe)

| # | Detail | Technik | Größe | Wahrscheinlichkeit (Detailgrad 2) |
|---|---|---|---|---|
| 1 | Hexenhut-Türmchen oder -Erker | T7 + T8 | M+ | M 0,5, L 0,8, H 0,9 |
| 2 | Schiefer Kamin mit Krone und Aufsatz | T11 | alle | 0,8 |
| 3 | Rollkante oder wellige Traufe | T2 / T3 | alle | 0,6 |
| 4 | Fledermausgaube | T10 | M+ | 0,4 |
| 5 | Ranken, Moos, Flechte | T12 | alle | 0,9 (Dichte nach Detailgrad) |
| 6 | Laternenarm statt Wandlaterne | `<frame>_fence` in d=+1 (verbindet mit Pfosten), darunter `lantern[hanging=true]`; Fortsetzung von T02 | alle | 0,7 |
| 7 | Pilze | `potted_red_mushroom`/`potted_brown_mushroom` (nicht in Registry) auf Simsen; Gartenpilz-Skulptur (T13 klein: Stiel 3, Kappe 5) | alle mit Garten | 0,6 |
| 8 | Hängender Blumentopf | `iron_chain[axis=y]` unter Vollblock-Balken, darunter `potted_flowering_azalea_bush` (Töpfe brauchen in Java keinen Halt [Q24]; Einschätzung zur Wirkung) | alle | 0,3 |

Taubenschlag („dovecotes“ [Q1]) als Mini-Detail: ein 1×1-Kasten auf dem Dach aus `<frame>`, davor `<shutter>`-Falltür offen, Mini-Satteldach aus 2 Treppen. Aufwand niedrig, Wirkung niedrig. Optional für huge.

## (h) Deko und Umgebung

- **Garten verwildert, nicht geometrisch:** „intentionally overgrown English-style garden and a moat-like pond“ [Q2], „colourful flowers, profusions of roses, clematis“ [Q3]. Blumen: `allium`, `cornflower`, `oxeye_daisy`, `lily_of_the_valley`, `azalea`, `flowering_azalea` (vorhanden), dazu `rose_bush`/`lilac`/`peony` (doppelt hoch; nicht in Registry) und `potted_blue_orchid`/`potted_allium` (nicht in Registry).
- **Weg geschwungen:** „a short winding path leading up to the door, rather than a straight one“ [Q39]. Die heutigen Versätze alle 5 Blöcke (`landscape.ts:87`) sind gut. Für Fantasy kommen Trittsteine dazu: `mossy_cobblestone_slab[type=bottom]` im Gras, jede zweite Zelle Gras.
- **Pilze nur sicher:** Lose `red_mushroom`/`brown_mushroom` (nicht in Registry) überleben nur bei Licht < 13 oder auf `podzol`, `mycelium` oder Nylium. Bei Licht ≥ 13 brechen sie beim nächsten Nachbar-Update ab, und WorldEdit löst solche Updates aus [Q18]. Regel: lose Pilze nur auf `podzol` (nicht in Registry), sonst im Topf.
- **Zaun krumm:** `spruce_fence` mit `spruce_fence_gate[in_wall=false]` am Weg, alle 4–6 Pfosten ein höherer Pfosten (Fence + `lantern`).
- **Laternen:** warm (`lantern`), an Pfosten aus `spruce_fence` 2 hoch mit Laterne oben oder hängend unter einem Arm. `soul_lantern` nur bei Palette B oder ausdrücklichem Wunsch.
- **Hexen-Requisiten (B):** `cauldron` (nicht in Registry, kein Block-Entity, deshalb erlaubt), `potted_red_mushroom` (Vanilla-Sumpfhütte [Q15]), `brewing_stand` (Block-Entity ohne Inhalt; nur nach Test).
- **Teich:** Eine kleine Wasserfläche würde dem Spadena-Vorbild [Q2] entsprechen. Wasser fließt aber nach dem Einfügen, deshalb erst nach Absprache mit dem Landschaftsthema.

## (i) Winter- und Weihnachtsvariante

- **Lebkuchenhaus (Palette E, T14)** ist die stärkste Weihnachtsanmutung des Stils: braun-weiß mit bunten Punkten und warmem Licht hinter orangefarbenem Glas [Q12][Q13]. Aktivierung: Thema `christmas` + Fantasy → Palette E mit 40 %; Stichwort „Lebkuchen/Knusper/Hexenhaus“ → 100 %.
- **Winter-Märchen (Paletten A, C, D):** Der Weißputz wirkt schon verschneit. Dächer dunkel (`dark_oak`, `deepslate_tiles`) als Kontrast „kalter Schnee, gelbes Licht“. Lichtquellen: `lantern` (15) braucht ≥ 4 Taxicab-Abstand zum Schnee (Winter-Thema). `glow_lichen` (7) und Kerzen (1–3 Stück: Licht 3–9 [Q25]) schmelzen nichts. Dadurch eignen sie sich für Lichtpunkte nahe Schneeflächen.
- **Seelenlaternen nie bei Weihnachten** (blau widerspricht dem warmen Ton; S2 zeigt es). Sie haben Licht 10 und schmelzen keinen Schnee. Für eine bläuliche Winternacht gibt es sie nur bei Palette B und auf ausdrücklichen Wunsch.
- **Turm mit Girlande:** Die Girlande heute unter der Kegeltraufe (S3) gehört künftig unter das Hutband auf die Krempe. Dafür muss der Krempenring aus Stufen bestehen (T7), sonst hängt sie in der Luft.
- **Geschenke:** Die heutigen einfarbigen Wollwürfel (S2) gehören zum Festschicht-Thema. Bei Fantasy passen eher Pilz-Skulpturen mit Schnee oder Laternen.
- Keine Eiszapfen und Schnee nur auf Wunsch (Projektregel, README).

## (j) Was den Stil kaputt macht

1. Ein flaches oder mittleres Dach auf hoher Wand: Das Haus sieht dann aus wie ein normales Dorfhaus.
2. Konvexe Dächer (Gambrel, oben flach gedeckelt): Scheune.
3. Ein dichtes Pfostenraster vor der ganzen Fassade: Fachwerkhof, kein Märchen.
4. Alles schief: Rauschen statt Absicht. Schiefe wirkt nur als Kontrast zu ruhigen Flächen (Einschätzung).
5. Nether-Farben überall (Karmesin-Wand, Wirr-Rahmen, lila Glas im ganzen Haus): Das wirkt wie der Nether. Nether-Holz ist ungewöhnlich und taugt nur als Akzent [paletten.md].
6. Zu viele Farben. „Pick a primary block, then add 2–3 complementary colors maximum“ [Q30], „one earthy base tone … paired with a single warm accent color“ [Q39]. Fantasy lebt von einer Dachfarbe als Hauptakzent.
7. Kirchen- und Burgelemente am Cottage (Bleiglas 3×5, Zinnen, Spitzbogen-Doppelportal).
8. Blaues Licht bei Weihnachten.
9. Riesige, quadratische Grundrisse ohne Gliederung.
10. Gleichmäßig verteilter Bewuchs (jede Wand gleich bewachsen). Bewuchs gehört an Ecken, Sockel und Kamin.

---

## Fehler, die Profis vermeiden

- **Ranken unter Treppen oder Stufen:** Sie werden beim ersten Block-Update gelöscht [Q19], und beim WorldEdit-Einfügen gibt es solche Updates. Ranken nur vor vollen Flächen.
- **Lose Pilze bei Licht:** brechen ab ≥ 13 Licht bei einem Nachbar-Update [Q18]. Topf oder Podsol nehmen.
- **Spore Blossom an Laub:** geht nicht [Q21]. Hängende Wurzeln brauchen einen Block darüber [Q22].
- **Pilzblöcke ohne Nachbarlogik:** Java zeigt an berührenden Flächen Poren [Q16]. Ohne Zustandsauflöser-Regel sind Vorschau und Import nicht bitgleich.
- **Teppich auf Treppen:** Moos schwebt optisch über der Stufe (Einschätzung). Nur auf vollen Oberseiten setzen.
- **Kerzen auf Halbflächen:** Kerzen brauchen festen Halt, auf nicht festen Blöcken gehen sie nicht [Q25]. Nur auf Vollblock, `slab[type=top]` oder Kopfüber-Treppe setzen.
- **Ungewachstes Kupfer oder ungewachste Blitzableiter:** oxidieren in der Welt und ändern die Dachfarbe (Begründung zum Wachsen in `paletten.md`). Immer `waxed_*`.
- **Blöcke aus späteren Versionen:** Guides von 2026 nennen „Poplar wood (Dappled Forest)“ [Q29] und „golden dandelion“ [Q24]. Beides fehlt in 1.21.11 [Q41]. Jede Quelle gegen die Datenliste prüfen.
- **Krempe aus Treppen statt Stufen:** Dann liest sich der Turmhut als Pyramide. Die Krempe ist immer ein flacher Stufenring (T7).
- **Kegel ohne Knick und ohne Spitze:** Eine einzelne Zaunspitze (`roundTower.ts:195`) ist aus der Entfernung unsichtbar. Blitzableiter oder Endstab ragen 1 Block heraus und fangen das Licht.
- **Schiefe durch Diagonalwände:** Profis versetzen um ganze Geschosse (Auskragung) und lassen Dächer und Kamine schief sein, nicht Mauern (Einschätzung).
- **Rauch blockieren:** Über dem Lagerfeuer im Kamin nichts setzen. Ein Topf daneben ist ok, eine Falltür darüber nicht (`daecher.md`).
- **Trapdoors brauchen keinen Halt** (seit 1.9 [Q42]). Läden und Klappen können also frei stehen. Trotzdem nur an Wänden setzen, damit sie glaubwürdig wirken.

---

## Empfehlungen für den Generator

Nach Nutzen und Aufwand priorisiert. „Daten“ = nur `styles.ts`/`palettes.ts`/Vorlagen; „Regel“ = Code.

| Prio | Was ändern | Modul | Daten/Regel | Akzeptanzkriterium |
|---|---|---|---|---|
| 1 | Profil `storybook` (Δ 1,3,4,4… / 1,1,2,4,… ab n≥7) und Deckel je Stil/Größe (Fantasy 9/10/12/12). Kürzen nur auf der Traufseite, nie die obersten zwei Spalten; sonst Umstieg auf `half_hip` | `generator/roof/profiles.ts`, `roofEngine.ts:217`, `styles.ts` (neues Feld `maxRise`) | Regel + Daten | Für alle n=3..10 ist die Δ-Folge monoton nicht fallend; kein Δ=1 nach Δ≥2; Fantasy small: Dachanstieg/Wandhöhe ≥ 1,5; bestehende Lints (Anstieg ≤ Deckel + 1, keine Lücken) grün |
| 2 | Dachtypen `gable 0.40, half_hip 0.35, saltbox 0.15, hip 0.10`, ohne `gambrel`; Profile `storybook 0.5, bell 0.3, steep 0.1, flared 0.1`; Fantasy-Tiefen > Breiten (7×9, 9×11, 11×13, 13×15); `roofTypeFor` für Fantasy → `half_hip` statt `hip` | `styles.ts:98–105`, `plan.ts:186–191` | Daten + kleine Regel | Bei allen Fantasy-Standardgrößen ist `ridgeAxis = z` (Giebel zur Front); kein konvexes Profil im Stil |
| 3 | Laternen: `lantern` als Stilstandard; `soul_lantern` als Palettenfeld nur bei B; beim Thema `christmas` immer `lantern` | `styles.ts:111`, `palettes.ts` (Feld `lantern?`), `resolveInput.ts:116`, `openings.ts:80` | Daten + Regel | In Weihnachtsbauten im Fantasy-Stil null `soul_lantern`, außer auf ausdrücklichen Wunsch |
| 4 | Automatische Türmchen: Fantasy M 0,5 / L 0,8 / H 0,9 Rundturm D5–7 an einer freien Frontecke; Hexenhut nach T7 (Lagenliste, Krempe aus Stufen, Hutband, Knick, `waxed_lightning_rod` bzw. `end_rod`) | `resolveInput.ts:99`, `plan.ts:159`, `roundTower.ts:33–37,185,195`, `geometry/solids.ts` | Regel + Daten | Turmspitze ≥ Hauptfirst + 3; Krempe = Stufenring; 0 Validator-Reparaturen; Knick-Lagen überlappen flächig |
| 5 | Sechs Paletten (A–E sofort, F nach Registry-Erweiterung); `upperWall`/`infill` folgen `wall` bei Putz; alte `fantasy_crimson`/`fantasy_warped` ersetzen | `palettes.ts:116–184`, `styles.ts:97` | Daten | `lintPalette` ohne Fehler für A–E; ΔL Wand↔Rahmen ≥ 15; je Variante 3–5 Familien |
| 6 | Fachwerk reduzieren: Fantasy `timber: 'upper'`, Felder bis 5 breit, Pfosten nur an Ecken, Geschosslinien und Öffnungen; Erdgeschoss Putz oder Stein | `styles.ts:107`, `studs.ts` (Parameter `maxPanel`), `walls.ts:166` | Daten + Regel | Rahmenanteil an der Erdgeschossfassade ≤ 15 %, im OG ≤ 30 % (Zählung im Test) |
| 7 | Rollkante, wellige Traufe und Firstspitzen als Dach-Optionen (Stückart `stairs_out_top`, Traufversatz, Firstenden) | `roofEngine.ts`, `profiles.ts` (`columnPieces`) | Regel | Dachlückenprüfung grün; Zustandsauflöser-Fixpunkt; an Walm und Kehle keine offenen Ecken |
| 8 | Schiefer Kamin (1 Versatz, Krone, Aufsatz) für Fantasy | `components.ts:149–162` | Regel | Zug flächig verbunden (keine reine Kantenberührung); Oberkante ≥ First + 1 bzw. Dachfläche + 2; über dem Lagerfeuer 3 Luftblöcke |
| 9 | Bewuchs-Schicht T12 (Ranken, Moos, Flechte) mit Dichte nach Detailgrad; Registry: `glow_lichen`, `hanging_roots`, `spore_blossom`; Validator-Regeln (Ranke nur vor voller Fläche und nicht unter Treppen) | neuer Schritt `generator/house/overgrowth.ts`, `blocks/families.ts`, `validator.ts` | Regel | 0 Reparaturen; ≤ 15 % Fassadenspalten mit Ranken; keine Ranke unter einer Treppe |
| 10 | Vorlagen W19, W20, W22, W04c, T11, T12; Fantasy-Fensterliste `['W20','W07','W05','W19']`, Türen `['T11','T04','T02','T12']`; W13 aus der Fantasy-Hausliste | `templates/windows.ts`, `templates/doors.ts`, `styles.ts:109–110` | Daten | `templateFits`-Tests; Türfreiraum vor und hinter der Tür; Lint 1–4 Fenstervorlagen |
| 11 | Turmwand: unten Sockelmaterial, darüber `wall`/`upperWall` mit Pfosten; Bänder nur am ersten OG und unter dem Dach | `roundTower.ts:78,131` | Regel | Turm über dem Sockelgeschoss aus der Wandrolle; ≤ 2 Bänder |
| 12 | Erkertürmchen T8 als neue Masse (Ecke, ab OG, Konsolenringe) | `plan.ts`, `roundTower.ts` | Regel | Nichts schwebt; Innenraum zum Haus offen; Kegel nach T7 |
| 13 | Pilzhaus als Form (Stichwort „Pilzhaus“): Registry `mushroom_stem`, `red_mushroom_block`, `brown_mushroom_block`, `potted_red_mushroom`, `potted_brown_mushroom`, `podzol`; Zustandsauflöser „gleicher Pilzblock-Nachbar → Fläche false“; Kappe aus `revolve` | `blocks/families.ts`, `stateResolver.ts`, neues `generator/mushroomHouse.ts`, `parseDescription.ts` | Regel + Daten | Fixpunkt-Test; Unterseite `down=false`; Registry-Test gegen minecraft-data |
| 14 | Fledermausgaube T10 als Abschnittstyp `eyebrow` (Fantasy 60 % der Gauben) | `roofEngine.ts`, `components.ts` | Regel | Höhe : halbe Breite ≈ 1 : 3; keine Dachlücken |
| 15 | Schiefe-Auswahl: je Haus 2–3 Maßnahmen aus (d), seedbasiert (einseitige Auskragung, zwei Profile, Fensterhöhen ±1 …) | `resolveInput.ts`, `plan.ts` | Regel | Drei Varianten eines Seeds unterscheiden sich in mindestens einer Maßnahme; nie mehr als 3 aktiv |
| 16 | Lebkuchen-Aktivierung: Thema `christmas` → E 40 %; Stichwort „Lebkuchen/Knusper“ → E 100 %; Zuckerstangen-Pfosten und Bonbon-First als Festschicht-Regeln | `resolveInput.ts`, `festive.ts`, `parseDescription.ts:1385` | Regel + Daten | Lebkuchen-Bauten ohne `soul_lantern`; Kerzen nur auf voller Oberseite; keine Eiszapfen |

---

## Quellen

1. https://en.wikipedia.org/wiki/Storybook_architecture – Storybook-Stil: Verspieltheit, absichtlich unebene Dächer, viele Giebel, Türmchen, Taubenschläge, ungleiche Fenster und Türen.
2. https://en.wikipedia.org/wiki/Spadena_House – „Witch's House“: spitzes, schiefes Dach, winzige Fenster, rustikaler Putz, verwilderter Garten, Teich.
3. https://www.northshoreheritage.org/blog/2022/4/19/the-story-behind-the-storybook-housing-style – Merkmalliste: Krüppelwalm, Rollkanten, Wellenschindeln, Katzenbuckel, runde und gotische Fenster, gerundete Türen, Kamine mit Aufsatz und Efeu.
4. https://www.gardenstogables.com/an-architectural-whimsical-treat-the-storybook-style/ – Rollkanten, Krüppelwalm, falsches Reetdach („wavy Hobbit roof“), schmale Sprossenfenster.
5. https://en.wikipedia.org/wiki/Hip_roof – Definition Krüppelwalm (half-hip, jerkinhead, clipped gable).
6. https://en.wikipedia.org/wiki/Thatching – Reetdach üblich 45–55°, in Schneeregionen steiler.
7. https://de.wikipedia.org/wiki/Fledermausgaube – Bogenförmige Gaube; ideal Höhe : halbe Breite = 1 : 3.
8. https://de.wikipedia.org/wiki/Butzenscheibe – Runde Scheiben 7–15 cm, Bleifassung, Zwickel, Waldglas, „Butzenscheibenromantik“.
9. https://en.wikipedia.org/wiki/Conical_roof – Kegeldach, „pepperpot turret“, Eaves über die Turmwand.
10. https://en.wikipedia.org/wiki/Bartizan – Eck-Türmchen auf gestuften Konsolen, rund oder eckig.
11. https://en.wikipedia.org/wiki/Hobbit_hole – „Hobbit architecture favours round doors and windows“, Wohnen im Hang.
12. https://en.wikipedia.org/wiki/Gingerbread_house – Zuckerguss als Schnee, Bonbons, Gummidrops, Zuckerstangen, Fenster aus geschmolzenem Zucker; Herkunft Deutschland/Hänsel und Gretel.
13. https://de.wikipedia.org/wiki/Lebkuchenhaus – Knusperhäuschen/Hexenhaus, Bezug zu Hänsel und Gretel.
14. https://en.wikipedia.org/wiki/Howl%27s_Moving_Castle_(film) – Miyazaki studierte Colmar und Riquewihr (Elsass) als Vorbild.
15. https://minecraft.wiki/w/Swamp_Hut – Vanilla-Hexenhütte: spruce_planks, Stelzen aus oak_log, Dach aus spruce_stairs, Topf mit rotem Pilz.
16. https://minecraft.wiki/w/Mushroom_Block – Zustände up/down/…, Standard true, false = Poren; berührende gleiche Blöcke zeigen Poren.
17. https://minecraft.wiki/w/Huge_Mushroom – Stiel 5–7 (selten bis 13), rote Kappe als Kuppel aus fünf 3×3, braune flach 7×7 ohne Ecken.
18. https://minecraft.wiki/w/Red_Mushroom – Überleben nur bei Licht < 13 oder auf Myzel, Podsol, Nylium; Abbruch bei Nachbar-Update.
19. https://minecraft.wiki/w/Vines – Halt an vollen Flächen; Ranken unter Treppen werden bei jedem Update gelöscht.
20. https://minecraft.wiki/w/Glow_Lichen – an jeder Seite fester Blöcke, auch unten; Licht 7; sechs Richtungszustände.
21. https://minecraft.wiki/w/Spore_Blossom – nur an der Unterseite von Blöcken, nicht an Laub; kein Licht.
22. https://minecraft.wiki/w/Hanging_Roots – nur an der Unterseite; ohne Halt zerstört.
23. https://minecraft.wiki/w/Pale_Hanging_Moss – hängt unter Blasseiche/Laub, Zustand `tip`.
24. https://minecraft.wiki/w/Flower_Pot – topfbare Pflanzen inkl. Pilze, Fungi, Azaleen; Töpfe brauchen in Java keinen Halt (nennt auch „golden dandelion“, das 1.21.11 nicht hat).
25. https://minecraft.wiki/w/Candle – Licht 3/6/9/12 je 1–4 Kerzen; nicht auf nicht festen Blöcken.
26. https://minecraft.wiki/w/Tutorial:Building_a_metropolis/City_themes – Elfen- und Zwergenstädte, magische Städte (Kessel, Braustände).
27. https://minecraft.wiki/w/Tutorial:Color_palette – Verläufe aus 3–4 Tönen, Kontrastpaare, Fernwirkung ähnlicher Blöcke.
28. https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions – Tiefe und Details, Texturmischung, Biom-Passung.
29. https://minecraft.how/blog/post/build-wizard-tower-minecraft – Zaubererturm: Verjüngung, spitzes Dach oder Spitzencluster, Plattform oben, Kupfer/Purpur/Schwarzstein; nennt nicht vorhandenes „Poplar“.
30. https://minecraft.how/blog/post/minecraft-house-design-tips – 3–4 Blöcke je Palette, asymmetrische Fenster, Fantasy lebt von Formvarianz.
31. https://minecraft.how/blog/post/build-treehouse-minecraft – Birke wirkt filigran, Schwarzeiche schwer; steile Dächer, Überstände.
32. https://minecraft.how/blog/post/build-medieval-town-minecraft – Dachhöhen variieren, Materialschichtung, strategisches Licht.
33. https://cozygamebuilds.com/minecraft-roof-design-ideas/ – Turmkegel mit gewundener Naht und Spitze, Moos-Dachmischung, Ranken an der Traufe, Azaleen-Dach.
34. https://cozygamebuilds.com/mushroom-fields-minecraft-house-ideas/ – Pilzhäuser: Kappenstufen 1–2 breiter, Stiel als Säule, Fenster im Stiel, Licht aus Shroomlight und Flechte.
35. https://cozygamebuilds.com/minecraft-forest-cabin-ideas/ – Steile A-Rahmen bis fast zum Boden, Stufen-Treppen-Wechsel für Kurven, Seelen- und Normallaternen.
36. https://cozygamebuilds.com/pale-garden-minecraft-house-ideas/ – „Two storeys plus a steep attic gable make it read as far bigger“; gedämpfte Palette mit einem warmen Akzent.
37. https://cozygamebuilds.com/mangrove-swamp-minecraft-house-ideas/ – Stelzen aus Mangrovenwurzeln, Schlamm- und Moospalette, Laternen an Zäunen.
38. https://cozygamebuilds.com/minecraft-village-house-ideas/ – Weißes Cottage mit Stammecken, steilem Fichtendach, Blumentöpfen, Azaleen-Spalier.
39. https://decorhomeguides.com/whimsical-minecraft-house/ – (geringe Verlässlichkeit, Hobby-Seite) ein übergroßes Fenster, schiefes Satteldach, Wellen-Reet, schiefer Kamin, gewundener Weg.
40. https://gamerempire.net/10-stunning-minecraft-front-door-design-ideas/ – Birken- und überwucherte Eingänge, Karmesin-Tür mit Ranken.
41. https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json – Blockliste und Zustände 1.21.11 (Existenz- und Zustandsprüfung aller IDs dieser Notiz).
42. https://minecraft.wiki/w/Trapdoor – Falltüren brauchen seit 1.9 keinen Halt; Hälfte oben/unten je nach Klickposition.
