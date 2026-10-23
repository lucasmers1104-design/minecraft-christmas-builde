# Türen, Eingänge, Vordächer, Lauben, Treppenaufgänge und Balkone

Stand: 2026-10-23 · Thema: Wie der Generator Eingänge baut, die als Blickfang der Fassade wirken (Rahmen, Haube oder Laube, begehbare Treppe, Geländer, Deko, Balkon darüber), und welche Vorlagen dafür als Daten fehlen.

**Konventionen** (wie `src/core/templates/types.ts`): kanonische Südfassade, x nach rechts (Osten), y = 0 ist die Zeile der unteren Türhälfte, d = 0 die Wandebene, d = +1/+2/+3 davor, d = −1 innen. Sockelhöhe P (`styles.ts`): Raumboden auf y = −1, Füße auf dem Gelände bei y = −P, Geländeblock bei y = −(P+1). Der Sockelring liegt in d = +1 und reicht bis y = −1, die Treppenschürze liegt in d = +2 auf y = −P (`walls.ts:98-122`). In den Skizzen steht „.“ für Luft, „=“ für Sockel (plinth) und „#“ für Wand. Rollen stehen in Klammern. „Einschätzung“ heißt: eigene Builder-Erfahrung oder aus Spielmechanik abgeleitet, ohne direkte Quelle. Die alte Notiz `fenster_tueren_details.md` (T01–T10, Block-States) wird hier nicht wiederholt, sondern vorausgesetzt.

---

## Kurzfassung

Nach Wirkung sortiert:

1. **Begehbarkeit kommt zuerst.** Bei P ≥ 2 (nordisch immer 2–3, andere Stile 1–2) ist der Eingang heute nicht ohne Sprung erreichbar. Unter der Veranda schwebt die Stufe sogar. Regel: Podest in d = +1, danach P Stufen nach außen, jede einen Block tiefer, darunter Füllung, seitlich Wangen mit Mauer und Laterne. GDMC-Juroren prüfen ausdrücklich, ob „you can walk everywhere“ [59].
2. **Die Veranda ist der größte Hebel.** Heute sieht sie in allen acht Stilen gleich aus (Plattendeck, zwei Zaunpfosten, flaches Pultdach) und verdeckt die Türvorlage. Ersatz: eine **Laube mit Satteldach quer zur Wand** auf Pfosten mit Kopfbändern. Die Traufe liegt über dem Türsturz, damit das Portal sichtbar bleibt, und die Breite passt zur Türbreite. Dazu stilabhängige Varianten: Kragplatte (modern), Pergola (mediterran), Windfang (nordisch), Haube (japanisch).
3. **Der Eingang hat das tiefste Relief der Fassade.** Fenster reichen bis d = +1, der Eingang bis d = +2 (Haube) oder d = +3 (Laube, Vorbau). Die vielseitigste Einzeltechnik ist die **Satteldach-Türhaube auf Konsolen** (T11): Treppen, Firstplatte, Zugbalken und Hängelaternen unter den Traufecken [42][51].
4. **Achse:** Über der Tür sitzt immer etwas, also ein Fenster, Erker, Balkon, eine Gaube oder ein Zwerchgiebel. Heute zentriert `placeFeature` Erker und Balkon auf der Fassadenmitte statt über der Tür, und die OG-Fenster fluchten bei Wänden ohne Ständerraster nicht mit den EG-Achsen neben der Tür.
5. **Sturzlinie:** Bei Geschosshöhe 5 beginnen Fenster eine Zeile höher (`openings.ts:247`). Der Türsturz liegt dann einen Block unter den Fensterstürzen. Eine Tür mit Oberlicht (T02, neu T13) gleicht das aus.
6. **Laternen nie unter Kopfüber-Treppen oder oberen Platten aufhängen.** Dort fehlt die Mittelstütze (SupportType.CENTER, im Repo `faces.ts:93-96`). Geeignet sind Zugbalken, untere Platten, aufrechte Treppen, Zaun- oder Mauerarme und Ketten. Das korrigiert die alte Notiz.
7. **Drei Türvorlagen sind tot:** T07 (erhöhter Eingang), T08 (Plattenweg) und T10 (Weihnachten). Kein Stil und keine Türfamilie wählt sie aus (`doors.ts:28-31`, `styles.ts`, `catalog.ts:66-73`).
8. **Neue Vorlagen als Daten:** T11 Satteldach-Haube, T12 Laube, T13 Seiten- und Oberlicht, T14 Scheunentor, T15 Ladenfront, T17 Windfang/Bislag, T18 japanischer Eingang mit geschwungener Haube, T19 Rundbogen mit Pergola, T20 moderner Eingang mit Kragdach. Dazu W19 (Tor-Attrappe) und die Balkone B02 (französisch) und B03 (Balkenköpfe mit Stirnbrett). Außerdem die Regelbausteine `gableHood()` und `stoop()`.
9. **Hohe Tür ohne neue Blöcke:** Eine offene Falltür mit `facing=south` über oder neben der Tür liegt an derselben Innenkante wie das Türblatt. So entstehen 3 hohe Türen und ein 4×3-Scheunentor [1][18].
10. **Die Eisentür (`modern_white`) lässt sich von Hand nicht öffnen** [61]. Abhilfe: ein Knopf am Pfosten, oder `copper_door`/`waxed_copper_door`, die sich von Hand öffnen lassen [62].
11. **Eingangsdeko als eigene Schicht nach den Öffnungen:** Matte (Teppich auf dem Podest, nie auf einer Stufe), Topfpaar, Fass, Bank, bei Läden Schild und Glocke. Höchstens 2 Typen plus Laternen, Paare immer gespiegelt. Die Vorlagen-Tests verlangen Luft vor der Tür, deshalb gehört die Matte nicht in die Vorlage.
12. **Block-Entities ohne Inhalt sind fachlich erlaubt und schon Praxis** (`campfire` im Kamin). Kandidaten: `bell`, `*_wall_hanging_sign`, einfarbige `*_wall_banner` (die Farbe steckt in der ID [5]) und `decorated_pot`. Alle fehlen in der Registry, und in Vorlagen sind sie per Test verboten (`templates.test.ts:158-160`). Sie gehören deshalb in die Deko-Schicht.
13. **Balkon:** Unterkonstruktion unter beiden Bodenreihen (Balkenköpfe `axis=z` mit Konsole), ein Stirnbrett aus offenen Falltüren und Eckpfosten mit Laterne. Die Balkonachse ist die Türachse. Als billige Profi-Variante gibt es den französischen Balkon [41].
14. **Stilsignaturen:**
    - medieval: Steinportal mit Spitzbogen und Haube
    - rustic: Laube oder Veranda
    - nordic: Windfang und Freitreppe
    - japanese und cherry: geschwungene Haube, Noren und Trittstein
    - mediterranean: Rundbogen, Pergola und Töpfe
    - modern: Rahmenbox, Kragplatte und Seitenlicht

---

## Schwächen des aktuellen Generators

**S1 – Veranda (`components.ts:80-127`), hohe Wirkung**
- **Dünne Pfosten:** Nur zwei Zaunpfosten an den vorderen Ecken (`:120-122`) tragen ein 5×3-Dach. Es gibt weder Kopfbänder noch Pfostensockel. In den Screenshots `haus-*-weihnachten.jpg` wirken sie wie Stöcke.
- **Schwebende Stufe:** Die Stufe liegt nur auf y = yFloor (`:124-126`), darunter ist nichts. Bei P = 2 hängt sie 1 Block über dem Gelände, bei P = 3 zwei Blöcke. Von den Füßen (y = −P) bis zur unteren Treppenhälfte sind es bei P = 2 schon 1,5 Blöcke, mehr als die Sprunghöhe. Die Veranda ist von vorn also gar nicht und seitlich nur mit einem Sprung über die Schürze erreichbar.
- **Dach zu flach und zu tief:** Das Dach ist `shed`, `shallow`, `maxRise: 2` (`:93-107`), die Traufe liegt bei `floorY+3` (`:85`), also direkt über dem Türsturz. Portale, die in d = +1 bis y = 3 reichen (T03, T04), kollidieren mit dem Dach. Weil die Veranda vor den Öffnungen gebaut wird (`buildHouse.ts:123` vor `:134`), fallen sie dann aus. Die Tür ist unter dem dunklen Dach kaum zu sehen (Screenshots rustikal, nordisch, mittelalter, mediterran).
- **Feste Breite:** Die Breite ist fest `doorX ± 2` (`:88-89`). Bei Doppeltüren (T03, T09, w = 2) sitzt die Veranda deshalb einen halben Block schief.
- **Stilblind:** In `haus-modern-weihnachten.jpg` steht ein Holzdeck mit Treppen-Pultdach, in `haus-japanisch-weihnachten.jpg` und `haus-kirschbluete-weihnachten.jpg` die gleiche Form.

**S2 – Zwei Verandasysteme:** T06 (`doors.ts:164-180`, Plattendach auf y = 2, Stammsäulen) und `porchSection`/`buildPorch` folgen unterschiedlichen Regeln.

**S3 – Tote Vorlagen:** T07, T08 und T10 haben leere Stillisten (`doors.ts:28-31`). Auch die Türlisten der Stile (`styles.ts:83,110,137,164,193,220,247,274`) und `DOOR_FAMILY_TEMPLATES` (`catalog.ts:66-73`) enthalten sie nicht. Nordisch hat Sockel 2–3 (`styles.ts:157`), nutzt aber T01 und T06.

**S4 – Treppe bei P = 3:** Alle Türvorlagen setzen in d = +1 eine Stufe auf y = −1 (`doors.ts:54`). Mit der Schürze in d = +2 auf y = −P ist das bei P = 2 eine brauchbare Doppelstufe. Bei P = 3 bleibt in d = +2 auf y = −2 Luft, man muss also einen Block hoch springen.

**S5 – T01, die häufigste Tür:**
- Die Hängelaternen sitzen in d = +1 genau vor den Türpfosten (x = −1 und x = w, `doors.ts:69-70`) und verdecken den Rahmen.
- Die Vordachplatte ist nur 1 tief und hat keine Konsole (`:68`), sie wirkt wie eine schwebende Platte.
- Bei Geschosshöhe 5 bleibt über dem Sturz eine leere Wandzeile.

**S6 – Achsen:**
- `placeFeature` (`openings.ts:164-168`) zentriert Erker und Balkon auf der Fassade. Die Tür liegt in asymmetrischen Stilen aber in einem Seitenfeld (`plan.ts:342-356`).
- `axesFor` (`openings.ts:152-158`) verteilt die EG-Fenster getrennt links und rechts der Tür, die OG-Fenster über die ganze Länge. Bei Wänden ohne Ständerraster fluchten die Achsen deshalb nicht, und über der Tür sitzt Wand oder ein versetztes Fenster.

**S7 – Sturzlinie:** `yBottom = rows >= t.height + 2 ? y0 + 2 : y0 + 1` (`openings.ts:247`). Die Tür belegt dagegen y0+1 bis y0+2 mit Sturz auf y0+3 (`frame(w, 2)`, `doors.ts:50-52`). Bei Geschosshöhe 5 (alle Stile 4–5) liegt der Türsturz einen Block tiefer als die Fensterstürze.

**S8 – Kein Rückfall bei Türen:** `placeDoor` gibt `null` zurück, wenn keine Vorlage passt (`openings.ts:185-208`). Bei Fenstern gibt es dafür `plainWindow`. Der Lint prüft nur gesetzte Türen (`buildingLints.ts:155-176`), ein Haus ohne Tür fällt dort nicht auf. Das fängt nur `buildingTypes.test.ts:90` für die Standardfälle ab.

**S9 – Eisentür:** `modern_white` hat `door: one('iron')` (`palettes.ts:413`), aber keine Vorlage setzt einen Knopf. Spieler können die Tür nicht öffnen [61], das widerspricht dem GDMC-Kriterium „accessible to a player avatar“ [59].

**S10 – Balkon B01 (`balcony.ts:11-24`):**
- Der Boden ist 2 tief (`:16`), Konsolen gibt es aber nur unter der inneren Reihe (`:17`, x = −1/1/3, d = +1). Die äußere Reihe hat keine sichtbare Stütze und keine Stirnkante.
- Er ist immer 5 breit und immer in der Fassadenmitte.
- Es gibt keine französische Variante und keinen Laubengang.

**S11 – Deko:** Am Eingang steht nur die Laterne. Die Matte ist bewusst weggelassen (`doors.ts:250`). Pflanzen, Fässer, Schild und Glocke fehlen, Glocke, Hängeschild, Banner und Deko-Topf auch in der Registry (`families.ts`). Wo eine Haube in d = +1/y = 2 liegt, wird der Kranz (`festive.ts:135-150`) verworfen, weil die Zelle nicht frei ist. Es gibt keinen Ankerpunkt für den Kranz.

**S12 – Türholz:** Nur `spruce`, `dark_oak`, `cherry` und `iron` kommen vor (`palettes.ts:62-483`). Es gibt kein `bamboo_door` (japanisch), kein `warped_door` (mediterran; die Läden sind dort schon `warped_planks`) und kein `crimson`/`mangrove` (fantasy). Siehe dazu das Thema Paletten.

**S13 – Wandlaternen-Ersatz:** `addDoorLanterns` (`openings.ts:116-134`) stellt einen Zaunpfosten mit Laterne in d = +1 direkt neben die Tür, in allen Stilen gleich. Bei Seitenlichtern (T13) stünde er vor dem Glas.

**S14 – Laternenpfähle:** Die „Galgen“-Laternenpfähle am Weg sind in allen Screenshots gleich (`landscape.ts:119-142`). Siehe dazu die Themen Landschaft und Beleuchtung (`18_beleuchtung.md`).

---

## Techniken und Regeln

### E01 – Satteldach-Türhaube auf Konsolen (Vorlage T11)

**Beschreibung:** Ein kleines Satteldach quer zur Wand über der Tür. Die Traufe liegt auf Konsolen, vorn liegt ein Zugbalken, in der Giebelfläche Wandmaterial. Die Haube wirft Schatten, gibt Tiefe und zeichnet den Eingang aus. Vordächer können „alle Dachformen annehmen“ und sind meist auskragend gebaut [51]. Konsolen tragen Türhauben [42]. Builder rahmen Türen mit Kopfüber-Treppen und Falltüren [25][21].

**Blöcke:**
- Dach: `<roof>_stairs[facing=east|west,half=bottom]`
- First: `<ridge>_slab[type=bottom]`
- Zugbalken: `<frame>_log[axis=x]`
- Konsolen: `<roofTrim>_stairs[facing=north,half=top]`
- Laternen: `lantern[hanging=true]` unter den Traufstufen bei x = ±2 in d = +2. Sie hängen also außerhalb der Türpfosten, die aufrechte Treppe hat eine volle Unterseite.

**Maße:** 5 breit bei w = 1 (6 bei w = 2), 2 tief (d = +1/+2), Traufe auf y = 2, First auf y = 4.

**Skizze – Ansicht Süd, d = +2 vorn:**
```
       x=-2 -1   0    1    2
y=4     .    .   R    .    .      R = ridge slab[type=bottom] (d=+1,+2)
y=3     .    E   U    W    .      E/W = roof_stairs[facing=east|west,half=bottom] (d=+1,+2), U = upperWall (d=+2)
y=2     E    B   B    B    W      B = frame log[axis=x] Zugbalken (d=+2); dahinter Sturz (d=0)
y=1     K*   .   Du   .    K*     K = roofTrim_stairs[facing=north,half=top] (d=+1); * = lantern[hanging=true] (d=+2, unter E/W)
y=0     .    P   Dl   P    .      P = frame log[axis=y] (d=0), D = Tür facing=south (d=0)
y=-1    =    =   =    =    =
```
**Schnitt bei x = 0, Blick nach Osten:**
```
       d=-1  0    +1   +2   +3
y=4     .    #    R    R    .
y=3     .    #    .    U    .
y=2     .    B    .    B    .
y=1     .    Du   .    .    .
y=0     .    Dl   m    .    .      m = Matte (Deko-Schicht) auf dem Sockelring
y=-1    =    =    =    s    .      s = Schürzentreppe (P=1)
```

**Einsatz:** medieval, rustic, nordic, fantasy und cherry. Ab einer Fassade von 9 Blöcken, auf jedem Geschoss mit Geschosshöhe ≥ 4. Trifft eine Rahmen- oder Dachzelle der Vorlage auf einen Fachwerkständer in d = +1, bleibt der Ständer stehen und übernimmt die Zelle (`openings.ts:34,71`). Konsolen (Rolle roofTrim) gehören nicht zu `FRAME_ROLES`, daher muss die Spalte x = ±2 in d = +1 frei sein.

**Bewertung:** Wirkung hoch, Aufwand niedrig (nur Daten). Quellen: [42][51][25][21][15].

### E02 – Stützen-Vokabular: Konsole, Kopfband, Balkenkopf, Pfostensockel

**Beschreibung:** Profis lassen nichts optisch schweben. Jede Auskragung über 1 Block bekommt eine sichtbare Stütze [42], und ein Pfosten steht auf einem Steinsockel. Der Unterschied zwischen Konsole (aufgesetzt) und Kragstein (eingebunden) ist im Spiel derselbe Block [16].

**Blöcke:**
- (a) Konsole: `stairs[facing=<zur Wand>,half=top]` in d = +1.
- (b) Kopfband an einem Pfosten: links `stairs[facing=east,half=top]`, rechts `stairs[facing=west,half=top]`, also die volle Seite zum Pfosten; zur Wand hin `stairs[facing=south,half=top]`.
- (c) Balkenkopf: `<beam>_log[axis=z]` in d = +1/+2, darunter eine Konsole (a).
- (d) Pfostensockel: Sockelblock (plinth) unter dem Holzpfosten.

**Skizze – Pfosten mit Kopfbändern, Ansicht Süd:**
```
y=2   R    R    R      R = Traufe/Balken
y=1   A    P    C      A = stairs[facing=east,half=top], C = stairs[facing=west,half=top], P = log[axis=y]
y=0   .    P    .
y=-1  .    =    .      = = Pfostensockel (plinth)
```

**Regeln:**
- Auskragung 1: eine Konsole an der Wand genügt.
- Auskragung 2: Konsole und Zugbalken vorn, oder Balkenköpfe (c).
- Auskragung ≥ 3: Pfosten.
- Abstand der Konsolen ≤ 2 Blöcke (Einschätzung, wie die Jetty-Konsolen des Generators).

**Einsatz:** alle Holzstile. Mediterran nimmt statt Holzpfosten Pfeiler aus Wandmaterial, modern ein Kragdach ohne Stütze (E12).

**Bewertung:** Wirkung hoch, Aufwand niedrig. Quellen: [42][16][17][25][28].

### E03 – Hohe Tür: Oberlicht, Seitenlichter, Falltür-Aufsatz (T13, auch in T14)

**Beschreibung:**
- **Oberlicht:** eine Scheibenzeile über Tür und Seitenlichtern (Transom, Fanlight). Typisch für georgische Haustüren mit Säulen oder Pilastern und Giebel [36][37].
- **Seitenlichter:** Scheiben links und rechts der Tür, so wird der Eingang 3 breit, ohne Doppeltür.
- **Falltür-Aufsatz:** Eine Tür mit `facing=south` liegt in der Nordhälfte ihres Blocks [1]. Eine offene Falltür mit `facing=south` liegt an der Nordkante (Blatt gegenüber `facing`, siehe alte Notiz). Beide liegen also bündig an der Innenkante. Eine Falltür über der Tür macht sie 3 hoch, Falltüren neben einer Doppeltür ergeben ein 4×3-Tor (E08). Das ist eine Einschätzung, aus den Block-States abgeleitet; die Textur der Falltür unterscheidet sich von der Tür, deshalb dieselbe Holzart nehmen.

**Blöcke:**
- `glass_pane` (Rolle window)
- `<door>_trapdoor[facing=south,half=top,open=true]` (Rolle door)
- Gesims: `<roofTrim>_stairs[facing=north,half=top]` in d = +1 auf der Sturzzeile
- Wandarme: `<plinth>_wall` in d = +1 mit `lantern[hanging=true]` darunter

**Maße:** Öffnung 3 × 3 (Tür, Seitenlichter, Oberlicht), Rahmen 5 breit, 4 Zeilen. Das passt genau zu Geschosshöhe 5 und bringt den Sturz auf die Fensterlinie (S7).

**Skizze – Ansicht Süd (T13):**
```
       x=-3 -2   -1   0    1    2    3
y=3     .    B    B   B    B    B    .      B = beam (d=0); davor in d=+1: K = Gesims (stairs facing=north, half=top), x=-2..2
y=2     M    P    G   G    G    P    M      G = glass_pane (d=0); M = plinth_wall-Arm (d=+1)
y=1     *    P    G   Du   G    P    *      * = lantern[hanging=true] (d=+1)
y=0     .    P    G   Dl   G    P    .      P = frame log[axis=y]
y=-1    .    =    s   s    s    =    .      s = Stufe (d=+1)
```

**Einsatz:** mediterranean, nordic (symmetrische Fassaden), rustic, medieval. Mit Box statt Gesims auch modern (T20).

**Bewertung:** Wirkung mittel bis hoch, Aufwand niedrig. Quellen: [36][37][1][18].

### E04 – Laube mit Satteldach auf Pfosten (T12, ersetzt `buildPorch`)

**Beschreibung:** Eine überdachte Eingangslaube von 5 (6) × 3 Blöcken. Die Pfosten in d = +3 stehen auf Steinsockeln, mit Kopfbändern in beide Richtungen. Die Traufe liegt auf y = 3, also über dem Türsturz, sodass Rahmen und Kranz sichtbar bleiben. Das Satteldach läuft quer zur Wand, der Giebel zeigt nach vorn und hat einen Zugbalken. Seitlich gibt es Geländer, vorn ist die Laube offen, davor liegen Stufen.

Vorbilder:
- Die schwedische farstukvist hat „immer Dach und Boden, aber oft nur Geländer statt Wände“, oft mit Zierholz [57].
- Ein Stoop ist ein kleines Podest mit Stufen und wird überdacht zur kleinen Veranda [34][35].
- Builder kombinieren Veranden mit Fichtenzäunen, Zauntoren, Steinziegelmauern und Laternen an den Pfosten [25][26].

**Blöcke:**
- Pfosten: `<frame>_log[axis=y]` auf `<plinth>`
- Kopfbänder wie E02
- Boden: `<floor>_planks` in d = +1 bis +3 auf y = −1 (Vollblock, damit Matte und Tür stehen können)
- Geländer: `<frame>_fence`
- Laternen: `lantern[hanging=false]` auf den Geländerpfosten an der Wand (d = +1). Das ist 2 Blöcke neben der Türachse, und die Kopfbänder verdecken sie nicht.

**Skizze – Ansicht Süd (w = 1):**
```
       x=-2  -1   0    1    2
y=5     .    .    R    .    .      R = ridge slab
y=4     .    E    U    W    .      E/W = roof stairs (d=+1..+3), U = upperWall (d=+3)
y=3     E    B    B    B    W      B = Zugbalken log[axis=x] (d=+3)
y=2     P    A    .    C    P      A/C = Kopfbänder stairs[facing=west|east,half=top] (d=+3); seitlich zur Wand stairs[facing=south,half=top] (d=+2)
y=1     P*   .    Du   .    P*     P = Pfosten (d=+3); * = lantern[hanging=false] auf dem Geländerzaun (d=+1)
y=0     P    .    Dl   .    P      Seitengeländer: frame_fence in x=±2, d=+1..+2
y=-1    =    F    F    F    =      F = Dielen (floor), = = Pfostensockel
y=-2   (P=1: Stufen s in d=+4, x=-1..1; P≥2: stoop() ab d=+4)
```

**Regeln:**
- Breite: w + 4, damit die Parität zur Türbreite stimmt.
- Tiefe: 3. Traufe ≥ Türsturz + 1, Durchgangshöhe unter dem Zugbalken 3.
- Nur auf Fassaden ≥ 11 Blöcke, Abstand zur Ecke ≥ 2.
- Bei Jetty über der Tür stattdessen E01 nehmen.
- Bauen als Vorlage nach dem Fachwerk, nicht als Dachabschnitt vor den Öffnungen. Für die Kehle zum Hauptdach kann die Dach-Engine einen `gable`-Abschnitt mit `ridgeAxis` quer zur Fassade bekommen (Thema Dächer).

**Einsatz:** rustic und nordic (Laube oder Veranda), medieval, fantasy, cherry. Mit Pfeilern aus Wandmaterial auch mediterranean (als Portikus [39]).

**Bewertung:** Wirkung hoch, Aufwand mittel. Quellen: [34][35][39][57][25][26].

### E05 – Windfang-Vorbau / Bislag (T17)

**Beschreibung:** Ein geschlossener Vorbau von 5 × 2 Blöcken mit Außentür in d = +2, Innenöffnung in der Hauswand, Seitenfenstern und Satteldach quer zur Wand.
- Der Windfang ist in Norddeutschland und an der Küste Standard: Außentür massiv, Innentür leichter [50].
- In Norwegen ist der bislag ein Anbau an der Haustür gegen Zugluft. Nach 1945 war er beim Wiederaufbau in Troms und Finnmark Pflicht [56].
- Schwedisch heißt er farstukvist [56][57].

**Blöcke:**
- Wände `infill`, Eckpfosten `frame log[axis=y]`, Seitenfenster `glass_pane`
- Außentür: `door[facing=south]` steht auf Dielen (voller Block)
- Dach: `gableHood` mit Überstand d = +3
- Laternen hängen unter den Traufstufen in d = +3

**Skizze – Schnitt bei x = 0, Blick nach Osten (P = 1):**
```
       d=-1  0    +1   +2   +3
y=5     .    #    R    R    R
y=4     .    #    .    U    .      (Dachstufen x=±1 auf y=4, x=±2 auf y=3 in d=+1..+3)
y=3     .    #    .    B    .
y=2     .    #    B    B    .      B = Balken (Decke des Windfangs)
y=1     .    .    .    Du   .
y=0     .    .    .    Dl   .
y=-1    =    =    F    F    s      F = floor (Vollblock), s = Stufe
```
**Draufsicht auf y = 0:**
```
           x=-2  -1   0    1    2
d=+2        P    I    D    I    P       P = Pfosten, I = infill, D = Außentür
d=+1        I    .    .    .    I       y=1: I bei x=±2 wird glass_pane (Seitenfenster)
d=0         #    #    o    #    #       o = Öffnung zum Haus (Luft)
```

**Einsatz:** nordic (Leitmotiv, besonders im Winter), rustic und medieval (nördlich). Ab Fassade 11.

**Bewertung:** Wirkung hoch, Aufwand mittel. Der Code braucht dafür ein Feld `doorDepth` und eine Anpassung der Tests, siehe Empfehlung R6. Quellen: [50][56][57].

### E06 – Freitreppe und Stoop mit Wangen (Regelbaustein `stoop(P, …)`, ersetzt T07)

**Beschreibung:** Eine Freitreppe ist eine Treppe vor der Fassade zu einem erhöhten Eingang. Sie ist nicht überdacht und läuft achsial auf die Tür zu [53]. Stoops kommen von der niederländischen Praxis, erhöht zu bauen [35]. Im Spiel steigt man Treppen „without jumping“ [14]. Volle Blöcke als Stufen sollte man durch Treppen oder Platten ersetzen [15]. Die reale Schrittmaßregel (2 Steigungen + 1 Auftritt ≈ 63 cm, optimal 17/29 [54]) entspricht im Spiel am ehesten einer Steigung von 0,5 pro Auftritt 1, also Treppen- oder Plattenstufen, nie ganze Blöcke.

**Regel (für P = 1..3):**
- Podest ist der Sockelring in d = +1, Oberkante auf Raumbodenhöhe.
- Stufe k (k = 1..P) liegt in d = 1 + k auf y = −k als `<plinth>_stairs[facing=north,half=bottom]`.
- Darunter wird bis y = −P mit Sockel gefüllt.
- Die Stufen sind 3 breit (Tür + 2), bei Doppeltür 4.
- Wangen bei P ≥ 2 in x0 − 1 und x1 + 1: Block bis zur Stufenhöhe, darauf `<plinth>_wall`. Auf der untersten Wange steht eine `lantern[hanging=false]`.

**Skizze – Schnitt bei x = 0, P = 3:**
```
       d=0   +1   +2   +3   +4   +5
y=0     Dl   .    .    .    .    .
y=-1    =    =    S    .    .    .      S = plinth_stairs[facing=north,half=bottom]
y=-2    =    =    =    S    .    .
y=-3    =    =    =    =    S    .      Füße auf dem Gelände: y=-3
y=-4    g    g    g    g    g    g      g = Gelände
```
**Wange bei x = −2, Schnitt bei P = 3:**
```
       d=+2  +3   +4
y=0     w    .    .      w = plinth_wall
y=-1    =    w    .
y=-2    =    =    w*     * = lantern auf der Mauer (y=-1)
y=-3    =    =    =
```
**Seitlicher Aufgang** (wenn vorn weniger als P + 2 Tiefe frei ist), Draufsicht, Zahl = Lauffläche relativ zum Raumboden:
```
          x=-4   -3   -2   -1    0    1
d=+1      S-2½  S-1½ S-½   0    0    0      S = stairs[facing=east,half=bottom] (volle Seite zum Podest)
d=+2      S-2½  S-1½ S-½   0    0    0      Podest 3×2 aus plinth (Füllung bis Gelände)
d=+3       w     w    w    w    w    w      w = plinth_wall-Geländer
```

**Einsatz:** Pflicht für jeden Stil bei P ≥ 2, nordic immer. Laube und Windfang setzen den Lauf ab d = F + 1 fort.

**Bewertung:** Wirkung hoch (Funktion), Aufwand niedrig bis mittel. Quellen: [53][35][54][14][15][22][59].

### E07 – Geländer-Baukasten

Profis brechen lange Zaunreihen alle 3–4 Blöcke mit einem dickeren Pfosten (Stamm oder Mauerpfosten) und nehmen das Geländermaterial aus dem Stil (Einschätzung). Zauntore senken sich zwischen Mauern um 3 Pixel (`in_wall`), schweben frei und verbinden sich mit Zäunen und Mauern, aber nicht mit Scheiben oder Gittern [6].

| Typ | Block/Zustand | Stile | Einsatz |
|---|---|---|---|
| Holzzaun | `<frame>_fence` (Auflöser) | rustic, nordic, medieval, cherry | Laube, Balkon, Stoop klein |
| Bambuszaun | `bamboo_fence` | japanese, cherry | Engawa, Zaun am Eingang |
| Mauer | `<plinth>_wall` (`low`/`tall` per Auflöser) | medieval, fantasy, nordic, mediterranean (`sandstone_wall`) | Treppenwangen, Podeste [26] |
| Ziergitter | `iron_bars` | mediterranean, medieval Stadt, modern | französischer Balkon, Brüstung |
| Glas | `glass_pane`, `light_gray_stained_glass_pane` | modern | Balkon, Podest |
| Bretterbrüstung | `<shutter>_trapdoor[facing=north,open=true]` in der Außenreihe (Blatt an der Südkante) | nordic, rustic | Balkon, Laubengang |
| Tor | `<frame>_fence_gate[facing=south]` | rustic | Durchgang in Verandageländer [25] |

### E08 – Scheunentor und Falltür-Wand (T14, W19)

**Beschreibung:**
- Scheunen haben große Tore für Erntewagen, oft zwei gegenüber. Darüber liegt eine Ladeluke mit Aufzug [45].
- Im niederdeutschen Hallenhaus sitzt die Grote Dör mittig im Wirtschaftsgiebel, daneben gibt es kleinere Seitentüren (Klöntür) [55].
- Die Klöntür oder Dutch door ist geteilt, sodass die obere Hälfte allein aufgeht [52][44].
- Im Spiel dient eine Falltür als „bardoor“ [18].

**Blöcke:**
- T14: zwei `door[facing=south]` als Doppeltür, dazu `<door>_trapdoor[facing=south,open=true,half=bottom|top]` in d = 0 über und neben den Flügeln. Rahmen aus `log[axis=y]` mit Sturz `log[axis=x]`, ein Wetterbrett `<roof>_slab[type=bottom]` in d = +1.
- W19 (nur Optik): Bretter `<door>_planks` in d = 0, davor in d = +1 Falltüren mit `facing=south,open=true`. Riegel und Strebe in der Laden-Holzart (Z-Muster), darüber ein Oberlicht aus Scheiben.

**Skizze – T14, Ansicht Süd:**
```
       x=-3 -2   -1   0    1    2    3    4
y=4     .   [_]  [_] [_]  [_]  [_]  [_]   .      [_] = roof slab[type=bottom] (d=+1)
y=3     .    B    B   B    B    B    B    .      B = Sturz log[axis=x]
y=2     M    P    T   T    T    T    P    M      T = door-trapdoor[facing=south,open=true] (d=0), M = frame_fence-Arm (d=+1)
y=1     *    P    T   DuL  DuR  T    P    *      * = lantern[hanging=true] (d=+1)
y=0     .    P    T   DlL  DlR  T    P    .      DlL hinge=right, DlR hinge=left
y=-1    .    =    =   =    =    =    =    .
```
**Skizze – W19, Front d = +1:**
```
       x=0  1   2
y=3     G   G   G       G = glass_pane (d=0), Pfosten x=-1/3, Sturz y=4
y=2     L   L   L       L = shutter-trapdoor (Riegel)
y=1     t   L   t       t = door-trapdoor (Feld), L in der Mitte = Strebe
y=0     L   L   L
```

**Einsatz:**
- T14 als Haupttür bei rustic- und nordic-Langhäusern (Palette `rustic_logs`, `nordic_longhouse`) im Giebel, wenn das Haus tiefer als breit ist.
- W19 als zweites Tor im Wirtschaftsgiebel oder an der Rückseite, nie auf den Fensterachsen.

**Bewertung:** Wirkung mittel, Aufwand niedrig. Quellen: [45][55][52][44][18].

### E09 – Ladenfront (T15)

**Beschreibung:** Eine Tür mit Oberlicht in der Mitte, auf jeder Seite ein Schaufenster 3 × 2 auf einer 1 hohen Brüstung, davor eine Auslage (Kopfüber-Treppe). Darüber liegen der Sturzbalken und eine Treppen-Markise, unter der Markise neben der Tür hängen Laternen.

Markisen und Schaufenster sollen die Blicke der Passanten fangen [36]. Eine Glocke am Eingang macht ein Gebäude „more official“ [27].

Die Deko-Schicht ergänzt:
- `spruce_wall_hanging_sign[facing=east]` in d = +1 seitlich am Laden. Ein Hängeschild an der Seite eines vollen Blocks bekommt einen selbsttragenden Halter und „can then float freely“ [4]. Text ist optional [4]. (nicht in Registry)
- Optional `bell[attachment=single_wall,facing=south]` [3]. (nicht in Registry)

**Skizze – Ansicht Süd:**
```
       x=-4 -3   -2   -1   0    1    2    3    4
y=3     A    A    A    A   A    A    A    A    A      A = roof_stairs[facing=north,half=bottom] (d=+1) vor Sturz B (d=0)
y=2     P    G    G    G   G    G    G    G    P      * = lantern[hanging=true] bei x=±1, y=2, d=+1 (unter A)
y=1     P    G    G    G   Du   G    G    G    P
y=0     P    =k   =k   =   Dl   =    =k   =k   P      = = Brüstung (plinth), k = Auslage roofTrim_stairs[facing=north,half=top] (d=+1)
y=-1    =    =    =    =   s    =    =    =    =      s = Stufe; bei x=±1 bleibt d=+1 frei (Laufraum)
```

**Einsatz:** Marktstand und Bahnhof (siehe `17_sonderbauten_bahnhof_markt_baum.md`) sowie Häuser mit dem Wunsch „Laden“, „Bäckerei“ oder „Gasthaus“. Fassade ≥ 13. Stile medieval, rustic, fantasy, mediterranean.

**Bewertung:** Wirkung mittel (hoch im Dorfkontext), Aufwand mittel. Quellen: [36][27][4][3].

### E10 – Japanischer Eingang: geschwungene Haube, Noren, Trittstein, Engawa (T18)

**Beschreibung:**
- Der Karahafu ist ein geschwungener Giebel, der an Toren und Eingängen das Prestige eines Gebäudes ausdrückt [48]. Im Spiel lässt er sich mit Treppe, oberer Platte und unterer Platte andeuten: Die Unterseite steigt zur Mitte hin an.
- Noren sind geschlitzte Stoffbahnen im Ladeneingang und zeigen „open for business“ [49]. Im Spiel geht dafür ein einfarbiges `white_wall_banner` oder `blue_wall_banner[facing=south]` vor dem Sturz. Ohne Muster braucht das Banner kein NBT [5], es ist aber ein Block-Entity, gehört also in die Deko-Schicht. (nicht in Registry)
- Der Genkan liegt **innen** und ist abgesenkt [46]. Die alte Notiz und T09 benennen ihn deshalb ungenau, außen gehören Haube und Trittstein hin.
- Ranma (Holzgitter über Türen) [36] lassen sich mit `<frame>_trapdoor[facing=south,open=true]` in d = 0 statt Sturz andeuten. Das schließt den Noren aus, weil das Banner einen festen Block hinter sich braucht.
- Die Engawa ist ein Holzstreifen außen unter dem Dachüberstand, 1–1,3 m breit, bei Tempeln über 3 m [47]. Im Spiel: `<floor>_slab[type=top]` in d = +1 (+2) entlang der Fassade, Pfosten in d = +2 alle 3 Blöcke, unter der Traufe (siehe `11_stil_japanisch_kirschbluete.md`).

**Skizze – T18, Ansicht Süd mit Höhen der Haubenoberkante:**
```
       x=-2    -1     0      1      2
y=4     .      .      Pb     .      .       Pb = roof slab[type=bottom] (d=+1,+2)  → Oberkante 4,5
y=3     E      Pt     .      Pt     W       Pt = roof slab[type=top] → 4,0; E/W = roof stairs → 3,5/4,0; Mitte y=3 Luft (Unterseite steigt)
y=2     K*     .      n      .      K*      K = roofTrim stairs[facing=north,half=top] (d=+1); * = lantern hängt in d=+2 unter E/W
y=1     .      P      Du     P      .       n = Noren-Banner (Deko-Schicht, d=+1)
y=0     .      P      Dl     P      .       P = frame (stripped_dark_oak_log)
y=-1    =      =      =      =      =       davor d=+2: path slab[type=bottom] (Trittstein)
```

**Einsatz:** japanese und cherry. Mit Kirschholz-Haube auch fantasy-cherry.

**Bewertung:** Wirkung hoch, Aufwand niedrig. Quellen: [46][47][48][49][36][5].

### E11 – Mediterraner Rundbogen mit Pergola (T19)

**Beschreibung:** Der Rundbogen von T04 bekommt eine Pergola davor: weiße Pfeiler aus Wandmaterial in d = +3, ein Querbalken, Längsbalken (`log[axis=z]`) und darauf blühendes Laub. Eine Pergola ist ein Laubengang aus Pfosten, Querbalken und offenem Gitter mit Kletterpflanzen und italienischen Wurzeln [43]. Loggia und Portikus sind die gemauerten Verwandten [40][39].

**Blöcke:**
- Pfeiler: `<wall>`-Rolle (z. B. `white_concrete`, `smooth_sandstone`) auf `<plinth>`
- Balken: `<frame>_log[axis=x]` und `[axis=z]`
- Laub: `flowering_azalea_leaves`, `azalea_leaves` (persistent über den Auflöser)
- Töpfe: `potted_red_tulip` auf dem Sockelring in x = ±3

**Skizze – Schnitt bei x = −2, Blick nach Osten:**
```
       d=0  +1   +2   +3
y=4     #    .    .    f       f = flowering_azalea_leaves
y=3     #    R    Z    B       R = Ring der T04-Nische (roofTrim), Z = log[axis=z], B = log[axis=x]
y=2     #    R    .    W       W = Pfeiler (wall-Rolle)
y=1     #    R    .    W
y=0     #    R    .    W
y=-1    =    R    s    =       s = Stufe aus T04
```

**Einsatz:** mediterranean (Leitmotiv), fantasy (mit Moos und Ranken). Ab Fassade 11.

**Bewertung:** Wirkung hoch, Aufwand niedrig bis mittel. Quellen: [43][40][39].

### E12 – Moderner Eingang: Rahmenbox, Seitenlicht, Kragdach, Knopf (T20)

**Beschreibung:** Eine Box aus der Rahmenrolle (Beton) in d = +1 umschließt Tür und Seitenlicht (3 hoch, auf einer Seite). Davor kragt ein Dach aus unteren Platten 2 Blöcke aus, ohne Stütze. Das Vordach wird meist als Kragkonstruktion gebaut [51]. Die Laternen hängen unter der unteren Platte, deren Unterseite voll ist. Davor liegt eine breite Trittplatte.

Die Eisentür bekommt `stone_button[face=wall,facing=south]` am linken Pfosten in d = +1, y = 1. Der Knopf versorgt den Pfosten, und die Tür ist dessen Nachbar [61]. Alternative: `waxed_copper_door`, die sich von Hand öffnen lässt [62].

**Skizze – Ansicht Süd:**
```
       x=-2  -1   0    1    2
y=3     K    K    K    K    K      K = frame (d=+1); davor d=+2/+3: roofTrim slab[type=bottom]
y=2     K    P    G    G    K      * = lantern[hanging=true] bei x=±2, y=2, d=+3 (vor den Boxpfosten)
y=1     K    Pb   Du   G    K      b = stone_button (d=+1) am Pfosten P
y=0     K    P    Dl   G    K      G = glass_pane (Seitenlicht x=1, Oberlicht x=0)
y=-1    K    =    =    =    K      davor d=+2: path slab[type=bottom], x=-1..1
```

**Einsatz:** modern. Die Asymmetrie ist gewollt, die Spiegelung wird zufällig gewählt.

**Bewertung:** Wirkung mittel bis hoch, Aufwand niedrig. Quellen: [51][61][62][30].

### E13 – Eingangsdeko-Schicht (neues Modul, nach `buildOpenings`, vor der Festschicht)

**Regeln:**
- Nur freie Zellen, nie in den Türspalten d = +1 bis +2 auf y = 0..1 (Ausnahme Matte).
- Paare spiegeln. Höchstens 2 Deko-Typen plus Laternen, nach der alten Notiz („max. 2–3 Detailtypen“).
- Funktionsdinge wie Fass oder Holzstapel dürfen auf einer Seite stehen (Einschätzung).

**Mechanik:**
- Teppich lässt sich auf jeden Block außer Luft setzen [2]. Auf einer unteren Treppenhälfte schwebt er aber optisch eine halbe Stufe hoch, deshalb nur auf Vollblock oder obere Platte.
- Der Lint erlaubt Teppich vor der Tür schon (`buildingLints.ts:167`).
- Blumentöpfe stehen in Java auch über Luft [12].
- Fässer brauchen keine Stütze [8].
- Laubstreu braucht eine volle Oberseite [9].

| Deko | Blöcke/Zustände | Position (kanonisch) | Stile und p (Einschätzung) |
|---|---|---|---|
| Matte | `<farbe>_carpet`, w breit | (x, 0, +1), wenn (x, −1, +1) voll oder obere Platte ist | rustic `brown` 0,6 · medieval `brown` 0,4 · nordic `gray` 0,5 · modern `black` 0,5 · fantasy `moss_carpet` 0,4 · cherry `pink` 0,3 · Weihnachten `red` 1,0 · japanese 0 |
| Topfpaar | `potted_*` | (−2, 0, +1) und (w+1, 0, +1); unter T11-Konsolen | rustic `potted_red_tulip`/`potted_poppy` 0,7 · mediterranean `potted_red_tulip`, `potted_cactus`*, `potted_allium`* 0,9 · japanese `potted_bamboo` 0,5 · cherry `potted_cherry_sapling` 0,7 · modern `potted_azalea_bush` 0,6 · fantasy `potted_flowering_azalea_bush` 0,7 · nordic `potted_spruce_sapling` 0,4 · Weihnachten `potted_spruce_sapling` 1,0 |
| Fass | `barrel[facing=up]`, 1–2 übereinander | (w+1 oder −2, 0, +2) | medieval 0,3 · rustic 0,4 · nordic 0,3 |
| Bank | `<floor>_stairs[facing=north,half=bottom]` als Sitz, Armlehnen `<shutter>_trapdoor[facing=west|east,open=true]` [19] | in der Laube d = +1 an der Wand, seitlich der Tür | nur mit Laube, 0,3–0,5 |
| Holzstapel | `spruce_log[axis=z]` 2 × 2 (Stirnholz nach vorn) | unter der Traufe, x ≤ −3 | nordic 0,5 (Winter 0,7) · rustic 0,3 |
| Schubkarre | `<frame>_fence_gate[open=true]` + `composter`* + `grindstone`* [19] | Hof, d ≥ +3 | rustic Hof 0,1 |
| Hängeschild | `<frame>_wall_hanging_sign[facing=east]`* | (−2 oder w+1, 2, +1) | Laden, Gasthaus, Bahnhof 1,0 · Haus 0 |
| Glocke | `bell[attachment=single_wall,facing=south]`* oder `[attachment=ceiling]` unter dem Laubenbalken [3] | neben oder über der Tür | Rathaus, Bahnhof, Laden [27] |
| Noren | `white_wall_banner`/`blue_wall_banner[facing=south]`* | (x, 2, +1) je Türspalte | japanese, cherry 0,6 |
| Deko-Topf | `decorated_pot[facing=south]`* (Ziegeloptik ohne Scherben [7]) | wie Topfpaar | mediterranean 0,5 |

\* = nicht in Registry; Block-Entity ohne Inhalt bzw. fehlender Block. Glocke, Banner, Schild und Deko-Topf brauchen einen Export-Test: Erzeugt WorldEdit beim Einfügen ohne `BlockEntities`-Eintrag das Standard-Block-Entity? `campfire` funktioniert so bereits.

**Bewertung:** Wirkung mittel, Aufwand mittel. Quellen: [2][7][8][9][12][19][3][4][5][27][21][25][26].

### E14 – Balkone: französischer Balkon (B02), Balkenkopf-Balkon (B03), Laubengang

**Beschreibung:** Ein Balkon kragt aus, ruht auf Säulen oder Konsolen und hat eine Brüstung. Der französische Balkon („Juliet“) kragt nicht aus und hat die Brüstung nur vorn [41]. Konsolen tragen Balkone und Erker, eine Konsolreihe heißt „corbel table“ [42]. Builder bauen Balkone aus Steinziegel-Stützen, Fichtenzäunen und Ketten [25] oder aus Steinziegeltreppen und -platten [28]. Chalets haben breite Dächer und Balkone [29].

**Regeln:**
- B02 bei Geschosshöhe 4 und Fassade < 11.
- B03 ab 11, Tiefe 2, Breite 5 (Tür + 2 Scheiben + Pfosten).
- Laubengang (Galerie über die ganze Traufseite, Pfosten alle 3) für nordic und rustic ab Fassade 15 (Einschätzung).
- Unterkonstruktion unter jeder Bodenreihe. Die Achse des Balkons ist die Türachse. Nicht direkt über einer Haube oder Laube; über einem modernen Kragdach kann das Dach selbst der Balkon sein (Einschätzung).

**Skizze – B03, Schnitt bei x = −1, Blick nach Osten:**
```
       d=-1  0    +1   +2
y=1     .    #    .    *       * = lantern[hanging=false] auf Eckpfosten
y=0     .    D    f    P       P = frame log[axis=y], f = Seitengeländer (fence/iron_bars)
y=-1    #    #    =    =       = = floor slab[type=top] (bündig mit dem Raumboden)
y=-2    .    #    Z    Z       Z = beam log[axis=z] (Balkenkopf zeigt Stirnholz bei d=+2)
y=-3    .    #    K    .       K = roofTrim stairs[facing=north,half=top]
```
**Front auf y = −2:** Z bei x = −1, 1, 3. Bei x = 0 und 2 liegt in d = +2 `shutter_trapdoor[facing=north,half=top,open=true]` als Stirnbrett (Blatt an der Südkante).

**Skizze – B02, Ansicht Süd:**
```
       x=0  1   2
y=1     o   Du  o       o = potted_red_tulip (d=+1) auf dem Gitter
y=0     Ii  Dl  iI      I = iron_bars (d=+1, x=0..2); Scheiben i in d=0 bei x=0,2
y=-1    _   _   _       _ = floor slab[type=top] (d=+1)
y=-2    K   .   K       K = Konsole
```

**Bewertung:** Wirkung mittel bis hoch, Aufwand niedrig. Quellen: [41][42][25][28][29].

### E15 – Lichtführung am Eingang

**Regeln:**
- Zwei Laternen symmetrisch, 1–2 Blöcke neben der Türachse, auf y = 1–2 (Kopfhöhe bis knapp darüber), nie im Laufweg und nie vor dem Türpfosten (S5).
- Hängend nur unter Vollblock, unterer Platte, aufrechter Treppe, Zaun- oder Mauerarm oder Kette.
- Stehend auf Vollblock, Mauer- oder Zaunpfosten, Gitter [11] oder geschlossener Falltür `half=top`.
- Laternen schmelzen Schnee im Umkreis von 2 Blöcken [11]. Der Code hält konservativ 4 Abstand (`doors.ts:250`).

**Bewertung:** Wirkung hoch, Aufwand niedrig. Quellen: [11][24]. Siehe dazu `18_beleuchtung.md`.

---

## Eingang als Fokuspunkt

1. **Tiefe:** Der Eingang ist das tiefste Element im Erdgeschoss. Fenster reichen bis d = +1, die Haube bis +2, Laube und Vorbau bis +3. Das Wiki sagt: „depth is crucial to making your buildings stand out“ [15].
2. **Größe:** Der Eingangsumriss (Rahmen mit Haube) ist mindestens 5 breit und reicht bis zur Geschossoberkante. Fensterumrisse bleiben bei höchstens 4 (Einschätzung).
3. **Kontrast:** Die Umrahmung hebt sich ab, also ein Steinportal (plinth oder roofTrim) in einer Holz- oder Fachwerkwand oder ein dunkler Rahmen in einer hellen Putzwand. Das georgische Vorbild: Säulen oder Pilaster mit Giebel, sonst sparsamer Schmuck [37].
4. **Licht:** Siehe E15.
5. **Achse:** Über der Tür liegt ein Fenster gleicher Achse, bei Doppeltür ein Zweierfenster, Erker oder Balkon. Gaube oder Zwerchgiebel nehmen dieselbe Achse auf. Der Weg führt die ersten 3 Blöcke gerade auf die Tür zu (Weg: Thema Landschaft).
6. **Ruhe ringsum:** Zwischen Eingangsumriss und nächstem Fensterumriss liegt mindestens 1 freie Spalte, bei Haube oder Laube 2. Keine Läden, die die Haube berühren.
7. **Begleiter:** Töpfe, Bänke und Laternen stehen gespiegelt, so rahmen sie den Eingang ein zweites Mal.
8. **Farbe:** Das Türblatt hebt sich in der Helligkeit von der Wand ab, also dunkle Tür auf heller Wand, helle (`birch`, `pale_oak`) auf dunkler. Die Helligkeitswerte liefert `textureStats.ts`. Siehe dazu das Thema Paletten.

---

## Wo sitzt die Tür? Fassadenbreite und Fensterachsen

**Fassaden werden in Achsen gezählt** (Bay = ein Fenster je Achse, „5 bay by 2 bay“ [38]). Georgische Fassaden setzen die Fenster regelmäßig auf ein Raster [37].
- **Symmetrische Stile** (Default in `styles.ts`: nordic, japanese, cherry, modern, mediterranean): ungerade Achsenzahl (3, 5, 7), die Tür in der Mittelachse, auf jeder Seite gleich viele Fenster. In allen Geschossen dieselben Achsen.
- **Asymmetrische Stile** (medieval, fantasy, rustic): Die Tür sitzt bei etwa ⅓ oder ⅔ der Länge in einem Ständerfeld (wie `plan.ts:353-354`). Auf die längere Seite kommen 2 Achsen, auf die kürzere 1. Zwischen Türumriss und Hausecke bleibt mindestens eine Fensterachse (Einschätzung).
- **Giebel- oder Traufseite:** Ist das Haus tiefer als 1,5 × seine Breite (Langhaus), sitzt die Haupttür mittig im Giebel, wie die Grote Dör im Hallenhaus [55]. Sonst sitzt sie traufseitig (Einschätzung). Japanische Häuser haben den Eingang oft außermittig unter einer eigenen kleinen Haube (Einschätzung).
- **Nebeneingang:** Häuser ab Fassade 13 bekommen auf der Rückseite eine schlichte T01- oder T05-Tür (Einschätzung, niedrige Priorität).

| Fassadenlänge L | Tür | Vordach | Treppe (bei P ≥ 2) | Vorlagen |
|---|---|---|---|---|
| 7–9 | 1 | Haube 1 tief | 3 breit | T01, T05, T09b, T20 |
| 11–13 | 1 | Haube 2 tief oder Laube 5 × 3 | 3 breit, Wangen | T11, T12, T13, T17, T18, T19 |
| 15–19 | 1–2 | Laube oder Portal 6 breit | 4 breit | T11b, T12b, T03, T04, T15 |
| ≥ 21 | 2 | Laube oder Portikus, Achsenmotiv darüber (Zwerchgiebel, Erker) | 4–5 breit | T12b, T03 |

**Sturzlinie:** Bei Geschosshöhe 5 (Fenster ab y0+2) ein Oberlicht verwenden (T02, T13, T14), damit Tür- und Fenstersturz auf einer Linie liegen. Bei Geschosshöhe 4 reicht der einfache Sturz.

---

## Vordachformen im Überblick

| Form | Tiefe | Stütze | Stile | Vorlage |
|---|---|---|---|---|
| Plattenhaube | 1 | Konsolen (fehlen heute) | alle schlichten | T01 (verbessern) |
| Falltür-Vordach | 1 | Konsolen | rustic, mediterranean | T05 |
| Plattenvordach | 2 | Konsolen innen | rustic | T05b |
| Satteldach-Haube | 2 | Konsolen + Zugbalken | medieval, rustic, nordic, fantasy, cherry | **T11** |
| Pultdach-Kirayoke | 1 | – | japanese | T09 |
| Geschwungene Haube | 2 | Konsolen | japanese, cherry | **T18** |
| Laube mit Satteldach | 3 | Pfosten mit Kopfbändern | rustic, nordic, medieval, fantasy | **T12** |
| Windfang-Vorbau | 2 + Überstand | Wände | nordic | **T17** |
| Pergola | 3 | Pfeiler | mediterranean | **T19** |
| Kragdach | 2–3 | keine (Kragplatte) | modern | **T20** |
| Markise | 1 | Sturzbalken | Laden | **T15** |

---

## Stil-Matrix (Vorschlag für `styles.ts`, die Reihenfolge ist die Wahlfolge)

| Stil | doors | Treppe | Geländer | Deko (E13) | Türholz (Thema Paletten) |
|---|---|---|---|---|---|
| medieval | T11, T03, T02, T01 | stoop, Wangen `stone_brick_wall` | Mauer | Matte, Fass | `dark_oak`, `spruce` |
| fantasy | T04, T11, T19, T02 | stoop, `mossy_cobblestone_wall` | Mauer mit Moos | Töpfe (Azalee), `moss_carpet` | `dark_oak`, `crimson`, `mangrove` |
| rustic | T12, T11, T02, T05, T01 (+T14 Langhaus) | stoop | Holzzaun, Zauntor | Matte, Töpfe, Fass, Bank | `spruce`, `oak` |
| nordic | T17, T11, T12, T01 | stoop immer (P 2–3), seitlich bei wenig Tiefe | Mauer, Bretterbrüstung | Holzstapel, Matte | `spruce`, `dark_oak` |
| japanese | T18, T09 | Trittsteine, flache Stufen | Bambuszaun | Noren, `potted_bamboo` | `spruce`, `bamboo` |
| cherry | T18, T09, T11 | Trittsteine | Bambuszaun | Töpfe Kirsche, Noren | `cherry` |
| modern | T20, T13, T01 | Platten-Trittstufen | Glas, Gitter | Matte schwarz, Azalee | `iron` mit Knopf, `pale_oak`, `waxed_copper` |
| mediterranean | T19, T04, T13, T05 | stoop `sandstone_wall` | Ziergitter | Töpfe, Deko-Topf | `warped` (Blau wie die Läden), `spruce` |

Bei Weihnachten bleibt die Tür des Stils. Die Festschicht ergänzt die rote Matte, zwei `potted_spruce_sapling` und den Kranz über einen **Kranzanker**, den jede Vorlage meldet, z. B. die Zellen hinter dem Zugbalken in T11 oder (x, 2, +1) in T01. T10 wird damit zur Festregel „Girlandenbogen um den Rahmen“ (siehe Thema Festschicht).

---

## Neue Vorlagen als Datenzellen (Format wie `doors.ts`)

Die Helfer stammen aus `windows.ts` (`cell`, `fixed`, `air`, `span`, `solid`, `post`, `beam`, `pane`, `sill`, `step`, `slab`, `lantern`). Die Vorlagen erfüllen die Tests in `templates.test.ts:192-213`: Türzellen = Breite, Sockel unter der Tür, Luft in d = ±1, ≥ 2 Laternen und keine Block-Entities. Ausnahme ist T17 (R6). Rollen und Formen müssen sich für alle Paletten der zugeordneten Stile auflösen (`templates.test.ts:178-189`). Ob es Kopfbandtreppen in der Rolle `frame` bei Stamm-Materialien als Ersatzform gibt, muss der Test zeigen, sonst `roofTrim` nehmen.

```ts
type Dir = 'north' | 'south' | 'east' | 'west';
const stair = (x: number, y: number, d: number, role: TemplateRole, facing: Dir, half: 'top' | 'bottom' = 'bottom') =>
  cell(x, y, d, role, 'stairs', { facing, half });
/** Open trapdoor in the door plane (facing south: leaf at the inner edge, flush with the door leaf). */
const leafPanel = (x: number, y: number, half: 'top' | 'bottom') => cell(x, y, 0, 'door', 'trapdoor', { facing: 'south', half, open: 'true' });

/** Gable across the wall over x0..x1: eaves stairs in row y0, rising one per row, ridge slab; gable face in dFront. */
function gableHood(x0: number, x1: number, y0: number, ds: readonly number[], dFront: number): TemplateCell[] {
  const out: TemplateCell[] = [];
  let l = x0, r = x1, y = y0;
  for (; r - l >= 2; l++, r--, y++) {
    for (const d of ds) out.push(stair(l, y, d, 'roof', 'east'), stair(r, y, d, 'roof', 'west'));
    for (let x = l + 1; x < r; x++) out.push(y === y0 ? beam(x, y, dFront) : solid(x, y, dFront, 'upperWall'));
  }
  for (let x = l; x <= r; x++) for (const d of ds) out.push(slab(x, y, d, 'ridge', 'bottom'));
  return out;
}

/** Stoop for plinth height P from depth d0: step k at d0+k-1 on y=-k, fill to the ground, cheeks with a wall, lantern on the lowest cheek. */
function stoop(P: number, x0: number, x1: number, d0 = 2, cheeks = P >= 2): TemplateCell[] {
  const out: TemplateCell[] = [];
  for (let k = 1; k <= P; k++) {
    const d = d0 + k - 1;
    for (let x = x0; x <= x1; x++) {
      out.push(step(x, -k, d));
      for (let y = -P; y < -k; y++) out.push(solid(x, y, d, 'plinth'));
    }
    if (cheeks) for (const x of [x0 - 1, x1 + 1]) {
      for (let y = -P; y <= -k; y++) out.push(solid(x, y, d, 'plinth'));
      out.push(cell(x, 1 - k, d, 'plinth', 'wall'));
    }
  }
  if (cheeks) for (const x of [x0 - 1, x1 + 1]) out.push(lantern(x, 2 - P, d0 + P - 1, false));
  return out;
}

/** T11: gabled door hood 2 deep on corbels, tie beam carrying two lanterns (E01). */
function t11(id: string, w: number): FacadeTemplate {
  const L = -2, R = w + 1;
  return doorTemplate(id, w === 1 ? 'Haustür mit Satteldach-Haube auf Konsolen' : 'Doppeltür mit Satteldach-Haube auf Konsolen', w, [
    doorway(w),
    frame(w, 2),
    gableHood(L, R, 2, [1, 2], 2),
    [sill(L, 1, 1), sill(R, 1, 1)],
    [lantern(L, 1, 2, true), lantern(R, 1, 2, true)],
    span(0, w - 1).map((x) => [air(x, 0, 2), air(x, 1, 2)]),
  ], 'Haube d=+1..+2, Traufe auf Konsolen, Laternen unter den Traufstufen (aufrechte Treppe = volle Unterseite). Matte und Kranz setzen Deko- und Festschicht.');
}
const T11 = t11('T11', 1);
const T11b = t11('T11b', 2);

/** T12: porch 3 deep, gable across the wall on posts with knee braces, side railings, steps (E04, replaces buildPorch). */
function t12(id: string, w: number): FacadeTemplate {
  const L = -2, R = w + 1, F = 3;
  return doorTemplate(id, w === 1 ? 'Laube mit Satteldach auf Pfosten' : 'Laube mit Satteldach, Pfosten und Doppeltür', w, [
    doorway(w),
    frame(w, 2),
    span(L, R).map((x) => [1, 2, 3].map((d) => solid(x, -1, d, d === F && (x === L || x === R) ? 'plinth' : 'floor'))),
    [L, R].map((x) => [post(x, 0, F), post(x, 1, F), post(x, 2, F), cell(x, 0, 1, 'frame', 'fence'), cell(x, 0, 2, 'frame', 'fence')]),
    [stair(L + 1, 2, F, 'frame', 'west', 'top'), stair(R - 1, 2, F, 'frame', 'east', 'top')],
    [stair(L, 2, F - 1, 'frame', 'south', 'top'), stair(R, 2, F - 1, 'frame', 'south', 'top')],
    gableHood(L, R, 3, [1, 2, 3], F),
    [L, R].map((x) => lantern(x, 1, 1, false)),
    span(0, w - 1).map((x) => [2, 3].map((d) => [air(x, 0, d), air(x, 1, d)])),
    span(L + 1, R - 1).map((x) => step(x, -1, F + 1)),
  ], 'Traufe y=3 über dem Sturz; bei P ≥ 2 statt der Stufenreihe stoop(P, L+1, R-1, F+1) und Sockelfüllung unter d=+2..+3.', 2);
}
const T12 = t12('T12', 1);
const T12b = t12('T12b', 2);

/** T13: door with sidelights and transom, cornice of upside-down stairs, wall arms with lanterns (E03). */
const T13 = doorTemplate('T13', 'Tür mit Seitenlichtern, Oberlicht und Gesims', 1, [
  doorway(1),
  [-2, 2].map((x) => solid(x, -1, 0, 'plinth')),
  [-1, 1].map((x) => [pane(x, 0), pane(x, 1)]),
  span(-1, 1).map((x) => pane(x, 2)),
  span(0, 2).map((y) => [post(-2, y), post(2, y)]),
  span(-2, 2).map((x) => [beam(x, 3), sill(x, 3, 1)]),
  [-3, 3].map((x) => [cell(x, 2, 1, 'plinth', 'wall'), lantern(x, 1, 1, true)]),
  steps(-1, 1),
], 'Sturz in Zeile 3 fluchtet mit Fenstern, die bei Geschosshöhe 5 in y0+2 beginnen.');

/** T14: barn door 4×3: double door, open trapdoor panels beside and above in the door plane, weather board (E08). */
const T14 = doorTemplate('T14', 'Scheunentor mit Falltür-Feldern', 2, [
  doorway(2),
  [-1, 2].map((x) => [leafPanel(x, 0, 'bottom'), leafPanel(x, 1, 'top'), leafPanel(x, 2, 'top')]),
  [0, 1].map((x) => leafPanel(x, 2, 'top')),
  [-2, 3].map((x) => solid(x, -1, 0, 'plinth')),
  span(0, 2).map((y) => [post(-2, y), post(3, y)]),
  span(-2, 3).map((x) => [beam(x, 3), slab(x, 4, 1, 'roof', 'bottom')]),
  [-3, 4].map((x) => [cell(x, 2, 1, 'frame', 'fence'), lantern(x, 1, 1, true)]),
  steps(-1, 2),
], 'Breite 2 = Türflügel; Felder x=-1 und x=2 sind offene Falltüren, bündig mit den Türblättern.', 2);

/** T15: shopfront 9 wide: door with transom, 3×2 display windows on a riser, display ledge, lintel, stair awning (E09). */
const T15 = doorTemplate('T15', 'Ladentür mit Schaufenstern und Markise', 1, [
  doorway(1),
  [-4, -3, -2, 2, 3, 4].map((x) => solid(x, -1, 0, 'plinth')),
  [-3, -2, -1, 1, 2, 3].map((x) => [solid(x, 0, 0, 'plinth'), pane(x, 1), pane(x, 2)]),
  [-3, -2, 2, 3].map((x) => sill(x, 0, 1)),
  pane(0, 2),
  span(0, 2).map((y) => [post(-4, y), post(4, y)]),
  span(-4, 4).map((x) => [beam(x, 3), stair(x, 3, 1, 'roof', 'north')]),
  [-1, 1].map((x) => lantern(x, 2, 1, true)),
  steps(0, 0),
], 'Schild (wall_hanging_sign) und Glocke setzt die Deko-Schicht; Block-Entities sind in Vorlagen verboten.', 2);

/** T17: vestibule (Windfang/bislag) 5×2, outer door at d=+2, opening in the wall, gable across the wall, side windows (E05). */
const T17 = {
  ...doorTemplate('T17', 'Windfang-Vorbau mit Satteldach', 1, [
    cell(0, 0, 2, 'door', 'door', { half: 'lower', facing: 'south', hinge: 'right', open: 'false' }),
    [air(0, 1, 2), air(0, 0, 3), air(0, 1, 3), air(0, 0, 1), air(0, 1, 1), air(0, 0, 0), air(0, 1, 0), air(0, 0, -1), air(0, 1, -1)],
    span(-2, 2).map((x) => [solid(x, -1, 0, 'plinth'), solid(x, -1, 1, 'floor'), solid(x, -1, 2, 'floor')]),
    [-2, 2].map((x) => [post(x, 0, 2), post(x, 1, 2), solid(x, 0, 1, 'infill'), pane(x, 1, 1)]),
    [-1, 1].map((x) => [solid(x, 0, 2, 'infill'), solid(x, 1, 2, 'infill')]),
    span(-2, 2).map((x) => [beam(x, 2, 1), beam(x, 2, 2)]),
    gableHood(-2, 2, 3, [1, 2, 3], 2),
    [-2, 2].map((x) => lantern(x, 2, 3, true)),
    step(0, -1, 3),
  ], 'Außentür auf Dielen (Vollblock); Weg, Kranz und Freiraum beginnen bei d=+3.'),
  doorDepth: 2,
};

/** T18: Japanese entrance: dark frame, curved hood (stairs, top slab, bottom slab), corbels, lanterns, stepping stone (E10). */
const T18 = doorTemplate('T18', 'Japanischer Eingang mit geschwungener Haube', 1, [
  doorway(1),
  frame(1, 2),
  [1, 2].map((d) => [stair(-2, 3, d, 'roof', 'east'), slab(-1, 3, d, 'roof', 'top'), slab(0, 4, d, 'roof', 'bottom'), slab(1, 3, d, 'roof', 'top'), stair(2, 3, d, 'roof', 'west')]),
  [sill(-2, 2, 1), sill(2, 2, 1)],
  [lantern(-2, 2, 2, true), lantern(2, 2, 2, true)],
  [air(0, 0, 2), air(0, 1, 2)],
  slab(0, -1, 2, 'path', 'bottom'),
], 'Noren (einfarbiges Wandbanner in 0,2,+1) setzt die Deko-Schicht.');

/** T19: round-arched niche (T04) with a pergola: piers at d=+3, cross and long beams, flowering leaves, pots (E11). */
const T19 = doorTemplate('T19', 'Rundbogen-Eingang mit Pergola', 1, [
  T04.cells,
  [-2, 2].map((x) => [solid(x, -1, 3, 'plinth'), ...span(0, 2).map((y) => solid(x, y, 3, 'wall'))]),
  span(-2, 2).map((x) => beam(x, 3, 3)),
  [-2, 0, 2].map((x) => cell(x, 3, 2, 'frame', 'pillar', { axis: 'z' })),
  [-2, -1, 1, 2].map((x) => fixed(x, 4, 3, 'flowering_azalea_leaves')),
  [-1, 1].map((x) => fixed(x, 4, 2, 'azalea_leaves')),
  [-3, 3].map((x) => fixed(x, 0, 1, 'potted_red_tulip')),
  [air(0, 0, 3), air(0, 1, 3)],
], 'Pfeiler in der Wandrolle (Putz), Balken in der Rahmenrolle; Laub persistent über den Auflöser.');

/** T20: modern entrance: frame box at d=+1, 3-high sidelight, cantilever of bottom slabs 2 deep, button for an iron door (E12). */
const T20 = doorTemplate('T20', 'Moderner Eingang mit Rahmenbox und Kragdach', 1, [
  doorway(1),
  solid(2, -1, 0, 'plinth'),
  span(0, 2).map((y) => [post(-1, y), pane(1, y)]),
  pane(0, 2),
  span(-1, 2).map((y) => [solid(-2, y, 1, 'frame'), solid(2, y, 1, 'frame')]),
  span(-2, 2).map((x) => [solid(x, 3, 1, 'frame'), slab(x, 3, 2, 'roofTrim', 'bottom'), slab(x, 3, 3, 'roofTrim', 'bottom')]),
  [-2, 2].map((x) => lantern(x, 2, 3, true)),
  fixed(-1, 1, 1, 'stone_button', { face: 'wall', facing: 'south' }),
  span(-1, 1).map((x) => slab(x, -1, 2, 'path', 'bottom')),
  [air(0, 0, 2), air(0, 1, 2)],
], 'Asymmetrisch (Seitenlicht rechts); der Knopf schaltet eine Eisentür über den Pfosten.');
```

Fenster-Katalog (Art `window`, eigene Platzierung im Giebel, nicht über die Fensterachsen):

```ts
/** W19: fake barn gate 3×3: planks at d=0, trapdoor cladding with a Z brace at d=+1, transom panes (E08). */
const W19 = windowTemplate('W19', 'Scheunentor-Attrappe mit Z-Strebe und Oberlicht', 3, 4, [
  span(0, 2).map((x) => span(0, 2).map((y) => [
    solid(x, y, 0, 'door'),
    cell(x, y, 1, y !== 1 || x === 1 ? 'shutter' : 'door', 'trapdoor', { facing: 'south', half: y === 0 ? 'bottom' : 'top', open: 'true' }),
  ])),
  span(0, 2).map((x) => pane(x, 3)),
  span(0, 3).map((y) => [post(-1, y), post(3, y)]),
  span(-1, 3).map((x) => beam(x, 4)),
], 'Nur Optik; Riegel und Strebe in der Laden-Holzart, Felder in der Tür-Holzart.');
```

Balkone (`balcony.ts`, nicht im Vorlagen-Test):

```ts
/** B02: French balcony: door with side panes, 1-deep landing slab on two corbels, bars in front, pots on the bars. */
const B02: FacadeTemplate = {
  id: 'B02', kind: 'door', label: 'Französischer Balkon mit Gitter', width: 3, height: 2, styles: [], spacing: 1,
  note: 'Gitter steht in d=+1 vor der Tür (gewollt); Lint "tuer-frei" gilt nur für openings.doors.',
  cells: flat(
    cell(1, 0, 0, 'door', 'door', { half: 'lower', facing: 'south', hinge: 'right', open: 'false' }),
    [air(1, 1, 0), air(1, 0, -1), air(1, 1, -1)],
    span(0, 1).map((y) => [pane(0, y), pane(2, y)]),
    span(0, 2).map((x) => [slab(x, -1, 1, 'floor', 'top'), fixed(x, 0, 1, 'iron_bars', undefined, 'frame')]),
    [0, 2].map((x) => [sill(x, -2, 1), fixed(x, 1, 1, 'potted_red_tulip')]),
  ),
};

/** B03: balcony 5×2 on beam ends (log axis z) with corbels, fascia of open trapdoors, corner posts with lanterns. */
function beamBalcony(id: string, label: string, railing: (x: number, d: number) => Cells): FacadeTemplate {
  const cells: Cells[] = [
    cell(1, 0, 0, 'door', 'door', { half: 'lower', facing: 'south', hinge: 'right', open: 'false' }),
    [air(1, 1, 0), air(1, 0, -1), air(1, 1, -1)],
    span(0, 1).map((y) => [pane(0, y), pane(2, y)]),
    span(-1, 3).map((x) => [slab(x, -1, 1, 'floor', 'top'), slab(x, -1, 2, 'floor', 'top')]),
    [-1, 1, 3].map((x) => [cell(x, -2, 1, 'beam', 'pillar', { axis: 'z' }), cell(x, -2, 2, 'beam', 'pillar', { axis: 'z' }), sill(x, -3, 1)]),
    [0, 2].map((x) => cell(x, -2, 2, 'shutter', 'trapdoor', { facing: 'north', half: 'top', open: 'true' })),
    [-1, 3].map((x) => [post(x, 0, 2), lantern(x, 1, 2, false), railing(x, 1)]),
    span(0, 2).map((x) => railing(x, 2)),
    span(0, 2).map((x) => [air(x, 0, 1), air(x, 1, 1)]),
  ];
  return { id, kind: 'door', label, width: 3, height: 2, cells: flat(...cells), styles: [], spacing: 1, note: 'Unterkonstruktion unter beiden Bodenreihen; Stirnbrett zwischen den Balkenköpfen.' };
}
```

---

## Korrekturen zur alten Notiz (`fenster_tueren_details.md`)

1. **Hängelaterne unter Platten** (Abschnitt 1, Stütz-Regeln): Die Notiz nennt „Platte `type=bottom` oder `top`“ als Stütze. Unter einer oberen Platte fehlt aber die Unterseite am Blockrand, also die Mittelstütze (SupportType.CENTER, Box 7..9). Das gilt auch für Kopfüber-Treppen. Das Repo bildet das so ab (`faces.ts:93-96`, Validator `validator.ts:82-86`). Laternen gehören unter untere Platten, Vollblöcke, aufrechte Treppen, Zäune, Mauern und Ketten (abgeleitet, im Spiel prüfen).
2. **Hängeschild an der Wand** (D09): Ein Hängeschild an der Seite eines vollen Blocks bekommt einen selbsttragenden Halter und darf danach frei schweben [4]. Die Bedeutung von `facing` (parallel zur Wand, an einer Südfassade also `east` oder `west`) bleibt eine Einschätzung aus dem Spielcode.
3. **Banner** (D10, T09): Einfarbige Banner brauchen kein NBT, die Grundfarbe steckt in der ID [5]. „Muster = NBT“ stimmt, für Noren reicht aber das einfarbige Banner.
4. **T09 „Genkan“:** Der Genkan ist der abgesenkte Innenbereich hinter der Tür [46]. Außen gehören Haube, Trittstein und Noren hin.
5. **Iron Door:** Die Notiz stützt sich nur auf ein Such-Snippet. Das Wiki bestätigt: Eisentüren gehen „only with redstone power“ auf, ein Knopf an einem angrenzenden Block reicht [61]. Kupfertüren öffnen von Hand [62].
6. **Glocke:** `facing` ist „Opposite from the direction the player faces when placing“, also `south` an einer Südfassade von außen gesetzt. Die Glocke bricht, wenn ihr Halteblock fehlt, und darf an Falltüren nur im geschlossenen Zustand hängen [3].

---

## Fehler, die Profis vermeiden

1. **Tür als bloßes Loch:** ohne Rahmen, Sturz und Tiefe, bündig in der Wand. Planet-Minecraft-Tipp: „every door should have a door frame, along with a block of stone, stoneslab, or stonebrick underneath“ und ein 1–2 Block tiefer „Tunnel“ zur Tür [32][33] (nur Such-Snippet, Seite gibt 403).
2. **Eingang, den man nur springend erreicht,** volle Blöcke als Stufen, schwebende Stufen. Stufen sind Treppen oder Platten [14][15][59].
3. **Dünne Stützen:** ein einzelner Zaunpfosten unter einem großen Dach, eine Haube ohne Konsole, die äußere Balkonreihe ohne Unterbau [42].
4. **Vordach in Sturzhöhe,** das das Portal verdeckt, oder eine Veranda, die schmaler ist als der Türumriss.
5. **Ungerade Laube vor einer geraden Doppeltür** und umgekehrt: Die Achse verrutscht um einen halben Block.
6. **Laternen vor dem Türpfosten oder im Laufweg,** nur eine Laterne, Laternen unter Kopfüber-Treppen (fallen ab).
7. **Teppich auf einer Treppenstufe** (schwebt optisch) oder Deko in den Türspalten.
8. **Die gleiche Eingangsform in allen Stilen,** zum Beispiel ein Holzdeck am modernen Würfelhaus.
9. **Tür ohne Achse darüber,** Erker oder Balkon schief zur Tür, OG-Fenster versetzt [37][38].
10. **Türsturz und Fenstersturz auf verschiedenen Höhen** ohne Oberlicht.
11. **Eisentür ohne Knopf** [61].
12. **Zu viel Deko:** mehr als 2 Deko-Typen am Eingang. Paare nicht gespiegelt.
13. **Treppe nicht in Türbreite:** Profis bauen sie Tür + 2 breit, bei Freitreppen achsial [53].
14. **Balkon ohne Brüstungspfosten,** Zaun direkt an der Kante, Balkon ohne Tür dahinter.
15. **Kranz oder Girlande in der Haube versteckt,** weil die Festschicht den sichtbaren Platz nicht kennt (S11).

---

## Empfehlungen für den Generator

Priorisiert; „Daten“ heißt Vorlage oder Tabelle, „Regel“ heißt Code.

**R1 – Begehbarer Eingang für jede Sockelhöhe** (Regel; `openings.ts` und `doors.ts`)
- `stoop(P, x0, x1, d0)` an jede Türvorlage anhängen, wenn P ≥ 2. Die Vorlagenstufe in d = +1 entfällt dann, d = +1 bleibt Podest.
- Wenn vorn nicht genug Tiefe frei ist (P + 2 Blöcke), den seitlichen Aufgang nehmen.
- `buildHouse.ts:151` (`front`) auf 3 + P setzen.
- **Akzeptanz:** neuer Lint `eingang-begehbar`. Er geht vom Wegende zur Tür und prüft, dass jeder Höhenschritt ≤ 0,5 ist (Treppe oder Platte) und die Kopffreiheit ≥ 2. Er besteht für alle Stile × Größen × P = 1..3. Null Validator-Reparaturen.

**R2 – Veranda neu** (Regel und Daten; `components.ts`, `buildHouse.ts`)
- `porch = true` wählt eine stiltypische Vorlage: T12 (rustic, nordic, medieval, fantasy, cherry), T19 (mediterranean), T20 (modern), T18 mit Engawa (japanese).
- Sie wird nach dem Fachwerk und vor den Fenstern platziert, nicht als Dachabschnitt vor den Öffnungen.
- Die Breite folgt der Türparität.
- `porchSection` und `buildPorch` und T06 werden zusammengeführt.
- **Akzeptanz:**
  - Kein Pfosten ist nur ein Zaun.
  - Die Traufe liegt ≥ 1 über dem Türsturz.
  - Die Stufen reichen bis zum Gelände (R1-Lint).
  - Im Screenshot-Satz sehen sich die Eingänge von modern, japanisch und mediterran nicht ähnlich.

**R3 – Achse Tür und Obergeschoss** (Regel; `openings.ts`)
- `placeFeature` beginnt bei `uDoor` statt bei der Fassadenmitte, solange es passt.
- Die OG-Fensterachsen sind die EG-Achsen plus die Türachse.
- Gauben und Zwerchgiebel bevorzugen die Türachse (`plan.ts`).
- **Akzeptanz:** In ≥ 90 % der symmetrischen Häuser sitzt über der Tür ein Fenster oder Bauteil mit Achsabweichung 0, und alle Fensterachsen fluchten über die Geschosse (Test über Seeds).

**R4 – Tote Vorlagen aktivieren** (Daten; `styles.ts`, `catalog.ts`)
- T07 durch `stoop` ersetzen oder automatisch vor die Liste setzen, wenn P ≥ 2.
- T08 nutzt die Landschaft, wenn `garden` gesetzt ist.
- T10 wird zur Festregel (Girlandenbogen und Kranzanker, Thema Festschicht).
- **Akzeptanz:** Jede Vorlage im Katalog wird in mindestens einem Stil, einer Familie oder einer Regel gewählt (Test).

**R5 – Neue Vorlagen T11, T12, T13, T14, T15, T18, T19, T20** (Daten; `doors.ts`)
- Stillisten nach der Stil-Matrix, `STYLES_OF` passend dazu.
- Türfamilien in `catalog.ts`: `hood: ['T11']`, `porch: ['T12', 'T06']`, `sidelights: ['T13']`, `barn: ['T14']`, `shop: ['T15']`. Der Parser bekommt dazu die Stichwörter „Haube“, „Laube“, „Scheunentor“, „Laden“.
- **Akzeptanz:** `templates.test.ts` ist grün (4 Richtungen × Spiegelung × 2 Versionen), null Reparaturen, und jeder Stil hat ≥ 3 Türvorlagen, davon eine mit Tiefe ≥ 2.

**R6 – Windfang T17** (Daten und Regel; `types.ts`, `openings.ts`, `buildingLints.ts`, Tests)
- Neues Feld `doorDepth?: number` in `FacadeTemplate`.
- `placeDoor` meldet die Tür bei d = doorDepth. Der Freiraum, der Weg (`landscape.ts`) und der Kranz (`festive.ts`) rechnen ab dort.
- Der Test für Türvorlagen prüft „Sockel unter der Tür, Luft d ± 1“ relativ zu `doorDepth`.
- **Akzeptanz:** T17 besteht die Tests, und der Weg beginnt bei d = +3.

**R7 – Lichtregel und T01 verbessern** (Daten; `doors.ts`, `openings.ts`)
- T01: Konsolen `sill(-1, 1, 1)` und `sill(w, 1, 1)` unter der Platte. Die Laternen rücken nach x = −2 und w + 1, unter eine Plattenverlängerung.
- `addDoorLanterns` nutzt stilabhängig einen Mauerarm oder einen Zaunarm in d = +1, y = 2 mit Hängelaterne statt eines Bodenpfostens und meidet Glasspalten.
- **Akzeptanz:**
  - Keine Laterne steht vor einem Türpfosten.
  - Der Lint `laterne-eingang` bleibt grün.
  - Kein `lantern[hanging=true]` hängt unter `half=top`-Treppen oder `type=top`-Platten (Validator-Test).

**R8 – Sturzlinie** (Regel; `openings.ts` beim Sortieren der Türvorlagen)
- Wenn Fenster bei y0 + 2 beginnen, gehen Türvorlagen mit Oberlicht oder 4 Zeilen vor (T02, T13, T14). Sonst bekommt T01 die Variante T01c mit `pane(0, 2)` und Sturz auf y = 3.
- **Akzeptanz:** Türsturz und Fenstersturz liegen im EG auf derselben y-Höhe, in ≥ 90 % der Häuser mit Geschosshöhe 5.

**R9 – Eingangsdeko-Schicht** (Daten und Regel; neues Modul `entrance.ts` nach `buildOpenings`)
- Tabelle aus E13 als `ENTRANCE_DECOR: Record<StyleId, DecorRule[]>`.
- Matte nur auf Vollblock oder oberer Platte, Paare gespiegelt, höchstens 2 Typen.
- **Akzeptanz:** null Reparaturen, `tuer-frei` grün (Teppich ist erlaubt), und keine Deko-Zelle liegt in den Türspalten auf y = 0..1 außer der Matte.

**R10 – Registry ergänzen** (Daten; `families.ts`)
- `bell`; `<holz>_hanging_sign` und `<holz>_wall_hanging_sign`; 16 × `<farbe>_wall_banner`; `decorated_pot`; `copper_lantern` und `waxed_copper_lantern`; weitere `potted_*`: `allium`, `azure_bluet`, `blue_orchid`, `oxeye_daisy`, `pink_tulip`, `orange_tulip`, `cactus`, `dead_bush`, `red_mushroom`, `birch_sapling`, `dark_oak_sapling`, `pale_oak_sapling`; außerdem `composter`, `grindstone`, `leaf_litter`.
- Alle IDs sind gegen den 1.21.11-Dump geprüft [20].
- Block-Entities nur in der Deko-Schicht, mit Export-Test, ob WorldEdit sie ohne NBT anlegt (Vorbild `campfire`).
- **Akzeptanz:** `registry.test.ts` ist gegen minecraft-data grün, und der Round-Trip der `.schem` liest alle Zustände identisch.

**R11 – Eisentür funktionsfähig** (Daten; `palettes.ts` oder Vorlagen)
- Bei `door: iron` setzt jede Vorlage einen Knopf am Pfosten (wie T20), sonst wird stattdessen `waxed_copper_door` gewählt.
- **Akzeptanz:** Neben jeder Eisentür liegt in einem angrenzenden Block oder an einem Pfosten ein Knopf, Hebel oder eine Druckplatte (Lint).

**R12 – Balkon** (Daten; `balcony.ts`, `openings.ts`)
- B03 ersetzt B01 als Standard, B02 für Geschosshöhe 4 oder Fassade < 11.
- Die Achse ist die Türachse (R3).
- Kein Balkon direkt über T11 oder T12, außer über einem modernen Kragdach.
- **Akzeptanz:** Jede Bodenzelle des Balkons in d ≥ +2 hat unter sich einen Balkenkopf oder ein Stirnbrett, und die Eckpfosten tragen Laternen.

**R13 – Nebeneingang und Scheunentor** (Regel; `openings.ts`; niedrige Priorität)
- Rückfassaden ab 13 bekommen eine schlichte Tür mit Pfad-Stummel.
- Langhäuser (Tiefe > 1,5 × Breite) im rustic- oder nordic-Stil bekommen die Haupttür im Giebel (T14) und W19 als zweites Tor.
- **Akzeptanz:** Die Tür sitzt auf der Giebelachse, und der Pfad verbindet beide Türen.

---

## Quellen

1. https://minecraft.wiki/w/Door – Tür-States, Stütze „full solid block face“, Doppeltürregel, 3/16 Dicke.
2. https://minecraft.wiki/w/Carpet – Teppich auf jedem Block außer Luft, auch auf Zäunen und Mauern.
3. https://minecraft.wiki/w/Bell – `attachment` floor/ceiling/single_wall/double_wall, `facing`-Semantik, Block-Entity, bricht ohne Halteblock.
4. https://minecraft.wiki/w/Hanging_Sign – `attached`, `rotation` (0 = Süd), Wandvariante mit selbsttragendem Halter, Text optional.
5. https://minecraft.wiki/w/Banner – `*_wall_banner[facing]`, Grundfarbe in der ID, Position über den oberen Block.
6. https://minecraft.wiki/w/Fence_Gate – `in_wall` senkt um 3 Pixel, schwebt frei, verbindet mit Zäunen und Mauern.
7. https://minecraft.wiki/w/Decorated_Pot – States, Ziegeloptik ohne Scherben, Block-Entity.
8. https://minecraft.wiki/w/Barrel – `facing` (inkl. up), braucht keine Stütze, Block-Entity.
9. https://minecraft.wiki/w/Leaf_Litter – `leaf_litter[facing,segment_amount]`, seit 1.21.5, braucht eine volle Oberseite.
10. https://minecraft.wiki/w/Shelf – `*_shelf` seit 1.21.9, braucht keine Stütze, Block-Entity.
11. https://minecraft.wiki/w/Lantern – Platzierung auf und unter Blöcken, Licht 15, schmilzt Schnee im Umkreis von 2.
12. https://minecraft.wiki/w/Flower_Pot – Java: „on any block or over air“, Liste der `potted_*`-IDs.
13. https://minecraft.wiki/w/Pressure_Plate – Stützregeln und Höhe 1/16 (als Schwellenoption geprüft, nicht empfohlen).
14. https://minecraft.wiki/w/Stairs – Treppen ändern die Höhe „without jumping“.
15. https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions – „depth is crucial“, Treppen statt voller Blöcke, Plattenrhythmus.
16. https://minecraft.wiki/w/Tutorial:Architectural_terms – Transom und Fanlight, Corbel und Console.
17. https://minecraft.wiki/w/Tutorial:Walls_and_buttresses – Treppen, Zäune, Tore und Schilder für Wandrelief.
18. https://minecraft.wiki/w/Tutorial:Trapdoor_uses – Falltür als „bardoor“.
19. https://de.minecraft.wiki/w/Anleitungen/Au%C3%9Fendekoration – Bänke (Treppe + Falltür- oder Schildlehnen), Pflanzkästen, Schubkarre (Zauntor + Komposter + Schleifstein).
20. https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json – lokal geprüft: bell, hanging signs, wall banners, decorated_pot, shelf, copper_lantern, leaf_litter, potted_*, Zustände; `potted_golden_dandelion` fehlt in 1.21.11.
21. https://gamerempire.net/10-stunning-minecraft-front-door-design-ideas/ – zehn Haustüren als Materiallisten (Stämme, Falltüren rund um die Tür, Treppen, Laternen, Töpfe).
22. https://gamerempire.net/best-looking-minecraft-staircase-design-ideas/ – Treppen mit Zäunen, Seitenmauern, Laternen.
23. https://gamerempire.net/minecraft-archway-design-ideas/ – Torbögen (Torii, Holz, Stein) als Materiallisten.
24. https://gamerempire.net/minecraft-lamp-post-design-ideas/ – 16 Laternenpfosten aus Zaun, Mauer, Kette und Falltür.
25. https://www.thespike.gg/minecraft/house-ideas/cottage-house – Tür mit Falltüren und Kopfüber-Treppen rahmen, Balkon mit Steinziegel-Stützen, Veranda aus Zäunen und Zauntoren.
26. https://www.thespike.gg/minecraft/house-ideas/minecraft-farm-house – Veranda mit Steinziegelmauern und Fichtenzäunen, Laternen an Türen und Pfosten.
27. https://www.thespike.gg/minecraft/house-ideas/mayors-house – Säulenportal; „an iron door or a bell at the entrance can make it feel more official“.
28. https://www.thespike.gg/minecraft/house-ideas/spruce-houses – Balkone aus Steinziegeltreppen und -platten, Blumenkästen und Laternen am Eingang.
29. https://www.thespike.gg/minecraft/house-ideas/minecraft-mountain-house – Chalets mit breiten Dächern und Balkonen.
30. https://www.thespike.gg/minecraft/house-ideas/modern-house – „Add stairs, fences, or blocks around the door“.
31. https://www.thegamer.com/minecraft-two-story-house-build-tips/ – Balkone, Zäune, Laternen an Ketten als Außendetails.
32. https://www.planetminecraft.com/blog/minecraft-house-improvement/ – (nur Such-Snippet, 403) Türrahmen, 1–2 Block tiefer „Tunnel“ zur Tür, Vordach aus Platten.
33. https://www.planetminecraft.com/blog/luxs-medieval-building-tips-and-tricks-3617124/ – (nur Such-Snippet, 403) Türrahmen mit Stein oder Platte darunter.
34. https://en.wikipedia.org/wiki/Porch – Porch-Typen: Portikus, Veranda, Loggia, Stoop.
35. https://en.wikipedia.org/wiki/Stoop_(architecture) – kleine Treppe mit Podest, niederländische Herkunft, erhöhtes Bauen.
36. https://en.wikipedia.org/wiki/Transom_(architecture) – Oberlicht (Transom), Fanlight halbrund, japanisches Ranma.
37. https://en.wikipedia.org/wiki/Georgian_architecture – Symmetrie, Fenster auf Raster, Türeinfassung mit Säulen und Giebel.
38. https://en.wikipedia.org/wiki/Bay_(architecture) – Achsen über Fenster gezählt, „5 bay by 2 bay“.
39. https://en.wikipedia.org/wiki/Portico – Portikus als Säulen-Eingangsvorbau, Giebel.
40. https://en.wikipedia.org/wiki/Loggia – überdachte Galerie mit Säulen oder Bögen, Unterschied zum Portikus.
41. https://en.wikipedia.org/wiki/Balcony – Konsolen oder Säulen, Brüstung, französischer Balkon nur mit Frontgeländer.
42. https://en.wikipedia.org/wiki/Corbel – Kragsteine tragen Balkone, Erker, Traufen und **Türhauben**; Konsolreihe.
43. https://en.wikipedia.org/wiki/Pergola – Pfosten, Querbalken, offenes Gitter, Kletterpflanzen, italienische Gärten.
44. https://en.wikipedia.org/wiki/Dutch_door – geteilte Tür, obere Hälfte einzeln offen, Bauernhäuser.
45. https://en.wikipedia.org/wiki/Barn – große Tore für Wagen, gegenüberliegende Dreschtore, Ladeluke mit Aufzug.
46. https://en.wikipedia.org/wiki/Genkan – Eingangsbereich innen, abgesenkt, Stufe 5 cm bis Kniehöhe.
47. https://en.wikipedia.org/wiki/Engawa – Holzstreifen außen unter dem Dach, 1–1,3 m (Tempel > 3 m).
48. https://en.wikipedia.org/wiki/Karahafu – geschwungener Giebel an Toren und Eingängen als Prestigezeichen.
49. https://en.wikipedia.org/wiki/Noren – geschlitzte Stoffbahnen im Ladeneingang, Zeichen „geöffnet“.
50. https://de.wikipedia.org/wiki/Windfang_(Architektur) – Vorraum mit Außen- und Innentür, Standard an der Nordsee.
51. https://de.wikipedia.org/wiki/Vordach – kann alle Dachformen annehmen, meist Auskragung, betont den Eingang.
52. https://de.wikipedia.org/wiki/Kl%C3%B6nt%C3%BCr – nur die obere Hälfte öffnen, ländliche Haustür.
53. https://de.wikipedia.org/wiki/Freitreppe – unüberdachte Treppe vor der Fassade, achsial zum Eingang, Hochparterre.
54. https://de.wikipedia.org/wiki/Schrittma%C3%9Fregel – A + 2S = 63 cm, 17/29 als Optimum.
55. https://de.wikipedia.org/wiki/Niederdeutsches_Hallenhaus – Grote Dör im Giebel für Erntewagen, Klöntür als Nebeneingang.
56. https://no.wikipedia.org/wiki/Bislag – Anbau an der Haustür gegen Zugluft, 1945 Pflicht in Troms und Finnmark, schwedisch farstukvist.
57. https://sv.wikipedia.org/wiki/Farstukvist – Vorbau mit Dach und Boden, oft nur Geländer, Zierholz, Außentreppe.
58. https://arxiv.org/abs/1803.09853 – GDMC: „functional, aesthetically appealing and believable settlements“.
59. https://arxiv.org/html/2107.02457 – GDMC-Kriterien: Zugang für einen Spieler im Survival-Modus, „you can walk everywhere“, keine unglaubwürdigen Brüche.
60. https://arxiv.org/html/2309.10871 – Siegerbeitrag 2022: Variation der Bauten, Kritik an seltsamer Ausstattung.
61. https://minecraft.wiki/w/Iron_Door – „only be opened with redstone power“, Auslösung über angrenzende Blöcke.
62. https://minecraft.wiki/w/Copper_Door – Kupfertüren öffnen von Hand, gewachste oxidieren nicht.
