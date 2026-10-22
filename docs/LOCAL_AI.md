# Lokale KI-Planung mit Ollama (optional)

Die App funktioniert ohne KI vollständig. Optional kann ein **lokales Sprachmodell auf deinem PC** freie Bauwerksideen in einen Bauplan übersetzen. Dafür gibt es **keinen API-Key, keine Cloud und keine Kosten**. Nach dem einmaligen Download des Modells läuft es auch offline.

## Was die KI darf und was nicht

- **Die KI liefert nur einen Bauplan:** Bauwerkstyp, Stil, Größe, Material, Farben, Detailgrad, Feinparameter (z. B. Turm, Anbau, Maße, Materialien), eine kurze Erklärung und eine Liste der Wünsche, die sich nicht umsetzen lassen.
- **Der Plan wird streng geprüft (Zod-Schema).** Unbekannte Felder oder Werte werden abgelehnt. Kleine Abweichungen wie gerade Maße werden korrigiert, bei ungültigen Antworten gibt es eine Korrekturrunde.
- **Blöcke, Geometrie und Export** erzeugt immer der regelbasierte Generator. Die KI gibt keine Blocklisten oder NBT-Daten aus.
- **Die Oberfläche kennzeichnet die Quelle:**
  - Einstellungen, die aus dem KI-Plan stammen, tragen das Etikett „von KI“.
  - Oben steht „KI-Plan: \<Modell\> (lokal)“ **nur**, wenn das angezeigte Bauwerk wirklich aus einem KI-Plan entstanden ist.
  - Sonst steht dort „Regelbasierter Generator“.
- **Rückfall:** Ist Ollama nicht erreichbar, zu langsam oder liefert keinen gültigen Plan, erzeugt die App das Bauwerk regelbasiert aus dem Text und zeigt einen Hinweis.

## Einrichtung unter Windows

1. **Ollama installieren:** von <https://ollama.com/download> den Windows-Installer laden und ausführen. Ollama läuft danach im Hintergrund (Symbol im Infobereich).
2. **Modell laden.** In der Eingabeaufforderung oder PowerShell:
   ```text
   ollama pull qwen3:14b
   ```
   Der Download ist etwa 9 GB groß und einmalig.
3. **`.env.local` anlegen** im Projektordner (neben `package.json`), z. B. mit dem Editor:
   ```text
   MCB_AI_PROVIDER=ollama
   OLLAMA_MODEL=qwen3:14b
   ```
   `OLLAMA_BASE_URL` (Standard `http://127.0.0.1:11434`), `MCB_AI_TIMEOUT_MS` und `OLLAMA_THINK` sind optional, siehe `.env.example`.
4. **App neu starten**, z. B. `start-windows.cmd` erneut ausführen.
5. In der App links im Kasten **„Lokale KI (optional)“**:
   - Dort sollte „Lokale KI bereit (Ollama, Modell qwen3:14b)“ stehen.
   - Den Haken **„Beim Generieren mit lokaler KI planen“** setzen und auf „Bauwerk generieren“ klicken.

## Modellempfehlung

Auf diesem PC wurden am 22.10.2026 eine **AMD Radeon RX 6600 (8 GB Grafikspeicher)**, **16 GB Arbeitsspeicher** und ein Ryzen 5 5600X erkannt. Ollama nutzt AMD-Karten unter Windows über ROCm bzw. Vulkan; ob die RX 6600 dabei beschleunigt wird, hängt von der Ollama-Version ab – sonst rechnet die CPU (langsamer, aber es funktioniert).

| Modell | Größe ca. | Einschätzung für 8 GB Grafikspeicher |
|---|---|---|
| `qwen3:8b` | 5 GB | **Empfehlung:** passt in den Grafikspeicher, gutes Deutsch, zuverlässige strukturierte Ausgabe |
| `gemma3:4b` | 3 GB | sehr schnell, ungenauer bei langen Wünschen |
| `qwen3:14b` | 9 GB | genauer, passt aber nicht ganz in 8 GB – Teile laufen auf der CPU, deutlich langsamer |
| `gemma3:12b` | 8 GB | Alternative mit gutem Deutsch, knapp an der Grenze |

Mit einer Karte mit 16 GB (z. B. RTX 5060 Ti) ist `qwen3:14b` die bessere Wahl. Das Modell wechselst du über `OLLAMA_MODEL` in `.env.local` (die Beispiele oben nennen `qwen3:14b`; für diesen PC `qwen3:8b` eintragen und `ollama pull qwen3:8b` ausführen).

Die Tabelle beruht auf allgemeinem Wissen über diese Modelle; **hier wurde keines davon tatsächlich ausgeführt** (siehe unten). Ob ein Modellname aktuell verfügbar ist, zeigt `ollama pull <name>`. Wie gut ein Modell plant, misst das Testset (Abschnitt „Testset und Messung“).

Beim allerersten Aufruf lädt Ollama das Modell in den Speicher, das dauert länger.

## Fehlerbehebung

| Meldung in der App | Lösung |
|---|---|
| „Lokale KI ist nicht aktiviert“ | `.env.local` mit `MCB_AI_PROVIDER=ollama` anlegen und die App neu starten |
| „Ollama ist … nicht erreichbar“ | Ollama-App starten; prüfen, ob <http://127.0.0.1:11434> im Browser „Ollama is running“ zeigt |
| „Modell … ist nicht installiert“ | `ollama pull <modell>` ausführen, dann „Erneut prüfen“ klicken |
| „nicht innerhalb von … s geantwortet“ | kleineres Modell wählen oder `MCB_AI_TIMEOUT_MS` erhöhen |
| „keinen gültigen Bauplan“ | anderes Modell probieren (z. B. `qwen3:14b`) und die Beschreibung präziser formulieren |

## Der Bauplan

KI und regelbasierter Text-Parser liefern **dasselbe flache Planformat** (`src/core/ai/planSchema.ts`). Es wird aus dem Katalog erzeugt, enthält keine Koordinaten und keine freien Block-IDs:

| Gruppe | Felder |
|---|---|
| Text | `explanation` (kurze deutsche Zusammenfassung), `unsupported` (Wünsche, die der Generator nicht baut) |
| Auswahl | `kind`, `style`, `palette`, `theme`, `size`, `roofType`, `roofProfile`, `wings`, `annex`, `tower`, `towerPosition`, `symmetry`, `windows`, `windowFamily`, `doorFamily`, `lanternDensity` – jeweils mit `"auto"` für „nicht angegeben“ |
| Zahlen | `detailLevel`, `floors`, `width`, `depth`, `overhang`, `dormers` – `null` für „nicht angegeben“ |
| Schalter | `porch`, `balcony`, `chimney`, `oriel`, `jetty`, `garden`, `soulLanterns`, `garland`, `christmasTree`, `presents`, `snow` – `null` für „nicht angegeben“ |
| Materialien | `wallMaterial`, `roofMaterial`, `frameMaterial`, `plinthMaterial`, `accentMaterial` – nur aus einer festen Liste je Rolle, nur wenn ein Material genannt wird |

Alle Felder sind Pflicht; das macht die strukturierte Ausgabe von Ollama robuster. `normalizePlan` korrigiert kleine Abweichungen (gerade Maße → ungerade, Grenzen, Stilfremde Palette), danach prüft Zod streng. Die App zeigt den Plan Feld für Feld an.

## Technik

- `GET /api/ai/status` prüft über `GET /api/tags` von Ollama, ob der Dienst läuft und das Modell installiert ist.
- `POST /api/ai/plan` mit `{ "description": "…" }` ruft `POST /api/chat` von Ollama auf:
  - **System-Prompt** auf Deutsch mit dem Stilkatalog (Name, Beschreibung, Stichwörter, Paletten), dem Planformat und den Regeln;
  - **2–4 Beispielpaare** (Few-Shot), passend zum Text ausgewählt aus 26 kuratierten Beispielen (`src/core/ai/fewShotExamples.ts`; sie sind vom Testset getrennt);
  - `format` ist das JSON-Schema des Bauplans (strukturierte Ausgabe);
  - `temperature` **0**, fester `seed` 7, `num_ctx` 8192 (der Prompt hat etwa 5 000 Tokens);
  - `think: false`, außer `OLLAMA_THINK` sagt etwas anderes. Lehnt ein Modell `think` ab, wird ohne wiederholt; landet die Antwort im Feld `thinking`, wird sie dort gelesen;
  - genau eine Korrekturrunde mit den Prüffehlern bei ungültiger Antwort, und ein Zeitlimit.
- Die Ollama-Adresse kommt **nur** aus den Umgebungsvariablen des Servers, nie aus dem Browser.
- Der KI-Plan wird mit dem Projekt gespeichert. Beim Öffnen gelten dieselben Einstellungen wieder, auch wenn Ollama dann gerade nicht läuft.

## Testset und Messung

- `tests/fixtures/planTestset.ts` enthält **77 deutsche Wünsche** mit den erwarteten Planfeldern.
- Der **regelbasierte Parser** trifft alle 77 vollständig (`tests/unit/planTestset.test.ts`), und jeder dieser Wünsche wird zusätzlich bis zum fertigen Bauwerk erzeugt und geprüft (`tests/unit/wishesEndToEnd.test.ts`: keine Reparatur, alle Blockzustände gültig, Bau-Lints sauber).
- **Messung mit einem echten Modell** (erst nach der Einrichtung oben möglich):
  ```text
  set MCB_OLLAMA_TESTSET=1
  npx vitest run tests/integration/ollamaTestset.test.ts
  ```
  Der Lauf misst Gültigkeitsquote, Korrekturrunden, Dauer (Mittel, Median, p95) und Treffer je Wunsch und je Feld, vergleicht mit dem Parser und schreibt `reports/ki-testset.json`.

## Was geprüft ist und was nicht

- **Geprüft:**
  - Den Ollama-Client testen Integrationstests gegen einen simulierten Ollama-Server (`tests/integration/ai.test.ts`): gültiger Plan, Korrekturrunde, unsinnige Antwort, Zeitüberschreitung, fehlendes Modell, nicht erreichbar, Modell ohne „think“-Unterstützung, Antwort im `thinking`-Feld und die API-Routen.
  - Derselbe Messcode wie für das echte Modell läuft immer einmal gegen einen simulierten Server (Trockenlauf).
  - Die Oberfläche testen Playwright-Tests mit simulierten KI-Endpunkten (`tests/e2e/ai.spec.ts`).
- **Nicht geprüft:** ein Lauf mit einem echten Modell. Auf diesem PC ist Ollama (Stand 22.10.2026) **nicht installiert**; es gibt deshalb **keine echten Messwerte**. Wie gut die Pläne werden, hängt vom Modell ab – der Testset-Lauf oben zeigt es.
