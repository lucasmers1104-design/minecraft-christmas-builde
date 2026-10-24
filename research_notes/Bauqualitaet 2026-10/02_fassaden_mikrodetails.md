# Fassaden-Mikrodetails („Greebling“) aus Teilblöcken – Katalog und Regeln für den Generator

Stand: 2026-10-23 · Minecraft Java 1.21.11, nur Vanilla-Blöcke

Thema: Welche kleinen Teilblöcke (Falltüren, Knöpfe, Zäune, Mauern, Ketten, Gitter, Stäbe, Einzelobjekte) erfahrene Builder wo und in welcher Dichte an Fassaden setzen, und wie der Generator das als Daten und Regeln abbilden kann.

Abgrenzung: Fenster- und Türvorlagen selbst (W01–W18, T01–T10), Dachformen, Kamine, Türme und die Weihnachtsdeko sind eigene Themen. Hier geht es um die **dritte Tiefenschicht**, also um alles, was kleiner als ein halber Block ist, und um die Regeln, wo sie hingehört. Verweise auf andere Themen stehen in Klammern.

**Konventionen in allen Skizzen** (wie `src/core/templates/types.ts`): kanonische Südfassade, Blick von außen nach Norden. x wächst nach rechts (Osten), y nach oben. Tiefe d: −1 innen, 0 Wand- bzw. Füllebene, +1 und +2 davor. Bei Fachwerk stehen Ständer und Balken in d=+1 (`walls.ts`), Details am Rahmen also in d=+2. In Rastern gilt: Zeichen ohne Klammer liegt in d=0, `[X]` in d=+1, `{X}` in d=+2, `.` ist Luft. „Schnitt“ heißt Blick nach Osten, links innen, rechts außen.

**Maße der Teilblöcke** in Pixeln (1 Block = 16 px), aus den Vanilla-Formen in `src/core/blocks/shapes.ts`, die ein Test gegen die Client-Modelle prüft:

| Block | Form |
|---|---|
| Falltür | Platte 3 px dick. Geschlossen `half=bottom` liegt sie bei y 0–3, `half=top` bei y 13–16. Offen liegt sie an der Kante **gegenüber** `facing` |
| Knopf an der Wand | 6 breit × 4 hoch × 2 tief, mittig |
| Zaun | Pfosten 4×16×4 mittig, Arme 2 px breit bei y 6–9 und 12–15 |
| Mauer | Pfosten 8×16×8. Seitenteil 6 breit, `low` 14 px hoch, `tall` 16 px hoch |
| Kette | 2×2 px Querschnitt |
| Laterne | Körper 6×7×6, Kappe 4×2×4. Hängend 1 px tiefer |
| Blitzableiter | Stab 2 px, Spitze 4 px |
| Endstab | Stab 2 px, Fußplatte 4×1×4 |
| Kerze | 2×6×2 (eine Kerze) |
| Blumentopf | 3/8 Block hoch [20] |

---

## Kurzfassung

Nach Wirkung sortiert:

1. **Die dritte Schicht fehlt fast völlig.** Die Drei-Schichten-Regel ist jetzt im Original belegt: „at least 2–3 layers“. Die dritte Schicht „would consist of buttons, fences, wall blocks or anything … smaller than an actual block“ [34]. Der Generator baut Schicht 1 (Wand) und Schicht 2 (Rahmen, Simse, Läden) gut. Schicht 3 gibt es heute nur als Laternen, Zaun-Laternenpfosten und das Zaungitter von W15. Hier liegt der größte Qualitätshebel.
2. **Details gehören an Knoten der Struktur, nicht frei ins Feld.** Greebles sollen „look like they are functional, and sit in a logical place for that function“ [48]. Akzente gehören dorthin, „where the eye should stop: door frames, chimneys, roof ridges, … window trim, … lantern chains“ [43]. GDMC-Juroren bewerten ausdrücklich das Fehlen von „jarring, strange artefacts that procedural design generates“ [50]. Reale Vorbilder liefern die Knoten:
   - Knaggen unter jedem vorkragenden Balkenkopf [58],
   - Maueranker auf Höhe der Balkenlagen [56],
   - Fallrohre an den Ecken [62],
   - Finials an Spitzen und Giebeln [55].
3. **Traufkonsolen im Ständerraster** sind der stärkste Einzeleffekt an Fachwerk-, Rustikal- und Nordisch-Häusern: eine Zaun- oder Treppenkonsole unter der Traufe an jedem Ständer. Heute bleibt die Traufe glatt, siehe Screenshots.
4. **Firstzier an jeder Giebel- und Turmspitze**: `waxed_lightning_rod`, Zaun + Stab, Mauerpfosten, Drachenkopf (nordisch). Das kostet 1–3 Blöcke pro Giebel und verändert die Silhouette deutlich.
5. **Ein festes Detailvokabular pro Bau.** Das Wiki rät: „choose 1−4 possibilities and use those consistently throughout a design“ [29]. Für den Generator heißt das: höchstens 3 Mikrodetail-Typen je Bau plus Licht und Pflanzen, auf allen Fassaden gleich, als Stildaten.
6. **Die Ausrichtung bestimmt, was eine Falltür ist.** Es gibt fünf Funktionen: Paneel (flach auf der Wand), Laibungsbrett (quer), Leiste (liegend), Kassette (in der Wandebene, 13 px tiefe Nische) und Gitter. Ob eine Holzart als geschlossenes Paneel oder als Gitter wirkt, hängt vom Lochanteil ihrer Textur ab. Fichte gilt als geschlossen [69].
7. **Zahnschnitt und Konsolfries aus Treppe und Stufe** sind klassische Gesimsdetails. Real ist der Zahn so breit, wie er vorspringt, die Lücke halb so breit [52]. In Minecraft geht nur 1:1, das wirkt trotzdem.
8. **Mauer als Kappe und Fuß.** Ein 8-px-Mauerpfosten auf oder unter einem 4-px-Zaun liest sich als Kapitell bzw. Basis. Eine Laterne auf einem Mauerpfosten ergibt den klassischen Torpfeiler. Dafür muss die Pfostenlogik (`up`) stimmen [16][36].
9. **Knöpfe nur in Reihen an Balkenlagen und Portalen** (Maueranker, Nagelköpfe). Mit 6×4×2 px sind sie nur aus der Nähe lesbar. Darum gehören sie in Detailgrad 3 und auf Augenhöhe, so wie Ziersteine „pull more weight when they sit at eye height“ [38].
10. **Metall braucht eine eigene Paletten-Rolle (`hardware`).** Heute sind `iron_bars` fest verdrahtet (`windows.ts:421`, `windows.ts:504`, `balcony.ts:28`). Japanisch und Kirsche brauchen dort Holz oder Bambus, Fantasy gewachstes Kupfer.
11. **Licht schmilzt Schnee ab Blocklicht 12** [17]. Die Werte:
    - `end_rod` leuchtet mit 14 und schmilzt Schnee im Umkreis von 2 Blöcken [21]. Craftdex behauptet das Gegenteil [39], das ist falsch.
    - `waxed_copper_bulb` leuchtet je Stufe mit 15, 12, 8 oder 4 und bleibt ohne Strom an [10].
    - Kerzen geben 3 pro Kerze [22].

    Im Winterthema gehören an verschneite Stellen nur Kerzen und ein oxidierter Kupferstrahler.
12. **Stützregeln sind je Block verschieden:**
    - Halt brauchen Knopf, Hebel, Haken, Glocke, Banner, Kerze, Laterne und Tropfstein.
    - Frei schweben dürfen Falltür, Kette, Endstab, Blitzableiter, Schleifstein (Java) und Blumentopf.
    - Der Schwerkraft folgen Amboss und Gerüst.

    Quellen [2]–[28]. Der Validator kennt davon heute Laterne, Kerze und Knopf.
13. **Lücken in der Registry** (`families.ts`): Es fehlen `lever`, `tripwire_hook`, `bell`, `grindstone`, `anvil`, `decorated_pot`, alle Köpfe, Banner, Hängeschilder, `copper_lantern`, `copper_chain` und `copper_bars` (je gewachst), `polished_blackstone_button`, `wall_torch`, `glow_lichen`, `pale_hanging_moss` und `hanging_roots`.
14. **Dichtebudget** (Einschätzung): Die 60/30/10-Regel für Haupt-, Übergangs- und Akzentmaterial [43] gilt sinngemäß auch für Schicht 3. Daraus folgt:
    - 5–10 % der Fassadenzellen tragen Schicht-3-Teile.
    - Der Eingang ist die dichteste Zone.
    - Nach oben wird es ruhiger.
    - Mindestens ein Feld je Fassade bleibt bewusst leer.

    Die Eckwerte sind gesetzt und noch nicht gemessen; sie müssen an guten Builds kalibriert werden.

---

## Schwächen des aktuellen Generators

Aus den Screenshots in `docs/screenshots/haus-*-gross-ohne-thema.jpg`, `haus-mittelalter-rundturm-erker-balkon-1/2.jpg`, `haus-mittelalter-weihnachten.jpg` und aus dem Code:

1. **Keine Knöpfe, Hebel oder Haken.** Holz- und Steinknöpfe stehen in der Registry (`families.ts:104`, `:323`), die Form `button` gibt es in `style/materials.ts:14` und `:63`. Kein Generator und keine Vorlage setzt sie aber (Suche nach `.button(` bzw. der Form `'button'` in `generator/` und `templates/` liefert nichts).
2. **Die Traufe ist nackt.** Unter dem Überstand liegen nur Kopfüber-Treppen als Untersicht (`roof/roofEngine.ts:360–372`). Es gibt keine Konsolen, kein Traufbrett, keinen Zahnschnitt. In `haus-mittelalter-gross` und `haus-rustikal-gross` läuft die Traufe als glatte Linie über 15+ Blöcke. Die vorhandenen `eaveCells` (`roofEngine.ts:82–88`) nutzt nur die Festschicht.
3. **Jetty-Konsolen sitzen nicht im Ständerraster.** Sie stehen an jeder zweiten Spalte, `(u + 1) % 2` (`walls.ts:180–190`), unabhängig von den Ständern (`walls.ts:167–170`). Echte Knaggen sitzen unter jedem Balkenkopf [58]. Es gibt nur eine Treppenvariante, keinen Balkenkopf und keine Eckkonsole.
4. **Ständer und Säulen sind glatte Stämme.** Es gibt keinen Fuß, kein Kapitell, keine Manschette. Die Manschette hatte die alte Notiz schon empfohlen (`waende_struktur.md`, Abschnitt 7); umgesetzt ist sie nicht. Die Verandastützen sind gestapelte Zäune ohne Fuß und Kopf (`components.ts:120–122`).
5. **Der Sockel hat nur eine Linie**, die Stufenschürze auf Bodenhöhe (`walls.ts:113–123`). Bei hohem Sockel (2–3) fehlt der Abschluss zur Wand, also Sockelgesims oder Wasserschlag. Kellerfenster, Fässer und Töpfe fehlen auch.
6. **Giebel sind flach gefüllt** (`roofEngine.ts:377–406`). Ohne Fenster sieht man eine große, leere Dreiecksfläche, besonders am Steingiebel mit Kamin in `haus-mittelalter-weihnachten.jpg`. Es fehlen Windbrett, Lüftung, Deckleisten, Fassboden und Firstzier. Nur der Rundturm-Kegel bekommt einen Zaun als Spitze (`roundTower.ts:195`).
7. **Metall ist fest verdrahtet.** `iron_bars` stehen fest in W13 (`windows.ts:421`), W17 (`windows.ts:504`) und B01b (`balcony.ts:28`), `iron_chain` fest in T03 (`doors.ts:109`) und in der Festschicht (`festive.ts:81`). Es gibt keine Rolle, mit der ein Stil sein Metall wählt.
8. **Läden ohne Beschlag, Fenster ohne Achse.** W04 und W05 setzen offene Falltüren ohne Ladenhalter. Unter den Fenstern fehlen Brüstungsfelder, die Fensterachse endet am Sims (`windows.ts:176–186`). Im mediterranen Screenshot wirken die türkisen Läden gut. Bei Mittelalter und Rustikal sieht man im großen Maßstab dagegen kaum Läden.
9. **Balkon und Veranda:**
   - Das Geländer ist eine durchgehende Zaun- oder Gitterreihe ohne Pfostenrhythmus, Kappen oder Handlauf (`balcony.ts:18–19`, `:27–28`).
   - Konsolen gibt es nur bei x=−1, 1 und 3 (`balcony.ts:17`).
   - Die Veranda hat Zaunpfosten ohne Kopf (`components.ts:120–122`).
10. **Die Stildaten kennen kein Detailvokabular.** `styles.ts:52–53` kennt nur die Wahrscheinlichkeiten `shutters`, `flowerBoxes`, `porch`, `chimney`, `dormers` und `annex`. Ein Stil kann nicht ausdrücken, dass er „Maueranker und Zaun-Knaggen“ verwendet.
11. **Modern zeigt große Flächen ohne Fuge.** In `haus-modern-gross` sind Sockelband und schwarze Rahmenkästen völlig glatt. Moderne Bauten brauchen keine Kleinteile, wohl aber Schattenfugen, Kassetten und bündige Leuchten (Technik A4, F5).
12. **Die Festschicht ist zu grob** (nur kurz, eigenes Thema Weihnachten): Schleifen sind volle `red_wool`-Würfel, Lichter volle `glowstone`-Würfel in der Girlande (`festive.ts:78–80`, `:106`). Im Screenshot `haus-mittelalter-rundturm-erker-balkon-2.jpg` lesen sie sich als Klötze. Mit Traufkonsolen (C1) würde die Girlande zwischen den Konsolen durchhängen. Das gäbe einen natürlicheren Rhythmus.

---

## Techniken und Regeln

Wirkung und Aufwand stehen in der Form W hoch/mittel/niedrig und A hoch/mittel/niedrig. Die Stilkürzel sind med, fan, rus, nor, jap, che, mod und mdt.

### A – Falltüren

**Kurzreferenz für die Südfassade** (offene Platte liegt gegenüber `facing` [14], `shapes.ts:206–210`):

| gewünschte Lage | Zustand |
|---|---|
| flach an der Wand dahinter (Nordkante) | `facing=south,open=true` |
| flach, außen bündig (Südkante) | `facing=north,open=true` |
| quer, Platte an der Ostkante | `facing=west,open=true` |
| quer, Platte an der Westkante | `facing=east,open=true` |
| liegend unten (y 0–3) | `open=false,half=bottom` |
| liegend oben (y 13–16) | `open=false,half=top` |

Bei offenen Falltüren ändert `half` nur die Spiegelung der Textur. Die vorhandenen Läden nutzen das bereits (`shutterHalf`, `windows.ts:92`). Falltüren brauchen seit Java 1.9 keinen Halt [14]. Geschlossene tragen Laternen: `half=top` darauf stehend, `half=bottom` darunter hängend. Offene tragen nichts [14].

#### A1 Brüstungsfeld und Wandpaneel

Eine offene Falltür liegt flach auf der Wand. Unter dem Fenster verlängert sie die Fensterachse nach unten (Fenster, Sims, Brüstungsfeld). Im Wandfeld wirkt sie als Holzpaneel auf Putz. W12 nutzt das schon als Ladenbrüstung (`windows.ts:404`). Neu ist der allgemeine Einsatz unter jedem Fenster einer Achse.

```
Ansicht Süd, Fenster 1×2 mit Läden, y=-3..2
       x=-1  x=0  x=1
y=2    [s]   [s]  [s]     s = spruce_slab[type=top] (Sturzplatte, wie W04)
y=1    [T]    P   [T]     T = spruce_trapdoor[facing=south,half=top,open=true] (Laden, wie W04)
y=0    [T]    P   [T]     unten half=bottom
y=-1   [S]   [S]  [S]     S = spruce_stairs[facing=north,half=top] (Sims)
y=-2    #    [B]   #      B = spruce_trapdoor[facing=south,half=bottom,open=true] (Brüstungsfeld)
y=-3    #    [B]   #      zweite Reihe nur, wenn bis zur Geschosslinie ≥ 2 Reihen frei sind
```

- **Regeln:** Das Feld ist so breit wie die Glasöffnung. Es hört eine Reihe über Balken oder Sockel auf. Die Holzart ist die der Läden (`shutter`).
- **Einsatz:** Fachwerk-Obergeschosse (med, rus, nor), Laden-EG (mdt mit `spruce`), modern mit `iron_trapdoor`.
- **Bewertung:** W mittel, A niedrig.
- **Quellen:** [32], [34], [42]; Achslogik ist Einschätzung.

#### A2 Laibungsbretter („trapdoor framing“)

Quer gestellte offene Falltüren in d=+1 bilden seitliche Bretter, die 1 Block vorspringen und 3 px dick sind. Oben und unten schließen liegende Falltüren als dünner Sturz und dünne Bank ab. Das ergibt einen „Kastenrahmen“ mit viel Schatten und wenig Masse. Er ist leichter als ein Stammrahmen (W06) und passt dorthin, wo W06 zu schwer wirkt.

```
Ansicht Süd                         Draufsicht y=0..1
       x=-1  x=0  x=1                       x=-1  x=0  x=1
y=2    [H]   [H]  [H]               d=+1    [|    .    |]
y=1    [W]    P   [E]               d=0      #    P    #
y=0    [W]    P   [E]
y=-1   [U]   [U]  [U]
W = spruce_trapdoor[facing=west,half=bottom,open=true]  (Platte an der Ostkante = an der Öffnung)
E = spruce_trapdoor[facing=east,half=bottom,open=true]  (Platte an der Westkante)
H = spruce_trapdoor[facing=south,half=bottom,open=false] (liegt direkt auf Sturzhöhe)
U = spruce_trapdoor[facing=south,half=top,open=false]    (dünne Bank direkt unter dem Glas)
```

- **Regeln:** Nicht mit Läden kombinieren, beides braucht die Spalten x=−1 und x=w. Abstand zum nächsten Fenster ≥ 2.
- **Einsatz:** nor, jap (in `dark_oak`), che, mod (in `iron_trapdoor`), kleine und mittlere Häuser.
- **Bewertung:** W mittel, A niedrig.
- **Quellen:** [14], [35] („A trapdoor placed against a wall adds a subtle 'lip' that catches light differently“); die Anordnung ist Einschätzung.

#### A3 Liegende Leiste: Sturzbrett, dünne Bank, Sockel- und Bandabdeckung

Geschlossene Falltüren sind 3 px dicke Platten. Damit lassen sich Gesimse zeichnen, die feiner sind als Stufen (8 px). Einsatz:

- Sturzbrett über Fenstern und Türen statt Platte;
- Tropfleiste vor einem Geschossbalken: d=+2, `half=top`, Reihe y0;
- obere Abdeckung eines Blumenkastens.

```
Schnitt an einer Geschosslinie (Fachwerk), y0 = Balkenlage
        d=0  d=+1  d=+2
y0+1     W    .     .
y0       W    B    {L}     L = spruce_trapdoor[facing=south,half=top,open=false] (Tropfleiste)
y0-1     W    L|    .      B = Balken (beam, axis=x), L| = Ständer
```

- **Regeln:** Läuft durch, mit Unterbrechung nur an Ständern, die in d=+2 Konsolen tragen. Nicht in Türfreiräumen (`openings.ts` reserviert sie).
- **Bewertung:** W mittel, A niedrig. Stile: med, rus, nor, mod (`iron_trapdoor`).
- **Quellen:** [14], [35]; die Lage ist Einschätzung.

#### A4 Kassette, Blendnische und Schattenfuge

Eine offene Falltür mit `facing=south` **ersetzt** einen Wandblock in d=0. Ihre Platte liegt dann an der Innenkante. Von außen sieht man eine 13 px tiefe Nische mit Holz- oder Metallrückwand, die Wand bleibt geschlossen. Das ist der billigste echte Tiefensprung, den der Generator setzen kann, ohne etwas vor die Wand zu bauen. Die Regel „keine flache Wand > 5“ (`buildingLints.ts`) wird damit erfüllt.

```
Ansicht Süd, Putzwand 7 breit, y=1..3          Schnitt bei x=2
       x=0 x=1 x=2 x=3 x=4 x=5 x=6                     d=-1 d=0  d=+1
y=3     #   #   #   #   #   #   #               y=3      .   #     .
y=2     #   #   K   #   K   #   #               y=2      .  |K     .      |K = Platte an der Innenkante
y=1     #   #   K   #   K   #   #               y=1      .  |K     .
K = spruce_trapdoor[facing=south,half=bottom,open=true] in d=0 (statt Wandblock)
Modern: K = iron_trapdoor[…] als Schattenfuge; Reihe y=1..h über die volle Bandhöhe
```

- **Regeln:**
  - Nie in tragenden Ecken. Nie direkt neben Öffnungen (dort wäre es eine falsche Laibung).
  - In Gruppen zu 2–3 symmetrisch zur Feldmitte.
  - Bei Holzwand gleiche Holzart (Kassette); bei Putz eine kontrastierende Holzart (Blendfeld).
  - Laut Tutorial ist eine glatte Wand nur in Ordnung, „if the rest is detailed“ [29]. Kassetten sind die Alternative.
- **Einsatz:** mod (Schattenfugen in Bändern), jap/che (Holzpaneele zwischen Ständern), mdt (Blendnischen im Giebel).
- **Bewertung:** W mittel bis hoch, A niedrig.
- **Quellen:** [14], [29], [35]; die Kassettendeutung ist Einschätzung.

#### A5 Manschette an frei stehenden Pfosten und Säulen

Offene Falltüren sitzen an allen freien Seiten eines Pfostens auf Höhe 1 und 3 („am 1. und 3. Block“, so die Quelle der alten Notiz). Neu ist hier die Zustandsregel: **`facing` zeigt vom Pfosten zur Falltürzelle**, dann liegt die Platte am Pfosten an.

```
Draufsicht um eine Verandasäule C bei (x=0, d=+2), Ebenen y=1 und y=3
          x=-1  x=0  x=1
d=+3       .    {S}   .       S = spruce_trapdoor[facing=south,half=bottom,open=true]
d=+2      {W}   {C}  {E}      W = …[facing=west,…], E = …[facing=east,…]
d=+1       .    {N}   .       N = …[facing=north,…] (nur wenn die Säule frei steht)
C = stripped_spruce_log[axis=y]
```

- **Einsatz:** Verandastützen, Torpfeiler und frei stehende Eckstützen ab 3 Block Höhe. Nicht an Ständern im Wandraster, dort stört es die Fachwerklinie.
- **Bewertung:** W mittel, A niedrig. Stile: rus, med, nor, jap (ohne Manschette, stattdessen E4).
- **Quellen:** alte Notiz `waende_struktur.md` (ByPixelbot); die `facing`-Regel stammt aus [14] und `shapes.ts`.

#### A6 Gitter- und Lüftungsfeld

Manche Holzfalltüren haben Löcher in der Textur, Fichte gilt als geschlossen („no transparent sections“ [69]). Eine Gitter-Falltür in der Wandebene (wie A4) wirkt als Lüftungsgitter. Typische Orte sind die Giebelspitze, ein Kellerfenster oder das Brüstungsfeld eines Speichers. Modern und Steampunk nehmen stattdessen `waxed_copper_grate`. Das ist ein voller Würfel, durchsichtig, wasserloggbar, und Mobs spawnen nicht darauf [11]. Craftdex empfiehlt Kupfergitter „as ventilation in steampunk and industrial styles“ [40].

```
Ansicht Giebel (kanonisch Süd), oberste 3 Reihen unter dem First
y=r-1        /  V  \           V = Gitter-Falltür[facing=south,open=true] in d=0
y=r-2     /  #  V  #  \            oder waxed_copper_grate (fan/mod)
y=r-3  /  #  #  #  #  #  \     / \ = Ortgang
```

- **Regel:** 1–2 Felder genau auf der Giebelachse, nur bei Giebeln ohne Fenster.
- **Bewertung:** W mittel, A niedrig. Stile: med, rus, nor (Holz), fan, mod (Kupfer).
- **Quellen:** [11], [40], [69]. Welche Holzarten Löcher haben, ist nicht belegt. Empfehlung: den Lochanteil messen (Empfehlung P12).

#### A7 Windbrett am Ortgang (bargeboard)

Reale Windbretter decken die Hirnholzenden am Giebelüberstand ab und sind oft geschnitzt oder bemalt [61]. In Minecraft zeigt der Ortgang-Überstand seitlich das Sägezahnprofil der Dachtreppen. Offene Falltüren davor machen daraus ein gestuftes Brett:

```
Schnitt quer zum Ortgang (Giebel kanonisch Süd, Ortgang-Überstand in d=+1)
        d=0  d=+1  d=+2
y=k+1    #    R    {B}     R = Ortgangtreppe (roof/roofTrim), B = spruce_trapdoor[facing=south,half=bottom,open=true]
y=k      #    R    {B}         (Platte an der Nordkante = an der Ortgangseite)
         für jede Zelle des äußersten Ortgangs in d=+1 eine Falltür in d=+2
```

- **Regeln:**
  - Das Brett folgt genau der Ortganglinie, das Holz ist dunkler als die Dachfläche.
  - An der Spitze treffen sich beide Bretter. Dort sitzt die Firstzier (F4) bzw. der Drachenkopf (G6).
  - Nur bei Dächern mit sichtbarem Giebel und Überstand ≥ 1.
- **Bewertung:** W mittel, A niedrig, weil `gableCells` und Ortgangzellen bekannt sind. Stile: nor (stark), rus, med.
- **Quellen:** [61], [67] (Dragestil: „steep roofs and big eaves“, Drachenköpfe); die Umsetzung ist Einschätzung.

#### A8 Brettbrüstung (Engawa, Balkon, Laubengang)

Statt Zaunreihe stehen am Plattformrand offene Falltüren. Die Platte liegt an der **Außenkante**, das ergibt eine geschlossene, 3 px dünne Brüstung, 1 Block hoch.

```
Draufsicht Balkon (B01-Lage, Plattform d=+1..+2, x=-1..3), Ebene y=0
          x=-1  x=0  x=1  x=2  x=3
d=+2      {P}   {F}  {F}  {F}  {P}     F = spruce_trapdoor[facing=north,half=bottom,open=true] (Platte an der Südkante)
d=+1      [Fw]   .    .    .   [Fe]    Fw = …[facing=east,…] (Platte an der Westkante), Fe = …[facing=west,…]
d=0        #     #    D    #    #      P = Eckpfosten (D1)
```

- **Bewertung:** W mittel, A niedrig. Stile: jap, che (dunkles Holz), nor; mod mit `iron_trapdoor`.
- **Quellen:** [14]; die Anordnung ist Einschätzung.

### B – Knöpfe

Wandknöpfe brauchen eine volle Fläche dahinter. Sie fallen ab, wenn der Halt verschwindet [2]. Der Validator prüft das schon (`validator.ts:114–118`). Der Zustand ist `face=wall,facing=south` an der Südfassade: `facing` zeigt nach außen, der Halt liegt nördlich. `face=ceiling` hängt unter einer vollen Unterseite, z. B. unter einer Kopfüber-Treppe oder einer oberen Stufe. In 1.21.11 gibt es 14 Knöpfe: 12 Holzarten, `stone_button` und `polished_blackstone_button` [1]. Der schwarze Knopf fehlt in der Registry, er ist aber der einzige, der wie Schmiedeeisen wirkt.

#### B1 Maueranker an Balkenlagen

Maueranker sitzen real auf Höhe der Holzbalkendecken und halten die Fassade an der Decke. Ihre Enden sind als Splint, Kreuz, Buchstaben oder Jahreszahl geschmiedet [56]. In Minecraft wird daraus ein schwarzer Knopf auf jeder Balkenlage einer Steinwand ohne Rahmen:

```
Ansicht Süd, Steinwand mit Geschossdecke auf y=5 (keine Rahmenebene)
       x=0 x=1 x=2 x=3 x=4 x=5 x=6 x=7 x=8
y=6     #   #   G   G   #   G   G   #   #
y=5     #  [a]  #   #  [a]  #   #  [a]  #     a = polished_blackstone_button[face=wall,facing=south,powered=false]
y=4     #   #   G   G   #   G   G   #   #         (n.i.R.; Ersatz: stone_button, wirkt aber grau)
G = Fenster des OG/EG
```

- **Regeln:**
  - Nur auf Pfeilern zwischen Fenstern und an den Ecken (je 1 Spalte von der Ecke), nie über Fensterachsen.
  - Abstand 3–5, spiegelsymmetrisch zur Fassadenmitte.
  - Nur auf Geschosslinien, nicht im Feld.
  - Bei Detailgrad 3 an einem Pfeiler zwei Knöpfe übereinander (y und y+1), als „Splint“.
- **Einsatz:** Stein- oder Putzgeschosse von med, nor, rus; mdt als Eisenanker auf Putz. Nicht jap, che, mod.
- **Bewertung:** W niedrig bis mittel (nur aus der Nähe lesbar), A niedrig.
- **Quellen:** [2], [56]; die Übertragung auf Minecraft ist Einschätzung.

#### B2 Nagelköpfe am Portal, Holznägel am Fachwerkknoten

Ziernägel betonen Torpfosten und Sturz:

- Knöpfe in einer Reihe auf einem Sturzbalken in d=0 (z. B. T03- und T04-Portale), im Abstand 2;
- im Fachwerk ein dunkler Holzknopf (`dark_oak_button` auf Fichte) an Knoten von Ständer und Riegel, als Holznagel.

Die Laternen der Türvorlagen sitzen in d=+1 neben der Tür, darum gehören Nagelköpfe auf den Sturz, nicht auf die Pfosten.

```
Ansicht Süd, Portal T04 (Rahmen d=+1), y=3 = Sturzreihe
        x=-2  x=-1  x=0  x=1  x=2
y=3     [R]   [R]   [R]  [R]  [R]     R = Rahmen (roofTrim), davor in d=+2:
        {n}    .    {n}   .   {n}     n = stone_button bzw. polished_blackstone_button[face=wall,facing=south]
```

- **Bewertung:** W niedrig, A niedrig. Nur Detailgrad 3, nur am Haupteingang. Stile: med, fan, rus.
- **Quellen:** [2], [41]; die Laternenpfosten nutzen „4 Stone Buttons“ bzw. „4 Spruce Buttons“ als Beschlag. Die Lage ist Einschätzung.

#### B3 Deckenknöpfe als Sparren- und Zahnköpfe

`*_button[face=ceiling]` unter jeder zweiten Untersicht-Treppe ergeben winzige Sparrenköpfe. Kopfüber-Treppen haben eine volle Unterseite, also ist der Halt gegeben.

- **Bewertung:** W niedrig, A niedrig. Nur sinnvoll bei kleinen Häusern und Detailgrad 3; C1 oder E1 wirken stärker.
- **Quelle:** [2]; Einschätzung.

### C – Zäune

Zäune verbinden sich mit vollen Flächen und anderen Zäunen, nicht mit Mauern und nicht mit Scheiben [15]. Ein Zaun in d=+1 vor einer vollen Wand bekommt also einen Arm zur Wand (`north=true`) und wirkt wie eine Konsole. Laternen hängen unter einem Zaunpfosten, weil die tragende Mitte reicht (`validator.ts:81–87`).

#### C1 Zaun-Knagge unter Traufe, Jetty und Vordach

Knaggen sind dreieckige Stützhölzer unter vorkragenden Balkenköpfen, oft profiliert [58]. Konsolen in Reihe heißen Konsolfries („corbel table“) [59]. In Minecraft:

```
Schnitt an einem Ständer, Traufe mit Überstand ≥ 1
        d=0  d=+1  d=+2
y=t+1    #    R     R       R = Dachüberstand mit Untersicht
y=t      W    B    {F}      F = spruce_fence[north=true,east=false,south=false,west=false] (Knagge, verbindet zum Rähm B)
y=t-1    W    L|    h       h = optional lantern[hanging=true] (nur Ecken und Türachse)
y=t-2    W    L|    .       L| = Ständer (frame, axis=y), W = Füllung

Ansicht Süd (Traufe), Ständer bei x=0,4,8
x:     0   1   2   3   4   5   6   7   8
y=t+1  R   R   R   R   R   R   R   R   R
y=t   {F}  .   .   .  {F}  .   .   .  {F}
```

**Varianten nach Gewicht:**

| Variante | Blöcke in d=+2, y=t | wann |
|---|---|---|
| leicht | `<frame>_fence[north=true]` | Überstand 1, Holzbau, kleine Häuser |
| mittel | `<beam>_stairs[facing=north,half=top]` (vorhandene Jetty-Konsole) | Überstand 1–2, med, rus |
| schwer | y=t: `<beam>_log[axis=z]` (Balkenkopf); y=t−1: `<beam>_stairs[facing=north,half=top]` | Überstand ≥ 2, großer Maßstab, nor, Jetty |

- **Regeln:**
  - Je eine Knagge unter jedem Ständer der obersten Balkenlage. Ist der Ständerabstand > 4, kommt eine weitere in die Mitte, aber nur bei Überstand ≥ 2.
  - An Traufecken eine Eckknagge (der Auflöser setzt die Treppe auf `outer_*`).
  - Dieselbe Regel gilt für Jetty-Konsolen. Sie ersetzt `(u + 1) % 2` in `walls.ts:186`.
  - Die Girlande der Festschicht läuft zwischen den Knaggen und hängt in der Feldmitte eine Reihe durch.
- **Bewertung:** W hoch, A niedrig, weil `eaveCells` und Ständerpositionen vorhanden sind.
- **Stile:** med, rus, nor, fan, jap (leicht, `dark_oak_fence`), che. Nicht mod. Bei mdt nimmt man E1 statt C1.
- **Quellen:** [58], [59], [44] („Lanterns by the door and under the eaves“); die Varianten sind Einschätzung.

#### C2 Deckleisten und Lisenen (Giebelschalung)

Senkrechte Zäune in d=+1 vor der Giebelfüllung bilden eine Deckleistenschalung. Sie stehen alle 2 Spalten, vom Giebelfuß bis unter den Ortgang. Gestapelte Zäune verbinden sich nicht senkrecht, ergeben aber einen durchgehenden 4-px-Stab mit Armen zur Wand. An Wänden ohne Rahmen kann man dasselbe als Lisene zwischen Fenstern setzen.

```
Ansicht Giebel (kanonisch Süd), Giebelfuß y=g
y=g+3            /  #  \
y=g+2         /  #  [F]  #  \           F = spruce_fence[north=true] (sonst false)
y=g+1      /  #  [F]  #  [F]  #  \
y=g     /  #  [F]  #  [F]  #  [F]  #  \     (Achse: Leiste genau auf der Giebelmitte)
```

- **Regeln:**
  - Die Leisten stehen symmetrisch zur Giebelachse. Die mittlere Leiste endet unter dem Firstknoten.
  - Nicht über Giebelfenstern. Die Leiste endet über dem Sturz und beginnt unter der Bank wieder.
  - Mit A7 (Windbrett) ergibt das den typischen skandinavischen Holzgiebel.
- **Bewertung:** W hoch bei großen Giebeln, A niedrig. Stile: nor, rus; jap als `bamboo_fence` (tategoshi-Optik).
- **Quellen:** [15], [67]; die Anordnung ist Einschätzung.

#### C3 Koshi-Gitter und Sockelschutz (japanisch)

Machiya-Fassaden haben Holzgitter (*kōshi*), deren Muster früher den Laden anzeigte; vorspringende Gitter heißen *degōshi* [65]. Am Sockel steht der *inuyarai*, ein gebogener Bambusschutz, der die Wand vor Spritzwasser schützt und die Grenze zur Straße markiert [66]. W15 setzt Zäune vor alle Glasspalten. Die verbinden sich untereinander, also entsteht ein Kastengitter. Ein senkrechtes Lattenbild bekommt man mit **Zaun, Luft, Zaun, …**: einzelne Pfosten verbinden sich nicht mit Scheiben [15], es bleiben schlanke 4-px-Stäbe.

```
Ansicht Süd, Shoji 3×2 mit Tategoshi (statt W15-Kastengitter)
       x=-1  x=0  x=1  x=2  x=3
y=1     D|   [f]   W   [f]   D|     f = dark_oak_fence (alle Verbindungen false), W = white_stained_glass_pane
y=0     D|   [f]   W   [f]   D|     D| = stripped_dark_oak_log[axis=y]
Sockelschutz (Andeutung inuyarai): Schürzenreihe y=1 in d=+2 als bamboo_mosaic_stairs[facing=north,half=bottom]
```

- **Bewertung:** Koshi W mittel, A niedrig. Inuyarai W niedrig, A niedrig (nur jap, che).
- **Quellen:** [15], [65], [66]; die Umsetzung ist Einschätzung.

#### C4 Wandarm für Laterne, Schild und Glocke

Ein Zaun in d=+1 hat einen Arm zur Wand. Darunter hängt eine Laterne (T02 nutzt das schon), ein Hängeschild ohne Text (G8) oder eine Glocke (G1).

```
Ansicht Süd neben einer Ladentür, y=1..3
        x=-2  x=-1
y=3      #    [F]      F = spruce_fence[north=true]
y=2      #    [X]      X = lantern[hanging=true] | spruce_hanging_sign[attached=true,rotation=4] | bell[attachment=ceiling]
y=1      #     .       (Laufweg frei halten: nie in der Türspalte)
```

- **Bewertung:** W mittel, A niedrig. Stile: alle außer mod (dort F5).
- **Quellen:** [19] (Hängeschild unter schmalem Block = „up-arrow shape“, `attached`), [5], [23]; T02.

#### C5 Geländer mit Pfostenrhythmus und Handlauf

Ein durchgehendes Zaungeländer wirkt billig. Profis gliedern es mit Pfosten:

- Ecken und jeder 3. bis 4. Geländerplatz bekommen einen dickeren Pfosten: Mauer (8 px), Stamm oder Zaun mit Mauerkappe.
- Darauf steht eine Laterne oder ein Topf.
- Optional kommt eine liegende Falltür als Handlauf über die Zaunfelder.

```
Ansicht Süd, Balkongeländer d=+2, Plattform y=-1
        x=-1  x=0  x=1  x=2  x=3
y=1     {o}   {h}  {h}  {h}  {o}     o = lantern[hanging=false] oder potted_* auf dem Pfosten
y=0     {P}   {f}  {f}  {f}  {P}     P = <plinth>_wall[up=true] bzw. stripped_<frame>_log[axis=y]
                                     f = <frame>_fence, h = <frame>_trapdoor[half=bottom,open=false] (Handlauf)
```

- **Regel:** Bei Eisengeländern (`iron_bars`, Craftdex: „thinner silhouette and a darker line“ [37]) sind die Pfosten `polished_blackstone_wall` oder Stein.
- **Bewertung:** W mittel, A niedrig. Stile: alle. mod nimmt Gitter ohne Handlauf.
- **Quellen:** [37], [15]; der Handlauf ist Einschätzung (im Spiel prüfen, wie er aussieht).

### D – Mauern

Die Mauerpfosten-Logik [16]: Eine Mauer mit genau zwei gegenüberliegenden oder vier Verbindungen hat keinen Pfosten. Einzeln oder mit drei Seiten hat sie einen. Fackel, Banner, Druckplatte, Schild oder Stolperdraht darauf erzwingen ihn. Craftdex fasst das als Gestaltungsregel: „A long perimeter is one visual element. A T-shape is a visual call-out. A standalone wall is a post.“ [36]

#### D1 Mauer als Säulenkopf und -fuß („wall-as-column-cap“)

Wer zwei Breiten übereinandersetzt, bekommt Basis und Kapitell, ohne Treppenecken rechnen zu müssen:

- Zaunstütze (4 px) auf Mauerfuß (8 px) ergibt einen Pfostenfuß;
- Mauerkappe (8 px) auf Stamm (16 px) ergibt eine Verjüngung, auf der eine Laterne steht.

```
Verandastütze (statt gestapelter Zäune)     Torpfeiler / Brüstungspfosten
y=4   R   (Vordach)                         y=4   o   lantern[hanging=false]
y=3   F   spruce_fence                      y=3   M   cobblestone_wall[up=true] (Kappe)
y=2   F                                     y=2   C   stone_bricks (oder Stamm axis=y)
y=1   M   cobblestone_wall[up=true] (Fuß)   y=1   C
y=0   =   Boden                             y=0   =
```

- **Regeln:**
  - Fuß und Kappe nehmen das Material der Sockelrolle (`plinth`).
  - Steht eine Mauer direkt an einer Wand, verbindet sie sich und bekommt einen Seitenarm. Darum D1 nur frei stehend, mindestens 1 Luftblock zur Wand.
- **Bewertung:** W mittel bis hoch, A niedrig. Stile: med, rus, nor, mdt; fan mit `deepslate_brick_wall`.
- **Quellen:** [16], [36], [41] (zahlreiche Laternenpfosten mit „Cobblestone Walls … Spruce Fences … Lanterns“).

#### D2 Fallrohr an Ecken

Fallrohre sitzen an den Ecken [62]. Eine Mauersäule in d=+1 an der äußersten Spalte, von der Traufe bis zur Sockeloberkante, zeigt Pfosten und kurzen Arm zur Wand. So sieht ein Rohr mit Schellen aus. Die schlanke Variante ist eine `iron_bars`-Säule (2 px).

```
Ansicht Süd, rechte Ecke einer Putzwand (ohne Rahmen), x=L-1 = letzte Wandspalte
y=t     R    R    [K]     K = <chimney>_stairs[facing=north,half=top] (Rinnenkessel unter der Traufe)
y=t-1   #    #    [r]     r = andesite_wall (verbindet north=low/tall, up=true) bzw. iron_bars[north=true]
 …      #    #    [r]
y=P+1   #    #    [r]
y=P     S    S    [a]     a = <plinth>_stairs[facing=north,half=bottom] (Auslauf) – nur wenn frei
```

- **Regeln:**
  - Nur an Wänden ohne Rahmenebene, weil dort in d=+1 nichts steht.
  - Je Traufseite höchstens 2 Rohre, symmetrisch, nie auf der Eingangsseite neben der Tür.
- **Bewertung:** W niedrig bis mittel, A niedrig. Stile: mdt, mod (`iron_bars` oder `polished_deepslate_wall`), med-Steinbauten.
- **Quellen:** [62], [16]; die Umsetzung ist Einschätzung.

#### D3 Attika und Brüstungsmauer

Am Rand von Flachdächern und Dachterrassen läuft eine Mauerreihe. Ohne Pfosten wirkt sie als ruhiges Band [36]. Ecken und jeder 4. Platz bekommen einen erzwungenen Pfosten: ein Topf, eine Laterne oder ein Banner darauf.

- **Bewertung:** W mittel, A niedrig. Stile: mdt (`sandstone_wall`, `mud_brick_wall`), mod (Glas oder Gitter statt Mauer), fan.
- **Quellen:** [16], [36].

### E – Treppen und Stufen („stair-slab detailing“)

#### E1 Zahnschnitt unter Traufe und Gesims

Der Zahnschnitt ist eine Reihe kleiner Blöcke im Gesims; klassisch springt der Zahn so weit vor, wie er breit ist, die Lücke ist halb so breit [52]. Er sitzt unter Gesimsen, unter Traufen und in Giebeldreiecken; die Sägezahn-Variante kommt im nord- und mitteleuropäischen Backsteinbau vor [53].

```
Ansicht Süd, Traufband einer Putzwand (ohne Rahmen), x=0..8
y=t+1   R   R   R   R   R   R   R   R   R     R = Überstand (roof/roofTrim)
y=t    [Q] [Z] [_] [Z] [_] [Z] [_] [Z] [Q]    Z = smooth_sandstone_stairs[facing=south,half=top] (Zahn)
y=t-1   #   #   #   #   #   #   #   #   #     _ = smooth_sandstone_slab[type=top] (Lücke)
                                              Q = voller Eckblock (verhindert Treppen-Eckformen)
Schnitt: Z hat die obere Hälfte voll und das untere vordere Viertel → der Zahn springt
bündig mit dem Band vor; _ hat nur die obere Hälfte → tiefer Schatten bis zur Wand.
```

- **Regeln:**
  - Zahn und Lücke wechseln 1:1. Nie zwei Treppen nebeneinander, sonst rechnet der Auflöser Eckformen.
  - Ungerade Länge, damit beide Enden mit einem Zahn oder Eckblock schließen.
  - Material = `roofTrim` oder das hellere Steinmaterial.
- **Bewertung:** W hoch bei mdt, mittel bei fan und mod-klassisch; A niedrig. Nicht jap, che, nor.
- **Quellen:** [52], [53]; die Minecraft-Umsetzung ist Einschätzung.

#### E2 Konsolfries (corbel table) unter einem Gurtgesims

Ein Konsolfries ist „a projecting, moulded string course supported by a range of corbels“ [59]. Zwischen den Konsolen eines Wehrgangs sitzen Pechnasen (Maschikulis) [60].

```
Ansicht Süd, Gurtgesims über dem EG einer Steinwand, x=0..8
y=g     [=] [=] [=] [=] [=] [=] [=] [=] [=]   = = stone_brick_slab[type=bottom] (Gesimsplatte, d=+1)
y=g-1   [K]  .  [K]  .  [K]  .  [K]  .  [K]   K = stone_brick_stairs[facing=north,half=top] (Konsole)
y=g-2    #   #   #   #   #   #   #   #   #    . = Schatten unter der Platte
```

- **Regeln:**
  - Konsolen im Abstand 2 und an beiden Enden.
  - Auf Steinbauten zwischen EG und OG statt Holz-Geschossband.
  - Am Turm ist das der vorhandene Konsolenkranz (Thema Türme).
- **Bewertung:** W mittel bis hoch, A niedrig. Stile: med (Stein), fan, mdt.
- **Quellen:** [59], [60], [29] („Separator: a band of a different block type … at one height“).

#### E3 Sockelgesims (zweite Linie)

Bei Sockelhöhe P ≥ 3 kommt zur Bodenschürze eine zweite, feinere Linie an der Sockeloberkante. Erst damit ist der Übergang von Sockel zu Wand fertig.

```
Schnitt, Sockel P=3, Ständer in d=+1
        d=0  d=+1  d=+2
y=4      W    L|    .
y=3      S    S    {g}     g = <plinth>_slab[type=bottom] (fein) oder <plinth>_stairs[facing=north,half=bottom] (Wasserschlag)
y=2      S    S     .
y=1      S    S    {a}     a = vorhandene Schürze (walls.ts:113–123)
```

- **Bewertung:** W mittel, A niedrig. Stile: alle mit Steinsockel. Die Quelle der alten Notiz (minecraft.net) nennt „Gebäudesockel mit Stufen dekorieren“; Sereyka empfiehlt „A row or two of stone under the walls, with steps up to the door“ [44].

#### E4 Sattelholz und Kapitell an Stützen

Kopfüber-Treppen links und rechts unter dem Balken, mit der vollen Seite zur Stütze, ergeben ein Sattelholz. Das ist die Pfosten-Variante der vorhandenen Kopfbänder (`walls.ts`, `addBraces`).

```
Ansicht Süd, Verandastütze bei x=0, Balken y=3
        x=-1  x=0  x=1
y=3      B     B    B      B = Balken (beam)
y=2     [Se]   C   [Sw]    Se = <beam>_stairs[facing=east,half=top], Sw = …[facing=west,half=top]
y=1      .     C    .      C = Stütze (Stamm oder Zaun)
```

- **Bewertung:** W mittel, A niedrig. Stile: jap, che (Pflicht statt Manschette), rus, nor.
- **Quellen:** [58] (Knagge als Winkelholz zwischen Ständer und Balken), alte Notiz Abschnitt 7.

#### E5 Eckquader (quoins)

Eckquader sind Steinblöcke an der Mauerecke. Klassisch wechseln lange und kurze Steine; sie „imply strength, permanence, and expense“ [54]. In Minecraft wechseln an der Ecke 2 und 1 Blöcke eines helleren oder polierten Materials, Reihe für Reihe versetzt. Das ist eher Textur als Teilblock, aber das Standardmittel für Ecken ohne Rahmen.

```
Ansicht Süd, linke Ecke (x=0 Ecke), y=1..6, Q = polished_andesite (Eckquader), # = Wand
y=6   Q Q #        y=3   Q #
y=5   Q #          y=2   Q Q #
y=4   Q Q #        y=1   Q #
```

- **Bewertung:** W mittel, A niedrig. Stile: mdt, med (Stein), fan, mod-klassisch.
- **Quellen:** [54], [38] (Zierblock an „a corner“).

### F – Metall: Ketten, Gitter, Stäbe, Kupfer

#### F1 Laternen an Ketten – Längenregel

Ketten brauchen keinen Halt [18], die Laterne darunter schließt nahtlos an [23]. Regeln (Einschätzung):

- Unter der Traufe eine Kette (1 Block) und die Laterne darunter.
- Unter Vordach oder Veranda 1–2 Glieder.
- In Torbögen und an Türmen 2–4 Glieder, damit die Laterne in Augenhöhe kommt.
- Nie tiefer als 2 Blöcke über dem Gelände.
- Paarweise: Eingang links und rechts, Traufecken. Die Festschicht nutzt das bereits (`festive.ts:113–133`).

Ein Hängebalkon hat Ketten von der Traufe oder einem Wandarm zu den vorderen Ecken des Balkons. Das wirkt wie eine Zugstange.

- **Bewertung:** W mittel, A niedrig. Stile: alle außer mod (dort F5).
- **Quellen:** [18], [23], [43] (Akzent an „lantern chains“).

#### F2 Regenkette (kusari-doi)

Die Regenkette (jap. 鎖樋, „Kettenrinne“) ersetzt das Fallrohr: Das Wasser läuft an Kette oder Bechern von der Rinne in ein Becken; ihr Zweck ist vor allem dekorativ. Man findet sie an japanischen Tempeln und auch in nordischer Bauweise [63].

```
Ansicht Süd, Traufecke rechts (Traufzelle e = erste Luftzelle unter dem Überstand)
y=t     e = iron_chain[axis=y]     (bzw. waxed_copper_chain, n.i.R., für che/fan)
y=t-1       iron_chain[axis=y]
 …          iron_chain[axis=y]
y=2         iron_chain[axis=y]     unterstes Glied endet über der Schürze
y=1         Becken: <plinth>_slab[type=bottom] außerhalb der Schürze (oder cauldron, n.i.R.)
```

- **Regel:** Je Traufseite 1–2 Ketten, an den Ecken oder symmetrisch zum Eingang. Nicht zusammen mit Laternenketten an derselben Ecke.
- **Bewertung:** W mittel bis hoch (jap), A niedrig. Stile: jap, che, nor.
- **Quellen:** [63].

#### F3 Fenstergitter (reja) und Kellerfenster

`iron_bars` in d=+1 vor Erdgeschossfenstern, oben und unten gefasst von Sturzplatte und Sims. Hinter dem Gitter steht ein Glasblock, keine Scheibe, sonst entstehen T-Stummel. W17 löst das schon so.

Kellerfenster: `iron_bars` in d=+1 in einer Sockelreihe, dahinter bleibt der Sockelblock. Das deutet einen Keller an und erzählt Nutzung, wie es die GDMC-Narrative verlangt („imagine in what order things were built“) [50].

```
Ansicht Süd, Sockel P=2, Fensterachse x=2
       x=1  x=2  x=3
y=2     S   [g]   S      g = iron_bars[east=false,west=false,north=true,south=false]
y=1     S    S    S      S = Sockel
```

- **Bewertung:** Reja W mittel (mdt), Kellerfenster W niedrig bis mittel; A niedrig. Stile: Reja mdt, med; Kellerfenster med, rus, nor.
- **Quellen:** [37] (Eisengitter für Gefängnis und Tresor „essentially mandatory … visual coding is too strong“); darum Kellergitter sparsam, sonst entsteht ein Kerker-Eindruck. Außerdem [50].

#### F4 Firstzier und Finial

Finials markieren die Spitze von Kuppeln, Türmen, Dächern und Giebeln [55]. Varianten:

| Variante | Blöcke (von unten) | Stil |
|---|---|---|
| Stab | `waxed_lightning_rod[facing=up]` auf dem Firstende | med, nor, rus, fan |
| Pfosten + Stab | `<frame>_fence` + `waxed_lightning_rod[facing=up]` | Turmkegel (statt nur Zaun, `roundTower.ts:195`) |
| Mauerknauf | `<ridge>_wall[up=true]` auf dem Firstende | med-Stein, mdt |
| Leuchtstab | `end_rod[facing=up]` | fan, nur ohne Schnee (Licht 14) |
| Drachenkopf | siehe G6 | nor |

```
Ansicht Giebel (kanonisch Süd), Firstspitze
y=r+2      .   L   .      L = waxed_lightning_rod[facing=up,powered=false,waterlogged=false]
y=r+1      .   F   .      F = spruce_fence (alle false) – optional
y=r       /   X    \      X = Firstblock am Giebelende
```

- **Regeln:**
  - Genau eine Zier je Giebelspitze, höchstens 2 Blöcke über dem First.
  - Am Walmdach an beiden Gratenden oder gar nicht.
  - Nur gewachste Blitzableiter, die ungewachsten oxidieren in vier Stufen [13].
- **Bewertung:** W hoch, A niedrig. Stile: alle außer mod und jap (jap über `ridgeStyle`).
- **Quellen:** [55], [13], [21].

#### F5 Kupfergitter und Kupferleuchte (modern, Steampunk)

- `waxed_copper_bulb[lit=true]` bündig in der Wandebene ist eine Einbauleuchte. Sie bleibt ohne Strom an [10]. Die Helligkeit wählt man über die Stufe: `waxed_oxidized_copper_bulb` gibt nur 4 und ist damit schneefest, `waxed_copper_bulb` gibt 15.
- `waxed_*copper_grate` passt für Lüftung, Untersicht und Brüstung.
- Craftdex: Kupfergitter „as ventilation in steampunk and industrial styles“, gewachste Leuchten „bright lights forever“ [40].

```
Ansicht Süd, Eingang modern
       x=-2 x=-1 x=0 x=1 x=2
y=2     #    U   #   U   #     U = waxed_copper_bulb[lit=true,powered=false] in d=0 (statt Wandblock)
y=1     #    #   D   #   #
y=0     #    #   D   #   #
```

- **Bewertung:** W mittel (mod), A niedrig.
- **Quellen:** [10], [11], [40].

### G – Einzelobjekte

#### G1 Glocke

`bell` mit `attachment=floor|ceiling|single_wall|double_wall` ist ein Block-Entity, braucht aber keinen Inhalt [5]. Sie hängt auch unter nicht ganz vollen Unterseiten und an geschlossenen Falltüren; wird die Falltür geöffnet, fällt sie ab [5]. Einsatz: unter einem Wandarm (C4) am Laden, Bahnhof oder Rathaus, im Glockenstuhl.

- **Bewertung:** W mittel als erzählerischer Akzent, A niedrig. **Höchstens eine je Bauwerk.**
- `facing` je Anbringung im Spiel prüfen.

#### G4 Fass: Fassboden-Rosette und Stapel am Sockel

- `barrel[facing=south,open=false]` in der Giebelwand (d=0) zeigt den runden Fassdeckel nach außen. Das ist ein hölzerner Okulus-Ersatz für Giebel ohne Fenster (Einschätzung).
- Ein bis drei Fässer `[facing=up]` am Sockel neben dem Eingang oder unter einem Vordach erzählen Nutzung.
- **Bewertung:** W mittel, A niedrig. Stile: rus, nor, med. Fass steht in der Registry.
- **Quellen:** [45] (Fenster „combines Oak Slabs, Trap Doors, Window Panes, Barrels, Bookshelves, and even Iron Bars“); die Rosette ist Einschätzung.

#### G5 Blumentöpfe und decorated_pot

Blumentöpfe stehen in Java auf jedem Block oder in der Luft [20]. Das macht sie zum sichersten Topfdetail auf Mauer- und Zaunpfosten, Simsen und Treppenwangen.

- `decorated_pot[facing=south]` ist ohne Scherben-NBT ein schlichter Ziegeltopf [12]. Er passt paarweise an den Eingang und an die Ecken der Attika.
- **Im Winter** gehören in die Töpfe `potted_spruce_sapling`, `potted_fern` und `potted_dead_bush`, statt Tulpen.
- **Bewertung:** W mittel, A niedrig. Stile: mdt (stark), rus, fan, che (`potted_cherry_sapling`).
- **Registry:** `decorated_pot` und einige `potted_*` fehlen, z. B. `potted_dead_bush`, `potted_azure_bluet`, `potted_birch_sapling`, `potted_pale_oak_sapling`.

#### G6 Köpfe: Drachenkopf am Giebel

Drachenköpfe sind Kennzeichen des norwegischen Dragestils, mit steilen Dächern und großen Traufen [67]. Köpfe gibt es stehend (`rotation` 0–15) und an der Wand (`facing`) [9]. Ohne NBT sehen Skelett-, Witherskelett-, Zombie-, Creeper-, Piglin- und Drachenkopf richtig aus. `player_head` zeigt ohne NBT Steve [9].

- **Einsatz:** `dragon_head[rotation=0]` (Blick nach Süden, analog Banner [25]) auf dem Firstende über dem Schnittpunkt der Windbretter (A7), beidseitig.
- **Bewertung:** W hoch für nor, A niedrig. Nur nor, höchstens 2 je Bau. n.i.R.
- Ob Köpfe ohne Halt bleiben, ist nicht belegt (Einschätzung: ja). Größe und Überstand des Drachenkopfmodells im Spiel prüfen.

#### G7 Banner ohne Muster

Wandbanner (`<farbe>_wall_banner[facing]`) fallen ab, wenn ihr Halt verschwindet [25]. Standbanner haben `rotation`, 0 heißt nach Süden [25]. Ein schlichtes Banner ist einfarbig. Einsatz:

- paarweise an Pfeilern neben dem Haupteingang;
- an Türmen;
- weiß über der japanischen Tür (Noren-Andeutung, T09-Notiz);
- rot im Weihnachtsthema.

Banner auf Mauern erzwingen einen Pfosten [16].

- **Bewertung:** W mittel, A niedrig. Stile: med, fan, jap (weiß), Weihnachten.
- **Export:** Block-Entity ohne Muster ist erlaubt. n.i.R.


#### G2, G3, G8–G11 Weitere Einzelobjekte (kompakt)

| Nr. | Block (Südfassade) | Einsatz | Halt und Grenzen | W/A, Stile | Quelle |
|---|---|---|---|---|---|
| G2 | `grindstone[face=wall,facing=south]` | runde Scheibe an der Wand: Rad, Laternenhalter; als Querträger an Laternenpfosten („2 Grindstones“) | braucht in Java keinen Halt | W niedrig–mittel / A niedrig; rus, med | [6], [41] |
| G3 | `anvil[facing=east]` (auch `chipped_`, `damaged_`) | schwerer Pfostenkopf („Weighted Lamp Post … 1 Anvil … 2 Chains“), Schmiedetür | Schwerkraft, braucht einen Block darunter; Zaun- oder Mauerpfosten genügt vermutlich (prüfen) | W niedrig / A niedrig; rus, med | [28], [41] |
| G8 | `spruce_hanging_sign[attached=true,rotation=4]` unter Zaunarm, `*_wall_hanging_sign` | Ladenschild-Silhouette ohne Text an C4 | unter schmalem Block Ketten in Pfeilform (`attached=true`); leerer Text = kein Inhalt (Einschätzung) | W mittel (Läden, Markt) / A niedrig; alle außer mod | [19] |
| G9 | `tripwire_hook[facing=south,attached=false]`; `lever[face=wall,facing=south]` | Ladenhalter neben offenem Laden (x=−2 bzw. x=w+1, d=+1, y=0; echte Läden hängen an Kloben); Hebel als Torriegel oder Haken | Haken braucht volle Fläche, ragt in Richtung `facing`; Hebel volle Fläche oder Oberseite Kopfüber-Stufe/-Treppe; Fensterabstand ≥ 3 | W niedrig / A niedrig; nur Detailgrad 3; rus, med, nor, mdt | [3], [4], [57], [41] |
| G10 | `vine`, `glow_lichen`, `hanging_roots`, `pale_hanging_moss[tip=true]` am Strangende | unter Balkonen und Erkern; Hexenhaus, Ruine (Überschneidung mit Thema Landschaft) | Haftflächen bzw. Block darüber nötig | W niedrig–mittel / A mittel; fan, nie mod | [24] |
| G11 | `pointed_dripstone`, `scaffolding`, `chiseled_bookshelf`, `*_shelf` | nicht empfohlen | Tropfstein fällt ohne Block darüber und ist als Eiszapfen durch die Nutzerentscheidung ausgeschlossen; Gerüst fällt ab `distance=7` (riskant beim Einfügen); Bücherregal zeigt Bücher über `slot_N_occupied`, Inhalt im Block-Entity; Regal ist ein Block-Entity ohne Mehrwert gegenüber A3 | – | [7], [8], [26], [27] |


---

## Wo Profis die Details einsetzen

Leitfrage: Traufe, Ecken, Sockel, über der Tür, Balkongeländer, Wandfelder, Konsolen.

| Ort | Techniken (Priorität absteigend) | Rhythmus und Lage | Quellenbezug |
|---|---|---|---|
| **Traufe** | C1 Knaggen · E1 Zahnschnitt (Stein) · F1 Kettenlaternen an den Ecken · F2 Regenkette (jap) · A3 Traufleiste | Knagge unter jedem Ständer; Zahnschnitt 1:1 durchgehend; Laternen nur an Ecken und Türachse | [58], [59], [52], [44], [63] |
| **Giebel und Ortgang** | F4 Firstzier · A7 Windbrett · C2 Deckleisten · A6 Lüftung · G4 Fassboden · G6 Drachenkopf (nor) | alles auf der Giebelachse oder symmetrisch dazu | [55], [61], [67] |
| **Ecken** | E5 Eckquader (Stein) · D2 Fallrohr · Eckknagge (outer-Treppe) · A5 Manschette an frei stehenden Eckstützen | Ecken sind auch die Orte stärkster Verwitterung (alte Notiz) | [54], [62] |
| **Geschosslinie** | E2 Konsolfries (Stein) · B1 Maueranker · A3 Tropfleiste | nur auf Höhe der Balkenlagen | [56], [59], [29] (Separator) |
| **Sockel** | E3 Sockelgesims · D1 Pfostenfuß · F3 Kellerfenster · G4/G5 Fässer und Töpfe am Eingang · Inuyarai (jap) | Schürze unten, Gesims oben; Objekte nur in Eingangsnähe | [44], [66], [50] |
| **Über der Tür** | Sturz mit A3- oder E1-Detail · G7 Bannerpaar · C4 Wandarm mit G8 oder G1 · B2 Nagelköpfe am Portal | dichteste Zone des Baus; Laufweg 2 Blöcke frei (bestehende Regel) | [38] (Zierblock am „door frame“), [43] |
| **Fenster** | A1 Brüstungsfeld · A2 Laibungsbretter · F3 Gitter · G9 Ladenhalter · Blumenkasten (vorhanden) | je Fassade **ein** Fenstertyp mit **einem** Zusatz | [29] (1–4 Typen) |
| **Balkon und Veranda** | C5 Pfostenrhythmus · D1 Kappen · A8 Brettbrüstung · E4 Sattelholz · C1 Knaggen darunter · F1 Zugketten | Pfosten an den Ecken und alle 3–4; Konsolen unter Pfosten | [37], [16] |
| **Wandfeld** | A4 Kassette · A1 Paneel · C2 Lisene · B1 Anker – **oder bewusst leer** | Gruppen zu 2–3, symmetrisch; mindestens ein Feld je Fassade ruhig | [29] (plain wall nur bei sonst reichem Detail) |
| **Konsolen allgemein** | leicht Zaun → mittel Kopfüber-Treppe → schwer Balkenkopf + Treppe → zweistufig (Erker, alte Notiz) | Konsole immer unter etwas, das sie trägt; nie frei an der Wand | [58], [59] |

---

## Dichte, Rhythmus und Grenzen: wie viel ist zu viel

**Belegte Regeln**

1. **Drei Schichten:** hinten die schlichte Hauptwand, in der Mitte Rahmen und große Stützen, vorn die kleinsten Teile. Durch sie hindurch sieht man auf die Schichten dahinter [34]. Die Tiefe wirkt erst ab 2–3 Schichten. Bei sehr großen und sehr kleinen Bauten gibt es Ausnahmen [34].
2. **1–4 Möglichkeiten je Bau, konsistent** [29]. Die Tiefensprünge selbst regelt Craftdex: Pfeiler 1 Block vor; Treppe und Stufe 0,5; Falltür und Mauer „less than 0.5“; Scheibe 7 px zurück [35].
3. **Zurückhaltung:** „A handful of texture blocks sprinkled into a wall reads as detail; an even 50/50 mix usually reads as a mess.“ [42] Für Ziersteine gilt etwa einer auf 3–5 normale, an Fokuspunkten: Türrahmen, Ecke, Schlussstein, Bogenmitte [38]. Zu viele in Reihe ergeben ein Wiederholungsmuster, das das Auge bemerkt [38].
4. **Akzentanteil etwa 10 %** (60/30/10). Ein starker Akzent braucht ruhige Blöcke darum herum, und nur ein Akzent soll führen [43].
5. **Funktion vor Fülle:** Details müssen funktional wirken, sonst wirken sie „tacked on“ [48]. Juroren werten Konsistenz und angemessene Variation [50]. Gezählte Merkmale und Blockvielfalt korrelieren mit menschlichem Urteil [51]. Vielfalt zählt, aber nur innerhalb eines konsistenten Vokabulars.

**Abgeleitete Generatorregeln** (Einschätzung, zu kalibrieren)

| Regel | Wert |
|---|---|
| Mikrodetail-Typen je Bau (ohne Licht und Pflanzen) | Detailgrad 1: 0–1 · Detailgrad 2: 2 · Detailgrad 3: 3, nie mehr |
| Anteil der Fassadenzellen mit Schicht-3-Teilen | Detailgrad 2: 3–8 % · Detailgrad 3: 6–12 % · Obergrenze 15 % |
| Bindung an Knoten | ≥ 90 % der Schicht-3-Blöcke höchstens 1 Zelle von Ständer, Balkenlage, Öffnungskante, Ecke, Traufe oder Giebelachse |
| Wiederholabstand | Sparren, Knaggen und Zahnschnitt 2 (bzw. Ständerraster) · Anker und Lisenen 3–5 · Geländerpfosten 3–4 · Laternen an der Traufe 4–6 (wie heute) |
| Symmetrie | Details je Fassade spiegelgleich zur Fassadenmitte oder Türachse; Zufall **einmal je Fassade**, nie je Zelle |
| Höhengefälle | EG und Eingang am dichtesten; OG etwa 60 %; Giebel nur Achsdetails (Ziersteine wirken auf Augenhöhe [38]) |
| Ruhezonen | mindestens ein Feld je Fassade ohne Schicht 3; Kassetten oder Paneele nie in allen Feldern |
| Maßstab | Größe `small`: Knöpfe und Zäune erlaubt · `large`/`huge`: Knöpfe weglassen, Konsolen schwerer, Bänder (E1, E2) statt Punkte |

**Warnzeichen für „zu viel“** (aus den Quellen abgeleitet): mehr als zwei Schicht-3-Typen im selben Wandfeld; Details auf jeder zweiten Zelle; Teilblöcke, die nichts tragen und nichts halten; drei oder mehr Holzarten in den Kleinteilen; Licht direkt neben Schnee.

---

## Kombinationen, die funktionieren (Stilrezepte)

Je Stil höchstens 3 Kerntechniken, eine Holzart für die Kleinteile (meist die Rahmenrolle), ein Metall (`hardware`):

| Stil | Holz der Kleinteile | Metall (`hardware`) | Kernvokabular | Licht | Firstzier |
|---|---|---|---|---|---|
| medieval | `dark_oak` / `spruce` (= `frame`) | Eisen: `polished_blackstone_button`*, `iron_chain`, `iron_bars` | C1 Knaggen (Treppe) an Traufe und Jetty · B1 Maueranker am Steingeschoss · A1 Brüstung unter Läden | `lantern` an Kette | Zaun + `waxed_lightning_rod` |
| fantasy | `dark_oak`, `cherry`, `pale_oak` | gewachstes Kupfer (`waxed_copper_grate`, `copper_chain`*) | E2 Konsolfries · A6 Gitterfelder · G10 Hängemoos/Flechte | `soul_lantern` | `end_rod` (ohne Schnee) bzw. `waxed_lightning_rod` |
| rustic | `spruce` / `oak` | Eisen | C1 Zaun-Knaggen · C4 Wandarm mit Schild/Laterne · G4/G5 Fässer und Töpfe am Sockel | `lantern` | `spruce_fence` |
| nordic | `spruce`, `dark_oak` | Eisen | A7 Windbrett · C2 Giebel-Deckleisten · G6 Drachenkopf* bzw. G4 Fassboden | `lantern` an Kette | Drachenkopf* |
| japanese | `dark_oak`, `spruce`, `bamboo` | kein Eisen außer Regenkette | C3 Tategoshi · F2 Regenkette · E4 Sattelholz (+ A8 Engawa-Brett) | `lantern` auf Zaun | keine (`ridgeStyle`) |
| cherry | `cherry`/`pale_oak` für Paneele, dunkle Ständer | wie japanese, Kupfer gewachst | A1/A4 Paneele · C3 Tategoshi · G5 Töpfe mit `potted_cherry_sapling` | `lantern` | keine |
| modern | `iron_trapdoor`, `pale_oak` | Eisen / gewachstes Kupfer | A4 Schattenfugen · F5 bündige Kupferleuchten · D3 Attika (Glas oder Gitter) | `waxed_copper_bulb` | keine |
| mediterranean | `spruce` / `warped` (Läden) | Eisen | F3 Reja · E1 Zahnschnitt (`smooth_sandstone`) · G5 Töpfe/`decorated_pot`* auf Simsen und Attika | `lantern` am Wandarm | keine |

\* = nicht in Registry.

**Thema Winter und Weihnachten** (Überlagerung, Details im Thema Weihnachten):

- Kerzen auf Simsen und Bänken (A3 und E2 haben volle Oberseiten).
- Girlanden zwischen den Knaggen statt durchgehend.
- Rote Banner (G7) statt `red_wool`-Würfeln als Schleifen.
- Töpfe mit `potted_spruce_sapling`.
- Kein `end_rod`, kein heller Kupferstrahler in Schneenähe.

---

## Technische Regeln: Halt, Export, Licht

| Block-IDs (1.21.11) | Zustände (Südfassade) | Halt | Licht | Block-Entity | Registry |
|---|---|---|---|---|---|
| `*_trapdoor` (12 Holz, `iron_`, 8 Kupfer) | `facing`, `half`, `open` | keiner [14] | – | nein | ja (Kupfer nur gewachst) |
| `*_button` (12 Holz, `stone_`, `polished_blackstone_`) | `face=wall,facing=south` | volle Fläche dahinter [2] | – | nein | Holz und Stein ja, `polished_blackstone_button` **nein** |
| `*_fence`, `*_fence_gate` | Verbindungen | keiner | – | nein | ja |
| `*_wall` | Seiten `none/low/tall`, `up` | keiner | – | nein | ja |
| `iron_chain`, `copper_chain` (+ Stufen, gewachst) | `axis` | keiner [18] | – | nein | `iron_chain` ja, Kupfer nein |
| `iron_bars`, `copper_bars` (+ Stufen, gewachst) | Verbindungen | keiner | – | nein | `iron_bars` ja, Kupfer nein |
| `lantern`, `soul_lantern`, `copper_lantern` (+ Stufen, gewachst) | `hanging` | tragende Mitte [23] | 15 / 10 / 15 | nein | Kupfer nein |
| `lever` | `face`, `facing` | volle Fläche oder Oberseite Kopfüber-Stufe/-Treppe [3] | – | nein | nein |
| `tripwire_hook` | `facing` (ragt in diese Richtung), `attached=false` | volle Fläche [4] | – | nein | nein |
| `bell` | `attachment`, `facing` | Halt nötig, auch schmale Unterseiten [5] | – | ja, ohne Inhalt | nein |
| `grindstone` | `face`, `facing` | **keiner** (Java) [6] | – | nein | nein |
| `anvil`, `chipped_anvil`, `damaged_anvil` | `facing` | **Schwerkraft** [28] | – | nein | nein |
| `barrel` | `facing`, `open=false` | keiner | – | ja, leer | ja |
| `decorated_pot` | `facing`, `cracked` | unbelegt (Einschätzung: keiner) [12] | – | ja, Scherben optional | nein |
| `flower_pot`, `potted_*` (37 Stück) | – | keiner (Java) [20] | – | nein | teilweise |
| `*_candle` | `candles`, `lit` | tragende Mitte | 3 je Kerze [22] | nein | ja |
| `end_rod` | `facing` | keiner [21] | **14, schmilzt Schnee** [21] | nein | ja |
| `waxed_lightning_rod` (+ ungewachst, Stufen) | `facing` | keiner [13] | – | nein | `lightning_rod` und `waxed_lightning_rod` ja |
| Köpfe `*_skull`, `*_head` (+ Wandform) | `rotation` / `facing` | unbelegt (Einschätzung: keiner) [9] | – | ja; `player_head` braucht NBT | nein |
| `*_banner`, `*_wall_banner` | `rotation` / `facing` | Halt nötig [25] | – | ja, Muster optional | nein |
| `*_hanging_sign`, `*_wall_hanging_sign` | `attached`, `rotation` / `facing` | Halt nötig (Einschätzung) [19] | – | ja, Text leer | nein |
| `waxed_*copper_grate` | – | – | – | nein | ja |
| `waxed_*copper_bulb` | `lit`, `powered=false` | – | 15 / 12 / 8 / 4, bleibt an [10] | nein | ja |
| `pointed_dripstone` | `thickness`, `vertical_direction` | Block darüber, sonst fällt er [7] | – | nein | nein (ausgeschlossen) |
| `scaffolding` | `distance`, `bottom` | ≤ 6 zur Stütze, sonst fällt es [8] | – | nein | nein (nicht verwenden) |
| `pale_hanging_moss` | `tip` | Block darüber (Einschätzung) [24] | – | nein | nein |

**Schnee:** Er schmilzt ab Blocklicht 12 [17]. Für Schnee in der Nähe heißt das: höchstens 4 Kerzen, also Licht 12, und die nicht direkt daneben. `waxed_oxidized_copper_bulb` mit Licht 4 ist schneefest. Laternen, Endstäbe und frische Kupferleuchten gehören nicht in Schneenähe. Der Validator rechnet das schon (`emittedLight`, `validator.ts:64–72`); neue Lichtblöcke brauchen ihren `light`-Wert in `families.ts`.

**Oxidation:** Nur gewachste Kupfer- und Blitzableiter-Varianten setzen, die ungewachsten oxidieren [13], [40]. Die Registry hält es heute schon so (`families.ts`, Abschnitt Copper).

---

## Fehler, die Profis vermeiden

1. **Details ohne Funktion oder Ort:** etwa Knöpfe gestreut ins Feld oder Zäune, die nichts tragen. Greebles sollen „sit in a logical place for that function“ [48].
2. **Zu viele Detailtypen:** mehr als 4 je Bau [29]. Ebenso Mischungen 50/50 statt einer Handvoll Akzente [42].
3. **Zufall je Zelle:** Er zerstört Rhythmus und Symmetrie. Profis wiederholen dasselbe Detail in festem Abstand. Gleichförmige Reihen von Ziersteinen erzeugen ein Muster, das das Auge bemerkt [38]. Darum: Zierblöcke punktuell, Teilblöcke rhythmisch.
4. **Falsche Ausrichtung:** Läden, die abstehen statt anliegen; Laibungsbretter mit der Platte an der falschen Kante; Treppenreihen, die an Ecken unbeabsichtigt `outer_*` werden. Gegenmittel: Zustandstabelle oben, Eckblöcke bei E1.
5. **Löchrige Texturen als geschlossene Paneele:** Falltüren mit Lochmuster wirken als Gitter. Fichte gilt als geschlossen [69]. Der Lochanteil sollte gemessen werden (P12).
6. **Halt vergessen:** Knopf, Glocke, Banner, Laterne oder Kerze auf Teilblöcken ohne volle Fläche brechen beim Einfügen ab, weil WorldEdit Nachbar-Updates ausführt. Laternen auf Laub sind schon verboten (`festive.ts:128`).
7. **Licht neben Schnee:** Endstab und frische Kupferleuchte schmelzen ihn [21], [10]. Die Craftdex-Angabe, Endstäbe schmölzen keinen Schnee [39], ist falsch.
8. **Ungewachstes Kupfer:** Es oxidiert über die Zeit [13].
9. **Gitter direkt vor Scheiben:** Das gibt T-Stummel (alte Notiz). Dahinter gehört Glasblock oder Luft.
10. **Maßstabsfehler:** 2-px-Knöpfe an einem riesigen Bau sind unsichtbares Rauschen. Schwere Balkenköpfe an einem 5-Block-Häuschen wirken plump (Einschätzung, vgl. [43]: „A small decorative corner can handle more contrast than a large castle wall“).
11. **Erzählbruch:** Gefängnisgitter am Wohnhaus [37], Amboss am Teehaus, Drachenkopf am modernen Bau. Details müssen zur Geschichte des Baus passen [50].
12. **Entities:** Item Frames, Bilder und Rüstungsständer nutzen Builder gern (z. B. [47]: „Item frames and custom heads for lights, stockings, ornaments“). Für den Generator sind sie tabu, ebenso Köpfe mit Spieler-Skin-NBT.

---

## Empfehlungen für den Generator

Nach Priorität (Wirkung durch Aufwand). Jeder Punkt nennt Modul, Form (Daten oder Regel) und ein prüfbares Akzeptanzkriterium.

**P1 – Detail-Pass mit Vokabular als Stildaten** (Daten + Regel)
- **Was:** Neuer Schritt `generator/house/facadeDetails.ts` nach Dächern, Öffnungen und Kamin, vor Landschaft und Festschicht. Eingaben: `Facade` und `Panel` (walls.ts), Ständerpositionen, `roof.eaveCells`, `roof.gableCells`, `openings.reserved`. Priorität `DECOR` bzw. `STRUCTURE` für Konsolen.
- **Stildaten:** In `styles.ts` kommt `details.vocabulary: { technique: 'C1'|'E1'|…, weight }[]` dazu. Detailgrad 1 wählt 0–1, Detailgrad 2 wählt 2, Detailgrad 3 wählt 3 Techniken, deterministisch über `rng.fork('details')`, **einmal je Bau**.
- **Akzeptanz:**
  - Test über alle Stile × Größen × Themen: 0 Validator-Reparaturen.
  - ≤ 3 Techniktypen je Bau.
  - Jede Technik erscheint auf allen freien Fassaden des Hauptkörpers.
  - Gleicher Seed ergibt gleichen Hash.

**P2 – Traufkonsolen und Jetty-Konsolen im Ständerraster** (Regel, C1)
- **Was:** Für jede `eaveCell`, deren Spalte auf einem Ständer liegt, eine Konsole nach Gewichtsklasse des Stils (leicht, mittel, schwer). In `walls.ts:186` ersetzt die Ständerregel `(u + 1) % 2`. Eckkonsolen kommen über den Auflöser.
- **Akzeptanz:**
  - Bei gerahmten Fassaden mit Überstand ≥ 1 steht unter jedem Ständer der obersten Balkenlage genau eine Konsole.
  - Keine Konsole in Tür-Freiräumen.
  - Die Girlande der Festschicht bleibt durchgehend, mit Lücken nur an Konsolen.

**P3 – Firstzier an Giebeln und Turmspitzen** (Daten, F4/G6)
- **Was:** Neue Stilangabe `finial: 'rod'|'fence_rod'|'wall'|'end_rod'|'dragon_head'|'none'`. Die Dach-Engine meldet die Firstendzellen der Giebel (aus `gableCells` und `ridgeY`). `roundTower.ts:195` liest dieselbe Angabe.
- **Akzeptanz:**
  - Jede sichtbare Giebelspitze trägt genau eine Zier, höchstens 2 Blöcke über dem First.
  - Bei Schnee-Option nie `end_rod`.
  - Ohne Zier (`none`) bleibt der Hash unverändert.

**P4 – Rolle `hardware` für Metall** (Daten)
- **Was:** Neue Paletten-Rolle mit den Formen `bars`, `chain`, `button`, `trapdoor`, `lantern`. Materialien: `iron`, `waxed_copper`, `dark_wood`, `bamboo`.
- **Ersetzen:** die festen IDs in `windows.ts:421`, `windows.ts:504`, `balcony.ts:28`, `doors.ts:109` und `festive.ts:81`. Rückfall auf `accent`.
- **Akzeptanz:**
  - Lint: Japanisch und Kirsche enthalten kein `iron_bars`.
  - Fantasy erzeugt mit `waxed_copper` nur gewachste IDs.
  - Paletten-Lints (ΔL) bleiben grün.

**P5 – Fensterzusätze als Vorlagendaten** (Daten, A1/A2/A3/G9)
- **Was:** Optionale Modifikatoren je Fenstervorlage: `apron` (Brüstungsfeld, 1–2 Reihen bis zur Geschosslinie), `boardFrame` (Laibungsbretter statt Läden), `thinSill` (liegende Falltür statt Treppe), `shutterDogs` (Haken, n.i.R.). Umsetzung als Zellen in `templates/windows.ts`, gewählt über das Stilvokabular. `spacing` wird angepasst (boardFrame 2, shutterDogs 3).
- **Akzeptanz:**
  - `templateFits` lehnt Überlappungen ab.
  - Fensterachsen bleiben je Geschoss bündig.
  - Brüstungsfelder enden mindestens 1 Reihe über Balken oder Sockel.

**P6 – Mauerwerksdetails** (Regel, E1/E2/E5/B1)
- **Was:** Für Geschosse ohne Rahmenebene (`timber === 'none'` bzw. Steinerdgeschoss):
  - Zahnschnitt (E1) unter der Traufe bei mdt und fan;
  - Konsolfries (E2) als Geschossband;
  - Eckquader (E5) als Texturregel in `texturing.ts`;
  - Maueranker (B1) bei Detailgrad 3 an den Balkenlagen. Dafür kommt `polished_blackstone_button` in die Registry.
- **Akzeptanz:**
  - Zahnschnitt ohne zwei benachbarte Treppen.
  - Ecken mit Vollblock.
  - Anker nur auf Geschosslinien, Abstand 3–5, spiegelsymmetrisch.

**P7 – Pfosten, Geländer und Veranda** (Regel, D1/C5/E4/A5/A8)
- **Was:**
  - `buildPorch` (`components.ts:112–127`): Stützen mit Mauerfuß und Sattelholz statt gestapelter Zäune.
  - `balcony.ts`: Eck- und Zwischenpfosten alle 3–4 mit Kappe und Laterne oder Topf, optional Handlauf bzw. Brettbrüstung (A8) je Stil.
  - Konsolen unter dem Balkon unter den Pfosten.
- **Akzeptanz:**
  - Kein Geländerabschnitt länger als 4 ohne Pfosten.
  - Laternen nur auf Pfosten mit tragender Mitte, 0 Reparaturen.

**P8 – Giebel- und Sockeldetails** (Regel, A6/A7/C2/G4/E3/F3)
- **Was:**
  - Giebel ohne Fenster bekommen je Stil eins: Lüftung oder Fassboden auf der Achse, Windbrett am Ortgang (nor, rus, med), Deckleisten (nor, rus).
  - Sockel mit P ≥ 3 bekommt ein Sockelgesims.
  - Kellerfenster nur bei Detailgrad 3, je Fassade höchstens 2, auf Fensterachsen.
- **Akzeptanz:**
  - Kein Giebel mit mehr als 25 Füllzellen bleibt ohne Achsdetail. Die Zahl 25 ist eine Einschätzung.
  - Windbrett exakt deckungsgleich mit der Ortganglinie.

**P9 – Registry-Ergänzungen** (Daten)
- **Was:** In `families.ts` und `shapes.ts` mit Halt-Regeln im Validator ergänzen:
  - `polished_blackstone_button`, `lever`, `tripwire_hook`, `bell`, `grindstone` (frei), `anvil` (Schwerkraft);
  - `decorated_pot`, Köpfe (`dragon_head`, `skeleton_skull` + Wandformen);
  - einfarbige Banner (+ Wandform), Hängeschilder;
  - `waxed_copper_lantern`, `waxed_copper_chain`, `waxed_copper_bars` (je 4 Stufen);
  - `wall_torch`, `glow_lichen`, `pale_hanging_moss`, `hanging_roots`, fehlende `potted_*`.

  Block-Entities ohne Inhalt prüft der `.schem`-Exporttest mit dem EngineHub-Reader.
- **Akzeptanz:**
  - Registry-Test gegen minecraft-data für 1.21.11 und 1.21.1; Kupferketten, -gitter und -laternen nur in 1.21.11.
  - Formtest gegen die Client-Modelle.
  - Export und Rücklesen bitgleich.

**P10 – Dichte-Lint** (Regel, `analysis/buildingLints.ts`)
- **Was:** Neue Prüfungen:
  - Anteil Schicht-3-Blöcke je Fassade, mit den Formklassen Knopf, Zaun, Mauer, Falltür, Kette, Gitter, Stab, Topf, Kerze, Laterne;
  - Anzahl Techniktypen je Bau;
  - Knotenbindung: Abstand jedes Schicht-3-Blocks zu Ständer, Balkenlage, Öffnung, Ecke oder Traufe.
- **Akzeptanz:**
  - Detailgrad 2: 3–8 %, Detailgrad 3: 6–12 %, nie über 15 %.
  - ≥ 90 % knotengebunden.
  - Der Lint läuft im bestehenden Stil-, Größen- und Thementest.

**P11 – Festschicht feiner** (Regel, Überschneidung mit dem Thema Weihnachten)
- **Was:** Schleifen als rote Wandbanner (n.i.R.) oder rote Kerzen auf Konsolen statt `red_wool`-Würfeln (`festive.ts:80`). Girlanden zwischen den Konsolen aus P2, durchhängend.
- **Akzeptanz:** keine vollen Wollwürfel in Girlanden; 0 Reparaturen.

**P12 – Lochanteil der Falltür-Texturen messen** (Daten)
- **Was:** `tests/integration/deriveTextureStats.test.ts` berechnet für jede `*_trapdoor` den Alpha-Anteil der Textur und schreibt ein Feld `holes` nach `style/textureStats.ts`. `materials.ts` nutzt die Klassen geschlossen (Paneel, Laden, Kassette) bzw. gelocht (Gitter, Lüftung, Koshi).
- **Akzeptanz:**
  - Feld vorhanden.
  - Paneeltechniken (A1, A2, A4, A7, A8) wählen nur geschlossene Falltüren.
  - A6 wählt nur gelochte.

---

## Quellen

1. misode/mcmeta, Zweig 1.21.11-summary, blocks/data.json – <https://raw.githubusercontent.com/misode/mcmeta/1.21.11-summary/blocks/data.json> – vollständige Blockzustände 1.21.11. Für diese Notiz heruntergeladen und abgefragt: Knöpfe, Hebel, Haken, Glocke, Köpfe, Kupferfamilien, Regale, `potted_*`.
2. minecraft.wiki: Button – <https://minecraft.wiki/w/Button> – Zustände `face`, `facing`, `powered`; haftet an Flächen voller Blöcke, fällt ohne Halt ab.
3. minecraft.wiki: Lever – <https://minecraft.wiki/w/Lever> – haftet an vollen Flächen oder auf Kopfüber-Stufen und -Treppen; fällt ohne Halt ab.
4. minecraft.wiki: Tripwire Hook – <https://minecraft.wiki/w/Tripwire_Hook> – `facing` = Richtung, in die der Haken ragt; fällt ohne Halt ab.
5. minecraft.wiki: Bell – <https://minecraft.wiki/w/Bell> – `attachment`-Werte; Block-Entity; haftet seit 20w22a an nicht vollen Unterseiten und an Falltüren.
6. minecraft.wiki: Grindstone – <https://minecraft.wiki/w/Grindstone> – „In Java Edition, it doesn't need a supporting block“; `face` und `facing`.
7. minecraft.wiki: Pointed Dripstone – <https://minecraft.wiki/w/Pointed_Dripstone> – hängt unter einem Block; ohne Halt fällt alles darunter ab; `thickness`-Folge.
8. minecraft.wiki: Scaffolding – <https://minecraft.wiki/w/Scaffolding> – `distance` 0–7, ab 7 fallender Block; höchstens 6 von der Stütze.
9. minecraft.wiki: Head – <https://minecraft.wiki/w/Head> – 16 Richtungen stehend, 4 an der Wand; Kopftypen; `player_head` ohne NBT zeigt Steve.
10. minecraft.wiki: Copper Bulb – <https://minecraft.wiki/w/Copper_Bulb> – Licht 15/12/8/4; schaltet bei Impuls um, braucht keinen Dauerstrom; nicht transparent.
11. minecraft.wiki: Copper Grate – <https://minecraft.wiki/w/Copper_Grate> – durchsichtig, wasserloggbar, kein Mob-Spawn.
12. minecraft.wiki: Decorated Pot – <https://minecraft.wiki/w/Decorated_Pot> – Zustände; Scherben als Block-Entity-Daten, ohne sie schlichtes Ziegelmuster.
13. minecraft.wiki: Lightning Rod – <https://minecraft.wiki/w/Lightning_Rod> – braucht keine Erdung; ungewachst vier Oxidationsstufen; `facing` sechsfach.
14. minecraft.wiki: Trapdoor – <https://minecraft.wiki/w/Trapdoor> – 3/16 Block dick; Laternen auf `half=top` bzw. unter `half=bottom`; offen nicht tragfähig.
15. minecraft.wiki: Fence – <https://minecraft.wiki/w/Fence> – verbindet sich mit festen Blöcken und Zäunen; Holz nicht mit Netherziegel.
16. minecraft.wiki: Wall – <https://minecraft.wiki/w/Wall> – Pfostenregeln (zwei gegenüberliegende oder vier Seiten ohne Pfosten); verbindet sich mit Gittern und Scheiben, nicht mit Zäunen.
17. minecraft.wiki: Snow – <https://minecraft.wiki/w/Snow> – „Snow melts if there is a heat block or block light level of 12 or more“; Auflageregeln.
18. minecraft.wiki: Iron Chain – <https://minecraft.wiki/w/Iron_Chain> – drei Achsen; Laternen und Hängeschilder an Ketten.
19. minecraft.wiki: Hanging Sign – <https://minecraft.wiki/w/Hanging_Sign> – unter breitem Block parallele Ketten, unter schmalem „up-arrow shape“; Bedeutung von `attached`.
20. minecraft.wiki: Flower Pot – <https://minecraft.wiki/w/Flower_Pot> – „can be placed on any block or over air“ (Java); 3/8 Block hoch.
21. minecraft.wiki: End Rod – <https://minecraft.wiki/w/End_Rod> – Licht 14; schmilzt Schnee und Eis im 2er-Radius; fällt nicht ab, wenn der Halt verschwindet.
22. minecraft.wiki: Candle – <https://minecraft.wiki/w/Candle> – Licht 3/6/9/12; nicht auf nicht festen Blöcken.
23. minecraft.wiki: Lantern – <https://minecraft.wiki/w/Lantern> – nahtloser Anschluss an Ketten; bricht bei Block-Update auf ungültiger Fläche.
24. minecraft.wiki: Pale Hanging Moss – <https://minecraft.wiki/w/Pale_Hanging_Moss> – hängender Strang, `tip` am untersten Block.
25. minecraft.wiki: Banner – <https://minecraft.wiki/w/Banner> – Wandbanner fallen ohne Halt; `rotation` 0 = Süden; schlichte Banner einfarbig.
26. minecraft.wiki: Chiseled Bookshelf – <https://minecraft.wiki/w/Chiseled_Bookshelf> – `slot_N_occupied` steuert die Textur; Bücher im Block-Entity.
27. minecraft.wiki: Shelf – <https://minecraft.wiki/w/Shelf> – Block-Entity mit 3 Plätzen; zeigt Gegenstände.
28. minecraft.wiki: Anvil – <https://minecraft.wiki/w/Anvil> – fällt ohne Stütze; drei Schadensstufen.
29. minecraft.wiki: Tutorial:Walls and buttresses – <https://minecraft.wiki/w/Tutorial:Walls_and_buttresses> – Wandstile „3D texture“, „Separator“, „Flourish“; „choose 1−4 possibilities and use those consistently“.
30. minecraft.wiki: Tutorial:Furniture – <https://minecraft.wiki/w/Tutorial:Furniture> – Hebel und Haken als Wasserhahn; Zaun, Mauer oder Endstab als Lampenfuß.
31. minecraft.wiki: Tutorial:Adding beauty to constructions – <https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions> – Läden aus Holzblöcken oder Falltüren an 1×2-Fenstern.
32. minecraft.wiki: Tutorial:Trapdoor uses – <https://minecraft.wiki/w/Tutorial:Trapdoor_uses> – Falltüren als Verkleidung („panelling“), Pflanzkästen, Bardoor.
33. minecraft.wiki: Tutorial:Color palette – <https://minecraft.wiki/w/Tutorial:Color_palette> – ähnliche Blöcke sind aus der Entfernung schwer zu unterscheiden.
34. Minecraft Forum: „Depth in building – a simple way to improve all“ – <https://www.minecraftforum.net/forums/minecraft-java-edition/creative-mode/369294-depth-in-building-a-simple-way-to-improve-all> – Originaltext der Drei-Schichten-Regel. Die alte Notiz kannte sie nur aus einem Snippet.
35. Craftdex: The Architecture of Builds – <https://craftdex.net/articles/the-architecture-of-builds> – Pfeiler 1 Block vor; Treppe/Stufe 0,5; Falltür/Mauer < 0,5 („lip“); Scheibe 7 px zurück; 3–4 Kernmaterialien.
36. Craftdex: Walls and the Cobblestone Wall Family – <https://craftdex.net/articles/walls-and-the-cobblestone-wall-family> – Pfostenlogik als Gestaltungsmittel („A standalone wall is a post“).
37. Craftdex: Iron Bars and Glass Panes – <https://craftdex.net/articles/iron-bars-and-glass-panes> – Eisengitter statt Zaun, wenn nicht rustikal; starke Gefängnis-Codierung.
38. Craftdex: Chiseled Blocks, the Decoration Family – <https://craftdex.net/articles/chiseled-blocks-the-decoration-family> – ein Zierblock auf 3–5 normale, an Fokuspunkten; wirkt auf Augenhöhe am besten.
39. Craftdex: Light as a Build Tool – <https://craftdex.net/articles/light-as-a-build-tool> – Lichtwahl nach Stimmung. Die Behauptung „End Rods … don't … melt snow“ widerspricht [21].
40. Craftdex: Copper Is Finally a Real Block – <https://craftdex.net/articles/copper-is-finally-a-real-block> – Kupfergitter als Lüftung; Leuchten wachsen, damit sie hell bleiben.
41. Gamer Empire: Minecraft Lamp Post Design Ideas – <https://gamerempire.net/minecraft-lamp-post-design-ideas/> – 16 Laternenpfosten mit Materiallisten: Mauer + Zaun + Falltür, Knöpfe, Schleifsteine, Amboss, Hebel, Ketten.
42. Gamertag Mythras: Minecraft Building Tips – <https://gamertagmythras.com/blog/minecraft/minecraft-building-tips> – „A handful of texture blocks … reads as detail; an even 50/50 mix … a mess“; Falltüren als Läden, Markisen, Paneele.
43. Minecraft Gradient Blog: Color Palette Guide – <https://minecraftgradient.blog/minecraft-color-palette> – 60/30/10; Akzente „where the eye should stop“; ein führender Akzent.
44. Sereyka Builds: Minecraft House Ideas – <https://sereyka.com/minecraft-house-ideas> – „Lanterns by the door and under the eaves“; Fenster 1 tiefer, Simse aus Treppen und Falltüren; Sockel mit Stufen.
45. NameHero: Minecraft Window Designs – <https://www.namehero.com/gaming-blog/minecraft-window-designs-the-complete-guide/> – Fenster aus Platten, Falltüren, Fässern, Bücherregalen und Eisengittern.
46. The Spike: Brick and Spruce House – <https://www.thespike.gg/minecraft/house-ideas/minecraft-brick-and-spruce-house> – Fichten- und Eichenfalltüren an Fenstern, Steinknöpfe als Textur, normale und kopfüber gesetzte Treppen.
47. ByPixelbot: Minecraft Christmas Houses – <https://www.bypixelbot.com/blog/minecraft-christmas-house> – Laternen, Kerzen, Fichtenlaub, rote Banner; Item Frames und Köpfe (für uns tabu).
48. The Brick Blogger: LEGO Building Technique – Greebling – <https://thebrickblogger.com/2015/07/lego-building-technique-greebling> – Greebles sollen funktional wirken; Zurückhaltung; nicht „tacked on“.
49. Salge, Green, Canaan, Togelius (2018): Generative Design in Minecraft (GDMC) – <https://arxiv.org/abs/1803.09853> – Ziel: funktionale, ästhetische und glaubwürdige Siedlungen.
50. GDMC Wiki: Evaluation – <https://gendesignmc.wikidot.com/wiki:evaluation> – Ästhetik heißt Konsistenz, angemessene Variation und keine „jarring, strange artefacts“; Narrativ heißt sichtbare Funktion und Baugeschichte.
51. Hervé, Salge (2021): Comparing PCG metrics with Human Evaluation in Minecraft Settlement Generation – <https://arxiv.org/abs/2107.02457> – gezählte Elemente und Blockvielfalt korrelieren mit menschlichem Urteil.
52. Wikipedia: Dentil – <https://en.wikipedia.org/wiki/Dentil> – Vorsprung = Breite, Lücke = halbe Breite; im Bettgesims unter dem Kranzgesims.
53. Wikipedia (de): Zahnschnitt – <https://de.wikipedia.org/wiki/Zahnschnitt> – unter Traufen und in Giebeldreiecken; Sägezahnfries im Backsteinbau.
54. Wikipedia: Quoin – <https://en.wikipedia.org/wiki/Quoin> – Eckquader, Wechsel lang und kurz; „imply strength, permanence, and expense“.
55. Wikipedia: Finial – <https://en.wikipedia.org/wiki/Finial> – Bekrönung von Kuppeln, Türmen, Dächern und Giebeln.
56. Wikipedia (de): Maueranker – <https://de.wikipedia.org/wiki/Maueranker> – auf Höhe der Holzbalkendecken; Splint, Kreuz, Buchstaben, Jahreszahlen.
57. Wikipedia (de): Fensterladen – <https://de.wikipedia.org/wiki/Fensterladen> – Bauarten, Anbringung über Kloben, Zierläden.
58. Wikipedia (de): Knagge – <https://de.wikipedia.org/wiki/Knagge> – Winkelholz unter vorkragenden Balkenköpfen, dreieckig, oft profiliert und beschnitzt.
59. Wikipedia: Corbel – <https://en.wikipedia.org/wiki/Corbel> – Konsolen unter Balkonen, Erkern, Brüstungen und Pechnasen; „corbel table“.
60. Wikipedia: Machicolation – <https://en.wikipedia.org/wiki/Machicolation> – Öffnung zwischen den Konsolen einer Brustwehr.
61. Wikipedia: Bargeboard – <https://en.wikipedia.org/wiki/Bargeboard> – Windbrett am Giebelüberstand; geschnitzt oder bemalt (de: Windbrett, Giebelbrett).
62. Wikipedia: Rain gutter – <https://en.wikipedia.org/wiki/Rain_gutter> – Rinnen an der Traufe, Fallrohre an den Ecken.
63. Wikipedia: Rain chain – <https://en.wikipedia.org/wiki/Rain_chain> – kusari-doi, vor allem dekorativ; auch in nordischer und moderner Bauweise.
64. Wikipedia: Window box – <https://en.wikipedia.org/wiki/Window_box> – Blumenkasten auf oder unter der Fensterbank, meist auf Konsolen.
65. Wikipedia: Machiya – <https://en.wikipedia.org/wiki/Machiya> – kōshi-Gitter (Muster nach Gewerbe), degōshi, mushiko-mado im Obergeschoss.
66. Wikipedia (ja): 犬矢来 (Inuyarai) – <https://ja.wikipedia.org/wiki/犬矢来> – gebogener Bambusschutz am Sockel von Stadthäusern zur Straße.
67. Wikipedia: Dragestil – <https://en.wikipedia.org/wiki/Dragestil> – Drachenköpfe, steile Dächer, große Traufen, geteertes Holz.
68. Wikipedia: Chalet – <https://en.wikipedia.org/wiki/Chalet> – breite, gut gestützte Traufen (Hintergrund für Knaggen an großen Überständen).
69. Sportskeeda: 5 best ways to use spruce trapdoors (nur als Such-Snippet gesehen, die Seite lieferte HTTP 405) – <https://sportskeeda.com/minecraft/5-best-ways-use-spruce-trapdoors-minecraft-1-18-update> – Fichtenfalltür „has no transparent sections“, dünner als Stufen, gut für Detailarbeit.

Zusätzlich im Repo geprüft: `src/core/blocks/shapes.ts` (Pixelmaße), `validator.ts` (Halt- und Lichtregeln), `families.ts` (Registry), `templates/*.ts`, `generator/house/*.ts`, `generator/festive.ts`, `roof/roofEngine.ts`, alte Notizen `fenster_tueren_details.md` und `waende_struktur.md`.
