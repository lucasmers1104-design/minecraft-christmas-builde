# Beleuchtung: Laternen, Lampenpfähle, versteckte Lichtquellen und warm leuchtende Fenster

Stand 2026-10-23. Thema: wie der Generator Licht so setzt, dass ein Bauwerk nachts warm, geordnet und mobsicher wirkt wie von Profis gebaut.

**Abgrenzung:** Schneeschmelze, Girlanden- und Baumlichter stehen in `winter_weihnachten_landschaft.md`, die Türlaternen D01–D03 und T01–T09 in `fenster_tueren_details.md`. Beides wird hier nur korrigiert oder ergänzt.

**Methode:**
- Blockmechanik aus minecraft.wiki (englisch und deutsch).
- Eigene Auswertung der Vanilla-NBT-Dateien aus 1.21.11: alle Lampenpfähle der Dorftypen und 57 Häuser aus Schnee- und Taigadörfern.
- Eigene Messung der Lichtabdeckung an Ausgaben unseres Generators (Skript außerhalb des Repos, nur lesend).
- Builder-Guides und reale Vorbilder.

Reddit, Planet Minecraft, Sportskeeda und WikiHow waren per Fetch gesperrt. Das Websuche-Kontingent war früh erschöpft, deshalb wurden viele Quellen direkt per URL geholt. Was keine Quelle hat, ist als **Einschätzung** markiert.

---

## Kurzfassung

Nach Wirkung sortiert:

1. **Innenräume sind komplett dunkel.** Im Haus steht kein einziges Licht. Nachts sind die Fenster schwarz, und ohne Thema haben 20–54 % der spawnfähigen Innenzellen Blocklicht 0. Vanilla-Häuser haben fast immer 1–2 Innenlichter. **Regel:** je Raum eine Pendelleuchte, je Fensterachse eine Quelle höchstens 5 Blöcke (Taxicab) hinter dem Glas.
2. **Außen fehlt der Spawnschutz.** Ohne Thema liegen 43–58 % der spawnfähigen Außenzellen bei Blocklicht 0. Monster spawnen seit 1.18 genau dort, und GDMC fragt ausdrücklich „well lit?“. **Regel:** nach dem Bauen eine Lichtkarte berechnen (BFS) und dunkle Zellen gezielt nachbeleuchten.
3. **Der Lampenpfahl ist eine Etage zu niedrig und immer gleich.**
   - Vanilla `snowy_lamp_post_01` hat **4** Zäune, die Laterne hängt in der 3. Zelle über dem Weg.
   - Unserer hat 3 Zäune, die Laterne hängt auf Augenhöhe (`landscape.ts:134–139`).
   - Er ist in jedem Stil aus Holz.
   - **Lösung:** Katalog mit 18 Pfählen als Vorlagen.
4. **Der Rhythmus fehlt.**
   - Heute: ein Pfahlpaar 4 Blöcke vor der Tür, danach nichts; bei „many“ 6 Pfähle auf 9 Blöcken.
   - **Regel:** alle 8–12 Blöcke, wechselseitig ab 3 Blöcken Wegbreite.
   - Vorbild: realer Abstand ≈ 3 × Lichtpunkthöhe.
5. **Warm vor kalt.**
   - Fantasy nimmt standardmäßig `soul_lantern` (`styles.ts:111`), deshalb blaue Laternen am Weihnachtshaus und ein blauer Laternenring am Turm.
   - In Java ist Blocklicht farblos und wirkt in mittleren Stufen orange; die Stimmung macht die sichtbare Quelle.
   - **Regel:** im Winter- und Weihnachtsthema `lantern` als Hauptleuchte, kalte Quellen höchstens 20 %.
6. **Laternen-Spam an Traufen.** `festive.ts:118` hängt an beide Enden **jedes** Traufenlaufs eine Laterne. Am Rundturm entsteht ein Kranz, an Walm-Ecken hängen zwei Laternen dicht beieinander. **Regel:** Mindestabstand 4 über alle Läufe, am Rundturm höchstens 4 Laternen auf den Achsen.
7. **Kerzen in fester Ordnung statt Zufall.** Farbe und Anzahl kommen heute je Sims zufällig (`festive.ts:158–159`). Vorbilder wie der Schwibbogen oder der schwedische Adventsleuchter wiederholen dasselbe Licht in jedem Fenster. **Regel:** Farbe und Anzahl je Fassade fest, symmetrisch.
8. **Verstecktes Licht: Was durchlässt und was sperrt.**
   - Teppich, Falltür, Zaun, Glas und Laub lassen Blocklicht ungeschwächt durch.
   - Stufen, Treppen, Schneeschichten und `dirt_path` sperren an ihren vollen Flächen, `tinted_glass` sperrt ganz.
   - „Licht unter Stufen“ geht nach oben also **nicht**; „unter Teppich“ und „unter Falltür“ gehen, und dort spawnt auch nichts.
9. **Halterungen: drei Korrekturen.** Keine hängende Laterne hält unter `*_slab[type=top]`, unter `*_stairs[half=top]` und unter waagerechter `iron_chain`. Es halten: Vollblock, Zaun- und Mauerpfosten, `iron_chain[axis=y]`, `iron_bars`, `glass_pane`, geschlossenes Zauntor, Falltür mit passendem `half`, untere Stufe (hängend), obere Stufe (stehend).
10. **Kettenlänge `c = max(0, r − 3)`.** r ist die Zahl der Luftzellen zwischen Boden und Decke. Darunter bleiben ≥ 2 Zellen frei, und die Laterne hängt auf Höhe der oberen Fensterreihe, also von außen sichtbar.
11. **Der Block `light` ist brauchbar.** `light[level=0..15]` ist seit 1.17 ein normaler Blockzustand, unsichtbar und ersetzbar. Er taugt für Spawnschutz (außen 1–7, innen 7–11), aber nicht für Stimmung. Im Überleben gibt es ihn nur per Befehl.
12. **Redstone-Lampe nur mit `redstone_block` daneben.** Dieser Block öffnet aber benachbarte Türen und Läden und schaltet Kupferbirnen um. Besser ist `waxed_copper_bulb[lit=true,powered=false]`; sie leuchtet je nach Oxidation mit 15/12/8/4. Unsere Registry gibt allen Stufen 15 (`families.ts:229`).
13. **Registry-Lücken:** `light`, Fackeln (normal, Seele, Kupfer, je mit Wandform), `copper_lantern` (8 Varianten), `copper_chain`, `redstone_lamp`, `redstone_block`, `lever`, `anvil`, `hopper`, `grindstone`, `bell`.
14. **Die Vorschau hat keinen Nachtmodus** (`buildVoxelMesh.ts:113, 162`). Beleuchtung lässt sich so weder im Test noch vom Creative Director beurteilen.

---

## Schwächen des aktuellen Generators

### Kein Innenlicht

`buildOpenings`, `components.ts` und `buildHouse` setzen innen keine Lichtquelle. Licht kommt nur zufällig durch die Scheiben, von Außenkerzen und Girlanden-Leuchtblöcken.

So wurde gemessen:
- Seed 7, Größe medium.
- Licht-BFS, Vollblöcke opak. Stufen und Treppen gelten vereinfacht als durchlässig. Das überschätzt das Licht, die Dunkelanteile sind also **Untergrenzen**.
- „Innen“ = freie Zellen, die von außen nicht erreichbar sind.

| Bauwerk | Lichtquellen | außen dunkel | innen dunkel |
|---|---|---|---|
| Haus medieval, kein Thema | 3 lantern, 1 campfire | 53 % | 30 % |
| Haus nordic, kein Thema | 3 lantern, 1 campfire | 57 % | 31 % |
| Haus rustic, kein Thema | 3 lantern, 1 campfire | 52 % | 20 % |
| Haus japanese, kein Thema | 3 lantern | 58 % | 20 % |
| Haus mediterranean, kein Thema | 3 lantern | 43 % | 54 % |
| Haus modern, Weihnachten | 4 lantern, 4 froglight, 5 end_rod (Baumstern) | 40 % | 20 % |
| Haus medieval, Weihnachten | 12 lantern, 42 Kerzen, 7 froglight, 5 end_rod, 1 campfire | 9 % | 0 % |
| Turm fantasy, Weihnachten | 4 soul_lantern, 7 Kerzen, 3 froglight | 42 % | 44 % |
| Bahnhof medieval, Weihnachten | 6 lantern, 13 froglight | 9 % | 20 % |

### Weitere Schwächen

- **Pfahl** (`landscape.ts:134–139`):
  - Zäune bei y = 1..3, Arm bei y = 3, Laterne bei y = 2, also auf Augenhöhe.
  - Material immer `${fenceWood}_fence`. Im Screenshot `haus-modern-weihnachten.jpg` stehen deshalb Holzgalgen vor einem Betonwürfel.
- **Pfahlabstände** (`landscape.ts:127`):
  - `few`/`normal`: nur eine Position bei `min(4, reach−1)`. In `haus-mittelalter-weihnachten.jpg` stehen zwei spiegelgleiche Galgen hinter der Veranda, der Rest des Wegs ist dunkel.
  - `many`: Pfähle bei 3, 6 und 9 Blöcken, auf beiden Seiten.
- **Türlaternen** (`openings.ts:116–134`): immer 1 Zaun + stehende Laterne. Das ist Vanilla-gerecht (`snowy_small_house_7`), aber in jedem Stil gleich.
- **Traufenlaternen** (`festive.ts:113–131`):
  - Die Enden {0, run.length−1} **jedes** Laufs ab 2 Zellen bekommen eine Laterne. Am Rundturm wird daraus ein Kranz (`turm-fantasy-weihnachten.jpg`), an Walm-Ecken ein Doppel.
  - Die Kette ist immer genau 1 Glied lang.
  - Kopffreiheit über dem Gelände wird nicht geprüft. Unter tief heruntergezogenen Traufen (A-Frame, `haus-nordisch-winter-schnee.jpg`) kann die Laterne auf Kopfhöhe landen (Einschätzung aus dem Code).
- **Girlandenlicht** (`festive.ts:79, 106`): jede 3. Zelle ist ein voller Leuchtblock mit Licht 15. Grelle Würfel; näher beschrieben beim Thema Festschmuck.
- **Kerzen** (`festive.ts:153–160`): Farbe und Anzahl (1–3) je Sims zufällig, das bricht die Symmetrie. Im mittelalterlichen Weihnachtshaus sind 42 von 67 Lichtquellen Kerzen.
- **Kaltes Licht als Standard** (`styles.ts:111`, `resolveInput.ts:116`): Fantasy nimmt `soul_lantern` auch im Weihnachtsthema (`haus-fantasy-weihnachten.jpg`).
- **Registry:**
  - `families.ts:229` gibt allen `waxed_*copper_bulb` Licht 15. Dadurch rechnet `emittedLight` (`validator.ts:65–73`) angelaufene Birnen zu hell.
  - Die Lichtliste in `docs/COMPATIBILITY.md:60` hat 33 Einträge, aber keine Fackeln und kein `light`.
- **Lints** (`buildingLints.ts:169–174`): Es wird nur „Laterne am Eingang“ geprüft. Spawnlicht, Dichte und Kopffreiheit prüft niemand.
- **Vorschau** (`buildVoxelMesh.ts:113, 162`): Emissive Blöcke werden ohne Beleuchtung gerendert, alles andere gleich hell. Dunkle Ecken und schwarze Fenster sieht niemand.
- **Bahnhof und Markt:**
  - Bahnhof: Laternen nur unter dem Bahnsteigdach (alle 5 Blöcke, `station.ts:129`), Portal und Bahnsteigenden sind dunkel (`bahnhof-mittelalter.jpg`).
  - Markt: Licht nur unter den Markisen, die Gasse ist dunkel (`marktstand.jpg`).

---

## Techniken und Regeln

### T1 Lichtphysik als Generatorregel

- **Ausbreitung:** Licht nimmt je Block Taxicab-Abstand um 1 ab [1].
- **Spawnbedingung:** Feindliche Mobs spawnen in der Overworld bei internem Himmelslicht ≤ 7 **und** Blocklicht 0 [1][10]. Die deutsche Wiki: „spawnen nur noch in Gebieten, in denen das Lichtlevel gleich 0 ist“ [31].
- **Lichtdurchlass für den BFS:**

| Blöcke | Blocklicht | Quelle |
|---|---|---|
| Luft, Glas, `glass_pane`, `iron_bars`, Zaun, Mauer, Tür, **Falltür**, Zauntor, Teppich, Laterne, Kette, Kerze, Pflanzen | ungeschwächt durch | [3][12][23] |
| Laub, Wasser, Eis | Java: kein Zusatzeffekt, nur Himmelslicht gedämpft | [3][26][31] |
| Stufe (nicht doppelt), Treppe, `snow`, `dirt_path`, `farmland` | gerichtet: gesperrt, wo volle Flächen aneinanderstoßen | [3] |
| Vollblöcke, `tinted_glass`, `redstone_lamp` | gesperrt | [25][7] |

- **Lichtfarbe:**
  - Java-Blocklicht ist farblos. „Light due to blocks also tends toward orange in the middle ranges“ [1].
  - Farbiges Punktlicht (Vibrant Visuals) gibt es nur experimentell in Bedrock; für Java ist es nur geplant [29].
  - **Folgerung (Einschätzung):** Wände in Stufe 6–11 wirken wärmer als Flutlicht 15.

Wirkung hoch, Aufwand mittel. Gilt für alle Stile.

### T2 Halterungen: was eine Laterne oder Kerze trägt

Laternen und Kerzen brauchen eine Fläche, die die Mitte trägt (Vanilla `CENTER`, so prüft auch `validator.ts:81–90`).

| Träger | steht drauf | hängt drunter | Beleg |
|---|---|---|---|
| Vollblock | ja | ja | [4] |
| Zaun- oder Mauerpfosten | ja | ja | NBT: Laterne auf `spruce_fence` (`snowy_small_house_7`), unter Zaun (`snowy_lamp_post_01`) [33] |
| `iron_chain[axis=y]` | – | ja, nahtlos | [19] |
| `iron_chain[axis=x\|z]` | nein | **nein** | Form 7..9 px reicht nicht bis an den Zellrand (`shapes.ts:228–232`). Abgeleitet; klärt eine offene Frage der alten Notiz |
| `iron_bars`, `glass_pane` | ja | ja | „placed and hung on iron bars and glass panes“ [4] |
| Zauntor, geschlossen | ja | ja | [32] |
| Falltür zu, `half=top` / `half=bottom` | ja / nein | nein / ja | [13]; offene Falltüren tragen nicht |
| Stufe `type=bottom` / `type=top` | nein / ja | ja / **nein** | abgeleitet aus der Form. Korrigiert „oder top“ in `fenster_tueren_details.md`; `station.ts:135` macht es schon richtig |
| Treppe `half=bottom` / `half=top` | nein / ja | ja / **nein** | abgeleitet: Ober- bzw. Unterseite deckt die Mitte nicht |
| `end_rod`, `lightning_rod` senkrecht | ja | ja | abgeleitet aus der Stabform 6..10 px; im Spiel prüfen |
| Laub | nein | nein | leere Stützform (alte Notiz) |

Kerzen folgen denselben Regeln [13]. Fackeln halten auf Glas, Gittern und Scheiben, nicht auf Laub [17].

### T3 Katalog der Lampenpfähle (18 Designs)

**Konventionen:**
- y = 0 ist der Boden, y = 1 die Laufebene. „Ansicht Süd“ heißt: x zeigt nach Osten.
- Verbindungen und Treppenformen setzt der Zustandsauflöser.
- **Kopffreiheit:** Jede Laterne über der Laufebene sitzt bei y ≥ 3, darunter bleiben ≥ 2 Zellen frei.
- Rollen in Klammern (`frame`, `plinth`) bestimmen das Material aus der Palette.

**LP01–LP03 Vanilla-Schneegalgen** (exakt nach `snowy_lamp_post_01/02/03`):
```
Ansicht Süd, x=-1..1      F = spruce_fence (frame)
y4  F F F                 L = lantern[hanging=true]
y3  L F L
y2  . F .
y1  . F .
```
- Die NBT zeigt beim Jigsaw auf y0 `final_state=minecraft:spruce_fence`, der Pfahl hat also **4** Zäune. Das korrigiert „3 Zäune“ aus der alten Notiz.
- `_02` hat einen Arm (zum Weg), `_03` vier Arme (Kreuzung, Platz).
- Stile: nordic, rustic, medieval. Wirkung mittel, Aufwand niedrig [33].

**LP04 Hoher Galgen mit Kette** (Hauptweg, Bahnsteig auch als T-Form):
```
Ansicht Süd, x=0..2       F = dark_oak_fence | spruce_fence (frame)
y5  F F F                 K = iron_chain[axis=y]
y4  F . K                 L = lantern[hanging=true]
y3  F . L
y2  F . .
y1  F . .
```
Stile: medieval, rustic, nordic. Wirkung hoch, Aufwand niedrig [34].

**LP05 Steinfuß-Pfahl, von dick nach dünn:**
```
Ansicht Süd, x=-1..1      C = chiseled_stone_bricks (plinth)
y6  . F F                 b = stone_button[face=wall,facing=west|east]
y5  . F K                 W = stone_brick_wall
y4  . F L                 F = spruce_fence
y3  . W .                 K = iron_chain[axis=y]
y2  . W .                 L = lantern[hanging=true]
y1  b C b
```
- Varianten: mediterran mit `cut_sandstone` und `sandstone_wall`, nordisch mit `cobbled_deepslate` und `_wall`, fantasy mit `mossy_stone_bricks` und `_wall`.
- Wirkung hoch, Aufwand mittel. Vorbild „One-side Lamp Post“ [34].

**LP06 Mauerpoller** (Gartenweg):
- y1 `cobblestone_wall` (oder `mossy_cobblestone_wall`, `andesite_wall`), y2 `lantern[hanging=false]`.
- Steht **neben** dem Weg, nie darin, alle 4–6 Blöcke (Einschätzung).
- Vanilla-Taiga nutzt dieselbe Form mit Fackel: `cobblestone_wall` + `torch` [33].
- Wirkung niedrig bis mittel, Aufwand niedrig.

**LP07 Zaunlaterne mit Falltürhut:**
- y1–y2 `spruce_fence`.
- y3 `lantern[hanging=true]`, hängt am Hut.
- y4 Hut: `spruce_trapdoor[half=bottom,open=false]`, braucht keine Stütze [13].
- Stile: rustic, nordic, japanese (dann `dark_oak`). Wirkung mittel, Aufwand niedrig.

**LP08 Laternenhaus mit Falltür-Schirm:**
```
Draufsicht y4        Ansicht Süd           P = spruce_planks
.  Tn .              y5  S P S             S = spruce_stairs[half=bottom,facing=zur Mitte]
Tw L  Te             y4  T L T             L = lantern[hanging=false] auf dem Zaun
.  Ts .              y3  . F .             Tn = spruce_trapdoor[facing=north,open=true] (Paneel an der Südseite, also an L)
                     y1–2 . F .            Te/Ts/Tw analog mit east/south/west
```
- Licht geht durch die Falltüren [3].
- Stile: rustic, medieval, japanese (mit `bamboo_*`). Wirkung hoch, Aufwand mittel [36].

**LP09 Kasuga-dōrō** (japanische Steinlaterne):
```
Ansicht Süd, x=-1..1      Teile nach [42]
y6  . H .                 hōju (Knauf):         H = stone_brick_wall
y5  S B S                 kasa (Schirm):        B = stone_bricks, S = stone_brick_stairs[half=bottom,facing=zur Mitte]
y4  . L .                 hibukuro (Feuerkammer): L = lantern[hanging=false]
y3  . P .                 chūdai (Plattform):   P = smooth_stone_slab[type=top]
y2  . W .                 sao (Schaft):         W = andesite_wall
y1  . K .                 kiso (Fuß):           K = polished_andesite
```
- Die Schirm-Ecken bekommen Treppen; die Ecken formt der Auflöser.
- Steht „along paths, near water, or next to a building“ [42]: 1–2 je Garten, nie in Reihen (Einschätzung).
- Stile: japanese, cherry. Wirkung hoch, Aufwand mittel.

**LP10 Yukimi-dōrō** (Schneeschau-Laterne, niedrig und breit):
```
y4  S B S      wie LP09
y3  . L .      L = lantern[hanging=false]
y2  T T T      T = stone_brick_slab[type=top]
y1  W . W      W = stone_brick_wall (Beine)
```
- „Legged lanterns … near water“ [42], passt also zum Winterteich (`landscape.ts:164–175`).
- Stile: japanese, cherry, nordischer Garten. Wirkung hoch, Aufwand mittel.

**LP11 Moderner Mast mit Ausleger:**
- y1–y6 `polished_blackstone_wall` (oder `polished_deepslate_wall`).
- Bei x = 1: oben y6 `polished_blackstone_slab[type=top]`, darunter y5 die Leuchte.
- Leuchte: `end_rod[facing=down]` (kalt) oder `waxed_copper_bulb[lit=true,powered=false]` (warm). Endstäbe brauchen keine Stütze [14].
- Stil: modern. Wirkung mittel bis hoch, Aufwand niedrig.

**LP12 Endstab-Poller:**
- y1 `end_rod[facing=up]`, y2 `smooth_quartz_slab[type=bottom]` oder `iron_trapdoor[half=bottom,open=false]` [36].
- Für moderne Wege, alle 4–6 Blöcke (Einschätzung). Schmilzt Schnee.
- Wirkung mittel, Aufwand niedrig.

**LP13 Sandsteinsäule** (nach Vanilla `desert_lamp_1`):
- Vanilla: `cut_sandstone` ×2, `terracotta`, `torch` [33].
- Bei uns: y1–y2 `cut_sandstone`, y3 `terracotta` oder `chiseled_sandstone`, y4 `lantern[hanging=false]` (Fackel fehlt in der Registry).
- Stil: mediterranean. Wirkung mittel, Aufwand niedrig.

**LP14 Fackelkreuz** (exakt Vanilla `plains_lamp_1`):
- y1–y3 `oak_fence`, y4 `stripped_oak_wood[axis=y]`.
- An den 4 Seiten von y4 je eine `wall_torch[facing=…]` (nicht in Registry) [33].
- Stile: rustic, medieval. Wirkung mittel, Aufwand niedrig, erst nach der Registry-Ergänzung.

**LP15 Feuerschale:**
- y1–y2 `stone_brick_wall`, y3 `campfire[lit=true,signal_fire=false]`.
- Um die Glut 4 × `iron_trapdoor[open=true,facing=außen]`; das Paneel liegt dann an der Glut (Korb).
- Licht 15, Rauch etwa 10 Blöcke hoch, verletzt bei Berührung [18]. Nie unter Dächern oder an Laufwegen.
- Stile: medieval, fantasy, nordischer Hof. Wirkung hoch, Aufwand niedrig.

**LP16 Pilzlicht-Zaunleuchte:**
- y1–y2 `dark_oak_fence` oder `crimson_fence`, y3 `shroomlight`, y4 `dark_oak_trapdoor[half=bottom,open=false]`.
- Optional ein Falltür-Schirm wie bei LP08. Vorbild [36].
- Stile: fantasy, cherry, rustic. Wirkung mittel, Aufwand niedrig.

**LP17 Laubleuchte:**
- y1–y2 Zaun, y3 `ochre_froglight` (cherry: `pearlescent_froglight`).
- Ringsum und oben `azalea_leaves` bzw. `cherry_leaves[persistent=true]`. Laub lässt das Licht durch [3].
- Stile: fantasy, cherry. Wirkung mittel, Aufwand niedrig.

**LP18 Eisenmast-Kandelaber:**
- y1 `polished_blackstone_wall`, y2–y4 freistehende `iron_bars` (dünner Mast), y5 `lantern[hanging=false]` [4].
- Mindestens 1 Block Abstand zu Wänden, damit sich die Gitter nicht verbinden.
- Stile: modern, Bahnhof, Stadt. Wirkung mittel bis hoch, Aufwand niedrig.

**Weitere Builder-Designs** (Blöcke nicht in der Registry):
- Schleifstein-Arme, Amboss-Kopf mit Trichtern, Trichter-Kronleuchter [34][36].
- Ein Schleifstein braucht in Java keine Stütze [24]. Ob eine Laterne unter `grindstone[face=wall]` hängen kann, ist nicht belegt.
- Ein Amboss fällt herunter, wenn nichts unter ihm ist.

### T4 Wandleuchten

Schnitt quer zur Wand. Spalten sind die Tiefe d = −1, 0, +1, +2. M = Wandblock.

| Nr. | Skizze (d = −1, 0, +1, +2) | Legende | Stil, Wirkung/Aufwand |
|---|---|---|---|
| WL01 Zaunarm | `y+1: . M F .`, `y: . M L .` | F = `<frame>_fence`, L = `lantern[hanging=true]` | Holzstile; mittel/niedrig (wie T02) |
| WL02 Langer Arm mit Kette | `y+2: . M F F`, `y+1: . M . K`, `y: . M . L` | K = `iron_chain[axis=y]` | medieval, nordic; hoch/niedrig |
| WL03 Gitterarm | `y+1: . M B .`, `y: . M L .` | B = `iron_bars` | Steinbau, modern, mediterranean; mittel/niedrig [4] |
| WL04 Falltür-Konsole | `y+2: . M H .`, `y+1: . M L .`, `y: . M T .` | T = `<shutter>_trapdoor[half=top,open=false]`, L steht auf T, H = Hut `[half=bottom,open=false]` (optional) | rustic, japanese, cherry; mittel/niedrig [13] |
| WL05 Falltür-Baldachin | `y+1: . M T .`, `y: . M L .` | T = `<shutter>_trapdoor[half=bottom,open=false]`, L hängt | japanese, cherry (Tsuri-dōrō [42]); mittel/niedrig |
| WL06 Treppenkonsole mit Kette | `y+2: . M S .`, `y+1: . M K .`, `y: . M L .` | S = `<frame>_stairs[half=top,facing=zur Wand]`. Ohne K hält L nicht (T2) | medieval, fantasy; hoch/niedrig |
| WL07 Hebel mit Kette | `y+2: . M V .`, `y+1: . M K .`, `y: . M L .` | V = `lever[face=wall,facing=außen]` (nicht in Registry) [36] | rustic, medieval; mittel/niedrig |
| WL08 Einbauleuchte | `y: . G T .` | G = `ochre_froglight`, `shroomlight` oder `waxed_copper_bulb[lit=true]` in der Wand, T = Falltür `[facing=außen,open=true]` mit Paneel an G | modern (`iron_trapdoor`), rustic; hoch/niedrig [49] |
| WL09 Endstab | `y: . M E .` | E = `end_rod[facing=außen]` (trägt keine Laterne) | modern; niedrig/niedrig [14] |
| WL10 Laterne auf dem Sims | `y+1: . P L .`, `y: . M S .` | S = Sims-Treppe `[half=top]`, L steht neben dem Fenster, nicht davor | alle; mittel/niedrig |

**Höhe:** Wandleuchten sitzen auf Höhe Türsturz bis Geschossband (Tür-y + 2 bis + 3) (Einschätzung).

### T5 Hängende Laternen: Kettenlänge und Höhe

- **Kopffreiheit:** ≥ 2 freie Zellen unter jeder Laterne. In Vanilla haben Innenpendel 2–5 freie Zellen darunter, Pfahllaternen 2 [33].
- **Kettenlänge:** `c = max(0, r − 3)`.
  - Bei `floorHeight` 4/5/6 ist r = 3/4/5, also c = 0/1/2.
  - Die Laterne liegt dann auf Höhe der oberen Fensterreihe; Fenster beginnen bei `y0+2` (`openings.ts:247`).
- **Vanilla-Pendel:** Die Laterne hängt unter einem Zaun an der Decke (`snowy_butchers_shop_1`, `snowy_armorer_house_2`, `snowy_temple_1`) [33].
```
Schnitt Raummitte, r=5
y0+6  # # #    # = Decke
y0+5  . F .    F = <frame>_fence (oder Kette)
y0+4  . K .    K = iron_chain[axis=y]
y0+3  . L .    L = lantern[hanging=true]
y0+2  . . .
y0+1  . . .
```
- **Kronleuchter für Hallen** (r ≥ 7: Bahnhof, Turm): ein Zaunkreuz unter der Decke, an den Armen Laternen, in der Mitte Kette und Laterne. Vorbild: Kronleuchter aus Fichtenfalltüren, Zäunen, Ketten und Laternen [35] und aus Trichtern mit Ketten [36].
```
Draufsicht y_top: . F . / F F F / . F .     Ansicht: y_top F F F, y_top-1 L K L, y_top-2 . K ., y_top-3 . L .
```
- **Außen unter Traufen:** Kette 0–2. Liegt die Traufe tiefer als Gelände + 4, dort keine Laterne, sondern WL04.
- **Abstand** zwischen Hängelaternen ≥ 4, ruhiger mit 5–6 (Einschätzung).

### T6 Versteckte Lichtquellen

| Nr. | Technik | Aufbau | Geht? | Wirkung/Aufwand, Einsatz |
|---|---|---|---|---|
| H1 | Unter Teppich | y0 `glowstone`/`shroomlight`, y1 `moss_carpet` oder `<farbe>_carpet` | ja; Teppich mindert nicht, darauf spawnt nichts [12] | hoch/niedrig: Beete, Veranda, Innenboden |
| H2 | Unter Falltür | y0 `ochre_froglight`, y1 `spruce_trapdoor[half=bottom,open=false]` | ja [3]; auf Falltüren spawnt nichts [10] | mittel/niedrig: Wegrand, Stufe; modern mit `iron_trapdoor` |
| H3 | Unter Hecke | y0 Leuchtblock statt Gras, y1 Laub `[persistent=true]` | ja [3] | hoch/niedrig: Grundstücksecken |
| H4 | Im Laub | Hecke 2 hoch, Quelle innen | ja | mittel/niedrig: fantasy, cherry (`pearlescent_froglight` in `cherry_leaves`) |
| H5 | Deckenleuchte im Geschossboden | 1 Bodenblock des oberen Geschosses → Froschlicht oder `waxed_copper_bulb[lit=true]`, darüber Teppich | ja | hoch/niedrig: innen, alle Stile |
| H6 | Bündig im Weg | Wegblock → `ochre_froglight` (warm) oder `sea_lantern` (kalt) | ja, aber sichtbar | mittel/niedrig: modern, mediterran; schmilzt Schnee |
| H7 | Unsichtbar | `light[level=N]` | ja [2] | hoch/niedrig; Grenzen siehe Abschnitt „Der Block light“ |
| H8 | Hinter Glas | Quelle hinter `glass` oder Buntglas; `tinted_glass` sperrt [25] | ja | mittel/niedrig: modern, Bleiglas |
| ✗ | Unter Stufe oder Treppe | – | nach oben **nein** (volle Unterseite [3]) | – |
| ✗ | Unter Schneeschicht | – | **nein** [3], und der Schnee schmilzt [5] | – |
| ✗ | Unter `dirt_path` oder `farmland` | – | gerichtet gesperrt [3] | – |

Builder nennen dieselben Verstecke: Teppiche, Laub, Wandnischen hinter Falltüren, abgehängte Decken [50].

### T7 Fensterlicht bei leeren Innenräumen

**Wirkung (Einschätzung):** Eine Scheibe in einer hellen Zelle und die hellen Innenwände dahinter leuchten aus dem Dunkel. Am stärksten wirkt eine sichtbare Punktquelle direkt hinter dem Glas.

**Vorbilder:**
- Der Schwibbogen steht „typischerweise auf Fensterbänken“; sein Licht soll den Bergleuten „den sicheren Weg zurück ins Heim weisen“ [43].
- Schwedische Adventsleuchter stehen im Fenster, die elektrischen mit 7 Lichtern [44].
- Amerikanische Häuser haben Lichter an Traufen, Türen und Geländern [45].

**F1 Fensterpendel** (stärkste Wirkung):
```
Schnitt Fensterachse, r=4     d: -1  0 +1
y0+4   K  #  .      K = iron_chain[axis=y]
y0+3   L  P  .      L = lantern[hanging=true] hinter der oberen Scheibe
y0+2   .  P  .      P = Fensterscheibe
y0+1   .  #  S      S = Außensims
```
- Eine Laterne je Fenster oder Fensterpaar.
- Treppen- und Leiterspalten meiden.

**F2 Innenfensterbank mit Kerzen** (Schwibbogen-Motiv):
- Bei d = −1, y0+1: `<frame>_trapdoor[half=top,open=false]` als Brett, trägt Kerzen [13].
- Darauf bei y0+2: `candle[candles=3,lit=true]`.
- Breiten: 2 Spalten → 2 + 2 Kerzen; 3 Spalten → 2-3-2 (Pyramide wie beim Adventsleuchter [44]).
- Licht 9; schmilzt keinen Schnee auf dem Außensims.

**F3 Deckenleuchte H5** (modern, japanisch): Durchs Fenster sieht man eine beleuchtete Wand statt eines Lichtpunkts, das wirkt weniger warm.

**F4 Papierlicht hinter Shoji:** Quelle bei d = −1 oder −2 hinter `white_stained_glass_pane`. Die Fläche leuchtet (Einschätzung).

**F5 Grundpegel:** `light[level=9..11]` gegen dunkle Ecken. Nie als einzige Quelle.

**Zielwerte (Einschätzung):**
- Jede Scheibenzelle hat ≥ 9 aus einer Innenquelle.
- Jeder Raum hat ≥ 1 sichtbare Quelle.
- Bei Schneewunsch F2 statt F1, weil der Validator sonst den Sims-Schnee entfernt (`validator.ts:173–181`).

### T8 Kerzen, Lagerfeuer, Endstäbe, Kupferbirnen, Redstone-Lampe

**Kerzen** [9]:
- Bis zu 4 gleichfarbige je Block, Licht 3/6/9/12; immer `lit=true,waterlogged=false`.
- Anzahl: 2–3 auf Simsen; 1 auf jedem zweiten Zaunpfosten (alte Notiz).
- Farben je Stil (Einschätzung):
  - ungefärbte `candle`: rustic, medieval
  - `white_candle`: nordic, modern
  - `red_candle`: Weihnachtsakzent, nur auf symmetrischen Achsen
  - `pink_candle`: cherry
  - `orange_candle`: mediterranean

**Lagerfeuer** [18]:
- Licht 15, Rauch etwa 10 Blöcke hoch, über Heuballen 24.
- Einsatz: Kamin (gibt es schon), Feuerschale LP15, Hof-Feuerstelle (nordic, rustic).
- `soul_campfire` ist kalt.

**Endstäbe** [14]:
- Licht 14, an jeder Seite, brechen nicht.
- Einsatz: modern (LP11, LP12), waagerecht unter Vordächern als „fluorescent lights“ [36], als Baumstern.

**Kupferbirne:**
- `waxed_copper_bulb[lit=true,powered=false]` bleibt ohne Strom an; ein Redstone-Impuls schaltet sie um [6].
- Licht nach Oxidation: 15 / 12 (`waxed_exposed_…`) / 8 (`waxed_weathered_…`) / 4 (`waxed_oxidized_…`). 12 passt zur Veranda, 8 zu gedämpftem Innenlicht.
- Vollblock, also bündig einbaubar.

**Redstone-Lampe:**
- Leuchtet nur bei Strom von einem Nachbarn, auch von oben oder unten. Ohne Strom geht sie nach 4 Ticks aus [7].
- `redstone_block` gibt Stärke 15 nur an direkte Nachbarn [8].
- **Regel:** Den `redstone_block` verdeckt in Decke, Dach oder Doppelwand an die Lampe setzen.
- Die übrigen Nachbarn des Redstone-Blocks dürfen nicht reagieren: keine Türen, Falltüren, Läden, Zauntore, Kupferbirnen, Schienen oder Kolben (Einschätzung aus der Strommechanik).
- Auf leuchtenden Lampen spawnen trotzdem Mobs [7]. Besser die Kupferbirne nehmen.

**Laternen im Vergleich:**

| | `lantern` | `soul_lantern` | `copper_lantern` (8 Varianten) |
|---|---|---|---|
| Licht | 15 [4] | 10 [32] | 15, unabhängig von Oxidation [15] |
| Flamme | orange | cyan-blau | grün [15] |
| Schnee | schmilzt | schmilzt nicht | schmilzt |
| Stimmung | warm, wohnlich | „spookier“ [38] | technisch |
| Einsatz | Hauptlicht | Akzent: fantasy, Eis, Turmspitze | Bahnhof, modern; seit 25w32a, **nicht in Registry** |

**Fackeln:** `torch` (14) [17] und `copper_torch` (14, grün) [16] fehlen in der Registry. In Vanilla tragen die Pfähle in Plains, Taiga, Wüste und Savanne Fackeln, nur die Schneedorf-Pfähle Laternen. Auch die Taiga-Häuser sind innen fast nur mit Wandfackeln beleuchtet [30][33].

---

## Lichtfarbe und Stimmung

| warm (Hauptlicht) | neutral | kalt (Akzent) |
|---|---|---|
| `lantern`, Kerzen (ungefärbt, weiß, orange, gelb, rot), `campfire`, `torch`, `shroomlight` [21], `ochre_froglight` [20], `glowstone`, `waxed_copper_bulb`, `redstone_lamp` | `pearlescent_froglight` (rosa) | `soul_lantern`, `soul_campfire`, `sea_lantern` (blassaqua [22]), `end_rod`, `verdant_froglight`, `copper_lantern`, `copper_torch` |

**Regeln** (Einschätzung, gestützt auf [1][38][39] und die Designregel „Gelbes Licht + kalter Schnee“):
1. Auf Menschenhöhe ist alles warm: Tür, Fenster, Pfähle, Wandleuchten bis 5 Blöcke über dem Gelände.
2. Kalte Quellen nur fern oder bei Eis, Wasser und Turmspitzen, höchstens 20 %.
3. Kontrast statt Flut: „Don't overlight the place … The contrast between bright courtyards and dimly lit hallways makes exploration feel atmospheric“ [39].
4. Weihnachtsfarbe kommt über rote Kerzen und Schleifen, nicht über kalte Leuchtblöcke.

**Lichtpalette je Stil** (Vorschlag für `style.lighting`):

| Stil | Hauptleuchte | Akzent | Pfähle | Wand | Innen |
|---|---|---|---|---|---|
| medieval | `lantern` | `campfire` (LP15), `candle` | LP04, LP05, LP01 | WL02, WL03, WL06 | Zaunpendel, Kronleuchter |
| fantasy | `lantern` (+ `shroomlight`) | `soul_lantern` ≤ 20 %, H4 | LP16, LP17, LP05 bemoost | WL06, WL04 | Pendel, H4 |
| rustic | `lantern` | `candle`, `campfire` | LP01/02, LP07, LP08, LP14 | WL01, WL04, WL07 | Zaunpendel |
| nordic | `lantern` | `white_candle` (F2) | LP01–03, LP04 | WL02, WL05 | Pendel + F2 |
| japanese | `lantern` | F4 | LP09, LP10, LP06 | WL05 | Pendel, F4 |
| cherry | `lantern` | `pearlescent_froglight`, `pink_candle` | LP09/10, LP17 | WL05 | Pendel, F4 |
| modern | `waxed_copper_bulb`, `lantern` | `end_rod`, wenig `sea_lantern` | LP11, LP12, LP18 | WL08, WL09, WL03 | H5 |
| mediterranean | `lantern` an der Wand | `orange_candle`, `shroomlight` | LP13, LP05 aus Sandstein | WL03, WL04 | Pendel |

---

## Spawnschutz: Regeln und Abstände

**Belegt:**
- Spawns nur bei Blocklicht 0 und Himmelslicht ≤ 7 [1][10].
- Die Fläche darunter braucht eine volle Oberseite.
- Kein Spawn auf Glas, Laub, Eis, Falltüren [10], unteren Stufen, Teppich und Schnee mit 2–7 Schichten [11][12].
- Licht hilft nicht gegen Schleime, Magmawürfel, Ghasts und Hoglins [11].
- GDMC fragt: „well lit, or does it otherwise prohibit mobs from spawning?“ [40].

**Reichweite (aus [1] hergeleitet):** Eine Quelle der Stufe L, h Zellen über der Laufebene, hält auf freier Fläche alle Laufzellen bis zum waagerechten Taxicab-Abstand **R = L − 1 − h** auf mindestens 1.

| Leuchte | L | h | R |
|---|---|---|---|
| Türlaterne auf 1 Zaun | 15 | 1 | 13 |
| Pfahllaterne LP01 (y3) | 15 | 2 | 12 |
| LP05 (y4) | 15 | 3 | 11 |
| Traufenlaterne 1. OG (y ≈ 5) | 15 | 4 | 10 |
| 3 Kerzen auf dem Sims | 9 | 1 | 7 |
| Seelenlaterne am Pfahl | 10 | 2 | 7 |
| H3 unter der Hecke | 15 | 1 | 13 |
| `light[level=6]` | 6 | 0 | 5 |

**Raster (Herleitung):**
- Quadratisches Raster mit Abstand s: deckt, solange s ≤ R (die Quadratmitte hat Taxicab-Abstand s).
- Versetzte Reihen: s ≤ 2R innerhalb der Reihe, bei Reihenabstand s/2.
- Das Tutorial nennt für Fackelreihen „about 14 blocks“ [11].

**Entlang eines Wegs:**
- Pfahl um o Blöcke seitlich versetzt, Laterne h über der Laufebene.
- Spawnschutz zwischen zwei Pfählen: s ≤ 2·(L − 1 − o − h). Mit o = h = 2 ergibt das s ≤ 20.
- Sichtbar hell (≥ 7) zwischen den Pfählen: s ≤ 2·(15 − 7 − o − h) = 8.
- Daraus die Empfehlung **8–12** (Einschätzung).
- Reales Gegenstück: historische Seillaternen „18 m apart … at a height of 6.1 m“, also etwa 3 × Höhe [47].

**Welche Abstände ums Haus?**
1. Jede spawnfähige Zelle des Grundstücks braucht Blocklicht ≥ 1. Dafür:
   - je Fassade ohne Tür eine Wandleuchte;
   - je Grundstücksecke eine Quelle im Abstand ≤ R, am besten H3.
2. Flachdächer aus Vollblöcken sind Spawnflächen. Abhilfe: Licht aufs Dach (LP12, Laterne auf der Brüstung) oder ein Belag aus Stufen, Teppich oder Falltüren. Treppendächer sind sicher.
3. Innen braucht jeder Raum mindestens 1 Quelle. Ein Pendel (R ≈ 10–12) deckt einen Raum bis etwa 10 × 10.
4. Licht verhindert nur das Spawnen. Gegen Mobs, die hereinlaufen, helfen Hecken, Zäune und Türen („keep mobs out“ [40]).
5. Hier nicht belegt: die Regel, dass in 24 Blöcken um den Spieler nichts spawnt. Kritisch wird es, wenn der Spieler weg ist; dann füllen sich dunkle Innenräume. Deshalb hat Innenlicht Priorität 1.

---

## Dichte und Rhythmus

**Vanilla-Maßstab** (eigene NBT-Auswertung [33]):
- 30 Schneedorf-Strukturen haben je 1–6 Lichter, im Schnitt 3,0.
- 27 Taiga-Strukturen haben je 1–11, im Schnitt 4,6.
- Das Muster: 1–2 Lichter am Eingang (auf Zaunpfosten oder unter einem Zaunarm) und 1–2 innen (Pendel in Raummitte oder Wandfackeln).

**Regeln** (Einschätzung, wo keine Quelle steht):
1. **Eingang:** genau ein Lichtmotiv je Eingang.
   - Haupttür: ein symmetrisches Paar, die aufwendigste Leuchte des Hauses.
   - Nebentür: eine einzelne Leuchte.
2. **Weg:**
   - Alle 8–12 Blöcke ein Pfahl, ab Breite 3 wechselseitig, 1 Block neben der Wegkante.
   - Der erste Pfahl steht 4–6 Blöcke hinter dem Eingangslicht, der letzte am Tor.
   - Paare nur als Tor-Motiv.
   - In Kurven außen, an Kreuzungen LP03.
3. **Fassade:** Leuchten nur an Ecken, Türen und Fensterachsen, mindestens 4 Blöcke auseinander. „Lanterns on the outer walls … sense of active occupation“ [39].
4. **Platz und Markt:** Licht bündeln: der Baum plus ein Mehrarm-Pfahl. „A few well-placed light sources beat dozens of lanterns everywhere, which just looks chaotic“ [38]. Über der Theke „one or two hanging lanterns“ [38].
5. **Budget an sichtbaren Außenquellen** (ohne Kerzen, Girlande, Baum):

   | Größe | Quellen |
   |---|---|
   | small | 3–5 |
   | medium | 5–8 |
   | large | 8–12 |
   | huge | 12–18 |

6. **Vielfalt:** höchstens 2 Leuchtentypen und 1 Akzent je Gebäude.
7. **Dichte:** Zwei Laternen stehen mindestens 4 Blöcke (Taxicab) auseinander, außer bei Vorlagen-Paaren. In jedem Taxicab-Radius 3 höchstens 2 Laternen.

---

## Der Block `light`: geeignet für WorldEdit und uns?

**Fakten** [2]:
- Seit 1.17 (21w13a), Zustände `level` 0–15 und `waterlogged`, also in beiden Profilen vorhanden.
- Unsichtbar und ohne Hitbox; anvisierbar nur mit einem Licht-Item in der Hand.
- Nicht abbaubar, nur durch Setzen eines anderen Blocks ersetzbar.
- Im Überleben nur per `/give` zu bekommen.

**WorldEdit (Einschätzung):**
- Ein normaler Blockzustand, also im Sponge-Schematic speicherbar.
- `//paste -a` überspringt nur Luft [48], Lichtblöcke werden also mitkopiert.
- Der Test mit dem EngineHub-Reader sollte `light[level=…]` einmal mit abdecken.

**Eignung:** ja für Spawnschutz und Grundhelligkeit, nein für Stimmung. Gründe:
- Licht ohne sichtbare Quelle wirkt bei hohen Stufen falsch.
- Überlebensspieler sehen die Blöcke nicht.
- Die Materialliste muss den Block als „nur per Befehl“ kennzeichnen.

**Regeln:**
- Außen Stufe 1–7, innen 7–11.
- Nie ≥ 12 in Schneenähe.
- Nie im Türfreiraum.

**Registry:** `kind: 'none'` (wird nicht gerendert), Licht aus `level`, im Editor als Marker sichtbar.

---

## Fehler, die Profis vermeiden

1. **Laternen-Spam:** Ringe um Türme, Laternen an jeder Ecke [38].
2. **Laterne auf Augenhöhe** oder unter niedriger Traufe. Vanilla setzt Pfahllaternen in die 3. Zelle über dem Weg [33].
3. **Dunkle Innenräume:** schwarze Fenster, Mobs im Haus [33].
4. **Kalte Quellen in warmer Szene:** Seelenlaterne, Seelaterne oder Endstab am Weihnachtshaus [38].
5. **Überall Stufe 15** statt Kontrast und mittlerer Stufen [1][39].
6. **Licht aus dem Nichts:** hoher `light`-Pegel ohne Leuchte, oder sichtbare Glowstone-Würfel in der Fassade. Besser verdecken (Teppich, Falltür, Laub) oder eine echte Leuchte zeigen.
7. **Laterne an falscher Halterung:** unter oberer Stufe, unter Kopfüber-Treppe, unter waagerechter Kette oder auf Laub. Sie fällt beim ersten Nachbar-Update ab [4].
8. **Licht unter Stufen oder Schnee „versteckt“:** Es kommt nach oben nicht durch [3], und Schnee schmilzt [5].
9. **Redstone-Fehler:**
   - Lampe ohne Strom [7].
   - Redstone-Block neben Läden oder Türen.
   - Kupferbirne neben einer Stromquelle (schaltet um) [6].
   - Ungewachstes Kupfer (dunkelt mit der Zeit nach).
10. **Schnee direkt unter Laternen:** Vanilla `snowy_lamp_post_03` legt ihn trotzdem hin; im Spiel schmilzt er [33].
11. **Zufällige Kerzenfarben** an symmetrischen Fassaden.
12. **Flachdächer und Höfe ohne Licht:** Dort spawnen Mobs [10].
13. **Derselbe Holzpfahl in jedem Stil.**
14. **Lagerfeuer im Laufweg oder unter Dächern** [18].

---

## Empfehlungen für den Generator

Nach Priorität geordnet.

1. **Innenlicht-Modul**
   - Ort: neu `src/core/generator/house/interiorLight.ts`, Aufruf in `buildHouse.ts` nach `buildOpenings`. Art: Regel plus Daten in `style.lighting.interior`.
   - Inhalt: je Raum ein Pendel mit `c = max(0, r − 3)`; je Fensterachse F1 (bei Schnee F2), wenn in Taxicab ≤ 5 noch keine Innenquelle ist. Treppen- und Leiterspalten sowie `reserved` meiden.
   - **Akzeptanz:** für alle Stile, Größen und Themen null umschlossene Spawnzellen mit Licht 0; jede Scheibe ≥ 9 aus Innenquellen; null Validator-Reparaturen.
2. **Lichtkarte und Spawn-Lint**
   - Ort: neu `src/core/analysis/lightMap.ts`, Lint in `buildingLints.ts`. Art: Regel.
   - Inhalt: BFS nach T1, Lint `dunkle-spawnflaeche`. Nachbeleuchtung in fester Reihenfolge: Wandleuchte, Pfahl, H3, H1, zuletzt `light[level ≤ 7]`.
   - **Akzeptanz:** 0 dunkle Spawnzellen im Modell für alle Kombinationen; deterministisch je Seed.
3. **Pfahl-Katalog als Daten**
   - Ort: neu `src/core/templates/lampPosts.ts`, analog zu W/T; `landscape.ts:120–143` wählt nach Stil.
   - Inhalt: LP01–LP18, Laterne bei y ≥ 3, Material über Rollen.
   - **Akzeptanz:** keine Pfahllaterne bei y ≤ 2; modern, japanese und mediterranean ohne Holzpfahl; alle Vorlagen bestehen die Stützprüfung in 4 Drehungen.
4. **Pfad-Rhythmus**
   - Ort: `landscape.ts`. Art: Regel, Dichtestufen als Daten.
   - Inhalt: `many` alle 8, `normal` alle 10–12, `few` nur ein Pfahl am Tor; ab Breite 3 wechselseitig.
   - **Akzeptanz:** keine zwei Pfähle näher als 6 (außer am Tor); bei `normal` Wegzellen ≥ 5.
5. **Anti-Spam und Kopffreiheit**
   - Ort: `festive.ts:113–131`, `buildingLints.ts`.
   - Inhalt: Mindestabstand 4 über alle Läufe; am Rundturm höchstens 4; ≥ 2 freie Zellen über dem Gelände; Lint `laternen-dichte`.
   - **Akzeptanz:** Lint grün für alle Typen; der Turm-Screenshot zeigt keinen Kranz mehr.
6. **Warm-Regel**
   - Ort: `styles.ts:111`, `resolveInput.ts:116`. Art: Daten.
   - Inhalt: Fantasy im Winter- und Weihnachtsthema mit `lantern`, `soul_lantern` nur auf Wunsch oder als Akzent.
   - **Akzeptanz:** ohne Wunsch höchstens 20 % kalte sichtbare Quellen.
7. **Kerzen-Ordnung**
   - Ort: `festive.ts:153–160`.
   - Inhalt: Farbe und Anzahl je Fassade aus `rng.fork('candles:'+fassade)`, spiegelsymmetrisch, Farbe nach Stil (T8).
   - **Akzeptanz:** keine Fassade mit gemischten Kerzenfarben, außer im festen Wechselmuster.
8. **Registry**
   - Ort: `src/core/blocks/families.ts`. Art: Daten.
   - Inhalt: `light`, die Fackeln mit Wandformen, `copper_lantern` mit Varianten, `copper_chain`, `redstone_lamp`, `redstone_block`, `lever`, `anvil`, `hopper`, `grindstone`, `bell`. Kupferbirnen-Licht auf 15/12/8/4 korrigieren.
   - **Akzeptanz:** Registry-Test grün für beide Profile; `emittedLight` liefert für `waxed_weathered_copper_bulb[lit=true]` den Wert 8.
9. **Redstone-Regeln im Validator**
   - Ort: `validator.ts`.
   - Inhalt: Eine Lampe mit `lit=true` ohne Strom wird zu `lit=false` repariert. Kein `redstone_block` neben Tür, Falltür, Zauntor, Kupferbirne oder Schiene. Eine leuchtende Kupferbirne ohne Stromnachbarn.
   - **Akzeptanz:** Die Generatoren lösen 0 dieser Reparaturen aus.
10. **Wandleuchten-Vorlagen**
    - Ort: neu `src/core/templates/wallLights.ts` (WL01–WL10), Einsatz an Rückseiten und Ecken.
    - **Akzeptanz:** Jede Fassade ohne Tür und länger als 7 Blöcke liegt im Radius R einer Quelle.
11. **Verdeckter Spawnschutz außen**
    - Ort: `landscape.ts`.
    - Inhalt: H3 an den Ecken, H1 in Beeten; Option `invisibleLight` für den `light`-Block. Die Vorgabe entscheidet der Creative Director; Vorschlag: außen aus, innen an.
    - **Akzeptanz:** Die Materialliste kennzeichnet `light` als „nur per Befehl“.
12. **Nachtvorschau**
    - Ort: `src/components/preview/buildVoxelMesh.ts`.
    - Inhalt: Vertex-Helligkeit aus `lightMap.ts`, Umschalter Tag/Nacht.
    - **Akzeptanz:** neuer Fall „Nacht“ in `docs/screenshots/faelle.json`.
13. **Bahnhof und Markt**
    - Ort: `station.ts`, `marketStall.ts`.
    - Inhalt: LP04 als T-Form an den Bahnsteigenden, ein Paar am Portal; am Markt ein Mehrarm-Pfahl am Gassenende.
    - **Akzeptanz:** Spawn-Lint grün, Budget eingehalten.

---

## Quellen

1. https://minecraft.wiki/w/Light – Taxicab-Abnahme, Spawn bei Blocklicht 0, orange Tönung mittlerer Stufen.
2. https://minecraft.wiki/w/Light_(block) – Lichtblock: `level`, `waterlogged`, unsichtbar, nur per Befehl, ersetzbar, seit 21w13a.
3. https://minecraft.wiki/w/Opacity – Laub/Wasser/Eis ohne Effekt auf Blocklicht; Blöcke mit gerichteter Opazität.
4. https://minecraft.wiki/w/Lantern – Stützregeln, Eisengitter und Glasscheiben, Bruch beim Update, Licht 15.
5. https://minecraft.wiki/w/Snow – Schmelzen ab Licht 12, Radientabelle (uneinheitlich).
6. https://minecraft.wiki/w/Copper_Bulb – Licht 15/12/8/4, Umschalten per Impuls, gewachst.
7. https://minecraft.wiki/w/Redstone_Lamp – Strom vom Nachbarn, Abschalten nach 4 Ticks, opak, Mobs spawnen darauf.
8. https://minecraft.wiki/w/Block_of_Redstone – Stärke 15 nur an direkte Nachbarn.
9. https://minecraft.wiki/w/Candle – 1–4 gleichfarbig, Licht 3/6/9/12.
10. https://minecraft.wiki/w/Mob_spawning – Licht- und Flächenbedingungen, kein Spawn auf Glas, Laub, Eis, Falltüren.
11. https://minecraft.wiki/w/Tutorial:Spawn-proofing – Stufen, Teppich, Schnee 2–7; „about 14 blocks to the next torch“.
12. https://minecraft.wiki/w/Carpet – kein Spawn auf Teppich, Licht unverändert.
13. https://minecraft.wiki/w/Trapdoor – keine Stütze nötig; Laterne je nach `half`; Kerzen und Fackeln gleich.
14. https://minecraft.wiki/w/End_Rod – Licht 14, an jeder Seite, bricht nicht.
15. https://minecraft.wiki/w/Copper_Lantern – 25w32a, grüne Flamme, Licht 15 unabhängig von Oxidation.
16. https://minecraft.wiki/w/Copper_Torch – Licht 14, grün, `copper_wall_torch`.
17. https://minecraft.wiki/w/Torch – Licht 14, Platzierung (Glas, Gitter, nicht auf Laub).
18. https://minecraft.wiki/w/Campfire – Licht 15, Zustände, Schaden, Rauch 10/24.
19. https://minecraft.wiki/w/Iron_Chain – Achsen, Laterne hängt an Kette.
20. https://minecraft.wiki/w/Froglight – Licht 15, drei Farben, `axis`.
21. https://minecraft.wiki/w/Shroomlight – Licht 15, rötlich-braun.
22. https://minecraft.wiki/w/Sea_Lantern – Licht 15, pulsierend, blassaqua.
23. https://minecraft.wiki/w/Iron_Bars – transparent, Fackeln darauf seit 1.14.3.
24. https://minecraft.wiki/w/Grindstone – `face` floor/wall/ceiling, in Java ohne Stütze.
25. https://minecraft.wiki/w/Tinted_Glass – sperrt Licht vollständig.
26. https://minecraft.wiki/w/Leaves – lichtdurchlässig, dämpft Himmelslicht.
27. https://minecraft.wiki/w/Hanging_Sign – Zustände, Block-Entity für Text.
28. https://minecraft.wiki/w/Lightning_Rod – `facing`, Oxidation, Wachs.
29. https://minecraft.wiki/w/Vibrant_Visuals – Java nur geplant, farbiges Licht nur Bedrock (experimentell).
30. https://minecraft.wiki/w/Village – Laternen im Schneedorf, sonst Fackeln.
31. https://de.minecraft.wiki/w/Licht – Spawn nur bei Licht 0; Laub beeinflusst Blocklicht nicht.
32. https://de.minecraft.wiki/w/Laterne – Laternen auf und unter Zauntoren und Falltüren; Seelenlaterne Licht 10.
33. https://github.com/misode/mcmeta/tree/1.21.11-data/data/minecraft/structure/village – eigene NBT-Auswertung: Lampenpfähle aller Dorftypen, 30 Snowy- und 27 Taiga-Strukturen.
34. https://gamerempire.net/minecraft-lamp-post-design-ideas/ – 16 Lampenpfähle mit Materiallisten.
35. https://gamerempire.net/minecraft-chandelier-design-ideas/ – 10 Kronleuchter.
36. https://gameskeys.net/lamp-designs-ideas-in-minecraft/ – Shroomlight-Zaun, Endstab-Poller, Endstab-Röhren, Hebel-Ketten-Lampe, Trichter-Kronleuchter.
37. https://www.highgroundgaming.com/best-light-sources-minecraft/ – Lichtquellen mit Stilzuordnung.
38. https://minecraft.how/blog/post/build-minecraft-market-stall – „A few well-placed light sources beat dozens of lanterns“; Seelenlaternen „spookier“.
39. https://minecraft.how/blog/post/minecraft-castle-medieval-building-guide – „Don't overlight“, Kontrast, Laternen an Außenmauern.
40. https://gendesignmc.wikidot.com/wiki:evaluation – GDMC-Kriterium: „well lit … prohibit mobs from spawning?“.
41. https://arxiv.org/abs/1803.09853 – GDMC-Wettbewerb (Salge et al.): funktionale, glaubwürdige Siedlungen.
42. https://en.wikipedia.org/wiki/Tōrō – Teile und Typen japanischer Steinlaternen, Aufstellorte.
43. https://de.wikipedia.org/wiki/Erzgebirgischer_Schwibbogen – Lichterbogen auf Fensterbänken, Licht als Heimweg.
44. https://sv.wikipedia.org/wiki/Adventsljusstake – Adventsleuchter im Fenster, elektrisch mit 7 Lichtern.
45. https://en.wikipedia.org/wiki/Christmas_lights – Traufen umranden, Lichter an Türen und Geländern.
46. https://de.wikipedia.org/wiki/Straßenbeleuchtung – Ausleger, Überspannung an Seilen, Gaslaternen.
47. https://en.wikipedia.org/wiki/Street_light – historische Seillaternen, 18 m Abstand bei 6,1 m Höhe.
48. https://worldedit.enginehub.org/en/latest/commands/ – `//paste`-Flags, `-a` überspringt nur Luft.
49. https://minecraftdesign.fandom.com/wiki/Lighting – nur Such-Snippet (Seite 402): „simple wall light … 1 glowstone and 1 trapdoor“, Lampenschirm aus Falltüren.
50. https://www.sportskeeda.com/minecraft/5-best-ways-hide-lighting-minecraft – nur Such-Snippet (Seite 405): Licht unter Teppich, hinter Laub, in Wandnischen hinter Falltüren.
