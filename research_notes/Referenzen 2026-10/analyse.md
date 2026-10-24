# Lücken-Analyse: Referenzbilder gegen Ist-Stand (Stand 2026-10-24)

Grundlage: die 18 Referenzbilder des Creative Directors (liegen nicht im Repo, fremde Werke), die 20 Rechercheberichte in `research_notes/Bauqualitaet 2026-10/`, der Code auf `feature/openrouter-gui` (`cbef59e`) und Iso-Renders aller Stile (klein, mittel, groß × Seed 1–2, ohne Thema; mittel mit Weihnachten). Zahlen aus dem neuen Kennzahlen-Modul `src/core/analysis/buildQuality.ts` (Phase 1), gemessen über 8 Stile × 3 Größen × 3 Seeds.

## Was die Referenzen gemeinsam haben und wo wir stehen

| Leitlinie (Auftrag) | Referenz | Ist-Stand (gemessen/gesehen) |
|---|---|---|
| Kaskade statt Kiste | 19098029: Hauptbau + Querflügel mit eigenem, niedrigerem Dach; 19664420: Kapelle + Turm + Vordach | Ab „mittel“ in 6 von 8 Stilen **eine einzige Masse** (Kennzahl `masses` = 1). Flügel nur hinten oder bei „huge“, Zwerchgiebel nur bei „verwinkelt“, Anbau nur bei asymmetrischen Stilen. Nur Modern (zweiter Kubus) und teils Fantasy/Rustikal haben zwei Massen. |
| Dreiteilung Sockel – Wand – Dach, Dach 45–55 % | alle | Dachanteil gut im Band (0,38–0,53 bei den Steildach-Stilen). Sockel meist nur 1 Lage, dünn. |
| Tiefe überall, Glas zurückgesetzt | 19098029 (Rahmen, Sims, Laden), 20102835 (große gerahmte Fenster) | Hauptfassaden haben fast immer nur **2 Tiefenebenen** (0 und +1); 67 von 72 Häusern verfehlen „≥ 3“. Glas und Türen sitzen in der Wandebene (Ebene −1 fehlt ganz). Blumenkästen und Läden hängen nur an einzelnen Fenstervorlagen; die Stilwerte `shutters`/`flowerBoxes` werden nie gelesen. |
| Dachkanten mit Schwung | 19098029/30 (ausgestellte Ortgänge, Treppenstufen), 18791820 (geschwungen), 19864998 (hochgezogene Ecken) | Ortgang als einspaltiges Brett, gerade. Keine hochgezogenen Firstspitzen (nur Japanisch: ein Treppenstein), keine aufgebogenen Ecken, Pagode wird als Walmdach gebaut. Dachmischung (dunkle Streifen) vorhanden. |
| Türme mit gestaffelter Haube | 19664420/21 (mehrstufige Holzhaube), 18791820 (Hexenhut) | Eckturm 5×5 mit Pyramide oder Rundturm mit Kegel – nur auf ausdrücklichen Wunsch; keine mehrstufige Haube, kein automatischer Turm. |
| Licht als Gestaltung | 19098029 (Laterne an jeder Traufecke), 19864998 (Laternen an allen Dachecken), 17413756 (warme Fenster) | Laterne am Eingang und Innenlicht hinter allen Fenstern: gut (100 %). **Traufecken unbeleuchtet** (63 von 72 Häusern), nur bei „viele Laternen“ an zwei Ecken. |
| Leben und Grün | 19098029 (hohes Gras, Blumen, Fässer, Truhen, Ranken am Kamin), 17413756 (Hecken am Sockel) | Garten mit Beeten, Bäumen, Wegen, Lampenpfählen gut. Am Haus selbst kaum Grün: keine Büsche am Sockel, keine Ranken; Requisiten nur verstreut im Garten. |
| Keine Rückseite | (alle Bilder sind Schauseiten, aber 19098029/30 zeigen zwei Seiten gleichwertig) | Rückseite erreicht im Mittel nur **0,25–0,6** der Frontpunkte (Ziel ≥ 0,5); keine Hintertür, Gauben/Balkon/Veranda nur vorn. |
| Grundstück | 20102835 (Terrassenkante mit Erdböschung, eigene Bäume) | Flaches Grasquadrat mit unregelmäßigem Rand; keine Böschung, Fundament endet auf Bodenhöhe (schwebt auf unebenem Gelände). |
| Begrenzte Palette | alle: 3–4 Hauptmaterialien | Meist 7–8 Materialien ≥ 3 % der Hülle (Glas, Kamin, Sockel, Rahmen, Balken, Dachkante …); dominantes Material 21–39 % – ruhig genug, aber eher zu viele Nebenmaterialien. |

## Je Stil

**Mittelalter** (Ref. 19098029/30, 20242880, 19921689/93). Stark: Fachwerk-OG mit Auskragung und Konsolen, steiles Dach, Fachwerkgiebel mit Firstständer und Kehlbalken, Gauben. Fehlt: Querflügel bzw. Zwerchgiebel als Blickfang über der Tür (nur bei „verwinkelt“), der Archetyp „schmales Stadthaus mit Spitzgiebel und Anbau“, ausgestellte Ortgänge, Blumenkasten unter jedem Fenster, Laternen an den Traufecken, Grün am Sockel. Glas bündig, Hauptfassade 2 Ebenen.

**Rustikal** (Ref. 19098029/30, 20102835/37, 17413756/57, 19664420/21). Stark: liegende Stammlagen mit Kreuzecken, Steinkamin, Veranda, Pultdach-Anbau (wenn asymmetrisch gewürfelt). Fehlt: Stein-EG mit Holz-OG und Balkon als feste Form, Blockhütte mit Vordach, Kapelle/Scheune mit Turm und mehrstufiger Haube, großes Kreuzbalken-Motiv im Giebel, Eingangsbänke, Terrassenkante. Veranda auf Zaunpfosten wirkt dünn.

**Fantasy** (Ref. 18791820, 20226962, 20200983). Stark: Glocken- und Steildächer, Fachwerk, runde Fenster als Vorlage. Fehlt: automatischer schiefer Hexenhut-Turm, organische Krümmung (durchhängender First, hochgezogene Spitzen), lebendes Moos-/Azaleendach, runde Öffnungen mit Ringrahmen an der Tür, Pflanzkästen, Laternen an Auslegern. Fantasy ist heute ein Fachwerkhaus mit anderem Dachprofil.

**Nordisch** (keine eigene Referenz; Berichte 10). Stark: Langhaus-Proportionen, hoher Sockel, großer Überstand, Firstbalken, gekreuzte Windbretter. Fehlt: Anbau, versetzte überdachte Eingänge, Blockhaus-Variante; nur eine Masse.

**Japanisch / Kirschblüte** (Ref. 19864998/19865000). Stark: Irimoya als Höhenfeld, Shoji, erhöhter Sockel. Fehlt: zweistufige Pagode mit gestaffelten Dächern, hochgezogene Ecken mit Laternen an Ketten, Engawa (umlaufendes Deck), Steinsockel mit Freitreppe als Blickfang. Europäische Kopfbänder im Fachwerk wirken stilfremd; Detaildichte einzelner Seiten zu hoch (bis 0,9 Mikroblöcke je Fassadenzelle).

**Modern / Mediterran** (keine Referenzen). Modern hat schon zwei versetzte Kuben; mediterran ist ein Kubus mit flachem Walmdach („Kiste mit Hut“, Bericht 19 S7). Beide brauchen Tiefe (Laibung, Lisenen/Gesimse) und mediterran einen zweiten Baukörper (Flügel, Turm, Loggia).

**Weihnachten** (Ref. 19365618 Hollyridge Lodge). Vorhanden: Girlanden mit Licht, Kranz, Baum, Geschenkgruppen, Fest-Kits je Stil. Fehlt: **bunte Lichterketten entlang Traufen, Ortgängen und Graten**, Mini-Tannen, festlicher Vorplatz. Der weiße Saum der Referenz ist Schnee – bei uns nur auf ausdrücklichen Wunsch und nur als Schneeschicht.

## Reihenfolge der Hebel (für die Phasen 2–4)

1. Kaskade: Archetypen je Stil mit Nebenmassen vorn (Phase 2) – größter sichtbarer Unterschied.
2. Tiefe: Glas und Türen in d = −1, Sims/Sturz/Laden/Blumenkasten aus den Stilwerten, Eckpfosten, Balkenköpfe (Phase 3).
3. Dachkanten: ausgestellter Ortgang, Firstspitzen, Ecken hoch; Turmhauben (Phase 3).
4. Licht an allen Traufecken (Phase 3).
5. Leben am Haus, Rückseite, Terrassenkante, Fundament nach unten, bunte Lichterketten (Phase 4).
