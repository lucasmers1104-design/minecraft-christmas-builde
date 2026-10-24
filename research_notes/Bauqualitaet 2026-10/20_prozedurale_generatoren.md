# Prozedurale Gebäudegeneratoren: GDMC, Fachliteratur, Open-Source-Generatoren und Qualitätskriterien

Stand: 2026-10-23. Thema: Was erfolgreiche Gebäudegeneratoren (GDMC-Einreichungen, Shape- und Split-Grammatiken, WFC, Layout-Optimierung, Open-Source-Werkzeuge) technisch anders machen und welche Module, Datenformate und Qualitätsprüfungen der Christmas Builder daraus übernehmen sollte.

Abgrenzung: Wand-, Dach-, Fenster-, Paletten- und Wintertechniken gehören zu den anderen Themen (01–19). Hier geht es um die **Generator-Architektur**: Grammatik, Module, Variation, Bewertung. Die vorhandene Notiz `research_notes/Minecraft Bautechniken für Generator/prozedural_und_ki.md` (im Folgenden „Altnotiz“) wird vorausgesetzt. Neu sind hier: Jury-Kommentare im Wortlaut, GDMC 2021–2023, CGA- und Split-Semantik mit Ganzzahl-Regeln, Tome-Quellcode zu Stil-Rezepten, Requisiten, Irimoya und Engawa, Merrells Stilvorlage, Metrik-Studien und konkrete TypeScript-Schnittstellen.

**Korrekturen zur Altnotiz**
- In der Altnotiz steht, die Top-Einreichungen nutzten keine Shape-Grammatik im CGA-Stil. Für die GDMC-Sieger stimmt das. Es gibt aber eine Minecraft-spezifische Grammatik-Arbeit, SIGI (ICCC 2021) [13]. Außerdem ist Tomes Wandpipeline (Segmente → Füllung → Rahmen → Öffnungen) faktisch eine Split-Grammatik ohne Grammatik-Syntax [35].
- Die Altnotiz folgert aus „Impressions“, Variation innerhalb eines Generators lohne sich wenig. Die Auswertung der Jury-Kommentare 2018–2020 zeigt das Gegenteil: Variation zwischen den Häusern einer Siedlung wird häufig und meist als *fehlend* kommentiert, obwohl sie kein offizielles Kriterium ist [1]. Für unsere drei Varianten pro Generierung heißt das: Diversität ist ein Qualitätsmerkmal.
- Der Stil `japanese` nutzt `half_hip` (Krüppelwalm) als häufigstes Dach (`styles.ts:181`). Das typische japanische Wohn- und Tempeldach ist aber das Irimoya: unten Walm, oben Giebel [36]. Der Krüppelwalm ist das Gegenteil, nämlich ein Giebel, den oben ein kleiner Walm kappt (`roofEngine.ts:199`).

---

## Kurzfassung

Sortiert nach Wirkung auf den Eindruck „von Profis gebaut“.

1. **Ein einziges störendes Detail kippt das Urteil.** Maßstab der Jury ist die „Suspension of Disbelief“; „single discordant details can have a strong negative impact“ [1]. → Eine Abnahmeschicht mit weichen Lints bringt mehr als neue Features.
2. **Variation hat ein Goldlöckchen-Fenster.** Jede Achse gehört in eine von drei Klassen: immer variieren, Zielwert (Qualität) oder einmal wählen und halten (Stil) [1]. → Klasse pro Parameter in die Stildaten.
3. **Top-down statt lokal:** Masse → Fassade → Geschoss → Feld → Detail [14][15][22][28]. Lokale Verfahren ohne globale Struktur wirken beliebig: WFC [27], gelernte Grammatiken [13], CA-Fenster („disorienting“ [11]). → Fassaden-Grammatik-Modul zwischen Plan und Vorlagen.
4. **Geschosshierarchie:** eigenes Erdgeschoss, wiederholte Obergeschosse, eigenes oberstes Geschoss und Giebel [18][19]. Bei uns gilt eine Fensterliste für alle Geschosse (`openings.ts:243`).
5. **Fallback-Kette pro Fensterplatz** mit Verdeckungstest: nächstkleineres Fenster, sonst keins [14][22]. `placeIfFits` prüft schon, aber nur mit der globalen Stilliste.
6. **Gemeinsame Achsen** für Fenster, Tür, Gauben und Giebelfenster, wie Wonkas Kontrollgrammatik [15] und die CGA++-Events [16].
7. **Rhythmus über Indexmuster** (A-B-A [18]; Unreal `*`, `+`, `{A:2,B:1}`, `<A,B,C>` [30]) statt eines Fensters in jedem Fachwerkfeld (`openings.ts:262-277`).
8. **Ein Signaturbauteil statt aller Features** [1]. Detailgrad 3 multipliziert heute nur Feature-Wahrscheinlichkeiten (`resolveInput.ts:68`). *Einschätzung:* Detailgrad soll Mikrodetail steuern.
9. **Stil als Rezept mit Pools:** Poolgröße = interne Varianz, 60/30/10 dominant/sekundär/Akzent, `rare`, lokales Holz 60 % (Tome) [33].
10. **Bewohnte Spuren sparsam:** im Mittel 1,3 Requisiten pro Haus, höchstens 3, Abstand ≥ 3, nie vor Türen [34]; Streudeko per Poisson-Disk [10].
11. **Metriken treffen Ästhetik kaum:** keine signifikante Korrelation mit Aesthetics; Blocktypenzahl ↔ Narrative r = 0,81 [2]. → Metriken als Diagnose (Expressive Range [32]) und Lints, nicht als Zielgröße.
12. **Diversität der Varianten erzwingen** (Arnis-Gitter [40], Neuheit k = 15 [12]). Heute: Seed + 1, Seed + 2 (`generateBuilding.ts:259-266`).
13. **Materialtausch allein wird langweilig:** im ersten Jahr innovativ, im vierten „boring“ [1]. → Formvariation zuerst.
14. **Module brauchen Ausschlusslisten, Randbedingungen und vorab gesetzte Signaturmodule** [29], Altnotiz (MGAIA).
15. **Sockel in Proportion:** „too big foundations with respect to house sizes“ [3][4].

---

## Schwächen des aktuellen Generators

Quellen: Code-Stand im Repo, Screenshots in `docs/screenshots/`.

| # | Schwäche | Beleg | Warum das zählt |
|---|---|---|---|
| S1 | **Keine Geschosshierarchie.** Für jedes Geschoss gelten dieselben Kandidatenfenster, und auch die Fensterhöhe berechnet sich überall gleich. | `openings.ts:243` (`candidates` ohne Bezug zu `k`), `openings.ts:247` | CGA und CityEngine trennen Erdgeschoss, Obergeschoss und oberstes Geschoss [18][19]. Ohne Hierarchie wirken Fassaden gestapelt statt gebaut. |
| S2 | **Leere Giebeldreiecke.** `gableCells` wird „for windows and beams“ berechnet, aber im Hausgenerator nie verwendet. | `roofEngine.ts:95-96`. Verwendung nur in `geometry.ts`/`tower.ts`. Screenshots: haus-mittelalter-gross, haus-rustikal-gross | Der Giebel ist die größte Fläche der Schauseite. Bei Merrell ist er ein eigener Fassadenteil [22]. |
| S3 | **Schornstein auf der Giebel-Mittelachse.** `u = floor(len/2) + (len > 7 ? 1 : 0)`, gesetzt bei d = +1/+2 vor die Giebelwand | `components.ts:153-154`. Screenshots: mittelalter, rustikal, nordisch | Er verdeckt genau die Achse, auf der Giebelfenster, Kehlbalken oder Firstzier sitzen würden. |
| S4 | **Einfarbige Dachflächen.** Jede Dachspalte ist entweder `m.trim` oder `m.roof`, ohne Varianten oder Rauschen. | `roofEngine.ts:248-249`, `palettes.ts:2-4` („One material per role“) | Die größten Flächen im Bild sind am monotonsten (alle Screenshots). Details stehen im Dach-Thema. |
| S5 | **Varianten ohne Diversitätsgarantie** (Seed, +1, +2) | `generateBuilding.ts:259-266` | Drei fast gleiche Häuser sind möglich. Ein Kaleidoskop-Effekt entsteht, wenn der Nutzer den Raum der möglichen Häuser durchschaut [1]. |
| S6 | **Detailgrad = Anzahl der Bauteile.** Wahrscheinlichkeiten werden mit 0,5 bzw. 1,4 multipliziert. | `resolveInput.ts:68` | Bei hohem Detailgrad entsteht „Feature-Suppe“: Rundturm, Erker, Balkon, Veranda und Gaubenreihe zugleich (Screenshot haus-mittelalter-rundturm-erker-balkon-1). |
| S7 | **Ein Fenster in jedem Fachwerkfeld.** Nur bei `few` bleibt jedes zweite Feld frei. | `openings.ts:262-277` | Es entsteht ein gleichförmiges Gitter ohne Blindfelder. Muster wie A-B-A fehlen [18]. |
| S8 | **Lints prüfen fast nur Statik.** Ästhetik deckt allein „flache Wand > 5“ ab. | `buildingLints.ts:97-178` | Rhythmus, Achsen, Giebel, Fokus, Sockelanteil, Fremdkörper und Diversität werden nicht geprüft. |
| S9 | **Prioritäten nur als Zahlen, Bauphasen fest verdrahtet** | `geometry.ts:25-35`, `buildHouse.ts:109-145` | Neue Detailschritte lassen sich nur mit Code-Eingriff einfügen. Budgets, Abstände und Protokolle pro Schritt fehlen. |
| S10 | **Sockelschürze rundum auf allen Seiten** (Treppen bei d = +2) | `walls.ts:113-122` | Zusammen mit der Wegfläche entsteht ein breiter grauer Ring (Screenshots modern, japanisch). Die Jury kritisiert zu große Fundamente [3]. |
| S11 | **Japanisch: Krüppelwalm statt Irimoya, nur ein Fenstertyp** | `styles.ts:181`, `styles.ts:192` (`windows: ['W15']`) | Gestufte Vollblock-Ringe ohne Eckhub (Screenshot haus-japanisch-gross). Tome baut Irimoya mit Eckhub [36]. |
| S12 | **Modern: Flachdach mit Wahrscheinlichkeit 1** | `styles.ts:235` (`roofTypes: { flat: 1 }`) | Alle drei Varianten haben dieselbe Silhouette (Screenshot haus-modern-gross). |
| S13 | **Geschenke als Wollwürfel mit Teppich** | `festive.ts:17`, `festive.ts:164-171` | Einzelne gesättigte Vollblöcke wirken wie Fremdkörper (Screenshots …-weihnachten). Details stehen im Weihnachtsthema. |
| S14 | **Tote Bedingungen** `… \|\| true` | `walls.ts:161`, `walls.ts:247` | Kein Fehler im Bild, aber die Absicht (Ständerraster nur in bestimmten Geschossen) bleibt unklar. |
| S15 | **Keine Requisiten an der Außenwand** (Garten und Laternenpfähle gibt es) | `landscape.ts:7-13`, `festive.ts` | Häuser wirken „hingestellt“ statt „bewohnt“ [34]. |

Was schon gut ist und bleiben soll: Rollen statt Blöcken in Vorlagen (wie bei Tome und Grimoire), geforkter Seed pro Teil, Fallback auf eine schlichte Scheibe statt eines Lochs (`openings.ts:93-107`), ein Fenstertyp pro schlichter Fassade auf symmetrischen Achsen (`openings.ts:279-299`), ungerade Breiten (`plan.ts:184`) und der Ständerraster mit ungerader Feldzahl (`studs.ts`).

---

## Techniken und Regeln

Konvention der Skizzen: kanonische **Südfassade** (Außenseite +Z), Ansicht von außen, x nach rechts, y nach oben. Die Tiefe d steht in der Legende: −1 innen, 0 Wand, +1/+2 davor. Blockzustände sind für diese Südfassade angegeben. Beim Setzen dreht `templates/place.ts`.

### T1 Geschoss-Split-Grammatik (Fassadenhierarchie)

**Beschreibung.** Die Fassade wird senkrecht geteilt in Sockel, Erdgeschoss, wiederholte Obergeschosse, optional Kniestock, Traufe und Giebel. Jedes Geschoss wird waagerecht geteilt in Eckfeld, Feldfolge und Eckfeld. CityEngine teilt die Vorderfassade in ein Erdgeschoss mit fester Höhe und wiederholte Obergeschosse mit ungefährer Höhe. Das `~` garantiert dabei eine ganze Zahl an Geschossen [18][19]. Auch die Feldfolge selbst bekommt eine Hierarchie: Ecke, Felder, Ecke [18].

**Grammatik** (CGA-ähnlich, Ganzzahl-Semantik):
```
Fassade      → split(y){ 1: Sockel | FH: EG | { FH: OG(k) }* | Traufe }
EG           → split(x){ 1: Ecke | ~1: Felder_EG | 1: Ecke }
Felder_EG    → spiegel( { 3: FensterEG | 1: Pfeiler }* , zentrum = 3: Tür )
OG(k)        → split(x){ 1: Ecke | ~1: muster("A B A", k) | 1: Ecke }
A            → <W04, W02, W01>          // bevorzugt, sonst kleiner (T4)
B            → <Blindfeld_Streben, Wand>
```

**Skizze.** Ansicht Süd, Traufseite, Mittelalter, x = 0..12, y = 1..11 (y = 0 Fundament).
```
y\x  0 1 2 3 4 5 6 7 8 9 0 1 2
11   R R R R R R R R R R R R R   Traufe
10   B B B B B B B B B B B B B   Rähm
 9   L W W W L Q W Q L W W W L
 8   L T G T L W W W L T G T L   OG: A | B | A
 7   L T G T L W W W L T G T L
 6   L W K W L Q W Q L W K W L
 5   B B B B B B B B B B B B B   Schwelle (Jetty-Konsolen darunter)
 4   S S S S S S S S S S S S S
 3   S G G S S S D S S S G G S   EG: Fenster 2 breit | Tür | Fenster 2 breit
 2   S G G S S S D S S S G G S
 1   C C C C C C P C C C C C C   Sockel
```
Legende: C = cobblestone (d = 0), S = stone_bricks (d = 0), L = dark_oak_log[axis=y] (d = +1), B = stripped_dark_oak_log[axis=x] (d = +1), W = white_terracotta (d = 0), G = glass_pane (d = 0), T = spruce_trapdoor[facing=south,half=top,open=true] (d = +1), K = spruce_stairs[facing=north,half=top] (Sims, d = +1), Q = dark_oak_stairs (Strebe d = +1, Zustände wie `addBraces`, `walls.ts:200-214`), D = spruce_door (d = 0, aus Vorlage T01), P = cobblestone_stairs[facing=north,half=bottom] (Stufe, d = +1), R = spruce_stairs[facing=north,half=bottom] (d = +1/+2).

**Einsatz.** Alle Stile mit mindestens 2 Geschossen. Bei `modern` ist das Erdgeschoss die Glas- bzw. Eingangszone und das Obergeschoss ein Bandfenster.
**Wirkung** hoch · **Aufwand** mittel · **Stile** alle.
**Quellen** [14][18][19]. Die Ganzzahl-Semantik ist eine *Einschätzung* (eigene Übertragung).

### T2 Indexmuster für den Feldrhythmus (A-B-A, A-A-B-A-A)

**Beschreibung.** CityEngine erzeugt versetzte Muster mit `case tileIndex%2 + floorIndex%2 == 1` und gibt dafür den Geschossindex an jedes Feld weiter [18]. Unreal kennt `[A,B]*` (so oft wie möglich), `+` (mindestens einmal), `{[A,P]:2,[BL,P]:1}` (gewichtet) und `<A,B,C>` („A, wenn genug Platz, sonst B, dann C“) [30]. Für Minecraft genügen benannte Muster, die zur Mitte gespiegelt werden.

**Regeln** (*Einschätzung*, abgeleitet aus [18][30] und der Ständer-Tabelle in `studs.ts`):
| Felder n | Standard | `few` | `many` | Erdgeschoss mit Tür in der Mitte |
|---|---|---|---|---|
| 3 | A B A | B A B | A A A | A D A |
| 5 | A B A B A | B A B A B | A A A A A | A B D B A |
| 7 | A A B A B A A | B A B B B A B | A A A A A A A | A A B D B A A |
| 9 | A B A A B A A B A | B A B B A B B A B | – | A B A B D B A B A |

A = Fensterfeld, B = Blindfeld (Gefach mit Streben, Kreuz oder schlicht), D = Türfeld. Im OG steht über D ein A oder ein Erker bzw. Balkon (T5). Ein Blindfeld darf nie über einem Fenster stehen, dessen Achse oben weitergeführt wird (T5).

**Skizze.** OG-Reihe y = 7, n = 5 Felder à 3 Blöcke:
```
x:  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0
    L T G T L W Q W L T G T L W Q W L T G T L
       A       B       A       B       A
```
Legende wie T1. Q steht hier für die Zier des Blindfelds: entweder das Strebenpaar aus T1 oder ein einzelner dark_oak_fence-Pfosten mittig bei d = +1 (*Einschätzung*).

**Wirkung** hoch · **Aufwand** niedrig · **Stile** medieval, fantasy, rustic, nordic, mediterranean (Fensterachsen), japanese (Shoji-Felder, siehe T7).
**Quellen** [18][30].

### T3 Ecke auf einem Pfeiler

**Beschreibung.** Arnis: „A glass tower with glass carried straight around its corners reads as a box of panes; a real one almost always turns the corner on a pier“ [39]. Arnis klassifiziert jedes Wandstück außerdem als Street, Rear, Party oder Open und plant Spalten als `End`, `Pier` oder `Window` [39]. Für Ecken mit Rahmen gilt dasselbe aus Builder-Sicht: Boris empfiehlt, Module über ihr Verhalten an den Ecken zu entwerfen [27].

**Regel.** Fenster und Bänder enden mindestens 1 Block vor der Gebäudeecke, bei `modern` mindestens 2. Das prüft `axesFor` schon mit einem Rand von 1 (`openings.ts:152-158`). Für das Bandfenster W16 und künftige Glasfronten wird es ausdrücklich zur Regel. Eine Glasecke ist nur eine bewusste Ausnahme (Flag `cornerGlass` in der Vorlage).

**Skizze.** Ansicht Süd, modern, y = 2..3.
```
x:  0 1 2 3 4 5 6 7 8 9 0
y3  Q Q G G G G G G G Q Q
y2  Q Q G G G G G G G Q Q
```
Legende: Q = smooth_quartz (Pfeiler, d = 0), G = glass_pane (d = 0). Falsch wäre G bis x = 0 und um die Ecke herum.

**Wirkung** mittel · **Aufwand** niedrig · **Stile** modern, mediterranean, japanese (Eckpfosten).
**Quellen** [39][27].

### T4 Verdeckungstest mit Fallback-Kette pro Fensterplatz

**Beschreibung.** CGA prüft per Verdeckungsabfrage, ob ein Fenster oder eine Tür andere Wände schneidet, und stellt sicher, dass Türen auf Terrasse oder Straße führen [14]. Merrell: „If a window is obstructed by a roof segment from a lower floor, the system defaults to a smaller window type, if available. If the obstruction is too great for any available window type, no window is placed.“ Im Eingangsraum ersetzt die Tür das mittlere Fenster [22]. Unser `placeIfFits` testet alle Zellen mit d ≥ 1 (`openings.ts:44-87`). Die Fallback-Reihenfolge ist aber die globale Vorlagenliste des Stils, nicht eine Kette pro Fensterplatz.

**Regel.** Jeder Fensterplatz bekommt eine eigene Kette `<Wunsch, kleiner, ohne Laden, schlicht, nichts>`. Dabei gilt „nichts“ nur, wenn auch eine vertiefte Scheibe kollidiert. Jeder Abstieg wird protokolliert, z. B. `W04→W02 wegen Vordach bei d = +1`.

**Skizze.** Schnitt durch die Fensterachse über einem Vordach, Blick nach Westen.
```
y\d  -1  0  +1  +2  +3
 7    .  W   .   .   .
 6    .  G   T   .   .     W04: Laden T bei d=+1 ok
 5    .  G   X   .   .     X = Kollision Laden ↔ Vordach → Abstieg auf W02 (ohne Laden)
 4    .  W   R   .   .     W02: Sims bei y=4,d=+1 kollidiert → Abstieg auf W01 (1 hoch, y=6)
 3    .  W   F   R   .
 2    .  W   .   F   R     R = spruce_stairs[facing=north,half=bottom] (Vordach)
```
Legende: W = Wand, G = glass_pane, T = spruce_trapdoor[facing=south,half=top,open=true], F = spruce_slab[type=top] (Untersicht).

**Wirkung** mittel · **Aufwand** niedrig · **Stile** alle.
**Quellen** [14][22].

### T5 Gemeinsame Achsen für Geschosse, Dach und Bauteile

**Beschreibung.** Wonkas Split-Grammatik hat eine eigene Kontrollgrammatik, die Attribute (z. B. Texturen) über die ganze Struktur verteilt [15]. CGA++ erlaubt Operationen über mehrere Shapes und koordiniert sie über „Events“ mit Gruppierung und Synchronisierung. Diese Aufgabe war vorher in kontextfreien Regeln unmöglich, weil eine Regel die anderen Shapes nicht kennt [16]. Übertragen heißt das: Die Masse berechnet einmal eine Achsenliste. Fenster, Tür, Erker, Gauben und Giebelfenster bekommen dieselbe Liste.

**Regeln** (*Einschätzung*):
1. Jede Öffnung in einem Obergeschoss liegt auf einer Achse, die auch im Erdgeschoss eine Öffnung, die Tür oder einen Pfeiler hat.
2. Gauben liegen auf Fensterachsen, auf der Mittelachse oder symmetrisch dazu, nie über einem Blindfeld.
3. Das Giebelfenster liegt auf der Mittelachse des Giebels, der Schornstein auf einer Nebenachse (S3).

**Skizze.** Ansicht Süd, Breite 11, Achsen bei x = 2, 5, 8.
```
y\x  0 1 2 3 4 5 6 7 8 9 10
12   . . . . R G R . . . .    Gaube auf Achse 5
11   R R R R R R R R R R R    Traufe
 8   W W G W W G W W G W W    OG: Fenster auf 2, 5, 8
 7   W W G W W G W W G W W
 3   W W G W W D W W G W W    EG: Fenster 2, Tür 5, Fenster 8
 2   W W G W W D W W G W W
```
Legende: W = Wandrolle, G = glass_pane (d = 0), D = Tür (Vorlage), R = Dachrolle (Treppe).

**Wirkung** hoch · **Aufwand** mittel · **Stile** alle außer `rambling`-Asymmetrie. Auch dort sollen Achsen untereinander durchlaufen.
**Quellen** [15][16]. Regeln: *Einschätzung*.

### T6 Giebelfeld als eigener Platz (Kehlbalken, Giebelfenster, Lüftung)

**Beschreibung.** Bei Merrell ist der Giebel „a triangular shape below the roof that becomes part of the façade“. Ob ein Giebel entsteht, steht in der Stilvorlage [22]. Unser Dachmodul liefert die Zellen schon (`roofEngine.ts:95-96`), aber kein Schritt füllt sie (S2).

**Regeln** (*Einschätzung*):
- Giebel mit mindestens 9 Zellen Fläche: ein Kehlbalken in der Rahmenebene d = +1 auf etwa 1/3 der Giebelhöhe, mindestens 2 Reihen über dem Rähm.
- Darüber auf der Mittelachse ein Giebelfenster 1 × 1 (bei Breite ≥ 11 auch 1 × 2).
- Bei Breite ≥ 13 links und rechts zusätzlich eine Strebe als Treppe in d = +1.
- `modern`: kein Giebel. `japanese`: Giebelfeld nur beim Irimoya (T9), mit Holzgitter aus bamboo_fence oder spruce_fence in d = 0.

**Skizze.** Giebelansicht Süd, Breite 9 (x = 0..8), y relativ zur Wandoberkante.
```
y\x  0 1 2 3 4 5 6 7 8
+5   . . . . F . . . .
+4   . . . r W r . . .
+3   . . r W G W r . .
+2   . r W W G W W r .
+1   r K K K K K K K r
 0   B B B B B B B B B
```
Legende: F = dark_oak_slab[type=bottom] (First), r = Ortgang (Dachmodul), W = Giebelfüllung (Rolle `infill`, d = 0), G = glass_pane (d = 0), K = stripped_dark_oak_log[axis=x] (Kehlbalken, d = +1), B = Rähm aus dem Dachmodul.

**Wirkung** hoch · **Aufwand** niedrig · **Stile** medieval, fantasy, rustic, nordic, cherry. Bei mediterranean nur ein Rundfenster W08.
**Quellen** [22]. Maße: *Einschätzung*.

### T7 Shoji-Teilung der Wand (Tome)

**Beschreibung.** Tome baut japanische Wände als „white shoji panels over a timber baseboard, divided by evenly spaced vertical beams so the white panels read as 2–4 blocks wide“. `beam_indices(len)` wählt die Ständerzahl, deren Felder möglichst nahe an 3 liegen. Jedes Feld bleibt zwischen 2 und 4 breit, breitere Felder kommen zur Mitte. Wandstücke mit 4 oder weniger Zellen bleiben ein einziges Feld [35]. Die Füllung kommt *vor* Rahmen und Öffnungen, sodass beide sie überschreiben dürfen [35].

**Regel.** Für Länge L werden Ständer k gesucht, sodass jedes Feld (L − k)/(k + 1) im Bereich [2, 4] liegt und |(L − k) − 3(k + 1)| minimal wird. Beispiel L = 11: k = 2, Felder 3/3/3.

**Skizze.** Ansicht Süd, Wandlauf 11 plus Eckpfosten.
```
y\x  0 1 2 3 4 5 6 7 8 9 0 1 2
 4   L B B B B B B B B B B B L
 3   L W W W V W W W V W W W L
 2   L W W W V W W W V W W W L
 1   L P P P P P P P P P P P L
```
Legende: L = dark_oak_log[axis=y] (Eckpfosten, d = +1), B = dark_oak_log[axis=x] (d = 0), W = white_concrete (d = 0), V = dark_oak_log[axis=y] (Teilungsständer, d = 0), P = dark_oak_planks (Sockelbrett, d = 0). Shoji-Fenster W15 ersetzen einzelne W-Felder.

**Wirkung** hoch · **Aufwand** niedrig · **Stile** japanese, cherry.
**Quellen** [35][33] (Stilkatalog „White Slate“, „Bamboo Roof“ usw. mit Wänden aus weißem Beton).

### T8 Engawa: eingerückter Baukörper mit Holzdeck und umlaufendem Pultdach (Tome)

**Beschreibung.** Bei großen Grundrissen rückt Tome alle Geschosse um **2** auf jeder freien Seite ein. Das Gebäude steht **1** Block erhöht auf einer Holzplattform. Ein **2** tiefes Deck läuft als Ring ums Haus, auch um Ecken und Anschlüsse. Ein umlaufendes Dach auf Höhe der Erdgeschossdecke deckt das Deck ab: innen Vollblöcke an der Wand, außen Treppen als Traufe, die Diagonalecken gefüllt. Das gilt nur, wenn die Seite nach dem Einrücken noch nutzbar ist. Mit INSET = 2 braucht man eine Nennseite von mindestens 8 [37]. Das Deck wird *nach* dem Hauptdach gelegt [37][38].

**Skizze.** Schnitt quer zur Traufwand, Blick nach Westen, d relativ zur eingerückten Wand.
```
y\d  -1  0  +1  +2
 5    .  H   F   S      F = dark_oak_planks (innerer Ring), S = dark_oak_stairs[facing=north,half=bottom]
 4    .  W   .   .      W = Wand (T7)
 3    .  W   .   .
 2    .  W   .   .
 1    .  P   D   D      D = spruce_planks (Deck, 2 tief), P = Plattform unter der Wand
 0    C  C   C   C      C = Fundament (plinth-Rolle)
```
H = Rähm. Auf dem Deck braucht es keine Brüstung. Pfosten: dark_oak_fence bei d = +2 alle 3–4 Blöcke unter S (*Einschätzung*, Tome setzt keine Pfosten).

**Wirkung** hoch · **Aufwand** mittel · **Stile** japanese, cherry (large/huge).
**Quellen** [37][38].

### T9 Irimoya als Höhenfeld (Tome)

**Beschreibung.** Das Irimoya ist ein Walmdach, dessen *oberer* Teil zum Giebel geöffnet ist. Unten umläuft der Walm alle vier Seiten (mit Eckhub `sorihafu`), in der Mitte steigt die Fläche zu einem Längsfirst, und an beiden Enden schließt ein senkrechtes Giebeldreieck (Pediment) ab [36]. Tomes Konstanten:
- `IRIMOYA_RISE = 1.0` (ein voller Block pro Schritt)
- `CORNER_LIFT = 1.0` (die vier diagonalen Überstandsecken 1 Block höher)
- `GABLE_OVERHANG = 1`
- `gable_inset = clamp(extent/4, 1, (extent−1)/2)`; der First liegt in Längsrichtung [36]

Höhe je Zelle: h = d_across, falls d_along ≥ inset (Giebelteil), sonst h = min(d_along, d_across) (Walmkappe) [36]. Unsere Dach-Engine arbeitet ebenfalls mit Höhenfeldern (ARCHITECTURE: „Höhenfeld in halben Blöcken“). Irimoya ist also ein weiterer `layoutAt`-Fall.

**Skizze.** Draufsicht Höhenfeld 9 × 15 (Stufen über der Traufe), extent = 14 → inset = 3.
```
d_along: 0 1 2 3 4 5 6 7 6 5 4 3 2 1 0
dA=0     0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
dA=1     0 1 1 1 1 1 1 1 1 1 1 1 1 1 0
dA=2     0 1 2 2 2 2 2 2 2 2 2 2 2 1 0
dA=3     0 1 2 3 3 3 3 3 3 3 3 3 2 1 0
dA=4     0 1 2 4 4 4 4 4 4 4 4 4 2 1 0   ← First; Sprung 2→4 bei d_along=3 = Giebeldreieck
(dA=3..0 gespiegelt)
```
Das Giebeldreieck wird mit Wandmaterial gefüllt [36], bei uns mit `infill` und Holzgitter aus T6. Die Dachfläche überragt das Dreieck in Längsrichtung um 1 (`verge_depth = inset − 1`, mindestens 1) [36].

**Wirkung** hoch · **Aufwand** mittel · **Stile** japanese, cherry. Ersetzt dort den Krüppelwalm als Hauptform.
**Quellen** [36]. Feinheiten der Treppenwahl stehen im Dach-Thema.

### T10 Massen als Zellen-Höhenfeld (Sieger 2022)

**Beschreibung.** Mike's Angels bauen Kirchen u. Ä. aus gleich großen „cell structures“; „a heightmap then encodes the shape of the structure“, eine Zelle der Höhe 8 zwischen niedrigen Zellen ist ein Turm, Variation entsteht über das Höhenfeld [9]. Jury: „great variety of buildings“, „modular variation“ [9]. Ae 7,08 ist die höchste Ästhetiknote in den geprüften Tabellen 2022–2025 (2024: 6,41, 2025: 6,54 laut Altnotiz; 2021 ohne Einzelnoten) [7].

**Regel** (*Einschätzung*): Statt fester Massenarten in `plan.ts` ein Zellraster (5 × 5 oder 7 × 7) mit Geschosszahl pro Zelle; jede zusammenhängende Fläche gleicher Höhe wird eine Masse mit eigenem Dachabschnitt (die Dach-Engine vereinigt per Maximum).

**Skizze.** Zellraster (1 Zelle = 5 × 5 Blöcke), Zahl = Geschosse.
```
.  2  2  2  4      4 = Turm, 2 = Schiff, 1 = Apsis bzw. Anbau
1  2  2  2  .
```

**Wirkung** mittel · **Aufwand** hoch · **Stile** medieval, fantasy, nordic (Bahnhof, Kirche, Halle).
**Quellen** [9][7].

### T11 Sparsame Requisiten an der Außenwand (Tome)

**Beschreibung.** Tome setzt nach dem Rohbau „occasionally“ Haushaltsgegenstände auf den Boden an der Außenwand, damit Häuser „read as lived-in rather than dropped models“ [34]. Die Regeln aus dem Code [34]:
- Zielanzahl aus `[0, 0, 1, 1, 2, 3]`, also im Mittel 1,33, höchstens 3, oft 0.
- Kandidaten sind die Zellen des Rings direkt um den Grundriss, deterministisch gemischt.
- Zwei Zellen vor jeder Tür (d = +1 und +2) sind gesperrt.
- Zwischen zwei Requisiten liegt ein Manhattan-Abstand von mindestens 3.
- Nur auf freiem, festem Boden, nicht auf Weg oder Wasser.
- Liste mit 12 Einträgen („Keep this list 10+ deep so a street shows real variety“).

**Blöcke** [34]: barrel[facing=up], hay_block, potted_azalea_bush, oak_log[axis=x], lantern, flower_pot (in Registry); decorated_pot, composter, cauldron, water_cauldron[level=3], potted_cactus, potted_dead_bush (nicht in Registry). barrel und decorated_pot sind Block-Entities ohne Inhalt, also zulässig. Winter (*Einschätzung*): Brennholz aus 2–3 spruce_log mit `axis` parallel zur Wand unter dem Überstand, potted_spruce_sapling neben der Tür.

**Skizze.** Draufsicht y = 1, Hauswand = #, Tür = D.
```
. . . . . . . . . . . .
. # # # # D # # # # # .
. a . . . x . . . . . b      x = Sperrzone (d=+1, +2 vor der Tür)
. . . . . x . . . . . .      a, b: Abstand ≥ 3 (Manhattan)
```
a = barrel[facing=up], b = potted_azalea_bush.

**Wirkung** mittel · **Aufwand** niedrig · **Stile** alle außer modern (dort 0–1, z. B. potted_azalea_bush).
**Quellen** [34].

### T12 Poisson-Disk für Streudeko (Sieger 2023)

**Beschreibung.** JEB_GEN lässt einen „decoration agent“ die Fläche per Fast Poisson Disk Sampling abtasten und dort Deko wie Straßenlaternen setzen [10]. Poisson-Disk garantiert einen Mindestabstand r ohne sichtbares Raster und ohne Zufallsklumpen.

**Regel** (Radien sind *Einschätzung*): Laternenpfähle r = 7, Blumengruppen r = 3, Büsche r = 4, Geschenke r = 2. Alle Punkte liegen außerhalb der Wegzellen und der Sperrzonen vor Türen.

**Skizze.** Draufsicht Garten, o = Laternenpfahl (r = 7), * = Blumen (r = 3).
```
. * . . . . . o . . . * .
. . . . * . . . . . . . .
o . . . . . . . * . . . o
. . * . . . . . . . . * .
```
Pfahl: spruce_fence ×3, Arm aus spruce_fence, darunter lantern[hanging=true], wie in `landscape.ts:119-138`.

**Wirkung** mittel · **Aufwand** niedrig · **Stile** alle.
**Quellen** [10].

### T13 Stil-Rezept mit Pools, 60/30/10 und lokalem Material (Tome)

**Beschreibung.** Ein Tome-`BuildingStyle` ist eine Basispalette plus Pools je Achse (Holz, Stein, Dach); pro Gebäude wird aus jedem Pool ein Eintrag gezogen, „so internal variance is just pool size“ [33]. Weiter [33]: Eine Siedlung wendet drei Stile 60/30/10 an (dominant, sekundär, Akzent); `rare`-Stile kommen nie auf die ersten beiden Plätze („never blanket a town“); ein Bezirk würfelt nur den Sekundärstil neu; in variablen Holzpools gewinnt das lokale Holz rund 60 % (`LOCAL_WOOD_FRACTION = 0.6`), feste Pools ignorieren das.

**Skizze** (Datenform):
```
style "Whitewash Wattle"  base=medieval_spruce
  wood : [oak, birch, spruce, dark_oak]      → streut
  stone: [cobblestone, stone_bricks]         → streut
  roof : [oak_wood_roof, red_wood_roof, brick_roof]
style "Stone Hall" (rare) wood:[dark_oak] stone:[deepslate] roof:[blackstone_roof] → festes Set
Ort: 60 % dominant · 30 % sekundär · 10 % Akzent (rare)
```

**Übertragung.** Unsere Paletten wählen schon ein Material pro Rolle aus gewichteten Listen (`palettes.ts`). Es fehlen ein `rare`-Flag (nur dritte Variante oder Wahrzeichen) und, für ein künftiges Weihnachtsdorf, das 60/30/10-Schema.

**Wirkung** hoch, sobald es mehrere Gebäude gibt, sonst mittel · **Aufwand** niedrig · **Stile** alle.
**Quellen** [33].

### T14 Module mit Verbindern, Ausschlusslisten und Randbedingungen

**Beschreibung.** marian42: rund 100 Module mit je 6 Verbindern (horizontal „flipped“, „not flipped“, „symmetric“; vertikal Rotationsindex 0–3), Ausschlussregeln für passende, aber hässliche Nachbarn, Randbedingung oben „air“ und unten „solid“, Backtracking bei Widersprüchen [29]. Jigsaw ergänzt `target`, `pool` und `fallback` (Altnotiz), WFC das Vorabsetzen fester Kacheln [25][27].

**Regel** (*Einschätzung*): Verbinder `post`, `wall`, `beam`, `none` an den Seiten von Fassadenmodulen; Ausschlüsse als Daten (z. B. „Laden an Laden“, „Blumenkasten unter Balkon“); vorab gesetzte Signaturmodule; jedes Modul mit `fallback`.

**Skizze.** Modul „Fensterfeld 3 × 3“ (Ansicht), Kanten-Labels.
```
            oben: beam
links: post [ T G T ]  rechts: post
            [ T G T ]
            [ W K W ]
            unten: beam
excludeNeighbours: [shutter_left ↔ shutter_right ohne Wandspalte]
```
Legende wie T1.

**Wirkung** mittel · **Aufwand** mittel · **Stile** alle.
**Quellen** [29][25][27].

### T15 Diversität der Varianten und Anti-Wiederholung

**Beschreibung.** Arnis wählt Fassaden über ein Weltgitter (`cell_x + 2*cell_z`, `CELL_BLOCKS = 8`), pro Patch (`PATCH_CELLS = 3`) rotiert, damit Nachbarn systematisch verschieden sind. Die Shortlist hat `SHORTLIST_MAX = 8` und `SHORTLIST_WINDOW = 0.45`, Strafen z. B. `STOREY_WEIGHT 0.35`, `NO_GROUND_FLOOR_PENALTY 0.15` [40]. Barthet misst Neuheit als mittlere Distanz zu den k = 15 nächsten Nachbarn [12]. Tome bewertet Kandidaten-Grundrisse 0–1 und zieht gewichtet (Altnotiz).

**Regel** für `generateVariants` (*Einschätzung*):
1. N = 8 Kandidaten-Seeds erzeugen.
2. Kandidaten mit harten Lints verwerfen.
3. Behalten, wer Qualität ≥ bester Wert − 0,15 hat.
4. Greedy max-min: zuerst der beste Kandidat, dann jeweils der mit der größten Mindestdistanz zu den schon gewählten.

Merkmalsvektor: Dachtyp, Profil, Flügel, Geschosse, Breite, Tiefe (normiert), Fenster- und Türvorlage, Palette, Turm, Erker, Balkon, Veranda, Seite des Schornsteins. Distanz = gewichtete Hamming-Distanz plus L1 auf den Zahlen.

**Skizze:**
```
Kandidat  Dach      Flügel  OG  Fenster  Palette          Score  gewählt
s+0       gable     –       2   W04      medieval_timber  0.82   1.
s+3       half_hip  L       2   W06      medieval_stone   0.79   2. (Distanz 0.71)
s+5       gambrel   –       3   W02      medieval_tudor   0.74   3. (Distanz 0.64)
s+1       gable     –       2   W04      medieval_timber  0.81   ✗ (Distanz 0.08 zu s+0)
```

**Wirkung** hoch · **Aufwand** mittel (rund 2–3 × Rechenzeit für die Kandidaten) · **Stile** alle.
**Quellen** [40][12].

### T16 Weiche Qualitätsfunktion als Kostensumme

**Beschreibung.** Merrell optimiert per Metropolis über Accessibility-, Dimension-, Floor-Compatibility- und Shape-Terme mit den Zügen Wand verschieben, zusammenschnappen und teilen [23][22]. Übertragbar ist die *Struktur*: getrennte, gewichtete, erklärbare Terme. Weil Metriken Ästhetik nicht abbilden [2], dient die Summe nur zur *Rangfolge* zwischen Kandidaten desselben Stils (T15).

**Regel:** score = Σ wᵢ·sᵢ / Σ wᵢ, mit sᵢ ∈ [0, 1] aus den weichen Lints L1–L12 (Abschnitt „Automatische Qualitätsbewertung“). Gewichte pro Stil sind Daten. Harte Lints (`buildingLints.ts`) bleiben Ausschlusskriterium.

**Skizze:**
```
s(Fokus)=1.0  s(Geschoss)=0.5  s(Achsen)=0.9  s(Giebel)=0.0  s(Sockel)=1.0 …
score = (2·1.0 + 2·0.5 + 2·0.9 + 1·0.0 + 1·1.0) / 8 = 0.73
```

**Wirkung** hoch (über T15) · **Aufwand** mittel · **Stile** alle.
**Quellen** [22][23][2].

---

## GDMC 2018–2025: Gewinner, Gebäudetechniken, Jury

**Bewertung.** Die Jury vergibt pro Kategorie Adaptability, Functionality, Evocative Narrative und Aesthetics 0–10 Punkte. Zur Ästhetik gehören Konsistenz, angemessene Variation und das Fehlen störender Merkmale [5] (Details in der Altnotiz). Schon das Gründungspapier kritisiert Vanilla-Dörfer: wiederholte Gebäude und Türen über dem Boden an Hängen. Templates erlaubten „little variation between the buildings“ [5].

| Jahr | Sieger (Gesamt) | Gebäude-Technik | Quelle |
|---|---|---|---|
| 2018–2020 | Ergebnisseiten im Wiki nicht abrufbar (404) | Jury-Kommentare dieser Jahre sind ausgewertet in [1] und [3] | [1][3] |
| 2021 | Tsukuba Team, 5,34 | mehrere Dörfer mit Interaktion; im Feld: Agenten, A*-Wege, Biomanalyse, **WFC für Gebäudevarianten**, Bedarfssimulation | [6] |
| 2022 | Mike's Angels, 6,54 (A 5,88 · F 6,38 · N 6,83 · **Ae 7,08**) | iterative Agenten-Simulation von der Mitte nach außen, Zellstrukturen mit Höhenfeld (T10), periodische Mauertürme, Savitzky-Golay-geglättete Mauerkronen; 4. Platz CharlieMDRz mit „handmade palette generators unique to each town“ | [7][9] |
| 2023 | JEB_GEN_, 5,98 (A 6,40 · F 5,80 · N 5,40 · Ae 6,30) | handgebaute NBT-Häuser mit Materialtausch je Biom (7 Biomklassen), **Ausbaustufen** (ein aufgewertetes Gebäude wird größer), Bauplatzwahl per Score, Poisson-Disk-Deko (T12) | [8][10] |
| 2023 Ehrungen | MGAIA (WFC für modulare Gebäude), Castle Lover (Geometrie und Gradienten) | – | [8] |
| 2024 | Frightful Hobgoblin, 6,10 | siehe Altnotiz (Simulation, Stil nach Biom) | Altnotiz |
| 2025 | Gaussianly Filtered, 5,95; 2. TOME, 4,71 | siehe Altnotiz; Tome-Code in T7–T9, T11, T13 | Altnotiz, [33]–[38] |

### Was die Jury an Gebäuden lobt

- „the buildings were varied but still held to a clear architectural style“ bzw. „aesthetically similar enough to clearly come from a single architectural style, while also different enough to prevent repetition“ [4].
- Mehrere erkennbare Gebäude-Archetypen, verteilt nach ihrer Funktion (Cook) [3].
- Ein wichtiges Gebäude, das räumlich gesetzt und ins Gelände eingebunden ist [3].
- Signaturgebäude wie Windmühlen oder eine Einschienenbahn „provided anchoring points“ [1].
- Ruinenartige Steinstrukturen mit Moos lösten Erkundungslust aus, Fernández-Varas „wieners“ [1].
- Material passend zur Umgebung: „log houses in a heavily wooded colder area, or Adobe-style housing in the desert“ [1].
- Bei Mike's Angels: „great variety of buildings“, „modular variation in some buildings“ [9].

### Was die Jury an Gebäuden kritisiert

- „produced by children or new players“, „limited ‘artistic’ architectural expression“ (Butler). Gute Eigenschaften kleiner Häuser werden nicht auf große, komplexe Gebäude übertragen [3].
- Hochhäuser „looks the same due to no internal decorations“ (Hadley) [3].
- „too big foundations with respect to house sizes seem to be out of balance“, „consistency breaches“, die die Immersion zerstören (Preuss & Fischer) [3]. Ebenso: „large foundations that made these houses look unusually prominent or peculiar“ [4].
- Generatoren bauen „the same settlement regardless of the space“ (Cook) [3].
- Überlappende Gebäude, schwebende Bauten, Bauten halb über einer Klippe auf einem Riesenfundament [1].
- Falsch skalierte Räume und unerreichbare Geschosse [1]. Für uns gilt: Innenräume bleiben leer, aber Geschosse müssen erreichbar sein. Das ist mit Treppe und Leiter heute erfüllt.
- Erwartungen verschieben sich über die Jahre: Der biombasierte Materialtausch galt im ersten Jahr als innovativ und im vierten als langweilig [1].

### Kernbefunde der Jury-Analyse [1]

- Drei Kernkriterien: Usability, thematische Kohärenz und „anchoring in real-world simulacra“.
- Gebäude brauchen nach Compton „perceptual differentiation“ in einem Goldlöckchen-Bereich. Die genauen Parameter dieses Bereichs konnten die Autoren nicht ermitteln.
- Variationsachsen fallen in drei Klassen (immer variieren, Zielwert, einmal wählen). Welche Achse in welche Klasse gehört, beurteilen verschiedene Juroren unterschiedlich.
- Innen und außen werden getrennt bewertet. Außen urteilt die Jury ganzheitlich, aber abhängig von Details.

---

## Fachartikel zu prozeduraler Architektur: Kern und Übertragung

| Verfahren | Kern (mit Quelle) | Was wir übernehmen |
|---|---|---|
| **Shape Grammar** (Stiny & Gips 1971) | Startregel, Ersetzungsregeln aus linker und rechter Seite mit Markern, Terminierung. Die Palladio-Villen-Grammatik hat 69 Regeln in acht Stufen und erfasst einen Stil [24]. | Stil als Regelmenge in Stufen. Klassische Shape Grammars passen aber schlecht zur automatischen Generierung ohne Constraints [13]. |
| **Split Grammar** („Instant Architecture“, Wonka et al. 2003) | Split-Regeln teilen eine Grundform, Conversion-Regeln wandeln sie um. Attribute Matching und eine eigene **Kontrollgrammatik**, die Attribute wie Texturen über die Struktur verteilt (Abstract laut Suchergebnis) [15] | Trennung von Geometrieregeln (Split) und Stilattributen (Kontrolle). T5 ist unsere Kontrollgrammatik. |
| **CGA Shape** (Müller et al. 2006) | Masse aus volumetrischen Shapes, dann Fassadendetail passend zur Masse. Kontextsensitive Regeln verhindern Fenster und Türen in anderen Wänden, Türen führen zu Terrasse oder Straße. Rekonstruktion von Pompeji [14] | Reihenfolge Masse → Fassade → Detail; Verdeckungsabfragen (T4). |
| **CGA-Operationen** (CityEngine-Doku) | `split(axis){…}` mit absoluten, relativen (`'`) und schwebenden (`~`) Größen. `*` wiederholt „as many times as possible“ und wählt die beste Wiederholungszahl mit „least stretching“. `comp` zerlegt in Teilflächen (front, side, top …) [17][20]. | Ganzzahl-Solver mit genau dieser Semantik (siehe Architekturvorschlag A). |
| **CGA++** (Schwarz & Müller 2015) | Shapes als „first-class citizens“, Operationen über mehrere Shapes, Alternativen als neue Bäume, **Events** zur Koordination (Abstract laut Suchergebnis) [16] | Achsen und Gruppen über Geschosse und Bauteile (T5); mehrere Alternativen bauen und bewerten (T15). |
| **Interaktive Grammatik-Bearbeitung** (Lipp et al. 2008) | Problem „keine direkte künstlerische Kontrolle“, Lösung „instance locators“ [23] | Editor: einzelne Instanzen (dieses Fenster, diese Gaube) beim Neugenerieren fixieren. |
| **Inverse Procedural Modeling** (Wu et al. 2014) | Eine Split-Grammatik wird aus segmentierten Fassaden-Layouts per Description-Length-Kosten und dynamischer Programmierung extrahiert. Sie ist „competitive with those of expert users“ [21]. | Später möglich: Vorlagen aus Profi-Fassaden (Screenshots oder Schematics) halbautomatisch ableiten. |
| **Layout-Synthese** (Merrell et al. 2010) | Bayes-Netz erzeugt das Raumprogramm, Metropolis den Grundriss. Außenstil „largely independent of the internal building layout“. **Stilvorlage** mit Fenstern, Türen, Giebeln, Dächern, Fensterabständen, Dachwinkel und Überstand; Fenster-Fallback (T4); Walm per Straight Skeleton, Giebel nach Stil [22][23] | Unser `StyleDef` ist so eine Stilvorlage. Ergänzen: Abstände pro Geschoss, Giebelbehandlung, Fallback-Ketten. |
| **Organic Building Generation** (Green et al. 2019) | Räume wachsen aus 2 × 2 Saaten, Anzahl = gerundete Kubikwurzel der Fläche. Fenster per zellulärem Automat (25 % Glas, 10 Generationen). Große Häuser „disorienting without any identifying features“ [11] | Negativbeispiel: Fenster nie per CA oder Zufall, sondern im Rhythmus (T2). |
| **WFC / Model Synthesis** | WFC reimplementiert Model Synthesis (2007) „nearly identical“ [26]. Widersprüche „surprisingly rarely“, Constraints vorab setzbar [25]. Aber: „doesn't have any global structure“. Abhilfe: Regionen mit eigenen Kachelsätzen, feste Kacheln, Pfad-Constraint [27] | Nur auf der untersten Ebene (Pflaster-, Wandtextur-Muster), nie für Grundriss oder Fassade. |
| **Graph-Grammatik** (Unexplored, Dormans) | Etwa 5.000 Ersetzungsregeln; erst abstrakt, dann konkret. Ein Nichtterminal („Obstacle“) wird spät nach Thema aufgelöst, früh gesetzte „Biomes“ steuern spätere Wahlen [28]. | Abstrakte Bauteil-Plätze („Fokus“, „Giebelzier“) zuerst planen, später stilabhängig auflösen. |
| **Gelernte Grammatik für Minecraft** (SIGI 2021) | Zerlegt Voxelbauten per merge/split in Shapes, Kosten (1+#S)^α·ΣE. Ohne Einschluss-Constraint „unstructured buildings“; schräge Dächer kaum darstellbar; nur lokale Beziehungen [13] | Globale Struktur muss explizit kodiert werden. |
| **Evolution** (Barthet et al. 2022) | CPPN-NEAT mit Novelty Search im Autoencoder-Latenzraum. Reparaturen: Flood-Fill gegen Schweben, größte Komponente, Material nach Lage; Constraint: Eingang mit Wand ≥ 3 hoch [12] | Neuheitsdistanz für Varianten (T15). |

---

## Open-Source-Generatoren und Bibliotheken: gut und schlecht

| Werkzeug | Gut | Schlecht bzw. Grenzen | Quelle |
|---|---|---|---|
| **Tome** (SWMG, Rust, GDMC 2025 Platz 2) | Pipeline mit Rückkante; Stil-Rezepte (T13); Irimoya, Engawa; Fundament aus anstehendem Naturstein (stone, granite, andesite, diorite, deepslate, tuff); Requisiten-Pass; Tests würfeln jeden Stil offline gegen Tippfehler | Doku teils generischer als der Code; Gesamtnote 2025 nur 4,71, weil auch Layout und Narrativ zählen | [33]–[38] |
| **Arnis** (OSM → Minecraft) | Fassadenklassen, Spalten End/Pier/Window, „corner on a pier“, Anti-Wiederholungsgitter, Shortlist, Oklab-Farbabgleich | reale Daten, kein Builder-Stil; unter `MIN_FACADE_FOOTPRINT = 12` kein Fassadenplan | [39][40] |
| **GDPC** (Python) | Standard der GDMC-Community; Transform mit Drehung und Spiegelung passt `facing`, `axis` und `rotation` an; zufälliges Sampling aus Blocklisten | Reine Bibliothek, kein Stilwissen. Zufallssampling pro Block erzeugt schnell Salz-und-Pfeffer-Muster | Altnotiz |
| **Vanilla-Jigsaw und Template-Pools** | gewichtete Pools, `fallback`, Prozessoren (Alterung, Moos), rotierbare Verbindungen | Prozessor-Regeln brauchen für Treppen alle Facing-Kombinationen; die Dörfer wiederholen sich sichtbar [5] | Altnotiz, [5] |
| **JEB_GEN_** (NTNU, Sieger 2023) | Agentensystem, Bauplatz per Score, Ausbaustufen, Poisson-Deko, Materialtausch über NBT | Gebäude selbst handgebaut; Variation vor allem durch Tausch, also das „langweilig“-Risiko [1] | [10] |
| **Mike's Angels** (Sieger 2022) | Zell-Höhenfelder für komplexe Bauten, iterative Planung im Speicher, glatte Mauern | Code-Struktur pro Strukturtyp eigenständig, Gebäude-PCG uneinheitlich (Altnotiz) | [9] |
| **WFC-Bibliotheken** (mxgmn, DeBroglie) | ausgereift, Constraints, 3D möglich | keine globale Struktur, Backtracking nötig; seltene Module kommen kaum vor | [25][27][29] |
| **Unreal PCG Shape Grammar** | knappe, lesbare Syntax: `*`, `+`, Anzahl, `[]`, `{A:w}`, `<A,B,C>`; Subdivide Segment und Spline | „tight corners might produce incorrect results“; Engine-gebunden | [30] |
| **CityEngine CGA** | Referenz-Semantik für split/repeat/comp; Tutorials mit Geschoss- und Feld-Hierarchie | kommerziell, Fließkomma-Geometrie, muss für Blöcke auf Ganzzahlen übertragen werden | [17]–[20] |

*Lücke:* Gezielt nach „Minecraft Building Generator“-Repos auf GitHub (außerhalb von GDMC und Arnis) habe ich nicht gesucht. Das Suchbudget der Sitzung war aufgebraucht.

---

## Wie gute Generatoren Stil und Variation kodieren

Vier Schichten, nach den Quellen geordnet:

1. **Stil-Rezept (Daten).** Paletten mit Rollen sowie Pools mit Poolgröße als Varianz und Flags `rare` bzw. `locked` [33]. Dazu kommen Stilvorlagen mit Maßen und Abständen [22] und Dach-Priors (Altnotiz, Arnis-RoofHabit). **Neu:** Pro Achse eine Variationsklasse `vary | target | fixed` [1].
2. **Grammatik-Regeln (Daten plus Interpreter).** Geschoss- und Feldhierarchie, Muster, Spiegelung, Prioritätsalternativen [17][18][30].
3. **Modulkatalog (Daten).** Vorlagen nur mit Rollen (haben wir), dazu Verbinder, Ausschlüsse, Fallback, Bedingungen wie Geschoss, Mindestwand und Größe sowie `pinned` für das Signaturbauteil [29][22].
4. **Constraint- und Bewertungsschicht (Regeln).** Harte Prüfungen (Platz frei, Statik), weiche Kostenterme, Auswahl unter Kandidaten [14][22][40].

Beispiel für die Variationsklassen eines Hauses (Zuordnung *Einschätzung*, Klassen nach [1]):
| Achse | Klasse | Begründung |
|---|---|---|
| Palette bzw. Wandmaterial, Dachmaterial, Fenstervorlage pro Fassade | fixed (pro Gebäude, im Dorf pro Bezirk) | Kohärenz; Tome sperrt Pools für „matched sets“ [33] |
| Grundriss-Proportion, Flügel, Signaturbauteil, Schornsteinseite, Dachtyp aus dem Stil-Prior | vary | macht Varianten unterscheidbar [1][40] |
| Überstand ≥ 1, Achsentreue, Sockelanteil, Fensterabstand ≥ 1 zur Ecke | target | Qualität, nicht Geschmack [3][39] |

---

## Wie gute Generatoren Monotonie verhindern

| Mittel | Beleg | Übertragung |
|---|---|---|
| Hierarchische Verengung: Siedlung → Bezirk → Haus | Grimoire, Tome-Bezirksvariante [33], Altnotiz | Varianten bzw. Dorf: dominanten Stil halten, Sekundärstil würfeln |
| Systematische Nachbar-Verschiedenheit (Gitter statt Hash) | Arnis [40] | Varianten: max-min-Auswahl (T15) |
| Neuheitsdistanz zu Bekanntem | Barthet k = 15 [12] | Merkmalsvektor-Distanz |
| Signatur-Elemente als Anker | [1] | Ein Fokusbauteil pro Haus |
| Regionen mit eigenen Regelsätzen | Boris [27] | Fassadenseiten: Schauseite, Nebenseite und Rückseite mit eigener Regelstrenge (wie Arnis Street/Rear) |
| Indexmuster statt Gleichtakt | [18][30] | T2 |
| Ausbaustufen | JEB_GEN [10] | Größenklassen als Ausbaustufen *desselben* Typs (Anbau, Gaube, Erker), statt jedes Feature unabhängig zu würfeln |
| Requisitenliste mit mindestens 10 Einträgen, wenige pro Haus | Tome [34] | T11 |
| Rauschen statt Zufall pro Block | Grimoire (Altnotiz), `texturing.ts` | auf Dachflächen ausweiten (S4, siehe Dach-Thema) |
| Formvariation vor Materialtausch | [1] | Tests: Varianten unterscheiden sich in ≥ 2 Formachsen |

---

## Automatische Qualitätsbewertung

**Was die Forschung sagt**
- **Metriken und Juryurteil** (Hervé & Salge 2021): 18 Häufigkeits- und Konfigurationsmetriken (u. a. Light, Block Type Count, Density, Entropy, Relation to Environment). Signifikant (p < 0,01) nur: Functional ↔ Functionality 0,85, Food ↔ Functionality 0,81, **Block Type Count ↔ Narrative 0,81**, Functional ↔ Gesamt 0,84, Food ↔ Gesamt 0,82. „Adaptability and Aesthetic are two high concepts that seems hard to be approximated using quantitative metrics“ [2].
- **Expressive Range** (Smith & Whitehead, PCG-Buch Kap. 12): viele Ausgaben erzeugen, nach zwei Metriken als Heatmap auftragen; das zeigt Verzerrungen und Steuerbarkeit. Faustregel: „choose metrics that are as far as possible from the input parameters“ [32].
- **Tile-Pattern-KL-Divergenz** (Lucas & Volz 2019): Muster per gleitendem Fenster zählen, KL-Divergenz zu einem Beispiel; w = 0 bestraft neue Muster, w = 0,5 balanciert, ε als Back-off [31].
- **Kaleidoskop-Effekt:** Sobald der Spieler den generativen Raum erkennt, werden Ergebnisse vorhersehbar [1].

**Vorgeschlagene weiche Lints** (Erweiterung von `buildingLints.ts`; Schwellen sind *Einschätzung*, wenn nicht anders belegt)

| ID | Prüfung | Messung | Ziel |
|---|---|---|---|
| L1 Fokus | Zahl großer Bauteile (Turm, Erker, Balkon, Veranda, Anbau, Flügel, ≥ 3 Gauben) | aus `HousePlan` | small/medium ≤ 2, large ≤ 3, huge ≤ 4 |
| L2 Geschosshierarchie | EG unterscheidet sich von OG | Vorlagen-IDs, Fensterhöhe oder Muster pro Geschoss | bei ≥ 2 Geschossen mindestens ein Unterschied |
| L3 Achsentreue | OG-Öffnungen auf Achsen des EG | Anteil der Öffnungsspalten mit Partner darunter (Öffnung, Tür oder Pfeiler) | ≥ 0,8 |
| L4 Giebel | Giebeldreieck mit mindestens 9 Zellen enthält ein Element (Balken, Fenster, Gitter) | `roof.gableCells` | 100 % bei medieval, rustic, nordic, fantasy, cherry |
| L5 Schornstein | nicht auf der Giebel-Mittelachse vor der Schauseite | Position gegen Giebelmitte | Abstand ≥ 2 oder Lage durch das Dach |
| L6 Rhythmus | Länge gleicher 3-Feld-Kacheln (Blockzustände) am Stück | Lauflänge pro Fassade > 15 | ≤ 3 gleiche Kacheln in Folge |
| L7 Sockelanteil | (Sockel + Schürze + Wegfläche) / Grundfläche | Grundflächen zählen | ≤ 1,6 (Kritik an großen Fundamenten [3][4]) |
| L8 Akzentanteil | sichtbare Fläche der Rolle `accent` | Außenhülle zählen | ≤ 10 % (Palettenregel) |
| L9 Blocktypen | verschiedene Blockzustände in der Außenhülle, Familien gruppiert | Hülle zählen | stilabhängiger Bereich, z. B. 8–20 (Bezug [2]; Bereich *Einschätzung*) |
| L10 Fremdkörper | einzelner gesättigter Vollblock (wool, concrete, terracotta) ohne gleichartigen Nachbarn, nicht Teil eines Musters | 26er-Nachbarschaft | 0 (Geschenke, Uhr am Bahnhof) [1] |
| L11 Ecke | Glas in der Eckspalte, ohne Flag `cornerGlass` | Fassadenspalten 0 und L−1 | 0 [39] |
| L12 Variantendistanz | paarweise Merkmalsdistanz der 3 Varianten | T15 | ≥ 0,4 |

Dazu ein Skript für die Expressive Range (Vorschlag, kein npm-Lauf in dieser Recherche): 200 Seeds pro Stil und Größe; Achsen z. B. „Silhouettenkomplexität“ (Zahl der Dachabschnitte und Firsthöhen) gegen „Fassadentiefe“ (Anteil der Spalten mit d ≥ +1); dazu die KL-Divergenz der 3 × 3-Fassadenmuster zwischen den Varianten [31][32].

---

## Architekturvorschläge (TypeScript-Pseudocode)

### A. Fassaden-Grammatik-Modul (`src/core/facade/`)

Es liegt zwischen `plan.ts` und `templates/`: Die Grammatik plant Plätze, die Vorlagen füllen sie. Es ersetzt `axesIn`, `axesFor` und die Feldschleife in `openings.ts`, nicht die Vorlagen.

```ts
// src/core/facade/grammar.ts
export type Size =
  | { kind: 'abs'; n: number }                    // genau n Spalten
  | { kind: 'float'; w: number; min?: number; max?: number }; // ~w: dehnbar (CityEngine "~")

export type Term =
  | { t: 'slot'; module: string; size: Size }     // Platz für Modul/Vorlage (W04, PIER, BLIND …)
  | { t: 'seq'; items: readonly Term[] }
  | { t: 'repeat'; body: Term; min?: 0 | 1 }      // CGA {…}*, UE * bzw. +
  | { t: 'weighted'; options: readonly { term: Term; w: number }[] }  // UE {A:2,B:1}
  | { t: 'prefer'; options: readonly Term[] }     // UE <A,B,C>, Fallback-Kette (T4)
  | { t: 'mirror'; half: Term; centre?: Term }    // symmetrisch um die Mitte
  | { t: 'pattern'; spec: string; map: Readonly<Record<string, Term>> }; // "A B A", Index

export interface StoreyRules {
  ground: Term;           // EG, enthält das Tür-Zentrum
  upper: Term;            // wiederholte OG, bekommt storeyIndex
  top?: Term;             // oberstes Geschoss bzw. Kniestock
  gable?: Term;           // Giebelfeld (T6), senkrecht aufgeteilt
}

export interface FacadeCtx {
  length: number; storey: number; storeys: number;
  side: HorizontalDirection; role: 'front' | 'side' | 'back';  // Arnis: street/rear …
  axes: readonly number[];                       // Kontrollattribut der Masse (T5)
  fits: (module: string, u0: number) => boolean; // Verdeckungstest = heutiges placeIfFits
  rng: SeededRandom;                             // fork(`facade:${side}:${storey}`)
}

export interface Slot { u0: number; width: number; module: string; via: string[] } // via = Fallback-Protokoll

/** Ganzzahl-Solver: wählt Wiederholungszahlen mit minimalem Dehnen (CityEngine-Semantik),
 *  verteilt Rest zuerst symmetrisch an die Ränder, ungeraden Rest in die Mitte (wie studs.ts),
 *  bevorzugt Lösungen, deren Öffnungsmitten auf ctx.axes liegen. null = keine Lösung. */
export function solveFacade(rules: StoreyRules, ctx: FacadeCtx): Slot[] | null;
```

Stildaten dazu (`styles.ts`, neu):
```ts
facade: {
  front: { ground: mirror(seq(slot('PIER',1), repeat(seq(slot('WIN_G',~3), slot('PIER',1)))), slot('DOOR',3)),
           upper: pattern('A B A', { A: prefer(slot('W04',3), slot('W02',2), slot('W01',1)), B: slot('BLIND_BRACE',~3) }),
           gable: seq(slot('COLLAR',1), slot('GABLE_WIN',1)) },
  side:  { ground: …, upper: pattern('B A B', …) },     // Nebenseiten ruhiger
},
```
**Akzeptanz:** Bei gleicher Eingabe entsteht für `medieval` dieselbe Fensterzahl wie heute ±20 %, L2 und L3 werden erfüllt, und der Fixpunkt-Test bleibt grün.

### B. Detail-Pass-System (`src/core/generator/details/`)

Es löst die feste Reihenfolge in `buildHouse.ts:109-145` für alles *nach* dem Rohbau ab. Bausteine sind Ankerpunkte, Budget, Abstand, geforkter Zufall und Protokoll.

```ts
export type Anchor = 'sill' | 'eave' | 'verge' | 'door' | 'corner' | 'gable' | 'plinth_ring' | 'ridge' | 'yard';

export interface Site { x: number; y: number; z: number; anchor: Anchor; outward?: HorizontalDirection; tag?: string }

export interface DetailPass {
  id: string;                                  // 'gable-collar', 'wall-props', 'roof-texture', 'festive-garland'
  after: readonly string[];                    // explizite Reihenfolge (topologisch sortiert)
  priority: PriorityValue;                     // nie > Priority.OPENING
  anchors: readonly Anchor[];
  styles?: readonly StyleId[]; themes?: readonly Theme[];
  /** Budget aus Größe und Detailgrad: Detailgrad steuert Mikrodetail, nicht Bauteilzahl (S6). */
  budget(size: SizeClass, detail: 1 | 2 | 3): { min: number; max: number };
  minSpacing?: number;                         // Manhattan (Tome-Requisiten: 3)
  sampler?: 'all' | 'shuffle' | { poisson: number }; // T12
  run(ctx: DetailCtx, sites: readonly Site[], budget: number): Placement[];
}

export interface Placement { x: number; y: number; z: number; state: string; pass: string }

export function runDetailPasses(house: HouseResult, passes: readonly DetailPass[], spec: BuildSpec): {
  placements: Placement[]; log: { pass: string; placed: number; skipped: number; reason?: string }[];
};
```
Anker, die es heute schon gibt: `openings.sills`, `roof.eaveCells`, `openings.doors`, `roof.gableCells`, `yard`. Die Festschicht (`festive.ts`) wird dann ein Pass unter vielen. **Akzeptanz:** Null Validator-Reparaturen, Lint `tuer-frei` grün, Requisiten im Mittel 1–2 pro Haus über 100 Seeds.

### C. Modulkatalog (Erweiterung `src/core/templates/`)

```ts
export interface Connector { label: 'post' | 'wall' | 'beam' | 'none' | string; symmetric?: boolean }

export interface ModuleDef extends FacadeTemplate {          // erbt cells/roles/width/height
  kind: 'window' | 'door' | 'bay' | 'corner' | 'gable' | 'prop' | 'roof_piece';
  edges?: { left: Connector; right: Connector; top: Connector; bottom: Connector };
  tags: readonly string[];                                   // 'shutter', 'arched', 'focal' …
  weight: number;                                            // wie Jigsaw-Pool (1–150)
  rare?: boolean;                                            // Tome: nie dominant
  when?: { storey?: readonly ('ground' | 'upper' | 'top')[]; minWall?: number; size?: readonly SizeClass[]; role?: readonly ('front' | 'side' | 'back')[] };
  excludeNeighbours?: readonly string[];                     // marian42: passt, sieht aber schlecht aus
  fallback?: string;                                         // Merrell / Jigsaw fallback
}
```
`pinned`-Plätze (Signaturbauteil auf der Mittelachse) setzt der Plan, bevor der Solver aus A läuft. Das folgt der MGAIA-Abhilfe „Zellen vorab festlegen“ (Altnotiz).

### D. Qualitätsbewertung und Variantenauswahl

```ts
// src/core/analysis/quality.ts
export interface SoftLint { id: string; score(model: VoxelModel, house: HouseResult): number; /* 0..1 */ note(): string }
export interface QualityReport { hard: LintIssue[]; soft: Record<string, number>; total: number }
export function scoreHouse(model: VoxelModel, house: HouseResult, weights: Readonly<Record<string, number>>): QualityReport;

// src/core/generator/generateBuilding.ts
export function generateVariants(spec: BuildSpec, count = 3, pool = 8): VoxelModel[] {
  // 1. pool Kandidaten (seed + i·PRIME, deterministisch); 2. harte Lints → raus;
  // 3. Toleranz: total ≥ best − 0.15; 4. greedy max-min über features(house) (T15).
}
```
Wichtig für die Reproduzierbarkeit: Die Auswahl hängt nur von Seed und Spec ab. Der „bitgenau reproduzierbar“-Vertrag aus dem README bleibt erhalten.

### E. Stildaten erweitern (`src/core/style/styles.ts`)

```ts
interface StyleDefV3 extends StyleDef {
  variation: Readonly<Record<'palette' | 'roofType' | 'wings' | 'focal' | 'windowTemplate' | 'chimneySide', 'vary' | 'target' | 'fixed'>>;
  focal: { candidates: readonly ('tower' | 'oriel' | 'balcony' | 'porch' | 'cross_gable' | 'dormer_row')[]; maxMajor: Readonly<Record<SizeClass, number>> };
  facade: { front: StoreyRules; side?: StoreyRules; back?: StoreyRules };
  gable: 'collar_window' | 'collar' | 'lattice' | 'round_window' | 'none';
  rarePalettes?: readonly string[];       // nur dritte Variante / Wahrzeichen (T13)
}
```

---

## Fehler, die Profis vermeiden

Gesammelt aus Jury-Kritik und Generator-Artefakten in der Literatur, jeweils mit unserer Gegenregel.

1. **Zu große Fundamente.** Häuser wirken „unusually prominent or peculiar“ [3][4]. → L7, Schürze nur auf Schauseiten oder bei Hang (S10).
2. **Feature-Suppe statt Fokus.** Signaturgebäude wirken, weil sie selten sind [1]. → L1, Fokusbudget.
3. **Fenster ohne Ordnung** (CA, Zufall). Ergebnis: „disorienting without any identifying features“ [11]. → T2, T5.
4. **Glas um die Ecke** [39]. → T3, L11.
5. **Lokales Verfahren ohne globale Struktur** (WFC, gelernte Grammatiken) [13][27]. → Hierarchie zuerst, lokale Verfahren nur für Texturen.
6. **Nur das Material tauschen.** Das wird nach kurzer Zeit „boring“ [1]. → Formachsen variieren.
7. **Ein einzelnes störendes Detail** (Fremdkörper-Block, schwebendes Teil, halb über der Klippe) [1][3]. → L10, Validator.
8. **Dieselbe Lösung für jeden Ort bzw. jede Eingabe** („the same settlement regardless of the space“) [3]. → Variantendiversität, Stil-Priors je Größe.
9. **Große Bauten ohne neue Ideen.** Hochhäuser „looks the same“ [3], kleine Qualitäten skalieren nicht [3]. → Größenklasse ändert *Gliederung* (mehr Achsen, Risalit bzw. Zwerchgiebel, Geschossbänder), nicht nur Maße.
10. **Technisch passende, optisch schlechte Nachbarn** [29]. → `excludeNeighbours`.
11. **Türen über dem Boden, unerreichbare Geschosse** [5][1]. → Heute erfüllt (Tür-Lint, Treppe und Leiter). Beibehalten.
12. **Leere Giebel und große ungegliederte Flächen.** *Einschätzung*, gestützt auf Merrells Giebel als Fassadenteil [22] und unseren Lint „flache Wand“. → T6, L4.

---

## Empfehlungen für den Generator

Nach Wirkung pro Aufwand priorisiert. „Daten“ heißt Stil- oder Vorlagendaten, „Regel“ heißt Code.

| # | Was ändern | Modul | Daten/Regel | Akzeptanzkriterium |
|---|---|---|---|---|
| 1 | **Giebelfeld-Pass:** Kehlbalken und Giebelfenster auf der Mittelachse, stilabhängig (T6) | neu `details/gable.ts`, liest `roof.gableCells` | Daten (`gable` in `StyleDef`) plus Regel | L4: 100 % der Giebel ≥ 9 Zellen gefüllt bei medieval, rustic, nordic, fantasy, cherry; 0 Validator-Reparaturen |
| 2 | **Schornstein von der Giebelmitte wegrücken:** Nebenachse am Giebel (u = 1–2 vom Rand) oder durch das Dach nahe dem First (T5) | `components.ts:149-164` | Regel | L5 in allen Stilen erfüllt; Screenshots mittelalter, rustikal, nordisch zeigen die Giebelmitte frei |
| 3 | **Geschosshierarchie:** eigene Kandidatenlisten für `ground`, `upper`, `top` | `openings.ts:243-247`, `styles.ts` | Daten | L2 bei allen Häusern mit ≥ 2 Geschossen; Tür- und Fensterlints unverändert grün |
| 4 | **Rhythmusmuster** statt eines Fensters pro Feld (T2) | `openings.ts:260-277`, `styles.ts` | Daten (`rhythm`) plus Regel | bei medieval/fantasy medium mit ≥ 3 Feldern auf ≥ 50 % der OG-Fassaden mindestens ein Blindfeld; L6 erfüllt |
| 5 | **Diversität der Varianten:** 8 Kandidaten, Score-Toleranz, max-min-Auswahl (T15, T16) | `generateBuilding.ts:259-266`, neu `analysis/quality.ts` | Regel | L12 ≥ 0,4 für alle Stile × Größen; bitgenaue Reproduzierbarkeit (Hash-Test) bleibt; Laufzeit pro Generierung ≤ 3 × heute |
| 6 | **Fokusbudget:** höchstens N große Bauteile je Größe; Detailgrad steuert Mikrodetail-Budgets der Passes | `resolveInput.ts:68`, `styles.ts` | Daten plus Regel | L1 bei 100 % der Seeds; Detailgrad 3 erhöht die Zahl der Detail-Placements, nicht die Zahl großer Bauteile |
| 7 | **Achsenliste pro Masse**, von Fenstern, Tür, Gauben und Giebelfenster genutzt (T5) | `plan.ts`, `openings.ts`, `components.ts` (`planDormers`) | Regel | L3 ≥ 0,8; Gauben stehen nur auf Achsen |
| 8 | **Detail-Pass-System** mit Ankern, Budget, Abstand, Protokoll; erste Passes: Giebel, Requisiten (T11, nur Registry-Blöcke), Festschicht | neu `generator/details/`, `buildHouse.ts` | Regel (Gerüst) plus Daten (Passes) | Requisiten im Mittel 1–2 pro Haus über 100 Seeds, nie in den Sperrzellen vor Türen, Manhattan-Abstand ≥ 3 |
| 9 | **Japanisch:** Irimoya als Dachtyp (Höhenfeld T9), Engawa ab `large` (T8), Shoji-Teilung (T7); Prior `half_hip` verringern | `roofEngine.ts` (`layoutAt`), `plan.ts`, `walls.ts`, `styles.ts:181` | Regel plus Daten | japanese large: Giebeldreieck ≥ 1 Zelle, Eckhub 1, Deck 2 tief rundum; Paneelbreiten 2–4 |
| 10 | **Weiche Lints L1–L12** und ein Skript für die Expressive Range | `analysis/buildingLints.ts`, `scripts/` | Regel | Bericht pro Stil × Größe; CI scheitert nur an harten Lints; weiche Werte werden als Trend protokolliert |
| 11 | **Sockel und Schürze proportional:** Schürze nur auf Schau- und Eingangsseiten oder abhängig von der Größe | `walls.ts:113-122` | Regel | L7 ≤ 1,6 für small und medium |
| 12 | **Modulkatalog:** Verbinder, Ausschlüsse, `fallback`, `when`, `rare`, `pinned` (Vorschlag C) | `templates/types.ts`, `catalog.ts` | Daten | alle W01–W18 und T01–T10 migriert; ein Test würfelt jeden Stil offline (wie Tome) und prüft, dass alle Referenzen existieren |
| 13 | **Variationsklassen** pro Stilachse (`vary`, `target`, `fixed`), auch als Doku für die lokale KI | `styles.ts`, `ai/planSchema.ts` | Daten | jede Achse klassifiziert; die KI kann `fixed`-Achsen innerhalb eines Ensembles nicht variieren |
| 14 | **Fremdkörper-Lint** und Ersatz der Wollwürfel-Geschenke | `festive.ts:164-171`, Lint L10 | Regel | L10 = 0 in allen Weihnachts-Screenshots (Gestaltung siehe Weihnachtsthema) |
| 15 | **Aufräumen:** `… \|\| true` entfernen oder die Absicht dokumentieren | `walls.ts:161`, `walls.ts:247` | Regel | Typecheck, Lint und Snapshots unverändert |

---

## Quellen

1. Hervé, Salge, Warpefelt (2023): *An Examination of the Hidden Judging Criteria in the Generative Design in Minecraft Competition*, TechRxiv, doi:10.36227/techrxiv.22698484.v1; Eintrag: https://digitalcommons.kennesaw.edu/facpubs/7295 – Thematische Analyse der Jury-Kommentare 2018–2020: Suspension of Disbelief, Goldlöckchen-Variation, drei Variationsklassen, Signaturgebäude, Materialtausch „boring“ im vierten Jahr.
2. Hervé & Salge (2021): *Comparing PCG metrics with Human Evaluation in Minecraft Settlement Generation*, FDG 2021, https://arxiv.org/abs/2107.02457 (gelesen über ar5iv) – 18 Metriken; nur 5 signifikante Korrelationen, keine für Aesthetics oder Adaptability.
3. Salge et al.: *Impressions of the GDMC AI Settlement Generation Challenge in Minecraft*, https://arxiv.org/abs/2108.02955 (ar5iv) – Juryzitate (Butler, Hadley, Preuss & Fischer, Cook) zu Gebäuden, Fundamenten und Variation.
4. Mark R. Johnson: *GDMC Judging*, 2021, https://markrjohnsongames.com/2021/08/18/generative-design-in-minecraft-competition-gdmc-judging – Lob für „varied but … clear architectural style“, Kritik an großen Fundamenten.
5. Salge et al. (2018): *Generative Design in Minecraft (GDMC), Settlement Generation Competition*, https://arxiv.org/abs/1803.09853 (ar5iv) – Kriterien, Kritik an Vanilla-Dörfern und Templates.
6. GDMC-Wiki 2021, https://gendesignmc.wikidot.com/wiki:2021-settlement-generation-competition – Ergebnisse 2021, Techniken der Einreichungen (u. a. WFC).
7. GDMC-Wiki 2022, https://gendesignmc.wikidot.com/wiki:2022-settlement-generation-competition – Punktetabelle (Mike's Angels Ae 7,08), Kurzbeschreibungen.
8. GDMC-Wiki 2023, https://gendesignmc.wikidot.com/wiki:2023-settlement-generation-competition – Punktetabelle (JEB_GEN_), Ehrungen (MGAIA WFC, Castle Lover).
9. van der Staaij et al. (2023): *Believable Minecraft Settlements by Means of Decentralised Iterative Planning*, https://arxiv.org/abs/2309.10871 (ar5iv) – Zellstrukturen mit Höhenfeld, Mauertürme, Jury-Lob.
10. Kuo, Su, Chen, Wu (NTNU, 2023): *JEB_GEN_ Write-up*, https://gendesignmc.wdfiles.com/local--files/wiki:2023-settlement-generation-competition/JEB_GEN_writeup%5B1%5D.pdf – Agenten, NBT-Materialtausch, Ausbaustufen, Poisson-Disk-Deko.
11. Green, Salge, Togelius (2019): *Organic Building Generation in Minecraft*, https://arxiv.org/abs/1906.05094 (ar5iv) – Constrained Growth, CA-Fenster mit Zahlen, „disorienting“.
12. Barthet, Liapis, Yannakakis (2022): *Open-Ended Evolution for Minecraft Building Generation*, https://arxiv.org/abs/2209.03108 (ar5iv) – CPPN-NEAT, Novelty k = 15, Reparaturfunktionen, Eingangs-Constraint.
13. Hermans, Winters, De Raedt (2021): *Shape Inference and Grammar Induction for Example-based Procedural Generation* (SIGI), https://arxiv.org/abs/2109.10217 (ar5iv) – Gelernte Shape-Grammatik für Minecraft-Bauten, nur lokale Struktur.
14. Müller, Wonka, Haegler, Ulmer, Van Gool (2006): *Procedural Modeling of Buildings*, https://history.siggraph.org/?p=113547, doi:10.1145/1141911.1141931 – CGA Shape, Masse → Fassade, kontextsensitive Regeln.
15. Wonka, Wimmer, Sillion, Ribarsky (2003): *Instant Architecture*, https://www.cg.tuwien.ac.at/research/publications/2003/Wonka-2003-Ins/ – Split-Grammatik, Kontrollgrammatik, Attribute Matching (Abstract laut Suchergebnis, Volltext zu groß).
16. Schwarz & Müller (2015): *Advanced Procedural Modeling of Architecture* (CGA++), https://history.siggraph.org/?p=112748 – Shapes als first-class, Events zur Koordination (Abstract laut Suchergebnis).
17. Esri CityEngine: *split operation*, https://doc.arcgis.com/en/cityengine/2024.1/cga/cga-split.htm – absolute, relative und schwebende Größen, Repeat-Semantik.
18. Esri CityEngine: *Tutorial 9: Advanced shape grammar*, https://doc.arcgis.com/en/cityengine/latest/tutorials/tutorial-9-advanced-shape-grammar.htm – Geschoss- und Feld-Hierarchie, Index- bzw. Modulo-Muster.
19. Esri CityEngine: *Tutorial 7: Facade modeling* / *Tutorial 6*, https://doc.arcgis.com/en/cityengine/2023.1/tutorials/tutorial-7-facade-modeling.htm – EG mit fester Höhe, wiederholte OG mit `~` (Inhalt laut Suchergebnis-Auszug).
20. Esri CityEngine: *comp*, https://doc.arcgis.com/en/cityengine/latest/cga/cga-comp-function.htm – Zerlegung in Teilflächen.
21. Wu, Yan, Dong, Zhang, Wonka (2014): *Inverse Procedural Modeling of Facade Layouts*, https://arxiv.org/abs/1308.0419 – Split-Grammatik aus Fassadenlayouts extrahieren.
22. Merrell, Schkufza, Koltun (2010): *Computer-Generated Residential Building Layouts*, https://www.cs.princeton.edu/courses/archive/spring11/cos598A/pdfs/Merrell10a.pdf – Stilvorlage, Fenster-Fallback, Giebel, Straight-Skeleton-Dach.
23. Wonka: *Computational Building Design*, SIGGRAPH-2011-Kurs, https://www.cs.purdue.edu/cgvlab/urban/sg_2011_course/umc_SG11_03_computational_building_design.pdf – Merrells Kostenterme und Züge, Lipp 2008 „instance locators“.
24. Wikipedia: *Shape grammar*, https://en.wikipedia.org/wiki/Shape_grammar – Stiny & Gips 1971, Palladio-Grammatik mit 69 Regeln in 8 Stufen.
25. Gumin: *WaveFunctionCollapse*, https://github.com/mxgmn/WaveFunctionCollapse – Modelle, Widersprüche, Constraints, 3D, Spiele.
26. Merrell: *Model Synthesis*, https://paulmerrell.org/model-synthesis/ – Vorgänger von WFC, 3D-Gebäude.
27. Boris the Brave: *Wave Function Collapse Tips and Tricks*, https://boristhebrave.com/2020/02/08/wave-function-collapse-tips-and-tricks – Eckendenken, Gewichte, feste Kacheln, Pfad-Constraint, fehlende globale Struktur.
28. Boris the Brave: *Dungeon Generation in Unexplored*, https://www.boristhebrave.com/2021/04/10/dungeon-generation-in-unexplored/ – Graph-Grammatik, abstrakt → konkret, Nichtterminale.
29. marian42: *Infinite procedurally generated city with WFC*, https://marian42.de/article/wfc/ – Verbinder, Ausschlussregeln, Randbedingungen, Backtracking.
30. Epic Games: *Using Shape Grammar with PCG in Unreal Engine*, https://dev.epicgames.com/documentation/en-us/unreal-engine/using-shape-grammar-with-pcg-in-unreal-engine – Syntax `*`, `+`, `[]`, `{A:w}`, `<A,B,C>`.
31. Lucas & Volz (2019): *Tile Pattern KL-Divergence for Analysing and Evolving Game Levels*, https://arxiv.org/abs/1905.05077 (ar5iv) – Musterverteilung, KL-Formel, Gewicht w, ε.
32. Smith, Shaker et al.: *Procedural Content Generation in Games*, Kap. 12 *Evaluating content generators*, http://pcgbook.com/chapter12.pdf – Expressive Range, Heatmaps, Metriken fern von Eingabeparametern.
33. Tome: `style.rs`, https://github.com/Jandhi/Tome/blob/master/src/generator/buildings_v2/style.rs – Stil-Rezepte, Pools, 60/30/10, rare, LOCAL_WOOD_FRACTION 0,6, Kulturkataloge.
34. Tome: `exterior.rs`, https://github.com/Jandhi/Tome/blob/master/src/generator/buildings_v2/exterior.rs – Requisitenliste, Zielanzahl, Sperrzone, Mindestabstand.
35. Tome: `walls/infill.rs`, https://github.com/Jandhi/Tome/blob/master/src/generator/buildings_v2/walls/infill.rs – Shoji-Paneele 2–4 breit, Reihenfolge Füllung → Rahmen → Öffnungen.
36. Tome: `roof/irimoya.rs`, https://github.com/Jandhi/Tome/blob/master/src/generator/buildings_v2/roof/irimoya.rs – Irimoya-Höhenfeld, Konstanten, gable_inset.
37. Tome: `engawa.rs`, https://github.com/Jandhi/Tome/blob/master/src/generator/buildings_v2/engawa.rs – Einrückung 2, Deck 2, Plattform 1, umlaufendes Dach.
38. Tome: `pipeline.rs`, `foundation/course.rs`, https://github.com/Jandhi/Tome/tree/master/src/generator/buildings_v2 – Phasenfolge, Rückkante Räume → Fenster, Fundament aus anstehendem Stein.
39. Arnis: `building_facade.rs`, https://github.com/louis-e/arnis/blob/main/src/element_processing/building_facade.rs – Fassadenklassen, BaySlot, „corner on a pier“, MIN_FACADE_FOOTPRINT.
40. Arnis: `building_facades/choose.rs`, https://github.com/louis-e/arnis/blob/main/src/building_facades/choose.rs – Anti-Wiederholungsgitter (8/3), Shortlist (8/0,45), Bewertungsgewichte.
41. Intern: `research_notes/Minecraft Bautechniken für Generator/prozedural_und_ki.md` (Altnotiz) – GDMC 2024/2025, Grimoire, GDPC, Jigsaw, Arnis-Paletten, LLM-Befunde.
