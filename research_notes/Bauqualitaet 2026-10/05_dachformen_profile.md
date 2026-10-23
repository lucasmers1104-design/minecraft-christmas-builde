# 05 – Dachformen, Neigungen, Profile und Kurven

Stand 2026-10-23. Thema: Welche Dachformen, Neigungen, Kurvenprofile (als Δ-Folgen in halben Blöcken) und Formkombinationen ein regelbasierter Generator braucht, damit Dächer in Minecraft Java 1.21.11 wie von erfahrenen Buildern gebaut aussehen, und wo die heutige Dach-Engine davon abweicht.

Konventionen wie in `daecher.md`: +x Ost, +z Süd, +y oben. Δ = Anstieg einer Dachspalte in halben Blöcken (hb), von der Traufe zum First. t = Summe der Δ (Oberkante der Spalte in hb über der Dachbasis). Tiefe d relativ zur Wandebene: +1/+2 davor (Überstand), 0 Wand, −1, −2 … innen. Stilkürzel: MED medieval, FAN fantasy, RUS rustic, NOR nordic, JAP japanese, CHE cherry, MOD modern, MDT mediterranean. „(nicht in Registry)“ = gibt es in 1.21.11, fehlt aber in `families.ts`. Was ohne Quelle steht, ist als **Einschätzung** markiert. Die Grundlagen aus `daecher.md` (Treppenzustände, Ecklogik, Grundneigungen, Spaltenalgorithmus, Schnee, Kamine) setze ich voraus und wiederhole sie nicht.

---

## Kurzfassung

Nach Wirkung sortiert:

1. **Der 7-Block-Deckel zerstört die Profile.** `capRise` flacht von oben ab. Aus „steil“ wird ein Scheunenprofil (n = 7: `4,4,2,1,1,1,1`; n = 12: `2,1,1,…`), aus „Glocke“ ein Buckel. Profis halten **eine** Neigung pro Bau und wechseln bei Platzmangel die Neigungsstufe oder die Form. Ersatz: Neigungsleiter 26,6° · 33,7° · 36,9° · 45° · 53,1° · 56,3° · 63,4° · 71,6° plus Stildeckel „Dach = 1–2 Geschosse“ ([2]).
2. **Japanisch braucht Irimoya, nicht Krüppelwalm.** Irimoya = unten rundum Walm, oben Giebel über dem Kernbau ([8], [18]). `half_hip` baut das Gegenteil (`roofEngine.ts:198–205`), und JAP wählt es mit 0,4 (`styles.ts:181`).
3. **Ohne Aufbiegung kein japanisches Dach.** „The flare is non-negotiable“, sonst „a generic pyramid roof“ ([47]). Zwei historische Kurven: *shinzori* (Mitte → Ecken) und *naginatazori* (gerade, Enden abrupt hoch) ([9]). Umsetzbar als Hebungstabelle (T8).
4. **Kurven brauchen monotone Δ-Folgen in kleinen Schritten** (1 → 2 → 4; Δ3 nur nach ungeradem t). `bell` liefert ab n = 9 `1,1,1,3,1,1,1,1,4` (Paritätsfehler plus Deckel). Katalog für n = 4…12 in T2.
5. **Gambrel und Mansard haben zwei Neigungen mit Knick.** Gambrel: Δ4 auf ≈ 30 % der Lauflänge, dann Δ1 (Halbkreis-Regel [26]), Knickbalken. Mansard: Steilgeschoss Δ6 mit Aufschiebling ([38]), Deck oben, kaum Überstand ([25]), Gauben ([24]). Heute: Gambrel = Dreifach-Konvex, Mansard = 63°-Walm ohne Gauben.
6. **Dach-über-Dach braucht gestapelte Spalten.** Shikoro ([10]), Mokoshi ([11]), Pagodenringe, Ortgang über Walmband, zurückgesetzte Gaube: Die Engine schreibt je Spalte nur den Gewinner (`roofEngine.ts:334–356`). Ohne Stapelmodus entstehen Löcher.
7. **Flügel ordnen sich unter.** Flügelfirst = Hauptfirst oder ≥ 1 Block (besser 1 Geschoss) tiefer ([51]); Zwerchhausfirst unter dem Hauptfirst ([37]); dieselbe Neigungsstufe für alle Abschnitte.
8. **Grate, Kehlen und Ränder lesbar machen.** „Add ridges or hip rafters for a professional, finished look“ ([53]); Moos an Traufe und Kehlen ([49]); Trim nur auf der äußersten Ortgangspalte.
9. **Große Flächen gliedern** durch Zwerchhaus und Gauben auf Fensterachsen, Firststufen, Verwitterung und Abschnitte auf verschiedenen Höhen ([44], [2]). Unsere Gauben gibt es nur vorn, nur an x-Satteldächern, nur 3 breit (`components.ts:24–33`).
10. **Pagoden:** ungerade 3–13 Stufen, Traufspitzen auf einer Geraden, mehr Teigen = solider, Finial Pflicht ([20], [48]). Heute ist `pagoda` = Walm (`plan.ts:189`), `skirt` bleibt ungenutzt.
11. **Dachhöhe und Überstand sind Stilmerkmale.** MED „as tall as the walls“ ([43]); JAP etwa halbe Bauhöhe ([19]) bzw. doppelte Wandhöhe ([46]) mit Traufen über 4 m ([22]); MDT römisch 24–34° ([27]); MOD flach.
12. **Ortgang- und Firstvarianten:** Aufkantung, Falltür-Brett, Treppengiebel ([32]), Finial und Pendant ([31]), Onigawara ([14]). `gableRecess` ist toter Code (`plan.ts:423`).
13. **Türme ragen über den Hauptfirst** (Traufe ≥ First + 2, Einschätzung). Der eckige Turm hat nur „Geschosse + 1“ (`plan.ts:323`) und steht damit oft unter dem Hauptfirst.

---

## Schwächen des aktuellen Generators

Die Δ-Werte habe ich mit einer 1:1-Portierung von `profiles.ts` berechnet (`rawDeltas → normalizeDeltas → capRise`, maxRise 7).

**S1 – Der Deckel verformt alle Profile** (`profiles.ts:75–101`, `plan.ts:426` `maxRise … 7`, `buildingLints.ts:141–142` Anstieg > 8 als Fehler). `capRise` senkt die Spalten vom First abwärts auf Δ1 bzw. Δ2. Das Profil ändert damit seinen Charakter, statt gleichmäßig flacher zu werden:

| Profil | n | Ergebnis heute | Rise (Blöcke) | Wirkung |
|---|---|---|---|---|
| steep | 5 | `4,4,4,1,1` | 7 | Knick oben |
| steep | 7 | `4,4,2,1,1,1,1` | 7 | Scheunen-/Gambrelprofil |
| steep | 12 | `2,1,1,1,1,1,1,1,1,1,1,1` | 6,5 | fast flach mit Wulst |
| standard | 10 | `2,2,2,2,1,1,1,1,1,1` | 7 | konvex statt 45° |
| bell | 9 | `1,1,1,3,1,1,1,1,4` | 7 | **nicht monoton** (Buckel) |
| bell | 12 | `1,1,1,3,1,1,1,1,1,1,1,1` | 7 | keine Glocke mehr |
| flared | 12 | `1,1,1,1,1,1,1,1,1,1,2,2` | 7 | Krempe frisst das Dach |
| mansard | 9 | `4,2,1,1,1,1,1,1,1` | 6,5 | kein Mansard (1 Steilspalte) |
| ogee | 7 | `1,3,4,2,1,1,1` | 6,5 | Zickzack |

Belege im Bild: `haus-nordisch-gross-ohne-thema.jpg` und `haus-nordisch-winter-schnee.jpg` zeigen ein gewölbtes, tonnenartiges Langdach statt eines steilen Satteldachs. `haus-fantasy-gross-ohne-thema.jpg` zeigt eine buckelige Glocke.

**S2 – Paritätsfehler in `bell`** (`profiles.ts:44` und `:58–68`). `split` liefert eine ungerade Zahl führender Δ1. `normalizeDeltas` macht daraus eine 3, und die konkave Kappungsschleife (`:80–91`) wandelt danach Paare von 2en in 1en um. Die 3 bleibt stehen. Ergebnis: Δ3 gefolgt von Δ1.

**S3 – Zwei Spalten haben bei Haupt- und Flügeldach verschiedene Neigung.** Profil und Deckel gelten pro Abschnitt (`roofEngine.ts:212–225`). Ein schmaler Flügel mit n = 4 behält `4,4,4,2`, das Hauptdach mit n = 7 bekommt `4,4,2,1,1,1,1`. In der Kehle treffen also verschiedene Neigungen aufeinander. Das verletzt die Regel „Pick one pitch for the whole build“ (Astroworld, siehe `daecher.md` §2).

**S4 – Gambrel und Mansard sind falsch modelliert.** Gambrel nutzt das Konvexprofil mit drei Neigungen (`roofEngine.ts:137`, `profiles.ts:46`). Mansard ist ein Walm mit 40 % Δ4 (63°), und zwar inklusive Überstandsspalte (`profiles.ts:50–53`). Es fehlen das Deck (Δ0 ist unmöglich: `columnPieces` gibt bei Δ ≤ 0 nichts zurück, `profiles.ts:122`), der Fußknick und die Gauben (`components.ts:25` schließt mansard und hip aus).

**S5 – Japanisch: falsche Form und keine Kurve.** `half_hip` (0,4) ist ein Krüppelwalm (`roofEngine.ts:198–205`), `pagoda` wird zum Walm (`plan.ts:189`). Es gibt weder Traufkurve noch Eckaufbiegung noch Firstenden. In `haus-japanisch-*.jpg` und `haus-kirschbluete-*.jpg` sind die Traufen gerade. Die Δ1-Krempe zeigt sich als breite, waagerechte Terrassenbänder, die Gratecken sind eckig gestuft, und der First ist ein durchgehender Balken (`block_slab`, `plan.ts:203`).

**S6 – Nur der Gewinner pro Spalte wird geschrieben** (`roofEngine.ts:334–356`). Gestapelte Dächer gehen deshalb nicht: Irimoya mit Ortgang über dem Walmband, Shikoro-Stufe, Mokoshi, Pagodenringe, Schleppgaube mit Traufe über der Hauptfläche, Vordach unter der Traufe. Der Typ `skirt` (`:180–183`) existiert, bekommt aber keine Untersicht (`:360`) und wird im Hausplan nie erzeugt.

**S7 – Trim und Linien.** Laut `roofEngine.ts:248` (`trim = d === 0 || verge`) sind bei Überstand 2–3 (NOR, JAP: `styles.ts:156`, `:185`) alle 2–3 Ortgangspalten aus Trim. Das ergibt ein schweres Band. Grate (dx = dz) und Kehlen bekommen keine eigene Behandlung.

**S8 – Gauben** (`components.ts:24–58`): Sie entstehen nur bei `ridgeAxis === 'x'`, nur an der Vorderseite (`z = section.z0`, `:33`) und nur bei Spannweite ≥ 9 (`:27`). Sie sind fest 3 breit, immer Giebelgauben und gleichmäßig verteilt (`:32`), sitzen aber nicht auf den Fensterachsen. Ihre Front steht bündig in der Rahmenebene. Das ist technisch ein Zwerchhaus, keine Gaube, denn eine Gaube „sitzt … hinter der Außenwand auf den Sparren“ ([41]).

**S9 – Ungenutzte Gestaltung.** `gableRecess: false` ist fest verdrahtet (`plan.ts:423`). Es gibt keine Finials oder Pendants an Giebelscheiteln, keine Ortgang-Varianten und keine Brüstungsgiebel.

**S10 – Turmhöhe.** Der eckige Turm hat `floors: input.floors + 1` (`plan.ts:323`). Seine Traufe liegt dann nur 4–5 Blöcke über der Haupttraufe, der Hauptfirst aber bis zu 7 Blöcke darüber. Der Rundturm hat +2 (`plan.ts:382`), das passt meist.

**S11 – Kleiner Spalt unter dem Ortgangbrett** (Einschätzung aus der Geometrie, `roofEngine.ts:366–369`). Bei Spalten mit oberer Stufe (Δ1, t gerade) liegt die Kopfüber-Treppe darunter bei `lowest − 1`. Zwischen ihrer Oberkante und der Unterkante der Stufe bleibt ein Spalt von 0,5 Block. Das betrifft Krempen von `flared`, `bell` und JAP-Dächern.

**S12 – Kein Firstende** und keine Wahl der Firstlänge. Der First läuft bis über den Ortgangüberstand und endet stumpf.

---

## Techniken und Regeln

### T1 – Neigungsleiter statt Abflachen (planare Zwischenneigungen)

**Beschreibung.** Eine Neigung entsteht aus einem kurzen, sich wiederholenden Δ-Muster. Das Wiki empfiehlt dafür ausdrücklich „a repeating pattern of two or three blocks that generates roughly the right slope“ ([2]). Passt die gewünschte Neigung nicht unter den Deckel, nimmt der Generator die nächstflachere Stufe für **alle** Abschnitte des Hauses. Er schneidet nicht oben ab.

| Stufe | Muster (wiederholt) | Steigung | Winkel | Paritätscheck t |
|---|---|---|---|---|
| P27 | `1` | 1:2 | 26,6° | 1,2,3,4 |
| P34 | `1,1,2` | 2:3 | 33,7° | 1,2,4,5,6,8 |
| P36 | `1,1,2,1,1,2,2` (Wiki 5:7) | 5:7 | 35,5° | 1,2,4,5,6,8,10 |
| P37 | `1,1,2,2` | 3:4 | 36,9° | 1,2,4,6 |
| P45 | `2` | 1:1 | 45° | 2,4,6 |
| P53 | `4,2,2` | 4:3 | 53,1° | 4,6,8,12 |
| P56 | `4,2` | 3:2 | 56,3° | 4,6,10,12 |
| P63 | `4` | 2:1 | 63,4° | 4,8 |
| P72 | `6` | 3:1 | 71,6° | 6,12 |

Regeln:
- Bei westlichen Stilen beginnt das Muster an der Traufe mit dem größten Δ (Treppe als saubere Traufkante). Bei JAP und CHE beginnt es mit Δ1 (dünne Traufe).
- Zwei Δ3 folgen nie direkt aufeinander. Δ3 kommt nur nach ungeradem t vor. Ein „1,3“-Paar entspricht im Mittel 45° mit Textur.
- **Auswahl:** `pitch = steilste Stufe im Stilbereich mit rise(n) ≤ cap`. Ist selbst die flachste Stufe zu hoch, wechselt der Generator die Form (Walm, Krüppelwalm, Kreuzflügel, Mansard) oder teilt die Masse. Das Wiki empfiehlt dann, „split the roof into two or three smaller sections so that the rise per section is around 5–7 blocks“ ([2]).
- **cap** (Einschätzung, gestützt auf „roof between one and two stories tall“ [2], [43], [46]): `cap = clamp(round(f · Wandhöhe), 5, 14)` mit f = 0,9 (MED, NOR, FAN), 0,7 (RUS), 1,0 (JAP Tempel) bzw. 0,8 (JAP und CHE Wohnhaus), 0,4 (MDT), 0,2 (MOD).

**Skizze A – heute vs. Vorschlag**, Schnitt Südhang, n = 7, MED-Haus mit Spannweite 15. Legende: S = `spruce_stairs[facing=north,half=bottom]` (hohe Seite zum First im Norden), F = `spruce_planks`, b = `spruce_slab[type=bottom]`, t = `spruce_slab[type=top]`, r = First. Spalte 0 = Traufspitze (d = +1).

```
heute: steep + capRise  (4,4,2,1,1,1,1)      Vorschlag P53 (4,2,2,4,2,2,4) bei cap 10
y\Sp  0 1 2 3 4 5 6 7                         y\Sp  0 1 2 3 4 5 6 7
                                              y10   . . . . . . . r
                                              y9    . . . . . . S .
                                              y8    . . . . . . F .
y7    . . . . . . . r                         y7    . . . . . S . .
y6    . . . . . b t .                         y6    . . . . S . . .
y5    . . . b t . . .                         y5    . . . S . . . .
y4    . . S . . . . .                         y4    . . . F . . . .
y3    . S . . . . . .                         y3    . . S . . . . .
y2    . F . . . . . .                         y2    . S . . . . . .
y1    S . . . . . . .                         y1    S . . . . . . .
y0    F . . . . . . .                         y0    F . . . . . . .
```

**Einsatz:** alle Stile, alle Satteldach- und Walmabschnitte. **Wirkung** hoch. **Aufwand** niedrig (Tabelle plus Auswahlregel in `profiles.ts`). **Quellen:** [2], [27], [43], [46].

### T2 – Kurvenprofil-Katalog (Glocke, Sori, Mukuri, Ogee) mit Quantisierer

**Beschreibung.** Eine Kurve ist eine Zielfunktion y(u), u = x/n. Ein kleiner DP-Quantisierer wählt Δ ∈ {1,2,3,4,6,8} (für Decks zusätzlich {0}). Er hält die Paritätsregel ein (Δ ≥ 2 nur bei geradem t), ist monoton (konkav nicht fallend, konvex nicht steigend) und minimiert Σ(t − Ziel)² + λ·Σ|ΔΔ|. Das Wiki nennt die Grenzen: Kurven unter etwa 6 Blöcken Radius wirken wie „a strange mixture of pitches“, konkave japanische Kurven „are by far the hardest“ (`daecher.md` §4). Gullwing-Kurven bauen Profis aus dem Ausschnitt eines Kreises mit dem 2–3-fachen der Dachhöhe ([52]). JAANUS unterscheidet konkav *sori* und konvex *mukuri*. Mukuri war in der Edo-Zeit an Tempeln, Toren und Wohnhäusern verbreitet ([16]). Der *karahafu* läuft oben konvex und unten konkav, also als S-Kurve ([13]).

Die folgenden Folgen habe ich mit dem DP berechnet und von Hand gegen die Paritätsregel geprüft (alle t zulässig). „Rise“ ohne Firststück:

| n | Glocke (H≈n) | Sori JAP (H≈0,75n) | Mukuri (H≈0,75n) | Ogee (n ≥ 8) |
|---|---|---|---|---|
| 4 | `1,1,2,4` (4) | `1,1,2,2` (3) | `2,2,1,1` (3) | – |
| 5 | `1,1,2,2,4` (5) | `1,1,2,2,2` (4) | `2,2,2,1,1` (4) | – |
| 6 | `1,1,2,2,2,4` (6) | `1,1,1,1,2,2` (4) | `2,2,2,1,1,1` (4,5) | – |
| 7 | `1,1,2,2,2,2,4` (7) | `1,1,1,1,2,2,2` (5) | `2,2,2,2,1,1,1` (5,5) | – |
| 8 | `1,1,1,1,2,2,4,4` (8) | `1,1,1,1,2,2,2,2` (6) | `2,2,2,2,2,1,1,1` (6,5) | `1,1,2,4,2,2,2,1` (7,5) |
| 9 | `1,1,1,1,2,2,2,4,4` (9) | `1,1,1,1,1,1,2,2,4` (7) | `2,2,2,2,2,1,1,1,1` (7) | `1,1,2,2,4,2,2,1,1` (8) |
| 10 | `1,1,1,1,2,2,2,2,4,4` (10) | `1,1,1,1,1,1,2,2,2,2` (7) | `2,2,2,2,2,2,1,1,1,1` (8) | `1,1,2,2,2,4,2,2,1,1` (9) |
| 12 | `1,1,1,1,2,2,2,2,2,2,4,4` (12) | `1,1,1,1,1,1,1,1,2,2,2,4` (9) | `2,2,2,2,2,2,2,1,1,1,1,1` (9,5) | `1,1,2,2,2,2,4,2,2,2,1,1` (11) |

**Glocke unter Deckel** (Regel statt Abschneiden): Die Glocke besteht aus a × Δ1 (a gerade), b × Δ2 und c × Δ4. Reicht der Deckel nicht, gilt diese Reihenfolge:
1. c auf 1 senken, die frei werdenden Spalten werden Δ2.
2. Paare von Δ2 in Paare von Δ1 verschieben, a bleibt dabei gerade.
3. c auf 0 senken.

Ergebnisse: n = 8 mit cap 7 → `1,1,1,1,2,2,2,4`, n = 9 mit cap 7 → `1,1,1,1,1,1,2,2,4`. Wird a > n/2, ist die Glocke zu flach. Dann wählt der Generator Kick + P34 oder Walm.

**Skizze B – Glocke n = 7** `1,1,2,2,2,2,4`, Schnitt Südhang. Legende wie A; r = `spruce_slab[type=bottom]` (First).

```
y\Sp  0 1 2 3 4 5 6 7
y7    . . . . . . . r
y6    . . . . . . S .
y5    . . . . . . F .
y4    . . . . . S . .
y3    . . . . S . . .
y2    . . . S . . . .
y1    . . S . . . . .
y0    b t . . . . . .
```

**Einsatz:** Glocke für FAN; Sori für JAP und CHE (Tempel, Wohnhaus); Mukuri für CHE-Wohnhaus und JAP-Tore; Ogee nur ab n ≥ 8 (FAN-Großbau). **Wirkung** hoch. **Aufwand** mittel (DP mit rund 50 Zeilen; der Katalog dient als Snapshot-Test). **Quellen:** [2], [13], [16], [52], `daecher.md` §4.

### T3 – Aufschiebling (Kick, Traufknick)

**Beschreibung.** Ein Aufschiebling ist ein flacheres Stück an der Traufe, das „a typical kink ('roof break')“ erzeugt. Laut de.wiki war er „especially common on steep roofs, including mansard roofs and tower spires“ ([38]). In Minecraft heißt das: **genau zwei** Δ1-Spalten an der Traufe, danach die Neigungsstufe. Bei zwei Spalten bleibt die Parität gerade. Bei einer Δ1-Spalte bräuchte die nächste Spalte Δ3, also ein sichtbar steileres Stück.

Kick über Überstand o: Bei o = 1 liegt die zweite Δ1-Spalte auf der Wandlinie. Bei o ≥ 2 liegt der Kick ganz im Überstand. Der Kick ist auch die Basis der japanischen Krempe (T8).

**Skizze C – Kick auf P63**, Südhang, `1,1,4,4,4`. Legende: b/t = `deepslate_tile_slab[type=bottom|top]`, S = `deepslate_tile_stairs[facing=north,half=bottom]`, F = `deepslate_tiles`.

```
y\d   +2 +1  0 -1 -2
y6     .  .  .  .  S
y5     .  .  .  .  F
y4     .  .  .  S  .
y3     .  .  .  F  .
y2     .  .  S  .  .
y1     .  .  F  .  .
y0     b  t  .  .  .
```

Eine Variante für MED, NOR und Turmhelme ist Kick plus Steilfläche, z. B. `1,1,4,4,…`. Die Dachfläche „läuft aus“ und wirkt weniger aufgesetzt. **Wirkung** mittel. **Aufwand** niedrig (heute fast vorhanden als `flared`, es fehlt nur die Regel „immer 2 Spalten“). Stile: MED, FAN, NOR, JAP, CHE. **Quellen:** [38], `daecher.md` §4.

### T4 – Gambrel korrekt (zwei Neigungen, Knie bei 30 %)

**Beschreibung.** Laut Wiki hat ein Gambrel „two or three distinct roof pitches – steep lower down, and shallow or flat higher up“. Kurven setzt man zuerst unten ([1]). Der Gambrel ist ein Satteldach mit Knick, das über den Ortgang auskragt. Der Mansard ist dagegen ein Walm mit Knick und „normally does not“ overhang ([25]). Zimmerleute konstruieren den Knick am Halbkreis („fit inside a Semi Circle“, Knickpunkt mit Pfette, [26]). Bei den Halbkreispunkten 0°, 45° und 90° liegt der Knick bei 29 % der Lauflänge und 71 % der Höhe. Das ergibt unten etwa 67,5° und oben etwa 22,5°. In Minecraft wird daraus k = round(0,3 · n) Spalten Δ4 unten und Δ1 oben (eigene Rechnung).

| n | Gambrel | Rise | Holländisch (mit Kick) |
|---|---|---|---|
| 5 | `4,4,1,1,1` | 5,5 | `1,3,4,1,1` |
| 6 | `4,4,1,1,1,1` | 6 | `1,3,4,1,1,1` |
| 7 | `4,4,1,1,1,1,1` | 6,5 | `1,3,4,4,1,1,1` |
| 8 | `4,4,1,1,1,1,1,1` | 7 | `1,3,4,4,1,1,1,1` |
| 9 | `4,4,4,1,1,1,1,1,1` | 9 | `1,3,4,4,1,1,1,1,1` |
| 10 | `4,4,4,1,1,1,1,1,1,1` | 9,5 | `1,3,4,4,4,1,1,1,1,1` |

**Knickbalken:** Am Knick läuft ein `stripped_<holz>_log[axis=<Firstachse>]` in der Giebelebene und ragt 1 Block vor (d = +1). Er bildet die Pfette nach. Den Giebel füllt der Generator nach demselben Profil.

**Skizze D – Gambrel n = 7**, Schnitt Südhang, ungerade Spannweite. Legende: F = `dark_oak_planks`, S = `dark_oak_stairs[facing=north,half=bottom]`, b/t = `dark_oak_slab[type=bottom|top]`, T/c = Firststufen (oben/unten), K = Knickbalken `stripped_dark_oak_log[axis=x]` (nur in der Giebelebene, d = +1).

```
y\Sp  0 1 2 3 4 5 6 First
y7    . . . . . . . c
y6    . . . . . . b T
y5    . . . . b t . .
y4    . . b t . . . .
y3    . S K . . . . .
y2    . F . . . . . .
y1    S . . . . . . .
y0    F . . . . . . .
```

**Einsatz:** RUS-Scheune, Marktgebäude, FAN-Hütte (dort darf die gekrümmte Variante `convex` bleiben). Größe: ab n ≥ 5. **Wirkung** mittel. **Aufwand** niedrig (Profil plus Balken). **Quellen:** [1], [25], [26].

### T5 – Mansard korrekt (Steilgeschoss, Deck, Gauben)

**Beschreibung.** Beim Mansard ist die untere Fläche steiler als die obere. Die obere Fläche ist von der Straße aus oft nicht sichtbar. Mansarddächer sind „often punctured by dormer windows“, und Konvex- oder Konkavkrümmung wird gern dekorativ genutzt ([24]). Das Wiki nennt als Mindestmaß etwa 16 × 20 ([1]). Der Aufschiebling ist am Mansard typisch ([38]).

**Regel:** Die steile Zone ersetzt das oberste Geschoss. Der Generator baut `floors − 1` Wandgeschosse plus ein Mansardgeschoss mit Gauben in jeder zweiten Achse. Der Überstand ist 0 oder 1 (mit Gesims). Profil:

| o | Steilzone (≈ 1 Geschoss) | Oberzone | Beispiel n = 8 |
|---|---|---|---|
| 1 | `1,3,6` (5 Blöcke) | bis zu 2 × Δ1, dann Δ0 (Deck) | `1,3,6,1,1,0,0,0` |
| 0 | `2,6` (4 Blöcke) bzw. `2,6,2` bei Geschosshöhe 5 | wie oben | `2,6,1,1,0,0,0,0` |

**Δ0 ist neu.** Eine Deckspalte hat dieselbe Oberkante wie ihre Vorgängerin: bei ungeradem t `slab[type=bottom]`, bei geradem t `slab[type=top]`. Den Rand des Decks kann eine niedrige Brüstung säumen: `<stein>_wall` mit natürlichen Zuständen; der Pfosten entfällt nur bei genau zwei gegenüberliegenden Verbindungen ([4]).

**Skizze E – Mansard o = 1, n = 6**, `1,3,6,1,1,0`, Schnitt Südhang. Legende: b/t = `deepslate_tile_slab[type=bottom|top]`, S = `deepslate_tile_stairs[facing=north,half=bottom]`, F = `deepslate_tiles`, K = Gesims `stone_brick_stairs[facing=north,half=top]` (volle Seite an der Wand).

```
y\d   +1  0 -1 -2 -3 -4
y5     .  .  .  b  t  t     <- Oberzone, dann Deck
y4     .  .  S  .  .  .
y3     .  .  F  .  .  .     <- Steilzone (Gaube hier: F -> Fenster)
y2     .  .  F  .  .  .
y1     .  S  .  .  .  .
y0     b  t  .  .  .  .
y-1    K  .  .  .  .  .     <- Gesims direkt vor der Wand (d=+1)
```

**Gaube im Mansard:** Die Front steht auf d = 0 (Fuß der Steilzone), Fenster bei y2–y3. Darauf sitzt ein Mini-Satteldach mit dem First senkrecht zur Traufe. Laut Wiki-Text fast Pflicht ([1]). **Einsatz:** MDT-Stadthaus und Bahnhof (Station), FAN-Villa. Größe: Breite ≥ 13. **Wirkung** mittel. **Aufwand** mittel (Δ0, Geschossersatz, Gauben auf Walm). **Quellen:** [1], [24], [25], [38], [4].

### T6 – Irimoya (Walm unten, Giebel oben)

**Beschreibung.** Irimoya ist „a hip roof that slopes down on all four sides and integrates a gable on two opposing sides“. Der Giebel sitzt über dem Kern (*moya*), der Walm deckt den Umgang (*hisashi*) ([18], [8]). Anders als der Krüppelwalm (de.wiki: nur der obere Teil des Giebels wird abgewalmt, [39]; Wikipedia „half-hip“ [28]) liegt hier der **Walm unten**. Gleichbedeutend sind „Dutch gable/gablet = a hipped roof with a small gable at the top“ ([1], [28]) und in OSM `hipped-and-gabled` ([7]).

**Korrektur an `daecher.md` §5:** Dort steht „Krüppelwalm / Dutch Gable: Lagen 0…m−1 als Walmringe, ab Lage m Satteldach“. Das ist das Dutch Gable bzw. Irimoya. Krüppelwalm ist die umgekehrte Form, die `half_hip` korrekt baut.

**Geometrie** (Ring- und Reihenindex, Variante „gestapelt“): a = Abstand zum Giebelende entlang des Firsts, c = Abstand zur Traufe quer. Walmband k = clamp(round(0,35 · n), 2, n − 2), Ortgangüberstand des Giebelteils og = 1.
- c < k: Index = min(a, c) (Walmring)
- c ≥ k und a ≥ k − og: Index = c (Giebelteil; bei a = k − og ist die Spalte Ortgang und Trim)
- sonst: Index = a (Walmfläche unter dem Ortgang, **gestapelt**, siehe T7)
- Giebeldreieck in der Ebene a = k (1 Block hinter dem Ortgang), von der Oberkante des Walmbands bis unter die Dachfläche. Die Engine erzeugt es als `skirt(rings = k)` plus `gable` auf dem um k geschrumpften Rechteck, das Giebeldreieck nutzt die vorhandene Giebelfüllung.

**Skizze F – Irimoya Draufsicht**, Außenmaß 11 × 9 (inkl. Überstand), First entlang x, n = 4, k = 2. Zahl = Index; V = Ortgangspalte des Giebelteils; darunter liegt gestapelt Walmring 1.

```
z\x  0  1  2  3  4  5  6  7  8  9 10
0    0  0  0  0  0  0  0  0  0  0  0
1    0  1  1  1  1  1  1  1  1  1  0
2    0 2V  2  2  2  2  2  2  2 2V  0
3    0 3V  3  3  3  3  3  3  3 3V  0
4    0 4V  4  4  4  4  4  4  4 4V  0     <- First (Index 4)
5..8 spiegelbildlich
```

**Skizze G – Irimoya Ansicht Ost** (Blick nach Westen, z = 0…8). Legende: H = Walmring `deepslate_tile_stairs[facing=west,half=bottom]` (von Osten gesehen die Stirn); Ring 0 als Trim `dark_oak_stairs[facing=west,half=bottom]`. V = Ortgangtreppe des Giebelteils (Nordhälfte `dark_oak_stairs[facing=south,half=bottom]`, Südhälfte `[facing=north,half=bottom]`). G = Giebeldreieck (Ebene a = 2) aus Rolle `infill`, z. B. `white_concrete` mit Rahmen aus `stripped_dark_oak_log`. r = First `deepslate_tiles` plus `deepslate_tile_slab[type=bottom]`.

```
y\z  0 1 2 3 4 5 6 7 8
y4   . . . . r . . . .
y3   . . . V G V . . .
y2   . . V G G G V . .
y1   . H H H H H H H .
y0   H H H H H H H H H
```

**Shikoro-Variante:** Der Giebelteil wird um +1 Block angehoben. Seine Traufe (c = k) „clearly end[s] like eaves, over-hanging the independently roofed hips“ ([10]). Siehe T7. **Einsatz:** JAP (Haupthaus, Tempel), CHE. Größe: n ≥ 4 (bei n = 3 ist das Walmband nicht lesbar). **Wirkung** hoch. **Aufwand** mittel (neuer Typ `irimoya` = zwei Abschnitte, braucht T7). **Quellen:** [1], [7], [8], [10], [18], [28], [39].

### T7 – Dach-über-Dach und gestapelte Spalten (Shikoro, Doppeltraufe, Unterteilung)

**Beschreibung.** Viele Profi-Formen legen zwei Dachflächen übereinander:
- Shikoro-buki ([10])
- chinesische Doppeltraufe, „an additional layer of eaves below the basic … rooftop“ ([18])
- Mokoshi ([11])
- Stabkirche: Das Dach „slopes down in two steps“ ([35])
- Vordach unter der Haupttraufe
- Schleppgaube mit eigener Traufe über der Hauptfläche
- „Unterteilung“: an Gebäudeabschnitten das Dach 1 Block höher setzen (de.wiki, `daecher.md` §3)
- „combining multiple roof sections at different heights“ ([44])
- Die tiefere Fläche wird untergeschoben: „much easier to tuck it over finished copper than the reverse“ ([51])

**Regel für die Engine:** Sektionen bekommen `stack: true`. Ihre Stücke werden zusätzlich zum Gewinner geschrieben, wenn sich die y-Intervalle [lowest, top] beider Spalten nicht überschneiden. Berühren ist erlaubt. Die Lücke dazwischen bleibt Luft (Schattenfuge). Die Untersicht der oberen Fläche bekommt das Brett bzw. die Konsole wie heute. **Mindestabstand** für eine lesbare Stufe: 1 Block Höhenversatz und 1 Block horizontaler Überstand (Einschätzung).

**Skizze H – Shikoro-Stufe im Schnitt** (Südhang, Walmband k = 3 Ringe, Giebelteil um +1 Block angehoben, eigener Traufüberstand 1). Legende: H = Walmband `deepslate_tile_stairs[facing=north,half=bottom]`, S = Giebelteil, gleiche Treppe; die oberste Reihe des Giebelteils optional als Trim `dark_oak_stairs[facing=north,half=bottom]`.

```
y\d   +2 +1  0 -1 -2
y5     .  .  .  .  S      <- Giebelteil
y4     .  .  .  S  .
y3     .  .  S  .  .      <- Traufe des Giebelteils, gestapelt
y2     .  .  H  .  .      <- oberster Walmring (dieselbe Spalte d=0!)
y1     .  H  .  .  .
y0     H  .  .  .  .
```

Lesart: Ohne Stufe läge d = −1 auf y3. Mit Stufe springt die Fläche bei d = 0 um einen ganzen Block. In Spalte d = 0 stehen H (y2) und S (y3) übereinander, deshalb braucht die Engine den Stapelmodus. Bei 2 Blöcken Überstand des Giebelteils entsteht zusätzlich eine echte Schattenfuge (Luft zwischen Walmband und oberer Traufe) mit Brett `dark_oak_stairs[facing=south,half=top]` unter der oberen Traufe. **Einsatz:** JAP und CHE (Shikoro, Mokoshi), NOR (Stabkirchen-Staffel), MED und RUS (Abschnitt um 1 höher, angebaute Flügel). **Wirkung** hoch. **Aufwand** mittel (Engine-Änderung in `buildRoofs`). **Quellen:** [10], [11], [18], [35], [44], [51].

### T8 – Aufgebogene Ecken (Nokizori: Naginata- und Shin-Kurve)

**Beschreibung.** *Nokizori* ist die Krümmung der Traufe. Bei *shinzori* krümmt sich die Traufe „from the center to the corners“, bei *naginatazori* ist sie „straight at the center but abruptly curved up at each end“ ([9]). Hōryū-ji hat „roofs curved in the corners“ ([22]). Builder-Rezepte:
- „Run the eave as upside-down stairs, then at each corner place one extra stair turned to point outward and up, with a slab or fence end above it“; dazu „Keep the main roof pitch shallow, one block of rise per two or three out, so the corners stand out“ ([42]).
- „1-2 … blocks raised at each corner of the roof's edge, with stairs angled outward“ ([47]).
- Bei [48] gibt es „upturned tip-blocks“, bei [46] „raised tip-blocks (the kawara endings)“.

**Hebungstabelle Naginata** (in hb, auf die normalen Δ1-Ringe der Krempe; c = Abstand zur Ecke entlang der Traufe, r = Ring von außen):

| | c=0 | c=1 | c=2 | c≥3 |
|---|---|---|---|---|
| r=0 (Traufring) | +3 (Horn) | +2 | +1 | 0 |
| r=1 | +2 | +1 | 0 | 0 |
| r≥2 (Treppenringe) | 0 | 0 | 0 | 0 |

**Shinzori:** Hebung(c) = min(3, floor((L/2 − c) / m)) hb mit m = max(2, floor(L/6)). L ist die Trauflänge, gemessen von der Mitte zur Ecke. Treppenringe werden nur in ganzen Blöcken gehoben (Parität).

**Stücke je Hebung** (Traufring normal = `slab[type=bottom]` bei y = e):

| Hebung | Stücke |
|---|---|
| 0 | `slab[type=bottom]` bei e |
| +1 | `slab[type=top]` bei e |
| +2 | `slab[type=top]` bei e plus `slab[type=bottom]` bei e+1 |
| +3 | Vollblock bei e plus `stairs[facing=<außen entlang der längeren Traufe>,half=bottom]` bei e+1 (Horn, hohe Hälfte außen) |

Option nach [42]: das Horn 1 Block weiter außen entlang der Längsachse (orthogonal angrenzend, keine Diagonale). Unter dem Vollblock darf `lantern[hanging=true]` hängen (volle Unterseite). Unter einer oberen Stufe ist eine Laterne nach Spiellogik nicht gültig (Einschätzung), und ungültige Laternen brechen beim Nachbar-Update ab ([5]).

**Skizze I – SW-Ecke, Ansicht Süd**, Traufring r = 0 auf d = +2, x = 0 ist die Ecke. Legende: W = `deepslate_tile_stairs[facing=west,half=bottom,shape=straight]`, F = `deepslate_tiles`, t/b = `deepslate_tile_slab[type=top|bottom]`, L = `lantern[hanging=true]`.

```
y\x    0  1  2  3  4  5
e+1    W  b  .  .  .  .
e      F  t  t  b  b  b
e-1    L  .  .  .  .  .
```

Nachbarn des Horns auf e+1 sind Stufen, keine Treppen. Der Auflöser lässt es deshalb `straight`. **Einsatz:** JAP, CHE (alle Walm-, Irimoya- und Pagodenringe), optional FAN (Hexenhaus). Ab Trauflänge 7. **Wirkung** hoch. **Aufwand** mittel (Hebungs-Overlay in `sectionColumns` für Δ1-Ringe). **Quellen:** [5], [9], [22], [42], [46], [47], [48].

### T9 – Mokoshi und Pagode (Teigen, Finial)

**Beschreibung.** *Mokoshi* ist „a pent roof enclosure usually one bay deep“ an einer bis vier Seiten. Das Gebäude sieht dadurch zweigeschossig aus, obwohl es das nicht ist ([11]). Am Kondō von Hōryū-ji wurde ein solches Untergeschoss-Dach später ergänzt ([22]). Pagoden haben „an odd number of stories, normally comprised between three and thirteen“ ([20], [21]). „The more difference in length (… *teigen* …) between stories, the more solid … the pagoda seems“, und „the edge of a pagoda's eaves forms a straight line, with each following edge being shorter“ ([20]). Builder-Regeln:
- „Stack tiers smaller than the one below, each raised two or three blocks, and cap the top tier with an end rod or lightning rod as a finial … Drop each tier by at least two blocks per side“; Minimum „7x7 footprint with two roof tiers“ ([42]).
- „A flat-topped pagoda doesn't read as a religious building; the finial is the explicit Buddhist signal“ ([48]).
- Achtung: [48] nennt eine „Waxed Exposed Copper Wall“. Kupfermauern gibt es in 1.21.11 nicht (`daecher.md` §6). Das ist ein Versionsfehler der Quelle.

**Pagoden-Regel** (Einschätzung, aus [20] und [42]):
- Geschosse g ∈ {3, 5}.
- Wandeinzug je Geschoss i = 1 (kleine Pagode) oder 2 (ab Basis ≥ 11).
- Konstanter Überstand o = 2. Die Traufspitzen liegen damit auf einer Geraden.
- Geschosshöhe zwischen den Traufen 3–4.
- Jedes Zwischendach ist `skirt(rings = o + 1)` mit Sori-Krempe und T8-Ecken.
- Oben sitzt eine Pyramide (*hougyou*: „no ridge … hip rafters … extend directly upward to form a peak“ mit Juwel-Aufsatz, [15]).
- Finial (Sōrin, unten nach oben): `polished_blackstone_wall`, `iron_chain[axis=y]` × 2–4, `lightning_rod[facing=up]` oder `end_rod[facing=up]`. Höhe ≈ 1/4 der Dachstapelhöhe. Alte Pagoden haben größere Finials ([20]).

| Geschoss | Wand (Basis 7) | Traufe (o = 2) | Ringe |
|---|---|---|---|
| 1 | 7 × 7 | 11 × 11 | 3 |
| 2 | 5 × 5 | 9 × 9 | 3 |
| 3 (Dach) | 3 × 3 | 7 × 7 | Pyramide + Finial |

**Skizze J – Mokoshi/Zwischendach im Schnitt** (Südwand, y relativ zur Geschossoberkante). Legende: W = Wand (Rolle `wall` bzw. `upperWall`), S = `dark_oak_stairs[facing=north,half=bottom]`, t/b = `dark_oak_slab[type=top|bottom]`, K = Konsole `dark_oak_stairs[facing=north,half=top]`.

```
y\d   -1  0 +1 +2
y2     .  W  .  .      <- Obergeschoss (bei Pagode: d=-1, eingezogen)
y1     .  W  S  .
y0     .  W  t  b      <- Schürze: Profil 1,3 (Ring 0 Stufe, Ring 1 obere Stufe + Treppe)
y-1    .  W  K  .      <- Konsole unter Ring 1 (heute für skirt abgeschaltet, roofEngine.ts:360)
y-2    .  W  .  .
```

**Einsatz:** JAP und CHE (Mokoshi am Erdgeschoss von Tempel und Haus, Pagode als Turmvariante), Bahnhofsdach JAP. **Wirkung** hoch. **Aufwand** mittel (Skirt im Plan erzeugen, Untersicht für Skirt erlauben, Stapelmodus). **Quellen:** [11], [15], [20], [21], [22], [42], [48].

### T10 – First: Enden, Finials, Pendants, Onigawara

**Beschreibung.** Ein Ortgangbrett hat am Scheitel traditionell „carved or molded finials and pendant decorations“ ([31]). Japanische Firste enden mit *onigawara*, „decorative roof tiles found at the ends of a main ridge or descending ridge“ ([14]). Builder setzen „fence-post finials at roof peaks“ ([45]).

Rezepte (Einschätzung, Block-Logik geprüft):
- **Westliches Finial** (MED, RUS, NOR, FAN): auf das letzte Firststück jedes Giebels `<holz>_fence`, darauf `lightning_rod[facing=up]` (MED, NOR) oder `end_rod[facing=up]` (FAN). Bei Steinfirst `<stein>_wall` (Pfosten, `up=true`, natürlicher Zustand).
- **Pendant:** 1–2 × `<holz>_fence` unter dem Ortgangbrett am Scheitel (d = +1 vor der Giebelfläche). Zäune brauchen keinen Halt, Laternen können darunter hängen.
- **Onigawara** (JAP, CHE): Das letzte Firststück wird 1 Block erhöht (Firstmaterial). Davor, nach außen hin, sitzt eine Kopfüber-Treppe `<first>_stairs[facing=<zur Firstmitte>,half=top]`, deren volle Seite das Ende abschließt. Optional auch an den Gratenden (*descending ridges*). Firstlänge: endet bündig mit der Ortgangspalte, nicht darüber hinaus.
- **Firstlänge westlich:** wie heute, aber nur bei Finial-Ende. Ohne Finial endet der First bündig mit der Ortgangtreppe.

**Skizze K – Ansicht West, Scheitel eines MED-Giebels.** Legende: R = Firstblock `deepslate_tiles`, s = `deepslate_tile_slab[type=bottom]`, Z = `spruce_fence`, B = Blitzableiter `lightning_rod[facing=up]`, V = Ortgang `stone_brick_stairs` (N: `facing=south`, S: `facing=north`), P = Pendant `spruce_fence` (d = +1), G = Giebelfüllung.

```
y\z   3  4  5
y+2   .  B  .
y+1   .  Z  .      <- Z ersetzt am Firstende die Firststufe s (ein Zaun auf einer unteren Stufe stuende 0,5 hoch frei)
y     .  R  .
y-1   V  G  V
y-2   G  P  G
```

**Wirkung** mittel. **Aufwand** niedrig. Stile: alle außer MOD (MDT: höchstens ein Kugel-Aufsatz, Einschätzung). **Quellen:** [14], [31], [45].

### T11 – Grat- und Kehllinien

**Beschreibung.** Chinesische Hallendächer bestehen aus „one horizontal ridge … connected to four vertical ridges and four diagonal ridges“ ([18]). Grate sind also eigene Bauteile. Builder-Tipp: „Add ridges or hip rafters for a professional, finished look“ ([53]). Das Kehl-Rezept aus dem L-Haus: „the valley with slabs first, then bring the stairs in from both sides“ ([50]). Weitere Hinweise: Moos an „lower edges and corners of the roof“ ([49]) und Moos „along the seams where different copper shades meet“ ([51]).

**Regeln:**
- **Grat:** Zellen mit dx = dz in Walm-, Pyramiden-, Mansard-, Skirt- und Irimoya-Ringen ab r ≥ 1 aus Rolle `ridge` (sonst `roofTrim`). Nur das Material ändert sich, die Form (`outer_*`) setzt der Auflöser.
- **Kehle:** Zellen, an denen der Gewinner die Sektion wechselt und der Auflöser `inner_*` setzt. Optional ein dunkleres oder bemoostes Schwestermaterial, Wahrscheinlichkeit 0,5 je Zelle (Einschätzung).

**Skizze L – Draufsicht NW-Ecke eines Walmdachs** (Lage 0–3). Legende: T = Traufring (Trim), g = Gratzelle `deepslate_tile_stairs` → als Gratmaterial `polished_deepslate_stairs`, gleiche facing und shape wie die Ringtreppe (Auflöser → `outer_left` bzw. `outer_right`), r = normale Ringtreppe.

```
z\x  0 1 2 3 4 5
0    T T T T T T
1    T g r r r r
2    T r g r r r
3    T r r g r r
```

**Wirkung** mittel (Walm- und Pyramidendächer wirken nicht mehr wie gestufte Zikkurats; vgl. `haus-mediterran-*.jpg`). **Aufwand** niedrig. Stile: alle mit Walm. **Quellen:** [18], [49], [50], [51], [53].

### T12 – Ortgang: Brett, Aufkantung, Falltür-Brett, Treppengiebel

**Beschreibung.** Ein Ortgangbrett verdeckt „the otherwise exposed end grain“ ([31]). Ein Treppengiebel ist „a stairstep type of design at the top of the triangular gable-end“. Die Brüstung „projects above the roofline“, und die Deckung reicht nicht bis zum Giebelende ([32]). In Flandern sind die Stufen kleiner und zahlreicher, in Norddeutschland größer.

Varianten (als Daten `vergeStyle`):

| Variante | Blöcke/Zustände | Wann |
|---|---|---|
| `board` (heute) | Kopfüber-Treppen unter dem Ortgang | Standard |
| `raised` (Aufkantung, Einschätzung) | Ortgangspalte (nur die äußerste): Trim-Vollblock auf Höhe y, Trim-Treppe auf y+1, also 1 über der Fläche | MED, NOR, FAN: rahmt das Dach |
| `trapdoor` | `<holz>_trapdoor[facing=<außen>,half=bottom,open=true]` auf d = +1 vor jeder Ortgangtreppe. Offene Falltür: Platte auf der Seite gegenüber `facing` ([3]), am Westgiebel also `facing=west`, Platte liegt östlich an der Treppe. Braucht keinen Halt ([3]) | RUS, NOR, JAP |
| `parapet` | Giebelwand 1 Block über die Dachlinie, Abdeckung `<stein>_slab[type=bottom]`; Ortgangüberstand 0 | MDT, MED-Stein |
| `crowstep` | Brüstung in Stufen 2 breit × 2 hoch (flämisch: 1 × 1), jede Stufe mit `<stein>_slab[type=bottom]`, Spitze `<stein>_wall` | MED-Ziegel, NOR-Hafen, Weihnachtsmarkt |

**Skizze M – Aufkantung, Ansicht West**, Spannweite 9, Überstand 1, z = −1…9. Legende: V = Trim-Treppe `stone_brick_stairs` (N-Hälfte `facing=south`, S-Hälfte `facing=north`, `half=bottom`) auf Höhe Fläche + 1, A = Trim-Vollblock `stone_bricks`, G = Giebelfüllung (Wandebene, 1 hinter dem Ortgang), R = First.

```
y\z  -1  0  1  2  3  4  5  6  7  8  9
y6    .  .  .  .  .  R  .  .  .  .  .
y5    .  .  .  .  V  A  V  .  .  .  .
y4    .  .  .  V  A  G  A  V  .  .  .
y3    .  .  V  A  G  G  G  A  V  .  .
y2    .  V  A  G  G  G  G  G  A  V  .
y1    V  A  G  G  G  G  G  G  G  A  V
y0    A  .  .  .  .  .  .  .  .  .  A
```

**Skizze N – Treppengiebel (2 × 2), Ansicht West**, Wandbreite 11 (z = 0…10), Dach 45° dahinter (Oberkante an Spalte z: 1, 2, 3, 4, 5, First 6). Die Brüstung liegt überall ≥ 1 über der Dachoberkante. Legende: B = `bricks`, c = `brick_slab[type=bottom]`, P = `brick_wall` (Pfosten, natürliche Zustände).

```
y\z  0 1 2 3 4 5 6 7 8 9 10
y8   . . . . . P . . . . .
y7   . . . . c c c . . . .
y6   . . . . B B B . . . .
y5   . . c c B B B c c . .
y4   . . B B B B B B B . .
y3   c c B B B B B B B c c
y2   B B B B B B B B B B B
y1   B B B B B B B B B B B
y0   B B B B B B B B B B B   <- Wandkrone
```

**Wirkung** mittel (Treppengiebel hoch bei Ziegelbauten). **Aufwand** niedrig bis mittel. **Quellen:** [3], [4], [31], [32].

### T13 – Gauben (Giebel, Walm, Schlepp, Fledermaus) und Zwerchhaus

**Beschreibung.** Gaubentypen nach [29]:
- Giebel- bzw. „dog-house“-Gaube (am häufigsten)
- Walmgaube (drei Flächen)
- Schleppgaube: „sloped in the same direction as the principal roof, only at a shallower angle“
- Fledermaus- bzw. Augenbrauengaube: „low and wide … no sides … flattened bell curve“
- Wandgaube: „continuation of the wall above the level of the eaves“
- Nantucket: zwei Giebelgauben, verbunden durch eine Schleppgaube

Der japanische *chidori-hafu* ist eine rein dekorative Dreiecksgaube ohne Fenster ([12]). Ein **Zwerchhaus** steht dagegen „in alignment with the building's exterior wall“, und sein First „does not extend all the way to the main roof ridge“. Barocke Proportion: Höhe = 150 % der Breite ([37]). Die **Gaube** sitzt hinter der Außenwand auf den Sparren ([41]).

**Regeln** (Einschätzung, außer wo zitiert):
- Gaubenachsen liegen auf Fensterachsen der Fassade, höchstens eine Gaube je zwei Fensterachsen.
- Abstand ≥ 2 Blöcke zum Ortgang bzw. Grat (gemessen am Gaubenfuß).
- Gaubenfirst ≤ Hauptfirst − 2.
- Gesamtbreite aller Gauben ≤ 1/2 der Trauflänge.
- Front bei d = −1 oder −2 (Gaube) bzw. d = 0 (Zwerchhaus, Wandgaube).
- Breite 3 (1 Fenster) oder 5 (2 Fenster bzw. Fenster mit Läden).
- Giebelgauben haben die Neigung des Hauptdachs. Schleppgauben sind flacher (P27 auf P45, P34 auf P63).
- Auf Walm- und Mansarddächern Walmgauben bzw. Giebelgauben. Auf langen Dächern (≥ 15) Schleppgauben oder Nantucket.
- Zwerchhaus: Breite ≈ 1/3 der Fassade, ungerade, Giebelhöhe über der Traufe ≈ 1,5 × Breite, gekappt durch die Firstregel.

**Skizze O – Schleppgaube im Schnitt** (Gaubenmitte, Hauptdach P45). Legende: S = `spruce_stairs[facing=north,half=bottom]` (Hauptfläche), U = Brüstung (Rolle `upperWall`), G = `glass_pane` (natürliche Verbindungen), B = Sturz `stripped_spruce_log[axis=x]`, b/t = `spruce_slab[type=bottom|top]` (Gaubendach P27; d = −1 ist die Gaubentraufe, gestapelt über S, braucht T7).

```
y\d  +1  0 -1 -2 -3 -4 -5 -6 -7
y8    .  .  .  .  .  .  b  t  S
y7    .  .  .  .  b  t  .  .  .
y6    .  .  b  t  .  .  .  .  .
y5    .  .  .  B  .  .  .  .  .
y4    .  .  .  G  .  .  .  .  .
y3    .  .  .  U  .  .  .  .  .
y2    .  .  S  .  .  .  .  .  .
y1    .  S  .  .  .  .  .  .  .
y0    S  .  .  .  .  .  .  .  .
```

Die Wangen links und rechts füllen bis unter das Gaubendach (Rolle `upperWall`, Eckpfosten aus `frame`). Die Hauptdachtreppen innerhalb der Gaubenbreite (d = −2…−6) entfallen.

**Skizze P – Zwerchhaus, Ansicht Nord** (Front bündig mit der Fassade, Breite 5, x = 3…9, y über der Haupttraufe). Legende: L = Eckpfosten `spruce_log[axis=y]`, W = `upperWall`, P = `glass_pane`, Q = Sturz `stripped_spruce_log[axis=x]`, V = Ortgang `spruce_stairs` (W-Seite `facing=east`, O-Seite `facing=west`), G = Giebelfüllung, r = First (≥ 2 unter dem Hauptfirst).

```
y\x  3  4  5  6  7  8  9
y6   .  .  .  r  .  .  .
y5   .  .  V  G  V  .  .
y4   .  V  G  G  G  V  .
y3   V  Q  Q  Q  Q  Q  V
y2   .  L  W  P  W  L  .
y1   .  L  W  P  W  L  .
```

**Einsatz:** alle geneigten Dächer; Zwerchhaus MED, RUS, FAN; Gauben MED, NOR, MDT (Mansard), RUS; chidori-hafu JAP-Burg (nur Deko). **Wirkung** hoch bei großen Dächern. **Aufwand** mittel. **Quellen:** [12], [29], [37], [41], [44].

### T14 – Verwitterung und Texturbrüche auf großen Flächen

**Beschreibung.** Builder empfehlen:
- „Moss Blocks and Azalea Leaves … to the lower edges and corners of the roof“, wo sich Wasser und Schmutz sammeln ([49])
- Materialien „alternating“ für „varied dark red shades“ ([49])
- einen Flügel in anderem Material, damit es aussieht, als sei angebaut worden ([51])
- „mix in cracked stone brick, andesite … so the texture has noise“, aber nicht zu viele Sorten ([44])
- Paletten und Helligkeitsabstände: siehe Thema Paletten/Texturen.

**Regeln** (Einschätzung): Wahrscheinlichkeit p für ein Schwestermaterial gleicher Form (Treppe/Stufe/Block):

| Zone | p |
|---|---|
| Traufring r ≤ 1 | 0,25 |
| Flächenmitte | 0,07 |
| oberste 2 Reihen | 0 |
| Kehlzellen ± 1 | 0,4 (bemoost) |

Varianten nicht als Salz-und-Pfeffer streuen, sondern als **Streifen in Fallrichtung**: dieselbe Wahl für 2–4 aufeinanderfolgende Spalten derselben Fallinie. Das sieht aus wie Regenspuren.

Schwesterpaare (alle mit Treppe und Stufe in 1.21.11):
- `deepslate_tile` ↔ `cobbled_deepslate` ↔ `deepslate_brick` ↔ `polished_deepslate`
- `stone_brick` ↔ `mossy_stone_brick` ↔ `cobblestone` ↔ `mossy_cobblestone`
- `spruce` ↔ `dark_oak`
- `waxed_weathered_cut_copper` ↔ `waxed_oxidized_cut_copper`
- `brick` ↔ `granite` (Tonziegel-Eindruck laut `daecher.md` §6)

`moss_carpet` nur auf Vollblöcken und Stufen der Krempe (Δ1-Zonen). `netherrack` aus [49] ist **nicht in Registry**.

**Skizze Q – Maske Südhang, 9 Spalten × 7 Reihen.** Legende: x = Schwestermaterial, m = bemoost (`mossy_*`), . = Grundmaterial; Reihe 0 = Traufe; Kehle rechts.

```
Reihe\x  0 1 2 3 4 5 6 7 8
6        . . . . . . . . .
5        . . . . . . . . .
4        . . x . . . . m m
3        . . x . . . . . m
2        . . x . . x . . m
1        m . x . m x . m m
0        m m . m m x . m m
```

**Wirkung** mittel bis hoch bei Flächen über 120 Zellen. **Aufwand** niedrig. Stile: alle außer MOD. **Quellen:** [44], [49], [51].

### T15 – Turmanschluss

**Beschreibung.** In den abgerufenen Quellen fand ich keine Blockregel dafür, alles Folgende ist **Einschätzung**, abgeleitet aus `daecher.md` §7 („Turm mindestens 1 Geschoss höher als die Hauptfirsthöhe“) und der Wiki-Regel, Dachhöhen über Neigung oder Brüstung anzupassen ([2]). Rundturm-Geometrie siehe `kreise_boegen_tuerme.md` §5.

**Regeln:**
- Turmtraufe ≥ Hauptfirst + 2. Daraus folgt `towerFloors = mainFloors + ceil((mainRise + 2) / floorHeight)`.
- Hauptdach und Turmdach berühren sich nie. Die Dachfläche läuft gegen die Turmwand.
- An der Turmwand läuft ein **Anschlussband** einmal rundum, und zwar auf Höhe der höchsten Berührung (First oder Kehle) + 1. Es besteht aus `<sockel>_stairs[half=top,facing=<zur Turmwand>]` bzw. bei Rundtürmen aus Stufen.
- Trifft eine Traufe auf den Turm, endet sie 1 Block vor der Wand mit einer Ortgangtreppe, damit kein schräger Stumpf in den Kreis schneidet.

**Skizze R – Schnitt, Hauptdach (Südhang) gegen eckigen Turm** (Turmwand bei x = 6). Legende: S = `spruce_stairs[facing=north,half=bottom]`, T = Turmwand, K = `stone_brick_stairs[facing=east,half=top]` (volle Seite an der Turmwand), r = Hauptfirst.

```
y\x   2  3  4  5  6
y6    .  .  .  K  T
y5    .  .  .  r  T
y4    .  .  S  .  T
y3    .  S  .  .  T
```

**Wirkung** mittel. **Aufwand** niedrig. Stile: MED, FAN, NOR. **Quellen:** [2], `daecher.md` §7.

---

## Kombinationen bei L-, T- und U-Grundrissen

Der Grundansatz der Engine stimmt: Das Maximum der Höhenfelder ergibt Kehlen und Grate. Ein Walmdach über einem Polygon ist das „straight skeleton“ ([36]). Bei rechtwinkligen Rechteckvereinigungen kommt das Maximum der Rechteck-Walmfelder dem nahe (Einschätzung). Was fehlt, sind Regeln zur **Unterordnung** und zum **Stapeln**:

1. **Eine Neigungsstufe pro Haus** (T1), aus dem Hauptkörper bestimmt und auf Flügel, Zwerchhaus, Gauben (Giebelgauben) und Anbau übertragen. Ausnahmen: Schleppgaube und Pultanbau flacher, Turm steiler.
2. **Firsthöhen:** Flügelfirst = Hauptfirst (exakt, T-Stoß) **oder** ≤ Hauptfirst − 1. Ein Unterschied von 0,5 (Stufenfirst gegen Blockfirst) ist verboten (Einschätzung). Bevorzugt liegt der Flügel ein Geschoss tiefer ([51]). Zwerchhausfirst ≤ Hauptfirst − 2 ([37]). Turmtraufe ≥ Hauptfirst + 2 (T15).
3. **Flügelbreite:** ≤ Tiefe des Hauptkörpers − 2. Dann ergibt die Neigung automatisch einen tieferen First. Gleiche Breite nur, wenn beide Firste gleich hoch sein sollen (Eck- oder Kreuzhaus).
4. **Reihenfolge und Stapeln:** Das höchste Dach zuerst bauen, die tieferen anpassen und Blöcke in der V-Kehle entfernen (Wiki, `daecher.md` §5). Ist der Flügel ein Geschoss tiefer, wird das Hauptdach **über** das Flügeldach geschoben ([51]): Die Haupttraufe kragt 1 Block über die Flügelfläche (T7).
5. **L-Haus:** Kehle aus `inner_*`-Treppen. Beide Flügel gleichzeitig planen, denn „Most roof errors on L shaped houses come from finishing one wing before starting the other“ ([50]). In der Kehle optional Moos (T11).
6. **T-Haus:** Der Flügel stößt mittig an. Sein First endet an der Hauptdachfläche (mit Max-Union automatisch). Am Stoß sitzt ein Firstende ohne Finial.
7. **U-Haus:** Zwischen den beiden inneren Kehlen müssen ≥ 3 Blöcke Hauptdach bleiben, sonst wirkt die Rückseite zerhackt (Einschätzung). Andernfalls rücken die Flügel nach außen oder es entsteht ein Walm zum Hof.
8. **Mischformen:** Hauptwalm plus Flügelwalm (MDT). Hauptsattel plus Flügelsattel (MED, RUS). JAP: Irimoya-Haupthaus plus Flügel als Kirizuma oder Yosemune, Flügel immer tiefer. Gambrel- oder Mansardflügel nie an ein Satteldach stoßen lassen. Stattdessen bekommt der Flügel ein Satteldach mit derselben unteren Neigung (Einschätzung).
9. **Anbau mit Pultdach:** Bleibt wie heute (`plan.ts:276–303`), aber mit Stapelmodus, damit die Haupttraufe über dem Pultfirst liegt.

**Skizze S – T-Stoß, Draufsicht** (Hauptdach First entlang x bei z = 4, Flügel First entlang z bei x = 6, 1 Block tiefer). Zahl = Oberkante in Blöcken über der Traufe; v = Kehlzelle (`inner_*`), F = Hauptfirst, f = Flügelfirst.

```
z\x  2 3 4 5 6 7 8 9 10
4    F F F F F F F F F
5    3 3 3 3 3 3 3 3 3
6    2 2 2 v f v 2 2 2
7    1 1 v 2 f 2 v 1 1
8    0 v 1 2 f 2 1 v 0
9    . 0 1 2 f 2 1 0 .
10   . 0 1 2 f 2 1 0 .
```

(Vereinfacht: Der Flügelfirst f liegt auf 3 und trifft die Hauptfläche dort, wo sie ebenfalls 3 ist. Ab da endet er. Die Kehlzellen setzt der Auflöser.)

---

## Überstand, Firsthöhen und Neigung je Stil

Quellen: Stilneigungen griechisch 12,5–16°, römisch 24–34°, „common“ ≈ 48°, gotisch 60° ([27]); kälter = steiler ([40]); Chalet mit breiter Traufe ([33]); Schwarzwald-Walm bis zum Erdgeschoss ([34]); JAP-Traufen „far beyond the walls“, Dach ≈ halbe Bauhöhe ([19]); Minka-Formen ([23]); MED-Dächer „as tall as the walls“ ([43], [45]); Überstand 1–2 ([44]).

| Stil | Formen (Vorschlag Priors) | Neigung / Profil | Dachhöhe ≈ | Traufe o | Ortgang | First / Ende |
|---|---|---|---|---|---|---|
| MED | gable .45, half_hip .25, Zwerchhaus, hip .1, gambrel .1 (Scheune) | P53–P63, Kick optional | 0,9 × Wand | 1 (+ Jetty) | 1, `raised` oder `board` | block_slab + Finial; Ziegel: `crowstep` |
| FAN | gable/bell .4, half_hip .2, hip .15, gambrel (konvex) .1, Turmhelm | Glocke (T2) oder P63 + Kick | 1,0 × Wand | 1–2 | 1–2, `raised` | end_rod-Finial, Pendant |
| RUS | gable .55, saltbox .2 (Catslide [30]), half_hip .15, gambrel .1 | P45, groß P37/P34 | 0,7 × Wand | 1–2 | 1, `trapdoor` | slab; Finial Zaun |
| NOR | gable .75 (steil), a_frame .1, half_hip .15 | P56–P63, Kick | 0,9–1,0 × Wand | 2 | 2, nur äußerste Spalte Trim, `raised` | log; Giebelkreuz (`daecher.md` §2 „Wikingergiebel“) |
| JAP | irimoya .45, hip (yosemune) .25, gable (kirizuma) .15, pyramid (hougyou) .05, pagoda auf Wunsch | Sori (T2) + Naginata-Ecken (T8) | 1,0 × Wand (Tempel), 0,8 (Haus) | 2–3 | 1 (Giebelteil) | block_slab + Onigawara |
| CHE | irimoya .35, gable mit Mukuri .35, hip .3 | Sori oder Mukuri, Shin-Kurve | 0,8 × Wand | 2 | 1 | wie JAP, heller |
| MOD | flat .6, shed .3, low gable .1 | 0° / P27 | 0,1–0,2 | 0 oder Kragplatte 2–3 | 0 | Attika |
| MDT | hip .6, gable .3, flat .1 | P27–P34 (römisch) | 0,4 × Wand | 1 + Gesims | 0–1, `parapet` | kurzer First, Grat in `ridge` |

**Überstand nach Größe** (Einschätzung; Basis 1 Block nach [44] und `daecher.md` §3): Die Spannweite s ist von Wand zu Wand quer zum First gemessen.

| Stil | s ≤ 9 | 11 ≤ s ≤ 15 | s ≥ 17 |
|---|---|---|---|
| MED | 1 | 1 | 1 |
| JAP | 2 | 3 | 3 |
| NOR | 2 | 2 | 3 |
| übrige | 1 | 2 | 2 |

Bei JAP kommt +1 Eckauskragung hinzu (Horn, T8). Am Ortgang gilt derselbe Überstand wie an der Traufe (de.wiki, `daecher.md` §3). Ausnahmen: `parapet`/`crowstep` (0), Irimoya-Giebelteil (1), Mansard (0–1).

**Firsthöhen variieren:** innerhalb eines Hauses nach der Unterordnungsregel oben; zwischen Häusern eines Ensembles ±1–2 Blöcke (`daecher.md` §7). Ein Abschnittssprung um +1 Block an Gebäudefugen gliedert lange Dächer (de.wiki „Unterteilung“, `daecher.md` §3).

---

## Sehr große Dachflächen

Ab etwa 15 × 15 wirkt ein einfaches Dach „increasingly strange (or, at best, barnlike)“ ([2]). Mansarddächer brauchen Gauben fürs Licht ([56]). GDMC-Juroren fragen, ob es „any jarring features“ gibt und ob die Variation angemessen ist ([54]). Generierte Siedlungen „do not pass as human-made yet“, auch weil sich Gebäude zu wenig unterscheiden ([55]).

Regeln für den Generator (Einschätzung, außer wo zitiert):

| Auslöser | Maßnahme | Daten |
|---|---|---|
| Trauflänge ≥ 15 ohne Gaube oder Zwerchhaus | 1 Zwerchhaus mittig oder 2–3 Gauben auf Fensterachsen | `dormerCount = floor((L − 4) / 6)` |
| Trauflänge ≥ 21 | zusätzlich Firstsprung +1 an einer Wandfuge (Abschnitt) oder Querflügel | `ridgeStep` |
| Dachfläche > 120 Zellen | Verwitterungsmaske T14 | p-Tabelle |
| Spannweite > 13 bei Satteldach | Walm (heute `plan.ts:188`), Krüppelwalm, Gambrel oder Mansard (≥ 13 breit) | vorhanden, erweitern |
| Halle, Bahnhof, Markthalle | Laterne bzw. Monitor-Aufbau entlang des Firsts („protruding secondary roof … parallel to the main roof“) mit Fensterband | `monitor` |
| Kamin vorhanden | durch die Fläche nahe dem First statt am Giebel, wenn Walm (heute schon für Walm) | vorhanden |
| JAP-Großbau | Mokoshi rundum am Erdgeschoss, Irimoya oben | T6, T9 |

Monitor-Definition aus dem Wiki-Glossar: „A protuding secondary roof, running along the roof ridge parallel to the main roof“ ([59]).

---

## Billig oder professionell?

**Billig wirkt ein Dach, wenn …** (Belege in Klammern)
- es aus einem Material besteht, keinen Rand hat und mit einer flachen Stufenreihe abschließt (`daecher.md` §3, [44])
- die Neigung innerhalb einer Fläche ungewollt wechselt (S1) oder Flügel andere Neigungen haben (S3)
- es für den Stil zu flach ist: „A shallow roof looks modern“ ([43]), „a flat or shallow roof kills the look“ ([45])
- es auf der Wand „klebt“: kein Überstand, Traufe auf Höhe der Wandkrone statt daneben (`daecher.md` §2, Variante B)
- die Sägezahn-Treppenkanten am Giebel offen liegen (kein Brett, keine Falltüren, keine Aufkantung)
- Walmgrate als gestufte Pyramide erscheinen, ohne Gratlinie (T11; `haus-mediterran-*.jpg`)
- eine große Fläche ungegliedert bleibt (`haus-nordisch-gross-*.jpg`)
- eine japanische Traufe gerade ist: „generic pyramid roof“ ([47])
- die zweite Pagodenstufe fast so groß ist wie die erste: „flattens the pagoda silhouette“ ([42])
- es Löcher oder Lichtspalten unter Ortgang und Gauben hat (S6, S11)

**Professionell wirkt ein Dach, wenn …**
- es dominant ist (1–2 Geschosse, JAP etwa die halbe Bauhöhe; [2], [19], [46]) und eine durchgehende Neigung hat
- der Rand Kontrast und Tiefe hat: Trim, Brett oder Aufkantung, Untersicht mit Konsolen ([31], `daecher.md` §3)
- Profil und Kick stimmen: Aufschiebling ([38]), japanische Sori- und Naginata-Ecken ([9], [42])
- Anbauten untergeordnet und untergeschoben sind ([51])
- Grate, Kehlen und Firstenden bewusst gestaltet sind ([14], [31], [53])
- Gauben und Zwerchhaus auf der Fassadenachse sitzen ([37]) und die Fläche Patina zeigt ([49])

---

## Fehler, die Profis vermeiden

1. **Profil oben abschneiden**, um eine Höhengrenze einzuhalten (statt Neigungsstufe oder Form zu wechseln).
2. **Δ-Sprünge über zwei Stufen** (1 → 4) außerhalb eines gewollten Knicks (Gambrel, Mansard). Ebenso nicht monotone Kurven.
3. **Ungerade Anzahl Δ1 vor einer Treppe** ohne Δ3-Ausgleich. Der Spaltenalgorithmus wirft dann Fehler oder verschiebt die Parität (`profiles.ts:124`).
4. **Krüppelwalm mit Irimoya verwechseln** (Korrektur an `daecher.md` §5).
5. **Mansard mit Überstand und ohne Gauben.** Mansard „normally does not“ overhang ([25]), Gauben sind die Regel ([24]).
6. **Gambrel mit drei gleichmäßig verteilten Neigungen.** Wer einen Scheunenknick will, braucht zwei Neigungen plus Balken ([1], [26]).
7. **Flügel mit gleicher Firsthöhe ± ½ Block** → zerknautschte Firstkreuzung ([51]).
8. **Alle Überstandsspalten in Trim** → schwerer Rahmen bei o ≥ 2 (S7).
9. **Laternen unter oberen Stufen oder in der Luft** → brechen beim WorldEdit-Nachbar-Update ([5]). Unter Vollblock, unterer Stufe, `half=bottom`-Treppe, Zaun oder Kette hängen sie sicher (Einschätzung, Spiellogik).
10. **Kupfer- oder Holzmauern, Terrakotta- oder Wolltreppen** einplanen: gibt es in 1.21.11 nicht (`daecher.md` §1 und §6; Fehler in [48]).
11. **Pagodenstufen mit gerader Anzahl** oder ohne Finial ([20], [48]).
12. **Dachgaube bündig mit der Fassade** und trotzdem „Gaube“ nennen. Bündig ist ein Zwerchhaus ([37], [41]). Beides ist legitim, aber verschieden.
13. **Kuppeln, Zwiebeln und Ogee auf kleinen Dächern.** Unter etwa 6 Blöcken Radius wirkt es wie Neigungsmischmasch (`daecher.md` §4).

---

## Empfehlungen für den Generator

Priorisiert. Format: **Was**, Modul, Daten/Regel, Akzeptanzkriterium.

1. **Neigungsleiter statt `capRise`.**
   - Modul: `profiles.ts` (neu `PITCH_LADDER`, `pickPitch(n, cap, range)`), `roofEngine.ts:212–225`, `plan.ts:426`, `buildingLints.ts:141–142`.
   - Daten: Tabelle T1, je Stil `pitchRange` und Faktor `f` für den Deckel (Tabelle oben).
   - Regel: steilste Stufe im Bereich mit rise ≤ cap, sonst Formwechsel oder Abschnitt.
   - Akzeptanz: Für alle n = 3…14 und alle planaren Profile ist die Δ-Folge periodisch mit einem Ladder-Muster (± Phase). Keine Δ1 in `steep` oder `standard`. Die Lint-Grenze steigt auf `cap + 1`. Snapshot-Test der Tabelle.
2. **Paritätsfehler `bell` beheben und Kurvenkatalog einführen.**
   - Modul: `profiles.ts:44–49`, neue Funktion `quantizeCurve(kind, n, riseHalf)` (DP).
   - Daten: Katalog T2 als Testfixture.
   - Akzeptanz: konkave Folgen nicht fallend, konvexe nicht steigend, Δ3 nur nach ungeradem t, keine Folge `3,1`. Für n = 4…12 gleich dem Katalog. Glocke unter Deckel nach der a/b/c-Regel.
3. **Eine Neigung pro Haus.**
   - Modul: `buildHouse.ts:planSections` bzw. `plan.ts`.
   - Regel: Die Stufe wird am Hauptkörper bestimmt und an alle Sektionen als `pitch` übergeben (Ausnahmen: Schlepp, Pult, Turm).
   - Akzeptanz: In jedem generierten Haus haben alle Giebel- und Walmsektionen dieselbe Ladder-Stufe. Test über alle Stile × Größen × Flügel.
4. **Stapelmodus für Sektionen.**
   - Modul: `roofEngine.ts:331–356` (`stack?: boolean`).
   - Regel: Stücke einer gestapelten Sektion werden geschrieben, wenn ihr y-Intervall das des Gewinners nicht schneidet. Brett und Konsole gelten auch für gestapelte Traufen.
   - Akzeptanz: Irimoya-Ansicht Ost wie Skizze G ohne Luft unter V außer der gewollten Fuge. Validator „Dach ohne Lücken“ und „nichts schwebt“ bestehen. Schleppgaube wie Skizze O.
5. **Neuer Typ `irimoya`, JAP- und CHE-Priors umstellen.**
   - Modul: `styles.ts:18, 181, 208`, `plan.ts:186–192`, `roofEngine.ts` (zwei Sektionen: `skirt(rings = k)` + `gable` innen, `stack`).
   - Daten: k = clamp(round(0,35n), 2, n − 2), og = 1, optional `shikoro: +1`.
   - Akzeptanz: Endansicht zeigt k Walmringe und das Giebeldreieck 1 hinter dem Ortgang. `half_hip` kommt in JAP nicht mehr vor (Prior 0). Parser: „Irimoya/Walmgiebel“ wird erkannt.
6. **Traufkurve und Eckaufbiegung.**
   - Modul: `roofEngine.ts:sectionColumns` (Overlay `eaveCurve: 'none' | 'naginata' | 'shin'`), `styles.ts` (JAP und CHE: naginata 0,6 / shin 0,4; FAN optional 0,2).
   - Daten: Hebungstabelle T8.
   - Akzeptanz: Die Ecken liegen 1,5 Blöcke (+3 hb) über der Traufmitte. Das Horn ist eine Treppe mit `facing` nach außen und `shape=straight`. Keine Laterne unter einer `slab[type=top]`.
7. **Pagode und Mokoshi aus `skirt`.**
   - Modul: `plan.ts` (pagoda → Geschossstapel), `roofEngine.ts:360` (Untersicht auch für skirt), `tower.ts` (JAP-Turm als Pagode).
   - Daten: g ∈ {3, 5}, Einzug 1–2, o = 2, Finial-Stapel T9.
   - Akzeptanz: Traufspitzen linear (Differenz je Stufe konstant), ungerade Stufen, Finial vorhanden, „pagoda“ ist nicht mehr gleich „hip“.
8. **Gambrel und Mansard korrigieren, Δ0 erlauben.**
   - Modul: `profiles.ts:50–53, 120–134`, `roofEngine.ts:136–141`, `components.ts:25`.
   - Daten: Tabellen T4 und T5. `convex` bleibt als eigenes Profil.
   - Akzeptanz: Gambrel hat genau zwei Δ-Werte (plus Kick) und einen Knickbalken. Mansard ersetzt das oberste Geschoss, hat o ≤ 1, ein Deck aus Δ0-Stufen und ≥ 1 Gaube je Seite ab Breite 9.
9. **Gauben erweitern.**
   - Modul: `components.ts:24–79`.
   - Daten: Typen `gable | hip | shed | eyebrow | wall`, Breite 3/5, Regeln T13.
   - Akzeptanz: Gaubenachsen liegen auf Fensterachsen des Obergeschosses. Abstand ≥ 2 zu Ortgang und Grat. Gaubenfirst ≤ Hauptfirst − 2. Gauben auch auf Rückseite, `ridgeAxis z`, Walm und Mansard. Schleppgaube flacher als das Hauptdach.
10. **Unterordnungs- und Turmregeln.**
    - Modul: `plan.ts:222–254` (Flügel), `:256–273` (cross), `:318–323` (Turm).
    - Regel: Flügelfirst = Hauptfirst oder ≤ −1, Zwerchhaus ≤ −2, Turmtraufe ≥ Hauptfirst + 2 (`towerFloors` aus dem Rise), Anschlussband am Turm.
    - Akzeptanz: Lint `firstabstand` für alle Kombinationen L/T/U × Turm. Keine Sektion mit |ΔFirst| = 0,5.
11. **Trim, Grat, Kehle, Ortgang-Varianten.**
    - Modul: `roofEngine.ts:248` (Trim nur bei `x == X0 || x == X1` bzw. z), neue Flags `hipLine`, `valleyWeathering`, `vergeStyle` (T12), `plan.ts:423` (`gableRecess` je Stil: MED/FAN 0,3, RUS 0,5).
    - Akzeptanz: Bei o = 3 besteht genau eine Ortgangspalte aus Trim. Gratzellen tragen `ridge`. `crowstep` nur bei Stein- oder Ziegelwand. Brüstung überall ≥ Dachoberkante + 1.
12. **Firstenden und Finials.**
    - Modul: `roofEngine.ts:257–284` (Ridge-Ende), `styles.ts` (Daten `ridgeEnd`).
    - Daten: `fence+lightning_rod` (MED, NOR), `fence+end_rod` (FAN), `onigawara` (JAP, CHE), `none` (MOD, MDT).
    - Akzeptanz: Jeder Giebelscheitel hat ein Ende nach Stil. Kein Finial schwebt (18er-Nachbarschaft).
13. **Verwitterung und Streifen.**
    - Modul: Dach-Postpass nach `buildRoofs`, Palette über Schwesterpaare.
    - Daten: p-Tabelle T14.
    - Akzeptanz: Bei Flächen > 120 Zellen sind 5–12 % Schwestermaterial vorhanden, davon ≥ 60 % in Traufe und Kehlen. Varianten in Streifen von ≥ 2 Zellen in Fallrichtung. Lint „3–5 Materialfamilien“ bleibt grün.
14. **Spalt unter dem Ortgangbrett schließen.**
    - Modul: `roofEngine.ts:366–369`.
    - Regel: In Ortgangspalten mit `slab_top` wird die Stufe durch `slab[type=double]` des Trims ersetzt.
    - Akzeptanz: Kein Luftspalt von 0,5 zwischen Brett und Ortgang (Geometrietest über die Formklassen).
15. **Großdach-Gliederung als Regel.**
    - Modul: `plan.ts` bzw. `resolveInput.ts`.
    - Daten: Auslösertabelle „Sehr große Dachflächen“.
    - Akzeptanz: Kein Haus mit Trauflänge ≥ 15 ohne Gaube, Zwerchhaus oder Firstsprung, außer der Nutzer schließt es aus.

---

## Quellen

1. https://minecraft.wiki/w/Tutorial:Roof_types – Dutch gable, Half-hipped (3 + 2½ Reihen), Gambrel „two or three distinct roof pitches“, Mansard ≈ 16 × 20, Bell-cast, Gull wing, Gauben.
2. https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines – Neigung als Wiederholmuster (5:7); Dach 1–2 Geschosse; ab 15 × 15 Abschnitte mit 5–7 Anstieg.
3. https://minecraft.wiki/w/Trapdoor – facing/half/open; facing = Öffnungsrichtung, Scharnier gegenüber; kein Halt nötig.
4. https://minecraft.wiki/w/Wall – Pfosten fehlt nur bei zwei gegenüberliegenden oder vier Verbindungen.
5. https://minecraft.wiki/w/Lantern – hängt unter Blöcken und Ketten; bricht bei Update auf ungültiger Fläche.
6. https://minecraft.wiki/w/Lightning_Rod – facing inkl. up; Oxidationsstufen seit 1.21.x (Registry nur `lightning_rod`, `waxed_lightning_rod`).
7. https://wiki.openstreetmap.org/wiki/Key:roof:shape – Formvokabular: hipped-and-gabled, half-hipped, side_hipped, crosspitched, gambrel, mansard.
8. https://www.aisf.or.jp/~jaanus/deta/i/irimoyazukuri.htm – Irimoya: oben Giebel über *moya*, unten Walm über *hisashi*.
9. https://www.aisf.or.jp/~jaanus/deta/n/nokizori.htm – Traufkrümmung *shinzori* und *naginatazori*.
10. https://www.aisf.or.jp/~jaanus/deta/s/shikorobuki.htm – Irimoya auf getrennten Ebenen, Giebelteil kragt als eigene Traufe über den Walm.
11. https://www.aisf.or.jp/~jaanus/deta/m/mokoshi.htm – Pultdach-Umgang 1 Joch tief, an 1–4 Seiten, wirkt zweigeschossig.
12. https://www.aisf.or.jp/~jaanus/deta/c/chidorihafu.htm – dekorative Dreiecksgaube ohne Fenster.
13. https://www.aisf.or.jp/~jaanus/deta/k/karahafu.htm – Giebel oben konvex, unten konkav.
14. https://www.aisf.or.jp/~jaanus/deta/o/onigawara.htm – Zierziegel an Haupt- und Gratfirst-Enden.
15. https://www.aisf.or.jp/~jaanus/deta/h/hougyouzukuri.htm – Pyramidendach ohne First, Juwel-Aufsatz.
16. https://www.aisf.or.jp/~jaanus/deta/m/mukuri.htm – konvexe Dachflächen; Edo-Zeit, Tore, Minka.
17. https://www.aisf.or.jp/~jaanus/deta/k/kirizumazukuri.htm – Kirizuma = Satteldach mit Giebeldreieck.
18. https://en.wikipedia.org/wiki/East_Asian_hip-and-gable_roof – Walm rundum + Giebel an zwei Seiten; Doppeltraufe; neun Firste.
19. https://en.wikipedia.org/wiki/Japanese_Buddhist_architecture – weite Traufen auf Konsolen; Dach „half the size of the whole edifice“.
20. https://en.wikipedia.org/wiki/Japanese_pagoda – ungerade 3–13 Geschosse; *teigen*; Traufkanten auf einer Geraden; Finials.
21. https://en.wikipedia.org/wiki/Pagoda – 3–13 Stufen, fast immer ungerade.
22. https://en.wikipedia.org/wiki/Hōryū-ji – Kondō: Ecken gekrümmt, nachträgliches Doppeldach, Traufe > 4 m.
23. https://en.wikipedia.org/wiki/Minka – Kirizuma, Yosemune, Irimoya, Hogyo; steile Dächer.
24. https://en.wikipedia.org/wiki/Mansard_roof – unten steiler; Gauben; konvexe oder konkave Krümmung.
25. https://en.wikipedia.org/wiki/Gambrel – Satteldach mit Knick, kragt über; Mansard normalerweise nicht.
26. https://www.blocklayer.com/roof/gambreleng – Knickpunkt mit Pfette, Gambrel „fit inside a Semi Circle“.
27. https://en.wikipedia.org/wiki/Roof_pitch – Neigungen griechisch, römisch, common, gotisch, elisabethanisch.
28. https://en.wikipedia.org/wiki/Hip_roof – Half-hip vs. Dutch gable/gablet; Pavillon- und Zeltdach.
29. https://en.wikipedia.org/wiki/Dormer – Gaubentypen inkl. Schlepp- (flacher), Augenbrauen-, Wand-, Nantucket-Gaube.
30. https://en.wikipedia.org/wiki/Saltbox – vorne 2, hinten 1 Geschoss; Catslide.
31. https://en.wikipedia.org/wiki/Bargeboard – Ortgangbrett; Finials und Pendants am Scheitel.
32. https://en.wikipedia.org/wiki/Crow-stepped_gable – Brüstung über der Dachlinie, regionale Stufengrößen.
33. https://en.wikipedia.org/wiki/Chalet – „gently sloping roof“, „wide, well-supported eaves“.
34. https://en.wikipedia.org/wiki/Black_Forest_house – Walm/Halbwalm bis zum Erdgeschoss, lange Überstände.
35. https://en.wikipedia.org/wiki/Stave_church – Dach fällt in zwei Stufen.
36. https://en.wikipedia.org/wiki/Straight_skeleton – Walmdach über Polygonen als Wellenfront.
37. https://de.wikipedia.org/wiki/Zwerchhaus – bündig mit der Wand, First nicht bis zum Hauptfirst, Höhe = 150 % Breite (Barock).
38. https://de.wikipedia.org/wiki/Aufschiebling – Traufknick; häufig an Steildach, Mansard, Turmhelm.
39. https://de.wikipedia.org/wiki/Krüppelwalmdach – nur der obere Giebelteil wird abgewalmt.
40. https://de.wikipedia.org/wiki/Dachneigung – Mindestneigungen; kälter = steiler.
41. https://de.wikipedia.org/wiki/Dachgaube – Gaube sitzt hinter der Außenwand auf den Sparren.
42. https://guide.astroworldmc.com/how-to-build-a-japanese-house – Eckhorn-Rezept, flache Neigung, Stufen ≥ 2 kleiner, Finial.
43. https://guide.astroworldmc.com/how-to-build-a-medieval-house – Dächer „often as tall as the walls“.
44. https://buildingguide.app/minecraft-building-tips – Überstand 1–2, Abschnitte auf verschiedenen Höhen, Textur in Maßen.
45. https://buildingguide.app/minecraft-medieval-builds – steile Überstände; flach „kills the look“; Zaun-Finials.
46. https://buildingguide.app/tutorials/samurai-house – Dach ≈ doppelte Wandhöhe, `cobbled_deepslate`, erhöhte Eckstücke.
47. https://buildingguide.app/tutorials/red-japanese-temple – Eckhörner aus erhöhten Blöcken und Treppen; Flare Pflicht.
48. https://buildingguide.app/tutorials/japanese-pagoda – aufgebogene Ecken, Finial als Signal (Kupfermauer = Versionsfehler).
49. https://buildingguide.app/tutorials/timber-frame-townhouse – wechselnde Dachmaterialien, Moos an Traufe und Ecken.
50. https://buildingguide.app/tutorials/medieval-corner-house – L-Kehle: Stufen, dann Treppen; beide Flügel zusammen bauen.
51. https://buildingguide.app/tutorials/medieval-merchant-house – Flügel 1 Geschoss tiefer, Hauptdach darübergeschoben, Kupferflügel.
52. https://blog.curseforge.com/top-minecraft-roof-designs-to-try/ – Gullwing aus Kreis 2–3 × Dachhöhe; Pagode mit Kontrastkante.
53. https://ggservers.com/blog/improve-minecraft-building-skills-easily/ – „Add ridges or hip rafters“; Proportion.
54. https://ar5iv.labs.arxiv.org/html/1803.09853 – GDMC-Kriterien: einheitlich, variiert, keine „jarring features“.
55. https://arxiv.org/abs/2103.14950 – GDMC-Bericht: wirkt noch nicht menschgemacht, wenig Variation.
56. https://brightchamps.com/blog/minecraft-roof/ – von hoch nach niedrig bauen; Mansard braucht Gauben.
57. https://raw.githubusercontent.com/louis-e/arnis/main/src/element_processing/buildings.rs – OSM-Generator: HalfHipped „hipped only above half height“, Mansard „flat cap“.
58. https://www.thespike.gg/minecraft/house-ideas/minecraft-japanese-house – Materialhinweise für japanische Dächer.
59. https://minecraft.wiki/w/Tutorial:Architectural_terms – Glossar: Gaube mit „mini-roof“, Monitor-Aufsatzdach.
