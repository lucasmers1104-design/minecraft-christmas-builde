# 14 – Winter- und Weihnachtsdeko an und um Gebäude

Stand: 2026-10-23 · Ziel: Minecraft Java 1.21.11, nur Vanilla-Blöcke

Thema: Wie Schnee, Eis, Licht und Festschmuck an und um ein Gebäude so platziert werden, dass das Ergebnis nach einem erfahrenen Builder aussieht und nicht nach einem Generator. Alles ist als Bausteinkatalog mit Rastern, Blockzuständen und Dichteregeln aufbereitet.

Abgrenzung: Die Grundmechanik (Schneeschichten, Schmelzregeln, Laub ohne Stützfläche, Golem-Muster, Vanilla-Laternenpfähle, Pfadmischungen) steht schon in `research_notes/Minecraft Bautechniken für Generator/winter_weihnachten_landschaft.md` (im Folgenden „Altnotiz“). Ich wiederhole sie hier nicht, sondern korrigiere und erweitere sie. Was nur angrenzt, verweise ich an die Nachbarthemen: Beleuchtung allgemein an 18, Baum, Markt und Bahnhof als Bauwerk an 17, Kamin- und Dachgeometrie an die Dach-Themen, Fenster an 03.

Methode: Ich habe 23 verschneite Vanilla-Dorfhäuser und das Iglu aus den 1.21.11-Strukturdaten selbst ausgewertet [25][26]. Dazu kommen Wiki-Mechanik, Builder-Artikel von minecraft.net und Sportskeeda sowie reale Vorbilder. Reddit und Planet Minecraft blockieren den Abruf (403). Alles, was keine Quelle hat, steht als „Einschätzung“ im Text.

---

## Kurzfassung

Nach Wirkung sortiert:

1. **Gleichmäßiger Schnee verrät den Generator.** Mojang variiert die Schichthöhe selbst. In den Vanilla-Schneedörfern sind am Boden nur 71 % der Schneeschichten `layers=1`, der Rest verteilt sich auf 2–8. Auf Dächern sind es 85 % `layers=1` [25]. Wir legen dagegen eine glatte Platte aus `snow_block` und überall `layers=1`. Besser wirken Schichthöhen in Clustern, freigeräumte Wege mit Schneewällen am Rand, schneefreie Streifen unter den Überständen und ein Wulst an der Tropfkante.
2. **„Weihnachten auf Sommerwiese“ ist der stärkste Stilbruch.** Ohne Wunsch kommt kein Schnee, und die Beete blühen mit Mohn und Löwenzahn. Gemini Tay beschreibt den Winterumbau so: zuerst eine Schneeschicht, dann der Gedanke, was sich bei Kälte ändert: „the fountain … would be frozen, and the flowers would be gone“ [27]. Blumen sollten im Winter- und Weihnachtsthema also immer verschwinden. Schnee bleibt eine Entscheidung des Creative Directors.
3. **Geschenke gehören in Gruppen unter den Baum oder neben die Tür, nie verstreut in den Hof.** Profis mischen Größen (1×1 und 3×3), wählen höchstens drei gedeckte Farben und verwenden Shulker-Boxen, die eine Deckelfuge haben. Ein Band aus Teppich und eine Schleife aus Kerzen ergänzen sie. Grelle Farben wie `lime`, `light_blue` oder gelber Beton wirken wie Spielzeugklötze.
4. **Schmuck muss zum Maßstab des Baums passen.** Gemini Tay baut ihren Baum riesig, weil man für „larger ornaments, and presents“ Platz braucht. Der Stern soll aussehen wie ein Stern und nicht „like a big yellow square“ [27]. Bei Kwells Baum lobt Sportskeeda, dass die Kugeln nicht „insanely big“ sind [32]. Daraus folgt: Unter etwa 12 Blöcken Höhe gibt es keine Kugeln aus Vollblöcken, sondern nur Licht im Laub und Laternen, die an Ketten hängen.
5. **Licht in der Girlande gehört versteckt und sparsam gesetzt.** Bei uns ist jedes dritte Feld ein sichtbarer Leuchtblock der Stufe 15, und alle 4–6 Felder sitzt ein roter Wollwürfel. Besser sind ein Licht alle 4–6 Felder hinter dem Laub oder ein `end_rod` darunter. Schleifen kommen nur an Ankerpunkte, und der Bogen hängt wirklich durch.
6. **Ein Kranz ist ein Ring mit hohler Mitte.** Unsere waagerechte Laubleiste über der Tür liest sich als Balken. Besser ist ein Ring aus 3×3 oder 5×5 Feldern, unten eine Schleife und darunter optional ein rotes Wandbanner als Bänder. Ein Banner ohne Muster braucht keine NBT-Daten [13].
7. **Schnee auf Treppendächern geht nur über einen eigenen Dachmodus.** Auf normalen Treppen und unteren Stufen hält keine Schicht. Mojang baut Schneedächer deshalb aus Vollblock-Stufen mit einer Schicht darauf [25]. Daraus wird ein optionaler „Schneedach“-Modus: Traufe und Ortgang bleiben aus Dachmaterial, die Fläche wird `snow_block` plus Schicht. Steile Dächer bleiben kahl, Flachdächer tragen die dickste Schicht.
8. **In 1.21.11 gibt es keinen echten Eiszapfen.** Ein `icicle`-Block existiert erst in den Snapshots zu 26.4 („Fourth Drop 2026“) und schmilzt dort schon ab Blocklicht 5 [7][8]. Für 1.21.11 taugen zwei Behelfe. Unverbundene Glasscheiben sind ein Pfosten von 2×2 Pixeln, schneesicher und eisblau [5]. Ein `end_rod[facing=down]` liest sich als „Eiszapfen-Lichterkette“ und funkelt [4]. Pointed Dripstone ist braun und wirkt schmutzig [6].
9. **Schneesichere Lichter gehören in eine eigene Palette.** Dazu zählen Kerzen bis 12, `soul_lantern` (10), `redstone_torch` (7, Mojang beleuchtet so das Iglu [26]), `glow_lichen` (7), `light[level≤11]` sowie verwitterte und oxidierte Kupferleuchten (8 und 4) [16][17][18][19].
10. **Eis schmilzt weiter weg als Schnee.** Es schmilzt, wenn ein **Nachbar** Licht über 11 hat [2]. Bei einer Quelle der Stufe 15 ist das bis zum Taxi-Abstand 4 der Fall. Unser Validator prüft Eis aber mit der Schneegrenze (Radius 3), das ist ein Fehler.
11. **Das offene Lagerfeuer auf dem Kamin sieht aus wie ein brennender Schornstein.** Die Flamme gehört verborgen. Der Rauch steigt etwa 10 Blöcke, mit Heuballen darunter etwa 24 [10]. Dass der Schnee rund um den Kamin schmilzt, ist realistisch: Am warmen Kamin schmilzt Schnee [43].
12. **Dosierung nach der Regel 1-1-n.** Pro Fassade gibt es ein Hauptmotiv, eine Linie und wenige Kleinteile. Alle Gebäude bekommen dieselben Motive mit kleinen Abweichungen. Gemini Tay formuliert es so: „similar decorations on all the buildings, and just having small variations“, ohne „over-crowding“ [27]. Meafcraft sagt: „less is more“ [28].
13. **Vorhandene Winterteile werden nie benutzt.** Die Vorlagen W18 (Winterfenster) und T10 (Weihnachtseingang) wählt weder ein Stil noch eine Familie noch das Thema aus.
14. **Flachdächer und Ortgänge bekommen nie Deko.** Traufzellen gibt es nur bei geneigten Dachabschnitten und nur ohne Ortgang. Der moderne Stil bekommt deshalb keine Lichtlinie. Er braucht Licht auf der Attika, am besten `end_rod`.
15. **Winter und Weihnachten sind zwei Schichten.** Winter heißt Schnee, Eis, Rauch, warme Fenster, Holzstapel, Schneemann und weiße Kerzen. Weihnachten fügt Grün, Rot, Gold, Geschenke, Baum, Kranz und Stern hinzu, und zwar auf dem Winter, nicht stattdessen.

---

## Schwächen des aktuellen Generators

Belegt aus den Screenshots `docs/screenshots/*-weihnachten.jpg`, `haus-nordisch-winter-schnee.jpg`, `weihnachtsbaum.jpg` und `marktstand.jpg` sowie aus dem Code.

| # | Schwäche | Ort | Folge im Bild |
|---|---|---|---|
| 1 | Die Girlande ist jedes 3. Feld ein Leuchtblock (`glowstone`, bei Detail 3 `ochre_froglight`, Licht 15), alle 4–6 Felder sitzt `red_wool` | `festive.ts:79`, `:101`, `:106` | Gelbe und rote Würfel unter der Traufe, beim mediterranen Haus besonders grob. Bei Schnee schmilzt der Streifen im Radius 3. |
| 2 | Der „Bogen“ setzt Laub doppelt in y und y−1 | `festive.ts:103–108` | Klumpen statt Durchhang |
| 3 | Der Kranz ist eine waagerechte Laubreihe in Türbreite + 2 mit roter Wolle in der Mitte | `festive.ts:135–151` | Wirkt wie ein grüner Sturzbalken (Mittelalter, Modern) |
| 4 | Kerzenfarbe (rot/weiß) und Anzahl (1–3) werden je Sims ausgewürfelt, Chance 50 bzw. 80 % je Fenster | `festive.ts:153–161` | Unruhig, ohne Symmetrie |
| 5 | Geschenke sind Woll-Einzelwürfel mit Teppich auf zufälligen Hofzellen, Farben `lime`, `light_blue`, `yellow` … | `festive.ts:41`, `:163–174` | „Spielzeugklötze“ quer über den Rasen. Beim modernen und mediterranen Haus stapelt sich ein Turm aus 2–3 Würfeln. |
| 6 | Am Baum-Grundstück liegen die Geschenke **außerhalb** der Krone (Ring r > R+0,5) | `generateBuilding.ts:170–174` | Drei verlorene Würfel weit vor dem Baum (`weihnachtsbaum.jpg`) |
| 7 | 8–12 % der Hülle sind Vollblock-Kugeln in 6 Farben, alle gleich groß | `christmasTree.ts:58–62`, `:107–115` | „Konfetti“-Baum. Am 7 Blöcke hohen Gartenbaum (`generateBuilding.ts:145`) sind die Kugeln riesig. |
| 8 | Der Stern ist `gold_block` mit 5 `end_rod` | `christmasTree.ts:126–139` | Genau der „big yellow square“, vor dem Gemini Tay warnt [27] |
| 9 | Schnee wird nur auf Wunsch gesetzt (`snow: wishes.snow ?? false`), auch beim Thema Winter | `house/resolveInput.ts:123` | Winter und Weihnachten auf grüner Wiese |
| 10 | Blumen in Beeten werden nicht nach Thema gefiltert | `landscape.ts:43–52`, `:146–158` | Mohn, Löwenzahn und Zierlauch im Dezember |
| 11 | Schneeboden ist eine flache Platte aus `snow_block`, die Schneedecke überall `layers=1` | `landscape.ts:59`, `festive.ts:183–197` | Weißes Tablett (`haus-nordisch-winter-schnee.jpg`), keine Tiefe, keine Spur |
| 12 | Der Teich entsteht nur bei `theme==='winter'` und nur auf `grass_block` | `landscape.ts:164–173` | Mit Schneeboden nie, ohne Ufer und bündig |
| 13 | Auf dem Kamin brennt ein offenes Lagerfeuer | `house/components.ts:144`, `:162` | Sichtbare Flamme auf jedem Schornstein |
| 14 | Eis wird mit der Schneeschwelle geprüft (Licht ≥ 12 an der eigenen Position, Suchradius 3) | `blocks/validator.ts:160`, `:173–181` | Eis im Abstand 4 zu einer Laterne gilt als sicher, schmilzt im Spiel aber und wird zu Wasser [2] |
| 15 | Alle Kupferleuchten haben Licht 15 | `blocks/families.ts:229` | Falsch für exposed, weathered und oxidized (12/8/4) [18]. Die Schmelzprüfung ist dadurch zu streng. |
| 16 | W18 und T10 stehen in keiner Stil- oder Familienliste | `templates/windows.ts:526–540`, `templates/doors.ts:235–251`, `templates/catalog.ts:55–73`, `style/styles.ts:82–274` | Die Wintervorlagen kommen nie zum Einsatz |
| 17 | Keine Traufzellen bei Flachdächern und am Ortgang | `roof/roofEngine.ts:424`, `:426` | Am modernen Haus gibt es keine Lichtlinie, Giebelkanten bleiben immer kahl |
| 18 | Die Hecke ist auch bei Weihnachten `oak_leaves` | `landscape.ts:108` | Eichenlaub färbt sich im Spiel je nach Biom und ist im Schnee bläulich bis grau. Fichte ist farbfest (#619961, Altnotiz). |

---

## Techniken und Regeln (Dekobaustein-Katalog)

Konventionen: Ansicht = Blick auf die Fassade, Spalte a = Lage entlang der Wand. Schnitt = senkrecht zur Wand, Spalte d = Tiefe (−1 innen, 0 Wand, +1/+2 davor). „Traufzelle“ ist die Zelle direkt unter der äußersten Dachreihe aus `roofEngine.eaveCells`. Ein Punkt steht für Luft. Alle Laubblöcke sind `[persistent=true]`. Bewertung: W = Wirkung, A = Aufwand für den Generator.

### S – Schnee

**S1 Bodenschnee in Clustern.**
Grundlage ist `snow[layers=1]` auf `grass_block` (der Auflöser setzt `snowy=true`). Darüber kommen Flecken aus Werte-Rauschen mit Skala 4–6 Blöcke, in denen die Schicht auf 2–3 steigt, selten auf 4. Zielverteilung am Boden: 70 % L1, 12 % L2, 10 % L3, 6 % L4, 2 % L5+. Das ist angelehnt an Vanilla, wo am Boden 71/8/5/6/6/4 % gezählt wurden [25]. Unter Schichten ab 2 wird Gras im Spiel zu Erde, das bleibt aber unsichtbar [1]. `snow_block` als Boden nur dort, wo eine Verwehung Schicht 8 erreicht.

```
Draufsicht 10×4, Ziffer = snow[layers=n] auf grass_block
z0: 1 1 1 2 2 1 1 1 1 1
z1: 1 1 2 3 2 1 1 1 2 1
z2: 1 1 1 2 1 1 1 2 3 2
z3: 1 1 1 1 1 1 1 1 2 1
```
Einsatz: alle Stile, wenn Schnee gewünscht ist. W hoch, A niedrig. Quellen: [1], [25], Einschätzung (Cluster statt Salz-und-Pfeffer).

**S2 Geräumter Weg mit Schneewall.**
Auf dem Weg liegt kein Schnee, auf `dirt_path` hält ohnehin keiner (Altnotiz). Direkt daneben steigt ein Wall auf L3 und fällt nach außen auf L1. Das gilt nur für Hauptwege zur Tür. Nebenwege bekommen nur am Rand L1. Grund: Geräumter Schnee landet am Wegrand (Einschätzung, reale Logik).

```
Schnitt quer zum Weg (Breite 3), y0 Boden, y1 Schneezelle
y1:  1 2 3 . . . 3 2 1      Ziffer = snow[layers=n]
y0:  G G G P P P G G G      G = grass_block, P = Wegblock (dirt_path, gravel, cobblestone …)
```
W hoch, A niedrig.

**S3 Traufzone: frei unter dem Dach, Wulst an der Tropfkante.**
Wo ein Dach über der Bodenzelle liegt, bildet sich im Spiel kein Schnee, denn Schneefall legt sich auf den obersten Block. Das Wiki beschreibt es für die Taiga so: Schnee bedeckt alles „save for the ground protected by the leaves“ [24]. Unsere Regel: Zellen unter dem Überstand bleiben ohne Schnee. In der ersten Zelle außerhalb der Dachprojektion liegt bei steilem oder 45°-Dach L3–4 (abgerutschter Dachschnee), bei flachem Dach normaler Schnee (Einschätzung).

```
Schnitt, Überstand 2, Traufe y4
       d:  0 +1 +2 +3 +4 +5
y4:        R  R  R  .  .  .      R = Dachreihen
y3:        W  .  .  .  .  .      W = Wand
y1:        P  0  0  4  2  1      Ziffer = layers, 0 = schneefrei
y0:        P  G  G  G  G  G      P = Sockel, G = grass_block
```
Achtung: Eine Traufenlaterne in 3 Blöcken Höhe über dem Boden schmilzt den Wulst im Radius 3 weg. Die Laterne muss dann höher hängen oder durch eine `soul_lantern` ersetzt werden. W hoch, A mittel.

**S4 Kappen auf First, Gauben und Simsen.**
Das gibt es schon (`addSnowCover`). Neu: Am First L1–2 im Wechsel. Auf Simsen aus Kopfüber-Treppen (volle Oberseite [1]) L1 neben der Kerze. Kerzen bis 3 Stück (Licht 9) schmelzen nichts. Auf Vordächern mit `type=top`-Stufen L1–2. Welche Formen Schnee tragen:

| Form | Schnee hält | Beleg |
|---|---|---|
| Vollblock (außer `ice`, `packed_ice`, `barrier`), `blue_ice` | ja | [1], Altnotiz |
| Treppe `half=top`, Stufe `type=top`/`double` | ja | [1] („upside-down stairs“) |
| Treppe `half=bottom`, Stufe `type=bottom` | nein | Regel „full top face“ [1] |
| Falltür geschlossen `half=top` | ja (Kollision 13–16 px) | Einschätzung, deckt sich mit `validator.ts:169` |
| Laub | ja (volle Kollision) | [24] als Indiz, Altnotiz |
| Zaun, Mauer, Scheibe, Teppich, `dirt_path`, Ackerboden, Kerze, Laterne | nein | [1], Altnotiz |
| `snow[layers=8]` | ja | [1], `validator.ts:104` |

W mittel, A niedrig.

**S5 Schneedach (optionaler Dachmodus).**
Mojang baut verschneite Dorfdächer als Stufen aus Vollblöcken (`spruce_planks`) und legt `snow[layers=1]` auf jede Stufe. In `snowy_medium_house_2` endet die unterste Reihe in einer `spruce_slab[type=bottom]` [25]. Für unsere Dach-Engine heißt das: Die Traufreihe (r = 0) und die Ortgangreihen bleiben aus Dachmaterial, damit die Silhouette die Dachfarbe behält. Ab Reihe 1 wird die Dachhaut `snow_block`, darauf liegt L1 (75 %) oder L2 (25 %). `snow_block` schmilzt nie [30], das Dach bleibt also auch neben Lichtern weiß.

```
Schnitt quer zum First, 45°-Profil, Überstand 1
     c0 c1 c2 c3 c4 c5 c6 c7
y8:  .  .  .  s  s  .  .  .
y7:  .  .  s  N  N  s  .  .
y6:  .  s  N  .  .  N  s  .
y5:  .  N  .  .  .  .  N  .
y4:  T  W  .  .  .  .  W  T
Legende: T = <roof>_stairs[half=bottom, facing=zum First] (Traufreihe, kein Schnee)
         N = snow_block, s = snow[layers=1|2], W = Wand
```
Profilregel: Bei `flat` (½ Block je Reihe) wechseln Vollblock mit `snow[layers=4]` und der nächste Vollblock mit L1, das ergibt eine weiche Rampe. Bei 45° und Glocke wie oben. Bei `steep` und A-Frame **kein** Schneedach, nur Firstschnee, denn steile Dächer werfen Schnee ab, und genau so beschreiben es Winterhaus-Tutorials („A sloped roof helps keep snow off“ [37]). Auf Flachdächern L2–4 in Clustern. Auf dem flachen Vanilla-Bibliotheksdach liegen L1 bis L4 unregelmäßig [25].
Einsatz: nordic, rustic, medieval, fantasy bei Schnee. W hoch, A mittel (eigener Hautmodus in `roofEngine`).

**S6 Verwehung nach Windrichtung.**
Laut Wikipedia bildet Schnee auf der Luvseite eines großen Objekts einen Kamm und fällt dann ab. Auf der Leeseite liegt er nah am Objekt etwas niedriger und flacher [44]. In Vanilla sind dicke Schichten nicht häufiger an Wänden als frei: 13 % gegen 16 % der Schichten ab 3 [25]. Mojang modelliert keinen Wind. Regel (Einschätzung): Die Windrichtung kommt aus dem Seed. Auf der Luvseite von Wand, Hecke oder Zaun gilt das Profil [4,3,2,1] nach außen, auf der Leeseite [1,1], danach Normalverteilung.

```
Draufsicht, Wind von Westen →
     a: 0 1 2 3 4 5 6 7
z0:     4 3 2 1 H H 1 1       H = Hauswand (Westseite links ist Luv)
z1:     4 3 2 1 H H 1 1
```
W mittel, A niedrig.

**S7 Verschneite Bäume und Hecken.**
Gibt es schon über das oberste Laub. Wichtig: Unter der Baumkrone und unter Hecken-Überhängen keinen Bodenschnee setzen [24]. Bei Fichten mit Etagen bekommt jede Etage automatisch ihre Kappe. W mittel, A niedrig.

### E – Eiszapfen (Option, Regel „keine Eiszapfen“ bleibt Standard)

Reale Grundregel: Eiszapfen entstehen an der **Traufe**, wo Schmelzwasser von Sonne oder Gebäudewärme wieder gefriert [42][43]. Sie bilden sich nicht am Ortgang und nicht an Wänden. Auf der sonnigen Südseite gibt es mehr (Einschätzung nach [42]).

**E1 Glasposten.**
`light_blue_stained_glass_pane` oder `white_stained_glass_pane` in der Traufzelle. Ohne Nachbarn ist die Scheibe ein dünner Pfosten von 2×2 Pixeln und braucht keinen Halt [5]. Sie verbindet sich nicht mit Laub (Ausnahmeliste in `stateResolver.ts:79–97`). Sie verbindet sich aber mit Vollblöcken, Scheiben und Zäunen. Daher gilt: kein horizontaler Nachbar außer Luft oder Laub, Abstand ≥ 2. Die Scheibe leuchtet nicht und ist damit schneesicher.

```
Ansicht Süd, Traufreihe y6
       a: 0 1 2 3 4 5 6 7 8 9
y6:      R R R R R R R R R R      R = Traufreihe
y5:      I . I . . I . . I .      I = light_blue_stained_glass_pane (unverbunden)
y4:      . . I . . . . . . .      2. Glied nur bei large/huge
```
Dichte: Südtraufe 40 % der Traufzellen, andere Seiten 15 %, nie in Kehlen über Türen. Stile: nordic, rustic, medieval, fantasy. W mittel, A niedrig. Quellen: [5][42], Einschätzung (Optik).

**E2 Eiszapfen-Lichter.**
`end_rod[facing=down]` hängt unter der Traufe, für längere Zapfen steckt ein zweiter `end_rod[facing=down]` darunter. Stäbe lassen sich an jede Fläche setzen, auch an andere Stäbe, und fallen nicht ab [4]. Sie geben weiße Partikel ab, das wirkt wie Funkeln [4]. „Icicle lights“ gibt es als echte Lichterketten-Sorte [45]. Licht 14 schmilzt Schnee im Taxi-Radius 2 [4], mit unserer Formel 14−d ≥ 12. Deshalb gilt: in der Traufreihe selbst ohnehin kein Schnee, Schnee auf der nächsten Dachreihe erst ab Abstand 3.

```
Ansicht, y6 = Traufreihe
       a: 0 1 2 3 4 5 6 7 8
y6:      R R R R R R R R R
y5:      E . E . E . E . E      E = end_rod[facing=down]
y4:      . . E . . . E . .      Längen 1–2 im Muster 1,2,1,1,2 (Seed)
```
Stile: modern, japanese (sparsam), fantasy. Thema: Weihnachten. W mittel, A niedrig.

**E3 Eiszapfen mit dicker Wurzel (nur huge).**
Oben `packed_ice` (opak, schmilzt nie [Altnotiz]), darunter `white_stained_glass_pane` als dünne Spitze. Das ist die einzige Verjüngung in 1.21.11 ohne Brauntöne. W niedrig, A niedrig.

**E4 Pointed Dripstone.**
`pointed_dripstone[vertical_direction=down, thickness=frustum]` über `[thickness=tip]` (nicht in Registry). Er braucht oben eine volle Unterseite, also nicht unter Kopfüber-Treppen oder `type=top`-Stufen [6]. Er tropft sichtbar Wasserpartikel [6], die Farbe ist aber Terrakotta-braun [6]. Nur für „Tauwetter“ im rustic-Stil, sonst nicht verwenden. W niedrig.

**E5 Ausblick.**
Der echte `icicle`-Block (`attached`, `thickness`, `vertical_direction`, `waterlogged`) wächst unter `packed_ice` und schmilzt ab Blocklicht 5 [7]. Er verträgt sich also nicht mit warm beleuchteten Fassaden. Mit Drop 4/2026 kommen auch `packed_ice`-Ziegel, -Treppen, -Stufen und -Mauern [8]. Das wären „Eistreppen“ für Schneedächer. Nichts davon gibt es in 1.21.11, es ist nur Stoff für ein späteres Profil.

### G – Girlanden

**GA1 Traufgirlande mit Ankern.**
`spruce_leaves` in den Traufzellen. **Anker** liegen an Läufen über 8 Felder alle 5–7 Felder sowie an Ecken, Laufenden und über der Mittelachse der Tür. Nur an Ankern sitzt eine Schleife (`red_wool`, nur Weihnachten). Licht bringen drei Varianten:
- (a) Bei Überstand ≥ 2 ein versteckter Leuchtblock direkt hinter der Girlande (d−1), alle 4–6 Felder. `shroomlight` für warmes Licht, `ochre_froglight` für neutrales. Laub lässt Licht durch, der Block schimmert also durch.
- (b) Bei Überstand 1 alle 3–4 Felder ein `end_rod[facing=down]` unter der Girlande.
- (c) Bei Schnee in der Nähe keine Leuchtblöcke, stattdessen (b) mit `soul_lantern`-Ankern oder gar kein Licht.

```
Ansicht Nord, Traufzelle y5
       a: 0 1 2 3 4 5 6 7 8 9 10
y5:      B L L L L L B L L L L      B = Anker (red_wool bei Weihnachten, sonst L), L = spruce_leaves
y4:      . . . e . . . . . e .      e = end_rod[facing=down] (Variante b)

Schnitt, Überstand 2 (Variante a)
      d:  0 +1 +2
y6:       R  R  R       R = Dachreihen / Untersicht
y5:       W  H  L       H = shroomlight (alle 4–6 Felder, sonst Luft), L = Girlande in der Traufzelle
```
Laubart nach Stil: spruce (Standard), `pale_oak_leaves` als „bereifte“ Wintergirlande (graugrün, nur 1.21.11), `cherry_leaves` für cherry, `azalea_leaves` für fantasy. W hoch, A niedrig. Quellen: Einschätzung, Lichtdurchlass von Laub (Altnotiz).

**GA2 Durchhängender Bogen.**
Die Periode P = 6 liegt zwischen zwei Ankern. Die Felder 2–4 hängen eine Ebene tiefer, **ohne** Laub darüber.

```
Ansicht, Anker bei a = 0, 6, 12
       a: 0 1 2 3 4 5 6 7 8 9 10 11 12
y5:      B L . . . L B L . . .  L  B
y4:      . . L L L . . . L L L  .  .
```
Nur bei Detail 3 und nur, wenn y4 frei von Fensterköpfen ist. W hoch, A niedrig (ersetzt `festive.ts:103–108`).

**GA3 Fenstergirlande.**
Über dem Sturz (d = +1) liegt eine Laubreihe, an jeder Seite ein Feld breiter als das Fenster. Die Enden hängen ein Feld neben den Läden herab. Auf dem Sims stehen Kerzen. Das ist eine Weiterentwicklung von W18.

```
Ansicht Süd, Fenster 1×2 (y1–y2)
       a: -2 -1  0 +1 +2
y3:       .  L  L  L  .       L = spruce_leaves (d=+1)
y2:       L  T  G  T  L       T = Laden (Vorlage), G = glass_pane (d=0)
y1:       .  T  G  T  .
y0:       .  S  K  S  .       S = Sims (<frame>_stairs[half=top]), K = white_candle[candles=2,lit=true]
```
Pro Fassade höchstens die Hälfte der Fenster, symmetrisch zur Achse. W mittel, A niedrig.

**GA4 Lichterkette am Attika-Rand (modern, Flachdach).**
Auf jedem 2. Block der Attika-Krone steht ein `end_rod[facing=up]`, oder Kerzen auf jedem 2. Mauerpfosten. Das ersetzt die fehlenden Traufzellen. W mittel, A niedrig.

### K – Kränze, Sterne, Adventskranz

**K1 Türkranz 3×3.**
Er hängt auf freier Wand neben oder über der Tür (d = +1), niemals vor der Tür. Die Mitte bleibt hohl, die Wand ist sichtbar. Unten sitzt die Schleife. Darunter kann optional `red_wall_banner[facing=außen]` (nicht in Registry) als Bänder hängen. Ein Wandbanner braucht einen festen Block dahinter und reicht optisch etwa einen Block unter seine Zelle. Ohne Muster braucht es keine Block-Entity-Daten [13].

```
Ansicht Nord, d=+1, Wand d=0 voll und fensterfrei
       a: -1  0 +1
y+2:      L   L  L       L = spruce_leaves
y+1:      L   .  L       . = Wand bleibt sichtbar
y+0:      L   B  L       B = red_wool (Schleife)
y-1:      .   F  .       F = red_wall_banner[facing=north] (optional, Wand dahinter nötig)
```
W hoch, A niedrig. Ersetzt `festive.ts:135–151`.

**K2 Giebelkranz 5×5.**
Ein dünner Ring D5 mit 12 Zellen aus der Geometriebibliothek, mittig im Giebelfeld bei Häusern ab medium. Zwei „Beeren“ aus `red_terracotta` im oberen Bogen, die Schleife unten.

```
Ansicht, d=+1
. L L L .
L r . r L      r = red_terracotta (gedeckter als Wolle)
L . . . L
L . . . L
. L B L .      B = red_wool
```
W hoch, A niedrig.

**K3 Herrnhuter-Stern am Eingang.**
Ein Leuchtkern hängt an einer Kette unter dem Vordach. Vier `end_rod` zeigen in die vier waagerechten Richtungen, ein fünfter nach unten. Real hängt der Herrnhuter Stern in Fenstern und Hauseingängen, weiß, rot oder gelb [40].

```
Ansicht Nord, Vordach-Unterseite y4 (voller Block)
y4:  .  P  .      P = Vordach
y3:  .  C  .      C = iron_chain[axis=y]
y2:  E  K  E      K = pearlescent_froglight[axis=y] (weiß) / ochre_froglight (gelb)
y1:  .  e  .      E = end_rod[facing=east|west], dazu [facing=north|south] in d±1; e = end_rod[facing=down]
```
Die Unterkante muss mindestens eine Ebene über der Türoberkante liegen. Stile: nordic, medieval, rustic. W mittel, A niedrig.

**K4 Adventskranz XXL (Platz und Markt).**
Ein Ring 5×5 aus Laub mit 4 Pfosten, auf denen Kerzen stehen. Die Kerzen brauchen eine Stütze in der Mitte, und die bietet `spruce_fence`. Auf Laub geht es nicht (Altnotiz).

```
Draufsicht y0 (Ring), y1 = Kerzen über P
. L P L .      L = spruce_leaves, P = spruce_fence
L . . . L      y1 über P: red_candle[candles=1,lit=true|false]
P . . . P
L . . . L
. L P L .
```
Regel: Es brennen so viele Kerzen, wie es der Adventswoche entspricht (1–4, aus dem Seed). Farben: im Erzgebirge nur rot, katholisch drei violette und eine rosa [39]. W mittel, A niedrig.

### L – Lichter und Lichterketten

**L1 Kerzenbank (Schwibbogen-Andeutung).**
Der erzgebirgische Schwibbogen ist ein Lichterbogen aus Kreisbogen und Sekante und steht in Advents- und Weihnachtszeit im Fenster oder auf der Fensterbank [38]. Der Innenraum bleibt bei uns leer, deshalb kommt er auf den Außensims: symmetrisch, in der Mitte die meisten Kerzen.

```
Ansicht, Fenster 5 breit, Sims y0
       a: -2 -1  0 +1 +2
y1:       k1 k2 k3 k2 k1     kN = white_candle[candles=N,lit=true]
y0:       S  S  S  S  S      S = <frame>_stairs[half=top]
```
Bei 1–2 breiten Fenstern eine Kerze pro Sims, je Fassade eine Farbe und eine Anzahl. Licht bis 9 ist schneesicher [11]. W hoch, A niedrig.

**L2 Firstkerzen.**
Auf jeder 2. Zelle eines Vollblock-Firsts oder einer `type=top`-Stufe steht eine Kerze (`candles=1`, Farbe nach Thema). Sie zeichnet die Dachlinie wie eine reale Lichterkette entlang der Dachlinie [45] und verträgt sich mit Firstschnee. W mittel, A niedrig.

**L3 Glühbeeren-Vorhang.**
`cave_vines_plant[berries=true]` hängt unter einem Block mit voller Unterseite, unten endet er mit `cave_vines[age=25,berries=true]` (beide nicht in Registry). Licht 14 [15]. `age=25` verhindert, dass die Ranke im Spiel weiterwächst [15]. Der Halt fehlt unter Laub, Kopfüber-Treppen und `type=top`-Stufen. Wirkt wie warme Lichterketten im Grün. Nicht in Schnee-Nähe (Radius 2).

```
Ansicht, Vordach/Traufe y6
y6: R R R R R R R
y5: V . V . . V .      V = cave_vines_plant[berries=true] (bei Länge 1 direkt v)
y4: v . . . . v .      v = cave_vines[age=25,berries=true]
```
Stile: fantasy, cherry, rustic. W mittel, A niedrig.

**L4 Zaunkerzen.**
Auf jedem 2. Pfosten von Garten- oder Verandazaun steht `<color>_candle[candles=1,lit=true]`. Das ist die „Lichterkette am Geländer“ [45] und schneesicher. W mittel, A niedrig.

**L5 Frostfunkeln am Rahmen.**
`glow_lichen` (Licht 7, nicht in Registry) sitzt in d=+2 auf der Außenseite der Rahmenpfosten. An einer Nordfassade ist das `[south=true]`, weil die Fläche zur Wand zeigt. Die Flechte haftet an jeder Seite fester Blöcke und breitet sich nicht von selbst aus [16]. Nur Winter, fantasy und nordic, höchstens 1 von 3 Rahmenfeldern. W niedrig, A niedrig.

**L6 Laternen an Ketten (gibt es).**
Neue Regeln: höchstens alle 6 Felder und nie gleichzeitig mit GA1-Licht im selben Lauf. Bei Schnee ersetzt `soul_lantern` (10) die normale Laterne. Unter horizontalen Ketten hält keine Laterne, die Kette muss `axis=y` haben (Formmodell `shapes.ts`, bestätigt das „ungeprüft“ der Altnotiz).

**L7 Warmes Fensterlicht ohne Möbel.**
Ein `light[level=11]` (nicht in Registry) steht unsichtbar und ohne Kollision eine Zelle hinter jedem Erdgeschossfenster [19]. Der Raum bleibt optisch leer, die Innenwände werden nachts warm ausgeleuchtet, und im Innern spawnen keine Mobs. Stufe 11 schmilzt weder Schnee noch Eis, auch nicht direkt daneben. Einschätzung zur Bildwirkung: ohne Shader nur mäßig. W mittel, A niedrig.

### P – Geschenke

Platzierungsregel für alle Geschenke:
1. **Unter dem Baum.** Ring 1 ≤ r ≤ R_unten−1 um den Stamm, unter der untersten Etage. Dazu braucht der Baum mindestens 2 freie Stammblöcke (B1).
2. **Am Eingang.** 2–3 Stück seitlich der Stufen, nie im Laufweg, also außerhalb der Clearance aus `festive.ts:86–94`.
3. **Auf Schlitten und Markttheken.**

Nie einzeln im Hof. Anzahl je Baum: clamp(round(1,2·R_unten), 2, 12). Große vorne außen, kleine obenauf und innen.

**P1 Klein 1×1.**
`<Papier>_wool` oder `<Farbe>_shulker_box[facing=up]` (nicht in Registry), darauf `<Band>_carpet`. Die Shulker-Box zeigt eine Deckelfuge und braucht keinen Inhalt [14]. Teppich hält auf jedem Block, der nicht Luft ist (`validator.ts:101–102`).

```
Schnitt
y1: c      c = <Band>_carpet
y0: X      X = <Papier>_wool | <Farbe>_shulker_box[facing=up]
```

**P2 Groß 3×3×2 mit Bandkreuz.**
```
Ansicht (alle vier Seiten)        Draufsicht Ebene y1
y2: .  k  .                        X  r  X
y1: X  r  X                        r  r  r
y0: X  r  X                        X  r  X
Legende: X = <Papier>_wool, r = <Band>_wool (Band läuft über Seiten und Deckel),
         k = <Band>_candle[candles=4,lit=false] als Schleifenknoten
```
Nur bei Bäumen ab H ≥ 18 und auf Plätzen. Gemini Tay baut zum Riesenbaum einen „gigantic pile of gigantic presents“ [27]. Ungerade Breiten nehmen, damit das Band mittig läuft.

**P3 Stapel.**
Ein P2- oder 2×2-Block (ohne Band, z. B. Shulker-Boxen) bildet den Unterbau. Darauf liegt versetzt ein P1. Der Stapel ist höchstens 3 hoch und steht nie freistehend als Turm.

Farbpaletten nach Stil (Einschätzung, abgeleitet aus den Stilpaletten). Je Szene höchstens 3 Papierfarben und 2 Bandfarben:

| Stil | Papier | Band |
|---|---|---|
| medieval, rustic | `brown_terracotta` („Packpapier“), `red_wool`, `white_wool` | `white_carpet`, `red_carpet` |
| nordic | `white_wool`, `red_wool`, `light_gray_wool` | `red_carpet`, `white_carpet` |
| fantasy | `purple_wool`, `cyan_terracotta`, `white_wool` | `yellow_carpet`, `white_carpet` |
| japanese | `red_wool`, `white_wool` | `white_carpet`, `red_carpet` |
| cherry | `pink_wool`, `white_wool`, `magenta_terracotta` | `white_carpet` |
| modern | `white_concrete`, `black_wool`, `gray_wool` | `red_carpet`, `yellow_carpet` |
| mediterranean | `blue_wool`, `white_wool`, `orange_terracotta` | `white_carpet`, `yellow_carpet` |

Verboten bei Weihnachten: `lime_*`, `light_blue_*` und `yellow_concrete` als Papier. W hoch, A niedrig.

### B – Baum (Ergänzung zu Thema 17)

**B1 Maßstabstabelle** (Einschätzung, gestützt auf [27][32]):

| Laubhöhe H | Vollblock-Kugeln | Lichter | Spitze | Stammfreiheit | Geschenke |
|---|---|---|---|---|---|
| ≤ 11 | keine | 4 % Leuchtblöcke innen und 2–4 B2-Laternen | B4 | 2 | 2–4 × P1 |
| 12–17 | 5–7 %, max. 3 Farben | 5 % innen | B4 | 2 | 4–8 |
| ≥ 18 | 6–8 %, 1–2 Kugeln aus Buntglas mit Licht [33] | 5 % innen und Spiralband | B3 | 3 | 6–12, davon ≥ 1 P2 |

Der Gartenbaum soll mit dem Haus wachsen: H = 9 (small) bis 13 (huge) statt fest 7 (`generateBuilding.ts:145`).

**B2 Hängende Laternen.**
Unter Laubblöcken der untersten zwei Etagen am Rand hängt `iron_chain[axis=y]`, daran `lantern[hanging=true]`. Ketten brauchen keinen Halt (siehe `festive.ts:15`). So sieht es bei Kwells Baum aus („lanterns hanging off the bottom“) [32].

```
Schnitt durch die unterste Etage (Rand)
y3: L L L L L
y2: . C . . C       C = iron_chain[axis=y]
y1: . O . . O       O = lantern[hanging=true]
```

**B3 Kreuzstern (H ≥ 18).**
Zwei gleiche Pixelsterne in der x- und der z-Ebene mit gemeinsamer Mittelspalte.

```
Ansicht (beide Ebenen gleich), über dem obersten Laub
y+4: . . Y . .
y+3: Y Y K Y Y      Y = gold_block (oder yellow_wool, matter)
y+2: . Y Y Y .      K = ochre_froglight[axis=y]
y+1: . Y . Y .
y+0: Y . . . Y
```

**B4 Funkelspitze (H < 18).**
Kein Würfel: `end_rod[facing=up]` auf dem obersten Laub, darum vier waagerechte `end_rod[facing=außen]` auf gleicher Höhe.

```
Draufsicht y_top      Ansicht
. E .                 y_top+1: . U .
E L E                 y_top  : E L E     U = end_rod[facing=up]
. E .
```
W hoch für B1–B4, A niedrig bis mittel.

### F – Figuren und Szenen

**F1 Schneemann ohne Golem.**
Ganz ohne Kürbis, dann entsteht kein Golem. Der klassische Aufbau aus zwei Schneeblöcken und Kürbis ist genau das Golem-Muster [34]. Wer einen Kürbiskopf will, setzt ihn über `white_wool`, wie die Altnotiz und [31] beschreiben. Die Nase ist `waxed_lightning_rod[facing=außen]`. Der Stab ist kupferfarben, also eine „Karotte“. Gewachst oxidiert er nicht [21]. Arme aus `spruce_fence` verbinden sich mit dem Schneeblock. Knöpfe sind `dark_oak_button[face=wall]` und brauchen eine volle Seitenfläche. `snow_block` schmilzt neben Laternen nicht [30].

```
XS (1×1, Ansicht Nord)          M (Kreuz 3×3, Ansicht Nord)          Draufsicht y0–y2 (M)
y3: .  h  .                      y4:  .  .  h  .  .                    .  S  .
y2: .  K  .   (+ n in d+1)       y3:  .  s  K  s  .  (+ n in d+1)      S  S  S
y1: A  S  A   (+ b in d+1)       y2:  A  S  S  S  A                    .  S  .
y0: .  S  .                      y1:  .  S  S  S  .
                                 y0:  .  S  S  S  .
Legende: S/K = snow_block, h = black_carpet (Mütze), n = waxed_lightning_rod[facing=north],
         A = spruce_fence, b = dark_oak_button[face=wall,facing=north],
         s = red_carpet (Schal auf den Kreuzarmen links, rechts, hinten; vorne liegt die Nase)
```
Ein Gesicht mit zwei Augen braucht einen Kopf von 3×3, weil vor jeder Zelle nur ein Block Platz hat. Das ist die Größe L aus den Kugeln D5, D3 und D3 der Geometriebibliothek. Ein Schneemann je Grundstück, im Hof mit Blick zum Weg. Gemini Tay stellt ganze Schneemann-Familien auf [27]. Bei uns gibt es Familien erst ab Detail 3 und Größe large. W hoch, A mittel.

**F2 Schlitten 2×4.**
Einschätzung, in der Vorschau prüfen.

```
Seitenansicht Ost, z0 = Front (beide x-Spalten gleich)
y1:  .  .  G  W      G = Geschenk P1, W = red_wool (Lehne)
y0:  S  W  W  W      S = spruce_stairs[facing=north,half=bottom] (hochgebogene Spitze)
```
Er steht neben der Tür oder am Holzstapel, mit 1–2 Geschenken beladen. W mittel, A niedrig.

**F3 Zuckerstangen** (Grundmuster in der Altnotiz).
Paarweise links und rechts vom Hauptweg, wie bei Gemini Tay („candy canes either side of the path“ [27]). Abstand 5–6, Haken zum Weg. Nur fantasy, cherry, modern und Markt, nicht bei medieval und nordic. W mittel, A niedrig.

**F4 Weihnachtspyramide (Markt, Platz).**
Pyramiden gehören zum Bild deutscher Weihnachtsmärkte [41].

```
Schnitt x = -1..+1 (Etagen 3×3)
y8: T  .  T       T = spruce_trapdoor[open=true] als Flügelrad (4 Stück um A)
y7: .  A  .       A = stripped_spruce_log[axis=y]
y6: k  A  k       k = white_candle[candles=1,lit=true] auf den Etagenecken
y5: P  A  P       P = spruce_slab[type=top] (volle Oberseite für Kerzen)
y4: F  A  F       F = spruce_fence (Eckpfosten)
y3: k  A  k
y2: P  A  P
y1: F  A  F
y0: Q  Q  Q       Q = spruce_planks
```
W mittel, A niedrig.

**F5 Holzstapel.**
Unter dem Überstand an einer Seitenwand: 3–5 lang und 2 hoch, die Enden abgestuft. `spruce_log` liegt mit der Achse senkrecht zur Wand, die Jahresringe zeigen nach außen (an der Nordwand `axis=z`). Darauf optional `spruce_slab[type=bottom]` als Abdeckung. Ohne Schnee, weil unter dem Dach (S3). Einschätzung, Winter-Kernmotiv für rustic, nordic und medieval. W mittel, A niedrig.

```
Schnitt              Ansicht
      d: 0 +1          y1: . H H H .
y1:      W  H          y0: H H H H H     H = spruce_log[axis=senkrecht zur Wand]
y0:      P  H
```

### U – Winterumgebung

**U1 Gefrorener Teich.**
Unregelmäßige Fläche von 4–9 Feldern. 70 % `packed_ice` und 20 % `blue_ice`, beide schmelzen nie. 10 % sind `blue_ice` mit `snow[layers=1]`, denn auf Blaueis hält Schnee (Altnotiz). Das Ufer bekommt einen Ring L2. So liegt das Eis optisch 2–4 Pixel tiefer, obwohl der Boden nur eine Lage hat. `ice` nur mit Taxi-Abstand ≥ 5 zu Licht 15 [2]. Es ist durchscheinend und zeigt ohne Wasser darunter nur Erde. Der Teich entsteht auch auf Schneeboden (Bug #12). W mittel, A niedrig.

**U2 Rauch.**
Das Lagerfeuer verschwindet in einer Kaminkrone. Ein 1×1-Zug bekommt an der Feuerebene einen Ring aus `<chimney>_wall` oder Stufen, sodass die Flamme nur von oben zu sehen ist. Der Rauch steigt etwa 10 Blöcke. Mit `hay_block` darunter wird daraus ein Signalfeuer mit etwa 24 Blöcken, das passt nur zu large und huge [10]. Eine Falltür über dem Feuer schluckt den Rauch ganz, ein Block direkt darüber lässt ihn teilweise durch [10]. Das schmelzende Licht 15 am Kamin darf bleiben, denn auch real schmilzt Schnee am Kamin [43]. Wer Firstschnee bis an den Kamin will, nimmt `soul_campfire`: Licht 10, gleicher Rauch, aber blaue Flamme, die verborgen sein muss. Details zum Kamin klärt das Dach- und Kaminthema. W hoch, A niedrig.

**U3 Iglu-Regel.**
Bauten aus Schnee und Eis werden nur mit `redstone_torch` beleuchtet (Licht 7). Das Vanilla-Iglu besteht aus 94 `snow_block`, 2 `ice`-Fenstern, 9 `white_carpet`, 3 `light_gray_carpet` und **einer** `redstone_torch` [26]. PCGamesN rät dasselbe [48]. `redstone_torch` und `redstone_wall_torch` sind nicht in der Registry. W mittel, A niedrig.

---

## Schnee: Mechanik und genauere Regeln

- **Schwellen (Korrektur zur Altnotiz und zum Validator).** Schnee schmilzt bei Blocklicht ≥ 12 an seiner Position. In Java schmelzen dann alle Schichten auf einmal [1]. Eis schmilzt, wenn das Licht **direkt neben ihm** auf irgendeiner Seite über 11 liegt [2]. Bei einer Quelle mit Licht L und dem Taxi-Abstand d gilt also:

| Licht L der Quelle | Beispiele | Schnee schmilzt bis d | Eis schmilzt bis d |
|---|---|---|---|
| 15 | lantern, glowstone, sea_lantern, froglights, shroomlight, campfire, copper_bulb | 3 | **4** |
| 14 | end_rod, torch, cave_vines mit Beeren [4][15] | 2 | 3 |
| 12 | candle ×4, exposed_copper_bulb [11][18] | 0 | 1 |
| ≤ 11 | light[level=11], soul_lantern 10, soul_campfire 10, candle ×3 = 9, weathered bulb 8, redstone_torch 7, glow_lichen 7, candle_cake 3 [12][16][17][18][19] | 0 | 0 |

  Das Lantern-Wiki nennt „snow within 2, ice within 3“ [3], das ist zur Snow- und Ice-Seite um eins verschoben. Für den Generator gilt die strengere Zahl.
- **Natürlicher Schnee hat nur eine Schicht.** Schneefall erzeugt in Java standardmäßig eine Schicht. Mehr gibt es nur mit der Spielregel `max_snow_accumulation_height` [1]. Dickere Schichten aus dem Schematic bleiben trotzdem liegen, solange kein Licht sie schmilzt. Ein Spieler wird sie also nicht „wegwachsen“ sehen.
- **Unter dem Dach liegt kein Schnee.** Das gilt für den Boden unter Überständen, Vordächern, Baumkronen und Marktdächern [24]. Das ist realistischer als unsere heutige Vollbedeckung bis an die Wand.
- **Treppen und Stufen.** Siehe die Tabelle bei S4. Eingangsstufen und die Treppenschürze bleiben schneefrei, das ist realistisch, weil geräumt.

## Eiszapfen: Bewertung

| Variante | Blöcke | Optik | Schneesicher | Halt | Urteil |
|---|---|---|---|---|---|
| E1 Glasposten | `light_blue_stained_glass_pane`, `white_stained_glass_pane` | dünn, eisblau, ohne Verjüngung | ja | keiner nötig [5] | beste Winterlösung |
| E2 Eiszapfen-Licht | `end_rod[facing=down]` | weiß, leuchtet, funkelt [4] | nein (Radius 2) | keiner nötig [4] | beste Weihnachtslösung |
| E3 Eis + Glas | `packed_ice` und Scheibe | dick und klobig | ja | keiner | nur huge |
| E4 Tropfstein | `pointed_dripstone` | braun, tropft [6] | ja | volle Unterseite [6] | nicht empfohlen |
| E5 `icicle` (26.4) | – | echt | schmilzt ab Licht 5 [7] | volle Unterseite [7] | nicht in 1.21.11 |

Ein Kommentar im Mojang-Feedback nennt End-Stäbe als Eiszapfen in einer Eishöhle (Altnotiz). Ein Resource Pack macht sogar aus waterlogged Dripstone 3D-Eiszapfen [50]. Das zeigt, dass Vanilla hier keine gute Lösung hat. Die neuen Eiszapfen fallen herunter, sobald Lichtquellen in der Nähe stehen [9]. `pale_hanging_moss` hängt nur unter Laub und Holz der Blasseiche und ist kein Ersatz [23]. Empfehlung: Die Regel „keine Eiszapfen“ bleibt Standard. Als Option „Eiszapfen“ gibt es nur E1 oder E2, nur an Traufen und nie am Ortgang.

## Girlanden, Kränze und Lichter: Dichte und Platzierung

| Baustein | Wo | Abstand und Dichte | Nicht |
|---|---|---|---|
| GA1 Traufgirlande | Traufzellen der Frontseite (Detail 2) bzw. aller Läufe ≥ 5 (Detail 3) | Anker alle 5–7, Licht alle 4–6 | an Läufen < 3, vor Fenstern |
| GA2 Bogen | nur zwischen Ankern | P = 6 | über Fensterköpfen in y−1 |
| GA3 Fenstergirlande | Obergeschoss-Fenster der Frontseite | ≤ 50 % der Fenster, symmetrisch | zusammen mit Läden auf derselben Zelle |
| K1 Türkranz | Wand neben oder über dem Haupteingang | 1 je Eingang | vor der Tür (Clearance) |
| K2 Giebelkranz | Giebelfeld der Frontseite | 1 je Haus ab medium | zusammen mit Stern auf derselben Fassade |
| K3 Stern | Vordach am Eingang | 1 je Haus | in Kopfhöhe |
| L1 Kerzenbank | Simse | 40 % (Detail 2), 70 % (Detail 3), paarweise symmetrisch | Zufallsfarben |
| L2 Firstkerzen | Vollblock-First | jede 2. Zelle, Detail 3 | Treppenfirst |
| L6 Laternen | Traufe | alle 6, Ecken | im Lauf mit GA1-Licht |

Laternen und Kerzen nie auf oder an Laub (Altnotiz). Lampen, die Strom brauchen (`redstone_lamp`), verwenden wir nicht. Kupferleuchten müssen gewachst sein, damit sie nicht oxidieren (Altnotiz).

## Rauch, Fensterlicht und Umgebung

Rauch: siehe U2. Fensterlicht: siehe L7. Die Umgebung (U1, S1–S7, F5) folgt einem Leitsatz von Gemini Tay [27]: Für jedes Element fragen, wie es bei Kälte aussieht, also gefrorener Brunnen und keine Blumen. Daraus werden konkrete Tauschregeln:

| Sommer-Element | Winter-Ersatz |
|---|---|
| Blumen (`poppy`, `dandelion` …) | nichts, oder `fern`, `potted_spruce_sapling`, `sweet_berry_bush[age=3]` als „Stechpalme“ (nicht in Registry, braucht Erde [22]) |
| Wasser und Brunnen | `packed_ice`, `blue_ice` |
| Hecke `oak_leaves` | `spruce_leaves`, farbfest |
| Gras-Rand | Schneewall (S2) |
| Blumenkasten am Fenster | `potted_spruce_sapling`, Kerze |

Rote Topfblumen (`potted_poppy`, `potted_red_tulip`) an der Tür dürfen bleiben und stehen dann für den „Weihnachtsstern“ als Pflanze (Einschätzung). Blumentöpfe halten in Java auf jedem Block, auch auf Laub und über Luft [20].

## Dosierung: Wann es kitschig wird und wann gemütlich

Belegte Leitsätze:
- „none of it is overbearingly Christmassy … similar decorations on all the buildings, and just having small variations … without taking away from, or over-crowding, the original build“ (Gemini Tay [27]).
- „less is more“ und „give purpose to every block“ (Meafcraft [28]).
- Ein paar gut gesetzte Lichtquellen schlagen Dutzende Laternen (minecraft.how, Altnotiz).
- Viele Winter-Showcases stützen ihre Wirkung auf Shader (BSL) und Packs wie Better Leaves oder Nox' Ropes [35][36][37]. Vanilla-Ergebnisse müssen die Wirkung über Komposition und Dosierung erreichen, nicht über Glanz.
- Gemütlichkeit entsteht vor allem über Kerzen und weiches Licht [46], nicht über Menge. Mojangs eigene Winterbauten arbeiten mit wenigen Materialien wie Eis, blauem Glas, Holz und Kamin [29]. End-Stäbe gelten als „makeshift twinkling Christmas lights“ [47].

Regeln für den Generator (Einschätzung, aus den Leitsätzen abgeleitet):
1. **1-1-n je Fassade.** Ein Hauptmotiv (K1, K2 oder K3), eine Linie (GA1 oder L2) und wenige Kleinteile (L1).
2. **Höchstens 2 Akzentfarben plus Gold.** Rot nimmt höchstens etwa 5 % der sichtbaren Fassadenfläche ein.
3. **Warmweiß ist das Grundlicht.** Farbiges Licht und farbige Kerzen gibt es nur am Baum und am Markt.
4. **Lichtpunkte an der Traufe höchstens jedes 4. Feld.** Wer mehr setzt, landet bei Kirmes.
5. **Wiederholung mit Variation.** Alle Häuser eines Seeds bekommen dieselben Motive, gespiegelt, in Größe verschoben und mit wechselnder Kerzenzahl.
6. **Maßstab.** Kein Schmuckteil ist größer als ein Fenster, außer am Baum ab H ≥ 18 und auf dem Platz.
7. **Freiraum.** Mindestens ein Drittel der Fenster und mindestens eine Fassade bleiben nur „winterlich“.

Dosierung nach Detailgrad:

| Baustein | Detail 1 | Detail 2 | Detail 3 |
|---|---|---|---|
| Kranz | – | K1 am Haupteingang | K1 je Eingang, K2 ab medium |
| Girlande | – | GA1 Frontseite | GA1 alle Läufe, GA2 |
| Lichter | Laterne am Eingang | L1 40 %, L6 alle 6 | L1 70 %, L2, K3 |
| Baum und Geschenke | – | Baum H 9–11, 2–4 P1 | Baum H 11–15, 5–8, plus 2 am Eingang |
| Figuren | – | – | F1 oder F2 |
| Eiszapfen (Option) | – | E1/E2 an der Südtraufe | alle Traufen |

## Winter gegenüber Weihnachten

| | Winter | Weihnachten |
|---|---|---|
| Schnee, Eis, Teich | ja (Kern) | ja (dringend empfohlen) |
| Grün (Girlande, Kranz) | nur Fenster-Tannengrün ohne Rot, `pale_oak_leaves` | GA1, GA2, K1, K2 |
| Farben | weiß, grau, blau, Holz | plus Rot und Gold (max. 2 + Gold) |
| Licht | weiße Kerzen, Laterne, `soul_lantern`, L7 | plus Firstkerzen, Stern, Baumlicht |
| Figuren | Schneemann, Schlitten, Holzstapel | plus Zuckerstange, Pyramide, Adventskranz |
| Geschenke und Baum | – (nur verschneite Fichte) | ja |
| Eiszapfen-Option | E1 | E2 |

Bei Schnee und Weihnachten zusammen gilt die schneesichere Lichtpalette. Sie verlangt kein Verzicht auf Licht, sondern andere Quellen.

---

## Fehler, die Profis vermeiden

1. Licht der Stufe 14–15 neben Schnee oder Eis setzen. Im Spiel schmilzt es per Random Tick, Eis wird zu Wasser und kann fließen [2].
2. Überall gleich dicke Schicht oder eine weiße `snow_block`-Platte statt Variation.
3. Schnee unter Überständen, unter Bäumen, auf geräumten Wegen und Eingangsstufen.
4. Blühende Blumen im Schnee [27].
5. Vollblock-Kugeln an kleinen Bäumen, Konfetti in sechs Farben [32].
6. Stern als gelber Würfel [27].
7. Geschenke verstreut, in Spielzeugfarben, als Turm.
8. Sichtbare Leuchtblöcke im Laub, rote Würfel als Schleife in jedem 5. Feld.
9. Kerzen oder Laternen auf Laub, Laternen unter horizontaler Kette. Beides fällt beim ersten Nachbar-Update (Altnotiz).
10. Kürbis über zwei Schneeblöcken. Daraus wird ein Golem (Altnotiz).
11. Eiszapfen an Ortgängen und Wänden, alle gleich lang, dicht an dicht. Glasposten nebeneinander verbinden sich zur Platte.
12. Eine offene Flamme oben auf dem Schornstein.
13. Deko vor Türen und Fenstern oder als Stolperfalle im Weg.
14. Entities als Deko (Item Frames, Armor Stands, End-Kristall). Sie gehen in unserem Export nicht.
15. Jedes Haus anders schmücken (kein Thema) oder alle exakt gleich (keine Variation) [27].
16. Showcases mit Shadern und Resource Packs als Maßstab für Vanilla nehmen [35][36].

---

## Empfehlungen für den Generator

Priorisiert nach Wirkung pro Aufwand.

1. **Thema-Landschaft ohne Blumen.** Modul `landscape.ts:146–158`, Regel. Bei `theme!=='none'` entfallen `FLOWERS`, an ihre Stelle treten `fern` und `potted_spruce_sapling` (35 % wie bisher). Die Hecke wird bei Thema `spruce_leaves`. *Akzeptanz:* 0 Blumen-IDs in allen Winter- und Weihnachtsbauwerken (Test über alle Stile und Größen).
2. **Schnee mit Variation (S1–S3, S6).** Module `landscape.ts:57–59`, `festive.ts:183–197`, neue Daten `SNOW_PROFILE`. Grasboden mit Schichten statt `snow_block`-Platte. Die Schichthöhe kommt aus Rauschen mit Zielverteilung 70/12/10/6/2. Wegzellen bleiben frei, der Rand bekommt einen Wall 3-2-1. Zellen unter Dachprojektionen erhalten 0, die Tropfkante 3–4 bei steilen Profilen, die Luvseite [4,3,2,1]. *Akzeptanz:* Bei `snow=true` sind 25–35 % der Bodenschichten ≥ 2, keine Schicht liegt unter einem Überstand, 0 Validator-Reparaturen.
3. **Geschenke neu (P1–P3).** Module `festive.ts:41`, `:163–174` und `generateBuilding.ts:170–174`. Daten `PRESENT_PALETTES` je Stil, Regel „unter dem Baum oder am Eingang“. Shulker-Boxen in die Registry (17 IDs, `facing`). *Akzeptanz:* Jedes Geschenk liegt in r ≤ R_unten−1 eines Baums oder ≤ 2 Felder seitlich einer Tür außerhalb der Clearance. ≤ 3 Papierfarben je Bauwerk, keine `lime`/`light_blue`-Papiere, kein Stapel > 3.
4. **Baum maßstäblich (B1–B4).** Modul `christmasTree.ts`. Daten `TREE_SCALE`, Regel `trunkBelow ≥ 2`. Bei H < 12 keine Vollblock-Kugeln, dafür B2-Laternen. Stern B4 bzw. B3 statt `gold_block`. Der Gartenbaum wächst mit (`generateBuilding.ts:145`). *Akzeptanz:* H = 12 ergibt 0 `*_wool`/`*_concrete` in der Hülle. Kein `gold_block` als Einzelblock an der Spitze. Unter der untersten Etage liegen ≥ 2 freie Zellen.
5. **Girlande mit Ankern, verstecktem Licht und echtem Bogen (GA1, GA2).** Modul `festive.ts:96–111`, Regel. *Akzeptanz:* Höchstens 1 Leuchtblock je 4 Girlandenfelder. Leuchtblöcke liegen nicht in der äußeren Traufzelle, sondern in d−1, oder werden durch `end_rod` ersetzt. `red_wool` nur an Ankern. In Bogenzellen liegt kein Laub in y und y−1 zugleich.
6. **Echter Kranz (K1, K2).** Modul `festive.ts:135–151`, Daten als Fassadenvorlage im Format der W-/T-Vorlagen (Rollen und d). *Akzeptanz:* Ring mit hohler Mitte, Platzierung nur auf fensterfreier Wand, nie in der Tür-Clearance. Optional `red_wall_banner` (Registry: 16 `*_banner` und 16 `*_wall_banner`).
7. **Eis-Schmelzregel korrigieren.** Modul `validator.ts:157–181`, Regel. Eis prüft das Licht der 6 Nachbarn (> 11), der Suchradius steigt auf 4. *Akzeptanz:* Ein Unit-Test mit `ice` in Taxi-Abstand 4 zu `lantern` ergibt `packed_ice`. Für Schnee ändert sich nichts.
8. **Kupferleuchten-Licht nach Oxidation.** Modul `families.ts:229`, Daten: 15/12/8/4. *Akzeptanz:* `emittedLight('…waxed_weathered_copper_bulb[lit=true…]') === 8`.
9. **Kaminfeuer verbergen (U2).** Module `house/components.ts:144`, `:162`, Regel: Krone um die Feuerebene, optional Heuballen bei large und huge, `soul_campfire` bei Schneedach. *Akzeptanz:* Von keiner horizontalen Blickrichtung ist die Flamme direkt sichtbar, alle vier Nachbarn der Feuerzelle sind belegt. Rauch frei (Zelle darüber Luft).
10. **Wintervorlagen aktivieren.** Module `templates/catalog.ts`, `style/styles.ts`, Daten `THEME_TEMPLATE_BOOST`: Bei Thema Winter und Weihnachten wird W18 bzw. T10 je Stil bevorzugt, wenn sie passen. W18 wird nach GA3 und L1 überarbeitet (Kerzen symmetrisch, Laub mit herabhängenden Enden). *Akzeptanz:* ≥ 1 W18 je Weihnachtshaus mit passendem Fensterfeld. 0 Reparaturen.
11. **Schneesichere Lichtpalette.** Modul `festive.ts`, Daten `SNOW_SAFE_LIGHTS`. Bei `snow=true` ersetzen Kerzen, `soul_lantern` und GA1-Variante (b) mit Abstand die Leuchtblöcke. Registry ergänzen: `light`, `redstone_torch`, `redstone_wall_torch`, `glow_lichen`. *Akzeptanz:* Bei `snow=true` liegt der Anteil schneebedeckter zulässiger Dach- und Simsflächen ≥ 90 % des Werts ohne Deko.
12. **Schneedach-Modus (S5).** Modul `roof/roofEngine.ts`, Parameter `snowSkin` (aus bei `steep` und A-Frame). *Akzeptanz:* Traufreihe und Ortgang bleiben aus Dachmaterial, die Fläche ist `snow_block` mit L1/L2. Lint „Dach ohne Lücken“ besteht, 0 Reparaturen.
13. **Flachdach- und Ortgang-Linien (GA4, L2).** Module `roofEngine.ts:424–426` sowie neue Ziele `parapetCells` und `ridgeCells` in `FestiveTargets`. *Akzeptanz:* Ein modernes Weihnachtshaus hat ≥ 1 Lichtlinie auf der Attika.
14. **Option „Eiszapfen“ (E1/E2), Entscheidung des Creative Directors.** Modul `festive.ts`, Regel: nur Traufläufe, Abstand ≥ 2, kein horizontaler Vollblock-Nachbar, Südseite 40 %, sonst 15 %. *Akzeptanz:* Keine zwei Zapfen nebeneinander. Alle Scheiben haben `north=east=south=west=false`.
15. **Figuren und Platzmotive (F1, F2, F4, F5, K4, U1).** Neues Modul `winterProps.ts`, Daten als Vorlagen. *Akzeptanz:* Schneemann ohne `carved_pumpkin`. Golem-Prüfung ohne Treffer. Je Grundstück ≤ 1 Figur bei Detail 3.
16. **Dosierung als Daten.** Neu `FESTIVE_DOSAGE` mit der Tabelle „Dosierung nach Detailgrad“, dazu Regel 1-1-n je Fassade. *Akzeptanz:* Je Fassade höchstens ein Hauptmotiv. Licht an der Traufe ≤ 1 Punkt je 4 Felder.
17. **Entscheidungsvorlage Schnee.** Datei `resolveInput.ts:123`. Vorschlag: bei Thema Winter Schnee standardmäßig an, bei Weihnachten ein Hinweis „mit Schnee wirkt es stärker“. Gemini Tay beginnt den Winterumbau mit der Schneeschicht [27]. *Akzeptanz:* Der Creative Director entscheidet. Bis dahin gilt Empfehlung 1 als Mindestmaß.

---

## Quellen

1. https://minecraft.wiki/w/Snow – Halt auf voller Oberseite und Kopfüber-Treppen, Schmelzen ab Blocklicht 12, Schneefall nur 1 Schicht, `max_snow_accumulation_height`.
2. https://minecraft.wiki/w/Ice – Eis schmilzt bei Licht > 11 auf einer Nachbarseite und wird über festem Block zu Wasser.
3. https://minecraft.wiki/w/Lantern – Halt an „most solid blocks“, Licht 15, laut Seite Schmelzradius 2 (Schnee) bzw. 3 (Eis).
4. https://minecraft.wiki/w/End_Rod – Licht 14, an jeder Fläche und an End-Stäben setzbar, fällt nicht ab, weiße Partikel.
5. https://minecraft.wiki/w/Glass_Pane – Scheibe ohne Nachbarn ist ein Pfosten von 2×2 px, braucht keinen Halt, Verbindungsregeln.
6. https://minecraft.wiki/w/Pointed_Dripstone – Stalaktit fällt ohne Stütze, tropft Wasserpartikel, braune Farbe.
7. https://minecraft.wiki/w/Icicle – `icicle` erst ab 26.4-Snapshot, wächst unter `packed_ice`, schmilzt ab Licht 5.
8. https://www.minecraft.net/en-us/article/drop-4-2026-testing – Drop 4/2026: Eishöhlen, Eiszapfen, Eiskristalle, Bauset aus `packed_ice`.
9. https://www.sportskeeda.com/minecraft/minecraft-ice-caves-biome-frozen-zombie-ice-crystals-icicles-ice-balls – Eiszapfen fallen bei Lichtquellen herunter.
10. https://minecraft.wiki/w/Campfire – Rauch etwa 10 bzw. 24 Blöcke (Heuballen), Falltür sperrt den Rauch, Licht 15.
11. https://minecraft.wiki/w/Candle – Licht 3/6/9/12, 16 Farben, Kerzenkuchen.
12. https://minecraft.wiki/w/Cake – `bites`, `*_candle_cake[lit]`, Licht 3.
13. https://minecraft.wiki/w/Banner – Steh- und Wandbanner, Zustände, schlichte Banner ohne Block-Entity-Daten.
14. https://minecraft.wiki/w/Shulker_Box – 17 Varianten, Container ohne Pflichtinhalt.
15. https://minecraft.wiki/w/Cave_Vines – Halt an voller Unterseite, `age` 0–25, Beeren mit Licht 14.
16. https://minecraft.wiki/w/Glow_Lichen – Licht 7, an jeder Seite fester Blöcke, breitet sich nicht von selbst aus.
17. https://minecraft.wiki/w/Redstone_Torch – Licht 7, Boden- und Wandvariante.
18. https://minecraft.wiki/w/Copper_Bulb – Licht 15/12/8/4 nach Oxidation, bleibt ohne Strom an.
19. https://minecraft.wiki/w/Light_Block – `light[level]`, unsichtbar, ohne Hitbox.
20. https://minecraft.wiki/w/Flower_Pot – Java: auf jedem Block und über Luft setzbar.
21. https://minecraft.wiki/w/Lightning_Rod – 6 Richtungen, oxidiert, gewachste Varianten.
22. https://minecraft.wiki/w/Sweet_Berry_Bush – `age` 0–3, rote Beeren, nur auf Erdarten.
23. https://minecraft.wiki/w/Pale_Hanging_Moss – hängt nur unter Blasseichen-Laub und -Holz.
24. https://minecraft.wiki/w/Snowy_Taiga – Boden unter dem Laub bleibt schneefrei.
25. https://github.com/misode/mcmeta/tree/1.21.11-data/data/minecraft/structure/village/snowy/houses – 23 Vanilla-Schneehäuser, selbst ausgewertet: Schichtverteilung, Stufendächer mit Schnee.
26. https://raw.githubusercontent.com/misode/mcmeta/1.21.11-data/data/minecraft/structure/igloo/top.nbt – Iglu, selbst ausgewertet: nur eine `redstone_torch` als Licht.
27. https://www.minecraft.net/en-us/article/deck-halls – Gemini Tay: erst Schnee, keine Blumen, gleiche Deko mit Variation, großer Baum, kein gelbes Quadrat als Stern.
28. https://www.minecraft.net/en-us/article/winter-wonder – Meafcraft: „less is more“, jedem Block einen Zweck.
29. https://www.minecraft.net/en-us/article/team-build-challenge--winter-getaway – Mojang-Team: Winterbauten aus Eis, blauem Glas, Holz und Kamin.
30. https://www.minecraft.net/en-us/article/block-week-snow – Schneeblöcke schmelzen nicht neben Licht.
31. https://wiki.sportskeeda.com/minecraft/how-to-make-snowman-minecraft – Schneemann ohne Golem aus Wolle oder Beton, Hebel als Arme.
32. https://www.sportskeeda.com/minecraft/5-best-minecraft-christmas-tree-builds – Kwell: kleine Kugeln, hängende Laternen. TheLob: Amethyst-Spitze.
33. https://www.sportskeeda.com/minecraft/5-best-minecraft-build-ideas-christmas-2022 – Bobicraft: Buntglaskugeln mit Seelaterne, Lebkuchenhaus, Schneekugel.
34. https://digminecraft.com/getting_started/how_to_build_traditional_snow_man.php – zwei Schneeblöcke plus Kürbis ergeben den Golem.
35. https://www.youtube.com/watch?v=f-93J8AOFHE – Beschreibung „Large Winter Cabin“: BSL, Better Leaves, Nox-Packs.
36. https://www.youtube.com/watch?v=UmjJl0Dzgmw – Beschreibung „Winter Cabin Tutorial“: BSL, Better Leaves.
37. https://www.youtube.com/watch?v=nUSFIGzkqGU – Beschreibung Winterhütte: „A sloped roof helps keep snow off“, Kamin mit Lagerfeuer.
38. https://de.wikipedia.org/wiki/Erzgebirgischer_Schwibbogen – Lichterbogen in Fenster und auf Fensterbank, seit 1740.
39. https://de.wikipedia.org/wiki/Adventskranz – vier Kerzen, Erzgebirge rot, katholisch drei violett und eine rosa.
40. https://de.wikipedia.org/wiki/Herrnhuter_Stern – 25 Zacken, hängt in Fenstern und Eingängen.
41. https://de.wikipedia.org/wiki/Weihnachtsmarkt – Holzbuden, Baum, Pyramide, vor Rathaus oder Kirche.
42. https://en.wikipedia.org/wiki/Icicle – Eiszapfen entstehen bei Sonne oder Gebäudewärme an Kanten.
43. https://en.wikipedia.org/wiki/Ice_dam_(roof) – Eis an der kalten Traufe, über beheizten Räumen und am Kamin schmilzt der Schnee.
44. https://en.wikipedia.org/wiki/Snowdrift – Kamm auf der Luvseite, flacher auf der Leeseite.
45. https://en.wikipedia.org/wiki/Christmas_lights – Umrandung von Traufen und Dachlinien, „icicle lights“.
46. https://en.wikipedia.org/wiki/Hygge – Kerzen und Licht als Mittel der Gemütlichkeit.
47. https://www.g-portal.com/en/blog/minecraft-christmas-village-en – Weihnachtsdorf: End-Stäbe als Lichterketten, steile Dächer, Schneeschichten.
48. https://www.pcgamesn.com/minecraft/christmas – Iglu nur mit Redstone-Fackeln beleuchten.
49. `research_notes/Minecraft Bautechniken für Generator/winter_weihnachten_landschaft.md` – Altnotiz mit der Grundmechanik.
50. https://modrinth.com/project/nEb9DtzX und https://www.planetminecraft.com/texture-pack/icicles-5418928/ – Resource Packs mit 3D-Eiszapfen (nur Such-Snippet).
