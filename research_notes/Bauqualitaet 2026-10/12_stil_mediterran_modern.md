# Stilbibel Mediterran und Modern (Stil-IDs `mediterranean`, `modern`)

Stand 2026-10-23. Thema: Was mediterrane und moderne Häuser in echter Architektur und bei guten Minecraft-Buildern ausmacht, und wie der Generator beide Stile mit Paletten, Proportionen, Dächern, Öffnungen, Details und Umgebung glaubwürdig baut.

Konventionen: Block-IDs ohne `minecraft:`. Fassaden werden wie in `src/core/templates/types.ts` kanonisch als **Südfassade** gezeichnet: Außen ist Süden (+z), x läuft nach rechts (Osten), y nach oben, Tiefe d: −1 innen, 0 Wandebene, +1/+2 davor. „(Einschätzung)“ markiert Regeln ohne direkte Quelle. „(nicht in Registry)“ markiert Blöcke, die es in Java 1.21.11 gibt, die aber in `src/core/blocks/families.ts` fehlen. Helligkeiten L\* und Buntheit C stammen aus `src/core/style/textureStats.ts` (gemessen aus der Client-Datei). Quellen stehen als [n] im Text. Die alte Notiz `paletten.md` wird nicht wiederholt, sondern korrigiert und erweitert.

---

## Kurzfassung

1. **Modern braucht mehrere Baukörper, kein Einzelvolumen.** Gestapelte oder versetzte Kuben mit 1–3 Blöcken Versatz und ein auskragendes Obergeschoss tragen den Stil [1][2]. Der Generator baut heute fast immer genau eine Kiste: `modern.symmetric = true` (`styles.ts:243`) verhindert den Anbau (`resolveInput.ts:98`).
2. **Ein Material pro Volumen.** Weißer Putzkubus, Holzkubus, dunkler Kubus. Die Materialwechsel liegen an den Kanten der Baukörper, nicht mitten in der Wand. Der Kontrast entsteht durch Volumen, nicht durch Rahmen um jedes Fenster [1][32] (Einschätzung zur Kantenregel).
3. **Dünne Dachkante statt Deckel.** Flachdach mit Attika im Wandmaterial oder eine Dachplatte, die 1–3 Blöcke auskragt. Die Platte ist eine Stufe dick und erzeugt eine Schattenlinie [2][5][8]. Heute entsteht ein 2,5 Blöcke hoher dunkler Deckel (`walls.ts:224` plus `roofEngine.ts:252–256`).
4. **Glas in Feldern, nicht in Kästen.** Raumhohe Verglasung zwischen den Geschossplatten, Eckfenster ohne Pfosten [34], Bandfenster [31] und Lamellen [35] ersetzen die Rahmenbox W16 auf jedem Fenster. Höchstens eine Bilderrahmen-Box pro Fassade.
5. **Mediterran lebt vom Draußen-Wohnen.** Loggia oder Arkade, Pergola, Terrasse, Außentreppe, Hof [39][40][43][44]. Keines davon baut der Generator heute. Ab Größe medium ist mindestens eines Pflicht.
6. **Flaches Ziegeldach mit Génoise statt dicker weißer Traufe.** Die Dachneigung liegt real bei mindestens 30 % [47], die Traufe ist ein 2–3-reihiges Ziegelgesims, das stufenweise vorkragt [48][53]. Im Spiel heißt das: Profil `shallow` oder neu `low` (Δ 1,1,0) und eine Untersicht aus Kopfüber-Treppen in Ziegelfarbe. Der dunkle Balkenring (`walls.ts:224`) fällt weg.
7. **Untervarianten müssen Geometrie steuern, nicht nur Farbe.** Toskana (Walmdach und Turm), Kykladen (Flachdach, Gewölbe, gerundete Kanten), Hacienda (Hof, Arkaden, Vigas, Gitter), Provence (Satteldach, Génoise, Läden), Ligurien (hoch, bunt, gemalte Rahmen). Bei Modern: Bauhaus, Mid-Century, Kubus-Minimal, Skandi-Schwarz, Beton und Holz.
8. **Paletten neu: je 5 pro Stil**, gegen die Lints geprüft (ΔL, 3–5 Familien). Dazu fehlen Materialien: `yellow_terracotta`, `pink_terracotta`, `light_blue_concrete` (alle in der Registry, aber nicht in `materials.ts`). Die Lint-Sperre `log` für Modern verhindert entrindete Stämme als Pfosten oder Verkleidung.
9. **Rustikale Teile aus Modern entfernen:** Zaunpfosten-Laternen im Garten, Vorbau auf Zaunpfosten, Hängelaternen an der Tür, Treppenschürze am Sockel. Licht wird eingelassen: `pearlescent_froglight`, `sea_lantern`, `end_rod` [26].
10. **Mediterrane Umgebung: Zypressen und Olivenbäume statt Eichenhecke.** Zypressen sind säulenförmig, ihre Krone ist oft schmaler als ein Zehntel der Höhe [45]. `pale_oak_leaves` sind immer grau, unabhängig vom Biom [22], und passen damit zum Olivenlaub (nur 1.21.11). Dazu Töpfe, Pflaster und niedrige Gartenmauern.
11. **Warme und kühle Weißtöne nicht mischen.** `white_concrete` ist kühl (Farbton 213°), `smooth_quartz` und `white_terracotta` sind warm (75° und 55°). Die Palette `mediterranean_white` mischt beide (`palettes.ts:449–455`) (Einschätzung auf Basis der Messwerte).
12. **Wasser ist kein Ausschlussgrund.** `water[level=0]` ist ein normaler Block ohne Block-Entity. In einem dichten Becken bleibt er stehen [18]. Er fehlt nur in der Registry. Im Winter wird das Becken zu `packed_ice`, das nicht schmilzt [17].
13. **Weihnachten pro Stil:** Mediterran mit Farolitos (Kerzenreihen auf Brüstungen und Treppen [46]) und grauer Oliven-Girlande. Modern mit einem warmweißen Lichtband in der Dachplatte, einem einzelnen Baum und ohne rote Schleifen-Kette. Schnee hält nur auf voller Oberseite [16]. Die Innenfläche heutiger Flachdächer ist eine untere Stufe, dort bleibt kein Schnee liegen.

---

## Schwächen des aktuellen Generators

Grundlage sind die Screenshots `docs/screenshots/haus-mediterran-*.jpg` und `haus-modern-*.jpg` und der Code.

**Modern (Screenshot „groß ohne Thema“ und „Weihnachten“):**
- **Eine einzige Kiste.** `styles.ts:243` setzt `symmetric: true`. Damit gilt `asym = false`, und `resolveInput.ts:98` legt nie einen Anbau an, obwohl `details.annex = 0.6` gesetzt ist (`styles.ts:249`) und die KI-Beschreibung „versetzte Baukörper“ verspricht (`styles.ts:231`). Flügel gibt es nur bei `huge`, und dann als T (`resolveInput.ts:79`).
- **Schwerer dunkler Deckel.** `buildTop` setzt auf der Wandoberkante einen Balkenring aus der Rolle `beam` (`walls.ts:217–224`). Darauf legt die Dach-Engine für `flat` einen vollen Trim-Block und eine Trim-Stufe (`roofEngine.ts:252–256`). Im Screenshot ergibt das ein 2,5 Blöcke hohes graues Band. Es gibt keine auskragende Platte, denn der Überstand liegt bei `[0, 1]` (`styles.ts:239`, `resolveInput.ts:96`).
- **Rahmenboxen dominieren, Glas ist knapp.** W16 setzt um jedes Fenster eine Box in d=+1 (`windows.ts:476–490`, Glas nur 2 hoch). Übereinanderliegende Boxen verschmelzen im Screenshot zu riesigen „n“-Formen. Es gibt keine raumhohe Verglasung, kein Eckfenster und keine Lamellen. Der Stil kennt nur `['W16', 'W01']` (`styles.ts:246`).
- **Keine Tiefe zwischen den Fenstern.** `frames = false` gilt für modern und mediterranean (`plan.ts:201`). Die Wand ist flach, Tiefe bringen nur die Vorlagen.
- **Rustikale Teile.** Die Tür T01 hat Hängelaternen (`doors.ts:58–75`). Der Vorbau steht auf Pfosten aus `fence('frame')`, der Fallback ist bei Beton der Vollblock (`components.ts:112–121`). Die Gartenlaternen sind Zaunpfähle mit Arm (`landscape.ts:119ff`). Die Stil-Laterne ist `lantern` (`styles.ts:248`).
- **Treppenschürze am Sockel** für alle Stile (`walls.ts:113–121`). Im Screenshot ist das ein zweistufiger Steinsockel, wie bei einem Tempel. Modern will ein bündiges Podest oder eine Schattenfuge [1].
- **Kein Pultdach und keine anderen Dachformen.** `ROOF_TYPES` (`styles.ts:18`) kennt `shed` nicht für den Hauptkörper, die Engine kann es aber (`roofEngine.ts:169`). Modern steht fest auf `flat: 1`.
- **Lint-Sperre `log`** (`styles.ts:250`). `isForbidden` sperrt damit auch `stripped_*_log` (`lints.ts:46`). Pfosten und Riegel bei Mid-Century und vertikale Holzverkleidung sind so unmöglich. `pale_oak_*` fehlt in `materials.ts`, und der Lint verlangt Formen in 1.21.1 **und** 1.21.11 (`lints.ts:77`). Eine helle skandinavische Palette scheitert daran.
- **Festschicht ohne Stilbezug.** Fichten-Girlande mit roten Wollschleifen unter der Attika (`festive.ts:13–18, 97–106`). Auf dem weißen Kubus wirkt das wie Landhaus-Deko.

**Mediterran (Screenshot „groß ohne Thema“ und „Weihnachten“):**
- **Fast quadratische Pyramide.** Größe large ist 13×11, small 7×7 (`styles.ts:268`) mit `hip: 0.5` (`styles.ts:262`). Das ergibt ein Pyramidendach aus `bricks` ohne Farbvariation (`palettes.ts:454, 477`).
- **Dicke helle Traufe mit dunklem Holzband.** `roofTrim` ist `smooth_quartz` oder `sandstone`, der Ring darunter ist `stripped_oak_log` oder `stripped_spruce_log` (`palettes.ts:452–455, 475–478`, `walls.ts:224`). Die mediterrane Traufe ist dagegen ziegelfarben und kragt in Stufen aus [48].
- **Grauer Steinziegelsockel mit Treppenschürze.** `plinth: stone_bricks` (`palettes.ts:448, 471`) und `walls.ts:113–121`. Das liest sich mittelalterlich.
- **Unruhige Fensterläden.** `shutter: warped_planks` (`palettes.ts:459, 482`). Die Warped-Falltür ist türkis mit Schnörkeln, im Screenshot wirkt sie unruhig. Die Blumenkästen W05 aus Moos und Falltür-Verkleidung (`windows.ts:189–211`) sind alpin, nicht mediterran.
- **Kein Draußen-Wohnen.** Es gibt keine Loggia, Arkade, Pergola, Terrasse, Außentreppe oder Turm. Der einzige Vorbau ist das rustikale Pultvordach auf Zaunpfosten (Screenshot Weihnachten, `components.ts:80–124`). `balcony` steht standardmäßig auf `false`.
- **Kühles und warmes Weiß gemischt:** `white_concrete` (C 2,2, Farbton 213°) mit `smooth_quartz` (Farbton 75°) in `mediterranean_white`.
- **Akzent ohne Wirkung.** `accent: light_blue_stained_glass` (`palettes.ts:464, 487`). Die Rolle `accent` wird im Haus-Generator praktisch nicht verwendet (nur in `generateBuilding.ts:103` und im Parser).
- **Schornstein ohne Kappe.** Ein weißer Schaft mit Lagerfeuer (`components.ts:129–160`). Mediterrane Schornsteine haben eine Haube (Einschätzung).
- **Garten ohne Stilbezug.** Eine Eichenlaub-Hecke um das Grundstück und Tulpen (`landscape.ts:40, 51, 108`). Es gibt keine Zypresse, keinen Olivenbaum, keine Töpfe und keine Gartenmauer.

---

## Techniken und Regeln

### A. Mediterran

#### M1 – Génoise (gestuftes Ziegel-Traufgesims)
Unter der Traufe liegen 2–3 Reihen Ziegel, die nach oben jeweils weiter vorkragen. Die Reihenzahl zeigte früher den Stand: einfache Häuser 2, reichere 3–5 [48][53]. Herkunft ist Italien, verbreitet ist sie von Aquitanien bis in die Provence, nach Italien, Spanien und Portugal [48]. Im Generator ersetzt sie die Kombination aus weißer Trim-Traufe und Balkenring.
- Blöcke: Untersichtrolle `soffit` = Ziegelfarbe (`granite` oder `bricks`). Reihe 1 und 2 sind Kopfüber-Treppen `granite_stairs[facing=north,half=top]`. Die äußerste Reihe 2 ist wahlweise `granite_slab[type=top]`, damit die Kante dünner wirkt. Die Traufe der Dachfläche ist `brick_stairs[facing=north,half=bottom]`.
- Maße: Überstand 2, mit 2 Reihen. Die Wandoberkante y=H bleibt **Wandmaterial**, also kein Balkenring. An den Hausecken setzt der Auflöser `outer_*`. Am Ortgang läuft die Génoise nicht weiter, dort genügt eine einfache Kante (Einschätzung).
```
Schnitt quer zur Südtraufe (Blick nach Westen)
        d=-1  d=0  d=+1  d=+2
y=H+1    R     R    R     E      R = granite_stairs[facing=north,half=bottom] (Dachfläche)
y=H      .     W    g     s      E = brick_stairs[facing=north,half=bottom] (Traufkante, Rolle roofTrim)
y=H-1    .     W    g     .      g = granite_stairs[facing=north,half=top] (Génoise-Reihe)
y=H-2    .     W    .     .      s = granite_slab[type=top] (oberste, weiteste Reihe)
                                 W = Wandmaterial (white_terracotta / calcite), KEIN Balkenring
```
- Einsatz: Toskana, Provence, Ligurien, Hacienda mit geneigtem Dach. Nicht bei Kykladen. Alle Größen.
- Wirkung hoch, Aufwand niedrig (Untersicht-Variante `soffit: 'genoise'` in der Dach-Engine). Stile: mediterranean, mit Abstrichen rustic.

#### M2 – Flaches Ziegeldach mit Mischung („Coppi“)
Coppi-Dächer haben eine Neigung von „in der Regel nicht unter 30 %“, das sind etwa 17° [47]. Italianate und Toskana-Villen haben „low-pitched or flat roofs; roof is frequently hipped“ [42], die Mediterranean Revival hat „red tiled roofs“ [39]. Im Spiel ist `shallow` (Δ 1, 26,6°) die Untergrenze. Ein neues Profil `low` mit Δ 1,1,0 kommt auf ≈ 18° und folgt der Regel „step every two or three blocks for a shallower, calmer slope“ [8].
- Dachmischung: Gute Paletten mischen Blöcke mit gleichem Ton und anderer Textur [9]. Empfehlung: Die Dachfläche nutzt je Zelle eine Treppe aus einer Mischung von `granite_stairs` 60 %, `brick_stairs` 25 % und `mud_brick_stairs` 15 %, in Clustern von 2–3 Zellen entlang einer Reihe (Einschätzung). Firste und Kanten bleiben einfarbig. Gemessen: granite L48/C24/h46, bricks L47/C27/h41, mud_bricks L47/C21/h62. Alle drei sind gleich hell, das Dach bleibt also ruhig.
- Orange Alternative: `acacia_stairs` (L47, C46, h52) liegt farblich fast auf `orange_terracotta` (L44, C49, h55) und ist der kräftigste Ziegelton mit Treppenform. `smooth_red_sandstone_stairs` (C57) ist zu gelb-orange. `resin_brick_stairs` (C70) ist zu grell und gibt es nur in 1.21.11 (Einschätzung auf Basis der Messwerte).
- Grundriss: Walmdach nur bei W ≥ D + 4, sonst entsteht eine Pyramide. Bei fast quadratischem Grundriss lieber Satteldach (Provence-Mas: „toit à deux pentes“ [49]) oder Turm plus Satteldach (Einschätzung).
```
Schnitt Profil low (Δ 1,1,0,1,1), Hauptdach 11 breit, n=5 Spalten je Seite
           c0  c1  c2  c3  c4  c5(First)
y=b+2       .   .   .   .   .   _        b = granite_slab[type=bottom]
y=b+1       .   .   .   b   t   #        t = granite_slab[type=top]
y=b         b   t   t   #   #   #        _ = brick_slab[type=bottom] (First, Rolle ridge)
                                         # = granite (Füllung)
```
- Wirkung hoch, Aufwand mittel (neues Profil plus Mischung in der Dach-Engine). Stile: mediterranean, außerdem japanese (Mischung).

#### M3 – Loggia / Arkade (Rundbogenreihe)
Eine Loggia ist ein überdeckter Gang, der nach außen offen ist. Die Außenwand ist nur teilweise geschlossen und ruht oben auf Säulen oder Bögen. Sie ist Teil des Baukörpers und nicht angebaut [43]. Spanish Colonial Revival nennt „Roman or semi-circular arcades“ [40], Italianate nennt Loggien als Kernelement [42].
- Bauweise: Im Erdgeschoss (Hacienda, Toskana) oder im obersten Geschoss (Turm, Ligurien) springt die Wand um 2–3 Blöcke zurück (d=−2 bis −3). In d=0 bleibt eine Bogenreihe stehen. Öffnungen sind 3 breit und 3–4 hoch, die Pfeiler 1 breit, also ein Rhythmus von 1 Pfeiler zu 3 Öffnung. Der Bogen kommt aus der Bogenbibliothek (`roundArch(3)`), wie bei T04.
```
Ansicht Süd, Arkade 3 Joche, x=0..12, Erdgeschoss y=1 (Boden) .. y=5
y=5   P P P P P P P P P P P P P     P = Wandmaterial (Pfeiler und Brüstungsband)
y=4   P > _ < P > _ < P > _ < P     > = smooth_quartz_stairs[facing=west,half=top] (linker Kämpfer)
y=3   P . . . P . . . P . . . P     < = smooth_quartz_stairs[facing=east,half=top]
y=2   P . . . P . . . P . . . P     _ = smooth_quartz_slab[type=top] (Scheitel)
y=1   F F F F F F F F F F F F F     F = terracotta (Boden „cotto“), Rückwand in d=-3 mit Tür/Fenstern
Decke der Loggia (y=5, d=-1..-2): stripped_spruce_log[axis=z] alle 2 Blöcke, dazwischen spruce_planks; lantern[hanging=true] mittig je Joch
```
- Maße: mindestens 3 Joche, Tiefe 2 (small/medium) oder 3 (large). Eine Arkade zählt als Tiefensprung und hält den Lint „flache Wand“ ein.
- Wirkung hoch, Aufwand hoch (eigene Masse „recess“ im Plan, Böden, Decke). Stile: mediterranean, fantasy (Kreuzgang), medieval (Laubengang).

#### M4 – Pergola mit Bewuchs
Eine Pergola besteht aus senkrechten Pfosten oder Pfeilern mit Querbalken und einem offenen Gitter darüber. Sie ist Rankgerüst für Kletterpflanzen und seit der Renaissance typisch für den mediterranen Garten [44].
- Blöcke: Pfeiler `sandstone_wall` oder Wandmaterial (3 hoch). Pfetten `stripped_spruce_log[axis=x]`. Sparren `spruce_fence` quer, alle 2 Blöcke (der Auflöser verbindet sie). Bewuchs: `vine` an den Seiten der Pfetten, oben 30–50 % `flowering_azalea_leaves[persistent=true]` (Bougainvillea, Einschätzung) oder `oak_leaves` (Wein).
- Maße: Achsabstand der Pfosten 3–4, Tiefe 3–5, Höhe Unterkante 3 über dem Boden. Steht vor der Gartenfassade oder auf der Dachterrasse.
```
Draufsicht y=4 (Pergola 7×5, Pfosten O auf y=1..3 darunter an den Ecken und in der Mitte)
      x=0 1 2 3 4 5 6
z=0     B B B B B B B     B = stripped_spruce_log[axis=x]
z=1     f . f . f . f     f = spruce_fence (Sparren in z-Richtung, verbindet sich mit B)
z=2     f L f . f L f     L = flowering_azalea_leaves[persistent=true] auf den Sparren (y=5)
z=3     f . f L f . f
z=4     B B B B B B B     Pfosten O = sandstone_wall bei x=0,3,6 / z=0,4
```
- Wirkung hoch, Aufwand niedrig. Stile: mediterranean, japanese (ohne Bewuchs), rustic, modern (als Stahl-Pergola aus `iron_bars` oder `polished_blackstone_wall` und Platten).

#### M5 – Außentreppe mit gemauerter Brüstung
Bei Kykladenhäusern wird das Dach oder Gewölbe eines Hauses zur Terrasse und oft zur Haustür des nächsten [50]. Treppen außen am Haus gehören zum Bild (Einschätzung, abgeleitet aus [50]).
- Blöcke: Laufstufen `smooth_quartz_stairs[facing=east,half=bottom]` (steigt nach Osten) in d=+1. Unter den Stufen Wandmaterial voll gefüllt. Brüstung in d=+2 als Wandblock, gestuft, oben mit `smooth_quartz_slab[type=bottom]`. Podest 2×2 vor der Obergeschoss- oder Dachtür.
```
Ansicht Süd (Treppe läuft an der Wand nach Osten), d=+1 Lauf, d=+2 Brüstung (vorne)
        x=0  1  2  3  4  5  6
y=5      .   .  .  .  .  S  S     S = smooth_quartz_slab[type=top] (Podest, Tür bei y=6 in d=0)
y=4      .   .  .  .  T  #  #     T = smooth_quartz_stairs[facing=east,half=bottom]
y=3      .   .  .  T  #  #  #     # = Wandmaterial (geschlossener Treppenkörper)
y=2      .   .  T  #  #  #  #
y=1      .   T  #  #  #  #  #     Brüstung d=+2: Wandblock je Stufe eine Lage höher, Kappe smooth_quartz_slab
```
- Wirkung mittel bis hoch, Aufwand mittel. Stile: mediterranean (Kykladen, Ligurien, Hacienda).

#### M6 – Kykladen-Kubus: gerundete Attika, Tonnengewölbe, Kuppel
Typisch sind Flachdächer, kubische Formen, geweißte Wände und blaue Kuppeln. Dazu Tonnengewölbe aus geweißtem Mauerwerk, dessen Front „as one continuous white curve“ wirkt [50][51]. Die Körper durchdringen einander [51].
- Gerundete Kante: Die oberste Lage der Brüstung ist eine Treppe nach innen, `smooth_quartz_stairs[facing=north,half=bottom]` an der Südkante. Die niedrige Hälfte zeigt nach außen und wirkt wie eine Rundung. Die Ecken setzt der Auflöser als `outer_*`.
- Tonnengewölbe (Achse in z), Frontansicht bei 5 Breite:
```
Ansicht Süd, Gewölbe über einem 5 breiten Raum (Wand y≤H)
         x=0  1  2  3  4
y=H+2     .   >  _  <  .     > = smooth_quartz_stairs[facing=east,half=bottom]
y=H+1     >   #  #  #  <     < = smooth_quartz_stairs[facing=west,half=bottom]
y=H       W   .  .  .  W     _ = smooth_quartz_slab[type=bottom] (Scheitel); # = smooth_quartz
          Lünette: y=H+1, x=2 als glass_pane in d=0 (halbrundes Oberlicht)
```
- Kuppel: Kugel aus der Geometriebibliothek, D=5, auf einem Tambour 5×5 aus Wandmaterial. Material `light_blue_concrete` (L54, h261, kein Material, Block vorhanden) oder kobaltblau `blue_concrete`. Nur Vollblöcke, das genügt bei D=5 (Einschätzung).
- Maße: Kubus 5–9 breit, 1 Geschoss mit FH 4. Ein zweiter Kubus versetzt auf dem ersten (Versatz ≥ 2) mit Dachterrasse. Überstand 0.
- Wirkung hoch, Aufwand mittel (Gewölbe als neuer Dachtyp `vault`, Kuppel vorhanden). Stile: mediterranean (Kykladen).

#### M7 – Vigas und Brüstung (Hacienda, Südwest-Spanisch)
Pueblo Revival: „projecting wooden roof beams or vigas“, gerundete Ecken, unregelmäßige Brüstungen, Wände in Erdtönen verputzt, gestufte Massen [41]. Spanish Colonial: „low-pitched clay tile, shed, or flat roofs“, viel glatter Putz, Arkaden [40].
```
Ansicht Süd, Flachdach mit Brüstung, Deckenlage y=H
y=H+2   c c c c c c c c c     c = mud_brick_slab[type=bottom] (Brüstungskappe), Ecken mud_brick_stairs
y=H+1   P P P P P P P P P     P = packed_mud (Brüstung, Wandmaterial)
y=H     W v W v W v W v W     v = stripped_spruce_log[axis=z] in d=+1 (Balkenkopf vor der Wand), alle 2 Blöcke
y=H-1   W W G W W W G W W     G = Fenster
        + 1–2 Wasserspeier: spruce_trapdoor[facing=south,half=top,open=false] in d=+1..+2 auf Brüstungshöhe
```
- Wirkung mittel, Aufwand niedrig (Regel in `buildTop` für Flachdach bei Variante Hacienda). Stile: mediterranean (Hacienda), rustic (Ranch).

#### M8 – Putzfasche und tiefe Laibung
Mediterrane Öffnungen sind schmal, auf der Nordseite fehlen sie oft ganz [49]. Die Wände wirken dick. Die Mediterranean Revival nennt „articulated door surrounds“ und Keilsteine [39]. Im Spiel ist die Wand nur 1 Block dick. Eine Fasche in d=+1 rund um das Glas erzeugt die Tiefe, auf farbigem Putz in Weiß (Ligurien, Provence), auf weißem Putz im Wandmaterial (Einschätzung).
```
Ansicht Süd, Fenster 1×2 (neue Vorlage M-W1)
        d=+1-Ebene            d=0-Ebene
y=2     F F F               W W W        F = smooth_quartz (Fasche; auf weißem Putz: Wandmaterial)
y=1     F . F               W G W        G = glass_pane
y=0     F . F               W G W        S = smooth_quartz_stairs[facing=north,half=top] (Sims)
y=-1    . S .               W W W        optional Läden: Falltür open in d=+1 bei x=-2 und x=+2
```
- Rhythmus: Achsabstand 3–4 Blöcke, Fenster 1×2 im Obergeschoss, 1×3 als Fenstertür im Erdgeschoss, über die Geschosse in einer Achse (Einschätzung, abgeleitet aus [39][42][49]).
- Wirkung hoch, Aufwand niedrig. Stile: mediterranean, medieval (Steingewände).

#### M9 – Reja (Fenstergitter) und Balconcino
Typisch sind „wood or wrought iron balconies with window grilles“ [39] und „decorative iron trim“ [40].
- Reja: `iron_bars` in d=+1 über die ganze Glasfläche. Oben eine kleine Haube `granite_stairs[facing=north,half=bottom]` in d=+1 (Ziegelvordach), unten ein Sims. Der Auflöser verbindet die Gitter mit den Scheiben (W17-Hinweis beachten: Glasblöcke statt Scheiben).
- Balconcino: Fenstertür 1×3 in d=0, davor `smooth_quartz_slab[type=top]` in d=+1 auf Bodenhöhe, Geländer `iron_bars` in d=+1 und eine Reihe höher, seitlich in d=+1.
- Später: `waxed_oxidized_copper_bars` (grün, ab 1.21.9 [23], nicht in Registry) für provenzalische Gitter.
- Wirkung mittel, Aufwand niedrig (Vorlagen). Stile: mediterranean (Hacienda, Ligurien), fantasy.

#### M10 – Turm (Colombaia, Belvedere)
Italianate kennt „belvedere or machicolated signorial towers“ und Kuppeln [42]. Der toskanische Bauernhaus-Turm ist eine Nachbildung davon (Einschätzung). Der Generator hat bereits einen eckigen Turm 5×5, ein Geschoss höher, mit Pyramidendach (`plan.ts`, `tower === 'square'`).
- Regeln: In der Variante Toskana ab large standardmäßig ein Turm in der Mitte der Rückseite oder an einer Ecke. Profil `shallow`, Überstand 1 mit Génoise. Im obersten Geschoss je Seite ein Rundbogen 3 breit (offene Loggia) oder eine Reihe kleiner Taubenlöcher (`air` in d=0 mit `granite_slab[type=top]` als Sitzbrett in d=+1).
- Wirkung hoch, Aufwand niedrig (Daten und Prior). Stile: mediterranean (Toskana, Ligurien).

#### M11 – Schornsteinkopf mit Haube
- Schaft im Wandmaterial 1×1 oder 2×1. Kopf: vier `granite_wall` (bzw. `mud_brick_wall`) als Eckpfosten, darauf `granite_slab[type=top]` oder zwei Treppen als kleines Satteldach. Rauch nur ohne Haube, sonst `campfire` weglassen (Einschätzung. Ob Rauch unter einer Platte sichtbar bleibt, im Spiel prüfen).
- Wirkung niedrig, Aufwand niedrig. Stile: mediterranean.

#### M12 – Zypresse und Olivenbaum
Zypressen haben eine „fastigiate crown … often less than a tenth as wide as the tree is tall“ und sind „a highly characteristic signature of Mediterranean landscapes“, gern als Allee [45].
```
Zypresse (Seitenansicht), Höhe 7–10       Olivenbaum (Seitenansicht), Krone 5×5×2
y=9   .  L  .                             y=5   . L L L .
y=4-8 .  L  .                             y=4   L L L L L      L = pale_oak_leaves[persistent=true] (1.21.11)
y=3   L  L  L    (Kreuz: nur 4 Nachbarn)  y=3   . . K . .          Ersatz 1.21.1: azalea_leaves
y=2   .  L  .                             y=2   . K . . .      K = dark_oak_log, schräg versetzt
y=1   .  S  .    S = spruce_log           y=1   . K . . .
Laub: spruce_leaves[persistent=true]      Krone flach und lückig (20–30 % Luft)
```
- Dichte: Zypressen in Reihen entlang des Wegs oder der Grundstücksgrenze, Abstand 3. Olive frei im Garten, 1–2 Stück ab medium (Einschätzung). `pale_oak_leaves` werden auch bei Schneefall nicht weiß [22], das passt zum Olivenbaum im Winter.
- Wirkung hoch, Aufwand niedrig. Stile: mediterranean, modern (Zypresse als Solitär).

#### M13 – Pflaster, Mauern, Töpfe
- Toskana und Provence: Weg aus `packed_mud`, `mud_bricks`, `terracotta` und `granite`. Terrasse aus `terracotta` (Cotto). Hacienda: Hof aus `terracotta` mit Bändern aus `mud_bricks`. Kykladen: `polished_andesite` mit weißen Fugen aus `calcite` oder `smooth_quartz_slab[type=bottom]` (Einschätzung). Der Wüstendorf-Weg im Spiel ist `smooth_sandstone` [14].
- Gartenmauer statt Hecke: 1–2 hoch aus Wandmaterial mit Kappe (`smooth_quartz_slab` oder `sandstone_wall`), darauf alle 2–3 Blöcke ein Topf.
- Töpfe: In Java lassen sich Blumen, Setzlinge, `cactus`, `dead_bush`, `bamboo` und Azaleen eintopfen [19]. Vorhanden: `potted_red_tulip`, `potted_white_tulip`, `potted_poppy`, `potted_dandelion`, `potted_azalea_bush`, `potted_flowering_azalea_bush`, `potted_fern`, `potted_bamboo`, `potted_oak_sapling`. Fehlend: `potted_allium`, `potted_orange_tulip`, `potted_cactus`, `potted_dead_bush`, `potted_acacia_sapling`, `potted_pale_oak_sapling` (alle nicht in Registry).
- `decorated_pot` (Amphore) ist eine Block-Entity, kann Gegenstände halten und hat die Zustände `facing`, `cracked` und `waterlogged` [20]. Leer und nur aus Ziegeln entspricht sie der Grundform. Sie fehlt in der Registry. Erst nach einem Import-Test verwenden.
- Azulejo-Band: `light_blue_glazed_terracotta` oder `white_glazed_terracotta` (nicht in Registry). `facing` bestimmt das Muster, 2×2-Gruppen bilden ein gemeinsames Bild [21]. Das Wüstendorf nutzt weiße, hellblaue und hellgrüne glasierte Keramik [14].
- Wirkung mittel, Aufwand niedrig. Stile: mediterranean.

### B. Modern

#### N1 – Versetzte Kuben und Auskragung (der wichtigste Hebel)
Moderne Häuser bestehen aus langen rechteckigen Volumen, auskragenden Geschossen, zurückgesetzten Eingängen und gestapelten Boxen. Ein Versatz von 1–3 Blöcken bringt Tiefe, ohne unruhig zu wirken [1][2]. International Style: „architecture as volume – thin planes or surfaces … as opposed to a solid mass“ und „regularity in the facade, as opposed to building symmetry“ [32]. Auskragung bedeutet, auf einer Seite fest und auf der anderen frei zu tragen [37]. Fallingwater ist das Vorbild.
- Regeln: Ab medium mindestens 2 Volumen. Versatz im Grundriss ≥ 2. Obergeschoss-Volumen um 2–4 auskragend, höchstens 1/3 seiner Länge (Einschätzung). Bei flachen Dachplatten gilt laut [5] eine Auskragung von etwa der dreifachen Bauteildicke. Auf der anderen Seite rückt das Obergeschoss zurück und lässt eine Dachterrasse frei.
- Ein Material pro Volumen: Unten weißer Putz, oben Holz oder dunkel. Der Wechsel liegt an der Geschossplatte (Einschätzung).
```
Ansicht Süd, large: unten 13 breit (x=0..12), oben 11 breit (x=4..14), Kragarm x=13..14
        x: 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14
y=10       . . . . a a a a a a a  a  a  a  a     a = Attika: Wandmaterial + smooth_quartz_slab[type=bottom] darauf
y=8..9     . . . . U G G G U G G  G  U  U  U     U = upperWall (spruce_planks bzw. polished_blackstone)
y=7        r r r r U G G G U G G  G  U  U  U     G = glass_pane raumhoch (3 hoch)
y=6        p p p p F F F F F F F  F  F  F  F     F = Geschossplatte light_gray_concrete, Kante in d=+1 smooth_quartz_slab[type=top]
y=5        W W W W W W W W W W W  W  L  .  .     r = glass_pane-Geländer der Terrasse, p = Terrassenboden (Dach des Unterbaus)
y=2..4     W G G G W W W W G G G  W  W  .  .     L = pearlescent_froglight[axis=y] im Wandkopf neben dem Kragarm
y=1        b b b b b b b b b b b  b  b  .  .     b = Schattenfuge polished_blackstone (Sockelzeile)
Unterseite Kragarm (y=6, x=13..14): smooth_quartz, darunter frei (keine Stütze)
```
- Wirkung sehr hoch, Aufwand hoch (Plan-Regel: neuer Massentyp „upper offset“ mit Rect je Geschoss). Stile: modern. Mit geneigtem Dach auch rustic und nordic.

#### N2 – Dachrand: dünne Attika oder Flugdach-Platte
Der Flachdachrand soll ein anderer Block sein als die Wand [6]: Stufen, Treppen als Rinne oder eine Brüstung. Eine Platte aus `smooth_quartz_slab` mit 1 Block Überstand gibt eine scharfe Schattenlinie [5]. „A flat roof with concrete slab overhangs (extending one block beyond the walls) is incredibly modern“ [2]. Das Flugdach ragt 3–4 Blöcke ohne Stützen aus und hat eine Kante aus Tiefenschiefer [5]. Überstand 1–2 „casts a shadow line“ [8].
```
Variante „Attika“ (Schnitt Süd)          Variante „Platte“ (Überstand 2–3)
       d=-1  d=0  d=+1                          d=-1 d=0 d=+1 d=+2 d=+3
y=H+1   .    k    .     k = smooth_quartz_slab[type=bottom]   y=H+1  s   s   s    s    s
y=H     d    W    .     W = Wandmaterial (KEIN Kontrastband)   y=H    d   L   .    .    .
y=H-1   .    W    .     d = Dachdeck smooth_stone_slab[type=top]  s = smooth_quartz_slab[type=top]
                        (oben Stufe: Schnee möglich [16])       L = pearlescent_froglight[axis=y] alle 3–4 Blöcke im Wandkopf
```
- Regeln: Der Kontrast liegt höchstens in einer halben Lage (Stufe). Kein Balkenring in `beam`. Die Platte liegt auf mindestens einer Seite (Gartenseite) ≥ 2 vor. An der Traufseite der Platte keine Girlande, sondern ein Lichtband (siehe Winter).
- Wirkung sehr hoch, Aufwand mittel (`roofEngine.ts`: neue Kante `flatEdge: 'parapet' | 'plate'`, Ring in `walls.ts:224` stilabhängig). Stile: modern, mediterranean (Kykladen mit M6-Kante), japanese (Platte).

#### N3 – Raumhohe Verglasung in Feldern
Mid-Century: „floor to ceiling windows“, „post and beam … walls seemingly made of glass“ [33]. Moderne Häuser brauchen viel Glas: raumhohe Glaswände, Glastüren, Glasgeländer. Fenster werden auf Achsen ausgerichtet, nicht verstreut [1]. Glasscheiben statt voller Glasblöcke [2].
- Bauweise: Glas `glass_pane` in d=0 über die ganze lichte Geschosshöhe (3). Oben und unten stehen die Geschossplatten in d=+1 als `smooth_quartz_slab`. Sprossen dünn mit `iron_bars` in d=0 alle 3 Felder (sie verbinden sich mit den Scheiben) statt Vollblock-Pfosten.
- Gegen den „Glaskasten“: höchstens 2 Glassysteme pro Haus, zum Beispiel raumhoch zum Garten und Band zur Straße. Glas auf der Gartenseite 35–60 % der Fassade, auf der Straßenseite ≤ 20 %. Neben jedem Glasfeld ein geschlossenes Feld aus dem Volumenmaterial im Rhythmus 3 Glas zu 2 geschlossen (Einschätzung).
- Leere Innenräume: Durch Glas sieht man leere Räume. Abhilfe: Obergeschoss in `light_gray_stained_glass_pane` oder `gray_stained_glass_pane`, keine Durchsicht durch zwei gegenüberliegende Glaswände, Rückwand im Holzton der Decke (Einschätzung).
```
Ansicht Süd, Feld 7 breit, Geschoss y=1..4 (Boden y=0, Decke y=4)
y=4   s s s s s s s s s     s = smooth_quartz_slab[type=bottom] in d=+1 (Deckenplatte)
y=3   W G G G I G G G W     G = glass_pane, I = iron_bars (Sprosse), W = Wand
y=2   W G G G I G G G W
y=1   W G G G I G G G W
y=0   t t t t t t t t t     t = smooth_quartz_slab[type=top] in d=+1 (Bodenplatte, Kante)
```
- Wirkung hoch, Aufwand niedrig (neue Vorlage, siehe Abschnitt f). Stile: modern.

#### N4 – Eckfenster ohne Pfosten
Am Fagus-Werk sind die Ecken ohne Stütze: „The corners are left without any support“ [34].
```
Draufsicht Ecke Südost, Geschosshöhe y=1..3
        x=9 10 11 12
z=7      .  .  .  W      G = glass_pane (der Auflöser verbindet die Eckzelle über Eck)
z=8      .  .  .  G      W = Wand, . = Innenraum
z=9      .  .  .  G      Ostwand = Spalte x=12, Südwand = Zeile z=10
z=10     W  G  G  G   ← Eckzelle (12,10) ist eine Scheibe, kein Pfosten
```
- Regeln: Je Seite 2–3 Glasfelder um die Ecke, Platten oben und unten laufen um die Ecke durch. Nie an der Ecke, an der ein Anbau anschließt.
- Wirkung hoch, Aufwand niedrig. Stile: modern (Bauhaus, Kubus).

#### N5 – Bandfenster (Bauhaus)
Le Corbusier: „horizontal windows (the ribbon window)“, freie Fassade, Pilotis, Dachgarten [31]. Bauhaus: „long banks of windows“, auskragende Balkone mit „flat, chunky railings“ [30].
- Band 1–2 hoch über 60–80 % der Fassadenbreite. `glass_pane` in d=0. Darunter ein durchgehender Sims `smooth_quartz_slab[type=top]` in d=+1, darüber `smooth_quartz_slab[type=bottom]` in d=+1. Dunkle dünne Rahmen nur an den Enden: `black_concrete` in d=0.
- Balkon im Bauhaus-Stil: geschlossene Brüstung aus Wandmaterial (1 hoch) statt Gitter, Platte in d=+1..+2.
- Wirkung mittel, Aufwand niedrig (W16 ohne Box als W16e). Stile: modern (Bauhaus).

#### N6 – Lamellen und Brise-soleil
Brise-soleil sind Lamellen, die hohe Sommersonne abhalten. Le Corbusier hat sie zum Kennzeichen der Moderne gemacht [35]. Mid-Century nutzt Lochsteinwände (Breeze Blocks) [36].
```
Ansicht und Draufsicht, Glasfeld 5 breit, senkrechte Lamellen in d=+1 alle 2 Spalten
Ansicht y=1..3:   W G f G f G W      f = spruce_trapdoor[facing=east,half=bottom,open=true] in d=+1
Draufsicht:  d=+1 . f . f .          (Brett steht senkrecht zur Fassade; Falltüren brauchen keinen Halt [25])
             d=0  G G G G G
Waagerechte Lamellen: iron_trapdoor[facing=north,half=top,open=false] in d=+1 über dem Fenster (Sonnendach)
Lochsteinwand (Mid-Century): waxed_copper_grate oder waxed_exposed_copper_grate als Wandfeld (Gittertextur, Einschätzung)
```
- Wirkung hoch, Aufwand niedrig (Vorlage). Stile: modern, japanese (Holzlamellen).

#### N7 – Holzverkleidung und Materialwechsel
Modern verträgt höchstens 3–4 Blocktypen [1], „stick to three maximum“ [2]. Helle Blöcke mit dunklen Akzenten [1], dazu ein Akzentmaterial [2]. Schwarz gebranntes Holz (Yakisugi) ist heute Fassadenverkleidung [38].
- Senkrechte Holzverkleidung: `stripped_spruce_log[axis=y]` oder `stripped_dark_oak_log[axis=y]`, die Maserung läuft senkrecht (braucht Lint-Änderung, siehe Empfehlungen). Waagerechte Bretter: `*_planks`.
- Schwarz: `dark_oak_planks` (L20), `polished_blackstone` (L21), `deepslate_tiles` (L23). Hell skandinavisch: `pale_oak_planks` (L88, fast neutral) und `stripped_pale_oak_log` (L95), nur 1.21.11, als Ersatz `birch_planks` (L72, gelblich).
- Sichtbeton: `light_gray_concrete` (L52). `smooth_stone` hat einen Rand in der Textur und wirkt gestapelt wie Fertigteilplatten (Einschätzung).
- Wirkung hoch, Aufwand niedrig (Paletten). Stile: modern, nordic.

#### N8 – Schattenfuge und Podest statt Treppenschürze
Das Fundament ist ein klares Podest, 1–2 Blöcke über dem Gelände [1]. Bündige Schattenfuge: Sockelzeile y=1 aus `polished_blackstone` oder `black_concrete` in d=0, davor eine Terrassenplatte `smooth_stone_slab[type=bottom]` in d=+1..+3. Keine Treppen-Schürze. Der Eingang rückt 1–2 zurück (Nische) mit einer Vordach-Platte darüber [1] (Einschätzung zur Umsetzung).
- Wirkung mittel, Aufwand niedrig (`walls.ts:113–121` stilabhängig). Stile: modern, japanese.

#### N9 – Pilotis, überdachte Terrasse, Carport
„Piloti“ ist der erste der fünf Punkte [31]. Im Spiel: Unter einem Obergeschoss-Volumen bleibt das Erdgeschoss in 1–2 Feldern offen, mit dünnen Stützen aus `white_concrete` (1×1) oder `polished_blackstone_wall`. Die Unterseite ist hell (`smooth_quartz`) mit eingelassenem Licht. Stützenabstand ≤ 5 (Einschätzung).
- Wirkung hoch, Aufwand mittel (Plan: Volumen mit `openGround`). Stile: modern (Bauhaus, Kubus).

#### N10 – Dachterrasse mit Glasgeländer
Flachdach als Terrasse ist der Dachgarten bei Le Corbusier [31]. Geländer aus Glasscheiben oder Eisengittern lassen den Raum durchfließen [1], ebenso Falltüren, Mauern oder `iron_bars` [7]. Terrassendach aus hellgrauem Beton mit weißer Brüstung, eingetopften Fichtensetzlingen und Seelaternen [5].
- `glass_pane` als Geländer auf dem Dachdeck (y+1), Boden `smooth_stone_slab[type=top]`, Pergola-Rahmen aus `polished_blackstone_wall` und `smooth_quartz_slab[type=top]`. Kübel: `potted_spruce_sapling` und `potted_bamboo`.
- Wirkung mittel, Aufwand niedrig. Stile: modern, mediterranean (Kykladen).

#### N11 – Eingelassenes Licht
Gedämpftes Licht kommt aus Laternen, Seelenlaternen oder versteckten Lichtblöcken hinter Stufen [1]. `sea_lantern` steht unter Stufen als eingelassene Beleuchtung [10]. `end_rod` gibt Licht 14, hält ohne Stütze und lässt sich in sechs Richtungen setzen [26].
- Regeln: Keine Hängelaternen an Ketten. Wandleuchte: `end_rod[facing=up]` auf einem Sims. Unterlicht: `pearlescent_froglight` (L90, warmweiß) im Wandkopf unter der Platte. Gartenleuchte: `end_rod[facing=up]` auf `polished_blackstone_wall` (1 hoch) statt Zaunpfahl. Optional `copper_lantern` (1.21.9, Licht 15, alle Oxidstufen [24], nicht in Registry).
- Wirkung mittel, Aufwand niedrig. Stile: modern.

#### N12 – Pult-, Schmetterlings- und Skandi-Satteldach
Das Pultdach ist eine einzige Fläche. Beispiele haben 1:1 und 2:1 [6]. Das Schmetterlingsdach ist „a dramatic V-shaped roof sometimes seen on modern buildings“ [6]. In [5] ist es aus Glattstein-Stufen und -Treppen gebaut, mit `polished_andesite` in der Kehle. „Flat sheds suit modern“ [8], „keep the angle shallow“ [2].
- Pult: Profil `shallow` (Δ 1), Anstieg ≤ 3, die hohe Seite zum Garten mit Oberlicht-Band (Clerestory, M-W5). Schmetterling: zwei Pultdächer mit gegenläufiger Neigung, die Kehle in der Mitte aus `polished_andesite_slab`. Skandi: Satteldach 45° (`standard`), Überstand 0, Dach und Wand fast gleich dunkel (`deepslate_tiles` über `dark_oak_planks`), Kante nur eine Stufe in `polished_deepslate` (Einschätzung).
- Wirkung hoch, Aufwand niedrig für Pult (Engine kann `shed`), mittel für Schmetterling. Stile: modern.

#### N13 – Moderner Garten und Pool
Moderne Häuser sind in Rechtecken und Quadraten gedacht [1]. „Negative space is your best tool“ [2].
- Regeln: rechteckige Rasenflächen, Trittplatten `smooth_stone_slab[type=bottom]` mit 1 Gras Abstand, Hecke als Kuben 1×1×1 oder 2×1×1 aus `oak_leaves[persistent=true]` statt Grundstückshecke, Solitärbaum (Zypresse M12 oder Birke).
- Pool: `water[level=0]` (nicht in Registry) als Fluid-Block ohne Block-Entity. Eine Quelle auf festem Boden mit festen Nachbarn bleibt stehen [18]. Regel: jede Wasserzelle mit festem Block darunter und an jeder Seite Wasser oder ein fester Block. Rand aus `smooth_quartz_slab[type=top]`. Winter: `packed_ice` statt Wasser, denn `ice` schmilzt bei Licht > 11, `packed_ice` nicht [17]. Villen-Vorlagen auf GrabCraft nutzen oft Wasserflächen (256 bzw. 41 „Still Water“) [27][29].
- Wirkung mittel, Aufwand mittel (Registry plus Validator-Regel). Stile: modern, mediterranean (Hof-Brunnen, Becken).

---

## a) Kennzeichen in echter Architektur und in Minecraft

**Mediterran.** Real: Rechteckplan mit 1–2 Geschossen, symmetrische Hauptfassade, Putz, rote Ziegel, Bogenfenster, Gitter und Höfe [39]. Spanisch mit L- oder Hofplan und Arkaden [40]. Toskana mit flachem Walmdach, Konsolen-Traufe, Turm und Loggia [42]. Provence nach Süden ausgerichtet, Satteldach, Nordseite geschlossen [49]. Kykladen mit weißen Kuben, Gewölben, Kuppeln und Terrassen auf dem Nachbardach [50][51][52]. In Minecraft gibt es Terrakotta nur als Vollblock. Dachtreppen kommen deshalb aus `granite`, `bricks`, `mud_bricks` oder `acacia`. Die Vanilla-Dörfer liefern Akazie mit oranger Terrakotta (Savanne) und Sandstein mit glasierter Keramik (Wüste) [14]. Textanleitungen sind dünn: „sandstone walls and a classic orange roof“ [13], orange und gelbe Terrakotta mit Ziegeltreppen [28]. Viele Regeln sind deshalb aus der echten Architektur übertragen und markiert.

**Modern.** Real: Ornamentlose Geometrie, Fensterbänder, auskragende Balkone [30], die fünf Punkte [31], Volumen statt Masse [32], Mid-Century mit raumhohem Glas und Pfosten-Riegel [33], Glasecke [34], Lamellen [35], Lochsteine [36], gebranntes Holz [38]. In Minecraft: heller Beton mit dunklen Akzenten, 3–4 Blöcke, viel Glas, Glas- oder Gittergeländer, Flachdach mit Stufen-Überstand, Podest [1][2]. „Every mistake shows“, negativer Raum ist ein Gestaltungsmittel [3]. Typische Textpaletten: weißer Beton, Schwarzeiche, Glasscheiben, Quarzstufen [11]. Brutalismus aus Glattstein, grauem Beton und Eisengittern [10].

## b) Untervarianten mit Erkennungsmerkmalen

| Stil | Variante | Erkennungsmerkmale (Generator) |
|---|---|---|
| mediterranean | **Toskana** | Walmdach `low`/`shallow` mit Génoise, Turm 5×5 mit Pyramidendach ab large, Loggia im Erdgeschoss, Putz in Ocker oder Pfirsich (`white_terracotta`), braune oder grüne Läden, Zypressenallee |
| | **Kykladen** | weiße Kuben, Flachdach mit gerundeter Kante (M6), Tonnengewölbe, Außentreppe, türkise Tür und Läden, gestapelte Kuben mit Terrassen, kein Überstand, kein Sockel |
| | **Hacienda** | L- oder U-Grundriss um einen Hof, Arkade zum Hof, flaches Ziegel-Sattel- oder Pultdach bzw. Flachdach mit Vigas (M7), Gitter, dunkles Holz, Sockelband `packed_mud` |
| | **Provence (Mas)** | Satteldach mit 2–3 Génoise-Reihen, Nordseite fast ohne Fenster, Läden in Salbeigrün oder Blau, Natursteinsockel, Platane oder Zypresse, Lavendel (`allium`) |
| | **Ligurien/Amalfi** | schmal und hoch (3–4 Geschosse, W 7–9), bunter Putz (gelb, rosa, orange), weiße Faschen (M8), grüne Läden, Loggia im obersten Geschoss, Balconcino |
| modern | **Bauhaus** | weißer Kubus, Bandfenster, Pilotis, Dachterrasse, Eckfenster, Attika, Schwarz nur als dünne Linie |
| | **Mid-Century** | 1 Geschoss, breit (W ≥ 15), Pult- oder Flachdach mit Überstand 2–3 und Holzuntersicht, Pfosten-Riegel-Glas, Steinwand (`tuff_bricks`), Akzenttür |
| | **Kubus-Minimal** | 2–3 versetzte Kuben, Kragarm 2–4, Flugdach-Platte, raumhohes Glas zum Garten, Lamellen, eingelassenes Licht |
| | **Skandi-Schwarz** | Satteldach 45° ohne Überstand, schwarzes Holz, Dach fast im Wandton, großes Giebelglas, helle Holzlaibungen |
| | **Beton und Holz** | Sichtbeton-Sockelgeschoss, Holzkubus darauf, Kupferakzent, Pult- oder Flachdach |

## c) Paletten (je 5, nach unseren Rollen, mit Gewichten)

Alle Einträge sind Material-IDs aus `materials.ts`. **Neu** heißt: Das Material muss angelegt werden (der Block ist in der Registry). Geprüft sind ΔL Wand↔Rahmen/Dach ≥ 15 und 3–5 Familien laut `lints.ts`. „Stilgewicht“ ist die vorgeschlagene Wahrscheinlichkeit der Palette.

**Mediterran**

| Rolle | Me1 Toskana (0,30) | Me2 Kykladen (0,20) | Me3 Hacienda (0,20) | Me4 Provence (0,20) | Me5 Ligurien (0,10) |
|---|---|---|---|---|---|
| plinth | tuff_bricks 2, polished_granite 1 | smooth_quartz | packed_mud | sandstone | polished_andesite |
| wall | white_terracotta | white_concrete 2, calcite 1 | calcite | white_terracotta 2, smooth_sandstone 1 | **yellow_terracotta** 2, orange_terracotta 1, **pink_terracotta** 1, white_terracotta 1 |
| upperWall | = wall | = wall | = wall | = wall | = wall (gekoppelt, siehe Empfehlung 6) |
| infill | white_terracotta | white_concrete | calcite | white_terracotta | = wall |
| frame | stripped_spruce_log | warped_planks | stripped_dark_oak_log | smooth_sandstone | smooth_quartz |
| beam | stripped_spruce_log | smooth_quartz | dark_oak_log (Vigas) | spruce_planks | smooth_quartz |
| roof | granite 2, bricks 1 (+ Mischung M2) | smooth_quartz (Flach/Gewölbe) | bricks 2, mud_bricks 1 | granite 2, bricks 1 | bricks 2, granite 1 |
| roofTrim | bricks | smooth_quartz | mud_bricks | bricks | smooth_quartz |
| ridge | bricks | smooth_quartz | bricks | bricks | bricks |
| soffit | granite (Génoise) | smooth_quartz | dark_oak_planks | granite (Génoise) | smooth_quartz |
| window | glass | glass | glass | glass | glass |
| shutter | spruce_planks 2, waxed_weathered_cut_copper 1 | warped_planks | dark_oak_planks | waxed_weathered_cut_copper 2, warped_planks 1 | waxed_weathered_cut_copper |
| door | spruce_planks | warped_planks | dark_oak_planks | waxed_weathered_cut_copper 1, oak_planks 1 | spruce_planks |
| floor | terracotta | polished_diorite | terracotta | terracotta | terracotta |
| path | packed_mud | polished_andesite | terracotta | sandstone | polished_andesite |
| chimney | white_terracotta | white_concrete | calcite | white_terracotta | = wall |
| accent | terracotta | **light_blue_concrete** (Kuppel) | terracotta | terracotta | white_terracotta |
| ΔL Wand↔Rahmen | 35 | 45 | 64 | 11 (Dach 27) | 32 |
| Familien | 5 | 3 | 5 | 5 | 4 |

Anmerkungen: Me2 und Me3 haben helle Wände mit Dach ≥ L40, das gibt nur eine Lint-Warnung. Bei Me2 kommt der Kontrast über Rahmen und Kuppel. `waxed_weathered_cut_copper` (C25,5, h140) ergibt Salbeigrün für Läden und Türen. Ob die Kupfer-Falltür-Textur als Laden wirkt, muss im Spiel geprüft werden (Einschätzung). `warped_planks` bleibt nur als Türkis, weil es kein blaues Holz gibt. Die gemessenen Werte stützen die Wahl der Wandfarben: `white_terracotta` L75/C15,5/h55 (Pfirsich, warmer Putz), `yellow_terracotta` L59/C58 (Ocker), `pink_terracotta` L44/C38 (Rosé).

**Modern**

| Rolle | Mo1 Bauhaus-Weiß (0,25) | Mo2 Mid-Century (0,20) | Mo3 Skandi-Schwarz (0,15) | Mo4 Beton und Holz (0,20) | Mo5 Schwarz-Weiß (0,20) |
|---|---|---|---|---|---|
| plinth | polished_deepslate 2, polished_andesite 1 | polished_tuff | polished_andesite | polished_deepslate | polished_blackstone |
| wall | white_concrete | white_concrete 2, calcite 1 | dark_oak_planks 2, polished_blackstone 1 | light_gray_concrete | smooth_quartz 2, calcite 1 |
| upperWall | white_concrete | spruce_planks | = wall | oak_planks | polished_blackstone |
| infill | white_concrete | tuff_bricks (Steinwand) | = wall | light_gray_concrete | smooth_quartz |
| frame | black_concrete | stripped_dark_oak_log* | stripped_birch_log* | black_concrete | polished_blackstone |
| beam | white_concrete | stripped_dark_oak_log* | stripped_dark_oak_log* | black_concrete | polished_blackstone |
| roof | smooth_stone 2, polished_andesite 1** | polished_deepslate | deepslate_tiles | smooth_stone** | polished_blackstone |
| roofTrim | smooth_quartz | dark_oak_planks | polished_deepslate | smooth_stone | smooth_quartz |
| ridge | smooth_quartz | dark_oak_planks | polished_deepslate | smooth_stone | smooth_quartz |
| soffit | smooth_quartz | spruce_planks | dark_oak_planks | oak_planks | oak_planks |
| window | glass | glass | glass | glass 2, gray_stained_glass 1 | glass 2, tinted_glass 1 |
| shutter | iron | spruce_planks | dark_oak_planks | iron | iron |
| door | iron | dark_oak_planks 2, acacia_planks 1 | spruce_planks | iron | iron |
| floor | smooth_stone | spruce_planks | birch_planks | oak_planks | smooth_quartz |
| path | smooth_stone | polished_tuff | smooth_stone | smooth_stone | polished_andesite |
| chimney | white_concrete | tuff_bricks | polished_blackstone | gray_concrete | polished_blackstone |
| accent | black_concrete | waxed_oxidized_cut_copper | birch_planks | waxed_cut_copper | waxed_weathered_cut_copper |
| ΔL Wand↔Rahmen | 82 | 60 | 53 | 49 | 71 |
| Familien | 5 | 5 | 4–5 | 5 | 3–4 |

\* Braucht die Lint-Änderung: `log` aus `modern.forbidden` entfernen, nur Stämme mit Rinde verbieten. Ohne Änderung `dark_oak_planks` bzw. `birch_planks` nehmen, dann setzt `pillar` aber Rindenstämme. Unter 1.21.11 kann Mo3 hell mit `pale_oak_planks` und `stripped_pale_oak_log` gebaut werden, sobald ein Versions-Ersatz besteht (`pale_oak` → `birch`).
\*\* `smooth_stone` hat keine eigene Treppe. Das genügt, solange Modern nur `flat` hat. Bei Pult- oder Satteldach `polished_andesite` nehmen (Lint „Dachmaterial ohne eigene Treppe“).
Mo4: Die Variante `upperWall: spruce_planks` braucht `soffit: spruce_planks`, sonst gibt es 6 Familien.

## d) Proportionen je Größe

| | Mediterran | Modern |
|---|---|---|
| small | 9×7, 1 Geschoss, FH 5 (Kykladen 7×7 Kubus FH 4 plus Gewölbe) | 11×7 plus Eingangskubus 5×5, 1 Geschoss, FH 4 |
| medium | 13×9, 2 Geschosse, Loggia 3 Joche oder Pergola | 13×9 unten, oben 9×9 um 3 versetzt, 2 Geschosse |
| large | 15×11 plus Flügel 9×7 (1 Geschoss), Turm 5×5 (+1 Geschoss) | unten 17×11, oben 11×9 mit Kragarm 2–3, Dachterrasse |
| huge | U um Hof, 21×17, 2 Geschosse, Hof-Arkade | 3 Volumen (21×13 + 11×9 + 7×7), Pilotis-Feld, Pool |
| Geschosshöhe | 5 (Toskana, Hacienda), 4 (Kykladen, Ligurien 4–5) | 4 (3 lichte Höhe [2]), 5 für raumhohes Wohnen |
| Dachneigung | `low` (≈ 18°) oder `shallow` (26,6°), Anstieg ≤ 4. Real ≥ 30 % [47] | flach. Pult `shallow` mit Anstieg ≤ 3. Skandi 45° |
| Überstand | 2 mit Génoise (1 ohne). Kykladen 0 | Attika 0 oder Platte 2–3 (1 [2], 3–4 Flugdach [5]) |
| Sockel | Toskana und Provence 1 (Stein, ohne Schürze), Hacienda 1 (Farbband), Kykladen 0 | 1 als Schattenfuge oder Podest 1–2 über dem Gelände [1] |
| Fenster | 1×2 bzw. 1×3, Achsabstand 3–4, Öffnungsanteil ≤ 15 % (Einschätzung) | Garten 35–60 %, Straße ≤ 20 % (Einschätzung). Fenster mindestens 2×2 [4] |

Die Maße folgen der Faustregel 1 Block ≈ 1 m (Einschätzung). Ein toskanisches Bauernhaus mit 2 Geschossen und etwa 12×9 m Grundfläche entspricht 13×9.

## e) Dachformen und -profile

- **Mediterran:** Walm `low` (Toskana, nur bei W ≥ D+4), Sattel `low` (Provence, Ligurien), Pult `shallow` über Loggia oder Anbau, Flachdach mit Brüstung (Hacienda, Kykladen), Gewölbe `vault` (neu, M6), Kuppel (vorhanden), Pyramide `shallow` auf dem Turm. Traufe mit Génoise (M1), First als Stufe aus `bricks`. Vorschlag für die Prioren: `hip 0.35, gable 0.35, flat 0.15, shed 0.05, vault 0.10`. Profile: `low 0.5, shallow 0.4, standard 0.1`.
- **Modern:** Flachdach mit dünner Attika (N2), Flugdach-Platte (N2), versetzte Kuben mit eigenen Flachdächern auf verschiedenen Höhen (N1), Pult (N12), Schmetterling (N12, neu), Skandi-Satteldach ohne Überstand (N12), Sägezahn nur bei huge (Einschätzung). Vorschlag für die Prioren: `flat 0.65, shed 0.2, gable 0.1 (nur Skandi), butterfly 0.05`.

## f) Fenster- und Türtypen

| Stil | Bestehend (behalten oder ändern) | Neu |
|---|---|---|
| mediterranean | **W17/W17b** behalten, Läden aus der Palette statt fest warped. **W04** behalten. **W05b** (Töpfe auf dem Sims) statt W05 (Moos-Kasten ist alpin). **W07b** für den Turm. **T04** Rundbogen-Nische. **T05b** Plattenvordach statt T05 (Falltür-Markise) | **M-W1** Putzfasche (M8). **M-W2** Reja (M9). **M-W3** Balconcino (M9). **M-W4** Taubenloch-Reihe (Turm). **M-T1** Zaguán: Doppeltür 2 breit, Rundbogen 4 breit in d=+1 aus `smooth_quartz` mit Schlussstein `chiseled_sandstone`, Oberlicht `glass_pane`. **M-T2** Kykladen-Tür: T01 ohne Laternen, Rahmen aus der Rolle `frame` (Türkis), Stufe aus `smooth_quartz_slab` |
| modern | **W01** (Lochfenster mit Platten) behalten. **W16** höchstens 1× pro Fassade als „Bilderrahmen“. **T01** ohne Hängelaternen (`end_rod` daneben) | **N-W1** raumhoch (N3). **N-W2** Eckfenster (N4). **N-W3** Bandfenster ohne Box (N5, „W16e“). **N-W4** Lamellen (N6). **N-W5** Oberlicht-Band 1 hoch unter der Dachplatte. **N-W6** Schlitzfenster 1×3 senkrecht (Treppenhaus). **N-T1** Glasportal: Tür plus 1–2 raumhohe Seitenscheiben plus Oberlicht, 1–2 Blöcke zurückgesetzt (d=−1), darüber eine Vordach-Platte `smooth_quartz_slab[type=top]` in d=0..+2 ohne Stützen. **N-T2** Schiebefront: 3–5 breit, 2 hoch `glass_pane` mit `iron_door` in der Mitte |

**Gegen die Glaskasten-Langeweile** (Regeln für den Fassaden-Zusammenbau):
1. Glas immer zwischen horizontalen Platten in d=+1. Sie bilden die Linie, das Glas bildet die Fläche [31][32] (Einschätzung zur Umsetzung).
2. Höchstens 2 Glassysteme pro Haus, ein drittes nur als 1-hohes Oberlicht.
3. Glasfelder wechseln mit geschlossenen Feldern aus dem Volumenmaterial im Takt 3:2. Kein Glas über die ganze Fassade auf mehr als einer Seite.
4. Mindestens ein Schattenspender pro Glasfront: Platte ≥ 2, Lamellen oder Rücksprung.
5. Sprossen dünn (`iron_bars`), Vollblock-Pfosten nur an Volumen-Ecken.
6. Fenster in Achsen über die Geschosse ausrichten [1]. Gruppen statt Raster, zum Beispiel „three windows spaced one block apart“ [2].
7. Leere Innenräume nicht durch zwei Glaswände hindurch zeigen. Obere Glasfelder getönt.

## g) Signatur-Details

- **Mediterran:** Génoise (M1). Ziegel-Mischdach (M2). Arkade oder Loggia (M3). Pergola mit pinkem Bewuchs (M4). Außentreppe (M5). Gerundete weiße Kante und blaue Kuppel (M6). Vigas (M7). Weiße Faschen auf farbigem Putz (M8). Reja und Balconcino (M9). Turm (M10). Schornsteinhaube (M11). Zypressenreihe (M12). Töpfe auf Mauerkronen, Treppen und Simsen (M13), mit 1 Topf je 2–3 Blöcke Mauerlänge (Einschätzung). Über Türen eine Ziegelhaube aus 3 `granite_stairs[half=bottom]` statt einer Platte.
- **Modern:** Kragarm mit beleuchteter Unterseite (N1, N11). Platte mit Schattenlinie (N2). Raumhohes Glas zwischen Platten (N3). Glasecke (N4). Band (N5). Lamellen (N6). Holzkubus auf weißem Sockel (N7). Schattenfuge (N8). Pilotis (N9). Glasgeländer auf der Dachterrasse (N10). Schmetterlingsdach (N12). Wasserfläche (N13). Ein einziger Farbakzent pro Haus: Tür in `acacia` (Mid-Century) oder Kupfer (Einschätzung).

## h) Deko und Umgebung

| | Mediterran | Modern |
|---|---|---|
| Bäume | Zypressen (M12) als Reihe am Weg, Abstand 3. Olive als Solitär. Kübel-Zitrus als `potted_azalea_bush` (Einschätzung) | Zypresse oder Birke als Solitär, Kugel- und Kastenhecken |
| Einfassung | Gartenmauer aus Wandmaterial 1–2 hoch mit Kappe, Tor aus `spruce_fence_gate` | keine Grundstückshecke, nur Kanten aus `smooth_stone_slab` |
| Wege | Cotto, Lehm, Granit (M13). Hof mit Brunnen: `water_cauldron[level=3]` (nicht in Registry, keine Block-Entity) oder ein Becken aus `water` | Trittplatten mit Grasfuge, Weg in gerader Linie mit 90°-Knick |
| Pool | „Pool“ heißt Hofbecken 3×5 mit Rand aus `smooth_sandstone_slab[type=top]` | Pool 3×7 parallel zur Glasfront, Rand `smooth_quartz_slab[type=top]` |
| Pflanzen | `allium` (Lavendel), `red_tulip`, `poppy`, `pink_petals`, `vine` an Pergola und Mauer, `flowering_azalea_leaves` | `short_grass`, `fern`, `potted_bamboo`, `moss_carpet` in Beeten |
| Licht | `lantern` hängend in den Arkaden, stehend auf Mauerpfeilern | eingelassen (N11), `end_rod` auf `polished_blackstone_wall` |

Wasser geht also technisch [18]. Heute steht es in `parseDescription.ts:404, 440` als nicht umsetzbar. Nach dem Einbau mit Validator-Regel (dichtes Becken) kann die Sperre für „Pool“ und „Brunnen“ fallen.

## i) Winter- und Weihnachtsvariante

**Grundregeln (beide Stile):** Schnee nur auf voller Oberseite: Vollblock, obere Stufe, Kopfüber-Treppe [16]. Er schmilzt bei Blocklicht ≥ 12. Eine Kerze gibt Licht 3, vier Kerzen 12 [16]. `ice` schmilzt bei Licht > 11, `packed_ice` nicht [17].

**Mediterran Winter:** Bergdorf-Lesart (Toskana, Apennin, Provence). Schnee liegt auf Mauerkronen, Brüstungen, Turmpyramiden-Rändern, Pergola-Balken (obere Seite voll) und Simsen. Auf Ziegel-Treppen hält er nicht. Gefrorenes Hofbecken aus `packed_ice`. Olivenbäume mit `pale_oak_leaves` bleiben grau [22]. Warmes Licht in Loggia und Arkaden (`lantern`, `ochre_froglight` in der Loggia-Decke, mindestens 3 Blöcke Abstand zum Schnee). Kykladen im Schnee: Weiß auf Weiß verliert die Form. Deshalb nur 1 Schneeschicht und die türkisen Rahmen betonen (Einschätzung).
**Mediterran Weihnachten:** Farolitos oder Luminarias stehen „in rows along walls, roofs, and walkways“, besonders an Heiligabend, mit Tradition in New Mexico und spanisch geprägten Regionen [46]. Im Spiel: `white_candle[candles=2,lit=true]` alle 2 Blöcke auf Brüstungskappen, Mauerkronen und Treppenpodesten. Höchstens 3 Kerzen, wenn Schnee in der Nähe liegt. Girlande aus `pale_oak_leaves` (Olive) oder `oak_leaves` mit `ochre_froglight` statt Fichte. Schleifen sparsam: eine je Bogen im Arkadenscheitel. Kranz an der Tür aus `azalea_leaves` mit `red_tulip`-Töpfen beidseitig (Einschätzung). Das griechische Weihnachtsschiff (Karavaki) passt als Blockskulptur in den Hof (Einschätzung, Quelle nicht abrufbar).

**Modern Winter:** Flachdächer, Platten und Kragarme sind die besten Schneeflächen, aber nur mit Deck `smooth_stone_slab[type=top]` statt der heutigen unteren Stufe (`roofEngine.ts:254`). Kein Schnee direkt auf Froglights. Die Lichtzeile liegt im Wandkopf unter der Platte, der Validator hält den Abstand. Pool wird `packed_ice`. Dunkle Volumen (Skandi, Schwarz-Weiß) zeigen den Schnee am stärksten (Einschätzung).
**Modern Weihnachten:** Ein warmweißes Lichtband aus `pearlescent_froglight` im Wandkopf entlang der Platte statt einer Fichtengirlande mit roten Wollblöcken. Ein Baum: `potted_spruce_sapling` neben der Tür oder ein kleiner Weihnachtsbaum auf der Dachterrasse hinter dem Glasgeländer. Kranz nur an der Tür, ohne Schleife oder mit einer. Kerzen auf den Simsen der Lochfenster (W01), keine an raumhohem Glas. Geschenke in Weiß, Grau und Kupfer statt bunt (Einschätzung). Keine Hängelaternen an Ketten.

## j) Was die Stile kaputt macht

**Mediterran:**
- Graues Steinziegel-Fundament mit Treppenschürze, dunkles Holzband unter der Traufe, Fachwerk. Das macht das Haus mittelalterlich.
- Dicke weiße Trim-Traufe aus zwei Lagen statt einer ziegelfarbenen Génoise.
- Steile Dächer über 45° und Pyramiden auf fast quadratischem Grundriss. Bei Gebäuden über etwa 15×15 fehlen mehrere Dachabschnitte [54].
- Moos-Blumenkästen, Fichtenvorbau auf Zaunpfosten, Eichenhecke. Das wirkt alpin oder rustikal.
- Kühles und warmes Weiß in einem Haus, Warped-Schnörkel-Läden auf großer Fläche.
- Kein Außenraum: Die Box steht ohne Loggia, Terrasse, Pergola oder Treppe im Rasen.
- Zu viele Farben: Ligurien hat bunt, aber pro Haus genau **eine** Putzfarbe, Weiß für Faschen und Grün für Läden (Einschätzung).

**Modern, und wie man die langweilige Kiste vermeidet:**
- Eine einzige symmetrische Kiste mit Lochfenstern. Der häufigste Fehler ist ein zu regelmäßiges und symmetrisches Volumen. Gute Silhouetten haben Rhythmus und Dachkanten auf verschiedenen Höhen [4]. Gegenmittel: N1 (≥ 2 Volumen, Versatz ≥ 2, Kragarm 2–4), N2 (Platte ≥ 2 auf einer Seite), N3 und N4 (Glas in Feldern, Ecke offen), N6 (Lamellen), N8 und N9 (Schatten unten).
- Dunkle Kontrastbänder überall und Rahmenboxen um jedes Fenster. Das ist das Gegenteil von „volume over mass“ [32].
- Fünf und mehr Blocktypen. „Some deepslate + some oak“ ist „not modern“ [1]. Alles dekorieren: „If every surface is covered with details … it looks cluttered“ [2].
- Rustikale Bauteile: Zaunpfosten, Hängelaternen, Fichtenveranda, Bruchstein, Treppenschürze, Lagerfeuer-Schornstein.
- Steile Satteldächer mit Treppenüberstand (außer Skandi) [1].
- Glas ohne Schatten und ohne geschlossene Gegenflächen. Das ergibt einen Glaskasten, der leere Räume zeigt.
- Fehler sieht man sofort: „There's nowhere to hide a misplaced block or uneven spacing“ [3]. Achsen, Abstände und Plattenkanten müssen exakt durchlaufen.

## k) Bewertung der aktuellen Stile und konkrete Änderungen

| Aspekt | Heute | Soll (Recherche) | Änderung |
|---|---|---|---|
| modern Massen | 1 Kiste (`styles.ts:243`, `resolveInput.ts:98`) | ≥ 2 versetzte Volumen [1][32] | `symmetric: false`, neue Plan-Regel N1 |
| modern Dachkante | Balkenring plus Trim-Block plus Stufe (`walls.ts:224`, `roofEngine.ts:252`) | dünne Attika oder Platte [2][5] | `flatEdge`, Balkenring stilabhängig |
| modern Überstand | `[0, 1]` | Platte 2–3 | `overhang: [0, 3]`, Platte nur bei `flatEdge: plate` |
| modern Fenster | W16 und W01 | raumhoch, Eck, Band, Lamellen | Vorlagen N-W1..N-W6, `windows: ['N-W1','N-W3','W01','N-W4']` |
| modern Tür | T01 mit Hängelaternen | Glasportal mit Platte | N-T1, Laterne `end_rod` |
| modern Licht | `lantern`, Zaunpfahl-Leuchten | eingelassen [1][26] | Stil-Feld `lightKit: 'recessed'` in landscape und doors |
| modern Sockel | Treppenschürze | Podest oder Schattenfuge [1] | `plinthApron: false` je Stil |
| modern Dachtypen | nur `flat` | flat, shed, butterfly, Skandi-gable | `ROOF_TYPES` um `shed` und `butterfly` erweitern |
| modern Lints | `forbidden: ['log', …]` | entrindete Stämme erlaubt | Verbot auf Rindenstämme begrenzen |
| med Dach | `bricks`, 45°/shallow, weiße Trim-Traufe | Mischdach, `low`, Génoise [47][48] | Profil `low`, `soffit: 'genoise'`, Palette |
| med Grundriss | 7×7 und 13×11, Walm 0,5 | Rechteck, Walm nur W ≥ D+4, Flügel und Turm | Größen ändern (d), Walm-Regel in `roofTypeFor` (`plan.ts:186`) |
| med Außenraum | nur Pult-Vorbau | Loggia, Pergola, Treppe, Hof [43][44] | Bauteile M3–M5, `details.loggia/pergola/stair` |
| med Sockel | `stone_bricks` plus Schürze | Stein ohne Schürze oder 0 | Paletten, `plinthApron: false` |
| med Läden | `warped_planks` fest | variantenabhängig (braun, grün, türkis) | Paletten Me1–Me5 |
| med Akzent | ungenutzt | Kuppel, Azulejo-Band, Töpfe | Rolle `accent` in Kuppel und Bandvorlage nutzen |
| Umgebung | Eichenhecke, Tulpen | Zypressen, Olive, Mauer, Töpfe / modern Kuben-Hecken | `landscape.ts` stilabhängig |
| Festschicht | überall Fichte und Rot | Farolitos und Olive / Lichtband | `festive.ts` mit Stil-Kit |

---

## Fehler, die Profis vermeiden

1. **Ein Block für alles** und **Paletten-Chaos**. Profis bleiben bei 3–5 Blöcken mit Hierarchie, bei Modern 3–4 [1][2][9].
2. **Flache Dächer ohne Kante:** Der Rand ist immer ein anderer Block [6], sonst wirkt das Dach „stuck on“ [8].
3. **Fenster zufällig verteilt:** Fenster liegen in Achsen oder bewussten Gruppen [1][2][4].
4. **Glas ohne Tiefe:** Fenster 1 Block zurücksetzen oder einen Rahmen davor stellen [9]. Bei unserer 1 Block dicken Wand heißt das: Platte oder Fasche in d=+1.
5. **Symmetrie als Ersatz für Komposition:** Bei Modern ist Regelmäßigkeit wichtiger als Symmetrie [32]. Mediterran darf die Hauptfassade symmetrisch sein [39], der Gesamtbau ist trotzdem asymmetrisch (Turm, Flügel) [42].
6. **Biom- und Materialfremdheit:** Sandstein und Akazie gehören in die Savanne [9]. Mediterran nicht mit Bruchstein und Moos bauen. Diese Blöcke sind im Stil bereits verboten, gut so.
7. **Überdekoration:** „Negative space is your best tool“ [2]. Beim Mediterran sind Töpfe gut, aber in Reihen und an Kanten, nicht überall.
8. **Licht, das Schnee frisst:** keine Lichtquelle ≥ 12 neben Schnee oder Eis [16][17].
9. **Fluid ohne Becken:** Wasser fließt bis 7 Blöcke weit [18]. Jede Wasserzelle braucht festen Boden und dichte Ränder.

---

## Empfehlungen für den Generator

Priorität 1 hat die größte Wirkung. „Daten“ heißt Stil- oder Palettendaten, „Regel“ heißt Generator-Code.

1. **Versetzte Kuben für Modern.** Modul `plan.ts` (neuer Massentyp `upper` mit eigenem Rect und Kragarm), `resolveInput.ts:79/98` (Regel), `styles.ts:243` (`symmetric: false`, Daten). Regel: Ab medium mindestens 2 Volumen, Versatz ≥ 2, Kragarm 2–4 (≤ 1/3 der Länge), freie Dachfläche wird Terrasse mit Glasgeländer.
   *Akzeptanz:* In 100 Seeds je Größe ≥ medium hat jedes Modern-Haus ≥ 2 Massen mit unterschiedlichen Rects oder Höhen. Kein Lint „schwebend“ oder „flache-wand“. Mindestens 1 Kragarm ≥ 2 ab large.
2. **Dünne Dachkante und Platte.** `walls.ts:217–224` (Ring aus `beam` nur bei `frames = true`, sonst Wandmaterial), `roofEngine.ts:252–256` (neu `flatEdge: 'parapet' | 'plate'`, Deck als obere Stufe im Thema Winter), `styles.ts:239` (Überstand 0–3). Regel plus Daten.
   *Akzeptanz:* Über der obersten Fensterzeile liegen höchstens 1,5 Blöcke Kontrastmaterial. Bei `plate` steht die Platte auf ≥ 1 Seite ≥ 2 vor. Schnee bleibt im Winter auf dem Deck liegen (0 Validator-Reparaturen).
3. **Neue Modern-Vorlagen und Fassadenregeln.** `templates/windows.ts`, `templates/doors.ts` (N-W1..N-W6, N-T1, N-T2) als Daten. `openings.ts` (Regel: höchstens 2 Glassysteme, W16 höchstens 1× pro Fassade, Glasanteil Garten 35–60 %). `styles.ts:246–248`: Fenster-Liste, `lantern` → Licht-Kit.
   *Akzeptanz:* Gemessener Glasanteil der Gartenfassade 35–60 %, Straßenseite ≤ 20 %. Keine Hängelaternen und keine Zaunpfähle in Modern-Modellen.
4. **Mediterranes Dach: Génoise, Profil `low`, Mischung.** `roof/profiles.ts` (neues Profil `low` = Δ 1,1,0 …, Daten plus Regel), `roofEngine.ts` (Untersicht-Variante `genoise` mit 2 Reihen, Zellmischung für die Rolle `roof` über eine Liste gleichwertiger Treppen), `palettes.ts` (Me1–Me5). In `plan.ts:186` Walm nur, wenn W ≥ D+4, sonst Satteldach.
   *Akzeptanz:* Keine Traufe in `smooth_quartz` oder `sandstone` bei Toskana und Provence. Anstieg ≤ 4. Auf großen Dachflächen ≥ 2 Treppenmaterialien, Anteil des zweiten 20–40 %. Kein Pyramidendach auf dem Hauptkörper bei W − D < 4.
5. **Mediterranes Draußen-Wohnen als Bauteile.** `components.ts` und `plan.ts`: Loggia oder Arkade (M3, Rücksprung 2–3), Pergola (M4), Außentreppe (M5), Turm-Prior ab large (M10). `styles.ts:276`: neue `details` `loggia`, `pergola`, `stair`. Regel plus Daten.
   *Akzeptanz:* Jedes Mediterran-Haus ab medium hat ≥ 1 Außenraum-Element. Bei Toskana large in ≥ 60 % der Seeds ein Turm. Lint „flache-wand“ bleibt grün.
6. **Paletten und Materialien ersetzen.** `palettes.ts:398–489` durch Me1–Me5 und Mo1–Mo5 (Daten). `materials.ts:135–156`: neu `yellow_terracotta`, `pink_terracotta`, `light_blue_concrete`, `blue_concrete` (Ersatzformen: `granite`, `bricks`, `warped_planks`). Paletten-Gewichte im Stil. Kopplung `upperWall = wall` als Palettenflag (`sameAs: 'wall'`), damit Ligurien nicht zwei Putzfarben bekommt. `styles.ts:250` und `lints.ts:46`: `log`-Verbot nur für Rindenstämme. `lints.ts:77`: Versions-Ersatz erlauben (`pale_oak` → `birch` in 1.21.1).
   *Akzeptanz:* `lintAllStyles()` ohne Fehler. Jede Palette hat 3–5 Familien. Mo3 baut in 1.21.11 mit `pale_oak` und in 1.21.1 mit `birch`.
7. **Sockel, Vorbau und Licht stilabhängig.** `walls.ts:113–121` (Treppenschürze per Stil-Flag `plinthApron`), `components.ts:112–121` (Modern: Platte ohne Pfosten; Mediterran: Pergola oder Loggia statt Pultvorbau), `landscape.ts:119ff` (Licht-Kit `recessed`: `end_rod` auf `polished_blackstone_wall`). Daten plus Regel.
   *Akzeptanz:* Modern- und Kykladen-Modelle enthalten keine `*_fence` als Pfosten und keine Treppenschürze. Toskana hat die Schürze nur aus `tuff_bricks`.
8. **Stilabhängige Umgebung.** `landscape.ts:32–52, 108`: Mediterran mit Zypressen (M12), Olive (`pale_oak_leaves`, Ersatz `azalea_leaves`), Gartenmauer mit Töpfen statt Hecke, Weg-Mix aus Cotto. Modern mit Kastenhecken, Trittplatten, Solitärbaum. Daten plus Regel.
   *Akzeptanz:* Ab Detailgrad 2 hat Mediterran ≥ 2 Zypressen und 0 Hecken-Laub am Grundstücksrand. Modern hat keine Grundstückshecke.
9. **Festschicht mit Stil-Kit.** `festive.ts:80–160`: Kit `mediterranean` (Farolitos auf Brüstungen und Mauern alle 2 Blöcke, Olivengirlande, Schleifen nur im Bogenscheitel). Kit `modern` (Lichtband `pearlescent_froglight` unter der Platte, ein Baum, Kranz ohne Schleifenkette). Daten.
   *Akzeptanz:* Modern-Weihnachten enthält 0 `red_wool`-Schleifen außer am Kranz. Mediterran-Weihnachten hat ≥ 6 Kerzen auf Brüstungen oder Mauern. 0 Validator-Reparaturen (Schneeabstand).
10. **Akzentrolle und neue Dachtypen.** `styles.ts:18` (`shed`, `butterfly`, `vault`), Engine-Abschnitte für `butterfly` (zwei `shed`) und `vault` (M6). Rolle `accent` in Kuppel und Azulejo-Band (Daten).
    *Akzeptanz:* Kykladen-Häuser haben in ≥ 30 % der Seeds ein Gewölbe oder eine Kuppel in der Akzentfarbe.
11. **Wasser (optional, P3).** `families.ts` (Block `water` mit `level`, nur `level=0`) und `validator.ts` (Regel dichtes Becken), `parseDescription.ts:404/440` („Pool“ und „Brunnen“ erlauben), `landscape.ts` (Becken N13 bzw. Hofbrunnen). Winter: `packed_ice`.
    *Akzeptanz:* WorldEdit-Test liest `water[level=0]` identisch. Im Spiel fließt nach dem Einfügen nichts aus. Winter-Modelle enthalten statt Wasser `packed_ice`.
12. **Registry-Ergänzungen (P3).** `potted_allium`, `potted_orange_tulip`, `potted_cactus`, `potted_dead_bush` [19], glasierte Keramik in Weiß, Hellblau und Blau [21], `waxed_*copper_bars` [23], `waxed_*copper_lantern` [24], `decorated_pot` [20] (erst nach Import-Test, Block-Entity).
    *Akzeptanz:* Der Registry-Test gegen minecraft-data besteht. `decorated_pot` wird von WorldEdit ohne NBT als einfacher Topf eingefügt.

---

## Quellen

1. https://minecraft.how/blog/post/build-modern-minecraft-house – Modern: 3–4 Blöcke, Podest 1–2, Stufen-Überstand, raumhohes Glas in Achsen, Glasgeländer, versteckte Lichter, Fehler „deepslate + oak“.
2. https://minecraft.how/blog/post/modern-minecraft-house-guide – „Stick to three maximum“, Wände 3 hoch, Fenstergruppen, 1 Block Plattenüberstand, „Negative space“.
3. https://minecraft.how/blog/post/minecraft-building-styles – Modern: Beton, entrindete Stämme, Glas, Kupfer; wenig Überstand; „every mistake shows“.
4. https://minecraft.how/blog/post/minecraft-house-design-tips-1 – Silhouette, Asymmetrie, Dachabschnitte auf mehreren Höhen, Fenster ≥ 2×2.
5. https://cozygamebuilds.com/minecraft-roof-design-ideas/ – Terrassendach, `smooth_quartz_slab`-Schattenkante, Flugdach 3–4 mit Auskragungsregel, Schmetterlingsdach.
6. https://minecraft.wiki/w/Tutorial:Roof_types – Flachdach-Rand aus anderem Block, Pultdach 1:1/2:1, Schmetterling, Sägezahn, Walm auf Quadrat = Pyramide.
7. https://buildingguide.app/minecraft-roof-designs – Stufenrand, Brüstung aus Falltüren, Mauern oder `iron_bars`, Dachterrasse.
8. https://guide.astroworldmc.com/how-to-build-a-roof – „step every two or three blocks“, „Flat sheds suit modern“, Überstand 1–2 als Schattenlinie.
9. https://www.switchbladegaming.com/minecraft/building-tips/ – Modern- und Wüstenpalette, Fenster zurücksetzen, Ecken vorziehen, Seelaternen, Biom-Materialien.
10. https://8bittoast.com/minecraft-house-ideas/ – Glasvilla, weiße Box, Brutalismus aus Glattstein, grauem Beton und Eisengittern.
11. https://www.thespike.gg/minecraft/house-ideas/modern-house – Blocklisten: weißer Beton, Schwarzeiche, Glasscheiben, Quarzstufen-Flachdach.
12. https://www.thespike.gg/minecraft/house-ideas/desert-house – Sandsteinfamilie, glasierte Keramik, Bögen, gestufte Dächer.
13. https://www.thespike.gg/minecraft/house-ideas – Toskana-Haus: „sandstone walls and a classic orange roof“.
14. https://minecraft.wiki/w/Village – Savanne: Akazie, orange Terrakotta; Wüste: Sandstein, Wege aus `smooth_sandstone`, glasierte Keramik.
15. https://minecraft.wiki/w/Tutorial:Best_building_materials – Beton modern, Quarz griechisch, Sandstein Wüste, Ziegel neutral.
16. https://minecraft.wiki/w/Snow – Schnee nur auf voller Oberseite, schmilzt ab Licht 12, Kerzen 3 je Stück.
17. https://minecraft.wiki/w/Ice – Eis schmilzt bei Licht > 11, Packeis nicht.
18. https://minecraft.wiki/w/Water – `level=0` Quelle, Ausbreitung 7, eingeschlossene Quelle bleibt still.
19. https://minecraft.wiki/w/Flower_Pot – alle `potted_*` in Java.
20. https://minecraft.wiki/w/Decorated_Pot – Block-Entity, Zustände, Inhalt, Grundform aus Ziegeln.
21. https://minecraft.wiki/w/Glazed_Terracotta – `facing`, 2×2-Muster, 16 Farben.
22. https://minecraft.wiki/w/Pale_Oak_Leaves – immer grau, nicht biom-getönt, im Schnee nicht weiß, ab 1.21.4.
23. https://minecraft.wiki/w/Copper_Bars – ab Java 1.21.9, Oxidstufen, gewachst, Verbindungen wie Eisengitter.
24. https://minecraft.wiki/w/Copper_Lantern – ab 25w32a, `hanging`, Licht 15 in allen Stufen.
25. https://minecraft.wiki/w/Trapdoor – Zustände, Falltüren halten ohne Stützblock.
26. https://minecraft.wiki/w/End_Rod – sechs Richtungen, Licht 14, hält ohne Stütze.
27. https://www.grabcraft.com/minecraft/mediterranean-wine-store/farm-buildings – Mediterrane Anlage mit Quarz, Steinziegel, 256 Wasser (Pool).
28. https://www.grabcraft.com/minecraft/mediterranean-medieval-middle-class-house/medieval-houses – orange und gelbe Terrakotta, Ziegeltreppen-Dach, Fichte.
29. https://www.grabcraft.com/minecraft/elite-modern-villa-1/modern-houses – moderne Villa mit Gründach, Teich, grauem Glas.
30. https://en.wikipedia.org/wiki/Bauhaus – kein Ornament, auskragende Balkone, lange Fensterbänder.
31. https://en.wikipedia.org/wiki/Le_Corbusier%27s_Five_Points_of_Architecture – Pilotis, Dachgarten, freier Grundriss, Bandfenster, freie Fassade.
32. https://en.wikipedia.org/wiki/International_Style_(architecture) – Volumen statt Masse, Regelmäßigkeit statt Symmetrie.
33. https://en.wikipedia.org/wiki/Mid-century_modern – breit, niedrig, raumhohe Fenster, Pfosten und Riegel.
34. https://en.wikipedia.org/wiki/Fagus_Factory – Glasfassade, Ecken ohne Stütze.
35. https://en.wikipedia.org/wiki/Brise_soleil – Lamellen, Le Corbusier.
36. https://en.wikipedia.org/wiki/Breeze_block – Lochsteine im Mid-Century Modern.
37. https://en.wikipedia.org/wiki/Cantilever – Kragarm, Fallingwater.
38. https://en.wikipedia.org/wiki/Yakisugi – schwarz gebranntes Holz als Fassade.
39. https://en.wikipedia.org/wiki/Mediterranean_Revival_architecture – symmetrische Hauptfassade, Putz, rote Ziegel, Bogenfenster, Gitter, Höfe.
40. https://en.wikipedia.org/wiki/Spanish_Colonial_Revival_architecture – L- oder Hofgrundriss, flache Ziegel-, Pult- oder Flachdächer, Arkaden, Eisen.
41. https://en.wikipedia.org/wiki/Pueblo_Revival_architecture – Flachdach, gerundete Brüstungen, Vigas, Erdtöne, gestufte Massen.
42. https://en.wikipedia.org/wiki/Italianate_architecture – flaches Walmdach, Konsolen-Traufe, Belvedere, Loggia, asymmetrischer Plan.
43. https://en.wikipedia.org/wiki/Loggia – offener überdeckter Gang, Teil des Baukörpers.
44. https://en.wikipedia.org/wiki/Pergola – Pfosten, Balken, Gitter, Rankpflanzen, italienische Gärten.
45. https://en.wikipedia.org/wiki/Cupressus_sempervirens – Säulenkrone < 1/10 der Höhe, Signatur mediterraner Landschaft.
46. https://en.wikipedia.org/wiki/Luminaria – Kerzentüten in Reihen auf Mauern, Dächern, Wegen; Heiligabend.
47. https://it.wikipedia.org/wiki/Coppo – Coppi-Dächer in der Regel ≥ 30 % Neigung; Toskana.
48. https://fr.wikipedia.org/wiki/Génoise_(architecture) – Traufgesims aus mehreren vorkragenden Hohlziegel-Reihen, 2–5 Reihen.
49. https://fr.wikipedia.org/wiki/Mas_provençal – Südausrichtung, Satteldach, römische Ziegel, Nordseite ohne Öffnungen.
50. https://www.studiomatrx.org/architecture-canon/santorini-cave-dwellings – Tonnengewölbe, Dach als Terrasse des Nachbarn, blaue Kuppeln.
51. https://www.aegeanislands.gr/pois/santorini-architecture-en – Gewölbe, einander durchdringende Volumen.
52. https://www.santorini-view.com/traditional-architecture – geweißte Häuser, Kuppeln, schmale Fassaden, Hof mit Zisterne.
53. https://www.culture.gouv.fr/Media/Regions/Drac-Paca/Files/Aides-demarches/Demarches-et-conseils-architecture-patrimoine/Fiches-conseil/Stap-du-Var/06-Les-debords-de-toiture – Merkblatt Dachüberstand (PDF; Text nur aus einem Such-Snippet, Zuordnung zur URL unsicher): 2–3 versetzte Hohlziegel-Reihen in steigenden Stufen.
54. research_notes/Minecraft Bautechniken für Generator/paletten.md – vorhandene Paletten-Recherche, hier korrigiert.
55. src/core/style/textureStats.ts – gemessene L\*, C und Farbton der genannten Blöcke.
