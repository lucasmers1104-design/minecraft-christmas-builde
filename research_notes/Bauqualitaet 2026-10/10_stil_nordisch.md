# Stilbibel Nordisch, Skandinavisch und Wikinger (Stil-ID `nordic`)

Stand 2026-10-23. Thema: wie nordische Holzarchitektur (Langhaus, Blockbau, Stabkirche, Falu-Rot-Haus, Grasdach, Stabbur, Fischerhütte, Chalet-Nähe) in Vanilla-Blöcken aussieht und wie der Generator sie als Daten und Regeln baut.

Abgrenzung: Paletten-Grundlagen stehen in `paletten.md`. Schneephysik und Schmelzradien stehen in `winter_weihnachten_landschaft.md`. Beides wird hier angewendet, nicht wiederholt. Dach-Engine allgemein und Proportionsregeln (`19_proportionen_komposition.md`) sowie der Stil `rustic` sind eigene Themen.

Skizzen: x nach rechts aus Betrachtersicht, y nach oben, d = Tiefe zur Wandebene (−1 innen, 0 Wand, +1/+2 davor). „.“ = Luft. Bei Treppen liegt die hohe Seite auf der `facing`-Seite; `half=top` = kopfüber.

---

## Kurzfassung

Sortiert nach Wirkung:

1. **`nordic` baut heute genau einen Typ: ein braunes Langhaus.** Beide Paletten sind Braun auf Braun (palettes.ts:257–299). Ob jemand „schwedisch“ oder „norwegisch“ schreibt, ändert nichts. Der Stil braucht **Untervarianten als Daten**, jede mit eigener Palette, Wandtechnik, eigenem Dach und eigenen Proportionen.
2. **Die Blockbau-Wand fehlt.** Gemeint sind liegende Stämme mit abwechselnd vorstehenden Ecken (*laft*); das ist das stärkste Erkennungszeichen [38][39]. In Grabcraft-Wikingerbauten liegen 52–56 % der Stämme [7][8][10]. Der Generator setzt Wand-Stämme immer mit `axis=y` (texturing.ts:50, walls.ts:152). Das ergibt eine Palisade.
3. **Falu-Rot geht aus Vanilla-Blöcken.** Falu-Rot #801818 [23] liegt bei L\* ≈ 28, C ≈ 52, H ≈ 33° (eigene Umrechnung). Am nächsten mit Holzmaserung und vollem Formsatz kommt `mangrove_planks` (L\* 31, H 31°); `red_terracotta` (L\* 37) ist die matte Alternative. Dazu gehören weiße Ecken und Fenster [24]. Dafür eignet sich `pale_oak` (L\* 88–95), das aber im Materialkatalog fehlt (materials.ts:41–53).
4. **Grasdächer sind flach (22–33°), nicht steil [34].** Im Spiel heißt das: Stufen 1:2 aus `grass_block` mit Traufstamm (*torvvol*) und Windbrett. Das ist zugleich die **beste Winterlösung**, weil Schnee nur auf Vollblöcken hält [13].
5. **Gekreuzte Windbretter über dem First** (Hörner, „Pferdeköpfe“ [51]) kosten 2–6 Treppen je Giebel und machen jedes Haus nordisch. Drachenköpfe gehören nur an Halle und Stabkirche (Borgund hat vier, an vier Giebeln [31]).
6. **Die Dach-Engine verbiegt nordische Dächer.** `capRise` (Anstieg ≤ 7) flacht steile Profile vom First her ab (profiles.ts:69–96). Bei großer Spannweite entsteht eine Tonne. Mit 2–3 Blöcken Überstand bei 45° reicht die Traufe dann fast auf den Boden (Screenshot „groß“).
7. **Ein Sockel aus 2–3 Lagen mit Treppenschürze wirkt wie eine Festung.** Nordisch ist ein Trockensteinsockel aus 1 Lage [29], beim Stabbur Stelzen von 1–1,5 m [35].
8. **Das volle Ständerraster in d=+1 (walls.ts:166) sieht nach Fachwerk aus.** Laft hat keine Pfosten. Falu hat nur Eckbretter. Eine Stabwand hat Eckstäbe, Schwelle und Rähm.
9. **Winter scheitert bei Treppendächern:** Schnee liegt nur auf dem Firstbalken (Screenshot „winter-schnee“). Lösungen: echte Schneeschichten auf Grasdach und Vollblockkanten, optional eine Schneedecke aus `smooth_quartz_stairs` (Einschätzung).
10. **Der Außenkamin am Giebel ist unnordisch.** Ein Langhaus hat ein Rauchloch, keinen Kamin [44][45]. Wohnhäuser führen den Kamin durch den First.
11. **Die Umgebung trägt den Stil:** Birken, Fichten, Holzstapel unter der Traufe und ein Rundholzzaun (*gärdsgård*) [50] statt einer Laubhecke. `birch` ist im Stil verboten (styles.ts:167) und damit genau das typischste Begleitholz.
12. **Nordische Weihnacht heißt Stroh, Rot und Kerzen.** Dazu gehören ein Julenek (Garbe auf einer Stange) [56], ein Julbock aus Stroh mit roten Bändern [53], Fichtenzweige an der Tür [55] sowie Kerzen und Sterne im Fenster [54]. Keine bunten Wollwürfel.
13. **Fenster sind klein und weiß gefasst, Klappläden kommen selten vor** (Einschätzung, Läden wirken alpin). Langhaus und Stabbur sind fast fensterlos [37][44].
14. **Der Parser leitet Nordisches um.** „Blockhaus“ geht nach rustic, „Chalet“ wird `flared` (parseDescription.ts:1388–1389). Ein Chalet hat aber ein flaches Dach mit breiter Traufe [42]. Die Wörter Grasdach, Stabkirche, Falu, Stabbur und Rorbu kennt er nicht.

---

## Schwächen des aktuellen Generators

**Screenshots** (`docs/screenshots/haus-nordisch-*.jpg`):
- *gross-ohne-thema*: Das Dach reicht auf beiden Langseiten bis zum Sockel; Wände sind nicht zu sehen. Die Dachfläche hat ein Material und keinen Verlauf. Das Profil ist unten steil und oben flach, eine Tonne. Am Giebel sitzen dunkle Bretter mit Fichtenpfosten im Raster, ein Steinkamin steht mittig davor. Kein sichtbares Fenster, keine Giebelzier, Sockel 2–3 Lagen mit Schürze.
- *weihnachten*: Ein Vordach (T06) am Giebel. Im Hof dominieren volle Wollwürfel in Rot, Gelb, Blau und Grün. Das ist ein Thema der Festschicht, aber hier besonders stilfremd.
- *winter-schnee*: Weiß sind nur First und Boden. Das Treppendach bleibt braun.

**Code:**

| Datei:Zeile | Befund | Folge |
|---|---|---|
| styles.ts:142–168 | Ein Stil = Archetyp „Langhaus/Halle“, keine Untervarianten | Alle nordischen Wünsche ergeben dasselbe Haus |
| styles.ts:153 | `steep 0.55, flared 0.15`; kein Grasdachprofil. „Flared“ hat keinen nordischen Beleg | Falsche Profile |
| styles.ts:156–157 | `overhang [2,3]`, `plinth [2,3]` | Traufe am Boden, Festungssockel |
| styles.ts:166–167 | `shutters 0.5`, `chimney 0.5`, `forbidden … 'birch'` | Alpine Läden, Außenkamin, keine Birke |
| palettes.ts:257–299 | Wand = Obergeschoss = Füllung = ein Holz. Kein Falu-Rot, kein Weiß, Akzent `red_wool` | Monotones Braun, Wolle wirkt wie Plastik |
| materials.ts:41–53 | `pale_oak` fehlt, obwohl die Registry es für 1.21.11 hat (families.ts:56) | Kein weißes Holz |
| texturing.ts:50, walls.ts:152 | Wandblock = `forms.block` ohne Achse | Kein Blockbau (betrifft auch `rustic_logs`, palettes.ts:233) |
| walls.ts:166 | Bei `timber: 'none'` wird `postSet` das **volle** Raster | Wirkt wie Fachwerk oder Ständerbau |
| roofEngine.ts:248–256 | Trauf- und Ortgangkante = `full(m.trim)` ohne Achse | Kein liegender Traufstamm |
| roofEngine.ts | Keine Zier über dem First | Wichtigstes Signaturdetail fehlt |
| profiles.ts:69–103 | `capRise` 7; `maxRiseBlocks` existiert, ist aber nicht stilabhängig | Tonnendach; Stabkirche nicht steil möglich |
| buildHouse.ts:125–132 | Satteldach bekommt einen Außenkamin am Giebel (components.ts:149) | Unnordisch, beim Langhaus falsch |
| landscape.ts:47, 108 | Farn, Gras, Hecke aus Fichtenlaub; keine Bäume, kein Holzstapel, kein Zaun | Das Grundstück erzählt nichts |
| festive.ts:80 | Girlandenlicht `glowstone` oder `ochre_froglight` | Für nordisch zu „elektrisch“ (Einschätzung) |
| windows.ts:106–110, doors.ts:22–27 | W02/W03/W04/W06, T01/T06 | Mittelalterliche Fenster; kein Futter, kein Windfang |

Gut ist schon: Firststamm (plan.ts:203), Walmdach erst ab Spannweite > 13 (plan.ts:186, passt zum schmalen Langhaus), Weg-Mix (landscape.ts:36), `symmetric: true`.

---

## Techniken und Regeln

### T1 Blockbau-Wand mit Vorstoß-Ecken (*laft*)

Die Wand besteht aus liegenden Stämmen, eine Lage je Block. An der Ecke kreuzen sich beide Wände und stehen abwechselnd 1 Block über: in geraden Lagen die Nord-/Südwand, in ungeraden die Ost-/Westwand [38][39]. Die Stirnseiten zeigen Jahresringe, das ist der Effekt. An Fenster- und Türlaibungen steht ein senkrechter Stamm (wie W03).

Blöcke: `stripped_spruce_log[axis=x]` (Nord/Süd), `[axis=z]` (Ost/West). Dunkle Variante: `spruce_log`.

```
Draufsicht Nordwestecke (Zeilen = z nach Süden)
gerade Lage (y=2,4,…)            ungerade Lage (y=1,3,…)
      x=-1  0  1  2  3                 x=-1  0  1  2  3
z=-1    .   .  .  .  .           z=-1    .   Z  .  .  .
z= 0    X   X  X  X  X           z= 0    .   Z  X  X  X
z= 1    .   Z  .  .  .           z= 1    .   Z  .  .  .
X = stripped_spruce_log[axis=x]  Z = stripped_spruce_log[axis=z]

Ansicht Nord, dieselbe Ecke (Klammer = d=+1, Stirnholz)
        x=-1   0    1  2  3
y=4      X     X    X  X  X
y=3      .    (E)   X  X  X      E = Stirnseite von Z
y=2      X     X    X  X  X
y=1      .    (E)   X  X  X
y=0      P     P    P  P  P      P = Sockel, 1 Lage Trockenstein
```

**Einsatz:** Blockhaus, Stabbur, Naust; alle Größen. **Wirkung** hoch · **Aufwand** mittel · **Stile** nordic, rustic, medieval (Scheunen) · **Quellen** [38], [39], [5]–[10].

### T2 Innenwand-Köpfe (Klingschrot) als Tiefenrhythmus

Wo eine Innenwand auf die Außenwand trifft, sieht man außen eine senkrechte Reihe Balkenköpfe [38]. Das ist der authentische Ersatz für Ständer und erfüllt die Regel „keine flache Wand > 5“. Regel: Bei Langwänden > 7 kommt alle 5–6 Spalten eine Kopfreihe, symmetrisch zur Tür und nie in einer Fensterachse. Köpfe stehen nur in ungeraden Lagen.

```
Ansicht Nord, Wandmitte
      x= 3  4  5  6  7
y=4      X  X  X  X  X
y=3      X  X (E) X  X      E = stripped_spruce_log[axis=z], d=+1
y=2      X  X  X  X  X
y=1      X  X (E) X  X
```

**Wirkung** hoch · **Aufwand** niedrig · **Stile** nordic, rustic · **Quellen** [38]; Abstand = Einschätzung.

### T3 Falu-Rot-Schalung mit weißen Kanten

Die Schalung ist rot, Ecken, Fenster, Traufbrett und Windbretter weiß; „the white corners … set off the colour … windows also typically trimmed in white“ [24]. Der Anstrich ist matt, der Ton reicht „von fast schwarz bis hellrot“ [23].

**Blöcke.** Wand `mangrove_planks` (L\* 31,2, C 32, H 31°; Kartenfarbe COLOR_RED [20]) oder `red_terracotta` (36,7/42/37°). Für eine stehende Schalung `stripped_mangrove_log[axis=y]` (Einschätzung). Weiß aus der pale_oak-Familie: `stripped_pale_oak_log` (94,7), `pale_oak_planks` (87,6), `pale_oak_trapdoor`, `_slab`, `_stairs`, `_fence`. Für 1.21.1 nur `birch_planks` bzw. `smooth_quartz_slab` und `smooth_quartz_stairs`.
**Nicht verwenden:** `red_concrete` (glatt), `red_wool`, `red_nether_bricks` (L\* 12) und `crimson_planks` (violett) (Einschätzung nach textureStats.ts).

```
Ansicht Süd, Ecke mit Fenster W19 (Großbuchstaben d=0, Kleinbuchstaben d=+1)
x:   -1  0  1  2  3  4
y=5   e  e  e  e  e  e     e = stripped_pale_oak_log[axis=x] (Traufbrett)
y=4   c  M  s  s  s  M     s = pale_oak_slab[type=top] (Verdachung)
y=3   c  M  f  G  f  M     f = pale_oak_trapdoor[facing=south,open=true] (Futter, Platte an der Wand)
y=2   c  M  f  G  f  M     G = glass_pane, M = mangrove_planks
y=1   c  M  M  i  M  M     i = pale_oak_stairs[facing=north,half=top] (Sohlbank)
y=0   P  P  P  P  P  P     c = stripped_pale_oak_log[axis=y] (Eckbrett), P = cobblestone/andesite
```

**Einsatz:** Falu-Haus, Rorbu, Scheune. Ockervariante mit `oak_planks` (Einschätzung). **Wirkung** hoch · **Aufwand** niedrig · **Stile** nordic, rustic (Hof) · **Quellen** [20], [21], [23]–[25].

### T4 Stabwand mit Schwelle und Rähm

Stabkirchen stehen auf „four heavy sill beams on a low foundation of stones“ [29], ihr Holz ist geteert [31].

```
Ansicht Süd (Großbuchstaben d=0, Kleinbuchstaben d=+1)
x:  -1  0  1  2  3  4  5  6
y=5  b  b  b  b  b  b  b  b     b = dark_oak_log[axis=x] (Rähm)
y=2-4 p V  V  V  V  V  V  p     V = dark_oak_planks, p = dark_oak_log[axis=y] (Eckstab)
y=1  q  S  S  S  S  S  S  q     S = dark_oak_log[axis=x] (Schwelle), q = dark_oak_stairs[facing=north,half=bottom] (Wasserschlag)
y=0  P  P  P  P  P  P  P  P     P = cobblestone
```

**Wirkung** mittel · **Aufwand** niedrig (Rahmen-Modus „Ecken“ + Schwellenzeile) · **Quellen** [29]–[31].

### T5 Grasdach (*torvtak*) im Profil 1:2

Die Neigung beträgt an der Westküste etwa 33°, bei Åsdächern 27°, im Osten 22° [34]. Der Aufbau: Bretter, 4–16 Lagen Birkenrinde, etwa 15 cm Torf. Die Traufe hält ein Stamm von 10–15 cm (*torvvol*); Windbretter kamen später dazu [33][34]. 1:2 (26,6°) liegt genau in dieser Spanne. Es braucht Vollblöcke, denn einen Gras-Halbblock gibt es nicht. Ein Teppich auf einer unteren Stufe säße im Block darüber und schwebte 0,5 [15].

- Decke: `grass_block` 70 %, `moss_block` 20 %, `rooted_dirt` oder `coarse_dirt` 10 % (nur in Flecken). Gras stirbt nur unter opaken Blöcken [14], auf dem Dach bleibt es also stabil.
- Bewuchs auf freien Oberseiten: `short_grass` 25 %, `fern` 10 %, Blumen 3–5 % (`dandelion`, `oxeye_daisy`). `moss_carpet` nur auf Vollblöcken.
- Traufreihe: `spruce_log` mit Achse parallel zur Traufe. Ortgang: Windbrett als Plattenlinie, 0,5–1 Block über der Torfkante.

```
Schnitt in der Giebelwand-Ebene, Haus 9 breit, Überstand 1, First entlang z
y=7   .  .  .  .  .  G  .  .  .  .  .     G = grass_block (moss_block/rooted_dirt gestreut)
y=6   .  .  .  G  G  w  G  G  .  .  .     w = Giebelfeld (upperWall)
y=5   L  G  G  w  w  w  w  w  G  G  L     L = spruce_log[axis=z] (Traufstamm)
y=4   .  W  W  W  W  W  W  W  W  W  .     W = Wandkrone
x:   -1  0  1  2  3  4  5  6  7  8  9

Windbrett in der Ortgang-Ebene (d=+1 vor der Giebelwand)
y=8   .  .  .  .  .  b  .  .  .  .  .     b = spruce_slab[type=bottom]
y=7   .  .  .  b  t  .  t  b  .  .  .     t = spruce_slab[type=top]
y=6   .  b  t  .  .  .  .  .  t  b  .     (+0,5 je Spalte; darunter ist die Torfkante sichtbar)
y=5   t  .  .  .  .  .  .  .  .  .  t
```

Regeln: kein Firstbalken (`ridgeStyle 'none'`), keine Gauben, Kamin aus Stein durch den First. Bei Anstieg ≤ 7 reicht 1:2 bis 25 breit. **Winter:** alles `snowy=true` mit `snow[layers=1]`, an Kehlen `layers=2`, ohne Bewuchs.
**Einsatz:** Blockhaus, Stabbur, Naust, Torfhaus. **Wirkung** hoch · **Aufwand** mittel · **Stile** nordic, fantasy, rustic · **Quellen** [33], [34], [43], [12]–[15]; Verteilung = Einschätzung.

### T6 Giebelzier: gekreuzte Windbretter, Hörner, Drachenkopf

Bei Pferdeköpfen sind die Windbretter nach oben verlängert und kreuzen sich vor dem First [51]. Drachenköpfe gibt es an Stabkirchen [31] und im Dragestil 1880–1910 [40]. Der Forenkommentar „I love how you did the ends of the roof“ [11] zeigt, dass Giebelenden das Auge fangen. Die Blockformen selbst sind eine Einschätzung.

```
A) Hörner, 45°-Dach, Ortgang-Ebene, First x=0 auf Höhe R
          x=-3 -2 -1  0  1  2  3
y=R+2       .  w  .  .  .  e  .     e = <roofTrim>_stairs[facing=east,half=bottom] (linke Linie läuft weiter)
y=R+1       .  .  w  .  e  .  .     w = <roofTrim>_stairs[facing=west,half=bottom] (rechte Linie läuft weiter)
y=R         .  .  .  F  .  .  .     F = Firststück
y=R-1       .  .  e  .  w  .  .
y=R-2       .  e  .  .  .  w  .

B) Drachenkopf auf dem verlängerten Firstbaum, Seitenansicht, Nordgiebel, außen = rechts, Ortgang d=1
d:      0  1  2  3  4
y=R+2   .  .  .  H  J     H = spruce_stairs[facing=south,half=top] (Kopf, Schnauze nach außen)
y=R+1   .  .  N  .  .     N = spruce_stairs[facing=north,half=bottom] (Hals steigt nach außen)
y=R     F  F  F  .  .     F = spruce_log[axis=z]; J = spruce_trapdoor[half=top,open=false] (optional)
```

H berührt N nur an einer Kante. Das genügt der 18er-Nachbarschaft; Treppen und Falltüren brauchen keinen Halt [16]. Ein echter `dragon_head` bzw. `dragon_wall_head` (nicht in der Registry) hat eine Block-Entity `skull` ohne Inhalt [18]. Er zeigt einen Enderdrachen und ist für eine Wikingerhalle zu wörtlich (Einschätzung).
**Regeln:** höchstens eine Zier je Giebel. Drachenkopf nur an Langhaus, Halle und Stabkirche. Hörner (1 Stufe bei klein, 2 ab mittel) an Blockhaus, Stabbur, Naust und Windfang. Falu bekommt nur eine weiße `pale_oak_fence`-Spitze. Beim Grasdach laufen die Plattenlinien 1–2 Spalten über den First. Zierzellen bekommen Priorität `DECOR` und gelten im Lint „Anstieg“ bis +3.
**Wirkung** hoch · **Aufwand** niedrig bis mittel · **Quellen** [11], [16], [18], [31], [40], [51], [52].

### T7 Firstbaum mit Überstand, Firstkamm

- Langhaus: Der Firstbaum [1] ragt 1 Block über den Ortgang und trägt dort T6B. Schnee hält auf ihm.
- Stabkirche: Ein Firstkamm aus `spruce_fence` oder `dark_oak_fence` läuft durchgehend auf der Firstplatte. Vorbild sind die „carved roof ridge crests“ [31]; die Umsetzung ist eine Einschätzung.

**Wirkung** mittel · **Aufwand** niedrig.

### T8 Gestaffeltes Stabkirchendach, Dachreiter, Laubengang (*svalgang*)

Die Dächer sind mehrfach gestaffelt und steil, auf dem First sitzt ein Dachreiter [30][31]. Bei Urnes liegt das Schiffsdach etwa 2 m über den Seitenschiffen [32]. Ein Laubengang unter einem Pultdach umläuft das Gebäude [29]. 80–90 % aller Stabkirchen waren einfach und einschiffig [29], das ist das Maß für klein und mittel.

```
Schnitt quer (Schema): Schiff 7 breit, Laubengang je 2 außen
y=17              .  .  .  .  ^  .  .  .  .         ^ = spruce_fence 1–2 + lightning_rod oder end_rod
y=14..16          .  .  .  .  R  .  .  .  .         R = Dachreiter 3×3, Pyramide spruce_stairs (steil)
y=8..13           .  .  /  .  .  .  \  .  .         / \ = Schiffsdach steil, maxRise 10
y=4..7      .  /  |  .  .  .  .  .  |  \  .         | = Schiffwand (T4), / \ = Pultdach Laubengang
y=1..3      a  .  |  .  .  .  .  .  |  .  a         a = Brüstung dark_oak_planks 1 hoch, darüber Arkade
x:         -2 -1  0  1  2  3  4  5  6  7  8
```

Die Arkade: `dark_oak_fence` jede 2. Spalte, dazwischen `dark_oak_stairs[half=top]`-Paare als kleine Bögen. Staffelung (Einschätzung): klein = Schiff + Laubengang; mittel = + Chor; groß = + Dachreiter; riesig = + Seitenschiffe mit Dach 2 tiefer.
**Wirkung** hoch (Landmark) · **Aufwand** hoch · **Quellen** [29]–[32].

### T9 Stabbur auf Stelzen

Der Bau steht auf Pfosten 1–1,5 m über dem Boden. Zwischen oberster Stufe und Eingang bleibt eine Lücke von etwa 30 cm [35]. Die Treppe berührt das Gebäude nicht [36]. Er hat meist ein Geschoss und keine Fenster; der *loft* hat einen Laubengang auf Stammkonsolen [37].

```
Ansicht Süd, Grundfläche 5×5, Obergeschoss 7×7
x:     -1  0  1  2  3  4  5
y=7-9   X  X  X  D  X  X  X     X = stripped_spruce_log[axis=x] (T1)
y=6     f  f  f  f  f  f  f     f = spruce_planks (Boden OG, kragt 1 aus)
y=5     k  X  X  X  X  X  k     k = spruce_stairs[half=top,facing=zur Wand] (Konsole)
y=3-4   .  X  X  D  X  X  .     fensterlos, Tür mittig
y=2     .  B  B  B  B  B  .     B = spruce_log[axis=x] (Schwelle)
y=1     .  S  .  .  .  S  .     S = spruce_log[axis=y] (Stelze; ab Länge 7 auch mittig)
y=0     .  R  .  .  .  R  .     R = cobblestone (Unterlegstein)
```

Treppe: `spruce_stairs` ab d=+2. Die oberste Stufe endet als `spruce_slab[type=bottom]` 0,5 unter der Schwelle. Dach: T5 oder Treppen, Überstand 1.
**Wirkung** hoch · **Aufwand** mittel (Sockelart Stelzen, Jetty rundum) · **Stile** nordic, fantasy · **Quellen** [35]–[37].

### T10 Schräge Außenstützen und gebauchte Langwand (Trelleborg)

Trelleborg-Häuser sind 29,4 m lang mit einem Saal von 18 × 8 m. Die Langwände „bulging outwards“, außen stehen „slanted beams“, dazu kommen 4 Eingänge mit Vorbauten [47].

```
Schnitt durch eine Stütze, Südwand (alle 3–4 Spalten)
d:     0  1  2
y=3    W  u  .      u = spruce_stairs[facing=north,half=top] (Kopf, volle Seite an der Wand)
y=2    W  s  .      s = spruce_stairs[facing=north,half=bottom]
y=1    W  .  s
```

Bauchung (Einschätzung): Das mittlere Drittel der Langwand steht 1 Block weiter außen. Ein zweiter Dachabschnitt mit gleicher Firsthöhe wird mit dem Hauptdach vereinigt.
**Wirkung** mittel · **Aufwand** mittel · **Quellen** [44], [47].

### T11 Windfang mit Satteldach (*farstukvist*, Langhaus-Vorbau)

Der Farstukvist ist ein ungeglaster Vorbau am Haupteingang, mit Dach, Boden, Geländer, oft auch Bänken und Schnitzwerk [26][27]. Die Parstuga hat den Eingang mittig [28]. Das Langhaus hat zwei versetzte, überdachte Eingänge [1][47].

```
Draufsicht, 3 × 2 vor der Tür
d=+3   .  F  .     F = Auftritt (Treppe)
d=+2   p  .  p     p = stripped_pale_oak_log[axis=y] (Pfosten y=1..2)
d=+1   b  .  b     b = pale_oak_stairs (Bänke, facing zur Mitte), Mitte frei
d= 0   M  D  M
```

Das Dach ist ein kleiner Satteldach-Abschnitt (wie `porchSection`) mit dem First quer zur Fassade. Die Traufe liegt 1 über der Türoberkante. Giebelfeld `pale_oak_planks` (Falu) oder `spruce_planks`, Hörner T6A mit Länge 1.
**Wirkung** hoch · **Aufwand** mittel · **Quellen** [1], [26]–[28], [47].

### T12 Holzstapel unter der Traufe

„A woodpile stacked against one side of the building“ [3].

```
Ansicht Süd, d=+1 unter dem Dachüberstand
x:    0  1  2  3  4
y=2   E  E  B  E  E      E = spruce_log[axis=z] (Stirnholz zum Betrachter), B = birch_log[axis=z]
y=1   E  B  E  E  E      ohne Überstand darüber: spruce_slab[type=top] auf y=3
```

Länge 3–6, Höhe 2, Tiefe 1, etwa eine Birke auf fünf Stämme. Nicht vor Fenstern, Türen oder auf Laufwegen. p = 0,6 bei Blockhaus und Langhaus, 0,4 bei Falu. **Wirkung** mittel · **Aufwand** niedrig · **Stile** nordic, rustic, medieval.

### T13 Rundholzzaun (*gärdsgård*, *skigard*)

Paarweise runde Pfosten aus jungen Fichten, dazwischen schräge Stangen, 1,5–2 m hoch [50]; auch am Sommerhaus beschrieben [25]. Schrägen gehen nicht, daher als Näherung (Einschätzung): `spruce_fence` durchgehend 1 hoch und alle 3 Spalten ein Pfosten 2 hoch; am Weg `spruce_fence_gate`. Ersetzt die Hecke (landscape.ts:108). **Wirkung** mittel · **Aufwand** niedrig.

### T14 Winterdach

1. **Grasdach:** echter Schnee auf allen Stufen (T5). Schnee braucht eine volle Oberseite, bei Treppen geht das nur kopfüber [13].
2. **Treppendach mit Schneedecke (Einschätzung):** Alle Dachstücke außer Ortgang und Untersicht bekommen dieselbe Form in `smooth_quartz` (L\* 91,8), dazu 10 % `polished_diorite_stairs`. Der Schnee liegt dann im Holzrahmen. Quarz ist wärmer getönt als Schnee (H 75° gegenüber 200°), deshalb nie direkt neben `snow_block`-Flächen.
3. **Holzkanten:** Firstbaum, Traufstämme und Vollblock-Simse tragen echte Schichten. Bei Winter sollen diese Kanten Vollblöcke sein, keine Platten.

```
Schnitt quer, linke Dachhälfte, 45°, Variante 2
x:  -2 -1  0  1  2  3  4
y=9                    F     F = spruce_log mit snow[layers=1] darüber
y=8                 Q        Q = smooth_quartz_stairs[facing=east,half=bottom]
y=7              Q
y=6           Q
y=5        Q
y=4     Q                    Untersicht darunter bleibt spruce_stairs[half=top]
```

**Wirkung** hoch · **Aufwand** niedrig bis mittel · **Quellen** [2] (Schnee als Blöcke auf dem Dach), [13]; Vorarbeit Abschnitt 1.

### T15 Nordische Weihnachtsdetails

- **Julenek:** eine Hafergarbe an einer Stange vor der Scheunentür, für die Vögel, belegt 1753 [56][55]. Block: `spruce_fence` 2–3 hoch, darauf `hay_block[axis=y]`.
- **Julbock:** Stroh mit roten Bändern [53]. Block (Einschätzung):

```
Seitenansicht, vorn = rechts
y=4   .  .  h     h = birch_fence (Horn)
y=3   r  r  K     K = hay_block (Kopf), r = red_carpet (Band)
y=2   H  H  .     H = hay_block[axis=x] (Rumpf)
y=1   f  .  f     f = birch_fence (Beine, strohfarben, L* 72)
```

- **Fichtenzweige an der Tür** [55]: schon in T10 vorhanden. **Kerzen und Sterne im Fenster** [54]: `white_candle[lit=true]` außen auf dem Sims (Licht ≤ 12, schmilzt keinen Schnee). Ein Innenleuchter auf d=−1 wäre schöner, widerspricht aber „Innenräume leer“; das muss der Creative Director entscheiden. **Rote Tulpen** sind Weihnachtsbrauch [54]: `potted_red_tulip` auf dem Sims.
- **Farben:** Rot, Weiß, Fichtengrün, Stroh. Das Licht ist warm und sparsam.

**Wirkung** hoch · **Aufwand** niedrig · **Quellen** [53]–[56].

### T16 Dachverlauf: untere Reihen dunkler

Bei Wikingerdächern sind „die unteren Dachpartien dunkler“ ([1] via `paletten.md`). Regel: Die Reihen d=0..1 bekommen `roofTrim`, darüber `roof`. Gilt nicht für Falu. **Wirkung** mittel · **Aufwand** niedrig.

---

## (a) Kennzeichen des Stils

**Echte Architektur:**
- Holz herrscht vor. Langhaus und Stabkirche sind Pfosten- und Stabbauten. Wohnhäuser und Speicher sind Blockbau mit verzahnten Ecken [39].
- Langhäuser sind bootsförmig mit gebauchten Wänden [44][47].
- Das Dach ist das Hauptvolumen. Torfdächer liegen flach [34], Stabkirchendächer steil und gestaffelt [29], der Dragestil ist steil mit großen Überständen [40].
- Öffnungen sind wenige und klein. Das Langhaus hat keine Fenster, Licht und Rauch gehen durch das Dach [44][45]; Stabbur sind fensterlos [37].
- Farben: geteertes Dunkelbraun [31], Naturholz, Falu-Rot mit Weiß [23][24]; im Schweizerstil gestrichene Schalung [41].
- Viele kleine Bauten um einen Hof (*tun*) [39]. Niedrige Steinsockel, Speicher auf Stelzen, Bootshaus mit dem Giebel zum Wasser [48].

**Minecraft:**
- Fichte und Schwarzeiche mit dunklem, grobem Stein (`paletten.md`).
- Community-Wikingerbauten bestehen zu 28–37 % aus Stämmen, etwa die Hälfte davon liegend. Strohdächer sind aus Heu, Grasdächer aus Erde und Gras [5]–[10].
- Vanilla-Taiga-Dörfer: Fichte überall, Dächer auch aus Stämmen, Kürbis, Süßbeeren, Heu, Lagerfeuer [19].

## (b) Untervarianten

| Variante | Muss-Merkmale | Wand | Dach | Quellen |
|---|---|---|---|---|
| **Wikinger-Langhaus** | L:B ≥ 2,2; das Dach dominiert; 2 versetzte überdachte Eingänge; fast fensterlos; Drachenköpfe; kein Kamin | Bretter/Stab (T4), Stützen (T10) | Sattel oder Krüppelwalm 45°, unten dunkel | [1], [44]–[47] |
| **Norwegisches Blockhaus** | liegende Stämme, Vorstoß-Ecken, Köpfe; kleine weiße Fenster | T1 + T2 | Grasdach (T5) oder 45° | [33], [34], [38], [39] |
| **Stabkirche** | steil gestaffelt, Dachreiter, Drachenköpfe an allen Giebeln, Laubengang | T4 | T8 | [29]–[32] |
| **Schwedisches Falu-Haus** | rot mit weißen Ecken, Fenstern und Windbrettern; symmetrisch; Windfang mittig; dunkles Dach; Kamin auf dem First | T3 | 45°, dunkelgrau | [23]–[28] |
| **Grasdach (Torvtak)** | flach, Gras, Traufstamm, Windbrett, Bewuchs | mit Blockhaus, Stabbur, Naust | T5 | [33], [34], [43] |
| **Stabbur** | klein, auf Stelzen und Steinen; Obergeschoss kragt aus; Freitreppe mit Lücke | T1 | Gras oder 45° | [35]–[37] |
| **Fischerhütte, Rorbu, Naust** | Giebel zum Wasser; Rorbu auf Pfählen [49]; Naust mit großem Tor und Slip [48]; Trockengestell [57] | T3 rot oder T1 | 45° oder Gras | [48], [49], [57] |
| **Chalet-Nähe** | flaches, schweres Dach mit breiter, abgestützter Traufe [42]; Balkone, Konsolen, gestrichene Schalung [41] | Stein-Erdgeschoss, Holz-Obergeschoss | 26,6°, Überstand 2–3 | [41], [42] |

Nordisch übernimmt vom Chalet nur die breite, abgestützte Traufe und den Laubengang; der Dragestil mischt beides [40]. Läden, Blumenkästen und Putz bleiben bei `rustic` (Einschätzung).

## (c) Paletten nach unseren Rollen

Je Gebäude wird ein Material je Rolle gezogen; die Gewichte sind Auswahlwahrscheinlichkeiten (palettes.ts:1–4). ★ = in der Registry vorhanden, fehlt aber in `materials.ts`; für 1.21.1 dient `birch_planks` als Ersatz. Die Lint-Regel (Rahmen oder Dach mit ΔL\* ≥ 15 zur Wand) ist mit textureStats.ts nachgerechnet.

**N1 `nordic_longhouse` (Ersatz): Wikinger-Langhaus**
```ts
plinth: [['cobblestone',3],['mossy_cobblestone',1],['cobbled_deepslate',1]], wall: [['spruce_planks',2],['stripped_spruce_log',1]],
upperWall: [['spruce_planks',1]], infill: [['spruce_planks',1]], frame: [['dark_oak_log',1]] /* ΔL 18–20 */, beam: [['dark_oak_log',1]],
roof: [['spruce_planks',2],['dark_oak_planks',1]], roofTrim: [['dark_oak_planks',1]] /* T16 */, ridge: [['spruce_log',1]], soffit: [['spruce_planks',1]],
window: [['brown_stained_glass',1]], shutter: [['spruce_planks',1]], door: [['dark_oak_planks',1],['spruce_planks',1]], floor: [['spruce_planks',1]],
path: [['coarse_dirt',1]], chimney: [['cobblestone',1]] /* chimney p=0 */, accent: [['mangrove_planks',1]] /* rot gefasste Details statt red_wool */
```

**N2 `nordic_laft`: Blockhaus mit Grasdach**
```ts
plinth: [['cobblestone',2],['mossy_cobblestone',1],['andesite',1]], wall: [['stripped_spruce_log',3],['spruce_log',1]] /* liegend, T1 */,
upperWall: [['spruce_planks',1]], infill: [['spruce_planks',1]], frame: [['pale_oak_planks★',2],['spruce_log',1]] /* ΔL 47 */, beam: [['spruce_log',1]],
roof: [['spruce_planks',1]] /* Bretter; Decke Gras = Profil turf */, roofTrim: [['spruce_log',1]] /* torvvol, liegend */, ridge: [['spruce_planks',1]],
soffit: [['spruce_planks',1]], window: [['glass',1]], shutter: [['spruce_planks',1]], door: [['spruce_planks',2],['mangrove_planks',1]],
floor: [['spruce_planks',1]], path: [['coarse_dirt',1]], chimney: [['cobblestone',2],['stone_bricks',1]], accent: [['mangrove_planks',1]]
```

**N3 `nordic_falu`: Falu-Rot-Haus**
```ts
plinth: [['cobblestone',2],['andesite',1]], wall: [['mangrove_planks',4],['red_terracotta',1]], upperWall: [['mangrove_planks',1]],
infill: [['mangrove_planks',1]], frame: [['pale_oak_planks★',1]] /* ΔL 51–56 */, beam: [['pale_oak_planks★',1]] /* Traufbrett */,
roof: [['deepslate_tiles',3],['dark_oak_planks',1]], roofTrim: [['pale_oak_planks★',1]] /* weiße Windbretter */, ridge: [['deepslate_tiles',1]],
soffit: [['mangrove_planks',1]], window: [['glass',1]], shutter: [['pale_oak_planks★',1]], door: [['pale_oak_planks★',1],['spruce_planks',1]],
floor: [['spruce_planks',1]], path: [['cobblestone',1]], chimney: [['white_terracotta',1],['bricks',1]], accent: [['pale_oak_planks★',1]]
```
Ocker (Einschätzung): `wall: oak_planks`, Rest wie N3 (ΔL 31).

**N4 `nordic_stave`: Stabkirche, geteert**
```ts
plinth: [['cobblestone',1],['stone',1]], wall: [['dark_oak_planks',1]] /* stripped_dark_oak_log 25,1 verfehlt ΔL 15 zu spruce knapp */,
upperWall: [['dark_oak_planks',1]], infill: [['dark_oak_planks',1]], frame: [['stripped_spruce_log',1]] /* ΔL 20 */, beam: [['dark_oak_log',1]],
roof: [['spruce_planks',2],['dark_oak_planks',1]], roofTrim: [['dark_oak_planks',1]], ridge: [['dark_oak_planks',1]] /* + Firstkamm */,
soffit: [['dark_oak_planks',1]], window: [['brown_stained_glass',1]], shutter: [['dark_oak_planks',1]], door: [['dark_oak_planks',1]],
floor: [['spruce_planks',1]], path: [['cobblestone',1]], chimney: [['cobblestone',1]] /* p=0 */, accent: [['mangrove_planks',1]]
```

**N5 `nordic_coast`: weißes Küstenhaus (nur 1.21.11)**
```ts
plinth: [['cobblestone',1],['stone_bricks',1]], wall: [['pale_oak_planks★',1]], upperWall: [['pale_oak_planks★',1]], infill: [['pale_oak_planks★',1]],
frame: [['pale_oak_planks★',1]], beam: [['pale_oak_planks★',1]], roof: [['deepslate_tiles',2],['mangrove_planks',1]] /* ΔL 64 */,
roofTrim: [['pale_oak_planks★',1]], ridge: [['deepslate_tiles',1]], soffit: [['pale_oak_planks★',1]], window: [['glass',1]],
shutter: [['spruce_planks',1]], door: [['spruce_planks',1],['mangrove_planks',1]], floor: [['spruce_planks',1]], path: [['cobblestone',1]],
chimney: [['bricks',1]], accent: [['mangrove_planks',1]]
```

**N6 `nordic_dark` (überarbeitet): Dunkle Halle**
```ts
plinth: [['cobbled_deepslate',2],['cobblestone',1]], wall: [['dark_oak_planks',1]], upperWall: [['dark_oak_planks',1]], infill: [['dark_oak_planks',1]],
frame: [['stripped_spruce_log',1]], beam: [['stripped_spruce_log',1]], roof: [['spruce_planks',1]], roofTrim: [['dark_oak_planks',1]],
ridge: [['stripped_spruce_log',1]], soffit: [['dark_oak_planks',1]], window: [['brown_stained_glass',1]], shutter: [['spruce_planks',1]],
door: [['spruce_planks',1]], floor: [['spruce_planks',1]], path: [['cobbled_deepslate',1]], chimney: [['cobbled_deepslate',1]], accent: [['mangrove_planks',1]]
```

**Falu-Rot aus Blöcken?** Ja, mit `mangrove_planks` (Holzbild, voller Formsatz) oder `red_terracotta` (matt). **Grasdach aus Blöcken?** Ja, als Deckschicht aus festen Blöcken über dem 1:2-Profil. Die Rolle `roof` bleibt ein Holz mit Treppen, das verlangt der Lint.

## (d) Proportionen je Größe

1 Block ≈ 1 m, für Details 1,2–1,5-fach vergrößert (Einschätzung). Angaben: Breite × Tiefe, Geschosse.

| Variante | klein | mittel | groß | riesig | Geschoss | Profil | Überstand Traufe/Giebel | Sockel |
|---|---|---|---|---|---|---|---|---|
| Langhaus | 9×19, 1 | 11×25, 1 | 11×31, 1 | 13×41, 1 | 4 | standard 70 %, Krüppelwalm 30 % | 1/1 (9 breit: 2/1) | 1 |
| Blockhaus | 7×9, 1 | 9×11, 1 | 9×13, 2 | 11×15, 2 | 4 | turf 60 %, standard 40 % | 1/1 | 1 |
| Falu | 7×11, 1 | 9×13, 2 | 9×15, 2 | 11×17, 2 | 4–5 | standard | 1/1 | 1 |
| Stabkirche | 7×11 + Laubengang | 9×15 + Chor | 11×19 + Dachreiter | 13×23, 2 Staffeln | 5–6 | steil, maxRise 10 | 1/1 | 1 |
| Stabbur | 5×5 | 5×7 | 7×7, 2 | 7×9, 2 | 4 | turf oder standard | 1/1, Obergeschoss +1 | Stelzen 2 |
| Fischer/Naust | 5×7 | 7×9 | 7×11 | 9×13 | 4 | standard oder turf | 1/1 | 1 |
| Chalet-Nähe | 9×9, 2 | 9×11, 2 | 11×13, 2 | 13×15, 3 | 4–5 | shallow | 2–3/2 | 1–2 |

**Belege.** Langhäuser sind 5–7 m breit und 15–75 m lang [44][45]. Borg misst 83 × 9,5 m und ist 9 m hoch, die Firsthöhe entspricht also etwa der Breite [46]. Trelleborg: Saal 18 × 8 m [47]. minecraft.how nennt 30–50 × 12–15 Blöcke, aber auch „10–12 blocks of walls“ [1]. Diese Wandhöhe **widerspricht** der Langhaus-Silhouette und wird nicht übernommen. Schneehütte: 7×8 Blöcke, Überstand 1–2 [2]. Torfdach 22–33° [34], Stabbur-Stelzen 1–1,5 m [35].

**Regeln (Einschätzung, an der Engine geprüft):**
- Die Traufe liegt ≥ 2 über dem Gelände. Ausnahme: ein Langhaus, dessen Türen alle im Giebel oder unter einem Vorbau liegen.
- Gewählt wird das steilste Profil, das `capRise` höchstens an einer Spalte ändert. Bei 45° muss halbe Spannweite + Überstand ≤ 7 sein. Beispiel: 11 breit mit Überstand 1 ergibt 6 ✓. 13 breit mit Überstand 3 ergibt 9 und damit eine Tonne.
- Länge zu Breite: Langhaus ≥ 2,2; Blockhaus und Falu 1,2–1,6; Stabbur 1,0–1,3.

## (e) Dachformen und Profile

| Variante | Form | Profil | First | Ortgang | Zier |
|---|---|---|---|---|---|
| Langhaus | Sattel/Krüppelwalm | standard | Stamm + 1 Überstand | dunkel, untere 2 Reihen dunkel | Drachenkopf |
| Blockhaus | Sattel | turf/standard | `none` bei turf | Plattenlinie (T5) | Hörner |
| Falu | Sattel | standard | `slab` | weiß | weiße Spitze |
| Stabkirche | gestaffelt + Pult + Dachreiter | steil | Kamm | dunkel | Drachenköpfe |
| Stabbur, Naust | Sattel | turf/standard | `none`/`slab` | Windbrett | Hörner |
| Chalet-Nähe | Sattel flach | shallow | `slab` | Konsolen | keine |

Aus den Prioren streichen: `flared` (styles.ts:153, kein nordischer Beleg). `a_frame` kommt nur auf Wunsch, er ist modern-skandinavisch (Einschätzung).

## (f) Fenster- und Türtypen

| Variante | Fenster | Türen |
|---|---|---|
| Langhaus | ≤ 1 je 7 Wandspalten, W01c, **W20** im Giebel | 2 versetzt [1][47]: T05b oder **T11** |
| Blockhaus | W03/W03c mit weißem `frame`, **W19** | T01, T07 (Sockel 2), T11 |
| Falu | **W19** auf symmetrischen Achsen, Giebel W01c | **T11** mittig [28] |
| Stabkirche | W01c hoch, wenige | T04 Rundbogen (Urnes [32]) |
| Stabbur | keine; Schlitz `spruce_trapdoor[open=false]` 1×1 | **T12** |
| Naust | keine oder W01c | **T13** |
| Chalet-Nähe | W04 mit Läden, W05 Blumenkasten (nur hier) | T06 |

Neue Vorlagen:
- **W19 „Fenster mit weißem Futter“ (1×2, 2×2):** wie Skizze T3. Das Futter ist `frame_trapdoor[open=true]` in d=+1 und gehört zur Rolle `frame`, nicht `shutter`. Darüber `frame_slab[type=top]` als Verdachung, eine Spalte breiter. Darunter `frame_stairs[facing=north,half=top]` als Sohlbank. Abstand zum nächsten Fenster ≥ 2.
- **W20 „Windauge“ (1×1, Giebel):** Öffnung mit `brown_stained_glass_pane` oder offen, darüber `spruce_trapdoor[half=top,open=true]` in d=+1 als Klappe. Liegt 2 unter dem First.
- **T11 Windfang:** siehe T11. **T12 Freitreppe:** `spruce_stairs` parallel zur Wand in d=+1, Podest `spruce_slab[type=top]`, außen `spruce_fence`. **T13 Bootstor:** 3×3 im Giebel aus `spruce_trapdoor[open=true]`, liegender Stamm als Sturz, davor `spruce_slab` als Slip [48].

## (g) Blockbau-Wandtechnik: Entscheidungstabelle

| Variante | d=0 | d=+1 | Ecke | Gliederung gegen „flache Wand > 5“ |
|---|---|---|---|---|
| Blockhaus, Stabbur | liegende Stämme | nichts | Vorstoß | Köpfe alle ≤ 6, Laibungen |
| Langhaus | Bretter/Bohlen | Eckstäbe, Rähm, Stützen | Eckstab | Stützen alle 3–4, Vorbauten |
| Stabkirche | Bohlen | Eckstäbe, Schwelle, Rähm | Eckstab | Laubengang |
| Falu, Küste | Schalung | Eckbrett, Traufbrett, Futter | Eckbrett | Fensterachsen alle ≤ 5 |
| Chalet | Stein-Erdgeschoss, Bretter | Konsolen, Balkon | Pfosten | Balkon |

- Liegende Stämme laufen immer parallel zur Fassade. Stirnholz zum Betrachter zeigen nur die Köpfe.
- Laft ist geschält [39]: Standard ist `stripped_spruce_log`, `spruce_log` mit Rinde (L\* 17) nur für die Variante „alt, dunkel“.
- Giebelfelder im Blockbau sind als Schalung klarer (`upperWall` = Bretter) (Einschätzung).
- Bretter zeigen ihre Textur waagerecht. Eine stehende Schalung entsteht aus entrindeten Stämmen mit `axis=y`.

## (h) Signatur-Details (je Gebäude mindestens 3)

1. Hörner (T6A), p 0,8 bei Blockhaus, Stabbur, Naust.
2. Drachenkopf (T6B), p 1,0 bei Langhaus und Stabkirche.
3. Vorstoß-Ecken und Köpfe (T1, T2), immer bei Laft.
4. Grasdach (T5), p 0,6 bei Blockhaus, 0,5 bei Stabbur und Naust.
5. Falu-Rot mit weißen Kanten (T3), immer bei Falu.
6. Windfang oder Vorbau mit eigenem Giebel (T11), p 0,7 bei Falu und Langhaus.
7. Holzstapel (T12), p 0,4–0,6.
8. Stabbur als Nebengebäude (T9), p 0,3 ab Größe mittel.
9. Firstkamm und Dachreiter (T7, T8) bei der Stabkirche.

## (i) Deko und Umgebung

- **Sockel:** 1 Lage Trockenstein aus `cobblestone`, `mossy_cobblestone` und `andesite`, ohne Treppenschürze. Bei Laft liegt an den Ecken ein Eckstein als `cobblestone_stairs` (Einschätzung).
- **Birken:** wie Vanilla. Stamm `birch_log[axis=y]` 5–7 hoch, Krone als Blob mit Radius 2 und Höhe 3 aus `birch_leaves[persistent=true]` [22]. 1–2 Stück am Rand, ≥ 3 Blöcke von der Traufe.
- **Fichten:** Kegel aus dem Baum-Generator ohne Schmuck, 7–11 hoch, im Winter mit Schnee auf den Laubstufen.
- **Zaun:** T13 statt Hecke.
- **Langhaus-Hof:** Feuerstelle aus `campfire` im Ring aus `cobblestone_slab` [4]. Mit `hay_block` darunter steigt der Rauch 24 statt 10 Blöcke [17]. Licht 15, also ≥ 4 Abstand zu Schnee.
- **Taiga-Requisiten:** `barrel`, `hay_block`, `pumpkin` [19]. `sweet_berry_bush`, `composter` und `podzol` fehlen in der Registry.
- **Fischerplatz:** *hjell* [57] als A-Rahmen aus `spruce_fence` mit Querstange `stripped_spruce_log[axis=x]`, ohne Fisch (Einschätzung).
- **Runenstein (Einschätzung):** 1 × 1 × 2–3 aus `stone` und `andesite`, oben `andesite_slab`.
- **Nicht möglich:** Schilde (Item Frame [4]), Boote, gemusterte Banner, Flaggen.

## (j) Winter- und Weihnachtsvariante

**Winter:**
1. Bei Blockhaus, Stabbur und Naust steigt p(turf) auf 0,8. Alle Stufen tragen echten Schnee.
2. Treppendächer bekommen Schnee auf den Kanten (T14.3), auf Wunsch die Schneedecke (T14.2).
3. Schneeverwehungen: an Wand und Holzstapel 2–3 Schichten, nach außen 1 (siehe Vorarbeit).
4. Im Schnee wirken dunkle Hölzer (N1, N2, N4, N6) und Falu-Rot am stärksten. N5 Weiß hält nur über dunkles Dach, dunkle Tür und dunklen Sockel.

**Weihnachten:**
1. Julenek (p 0,8), Julbock (p 0,5 ab Garten mittel), Fichtenzweige an der Tür, Kerzen auf allen Simsen (T15).
2. Girlande nur an der Eingangsseite und am Windfang. Als Licht `lantern[hanging=true]` an `iron_chain` alle 4–6 Blöcke statt Glowstone (Einschätzung, festive.ts:80).
3. Höchstens 2 Geschenke, z. B. `barrel` mit `red_carpet` (Querverweis Festschicht).
4. Am Stabbur der Julenek an der Treppe. Der Wichtel wohnt dort laut Brauch [36], ganz ohne Entity.

## (k) Was den Stil kaputt macht

Die härtesten Brüche: Fachwerkraster, gesättigte Hölzer, Läden mit Blumenkasten, hohe Wände unter kleinem Dach, ein Treppendach ohne Schnee im Winter. Alles weitere unter „Fehler, die Profis vermeiden“.

## (l) Bewertung des aktuellen `nordic`

| Aspekt | Ist | Soll |
|---|---|---|
| Typen | 1 (Halle) | 7 Untervarianten |
| Paletten | 2, braun | N1–N6 mit Falu und Weiß, ★ pale_oak |
| Wand | Bretter + Raster | Laft, Stab oder Schalung je Variante |
| Profil | steil 55 %, ausgestellt 15 % | standard, turf; steil nur Stabkirche; nach Spannweite |
| Überstand / Sockel | 2–3 / 2–3 | 1 (Langhaus 9 breit: 2) / 1 oder Stelzen |
| First | Stamm bündig | Stamm mit Überstand, Drachenkopf, Hörner, Kamm |
| Kamin | außen am Giebel | durch den First, beim Langhaus keiner |
| Fenster / Läden | W02–W06 / 0,5 | W19, W20, wenige / ≤ 0,1 |
| Umgebung | Fichtenhecke | Birke, Fichte, Holzstapel, Gärdsgård |
| Winter | nur der First weiß | Grasdach, Schneedecke, Schneekanten |
| Weihnachten | Standard | Julenek, Julbock, Kerzen |

Behalten: `symmetric: true`, `timber: 'none'`, `jetty: false` (außer Stabbur), `lantern`, Weg-Mix, Anteil Krüppelwalm.

---

## Fehler, die Profis vermeiden

1. **Fachwerk statt Blockbau:** Ein dunkles Raster vor hellen Feldern wirkt deutsch-mittelalterlich, nicht nordisch (walls.ts:166).
2. **Falsche Hölzer:** Akazie und Wirrholz sind bei Schneehütten „absolutely not“ [2]. Ebenso tabu sind Bambus, Kirsche, Tropenholz und Karmesin. Birke ist dagegen typisch nordisch.
3. **Hohe Wände unter kleinem Dach:** Das Langhaus *ist* sein Dach. Die „10–12 blocks of walls“ aus [1] zerstören die Silhouette.
4. **Dach bis zum Boden auf hohem Sockel:** Das ergibt einen Bunker. Entweder tiefe Traufe auf niedrigem Sockel oder mittlere Traufe.
5. **Steile Grasdächer:** Real liegen sie bei 22–33° [34].
6. **Drachenköpfe an jedem Haus:** Das wird Kitsch. Wohnhäuser bekommen schlichte Hörner.
7. **Zu viele und zu große Fenster:** Schon die Schneehütten-Quelle warnt vor dem „aquarium“ [2]. Nordische Häuser haben deutlich weniger Fensterfläche, das Langhaus fast keine.
8. **Läden und Blumenkästen:** Das macht das Haus alpin. Das nordische Gegenstück ist das weiße Futter (Einschätzung).
9. **Grelles Rot oder Rot ohne Weiß:** Rot leuchtet erst mit weißen Kanten [24].
10. **Braun in Braun ohne Hierarchie:** ΔL\* ≥ 15 und zusätzlich ein Materialkontrast (Stein, Gras, Weiß).
11. **Treppendach im Winter ohne Schneeplan:** Schnee hält auf Treppen nur kopfüber [13].
12. **Starkes Licht neben Schnee:** Licht 15 schmilzt bis Abstand 3 (Vorarbeit); Kerzen sind unkritisch.
13. **Außenkamin am Giebel:** Das ist ein amerikanisches Blockhausbild (Einschätzung).
14. **Ein einzelnes Haus ohne Hof:** Nordische Höfe sind Ensembles [39]. Ein Stabbur oder Holzschuppen erzählt mehr als ein größeres Haupthaus; auch GDMC verlangt glaubwürdige, an die Karte angepasste Siedlungen [58].

---

## Empfehlungen für den Generator

Sortiert nach Wirkung pro Aufwand.

**E1 Untervarianten als Daten** (styles.ts, resolveInput.ts; Daten).
Neues Feld `StyleDef.variants?: {id, weight, palettes, roofTypes, roofProfiles, proportions, wall: 'boards'|'log_course'|'staves'|'stone_lower', framing: 'grid'|'corners'|'none', plinthKind: 'solid'|'stilts', ornament, chimneyPlacement, details, windows, doors, keywords}[]`. Gezogen wird über `fork('variant')` oder aus dem Text. Für nordic: `longhouse`, `laft`, `falu`, `stave`, `stabbur`, `coast`.
*Akzeptanz:* „schwedisches rotes Holzhaus“ ergibt falu/N3. „norwegische Hütte mit Grasdach“ ergibt laft/turf. Ohne Wunsch zeigen 3 Varianten eines Seeds mindestens 2 Untervarianten. Alle Lints laufen mit 0 Reparaturen.

**E2 Wandform `log_course`** (walls.ts, house/materials.ts, buildingLints.ts; Regel).
`weathered` bekommt eine Achse. Ecken nach T1, Köpfe nach T2. Köpfe alle ≤ 6 zählen als Gliederung.
*Akzeptanz:* ≥ 95 % der Wandstämme liegen parallel zur Fassade. Die Ecken wechseln je Lage zwischen Stirnholz und Vorstoß. In d=+1 stehen keine Pfosten. Lint „flache Wand“ und Fixpunkttest grün.

**E3 `pale_oak` im Materialkatalog und Paletten N1–N6** (materials.ts, palettes.ts; Daten).
`pale_oak` mit Profil 1.21.11 und Ersatz `birch_planks` aufnehmen. N1–N6 eintragen, `accent` ohne `red_wool`.
*Akzeptanz:* Palette-Lints grün. Ein 1.21.1-Export enthält keine `pale_oak`-IDs. Falu: ≥ 80 % der Wandfläche rot, alle Ecken und Futter weiß.

**E4 Giebelzier** (roofEngine.ts, plan.ts, buildingLints.ts; Regel + Daten).
`RoofSectionSpec.ornament: 'none'|'horns'|'dragon'|'finial'` und `ridgeOverhang`. Zierzellen haben Priorität `DECOR` und gelten im Anstiegs-Lint bis +3.
*Akzeptanz:* Genau eine Zier je Giebel. Nichts schwebt. Der Auflöser ändert die Treppen nicht (Vorschau = Import).

**E5 Profil `turf` mit Deckschicht** (profiles.ts, roofEngine.ts, festive.ts:183; Regel).
Stufen 1:2 aus Vollblöcken, Deckschicht nach Gewicht, Traufstamm liegend, Windbrett als Plattenlinie.
*Akzeptanz:* Neigung 26,6°. Kein Gras unter opaken Blöcken. Bei Winter + Schnee liegt auf ≥ 90 % der freien Dachoberseiten Schnee, Gras ist `snowy=true`. 0 Reparaturen.

**E6 Proportionen, Überstand, Sockel, Profil nach Spannweite** (styles.ts, resolveInput.ts, plan.ts, profiles.ts:103; Daten + Regel).
Tabelle (d) übernehmen, `flared` streichen. Das Profil so wählen, dass `capRise` höchstens eine Spalte ändert. Für die Stabkirche `maxRiseBlocks` 10 durchreichen. Traufe ≥ 2 über Gelände.
*Akzeptanz:* Über alle Größen höchstens eine abgeflachte Spalte. Traufe ≥ Sockel + 2 (Ausnahme Langhaus dokumentiert). Sockel 1 bzw. Stelzen.

**E7 Rahmen-Modus** (walls.ts:166; Daten).
`framing` je Variante: Laft `none`, Falu, Küste, Stab und Langhaus `corners`.
*Akzeptanz:* Bei `corners` stehen in d=+1 nur Pfosten an u=−1 und u=length.

**E8 Kamin** (buildHouse.ts:125–132, components.ts; Regel).
`chimneyPlacement` je Variante: `ridge` (mittig, per `buildRoofChimney`) oder `none` (Langhaus, Stabkirche).
*Akzeptanz:* Bei nordic nie ein Außenkamin. Der Kamin steht höchstens 1 Spalte neben der Mitte.

**E9 Winterdach** (roofEngine.ts oder festive.ts; Regel).
`roofSnow: 'edges'|'cover'`. Standard bei Schnee ist `edges`. `cover` ist die Schneedecke aus Quarz nach T14.2.
*Akzeptanz:* Bei `cover` sind ≥ 70 % der von oben sichtbaren Dachzellen weiß, der Ortgang bleibt Holz. Keine Schneeschicht im Schmelzradius.

**E10 Umgebung** (landscape.ts, styles.ts; Daten + Regel).
`forbidden` von `'birch'` auf `'birch_planks'` einengen. Birken [22] und Fichten setzen, Holzstapel (T12), Gärdsgård (T13) statt Hecke.
*Akzeptanz:* Garten nordic: 1–3 Bäume, davon ≥ 1 Birke; 1 Holzstapel unter Überstand; Zaun mit Tor am Weg. Nichts blockiert Tür oder Fenster.

**E11 Nordische Festschicht** (festive.ts; Daten).
`festive.extras: ['julenek','julbock','granris']`, Laternen statt Glowstone, ≤ 2 Geschenke.
*Akzeptanz:* Weihnachten + nordic ergibt einen Julenek, ab Garten mittel einen Julbock, und Kerzen auf allen Simsen.

**E12 Vorlagen W19, W20, T11, T12, T13** (templates/windows.ts, doors.ts; Daten).
Wie in (f). Läden ≤ 0,1, außer bei Chalet.
*Akzeptanz:* Vorlagentests (Drehen, Spiegeln, `templateFits`) grün. W19 nutzt `frame`.

**E13 Parser** (parseDescription.ts:1368–1405; Daten).
- falu, schwedenrot, „rotes Holzhaus“ → falu
- grasdach, torfdach, sodendach → turf
- stabkirche → stave
- stabbur → stabbur
- rorbu, fischerhütte, bootshaus, naust → coast
- „blockhaus“ zusammen mit norwegisch oder Grasdach → laft
- „chalet“ → `shallow` (Querverweis rustic)

*Akzeptanz:* 10 Testsätze ergeben die erwartete Variante. „ohne Grasdach“ wirkt.

**E14 Später: Stabkirche und Trelleborg** (plan.ts; Regel).
T8 und T10.
*Akzeptanz:* Stabkirche „groß“ hat ≥ 2 Staffeln, 4 Drachenköpfe und einen Dachreiter. Lints grün.

---

## Quellen

1. https://minecraft.how/blog/post/viking-longhouse-minecraft-building – Langhaus 30–50 × 12–15, „10–12 blocks of walls“, 45–50°, Firstbaum, 2–3 Überstand, versetzte überdachte Eingänge.
2. https://minecraft.how/blog/post/how-build-snow-cabin-minecraft – Schneehütte 7×8, Überstand 1–2, Schnee als Blöcke auf dem Dach, keine Akazie und kein Wirrholz, ≤ 50 % Fenster.
3. https://minecraft.how/blog/post/build-cottage-minecraft – Holzstapel an der Hauswand, Fenster zurückgesetzt, Kamin 3–4 Blöcke.
4. https://8bittoast.com/minecraft-house-ideas/ – Langhaus aus stripped dark oak, Stroh als Fichtentreppen, Feuerstelle, Schilde per Item Frame.
5. https://www.grabcraft.com/minecraft/viking-house/medieval-houses – Viking House 14×15×13: 367 Stämme, Heu, Erde, Gras.
6. https://www.grabcraft.com/minecraft/small-viking-house/medieval-houses – Small Viking House: liegende und stehende Stämme, Heu.
7. https://www.grabcraft.com/minecraft/viking-fishing-hut/medieval-houses – Fishing Hut: 224 von 416 Stämmen liegend.
8. https://www.grabcraft.com/minecraft/viking-cottage/medieval-houses – Viking Cottage: 164 von 315 Stämmen liegend.
9. https://www.grabcraft.com/minecraft/viking-town-hall/medieval-houses – Town Hall: Stämme, Heu, Erde und Gras.
10. https://www.grabcraft.com/minecraft/viking-church/churches – Viking Church: 719 von 1286 Stämmen liegend, 170 Gras.
11. https://www.minecraftforum.net/forums/show-your-creation/screenshots/1602573-nordic-house-style – Lob für die Gestaltung der Dachenden (nur Text).
12. https://minecraft.wiki/w/Tutorial:Roof_construction_guidelines – 45°/22,5°/63,4°, Dach 1–2 Geschosse, ab 15×15 mehrere Abschnitte.
13. https://minecraft.wiki/w/Snow – Schnee braucht volle Oberseite; Treppen nur kopfüber.
14. https://minecraft.wiki/w/Grass_Block – Gras stirbt unter opaken Blöcken; `snowy`.
15. https://minecraft.wiki/w/Carpet – Teppich hält auf jedem Block außer Luft.
16. https://minecraft.wiki/w/Trapdoor – Zustände; seit 1.9 kein Halt nötig.
17. https://minecraft.wiki/w/Campfire – Rauch 10, mit Heu 24 Blöcke; Licht 15.
18. https://minecraft.wiki/w/Head – Drachenkopf: Zustände, Block-Entity `skull`.
19. https://minecraft.wiki/w/Village – Taiga-Dörfer: Fichte, Stammdächer, Kürbis, Süßbeeren, Heu.
20. https://minecraft.wiki/w/Mangrove_Planks – Kartenfarbe COLOR_RED, voller Formsatz.
21. https://minecraft.wiki/w/Pale_Oak_Planks – Blasseiche, Kartenfarbe QUARTZ.
22. https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/worldgen/configured_feature/birch.json – Vanilla-Birke: Stamm 5 + 0..2, Krone Radius 2, Höhe 3.
23. https://en.wikipedia.org/wiki/Falu_red – #801818; Ton von fast schwarz bis hellrot.
24. https://www.skandium.com/blog/falu-red-the-one-and-only/ – matt; weiße Ecken und Fenster.
25. https://visitsweden.com/summer-house – rote Häuser mit weißen Details, Zaun aus dünnen Kiefern.
26. https://sv.wikipedia.org/wiki/Snickarglädje – Zierschnitzerei an Veranda, Giebel, Fenster (1850–1914).
27. https://sv.wikipedia.org/wiki/Farstukvist – ungeglaster Eingangsvorbau mit Dach, Geländer, Bänken.
28. https://sv.wikipedia.org/wiki/Parstuga – Haustyp mit mittigem Eingang zwischen zwei Stuben.
29. https://en.wikipedia.org/wiki/Stave_church – Schwellen auf Steinsockel, Svalgang, Drachenköpfe, 80–90 % einschiffig.
30. https://de.wikipedia.org/wiki/Stabkirche – gestaffelte Dächer, Türmchen, ca. 750 Kirchen bis zur Reformation.
31. https://en.wikipedia.org/wiki/Borgund_Stave_Church – 4 Drachenköpfe, Firstkämme, Dachreiter, Teer.
32. https://en.wikipedia.org/wiki/Urnes_Stave_Church – Rundbögen; Schiffsdach ca. 2 m über den Seitenschiffen.
33. https://en.wikipedia.org/wiki/Sod_roof – Birkenrinde 6–16 Lagen, Torf 15 cm, Traufstamm.
34. https://no.wikipedia.org/wiki/Torvtak – Neigung 33°/27°/22°, *torvvol* 10–15 cm, Windbretter.
35. https://no.wikipedia.org/wiki/Stabbur – Stelzen 1–1,5 m, Lücke von ca. 30 cm an der Treppe.
36. https://scandinavianheritage.org/stabbur – Treppe berührt das Gebäude nicht; Weihnachtswichtel.
37. https://en.wikipedia.org/wiki/Loft_(building) – Loft im Blockbau, Svalgang; Stabbur fensterlos.
38. https://de.wikipedia.org/wiki/Blockbau – Eckverbindungen mit Vorstoß, Innenwandköpfe außen sichtbar.
39. https://en.wikipedia.org/wiki/Architecture_of_Norway – Blockbau mit verzahnten Ecken, Stabbau, Hof *tun*, Torfdächer.
40. https://no.wikipedia.org/wiki/Dragestil – Drachenköpfe, steile Dächer mit großem Überstand, 1880–1910.
41. https://en.wikipedia.org/wiki/Swiss_chalet_style – breite Traufen, Konsolen, Balkone, gestrichene Schalung.
42. https://en.wikipedia.org/wiki/Chalet – schweres, flaches Dach mit breiter, abgestützter Traufe.
43. https://en.wikipedia.org/wiki/Icelandic_turf_houses – Steinbasis, Torf in Fischgrät, hölzerne Giebel.
44. https://www.routesnorth.com/scandinavia/viking-longhouses/ – 5–7 × 15–75 m, bootsförmig, fensterlos, Rauchloch.
45. https://www.imagininghistory.co.uk/post/viking-longhouses – Stroh- oder Torfdach, Lücken für Licht und Rauch.
46. https://en.wikipedia.org/wiki/Lofotr_Viking_Museum – Borg 83 × 9,5 m, 9 m hoch.
47. https://en.wikipedia.org/wiki/Trelleborg_(Slagelse) – 29,42 m, gebauchte Wände, schräge Stützen, Vorbauten.
48. https://no.wikipedia.org/wiki/Naust – Bootshaus, Giebel zum Wasser, Tor, Slip.
49. https://en.wikipedia.org/wiki/Rorbu – ein Ende auf Pfählen im Wasser.
50. https://en.wikipedia.org/wiki/Roundpole_fence – Pfostenpaare, schräge Stangen, 1,5–2 m.
51. https://de.wikipedia.org/wiki/Giebelschmuck – Pferdeköpfe: verlängerte Windbretter, gekreuzt vor dem First.
52. https://en.wikipedia.org/wiki/Bargeboard – Windbrett, historisch verziert.
53. https://en.wikipedia.org/wiki/Yule_goat – Strohbock mit roten Bändern, Gävle seit 1966.
54. https://en.wikipedia.org/wiki/Christmas_in_Sweden – Adventsleuchter und Sterne in den Fenstern, Stroh, rote Tulpen.
55. https://en.wikipedia.org/wiki/Christmas_in_Norway – Fichtenzweige an der Tür, Julenek, Julebukk.
56. https://no.wikipedia.org/wiki/Julenek – Hafergarbe an einer Stange vor der Scheune, belegt 1753.
57. https://en.wikipedia.org/wiki/Stockfish – Trockengestelle *hjell*, Lofoten.
58. https://arxiv.org/abs/1803.09853 – GDMC: glaubwürdige, an die Karte angepasste Siedlungen.

Intern: `paletten.md` (Nordic), `winter_weihnachten_landschaft.md` (Abschnitt 1), `src/core/style/textureStats.ts` (L\*, C, H).
