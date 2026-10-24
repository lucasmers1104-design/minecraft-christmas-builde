# 03 – Fenster: Typen, Rahmen, Tiefe, Licht und Rhythmus

Stand 2026-10-23. Thema: Wie professionelle Builder Fenster in Vanilla-Minecraft (Java 1.21.11) bauen, also Form, Rahmen, Tiefe, Glas, Licht, Achsen und Giebel, und was davon der Generator als Daten oder Regel übernehmen soll.

Diese Notiz baut auf `research_notes/Minecraft Bautechniken für Generator/fenster_tueren_details.md` auf (im Folgenden „Altnotiz“) und wiederholt deren Blockzustände nicht. Konventionen wie in `src/core/templates/types.ts`: Südfassade, x nach rechts, y = 0 unterste Glaszeile, d = −1 innen, 0 Wand, +1/+2 davor. In Skizzen gilt: `[X]` liegt in d = +1, `{X}` in d = −1, ohne Klammer d = 0.

---

## Kurzfassung

Nach Wirkung sortiert:

1. **Nachts sind alle Fenster schwarz.** Die Räume sind leer, hinter keinem Fenster gibt es Licht. Kerzen stehen nur außen auf den Simsen (`festive.ts:153–159`). Vanilla-Blocklicht „tends toward orange in the middle ranges“ [1]. Jede Lichtquelle hinter dem Glas wirkt deshalb von selbst warm. Vorgeschlagen werden drei Varianten (Technik T10). Die Sohlbank-Leuchte in der Wandebene braucht keine einzige Innenzelle.
2. **Giebel haben nie ein Fenster.** Öffnungen entstehen nur je Geschoss (`openings.ts:221–309`). W11 hat keine Stile (`windows.ts:115`). Auf den Screenshots sind die großen Giebelflächen von Mittelalter, Fantasy und Rustikal leer. Nötig ist eine Giebelregel nach der verfügbaren Höhe (Abschnitt „Giebelfenster“).
3. **Fenster in Fachwerkfeldern stehen linksbündig.** Zentriert wird mit der Feldbreite `w`, nicht mit der Breite der Vorlage (`openings.ts:270–272`). Ein 1 breites W02 sitzt dadurch in einem 3er- oder 4er-Feld am linken Pfosten.
4. **Drei Vorlagen passen nie, fünf werden nie gewählt.** Bei Geschosshöhe 4–5 (alle Stile, `styles.ts` `floorHeight: [4, 5]`) lässt der Höhenfilter (`openings.ts:243`) nur Fenster bis 3 Zeilen zu. W07b (3×4), W08b (5×5) und W13 (3×5) erscheinen also nie. W10, W11, W12, W14 und W18 stehen in keiner Stilliste.
5. **Eine Scheibe ist nie bündig.** Eine Glasscheibe ist 2 px dick und steht mittig im Block [6], liegt in d = 0 also schon 7/16 Block hinter der Wandfläche. Bündig und flach wirken nur Glas*blöcke*. Die Altnotiz („Scheiben bündig in d=0 wirken flach“) ist hier zu korrigieren. W08, W08b, W17 und W17b nutzen Glasblöcke und wirken dadurch flacher als nötig.
6. **Tiefe nach innen statt nach außen.** Glas in d = −1 mit Laibungsblöcken innen ergibt etwa 1 7/16 Block Laibung, ohne dass vor der Wand etwas gebraucht wird (T2). Das hilft genau dort, wo d = +1 durch Ständer, Erker und Traufen belegt ist und Vorlagen heute abgelehnt werden.
7. **Glasfarbe entscheidet, ob man die leeren Räume sieht.** Gemessen an den 1.21.11-Texturen [15]: Klarglas ist im Feld 100 % durchsichtig (191 von 256 px). Buntglas deckt im Feld zu 40 % (Alpha 102) und am Rand zu 64 % (Alpha 163). Leicht getöntes Glas (`light_gray`, `white`, `brown`) verbirgt die leeren Innenräume, kräftige Farben wirken laut [16]. Die Fantasy-Palette mit `purple_stained_glass` (`palettes.ts:153`) ist zu kräftig.
8. **Falltür-Texturen sind Bauteile.** Gemessene Lochanteile: Fichte, Birke, Schwarzeiche und Blasse Eiche sind geschlossen (0 %), also Brettläden. Akazie und Karmesin haben Schlitze (23 % und 16 %), also Lamellenläden und Lüftungsluken. Mangrove hat ein rundes Mittelloch, also ein Bullauge. Eiche und Eisen haben vier Löcher (je 14 %), also Zierläden. Fensterläden und Luken sollen nach Textur gewählt werden, nicht nur nach Holzfarbe (T6).
9. **Läden und Blumenkästen variieren nie.** Die Stilwahrscheinlichkeiten `details.shutters` und `details.flowerBoxes` (`styles.ts:53`, z. B. `:85`) werden nirgends gelesen. Jede Fassade nimmt die erste passende Vorlage, beim Mittelalter fast immer W02. Profis variieren Details und halten den Fenstertyp konstant. Die GDMC-Jury lobte beim Siegerbeitrag ausdrücklich „modular variation“ [24].
10. **Fachwerk braucht Brüstungs- und Sturzriegel.** Im Fenstergefach heißen der untere Riegel Brüstungsriegel und der obere Sturzriegel, ihre Einbauhöhe bestimmt die Fenstergröße [38]. Alle Fenster eines Fachwerkgeschosses sollen auf denselben Riegelhöhen sitzen, und die Riegel laufen durchgehend.
11. **Fenstergruppen statt Einzellöcher als Akzent.** Lanzetten treten „singly, or paired …, or grouped in an odd number with the tallest window at the centre“ auf [27]. Plattenmaßwerk besteht aus zwei schmalen Lichtern mit einer Öffnung darüber [28]. Daraus entstehen Zwillings- und gestaffelte Drillingsfenster, ideal für Giebel und Mittelachsen (W20, W23, W25).
12. **Stockwerkshierarchie.** Die Fensterhöhe variierte zwischen den Geschossen [31]: unten größer, oben kleiner, im Giebel am kleinsten. Heute sind alle Geschosse gleich.
13. **Weihnachtsbrauch Fensterlicht.** Erzgebirgische Schwibbögen werden „in der Advents- und Weihnachtszeit … in die Fenster“ gestellt [50]. Kerzen auf einer Innenbank hinter dem Glas (T10c) sind das stärkste Weihnachtsdetail an Fenstern und machen Fenster von außen lesbar.
14. **Stilgerechte Rahmen:**
    - Mediterran: Faschen, also flache, farblich abgesetzte Umrahmungen [39], dazu tiefe Laibungen und Eisengitter [47].
    - Modern: schlanke Rahmen und Bandfenster („horizontal windows“ [49]) statt dicker Betonkästen.
    - Japanisch: das Gitter (Kōshi) nur im Erdgeschoss [44], oben Shoji ohne Gitter.
15. **Treppen laufen innen vor Rückfenstern.** `buildStairs` läuft nach den Öffnungen an der Rückwand entlang und meidet nur Türfreiräume (`buildHouse.ts:134–135`, `walls.ts:262–273`). „Never have a wall right in front of a window“ [18] gilt sinngemäß auch für Treppen.

---

## Schwächen des aktuellen Generators

### Aus den Screenshots (`docs/screenshots/haus-*.jpg`)

Die Vorschau ist klein, und es gibt nur Tagansichten. Die Beobachtungen sind entsprechend vorsichtig formuliert.

- **Mittelalter (groß, ohne Thema; Weihnachten):**
  - Die Giebelwand aus Stein ist bis zum First geschlossen.
  - Im Fachwerk erscheinen die Fenster als kleine hellblaue Quadrate zwischen dunklen Ständern. Sie lesen sich kaum als Fenster, weil Rahmen, Sims und Ständer dieselbe Holzfarbe haben.
  - Die Gaube über dem Eingang hat nur eine Scheibenspalte.
- **Nordisch (groß, Winter):**
  - Die Traufseiten unter dem tief gezogenen Dach sind praktisch fensterlos.
  - Sichtbar sind nur der Giebel mit Veranda und Laternen am Sockel.
  - Nachts wäre das Haus ein schwarzer Block mit Lichtpunkten am Boden.
- **Rustikal:** Die Fenster sind hinter den kräftigen Ständern kaum zu sehen. Der Giebel über dem Anbau ist leer.
- **Fantasy:** Die große, helle Putzfläche im Giebel bleibt ohne Öffnung, gerade dort, wo ein Rund- oder Zwillingsfenster die Fantasy-Silhouette tragen würde.
- **Modern:**
  - Das obere Fenster ist ein schmales Band unter einer massiven schwarzen Rahmenbox. Der Fensteranteil wirkt für „modern“ viel zu klein.
  - Die Box aus vollen Blöcken (W16, `windows.ts:476–485`) ist schwerer als das Glas.
- **Mediterran:**
  - Die türkisen Läden (`warped_trapdoor`) dominieren die Fassade.
  - Die Fenster sind schmal und flach, weil Glasblöcke statt Scheiben verwendet werden (`windows.ts:499`).
  - Bögen sind in der Vorschau nicht erkennbar.
- **Japanisch:** Das dichte Zaungitter (W15, `windows.ts:465`) liegt auf jedem Fenster aller Geschosse, ohne Unterschied zwischen Erd- und Obergeschoss.
- **Kirschblüte:** Das ist die rhythmisch beste Fassade. Sie wirkt aber gleichförmig, weil dasselbe Gitterfenster überall sitzt.

### Aus dem Code

| # | Befund | Stelle |
|---|---|---|
| C1 | Kein Licht hinter Fenstern, Kerzen nur außen auf den Simsen | `festive.ts:153–159`; `openings.ts` setzt keine Innenzellen |
| C2 | Giebel ohne Fensterlogik, W11 ohne Stil, Dachgauben ohne Vorlage (nur eine Scheibenspalte) | `openings.ts:221–309`; `windows.ts:115`; `components.ts:73` |
| C3 | Fenster im Feld nach der Feldbreite statt nach der Vorlagenbreite zentriert, Vorlagen kleiner als `w` landen links | `openings.ts:270–272` |
| C4 | Höhenfilter `t.height <= rows - 1` bei `rows` = 3–4: W07b, W08b und W13 werden nie gesetzt | `openings.ts:243`; `styles.ts:74 ff.` |
| C5 | Stil-Detailwahrscheinlichkeiten für Läden und Blumenkästen ungenutzt, die Vorlagenreihenfolge entscheidet allein | `styles.ts:53/85/112/139/166/195/222/249/276` |
| C6 | Unbenutzte Vorlagen: W09 nur als Erker, W10, W11, W12, W14, W18 in keiner Stilliste. W18 fehlt auch bei Thema Winter oder Weihnachten | `windows.ts:104–123`; `styles.ts:82,109,136,163,192,219,246,273` |
| C7 | Glasblöcke statt Scheiben in W08, W08b, W17 und W17b ergeben bündiges, flaches Glas | `windows.ts:300, 320, 499, 516` |
| C8 | W05 baut den Blumenkasten 2 Blöcke tief (d = +2) und wird an Traufen und Veranden oft abgelehnt. Im Winter oder an Weihnachten blühen Tulpen und Margeriten | `windows.ts:189–199, 253–255` |
| C9 | W15-Gitter: ein Zaun vor *jeder* Glaszelle in allen Geschossen | `windows.ts:465` |
| C10 | Treppe an der Rückwand kann direkt hinter einem Fenster hochlaufen | `walls.ts:262–273`; `buildHouse.ts:134–135` |
| C11 | Alle Geschosse haben dieselbe Fensterhöhe; Turmfenster sind immer 1×2 | `openings.ts:247`; `roundTower.ts:141–167` |
| C12 | Notfenster `plainWindow`: Scheibenspalte mit Sims, ohne Sturz | `openings.ts:94–107` |
| C13 | Kräftiges Buntglas in der Fantasy-Palette; alle anderen nutzen Klarglas, man sieht die leeren Räume | `palettes.ts:60, 83, 106, 130, 153, …` |

---

## Techniken und Regeln

### T1 Scheibe in d = 0 als kostenlose Laibung

- **Beschreibung:** Eine `glass_pane` ist ein mittiges, 2 px dickes Blatt [6], liegt also schon 7/16 Block hinter der Wandfläche. Ein Glasblock dagegen füllt die Zelle und ist bündig.
- **Folge:** Glasblöcke nur dort, wo eine Scheibe sich nicht verbinden kann (neben Treppenschrägen in Rundfenstern) oder wo es bewusst bündig sein soll (moderne Glasfront, horizontale Oberlichter). „It is best to use glass panes as glass panes give more depth“ [16].
- **Skizze** (Draufsicht einer Wandzelle in px, außen unten):

```
Glasblock d=0     |################|   bündig
Scheibe d=0       |.......##.......|   Glas bei px 7–8 → 7/16 zurück
Scheibe + Rahmen  Rahmen d=+1 davor → Glas 1 7/16 hinter Rahmenfront
```

- **Einsatz:** alle Stile.
- **Wirkung/Aufwand:** hoch/niedrig.
- **Quellen:** [6], [16].

### T2 Tiefe Nische: Glas in d = −1

- **Beschreibung:** Die Öffnung bleibt in d = 0 frei (Luft). Die Scheibe steht in d = −1 zwischen Laibungsblöcken innen. Von außen ist das eine etwa 1,5 Block tiefe, schattige Laibung ohne Bauteil vor der Wand. Innen entsteht ein Kasten von (w+2)×(h+2) Blöcken, der wie eine dicke Wand wirkt.
- **Blöcke:**
  - Glas: `glass_pane` oder `*_stained_glass_pane` in d = −1.
  - Laibung: Wandmaterial des Geschosses in d = −1 bei x = −1, x = w, y = −1 und y = h.
  - Sturz: optional als Balken (`frame`, axis=x) in d = 0 bei y = h.
- **Skizze** (Schnitt, Blick nach Osten, 1×2):

```
        d=-1  d=0   d=+1
y=2      W     L     .        L = stripped_spruce_log[axis=x] (Sturz, optional)
y=1      P     .     .        P = glass_pane, verbindet sich mit W links/rechts in d=-1
y=0      P     .     .        . = Luft (Laibung)
y=-1     W     #    [S]       W = Wandblock innen, # = Wand, S = optionales Sims
```

- **Einsatz:**
  - mediterran: dicke Putzwände, kleine Fenster [47]
  - mittelalterlicher Stein und Burg: tiefe Fensternischen
  - Fachwerkgeschosse, in denen d = +1 durch Ständer voll ist
- **Regeln:**
  - d = −1 muss frei sein, also keine Treppe, Leiter oder Raumwand.
  - Die Zellen kommen in `reserved`.
  - Nur bei w ≤ 3.
  - In Nischen stehen Kerzen geschützt: `candle` in d = 0, y = 0 auf dem Wandblock (Weihnachten).
- **Wirkung/Aufwand:** hoch/mittel.
- **Quellen:** [6], [13] („circular framed windows, which have an outer frame with the glass placed behind“); Einschätzung für die Innenkasten-Lösung.

### T3 Drei Formen pro Fenster

- **Beschreibung:** Rahmen, Sims und Verdachung bestehen aus *verschiedenen* Formen (Säule, Kopfüber-Treppe, Platte oder Falltür), nicht dreimal aus demselben Block. Jede Form wirft eine andere Schattenkante. „Frame your windows and doors … so they sit in the wall instead of floating on it“ [21]. Treppen kopfüber für Rahmen, Stufen und Falltüren für Simse [22].
- **Regel:** Rahmen (Säule) + Sims (Kopfüber-Treppe oder Platte) + Verdachung (Platte, Treppe oder Giebel), mindestens zwei Tiefenebenen. Für Stile mit Rahmen zusätzlich ΔL ≥ 15 (bereits als Lint vorhanden).
- **Wirkung/Aufwand:** hoch/niedrig, die Vorlagen machen das größtenteils schon.

### T4 Verdachungen (Sturzformen)

| Variante | Zellen (d = +1, y = h) | Stil |
|---|---|---|
| a) Gerade Platte | `slab[type=top]`, x = −1…w (W02, W04) | rustikal, nordisch |
| b) Gesims | Kopfüber-Treppe `stairs[facing=north,half=top]`, x = −1…w | Stein, Mittelalter |
| c) Dreiecksgiebel | Treppe ↗ + Block + Treppe ↖, Platte als First | mediterran, Fantasy, Stadthaus |
| d) Tudor-Haube mit Abläufen | Gesims b) + je eine Kopfüber-Treppe darunter bei x = −1 und x = w, y = h−1 | Tudor, Mittelalter |
| e) Segmentbogen | Eckentreppen `corner(...,'top')` in der obersten Glaszeile | mediterran |

Tudor-Fenster hatten „hood moulds above to shed the rain“ [29]. Skizze c), 1×2, Front:

```
      x=-1   x=0    x=1
y=3          [_]            _  = <roofTrim>_slab[type=bottom]
y=2   [E]    [#]    [W]     E  = <roofTrim>_stairs[facing=east,half=bottom], W = …[facing=west,half=bottom]
y=1   [L|]    P     [L|]    #  = <roofTrim> Block;  L| = Rahmenpfosten axis=y (d=+1)
y=0   [L|]    P     [L|]    P  = glass_pane (d=0)
y=-1  [S]    [S]    [S]     S  = Sims (Kopfüber-Treppe)
```

Skizze d), 2×2, Front:

```
      x=-1  x=0  x=1  x=2
y=2   [H]   [H]  [H]  [H]    H = <roofTrim>_stairs[facing=north,half=top] (Haube)
y=1   [H]    P    P   [H]    H bei x=-1/x=2, y=1 = Abläufe (label stops), gleicher Zustand
y=0    L|    P    P    L|    L| = Rahmen in d=0
y=-1  [_]   [_]  [_]  [_]    _ = slab[type=top] (schlanke Bank)
```

**Wirkung/Aufwand:** mittel/niedrig.

### T5 Simsvarianten

- **Kopfüber-Treppe** (heute Standard): kräftig, trägt Kerzen und Töpfe.
- **Platte** `slab[type=top]` in d = +1: halb so hoch, eleganter, für modern und Shoji.
- **Geschlossene Falltür** `trapdoor[facing=south,half=top,open=false]` in d = +1: nur 3/16 dick [7], für zierliche Fenster und Fantasy.
- **Ohrensims:** Treppenreihe um 1 über den Rahmen hinaus (x = −2…w+1), passend zu Faschen und Barock.
- **Regel:** Das Sims ist gleich breit wie die Verdachung. Bei Läden reicht das Sims unter die Läden, sie „stehen“ darauf (W04 macht das richtig).
- **Wirkung/Aufwand:** mittel/niedrig.

### T6 Falltüren nach Textur wählen (eigene Messung)

Die Alpha-Masken der 16×16-Texturen aus `misode/mcmeta@1.21.11-assets` wurden ausgewertet: Pixel mit Alpha < 128 gelten als Loch [15].

| Falltür | Löcher | Muster | Verwendung |
|---|---|---|---|
| `spruce_trapdoor`, `birch_trapdoor`, `dark_oak_trapdoor`, `pale_oak_trapdoor` | 0/256 | geschlossen | Brettladen, Brüstungspaneel, Blumenkasten-Front |
| `oak_trapdoor`, `iron_trapdoor` | 36/256 | 4 Quadrate 3×3 px (2×2) | Zierladen, Stalltür-Optik; *kein* Sprossenfenster, da nur 14 % offen |
| `cherry_trapdoor` | 36/256 | 9 Löcher 2×2 px (3×3) | Zierladen, Fantasy, Kirschblüte |
| `jungle_trapdoor` | 42/256 | Gitter | Zierladen |
| `acacia_trapdoor` | 60/256 | 3 senkrechte Schlitze | Lamellenladen, Lüftung |
| `crimson_trapdoor` | 40/256 | 4 waagerechte Schlitze | Lamellenladen (Persiane), Giebelluke |
| `mangrove_trapdoor` | 32/256 | runde Mittelöffnung 6×6 px | Bullauge, Turmluke |
| `warped_trapdoor` | 55/256 | Ornament | Filigranladen (mediterran heute) |
| `bamboo_trapdoor` | 44/256 | Rautenmuster | japanisch, Kirschblüte |
| `waxed_copper_trapdoor` | 52/256 | Ornament | Steampunk, modern-industriell |
| `waxed_copper_grate` (Block) | 77/256 | Gitter | „look like leaded windows“ [17], Mittelalter- und Kirchenfenster ohne Glas |
| `iron_bars` | 140/256 | senkrechte Stäbe | Fenstergitter, Schießscharte, Reja |

- **Regel für Läden:** Ein *Brettladen* nimmt eine geschlossene Textur (Fichte, Schwarzeiche). Ein *Lamellenladen* oder eine *Persiane* nimmt Akazie oder Karmesin. Warped bleibt als türkiser Farbakzent, zeigt aber Filigran, keine Lamellen. Läden „fast immer rein dekorativ“, zweiflüglig passend zur Fenstergröße [41].
- **Nachteffekt:** Gelochte Läden vor einem beleuchteten Fenster zeigen leuchtende Punkte oder Schlitze (Einschätzung, folgt aus dem Licht durch transparente Pixel).
- **Wirkung/Aufwand:** mittel/niedrig, nur Daten in `palettes.ts` (`shutter`) und `windows.ts`.

### T7 Läden: Maße, Zustände, Variation

- **Maße:** Ein Laden ist so hoch wie das Glas. Je Seite 1 Block bei w ≤ 2 (dann deckt jeder Laden rechnerisch die Hälfte), bei w ≥ 3 keine Läden. Auf größeren Bauten wirken Läden richtig, auf kleinen schnell zu klein [23]. Mindestens 1 Wandblock zwischen den Läden zweier Fenster [23].
- **Variation:** Auf einer Fassade gleicher Fenstertyp, aber
  - etwa 10–15 % der Fenster mit *einem* zugeklappten Laden (halb geschlossen),
  - etwa 5 % ganz geschlossen,
  - nie zwei geschlossene Fenster nebeneinander (Einschätzung).
- **Zugeklappter Laden:** Falltür `facing=south,open=true` in d = +1 *vor* der Glaszelle. Sie liegt dann flach an der Wand, wie der offene Laden, nur um w Spalten versetzt.

```
W04c halb geschlossen (2×2), Front
      x=-1  x=0  x=1  x=2
y=1   [T^]   P   [T^]  .      T^ = <shutter>_trapdoor[facing=south,half=top,open=true]
y=0   [T_]   P   [T_]  .      T_ = …[half=bottom]; bei x=1 der zugeklappte rechte Laden
y=-1  [S]   [S]  [S]  [S]
```

- **90° geöffnete Läden** (`sideBoard`, Altnotiz Variante B) erzeugen echte Schatten. Sie brauchen eine freie Spalte in d = +1 neben dem Fenster und passen zu W04 bei `density='few'`.
- **Wirkung/Aufwand:** mittel/niedrig.

### T8 Sprossen, Pfosten, Kämpfer

- **Beschreibung:**
  - Die Vanilla-Glastextur hat einen deckenden 1-px-Rand (gemessen [15]). Ein 2×2-Scheibenfenster liest sich deshalb schon als vier Felder mit hellen Sprossen.
  - Echte Teilungen entstehen über Pfosten (Mullion) und Kämpfer (Transom) aus der Rahmenrolle in d = 0.
  - Kleine Scheiben in einem Raster galten als „more architecturally attractive than large panes“ [26]. Das Pfosten- und Kämpferfenster ist „the most immediately identifiable feature of Elizabethan architecture“ [29].
- **Skizze W20b** (Kreuzstock 3×3, Front, alles d = 0 außer Sims und Verdachung):

```
      x=-1 x=0  x=1  x=2  x=3
y=3    L-   L-   L-   L-   L-     + [slab top] x=-1..3 in d=+1
y=2    L|   P    L|   P    L|     L| = <frame>[axis=y], L- = <frame>[axis=x]
y=1    L|   L-   L|   L-   L|     Kreuzungspunkt (1,1) = L|
y=0    L|   P    L|   P    L|     P  = glass_pane (verbindet sich mit den vollen Flächen der Pfosten)
y=-1  [S]  [S]  [S]  [S]  [S]
```

- **Varianten:**
  - W20: gekuppeltes Fenster 3×2 mit einem Mittelpfosten, 2 Lichter.
  - W20c: Drilling 5×2 mit Pfosten bei x = 1 und x = 3, ein Tudor-Fensterband.
- **Eisengitter als Sprosse:** wie in W13, aber nur bei Buntglas. Gitter vor Klarglas wirkt wie ein Gefängnis (Einschätzung).
- **Kein Sprossenfenster aus Falltür-Überlagerung:** Oak- und Iron-Falltüren decken 86 % (T6), das wirkt wie ein Laden mit Gucklöchern.
- **Wirkung/Aufwand:** hoch (Mittelalter, Tudor, Fantasy) / niedrig.

### T9 Faschen: flache Umrahmung im Putz

- **Beschreibung:** Eine Fasche ist eine „gestalterisch abgesetzte Umrahmung von Fassadenöffnungen“. Sie kann erhaben, vertieft oder rein farblich sein, aus Putz, Stuck oder Holzbrettern [39]. Im Spiel: ein 1 Block breiter Ring in d = 0 aus der Rolle `roofTrim` um die Öffnung, bündig mit der Wand. Dazu ein schlankes Sims (Platte). Optional Läden über den Faschenseiten in d = +1.
- **Skizze** (W29, 1×2, Front):

```
      x=-1  x=0  x=1
y=2    F     F    F      F = <roofTrim> Block in d=0 (mediterran: smooth_quartz auf white_concrete,
y=1    F     P    F          sandstone auf smooth_sandstone; Fantasy: spruce_planks auf white_terracotta)
y=0    F     P    F
y=-1   F    [_]   F      [_] = <roofTrim>_slab[type=top] in d=+1 (nur unter dem Glas)
```

- **Einsatz:** mediterran, Fantasy-Putz, alpenländisch (Einschätzung: Gebirgs-Mischstil).
- **Wirkung/Aufwand:** mittel/niedrig.
- **Quellen:** [39], [47].

### T10 Licht hinter dem Glas

Ohne Licht sind leere Räume nachts schwarz. Vanilla-Blocklicht hat in den mittleren Stufen einen orangen Ton, Himmelslicht am Tag ist weiß [1]. Das ergibt genau „gelbes Licht + kalter Schnee“. Lichtstufen in Java [1]:

| Lichtquelle | Stufe |
|---|---|
| `lantern`, `glowstone`, `shroomlight`, Froglights, `jack_o_lantern`, `campfire`, `waxed_copper_bulb[lit=true]` | 15 |
| `end_rod`, Fackeln | 14 |
| `soul_lantern` | 10 |
| Kerzen | 3 je Kerze, bis 12 |

**Varianten nach Priorität:**

**a) Sohlbank-Leuchte**, ohne Innenzelle:
- Ein Licht*block* ersetzt in d = 0 bei y = −1 den Wandblock direkt unter dem Glas. Außen verdeckt ihn das Sims vollständig: Die Kopfüber-Treppe hat ihre volle Seite zur Wand.
- Das Licht geht durch die Scheibe nach außen und innen. Die Fassade um das Fenster und der Boden davor werden warm beleuchtet.
- Blöcke: `ochre_froglight[axis=y]` (gelb, #f9efa5 [12]), `shroomlight` (orange) oder `glowstone`. Für modern: `pearlescent_froglight`, `waxed_copper_bulb[lit=true,powered=false]`.
- Der Kupferbulb „does not need continuous power to emit light“ [2] und bleibt bei Nachbar-Updates an. **Nicht** `redstone_lamp` (nicht in Registry): Er geht ohne Strom nach 4 Ticks aus [3].

```
Schnitt
        d=-1  d=0   d=+1
y=0      .     P     .
y=-1     .     Q    [S]      Q = ochre_froglight[axis=y]; S = <roofTrim>_stairs[facing=north,half=top]
y=-2     .     #     .
```

**b) Laterne an Kette hinter dem oberen Glas**, mit Innenzellen:
- `iron_chain[axis=y]` in d = −1 von der Decke bis y = h, darunter `lantern[hanging=true]` bei y = h−1. Ketten tragen sich selbst, die Laterne verbindet sich nahtlos [10].
- Von außen sieht man die Laterne *im* Fenster: das stärkste „bewohnt“-Signal.
- Regel: nur wenn die Decke (y = h+1 in d = −1) existiert. Bei `rows = 3` hinge die Laterne auf Kopfhöhe, dort lieber a) nehmen.

```
Schnitt (rows=4: Boden y0, Glas y0+2..y0+3, Decke y0+5)
         d=-1   d=0   d=+1
y=3       F      #     .       F = Geschossboden (Decke des Raums)
y=2       C      L    [_]      C = iron_chain[axis=y] ; L = Sturz
y=1       *      P     .       * = lantern[hanging=true]
y=0       .      P     .
y=-1      .      #    [S]
```

**c) Lichterbogen oder Adventskerzen** (Weihnachten):
- Innenbank `slab[type=top]` (Rolle `floor`) in d = −1, y = −1, darauf Kerzen in d = −1, y = 0 hinter der unteren Glaszeile.
- Kerzen stehen nur auf festen Flächen, bis 4 gleiche je Block, je Kerze +3 Licht [11].
- Bogenprofil: w = 1 → [3]; w = 2 → [2, 2]; w = 3 → [2, 4, 2]; w = 4 → [1, 3, 3, 1].
- Farbe `white_candle`, an Weihnachten 1 von 3 Fenstern `red_candle`.

```
Front (3×2), {n} = n Kerzen in d=-1 hinter der Scheibe
      x=-1  x=0   x=1   x=2   x=3
y=1    L     P     P     P     L
y=0    L    P{2}  P{4}  P{2}   L
y=-1  [S]   [S]   [S]   [S]   [S]
```

**d) Deckenlicht** (modern):
- `waxed_copper_bulb[lit=true]` oder `pearlescent_froglight` als Deckenblock 1–2 Blöcke hinter dem Bandfenster.
- Das ist ein Element der Decke, also kein Mobiliar.

**Dichte (Einschätzung):**
- je Fassade 50–70 % der Fenster beleuchtet, an Weihnachten 70–85 %
- je Fenster eine Variante, deterministisch aus dem Seed
- nie alle Fenster gleich
- Lichtquellen der Stufe 15 schmelzen Schnee im Umkreis von 2 Blöcken (Altnotiz, Wiki). Sicher sind ≥ 3 Blöcke Taxicab-Abstand zu jeder `snow`-Schicht. Variante a) liegt nur 2 Blöcke unter der Simsoberseite: Fenster mit verschneitem Sims bekommen b) oder c), oder das Sims bleibt ohne Schnee.

**Wirkung/Aufwand:** sehr hoch / mittel.

**Quellen:** [1], [2], [3], [10], [11], [12], [20] (Shroomlights hinter Holz), [21] („hidden glowstone … warm light at night makes any build feel alive“), [50].

> **Entscheidung für den Creative Director:** b) und c) setzen 1–2 Blöcke in den Innenraum. Variante a) kommt ohne aus. Vorschlag: a) als Standard, b) und c) nur mit der Option „Fensterlicht innen“ und an Weihnachten.

### T11 Fenstergruppen und Akzentfenster

- **Zwilling** W20: zwei Lichter, ein Pfosten. **Gestaffelter Drilling** W25: mittleres Licht eine Zeile höher („tallest window at the centre“ [27]). **Gekuppelter Spitzbogen mit Scheitelscheibe** W23: Plattenmaßwerk [28].
- **Venezianisches Fenster:** mittleres Rundbogenlicht, zwei schmalere rechteckige Seitenlichter, „placed singly“ [32]. Als Akzent über der Tür im 1. OG oder im Giebel.
- **Regel:** je Fassade höchstens **ein** Akzentfenster, immer auf der Symmetrieachse (Tür oder First) (Einschätzung, gestützt auf [37]).
- **Skizze W23** (3×3, Front):

```
      x=-1   x=0    x=1    x=2    x=3
y=3   [L-]   [L-]   [L-]   [L-]   [L-]     Bogen-Riegel (frame, axis=x) in d=+1
y=2   [L|]   [Sw]    P     [Se]   [L|]     Sw/Se = <frame>_stairs[facing=west|east,half=top] in d=+1,
y=1   [L|]    P      L|     P     [L|]     davor; dahinter durchgehend Glas in y=2 (Scheitel)
y=0   [L|]    P      L|     P     [L|]     L| bei x=1 = Mittelpfosten in d=0
y=-1  [S]    [S]    [S]    [S]    [S]
```

- **Wirkung/Aufwand:** hoch/niedrig.
- **Stile:** Mittelalter, Fantasy, nordisch (Giebel), Kirschblüte (ohne Bogen).

### T12 Kastenerker, 1 tief

- **Beschreibung:** Ein kleiner Erker, „protrudes from the main wall … but does not reach to the ground“, getragen von Konsolen [33]. Glas in d = +1, die Nische in d = 0 ist frei. Unten Kopfüber-Treppen als Konsole und Boden, oben ein Treppendach.
- **Unterschied zu W09:** passt in Fassaden mit nur 1 freier Tiefe und braucht 4 Spalten.
- **Skizze** (W24, 2×2, Schnitt):

```
        d=-1  d=0   d=+1
y=2      .     #    [R]     R = <roof>_stairs[facing=north,half=bottom] (Dach, x=-1..2)
y=1      .     .    [P]     P = glass_pane in d=+1 (x=0..1); Pfosten [L|] bei x=-1, x=2
y=0      .     .    [P]     d=0: Luft (Nische)
y=-1     .     #    [S]     S = <roofTrim>_stairs[facing=north,half=top] (Konsole, x=-1..2)
```

- **Stile:** rustikal, nordisch, Fantasy, Stadthaus.
- **Wirkung/Aufwand:** mittel/niedrig.

### T13 Kleine Sonderöffnungen

- **Bullauge** W26: `glass_pane` in d = 0 und `mangrove_trapdoor[facing=south,half=bottom,open=true]` in d = +1 davor; die runde Öffnung von 6×6 px zeigt das Glas. Für Türme, kleine Giebel, Fantasy.
- **Lamellenluke** W27: `crimson_trapdoor[facing=north,open=true]` (oder `acacia_trapdoor`) in d = 0. Bei `facing=north` liegt das Blatt an der Außenkante, also bündig. Dahinter liegt der Dachraum. Für Giebel in rustikal und nordisch, Scheunen.
- **Schießscharte ohne Glas:** 1×2 oder 1×3 Luft bzw. `iron_bars` in d = 0, im Turm über die Stockwerke versetzt (wie `roundTower.ts` schon rotiert).
- **Wirkung/Aufwand:** mittel/niedrig.

### T14 Modern: schlanke Rahmen, Bänder, Brüstungen

- „Many times modern builds have their windows from floor to ceiling“; neutrale Glasfarben (grau, schwarz, weiß, cyan, hellblau, braun) [16]. Bandfenster: „columns delineate the edges of horizontal windows“, die Fassade ist frei vom Raster [49].
- **Schlankes Band** W16e: Scheiben w×h, oben `slab[type=bottom]`, unten `slab[type=top]` aus `frame` in d = +1, keine Seitenpfosten. Pfosten in d = 0 bei jedem 3. Licht (x mit (x+1) mod 3 = 0, x < w−1).
- **Vertikalstreifen:** Fenster übereinander mit Brüstungsfeld in d = 0 auf Deckenhöhe aus `tinted_glass`. Es ist sichtbar durchsichtig, sperrt aber Licht [4] und wirkt als dunkle Glasbrüstung, sodass jede Achse wie ein durchgehender Glasstreifen aussieht (Einschätzung).
- **Eckfenster** (Regel, keine Vorlage): Die letzte Zelle zweier angrenzender Fassaden ist Scheibe. Der Auflöser bildet die L-Form.
- **Wirkung/Aufwand:** hoch (modern) / mittel.

### T15 Japanisch und Kirschblüte

- **Kōshi** (Holzgitter) gehört an die Straßenfront im Erdgeschoss, vorstehend als *degōshi*. Das Obergeschoss hat *mushiko-mado* in Lehmputz [44]. Shoji „diffuse sunlight“ [43], Teehäuser haben kleine Shoji-Fenster [46]. Katōmado sind glockenförmige Fenster in Tempeln, Schreinen und Burgen [45].
- **Regeln:**
  - W15 mit Gitter nur im Erdgeschoss.
  - Obergeschoss W15c (Shoji ohne Gitter) oder Mushiko: 3×1 aus `dark_oak_fence` in d = 0 ohne Glas (Einschätzung).
  - Bei `white_stained_glass_pane` zeichnet der dichtere Texturrand (Alpha 163 gegenüber 102 [15]) ein feines Blockraster, das wie Kumiko-Leisten wirkt.
  - Kirschblüte: Rundfenster W08 mit weißem Buntglas als Akzent (ein Fenster je Fassade).
- **Wirkung/Aufwand:** mittel/niedrig.

---

## Fenstertypen nach Stil und Größe

| Stil | Hauptfenster (EG / OG) | Größe | Akzent (max. 1 je Fassade) | Giebel | Glas (`window`) | Läden / Deko | Fensteranteil (Einschätzung) |
|---|---|---|---|---|---|---|---|
| medieval | W02, W03, W20 (Pfosten), W06 | EG 1×2, 2×2; OG 1×2 | W23, W22 (Haube) | W20 oder W25, 1×2 mit Läden | `glass_pane` oder 10 % `brown_stained_glass_pane` | Brettläden Fichte, Schwarzeiche | 10–18 % |
| fantasy | W07, W20b, W24 | 2×3, 3×3 | W08 rund, W23 | W08 / W08b / W11 / W26 | `light_gray`, `white`; Bleiglas W13 nur Akzent | Zierläden `cherry_trapdoor`, Töpfe | 15–25 %, Größen bewusst ±1 („mismatched“ [30]) |
| rustic | W04, W02, W05 (kompakt), W24 | 1×2, 2×2 | W24 Kastenerker | W27 Luke, W04 1×2 | `glass_pane` | Fichte geschlossen, Blumenkasten 30 % | 12–20 % |
| nordic | W02, W06, W28 | 1×1, 1×2 (klein) | W26 Bullauge | W26, W27, W25 klein | `gray`/`brown_stained_glass_pane` | Schwarzeiche-Läden; Winter: Kerzen innen | 8–14 % |
| japanese | EG W15 (Gitter), OG W15c / Mushiko | Bänder 3–5 × 2 | Katōmado (Tempel) | keins (Walm) | `white_stained_glass_pane` | keine Läden | EG 30–50 %, OG 10–20 % |
| cherry | W15c, W03, W08 | 2×2, 3×2 | W08 weiß | W08 | `white_stained_glass_pane` | `cherry_trapdoor` Zierladen | 20–30 % |
| modern | W16e, W16, W01 | Bänder 5–8 × 2, Glasfronten | Eckfenster | – | `light_gray_stained_glass_pane`, `glass_pane` | keine | 35–60 % |
| mediterranean | W29 (Faschen), W28 (Nische), W17 (Scheiben) | klein: 1×2, 2×2; Bogen 2×3 | W21 Dreiecksgiebel | W11 Okulus | `glass_pane` | Lamellen: `warped`, `crimson` oder `acacia`; `iron_bars`-Gitter | 10–18 % |

Herkunft der Spalte „Fensteranteil“:

- **Mittelalter klein:** Builder-Konsens und Altnotiz.
- **Tudor „more glass than wall“** [29] nur beim Pfostenfenster.
- **Modern:** Bänder und „floor to ceiling“ [16], [49].
- **Mediterran:** kleine Öffnungen in dickem Putz (Einschätzung, gestützt auf [47]).

Der Generator misst heute etwa:

- eine Fassade von 11 Spalten, 4 Zeilen, mit 2 × W04 1×2: 4/44 ≈ 9 %
- dieselbe Fassade mit einem W16 5×2: 10/44 ≈ 23 %, für modern zu wenig

---

## Glas und Tönung

| Glas | Gemessen [15] | Wirkung | Einsatz |
|---|---|---|---|
| `glass_pane` | Feld 100 % klar, deckender Rand + Schlieren | zeigt den Innenraum | überall, wenn Licht innen (T10) |
| `white_stained_glass_pane` | RGB 255/255/255, Feld-Alpha 0,40 | milchig, „cloudier look“ [13] | japanisch, Kirschblüte, Badfenster, Schnee-Szenen sparsam |
| `light_gray_stained_glass_pane` | 153/153/153 | Spiegelglas, verbirgt Leere | modern, Fantasy |
| `gray_stained_glass_pane` / `black_stained_glass_pane` | dunkel (nicht gemessen, gleiches Alpha-Schema wie alle Buntgläser) | Sonnenschutzglas | modern (Akzent), nordisch dunkel |
| `brown_stained_glass_pane` | 102/76/51 | „muddy“ [13], Altglas | 5–15 % der Fenster in Mittelalter und rustikal als Patina |
| `yellow_` / `orange_stained_glass_pane` | 229/229/51 bzw. 216/127/51 | Tags künstlich „leuchtend“, sehr gesättigt | nur Bleiglas-Akzente und Giebel-Okulus an Weihnachten |
| `tinted_glass` (nur Block, keine Scheibe [4]) | sperrt Licht | dunkel, lichtdicht | Brüstungsfelder modern; **nie** vor Fensterlicht |
| `waxed_copper_grate` | 30 % offen | Butzen- und Bleiglas-Optik [17], [40] | Kapellen, Fantasy, Mittelalter-Giebel |

Regeln:

1. **Je Haus eine Glasart.** Höchstens 10–15 % der Fenster bekommen eine Variation (braun bzw. hellgrau), nie benachbart (Einschätzung). Mehrere kräftige Farben nur im Bleiglasfenster („I wouldn't use red unless …“ [16]).
2. **Fantasy-Palette `fantasy_crimson`:** `purple_stained_glass` → `light_gray_stained_glass`. Lila nur in W13-Bleiglas.
3. **Butzenscheiben** waren grünliches Waldglas in Bleifassung [40]. Im Spiel kommen sie am nächsten mit `waxed_copper_grate` oder einem Bleiglas-Muster aus `glass_pane` und `iron_bars`, nicht mit `lime_stained_glass_pane` (zu grell, Einschätzung).

---

## Fenstertiefe

| Technik | Tiefe der Glasfläche hinter der Fassade | Braucht d = +1 | Braucht d = −1 |
|---|---|---|---|
| Glasblock d = 0 | 0 | nein | nein |
| Scheibe d = 0 | 7/16 | nein | nein |
| Scheibe d = 0 + Rahmen d = +1 (W06) | 1 7/16 | ja, ganzer Rahmen | nein |
| Scheibe d = −1, Nische (W28) | 1 7/16 (bezogen auf die Wand) | nein | ja |
| Scheibe d = −1 + Rahmen d = +1 | 2 7/16 | ja | ja (Burg, Kathedrale) |
| Erker (W09/W24) | −1 bzw. −2 (Glas *vor* der Wand) | ja | nein |

**Regel:** Ist d = +1 belegt (Ständer, Jetty-Konsolen, Traufe), nimmt `openings.ts` W28 statt der Vorlage ohne Tiefe. So erfüllt jedes Fenster „mindestens ein Tiefenelement“.

---

## Fensterachsen, Rhythmus und Verhältnis

- **Achse:** Eine Fensterachse ist die „gedachte senkrechte Mittellinie übereinander liegender Fensteröffnungen“. Sie gliedert die Fassade zusammen mit den Geschossen [37]. Das gilt im Code bereits.
- **Ungerade Achsenzahl** auf symmetrischen Fassaden: Mittelachse = Tür oder Akzent (Petit Trianon: 5 Achsen, Mittelrisalit 3 [37]). Georgianisch „regularly placed on a grid“ [31].
- **Zentrierung im Feld:** `u0 = panel.u0 + floor((width − t.width) / 2)`. Ungerade Felder bekommen bevorzugt ungerade Vorlagenbreiten, gerade Felder gerade (Fehler C3).
- **Pfeilerbreite p** zwischen Fensterfeldern (äußere Kante zu äußerer Kante), Einschätzung je Stil:

| Stil | Pfeilerbreite p | Abstand zur Gebäudeecke |
|---|---|---|
| Mittelalter, Nordisch | p ≥ max(2, w) | ≥ 2 |
| Rustikal | p ≥ 2 | ≥ 1, mit Läden ≥ 2 |
| Mediterran | p ≥ w + 1 | ≥ 2 |
| Fantasy | p = 2 ± 1 (Jitter erlaubt, Achsen bleiben fest) | ≥ 1 |
| Modern (Band) | p = 0 | 0, Eckfenster |
| Japanisch EG | p = 0 (nur Pfosten) | – |

- **Geschosshierarchie:**
  - EG-Höhe ≥ OG-Höhe ≥ Giebelhöhe [31].
  - Breite gleich, damit die Achsen fluchten.
  - Bei `rows = 4`: EG 1×2 oder 2×3, OG 1×2, Giebel 1×1 oder 1×2.
- **Riegelregel (Fachwerk):**
  - Sims bzw. Brüstungsriegel und Sturz bzw. Sturzriegel aller Fenster eines Geschosses auf gleicher Höhe [38].
  - Der Riegel (`beam`, axis entlang der Fassade, d = +1 wie die Ständer) läuft durch alle Felder mit Fenstern.
  - Felder ohne Fenster bekommen weiter Streben.
- **Fensterbrüstung:** Die Unterkante sitzt 1 Block über dem Boden („one to two blocks above the ground, easy to see out“ [13]). Das gilt heute bei `rows ≥ h + 2`.
- **Innenbezug:** „Windows should be in the middle of a room wall, or at least have one block between it and the interior wall“ [18]. Dasselbe gilt für Treppen und Leitern (Fehler C10).
- **Typen:** höchstens 1 Haupttyp + 1 Akzent je Fassade. Variiert werden nur Details (T7, T10). Hinweis: Das GDMC-Siegersystem nutzt modulare Varianten [24]. Die Fenster des frühen GDMC-Beispielgenerators entstehen durch zellulären Automaten aus Glas und Stein [25], also ohne Regeln. Unser Ansatz mit Vorlagen ist dem überlegen, braucht aber die Variation.
- **Durchsicht:** Bei Haustiefe ≤ 7 und gegenüberliegenden Fenstern auf derselben Achse sieht man durchs Haus. Entweder Fensterlicht (T10) oder auf der Rückseite um 1 Spalte versetzte bzw. getönte Fenster (Einschätzung, niedrige Priorität).

---

## Giebelfenster

**Verfügbare Höhe A** an der Mittelachse: Zeilen zwischen Oberkante Wand bzw. Dachboden + 1 und Unterseite der Dachtreppen − 1.

- Bei 45° (Profil 2,2,2 …) sinkt die verfügbare Höhe je Spalte Abstand zur Mitte um 1.
- Jede Zelle der Vorlage (auch Sims und Verdachung in d = +1) braucht mindestens 1 Block Luft zur Dachunterseite.
- Ausnahme ist die Ortgangkante bei d = +1 bis +2: dort entscheidet die Kollisionsprüfung.

| A (Zeilen) | Giebelbreite | Vorlage nach Stil |
|---|---|---|
| ≤ 2 | beliebig | keins, oder W27 Lamellenluke 1×1 / W26 Bullauge |
| 3 | ≥ 5 | W11 Kreuz-Okulus, W26, W04 1×1 (rustikal) |
| 4–5 | ≥ 7 | 1×2 mit Läden (W04), W20 Zwilling, W07 (Fantasy), W21 (mediterran) |
| ≥ 6 | ≥ 9 | W25 gestaffelter Drilling, W08 (3×3), W08b (5×5, ab A ≥ 7), W23 |
| ≥ 9 | ≥ 13 | zwei Ebenen: unten Drilling, oben W26 oder Lüftungsluke |

**Regeln:**

- Mitte auf der Firstachse. Hat das Geschoss darunter eine Mittelachse, fluchtet das Giebelfenster mit ihr. Bei gerader Achsenzahl sitzt es dazwischen (in der Mitte).
- Giebelfenster ≤ Geschossfenster in Breite und Höhe (Einschätzung).
- Krüppelwalm oder Mansarde: Fenster unterhalb des Walmansatzes.
- Bei Walm, Pyramide und Pagode gibt es keinen Giebel; dort sind Gauben die Dachfenster (Dachthema).
- **Gauben:** Die Giebelgaube ist „the most common type“, die Schleppgaube „provides headroom over a larger area“ [35]. Keine Gaubenseite berührt den Baukörper, die Gaube steht immer auf dem Dach [36].
- Die Gaubenstirn (`components.ts:60–86`) bekommt eine Fenstervorlage statt der nackten Scheibenspalte: W02 1×2 bzw. W04 ohne Läden. Die Läden passen nicht zwischen die Wangen.
- **Rustikaler Akzent:** Scheunen-Ladeluke 2×2 aus geschlossener `spruce_trapdoor`, darüber ein `spruce_fence`-Arm mit Laterne (Einschätzung).

---

## Neue Vorlagen als Datenzellen

Im Format von `windows.ts`, mit den vorhandenen Helfern (`cell`, `fixed`, `air`, `post`, `beam`, `pane`, `solid`, `sill`, `step`, `slab`, `corner`, `shutter`, `span`, `panes`, `sillRow`, `shutters`, `windowTemplate`). Rollen und Formen stammen aus `types.ts` und `materials.ts`. Neue Stilzuordnungen kommen in `STYLES_OF` und in `styles.ts`.

```ts
// W04c: Klappladen-Fenster, rechter Laden zugeklappt vor dem Glas (Variation, T7).
const W04c = windowTemplate('W04c', 'Fenster mit halb geschlossenen Läden (2×2)', 2, 2, [
  panes(2, 2),
  span(0, 1).map((y) => [shutter(-1, y, 1, y === 0 ? 'bottom' : 'top'), shutter(1, y, 1, y === 0 ? 'bottom' : 'top')]),
  sillRow(-1, 2),
  span(-1, 2).map((x) => slab(x, 2, 1, 'roofTrim', 'top')),
], 'Laden x=1 liegt flach vor der Scheibe (facing=south, open) – nur 10–15 % der Fenster, nie benachbart.');

// W20: Pfosten- und Kreuzstockfenster (T8). transomRow = Kämpferzeile oder null.
function w20(id: string, w: number, h: number, transomRow: number | null): FacadeTemplate {
  return windowTemplate(id, `Pfostenfenster${transomRow !== null ? ' mit Kämpfer' : ''} (${w}×${h})`, w, h, [
    span(0, w - 1).map((x) => span(0, h - 1).map((y) => (x % 2 === 1 ? post(x, y) : y === transomRow ? beam(x, y) : pane(x, y)))),
    span(0, h - 1).map((y) => [post(-1, y), post(w, y)]),
    span(-1, w).map((x) => beam(x, h)),
    sillRow(-1, w),
    span(-1, w).map((x) => slab(x, h, 1, 'roofTrim', 'top')),
  ], 'Pfosten bei ungeraden x in d=0 (Rahmenrolle), Kämpfer als liegender Balken; Tudor/Elisabethanisch.');
}
const W20 = w20('W20', 3, 2, null);   // Zwilling
const W20b = w20('W20b', 3, 3, 1);    // Kreuzstock, 4 Lichter
const W20c = w20('W20c', 5, 2, null); // Drilling (nur glatte Wände, Feldbreite max. 4)

// W21: Dreiecksverdachung (T4c).
const W21 = windowTemplate('W21', 'Fenster mit Dreiecksgiebel (1×2)', 1, 2, [
  panes(1, 2),
  span(0, 1).map((y) => [post(-1, y, 1), post(1, y, 1)]),
  corner(-1, 2, 1, 'roofTrim', 'east', 'bottom'),
  solid(0, 2, 1, 'roofTrim'),
  corner(1, 2, 1, 'roofTrim', 'west', 'bottom'),
  slab(0, 3, 1, 'roofTrim', 'bottom'),
  sillRow(-1, 1),
], 'Zwei aufsteigende Treppen + Block + Firstplatte in d=+1; braucht rows ≥ 5 oder Giebel.');

// W22: Tudor-Haubengesims mit Abläufen (T4d).
function w22(id: string, w: number, h: number): FacadeTemplate {
  return windowTemplate(id, `Fenster mit Haubengesims (${w}×${h})`, w, h, [
    panes(w, h),
    span(0, h - 1).map((y) => [post(-1, y), post(w, y)]),
    span(-1, w).map((x) => sill(x, h, 1, 'roofTrim')),
    sill(-1, h - 1, 1, 'roofTrim'),
    sill(w, h - 1, 1, 'roofTrim'),
    span(0, w - 1).map((x) => slab(x, -1, 1, 'roofTrim', 'top')),
  ], 'Haube = Kopfüber-Treppen über der Öffnung, Abläufe darunter an den Enden; schlanke Platten-Bank.');
}
const W22 = w22('W22', 2, 2);

// W23: gekuppeltes Spitzbogenfenster mit Scheitelscheibe (T11), passt in rows = 4.
const W23 = windowTemplate('W23', 'Gekuppeltes Spitzbogenfenster (3×3)', 3, 3, [
  span(0, 2).map((x) => span(0, 2).map((y) => (x === 1 && y < 2 ? post(1, y) : pane(x, y)))),
  span(0, 2).map((y) => [post(-1, y, 1), post(3, y, 1)]),
  span(-1, 3).map((x) => beam(x, 3, 1)),
  corner(0, 2, 1, 'frame', 'west', 'top'),
  corner(2, 2, 1, 'frame', 'east', 'top'),
  sillRow(-1, 3),
], 'Plattenmaßwerk: zwei Lichter, Mittelpfosten d=0, Bogenecken d=+1 vor durchgehendem Scheitelglas.');

// W24: Kastenerker 1 tief (T12).
const W24 = windowTemplate('W24', 'Kastenerker (2×2, 1 tief)', 2, 2, [
  span(0, 1).map((x) => span(0, 1).map((y) => [air(x, y, 0), pane(x, y, 1)])),
  span(0, 1).map((y) => [post(-1, y, 1), post(2, y, 1)]),
  span(-1, 2).map((x) => [sill(x, -1, 1, 'roofTrim'), step(x, 2, 1, 'roof')]),
], 'Glas in d=+1, Nische d=0 frei; Konsole und Boden aus Kopfüber-Treppen, Dach aus Treppen; spacing 2.', 2);

// W25: gestaffelter Giebel-Drilling (T11, Giebel).
const W25 = windowTemplate('W25', 'Gestaffelter Drilling (5×3)', 5, 3, [
  [0, 4].map((x) => [pane(x, 0), pane(x, 1), solid(x, 2, 0, 'upperWall'), slab(x, 2, 1, 'roofTrim', 'bottom')]),
  span(0, 2).map((y) => pane(2, y)),
  [1, 3].map((x) => span(0, 2).map((y) => post(x, y))),
  [-1, 5].map((x) => span(0, 1).map((y) => post(x, y))),
  slab(2, 3, 1, 'roofTrim', 'bottom'),
  sillRow(-1, 5),
], 'Lanzettgruppe ungerader Zahl, Mitte höchste; nur Giebel mit A ≥ 6 bzw. glatte Wände mit rows ≥ 5.');

// W26: Bullauge (T13).
const W26 = windowTemplate('W26', 'Bullauge (1×1)', 1, 1, [
  pane(0, 0),
  fixed(0, 0, 1, 'mangrove_trapdoor', { facing: 'south', half: 'bottom', open: 'true' }, 'frame'),
], 'Runde Mittelöffnung der Mangroven-Falltür (6×6 px) vor der Scheibe; Turm, Giebel, Fantasy.');

// W27: Lamellenluke (T13), Blatt bündig an der Außenkante.
const W27 = windowTemplate('W27', 'Lamellenluke (1×2)', 1, 2, [
  span(0, 1).map((y) => fixed(0, y, 0, 'crimson_trapdoor', { facing: 'north', half: y === 0 ? 'bottom' : 'top', open: 'true' }, 'shutter')),
  beam(0, 2, 1),
  sill(0, -1),
], 'Schlitze (4 waagerecht) zeigen den Dachraum; alternativ acacia_trapdoor (3 senkrechte Schlitze).');

// W28: tiefe Nische, Glas in d = −1 (T2).
function w28(id: string, w: number, h: number): FacadeTemplate {
  return windowTemplate(id, `Tiefe Fensternische (${w}×${h})`, w, h, [
    span(0, w - 1).map((x) => span(0, h - 1).map((y) => [air(x, y, 0), pane(x, y, -1)])),
    span(-1, h).map((y) => [solid(-1, y, -1, 'wall'), solid(w, y, -1, 'wall')]),
    span(0, w - 1).map((x) => [solid(x, -1, -1, 'wall'), solid(x, h, -1, 'wall'), beam(x, h)]),
  ], 'Laibung ~1 7/16 ohne Bauteil vor der Wand; d=-1 muss frei sein; Rolle wall → Wandrolle des Geschosses.');
}
const W28 = w28('W28', 1, 2);
const W28b = w28('W28b', 2, 2);

// W29: Faschenfenster (T9).
function w29(id: string, w: number, h: number, withShutters: boolean): FacadeTemplate {
  return windowTemplate(id, `Faschenfenster${withShutters ? ' mit Läden' : ''} (${w}×${h})`, w, h, [
    panes(w, h),
    span(-1, h).map((y) => [solid(-1, y, 0, 'roofTrim'), solid(w, y, 0, 'roofTrim')]),
    span(0, w - 1).map((x) => [solid(x, -1, 0, 'roofTrim'), solid(x, h, 0, 'roofTrim'), slab(x, -1, 1, 'roofTrim', 'top')]),
    withShutters ? shutters(w, h) : [],
  ], 'Fasche bündig in d=0 (Putz-/Holzfasche); Läden überdecken die Faschenseiten.');
}
const W29 = w29('W29', 1, 2, true);
const W29b = w29('W29b', 2, 2, false);

// Licht- und Weihnachtsmodule (T10), werden von openings.ts an Vorlagen angehängt.
/** a) Sohlbank-Leuchte: ersetzt den Wandblock unter der mittleren Glasspalte (verdeckt vom Sims). */
export const sillLight = (x: number, block = 'ochre_froglight'): Cells[] => [fixed(x, -1, 0, block, { axis: 'y' }, 'wall')];
/** b) Laterne an Kette hinter der oberen Scheibe; Kettenlänge bis zur Decke ergänzt openings.ts. */
export const chainLight = (x: number, h: number): Cells[] => [fixed(x, h, -1, 'iron_chain', { axis: 'y' }), lantern(x, h - 1, -1, true)];
/** c) Lichterbogen: Innenbank + Kerzen (Profil 2-4-2 usw.). */
const ARCH: Readonly<Record<number, readonly number[]>> = { 1: [3], 2: [2, 2], 3: [2, 4, 2], 4: [1, 3, 3, 1] };
export const adventSill = (w: number, color = 'white_candle'): Cells[] =>
  span(0, w - 1).map((x) => [slab(x, -1, -1, 'floor', 'top'), fixed(x, 0, -1, color, { candles: String(ARCH[w]?.[x] ?? 2), lit: 'true' })]);
```

**Hinweise zu den Zellen:**

- `fixed` mit `facing`, `half` und `axis` wird von `cellState` mitgedreht (`place.ts:73–76`).
- `iron_chain` wird für 1.21.1 über `profileBlockId` umbenannt.
- `waxed_copper_bulb[lit=true]` ist in der Registry.
- `copper_bars`, `copper_lantern`, `redstone_lamp` und alle `potted_*` außer den 14 vorhandenen sind **nicht in Registry**.

---

## Fehler, die Profis vermeiden

1. **Flache Glasblöcke** in der Wandebene, ohne Sims, Sturz oder Rahmen [16], [21].
2. **Fenster ohne Bezug zur Struktur:**
   - schief im Feld zwischen zwei Ständern (C3)
   - Achsen, die zwischen den Geschossen springen [37]
   - Fenster, die an Ecken, Geschossbänder oder die Traufe stoßen
3. **Zu große Fenster in alten Stilen und zu kleine in modernen.** Mittelalter: kleine Öffnungen mit viel Wand; modern: „floor to ceiling“ [16].
4. **Läden, die nicht schließen könnten:**
   - breiter oder höher als das Fenster
   - Läden an 3 breiten Fenstern
   - Läden, die die Läden des Nachbarfensters berühren [23]
5. **Laute Glasfarben** im Wohnhaus; mehr als eine Glasart pro Haus ohne Grund [16].
6. **Leere, dunkle Fenster** in einer Szene, die gemütlich sein soll. Licht ist das Hauptmittel bei Nacht [21], [22].
7. **Alle Fenster identisch:** keine Hierarchie (Akzent, Giebel, Geschoss) und keine Detailvariation [24].
8. **Gitter direkt vor einer Scheibe:** T-Stummel durch die Verbindung (Altnotiz). Gitter nur vor Glasblock oder mit Absicht.
9. **Blumen im Winter, Laterne neben Schnee:** Laternen schmelzen Schnee im Umkreis von 2 (Altnotiz).
10. **Wand, Treppe oder Raumteiler direkt hinter dem Fenster** [18].
11. **Rahmen, Sims und Wand aus demselben Block:** Das Detail verschwindet. Kontrast ΔL ≥ 15 ist als Lint schon vorhanden.
12. **Glas bis an die Dachunterseite im Giebel:** kein Abstand und kein Sturz.

---

## Empfehlungen für den Generator

Priorisiert; je Punkt: was, wo, Daten oder Regel, Akzeptanzkriterium.

| # | Was | Modul | Art | Akzeptanzkriterium |
|---|---|---|---|---|
| E1 | **Fensterlicht a)** Sohlbank-Leuchte unter 50–70 % der Fenster mit Sims (Weihnachten 70–85 %); b) und c) als Option „Fensterlicht innen“, an Weihnachten c) standardmäßig | `openings.ts` (nach `commit`), `windows.ts` (Module `sillLight`, `chainLight`, `adventSill`), `festive.ts` | Regel + Daten | Je Haus haben ≥ 50 % der Fenster eine Lichtquelle ≤ 2 Blöcke hinter oder unter dem Glas. Validator ohne Befund. Keine Lichtquelle ≤ 2 Taxicab-Abstand zu `snow`. Nachttest in Minecraft: jedes beleuchtete Fenster sichtbar hell |
| E2 | **Zentrierung im Feld** nach Vorlagenbreite, Paritätswahl (ungerade Feldbreite → ungerade Vorlage) | `openings.ts:270–272` | Regel | Für jedes Fachwerkfeld ist der linke Rand = rechter Rand ± 1 und bei gleicher Parität exakt gleich (Unit-Test über alle Stile und Seeds 1–50) |
| E3 | **Giebelfenster** nach Tabelle A ↔ Vorlage, Mittelachse, Abstand zum Dach ≥ 1 | neues `gableWindows()` in `openings.ts`, Daten in `styles.ts` (`gableWindows: [...]`) | Regel + Daten | Jeder Giebel mit A ≥ 3 hat genau 1 Fenster auf der Firstachse. Keine Zelle schneidet die Dachfläche. Snapshot-Test je Stil |
| E4 | **Höhenfilter und Hierarchie:** Vorlagen mit h = rows erlauben (Sims auf Bodenhöhe); EG-Höhe ≥ OG-Höhe; W07b, W13 und W08b nur noch für Giebel oder Türme | `openings.ts:243, 247`; `styles.ts` | Regel | W07b und W13 erscheinen in ≥ 1 von 10 Fantasy-Generierungen (Giebel/Turm). Die OG-Fensterhöhe ist in allen Tests ≤ EG-Höhe |
| E5 | **Detailvariation** über `details.shutters` und `details.flowerBoxes`; je Fassade fester Typ, je Fenster Varianten (W04c halb geschlossen 10–15 %, Blumenkasten nach Wahrscheinlichkeit, Licht an/aus) | `openings.ts` (Wahl je Fenster mit `rng.fork('window:'+i)`), `windows.ts` (W04c) | Regel + Daten | Bei gleichem Seed bitgleich. Innerhalb einer Fassade gleiche Basisvorlage. Mindestens 2 Detailvarianten pro Fassade ab 4 Fenstern |
| E6 | **Neue Vorlagen** W20–W29 + Aktivierung von W10 (Gauben), W11 (Giebel), W12 (Markt/Bahnhof EG) und W18 (Thema Winter/Weihnachten) | `windows.ts`, `styles.ts` (Listen siehe Tabelle „Fenstertypen“), `components.ts:60–86` | Daten | Alle neuen Vorlagen bestehen den Validator (kein Schweben, Zustände gültig in 1.21.11 und 1.21.1). Jeder Stil nutzt ≥ 3 Fenstervorlagen inkl. 1 Akzent |
| E7 | **Nische W28 als Ausweichlösung**, wenn d = +1 belegt ist (statt `plainWindow`) | `openings.ts:94–107, 272–276, 301–306` | Regel | `plainWindow` wird in < 5 % der Fenster genutzt. Jedes Fenster hat ≥ 1 Tiefenelement (Rahmen, Sims oder Nische) |
| E8 | **Fachwerk-Riegel:** Brüstungs- und Sturzriegel (`beam`, d = +1) durchgehend auf Sims- und Sturzhöhe in Geschossen mit Fenstern | `walls.ts` / `studs.ts` (nach Fensterwahl) | Regel | In Fachwerkgeschossen liegen alle Simse und Stürze auf 2 Höhen. Riegel laufen ohne Lücke von Ständer zu Ständer |
| E9 | **Glas je Stil:** `fantasy_crimson` purple → light_gray; Variation braun/hellgrau 10 %; Bleiglas nur W13 | `palettes.ts:153` u. a. | Daten | Lint: Fensterglas einer Palette ∈ {glass, white, light_gray, gray, brown, black}; gesättigte Farben nur in Vorlagen mit Rolle `accent` |
| E10 | **Treppen und Leitern meiden Fensterspalten** (d = −1 vor Glas) | `buildHouse.ts:135` (avoid-Funktion um Fensterzellen ergänzen), `walls.ts:262–283` | Regel | Kein Treppen- oder Leiterblock in d = −1 vor einer Glaszelle (Lint in `buildingLints.ts`) |
| E11 | **Modern:** W16e schlank, Pfosten je 3. Licht, Brüstung `tinted_glass`, Eckfenster; Ziel-Fensteranteil ≥ 35 % | `windows.ts`, `openings.ts`, `styles.ts` | Daten + Regel | Gemessener Fensteranteil (Glaszellen / Wandzellen je Fassade) für modern ≥ 0,35, für Mittelalter ≤ 0,2 |
| E12 | **Japanisch:** Gitter W15 nur EG, OG W15c; Kirschblüte 1 Rundfenster als Akzent | `openings.ts` (Vorlagenliste je Geschoss), `styles.ts` | Regel + Daten | Kein Zaungitter oberhalb Geschoss 0 im Stil japanese |
| E13 | **Mediterran:** W29 Faschen + W28 Nische als Hauptfenster, W21 als Akzent; W17 mit Scheiben statt Glasblöcken (Gitter nur unten als Brüstung) | `windows.ts:493–524`, `styles.ts:273` | Daten | Keine Glasblöcke in mediterranen Hauptfenstern; Fensteranteil 0,10–0,18 |
| E14 | **Winter- und Weihnachtstausch der Blumen:** Blumenkasten-Bepflanzung → `spruce_leaves[persistent=true]` bzw. `potted_spruce_sapling`, `potted_fern` | `windows.ts:189–199`, `resolveInput.ts` | Regel | Bei Thema Winter/Weihnachten keine Blüten (`*_tulip`, `poppy`, `oxeye_daisy`, `cornflower`) in Fenstervorlagen |
| E15 | **Registry ergänzen** (optional): `copper_bars` + waxed (Bleiglas-Sprossen in Kupfer), `copper_lantern`, weitere `potted_*` (`potted_allium`, `potted_oxeye_daisy`, `potted_pink_tulip`) | `src/core/blocks/families.ts` | Daten | Registry-Test gegen minecraft-data grün für beide Profile (1.21.1 ohne Kupfergitter/Kupferlaterne) |

---

## Quellen

1. minecraft.wiki – Light. <https://minecraft.wiki/w/Light> – Lichtstufen aller Quellen in Java; „Light due to blocks also tends toward orange in the middle ranges“; Treppen und Stufen lassen Licht richtungsabhängig durch.
2. minecraft.wiki – Copper Bulb. <https://minecraft.wiki/w/Copper_Bulb> – Zustände `lit` und `powered`, Licht 15/12/8/4, „does not need continuous power to emit light“.
3. minecraft.wiki – Redstone Lamp. <https://minecraft.wiki/w/Redstone_Lamp> – geht ohne Strom nach 4 Ticks aus.
4. minecraft.wiki – Tinted Glass. <https://minecraft.wiki/w/Tinted_Glass> – sperrt Licht, sichtbar durchsichtig, keine Scheibenform.
5. minecraft.wiki – Stained Glass Pane. <https://minecraft.wiki/w/Stained_Glass_Pane> – Formen bei Nachbarn, transparent, nicht leuchtend.
6. minecraft.wiki – Glass Pane. <https://minecraft.wiki/w/Glass_Pane> – dünnes Blatt bzw. 2×2-px-Pfosten; Kollisionsbox gleich Form; Verbindungen.
7. minecraft.wiki – Trapdoor. <https://minecraft.wiki/w/Trapdoor> – 3/16 Block dick; braucht seit 1.9 keinen Halteblock.
8. minecraft.wiki – Copper Grate. <https://minecraft.wiki/w/Copper_Grate> – durchsichtiger, gelochter Block, 4 Oxidationsstufen + gewachst.
9. minecraft.wiki – Bars. <https://minecraft.wiki/w/Bars> – Kupfergitter seit Java 1.21.9 (25w32a), oxidierend, gewachst; Platzierung wie Zäune und Scheiben.
10. minecraft.wiki – Lantern. <https://minecraft.wiki/w/Lantern> – Licht 15; hängt und steht auf Gittern und Scheiben; verbindet sich nahtlos mit Ketten.
11. minecraft.wiki – Candle. <https://minecraft.wiki/w/Candle> – nur auf festen Blöcken, bis 4 je Block, +3 Licht je Kerze.
12. minecraft.wiki – Froglight. <https://minecraft.wiki/w/Froglight> – Licht 15, Farben ochre #f9efa5, verdant #b7f1bc, pearlescent #da73de, `axis`.
13. minecraft.wiki – Tutorial:Adding beauty to constructions. <https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions> – Fenster 1–2 über Boden, Läden an 1×2, weißes Glas „cloudier“, braunes „muddy“, Erker und Rahmen mit Glas dahinter.
14. minecraft.wiki – Tutorial:Architectural terms. <https://minecraft.wiki/w/Tutorial:Architectural_terms> – Begriffe Mullion, Transom, Dormer, „light“.
15. misode/mcmeta, Tag 1.21.11-assets, Blocktexturen. <https://github.com/misode/mcmeta/tree/1.21.11-assets/assets/minecraft/textures/block> – **eigene Messung**: Alpha-Masken der Falltüren, Gitter und Gläser (Lochanteile, Buntglas-Alpha 102/163, Klarglas-Rand).
16. Planet Minecraft – Modern Building and windows. <https://www.planetminecraft.com/blog/modern-building-and-windows/> – Scheiben statt Blöcke „give more depth“, raumhohe Fenster, neutrale Glasfarben.
17. Planet Minecraft Forum – Best alternative window blocks. <https://www.planetminecraft.com/forums/discussions/general/best-alternative-window-blocks-anything-other-than-glass-695678/> – Zäune, Falltüren, Kupferroste „look like leaded windows“, Eisengitter.
18. Planet Minecraft – Making Interiors – How to Build #3. <https://www.planetminecraft.com/blog/interiors-how-to-build-3/> – Fenster mittig in der Raumwand, nie eine Wand direkt dahinter.
19. Planet Minecraft – 100+ window designs. <https://www.planetminecraft.com/project/100-window-designs/> – Detail statt Größe: 2×3- und 1×2-Fenster passend zur Spielerhöhe.
20. NameHero – Minecraft Window Designs: The Complete Guide. <https://www.namehero.com/gaming-blog/minecraft-window-designs-the-complete-guide/> – Steinrahmen mit gemeißelten Ziegeln; Shroomlights hinter Fichtenfenstern; Glowstone im Fensterdetail.
21. Gamertag Mythras – Minecraft Building Tips. <https://gamertagmythras.com/blog/minecraft/minecraft-building-tips> – Fenster einrahmen, damit sie in der Wand sitzen; Falltüren als Läden; „hidden glowstone … warm light at night“.
22. GGServers – Improve Minecraft building skills. <https://ggservers.com/blog/improve-minecraft-building-skills-easily/> – Simse aus Stufen und Falltüren, Kopfüber-Treppen als Rahmen, Lichtwirkung bei Nacht.
23. Minecraft Cosmetics – Trapdoor Shutters (2×2 windows). <http://minecraftcosmetics.blogspot.com/2011/09/trapdoor-shutters-2x2-windows.html> – 4 Falltüren je 2×2-Fenster, Abstand zwischen Fenstern, auf kleinen Bauten zu klein.
24. van der Staaij et al. (2023): Believable Minecraft Settlements by Means of Decentralised Iterative Planning. <https://arxiv.org/abs/2309.10871> – GDMC-2022-Sieger; Jury lobt „modular variation“; kritisiert unpassende Materialien.
25. Green et al. (2019): Organic Building Generation in Minecraft. <https://arxiv.org/abs/1906.05094> – Gebäude „complete with rooms, windows, and doors“ per CA und constrained growth.
26. Wikipedia – Muntin. <https://en.wikipedia.org/wiki/Muntin> – Sprosse vs. Pfosten; kleine Scheiben im Raster „more architecturally attractive“.
27. Wikipedia – Lancet window. <https://en.wikipedia.org/wiki/Lancet_window> – einzeln, gepaart oder in ungerader Zahl mit dem höchsten in der Mitte.
28. Wikipedia – Tracery. <https://en.wikipedia.org/wiki/Tracery> – Plattenmaßwerk: zwei oder drei schmale Lichter mit runder Öffnung darüber.
29. Wikipedia – Tudor architecture. <https://en.wikipedia.org/wiki/Tudor_architecture> – Pfosten- und Kämpferfenster, Hood moulds, Erker, „more glass than wall“.
30. Wikipedia – Storybook architecture. <https://en.wikipedia.org/wiki/Storybook_architecture> – „doors and windows which may look mismatched and odd-shaped“.
31. Wikipedia – Georgian architecture. <https://en.wikipedia.org/wiki/Georgian_architecture> – Fenster im Raster, Höhe zwischen Geschossen verschieden, Symmetrie.
32. Wikipedia – Palladian window. <https://en.wikipedia.org/wiki/Palladian_window> – mittleres Rundbogenlicht, zwei rechteckige Seitenlichter, einzeln oder in Reihe.
33. Wikipedia – Oriel window. <https://en.wikipedia.org/wiki/Oriel_window> – Erker ohne Bodenkontakt, auf Konsolen, meist im Obergeschoss.
34. Wikipedia – Bay window. <https://en.wikipedia.org/wiki/Bay_window> – Erkerformen, Innenwinkel 90/135/150°, auf Fundament oder Konsolen.
35. Wikipedia – Dormer. <https://en.wikipedia.org/wiki/Dormer> – Gaubenformen (Giebel-, Schlepp-, Walm-, Fledermaus-, Wandgaube).
36. Wikipedia (de) – Gaube. <https://de.wikipedia.org/wiki/Gaube> – Gaubenformen inkl. Ochsenauge; Gaube steht immer auf dem Dach.
37. Wikipedia (de) – Fensterachse. <https://de.wikipedia.org/wiki/Fensterachse> – Definition; Gliederung mit Geschossen; Beispiel 5 Achsen mit Mittelrisalit.
38. Wikipedia (de) – Riegel (Bauteil). <https://de.wikipedia.org/wiki/Riegel_(Bauteil)> – Brüstungs- und Sturzriegel im Fenstergefach bestimmen die Fenstergröße.
39. Wikipedia (de) – Fasche. <https://de.wikipedia.org/wiki/Fasche> – abgesetzte Umrahmung; erhaben, vertieft oder farbig; Putz, Stuck oder Holz.
40. Wikipedia (de) – Butzenscheibe. <https://de.wikipedia.org/wiki/Butzenscheibe> – runde Scheiben 7–15 cm aus Waldglas in Bleifassung, ab dem 14. Jh.
41. Wikipedia (de) – Fensterladen. <https://de.wikipedia.org/wiki/Fensterladen> – Bauformen, Lamellen mit Lichtdurchlass, Zierläden rein dekorativ.
42. Wikipedia – Window shutter. <https://en.wikipedia.org/wiki/Window_shutter> – Läden in oder vor der Öffnung; Brett-, Lamellen- und Paneelläden.
43. Wikipedia – Shōji. <https://en.wikipedia.org/wiki/Sh%C5%8Dji> – Kumiko-Gitter, Washi; außen und innen; Kōshi als (heute verglastes) Gitterfenster.
44. Wikipedia – Machiya. <https://en.wikipedia.org/wiki/Machiya> – Kōshi im Erdgeschoss (auch vorstehend als degōshi), mushiko-mado im Obergeschoss; Bengara-Rot.
45. Wikipedia – Katōmado. <https://en.wikipedia.org/wiki/Kat%C5%8Dmado> – glockenförmiges Fenster; Zen-Tempel, später Schreine, Burgen, Samurai-Häuser.
46. Wikipedia – Chashitsu. <https://en.wikipedia.org/wiki/Chashitsu> – Fenster „generally small and covered with shōji“.
47. Wikipedia – Mediterranean Revival architecture. <https://en.wikipedia.org/wiki/Mediterranean_Revival_architecture> – Bogen- und Rundfenster, Balkone mit Fenstergittern, Putzwände.
48. Wikipedia – Spanish Colonial Revival architecture. <https://en.wikipedia.org/wiki/Spanish_Colonial_Revival_architecture> – Flügelfenster und hohe Schiebefenster, Eisenzier, Markisen.
49. Wikipedia – Five Points of Architecture. <https://en.wikipedia.org/wiki/Five_Points_of_Architecture> – Bandfenster zwischen Stützen; freie Fassade.
50. Wikipedia (de) – Erzgebirgischer Schwibbogen. <https://de.wikipedia.org/wiki/Erzgebirgischer_Schwibbogen> – zur Advents- und Weihnachtszeit beleuchtet in die Fenster gestellt.
51. Wikipedia (de) – Lochfassade. <https://de.wikipedia.org/wiki/Lochfassade> – Massivwand mit klar abgegrenzten Einzelöffnungen.

Interne Grundlage, nicht mitgezählt: Altnotiz `research_notes/Minecraft Bautechniken für Generator/fenster_tueren_details.md`. Dazu Code und Screenshots des Repos wie oben zitiert.
