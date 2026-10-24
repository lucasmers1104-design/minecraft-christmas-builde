# Stilbibel Japanisch, Ostasiatisch und Kirschblüte (Stil-IDs `japanese` und `cherry`)

Stand 2026-10-23.

Diese Stilbibel beschreibt, woran man echte japanische Bauten erkennt: Minka, Machiya, Tempel, Schrein, Pagode, Teehaus und Ryokan. Sie zeigt, wie der Generator sie mit Vanilla-Blöcken aus 1.21.11 nachbaut. Kirschblüte gilt dabei als eigener Stil und nicht als „rosa Japan“.

Belege stehen als [Qn] im Text. „Einschätzung“ heißt: Die Blockfolge ist aus Quellen und Spielmechanik abgeleitet, eine Quelle für genau diese Folge gibt es nicht. Die älteren Notizen `paletten.md` und `daecher.md` werden hier vorausgesetzt und nur korrigiert oder erweitert.

Legende für alle Skizzen:
- `.` = Luft, `G` = Gelände, hb = halber Block.
- Bei Treppen zeigt `facing` zur hohen Seite.
- Tiefe d: −1 = innen, 0 = Wand, +1 und +2 = davor.
- Laub ist immer `persistent=true`.

---

## Kurzfassung

Sortiert nach Wirkung:

1. **Irimoya steht bei uns auf dem Kopf.** Irimoya hat oben einen Giebel und unten einen Walm [Q1][Q3]. Unser `half_hip` macht das Gegenteil: unten Giebel, oben Walm. Das ist ein Krüppelwalm (`roofEngine.ts:198–205`). Bei `japanese` ist er mit 40 % die häufigste Dachform. Das ist der Hauptgrund, warum die Dächer europäisch wirken.
   - Abhilfe mit der vorhandenen Engine: ein Walmring `skirt(rings=k)` plus ein Satteldach, das an den Stirnseiten um k eingerückt ist (T01).
2. **Die „Pagode“ ist nur ein Walmdach** (`plan.ts:189`). `skirt` ist toter Code.
   - Echte Pagoden haben 3 oder 5 Geschosse. Jedes ist kleiner (das Maß heißt *teigen*), die Traufkanten sind gerade [Q20], oben sitzt ein Pyramidendach mit Spitze [Q18] (T07).
3. **Die Festschicht hängt nicht vom Stil ab.** Weihnachtsbaum, Woll-Geschenke und Girlanden landen auch vor Tempeln (`generateBuilding.ts:143–151`).
   - Respektvoller ist Winterlicht: Laternen an den Traufecken, Steinlaterne mit Kerze unter der Schneekappe. Eine Kerze, weil Schnee ab Licht 12 schmilzt [Q50][Q51].
   - Dazu Kadomatsu-artiger Neujahrsschmuck: paarweise am Tor, aufgestellt erst nach Weihnachten [Q32] (T20).
4. **`cherry` hat keinen einzigen Kirschbaum**, nur eine rosa Laubhecke (`landscape.ts:108`).
   - Der Vanilla-Baum ist genau beschrieben: Stamm 7–8, 1–3 Äste, Astlänge 2–4, Krone mit Radius 4 und Höhe 5, je 25 % Löcher, Hängelaub 1/6 [Q38].
   - Daraus entsteht ein steuerbarer, schöner Kirschbaum (T16). **Der Baum ist die Signatur des Stils, nicht die rosa Wand.**
5. **Kirsche braucht ein dunkles Dach.**
   - `cherry_white` hat ein rosa Dach (`palettes.ts:383`).
   - `cherry_slate` macht Wand, Füllung, Läden und über W15 auch das Gitter rosa (`palettes.ts:355–366`).
   - Rosa sollte nur als Linie erscheinen: Balken, Traufkante, Untersicht (Paletten C1–C5).
6. **Japanische Wände bekommen europäische Kopfbänder.** Mit `timber:'all'` setzt `openings.ts:265` über `walls.ts:200` Streben.
   - Richtig ist Pfosten-Riegel ohne Diagonalen: unten ein Holzbrett (Koshi), in der Mitte Papier oder Putz, oben ein Putzstreifen über dem Nageshi-Band [Q4][Q22] (T09).
7. **Unter Wohnhäuser gehört kein Steinpodest mit Treppenschürze** (`walls.ts:113–123`).
   - Der Wohnboden liegt etwa 50 cm über dem Grund [Q5]. Davor liegt eine Engawa, 1–1,3 m breit, bei Tempeln über 3 m [Q21].
   - Nur Tempel stehen auf einem Steinpodest (Kidan) mit einer Treppe mittig an jeder Seite [Q17] (T10).
8. **Ecken biegen sich hoch (Nokizori)** [Q9]. Unsere Umsetzung:
   - Lippe aus nach außen gerichteten Treppen auf den letzten 1–2 Blöcken.
   - Laterne unter der Ecke, Kopfüber-Treppe an der Spitze [Q56] (T03, Einschätzung).
9. **Überstand = Engawa-Breite + 1–2**, also 3–4 ab Pfostenebene. Darunter kommen Konsolen (Tokyō) an jedem Pfosten [Q12] (T04).
   - Heute gibt es nur eine Gesimsreihe (`roofEngine.ts:370–373`), und die Option ist auf 3 begrenzt.
10. **Neigung nach Bautyp, nicht nach Stil.** Dafür braucht es Untervarianten als Daten (b).
    - Machiya: gerades, flaches Ziegeldach. Δ = 1,1,1 ergibt genau 26,6°, das sind „5 sun“ [Q8].
    - Tempel: konkav (`bell`). Teehaus: leicht konvex (Mukuri [Q16]). Strohdach-Minka: steil mit dicker Traufkante.
11. **First schmal und hoch, die Enden erhöht** (Onigawara [Q13]). Bisher ist er ein Kasten (`block_slab`, `plan.ts:203`) (T05).
12. **Japanischer Garten statt europäischem Vorgarten.**
    - Trittsteine im Versatz statt 3 breitem Weg.
    - Steinlaternen statt Galgen-Laternenmast (`landscape.ts:37, 119–140`).
    - Bambuszaun statt Laubhecke, Azaleen im Formschnitt.
    - Steine in ungeraden Gruppen, nie in einer Linie [Q31]. Wasser ist Pflicht, notfalls symbolisch als Kies [Q30].
13. **Zinnober ist eine Sakralfarbe.** Schreine bemalten ihr Holz rot [Q4]. Torii stehen nur vor Schreinen, meist zinnober mit schwarzem Kasagi [Q29].
    - Zinnober-Ersatz mit allen Holzformen: `stripped_mangrove_log` und `mangrove_*` (L\* 31).
14. **Kirschlaub wird bei Schnee nicht weiß** [Q41]. Im Winter liegt Schnee auf der Krone, oder die Krone wird ausgedünnt (Einschätzung).
15. **Lücken in Registry und Katalog.**
    - In der Registry fehlen `bamboo`, `water`, `gravel`, `lily_pad` und `copper_lantern`.
    - Im Materialkatalog fehlen `pale_oak_*`, `bamboo_mosaic` und `hay_block`.

---

## Schwächen des aktuellen Generators

Grundlage sind die Screenshots `haus-japanisch-gross-ohne-thema.jpg`, `haus-japanisch-weihnachten.jpg`, `haus-kirschbluete-gross-ohne-thema.jpg` und `haus-kirschbluete-weihnachten.jpg` sowie der Code.

**Dach**
- **Falsches Irimoya.** `styles.ts:179–181` begründet `half_hip:0.4` als „Irimoya-like“. `roofEngine.ts:198–205` baut aber Walm nur oben. Im Screenshot sieht man eine Stufenpyramide mit Kastenfirst.
- **Pagode = Walmdach** (`plan.ts:189`). Der Typ `skirt` mit `rings` existiert (`roofEngine.ts:56–57, 180–185, 214`), wird aber nie benutzt. „Pagode“ landet im Parser zwar als `roofType:'pagoda'` (`ai/prompt.ts:84`), heraus kommt trotzdem ein normales Haus.
- **Keine Ecken, keine Konsolen.**
  - `flared` (`profiles.ts:41–42`) ergibt zwei Plattenringe und dann 45°: im Bild zwei Bänder plus Pyramide.
  - Die Grate laufen gerade bis in die Ecke.
  - Untersicht nur als einzelne Gesimsreihe (`roofEngine.ts:370–373`).
- **Kastenfirst.** `ridgeStyle:'block_slab'` (`plan.ts:203`) erzeugt einen breiten Kasten ohne erhöhte Enden.
- **Ein Profil für alle Typen** (`flared` 0,55 / `bell` 0,45, `styles.ts:182`).

**Paletten**
- `japanese_temple.roofTrim = red_nether_bricks` (`palettes.ts:337`): Das Wohnhaus bekommt einen fast schwarzroten Traufring. Das wirkt wie das Chinarestaurant-Klischee.
- `cherry_white.roof = cherry_planks` (`palettes.ts:383`): rosa Dach.
- `cherry_slate` (`palettes.ts:355–366`): Wand, Obergeschoss, Füllung und Läden sind rosa, das W15-Gitter wird zu `cherry_fence`. Im Bild Rosa auf Rosa; Kontrast nur durch `cherry_log` (L\* 15,8) und die Traufkante aus `dark_oak_planks`.

**Wand und Sockel**
- **Kopfbänder** durch `timber:'all'` (`styles.ts:190, 217`), umgesetzt in `openings.ts:264–268` und `walls.ts:200`.
- **Sockel** als Podest mit Treppenschürze (`walls.ts:98–123`). Es fehlen Engawa und Schattenfuge.
- **Ständerraster** `studs.ts` mit Feldern von 1–4 Blöcken. Ein gleichmäßiger Takt fehlt.

**Öffnungen**
- Nur `W15` und `T09` (`styles.ts:192–193`).
- W15 setzt jedem Fenster ein eigenes Vordach mit Brüstung (`windows.ts:454–473`). Unter einer tiefen Traufe ist das doppelt, und die Fassade wirkt wie eine Kästchenreihe.

**Proportionen**
- `huge` = 19×15 mit **3 Geschossen** (`styles.ts:187`). Dreigeschossig sind in Japan nur Pagoden und Burgen.
- Überstand maximal 3 (`buildOptions`).
- Ein Rundturm mit Kegel ist möglich (`plan.ts:159`).

**Landschaft**
- Weg 3 breit und gerade (`landscape.ts:37, 63–90`).
- Hecke: `oak_leaves` bei japanisch, `cherry_leaves` bei Kirsche (`:108`).
- Galgenlaterne (`:119–140`), Tulpen (`:49`), Teich nur im Winter und nur als Packeis (`:164–175`).
- Es fehlen Kirschbäume, `pink_petals`, Bambus, Steinlaternen und Torii.

**Festschicht**
- Stilblind (`festive.ts:75`). In beiden Weihnachts-Screenshots stehen Weihnachtsbaum und bunte Geschenkwürfel im japanischen Garten.

**Daten**
- `forbidden:['mossy']` (`styles.ts:196`) verbietet genau das Moos, das japanische Gärten prägt [Q30][Q31]. Die Verwitterung von `stone_bricks` mischt es trotzdem hinein (`materials.ts:87`).
- `materials.ts` fehlen `pale_oak`, `bamboo_mosaic`, `hay_block`, `chiseled_deepslate`, `red_concrete` und `pink_terracotta`, obwohl die Blöcke in der Registry sind.

---

## Techniken und Regeln

### T01 Irimoya: Walmring plus eingerücktes Satteldach

Irimoya hat oben einen Giebel und unten einen Walm [Q1]. Der Giebel liegt über dem Kern (moya), der Walm über dem Umgang (hisashi) [Q2][Q3]. Eine gestufte Variante heißt Shikoro-yane [Q1].

**Aufbau aus zwei Sektionen**
1. `skirt` mit `rings=k` über die ganze Grundfläche.
2. `gable` mit gleichem Profil, gleicher Basis und gleichem Traufüberstand, an den Stirnseiten um k−1 eingerückt, mit 1 Block Ortgang-Überstand.

Der Giebel (Tsuma) steht bei dx = k und beginnt auf dem Walmring.

**Parameter**
- n = Hangspalten je Seite einschließlich Überstand.
- k = clamp(round(0,4·n), 2, n−2). Beispiel: 13×9 mit Überstand 2 ergibt außen 17×13, n = 6, k = 3 (Einschätzung).

**Was der Engine fehlt**
- `overhangVerge` getrennt vom Traufüberstand.
- Giebelfüllung, die erst ab der Ringoberkante beginnt.
- Dieselbe Δ-Kappung für beide Sektionen. Heute gilt 14 für `skirt` und 7 für `gable` (`roofEngine.ts:214–224`).

**Draufsicht, Viertel einer 17×13-Fläche, First entlang x.** H = Walmfläche, S = Sattelfläche, V = Ortgang (`roofTrim`), T = Tsuma, R = First.
```
x:   0 1 2 3 4 5 6 7 8 …
z0:  H H H S S S S S S
z1:  H H H S S S S S S
z2:  H H V T S S S S S
z4:  H H V T S S S S S
z6:  H H V T R R R R R
```

**Ansicht Ost (Stirnseite), `flared`, Δ = 1,1,2,2,2,2.** Die Tops liegen bei 1,2,4,6,8,10 hb.
Legende:
- b/t = roof slab[bottom/top]
- s = roof stairs (zur Mitte hoch)
- V = Ortgang-Treppe
- T = Giebel aus `infill` (Japan: `calcite` mit einem senkrechten `frame`-Pfosten in der Mitte)
- R = First
```
z:     0 1 2 3 4 5 6 7 8 9 10 11 12
y=B+5: . . . . . . R . . . .  .  .
y=B+4: . . . . . V T V . . .  .  .
y=B+3: . . . . V T T T V . .  .  .
y=B+2: . . . V T T T T T V .  .  .
y=B+1: . . s s s s s s s s s  .  .
y=B  : b t t t t t t t t t t  t  b
```

- **Einsatz:** Tempel, Wohnhaus, Ryokan, Burg; bei `cherry` Pavillon und Haus. Ab Breite 11.
- **Bewertung:** Wirkung hoch, Aufwand mittel.
- **Stile:** japanese, cherry, fantasy.
- **Quellen:** [Q1][Q2][Q3][Q55]. Die Blockfolge ist eine Einschätzung.

### T02 Δ-Profile nach Bautyp

Werte in hb, von der Traufe zum First.

| Variante | Δ (n=6) | Wirkung | Quelle |
|---|---|---|---|
| Machiya, Kirizuma | 1,1,1,1,1,1 | gerade 26,6° = 5 sun, Ichimonji-Traufe | [Q7][Q8] |
| Schrein | 1,2,2,2,2,2 | fast gerade, flacher Fuß | [Q23][Q24], Einschätzung |
| Wohnhaus, Ryokan | 1,1,2,2,2,2 (`flared`) | sanfter Schwung | [Q4] |
| Tempel (Sori, konkav) | 1,1,2,2,4,4 (`bell`) | flache Traufe, steiler First | [Q4][Q9] |
| Minka (Stroh) | Ring 0 = Vollblock, dann 4,4,4,4 | steil (Kanekōbai = 45° [Q8]), dicke Kante | [Q5] |
| Teehaus, Sukiya (Mukuri) | 2,2,2,1,1,1 (neues Profil `mukuri`) | leicht konvex | [Q16] |
| Hōgyō-Pavillon | 1,2,2,(4) | kurz und konkav, mit Spitze | [Q18] |
| Mokoshi, Pagodenring | 1,1,2 (Ringe = Überstand + 1) | Schürze zwischen den Geschossen | [Q19][Q20] |

**Schnitt Machiya, Breite 9.** b/t = slab[bottom/top], r = Firststufe.
```
x:   0 1 2 3 4 5 6 7 8
y2:  . . . . r . . . .
y1:  . . b t . t b . .
y0:  b t . . . . . t b
```

**Schnitt Tempel-Walm, Breite 11, Δ = 1,1,2,2,4.** > und < sind Treppen nach Ost bzw. West, F ist ein Vollblock.
```
x:   0 1 2 3 4 5 6 7 8 9 10
y5:  . . . . . r . . . . .
y4:  . . . . > . < . . . .
y3:  . . . . F . F . . . .
y2:  . . . > . . . < . . .
y1:  . . > . . . . . < . .
y0:  b t . . . . . . . t b
```

- **Bewertung:** Wirkung hoch, Aufwand niedrig (nur Daten; `mukuri` neu in `profiles.ts`).

### T03 Aufgebogene Ecken (Sumi-zori) als Nachlauf auf dem Traufring

Japanische Traufen biegen sich zu den Ecken hoch. Diese Biegung wurde im Lauf der Epochen stärker, am stärksten bei Zen-Bauten [Q9]. CozyGameBuilds setzt an die Spitzen Kopfüber-Treppen [Q56]. Eine verlässliche Blockfolge gibt es nicht, das gilt seit `daecher.md`. Diese Regel ist eine **Einschätzung und im Spiel zu prüfen**.

**Gilt für** `hip`, Irimoya (Walmteil), `skirt` und `pyramid` mit Überstand ≥ 2.

**Regel** (L = Überstand, c = Abstand der Ring-0-Spalte zur Ecke)
- c ≥ L: wie gehabt `slab[bottom]`.
- 2 ≤ c < L: `roofTrim slab[top]`, also 1 hb höher.
- c = 1 und c = 0: `roofTrim stairs[half=bottom, facing=außen]` als Lippe, die hohe Seite außen. Die Ecktreppe zeigt zur längeren Traufe. Der Auflöser lässt sie gerade, weil vor ihr Luft ist.
- Unter c = 0: `lantern[hanging=true]`, bei Tempeln an einer `iron_chain[axis=y]`. Halt gibt die volle Unterseite der Treppe.

**Draufsicht NO-Ecke, L = 3.** N und E sind Treppen nach Nord bzw. Ost.
```
x:        X1-4 X1-3 X1-2 X1-1 X1
z=Z0   :   b    b    t    N    N
z=Z0+1 :   t    t    t    t    E
z=Z0+2 :   …    …    …    t    t
z=Z0+3 :   …    …    …    t    b
```

**Ansicht Nord.** ▄ = untere Hälfte, ▀ = obere Hälfte, ▟ = Lippe, L = Laterne.
```
x:      X1-4 X1-3 X1-2 X1-1 X1
y+½..1:  .    .    ▀    ▟    ▟
y..½  :  ▄    ▄    .    ▄    ▄
y-1   :                      L
```

- **Bewertung:** Wirkung hoch (das ist die Silhouette), Aufwand mittel (Nachlauf in `buildRoofs`).
- **Stile:** japanese, cherry, fantasy.
- **Quellen:** [Q9][Q55][Q56].

### T04 Konsolen unter der Traufe (Tokyō light)

Tokyō sind Konsolen aus Kragarmen und Lagerblöcken auf dem Pfosten [Q12]. Wir bauen sie zwei- oder dreistufig aus Kopfüber-Treppen, mit derselben Mechanik wie die Jetty-Konsolen in `walls.ts`.

**Rhythmus**
- An jedem Pfosten eine Konsole.
- Beim Tempel zusätzlich eine in Feldmitte als `beam trapdoor[half=top]`.
- Dazwischen eine durchgehende Untersicht aus `soffit slab[top]`.

**Schnitt an der Pfostenachse, W = Wandoberkante.**
- P = frame log[axis=y], B = beam log, K = beam stairs[half=top, facing=Wand]
- U = soffit slab[top], R = Dachringe, S = Shoji/Wand
```
d:      -1  0  +1  +2  +3  +4
y=W+1:   .  .   R   R   R   R
y=W  :   .  B   B   K   K   U     (Stufe 2 nur beim Tempel)
y=W-1:   .  S   P   K   .   .
```

- **Bewertung:** Wirkung mittel bis hoch, Aufwand niedrig.
- **Stile:** japanese (Tempel, Pagode), cherry (Pavillon), nordic.
- **Quellen:** [Q12]. Die Blockfolge ist eine Einschätzung.

### T05 First mit Onigawara-Enden

Onigawara sind Zierziegel an den Enden von Haupt- und Gratfirsten [Q13]. Der Ziegelfirst wird aus Noshigawara geschichtet [Q37]. Er ist deshalb hoch und schmal.

**Regel**
- Firstreihe als `deepslate_tile_wall`. Mauern verbinden sich zu einer schmalen Linie.
- Am Ende `chiseled_deepslate` (E).
- Darauf `stairs[half=bottom, facing=außen]` (O).
- Beim Irimoya zusätzlich je ein Ende auf den 4 Gratfirsten (Einschätzung).

**Ansicht Längsseite, linkes Ende.**
```
x:     e  e+1 e+2 …
y_r+1: O   .   .
y_r  : E   W   W  …
```

- **Bewertung:** Wirkung mittel, Aufwand niedrig (neuer `RidgeStyle:'wall_ends'`).

### T06 Chigi und Katsuogi (nur Schrein)

Schreine tragen Chigi (gegabelte Giebelaufsätze) und Katsuogi (Querhölzer auf dem First) [Q23].

**Regel**
- **Chigi:** Beide Ortgang-Treppenlinien laufen 2 Stufen über den Scheitel hinaus. So entsteht ein V.
- **Katsuogi:** `stripped_spruce_log` quer zum First, alle 2 Blöcke, in ungerader Zahl 3, 5 oder 7. Zu den Enden 1–2 Blöcke Abstand (Einschätzung).

**Ansicht Süd, First bei x = 6.** ◢ = facing Ost, ◣ = facing West, T = Giebelfüllung.
```
x:      3 4 5 6 7 8 9
y_r+2:  . ◣ . . . ◢ .
y_r+1:  . . ◣ . ◢ . .
y_r  :  . . ◢ R ◣ . .
y_r-1:  . ◢ . T . ◣ .
```

- **Bewertung:** Wirkung hoch für Schreine, Aufwand niedrig.

### T07 Pagode aus gestapelten Geschossen

Grundlagen:
- 3 oder 5 Geschosse [Q20][Q27].
- Die Traufkanten sind gerade, jede höhere Kante ist kürzer. Je größer der Rücksprung (teigen), desto standfester wirkt die Pagode [Q20].
- Oben ein Hōgyō, dessen Spitze auf dem Roban (Basis) steht [Q18].
- Ein Mokoshi ist eine Schürze zwischen den Geschossen und täuscht weitere Geschosse vor [Q19].

Ein Spieleguide nennt: Basis 12–16, 4–5 Geschosse, je 20–25 % kleiner, Überstand 2–3, Wand 8–10 hoch [Q54]. **Korrektur:** 8–10 Blöcke Wand je Geschoss ist zu viel. An echten Pagoden dominieren die Dächer (Einschätzung).

**Generatorregel**
- **Geschosse:** 3 bei `small` und `medium`, 5 bei `large` und `huge`.
- **Grundriss:** quadratisch und ungerade, 9, 11, 13 oder 15.
- **Rücksprung:** 1 Block je Seite und Geschoss. Bei 5 Geschossen abwechselnd 0 und 1. Das oberste Geschoss ist etwa 0,55–0,65 so breit wie das unterste (Einschätzung).
- **Wandhöhe:** 4 im ersten Geschoss, darüber 3.
- **Dachringe:** je Geschoss ein `skirt` mit `rings` = Überstand + 1, Δ = 1,1,2. Überstand 3 unten, 2 oben.
- Ecken nach T03, Konsolen nach T04. Oben `pyramid` mit Δ = 1,2,2.
- **Sōrin (Spitze):** `chiseled_deepslate`, dann 3–5 Mal abwechselnd `iron_chain[axis=y]` und `polished_blackstone_wall`, oben `waxed_lightning_rod[facing=up]`. Etwa 1/4 bis 1/3 der Gesamthöhe (Einschätzung).

**Schnitt, 3 Geschosse, Grundriss 11/9/7.**
```
y29-24:              |                Sōrin
y23-21:           ^^^^^^^             Hōgyō
y20-18:            WWWWW              Geschoss 3 (7, Höhe 3)
y17-16:        ───────────            Ring (Überstand 2)
y15-13:          WWWWWWW              Geschoss 2 (9, Höhe 3)
y12-11:      ───────────────          Ring (Überstand 3)
y10-6:        WWWWWWWWWWW             Geschoss 1 (11, Höhe 4)
y5-1:     Kidan, Boden, Engawa-Rand
```

- **Bewertung:** Wirkung hoch, Aufwand hoch (neue Masse).
- **Stile:** japanese, cherry.
- **Quellen:** [Q18][Q19][Q20][Q27][Q54][Q55].

### T08 Karahafu-Eingang

Ein Karahafu ist ein geschwungenes Giebelbrett: in der Mitte konvex, zu den Seiten konkav, an den Enden flach oder hochgebogen. Es sitzt über Tempeleingängen, an Toren und an Vordächern über Stufen [Q14].

**Ansicht Nord, Breite 7, d = +1 bis +3.**
- t = roofTrim slab[top]
- ◢/◣ = Treppen zur Mitte hoch, an den Enden nach außen hoch
- b = slab[bottom], ┐ = soffit stairs[half=top]
```
x:    0 1 2 3 4 5 6
y+1:  . . ◢ t ◣ . .
y  :  ◣ b t . t b ◢
y-1:  . ┐ ┐ ┐ ┐ ┐ .
```

- **Einsatz:** als neue Türvorlage T11 für Tempel, Ryokan und Burg.
- **Bewertung:** Wirkung mittel, Aufwand mittel.
- **Quellen:** [Q14]. Die Blockfolge ist eine Einschätzung.

### T09 Wandsystem Shinkabe

Pfosten und Riegel tragen das große, geschwungene Dach. Die Wände sind dünn, oft beweglich und nie tragend [Q4]. Die deutsche Wikipedia nennt das ein „relativ flexibles Holzfachwerk“ auf einem Tatami-Raster [Q60].

Maße aus der Quelle:
- Pfostenabstand etwa 1,82 m [Q22].
- Shoji haben ein Koshi-Brett. Ist es höher als 60 cm (etwa 1/3 der Höhe), heißt die Wand *koshi-daka* [Q22].

Füllung bei d = 0 und Pfosten bei d = +1: Das kann die Engine schon.

**Regel**
- **Keine Kopfbänder.**
- **Takt:** Feld 2, Mittelfeld 3. [Q58] setzt Pfosten alle 3 Blöcke.
- **Vier Reihen je Geschoss:** Koshi, zwei Reihen Shoji oder Putz, Kokabe.

**Ansicht Süd, ein Feld, Geschosshöhe 5.**
- P = frame log[axis=y], d = +1
- D = beam log, Schwelle
- k = `spruce_planks` (Koshi), d = 0
- S = `white_stained_glass_pane`, d = 0
- K = `calcite` (Kokabe), dazu in d = +1 auf y5 das Nageshi n = `dark_oak_trapdoor[facing=south, half=bottom, open=false]`
- B = Keta (Traufbalken)
```
x:    P  0  1  P
y6:   B  B  B  B
y5:   P  K  K  P   (+ n in d=+1)
y4:   P  S  S  P
y3:   P  S  S  P
y2:   P  k  k  P
y1:   D  D  D  D
```

**Kōshi (Holzgitter zur Straße)**
- Kōshi sind Straßengitter, deren Muster das Gewerbe zeigte, auch vorspringend als Degōshi [Q6][Q7].
- Rahmenzaun in d = +1 vor S. Er verbindet sich zu einem Gitter.
- Für senkrechte Latten in jede Spalte `iron_chain[axis=y]`. Ketten verbinden sich nicht (Einschätzung).

**Amado (Sturmläden)**
- Sie sitzen außen vor der Engawa [Q21].
- `spruce_trapdoor[open=true, facing=außen]` in d = +1. Im Winter sind 30–50 % der Felder geschlossen (Einschätzung).

- **Bewertung:** Wirkung hoch, Aufwand niedrig.
- **Quellen:** [Q4][Q6][Q7][Q21][Q22][Q58][Q60].

### T10 Aufgeständerter Boden, Engawa und Kidan

Fakten aus den Quellen:
- Der Wohnboden liegt etwa 50 cm über dem Lehmboden [Q5].
- Die Engawa ist 1–1,3 m breit, in Tempeln über 3 m. Sie liegt außerhalb der Shoji und innerhalb der Amado. Ihre Pfosten stehen auf halb eingegrabenen Steinen [Q21].
- Ein Kidan ist ein Steinpodest mit einer Treppe in der Mitte jeder Seite [Q17].
- [Q58] lässt die Plattform 2 Blöcke über die Wand hinausragen.

**Wohnhaus**
- Sockel: 1 Reihe Naturstein nur unter der Wand, **keine Treppenschürze**.
- Engawa an 1–3 Seiten. Belag `floor slab[top]` auf Bodenhöhe, darunter eine Schattenfuge.
- Breite: 1 bei `small`, 2 bei `medium`/`large`, 3 beim Tempel in `huge`.
- Bei Sockel 2: Außenpfosten alle 2–3 Blöcke auf `polished_andesite`.
- Trittstein vor dem Eingang aus `polished_andesite` oder `tuff`.

**Tempel**
- Kidan 1–2 Blöcke aus `smooth_stone`.
- Mittige Treppe, 3 breit, Wangen aus `andesite_wall`.
- Geländer (Kōran) aus Zäunen der Rahmenrolle.

**Schnitt, Sockel 1, Geschosshöhe 5.** E = `spruce_slab[type=top]`, p = `spruce_fence`, F = `polished_andesite`, ┐ = Untersicht, R = Dach.
```
d:     -1   0   +1   +2   +3   +4
y7:     .   .   R    R    R    R     (Traufe bei d=+4)
y6:     B   B   B    ┐    ┐    .
y2-5:   .  k/S/K P   .    p    .
y1:   Boden F   F    E    E    .     (untere Hälfte frei = Schattenfuge)
y0:     G   G   G    G    F    G
```

- **Bewertung:** Wirkung hoch, Aufwand mittel (neues Bauteil `engawa`, Sockelart je Stil).
- **Stile:** japanese, cherry, nordic.

### T11 Giebel (Tsuma) und Ziergaube

**Giebel**
- Wohnhaus: `calcite` mit sichtbarem Mittelpfosten und 1–2 waagrechten Riegeln aus `beam`, ohne Diagonalen.
- Tempel: dunkles Holz.
- `gableRecess:true`, damit ein Schattenstrich entsteht.
- Unter dem Scheitel ein Zaun als Kegyo-Andeutung (Einschätzung).

**Chidorihafu**
- Eine dreieckige Ziergaube ohne Fenster, rein dekorativ [Q15].
- Umsetzung als `dormer` ohne Fenster mit konkavem Profil.

- **Bewertung:** Wirkung mittel, Aufwand niedrig.

### T12 Hisashi zwischen den Geschossen (Machiya, Ryokan)

Fakten aus den Quellen:
- Machiya haben 1, 1½ oder 2 Geschosse [Q6].
- Das Obergeschoss ist niedrig und aus Lehm, mit Mushiko-mado (vergitterten Schlitzfenstern) [Q7].
- Die Traufe ist schnurgerade (Ichimonji) [Q7].

**Regel**
- Über dem Erdgeschoss an der Straße ein Pultdachrock: `skirt(rings=2)` nur an dieser Seite oder als `shed`.
- Obergeschoss: Geschosshöhe 3–4, um 0–1 Block zurückgesetzt.
- Beim Ryokan läuft der Rock an jedem Geschoss um (Einschätzung).

**Ansicht Nord, Machiya, Breite 7.**
- r = roof stairs, e = roof slab[bottom]
- U = `calcite`, M = W19 (`iron_bars`)
- L = Kōshi, P = Pfosten, D = Tür
```
y9:  r r r r r r r
y8:  U U M M M U U
y7:  U U U U U U U
y6:  e e e e e e e    (d=+1..+2)
y5:  P L L P D D P
y4:  P L L P D D P
y3:  P L L P . . P
```

- **Bewertung:** Wirkung hoch für Machiya, Aufwand mittel.

### T13 Steinlaternen (Tōrō)

Eine Steinlaterne hat von unten nach oben: Kiso (Basis), Sao (Schaft), Chūdai (Plattform), Hibukuro (Feuerkammer), Kasa (Dach), Hōju (Knauf) [Q28].
- Kasuga-dōrō sind Schaftlaternen und häufig an Tempeln und Schreinen.
- Yukimi-dōrō haben Beine und stehen nur in Gärten, am Wasser.
- Oki-dōrō stehen lose auf [Q28].

**S: Oki-dōrō, 1×1.**
```
y3: andesite_slab[type=bottom]
y2: lantern
y1: andesite_wall
```

**M: Kasuga-dōrō, Kasa 3×3, Ansicht Süd.**
- A = `polished_andesite`, W = `andesite_wall`
- t = `polished_andesite_slab[type=top]`, L = `lantern`
- ◢/◣ = `andesite_stairs[half=bottom]` zur Mitte, an den Ecken `andesite_slab[type=bottom]`
```
x:   0 1 2
y6:  . W .
y5:  ◢ A ◣
y4:  . L .
y3:  t A t
y2:  . W .
y1:  . A .
```

**Yukimi-dōrō, 3×3.** Beine W an den 4 Diagonalecken, h = `lantern[hanging=true]`.
```
x:   0 1 2
y4:  . W .
y3:  t A t
y2:  W h W
y1:  W . W
```

**Winter**
- Statt h kommt in die Mitte von y1 ein `polished_andesite_slab[type=top]`, darauf `white_candle[candles=2, lit=true]` (Licht 6 [Q50]).
- Auf die Kasa `snow[layers=2]`.
- Eine Laterne mit Licht 15 würde den Schnee schmelzen: Schnee schmilzt ab Licht 12 und liegt nur auf voller Oberseite [Q48][Q51].

**Platzierung (Einschätzung)**
- Kasuga paarweise am Eingang, Yukimi einzeln an Wasser oder Weg.
- Höchstens 1 je etwa 40 m². Ausnahme: der Tempelzugang, dort alle 4–6 Blöcke.
- Ersetzt bei `japanese` und `cherry` die Laternenmasten (`landscape.ts:119–140`).

- **Bewertung:** Wirkung hoch, Aufwand niedrig (Vorlagen als Daten).

### T14 Torii (nur vor Schreinen)

Ein Torii besteht aus:
- Hashira (Pfosten)
- Kasagi (oberer Balken)
- Shimaki (Balken darunter)
- Nuki (Verbindungsbalken)
- Gakuzuka (Mittelstrebe mit Tafel)
- Nemaki oder Daiishi (Fuß)

Formen und Farben [Q29]:
- Myōjin: geschwungener Kasagi, die häufigste Form.
- Shinmei: gerade, oft unbemalt.
- Bemalung, wenn vorhanden: zinnober, dazu Kasagi und Nemaki schwarz.

**Myōjin, Ansicht Süd, Breite 9, Höhe 6.**
- E = `polished_blackstone_stairs[half=bottom]`, links facing West, rechts facing Ost
- k = `polished_blackstone_slab[type=bottom]`
- S und N = `stripped_mangrove_log[axis=x]`
- G = `dark_oak_planks` (Tafel)
- P = `stripped_mangrove_log[axis=y]`
- K = `polished_blackstone` (Nemaki)
```
x:   0 1 2 3 4 5 6 7 8
y6:  E k k k k k k k E
y5:  . S S S S S S S .
y4:  . . P . G . P . .
y3:  . N N N N N N N .
y2:  . . P . . . P . .
y1:  . . K . . . K . .
```

**Shinmei-Variante:** alles aus `stripped_spruce_log`, gerade, ohne Shimaki, der Nuki nur zwischen den Pfosten.

**Regeln**
- Steht auf der Wegachse, 4–8 Blöcke vor dem Schrein. Danach 1 Laternenpaar.
- **Nie vor Wohnhaus, Teehaus oder Cottage**, denn Torii markieren Schreine [Q29].
- Shimenawa (Strohseil an Torii und Bäumen [Q33]) als Reihe `hay_block[axis=x]` unter dem Nuki. Für die Shide (Papierstreifen) bräuchte man ein Banner: nicht in der Registry und eine Block-Entity.

- **Bewertung:** Wirkung hoch, Aufwand niedrig.
- **Quellen:** [Q29][Q33][Q56].

### T15 Zäune und Mauern

Ersetzen die Laubhecke bei japanese und cherry. Bei cherry höchstens eine niedrige `bamboo_fence`.

- **Yotsume-gaki** (offener Gitterzaun): `bamboo_fence`, 2 hoch.
- **Kenninji-gaki** (dichter Sichtschutz):
  - `bamboo_block[axis=y]`, 2 hoch.
  - Alle 4 Blöcke `stripped_bamboo_block` als Pfosten.
  - Oben `bamboo_mosaic_slab[type=bottom]`.
- **Tamagaki** (Schreinzaun) [Q23]: `mangrove_fence` mit Pfosten aus `stripped_mangrove_log` alle 4 Blöcke.
- **Tsuiji-bei** (Lehmmauer mit Ziegeldach), Schnitt quer:
  - b = `deepslate_tile_slab[bottom]`
  - ◢/◣ = `deepslate_tile_stairs[half=bottom]` zur Mitte
  - F = `polished_deepslate`, C = `calcite`, T = `tuff`
  ```
  d:   -1  0  +1
  y3:   .  b   .
  y2:   ◢  F   ◣
  y1:   .  C   .
  y0:   .  T   .
  ```

- **Bewertung:** Wirkung mittel bis hoch, Aufwand niedrig.
- **Quellen:** Bambusgärten [Q57][Q58]. Die Zaunformen selbst sind eine Einschätzung.

### T16 Der schöne Kirschbaum (Kern von `cherry`)

**Vanilla-Werte [Q38]**
- Stamm `cherry_log[axis=y]`, Grundhöhe 7, plus 0–1.
- 1, 2 oder 3 Äste mit gleicher Wahrscheinlichkeit. Astlänge 2–4.
- Ast beginnt 3–4 unter der Spitze und endet 0–1 darunter.
- Krone: Radius 4, Höhe 5, `wide_bottom_layer_hole_chance` und `corner_hole_chance` je 0,25.
- `hanging_leaves_chance` 0,1667, `hanging_leaves_extension_chance` 0,333.

**Weitere Spielfakten**
- Erlaubte Bereiche: Astlänge 2–16, Kronenhöhe 4–16 [Q39].
- Äste verbinden sich auch diagonal, mehrere Kronen sind möglich [Q40].
- Kirschlaub wird nicht vom Biom eingefärbt, bei Schnee nicht weiß und lässt Blütenpartikel fallen [Q41].

**Natur als Vorbild**
- Kurzer Stamm, dichte, oft breite Krone [Q35].
- Somei-yoshino: 5–12 m hoch, weiß bis zartrosa, blüht vor dem Laub [Q36].
- Die Rinde ist kastanienbraun mit Querstreifen [Q35]. Dazu passt `cherry_log` mit L\* 15,8.

**Generatorregel (Einschätzung auf Vanilla-Basis)**
- **Größen:** S = Höhe 6–7, Krone Ø 7–9. M = 8–10, Ø 11–13, 2–3 Kronen. L = 11–14, Ø 15–19, 3–5 Kronen, Stamm bis 1/3 der Höhe 2×2.
- **Kronenform:** etwa 1,5-mal so breit wie hoch.
- **Stamm:** alle 3–4 Blöcke um 1 versetzt.
- **Äste:** 2–4 Stück ab 55–70 % der Höhe, 90–120° voneinander. 1–2 Blöcke waagrecht, dann +1 nach oben, diagonal über die Kante verbunden. Ein Ast ist 1–2 Blöcke länger.
- **Holzblöcke:** in Biegungen und waagrechten Teilen `cherry_wood`, `cherry_log` nur senkrecht.
- **Laub:** Je Astende ein Polster mit Schichtradien von unten r−1, r, r, r−1, r−2. Ecken und unterer Rand je 25 % Löcher.
  - Unter dem Rand Hängelaub: 1/6 für ein Hängeblatt, 1/3 für ein zweites [Q38].
  - Die Polster überlappen 1–2 Blöcke.
  - An der Unterseite 15–25 % frei lassen, damit Holz sichtbar bleibt.
- **Boden:** `pink_petals` in der Kronenprojektion, 60 % Dichte, `flower_amount` 2–4, `facing` zufällig. 1–2 Blöcke um den Rand 25 % Dichte. Nur auf erlaubtem Untergrund [Q43].
- **Platzierung:**
  - Gruppen zu 1, 3 oder 5, nie mittig vor der Fassade.
  - Mindestens 1 Block Abstand zu Traufe und Dach.
  - 1 Baum je 60–100 m².
  - Bei `cherry` ab Detailgrad 2 immer mindestens 1 Baum.
- **Shidare-zakura (Hängekirsche, Sorten nach [Q35]):** Höhe 9–11, Kuppelkrone mit r = 3–4. An 50–70 % der Randzellen hängen Laubstränge 2–5 Blöcke nach unten, bis 1–2 Blöcke über dem Boden.

**Seitenansicht, M, Höhe 10, Krone Ø 13.**
- L = `cherry_log`, W = `cherry_wood`, # = `cherry_leaves`
- h = Hängelaub, p = `pink_petals`, G = `grass_block`
```
x:    0 1 2 3 4 5 6 7 8 9 10 11 12
y10:  . . . . . # # # . . .  .  .
y9:   . . . # # # # # # # .  .  .
y8:   . # # # # # # # # # #  #  .
y7:   # # # # # W # # # # #  #  #
y6:   # # # W # # . # # W #  #  #
y5:   . h # . W . . . W . #  h  .
y4:   . . h . . W . W . . .  .  .
y3:   . . . . . . L . . . .  .  .
y2:   . . . . . . L . . . .  .  .
y1:   . . . . . L . . . . .  .  .
y0:   p p . p p G p p . p p  .  .
```

**Draufsicht, eine Laubschicht mit r = 3.** o = Ecke, mit 25 % Wahrscheinlichkeit leer.
```
o # # # # # o
# # # # # # #
# # # W # # #
# # # # # # #
o # # # # # o
```

- **Bewertung:** Wirkung sehr hoch, Aufwand mittel.
- **Stile:** cherry, japanese, fantasy.

### T17 Kiefer, Azalee und Bambus

Japanische Gärtner schneiden Pflanzen streng in Form. Immergrüne sind die „Knochen des Gartens“ [Q30].

- **Niwaki-Kiefer:**
  - Stamm `spruce_log`, 4–6 hoch, mit 1–2 Versätzen.
  - 3–5 flache Laubpolster aus `spruce_leaves`, je 1 hoch und mit r = 1–2, Ecken zu 50 % leer, in der Höhe versetzt (Einschätzung).
- **Tsutsuji-Karikomi** (formgeschnittene Azalee):
  - Halbkugeln aus `azalea_leaves` mit 10–20 % `flowering_azalea_leaves`, Ø 2–3.
  - In Dreiergruppen am Hausfuß, statt der Blumenbeete.
- **Bambus:**
  - Höhe 4–9 (Spielmaximum 12–16 [Q45]), `age=1`, die oberen 2 Blöcke `leaves=large`, darunter `small`.
  - Nur auf Gras, Erde, Moos, Kies oder Sand [Q45].
  - Dichte 40–60 % auf 3×5 bis 5×7.
  - `bamboo` ist nicht in der Registry.

### T18 Wasser, Brücken, Trittsteine

Japanische Gärten haben immer Wasser, echtes oder symbolisches aus Sand. Brücken sind aus Stein, Holz oder Erde [Q30].

- **Teich:**
  - `water` ist nicht in der Registry.
  - 1–2 tief, unregelmäßiger Rand aus `tuff`, `andesite`, `moss_block`.
  - Im Winter `ice` statt `packed_ice`.
  - `lily_pad` ist nicht in der Registry.
- **Bogenbrücke (Taikobashi):**
  - Breite 3, Decke über 9 Spalten mit Höhen 1,2,4,5,6,5,4,2,1 hb.
  - Gebaut mit `columnPieces` aus `mangrove` oder `dark_oak`.
  - Geländer `mangrove_fence`, Laternen an den 4 Enden (Einschätzung).
- **Plankenbrücke:** Zickzack aus `spruce_slab[top]`. [Q58] baut sie aus Lagerfeuern und Falltüren.
- **Trittsteine:**
  - `polished_andesite`, `tuff` oder `smooth_stone` bündig auf y0.
  - Je ein Gras oder Moos dazwischen, alle 1–2 Steine 1 Block versetzt.
  - Ersetzt den 3 breiten Weg. Nur der Tempel bekommt einen geraden Plattenweg (Nobedan).

```
Draufsicht, T = Trittstein y1, s = bündig y0
z0: . . T . .
z2: . . s . .
z3: . . . s .
z5: . . s . .
z6: . s . . .
```

### T19 Zen-Garten (Karesansui)

Regeln aus der Quelle [Q31]:
- Vier Harkmuster: Linie, Welle, Spirale, Karo.
- Steine in ungerader Zahl, oft als Dreiergruppe: einer hoch, zwei niedrig.
- Nie in einer Linie, nie symmetrisch.
- Moos steht für Land.
- Man betrachtet den Garten von einem festen Punkt auf der Veranda.

**Generator**
- Feld 7×9 bis 11×15 vor der Engawa.
- Belag: `gravel` (nicht in der Registry). Ersatz: `calcite`.
- Harklinien: jede zweite Reihe aus `light_gray_concrete_powder` (nicht in der Registry) oder `smooth_quartz` (Einschätzung).
- Um die Steingruppe 1–2 Ringe.
- Steine: `tuff` + `tuff_wall`, Nebensteine aus `andesite_stairs` und `andesite_slab`.
- Moosinsel, Einfassung aus `smooth_stone_slab`.

**Draufsicht.** C = calcite, L = Linie, R = Hauptstein, r = Nebenstein, M = Moos, E = Einfassung.
```
z0: E E E E E E E E E E E
z1: E C C C C C C C C C E
z2: E L L L L L L L L L E
z3: E C C L L L C C C C E
z4: E L L L R r L L M M E
z5: E C C L r L C C M C E
z6: E E E E E E E E E E E
```

- **Bewertung:** Wirkung mittel, Aufwand mittel.

### T20 Winter- und Jahreswechselschmuck mit Respekt

**Kadomatsu**
- Drei Bambusrohre, dazu Kiefer und Pflaume, mit Strohmatte gebunden. Paarweise am Tor, aufgestellt nach Weihnachten bis zum 7. Januar [Q32].
- Im Thema `christmas` heißt es daher „Winter- und Jahreswechselschmuck“.
- Skizze, je 2×1: B = `bamboo_block[axis=y]`, H = `hay_block`, l = `spruce_leaves`, r = `red_candle[lit=false]`.
```
y4:  B .
y3:  B B
y2:  B B l
y1:  H H l r
```

**Weitere Elemente**
- **Shimekazari** (Neujahrsschmuck an der Tür [Q33]): 3 × `hay_block[axis=x]` in d = +1 über der Tür.
- **Licht:**
  - Laterne an jeder Traufecke (T03), dazu `lantern[hanging=true]` an jedem zweiten Pfosten.
  - 2–4 Steinlaternen.
  - Im Kirschbaum höchstens 2 verborgene `pearlescent_froglight` oder `shroomlight` (Einschätzung).
- **Yukitsuri** (Stangen und Seile, die Bäume vor Schneelast schützen [Q34]): schräge Seile gehen nicht. Als Ersatz einen Stammblock der Kiefer durch `hay_block` ersetzen (Strohmanschette, Einschätzung).
- **Weg damit:** Woll-Geschenke, Weihnachtsbaum, Girlanden und Kränze an Tempeln, Schreinen und Torii. An Wohnhäusern nur auf ausdrücklichen Wunsch.

- **Bewertung:** Wirkung hoch, Aufwand niedrig bis mittel.

### T21 Fenster und Türen

| ID | Typ | Status | Regel |
|---|---|---|---|
| W15 / W15b / W15c | Shoji | vorhanden | Unter Engawa und tiefer Traufe **nur W15c** (ohne Vordach und Gitter). W15 nur an Giebelseiten. |
| W08 | Marumado (Rundfenster) | Stil ergänzen | Mit `white_stained_glass`, ≤ 1 je Fassade, Teehaus und Tempel |
| W07 | Katōmado | Stil ergänzen | Nur Zen-Tempel (Einschätzung) |
| W02 | Renji-mado (Lattenfenster) | Stil ergänzen | Teehaus, Rahmenzaun davor |
| **W19** | Mushiko-mado | neu | 2–3 × 1, d = 0 `iron_bars` in `upperWall` [Q6][Q7] |
| **W20** | Degōshi | neu | Erdgeschoss 3–5 × 2, d = 0 Glas, d = +1 Rahmenzaun, d = +1..+2 Pultdach, unten Bank aus `frame slab[top]` [Q6][Q7] |
| T09 / T09b | Genkan | vorhanden | Wohnhaus, Ryokan |
| T02 | Ranma (Oberlicht) | Stil ergänzen | Mit Rahmenzaun davor; Tempel und Ryokan |
| T01b | Doppeltür | Stil ergänzen | Tempeltür ohne Bogen |
| **T11** | Karahafu-Eingang | neu | T08 + Laternen; Tempel, Ryokan, Burg [Q14] |
| **T12** | Nijiriguchi (Kriechtür) | neu | 1×1, `bamboo_trapdoor[open=true]`, Trittstein davor, **zusätzlich** zu einer normalen Tür (wegen Lint) [Q25] |

Noren (Türvorhänge) bräuchten Banner. Das ist eine Block-Entity und steht nicht in der Registry.

### T22 Kirschblüten-Details

- **Pavillon nach [Q56]:** `cherry_stairs`, `cherry_slab`, `cherry_log`, Untersicht `pink_carpet`, Laterne an der Spitze. Für uns: Dachfläche dunkel, Kirschholz nur an Kante und Untersicht (Einschätzung).
- `potted_cherry_sapling`: höchstens 2 auf Engawa oder Stufe.
- `pink_petals` nur unter Bäumen und am Wegrand mit `flower_amount` 1.
- Statt Tulpen (nicht japanisch, Einschätzung): `lily_of_the_valley`, `azalea`, `fern`.

---

## (a) Kennzeichen

**Japanisch, real**
- **Allgemein:**
  - Holz. Pfosten und Riegel tragen ein großes, sanft geschwungenes Dach.
  - Eine tiefe Traufe deckt die Veranda.
  - Shoji und Fusuma (Schiebewände aus Papier bzw. Karton), modulares Ken- und Tatami-Raster [Q4][Q22][Q60].
  - Boden erhöht [Q5].
- **Minka:**
  - Lokale Materialien, Lehmboden, Strohdach.
  - Bauernhäuser meist Yosemune, auch Irimoya und Gasshō.
  - Steil wegen Regen und Schnee [Q5].
- **Machiya:**
  - 5,4–6 m breit, 20 m tief.
  - 1–2 Geschosse, Ziegeldach, meist Kirizuma.
  - Unten Gitter, oben Lehmwand mit Mushiko-mado [Q6][Q7].
- **Tempel:** Ziegeldach, Konsolen, Irimoya oder Yosemune, Steinpodest, Traufen zu den Ecken immer stärker gebogen [Q4][Q9][Q12][Q17].
- **Schrein:**
  - Honden und Haiden. Häufigster Stil ist Nagare, meist 1 oder 3 Ken breit.
  - Chigi, Katsuogi, Zinnober, Komainu, Tamagaki, Shimenawa [Q23][Q24][Q33].
- **Pagode:** 3 oder 5 Geschosse, nach oben kleiner, gerade Traufkanten [Q20].
- **Teehaus:** 4,5 Tatami, Kriechtür, kleine Shoji ohne Ausblick, Tokonoma, Gartenweg Roji [Q25].
- **Ryokan:** Tatami, Schiebetüren, Genkan, Veranden [Q26].

**Japanisch in Minecraft**
- Weiße Felder zwischen dunklen Pfosten, dunkles Dach mit großem Überstand, Laternen, Bambus, Steinwege [Q57][Q58].
- Neue Techniken aus den Quellen:
  - Wand aus abwechselnd normalen und Kopfüber-Treppen [Q57].
  - Plattform 2 Blöcke über die Wand, Pfosten alle 3, Wand 5 hoch, Fenster aus `jungle_trapdoor` [Q58].
  - Pagodendach: Kante andersfarbig, oberer Rand ringsum, Aufsatz am First, je Geschoss wiederholt [Q55].
  - Tempeldach mit Kopfüber-Spitzen, Untersicht `stripped_spruce_log`, First `chiseled_deepslate` [Q56].

**Kirschblüte**
- Ein Minecraft-Stil aus dem Kirschholz-Set: Bäume mit waagrechten Ästen und mehreren Kronen, fallende Blütenpartikel, `pink_petals` am Boden [Q40][Q42].
- Japanische Motive als Grundlage, aber kein eigener realer Baustil.

## (b) Untervarianten

**Japanisch**

| Variante | Erkennungsmerkmale | Dach | Wand | Sockel |
|---|---|---|---|---|
| Minka [Q5] | breit und niedrig, Strohdach, kein Kamin | Yosemune oder Irimoya, Vollblock-Traufe + Δ 4, Überstand 2–3 | `packed_mud` oder Putz, dunkles Holz | 1, Engawa vorn |
| Machiya [Q6][Q7] | schmal und tief, Reihenhaus, gerade Traufe, Hisashi, Gitter | Kirizuma (Traufe zur Straße), Δ 1, Überstand 1–2 | Erdgeschoss Holz und Gitter, Obergeschoss Putz, niedrig | 0–1 |
| Tempel [Q4][Q9][Q12][Q17] | Podest, Dach ≥ Wandhöhe, Konsolen, breites Mittelfeld | Irimoya `bell`, Überstand 3–4, T03, T05 | weißer Putz, Holz natur oder zinnober | Kidan 1–2 + 1 |
| Schrein [Q23][Q24][Q29] | klein, Torii davor, Chigi und Katsuogi | Nagare oder Kirizuma, Δ 1,2,2 | Holzbretter | 1–2 + Treppe |
| Pagode [Q18–Q20] | 3 oder 5 Dachringe, Spitze | `skirt` + `pyramid` | weiß und Holz | Kidan 1 |
| Teehaus [Q16][Q25] | winzig, asymmetrisch, Kriechtür, Rundfenster | Mukuri oder kleines Irimoya | Lehm oder Bambus | 1 |
| Ryokan [Q14][Q26] | 2 Geschosse, Hisashi ringsum, Karahafu-Eingang | Irimoya | Shoji-Bänder | 1 + Engawa |

**Kirschblüte**
- **Pavillon oder Teehaus:** Hōgyō oder Irimoya mit dunkler Fläche, unter 2–3 Bäumen.
- **Weiße Villa:** Palette C1, W15c, Engawa.
- **Cottage:** Palette C2, Satteldach `flared`, W03 und W05. Als einzige Variante mit Kamin und Läden.
- **Schrein im Kirschhain:** Palette C5, mit Torii.
- **Pastell:** Palette C4, nur 1.21.11.

## (c) Paletten nach unseren Rollen

Die Lints verlangen:
- ΔL\* zwischen Wand und Rahmen ≥ 15.
- Dach ≠ Wand.
- 3–5 Familien.
- Dach aus einem Material mit Treppen.

L\*-Werte stammen aus `textureStats.ts`.

```ts
// J1 japanese_minka – Familien tuff, packed_mud, dark_oak, bamboo, spruce. Wand 48 / Rahmen 20 → ΔL 28.
plinth:[['tuff',1]], wall:[['packed_mud',1]], upperWall:[['packed_mud',1]], infill:[['packed_mud',1]],
frame:[['dark_oak_log',1]], beam:[['dark_oak_log',1]], roof:[['bamboo_planks',2],['spruce_planks',1]],
roofTrim:[['spruce_planks',1]], ridge:[['dark_oak_planks',1]], soffit:[['spruce_planks',1]],
window:[['white_stained_glass',1]], shutter:[['spruce_planks',1]], door:[['spruce_planks',1]],
floor:[['spruce_planks',1]], path:[['tuff',1]], chimney:[['tuff',1]], accent:[['bamboo_block',1]]
// Besser mit bamboo_mosaic (fehlt im Katalog) und der Vollblock-Traufe aus T02.

// J2 japanese_machiya – andesite, spruce, white_terracotta, dark_oak, deepslate. Wand 38 / Rahmen 20 → ΔL 18
// (stripped_dark_oak_log mit 25 wäre zu nah: ΔL 13).
plinth:[['polished_andesite',1]], wall:[['spruce_planks',1]], upperWall:[['white_terracotta',1]], infill:[['spruce_planks',1]],
frame:[['dark_oak_log',1]], beam:[['dark_oak_log',1]], roof:[['deepslate_tiles',3],['polished_deepslate',1]],
roofTrim:[['polished_deepslate',1]], ridge:[['deepslate_bricks',1]], soffit:[['dark_oak_planks',1]],
window:[['white_stained_glass',1]], shutter:[['dark_oak_planks',1]], door:[['spruce_planks',1]],
floor:[['spruce_planks',1]], path:[['polished_andesite',1]], chimney:[['polished_andesite',1]], accent:[['red_terracotta',1]]

// J3 japanese_temple_vermilion (ersetzt japanese_temple) – stone, calcite, mangrove, deepslate. Wand 89 / Rahmen 31,5 → ΔL 58.
plinth:[['smooth_stone',2],['stone',1]], wall:[['calcite',1]], upperWall:[['calcite',1]], infill:[['calcite',1]],
frame:[['stripped_mangrove_log',1]], beam:[['stripped_mangrove_log',1]], roof:[['deepslate_tiles',1]],
roofTrim:[['polished_deepslate',1]], ridge:[['deepslate_bricks',1]], soffit:[['mangrove_planks',1]],
window:[['white_stained_glass',1]], shutter:[['mangrove_planks',1]], door:[['mangrove_planks',1]],
floor:[['dark_oak_planks',1]], path:[['smooth_stone',1]], chimney:[['stone',1]], accent:[['red_terracotta',3],['gold_block',1]]

// J4 japanese_zen (Nachfolger japanese_classic) – andesite, calcite, dark_oak, deepslate, spruce. Wand 89 / Rahmen 25 → ΔL 64.
plinth:[['polished_andesite',1]], wall:[['calcite',1]], upperWall:[['calcite',1]], infill:[['calcite',1]],
frame:[['stripped_dark_oak_log',2],['dark_oak_log',1]], beam:[['dark_oak_log',1]], roof:[['deepslate_tiles',1]],
roofTrim:[['polished_deepslate',1]], ridge:[['deepslate_bricks',1]], soffit:[['spruce_planks',1]],
window:[['white_stained_glass',1]], shutter:[['dark_oak_planks',1]], door:[['dark_oak_planks',1]],
floor:[['spruce_planks',1]], path:[['polished_andesite',1]], chimney:[['polished_andesite',1]], accent:[['waxed_oxidized_cut_copper',1]]

// J5 japanese_shrine_copper – andesite, spruce, calcite, dark_oak, copper. Wand 38 / Rahmen 20 → ΔL 18.
// Kupferdach als Einschätzung.
plinth:[['polished_andesite',1]], wall:[['spruce_planks',1]], upperWall:[['spruce_planks',1]], infill:[['calcite',1]],
frame:[['dark_oak_log',1]], beam:[['dark_oak_log',1]], roof:[['waxed_oxidized_cut_copper',1]],
roofTrim:[['waxed_oxidized_cut_copper',1]], ridge:[['waxed_oxidized_cut_copper',1]], soffit:[['spruce_planks',1]],
window:[['white_stained_glass',1]], shutter:[['spruce_planks',1]], door:[['spruce_planks',1]],
floor:[['spruce_planks',1]], path:[['polished_andesite',1]], chimney:[['polished_andesite',1]], accent:[['red_terracotta',1]]

// C1 cherry_white_slate (ersetzt cherry_white) – deepslate, calcite, cherry. Wand 89 / Rahmen 15,8 → ΔL 73.
plinth:[['polished_deepslate',1]], wall:[['calcite',1]], upperWall:[['calcite',1]], infill:[['calcite',1]],
frame:[['cherry_log',1]], beam:[['stripped_cherry_log',1]], roof:[['deepslate_tiles',1]],
roofTrim:[['cherry_planks',1]], ridge:[['polished_deepslate',1]], soffit:[['cherry_planks',1]],
window:[['white_stained_glass',1]], shutter:[['cherry_planks',1]], door:[['cherry_planks',1]],
floor:[['cherry_planks',1]], path:[['polished_andesite',1]], chimney:[['polished_deepslate',1]], accent:[['pink_stained_glass',1]]

// C2 cherry_planks_blackstone (ersetzt cherry_slate) – stone, cherry, calcite, blackstone. Wand 77 / Rahmen 15,8 → ΔL 61.
// Farbton Schwarzstein 314–334° passt zur Kirschrinde (345°).
plinth:[['stone_bricks',1]], wall:[['cherry_planks',1]], upperWall:[['calcite',1]], infill:[['calcite',1]],
frame:[['cherry_log',1]], beam:[['cherry_log',1]], roof:[['polished_blackstone_bricks',1]],
roofTrim:[['polished_blackstone',1]], ridge:[['polished_blackstone',1]], soffit:[['cherry_planks',1]],
window:[['white_stained_glass',1]], shutter:[['cherry_planks',1]], door:[['cherry_planks',1]],
floor:[['cherry_planks',1]], path:[['stone_bricks',1]], chimney:[['stone_bricks',1]], accent:[['pink_stained_glass',1]]

// C3 cherry_teahouse_bamboo – andesite, packed_mud, cherry, bamboo, spruce. Wand 48 / Rahmen 15,8 → ΔL 32.
plinth:[['polished_andesite',1]], wall:[['packed_mud',1]], upperWall:[['packed_mud',1]], infill:[['packed_mud',1]],
frame:[['cherry_log',1]], beam:[['stripped_cherry_log',1]], roof:[['bamboo_planks',1]],
roofTrim:[['spruce_planks',1]], ridge:[['bamboo_block',1]], soffit:[['bamboo_planks',1]],
window:[['white_stained_glass',1]], shutter:[['bamboo_planks',1]], door:[['bamboo_planks',1]],
floor:[['bamboo_planks',1]], path:[['polished_andesite',1]], chimney:[['polished_andesite',1]], accent:[['moss_block',1]]

// C4 cherry_pale – nur 1.21.11. pale_oak_* fehlt im Katalog; unter 1.21.1 durch C1 ersetzen.
// deepslate, pale_oak, cherry. Wand 87,6 / Rahmen 15,8 → ΔL 72.
plinth:[['polished_deepslate',1]], wall:[['pale_oak_planks',1]], upperWall:[['pale_oak_planks',1]], infill:[['pale_oak_planks',1]],
frame:[['cherry_log',1]], beam:[['stripped_cherry_log',1]], roof:[['deepslate_tiles',1]],
roofTrim:[['cherry_planks',1]], ridge:[['polished_deepslate',1]], soffit:[['pale_oak_planks',1]],
window:[['white_stained_glass',1]], shutter:[['pale_oak_planks',1]], door:[['cherry_planks',1]],
floor:[['pale_oak_planks',1]], path:[['polished_andesite',1]], chimney:[['polished_deepslate',1]], accent:[['pink_stained_glass',1]]

// C5 cherry_shrine – stone, calcite, mangrove, dark_oak, deepslate. Wand 89 / Rahmen 31,5 → ΔL 58.
plinth:[['smooth_stone',1]], wall:[['calcite',1]], upperWall:[['calcite',1]], infill:[['calcite',1]],
frame:[['stripped_mangrove_log',1]], beam:[['stripped_mangrove_log',1]], roof:[['dark_oak_planks',2],['deepslate_tiles',1]],
roofTrim:[['dark_oak_planks',1]], ridge:[['dark_oak_planks',1]], soffit:[['mangrove_planks',1]],
window:[['white_stained_glass',1]], shutter:[['mangrove_planks',1]], door:[['mangrove_planks',1]],
floor:[['cherry_planks',1]], path:[['smooth_stone',1]], chimney:[['smooth_stone',1]], accent:[['pink_stained_glass',1]]
```

**Zuordnung:** Minka → J1, Machiya → J2, Tempel → J3 oder J4, Schrein → J5 oder J3, Pagode → J3 oder J4, Teehaus → J1 oder C3, Ryokan → J4 oder J2.

**Farbregeln (Einschätzung)**
- Bei `cherry` höchstens 25 % der Fassade und des Dachs rosa.
- Zinnober nur an Sakralbauten.
- Gold höchstens 1–4 Blöcke.

## (d) Proportionen je Größe

Maße außen in Blöcken. G = Geschosse, FH = Geschosshöhe mit Boden, Ü = Überstand ab Pfostenebene.

Die Zahlen sind eine Einschätzung auf Basis von [Q5][Q6][Q21][Q22][Q25][Q54][Q58], bei 1 Block = 1 m.

| Variante | small | medium | large | huge | FH | Sockel | Ü | Engawa |
|---|---|---|---|---|---|---|---|---|
| japanese Wohnhaus | 9×7, 1 G | 13×9, 1 G | 15×11, 1 G + Mokoshi oder 2 G mit zurückgesetztem OG | 21×15, 2 G | 5 / 4 | 1 | 2/3/3/4 | 1 → umlaufend 2 |
| Minka | 11×7 | 15×9 | 19×11 | 23×13 | 5 | 1 | 2–3 | vorn 1–2 |
| Machiya | 5×13 | 7×15 | 7×19 | 9×21 | EG 5, OG 3–4 | 0–1 | 1–2 + Hisashi 2 | – |
| Tempel | 11×9 | 15×11 | 19×15 | 25×19 | 6–7 | Kidan 1–2 + 1 | 3/3/4/4 | umlaufend 2–3 |
| Schrein | 5×5 | 7×7 | 9×7 | 11×9 | 4–5 | 1–2 | 2 (vorn 4) | vorn |
| Pagode | 9², 3 G | 11², 3 G | 13², 5 G | 15², 5 G | 4 / 3 | 1 | 3 → 2 | Kidan-Rand |
| Teehaus | 5×5 | 7×5 | 7×7 | 9×7 | 4 | 1 | 2 | 1 Seite |
| cherry Haus | 9×7 | 11×9 | 13×11, 2 G | 17×13, 2 G | 5 / 4 | 1 | 2/2/3/3 | vorn 1 |

**Weitere Regeln**
- **Raster:** Feld 2, Mittelfeld 3, ungerade Feldzahl. Bei Tempel und Schrein ist das Mittelfeld am breitesten (Einschätzung, nach dem Ken-Raster [Q22][Q24]).
- **Dachhöhe:** Anstieg ≈ 0,8–1,2 × Wandhöhe bei Tempel und Minka, 0,5–0,7 × bei der Machiya. Für den großen Tempel `maxRise` = 9.
- **Geschosse:** höchstens 2 Wohngeschosse. Nur die Pagode hat 3 oder 5.

## (e) Dachformen im Überblick

| Form | Japanisch | Engine heute | Lösung |
|---|---|---|---|
| Kirizuma | Machiya, Schrein | `gable` | Profil nach T02. Schrein mit T06. Nagare: Vorderseite 2–3 Spalten länger, Δ 1 [Q24] |
| Yosemune | Minka, Tempel | `hip` | T03 und T05 |
| Irimoya | Tempel, Haus, Burg, Ryokan | **fehlt** (`half_hip` ist das Gegenteil) | T01 |
| Hōgyō | Pavillon, Pagodenspitze | `pyramid` | Δ 1,2,2 + Knauf auf Roban [Q18] |
| Mokoshi | Pagode, Tempel | `skirt` (ungenutzt) | T07, T12 |
| Karahafu, Chidorihafu | Eingang, Ziergaube | – / Gaube | T08, T11 |
| Geschwungene Traufe, Ecken | alle Sakralbauten | ohne Ecken | T03 |
| Onigawara | Ziegeldächer | `block_slab` | T05 |
| Tokyō | Tempel, Pagode | – | T04 |

Allgemeine Dachtechnik: siehe die Recherche zum Thema Dächer.

## (f) Wandsystem

- **Pfosten und Riegel:** T09, **ohne Streben**.
- **Shoji:** `white_stained_glass_pane` bei d = 0.
- **`scaffolding` als Shoji streichen:** Gerüst wird ab `distance` 7 zum fallenden Block [Q46].
- **Fusuma:** Innenwände, für uns nicht sichtbar. Bei offenen Pavillons höchstens als dunkles Feld bei d = −1.
- **Engawa:** T10.
- **Kōshi:** T09 und W20.
- **Yukimi-Shoji** (Glasband zum Schneeschauen [Q22]): im Winter die mittlere Reihe als `glass_pane`.

## (g) Fenster und Türen je Variante

| Variante | Fenster | Türen |
|---|---|---|
| Wohnhaus | W15c, W15b | T09 |
| Machiya | W19, W20 | T09b |
| Tempel | W15b, W07 | T11, T01b |
| Schrein | ohne Frontfenster | T01b |
| Teehaus | W08, W02 | T12 + T09b |
| cherry | W15c, W03, W08 (Cottage zusätzlich W05) | T09, T01 |

Details stehen in T21.

## (h) Signatur-Details

Die Grundelemente stehen in eigenen Abschnitten:
- Tōrō: T13
- Torii: T14
- Zäune: T15
- Bambus: T17
- Kies: T19
- Teich und Brücken: T18
- Kirschbaum: T16

Zusätzlich:
- **Tsukubai** (Steinbecken im Roji [Q25]): `water_cauldron[level=3]` (nicht in der Registry) zwischen `andesite_slab`, dazu eine Rinne aus `stripped_bamboo_block[axis=x]` (Einschätzung).
- **Shibi** (Firstende großer Tempel): höchstens 2 × `gold_block` als Endplatte von T05.

## (i) Deko und Umgebung

**Grundsätze**
- Asymmetrisch und naturnah.
- Den Garten von der Engawa aus als Bild komponieren.
- Immergrüne als Gerüst, Blüte nur als Akzent [Q30][Q31].

**Grundstücksrezept (Einschätzung)**
1. Trittsteinweg zum Eingang.
2. Eine Steinlaterne am Weg, eine an Wasser oder Kies.
3. Drei Azaleen am Hausfuß.
4. Ein bis drei Bäume: Kiefer bei japanese, Kirsche bei cherry.
5. Bambus an einer Ecke.
6. Bambuszaun, beim Tempel Tsuiji-bei.
7. Moos statt Beeten.
8. Ab `large` Teich oder Zen-Garten.

**Pflanzen**
- Blumen: `fern`, `lily_of_the_valley`, `azalea`, `moss_carpet`. Keine Tulpen.
- Herbst und Winter: `leaf_litter` (nicht in der Registry, ab 1.21.5, je nach Biom braun [Q44]).

## (j) Winter und Weihnachten

Die Einzelteile stehen in T20.

**Winter**
- Schnee auf Laub und auf vollen Oberseiten.
- Yukimi-dōrō mit Kerze.
- 30–50 % Amado geschlossen, Yukimi-Shoji-Band.
- Strohmanschette an Kiefern, `ice` auf dem Teich.
- Kirschkrone verschneit und 30 % lichter. Das Laub bleibt rosa [Q41].

**„Weihnachten“ bei `japanese` und `cherry`**
- Kadomatsu-Paar, Shimekazari.
- Laternen an den Traufecken und an jedem zweiten Pfosten, beleuchtete Steinlaternen.
- Kein Baum, keine Geschenke, keine Girlanden, außer auf ausdrücklichen Wunsch. An Sakralbauten auch dann nicht.

## (k) Was die Stile kaputt macht

1. Krüppelwalm statt Irimoya, gerade Grate bis in die Ecke, Überstand ≤ 1.
2. Streben, Blumenkästen, Fensterläden, Kamin mit Rauch. Ausnahme: das Cherry-Cottage.
3. Steinpodest mit Treppenschürze unter Wohnhäusern.
4. Rot an Wohnhäusern, etwa als `red_nether_bricks`-Ring. Zinnober ist sakral [Q4][Q29].
5. Torii vor Wohnhaus, Teehaus oder Cottage [Q29].
6. Westlicher Weihnachtsschmuck an Sakralbauten, Kadomatsu als „Weihnachtsdeko“ bezeichnet [Q32].
7. Dach, Wand und Gitter gleichzeitig rosa, Kirschlaub als Hecke.
8. Symmetrische Gärten, Steine in einer Reihe, breite gerade Wege [Q31].
9. Große Klarglasflächen, bunte Gläser.
10. Pagode mit 4 Geschossen oder 8–10 Blöcken Wand pro Geschoss (Korrektur zu [Q54]).
11. `scaffolding` als Bauteil [Q46].
12. China-Klischees: Drachen, viel Gold, bunte Bemalung, Mondtore an jedem Haus (Einschätzung).

## Fehler, die Profis vermeiden

- **Zuerst das Dach planen:** Form, Überstand und Ecken, dann die Wände. Mit 1 Block Überstand sieht es nach Gartenhaus aus [Q4][Q54][Q55].
- **Dach in zwei verwandten Tönen:** Fläche und Kante unterscheiden sich, die Kante läuft ringsum [Q55].
- **Kurven nur, wo Platz ist:** erst ab etwa 6 Blöcken Radius (Wiki, siehe `daecher.md`), also `bell` erst ab n ≥ 6.
- **Gleichmäßiger Takt:** keine Felder mit 1 und 4 Blöcken nebeneinander (Ken-Raster [Q22]).
- **Wenige große Gesten im Garten** statt vieler kleiner Deko-Punkte [Q31].
- **Halt für Hängendes und Liegendes:** Laternen hängen unter vollen Unterseiten oder an Ketten [Q48]. Kerzen brauchen festen Grund [Q50]. Schnee braucht eine volle Oberseite und Licht unter 12 [Q51].
- **Laub als Krone mit Löchern**, nie als Quader (25 % Ecklöcher wie bei Vanilla [Q38]).

---

## Empfehlungen für den Generator

Sortiert nach Priorität.

**1. Dachtyp Irimoya**
- **Modul:** `roofEngine.ts`, `plan.ts`, `styles.ts`. Regel und Daten.
- **Was:**
  - Neuer Typ `irimoya`, zerlegt in `skirt(k)` und ein um k−1 eingerücktes `gable`.
  - Dazu `overhangVerge`, Giebel ab Ringoberkante und dieselbe Δ-Kappung für beide Sektionen.
  - Bei `japanese` und `cherry` `half_hip` durch `irimoya` ersetzen und den Kommentar in `styles.ts:179–181` korrigieren.
- **Akzeptanz:**
  - 13×9 mit Überstand 2: Walmring über 3 Ringe an allen Seiten, Giebel aus `infill` bei dx = 3 ab der Ringoberkante, Ortgang 1 Block vor.
  - Keine Stufe zwischen den Sektionen.
  - Lints grün, 0 Reparaturen, Fixpunkt erreicht.

**2. Festschicht je Stil**
- **Modul:** `festive.ts`, `generateBuilding.ts:143–151`. Daten (Festsatz je Stil) und kleine Regeln.
- **Was:**
  - Bei `japanese` und `cherry` standardmäßig kein Baum, keine Geschenke, keine Girlanden.
  - Neu: `kadomatsu`, `shimekazari`, `eaveLanterns`, beleuchtete Tōrō, Kerzen-Tōrō im Winter.
- **Akzeptanz:**
  - `japanese` + `christmas` ohne Wünsche: 0 Woll-Geschenke, 0 Bäume, 2 Kadomatsu, mindestens 4 Hängelaternen.
  - Ein ausdrücklicher Baumwunsch wirkt weiter, mit dem Hinweis „stilfremd“.

**3. Landschaft je Stil**
- **Modul:** `landscape.ts`. Regeln, die Vorlagen als Daten.
- **Was:**
  - Trittsteine (T18), Tōrō (T13), Bambuszaun (T15), Azaleen (T17).
  - Bei `cherry` ab Detailgrad 2 mindestens 1 Kirschbaum (T16) mit `pink_petals`.
- **Akzeptanz:**
  - Kein Laub (`cherry_leaves`, `oak_leaves`) auf y1 am Grundstücksrand.
  - Mindestens 1 Baum aus `cherry_log` mit Kronendurchmesser ≥ 7.
  - Wege höchstens 1 breit, ausgenommen am Tempel.
  - 0 Reparaturen.

**4. Paletten**
- **Modul:** `palettes.ts`, `materials.ts`, `styles.ts`. Daten.
- **Was:**
  - Austausch: J3 statt `japanese_temple`, J4 statt `japanese_classic`, C1 statt `cherry_white`, C2 statt `cherry_slate`.
  - Neu: J1, J2, J5, C3, C5, dazu C4 mit Versionsschalter.
  - In den Materialkatalog: `pale_oak_*` (mit Ersatz für 1.21.1), `bamboo_mosaic`, `hay_block`, `chiseled_deepslate`.
  - `forbidden` bei `japanese`: `'mossy'` entfernen, `'nether'` aufnehmen.
- **Akzeptanz:**
  - Palette-Lints grün.
  - Keine `cherry`-Palette mit Kirschholz als `roof`.

**5. Wandsystem**
- **Modul:** `openings.ts:264–268`, `studs.ts`, `walls.ts`. Daten und Regel.
- **Was:**
  - `addBraces` nur noch bei `medieval`, `fantasy` und `rustic`.
  - Neuer Stilwert `bay: {panel: 2, centre: 3}`.
  - Koshi-Reihe und Nageshi-Band (T09).
- **Akzeptanz:**
  - In der Rahmenebene keine Treppen außer Konsolen.
  - Felder 2 breit, das Türfeld 3.

**6. Ecken und Konsolen**
- **Modul:** `roofEngine.ts`. Regel.
- **Was:**
  - Nachlauf `cornerFlare: 0|2|3` (T03).
  - `brackets: 'none'|'simple'|'temple'` (T04).
- **Akzeptanz:**
  - An allen 4 Ecken liegt der letzte Block 1 hb höher als die Traufmitte.
  - Unter jeder Ecke hängt eine Laterne mit Halt.
  - Fixpunkt erreicht, 0 Reparaturen.

**7. Engawa und aufgeständerter Sockel**
- **Modul:** `walls.ts` (`plinthStyle: 'apron'|'raised'|'kidan'`), neues Bauteil `engawa` in `components.ts`, `buildOptions.ts` (Überstand bis 4). Regel und Daten.
- **Akzeptanz:**
  - `japanese` `medium`: keine Sockeltreppen, Engawa an mindestens 2 Seiten.
  - Die Traufe steht mindestens 1 Block über die Engawa-Kante.
  - Unter dem Belag ein halber Block Luft.

**8. Pagode als Masse**
- **Modul:** `plan.ts:189` entfernen, Turm nach T07 bauen. Regel.
- **Akzeptanz:**
  - „japanische Pagode“ ergibt 3 bzw. 5 quadratische Geschosse, jedes so breit wie das darunter oder schmaler.
  - Jedes Geschoss hat einen eigenen Ring mit Überstand ≥ 2.
  - Spitze vorhanden.

**9. First**
- **Modul:** `roofEngine.ts`, `plan.ts:203`. Regel.
- **Was:** `RidgeStyle:'wall_ends'` (T05). Bei Schreinen zusätzlich T06.
- **Akzeptanz:** An beiden Enden je eine Treppe 1 Block über dem First, mit `facing` nach außen.

**10. Untervarianten als Daten**
- **Modul:** `styles.ts` (neues Feld `variants`), Parser. Daten.
- **Was:** Werte aus den Tabellen (b) und (d). Der Parser erkennt: minka, bauernhaus, machiya, stadthaus, tempel, schrein, pagode, teehaus, ryokan, pavillon.
- **Akzeptanz:**
  - „Tempel“ ergibt Kidan, Irimoya `bell` und Überstand 3–4.
  - „Machiya“ ergibt eine schmale, tiefe Form mit Δ 1 und Hisashi.
  - „Teehaus“ ist höchstens 7×7 und hat W08.

**11. Vorlagen**
- **Modul:** `templates/windows.ts`, `templates/doors.ts`. Daten.
- **Was:**
  - Neu: W19, W20, T11, T12.
  - Stilzuordnung erweitern für W08, W07, W02, T02, T01b.
  - Unter einer Engawa wird W15 automatisch zu W15c.
- **Akzeptanz:**
  - `templateFits` geht in allen Größen.
  - Kein Mini-Vordach, wenn die Traufe höchstens 2 Blöcke darüber liegt.

**12. Profile und Proportionen**
- **Modul:** `profiles.ts` (`mukuri`), `styles.ts`. Daten.
- **Was:**
  - `huge` wird 21×15 mit 2 Geschossen.
  - Kein Kegel- oder Rundturm bei `japanese` und `cherry`, stattdessen Yagura (quadratischer Wachturm) mit Irimoya.
  - `bell` erst ab n ≥ 6.
- **Akzeptanz:** Höchstens 2 Wohngeschosse.

**13. Registry**
- **Modul:** `families.ts`, mit Tests gegen minecraft-data. Daten.
- **Was:**
  - Aufnehmen: `bamboo`, `water`, `gravel`, `light_gray_concrete_powder`, `white_concrete_powder`, `lily_pad`, `water_cauldron`, 8 × `copper_lantern` (ab 1.21.9, grüne Flamme, Licht 15 [Q49]), `leaf_litter` [Q44].
  - Oxidierte Blitzableiter vorher prüfen.
  - `scaffolding` nicht aufnehmen.
- **Akzeptanz:** Registry-Test grün, Profil 1.21.1 korrekt eingeschränkt.

Querverweise: Schnee und Licht siehe Thema Winter und Weihnachten, Dachtechnik siehe Thema Dächer, Vegetation siehe Thema Landschaft.

---

## Quellen

1. ja.wikipedia 入母屋造 – https://ja.wikipedia.org/wiki/%E5%85%A5%E6%AF%8D%E5%B1%8B%E9%80%A0 – Oben Giebel, unten Walm; Shikoro-yane; Beispiele.
2. en.wikipedia East Asian hip-and-gable roof – https://en.wikipedia.org/wiki/East_Asian_hip-and-gable_roof – Giebel über moya, Walm über hisashi.
3. JAANUS irimoya yane – https://projects.mcah.columbia.edu/jaanus/record/irimoyayane – Definition.
4. en.wikipedia Japanese architecture – https://en.wikipedia.org/wiki/Japanese_architecture – Pfosten und Riegel, tiefe Traufe, Shoji, Ken, Zinnober.
5. en.wikipedia Minka – https://en.wikipedia.org/wiki/Minka – Dachformen, Boden etwa 50 cm über Grund, Engawa.
6. en.wikipedia Machiya – https://en.wikipedia.org/wiki/Machiya – 5,4–6 × 20 m, Kōshi, Mushiko-mado, Geschosszahl.
7. nippon.com Machiya Design Features – https://www.nippon.com/en/guide-to-japan/gu900011/ – Ichimonji-Traufe, Gitter, Inuyarai, Battari shōgi.
8. JAANUS kōbai / kanekōbai – https://projects.mcah.columbia.edu/jaanus/record/kobai (sowie /node/3427) – Neigung in sun je shaku; 45°.
9. JAANUS nokizori – https://www.aisf.or.jp/~jaanus/deta/n/nokizori.htm – Traufkrümmung, Entwicklung durch die Epochen.
10. JAANUS noki – https://www.aisf.or.jp/~jaanus/deta/n/noki.htm – Einfache, doppelte und dreifache Traufe.
11. JAANUS noki no de – https://www.aisf.or.jp/~jaanus/deta/n/nokinode.htm – Überstand gemessen von der Pfostenmitte.
12. JAANUS tokyō – https://www.aisf.or.jp/~jaanus/deta/t/tokyou.htm – Konsolen.
13. JAANUS onigawara – https://www.aisf.or.jp/~jaanus/deta/o/onigawara.htm – Zierziegel an den Firstenden.
14. JAANUS karahafu – https://www.aisf.or.jp/~jaanus/deta/k/karahafu.htm – Geschwungener Giebel über Eingängen.
15. JAANUS chidorihafu – https://www.aisf.or.jp/~jaanus/deta/c/chidorihafu.htm – Dekorative Dreiecksgaube.
16. JAANUS mukuri – https://www.aisf.or.jp/~jaanus/deta/m/mukuri.htm – Konvexe Dachkrümmung (Edo, Minka).
17. JAANUS kidan – https://www.aisf.or.jp/~jaanus/deta/k/kidan.htm – Steinpodest, Treppe in der Mitte jeder Seite.
18. JAANUS hōgyō-zukuri – https://www.aisf.or.jp/~jaanus/deta/h/hougyouzukuri.htm – Pyramidendach, Spitze auf Roban.
19. JAANUS mokoshi – https://www.aisf.or.jp/~jaanus/deta/m/mokoshi.htm – Pultdachrock, täuscht Geschosse vor.
20. en.wikipedia Japanese pagoda – https://en.wikipedia.org/wiki/Japanese_pagoda – 3 oder 5 Geschosse, gerade Traufen, teigen.
21. en.wikipedia Engawa – https://en.wikipedia.org/wiki/Engawa – 1–1,3 m breit, Tempel über 3 m, Lage, Pfosten auf Steinen.
22. en.wikipedia Shōji – https://en.wikipedia.org/wiki/Sh%C5%8Dji – Abstand 1,82 m, Kumiko, Koshi, Yukimi-Shoji.
23. en.wikipedia Shinto shrine – https://en.wikipedia.org/wiki/Shinto_shrine – Stile, Chigi und Katsuogi, Zinnober, Tamagaki.
24. en.wikipedia Nagare-zukuri – https://en.wikipedia.org/wiki/Nagare-zukuri – Asymmetrisches Dach mit Vordach, 1 oder 3 Ken.
25. en.wikipedia Chashitsu – https://en.wikipedia.org/wiki/Chashitsu – 4,5 Tatami, Nijiriguchi, Shoji, Roji.
26. en.wikipedia Ryokan – https://en.wikipedia.org/wiki/Ryokan – Tatami, Schiebetüren, Genkan, Veranda.
27. japan-guide Temples – https://www.japan-guide.com/e/e2058.html – Tore, Halle, Pagode mit 3 oder 5 Geschossen.
28. en.wikipedia Tōrō – https://en.wikipedia.org/wiki/T%C5%8Dr%C5%8D – Bauteile und Typen der Steinlaterne.
29. en.wikipedia Torii – https://en.wikipedia.org/wiki/Torii – Bauteile, Shinmei und Myōjin, Farben.
30. en.wikipedia Japanese garden – https://en.wikipedia.org/wiki/Japanese_garden – Wasser, Brücken, Formschnitt, Immergrüne.
31. en.wikipedia Japanese rock garden – https://en.wikipedia.org/wiki/Japanese_rock_garden – Harkmuster, Steingruppen, Asymmetrie, Moos.
32. en.wikipedia Kadomatsu – https://en.wikipedia.org/wiki/Kadomatsu – Aufbau, paarweise, nach Weihnachten bis 7. Januar.
33. en.wikipedia Shimenawa – https://en.wikipedia.org/wiki/Shimenawa – Strohseil, Shide, Shimekazari.
34. en.wikipedia Yukitsuri – https://en.wikipedia.org/wiki/Yukitsuri – Schneeschutz für Bäume.
35. en.wikipedia Prunus serrulata – https://en.wikipedia.org/wiki/Prunus_serrulata – Krone, Rinde, Hängeformen.
36. en.wikipedia Prunus × yedoensis – https://en.wikipedia.org/wiki/Prunus_%C3%97_yedoensis – 5–12 m, weiß bis zartrosa.
37. ja.wikipedia 瓦 – https://ja.wikipedia.org/wiki/%E7%93%A6 – Ziegeldeckung, Noshigawara, Onigawara, Shachi.
38. misode/mcmeta cherry.json (1.21.11) – https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/worldgen/configured_feature/cherry.json – Alle Zahlen des Vanilla-Kirschbaums.
39. minecraft.wiki Tree definition – https://minecraft.wiki/w/Tree_definition – Wertebereiche der Kirsch-Platzierer.
40. minecraft.wiki Tree – https://minecraft.wiki/w/Tree – Kirschbaum: waagrechte Äste, mehrere Kronen, diagonale Äste.
41. minecraft.wiki Cherry Leaves – https://minecraft.wiki/w/Cherry_Leaves – Keine Biomfarbe, bei Schnee nicht weiß, Partikel.
42. minecraft.wiki Cherry Grove – https://minecraft.wiki/w/Cherry_Grove – Bodenbewuchs mit `pink_petals`.
43. minecraft.wiki Pink Petals – https://minecraft.wiki/w/Pink_Petals – Blockzustände, Untergründe, braucht Halt.
44. minecraft.wiki Leaf Litter – https://minecraft.wiki/w/Leaf_Litter – Ab 1.21.5, Biomfarbe.
45. minecraft.wiki Bamboo – https://minecraft.wiki/w/Bamboo – Blockzustände, Untergründe, Höhe 12–16.
46. minecraft.wiki Scaffolding – https://minecraft.wiki/w/Scaffolding – Ab `distance` 7 fallender Block.
47. minecraft.wiki Trapdoor – https://minecraft.wiki/w/Trapdoor – Blockzustände, braucht keinen Halt.
48. minecraft.wiki Lantern – https://minecraft.wiki/w/Lantern – Hängend oder stehend, Licht 15, an Ketten.
49. minecraft.wiki Copper Lantern – https://minecraft.wiki/w/Copper_Lantern – 8 IDs ab 1.21.9, grüne Flamme.
50. minecraft.wiki Candle – https://minecraft.wiki/w/Candle – Licht 3/6/9/12, braucht festen Grund.
51. minecraft.wiki Snow – https://minecraft.wiki/w/Snow – Schmilzt ab Licht 12, braucht volle Oberseite.
52. minecraft.wiki Tutorial:Roof types – https://minecraft.wiki/w/Tutorial:Roof_types – Bell-cast, Möwenflügel, Mindestgrößen.
53. minecraft.wiki City themes – https://minecraft.wiki/w/Tutorial:Building_a_metropolis/City_themes – Japan: Holz, Ziegel oder Stroh, erhöht.
54. minecraft.how Japanese Pagoda – https://minecraft.how/blog/post/build-japanese-pagoda-minecraft – Basis 12–16, 20–25 % Rücksprung, 4–5 Geschosse, Überstand 2–3.
55. CurseForge Blog Roof Designs – https://blog.curseforge.com/top-minecraft-roof-designs-to-try/ – Pagodendach mit Kante, Rand ringsum, Firstaufsatz.
56. CozyGameBuilds Roof Ideas – https://cozygamebuilds.com/minecraft-roof-design-ideas/ – Kopfüber-Spitzen, Pagode, Torii-Dach, Kirschpavillon.
57. The Spike Japanese house – https://www.thespike.gg/minecraft/house-ideas/minecraft-japanese-house – Treppenwechsel in der Wand, Tiefenschieferdach, Bambusgarten.
58. DiamondLobby Japanese house – https://diamondlobby.com/minecraft/how-to-build-japanese-house-minecraft/ – Plattform 2 Blöcke breiter, Pfosten alle 3, Wand 5 hoch, Lagerfeuersteg.
59. Folko Minka Roof Framing 1 – https://www.folko.com.au/blog/2024/1/8/japanese-minka-xxxiv-roof-framing-1 – Dachstuhlsysteme; Stützen etwa 1 m; keine weiteren Maße.
60. de.wikipedia Japanische Architektur – https://de.wikipedia.org/wiki/Japanische_Architektur – Flexibles Holzfachwerk, Tatami-Raster, Engawa.
