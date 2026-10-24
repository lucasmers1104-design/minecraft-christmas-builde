# 07 – Blockpaletten, Farbverläufe, Texturkontrast und Verwitterung

Stand 2026-10-23. Thema: Wie ein Generator Blöcke nach Helligkeit, Farbe und Texturrauschen auswählt, mischt und verwittern lässt, damit Wände und Dächer wie von erfahrenen Buildern wirken.

**Methode.** Baut auf `paletten.md` und `helligkeit_texturen.tsv` auf und wiederholt sie nicht. Neu sind vier Dinge:
- **Eigene Messung** von 150 Vanilla-1.21.11-Texturen aus mcmeta [7], gleiches Verfahren wie die TSV (L\*, C, H). Neu dazu kommt **HF**, der mittlere Helligkeitssprung zwischen Nachbarpixeln. HF ist ein Maß für das Texturrauschen.
- Farbabstände als **ΔE00** (CIEDE2000) statt nur ΔL. Ein ΔE00 von etwa 1 gilt als gerade sichtbarer Unterschied [38].
- **Mojangs eigene Verwitterungsdaten** aus den `processor_list`-Dateien [5][6] und der Stronghold-Mischung [8].
- Eine **Nachsimulation** von `texturing.ts`.

Grenzen: Das Budget für Websuchen war nach wenigen Abfragen erschöpft, weil es sich alle Agents teilen. Reddit und Planet Minecraft waren nicht erreichbar. Danach habe ich nur noch bekannte URLs direkt abgerufen. Was keine Quelle hat, ist als **Einschätzung** markiert.

## Kurzfassung

Nach Wirkung sortiert:

1. **Das Dach ist die größte sichtbare Fläche und heute einfarbig.** In `roofEngine.ts:249` gibt es genau ein Material pro Dachabschnitt. Profis nehmen auf Holzdächern „mindestens zwei Holzarten: eine Grundfarbe und eine Alternative für Verwitterung“ [2]. Sonnenbleiche gehört an den First, Wasserschäden an Traufe und Kehlen [2], „wo der Regen sich sammelt“ [4]. Echter Schiefer streut „von hell bis dunkel“ [36][44].
2. **Die Verwitterung erzeugt ein waagerechtes Band (Sandwiching).** Nachsimuliert für Materialien mit zwei Varianten (`texturing.ts`): Die unterste Reihe ist zu **70 %** verwittert, ab Höhe 3 sind es **0 %**. Bei drei Varianten sind in Reihe 0 **84 %** nicht sauber. Dazu kommt ein zweites Band über dem Sockel, weil `walls.ts:152` die Höhe ab Geschossboden misst. Zum Vergleich: Mojang moost Dorfhäuser zu **10 %** [5][6], das Stronghold mischt 45/30/20/5 [8]. Sandwiching gilt als Kardinalfehler [1].
3. **Rissige Varianten sind farblich unsichtbar.** Gemessen: cracked_stone_bricks ΔE00 1,6, cracked_deepslate_bricks 2,0, cracked_deepslate_tiles 0,7. Sie liefern nur Textur. Moos ist dagegen ein Chroma-Sprung: mossy_stone_bricks 9,9, mossy_cobblestone 13,5. Beide gehören also in **getrennte Kanäle**: Feuchte (Moos) unten und an der Nordseite, Schaden (Risse) an Kanten und Öffnungen.
4. **Texturrauschen ist die zweite Achse neben der Helligkeit.** Gemessene HF-Werte: white_concrete 0,3, white_terracotta 0,7, stripped logs 1,5–2,9, stone_bricks 4,2, spruce_planks 4,9, oak_planks 7,5, cobblestone 11,2, diorite 12,8. Große Flächen sollten HF 3–7 haben. Laute Blöcke gehören in Sockel, Weg oder ≤ 30 % Beimischung. Flächen mit HF < 1 brauchen Relief oder einen Mischpartner, sonst wirken sie wie Plastik.
5. **Kontrastregeln in ΔE00 statt ΔL.** In 8 der 19 Paletten liegt der Abstand Rahmen–Dach unter ΔE00 8. Der Rahmen verschwindet dann an der Traufe im Dach.
   - spruce_log ↔ dark_oak_planks 2,1 in `rustic_spruce`, `rustic_logs` und `medieval_tudor`.
   - stripped_spruce_log ↔ spruce_planks 2,5 in `nordic_dark`.
   - dark_oak_log ↔ dark_oak_planks 5,0 in `nordic_longhouse` und `japanese_temple`.
   - `fantasy_storybook` 5,7 und `modern_wood` 5,6.

   `lints.ts` prüft das nicht.
6. **Mischungen statt eines Blocks je Rolle.** Je Fläche ein Grundblock (55–85 %) plus 1–2 Partner, die höchstens ΔE00 12 entfernt liegen (Holzdach bis 15). Platziert in Clustern von 2–6 Blöcken, Holz paneelweise. `resolveInput.ts:64` wählt heute einen Block je Rolle.
7. **Die neuen Blöcke sind praktisch gesperrt.** `lints.ts:77` verlangt jede Form in 1.21.1 **und** 1.21.11. pale_oak und resin_bricks gibt es nur in 1.21.11, und `materials.ts:42` kennt pale_oak gar nicht. Abhilfe: Ersatz je Version.
8. **18 Gradientenketten mit gemessenen Stufen** (Abschnitt Gradientenketten). Es gibt echte Lücken, etwa warme Steine zwischen L\* 55 und 72. Dort hilft ein Formbruch oder ein bewusster Akzentsprung.
9. **Holzpaare von Build-Teams liegen in der Helligkeit benachbart.** WesterosCraft empfiehlt birch–oak, oak–jungle und jungle–spruce [2]. Gemessen sind das Nachbarn der Holzkette mit ΔE00 9–14.
10. **Winter.** Mojangs Schneedorf-Häuser haben **keinen** Moos-Prozessor [6], also im Winter kein Moos. Stattdessen Risse und dunkle Dächer, die den Schnee (L\* 99) tragen, dazu warmes Licht. Die stärkste Winterpalette ist Schwedenrot mit weißen Kanten [33][34]. Gemessen liegen stripped_mangrove_log und mangrove_planks bei ΔE00 7 zum Falunrot.
11. **Komplementärakzent mit Flächenbudget ≤ 5–10 %**, alle Beispiele gemessen:
    - Grauer Stein mit resin_bricks: gleiche Helligkeit, ΔE00 27,5.
    - Ziegel mit Patina.
    - Ocker mit Türkis: yellow_terracotta ↔ warped ΔE00 39,8.
    - Japan: Zinnober mit Kupfergrün.
12. **Temperatur zusammenhalten.** Ein kalter grauer Sockel unter warmem Sandstein ergibt einen Temperaturbruch (stone_bricks ↔ smooth_sandstone ΔE00 31,5). Besser ist ein warmer, dunklerer Sockel aus mud_bricks, packed_mud oder granite.
13. **Mojangs Verwitterung streut zufällig je Block**, ebenso GDPC, die Standardbibliothek des GDMC-Wettbewerbs [27]. Taugen tun beide nur für die Mengen, nicht für die Platzierung. Die Platzierung folgt Wasser, Sonne und Kanten [1][2][4].
14. **Tool-Praxis:** Colorflow bewertet Verläufe mit ΔE2000 und stuft eine Abweichung ≤ 2 als „grün“ ein [23]. witchcraft baut Verläufe mit „spread“ (Blöcke je Stufe) und „bleed“ (Überlappung) [26]. Das ist eine direkte Vorlage für unseren Algorithmus.

## Schwächen des aktuellen Generators

**Code**
- **S1 Dach ohne Variation.** `roofEngine.ts:249` wählt nur zwischen `m.trim` und `m.roof`. Es gibt keine Feldabhängigkeit (Traufabstand d, Kehle, Himmelsrichtung). Auf allen Screenshots ist das Dach die größte Fläche und völlig gleichförmig.
- **S2 Verwitterungsfeld.** `texturing.ts:24–41`: P0 0,42, HW 3,5, Rauschen ±0,25 mit einer Zellgröße von 2,5.
  - Ergebnis: unten ein Band, oben nichts. Die Lauflänge verwitterter Cluster in Reihe 0 hat den Median 6 und das P90 16, liest sich also als Streifen.
  - `underOverhang` und `drip` werden nirgends übergeben (`walls.ts:109/152`, `components.ts:143`, `roundTower.ts:113`). Es ist toter Code.
  - `walls.ts:152` misst die Höhe ab Geschossboden statt ab Gelände, deshalb verwittert die Wand direkt über dem Sockel ein zweites Mal.
- **S3 Verwitterungslisten** (`materials.ts:85–108`).
  - Die Reihenfolge `stone_bricks → cracked → mossy` mischt zwei Ursachen. Die mittlere Stufe ist unsichtbar (ΔE00 1,6).
  - `sandstone: [smooth, sandstone, cut]` behandelt den bearbeiteten cut_sandstone als „verwittert“.
  - Ohne Liste: alle Hölzer (`materials.ts:55–69`), Putz, Keramik und Beton (`:135–156`) sowie smooth_sandstone (`:109`). Damit sind Wände in rustic, nordic, japanese, cherry, modern und mediterranean völlig gleichförmig.
- **S4 Ein Material je Rolle.** `resolveInput.ts:64` (`pr.weighted(...)`) behandelt die Gewichte als Auswahlwahrscheinlichkeit, nicht als Mischanteil.
- **S5 Neue Blöcke fehlen.**
  - `materials.ts:42–54` hat kein pale_oak.
  - Es fehlen Materialien für resin_bricks, chiseled_tuff_bricks, cut_sandstone, chiseled_sandstone und cut_red_sandstone.
  - `lints.ts:77` schließt alles aus, was nicht in 1.21.1 existiert.
  - Nicht in der Registry: mushroom_stem, gravel, podzol, mud, dripstone_block, bone_block, pale_moss_block, chiseled_tuff, chiseled_resin_bricks, resin_block, polished_basalt, cracked_polished_blackstone_bricks, waxed_chiseled_copper, copper_lantern, copper_bars, leaf_litter.
- **S6 Lints zu schwach.** `lints.ts:95–106` prüft nur ΔL zwischen Wand und Rahmen **oder** Dach, und nur den ersten Eintrag. Es fehlen:
  - Rahmen ↔ Dach, Dach ↔ Dachkante, Sockel ↔ Wand, Obergeschoss ↔ Dach;
  - Chroma, Temperatur und Texturrauschen;
  - der Flächenanteil des Akzents.
- **S7 Kein Rauschmaß.** `textureStats.ts:1–7` speichert nur die Mittelfarbe. Laute Flächen wie cobblestone im ganzen Erdgeschoss von `medieval_tudor` sind so nicht erkennbar.
- **S8 Thema ohne Wirkung auf die Palette.** `resolveInput.ts:64/115–122`: Auch der Winter bekommt Moos.
- **S9 Doku stimmt nicht.** README und ARCHITECTURE nennen 18 Paletten, in `palettes.ts` stehen **19**.

**Screenshots** (Rückseite, große Häuser)
- Mittelalter: Das Schieferdach ist ein schwarzer Block. Die hellen Ortgang-Stufen aus stone_bricks verdoppeln die Wandfarbe.
- Rustikal und Nordisch: Wand, Rahmen und Dach sind braun in braun. Bei `nordic_dark` ist das Dach heller als die Wand.
- Kirschblüte: Eine rosa Pyramide dominiert.
- Japanisch: fast schwarz.
- Mediterran: kalter grauer Sockel unter warmem Sandstein.
- Fantasy: Das warped-Dach ist laut (HF 9,1) und gesättigt.
- Nordisch-Winter: Das Dach hat keinerlei Tonwechsel.

## Techniken und Regeln

Legenden-Konvention in den Skizzen: Großbuchstaben sind Blöcke, `.` ist Luft, die Tiefe d ist relativ zur Wand. Wirkung und Aufwand stehen in Klammern.

### T1 Dachmischung: Traufen-Drip und First-Bleiche (Wirkung hoch, Aufwand mittel)

**Beschreibung.** Ein Grundmaterial mit 60–75 %. Ein dunklerer Partner mit 20–35 %, gehäuft in den untersten 2 Reihen, in Kehlen, unter Kaminen und an Gaubenwangen. Optional ein hellerer Partner mit ≤ 15 % in den obersten 1–2 Reihen, auf der Südseite verstärkt. Die Cluster liegen **in Falllinie**: 1 breit, 2–4 lang, weil Wasser hangabwärts läuft.

**Blöcke und Zustände.** Nur das Material wird getauscht. facing, half und shape bleiben, damit der Zustandsauflöser dieselben Ecken berechnet. Mögliche Familien:
- Holz: alle `*_stairs`.
- Schiefer: deepslate_tile, deepslate_brick, cobbled_deepslate, polished_deepslate.
- Ziegel: brick, granite, polished_granite, mud_brick.
- Kupfer: `waxed_*cut_copper_stairs`.
- Bruchstein: cobblestone, mossy_cobblestone, stone, andesite.

**Maße und Wahrscheinlichkeiten** (Einschätzung, abgeleitet aus [2][4]):

| Traufabstand d | p (dunkler Partner) | p (heller Partner) |
|---|---|---|
| 0 | 0,55 | – |
| 1 | 0,35 | – |
| 2 | 0,15 | – |
| ≥ 3 | 0,05 | – |
| Kehle (±1) | +0,3 | – |
| Firstreihe und Reihe darunter | – | 0,25 |
| Südhang | – | ×1,5 |

**Skizze.** Draufsicht auf den Südhang, oben First, unten Traufe. Legende: S=spruce_stairs[facing=north,half=bottom], D=dark_oak_stairs[facing=north,half=bottom], O=oak_stairs[facing=north,half=bottom] (Bleiche), R=spruce_slab[type=bottom] (First).
```text
R R R R R R R R R      First
S O S S S O O S S      d=4  (Bleiche ≤15 %)
S S S S S S S S S      d=3
S S D S S S D S S      d=2
S D D S S S D D S      d=1  Streifen in Falllinie
D D D S D D D D S      d=0  Traufe
```
**Einsatz.** Alle Steildächer ab 4 Reihen und alle Stile. Für Modern nur bei Satteldach und dann sehr schwach.

**Quellen.** [2] „sun-bleaching runs along exposed ridges, water damage accumulates at drainage points and eaves“, „Avoid random discoloration“; [4]; [36] und [44]: Schiefer ist uneinheitlich; [44]: Holzschindeln verwittern zu Silbergrau.

### T2 Zwei-Kanal-Verwitterung an Wänden (Wirkung hoch, Aufwand mittel)

**Beschreibung.** Drei Felder statt einem:
- **Feuchte (Moos, Chroma):** Höhe über **Gelände** ≤ 2. Aufsteigende Feuchte liegt „selten über 1,5 m“ [32], das sind 1–2 Blöcke. Verstärkt an der Nordseite, unter Fenstern ohne Sims und an Fallrohr- und Kehlpunkten.
- **Schaden (Risse, nur Textur):** an Ecken, Laibungen, Mauerkronen, Kaminköpfen und am Sockel.
- **Bleiche (heller Partner):** obere Geschosse der Süd- und Westseite.

**Mengen.**
- Bewohnt: Moos ≤ 10–15 % der Wand und in Reihe 0 höchstens 30 %. Risse 5–10 %.
- Alt oder Ruine: Moos 20–30 % und Risse 20–30 %, wie Stronghold und Ancient City [5][8].
- Winter: Moos 0–5 % und Risse ×1,5. Mojang setzt im Schneedorf kein mossify [6].

**Skizze.** Ansicht Süd, Wand 7 breit, y=1..5, Fenster bei x=3. Legende: B=stone_bricks, C=cracked_stone_bricks, M=mossy_stone_bricks, G=glass_pane.
```text
y5  C B B B B B C      Mauerkrone: Risse
y4  B B B B B B B
y3  B B G G G B B
y2  C B B M B B B      Tropfspur unter dem Fenster ohne Sims
y1  M M B M B B M      Feuchte unten, unregelmäßig, nie > 60 % der Reihe
```
**Quellen.** [1] „around windows, edges and eaves“; [32]; Prozessoren [5]: mossify 10/20/70 %, ancient_city 30 %, bastion 30–50 %; [8].

### T3 Cluster statt Streuung oder Band (Wirkung hoch, Aufwand niedrig)

**Regel.**
- Schwellen auf einem Rauschfeld aus zwei Oktaven: Zellgröße 6 (Gewicht 0,65) plus Zellgröße 2 (Gewicht 0,35), Amplitude ±0,3.
- Die Höhe geht **verrauscht** ein (h' = h + 1,5·n), damit keine harte Reihe entsteht.
- Prüfung je Fassade:
  - Keine Reihe ist zu mehr als 60 % verwittert.
  - Die Länge eines Clusters liegt bei 2–6.
  - Benachbarte Blöcke unterscheiden sich um höchstens eine Stufe der Kette.
- Bei Mischungen mit sehr niedrigem Kontrast (ΔE00 < 3, z. B. stone/cobblestone 0,9, andesite/cobblestone 3,2) ist Streuen erlaubt [4].

**Skizze** (Ansicht, M=mossy_cobblestone, B=cobblestone):
```text
schlecht (Band)   B B B B B B B B     gut (Cluster)   B B B B B B B B
                  M M M M B M M M                     B M B B B B M B
                  M M M M M M M M                     M M B B M B M M
```
**Quellen.** [4] „vary these clusters in size, shape, and position“; [1]: Splattering, Smallpox, Sandwiching, „radiating cluster“; [26] `gradient-gen :spread :bleed`; [27] GDPC wählt `random.choice` je Block, das ist die typische GDMC-Streuung.

### T4 Paneelweise Holzvariation (Wirkung mittel, Aufwand niedrig)

**Regel.** Bei Holzwänden wechselt das Material je **Feld zwischen zwei Ständern** oder je liegendem Brettlauf von 2–5 Blöcken, nicht je Block. Dafür gibt es zwei Arten von Partnern:
- **Gleicher Farbton, andere Textur:** spruce ↔ stripped_spruce_log ΔE00 2,5; mangrove ↔ stripped_mangrove_log 0,6; stripped_spruce_log ↔ oak_log 2,0, wobei die Rinde mit HF 8,6 Struktur bringt.
- **Benachbartes Holz nach WesterosCraft:** birch–oak, oak–jungle, jungle–spruce [2].

Stämme liegen in der Wandrichtung: Nord- und Südwand `axis=x`, Ost- und Westwand `axis=z`.

**Skizze.** Ansicht Süd, y=2..4. Legende: L=dark_oak_log[axis=y], P=spruce_planks, S=stripped_spruce_log[axis=x].
```text
L P P P L S S S L P P P L
L P P P L S S S L P P P L
L P P P L S S S L P P P L
```
**Quellen.** [2] „Plain plank walls are not enough on their own“, „Mix two complementary wood types“.

### T5 Sockel: rau und dunkel unten, bearbeitet darüber (Wirkung mittel, Aufwand niedrig)

**Regel.**
- Der Sockel ist ΔE00 ≥ 8 von der Wand entfernt **oder** hat ΔHF ≥ 4.
- Die unterste Reihe trägt den dunkelsten Partner der Kette, z. B. K1 cobbled_deepslate → tuff → cobblestone.
- Kein Erdreich sichtbar [3].
- Die Steinart folgt Region und Stand: Bruchstein ist rau, Quader sind bearbeitet [3].

**Skizze.** Schnitt, d=0 Wand, d=+1 Schürze. Legende: W=stone_bricks, C=cobblestone, D=cobbled_deepslate, T=cobblestone_stairs[facing=south,half=bottom] an der Nordfassade, die volle Seite zur Wand (wie walls.ts).
```text
y3  W .
y2  C .
y1  D T      Reihe 1: dunkelster Partner, Schürze davor
```
### T6 Tropfstreifen und helle Bogenkanten (Wirkung mittel, Aufwand niedrig)

**Regel.**
- Unter Öffnungen **ohne** Sims entsteht ein 1 breiter, 2–3 hoher Streifen aus dem dunklen oder moosigen Partner (p 0,5).
- Fenster mit Sims (W-Vorlagen mit Treppen-Sims) bekommen keinen Streifen, weil der Sims das Wasser abwirft.
- Um Bögen läuft eine **hellere** Kante, z. B. polished_andesite um stone_bricks (ΔE00 5,1). Sie definiert die Form [4].

**Skizze.** Ansicht Süd, Bogen W07b. Legende: A=polished_andesite, B=stone_bricks, G=glass_pane, M=mossy_stone_bricks.
```text
B A A A B
A G G G A
B G G G B
B M B B B     Tropfspur nur, wenn kein Sims
B M B B B
```
### T7 Rauschbudget und Texturhierarchie (Wirkung hoch, Aufwand niedrig)

**Regel** (Einschätzung, Grenzen aus den Messwerten unten):
- Große Flächen (> 30 Blöcke) haben als Grundblock HF 3–7.
- HF > 7 nur in Sockel, Weg, Kamin oder als Partner mit ≤ 30 %.
- Bei HF < 1 (concrete, terracotta, smooth_quartz) braucht die Fläche einen Partner mit HF 3–7 (z. B. white_concrete + calcite ΔE00 4,1) oder Relief.
- Benachbarte Rollen unterscheiden sich in der Helligkeit **oder** im Rauschen: ruhige stripped logs als Rahmen an Bretterwänden.

Palettinator unterscheidet ausdrücklich „patterned“ (stone bricks), „rough“ (cobblestone) und „featureless“ (concrete) [25]. Dass „90 % stone bricks“ flach wirken, steht schon in der alten Notiz.

**Skizze.** Ansicht Süd, Haus mit Sockel, Erdgeschoss, Fachwerk-Obergeschoss. Legende mit HF: D=cobbled_deepslate (7,2, rau), B=stone_bricks (4,2), F=dark_oak_log[axis=y] (4,0), P=calcite (4,6) mit smooth_quartz (0,7) als Partner, R=deepslate_tile_stairs (4,5).
```text
R R R R R R R R R      Dach: mittel
F P P F P P F P F      OG: ruhiger Putz zwischen mittlerem Holz
B B B B B B B B B      EG: Mauerwerk mittel
D D D D D D D D D      Sockel: rau (laut erlaubt)
```

### T8 Komplementärakzent mit Flächenbudget (Wirkung mittel, Aufwand niedrig)

**Regel.**
- Der Akzentton liegt dem Grundton gegenüber (ΔH ≈ 150–210°) und ist ΔE00 ≥ 25 von der Wand entfernt.
- Fläche ≤ 5 % bei kräftigem Akzent (C > 40), ≤ 10 % bei gedecktem.
- Ort: Läden, Türen, Gesimsbänder, Kaminkopf, Laternen.

Gemessene Paare:
- stone_bricks ↔ resin_bricks: ΔE00 27,5 bei ΔL 0,9, also ein reiner Farbsprung.
- bricks ↔ waxed_weathered_cut_copper.
- yellow_terracotta ↔ warped_planks: ΔE00 39,8.
- Japan: Zinnober an Schreinen [40] gegen Kupferpatina. Dass Schreine Kupferdächer tragen, ist eine Einschätzung.
- Winter: kaltes Weiß und Blau gegen gelbes Licht und Rot.

**Skizze.** Ansicht Süd, Ockerhaus (P32). Legende: Y=yellow_terracotta, Q=smooth_quartz (Gesims), W=warped_trapdoor[facing=south,half=bottom,open=true] auf d=+1, G=glass_pane. Der Akzent W liegt bei etwa 6 % der Fassade.
```text
Q Q Q Q Q Q Q
Y W G W Y Y Y
Y W G W Y Y Y
Y Y Y Y Y Y Y
```

### T9 Temperatur-Kohärenz (Wirkung mittel, Aufwand niedrig)

**Klassen**, Grenzen gemessen:
- **neutral** C < 6: Stein, Deepslate, Beton, Calcit, Quarz, Blasseiche.
- **warm** H 20–100°, C > 15: Holz, Sandstein, Ziegel, Terrakotta, Lehm.
- **grün-kühl** H 110–200°, C > 8: Moos, Patina, Prismarin, warped.
- Tuff ist mit C 4–5 neutral mit einem Grünstich.

**Regel.** Sockel, Wand und Dach enthalten höchstens **eine** kühl-gesättigte Klasse. Warme Wände bekommen einen warmen oder neutral-dunklen Sockel, keinen kalt-hellen. Gemischt werden nur Blöcke derselben Klasse, wenn ΔE00 > 12 ist. Das ist eine Einschätzung, gestützt auf [45] („similar tone, different surface“).

**Skizze.** Schnitt durch Sockel und Wand, mediterran. Links falsch, rechts richtig. Legende: S=smooth_sandstone (warm), B=stone_bricks (neutral-kalt), M=mud_bricks (warm, dunkel).
```text
falsch:  S  S  S        richtig:  S  S  S
         B  B  B   ΔE 31,5        M  M  M   ΔE 34,5, gleiche Temperatur
```

### T10 ΔE-Kontrastsignatur (Wirkung hoch, Aufwand niedrig)

Lint-Schwellen in ΔE00. Das ist eine Einschätzung, kalibriert an den 19 Paletten und den Screenshots.

| Paar | Schwelle |
|---|---|
| Mischpartner ↔ Grundblock | 2–12 (Holzdach ≤ 15; Moos am Sockel ≤ 15) |
| Wand ↔ Dach (auch OG ↔ Dach) | ≥ 15, ideal ≥ 20; oder ≥ 12 und Dachkante ≥ 15 zu beiden |
| Wand ↔ Rahmen | ≥ 15 |
| Rahmen ↔ Dach | ≥ 8, sonst Dachkante ≥ 15 zu beiden |
| Dach ↔ Dachkante | ≥ 10 (Flachdach-Paletten ausgenommen) |
| Sockel ↔ Wand | ≥ 8 oder ΔHF ≥ 4 |
| Akzent ↔ Wand | ≥ 25 |

Begründung: Aus der Distanz sinkt der Kontrast [39]. Die Vorschau zeigt Häuser aus der Vogelperspektive, also müssen große Massen deutlich verschieden sein und innerhalb einer Masse leise.

**Skizze.** Messpunkte an einer Fassade, Ansicht Süd:
```text
  [roofTrim]──≥10──[roof]──≥15/20──[wall/upperWall]
       │                 └──≥8──[frame]──≥15──[wall]
  [plinth]──≥8 oder ΔHF≥4──[wall]      [accent]──≥25──[wall]
```

### T11 Kupfer-Patina (Wirkung mittel, Aufwand niedrig)

**Regel.**
- Immer `waxed_*`. Gewachste Blöcke haben dieselbe Textur [10].
- Die Helligkeit ist konstant (L\* 54–58), es ist ein reiner Farbtonverlauf.
- Die Stufe exposed → weathered ist ein Sprung (ΔE00 28,4). Gemischt werden deshalb Paare: oxidized + weathered (7,9) oder cut + exposed (12,0).
- Oxidized sitzt an Traufe und Kehlen, weathered weiter oben. Patina bildet sich in feuchter Luft schneller [37].
- Mojang verteilt in Trial Chambers etwa 30/30/30/10 (unoxidiert, exposed, weathered, oxidized) [5].

**Skizze.** Draufsicht auf den Hang, oben First, unten Traufe. Legende: W=waxed_weathered_cut_copper_stairs[facing=north,half=bottom], O=waxed_oxidized_cut_copper_stairs[facing=north,half=bottom], R=waxed_weathered_cut_copper_slab[type=bottom].
```text
R R R R R R R
W W W O W W W      d=2
W O W O O W W      d=1
O O O O O O O      d=0  Traufe: Patina, wo Wasser läuft
```

### T12 Wegränder und Bodenübergang (Wirkung niedrig, Aufwand niedrig)

**Regel.**
- In der Wegmitte cobblestone/stone, am Rand coarse_dirt oder dirt_path, dann Gras.
- 10–20 % Gras greifen in den Rand, wie bei Mojangs `street_*` (dirt_path → grass 10 % bzw. 20 %) [5].
- Eine „Erodierter Boden“-Mischung aus 64 % andesite und 36 % diorite steht in [20].
- gravel (nicht in Registry) ist der Übergangsblock (ΔE00 2,1 zu cobblestone).

**Skizze.** Draufsicht auf einen Weg, 3 breit, von der Tür nach Norden. Legende: C=cobblestone, K=coarse_dirt, P=dirt_path, g=grass_block.
```text
g P C C P g      Rand frayed: 10–20 % Gras greift ein
g K C C K g
g P C P g g
g g P C P g
```

**Stile je Technik**

| Technik | Stile |
|---|---|
| T1 Dachmischung | alle mit Steildach; modern nur schwach |
| T2 Zwei Kanäle | medieval, fantasy, rustic, nordic (im Winter Risse statt Moos), japanese und cherry sparsam, mediterranean (Schmutzsaum statt Moos); modern nein |
| T3 Cluster | alle, die verwittern |
| T4 Holzpaneele | rustic, nordic, medieval, fantasy, japanese, cherry |
| T5 Sockel | alle |
| T6 Tropfstreifen und Bogenkanten | medieval, fantasy, mediterranean; japanese ohne Tropfstreifen |
| T7 Rauschbudget | alle, besonders modern (nur ruhig bis mittel) |
| T8 Komplementärakzent | alle; am stärksten nordic (Falunrot), mediterranean, japanese |
| T9 Temperatur | alle, besonders mediterranean und cherry |
| T10 ΔE-Signatur | alle (Lint) |
| T11 Kupfer | fantasy, japanese, modern; Akzente in medieval |
| T12 Wegrand | medieval, rustic, nordic, fantasy, japanese (Kies), mediterranean |

## Farbtheorie für Minecraft

- **Helligkeit vor Farbe vor Textur** [1]. Für die Masse entscheidet L\*, für die Lebendigkeit das Rauschen und die Mischung.
- **Sättigung:** Grundflächen haben C ≤ 30. Mit C > 40 sind gemessen: acacia 46, bamboo 49,5, red_sandstone 60, yellow_terracotta 58, resin 70. Diese Blöcke taugen als Akzent oder für bewusste Farbfassaden wie Ocker.
- **Warm/kalt:** Licht ist warm (lantern, Fenster), Schatten und Schnee sind kalt. Die Gebäudemassen sollten in **einer** Temperatur bleiben, der Akzent liefert den Gegenpol (T8, T9).
- **Komplementärpaare:** Orange gegen Blaugrün ist das ergiebigste Paar in Vanilla (Kupfer, resin, Terrakotta gegen Patina, warped, prismarine).
- **Gerade sichtbare Unterschiede:** ΔE00 ≈ 1 [38]. Gemischt wird deshalb mit 2–12. Unter 2 ist nur Textur sichtbar, über 15 wirkt es wie zwei Materialien.
- **Distanz:** Kontrast und Sättigung nehmen mit der Entfernung ab [39]. Feine Mischungen lohnen sich nur bis etwa 30 Blöcke Blickabstand, die Massenkontraste müssen weiter tragen.

## Texturrauschen: gemessene Klassen (HF)

| Klasse | Blöcke (HF) |
|---|---|
| **ruhig < 3** | snow 0,5 · white/gray/light_gray_concrete 0,2–0,3 · alle terracotta 0,4–0,8 · smooth_quartz 0,7 · quartz_block 1,0 · quartz_bricks 1,6 · stripped_dark_oak_log 1,5 · stripped_mangrove_log 1,5 · stripped_cherry_log 1,7 · smooth_sandstone 1,9 · stripped_spruce_log 2,0 · smooth_red_sandstone 2,2 · stripped_pale_oak_log 2,4 · stripped_oak_log 2,6 · polished_tuff 2,8 |
| **mittel 3–7** | cut_sandstone 3,4 · cherry_log 3,6 · stone 3,8 · smooth_stone 3,8 · dark_oak_planks 4,0 · stone_bricks 4,2 · tuff_bricks 4,3 · mud_bricks 4,3 · deepslate_tiles 4,5 · calcite 4,6 · cherry/mangrove_planks 4,7 · polished_andesite 4,8 · spruce_planks 4,9 · deepslate_bricks 5,1 · polished_blackstone_bricks 5,2 · polished_deepslate 5,8 · cracked_stone_bricks 5,9 · sandstone 6,2 · birch_planks 6,3 · cut_copper 6,4 · andesite 6,7 · oxidized_cut_copper 6,7 · tuff 6,9 |
| **laut > 7** | pale_oak_planks 7,1 · bricks 7,2 · cobbled_deepslate 7,2 · gravel 7,2 · bamboo_planks 7,3 · polished_diorite 7,4 · oak/jungle_planks 7,5 · pale_moss_block 8,3 · resin_bricks 8,5 · oak_log 8,6 · granite 8,7 · mossy_cobblestone 8,9 · hay_block 9,0 · warped_planks 9,1 · birch_log 11,1 · cobblestone 11,2 · coarse_dirt 12,5 · diorite 12,8 |

Folgerung: oak_planks ist mit 7,5 deutlich unruhiger als spruce_planks mit 4,9. Das erklärt, warum Fichtenwände ruhiger wirken. Diorite gehört nie auf eine große Fläche, polished_diorite nur in Maßen.

## Mischungsverhältnisse

| Quelle | Mischung |
|---|---|
| Mojang, Ebenen- und Taiga-Dorfhäuser [5][6] | cobblestone → mossy_cobblestone **10 %** |
| Mojang, plains_meeting_point_4 [6] | 70 % Moos |
| Mojang, Schneedorf [6] | **0 %** (kein Prozessor) |
| Mojang, Zombiedorf [5] | 80 % Moos, 7 % cobweb, glass_pane zu 50 % → cobweb |
| Mojang, Stronghold [8] | stone_bricks 45 / mossy 30 / cracked 20 / infested 5 |
| Mojang, Ancient City [5] | 30 % cracked deepslate bricks und tiles, block_rot 5 % |
| Mojang, Bastion `high_wall` [5] | ≈ 50 % cracked, 15 % blackstone, 35 % sauber |
| Mojang, Trail Ruins [5][9] | mud_bricks → packed_mud 10 %; gravel → dirt 20 % und coarse_dirt 10 % |
| minecraft.wiki, „Eroding Floor“ [20] | andesite 16 : diorite 9 (64/36), zufällig verteilt |
| **Empfehlung Haus, gepflegt** (Einschätzung) | Partner gesamt 15–25 %: Moos ≤ 10 %, Risse 5–10 %, Bleiche ≤ 10 % |
| **Empfehlung alt oder Ruine** (Einschätzung) | Partner 30–50 % nach Stronghold/Ancient-City-Art |

Mojang verteilt diese Mengen zufällig je Block. Die Platzierung macht der Generator nach T1–T3.

## Gradientenketten

Alle Werte sind gemessen [7]. In Klammern stehen die Stufen als ΔE00. Mit `*` markierte Blöcke sind nicht in der Registry.

| # | Kette (L\*) | Einsatz |
|---|---|---|
| K1 | cobbled_deepslate 33 →(12,8) tuff 46 →(8,8) cobblestone 53 →(3,2) andesite 57 | Sockel unten → oben, Stützmauer |
| K2 | moss_block 43 →(12,1) mossy_cobblestone 49 →(13,5) cobblestone 53; mossy_stone_bricks →(9,9) stone_bricks | Feuchte-Kanal (Chroma statt Helligkeit) |
| K3 | polished_blackstone_bricks 18 →(10,6) deepslate_bricks 30 →(12,1) tuff_bricks 43 →(10,1) stone_bricks 51 →(5,1) polished_andesite 56 | Mauerwerk in Ziegelform, Burg, Turm |
| K4 | polished_deepslate 31 →(11,7) polished_tuff 43 →(13,0) polished_andesite 56 →(8,3) smooth_stone 65 →(9,7) polished_diorite 78 →(8,0) calcite 89 | Glatter Werkstein, modern, japanisch; vgl. blockpalettes 82100 [22] |
| K5 | deepslate_tiles 23 →(5,3) deepslate_bricks 30 →(3,0) cobbled_deepslate 33 [→(11,2) tuff_bricks 43 nur Firstbleiche] | Schieferdach, Traufe → First |
| K6 | dark_oak 20 →(14,7) spruce 38 →(14,1) jungle 52 →(9,4) oak 57 →(13,9) birch 72 →(21,7 Lücke) pale_oak 88 | Holzwand und Holzdach; Nachbarpaare nach [2] |
| K7 | spruce_log 17 →(4,9) dark_oak_log 20 →(3,6) stripped_dark_oak_log 25 →(11,5) pale_oak_log 34 →(13,9) oak_log 38 →(2,0) stripped_spruce_log 40 | Rahmen, Stämme, Blockhaus |
| K8 | mangrove 31 →(14,4) bricks 47 →(2,6) granite 48 →(1,5) polished_granite 50; Brennvarianz bricks →(8,5) mud_bricks →(6,5) granite | Ziegeldach (Farbton statt Helligkeit) [42] |
| K9 | smooth_sandstone 86 →(2,0) cut_sandstone 83 →(1,1) sandstone 82 →(16,1) white_terracotta 75 →(23,6 Lücke) dripstone_block* 48 →(4,2) mud_bricks 47 →(7,4) terracotta 46 | Wüste, Mediterran; die Lücke L 55–72 ist nur durch Holz oder einen Formbruch zu schließen |
| K10 | smooth_quartz 92 →(3,9) calcite 89 →(4,1) white_concrete 85 →(8,2) mushroom_stem* 80 →(10,8) white_terracotta 75; kalt: calcite →(8,0) polished_diorite 78 →(1,3) diorite 76 →(8,4) smooth_stone 65 | Putz: oben sauber, unten „schmutzig“ |
| K11 | cobblestone 53 →(2,1) gravel* 54 →(19,0) dirt_path (oben) 53 →(16,3) coarse_dirt 39 →(9,8) podzol* (oben) 29 | Weg → Gelände |
| K12 | cut_copper 54 →(12,0) exposed 54 →(28,4 Sprung) weathered 57 →(7,9) oxidized 58 | Kupferdach, Dachrinne, Kuppel |
| K13 | chiseled_tuff* 39 →(3,2) tuff_bricks 43 →(1,8) polished_tuff 43 →(3,7) tuff 46 | Einmaterial-Mischung, nur Textur |
| K14 | cherry_planks 77 →(9,7) stripped_cherry_log 67 →(18,7) polished_granite 50 →(17,7) mangrove 31 →(18,3) cherry_log 16; Bleiche: cherry →(14,3) pale_oak_planks | Kirschhaus, rosa Dach |
| K15 | stripped_pale_oak_log 95 →(4,5) pale_oak_planks 88 →(22,5 Lücke) light_gray_wool 59 →(12,3) pale_moss_block* 47 →(2,7) tuff 46 →(13,0) pale_oak_log 34 | Blasser Garten, Skandi |
| K16 | blackstone 15 →(2,5) polished_blackstone_bricks 18 →(2,0) polished_blackstone 21 →(6,3) deepslate_tiles 23 →(5,9) polished_deepslate 31 →(2,9) deepslate 34 | Dunkle Sockel, Gothic, Kaminkopf (Ruß) |
| K17 | red_nether_bricks 12 →(15,8) crimson 28 →(12,7) mangrove 31 →(6,5) red_terracotta 37 →(11,3) bricks 47 | Rote Hölzer, Falunrot, Hexenhaus |
| K18 | red_sandstone 51 →(0,9) cut_red_sandstone 52 →(2,1) smooth_red_sandstone 50 →(10,8) terracotta 46 →(6,6) orange_terracotta 44; resin_bricks ↔ cut_red_sandstone 6,2 | Orange-Akzente, Ersatz für resin in 1.21.1 |

## Wo Gradienten sitzen

- **Unten dunkel und feucht:** Reihen 1–2 über dem Gelände [32], Nordseite, Sockelecken.
- **Oben hell:** Mauerkrone, obere Geschosse, First [2]. Ausnahme: Dächer, die bewusst schwer wirken sollen (Japan, Schiefer). Dort bleicht nur der First.
- **Kanten:** Ecken und Laibungen bekommen Risse. Bögen bekommen eine helle Kante [4].
- **Unter Überständen:** trocken, also wenig Moos. Dunkler wird es nur durch Schatten, und den liefert das Spiel selbst. Einschätzung: `underOverhang` sollte deshalb **Moos senken**, nicht erhöhen.
- **Unter Fenstern ohne Sims, an Kehlen, unter Kaminen:** Tropf- und Rußstreifen in Falllinie.
- **Clustergröße statt Streuung:** 2–6 Blöcke. Große Fassaden bekommen mehrere Zentren, kleine Häuser ein radiales Zentrum am Blickpunkt [1].

## Neue Blöcke 1.20 bis 1.21.11

| Block | L\* / C / HF | Rolle | Registry |
|---|---|---|---|
| tuff, polished_tuff, tuff_bricks, chiseled_tuff_bricks (1.21) [11] | 46/43/43/43 · C 4–5 · HF 6,9/2,8/4,3/6,0 | Mittelton-Stein. Die Einmaterial-Mischung K13 ist ideal; Gurtgesims | ✓; chiseled_tuff ✗ |
| resin_bricks (1.21.4) [12] | 52 · C 70 · HF 8,5 | Orange-Akzent auf Höhe von stone_bricks; Band, Kaminkopf, Laibung ≤ 5 % | ✓ (nur 1.21.11); chiseled_resin_bricks, resin_block ✗ |
| pale_oak (1.21.4) | Bretter 88 · C 4 · HF 7,1; stripped 95; Rinde 34 grau | Helles Holz ohne Gelbstich, weiße Kanten (Falunrot, Skandi), Rinde als grauer Rahmen | ✓ (nur 1.21.11) |
| cherry (1.20) | Bretter 77 · C 19; stripped 67; Rinde 16 violett-schwarz | Braucht einen dunklen Anker (Dach, Sockel); nie Rosa auf Rosa | ✓ |
| bamboo (1.20) | Bretter 71 · C 49,5 · HF 7,3; mosaic 70 | Zu gesättigt für Wände. Läden, Türen, Böden, Zäune in japanese/cherry | ✓ |
| Kupfer (1.21: chiseled, grate, bulb, door, trapdoor; 1.21.9: lantern, chain, bars) [10][15] | L 54–58 · ΔH bis 120° | Dach, Kuppel, Läden, Laternen; immer gewachst | gewachste cut/block/door/trapdoor/grate/bulb ✓; chiseled, lantern, bars, chain ✗ |
| leaf_litter, wildflowers, bush, firefly_bush (1.21.5) [14] | – | Bodenverwitterung, Wegränder | ✗ |
| 1.21.11 [16] | – | keine neuen Blöcke | – |

## Paletten-Websites, Tools und Builder

- **blockpalettes.com** [22], Featured im Oktober 2026:
  - **82100** deepslate_tiles, polished_deepslate, stone_bricks, andesite, diorite, calcite. Das ist eine fertige neutrale Kette dunkel → hell, fast K4.
  - 81683 mit amethyst und deepslate.
  - 82034 mit pale_moss und tuff_bricks.
  - 82118 mit stripped_oak, gray_concrete und andesite.
  - Mehrere Featured-Paletten enthalten Blöcke, die es in 1.21.11 nicht gibt (poplar, cinnabar, sulfur). Paletten von dort müssen daher gegen die Registry geprüft werden.
- **Colorflow** [23]: CIEDE2000, Verläufe mit 3–9 Stufen, eine Güteanzeige der „Average deviation ΔE“ (≤ 2 grün, ≤ 10 gelb). Ausgeschlossen werden „tinted“ Blöcke (Gras, Laub).
- **BlockGradient** [24] mischt Concrete, Concrete Powder, Terracotta und Wolle per RGB-Lerp. Das ist für Pixelart gedacht und für Architektur zu bunt.
- **Palettinator** [25] prüft „hue harmony“ und „saturation balance“ und kennt Texturklassen.
- **witchcraft** [26]: `material-gradient` (Start, Ende, Stufen) und `gradient-gen` mit `:spread`, `:bleed-distance` und `:bleed`. Das ist das Muster für T3.
- **GDMC:** Bewertet werden Anpassung, Funktion, Erzählung und Ästhetik [28][29]. Metriken der Blockvielfalt hängen mit menschlichen Bewertungen zusammen [30]. Der Siegerbeitrag 2022 setzt auf „organic“ iterative Planung [31]. Zu Palettenregeln fand ich in den Abstracts nichts.
- **Bekannte Builder:** Konkrete Paletten von YouTubern (Grian, Mythical Sausage, BdoubleO100 u. a.) habe ich nicht belegen können, wie schon in der alten Notiz. Belegbar sind die Build-Teams WesterosCraft [1][2][3] und Conquest [4] sowie Mojangs eigene Mischungen [5][8]. Die Paletten unten stützen sich darauf.

## (a) Paletten nach unseren Rollen

**Format.** `role:[[block,gewicht],…]`. Die Gewichte werden unterschiedlich gelesen:
- **Mischrollen** (plinth, wall, upperWall, infill, roof, floor, path): Gewicht = Flächenanteil im selben Haus. Der erste Eintrag ist der Grundblock, die Partner werden nach T1–T3 platziert.
- **chimney:** Der letzte Eintrag ist der Kaminkopf (oberste 1–2 Reihen, Ruß).
- **Wahlrollen** (frame, beam, roofTrim, ridge, soffit, window, shutter, door, accent): Gewicht = Auswahlwahrscheinlichkeit je Haus, wie heute.

**Konventionen.**
- Material-IDs wie in `materials.ts`: Holz über `*_planks` bzw. den Stamm, `iron` = Eisentür und -falltür, Glas über `glass` bzw. `*_stained_glass`.
- `upperWall:=wall` heißt „gleich wie wall“.
- Kopfzeile: ΔE00 gemessen [7] zwischen Wand–Dach (W–D, bei zwei Werten Erd-/Obergeschoss), Wand–Rahmen (W–R), Rahmen–Dach (R–D), Dach–Kante (D–K) und Sockel–Wand (S–W).
- Winter: ★ = schwach, ★★★ = sehr gut, ★★★★ = Leitpalette.

**Prüfung.** Alle Dachblöcke haben Treppen. Alle verbotenen Namensteile der Stile in `styles.ts` sind eingehalten. Nicht in der Registry ist nur **mushroom_stem** (P05; Ersatz white_terracotta).

**Nur 1.21.11:** P03, P08, P13, P16, P23, P26. Ersatz für 1.21.1, als ΔE00 gemessen:

| 1.21.11-Block | Ersatz für 1.21.1 | ΔE00 |
|---|---|---|
| pale_oak_planks | smooth_quartz | 4,6 |
| stripped_pale_oak_log | quartz_pillar | 4,0 |
| pale_oak_log | cobbled_deepslate (als Block) | 6,0 |
| resin_bricks | cut_red_sandstone | 6,2 |
| Türen und Falltüren aus pale_oak | spruce bzw. iron | – |

P29 (Kykladen) ist eine reine Flachdach-Palette. Ihr Weiß-in-Weiß ist gewollt, die Lint-Ausnahme gilt für `flatOnly`.

**Mittelalter (medieval)**

```text
# P01 medieval_cottage – Bruchstein-EG, Eichen-OG, Fichtendach | Winter ★★★ | ΔE00 W–D 23/18 W–R 30/32 R–D 15 D–K 15 S–W 19
plinth:[[cobbled_deepslate,55],[cobblestone,30],[mossy_cobblestone,15]] wall:[[cobblestone,60],[stone,25],[andesite,15]] upperWall:[[oak_planks,70],[stripped_oak_log,30]] infill:[[oak_planks,1]]
frame:[[dark_oak_log,70],[spruce_log,30]] beam:[[stripped_dark_oak_log,1]] roof:[[spruce_planks,70],[dark_oak_planks,30]]
roofTrim:[[dark_oak_planks,1]] ridge:[[dark_oak_log,1]] soffit:[[spruce_planks,1]] window:[[glass,1]] shutter:[[spruce_planks,60],[dark_oak_planks,40]] door:[[spruce_planks,1]]
floor:[[spruce_planks,1]] path:[[cobblestone,45],[coarse_dirt,30],[dirt_path,25]] chimney:[[cobblestone,70],[stone_bricks,20],[cobbled_deepslate,10]] accent:[[red_terracotta,1]]

# P02 medieval_timber_slate – Kalkputz-Fachwerk über Steinziegel, Schieferdach | Winter ★★★ | ΔE00 W–D 24/62 W–R 28/67 R–D 12 D–K 15 S–W 17
plinth:[[cobbled_deepslate,45],[cobblestone,40],[mossy_cobblestone,15]] wall:[[stone_bricks,65],[cracked_stone_bricks,20],[mossy_stone_bricks,15]] upperWall:[[calcite,70],[smooth_quartz,30]] infill:=upperWall
frame:[[dark_oak_log,65],[stripped_dark_oak_log,35]] beam:[[stripped_dark_oak_log,1]] roof:[[deepslate_tiles,65],[deepslate_bricks,20],[cobbled_deepslate,15]]
roofTrim:[[dark_oak_planks,50],[stone_bricks,50]] ridge:[[deepslate_bricks,1]] soffit:[[dark_oak_planks,1]] window:[[glass,1]] shutter:[[dark_oak_planks,1]] door:[[dark_oak_planks,1]]
floor:[[spruce_planks,1]] path:[[stone_bricks,40],[cobblestone,35],[andesite,25]] chimney:[[bricks,75],[stone_bricks,25]] accent:[[red_terracotta,1]]

# P03 medieval_tuff_hall – Tuffstein-Halle mit Fichtendach (1.21) | Winter ★★☆ | ΔE00 W–D 19 W–R 22 R–D 15 D–K 15 S–W 12
plinth:[[deepslate_bricks,50],[cobbled_deepslate,35],[tuff,15]] wall:[[tuff_bricks,65],[polished_tuff,25],[tuff,10]] upperWall:=wall infill:[[polished_tuff,1]]
frame:[[dark_oak_log,60],[stripped_dark_oak_log,40]] beam:[[dark_oak_log,1]] roof:[[spruce_planks,70],[dark_oak_planks,30]]
roofTrim:[[dark_oak_planks,1]] ridge:[[dark_oak_log,1]] soffit:[[spruce_planks,1]] window:[[glass,1]] shutter:[[dark_oak_planks,1]] door:[[dark_oak_planks,1]]
floor:[[dark_oak_planks,1]] path:[[tuff,40],[cobblestone,30],[stone,30]] chimney:[[tuff_bricks,60],[deepslate_bricks,40]] accent:[[resin_bricks,60],[chiseled_tuff_bricks,40]]

# P04 medieval_brick_burgher – Backstein-Bürgerhaus mit Steinkanten und Schiefer | Winter ★★★ | ΔE00 W–D 27 W–R 19 R–D 24 D–K 24 S–W 19
plinth:[[stone_bricks,50],[cobblestone,30],[andesite,20]] wall:[[bricks,70],[mud_bricks,20],[granite,10]] upperWall:=wall infill:[[white_terracotta,1]]
frame:[[stone_bricks,60],[polished_andesite,40]] beam:[[stone_bricks,1]] roof:[[deepslate_tiles,60],[deepslate_bricks,25],[cobbled_deepslate,15]]
roofTrim:[[stone_bricks,1]] ridge:[[deepslate_bricks,1]] soffit:[[dark_oak_planks,1]] window:[[glass,1]] shutter:[[spruce_planks,1]] door:[[dark_oak_planks,1]]
floor:[[oak_planks,1]] path:[[stone_bricks,45],[cobblestone,35],[andesite,20]] chimney:[[bricks,80],[nether_bricks,20]] accent:[[waxed_weathered_cut_copper,1]]
```

**Fantasy (fantasy)**

```text
# P05 fantasy_storybook_moss – Märchenhaus, Lehmputz, Moossockel | Winter ★★☆ | ΔE00 W–D 54 W–R 50 R–D 6 D–K 15 S–W 31
plinth:[[mossy_cobblestone,45],[cobblestone,35],[moss_block,20]] wall:[[white_terracotta,80],[mushroom_stem,20]] upperWall:=wall infill:[[white_terracotta,1]]
frame:[[stripped_dark_oak_log,60],[dark_oak_log,40]] beam:[[dark_oak_log,1]] roof:[[dark_oak_planks,65],[spruce_planks,35]]
roofTrim:[[spruce_planks,1]] ridge:[[spruce_planks,1]] soffit:[[spruce_planks,1]] window:[[glass,1]] shutter:[[spruce_planks,50],[dark_oak_planks,50]] door:[[spruce_planks,1]]
floor:[[oak_planks,1]] path:[[mossy_cobblestone,40],[cobblestone,30],[coarse_dirt,30]] chimney:[[cobblestone,50],[mossy_cobblestone,30],[stone_bricks,20]] accent:[[moss_block,1]]

# P06 fantasy_patina_cottage – Feenhaus mit Kupferpatina-Dach | Winter ★★★ | ΔE00 W–D 31 W–R 44 R–D 33 D–K 45 S–W 31
plinth:[[mossy_stone_bricks,45],[stone_bricks,35],[mossy_cobblestone,20]] wall:[[calcite,70],[smooth_quartz,15],[polished_diorite,15]] upperWall:=wall infill:[[calcite,1]]
frame:[[stripped_spruce_log,60],[spruce_log,40]] beam:[[spruce_log,1]] roof:[[waxed_oxidized_cut_copper,60],[waxed_weathered_cut_copper,40]]
roofTrim:[[dark_oak_planks,1]] ridge:[[dark_oak_planks,1]] soffit:[[spruce_planks,1]] window:[[glass,1]] shutter:[[waxed_oxidized_cut_copper,1]] door:[[spruce_planks,1]]
floor:[[spruce_planks,1]] path:[[mossy_cobblestone,40],[cobblestone,35],[moss_block,25]] chimney:[[stone_bricks,60],[mossy_stone_bricks,40]] accent:[[waxed_cut_copper,1]]

# P07 fantasy_witch_crimson – Hexenhaus, Fichte und Karmesin | Winter ★★☆ | ΔE00 W–D 28 W–R 15 R–D 25 D–K 23 S–W 19
plinth:[[cobbled_deepslate,50],[blackstone,30],[mossy_cobblestone,20]] wall:[[spruce_planks,70],[stripped_spruce_log,30]] upperWall:=wall infill:[[spruce_planks,1]]
frame:[[dark_oak_log,1]] beam:[[stripped_dark_oak_log,1]] roof:[[crimson_planks,70],[mangrove_planks,30]]
roofTrim:[[dark_oak_planks,1]] ridge:[[dark_oak_planks,1]] soffit:[[dark_oak_planks,1]] window:[[purple_stained_glass,1]] shutter:[[dark_oak_planks,1]] door:[[dark_oak_planks,1]]
floor:[[spruce_planks,1]] path:[[cobbled_deepslate,40],[blackstone,30],[mossy_cobblestone,30]] chimney:[[cobbled_deepslate,60],[blackstone,40]] accent:[[moss_block,1]]

# P08 fantasy_pale_garden – Blasser Garten: Blasseiche, Schiefer, Harz-Akzent (nur 1.21.11) | Winter ★★★ | ΔE00 W–D 61 W–R 47 R–D 10 D–K 61 S–W 52
plinth:[[deepslate_bricks,50],[tuff_bricks,35],[cobbled_deepslate,15]] wall:[[pale_oak_planks,75],[stripped_pale_oak_log,25]] upperWall:=wall infill:[[calcite,1]]
frame:[[pale_oak_log,70],[stripped_dark_oak_log,30]] beam:[[pale_oak_log,1]] roof:[[deepslate_tiles,60],[deepslate_bricks,25],[cobbled_deepslate,15]]
roofTrim:[[pale_oak_planks,1]] ridge:[[pale_oak_planks,1]] soffit:[[pale_oak_planks,1]] window:[[glass,60],[orange_stained_glass,40]] shutter:[[pale_oak_planks,1]] door:[[pale_oak_planks,1]]
floor:[[pale_oak_planks,1]] path:[[tuff,40],[cobbled_deepslate,30],[stone,30]] chimney:[[tuff_bricks,60],[deepslate_bricks,40]] accent:[[resin_bricks,1]]
```

**Rustikal (rustic)**

```text
# P09 rustic_spruce_cabin – Fichtenhütte mit heller Traufkante | Winter ★★★ | ΔE00 W–D 15 W–R 15 R–D 5 D–K 38 S–W 23
plinth:[[cobblestone,55],[cobbled_deepslate,30],[mossy_cobblestone,15]] wall:[[spruce_planks,75],[stripped_spruce_log,25]] upperWall:=wall infill:[[spruce_planks,1]]
frame:[[dark_oak_log,60],[spruce_log,40]] beam:[[stripped_dark_oak_log,1]] roof:[[dark_oak_planks,75],[spruce_planks,25]]
roofTrim:[[stripped_oak_log,1]] ridge:[[stripped_spruce_log,1]] soffit:[[spruce_planks,1]] window:[[glass,1]] shutter:[[spruce_planks,50],[dark_oak_planks,50]] door:[[dark_oak_planks,1]]
floor:[[spruce_planks,1]] path:[[dirt_path,50],[coarse_dirt,30],[cobblestone,20]] chimney:[[cobblestone,65],[mossy_cobblestone,20],[stone,15]] accent:[[red_wool,1]]

# P10 rustic_alpine_stone_roof – Alpenhütte mit Steinplattendach | Winter ★★★ | ΔE00 W–D 25 W–R 15 R–D 34 D–K 35 S–W 23
plinth:[[cobblestone,50],[stone,30],[mossy_cobblestone,20]] wall:[[spruce_planks,75],[stripped_spruce_log,25]] upperWall:=wall infill:[[spruce_planks,1]]
frame:[[dark_oak_log,1]] beam:[[dark_oak_log,1]] roof:[[andesite,45],[cobblestone,35],[stone,20]]
roofTrim:[[dark_oak_planks,1]] ridge:[[cobblestone,1]] soffit:[[spruce_planks,1]] window:[[glass,1]] shutter:[[dark_oak_planks,1]] door:[[spruce_planks,1]]
floor:[[spruce_planks,1]] path:[[cobblestone,40],[stone,30],[coarse_dirt,30]] chimney:[[cobblestone,60],[stone,40]] accent:[[red_terracotta,1]]

# P11 rustic_oak_cottage – Helles Eichen-Cottage, Birke an der Sonnenseite | Winter ★★☆ | ΔE00 W–D 18 W–R 32 R–D 15 D–K 15 S–W 19
plinth:[[cobblestone,50],[stone,30],[mossy_cobblestone,20]] wall:[[oak_planks,70],[stripped_oak_log,20],[birch_planks,10]] upperWall:=wall infill:[[oak_planks,1]]
frame:[[dark_oak_log,60],[spruce_log,40]] beam:[[stripped_dark_oak_log,1]] roof:[[spruce_planks,65],[dark_oak_planks,35]]
roofTrim:[[dark_oak_planks,1]] ridge:[[dark_oak_log,1]] soffit:[[spruce_planks,1]] window:[[glass,1]] shutter:[[spruce_planks,1]] door:[[spruce_planks,1]]
floor:[[spruce_planks,1]] path:[[dirt_path,45],[coarse_dirt,30],[cobblestone,25]] chimney:[[bricks,75],[cobblestone,25]] accent:[[red_wool,1]]

# P12 rustic_logcabin – Blockhaus aus liegenden Stämmen | Winter ★★★ | ΔE00 W–D 16 W–R 18 R–D 2 D–K 15 S–W 21
plinth:[[cobblestone,45],[cobbled_deepslate,35],[mossy_cobblestone,20]] wall:[[stripped_spruce_log,75],[oak_log,25]] upperWall:=wall infill:[[stripped_spruce_log,1]]
frame:[[spruce_log,1]] beam:[[spruce_log,1]] roof:[[dark_oak_planks,70],[spruce_planks,30]]
roofTrim:[[spruce_planks,1]] ridge:[[spruce_log,1]] soffit:[[spruce_planks,1]] window:[[glass,1]] shutter:[[dark_oak_planks,1]] door:[[dark_oak_planks,1]]
floor:[[spruce_planks,1]] path:[[coarse_dirt,40],[dirt_path,40],[cobblestone,20]] chimney:[[cobblestone,60],[mossy_cobblestone,25],[cobbled_deepslate,15]] accent:[[red_wool,1]]
```

**Nordisch (nordic)**

```text
# P13 nordic_falu – Schwedenrot mit weißen Kanten, Schieferdach (weiße Kanten nur 1.21.11) | Winter ★★★★ | ΔE00 W–D 22 W–R 57 R–D 64 D–K 61 S–W 29
plinth:[[cobblestone,45],[cobbled_deepslate,35],[stone,20]] wall:[[mangrove_planks,75],[stripped_mangrove_log,25]] upperWall:=wall infill:[[mangrove_planks,1]]
frame:[[stripped_pale_oak_log,1]] beam:[[stripped_pale_oak_log,1]] roof:[[deepslate_tiles,60],[deepslate_bricks,25],[cobbled_deepslate,15]]
roofTrim:[[pale_oak_planks,1]] ridge:[[deepslate_bricks,1]] soffit:[[pale_oak_planks,1]] window:[[glass,1]] shutter:[[pale_oak_planks,1]] door:[[spruce_planks,1]]
floor:[[spruce_planks,1]] path:[[cobblestone,45],[stone,30],[coarse_dirt,25]] chimney:[[stone_bricks,60],[cobblestone,40]] accent:[[calcite,1]]

# P14 nordic_longhouse – Langhaus, Fichte, dunkle Traufreihen | Winter ★★★ | ΔE00 W–D 15 W–R 15 R–D 5 D–K 32 S–W 19
plinth:[[cobbled_deepslate,50],[blackstone,25],[cobblestone,25]] wall:[[spruce_planks,70],[stripped_spruce_log,30]] upperWall:=wall infill:[[spruce_planks,1]]
frame:[[dark_oak_log,1]] beam:[[dark_oak_log,1]] roof:[[dark_oak_planks,65],[spruce_planks,35]]
roofTrim:[[oak_planks,1]] ridge:[[spruce_log,1]] soffit:[[dark_oak_planks,1]] window:[[glass,50],[brown_stained_glass,50]] shutter:[[dark_oak_planks,1]] door:[[dark_oak_planks,1]]
floor:[[spruce_planks,1]] path:[[cobbled_deepslate,35],[coarse_dirt,35],[dirt_path,30]] chimney:[[cobbled_deepslate,70],[cobblestone,30]] accent:[[red_wool,1]]

# P15 nordic_sod_roof – Geteerte Wand, Torfdach-Optik | Winter ★★☆ | ΔE00 W–D 30 W–R 16 R–D 18 D–K 20 S–W 32
plinth:[[cobblestone,45],[cobbled_deepslate,35],[mossy_cobblestone,20]] wall:[[dark_oak_planks,70],[stripped_dark_oak_log,30]] upperWall:=wall infill:[[dark_oak_planks,1]]
frame:[[stripped_spruce_log,1]] beam:[[stripped_spruce_log,1]] roof:[[mossy_cobblestone,60],[mossy_stone_bricks,25],[cobblestone,15]]
roofTrim:[[spruce_planks,1]] ridge:[[moss_block,1]] soffit:[[spruce_planks,1]] window:[[glass,1]] shutter:[[spruce_planks,1]] door:[[spruce_planks,1]]
floor:[[spruce_planks,1]] path:[[coarse_dirt,40],[dirt_path,35],[mossy_cobblestone,25]] chimney:[[cobblestone,60],[mossy_cobblestone,40]] accent:[[red_wool,1]]

# P16 nordic_ochre – Gelbbraunes Eichenhaus, weiße Kanten, Schiefer (weiß nur 1.21.11) | Winter ★★★ | ΔE00 W–D 35 W–R 33 R–D 64 D–K 61 S–W 20
plinth:[[stone_bricks,40],[cobblestone,40],[andesite,20]] wall:[[oak_planks,75],[stripped_oak_log,25]] upperWall:=wall infill:[[oak_planks,1]]
frame:[[stripped_pale_oak_log,1]] beam:[[stripped_pale_oak_log,1]] roof:[[deepslate_tiles,60],[deepslate_bricks,25],[cobbled_deepslate,15]]
roofTrim:[[pale_oak_planks,1]] ridge:[[deepslate_bricks,1]] soffit:[[pale_oak_planks,1]] window:[[glass,1]] shutter:[[dark_oak_planks,1]] door:[[spruce_planks,1]]
floor:[[spruce_planks,1]] path:[[cobblestone,40],[stone,35],[coarse_dirt,25]] chimney:[[stone_bricks,70],[cobblestone,30]] accent:[[red_terracotta,1]]
```

**Japanisch (japanese)**

```text
# P17 japanese_shikkui – Kalkputz, mittelbraune Ständer, Kawara-Grau | Winter ★★★ | ΔE00 W–D 60 W–R 43 R–D 22 D–K 15 S–W 27
plinth:[[stone_bricks,40],[andesite,35],[polished_andesite,25]] wall:[[white_concrete,60],[calcite,30],[smooth_quartz,10]] upperWall:=wall infill:[[white_concrete,1]]
frame:[[stripped_spruce_log,60],[stripped_dark_oak_log,40]] beam:[[stripped_dark_oak_log,1]] roof:[[deepslate_tiles,65],[polished_deepslate,20],[deepslate_bricks,15]]
roofTrim:[[dark_oak_planks,1]] ridge:[[polished_deepslate,1]] soffit:[[spruce_planks,1]] window:[[white_stained_glass,1]] shutter:[[spruce_planks,1]] door:[[spruce_planks,1]]
floor:[[spruce_planks,1]] path:[[polished_andesite,40],[andesite,35],[stone,25]] chimney:[[stone_bricks,1]] accent:[[red_terracotta,1]]

# P18 japanese_shrine – Schrein: Zinnober-Holz, Kalkputz, Kupferdach | Winter ★★★ | ΔE00 W–D 29 W–R 53 R–D 52 D–K 45 S–W 27
plinth:[[stone_bricks,45],[polished_andesite,35],[andesite,20]] wall:[[white_concrete,70],[calcite,30]] upperWall:=wall infill:[[white_concrete,1]]
frame:[[stripped_mangrove_log,1]] beam:[[stripped_mangrove_log,1]] roof:[[waxed_oxidized_cut_copper,60],[waxed_weathered_cut_copper,40]]
roofTrim:[[dark_oak_planks,1]] ridge:[[dark_oak_planks,1]] soffit:[[mangrove_planks,1]] window:[[white_stained_glass,1]] shutter:[[mangrove_planks,1]] door:[[mangrove_planks,1]]
floor:[[dark_oak_planks,1]] path:[[polished_andesite,45],[stone,30],[andesite,25]] chimney:[[stone_bricks,1]] accent:[[red_terracotta,1]]

# P19 japanese_machiya – Stadthaus: Yakisugi unten, Putz oben | Winter ★★★ | ΔE00 W–D 15/60 W–R 16/43 R–D 22 D–K 21 S–W 30
plinth:[[stone_bricks,40],[cobbled_deepslate,35],[polished_andesite,25]] wall:[[dark_oak_planks,65],[stripped_dark_oak_log,35]] upperWall:[[white_concrete,65],[calcite,35]] infill:[[white_concrete,1]]
frame:[[stripped_spruce_log,1]] beam:[[stripped_spruce_log,1]] roof:[[deepslate_tiles,60],[polished_deepslate,25],[deepslate_bricks,15]]
roofTrim:[[spruce_planks,1]] ridge:[[polished_deepslate,1]] soffit:[[spruce_planks,1]] window:[[white_stained_glass,1]] shutter:[[spruce_planks,1]] door:[[spruce_planks,1]]
floor:[[spruce_planks,1]] path:[[polished_andesite,40],[andesite,35],[stone,25]] chimney:[[stone_bricks,1]] accent:[[red_terracotta,1]]

# P20 japanese_teahouse – Teehaus: Lehmwand, Bambus, Moosgarten | Winter ★★☆ | ΔE00 W–D 23 W–R 20 R–D 6 D–K 15 S–W 19
plinth:[[polished_andesite,45],[andesite,35],[stone,20]] wall:[[packed_mud,75],[mud_bricks,25]] upperWall:=wall infill:[[packed_mud,1]]
frame:[[stripped_dark_oak_log,60],[dark_oak_log,40]] beam:[[stripped_bamboo_block,1]] roof:[[dark_oak_planks,70],[spruce_planks,30]]
roofTrim:[[spruce_planks,1]] ridge:[[dark_oak_planks,1]] soffit:[[bamboo_planks,1]] window:[[white_stained_glass,1]] shutter:[[bamboo_planks,1]] door:[[bamboo_planks,1]]
floor:[[bamboo_mosaic,1]] path:[[polished_andesite,40],[moss_block,30],[andesite,30]] chimney:[[stone_bricks,1]] accent:[[moss_block,1]]
```

**Kirschblüte (cherry)**

```text
# P21 cherry_slate – Kirschholz, dunkler Sockel, Schiefer, rosa Traufkante | Winter ★★★ | ΔE00 W–D 56 W–R 60 R–D 14 D–K 56 S–W 47
plinth:[[polished_deepslate,55],[deepslate_bricks,30],[cobbled_deepslate,15]] wall:[[cherry_planks,75],[stripped_cherry_log,25]] upperWall:=wall infill:[[calcite,1]]
frame:[[cherry_log,60],[dark_oak_log,40]] beam:[[cherry_log,1]] roof:[[deepslate_tiles,65],[polished_deepslate,20],[deepslate_bricks,15]]
roofTrim:[[cherry_planks,1]] ridge:[[cherry_planks,1]] soffit:[[dark_oak_planks,1]] window:[[glass,60],[white_stained_glass,40]] shutter:[[cherry_planks,1]] door:[[cherry_planks,1]]
floor:[[cherry_planks,1]] path:[[stone_bricks,40],[polished_andesite,35],[andesite,25]] chimney:[[stone_bricks,1]] accent:[[pink_stained_glass,1]]

# P22 cherry_shikkui – Weißer Putz, Kirschstämme, dunkles Holzdach | Winter ★★★ | ΔE00 W–D 66 W–R 71 R–D 18 D–K 58 S–W 49
plinth:[[polished_deepslate,55],[deepslate_bricks,30],[cobbled_deepslate,15]] wall:[[white_concrete,60],[calcite,40]] upperWall:=wall infill:[[white_concrete,1]]
frame:[[cherry_log,1]] beam:[[stripped_cherry_log,1]] roof:[[dark_oak_planks,75],[spruce_planks,25]]
roofTrim:[[cherry_planks,1]] ridge:[[cherry_planks,1]] soffit:[[cherry_planks,1]] window:[[glass,1]] shutter:[[cherry_planks,1]] door:[[cherry_planks,1]]
floor:[[cherry_planks,1]] path:[[polished_andesite,40],[stone_bricks,35],[andesite,25]] chimney:[[stone_bricks,1]] accent:[[pink_stained_glass,1]]

# P23 cherry_pink_roof – Rosa Dach auf dunkler Holzwand (First-Bleiche nur 1.21.11) | Winter ★★☆ | ΔE00 W–D 58 W–R 47 R–D 10 D–K 58 S–W 30
plinth:[[stone_bricks,50],[andesite,30],[polished_andesite,20]] wall:[[dark_oak_planks,65],[stripped_dark_oak_log,35]] upperWall:=wall infill:[[dark_oak_planks,1]]
frame:[[stripped_cherry_log,1]] beam:[[stripped_cherry_log,1]] roof:[[cherry_planks,85],[pale_oak_planks,15]]
roofTrim:[[dark_oak_planks,1]] ridge:[[dark_oak_planks,1]] soffit:[[dark_oak_planks,1]] window:[[glass,1]] shutter:[[cherry_planks,1]] door:[[cherry_planks,1]]
floor:[[cherry_planks,1]] path:[[stone_bricks,40],[andesite,35],[polished_andesite,25]] chimney:[[stone_bricks,1]] accent:[[pink_stained_glass,1]]

# P24 cherry_bamboo_garden – Frühling: Kirsch-Stamm-Wand, Mangrovendach, Bambus | Winter ★☆☆ | ΔE00 W–D 36 W–R 48 R–D 18 D–K 44 S–W 25
plinth:[[polished_andesite,45],[andesite,35],[stone,20]] wall:[[stripped_cherry_log,70],[cherry_planks,30]] upperWall:=wall infill:[[cherry_planks,1]]
frame:[[cherry_log,1]] beam:[[cherry_log,1]] roof:[[mangrove_planks,75],[crimson_planks,25]]
roofTrim:[[cherry_planks,1]] ridge:[[cherry_planks,1]] soffit:[[bamboo_planks,1]] window:[[glass,1]] shutter:[[bamboo_planks,1]] door:[[bamboo_planks,1]]
floor:[[bamboo_mosaic,1]] path:[[polished_andesite,40],[andesite,30],[moss_block,30]] chimney:[[stone_bricks,1]] accent:[[bamboo_mosaic,1]]
```

**Modern (modern)**

```text
# P25 modern_white_black – Weißer Kubus, schwarze Rahmen, Plattenwechsel paneelweise | Winter ★★☆ | ΔE00 W–D 49 W–R 76 R–D 19 D–K 19 S–W 49
plinth:[[polished_deepslate,70],[deepslate_tiles,30]] wall:[[white_concrete,85],[smooth_quartz,15]] upperWall:=wall infill:[[white_concrete,1]]
frame:[[black_concrete,1]] beam:[[black_concrete,1]] roof:[[polished_deepslate,70],[deepslate_tiles,30]]
roofTrim:[[black_concrete,1]] ridge:[[smooth_stone,1]] soffit:[[smooth_stone,1]] window:[[glass,1]] shutter:[[iron,1]] door:[[iron,1]]
floor:[[smooth_stone,1]] path:[[smooth_stone,60],[polished_andesite,40]] chimney:[[gray_concrete,1]] accent:[[stripped_oak_log,1]]

# P26 modern_scandi_pale – Skandi-Modern: weiß, Blasseiche, Anthrazit (nur 1.21.11) | Winter ★★★ | ΔE00 W–D 60/61 W–R 58/60 R–D 3 D–K 61 S–W 35
plinth:[[polished_tuff,60],[tuff_bricks,40]] wall:[[white_concrete,70],[calcite,30]] upperWall:[[pale_oak_planks,1]] infill:[[white_concrete,1]]
frame:[[gray_concrete,1]] beam:[[gray_concrete,1]] roof:[[deepslate_tiles,60],[polished_deepslate,40]]
roofTrim:[[pale_oak_planks,1]] ridge:[[polished_deepslate,1]] soffit:[[pale_oak_planks,1]] window:[[glass,1]] shutter:[[iron,1]] door:[[pale_oak_planks,1]]
floor:[[pale_oak_planks,1]] path:[[smooth_stone,55],[polished_andesite,45]] chimney:[[gray_concrete,1]] accent:[[waxed_cut_copper,1]]

# P27 modern_charcoal_wood – Anthrazit-Sockelgeschoss, Eichenverkleidung oben | Winter ★★★ | ΔE00 W–D 34/21 W–R 19/47 R–D 51 D–K 41 S–W 34
plinth:[[smooth_stone,60],[polished_andesite,40]] wall:[[polished_deepslate,70],[deepslate_tiles,30]] upperWall:[[oak_planks,80],[jungle_planks,20]] infill:[[oak_planks,1]]
frame:[[black_concrete,1]] beam:[[black_concrete,1]] roof:[[smooth_stone,1]]
roofTrim:[[polished_blackstone,1]] ridge:[[smooth_stone,1]] soffit:[[oak_planks,1]] window:[[glass,1]] shutter:[[iron,1]] door:[[dark_oak_planks,1]]
floor:[[oak_planks,1]] path:[[smooth_stone,60],[polished_andesite,40]] chimney:[[polished_deepslate,1]] accent:[[waxed_cut_copper,1]]

# P28 modern_patina_glass – Quarz, Kupferverkleidung, Glas | Winter ★★☆ | ΔE00 W–D 53/31 W–R 62/36 R–D 6 D–K 31 S–W 53
plinth:[[polished_deepslate,70],[deepslate_tiles,30]] wall:[[smooth_quartz,70],[quartz_bricks,30]] upperWall:[[waxed_weathered_cut_copper,60],[waxed_oxidized_cut_copper,40]] infill:[[smooth_quartz,1]]
frame:[[gray_concrete,1]] beam:[[gray_concrete,1]] roof:[[polished_deepslate,1]]
roofTrim:[[waxed_weathered_cut_copper,1]] ridge:[[smooth_stone,1]] soffit:[[smooth_stone,1]] window:[[glass,1]] shutter:[[waxed_oxidized_cut_copper,1]] door:[[iron,1]]
floor:[[smooth_stone,1]] path:[[smooth_stone,60],[polished_andesite,40]] chimney:[[gray_concrete,1]] accent:[[waxed_cut_copper,1]]
```

**Mediterran (mediterranean)**

```text
# P29 mediterranean_cycladic – Kykladen: Kalkweiß, blaue Läden, Flachdach | Winter ★☆☆ | ΔE00 W–D 8 W–R 28 R–D 27 D–K 4 S–W 22
plinth:[[polished_andesite,40],[andesite,35],[stone,25]] wall:[[white_concrete,55],[calcite,30],[smooth_quartz,15]] upperWall:=wall infill:[[white_concrete,1]]
frame:[[stripped_oak_log,1]] beam:[[stripped_oak_log,1]] roof:[[smooth_quartz,1]]
roofTrim:[[calcite,1]] ridge:[[smooth_quartz,1]] soffit:[[oak_planks,1]] window:[[light_blue_stained_glass,50],[blue_stained_glass,50]] shutter:[[warped_planks,1]] door:[[warped_planks,1]]
floor:[[smooth_stone,1]] path:[[stone,50],[smooth_stone,25],[calcite,25]] chimney:[[white_concrete,1]] accent:[[blue_concrete,1]]

# P30 mediterranean_tuscan – Toskana: Sandsteinputz, Lehmsockel, Ziegelmischung | Winter ★☆☆ | ΔE00 W–D 38 W–R 39 R–D 16 D–K 36 S–W 35
plinth:[[mud_bricks,45],[packed_mud,30],[granite,25]] wall:[[smooth_sandstone,65],[cut_sandstone,20],[sandstone,15]] upperWall:=wall infill:[[smooth_sandstone,1]]
frame:[[stripped_spruce_log,1]] beam:[[stripped_spruce_log,1]] roof:[[bricks,55],[granite,25],[mud_bricks,20]]
roofTrim:[[sandstone,1]] ridge:[[mud_bricks,1]] soffit:[[spruce_planks,1]] window:[[glass,1]] shutter:[[warped_planks,60],[spruce_planks,40]] door:[[spruce_planks,1]]
floor:[[spruce_planks,1]] path:[[mud_bricks,40],[packed_mud,30],[coarse_dirt,30]] chimney:[[smooth_sandstone,70],[bricks,30]] accent:[[orange_terracotta,1]]

# P31 mediterranean_andalusian – Kalkweiß, Granitsockel, rosé Ziegel, weiße Traufe | Winter ★★☆ | ΔE00 W–D 36 W–R 43 R–D 14 D–K 37 S–W 36
plinth:[[granite,50],[polished_granite,30],[mud_bricks,20]] wall:[[white_concrete,60],[calcite,25],[smooth_quartz,15]] upperWall:=wall infill:[[white_concrete,1]]
frame:[[stripped_spruce_log,60],[stripped_dark_oak_log,40]] beam:[[stripped_spruce_log,1]] roof:[[granite,50],[bricks,35],[polished_granite,15]]
roofTrim:[[smooth_quartz,1]] ridge:[[bricks,1]] soffit:[[spruce_planks,1]] window:[[glass,1]] shutter:[[spruce_planks,1]] door:[[dark_oak_planks,1]]
floor:[[spruce_planks,1]] path:[[granite,35],[stone,35],[polished_granite,30]] chimney:[[white_concrete,1]] accent:[[orange_terracotta,1]]

# P32 mediterranean_ochre – Ocker-Fassade, weiße Gesimse, Ziegeldach, türkise Läden | Winter ★☆☆ | ΔE00 W–D 24 W–R 33 R–D 39 D–K 39 S–W 27
plinth:[[stone_bricks,45],[andesite,35],[stone,20]] wall:[[yellow_terracotta,1]] upperWall:=wall infill:=upperWall
frame:[[smooth_quartz,1]] beam:[[smooth_quartz,1]] roof:[[bricks,60],[mud_bricks,25],[granite,15]]
roofTrim:[[smooth_quartz,1]] ridge:[[bricks,1]] soffit:[[spruce_planks,1]] window:[[glass,1]] shutter:[[warped_planks,1]] door:[[dark_oak_planks,1]]
floor:[[spruce_planks,1]] path:[[stone,40],[andesite,30],[smooth_stone,30]] chimney:[[smooth_quartz,1]] accent:[[orange_terracotta,1]]
```

## (d) Kritik der 19 Paletten in `palettes.ts`

Alle Abstände sind ΔE00 und beziehen sich auf den jeweils ersten Eintrag einer Rolle.

| Palette | Befund (gemessen) | Vorschlag |
|---|---|---|
| medieval_timber | Sockel cobblestone ↔ Wand stone_bricks 2,2: kein Absatz. Putz white_terracotta mit HF 0,7 neben dark_oak (HF 4,0) wirkt wie Plastik. Einmaterial-Dach. | Sockel mit cobbled_deepslate als Grundblock; Kalkputz-Mischung calcite/smooth_quartz; Dach mit Drip → **P02** bzw. **P01** |
| medieval_stone | Wand, Obergeschoss, Füllung und Dachkante alle stone_bricks; die Risse-Variante ist unsichtbar (1,6). Das Dach ist eine schwarze Fläche (Screenshot). | Wand 65/20/15 nach T2, Dach K5 (tiles 65, bricks 20, cobbled 15), Kante wahlweise dark_oak → **P02** |
| medieval_tudor | Sockel = Wand = cobblestone (0,0). HF 11,2 im ganzen Erdgeschoss. Rahmen spruce_log ↔ Dach dark_oak 2,1. | Wand cobblestone 60 / stone 25 / andesite 15 (leiser, ΔE ≤ 3,2), Sockel dunkel, Dach Fichte mit dunkler Traufe → **P01** |
| fantasy_storybook | Starke Massen (54/50), aber dreimal flaches white_terracotta. Rahmen ↔ Dach 5,7. | Putz mit Mischpartner, Dach dark_oak 65 / spruce 35, Kante spruce → **P05** |
| fantasy_crimson | Kontraste gut (60/67). Sockel mossy_cobblestone 1:1 mit cobbled_deepslate (19,9) wirkt fleckig. Das Dach ist einfarbig und magenta (C 26). | Sockel als Kette K16/K2 mit dem dunklen Block unten; Dach crimson 70 / mangrove 30 (12,7) → **P07** |
| fantasy_warped | warped_planks HF 9,1 und C 22 auf der ganzen Dachfläche ist zu laut. Der Putz ist flach. | Patinadach waxed_oxidized/weathered_cut_copper (7,9), warmer Rahmen als Komplement → **P06** |
| rustic_spruce | Braun in Braun: Wand–Dach 14,7, Wand–Rahmen 16,7, Rahmen–Dach 2,1, Dachkante = Wand (Screenshot). | Helle Traufkante stripped_oak_log (38 zum Dach), Dach mit Bleiche, Wand mit stripped-Partner → **P09** oder Steindach **P10** |
| rustic_oak | oak_planks ist laut (HF 7,5). Dachkante dark_oak = Rahmenfarbe. Sonst solide (18/32). | Wand oak 70 / stripped_oak 20 / birch 10 (birch–oak [2]), Dach mit dunkler Traufe → **P11** |
| rustic_logs | Großfläche stripped_spruce_log mit HF 2,0 wirkt glatt. Rahmen ↔ Dach 2,1. | oak_log als Texturpartner (ΔE 2,0, HF 8,6), Dach dark_oak/spruce → **P12** |
| nordic_longhouse | Rahmen dark_oak_log ↔ Dach dark_oak_planks 5,0. Wand–Dach 14,7. Dachkante = Wand. | Helle Traufkante oak_planks, Dach dark_oak 65 / spruce 35 → **P14**; Winter-Leitpalette **P13** |
| nordic_dark | Dach (spruce, L 38) **heller** als die Wand (L 20), der Sockel (L 33) ebenso: umgekehrter Verlauf. Rahmen ↔ Dach 2,5. | Torfdach-Optik **P15** oder Schieferdach; heller Rahmen bleibt |
| japanese_classic | Wand–Rahmen 58: Fast-Schwarz auf Reinweiß wirkt wie ein Zebra. white_concrete hat HF 0,3. | Mittelbraune Ständer (stripped_spruce_log), Putzmischung, Dach K5 → **P17** |
| japanese_temple | Dachkante red_nether_bricks (L 12) wirkt schwarz statt zinnoberrot. Rahmen ↔ Dach 5,0. Screenshot sehr dunkel. | Zinnober über stripped_mangrove_log (ΔE 7 zu Falunrot), Kupferdach → **P18** |
| cherry_slate | Gut (56/60). Einfarbige Wand, die Kante dark_oak ↔ Schiefer ist nur 15,2. | Wand cherry 75 / stripped_cherry 25 (9,7), Kante cherry_planks (56) → **P21** |
| cherry_white | Helles Dach (cherry, L 77) auf heller Wand (L 85), 21,2; die Lint-Warnung „helle Wand + helles Dach“ trifft. Screenshot: rosa Pyramide. | Dunkles Dach mit Kirschkante **P22**, oder rosa Dach auf dunkler Holzwand **P23** |
| modern_white | Solide. Großfläche white_concrete mit HF 0,3. Sockel = Dach polished_deepslate. | Paneelweise 15 % smooth_quartz, Sockel 70/30 mit tiles → **P25** |
| modern_wood | Dachkante gray_concrete ↔ Dach polished_deepslate 5,6: die Kante verschwindet. Rahmen ↔ Dach ebenso. | Kante black_concrete oder pale_oak_planks → **P25** / **P26** |
| mediterranean_white | Sockel stone_bricks : sandstone 1:1, zwischen beiden ΔE 30,0: kalt und warm gestreut. Ziegeldach einfarbig. | Warmer Granitsockel K8, Dach granite/bricks/polished_granite → **P31** |
| mediterranean_warm | Kalter Sockel stone_bricks unter warmem smooth_sandstone (31,5). Die Wand ist einfarbig, weil smooth_sandstone keine Liste hat. | Sockel mud_bricks/packed_mud/granite, Wand smooth/cut/sandstone (ΔE ≤ 3), Dach mit Brennvarianz → **P30** |

## Fehler, die Profis vermeiden

1. **Zufällig streuen** (Splattering, Smallpox) und **waagerecht schichten** (Sandwiching) [1][4]. Beides macht `texturing.ts` heute (S2).
2. **Ein Block für eine große Fläche**: „Plain plank walls are not enough on their own“ [2], „avoid … long unbroken runs“ [2]. Das gilt auch für Dächer [2].
3. **Verwitterung ohne Ursache**: „Avoid random discoloration“ [2]. Moos gehört dorthin, wo Wasser steht, Bleiche dorthin, wo Sonne trifft, Risse an Kanten.
4. **Sprünge über Stufen**: Nachbarn in der Kette liegen ΔE00 2–12 auseinander. Übersprungene Stufen sind nur als bewusster Akzent erlaubt [4].
5. **Rahmen gleich Dach**: Der Rahmen verschwindet an der Traufe. Ohne eine Kontrastkante fehlt die Trennung (8 der 19 Paletten).
6. **Laute Texturen großflächig**: cobblestone, diorite und coarse_dirt (HF > 11) als ganze Wand. Glatte Blöcke (HF < 1) ohne Partner oder Relief.
7. **Temperaturbruch**: kalter grauer Stein unter warmem Sandstein oder Terrakotta, beides 1:1 gestreut.
8. **Gesättigte Hölzer neben gedecktem Stein** (acacia C 46, bamboo C 49,5) außerhalb eines Akzents. Das steht schon in der alten Notiz und ist hier gemessen bestätigt.
9. **„Rot“ zu dunkel oder zu bunt**: red_nether_bricks (L 12) liest sich schwarz. Für Zinnober oder Falunrot passt stripped_mangrove_log, mangrove_planks oder red_terracotta (ΔE 7–8).
10. **Moos im Schnee**: Mojangs Schneedorf hat keins [6].
11. **Ungewachstes Kupfer**: Es oxidiert weiter und verändert den Look und das Licht der copper_bulb [10].
12. **Paletten aus dem Netz ungeprüft übernehmen**: blockpalettes enthält Blöcke aus Versionen nach 1.21.11 [22].

## Empfehlungen für den Generator

Priorisiert. Jede Empfehlung nennt Modul, Art (Daten oder Regel) und Akzeptanzkriterium.

1. **Verwitterungsfeld reparieren**
   - Modul: `texturing.ts`, `walls.ts:152`, `roundTower.ts:113`. Art: Regel.
   - Die Höhe wird ab Gelände gemessen und verrauscht (h' = h + 1,5·n).
   - Rauschen aus zwei Oktaven (Zellgröße 6 und 2).
   - Schwellen nach dem Zielanteil: gepflegt ≤ 25 % Partner, Reihe 0 ≤ 35 %. `underOverhang` senkt Moos, `drip` wird von den Öffnungen übergeben.
   - Akzeptanz: Ein Test über 40 Seeds × 60 Blöcke ergibt:
     - Reihe 0 mit 20–35 % Partner, Reihe 3 mit ≥ 3 %;
     - keine Reihe über 60 %;
     - einen Median der Clusterlänge von 2–4;
     - keine zweite Bandspitze über dem Sockel.
2. **Zwei Kanäle statt einer Liste**
   - Modul: `materials.ts`. Art: Daten.
   - `weathering` wird ersetzt durch `{ moist: [...], damage: [...], bleach: [...] }`. Beispiel stone_bricks: moist mossy_stone_bricks, damage cracked_stone_bricks, bleach polished_andesite.
   - Neue Listen für alle Hölzer (stripped_* als damage/bleach), Putz (calcite, white_concrete, smooth_quartz), smooth_sandstone und Lehm.
   - Im Winter wird der moist-Kanal auf ≤ 5 % gedämpft.
   - Akzeptanz: Jede Wandfläche über 30 Blöcke hat mindestens einen Partner. Lint: Partner ↔ Grundblock ΔE00 ≤ 12.
3. **Dachmischung T1**
   - Modul: `roofEngine.ts` (`pieceState` je Spalte mit `l.d`, Kehle und Seite). Art: Regel plus Daten (`roofBlend` in der Palette).
   - Akzeptanz:
     - Auf Satteldächern ab 4 Reihen tragen die Reihen d=0..1 ≥ 40 % Partner, d≥3 ≤ 10 %.
     - Treppenformen sind identisch zum Einmaterial-Dach. Zum Prüfen wird nur das Material verglichen, ein Auflöser-Fixpunkt-Test.
     - 0 Validator-Reparaturen.
4. **Paletten-Semantik „Mischrolle“**
   - Modul: `palettes.ts`, `resolveInput.ts:64`, `templates/place`. Art: Daten.
   - Bei Mischrollen wird die ganze gewichtete Liste übergeben, nicht ein gewählter Block.
   - Akzeptanz: Die Materialliste eines Hauses aus P02 zeigt alle drei Wandblöcke in einer Spanne von ±10 % um ihre Gewichte.
5. **Lints auf ΔE00 und Rauschen**
   - Modul: `lints.ts`, `textureStats.ts` (Spalten a\*, b\*, HF ergänzen; Generator-Test `deriveTextureStats`). Art: Regel.
   - Schwellen nach T10. Dazu HF-Regel T7, Temperaturregel T9 und Akzentfläche ≤ 10 %.
   - `familyKey` normalisiert auch `waxed_`, `exposed_`, `weathered_` und `oxidized_`. Mischpartner mit ΔE00 ≤ 12 zählen nicht als eigene Familie.
   - Akzeptanz: Die alten 19 Paletten melden die Befunde aus (d), die 32 neuen sind fehlerfrei.
6. **Versionsersatz statt Sperre**
   - Modul: `lints.ts:77`, `materials.ts`. Art: Daten.
   - Je Material ein `fallback: { '1.21.1': 'smooth_quartz' }` nach der Ersatztabelle in (a).
   - pale_oak in die Hölzer aufnehmen; resin_bricks, chiseled_tuff_bricks, cut_sandstone, chiseled_sandstone und cut_red_sandstone in die Steine.
   - Akzeptanz: P08 und P13 bauen in beiden Versionen mit 0 Reparaturen.
7. **32 Paletten übernehmen**
   - Modul: `palettes.ts`, `styles.ts` (4 je Stil). Art: Daten.
   - Akzeptanz:
     - Lints grün.
     - Screenshot-Vergleich: Kein Haus zeigt eine einfarbige Dachfläche über 40 Blöcke.
     - Je Stil gibt es mindestens eine Palette mit Winter ★★★.
8. **Thema → Palette**
   - Modul: `resolveInput.ts`. Art: Regel.
   - Bei winter oder christmas werden Paletten mit ★★★ und mehr gewichtet (×2), Moos gedämpft und die Fenster bevorzugt warm (Laterne dahinter).
   - Akzeptanz: Bei 100 Seeds im Stil nordic mit Thema winter wird P13 oder P14 in ≥ 50 % der Fälle gewählt.
9. **Registry ergänzen**
   - Modul: `families.ts`. Art: Daten.
   - Ergänzt werden gravel, mushroom_stem, dripstone_block, pale_moss_block, chiseled_tuff, chiseled_resin_bricks, polished_basalt, podzol und `waxed_*copper_lantern` (nur 1.21.11).
   - Akzeptanz: Der Registry-Test gegen minecraft-data bleibt grün.
10. **Kaminkopf und Tropfspuren**
    - Modul: `components.ts:143–159`, `openings.ts`. Art: Regel.
    - Die obersten 1–2 Kaminreihen bekommen den letzten chimney-Eintrag (Ruß, K16).
    - Fenster ohne Sims bekommen einen 1×2-Tropfstreifen mit p 0,5.
    - Akzeptanz: Sichtprüfung am Screenshot-Satz; Fenster-Vorlagen mit Sims bleiben ohne Streifen.
11. **Doku**
    - Modul: README, ARCHITECTURE.
    - Die Zahl der Paletten wird korrigiert (19), die neue Semantik beschrieben.

## Quellen

1. WesterosCraft Docs – Gradients. https://westeroscraft.com/docs/building/fundamentals/gradients – Helligkeit vor Farbe vor Textur; Splattering, Smallpox, Sandwiching; radialer Cluster; Verwitterung an Fenstern, Kanten, Traufen.
2. WesterosCraft Docs – Exteriors. https://westeroscraft.com/docs/building/fundamentals/exteriors – Holzpaare birch–oak, oak–jungle, jungle–spruce; Holzdach mit zwei Holzarten; Sonnenbleiche am First, Wasserschaden an Traufe und Abflusspunkten; „Avoid random discoloration“.
3. WesterosCraft Docs – Layout & Foundation. https://westeroscraft.com/docs/building/fundamentals/layout-foundation – Fundament ohne sichtbare Erde; Material nach Region und Stand (rough cobble, dressed ashlar).
4. Conquest Reforged – Gradienting your Builds. https://www.conquestreforged.com/guides/gradients – Regen sammelt sich auf Dächern; helle Bogenkanten; Cluster variieren; Streuausnahme für Niedrigkontrast-Sets.
5. misode/mcmeta 1.21.11-data, worldgen/processor_list. https://github.com/misode/mcmeta/tree/1.21.11-data/data/minecraft/worldgen/processor_list – Mojangs Verwitterung: mossify 10/20/70 %, ancient_city 30 %, bastion 30–50 %, trail_ruins, street_*, Trial-Chambers-Bulbs.
6. misode/mcmeta 1.21.11-data, template_pool/village. https://github.com/misode/mcmeta/tree/1.21.11-data/data/minecraft/worldgen/template_pool/village – Ebenen- und Taiga-Häuser mit mossify_10_percent, Schneedorf ohne.
7. misode/mcmeta 1.21.11-assets, textures/block. https://github.com/misode/mcmeta/tree/1.21.11-assets/assets/minecraft/textures/block – Grundlage der eigenen Messung (L\*, C, H, HF, ΔE00).
8. minecraft.wiki – Stronghold. https://minecraft.wiki/w/Stronghold – stone_bricks 45 %, mossy 30 %, cracked 20 %, infested 5 %.
9. minecraft.wiki – Trail Ruins. https://minecraft.wiki/w/Trail_Ruins – Palette aus Terrakotta, mud_bricks, bricks, packed_mud, gravel.
10. minecraft.wiki – Oxidation. https://minecraft.wiki/w/Oxidation – vier Stufen; Wachs stoppt die Oxidation bei gleicher Textur; Gruppen oxidieren langsamer.
11. minecraft.wiki – Tuff. https://minecraft.wiki/w/Tuff – Tuff-Familie seit 1.21 mit Treppen, Stufen und Mauern.
12. minecraft.wiki – Resin Bricks. https://minecraft.wiki/w/Resin_Bricks – seit 1.21.4; Treppe, Stufe, Mauer, chiseled; terrakottaorange.
13. minecraft.wiki – Snow. https://minecraft.wiki/w/Snow – schmilzt ab Blocklicht 12; nicht auf Eis; layers 1–8.
14. minecraft.wiki – Java Edition 1.21.5. https://minecraft.wiki/w/Java_Edition_1.21.5 – leaf_litter, wildflowers, bush, firefly_bush, cactus_flower, dry grass.
15. minecraft.wiki – Java Edition 1.21.9. https://minecraft.wiki/w/Java_Edition_1.21.9 – copper bars, chain, lantern, torch, golem statue, shelves.
16. minecraft.wiki – Java Edition 1.21.11. https://minecraft.wiki/w/Java_Edition_1.21.11 – keine neuen Blöcke; Leaves-Zwischenräume dunkelgrün.
17. minecraft.wiki – Tutorial:Color palette. https://minecraft.wiki/w/Tutorial:Color_palette – Verlauf aus 3–4 Schattierungen; Kontrastpaare.
18. minecraft.wiki – Tutorial:Adding beauty to constructions. https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions – gemischte Böden aus stone, cracked und cobblestone; Dach in der Hauspalette.
19. minecraft.wiki – Tutorial:Roof types. https://minecraft.wiki/w/Tutorial:Roof_types – Flachdachkante immer in einem anderen Block als der übrige Bau.
20. minecraft.wiki – Tutorial:Making nice floors. https://minecraft.wiki/w/Tutorial:Making_nice_floors – „Eroding Floor“ mit 16 andesite und 9 diorite zufällig.
21. minecraft.wiki – Tutorial:Walls and buttresses. https://minecraft.wiki/w/Tutorial:Walls_and_buttresses – „A plain wall of any material is boring“.
22. blockpalettes.com, Featured. https://www.blockpalettes.com/ – Paletten 82100, 81683, 82034, 82118; Blöcke außerhalb von 1.21.11.
23. Colorflow (Modrinth). https://modrinth.com/mod/colorflow – CIEDE2000, Verläufe mit 3–9 Stufen, Güte ≤ 2 grün und ≤ 10 gelb, Ausschluss getönter Blöcke.
24. BlockGradient (Modrinth). https://modrinth.com/project/qeAb5JXa – RGB-Lerp-Verläufe aus Concrete, Terracotta und Wolle.
25. Palettinator (Modrinth). https://modrinth.com/mod/palettinator – hue harmony, saturation balance, Texturklassen patterned/rough/featureless.
26. lambdaisland/witchcraft palette API. https://cljdoc.org/d/com.lambdaisland/witchcraft/0.37.324/api/lambdaisland.witchcraft.palette – material-gradient, gradient-gen mit spread und bleed.
27. GDPC editor.py. https://github.com/avdstaaij/gdpc/blob/master/src/gdpc/editor.py – Blocklisten werden je Position mit `random.choice` gezogen.
28. Salge et al., Generative Design in Minecraft (GDMC), arXiv:1803.09853. https://arxiv.org/abs/1803.09853 – Wettbewerbsziel: ästhetische, glaubwürdige Siedlungen.
29. Salge et al., The AI Settlement Generation Challenge: First Year Report, arXiv:2103.14950. https://arxiv.org/abs/2103.14950 – Kriterien Anpassung, Funktion, Erzählung, Ästhetik.
30. Hervé & Salge, Comparing PCG metrics with Human Evaluation, arXiv:2107.02457. https://arxiv.org/abs/2107.02457 – Zusammenhänge zwischen Metriken der Blockvielfalt und menschlichen Bewertungen.
31. van der Staaij et al., Believable Minecraft Settlements, arXiv:2309.10871. https://arxiv.org/abs/2309.10871 – Sieger GDMC 2022, iterative „organische“ Planung.
32. Wikipedia – Damp (structural). https://en.wikipedia.org/wiki/Damp_(structural) – aufsteigende Feuchte selten über 1,5 m, „tide mark“ unten.
33. Wikipedia – Falu red. https://en.wikipedia.org/wiki/Falu_red – Eisenoxid-Farbe für Holzhäuser in Schweden, Finnland und Norwegen.
34. de.wikipedia – Schwedenrot. https://de.wikipedia.org/wiki/Schwedenrot – Nationalfarbe im schwedischen Holzhausbau; RGB-Wert; kreidiges Altern.
35. Wikipedia – Thatching. https://en.wikipedia.org/wiki/Thatching – Neigung 45–55°; Moos und Flechten auf Reet.
36. Wikipedia – Slate. https://en.wikipedia.org/wiki/Slate – Schiefer grau, „pale to dark“, auch violett und grün.
37. Wikipedia – Patina. https://en.wikipedia.org/wiki/Patina – Grünspan; bildet sich in feuchter und Küstenluft schneller.
38. Wikipedia – Color difference. https://en.wikipedia.org/wiki/Color_difference – JND ΔE ≈ 1 (Entwurf) bzw. 2,3 (CIE76).
39. Wikipedia – Aerial perspective. https://en.wikipedia.org/wiki/Aerial_perspective – Kontrast und Sättigung sinken mit der Distanz.
40. Wikipedia – Japanese architecture. https://en.wikipedia.org/wiki/Japanese_architecture – Holz unbemalt; Zinnober an Schreinen; schwarzer Putz aus Kalk und Tusche.
41. Wikipedia – Yakisugi. https://en.wikipedia.org/wiki/Yakisugi – gekohlte Holzfassaden (Naoshima).
42. Wikipedia – Roof tiles. https://en.wikipedia.org/wiki/Roof_tiles – Farbschwankung von Tonziegeln durch den Brand; Imbrex und Tegula.
43. de.wikipedia – Fachwerkhaus. https://de.wikipedia.org/wiki/Fachwerkhaus – Schweiz: rote Balken, weiße Gefache; Baskenland: dunkelrot.
44. West Oxfordshire Design Guide 9, Roofs. https://www.westoxon.gov.uk/media/d3ohnpd1/9-design-guide-roofs-and-roofing-materials.pdf – Steinplatten in abnehmenden Lagen; Blauschiefer schwankt in der Farbe; Schindeln silbern; Neigung ≥ 45°.
45. Switchblade Gaming – Building Tips. https://www.switchbladegaming.com/minecraft/building-tips/ – 50/30/20, „similar tone, different surface“, 5×5-Test.
46. minecraft.how – Tuff building guide. https://minecraft.how/blog/post/tuff-minecraft-building-guide – Tuff-Varianten als Wand und Trim; nennt den nicht existenten „deepslate tuff“.
47. vibecraft „choosing-materials“. https://skills.sh/amenti-labs/vibecraft/choosing-materials – 60/30/10.
48. Repo: `research_notes/Minecraft Bautechniken für Generator/paletten.md` und `helligkeit_texturen.tsv` – Ausgangsdaten (L\*-Tabelle, Familien mit Treppen).
