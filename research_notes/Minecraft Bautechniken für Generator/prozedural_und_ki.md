# Prozedurale Minecraft-Gebäudegenerierung und LLM-gestützte Gebäudeplanung: Stand der Technik

Recherchestand: 22.10.2026. Ziel: Grundlagen für (a) eine datengetriebene Stil-/Musterbibliothek eines regelbasierten TypeScript-Generators (Java Edition 1.21.11, Export als Sponge-Schematic für WorldEdit) und (b) einen Planungsschritt, in dem ein kleines lokales Modell (z. B. qwen3 14B über Ollama, JSON-Schema-Ausgabe) Stile und Parameter wählt.
Methodik: arXiv-Volltexte, GDMC-Wikiseiten und Bewertungsrichtlinien, Quellcode und Design-Notizen der GDMC-Repos (Grimoire/Tome, Frightful Hobgoblin, MGAIA, Niels-NTG, GDPC), Arnis-Quellcode, Minecraft-Wiki, WorldEdit- und Ollama-Dokumentation. Wenn eine Angabe nur aus einer Suchmaschinen-Zusammenfassung stammt und nicht im Original geprüft wurde, ist das vermerkt.

---

## 1. GDMC: Welche Techniken nutzen gute Siedlungsgeneratoren für Gebäude, was bewertet die Jury, welcher Open-Source-Code ist wiederverwendbar?

### Takeaway
Die besten GDMC-Generatoren der Jahre 2022 bis 2025 setzen nicht auf ein einzelnes „intelligentes“ Verfahren. Sie verwenden mehrstufige Pipelines: Terrain- und Biomanalyse, dann agentenbasierte oder iterative Plot-Planung, dann modulare Gebäude aus Bauteilen (Grundriss aus Rechtecken, Wandsegmente mit Öffnungen, Dach aus Eck-/Seiten-Komponenten), wobei ein rollenbasierter Paletten-Tausch das Material ans Biom anpasst. Die Jury bewertet Adaptivität, Funktionalität, Narrativ und Ästhetik jeweils von 0 bis 10. Unter „Ästhetik“ versteht sie ausdrücklich einen *konsistenten Look mit angemessener Variation und ohne störende prozedurale Artefakte*.

### Cited Findings

**Wettbewerb und Bewertung**
- GDMC ist ein jährlicher Wettbewerb (seit 2018) für Algorithmen, die ohne menschliche Aufsicht eine Siedlung auf einer unbekannten Karte erzeugen. 2025 war die 8. Ausgabe mit Minecraft 1.21.4. Alle 6 Einreichungen nutzten das HTTP-Framework. Seit dem Wechsel zu teilnehmerseitiger Generierung sind „libraries, data and even external AI calls“ erlaubt. — [GDMC 2025](https://gendesignmc.wikidot.com/wiki:2025-settlement-generation-competition)
- Bewertung durch menschliche Jury in vier Kategorien (je 0–10): Adaptability, Functionality, Evocative Narrative, Aesthetics. Die Fragen zur Ästhetik lauten: „Does the settlement look good? Is there a consistent look … Does it appear that all structures belong to the same settlement? Is there an appropriate level of variation …? Are there any jarring features that make the settlement look unbelievable?“ — [GDMC Evaluation](https://gendesignmc.wikidot.com/wiki:evaluation)
- Die Bewertungsrichtlinie kritisiert reine Template-Ansätze. Mods mit handgebauten Templates erlaubten „little variation between the buildings“ und kaum Anpassung an das Terrain. Parametrisierte Gebäude seien adaptiver, aber es gebe einen „trade-off between controlling the exact look of a structure, and making it adaptable“. — [GDMC Evaluation](https://gendesignmc.wikidot.com/wiki:evaluation)
- Zur Adaptivität: KI-Generatoren „often rely on flattening large areas“. Erwünscht ist die sichtbare Nutzung lokaler Materialien und des Bioms. Als Beispiel für narrative Funktionalität nennt die Richtlinie Satteldächer, die „should be more popular in a rainy swamp than in a dry dessert“. — [GDMC Evaluation](https://gendesignmc.wikidot.com/wiki:evaluation)
- Zum Narrativ: Siedlungen sollen eine Geschichte „by looks alone“ erzählen, etwa als befestigter Außenposten oder als Hauptstadt. Simulationsansätze, also Wachstum über mehrere Bauphasen, werden ausdrücklich angeregt. — [GDMC Evaluation](https://gendesignmc.wikidot.com/wiki:evaluation)
- Rückblick „Impressions“ (Salge et al., arXiv 2021, FDG 2022): Die Teilnehmer müssten „a happy medium between hard coding many building options and using a complex method of building generation such as a GAN“ finden. Ein Juror schreibt: „Buildings themselves are not that hard to procedurally generate. However, properly placing and lay-outing their interiors (stairs, rooms, furniture, etc.) require some thoughts“. Viele Ansätze seien durch „placement of pre-generated template assets“ geprägt. Weil pro Generator nur 3 Ausgaben bewertet werden, lohne sich Variation *innerhalb* eines Generators wenig. — [arXiv 2108.02955](https://arxiv.org/abs/2108.02955)

**Ergebnisse und Techniken der Gewinner und auffälliger Einreichungen**
- **2025, 1. Platz „Gaussianly Filtered“** (Gesamt 5,95, Ästhetik 6,54, Narrativ 5,92): Die Wege entstehen durch eine wasserähnliche Simulation. Im Übrigen „a lot of engineering … (gaussian filters, image processing, mathematical functions, artsy patterns)“. 2. Platz Shadow Wizard Money Gang mit TOME (4,71), 3. Platz Panda_Revival (4,62, Narrativ 5,31). — [GDMC 2025](https://gendesignmc.wikidot.com/wiki:2025-settlement-generation-competition). Das Repo enthält handgebaute Schematics (`builds/raw/fhouse1–8.schem`, `barn.schem`, `tent.schem`), die zu CSV verarbeitet werden. — [IsaacBraamGit/gdcm2025](https://github.com/IsaacBraamGit/gdcm2025)
- **2024, 1. Platz „Frightful Hobgoblin“** (SpecificProtagonist, Gesamt 6,10, Narrativ 7,11, Ästhetik 6,41): in Rust geschrieben. Simuliert Dorfbewohner, die Material sammeln und Gebäude (Holzfäller, Steinbruch, Haus) errichten. „Trees and building styles are determined by biome.“ Der Bauablauf wird als Replay per Datapack abgespielt, rund 1,5 Mio. Befehle, gespeichert in NBT-Command-Storage. Die Simulation ist „pseudorandom but deterministic“. — [GDMC 2024](https://gendesignmc.wikidot.com/wiki:2024-settlement-generation-competition), [frightful_hobgoblin README](https://github.com/SpecificProtagonist/frightful_hobgoblin)
- **2024, 2. Platz Grimoire (SWMG)**: Das Baugebiet wird in Bezirke und Superbezirke geteilt, mit Stadtmauer. Straßen verlaufen entlang der Bezirksnähte, Gebäude stehen in „blocks“. Restflächen werden zu „nooks“ und nach Konfiguration dekoriert. — [GDMC 2024](https://gendesignmc.wikidot.com/wiki:2024-settlement-generation-competition)
- **2024 „Last Minute“**: „Buildings are made from modular patterns that are assembled according to certain conditions.“ Ästhetik 4,05, Gesamt nur 2,64. — [GDMC 2024](https://gendesignmc.wikidot.com/wiki:2024-settlement-generation-competition), [Xeon0X/GDMC-2024](https://github.com/Xeon0X/GDMC-2024)
- **2024 Niels-NTG (Best Underground Structure)**: Handgebaute NBT-Strukturen plus Python-Klasse. Das Layout jeder Etage entsteht per Wave Function Collapse mit Nachbarschaftsregeln (vorne/hinten/links/rechts/oben/unten und Rotation). Weil WFC manchmal mehrere Versuche braucht, laufen parallele Prozesse. — [Niels-NTG/GDMC2024](https://github.com/Niels-NTG/GDMC2024), WFC-Erklärung: [boristhebrave.com](https://www.boristhebrave.com/2020/04/13/wave-function-collapse-explained/)
- **2023, 1. Platz JEB_GEN_** (PositionNotLoaded, Gesamt 5,98, Adaptivität 6,40): Gebäude wurden von Hand gebaut, per Structure Block als NBT gespeichert und je nach Biom im Material getauscht, vor allem die Holzart. Biome sind in 7 Kategorien eingeteilt (Snowy, Forest, Jungle, Savanna, Dark Oak, Desert, Badlands). — [GDMC 2023](https://gendesignmc.wikidot.com/wiki:2023-settlement-generation-competition), [JEB_GEN_ Write-up (PDF)](https://gendesignmc.wdfiles.com/local--files/wiki:2023-settlement-generation-competition/JEB_GEN_writeup%5B1%5D.pdf)
- **2023 Innovation Award (lobende Erwähnungen)**: MGAIA Leiden für „WFC for modular buildings“ und Castle Lover für „Geometry and Gradients for Large-scale structures“. — [GDMC 2023](https://gendesignmc.wikidot.com/wiki:2023-settlement-generation-competition). Laut MGAIA-README „the algorithm tends to not use certain cool structures“. Abhilfe: einzelne Zellen vorab festlegen, etwa einen Innenhof, um den WFC herumbaut. Ein LLM erzeugt dort nur die Story, nicht das Gebäude. — [ScholliYT/MGAIA-Minecraft-GDMC](https://github.com/ScholliYT/MGAIA-Minecraft-GDMC)
- **2022, Gewinner (van der Staaij et al., CoG 2023)**: Ein dezentraler, iterativer, agentenbasierter Blueprint wird zunächst nur im Speicher geplant. Pro Strukturtyp gibt es einen eigenen prozeduralen Generator. „The level of PCG can vary greatly between structure types, from simple palette swaps up to completely random buildings with different shapes and interiors.“ Das Narrativ entsteht über Markov-Namen und eine Chronik aus String-Substitution mit zufälligen Synonymblöcken. — [arXiv 2309.10871](https://arxiv.org/abs/2309.10871)
- **Organic Building Generation** (Green, Salge, Togelius, FDG 2019): Grundrisse entstehen aus constrained growth plus zellulären Automaten, mit Räumen, Fenstern und verbindenden Türen. Laut Zusammenfassung lassen sich „a thousand fully connected structures in just a few seconds“ erzeugen. — [arXiv 1906.05094](https://arxiv.org/abs/1906.05094) (Inhalt laut Abstract/Suchzusammenfassung)

**Code-Analyse TOME (SWMG, 2. Platz 2025, Rust, letzter Commit Okt. 2026)**: das am besten dokumentierte offene Gebäudesystem
- Die Hauspipeline hat 18 Schritte: „footprint → foundation → frame → walls → floors → walls → roof → rooms → furnish“. Es gibt eine Rückkante: Fenster werden erst gesetzt, nachdem die Raumaufteilung zeigt, welche Wandzellen innen liegen. — [Tome `buildings_v2/pipeline.rs`](https://github.com/Jandhi/Tome)
- Grundriss: ein Kern-Rechteck plus angebaute Flügel. Seitenlängen werden „to the nearest odd number“ gerundet (ungerade Breite ergibt einen mittigen First). Kandidatenlayouts werden nach mehreren Kriterien mit 0–1 bewertet und per gewichtetem Zufall gewählt. — [Tome `footprint/generate.rs`](https://github.com/Jandhi/Tome)
- „Jetty“-Transformation (Fachwerk-Überhang): Obergeschosse wachsen auf Seiten zur freien Luft um 1 Block nach außen. Seiten an Nachbarflügeln bleiben bündig. Passt das Ergebnis nicht in den Plot, bleibt der ursprüngliche Rahmen. — [Tome `frame/jetty.rs`](https://github.com/Jandhi/Tome)
- Fachwerk-„TimberPattern taste roll“ (Plain/Studded/Braced/Decorated): Die Wahl ist nach Größenklasse gewichtet („Cottages stay simple; bigger buildings get denser timber“). Pro Wand gibt es genau ein Motiv („never a mix“). Muster, deren Ständer bei der Wandlänge gar nicht erscheinen würden, werden vorher herausgefiltert. — [Tome `walls/timber.rs`](https://github.com/Jandhi/Tome)
- Fensterfüllung je nach Kultur: Japanisch zum Beispiel als Zaun-Spalte, die wie ein Shoji-Gitter wirkt. Die Tür kommt auf das Segment, das der Plotkante am nächsten liegt (vermutlich die Straßenseite). Große Gebäude erhalten eine zweite Tür gegenüber. — [Tome `walls/openings.rs`](https://github.com/Jandhi/Tome)
- Die Kultur wird aus der Biomkarte per gewichteter Abstimmung gewählt: Arid → Desert; Tropical, Bambus (Gewicht 10) und Kirschhain (erzwungen) → Japanese; alles andere → Medieval. Wasser zählt nicht mit. Gezogen wird einmal gewichtet zufällig, sodass auch eine Minderheitskultur erscheinen kann. — [Tome `buildings_v2/climate.rs`](https://github.com/Jandhi/Tome)
- Dächer sind Sets aus NBT-Komponenten pro Stil (`side`, `corner`, `inner`, dazu `upper_*` für hohe Dächer), z. B. `desert_roof_dome`, `medieval_roof_stairs_side`. — [Tome `data/buildings/roofs`](https://github.com/Jandhi/Tome), [Grimoire `roofs/roof.py`](https://github.com/Jandhi/grimoire)
- Laut Doku gibt es die Dachtypen Flat, Gabled, Hipped und Mansard sowie Treppentypen gerade, L, U und Wendel. *Hinweis: Diese Doku (`docs/buildings.md`) wirkt teilweise generisch und deckt sich nicht in jedem Detail mit dem Code; sie ist als Designabsicht zu lesen.* — [Tome docs](https://github.com/Jandhi/Tome)

**GDPC (Python-Client für die GDMC-HTTP-Mod)**
- GDPC ist das Standardframework der GDMC-Community. `placeBlock` und die Geometriefunktionen (`placeCuboid`, `placeCuboidHollow`, `placeStripedBox`, `placeCheckeredBox`, Zylinder, Kugeln) akzeptieren `Block | Sequence[Block]`. Bei einer Liste wird zufällig gesampelt. Ein `Transform` kombiniert Spiegelung, eine der vier 90°-Rotationen in der XZ-Ebene und Translation. `Block.transform()` passt dabei die Zustände `facing`, `axis` und `rotation` an. — [avdstaaij/gdpc](https://github.com/avdstaaij/gdpc) (Quellcode `editor.py`, `geometry.py`, `transform.py`, `block.py`), [Doku](https://gdpc.readthedocs.io)

### Inferences
- Die erfolgreichen Generatoren sind *Hybride*: handgebaute Bausteine (NBT/Schematic-Komponenten) kombiniert mit prozeduraler Komposition und Paletten-Tausch. Das deckt sich mit dem „happy medium“-Befund aus „Impressions“. Für unseren TS-Generator heißt das: Bauteilbibliothek plus parametrischer Assembler, nicht entweder-oder.
- Ein konsistenter Look entsteht in den Top-Generatoren über **eine Kultur bzw. einen Stil pro Siedlung** (Tome) und Variation *innerhalb* der Stilregeln: Größenklasse beeinflusst die Detaildichte, nur ein Motiv pro Wand. Dieses Muster lässt sich direkt übertragen, etwa „Weihnachtsdorf alpin“ oder „Lebkuchen“ als Kultur und Variation über Hausgröße und Details.
- Dass Tome Fenster erst nach der Raumaufteilung setzt, ist ein brauchbares Architekturmuster. Die Fassade sollte aus der Innenlogik abgeleitet werden, nicht umgekehrt.
- Ungerade Gebäudebreiten (für mittigen First und symmetrische Giebel) und 1 Block Überhang pro Obergeschoss sind billige Regeln mit großer ästhetischer Wirkung.
- Der Narrativ-Score der Gewinner (Hobgoblin 7,11) zeigt: Sichtbare „Geschichte“ in Bauphasen, Arbeitsorten und Beschilderung zählt stark. Für ein Weihnachtsthema eignen sich etwa Werkstatt, Rentierstall und Markt.

### Gaps
- Die Gebäudetechnik des Gewinners 2025 (Gaussianly Filtered) ist über „artsy patterns“ und Schematics hinaus nicht dokumentiert. Den Code habe ich nicht im Detail analysiert.
- In den hier geprüften Top-Einreichungen fand ich keinen expliziten Shape- oder Fassadengrammatik-Ansatz im Stil von CGA. Fassaden werden eher über Segment- und Öffnungsplanung erzeugt. Die klassische CGA-Shape-Grammar (Müller et al., SIGGRAPH 2006, [DOI 10.1145/1141911.1141931](https://doi.org/10.1145/1141911.1141931)) ist Hintergrundwissen und wurde für diese Notizen nicht neu abgerufen.
- Detaillierte Jury-Kommentare (Excel-Tabelle 2024 auf Dropbox) wurden nicht ausgewertet.

---

## 2. Andere prozedurale Werkzeuge (Vanilla-Jigsaw, WorldEdit, Arnis, Mods): Wie kodieren sie Stil und Variation?

### Takeaway
Vanilla-Minecraft kodiert Stil über **biomspezifische, gewichtete Template-Pools** aus kleinen NBT-Stücken, die über Jigsaw-Anschlüsse rekursiv verbunden werden, plus **Processor-Listen** für Alterung, Moos und Verfall. WorldEdit kodiert Variation über **gewichtete Zufallsmuster**. Arnis (OSM → Minecraft) zeigt die ausgefeilteste Form datengetriebener Variation: Farbe-zu-Block-Paletten mit Verwendungs-Flags, regionale Dachtyp-Wahrscheinlichkeiten, ein pro Element deterministisch geseedeter Zufall und eine explizite Anti-Wiederholungslogik für Nachbarn.

### Cited Findings

**Vanilla-Jigsaw und Template-Pools (Dörfer, Außenposten, Ancient Cities)**
- Ein Template-Pool-Element hat `weight` (1–150), `element_type` (`single_pool_element`, `legacy_single_pool_element`, `feature_pool_element`, `list_pool_element`), `projection` (`rigid` für Häuser, `terrain_matching` für Straßen) und `processors`. Der Pool hat einen `fallback`-Pool für abschließende Stücke, etwa Straßenenden. — [Minecraft Wiki: Template pool](https://minecraft.wiki/w/Template_pool)
- Jigsaw-Block: `name`, `target` (Anschluss nur, wenn der Name des Gegenstücks dem Target entspricht), `pool`, `joint` (`rollable` = zufällige Rotation, `aligned` = ausgerichtet), `selection_priority` und `placement_priority`. — [Minecraft Wiki: Jigsaw Block](https://minecraft.wiki/w/Jigsaw_Block)
- Dörfer haben pro Biom (desert, plains, savanna, snowy, taiga) eigene Pools: `houses`, `streets`, `terminators`, `town_centers` sowie eine `zombie`-Variante. Verschneite Taiga-Dörfer nutzen die Taiga-Gebäude. Dort wird jeder Vollblock mit Himmelssicht mit Schnee bedeckt und Wasser durch Eis ersetzt. — [Minecraft Wiki: Village/Structure](https://minecraft.wiki/w/Village/Structure)
- Processor-Typen:
  - `rule`: Eingabe-, Orts- und Positionsprädikate bestimmen den `output_state`. Weil ausgelassene Blockzustände auf Default zurückfallen, braucht z. B. der Tausch von Treppen gegen Treppen 40 Regeln für alle Facing-Kombinationen.
  - `block_rot` (`integrity`, zufälliges Entfernen) und `block_age` (`mossiness`)
  - `gravity`, `protected_blocks`, `capped`
  
  — [Minecraft Wiki: Processor list](https://minecraft.wiki/w/Processor_list)

**WorldEdit-Patterns (relevant, weil unser Export für WorldEdit ist)**
- Zufallsmuster: `//set stone,diorite,andesite,granite` (gleichverteilt) und `//set 50%red_wool,10%red_stained_glass`. Die Gewichte sind relativ und müssen sich nicht zu 100 summieren. `*oak_log` wählt zufällige Zustände (Random State Pattern). Außerdem gibt es Clipboard-Patterns und Block-Kategorie-Patterns. — [WorldEdit Docs: Patterns](https://worldedit.enginehub.org/en/latest/usage/general/patterns/)

**Arnis (OSM- und Höhendaten → Minecraft; Rust; aktiv, letzter Commit Okt. 2026)**
- Erzeugt Welten für Java (1.17+), Bedrock und Luanti aus OpenStreetMap- und Höhendaten. `--winter` bedeckt Boden, Dächer und Bäume mit Schnee und friert Gewässer ein. `--post-apocalyptic` erzeugt Verfall, Moos und Ranken. — [Arnis README](https://github.com/louis-e/arnis)
- Die Blockpalette wird über Farbe ausgewählt: kuratierte RGB-Werte pro Block, Abgleich im Oklab-Farbraum, Verwendungs-Flags `USE_MODEL`, `USE_WALL`, `USE_ROOF` und `USE_FACADE`. Wände und Dächer ziehen nur aus gefilterten Teilmengen, damit grelle Blöcke nicht auf prozeduralen Wänden landen. Es gibt eigene Funktionen `wall_block_for_color`, `roof_block_for_color` usw. — [Arnis `src/block_palette.rs`](https://github.com/louis-e/arnis/blob/main/src/block_palette.rs)
- Dachtypen als Enum: Gabled, Hipped, HalfHipped, Mansard, Skillion, Pyramidal, Dome, Onion u. a. Dazu kommen regionale „RoofHabit“-Wahrscheinlichkeiten: Chance auf ein Steildach für Häuser, Chance für niedrige Blockbebauung bis zu einer Höhe X, Anteil Walmdach. Beispiele: Japan (0,93 / 0,35 / 10 m / 0,4), Middle East (0,04 / 0 / 0 / 0,3), Australasia (0,97 / 0,7 / 13 m / 0,7). — [Arnis `src/element_processing/buildings.rs`](https://github.com/louis-e/arnis/blob/main/src/element_processing/buildings.rs)
- Deterministischer Zufall: ein ChaCha8-RNG, geseedet mit der OSM-Element-ID (optional mit Salt oder Koordinaten). „The same element always produces the same random values, regardless of processing order.“ — [Arnis `src/deterministic_rng.rs`](https://github.com/louis-e/arnis/blob/main/src/deterministic_rng.rs)
- Anti-Wiederholung: Ein unabhängiger Hash pro Gebäude führt bei einer Shortlist der Länge k mit Wahrscheinlichkeit 1/k zu identischen Nachbarn. Deshalb erfolgt die Wahl über ein Gitter in Weltkoordinaten (`cell_x + 2*cell_z`), das pro Patch rotiert wird. Damit unterscheiden sich Nachbarn systematisch, und das Ergebnis bleibt deterministisch. — [Arnis `src/building_facades/choose.rs`](https://github.com/louis-e/arnis/blob/main/src/building_facades/choose.rs)
- Fassadenplanung: Jedes Wandsegment wird klassifiziert (Straße, Rückseite, Brandwand, offen). Der Fensterrhythmus besteht aus Pfeilern, Wandstücken zwischen Fenstern und Fensterspalten pro Feld („bay“). Ecken werden „on a pier“ umrundet statt durchgehend verglast. Das Erdgeschoss erhält ein eigenes Ladenfront-Layout. — [Arnis `src/element_processing/building_facade.rs`](https://github.com/louis-e/arnis/blob/main/src/element_processing/building_facade.rs)

### Inferences
- Jigsaw-Pools sind im Kern bereits eine *gewichtete Komponentenbibliothek mit Anschlussregeln*. Unser Datenformat kann das Vokabular übernehmen (`weight`, `fallback`, `rigid`/`terrain_matching`, `processors`). Das hilft auch Nutzern, die Datapacks kennen.
- Der Zwang zu 40 Regeln für Treppen-Facings zeigt, warum ein eigener Generator Paletten auf der Ebene **Material + Form (block/stairs/slab/wall …)** führen sollte und nicht auf der Ebene konkreter Blockzustände. Die Zustände (facing, half, shape) setzt dann die Geometrie-Logik.
- Für Weihnachten direkt verwertbar: Die Snowy-Village-Logik (Schnee auf Vollblöcken mit Himmelssicht, Wasser → Eis) und Arnis’ `--winter` sind ein „Winter-Processor“ als Nachbearbeitungsschritt, unabhängig vom Stil.
- Arnis’ RoofHabit-Tabellen sind ein gutes Vorbild für **stilspezifische Prior-Wahrscheinlichkeiten**, die ein LLM nur noch leicht verschieben muss, statt sie zu erfinden.
- WorldEdit-Syntax (`50%a,10%b`) kann als menschenlesbare Kurzform für gewichtete Paletten in den Stildateien dienen und ließe sich auch direkt an Nutzer weitergeben.

### Gaps
- Zu „Towns and Towers“ und ähnlichen Struktur-Mods fand ich keine Primärdokumentation zur internen Stilkodierung. Die Suchergebnisse lieferten nur allgemeine Jigsaw-Mechanik und eine KI-generierte Mod-Zusammenfassung, die nicht verwertbar ist.
- WorldEdit-Brushes und Schematic-Generatoren-Plugins (z. B. goBrush, Arceon) wurden aus Zeitgründen nicht untersucht.

---

## 3. LLMs, die in Minecraft bauen (2023–2026): Was funktioniert, was scheitert, und ist „LLM wählt Parameter, deterministischer Generator setzt Blöcke“ die empfohlene Architektur?

### Takeaway
Die Literatur ist eindeutig: LLMs, auch Spitzenmodelle, sind schlecht darin, rohe Voxelkoordinaten oder Blueprint-Matrizen zu erzeugen. In T2BM sind selbst mit GPT-4 und verfeinertem Prompt nur 38 % der Gebäude vollständig und anforderungsgerecht. In MineAnyBuild erreicht GPT-4o 41 von 100 Punkten, und kleine Open-Source-Modelle schneiden deutlich schlechter ab. In MineCEraft (2026) liegt das beste Modell bei unter 40 %, Menschen bei 90 %. Erfolgreiche Systeme verlagern die Geometrie in Code bzw. einen prozeduralen Generator und lassen das LLM nur Struktur, Komponenten und Parameter wählen (3D-GPT, SceneX, BuildingBlock). Für ein 14B-Modell lokal ist „LLM wählt High-Level-Parameter, deterministischer Generator setzt Blöcke“ die klar empfohlene Architektur.

### Cited Findings

**Direkte Block- und Koordinatenausgabe durch LLMs**
- **T2BM** (Hu, Huang, Hu, Liu; arXiv Juni 2024; IEEE CoG 2024): Die Pipeline verfeinert zuerst den Prompt, dann erzeugt das LLM eine JSON-„Interlayer“ (Abschnitte mit Material und Start-/Endkoordinaten, funktionale Blöcke wie Türen mit Einzelposition), dann folgen eine Reparatur und die Platzierung über GDPC. Das Reparaturmodul ist nötig, weil LLMs Block-IDs falsch schreiben (CamelCase statt Unterstriche) oder Präfixe weglassen (z. B. `bed` statt `white_bed`). Anteil der Gebäude, die vollständig *und* anforderungsgerecht sind: GPT-3.5 steigt von 0,08 auf 0,22, GPT-4 von 0,12 auf 0,38 (Rohprompt → verfeinerter Prompt). GPT-4 erzeugt schon mit Rohprompt zu 80 % vollständige Hüllen. — [arXiv 2406.08751](https://arxiv.org/abs/2406.08751)
- **Madge & Poesio** (arXiv Feb. 2024), Builder-Aufgabe im IGLU-Stil mit JSON-Koordinaten: GPT-4 erreicht 37,6 %, GPT-3.5 34,4 %, die IGLU-Baseline 27,1 %, Llama2-70b 23,9 %, Llama2-13b 15,0 % und Vicuna-13b 6,3 %. „The smaller parameter models struggle to consistently adhere to the structured response format.“ — [arXiv 2402.08392](https://arxiv.org/abs/2402.08392). Einer Sekundärzusammenfassung eines Folge-Benchmarks zufolge „vergessen“ LLMs häufig eine Achse oder verwechseln Richtungen. — [PromptLayer-Zusammenfassung](https://www.promptlayer.com/research-papers/a-llm-benchmark-based-on-the-minecraft-builder-dialog-agent-task) (nicht im Original geprüft)
- **MineAnyBuild** (arXiv Mai 2025; NeurIPS 2025): 4.000 Aufgaben zur räumlichen Planung, die Agenten geben ausführbare Blueprint-Matrizen aus. Gesamtscore: GPT-4o 41,02, Claude-3.7-Sonnet 40,70, Qwen2.5VL-7B 23,30, InternVL2.5-8B 19,24, Qwen2.5VL-3B 17,88. „Open-source models generally have poor capabilities to generate executable spatial plan.“ Als Fehlerursachen nennen die Autoren „Spatial Misunderstanding“ und „Implementation Gap“, also die Unfähigkeit, Textpläne in präzise Matrizen zu übersetzen („incorrect block indexing, orientation errors“). Gemini-1.5-Flash lieferte teils Matrizen mit mehr als 3 Dimensionen. — [arXiv 2505.20148](https://arxiv.org/abs/2505.20148)
- **MineCEraft** (Lee et al., arXiv Aug. 2026): 723 Bauaufgaben, von Experten formuliert und regelbasiert geprüft. Gesamtgenauigkeit: gpt-5-mini 39,6 %, gemini-3-pro 38,3 %, claude-4.5-sonnet 26,6 %, llama-4-17b-16e 0,4 %. Menschen erreichen 90 % auf MineCEraft-Lite. LLM-Agenten scheitern häufig an Stabilität und schwebenden Blöcken. Lässt sich eine Aufgabe jedoch auf eine formelgetriebene Optimierung reduzieren, etwa die maximale Fläche mit 56 Planken, schlagen LLMs teilweise die Menschen. Ein Bogen als ASCII-Text gerät „irregular or structurally incorrect“, obwohl dasselbe Modell ihn als Bild korrekt zeichnen kann. — [arXiv 2608.28884](https://arxiv.org/abs/2608.28884)

**Code als Zwischenrepräsentation, Gedächtnis, Reflexion**
- **APT** (Chen & Gao, arXiv Nov. 2024): GPT-4o arbeitet mit Chain-of-Thought. Zuerst entsteht eine Layout-Synopse (Komponenten, Positionen, Maße, Bauablauf), danach **Python-Code**, der den Blueprint erzeugt („You do not need to manually define every block’s coordinates“). Dazu kommen ein RAG-Gedächtnis früherer Blueprints und Selbstreflexion anhand von Screenshots. Die Scores sind VLM-bewertet: 97,8 % für ein einfaches Holzhaus, 81,4 % für eine zweistöckige Villa. Das Gedächtnismodul verbessert die Leistung signifikant. GPT-3.5 scheitert an komplexen Layouts. Aus Referenzbildern übernimmt der Agent nur Materialien, aber nicht die 3D-Struktur. — [arXiv 2411.17255](https://arxiv.org/abs/2411.17255)
- **Voyager** (Wang et al., arXiv Mai 2023): GPT-4 nutzt *ausführbaren Code* als Aktionsraum, eine wachsende Skill-Bibliothek und iteratives Prompting mit Ausführungsfehlern und Selbstverifikation. Laut Abstract „bypasses the need for model parameter fine-tuning“. — [arXiv 2305.16291](https://arxiv.org/abs/2305.16291)

**LLM steuert prozedurale Generatoren (die Zielarchitektur)**
- **3D-GPT** (arXiv Okt. 2023): Die prozedurale Engine wird als Menge von Funktionen F_j mit Parametern P_j aufgefasst. Das LLM wählt eine Teilmenge der Funktionen und inferiert deren Parameter (für Infinigen/Blender). Jede Funktion ist mit Zweck und Parametern (D_j) sowie den benötigten Kontextinformationen (I_j) dokumentiert. Das System ist trainingsfrei. — [arXiv 2310.12945](https://arxiv.org/abs/2310.12945)
- **SceneX** (arXiv März 2024): „PCGHub“ ist eine Sammlung prozeduraler Assets mit tausenden handgeschriebenen API-Dokumenten als Protokoll. Der „PCGPlanner“ erzeugt daraus ausführbare Aktionen für Blender, für Natur- und Stadtszenen und Szenen-Edits wie einen Jahreszeitenwechsel. — [arXiv 2403.15698](https://arxiv.org/abs/2403.15698)
- **BuildingBlock** (Huang et al., SIGGRAPH 2025): Ein Diffusionsmodell erzeugt grobe Box-Layouts. LLMs erweitern diese „into rule-based hierarchical designs, seamlessly incorporating component styles“. Die Blöcke bzw. Geometrie platziert danach PCG. — [arXiv 2505.04051](https://arxiv.org/abs/2505.04051)
- **Word2Minecraft** (arXiv März 2025): Das LLM übersetzt eine strukturierte Story in Spielziele, Kartenelemente und Skalierung, wobei es „in every stage“ beteiligt ist. GPT-4o-mini erreichte eine höhere Spielbarkeit (0,87) als GPT-4-Turbo (0,82), das aggressiver skaliert und dadurch Wege blockiert. — [arXiv 2503.16536](https://arxiv.org/abs/2503.16536)

**Generative Voxelmodelle (Alternative zu LLMs)**
- **Scaffold Diffusion** (arXiv Aug. 2025; NeurIPS-2025-Workshop): Ein diskretes Diffusions-Sprachmodell behandelt Voxel als Tokens und wurde auf Minecraft-Häusern aus dem 3D-Craft-Datensatz trainiert. Es bleibt kohärent bei über 98 % Sparsität. Forschungsstand, kein Werkzeug mit Stil- oder Paletten-Steuerung. — [arXiv 2509.00062](https://arxiv.org/abs/2509.00062)

**LLMs in GDMC**
- In GDMC habe ich LLMs nur für Narrativ und Story gefunden (MGAIA Leiden). — [MGAIA README](https://github.com/ScholliYT/MGAIA-Minecraft-GDMC). Seit 2025 erlauben die Regeln externe KI-Aufrufe ausdrücklich. — [GDMC 2025](https://gendesignmc.wikidot.com/wiki:2025-settlement-generation-competition)

### Inferences
- Ein 14B-Modell liegt in der Größenklasse, die in MineAnyBuild (7–8B-VLMs, rund 20–23/100) und bei Madge (13B: 6–15 %) bei Koordinaten- und Matrixausgabe klar versagt. Ein lokales Modell sollte deshalb **keine Koordinaten, keine Blocklisten und keine Blockzustände** ausgeben, sondern nur Auswahlentscheidungen aus einem Katalog (Stil-ID, Dachtyp, Etagenzahl, Breite und Tiefe als Ganzzahlen in engen Grenzen, Dekor-Flags, Farbakzente).
- Das MineCEraft-Ergebnis (formelgetriebene Probleme lösen LLMs gut, Geometrie in Textform schlecht) stützt die Arbeitsteilung: Das LLM übernimmt Semantik und Abwägung, der Generator Geometrie, Statik, Symmetrie und Blockzustände.
- Das T2BM-Reparaturmodul ist ein Symptom freier ID-Ausgabe. Mit Enum-Listen gültiger Stil- und Palette-IDs im JSON-Schema entfällt diese ganze Fehlerklasse.
- APT zeigt den Wert von „Gedächtnis“ bzw. Few-Shot-Retrieval: gute frühere Pläne als Beispiele im Prompt. Bei einem Katalog-Ansatz entspricht das 2–4 kuratierten Beispielplänen pro Stil.
- 3D-GPT und SceneX liefern das Prompt-Muster: Für jede Generatorfunktion bzw. jeden Parameter gibt es eine kurze Doku (Zweck, Wertebereich, Wirkung) plus den Hinweis, welche Kontextinformation ihn bestimmt. Unsere Stil-Bibliothek sollte daher maschinenlesbare Beschreibungen *für das LLM* enthalten, nicht nur Daten für den Generator.

### Gaps
- Ich fand keine Studie, die genau „LLM wählt Parameter für einen Minecraft-Gebäudegenerator“ mit kleinen lokalen Modellen quantitativ evaluiert. Die Empfehlung beruht auf Analogien (3D-GPT, SceneX, BuildingBlock) und den Negativbefunden zur direkten Voxel-Ausgabe.
- „BuilderBench“ als eigenständiger Benchmark wurde nicht gefunden. Gefunden wurden die verwandten MineAnyBuild, MineCEraft und MineCollab (zitiert in MineCEraft). „Talking-to-Build“ (arXiv 2507.20300, Nutzerstudie zu einem GPT-4-Co-Builder) kenne ich nur aus Suchsnippets.
- MineDojo wurde nicht separat untersucht. Es ist primär eine Agenten- und Aufgaben-Plattform und kein Gebäudegenerator.

---

## 4. Gebäudewissen als Daten: Stil-Presets, gewichtete Paletten, Komponentenbibliotheken, Regeln; Variation bei gleichzeitiger Kohärenz

### Takeaway
Das ausgereifteste offene Vorbild ist das Material- und Palettensystem von Grimoire/Tome (GDMC 2024/2025). Prefab-Blöcke tragen **Rollen** (primary_wall, primary_roof, wood_pillar …) statt fester Blöcke. **Paletten** ordnen den Rollen **Materialien** zu, und Materialien liefern pro **Form** (block, stairs, slab, wall …) gewichtete Blöcke sowie **Verbindungen** (heller/dunkler, verwitterter, feuchter). Paletten werden hierarchisch verengt: Siedlung → Bezirk → Haus. Kohärenz entsteht durch einen Stil pro Siedlung und Regeln wie „ein Motiv pro Wand“. Variation entsteht durch geseedeten, gewichteten Zufall, Rauschen und deterministische Anti-Wiederholung.

### Cited Findings

**Grimoire-Designnotiz „Materials System“ (SWMG, 2024)**
- Jeder Block eines Prefabs wird einer *Funktion* (Rolle) zugeordnet. Der „Palette Swap“ tauscht Materialien und behält die Funktionen. Beispiel: Eine Wand aus 6 Blocktypen hat 4 Funktionen, Bruchstein und Bruchsteintreppe sind dieselbe Funktion. — [Grimoire: Materials System.md](https://github.com/Jandhi/grimoire/blob/main/docs/Notes/Jan's%20Notes/Materials%20System.md)
- Liste der Mindestrollen: Primary Wall, Secondary Wall (Deko), Frame, Wood (Türen usw.), Floor, Primary Roof, Secondary Roof. — [ebd.](https://github.com/Jandhi/grimoire/blob/main/docs/Notes/Jan's%20Notes/Materials%20System.md)
- Paletten werden generativ statt von Hand erzeugt: Die Liste möglicher Materialien wird pro Bezirk und dann pro Haus enger. Beispiel: Die Siedlung mischt Birke, Eiche und Bruchstein, ein ärmerer Bezirk nur Birke und Eiche, ein einzelnes Haus nur Eiche. — [ebd.](https://github.com/Jandhi/grimoire/blob/main/docs/Notes/Jan's%20Notes/Materials%20System.md)
- „Mapping Problem“: Manche Formen existieren nicht für jedes Material. Es gibt keine Stein-Falltür, und Wolle hat keine Treppen oder Stufen. In solchen Fällen fällt die Rolle auf eine andere zurück, z. B. auf Holz. — [ebd.](https://github.com/Jandhi/grimoire/blob/main/docs/Notes/Jan's%20Notes/Materials%20System.md)
- Textur: Blocktypen werden über eine Rauschfunktion (z. B. Perlin) gemischt statt in Prefabs fest eingebaut, weil sich sonst Muster sichtbar wiederholen. Schattierung: nach oben heller, kombiniert mit Rauschen statt als glatter Verlauf (Vorbild WesterosCraft). Verwitterung: Alter (stone_bricks → cracked → cobblestone → gravel, auch Block → Treppe → Stufe) und Feuchte (moosige Varianten nahe Wasser). Materialparameter sind Form, Rauschkoordinaten, Höhe, Alter, Feuchte und Schattierung (0 = dunkel, 1 = hell). — [ebd.](https://github.com/Jandhi/grimoire/blob/main/docs/Notes/Jan's%20Notes/Materials%20System.md)
- Ältere Notiz „Token Palettes“: Eine Palette ist ein Entscheidungsbaum aus Material-, Textur- und Feature-Tokens mit Bedingungen. Findet sich kein Block, wird ein Structure Block als sichtbarer Fehlermarker gesetzt. — [Grimoire: Token Palettes.md](https://github.com/Jandhi/grimoire/tree/main/docs/Notes)

**Umsetzung in TOME (Rust, JSON-Daten)**
- Das Enum `MaterialRole` umfasst accent, primary_wall, secondary_wall, primary_roof, secondary_roof, wood_pillar, stone_pillar, primary_stone, secondary_stone, primary_wood, secondary_wood, flower, ground_floor und upper_floor. Dazu gibt es eine `backup_role()`-Fallback-Kette, z. B. PrimaryWall → PrimaryStone und UpperFloor → GroundFloor → PrimaryWood, mit höchstens 5 Iterationen. — [Tome `materials/role.rs`, `palette.rs`](https://github.com/Jandhi/Tome)
- Beispiel-Palette `medieval_spruce.json`: primary_wall white_wool, primary_roof polished_blackstone_bricks, primary_wood spruce_planks, wood_pillar spruce_log, primary_stone stone_bricks, secondary_stone cobblestone, primary_color red, secondary_color white, flower medieval_flowers. Die Paletten liegen in Ordnern nach Kultur (medieval, desert, japanese) sowie als reine Dach-Paletten (z. B. `acacia_wood_roof`) und Akzent-Paletten (Terrakotta-Farben). — [Tome `data/palettes`](https://github.com/Jandhi/Tome)
- Ein Material-JSON definiert pro Form einen Block (`block`, `stairs`, `slab`, `wall`, `pressure_plate`, `button`, `chiseled`) und `connections` (z. B. polished_deepslate: lighter → polished_andesite, darker → polished_blackstone). Laut Doku sind die Verbindungsachsen Shade, Wear, Moisture und Decoration. Es gibt gewichtete Mehrfachblöcke (cobblestone 0,7 / mossy_cobblestone 0,3) und einen Rückfall auf die volle Blockform, wenn eine Form fehlt. — [Tome `data/materials`, `docs/materials.md`](https://github.com/Jandhi/Tome)
- Paletten können pro Gebäude zusätzlich ein Banner-Muster tragen (Heraldik einer Familie über alle ihre Gebäude). — [Tome `materials/palette.rs`](https://github.com/Jandhi/Tome)
- Laut Doku gibt es Gebäude-Templates als JSON (`min_size`, `max_size`, `floors`, `roof_type`, `required_features`) und „Building Sets“ mit Gewichten für biom- und stilspezifische Auswahl. *Wie weit das genau so umgesetzt ist, habe ich nicht geprüft.* — [Tome `docs/buildings.md`](https://github.com/Jandhi/Tome)

**Weitere Datenmuster**
- Vanilla: gewichtete Pools (1–150) plus Processor-Listen als „Stilfilter“ (Verfall, Moos, Regeln). — [Template pool](https://minecraft.wiki/w/Template_pool), [Processor list](https://minecraft.wiki/w/Processor_list)
- Arnis: Blöcke mit Verwendungs-Flags (Wand/Dach/Fassade), regionale Wahrscheinlichkeitstabellen für Dachformen, per Element-ID geseedeter RNG und gitterbasierte Anti-Wiederholung zwischen Nachbarn. — [Arnis Quellcode](https://github.com/louis-e/arnis)
- WFC-Komponentenbibliotheken (Niels-NTG, MGAIA): Strukturen plus Nachbarschaftsregeln inklusive Rotation. Schwäche: Seltene, attraktive Module kommen kaum vor. Abhilfe: Zellen vorab festlegen. — [Niels-NTG/GDMC2024](https://github.com/Niels-NTG/GDMC2024), [MGAIA](https://github.com/ScholliYT/MGAIA-Minecraft-GDMC)
- Kohärenzregeln aus Tome: eine Kultur pro Siedlung, gewählt aus der Biomkarte; nur ein Fachwerkmotiv pro Wand; Detaildichte nach Größenklasse; Kandidatenlayouts werden bewertet und gewichtet gezogen. — [Tome](https://github.com/Jandhi/Tome)
- Determinismus: Frightful Hobgoblin ist „pseudorandom but deterministic (useful for debugging)“. Arnis sichert Reproduzierbarkeit über den Seed pro Element. — [Hobgoblin](https://github.com/SpecificProtagonist/frightful_hobgoblin), [Arnis](https://github.com/louis-e/arnis/blob/main/src/deterministic_rng.rs)
- Aus der GDMC-Bewertung: Ästhetik heißt Konsistenz, angemessene Variation, Proportion und visuelle Balance sowie keine „jarring, strange artefacts that procedural design generates that would never be made by a human“. — [GDMC Evaluation](https://gendesignmc.wikidot.com/wiki:evaluation)

### Inferences
Vorgeschlagenes Datenmodell für den TS-Generator, abgeleitet aus den Befunden oben:
- **`materials/*.json`**: ID → Formen (`block`, `stairs`, `slab`, `wall`, `fence`, `trapdoor`, `door` …, jeweils mit gewichteter Liste) und `connections` (lighter/darker/worn/mossy/snowy). Die Schnee-Achse ist für Weihnachten nützlich, z. B. Dachblock → schneebedeckte Variante oder `snow`-Layer obenauf.
- **`palettes/*.json`**: Rolle → Material-ID, mit einer festen Rollenliste wie in Tome, einer Fallback-Kette und Akzentfarben (für Banner, Wolle, Kerzen, Lichterketten aus farbigen Blöcken).
- **`components/`**: Dachkomponenten pro Stil (side/corner/inner/upper_*, ridge, gable_end), Fenster-Templates (1×1, 1×2, 2×2, mit Laden, Blumenkasten), Türportale, Kamine und Gauben. Komponenten referenzieren nur Rollen, nie konkrete Blöcke.
- **`styles/*.json`**: ein Stil-Preset bündelt erlaubte Paletten (gewichtet), Dachtyp-Prior (wie Arnis’ RoofHabit), Proportionsregeln (Stockwerkshöhe, Dachneigung, Überhang, ungerade Breiten), Detail-Dichte nach Größenklasse, Pflicht- und optionale Features sowie eine **LLM-Beschreibung** (1–2 Sätze, Stimmungswörter, wann passend). Letzteres folgt dem 3D-GPT/SceneX-Muster.
- **Hierarchischer Seed**: Projekt-Seed → Siedlung/Stil → Gebäude (Seed = Hash aus Projekt-Seed und Gebäude-ID) → Bauteil. Dadurch ist jedes Ergebnis reproduzierbar und einzelne Gebäude lassen sich neu würfeln, ohne die übrigen zu verändern.
- **Kohärenz vor Variation**: Ein Stil pro Ensemble, hierarchische Paletten-Verengung wie bei Grimoire, Symmetrie standardmäßig an (ungerade Breite, mittige Tür), Variation nur über erlaubte Achsen (Palettenwahl innerhalb des Stils, Größenklasse, Detaildichte, Rauschen in Materialien) und Nachbar-Anti-Wiederholung nach Arnis-Art.
- Processor-artige Nachbearbeitung als eigene Datenschicht: „winterize“ (Schnee auf Oberflächen mit Himmelssicht, Eis statt Wasser), „age“ (Moos/Risse) und „festive“ (Lichter und Girlanden an Traufkanten).

### Gaps
- Wie stark einzelne Regeln (Symmetrie, Überhang, Rauschtextur) das Juryurteil beeinflussen, ist nicht empirisch belegt. Es gibt nur Gesamtscores, keine Ablationen.
- Ein konsolidiertes, öffentlich wiederverwendbares Paletten-Datenset für 1.21.x (alle Blockfamilien mit Formen) habe ich nicht gefunden. Die Tome-Daten sind ein Ausgangspunkt, die Lizenz ist vor Übernahme zu prüfen.

---

## 5. Fine-Tuning eines kleinen lokalen Modells oder Prompt Engineering mit Stilkatalog und Few-Shot? Wie zuverlässig ist Ollama Structured Output mit 8–14B-Modellen?

### Takeaway
Für reine Auswahl- und Parameterentscheidungen aus einem Katalog ist Fine-Tuning anfangs nicht sinnvoll. Die Belege sprechen für trainingsfreie Ansätze: Ollamas JSON-Schema-Constraint im Feld `format`, Enums und Wertebereiche im Schema, das Schema zusätzlich im Prompt, Few-Shot-Beispiele, `temperature` 0 bzw. niedrig, Validierung mit Zod und Retry/Repair. Grammatik-Constraints garantieren syntaktisch gültiges JSON, können aber die Qualität des Reasonings senken und Latenz kosten. Deshalb sollte man das Schema flach halten und das Nachdenken, etwa im Qwen3-Thinking-Modus, von der strukturierten Antwort trennen. Zu Qwen3 mit `format` plus `think` gibt es gemeldete Ollama-Fehler, also muss man die konkrete Version testen.

### Cited Findings

**Ollama Structured Outputs**
- Seit dem 6. Dezember 2024 unterstützt Ollama Structured Outputs, die die Modellausgabe auf ein JSON-Schema beschränken. Laut Ollama ist das zuverlässiger als der reine JSON-Modus. Tipps des Herstellers: Pydantic oder Zod für das Schema nutzen, „return as JSON“ in den Prompt schreiben und die Temperatur auf 0 setzen. — [Ollama Blog: Structured outputs](https://ollama.com/blog/structured-outputs)
- Laut aktueller Doku wird das JSON-Schema im Feld `format` übergeben, und es ist ideal, es *zusätzlich* als String in den Prompt zu schreiben. Validiert wird z. B. mit `z.toJSONSchema(...)` beim Senden und `Schema.parse(JSON.parse(...))` beim Empfang. „Ollama’s cloud currently does not support structured outputs“, was lokal irrelevant ist. — [Ollama Docs: Structured Outputs](https://docs.ollama.com/capabilities/structured-outputs)
- Technisch wandelt Ollama das Schema in eine GBNF-Grammatik für llama.cpp um (grammatikbasiertes Decoding). — laut Sekundärquelle [insiderllm.com](https://insiderllm.com/guides/structured-output-local-llms/), nicht in der Ollama-Doku verifiziert
- Thinking: Bei Modellen mit Reasoning-Fähigkeit liefert Ollama `message.thinking` getrennt von `message.content`. Das Feld `think` akzeptiert true/false oder Stufen, und `/api/show` zeigt, welche Thinking-Optionen ein Modell unterstützt. — [Ollama Docs: Thinking](https://docs.ollama.com/capabilities/thinking)
- Qwen3 (29.04.2025) hat hybride Thinking- und Non-Thinking-Modi, dazu Soft-Switches `/think` und `/no_think` in Prompt oder System-Nachricht. Qwen3-14B hat 128K Kontext. — [Qwen3 Blog](https://qwenlm.github.io/blog/qwen3/)
- Gemeldete Probleme, nur über Suchzusammenfassungen und nicht im Original geprüft:
  - [ollama#14645](https://github.com/ollama/ollama/issues/14645): Ollama 0.17.6 mit qwen3.5:35b-a3b ignorierte `format`, wenn Thinking aus war. Ursache laut Reporter: Das Chat-Template schließt den Think-Tag bereits, sodass das Constrained Decoding nie greift.
  - [ollama-python#597](https://github.com/ollama/ollama-python/issues/597): Mit qwen3:32b landete die Antwort im `thinking`-Feld, und `response` war leer.

**Zuverlässigkeit kleiner Modelle bei strukturierter Ausgabe**
- arXiv 2605.02363 (Mai 2026) testete Llama 3.1-8B, Gemma 2-9B und Qwen 2.5-7B mit einem JSON-Vertrag:
  - Ohne Systemprompt erreichte kein Modell gültiges JSON (0 % Output-Accuracy), obwohl die Aufgabengenauigkeit bis zu 85 % betrug.
  - Gemma (und GPT-4o) verpackten JSON systematisch in Markdown-Fences.
  - Constrained Decoding erzwingt gültige Syntax, kostet aber 3,6–8,2× Latenz und „in several settings degrades task performance substantially“.
  - Iterativ optimierte Systemprompts erreichten ohne Fine-Tuning 84–87 % auf GSM8K.
  
  — [arXiv 2605.02363](https://arxiv.org/abs/2605.02363)
- „Let Me Speak Freely?“ (Aug. 2024): Formatbeschränkungen verschlechtern das Reasoning deutlich, und je strikter das Format, desto stärker der Effekt. — [arXiv 2408.02442](https://arxiv.org/abs/2408.02442)
- JSONSchemaBench (Jan. 2025): 10.000 reale Schemata im Vergleich von Guidance, Outlines, llama.cpp, XGrammar, OpenAI und Gemini. Wie viele Schema-Features unterstützt werden und wie hoch die Ausgabequalität ist, schwankt je Framework. Komplexe Schema-Konstrukte werden also nicht überall gleich gut erzwungen. — [arXiv 2501.10868](https://arxiv.org/abs/2501.10868)
- Kleinere Modelle (13B) halten strukturierte Antwortformate schlechter ein (Madge & Poesio 2024, siehe Abschnitt 3). — [arXiv 2402.08392](https://arxiv.org/abs/2402.08392)
- Aus einer Medium-Evaluation (nicht geprüft, laut Suchzusammenfassung): Schema-Constraints seien „a big improvement“, aber sehr kleine Modelle wie Llama3.2 3B scheiterten an allem außer sehr einfachen Schemata. — [Medium/docherty](https://medium.com/@docherty/mastering-structured-output-in-llms-choosing-the-right-model-for-json-output-with-langchain-be29fb6f6675)

**Prompting und Gedächtnis statt Training (aus der Minecraft-Literatur)**
- T2BM: Allein die Prompt-Verfeinerung durch ein LLM, also eine kurze Nutzereingabe zu einer detaillierten Beschreibung ausgebaut, steigert die Erfolgsquote deutlich, z. B. 0,12 → 0,38 bei GPT-4. Kleinere Modelle sind laut den Autoren „more sensitive to the quality of input“. — [arXiv 2406.08751](https://arxiv.org/abs/2406.08751)
- APT: RAG über frühere Blueprints (dynamisches Few-Shot) verbessert die Leistung signifikant. Fine-Tuning nennen die Autoren nur als mögliche Zukunftsarbeit für die Bild→Layout-Schwäche. — [arXiv 2411.17255](https://arxiv.org/abs/2411.17255)
- 3D-GPT und Voyager sind ausdrücklich trainingsfrei: Funktionsdokumentation, Skill-Bibliothek und iteratives Feedback statt Fine-Tuning. — [arXiv 2310.12945](https://arxiv.org/abs/2310.12945), [arXiv 2305.16291](https://arxiv.org/abs/2305.16291)
- Falls doch feinabgestimmt wird: Ollama importiert Modelle aus Safetensors-Gewichten oder GGUF per Modelfile (`FROM …`). GGUF muss vorher mit llama.cpp quantisiert werden. — [Ollama Docs: Import](https://docs.ollama.com/import)

### Inferences
Empfohlene Planungsschnittstelle, abgeleitet aus den Befunden:
- **Kein Fine-Tuning im ersten Schritt.** Die Aufgabe ist Klassifikation bzw. Auswahl aus einem kleinen, sich ändernden Katalog. Jede neue Stil-ID würde ein Retraining erfordern, während Prompt plus Katalog sofort funktionieren. Fine-Tuning, z. B. per LoRA mit Import als GGUF, lohnt sich erst, wenn Logs systematische Fehler zeigen, die Prompting nicht behebt, und genug geprüfte Beispielpaare (Wunschtext → Plan) vorliegen. Dafür fand ich keine Zahl.
- **Schema-Design für 8–14B**:
  - Flach und kurz halten, Stil-, Paletten- und Dach-IDs als `enum` aus dem aktuellen Katalog dynamisch ins Schema einsetzen.
  - Zahlen als Integer mit `minimum` und `maximum`, Booleans für Features.
  - Keine Koordinaten, keine Block-IDs als freie Strings.
  - Alle Felder `required`, damit nichts fehlt. Weil JSONSchemaBench Lücken bei der Feature-Abdeckung zeigt, besser auf exotische Schema-Konstrukte (`oneOf`, `pattern`) verzichten.
- **Reasoning vom Format trennen**, weil Formatzwänge das Reasoning schwächen (Let Me Speak Freely, 2605.02363). Option A: ein `rationale`-Feld als *erstes* Feld im Schema, kurz gehalten. Option B: Qwen3 im Thinking-Modus nachdenken lassen und `format` für `content` nutzen. Wegen der gemeldeten Ollama-Bugs mit `think` plus `format` muss man die konkrete Ollama-Version testen und einen Fallback einbauen (zweiter Aufruf mit `think:false` und Schema).
- **Pflicht-Validierung im Generator**: Zod-Parse, IDs gegen den Katalog prüfen, Werte clampen, bei Fehlern einmal mit Fehlermeldung retryen (Muster aus Voyager und T2BM-Reparatur), danach ein deterministischer Default-Plan. Der Generator darf sich nie auf die Plausibilität der LLM-Werte verlassen. Statik, Symmetrie und Proportionen erzwingt er selbst.
- **Few-Shot**: 2–4 kuratierte Beispielpläne (Nutzerwunsch → JSON) passend zum Thema in den Prompt, bei großem Katalog per einfacher Stichwortsuche ausgewählt (APT-Gedächtnis-Analogie). Die Stilbeschreibungen aus dem Katalog dienen als „Funktionsdoku“ (3D-GPT-Muster).
- **Determinismus**: `temperature` 0 (Ollama-Empfehlung) für reproduzierbare Pläne. Für Varianten lieber mehrere Seeds im *Generator* nutzen statt hoher LLM-Temperatur.
- Optional ist eine **zweistufige Planung** wie in T2BM: zuerst eine Freitext-Verfeinerung (Stimmung, Elemente), dann der strukturierte Plan. Das kostet einen zweiten Aufruf, hat aber in T2BM die Erfolgsquote stark erhöht.

### Gaps
- Für qwen3:14b über Ollama fand ich keine belastbaren, öffentlich dokumentierten Messwerte zur Schema-Treue oder zur Qualität der Parameterwahl. Das muss mit einem eigenen kleinen Testset gemessen werden (z. B. 50 Wunschtexte → Validierungsrate, Retry-Rate, manuelle Bewertung).
- Ob Ollamas `format` bei Qwen3 *mit* aktiviertem Thinking in der aktuellen Version (Okt. 2026) zuverlässig greift, bleibt offen. Die Issue-Lage ist nur aus Suchzusammenfassungen bekannt, die GitHub-Seiten waren in dieser Umgebung nicht abrufbar.
- Eine direkte Vergleichsstudie „Fine-Tuning vs. Few-Shot“ für Parameterwahl in PCG-Generatoren mit 7–14B-Modellen habe ich nicht gefunden.
