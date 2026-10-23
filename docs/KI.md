# KI-Planung (optional): OpenRouter oder Ollama

Die App funktioniert **ohne KI vollständig**: Ein regelbasierter Text-Leser versteht deine Beschreibung und der Generator baut daraus das Bauwerk. Optional kann ein Sprachmodell freie, verwinkelte Wünsche besser in einen **Bauplan** übersetzen. Dafür gibt es zwei Wege:

| | **OpenRouter** (Cloud, empfohlen) | **Ollama** (lokal) |
|---|---|---|
| Einrichtung | Konto, Guthaben, API-Schlüssel – etwa 5 Minuten | Programm installieren, Modell laden (5–9 GB) |
| Kosten | Bruchteile eines Cents pro Plan (siehe unten) | keine |
| Geschwindigkeit | meist wenige Sekunden | hängt von der Grafikkarte ab |
| Datenschutz | Beschreibungstext geht an OpenRouter und den Modellanbieter | alles bleibt auf deinem PC |

Ohne Einrichtung bleibt die KI aus, und die App greift **nicht** auf das Internet zu.

## Was die KI darf und was nicht

- **Die KI liefert nur einen Bauplan:** Bauwerkstyp, Stil, Größe, Material, Farben, Detailgrad, Feinparameter (z. B. Turm, Anbau, Maße), eine kurze Erklärung und eine Liste der Wünsche, die sich nicht umsetzen lassen.
- **Der Plan wird streng geprüft (Zod-Schema).** Unbekannte Felder oder Werte werden abgelehnt. Kleine Abweichungen wie gerade Maße werden korrigiert; bei einer ungültigen Antwort gibt es genau eine Korrekturrunde.
- **Blöcke, Geometrie und Export** erzeugt immer der regelbasierte Generator. Die KI gibt keine Blocklisten oder NBT-Daten aus.
- **Die Oberfläche kennzeichnet die Quelle:** Einstellungen aus dem KI-Plan tragen das Etikett „von KI“, oben steht der Planer (z. B. „KI-Plan: GPT-6 Luna (OpenRouter)“ oder „KI-Plan: qwen3:14b (lokal)“) – nur, wenn das Bauwerk wirklich aus einem KI-Plan entstanden ist. Sonst steht dort „Regelbasierter Generator“.
- **Rückfall:** Ist die KI nicht erreichbar, zu langsam oder liefert keinen gültigen Plan, erzeugt die App das Bauwerk regelbasiert aus dem Text und zeigt einen Hinweis.

## OpenRouter einrichten

[OpenRouter](https://openrouter.ai) ist ein Dienst, über den man mit **einem** Konto und **einem** Schlüssel viele KI-Modelle verschiedener Anbieter (OpenAI, Anthropic, …) nutzen kann. Bezahlt wird vorab mit Guthaben; jede Anfrage zieht ihren Preis davon ab.

1. **Konto anlegen:** auf <https://openrouter.ai> oben rechts „Sign in“ (mit Google, GitHub oder E-Mail).
2. **Guthaben aufladen:** <https://openrouter.ai/settings/credits> → „Add Credits“. OpenRouter berechnet beim Aufladen eine Gebühr von **5,5 %, mindestens 0,80 $** (Stand 23.10.2026). Beispiel: 10 $ Guthaben kosten 10,80 $. Wegen der Mindestgebühr lohnt sich eine einmalige größere Aufladung mehr als viele kleine. Für diese App reichen 10 $ für Tausende Pläne (siehe „Kosten“).
3. **API-Schlüssel erstellen:** <https://openrouter.ai/settings/keys> → „Create Key“. Als Namen z. B. „Minecraft Christmas Builder“ eintragen. **Tipp:** Setze beim Schlüssel ein Ausgabelimit (z. B. 2 $) – dann kann über diesen Schlüssel nie mehr ausgegeben werden. Den Schlüssel (er beginnt mit `sk-or-v1-`) sofort kopieren; OpenRouter zeigt ihn nur einmal an.
4. **In der App eintragen:** auf **„KI einrichten“** klicken, „OpenRouter“ wählen, den Schlüssel einfügen, ein Modell wählen (die Empfehlung ist vorausgewählt) und speichern. Die App prüft danach Schlüssel, Guthaben und Modell – das **kostet nichts** – und meldet z. B. „Bereit: GPT-6 Luna über OpenRouter.“
5. Beim Generieren die KI-Planung einschalten und „Bauwerk generieren“ klicken.

Fortgeschritten: Statt über die App kann der Schlüssel auch in `.env.local` stehen (`OPENROUTER_API_KEY=…`, siehe `.env.example`). Einstellungen aus der App haben Vorrang vor `.env.local`; nur wenn in der App kein Schlüssel gespeichert ist, gilt der aus `.env.local`.

### Welches Modell? (Empfehlung)

Die App braucht von der KI keine Kreativität, sondern **zuverlässige Katalog-Entscheidungen**: einen deutschen Wunsch verstehen und daraus streng nach Schema einen JSON-Bauplan aus festen Werten füllen. Wichtig sind deshalb: strenge strukturierte Ausgabe (JSON-Schema), gutes Deutsch, kurze Antwortzeit und ein niedriger Preis – ein großes „Denk“-Modell bringt hier wenig.

| Modell (OpenRouter-ID) | Rolle | Preis je 1 Mio. Tokens (Eingabe / Ausgabe) | typische Dauer | Warum |
|---|---|---|---|---|
| **GPT-6 Luna** (`openai/gpt-6-luna`) | **Empfehlung** | 0,10 $ / 0,50 $ | ca. 5 s | schnell, sehr günstig und hält das Bauplan-Format zuverlässig ein |
| Claude Haiku 5.5 (`anthropic/claude-haiku-5.5`) | beste Qualität | 0,10 $ / 0,50 $ | ca. 10 s | versteht lange und verwinkelte Wünsche am besten; denkt ausführlicher nach und ist dadurch etwas langsamer und pro Plan etwas teurer |
| Ling 3.1 Flash (`inclusionai/ling-3.1-flash`) | am günstigsten | 0,075 $ / 0,225 $ | ca. 4 s | etwa halb so teuer, bei kurzen Wünschen kaum schlechter; **aber:** strenges JSON bietet nur ein Anbieter (DeepInfra) – fällt der aus, schlägt die Planung fehl |

**Nachdenk-Stufe:** „Kurz“ (empfohlen) – kaum teurer und kaum langsamer als „Aus“, aber robuster bei verneinten oder widersprüchlichen Wünschen. „Gründlich“ nur für sehr lange Beschreibungen.

**Quellen und Ehrlichkeit:** Preise, Unterstützung strukturierter Ausgabe und Anbieter stammen aus der Modell- und Endpunkt-Liste von OpenRouter, Qualität und Geschwindigkeit aus den Messungen von Artificial Analysis (Intelligence Index, Ausgabegeschwindigkeit, Zeit bis zum ersten Token), **Stand 23.10.2026**. Mit dem Testset dieser App (77 Wünsche, siehe unten) sind die Modelle **noch nicht gemessen** – das ist der nächste Schritt auf dem Haupt-PC. Die App zeigt im Einrichtungsdialog die aktuellen Live-Preise von OpenRouter, wenn sie sie abrufen kann, sonst diesen Stand.

### Kosten

Eine Planung schickt etwa **6 000 Tokens** (Regeln, Stilkatalog, 2–4 Beispiele, dein Wunsch) und bekommt etwa **500 Tokens** Plan zurück; dazu kommen die Nachdenk-Tokens (geschätzt: „Aus“ 0, „Kurz“ ~800, „Gründlich“ ~2 500; sie werden wie Ausgabe berechnet). Geschätzt pro Plan:

| Modell | Aus | **Kurz** | Gründlich | Pläne mit 2 $ (Kurz) | Pläne mit 10 $ (Kurz) |
|---|---|---|---|---|---|
| GPT-6 Luna | ≈ 0,09 Cent | **≈ 0,13 Cent** | ≈ 0,21 Cent | etwa 1 600 | etwa 8 000 |
| Claude Haiku 5.5 | ≈ 0,09 Cent | **≈ 0,13 Cent** (eher mehr, denkt länger) | ≈ 0,21 Cent | bis zu 1 600 | bis zu 8 000 |
| Ling 3.1 Flash | ≈ 0,06 Cent | **≈ 0,07 Cent** | ≈ 0,11 Cent | etwa 2 700 | etwa 13 400 |

- **2 €** sind je nach Wechselkurs meist etwas mehr als 2 $; mit 2 € Guthaben kommst du also mindestens auf die Zahl der Spalte „2 $“. Die Aufladegebühr (5,5 %, mind. 0,80 $) kommt beim Kauf des Guthabens dazu.
- Braucht ein Plan die Korrekturrunde, kostet er etwa das Doppelte (das passiert selten).
- Das sind **Schätzungen**. Den echten Preis jeder Planung meldet OpenRouter in der Antwort zurück (`usage.cost`); die App speichert ihn mit dem KI-Plan im Projekt. Jede einzelne Anfrage siehst du auch unter <https://openrouter.ai/activity>.
- Die Statusprüfung (Schlüssel, Guthaben, Modell) und die Preisliste kosten nichts.

### Datenschutz

- **Was die App an OpenRouter schickt:** deinen Beschreibungstext, die festen Regeln mit dem Stilkatalog und 2–4 Beispielpläne. Keine Projekte, keine Minecraft-Dateien, keine Blockdaten und keine Angaben über dich – außer dem, was du selbst in die Beschreibung schreibst.
- **Wer den Text sieht:** OpenRouter und der Anbieter des gewählten Modells (z. B. OpenAI, Anthropic oder DeepInfra). Beide verarbeiten ihn nach ihren eigenen Datenschutzregeln. In deinem OpenRouter-Konto (Einstellungen → Privacy) kannst du festlegen, welche Anbieter genutzt werden dürfen, z. B. keine, die Eingaben speichern oder zum Training verwenden.
- **Dein API-Schlüssel** liegt nur auf deinem PC in der Datei `.mcb-local/ai-settings.json` im Projektordner. Der Ordner ist von Git ausgeschlossen (`.gitignore`). Der Schlüssel geht **nie an den Browser** (die App zeigt nur eine Kurzform wie `sk-or-v1-…a1b2`), wird nicht protokolliert und erscheint in keiner Fehlermeldung. Die Datei ist nicht verschlüsselt: Wer an deinem Windows-Benutzerkonto Dateien lesen kann, kann auch den Schlüssel lesen. Ein Ausgabelimit am Schlüssel begrenzt den möglichen Schaden; löschen kannst du ihn jederzeit unter <https://openrouter.ai/settings/keys>.
- **Schutz vor fremdem Zugriff:** Die App lauscht auch im Heimnetz. KI-Einstellungen lassen sich trotzdem nur **an diesem PC** über `http://localhost:…` ändern, und nur die App selbst darf Planungen auslösen – eine fremde Webseite im Browser kann weder deinen Schlüssel ändern noch dein Guthaben verbrauchen.

## Ollama einrichten (lokal, kostenlos)

1. **Ollama installieren:** von <https://ollama.com/download> den Windows-Installer laden und ausführen. Ollama läuft danach im Hintergrund (Symbol im Infobereich).
2. **Modell laden.** In der Eingabeaufforderung oder PowerShell:
   ```text
   ollama pull qwen3:14b
   ```
   Der Download ist etwa 9 GB groß und einmalig.
3. **In der App:** „KI einrichten“ → „Ollama“ wählen; Adresse (`http://127.0.0.1:11434`) und Modell (`qwen3:14b`) sind vorausgefüllt. Speichern.
4. Dort sollte „Lokale KI bereit (Ollama, Modell qwen3:14b)“ stehen. Beim Generieren die KI-Planung einschalten.

Alternativ in `.env.local`: `MCB_AI_PROVIDER=ollama` und `OLLAMA_MODEL=qwen3:14b` (weitere Variablen in `.env.example`), dann die App neu starten. Einstellungen aus der App haben Vorrang.

### Modellempfehlung für Ollama

| Modell | Größe ca. | Einschätzung |
|---|---|---|
| `qwen3:14b` | 9 GB | **Empfehlung für 16 GB Grafikspeicher** (z. B. RTX 5060 Ti): genau, gutes Deutsch, zuverlässige strukturierte Ausgabe |
| `qwen3:8b` | 5 GB | **Empfehlung für 8 GB Grafikspeicher**: passt ganz hinein |
| `gemma3:12b` | 8 GB | Alternative mit gutem Deutsch |
| `gemma3:4b` | 3 GB | sehr schnell, ungenauer bei langen Wünschen |

Passt ein Modell nicht ganz in den Grafikspeicher, rechnet Ollama einen Teil auf der CPU – das funktioniert, ist aber deutlich langsamer. Die Tabelle beruht auf allgemeinem Wissen über diese Modelle; **mit dieser App gemessen wurde noch keines** (siehe „Testset“). Beim allerersten Aufruf lädt Ollama das Modell in den Speicher, das dauert länger.

## Fehlerbehebung

Jede Meldung sagt, was passiert ist und was zu tun ist. Bei jedem KI-Fehler baut die App das Bauwerk trotzdem – regelbasiert.

| Meldung (Anfang) | Bedeutung und Lösung |
|---|---|
| „KI-Planung ist nicht aktiviert …“ | Es ist kein Anbieter gewählt. Unter „KI einrichten“ OpenRouter oder Ollama verbinden. |
| „Kein API-Schlüssel hinterlegt …“ | OpenRouter ist gewählt, aber ohne Schlüssel. Schlüssel erstellen (siehe oben) und unter „KI einrichten“ eintragen. |
| „Das ist kein OpenRouter-Schlüssel …“, „… enthält Leerzeichen …“, „… ist zu lang …“, „… ist unvollständig …“, „… ist leer …“ | Beim Kopieren ging etwas schief. Den Schlüssel vollständig und ohne zusätzliche Zeichen einfügen; er beginnt mit `sk-or-`. |
| „Der API-Schlüssel wurde von OpenRouter abgelehnt …“ | Schlüssel ungültig, gelöscht oder deaktiviert. Auf <https://openrouter.ai/settings/keys> einen neuen erstellen und eintragen. |
| „Der hinterlegte API-Schlüssel enthält unerlaubte Zeichen …“ | Meist ein falsch kopierter Schlüssel in `.env.local` oder der Einstellungsdatei. Neu eintragen. |
| „Kein Guthaben mehr auf OpenRouter …“ | Guthaben aufgebraucht oder das Limit des Schlüssels erreicht. Auf <https://openrouter.ai/settings/credits> aufladen oder das Limit des Schlüssels erhöhen. |
| „Hinweis: Laut OpenRouter wurde auf deinem Konto noch kein Guthaben gekauft …“ | Ohne Guthaben funktionieren nur kostenlose Modelle (ID endet auf `:free`). Guthaben aufladen. |
| „Das Modell „…“ gibt es bei OpenRouter nicht (mehr) …“, „… ist bei OpenRouter unbekannt …“, „… steht nicht in der aktuellen Modellliste …“ | Tippfehler in der Modell-ID oder das Modell wurde entfernt. Ein empfohlenes Modell wählen oder die ID von <https://openrouter.ai/models> übernehmen (Form `anbieter/modell`). |
| „… unterstützt kein strenges JSON-Format (strukturierte Ausgabe) …“, „Kein Anbieter des Modells … unterstützt das Bauplan-Format …“ | Das Modell kann den Bauplan nicht zuverlässig im vorgegebenen Format liefern. Eines der empfohlenen Modelle wählen. |
| „Die Modellliste von OpenRouter ist gerade nicht abrufbar …“ | Der Schlüssel ist gültig, das Modell konnte aber nicht geprüft werden. Kurz warten und erneut prüfen. |
| „Die aktuellen Preise von OpenRouter sind gerade nicht abrufbar …“ | Der Dialog zeigt die Preise vom 23.10.2026. Kein Fehler, nur nicht aktuell. |
| „OpenRouter ist nicht erreichbar …“ | Keine Internetverbindung, oder Firewall bzw. Virenschutz (z. B. Avast) blockiert die App. Verbindung prüfen, ggf. Node.js in Avast freigeben. |
| „OpenRouter antwortet gerade nicht richtig …“, „OpenRouter oder der Modellanbieter hat gerade eine Störung …“ | Problem bei OpenRouter oder beim Modellanbieter. In ein paar Minuten noch einmal versuchen oder ein anderes Modell wählen. |
| „Zu viele Anfragen …“ | Ratenlimit erreicht. Etwa eine Minute warten. |
| „OpenRouter hat nicht innerhalb von 60 s geantwortet …“, „Zeitüberschreitung bei OpenRouter …“ | Noch einmal versuchen, die Nachdenk-Stufe kürzer stellen oder ein schnelleres Modell wählen. Das Zeitlimit lässt sich mit `MCB_AI_TIMEOUT_MS` in `.env.local` ändern. |
| „OpenRouter hat die Anfrage abgelehnt (HTTP 403 …)“ | Moderation des Anbieters oder eine Einschränkung des Schlüssels. Beschreibung anders formulieren, Schlüssel-Einstellungen prüfen. |
| „… lieferte auch nach einer Korrekturrunde keinen gültigen Bauplan …“ | Beschreibung genauer formulieren oder ein anderes Modell wählen. Auch dieser Versuch kann etwas gekostet haben (die App bekommt den Betrag mitgeteilt). |
| „Die gespeicherten KI-Einstellungen (…) sind beschädigt …“ / „… haben ein unbekanntes Format …“ | Die Datei `.mcb-local/ai-settings.json` wurde von Hand verändert oder ist kaputt; sie wird ignoriert. Unter „KI einrichten“ neu speichern (das ersetzt sie). |
| „Diese Einstellungen lassen sich nur an dem PC ändern, auf dem die App läuft …“ | Die App wurde über die Netzwerkadresse geöffnet. Am PC selbst `http://localhost:3000` öffnen. |
| „Diese Anfrage kommt nicht von der App selbst …“ | Eine fremde Webseite oder Browser-Erweiterung hat versucht, die App zu steuern. Die App direkt über `http://localhost:3000` benutzen. |
| „Die Einstellungen konnten nicht gespeichert werden (…)“ | Der Projektordner ist schreibgeschützt oder der Virenschutz sperrt `.mcb-local`. Ordner als Ausnahme eintragen. |
| „Ollama ist … nicht erreichbar“ | Ollama-App starten; prüfen, ob <http://127.0.0.1:11434> im Browser „Ollama is running“ zeigt. |
| „Ollama läuft, aber das Modell … ist nicht installiert“ / „Das Modell … ist nicht installiert“ | Im Terminal `ollama pull <modell>` ausführen, dann erneut prüfen. |
| „Die lokale KI hat nicht innerhalb von … s geantwortet“ | Kleineres Modell wählen oder `MCB_AI_TIMEOUT_MS` erhöhen. |
| „Die lokale KI lieferte keinen gültigen Bauplan“ | Anderes Modell probieren (z. B. `qwen3:14b`) und die Beschreibung präziser formulieren. |

## Der Bauplan

KI und regelbasierter Text-Leser liefern **dasselbe flache Planformat** (`src/core/ai/planSchema.ts`). Es wird aus dem Katalog erzeugt, enthält keine Koordinaten und keine freien Block-IDs:

| Gruppe | Felder |
|---|---|
| Text | `explanation` (kurze deutsche Zusammenfassung), `unsupported` (Wünsche, die der Generator nicht baut) |
| Auswahl | `kind`, `style`, `palette`, `theme`, `size`, `roofType`, `roofProfile`, `wings`, `annex`, `tower`, `towerPosition`, `symmetry`, `windows`, `windowFamily`, `doorFamily`, `lanternDensity` – jeweils mit `"auto"` für „nicht angegeben“ |
| Zahlen | `detailLevel`, `floors`, `width`, `depth`, `overhang`, `dormers` – `null` für „nicht angegeben“ |
| Schalter | `porch`, `balcony`, `chimney`, `oriel`, `jetty`, `garden`, `soulLanterns`, `garland`, `christmasTree`, `presents`, `snow` – `null` für „nicht angegeben“ |
| Materialien | `wallMaterial`, `roofMaterial`, `frameMaterial`, `plinthMaterial`, `accentMaterial` – nur aus einer festen Liste je Rolle, nur wenn ein Material genannt wird |

Alle Felder sind Pflicht; das macht die strukturierte Ausgabe robuster. `normalizePlan` korrigiert kleine Abweichungen (gerade Maße → ungerade, Grenzen, stilfremde Palette), danach prüft Zod streng. Die App zeigt den Plan Feld für Feld an.

## Technik

### Einstellungen

- Die App speichert die KI-Einstellungen in `.mcb-local/ai-settings.json` (Ordner änderbar mit `MCB_SETTINGS_DIR`): `{ version: 1, provider, openrouter: { apiKey?, model, reasoning }, ollama: { baseUrl, model } }`, mit Zod geprüft, atomar geschrieben (temporäre Datei, dann Umbenennen).
- **Vorrang:** App-Datei > Umgebungsvariablen (`.env.local`) > Standard. Ausnahme Schlüssel: Steht in der Datei keiner, gilt `OPENROUTER_API_KEY`.
- Eine kaputte Datei gilt als nicht vorhanden; Status und Einstellungsansicht melden das.

### Ablauf einer Planung

- `POST /api/ai/plan` mit `{ "description": "…" }` schickt an den gewählten Anbieter denselben Prompt:
  - **System-Prompt** auf Deutsch mit dem Stilkatalog (Name, Beschreibung, Stichwörter, Paletten), dem Planformat und den Regeln;
  - **2–4 Beispielpaare** (Few-Shot), passend zum Text ausgewählt aus 26 kuratierten Beispielen (`src/core/ai/fewShotExamples.ts`; sie sind vom Testset getrennt);
  - `temperature` **0**; danach dieselbe Prüfung (`src/lib/ai/planValidation.ts`): JSON herauslösen, normalisieren, Zod, bei Fehlern **genau eine Korrekturrunde** mit den Prüffehlern; ein Zeitlimit für beide Runden zusammen.
- **OpenRouter** (`src/lib/ai/openRouterPlanner.ts`): `POST https://openrouter.ai/api/v1/chat/completions` mit
  - `response_format: { type: "json_schema", json_schema: { name: "bauplan", strict: true, schema } }` – `schema` ist eine strict-taugliche Ableitung des Plan-Schemas (nur `type`, `properties`, `required`, `additionalProperties: false`, `items`, `enum`, `anyOf`, `description`; Zahlen- und Längengrenzen stehen in der Beschreibung und werden danach von Zod geprüft) ([Structured Outputs](https://openrouter.ai/docs/features/structured-outputs));
  - `provider: { require_parameters: true }`: nur Anbieter, die alle Parameter – vor allem das JSON-Schema – unterstützen; ohne diese Einstellung dürfte ein Anbieter unbekannte Parameter einfach ignorieren ([Provider Routing](https://openrouter.ai/docs/features/provider-routing));
  - `reasoning: { effort: "none" | "low" | "medium", exclude: true }` – „none“ schaltet das Nachdenken ab, der Denktext wird nicht gebraucht ([Reasoning Tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens));
  - `max_tokens` als Deckel (2 000 / 6 000 / 12 000 je Stufe – Nachdenk-Tokens zählen bei den meisten Anbietern mit);
  - Kopfzeilen `Authorization: Bearer …`, `HTTP-Referer`, `X-Title: Minecraft Christmas Builder`; Zeitlimit `MCB_AI_TIMEOUT_MS` (Standard 60 s).
  - Antwort: `choices[0].message.content`; der Preis kommt in `usage.cost` (US-Dollar), Tokens in `usage.prompt_tokens`, `usage.completion_tokens`, `usage.completion_tokens_details.reasoning_tokens` ([Chat Completions](https://openrouter.ai/docs/api-reference/chat-completion), [Usage Accounting](https://openrouter.ai/docs/use-cases/usage-accounting)). Die App addiert die Kosten beider Runden.
  - Akzeptiert kein Anbieter des Modells `temperature` oder `reasoning` (manche Denkmodelle erlauben keine Temperatur, manche Modelle kein Nachdenken), wiederholt die App die Anfrage einmal ohne diese beiden Parameter – das JSON-Schema bleibt Pflicht.
  - Fehler werden in verständliche Meldungen mit Code übersetzt (`auth`, `credits`, `model`, `unsupported`, `rate_limit`, `timeout`, `upstream`, `unreachable`, `no_key`, `invalid`), siehe Fehlerbehebung.
- **Ollama** (`src/lib/ai/ollamaPlanner.ts`): `POST /api/chat` mit `format` = JSON-Schema des Bauplans, fester `seed` 7, `num_ctx` 8192, `think: false` (außer `OLLAMA_THINK` sagt etwas anderes; lehnt ein Modell `think` ab, wird ohne wiederholt; landet die Antwort im Feld `thinking`, wird sie dort gelesen).

### Status und Modellliste (kostenlos)

- `GET /api/ai/status`: bei OpenRouter `GET /api/v1/key` (Schlüssel gültig? `limit_remaining` = Restbetrag eines Schlüssel-Limits), falls kein Limit gesetzt ist `GET /api/v1/credits` (klappt nur mit Management-Schlüsseln, sonst bleibt das Guthaben unbekannt), und die Modellliste `GET /api/v1/models` (gibt es das Modell, bietet es `structured_outputs`?) – je mit 3–5 s Zeitlimit. Bei Ollama `GET /api/tags`. Bei „aus“ kein Netzwerkzugriff.
- `GET /api/ai/models?model=<id>`: Live-Preise der empfohlenen Modelle und des angefragten Modells aus der Modellliste (eine Stunde im Speicher), sonst der Preis-Schnappschuss aus `src/core/ai/providers.ts` mit `live: false`.

### Sicherheit

- Der Schlüssel verlässt den Server nie (`GET /api/ai/settings` liefert nur `hasKey` und eine maskierte Kurzform), wird nicht protokolliert und aus allen weitergegebenen Fehlertexten von OpenRouter entfernt.
- `PUT /api/ai/settings` nur, wenn die Anfrage an `localhost`/`127.0.0.1`/`[::1]` ging und von der App selbst kommt (`Origin` bzw. `Sec-Fetch-Site`); sonst 403. `POST /api/ai/plan` nur von der App selbst (fremde Webseiten dürfen kein Guthaben verbrauchen). Einstellungen, Status und Planung lehnen außerdem fremde Hostnamen mit Punkt ab (Schutz vor DNS-Rebinding, bei dem eine fremde Domain auf diesen PC zeigt); `localhost`, IP-Adressen und einfache Rechnernamen im Heimnetz funktionieren.
- Der KI-Plan wird mit dem Projekt gespeichert (mit Anbieter und Kosten). Beim Öffnen gelten dieselben Einstellungen wieder, auch wenn die KI dann nicht erreichbar ist.

## Testset und Messung

- `tests/fixtures/planTestset.ts` enthält **77 deutsche Wünsche** mit den erwarteten Planfeldern.
- Der **regelbasierte Text-Leser** trifft alle 77 vollständig (`tests/unit/planTestset.test.ts`), und jeder dieser Wünsche wird zusätzlich bis zum fertigen Bauwerk erzeugt und geprüft (`tests/unit/wishesEndToEnd.test.ts`).
- **Messung mit einem echten Modell** (auf dem Haupt-PC, nachdem die KI in der App eingerichtet ist). Der Lauf nimmt den in der App gewählten Anbieter (sonst `.env.local`):
  In PowerShell:
  ```text
  $env:MCB_AI_TESTSET=1
  npx vitest run tests/integration/ollamaTestset.test.ts
  ```
  In der Eingabeaufforderung (cmd) entsprechend `set MCB_AI_TESTSET=1` und in der nächsten Zeile derselbe `npx`-Befehl.
  Nur Ollama (wie bisher, unabhängig von der Auswahl in der App): `MCB_OLLAMA_TESTSET=1` statt `MCB_AI_TESTSET=1`.
  Mit OpenRouter kostet ein Lauf geschätzt 77 × 0,13 Cent ≈ **0,10 $** (GPT-6 Luna, „Kurz“). Für ein anderes Modell vorher in der App das Modell umstellen.
- Der Lauf misst Gültigkeitsquote, Korrekturrunden, Dauer (Mittel, Median, p95), **Gesamtkosten** und Treffer je Wunsch und je Feld, vergleicht mit dem Text-Leser und schreibt `reports/ki-testset-<modell>.json` (z. B. `reports/ki-testset-openai-gpt-6-luna.json`).

## Was geprüft ist und was nicht

- **Geprüft (automatische Tests):**
  - OpenRouter-Client gegen einen simulierten OpenRouter-Server (`tests/integration/openRouter.test.ts`): gültiger Plan, Korrekturrunde, Kosten und Tokens aus `usage`, Request-Format (strenges Schema, `require_parameters`, Nachdenk-Stufen, Kopfzeilen), Fehler 401/402/408/429/5xx, unbekanntes Modell, kein passender Anbieter, Fehler im Antworttext, Zeitüberschreitung, nicht erreichbar, Schlüssel nie in Logs oder Fehlern, Status mit und ohne Schlüssel, Guthaben, Modellprüfung, Modellliste mit Zwischenspeicher und Rückfall.
  - Einstellungen und Routen (`tests/integration/aiSettings.test.ts`): Vorrang Datei > Umgebung > Standard, Maskierung, atomares Schreiben, kaputte Datei, strenge Prüfung beim Speichern, Herkunfts- und Host-Prüfung (403), Verteilung auf die Anbieter.
  - Ollama-Client gegen einen simulierten Ollama-Server (`tests/integration/ai.test.ts`).
  - Derselbe Messcode wie für echte Modelle läuft immer gegen simulierte Modelle (Ollama und OpenRouter, Trockenlauf).
- **Nicht geprüft:** ein Lauf gegen das **echte OpenRouter** (auf dem Arbeitsrechner gibt es keinen Schlüssel) und ein Lauf mit einem echten Ollama-Modell. Die verwendeten OpenRouter-Parameter folgen der Dokumentation vom 23.10.2026; ob alle empfohlenen Modelle sie genau so annehmen und wie gut sie planen, zeigt erst der Testset-Lauf auf dem Haupt-PC.
