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

1. In der App das Bauwerk generieren, eine Variante wählen, bei Bedarf bearbeiten und auf **„.schem herunterladen“** klicken.
   - Der Dateiname lautet z. B. `christmas-house-medium-seed1-714a2090.schem`.
   - Die acht Zeichen am Ende sind der Anfang des Modell-Hashs, der unter „Export & Technik“ steht. Nach einer Bearbeitung ändert sich der Hash.
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

Mit den Standardeinstellungen und Seed 1 (Breite X × Höhe Y × Tiefe Z, einschließlich Dachüberstand):

| Bauwerk | Klein | Mittel | Groß |
|---|---|---|---|
| Haus | 11 × 11 × 9 | 15 × 14 × 13 | 19 × 16 × 15 |
| Weihnachtsbaum | 13 × 14 × 13 | 17 × 22 × 17 | 21 × 30 × 21 |
| Marktstand | 9 × 11 × 9 | 15 × 11 × 9 | 21 × 11 × 9 |
| Bahnhof | 25 × 13 × 16 | 33 × 15 × 18 | 41 × 16 × 23 |

Turm, Anbau, Vordach, Hecke und eigene Maße vergrößern das Volumen. Die genauen Maße zeigt die App unter „Export & Technik“.

## Was du nach dem Einfügen prüfen solltest

Am Beispiel Haus „Mittel“ (Volumen 15 × 14 × 13, Grundfläche 13 × 11):

| Prüfpunkt | Erwartung |
|---|---|
| Maße | 15 Blöcke in X, 14 in Y, 13 in Z |
| Eingang | Nordseite (−Z), mittig (relativ x = 7), 1 Block breit und 2 Blöcke hoch offen, davor ein Wegblock |
| Fenster | Glasblöcke in allen vier Wänden, dazu Giebelfenster; von innen und außen frei |
| Dach | symmetrisches, gestuftes Satteldach mit Schnee, First entlang X, ohne Lücken |
| Schornstein | Ziegel auf der Südseite des Dachs, neben dem First, über den First hinausragend |
| Innenraum | begehbar; Weihnachtsbaum an der Rückwand, Licht unter dem First |
| Ebenen | keine verschobenen Ebenen, keine schwebenden Teile |
| Blockarten | stimmen mit der Materialliste der App überein |

Zusätzlich beim Bahnhof: Die Schienen liegen auf dem Gleisbett und verbinden sich zu einer geraden Ost-West-Strecke.

Bitte das Ergebnis mit getesteter Minecraft- und WorldEdit-Version, Screenshots und etwaigen Meldungen in `docs/TEST_REPORT.md` unter „In-Game-Abnahme“ eintragen. Erst danach darf der Export als „In Minecraft mit WorldEdit getestet“ gelten.

## Drehen

WorldEdit kann die Zwischenablage vor dem Einfügen drehen, z. B. `//rotate 90`.

- Stämme haben die Eigenschaft `axis`, Kürbislaternen und Fässer `facing`, Schienen `shape`. WorldEdit passt diese beim Drehen an.
- Gedrehtes Einfügen wurde **nicht getestet**.
