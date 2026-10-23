# Oberfläche: Designregeln

Verbindliche Regeln für alle Komponenten unter `src/components/`. Ziel: **ruhig, seriös, sofort verständlich.** Die 3D-Vorschau ist der Star; alles drumherum tritt zurück.

## Grundsätze

1. **Ein Hauptweg.** Beschreiben → (optional anpassen) → Generieren → Ansehen → Exportieren. Jeder Bereich hat höchstens **eine** primäre Schaltfläche.
2. **Erklären statt voraussetzen.** Fachwörter (Seed, DataVersion, Sponge, Palette) bekommen einen kurzen Klartext daneben oder wandern in einen „Details“-Bereich.
3. **Ehrlich.** Nichts vortäuschen: Was nicht verbunden, nicht geprüft oder nicht verfügbar ist, steht so da (Regel aus `CLAUDE.md`).
4. **Ruhe.** Wenige Farben, keine Verläufe auf Flächen, keine Großbuchstaben-Etiketten, keine Emojis. Weihnachtliches nur im Logo und im Bauwerk selbst.
5. **Lesbar.** Fließtext 14 px, Nebentext 13 px, **nie kleiner als 12 px**. Kontrast WCAG AA.

## Farben (Tokens in `src/app/globals.css`)

| Token | Zweck |
|---|---|
| `canvas` | App-Hintergrund |
| `surface` | Karten/Panels |
| `raised` | Eingabefelder, Kacheln in Panels |
| `hover` | Hover-Fläche |
| `line`, `line-strong` | Rahmen, Trennlinien |
| `fg`, `fg-muted`, `fg-subtle` | Text: Haupt, Neben, Hinweis |
| `accent`, `accent-hover`, `accent-text` | Hauptaktion, Auswahl, Fokus, „bereit“ (Tannengrün) |
| `gold`, `gold-text` | Hervorhebung: „manuell“, aktuelles Projekt |
| `info`, `warning`, `danger` (+ `-text`) | Hinweise, Warnungen, Fehler |

Tönungen über Deckkraft: `bg-accent/12`, `border-warning/40`. Die alte Weihnachtspalette (`night-*`, `fir-*`, `holly-*`, `mist-*`, `snow-50`, `ice-*`) gibt es nicht mehr.

## Bausteine (`src/components/ui/`)

| Datei | Wofür |
|---|---|
| `Button.tsx` | `variant`: `primary` (eine Hauptaktion), `secondary`, `ghost`, `danger`; `size`: `sm`, `md`, `lg`, `icon`, `icon-sm`; `icon`, `loading` |
| `Panel.tsx` | Karte mit Titel, Beschreibung, Aktionen, optional `collapsible`/`defaultOpen`, `footer` |
| `Segmented.tsx` | Auswahl aus wenigen Werten (Radio-Gruppe), optional `description` |
| `Switch.tsx` | An/Aus mit Beschriftung und Beschreibung |
| `Field.tsx` | `Field` (Label, Hinweis, Fehler), `TextInput`, `TextArea`, `Select`, `inputClass` |
| `Badge.tsx` | `Badge` (Töne `neutral`, `accent`, `gold`, `info`, `warning`, `danger`), `StatusDot` |
| `Callout.tsx` | Hinweis-/Warn-/Fehlerbox (`role="alert"` für Fehler nach einer Aktion) |
| `Dialog.tsx` | Modaler Dialog (native `<dialog>`), Titel, Beschreibung, Inhalt, Fußzeile |
| `Icon.tsx` | Eigene Linien-Icons (`<Icon name="…" />`) und `Spinner` |
| `SourceBadge.tsx` | Herkunft einer Einstellung: „von KI“, „aus Text“, „manuell“ |

Neue Bausteine nur, wenn mindestens zwei Stellen sie brauchen. Keine neuen npm-Abhängigkeiten für die Oberfläche.

## Maße

- Abstände im 4-px-Raster; in Panels `p-4`, zwischen Gruppen `gap-4`, innerhalb einer Gruppe `gap-2`.
- Radien: Panels und Dialoge `rounded-xl`, Felder und Knöpfe `rounded-lg`, Badges `rounded-full`.
- Klickflächen mindestens 32 px hoch (`h-8`), Hauptaktionen 40–48 px.
- Icons 16 px (`size-4`) in Text und Knöpfen, 20 px in Werkzeugleisten.

## Texte

- Deutsch, **du**-Form, Satzanfang groß, sonst normale Rechtschreibung. Keine GROSSBUCHSTABEN-Etiketten.
- Knöpfe beschreiben die Aktion: „Bauwerk generieren“, „Als .schem herunterladen“, „Speichern und prüfen“.
- Fehler sagen, **was passiert ist und was man tun kann**: „Der API-Schlüssel wurde abgelehnt. Prüfe ihn auf openrouter.ai.“
- Zahlen mit deutschem Format (`toLocaleString('de-DE')`), Einheiten mit Leerzeichen („12 s“, „0,09 Cent“).

## Zugänglichkeit und Tests

- Jede Eingabe hat ein sichtbares Label oder ein `aria-label`. Fokus ist immer sichtbar.
- Status, der sich ändert, steht in `aria-live="polite"`-Bereichen; Fehler nach Aktionen mit `role="alert"`.
- **Alle bestehenden `data-testid`-Attribute bleiben erhalten** (die Playwright-Tests in `tests/e2e/` hängen daran), ebenso die Texte, die die Tests prüfen. Wer einen geprüften Text ändern muss, passt den Test im selben Commit an.
- Desktop: links Eingabe (Beschreiben, KI-Planung, Anpassen, fester Knopf „Bauwerk generieren“), Mitte Vorschau mit Varianten-Leiste, rechts Export → Projekt → Material → Bearbeiten.
- Mobil (unter `lg`): drei Tabs „Eingabe“, „3D-Vorschau“, „Material & Export“; kein waagerechtes Scrollen.
