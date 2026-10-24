# Minecraft Christmas Builder

Eine lokale Website für Minecraft-Bauwerke. Du beschreibst deine Idee, bekommst ein **echtes Minecraft-Java-Bauwerk** aus Blöcken, kannst es in 3D ansehen und bearbeiten und exportierst es als **`.schem`-Datei für WorldEdit**. Vorschau, Materialliste, Editor, Speichern und Export lesen dabei **dasselbe** Blockmodell.

Zielversion ist **Minecraft Java 1.21.11** (DataVersion 4671); 1.21.1 ist als zweites Profil wählbar. Echte Prüfergebnisse stehen in [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md).

## Was die App kann

- **Fünf Bauwerkstypen:** Haus, Weihnachtsbaum, Marktstand, Bahnhof und Turm (Rundturm mit Kegel, Kuppel oder Zinnen).
- **Acht Baustile als Daten:** Mittelalter, Fantasy/Märchen, Rustikal, Nordisch, Japanisch, Kirschblüte, Modern, Mediterran – mit 36 Paletten, Materialrollen (Wand, Rahmen, Dach, Sockel …), Proportionen, Dachvorlieben und Fenster- und Türvorlagen. Dazu das **Thema** unabhängig vom Stil: kein Thema, Winter oder Weihnachten.
- **Häuser mit echter Bautechnik:**
  - **Bauformen statt Kiste:** je Stil 4–6 Archetypen (z. B. Kreuzgiebelhaus, schmales Stadthaus, Treppenturm, Kapelle mit Turm, Chalet mit Balkon, Blockhütte mit Veranda, Hexenhaus mit Rundturm, Langhaus, Pagode, Engawa-Haus, versetzte Kuben, Villa mit Turm) mit Höhenstaffelung von Hauptkörper, Querteilen und Türmen; wählbar unter „Feinparameter → Bauform“.
  - **Tiefe in jeder Fassade:** Glas und Türblatt sitzen eine Ebene in der Wand (Laibung mit Futter), Läden oder Blumenkästen nach Stil, mindestens drei Tiefenebenen je Hauptfassade.
  - Sockel mit Treppenschürze an Ecken und Eingang, Rahmen und Ständer eine Ebene vor der Wand, Fachwerk mit Streben und geschlossenen Eckfeldern (Fassadenrhythmus), Geschossbänder, Auskragung (Jetty) mit einer Knagge unter jedem Ständer – keine flache Wand breiter als 5 Blöcke. Holzhäuser ohne Fachwerk nur mit Eckpfosten, Blockhäuser aus liegenden Stämmen mit Kreuzecken, mediterrane Häuser mit Gurtgesims; Verwitterung in unregelmäßigen Flecken statt als Band.
  - Echte Geschosse mit Böden und Treppe oder Leiter; in jedem Raum eine Laterne an der Kette, im Dachboden eine stehende Laterne (kein dunkler Raum, Fenster leuchten nachts). Sonst bleiben die Innenräume frei.
  - Begehbarer Eingang auch bei hohem Sockel: Podest und je Sockelreihe eine Stufe (höchstens ½ Block), mit Wangen.
  - Dachkanten mit Schwung: erhöhter Ortgang mit ausgestelltem Fuß, durchhängender First (Fantasy), hochgezogene Ecken (Japanisch); Ziegelreihen, Strohbuckel, lebendes Moos-Dach; gestufte Turmhauben mit Laternenstube; Laternen an allen freien Traufecken.
  - Dächer aus Treppen und Stufen: Sattel, Walm, Krüppelwalm, Irimoya (unten Walm, oben Giebel – für Japanisch und Kirschblüte), Pyramide, Mansard, Gambrel, Saltbox, A-Frame, Flach, Pult, Pagode; Profile gerade, steil, flach, ausgestellt, Glocke, konvex.
  - Eine Neigung je Haus aus einer Neigungsleiter (27°–63°) statt oben abgeflachter Steildächer; die Dachhöhe folgt Stil und Wandhöhe. Kontrast nur als schmales Ortgangbrett, Traufe im Dachmaterial; Dachfläche mit dunkleren Streifen von der Traufe und Bleiche am First; Untersicht, First-Varianten, Firstzier je Stil (Blitzableiter, Endstab, gekreuzte Windbretter, aufgebogene Firstenden), Gauben auf beiden Dachseiten, Kehlen bei Flügeln.
  - Giebelfelder: Fachwerkgiebel eine Ebene zurück mit Firstständer und Kehlbalken, sonst Giebelfenster auf der Firstachse.
  - Kamine mit zweibreitem Schaft, Fuß, auskragendem Kopf und versenktem Feuer.
  - Fenster W01–W18 und Türen T01–T10 als Vorlagen (Simse, Läden, Blumenkästen, Bögen, Rundfenster, Shoji, Bandfenster, Bleiglas, Doppeltür, Portal …), Laternen an jedem Eingang.
  - Flügel (L/T/U), Zwerchgiebel, Anbau, eckiger oder runder Turm, Erker, Balkon, Veranda, Kamin mit Rauch; Grundrisse länglich je Stil (Mittelalter und Fantasy mit dem Giebel zur Straße), Modern aus zwei versetzten Kuben mit dünner Dachplatte.
- **Türme:** Zinnenkrone auf einem tragenden Konsolenkranz, wenige Bänder, Kegel mit Traufknick und schlanker Spitze, Hexenhut, Kuppel mit Tambour, Zwiebelhelm, Bogenfenster.
- **Landschaft je Stil:** geschwungene Wege aus der Palettenrolle Weg mit Bordsteinen, Grenzen (Hecke, Zaun, Feldmauer, Bambuszaun …) mit Tor, 14 Laternenpfahl-Designs im Rhythmus, Büsche in drei Größen am Sockel, Beete, Blumen-Drifts, hohes Gras und große Farne, Bäume, Felsen, Holzstapel, Nutzgarten mit Vogelscheuche, Ranken an Kamin und Wänden; im Winter keine Blumen. Jede Seite ist gestaltet: Hintertür mit eigenem Weg. Das Grundstück wächst mit dem Haus.
- **Fundament nach unten** (optional, 1–4 Lagen): Sockel und Erdreich reichen unter den Boden, am Rand eine Böschung mit Grasstufen – das Bauwerk schwebt nicht auf unebenem Gelände; beim Einfügen bleibt der Boden auf Höhe deiner Füße.
- **Weihnachtsmarkt und Bahnhof:** Markthütten mit Klappladen, Gasse mit Lichterketten; Bahnhof mit Hausbahnsteig unter Pultdach, Gleisbett mit Schwellen, runder Uhr, Signalen und Güterschuppen.
- **Festschicht:** Weihnachtsbaum mit Etagen, Schmuck in Stilfarben und mitwachsendem Stern; Geschenkgruppen unter dem Baum oder neben dem Eingang; Girlanden mit Durchhang, Schleifen an Ankerpunkten und verstecktem Licht; bunte Lichterketten aus Kerzen an Traufen, Ortgängen und First; Mini-Tannen am Weg zur Tür; Kränze als Ring; Kerzen je Fassade einheitlich; Laternen an Ketten. Jeder Stil hat ein eigenes Fest-Kit (z. B. Japanisch mit Kadomatsu statt Baum, Nordisch mit Julbock, Modern mit Lichtband). Schnee nur auf ausdrücklichen Wunsch und nur als Schneeschicht, dort, wo sie im Spiel liegen bleibt (nie Schneeblöcke); keine Eiszapfen.
- **Geformte Blöcke wie im Spiel:** Treppen, Stufen, Zäune, Mauern, Scheiben, Türen, Falltüren, Laternen, Ketten, Kerzen, Leitern … Ein Zustandsauflöser berechnet Treppenecken und Verbindungen so, wie Minecraft es beim Setzen täte; ein Validator verhindert Blöcke, die im Spiel abfallen würden.
- **Freitext auf Deutsch**, z. B. „mittelalterliches Fachwerkhaus mit zwei Geschossen, Erker und rundem Turm vorne links“:
  - Ein regelbasierter Parser erkennt Typ, Stil, Thema, Größe, Maße, Dach, Bauteile, Fenster- und Türformen, Materialien und Verneinungen und erklärt, was er verstanden hat.
  - Wünsche, die nicht gebaut werden (z. B. Pool, Möbel), erscheinen als „nicht umsetzbar“.
- **Einstellungen und Feinparameter:** Typ, Stil, Thema, Größe, Detailgrad, Seed, Minecraft-Version; dazu Maße, Geschosse, Dach, Form und Bauteile, Fenster- und Türform, Licht und Festschmuck, Palette und Material je Rolle. Manuelle Einstellungen haben Vorrang vor dem Text; Konflikte und angepasste Wünsche werden angezeigt.
- **Die drei besten Varianten:** Bei Häusern bewertet die App 8–16 Kandidaten (je Größe) mit Kennzahlen der Bauqualität (Tiefe, Silhouette, Materialien, Rückseite, Licht) und zeigt die drei besten, die sich deutlich unterscheiden (andere Bauform oder Silhouette). Gleiche Eingabe, gleiche drei – bitgenau reproduzierbar.
- **Eigene Detail-Kits:** Fenster, Türen, Balkone, Gaubenfronten und Kaminköpfe, die du in Minecraft baust und mit WorldEdit speicherst, setzt der Generator vor seinen eigenen Vorlagen ein: [`docs/DETAIL_KITS.md`](docs/DETAIL_KITS.md).
- **Große Bauwerke** bis 192 × 384 × 192 Blöcke (volle Bauhöhe), komprimierter Transport, Vorschau in Chunks im Web Worker.
- **3D-Vorschau mit echten Minecraft-Texturen** aus deiner eigenen Installation (offizieller Launcher, CurseForge, Modrinth, Prism) oder nach Bestätigung der EULA direkt von Mojang; geformte Blöcke mit ihrer echten Geometrie. Ohne Texturen zeigt sie Farben. Details: [`docs/TEXTURES.md`](docs/TEXTURES.md).
- **Editor:** Blöcke in 3D setzen, entfernen, ersetzen, per Pipette aufnehmen; Blockzustände wählen; Material global austauschen; Rückgängig/Wiederholen. Nachbarn (Treppenecken, Zäune, Türhälften) passen sich wie im Spiel an.
- **Materialliste** mit Blöcken, Items und Stacks (Türen zählen einmal, doppelte Stufen zweimal, Kerzen je Kerze).
- **Projekte speichern** im Browser (IndexedDB): öffnen, umbenennen, duplizieren und löschen, inklusive Bearbeitungen; alte Projekte werden beim Laden übersetzt.
- **`.schem`-Export** (Sponge Schematic v3): Der Server prüft das Modell, schreibt die Datei und liest sie mit einem unabhängigen Leser zurück; erst dann startet der Download. Im Test liest der **echte EngineHub-WorldEdit-7.4.2-Reader** jeden Blockzustand und alle Bauwerke identisch.
- **Optionale KI-Planung**, eingerichtet direkt in der App („KI einrichten“): über **OpenRouter** (Cloud-Modelle, eigener API-Schlüssel, Bruchteile eines Cents pro Plan) oder über **Ollama** lokal auf deinem PC (kostenlos, ohne Cloud). Die KI liefert nur einen geprüften Bauplan; alle Blöcke setzt immer der regelbasierte Generator. Ohne Einrichtung bleibt die KI aus.

**Noch offen:** Der Import in einer echten Minecraft-Welt ist **noch nicht verifiziert**, siehe unten.

## Schnellstart unter Windows

1. **Node.js 22 LTS** von <https://nodejs.org> installieren (Standardoptionen).
2. Den Projektordner herunterladen, z. B. per Git oder als ZIP von GitHub, und entpacken.
3. **`start-windows.cmd` doppelklicken.** Beim ersten Mal werden die Abhängigkeiten installiert und die App gebaut. Sobald die App antwortet, öffnet sich <http://localhost:3000> im Browser.
4. Zum Beenden das schwarze Fenster schließen. Bricht die App mit einem Fehler ab, bleibt das Fenster offen und zeigt die Meldung.

Optional für die KI-Planung: [`docs/KI.md`](docs/KI.md) – OpenRouter-Konto und API-Schlüssel (mit Modellempfehlung, Kosten und Datenschutz) oder Ollama lokal; eingetragen wird beides in der App unter „KI einrichten“.

## Starten (alle Systeme, Kommandozeile)

```sh
npm ci
npm run dev          # Entwicklung mit automatischem Neuladen: http://localhost:3000
```

Produktionsbetrieb (schneller):

```sh
npm run build
npm start            # http://localhost:3000
```

Voraussetzung: Node.js **≥ 22.12**.

## Bedienung in Kürze

1. **Beschreibung** eintippen oder ein Beispiel anklicken. Darunter erscheinen die erkannten Wünsche, eine kurze Erklärung und Wünsche, die nicht umsetzbar sind.
2. Bei Bedarf **Einstellungen** oder **Feinparameter** ändern und **„Bauwerk generieren“** klicken.
3. Eine **Variante** wählen. Im **Editor** einen Werkzeugmodus wählen (Setzen, Entfernen, Ersetzen, Pipette) und auf das Modell klicken; Ziehen dreht weiterhin die Ansicht.
4. **„Als .schem herunterladen“** (Bereich „Export“), danach in Minecraft einfügen: [`docs/WORLD_EDIT_IMPORT.md`](docs/WORLD_EDIT_IMPORT.md).
5. **„Projekt speichern“**, um später weiterzuarbeiten (Menü „Projekte“ oben rechts).

## Tests

| Befehl | Inhalt |
|---|---|
| `npm run typecheck` | TypeScript (`strict`) |
| `npm run lint` | ESLint |
| `npm test` | Vitest: Generatoren, Parser, Registry, Editor, Export, Speichern, API, KI-Clients und KI-Einstellungen (gegen simulierte Ollama- und OpenRouter-Server), WorldEdit-Reader (falls gebaut) |
| `npm run worldedit:build` | baut den WorldEdit-7.4.2-Reader (JDK 21, Maven, git, python3; unter Windows Git Bash oder WSL) |
| `npm run test:worldedit` | Exporte werden mit dem echten WorldEdit-Reader gelesen; schlägt fehl, wenn der Reader fehlt |
| `npm run test:e2e` | Playwright-Browsertests (Desktop und Handy); baut und startet die App selbst |
| `npm run check` | Typecheck, Lint, Tests und Build |
| `node scripts/screenshots.mjs <fälle.json>` | Screenshots der laufenden App mit echten Texturen (siehe Kopf des Skripts) |

Playwright ist auf 1.56.1 festgelegt. Beim ersten Mal muss der Browser installiert werden: `npx playwright install chromium`.

## Projektstruktur

```text
src/app/                 Seite und API: /api/generate, /api/export, /api/ai/*, /api/textures/*
src/components/builder/  Eingabe, Stil und Thema, Feinparameter, KI, Varianten, Material, Export, Projekte
src/components/editor/   Block-Auswahl, Editor-Panel
src/components/preview/  3D-Szene, Chunk-Meshing im Web Worker, Werkzeugleisten
src/core/blocks/         Registry, Formen (1/16-Boxen), Zustandsauflöser, Validator, Drehen/Spiegeln
src/core/style/          Materialien, Paletten, Stile, Lints, Verwitterung, Texturstatistik
src/core/generator/      Parser, Haus (Plan, Wände, Dächer, Öffnungen, Bauteile, Rundturm), Baum, Markt, Bahnhof, Turm, Landschaft, Festschicht
src/core/templates/      Fenster- und Türvorlagen als Daten, Balkon
src/core/geometry/       Kreise, Kugeln, Kegel, Bögen, Zinnen
src/core/analysis/       Materialliste, Bau-Lints, Kennzahlen der Bauqualität
src/core/kits/           Detail-Kits: Einlesen, Vorlagen, Bibliothek (Laden: src/lib/kits/)
src/core/schema/         BuildSpec v2 (Zod), Migration, VoxelModel, Text/Einstellungs-Auflösung
src/core/editor/         Editier-Operationen und Verlauf
src/core/export/         VarInt, Sponge-v3-Writer, unabhängiger NBT-Leser, Validator
src/core/ai/             Bauplan-Schema, Prompt, Beispiele
src/lib/                 KI (OpenRouter, Ollama, Einstellungen), Transportformat, IndexedDB-Projekte, Texturen, API-Helfer
scripts/                 Screenshot-Skript (echte Texturen), WorldEdit-Testlauf
tests/                   unit, integration, e2e, fixtures, helpers, worldedit (Java-Reader)
docs/                    Architektur, Kompatibilität, Import, KI, Texturen, Testbericht, Screenshots
```

## Grenzen

- Nur Minecraft **Java** und Vanilla-Blöcke; Block-Entities (Truhen-Inhalte, Schilder-Texte, Banner) werden nicht geschrieben.
- Maximales Volumen 192 × 384 × 192 Blöcke, 4096 verschiedene Blockzustände.
- Innenräume bleiben bewusst leer (keine Möbel); nur Licht (Laternen) wird innen gesetzt.
- Die Vorschau zeigt Original-Texturen nur, wenn eine Minecraft-Installation gefunden oder ausgewählt wurde. Animationen, Licht und Schatten des Spiels gibt es in der Vorschau nicht.
- Projekte liegen nur in diesem Browser auf diesem Gerät.
- Die KI kann nur kombinieren, was der Generator kennt. Ein Lauf mit einem echten Modell wurde noch nicht durchgeführt: Die OpenRouter-Anbindung ist nur gegen einen simulierten Server getestet, Ollama ist auf dem Arbeitsrechner nicht installiert (siehe `docs/KI.md`).

## Dokumentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): Datenfluss, Datenmodell, Generatoren, Editor, API-Verträge
- [`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md): Versionsprofile, Verifikation, Blockliste
- [`docs/WORLD_EDIT_IMPORT.md`](docs/WORLD_EDIT_IMPORT.md): Import in Minecraft
- [`docs/KI.md`](docs/KI.md): KI-Planung einrichten – OpenRouter (Modellempfehlung, Kosten, Datenschutz) oder Ollama lokal
- [`docs/TEXTURES.md`](docs/TEXTURES.md): echte Minecraft-Texturen in der Vorschau
- [`docs/DETAIL_KITS.md`](docs/DETAIL_KITS.md): eigene Bauteile aus Minecraft als Detail-Kits
- [`docs/AUFTRAG_PROFI_BUILDS.md`](docs/AUFTRAG_PROFI_BUILDS.md): Auftrag der Ausbaustufe „Profi-Builds“ (Phasen 1–7); Lückenanalyse in [`research_notes/Referenzen 2026-10/analyse.md`](<research_notes/Referenzen 2026-10/analyse.md>)
- [`docs/AUFTRAG_PHASEN_1-8.md`](docs/AUFTRAG_PHASEN_1-8.md) und [`docs/PLAN_PHASEN_1-8.md`](docs/PLAN_PHASEN_1-8.md): Auftrag und Umsetzungsplan der Ausbaustufe (Phasen 1–8)
- [`docs/screenshots/`](docs/screenshots/): Bilder aller Stile und Bauwerkstypen mit echten Texturen
- [`reports/Minecraft Bautechniken für Generator.md`](<reports/Minecraft Bautechniken für Generator.md>): Recherche zu Minecraft-Bautechniken und Umsetzungsplan für den nächsten Generator (Quellennotizen in `research_notes/`)
- [`research_notes/Bauqualitaet 2026-10/`](<research_notes/Bauqualitaet 2026-10/>): 20 Rechercheberichte zur Bauqualität (Wandtiefe, Fassadendetails, Fenster, Türen, Dächer, Paletten, sechs Stilbibeln, Winter/Weihnachten, Gelände, Türme, Sonderbauten, Licht, Proportionen, prozedurale Generatoren), Grundlage der Ausbaustufe „Bauqualität“
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md): ausgeführte Prüfungen mit Ergebnissen
- [`tests/worldedit/README.md`](tests/worldedit/README.md): Aufbau des WorldEdit-Readers
