# Screenshots mit echten Texturen

Aufgenommen am 22.10.2026 aus der laufenden App (`npm run dev`) mit den Texturen der Minecraft-1.21.11-Client-Datei dieses PCs, Seed 1, ohne Feinparameter. Die Bilder zeigen die 3D-Vorschau der App, nicht das Spiel; Licht und Schatten des Spiels fehlen dort.

Neu erzeugen (App muss laufen):

```text
set MCB_SHOT_FORMAT=jpeg
node scripts/screenshots.mjs docs/screenshots/faelle.json docs/screenshots
```

| Datei | Bauwerk | Stil | Thema | Größe |
|---|---|---|---|---|
| `haus-mittelalter-weihnachten.jpg` | Haus | Mittelalter | Weihnachten | Mittel |
| `haus-fantasy-weihnachten.jpg` | Haus | Fantasy / Märchen | Weihnachten | Mittel |
| `haus-rustikal-weihnachten.jpg` | Haus | Rustikal | Weihnachten | Mittel |
| `haus-nordisch-weihnachten.jpg` | Haus | Nordisch | Weihnachten | Mittel |
| `haus-japanisch-weihnachten.jpg` | Haus | Japanisch | Weihnachten | Mittel |
| `haus-kirschbluete-weihnachten.jpg` | Haus | Kirschblüte | Weihnachten | Mittel |
| `haus-modern-weihnachten.jpg` | Haus | Modern | Weihnachten | Mittel |
| `haus-mediterran-weihnachten.jpg` | Haus | Mediterran | Weihnachten | Mittel |
| `haus-*-gross-ohne-thema.jpg` | Haus, Rückseite | alle acht | kein Thema | Groß |
| `haus-nordisch-winter-schnee.jpg` | Haus („mit Schnee auf dem Dach“) | Nordisch | Winter | Groß |
| `haus-mittelalter-rundturm-erker-balkon-1.jpg`, `-2.jpg` | Haus mit Rundturm (Zinnen), Erker, Balkon, zwei Geschossen | Mittelalter | Weihnachten | Groß |
| `turm-mittelalter-zinnen.jpg` | Turm (D 9, Zinnen) | Mittelalter | kein Thema | Mittel |
| `turm-fantasy-weihnachten.jpg` | Turm (D 11, Kegel) | Fantasy / Märchen | Weihnachten | Groß |
| `weihnachtsbaum.jpg` | Weihnachtsbaum | – | Weihnachten | Groß |
| `marktstand.jpg` | Marktstand | Rustikal | Weihnachten | Groß |
| `bahnhof-mittelalter.jpg` | Bahnhof | Mittelalter | Weihnachten | Groß |

Beim Schnee-Bild liegen Schneeschichten nur dort, wo sie im Spiel liegen blieben (volle Oberseiten wie der First); auf Treppen hält Schnee in Minecraft nicht.
