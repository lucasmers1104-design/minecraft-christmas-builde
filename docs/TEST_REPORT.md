# Testbericht

**Stand:** 2026-10-22, alle Phasen (0–5) plus Editor, Windows-Start und echte Minecraft-Texturen. Alle Ergebnisse unten stammen aus tatsächlich ausgeführten Befehlen in der Entwicklungsumgebung (Linux-Container, kein Windows, keine Grafikkarte).

## Umgebung

| Komponente | Version |
|---|---|
| Node.js / npm | 22.22.0 / 10.9.4 |
| Next.js / React | 16.4.2 / 19.3.1 |
| TypeScript | 6.0.2 (`strict: true`, `noUncheckedIndexedAccess`) |
| ESLint | 9.39.5 mit `eslint-config-next` 16.4.2 |
| Vitest | 5.0.5 (IndexedDB-Tests mit `fake-indexeddb` 6.2.6) |
| Playwright / Chromium | 1.56.1 / Build 1194 (headless, SwiftShader-WebGL) |
| three / @react-three/fiber / drei | 0.186.1 / 9.8.2 / 10.7.9 |
| prismarine-nbt / zod / dexie / minecraft-data | 2.8.0 / 4.6.7 / 4.4.6 / 3.117.0 |
| Java / Maven / Python (WorldEdit-Reader) | OpenJDK 21.0.12.1 / 3.9.11 / 3.13.16 |
| WorldEdit (Reader) | EngineHub **7.4.2** @ `eb8e82c3d8843bed3f71e82ea974122415645178`, aus Quellcode gebaut |

## Ausgeführte Befehle und Ergebnisse

Abschlusslauf am 2026-10-22, nacheinander auf demselben Stand:

| Befehl | Ergebnis |
|---|---|
| `npm run typecheck` | ✅ keine Fehler |
| `npm run lint` | ✅ 0 Fehler, 0 Warnungen |
| `MCB_MINECRAFT_JAR=<1.21.11.jar> npx vitest run` (= `npm test` mit echter Client-Datei) | ✅ 17 Dateien, **213/213 Tests bestanden**, inkl. der 13 WorldEdit-Tests und des Tests gegen die echte Minecraft-1.21.11-Client-Datei |
| `npm run test:worldedit` | ✅ 1 Datei, **13/13 bestanden** (echter WorldEdit-Reader, Pflichtmodus) |
| `python3 tests/worldedit/fixtures-src/selftest.py` | ✅ **26/26 Fixture-Erwartungen erfüllt**, Reader „EngineHub WorldEdit 7.4.2“ (Lauf vom 2026-10-21, Reader seitdem unverändert) |
| `npm run build` | ✅ Produktionsbuild erfolgreich (`/` statisch; `/api/generate`, `/api/export`, `/api/ai/*`, `/api/textures*` dynamisch) |
| `npm run test:e2e` | ✅ **25/25 bestanden** (24 Desktop, 1 Mobil/Pixel 7), Laufzeit 2,4 min |
| `npm audit --omit=dev` | ✅ 0 Schwachstellen in Laufzeitabhängigkeiten |

`npm audit` über alle Abhängigkeiten meldet 5 „high“-Funde. Sie liegen ausschließlich in der Dev-Toolchain (`eslint-config-next` → `fast-glob` → `micromatch` → `braces`). Der einzige von npm angebotene Fix wäre ein Downgrade auf `eslint-config-next@14`, das nicht zu Next 16 passt.

Der WorldEdit-Reader selbst wurde in dieser Sitzung aus dem Quellcode gebaut (`tests/worldedit/build.sh --selftest`, Linux). Kalter Build mit Selbsttest ca. 90 s, erneuter Build mit Cache ca. 35 s.

## Testinhalte

### Generatoren (Unit)

- **Haus, Strukturprüfung an den echten Blockdaten** (`tests/helpers/houseInspection.ts`):
  - Fundament unter der ganzen Grundfläche, vier lückenlose Wände;
  - Eingang 2 Blöcke hoch und von außen bis innen frei, mit Boden und Weg;
  - Fenster aus Glas in allen vier Wänden, von innen und außen frei (außer dort, wo ein Anbau anschließt);
  - Dach deckt jede Zelle der Grundfläche ab und ist spiegelsymmetrisch (asymmetrische Bauteile ausgenommen);
  - Schornstein durchgehend und über den First ragend;
  - mindestens 60 % der begehbaren Innenfläche frei, Innenhöhe ≥ 3;
  - **keine schwebenden Blöcke**, d. h. alles ist mit dem Boden verbunden;
  - Durchgänge zu Turm und Anbau sind frei.
- **Alle 243 Kombinationen** aus Größe × Stil × Material × Farbe × Detailgrad, jeweils mit Seed 1, 2 und 3 (729 Häuser): alle gültig.
- **Feinparameter:** Jede Option (Maße, Dachform, Fensterdichte, Materialien pro Bauteil, Balkenholz, Schalter) verändert das Modell und bleibt strukturell gültig. Alle 8 Maß-Extreme (7/33 × 5/25 × 3/8) sind gültig. Zu große Kombinationen werden verständlich abgelehnt.
- **Bauteile:** Turm links/rechts, Anbau links/rechts, Vordach, Hecke, Walmdach und Kombinationen sind in allen Größen gültig. Turmschacht begehbar, Vordach über dem Eingang, Hecke mit Lücke und Weg. Turm und Anbau auf derselben Seite werden aufgelöst und gemeldet.
- **Weihnachtsbaum, Marktstand, Bahnhof:** jeweils alle 243 Kombinationen gültig, in den Grenzen und ohne schwebende Blöcke. Weitere Prüfpunkte:
  - deterministisch;
  - jede Einstellung wirkt;
  - Baum: Stamm durchgehend, Stufen verjüngen sich, Stern oben;
  - Marktstand: Budenzahl je Größe, Theke, freier Platz dahinter;
  - Bahnhof: echte Schienen auf festem Grund, Gebäude mit Tür zum Bahnsteig.
- **Determinismus und Varianten:** Gleiche Spec und gleicher Seed ergeben bitgleiche Daten. Seeds 1, 2 und 3 ergeben drei unterschiedliche, gültige Varianten.
- **Gegenprobe:** Die Strukturprüfung erkennt eingebaute Fehler (Loch in der Wand, blockierter Eingang, schwebender Block, verdecktes Fenster).

### Freitext-Parser und Einstellungs-Auflösung (Unit)

- Erkennt Bauwerkstyp, Stil, Größe, Material, Farben, Maße, Fensterdichte, Dachform, Bauteile mit Seite sowie Verneinungen („ohne Schnee“). Umlaute dürfen auch umschrieben sein („Haeuschen“).
- **Jede erkannte Einstellung verändert das erzeugte Modell.**
- Nicht umsetzbare Wünsche (Türen, Treppen, Balkon, Keller, Pool, Garage, Möbel) erscheinen als Warnung. Gerade oder zu große Maße werden angepasst, und die App sagt das.
- **Keine Fehlalarme durch Wortteile:** „Schornstein“ ist kein Steinhaus, „Schneesturm“ kein Turm, „realistisches“ kein Tisch, „türkis“ keine Tür.
- `resolveSpec`: Manuelle Einstellungen haben Vorrang vor dem Text und erzeugen einen Konflikthinweis; Zurücksetzen stellt den Textwert wieder her.

### Editor (Unit)

- Setzen, Entfernen, „Alle ersetzen“ und „Bereich füllen“ ergeben valide, neu gehashte Modelle. Rückgängig stellt den alten Hash exakt wieder her.
- Ungültige Blöcke, Positionen außerhalb und veraltete Befehle werden abgelehnt. Der Verlauf ist begrenzt.
- Bearbeitete Modelle exportieren verlustfrei. Die Ebenenansicht blendet Blöcke oberhalb aus und zeigt Schnittflächen.

### Projekte (Unit, IndexedDB)

- Speichern → Laden ergibt identische Voxeldaten und Hashes, inklusive Bearbeitungen.
- Liste, Umbenennen, Aktualisieren, Duplizieren und Löschen funktionieren.
- Ungültige Namen und beschädigte Daten werden mit verständlichem Fehler abgelehnt.

### Registry und Kompatibilität (Unit)

- Standardprofil ist 1.21.11. DataVersion 4671 (1.21.11) und 3955 (1.21.1) stimmen mit `minecraft-data` überein.
- **Alle 128 Registry-Blöcke** existieren in 1.21.11 und in 1.21.1 mit exakt denselben Eigenschaften und Werten.
- `checkBlockState` lehnt unbekannte Blöcke, ungültige Werte, fehlende oder unbekannte Eigenschaften, nicht kanonische Reihenfolge und Syntaxfehler ab.

### VarInt, Hash, Transport, Mesh (Unit)

- **VarInt:** Werte < 128 und ≥ 128 bis 2³²−1 mit festen Bytefolgen (z. B. 300 → `AC 02`). Abgeschnittene, überlange und überzählige Datenströme werden abgelehnt.
- **SHA-256:** stimmt mit Testvektoren und `node:crypto` überein.
- **Transport:** Byte-Reihenfolge little-endian, Roundtrip verlustfrei, Grenzen dokumentiert. Manipulierte Hashes, Maße, Indizes, Paletten und Specs werden abgelehnt.
- **Mesh:** Face-Culling; Luft ergibt keine Flächen. Glas und Leuchtblöcke landen in eigenen Puffern.

### Export (Integration)

- **v3-Layout,** gelesen mit `prismarine-nbt` als zweitem Leser: Root `""` → `Schematic`, `Version` 3, DataVersion des gewählten Profils (4671 bzw. 3955), Short-Maße, `Blocks` mit Palette, VarInt-Daten und leerer `BlockEntities`-Liste, kein v2-Layout.
- **Roundtrip:** jeder Block an jeder Koordinate identisch, Hash identisch, auch mit dem eigenen, unabhängigen NBT-Leser.
- **Paletten mit mehr als 127 Einträgen** (Mehrbyte-VarInts) werden verlustfrei gelesen. Gleiches Modell ergibt eine bytegleiche Datei.
- **Negativfälle:**
  - Der Export verweigert Modelle mit falschem Hash, unbekanntem Block, ungültiger Eigenschaft, Übergröße, inkonsistenter Palette oder unbekannter Zielversion.
  - Der Validator erkennt abgeschnittene VarInts, falsche Tag-Typen, v2-Felder, falsche DataVersion, ungültige Indizes, unbekannte Blockstates, Nicht-GZip, abgeschnittenes NBT und Abweichungen vom erwarteten Modell.
  - Zeichen, die in Javas „modified UTF-8“ anders kodiert würden, werden abgelehnt.

### API (Integration)

- **`/api/generate`:** 200 mit drei verlustfrei dekodierbaren Varianten (auch für den Bahnhof); 400 bei ungültiger Spec, kaputtem JSON oder Zusatzfeldern; 422 bei Maßen, die das Maximalvolumen sprengen; 413 bei zu großer Anfrage.
- **`/api/export`:** 200 mit korrekten Headern und einer Datei, die der Validator als identisch bestätigt; 400 bei manipuliertem Hash, verbotenem Block oder fehlendem Modell; 413 bei Übergröße.

### Lokale KI (Integration, gegen einen simulierten Ollama-Server)

Getestet wird gegen einen HTTP-Server im Test, der Ollamas `/api/tags` und `/api/chat` nachbildet. **Ein echtes Sprachmodell lief hier nicht.**

- Standardmäßig aus; die Ollama-Einstellungen kommen aus der Umgebung.
- **Status:** aus, erreichbar, Modell fehlt, nicht erreichbar.
- **Gültiger Plan:** wird mit Zod geprüft und erzeugt echte Modelle. Eine ungültige erste Antwort wird in einer zweiten Runde korrigiert.
- Modelle ohne „think“-Unterstützung bekommen automatisch eine Wiederholung ohne das Flag.
- **Verständliche Fehler** für Unsinn, Zeitüberschreitung, fehlendes Modell, nicht erreichbar und deaktiviert.
- **API-Routen:** `/api/ai/status` und `/api/ai/plan`; ohne Aktivierung antwortet `/api/ai/plan` mit 503, und die App fällt auf den regelbasierten Generator zurück.

### Echte Minecraft-Texturen (Unit, Integration, E2E)

Details: `docs/TEXTURES.md`.

- **Unit** (`tests/unit/textures.test.ts`, 19 Tests):
  - ZIP-Leser inklusive CRC-Prüfung.
  - Variantenwahl, gewichtete Varianten, Multipart mit `OR`/`AND`/Verneinung.
  - Modellvererbung und Texturverweise.
  - Ausrichtung von Stämmen (Achse) und Kürbislaternen (facing).
  - Standard-UVs und Eckenreihenfolge, gedrehte Kreuz-Elemente, `uvlock`.
  - Flächen-Ausblendung: fest/fest, Glas/Glas, Laub/Laub, Glas/fest.
  - Helligkeit je Richtung, Laubfärbung und Ebenenschnitt.
  - Launcher-Suche (Pfadmuster, Mods-Ordner ausgeschlossen, Versionsvorrang).
  - Alle Registry-Blöcke mit einer selbst erzeugten Test-Datei im Minecraft-Format.
- **Integration** (`tests/integration/textures.test.ts`):
  - Status ohne Installation.
  - Datei-Übernahme und Ablehnung fremder Dateien.
  - Automatischer Fund im Launcher-Ordner und Vorrang von `MINECRAFT_JAR`.
  - Mojang-Download nur mit Zustimmung, nur von Mojang-Hosts, Prüfsumme kontrolliert (simulierter Server).
- **Echte Client-Datei:** Mit der offiziellen 1.21.11-Client-Datei (SHA-1 `ba2df812…`, von Mojangs Servern in die Testumgebung geladen und nicht ins Projekt übernommen) wurden **alle 248 Blockzustände** der App vollständig aus den Original-Modellen gebacken: keine fehlenden Modelle oder Texturen, Kürbislaterne und Stämme richtig ausgerichtet.
- **E2E** (`tests/e2e/textures.spec.ts`):
  - Datei im Browser auswählen, danach ist die Vorschau texturiert.
  - Symbole in der Materialliste, Umschalten an/aus, nach dem Neuladen sofort aktiv.
- **Sichtprüfung:** Screenshots von Haus, Weihnachtsbaum, Marktstand und Bahnhof mit Original-Texturen, darunter Fichtenholz, Stämme, Bruchstein, Glas, eingefärbtes Laub und Schienen auf dem Gleisbett.

### Echter WorldEdit-Reader (Integration, `tests/integration/worldedit.test.ts`)

Das Java-Harness öffnet jede exportierte `.schem` mit `ClipboardFormats.findByFile` und `SpongeSchematicV3Reader` von EngineHub WorldEdit 7.4.2 auf der `worldedit-cli`-Plattform. Erwartet wird in jedem Fall:

- Format `SPONGE_V3_SCHEMATIC`;
- DataVersion der Datei und der geladenen Registry wie im Profil (4671 bzw. 3955);
- keine Warnungen und Fehler (inkl. `--require-canonical`);
- gleiche Maße, Mindestpunkt (0,0,0) und gleiche Anzahl Nicht-Luft-Blöcke;
- **jeder Block** in WorldEdits eigener Darstellung (`getAsString`) identisch zum Modell.

Geprüft wurden 13 Fälle:

- **Häuser:**
  - die drei Standardvarianten (Seed 1, 2, 3);
  - klein/realistisch/Eiche/Natur/Detailgrad 1 sowie groß/märchenhaft/Stein/Eisblau/Detailgrad 3;
  - ein Haus im Profil 1.21.1;
  - ein großes Haus mit Turm, Anbau, Vordach, Hecke und Walmdach;
  - Feinparameter mit Birke, Ziegel, rotem Dach und vielen Fenstern.
- **Andere Bauwerke:**
  - großer Weihnachtsbaum, großer Marktstand;
  - großer Bahnhof mit Schienen (1.21.11) und kleiner Bahnhof mit Schienen (1.21.1).
- **Sonstige Modelle:**
  - ein im Editor bearbeitetes Modell (Kürbislaterne mit `facing=east`, Heuballen mit `axis=x`);
  - ein synthetisches Modell mit **allen 248 Registry-Zuständen**.
- **Gegenprobe:** Eine Datei mit `axis=w` wird mit exit 2 abgelehnt.

Die 26 Fixtures des Harness zeigen zusätzlich, dass es WorldEdits stille Fehlerfälle erkennt:

- unbekannte Eigenschaften, zu wenige Blöcke, unbekannte Blöcke;
- neue 1.21.11-Blöcke in einer 1.21.1-Datei;
- das umbenannte `minecraft:chain` in einer 1.21.11-Datei.

**Vorbehalt:** WorldEdit-CLI 7.4 lädt seine Blockdaten zur Laufzeit von `services.enginehub.org`, und das war hier gesperrt. Die Registries für 4671 und 3955 wurden aus Mojangs Data-Generator-Ausgabe erzeugt. Der Konverter reproduziert aus den 1.19-Daten exakt EngineHubs eigene `3105.json`. Ob die erzeugten Dateien mit EngineHubs Downloads identisch sind, ist nicht geprüft (Details in `docs/COMPATIBILITY.md`).

### UI (Playwright, `tests/e2e`)

1. **Durchlauf Haus:**
   - Text eingeben und generieren. Die 3D-Szene zeigt nachweislich das ausgewählte Modell (`data-rendered-hash`) und ist nicht leer.
   - Die Materialsumme stimmt.
   - Echter `.schem`-Download, den der Validator prüft: Hash, DataVersion und Blockzahl passen.
2. **Varianten und Einstellungen:** Ein Variantenwechsel ändert Daten, 3D-Ansicht und Exportdatei. „Klein“ ergibt andere Maße.
3. **Freitext und Feinparameter:**
   - Erkannte Wünsche und Warnungen erscheinen, und das Modell folgt dem Text.
   - Manuelle Einstellungen haben Vorrang und lassen sich zurücksetzen.
   - Breite und Dachmaterial wirken.
4. **Weitere Bauwerke:** Weihnachtsbaum, Marktstand und Bahnhof lassen sich generieren, ansehen und exportieren. Bauteile werden nur beim Haus angeboten.
5. **Editor:**
   - Ein Klick ins 3D-Modell entfernt einen Block. Rückgängig/Wiederholen funktionieren, und der Export enthält die Änderung.
   - Setzen-Werkzeug und Pipette funktionieren, ebenso Koordinaten-Werkzeug, Material austauschen und Ebenenansicht.
   - Ein bearbeitetes Modell lässt sich speichern, nach einem Reload öffnen, und „Neu generieren“ warnt vorher.
6. **Projekte:**
   - Speichern → Reload → Öffnen ergibt denselben Hash und einen korrekten Export.
   - Umbenennen, Duplizieren und Löschen (mit Bestätigung) funktionieren.
   - Vor dem Wechsel werden ungespeicherte Änderungen gemeldet.
7. **Lokale KI** (Endpunkte im Browser simuliert):
   - Ohne KI ist die App ehrlich als „Regelbasierter Generator“ gekennzeichnet, und der Schalter ist gesperrt.
   - Mit bereiter KI wird der Plan angezeigt, angewendet und mit „von KI“ markiert.
   - Bei einem KI-Fehler gibt es den Rückfall auf den regelbasierten Generator, mit Hinweis.
8. **Fehler und Tastatur:** Serverfehler werden sichtbar gemeldet (Status „fehler“, Download gesperrt). Generieren klappt per Tastatur.
9. **Mobil (Pixel 7):** Tabs funktionieren, die 3D-Szene ist mindestens 300 × 300 groß, Antippen scrollt die Seite nicht, es gibt keinen horizontalen Überlauf, und der Export funktioniert.

## Während der Entwicklung gefundene und behobene Fehler

- **Mobil:** Lange Blockstate-Namen machten die Seite 628 px breit, und die 3D-Szene war nur 194 px hoch.
- **Hydration:** Ein Klick auf „Generieren“ vor der Hydration ging verloren; der Button ist jetzt bis dahin gesperrt.
- **Parser-Fehlalarme:** „Schornstein“ wurde als Stein erkannt, „Haustür“ als Haus, „Schneesturm“ als Turm und „realistisches“ als Tisch. Ursachen waren eine fehlende Klammerung in den Regex-Alternativen und die Regelreihenfolge.
- **Bauteile:** Ein Turmlicht schwebte, ein Giebelfenster lag unter dem Anbaudach, und eine Marktstand-Lampe schwebte. Alle drei sind behoben und durch die Strukturprüfungen abgedeckt.
- **Ein Commit mit roten Tests:** Der Commit „Phase 4“ (`c01f283`) wurde mit 2 fehlschlagenden Tests eingecheckt. Die Tests erwarteten noch, dass Baum, Marktstand und Bahnhof „nicht verfügbar“ sind. Der Fehler lag in den Tests, nicht in der App, und wurde im direkt folgenden Commit `9d666bf` behoben. Seitdem wird nur nach einem vollständig grünen Lauf committet.

## Nicht getestet bzw. offen

- **In-Game-Import noch nicht verifiziert.** In dieser Umgebung gibt es keine Minecraft-Instanz.
  - Offen sind `//schem load` und `//paste` in Minecraft 1.21.11 mit WorldEdit 7.3.18+ bzw. 7.4.x, die Sichtprüfung und Screenshots.
  - Die Schritte stehen in `docs/WORLD_EDIT_IMPORT.md`.
  - Bis dahin gilt das Release-Gate „In Minecraft mit WorldEdit getestet“ als **nicht erfüllt**.
- **Lauf mit einem echten Sprachmodell** (Ollama): `ollama.com` und die Modell-Downloads waren gesperrt. Getestet sind nur der Client und die Oberfläche gegen simulierte Antworten. Wie gut echte Pläne werden, ist offen.
- **Windows:**
  - `start-windows.cmd` und `npm run test:worldedit` (jetzt ein Node-Skript statt Shell-Syntax) wurden nicht auf Windows ausgeführt.
  - Ebenso wenig der Reader-Build unter Git Bash/WSL.
  - Die App selbst ist plattformunabhängiges Node.js/Next.js.
- **WorldEdit-Varianten:**
  - WorldEdit-Versionen außer dem 7.4.2-Reader, FastAsyncWorldEdit, das Laden über den DataFixer und andere Minecraft-Versionen sind nicht getestet.
  - `WE_MODE=enginehub` (Binärdateien direkt von EngineHub) ist nicht getestet, weil der Host gesperrt war.
- **Gedrehtes Einfügen** (`//rotate`) ist nicht getestet.
- **Browser und Touch:**
  - Andere Browser als Chromium sind nicht getestet.
  - Echte Touch-Gesten (Drehen mit einem Finger, Pinch-Zoom) sind nur über die OrbitControls-Standardkonfiguration abgedeckt, nicht automatisiert gemessen.
- **Texturen unter Windows:** Die automatische Suche in den Ordnern von CurseForge, Modrinth und Prism wurde nicht auf einem echten Windows-PC getestet, nur mit nachgebauten Ordnern. Fallback ist die Dateiauswahl in der App.
- **Leistung auf echter Grafikkarte:** Die Tests liefen mit Software-WebGL (SwiftShader). Auf einer echten GPU sollte die Vorschau schneller sein, gemessen wurde das nicht.

## In-Game-Abnahme (manuell auszufüllen)

| Datum | Minecraft | WorldEdit | Datei / Hash | Ergebnis | Screenshots / Log |
|---|---|---|---|---|---|
| – | – | – | – | ausstehend | – |
