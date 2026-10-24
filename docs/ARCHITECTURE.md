# Architektur

## Datenfluss (verbindlich)

```text
Text ──► Regel-Parser (parseDescription) ─┐
     └─► optional: KI (OpenRouter/Ollama) ┤  (beide liefern denselben Bauplan; der KI-Plan ersetzt den Parser nur für genau diesen Text)
UI-Einstellungen (manuell, Vorrang) ──────┤
Seed, Minecraft-Version ──────────────────┘
        ▼ resolveSpec
BuildSpec v2 (Zod-validiert: Typ, Stil, Thema, Größe, Detailgrad, options)
        ▼ generateSelectedVariants (deterministisch; Häuser: N Kandidaten bewerten, die drei besten zeigen)
   Stil → Bauform (Archetyp) → Palette → Rollen-Materialien → Massen/Plan → Wände, Dächer, Öffnungen
   (Detail-Kits aus kits/ zuerst), Bauteile, Landschaft, Festschicht → optional Fundament nach unten
        ▼ VoxelBuilder.finalize: Zustandsauflöser → Validator (Reparaturen) → Zustandsauflöser
kanonisches VoxelModel ◄──── Editor (setzen/entfernen/ersetzen, Undo/Redo, gleicher Auflöser) ──┐
   ├─► 3D-Vorschau (Chunks im Web Worker, echte Texturen oder Farben)                             │
   ├─► Materialliste (countMaterials: Blöcke und Items)                                          │
   ├─► Projekte (IndexedDB v2, VoxelTransport RLE)                                                │
   └─► .schem-Export (writeSpongeV3 → unabhängiger Validator) ─────────────────────────────────────┘
```

Es gibt genau **ein** Blockmodell pro Variante. Vorschau, Materialliste, Speichern und Export lesen es unverändert; der Editor erzeugt bei jeder Änderung ein neues, neu gehashtes Modell. `POST /api/export` exportiert das übergebene Modell und generiert nie neu.

## Blöcke: Registry, Formen, Auflöser, Validator (`src/core/blocks/`)

- **Registry** (`registry.ts`, `families.ts`): jeder Block mit Formklasse, Eigenschaften, Standardwerten, Kategorie, Lichtstärke und Profilen. Zustände sind vollständig und alphabetisch sortiert (`minecraft:oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]`), wie WorldEdits `getAsString()`. `checkBlockState(state, version)` prüft gegen die Zielversion; `profileBlockId` benennt um, wo sich Namen unterscheiden (`iron_chain` in 1.21.11 ↔ `chain` in 1.21.1).
- **Formen** (`shapes.ts`, `faces.ts`): Vanilla-Kollisions- und Stützboxen in 1/16 je Formklasse (Treppe, Stufe, Zaun, Mauer, Scheibe, Tür, Falltür, Laterne, Kette, Kerze, Laub …). Daraus entstehen Flächenmasken (voll, Mitte stützend) für Verbindungen und Stützregeln. Ein Test vergleicht die Masken mit den echten Modellen der Client-Datei.
- **Zustandsauflöser** (`stateResolver.ts`): berechnet, was Minecraft beim Setzen selbst berechnen würde – Treppenformen (`inner_*`/`outer_*`), Zaun-, Scheiben- und Gitterverbindungen, Mauerseiten und -pfosten (von oben nach unten), Zauntor `in_wall`, obere Türhälfte, `snowy` beim Gras, Laubdistanzen. Damit sehen WorldEdit-Import und Vorschau gleich aus; ein zweiter Lauf ändert nichts (Fixpunkt-Test).
- **Validator** (`validator.ts`): repariert, was im Spiel nicht hielte – Laterne ohne Halt, Kerze, Tür, Teppich, Pflanze, Schiene, Knopf, Leiter ohne Wand, Schnee auf ungeeignetem Grund oder zu nah am Licht (würde schmelzen), Golem-Muster, `dirt_path` unter festen Blöcken. Jede Reparatur wird protokolliert; erzeugte Bauwerke müssen **null** Reparaturen haben (Test über alle Stile, Größen, Themen und Typen).
- **Drehen/Spiegeln** (`transform.ts`) für Vorlagen.

## Datenmodelle

### BuildSpec v2 (`src/core/schema/buildSpec.ts`, `buildOptions.ts`)

| Feld | Werte |
|---|---|
| `kind` | `house`, `tree`, `market_stall`, `station`, `tower` |
| `style` | `medieval`, `fantasy`, `rustic`, `nordic`, `japanese`, `cherry`, `modern`, `mediterranean` |
| `theme` | `none`, `winter`, `christmas` |
| `size` | `small`, `medium`, `large`, `huge` |
| `detailLevel` | 1, 2, 3 |
| `seed` | 0 … 2³¹−1 |
| `targetMinecraftVersion` | `1.21.11` (Standard), `1.21.1` |
| `options` | alles optional (`undefined` = der Stil entscheidet) |

`options`: Bauform (`composition`: `auto` oder einer der 15 Archetypen aus `src/core/style/compositions.ts`), Maße (`width`/`depth` ungerade 5–61, `floors` 1–8, `floorHeight` 4–6), Fundament nach unten (`foundation` 0–4 Lagen, Standard aus), Dach (`roofType`, `roofProfile`, `overhang` 0–3, `dormers` 0–6), Form (`symmetry`, `wings` L/T/U, `annex`, `tower` eckig/rund, `towerPosition`), Fenster und Türen (`windows`, `windowFamily`, `doorFamily`), Bauteile (`jetty`, `oriel`, `porch`, `balcony`, `chimney`), Licht und Fest (`lanternDensity`, `soulLanterns`, `garland`, `christmasTree`, `presents`, `snow`, `garden`), Material (`palette`, `materials.{wall, roof, frame, plinth, accent}` – nur Katalog-IDs).

Welche Optionen ein Typ nutzt, steht in `APPLICABLE_OPTIONS` (`generateBuilding.ts`); Optionen ohne Wirkung und Wünsche, die der Plan anpassen musste (Turm an andere Ecke, Erker passt nicht, Türform passt nicht …), kommen als **Hinweise** zurück. Alte Projekte (v1) werden beim Laden mit `migrateSpecLike` übersetzt.

### VoxelModel (`src/core/schema/voxelModel.ts`)

```ts
interface VoxelModel {
  schemaVersion: 1;
  dimensions: { width; height; length }; // X, Y, Z
  palette: string[];                     // eindeutige, vollständige, kanonische Blockstates
  indices: Uint16Array;                  // ein Paletten-Index pro Block, inkl. Luft
  origin: { x: 0; y: 0; z: 0 };
  spec: BuildSpec;
  hash: string;                          // SHA-256 (hex)
}
```

- **Koordinaten:** X = Osten, Y = oben, Z = Süden. Index `x + width * (z + length * y)` (Sponge-v3-Reihenfolge). Die Vorderseite eines Hauses zeigt nach Norden.
- **Palette:** Luft auf Index 0, danach in der Reihenfolge des ersten Auftretens; gleiche Blöcke ergeben immer denselben Hash.
- **Hash:** SHA-256 über Maße, Palette und die Indizes als little-endian uint16 (gestreamt).
- **Grenzen:** 192 × 384 × 192 Blöcke (volle Bauhöhe einer Java-Welt), 4096 Paletteneinträge. Gemessen über den ganzen Datenweg in `tests/integration/largeModels.test.ts` (siehe `TEST_REPORT.md`).

## Stile als Daten (`src/core/style/`)

- **Materialien** (`materials.ts`): Familien (Holz, Stamm, Stein, Ziegel, Putz, Metall …) mit Formen (Block, Treppe, Stufe, Zaun, Mauer, Tür, Falltür, Scheibe …) und Ersatzformen, wo ein Block keine eigene hat. Helligkeit und Farbsättigung stammen aus den echten Texturen (`textureStats.ts`, abgeleitete Zahlen, keine Mojang-Dateien).
- **Paletten** (`palettes.ts`): 36 Paletten (4–6 je Stil, nach `research_notes/Bauqualitaet 2026-10/` 07–13), je Rolle (Sockel, Wand, Obergeschoss, Füllung, Rahmen, Balken, Dach, Dachkante, First, Untersicht, Fenster, Laden, Tür, Boden, Weg, Kamin, Akzent) gewichtete Materialien; je Haus wird pro Rolle ein Material gezogen. Blasseiche und Harzziegel (ab 1.21.4) sind erlaubt: Für 1.21.1 setzt der Generator einen gleich geformten Ersatz aus der Registry (`profileBlockId`, z. B. Quarzsäule für entrindete Blasseiche); in Rollen, die die Dach-Engine ohne Versionsschritt baut (Dach, Kante, First, Untersicht, Wände als Giebel), kommen sie nicht vor.
- **Stile** (`styles.ts`): acht Stile mit Paletten, Dachformen und -profilen (gewichtet), Proportionen je Größe, Überstand, Geschosshöhe, Sockel, Fachwerk, Symmetrie, Detailwahrscheinlichkeiten, Fenster- und Türvorlagen, Laternenart und Stichwörtern für Parser und KI.
- **Lints** (`lints.ts`): Farbabstände in ΔE00 (CIEDE2000) der gemessenen Texturfarben für jede Kombination der Alternativen: Wand ↔ Rahmen ≥ 15, Dach ≠ Wand (≥ 15 oder ≥ 12 mit Dachkante ≥ 15 zu beiden), Rahmen ↔ Dach ≥ 8 (sonst trennt die Dachkante), Dachkante aus Holz oder der Dachfamilie und ≥ 10 vom Dach; Streben in Rahmenfarbe (|ΔL*| ≤ 8), Fensterglas nur klar, weiß, grau, braun oder schwarz (Farbglas nur als Akzent), 3–5 Materialfamilien, Dach mit Treppen, Formen und Versionsersatz in beiden Versionen, verbotene Namensteile je Stil (mit Ausnahmen, z. B. `log!stripped`). Getestet für alle Paletten; jede Palette baut in 1.21.11 und 1.21.1 ohne Reparatur.
- **Verwitterung** (`texturing.ts`): Varianten (moosig, rissig …) unten, an Ecken und unter Überständen, deterministisch aus Seed und Position.
- **Seeds:** `createSeededRandom(seed)` mit `fork(label)` je Teil – eine geänderte Option verschiebt nicht den Zufall anderer Teile.

## Haus-Generator (`src/core/generator/house/`)

1. **Eingabe** (`resolveInput.ts`): Stil + Wünsche → `HouseInput` (Maße, Geschosse, Dach, Bauteile, Materialien je Rolle, Fenster- und Türvorlagen). Zuerst die **Bauform** (`composition.ts`, Daten in `src/core/style/compositions.ts`): je Stil 4–6 Archetypen mit Gewichten je Größe (z. B. Kreuzgiebelhaus, Stadthaus, Treppenturm, Kapelle, Chalet, Blockhütte, Hexenhaus, Langhaus, Pagode, Engawa-Haus, versetzte Kuben, Villa mit Turm); sie legen Hauptkörper, Quer- und Seitenteile, Anbau, Turm, Vordach und Paletten fest. Ausdrückliche Wünsche gewinnen immer; `simple` ist die klassische Kiste.
2. **Plan** (`plan.ts`): Massen – Hauptkörper, Querteile (schmaler als der Hauptfirst, mit Höhenhierarchie), Flügel (L/T/U), Anbau links/rechts/hinten, zurückgesetzte Obergeschosse, eckiger oder runder Turm (immer mindestens zwei über dem Hauptfirst) – mit Geschossen, Jetty, Anschlüssen und Türposition (auch in der Innenecke).
3. **Wände** (`walls.ts`, `studs.ts`): Sockel 1–3 hoch mit Treppenschürze und Verwitterung; Wand- bzw. Füllebene d = 0, Ständer und Balken eine Ebene davor (d = +1); Ständerraster wie im Bericht; Geschossbänder, Jetty auf Kopfüber-Treppen-Konsolen; echte Geschossdecken; Fachwerk-Streben in freien Feldern; Treppe oder Leiter zwischen den Geschossen. Ständerraster nur bei Fachwerk (sonst Eckpfosten), Knaggen der Auskragung unter jedem Ständer, Treppenschürze nur an Ecken und Eingang, Stammwände als liegende Lagen mit Kreuzecken (ohne Pfosten davor), Gurtgesims bei Mediterran (nach den Öffnungen, nur in freie Zellen), Wandkrone ohne Balkenring bei Häusern ohne Rahmen. Seiten gelten nur in den Geschossen als verbunden, die die Nachbarmasse erreicht (`joinedAt`).
4. **Dächer** (`roof/roofEngine.ts`, `roof/profiles.ts`): siehe unten.
5. **Öffnungen** (`openings.ts`, `reveal.ts`): Tür aus den Vorlagen (mit Freiraum davor und dahinter und Laternen, bei tiefen Portalen daneben), Fenster in den Feldern des Ständerrasters oder auf symmetrischen Achsen, Erker (W09) und Balkon im ersten Obergeschoss; Vorlagen werden nur gesetzt, wenn alles vor der Wand frei ist. **Laibung:** Glas und Türblatt sitzen eine Ebene in der Wand (d = −1) mit Futter aus dem Wandmaterial (Shoji, Glasbausteine und Erker bleiben bündig). Läden oder Blumenkästen nach den Stilwahrscheinlichkeiten, im Winter Farn und Tannen statt Blumen. **Hintertür** ab Detailgrad 2 auf der Rück- oder einer Seitenfassade (eigener Weg, Stufe, Laterne). Fenster und Balkone halten Abstand zu einem Außenkamin; kleine Fenster flankieren ihn. **Detail-Kits** des Creative Directors (siehe unten) kommen vor den eingebauten Vorlagen. Fachwerkfassaden mit Rhythmus: geschlossene Eckfelder mit Streben, Fenster in den mittleren Feldern (je Fassade über alle Geschosse gleich); Fenster nach ihrer eigenen Breite im Feld zentriert. Bei Sockel ≥ 2 eine Freitreppe (Podest, eine Stufe je Sockelreihe, Wangen).
6. **Bauteile** (`components.ts`): Gauben (beide Dachrichtungen, bei Giebel zur Straße auf beiden Längsseiten, hinten ab zwei Gauben), Vordach, Veranda auf Stammpfosten mit Geländer oder Engawa, Kamin mit zweibreitem Schaft, Fuß, auskragendem Kopf und versenktem Lagerfeuer (außer Rustikal neben der Giebelmitte; Nordisch und vorkragende Giebel durch das Dach), **Laternen an allen freien Traufecken** (Dichte nach Laternenwunsch, japanisch an allen Ecken auch der Pagodenringe), gestufte Turmhauben mit offener Laternenstube (`buildTowerDrum`), **Ranken** an Kamin und vollen Wandflächen (nur ohne Thema, nicht modern/japanisch).
6a. **Giebel** (`gables.ts`): Fachwerkgiebel eine Ebene hinter dem Ortgang mit Firstständer, Kehlbalken je 4 Reihen und zwei Fenstern; andere Giebel mit Fenstern auf der Firstachse; Firstzier je Stil. Der Bahnhof hält seinen Hallengiebel für die Uhr frei (`plainGables`).
6b. **Innenlicht** (`interiorLight.ts`): je Geschoss Laternen an Ketten unter der Decke im Raster ≤ 7 (Kettenlänge aus der Raumhöhe), eine stehende Laterne im Dachboden; Treppen, Leitern und Türfreiraum bleiben frei. Entscheidung des Creative Directors: Licht innen ja, Möbel nein.
7. **Rundturm** (`roundTower.ts`): Wandring aus der Geometriebibliothek, Sockel mit Schürze, Geschossbänder, Böden mit Leiter, Fenster in den geraden Stücken der Achsen, Konsolenkranz und Kegel (D + 2, Profil gerade/konkav/konvex), Kuppel, Zinnen (nur bei symmetrischem D) oder Brüstung. Am Haus bleibt der Ring in dessen Räumen offen.
8. **Landschaft** (`landscape.ts` mit `paths.ts`, `borders.ts`, `garden.ts`): Weg, Grenze, Garten, Laternenpfähle (siehe „Landschaft“).
9. **Festschicht** (`festiveLayer.ts` als Einstieg, `festive.ts`, `christmasTree.ts`, `presents.ts`, `festiveProps.ts`, Stil-Daten in `festiveKits.ts`; Recherche `research_notes/Bauqualitaet 2026-10/` 14, 17 und die Stilberichte): Gartenbaum (wächst mit dem Haus, bevorzugt an einer Ecke neben der Fassade; ohne Platz für mindestens Höhe 9 entfällt er), Geschenke nur in Gruppen unter dem Baum oder neben dem Eingang (gedeckte Farben je Stil, immer mit Band), Girlanden mit Ankern (Schleife nur dort), echtem Durchhang und verstecktem Licht hinter dem Laub oder Laternen an den Ankern, Kranz als Ring mit hohler Mitte auf fensterfreier Wand (nie in der Tür-Freihaltung), ab mittlerer Größe und Detailgrad 3 auch als 5×5-Ring im Giebel einer anderen Fassade, wo Platz ist; Kerzen je Fassade in einer Farbe und Anzahl auf gespiegelten Simsen. Fest-Kits je Stil: Japanisch/Kirschblüte mit Kadomatsu-Paar, Shimekazari und Traufenlaternen statt Baum, Geschenken und Girlande; Mittelalter mit Holzstapel und roten Kerzen, ohne Wolle; Nordisch mit Julenek und Julbock aus Heu; Modern mit Lichtband in der Attika von Flachdächern; Mediterran mit Farolitos am Weg und Olivengirlande (Blasseiche, in 1.21.1 Azalee). Ein ausdrücklicher Wunsch (Baum, Geschenke, Girlande) wirkt immer. **Lichterketten** (`festiveLights.ts`): bunte, brennende Kerzen (Licht 3, schneesicher) jede zweite Zelle unter Traufe und Ortgang auf einer geschlossenen oberen Falltür und auf dem First (Stufen-First dort als Doppelstufe); Farben je Stil, die Girlande bleibt bei diesen Stilen am Eingang. **Mini-Tannen** (Fichtenlaub um ein verstecktes Licht) flankieren den Weg zur Tür und stehen auf Detailgrad 3 an den vorderen Ecken. Ein Holzstapel nur einmal (Garten oder Fest-Kit). **Schnee** nur auf ausdrücklichen Wunsch und nur als Schneeschichten dort, wo sie im Spiel liegen bleiben – auch auf dem Rasen, nie auf geräumten Wegen, nie als Schneeblock (Entscheidung des Creative Directors 23.10.2026); Baumlichter dann als angelaufene Kupferleuchten mit Licht 12; keine Eiszapfen.

Weitere Typen: **Weihnachtsbaum** (Etagen mit Rücksprung und hängenden Astspitzen, gelappte und je Etage gedrehte Lagen, innen hohl, Stamm sichtbar und mit der Höhe breiter; Schmuck 3–6 % der Hülle in höchstens drei Farben je Stil, ab Höhe 12, darunter Laternen an Ketten; eine Lichtart, teils hinter der Hülle; Stern wächst mit: Endstab-Funkeln, 3×3-, 5×5- und 7×7-Stern; Geschenkgruppen unter und vor dem Baum), **Weihnachtsmarkt** (`marketStall.ts`, Vorlagen als Daten in `templates/stalls.ts`: Holzhütten mit Giebel zur Gasse, Überstand 1–2, Brüstung mit heruntergeklapptem Laden als Auslage, Innenlaterne, Waren unter halber Blockhöhe auf der Theke, Tannengrün mit warmem Licht an Traufe und Ortgang; Nachbarn unterscheiden sich in Wand, Dach, Waren, Breite oder Höhe; Gasse mit Lichterketten von Giebel zu Giebel, Mehrarm-Laternenpfahl, Glühweinhütte mit Fass-Stehtischen, ab large ein Platz mit Baum, Bänken und Geschenken), **Bahnhof** (`station.ts`: Halle und zwei Flügel aus den Haus-Bausteinen; Hausbahnsteig direkt am Gebäude mit Kante aus Kopfüber-Treppen und Sicherheitslinie dahinter, Pultdach auf Säulen mit Kapitell und Konsolen, Volant ab Detailgrad 2, Bänke, Laternen, Bahnsteiguhr; Gleisbett mit Schwellen über drei Blöcke und Schottermix, Kante 1,5 Blöcke von der Gleismitte; runde Uhr mit Kettenzeigern im Hallengiebel; T-Laternen an den Bahnsteigenden, ein Paar am Portal; ab Hallenbreite 11 ein Wasserkran und ein Güterschuppen mit Laderampen auf Wagenbodenhöhe, ab 15 zwei Formsignale), **Turm** (`tower.ts`: der Rundturm frei stehend mit Eingang aus den Türvorlagen).

### Landschaft (`src/core/generator/landscape*.ts`, `paths.ts`, `borders.ts`, `garden.ts`)

Nach den Berichten 15 (Gelände, Gärten, Wege), 18 (Lampenpfähle) und 14 (Winter):

- **Stildaten** (`landscapeStyles.ts`): je Stil Weg (Form, Schultern, Akzent, Antritt), Boden nach Ursache (Abnutzung, Schatten, Flecken, Rasenpflanzen, Beeterde), Grenze (Art vorn und seitlich, Heckenmix 60/25/15, Steine, Kappe, Töpfe), Garten (Blumen, Rückreihe, Büsche, Bäume, Requisiten, Felsen) und Lampenpfahl-Entwürfe. Bei Winter und Weihnachten gibt es keine Blumen (Farn, Fichtensetzlinge, Töpfe stattdessen) und immergrüne Hecken. Baustoffe kommen aus den Palettenrollen (`landscapeMaterials.ts`): Wegmitte = Rolle `path`, Zaunholz = `frame`/`beam`, Gartenmauer = `wall`.
- **Grundstück** (`landscapeSite.ts`): vor dem Bauen werden eigene Bodenzellen, Hausfuß, Traufzone, Abstände zum Haus und Fensterblickfelder bestimmt; jede Spalte bekommt eine Nutzung (Weg, Grenze, Laterne, Beet, Baum …), damit nichts doppelt belegt wird.
- **Weg** (`paths.ts`): Mittellinie mit Stützpunkten alle 4–6 Schritte (±1), Reihenpinsel ohne Löcher, Mitte ≥ 80 % Rolle `path`, Schultern 50/30/15/5 in weichen Flecken, drei Reihen Stein vor der Tür, am Tor schmaler, dahinter ausdünnend; japanisch Trittsteine, modern gerade Platten mit Grasfugen.
- **Grenze** (`borders.ts`): zwei Blöcke innerhalb des Modellrands, höchstens 75 % des Umfangs (Vorgarten, L oder nur vorn), Tor am Hauptweg mit Pfosten (optional Laubbogen); Hecke mit Buckeln, Wallhecke, Zaun mit Pfosten, Gärdsgård, Feldsteinmauer, Steinmauer, Gartenmauer mit Töpfen, Bambuszaun, moderne Kastenhecken.
- **Lampenpfähle** (`templates/lampPosts.ts`): 14 Entwürfe (LP02–LP18) als Daten, Licht immer ab der 3. Zelle über dem Weg; ein Entwurf je Gebäude, ein Pfahl am Tor (bei „viele“ ein Torpaar), dann alle 8–12 Schritte wechselseitig.
- **Garten** (`garden.ts`, `gardenLife.ts`, `templates/nature.ts`): Büsche in drei Größen am Sockel (vor den Beeten gesetzt, vor Fenstern nur kleine), Beete in Drifts am Haus, Bäume (Eiche, Birke, Fichte, Azalee, Kirsche, Kiefer, Zypresse, Olive) ≥ 3 von der Fassade und nicht vor Fenstern, Büsche an Hausecken und Tor, Felsen, Holzstapel, Heu, Fässer, ein **Nutzgarten** mit Stammrahmen, Pflanzreihen, Trampelpfad und Vogelscheuche neben oder hinter dem Haus (ohne Thema), im Winter ein Eisteich; ein freier Platz für den Weihnachtsbaum im Vorgarten (erste Hofzelle), Geschenke im Umkreis von 3. Ein zweiter, kleiner Weg führt von der Hintertür zum Rand.
- **Boden und Rand:** Abnutzung an Weg und Pfählen, Schatten unter Traufen und Kronen, weiche Flecken im Rasen, **Bordsteine** neben dem gepflasterten Weg (≈ 70 %, nie im Wegmaterial), **Blumen-Drifts** im offenen Rasen (ohne Thema), **hohes Gras und große Farne** (zweiteilige Pflanze `tall_plant`) am Rand und um Bäume, Felsen und Büsche; die zwei äußeren Ringe bleiben Gras und lösen sich unregelmäßig auf (nie länger als 6 gleich tief). Der Boden bleibt immer Gras.
- **Fundament nach unten** (`foundation.ts`, Option `foundation` 0–4): nach dem Bauen hebt `VoxelBuilder.raised(n)` alles um N Lagen; unter Mauern und Sockel geht der Sockelblock nach unten weiter, unter Rasen, Wegen und Böden liegt Erde, am Rand entsteht eine Böschung (Seitenflächen grobe Erde/Erde/Stein) mit Grasstufen, wo der Rand ausgefranst ist. `groundLevel(spec)` und `aboveGround(model)` (`voxelModel.ts`) liefern Prüfungen und Kennzahlen die Plan-Koordinaten; der Export schreibt `Offset [0, −N, 0]`.

### Dach-Engine

- Jeder Abschnitt (Hauptdach, Flügel, Gauben, Vordach) ist ein **Höhenfeld in halben Blöcken**; Abschnitte werden je Spalte mit dem höchsten Wert vereinigt. Daraus entstehen Kehlen und Grate; die Treppenformen an Ecken setzt der Auflöser.
- **Profile als Δ-Folgen** je Spalte (45° 2,2,2 …, steil 4,4 …, flach 1,1 …, Glocke 1,1,2,2,2,4,4 …); `normalizeDeltas` sorgt für gerade Treppenoberkanten. Die Spalte wird aus Treppe, Stufen und vollen Blöcken gebaut.
- **Neigungsleiter statt Abflachen** (`profiles.ts`): P27 1 · P34 2,1,1 · P37 2,2,1,1 · P45 2 · P53 4,2,2 · P56 4,2 · P63 4, ab der Traufe wiederholt. Ein Haus nimmt die steilste Stufe, die unter die Höhengrenze passt (`housePitch`), alle Flügel und Quergiebel folgen ihr. Die Höhengrenze kommt aus dem Stil (`proportions.roofRise`: Faktor × Wandhöhe, Min., Max.) und unterschreitet nie die Mindestneigung des Stils; dann wird das Dach höher statt flacher. Glockenprofile aus einem monotonen Katalog.
- **Schichten und Löcher:** Abschnitte einer tieferen Schicht (Vordach, Veranda, Pagodenringe) werden unter höheren weitergebaut; Ringdächer haben ein Loch für den inneren Turm.
- **Kanten mit Schwung** (`edge`): erhöhter Ortgang mit ausgestelltem Fuß (Mittelalter, Rustikal, Nordisch, Fantasy), leicht durchhängender First (Fantasy), hochgezogene Ecken an Walm- und Pyramidendächern (Japanisch, Kirschblüte). **Oberflächen** (`texture`): Ziegelreihen, Strohbuckel, lebendes Dach mit Moos und Azaleen.
- Formen: Sattel, Walm, Krüppelwalm, Irimoya (Walmabschnitt plus an den Stirnseiten eingerückter Giebelabschnitt gleicher Neigung; unter dem überstehenden Giebelrand wird der Walm weitergebaut), Pyramide, Mansard, Gambrel, Saltbox, A-Frame, Flach (Attika in Wandfarbe mit dünner Abdeckung oder auskragende Platte), Pult, Pagode (Walm, gestuft). Überstand mit Untersicht aus Kopfüber-Treppen; Kontrast nur als einspaltiges Ortgangbrett, die Traufe bleibt im Dachmaterial; Dachmischung (`ROOF_BLEND`: dunkler Partner in Streifen von der Traufe, heller am First, nur das Material wechselt); First in fünf Varianten, Giebel aus der Giebelrolle (Stammwände liegend).

### Fassadenvorlagen (`src/core/templates/`)

Fenster W01–W18 und Türen T01–T10 als **Daten**: Zellen mit Rolle (nicht Block), Form und Tiefe d (−1 innen, 0 Wand, +1/+2 davor), kanonisch für die Südfassade, beim Setzen gedreht und gespiegelt. Bögen (W07b, W17b, T04) kommen aus der Bogen-Bibliothek. Fenster- und Türfamilien der Feinparameter wählen Vorlagen aus diesem Katalog; der Balkon (`balcony.ts`) ist eine eigene Vorlage.

### Geometrie (`src/core/geometry/`)

Kreise dünn/dick/gefüllt nach „Blockmitte im Kreis“, Ellipse, Kugel und Kuppel (6er-Hülle), Kegel mit Profilen, Rotationskörper, Zwiebelprofil (experimentell), Bögen rund/spitz/Segment mit Treppen-Glättung, Zinnenmuster mit Symmetrieprüfung. Regressionstests gegen die veröffentlichten Zahlen (Kreis D5 = 12/16/21, D15 = 40/56/177, Kugel D15 hohl = 530, Kegel D15/H15 = 919).

### Prüfungen je Bauwerk (`src/core/analysis/buildingLints.ts`)

Nichts schwebt (18er-Nachbarschaft zum Boden), Auflöser-Fixpunkt, keine flache Wand breiter als 5 ohne Tiefensprung, Überstand ≥ 1, Anstieg ≤ 7 (+1 First, +1 am erhöhten Ortgang), Dach ohne Lücken, mindestens eine Tür, alle Türen vollständig und frei, Laterne an jedem Eingang. Dazu `VoxelBuilder` mit Schreibprioritäten (`DECOR` 10 … `CLEARANCE` 100): Deko kann nie den Eingang zustellen oder ein Fenster überschreiben.

### Bauqualität messen (`src/core/analysis/buildQuality.ts`)

`measureHouse` misst ein Haus wie ein Betrachter: Tiefenebenen je Fassade (d = −1 … +2), Relief, Giebeltiefe, Silhouette (Massen, Trauf- und Firsthöhen, Akzente, Dachanteil, Spitzen), Materialfamilien und Anteil des Hauptmaterials, Detaildichte, Rückseite und Seiten im Verhältnis zur Front, Licht an Eingang, Traufecken, Turm und hinter Fenstern. `qualityTargets(stil, größe, bauform)` liefert Zielbereiche, `qualityScore` eine gewichtete Wertung 0–1. Ein Regressionstest (`buildQuality.test.ts`) hält den Stand jeder Phase fest.

### Variantenauswahl (`generateBuilding.ts`)

Häuser bewerten `CANDIDATES[größe]` aufeinanderfolgende Seeds ab der Eingabe (klein/mittel 16, groß 12, riesig 8) am Rohbau (`VoxelBuilder.peek`, ohne Landschaft, Fest und Validator) und zeigen die drei besten, die sich deutlich unterscheiden: zuerst die beste, dann die beste mit anderer Bauform und anderer Silhouette, sonst anderer Bauform, sonst anderer Silhouette. Gleiche Eingabe ergibt dieselben drei. Die Gewinner werden aus ihrem Rohbau fertiggestellt (bitgleich zur frischen Generierung ihres Seeds); Bewertungen werden zwischengespeichert. Andere Bauwerkstypen bleiben bei aufeinanderfolgenden Seeds.

### Detail-Kits (`src/core/kits/`, `src/lib/kits/loadKits.ts`)

Eigene Bauteile des Creative Directors als WorldEdit-`.schem` mit JSON in `kits/<stil>/` oder `kits/alle/` (Anleitung: `DETAIL_KITS.md`). `parseKit` liest und prüft (Registry, Version, Größe, Anker, Türen), dreht in die kanonische Südansicht; `kitTemplate` macht daraus eine Fassadenvorlage, `kitCells` die Zellen eines Kaminkopfs; `createKitLibrary` ordnet deterministisch und berechnet einen Fingerabdruck. Die API lädt den Ordner je Anfrage (`loadKits`, Cache nach Dateisignatur) und gibt die Bibliothek als `GenerateOptions.kits` bis in den Hausbau (`Ctx.kits`). Ohne Kits bleibt jedes Bauwerk bitgleich.

## Text, Einstellungen und Herkunft

- **Parser** (`parseDescription.ts`): deutsche Wortstämme und Komposita, Umlaute in beiden Schreibweisen, Verneinungen über Aufzählungen („ohne Schnee und Girlanden“), Mengen und Maße, Bauwerkstypen, Stile mit gewichteten Stimmen, Thema, Dach, Bauteile, Turmposition, Fenster- und Türformen, Materialien. Nicht baubare Wünsche (Pool, Möbel, Keller …) landen in `unsupported`, Unverstandenes in `warnings`; dazu eine kurze Erklärung.
- **Bauplan** (`src/core/ai/planSchema.ts`): ein flaches, aus dem Katalog erzeugtes Format für Parser und KI (Details in `KI.md`).
- **KI-Planung** (`src/lib/ai/`, nur Server): `settingsStore.ts` liest die Einstellungen (App-Datei `.mcb-local/ai-settings.json` > `.env.local` > Standard; der API-Schlüssel verlässt den Server nie), `planner.ts` verteilt Status und Planung auf den Anbieter, `openRouterPlanner.ts` (Cloud: strenges JSON-Schema, `require_parameters`, Nachdenk-Stufe, Kosten aus `usage.cost`) und `ollamaPlanner.ts` (lokal) schicken denselben Prompt; `planValidation.ts` prüft beide Antworten gleich (JSON herauslösen, normalisieren, Zod, eine Korrekturrunde). `openRouterModels.ts` hält die Modellliste eine Stunde im Speicher (Preise, strukturierte Ausgabe) und prüft Schlüssel und Guthaben kostenlos. Der gemeinsame Vertrag mit dem Browser liegt in `src/core/ai/providers.ts`.
- **resolveSpec**: Standardwerte → Text (Parser oder KI-Plan) → manuelle Einstellungen. Jedes Feld kennt seine Herkunft (`standard`, `text`, `ki`, `manuell`); Widersprüche werden angezeigt.

## Editor (`src/core/editor/editOperations.ts`)

Befehle speichern pro Zelle den Zustand vorher und nachher (`setBlockCommand`, `removeBlockCommand`, `replaceAllCommand`, `fillBoxCommand`). Nach jeder Änderung laufen Auflöser und Validator im betroffenen Bereich; Partner (obere Türhälfte, Nachbartreppen, Zäune) ändern sich mit, Hinweise („Laterne ohne Halt“) werden gemeldet. Rückgängig stellt den Hash exakt wieder her.

## Vorschau (`src/components/preview/`, `src/core/textures/`)

- Das Modell wird in Würfel zu 32³ Zellen zerlegt und **im Web Worker** gemeshed (ohne Worker in kleinen Stücken auf dem Hauptthread). Jeder Chunk liest seine Nachbarn, alle zusammen ergeben genau das Mesh des ganzen Modells; eine Bearbeitung erneuert nur die betroffenen Chunks.
- **Echte Texturen:** Die Client-Datei des Nutzers wird zur Laufzeit gelesen (`.minecraft-assets/`, nicht im Repo). Das Modell-Backen bildet das Spiel nach (Varianten, Multipart, Elternketten, UV, Drehungen, `uvlock`); geformte Blöcke erscheinen mit ihrer echten Geometrie. Ohne Texturen zeichnet die Szene Farben aus den Texturstatistiken.
- `data-render-mode` an der Szene zeigt `textures` oder `colors`; `window.__mcbSetView(azimut, höhe, zoom)` dient dem Screenshot-Skript.

## Projekte (`src/lib/persistence/projects.ts`)

IndexedDB über Dexie, Schema Version 2 (Upgrade von 1 ohne Datenverlust). Gespeichert werden Beschreibung, manuelle Einstellungen, Seed, Version, alle Varianten als VoxelTransport (inklusive Bearbeitungen), Auswahl und ein eventueller KI-Plan (mit Plan, Korrekturrunden, Anbieter und gemeldeten Kosten; ältere Projekte ohne diese Felder laden weiter). Beim Laden: Migration, Schema, Registry, Grenzen und Hashes.

## API-Verträge

| Route | Request | Antwort / Fehler |
|---|---|---|
| `POST /api/generate` | `{ spec, variants? }` (max. 16 KiB) | `{ generator, profile, variants[{ seed, hash, dimensions, totalBlocks, model }], selection: { candidates, scores }, warnings }` (Hinweise auch zu nicht lesbaren Detail-Kits). Fehler: 400 (Schema/JSON), 413 (zu groß), 422 (passt nicht in die Grenzen) |
| `POST /api/export` | `VoxelTransport` (max. ≈ 37 MiB) | `.schem` mit `Content-Disposition: attachment` und `X-MCB-Voxel-Hash`. Fehler: 400 (Modell abgelehnt), 413, 422 (Selbstprüfung) |
| `GET /api/ai/settings` | – | `AiSettingsView`: `{ provider, source: 'app'\|'env'\|'default', openrouter: { model, reasoning, hasKey, keyHint, keyFromEnv }, ollama: { baseUrl, model }, storedIn, fileProblem? }` – **nie** der Schlüssel selbst |
| `PUT /api/ai/settings` | `AiSettingsUpdate`: `{ provider, openrouter?: { model?, reasoning?, apiKey?: string\|null }, ollama?: { baseUrl?, model? } }` (max. 4 KiB, streng geprüft; `apiKey: null` löscht) | neue `AiSettingsView`. Fehler: 400 `{ error, issues }` (deutsch), 403 (nicht `localhost` oder nicht von der App selbst), 413, 500 (Datei nicht schreibbar) |
| `GET /api/ai/status` | – | `AiStatus`: `{ enabled, provider, model, reachable, modelInstalled, installedModels, message, label?, creditUsd?, price?, problem? }`; kostet nichts (OpenRouter: `GET /key`, `/credits`, `/models`; Ollama: `/api/tags`; aus: kein Netzwerk) |
| `GET /api/ai/models?model=<id>` | – | `ModelCatalogResponse`: `{ live, fetchedAt, models[{ id, name, price, contextLength, structuredOutputs, available? }], message? }`; Modellliste 1 h im Speicher, sonst Schnappschuss mit `live: false`. Fehler: 400 (ungültige ID) |
| `POST /api/ai/plan` | `{ description }` (nur von der App selbst) | `{ source: 'openrouter'\|'ollama', model, durationMs, attempts, examples, fromThinking, thinkDropped, costUsd, usage?, paramsDropped?, provider?, plan, patch }`. Fehler `{ error, code, issues, costUsd? }`: 503 (`disabled`, `no_key`, `unreachable`), 504 (`timeout`), 402 (`credits`), 429 (`rate_limit`), 502 (`invalid`, `auth`, `model`, `unsupported`, `upstream`, `http`), 403 (fremde Herkunft) |
| `GET /api/textures` | – | Status der Texturen (Version, Quelle, Kandidaten) |
| `GET /api/textures/resources` | – | Blockstates, Modelle und Texturen für alle Registry-Blöcke; 404 ohne Texturen |
| `POST /api/textures/import` | Rohdaten der `.jar` (max. 200 MB) | Status. Fehler: 400, 413, 422 |
| `POST /api/textures/download` | `{ version, acceptEula: true }` | Status. Fehler: 400, 502 |

### Transportformat `VoxelTransport`

```json
{ "schemaVersion": 1, "dimensions": {…}, "palette": […], "indexEncoding": "rle-varint-base64",
  "indices": "<base64>", "origin": {"x":0,"y":0,"z":0}, "spec": BuildSpec, "hash": "<64 hex>" }
```

- `rle-varint-base64` (Standard): Läufe gleicher Indizes als VarInt-Paare. Ist RLE größer, wird automatisch `u16le-base64` (little-endian uint16) geschrieben; beide werden gelesen.
- `decodeVoxelTransport` prüft auf Server **und** Client: Schema, Grenzen, Kodierung, Länge, Registry, Indizes und Hash.

## Export (Sponge Schematic v3)

1. Das Modell wird geprüft; die Zielversion bestimmt das Profil (1.21.11 → DataVersion 4671, 1.21.1 → 3955) und die Blocknamen.
2. NBT: `""` → `Schematic` mit `Version` 3, `DataVersion`, `Metadata`, `Width`/`Height`/`Length`, `Offset` [0, −N, 0] (N = Lagen „Fundament nach unten“, sonst 0) und `Blocks` (`Palette`, `Data` als VarInt-ByteArray, leere `BlockEntities`). Big-Endian, GZip; Strings werden auf Javas „modified UTF-8“ geprüft.
3. Ein **eigener, unabhängiger NBT-Leser** liest die Datei sofort wieder ein und vergleicht Layout, Typen, VarInts, jeden Block und den Hash. Erst danach startet der Download.
4. Der echte WorldEdit-Reader (EngineHub WorldEdit 7.4.2, `tests/worldedit/`, `npm run test:worldedit`) liest im Test jeden Registry-Blockzustand und alle Bauwerke identisch ein.
