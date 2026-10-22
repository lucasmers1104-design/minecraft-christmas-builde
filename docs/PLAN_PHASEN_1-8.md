# Plan: Phasen 1–8

Stand: 2026-10-22. Grundlage sind `docs/AUFTRAG_PHASEN_1-8.md`, der Recherchebericht in `reports/` und die Notizen in `research_notes/`. Dazu kommen sechs parallele Analysen des Codes (Datenmodell, Registry, Generatoren, Vorschau/Editor, Export/WorldEdit, KI/Parser). Die Analyseergebnisse stehen in Abschnitt 1, die Umsetzung in Abschnitt 2–5.

---

## 1. Ausgangslage (Ergebnis der Analyse)

### Umgebung (geprüft auf dem PC des Nutzers)

| Punkt | Befund |
|---|---|
| Git | Das echte Repo liegt unter `C:\Users\Luca\minecraft-christmas-builde` (Branch `claude/zen-shannon-2nby9g`, Remote GitHub). Der Ordner unter `Downloads` ist nur ein ZIP-Auszug. Gearbeitet wird im Repo. |
| Baseline | `typecheck`, `lint`, Vitest grün: 199 bestanden, 14 übersprungen (WorldEdit und echte Jar). |
| Minecraft-Datei | `C:\Users\Luca\AppData\Roaming\ModrinthApp\meta\versions\1.21.11-0.19.3\1.21.11-0.19.3.jar` (echte 1.21.11-Client-Datei). CurseForge-Pfad existiert nicht. Die App erkennt den Modrinth-Namen `1.21.11-0.19.3.jar` bisher **nicht** (`jarVersionFromPath`). `MCB_MINECRAFT_JAR` liest nur der Test, die App nur `MINECRAFT_JAR`. |
| WorldEdit-Reader | **Läuft jetzt unter Windows:** JDK 21 vorhanden, Maven 3.9.11 (Apache-ZIP) und Python 3.12 (winget) installiert. Avast scannt HTTPS, deshalb braucht Maven `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT`. Selbsttest 26/26, `npm run test:worldedit` 13/13. |
| Ollama | nicht installiert (kein `ollama` im PATH). |

### Code-Befunde, die den Plan bestimmen

1. **Registry** (`src/core/blocks/registry.ts`): 128 Vollblöcke, 248 Zustände, keine Formklassen, keine Kategorien, kein Item-Bezug. Der `minecraft-data`-Test verlangt jeden Block in **beiden** Profilen (1.21.11 und 1.21.1). `iron_chain` (nur 1.21.11) und `chain` (nur 1.21.1) können so nie bestehen. Validierung (`checkBlockState`) kennt keine Versionen.
2. **Grenzen** 48 × 32 × 48 und 1024 Paletteneinträge, geprüft in Generator, Transport (Zod), Export, Validator. Transport ist rohes `u16le-base64` (64³ sprengt schon das 512-KB-Limit), Export baut JS-Arrays mit Millionen Zahlen, der Validator entpackt höchstens 8 MiB. IndexedDB Version 1 ohne Migration; `schemaVersion` ist `z.literal(1)`.
3. **Generatoren:** Dächer sind gestufte Vollblöcke, Fenster flache Scheiben in der Wandebene, kein Geschoss, keine Tür-Blöcke. `VoxelBuilder` mit Prioritäten ist gut und bleibt. Der Zufall ist ein einziger Strom pro Bauwerk (kein Fork). Die Strukturprüfung `houseInspection.ts` kennt nur Würfel.
4. **Vorschau:** Texturmodus backt echte Modelle (Multipart, Drehung, uvlock) – Formblöcke funktionieren dort grundsätzlich. Lücken: Scheibenränder bei Scheibe-an-Scheibe, Cutout verblasst in Mipmaps, uvlock weicht bei Modellen mit expliziten UVs ab, alles läuft synchron im Hauptthread. Der Farbmodus kennt nur Würfel und Schienenplatten. Kamera-`far` = 1000.
5. **Editor:** Befehle mit Vorher/Nachher-Zuständen, Undo/Redo, BlockPicker als flache Liste ohne Kategorien und ohne Ausrichtung.
6. **KI/Parser:** Plan = `SpecPatch` mit freien Block-IDs in `materials`; Parser ist eine geordnete Regex-Tabelle. Temperatur 0,2, kein Few-Shot. Viele Tests pinnen das alte Verhalten (Liste in den Analysen; wird je Phase angepasst).

---

## 2. Datenformate

### 2.1 BuildSpec v2 (`src/core/schema/buildSpec.ts`)

```ts
{
  schemaVersion: 2,
  kind: 'house' | 'tree' | 'market_stall' | 'station' | 'tower',
  description: string,
  style: 'medieval' | 'fantasy' | 'rustic' | 'nordic' | 'japanese' | 'cherry' | 'modern' | 'mediterranean',
  theme: 'none' | 'winter' | 'christmas',   // Thema-Achse über jedem Stil
  size: 'small' | 'medium' | 'large' | 'huge',
  detailLevel: 1 | 2 | 3,
  seed, targetMinecraftVersion,
  options: BuildOptions v2                   // alles optional, undefined = Stil-Standard
}
```

`BuildOptions v2` (flach, alles optional):

| Gruppe | Felder |
|---|---|
| Maße | `width` (ungerade), `depth` (ungerade), `floors` (1…), `floorHeight` (4–6) |
| Dach | `roofType` (`gable`, `hip`, `half_hip`, `pyramid`, `mansard`, `gambrel`, `saltbox`, `a_frame`, `flat`, `pagoda`), `roofProfile` (`standard`, `steep`, `shallow`, `flared`, `bell`, `convex`, `ogee`), `overhang` (0–3), `dormers` (0–6) |
| Masse | `wings` (`none`, `L`, `T`, `U`), `annex` (`none`, `left`, `right`), `tower` (`none`, `square`, `round`), `towerPosition` (`front_left`, `front_right`, `back_left`, `back_right`), `symmetry` (`auto`, `symmetric`, `asymmetric`, `rambling`) |
| Fassade | `windows` (`few`, `normal`, `many`), `windowFamily`, `doorFamily` (Enums aus der Vorlagenbibliothek), `jetty`, `oriel`, `porch`, `balcony`, `chimney` |
| Licht/Fest | `lanternDensity` (`none`, `few`, `normal`, `many`), `soulLanterns`, `garland`, `christmasTree`, `presents`, `snow` (Standard **aus**) |
| Umgebung | `garden` (Hecke, Weg, Laternenpfähle) |
| Material | `palette` (Paletten-ID des Stils), `materials.{wall, roof, frame, foundation, accent}` (Material-IDs aus dem Katalog; nur UI, nie KI) |

**Migration v1 → v2** (`migrateSpec`, beim Laden von Transporten, Projekten und KI-Plänen):

- `style: christmas` oder `colorTheme: red_green` → `theme: christmas`; `ice_blue` → `winter`; sonst `none`.
- `style: fairytale` → `fantasy`; sonst nach `materialTheme`: `stone` → `medieval`, `spruce`/`oak` → `rustic`.
- `wallHeight ≥ 7` → `floors: 2`; `roofShape: steep` → `roofType: gable, roofProfile: steep`; `hip` → `hip`.
- `tower: left/right` → `tower: square, towerPosition: front_left/front_right`; `hedge` → `garden`; `lights: false` → `lanternDensity: none`; `frameWood` → `materials.frame`; Block-IDs in `materials` → Material-ID, wenn im Katalog, sonst entfällt (mit Hinweis).
- Voxeldaten und Hash bleiben unverändert: Der Hash umfasst nur Maße, Palette und Indizes, nicht den Spec.

### 2.2 Registry mit Formklassen (`src/core/blocks/`)

```ts
interface BlockDefinition {
  id: string; label: string;                       // deutsch
  shape: ShapeClass;                               // cube, pillar, stairs, slab, fence, fence_gate, wall, pane,
                                                   // trapdoor, door, lantern, chain, candle, leaves, potted, plant,
                                                   // carpet, button, campfire, rod, snow_layer, rail, petals, facing_cube, …
  category: BlockCategory;                         // wood, stone, glass, light, deco, nature, color, winter, technic
  properties; defaults;                            // aus der Formklasse, geprüft gegen minecraft-data
  profiles?: readonly string[];                    // nur in diesen Minecraft-Versionen vorhanden (iron_chain, chain, pale_oak_* …)
  render: { kind, color, opacity? };               // Farbmodus und Lichtklasse
  item?: { id?: string; stackSize?: number };      // Zählregel-Basis; Standard = Block-ID, 64
}
```

- `families.ts`: 12 Holzarten (oak, spruce, birch, jungle, acacia, dark_oak, mangrove, cherry, pale_oak, bamboo, crimson, warped) × Bretter, Stamm, entrindet, Holz, Treppe, Stufe, Zaun, Tor, Falltür, Tür; Steinfamilien mit Treppe/Stufe/Mauer laut 1.21.11-Liste; Scheiben (glass + 16 Farben), Gitter, Laternen, Ketten, Kerzen (17), Töpfe, Teppiche, Lagerfeuer, Endstab, Blitzableiter, Schneeschicht, `cherry_leaves`, `pink_petals`, Bambus, `waxed_*copper*`.
- `shapes.ts`: pro Formklasse Properties, Defaults, **Box-Geometrie** in 1/16 (gleich den Vanilla-Formen, Grundlage für Farbmodus, Flächenabdeckung und Stützregeln), Stützregel, Zählregel, Rotation/Spiegelung.
- Profil-Prüfung: `checkBlockState(state, profile?)`, `isAvailableIn(id, profile)`, `profileBlock('iron_chain', profile)` (liefert für 1.21.1 `chain`).

### 2.3 Stile als Daten (`src/core/style/`)

```ts
interface Material {               // materials.ts
  id: string; label: string; family: 'wood' | 'stone' | 'brick' | 'plaster' | 'glass' | 'metal' | 'nature' | 'color';
  forms: Partial<Record<'block' | 'stairs' | 'slab' | 'wall' | 'fence' | 'gate' | 'trapdoor' | 'door' | 'pane' | 'log' | 'wood', string>>;
  related?: { lighter?: string; darker?: string; weathered?: string[]; mossy?: string[] };
  substitutes?: Partial<Record<Form, string[]>>;   // Ersatzfamilien (calcite → smooth_quartz_stairs …)
  brightness?: { L: number; chroma: number; hue: number }; // aus helligkeit_texturen.tsv
}
interface Palette {                // palettes.ts
  id: string; label: string;
  roles: Record<Role, { material: string; weight: number }[]>;  // Rollen siehe unten
}
interface StyleDef {               // styles.ts
  id: StyleId; label: string; llm: { description: string; keywords: string[] };
  palettes: string[]; roofTypes: Weighted<RoofType>; roofProfiles: Weighted<RoofProfile>;
  proportions: { floorHeight; overhang; plinth; jetty; widthRange; depthRange };
  symmetry: 'symmetric' | 'asymmetric';
  windows: TemplateId[]; doors: TemplateId[];      // 2–3 wiederkehrende Detailtypen
  detail: { lanterns; flowerBoxes; shutters; … };   // Dichte je Größe
  required: string[]; forbidden: string[];
}
```

Rollen: `plinth`, `wall`, `wallAccent`, `frame`, `beam`, `infill`, `roof`, `roofTrim`, `ridge`, `soffit`, `window`, `windowFrame`, `shutter`, `door`, `lantern`, `accent`, `floor`, `path`.

Lints (Tests, beim Laden): Dach ≠ Wand; Rahmen oder Dach ΔL ≥ 15 zur Wand; helle Wand (L* > 75) → Dach L* < 40 (Warnung); 3–5 Hauptblöcke + ≤ 2 Akzente; Dachrolle nur Familien mit Treppe; verbotene Hölzer; alle IDs gültig in jedem Profil (oder mit Profil-Ersatz).

### 2.4 Vorlagen (`src/core/templates/`)

```ts
interface FacadeTemplate {
  id: 'W01' … 'W18' | 'T01' … 'T10'; kind: 'window' | 'door'; label: string;
  size: { w: number; h: number };            // Öffnung
  cells: { x: number; y: number; d: -1 | 0 | 1 | 2; role: Role; form: Form; props?: Record<string, string>; air?: true }[];
  clearance: { d: 1 | 2; cells: [x, y][] };  // Kollisionsprüfung vor der Fassade
  styles: StyleId[];
}
```

Kanonisch für eine Südfassade (+Z außen), `d = 0` Füllebene. `placeTemplate(template, facade, origin, mirror)` dreht Positionen und Zustände (`rotateState`, `mirrorState`) und lässt den Resolver die Nachbarzustände setzen.

### 2.5 Plan (KI und Parser, `src/core/plan/`)

Ein flaches Planformat für Parser und KI: alle Enums aus dem Katalog (Stil, Thema, Bauwerk, Dachtyp, Profil, Flügel, Turm, Position, Symmetrie, Fenster-/Türfamilie, Laternendichte, Detailgrad), Integer mit Grenzen (Geschosse, Breite, Tiefe, Überstand, Gauben), Booleans (Veranda, Kamin, Erker, Jetty), dazu `explanation` und `unsupported`. **Keine Koordinaten, keine Block-IDs.** `planToPatch()` macht daraus einen `SpecPatch`.

### 2.6 Transport v2

`indexEncoding: 'rle-varint-base64'` (Läufe aus Wert + Länge als VarInt). `u16le-base64` wird weiter gelesen. Hash unverändert. IndexedDB Version 2 speichert RLE und migriert alte Datensätze; Projekte mit `schemaVersion 1` laden weiter.

---

## 3. Phasen: Aufgaben und Dateien

Legende: **[ich]** = selbst, **[Agent X]** = Subagent mit eigenem Dateibereich; Integration und Review mache ich.

### Phase 1 – Formblöcke und Zustandsauflöser

1. **[ich]** `blocks/shapes.ts`, `blocks/families.ts`, `registry.ts` umbauen: Formklassen, Kategorien, Profile, Item-Zählregeln, Stackgrößen.
2. **[ich]** `blocks/stateResolver.ts`: Treppen-`shape` (Vanilla-Algorithmus), Zaun/Scheibe/Gitter/Mauer-Verbindungen mit Ausnahmen (Laub, Kürbis, Melone …), Mauer `low/tall/up`, Tor `in_wall`, Türhälften, Laub `persistent` und `distance` (BFS zu Stämmen), Gras `snowy`, Lagerfeuer `signal_fire`. Flächenabdeckung aus der Box-Geometrie.
3. **[ich]** `blocks/validator.ts`: Stützen (Laterne stehend/hängend, Kerze, Tür, Teppich, Schnee, Schiene, Pflanze), Golem-Falle (Kürbis an 2× Schnee, an Kupfer, Eisen-T), Profil-IDs; deterministische Reparatur mit Protokoll.
4. **[ich]** `blocks/transform.ts`: Drehen/Spiegeln (facing, axis, Verbindungen, hinge, left/right, Schienen).
5. **[ich]** Resolver im `VoxelBuilder.toModel`, lokal im Editor nach jedem Befehl (Änderungen inklusive Nachbarn im selben Befehl, damit Undo exakt bleibt).
6. **[ich]** `analysis/materialCounts.ts`: Items statt Zustände (Tür 1×, Doppelstufe 2, Kerzen n, Schnee n, Topf = Topf + Pflanze), Stackgrößen.
7. **[ich]** Tests: `minecraft-data` je Profil (alle Blöcke, Defaults, Item-Stackgrößen), Resolver-Fälle (Walm-Ecken, Kehlen, Zäune, Mauern, Scheiben, Türen), Idempotenz, Validator, Transform in 4 Ausrichtungen, Zählregeln; Abgleich der Treppen-Ecken mit den **echten** Vanilla-Modellen aus der Client-Datei (übersprungen ohne Jar).
8. **[Agent P – Vorschau]** Einheitlicher Mesher: Farbmodus aus der Box-Geometrie (Treppe, Stufe, Zaun, Mauer, Scheibe, Laterne, Kette, Tür, Falltür, Kerze, Teppich …), Flächen-Verdeckung pro Seite, Scheibe-an-Scheibe-Regel, Cutout ohne Mipmap-Verblassen, typisierte Puffer. BlockPicker mit Kategorien, Suche, Ausrichtung nach Fläche und Kamera.
9. **[ich]** Modrinth-Dateinamen erkennen, `MCB_MINECRAFT_JAR` auch in der App, Fallback auf den nächsten Kandidaten.
10. **[ich]** WorldEdit-Test: Datei mit allen Formklassen (in Stücken < Palettenlimit), Windows-Hinweise (`.gitattributes` mit `eol=lf` für `*.sh`, `upstream.lock`).

### Querschnitt A – große Bauwerke (parallel zu Phase 1)

**[Agent T – Datenweg]** (eigene Dateien: `voxelTransport.ts`, `base64.ts`, `projects.ts`, `export/*`, `api/*/route.ts`, `apiResponses.ts`, `builderApi.ts`, Grenzwert-Konstanten in `voxelModel.ts`):

- `MAX_DIMENSIONS` → Höhe 384, Grundfläche bis 192 × 192, `MAX_VOLUME` nach Messung (Ziel ≥ 128 × 384 × 128), `MAX_PALETTE_SIZE` 4096.
- RLE-Transport, angepasste Request-Limits, Export mit typisierten Puffern, Validator-Obergrenzen, WorldEdit-Test-Puffer.
- IndexedDB v2 mit Upgrade (Kodierung); Haken `migrateStoredSpec`, den ich in Phase 2 mit der Spec-Migration fülle.
- Messungen: Generier-, Hash-, Transport-, Export-Zeit und Dateigröße für 128 × 384 × 128.

**[Agent P]** zusätzlich: Meshing in Chunks (16³) im Web Worker (Next-16-Doku lesen), nur betroffene Chunks nach Edits neu, Ladeanzeige, Kamera-`far` und Zoom nach Modellgröße, Messung FPS und Meshing-Zeit.

### Phase 2 – Stile als Daten

1. **[ich]** `style/brightness.ts` (Zahlen aus `helligkeit_texturen.tsv`, fehlende Blöcke aus der Client-Datei berechnet, nur Zahlen gespeichert), `style/materials.ts`, `style/palettes.ts`, `style/styles.ts` mit den 8 Stilen, `style/lints.ts`.
2. **[ich]** `style/texturing.ts`: Verwitterungsfeld (unten, Ecken, unter Vorsprüngen/Fenstern), niederfrequentes Rauschen (Zelle 2–3), Nachbarn ≤ 1 Palettenstufe, keine horizontalen Bänder.
3. **[ich]** `generator/random.ts`: hierarchische Seeds `fork(label)` (Projekt → Bauwerk → Bauteil).
4. **[ich]** BuildSpec v2, Migration, UI-Steuerung (Stil, Thema), Labels, Projekt-Migration.

### Phase 3 – Dach-Engine

**[ich]** `generator/roof/`: `profiles.ts` (Δ-Folgen → Spalten mit Treppe/Stufe/Vollblock, Paritätsregel), `heightfield.ts` (Dach als Höhenfeld in Halbblöcken je Abschnitt; Vereinigung = Maximum → Grate und Kehlen entstehen von selbst, `inner/outer` setzt der Resolver), `roofSection.ts` (Reihen für Sattel/Gambrel/Saltbox/A-Frame, Ringe für Walm/Pyramide/Mansard/Pagode, Flachdach mit Attika, Pult für Anbauten), Überstand, Untersicht (Kopfüber-Treppen unter Traufe und Ortgang), Kontrast-Traufe, First in 5 Varianten, zurückgesetzter Giebel mit Fenster/Balken, Gauben, Kamin mit `campfire`. Regeln: ungerade Breiten, Satteldach bis ≈ 12 Tiefe, Anstieg je Abschnitt ≤ 7 (Ausnahmen A-Frame/Pagode/Turmhelm dokumentiert), Firsthöhen variieren. Experiment-Flag für aufgebogene Ecken.

### Phase 4 – Wände, Fachwerk, Tiefe, Fenster und Türen

1. **[ich]** `generator/house/`: Massenplan (Haupthaus, Flügel L/T/U, Anbau, Turm) mit Firstrichtung; Geschosse mit echten Decken und Treppe (Treppenblöcke, keine Möbel); Fassaden-Assembler (Trauf-, Giebel-, Eingangsseite), Ständerraster nach Tabelle, Balken mit `axis`, `*_wood` an Knoten, Füllung eine Ebene zurück, Sockel mit Treppenschürze, Geschossbänder, Jetty auf Konsolen, Erker, Vordach, Veranda, ein Fachwerkmotiv pro Wand; Symmetrie aus dem Prompt.
2. **[Agent W – Vorlagen]** `templates/windows.ts`, `templates/doors.ts`: W01–W18 und T01–T10 aus `fenster_tueren_details.md` als Daten, Tests in 4 Ausrichtungen und gespiegelt (gültige Zustände, Stützen, Freiraum).
3. **[ich]** Platzierung (Achsen fluchten, Abstände, Kollision d+1/d+2), Fassaden-Lint „keine flache Wand > 5“, `houseInspection.ts` erweitern (Formblöcke, Stützregeln, Tür-Blöcke, zurückgesetzte Fenster, Dachlücken).

### Phase 5 – Weihnachten/Winter und Landschaft

**[ich]** `generator/festive/`: Prozessor mit 3 Stufen (Girlanden mit Leuchtblöcken im Laub und Schleifen, Kränze, Laternen an `iron_chain`, Laternenpfähle, Kerzen auf Simsen, Geschenke), Winterumgebung (Eis, `packed_ice`-Teich), Schnee nur auf ausdrücklichen Wunsch. Neuer Weihnachtsbaum, Marktstand (Gasse mehrerer Buden), Bahnhof (Abschnittsdächer, Bahnsteigdach), Wege und Hecken.

### Phase 6 – KI-Planer und Parser

1. **[ich]** `plan/buildPlan.ts` (Schema pro Aufruf aus dem Katalog), `planToPatch`, Prompt mit Stilkatalog und Schema-Text, Temperatur 0, Retry, Rückfall.
2. **[Agent K – Sprache]** Parser-Erweiterung (Synonyme laut Auftrag), ≥ 20 Few-Shot-Paare (`ai/fewShotExamples.ts`, Auswahl per Stichwort), Testset ≥ 50 deutsche Wünsche mit erwarteten Eigenschaften.
3. Echte KI nur, wenn Ollama läuft (derzeit nicht installiert → ehrlich dokumentieren; Installation ist kein Entwicklerwerkzeug für Tests, sondern ein 9-GB-Modell – nur mit Rückfrage).

### Phase 7 – Kreise, Bögen, Türme

1. **[Agent G – Geometrie, startet sofort]** `geometry/circles.ts` usw.: Kreis dünn/dick/gefüllt („Blockmitte im Kreis“), Ellipse, Kugel/Kuppel (6er-Hülle), Kegel, Rotationskörper, Zwiebel (experimentell), Bögen rund/spitz/Segment mit Treppen-Glättung. Regressionstests: D5 = 12/16/21, D15 = 40/56/177, Kugel D15 hohl = 530, Kegel D15/H15 = 919, Abgleich mit `skripte/*.py`.
2. **[ich]** Rundturm-Bauteil (D 7–15, Kegel D+2 oder Kuppel, Zinnen nur bei D ∈ {7, 9, 15, 17, 21}, eingeschnittene Fenster, Anschluss ans Haus), Bogenfenster/-portale, Bauwerkstyp „Turm/Burgturm“ (nutzt die neue Höhe bis 384).

### Phase 8 – Abnahme

Automatische Lints je Bauwerk (Überstand ≥ 1, ΔL, keine flache Wand > 5, Dach ≠ Wand, Anstieg ≤ 7, Fensterachsen, Laternen am Eingang), WorldEdit-Lauf über alle Stile × Bauwerke × Themen, bitgleiche Reproduzierbarkeit, Screenshot-Skript (`scripts/screenshots.mjs` mit Playwright und echten Texturen) für jede Kombination, Doku-Updates, In-Game-Checkliste.

---

## 4. Reihenfolge

1. Phase 1 Kern (Registry, Resolver, Validator) **[ich]** ‖ Agent G (Geometrie) ‖ Agent T (Datenweg).
2. Agent P (Vorschau, Picker) sobald die Box-Geometrie steht. Phase-1-Abschluss: Tests, E2E, WorldEdit, Commit, Push.
3. Phase 2 (Stile) **[ich]**; Agent T fertig integrieren. Commit.
4. Phase 3 (Dach) **[ich]** mit Screenshots. Commit.
5. Phase 4 **[ich]** ‖ Agent W (Vorlagen). Screenshots, nachbessern. Commit.
6. Phase 5 **[ich]**. Commit.
7. Phase 6 **[ich]** ‖ Agent K. Commit.
8. Phase 7 **[ich]** (Geometrie von Agent G liegt bereits vor). Commit.
9. Phase 8: Lints, Bildlauf aller Kombinationen, Nachbesserungsrunden, Doku, Abschlussbericht. Commit.

Nach jeder Phase: `npm run typecheck`, `npm run lint`, `npm test` (mit `MCB_MINECRAFT_JAR`), `npm run test:e2e`, `npm run test:worldedit`; nur bei Grün committen und pushen.

---

## 5. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Treppen-`shape` nicht zeilengenau gegen Mojang geprüft | Algorithmus aus Vanilla-Struktur; Test gegen die echten Modelle der Client-Datei (Quadrant der hohen Seite); WorldEdit prüft nur Gültigkeit, nicht Nachbarlogik → In-Game-Checkliste |
| Verbindungsregeln (Ausnahmen, volle Flächen) | Flächenabdeckung aus derselben Box-Geometrie wie die Vorschau; Ausnahmeliste aus Vanilla (`isExceptionForConnection`); Idempotenz-Test |
| Zustandsexplosion (Mauer 324 Zustände) | Palette 4096; „alle Zustände“-Test in Stücken |
| Große Modelle: Speicher, Hash, Meshing | RLE, typisierte Puffer, Chunks/Worker, Messung und dokumentierte Grenzen |
| Alte Projekte | Spec-Migration v1 → v2, Dexie-Upgrade, Test mit echtem v1-Datensatz |
| Viele Tests pinnen altes Verhalten | Tests je Phase bewusst an die neue Fachlichkeit anpassen, Prüfungen erweitern statt aufweichen |
| Ästhetik ist subjektiv | Builder-Checkliste aus dem Auftrag, Screenshots mit echten Texturen in mehreren Winkeln, mehrere Runden |
| Paralleles Arbeiten im selben Baum | Agents bekommen disjunkte Dateibereiche; Integration und Tests durch mich |
| Ollama fehlt | KI-Weg gegen Simulator getestet; echte Messung nur nach Installation (Rückfrage) |
| Avast | HTTPS-Scan bricht Java-TLS (gelöst über Windows-Zertifikatsspeicher); bei `.node`-Fehlern zuerst Avast prüfen |

---

## 6. Aufgabenliste (laufend aktualisiert)

- [x] Analyse mit 6 Agents, Plan
- [x] Werkzeuge: Maven, Python, WorldEdit-Reader unter Windows gebaut und geprüft
- [ ] Phase 1
- [ ] Querschnitt A
- [ ] Phase 2
- [ ] Phase 3
- [ ] Phase 4
- [ ] Phase 5
- [ ] Phase 6
- [ ] Phase 7
- [ ] Phase 8 und Abschlussbericht
