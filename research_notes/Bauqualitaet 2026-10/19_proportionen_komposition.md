# 19 – Proportionen, Baumasse, Silhouette und Komposition: was Profis anders machen

Stand 2026-10-23. Thema: Nach welchen messbaren Regeln Profis Baukörper staffeln, Dächer und Wände ins Verhältnis setzen, Fassaden rhythmisieren und Details dosieren, und wie der Generator diese Regeln planen und prüfen kann.

> Konventionen
> - Block-IDs ohne `minecraft:`, gegen `docs/COMPATIBILITY.md` geprüft. Blöcke, die es in 1.21.11 gibt, die aber in der Registry fehlen, sind mit „(nicht in Registry)“ markiert.
> - Treppen: `facing` = Richtung der hohen, vollen Rückseite (wie in `waende_struktur.md`). Tiefe d: −1 innen, 0 Wand, +1/+2 davor.
> - Koordinaten wie im Generator: X = Osten, Y = oben, Z = Süden, Hausfront = Norden. In Frontansichten blickt man nach Süden, links = Osten.
> - Belegte Aussagen tragen eine Quellennummer [n]. „Einschätzung“ = eigene Ableitung, im Spiel zu prüfen.
> - Bekanntes aus `waende_struktur.md` (Abschnitt 6: Massen, 1/3–1/2, 25 %, ungerade Breiten, Wohnhaus-Maße) und `daecher.md` (Abschnitt 7: Dach 1–2 Geschosse, Teilung ab ≈15×15, Anstieg 5–7 je Abschnitt) wird hier nicht wiederholt, nur weitergeführt oder korrigiert.
> - Reddit, Planet Minecraft und McMansion Hell waren per WebFetch gesperrt (403 bzw. kein Zugriff). Das Websuche-Kontingent war während der Recherche aufgebraucht. Die übrigen Quellen sind direkt abgerufen.

## Kurzfassung

Nach Wirkung sortiert:

1. **Die Hauptansicht zeigt fast immer eine Kiste.** Flügel setzt `plan.ts` nur hinten an, den Zwerchgiebel nur bei `rambling`. Fünf von acht Stilen bleiben bis `large` ein Quader. Profis bauen einen dominanten Hauptkörper und 1–3 untergeordnete Volumen, eines davon in der Hauptansicht [1][2][26][29]. Das ist der größte Hebel.
2. **Hierarchie in Zahlen:** Nebenfirst −1 (besser −2), gleiche Dachfamilie, Rücksprung 1–2 oder Vorsprung ≥ 2. Gleich hohe, bündige Anbauten lesen sich als ein langer Kasten [2][22][27].
3. **Dächer kaskadieren statt plätten** [22]. Der feste Deckel von 7 Anstieg (`roofEngine.ts:217`) flacht tiefe Dächer ab. Besser: teilen (Doppelfirst, Querflügel, Giebel drehen).
4. **Dach-Wand-Verhältnis R = h_D / h_W als Stilparameter.** Heute fällt R mit der Geschosszahl von ≈ 1,0 auf ≈ 0,45. Zielbänder je Stil in T4 (Einschätzung nach [2][23][34][38]).
5. **Silhouette mit Brüchen:** In jeder Ansicht ein Höhensprung oder Akzent (Kamin, Gaube, Turm, Quergiebel); eine ungebrochene Firstlinie verrät den Anfänger [1][4][29]. Messbar mit L3.
6. **Der Eingang ist der Fokus:** eigener Giebel, meiste Details, größte Öffnung; der Rest ruhiger [1][2][21].
7. **Fassadenraster mit Ruhezonen** statt eines Fensters in jedem Feld (`openings.ts:262–277`): Gruppen (3er, A-B-A) und freie Felder [5][29][41].
8. **Geschosshierarchie:** höheres EG, nach oben kleinere Fenster, Kniestock 1–2 senkt die Traufe [23][39]. Heute gilt `floorHeight` [4,5] für alles.
9. **Keine Rückseite** [29]: Heute liegen Tür, Gauben, Erker, Balkon und Veranda nur vorn (`plan.ts:126`, `components.ts:24–33`, `openings.ts:233–239`). Messbar mit L8.
10. **Gauben untergeordnet:** auf Fensterachsen, Abstand zu Ortgang und First, gleichmäßig verteilt, lieber zwei kleine als eine große [27][28].
11. **Türme überragen klar (≥ 25 %) und bleiben schlank** [1][40]. Das Ringband auf jedem Geschoss (`roundTower.ts:119–128`) zerlegt den Schaft.
12. **Kein quadratischer Grundriss** (medium oft 9×9, `styles.ts:77, 104, 131`): Sattel auf Quadrat wirkt wie „Kiste mit Hut“, Walm wie eine Pyramide [8]. Ziel 1 : 1,3 bis 1 : 2 (Einschätzung, vgl. [20]).
13. **Gleichgewicht statt Spiegelkopie:** Formale Stile (mediterran, japanisch, Kirschblüte) brauchen symmetrische Zusatzvolumen, modern ein Raster mit versetzten Kuben, informelle Stile ausbalancierte Asymmetrie [30][32][33][36].
14. **„Bewohnt“ heißt Tätigkeitsspuren** wie Holzstapel, Fässer, Trampelpfade, Zäune; ein einziges unpassendes Detail kann den Eindruck kippen [16][17].
15. **Drei Detailebenen mit Budget:** Makro, Meso, Mikro, je mit Lesedistanz und Höchstdichte (T13; Einschätzung nach [1][2][10][12]).

## Schwächen des aktuellen Generators

Aus den Screenshots in `docs/screenshots/` (Seed 1; die Bilder „gross-ohne-thema“ zeigen die Rückseite) und aus dem Code.

### Massenplanung (`src/core/generator/house/plan.ts`, `resolveInput.ts`)

| # | Befund | Stelle | Wirkung im Bild |
|---|---|---|---|
| S1 | Flügel (L/T/U) werden immer an die Rückseite gesetzt (`z0: D − 1`). Die Front bleibt eine gerade Flucht. | `plan.ts:224–254` | Von vorn ist jedes L/T/U-Haus ein Rechteck. |
| S2 | Flügel gibt es nur bei `huge` oder `rambling`, Anbauten nur bei asymmetrischen Stilen. `rambling` wird nie als Standard gewählt. | `resolveInput.ts:67, 79, 98` | Nordisch, japanisch, Kirschblüte, modern und mediterran (`symmetric: true`, `styles.ts:160, 189, 216, 243, 270`) sind bis `large` immer ein einzelner Quader: `haus-mediterran-*`, `haus-modern-*`, `haus-kirschbluete-*`. |
| S3 | Der Stil „modern“ verspricht „versetzte Baukörper“, der Plan erzeugt aber nur einen Kubus. | `styles.ts:231` vs. `plan.ts` | `haus-modern-gross-ohne-thema.jpg`: ein Würfel mit zwei Rahmen |
| S4 | Der Quergiebel steht nur bei `rambling` vorn, als einziger Fokusgiebel. | `plan.ts:256–275` | Mittelalter/Fantasy mittel: Fokus nur über Veranda und eine Gaube |
| S5 | Eckturm fest 5×5; Rundturm D = 7/9 bei Geschossen + 2. Bei 11×11×2 überragt der Zinnenkranz den Hauptfirst nur um ≈ 3 (≈ 16 %). | `plan.ts:312–334, 361–395` | `haus-mittelalter-rundturm-*`: Mit Kranz wirkt der Turm fast so breit wie der Giebel und kaum höher, also gleichrangig. |
| S6 | Am Rundturm sitzt auf jedem Geschoss ein Band aus Kopfüber-Treppen. | `roundTower.ts:119–128` | `turm-mittelalter-zinnen.jpg`: gestapelte Trommeln statt Vertikale |
| S7 | Sattel wird ab `min(w,d) > 13` zum Walm, Pagode immer. Auf 13×11 oder 15×11 bleibt ein kurzer First: Stufenpyramide. | `plan.ts:186–191` | `haus-mediterran-*`, `haus-japanisch-*`, `haus-kirschbluete-*` |
| S8 | medieval, fantasy, rustic medium 9×9, mediterranean small 7×7: quadratisch. | `styles.ts:77, 104, 131, 268` | `haus-mittelalter-weihnachten.jpg`: Würfel mit Dach |
| S9 | Flügel zu 50 % ein Geschoss niedriger. Ob sein First unter dem Hauptfirst liegt, prüft der Plan nicht; das folgt nur aus der geringeren Breite. Der Anbau ist fest 4 tief. | `plan.ts:225, 234, 281` | – |

### Proportionen (`src/core/style/styles.ts`, Dach-Engine)

Dach-Wand-Verhältnis R = h_D / h_W. h_W ist die Wandoberkante über Gelände (Sockel + Geschosse × FH), h_D der Anstieg bis Oberkante First. Die Werte sind aus den Standardgrößen, `roofSection()` und dem 7er-Deckel hergeleitet (≈, Mittel aus FH 4–5 und Sockel):

| Stil, Größe | Maße | h_W | h_D (Deckel 7) | R | Urteil (Einschätzung) |
|---|---|---|---|---|---|
| medieval medium | 9×9×2 | ≈ 10,5 | 7 | ≈ 0,67 | passt |
| medieval huge | 15×13×3 | ≈ 15 | 7 | ≈ 0,47 | Dach zu klein für ein Steildach-Stadthaus |
| nordic medium | 9×15×1 | ≈ 7 | 7 | ≈ 1,0 | passt (Langhaus: Dach dominiert) |
| nordic huge | 13×25×2 | ≈ 11,5 | 7 | ≈ 0,6 | Langhaus verliert seinen Charakter |
| japanese large | 15×11×2 | ≈ 10,5 | ≈ 6–7 | ≈ 0,6 | passt, aber Walm auf 1,36 : 1 → Pyramide |
| mediterranean medium | 11×9×2 | ≈ 10 | ≈ 2,5–3 (flach) | ≈ 0,27 | flach ist richtig, Kubus + Pyramide nicht |

Weitere Befunde:
- **S10** `floorHeight: [4, 5]` für alle Stile und Geschosse (`styles.ts:74, 101, 128, 155, 184, 211, 238, 265`): kein höheres EG, kein Kniestock, kein Dachgeschoss.
- **S11** `maxRise` fest 7, Türme 12 (`plan.ts:426`, `roofEngine.ts:217`). „Dach 1–2 Geschosse“ (`daecher.md` §7) erlaubt bei FH 5 bis 10; der Deckel flacht steile Profile ab.
- **S12** Gauben nur vorn, nur bei First in x, ab Spannweite 9, 1–2 Stück, gleich verteilt statt auf Fensterachsen, Fenster 1×1 (`components.ts:24–33, 73`). Hinten bleibt die Dachfläche leer (`haus-mittelalter-gross-ohne-thema.jpg`: ≈ 15 × 7 ohne Unterbrechung).
- **S13** Kamin als Zug 1×1, unten 2 breit (`components.ts:149–163`): bei Giebeln von 11–15 wirkt er wie ein Rohr.
- **S14** Fenster in jedem Feld und Geschoss, eine Vorlage je Fassade, keine Ruhefelder, kein Giebelfenster, keine Abstufung (`openings.ts:260–307`).
- **S15** Die Lints (`buildingLints.ts:106–153`) prüfen weder Proportionen noch Hierarchie, Silhouette, Glasanteil oder Rückseite.

### Komposition (Screenshots)

- **Marktstand:** zwei identische Buden mit gleicher Firsthöhe (Regel ±1–2 in `daecher.md` §7).
- **Grundstück:** Haus mittig auf quadratischem Rasen mit Heckenrand, wie ein Diorama-Rahmen (Randgestaltung: Thema Landschaft). Kompositionsregel: Vorgarten größer als Rückraum (T12).
- **Positiv:** Der Bahnhof hat eine klare Hierarchie (hohe Halle, niedrigere Flügel), das rustikale Haus einen niedrigeren Anbaugiebel, das nordische Langhaus R ≈ 1. In diese Richtung sollten alle Stile gehen.

## Techniken und Regeln

### T1 Hauptbaukörper und untergeordnete Nebenbaukörper (Kaskade)

**Beschreibung.** Ein dominantes Hauptvolumen trägt 1–3 untergeordnete Volumen (Flügel, Anbau, Quergiebel, Turm, Veranda). Prüfstein ist der „big read“: Ergibt das Gebäude auf drei Volumen reduziert noch Sinn? [26]. Größere, ungewöhnlichere Volumen wirken wichtiger [24]. Bauleitfäden verlangen für Anbauten: untergeordnet, niedrigere Dachlinie, Dachform wie das Haupthaus, hinter der Hauptflucht [27]. Kleinere Dächer kaskadieren vom größten ab [22]. Builder nennen höheren Mittelgiebel, niedrigeren Seitenflügel oder Veranda als einfachste Hierarchie [2].

**Regeln (für den Generator):**
- Anzahl der Massen: `small` 1–2, `medium` ≥ 2, `large` ≥ 2, `huge` ≥ 3. Craftdex nennt 3–4 Quader [1]. Die Staffelung nach Größe ist eine Einschätzung.
- Grundfläche einer Nebenmasse höchstens 0,6 × Hauptmasse (Ziel ⅓–½ [1]).
- First einer Nebenmasse ≤ Hauptfirst − 1, Ziel −2 bis −3. Ausnahme: Turm.
- Traufe einer Nebenmasse ≤ Haupttraufe. Ein Anbau mit Pultdach endet ≥ 3 unter der Haupttraufe (so wie heute in `plan.ts:286`).
- Bündig zur Front ist verboten. Die Nebenmasse springt ≥ 1 zurück (Leitfaden: 1–2 m [27]) oder ≥ 2 vor (Quergiebel, Risalit).
- Dachform der Nebenmasse aus derselben Familie wie das Haupthaus: Walm zu Walm, Sattel zu Sattel [27].

**Skizze.** Hauptbau 11 breit mit Quergiebel 5 breit, der 3 vorspringt. Ansicht Nord (Blick nach Süden, links = Osten), x = −2…12, y = 0…15.
Legende: `r` = deepslate_tile_slab[type=bottom] (Hauptfirst), `=` = deepslate_tile_stairs[facing=south,half=bottom] (Nordseite des Hauptdachs), `c` = deepslate_tile_slab[type=bottom] (First des Quergiebels), `R` = deepslate_tiles, `/` = deepslate_tile_stairs[facing=west,half=bottom], `\` = deepslate_tile_stairs[facing=east,half=bottom], `G` = spruce_planks (Giebelfeld, Rolle upperWall), `B` = spruce_log[axis=x], `L` = spruce_log[axis=y], `w` = white_terracotta (infill), `g` = glass_pane, `T` = spruce_door, `S` = cobblestone, `~` = Gelände.

```
     x=-2 … x=12 (15 Spalten, Quergiebel x=-1…7)
y15  rrrrrrrrrrrrrrr     Hauptfirst y=15
y14  ===============
y13  =====c=========     Quergiebel-First y=13 (2 tiefer)
y12  ====/R\========
y11  ===/GGG\=======
y10  ==/GGGGG\======
y9   =/BBBBBBB\=====     Traufe beider Massen y=9
y8   .LLwwwwwLwwwwL.
y7   .LLwgggwLwggwL.     Fokusfenster 3 breit im Giebel
y6   .LLwgggwLwggwL.
y5   .BBBBBBBBBBBBB.     Geschossband
y4   .LLwwwwwLwwwwL.
y3   .LLwwTwwLwggwL.     Tür mittig im Quergiebel (x=3)
y2   .LLwwTwwLwggwL.
y1   .SSSSSSSSSSSSS.
y0   ~~~~~~~~~~~~~~~
```

**Einsatz:** alle Stile ab `medium`. medieval, fantasy, rustic: L oder Quergiebel. japanese, mediterranean: T, U oder H. modern: versetzte Kuben. nordic: Langhaus mit Anbau an der Traufseite.
**Wirkung** hoch · **Aufwand** mittel (`plan.ts` kann alle Massenarten schon, es fehlen Position und Regeln) · **Quellen** [1][2][22][24][26][27].

### T2 Massen-Archetypen und Grundrissformen jenseits des Rechtecks

**Beschreibung.** L-, T-, Kreuz- und versetzte Formen oder ein angebauter Turm lesen sich sofort interessanter als eine Kiste [3]; Formen mischen erzeugt Spannung [12]. Für formale Stile, deren Vorbilder rechteckig und symmetrisch sind [36], ist der Mittelrisalit der symmetrische Weg. Japanisch: Beim Irimoya liegt der Giebelteil über dem hohen Kern (moya), der Walmteil über dem Umgang (hisashi) [35]. Daraus folgt eine zweistufige Masse aus hohem Kern und niedrigem Umgang (Einschätzung). Organische Grundrisse erzeugen GDMC-Generatoren z. B. per Constrained Growth [19].

**Maße (Einschätzung, anschlussfähig an `waende_struktur.md` §6):**

| Archetyp | Hauptmasse B × T | Nebenmasse | Lage | Firstversatz |
|---|---|---|---|---|
| L | 11×7 bis 15×9 | 5–7 breit, ragt 3–5 vor | an einem Ende der Front, Tür in der Innenecke | −1…−2 |
| T / Risalit | 11×7 bis 15×9 | 5 breit (⅓–½ B), ragt 2–3 vor | Frontmitte, Tür mittig | −1…−2 |
| Versatz (Z) | 9×7 | 7×5, 2 zurückgesetzt | Verlängerung der Traufseite | −2 (oder 1 Geschoss weniger) |
| U | 15×7 | 2 × (5×4) | beide Enden, Hof 5 breit | −1…−2, beide gleich |
| H | 13×7 | 2 × (5×11) quer | beide Enden, Giebel zur Front | +0…+1 (Kopfbauten dürfen gleich hoch sein) |
| Kern + Umgang | Kern 9×5 (2 Gesch.) | Umgang 1–2 breit, 1 Gesch. | allseitig | Umgang-Pultdach unter der Kerntraufe |
| Kubus + Kubus | 9×9 + 7×7 | um 2–3 versetzt, auskragend erlaubt | modern | ±1 Geschoss |

**Skizzen.** Draufsicht, Norden oben, 1 Zeichen = 1 Block (Wandebenen ohne Überstand). `H` = Hauptmasse, `N` = Nebenmasse, `T` = Haustür, `.` = frei.

```
L (Tür in der Innenecke)    T / Risalit            Versatz (Z)             U (Hof 5 breit)
x: 0123456789A               0123456789A            0123456789ABCDEF        0123456789ABCDE
z-3 ......NNNNN              ...........            ................        NNNNN.....NNNNN
z-2 ......NNNNN              ...NNTNN...            ................        NNNNN.....NNNNN
z-1 ......NNNNN              ...NNNNN...            ................        NNNNN.....NNNNN
z0  HHHHTHNNNNN              HHHHHHHHHHH            HHHHHHHHH.......        NNNNN.....NNNNN
z1  HHHHHHHHHHH              HHHHHHHHHHH            HHHHHHHHH.......        HHHHHHHHHHHHHHH
z2  HHHHHHHHHHH              HHHHHHHHHHH            HHHHHHHHHNNNNNNN        HHHHHHHHHHHHHHH
z3  HHHHHHHHHHH              HHHHHHHHHHH            HHHHHHHHHNNNNNNN        HHHHHHHHHHHHHHH
z4  HHHHHHHHHHH              HHHHHHHHHHH            HHHHHHHHHNNNNNNN        HHHHHHHHHHHHHHH
z5  HHHHHHHHHHH              HHHHHHHHHHH            HHHHHHHHHNNNNNNN        HHHHHHHHHHHHHHH
z6  HHHHHHHHHHH              HHHHHHHHHHH            HHHHHHHHHNNNNNNN        HHHHHHHHHHHHHHH
```
Beim L und beim T läuft der First der Nebenmasse entlang z, der Giebel zeigt zur Straße. Beim Versatz liegt der N-First parallel zum H-First, 2 tiefer.

**Einsatz:** L bei medieval, rustic, fantasy (Gewicht hoch). T/Risalit bei japanese, cherry, mediterranean, nordic (Giebelvorbau am Langhaus). U/H bei mediterranean und japanese ab `large`. Kubus + Kubus bei modern.
**Wirkung** hoch · **Aufwand** mittel · **Quellen** [3][12][35][36][2].

### T3 Dachteilung statt Abflachen

**Beschreibung.** Wird der Anstieg zu hoch, teilen Profis das Dach in Abschnitte mit 5–7 Anstieg (`daecher.md` §7), statt es abzuflachen; das ist die Kaskade [22]. Drei Wege: (a) zwei parallele Firste mit Kehle („M-Dach“), (b) Giebel zur Straße drehen, (c) Quer- oder Seitenflügel. Walm auf fast quadratischem Grundriss ergibt eine Pyramide [8]; erst ab Seitenverhältnis ≥ 1,3 wählen, sonst Krüppelwalm, Sattel oder Teilung (Einschätzung).

**Regel (für `plan.ts` und `roofEngine.ts`):** Benötigter Anstieg nach Profil `rise_req = n × Steigung`. Ist `rise_req > maxRise_style`, wird geteilt, nicht abgeflacht. Firstlänge eines Walms ≥ ⅓ der Längsseite, sonst kein Walm.

**Skizze.** Schnitt quer zu beiden Firsten, Hauskörper 15 tief, zwei Satteldächer à 9 Spalten mit Kehle in der Mitte (Blick nach Osten, links = Norden).
Legende: `r` = deepslate_tile_slab[type=bottom], `R` = deepslate_tiles, `/` = deepslate_tile_stairs[facing=south,half=bottom], `\` = deepslate_tile_stairs[facing=north,half=bottom], `V` = deepslate_tiles (Kehlblock auf dem Mittelbalken), `B` = spruce_log[axis=x], `F` = spruce_planks (Decke), `W` = Wand, `:` = Luft innen.

```
y13  ....r.......r....
y12  .../R\...../R\...
y11  ../:::\.../:::\..
y10  ./:::::\./:::::\.
y9   /BFFFFFFVFFFFFFB\    Traufe y=9, Kehle y=9
y8   .W:::::::::::::W.
```
Ein einzelnes 45°-Dach über diese Tiefe bräuchte ≈ 8 Blöcke Anstieg und würde heute auf 7 gedeckelt. Geteilt sind es zwei Firste mit je 4. Die Kehle eignet sich als Schneekante (siehe Thema Winter).
**Einsatz:** Tiefe ≥ 13 bei Sattel- und Krüppelwalmdach. medieval und nordic eher (b) oder (c), rustic (a). **Wirkung** hoch · **Aufwand** mittel (Abschnitte und Vereinigung gibt es schon in `roofEngine.ts`) · **Quellen** [22][8], `daecher.md` §7.

### T4 Dach-Wand-Verhältnis je Stil

**Beschreibung.** Schmales Haus mit übergroßem Dach wirkt kopflastig, breiter Kasten mit Flachdach unfertig [2]; zu flach oder zu steil stört das Gleichgewicht [11]. Anker aus der Realität: Schwarzwaldhaus 45–50°, seitlich tief heruntergezogen [38]; Chalet mit schwerem, flachem Dach und breiten Traufen [37]; Minka mit tiefen Traufen [34]; mediterran flach geneigt [36]; Alexander: Dach ganz sichtbar, Traufe am Eingang bis ≈ 1,8 m [23].

**Zielbänder (Einschätzung aus den Vorbildern und der Wiki-Regel „1–2 Geschosse“).** R = h_D / h_W, gemessen am Hauptkörper. Zusätzlich gilt absolut: 0,5 × FH ≤ h_D ≤ 2 × FH + 1.

| Stil | R min | R max | Traufe über Gelände | Bemerkung |
|---|---|---|---|---|
| medieval | 0,6 | 1,3 | ≥ 5 | Steildach; bei 3 Geschossen h_D bis 10 erlauben |
| fantasy | 0,7 | 1,5 | ≥ 4 | Glocke/Steildach dominiert |
| rustic | 0,6 | 1,2 | ≥ 4 | Kniestock bevorzugt (T8) |
| nordic | 0,8 | 1,6 | ≥ 4 | Langhaus: Dach > Wand |
| japanese | 0,5 | 1,0 | ≥ 4 | dazu Überstand ≥ 2; Wand darf unter der Traufe verschwinden |
| cherry | 0,5 | 1,0 | ≥ 4 | wie japanese |
| mediterranean | 0,2 | 0,5 | – | flach; Höhe kommt aus Turm oder Risalit |
| modern | – | – | – | Flachdach: Attika 1–2; Rhythmus über Kubenhöhen |

**Skizze.** Messung von h_W und h_D. Schnitt quer zum First, 2 Geschosse (Blick nach Norden, links = Westen).
Legende: `r` = spruce_slab[type=bottom], `R` = spruce_planks, `/` = spruce_stairs[facing=east,half=bottom], `\` = spruce_stairs[facing=west,half=bottom], `B` = spruce_log (Rähm, axis parallel zur Fassade), `F` = spruce_planks, `W` = Wand, `S` = cobblestone, `^` = cobblestone_stairs[half=bottom, facing=zur Wand], `:` = Luft innen.

```
y15  ......r......   ┐
y14  ...../R\.....   │
y13  ..../:::\....   │ h_D = 15 − 9 = 6
y12  .../:::::\...   │
y11  ../:::::::\..   │
y10  ./:::::::::\.   ┘
y9   /BFFFFFFFFFB\   ← Traufe / Wandoberkante y=9
y8   .W:::::::::W.   ┐
y7   .W:::::::::W.   │
y6   .W:::::::::W.   │
y5   .BFFFFFFFFFB.   │ h_W = 9
y4   .W:::::::::W.   │
y3   .W:::::::::W.   │
y2   .W:::::::::W.   │
y1   ^SSSSSSSSSSS^   ┘
y0   ~~~~~~~~~~~~~      R = 6/9 ≈ 0,67
```
**Wirkung** hoch · **Aufwand** niedrig (Daten in `styles.ts` plus Lint) bis mittel (Teilung T3) · **Quellen** [2][11][23][34][36][37][38], `daecher.md` §7.

### T5 Silhouette: Brüche, Höhenstaffel, vertikale Akzente

**Beschreibung.** Silhouettentest: Ist der Bau als schwarze Fläche vor dem Sonnenuntergang noch erkennbar? [1]. Gute Silhouetten haben Rhythmus und Dachabschnitte in verschiedenen Höhen [4]; ein Kamin 3–4 über Dach bricht die Firstlinie [6]. Vorbilder: Tudor mit Quergiebeln und hohen Kaminen [30], Queen Anne mit Türmen [33], Storybook mit mehreren Giebeln und unebenen Dächern [31]. Bauleitfäden verlangen Höhenvariation und vielfältige Dachlandschaften [29].

**Regeln (messbar, Einschätzung):**
- Pro Ansicht (N, O, S, W) die Skyline s(u) bilden: das höchste nicht-dekorative Blockfeld je Spalte, ohne Laternen, Kerzen und Girlanden.
- Ab `medium` braucht jede Ansicht ≥ 1 Bruch: entweder ein Sprung |Δs| ≥ 2 zwischen Nachbarspalten oder ein Akzent, also eine Spitze von höchstens 3 Breite, die ≥ 2 über ihre Umgebung hinausragt (Kamin, Turm, Gaubenfirst, Dachreiter).
- Über alle vier Ansichten zusammen ≥ 3 Brüche. Ab `large` ≥ 2 verschiedene Traufhöhen.
- Der Kamin ragt 2–4 über den höchsten Dachpunkt im Umkreis von 2 [6]. Ab Giebelbreite 9 ist der Zug 2×1 oder 2×2 (Einschätzung; Kaminbau gehört zum Thema Dach).

**Skizze.** Skyline der Traufseite, schematisch (`#` = Silhouette). Links das heutige einfache Haus, rechts dieselbe Masse mit Kamin und Anbau.

```
heute: eine Linie      mit Brüchen
...............        .........##.....   Kamin +2
###############        ###########.....
###############        ###########.....
###############        ################   Anbau, Traufe 3 tiefer
###############        ################
```
**Einsatz:** alle Stile. modern über Kubenhöhen und Attika-Sprünge statt Kamin. **Wirkung** hoch · **Aufwand** niedrig (Lint) bis mittel (Kaminlage, Gauben hinten) · **Quellen** [1][3][4][6][29][30][31][33].

### T6 Fokuspunkt und Hierarchie der Öffnungen („Boss und Minions“)

**Beschreibung.** Der Haupteingang soll von den Zugängen aus sofort sichtbar sein und eine kräftige, vorstehende Form haben [21]. Die Detaildichte steigt zum Fokus: Eingang = „Boss“, Fenster = „Minions“ [1]. Ist alles gleich laut, fehlt der Fokus [2].

**Regeln (Einschätzung):**
- Fokus = Tür + Giebel darüber (Quergiebel oder Risalit) + größtes Fenster im Giebel + Laternen + Vordach.
- Mikro-Detaildichte in der Eingangszone (Türachse ±3 Spalten, Geschoss 0–1) ≥ 1,5 × Mittelwert der Fassade.
- Das größte Fenster der Fassade sitzt in der Fokusachse, z. B. W03b 3×2 im Giebel über der Tür, oder ein Rundfenster W08 im Giebeldreieck.
- Pro Bau genau ein Fokus. Ein zweiter, schwächerer ist erlaubt (Turm), wenn er nicht auf derselben Achse liegt.

**Skizze.** Siehe T1: Tür, 3-breites Giebelfenster und Quergiebel liegen auf der Achse x = 3. Die Dichtekarte steht bei T13.
**Einsatz:** alle Stile. Bei japanese die Mittelachse mit Vordach (Kara-hafu-artig, T09), bei mediterranean das Portal T04 mit Bogen. **Wirkung** hoch · **Aufwand** niedrig bis mittel (Door-Mass und Templates gibt es schon) · **Quellen** [1][2][16][21].

### T7 Fassadenrhythmus mit Ruhezonen

**Beschreibung.** Gleichmäßige Fenster schaffen Rhythmus, asymmetrische wirken nach Cottage [5]. Durchgehende Raster sind zu vermeiden, Elemente werden gruppiert [29]; Öffnungen fluchten untereinander [27]; ungerade Anzahlen wirken natürlicher [41]; keine Eckfenster [10]. Ein Fenster in jedem Feld ist der Anfängerfall, auch wenn jedes einzelne gut ist.

**Regeln (Einschätzung):**
- Je Geschoss und Fassade dieselbe Vorlage höchstens 4-mal hintereinander. Ab Fassadenlänge 11 mindestens ein Ruhefeld: ein Ständerfeld ohne Öffnung, über die volle Geschosshöhe.
- Symmetrische Fassaden haben 3, 5 oder 7 Achsen. Bei geraden Zahlen wird die Mitte zur Gruppe.
- Obergeschossfenster stehen in der Achse der Erdgeschossöffnungen (±0). Ein Fenster liegt ≥ 1 Feld von der Gebäudeecke entfernt oder ist bewusst ein Eckfenster (modern).
- Muster je Stil als Daten: medieval/rustic „A _ A B A _ A“ (B = Fokus), japanese/cherry „A A A A“ als Shoji-Band (Wandfeld statt Lochfenster), mediterranean „A B A“ streng symmetrisch, modern „Band“ plus geschlossene Fläche.

**Skizze.** Ansicht Nord, x = 0…14, Ständer bei 0, 4, 10, 14, Felder [3, 5, 3].
Legende: `L` = spruce_log[axis=y], `B` = spruce_log[axis=x], `w` = white_terracotta, `g` = glass_pane, `T` = spruce_door, `S` = cobblestone, `^` = cobblestone_stairs[facing=south,half=bottom].

```
x:  0123456789ABCDE
y9  BBBBBBBBBBBBBBB
y8  LwwwLwwwwwLwwwL
y7  LwgwLgwgwgLwgwL    OG: Einzelfenster | 3er-Gruppe in der Mitte | Einzelfenster
y6  LwgwLgwgwgLwgwL
y5  BBBBBBBBBBBBBBB
y4  LwwwLwwwwwLwwwL
y3  LwgwLgwTwgLwwwL    EG: Fenster | Fokus (Fenster-Tür-Fenster) | Ruhefeld
y2  LwgwLgwTwgLwwwL
y1  SSSSSS^^^SSSSSS
```
Glasanteil: 16 Glaszellen auf 105 Fassadenzellen (y = 2…8) ≈ 15 %. Rechts unten liegt das Ruhefeld; darüber steht ein Fenster, damit die Fassade nicht tot wirkt.
**Einsatz:** alle Stile mit Ständerraster. Glatte Wände (modern, mediterranean) über `axesFor` mit Mustern. **Wirkung** hoch · **Aufwand** mittel · **Quellen** [5][10][27][29][41].

### T8 Geschosshierarchie: hohes Erdgeschoss, Kniestock, abnehmende Fenster

**Beschreibung.** Räume mit 3 Blöcken Höhe wirken gedrungen, 4–5 sind besser, 7–8 nur für Hallen [4]; das Wiki nennt 5–6 für mittelalterliche Wohnräume und 10–12 für Säle [7]. Der Kniestock ist die Außenwand über der letzten Decke an der Traufseite, auf der das Dach aufliegt; je höher er ist, desto mehr Stellfläche gibt es unter der Schräge [39]. Er senkt die Traufe und vergrößert das sichtbare Dach (vgl. [23]). Gauben beziehen sich auf die Fenster darunter [28], sind also kleiner (Einschätzung).

**Regeln (Daten in `styles.ts`, Einschätzung):**
- `groundFloorExtra`: 0–1. Das Erdgeschoss ist 1 höher (lichte Höhe 4 statt 3) bei medieval, mediterranean, japanese (erhöhter Sockel plus Halle) und modern.
- `kneeWall`: 0–2. Bei rustic, nordic und fantasy ist 1–2 Standard, oft statt eines vollen Obergeschosses („1½ Geschosse“).
- Fensterhöhe: EG 2–3, OG 2, Dachgeschoss/Gaube 1–2. Die Fensterbrüstung liegt 1 über dem Boden [7].

**Skizze.** Schnitt, 1½ Geschosse mit Kniestock 2 (Blick nach Norden, links = Westen). Legende wie bei T4.

```
y14  ......r......
y13  ...../R\.....
y12  ..../:::\....
y11  .../:::::\...    Dachgeschoss (Gauben, T9)
y10  ../:::::::\..
y9   ./:::::::::\.
y8   /B:::::::::B\    Traufe y=8 sitzt auf dem Kniestock
y7   .W:::::::::W.    ┐ Kniestock 2
y6   .W:::::::::W.    ┘
y5   .BFFFFFFFFFB.    Decke EG = Boden DG
y4   .W:::::::::W.
y3   .W:::::::::W.
y2   .W:::::::::W.
y1   ^SSSSSSSSSSS^
y0   ~~~~~~~~~~~~~    R = 6/8 = 0,75, Traufe 1 tiefer als bei 2 vollen Geschossen
```
**Einsatz:** rustic, nordic, fantasy (Kniestock); medieval, mediterranean, japanese, modern (hohes EG). **Wirkung** mittel bis hoch · **Aufwand** mittel (`floorY`/`wallTopOf` brauchen je Geschoss eine eigene Höhe) · **Quellen** [4][7][9][23][28][39].

### T9 Gauben als untergeordnete Dachbauteile

**Beschreibung.** Gauben richten sich nach Stil, Proportion und Symmetrie der Fenster darunter, sind gleichmäßig verteilt (nicht zwingend genau darüber), stehen nicht am Dachrand, liegen hinter der Frontflucht und unter dem First und lassen den Großteil des Dachs sichtbar. Zwei kleine sind besser als eine große Kastengaube [28]. Nicht zu nah am First, Fenster fluchtend mit den Öffnungen darunter [27]. Tudor: Gauben auf Konsolen [30].

**Regeln (Einschätzung, übertragen auf Blöcke):**
- Gaubenfirst ≤ Hauptfirst − 1 (Ziel −2). Zwischen Wange und Giebelwand (bzw. Grat) liegen ≥ 2 Dachfelder.
- Summe der Gaubenbreiten (mit Überstand) ≤ 50 % der Dachlänge.
- Lage: auf einer Fensterachse des obersten Geschosses, sonst symmetrisch gleichmäßig. Anzahl ungerade (1, 3) bei symmetrischen Fassaden.
- Auch auf der Rückseite: ab Dachlänge ≥ 11 mindestens eine Gaube oder ein Kamin hinten.
- Fenster 1×2 statt 1×1, wenn Kniestock oder Dachhöhe es erlauben.

**Skizze.** Ansicht Nord auf die Dachfläche über einer 15 breiten Fassade (x = −2…16). Eine Gaube auf der Mittelachse x = 7; die Achsen darunter liegen bei 2, 7 und 12.
Legende: `r` = deepslate_tile_slab[type=bottom], `=` = deepslate_tile_stairs[facing=south,half=bottom], `c` = spruce_slab[type=bottom], `R` = spruce_planks, `/` = spruce_stairs[facing=west,half=bottom], `\` = spruce_stairs[facing=east,half=bottom], `L` = spruce_log[axis=y] (Wange vorn), `B` = spruce_log[axis=x], `g` = glass_pane, `w` = Rolle upperWall.

```
y15  rrrrrrrrrrrrrrrrrrr    Hauptfirst
y14  =========c=========    Gaubenfirst 1 unter Hauptfirst
y13  ========/R\========
y12  =======/LBL\=======
y11  ========LgL========
y10  ========LwL========
y9   ===================    Traufe
     ....|....|....|....    Fensterachsen x=2, 7, 12 darunter
```
Drei Gauben auf 2/7/12 verbieten sich hier: Die äußere Wange (x = 1 bzw. 13) läge nur 1 neben der Giebelwand (x = 0 bzw. 14). Möglich sind eine Gaube (Fokus) oder zwei auf x = 4 und 10, symmetrisch.
**Einsatz:** medieval, fantasy, rustic, nordic (selten). Nicht bei japanese, cherry, modern (`dormers: 0`). **Wirkung** mittel · **Aufwand** niedrig (`planDormers` bekommt Achsen statt Gleichverteilung, dazu die Rückseite) · **Quellen** [27][28][30].

### T10 Turmproportionen

**Beschreibung.** Der Fokus ist ≥ 25 % höher oder breiter als seine Umgebung [1]. Bergfriede sind 20–30 m hoch bei wesentlich kleinerer Grundfläche als Wohntürme, meist mit Zelt- oder Kegeldach und dicken unteren Mauern [40]. In einer Siedlungs-Heightmap ist ein Turm eine hohe Zelle zwischen niedrigen [18].

**Regeln (Einschätzung):**
- Schlankheit: Schaft h/D ≥ 2,5, Rundturm mit Kegel bis ≈ 4.
- D ≤ 0,65 × die kurze Seite des Haupthauses (ungerade). Bei D = 9 also Hausseite ≥ 15.
- Wandoberkante des Turms ≥ Hauptfirst + 2. Turmspitze ≥ 1,25 × Höhe des Hauptfirsts über Gelände.
- Bänder: Sockelschürze, ein Band auf Höhe der Haupttraufe und der Konsolenkranz oben. Dazwischen höchstens jedes zweite Geschoss ein Band.
- Der eckige Turm skaliert: `size = odd(clamp(round(0,45 × min(W, D)), 5, 9))`.

**Skizze.** Ansicht Front, schematisch. Rundturm D = 7 neben einem Haupthaus mit Traufe 9 und First 15.
Legende: `T` = Turmschaft (Rolle wall, z. B. stone_bricks), `K` = Konsolenkranz stone_brick_stairs[half=top, facing=zur Wand], `^` = Kegel (Rolle roof), `g` = glass_pane, `r`/`=` = Hauptdach, `S` = Sockel.

```
y29     ...^...
y26     ..^^^..       Kegel ≈ 1,1 × (D+2) ≈ 10 hoch
y22     .^^^^^.
y20     KKKKKKK       einziges Band oben (Konsolenkranz)
y19     .TTTTT.
y17     .TTgTT.                 Wandoberkante Turm y=19 ≥ First+2 (=17)
y15     .TTTTT.  rrrrrrrrrrrrr  Hauptfirst y=15
y12     .TTgTT.  =============
y9      KTTTTTK  BBBBBBBBBBBBB  Band auf Höhe der Haupttraufe
y5      .TTgTT.  (Wand)
y1      SSSSSSS  SSSSSSSSSSSSS  Sockel
```
Prüfung: Spitze 29 ≥ 1,25 × 15 = 18,75 ✓; h/D = 19/7 ≈ 2,7 ✓.
**Einsatz:** medieval (Zinnen), fantasy (Kegel, hoch), mediterranean (Kuppel/Torre), Bahnhof (Uhrturm). **Wirkung** hoch · **Aufwand** niedrig (Zahlen in `plan.ts` und `roundTower.ts`) · **Quellen** [1][18][40].

### T11 Dreiteilung Sockel – Mitte – Dach

**Beschreibung.** Fassaden werden durch Material oder Gliederung klar in Sockel, Mitte und Abschluss geteilt [29]. Sockel, Gesimsbänder, Fensterbänke, Stürze und Traufgesimse gelten als prägende Details [27]. Der Generator hat sie schon; es fehlt eine Regel für ihre Gewichtung.

**Regeln (Einschätzung):**
- Sockel 1–3 Lagen (≥ 8 % von h_W; Builder: „ein bis zwei Reihen Stein“ [13]), dunkler als die Wand.
- Mittelteil: eine Hauptwandfarbe (60 %).
- Abschluss: Traufe mit Untersicht und Kontrastkante (gibt es schon). Bei Flachdach eine Attika 1–2, die sich farblich vom Mittelteil absetzt.
- Bei ≥ 3 Geschossen ist das oberste Geschoss bzw. der Kniestock als eigenes Band erkennbar (Materialwechsel oder Rücksprung 1).

**Skizze (modern, Ansicht Nord, x = 0…10, y = 0…10).** Legende: `A` = gray_concrete (Attika), `a` = smooth_stone_slab[type=bottom] (Abdeckung), `W` = white_concrete, `g` = glass_pane, `S` = polished_andesite (Sockel), `T` = Tür (Vorlage T01), `~` = Gelände.

```
y10  aaaaaaaaaaa
y9   AAAAAAAAAAA     Abschluss (Attika)
y8   WWWWWWWWWWW
y7   WgggggWWWWW     Bandfenster, rechts geschlossene Fläche
y6   WgggggWWWWW
y5   WWWWWWWWWWW
y4   WWWWWWWgggW
y3   WWWTWWWgggW
y2   WWWTWWWgggW
y1   SSSSSSSSSSS     Sockel
y0   ~~~~~~~~~~~
```
**Einsatz:** modern, mediterranean (Gesims statt Attika), medieval (Stein-EG = Sockelzone). **Wirkung** mittel · **Aufwand** niedrig · **Quellen** [27][29][32].

### T12 Lived-in: Tätigkeitsspuren an Haus und Grundstück

**Beschreibung.** GDMC-Juroren werten jedes Indiz positiv, dass hier Menschen leben könnten: Nahrung, Arbeitsorte, Spuren von Tätigkeit, Grenzen um Häuser und Gärten [16] (Details im Abschnitt „Lived-in und Storytelling“). Cottage-Leitfäden nennen Holzstapel, Fässer, Wildblumen und Wege [6]. Umgebungs-Storytelling erzählt über die Gestaltung der Welt [43]; Storybook-Häuser zeigen bewusst gealterte, ungleiche Teile [31].

**Bausteine (alle mit Halt, ohne Inhalt, ohne Entities):**

| Spur | Blöcke/Zustände | Ort | Dichte (Einschätzung) |
|---|---|---|---|
| Holzstapel | spruce_log[axis=x\|z], Stirnholz zum Betrachter, 2–3 hoch, Abdeckung spruce_slab[type=bottom] | Traufseite oder Anbau, unter dem Überstand, d = +1 | 1 je Haus mit Kamin |
| Fässer und Vorrat | barrel[facing=up] (Blockentität ohne Inhalt, prüfen), hay_block[axis=y] | neben Hintertür oder Anbau, 2–3 Stück in Gruppe | 1 Gruppe |
| Arbeitsplatz | crafting_table, spruce_trapdoor[half=top,open=false] als Ablage | unter Pultanbau | bei Anbau 50 % |
| Pflanzen | potted_fern, potted_spruce_sapling, potted_poppy auf Treppen-Sims | neben der Tür, ungleich verteilt | 1–3 |
| Trampelpfad | dirt_path (Mitte), coarse_dirt (20 % Ränder) | Tür → Hintertür → Holzstapel | immer bei Garten |
| Leiter | ladder[facing=nach außen] an der Wand des Anbaus | Anbau oder Schuppen | 25 % |
| Feuerstelle | campfire[lit=true] im Ring aus cobblestone_slab[type=bottom] | Garten, ≥ 4 vom Haus | 10 %, nur Winter/Weihnachten |
| Komposter, Kessel, Schleifstein, Glocke | composter, cauldron, grindstone, bell (alle nicht in Registry) | Garten, Werkstatt, Kapelle | erst nach Ergänzung |

**Regeln.** Spuren gehören an Rückseite und Seiten, nicht nur nach vorn (stärkt T14). Der Anbau zeigt seine Funktion: offener Holzschuppen mit Zaunpfosten, Stall mit Heu oder Werkstatt mit Werkbank. Vorgarten ≥ 1,5 × Rückraum (Einschätzung).

**Skizze.** Holzlager an der Ostwand. Ansicht Ost (Blick nach Westen, links = Süden), z = 0…6, y = 0…5.
Legende: `w` = Wand (d = 0), `O` = spruce_log[axis=x] (d = +1, Stirnholz zum Betrachter), `s` = spruce_slab[type=bottom] (d = +1), `g` = glass_pane, `S` = cobblestone, `c` = coarse_dirt (d = +2, Gelände), `~` = Gelände.

```
y5   wwwwwww
y4   sssswgw      Abdeckung auf dem Stapel, rechts Fenster frei
y3   OOOOwgw
y2   OOOOwww
y1   OOOOSSS      Stapel steht auf dem Gelände vor dem Sockel
y0   cccc~~~
```
**Einsatz:** rustic, nordic, medieval, fantasy (hoch); japanese, cherry (sparsam: Töpfe, Wege); mediterranean (Töpfe, Fässer); modern (kaum: Pflanzkübel). **Wirkung** mittel bis hoch · **Aufwand** niedrig bis mittel (neues Modul, Validator prüft den Halt) · **Quellen** [6][16][17][31][43].

### T13 Detailebenen Makro, Meso, Mikro mit Budget

**Beschreibung.** Die Community trennt Makro (Wirkung aus der Ferne) und Mikro (Kleinteile aus der Nähe). Zu viele Treppen, Stufen und Kleinteile gelten als Überdetaillierung [10], der „große Farbklecks“ ohne Kontrast als das Gegenteil [12]. Arbeitsreihenfolge: Form, Palette, Tiefe, Dach, Details [3]. Für die Wandtiefe genügt ≈ 1 Block in und aus der Wand [14]. „Meso“ ist ein eigener Begriff dieser Notiz für die Fassadenordnung dazwischen (Einschätzung).

| Ebene | Inhalt | Lesedistanz (Einschätzung) | Budget je Bau/Fassade (Einschätzung) |
|---|---|---|---|
| Makro | Anzahl, Lage und Höhe der Massen, Dachformen, Hauptfarben 60/30/10 | ≥ 30 Blöcke | 2–4 Massen, ≤ 2 Dachformen, 3–5 Materialfamilien |
| Meso | Ständerraster, Achsen, Bänder, Sockel, Vorbauten, Gauben, Kamin | 10–30 | 2–4 wiederkehrende Elementtypen je Fassade (siehe `waende_struktur.md` §3) |
| Mikro | Falltüren, Knöpfe, Ketten, Laternen, Töpfe, Verwitterung | ≤ 10 | 0,08–0,30 Mikroblöcke je Fassadenzelle; Häufung an Eingang, Ecken und Traufe; ≥ 1 Ruhezone je Fassade |

**Skizze.** Dichtekarte der Mikroelemente (d = +1/+2) je Fassadenspalte, Front 15 breit, Zahl = Mikroblöcke pro Spalte und Geschoss.

```
x:   0 1 2 3 4 5 6 7 8 9 A B C D E
OG:  1 0 1 0 1 1 2 2 2 1 1 0 1 0 1
EG:  1 0 1 0 1 2 3 3 3 2 1 0 0 0 1
     ^Ecke      ^^Eingang^^   ^Ruhezone
```
**Wirkung** mittel (verhindert Lärm und Leere) · **Aufwand** niedrig (Lint), mittel (Budgetsteuerung in `openings.ts`) · **Quellen** [1][2][3][10][12].

### T14 Vierseitenkomposition: keine Rückseite

**Beschreibung.** Jede Fassade wird sorgfältig entworfen und zeigt Gestaltungsqualität, unabhängig von ihrem Rang [29]. Builder prüfen den Bau vom Weg aus von vorn, von der Seite und von hinten, bevor sie Details setzen [2]. Im Leveldesign gilt: im Spiel selbst testen, nicht nur im Editor herumfliegen [25].

**Regeln (Merkmalpunkte, Einschätzung):** Fenster 1 · Tür 3 · Gaube 2 · Kamin 2 · vorspringende Masse 3 · Vordach/Veranda 2 · Erker/Balkon 2 · Lived-in-Spur 1.
- Rückseite ≥ 50 % der Front, jede Seite ≥ 30 % der Front.
- Jede Fassade ≥ 5 Breite hat je Geschoss ≥ 1 Öffnung pro angefangene 6 Blöcke Länge. Ausnahme: Wände, an denen eine andere Masse anschließt.
- Hintertür (T01, einfach) mit kleinem Vordach an Süd- oder Seitenwand ab `medium`.
- Der Kamin steht abwechselnd an Giebel und Traufe bzw. hinten. Erker und Balkon dürfen an Seiten und Rückseite.

**Skizze (Draufsicht, Merkmale je Seite für ein L-Haus).** `D` = Tür, `d` = Hintertür, `K` = Kamin, `G` = Gaube, `V` = Vordach, `H`/`N` wie oben.

```
            Nord (Front): D, V, N-Giebel, G          → 3+2+3+2 = 10 (+ Fenster)
          ......NNNNN
          HHHHDHNNNNN
West: K   HHHHHHHHHHH   Ost: Fenster, Holzstapel     → ≥ 3
          HHHHHHHHHHH
          HHHHHHdHHHH
            Süd (Rückseite): d + Vordach, G, Fenster → 3+2+2 (+ Fenster) ≥ 5
```
**Wirkung** hoch (die Screenshots „gross-ohne-thema“ zeigen das Problem) · **Aufwand** mittel · **Quellen** [2][25][29].

### T15 Formale Symmetrie gegenüber ausbalancierter Asymmetrie

**Beschreibung.** Die Moderne setzt Regelmäßigkeit statt Symmetrie und Volumen statt Masse [32]. Mediterranean Revival hat symmetrische Hauptfassaden [36]. Tudor, Storybook und Queen Anne sind bewusst asymmetrisch: Quergiebel, Türme, Erker, ungleiche Teile [30][31][33]. Dass Asymmetrie „fast immer“ besser sei [4], gilt nur für informelle Stile (Einschätzung).

**Regeln.** Jeder Stil bekommt in `styles.ts` einen `balance`-Typ:
- `mirror` (japanese, cherry, mediterranean): Massen spiegelsymmetrisch (T, U, H, Risalit); Kamin paarweise oder mittig.
- `regular` (modern): Raster regelmäßig, Massen asymmetrisch versetzt.
- `balanced` (medieval, rustic, fantasy, nordic): eine Hauptmasse, Nebenmasse auf einer Seite, dazu ein Gegengewicht auf der anderen (Kamin, Turm, Veranda).
- Die Waage „Gewicht links ≈ Gewicht rechts“ lässt sich über das Volumen je Fassadenhälfte prüfen: 0,6 ≤ links/rechts ≤ 1,6 bei `balanced`.

**Skizze (Front schematisch, `#` = Volumen, `K` = Kamin, `^` = Turmspitze):**

```
mirror (mediterran H)        balanced (Mittelalter L + Kamin als Gegengewicht)
###.........###              K...........^.
###.........###              K..........###
###############              ######.....###
###############              ##############
```
**Wirkung** mittel · **Aufwand** niedrig (Daten) · **Quellen** [4][30][31][32][33][36].

## Maßstab: von der Türhöhe 2 zu Geschoss, Fenster und Dach

Proportionssysteme bauen auf einem Grundmodul auf [42]. Im Generator ist das Modul die Tür (1 × 2) neben dem 1,8 hohen Spieler.

| Größe | Wert | Herleitung |
|---|---|---|
| Spieler | 1,8 hoch, Auge 1,62 | [9] |
| Tür | 1 × 2 | Spiel; Cottage-Leitfaden: Türen etwa 2–2,5-mal so hoch wie breit [6] |
| Lichte Geschosshöhe | 3 (eng), 4 (Standard), 5–6 (Halle/EG) | [4][7] |
| Geschossraster FH | 4–5 inkl. Decke, EG +1 erlaubt | [7], T8 |
| Brüstung | 1 über Boden | [7] („ein bis zwei Blöcke über dem Boden“) |
| Fensterhöhe | 2 (Standard), EG bis 3, Gaube 1–2 | Einschätzung; ein Leitfaden empfiehlt ≥ 2×2 [4], für Fachwerk sind 1×2 aber stilgerecht |
| Sturz | Fensteroberkante ≤ Türoberkante | Einschätzung (Fluchten [27]) |
| Traufe über Gelände | ≥ 4 (Tür + Sturz + Sockel) | Einschätzung, Alexander: am Eingang bis ≈ 1,8 m [23] |
| Dachhöhe | 1–2 × FH, Stilbänder T4 | `daecher.md` §7 |
| Anbau | Wandhöhe ≥ Tür + 1 (3 über Boden) | Einschätzung; Wiki: Anbauhöhen 2/4/6 neben 4 (`waende_struktur.md` §6) |
| Fundament zum Haus | sichtbarer Sockel 1–3 Lagen; höhere Unterbauten bekommen Öffnungen oder Strebepfeiler (`waende_struktur.md` §4) | GDMC-Juroren: Fundamente im Verhältnis zur Hausgröße „aus dem Gleichgewicht“ [17]; schwebende Plattformen werden kritisiert [18] |

Maßstabsfehler im Bestand: Der eckige Turm ist bei jeder Hausgröße 5×5 (S5). Das Gaubenfenster ist 1×1 neben 1×2-Fenstern (S12); 1×1 ist zu klein für ein bewohnbares Dachgeschoss (Einschätzung). Geschenke als volle Farbblöcke sind halb so hoch wie die Tür; ob sie kleiner werden sollen, gehört zum Thema Festschicht.

## Wie ein Bau von allen Seiten gut aussieht

Regeln und Punkte stehen in T14. Kurz: (1) Die Masse entscheidet zuerst; bei L, T und Versatz ist jede Ansicht anders, ein nackter Quader hat zwei gleiche Ansichtspaare. (2) Gauben und Kamin verteilen; `buildHouse.ts:129` setzt den Kamin nur an den Ost- oder Westgiebel. (3) Hintertür mit Vordach. (4) Tätigkeitsspuren an Seite und Rückseite (T12). (5) Prüfen mit L3 und L8; die Screenshot-Fälle in `faelle.json` brauchen zusätzlich eine Seitenansicht (Azimut 125°).

## Lived-in und Storytelling: was GDMC-Juroren tatsächlich belohnen

- **Glaubwürdigkeit vor Schönheit:** Gemeinsamer Maßstab der Juroren ist die „Suspension of Disbelief“, also ob ihre Erwartungen erfüllt werden [16]. Das Wettbewerbsziel lautet funktional, ästhetisch und glaubwürdig [15].
- **Varianz gegen Kohäsion:** Gut bewertete Bauten sind verschieden genug, um sich zu unterscheiden, aber nicht zufällig wirr; wenige Signature-Bauten dienen als Anker [16]. Die Juroren teilen Eigenschaften in drei Klassen: immer variieren, auf einen Zielwert optimieren, einmal wählen und beibehalten [16]. Für den Generator heißt das (Einschätzung): Archetyp, Firsthöhen, Anbau- und Kaminlage variieren; Licht, Wege und Fehlerfreiheit optimieren; Palette, Dachmaterial und Fenstertyp je Stil konstant halten.
- **Einzelfehler wiegen schwer** [16][17]. Fehler-Lints (schwebend, Fundament, verdeckte Tür) gehen vor zusätzlichen Details.
- **Wiederholung** ist der häufigste Varianz-Kritikpunkt: Sobald Inhalte vorhersagbar werden, sieht man die Grenzen des Generators [16]. Die drei Varianten müssen sich deshalb in der Masse unterscheiden, nicht nur im Rauschen.

## Fehler, die Profis vermeiden

| Fehler | Erkennungszeichen | Gegenmittel | Quelle |
|---|---|---|---|
| Kiste | ein Quader, gerade Front | ≥ 2 Massen (T1, T2), L13 | [3][10][12] |
| Flache Wand | > 5 ohne Tiefensprung, große glatte Fläche | Lint gibt es; neu: Fläche ≤ 5×3 (L6) | [10], `waende_struktur.md` §3 |
| Zu viel Glas | > 40 % modern, > 20 % traditionell | L4; Scheiben statt Glasblöcke | [29], Einschätzung |
| Einheitsmaterial | ein Block > 80 % | 60/30/10 (Palettenthema) | [1][10] |
| Dach zu klein oder kopflastig | R außerhalb des Stilbands | T4, L1 | [2][11] |
| Walm auf Quadrat | Firstlänge < ⅓ Längsseite | Krüppelwalm, Sattel, Teilung (T3) | [8] |
| Gleich laut, Rasterfassade | gleiche Dichte und gleiches Fenster überall | Fokus und Ruhefelder (T6, T7, T13) | [2][29] |
| Eckfenster, schwebende Auskragung | Öffnung im Eckfeld, Überstand ohne Stütze | ≥ 1 Feld Abstand; Konsolen | [10] |
| Gauben am Rand, Turm gleichrangig | Wange < 2 von der Giebelwand; Turm < 1,25 × First | T9, T10 | [1][28][40] |
| Spiegelkopien | identische Nachbarbauten | ±1–2 in Höhe und Breite | [16], `daecher.md` §7 |
| Rückseite | hinten weder Tür noch Gauben oder Spuren | T14, L8 | [2][29] |
| Zu klein gebaut | Räume 3 hoch, Häuser 7×7 | Räume 4–5, größer bauen (`waende_struktur.md` §6) | [4] |

## Bewertung: Massenplanung (`plan.ts`) und Proportionen (`styles.ts`)

| Aspekt | Heute → Ziel | Urteil |
|---|---|---|
| Massentypen | Haupt, Flügel L/T/U, Quergiebel, Anbau, Türme → reicht für alle Archetypen | **gut** |
| Lage und Auslöser | Flügel hinten, nur `huge`/`rambling`, Anbau nur asymmetrisch → ab `medium` ≥ 2 Massen, eine davon vorn | **schwach** |
| Hierarchie | First meist zufällig tiefer (0,7 × D, 0,45 × W) → ausdrücklich −1…−3, Rücksprung | **mittel** |
| Anbau | Pultdachregel gut, Größe fest 4 → relativ | **mittel** |
| Turm | 5×5 bzw. D 7/9 → relativ, ≥ 25 % über First, schlank | **mittel** |
| Dach | Walm ab 13, Deckel 7 → teilen, Stilband R, ≤ 2 FH | **schwach** |
| Geschosse | ein FH für alle → EG +1, Kniestock, Stilwerte | **schwach** |
| Grundriss | medium oft 9×9 → 1 : 1,3–2 (nordic schon gut) | **mittel** |
| Ungerade Breiten, Türlage | `odd()`, Tür im Feld oder Quergiebel | **gut** |

## Messbare Regeln: neue Lints für `src/core/analysis/buildingLints.ts`

Alle Werte sind Einschätzungen mit Quellenanker, sofern nicht anders angegeben. Vorschlag: Lints zunächst als Warnung (`severity: 'warn'`) einführen, in einem Report über alle Stile, Größen und Seeds 1–20 messen, dann scharf schalten.

| ID | Regel | Messung | Schwelle | Anker |
|---|---|---|---|---|
| L1 `dach-wand` | Dach-Wand-Verhältnis | R = (ridgeY − wallTop) / (wallTop − groundY) am Hauptkörper | Stilband T4; absolut 0,5 FH ≤ h_D ≤ 2 FH + 1 | [2][11], `daecher.md` |
| L2 `hierarchie` | Nebenmasse untergeordnet | je Nebenmasse ≠ Turm: ridge ≤ ridgeMain − 1; Fläche ≤ 0,6 × Haupt; Front: Rücksprung ≥ 1 oder Vorsprung ≥ 2 | 0 Verstöße | [1][22][27] |
| L3 `silhouette` | Skyline gebrochen | je Ansicht Skyline s(u) ohne Deko; Brüche = Sprünge ≥ 2 + Akzente (Breite ≤ 3, ≥ 2 hoch) | ab `medium`: jede Ansicht ≥ 1, Summe ≥ 3; ab `large` ≥ 2 Traufhöhen | [1][4][29] |
| L4 `glasanteil` | Fensteranteil | Glaszellen (glass, *_pane, stained) / Wandfläche des Geschosses je Fassade | medieval/rustic 8–20 %, nordic 4–14 %, fantasy 8–22 %, japanese/cherry 15–45 %, mediterranean 8–18 %, modern 20–40 %; jede Fassade ≥ 5 % | [29] (≤ 40 %), Rest Einschätzung |
| L5 `rhythmus` | keine Rasterfassade | gleiche Vorlage in Folge je Geschoss; Ruhefelder | Folge ≤ 4; Fassade ≥ 11 → ≥ 1 Ruhefeld | [29][5] |
| L6 `detailfrei` | größte Fläche ohne Detail | größtes Rechteck in d = 0 ohne Öffnung, ohne d = +1-Element, gleiche Blockfamilie | ≤ 15 Zellen (5×3); modern ≤ 28 (7×4) | `waende_struktur.md` §3, Einschätzung |
| L7 `mikrodichte` | Detailbudget | Mikroblöcke (stairs, slab, trapdoor, fence, wall, button, lantern, potted) in d = +1/+2 je Fassadenzelle | traditionell 0,08–0,30; modern 0,03–0,15 | [10][12] |
| L8 `rueckseite` | vier Seiten | Merkmalpunkte je Seite (T14) | hinten ≥ 0,5 × vorn, Seiten ≥ 0,3 × vorn; ≥ 1 Öffnung / 6 Blöcke / Geschoss | [29][2] |
| L9 `fokus` | Eingang betont | Mikrodichte in Türzone (±3, Geschoss 0–1) / Fassadenmittel | ≥ 1,5 | [1] |
| L10 `turm` | Turm dominant und schlank | Spitze / Hauptfirst (beide über Gelände); h_Schaft / D; D / min(W, D_Haupt) | ≥ 1,25; ≥ 2,5; ≤ 0,65 | [1][40] |
| L11 `gauben` | Gauben untergeordnet | Gaubenfirst vs. Hauptfirst; Abstand Wange–Giebelwand; Breitensumme / Dachlänge | ≤ −1; ≥ 2; ≤ 0,5 | [27][28] |
| L12 `walm-quadrat` | kein Pyramidenwalm | Firstlänge / Längsseite bei hip, half_hip | ≥ 0,33 (außer pyramid gewünscht) | [8] |
| L13 `massen` | keine Kiste | Anzahl Massen; Konvexität = Grundfläche / Bounding-Box | `medium`/`large` ≥ 2 Massen oder Konvexität ≤ 0,9; `huge` ≥ 3 | [1][3] |
| L14 `achsen` | ungerade Achsen | Fensterachsen symmetrischer Fassaden mit Mitteltür | ungerade | [1][41] |
| L15 `geschoss` | Maßstab | lichte Höhe je Geschoss; Fensteroberkante ≤ Türoberkante; Anbauwand ≥ 3 über Boden | 3 ≤ lichte Höhe ≤ 6 | [4][7] |

## Empfehlungen für den Generator

Priorisiert nach Wirkung pro Aufwand. D = Daten, R = Regel.

| # | Was ändern | Modul (D/R) | Akzeptanzkriterium |
|---|---|---|---|
| 1 | **Massen-Archetypen als Stildaten, Nebenmassen auch vorn.** `massing: {box, L, T, offset, U, H, core_skirt, cubes}` mit Gewichten je Größe. Flügel und Quergiebel wahlweise vorn (z1 = 0, z0 = −Vorsprung) oder hinten. `resolveInput.ts:79, 98` entscheidet über `massing` statt über Symmetrie. | `styles.ts` (D), `plan.ts`, `resolveInput.ts` (R) | 8 Stile × `medium`/`large`/`huge` × Seeds 1–20: ≥ 80 % mit ≥ 2 Massen (L13), ≥ 50 % mit einer Nebenmasse in der Nordansicht; „schwebend“ und Fixpunkt bleiben 0. |
| 2 | **Hierarchie erzwingen.** `enforceHierarchy(plan)`: Ist ein Nebenfirst ≥ Hauptfirst, wird die Nebenmasse schmaler (odd) oder verliert ein Geschoss. Bündige Fronten bekommen Rücksprung 1. Dachfamilie wie beim Haupthaus. | `plan.ts` (R) | L2 = 0 Verstöße. |
| 3 | **Dachanstieg je Stil, teilen statt abflachen.** `roofRatio: [min, max]` und `maxRiseFloors` (1,5–2,0) je Stil, `maxRise = round(maxRiseFloors × FH)`. Bei Überschreitung ab Tiefe 13 teilen (Doppelfirst, gedrehter Giebel, Flügel). Walm nur ab Seitenverhältnis 1,3 (`plan.ts:186`), sonst `half_hip`. | `styles.ts` (D), `plan.ts`, `roofEngine.ts:217` (R) | L1 und L12 ohne Befund für alle Standardgrößen; medieval `huge` R ≥ 0,6. |
| 4 | **Proportions-Lints L1–L15** zuerst als Warnung, Report je Stil und Größe in `reports/`. | `buildingLints.ts` (R) | Report deterministisch; nach 1–3 im Mittel ≥ 50 % weniger Warnungen je Haus. |
| 5 | **Fassadenrhythmus.** `facadePattern` je Stil (`'A_ABA_A'`, `'band'`, `'mirror3'`). Fenster nach Muster statt in jedes Feld (`openings.ts:262–277`), größte Vorlage in die Fokusachse, Giebelfenster (W08/W03b) im Fokusgiebel. | `styles.ts` (D), `openings.ts` (R) | L4, L5, L9, L14 ohne Befund; Glasanteil im Stilband. |
| 6 | **Keine Rückseite.** Hintertür T01 mit Vordach ab `medium`. Gauben auch auf der hinteren Dachfläche, auf Fensterachsen, Wange ≥ 2 von der Giebelwand. Kamin auch an Traufe oder Rückseite. Erker und Balkon auch seitlich. | `components.ts`, `openings.ts`, `plan.ts` (`door`) (R) | L8 und L11 ohne Befund; „gross-ohne-thema“-Bilder zeigen hinten Tür und ≥ 1 Gaube oder Kamin. |
| 7 | **Geschosshierarchie.** `groundFloorExtra: [0, 1]`, `kneeWall: [0, 2]`; `floorY` je Geschoss. Gaubenfenster 1×2 bei Kniestock ≥ 1. | `styles.ts` (D), `plan.ts`, `walls.ts` (R) | L15 ohne Befund; rustic/nordic `medium` ≥ 50 % mit Kniestock; keine neuen „tuer-frei“/„schwebend“. |
| 8 | **Türme relativ und schlank.** Eckiger Turm `odd(clamp(round(0,45 × min(W, D)), 5, 9))`, Rundturm d ≤ 0,65 × min(W, D). Wandoberkante ≥ First + 2. Ringbänder nur Sockel, Haupttraufe, Kranz (`roundTower.ts:119–128`). | `plan.ts`, `roundTower.ts` (R) | L10 ohne Befund; `turm-mittelalter-zinnen` mit ≤ 2 Zwischenbändern. |
| 9 | **Seitenverhältnisse der Standardgrößen.** medieval medium 11×7 oder 7×11, fantasy medium 9×7, rustic medium 11×7, mediterranean small 9×7. | `styles.ts` (D) | Kein Hauptkörper ab `medium` mit Seitenverhältnis < 1,2 (außer `pyramid`, Turm). |
| 10 | **Lived-in-Schicht** mit den Bausteinen aus T12, Dichte nach `detailLevel`, bevorzugt Seiten und Rückseite, Priorität `DECOR`. | neues `house/livedIn.ts` (R), Bausteine (D) | `detailLevel ≥ 2`: ≥ 2 Spuren je Haus; Validator 0 Reparaturen; keine Tür zugestellt. |
| 11 | **Varianten unterscheiden sich in der Masse.** Variante i zieht den Archetyp ohne Zurücklegen. | `generateBuilding.ts`, `resolveInput.ts` (R) | ≥ 90 % der Generierungen mit ≥ 2 verschiedenen Archetypen unter den drei Varianten. |
| 12 | **Mehrfachbauten variieren** (Marktstand, Bahnhofsflügel): Nachbarn ±1–2 in Höhe und Breite. Ausführung im Thema Marktstand. | Marktstand-Generator (R) | Keine zwei Buden mit gleicher Bounding-Box und Firsthöhe. |

## Quellen

1. Craftdex: The Architecture of Builds – https://craftdex.net/articles/the-architecture-of-builds – 3–4 Quader, Silhouettentest, ⅓–½, Fokus ≥ 25 %, Detaildichte zum Fokus.
2. minecraftgradient.blog: Minecraft House Design – https://minecraftgradient.blog/minecraft-house-design/ – kopflastig/unfertig, niedriger Seitenflügel, „equally loud“, alle Seiten prüfen.
3. Gamertag Mythras: Building Tips – https://gamertagmythras.com/blog/minecraft/minecraft-building-tips – kein Rechteck, Silhouette zuerst, Kamin/Pultanbau wirken bewohnt.
4. minecraft.how: House Design Tips 1 – https://minecraft.how/blog/post/minecraft-house-design-tips-1 – Dachabschnitte in Höhen, Räume 4–5, Asymmetrie.
5. minecraft.how: House Design Tips – https://minecraft.how/blog/post/minecraft-house-design-tips – Fensterrhythmus vs. Cottage-Asymmetrie.
6. minecraft.how: Build a Cottage – https://minecraft.how/blog/post/build-cottage-minecraft – Holzstapel, Fässer, Wege, Kamin 3–4 über Dach.
7. Minecraft Wiki: Tutorial:Adding beauty to constructions – https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions – Deckenhöhen, Fensterbrüstung.
8. Minecraft Wiki: Tutorial:Roof types – https://minecraft.wiki/w/Tutorial:Roof_types – Dachtyp nach Größe, Walm auf Quadrat = Pyramide.
9. Minecraft Wiki: Player – https://minecraft.wiki/w/Player – Spieler 1,8 hoch, Auge 1,62.
10. mc-mod.net: Common Mistakes – https://www.mc-mod.net/common-mistakes-new-builders-make/ – Überdetaillierung, Eckfenster, schwebende Überhänge.
11. GGServers: Improve Building Skills – https://ggservers.com/blog/improve-minecraft-building-skills-easily/ – Dach proportional zum Bau.
12. AdieCraft: Minecraft Building 101 (Textauszug) – https://videohighlight.com/v/WD7Uw-ktI9E – Formen mischen, kein Farbklecks.
13. Sereyka: Minecraft House Ideas – https://sereyka.com/minecraft-house-ideas – Überstand 1, Steinsockel.
14. the lamppost: Building in Minecraft – https://lamppost.bearblog.dev/building-in-minecraft-a-simple-guide/ – ≈ 1 Block Tiefe.
15. Salge et al.: GDMC Settlement Generation Competition – https://arxiv.org/abs/1803.09853 – Ziel: funktional, ästhetisch, glaubwürdig.
16. Hervé, Salge, Warpefelt (2023): Hidden Judging Criteria in the GDMC – https://doi.org/10.36227/techrxiv.22698484.v1 (PDF: https://uhra.herts.ac.uk/id/eprint/10728/1/Minecraft_Judge_Comments_1_.pdf) – Suspension of Disbelief, Varianz/Kohäsion, Tätigkeitsspuren.
17. Salge et al.: Impressions of the GDMC – https://ar5iv.labs.arxiv.org/html/2108.02955 – Fundament vs. Hausgröße, kleine Fehler.
18. Believable Minecraft Settlements – https://arxiv.org/html/2309.10871 – Heightmap-Zellen, schwebende Fundamente.
19. Green, Salge, Togelius: Organic Building Generation in Minecraft – https://arxiv.org/abs/1906.05094 – Grundrisse per Constrained Growth.
20. Alexander: Pattern 109 Long Thin House – https://urbigenous.net/a-pattern-language/pattern-109.html – lange, schmale Grundrisse.
21. Alexander: Pattern 110 Main Entrance – https://urbigenous.net/a-pattern-language/pattern-110.html – sichtbarer, kräftiger Eingang.
22. Alexander: Pattern 116 Cascade of Roofs – https://urbigenous.net/a-pattern-language/pattern-116.html – Dachkaskade.
23. Alexander: Pattern 117 Sheltering Roof – https://urbigenous.net/a-pattern-language/pattern-117.html – sichtbares Dach, niedrige Traufe.
24. Level Design Book: Massing – https://book.leveldesignbook.com/process/blockout/massing – Masse und Wichtigkeit, Lesbarkeit.
25. Level Design Book: Blockout – https://book.leveldesignbook.com/process/blockout – Formen zuerst, im Spiel testen.
26. architecturecourses.org: Hierarchy in Architecture – https://architecturecourses.org/design/hierarchy-architecture – „big read“ aus drei Volumen.
27. Wigan Council: Design Guide for House Extensions – https://www.wigan.gov.uk/Docs/PDF/Resident/Planning-and-Building-Control/Planning-guidance/Design-Guide-for-house-extensions.pdf – Anbau untergeordnet, niedriger, Rücksprung, Fluchten, Gauben.
28. Mid Sussex DC: Dormer Window and Rooflight Design Guidance – https://www.midsussex.gov.uk/media/1973/dormer-window-and-rooflight-design-guidance.pdf – Gaubenregeln.
29. Greater Cambridge Planning: Beehive Design Code Teil 3 – https://www.greatercambridgeplanning.org/media/vgfbeyg2/cd264c-design-code-part-3.pdf – Massengliederung, Silhouette, Sockel-Mitte-Abschluss, Glas ≤ 40 %.
30. Wikipedia: Tudor Revival architecture – https://en.wikipedia.org/wiki/Tudor_Revival_architecture
31. Wikipedia: Storybook architecture – https://en.wikipedia.org/wiki/Storybook_architecture
32. Wikipedia: International Style – https://en.wikipedia.org/wiki/International_Style_(architecture)
33. Wikipedia: Queen Anne style (USA) – https://en.wikipedia.org/wiki/Queen_Anne_style_architecture_in_the_United_States
34. Wikipedia: Minka – https://en.wikipedia.org/wiki/Minka
35. Wikipedia: Irimoya – https://en.wikipedia.org/wiki/Irimoya
36. Wikipedia: Mediterranean Revival – https://en.wikipedia.org/wiki/Mediterranean_Revival_architecture
37. Wikipedia: Chalet – https://en.wikipedia.org/wiki/Chalet
38. Wikipedia (de): Schwarzwaldhaus – https://de.wikipedia.org/wiki/Schwarzwaldhaus – Dachneigung 45–50°.
39. Wikipedia (de): Kniestock – https://de.wikipedia.org/wiki/Kniestock
40. Wikipedia (de): Bergfried – https://de.wikipedia.org/wiki/Bergfried – 20–30 m, kleine Grundfläche.
41. Wikipedia: Rule of odds – https://en.wikipedia.org/wiki/Rule_of_odds
42. Wikipedia: Proportion (architecture) – https://en.wikipedia.org/wiki/Proportion_(architecture)
43. Wikipedia: Environmental storytelling (Glossar) – https://en.wikipedia.org/wiki/Environmental_storytelling

Intern: `waende_struktur.md` (§3, §6), `daecher.md` (§7); Code in `src/core/generator/house/`, `roof/roofEngine.ts`, `style/styles.ts`, `analysis/buildingLints.ts`; Screenshots `docs/screenshots/*.jpg` (Seed 1).
