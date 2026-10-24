# Minecraft Christmas Builder – Hinweise für Claude Code

Lokale Web-App (Next.js 16, React 19, TypeScript strict, three.js). Ein deutscher Freitext, optional über eine KI (OpenRouter in der Cloud oder Ollama lokal), wird zu einem **echten Minecraft-Java-Bauwerk (1.21.11)**. Die App zeigt es in 3D mit echten Texturen aus der Minecraft-Installation des Nutzers, macht es bearbeitbar und exportiert es als `.schem` (Sponge v3) für WorldEdit.

**Lies zuerst `AGENTS.md`:** Next.js 16 weicht von deinem Trainingswissen ab, die Doku liegt in `node_modules/next/dist/docs/`.

**Letzter Großauftrag:** [`docs/AUFTRAG_PROFI_BUILDS.md`](docs/AUFTRAG_PROFI_BUILDS.md) (Profi-Builds: Kennzahlen, Archetypen, Wandtiefe, Umgebung, Variantenauswahl, Detail-Kits) – Phasen 1–7 umgesetzt auf `feature/profi-builds`, Ergebnisse in `docs/TEST_REPORT.md` (Abschnitt „Profi-Builds“); Push erst nach Freigabe durch den Creative Director. Davor abgeschlossen: [`docs/AUFTRAG_PHASEN_1-8.md`](docs/AUFTRAG_PHASEN_1-8.md).

**Qualität messbar halten:** `src/core/analysis/buildQuality.ts` misst Tiefe, Silhouette, Materialien, Rückseite und Licht; `tests/unit/buildQuality.test.ts` hält die Untergrenzen fest (dürfen nur steigen). Neue Bauteile über die Schreibprioritäten des `VoxelBuilder` einordnen und mit `lintHouse` (null Befunde) und null Validator-Reparaturen prüfen. Entscheidungen des Creative Directors: Innenräume nur Licht, Schnee nur auf Wunsch und nur als Schneeschicht, keine Eiszapfen.

## Befehle

```sh
npm ci                  # Abhängigkeiten
npm run dev             # http://localhost:3000
npm run typecheck       # tsc --noEmit (strict, noUncheckedIndexedAccess)
npm run lint            # ESLint, Ziel: 0 Fehler, 0 Warnungen
npm test                # Vitest (Unit + Integration)
npm run test:e2e        # Playwright; baut und startet die App selbst (Port 3200)
npm run worldedit:build # echter WorldEdit-7.4.2-Reader (JDK 21, Maven, Python, Git Bash/WSL)
npm run test:worldedit  # Exporte mit dem echten WorldEdit-Reader lesen (Reader muss gebaut sein)
```

Test gegen die echte Minecraft-Client-Datei: Umgebungsvariable `MCB_MINECRAFT_JAR=<Pfad zur 1.21.11.jar>` setzen, dann `npx vitest run tests/integration/textures.test.ts`.

## Wichtige Orte

| Pfad | Inhalt |
|---|---|
| `docs/ARCHITECTURE.md` | Datenfluss, Datenmodelle, Generatoren, API |
| `docs/TEXTURES.md`, `docs/COMPATIBILITY.md`, `docs/TEST_REPORT.md` | Texturen, Versionen/Registry, Testergebnisse |
| `docs/DETAIL_KITS.md`, `kits/` | eigene Bauteile des Creative Directors (WorldEdit-`.schem` + JSON), Laden in `src/lib/kits/` |
| `research_notes/Bauqualitaet 2026-10/`, `research_notes/Referenzen 2026-10/analyse.md` | Recherche zur Bauqualität und Lückenanalyse gegen die Referenzbilder (die Bilder selbst sind fremde Werke und nicht im Repo) |
| `reports/Minecraft Bautechniken für Generator.md` | Recherchebericht und Umsetzungsplan (Phasen 1–8) |
| `research_notes/Minecraft Bautechniken für Generator/` | Quellennotizen mit Paletten, Dach-, Fenster-, Kreis- und Winterdetails, Helligkeitstabelle (`helligkeit_texturen.tsv`) und Rechenskripten (`skripte/`) |
| `src/core/` | reine Logik: Schema, Registry, Generatoren, Editor, Export, Texturen/Modell-Backen |
| `src/lib/` | Server- und Browser-Hilfen: KI (`src/lib/ai/`: OpenRouter, Ollama, gemeinsame Planprüfung, Einstellungsspeicher), Texturen-Import, Transport, IndexedDB |
| `src/core/ai/providers.ts` | KI-Vertrag für Server und Browser: Anbieter, Modellempfehlungen mit Preis-Schnappschuss, Kostenschätzung, Status-/Einstellungs-Typen |
| `src/components/` | UI (builder, editor, preview) |
| `tests/` | unit, integration, e2e, helpers, worldedit (Java-Harness) |

## Regeln

- **Ehrlichkeit:** keine vorgetäuschten Funktionen. Was nicht gebaut oder nicht getestet ist, steht so in UI und Doku. Testberichte nur mit echten Ergebnissen.
- **Eine Wahrheit:** Vorschau, Materialliste, Editor, Projekte und Export lesen dasselbe kanonische `VoxelModel` (Palette und Indizes, Hash). Blockzustände nur aus der geprüften Registry, gültig für Minecraft Java 1.21.11 (Test gegen `minecraft-data`).
- **Keine Mojang-Dateien ins Repo:** Texturen und Modelle kommen zur Laufzeit aus der Client-Datei des Nutzers (`.minecraft-assets/`, gitignored). Test-Jars werden in den Tests selbst erzeugt.
- **WorldEdit führt beim Einfügen Nachbar-Updates aus.** Gespeichert werden deshalb genau die Zustände, die Minecraft selbst berechnen würde: Treppenecken, Zaun-, Scheiben- und Mauerverbindungen, Türhälften, Stützregeln.
- **Commits** nur nach grünem Lauf (typecheck, lint, Vitest, E2E; WorldEdit-Tests, wenn der Reader gebaut ist). Commit-Nachrichten auf Englisch, UI-Texte und Doku auf Deutsch, Code-Kommentare auf Englisch, Testnamen auf Deutsch (wie im bestehenden Code).

## Umgebung des Nutzers

- **PC:** Windows, RTX 5060 Ti (16 GB), 32 GB RAM, Node.js 24.
- **Minecraft:** Java 1.21.11 über **CurseForge**. Die Client-Datei liegt meist unter `C:\Users\Luca\curseforge\minecraft\Install\versions\1.21.11\1.21.11.jar`. WorldEdit 7.3.18+ oder 7.4.x.
- **Virenschutz:** **Avast**. Er hat schon `start-windows.cmd` in Quarantäne geschoben und eine native `.node`-Datei (lightningcss) blockiert. Bei rätselhaften `Cannot find module …*.node`-Fehlern zuerst an Avast denken; der Projektordner sollte dort als Ausnahme eingetragen sein.
- **Optional:** KI-Planung über OpenRouter (API-Schlüssel des Nutzers) oder Ollama mit `qwen3:14b`, eingerichtet in der App unter „KI einrichten“ (gespeichert in `.mcb-local/ai-settings.json`, gitignored) oder über `.env.local`; siehe `docs/KI.md`. Der OpenRouter-Schlüssel darf nie geloggt, in Fehlermeldungen übernommen oder an den Browser geschickt werden. Echte OpenRouter-Aufrufe nur auf dem Haupt-PC (Testset: `MCB_AI_TESTSET=1`).
