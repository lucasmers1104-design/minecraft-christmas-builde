# Testbericht

**Stand:** 2026-10-21, Phase 0 und Phase 1. Alle Ergebnisse unten stammen aus tatsächlich ausgeführten Befehlen in der Entwicklungsumgebung (Linux-Container).

## Umgebung

| Komponente | Version |
|---|---|
| Node.js / npm | 22.22.0 / 10.9.4 |
| Next.js / React | 16.4.2 / 19.3.1 |
| TypeScript | 6.0.2 (`strict: true`, `noUncheckedIndexedAccess`) |
| Vitest | 5.0.5 |
| Playwright / Chromium | 1.56.1 / Build 1194 (headless, SwiftShader-WebGL) |
| three / @react-three/fiber / drei | 0.186.1 / 9.8.2 / 10.7.9 |
| prismarine-nbt / zod / minecraft-data | 2.8.0 / 4.6.7 / 3.117.0 |
| Java / Maven (WorldEdit-Reader) | OpenJDK 21.0.12 / 3.9.11 |
| WorldEdit (Reader) | EngineHub 7.3.8 @ `7d32b456e7c3237a70e19cca129e51b790c33b73`, aus Quellcode gebaut |

## Ausgeführte Befehle und Ergebnisse

| Befehl | Ergebnis |
|---|---|
| `npm run typecheck` | ✅ keine Fehler |
| `npm run lint` | ✅ 0 Fehler, 0 Warnungen |
| `npm test` | ✅ 10 Dateien, **78/78 Tests bestanden**, inkl. der 5 WorldEdit-Tests (der Reader war gebaut) |
| `npm run test:worldedit` | ✅ 1 Datei, **5/5 bestanden** (echter WorldEdit-Reader) |
| `WE_BUILD_CACHE=… bash tests/worldedit/build.sh --selftest` | ✅ Reader gebaut, **16/16 Fixture-Erwartungen erfüllt**, exit 0 |
| `npm run build` | ✅ Produktionsbuild erfolgreich (`/` statisch, `/api/generate` und `/api/export` dynamisch) |
| `npm run test:e2e` | ✅ **7/7 bestanden** (6 Desktop, 1 Mobil/Pixel 7) |
| `npm audit --omit=dev` | ✅ 0 Schwachstellen in Laufzeitabhängigkeiten |

`npm audit` über alle Abhängigkeiten meldet 5 „high“-Funde. Sie liegen ausschließlich in der Dev-Toolchain (`eslint-config-next` → `fast-glob` → `micromatch` → `braces`). Der einzige von npm angebotene Fix wäre ein Downgrade auf `eslint-config-next@14`, das nicht zu Next 16 passt.

Zusätzlich manuell geprüft über HTTP gegen `next start`:

- `POST /api/generate` liefert drei Varianten (Seeds 1, 2, 3) mit verschiedenen Hashes.
- `POST /api/export` liefert für Seed 1 eine 775 Byte große `.schem` mit `Content-Type: application/octet-stream` und `Content-Disposition: attachment`.
- Der WorldEdit-Reader liest diese Datei: `ok: true`, Format `SPONGE_V3_SCHEMATIC`, 15 × 14 × 13, 976 Blöcke ohne Luft, keine Warnungen.

## Testinhalte

### Generator (Unit)

- **Determinismus:** Gleiche Spec und gleicher Seed ergeben identische Maße, Palette, Indexbytes und Hash.
- **Varianten:** Seeds 1, 2 und 3 ergeben drei unterschiedliche, jeweils gültige Häuser.
- **Hausstruktur**, geprüft an den echten Blockdaten (`tests/helpers/houseInspection.ts`):
  - Fundament unter der ganzen Grundfläche;
  - vier lückenlose Wände;
  - Eingang 2 Blöcke hoch und von außen bis innen frei, mit Boden, Weg und Sturz;
  - Fenster aus Glas in allen vier Wänden, von innen und außen frei;
  - Dach deckt jede Zelle der Grundfläche ab, ist vorne und hinten spiegelsymmetrisch, mit First über den Wänden;
  - Schornstein durchgehend, über den First ragend, neben dem First, nicht über dem Eingang;
  - mindestens 70 % der begehbaren Innenfläche frei, Innenhöhe ≥ 3;
  - **keine schwebenden Blöcke**, d. h. alles ist mit dem Fundament verbunden.
- **Alle 243 Kombinationen** aus Größe × Stil × Material × Farbe × Detailgrad, jeweils mit Seed 1, 2 und 3 (729 Häuser): alle gültig.
- **Jede Einstellung wirkt:** 10 Einzeländerungen ergeben jeweils einen anderen Hash. Klein ist schmaler, groß ist breiter, märchenhaft ist höher.
- **Gegenprobe:** Die Strukturprüfung erkennt eingebaute Fehler (Loch in der Wand, blockierter Eingang, schwebender Block, von innen verdecktes Fenster).
- **Eingaben:** ungültige Specs werden abgelehnt; nicht implementierte Bauwerkstypen werfen einen eigenen Fehler.

### Registry und Kompatibilität (Unit)

- DataVersion 3955 entspricht 1.21.1 laut `minecraft-data`.
- Alle 88 Registry-Blöcke existieren in 1.21.1 mit exakt denselben Eigenschaften und Werten.
- `checkBlockState` lehnt unbekannte Blöcke, ungültige Werte, fehlende oder unbekannte Eigenschaften, nicht kanonische Reihenfolge und Syntaxfehler ab.

### VarInt, Hash, Transport, Mesh (Unit)

- **VarInt:** Werte < 128 und ≥ 128 bis 2³²−1 mit festen Bytefolgen (z. B. 300 → `AC 02`). Abgeschnittene, überlange und überzählige Datenströme werden abgelehnt.
- **SHA-256:** stimmt mit Testvektoren und `node:crypto` überein.
- **Transport:** Byte-Reihenfolge little-endian geprüft, Roundtrip verlustfrei, Grenzen dokumentiert. Manipulierte Hashes, Maße, Indizes, Paletten und Specs werden abgelehnt.
- **Mesh:** Face-Culling; ein 3³-Würfel ergibt 54 Flächen, Luft ergibt 0. Glas und Leuchtblöcke landen in eigenen Puffern.

### Export (Integration)

- **v3-Layout,** gelesen mit `prismarine-nbt` als zweitem Leser:
  - Root `""` → `Schematic`;
  - `Version` Int 3 und `DataVersion` Int 3955;
  - `Width`/`Height`/`Length` als Short, `Offset` als IntArray;
  - `Blocks.Palette` als Compound mit Int-Werten, `Blocks.Data` als ByteArray, `BlockEntities` als leere Compound-Liste;
  - kein v2-Layout.
- **Roundtrip:** jeder Block an jeder Koordinate identisch, Hash identisch. Das gilt auch für den eigenen, unabhängigen NBT-Leser im Validator.
- **Paletten mit 145 Einträgen:** Es entstehen Mehrbyte-VarInts, die verlustfrei gelesen werden.
- **Determinismus:** Gleiches Modell ergibt eine bytegleiche Datei.
- **Negativfälle:**
  - Der Export verweigert Modelle mit falschem Hash, unbekanntem Block, ungültiger Eigenschaft, Übergröße, inkonsistenter Palette oder falscher Zielversion.
  - Der Validator erkennt abgeschnittene VarInts, falsche Tag-Typen, v2-Felder, eine falsche DataVersion, ungültige Indizes, unbekannte Blockstates, Nicht-GZip-Dateien, abgeschnittenes NBT und Abweichungen vom erwarteten Modell.
- **NBT-Strings:** Zeichen, die in Javas „modified UTF-8“ anders kodiert würden, werden abgelehnt.

### API (Integration)

- **`/api/generate`:**
  - 200 mit drei verlustfrei dekodierbaren Varianten;
  - 400 bei ungültiger Spec, kaputtem JSON oder Zusatzfeldern;
  - 413 bei Übergröße;
  - 422 bei noch nicht verfügbaren Typen.
- **`/api/export`:**
  - 200 mit korrekten Headern und einer Datei, die der Validator als identisch bestätigt;
  - 400 bei manipuliertem Hash, verbotenem Block oder fehlendem Modell (z. B. „nur Prompt“);
  - 413 bei Übergröße.

### Echter WorldEdit-Reader (Integration, `tests/integration/worldedit.test.ts`)

Das Java-Harness öffnet jede exportierte `.schem` mit `ClipboardFormats.findByFile` und `SpongeSchematicV3Reader` von EngineHub WorldEdit 7.3.8 auf der `worldedit-cli`-Plattform. Erwartet werden in jedem Fall:

- Format `SPONGE_V3_SCHEMATIC`;
- DataVersion der Datei und der Registry je 3955;
- keine Warnungen und Fehler (inkl. `--require-canonical`);
- gleiche Maße, Mindestpunkt (0,0,0) und gleiche Anzahl Nicht-Luft-Blöcke;
- **jeder Block** in WorldEdits eigener Darstellung (`getAsString`) identisch zum Modell.

Geprüft wurden:

- die Varianten Seed 1, 2 und 3;
- klein/realistisch/Eiche/Natur/Detailgrad 1;
- groß/märchenhaft/Stein/Eisblau/Detailgrad 3;
- das synthetische Modell mit 145 Paletteneinträgen.

**Gegenprobe:** Eine Datei mit `axis=w` wird mit exit 2 abgelehnt.

Die eigenen Fixtures des Harness (16 Erwartungen) zeigen zusätzlich, dass das Harness WorldEdits stille Fehlerfälle erkennt: unbekannte Eigenschaften, zu wenige Blöcke, unbekannte Blöcke.

**Vorbehalt:** WorldEdit-CLI 7.3.x enthält keine Blockdaten für 1.21.1. Die Registry `3955.json` wurde aus Mojangs Data-Generator-Ausgabe für 1.21.1 erzeugt. Der Konverter reproduziert aus den 1.19-Daten exakt EngineHubs eigene `3105.json`. Für 1.21.1 bleibt die Datei trotzdem selbst erzeugt (Details in `docs/COMPATIBILITY.md`).

### UI (Playwright, `tests/e2e`)

1. **Vollständiger Durchlauf:**
   - Text eingeben und generieren; die 3D-Szene zeigt nachweislich das ausgewählte Modell (`data-rendered-hash`) und ist nicht leer (Pixelvielfalt).
   - Die Summe der Materialzeilen ergibt die angezeigte Gesamtzahl.
   - Echter `.schem`-Download: Der Validator meldet keine Fehler, Hash und DataVersion stimmen, und die Zahl der Nicht-Luft-Blöcke in der Datei entspricht der Materialliste. Status „exportiert“.
2. **Variantenwechsel:** Hash, 3D-Ansicht, Seed-Anzeige und Exportdatei ändern sich. Die zweite Datei enthält das zweite Volumen.
3. **Einstellung „Klein“:** Ein Hinweis auf veraltete Vorschau erscheint. Nach dem Neugenerieren gilt: Maße 11 × 11 × 9, anderer Hash.
4. **Nicht implementierte Optionen:** Weihnachtsbaum, Marktstand, Bahnhof und Speichern sind deaktiviert und gekennzeichnet. Die Anzeige lautet „Regelbasierter Generator“.
5. **Serverfehler** (per Route-Interception simuliert): Die Fehlermeldung ist sichtbar, Status „fehler“, der Download bleibt deaktiviert.
6. **Tastatur:** Generieren und „Ansicht zurücksetzen“ funktionieren per Enter.
7. **Mobil (Pixel 7):**
   - Tabs funktionieren; die 3D-Szene ist mindestens 300 × 300 groß.
   - Antippen scrollt die Seite nicht.
   - Kein horizontaler Überlauf in allen drei Tabs.
   - Export funktioniert.

Während der Entwicklung haben diese Tests zwei echte Fehler gefunden, die inzwischen behoben sind:

- Lange Blockstate-Namen machten die Detailspalte auf dem Handy 628 px breit, sodass der Browser herauszoomte und Elemente überlappten.
- Ein Klick auf „Generieren“ vor der Hydration ging verloren. Der Button ist jetzt bis zur Hydration deaktiviert.

## Nicht getestet bzw. offen

- **In-Game-Import noch nicht verifiziert.** In dieser Umgebung gibt es keine Minecraft-Instanz. Offen sind `//schem load` und `//paste` in Minecraft 1.21.1 mit WorldEdit 7.3.x, die Sichtprüfung von Maßen, Ausrichtung, Eingang, Glas, Dach und Schornstein sowie Screenshots. Schritte: `docs/WORLD_EDIT_IMPORT.md`. Bis dahin gilt das Release-Gate „In Minecraft mit WorldEdit getestet“ als **nicht erfüllt**.
- WorldEdit-Versionen außer 7.3.8, FastAsyncWorldEdit und andere Minecraft-Versionen bzw. das Laden über den DataFixer.
- Der Bezug der WorldEdit-Binärdateien direkt von `maven.enginehub.org` (`WE_MODE=enginehub`): Der Host war gesperrt.
- Gedrehtes Einfügen (`//rotate`).
- Andere Browser als Chromium; echte Touch-Gesten wie Drehen mit einem Finger oder Pinch-Zoom wurden nur über die OrbitControls-Standardkonfiguration abgedeckt, nicht automatisiert gemessen.

## In-Game-Abnahme (manuell auszufüllen)

| Datum | Minecraft | WorldEdit | Datei / Hash | Ergebnis | Screenshots / Log |
|---|---|---|---|---|---|
| – | – | – | – | ausstehend | – |
