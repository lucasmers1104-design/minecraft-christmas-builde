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

## Modellempfehlung für deinen PC (RTX 5060 Ti 16 GB, 32 GB RAM)

| Modell | Größe ca. | Einschätzung |
|---|---|---|
| `qwen3:14b` | 9 GB | **Empfehlung:** passt komplett in den Grafikspeicher, gutes Deutsch, zuverlässige strukturierte Ausgabe |
| `qwen3:8b` | 5 GB | schneller, etwas ungenauer |
| `gemma3:12b` | 8 GB | Alternative mit gutem Deutsch |
| `gpt-oss:20b` | 13–14 GB | passt knapp in 16 GB; langsamer, dafür stark beim Planen |

Das Modell wechselst du über `OLLAMA_MODEL` in `.env.local`.

Die Tabelle beruht auf allgemeinem Wissen über diese Modelle; **hier wurde keines davon tatsächlich ausgeführt** (siehe unten). Ob ein Modellname aktuell verfügbar ist, zeigt `ollama pull <name>`.

Mit Grafikkarte dauert eine Planung typischerweise einige Sekunden. Beim allerersten Aufruf lädt Ollama das Modell in den Grafikspeicher, das dauert länger.

## Fehlerbehebung

| Meldung in der App | Lösung |
|---|---|
| „Lokale KI ist nicht aktiviert“ | `.env.local` mit `MCB_AI_PROVIDER=ollama` anlegen und die App neu starten |
| „Ollama ist … nicht erreichbar“ | Ollama-App starten; prüfen, ob <http://127.0.0.1:11434> im Browser „Ollama is running“ zeigt |
| „Modell … ist nicht installiert“ | `ollama pull <modell>` ausführen, dann „Erneut prüfen“ klicken |
| „nicht innerhalb von … s geantwortet“ | kleineres Modell wählen oder `MCB_AI_TIMEOUT_MS` erhöhen |
| „keinen gültigen Bauplan“ | anderes Modell probieren (z. B. `qwen3:14b`) und die Beschreibung präziser formulieren |

## Technik

- `GET /api/ai/status` prüft über `GET /api/tags` von Ollama, ob der Dienst läuft und das Modell installiert ist.
- `POST /api/ai/plan` mit `{ "description": "…" }` ruft `POST /api/chat` von Ollama auf. Dabei gelten:
  - `format` ist das JSON-Schema des Bauplans (strukturierte Ausgabe);
  - `temperature` 0.2 und fester `seed`;
  - `think: false`, außer `OLLAMA_THINK` sagt etwas anderes;
  - eine Korrekturrunde bei ungültiger Antwort und ein Zeitlimit.
- Die Ollama-Adresse kommt **nur** aus den Umgebungsvariablen des Servers, nie aus dem Browser.
- Der KI-Plan wird mit dem Projekt gespeichert. Beim Öffnen gelten dieselben Einstellungen wieder, auch wenn Ollama dann gerade nicht läuft.

## Was geprüft ist und was nicht

- **Geprüft:**
  - Den Ollama-Client testen Integrationstests gegen einen simulierten Ollama-Server (`tests/integration/ai.test.ts`): gültiger Plan, Korrekturrunde, unsinnige Antwort, Zeitüberschreitung, fehlendes Modell, nicht erreichbar, Modell ohne „think“-Unterstützung und die API-Routen.
  - Die Oberfläche testen Playwright-Tests mit simulierten KI-Endpunkten (`tests/e2e/ai.spec.ts`).
- **Nicht geprüft:** ein Lauf mit einem echten Modell. In der Entwicklungsumgebung waren `ollama.com` und die Modell-Downloads gesperrt. Der erste echte Test findet bei dir statt. Wie gut die Pläne werden, hängt vom Modell ab.
