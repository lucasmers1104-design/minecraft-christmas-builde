# Detail-Kits: eigene Fenster, Türen und Kaminköpfe

Ein **Detail-Kit** ist ein kleines Bauteil, das du selbst in Minecraft baust, zum Beispiel dein Lieblingsfenster für den Stil „Rustikal“. Du speicherst es mit WorldEdit als `.schem`, legst eine kurze Beschreibung (`.json`) daneben und kopierst beides in den Ordner `kits/`. Der Generator nimmt dann dein Kit statt seiner eigenen, berechneten Vorlage, überall wo es passt.

> **Stand dieser Etappe (Phase 6):**
>
> - **Fertig und getestet:** Kits einlesen, prüfen (Blockliste, Version, Größe, Anker, Türen), nach Süden drehen, auf alle vier Hausseiten drehen und spiegeln, für 1.21.1 umschreiben. Die Tests bauen ihre Kits selbst; Ergebnis im Bericht zur Phase 6.
> - **Noch nicht drin:** Ob der Generator deine Kits schon beim Hausbau einsetzt, hängt von der Einbindung ab, die getrennt erfolgt (siehe Bericht zur Phase 6). Auch wo die App dir Fehlermeldungen zu Kits anzeigt, steht dort.
> - **Nicht geprüft:** ein echter Export aus Minecraft mit WorldEdit. Wie WorldEdit den Standpunkt speichert, ist aus dem WorldEdit-Quellcode abgeleitet (siehe „Was nicht geprüft ist“).

Ohne Kits ändert sich nichts: Der Generator baut genau wie vorher.

---

## Ordner und Dateien

```text
kits/
  rustic/
    fenster-laeden.schem     ← mit WorldEdit gespeichert
    fenster-laeden.json      ← deine Beschreibung, gleicher Name
    haustuer.schem
    haustuer.json
  medieval/
    ...
  alle/                      ← Kits für jeden Stil
    kamin-ziegel.schem
    kamin-ziegel.json
```

- **Stilordner:** `medieval`, `fantasy`, `rustic`, `nordic`, `japanese`, `cherry`, `modern`, `mediterranean`, dazu `alle` für Kits, die zu jedem Stil passen. Andere Ordnernamen meldet die App als Fehler.
- **Dateinamen:** `.schem` und `.json` heißen gleich. Erlaubt sind Buchstaben, Ziffern, Leerzeichen, Punkt, `_` und `-`. Am einfachsten: klein, ohne Umlaute, mit Bindestrich (`fenster-laeden`).
- **Reihenfolge:** Kits aus dem Ordner des Stils werden zuerst probiert, danach die aus `alle`. Mit `weight` (siehe unten) legst du fest, welches Kit vorn steht.
- Der Ordner liegt im Projektordner. Wer ihn woanders haben will, setzt die Umgebungsvariable `MCB_KITS_DIR` (z. B. in `.env.local`).

## Welche Bauteile, wie groß

| Bauteil | `part` | Öffnung (`opening`) | Übliche Größe des Kits (X × Y × Z) |
|---|---|---|---|
| Fenster | `window` | Glasfläche, 1–3 breit, 1–3 hoch | bis 7 × 6 × 3 |
| Tür | `door` | Türblatt, 1–2 breit, 2–3 hoch | bis 7 × 6 × 4 |
| Balkon (Obergeschoss) | `balcony` | Wandöffnung, z. B. 3 × 2 (Tür mit Fenster daneben) | bis 7 × 5 × 4 |
| Gaubenfront | `dormer_front` | Glasfläche, 1–2 × 2 | bis 5 × 5 × 3 |
| Kaminkopf | `chimney_head` | keine | 3 × 3 bis 5 × 5, 2–4 hoch |

**Grenzen, die die App prüft:** höchstens **9 × 12 × 9** Blöcke (X × Y × Z, so wie gebaut) und höchstens **600 Blöcke** (ohne Luft). Fenster, Türen, Balkone und Gauben dürfen **höchstens einen Block hinter die Wand** reichen (in den Raum), zum Beispiel für eine innere Fensterbank. Kleiner ist besser: Das Kit muss neben die Fenster, Ecken und Balken eines echten Hauses passen. Größere Kits werden seltener eingesetzt.

## So baust du ein Kit in Minecraft

**Am besten in einer flachen Testwelt (Kreativmodus), nicht in der Weihnachtswelt.**

### 1. Außenseite nach Norden

Baue jedes Kit so, dass seine **Außenseite nach Norden** zeigt. Wenn du draußen vor dem Detail stehst und es anschaust, schaust du nach **Süden**. Prüfen kannst du das mit **F3**: Dort steht dann `Facing: south (Towards positive Z)`.

Die App dreht das Kit später selbst auf jede Hausseite und kann es spiegeln (dann tauschen z. B. Läden die Seite und die Tür ihren Anschlag).

### 2. Nur das Detail bauen, nicht die Wand drumherum

**Luft im Kit heißt: „Hier nichts ändern.“** Die Hauswand bleibt dort stehen, wo dein Kit Luft hat. Baue also nur, was zum Detail gehört: Rahmen, Glas, Sims, Läden, Blumenkasten, Laternen, Stufe.

- Brauchst du zum Bauen eine Wand (damit Läden oder Laternen Halt haben), bau sie aus einem Block, den das Kit sonst nicht benutzt, und **wähle sie beim Kopieren ab** (siehe unten, `-m`) oder reiß sie vor dem Kopieren ab.
- Blöcke in der Wandebene, die mehr als einen Block neben der Öffnung liegen, ersetzen beim Einsetzen die Hauswand. Die App lässt das zu, schreibt aber einen Hinweis.
- **Ausnahmen, in denen Luft erzwungen wird:** die **Öffnung** selbst (Wandebene) und **ein Block dahinter** (Raumseite), damit Fenster und Türen innen frei bleiben; beim **Kaminkopf** der Rauchzug über dem Anker.

Treppenecken, Zaun-, Scheiben- und Mauerverbindungen, Türoberhälften und Laub berechnet die App beim Einsetzen neu, passend zum Haus. Du baust einfach ganz normal.

### 3. Öffnung und Anker

Der **Anker** ist der Punkt, an dem die App dein Kit festhält:

- **Fenster, Tür, Balkon, Gaubenfront:** die **linke untere Zelle der Öffnung**, von außen gesehen, in der Wandebene. Bei einem Fenster ist das der linke untere Glasblock, bei einer Tür die untere Türhälfte (bei Doppeltüren die linke).
- **Kaminkopf:** die Zelle des **Rauchzugs** (das Loch in der Mitte) in der **untersten Reihe** des Kits.

Die **Öffnung** ist nur die Glasfläche bzw. das Türblatt, ohne Rahmen. Beispiel: Ein Fenster mit 2 Glasblöcken nebeneinander und 2 übereinander hat `"opening": { "width": 2, "height": 2 }`, auch wenn der Rahmen 4 × 4 groß ist.

## Auswählen, kopieren, speichern (WorldEdit)

1. **Auswahl setzen:** zwei gegenüberliegende Ecken eines Quaders um das Detail.
   ```text
   //wand              Holzaxt: Linksklick = Ecke 1, Rechtsklick = Ecke 2
   //hpos1  //hpos2    Ecke auf den Block, den du gerade anschaust
   ```
   Nimm alles mit, was zum Detail gehört (Sims, Läden, Stufe, Laternen, auch eine innere Fensterbank), aber so wenig Luft und Wand wie möglich.
2. **Richtig hinstellen – das ist der Anker:**
   - **Fenster, Tür, Balkon, Gaubenfront:** Stell dich **außen direkt vor die Ankerzelle**, also einen Block weiter nördlich, mit den **Füßen auf der Höhe der untersten Öffnungsreihe** (du stehst z. B. auf dem Sims oder auf der Stufe vor der Tür). Prüfe mit **F3** die Zeile `Block: x y z`: Die y-Zahl muss die Höhe des untersten Glasblocks bzw. der unteren Türhälfte sein, x gleich der Ankerzelle, z eins kleiner.
   - **Kaminkopf:** Stell dich **in den Rauchzug** in der untersten Reihe des Kits (unter dir darf ein Block außerhalb der Auswahl sein). F3 `Block:` zeigt dann genau die Ankerzelle.
   - Stehst du auf einer halben Stufe oder Platte, zeigt F3 einen Block zu tief. Stell dich auf einen vollen Block oder die volle Oberseite einer Treppe.
3. **Kopieren:**
   ```text
   //copy
   ```
   WorldEdit merkt sich dabei, wo du stehst. Daraus berechnet die App den Anker.
   Mit Hilfswand aus z. B. weißer Wolle: `//copy -m !white_wool` kopiert alles außer der Wolle (die wird zu Luft). *(Diese Maske ist hier nicht in Minecraft ausprobiert.)*
4. **Speichern:**
   ```text
   //schem save fenster-laeden
   ```
   WorldEdit 7.3 und 7.4 speichern damit im richtigen Format (Sponge v3, `.schem`). Gibt es die Datei schon, überschreibst du sie mit `//schem save -f fenster-laeden`.

**Wo WorldEdit die Datei ablegt:**

- Server mit Paper/Spigot: `plugins/WorldEdit/schematics/`
- Fabric oder NeoForge (auch Einzelspieler): `config/worldedit/schematics/` im Spiel- bzw. Instanzordner, bei CurseForge also `…\curseforge\minecraft\Instances\<Instanz>\config\worldedit\schematics\`
- Mit `//schem list` siehst du, was WorldEdit dort findet.

Kopiere die `.schem` von dort nach `kits/<stil>/` im Projektordner und lege die `.json` mit demselben Namen daneben.

**Minecraft-Version:** Baue in **1.21.11** (DataVersion 4671) oder **1.21.1** (DataVersion 3955). WorldEdit schreibt die Version des laufenden Spiels in die Datei. Aus anderen Versionen (z. B. 1.21.10) lehnt die App das Kit mit Meldung ab.

**Wenn das Stehen nicht klappt:** Schreib den Anker selbst in die JSON (`"anchor": [x, y, z]`). Gezählt wird ab 0 von der Ecke der Auswahl mit den kleinsten Koordinaten: x = Anker-x minus kleinstes x der Auswahl, ebenso y und z. Dann ist egal, wo du beim `//copy` standest.

## Die Beschreibung (.json)

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `part` | ja | `window`, `door`, `balcony`, `dormer_front` oder `chimney_head` |
| `facing` | ja | immer `"north"` (Erinnerung an die Bauregel) |
| `opening` | bei allen außer Kaminkopf | `{ "width": …, "height": … }` der Öffnung in Blöcken; Türen und Balkone mindestens 2 hoch |
| `label` | nein | Name, wie ihn die App zeigt (sonst Bauteil und Dateiname) |
| `anchor` | nein | `[x, y, z]` in der Schematic, falls du ihn nicht über deinen Standplatz festlegst |
| `fits` | nein | wohin das Kit passt, siehe unten |

`fits` (alles optional):

| Feld | Werte | Standard |
|---|---|---|
| `storeys` | `["ground"]` Erdgeschoss, `["upper"]` Obergeschosse | beide |
| `sides` | `"front"` Eingangsseite, `"side"`, `"back"` | alle |
| `minFacadeLength` | kürzeste Hauswand in Blöcken, an die das Kit darf | 1 |
| `weight` | 1–100, höher = wird zuerst probiert | 1 |

Unbekannte Felder und Tippfehler meldet die App, damit nichts stillschweigend ignoriert wird.

### Beispiele

**Fenster** (2 × 2 Glas, Anker über den Standplatz):

```json
{
  "part": "window",
  "facing": "north",
  "label": "Fenster mit Läden und Blumenkasten",
  "opening": { "width": 2, "height": 2 },
  "fits": { "storeys": ["ground", "upper"], "weight": 5 }
}
```

**Tür** (einflügelig, nur auf der Eingangsseite):

```json
{
  "part": "door",
  "facing": "north",
  "label": "Haustür mit Vordach",
  "opening": { "width": 1, "height": 2 },
  "fits": { "sides": ["front"] }
}
```

**Balkon** (Tür in der Mitte, ein Fenster links und rechts, nur Obergeschoss; Anker = linkes Fenster unten):

```json
{
  "part": "balcony",
  "facing": "north",
  "opening": { "width": 3, "height": 2 },
  "fits": { "storeys": ["upper"], "minFacadeLength": 9 }
}
```

**Gaubenfront**:

```json
{
  "part": "dormer_front",
  "facing": "north",
  "opening": { "width": 1, "height": 2 }
}
```

**Kaminkopf** (Anker selbst angegeben: Rauchzug in der Mitte der untersten Reihe eines 3 × 3 breiten Kits):

```json
{
  "part": "chimney_head",
  "facing": "north",
  "label": "Ziegelkamin mit Krone",
  "anchor": [1, 0, 1]
}
```

## Was die App prüft

Beim Laden liest die App jede `.schem` mit ihrem eigenen Leser und prüft:

1. **Format:** gzip-komprimierte Sponge-Schematic Version 3 (WorldEdit 7.3 oder neuer). Alte `.schematic`-Dateien und Version 1/2 werden mit Hinweis abgelehnt.
2. **Version:** DataVersion 4671 (1.21.11) oder 3955 (1.21.1). Aus 1.21.1 werden umbenannte Blöcke übersetzt (`chain` → `iron_chain`).
3. **Blöcke:** Jeder Block muss in der geprüften Blockliste der App stehen (541 Blöcke, siehe `docs/COMPATIBILITY.md`) und in der Version der Datei existieren. Unbekannte Blöcke werden mit Namen gemeldet. Für 1.21.1 merkt sich die App, welche Blöcke dort ersetzt werden (z. B. Blasseiche → Quarz) oder fehlen; ein Kit mit fehlenden Blöcken wird bei 1.21.1-Häusern nicht verwendet.
4. **Größe:** höchstens 9 × 12 × 9 und 600 Blöcke, Fassaden-Kits höchstens 1 Block in den Raum.
5. **Anker und Öffnung:** Der Anker liegt in der Schematic, die Öffnung passt hinein, in der Öffnung steht etwas (sonst stimmt meist der Standplatz nicht). Kaminköpfe: Anker in der untersten Reihe.
6. **Türen:** Jede Tür ist vollständig (obere und untere Hälfte). Tür- und Balkon-Kits haben in der untersten Reihe der Öffnung eine Tür.

Was die App dabei **anpasst** (und als Hinweis am Kit vermerkt): Wasser in Blöcken wird entfernt, mit Redstone geschaltete Blöcke werden ungeschaltet (Türen, Falltüren und Tore geschlossen), Laub bleibt dauerhaft. **Inhalte** von Kisten, Fässern usw. und **Objekte** wie Rahmen oder Rüstungsständer werden nicht übernommen, nur die Blöcke.

**Bei einem Fehler** wird nur dieses eine Kit übersprungen; alle anderen Kits und der normale Generator laufen weiter. Die Meldung nennt die Datei und den Grund, auf Deutsch.

## Was beim Einsetzen passiert

So ist es gebaut und getestet; ab wann der Generator es beim Hausbau nutzt, steht im Bericht zur Phase 6.

- Fenster, Türen, Balkone und Gaubenfronten laufen über denselben Weg wie die eingebauten Vorlagen (W01–W18, T01–T10): Die App dreht das Kit auf die Hausseite, spiegelt es bei Bedarf und setzt es nur ein, wenn vor der Wand alles frei ist. Passt es nicht, nimmt der Generator die nächste Vorlage.
- Laternen in deinem Kit bleiben genau so, wie du sie gebaut hast (der Stil tauscht sie nicht gegen Seelenlaternen).
- Für Häuser in 1.21.1 werden umbenannte Blöcke und Ersatzblöcke automatisch eingesetzt.
- Gleiche Kits und gleiche Eingabe ergeben immer dasselbe Haus.

## Was nicht geprüft ist

- **Echter Export aus Minecraft:** Auf dem Arbeits-Laptop gibt es kein Minecraft und kein Java. Getestet ist mit Kits, die die Tests selbst schreiben (mit dem Sponge-v3-Schreiber der App, bei Bedarf so verändert, wie WorldEdit Offset und Herkunft speichert). Eine echte WorldEdit-Datei wurde noch nicht eingelesen.
- **Standplatz und Anker:** Dass WorldEdit beim `//copy` deine Fußposition als Bezugspunkt speichert (`Offset` = kleinste Ecke minus Standplatz), ist aus dem Quellcode von WorldEdit 7.3.18 und 7.4.6 abgelesen, nicht im Spiel ausprobiert.
- **`//copy -m !white_wool`** (Hilfswand abwählen): nicht im Spiel ausprobiert.
- **Einsatz im Generator:** siehe Bericht zur Phase 6 – dort steht, ob und wo der Generator Kits schon verwendet und wo Meldungen angezeigt werden.
- Gedrehtes Einfügen mit WorldEdit (`//rotate`) spielt für Kits keine Rolle: Baue sie einfach nach Norden.
