# `.schem` mit WorldEdit importieren

> **Status:** Der Import ist in Minecraft selbst **noch nicht verifiziert**. Automatisch geprüft ist, dass der echte WorldEdit-7.3.8-Reader die exportierten Dateien ohne Warnungen und Block für Block identisch liest (siehe `docs/TEST_REPORT.md`). Das tatsächliche `//schem load` und `//paste` in einer Welt fehlt noch als manuelle Abnahme.

## Voraussetzungen

- Minecraft **Java 1.21.1**, das geprüfte Profil.
- WorldEdit **7.3.x** auf dem Server bzw. im Client: 7.3.8 als Plugin für Paper/Spigot oder als Mod für Fabric/NeoForge.
  - `//version` zeigt, welche WorldEdit-Version installiert ist.
- Ein Konto mit WorldEdit-Rechten (`worldedit.schematic.load`, `worldedit.clipboard.paste`).
- **Eine Testwelt oder eine Kopie des Servers, nicht die produktive Weihnachtswelt.**

## Schritte

1. In der Web-App das Bauwerk generieren, die Variante wählen und auf **„.schem herunterladen“** klicken.
   - Der Dateiname lautet z. B. `christmas-house-medium-seed1-a4972b5e.schem`. Die acht Zeichen am Ende sind der Anfang des Modell-Hashs, der rechts unter „Export & Technik“ steht.
2. Die Datei in den Schematic-Ordner von WorldEdit kopieren:
   - Paper/Spigot: `plugins/WorldEdit/schematics/`
   - Fabric/NeoForge (Mod): meist `config/worldedit/schematics/`
   - Den Pfad der eigenen Installation prüfen. Mit `//schem list` siehst du, ob WorldEdit die Datei findet.
3. Im Spiel laden:
   ```text
   //schem load christmas-house-medium-seed1-a4972b5e
   ```
   WorldEdit sollte melden, dass die Schematic in die Zwischenablage geladen wurde. Bei Fehlermeldungen (z. B. „unknown format“) bitte abbrechen und die Meldung notieren.
4. An einer freien, ebenen Stelle hinstellen. Deine Position wird zur **Ecke mit den kleinsten X-, Y- und Z-Werten** des Bauwerks. Das Haus erstreckt sich von dort nach **+X (Osten)**, **+Y (oben)** und **+Z (Süden)**. Die unterste Ebene (das Fundament) liegt auf Höhe deiner Füße.
5. Einfügen:
   ```text
   //paste
   ```
   - Ohne Flags fügt `//paste` auch die Luftblöcke ein. Was im Volumen des Hauses steht, wird also ersetzt. Das ist gewollt, damit der Innenraum frei ist.
   - `//paste -a` würde Luft überspringen. Gelände im Bauraum bliebe dann stehen.
   - `//undo` macht das Einfügen rückgängig.

## Was du nach dem Einfügen prüfen solltest

Am Beispiel „Mittel“: Volumen 15 × 14 × 13, Grundfläche 13 × 11.

| Prüfpunkt | Erwartung |
|---|---|
| Maße | 15 Blöcke in X, 14 in Y, 13 in Z, einschließlich Dachüberstand und Schornstein |
| Eingang | Nordseite (−Z), mittig (relativ x = 7), 1 Block breit und 2 Blöcke hoch offen, davor ein Wegblock |
| Fenster | Glasblöcke in allen vier Wänden, dazu je ein Giebelfenster; von innen und außen frei |
| Dach | symmetrisches, gestuftes Satteldach mit Schnee, First entlang X, ohne Lücken |
| Schornstein | Ziegel auf der Südseite des Dachs, neben dem First, über den First hinausragend |
| Innenraum | begehbar; Weihnachtsbaum an der Rückwand, Leuchtstein unter dem First |
| Ebenen | keine verschobenen Ebenen, keine schwebenden Teile |
| Blockarten | stimmen mit der Materialliste der App überein |

Bitte das Ergebnis mit getesteter Minecraft- und WorldEdit-Version, Screenshots und etwaigen Meldungen in `docs/TEST_REPORT.md` unter „In-Game-Abnahme“ eintragen. Erst danach darf der Export als „In Minecraft mit WorldEdit getestet“ gelten.

## Drehen

WorldEdit kann die Zwischenablage vor dem Einfügen drehen, z. B. `//rotate 90`. Das Haus besteht nur aus vollen Blöcken; Stämme haben die Eigenschaft `axis`, die WorldEdit beim Drehen anpasst. Gedrehtes Einfügen wurde nicht getestet.
