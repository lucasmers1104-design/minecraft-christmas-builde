# Dachdetails: Traufe, Ortgang, First, Untersicht, Giebelfeld, Gauben und Kamine

Stand 2026-10-23 · Thema 06 · Wie Profis die Ränder, den First, das Giebeldreieck, Gauben und Kamine eines Daches ausbilden und wie der Generator das als Daten und Regeln nachbauen kann.

**Abgrenzung.** Dachformen, Neigungsprofile, Treppen-Ecklogik und Grundrezepte für Überstand und Untersicht stehen in `research_notes/Minecraft Bautechniken für Generator/daecher.md` (im Folgenden „alte Notiz §n“). Sie werden hier nicht wiederholt. Fenstervorlagen gehören zu Thema Fenster, Schnee zu Thema 14, Paletten im Allgemeinen zum Palettenthema. Hier geht es nur um die Details am Dach.

**Konventionen.** +x = Ost, +z = Süd, y = oben. Treppen-`facing` = Seite der hohen Hälfte (Aufstiegsrichtung). Für offene Falltüren gilt: Die Platte liegt an der dem `facing` **gegenüberliegenden** Zellseite (minecraft.wiki Trapdoor; deckt sich mit `fenster_tueren_details.md`). Die Tiefe d zählt relativ zur jeweils betrachteten Wandebene (Traufwand bzw. Giebelwand, bei Fachwerk die Rahmenebene): −1 innen, 0 Wand, +1/+2 davor. Alle Zustände ohne Angabe: `shape=straight`, `waterlogged=false`, `powered=false`. Treppenformen und Verbindungen von Zäunen und Mauern setzt der Zustandsauflöser. In den Skizzen steht deshalb nur `facing`/`half`.

**Beispielhaus A** (für fast alle Skizzen): Giebelwand West in x=0, Traufwände in z=0 (Nord) und z=6 (Süd), oberste Wandlage y=4, First entlang x, Überstand 1, 45°. Genau so baut `roofEngine.ts` heute: Dachtreppen z=−1 → y4, z=0 → y5, z=1 → y6, z=2 → y7, Firstspalte z=3 mit Stufe in y8, die Südseite gespiegelt. Die Ortgangspalte liegt in x=−1 (d=+1). **Beispielhaus B** ist dasselbe mit 9 Tiefe (z=0…8), First z=4 in y9. Sein Giebeldreieck hat die Reihen y5: z1–7, y6: z2–6, y7: z3–5, y8: z4.

---

## Kurzfassung

Nach Wirkung sortiert:

1. **Die Kontrastkante ist zu groß, zu hell und zu dick.** Heute belegt sie die ganze Traufreihe und **alle** Überstandsspalten am Ortgang, beim Beispiel 11×9 also 36 % der Dachspalten und beim nordischen Haus mit 2er-Überstand 43 %. Die Palettenregel für Akzente nennt höchstens etwa 10 % der sichtbaren Flächen [53]. Profis setzen den Kontrast nur am Ortgang, genau 1 Spalte breit, als dünnes Brett. Die Traufreihe bleibt im Dachmaterial. (R01–R03)
2. **Das Windbrett (Ortgang) ist aus Holz und aus einem Guss:** Treppe, Kopfüber-Treppe und geschlossener Apex in **einer** Holzart, oder ein Falltür-Brett von 3/16 Dicke. Reale Windbretter sind Bretter, die die Pfettenenden verdecken [16][42]. Eine Steinkante gibt es nur als Giebelmauer **über** dem Dach (Schildgiebel, Staffelgiebel) [28][43]. (R01, R02, R05)
3. **Kein leeres Giebeldreieck.** Profis setzen den Giebel 1 Block zurück, damit eine Schattenfuge entsteht [51], und geben ihm mindestens ein Element: Fachwerk mit Königspfosten und Kehlbalken, Ochsenauge [45], Eulenloch oder Lüftungsschlitz [44], Verschalung oder eine Giebellaterne. Der Generator sammelt die Giebelzellen bereits (`gableCells`), nutzt sie aber nirgends. (R13–R16)
4. **Der First bleibt flach**, als Stufe (+0,5) oder Mauerrolle (+0,875) [15]. Ein 1,5 Blöcke hoher First passt nur zu japanischen Bauten. Dafür bekommen die **Firstenden** einen Abschluss: Firstpfahl aus Zaun [62], Blitzableiter oder Endstab [54][64], Kreuzbretter bzw. Pferdeköpfe [25][43] oder aufgebogene Enden (Onigawara) [32]. (R10, R11)
5. **Der Kaminkopf ist breiter als der Schaft, das Feuer liegt versenkt.** Kopfüber-Treppen kragen aus, darüber liegt ein Kranz, das Lagerfeuer ist von allen 4 Seiten verdeckt, darüber bleiben mindestens 3 Luftblöcke [7][49]. Der Schaft ist 2×1 oder 2×2. Ein 1×1-Schaft bekommt nur eine Falltür-Manschette [74]. (R21–R23)
6. **Echte Gauben sitzen hinter der Traufe** [39], damit die Traufe durchläuft. Sie stehen auf den Fensterachsen [41] und haben Maße je Typ: Giebelgaube 3/5 breit, Schleppgaube mit Δ=1, Fledermausgaube mit Höhe : halbe Breite = 1:3 [40]. Der heutige Typ ist eigentlich ein Zwerchhaus. (R18–R20)
7. **Ein Überstand ab 2 Blöcken braucht sichtbares Tragwerk:** Pfettenköpfe unter dem Ortgang [26][19] und bei 3 Blöcken ein Kastengesims [21]. Ohne sie wirkt der breite Ortgang wie eine schwebende Platte. (R04, R09)
8. **Traufwiederkehr und Giebelfußgesims** lassen Stein- und Putzgiebel wie einen Dreiecksgiebel wirken [17]. Sie kosten wenig. (R06)
9. **Dachflächen werden gemischt:** 2–3 Treppen derselben Familie mit ΔL* ≤ 10 als Cluster, Moos und Laub in den unteren Reihen und an Ecken [59][64]. Kante und First bleiben rein. Heute wählt `resolveInput.ts:64` pro Rolle ein einziges Material. (R24)
10. **Grate bei Walmdächern** werden im Firstmaterial betont, wie Gratziegel [36]. (R12)
11. **Traufkonsolen im Ständerrhythmus** statt nur eines durchgehenden Gesimses verbinden Dach und Fachwerk. (R08)
12. **Licht schmilzt Schnee:** Schnee schmilzt ab Blocklicht 12 [12]. Lagerfeuer und Laterne (Licht 15) schmelzen ihn also bis 3 Schritte Entfernung, der Endstab (Licht 14) bis 2 [6]. Auf normalen Treppen und unteren Stufen liegt nie Schnee. Details stehen in Thema 14.
13. **Rinnen und Regenketten** sind seltene Stil-Akzente, etwa die Regenkette aus `iron_chain` an japanischen Traufecken. Sie gehören nicht zum Standard.

---

## Schwächen des aktuellen Generators

**Kante (Traufe und Ortgang)**
- `roofEngine.ts:248–249`: `trim = l.d === 0 || l.verge`. Damit stehen die komplette äußerste Reihe **und** jede Spalte außerhalb der Giebelwand im Kantenmaterial. `verge` ist in `roofEngine.ts:197` als `x < s.x0 || x > s.x1` definiert, umfasst also **alle** Überstandsspalten. Bei `overhang` 2–3 (Nordisch `styles.ts:156`, Japanisch `styles.ts:185`) wird die Kante 2–3 Blöcke breit. Im Screenshot `haus-nordisch-gross-ohne-thema.jpg` ist das als breites, helles Ortgangband sichtbar.
- Die Kante hat **dieselbe Geometrie wie die Fläche** (`columnPieces` mit `pieceState`, Z. 289). Sie bildet keine eigene Form und keinen Vorsprung, sie ist nur umgefärbt. Am Ortgang entsteht so ein Treppenband mit doppelter Sägezahnlinie.
- Das Ortgangbrett (`roofEngine.ts:366–369`) besteht aus `soffit`-Material, die Treppen darüber aus `trim`. In `medieval_stone` (`palettes.ts:79–82`) liegt also `stone_bricks` auf `spruce_planks`: zwei Materialien in einem 1 Block dicken Brett. So zeigt es `haus-mittelalter-gross-ohne-thema.jpg`.
- Die Helligkeitssprünge sind zu groß (L* aus `textureStats.ts`):

  | Palette | Dach (L*) | Kante (L*) | ΔL* |
  |---|---|---|---|
  | `medieval_stone` | `deepslate_tiles` (22,9) | `stone_bricks` (51,1) | **28** |
  | `cherry_white` | `cherry_planks` (76,9) | `dark_oak_planks` (19,8) | **57** |
  | `mediterranean_white` | `bricks` (46,9) | `smooth_quartz` (91,8) | **45** |
  | `mediterranean_warm` | `bricks` (46,9) | `sandstone` (81,8) | 35 |
  | `modern_white` | `polished_deepslate` (30,6) | `black_concrete` (2,9) | 28 |
  | Holzpaletten | `dark_oak` ↔ `spruce` | | 18,5 |

- Unter dem Firstblock bleibt an der Ortgangspalte eine **Kerbe**: `roofEngine.ts:362` überspringt Spalten ohne `facing`, also die Firstspalte. Bei Beispielhaus A bleibt (x=−1, z=3, y=7) leer, und man sieht in die 1 Block tiefer liegende Giebelfüllung.

**First**
- `plan.ts:203` legt `ridgeStyle` fest im Code ab, nicht als Stildaten. Mittelalter und Japanisch bekommen `block_slab`, also einen Vollblock plus eine Stufe, 1,5 Blöcke über der Dachfläche. Im mittelalterlichen Screenshot wirkt das wie eine dunkle „Firstmauer“.
- Es gibt keine Firstenden und keine Spitzen. Die Variante `wall` (Z. 277–282) setzt die Mauer **auf** einen Vollblock und wird dadurch fast 2 Blöcke hoch.

**Giebelfeld**
- `roofEngine.ts:392` füllt das ganze Dreieck mit **einem** Block. `result.gableCells` (Z. 406) wird zurückgegeben, aber im Haus-Generator nirgends verwendet: Weder Fenster noch Balken noch Lüftungen landen im Giebel.
- `plan.ts:423` setzt `gableRecess: false` fest. Die vorhandene Rücksprung-Logik (Z. 409–418) läuft also nie.
- Bei Fachwerkhäusern liegt die Giebelfüllung in der Rahmenebene (`plan.ts:410–414` mit `f = 1`). Das Dreieck ist so eine glatte Fläche bündig mit den Ständern, ohne eigenes Holzwerk.

**Gauben** (`components.ts:24–77`)
- Es gibt nur einen Typ: 3×3, Front in der Rahmenebene der Traufwand (`z = section.z0`, Z. 33). Das ist bautechnisch ein Zwerchhaus [41], keine Gaube. Die Traufe wird an jeder Gaube unterbrochen.
- Gauben entstehen nur auf der Nordseite, nur bei First entlang x und nur ab Spannweite 9 (Z. 25–27). Ihre Positionen sind gleichmäßig verteilt (Z. 32) und hängen nicht an den Fensterachsen der Fassade.
- Das Fenster ist 1×1 (Z. 73: eine Scheibe zwischen Brüstung y+0 und Balken y+3).
- Das Gaubendach erbt `trim`, `soffit: true` und den Überstand 1 (Z. 39–52). Bei 5 Spalten Dachbreite sind 2 davon Kontrastkante. Im Screenshot `haus-mittelalter-weihnachten.jpg` wirken die Gauben deshalb wie graue Rahmen bzw. eingeschnittene Kerben. Wo Gaubendach und Hauptdach sich schneiden, sind dunkle Lücken zu sehen. Vermutlich fehlen dort Wangen oberhalb von `wallTop+3` (Z. 62–70). Der Lint „Dach ohne Lücken“ prüft nur, ob jede Spalte belegt ist, nicht senkrechte Löcher.

**Kamin** (`components.ts:135–164`)
- Der Schaft ist 1×1 (Z. 143, 156). Das Lagerfeuer bildet den obersten Block und ist offen sichtbar (Z. 144, 162): ein „brennender Block auf einem Stab“, so in allen Screenshots.
- Es gibt keinen Kopf, keine Auskragung und keinen Materialwechsel oben. Die Verwitterung (`weathered`) nimmt nur mit der Höhe ab.
- Der Außenkamin bekommt eine 2 breite Basis bis zur ersten Geschossdecke und eine Schultertreppe (Z. 158–161). Das ist gut, darüber bleibt aber nur ein 1×1-Stab.

**Dachfläche**
- Pro Rolle wird genau ein Material gewählt (`resolveInput.ts:64`). Die Verwitterung in `texturing.ts:1–13` gilt laut Kopfkommentar nur für Wände. Große Dächer haben deshalb eine einzige Farbe (siehe Screenshots Kirschblüte und Mittelalter).

---

## Techniken und Regeln

Bewertung: **W** = Wirkung, **A** = Aufwand für den Generator. Stile: med, fan, rus, nor, jap, che, mod, mtl.

### R01 Windbrett aus einer Holzart, Apex geschlossen

- **Beschreibung:** Das Ortgangbrett besteht aus Dachtreppe, Kopfüber-Treppe darunter und einem Vollblock im Apex, alles im **gleichen** Holz. Es wirkt als eine durchgehende Diagonale von 1 Block Dicke, wie ein Bargeboard [16]. Der Apex-Block setzt die Untersicht-Diagonale fort: Unterkante y7,0 zwischen 6,5 und 6,5. Damit verschwindet die Kerbe.
- **Blöcke:** `<holz>_stairs[half=bottom]` oben, `<holz>_stairs[half=top]` darunter (facing weg vom First), `<holz>_planks` im Apex.
- **Maße:** nur die äußerste Ortgangspalte (x = X0 bzw. X1). Bei Überstand ≥ 2 bekommen die inneren Spalten Dachmaterial und Bretter im `soffit`-Material (R03).
- **Skizze:** Ansicht West, Ebene x=−1 (d=+1), Beispielhaus A. Legende: `/` = `spruce_stairs[facing=south,half=bottom]`, `\` = `spruce_stairs[facing=north,half=bottom]`, `<` = `spruce_stairs[facing=north,half=top]`, `>` = `spruce_stairs[facing=south,half=top]`, `B` = `spruce_planks`, `f` = Firstkappe (R10).
  ```
  y\z  -1  0  1  2  3  4  5  6  7
   8    .  .  .  .  f  .  .  .  .
   7    .  .  .  /  B  \  .  .  .
   6    .  .  /  <  .  >  \  .  .
   5    .  /  <  .  .  .  >  \  .
   4    /  <  .  .  .  .  .  >  \
  ```
- **Einsatz:** alle Satteldach-artigen Formen (gable, half_hip, gambrel, saltbox, a_frame) und Gauben. Holz für med, rus, nor, fan, che. Für jap `dark_oak`, für mod `polished_deepslate`-Treppen.
- **W/A:** hoch / niedrig (Material des Bretts = `trim` statt `soffit`, dazu der Apex).
- **Quellen:** [16] [42] [57]; Untersichtsbrett: alte Notiz §3; Apex: Einschätzung.

### R02 Falltür-Windbrett (3/16 dick)

- **Beschreibung:** Offene Falltüren in d=+2 legen sich mit der Platte an die Stirnseiten der Ortgangspalte. Sie verdecken das L-Profil der Treppen und ergeben ein dünnes, gestuftes Brett. Falltüren brauchen keinen Halt [4].
- **Blöcke:** `dark_oak_trapdoor[facing=west,half=bottom,open=true]` am Westgiebel (Platte an der Ostkante), `…[facing=east,…]` am Ostgiebel.
- **Maße:** pro Treppen- und Brettzelle der Ortgangspalte eine Falltür (2 Zellen hoch). Als Variante „schmal“ nur die Treppenzellen (1 Zelle hoch).
- **Skizze:** Ansicht West, Ebene x=−2 (d=+2), Beispielhaus A. `T` = `dark_oak_trapdoor[facing=west,half=bottom,open=true]`.
  ```
  y\z  -1  0  1  2  3  4  5  6  7
   7    .  .  .  T  T  T  .  .  .
   6    .  .  T  T  .  T  T  .  .
   5    .  T  T  .  .  .  T  T  .
   4    T  T  .  .  .  .  .  T  T
  ```
- **Einsatz:** ideal, wenn das Dach aus Stein, Schiefer oder Kupfer besteht und die Kante dunkles Holz sein soll (med Stein, che, fan). Wegen der geringen Dicke verträgt diese Kante einen größeren Kontrast (Kontrast-mal-Dicke-Regel, Abschnitt 5.1).
- **W/A:** hoch / niedrig.
- **Quellen:** [4] [57] („trapdoors along the gable edges as decorative trim“); [64] (flach gelegte Falltüren brechen die Stufen auf); Ausrichtung nach [4].

### R03 Ortgang genau 1 Spalte breit, Traufreihe im Dachmaterial

- **Regel:** Unabhängig vom Überstand trägt nur die äußerste Ortgangspalte das Kantenmaterial. Die Traufreihe (d=0) bleibt im Dachmaterial oder bekommt höchstens ein Stirnbrett (R07). Die Kontrastspalten machen ≤ 15 % der Dachspalten aus.
- **Skizze:** Draufsicht Nordwestecke bei Überstand 2. `O` = Ortgangspalte (Kante, Brett nach R01/R02), `r` = Dachfläche, `e` = Traufreihe (Dachmaterial), `W` = Wand darunter.
  ```
  z\x  -2 -1  0  1  2
  -2    O  e  e  e  e
  -1    O  r  r  r  r
   0    O  r  W  W  W
   1    O  r  W  .  .
  ```
- **Einsatz:** alle Stile. Ausnahme jap und Pagode: Dort darf die Traufreihe eine farbige Kante tragen (rote Traufe), aber nur 1 Reihe.
- **W/A:** hoch / niedrig (`roofEngine.ts:248` anpassen).
- **Quellen:** [53] (Akzente unter ca. 10 %, „for trim … roof edges“); [70] (Trim = Rand in anderer Farbe); Prozentgrenze: Einschätzung.

### R04 Pfettenköpfe unter dem Ortgang (Überstand ≥ 2)

- **Beschreibung:** Waagerechte Stammenden ragen aus der Giebelwand bis unter das Windbrett. Sie zeigen, was den Ortgangüberstand trägt: Pfetten bzw. Outlooker [19], wie bei Chalets mit „exposed construction beams, including large brackets“ [26].
- **Blöcke:** `stripped_spruce_log[axis=x]` (an einem Nord-Süd-Giebel `axis=z` bei First entlang z); für nor/rus `spruce_log`.
- **Maße und Rhythmus:** je ein Kopf unter dem Apex (Firstpfette) und in jeder 2. Reihe abwärts (Mittelpfetten). Die unterste Reihe bleibt frei. Länge = Überstand (x = −1 … −og), optional zusätzlich in der Giebelebene x=0 („durchgesteckt“). Bei Spannweite 7–9 sind es 3 Köpfe, ab 11 fünf, immer symmetrisch.
- **Skizze:** Ansicht West, og=2, Ebenen x=−1 und x=−2 gleich belegt. Die Dachtreppen liegen jetzt bei z=−2 y3 bis z=2 y7, der First bei z=3 y8. `P` = `stripped_spruce_log[axis=x]`, sonst wie R01.
  ```
  y\z  -2 -1  0  1  2  3  4  5  6  7  8
   8    .  .  .  .  .  f  .  .  .  .  .
   7    .  .  .  .  /  B  \  .  .  .  .
   6    .  .  .  /  <  P  >  \  .  .  .
   5    .  .  /  <  .  .  .  >  \  .  .
   4    .  /  <  P  .  .  .  P  >  \  .
   3    /  <  .  .  .  .  .  .  .  >  \
  ```
- **Einsatz:** nor, rus, jap (dort dunkel), fan-Chalet; Überstand ≥ 2.
- **W/A:** mittel–hoch / niedrig.
- **Quellen:** [19] [26] [27] [46] (Alpen: sehr breite Überstände); Rhythmus: Einschätzung.

### R05 Schildgiebel und Staffelgiebel (Stein über dem Dach)

- **Beschreibung:** Die Giebelmauer läuft 1 Block über die Dachfläche hinaus und bekommt eine Abdeckung. Am Giebel gibt es dann keinen Überstand. Das ist die einzige bautechnisch plausible „Steinkante“ [28][43]. Am Fuß sitzt ein Kragstein über dem Traufüberstand.
- **Blöcke:** Mauer `stone_bricks` (bzw. `bricks`, `tuff_bricks`), Abdeckung `stone_brick_stairs[half=bottom]` mit facing hangaufwärts, Apex `chiseled_stone_bricks` oder `stone_brick_slab[type=double]`, Kragstein `stone_brick_stairs[half=top]` mit facing zur Wand. Staffelgiebel: Stufen `stone_brick_slab[type=bottom]`.
- **Skizze Schildgiebel:** Ebene x=0 (Giebelwand d=0), Dach beginnt bei x=1, Beispielhaus A. `M` = Giebelmauer, `w` = vorhandene Wand, `C` = `stone_brick_stairs[facing=south,half=bottom]`, `D` = `…[facing=north,half=bottom]`, `A` = `chiseled_stone_bricks`, `K` = `stone_brick_stairs[facing=south,half=top]` (z=−1) bzw. `[facing=north,half=top]` (z=7).
  ```
  y\z  -1  0  1  2  3  4  5  6  7
   9    .  .  .  .  A  .  .  .  .
   8    .  .  .  C  M  D  .  .  .
   7    .  .  C  M  M  M  D  .  .
   6    .  C  M  M  M  M  M  D  .
   5    C  M  M  M  M  M  M  M  D
   4    M  M  M  M  M  M  M  M  M
   3    K  w  w  w  w  w  w  w  K
  ```
- **Skizze Staffelgiebel** (Stufen 2 breit, 2 hoch, 45°), gleiche Ebene. `▄` = `stone_brick_slab[type=bottom]`.
  ```
  y\z  -1  0  1  2  3  4  5  6  7
   9    .  .  .  ▄  ▄  ▄  .  .  .
   8    .  .  .  M  M  M  .  .  .
   7    .  ▄  ▄  M  M  M  ▄  ▄  .
   6    .  M  M  M  M  M  M  M  .
   5    ▄  M  M  M  M  M  M  M  ▄
   4    M  M  M  M  M  M  M  M  M
   3    K  w  w  w  w  w  w  w  K
  ```
- **Einsatz:** med (Stein, Stadthaus), fan (Hanse- und Märchenstadt), Bahnhof und Markthalle. Nicht bei Holz- und Fachwerkgiebeln.
- **W/A:** hoch / mittel (braucht einen eigenen Ortgang-Überstand og_v = −1).
- **Quellen:** [28] [31] [43] [24] (Staffelgiebel für Zugang zum Kamin).

### R06 Traufwiederkehr (Gable Return) und Giebelfußgesims

- **Beschreibung:** Die Traufe läuft 2–3 Blöcke um die Ecke in den Giebel hinein. Als „Greek Return“ ist sie wie das Dach gedeckt, als „Soffit Return“ ein einfacher Kasten [17]. Durchgehend über die ganze Giebelbreite entsteht ein Giebelfußgesims, das das Dreieck als Giebelfeld rahmt.
- **Blöcke:** `R` = `<dach>_stairs[facing=east,half=bottom]` am Westgiebel (Hochseite zur Giebelwand), `k` = `<soffit>_stairs[facing=east,half=top]` (Gesims darunter), alternativ `<soffit>_slab[type=top]`.
- **Maße:** Länge 2–3 ab der Ecke (z=−1…1 und z=5…7) oder die ganze Breite. Nur in Luftzellen setzen (Kamin, Laternen, Fensterstürze haben Vorrang).
- **Skizze:** Ansicht West, Ebene x=−1, Fuß links (Beispielhaus A).
  ```
  y\z  -1  0  1  2  3
   6    .  .  /  <  .
   5    .  /  <  .  .
   4    /  <  .  .  .
   3    R  R  R  .  .
   2    k  k  k  .  .     (k optional)
  ```
- **Einsatz:** mtl, med (Stein/Putz), fan, Bahnhof. Wirkt nur bei Überstand 1 und eingerücktem oder massivem Giebel.
- **W/A:** mittel / niedrig.
- **Quellen:** [17]; Blockumsetzung: Einschätzung.

### R07 Traufkante: Stirnbrett statt Kontrastreihe

- **Beschreibung:** Eine offene Falltür vor der Traufreihe wirkt als Stirnbrett (Fascia) [20][21]. Sie verdeckt die halbe Treppenstufe und zieht eine klare Linie. Zusammen mit dem vorhandenen Gesims entsteht eine zweilagige Kante, also nicht die „one flat block of trim“, die laut [51] dünn wirkt.
- **Blöcke:** `spruce_trapdoor[facing=north,half=bottom,open=true]` an der Nordtraufe (Platte an der Südkante, liegt an der Traufreihe). `k` = vorhandenes Gesims `<soffit>_stairs[facing=south,half=top]`.
- **Skizze:** Schnitt an der Nordtraufe (Ansicht West).
  ```
  y\z  -2 -1  0
   5    .  .  /
   4    T  /  W
   3    .  k  W
  ```
- **Einsatz:** nor, jap (dunkles Brett), rus. Nicht bei mtl (dort Ziegelkante und weißes Gesims, siehe 5.1).
- **W/A:** mittel / niedrig.
- **Quellen:** [20] [21] [51]; Umsetzung: Einschätzung.

### R08 Traufkonsolen im Ständerrhythmus

- **Beschreibung:** Unter dem durchgehenden Gesims sitzt nur über jedem Ständer eine zweite Konsole. Das Dach „steht“ dann sichtbar auf dem Fachwerk.
- **Blöcke:** `q` = `<beam>_stairs[facing=<zur Wand>,half=top]` oder `<holz>_fence`. Der Zaun verbindet sich mit der Wand zu einem Kopfband-Arm, den Zustand setzt der Auflöser.
- **Maße:** nur über Ständerachsen (Rastermaß 3–5), nie über Fenstern.
- **Skizze:** Schnitt durch eine Ständerachse, Nordtraufe.
  ```
  y\z  -2 -1  0
   5    .  .  /      Dachtreppe [facing=south]
   4    .  /  W      Traufreihe
   3    .  k  W      Gesims (vorhanden)
   2    .  q  W      Konsole nur über Ständern
  ```
- **Einsatz:** med, rus, fan, nor. jap (dort an den Pfosten, siehe R09).
- **W/A:** mittel / niedrig.
- **Quellen:** [20] (Brackets/Corbels an Traufen); [66] („overhang supported by upside-down spruce stair brackets“); Rhythmus: Einschätzung.

### R09 Kastengesims (geschlossene Untersicht, Überstand 3)

- **Beschreibung:** Bei tiefen Traufen ersetzt eine waagerechte Untersicht aus oberen Stufen die Treppenstufen von unten [21]. Die Vorderkante bleibt als Stirn sichtbar.
- **Blöcke:** `S` = `<soffit>_slab[type=top]`.
- **Skizze:** Schnitt Nordtraufe bei og=3 (Dachtreppen z=−3 y2, z=−2 y3, z=−1 y4, Gesims k bei z=−1 y3).
  ```
  y\z  -3 -2 -1  0
   5    .  .  .  /
   4    .  .  /  W
   3    .  /  k  W
   2    /  S  S  W
  ```
- **Einsatz:** jap (darunter an Pfostenachsen eine Kopfüber-Treppe als vereinfachtes Tokyō [34]), nor-Langhaus, mod (Flachdachrand).
- **W/A:** mittel / niedrig.
- **Quellen:** [21] [34]; alte Notiz §3 („Vollblock-Decke eine Lage tiefer“).

### R10 Firstkappen

| Variante | Blöcke | über Dachfläche | Stil |
|---|---|---|---|
| Stufe | `<first>_slab[type=bottom]` | +0,5 | Standard für alle |
| Mauerrolle | `<stein>_wall` direkt in Kappenhöhe (kein Block darunter); Mitte vom Auflöser `up=false, east/west=low`, Enden `up=true` = Knauf | +0,875 | med (Stein), mtl (`brick_wall` als Firstziegel-Rolle), fan |
| Firstbaum | `<holz>_log[axis=<First>]` | +1 | nor, rus-Langhaus |
| Doppelreihe (gerade Spannweite) | Rücken an Rücken + Stufenreihe oder Zaun- bzw. Mauerpfosten alle 2–4 | 0 / +0,5 | alle [51] |
| Hoher First | Vollblock + Stufe, Enden nach R11 | +1,5 | nur jap, Pagode, Tempel |

- **Mauerrolle, Skizze:** Ansicht West, Ausschnitt First, Ebene x=−1. `m` = `cobblestone_wall` (Endstück mit Pfosten).
  ```
  y\z   2  3  4
   8    .  m  .
   7    /  B  \
  ```
  Die Mauer verbindet sich nicht mit den Treppen, weil die Nachbarzellen auf ihrer Höhe Luft sind. Sie braucht keinen Halt [8].
- **Schnee:** Eine Stufenkappe (`type=bottom`) trägt keinen Schnee, ein Vollblock-, Doppelstufen- oder Firstbaum-First schon (Thema 14).
- **W/A:** hoch (Wechsel von 1,5 auf 0,5 im Mittelalter) / niedrig.
- **Quellen:** [15] („eine Reihe Bruchsteinmauern“ als Firstdekoration); [36] (Firstziegel); [51]; [8]; Höhen aus den Modellen: Einschätzung.

### R11 Firstabschlüsse und Spitzen

**(a) Kreuzbretter / Pferdeköpfe / Chigi.** Die beiden Windbretter laufen über den First hinaus und kreuzen sich. Belegt ist das an niederdeutschen Giebeln (Pferdeköpfe [43]), im norwegischen Drachenstil (Drachenköpfe an Giebeln und Firsten [25]) und an Shinto-Schreinen (Chigi „crossed over the gable as an ornament“ [22]).
- **Skizze:** Ansicht West, Ebene x=−1, mit R01. `X` = `spruce_planks` (Kreuzungspunkt statt Kappe), `\` = `spruce_stairs[facing=north,half=bottom]` (Verlängerung des Südbretts), `/` = `spruce_stairs[facing=south,half=bottom]` (Verlängerung des Nordbretts), `|` = `spruce_fence` (optional, verlängert die Köpfe).
  ```
  y\z   1  2  3  4  5
  10    .  |  .  |  .
   9    .  \  .  /  .
   8    .  .  X  .  .
   7    /  <  B  >  \
  ```
- **Einsatz:** nor (immer an beiden Giebeln), rus (p ≈ 0,3), jap-Schrein, fan.

**(b) Aufgebogene Firstenden (Onigawara).** An den Enden des hohen Firsts steht 1 Block mehr plus eine nach außen ansteigende Treppe [32].
- **Skizze:** Ansicht Süd, Westende, Ortgang in x=−1. `F` = `deepslate_tiles`, `s` = `deepslate_tile_slab[type=bottom]`, `O` = `chiseled_deepslate`, `E` = `deepslate_tile_stairs[facing=west,half=bottom]` (Hochseite außen; am Ostende `facing=east`).
  ```
  y\x  -2 -1  0  1  2
  10    .  E  .  .  .
   9    .  O  s  s  s
   8    .  F  F  F  F
  ```
- **Einsatz:** jap, che, Pagodenstufen.

**(c) Spitzen (Finials)** auf der Firstkappe an beiden Enden [29]:

| Stil | Spitze | Höhe |
|---|---|---|
| med | `spruce_fence` als Firstpfahl [62]; bei Steindach `stone_brick_wall` (Pfosten) | 1 |
| fan | `waxed_lightning_rod[facing=up]` auf `chiseled_deepslate` oder `polished_blackstone_wall` [64]; nachts `end_rod` | 1–2 |
| jap, che | `end_rod[facing=up]` oder `waxed_lightning_rod` (Turm- und Pagodenspitze [54]) | 1 |
| nor | Kreuzbretter (a) | 2 |
| rus, mtl, mod | meist keine; Skyline-Akzent ist der Kamin [35] | – |

`end_rod` gibt Licht 14 und schmilzt Schnee im Umkreis von 2 Blöcken [6]. Auf verschneiten Firsten deshalb `waxed_lightning_rod` (Licht 0). Oxidierte Blitzableiter-Varianten gibt es in 1.21.11, sie sind aber **nicht in der Registry** [5].

**(d) Giebellaterne (Weihnachten).** Unter dem Apex-Block der Ortgangspalte: `lantern[hanging=true]` in (x=−1, z=3, y=6), optional mit `iron_chain[axis=y]` dazwischen (Ketten brauchen keinen Halt [13]). Japanisches Gegenstück ist das Gegyo, ein Zierbrett am Giebelfirst [38]. Als Ersatz dafür dient `end_rod[facing=down]`.

- **W/A:** hoch / niedrig (a, c, d) bzw. mittel (b).
- **Quellen:** [22] [25] [29] [32] [38] [43] [54] [62] [64] [5] [6] [13].

### R12 Gratbetonung bei Walm-, Pyramiden- und Pagodendächern

- **Beschreibung:** Die Diagonalspalten jedes Rings, an denen die Treppen `outer_*` werden, bekommen das Firstmaterial. Das entspricht Gratziegeln [36].
- **Skizze:** Draufsicht Walm 9×7 inkl. Überstand. `G` = Gratspalte (`<first>_stairs`, Form vom Auflöser), `F` = First, `r` = Fläche.
  ```
  z\x  0 1 2 3 4 5 6 7 8
  0    G r r r r r r r G
  1    r G r r r r r G r
  2    r r G r r r G r r
  3    r r r F F F r r r
  4    r r G r r r G r r
  5    r G r r r r r G r
  6    G r r r r r r r G
  ```
- **Regel:** ΔL* zwischen Grat und Fläche 5–15. Bei mtl ist der Grat aus `granite_stairs` auf `brick_stairs` kaum zu sehen, also ausreichend `bricks` → `mud_brick` o. Ä. wählen. Bei che `stripped_cherry_log` statt `dark_oak`.
- **Einsatz:** mtl, jap, che, Pyramiden am Turm.
- **W/A:** mittel / niedrig (Bedingung `dx === dz` in `layoutAt`).
- **Quellen:** [36]; Umsetzung: Einschätzung.

### R13 Zurückgesetzter Fachwerkgiebel (Königspfosten und Kehlbalken)

- **Beschreibung:** Die Füllung sitzt in d=0 (eine Ebene hinter dem Windbrett bzw. der Rahmenebene). In d=+1 liegt das Holzwerk. So entstehen Schatten [51] und eine Gliederung.
- **Regeln nach Dreieckshöhe H** (Reihen über der Wandkrone):
  - H ≤ 3: nur Königspfosten **oder** ein Element nach R14.
  - H = 4–5: Kehlbalken in Höhe ⌈H/2⌉, Königspfosten darüber und darunter, Fenster links und rechts unter dem Balken.
  - H ≥ 6: zusätzlich Streben bzw. Andreaskreuz (Fachwerk-Streben aus `walls.ts` wiederverwenden).
- **Skizze:** Ansicht West, Ebene x=0 (d=+1), Füllung in x=1. Beispielhaus B. `K` = `stripped_dark_oak_log[axis=y]`, `H` = `stripped_dark_oak_log[axis=z]`, `B` = vorhandener Rahmenbalken der Wandkrone, `f` = sichtbare Füllung (Luft in x=0, z. B. `white_terracotta` bzw. Infill in x=1), `g` = `glass_pane` in x=1.
  ```
  y\z   0  1  2  3  4  5  6  7  8
   8    .  .  .  .  K  .  .  .  .
   7    .  .  .  f  K  f  .  .  .
   6    .  .  H  H  H  H  H  .  .
   5    .  f  f  g  K  g  f  f  .
   4    B  B  B  B  B  B  B  B  B
  ```
- **Variante „vorkragender Giebel“:** Das Dreieck in d=+1 über der Fassade steht auf einer Konsolenreihe `<beam>_stairs[half=top]` (facing zur Wand) in Wandkronenhöhe. Das ist typisch für Fachwerkstädte und entspricht dem Jetty, nur am Giebel.
- **Einsatz:** med, fan, rus.
- **W/A:** hoch / mittel.
- **Quellen:** [51] („recess the gable wall back one block under the overhang, and put a window or beam detail in the triangle“, nach alter Notiz §2); [43]; Regeln nach H: Einschätzung.

### R14 Giebelöffnungen: Ochsenauge, Eulenloch, Lüftungsschlitz

- **Ochsenauge** (Rund- bzw. Ovalfenster im Giebeldreieck [45]): die vorhandene Rundfenster-Vorlage der Fensterbibliothek mittig im Dreieck. Bedingung: Das Dreieck enthält ein freies 3×3, in Beispielhaus B die Zellen y5–7 / z3–5. Bei kleineren Dreiecken eine einzelne `glass_pane` oder ein 1×2-Fenster.
- **Eulenloch** (Öffnung unter dem First, früher Rauchabzug, Einflug für Eulen [44]): Die Apex-Zelle der Füllung bleibt Luft, der Dachraum dahinter ist dunkel.
- **Lüftungsschlitz** (Jalousie): Füllzellen werden durch geschlossene obere Falltüren ersetzt. Platte oben, darunter ein dunkler Spalt.
- **Skizze:** Apex Beispielhaus B, Ebene d=0. `U` = Luft (Eulenloch), `v` = `spruce_trapdoor[facing=west,half=top,open=false]`.
  ```
  y\z   3  4  5
   8    .  U  .
   7    v  v  v
  ```
- **Einsatz:** Eulenloch für rus, nor, fan (Bauernhaus); Lüftung für alle Holzgiebel; Ochsenauge für mtl, med (Stein), fan.
- **W/A:** mittel / niedrig.
- **Quellen:** [44] [45] [70] („use that extra wall section to add a window, balcony or some other decoration“).

### R15 Giebelverschalung (Bretter und Deckleisten)

- **Beschreibung:** Senkrechte Bretter in d=0, davor Deckleisten aus offenen Falltüren in jeder 2. Spalte. Das ist die typische Giebelverbretterung in Nord- und Alpenregionen.
- **Blöcke:** `V` = `stripped_spruce_log[axis=y]` (senkrechte Maserung) in d=0, `t` = `dark_oak_trapdoor[facing=west,half=bottom,open=true]` in d=+1 vor den Spalten z=2, 4, 6.
- **Skizze:** Ansicht West, Beispielhaus B (d=0 überall `V`, markiert sind die Leistenspalten `t`).
  ```
  y\z   1  2  3  4  5  6  7
   8    .  .  .  t  .  .  .
   7    .  .  V  t  V  .  .
   6    .  t  V  t  V  t  .
   5    V  t  V  t  V  t  V
  ```
- **Einsatz:** nor, rus, fan-Chalet.
- **W/A:** mittel / niedrig.
- **Quellen:** [26] („weatherboarding“); Umsetzung: Einschätzung.

### R16 Materialwechsel im Giebel

- **Regel:** Ist der Giebel aus Holz und die Wand darunter aus Stein oder Putz, wechselt das Material genau auf Wandkronenhöhe. Das trennende Band liefert R06 oder ein Balken. Die Giebelrolle (`gable`) wird als eigene Paletten-Rolle geführt statt als `infill`/`upperWall` (`plan.ts:421`).
- **Einsatz:** med (Steinsockelhaus), rus, nor.
- **W/A:** mittel / niedrig.
- **Quellen:** [15] (Giebel mit andersfarbigem Material, nach alter Notiz §2); [64] (Giebel mit `stripped_oak_log` gerahmt, Füllung `white_terracotta`).

### R17 Giebelgaube (zurückgesetzt, „Hundehütte“)

- **Beschreibung:** Die Front steht **1 Block hinter** der Traufwand, die Traufreihen davor laufen durch [39]. Das Gaubendach ist ein Satteldach mit First quer zum Hauptfirst, vorn 1 Überstand, seitlich keiner. Ortgang wie beim Hauptdach (R01), aber ohne Kontrast-Traufreihe.
- **Maße:** Körper 3 breit (Fenster 1) oder 5 breit (Fenster 3 bzw. 2). Fenster mindestens 1×2. Vor der Gaube bleibt mindestens 1 Dachreihe als Brüstung. Gaubenfirst ≤ Hauptfirst − 1. Abstand zum Ortgang ≥ 2, untereinander ≥ 2. Die Achse folgt der Fensterachse darunter [41].
- **Machbarkeit:** Bei einem 45°-Dach mit Tiefe ≤ 11 erreicht der Gaubenfirst schon mit einem 1 hohen Fenster die Firsthöhe. Echte Gauben deshalb nur bei Profil `steep` oder Tiefe ≥ 13. Sonst als Zwerchhaus bauen, wie heute, aber bewusst so benannt.
- **Skizze:** Ansicht Nord auf die Gaubenfront, y relativ zur Brüstungsreihe, x relativ zur Gaubenmitte. `s` = `<dach>_slab[type=bottom]`, `/` = `<dach>_stairs[facing=east,half=bottom]`, `\` = `…[facing=west]`, `A` = Apex `<frame>_planks`, `L` = `<beam>_log[axis=x]`, `P` = `<frame>_log[axis=y]`, `G` = `glass_pane`, `W` = Brüstung `upperWall`, `r` = durchlaufende Hauptdachreihe.
  ```
  y\x  -2 -1  0  1  2
  +4    .  .  s  .  .
  +3    .  /  A  \  .
  +2    /  P  L  P  \
  +1    .  P  G  P  .
   0    .  P  W  P  .
  -1    r  r  r  r  r
  ```
  Darunter an der Brüstung die vorhandene Simstreppe. Ein 1×2-Fenster entsteht mit einer Lage mehr (Gaubenfirst prüfen).
- **Einsatz:** med, fan, rus, mtl (Walmgaube analog mit Walm vorn).
- **W/A:** hoch / mittel.
- **Quellen:** [18] [39] [41]; Machbarkeit und Maße: Einschätzung bzw. aus der Engine-Geometrie abgeleitet.

### R18 Schleppgaube

- **Beschreibung:** Eine Dachfläche mit flacherer Neigung als das Hauptdach, in gleicher Richtung [18]. Bei 45° und halben Blöcken läuft sie praktisch bis zum First („aus dem First“).
- **Umsetzung:** Abschnittstyp `shed` (gibt es schon) mit Profil `shallow` (Δ=1), Hochseite zum First, Front 1 hinter der Traufwand. Die Höhenfeld-Vereinigung entfernt die Hauptdachtreppen unter der Gaube von selbst. Wangen: In den beiden Seitenspalten werden alle Zellen zwischen Hauptdachfläche und Gaubendach-Unterkante gefüllt, wie die Giebelfüllung.
- **Maße:** Breite 3–9, ungerade. Fensterband 1 hoch über die ganze Breite (Pfosten `P` alle 2). Mindestens Tiefe 11 bei 45°.
- **Skizze:** Schnitt durch die Gaubenmitte (Blick nach Osten), Hauptdach Tiefe 11 (Reihen z=−1 y4 … z=4 y9, First z=5 y10). `b` = `<dach>_slab[type=bottom]`, `t` = `<dach>_slab[type=top]`, `s` = Hauptfirst, `L` = Sturz `<beam>_log[axis=x]`, `G` = `glass_pane`, `W` = Brüstungsbalken.
  ```
  y\z  -1  0  1  2  3  4  5
  10    .  .  .  .  b  b  s
   9    .  .  b  t  .  .  .
   8    .  t  L  .  .  .  .
   7    .  .  G  .  .  .  .
   6    .  .  W  .  .  .  .
   5    .  /  .  .  .  .  .
   4    /  .  .  .  .  .  .
  ```
  Die Oberkanten von z=0 bis z=4 sind 9,0 · 9,5 · 10,0 · 10,5 · 10,5. Die Fläche ist durchgehend Δ=1 und endet bündig mit dem First.
- **Einsatz:** rus, nor, med (große Häuser), Bahnhof.
- **W/A:** mittel / mittel.
- **Quellen:** [18] [39] [1]; Geometrie: aus Engine und alter Notiz §2 abgeleitet.

### R19 Fledermausgaube (Eyebrow)

- **Beschreibung:** Eine niedrige, breite Gaube ohne Seitenwände, über die die Deckung als flache Welle läuft [18]. Verhältnis Gaubenhöhe : halbe Breite = 1:3 [40]. Typisch auf Stroh- und Schindeldächern [1].
- **Umsetzung (eine Dachreihe k, mind. 2 über der Traufe):** In der Mitte (Fensterbreite w) wird die Treppe der Reihe k um 1 Block angehoben und liegt dann bündig mit Reihe k+1. Darunter steht das Fenster. Je eine Schulterspalte bekommt statt der Treppe einen Vollblock, der die Vorderkante um +0,5 hebt. Die Vorderkante steigt so in Schritten von 0,5: 0,5 → 1,0 → 1,5.
- **Maße:** w = 5 ergibt eine Gesamtbreite von 7, also Höhe 1 : halbe Breite 3,5 ≈ 1:3. w = 3 ergibt 5 (kleine Variante).
- **Skizze:** Belegung der Reihe k je Spalte (x relativ zur Mitte, w=5).

  | x | ±4 | ±3 | −2…+2 |
  |---|---|---|---|
  | Reihe k, y=yk | Treppe (normal) | `<dach>` Vollblock (Schulter) | `glass_pane` |
  | Reihe k, y=yk+1 | – | – | Treppe (angehoben) |

  Schnitt bei x=0 (Blick nach Osten). `G` = `glass_pane`, `/` = Dachtreppe hangaufwärts.
  ```
  y\z    k-1   k   k+1
  yk+1    .    /    /
  yk      .    G    .
  yk-1    /    .    .
  ```
- **Einsatz:** fan (Märchenhaus), rus, che (Holzschindel).
- **W/A:** mittel–hoch / mittel.
- **Quellen:** [18] [40] [1]; Blockumsetzung: Einschätzung.

### R20 Kaminkopf mit Auskragung und versenktem Lagerfeuer

- **Beschreibung:** Ein Schornsteinkopf hat eine Abdeckplatte mit Tropfkante und überragt die umgebenden Dachteile [49]. In Minecraft liefert ein Ring aus Kopfüber-Treppen zur Mitte die Auskragung, darüber liegt ein Kranz. Das Lagerfeuer sitzt im Ring und ist von der Seite unsichtbar. Rauch steigt etwa 10 Blöcke, mit `hay_block` darunter 24 [7]. Ein Block **direkt** darüber lässt den Rauch nur teilweise durch, eine Falltür blockiert ihn ganz [7].
- **Blöcke:** `k` = `<kamin>_stairs[half=top]`, facing zur Zugmitte (Ecken: facing aus der Nord-Süd-Reihe, `outer_*` setzt der Auflöser), `R` = `<kamin>` oder Kontrastmaterial als Vollblock, `C` = `campfire[facing=north,lit=true,signal_fire=false,waterlogged=false]`, optional `s` = `<kamin>_slab[type=bottom]`.
- **Skizze 1:** Schnitt durch die Zugachse (Ansicht West), Zug 1×1, Kopf 3×3.
  ```
  y\z    -1   0   1
  T+3     .   .   .     mind. 3 Luft
  T       s   .   s     optional
  T-1     R   .   R     Kranz
  T-2     k   C   k     Auskragung, Feuer verdeckt
  T-3     .   Z   .     Schaft
  ```
- **Skizze 2:** Draufsicht y=T−2 bei Zug 2×1 (zwei Feuer wie in [74]).
  ```
  z\x  -1   0   1   2
  -1    ┌   n   n   ┐     n = <kamin>_stairs[facing=south,half=top]
   0    w   C   C   e     w = …[facing=east,half=top], e = …[facing=west,half=top]
   1    └   s   s   ┘     s = …[facing=north,half=top]; Ecken ┌┐ facing=south, └┘ facing=north
  ```
- **Regeln:** Kopf mindestens 1 über der Firstoberkante, wenn der Kamin höchstens 2 Reihen unter dem First austritt. Auf Kopfhöhe ein Materialwechsel (z. B. Schaft `cobblestone`, Kopf `stone_bricks`). Kein Kaminhut über dem Feuer, er würde den Rauch stoppen [7].
- **Schnee auf dem Kranz:** nur, wenn der Lichtweg vom Feuer zur Schneezelle mindestens 4 Schritte beträgt (15 − 4 = 11 < 12 [12]). Bei Skizze 1 beträgt er 3 Schritte (C → T−1 → T → Nachbar), also kein Schnee oder das Feuer eine Lage tiefer setzen.
- **Einsatz:** alle Stile mit Kamin. 3×3-Kopf erst ab 2×1-Schaft oder bei großen Häusern, sonst R21.
- **W/A:** hoch / niedrig–mittel.
- **Quellen:** [7] [12] [23] [49] [74].

### R21 Falltür-Manschette (kleiner Kopf für 1×1)

- **Beschreibung:** Vier offene Falltüren um das oberste Feuer. Das ist laut [74] die kleinste Kaminform mit verborgenem Lagerfeuer. Offene Falltüren stehen senkrecht und verdecken den Rauch nicht.
- **Skizze:** Draufsicht y=T (Lagerfeuer `C` oben im Schaft). `tn` = `<holz>_trapdoor[facing=north,half=bottom,open=true]` (Platte an der Südkante, liegt am Feuer), `ts` = `…[facing=south,…]`, `tw` = `…[facing=west,…]`, `te` = `…[facing=east,…]`.
  ```
  z\x  -1   0   1
  -1    .   tn  .
   0    tw  C   te
   1    .   ts  .
  ```
- **Material:** `dark_oak_trapdoor` (med, rus), `iron_trapdoor` (mod), `waxed_copper_trapdoor` (fan).
- **W/A:** mittel / niedrig.
- **Quellen:** [74] (nur Such-Snippet, Seite 403); [4] [7].

### R22 Außenkamin am Giebel mit Schultern

- **Beschreibung:** Unten breiter Sockel, an der Geschossdecke Schultern als schräger Wasserschlag, darüber ein schmalerer Schaft, der den Ortgang durchstößt. Oben folgt der Kopf nach R20 bzw. R21. Das Windbrett wird um den Schaft ausgespart.
- **Skizze:** Ansicht West vor der Giebelwand (d=+1), Beispielhaus A, 2 Geschosse. `Z` = Schaft (oben 1 breit × 2 tief: d=+1 und d=+2), `◣` = `<kamin>_stairs[facing=south,half=bottom]`, `◢` = `…[facing=north,half=bottom]`.
  ```
  y\z    1   2   3   4   5
   9     .   .   Z   .   .    (durch den Ortgang, dort keine Brett- oder Treppenzelle)
   5     .   .   Z   .   .
   4     .   ◣   Z   ◢   .
   3     .   Z   Z   Z   .    Sockel 3 breit bis zur 1. Decke
   1     .   Z   Z   Z   .
  ```
- **Position:** mittig auf dem Giebel oder 1–2 aus der Mitte (Cottage-Asymmetrie [56]), nie vor einer Fensterachse.
- **W/A:** mittel / niedrig (Erweiterung von `buildChimney`).
- **Quellen:** [65] [66] („stone brick chimney climbs one gable end“); [49]; Maße: Einschätzung.

### R23 Dachflächen-Mischung, Moos und Laub

- **Beschreibung:** 2–3 Treppenmaterialien derselben Familie, als Cluster verteilt (Wertrauschen, Zellgröße 2–3, wie in `texturing.ts`), Hauptmaterial 60–85 %. Verwitterung und Moos häufen sich in den unteren Reihen, an Ecken, an Nahtstellen zwischen Dachteilen und auf der Nordseite [59][60]. Traufreihe, Ortgang und First bleiben rein, damit die Silhouette klar bleibt.
- **Skizze:** Draufsicht Nordseite eines Satteldachs. `a` = `deepslate_tile_stairs`, `b` = `deepslate_brick_stairs`, `c` = `cobbled_deepslate_stairs`, `F` = First.
  ```
  z\x   0  1  2  3  4  5  6  7  8  9 10
   3    F  F  F  F  F  F  F  F  F  F  F
   2    a  a  a  b  b  a  a  a  a  a  a
   1    a  a  b  b  b  a  a  a  c  a  a
   0    a  c  a  b  a  a  a  c  c  a  a
  -1    a  a  a  a  a  a  a  a  a  a  a
  ```
- **Moos und Laub:** auf Steindächern `mossy_cobblestone_stairs`/`mossy_stone_brick_stairs` als Nebenmaterial [64]. Auf Holz- und Kupferdächern stattdessen einzelne Vollblöcke `moss_block` oder `azalea_leaves[persistent=true]` in den unteren Reihen und Ecken [59]. `moss_carpet` nur auf Vollblock-Oberseiten wie einem Block-First („cap the ridge with moss carpet“ [64]). Auf einer unteren Treppe schwebt ein Teppich über der tiefen Hälfte, denn Teppiche halten auf allem außer Luft [10] (Optik: Einschätzung).
- **Kupfer:** `waxed_weathered_*` und `waxed_oxidized_*` mischen, immer gewachst [59].
- **W/A:** hoch / mittel.
- **Quellen:** [59] [60] [64] [68] [69] [53].

### R24 Dachrinne, Fallrohr, Regenkette (selten)

- **Regenkette (jap, che):** `iron_chain[axis=y]` von der Traufecke bis 1 über dem Boden, darunter `flower_pot` oder ein Stein. Ketten und Blumentöpfe brauchen in Java keinen Halt [13][11]. `copper_chain` gibt es seit 1.21.9, sie ist **nicht in der Registry** [13].
- **Rinne (mod, mtl):** eine Reihe Treppen „rückwärts“ vor der Traufe, wie die Rinne beim Flachdach [1]. Kostet +1 Überstand, deshalb nur bei großen Bauten wie dem Bahnhof.
- **Fallrohr (fan):** gestapelte `waxed_lightning_rod[facing=up]` an einer Ecke (Einschätzung).
- **W/A:** niedrig / niedrig.

---

## Themen nach Leitfragen

### 5.1 Traufe und Ortgang

**Kontrast mal Dicke** (Einschätzung, abgeleitet aus [53] „depth comes from value contrast“ und Akzente < 10 %, [51] „one flat block of trim … looks thin“):

| Kantenelement | Dicke | erlaubtes ΔL* zur Dachfläche | Anteil |
|---|---|---|---|
| Treppen- oder Blockkante (R01 in Kontrastmaterial) | 1 | 5–15 | nur Ortgangspalte |
| Stufen- oder Halbblockkante | 0,5 | ≤ 25 | Ortgang oder Traufe |
| Falltür, Zaun, Kette (R02, R07) | 3/16 | ≤ 45 | Ortgang und Traufe |
| alle Kontrastspalten zusammen | | | ≤ 15 % der Dachspalten |

**Ortgang-Variante je Stil** (bevorzugt → alternativ):

| Stil | Ortgang | Traufe | Überstand Traufe / Ortgang | Kantenmaterial (Vorschlag) |
|---|---|---|---|---|
| med (Holz) | R01 | Dachmaterial + Gesims, R08 | 1 / 1 | `dark_oak` bzw. `spruce` |
| med (Stein) | R05 Schildgiebel → R02 | Dachmaterial + Gesims | 1 / −1 bzw. 1 | Stein nur als Abdeckung; sonst `dark_oak_trapdoor` |
| fan | R01 + R11a/c | R08 | 1–2 / 1–2 | `spruce`/`dark_oak` |
| rus | R01, ab og 2 mit R04 | R07 optional | 1–2 / 1–2 | `spruce` |
| nor | R01 + R04 + R11a | R07 | 2–3 / 2 | `spruce` (1 Spalte!) |
| jap | R02 dunkel | farbige Traufreihe (1 Reihe), R09 | 2–3 / 2 | `dark_oak`, Rot nur an der Traufe |
| che | R02 | Dachmaterial | 1–2 | `stripped_cherry_log`-Ton bzw. `dark_oak_trapdoor` |
| mtl | kein Holz: Ortgang im Dachmaterial, R06 | Ziegelkante + weißes Gesims (Wandfarbe als `soffit`) | 1 / 0–1 | Kante `bricks`, Gesims `smooth_quartz_stairs` |
| mod | Flachdachrand (alte Notiz §5) | – | 0–1 | – |

**Traufwiederkehr (R06)** nur bei mtl, med-Stein und fan-Stadthaus, mit p ≈ 0,5.

### 5.2 Untersicht und Konsolen

| Überstand | Untersicht | Konsolen |
|---|---|---|
| 1 | Gesims (vorhanden) + Ortgangbrett (R01) | R08 über Ständern (Fachwerk) |
| 2 | Bretter im `soffit`-Material in allen Überstandsspalten, Kontrast nur außen (R03) | Ortgang: Pfettenköpfe (R04); Traufe: R08 |
| 3 | Kastengesims (R09) | jap: Kopfüber-Treppe + Zaun an Pfostenachsen; nor: R04 |

**Laternen und Girlanden** hängen an den vorhandenen `eaveCells`. Eine Laterne braucht darüber eine volle Unterseite. Unter Kopfüber-Treppen hängt keine Laterne.

### 5.3 First und Firstabschlüsse

- Standard ist die Stufenkappe. Mauerrolle für Stein- und Ziegeldächer, Firstbaum für nor, hoher First nur für jap (R10).
- Firstenden bekommen nach Stil Spitzen, Kreuzbretter oder aufgebogene Enden (R11). Pro Seed variieren, aber im Stil konsistent bleiben. Bei GDMC kritisierten Juroren Wiederholung und fehlende Dekoration [71].
- Bei gerader Spannweite: Doppelreihe Rücken an Rücken + Kappe oder Pfosten alle 2–4 (R10).
- Walm, Pyramide, Pagode: Grat betonen (R12). Turm- und Pyramidenspitzen: `waxed_lightning_rod` oder `end_rod` (alte Notiz §5).

### 5.4 Giebelfeld

Entscheidung nach Dreieckshöhe H und Stil:

| H | Pflicht | Optional |
|---|---|---|
| ≤ 2 | nichts (zu klein) | Laterne unter dem Apex (R11d) |
| 3 | 1 Element: Lüftung, Eulenloch oder 1 Fenster (R14) | Königspfosten |
| 4–5 | Rücksprung (R13) + Kehlbalken/Pfosten **oder** Ochsenauge | Verschalung (R15), Laterne |
| ≥ 6 | Rücksprung + Fachwerk mit Streben **oder** Fenstergruppe | Balkon (eigene Vorlage) |

Weitere Regeln:
- Ein Fenster im Giebel braucht dahinter freien Dachraum. Das ist gegeben, weil der Dachboden leer bleibt.
- Kein Giebel mit ≥ 6 Zellen ohne Element (Lint).
- Stein-, Putz- und Ziegelhäuser: Ochsenauge, Giebelfußgesims (R06) oder Schildgiebel (R05).
- Holz: Fachwerk (R13) oder Verschalung (R15).

### 5.5 Gauben

| Typ | Breite | Fenster | Front | Dach | Voraussetzung | Stil |
|---|---|---|---|---|---|---|
| Zwerchhaus (heute) | 3–5 | 1×2 | in der Fassadenebene, Traufe unterbrochen | Sattel 45° | Fensterachse | med, fan, mtl |
| Giebelgaube (R17) | 3 / 5 | 1×2 / 3×1 | 1 hinter der Traufwand | Sattel 45°, First ≤ Haupt − 1 | `steep` oder Tiefe ≥ 13 | med, fan, rus |
| Walmgaube | 5 | 3×1 | 1 hinter | Walm | wie oben | mtl, che |
| Schleppgaube (R18) | 3–9 | Band 1 hoch | 1 hinter | Δ=1 bis zum First | Tiefe ≥ 11 | rus, nor, Bahnhof |
| Fledermausgaube (R19) | 5 / 7 | 3 / 5 × 1 | in der Dachfläche | Welle | Reihe ≥ 2 über der Traufe | fan, rus, che |

**Abstände:** zum Ortgang ≥ 2, zueinander ≥ 2. Höchstens eine Gaube je 5 Block Trauflänge, wie heute (`components.ts:28`). Gaubenkanten folgen R01/R02, **nie** eine Kontrast-Traufreihe.

### 5.6 Kamine

| Merkmal | Regel |
|---|---|
| Querschnitt | Außenkamin 2×1 bzw. 1×2, Firstkamin 2×2 bei Häusern ≥ 9×9, 1×1 nur mit R21 |
| Kopf | Auskragung + Kranz (R20), Materialwechsel; Variante dunkle Kopflage als Ruß (`cobbled_deepslate` auf `cobblestone`, Einschätzung) |
| Feuer | `campfire[lit=true]` versenkt, alle 4 Seiten blickdicht, ≥ 3 Luft darüber, keine geschlossene Falltür darüber [7]; `soul_campfire` für fan bzw. Hexenhaus [65]; `hay_block` + `signal_fire=true` nur bei Türmen |
| Höhe | Kopf ≥ Firstoberkante + 1 bei Firstnähe [49]; Außenkamin ≥ First + 1 (heute + 2, in Ordnung) |
| Position | Giebelmitte oder ±1–2; innen ≤ 2 Reihen unter dem First; nie mitten in der Fläche nahe der Traufe; Abstand ≥ 1 zu Gauben |
| Material | `bricks` (med Tudor, mtl in Weiß verputzt: `white_concrete`/`smooth_quartz`), `cobblestone` + `mossy_cobblestone` (rus [65]), `stone_bricks` (med), `cobbled_deepslate` (nor), `blackstone` schief versetzt (fan-Hexe [65]) |
| Skyline | bei großen Häusern 2 Kamine symmetrisch an den Giebeln (Tudor-Skyline [35]) |

### 5.7 Dachflächen-Textur, Dachrinnen, Schnee

**Mischungen** (L* aus `textureStats.ts`, ΔL* innerhalb ≤ 10, außer Holz):

| Dach | Haupt (60–80 %) | Neben | Akzent |
|---|---|---|---|
| Schiefer | `deepslate_tile_stairs` (22,9) | `deepslate_brick_stairs` (29,9) | `cobbled_deepslate_stairs` (32,8) |
| Ziegel | `brick_stairs` (46,9) | `granite_stairs` (48,0) | `mud_brick_stairs` (46,6) |
| Tuff (fan, nor) | `tuff_brick_stairs` (42,7) | `polished_tuff_stairs` (43,3) | `tuff_stairs` (45,7) |
| Stein bemoost | `cobblestone_stairs` (53,1) | `mossy_cobblestone_stairs` (48,5) | – |
| Holz dunkel | `dark_oak_stairs` (19,8) | `spruce_stairs` (38,3) nur als Cluster ≤ 20 % | – |
| Kupfer | `waxed_oxidized_cut_copper_stairs` (58,1) | `waxed_weathered_cut_copper_stairs` (56,9) | `moss_block` an Nähten |

**Rinnen** siehe R24, im Normalfall nicht.

**Schnee** (nur Verweis auf Thema 14):
- Auf `half=bottom`-Treppen und unteren Stufen liegt kein Schnee, die Aussage „snow layers over spruce stairs“ in [65] stimmt für Java nicht.
- Schneefähig sind Vollblock-First, Firstbaum, obere oder doppelte Stufen, Schulterblöcke der Fledermausgaube und Kaminkränze nach der Lichtregel aus R20.
- Lichtquellen am Dach: Lagerfeuer und Laterne halten 3 Schritte Abstand zu Schnee, Endstäbe 2 [6][12].

### 5.8 Warum wirkt die graue Dachkante klobig – und was machen Profis?

1. **Zu viel Fläche:** Die Kante ist ein umlaufender Rahmen. Beim Satteldach 11×9 (og 1) sind 2·11 + 2·7 = 36 von 99 Spalten Kontrast (36 %), beim nordischen 13×11 (og 2) sind es 26 + 36 = 62 von 143 (43 %). Die Faustregel für Akzente liegt bei etwa 10 % [53].
2. **Zu hell:** Der Sprung ΔL* 28 (Stein auf Schiefer) bzw. 45–57 (Quarz auf Ziegel, Dunkeleiche auf Kirsche) springt aus dem Dach heraus.
3. **Keine eigene Form:** Die Kante wiederholt die Treppenstufung der Fläche. Das ganze Stufenprofil wird dadurch in Kontrastfarbe nachgezeichnet, oben und an der Stirnseite. Ein Windbrett ist dagegen ein glattes Brett [16][42].
4. **Falsches Material:** Mauerwerk am Dachrand liest sich als Mauer auf dem Dach. Steinerne Ränder gibt es real nur als Giebelmauer über dem Dach [28].
5. **Zwei Materialien in einem Brett:** Stein oben, Fichte darunter (`roofEngine.ts:369`).
6. **Zu breit bei großem Überstand** (`roofEngine.ts:197`), dazu die offene Kerbe unter dem First und ein 1,5 Blöcke hoher First.

**Was Profis stattdessen tun:**
- Dachfläche bis zur Traufe in einem Ton; die Traufe lebt vom Schatten, vom Gesims darunter [51] und von Konsolen.
- Am Ortgang **ein** schmales, dunkles Holzbrett: R01 oder R02, mit Pfettenköpfen bei tiefem Überstand (R04).
- Den Giebel um 1 zurücksetzen [51].
- Den Kontrast an Akzente geben, die keine Fläche brauchen: Firstspitzen, Laternen, Fensterläden.

---

## Fehler, die Profis vermeiden

1. **Gemischte Neigungen**, bei denen sich die Firste nicht treffen [51].
2. **Eine einzelne flache Trim-Reihe:** Die Traufkante wirkt dünn [51]. Besser ist eine zweilagige Kante aus Treppe, Gesims und gegebenenfalls Stirnbrett (R07).
3. **Falscher Maßstab:** Große Dächer mit Einzelstufen wirken unruhig [51]. Ab etwa 15×15 das Dach in Abschnitte teilen (alte Notiz §7).
4. **Volle Terrakotta-Blöcke als Schrägfläche** geben eine hässliche Treppensilhouette [61].
5. **Kontrastkante als Rahmen ringsum.** Akzente bleiben unter ca. 10 % [53].
6. **Lagerfeuer offen als obersten Block** oder eine geschlossene Falltür bzw. ein Kaminhut darüber. Beides blockiert den Rauch [7]. Den Tipp „campfire under a trapdoor vent“ aus [66] nur mit **offener** Falltür umsetzen.
7. **Kamin mitten in der Dachfläche nahe der Traufe** oder unter Firsthöhe [49].
8. **Gauben, die nicht auf Fensterachsen stehen** [41], dicht am Ortgang sitzen, deren First die Firsthöhe erreicht oder deren Wangen Lücken zum Hauptdach lassen.
9. **Lichtlöcher und Kerben** unter Überständen und am Apex [51].
10. **Schnee auf Treppen** [12][65] und Licht neben Schnee [6][12].
11. **Ungewachstes Kupfer und ungewachste Blitzableiter.** Sie verfärben sich im Lauf der Zeit; deshalb immer `waxed_*` [59][60].
12. **Kleine Fehler, die die Immersion zerstören** [71]: schwebende Spitzen ohne erkennbaren Bezug, falsche Treppenecken, zu große oder zu kleine Bauteile.
13. **Spiegelbild-Wiederholung:** jede Gaube, jeder Kamin, jede Spitze identisch. Innerhalb des Stils je Seed variieren [71][72].

---

## Empfehlungen für den Generator

Priorisiert nach Wirkung pro Aufwand.

1. **Kantenmodell trennen: Ortgang 1 Spalte, Traufe ohne Kontrast**
   - **Was:** `trim` gilt nur für x = X0/X1 (bzw. z bei First entlang z). Die Traufreihe d=0 bekommt standardmäßig das Dachmaterial.
   - **Neu:** `edge: { eave: 'roof'|'fascia'|'trim', verge: 'board'|'trapdoor'|'parapet' }` und ein getrennter Ortgang-Überstand `vergeOverhang`.
   - **Modul:** `roof/roofEngine.ts` (Z. 197, 247–249), `RoofSectionSpec`, Stildaten in `style/styles.ts`.
   - **Art:** Daten + Regel.
   - **Akzeptanz:** Satteldächer haben ≤ 15 % Kontrastspalten. Die Ortgangkante ist bei og 1–3 genau 1 Spalte breit. Neuer Lint `kantenanteil` in `analysis/buildingLints.ts`. Die Screenshot-Fälle `haus-mittelalter-*`, `haus-nordisch-*` zeigen ein dunkles, schmales Ortgangbrett.
2. **Windbrett aus einem Material + Apex schließen (R01) und Falltür-Brett (R02)**
   - **Was:** Bretter der äußersten Ortgangspalte aus `trim` statt `soffit`. Apex-Vollblock unter der Firstkappe. Option `verge: 'trapdoor'`.
   - **Modul:** `roofEngine.ts` Untersicht-Durchlauf (Z. 359–375).
   - **Art:** Regel.
   - **Akzeptanz:** In der Ortgangspalte ist die Zelle unter der Firstkappe belegt. Die Untersicht-Diagonale hat keine Luftzelle (neuer Lint). Falltüren tragen `open=true` und die Platte zeigt zur Ortgangspalte.
3. **Paletten-Lint „Kontrast × Dicke“ + neue Kantenwerte**
   - **Was:** `roofTrim` gegen `roof` mit ΔL* nach Tabelle 5.1 prüfen.
   - **Neue Werte:** `medieval_stone` Kante `dark_oak_planks` (als Brett bzw. Falltür); `mediterranean_white/warm` Kante = Ziegelfamilie, `soffit` = Wandfarbe (`smooth_quartz`/`smooth_sandstone`); `cherry_white` Kante nur als Falltür-Brett; die Firstrolle `ridge` bei `cherry_white` heller.
   - **Modul:** `style/lints.ts`, `style/palettes.ts` (Z. 80, 384–385, 455–457, 478–480).
   - **Art:** Daten + Lint.
   - **Akzeptanz:** Alle 18 Paletten bestehen den Lint. `stone_bricks` taucht als `roofTrim` nur zusammen mit `verge: 'parapet'` auf.
4. **Giebelfeld-Modul**
   - **Was:** Ein neues Modul verbraucht `RoofResult.gableCells`. `gableRecess` kommt aus Stilwahrscheinlichkeiten statt aus `false` (`plan.ts:423`). Elemente nach Tabelle 5.4: Fachwerk R13, Ochsenauge über die vorhandene Rundfenster-Vorlage, Lüftung bzw. Eulenloch R14, Verschalung R15. Neue Rolle `gable` in der Palette.
   - **Modul:** neu `roof/gableDetails.ts`, `house/plan.ts`, `buildHouse.ts`.
   - **Art:** Regel + Daten.
   - **Akzeptanz:** Kein Giebeldreieck mit ≥ 6 Zellen ohne Element. Elemente liegen nur auf Zellen aus `gableCells`. Fenster haben freien Dachraum dahinter. Bei Rücksprung sitzt das Holzwerk in d=+1.
5. **First als Stildaten, Mauerrolle, Firstenden**
   - **Was:** `ridgeStyle` aus `styles.ts` statt aus `plan.ts:203`. Mittelalter auf `slab` bzw. `wall_roll`. Neue Variante `wall_roll` = Mauer direkt in Kappenhöhe. Japanische Enden nach R11b.
   - **Modul:** `roofEngine.ts` (Z. 257–285), `plan.ts:203`, `styles.ts`.
   - **Art:** Daten.
   - **Akzeptanz:** Der First steht ≤ 1 Block über der Dachfläche, außer bei jap und Pagode. Die Mauerrolle hat an beiden Enden `up=true`, der Auflöser ist ein Fixpunkt.
6. **Firstabschlüsse als Daten (R11a, c, d)**
   - **Was:** `style.finials: [{ kind: 'fence'|'rod'|'end_rod'|'crossed'|'lantern', p }]`, je Ende.
   - **Modul:** `roofEngine.ts` (Firstenden kennt nur die Engine) oder ein Nachlauf in `buildHouse.ts`.
   - **Art:** Daten.
   - **Akzeptanz:** nor-Satteldächer haben immer Kreuzbretter. Kein `end_rod` ≤ 2 und keine Laterne bzw. kein Lagerfeuer ≤ 3 Schritte von einer Schneeschicht (Lint mit den vorhandenen `light`-Werten der Registry).
7. **Kaminkopf, versenktes Feuer, Querschnitt (R20–R22)**
   - **Was:** Schaft 2×1 bzw. 2×2, Kopf mit Auskragung und Kranz, Feuer verdeckt. Für 1×1 die Falltür-Manschette. Höhe nach 5.6.
   - **Modul:** `house/components.ts:135–164`.
   - **Art:** Regel + Daten (`chimneyHead` je Stil).
   - **Akzeptanz:** Auf Feuerhöhe sind alle 4 Nachbarn des Feuers blickdicht (Block, Kopfüber-Treppe mit Vollseite zum Feuer oder offene Falltür mit Platte zum Feuer). Darüber ≥ 3 Luft, keine geschlossene Falltür darüber. Der Kopf ist breiter als der Schaft. Kopfoberkante ≥ Firstoberkante + 1 bei Firstnähe.
8. **Gauben als Typen mit Rücksprung und Achsenbindung (R17–R19)**
   - **Was:** `dormerType` in den Stildaten. Die Front sitzt 1 hinter der Traufwand, wenn die Machbarkeitsregel aus R17 erfüllt ist, sonst Zwerchhaus. Achse = Fensterachse. Fenster ≥ 1×2. Gaubendach ohne Kontrast-Traufreihe. Wangen bis unter das Gaubendach füllen.
   - **Modul:** `house/components.ts:24–77`, `house/openings.ts` (Achsen).
   - **Art:** Regel + Daten.
   - **Akzeptanz:** Bei Nicht-Zwerchhaus ist die Traufreihe unter der Gaube durchgehend belegt. Gaubenfirst ≤ Hauptfirst − 1. Gaubenmitte = x einer Fensterachse. Kein Luftloch zwischen Wange und Hauptdach (neuer Lint: In der Wangenebene ist jede Zelle zwischen Hauptdachfläche und Gaubendach belegt).
9. **Tragwerk bei großem Überstand (R04, R09)**
   - **Was:** Pfettenköpfe bei og ≥ 2, Kastengesims bei og 3 (jap, nor).
   - **Modul:** `roofEngine.ts` Untersicht-Durchlauf.
   - **Art:** Regel.
   - **Akzeptanz:** og ≥ 2 ergibt ≥ 3 Pfettenköpfe je Giebel, spiegelsymmetrisch. og 3 hat eine durchgehende Untersicht in der Höhe Traufe − 0,5.
10. **Dachflächen-Mischung (R23)**
    - **Was:** neue Rolle `roofMix` (Liste mit Gewichten). In `pieceState` je Spalte per Wertrauschen wählen, mit Bias für untere Reihen, Ecken und Nähte. Kante und First bleiben im Hauptmaterial.
    - **Modul:** `roofEngine.ts` (Z. 115–126, 249), `style/texturing.ts` (`valueNoise` wiederverwenden), `style/palettes.ts`.
    - **Art:** Daten.
    - **Akzeptanz:** Hauptmaterial 60–85 % der Flächenspalten. ≥ 60 % der Nebenmaterialspalten haben einen gleichen Nachbarn (Cluster statt Streuung). Gleicher Seed ergibt bitgleiches Ergebnis.
11. **Traufwiederkehr und Giebelfußgesims (R06)**
    - **Was:** Stiloption mit Länge 2–3 oder voller Breite.
    - **Modul:** `roofEngine.ts` Untersicht-Durchlauf.
    - **Art:** Daten.
    - **Akzeptanz:** Nur Luftzellen werden belegt. Die Formen ergeben sich ohne Konflikt mit dem Gesims (unterschiedliche `half`).
12. **Gratbetonung (R12)**
    - **Was:** Für hip, pyramid, skirt und mansard: Spalten mit `dx === dz` im Firstmaterial.
    - **Modul:** `roofEngine.ts` `layoutAt` + Materialwahl.
    - **Art:** Regel.
    - **Akzeptanz:** Grate sind durchgehend vom Ring 0 bis zum First. Die Ecktreppen sind `outer_*`, der Auflöser ist ein Fixpunkt.
13. **Traufkonsolen im Ständerrhythmus (R08)**
    - **Was:** Konsolen nur an Ständerachsen aus `studs.ts`.
    - **Modul:** `roofEngine.ts` (bekommt die Achsen über den Plan) oder `walls.ts`.
    - **Art:** Regel.
    - **Akzeptanz:** Konsolen stehen nur über Ständern, Abstand 3–5, nie über Fenstern.
14. **Regenkette jap (R24)**
    - **Modul:** `house/components.ts`.
    - **Art:** Daten.
    - **Akzeptanz:** Die Kette reicht von der Traufecke bis 1 über dem Boden, mit Topf darunter, nur bei jap und che, p ≈ 0,5.

**Registry-Ergänzungen (optional):**
- `exposed_/weathered_/oxidized_lightning_rod` und deren `waxed_*`-Varianten für grüne Spitzen.
- `copper_chain`/`waxed_*_copper_chain` (seit 1.21.9 [13]).
- `nether_brick_fence` (japanische Laternenhalter [58]).
- `waxed_chiseled_copper` (Kuppel- und Spitzensockel [64]).
- `glow_lichen` (Moosakzente [64]).

Alle diese Blöcke gibt es in Java 1.21.11, sie fehlen aber in der Registry.

---

## Quellen

1. https://minecraft.wiki/w/Tutorial:Roof_types — Gaubentypen (Wand-, Blind-, Giebel-, Walm-, Flach-, Schlepp-, Fledermaus-, Nantucket-Gaube), Flachdachrand „different block types“, Rinne aus rückwärtigen Treppen, Fledermausgaube auf Stroh.
2. https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines — Dachabschnitte, Verschneidungen; Überstände nur in Bildunterschriften.
3. https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions — Dach in der Hauspalette, Treppen als Übergang zwischen Wand und Dach.
4. https://minecraft.wiki/w/Trapdoor — Zustände, 3/16 dick, facing gegenüber dem Scharnier, kein Halt nötig.
5. https://minecraft.wiki/w/Lightning_Rod — facing in 6 Richtungen, vier Oxidationsstufen, Wachs.
6. https://minecraft.wiki/w/End_Rod — Licht 14, schmilzt Schnee im Radius 2, hält ohne Stütze.
7. https://minecraft.wiki/w/Campfire — Rauch ~10 bzw. 24 Blöcke, Block direkt darüber teils durchlässig, Falltür blockiert, Licht 15.
8. https://minecraft.wiki/w/Wall — `up` und `low`/`tall`, Pfostenregel (kein Pfosten bei zwei gegenüberliegenden Verbindungen).
9. https://minecraft.wiki/w/Fence — Verbindungen, keine Stütze nötig, verbindet nicht mit Mauern.
10. https://minecraft.wiki/w/Carpet — Teppich auf jedem Block außer Luft.
11. https://minecraft.wiki/w/Flower_Pot — Java: ohne Stütze; `potted_*` sind eigene Blöcke.
12. https://minecraft.wiki/w/Snow — schmilzt ab Blocklicht 12, liegt auf Kopfüber-Treppen.
13. https://minecraft.wiki/w/Chain — Ketten schweben frei, Kupferketten seit 25w32a (1.21.9), Umbenennung zu Iron Chain.
14. https://minecraft.wiki/w/Tutorial:Architectural_terms — Definition Dormer.
15. https://de.minecraft.wiki/w/Anleitungen/Dach — Umrandung Holz + Stein, Firstdekoration aus Bruchsteinmauern, Wikingergiebel, Schornstein aus Ziegel.
16. https://en.wikipedia.org/wiki/Bargeboard — Windbrett: schützt und verdeckt Pfettenenden, oft beschnitzt.
17. https://en.wikipedia.org/wiki/Cornice_return — Gable Return: Greek Return (gedeckt) und Soffit Return.
18. https://en.wikipedia.org/wiki/Dormer — Gaubentypen; Schleppgaube flacher als das Hauptdach; Fledermausgaube „low and wide … curved roof and no sides“.
19. https://en.wikipedia.org/wiki/Lookout_(architecture) — Outlooker tragen den Ortgangüberstand, ab 12 in Überstand Outrigger empfohlen.
20. https://en.wikipedia.org/wiki/Eaves — Funktion der Traufe, Fascia, Soffit, Konsolen.
21. https://en.wikipedia.org/wiki/Soffit — offene und geschlossene Untersicht, Fascia, große Überstände bei Chalet- und Tudorbauten.
22. https://en.wikipedia.org/wiki/Chigi_(architecture) — gekreuzte Giebelhölzer, Katsuogi in Reihe auf dem First.
23. https://en.wikipedia.org/wiki/Chimney_pot — Aufsätze; mehrere Töpfe = mehrere Feuerstellen.
24. https://en.wikipedia.org/wiki/Chimney — Höhe und Zug; Staffelgiebel für den Zugang zum Kamin.
25. https://en.wikipedia.org/wiki/Dragestil — steile Dächer, große Traufen, Drachenköpfe an Giebeln und Firsten.
26. https://en.wikipedia.org/wiki/Swiss_chalet_style — breite Traufen, sichtbare Balken, große Konsolen, verzierte Windbretter, Verbretterung.
27. https://en.wikipedia.org/wiki/Chalet — „wide, well-supported eaves“.
28. https://en.wikipedia.org/wiki/Crow-stepped_gable — Staffelgiebel als Brüstungsmauer über dem Dach, regionale Stufengrößen.
29. https://en.wikipedia.org/wiki/Finial — Spitzen an Apex, First und Giebelenden.
30. https://en.wikipedia.org/wiki/Gingerbread_(architecture) — verzierte Windbretter und Finials an Giebeln.
31. https://en.wikipedia.org/wiki/Gable — Giebeltypen (shaped, crow-stepped, Wimperg).
32. https://en.wikipedia.org/wiki/Onigawara — Ziegel an Firstenden und Ecken.
33. https://en.wikipedia.org/wiki/Irimoya — Walm unten, Giebel oben.
34. https://en.wikipedia.org/wiki/Japanese_architecture — Dach oft halb so groß wie das Gebäude, weite Traufen, Konsolensystem Tokyō.
35. https://en.wikipedia.org/wiki/Tudor_architecture — Skyline aus Kaminen, Finials und Giebeln; gedrehte Ziegelkamine.
36. https://en.wikipedia.org/wiki/Roof_tiles — Firstziegel, Gratziegel, Mönch und Nonne.
37. https://en.wikipedia.org/wiki/Rafter — Aufschiebling (sprocket/coyau) am Traufpunkt.
38. https://www.aisf.or.jp/~jaanus/deta/g/gegyo.htm — Gegyo: Zierbrett über First- und Pfettenenden am Giebel.
39. https://de.wikipedia.org/wiki/Dachgaube — Gaube sitzt hinter der Außenwand, von der Traufe zurückgesetzt; Formenliste.
40. https://de.wikipedia.org/wiki/Fledermausgaube — Gaubenhöhe : halbe Gaubenbreite = 1:3.
41. https://de.wikipedia.org/wiki/Zwerchhaus — Front in der Fassadenebene, nimmt die Fensterachsen auf.
42. https://de.wikipedia.org/wiki/Ortgang — Stirnbrett und Windbrett, Ortgangziegel, historische Verzierungen.
43. https://de.wikipedia.org/wiki/Giebel — Dreiecks-, Staffel-, Schweif- und Schildgiebel; Giebelgesims; Pferdeköpfe.
44. https://de.wikipedia.org/wiki/Uhlenloch — Giebelöffnung unter dem First (Rauchabzug, Eulen).
45. https://de.wikipedia.org/wiki/Ochsenauge_(Architektur) — Rund- und Ovalfenster in Giebeldreiecken und Gauben.
46. https://de.wikipedia.org/wiki/Dachüberstand — Funktion, Abschluss am Ortgang, breite Überstände in den Alpen.
47. https://de.wikipedia.org/wiki/Traufe — Begriffe Traufe, traufständig, Rinne, Traufhöhe.
48. https://de.wikipedia.org/wiki/Aufschiebling — Knick an der Traufe durch flachere Neigung.
49. https://de.wikipedia.org/wiki/Schornsteinkopf — Abdeckplatte mit Tropfkante; Mündung höher als umgebende Dachbauteile.
50. https://www.baunetzwissen.de/glossar/o/ortgang-49015 — Ortgang-Ausführungen (Formsteine, Windbrett, Formteile, Rinne).
51. https://guide.astroworldmc.com/how-to-build-a-roof — Fascia unter dem Überstand, Giebel 1 zurücksetzen, Pfosten auf dem First, typische Fehler.
52. https://guide.astroworldmc.com/how-to-add-detail-to-builds — Kopfüber-Treppe als Lippe, Detail an Eingang, Fenstern und Dachlinie.
53. https://guide.astroworldmc.com/how-to-choose-a-block-palette — Akzente unter ca. 10 %, „depth comes from value contrast“, Dunkles unter Überstände.
54. https://guide.astroworldmc.com/how-to-build-a-japanese-house — aufgebogene Ecken, flache Neigung, Endstab bzw. Blitzableiter als Spitze.
55. https://guide.astroworldmc.com/how-to-build-a-medieval-house — steiles Dach etwa so hoch wie die Wände, leichter Überstand.
56. https://guide.astroworldmc.com/how-to-build-a-cottage — unregelmäßige, verwitterte Dachfläche, Lagerfeuer im Kamin.
57. https://buildingguide.app/minecraft-roof-designs — Falltüren als Ortgangzier, Gaube 2 breit, Material mischen.
58. https://buildingguide.app/tutorials/red-japanese-temple — Ecken 1–2 Blöcke angehoben, Laterne an Netherziegelzaun.
59. https://buildingguide.app/tutorials/teal-roof-cottage — Moos und Laub in unteren Reihen und Ecken, gemischtes, gewachstes Kupfer.
60. https://buildingguide.app/tutorials/medieval-merchant-house — Moos an Nahtstellen, niedrigerer Anbau, Kupfer wachsen.
61. https://buildingguide.app/tutorials/medieval-cottage — Kamin hinten mit Lagerfeuer oben; volle Terrakotta-Blöcke als Schräge sind hässlich.
62. https://buildingguide.app/minecraft-medieval-builds — Zaunpfosten als Firstspitzen, Gauben, Asymmetrie.
63. https://buildingguide.app/minecraft-building-tips — Überstand 1–2, Dachabschnitte in verschiedenen Höhen.
64. https://cozygamebuilds.com/minecraft-roof-design-ideas/ — Falltüren flach gegen Stufen, gemischte Moostreppen, Spitzen (Blitzableiter, Zaun), Moosteppich auf dem First, Untersichten.
65. https://cozygamebuilds.com/minecraft-forest-cabin-ideas/ — Dunkeleiche-Kanten, schiefer Blackstone-Kamin mit Seelenfeuer; enthält die falsche Angabe „Schnee auf Treppen“.
66. https://cozygamebuilds.com/minecraft-village-house-ideas/ — Kopfüber-Treppen als Konsolen, Firstbaum aus Stamm, Kamin am Giebel.
67. https://gamertagmythras.com/blog/minecraft/minecraft-building-tips — Überstand 1–2, Dach im Kontrast zur Wand.
68. https://www.4netplayers.com/en-au/blog/minecraft/minecraft-roofs-building-tips-tricks-roofdesign/ — Verläufe, First bei gerader und ungerader Breite, Dachdetails (Kamin, Blitzableiter, Flagge).
69. https://www.4netplayers.com/de/blog/minecraft/minecraft-daecher-bauen-tipps-tricks-dachdesign/ — DE: Farbverläufe aus ähnlichen Blöcken, Bordüre.
70. https://www.vintagestory.at/forums/topic/4588-roof-struggles/ — Trim = Rand in anderer Farbe; Giebelfläche für Fenster oder Deko nutzen.
71. https://ar5iv.labs.arxiv.org/html/2108.02955 — GDMC-Juroren: Wiederholung, fehlende Dekoration, „small mistakes … ruin the whole impression“.
72. https://ar5iv.labs.arxiv.org/html/2103.14950 — GDMC erstes Jahr: Ästhetik „lacking in variability“.
73. https://www.kodeclik.com/how-to-build-a-roof-in-minecraft/ — Stufen am Überstandsrand, Treppen schichtweise.
74. https://primagames.com/?p=138945 — (nur Such-Snippet, Seite 403) Falltüren um verborgenes Lagerfeuer als kleinster Kamin; 1×2-Turm mit zwei Lagerfeuern.

Zusätzlich verwendet: die eigenen Projektdaten `src/core/style/textureStats.ts` (L*-Werte), `docs/COMPATIBILITY.md` und `src/core/blocks/families.ts` (Registry-Abgleich) sowie die alte Notiz `daecher.md`.
