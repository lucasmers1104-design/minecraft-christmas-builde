# Auftrag: Profi-Builds für den Minecraft Christmas Builder

Du übernimmst als Lead Developer die nächste große Ausbaustufe dieses Projekts. Ich (Luca) bin Creative Director: Ich treffe Designentscheidungen, du baust, prüfst und berichtest. Sprich mit mir auf Deutsch, knapp und ehrlich. Arbeite selbstständig bis zum Ende. Frage mich nur bei echten Designentscheidungen, die nur ich treffen kann, dann mit einer klaren Empfehlung.

**Ziel:** Die generierten Bauwerke sollen am Ende aussehen wie von einem guten Server-Builder – nicht wie eine Kiste mit Dach. Maßstab sind meine 18 Referenzbilder (Analyse unten). Wichtig: Qualität vor Menge, Atmosphäre vor Realismus.

---

## 0. Zuerst das Projekt verstehen (bevor du eine Zeile Code schreibst)

Das Repo: `https://github.com/lucasmers1104-design/minecraft-christmas-builde`. Arbeite auf einem neuen Branch `feature/profi-builds`, abgezweigt von `feature/openrouter-gui` (das ist der neueste Stand; `main` ist älter). Pushen nur nach meiner Zustimmung.

Lies vollständig und in dieser Reihenfolge:

1. `CLAUDE.md` und `AGENTS.md` (Next.js 16 weicht von deinem Trainingswissen ab; Doku in `node_modules/next/dist/docs/`).
2. `docs/ARCHITECTURE.md` (Datenfluss, kanonisches `VoxelModel`, Generatoren, Prioritäten des `VoxelBuilder`), `docs/COMPATIBILITY.md`, `docs/TEXTURES.md`, `docs/WORLD_EDIT_IMPORT.md`.
3. `docs/TEST_REPORT.md` (was wo wie getestet wurde), `docs/UI_DESIGN.md` (verbindliche Regeln für die Oberfläche), `docs/KI.md` (KI-Planung über OpenRouter/Ollama, Planformat).
4. **Die 20 Rechercheberichte** in `research_notes/Bauqualitaet 2026-10/` – mindestens vollständig: `01_wandtiefe_schichten.md`, `19_proportionen_komposition.md`, `20_prozedurale_generatoren.md`, `05_dachformen_profile.md`, `06_dachdetails.md`, `02_fassaden_mikrodetails.md`, `03_fenster.md`, `15_gelaende_gaerten_wege.md`, `18_beleuchtung.md`; die Stilberichte 08–13 und `14_winter_weihnachten.md` für deine Stile. Jeder Bericht hat einen Abschnitt „Schwächen des aktuellen Generators“ – ein Teil davon ist inzwischen behoben (prüfe im Code), ein Teil nicht.
5. Den Generator-Code: `src/core/generator/generateBuilding.ts`, `src/core/generator/house/*` (`plan.ts`, `resolveInput.ts`, `buildHouse.ts`, `walls.ts`, `openings.ts`, `components.ts`, `gables.ts`, `interiorLight.ts`, `roundTower.ts`, `studs.ts`), `src/core/generator/roof/roofEngine.ts` und `profiles.ts`, `src/core/style/styles.ts`, `palettes.ts`, `materials.ts`, `texturing.ts`, `src/core/blocks/validator.ts`, `stateResolver.ts`, `registry.ts`, `src/core/analysis/buildingLints.ts`, `src/core/generator/landscape*.ts`, `garden.ts`, `paths.ts`, `borders.ts`, `festive*.ts`, `station.ts`, `tower.ts`, `marketStall.ts`, `christmasTree.ts`, und die KI-Seite `src/core/ai/planSchema.ts`, `prompt.ts`, `fewShotExamples.ts`, `src/core/generator/parseDescription.ts`, `tests/fixtures/planTestset.ts`.
6. Führe die Grundprüfung aus und notiere die Zahlen als Ausgangsbasis: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npm run build`.
7. **Rendere den Ist-Stand** aller Stile mit dem Iso-Renderer (Farben statt Texturen, halbe Blockauflösung):
   `MCB_RENDER=1 MCB_RENDER_DIR=<ordner> MCB_RENDER_SCALE=<n> MCB_RENDER_KIND=house MCB_RENDER_THEME=none MCB_RENDER_STYLES=<liste> MCB_RENDER_SIZES=<liste> MCB_RENDER_SEEDS=<liste> npx vitest run tests/integration/renderIso.test.ts`
   (weitere Optionen über `MCB_RENDER_OPTIONS`, siehe Kopf der Testdatei). Sieh dir die Bilder an und vergleiche ehrlich mit den Referenzen. Diese „Vorher“-Bilder brauchst du am Ende für die Galerie.

Schreibe danach eine kurze Lücken-Analyse (Referenzen gegen Ist-Stand, je Stil) nach `research_notes/Referenzen 2026-10/analyse.md` – nur Text, keine fremden Bilder einchecken.

---

## 1. Feste Regeln und Entscheidungen (nicht neu verhandeln)

- **Ehrlichkeit:** keine vorgetäuschten Funktionen. Was nicht gebaut oder nicht getestet ist, steht so in UI, Doku und Bericht. Testberichte nur mit echten Ergebnissen.
- **Eine Wahrheit:** Vorschau, Materialliste, Editor, Projekte und Export lesen dasselbe kanonische `VoxelModel`. Blockzustände nur aus der geprüften Registry, gültig für Minecraft Java **1.21.11** (zweites Profil 1.21.1 mit Ersatzblöcken – neue Blöcke dort mitprüfen).
- **WorldEdit führt Nachbar-Updates aus:** gespeichert werden genau die Zustände, die Minecraft selbst berechnen würde (Treppenecken, Zaun-/Scheiben-/Mauerverbindungen, Türhälften, Stützregeln). Neue Formen gehen durch `stateResolver` und `validator`; Ziel bleibt **null Validator-Reparaturen**.
- **Determinismus:** gleiche Eingabe → gleiches Modell (gleicher Hash). Zufall nur über den vorhandenen geseedeten Zufall mit `rng.fork(label)`.
- **Keine Mojang-Dateien ins Repo.** Keine fremden Bilder oder Builds ins Repo (meine Referenzbilder sind fremde Werke).
- **Designentscheidungen des Creative Directors (vom 23.10.2026):**
  - Innenräume: **nur Licht** (eine hängende Laterne je Raum, Licht hinter den Fenstern), **keine Möbel**.
  - **Schnee nur auf ausdrücklichen Wunsch** (Thema „Winter“ schaltet Schnee nicht ein). Wenn Schnee, dann **nur Schneeschichten** (`snow`-Layer) dort, wo sie im Spiel liegen bleiben – **keine Schneeblock-Dachhaut**, keine weißen Blöcke als Schnee-Imitat.
  - **Keine Eiszapfen** (auch keine Imitate aus Glasscheiben oder Endstäben).
- **Bestehende Systeme nicht grundlos neu schreiben.** Erweitere, wo es geht (Dach-Engine, Fassadenvorlagen W01–W18/T01–T10, Paletten-Rollen, Prioritäten, Bau-Lints). Umbauen nur, wenn es nötig ist, und dann mit Begründung.
- Commit-Nachrichten Englisch, UI-Texte und Doku Deutsch (du-Form), Code-Kommentare Englisch, Testnamen Deutsch – wie im bestehenden Code. Commits nur nach grünem Lauf.

---

## 2. Meine Referenzen: was mir gefällt

Die 18 Bilder liegen außerhalb des Repos im Ordner `MinecraftBuilds` (auf dem Arbeits-Laptop unter `C:\Users\Luca Warmers\Downloads\minecraft-christmas-builde-main\minecraft-christmas-builde-main\MinecraftBuilds`; auf dem Haupt-PC lege ich ihn neben das Projekt, frag mich nach dem Pfad, falls du ihn nicht findest). **Sieh sie dir selbst an.** Die Analyse unten ist die Zusammenfassung meines Vorgängers; Materialien sind aus Screenshots geschätzt.

| Bild(er) | Was es zeigt | Was wir übernehmen |
|---|---|---|
| `17413756`, `17413757` | Winterliche Blockhütte bei Nacht: dunkles Fichten-/Schwarzeichenholz, geschwungenes Dach, warm leuchtende Fenster mit Rahmen, Glocke im Giebel, Hecken am Sockel, Laterne am Eingang | Warmes Licht in allen Fenstern, gerahmte Fenster mit Tiefe, Hecken am Sockel, Giebelzier. Schnee nur auf Wunsch und nur als Schneeschicht |
| `18791820` | Märchenhaus mit krummem Hexenhut-Turm, geschwungenen Dachkanten, Laterne an einem gebogenen Ausleger | Fantasy: organische Krümmung (Grat leicht durchhängend, Spitzen hochgezogen), schiefer Turm mit Hexenhut, Laternen an Auslegern |
| `19098029`, `19098030` | **Kern-Look.** Zweigeschossiges Holz-/Fachwerkhaus: Steinsockel, dunkle Rahmen, helle Ausfachung, ausgestellte Giebel mit Treppenstufen, Querflügel mit eigenem, niedrigerem Dach, Balkon mit Zaun, auskragendes Obergeschoss, Steinkamin mit Ranken, Blumenkasten, Laternen an jeder Traufecke, Fässer/Truhen, hohes Gras, Blumen, Trampelpfad | Kaskade aus Haupt- und Nebenbaukörper, Dreiteilung Sockel–Holz–Dach, vorstehende Eckpfosten und Balkenköpfe, ausgestellte Ortgänge, Laternen an den Traufecken, Requisiten, Grün am Sockel |
| `19365618` (Hollyridge Lodge) | Weihnachts-Lodge: rote Dächer mit weißem Saum, **bunte Lichterketten an Traufen, Ortgängen und Graten**, geschwungene Rauch-/Zuckerstangen-Ornamente auf dem Dach, Veranda mit Säulen, Mini-Tannen, festlicher Vorplatz | Thema Weihnachten: bunte Lichterketten entlang der Dachlinien, Mini-Tannen, festlicher Vorplatz, Veranda. Weißer Saum **nur** als Schneeschicht bei Schnee |
| `19664420`, `19664421` | Kapelle/Haus mit Turm: Eiche und Fichte, heller Steinturm mit gestaffelter, mehrstufiger Holzhaube, tiefe Traufen mit Schatten, Vordach mit Heuballen, Laternen | Turm als vertikaler Akzent mit mehrstufiger Haube, tiefer Dachüberstand, Vordach als Nebenbaukörper |
| `19864998`, `19865000` | Zweistufige Pagode: rote Pfosten-Riegel-Gliederung, Steindach mit hochgezogenen Ecken, Laternen an Ketten an allen Dachecken, Steinsockel mit Freitreppe, gelb leuchtende Shoji | Japanisch: gestaffelte mehrstufige Dächer, hochgezogene Ecken, Eckenlaternen, Sockel mit Freitreppe |
| `19921689`, `19921693` | Mittelalterhaus mit unregelmäßigem, „lebendigem“ hellen Dach (wie Stroh), dunkler Rahmen, weiße Ausfachung, Steinsockel, Gauben, Fensterläden, Büsche | Dachfläche mit sichtbarer Struktur (Stufen-/Plattenwechsel, kleine Unregelmäßigkeit), Gauben, Läden, Steinsockel |
| `20102835`, `20102837` (Oak Starter Base) | Symmetrisches Haus: Steinziegel-EG, Eichen-OG, Rahmen aus entrindeten Stämmen, großes Kreuzbalken-Motiv im Giebel, große gerahmte Fenster, Bänke am Eingang, Weg, terrassiertes Gelände mit Erdkanten, eigene Bäume | Balkenmotiv im Giebel, große gerahmte Fenster, Eingangsbänke, Weg mit Kanten, Grundstück mit Terrassenkante, eigene Bäume |
| `20200983`, `20200987` | Fantasy-Turmhaus: organisch geschwungene dunkle Holzrahmen, gewölbte helle Wandfelder, Kerzentürmchen, Steinsockel mit Bögen | Fernziel Fantasy: Bögen und geschwungene Rahmen als Akzent; nicht 1:1 nachbauen |
| `20226962` | Märchenhäuschen: Akazienrahmen, Sandsteinwände, runde Öffnungen mit Ringrahmen, Moos-/Azaleen-Dach, Blumenkästen, Pfostenfüße | Runde Öffnungen mit Rahmen, „lebendes Dach“ (Moos, blühende Azalee) als Option, Pflanzkästen |
| `20242880` (Medieval) | Schmales hohes Stadthaus: sehr steiler Spitzgiebel mit Spitze, Fachwerk, Blumenkasten unter jedem Fenster, niedrigerer Seitenanbau mit Ziegeldach | Archetyp „Stadthaus“ (schmal, hoch, steil) mit niedrigem Anbau; Blumenkästen als Standard |

**Was alle gemeinsam haben – das sind die Leitlinien dieser Stufe:**

1. **Dreiteilung:** Sockel (Stein) – Wand (Holz/Fachwerk, helle Ausfachung) – Dach. Das Dach ist hoch, oft 45–55 % der Gesamthöhe.
2. **Sichtbare Struktur:** dunkle Pfosten und Riegel vor heller Fläche, vorstehende Ecken, Balkenköpfe, auskragendes Obergeschoss.
3. **Dachkanten mit Schwung:** ausgestellte Ortgänge, Traufkanten mit Stufen, hochgezogene Spitzen, tiefer Überstand mit Schatten, Dachfläche mit Struktur statt glatter Fläche.
4. **Kaskade statt Kiste:** Hauptbau plus niedrigerer Querflügel, Anbau, Vordach oder Turm – mehrere Traufhöhen, sich kreuzende Dächer, ein klarer Blickfang.
5. **Tiefe überall:** Fenster mit Rahmen, Sims, Sturz, Blumenkasten, Laden; Glas zurückgesetzt; keine flache Wandfläche.
6. **Licht als Gestaltung:** Laternen an Traufecken, Eingang und Turm, warm leuchtende Fenster.
7. **Leben und Grün:** Büsche am Sockel, Ranken, Fässer, Truhen, Heu, Blumen, Wege, eigene Bäume, saubere Grundstückskante.
8. **Begrenzte Palette:** 3–4 Hauptmaterialien, warmes Holz + Stein + helle Ausfachung, klarer Hell-Dunkel-Kontrast.
9. **Kompakt und gemütlich:** etwa 9×9 bis 21×21 Grundfläche. Lieber kleiner und dichter als groß und leer.

---

## 3. Umsetzung in Phasen

Arbeite die Phasen der Reihe nach ab. **Jede Phase endet mit:** grünem `tsc`, `eslint` (0/0), passenden Vitest-Tests, Iso-Renders der betroffenen Stile (vorher/nachher ansehen und kritisch bewerten), Commit, und 3–5 Zeilen Status an mich. Danach direkt weiter mit der nächsten Phase.

### Phase 1 – Qualität messbar machen

Ohne Messung ist „besser“ geraten. Baue `src/core/analysis/buildQuality.ts` (Name frei), das für ein fertiges `VoxelModel` Kennzahlen berechnet, z. B.:

- **Tiefenebenen je Fassade** (wie viele verschiedene Abstände zur Wandebene kommen mit nennenswerter Fläche vor) und **Reliefanteil** (Anteil der Fassadenzellen außerhalb der Wandebene).
- **Silhouette:** Anzahl verschiedener Trauf- und Firsthöhen, vertikale Akzente (Turm, Kamin, Gaube), Dachanteil an der Gesamthöhe.
- **Palette:** Verteilung der Materialrollen gegen 60/30/10.
- **Detaildichte je Fassadenfläche** (Laternen, Falltüren, Blumen, Zäune, Knöpfe …) mit Unter- **und** Obergrenze (kein Überladen).
- **Vier Seiten:** Mindestdetail auf jeder Seite, keine nackte Rückseite.
- **Licht:** Eingang beleuchtet, Traufecken/Turm beleuchtet, Fenster hell.

Lege je Stil und Größe Zielbereiche fest (aus den Berichten 01 und 19 und den Referenzen) und mach daraus Regressionstests, die anfangs den Ist-Stand dokumentieren und mit jeder Phase strenger werden. Die Kennzahlen dienen später der Auswahl der besten Varianten (Phase 5).

### Phase 2 – Gesamtform: Archetypen statt Kiste (Bericht 19, T1/T2/T5/T6/T9/T10; Bericht 20, T10/T14/T15)

Führe eine **Kompositionsebene** über `plan.ts` ein: ein Archetyp beschreibt die Baumassen (Hauptbau, Querflügel, Anbau, Vordach/Veranda, Turm, Zwerchhaus) mit Größenverhältnissen, Traufhöhen, Dachtypen, Anschlussseiten, Blickfang (Eingang) und Symmetrie. Je Stil 4–8 Archetypen, abgeleitet aus Referenzen und Berichten, z. B.:

- **Mittelalter:** Fachwerkhaus mit Zwerchgiebel und niedrigerem Seitenflügel (Ref. 19098029/30); schmales Stadthaus mit Spitzgiebel und Anbau (Ref. 20242880); Haus mit Treppenturm; Eckhaus in L-Form.
- **Rustikal:** Steinsockel-EG mit Holz-OG, Balkon und Anbau mit Pultdach (Ref. 19098029/30, 20102835); Blockhütte mit Vordach (Ref. 17413756); Kapelle/Scheune mit Turm und mehrstufiger Haube (Ref. 19664420/21).
- **Fantasy:** Märchenhaus mit schiefem Hexenhut-Turm (Ref. 18791820); Häuschen mit runden Fenstern und lebendem Dach (Ref. 20226962).
- **Nordisch:** Langhaus mit Anbau; Blockhaus.
- **Japanisch / Kirschblüte:** zweistufige Pagode mit gestaffelten Dächern und Eckenlaternen (Ref. 19864998/19865000); Haus mit Engawa (umlaufendem Holzdeck).
- **Modern / Mediterran:** keine Referenzen – vorhandene Formen behalten, aber die Tiefen- und Kaskadenregeln anwenden.

Regeln: Nebenbaukörper sind deutlich niedriger und schmaler (Kaskade), Dächer schneiden sich sauber (Dach-Engine mit Vereinigung über das Maximum), Traufhöhen unterscheiden sich, ein Element ist der Blickfang. Archetypen wählt `resolveInput` passend zu Stil, Größe und Grundstück; **manuelle Optionen haben weiter Vorrang** (Flügel, Anbau, Turm, Maße). Neue Option `composition` (mit `"auto"`) in BuildSpec, `planSchema` (alle Felder Pflicht), Parser-Stichwörtern („Stadthaus“, „Kapelle“, „Pagode“, „Hexenhaus“, „Blockhütte“ …), Few-Shot-Beispielen, Testset-Fällen und in den Feinparametern der Oberfläche (nach `docs/UI_DESIGN.md`). Bau-Lints und Validator bleiben bei null Befunden.

### Phase 3 – Wandtiefe und Dachdetails (Bericht 01 T1–T12, 02, 03, 05, 06)

- **Tiefenleiter konsequent:** Glas und Türen in d = −1 (Laibung; im Bericht 01 T2 beschrieben, bisher bewusst zurückgestellt – jetzt lösen, inkl. Innenraum-Freiraum und Innenlicht), Rahmen und Lisenen in d = 0/+1, Sims und Sturz, Blumenkästen (Falltür-Kasten mit Blume), Fensterläden, vorstehende Eckpfosten, Balkenköpfe unter der Auskragung, Risalit für den Blickfang, Traufgesims. Regel: jede Hauptfassade hat mindestens drei Tiefenebenen (Kennzahl aus Phase 1).
- **Dachkanten mit Schwung:** ausgestellte Ortgänge mit Treppenstufen (Ref. 19098029), hochgezogene Firstspitzen, tiefe Überstände (1–2) mit Schattenfuge, Traufkante mit Stufe; für Fantasy eine leichte organische Krümmung (Grat durchhängend, Spitzen hoch) – deterministisch, nicht verrauscht.
- **Dachfläche mit Struktur:** sichtbare Reihen (Stufen/Platten-Wechsel, vorhandene Dachmischung ausbauen), bei Stroh-/„lebendem“ Dach kleine Unregelmäßigkeiten; optional Moos-/Azaleen-Dach für Fantasy und Rustikal.
- **Türme:** mehrstufige, gestaffelte Hauben (Ref. 19664420), Hexenhut für Fantasy, Pagodendächer mit hochgezogenen Ecken.
- **Licht:** Laternen an allen Traufecken (an Kette oder Ausleger), am Eingang, an Turm und Pagodenecken; Fenster bleiben warm beleuchtet (Innenlicht nur als Licht).

### Phase 4 – Umgebung und Leben (Bericht 15, 18, 19 T12/T14)

- **Keine Rückseite:** Hintertür bzw. Nebeneingang (scheiterte bisher an den Tür-Lints – Lints dafür sauber erweitern, nicht abschalten), Holzstapel, Fässer, Heu, Nutzgarten auf Rück- oder Seitenseite.
- **Grün am Haus:** Büsche (Laub in drei Größen) am Sockel, Ranken an Kamin und Wänden, Blumen-Drifts, hohes Gras.
- **Grundstück:** saubere Terrassen-/Grundstückskante (Gras oben, Erde/grobe Erde als Böschung, Ref. 20102835), Wege mit Kanten, eigene kleine Bäume je Stil.
- **Fundament nach unten verlängern** (neue Option, Standard aus, z. B. 0–4 Lagen unter Bodenniveau): damit die `.schem` auf unebenem Gelände nicht schwebt. Einfügepunkt und Doku (`docs/WORLD_EDIT_IMPORT.md`) so anpassen, dass das Bodenniveau beim Einfügen gleich bleibt.
- **Thema Weihnachten:** bunte Lichterketten entlang Traufen, Ortgängen und Graten (Ref. 19365618), Mini-Tannen, festlicher Vorplatz – in die vorhandenen Fest-Kits einfügen, Schneeregeln beachten.

### Phase 5 – Die besten Varianten auswählen (Bericht 20, T15/T16)

Statt genau drei Varianten zu erzeugen und alle zu zeigen: deterministisch N Kandidaten erzeugen (z. B. 16–32, Zeitbudget messen und festlegen), mit den Kennzahlen aus Phase 1 bewerten, und **die drei besten zeigen, die sich deutlich unterscheiden** (anderer Archetyp oder andere Silhouette). Gleiche Eingabe → gleiche drei Varianten. Die Oberfläche erklärt das ehrlich (heute steht dort „drei Varianten mit Seed 1, 2, 3“ – anpassen). Generierung darf auf dem Haupt-PC nicht spürbar langsamer werden; wenn nötig im Hintergrund/Worker.

### Phase 6 – Detail-Kits aus meinen eigenen Builds (Bericht 20, T14)

Ich will später selbst in Minecraft Lieblingsdetails bauen (Fenster, Tür, Kamin, Gaube, Balkon je Stil) und mit WorldEdit als `.schem` exportieren. Baue die Infrastruktur:

- Kit-Ordner (z. B. `kits/<stil>/`, nicht `.minecraft-assets`), je Kit eine `.schem` plus kleine JSON-Beschreibung (Bauteiltyp, Stil, Anker = WorldEdit-Offset, Blickrichtung Norden per Konvention, Mindest-/Höchstmaße, wohin es passt).
- Laden über den vorhandenen Schematic-Leser, prüfen gegen die Registry (nur gültige 1.21.11-Zustände, Größenlimit), drehen/spiegeln über die vorhandenen Transform-Hilfen, einsetzen über den Fassaden-/Bauteilplatz mit Vorrang vor der prozeduralen Variante. Ohne Kits läuft alles wie bisher.
- Tests mit im Test erzeugten Kits (keine fremden Dateien). Anleitung für mich auf Deutsch in `docs/DETAIL_KITS.md`: wie groß, wie ausrichten, wie exportieren, wohin legen.

### Phase 7 – Abschluss

- **Breitendurchlauf** über alle Stile × Größen × Themen × Detailgrade × mehrere Seeds sowie alle Bauwerkstypen und beide Versionen: null Validator-Reparaturen, null Befunde der Bau-Lints, Kennzahlen in den Zielbereichen. (Temporärer Vitest-Lauf, Befunde beheben und als Regressionstest einchecken.)
- Doku aktualisieren: `docs/ARCHITECTURE.md`, `README.md`, `docs/KI.md` (neue Planfelder), `docs/TEST_REPORT.md` (neuer Abschnitt mit echten Zahlen und ehrlichem „nicht geprüft“), `CLAUDE.md` (Verweis auf diesen Auftrag).
- **Galerie für mich:** vorher/nachher je Stil (Iso-Renders; auf dem Haupt-PC zusätzlich echte Texturen über `scripts/screenshots.mjs`), als Artifact-Seite veröffentlichen und mir den Link geben.
- E2E-Tests anpassen: Maß-Erwartungen in `tests/e2e/*.spec.ts` ändern sich, wenn Grundstücke oder Formen sich ändern – aus den echten Werten übernehmen (oder die Tests robuster machen).

---

## 4. Arbeitsweise und Werkzeuge

- **Agents:** Du darfst so viele Sub-Agents einsetzen, wie es hilft (ich habe das ausdrücklich erlaubt). Bewährt hat sich: erst eine gemeinsame Grundlage selbst bauen (Typen, Kennzahlen, Archetyp-Struktur), dann Bereiche mit **klarer Dateizuständigkeit** parallel in eigenen Git-Worktrees, am Ende selbst mergen und mit Renders prüfen. Gib jedem Agent eine gemeinsame Anleitung (Regeln aus Abschnitt 1, Rechner-Grenzen, Abschlussbericht) und eine eigene Dateiliste.
- **Welcher Rechner?** Prüfe den Benutzerordner:
  - `C:\Users\Luca Warmers` = **Arbeits-Laptop**: Intel i3 (4 Threads), **8 GB RAM**, kein Java, keine Minecraft-Datei, keine Playwright-Browser, aber **Microsoft Edge**. Schwere Befehle (tsc, Vitest, Build, Dev-Server, Playwright) **nie parallel** – nutze das Sperr-Skript `node "C:/Users/Luca Warmers/mcb-heavy.mjs" <befehl>` bzw. `… --serve <port> "<befehl>"` (startet einen Dev-Server, führt den Befehl aus, beendet den Server). Browsertests mit `PW_CHANNEL=msedge` (nutzt einen laufenden Server über `E2E_PORT`), UI-Screenshots mit `MCB_SHOT_CHANNEL=msedge node scripts/ui-shots.mjs <ordner> --generate`. In Worktrees mit verlinktem `node_modules` nur `next dev --webpack` (Turbopack lehnt das ab). Node ggf. mit `export PATH="/c/Program Files/nodejs:$PATH"`.
  - `C:\Users\Luca\…` = **Haupt-PC**: alles eingerichtet (Minecraft-Datei für echte Texturen, WorldEdit-Reader `npm run test:worldedit`, Playwright). Hardware selbst prüfen (in den Unterlagen stehen widersprüchliche Angaben).
- **Dateien haben CRLF-Zeilenenden:** mit Edit/Write-Werkzeugen oder Node-Skripten arbeiten; `sed` mit `\n` scheitert.
- **Vitest zeigt keine Konsolenausgabe** der Tests zuverlässig: Debug-Ausgaben in Dateien im Temp-Ordner schreiben.
- Generator-Prioritäten (`VoxelBuilder`): DECOR 10, ROOF_COVER 20, ROOF 30, STRUCTURE 50, CHIMNEY 60, ANNEX 70, OPENING 80, CLEARANCE 100 – neue Bauteile sauber einordnen.
- Halte die Oberfläche konsistent mit `docs/UI_DESIGN.md`, wenn du neue Optionen sichtbar machst (z. B. Archetyp in den Feinparametern).

---

## 5. Abnahme und Bericht

Fertig ist die Stufe, wenn:

1. alle Phasen umgesetzt sind und die Kennzahlen je Stil in den Zielbereichen liegen,
2. die Vorher/Nachher-Renders sichtbar zeigen: Kaskade statt Kiste, Tiefe in jeder Fassade, Dachkanten mit Schwung, Licht und Leben ums Haus – vergleichbar mit Ref. `19098029`, `19664420`, `20102835`,
3. `tsc`, `eslint .` (0/0), `vitest run`, `npm run build` grün sind und der Breitendurchlauf null Befunde hat; Browsertests angepasst und – soweit auf dem Rechner möglich – gelaufen,
4. alle meine Designentscheidungen eingehalten sind (keine Möbel, Schnee nur auf Wunsch und nur als Schicht, keine Schneeblock-Dachhaut, keine Eiszapfen).

Schlussbericht an mich (Deutsch, knapp): was neu ist, Galerie-Link, Testzahlen, was **nicht** geprüft wurde (z. B. echte Texturen, WorldEdit, Import in eine Welt, KI-Testset), offene Punkte und Vorschläge für die nächste Stufe. Pushen erst nach meiner Zustimmung.
