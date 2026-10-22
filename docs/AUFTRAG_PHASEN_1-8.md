# Auftrag: Phasen 1–8 am Stück – vom Voxelmodell zum richtig schönen Minecraft-Bau

Du übernimmst den **Minecraft Christmas Builder**. Bisher sind Phase 0–5 der ursprünglichen Planung fertig, dazu der 3D-Editor, der Windows-Start und echte Texturen.

**Dein Auftrag** ist die nächste große Ausbaustufe: Freitexte wie *„mittelalterliches Fachwerkhaus mit Turm und geschwungenem Dach, weihnachtlich“* sollen Bauwerke ergeben, die ein erfahrener Minecraft-Builder gut findet. Das heißt:

- richtige Dächer aus Treppen und Stufen, mit Überstand, sauberen Ecken und verschiedenen Formen, auch geschwungen;
- gut gestaltete Fenster und Türen, Holz-Outlines und echte Tiefe in den Fassaden;
- stimmige Blockpaletten je Stil;
- viele Laternen und weihnachtliche Details.

Arbeite **alle 8 Phasen in einem Durchgang ab**. Du hast so viel Zeit, wie du brauchst. Teste so viel, wie nötig ist. Frage den Nutzer nur bei echten Blockern; alle Grundsatzentscheidungen stehen unten. **Das Ergebnis muss wirklich gut aussehen, nicht nur „funktionieren“.**

---

## 1. Was du zuerst liest (Pflicht)

1. `CLAUDE.md` und `AGENTS.md`: Projektregeln. Next.js 16 weicht von deinem Training ab, also vor Next-spezifischem Code die Doku in `node_modules/next/dist/docs/` lesen.
2. `reports/Minecraft Bautechniken für Generator.md`: **die Wissensbasis** mit Paletten, Dachprofilen, Treppen-Eck-Algorithmus, Fachwerkraster, Fenster- und Türvorlagen, Kreis/Bogen/Turm-Formeln, Winter-Mechanik, Fallstricken und dem Umsetzungsplan, den du jetzt ausführst.
3. `research_notes/Minecraft Bautechniken für Generator/*.md`: Details hinter dem Bericht. Für die Umsetzung brauchst du vor allem:
   - **Fenster und Türen:** `fenster_tueren_details.md` (Vorlagen W01–W18 und T01–T10 mit ASCII-Ansichten und exakten Blockzuständen);
   - **Dächer:** `daecher.md` (Δ-Profile, Traufvarianten, Eckzustände);
   - **Wände:** `waende_struktur.md` (Ständerraster, Fachwerkmuster, Jetty, Sockel);
   - **Kreise und Bögen:** `kreise_boegen_tuerme.md` (Tabellen, Bogenmuster);
   - **Paletten:** `paletten.md` (Rollenpaletten je Stil, Treppen/Stufen/Mauer-Verfügbarkeit, Ersatzfamilien);
   - **Helligkeit:** `helligkeit_texturen.tsv` (L\*, Chroma, Farbton von 134 Blöcken);
   - **Prüfwerte für Kreise, Kuppeln, Kegel, Bögen:** `skripte/*.py` (Referenzimplementierungen).
4. `docs/ARCHITECTURE.md`, `docs/TEXTURES.md`, `docs/COMPATIBILITY.md`, `docs/TEST_REPORT.md`, `README.md`.

**Achtung:** Die Notizen markieren manches als „abgeleitet, ungetestet“. Behandle es als Startpunkt und prüfe es selbst. Mechanik geht vor Blog-Rezept.

---

## 2. Entscheidungen des Nutzers (verbindlich)

| Thema | Entscheidung |
|---|---|
| **Schnee auf Dächern** | **Nicht generieren.** Minecraft legt in Schneebiomen selbst Schnee. Standardmäßig kein Schnee auf Dächern. Die bisherige Option „Schnee“ ist standardmäßig aus und nur aktiv, wenn der Text ausdrücklich danach fragt; dann nur Schnee nach den Stützregeln. |
| **Eiszapfen** | **Keine.** |
| **Licht** | **Laternen sind immer gut, besonders im Winterstil.** Sie sind das Markenzeichen-Detail: hängend an `iron_chain` unter Traufen und Vordächern, auf Zaun- und Mauerpfosten neben Türen, als Laternenpfähle am Weg, an Marktständen. `lantern` ist Standard, `soul_lantern` gibt es als Stilvariante. Stützregeln einhalten (hängend braucht einen Block darüber, stehend eine passende Fläche). |
| **Stile für Version 1** | **Mittelalter, Fantasy/Märchen, Rustikal, Nordisch, Japanisch, Kirschblüte, Modern, Mediterran.** Dazu **Weihnachten/Winter als Thema-Achse**, die sich über jeden Stil legen lässt (kein eigener Stil). |
| **Bauhöhe/Größe** | **So groß wie technisch möglich, keine künstliche Begrenzung.** Minecraft erlaubt 384 Blöcke Bauhöhe (y −64…319). Ziel: Höhe bis 384 zulassen und die Grundfläche deutlich vergrößern (mindestens 128 × 128, wenn performant). Datenmodell, Transport, Speicher, Vorschau und Export müssen das tragen; siehe Querschnitt A. |
| **Symmetrie** | **Richtet sich nach dem Prompt.** „symmetrisch“, „asymmetrisch“, „verwinkelt“ oder „Cottage“ müssen erkannt und umgesetzt werden. Ohne Angabe gilt der Stil-Standard: z. B. Modern und Japanisch eher symmetrisch-ruhig, Cottage, Fantasy und Rustikal eher asymmetrisch mit Anbauten. |
| **Tiefe** | **Sehr wichtig.** Keine flachen Wände:<ul><li>Rahmen und Pfosten stehen eine Ebene vor der Füllung, Fenster sitzen zurückgesetzt;</li><li>Sockel mit Treppenschürze, Geschossbänder, Auskragungen (Jetty), Erker, Vordächer, Dachüberstände mit Untersicht;</li><li>mindestens 2–3 Tiefenebenen pro Fassade;</li><li>dazu **echte Geschossdecken** in mehrstöckigen Häusern, ohne Möblierung.</li></ul> |
| **Interior** | Noch keine Möbel und Inneneinrichtung. Innenräume bleiben begehbar und frei. Decken und Treppenöffnungen sind erlaubt. |

---

## 3. Vorgehen

### Schritt 0: Analyse mit mehreren Agents (parallel)

Starte **parallel** Subagents (Explore bzw. general-purpose), die je einen Bereich analysieren und dir eine kompakte Zusammenfassung mit Dateipfaden liefern:

1. **Datenmodell und Grenzen:**
   - `src/core/schema/*` (BuildSpec, Optionen, VoxelModel, `resolveSpec`);
   - `src/lib/serialization/*`;
   - `src/lib/persistence/projects.ts` (IndexedDB, Schema-Version).
   - Ziel: alles finden, was an `MAX_DIMENSIONS`, Volumen, Transportgröße, Request-Limits und Hash hängt.
2. **Registry und Blockzustände:**
   - `src/core/blocks/*`, Registry-Tests, `minecraft-data`-Abgleich, Paletten.
   - Ziel: Wie fügt man Formblöcke hinzu? Wo werden Zustände geprüft?
3. **Generatoren:**
   - `src/core/generator/*` (Geometrie und `VoxelBuilder` mit Prioritäten, Haus und Bauteile, Deko, Baum, Marktstand, Bahnhof, Parser);
   - `tests/helpers/houseInspection.ts`.
   - Ziel: Was muss für Stile, Dach-Engine und Fassaden ersetzt oder erweitert werden?
4. **Vorschau, Texturen, Editor:**
   - `src/core/textures/*` (der Modell-Backer kann Multipart, Drehung und uvlock bereits);
   - `buildVoxelMesh.ts` (Farbmodus, kennt nur Würfel und flache Schienen);
   - `VoxelScene.tsx`, `src/core/editor/*`, `BlockPicker`, `MaterialList`.
5. **Export und WorldEdit-Prüfung:**
   - `src/core/export/*`, `tests/integration/worldedit.test.ts`, `tests/worldedit/*` (Java-Harness).
   - Ziel: Läuft der Reader auf diesem Windows-PC? Was braucht er?
6. **KI und Parser:**
   - `src/core/ai/*`, `src/lib/ai/ollamaPlanner.ts`, `src/app/api/ai/*`, `parseDescription.ts`.
   - Ziel: Wie wird das Planschema erweitert?

Fasse die Ergebnisse zusammen und schreibe **`docs/PLAN_PHASEN_1-8.md`**:

- konkrete Aufgaben je Phase;
- Datei- und Modulplan;
- Datenformate (Stile, Materialien, Vorlagen);
- Risiken;
- Reihenfolge.

Führe eine Aufgabenliste (TodoWrite/Tasks) und halte sie aktuell.

### Arbeitsweise in den Phasen

- **Branch:** Arbeite auf dem aktuellen Branch (`claude/zen-shannon-2nby9g`) oder einem neuen Feature-Branch davon.
- **Nach jeder Phase:**
  - `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`;
  - WorldEdit-Tests, wenn der Reader gebaut ist (siehe Querschnitt F);
  - erst bei grünem Lauf committen und pushen.
- **Subagents** für unabhängige Teilaufgaben parallel nutzen, z. B. Stildaten für mehrere Stile, die Vorlagenbibliothek oder die Geometriebibliothek mit Tests. Integration und Review machst du selbst.
- **Visuelle Prüfung ist Pflicht** (Querschnitt G): Screenshots ansehen, kritisch bewerten, nachbessern.
- **Nichts kaputt machen:** Export mit Selbstprüfung, Editor mit Undo/Redo, Projekte (alte Projekte müssen weiter ladbar sein → Migration), Varianten, KI-Fallback, Texturen, Mobilansicht, `start-windows.cmd`.

---

## 4. Die 8 Phasen

### Phase 1 – Formblöcke und zentraler Zustandsauflöser (P0, Fundament)

**Registry mit Formklassen** statt nur Vollwürfeln:

- **Formklassen:** Würfel, Säule (`axis`), Treppe, Stufe, Zaun, Zauntor, Mauer, Scheibe/Gitter, Falltür, Tür (2 Hälften), Laterne, Kette (`iron_chain`, nicht `chain`), Kerze, Laub (immer `persistent=true`), Topf/Pflanze, Teppich, Knopf, Lagerfeuer, Blitzableiter/End-Rod, Schneeschicht (nur für ausdrücklichen Wunsch).
- **Jede Formklasse kennt:**
  - Properties und Defaults;
  - Stützregel;
  - Zählregel für die Materialliste: Tür zählt 1×, `slab[type=double]` zählt 2 Stufen;
  - Rotation und Spiegelung: `facing`, `axis`, Verbindungs-Properties; beim Spiegeln `hinge` und `*_left`/`*_right`.
- **Familien zuerst** (siehe Bericht, Abschnitt „Phase 1“):
  - alle 12 Holzarten mit Treppe, Stufe, Zaun, Tor, Falltür, Tür;
  - Steinfamilien mit Treppe, Stufe, Mauer: `stone_brick`, `cobblestone`, `mossy_*`, `deepslate_tile`/`deepslate_brick`, `brick`, `mud_brick`, `tuff_brick`, `sandstone`, `smooth_quartz`, `diorite`, `polished_blackstone`, `andesite`, `granite`, `red_sandstone`, `prismarine` usw.;
  - `glass_pane` und die 16 Farbscheiben, `iron_bars`, `lantern`, `soul_lantern`, `iron_chain`;
  - Kerzen (alle Farben), Töpfe mit Fichten-/Eichen-/Azaleensetzling, Teppiche, `campfire`;
  - `cherry_leaves`, `pink_petals`, `bamboo_*`, `waxed_*copper*`.
- **Prüfung:** Jede ID und jeder Property-Wert wird gegen 1.21.11 geprüft. Der bestehende Test mit `minecraft-data` (1.21.1 und 1.21.11) muss für **alle** neuen Blöcke grün sein.

**Zustandsauflöser**, der nach dem Platzieren und vor Vorschau und Export läuft:

1. **Absichten:** Die Geometrie setzt nur Absichten, z. B. Treppe mit `facing` und `half`, Zaun ohne Verbindungen.
2. **Resolver**, ein Durchlauf:
   - Treppen-`shape` (Algorithmus im Bericht, gegen die Vanilla-Modelle prüfen);
   - Verbindungen von Scheiben, Gittern und Zäunen (nur gleiche Zaunfamilie, Tore, volle Flächen);
   - Mauer `none/low/tall` und `up`;
   - beide Türhälften, `persistent=true` bei Laub, `snowy` bei Gras.
3. **Validator mit deterministischer Reparatur und Protokoll:**
   - Stützen von Laternen, Türen, Kerzen und Schnee;
   - **Golem-Falle:** kein `carved_pumpkin`/`jack_o_lantern` auf 2× `snow_block` oder auf Kupfer;
   - keine Entities, keine verbotenen IDs.
4. **Idempotenz:** Der Resolver ist ein Fixpunkt; ein zweiter Lauf ändert nichts. Das simuliert die Nachbar-Updates von WorldEdit. Dafür gibt es einen Test.
5. **Editor:** Nach jedem Editor-Schritt läuft der Resolver lokal um die betroffenen Zellen. Undo/Redo bleibt korrekt.

**Vorschau:**

- **Texturmodus:** Der Modell-Backer kann bereits Multipart, Elementdrehung, x/y-Drehung und uvlock, also funktionieren Treppen, Zäune, Scheiben und Laternen mit echten Modellen. Prüfen und bei Bedarf ergänzen:
  - `cutout`-Darstellung für Laternen, Ketten und Pflanzen;
  - Faces ohne `cullface` richtig behandeln;
  - Glasscheiben-Ränder.
- **Farbmodus** (ohne Minecraft-Datei): Formblöcke brauchen eingebaute vereinfachte Geometrien (Treppe aus zwei Quadern, halbe Stufe, Zaunpfosten mit Armen, dünne Scheiben, kleine Laterne). Würfel für alles sind nicht mehr akzeptabel.
- **Block-Auswahl im Editor:** bei Hunderten Blöcken mit Kategorien (Holz, Stein, Glas, Licht, Deko …) und Suche. Treppen und Falltüren lassen sich beim Setzen sinnvoll ausrichten: Ausrichtung nach der angeklickten Fläche und Kamerarichtung, Properties weiter manuell änderbar.

**Abnahme:**

- Alle neuen Zustände sind in 1.21.11 gültig.
- Der WorldEdit-Reader liest Dateien mit allen Formklassen Block für Block identisch.
- Die Vorschau zeigt Treppenecken und Verbindungen wie im Spiel.
- Der Resolver ist idempotent.
- Die Materialliste zählt richtig.

### Phase 2 – Stile als Daten (P0)

**Drei Datenschichten** nach dem Vorbild Grimoire/Tome (siehe Bericht):

- **Materialien:** gewichtete Blöcke pro Form (`block`, `stairs`, `slab`, `wall`, `fence`, `trapdoor`, `door`, `pane`, `log`), Verwandte (heller, dunkler, verwittert, moosig) und **Ersatzfamilien** für fehlende Formen. Beispiel: `calcite` hat keine Treppe → `smooth_quartz_stairs`/`diorite_stairs`.
- **Paletten:** Rollen → Materialien, mit Ersatzkette.
  - Rollen: Sockel, Wand, Wandakzent, Rahmen/Outline, Balken, Fachwerkfüllung, Dach, Dachkante/Trim, First, Untersicht, Fenster, Fensterrahmen, Laden, Tür, Laterne, Akzent.
- **Stile:**
  - erlaubte Paletten, Dachtyp- und Profil-Prioren, Proportionen (Geschosshöhe, Überstand, Sockelhöhe), Symmetrie-Standard;
  - erlaubte Fenster- und Türvorlagen (2–3 wiederkehrende Detailtypen je Stil);
  - Detaildichte je Größe, Pflicht- und Verbotslisten;
  - eine kurze **LLM-Beschreibung** und Stichworte.
- **Die 8 Stile** mit Signatur-Merkmalen:

  | Stil | Signatur |
  |---|---|
  | Mittelalter | Stein-EG, Fachwerk- oder Holz-OG mit Jetty, steiles Dach 45–63°, Stamm-Eckpfosten |
  | Fantasy/Märchen | geschwungene/Glockendächer, Türmchen, runde und Bogenfenster, Moos und Ranken, asymmetrisch |
  | Rustikal | Holzhütte, Veranda, Steinkamin, Läden, Blumenkästen |
  | Nordisch | dunkles Fichten-/Dunkeleichenholz, schwerer Steinsockel, steiles Dach mit Überstand 2–3, Firstbalken, Langhaus |
  | Japanisch | erhöhter Sockel, dunkler Rahmen, Shoji, geschwungenes Dach mit großem Überstand, Pagodenoption |
  | Kirschblüte | `cherry` mit **dunklem** Rahmen oder Dach (sonst zu wenig Kontrast), `cherry_leaves`, `pink_petals` |
  | Modern | Kuben, Flachdach mit Attika/Kante, große Glasflächen, weiß/schwarz/grau, max. 3–4 Blocktypen, keine Treppendächer |
  | Mediterran | weiße Wände, Bogenfenster und Arkaden, flaches rotes Ziegeldach aus `brick`/`granite`, Töpfe, Läden |

- **Thema-Achse** `theme: none | winter | weihnachten`: Sie färbt Akzente (Rot, Gold, Grün) und aktiviert den Prozessor aus Phase 5.
- **Paletten-Lints beim Laden**, als Tests:
  - Dachmaterial ungleich Wandmaterial;
  - Rahmen oder Dach mit ΔL ≥ 15 zur Wand (Werte aus `helligkeit_texturen.tsv`; fehlende Blöcke selbst aus der Client-Datei des Nutzers berechnen und nur die Zahlen speichern, keine Texturen);
  - 3–5 Hauptblöcke plus höchstens 1–2 Akzente;
  - Dachrolle nur aus Familien mit Treppe;
  - keine verbotenen Hölzer, alle IDs gültig.
- **Texturierung:** Verwitterungsfeld nach dem Bericht (unten, Ecken, unter Vorsprüngen und Fenstern stärker), Cluster statt Streuung, keine horizontalen Bänder, Nachbarn höchstens 1 Palettenstufe auseinander.
- **Zufall:** hierarchisch geseedet (Projekt → Bauwerk → Bauteil). Gleiche Eingabe ergibt bitgleiches Modell.

**Abnahme:** Alle 8 Stile laden fehlerfrei, die Lints sind grün, und jeder Stil ist auf Screenshots klar unterscheidbar.

### Phase 3 – Dach-Engine (P1)

- **Grundriss:** eine Vereinigung von Rechtecken (Haupthaus, Flügel L/T/U, Anbau, Turm) mit Firstrichtung je Abschnitt.
- **Profile als Δ-Folgen** in Halbblöcken (Tabelle im Bericht):
  - 45°, steil 63,4°, flach ≈ 26,6°;
  - Glockenfuß/„flared eave“, konkav (Bell-cast), konvex (Gambrel), S-Kurve (nur groß), Mansard.
  - Der Spalten-Algorithmus setzt Treppen, Stufen und Vollblöcke korrekt.
- **Dachformen:**
  - Satteldach, steiles Satteldach, Walm, Krüppelwalm, Pyramide, Mansard, Gambrel, Saltbox, A-Frame, Flachdach mit Attika (Modern);
  - Pultdach für Anbauten, Kegel und Kuppel für Rundtürme (Phase 7);
  - Pagode mit gestuften Dächern (Japanisch). Aufgebogene Ecken hinter ein Experiment-Flag, bis sie gut aussehen.
- **Details:**
  - Überstand 1 rundum, 2–3 bei Nordisch, Japanisch und Chalet;
  - **Untersicht** aus Kopfüber-Treppen unter Traufe und Ortgang;
  - **Kontrast-Dachkante**, First in 5 Varianten (Bericht);
  - Giebel 1 Block zurückgesetzt mit Fenster oder Balken;
  - **Gauben**, Kamin mit `campfire` (Rauch frei);
  - **Verschneidungen und Kehlen** bei Kreuzgiebeln (vom höchsten zum niedrigsten Abschnitt; `inner_*`/`outer_*` setzt der Resolver).
- **Regeln:** ungerade Breiten bevorzugt; Satteldach bis ≈ 12 Tiefe, darüber Walm, Flügel oder Mansard; Anstieg je Abschnitt ≤ 7; Firsthöhen benachbarter Teile variieren.
- **Schnee:** kein Schnee auf Dächern (Entscheidung).

**Abnahme:**

- Alle Formen ohne Lücken und schwebende Teile, Ecken und Kehlen korrekt.
- Profile sehen auf Screenshots wirklich geschwungen aus, nicht wie ein „Mischmasch aus Neigungen“.
- Die Dachhöhe passt zur Hausbreite.

### Phase 4 – Wände, Fachwerk, Tiefe, Fenster und Türen (P1)

- **Fassaden-Assembler:** klassifiziert Trauf-, Giebel- und Eingangsseiten.
- **Ständer und Balken:**
  - Ständerraster nach der Tabelle im Bericht (Eckständer, Ständer alle 3–5);
  - liegende Balken an Geschosslinien mit richtiger `axis`, `*_wood` an Knoten.
- **Tiefe:**
  - **Füllung eine Ebene hinter dem Rahmen**, oder Rahmen/Pfeiler eine Ebene vor der Wand;
  - Sockel 1–3 hoch mit Treppenschürze und Verwitterung unten;
  - Geschossbänder, **Jetty** (+1 je Geschoss, max. +2) auf Kopfüber-Treppen-Konsolen;
  - Erker, Vordächer, Veranda;
  - Fachwerkmotive (Kopf-/Fußband, Mann, Andreaskreuz, Strebe), **ein Motiv pro Wand**, gewichtet nach Größe.
- **Mehrstöckige Häuser:** echte Geschossdecken, Geschosshöhe 4–5, Treppenöffnung freilassen.
- **Vorlagenbibliothek** Fenster W01–W18 und Türen T01–T10 aus `fenster_tueren_details.md`:
  - Daten statt Code: Rollen statt fester Blöcke, kanonisch nach Süden;
  - Tiefenebenen d −1/0/+1/+2, automatisch gedreht und gespiegelt.
  - Fenster:
    - Sims aus Kopfüber-Treppe, Sturz aus oberer Stufe, Stamm-Rahmen;
    - **Falltür-Läden**, Blumenkästen, zurückgesetztes Glas (Scheiben statt Glasblöcke, wo sinnvoll);
    - Bogen- und Rundfenster (Rundfenster aus Glas**blöcken**, weil Scheiben neben Treppen nicht verbinden);
    - Erker, Gauben, Shoji, Bandfenster, Bleiglas.
  - Türen: Rahmen, Stufe davor, Oberlicht, **Laternen beidseitig**, Bogenportal, Doppeltür mit `hinge`, Vordach.
- **Platzierung:**
  - Fensterachsen fluchten über alle Geschosse;
  - Abstände ≥ 1 (mit Läden ≥ 2), zur Ecke ≥ 1 (mit Läden ≥ 2);
  - Tür mittig oder auf Achse, davor 1–2 Blöcke Weg;
  - Kollisionsprüfung für d+1/d+2 gegen Vordächer, Erker und Traufen.
- **Symmetrie aus dem Prompt:**
  - symmetrisch: gespiegelte Fassaden, mittige Tür;
  - asymmetrisch/Cottage: versetzte Anbauten, ungleiche Fensterachsen, Seitentür, Kamin außen;
  - verwinkelt: mehrere Flügel und Firsthöhen.

**Abnahme:**

- Keine flache Wandfläche über 5 Blöcke ohne Tiefensprung (automatischer Lint).
- Alle Vorlagen sind in 4 Ausrichtungen gültig.
- Tür und Fenster sind von außen und innen frei.
- Holz-Outlines sind klar lesbar.

### Phase 5 – Weihnachten/Winter-Schicht und Landschaft (P1)

- **Prozessor `festive`** mit drei Intensitätsstufen, läuft nach dem Bau und vor dem Resolver:
  - Girlanden aus persistentem Fichtenlaub unter Traufen, mit Leuchtblöcken (Froschlicht, Glowstone o. Ä.) **im** Laub und roten Schleifen alle 4–6;
  - Kränze an Türen (Laub mit roten Akzenten);
  - **Laternen** an `iron_chain` unter Vordächern und Traufen, Laternenpfähle (Vanilla-Muster: 3 Zäune, Arme, hängende Laternen);
  - Kerzen auf Simsen, rot-goldene Akzente, Geschenke;
  - auf Laub keine Laternen oder Kerzen setzen (leere Stützfläche).
- **Kein generierter Schnee** auf Dächern, keine Eiszapfen (Entscheidung). Wintermodus färbt höchstens die Umgebung: Eis statt Wasser, gefrorener Teich als `packed_ice`. Schneeblöcke als Boden um Bauwerke nur, wenn der Text es verlangt.
- **Weihnachtsbaum** neu:
  - Stufenprofil (R ≈ 0,38·H, Stufen zu 3–4 Lagen);
  - Kugeln aus Wolle oder Beton (8–12 %), Lichter in der Laubhülle (4–6 %), Stern aus `gold_block`/`glowstone` mit `end_rod`-Strahlen;
  - Geschenke ringsum, keine Golem-Muster.
- **Marktstand** neu: 5×5 oder 7×7, Theke 1–2 hoch, rot-weiße Streifenmarkise aus Treppen, Laternen über der Theke, Waren (Fässer, Kürbis, Melone, Heu), mehrere Buden als Gasse.
- **Bahnhof** neu: Abschnittsdächer statt eines Riesendachs, Bahnsteigdach mit Stützen und Laternen, Uhr, Bänke aus Treppen, korrekt verbundene Zäune und Geländer.
- **Landschaft:**
  - Wege gemischt (keine zwei gleichen Blöcke nebeneinander, organische Kanten, nie mehr als 7 gerade);
  - Hecken aus persistentem Laub, Zäune mit Toren, Laternenpfähle.

**Abnahme:**

- Keine ungestützten Laternen oder Kerzen, kein Golem-Muster, kein Laub ohne `persistent=true`.
- Weihnachtliche Variante jedes Stils sieht festlich aus, ohne überladen zu wirken.

### Phase 6 – KI-Planer und Parser mit Stilkatalog (P2)

- **Planschema** pro Aufruf aus dem Katalog erzeugen, flach halten:
  - Enums: Stil, Thema, Bauwerkstyp, Dachtyp, Dachprofil, Flügel (keine/L/T/U), Turm (keiner/eckig/rund, Position), **Symmetrie** (symmetrisch/asymmetrisch/Stil-Standard), Fenster- und Türfamilie, Laternendichte, Detailgrad;
  - Integer mit Grenzen: Geschosse, Breite, Tiefe, Überstand, Gaubenzahl;
  - Booleans: Veranda, Kamin, Erker, Jetty;
  - dazu `explanation`/`rationale` und `unsupported`.
- **Keine Koordinaten, keine freien Block-IDs** (die Recherche zeigt, dass LLMs daran scheitern).
- **Prompt:**
  - Stilkatalog mit den LLM-Beschreibungen als „Funktionsdoku“ und das Schema als Text;
  - 2–4 kuratierte Few-Shot-Beispiele aus einer Beispieldatei (mindestens 20 Paare Wunsch → Plan), per Stichwortsuche ausgewählt;
  - Temperatur 0, `think` nach Test mit der installierten Ollama-Version (bekannte Probleme mit `format` + `think` bei Qwen3).
- **Absicherung:** Zod-Validierung, Clamping, ein Retry mit Fehlermeldung, Rückfall auf den Parser-Plan. Parser und KI liefern dasselbe Planformat.
- **Parser erweitern** (deutsch, mit Synonymen):
  - Fachwerk, Hexenhaus, Märchen, Chalet, Hütte, Wikinger/Langhaus, Pagode, Tempel, Sakura/Kirschblüte, Villa, Bungalow, modern, mediterran, Toskana;
  - symmetrisch, asymmetrisch, verwinkelt, Cottage;
  - geschwungenes Dach, Walm, Mansard, Gauben, Erker, Veranda, Balkon;
  - Turm rund/eckig, zweistöckig/dreistöckig, „mit vielen Laternen“, weihnachtlich/winterlich.
- **Testset:** mindestens 50 deutsche Wünsche mit erwarteten Planeigenschaften.
  - Parser-Ergebnisse automatisch prüfen.
  - **Wenn Ollama auf diesem PC läuft** (RTX 5060 Ti, `qwen3:14b`): das Testset auch mit der echten KI laufen lassen und Validierungsrate, Retry-Rate und Laufzeit messen und dokumentieren. Kein Fine-Tuning.

### Phase 7 – Kreise, Bögen, Türme (P2)

- **Geometriebibliothek** nach „Blockmitte im Kreis“ (nicht Bresenham!):
  - Kreis dünn, dick und gefüllt, Ellipse, Kugel/Kuppel (6er-Hülle), Kegel, Rotationskörper, Zwiebelprofil (experimentell);
  - Bögen rund, spitz und segmentiert mit Treppen-Glättung.
- **Regressionstests** gegen die veröffentlichten Zahlen: Kreis D5 = 12/16/21, D15 = 40/56/177, Kugel D15 hohl = 530, Kegel D15/H15 massiv = 919. Die Skripte in `research_notes/.../skripte/` sind die Referenz.
- **Rundturm als Bauteil:**
  - D 7–15, Kegel mit Überstand (D+2) oder Kuppel;
  - Zinnen nur bei symmetrischen D (7, 9, 15, 17, 21);
  - Fenster eingeschnitten, Verjüngung nur mit passender Parität;
  - Anschluss an das rechteckige Haus.
- **Bogenfenster und -portale** nutzen die Bibliothek.
- Optional, wenn gut: Bauwerkstyp „Turm/Burgturm“.

### Phase 8 – Abnahme (laufend und am Schluss)

- **Automatisch:**
  - alle IDs und Properties in 1.21.11 gültig;
  - WorldEdit-Reader liest jede Datei (alle Stile × Bauwerke × Formklassen);
  - Resolver idempotent;
  - Stützen gültig, keine Golem-Muster, keine Entities;
  - bitgleiche Reproduzierbarkeit.
- **Ästhetik-Lints je Bauwerk:** Überstand ≥ 1, ΔL-Signatur, keine flache Wand > 5, Dach ≠ Wand, Dachabschnitt ≤ 7 Anstieg, Fensterachsen, Laternen am Eingang.
- **Bild-Regression:** Screenshots aus der Vorschau für jede Kombination aus Stil, Bauwerk und Thema, mit echten Texturen.
- **Doku:** README, ARCHITECTURE, COMPATIBILITY (neue Blöcke), TEST_REPORT (echte Zahlen) und LOCAL_AI aktualisieren.
- **In-Game-Checkliste** für den Nutzer in `docs/WORLD_EDIT_IMPORT.md`:
  - Ecken, Verbindungen, Türen und Laternen nach `//paste` unverändert?
  - `//perf neighbors off` als Gegenprobe;
  - Screenshots eintragen.

---

## 5. Querschnittsaufgaben

**A. Größere Bauwerke** (Entscheidung: so groß wie möglich)

- `MAX_DIMENSIONS` deutlich anheben: Höhe bis 384, Grundfläche mindestens 128 × 128, wenn die Messungen es tragen.
- **Mitziehen:**
  - Zod-Schemas und Hash (Format bleibt kanonisch);
  - **Transport:** Indizes komprimieren (z. B. RLE oder gzip) statt roh base64; Request-Limits anpassen;
  - IndexedDB mit Migration alter Projekte, `/api/generate`- und `/api/export`-Limits;
  - Sponge-v3-Export (Short-Maße ≤ 32767, kein Problem);
  - Vorschau-Performance: Meshing in einem Web Worker oder in Chunks, Ebenenschnitt;
  - Editor-Raycasting.
- **Messen und dokumentieren:** Generierzeit, Meshing-Zeit, FPS und Dateigröße für ein großes Bauwerk. Die endgültigen Grenzen trägst du in die Doku ein.

**B. Bestehende Bauwerkstypen** profitieren alle vom Stil- und Formsystem: Haus, Weihnachtsbaum, Marktstand, Bahnhof.

**C. Strukturprüfungen** in `tests/helpers/houseInspection.ts` erweitern statt aufweichen:

- Treppen, Stufen, Zäune und Laternen verstehen;
- „schwebend“ berücksichtigt Stützregeln (hängende Laterne an Kette ist gestützt);
- Eingang frei, Fenster frei, keine Lücken im Dach.

**D. Editor und Materialliste:**

- Kategorien und Suche, Ausrichtung beim Setzen, Resolver nach jedem Schritt;
- Zählregeln (Türen 1×, Doppelstufe 2, Stacks: Türen und Schilder 16, sonst 64; Kerzen als Anzahl im Block).

**E. Performance und Bedienung:** Generieren bleibt für normale Häuser unter ~2 s. Ladeanzeigen, keine eingefrorene Oberfläche.

**F. WorldEdit-Reader auf Windows:**

- Der Java-Harness (`tests/worldedit/`) ist bisher nur unter Linux gebaut.
- Versuche `npm run worldedit:build` (JDK 21, Maven, Python 3, Git Bash).
- Fehlende Entwicklerwerkzeuge darfst du installieren, z. B. per `winget install EclipseAdoptium.Temurin.21.JDK`, Maven und Python; alternativ WSL2.
- Wenn es nicht klappt: ehrlich dokumentieren und die neuen Blockzustände mindestens gegen `minecraft-data` und den eigenen Validator prüfen.
- Für neue Formblöcke ist der WorldEdit-Lesetest aber sehr wertvoll, also gib dir Mühe.

**G. Visuelle Qualität** (Pflicht, wiederholt bis es gut ist)

- **Texturen:** Nutze die echten Texturen. Die Client-Datei liegt meist unter `C:\Users\Luca\curseforge\minecraft\Install\versions\1.21.11\1.21.11.jar`; die App findet sie automatisch, oder du setzt `MINECRAFT_JAR`/`MCB_MINECRAFT_JAR`.
- **Screenshots:** per Playwright, mehrere Blickwinkel inklusive Nahaufnahme der Fassade. Sieh sie dir an und bewerte sie streng mit dieser **Builder-Checkliste:**
  1. Dach aus Treppen und Stufen mit Überstand, Untersicht, sauberem First, korrekten Ecken, passender Höhe zur Breite?
  2. Mindestens 2–3 Tiefenebenen pro Fassade, keine flache Wand > 5?
  3. Holz-Outlines und Ständer klar lesbar, Füllung zurückgesetzt?
  4. Fenster mit Rahmen, Sims und Läden bzw. stiltypischem Design, zurückgesetzt, Achsen fluchtend?
  5. Palette stimmig (3–5 Hauptblöcke, Kontrast Dach/Rahmen zu Wand, dunkler Sockel, Akzent ≤ 10 %)?
  6. Laternen am Eingang und unter Traufen, im Weihnachtsthema Girlanden, Kränze, Lichter?
  7. Silhouette interessant (Flügel, Gauben, Erker, Turm), Symmetrie so, wie der Prompt es wollte?
  8. Würde ein erfahrener Minecraft-Builder das so bauen? Wenn nein: nachbessern und erneut prüfen.
- **Mindestens je Stil 3 Prompts** (klein, mittel, groß/mehrstöckig) plus Weihnachtsvariante. Lege die besten Screenshots unter `docs/screenshots/` ab. Sie zeigen nur das, was die App rendert; das ist in Ordnung, weil die Texturen des Nutzers nur im Bild landen.

---

## 6. Regeln

- **Ehrlich bleiben:**
  - keine Fake-Funktionen;
  - „getestet“ nur mit echtem Testlauf;
  - Ableitungen aus den Notizen, die du nicht prüfen konntest, als solche kennzeichnen;
  - der Import im Spiel bleibt „nicht verifiziert“, bis der Nutzer ihn bestätigt.
- **Mojang-Dateien:** keine ins Repo (auch keine Modell-JSONs oder Texturen). Abgeleitete Zahlen (Helligkeit usw.) sind erlaubt.
- **Konsistenz:** Blockzustände nur über die Registry und den Resolver. Vorschau, Editor, Materialliste und Export nutzen dieselben aufgelösten Zustände.
- **Commits:** nach jeder Phase mit grünem Lauf, auf Englisch, pushen. Bei roten Tests nicht committen, sondern reparieren.
- **Kompatibilität:** Bestehende Funktionen und gespeicherte Projekte bleiben nutzbar.
- **Sprache:** Deutsch für UI und Doku, Englisch für Code-Kommentare und Commits.

---

## 7. Abschluss

Wenn alle Phasen fertig und grün sind:

1. `docs/TEST_REPORT.md` mit echten Zahlen aktualisieren, dazu `README.md` (neue Funktionen, Stile, Beispiele für gute Prompts) und `docs/ARCHITECTURE.md`.
2. Einen **Abschlussbericht auf Deutsch** für den Nutzer schreiben:
   - Was ist neu? Wie startet man?
   - Welche Prompts zeigen die Stile am besten (mit Screenshots)?
   - Was wurde wie getestet, was ist offen (insbesondere In-Game-Abnahme, ggf. WorldEdit-Reader unter Windows, KI-Messwerte)?
   - Nächste Schritte.
3. Committen und pushen.
