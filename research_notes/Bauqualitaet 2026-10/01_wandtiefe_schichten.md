# 01 – Wandtiefe, Schichten und Fassadenrelief

Stand: 2026-10-23 · Thema: Wie Profi-Builder eine flache Wand mit 3–4 Tiefenebenen, Pfeilern, Bändern, Gesimsen, Sockel- und Eckausbildung gliedern, und was unser Generator davon als Daten oder Regel übernehmen sollte.

> **Konventionen.** d = Tiefe relativ zur Wandebene des Geschosses: −1 innen, 0 Wandhaut, +1/+2 davor. Die Skizzen zeigen kanonisch eine **Südfassade** wie `src/core/templates/types.ts`: außen = Süden, links = Westen, rechts = Osten. Treppen: `facing` = Seite der vollen Rückwand, `*_stairs[facing=north,half=top]` ist also eine Konsole an der Wand. Offene Falltür `facing=south,open=true` liegt flach an der Wand dahinter (`trapdoorBoxes` in `shapes.ts`).
> **Abgrenzung.** Die Grundlagen (Rahmen vor Füllung, Fachwerkmuster, Schürze, Jetty, Verwitterungsformel) stehen in `research_notes/Minecraft Bautechniken für Generator/waende_struktur.md` = **[Alt]** und werden nicht wiederholt. Fenster und Türen im Detail, Dächer, Paletten/Textur, Vorschau und Festschmuck sind eigene Themen.
> **Belege.** [Qn] = Quelle n. „Einschätzung“ = eigene Ableitung, im Spiel prüfen.

## Kurzfassung

Sortiert nach Wirkung:

1. **Ebene −1 fehlt.** Glas sitzt immer in d = 0 (`windows.ts:10-13`), Türen auch (`doors.ts:44`). Profis: „Set glass panes one block back from the facade. The shadow created by the recess is what makes modern builds look professional“ [Q21]; Fenster brauchen Tiefe [Q16]. Kosten: 2 Futterblöcke je Fensterzeile. Das ist der stärkste Hebel für alle Stile.
2. **Modern und mediterran sind flach.** `plan.ts:201` schaltet die Rahmen ab, `walls.ts:163` setzt danach kein vertikales Element mehr. Massivbauten gliedert man mit **Lisenen/Pilastern, Eckquadern, Bändern und Gesimsen** [Q32][Q45][Q42][Q34]. Diese Werkzeuge fehlen ganz.
3. **Horizontale Tiefe wirkt in Vanilla am stärksten.** Es gibt keine Schlagschatten, nur Flächenschattierung (oben 1,0 · N/S 0,8 · O/W 0,6 · unten 0,5; `texturedMesh.ts:66`, [Q10]) und AO [Q11]. Unterseiten von Bändern und Simsen (0,5) sind deshalb die dunkelste Kante. Jede Geschosslinie braucht ein horizontales Tiefenelement [Q43][Q34].
4. **Hierarchie statt Einheitsraster.** Ecke > Geschosslinie > Achsenpfeiler > Zwischenpfosten > Feld, je Rang eigene Tiefe, Breite oder eigenes Material. Heute sind alle Pfosten und Balken 1×1 in d = +1 (`walls.ts:166-177`).
5. **Giebel sind die größte flache Fläche.** Ein Vollblock-Dreieck in der Rahmenebene (`roofEngine.ts:377-407`, `plan.ts:408`). `gableRecess` ist immer `false` (`plan.ts:423`), und der Lint prüft Giebel nicht.
6. **Sockel abschließen.** Wasserschlag (schräge Treppen) und Pfostenfüße bzw. Basen in d = +2 [Q44][Q35]; Pfeilerfuß vorziehen, „so that the pillar sticks out“ [Q1].
7. **Ecke als Stilmerkmal.** Diagonalpfosten (Ist), L-Eckpfeiler, Quader flach oder als Bossen, Mauer-Fase, Blockbau-Vorköpfe, Eckrücksprung – je Stil eine feste Wahl [Q42][Q41].
8. **Rhythmus aus Achsen und Jochen.** Joche 3–5 breit, ungerade Zahl, Mittelachse [Q48][Q38]; ab etwa 15 Blöcken ein Risalit +1 [Q33]. `studs.ts` erzeugt nur gleich breite Felder von 1–4.
9. **Halbtiefe in 1/16.** Falltür 3, Knopf 2, Zaun 10, Mauerpfosten 12, Treppe/Stufe 8 (aus `shapes.ts`). Mikro ergänzt die Struktur, ersetzt sie aber nicht. Aus der Distanz lesen sich nur Elemente ≥ 8/16 (Einschätzung nach [Q8]).
10. **Texturwechsel je Ebene.** Helle Stile wechseln bei gleicher Farbe die Textur, Holzstile setzen Hell gegen Dunkel, Rücklagen werden dunkler („Gray Concrete creates shadow lines and recessed panels“ [Q21], „Pick by tone. Layer for depth.“ [Q20]).
11. **Tiefenbudget skaliert mit der Größe.** „Bigger builds often require more depth, since you view them from farther away“ [Q8]; Einsteiger kommen mit „a block and a half at most, or two layers“ aus [Q5].
12. **Workflow Block-out → Skelett → Haut → Detail → Prüfung** [Q1][Q3]. Im Code fehlt die Skelett-Stufe als **Fassadenraster** zwischen `plan.ts` und `walls.ts` (Split-Grammatik [Q55]).
13. **Lint zu weich.** Eine bündige Glasscheibe zählt als „Tiefensprung“ (`buildingLints.ts:87-95`). Höhe, Giebel und die Zahl der Ebenen werden nicht geprüft.
14. **Blockhaus-Wände stehen senkrecht.** In `rustic_logs` liegen die Stämme mit `axis=y` (`walls.ts:152`, `materials.ts:32-35`), das wirkt wie eine Palisade. Echter Blockbau liegt waagerecht, mit vorstehenden Köpfen [Q41].
15. **Vorschau ohne AO.** Der Farbmodus schattiert nur 1/0,93/0,86/0,6 (`buildVoxelMesh.ts:47`), deshalb unterschätzen die Screenshots die Tiefe (Querverweis: Thema Vorschau).

## Schwächen des aktuellen Generators

Grundlage: die 8 Screenshots `haus-*-gross-ohne-thema.jpg` und der Code.

| # | Befund | Ort | Im Screenshot |
|---|---|---|---|
| S1 | Nur die Ebenen 0, +1 (Rahmen/Trims) und +2 (Schürze, Konsolen, Blumenkästen). Kein −1; die einzige Rücklage ist die mittig sitzende Scheibe (7/16). | `walls.ts:146-153`, `windows.ts:10-13`, `doors.ts:44` | Alle: Fenster wirken bündig. |
| S2 | Modern und mediterran ohne Rahmen → kein Pfeiler, kein Band, keine Eckausbildung. | `plan.ts:201`, `walls.ts:163` | Modern: weißes EG und Holzband bündig, schwarze Krone bündig. Mediterran: glatte Sandsteinwand. |
| S3 | Mittelalterliches Stein-EG nur mit Eckpfosten. | `walls.ts:166` | Glatte Steinziegelfelder. |
| S4 | Pfosten und Balken gleich (1×1, d = +1, ohne Fuß und Kopf). In `medieval_stone` sind `frame` und `beam` beide `stripped_spruce_log`. | `walls.ts:167-177`, `palettes.ts` | Rustikal/Fantasy: gleichförmiges Gitter. |
| S5 | Jetty-Konsolen an jeder 2. Spalte `(u+1)%2`, nicht unter den Pfosten; keine Eckknagge; Jetty nur Nord/Süd. | `walls.ts:186-191`, `plan.ts:211` | Konsolen teils zwischen den Pfosten. |
| S6 | Sockel aus Vollblöcken in d = 0/+1, nur Reihe 1 mit Schürze; kein Wasserschlag, kein Pfostenfuß. | `walls.ts:98-123` | Sockel wirkt wie eine Bodenplatte. |
| S7 | Giebel als einfarbiges Vollblock-Dreieck in der Rahmenebene; `gableRecess` ungenutzt. | `roofEngine.ts:377-407`, `plan.ts:408/423` | Mittelalter/Rustikal: große glatte Giebel. |
| S8 | Lint-Signatur `d:shape`: bündige `glass_pane` gilt als Sprung; keine Höhenregel, kein Mindestmaß an Ebenen, Giebel und Sockel ungeprüft. | `buildingLints.ts:87-95`, `122-129` | Modern besteht den Lint trotzdem. |
| S9 | Ständerraster mit gleichen Feldern von 1–4, ohne Doppelständer, Brustriegel oder Mittelbetonung (W = 7 → `[1,1,1]`). | `studs.ts:6-28` | Japanisch/Kirschblüte: viele dünne Pfosten. |
| S10 | Ohne Rahmen keine Geschosslinie: Der OG-Bodenrand ist Wandmaterial in d = 0. | `walls.ts:137-143` | Modern/mediterran ohne Band. |
| S11 | Wandkrone in d = 0 aus `beam` (modern: `black_concrete`), ohne Abdeckung mit Überstand. | `walls.ts:217-226` | Schwarzes Band ohne Schattenkante. |
| S12 | Blockhauswand mit `axis=y`. | `walls.ts:152`, `materials.ts:32-35` | (`rustic_logs`) |
| S13 | `weathered()` bekommt nur `height`/`corner`; `underOverhang`/`drip` aus `texturing.ts` bleiben ungenutzt (Querverweis: Thema Textur). | `walls.ts:152` | Keine dunklere Zone unter Jetty und Traufe. |
| S14 | Toter Code `… \|\| true`. | `walls.ts:161`, `247` | – |

Behalten: Rahmen in d = +1, Schürze, Jetty auf Kopfüber-Treppen, Kopf- und Fußbänder (`addBraces`), Gesimstreppe unter der Traufe (`roofEngine.ts:358-375`), Vorlagen bis d = +2.

## Techniken und Regeln

### T1 Tiefenleiter: vier Ebenen plus Mikro

Ein Tutorial baut die Wand in genau dieser Reihenfolge auf: Stamm-Pfeiler mit Füllung, dann „pushing all the wool one layer back (or pulling the log one layer closer)“, dann zwei Stämme vor den Pfeilerfuß. Glasscheiben ergeben „a ‚fake‘ fourth layer“ [Q1]. Ein Beispiel mit drei Ebenen: „calcite inner wall, crimson trim, and blackstone beams“ [Q28].

| d | Rolle | Inhalt | Rollen |
|---|---|---|---|
| −1 | Rücklage | Glas in der Laibung, Tür in der Nische, Wandfelder, Schattenfuge | window, door, infill |
| 0 | Wandhaut | Putz, Mauerwerk, Füllung | wall, upperWall, infill |
| +1 | Tragwerk | Pfosten, Lisenen, Bänder, Sockel, Eckpfeiler | frame, beam, plinth, (neu) `trim` |
| +2 | Akzent | Konsolen, Gesimsnasen, Basen/Kapitelle, Schürze | beam, plinth, roofTrim, soffit |
| µ | Mikro | Falltür 3/16, Knopf 2/16, Ranke 1/16 | shutter, frame, accent |

**Halbtiefe** (Vorderkante in 1/16 vor bzw. hinter der Wandhaut; aus `shapes.ts`, gegen die Client-Modelle getestet):

| In d = +1, an die Wand angeschlossen | vor | In d = 0 statt Wandblock | zurück |
|---|---|---|---|
| Vollblock / Treppe / Stufe | 16 (8 im halben Teil) | `glass_pane`, `iron_bars` | −7 |
| `*_wall` | 12 Pfosten, 8 Arm | `*_stairs[facing=north,half=bottom]` | −8 vorn oben (Sohlbank-Schräge) |
| `*_fence` | 10 | `*_slab[type=top]` | −16 unten (braucht Hinterlegung in −1) |
| Scheibe, an die Wand angeschlossen | 9 | Luft + Glas in −1 | −16 (echte Laibung) |
| offene Falltür | 3 | | |
| Knopf `face=wall` | 2 | | |

**Regeln:**
- Fassaden ab Länge 7 zeigen ≥ 3 der Ebenen {−1, 0, +1, +2}, jedes Geschoss ≥ 2; Mikro zählt nicht.
- +2 nur vor einem +1-Element oder als Konsole unter Last (Stufung).
- Wandelemente höchstens +2 ([Alt]; [Q5]). Alles Einschätzung.

**Skizze – Schnitt Fensterachse und Pfostenachse** (FH = 5, Blick von Osten, außen = rechts) **und Ansicht einer Achse:**

```
Fensterachse              Pfostenachse              Ansicht Süd u=0..4
y\d -1  0  +1 +2          y\d -1  0  +1 +2          y5  B  B  B  B  B
y5  F   W  B  S           y5  F   W  B  S           y4  P  W  H  W  P
y4  .   W  H  .           y4  .   W  P  k           y3  P  L  G  L  P
y3  G   .  .  .           y3  .   W  P  .           y2  P  L  G  L  P
y2  G   .  .  .           y2  .   W  P  .           y1  P  W  K  W  P
y1  .   W  K  .           y1  .   W  P  .           y0  B  B  B  B  B
y0  F   W  B  .           y0  F   W  B  .
F floor · W Wand · G glass_pane (d=-1; d=0 = Luft) · B spruce_log[axis=x] · P spruce_log[axis=y]
H spruce_stairs[facing=north,half=top] · K stone_brick_stairs[facing=north,half=top] (Sims)
S spruce_stairs[facing=north,half=top] (Tropfnase d=+2) · k Kopfknagge, nur unter Last
L spruce_trapdoor[facing=south,open=true,half=top|bottom] (µ)  → 4 Ebenen + Mikro
```

**Wirkung** hoch · **Aufwand** mittel · **Stile** alle · [Q1][Q5][Q8][Q19][Q28]

### T2 Laibung: Glas und Türen in d = −1

Die Laibung sind die rechtwinklig zur Wand stehenden Innenflächen der Öffnung [Q36]. Auf Nord- und Südfassaden sind ihre Seiten mit 0,6 schattiert, der Sturz von unten mit 0,5, die Bank von oben mit 1,0. So entsteht ein „Schattenrahmen“ ohne echten Schatten (`texturedMesh.ts:66`). Belege: [Q21] und [Q16] („frame with the glass placed behind“).

**Lösung für unsere 1 Block dicke Wand.** Eine Scheibe allein in d = −1 stünde als dünner Pfosten im Raum (`windows.ts:10-13`). Deshalb kommt in d = −1 links und rechts je ein **Futterblock (J)** je Zeile dazu. Die Scheiben verbinden sich dann zum Futter (der Auflöser setzt das). Von außen ist das Futter unsichtbar. Keine Fallblöcke (`sand`, `gravel`, Betonpulver).

```
Draufsicht Fensterzeile (innen oben)        Türnische
       u=-1  0  1  2                               u=-1  0  1
d=-1    J    G  G  J                        d=-2    .    a  .     a = Innenfreiraum (heute in d=-1)
d= 0    W    .  .  W                        d=-1    J    D  J     D = Tür; Blatt an der Zellenvorderseite
d=+1    L    .  .  L                        d= 0    W    .  W         (Süd: facing=north, das geschlossene Blatt
J = Wandrolle · G = glass_pane · L = Laden (optional)  d=+1   .    .  .  liegt gegenüber von facing, shapes.ts)
```

**Regeln:**
- Laibungstiefe 1 bei Putz-, Massiv- und Fachwerkstilen; Shoji (W15) und Rahmenboxen dürfen bündig bleiben.
- Das Futter ist nie heller als die Wandhaut.
- Alternativ zum Sims in +1 kann die Sohlbank als `*_stairs[facing=north,half=bottom]` in d = 0 liegen (Wasserschlag-Schräge [Q44]).

**Wirkung** hoch · **Aufwand** mittel (Vorlagenfeld, Futter-Automatik in `place.ts`, Türfreiraum) · **Stile** alle · [Q16][Q21][Q36]. Einzelheiten: Thema Fenster/Türen.

### T3 Zurückgesetzte Felder und Schattenfuge

„pushing certain sections inward by one block and pulling others outward“ [Q4]; „moving the first level wall back a block“ [Q3]; Grau-Beton für „recessed panels“ [Q21].

- **Brüstungsfeld zurück:** Das Feld unter dem Fenster liegt in d = −1, d = 0 ist Luft. Die Fensterachse liest sich als senkrechtes Band (Einschätzung).
- **Schattenfuge (modern):** In der Bodenreihe des OG wird die Randzelle in d = 0 zu Luft, der Boden dahinter dunkel. Das ergibt eine umlaufende Fuge von 1 Block. Die Wand darüber hält über die Kante (18er-Nachbarschaft des Lints).

```
y\d  -1   0   +1
y6   .    W   .     W  = white_concrete
y5   Dk   .   .     Dk = gray_concrete (Bodenrand des OG, sichtbar als Fuge)
y4   .    W   .
```

**Wirkung** hoch (modern) / mittel · **Aufwand** niedrig · **Stile** modern, mediterran, Fachwerk groß · [Q3][Q4][Q21]

### T4 Lisenen, Pilaster, Finnen

- **Lisene:** eine „schwach vortretende, senkrechte Wandvorlage“ ohne Basis und Kapitell, an Kanten und zwischen Fensterachsen [Q32].
- **Pilaster:** mit Basis und Kapitell; an Ecken „canton“; als Kolossalordnung über zwei Geschosse [Q45].
- In Minecraft: „log or stone columns at the corners“ [Q4], „support columns and indenting them“ [Q6].
- Modern: Finnen nach dem Brise-soleil-Prinzip [Q49], Falltür-Lamellen [Q21].

**Blöcke (neue Rolle `trim`, Rückfall `roofTrim`):**
- mediterranean_white: `quartz_pillar[axis=y]` oder `smooth_quartz`, dazu `smooth_quartz_stairs/_slab`.
- mediterranean_warm: `sandstone`/`cut_sandstone` mit `sandstone_stairs` und `cut_sandstone_slab` auf `smooth_sandstone`.
- Mittelalter-Stein: `polished_andesite` auf `stone_bricks`, `stone_bricks` auf `cobblestone`.
- modern: `black_concrete`-Finnen, `light_gray_concrete`, `smooth_stone_slab`; Lamellen `spruce_fence`.

**Pfeilerspalten** (u = Wandspalten 0…W−1, Lisene davor in d = +1; Einschätzung nach Joch- und Achsenbegriff [Q48][Q38]):

| W | 7 | 9 | 11 | 13 | 15 | 17 | 19 |
|---|---|---|---|---|---|---|---|
| Pfeiler bei u | 0,6 | 0,3,5,8 | 0,4,6,10 | 0,4,8,12 | 0,5,9,14 | 0,4,6,10,12,16 | 0,6,12,18 |
| Joche | [5] | [2,1,2] Portal | [3,1,3] | [3,3,3] | [4,3,4] | [3,1,3,1,3] | [5,5,5] + Risalit |

```
Ansicht Süd, W = 13, mediterranean_white
u:  0  1  2  3  4  5  6  7  8  9 10 11 12
y5  =  =  =  =  =  =  =  =  =  =  =  =  =   = smooth_quartz_slab[type=top] d=+1 (Gurtband)
y4  v  W  W  W  v  W  W  W  v  W  W  W  v   v Kapitell smooth_quartz_stairs[facing=north,half=top] d=+2
y3  |  W  G  W  |  W  G  W  |  W  G  W  |   | quartz_pillar[axis=y] d=+1
y2  |  W  G  W  |  W  D  W  |  W  G  W  |   G glass_pane d=-1 · D Tür in der Nische
y1  ^  W  W  W  ^  W  D  W  ^  W  W  W  ^   ^ Basis smooth_quartz_stairs[facing=north,half=bottom] d=+2
y0  S  S  S  S  S  S  S  S  S  S  S  S  S   W white_concrete · S Sockel
```

**Regeln:**
- Lisene ≥ 1 Block neben der Öffnung; Ausnahme sind Portal-Lisenen an der Tür.
- Pilaster nur unter einem Band oder Gesims (Gebälk [Q46]).
- Eck-Lisenen auf beiden Fassaden plus Diagonale (T9b).
- Finnen im Abstand 2, nicht direkt neben Pfosten, sonst verbinden sich die Zäune seitlich (Einschätzung).

**Wirkung** hoch · **Aufwand** mittel (`buildPiers` in `walls.ts`, Raster wie `studPositions`) · **Stile** mediterranean, Mittelalter-Stein-EG, modern, Fantasy-Steinteile · [Q4][Q6][Q21][Q32][Q45][Q48][Q49]

### T5 Pfostenhierarchie im Holzbau

Belege: „Put a vertical dark oak log every 3 blocks and a horizontal row of logs on top“ [Q27]; Pfosten an den Ecken „and at several spots in between“ [Q24]; Doppelständer an Fensterachsen [Alt]; Pfeilerfuß vorgezogen [Q1].

- **Fuß:** Vollblock der Sockelrolle in d = +1 unter dem Pfosten, optional `*_stairs[facing=north,half=bottom]` in d = +2.
- **Kopfknagge:** `*_stairs[facing=north,half=top]` (beam) in d = +2, nur wenn darüber eine Jetty-Schwelle oder ein Traufgesims liegt.
- **Doppelständer:** an der Mittelachse bzw. an der Tür, höchstens 1 Paar je Fassade.
- **Brustriegel:** `beam[axis=x]` in d = +1 in der Sohlbankreihe der Fensterfelder statt des Simses. Damit ist kein Holzfeld höher als 3.

```
Ansicht Süd, W = 11, Pfosten bei u = -1, 2, 3, 7, 8, 11
u: -1  0  1  2  3  4  5  6  7  8  9 10 11
y5  B  B  B  B  B  B  B  B  B  B  B  B  B    B stripped_dark_oak_log[axis=x]
y4  P  I  I  P  P  I  I  I  P  P  I  I  P    P dark_oak_log[axis=y] · I white_terracotta
y3  P  G  G  P  P  I  G  I  P  P  G  G  P    G glass_pane d=-1
y2  P  G  G  P  P  I  G  I  P  P  G  G  P
y1  P  R  R  P  P  I  I  I  P  P  R  R  P    R Brustriegel stripped_dark_oak_log[axis=x] d=+1
y0  B  B  B  B  B  B  B  B  B  B  B  B  B
```

**Wirkung** mittel–hoch · **Aufwand** niedrig–mittel (`studs.ts`, `walls.ts:166-177`) · **Stile** medieval, fantasy, rustic, japanese, cherry · [Q1][Q24][Q27]

### T6 Geschossband, Gurtgesims, Sohlbankgesims

Der „belt course“ läuft zwischen den Geschossen oder auf Sohlbankhöhe durch, „often projects“ und macht „separate floors distinguishable“ [Q43]. Das Gurtgesims gliedert die Geschosse, das Putzband ist die flache Variante [Q34]. In Minecraft: „slabs as ledges“, „upside-down stairs near the top“ [Q4], Simse aus Stufen und Falltüren [Q29].

```
leicht                  kräftig (groß/riesig)        Holz (Bestand + Nase)
y\d   0  +1             y\d   0  +1                  y\d   0  +1 +2
y0+1  W  .              y0+1  W  Wa                  y0+1  I  P  .
y0    W  T              y0    W  Bd                  y0    I  B  S
y0-1  W  .              y0-1  W  T                   y0-1  I  P  .
T  *_stairs[facing=north,half=top] (Unterseite 0,5) · Bd Bandblock (cut_sandstone, polished_andesite)
Wa *_stairs[facing=north,half=bottom] (Wasserschlag) · S beam-Treppe [facing=north,half=top]
```

**Regeln:**
- Sohlbankgesims: eine durchgehende T-Reihe unter allen Fenstern, nur auf Fassaden ohne Pfeiler. An der Ecke bildet der Auflöser die Gehrung.
- An jeder Geschossgrenze ≥ 60 % der Länge mit Band, Balken, Jetty-Kante oder Fuge (Einschätzung nach [Q43]).
- Das Band läuft durch, Pilaster enden darunter.

**Wirkung** hoch · **Aufwand** niedrig · **Stile** mediterranean, Mittelalter-Stein, Fantasy; modern als Fuge (T3) oder `smooth_stone_slab[type=top]` in d = +1 · [Q4][Q29][Q34][Q43]

### T7 Kranzgesims, Fries, Zahnschnitt, Rundbogenfries

Das Gebälk besteht aus Gesims, Fries und Architrav; unter dem Gesims sitzen Zahnschnitt oder Modillions [Q46]. Der Kragstein trägt das Traufgesims [Q39]. Der Rundbogenfries ist eine Reihe von Halbkreisbögen auf kleinen Konsolen, oft mit Lisenen [Q40]. Takt-Vorbild: „blocks or stairs on every second block“ [Q17]. Die Gesimstreppe gibt es schon (`roofEngine.ts:370-373`). Neu sind Fries (Texturreihe in d = 0), Zahnschnitt und Bogenfries in d = +1.

```
Zahnschnitt (mediterran)          Rundbogenfries (Mittelalter-Stein, Fantasy)
yt    R R R R R R R R R           yt    R R R R R R R R R
yt-1  C C C C C C C C C           yt-1  ◤ ◥ ◤ ◥ ◤ ◥ ◤ ◥ |
yt-2  Z . Z . Z . Z . Z           yt-2  W W W W W W W W |
R Traufe · C Gesimstreppe (Bestand) ◤ stone_brick_stairs[facing=west,half=top] d=+1
Z smooth_quartz d=+1 · . Luft      ◥ stone_brick_stairs[facing=east,half=top] d=+1; ◤◥ = Bogen, ◥◤ = Konsole
                                   | Lisene; Gruppen von 3–5 Bögen
```

Die Formen bleiben `straight`, weil ◤ und ◥ einander parallel gegenüberstehen.

**Wirkung** mittel · **Aufwand** niedrig · **Stile** Zahnschnitt mediterranean (DG 3); Bogenfries medieval und fantasy an Turm und Kapelle (DG 3); Fries mediterranean (DG ≥ 2) · [Q17][Q39][Q40][Q46]

### T8 Sockel: Wasserschlag, Pfostenfüße, Rustika

Der Sockel springt meist vor, sein Abschluss ist das Sockelgesims [Q35]. Der „water table“ hat eine Oberseite „sloped or chamfered“, und die Wand darüber springt zurück [Q44]. Rustika betont das EG mit Fugenschatten [Q47]. In Minecraft: kräftiger Fuß, Wand „one block“ zurück [Q5]; Akzent: „a single row of Deepslate Tiles as a baseboard“ [Q23].

```
Schnitt Feld (P = 2)          Ansicht Süd, Pfosten bei u = 0 und u = 4
y\d  0   +1  +2               y3  P  W  W  W  P
y3   W   .   .                y2  Pf w  w  w  Pf
y2   S   w   .                y1  A  A  A  A  A
y1   S   S   A
S cobblestone · A Schürze (Bestand) · w cobblestone_stairs[facing=north,half=bottom] d=+1
Pf Pfostenfuß cobblestone d=+1 (+ optional cobblestone_stairs[facing=north,half=bottom] d=+2)
```

**Regeln:**
- Wasserschlag nur in Feldern; unter Pfosten und Lisenen liegt ein Vollblock.
- Bei P = 1 liegen Wasserschlag und Schürze in einer Reihe und bilden einen Stufensockel.
- Rustika mit Kanälen in d = +1/0 im Wechsel nur bei riesigen Bauten, sonst als flacher Texturwechsel (Einschätzung).
- Moos am Boden und an Fugen [Q22] (Thema Textur).

**Wirkung** mittel–hoch · **Aufwand** niedrig (`walls.ts:98-123`) · **Stile** alle; modern mit `polished_deepslate` und `smooth_stone_slab[type=bottom]` in d = +1 · [Q5][Q22][Q23][Q35][Q44][Q47]

### T9 Eckausbildung

Ecksteine verstärken die Ecke und vermitteln „strength, permanence, and expense“; typisch ist der Lang-Kurz-Wechsel [Q42]. Rustika läuft als Band an den Ecken [Q47]. Im Blockbau durchdringen sich die Stämme, die Köpfe stehen traditionell vor [Q41].

```
Draufsichten Südostecke (x → Ost, z ↓ Süd; ':' innen, '.' außen, Wandecke (x1,z1))
(a) Ist: Diagonalpfosten   (b) L-Eckpfeiler      (c) Quader bündig, Reihe A | Reihe B
     x1-1 x1 x1+1               x1-1 x1 x1+1          x1-2 x1-1 x1 x1+1   x1-2 x1-1 x1 x1+1
z1-1  :   W  .             z1-1  :   W  .        z1-1  :    :   W  .     :    :   Q  .
z1    W   W  .             z1    W   W  P        z1    W    Q   Q  .     W    W   Q  .
z1+1  .   .  P             z1+1  .   P  P        z1+1  .    .   .  .     .    .   .  .
(d) Bossen d=+1, A | B          (e) Blockbau-Vorköpfe, A | B      (f) Mauer-Fase   (g) Rücksprung
     x1-1 x1 x1+1                    x1-1 x1 x1+1                      x1-1 x1        x1-1 x1
z1-1  :   W  .  | :  W  Q       z1-1  :   Lz .  | :  Lz .        z1-1  :   W   z1-1  :   W
z1    W   W  .  | W  W  Q       z1    Lx  Lx Lx | Lx Lz .        z1    W   M   z1    W   .
z1+1  Q   Q  Q  | .  .  Q       z1+1  .   .  .  | .  Lz .
Lx log[axis=x], Lz log[axis=z] (Köpfe zeigen Ringe) · M *_wall (Auflöser: Arme N+W, Pfosten)
```

| Variante | Blöcke | Stile | Wirkung / Aufwand |
|---|---|---|---|
| (b) L-Eckpfeiler | Stamm oder `trim` | medieval, fantasy, rustic, nordic | hoch / niedrig |
| (c) Quader bündig | `polished_andesite`/`stone_bricks`, `quartz_bricks`/`white_concrete`, `cut_sandstone`/`smooth_sandstone` | mediterranean, Mittelalter-Stein | mittel / niedrig |
| (d) Bossen | wie (c), in d = +1 | Mittelalter-Stein, fantasy, Turm | hoch / niedrig |
| (e) Vorköpfe | `spruce_log`, `stripped_spruce_log` | rustic (logs), nordic | hoch / mittel (T14) |
| (f) Mauer-Fase | `stone_brick_wall`, `sandstone_wall`, `mud_brick_wall`, `tuff_brick_wall` | mediterranean_warm, fantasy | mittel / niedrig |
| (g) Rücksprung | Luft oder Pfosten in d = 0, Futter innen | modern, japanese | mittel / mittel |

**Regeln:**
- Eine Variante je Stil und Masse; Nebenmassen eine Stufe schlichter. Das folgt der Regel „1−4 possibilities … consistently“ [Q15].
- Fensterabstand zur Ecke: Massivbau ≥ 2, Holz ≥ 1.
- Quader 2/1 bis W = 11, 3/2 ab W = 13 (Einschätzung).

### T10 Risalit

Ein Risalit springt über alle Geschosse vor, als Mittel-, Seiten- oder Eckrisalit, oft mit Giebel. Ein Vorsprung, der nicht über alle Geschosse geht, ist ein Vorbau [Q33]. Bisher gibt es nur den Zwerchgiebel bei `rambling` (`plan.ts:257-275`).

**Regel** (Einschätzung): In symmetrischen Stilen wird ab W ≥ 15 das Mitteljoch (3–5 breit) als +1 vorgezogen. Es bekommt eine eigene Eckausbildung, das Band verkröpft sich um den Vorsprung, darüber sitzt ein kleiner Giebel oder Dreiecksgiebel.

```
Draufsicht Nordfassade, W = 15, Risalit 5 breit
u:    0 1 2 3 4 5 6 7 8 9 10 11 12 13 14
d=+2  . . . . . R R R R R  .  .  .  .  .    R Risalit-Ecklisenen
d=+1  L . . . . W W W W W  .  .  .  .  L    W Risalitwand · L Ecklisene Hauptbau
d= 0  W W W W W . . . . .  W  W  W  W  W
```

**Wirkung** hoch · **Aufwand** mittel–hoch (neue Masse `risalit` in `plan.ts`) · **Stile** mediterranean, japanese, modern, nordic (large/huge) · [Q33][Q38]

### T11 Giebelrelief

1. **Zurückgesetzt:** `gableRecess = true` legt die Füllung nach d = 0, Rähm und Ortgang in +1 rahmen sie. Die Mechanik gibt es schon (`roofEngine.ts:381`).
2. **Fachwerkgiebel:** Die Ständer laufen in +1 bis unters Dach, dazu ein Kehlbalken `[axis=x]` auf halber Höhe und optional „Mann“ oder Andreaskreuz [Alt].
3. **Vorkragend:** Die Giebelebene steht +1 vor, auf Konsolen unter dem Rähm; das Dach wird auf der Giebelseite um 1 länger.

Für mediterran und modern: zurückgesetzter Giebel mit Giebelgesims (T6) ergibt einen Dreiecksgiebel.

```
Fachwerkgiebel über W = 9, schematisch
y=t+3          r I r             r Ortgang (Bestand)
y=t+2        r I P I r           P dark_oak_log[axis=y] d=+1
y=t+1      r B B B B B r         B Kehlbalken stripped_dark_oak_log[axis=x] d=+1
y=t      r I P I I I P I r       I Füllung d=0
y=t-1    B B B B B B B B B       Rähm (Bestand)
```

**Wirkung** hoch · **Aufwand** niedrig (1) / mittel (2) / hoch (3) · **Stile** alle mit Satteldach · Querverweis: Thema Dächer

### T12 Auskragung und Konsolen – Ergänzungen zu [Alt]

- **Ausrichtung:** Konsolen unter jedem Hauptpfosten plus Eck-Knagge (zwei Treppen über Eck, der Auflöser macht die `outer`-Form). Zwischenkonsolen nur ab Feldbreite 4.
- **Kragstufung bei 2 Auskragung:** Treppe in +1 auf h, darüber ein Block in +1 und eine Treppe in +2 auf h + 1 [Alt]. Kragstein: „more horizontal and less imposing than a console“ [Q39].
- **Modern:** Das OG kragt +1/+2 ohne Konsolen aus, „sticks out far over the pillars“ [Q26]. Darunter eine glatte Untersicht `smooth_stone_slab[type=top]`.
- **Japanisch:** Weite Traufen brauchen „complex bracket systems“ [Q52]. Über dem Pfostenkopf ein bis zwei gestufte `dark_oak_stairs[facing=north,half=top]` (+2, bei Überstand ≥ 2 zusätzlich +3).
- **Grundregel:** Konsolen stehen nur unter einer Last.

**Wirkung** mittel · **Aufwand** niedrig · **Stile** medieval, fantasy, japanese, cherry, modern · [Q26][Q39][Q52]

### T13 Laube, Arkade, Pilotis

Die EG-Wand liegt in d = −1, die Stützen stehen in 0/+1, das OG bleibt in der Flucht. Vorbilder: Pilotis und „free facade“ [Q50], mediterrane Höfe und „open-air doorways“ [Q53], Engawa mit äußerer Pfostenreihe, 1–1,3 m breit (≈ 1 Block) [Q51].

```
y\d  -1   0   +1
y5   F    B   .     B Unterzug (beam)
y1-4 W    P   .     P Stütze (Stamm; modern black_concrete / polished_deepslate_wall)
y0   S    S   A     Laube 1 breit in d=0
```

**Wirkung** hoch · **Aufwand** hoch (das EG schrumpft) · **Stile** mediterranean (Bögen), modern, japanese, medieval (groß) · Querverweis: Thema Veranda/Bauteile

### T14 Blockbau-Wand

Liegende Hölzer, Eckverkämmung, Steinfundament [Q41]. Wandreihen mit `*_log[axis=x]` auf Nord und Süd, `[axis=z]` auf Ost und West; an den Ecken wechselt die durchlaufende Fassade (T9e). Fenster flankiert ein senkrechter Stamm. Ein Langhaus ist dagegen fast nur Dach mit 2 Block hohen Wänden und gekreuzten Firstbalken [Q25]; dort trägt der Sockel das Relief.

```
Ansicht Süd, Ecke rechts
u:  7 8 9 10 (11)
y4  = = = =  o     = spruce_log[axis=x] · o Kopf der Ostwand: spruce_log[axis=z] d=+1
y3  = = = =  =     Reihe A: Südwand läuft bis u=11 durch
y2  = = = =  o     Reihe B: Ostwand-Kopf steht vor
```

**Wirkung** hoch · **Aufwand** mittel (Achse je Fassade in `walls.ts:152`) · **Stile** rustic, nordic · [Q25][Q41]

### T15 Mikrorelief

„Use fences, trapdoors, and walls to create the illusion of structural support“ [Q4]; Zäune über die Füllung, aber sparsam [Q1]; „half slabs“ zum Abdecken [Q2]; Iron Trapdoors als „metal panel details“ [Q21]. Nageshi sind Riegel, die um die Pfosten gelegt und daran genagelt werden, in mehreren Höhen [Q54].

| Element | Blöcke und Zustände (Süd) | Takt | Stile |
|---|---|---|---|
| Brett und Leiste | `spruce_fence` d = +1 (verbindet sich nach Norden) | jede 2. Spalte, nicht neben Pfosten | nordic, rustic |
| Holznägel | `spruce_button[face=wall,facing=south]` d = +2 vor dem Balkenknoten | 1 je Knoten, DG 3 | medieval, rustic |
| Koshi-ita (Wandfuß) | `dark_oak_trapdoor[facing=south,open=true,half=bottom]` d = +1, Reihe y1 | durchgehend | japanese, cherry |
| Nageshi-Leiste | `dark_oak_trapdoor[half=top,open=false]` d = +1 über dem Sturz | zwischen Pfosten | japanese, cherry |
| Paneel / Lamelle | `iron_trapdoor` bzw. `dark_oak_trapdoor[facing=south,open=true]` | Felder ≥ 2 | modern |

**Regel:** höchstens 2 Mikro-Typen je Fassade [Q15], nie als einziger Tiefensprung. **Wirkung** niedrig–mittel · **Aufwand** niedrig

## Wandfeld-Rhythmus und Achsen

- **Begriffe:** Achse = senkrechte Linie übereinanderliegender Fenster; ungerade Zahl, Portal auf der Mittelachse [Q38]. Joch = Feld zwischen Pfeilern; ohne Pfeiler zählt jedes Fenster als Joch („5 bay by 2 bay“) [Q48].
- **Split-Grammatik:** Fassade → Geschosse → Joche mit Wiederholung `*` und „floating sizes“ `~`, ohne Reste [Q55]. `studPositions` ist ein Sonderfall davon.
- **Muster** (A = Fensterjoch, b = schmales Pfeilerjoch, M = Mitte):
  - A-A-A: klein oder Holz.
  - A-b-M-b-A: Türfassade ab W = 11.
  - A-b-A-b-A: lange Seiten ab 17.
  - Risalit-M: ab 15.
- **Regeln:**
  - Achsen stimmen über alle Geschosse (`openings.ts:13`).
  - Pfeiler stehen auf Jochgrenzen.
  - Keine Fenster in 1er-Jochen; die Ecke ist nie ein Fensterjoch.
  - Texturvarianten pseudo-zufällig alle 4–7, nicht im Takt 3 [Q22]: Der Rhythmus kommt aus der Struktur, der Zufall aus der Textur.

## Licht, Schatten und Lesbarkeit

1. **Keine Schlagschatten.** Flächen sind nach Richtung schattiert [Q10]; Spielwerte `texturedMesh.ts:66`.

| Front | Seitenfläche der Lisene | Unterseite Band | Oberseite Sims |
|---|---|---|---|
| N/S (0,8) | 0,6 (−25 %) | 0,5 (−37,5 %) | 1,0 (+25 %) |
| O/W (0,6) | 0,8 (+33 %) | 0,5 (−17 %) | 1,0 (+67 %) |

   Auf N/S-Fassaden lesen sich Unterseiten am stärksten, auf O/W-Fassaden die Oberseiten (Einschätzung).
2. **AO** prüft diagonal auf volle Blöcke [Q11]. Rücksprünge aus Vollblöcken werden dunkler, solche aus Treppen und Stufen vermutlich schwächer (Einschätzung). Ein echtes −1 schlägt deshalb jede Halbtiefe.
3. **Himmelslicht** verliert waagerecht 1 Stufe je Block [Q10]. Unter 2 Blöcken Traufe sind das etwa 13 statt 15, also schwach. Dunkleres Material unter Überständen hilft (S13).
4. **Distanz:** Flache Elemente (3/16, 2/16) haben kaum Seitenflächen und verschwinden aus 20+ Blöcken [Q8] (Schwelle geschätzt).
5. **Vorschau:** keine AO, Farbmodus schwächer als das Spiel (`buildVoxelMesh.ts:47`); Tiefe im Texturmodus beurteilen.

## Texturwechsel zwischen Ebenen

| Regel | Beispiel | Beleg |
|---|---|---|
| Nachbarebenen unterscheiden sich in Material oder Textur; den Lint ΔL ≥ 15 (Wand/Rahmen) für `trim` ergänzen: ΔL ≥ 8 **oder** Texturwechsel | `white_concrete` + `quartz_pillar` | [Q20], `lints.ts` |
| Vorn das Tragende, hinten die Füllung; modern umgekehrt (vorn hell und glatt, hinten dunkel) | Stamm/Putz; `white_concrete`/`gray_concrete`, `tinted_glass` | [Q21][Q26] |
| Rücklagen und Futter dunkler als die Wandhaut | Fuge `gray_concrete` | [Q21] |
| Unten rau und dunkel, oben glatt; Treppen aus derselben Familie wie die Ebene | `cobblestone` → `cobblestone_stairs` | [Q22] |
| Helle Stile: gleiche Farbe, andere Textur – Quarz (`smooth_quartz`, `quartz_bricks`, `quartz_pillar`, `chiseled_quartz_block`), Sandstein (`smooth_sandstone`, `sandstone`, `cut_sandstone`, `chiseled_sandstone`); Quarzsäulen „read as marble“ | Mediterrane Villa | [Q22] |
| Außen 4–5 Materialien | Wand, Tragwerk, Band, Sockel, Akzent | [Q7] |

## Workflow „Block-out → Layer → Detail“

- [Q1] geht so vor: Grundwand → Füllung zurück → Pfeiler vor → Textur → Glasscheiben → Stufen in der Mittelebene → Treppen unten → Simse → Zäune.
- [Q3] warnt: „more and more detail, but do not over detail it!“.
- [Alt]: erst ein Wand-Dach-Modul testen, dann wiederholen. [Q55]: Fassade → Geschosse → Joche.

| Stufe | Inhalt | Modul | Lücke |
|---|---|---|---|
| 1 Block-out | Massen, Geschosse, Dach | `plan.ts` | – |
| 2 Skelett | Achsen, Joche, Pfeiler, Bänder, Ecken, Sockelabschluss, Risalit; Tiefe je Zelle | verstreut in `walls.ts`/`studs.ts` | **Fassadenraster fehlt** |
| 3 Haut | Wand, Füllung, Öffnungen mit Laibung | `walls.ts`, `openings.ts` | −1 fehlt |
| 4 Detail | Simse, Läden, Mikro, Verwitterung | Vorlagen, `components.ts` | Mikro-Regeln |
| 5 Prüfung | Flachfeld, Ebenen, Halt | `buildingLints.ts` | verschärfen |

## Faustregeln

| Regel | Wert | Beleg |
|---|---|---|
| Flaches Feld (gleiche Stufe und gleicher Block) | ≤ 5 breit und ≤ 3 hoch, auch in Giebel und Sockel | Breite [Q19]/[Alt], Höhe: Einschätzung |
| Bündige Scheibe | kein Tiefensprung; erst ab ±8/16 | Einschätzung |
| Ebenen je Fassade ≥ 7 | ≥ 3 aus {−1,0,+1,+2}, je Geschoss ≥ 2 | [Q1][Q28] |
| Budget | small: 0/+1, Glas −1, Mikro · medium: −1/0/+1, +2 an Sockel und Geschosslinie · large/huge: alle 4 + Risalit | [Q5][Q8], Einschätzung |
| Maximaler Wandvorsprung | +2 (ohne Dach, Balkon, Erker) | [Alt][Q5] |
| Geschossgrenze | ≥ 60 % horizontales Element | [Q43], Einschätzung |
| Planversatz je Geschoss | ±1, Summe ≤ 2, kein rein-raus-rein | [Alt], Einschätzung |
| Jochbreite | Holz 1–4, Massiv 3–5, Pfeilerjoch 1–2 | [Q48], Einschätzung |
| Abstand Fenster–Lisene / –Ecke | ≥ 1 / Massiv ≥ 2, Holz ≥ 1 | Einschätzung |
| Konsolen | unter jedem Hauptpfosten + Ecke | [Alt] |
| Detailtypen / Mikrotypen je Fassade | 1–4 / ≤ 2 | [Q15] / Einschätzung |

## Kurzrezepte je Stil

| Stil | Pfeiler | Ecke | Band | Gesims | Sockel | Glas | Giebel | Mikro |
|---|---|---|---|---|---|---|---|---|
| medieval | Pfosten (OG), Lisenen + Bossen (Stein-EG) | (b)/(d) | Jetty + Nase | Bestand, Bogenfries am Turm | Wasserschlag + Füße | −1 | Fachwerk | Nägel |
| fantasy | Pfosten, Doppeljetty | (b)/(f) | Jetty je Geschoss | Konsolenfries | moosiger Stufensockel | −1 | Fachwerk/vorkragend | – |
| rustic | Pfosten oder Blockbau | (e)/(b) | Balken + Nase | Bestand | Wasserschlag | −1 | zurückgesetzt | Brett/Leiste, Nägel |
| nordic | wenige kräftige Pfosten | (e)/(b) | Balken | Bestand | hoher Sockel + Wasserschlag | −1 | zurückgesetzt + gekreuzte Firstbalken [Q25] | Brett/Leiste |
| japanese | Pfosten (Bestand) | (a)/(g) | Nageshi, Engawa | Kumimono | glatt | Shoji bündig | – | Koshi-ita |
| cherry | wie japanese (`cherry_log`) | (a) | Nageshi | Konsolen | `polished_deepslate` | −1/Shoji | zurückgesetzt | `cherry_trapdoor`-Fuß |
| modern | Finnen, Pilotis | (g) | Schattenfuge | Attika-Abdeckung `smooth_stone_slab[type=top]` d = +1 | dunkel + Platte | −1 | – | Metallpaneele |
| mediterranean | Lisenen/Pilaster ab W ≥ 11 | (c)/(f) | Gurtband + Sohlbankgesims | Fries + Zahnschnitt | Stufensockel | −1 | Dreiecksgiebel | Faschen als Farbrahmen [Q37] |

## Fehler, die Profis vermeiden

1. **Ein Trick überall.** Profis setzen 1–4 Mittel konsequent ein [Q15], ohne „over detail“ [Q3].
2. **Gleiches Material in Nachbarebenen.** Die Tiefe bleibt nur als Schattierung, in der Vorschau fast unsichtbar.
3. **Fensterrahmen in der Pfostenebene ohne eigene Tiefe.** Das Glas gehört nach −1.
4. **Bündiges Glas als einzige Tiefe** (S8).
5. **Konsolen und Kapitelle ohne Last, Pfosten ohne Fuß.** Wirkt angeklebt oder schwebend.
6. **Struktur und Zufall verwechselt.** Texturen im Takt wirken wie Tapete [Q22]; ein Raster ohne Rhythmus wirkt beliebig [Alt].
7. **Flache Giebel** über gegliederten Geschossen.
8. **Rein-raus-rein über mehrere Geschosse** oder > 2 Vorsprung ohne Stütze [Alt].
9. **Mikro statt Struktur.** Knöpfe und Falltüren verschwinden aus der Distanz [Q8].
10. **Ungewollte Treppenecken.** Gleich halbe Treppen nebeneinander formen sich um; Abhilfe schaffen ein anderes `half`, ein Vollblock dazwischen oder eine bewusste Gehrung.
11. **Zäune oder Mauern direkt neben Pfosten** verbinden sich seitlich zu Riegeln. Deshalb rät [Q1], Zäune nicht zu häufig zu setzen.
12. **Fallblöcke** im Futter oder in schwebenden Bändern.
13. **Alle Häuser gleich.** GDMC-Juroren nennen Generatorbauten „like they had maybe been produced by children or new players“, ohne Dekoration und Varianz [Q30]; gefragt sind funktionale, ästhetische und glaubwürdige Siedlungen [Q31].

## Empfehlungen für den Generator

| P | Was | Modul | Art | Akzeptanzkriterium |
|---|---|---|---|---|
| 1 | Laibung −1 für Glas und Tür, Futter automatisch (2 je Zeile, Wandrolle, keine Fallblöcke), Türfreiraum 1 nach innen | `templates/windows.ts`, `doors.ts`, `place.ts`, `openings.ts` | Daten (`reveal: 1`) + Regel | ≥ 80 % der Nicht-Shoji-Fenster mit Glas in −1; keine unverbundene Scheibe; Validator 0; Lint „Türen frei“ grün |
| 2 | Fassadenraster als eigene Stufe (Joche, Pfeiler, Bänder, Tiefe je Zelle), von `walls.ts`/`openings.ts` gelesen | neu `house/facadeLayout.ts` (`studs.ts` als Sonderfall) | Regel + Stildaten `facade: { piers, bay, corner, band, sillCourse, plinthCap, cornice, gable, reveal, micro }` | Deterministisch; ohne `facade` bitgleich zu heute; Pfeilertabelle T4 als Test |
| 3 | Lisenen, Pilaster, Finnen, Eckquader; neue Rolle `trim` (Rückfall `roofTrim`) | `walls.ts` (`buildPiers`, `buildCorners`), `palettes.ts`, `lints.ts` | Daten + Regel | Modern und mediterran bestehen P5; der Screenshot mediterran zeigt Lisenen, Band und Quader |
| 4 | Geschossband, Schattenfuge, Sohlbankgesims, Attika-Abdeckung | `walls.ts:137-143`, `217-226` | Daten (`band`) + Regel | Jede Geschossgrenze zu ≥ 60 % mit Element in ≥ +1 oder Fuge −1 |
| 5 | Lint: Vorderkante in 1/16 aus `shapes.ts`; bündige Scheibe zählt nicht; Prüffenster 6 × 4; Giebel und Sockel; ≥ 3 Ebenen; max +2 | `buildingLints.ts:81-132` | Regel | Alle Stile, Größen und Themen grün; eine flache Fixture-Wand schlägt fehl |
| 6 | Giebel: `gableRecess` für Sattel; Fachwerkgiebel bei `timber ≠ none`; Dreiecksgiebel mit Gesims (mediterran) | `plan.ts:423`, `roofEngine.ts:377-407` | Daten (`gable`) + Regel | Kein Giebel mit flacher 6×4-Fläche; Fixpunkt und Dachlücken grün |
| 7 | Sockel: Wasserschlag in Feldern, Pfostenfüße, Basen +2, Stufensockel bei P = 1 | `walls.ts:98-123` | Regel | ≥ 70 % der Sockelkante aus Treppen/Stufen; Vollblock unter jedem Pfosten |
| 8 | Pfostenhierarchie: Doppelständer, Brustriegel, Kopfknagge unter Last | `studs.ts`, `walls.ts:166-177`, `openings.ts:262-277` | Regel | Kein Holzfeld > 3 hoch ohne Riegel; Knaggen nur unter Last |
| 9 | Jetty-Konsolen am Raster + Eck-Knagge; optional Ost/West | `walls.ts:181-192`, `plan.ts:211` | Regel | Konsolen genau unter den Hauptpfosten; outer-Formen an den Ecken; Validator 0 |
| 10 | Blockbau: Achse x/z je Fassade, Vorköpfe, keine Eckpfosten | `walls.ts:146-153`, `materials.ts` | Daten (`corner: 'logEnds'`) + Regel | `rustic_logs` ohne `axis=y` in der Wand |
| 11 | Risalit ab W ≥ 15 (symmetrische Stile) | `plan.ts` | Regel | Tür auf der Mittelachse; Dach ohne Lücken; Hinweis in `notes`, wenn er nicht passt |
| 12 | Mikro-Daten (T15): DG 1 keins, DG 2 ein Typ, DG 3 zwei | `components.ts` | Daten | ≤ 2 Typen je Fassade; Validator 0 |
| 13 | `underOverhang`/`drip` an `weathered()` übergeben | `walls.ts:152` | Regel | Messbar mehr Varianten unter dem Jetty (Thema Textur) |
| 14 | `\|\| true` entfernen | `walls.ts:161`, `247` | Code | Gleiche Hashes |
| 15 | AO in der Vorschau (Hinweis an das Thema Vorschau) | `components/preview/*` | – | Rücksprünge sichtbar dunkler |

**Blöcke außerhalb der Registry** (gibt es in 1.21.11, fehlen bei uns):
- `waxed_copper_bars` und Oxidationsstufen [Q13][Q14] (nicht in Registry).
- `copper_chain`/`copper_lantern` [Q13] (nicht in Registry).
- `polished_blackstone_button` (nicht in Registry).
- `chiseled_tuff` (nicht in Registry).
- `smooth_basalt` (nicht in Registry).

Regale (1.21.9) sind Block-Entities mit Inventar und werden nicht empfohlen. Falltüren brauchen seit 1.9 keinen Halt [Q12].

## Quellen

1. PMC – Basic depth and detail – https://www.planetminecraft.com/blog/how-to-become-a-better-builder-basic-depth-and-detail/ – 3-Ebenen-Wand, Pfeilerfuß, Scheibe als 4. Ebene.
2. PMC – Tips and Tricks for large structures (Walls) – https://www.planetminecraft.com/blog/tips-and-tricks-for-large-structures-wallscontest/ – halbe Stufen auf Ebene 2, Treppen/Stufen symmetrisch.
3. PMC – How To Add Depth To a Medieval Build – https://www.planetminecraft.com/project/how-to-add-depth-to-a-medieval-build/ – EG-Wand 1 zurück, „do not over detail“.
4. PMC – The Ultimate Trick to Build Better – https://www.planetminecraft.com/blog/the-ultimate-trick-to-build-better-in-minecraft-that-most-players-ignore/ – rein/raus um 1, Ecksäulen, Simse, Stützen-Illusion.
5. PMC – How to build: Medieval [Beginner] – https://www.planetminecraft.com/blog/how-to-build-medieval-beginner/ – Wand 1 eingerückt, Tiefe „a block and a half … two layers“.
6. PMC – Creating Mega-Builds – https://www.planetminecraft.com/blog/creating-mega-builds-tips-amp-tricks-plus-general-building-tips-/ – Stützsäulen, Einrückungen.
7. PMC – How to make a building look great – https://www.planetminecraft.com/blog/how-to-make-building-look-great/ – 4–5 Materialien außen.
8. PMC – Axewemolga's Building Lessons #1 – https://www.planetminecraft.com/blog/building--many-different-approaches-w-the-same-basics/ – größere Bauten brauchen mehr Tiefe.
9. PMC – How To Improve Your Minecraft Builds – https://www.planetminecraft.com/blog/how-to-improve-your-minecraft-builds – Tiefe mit Stufen, nicht zu repetitiv.
10. minecraft.wiki – Light – https://minecraft.wiki/w/Light – Flächenschattierung, AO, Himmelslicht −1 je Block.
11. minecraft.wiki – Smooth lighting – https://minecraft.wiki/w/Smooth_lighting – AO prüft diagonal auf volle Blöcke.
12. minecraft.wiki – Trapdoor – https://minecraft.wiki/w/Trapdoor – 3/16 dick, seit 1.9 ohne Halt.
13. minecraft.wiki – Java Edition 1.21.9 – https://minecraft.wiki/w/Java_Edition_1.21.9 – Kupfergitter, -ketten, -laternen, Regale.
14. minecraft.wiki – Copper Bars – https://minecraft.wiki/w/Copper_Bars – IDs und Zustände.
15. minecraft.wiki – Tutorial:Walls and buttresses – https://minecraft.wiki/w/Tutorial:Walls_and_buttresses – 1–4 Mittel konsequent, 3D-Textur.
16. minecraft.wiki – Tutorial:Adding beauty to constructions – https://minecraft.wiki/w/Tutorial:Adding_beauty_to_constructions – Fenstertiefe, Glas hinter dem Rahmen.
17. minecraft.wiki – Tutorial:Construction – https://minecraft.wiki/w/Tutorial:Construction – Krone „every second block“.
18. minecraft.wiki – Tutorial:Architectural terms – https://minecraft.wiki/w/Tutorial:Architectural_terms – Konsole und Kragstein im Spiel kaum unterscheidbar.
19. Craftdex – The Architecture of Builds – https://craftdex.net/articles/the-architecture-of-builds – One-Block-In, Mikro-Tiefe, flach ab > 5.
20. Craftdex – Stone Variant Palette Guide – https://craftdex.net/articles/stone-variant-palette-guide – „Pick by tone. Layer for depth.“
21. BlockBlend – Modern Block Combos – https://blockblend.app/guides/modern-building-blocks – Glas 1 zurück, Grau-Beton als Schattenlinie, Falltür-Lamellen und -Paneele.
22. BlockBlend – Medieval Palettes – https://blockblend.app/guides/medieval-palette-guide – Moos an Boden und Fugen, Takt 4–7, Quarzsäule als Marmor.
23. BlockBlend – Color Theory – https://blockblend.app/guides/minecraft-color-theory – 60-30-10, Deepslate-Sockelleiste.
24. Blockwerks – Japanese Cherry Wood House – https://blockwerks.netlify.app/en/builds/japanese-cherry-house/ – Pfosten an Ecken und dazwischen, Überstand 2.
25. Blockwerks – Viking Longhouse – https://blockwerks.netlify.app/en/builds/viking-longhouse/ – Wände 2 hoch, gekreuzte Firstbalken.
26. Blockwerks – Modern Villa with Pool – https://blockwerks.netlify.app/en/builds/modern-villa-with-pool/ – OG über Stützen auskragend, Dach 1 über.
27. Blockwerks – Medieval Manor House – https://blockwerks.netlify.app/en/builds/medieval-manor-house/ – Stamm alle 3, OG 1 breiter.
28. GamerEmpire – 7 Wall Design Ideas – https://gamerempire.net/minecraft-house-wall-design-ideas/ – drei Ebenen Calcit/Karmesin/Schwarzstein.
29. GGServers – Improve Building Skills – https://ggservers.com/blog/improve-minecraft-building-skills-easily/ – Simse, Stützen, Kopfüber-Treppen als Rahmen.
30. Salge et al. – GDMC Impressions – https://ar5iv.labs.arxiv.org/html/2108.02955 – Generatorbauten wirken wie von Anfängern gebaut.
31. Salge et al. – GDMC 2018 – https://arxiv.org/abs/1803.09853 – funktional, ästhetisch, glaubwürdig.
32. Wikipedia de – Lisene – https://de.wikipedia.org/wiki/Lisene – Wandvorlage ohne Basis und Kapitell.
33. Wikipedia de – Risalit – https://de.wikipedia.org/wiki/Risalit – Mittel-, Seiten-, Eckrisalit; Vorbau.
34. Wikipedia de – Gesims – https://de.wikipedia.org/wiki/Gesims – Dach-, Gurt-, Fenster-, Sockelgesims; Putzband.
35. Wikipedia de – Sockel (Architektur) – https://de.wikipedia.org/wiki/Sockel_(Architektur) – vorspringend, Sockelgesims.
36. Wikipedia de – Laibung – https://de.wikipedia.org/wiki/Laibung – Innenflächen rechtwinklig zur Wand.
37. Wikipedia de – Fasche – https://de.wikipedia.org/wiki/Fasche – plastische, vertiefte oder farbige Umrahmung.
38. Wikipedia de – Achse (Architektur) – https://de.wikipedia.org/wiki/Achse_(Architektur) – Fensterachse, Mittelachse, ungerade Zahl.
39. Wikipedia de – Kragstein – https://de.wikipedia.org/wiki/Kragstein – trägt das Traufgesims.
40. Wikipedia de – Rundbogenfries – https://de.wikipedia.org/wiki/Rundbogenfries – Bögen auf Konsolen, mit Lisenen.
41. Wikipedia de – Blockbau – https://de.wikipedia.org/wiki/Blockbau – Eckverkämmung, vorstehende Köpfe.
42. Wikipedia en – Quoin – https://en.wikipedia.org/wiki/Quoin – Ecksteine, Lang-Kurz-Wechsel.
43. Wikipedia en – Belt course – https://en.wikipedia.org/wiki/Belt_course – Gurt zwischen Geschossen bzw. auf Sohlbankhöhe.
44. Wikipedia en – Water table – https://en.wikipedia.org/wiki/Water_table_(architecture) – schräger Sockelvorsprung, Wand darüber zurück.
45. Wikipedia en – Pilaster – https://en.wikipedia.org/wiki/Pilaster – Basis/Kapitell, „canton“, Kolossalordnung.
46. Wikipedia en – Cornice – https://en.wikipedia.org/wiki/Cornice – Gebälk, Zahnschnitt, Modillions.
47. Wikipedia en – Rustication – https://en.wikipedia.org/wiki/Rustication_(architecture) – EG und Ecken, Fugenschatten.
48. Wikipedia en – Bay (architecture) – https://en.wikipedia.org/wiki/Bay_(architecture) – Joch, ein Fenster je Joch.
49. Wikipedia en – Brise soleil – https://en.wikipedia.org/wiki/Brise_soleil – Lamellen, Schattenmuster.
50. Wikipedia en – Five Points of Architecture – https://en.wikipedia.org/wiki/Five_Points_of_Architecture – Pilotis, freie Fassade.
51. Wikipedia en – Engawa – https://en.wikipedia.org/wiki/Engawa – 1–1,3 m breit, zwei Pfostenreihen.
52. Wikipedia en – Japanese architecture – https://en.wikipedia.org/wiki/Japanese_architecture – weite Traufen auf Konsolsystemen.
53. Wikipedia en – Mediterranean Revival architecture – https://en.wikipedia.org/wiki/Mediterranean_Revival_architecture – Putz, Bögen, Gitterbalkone, Höfe.
54. JAANUS – nageshi – https://www.aisf.or.jp/~jaanus/deta/n/nageshi.htm – an die Pfosten genagelte Riegel in mehreren Höhen.
55. Esri CityEngine – CGA split – https://doc.arcgis.com/en/cityengine/latest/cga/cga-split.htm – Fassade in Geschosse und Joche, „floating sizes“.

Interne Belege: `src/core/blocks/shapes.ts` (Boxen in 1/16), `src/core/textures/texturedMesh.ts:66`, `src/components/preview/buildVoxelMesh.ts:47`; [Alt] = `research_notes/Minecraft Bautechniken für Generator/waende_struktur.md`.
