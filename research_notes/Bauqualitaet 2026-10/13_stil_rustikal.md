# Stilbibel Rustikal: Blockhütte, Cottage, Bauernhaus, Chalet, Scheune (Stil-ID `rustic`)

Stand 2026-10-23. Thema: Woran man rustikale Bauten echter Profis erkennt und wie der Generator Blockhütte, Reetdach-Cottage, Feldstein-Bauernhaus, Alpenchalet, Scheune und die „gemütliche Weihnachtshütte“ als Daten und Regeln bauen kann.

Abgrenzung: Fachwerk-Raster und Auskragung gehören zu Thema 08 (Mittelalter), Schnee- und Lichtphysik allgemein zu `winter_weihnachten_landschaft.md`, Dachgeometrie allgemein zu `daecher.md`. Hier steht nur, was für `rustic` anders oder genauer ist. Quellen in eckigen Klammern [n], interne Messwerte als [I1] (`src/core/style/textureStats.ts`, L\* aus der 1.21.11-Client-Datei).

## Kurzfassung

Nach Wirkung sortiert:

1. **Eine Blockhütte hat liegende Stämme und Kreuzecken mit Vorköpfen.** Die Stämme liegen in Fassadenrichtung (`axis=x` an Nord und Süd, `axis=z` an Ost und West). An den Ecken laufen die Reihen abwechselnd 1 Block über. Heute liefert `rustic_logs` stehende entrindete Stämme (`axis=y`) mit vorgesetztem Ständergitter. Das wirkt wie eine Palisade, nicht wie eine Hütte [32][33][31]. → T01, T02
2. **Kein Fachwerk-Raster bei `timber: 'none'`.** Rustikale Wände haben Ständer nur an Ecken, Laibungen und Verandapfosten. `walls.ts:166` setzt bei `timber === 'none'` das volle Ständerraster (alle 4 Blöcke, dazu Balken an jeder Geschosslinie). Im Screenshot „groß“ entsteht so ein dunkles Gitter auf braunen Brettern.
3. **Das Dach ist die Hauptfigur und nie einfarbig.** Treppen werden innerhalb der Rolle gemischt, etwa 75/25 mit Clustern. Der First wird betont (Stamm oder Block). Heute bekommt jede Rolle genau ein Material (`palettes.ts:2–4`), und Holz hat keine Verwitterungsliste. Dachflächen aus 60–90 identischen `dark_oak_stairs` wirken wie Wellblech.
4. **Helligkeitsleiter statt Braun auf Braun.** Sockel grau (L\* ≈ 50), dann Wand, Rahmen und Dach mit je ≥ 15 ΔL. In `rustic_spruce` liegen Dach (`dark_oak` 19,8) und Pfosten (`spruce_log` 17,1) fast gleichauf und verschmelzen [I1].
5. **Der Kamin ist ein massiver Feldstein-Außenkamin**, kein 1×1-Rohr: Fuß 3 breit, Schultern, Zug, Kaminkopf, Rauch. Er endet 1–2 Blöcke über dem First [35][9][31]. → T08
6. **Untervarianten als Daten:** Blockhütte, Reet-Cottage, Feldstein-Bauernhaus, Alpenchalet, Scheune und Weihnachtshütte unterscheiden sich in Wand, Dach, Neigung, Überstand, Grundriss und Signaturdetail. Ein einziger Satz Dachprioren für alle (`styles.ts:125–126`) reicht nicht.
7. **Grundrisse rechteckig, etwa 1 : 1,3 bis 1 : 1,6** (9×7, 11×7, 13×9). Das Chalet ist giebelständig (Tiefe > Breite). Die quadratischen Standardmaße 7×7 und 9×9 (`styles.ts:131`) wirken kistig [1][12].
8. **Reetdach geht ohne Mods.** Treppen werden gemischt (oak 55 / birch 30 / jungle 15), die Neigung liegt bei ≥ 45°. Die Untersicht besteht aus Dachmaterial (wirkt dick, ohne Holzleiste), dazu ein Block-First (Moos = Sodenfirst). `hay_block` ist nur Akzent [34][35][16][3]. → T04
9. **Chalet = flaches Satteldach (≈ 26,6°) mit 2–3 Blöcken Überstand, Pfettenköpfen und Geranienbalkon** [38][39][42]. Der Parser setzt bei „chalet“ derzeit `flared` (`parseDescription.ts:1389`), das widerspricht dem „gently sloping roof“.
10. **Die Umgebung erzählt die Geschichte:** Holzstapel, Fässer, Heu, Lattenzaun mit Tor, dichte Blumen-Cluster und Bauerngarten. Heute gibt es eine Laubhecke rund ums Grundstück und Einzelblumen auf leerem Rasen [6][47][31].
11. **Veranda mit Stammpfosten, Rähm und Kopfbändern** (Kopfüber-Treppen), 2–3 tief. Heute tragen Zaunpfosten ein Plattendach (`components.ts:112–127`) [2][5].
12. **Weihnachtshütte:** dunkle Hütte, warmes Licht, rauchender Kamin (optional Signalrauch über `hay_block`, 24 statt 10 Blöcke), Girlande am Verandageländer, W18 und T10 aktiv. Schnee nur auf Wunsch und nur auf vollen Oberseiten: Stamm-First, Holzstapel, obere Stufen [18][19][2]. → Abschnitt (j)
13. **Vanilla ist die offizielle Referenz:** Taiga-Häuser verbauen 89 % ihrer Fichtenstämme liegend, dazu Bruchsteinwände und offene Falltüren als Läden. Das Schneedorf legt Schnee nie auf Treppen oder Stufen [31].
14. **Registry-Lücken für Rustikal:** `gravel`, `podzol`, `farmland`, Feldfrüchte, `composter`, `sweet_berry_bush`, `large_fern`, `tall_grass`, `leaf_litter`, `wildflowers`, `bush`, `firefly_bush`, `water_cauldron`. Außerdem fehlt `pale_oak` als Material in `style/materials.ts:42–54`, obwohl es in der Registry steht.
15. **Reetdach und Mühle gelten im Parser als nicht umsetzbar** (`parseDescription.ts:461`, `:432`). Mit der Reet-Palette (T04) wäre „Strohdach“ baubar.

## Schwächen des aktuellen Generators

Grundlage: `docs/screenshots/haus-rustikal-gross-ohne-thema.jpg` (Rückseite, groß, Seed 1), `haus-rustikal-weihnachten.jpg` (mittel) und der Code.

| # | Befund | Ort | Folge im Bild |
|---|---|---|---|
| S1 | Bei `timber: 'none'` wird das volle Ständerraster gesetzt (`postSet = … plan.input.timber === 'none' ? posts`), dazu Balken an jeder Geschosslinie in d = +1 | `generator/house/walls.ts:166–177` | dunkle Pfosten alle 4 Blöcke plus Querbalken: braunes Fachwerk ohne Füllkontrast, keine Hütte |
| S2 | `rustic_logs` nimmt als Wand `stripped_spruce_log`; `Blocks.block()/weathered()` setzt keine Achse → `axis=y` | `style/palettes.ts:237`, `generator/house/materials.ts:27–35` | stehende Stämme wie eine Palisade, keine Eckverkämmung, kein Stirnholz |
| S3 | `rustic_spruce`: Wand `spruce_planks` 38,3, Rahmen `spruce_log` 17,1, Dach `dark_oak_planks` 19,8 [I1] | `style/palettes.ts:191–196` | Dach und Pfosten zu einer dunklen Masse verschmolzen, nur der Sockel ist grau |
| S4 | Ein Material pro Rolle und Gebäude, Verwitterung nur bei Stein | `style/palettes.ts:2–4`, `style/materials.ts:66–68` (Holz ohne `weathering`) | Dachflächen 9–15 × 6 aus einem einzigen Treppenblock, keine Textur |
| S5 | Firststil für `rustic` = `'slab'` (nur `nordic` bekommt `'log'`) | `generator/house/plan.ts:203` | dünne First-Linie, kein Firstbalken, keine Firstbetonung beim Reetdach |
| S6 | Kamin = 1×1-Zug bis First + 2, Fuß nur 2 breit bis zur OG-Decke, eine Schultertreppe, kein Kopf | `generator/house/components.ts:149–163` | graue Stange über dem Dach (gut sichtbar im großen Screenshot) |
| S7 | Veranda: Zaunpfosten als Stützen, flaches Plattendach ohne Rähm und Kopfbänder | `generator/house/components.ts:80–127` | dünn und provisorisch, wie ein Marktstand |
| S8 | Quadratische Standardmaße 7×7×1 und 9×9×1 | `style/styles.ts:131` | kistige Baukörper, Dach wirkt zu klein |
| S9 | Dachprioren gelten für alle Untertypen; kein Reet, kein flaches Chalet; „chalet“ → `flared` | `style/styles.ts:125–126`, `parseDescription.ts:1389`, `:461`, `:432` | Chalet, Cottage und Hütte sehen gleich aus |
| S10 | Landschaft: Laubhecke rundum, Einzelblumen, keine Zäune und keine Requisiten | `generator/landscape.ts:46`, `:108–117` | leerer Rasen mit Hecke und Streublumen (beide Screenshots) |
| S11 | W18 (Winterfenster) und T10 (Weihnachtseingang) sind keinem Stil zugeordnet | `templates/windows.ts:122`, `templates/doors.ts:31` | Weihnachts-Rustikal ohne eigene Winterfassade |
| S12 | Geschenke als einzelne Wollwürfel irgendwo im Hof; Girlande mit Vollblock-Lichtern | `generator/festive.ts:41`, `:169–170` | cyanfarbene und hellgrüne Würfel auf der Wiese, gelbe „Kisten“ unter der Traufe (Details: Thema Weihnachtsdeko) |
| S13 | `pale_oak` fehlt in `WOODS` | `style/materials.ts:42–54` | kein „weiß gestrichener“ Lattenzaun, keine helle Zierleiste |
| S14 | Rückseite des großen Hauses fast fensterlos | Screenshot groß | Wandfläche über 5 Blöcke ohne Öffnung, nur Pfosten als Gliederung |

Was schon gut ist: Bruchsteinsockel mit Treppenschürze, Dachkante in hellerem Holz (`roofTrim` spruce), Laternen am Eingang, gemischter Weg (`landscape.ts:35`), Sims und Läden aus den Vorlagen W04/W05.

## Techniken und Regeln

Konventionen: Fassade kanonisch Süd. x läuft entlang der Fassade, y nach oben, d relativ zur Wandebene (−1 innen, 0 Wand, +1/+2 davor). Holz `<h>` = Holzart der Palette. „Einschätzung“ = nicht belegt, aus Messwerten und Erfahrung abgeleitet.

### T01 Blockbohlenwand mit Kreuzecken (Vorköpfe)

- **Beschreibung:** Die Wand besteht aus liegenden Stämmen. An jeder Ecke wechseln die Reihen:
  - **Reihe A:** Nord- und Südwand laufen durch und stehen 1 Block über.
  - **Reihe B:** Ost- und Westwand laufen durch und stehen 1 Block über.

  So entsteht der typische Kamm aus Stirnholz-Ringen. Real heißt das „interlocking double-notch joints, the timber extending beyond the corners“ [32]. In Minecraft zeigt ein liegender Stamm an der Stirn seine Jahresringe, also echtes Hirnholz.
- **Blöcke:**
  - Wand: `spruce_log[axis=x]` (N/S), `spruce_log[axis=z]` (O/W).
  - Varianten: `oak_log` (hellere Hütte, L\* 37,7), `dark_oak_log` (20,2), `stripped_spruce_log` (40,0, „neu gebaut“) [I1].
  - Vorköpfe immer im Rindenstamm derselben Art.
- **Maße und Regeln:**
  - Vorkopf 1 Block, passt zu Dachüberstand ≥ 1.
  - Die Parität zählt ab der Sockeloberkante. Die oberste Reihe auf der Traufseite ist Reihe A; sie trägt das Dach.
  - Öffnungen unterbrechen die Reihen. Die Laibung bleibt offen (W19) oder bekommt Zargen aus `stripped_<h>_log[axis=y]` in d = 0 (W03).
  - **Keine** Ständer in d = +1, kein Geschossbalken.
  - Das Giebeldreieck läuft in liegenden Stämmen weiter (Blockgiebel). Alternative: senkrechte Bretter (`stripped_<h>_log[axis=y]`).
- **Skizze Grundriss** (7×5-Hütte, Wand x = 0..6, z = 0..4; Legende: X = `spruce_log[axis=x]`, Z = `spruce_log[axis=z]`):

  ```text
  Reihe A (y = yb, yb+2, …)              Reihe B (y = yb+1, yb+3, …)
  z\x  -1 0 1 2 3 4 5 6 7                z\x  -1 0 1 2 3 4 5 6 7
  -1    . . . . . . . . .                -1    . Z . . . . . Z .
   0    X X X X X X X X X                 0    . Z X X X X X Z .
   1    . Z . . . . . Z .                 1    . Z . . . . . Z .
   2    . Z . . . . . Z .                 2    . Z . . . . . Z .
   3    . Z . . . . . Z .                 3    . Z . . . . . Z .
   4    X X X X X X X X X                 4    . Z X X X X X Z .
   5    . . . . . . . . .                 5    . Z . . . . . Z .
  ```

- **Skizze Ansicht Süd** (d = 0 ist z = 4; die Vorköpfe der Reihe B stehen in z = 5, also d = +1). Legende: `=` = X-Stamm von der Seite (Rinde), `O` = Z-Stamm von der Stirn (Ringe), `s` = Sockel `cobblestone`.

  ```text
  y\x    -1  0  1  2  3  4  5  6  7
  yb+3    .  O  =  =  =  =  =  O  .
  yb+2    =  =  =  =  =  =  =  =  =
  yb+1    .  O  =  =  =  =  =  O  .
  yb      =  =  =  =  =  =  =  =  =
  yb-1    s  s  s  s  s  s  s  s  s
  ```

- **Einsatz:**
  - rustic: Blockhütte, Chalet-Obergeschoss, Weihnachtshütte; dazu nordic.
  - Alle Größen. Bei Fassaden ≥ 9 kommt T02 dazu.
- **Bewertung:** Wirkung hoch. Aufwand mittel (neues Wandsystem `log` in `walls.ts`).
- **Quellen:** [32] [33] (liegende Hölzer, Steinfundament), [31] (Vanilla-Taiga: 1431 von 1613 Fichtenstämmen liegend), [9].

### T02 Balkenkopf-Reihen der Innenwände (Gwätt-Rhythmus)

- **Beschreibung:** Im Strickbau sind massive Innenwände mit den Außenwänden verkämmt. Sie sind „als senkrechte Reihen von Balkenköpfen von außen erkennbar“ [33]. Für den Generator ist das die Tiefengliederung langer Blockwände: Die Regel „keine flache Wand > 5“ ist erfüllt, ohne dass ein Ständer nötig wäre.
- **Blöcke:** In jeder Reihe B an der Position u einen Stamm quer zur Fassade (`spruce_log[axis=z]` auf der Südfassade) in d = 0 und d = +1.
- **Maße:**
  - Abstand 4–6. Nie in einer Öffnung und nie neben einer Ecke (≥ 3 Abstand).
  - Bei Fassaden 9–11: 1 Reihe, asymmetrisch erlaubt. Bei 13–17: 2 Reihen.
- **Skizze Ansicht Süd** (11 breit, Innenwand bei x = 4; Legende wie T01):

  ```text
  y\x    -1 0 1 2 3 4 5 6 7 8 9 10 11
  yb+3    . O = = = O = = = = = O  .
  yb+2    = = = = = = = = = = = =  =
  yb+1    . O = = = O = = = = = O  .
  yb      = = = = = = = = = = = =  =
  ```

- **Einsatz:** Blockhütte und Chalet ab Fassadenlänge 9.
- **Bewertung:** Wirkung mittel bis hoch. Aufwand niedrig, sobald T01 steht.
- **Quelle:** [33].

### T03 Pfettenköpfe und Firstbalken

- **Beschreibung:** Das Pfettendach („purlin roof: horizontal logs notched into gable walls“ [32]) zeigt am Giebel die Köpfe der Längsbalken unter dem Ortgang. Der Schweizer Chaletstil lebt von „exposed construction beams, including large brackets“ [39]. Vanilla-Taiga deckt sogar ganze Dächer mit `spruce_log` in Firstrichtung, mit 1 Block Überstand am Giebel [31]. Profis nehmen Stämme nur für Pfetten und First, die Fläche bleibt aus Treppen.
- **Blöcke:**
  - `spruce_log[axis=x]` bei First in x-Richtung: Fußpfetten auf Traufhöhe, Firstpfette unter dem First.
  - Firststil `log` (gibt es für nordic).
  - Giebelfüllung `stripped_spruce_log[axis=y]` oder Blockgiebel.
- **Skizze Ansicht West** (Giebel, Tiefe z = 0..6, Satteldach 45°, Überstand 1; schematisch). Legende:
  - `/` = `spruce_stairs[facing=south,half=bottom]`, `\` = `spruce_stairs[facing=north,half=bottom]` (Ortgang)
  - `P` = `spruce_log[axis=x]` Pfettenkopf in d = +1 (Ringe zum Betrachter)
  - `R` = Firstbalken `spruce_log[axis=x]`, ragt in d = +1
  - `b` = Giebelfüllung in d = 0, `=` = oberste Wandreihe

  ```text
  y\z     -1  0  1  2  3  4  5  6  7
  yt+4     .  .  .  .  R  .  .  .  .
  yt+3     .  .  .  /  P  \  .  .  .
  yt+2     .  .  /  b  b  b  \  .  .
  yt+1     .  /  b  b  b  b  b  \  .
  yt       /  P  b  b  b  b  b  P  \
  yt-1     .  =  =  =  =  =  =  =  .
  ```

- **Regeln:**
  - Bei Überstand 2–3 (Chalet) sind die Pfettenköpfe 2–3 lang. Unter ihren Enden steht eine Konsole `spruce_stairs[half=top]`, die volle Seite zur Wand.
  - Höchstens 3 Pfetten je Giebel.
- **Einsatz:** Blockhütte, Chalet, Weihnachtshütte (der Stamm-First hält Schnee).
- **Bewertung:** Wirkung mittel. Aufwand niedrig bis mittel (Dach-Engine: Pfettenzellen in der Ortgangspalte).

### T04 Reetdach-Imitation (Stroh, Reet) ohne Mods

- **Neigung:** ≥ 45°. „Usually pitched between 45 and 55 degrees“ [34], Reetdach „über 45°“ [35]. Profil `steep` (63,4°) für Cottages bis 9 tief, sonst `standard` (45°). Nie `shallow` oder `flared`.
- **Fläche:** Treppen-Mischung je Block mit Cluster-Rauschen (Zelle 2–3, wie in `texturing.ts`):
  - „frisch“: `oak_stairs` 55, `birch_stairs` 30, `jungle_stairs` 15
  - „gealtert“: `oak_stairs` 45, `spruce_stairs` 40, `birch_stairs` 15
  - Messwerte: oak L\* 56,4 / C 33; birch 71,8 / C 30; jungle 52,1 / C 29; spruce 38,3 [I1]. Einschätzung: Benachbarte Töne liegen ≤ 20 ΔL auseinander und lesen sich als Halmstruktur.
- **Was nicht passt:**
  - `hay_block` ist zu grell und hat ein rotes Band. Das ist Spieler-Feedback und nur als Such-Snippet belegt [52] (L\* 58 / C 53 [I1]).
  - `bamboo_mosaic`/`bamboo` ist zu gelbgrün (C 49, Hue 95 [I1]); höchstens 10 %.
  - Heu taugt nur als Akzent: im First oder als einheitlich ausgerichteter Vollblock. „Einheitliche Richtung der Strohballen“ [16]. „Hay bales and yellow terracotta pass for thatch“ [3][6].
- **Dicke:**
  - Untersicht (`soffit`) und Ortgang aus dem **Dachmaterial**, nicht aus Holzbrettern. So wirkt das Dach 2 Lagen dick.
  - Keine kontrastierende Ortgangleiste (Trim = Dach). Einschätzung.
- **Traufe:** Überstand 1, mindestens 50 cm Traufüberstand [35]. Unter der Traufreihe eine Kopfüber-Treppe aus dem Dachmaterial als runder „Wulst“.
- **First:** Firststil `block` mit regionalem Material [35]:
  - Sodenfirst: `moss_block`, darauf 50 % `moss_carpet`
  - Heidefirst: `dark_oak_planks` oder `spruce_planks`
  - Tonkappenfirst: `bricks`
- **Schornstein:** Austritt ≥ 0,8 m über dem First [35], also Kaminkopf ≥ First + 1.
- **Skizze Querschnitt Traufe Süd** (steil, Blick nach Osten, Überstand 1). Legende:
  - `R` = Reet-Treppe `[facing=north,half=bottom]` (Mischung)
  - `M` = Reet-Vollblock (`oak_planks`/`birch_planks`, gleiche Mischung): Dachkörper, an Steilstufen und am Giebel sichtbar
  - `U` = Reet-Treppe `[facing=north,half=top]` (Wulst)
  - `B` = oberer Wandbalken, `W` = Wand

  ```text
  y\d     -2  -1   0  +1
  t+6      R   .   .   .
  t+5      M   .   .   .
  t+4      M   R   .   .
  t+3      .   M   .   .
  t+2      .   M   R   .
  t+1      .   .   M   .
  t        .   .   M   R
  t-1      .   .   B   U
  t-2      .   .   W   .
  ```

- **Skizze Querschnitt First** (Sodenfirst). Legende: `c` = `moss_carpet`, `F` = `moss_block`, `R` = Reet-Treppe mit Facing zum First, `M` = Reet-Vollblock.

  ```text
         c
       R F R
     R M M M R
  ```

- **Einsatz:** Reet-Cottage, Bauernhaus (Krüppelwalm), Scheune mit Strohdach. Passt auch zu fantasy und medieval.
- **Bewertung:** Wirkung hoch. Aufwand mittel (braucht die Dach-Mischung, Empfehlung P3).
- **Quellen:** [34] [35] [16] [3] [6] [52] [I1].

### T05 Fledermausgaube im Höhenfeld (Eyebrow Dormer)

- **Beschreibung:** Typisch für Reetdächer: Die Dachfläche hebt sich wellenförmig über ein kleines Fenster, ohne eigene Gaubenwangen. Die Dach-Engine arbeitet ohnehin mit Höhenfeldern in halben Blöcken. Eine Gaube ist dann eine glatte Beule im Feld; Kehlen und Ecken ergeben sich von selbst.
- **Regel** (Einschätzung, im Spiel testen):
  - Fenster 1–2 breit, 1 hoch, in der ersten Dachreihe über der Traufe.
  - Zusatzhöhe Δh je Spalte (halbe Blöcke) über Fensterbreite + 4: `[1, 2, …, 2, 1]`.
  - Gilt für die Reihen k = 0 … Fensteroberkante; darüber auf 0 auslaufen (k + 1: halbe Werte).
  - Die Scheibe `glass_pane` steht in der senkrechten Stufe, die die Beule an der Traufe öffnet.
- **Skizze Ansicht Süd** auf die Dachfläche (Fenster x = 3..4; Zahlen = Δh in halben Blöcken je Spalte und Dachreihe):

  ```text
  Reihe\x   1  2  3  4  5  6
  k=2       0  1  1  1  1  0
  k=1       1  2  2  2  2  1
  k=0       1  2  G  G  2  1      G = glass_pane in der Stufe (d=0 der Gaube)
  ```

- **Einsatz:** Reet-Cottage mittel/groß, 1–2 pro Dachseite, nie symmetrisch zum First.
- **Bewertung:** Wirkung mittel bis hoch. Aufwand hoch (Engine-Erweiterung „Beule“).
- **Quelle:** Konzept „thatch-like appearance“ über gebogene Schindeln [43]. Die Form selbst ist Einschätzung.

### T06 Schindeldach mit Verlauf

- **Beschreibung:** Holzschindeldächer (Hütte, Bauernhaus, Weihnachtshütte) bestehen nie aus einem Treppenblock. Frische Schindeln sind „noch gelblich“, gealterte gräulich [42]. In Minecraft entsteht der Verlauf aus zwei Holzarten derselben Farbfamilie.
- **Mischung:**
  - Fläche: `spruce_stairs` 75, `dark_oak_stairs` 25, in Clustern.
  - Am Dachfuß (unterste 2 Reihen), in Kehlen und im 2-Block-Umkreis des Kamins: `dark_oak`-Anteil 50 % („Ruß, Feuchte“, Einschätzung).
  - Kante (`roofTrim`) bleibt einfarbig, damit die Kontur ruhig bleibt.
- **Regel:** ≤ 3 Blocktypen je Dachfläche. Benachbarte Typen ≤ 20 ΔL (spruce 38,3 / dark_oak 19,8 ✓) [I1].
- **Bewertung:** Wirkung hoch. Aufwand mittel. Passt zu rustic, medieval, nordic, fantasy.
- **Quellen:** [42] [16] („bei einem Holzdach etwas Dachdekoration einplanen“), [4] (Dach im Kontrast zur Wand).

### T07 Legschindeldach mit Schwersteinen (Chalet)

- **Beschreibung:** Alpines Legschindeldach. Es ist „für flache Dachneigungen gebräuchlich“; die Schindeln werden „lediglich aufgelegt“ und durch „Schwersteine, die auf Schwerstangen aufliegen“ gehalten [42]. Dazu kommen die breiten Chalet-Traufen [38][39].
- **Blöcke:**
  - Profil `shallow` (Δ = 1, ≈ 26,6°): Spalten wechseln zwischen `spruce_slab[type=bottom]` (b) und `spruce_slab[type=top]` (T).
  - Steine `stone_button[face=floor,facing=south,powered=false]` (o) auf den vollen Oberseiten der T-Spalten, in jeder zweiten T-Reihe, 1 Stein je 3–5 Zellen. „Stone buttons making excellent pebbles“ [14].
  - Knöpfe halten nur auf voller Oberseite, nie auf `type=bottom` (Einschätzung aus der Halteregel).
- **Skizze Querschnitt Süd-Dachfläche** (Blick nach Osten):

  ```text
  y\d    -2  -1   0  +1  +2  +3
  t+3     o   .   .   .   .   .
  t+2     T   b   .   .   .   .
  t+1     .   .   T   b   o   .
  t       .   .   .   .   T   b
  ```

- **Maße:** Überstand 2 (klein/mittel), 3 (groß), am Giebel gleich viel (T03-Pfetten tragen).
- **Bewertung:** Wirkung mittel (Detail auf Nähe), Aufwand niedrig. Passt zu Chalet und nordic.
- **Quellen:** [42] [38] [39] [14].

### T08 Feldstein-Außenkamin mit Schultern und Kaminkopf

- **Ort:** Giebelwand (Satteldach), mittig ±1; bei Walmdach durch die Fläche (heute schon `buildRoofChimney`). Dass Cottages und Hütten den Kamin außen am Giebel tragen, ist eine Einschätzung. Belegt sind der Kamin aus 3–4 Blöcken durchs Dach [1] und der Bruchstein-Kamin mit Lagerfeuer [9].
- **Aufbau:**
  1. **Fuß** 3 breit (u − 1..u + 1) × 2 tief (d = +1, +2), vom Gelände bis zur Oberkante EG.
  2. **Schulter** auf Höhe der OG-Decke: `cobblestone_stairs[half=bottom]` an u − 1 (`facing` zur Mitte) und u + 1 (`facing` zur Mitte).
  3. **Zug** 1 breit × 2 tief bis First + 1. Bei Hausbreite ≥ 13: 2 breit (Einschätzung).
  4. **Kopf:** oberste Lage `stone_bricks` oder `bricks` als Kontrastband. Darauf in d = +2 `campfire[facing=north,lit=true,signal_fire=false,waterlogged=false]`, in d = +1 `stone_brick_slab[type=bottom]`.
  5. **Topf:** offene `spruce_trapdoor[open=true,half=bottom]` in den drei freien Nachbarzellen des Feuers, `facing` jeweils vom Feuer weg; die Platte liegt am Feuer. So bauen es [9] und die Vanilla-Feuerstelle `taiga_decoration_6` [31].
- **Material:** Feldstein-Mix `cobblestone` 45, `andesite` 20, `mossy_cobblestone` 15, `stone` 10, `tuff` 10. Moos nur im unteren Drittel. Ranken (`vine`) an 20 % der Kaminseiten im unteren Drittel [3].
- **Rauch:**
  - Normal ≈ 10 Blöcke. Mit `hay_block[axis=y]` direkt unter dem Lagerfeuer steigt er 24 Blöcke hoch; dann `signal_fire=true` setzen [18][20].
  - Keine Falltür **über** dem Feuer, sie blockiert den Rauch [18].
- **Skizze Ansicht West** (Giebelwand in x = 0, Kamin in d = +1..+2). Legende: `C` = Feldstein-Mix, `<`/`>` = Schultertreppen, `K` = Kopf `stone_bricks`, `F` = Lagerfeuer, `t` = offene Falltür, `s` = obere Wandkrone.

  ```text
  y\z          u-1   u   u+1
  First+2       t    F    t        (F in d=+2, dahinter d=+1: stone_brick_slab)
  First+1       .    K    .
  …             .    C    .        Zug 1 breit (d=+1,+2)
  OG-Decke      <    C    >        Schulter
  …             C    C    C
  1             C    C    C        Fuß 3 breit × 2 tief
  0             g    g    g        Gelände
  ```

- **Bewertung:** Wirkung hoch (Silhouette und Gemütlichkeit). Aufwand mittel (`components.ts:149–163` ersetzen). Passt zu rustic, medieval, nordic, fantasy.

### T09 Veranda mit Stammpfosten, Rähm und Kopfbändern

- **Beschreibung:** „A covered porch extends your roof two to three blocks forward and adds log post supports underneath“ [2], dazu „small covered porch“ [5] und „add railings“ [1].
- **Blöcke:**
  - Pfosten: `stripped_spruce_log[axis=y]`
  - Rähm: `spruce_log[axis=x]`
  - Kopfbänder: `spruce_stairs[half=top]`, volle Seite am Pfosten (links vom Pfosten `facing=west`, rechts `facing=east`)
  - Geländer: `spruce_fence`
  - Boden: `spruce_planks`
  - Laterne: `lantern[hanging=true]` unter dem Rähm
- **Maße:**
  - Tiefe 2–3, Breite = Fassadenbreite − 2 oder ganze Traufseite.
  - Pfosten an den Enden und neben dem Eingang; Feldweite 2–3.
  - Bei Feldweite 2 bilden zwei Kopfbänder einen Bogen.
  - Dach: Pultdach `shallow`. Bei Hütten besser als Verlängerung der Hauptdachfläche mit geringerer Neigung (Catslide: „extends down below the main eave height“ [46]).
- **Skizze Ansicht Süd** (9 breit, Tür bei x = 4). Legende:
  - `B` = Rähm, `P` = Pfosten, `◣` = `spruce_stairs[facing=west,half=top]`, `◢` = `spruce_stairs[facing=east,half=top]`
  - `l` = `lantern[hanging=true]`, `f` = `spruce_fence`, `D` = `spruce_planks`

  ```text
  y\x      0   1   2   3   4   5   6   7   8
  yF+4     B   B   B   B   B   B   B   B   B
  yF+3     P   ◣   ◢   P   l   P   ◣   ◢   P
  yF+2     P   .   .   P   .   P   .   .   P
  yF+1     P   f   f   P   .   P   f   f   P
  yF       D   D   D   D   D   D   D   D   D
  ```

- **Bewertung:** Wirkung hoch. Aufwand mittel (`components.ts:80–127`). Passt zu rustic, nordic, mediterranean (mit Bogen).

### T10 Geranienbalkon (Chalet)

- **Beschreibung:** Balkone sind ein Chalet-Merkmal: „facades richly decorated with wooden balconies“ [39]. Blumenkästen sitzen „on or just below the sill“ [49]. Für das Chalet wird der Blumenkasten selbst zur Brüstung.
- **Blöcke:**
  - Boden `spruce_slab[type=top]` in d = +1..+2
  - Konsolen `spruce_stairs[half=top]` in d = +1, volle Seite zur Wand
  - Brüstung `moss_block` in d = +2, darauf `poppy`/`red_tulip` (Rot ist Pflicht beim Chalet, Einschätzung). `moss_block` zählt als Erde; so arbeitet schon W05.
  - Verkleidung vorn `spruce_trapdoor[facing=south,half=bottom,open=true]` in d = +3, an den Enden `facing=west`/`east`
- **Skizze Schnitt** (Blick nach Osten; `W` = Wand OG, `S` = Boden, `K` = Konsole, `M` = Moos, `F` = Blume, `T` = Falltür):

  ```text
  y\d       0   +1   +2   +3
  yO+1      W   .    F    .
  yO        W   .    M    T
  yO-1      W   S    S    .
  yO-2      W   K    .    .
  ```

- **Maße:** Giebelbreite − 2 (oder ganze Breite bei Überstand ≥ 2), im ersten OG unter dem Dachüberstand (Einschätzung). Bei Schnee siehe (j): Blumen und Laternen nicht neben Schneeschichten.
- **Bewertung:** Wirkung hoch (Chalet-Signatur). Aufwand niedrig bis mittel (`templates/balcony.ts` als Variante).

### T11 Holzstapel

- **Beschreibung:** „Wood piles near woodland cottages“ [6]. Der Stapel liegt an der Hauswand unter dem Traufüberstand oder frei mit Plattendach.
- **Blöcke:**
  - Stämme quer zur Wand, die Stirnseiten zeigen nach außen: an der Südwand `axis=z`.
  - Mischung `spruce_log` 60, `oak_log` 25, `birch_log` 15 (Einschätzung: verschiedene Stirnholzfarben lesen sich als Scheite).
  - Frei stehend: Abdeckung `spruce_slab[type=bottom]`, Pfosten `spruce_fence` an den Enden.
- **Maße:** 3–5 lang, 2–3 hoch, 1 tief. Oberste Reihe um 1–2 kürzer; die Lücke liegt zufällig.
- **Skizze Ansicht Süd** (`o` = Stamm `[axis=z]`, `g` = Gelände):

  ```text
  y\x      2   3   4   5   6
  3        .   o   o   .   .
  2        o   o   o   o   .
  1        o   o   o   o   o
  0        g   g   g   g   g
  ```

- **Winter:** Ohne Abdeckung `snow[layers=1..2]` auf den Stämmen; sie haben eine volle Oberseite [19].
- **Bewertung:** Wirkung hoch (Erzähl-Detail). Aufwand niedrig.

### T12 Lattenzaun und Feldsteinmauer

- **Lattenzaun:**
  - Höhe 1, wie ein echter Lattenzaun mit 91–122 cm, „white or whitewashed“ [48].
  - Holz: `pale_oak_fence` (L\* 87,6, nur 1.21.11; für 1.21.1 `birch_fence`), `birch_fence` (71,8) oder `spruce_fence` (Hütte) [I1].
  - Alle 4–6 Blöcke ein Pfosten `stripped_birch_log[axis=y]` oder `spruce_log[axis=y]`, 1–2 hoch; auf jedem zweiten eine stehende `lantern`.
  - Tor: `<h>_fence_gate[facing=<Wegrichtung>,open=false,in_wall=false]`, 1–2 breit, in der Wegachse.
- **Feldsteinmauer** (Trockenmauer):
  - Real 1,2–1,5 m hoch, oben „coping stones“ [50].
  - In Minecraft 1 hoch aus Vollblöcken (`cobblestone` 50, `mossy_cobblestone` 30, `andesite` 10, `stone` 10), darauf `cobblestone_slab[type=bottom]` als Deckstein. Das ergibt 1,5 Blöcke Höhe und die Deckschicht.
  - Leichtere Variante: `cobblestone_wall`/`mossy_cobblestone_wall`, gemischt 70/30.
- **Skizze Ansicht** (`F` = Zaun, `P` = Pfosten, `L` = Laterne, `G` = Tor; Mauer: `s` = Deckplatte, `C` = Feldstein):

  ```text
  Lattenzaun                      Feldsteinmauer
  y=2   L . . . . L . .           y=1   s s s s s s
  y=1   P F F F F P G G           y=0+  C C C C C C   (y=1 Blockreihe, Platte darüber)
  ```

- **Bewertung:** Wirkung mittel bis hoch (ersetzt die Laubhecke). Aufwand niedrig.
- **Quellen:** [48] [50] [4] (Weg und Gelände), [I1].

### T13 Bauerngarten und Gemüsebeet

- **Grundsätze:** „A mixture of ornamental and edible plants … informal design, dense plantings“, dazu „a rose-bowered gateway“ und ein Bienenstock [47]. Weiße, rosa, gelbe und rote Blumen sollen bis an die Tür reichen [6].
- **Blumenbeete:**
  - Cluster aus 3–7 Pflanzen, 60–80 % Deckung entlang der Hauswand (d = +1..+2), am Zaun und am Weg.
  - 2–3 Farben je Beet. Einzelstreu über den Rasen vermeiden.
- **Gemüsebeet:**
  - 2 breit × 3–5 lang, Reihen mit 1 Block Weg (`coarse_dirt`/`dirt_path`).
  - Boden `farmland[moisture=7]`. Er bleibt Ackerboden, solange eine Pflanze darauf steht [23].
  - Pflanzen `wheat[age=7]`, `carrots[age=7]`, `potatoes[age=7]`, `beetroots[age=3]`.
  - Einfassung mit offenen `spruce_trapdoor[half=bottom]` wie die Vanilla-Taiga-Deko [31].
  - `composter[level=5..8]` am Beetende [6][25].
  - Alles davon (nicht in Registry).
- **Vogelscheuche:** `spruce_fence` (Bein), `hay_block[axis=y]` (Körper), seitlich je ein `spruce_fence` (Arme; Zäune verbinden sich mit der vollen Seite), oben `carved_pumpkin[facing=<Weg>]`. Einschätzung; kein Golem-Muster.
- **Skizze Draufsicht** (`t` = Falltür-Einfassung, `a` = Acker mit Pflanze, `w` = Weg, `k` = Komposter):

  ```text
  t t t . t t t
  t a a w a a t
  t a a w a a t
  t a a w a a t
  t t t k t t t
  ```

- **Bewertung:** Wirkung mittel bis hoch (Cottage, Bauernhaus). Aufwand mittel (Registry-Ergänzung).

### T14 Brunnen

- **Aufbau** (3×3):
  - Ring `cobblestone_wall`/`mossy_cobblestone_wall` (70/30) auf y = 1
  - Mitte `water_cauldron[level=3]` (nicht in Registry). Ersatz: Ring ohne Mitte.
  - Zwei `spruce_fence`-Pfosten (y = 2..3) auf dem Ring in der Mitte zweier Gegenseiten
  - Querbalken `spruce_log[axis=x]` (y = 4), darüber Mini-Satteldach `spruce_stairs` mit `spruce_slab`-First
  - `iron_chain[axis=y]` vom Balken nach unten
- **Einsatz:** Bauernhaus-Hof und Dorfmitte, nicht bei der Hütte. Einschätzung (keine Builder-Quelle abrufbar).
- **Bewertung:** Wirkung mittel. Aufwand niedrig.

### T15 Hof-Requisiten nach Vanilla-Muster

Ausgewertet aus den 1.21.11-Strukturdateien [31]:

| Requisit | Vanilla-Aufbau | Generator-Regel |
|---|---|---|
| Feuerstelle | `campfire` mit offenen `spruce_trapdoor[half=bottom]` auf allen 4 Seiten (`taiga_decoration_6`) | Hütte und Weihnachtshütte; ≥ 4 Abstand zu Schnee (Licht 15) |
| Trog oder Bank | 1×4 `spruce_planks`, rundum offene Falltüren (`taiga_decoration_1`) | als Pflanzkasten mit `moss_block` statt Brettern |
| Steinhaufen | 2–3 `cobblestone_stairs` und `cobblestone` (`taiga_decoration_2–4`) | Wegrand und Gelände, 1 je 30–50 m² |
| Laternenpfahl | `spruce_fence` × 2 + Arm + `lantern[hanging=true]` beidseitig (`snowy_lamp_post_01/03`) | ersetzt die 3-hohen Pfähle bei rustic |
| Heu | `hay_block` (Plains-Häuser: 12) | Haufen 2–3 hoch, Pyramide 3×2 + 1; Achsen gemischt erlaubt |
| Fässer | `barrel` (wenig) | Gruppen zu 2–3 (`facing=up`), 1 davon liegend; „barrels beside the fence“ [6] |

### T16 Bewuchs und Rosenbogen

- `vine` an Sockel- und Kaminflächen: 10–25 % der Zellen im unteren Drittel, Länge 1–3 [3][17].
- `moss_carpet` am Sockelfuß.
- `azalea`/`flowering_azalea` an Hausecken.
- Rosenbogen über dem Gartentor: zwei 2-hohe Zaunpfosten, darüber 3 breit `flowering_azalea_leaves[persistent=true]` [47]. `rose_bush`, `lilac` und `peony` fehlen in der Registry.
- 1.21.5-Pflanzen (alle nicht in Registry):
  - `leaf_litter[facing,segment_amount=1..4]` unter Bäumen; braucht eine volle Oberseite [26]
  - `wildflowers[facing,flower_amount=1..4]` als Wiese [27]
  - `bush` [28]
  - `firefly_bush` mit Licht 2 und Glühwürmchen nachts, ideal für die Abendstimmung [29]
- **Achtung Biomfarbe:** Gras-, Eichen- und Ranken-Grün hängt vom Biom am Einfügeort ab. `spruce_leaves` und `birch_leaves` haben feste Farben [30]. Für Hecken und Girlanden sind deshalb Fichte und Birke sicherer.

## Themenspezifische Abschnitte

### (a) Kennzeichen des Stils

**In echter Architektur:**

- Lokale, billige Materialien: „rubble stone“ in Steingegenden, Lehm („cob“) in Devon, Stroh in Getreidegegenden [36].
- Geringe Höhe mit sichtbarem Holz („restricted height … construction timber exposed“) [36].
- Lehmwände rund 61 cm dick mit tiefen Fenstern, „tall foundation and large roof overhang“ [37].
- Blockbau auf Steinfundament mit vorstehenden Köpfen [32][33].
- Große, tief heruntergezogene Dächer: Schwarzwaldhaus mit Walm oder Krüppelwalm, 45–50°, „descends to the height of the ground floor“ [40][41].
- Chalets mit „gently sloping roof and wide … eaves“ [38].

**In Minecraft:**

- Holz und Bruchstein, warme Farbe, „hand-built rather than perfectly straight“ [6].
- Kleine Grundfläche: „a cottage loses charm when the first frame already looks like a mansion“ [6].
- Asymmetrie, variierte Fensterläden, viele Blumen [1].
- Veranda und Steinkamin [5][2].
- Vanilla-Taiga ist der Mojang-Kanon [31]:
  - 30,7 % `cobblestone`, 26,6 % liegende `spruce_log`, 3,8 % offene `spruce_trapdoor` als Läden und Zierbretter
  - Dächer aus Stämmen in Firstrichtung
- Vanilla-Plains [31]: `cobblestone` 22 %, `oak_stairs` 21 %, `oak_planks` 18 %, `oak_log` (stehend) 7 %.

### (b) Untervarianten und Erkennungsmerkmale

| Variante | Erkennungsmerkmal (muss sichtbar sein) | Wand | Dach | Signatur | Parser-Stichwörter |
|---|---|---|---|---|---|
| **Blockhütte** (Log Cabin) | liegende Stämme, Kreuzecken mit Vorköpfen | T01/T02 | Satteldach 45°, Schindelverlauf T06, Stamm-First T03 | Außenkamin T08, Veranda T09, Holzstapel T11 | blockhaus, blockhütte, jagdhütte, hütte |
| **Reet-Cottage** (englisch) | dickes Strohdach, niedrige weiße Wände | Kalkputz `white_terracotta` mit dunklen Stämmen an Ecken und Laibungen | steil, Reet T04, Fledermausgaube T05, Sodenfirst | Bauerngarten T13, Lattenzaun, Rosenbogen | cottage, reetdach, strohdach, landhaus |
| **Feldstein-Bauernhaus** | grobe Steinwand, großes Dach, Hof | Feldstein (F2), Holzgiebel | Krüppelwalm oder Satteldach 45°, dunkel | Hof mit Heu, Fässern, Brunnen; Scheunentor T11 | bauernhaus, bauernhof, hof |
| **Alpenchalet** (Strickbau) | giebelständig, flaches Dach, 2–3 Überstand | EG gemauert und weiß, OG liegende Stämme | flach 26,6°, Legschindel T07, Pfettenköpfe T03 | Geranienbalkon T10, Läden an jedem Fenster | chalet, alm, berghütte, almhütte |
| **Scheune** | großes Tor, Heuluke, rote senkrechte Bretter | senkrechte Schalung (F4) | Gambrel oder steiles Satteldach | Tor mit Andreaskreuz T11, Heuhaube T12 | scheune, stall |
| **Weihnachtshütte** | kleine dunkle Hütte, Rauch, warmes Licht | wie Blockhütte | steil oder 45°, dunkel, Stamm-First | Kamin mit Signalrauch, Girlande, Baum, Holzstapel mit Schnee | weihnachtshütte, winterhütte, schneehütte |
| (Mühle) | Turm mit 4 Flügeln | Turm D 7 → 5 | Kappe oder Kegel | Flügel 7 lang aus Zaun und Wolle [8][45] | mühle, windmühle (heute nicht umsetzbar) |

### (c) Paletten nach unseren Rollen

Gewichte = Wahlwahrscheinlichkeit je Gebäude (heutige Semantik). `blend` = neue Texturmischung innerhalb der Rolle (Empfehlung P3), im Daten-Stil von `palettes.ts`. Alle Paletten prüfen: ΔL ≥ 15 Wand–Rahmen oder Wand–Dach, 3–5 Familien, Dach mit Treppen, nichts aus `forbidden` (concrete, quartz). Werte aus [I1].

```ts
// 1 Blockhütte – Wand 17,1 | Rahmen 40,0 (ΔL 22,9) | Dach 38,3 (ΔL 21,2) | Familien: cobblestone/deepslate, spruce, dark_oak
rustic_cabin: {
  plinth: [['cobblestone', 3], ['cobbled_deepslate', 1]],
  wall: one('spruce_log'), upperWall: one('spruce_log'),       // wallSystem: 'log' (T01), Giebel liegend
  infill: one('spruce_planks'), frame: one('stripped_spruce_log'), beam: one('spruce_log'),
  roof: [['spruce_planks', 3], ['dark_oak_planks', 1]],        // blend: spruce 75 / dark_oak 25 (T06)
  roofTrim: one('dark_oak_planks'), ridge: one('spruce_log'),  // ridgeStyle 'log'
  soffit: one('spruce_planks'), window: one('glass'), shutter: one('spruce_planks'),
  door: one('spruce_planks'), floor: one('spruce_planks'), path: one('cobblestone'),
  chimney: one('cobblestone'), accent: one('red_wool'),        // chimney blend: Feldstein (T08)
}
// 2 Reet-Cottage – Wand 74,9 | Rahmen 20,2 (ΔL 54,7) | Dach 56,4 (ΔL 18,5) | 5 Familien
rustic_thatch: {
  plinth: [['cobblestone', 3], ['stone_bricks', 1]],
  wall: one('white_terracotta'), upperWall: one('white_terracotta'), infill: one('white_terracotta'),
  frame: [['dark_oak_log', 2], ['stripped_dark_oak_log', 1]], beam: one('stripped_dark_oak_log'),
  roof: one('oak_planks'),                                     // blend: oak 55 / birch 30 / jungle 15 (T04)
  roofTrim: one('oak_planks'), soffit: one('oak_planks'),      // Untersicht = Dachmaterial
  ridge: [['spruce_planks', 1], ['moss_block', 1]],            // Heide- oder Sodenfirst, ridgeStyle 'block'
  window: one('glass'), shutter: one('spruce_planks'), door: one('spruce_planks'),
  floor: one('oak_planks'), path: one('cobblestone'), chimney: [['bricks', 1], ['cobblestone', 1]],
  accent: one('red_wool'),
}
// 3 Feldstein-Bauernhaus – Wand 53,1 | Rahmen 17,1 (ΔL 36) | Dach 19,8 (ΔL 33,3) | 3–4 Familien
rustic_farmstone: {
  plinth: [['cobbled_deepslate', 2], ['mossy_cobblestone', 1]],
  wall: [['cobblestone', 2], ['andesite', 1]],                 // blend Feldstein F2
  upperWall: one('spruce_planks'), infill: one('spruce_planks'),
  frame: one('spruce_log'), beam: one('stripped_spruce_log'),
  roof: [['dark_oak_planks', 2], ['spruce_planks', 1]],        // blend: dark_oak 70 / spruce 30
  roofTrim: one('spruce_planks'), ridge: one('dark_oak_planks'), soffit: one('spruce_planks'),
  window: one('glass'), shutter: one('spruce_planks'), door: one('spruce_planks'),
  floor: one('spruce_planks'), path: one('cobblestone'), chimney: one('cobblestone'), accent: one('red_wool'),
}
// 4 Alpenchalet – EG 74,9 | Rahmen 40,0 (ΔL 34,9) | Dach 38,3 (ΔL 36,6) | 4 Familien
rustic_chalet: {
  plinth: [['stone_bricks', 2], ['cobblestone', 1]],           // Sockel 2–3 hoch
  wall: [['white_terracotta', 2], ['calcite', 1]],             // EG gemauert/geweißt
  upperWall: one('spruce_log'),                                // OG liegend, T01 + T02
  infill: one('spruce_planks'), frame: one('stripped_spruce_log'), beam: one('spruce_log'),
  roof: [['spruce_planks', 2], ['dark_oak_planks', 1]],        // shallow + Schwersteine (T07)
  roofTrim: one('dark_oak_planks'), ridge: one('spruce_planks'), soffit: one('spruce_planks'),
  window: one('glass'), shutter: one('dark_oak_planks'), door: one('dark_oak_planks'),
  floor: one('spruce_planks'), path: one('cobblestone'), chimney: one('stone_bricks'), accent: one('red_wool'),
}
// 5 Rote Scheune – Wand 31,5 | Rahmen 72,4 (ΔL 40,9) | Dach 19,8 | 4 Familien
rustic_barn: {
  plinth: [['cobblestone', 2], ['stone_bricks', 1]],
  wall: one('stripped_mangrove_log'), upperWall: one('stripped_mangrove_log'), // axis=y: senkrechte Bretter
  infill: one('mangrove_planks'), frame: one('stripped_birch_log'), beam: one('stripped_birch_log'), // weiße Ecken
  roof: [['dark_oak_planks', 2], ['spruce_planks', 1]],
  roofTrim: one('birch_planks'),                                // weiße Ortgangkante
  ridge: one('dark_oak_planks'), soffit: one('dark_oak_planks'),
  window: one('glass'), shutter: one('birch_planks'), door: one('spruce_planks'),
  floor: one('spruce_planks'), path: one('cobblestone'), chimney: one('cobblestone'), accent: one('hay_block'),
}
// 6 Weihnachtshütte – Wand 17,1 | Rahmen 40,0 (ΔL 22,9) | Dach 19,8 | 3 Familien
rustic_wintercabin: {
  plinth: [['cobbled_deepslate', 2], ['stone_bricks', 1]],     // dunkler Sockel vor Schnee
  wall: one('spruce_log'), upperWall: one('stripped_spruce_log'), // Giebel senkrecht, hell
  infill: one('spruce_planks'), frame: one('stripped_spruce_log'), beam: one('spruce_log'),
  roof: [['dark_oak_planks', 1], ['spruce_planks', 1]],        // blend: dark_oak 70 / spruce 30
  roofTrim: one('spruce_planks'), ridge: one('spruce_log'),     // Stamm-First hält Schnee
  soffit: one('spruce_planks'), window: one('glass'), shutter: one('spruce_planks'),
  door: one('dark_oak_planks'), floor: one('spruce_planks'), path: one('cobblestone'),
  chimney: one('cobblestone'), accent: one('red_wool'),
}
```

Anmerkungen:

- `hay_block` als Akzent (Scheune) braucht einen Materialeintrag. Heute ist es nur ein Registry-Block.
- `moss_block` als First nimmt für die Stufe den Ersatz `mossy_cobblestone_slab`.
- Die drei bestehenden Paletten bleiben erhalten (keine grundlose Neuschreibung) und werden in (l) korrigiert.

### (d) Proportionen je Größe

Maße ungerade (Generatorgrenze). FH = Geschosshöhe inklusive Deckenlage (4–6). Neigung: `shallow` 26,6°, `standard` 45°, `steep` 63,4°.

| Variante | Klein | Mittel | Groß | Riesig | FH | Dach, Neigung | Überstand | Sockel |
|---|---|---|---|---|---|---|---|---|
| Blockhütte | 7×5·1 | 9×7·1 + Veranda | 11×7·1 + Gaube | 13×9·2 + L-Flügel 7×5 | 5 | Sattel standard 70 % / steep 15 % / a_frame 15 % | 1 (Giebel 1 mit Pfetten) | 1 |
| Reet-Cottage | 7×5·1 | 9×7·1 + 1–2 Fledermausgauben | 11×7·2 (OG als Kniestock) | 13×9·2 L-Form + Catslide-Anbau | 4 | steep 60 % / standard 40 %; Krüppelwalm 30 % | 1 | 1 |
| Feldstein-Bauernhaus | 9×7·1 | 11×7·2 | 13×9·2 | 17×9·2 + Scheunenflügel (T/L) | 5 (EG) / 4 | Krüppelwalm 40 % / Sattel 40 % / Walm 20 %, standard | 1–2 | 1–2 |
| Alpenchalet (giebelständig) | 7×9·1 | 9×11·2 + Balkon | 11×13·2 | 13×15·3, 2 Balkone | 5 | Sattel shallow 85 % / standard 15 % | 2 / 2 / 3 / 3 | 2–3 |
| Scheune (giebelständig) | – | 9×13·1 | 11×17·1 | 13×21·1 + Pultanbau | 6 | Gambrel 60 % / Sattel steep 40 % | 1 | 1 |
| Weihnachtshütte | 7×5·1 | 9×7·1 + Veranda | 11×7·1 | – (Hütten bleiben klein) | 5 | steep 50 % / standard 50 % | 1 | 1 |

Belege und Ableitung:

- Cottage-Grundfläche 8×10 bis 12×12, Wände 4–5 hoch [1].
- Raum 9–13 breit × 7–11 tief, Wand 5–7 [12].
- Schneehütte 7×8 [2].
- Dach „between one and two stories tall“, ungerade Breite für mittige Elemente [15].
- Nebenbaukörper „roughly 1/3 to 1/2“ des Hauptkörpers [13].
- Regel (Einschätzung): Sichtbare Dachhöhe ≥ Wandhöhe. Beim Cottage ist das Dach etwa 1,5-mal so hoch wie die Wand.

### (e) Dachformen, Profile und Reet

- **Blockhütte:**
  - Satteldach 45° mit Schindelverlauf (T06), Stamm-First (T03).
  - Als Anbau ein Pultdach, als Veranda ein Catslide [46].
  - Für die Winterhütte ist ein A-Frame selten, aber passend.
- **Reet-Cottage:**
  - Steil, Krüppelwalm als zweite Wahl. Das Schwarzwaldhaus zeigt Walm oder Krüppelwalm mit 45–50° [41].
  - Reet-Technik T04, Fledermausgaube T05, keine Gaubenwangen.
  - Nie `flared`, `bell` oder `ogee` (wirken asiatisch oder märchenhaft; gehört zu fantasy).
- **Bauernhaus:** großes, ruhiges Dach, tief herabgezogen bis zur EG-Höhe [40]. Auf der Rückseite ein Catslide statt zweiter Wand.
- **Chalet:** flach (`shallow`), Giebel zur Front, Überstand 2–3 an Traufe **und** Giebel, Pfettenköpfe, Schwersteine (T07) [38][42]. Den Parser für „chalet“ auf `shallow` umstellen.
- **Scheune:** Gambrel „to maximize the size of the hay loft“, Heuhaube über der Luke [44].
- **Reet aus Heuballen** (wenn gewünscht):
  - Nur Vollblock-Dach mit einheitlicher Achse; Problemstellen mit `yellow_carpet` abdecken [16].
  - Wirkung niedriger als T04. Nur auf ausdrücklichen Wunsch („Heudach“) anbieten.

### (f) Wandsysteme

| System | Blöcke | Regeln | Varianten |
|---|---|---|---|
| **F1 Blockbohlen** | `<h>_log[axis = Fassadenrichtung]` | T01 Kreuzecken, T02 Innenwandköpfe, Blockgiebel, keine Ständer | Rinde (dunkel) oder entrindet (neu); oak = hell, spruce = klassisch, dark_oak = schwer |
| **F2 Feldstein** | `cobblestone` 45, `andesite` 20, `mossy_cobblestone` 15, `stone` 10, `tuff` 10 | Moos nur unten (Verlauf wie `texturing.ts`); Eckquader: an den Ecken abwechselnd 2 Blöcke längs N/S und 2 längs O/W aus `stone_bricks` oder `polished_andesite`. Das ist dieselbe Paritätslogik wie T01 (Einschätzung) | Band-Verlauf unten → oben siehe `waende_struktur.md` §8 |
| **F3 Lehm und Putz** | `white_terracotta` (warmer Kalk, 74,9), `smooth_sandstone` (Ocker, 85,5), `packed_mud` (Lehm, 48), `calcite` (kalt, 89,1) | Putz braucht dunkle Rahmen (≥ 30 ΔL). Fenster tief: Glas in d = −1, die Lehmwand ist dick [37]. Bei `packed_mud` als Wand muss der Rahmen `dark_oak` sein (ΔL 28), sonst schlägt die Lint fehl | `white_concrete` ist verboten und zu kalt-glatt |
| **F4 Holzschalung** | waagerecht: `<h>_planks` (die Textur zeigt liegende Bretter); senkrecht: `stripped_<h>_log[axis=y]` | Scheune senkrecht („siding of vertical boards“ [44]), rot über `stripped_mangrove_log` (31,5, Hue 32 [I1]), weiße Ecken (`stripped_birch_log`) | Ständer nur alle 4–6 Blöcke, nie dichter |

Sockel für alle: 1 Block bei Hütte und Cottage, 2–3 bei Chalet und Hang [3]. Die Treppenschürze bleibt, wie sie heute ist.

### (g) Fenster- und Türtypen

| Variante | Fenster (vorhanden) | Türen (vorhanden) | Neu |
|---|---|---|---|
| Blockhütte | W03, W06, W04 (Läden), W02 | T06, T01, T05 | W19, Veranda T09 |
| Reet-Cottage | W05, W05b, W05c, W04; W10 als Gaube | T05/T05b (Vordach), T02, T08 | W20, Fledermausgaube T05 |
| Bauernhaus | W03, W04, W02b | T02, T05 | W20, T11 Scheunentor, T12 Heuluke |
| Chalet | W04 an jedem Fenster, W05c | T07 (für Sockel 2), T05b | Balkon T10 |
| Scheune | W01c (1×1), wenige | T01 als Schlupftür | T11, T12 |
| Weihnacht (Thema) | **W18** auf alle Frontfenster | **T10** am Haupteingang | – |

**W19 Blockhaus-Laibung (1×2):**

- Glas in d = −1 hinter der offenen Laibung der Blockwand.
- Fensterbank als dünnes Brett `spruce_trapdoor[facing=south,half=top,open=false]` in d = +1 unter der Öffnung.
- Wetterbrett `spruce_trapdoor[facing=south,half=bottom,open=false]` in d = +1 über der Öffnung.
- Läden `spruce_trapdoor[facing=south,half=…,open=true]` in d = +1 seitlich, wie W04.
- Falltüren brauchen keinen Halt [22].

```text
Ansicht Süd                      Schnitt (Blick nach Osten)
y\x   -1  0  1                   y\d   -1   0  +1
 2     =  =  =                    2     .   =   h      h = Wetterbrett (half=bottom)
 1     L  .  L                    1     G   .   .      G = glass_pane
 0     L  .  L                    0     G   .   .
-1     =  =  =                   -1     .   =   b      b = Fensterbank (half=top)
L = Laden in d=+1, = = Blockwand
```

**W20 Kreuzstockfenster (3×3):**

- Kreuz aus `stripped_spruce_log`: Mitte `stripped_spruce_wood`, Arme senkrecht `[axis=y]`, waagerecht `[axis=x]`.
- Vier Scheiben `glass_pane` in den Ecken. Sie verbinden sich mit den vollen Stammseiten.
- **Kein** Zaun als Sprosse: Zaun und Scheibe verbinden sich nicht. Scheiben verbinden sich nur mit vollen Seiten, Scheiben, Gittern und Mauern (Einschätzung aus der Vanilla-Verbindungslogik).
- Sims: Treppenreihe wie `sillRow`.

```text
y\x   -1  0  1  2  3
 3     =  =  =  =  =
 2     =  G  |  G  =        | = stripped_spruce_log[axis=y]
 1     =  -  +  -  =        - = [axis=x], + = stripped_spruce_wood
 0     =  G  |  G  =        G = glass_pane
-1     .  s  s  s  .        s = Sims (Treppe, half=top)
```

**T11 Scheunentor mit Andreaskreuz (4×4, Giebel, zusätzlich zur Haupttür):**

- Feste Füllung aus `mangrove_planks` (r).
- Kreuz `birch_planks` (w), Rahmen `stripped_birch_log` (F).
- Daneben oder darin eine echte Tür (T01) als Schlupftür, damit die Lint „Tür frei“ erfüllt ist.

```text
y\x   -1  0  1  2  3  4
 4     F  F  F  F  F  F
 3     F  w  r  r  w  F
 2     F  r  w  w  r  F
 1     F  r  w  w  r  F
 0     F  w  r  r  w  F
```

**T12 Heuluke mit Heuhaube:**

- 1×2-Öffnung unter dem First. Flügel aus offenen `spruce_trapdoor` seitlich in d = +1.
- Darüber ein Auslegerbalken `spruce_log[axis=z]` in d = +1..+2. Am Ende hängt eine `iron_chain[axis=y]`, 1–2 lang.
- Der First läuft 2 Blöcke weiter als Heuhaube („hay hood (roof extension)“ [44]).

**Fensterläden variieren, aber kontrolliert:**

- Je Fassade ein Grundtyp. Etwa jedes dritte Fenster weicht ab (einseitiger Laden, Blumenkasten statt Läden). „Don't make them perfectly matched on every window. Vary which side they're on“ [1]; Umsetzung als Einschätzung.
- Läden aus `spruce_trapdoor` oder `dark_oak_trapdoor`. Die Fensterbreite bleibt klein (1–2): „cottage windows aren't floor-to-ceiling“ [1].

### (h) Signatur-Details

| # | Detail | Technik | Häufigkeit je Haus (Einschätzung) | Bevorzugte Variante |
|---|---|---|---|---|
| 1 | Blumenkästen und Fensterläden | W04/W05, T10 | 50–70 % der Frontfenster; Chalet 100 % im OG | Chalet, Cottage |
| 2 | Lattenzaun mit Tor, Feldsteinmauer | T12 | Vorgarten-Front, 80 % beim Cottage | Cottage, Bauernhaus |
| 3 | Holzstapel | T11 | 1 (Hütte 100 %, Cottage 40 %) | Hütte, Weihnachtshütte |
| 4 | Fässer und Kisten | T15 | 2–4 an der Hausecke oder am Zaun | Bauernhaus, Hütte |
| 5 | Heu | T15 | Bauernhaus und Scheune 1–2 Haufen | Bauernhaus, Scheune |
| 6 | Brunnen | T14 | Bauernhaus 30 % | Bauernhaus |
| 7 | Gemüsebeet und Bauerngarten | T13 | Cottage 60 %, Bauernhaus 80 % | Cottage |
| 8 | Ranken, Moos, Rosenbogen | T16 | Steinflächen 15 %, Tor 30 % | Cottage, Hütte |
| + | Rauchender Kamin | T08 | immer (Rauch ist das stärkste Gemütlichkeitssignal) | alle |

### (i) Deko und Umgebung

- **Lichtung statt Rasenplatte:** Hinter und neben der Hütte stehen 2–3 Bäume als Gruppe („a cluster of 2–3 trees“ [4]), nie vor den Fenstern. Bei Hütten Fichten, beim Cottage Obstbaum-Ersatz (Eiche) [47].
- **Gelände:** leichte Steigung zum Eingang [4]; Sockel folgt dem Gelände [1].
- **Wege:**
  - Belag-Verlauf Erde → `coarse_dirt` (60/40) → `coarse_dirt`/`gravel`/`cobblestone` (40/40/20) → `cobblestone`/`gravel` (80/20) zur Tür hin [11]. `gravel` fehlt in der Registry.
  - Wege mit Kurven, Trittsteinen und Laterne [6].
  - `stone_button` als Kiesel am Wegrand [14].
- **Boden:** `coarse_dirt`/`rooted_dirt`-Flecken unter Traufe, Holzstapel und Bank als „trampled, dry ground“ [11][10]. `podzol` unter Fichten (nicht in Registry).
- **Grundstücksgrenze:** Lattenzaun oder Feldsteinmauer (T12). Die Laubhecke rundum (`landscape.ts:108`) gibt es bei rustic nur als Teilstück hinter dem Haus.
- **Licht:** Vanilla-Schneedorf-Laterne (T15) am Weg, Hängelaternen an der Veranda. Fackeln nur ersatzweise. Vanilla-Taiga nutzt fast nur `wall_torch`; Profis ersetzen sie durch Laternen [2].
- **Requisiten:** T15 im Abstand ≥ 2 zur Tür und ≥ 1 zu Fenstern. Die Prioritäten des `VoxelBuilder` (DECOR) halten das schon ein.

### (j) Winter- und Weihnachtsvariante: die gemütliche Weihnachtshütte

Kernbild (Leitbild der App): eine kleine dunkle Blockhütte am Waldrand, aus dem Kamin steigt Rauch, die Fenster glühen warm, auf der Veranda hängen Laternen und eine Girlande, daneben stehen ein geschmückter Baum und ein Holzstapel. Schnee nur, wenn gewünscht.

**Ohne Schnee (Standard „Winter“ und „Weihnachten“):**

1. **Palette `rustic_wintercabin`:** dunkle Wände (`spruce_log`), dunkles Dach, helle Giebelbretter und Rahmen, dunkler Sockel. Gelbes Licht hebt sich so maximal ab.
2. **Rauch:** Kamin T08 immer mit `campfire[lit=true]`. Bei „Weihnachten“ optional `hay_block` darunter (`signal_fire=true`, Rauchsäule 24 Blöcke, auch aus Entfernung sichtbar) [18][20].
3. **Warmes Fensterlicht:**
   - Kerzen auf den Simsen (heute schon). W18 auf allen Frontfenstern (`windows.ts:122` → `rustic`), T10 am Eingang (`doors.ts:31`).
   - Hängelaternen an der Veranda alle 4–6 Blöcke.
   - Laternen im Innenraum direkt hinter den Fenstern wären die stärkste Wirkung. Weil Innenräume leer bleiben, ist das eine **Designentscheidung** für den Creative Director.
4. **Girlande am Verandageländer:**
   - `spruce_leaves[persistent=true]` als Lage auf dem Rähm oder über dem Geländer, alle 4–6 Blöcke eine Schleife `red_wool`.
   - Laternen hängen am Rähm, **nicht** am Laub (Regel aus `festive.ts`).
   - Fichtenlaub hat eine feste Farbe und ist biomunabhängig [30].
5. **Baum:** eine geschmückte Fichte neben der Veranda, versetzt zur Tür. Geschenke **nur am Baumfuß** gruppiert (3–5), nicht im Hof verstreut (Befund S12).
6. **Holzstapel** an der Wand unter dem Überstand (T11), Feuerstelle mit Falltürring (T15) ≥ 4 vom Haus.
7. **Weg:** freigehalten, „snow blocks alternating with dark wood slabs“ [2] bei Bodenschnee, sonst `dirt_path`/`cobblestone`.

**Mit Schnee (nur auf ausdrücklichen Wunsch):**

- Schnee hält nur auf voller Oberseite: Vollblock, obere oder doppelte Stufe, Kopfüber-Treppe, Laub. **Nicht** auf normalen Treppen und unteren Stufen [19]. Vanilla bestätigt das: Die Schneedorf-Dateien enthalten 1054 Schneeschichten (980 davon in Häusern), keine einzige auf einer Stufe oder Treppe. Sie liegen auf `spruce_planks`, `grass_block` oder `snow_block`; 81 % haben `layers=1` [31].
- **Wo Schnee bei der Hütte liegen kann:**
  - Stamm-First (T03): `snow[layers=2..3]`
  - Kaminkopf: nicht, Lagerfeuer-Licht 15 schmilzt im Umkreis 3 [18]
  - Holzstapel: `layers=1..2`
  - Verandadach: bei Schnee-Wunsch aus `spruce_slab[type=top]` statt `type=bottom` bauen, dann `layers=1`
  - Fichten: `layers=1` auf jeder freien Laubfläche
  - Zaunpfosten: nicht
- **Schneestufen-Dach** (Option „verschneites Dach“, Einschätzung):
  - Im Feld zwischen Traufreihe und Ortgang ersetzt der Generator die Dachtreppen durch Vollblöcke des Dachmaterials, darauf `snow[layers=1..2]`.
  - Traufreihe und Ortgang bleiben Treppen. Es entsteht ein dunkler Holzrahmen um ein verschneites Stufenfeld; die Stufenkanten bleiben als feine dunkle Linien sichtbar.
  - Vanilla nutzt dasselbe Prinzip: Schnee nur auf `spruce_planks`, nie auf Stufen [31].
- **Licht gegen Schnee:**
  - Laternen (15) ≥ 4 Blöcke (Taxicab) von jeder Schneeschicht. Bei Schneedach deshalb keine Laternen unter der Traufe, sondern Kerzen (≤ 12) und Laternen an Pfosten ≥ 4 entfernt.
  - Regel und Abstände: `winter_weihnachten_landschaft.md` §1.
- **Keine Eiszapfen** (Nutzerentscheidung).

**Was die Weihnachtshütte kaputt macht:**

- grelle Farbwürfel im Hof
- Vollblock-Leuchten in der Girlande (wirken wie Kisten)
- Schnee auf Treppen (fällt beim ersten Nachbar-Update ab)
- Laterne neben Schnee
- weißer Putz plus Schnee (alles weiß, keine Kontur)
- zu große Hütte: über 11 Breite verliert sie die Intimität (Einschätzung)

### (k) Was den Stil kaputt macht

- Fachwerk-Raster oder dichte Ständer ohne Füllkontrast (S1); stehende Stämme als „Blockhaus“ (S2).
- Ein Material pro Fläche, besonders Dächer aus einer einzigen Treppe (S4); Braun auf Braun ohne Helligkeitsleiter (S3).
- Zu viele Holzarten durcheinander. Pro Haus 1 Hauptholz plus höchstens 1 Kontrastholz, 3–5 Hauptblöcke [3][13]. Ausnahme: die Dachmischung T04/T06.
- Kistige Quadrate, Flachdach oder `shallow` bei Reet und Hütte („flat roofs look wrong“ [2]); `bell`, `ogee` und `pagoda` wirken asiatisch oder märchenhaft.
- Glatte, moderne Blöcke: Beton (verboten), Quarz, glasierte Keramik, `smooth_stone`-Flächen, große Glasflächen.
- Sterile Umgebung: Rasen ohne Requisiten, Streublumen, Laubhecke als Zaun (S10).
- Dünner 1×1-Kamin, Zaunpfosten als Tragwerk (S6, S7).
- `hay_block` als ganze Dachfläche mit wechselnden Achsen [16][52].
- Perfekte Symmetrie: Kamin mittig, Läden überall gleich [1][4].
- Zu groß: „loses charm when the first frame already looks like a mansion“ [6].

### (l) Bewertung des aktuellen Stils `rustic` und konkrete Änderungen

| Bereich | Heute | Recherche | Ändern |
|---|---|---|---|
| Paletten | 3 (Fichte, Eiche, Stämme), alle braun-dunkel | 6 Untervarianten mit Helligkeitsleiter | `rustic_cabin`, `rustic_thatch`, `rustic_farmstone`, `rustic_chalet`, `rustic_barn`, `rustic_wintercabin` ergänzen |
| `rustic_spruce` | Dach `dark_oak` ≈ Rahmen `spruce_log` | Dach ≥ 15 ΔL vom Rahmen | Dach auf `spruce_planks` mit Mischung 75/25, Rahmen `stripped_spruce_log`, Trim `dark_oak` |
| `rustic_oak` | Wand 56 / Rahmen 20 / Dach 38 | gute Leiter | behalten; Dach-Mischung `spruce` 80 / `oak` 20, Kamin `bricks` beibehalten |
| `rustic_logs` | `stripped_spruce_log` stehend, Ständergitter | liegend mit Kreuzecken | `wallSystem: 'log'`; Wand `spruce_log`, Rahmen `stripped_spruce_log` |
| Ständer | volles Raster (`walls.ts:166`) | nur Ecken und Laibungen | `postSet` für `timber: 'none'` → Ecken + Öffnungszargen |
| Dachprioren | `gable` .6 / `half_hip` .15 / `saltbox` .15 / `gambrel` .1; standard .6 / `flared` .25 / steep .15 | je Variante (d) | `flared` aus rustic entfernen (gehört zu fantasy/japanese); Prioren je Palette |
| First | `slab` (`plan.ts:203`) | Stamm (Hütte, Chalet), Block (Reet) | `ridgeStyle` als Palettenfeld |
| Maße | 7×7, 9×9, 11×9, 15×11 | rechteckig 1 : 1,3–1,6; Chalet giebelständig | small 9×7, medium 11×7, large 13×9·2, huge 15×9·2 + Flügel |
| Überstand | 1–2 | Hütte 1, Chalet 2–3, Reet 1 | je Variante |
| Fenster | W04, W02, W05, W03 | dazu W06, W19, W20 | Liste je Variante (g) |
| Türen | T02, T01, T06, T05 | T06 als Hütten-Standard, T11/T12 für Hof und Scheune | Reihenfolge je Variante |
| Details | shutters .8, flowerBoxes .6, porch .7, chimney .9, dormers .3, annex .5 | Kamin 1.0 (immer), Läden variieren, Veranda je Variante | chimney 1.0; porch Hütte .9 / Cottage .3; Requisiten-Schalter |
| Landschaft | Hecke, Streublumen, Weg-Mix | Zaun, Cluster, Requisiten, Lichtung | `landscape.ts` für rustic: T12, T13, T15, T11 |
| Parser | chalet → `flared`; Reet und Mühle nicht umsetzbar | chalet → `shallow`; Reet über Palette | `parseDescription.ts:1389`, `:461` |

## Fehler, die Profis vermeiden

1. **Falsche Stammachse:** Liegende Wandstämme brauchen `axis` in Fassadenrichtung. An Gebäudeecken zeigt sonst die Rindenseite, wo Stirnholz hingehört, oder umgekehrt. Firstbalken zeigen ihre Ringe am Giebel (T03).
2. **Hirnholz am falschen Ort:** Stirnringe gehören an Vorköpfe, Pfettenköpfe und Holzstapel, nicht mitten in eine Wandfläche. Ausnahme: die Gwätt-Reihen (T02).
3. **Zaun als Tragwerk:** Ein Zaunpfosten trägt optisch nichts. Profis nehmen Stämme für Pfosten und Zäune nur für Geländer [2].
4. **Schnee auf Treppen oder unteren Stufen** fällt beim ersten Nachbar-Update ab [19]. Der Validator repariert das, der Generator sollte es gar nicht erst erzeugen.
5. **Licht 15 neben Schnee:** Laterne, Lagerfeuer und Leuchtstein schmelzen Schnee im Umkreis ≤ 3 [18][19].
6. **Falltür über dem Lagerfeuer** blockiert den Rauch vollständig [18]. Ein Block direkt darüber lässt ihn teilweise durch, mehr nicht.
7. **`signal_fire` falsch:** Mit Heu darunter muss der Zustand `true` sein. Das Spiel berechnet ihn bei einem Update von unten neu [18]; der Zustandsauflöser sollte ihn setzen (Einschätzung zur Auflöser-Pflicht).
8. **Ackerboden ohne Pflanze** wird zu Erde, solange er trocken ist. Mit Pflanze bleibt er [23]. Beete nie leer lassen.
9. **Pflanzen ohne Erde:** Blumen, Büsche und Beeren brauchen Erdblöcke (`moss_block`, `grass_block`, `coarse_dirt`, `rooted_dirt` …) [24][28]. `leaf_litter` braucht eine volle Oberseite [26].
10. **Biomfarben:** Eichenlaub, Gras und Ranken werden im Schneebiom graugrün. `spruce_leaves` und `birch_leaves` bleiben fest [30]; für Girlanden und Hecken verwenden.
11. **Heuballen-Dach mit wechselnder Achse** wirkt zerrissen [16].
12. **`dirt_path` unter Blöcken** wird zu Erde (wird in `landscape.ts` schon beachtet).
13. **Kamin zu hoch oder zu dünn:** 1–2 über dem First reicht [35]. Ein Rohr über 3 Blöcke hinaus liest sich als Industrie (Einschätzung).
14. **Zu viel Deko auf zu wenig Fläche:** Requisiten in Gruppen, dazwischen Ruhe. „Hand-built“, nicht vollgestellt [6].
15. **Sprossen aus Zäunen:** Zaun und Glasscheibe verbinden sich nicht. Für Sprossen Stämme oder Mauern nehmen (W20).

## Empfehlungen für den Generator

Priorisiert nach Wirkung pro Aufwand. Jede Empfehlung ändert bestehende Systeme gezielt und schreibt nichts neu.

| P | Was ändern | Modul | Daten/Regel | Akzeptanzkriterium |
|---|---|---|---|---|
| **P1** | Ständerraster bei `timber: 'none'` abschaffen: nur Ecken, Tür- und Fensterzargen, optional 1 Pfosten alle 6 bei Putz und Stein | `generator/house/walls.ts:166` | Regel | rustic-Fassade hat ≤ 2 + 2·(Öffnungen) Rahmenpfosten; keine Geschossbalken in d = +1 bei rustic; Lint „flache Wand“ weiter grün (über P2/T02, Fenster, Veranda) |
| **P2** | Wandsystem `log` (T01 + T02): liegende Stämme mit Achse je Fassade, Kreuzecken mit 1 Block Vorkopf, Gwätt-Reihen alle 4–6 ab Fassade 9, Blockgiebel liegend | `walls.ts`, `materials.ts` (Generator: `log(role, axis)` statt `block`), Palettenfeld `wallSystem` | Daten + Regel | bei `rustic_cabin`, `rustic_logs`, `rustic_wintercabin` haben ≥ 90 % der Wandstämme `axis ≠ y`; an jeder Ecke wechselt die Reihenparität; Vorköpfe genau 1 lang; Auflöser-Fixpunkt, 0 Validator-Reparaturen |
| **P3** | Texturmischung innerhalb einer Rolle (`blend`) für Dach, Wand (Feldstein) und Kamin, mit Cluster-Rauschen wie `texturing.ts`; optional Gradient (Fuß, Kehle, Kaminumkreis) | `style/palettes.ts` (Feld `blend`), `roof/roofEngine.ts` (beim Setzen der Treppen und Stufen), `style/texturing.ts` | Daten | keine Dachfläche hat mehr als 20 zusammenhängende gleiche Treppen; ≤ 3 Block-IDs je Fläche; benachbarte ΔL ≤ 20; Seed-reproduzierbar |
| **P4** | Sechs Untervarianten als Daten: Palette, Dachprioren, Profilprioren, Maße, Überstand, Sockel, Firststil, Fenster- und Türlisten, Detailwahrscheinlichkeiten (Tabellen c, d, g) | `style/styles.ts` (Feld `variants`), `style/palettes.ts`, Parser-Stichwörter | Daten | jede Variante besteht `lintPalette`/`lintStyle`; „chalet“ ergibt `shallow`, Überstand ≥ 2, Tiefe > Breite; „cottage“ ergibt `steep`/`standard` mit Reet-Palette |
| **P5** | Feldstein-Außenkamin T08 (Fuß 3×2, Schultern, Zug, Kopf, Falltür-Topf, Rauch; Höhe First + 1..2) | `generator/house/components.ts:149–163` | Regel | Kaminfuß am Giebel 3 breit; Oberkante ≤ First + 2; Lagerfeuer oben frei (keine Falltür darüber); Feldstein-Mix ≥ 3 Block-IDs |
| **P6** | Firststil je Palette: `log` (Hütte, Chalet, Weihnachtshütte), `block` (Reet), sonst `slab` | `generator/house/plan.ts:203` | Daten | `rustic_cabin` zeigt einen durchgehenden Stamm-First mit Ringen am Giebel |
| **P7** | Veranda T09: Stammpfosten, Rähm, Kopfbänder, Geländer, Hängelaternen; Dach als Catslide-Verlängerung bei Hütten | `components.ts:80–127` | Regel | keine `*_fence` als Stütze; jeder Pfosten trägt ein Rähm; Lücke vor der Tür ≥ 3 |
| **P8** | Reetdach T04 (Mischung, Untersicht = Dach, Block-First, ≥ 45°) und Parser „Reetdach/Strohdach“ von `unsupported` auf Palette `rustic_thatch` | `palettes.ts`, `roofEngine.ts`, `parseDescription.ts:461` | Daten + Regel | „Cottage mit Reetdach“ ergibt `steep`/`standard`, Mischung aus ≥ 3 Holzarten, kein `flared` |
| **P9** | Landschaft rustic: Zaun und Feldmauer statt Hecke, Blumen-Cluster, Holzstapel, Fässer und Heu, Feuerstelle, Vanilla-Laternenpfahl | `generator/landscape.ts:35–117`, neues `props.ts` | Daten + Regel | Medium-Haus hat ≥ 3 Requisitengruppen, keine Einzelblume ohne Nachbar im Abstand ≤ 2, Hecke ≤ 30 % des Umfangs |
| **P10** | Registry ergänzen: `gravel`, `podzol`, `farmland`, `wheat`, `carrots`, `potatoes`, `beetroots`, `composter`, `sweet_berry_bush`, `large_fern`, `tall_grass`, `leaf_litter`, `wildflowers`, `bush`, `firefly_bush`, `water_cauldron`; Material `pale_oak` (nur 1.21.11) | `blocks/families.ts`, `style/materials.ts:42–54`, Validator-Halteregeln | Daten | Registry-Test gegen minecraft-data grün; WorldEdit-Lesetest grün; Validator kennt Halt (Erde, volle Oberseite) |
| **P11** | Weihnacht + rustic: W18 und T10 zuordnen, Girlande am Verandageländer, Geschenke am Baumfuß, optional Signalrauch, Schneestufen-Dach nur bei Schnee-Wunsch | `templates/windows.ts:122`, `templates/doors.ts:31`, `festive.ts:41,169`, `roofEngine.ts` | Daten + Regel | Weihnachts-rustic hat W18 an allen Frontfenstern; keine Geschenke weiter als 3 vom Baum; bei Schnee-Wunsch liegt Schnee nur auf voller Oberseite, ≥ 4 von Licht 15; 0 Reparaturen |
| **P12** | Neue Vorlagen W19, W20, T11, T12, Balkon T10 (Geranienbrüstung) | `templates/windows.ts`, `doors.ts`, `balcony.ts` | Daten | Vorlagen-Test (`templateFits`, Rollen statt Blöcke, Drehung) grün; Scheune zeigt Tor mit Kreuz am Giebel |
| **P13** | Fledermausgaube T05 als Höhenfeld-Beule | `roof/roofEngine.ts` | Regel | Dach bleibt lückenlos (Lint), Auflöser setzt die Ecken, Fenster frei |
| **P14** | Legschindel-Steine T07 und Pfettenköpfe T03 für Chalet | `roofEngine.ts` | Regel | Knöpfe nur auf voller Oberseite; Pfetten 2–3 lang bei Überstand 2–3 |

Danach lohnt sich ein eigener Bauwerkstyp „Mühle“ (Rundturm + Kappe + 4 Flügel à 7 aus `dark_oak_fence` und `white_wool` [8][45]). Er ist nicht Teil dieser Stilbibel.

## Quellen

1. <https://minecraft.how/blog/post/build-cottage-minecraft>: Cottage. Thatch aus Heu, Fichtentreppen oder Laub; Höhenvariation und Asymmetrie; Glas 1 zurück; Läden variieren; Zaunpfosten alle 4–6; Grundfläche 8×10–12×12; Wände 4–5; Veranda mit Geländer.
2. <https://minecraft.how/blog/post/how-build-snow-cabin-minecraft>: Schneehütte. 2–3 Schneeschichten, Spitzdach statt Flachdach, Überstand 1–2, Veranda 2–3 vor mit Stammpfosten, Weg aus Schnee und dunklen Holzstufen, 7×8, Hängelaternen.
3. <https://sereyka.com/minecraft-medieval-house>: „hay bales and yellow terracotta pass for thatch“, Überstand ≥ 1, Sockel 1–3, Fenster 1 zurück mit Falltürläden, Ranken, Kamin unterbricht den First, 3–5 Hauptblöcke.
4. <https://www.switchbladegaming.com/minecraft/building-tips/>: Cosy-Cottage-Palette, „spruce stairs on an oak plank cottage“, Überstand 2, eingesetzte Fenster, 2–3 Bäume als Gruppe, Steigung zum Eingang, keine perfekte Symmetrie.
5. <https://8bittoast.com/minecraft-house-ideas/>: Classic Wooden Cabin: Stämme, Treppendach, kleine überdachte Veranda, Steinfundament.
6. <https://brightchamps.com/blog/best-cottagecore-minecraft-house-ideas/>: Cottagecore-Palette, Thatch aus Heu, gelber Terrakotta oder Holz; weiche Kanten; Fässer am Zaun, Komposter am Beet, Holzstapel; Wege mit Kurven; „hand-built rather than perfectly straight“.
7. <https://brightchamps.com/blog/minecraft-barn/>: Scheune 23×17, Eckstämme 6 hoch, Wände `stripped_birch`, Tor mit Falltüren, Fenster 3×2, Heuboden mit Leiter.
8. <https://diamondlobby.com/minecraft/how-to-build-windmill-minecraft/>: Windmühle: Basis 7×7, 5×5, 19 hoch, Flügel 7 lang aus Zaun und Wolle, Nabe aus Eichenstämmen.
9. <https://www.namehero.com/gaming-blog/how-to-build-a-minecraft-log-cabin/>: Blockhütte: Fichtenmaterial, Bruchsteinfundament, Kamin mit Lagerfeuer und 4 Fichten-Falltüren drumherum.
10. <https://blockblend.app/guides/best-block-combinations>: spruce + cobblestone + mossy (Fundament, Kamin, Moos unten); stripped_oak + mud_bricks + rooted_dirt für Waldcottages.
11. <https://blockblend.app/guides/minecraft-terrain-gradients>: Verlauf dirt → coarse_dirt → gravel → cobblestone mit Prozenten; coarse_dirt als „trampled, dry ground“.
12. <https://minecraftgradient.blog/minecraft-house-design/>: Hüttenpalette cobblestone → spruce → stripped_spruce → dark_oak; Grundfläche 9–13 × 7–11; Wand 5–7.
13. <https://craftdex.net/articles/the-architecture-of-builds>: 60/30/10, 3–4 Massen, Nebenkörper 1/3–1/2, Pfeiler 1 vor, ungerade Wandfelder.
14. <https://www.thegamer.com/minecraft-build-tips-tricks-methods-detail-realistic/>: coarse_dirt/podzol-Wege, Steinknöpfe als Kiesel, Stamm und entrindeter Stamm mischen.
15. <https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines>: Neigung nach Niederschlag, ungerade Breiten, Dach 1–2 Geschosse hoch, ab 15×15 mehrere Dachabschnitte.
16. <https://de.minecraft.wiki/w/Anleitungen/Dach>: Strohballen einheitlich ausrichten, gelber Teppich auf Problemstellen; Heudach für ländliche Gebäude; Holzdach braucht Dachdeko; Überhang auch am Giebel; Kontrast-Umrandung.
17. <https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions>: Läden an 1×2-Fenstern, Hecken aus Laub auf Holz, Garten mit Sträuchern, Blumen und Topfpflanzen.
18. <https://minecraft.wiki/w/Campfire>: Rauch 10 bzw. 24 Blöcke mit Heu; Falltür blockiert Rauch; Licht 15 schmilzt Schnee; Zustände `lit`, `signal_fire`, `facing`.
19. <https://minecraft.wiki/w/Snow>: Schnee nur auf voller Oberseite (Stufe oben, Kopfüber-Treppe, Laub …), bricht ohne Halt, schmilzt ab Blocklicht 12.
20. <https://minecraft.wiki/w/Hay_Bale>: Achse x/y/z, Signalfeuer, Vorkommen in Dörfern.
21. <https://minecraft.wiki/w/Bamboo_Mosaic>: Block, Treppe, Stufe; kein Zaun, keine Tür.
22. <https://minecraft.wiki/w/Trapdoor>: Falltüren brauchen keinen Halt; 3/16 dick; Zustände `facing`, `half`, `open`.
23. <https://minecraft.wiki/w/Farmland>: Ackerboden mit Pflanze bleibt trotz Trockenheit; Feldfrüchte brauchen Ackerboden.
24. <https://minecraft.wiki/w/Sweet_Berry_Bush>: Alter 0–3, zulässige Böden, Schaden für Entities.
25. <https://minecraft.wiki/w/Composter>: `level` 0–8, Vorkommen an Dorffeldern.
26. <https://minecraft.wiki/w/Leaf_Litter>: ab 1.21.5, `segment_amount` 1–4, braucht volle Oberseite.
27. <https://minecraft.wiki/w/Wildflowers>: ab 1.21.5, `flower_amount` 1–4.
28. <https://minecraft.wiki/w/Bush>: ab 1.21.5, zulässige Böden, Biomfärbung.
29. <https://minecraft.wiki/w/Firefly_Bush>: ab 1.21.5, Licht 2, Glühwürmchen nachts.
30. <https://minecraft.wiki/w/Leaves>: Fichten- und Birkenlaub haben feste Farben, Eiche und andere sind biomgefärbt.
31. <https://github.com/misode/mcmeta/tree/1.21.11-data/data/minecraft/structure/village>: Vanilla-Dorfstrukturen 1.21.11 (taiga, plains, snowy: Häuser, Deko, Laternenpfähle), eigene Auswertung mit NBT-Leser. Blockanteile, Stammachsen, Schnee-Unterlagen, Deko-Muster.
32. <https://en.wikipedia.org/wiki/Log_cabin>: liegende Stämme, Doppelkerbung mit überstehenden Köpfen, Moos als Dichtung, Pfetten- und Sparrendach.
33. <https://de.wikipedia.org/wiki/Blockbau>: liegende Hölzer, Verkämmung, Steinfundament, Innenwände als senkrechte Reihen von Balkenköpfen sichtbar (Strickbau).
34. <https://en.wikipedia.org/wiki/Thatching>: Reetdachneigung 45–55°, Lebensdauer, Firstpflege.
35. <https://de.wikipedia.org/wiki/Reetdach>: Neigung über 45°, Traufüberstand ≥ 50 cm, Firstarten (Heide-, Grassoden-, Tonkappenfirst), Schornstein ≥ 0,8 m über First.
36. <https://en.wikipedia.org/wiki/Cottage>: lokale Materialien (Bruchstein, Lehm, Stroh, Schiefer), geringe Höhe, sichtbares Holz.
37. <https://en.wikipedia.org/wiki/Cob_(material)>: Wände rund 61 cm, tiefe Fenster, hohes Fundament und großer Dachüberstand.
38. <https://en.wikipedia.org/wiki/Chalet>: „heavy, gently sloping roof and wide, well-supported eaves“.
39. <https://en.wikipedia.org/wiki/Swiss_chalet_style>: breite Traufen, sichtbare Balken und Konsolen, Balkone, Schnitzwerk.
40. <https://en.wikipedia.org/wiki/Black_Forest_house>: Walm- oder Krüppelwalmdach bis zur EG-Höhe, Steinsockel, Rampe zum Heuboden.
41. <https://de.wikipedia.org/wiki/Schwarzwaldhaus>: Walm oder Krüppelwalm mit 45–50°, gemauertes Untergeschoss, Hocheinfahrt.
42. <https://de.wikipedia.org/wiki/Holzschindel>: Legschindeldach für flache Neigungen, Schwersteine auf Schwerstangen, Alpen; frische Schindeln gelblich, später grau.
43. <https://en.wikipedia.org/wiki/Wood_shingle>: Schindeln und Schakes, „thatch-like appearance“ durch gebogene Schindeln, regionale Formen.
44. <https://en.wikipedia.org/wiki/Barn>: Gambrel für den Heuboden, Scheunenrot aus Eisenoxid, senkrechte Bretter, Heuluke mit Heuhaube, Bank Barn.
45. <https://en.wikipedia.org/wiki/Windmill>: Bock-, Holländer- und Turmmühle; meist 4 Flügel; achteckige Holländermühle.
46. <https://en.wikipedia.org/wiki/Saltbox>: Saltbox und Catslide (Dach bis unter die Haupttraufe).
47. <https://en.wikipedia.org/wiki/Cottage_garden>: dichte, informelle Mischung aus Zier- und Nutzpflanzen, Rosenbogen am Tor, Bienenstock, Obst.
48. <https://en.wikipedia.org/wiki/Picket_fence>: 91–122 cm hoch, weiß gestrichen.
49. <https://en.wikipedia.org/wiki/Window_box>: Kasten auf oder unter dem Sims, auf Konsolen.
50. <https://en.wikipedia.org/wiki/Dry_stone>: Feldmauern 1,2–1,5 m, Decksteine, Anzug.
51. <https://arxiv.org/abs/1906.05094>: Green, Salge, Togelius, „Organic Building Generation in Minecraft“ (GDMC). Organisch wirkende Grundrisse durch Wachstum und zellulare Automaten.
52. <https://feedback.minecraft.net/hc/en-us/community/posts/360022478792-Thatched-Roof>: nur Such-Snippet (Seite 403). Spieler: Heuballen zu grell und klotzig, rotes Band, Wunsch nach Stroh-Treppen und -Stufen.

Intern: [I1] `src/core/style/textureStats.ts` (L\*, Chroma und Farbton je Block aus der 1.21.11-Client-Datei, abgeleitet).
