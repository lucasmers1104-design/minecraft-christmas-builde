# Echte Minecraft-Texturen in der Vorschau

Die 3D-Vorschau, die Materialliste und die Block-Auswahl können die **Original-Texturen und Blockmodelle von Minecraft** zeigen. Sie stammen aus **deiner eigenen Minecraft-Installation**.

- Das Projekt enthält keine Mojang-Dateien.
- Was die App ausliest, bleibt auf deinem PC im Ordner `.minecraft-assets/`. Er wird nicht hochgeladen und nicht in Git gespeichert.

## Woher die App die Texturen nimmt

Die App braucht die **Client-Datei** einer Minecraft-Version, z. B. `1.21.11.jar`. Sie prüft der Reihe nach:

1. `MINECRAFT_JAR` in `.env.local`, falls gesetzt (Pfad zur Datei).
2. Bereits ausgelesene Texturen in `.minecraft-assets/`.
3. **Automatische Suche** in den Standardordnern der Launcher. Bevorzugt wird 1.21.11, dann 1.21.1, sonst die neueste gefundene Version:

   | Launcher | typischer Ort unter Windows |
   |---|---|
   | Offizieller Minecraft Launcher | `%APPDATA%\.minecraft\versions\1.21.11\1.21.11.jar` |
   | CurseForge | `C:\Users\<Name>\curseforge\minecraft\Install\versions\1.21.11\1.21.11.jar` |
   | Modrinth App | unter `%APPDATA%\ModrinthApp\` |
   | Prism Launcher | unter `%APPDATA%\PrismLauncher\libraries\com\mojang\minecraft\` (`minecraft-1.21.11-client.jar`) |

   Gesucht wird begrenzt: höchstens 7 Ordnerebenen tief, ohne `mods`, `saves`, `resourcepacks` usw. Die Version muss im Launcher **einmal gestartet** worden sein, sonst liegt die Datei noch nicht dort.

4. Findet die App nichts, klicke unter der 3D-Ansicht auf **„Texturen einrichten“**. Dort gibt es zwei Wege:
   - **„Minecraft-Datei auswählen …“**: Du wählst die `.jar`-Datei selbst aus, z. B. wenn CurseForge in einem eigenen Ordner installiert ist.
   - **„Von Mojang laden“**: Nur nachdem du bestätigt hast, dass du Minecraft Java besitzt und die [Minecraft-EULA](https://www.minecraft.net/eula) akzeptierst. Dann lädt die App die offizielle Client-Datei (ca. 30 MB) von `piston-data.mojang.com`. Adresse und SHA-1-Prüfsumme stammen aus Mojangs Versionsliste; die Datei wird vor der Verwendung geprüft.

Mit dem Schalter **„Texturen“** unter der Vorschau schaltest du zwischen Texturen und einfarbigen Blöcken um.

## Wie die Darstellung entsteht

- Die App liest die Blockstates, Blockmodelle und Blocktexturen aus der Datei, wie Minecraft selbst:
  - Varianten und Multipart-Teile;
  - Modell-Eltern und Texturverweise;
  - Elemente mit Drehung;
  - x/y-Drehung der Variante und `uvlock`.
- Dadurch sind Stämme, Kürbislaternen, Fässer und Schienen richtig ausgerichtet. Auch spätere Blockformen wie Treppen, Zäune und Scheiben kann der Renderer schon darstellen.
- **Wie im Spiel:**
  - Seitenflächen sind unterschiedlich hell (oben 100 %, Nord/Süd 80 %, Ost/West 60 %, unten 50 %).
  - Laub ist wie in der Ebenen-Landschaft eingefärbt (Fichte `#619961`, Birke `#80A755`, sonst `#77AB2F`).
  - Durchsichtige Pixel von Laub und Glas bleiben durchsichtig.
  - Glas zeigt zu gleichem Glas keine Zwischenflächen.
- **Animierte Texturen** (z. B. Seelaterne) zeigen das erste Bild.
- **Nicht nachgebildet:** Licht, Schatten, Umgebungsverdeckung und Biome-Farben anderer Landschaften.

## Prüfung

- `tests/unit/textures.test.ts` testet ZIP-Leser, Variantenwahl, Multipart, Modellvererbung, Drehungen, uvlock, Flächen-Ausblendung, Helligkeit, Laubfarbe und Launcher-Suche. Dafür erzeugen die Tests eine eigene Test-Datei im Minecraft-Format.
- `tests/integration/textures.test.ts` testet die Schnittstellen: Status, Auswahl, automatische Suche, `MINECRAFT_JAR` und den Mojang-Download mit Prüfsumme (gegen einen simulierten Server).
- Mit einer echten Datei prüft derselbe Test alle 248 Blockzustände der App gegen die Original-Modelle:
  ```sh
  MCB_MINECRAFT_JAR=/pfad/zu/1.21.11.jar npx vitest run tests/integration/textures.test.ts
  ```
  Das wurde am 2026-10-22 mit der offiziellen 1.21.11-Client-Datei ausgeführt (SHA-1 `ba2df812c2d12e0219c489c4cd9a5e1f0760f5bd`): alle Zustände vollständig, keine fehlenden Modelle oder Texturen.
- `tests/e2e/textures.spec.ts` testet die Auswahl im Browser, die texturierte Vorschau und das Umschalten.
- **Nicht getestet:** die automatische Suche auf einem echten Windows-PC mit CurseForge, Modrinth oder Prism. Für Modrinth und Prism ist nur der Ordner des Launchers belegt, nicht die genaue Lage der Datei darin; deshalb sucht die App dort rekursiv.
