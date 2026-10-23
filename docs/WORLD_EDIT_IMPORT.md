# `.schem` mit WorldEdit importieren

> **Status:** Der Import ist in Minecraft selbst **noch nicht verifiziert**.
>
> - **Automatisch geprüft:** Der echte EngineHub-WorldEdit-7.4.2-Reader liest die exportierten Dateien aller vier Bauwerkstypen ohne Warnungen und Block für Block identisch, für 1.21.11 und 1.21.1 (siehe `docs/TEST_REPORT.md`).
> - **Noch offen:** das tatsächliche `//schem load` und `//paste` in einer Welt, als manuelle Abnahme.

## Voraussetzungen

- **Minecraft Java 1.21.11**, das Standardprofil der App. Für einen 1.21.1-Server stellst du in der App unter „Einstellungen“ die Version auf 1.21.1 und generierst neu.
- **WorldEdit mit 1.21.11-Unterstützung**, also 7.3.18 oder neuer, z. B. 7.4.2:
  - als Plugin für Paper/Spigot oder als Mod für Fabric/NeoForge;
  - `//version` zeigt, welche WorldEdit-Version installiert ist.
- Ein Konto mit WorldEdit-Rechten (`worldedit.schematic.load`, `worldedit.clipboard.paste`).
- **Eine Testwelt oder eine Kopie des Servers, nicht die produktive Weihnachtswelt.**

## Schritte

1. In der App das Bauwerk generieren, eine Variante wählen, bei Bedarf bearbeiten und im Bereich **„Export“** auf **„Als .schem herunterladen“** klicken.
   - Der Dateiname lautet z. B. `christmas-house-medium-seed1-714a2090.schem`.
   - Die acht Zeichen am Ende sind der Anfang des Modell-Hashs, der unter „Export → Technische Details“ steht. Nach einer Bearbeitung ändert sich der Hash.
2. Die Datei in den Schematic-Ordner von WorldEdit kopieren:
   - Paper/Spigot: `plugins/WorldEdit/schematics/`
   - Fabric/NeoForge (Mod): meist `config/worldedit/schematics/`
   - Den Pfad der eigenen Installation prüfen. Mit `//schem list` siehst du, ob WorldEdit die Datei findet.
3. Im Spiel laden:
   ```text
   //schem load christmas-house-medium-seed1-714a2090
   ```
   WorldEdit sollte melden, dass die Schematic in die Zwischenablage geladen wurde. Bei Fehlermeldungen (z. B. „unknown format“) bitte abbrechen und die Meldung notieren.
4. An einer freien, ebenen Stelle hinstellen.
   - Deine Position wird zur **Ecke mit den kleinsten X-, Y- und Z-Werten** des Bauwerks.
   - Das Bauwerk erstreckt sich von dort nach **+X (Osten)**, **+Y (oben)** und **+Z (Süden)**.
   - Die unterste Ebene (Fundament, Gleisbett bzw. Boden) liegt auf Höhe deiner Füße.
5. Einfügen:
   ```text
   //paste
   ```
   - Ohne Flags fügt `//paste` auch die Luftblöcke ein. Was im Volumen des Bauwerks steht, wird also ersetzt. Das ist gewollt, damit Innenräume frei sind.
   - `//paste -a` würde Luft überspringen. Gelände im Bauraum bliebe dann stehen.
   - `//undo` macht das Einfügen rückgängig.

## Maße der Standard-Bauwerke

Stil „Rustikal“, Thema „Weihnachten“, Seed 1, keine Feinparameter (Breite X × Höhe Y × Tiefe Z, einschließlich Garten, Weg und Dachüberstand):

| Bauwerk | Klein | Mittel | Groß | Riesig |
|---|---|---|---|---|
| Haus | 25 × 15 × 24 | 27 × 16 × 26 | 29 × 20 × 26 | 33 × 21 × 35 |
| Weihnachtsbaum | 17 × 15 × 17 | 21 × 21 × 21 | 23 × 29 × 23 | 33 × 43 × 33 |
| Marktstand | 13 × 14 × 14 | 13 × 14 × 21 | 21 × 20 × 30 | 29 × 20 × 30 |
| Bahnhof | 33 × 22 × 28 | 35 × 23 × 30 | 39 × 23 × 32 | 43 × 23 × 34 |
| Turm | 17 × 27 × 20 | 19 × 33 × 22 | 21 × 43 × 24 | 25 × 64 × 28 |

Andere Stile, Flügel, Türme, Anbauten und eigene Maße ändern das Volumen. Die genauen Maße zeigt die App über der Vorschau und im Bereich „Export“. Die größte erlaubte Box ist 192 × 384 × 192.

## In-Game-Checkliste nach dem Einfügen

Am Beispiel Haus „Mittel“ mit den Standardwerten oben (27 × 16 × 26, Palette „Blockhaus aus Stämmen“, Satteldach mit First entlang X, Eingang auf der Nordseite). Bitte jeden Punkt abhaken:

| | Prüfpunkt | Erwartung |
|---|---|---|
| ☐ | Maße | 27 Blöcke in X, 16 in Y, 26 in Z; nichts fehlt am Rand |
| ☐ | Eingang | Nordseite (−Z); untere und obere Türhälfte vorhanden, Tür lässt sich öffnen; davor Stufe und Weg, Laternen neben der Tür |
| ☐ | Treppen | Dachtreppen bilden an Ecken und Kehlen saubere Innen- und Außenecken (keine „falsch gedrehten“ Stufen); Konsolen und Simse sind Kopfüber-Treppen |
| ☐ | Zäune, Mauern, Scheiben, Gitter | verbinden sich wie in der Vorschau, keine einzelnen Pfosten, wo eine Verbindung zu sehen war |
| ☐ | Laternen und Ketten | hängende Laternen hängen an Ketten oder unter Blöcken, stehende stehen auf Pfosten; keine fällt beim nächsten Blockupdate ab |
| ☐ | Laub (Girlanden, Bäume) | verwelkt nach einigen Minuten nicht (persistentes Laub) |
| ☐ | Leitern | hängen an einer Wand, nicht vor einem Fenster |
| ☐ | Fenster | Scheiben sitzen in der Wandebene, Rahmen, Simse und Läden stehen davor; von innen frei |
| ☐ | Kamin (falls vorhanden) | Lagerfeuer oben raucht, der Rauch steigt frei auf |
| ☐ | Geschosse | jedes Geschoss hat einen Boden; Treppe oder Leiter führt nach oben |
| ☐ | Schnee | nur wenn „Schnee“ gewünscht war: Schneeschichten bleiben liegen und schmelzen nicht neben Laternen |
| ☐ | Ebenen | keine verschobenen Ebenen, nichts schwebt |
| ☐ | Blockarten | stimmen mit der Materialliste der App überein (Items: Türen zählen einmal, doppelte Stufen zweimal) |
| ☐ | 1.21.1 | mit Zielversion 1.21.1 exportiert: Ketten heißen `chain`, alle Blöcke werden ohne Fehlermeldung eingefügt |

Zusätzlich:

- **Bahnhof:** Die Schienen liegen auf Schwellen und Schotter und bilden eine gerade Ost-West-Strecke; die Bahnsteigkante (Kopfüber-Treppen) liegt direkt am Gleisbett, die weiße Sicherheitslinie einen Block dahinter; die Laternen unter dem Bahnsteigdach hängen an Ketten; die Uhrzeiger (Ketten) stehen vor dem Zifferblatt.
- **Turm:** Die Leiter führt bis unter das Dach (bei Zinnen auf den Wehrgang); der Kegel oder die Kuppel ist geschlossen.
- **Marktstand:** Die Auslage-Falltüren vor der Theke halten frei, die Waren stehen darauf; die Laterne hängt an der Kette unter dem First; die Lichterketten über der Gasse bleiben waagerecht, nichts hängt darunter.

Bitte das Ergebnis mit getesteter Minecraft- und WorldEdit-Version, Screenshots und etwaigen Meldungen in `docs/TEST_REPORT.md` unter „In-Game-Abnahme“ eintragen. Erst danach darf der Export als „In Minecraft mit WorldEdit getestet“ gelten.

## Drehen

WorldEdit kann die Zwischenablage vor dem Einfügen drehen, z. B. `//rotate 90`.

- Stämme haben die Eigenschaft `axis`, Kürbislaternen und Fässer `facing`, Schienen `shape`. WorldEdit passt diese beim Drehen an.
- Gedrehtes Einfügen wurde **nicht getestet**.
