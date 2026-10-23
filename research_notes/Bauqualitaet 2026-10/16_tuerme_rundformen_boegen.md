# Türme, Rundformen, Bögen, Kuppeln und Burgdetails – Profiregeln für den Generator

Stand: 2026-10-23 · Thema: Wie erfahrene Builder Rund-, Achteck- und Ecktürme mit tragender Krone, Turmhelme, Kuppeln, Erkertürmchen und Bögen aus Vanilla-Blöcken bauen, und was `roundTower.ts`, `tower.ts` und `src/core/geometry/` davon übernehmen sollten.

**Abgrenzung.** Die Grundlagen stehen in `research_notes/Minecraft Bautechniken für Generator/kreise_boegen_tuerme.md` („Altnotiz") und werden nicht wiederholt: Kreiskriterium, Zeilentabellen, Kugel-/Kegelformeln, `shape`-Regel der Treppen, Rund-/Spitz-/Segmentbögen im Ganzblockraster, Zinnen mit Periode 2, Wendeltreppen. Überschneidungen: Dachflächen (Thema Dächer), Fenster- und Türvorlagen (Thema Fenster/Türen), Wandverwitterung (Thema 01), Gesamtproportionen (Thema 19).

**Konventionen der Skizzen**
- **Radialschnitt:** senkrechter Schnitt durch die Turmachse, Blick entlang der Wand.
  - Spalten = Tiefe d: −1 innen, 0 Wandring, +1 Kranzring `K1 = filled(D+2)\filled(D)`, +2 Ring `K2 = filled(D+4)\filled(D+2)`.
  - Zeilen = y, die oberste steht oben.
- **Treppen:** „→M" heißt `facing` zur Turmachse (= `ringFacing`, `geometry/towers.ts:11`), „→A" heißt von der Achse weg.
- **Bezugshöhen:** T = Wandkrone (`wallTopOf`). Draufsicht: Norden oben. Block-IDs ohne `minecraft:`.
- **Belege:** [n] = Quelle; „(berechnet)" = mit eigenem Node-Skript nach dem Kriterium der Geometriebibliothek nachgerechnet; „Einschätzung" = abgeleitet, nicht wörtlich belegt.

---

## Kurzfassung

Sortiert nach Wirkung:

1. **Die Krone muss tragen und überstehen.** Brüstung und Zinnen stehen *auf* dem Konsolenkranz (Ring D+2), nicht dahinter. Builder raten: „corbel the top out a block before the battlements" [8]; Vorbild sind die Maschikulis [33][53]. Heute trägt unser Kranz nichts.
2. **Zinnen über Winkelsektoren.** N = 8·m Sektoren auf dem tatsächlich gebauten Ring machen das Muster für **jedes** D voll symmetrisch (berechnet). Das beseitigt die Zahnlücken (Muster des dünnen Rings auf dem dicken Ring) und die Beschränkung auf D 7/9/15/17/21/23.
3. **Dreiteilung Sockel – Schaft – Krone.** Gesimse „every few floors" [8], ein schwerer Fuß mit Anlauf [14][40]. Ein Band pro Geschoss erzeugt den heutigen „Reifenstapel".
4. **Texturgradient über die ganze Höhe, in Clustern.**
   - Unten dunkel und bemoost.
   - Der Schaft gemischt, z. B. Steinziegel, Stein und Andesit „roughly evenly" [13].
   - Die Krone sauber.
   - 3–4 Stufen [21], kein „Sandwiching" [18].
   - Heute wirkt die Verwitterung nur in den untersten ≈ 4 Blöcken.
5. **Den Durchmesser nach Rasterqualität wählen.** D 9, 11 und 14 rastern zu Achtecken, rund wirken 13, 15 und 16–21 (berechnet). Unsere Größen 7/9/11 sind faktisch Achtecke.
6. **Die Kuppel hat den Durchmesser des Turms, nicht D+2** [2]. Dazu kommen Tambour, Gesims und Laterne [45][46][50]. Heute wirkt sie wie ein Pilzhut.
7. **Kegel mit Traufknick** [41] **und dünner Spitze.** Keine Säule aus Vollblöcken: Unser konkaves Profil endet in 5–7 Einzelblöcken (berechnet).
8. **Lisenen bzw. Rundstäbe in den Diagonalkerben** [54]. Sie gliedern die Rundwand und überdecken genau die Pixelstufen. Die Fenster bleiben auf den Achsen.
9. **Fenster mit Laibung und Hierarchie.** Unten Scharten, oben größere Fenster, ab D 13 mit Bogenkopf [1][39]. Heute sitzen 1×2-Scheiben bündig in der Wand.
10. **Formen kombinieren statt Entweder-oder.**
    - Spitzhelm hinter der Zinnenbrüstung [41].
    - Erkertürmchen auf Kragkegel [34][35][55].
    - Dachhaus auf dem Rundturm [36].
11. **Das Achteck als eigene Form** [4]. Den Übergang vom Quadratturm zum Achteckhelm bilden Broaches [41].
12. **Helmformen als Daten:** Knickhelm, Glocke, Zwiebel, Welsche Haube [42][47][48][49]. `onionProfile` existiert schon, wird aber nicht genutzt.
13. **Bögen ergänzen:** Tudor-, Korb- und Kielbogen, Halbblock-Rasterung, Archivolte. Das vorhandene `pointedArch`/`segmentalArch` wird bisher nie verwendet.
14. **Portale in Rundwänden** zurücksetzen oder als Vorbau bauen, nie als flachen Rahmen vor der Krümmung.

---

## Schwächen des aktuellen Generators

### Aus den Screenshots

- **S1 `turm-mittelalter-zinnen.jpg`** (D 9)
  - Ein einziges Material über ≈ 28 Blöcke.
  - Fünf gleiche Ringe aus Kopfüber-Treppen, je einer pro Geschoss: ein Reifenstapel.
  - Die Kranzplatte steht vor zurückgesetzten, einlagigen und unregelmäßigen Merlonen.
  - Die Fenster sind kaum zu sehen, Scharten fehlen.
  - Der Grundriss wirkt achteckig.
- **S2 `turm-fantasy-weihnachten.jpg`**
  - Steiler, einfarbiger Kegel ohne Traufknick, mit „Reißverschluss"-Graten an den Diagonalen.
  - Die Spitze ist eine Säule aus Dachblöcken mit einem einzelnen Zaun.
  - Ein Band an jedem Geschoss, die Fenster sind winzig.
  - Ein rechteckiger Dunkeleichenrahmen steht flach vor der gekrümmten Wand.
- **S3/S4 `haus-mittelalter-rundturm-erker-balkon-*.jpg`**
  - Der Turm ist bis oben aus Sockel-Bruchstein und wirkt fremd am Fachwerkhaus.
  - Turm- und Hausbänder liegen auf verschiedenen Höhen.
  - Wieder eine Kranzplatte vor zurückgesetzten Merlonen.
  - Das Hausdach läuft stumpf gegen die Pixelstufen des Rings, ein Anschluss fehlt.

### Aus dem Code

| # | Datei:Zeile | Befund → Folge |
|---|---|---|
| C1 | `roundTower.ts:67`, `:197–206`; `towers.ts:37` | Die Brüstung steht auf dem **dicken** Ring, die Merlone stammen aus `battlementPattern(d)` für den **dünnen** Ring → Zahnlücken an den Diagonalstufen. |
| C2 | `roundTower.ts:133–136`, `:203` | Der Konsolenkranz auf y = T trägt nichts, die Brüstung steht auf T+1 auf dem Wandring → kein Maschikuli, keine Schattenlinie. |
| C3 | `roundTower.ts:128–132` | Ein gleiches Band an **jedem** Geschoss → Reifenstapel. |
| C4 | `roundTower.ts:127` | Der Sockel besteht nur aus einer Treppenreihe auf y = 1 → kein schwerer Fuß. |
| C5 | `roundTower.ts:78` | In Fachwerkstilen ist der ganze Turm aus der Rolle `plinth` → ein Material über die volle Höhe, Bruch zum Haus. |
| C6 | `roundTower.ts:113`; `texturing.ts:24–26` | Nur `height` wird übergeben, `HW = 3,5`, `underOverhang` und `drip` werden am Turm nie gesetzt → kein Höhenverlauf. |
| C7 | `roundTower.ts:141–169` | Immer `glass_pane` 1×2 (`:142`) in d = 0 (`:160`), keine Scharten und Bögen, die Vorlagen W01–W18 bleiben ungenutzt → „Aufkleberfenster". |
| C8 | `roundTower.ts:39` | `dome(d+2)` → Pilzkuppel. |
| C9 | `roundTower.ts:195–196` | Die Spitze ist ein einzelner Zaun bzw. eine Laterne → schwache Bekrönung. |
| C10 | `roundTower.ts:184–190`; `solids.ts:88` | Ein einziges Dachmaterial. Das konkave Profil (1,75) endet in vielen Einzelblöcken, z. B. D 13/H 14: `…,3,3,1,1,1,1,1` (berechnet). |
| C11 | `plan.ts:149–161` (`:158`) | Es gibt Zinnen **oder** Kegel **oder** Kuppel → der Spitzhelm hinter Zinnen fehlt. |
| C12 | `plan.ts:362`; `tower.ts:24–26` | D 7/9 am Haus, 7/9/11/15 frei → bis auf 15 alles achteckig wirkende Raster. |
| C13 | `tower.ts:59–64` | Das Portal kommt aus den flachen Vorlagen und steht vor dem Quadrat um den Kreis → Rahmen vor der Krümmung. |
| C14 | `plan.ts:313–336` | Der Eckturm ist immer 5×5 mit Pyramidendach, ein Achteck fehlt. |
| C15 | `solids.ts:138`, `towers.ts:64`, `arches.ts:99/110` | `onionProfile`, `taperDiameters`, `pointedArch`, `segmentalArch`, `ellipse` und `revolve` sind ungenutzt. Verwendet wird nur `roundArch(3)` (`doors.ts:123`, `windows.ts:287/517`). |

---

## Techniken und Regeln

### T1 Krone: Konsolenkranz mit vorgezogener Brüstung (Maschikuli)

**Beschreibung.** Bei Maschikulis tragen übereinander gestufte Kragsteine die vorgezogene Brüstung. Die Zwischenräume sind mit Sturz oder kleinem Bogen überbrückt und dienen als Wurföffnungen [53]. Französische und englische Burgen hatten vier Konsolenlagen [38]. An Wehrtürmen laufen sie als Kranz um, später blieben sie als Zierde [53]. In Minecraft genügen 1–2 Lagen.

**Blöcke und Maße**
- Konsole: `stone_brick_stairs[facing=→M,half=top]`, alternativ `polished_andesite_stairs` oder `cobblestone_stairs`.
- Kragstiel-Variante: `stone_brick_wall`. Mit einem Block darüber und Anschluss nur zur Wand wird er zum Pfosten, den Zustand setzt der Auflöser.
- Kappe: `stone_brick_slab[type=bottom]`.
- Echte Zinnen sind 1–2 m hoch und 0,76–2,35 m breit [52], also 1–2 Blöcke.
- K1 hat 28 Zellen bei D 9, 40 bei D 13 und 48 bei D 15 (berechnet).

**Variante A – Gesimskranz (D 7–11)**
```
Radialschnitt, y = T+3 … T-2
Legende: W = Wand, D = Deck (floor/wall), P = Brüstung (wall), M = Merlon (nur Merlon-Sektoren),
k = stone_brick_slab[type=bottom] (Kappe, optional), C = stone_brick_stairs[facing=→M,half=top], . = Luft
        d=-1  d=0  d=+1
T+3      .     .    k
T+2      .     .    M        Zinnenlücke in Augenhöhe (Spieler steht auf D)
T+1      .     .    P
T        D     D    P        Brüstungsfuß auf der Konsole
T-1      .     W    C        unter JEDER Kranzzelle
T-2      .     W    .
```
**Variante B – Maschikuli (D ≥ 11):** C steht nur unter Merlon-Sektoren. In den Lücken bleibt auf T−1 Luft (Wurföffnung). In jede zweite Lücke darf `lantern[hanging=true]`, der Brüstungsfuß darüber gibt Halt. Das ergibt eine warme Lichtkette.
```
Ansicht außen (abgewickelt), y = T+2 … T-1
M . M . M . M
P P P P P P P
P P P P P P P        y = T
C . C l C . C        l = lantern[hanging=true], . = Wurföffnung
```
**Variante C – zweilagig (D ≥ 15, Bergfried)**
```
        d=-1 d=0 d=+1 d=+2       B = Kragblock (wall/accent, z. B. polished_andesite)
T+2      .    .   .    M
T+1      .    .   .    P
T        D    D   D    P         Wehrgang 2 breit
T-1      .    W   B    C         2. Lage auf K2
T-2      .    W   C    .         1. Lage auf K1
```
**Variante D – Holzhurde (rustic, nordic, medieval_timber).** Ein hölzerner Wehrgang, verwandt mit dem Maschikuli [53], der den Kegel trägt.
```
Legende: R = unterste Kegelschicht auf K2 (Traufe), H = spruce_planks, S = stripped_spruce_log[axis=y] (statt H an den
8 Lisenenpositionen, T5), o = Luke (Luft, jede 3. Zelle), t = spruce_trapdoor[facing=→A,half=top,open=true],
F = spruce_planks (Boden), C = spruce_stairs[facing=→M,half=top]
        d=-1 d=0 d=+1 d=+2
T+4      .    .   R    R
T+3      .    .   H    .
T+2      .    .   o    t         Klappladen: Blatt liegt gegenüber von facing, also an der Hurde [26]
T+1      .    .   H    .
T        D    D   F    .
T-1      .    W   C    .
```
**Einsatz.** A für alle Steintürme, B für medieval, fantasy und Torhäuser, C ab D 15, D für Holzstile. Die Kranzzellen werden zugleich `eaves` für die Girlanden.

**Wirkung:** hoch · **Aufwand:** mittel · **Stile:** medieval, fantasy, rustic, nordic; mediterranean (A ohne Merlone, mit Kappenplatten). **Quellen:** [8] [33] [38] [53]; Altnotiz Abschnitt 6 präzisiert.

---

### T2 Symmetrische Zinnen für jeden Durchmesser, Zinnenvarianten

**Regel (berechnet).**
- Jede Zelle des gebauten Kranzrings bekommt ihren Winkel θ zur Achse.
- Merlon, wenn `floor((θ + π/N)/(2π/N))` gerade ist. Zellen auf einer Sektorgrenze werden Merlon.
- Bei N = 8·m liegen die Sektormitten auf Achsen und Diagonalen. Das Muster ist dann unter allen 8 Quadratsymmetrien invariant. Geprüft für D 5–31, dünner und dicker Ring.
- Der Generator sucht N ∈ {16, 24, …, 64} mit minimaler Breitenstreuung.

| D | Kranzzellen K1 | bestes N | Merlon | Lücke | Merlone |
|---|---|---|---|---|---|
| 7 | 32 | 32 | 1 | 1 | 16 |
| 9 | 28 | 16 | 1–2 | 2 | 8 |
| 11 | 40 | 40 | 1 | 1 | 20 |
| 13 | 40 | 40 | 1 | 1 | 20 |
| 15 | 48 | 48 | 1 | 1 | 24 |
| 17 | 68 | 40 | 1–2 | 1–2 | 20 |
| 19 | 56 | 56 | 1 | 1 | 28 |
| 21 | 72 | 56 | 1–2 | 1 | 28 |

„Wuchtig": ein kleineres N, z. B. D 13 mit N = 24 → Merlon 1–2, Lücke 1–2.
```
Draufsicht D 13, K1 mit N = 24 (berechnet). M = Merlon, o = Lücke (nur Brüstung), W = Wandring, . = Deck
     ooMoo
   MMWWWWWMM
  oWWW...WWWo
 MWW.......WWM
 MW.........WM
oWW.........WWo
oW...........Wo
MW...........WM
oW...........Wo
oWW.........WWo
 MW.........WM
 MWW.......WWM
  oWWW...WWWo
   MMWWWWWMM
     ooMoo
```
**Varianten**
```
Ansicht abgewickelt, y = T+1 … T+3
Standard      Wuchtig        Mit Kappe     Wand-Zinnen (D ≤ 7, Erkertürmchen)
. M . M       M M . M M      k . k k       w . w . w     w = stone_brick_wall (Pfosten oben)
P P P P       P P P P P      M . M M       v v v v v     v = stone_brick_wall (Brüstung, Auflöser verbindet)
                             P P P P
```
- **Schwalbenschwanz** [37][52], nur auf Achsläufen bzw. eckigen Türmen: Merlon 2 breit. Auf T+3 links `*_stairs[facing=west,half=bottom]`, rechts `…[facing=east,half=bottom]`. Das ergibt eine V-Kerbe.
- **Stufenzinne (irisch)** [37], nur für eckige Türme: Merlon 3 breit, Mitte 2 hoch.
- **Scharte im Merlon** [37]: ab Merlonbreite 3 Luft in der Mitte auf T+2.

**Wirkung:** hoch · **Aufwand:** niedrig · **Stile:** medieval, fantasy, rustic. **Quellen:** [17] [37] [52]; berechnet.

---

### T3 Dreiteilung, sparsame Gesimse

**Beschreibung.** Gegen den Schornstein-Look helfen ein breiter, gestufter Fuß, Bänder „every few floors" und eine 1 Block vorkragende Krone [8]. Die Basis soll „heavy and impenetrable" wirken, die Krone ist die „signature" [14].

**Regeln** (Einschätzung aus [8][14])
- **Sockelzone:** 10–15 % der Höhe, mindestens 2 Blöcke, mit Anlauf (T4).
- **Kronenzone:** 10–15 % der Höhe.
- **Auskragende Gurtgesimse:**
  - Schaft unter 16 Blöcke: keines.
  - Schaft 16–28 Blöcke: eines auf 0,55–0,65 der Höhe (nächste Geschosslinie).
  - Darüber: höchstens eines je 8–10 Blöcke.
- **Profile wechseln, nie zweimal dasselbe übereinander:**
  - Gesims `*_stairs[facing=→M,half=top]` in d = +1.
  - Schattenfuge `*_slab[type=top]` in d = +1.
  - Bündiges Farbband in d = 0 (`polished_andesite`, `smooth_stone`, `tuff_bricks`): ohne Tiefe, ergibt nie einen Reifen. Für Geschosslinien in Fachwerkstilen.

```
Ansicht schematisch, D 13, Wandkrone T = 26
y 27-29  Brüstung + Merlone (T1)     ┐ Krone ≈ 12 %
y 26     Konsolenkranz               ┘
y 15     EIN Gurtgesims
y 4-25   Schaft: Lisenen, Fenster, Texturmischung
y 1-3    Sockel mit Anlauf           Sockel ≈ 12 %
```
**Wirkung:** hoch · **Aufwand:** niedrig · **Stile:** alle Rundtürme. **Quellen:** [8] [14].

---

### T4 Anlauf und Strebepfeiler

**Beschreibung.** Ein „batter" ist die zurückweichende Neigung einer Wand. In Festungen heißt er Talus und erschwerte das Untergraben, typisch ist 1:6 [40]. Beim Bergfried nimmt die Mauerstärke nach oben ab [51]. In Minecraft liest sich 1 Block Rücksprung je 2–3 Ebenen (Einschätzung).
```
Radialschnitt Fuß, D ≥ 13, y = 6 … 0
Legende: W = Wand, B = plinth, b = dunkler Sockelstein (cobbled_deepslate/mossy_cobblestone, Cluster),
S = *_stairs[facing=→M,half=bottom] (Wasserschlag)
        d=0  d=+1 d=+2
y=6      W    .    .
y=5      W    S    .
y=4      B    B    .
y=3      B    B    S
y=2      b    B    B
y=1      b    b    B
y=0      b    b    b
```
- D ≤ 11: nur eine Stufe (d = +1, 2–3 hoch).
- **Strebepfeiler** (D ≥ 15, Torhaus): 4 bzw. 8, in der setback-Form [23], Höhe ⅓–½ des Schafts. Nicht auf Fensterachsen.
  - d = +1: B auf y 0–8, Abdeckung S auf y 9.
  - d = +2: B auf y 0–4, Rücksprung S auf y 5.

**Wirkung:** mittel bis hoch · **Aufwand:** niedrig · **Stile:** medieval, fantasy, mediterranean (nur Anlauf). **Quellen:** [14] [23] [40] [51].

---

### T5 Lisenen und Rundstäbe in den Diagonalkerben

**Beschreibung.** Lisenen sind schwach vortretende senkrechte Wandvorlagen ohne Basis und Kapitell. Sie erscheinen oft mit Rundbogenfries und gelten als Vorform des Strebepfeilers [54]. Ein Turm-Tutorial setzt Mauerblöcke senkrecht „every three blocks around the circumference" [14]. Das ist für uns zu dicht (Einschätzung).

**Positionen (berechnet, gültig für jedes D)**
- **Kerbzellen:** Zellen von K1, die 4-benachbart zu **zwei** Wandzellen liegen, jeweils die, die 45° am nächsten ist. Bei D 13 relativ zur Achse (±5, ±5).
- Die Lisene berührt dort zwei Wandflächen und füllt genau die Pixelstufe. Das ist zugleich der beste Trick gegen „treppige" senkrechte Rundwände (T17).
- Achsen-Lisenen (A) nur auf Achsen ohne Fenster.

```
Draufsicht D 13: W = Wand, L = Diagonal-Lisene (Kerbe), A = Achsen-Lisene (nur ohne Fenster)
       A
     WWWWW
  LWWW...WWWL
  WW.......WW
  W.........W
 WW.........WW
 W...........W
AW...........WA
 W...........W
 WW.........WW
  W.........W
  WW.......WW
  LWWW...WWWL
     WWWWW
       A
```

**Formen**
- **L1 Pfeilerlisene:** Vollblock im Kontrast (`stone_bricks` auf Bruchstein, `polished_andesite`, `tuff_bricks`, `deepslate_bricks`), von der Sockeloberkante bis zum Kranz. Dort trägt sie die Konsole.
- **L2 Rundstab:** Säule aus `stone_brick_wall` oder `cobblestone_wall`. Der Auflöser verbindet sie über Eck mit Pfosten, die Kante wird weich (Einschätzung).
- **L3 Fachwerkständer:** `stripped_dark_oak_log[axis=y]` in den Kerben eines verputzten Obergeschosses (T15).
- **Rundbogenfries unter dem Kranz** [38][54]: auf T−1 zwischen den Konsolen abwechselnd `*_stairs[facing=→M,half=top]` und `*_slab[type=top]`.
- Ab D ≥ 17: zusätzliche Kerben bei 22,5°, falls vorhanden.

**Wirkung:** hoch · **Aufwand:** niedrig · **Stile:** medieval und fantasy (L1, L2), Fachwerk (L3), mediterranean (L1 aus `smooth_sandstone`). **Quellen:** [14] [19] [38] [54].

---

### T6 Texturgradient über die Turmhöhe

**Belegt**
- Ein Turm ganz aus Stein „looks horrible in minecraft". Zwei Steinsorten und Moos mischen [17].
- Rezept: „mix Stone Bricks, Stone, and Andesite roughly evenly" [13].
- Ein Gradient hat 3–4 Blöcke gleicher Farbe [21].
- Die Helligkeit ist das wichtigste Kriterium. Verwitterung sitzt an Fenstern, Kanten, Traufen und am Fuß. Zu vermeiden sind Splattering, Smallpox und **Sandwiching**, also horizontale Sedimentschichten [18].
- Absichtliche Farbbänder, z. B. alle 6 Ebenen am Leuchtturm [3], sind ein Stilmittel (`stripes`), kein Gradient.

**Zonen** (Einschätzung, Anteil an T; Cluster-Rauschen wie `texturing.ts`, Zellgröße 2,5–4; Gewichte in %)

| Zone | medieval | fantasy | rustic/nordic | mediterranean |
|---|---|---|---|---|
| Sockel 0–0,12 | `cobblestone` 50, `mossy_cobblestone` 35, `cobbled_deepslate` 15 | `mossy_stone_bricks` 50, `mossy_cobblestone` 30, `stone_bricks` 20 | `cobbled_deepslate` 60, `cobblestone` 30, `mossy_cobblestone` 10 | `stone_bricks` 60, `sandstone` 40 |
| Schaft 0,12–0,4 | `stone_bricks` 50, `andesite` 20, `cracked_stone_bricks` 15, `mossy_stone_bricks` 15 | `stone_bricks` 60, `mossy_stone_bricks` 20, `cracked_stone_bricks` 20 | `spruce_planks` 70, `stripped_spruce_log` 30 | `smooth_sandstone` 80, `sandstone` 20 |
| Schaft 0,4–0,88 | `stone_bricks` 55, `stone` 15, `andesite` 15, `cracked_stone_bricks` 15 | `stone_bricks` 70, `polished_andesite` 15, `cracked_stone_bricks` 15 | wie darunter | `smooth_sandstone` 100 |
| Krone 0,88–1 | `stone_bricks` 80, `polished_andesite` 15, `chiseled_stone_bricks` ≤ 5 (Achsen) | `stone_bricks` 80, `calcite` 15, `chiseled_stone_bricks` 5 | Hurde (T1-D) | `smooth_quartz`, `cut_sandstone` |
| 2 Reihen unter K1 | +15 % verwitterte Varianten (`underOverhang`) | wie medieval | – | – |

```
Ansicht Schaftausschnitt D 13 (dominanter Block je Cluster)
Legende: s = stone_bricks, a = andesite, k = cracked_stone_bricks, t = stone, m = mossy_stone_bricks,
c = chiseled_stone_bricks, C = cobblestone/mossy_cobblestone
T   s s s s c s s s s
    s k s s a a s s s
    s s a s s s t s k
    a s s k s s s a s
    m s a s s m a s m
P   C C m C C C m C C
```
**Lint gegen Sandwiching:** Keine Variante belegt in einer Reihe mehr als 50 % des Umfangs zusammenhängend.

**Wirkung:** hoch · **Aufwand:** niedrig · **Stile:** alle. **Quellen:** [3] [13] [16] [17] [18] [21].

---

### T7 Fenster in Rundwänden

**Regeln**
- Öffnungen nur auf Achsläufen ≥ Breite + 2. Achslauf: 5 bei D 9–17, 7 bei D 19/21 (Altnotiz).
- Fenster werden „carved from the wall" [1].
- Hinter einer Scharte liegt eine Nische. Es gibt Kreuz- und Fischschwanzscharten, Langbogenschlitze sind hoch [39].
- Der Bergfried hatte einen Hocheingang über Treppe oder Leiter [51].

**(a) Nischenfenster, jedes D**
```
Radialschnitt Fensterachse, y = yb+2 … yb-1
Legende: W = Wand, J = Laibungsblock innen (wall, auch links und rechts der Scheibe), G = glass_pane in d=-1,
H = Sturz, S = Sohlbank, beide *_stairs[facing=→M,half=top] in d=+1
        d=-1 d=0 d=+1
yb+2     J    W    H
yb+1     G    .    .
yb       G    .    .
yb-1     J    W    S
```
Der Laibungskasten J ist 3×4 groß und klein genug, um den Innenraum frei zu lassen.

**(b) Bogenfenster mit 3 Öffnungen (Achslauf 5)**
```
Ansicht Nord- oder Südachse, d=0; Scheiben in d=-1
Legende: a = *_stairs[facing=west,half=top], b = *_stairs[facing=east,half=top], s = *_slab[type=top],
S = Sohlbank in d=+1. Auf der Ost-/Westachse wird west → north und east → south.
x:      -2 -1  0 +1 +2
yb+3     W  W  W  W  W
yb+2     W  a  s  b  W
yb+1     W  .  .  .  W
yb       W  .  .  .  W
yb-1     W  S  S  S  W
```
**(c) Kreuzscharte**
```
Ansicht, d=0 (Luft; optional iron_bars, der Auflöser verbindet sie)
y+3  W W W
y+2  W . W
y+1  . . .
y    W . W
y-1  W . W
```
**(d) Hierarchie** (Einschätzung nach [39][51] und Altnotiz)

| Geschoss | Öffnung |
|---|---|
| EG (frei) | Kreuz- oder Schlitzscharte 1×3, auf 2 Achsen |
| 1. OG | Schlitz oder Nischenfenster 1×2, versetzt |
| mittlere OG | Nischenfenster 1×2, ab D 13 Bogenfenster (b), 2 Achsen rotierend |
| oberstes OG | Bogenfenster (b) auf allen 4 Achsen |
| D ≥ 15 | zusätzlich Schlitze in den Kerben ohne Lisene |

**Wirkung:** hoch · **Aufwand:** mittel · **Stile:** alle Rundtürme; rustic und nordic mit Holzladen. **Quellen:** [1] [24] [39] [51].

---

### T8 Portal in der Rundwand

**(a) Zurückgesetztes Bogenportal (Achslauf 5)**
```
Ansicht Nordachse. A und St in d=+1, Bogen in d=0, in d=-1: J T J (T = Tür)
Legende: A = Archivolte (accent/roofTrim), a/s/b wie T7(b), St = *_stairs[facing=→M,half=bottom]
x:      -2 -1  0 +1 +2
y=4      A  A  A  A  A
y=3      A  a  s  b  A
y=2      A  .  .  .  A
y=1      A  .  .  .  A
y=0     St St St St St
```
Alle Teile liegen auf dem Achslauf und berühren die Wand.

**(b) Vorbau:** rechteckig, 5 breit und 2–3 tief, mit eigenem Pult- oder Satteldach aus der Dachengine. Das Rechteck verdeckt die Krümmung.

**(c) Hocheingang** [51]: Tür im 1. OG mit einer Plattform aus `spruce_planks`, Geländer aus `spruce_fence` und Pfosten aus `stripped_spruce_log[axis=y]`.

**Wirkung:** mittel bis hoch · **Aufwand:** mittel · **Stile:** a: medieval, fantasy, mediterranean; b: rustic, nordic, Haustürme; c: medieval. **Quellen:** [10] („recessed arch") [51].

---

### T9 Kegelhelm: Traufknick, Streifen, Spitze

**Belegt**
- Splay-foot-Spitzen „open out and flatten off at their base, creating eaves" [41].
- Der Knickhelm ist eine steile Turmpyramide mit gebrochenem Fuß [47].
- Kegel sind „sharper", Kuppeln „softer". Das Dach ist dunkler als die Bänder [3].
- Streifen entstehen durch einen Materialwechsel alle 2–3 Schichten [2]. Ein Turmdach mit 1–2 Reihen Mangrove und 1 Reihe Fichte im Wechsel zeigt [13].
- Ein 7er-Kegel mit 2, 3 und 4 hohen Schichten, also konkav, zeigt [14].

**Knick (Einschätzung):** Ring K2 aus `roof_slab[type=bottom]` auf der untersten Kegelschicht. Die Traufe sinkt um ½ Block.
```
Radialschnitt Traufe, steiler Kegel, y = T+4 … T
Legende: X = roof, r = *_stairs[facing=→M,half=bottom], k = *_slab[type=bottom], C = Kranz, W = Wand
        d=0  d=+1 d=+2
T+4      r    .    .
T+3      X    .    .
T+2      X    r    .
T+1      X    X    k
T        W    C    .
```
**Spitze:** höchstens 2 Einzelblöcke aus Dachmaterial (für ungerades D; bei geradem D sinngemäß 2×2), danach dünne Elemente.
```
y+3   f      f = waxed_lightning_rod[facing=up] (bleibt blank) oder end_rod[facing=up] (fantasy, leuchtet)
y+2   w      w = stone_brick_wall oder dark_oak_fence
y+1   X
y     r X r
```
- Seit 1.21.9 oxidieren Blitzableiter [27], deshalb `waxed_*`.
- Grüne Spitze: `waxed_oxidized_lightning_rod` (nicht in Registry).
- Steinspitze: `pointed_dripstone[vertical_direction=up,thickness=tip]` (nicht in Registry, braucht einen Block darunter).

**Streifen:** ein Ring alle 3 Schichten aus einem zweiten Material ähnlicher Helligkeit, nur ein Streifentyp pro Dach. Paare:
- `deepslate_tile_stairs` + `polished_deepslate_stairs`
- `dark_oak_stairs` + `spruce_stairs`
- `waxed_oxidized_cut_copper_stairs` + `waxed_weathered_cut_copper_stairs`

**Wirkung:** hoch · **Aufwand:** niedrig · **Stile:** fantasy (konkav, Knick, `end_rod`), medieval (gerade, Knick, Streifen), nordic (Holz, Knick), mediterranean (flach, H ≈ 0,5·D_R, `brick_stairs`, ohne Knick). **Quellen:** [2] [3] [13] [14] [27] [41] [47].

---

### T10 Spitzhelm hinter der Zinnenbrüstung

**Beschreibung.** Die Nadelspitze steht „surrounded by a parapet" [41]. Das ist der klassische Burgturm: Krone T1 **und** Helm.
```
Radialschnitt D 13, Helm D_H = D-2 = 11 auf dem Deck, y = T+5 … T-1
Legende: X/r = Helm (r = *_stairs[facing=→M,half=bottom]), D = Deck, P/M/C wie T1
        d=-2 d=-1 d=0 d=+1
T+5      X    r    .   .
T+4      X    X    .   .
T+3      X    r    .   .
T+2      X    X    .   M
T+1      X    X    .   P      Wehrgang d=0
T        D    D    D   P
T-1      .    .    W   C
```
- Ab D ≥ 15: D_H = D−4, der Wehrgang ist 2 breit.
- Helmhöhe 1,5–2,5·D_H, kein Knick.

**Wirkung:** hoch · **Aufwand:** niedrig · **Stile:** medieval, fantasy. **Quellen:** [8] [41].

---

### T11 Zwiebel, Glockenhaube, Welsche Haube

**Belegt**
- Zwiebeln sind „larger in diameter than the tholobate (drum)", ihre Höhe „usually exceeds their width", sie laufen spitz zu [42].
- Die Zwiebelhaube ist gebaucht und ohne Laterne. Die Glockenhaube ist geschwungen und ohne Laterne. Die Welsche Haube ist mehrfach geschweift mit laternenartigen Zwischenstücken, wiederholbar [48].
- Zwiebeln sind traditionell mit Kupferblech gedeckt, im Bergischen Land immer mit Laterne [49].

**Zwiebel aus `onionProfile` (berechnet; Breiten von unten)**

| Tambour | Schichten | Höhe / Bauch |
|---|---|---|
| 5 | 5, 7, 7, 7, 5, 5, 3, 1, 1 | 9 / 7 |
| 7 | 7, 9, 11, 11, 11, 9, 7, 5, 3, 3, 1, 1 | 12 / 11 |
| 9 | 9, 11, 13, 13, 13, 13, 13, 11, 9, 7, 5, 3, 1, 1, 1 | 15 / 13 |

**Zustände**
- Breiter werdende Schicht: Die neuen Außenzellen sind Bauch-Unterseite, `*_stairs[facing=→M,half=top]`.
- Schmaler werdende Schicht: Die Trittzellen bekommen `*_stairs[facing=→M,half=bottom]`, bei 2 Zellen Stufe außen `*_slab[type=bottom]`.
- Gleich breit: Vollblock.
- Ab Breite 1: Spitzenregel T9.

**Material**
- Kupfer: `waxed_oxidized_cut_copper` mit `_stairs`/`_slab`, Flecken aus `waxed_weathered_cut_copper_*`.
- fantasy: `dark_prismarine`.
- nordic: `dark_oak_*`.

**Glockenhaube (Einschätzung), Tambour 9:** 13ₖ (Knick aus Platten), 11, 11, 11, 9, 9, 7, 5, 3, 1.

**Welsche Haube (Einschätzung nach [48]), Tambour 9, Gesamthöhe ≈ 2·D_t:**
1. Haube 11ₖ, 9, 9, 7, 5.
2. Laterne D_l 5, 2 hoch. Pfosten `stone_brick_wall` in den Kerben, `glass_pane` auf den Achsen.
3. Gesims aus `*_slab[type=top]` auf 7.
4. `onionProfile(5)`.
5. Spitze.

**Wirkung:** hoch · **Aufwand:** mittel (`revolve` ist vorhanden) · **Stile:** fantasy (Zwiebel, Welsch), nordic (Glocke aus Holz), medieval (Welsch auf Kirch- und Rathaustürmen). **Quellen:** [42] [47] [48] [49]; berechnet aus `solids.ts:138`.

---

### T12 Kuppel auf Tambour mit Laterne

**Belegt**
- „For a dome on a round tower, give the dome the same diameter as the tower" [2].
- Flache Kuppel = erste Schichten einer größeren Kuppel. Streifen alle 2–3 Schichten. Treppen auf den äußeren Stufen [2].
- Der Tambour ist ein zylindrischer oder polygonaler Unterbau mit Fenstern [46][50].
- Die Laterne sitzt über dem Scheitelauge, rund, quadratisch oder achteckig, später meist als Zierde [50]. Cupola: kleine kuppelartige Bekrönung [45].

**Aufbau (Maße: Einschätzung)**
- **Tambour:** D, 2–4 hoch, Fenster auf 4 Achsen, ab D 15 auf 8 Positionen.
- **Gesims:** K1 aus `*_stairs[facing=→M,half=top]` auf der obersten Tambourebene.
- **Kuppel:** `dome(D)`. Optional 4 oder 8 Rippen aus Kontrasttreppen.
- **Laterne:** D_l 3 bei D 9–13, D_l 5 bei 15–21.
  - D_l 3: Eckpfosten `*_wall`, Kanten `glass_pane`, in der Mitte `lantern[hanging=false]` oder `shroomlight`.
  - Kappe 3×3 aus `*_slab[type=bottom]`, Spitze `waxed_lightning_rod`.

```
Radialschnitt schematisch D 13 (Spalten = Abstand zur Achse; 6 = Wand, 7 = K1); dome(13): 13,13,13,11,11,9,5
Legende: f = Spitze, c = Kappe, p = Pfosten/Scheibe, l = lantern, X = Schale, r = Kuppeltreppe,
G = Gesims, F = Tambourfenster, W = Wand, D = Deck, C = Kranz
Abstand:  0  1  2  3  4  5  6  7
T+14      f
T+13      c  c
T+12      .  p
T+11      l  p
T+10      X  X  r
T+9       .  .  X  X  r
T+7..8    .  .  .  .  X  r
T+4..6    .  .  .  .  .  .  X
T+3       .  .  .  .  .  .  W  G
T+1..2    .  .  .  .  .  .  F
T         D  D  D  D  D  D  D  C
```
**Material**
- mediterranean: `smooth_quartz_stairs` (weiß) oder `brick_stairs`. Blau als Einschätzung: `dark_prismarine_stairs`, denn blauer Beton hat keine Treppen.
- fantasy: Kupfer.

**Wirkung:** hoch · **Aufwand:** mittel · **Stile:** mediterranean, fantasy. **Quellen:** [2] [45] [46] [50].

---

### T13 Achteck und Broach-Übergang

**Belegt**
- Das Achteck füllt jeden Block, dessen Mitte innerhalb aller Seiten liegt. Bei 0° liegen flache Seiten auf den Achsen, alle Seiten sind gleich lang, „the same stair on each diagonal side". Es „looks rounder than a square and is far easier to build than a circle" [4].
- Das Watchtower-Preset ist achteckig [1]. Achteckige Bergfriede sind selten [51].
- Broaches sind dreieckige Keile an den Turmecken, die eine achteckige Spitze auf einen Quadratturm setzen [41].

**Raster (berechnet):** Zelle (x, z) mit |x|, |z| ≤ h und |x|+|z| ≤ 2h−k, wobei h = (w−1)/2, k = round(0,293·w), Seite s = w−2k.

| w | 7 | 9 | 11 | 13 | 15 | 17 | 21 |
|---|---|---|---|---|---|---|---|
| k | 2 | 3 | 3 | 4 | 4 | 5 | 6 |
| s | 3 | 3 | 5 | 5 | 7 | 7 | 9 |

```
Draufsicht w 11 (s 5, k 3)
...#####...
..#.....#..
.#.......#.
#.........#
#.........#
#.........#
#.........#
#.........#
.#.......#.
..#.....#..
...#####...
```
- Zinnen: Sektorregel T2.
- Dach: Achteckpyramide aus schrumpfenden Fußabdrücken. `outer_*` an den 8 Graten setzt der Auflöser.

**Broach (berechnet).** Schicht i:
- a_i = h − floor(i/2)
- b_i = min(2a_i, max(b_reg(a_i), 2a_i − i))
- b_reg(a) = 2a − round(0,293·(2a+1))
- Fußabdruck: |x|, |z| ≤ a_i und |x|+|z| ≤ b_i.

```
Quadratturm W 11, Schichten 0 … 3
###########    .#########.    ...........    ...........
###########    ###########    ...#####...    ....###....
###########    ###########    ..#######..    ...#####...
###########    ###########    .#########.    ..#######..
###########    ###########    .#########.    .#########.
###########    ###########    .#########.    .#########.
###########    ###########    .#########.    .#########.
###########    ###########    .#########.    ..#######..
###########    ###########    ..#######..    ...#####...
###########    ###########    ...#####...    ....###....
###########    .#########.    ...........    ...........
```
Rheinischer Helm für quadratische Türme ungerader Breite, Treppen nur in zwei Richtungen [22].

**Wirkung:** mittel bis hoch · **Aufwand:** mittel (`geometry/octagon.ts`) · **Stile:** medieval (Wachturm), nordic, mediterranean (Achteck-Tambour). **Quellen:** [1] [4] [22] [41] [51].

---

### T14 Erkertürmchen (Tourelle, Scharwachtturm)

**Belegt**
- Bartizans: auskragende Ecktürmchen auf gestuften Kragsteinen, rund, polygonal oder eckig, mit Scharten [34].
- Turrets reichen nicht zum Boden und haben ein spitzes Dach oder Zinnen [35].
- Scharwachttürme sitzen an Ecken und am Wehrgang, auf Konsole auskragend [55].
- Im Scottish Baronial heißen sie „pepperpot turrets" mit Kegeldach [36].

**Maße (Einschätzung):** D_e 4–5. D 3 rastert als volles Quadrat, D 4 als 4×4 ohne Ecken (berechnet). Wand 3–5 hoch, Kegel auf D_e+2 mit H = 2–2,5·(D_e+2).
```
Ansicht D_e 5 an einer Hausecke (Achse = Spalte 3), F = Erkerboden
Legende: f = waxed_lightning_rod, X/r = Kegel 7, C = Kranz *_stairs[facing=→M,half=top], W = Wand,
G = glass_pane/Scharte, T = *_stairs[facing=→M,half=top] (Kragkegel), w = *_wall oder lantern[hanging=true] an iron_chain
x:        0 1 2 3 4 5 6
F+13      . . . f . . .
F+6..12   … Kegel 7,5,3,1 …
F+5       r r r r r r r
F+4       C W W W W W C
F+1..3    . W W G W W .
F         . W W W W W .       Boden = gefülltes D5
F-1       . T W W W T .       Ring D5\D3
F-2       . . T W T . .       Ring D3\Mitte
F-3       . . . w . . .
```
- Zellen in der Hauswand entfallen. Die Achse liegt diagonal 1 Block vor der Ecke, wie beim heutigen Rundturm.
- Auf großen Rundtürmen: 2–4 Türmchen auf den Diagonalen, ihre Konsolen gehören zum Kranz T1.

**Wirkung:** hoch · **Aufwand:** mittel (`house/tourelle.ts`) · **Stile:** fantasy, medieval, nordic (Fichte). **Quellen:** [34] [35] [36] [55].

---

### T15 Dachhaus und Fachwerk-Obergeschoss

**Belegt:** „Round towers supporting square garret chambers corbelled out over the cylinder of their main bodies" sind typisch schottisch, dazu Treppengiebel [36].
```
Draufsicht D 9 mit Dachhaus 9×9: o = Schaft, K = Kragzelle auf T-1 (Treppe halb oben, facing zur nächsten Schaftzelle)
K K o o o o o K K
K o o o o o o o K
o o o o o o o o o
o o o o o o o o o
o o o o o o o o o
o o o o o o o o o
o o o o o o o o o
K o o o o o o o K
K K o o o o o K K
```
- Über dem Dachhaus ein Sattel- oder Walmdach aus der Dachengine, bei medieval mit Treppengiebel.
- **Fachwerk-Obergeschoss (Einschätzung):** Das oberste Geschoss kragt auf K1 aus, aus `white_terracotta` oder `calcite` mit Ständern L3. Das Band ist aus `stripped_dark_oak_wood`: Rinde auf allen Seiten, also keine falsche Stammachse auf Diagonalzellen. Das verbindet den Steinturm mit dem Fachwerkhaus (behebt C5).

**Wirkung:** hoch · **Aufwand:** mittel · **Stile:** medieval_timber, fantasy, medieval_stone (Dachhaus). **Quellen:** [36].

---

### T16 Bögen: Tudor, Korb, Kiel, Halbblock-Rasterung, Archivolte, Arkade, Gewölbe

**Belegt**
- Der Vierpunkt- bzw. Tudorbogen hat zwei steile Bögen kleinen Radius an den Kämpfern, die in zwei flache Bögen großen Radius übergehen. Der englische Tudorbogen hat dort gerade Seiten [43].
- Korbbogen: tangentiale Kreisbögen, Stich b/2a = ⅓, ¼ oder ⅕ [44].
- Kielbögen kommen auch als Zinnenform vor [52].
- Rahmen und Bögen schaffen Tiefe [24].

**Halbblock-Rasterung (berechnet)**
- Jede Zelle der Fassadenebene wird in 2×2 Viertel geteilt.
- Ein Viertel ist fest, wenn seine Mitte über der Kurve liegt.
- Die Zelle bekommt die nächstliegende darstellbare Form:
  - Luft
  - Vollblock
  - `s` = `slab[type=top]`
  - `L` = `stairs[facing=west,half=top]`, nur links der Mitte
  - `R` = `stairs[facing=east,half=top]`, nur rechts der Mitte
- Auf der Ost-West-Achse gilt `north`/`south`.
- Die unterste Zeile ist die erste volle Öffnungszeile.
```
RUNDBOGEN W5            SPITZBOGEN W7           TUDOR W7 (Stich 2,5)     KORBBOGEN W7 (Stich W/3)
# # # # # # #           # # # # # # # # #       # # # # # # # # #        # # # # # # # # #
# # L s R # #           # # # L . R # # #       # # # s s s # # #        # # # L s R # # #
# L . . . R #           # # L . . . R # #       # L . . . . . R #        # L . . . . . R #
# . . . . . #           # # . . . . . # #       # . . . . . . . #        # . . . . . . . #
                        # L . . . . . R #
                        # . . . . . . . #
```
- Der Rundbogen W5 hat drei Kurvenzeilen für r = 2,5 und ist runder als das einzeilige Muster der Altnotiz.
- Der Spitzbogen endet im offenen Scheitelschlitz.
- Tudor und Korb unterscheiden sich erst ab W ≥ 9 deutlich (berechnet).

**Kielbogen als Verdachung (Einschätzung)**
```
Ansicht, Verdachung in d=+1 über einem W3-Rundbogen in d=0
Legende: e = end_rod oder stone_brick_wall, u = *_stairs[facing=east,half=bottom], v = *_stairs[facing=west,half=bottom],
K = chiseled_stone_bricks (Schlussstein)
x:     -1  0  1  2  3
y+2     .  .  e  .  .
y+1     .  u  K  v  .
y       #  L  s  R  #
```

**Archivolte (Einschätzung)**
- Außenbogen W+2 mit Ring 1 in d = +1 (`accent`/`roofTrim`).
- Kämpfer: je ein `*_slab[type=top]` in d = +1 am Bogenansatz.
- Schlussstein: ein `chiseled_*`-Block, maximal einer pro Öffnung.

**Arkade:** Modul Pfeiler + Feld.
- p 1 + W 3 = 4 (`L s R`), Pfeiler aus `*_wall`, `quartz_pillar` oder `stripped_*_log[axis=y]`.
- p 2 + W 5 = 7.
- Darüber eine Schattenfuge `*_slab[type=top]` in d = +1.
- Am Tambour als Blendarkade in d = −1 zwischen Lisenen.

**Gewölbe andeuten** (Durchgänge, Torhaus, Arkade)
```
Querschnitt Durchgang 3 breit: q = *_stairs[half=top, facing zur jeweiligen Wand] (Hohlkehle, belegt [23]), s = *_slab[type=top]
W W W W W
W q s q W
W . . . W
```
Alle 3–4 Blöcke eine Gurtrippe aus `stripped_*_log` quer (Einschätzung).

**Wirkung:** mittel · **Aufwand:** niedrig bis mittel · **Stile:** Spitzbogen: medieval, fantasy; Tudor: medieval_tudor, rustic; Korbbogen: mediterranean, Torhäuser; Kielbogen: fantasy. **Quellen:** [23] [24] [43] [44] [52].

---

### T17 Treppige Kreise vermeiden

**(1) Durchmesser nach Laufsequenz (berechnet).** Zellen je Zeile im NO-Quadranten des dünnen Rings bis 45°. Die erste Zahl zählt bei ungeradem D die Mittelspalte mit.

| D | Sequenz | Wirkung |
|---|---|---|
| 7 | 2, 1 | Rundquadrat (pixelcircles: „below about 7 … rounded square") |
| 9, 11, 14 | 3, 1 | **Achteck** |
| 10, 12 | 2, 2, 1 | rund |
| 13, 15, 16, 18 | 3, 2, 1 | **rund** |
| 17, 20 | 3, 2, 2, 1 | rund |
| 19, 21 | 4, 2, 1 | rund |
| 22, 24 | 3, 3, 1 | Kante |
| 23, 25, 26, 28 | 4, 2, 2, 1 | rund |
| 27, 30 | 4, 3, 1, 2 | **Buckel** |
| 29, 31 | 4, 3, 2, 1 | sehr rund |

- **Regel:** Die Sequenz steigt nicht, und auf einen Wert ≥ 3 folgt keine 1.
- **Leiter für den Generator:** 7 (bewusst achteckig), 13, 15, 19, 21.
- Mit Krone auf K1 und Sektorregel ist jede Größe symmetrisch. Ohne Sektorregel passt D+2 ∈ {9, 15, 17, 21, 23} zu `battlementSymmetric`.
- D 9 und 11 als Achteckturm behandeln (T13).

**(2) Horizontal glätten** (Bänder, Traufen, Kuppel, Kegel)
- Gerade Läufe: Mitte voll, Flanken als Treppe. Einzelne Diagonalzellen werden Außeneck-Treppen [15], Treppen sitzen auf den äußeren Stufen [2].
- Mit dickem Ring und Auflöser ist das heute schon richtig (Altnotiz, Regel 3).

**(3) Senkrechte Wände** (Einschätzung): Treppen glätten hier nicht. Profis lenken das Auge ab:
- Lisenen bzw. Rundstäbe genau in die Kerben (T5).
- Texturcluster größer als eine Stufe (T6).
- Ab D 13 bauen.

**(4) Grate auf Kegeln:** Die „Reißverschlüsse" entstehen an den Diagonalen, wo `ringFacing` bei Gleichstand die z-Achse wählt. Streifen (T9) oder Rippen auf den 4 Diagonalen in Kontrastmaterial (T12) beruhigen das Bild (Einschätzung).

**Wirkung:** hoch · **Aufwand:** niedrig · **Stile:** alle. **Quellen:** [2] [4] [15]; Altnotiz; berechnet.

---

## Proportionen nach Turmtyp

| Typ | D | Schaft H | Helm | Quelle |
|---|---|---|---|---|
| Erkertürmchen | 4–5 | 3–5 über dem Kragkegel | Kegel 2–2,5·D_R | Einschätzung nach [34][36] |
| Eck- oder Treppenturm am Haus | 7 (9 als Achteck) | Traufe + 1–2 Geschosse | Kegel 1,5·D_R oder Krone | Einschätzung |
| Wachturm | Basis 3–5 | 10–25 | Plattform 2 Reihen auskragend, Licht oben | [9] |
| Wachturm achteckig | 9–11 | 15–20 | offen nach 4 Seiten | [1] |
| Bergfried | 13–15 | 25–35 | Krone T1 + Helm T10 | 20–30 m hoch [51] |
| Zaubererturm | 9–13 | H/D 3–4 | konkaver Kegel 1,5–2,5·D_R mit Knick | [14], Altnotiz |
| Leuchtturm | 13 → 9 | – | Galerie +4, Laterne 2 schmaler und 4 hoch | [3] |
| Kuppelturm | 9–15 | Tambour 2–4 | ⌈D/2⌉ + Laterne | [2] |
| Eckturm der Burgmauer | höher als die Mauer, Wand 2 dick | – | Kegel mit Laterne als Spitze | [11] |

- „Four identical corner towers make a fort, not a castle" [10].
- Unter H/D ≈ 1,5 wirkt ein Turm wie ein Silo, über 5 wie ein Schornstein (Einschätzung, vgl. [8]).

---

## Anschluss an Häuser

1. **Lage:** Die Turmmitte liegt auf oder diagonal vor der Ecke, mindestens ½ D steht vor (Altnotiz; `plan.ts:358–394` macht das schon).
2. **Höhe:** Die Turmkrone liegt ≥ 1 Geschoss über dem First. Sonst bleibt der Turm klar darunter (Treppenturm). Gleich hoch wirkt unentschieden (Einschätzung).
3. **Linien laufen durch:** Sockeloberkante, Geschossband bzw. Jetty und Traufe des Hauses wiederholen sich am Turm als Band (behebt S3, Einschätzung).
4. **Material:**
   - Turmsockel = Haussockel.
   - Schaft = Hauswand oder eine Stufe dunkler.
   - Dach = Hausdach oder ein gewollter Akzent („one verdigris copper helm" [11]).
   - In Fachwerkstilen trägt der Turm das Fachwerk oben (T15).
5. **Dachanschluss:** Die Dachtreppe endet 1 Zelle vor dem Ring, die Fuge füllen `roofTrim`-Vollblöcke oder Platten (Kehlrinne). Alternativ ein Anschlussring `*_stairs[facing=→M,half=top]` in d = +1 knapp über der Dachfläche (Einschätzung, behebt S4).
6. **Kleine Häuser (W < 13):** besser ein Erkertürmchen D 5 im OG als ein Rundturm D 7 (Einschätzung).

---

## Eckig, rund oder achteckig

| | Eckig | Achteckig | Rund |
|---|---|---|---|
| Anschluss an Mauer/Haus | am einfachsten, ohne Eckspalten (Altnotiz) | gut | Pixelstufen |
| D ≤ 11 | streng | wirkt rund [4] | wirkt ohnehin achteckig |
| D ≥ 13 | wuchtig | facettiert | rund |
| Dächer | Zelt, Rheinischer Helm [22], Broach, Walm/Pagode | Achteckpyramide, Kuppel | Kegel, Kuppel, Zwiebel, Glocke |
| Stile | japanese/cherry (Yagura), modern, Torhaus | nordic, Wachturm, mediterranean | medieval, fantasy, mediterranean |

Bei japanese und cherry wird aus dem Wunsch „Rundturm" ein eckiger oder achteckiger Turm mit gestuften Walmdächern, samt Hinweis (Einschätzung).

---

## Stil-Matrix (Daten-Vorschlag)

| Stil | Krone | Helm (Gewicht) | Dach | Spitze |
|---|---|---|---|---|
| medieval | T1-A/B, Zinnen T2 | Zinnen + Helm T10 (3), Kegel mit Knick (2), nur Zinnen (1) | `deepslate_tiles` + Streifen `polished_deepslate` | `waxed_lightning_rod` |
| fantasy | T1-B, Erkertürmchen | konkaver Kegel mit Knick (3), Zwiebel/Welsch (2), Kegel + Fachwerk-OG (2) | Palette oder Kupfer | `end_rod` |
| rustic | Hurde T1-D | Kegel H ≈ D_R | `dark_oak_planks` | Zaun |
| nordic | Hurde/keine | Knickhelm oder Glocke aus Holz (3), Achteck (2) | `dark_oak`, Kante aus `spruce_trapdoor` | `waxed_lightning_rod` |
| mediterranean | T1-A mit Platten | Kuppel auf Tambour (3), flacher Kegel (2) | `smooth_quartz_stairs` bzw. `brick_stairs` | Laterne |
| modern | Attika aus Platten | flach | – | – |
| japanese/cherry | – | eckig/achteckig, gestufte Walmdächer | – | – |

---

## Fehler, die Profis vermeiden

1. **Reifenstapel:** gleiche Gesimse an jedem Geschoss (C3) [8].
2. **Konsolen ohne Last** (C2): Kragsteine tragen immer etwas [53].
3. **Zahnlücken:** ein Merlonmuster für einen anderen Ring als den gebauten (C1).
4. **Pilzkuppel:** breiter als der Tambour (C8) [2].
5. **Nadelstummel:** eine Säule aus Dachvollblöcken als Spitze (C10).
6. **Ein Material über 20+ Blöcke** [17], ebenso horizontale Sedimentstreifen statt Gradient [18].
7. **Aufkleberfenster** [1], alle Fenster gleich groß.
8. **Flache Rahmen vor gekrümmter Wand** (C13).
9. **Achteck-Raster als „rund"** (D 9/11 mit Kegel).
10. **Verjüngung mit Paritätssprung:** nur D−2 je Stufe [1].
11. **Vier identische Türme** [10].
12. **Zu viel Licht:** „a single lantern on the balcony" [13]. Lichter gehören in die Maschikuli-Lücken, nicht flächig auf den Schaft.
13. **Tiefe ohne Struktur** „looks arbitrary" [19].
14. **Lange gleiche Läufe** [19].
15. **Ungewachstes Kupfer:** Blitzableiter und Kupfer verändern sich im Spiel. Nur `waxed_*` verwenden [27][28].

---

## Empfehlungen für den Generator

Nach Priorität:

1. **Krone (T1, T2)**
   - Was: K1-Konsolen auf T−1, Brüstung auf K1 (T bis T+1), Merlone über Sektoren auf T+2, Deck `filled(D)` auf T. Varianten A–D als `RoundSpec.crown`.
   - Wo: `roundTower.ts:119–137`, `:197–206`; neue Funktion `sectorBattlements(ring)` in `geometry/towers.ts`.
   - Art: Regel, Varianten als Daten.
   - Akzeptanz: Für D 5–21 ist das Muster D4-symmetrisch (Test). Jede Brüstungszelle hat darunter eine Konsole oder eine Maschikuli-Lücke. Merlone und Lücken sind 1–2 breit.
2. **Bänder nach Zonen (T3, T4)**
   - Was: Sockel mit 1–2 Anlaufstufen; Gesimse nach Zonen statt nach Geschossen.
   - Wo: `roundTower.ts:123–132`; Daten `style.tower.bands` (`stair`/`slab`/`flush`).
   - Akzeptanz: Höchstens 1 auskragendes Band je 8 Blöcke Schaft. Nie zwei gleiche Profile übereinander. Am Haus liegen die Bänder auf den y-Werten der Hausbänder.
3. **Höhengradient (T6)**
   - Was: `WeatherFactors.heightFraction` mit Zonengewichten; am Turm `underOverhang` und `drip` setzen. Der Schaft nimmt die Rolle `wall`, `plinth` nur in der Sockelzone.
   - Wo: `style/texturing.ts`, `roundTower.ts:78`, `:113`; Zonengewichte als Palettendaten.
   - Akzeptanz: ≥ 3 Block-IDs in der Wand ab 20 Höhe. Lint gegen Sandwiching (> 50 % des Umfangs zusammenhängend). Unter K1 mindestens 1,5-mal so viel Verwitterung wie im Schaftmittel.
4. **Durchmesser-Leiter (T17)**
   - Was: frei 7, 13, 15, 19 bzw. 21. Am Haus 7, bei W ≥ 21 und Tiefe ≥ 15 die 13. D 9/11 nur als Achteck.
   - Wo: `tower.ts:24–26`, `plan.ts:362`, `:377`.
   - Art: Daten.
   - Akzeptanz: kein runder Turm mit D ∈ {9, 11, 14, 22, 24, 27, 30}. Test der Laufsequenz.
5. **Kuppel (T12)**
   - Was: `dome(d)`, Tambour 2–4, Gesims, Laterne 3/5 mit Kappe und Spitze.
   - Wo: `roundTower.ts:32–41`, `:194–196`.
   - Akzeptanz: Die unterste Kuppelschicht hat den Tambourdurchmesser. Ab D ≥ 9 gibt es eine Laterne. Kein Kuppelblock außerhalb von `filled(D)`.
6. **Kegel (T9)**
   - Was: Profil `kick` (K2 aus Platten), Spitzenregel (höchstens 2 Einzel-Dachblöcke, dann Stiel und Stab), optionaler Streifenring.
   - Wo: `geometry/solids.ts` (`cone`), `roundTower.ts:184–196`; Daten `tower.finial`, `tower.roofStripe`.
   - Akzeptanz: Lint „keine Säule > 2 Dachvollblöcke mit Breite 1". Bei medieval und fantasy steht die Traufe 2 vor der Wand.
7. **Helmtypen (T10, T11)**
   - Was: `RoundRoof` um `spire_parapet`, `onion`, `bell`, `welsch` erweitern. `onionProfile` und `revolve` nutzen. Die Auswahl gewichtet nach der Stil-Matrix.
   - Wo: `plan.ts:79`, `:149–161`; `roundTower.ts`.
   - Akzeptanz: Krone und Helm D−2 bzw. D−4 lassen sich kombinieren, der Wehrgang bleibt ≥ 1 frei. Die Bauch-Unterseite der Zwiebel besteht nur aus Treppen `half=top` (Test).
8. **Fenster und Portal (T7, T8)**
   - Was: Nischenfenster, Bogenkopf, Scharten im EG, Hierarchie. Vorlagen auf Achsläufen zulassen (Breite + 2 ≤ `straightRun`, d ≤ +1 nur auf dem Achslauf). Portal zurückgesetzt oder als Vorbau.
   - Wo: `roundTower.ts:139–169`, `tower.ts:59–64`, `templates/*`.
   - Akzeptanz: Jede Öffnung hat ≥ 1 Tiefe. Kein Vorlagenblock in d = +1 außerhalb des Achslaufs.
9. **Lisenen (T5)**
   - Was: `notchCells(D)`; Formen L1/L2/L3 je Stil.
   - Wo: `geometry/towers.ts`, `roundTower.ts`.
   - Akzeptanz: Lisenen nur in Kerben bzw. auf fensterfreien Achsen, jede berührt flächig eine Wandzelle und endet an einer Konsole.
10. **Erkertürmchen und Achteck (T13, T14)**
    - Was: `house/tourelle.ts`, `geometry/octagon.ts` (Raster, Ring, Pyramide, Broach), `TowerKind` `octagonal`.
    - Wo: neue Dateien, `plan.ts:23`, `:313–336`.
    - Akzeptanz: 0 schwebende Blöcke. Das Achteck hat 8 gleiche Seiten (Test gegen die Tabelle).
11. **Bögen (T16)**
    - Was: `fourCentredArch`, `basketArch`, `ogeeHood`, Option `supersample`. `pointedArch` und `segmentalArch` in Vorlagen nutzen. Archivolte, Kämpfer und Schlussstein als Vorlagenbausteine.
    - Wo: `geometry/arches.ts`, `templates/windows.ts`, `templates/doors.ts`.
    - Akzeptanz: Regressionstests mit den Rastern aus T16. Links nur `west`/`north`, rechts nur `east`/`south`.
12. **Hausanschluss**
    - Was: Kehlrinne bzw. Anschlussring an der Dachfläche, Bänder auf den Hauslinien, gleicher Sockel, Fachwerk-OG statt Sockelrolle.
    - Wo: `plan.ts:358–394`, `roof/roofEngine.ts`, `roundTower.ts`.
    - Akzeptanz: Lint „keine Dachtreppe 4-benachbart zur Turmwand ohne `roofTrim` dazwischen". Die Sockeloberkante von Turm und Haus ist gleich.

---

## Quellen

1. https://pixelcircles.com/tower-generator/ – Grundrisse rund/eckig/achteckig, Spitze mit 1 Überstand, Taper paritätstreu, Watchtower achteckig, Fenster aus der Wand geschnitten.
2. https://pixelcircles.com/dome-generator/ – Kuppel gleich Turmdurchmesser, Streifen, Treppen außen, flache Kuppel, Kuppel auf Quadrat.
3. https://pixelcircles.com/lighthouse-generator/ – Galerie +4, Laterne −2/4 hoch, Bänder alle 6, Dach dunkler, Taper 13 → 9.
4. https://pixelcircles.com/hexagon-generator/ – Achteckraster, gleiche Seiten, „looks rounder than a square".
5. https://pixelcircles.com/roof-generator/ – Neigungen, 1 Block Überstand, Treppe mit der hohen Seite zum First.
6. https://pixelcircles.com/gradient-generator/ – Graustufenfolge, Türme „each floor one step lighter".
7. https://pixelcircles.com/cylinder-generator/ – Wandstärke 1–8, Burgturm mit 2er-Wand, Presets.
8. https://guide.astroworldmc.com/how-to-build-a-tower – gegen den Schornstein-Look: Fuß, Bänder alle paar Geschosse, Krone 1 auskragend.
9. https://guide.astroworldmc.com/how-to-build-a-watchtower – Basis 3–5, Schaft 10–25, Plattform 2 Reihen überstehend.
10. https://guide.astroworldmc.com/how-to-build-a-medieval-castle – „Four identical corner towers make a fort", Nischenportal, Maschikulis.
11. https://guide.astroworldmc.com/how-to-build-a-grand-castle – Rundtürme 2 dick, Kegel mit Laternenspitze, ein Kupferhelm.
12. https://guide.astroworldmc.com/minecraft-building-guides – Übersicht der Turm-, Kreis- und Burgleitfäden.
13. https://buildingguide.app/tutorials/medieval-tower – Mischung Steinziegel/Stein/Andesit, gestreiftes Dach, Kegel, eine Laterne.
14. https://archive.oreate.ai/column/building-a-tower-in-minecraft-from-circular-bases-to-functional-spires – Dreiteilung, Strebepfeiler, ausgestellte Krone, Kegelschichten 2/3/4 (Blog, mittlere Qualität).
15. https://www.minecircles.com/blog/smooth-circles-stairs-slabs-minecraft/ – Flankentreppen, Außeneck-Treppen, Kopfüber-Treppen unter Überhängen (Blog, mittlere Qualität).
16. https://minecraftwiki.wiki/builds/minecraft-medieval-building-guide/ – Ecktürme D 7 mit Fichtenkegel, Strebepfeiler alle 5–7, Gradient mossy → stone → cracked.
17. https://www.game.guide/minecraft-medieval-building-style – Ein-Stein-Türme „look horrible", auskragende Zinnen.
18. https://www.westeroscraft.com/docs/building/fundamentals/gradients – Helligkeit vor Farbe, Cluster, Splattering/Smallpox/Sandwiching, Orte der Verwitterung.
19. https://westeroscraft.com/docs/building/fundamentals/exteriors – Tiefe soll der Struktur dienen, keine langen gleichen Läufe.
20. https://www.westeroscraft.com/docs/building/fundamentals/layout-foundation – Steinsockel, kein sichtbarer Boden.
21. https://minecraft.wiki/w/Tutorial:Color_palette – Gradient aus 3–4 Blöcken, Kontrast für Rahmen.
22. https://minecraft.wiki/w/Tutorial:Roof_types – Rheinischer Helm: ungerade Breite, zwei Treppenrichtungen.
23. https://minecraft.wiki/w/Tutorial:Walls_and_buttresses – Strebepfeilertypen, verjüngte Mauern, Kopfüber-Treppen als Hohlkehle.
24. https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions – Fenstertiefe, Rahmen oder Bogen.
25. https://minecraft.wiki/w/Tutorial:Architectural_terms – Konsole, Corbelling, Strebepfeiler.
26. https://minecraft.wiki/w/Trapdoor – Zustände, kein Halt nötig.
27. https://minecraft.wiki/w/Lightning_Rod – Zustände, Oxidation und Wachs seit 1.21.9.
28. https://minecraft.wiki/w/Copper_Lantern – IDs der Kupferlaternen (1.21.9), Licht 15.
29. https://minecraft.wiki/w/Copper_Bars – IDs und Verbindungen der Kupfergitter (1.21.9).
30. https://www.minecraftforum.net/forums/minecraft-java-edition/creative-mode/367908-suggestions-for-a-castle-staircase – Burgtreppen, Kopfüber-Treppen mit Platten als Bogen.
31. https://www.grabcraft.com/minecraft/medieval-brick-tower/towers – Beispielturm 19×46×19 (H/B ≈ 2,4).
32. https://arxiv.org/abs/2103.14950 – GDMC-Bericht: Ästhetik „lacking in variability", Maßstabsfehler.
33. https://en.wikipedia.org/wiki/Machicolation – Öffnungen zwischen den Konsolen einer Brüstung.
34. https://en.wikipedia.org/wiki/Bartizan – auskragendes Ecktürmchen auf gestuften Kragsteinen.
35. https://en.wikipedia.org/wiki/Turret_(architecture) – Turret ohne Bodenkontakt, Konsolen, Dach oder Zinnen.
36. https://en.wikipedia.org/wiki/Scottish_baronial_architecture – Pepperpots mit Kegeldach, Dachkammer auf Rundturm, Treppengiebel.
37. https://en.wikipedia.org/wiki/Battlement – Merlon/Lücke, Scharten, Schwalbenschwanz, irische Stufenzinne.
38. https://en.wikipedia.org/wiki/Corbel_table – Konsolengesims, lombardischer Bogenfries, vier Lagen bei Maschikulis.
39. https://en.wikipedia.org/wiki/Arrowslit – Kreuz- und Fischschwanzscharte, Nische, Höhe je Waffe.
40. https://en.wikipedia.org/wiki/Batter_(walls) – Anlauf, Talus, 1:6.
41. https://en.wikipedia.org/wiki/Spire – Broach, Nadelspitze hinter Brüstung, Splay-foot-Traufe.
42. https://en.wikipedia.org/wiki/Onion_dome – breiter als der Tambour, höher als breit.
43. https://en.wikipedia.org/wiki/Tudor_arch – Vierpunktbogen, Tudor mit geraden Seiten.
44. https://en.wikipedia.org/wiki/Three-centered_arch – Korbbogen, Stich ⅓ bis ⅕.
45. https://en.wikipedia.org/wiki/Cupola – kleine Kuppelbekrönung, Laterne.
46. https://en.wikipedia.org/wiki/Drum_(architecture) – Tambour mit Fenstern.
47. https://de.wikipedia.org/wiki/Turmhelm – Knickhelm, Zelt- und Maßwerkhelme, Rheinischer Helm.
48. https://de.wikipedia.org/wiki/Welsche_Haube – geschweifte Teile mit Laternen; Glocken- und Zwiebelhaube.
49. https://de.wikipedia.org/wiki/Zwiebelturm – bauchig-spitz, Kupferblech, Bergische Laternen.
50. https://de.wikipedia.org/wiki/Laterne_(Architektur) – Laterne über dem Scheitelauge, Grundrisse, Tambour.
51. https://de.wikipedia.org/wiki/Bergfried – 20–30 m hoch, Grundrisse, Mauerstärke nimmt nach oben ab, Hocheingang.
52. https://de.wikipedia.org/wiki/Zinne – Breite 0,76–2,35 m, Höhe 1–2 m, Zinnenformen.
53. https://de.wikipedia.org/wiki/Maschikuli – gestufte Kragsteine mit Sturz oder Bogen, Turmkränze, Hurde.
54. https://de.wikipedia.org/wiki/Lisene – Wandvorlage ohne Basis und Kapitell, Rundbogenfries.
55. https://de.wikipedia.org/wiki/Scharwachtturm – Erkerturm auf Konsole an Ecken und Wehrgang.

Repo-intern (nicht gezählt): Altnotiz `kreise_boegen_tuerme.md`; `roundTower.ts`, `tower.ts`, `plan.ts`, `geometry/*.ts`, `texturing.ts`; Screenshots `turm-*.jpg` und `haus-mittelalter-rundturm-erker-balkon-*.jpg`. Die „berechnet"-Werte stammen aus eigenen Node-Skripten nach dem Kreiskriterium der Bibliothek: Kranzringe, Sektorzinnen, Laufsequenzen, Kegel- und Zwiebelprofile, Halbblock-Bögen, Broach-Schichten.
