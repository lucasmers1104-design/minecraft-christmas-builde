# Gelände, Grundstück, Gärten, Wege und Landschaft – Regeln für den Profi-Look

Stand 2026-10-23 · Thema 15: Wie der Generator Sockelanschluss, Grundstücksrand, Wege, Gärten, Hecken, Zäune, kleine Bäume, Felsen, Wasser und Kleinkram baut, damit das Haus in einer Landschaft steht statt auf einer Grasplatte.

**Konventionen.**
- Draufsicht: Zeile = z (Norden oben), Spalte = x.
- Schnitt: Spalte = d (−1 innen, 0 Wand, +1 … davor), Zeile = y (oben zuerst). y=0 ist die Bodenschicht des Modells. Vorderseite = Norden.
- „(nicht in Registry)“ heißt: Den Block gibt es in Java 1.21.11, er fehlt aber in `src/core/blocks/families.ts`.
- „Einschätzung“ heißt: keine Quelle, abgeleitet oder Vorschlag.

**Quellenlage.** minecraftgradient.blog und minecraft.how sind teils KI-gestützt. Ihre Regeln übernehme ich nur, wenn sie zu Vanilla-Daten (mcmeta 1.21.11, selbst dekodiert) oder realer Gartenpraxis passen; ihre Prozentzahlen sind Startwerte.

---

## Kurzfassung

1. **Die Grasplatte muss verschwinden.**
   - Laut Importanleitung liegt y=0 auf Fußhöhe. Das Grundstück wird so zu einer rechteckigen Plattform 1 Block über dem Gelände.
   - GDMC-Juroren werten „floating foundation platforms“ ab [42], Planieren gilt als „tabula rasa“ [40][41].
   - Lösung: bündig einsetzen, die äußeren 2 Ringe nur Gras, jede Begrenzung ≥ 2 Blöcke innen (T1).
2. **Wege brauchen eine Mittellinie, kein Rauschen.**
   - Die Regel „keine zwei gleichen nebeneinander“ erzeugt das „noisy floor pattern“, vor dem Path-Guides warnen [3].
   - Lösung: Mitte ≥ 70 % Hauptblock, Schultern 50/30/15/5 [3]. Qualität steigt zum Haus (Stein → Kies → Erde) [40]. Am Ziel breiter, am Tor schmaler [4].
3. **Der Sockel wächst aus dem Boden.**
   - Treppenschürze nur am Eingang und an den Ecken; sonst Pflanzstreifen, Erdanschüttung oder Kiesstreifen je Stil (T2).
   - Real hält der Sockel Spritzwasser ab (≥ 30–50 cm [56]); auf ebenem Grund reicht deshalb 1 Block.
4. **Zonen statt Rasenring.**
   - Route → Beet → Anker → Licht, mit etwa 50 % Lauffläche, 30 % Pflanzung und 20 % Akzenten [4].
   - Vorgarten am Zuweg [54], Arbeitsecke, Nutzgarten, wilde Ecke.
   - Ein zu kleiner Hof wirkt wie ein „model placed on grass“ [10].
5. **Der Boden ist nie 100 % Gras.**
   - Cluster nach Ursache (Abnutzung, Schatten, Nässe), 45/25/20/10, als weiche Flecken, nie als Schachbrett [5][11].
   - Vanilla-Maße: disk_gravel r 2–5, moss_patch r 4–7 [36].
6. **Hecken gemischt und porös.**
   - Real: ≥ 60 % Hauptart, zufällig gemischt [50]. Wallhecken stehen auf einem Erdwall von ~1 m Höhe und ~2 m Breite [51].
   - Grenze nur vorn und an 1–2 Seiten, mit Tor [7]. Nie ein geschlossener 1 hoher Laubring.
7. **Blumen in Drifts.**
   - Vanilla mischt pro Fleck 1–3 Arten (flower_meadow `variety [1,3]`) [36]. Drifts wiederholen [57]; gruppieren statt streuen [4].
   - Einfassung mit offenen Falltüren wie in Vanilla `plains_accessory_1` [38].
8. **Vanilla liefert Vorlagen** [36][37][38]:
   - Hof 7×9 mit Wasserrinne
   - Busch: 1 Stamm, Laub r=2
   - Azaleenbaum: Stamm 4–6, Laub 3:1
   - Mini-Felsen aus Treppen
   - Heuhaufen ≈ 8 Blöcke [33], Kürbishaufen 19:1, umgestürzter Stamm 4–7
9. **Mikrorelief auf flachem Grund.**
   - Hochbeet, eine Terrassenstufe mit Stützmauer, eine Senke [4][13].
   - Mauern nach Trockenmauerregeln: unten massiger, Kappe darauf [47][48].
10. **Kleine Bäume (< 10 Blöcke).**
    - Ungleiche Äste ab Höhe 3; Krone oben kuppelig, unten weniger Laub [58].
    - Stammanlauf und `rooted_dirt` [37]; ≥ 3 Abstand zur Wand.
11. **Requisiten nur dort, wo etwas getan wird.**
    - Holzstapel an der Hauswand [13], Heu, Fässer, Bank am Teich, Trampelpfad [53].
12. **Winter.**
    - `grass_block[snowy=true]` + `snow[layers=1]` statt `snow_block`.
    - `dirt_path` trägt keinen Schnee, die Wegmitte bleibt also frei (wie im Vanilla-Schneedorf [38]).
    - `layers ≥ 2` lässt Gras zu Erde werden [22]. Kein Schnee auf Eis oder Ackerboden [22], kein Zuckerrohr neben Eis [29].
13. **Das Grundstück wächst mit dem Haus.** MARGIN 4 minus Dachüberstand lässt 1–3 Blöcke Rasen; ein Vorgarten braucht ≥ 7×7 [4].
14. **Registry-Lücken blockieren die besten Rezepte:** water, gravel, podzol, doppelt hohe Pflanzen, Feldfrüchte, bush, leaf_litter, wildflowers, sugar_cane, lily_pad, composter.

---

## Schwächen des aktuellen Generators

**Screenshots (`docs/screenshots/haus-*.jpg`).**
- Exakte Rechteckplatte mit 1 hohem Laubring genau am Modellrand; eine Lücke am Weg.
- Rasen leer: keine Bäume, Büsche, Felsen, Beete, Höhen.
- Der Sockel mit umlaufender Treppenschürze wirkt als Podest (mittelalterlich, mediterran, japanisch).
- Blumen als Punkte in 1 breitem Ring; Azaleen als „Würfel“ in Reihe (Fantasy, Japanisch, Kirschblüte).
- Der Weg zerfällt in versetzte Fragmente und endet am Rand.
- Der Weihnachtsbaum steht in der Heckenecke; Geschenke liegen verstreut.
- Im Winter ist die ganze Platte weißer `snow_block`.

**Code.**

| # | Ort | Schwäche |
|---|---|---|
| 1 | `docs/WORLD_EDIT_IMPORT.md:34` | y=0 „auf Höhe deiner Füße“ → Plattform eine Ebene über der Welt, sichtbare Grasflanken. |
| 2 | `src/core/generator/landscape.ts:59` | Boden aus einem Block; Schnee wird `snow_block`. Keine Unterbodenschicht (keine Senken oder Terrassen nach unten), entgegen „double-layer your terrain“ [1]. |
| 3 | `landscape.ts:32–41` | `PATH_MIX` fest kodiert; die Palettenrolle `path` (`style/palettes.ts:27`, z. B. `:64`) wird im Haus nie genutzt. |
| 4 | `landscape.ts:76–77, 87–91` | 25 % fehlende Seitenzellen und Versatz ohne Überlappung → Löcher und Fragmente. |
| 5 | `landscape.ts:94–105` | Gleichverteilung mit Nachbarverbot → Schachbrett; `modern` erzwingt Wechsel (`:39`). |
| 6 | `landscape.ts:69–75`, `generateBuilding.ts:134` | Ein Weg, gerade nach Norden; keine Neben- oder Vorplätze. |
| 7 | `landscape.ts:107–117` | Hecke auf Modellrand, 1 hoch, 1 Art (`:108`); kein Tor, keine Pfosten, keine Variation. |
| 8 | `landscape.ts:145–162` | Blumen nur direkt am Haus, 35 % gleichverteilt; `azalea` im Blumenmix. |
| 9 | `landscape.ts:164–175` | Winterteich: Rechteck aus packed_ice ohne Ufer, nur bei `winter`. |
| 10 | `landscape.ts:119–143`, `generateBuilding.ts:141` | Laternenpfähle paarweise symmetrisch; Holz immer `spruce`. |
| 11 | `house/buildHouse.ts:31, 151` | `MARGIN = 4` für alle Größen (+3 vorn nur mit Garten oder Veranda). |
| 12 | `generateBuilding.ts:143–146` | Baum auf dem ersten passenden Hofplatz, typisch in der Ecke. |
| 13 | `festive.ts:164–172` | Geschenke über den ganzen Hof gemischt (Thema Festschmuck). |
| 14 | `house/walls.ts:113–122` | Treppenschürze bei d=+2 um alle freien Seiten → Podest-Effekt, kein Übergang. |
| 15 | `families.ts`, `shapes.ts:14–45` | Fehlend: water, gravel, podzol, mud, clay, doppelt hohe Pflanzen (keine Formklasse), Feldfrüchte und farmland, bush, firefly_bush, leaf_litter, wildflowers, short_dry_grass, tall_dry_grass, sugar_cane, lily_pad, composter, pale_moss_block, pale_moss_carpet, stone_pressure_plate, azure_bluet, blue_orchid, orange_tulip. |

---

## Techniken und Regeln

### T1 Bündiger Einbau, aufgelöster Rand

**Modus „bündig“.** y=0 ersetzt die Weltoberfläche: Gras stößt an Gras, die Grasfarbe kommt vom Weltbiom [24].

**Modus „aufgesetzt“** (heutige Anleitung). Den äußeren Ring auf y=0 per Rauschen zu Luft machen. Das Weltgras eine Ebene tiefer scheint durch, und es entsteht eine natürliche 1-Block-Stufe.

**Regeln.**
- Zonen ab Rand: r = 0–1 nur `grass_block` (≤ 20 % `short_grass`); r = 2 Übergang (≤ 10 % `coarse_dirt`); ab r ≥ 3 Grenze und Gestaltung.
- Luftring: P = 0,7 bei r=0, 0,35 bei r=1, mal Value-Noise (Skala 3). Keine geraden Läufe > 7 [1].
- Der Weg läuft bis zum Rand und dünnt dort aus: 10–20 % Gras wie der Vanilla-Straßenprozessor [60].

```
Schnitt am Rand, „bündig“ (Spalte = Abstand vom Modellrand). W=Welt, G=grass_block, ,=short_grass, c=coarse_dirt,
H=oak_leaves[persistent=true], L=oak_log[axis=y] (alle 4–6)
         Welt | 0  1  2  3  4  5
y=1       .   | .  ,  .  H  L  H
y=0       W   | G  G  c  G  G  G
Draufsicht NW-Ecke, „aufgesetzt“: _=Luft auf y=0, G=grass_block, H=Hecke y=1
     x0 1 2 3 4 5 6 7
z0    _ _ _ G _ _ _ G
z1    _ G G G G _ G G
z2    _ G G G G G G G
z3    G G G H H H H H
```

**Wirkung** hoch · **Aufwand** niedrig–mittel · **Stile** alle · Quellen [1][24][40][41][42][60].

### T2 Sockelanschluss auf ebenem Grund

**Beschreibung.**
- Der Sockel soll sich absetzen und vorstehen [8][56]; Stufen am Fuß helfen [2].
- Ein Treppenring an jeder Seite wirkt dagegen als Podest (Einschätzung, Screenshots).

**Regeln je Fassade.**
- **Eingang:** Sockeltreppen nur Tür ± 2 und an den Ecken (je 1–2).
- **A Pflanzstreifen** (medieval, rustic, fantasy, cherry):
  - d=+2..+3 `rooted_dirt` oder `coarse_dirt`, darauf zu 60–80 % bepflanzt (hinten `azalea`/`fern`, vorn niedrig).
  - Unterste Sockellage zu 40 % moosig [11].
- **B Erdanschüttung** (nordic, rustic; nur P ≥ 2): `grass_block` auf y=1 bei d=+2. Die unterste Sockellage verschwindet im Boden.
- **C Traufstreifen** (modern, japanese, mediterranean):
  - d=+2 gravel (nicht in Registry; Ersatz `andesite`, mediterran `smooth_sandstone`).
  - d=+3 Kante `polished_andesite` bzw. `cut_sandstone` (Einschätzung, nach der Spritzwasserfunktion [56]).
- **Sockelhöhe:** eben 1. Auf Hang oder Terrasse „raise the low edge or step the foundation“ [9]; das Fundament folgt dem Gelände [13].

```
Heute (P=2): K=Sockel, F=floor, B=beam, S=Sockeltreppe[facing=south,half=bottom], G=grass_block
        d= +3 +2 +1  0 -1
y=3          .  .  B  B  .
y=2          .  .  K  K  F
y=1          .  S  K  K  K
y=0          G  G  K  K  K
A Pflanzstreifen            B Erdanschüttung (P≥2)      C Traufstreifen
d=  +4 +3 +2 +1  0          d=  +4 +3 +2 +1  0          d=  +4 +3 +2 +1  0
y=2  .  .  .  K  K          y=2  .  .  ,  K  K          y=1  .  .  .  K  K
y=1  .  f  a  m  K          y=1  .  ,  G  K  K          y=0  G  e  g  K  K
y=0  G  c  r  K  K          y=0  G  G  G  K  K
r=rooted_dirt, c=coarse_dirt, a=azalea, f=fern, m=moosige Sockelvariante (z. B. mossy_cobblestone), ,=short_grass,
g=gravel (nicht in Registry)/andesite, e=polished_andesite
```

**Wirkung** hoch · **Aufwand** niedrig · **Stile** alle · Quellen [2][8][9][11][13][56].

### T3 Terrasse und Stützmauer

**Beschreibung.**
- Das Haus steht auf einer Terrasse (T = 1–2), der Vorgarten liegt tiefer, und eine Stützmauer erklärt den Höhenwechsel [6][7].
- Trockenmauern: große Steine unten, Bindersteine ragen vor, Decksteine quer [47]; Fuß ≈ ⅓ der Höhe [48]; Rückneigung („batter“) [49]; Mauern unten dicker [20].

**Regeln.**
- Untere Lage `cobblestone` 50 / `mossy_cobblestone` 30 / `andesite` 20; obere Lage `stone` 40 / `cobblestone` 40 / `andesite` 20.
- Kappe `cobblestone_wall` oder `stone_brick_wall`, oder `stone_brick_slab[type=bottom]` bündig.
- Bindersteine alle 4–6: `stone_brick_stairs[half=top,facing=<zur Mauer>]` auf d=+1 (Einschätzung [47]).
- Ab T ≥ 3 springt die oberste Lage 1 zurück (Einschätzung [48][20]).
- `vine` an 10–20 % der Fläche, am Fuß `moss_carpet` und `fern`.
- Im Weg 1 Treppe pro Höhenblock; nie Sprünge ≥ 2, die GDMC-Wegsucher als unpassierbar werten [40].
- Ha-ha für große Anwesen: Krone ½ Block unter dem Gelände [20].

```
Schnitt Nord–Süd am Weg (Spalte = Abstand vom Sockel). K=Sockel, G=grass_block, D=dirt, M=Mauermix,
X=cobblestone_wall (Kappe neben dem Weg), P=dirt_path, s=cobblestone_stairs[facing=south,half=bottom]
            0  1  2  3  4  5
y=2         K  .  .  X  .  .
y=1         K  G  P  M  s  .
y=0         K  D  D  M  P  G
```

**Wirkung** hoch · **Aufwand** mittel–hoch (Plan um T anheben) · **Stile** medieval, rustic, nordic, mediterranean (`sandstone_wall`), japanese (Treppenkappe) · Quellen [6][7][9][20][40][47][48][49].

### T4 Hochbeet und Falltür-Blumenkasten

**Beschreibung.**
- Vanilla `plains_accessory_1`: 3 Gras in einer Reihe, ringsum offene `oak_trapdoor`, darauf poppy, oxeye_daisy, dandelion [38].
- Die Falltür zeigt vom Beet weg; offen liegt ihre Platte dann am Beet an.
- Das deutsche Wiki kennt „Laub in einem Topf aus Falltüren“ [34].
- Als Hochbeet liefert der Kasten das Relief, das Cottage-Guides für flaches Land empfehlen [13].

**Regeln.**
- Länge 3–7, Breite 1–2, Ecken frei.
- Erde: `grass_block`, `rooted_dirt` oder `coarse_dirt` (Validator `DIRT_LIKE`). Holz aus Rolle `frame`.
- Hochbeet: Rahmen und Erde auf y=1, Pflanzen auf y=2. Höchstens 1 je 40 Hofzellen (Einschätzung).

```
Draufsicht plains_accessory_1             Schnitt Hochbeet
     x0 x1 x2                                   x0 x1 x2 x3
z0   ·  n  ·                              y=2   .  *  *  .
z1   w  G  e   (Blume auf jedem G)        y=1   w  G  R  e
z2   w  G  e                              y=0   G  G  G  G
z3   w  G  e
z4   ·  s  ·
n/s/w/e=oak_trapdoor[facing=north/south/west/east,open=true,half=bottom], G=grass_block, R=rooted_dirt, *=Blume
```

**Wirkung** mittel · **Aufwand** niedrig · **Stile** alle (modern mit `smooth_stone_slab`-Kante, mediterran mit `terracotta`-Rahmen) · Quellen [13][34][38].

### T5 Wege: Mittellinie, Schultern, Hierarchie

**Beschreibung.**
- Die Mitte ist verdichtet, die Schultern rau; gleichmäßig verteilt verliert der Weg seine Richtung [3].
- Ziele verbinden und am Ziel verbreitern [3][4]. In GDMC-Siedlungen nimmt die Qualität zum Rand ab [40].
- Vanilla-Straßen sind 3 breit aus `dirt_path` [38]; Fußwege 2–4 breit [35].

**Regeln.**
1. **Netz:**
   - Hauptweg Tor → Tür.
   - Ab 150 Hofzellen 1 breite Nebenwege zu Holzstapel, Nutzgarten und Rückseite.
   - Optional ein Trampelpfad als Abkürzung (60 % besetzt) [53].
2. **Breite:** small 2 (japanese Trittsteine), medium 3, large/huge 3 + Vorplatz 5×5; am Tor 1–2.
3. **Linie:** Polylinie mit Stützpunkten alle 4–6, seitlich ±1, Scheibenpinsel (keine Löcher). Nie > 7 gerade, außer modern und formal [1].
4. **Querlage:** Mitte 80–90 % Hauptblock; Schultern 50/30/15/5 [3]; außen 25 % `short_grass`.
5. **Gradient:** 3 Felder vor der Tür Stein (Antritt); die letzten 3 zum Rand mit 10–20 % Gras [40][60].
6. **Höhe:** Stufe oder Treppe pro Block [1]. `dirt_path` nie unter festen Blöcken oder Pfählen.

```
Draufsicht Hauptweg 3 breit, rustic (s0 Tor → s9 Tür). P=dirt_path, c=coarse_dirt, r=rooted_dirt, k=cobblestone,
.=grass_block, ,=+short_grass
Quer: -2 -1  0 +1 +2
s9     .  k  k  k  .   ← Antritt
s8     .  k  P  k  .
s7     ,  P  P  P  .
s6     .  c  P  P  ,
s5     .  P  P  r  .
s4     ,  .  P  P  c   ← Versatz +1 (Kurve)
s3     .  c  P  P  .
s2     .  P  P  .  ,
s1     .  c  P  c  .
s0     .  .  P  .  .   ← am Tor schmal
```

**Wirkung** hoch · **Aufwand** mittel · **Stile** alle (Paletten im Abschnitt „Wege“) · Quellen [1][3][4][35][38][40][53][60].

### T6 Trittsteine und Plattenwege

- Japanische Gärten nutzen Trittsteine, auch durch flache Teichteile (iso-watari) [46], dazu gealterte Materialien, Moos und Kies [45].
- Stein auf jedem 2. Schritt, dazwischen `moss_block` oder Gras. Zickzack 0/±1, jeder 3. Stein 2×1.
- Material `smooth_stone`, `polished_andesite`, `stone`; Moosring um 40 % der Steine.
- Modern: Raster aus `smooth_stone`-Platten 2×1 mit Grasfugen, gerade (Einschätzung).

```
Draufsicht (y=0 bündig). S=smooth_stone, A=polished_andesite, M=moss_block, .=grass_block
     x0 x1 x2 x3
z0   .  M  S  .
z1   .  .  M  .
z2   .  A  A  M
z3   .  M  .  .
z4   .  .  S  .
z5   .  .  M  A
z6   .  S  .  .
```

**Wirkung** mittel · **Aufwand** niedrig · **Stile** japanese, cherry, fantasy, modern · Quellen [45][46].

### T7 Bodentextur nach Ursache

**Beschreibung.**
- Weiche Flecken und „Finger“ statt Schachbrett [5]. Gras am lebenden Rand, Moos und Risse nah am Boden [11].
- Ufer erodieren mit coarse_dirt und Pfad [1].
- Vanilla: disk_gravel r 2–5, disk_grass r 2–6, moss_patch r 4–7 mit 30 % ausgefransten Rändern [36].

**Regeln.**
- Ursachenfelder:

| Ursache | Wo | Blöcke |
|---|---|---|
| Abnutzung | ≤ 2 von Tür, Tor, Weg | `coarse_dirt`, `dirt_path`, an der Tür `packed_mud` |
| Schatten | Traufe, Nordseite, Krone | `moss_block`, `rooted_dirt`, podzol (nicht in Registry), `moss_carpet`, `fern` |
| Nässe | ≤ 2 vom Teich | mud (nicht in Registry), sonst `rooted_dirt` |
| Trocken | mediterran, Südseite | `coarse_dirt`, short_dry_grass (nicht in Registry), sparsam `terracotta` [5] |

- Value-Noise (Skala 3–5) mit Schwelle: Cluster r 1–3, Einzelzellen ≤ 30 %. Mix 45/25/20/10 [5].
- `short_grass` 10–25 %; nordisch Gras:Farn 1:4 wie Vanilla patch_taiga_grass [36].
- Unterwuchs nach moss_vegetation [36]:

| Pflanze | Gewicht |
|---|---|
| `short_grass` | 50 |
| `moss_carpet` | 25 |
| tall_grass (nicht in Registry) | 10 |
| `azalea` | 7 |
| `flowering_azalea` | 4 |

```
Draufsicht Baumecke. T=Stamm, m=moss_block, r=rooted_dirt, ,=short_grass, f=fern, .=grass_block
     x0 x1 x2 x3 x4 x5
z0   .  .  ,  .  .  .
z1   .  m  m  f  .  ,
z2   ,  m  r  T  r  .
z3   .  f  m  r  m  m
z4   .  .  ,  m  f  .
```

**Wirkung** hoch · **Aufwand** niedrig · **Stile** alle (modern ≥ 85 % Gras) · Quellen [1][5][11][36].

### T8 Hecken mit Variation, Wallhecke

**Beschreibung.**
- 1–2 Laub auf Holz [19]. Real zufällig gemischt, ≥ 60 % Hauptart, ≤ 1 m breit [50].
- Wallhecke: Gehölz auf einem Erdwall von ~1 m Höhe und ~2 m Breite [51]. Grenzen niedrig oder porös [7].

**Regeln.**
- Laub `persistent=true`, Mischung 60/25/15.
- Höhe 1 am Weg und vor Fenstern, 2 als Grenze. 10–20 % Buckel +1 in Clustern, 5 % Dellen; nie 7 gleich hohe in Folge [1].
- Dicke 1–2; in 2 dicken Hecken alle 4–6 ein verdeckter `*_log[axis=y]` in der Innenreihe [19]. Enden 1 tiefer.
- Wallhecke: `grass_block` y=1, 2 breit, Hecke y=2.
- Grenze ≥ 2 innen, ≤ 75 % des Umfangs. Im Winter `snow[layers=1]` auf Laub.

```
Ansicht Nord, Wallhecke. O=oak_leaves, D=dark_oak_leaves, Z=azalea_leaves (persistent), G=grass_block
     x0 1 2 3 4 5 6 7 8 9 10
y=3   .  . O D . . . . O .  .
y=2   .  O O O D O Z O O D  .
y=1   G  G G G G G G G G G  G
Schnitt quer: außen z0 z1 innen (L=oak_log[axis=y] alle 4–6 in z1)
y=2            .   O  L   .
y=1            ,   G  G   f
```

**Wirkung** hoch · **Aufwand** niedrig · **Stile** alle (modern 1 Art, exakt) · Quellen [1][7][19][50][51].

### T9 Zäune, Mauern, Tore, Bogen

**Beschreibung.**
- Cottage-Gärten haben eine Einfriedung mit Pforte unter einem Rosenbogen, Holzzäune und Wege aus Ziegel oder Stein [43].
- Bauerngarten: Zaun, Mauer oder Hecke, Wegekreuz [44]. Pfosten alle 4–6 [13]. Jägerzaun ≈ 80 cm [55], also 1 Block.
- Tore brauchen keinen Halt; `in_wall` senkt sie zwischen Mauern [31] (setzt der Resolver).

**Regeln.**
- Pfosten alle 4–6 und immer an Ecken und am Tor, 1 höher als der Zaun.
- Am 2 breiten Weg zwei `*_fence_gate[facing=<Wegrichtung>,open=false]`; offenes Tor in 20 % der Fälle (Einschätzung).
- Bogen: Pfosten 3 hoch, darüber Laub mit 30 % `flowering_azalea_leaves` als Rosen-Ersatz [43].
- Steinmauer: `cobblestone_wall` + 30 % `mossy_cobblestone_wall`. Mediterran `sandstone` + `smooth_sandstone_slab`, Töpfe nur auf Vollblöcken.

```
Ansicht Nord. L=spruce_log[axis=y], F=spruce_fence, T=spruce_fence_gate[facing=north,open=false],
Z=azalea_leaves, Y=flowering_azalea_leaves, p=dirt_path, G=grass_block
     x0 1 2 3 4 5 6 7 8 9 10
y=4   .  . . . Z Y Z Z . .  .
y=3   .  . . . L . . L . .  .
y=2   L  . . . L . . L . .  L
y=1   L  F F F L T T L F F  L
y=0   G  G G G G p p G G G  G
```

**Wirkung** hoch · **Aufwand** niedrig · **Stile** alle (Tabelle im Abschnitt „Zäune, Mauern, Grenzen“; Laternen siehe Thema 18) · Quellen [13][31][43][44][55].

### T10 Blumenbeete: Drifts, Farbe, Höhenstaffel

**Beschreibung.**
- Rabatten bis ans Haus, Nachbarfarben harmonisch [43]. Drifts wiederholen [57]; begrenzte Palette je Beet [4].
- Für die Höhe Flieder, Rosenbusch, Sonnenblume [2]. Vanilla: 1–3 Arten pro Fleck [36].

**Regeln.**
- Beet 2–3 tief, 5–11 lang. Je Beet 1–3 Arten plus 30–40 % Grün.
- Drifts 3–7 gleiche, dieselbe Art 2× im Beet; 1 Akzentfarbe ≤ 10 %.
- Staffel: an der Wand `azalea`, `flowering_azalea`, bush/lilac/rose_bush/peony (nicht in Registry); Mitte Blumen; vorn `pink_petals[flower_amount=1..4]`, wildflowers (nicht in Registry), `short_grass`.
- Beet 60–80 % bepflanzt, offener Rasen 0–3 %. Azaleen nur hinten und als Gruppe ≥ 2.

```
Beet vor Nordfassade, Pflanzen auf y=1. a=azalea, f=fern, P=poppy, O=oxeye_daisy, C=cornflower, d=dandelion, ,=short_grass
d=+4 (vorn):    ,  O  O  .  ,  d  ,  .  O  O  ,
d=+3:           P  P  O  C  C  ,  P  P  P  C  .
d=+2 (Wand):    a  f  P  P  a  C  C  f  a  P  f
```

**Wirkung** hoch · **Aufwand** niedrig · **Stile** alle (Paletten im Abschnitt „Gärten“) · Quellen [2][4][36][43][57].

### T11 Nutzgarten nach Vanilla

**Vanilla-Vorbilder** [38]:
- `plains_small_farm_1` (7×9): Rahmen `oak_log`, Wasserrinne mittig, je Seite 2 Reihen `farmland[moisture=7]` mit `wheat[age=0..2]`, `composter` in der Ecke.
- `snowy_farm_1` (6×7): Rahmen aus `stripped_spruce_log`/`_wood`, `spruce_stairs` als Sitzkante, Laterne an Zaunarm über der Rinne.
- `taiga_small_farm_1`: Rahmen aus Bruchstein, ≈ 60 % bemoost; Kürbisse; Eingangspfosten aus `cobblestone_wall`.

**Spielregeln.**
- Wasser hydriert 4 weit; Acker mit Pflanze verfällt nicht durch Trockenheit; ein fester Block darüber macht Erde daraus [21].
- Wachstum ab Licht 9 [16]. Kein Schnee auf farmland [22].

**Bauerngarten:** Wegekreuz, Rondell in der Mitte, Buchs-Einfassung, Obstbäume nordseitig [44].

**Regeln.**
- Ab 120 Hofzellen 5×7 oder 7×9 hinten oder seitlich.
- Ohne water (nicht in Registry) Rinne aus `coarse_dirt`; farmland bleibt bestehen [21].
- medieval: Bauerngarten 9×9 mit Kreuz aus `dirt_path`.
- rustic: Vogelscheuche aus `spruce_fence` ×2, `hay_block`, `carved_pumpkin` (Einschätzung).
- Winter: `coarse_dirt` + `snow[layers=1]` statt Feld.

```
y=0:  L L L L L L L     y=1:  . . . . . . .
      L F F W F F L           . w w . w w .
      (… 7 Reihen …)          (…)
      L F F W F D L           . w w . w k .
      L L L L L L L           . . . . . . .
L=oak_log, F=farmland (nicht in Registry), W=water (nicht in Registry), D=dirt,
w=wheat (nicht in Registry), k=composter (nicht in Registry)
```

**Wirkung** mittel · **Aufwand** mittel (Registry) · **Stile** medieval, rustic, nordic · Quellen [16][21][22][38][44].

### T12 Büsche in drei Größen

- Dschungelbusch: „a single jungle log surrounded by oak leaves“ [32]; Stamm 1, `bush_foliage_placer` radius 2, height 2, offset 1 [37].
- Seit 1.21.5 gibt es `bush` als 1-Block-Pflanze auf Gras, Erde und Moos [26].
- **S:** bush (nicht in Registry), `azalea` oder 1 Laubblock.
- **M:** Stamm auf y=1; Laub y=1 5×5, y=2 3×3 (Ecken je 50 %), y=3 1 Block (Form aus den Parametern abgeleitet, Einschätzung).
- **L:** zwei M verschmolzen, Laub 70/30 gemischt.
- An Hausecken, Wegbiegungen, Torpfosten in Gruppen 1–3; nie in Reihe, außer formal.

```
y=1           y=2           y=3        L=Stilstamm[axis=y], O=Laub persistent, ?=50 %
? O O O ?     . . . . .     . . . . .
O O O O O     . ? O ? .     . . . . .
O O L O O     . O O O .     . . O . .
O O O O O     . ? O ? .     . . . . .
? O O O ?     . . . . .     . . . . .
```

**Wirkung** mittel · **Aufwand** niedrig · **Stile** alle · Quellen [26][32][37].

### T13 Kleine Bäume unter 10 Blöcken

**Vanilla** [37]:

| Baum | Stamm | Laub |
|---|---|---|
| Eiche | 4–6 | blob r=2, h=3 |
| Birke | 5–7 | blob r=2, h=3 |
| Fichte | 5 + 0–2 + 0–1 | r 2–3 |
| Azaleenbaum | gebogen 4–6 | random_spread r=3, h=2, azalea:flowering 3:1, `rooted_dirt` darunter |
| Kirsche | verzweigt | r=4, h=5, Ecklöcher 25 %, hängendes Laub 1/6 |

Kronen stehen 1 über dem höchsten Stamm [32].

**Custom** [58][59]:
- ab Höhe 3 zwei ungleiche Äste, Treppen an Knicken
- Laub kuppelig, unten weniger
- Stammfuß 2–3
- Zaunzweige; Fichten mit `spruce_fence`-Ästen

**Regeln.**
- Höhe 5–9. Wurzelanlauf aus 2–4 `*_log[axis=x|z]` auf y=1, `rooted_dirt` darunter.
- Stamm ≥ 3 von der Wand, nicht vor Fenstern. Gruppen 1 oder 3.
- Bäume zuletzt in Lücken füllen, wie der GDMC-Sieger [42].
- Winter: `snow[layers=1]` auf freien Laubebenen.

```
Kleine Eiche h=5 (Form abgeleitet aus blob r2/h3, Einschätzung). L=oak_log, O=oak_leaves, ?=50 %
y=6: . O .   y=5: ? O ?   y=3–4: ? O O O ?   y=1–2: L
     O O O        O L O          O O L O O  (5×5, Ecken ?)
     . O .        ? O ?          ? O O O ?
Ansicht Süd, Hausbaum. X=oak_log[axis=x] (Ast), f=oak_fence, r=Anlauf[axis=x], R=rooted_dirt
     x0 1 2 3 4 5 6
y=8   .  . O O O .  .
y=7   .  O O O O O  .
y=6   O  O O L O O  O
y=5   O  O O L X X  O   ← rechter Ast höher, länger
y=4   O  O X L . O  f   ← linker Ast tiefer, kürzer
y=3   .  O . L . .  .
y=2   .  . . L . .  .
y=1   .  . r L r .  .
y=0   G  G R R R G  G
```

**Wirkung** hoch · **Aufwand** mittel · **Stile** medieval/rustic (Eiche, Obst), nordic (Fichte), fantasy (Azalee), cherry (flach, hängendes Laub), japanese (geschnitten) · Quellen [32][37][42][58][59].

### T14 Felsen und Steine

**Beschreibung.**
- Vanilla `taiga_decoration_2` und `_4` sind Mini-Felsen aus Bruchstein und Treppen; `_3` ist ein Grenzstein aus Treppe und Mauer [38].
- Alte Taiga hat Findlinge aus `mossy_cobblestone` [36]. Japanische Gärten setzen Steine in Gruppen (Ryōan-ji: 15 Steine) [45].

**Regeln.**
- Findling 2×2 bis 3×4, zur Hälfte eingegraben.
- Mix `stone` 40 / `andesite` 25 / `cobblestone` 20 / `tuff` 10 / `mossy_cobblestone` 5 oben und an der Nordseite.
- Kanten aus `*_stairs` und `*_slab`; `moss_carpet` auf 30 % im Schatten.
- Am Fuß Gräser und `stone_button[face=floor]` als Kiesel [18].
- 1 großer und 1–2 kleine Steine, 2–3 Abstand; an Ecken, Biegungen, Ufern. Nie im Raster.

```
Vanilla taiga_decoration_2 (auf dem Boden)        Findling (Einschätzung)
Ebene 1: x0 x1   Ebene 2: x0 x1                   y=0       y=1       y=2
z0        .  s            .  .                     , T A C   . a T a   . . . .
z1        .  K            .  s                     A T T A   a T A T   . t M m
z2        e  K            .  n                     C A T M   . A T M   . . m .
K=cobblestone, s/e/n=cobblestone_stairs[half=bottom,facing=south/east/north]; A=andesite, T=stone, C=cobblestone,
M=mossy_cobblestone, a=andesite_stairs[facing=<zur Mitte>], t=stone_slab[type=bottom], m=moss_carpet
```

**Wirkung** mittel · **Aufwand** niedrig · **Stile** alle außer modern · Quellen [18][36][38][45].

### T15 Teich

**Beschreibung.**
- Ein Teich braucht einen Grund zu sein (Brücke, Schilf, Bank, Biegung) und einen unregelmäßigen Rand [4].
- Ufer aus Stein, Treppen, Stufen, Druckplatten und Knöpfen, dazu Zuckerrohr und Bambus [18]. Vegetation am Wasser dichter [17].
- `sugar_cane` braucht horizontal angrenzendes Wasser; Eis zählt nicht [29].
- `lily_pad` liegt auf Wasser oder Eis [30]. Eis schmilzt bei Licht > 11, Packeis nicht [23].

**Regeln.**
- 2–3 überlappende Ellipsen, 5–9 × 4–7, keine geraden Ränder > 4.
- Ufer 60 % Stein, 40 % Erde; 30 % `stone_stairs[facing=<Land>]`.
- Zuckerrohr in Gruppen von 2–3, 2–3 hoch; Seerosen auf 10 % der Fläche; Bank oder Trittsteine als Ziel.
- Ohne water (nicht in Registry) nur Winterteich: Mitte `ice`, sonst `packed_ice`, wo Licht ≥ 12. Schnee nur auf dem Ufer [22]; Zuckerrohr entfernen.

```
Draufsicht y=0. w=water (nicht in Registry)/Winter ice, l=lily_pad (nicht in Registry), k=stone, a=andesite,
c=coarse_dirt, ,=short_grass; y=1: Treppen auf k, sugar_cane (nicht in Registry) auf c am Wasser
     x0 1 2 3 4 5 6 7
z0    .  , . k a . , .
z1    ,  a w w w k c ,
z2    k  w w l w w a .
z3    c  k w w w w w k
z4    .  , a k w w k ,
```

**Wirkung** mittel–hoch · **Aufwand** mittel · **Stile** fantasy, japanese, cherry, large/huge · Quellen [4][17][18][22][23][29][30].

### T16 Brunnen

- Vanilla `plains_fountain_01` (9×9): Ring aus `dirt_path`; 5×5 `cobblestone`; Rand um 3×3 Wasser mit Mittelsäule; Fackeln an den Ecken; Glocke [38].
- Der Bauerngarten setzt die Wasserstelle in die Kreuzmitte [44]; Brunnen sind Fokuspunkte [19].
- Hausbrunnen 3×3: Ring `cobblestone` + 30 % `mossy_cobblestone`, Mitte water (nicht in Registry) oder `ice`, Eckpfosten `*_fence` 2 hoch, Satteldach aus `*_stairs`, First `*_slab`, `iron_chain` mittig. 1 Brunnen pro Grundstück, auf Achse oder Kreuzung.

```
Ansicht Nord: y=4 S H S / y=3 F C F / y=2 F . F / y=1 K w M
S=spruce_stairs[facing=east|west], H=spruce_slab[type=bottom], F=spruce_fence, C=iron_chain[axis=y]
```

**Wirkung** mittel · **Aufwand** niedrig · **Stile** medieval, rustic, nordic, mediterranean (`smooth_sandstone`) · Quellen [19][38][44].

### T17 Requisiten: Holz, Heu, Fässer, Feuer, Bank, Briefkasten

**Beschreibung.**
- Holzstapel, Schuppen und kleiner Zaunhof machen das Haus „bewohnt“ [13]. Die Holzmiete ist rund und verjüngt sich, ≈ 2 m [52].
- Vanilla [36][33]: `pile_hay` (rotierte Achsen, ≈ 8 Blöcke), `pile_pumpkin` 19:1 `jack_o_lantern`, `pile_snow`, `pile_ice` (packed:blue 5:1).
- `taiga_decoration_6`: `campfire` auf `hay_block`, ringsum 4 offene Falltüren [38].
- Schubkarre: Zauntor + Komposter, 1×3 [34].

**Regeln.**
- **Holzstapel:**
  - An der Seitenwand unter der Traufe, d=+2..+3, 3–5 lang, 2–3 hoch.
  - Achse quer zur Wand (Stirnseiten zeigen nach außen); 70 % Stilholz, 20 % `stripped_*`, 10 % zweite Art.
  - Oben `*_slab`, daneben Hackklotz `oak_log[axis=y]`.
- **Heu:** 5–9 Blöcke, Achsen y 50 / x 25 / z 25.
- **Fässer:** 2–3 `barrel[facing=up]`, eines gestapelt, an Tür oder Hof.
- **Feuer:** `campfire[lit=true]` gibt Licht 15 und schmilzt Schnee (Thema 18).
- **Bank:** 2–3 `*_stairs[facing=<Lehne>]`, an den Enden `*_trapdoor[open=true,facing=<außen>]`, Blick auf ein Ziel. Schilder scheiden aus (Text-Entity) [34].
- **Briefkasten** (Einschätzung): `spruce_fence` y=1 + `barrel[facing=<Straße>]` y=2 am Tor.
- **Laternenpfahl:** am Tor und an Biegungen, nicht als Spiegelpaar; Holz aus Rolle `frame` (Thema 18).

```
Ansicht Nord, Holzstapel: y=3 . h h h . / y=2 . Z Y Z Z / y=1 Z Z B Z Y U
Z=spruce_log[axis=z], Y=stripped_spruce_log[axis=z], B=birch_log[axis=z], h=spruce_slab[type=bottom], U=oak_log[axis=y]
Heuhaufen Ebene 1: . H X . / Z H H X / . X Z .   Ebene 2: Mitte H   (H/X/Z=hay_block[axis=y/x/z])
Bank (Blick Nord): w S S e   (S=spruce_stairs[facing=south], w/e=spruce_trapdoor[open=true,facing=west/east])
```

**Wirkung** mittel–hoch · **Aufwand** niedrig · **Stile** rustic, medieval, nordic, fantasy, mediterranean (Fässer, Töpfe); modern ohne Heu · Quellen [13][33][34][36][38][52].

### T18 Winterversion des Grundstücks

**Beschreibung.**
- Schnee schmilzt bei Licht ≥ 12. Ab `layers ≥ 2` wird Gras zu Erde. Kein Schnee auf Eis, Packeis oder farmland [22][24].
- `dirt_path` hat keine volle Oberseite und trägt keinen Schnee (Validator `snowCanRestOn`).
- Vanilla `snowy_meeting_point_1` legt Schnee nur auf Grasränder [38].

**Regeln.**
- Boden `grass_block` (`snowy=true` über den Resolver) + `snow[layers=1]`. `snow_block` nur als Wehe oder Haufen (`pile_snow` [36]).
- Wehen `layers=2..3` im Lee (Nordseite) von Hecken und Wänden, auf `coarse_dirt` (Einschätzung).
- Weg: Mitte frei, Schultern 1, außen 1–2 → Spur.
- Laub mit 1 Schicht. Blumen und Zuckerrohr entfallen. Teich nach T15. Holzstapel größer, Schnee auf Heu und Fässern.

```
Schnitt quer über den Weg. P=dirt_path, G=grass_block[snowy=true], c=coarse_dirt, 1/2=snow[layers=1/2]
Quer: -3 -2 -1  0 +1 +2 +3
y=1    2  1  1  .  .  1  1
y=0    c  G  G  P  P  G  G
```

**Wirkung** hoch · **Aufwand** niedrig · **Stile** alle (winter, christmas) · Quellen [22][24][36][38].

---

## Geländeanschluss und Terraforming-Grundsätze

1. **Dem Gelände folgen.**
   - „Flatten only what you absolutely need“ [13]; Terrassen steigen ab [6].
   - GDMC verlangt Anpassung „without changing it too much“ [41]; Planieren umgeht die Anpassung [40].
   - Ohne Weltdaten heißt das: bündig einsetzen (T1), Höhen im Modell erzeugen (T3, T4).
2. **Nichts schwebt optisch.** Keine Fundamentplattform [42]; Decks und Brücken brauchen Uferanker [12].
3. **Nie > 7 gerade bei Organischem** (Rand, Hecke, Weg, Teich) [1].
4. **Gelände doppellagig** [1], also mit Unterbodenschicht: Teiche bis 2 tief, eingetiefte Wege, Terrassen.
5. **Höhen erklären** mit Mauer, Stufe oder Böschung; Wege ohne Sprung ≥ 2 [7][40].
6. **Struktur im Takt, Natur unregelmäßig** [6].
7. **Material passend zu Stil und Biom** [41]; der GDMC-Sieger wurde für zu wenig Materialanpassung kritisiert [42].

## Wege – Paletten je Stil

Startwerte. Mitte 80–90 %, Schultern 50/30/15/5 [3], Antritt = 3 Felder vor der Tür.

| Stil | Mitte | Schultern | Akzent | Antritt | Form |
|---|---|---|---|---|---|
| medieval | `dirt_path` | `coarse_dirt`, `cobblestone`, gravel (nicht in Registry) | `mossy_cobblestone` | `cobblestone`, `stone_bricks` | gekurvt, 3 |
| fantasy | `dirt_path` | `moss_block`, `rooted_dirt` | `mossy_stone_bricks` | `mossy_cobblestone` | stark gekurvt |
| rustic | `dirt_path` | `coarse_dirt`, `rooted_dirt`, `packed_mud` | `cobblestone` | `cobblestone` | gekurvt, 2–3 |
| nordic | `dirt_path` | `coarse_dirt`, `cobbled_deepslate` | `tuff` | `cobbled_deepslate` | gekurvt |
| japanese | Trittsteine `smooth_stone` | `moss_block` | `andesite` | `polished_andesite` 2×1 | Zickzack |
| cherry | `stone_bricks` | `mossy_stone_bricks`, `moss_block` | `pink_petals` am Rand | `stone_bricks` | sanft |
| modern | `smooth_stone` | Grasfugen, Kante `polished_andesite` | – | `smooth_stone` | gerade, Raster |
| mediterranean | `smooth_sandstone` | `sandstone`, `coarse_dirt` | `terracotta` | `cut_sandstone` | leicht gekurvt |

Breiten: Fußweg 2–4 [35], Vanilla-Straße 3 [38], Dorfwege 3 [7]. 2 breit wirkt im kleinen Hof großzügig, neben großen Häusern zu schmal [4].

## Gärten – Blumen, Sträucher, Bäume je Stil

**Farben der Registry-Blumen.**

| Farbe | Blöcke |
|---|---|
| rot | `poppy`, `red_tulip` |
| gelb | `dandelion` |
| weiß | `oxeye_daisy`, `white_tulip`, `lily_of_the_valley` |
| blau | `cornflower` |
| violett | `allium` |
| rosa | `pink_tulip`, `pink_petals` |

**Im Spiel, aber nicht in Registry:** azure_bluet, blue_orchid, orange_tulip, torchflower, wildflowers [28], lilac, rose_bush, peony, sunflower (doppelt hoch), bush [26], firefly_bush [27]. firefly_bush hat Licht 2 und schmilzt keinen Schnee.

| Stil | Beet (1–3 Arten + Grün) | Akzent | Sträucher und Bäume |
|---|---|---|---|
| medieval | poppy, oxeye_daisy, cornflower | dandelion | Eiche, Obstbaum, niedrige Buchs-Hecke (oak_leaves) |
| fantasy | allium, pink_tulip, lily_of_the_valley | flowering_azalea | Azaleenbaum, azalea_leaves-Büsche |
| rustic | dandelion, poppy, cornflower, Gemüse | oxeye_daisy | Eiche, Birke, Heu, Kürbis |
| nordic | lily_of_the_valley, white_tulip, fern (1:4 [36]) | cornflower | kleine Fichte, spruce_leaves-Hecke |
| japanese | kaum Blumen; moss, fern, geschnittene azalea [45] | pink_petals | dark_oak/azalea geschnitten, Steine |
| cherry | pink_petals (Vanilla: nur Blütenblätter, 1–4 [36]), pink_tulip, white_tulip | allium | kleiner Kirschbaum |
| modern | white_tulip in Reihen, short_grass | – | 1 Solitärbaum |
| mediterranean | red_tulip, allium (Lavendel-Ersatz), oxeye_daisy, potted_* | poppy | hoch angesetzte Krone, Töpfe |

`flower_plain` trennt per Noise Wiesenblumen von Tulpen [36]: im Rasen Flecken einer Familie, kein Konfetti.

## Zäune, Mauern, Grenzen je Stil

| Stil | Grenze vorn | Seiten | Hecke 60/25/15 | Tor |
|---|---|---|---|---|
| medieval | `spruce_fence` + `spruce_log`-Pfosten | Hecke 2 | oak/dark_oak/azalea | Doppeltor + Bogen |
| fantasy | Laubbogen + Hecke | Wallhecke | azalea/flowering_azalea/oak | `dark_oak_fence_gate` |
| rustic | `oak_fence` 1 hoch [55] | offen, Holzstapel | oak/birch/azalea | offen 20 % |
| nordic | `spruce_fence` + `cobbled_deepslate_wall` | Wallhecke | spruce/dark_oak/oak | `spruce_fence_gate` |
| japanese | `bamboo_fence` + `dark_oak_log` | Hecke 1, geschnitten | dark_oak/azalea | `bamboo_fence_gate` |
| cherry | `stone_brick_wall` 1 hoch | Hecke | cherry/azalea/oak | `cherry_fence_gate` |
| modern | Hecke 1 Art, exakt | `polished_andesite_wall` | oak 100 % | Lücke |
| mediterranean | `sandstone` + `smooth_sandstone_slab` + Töpfe | `sandstone_wall` | azalea/oak | `acacia_fence_gate` |

## Bodentextur-Mischungen je Stil

| Stil | Haupt | Übergang | Gegenblock | Akzent |
|---|---|---|---|---|
| medieval | grass_block | coarse_dirt | rooted_dirt | moss_block |
| fantasy | grass_block | moss_block | rooted_dirt | moss_carpet |
| rustic | grass_block | coarse_dirt | packed_mud (Hof) | rooted_dirt |
| nordic | grass_block | coarse_dirt | podzol (nicht in Registry)/rooted_dirt | moss_block |
| japanese | moss_block/grass_block | gravel (nicht in Registry)/andesite | – | moss_carpet |
| cherry | grass_block | moss_block | rooted_dirt | pink_petals |
| modern | grass_block ≥ 85 % | – | – | – |
| mediterranean | grass_block | coarse_dirt | rooted_dirt | short_dry_grass (nicht in Registry) |

## Wie die Szene lebendig wird

1. **Tätigkeitsinseln statt Streudeko:** Ankommen (Tor, Briefkasten, Laterne), Arbeiten (Holz, Fässer), Ruhen (Bank), Ernten (Beete) [4][13].
2. **Budgets je 100 Hofzellen** (Einschätzung aus 50/30/20 [4]):
   - 1 Anker (Baum, Brunnen, Teich, Weihnachtsbaum)
   - 2–3 Requisitengruppen
   - 3–6 Pflanzcluster
   - ≥ 40 % ruhiger Rasen
   - Requisiten an Kanten, nicht mitten auf dem Rasen [3]
3. **Nutzungsspuren:** Trampelpfad [53], abgetretene Stellen (`coarse_dirt`) an Tor, Bank und Holzstapel, ein offenes Tor.
4. **Hierarchie:** Wege und Lichter führen zum Anker; Licht nur an Route und Fokus, kein Raster [4][15].
5. **Asymmetrie** im Garten, kunstvolle Unregelmäßigkeit [43]; modern und japanisch bewusst formal.
6. **Dichteverlauf:** am Haus gepflegt, zum Rand wilder; am Wasser dichter [17].
7. **Saison:**
   - Heu, Kürbisse, leaf_litter (nicht in Registry) [25] [15].
   - Umgestürzter Stamm in der wilden Ecke: Vanilla 4–7 lang, Stumpf mit Ranken [37], Lücke 1–2 zum Stumpf [32], `moss_carpet` statt Pilzen.
8. **Narrative:** GDMC bewertet, ob eine Siedlung erzählt, wer dort lebt [41].

---

## Fehler, die Profis vermeiden

1. Ein Rechteckrand mit geschlossenem Laubring genau am Modellrand.
2. Eine schwebend wirkende Grundplatte [42].
3. Wege als Zufallsmix oder Schachbrett ohne Laufspur [3][5].
4. Wege ohne Ziel, die am Rand abbrechen [3].
5. Blumen gleichmäßig verstreut [4]; Einzel-Azaleen in Reihe am Sockel.
6. Ein Treppenring als einziger Sockelübergang, Gras hart an Stein.
7. Leerer Rasen ohne Anker in einem zu kleinen Hof [10].
8. Lichter im Raster [4][15].
9. Felsen, Büsche und Bäume im Raster oder gleich groß.
10. Winter als `snow_block`-Platte; Schnee auf Weg, Eis oder Acker; Zuckerrohr neben Eis [22][29].
11. Bäume an der Fassade oder vor Fenstern.
12. Materialien ohne Rolle; starke Akzente überall statt an Fokuspunkten [3][4].
13. Höhenwechsel ohne Stufe oder Mauer; Sprünge ≥ 2 im Weg [40].

---

## Empfehlungen für den Generator

Priorisiert. Je Punkt: Was · Modul · Daten oder Regel · Akzeptanz.

1. **Bündiger Einbau und Randauflösung (T1).**
   - Modul: `landscape.ts`; Importanleitung bzw. Schematic-Offset im Export.
   - Regel: Ringe 0–1 nur Gras, Grenzen ab r ≥ 3, Rausch-Luftring im Modus „aufgesetzt“.
   - Akzeptanz: Außenringe nur Gras, Gräser, Luft oder Weg; kein gerader Randlauf > 7; Importtest ohne sichtbare Plattenstufe.
2. **Wegsystem (T5, T6).**
   - Modul: neues `generator/paths.ts`.
   - Daten je Stil `path = {center, shoulder, edge, accent, landing, form}`. Regel: Polylinie, Scheibenpinsel, Querlagen, Gradient, Nebenwege.
   - Akzeptanz:
     - 4-zusammenhängend Tür → Rand, 0 Löcher
     - Mitte ≥ 70 % Hauptblock, kein 2×2-Schachbrett
     - kein Lauf > 7 (außer `straight`)
     - ab 150 Hofzellen ≥ 1 Nebenweg
     - 0 Validator-Reparaturen
3. **Landschaft als Stildaten.**
   - Modul: `src/core/style/` (Tabelle `landscape`), Rolle `path` aus `palettes.ts`, Zaunholz aus `frame`/`beam` statt `'spruce'` (`generateBuilding.ts:141`).
   - Akzeptanz: keine Block-Literale in `landscape.ts` außer Fallbacks; Test über 8 Stile, Wegmitte = Rolle `path`.
4. **Sockelübergang je Fassade (T2).**
   - Modul: `house/walls.ts` (`buildPlinth`) und `landscape.ts`.
   - Regel: Schürze nur Tür ± 2 und Ecken, sonst A, B oder C je Stil.
   - Akzeptanz: ≤ 50 % des freien Sockelumfangs mit Treppen, ≥ 30 % mit Pflanzung oder Streifen; B nur bei P ≥ 2.
5. **Grundstück skaliert.**
   - Modul: `house/buildHouse.ts:31, 151`.
   - Daten: MARGIN small 5, medium 7, large 9, huge 11; vorn +3..+5 (Einschätzung, Vorgarten ≥ 7×7 [4]).
   - Akzeptanz: freier Hof ≥ 1,0× Grundfläche ab medium; `MAX_DIMENSIONS` eingehalten.
6. **Gartenzonen und Beete (T4, T10).**
   - Modul: neues `generator/garden.ts`.
   - Regel: Zonen, Drifts 3–7, 1–3 Arten, Staffel, Budgets.
   - Akzeptanz (Hof ≥ 200): 1 Anker, ≥ 2 Beete, ≥ 40 % ruhiger Rasen, keine Einzel-Azalee am Sockel.
7. **Hecke, Zaun, Tor (T8, T9).**
   - Modul: `garden.ts`. Daten aus der Tabelle „Zäune, Mauern, Grenzen“.
   - Regel: ≥ 2 eingerückt, ≤ 75 % des Umfangs, Tor mit Pfosten.
   - Akzeptanz: keine einartige 1 hohe Ringhecke; Tor am Hauptweg; nie 7 gleich hohe Kronen in Folge (außer modern).
8. **Naturvorlagen (T12–T17).**
   - Modul: neues `src/core/templates/nature.ts`, wie W01/T01 (Rolle, Form, Offset, drehbar).
   - Daten: Büsche B1–B3, Bäume TR1–TR5, Felsen R1–R3, Holzstapel, Heu, Bank, Brunnen.
   - Regel: Baum ≥ 3 von der Fassade, nicht vor Fenstern.
   - Akzeptanz: je Vorlage 0 Reparaturen, Schwebe-Lint grün.
9. **Bodentextur nach Ursache (T7).**
   - Modul: `landscape.ts`. Regel: Value-Noise plus Ursachenfelder.
   - Akzeptanz: Gras 55–75 % (modern ≥ 85 %), ≥ 3 Cluster mit ≥ 3 Zellen, Einzelzellen ≤ 30 %.
10. **Winterregeln (T18).**
    - Modul: `landscape.ts:59`, `festive.ts:addSnowCover`. Winterteich auch bei `christmas`.
    - Akzeptanz:
      - `snow_block` auf y=0 nur in Wehen
      - kein Schnee auf `dirt_path`, Eis, farmland oder bei Licht ≥ 12
      - kein `layers ≥ 2` auf Gras
11. **Registry-Ergänzungen.**
    - Modul: `families.ts`, `shapes.ts`, `validator.ts`.
    - Daten: alle Lücken aus Schwäche 15; neue Formklassen `double_plant` und `crop`.
    - Regeln: sugar_cane nur neben Wasser [29], lily_pad auf Wasser oder Eis [30], Feldfrüchte auf farmland, gravel nicht über Luft.
    - Akzeptanz: Registry-Test grün, je Regel ein Unit-Test, weiterhin 0 Reparaturen.
12. **Festschmuck als Anker.**
    - Modul: `generateBuilding.ts:143–146`, `festive.ts:164–172` (Abstimmung mit dem Thema Festschmuck).
    - Akzeptanz: Baum ≥ 2 von Hecke und Rand, nicht in einer Ecke; Geschenke im Radius ≤ 3 um den Baum.
13. **Terrasse und Unterboden (T3).**
    - Modul: `buildHouse.ts` (Plan um T anheben), `VoxelBuilder`-Maße, Importdoku.
    - Akzeptanz: Kappe durchgehend, Stufen an jeder Wegkante, Schwebe-Lint grün, Teich bis 2 tief.
14. **Neue Lints** in `analysis/buildingLints.ts`:
    - Grenzelemente auf dem Modellrand = 0
    - größte Leer-Rasenfläche ≤ 60 %
    - Weg zusammenhängend, ohne Schachbrett
    - Akzeptanz: laufen in der bestehenden Testmatrix über alle Stile, Größen und Themen.

---

## Quellen

1. https://www.minecraft.net/en-us/article/tutorial--tips-for-landscaping-and-terraforming – BlueNerd: nie > 7 gerade; Ufer mit coarse_dirt und Pfad; Gelände doppellagig.
2. https://www.minecraft.net/en-us/article/make-your-houses-better – Hausbasis mit Stufen; Büsche, Teiche, Terraforming; hohe Blumen für Höhe.
3. https://minecraftgradient.blog/minecraft-path-gradient/ – Wegmitte lesbar, Schultern rau; 50/30/15/5; Zufallsmix als Fehler.
4. https://minecraftgradient.blog/minecraft-garden-ideas/ – Route, Beet, Anker, Licht; 50/30/20; Blumen gruppieren; Garten 7×7–7×9.
5. https://minecraftgradient.blog/sand-to-grass-gradient/ – 45/25/20/10; Flecken statt Schachbrett; Ursache bestimmt Block.
6. https://minecraftgradient.blog/minecraft-mountain-base/ – Terrassen folgen dem Hang; Struktur rhythmisch, Natur frei.
7. https://minecraftgradient.blog/minecraft-village-ideas/ – Wege 3 breit; Grenze porös; Stützmauern erklären Höhen.
8. https://minecraftgradient.blog/minecraft-house-design/ – Fundament trennt vom Gelände, vorziehen; Vorgarten Teil des Entwurfs.
9. https://minecraftgradient.blog/minecraft-starter-house-by-biome/ – Am Hang tiefe Seite anheben oder Fundament abtreppen.
10. https://minecraftgradient.blog/minecraft-barn-design/ – Zu kleiner Hof: „a model placed on grass“.
11. https://minecraftgradient.blog/minecraft-block-gradient-guide/ – Gras am lebenden Rand; Moos und Risse unten clustern.
12. https://minecraftgradient.blog/minecraft-bridge-design/ – Decks brauchen Uferanker.
13. https://minecraft.how/blog/post/build-cottage-minecraft – Fundament folgt Gelände; Hochbeete und Senken auf flachem Land; Holzstapel, Zaunhof; Pfosten alle 4–6.
14. https://minecraft.how/blog/post/how-build-snow-cabin-minecraft – Steinfundament leicht erhöht; rhythmischer Weg; Wasserzugang.
15. https://minecraft.how/blog/post/build-medieval-town-minecraft – Straßen eben, Gelände organisch; Baumgruppen; Heu; gezieltes Licht.
16. https://minecraft.how/blog/post/how-to-build-minecraft-garden – Wasser im Abstand 4; Licht ≥ 9; Ränder aus Zäunen und Stufen.
17. http://web.archive.org/web/20251011190128/https://www.planetminecraft.com/blog/landscaping-guide---minecraft-tutorial/ – Vegetation am Wasser dichter, nach außen dünner.
18. http://web.archive.org/web/20250720165023/https://www.planetminecraft.com/blog/how-to-terraform-your-lakes-ponds/ – Teichufer aus Stein, Treppen, Stufen, Druckplatten, Knöpfen; Zuckerrohr.
19. https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions – Hecke = 1–2 Laub auf Holz; Brunnen als Mittelpunkt.
20. https://minecraft.wiki/w/Tutorial:Walls_and_buttresses – Stützmauertypen; Ha-ha ½ Block tiefer; Mauern unten dicker.
21. https://minecraft.wiki/w/Farmland – Verfall nur ohne Pflanze; fester Block macht Erde; Hydration 4.
22. https://minecraft.wiki/w/Snow – Schmilzt bei Licht ≥ 12; nicht auf Eis oder farmland; dicke Schichten → Erde.
23. https://minecraft.wiki/w/Ice – Eis schmilzt bei Licht > 11, Packeis nicht.
24. https://minecraft.wiki/w/Grass_Block – `snowy`; Gras breitet sich nur auf dirt aus; Biomfarbe.
25. https://minecraft.wiki/w/Leaf_Litter – `segment_amount`, `facing`; 1.21.5.
26. https://minecraft.wiki/w/Bush – 1.21.5; auf Gras, Erde, Moos.
27. https://minecraft.wiki/w/Firefly_Bush – 1.21.5; Licht 2; am Wasser.
28. https://minecraft.wiki/w/Wildflowers – 1.21.5; `flower_amount 1–4`, `facing`.
29. https://minecraft.wiki/w/Sugar_Cane – Nur neben Wasser oder frosted ice; natürlich 2–4 hoch.
30. https://minecraft.wiki/w/Lily_Pad – Auf Wasser, Eis oder frosted ice.
31. https://minecraft.wiki/w/Fence_Gate – `in_wall` senkt um 3 Pixel; kein Halt nötig.
32. https://minecraft.wiki/w/Tree – Kronen 1 über dem Stamm; Dschungelbusch = 1 Stamm + Eichenlaub; liegende Stämme 1–2 vom Stumpf.
33. https://minecraft.wiki/w/Village/Structure/Blueprints – Dorf-Deko; Heu in Clustern von etwa 8.
34. https://de.minecraft.wiki/w/Anleitungen/Au%C3%9Fendekoration – Laub im Falltür-Topf; Bänke; Teiche; Schubkarre 1×3.
35. https://de.minecraft.wiki/w/Anleitungen/Stra%C3%9Fenbau – Fahrspur 3–5, Fußweg 2–4; Bruchstein-Pflaster.
36. https://github.com/misode/mcmeta/tree/1.21.11-data/data/minecraft/worldgen/configured_feature – Selbst ausgewertet: pile_*, forest_rock, moss_patch, moss_vegetation, patch_taiga_grass, patch_bush, flower_plain/meadow/cherry, disk_gravel/grass.
37. https://github.com/misode/mcmeta/tree/1.21.11-data/data/minecraft/worldgen/configured_feature – Baum-Features: oak, birch, spruce, pine, cherry, azalea_tree, jungle_bush, fallen_oak/spruce_tree.
38. https://github.com/misode/mcmeta/tree/1.21.11-data/data/minecraft/structure/village – NBT selbst dekodiert:
    - Höfe: plains_small_farm_1, snowy_farm_1, taiga_small_farm_1
    - Deko: plains_accessory_1, taiga_decoration_1–6
    - Plätze: plains_fountain_01, plains_meeting_point_4 (Boden 54 % Gras, 30 % Pfad, 10 % Bruchstein), snowy_meeting_point_1
    - Straßen
39. https://github.com/misode/mcmeta/tree/1.21.11-data/data/minecraft/tags/block – Tags dirt, small_flowers, flowers, snow_layer_can_survive_on.
40. https://arxiv.org/abs/2103.14950 – GDMC First Year Report: A*-Straßen, Sprünge ≥ 2 unpassierbar, Straßenqualität nimmt zum Rand ab, Planieren = tabula rasa.
41. https://gendesignmc.wikidot.com/wiki:evaluation – GDMC-Kriterien Adaptivität, Material, Narrative.
42. https://arxiv.org/abs/2309.10871 – GDMC-Sieger 2022: Kritik an „floating foundation platforms“; Mauern folgen Höhenlinien; Bäume füllen Lücken zuletzt.
43. https://en.wikipedia.org/wiki/Cottage_garden – Informell, dicht; Rabatten bis ans Haus; Holzzäune; Rosenbogen; Ziegel- und Steinwege.
44. https://de.wikipedia.org/wiki/Bauerngarten – Wegekreuz, Rondell, Buchs-Einfassung, Einfriedung, Obstbäume nordseitig.
45. https://en.wikipedia.org/wiki/Japanese_garden – Gealterte Materialien, Steine, Kies, Moos; wenige Blumen; Ryōan-ji.
46. https://en.wikipedia.org/wiki/Stepping_stones – Trittsteine; iso-watari.
47. https://en.wikipedia.org/wiki/Dry_stone – Große Steine unten; Bindersteine ragen vor; Decksteine.
48. https://de.wikipedia.org/wiki/Trockenmauer – Basis ⅓ bis ½ der Höhe; ⅓ Bindersteine.
49. https://en.wikipedia.org/wiki/Retaining_wall – Schwergewichtsmauer mit Rückneigung.
50. https://en.wikipedia.org/wiki/Hedge – Gemischte Hecken, ≥ 60 % Hauptart, ≤ 1 m breit.
51. https://de.wikipedia.org/wiki/Wallhecke – Knick auf Erdwall, ~1 m hoch, ~2 m breit.
52. https://de.wikipedia.org/wiki/Holzmiete – Rundes Brennholzlager, ~2 m.
53. https://en.wikipedia.org/wiki/Desire_path – Trampelpfade zeigen tatsächliche Wege.
54. https://de.wikipedia.org/wiki/Vorgarten – Grünfläche, Zuweg, Einfriedung zur Straße.
55. https://de.wikipedia.org/wiki/Staketenzaun – Lattenzaun; Jägerzaun etwa 80 cm.
56. https://de.wikipedia.org/wiki/Sockel_(Architektur) – Sockel steht vor, Spritzwasserschutz, ≥ 30 cm (früher 50).
57. https://en.wikipedia.org/wiki/Garden_design – Drifts aus 1–2 Pflanzen wiederholt; Kiesflächen als Kontrast.
58. https://diamondlobby.com/minecraft/how-to-build-custom-tree-in-minecraft/ – Ungleiche Äste ab 3; Treppen an Knicken; Krone kuppelig; Stammfuß; Zaunzweige.
59. https://www.sportskeeda.com/minecraft/5-best-custom-tree-designs-minecraft-bedrock-edition-beginners – Fichten mit spruce_fence-Ästen.
60. https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/worldgen/processor_list/street_snowy_or_taiga.json – dirt_path → Gras mit p=0,2 (Ebene 0,1); über Wasser oder Eis Bretter.
