'use client';

import type { ParsedDescription } from '@/core/generator/parseDescription';
import { MAX_DESCRIPTION_LENGTH } from '@/core/schema/buildSpec';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { TextArea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';

/** Example wishes: a short chip label and the full text that is inserted. */
export const EXAMPLE_PROMPTS: readonly { label: string; text: string }[] = [
  {
    label: 'Weihnachtshaus',
    text: 'Baue ein gemütliches Weihnachtshaus aus Fichtenholz mit roten Akzenten, vielen Laternen und einem Schornstein.',
  },
  { label: 'Fachwerkhaus mit Turm', text: 'Mittelalterliches Fachwerkhaus mit zwei Geschossen, Erker und rundem Turm vorne links.' },
  { label: 'Japanisches Teehaus', text: 'Japanisches Teehaus mit Shoji-Fenstern und Walmdach, winterlich.' },
  { label: 'Märchenhaus aus Stein', text: 'Großes Steinhaus im Märchenstil mit Gauben und festlicher Dekoration.' },
];

/** Small round step number in front of a panel title ("1 Beschreiben", "2 Anpassen"). */
export function StepNumber({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-5 items-center justify-center rounded-full border border-line-strong bg-raised text-xs font-semibold text-fg-muted"
    >
      {n}
    </span>
  );
}

/** Step 1: the free-text wish, what was understood from it, and examples. */
export function PromptPanel({
  description,
  onDescriptionChange,
  ready,
  parsed,
  conflicts,
  aiActive = false,
}: {
  description: string;
  onDescriptionChange: (value: string) => void;
  /**
   * False until the page is hydrated. The text field stays read-only until then, so nothing
   * typed before hydration gets lost or mixed with the default text.
   */
  ready: boolean;
  parsed: ParsedDescription;
  conflicts: string[];
  /** Settings currently come from an AI plan for this exact text. */
  aiActive?: boolean;
}) {
  const nearLimit = description.length > MAX_DESCRIPTION_LENGTH * 0.9;
  return (
    <Panel
      title="Beschreiben"
      headingId="prompt-heading"
      icon={<StepNumber n={1} />}
      description="Beschreib dein Bauwerk in eigenen Worten – Stil, Material, Größe, Deko."
    >
      <label htmlFor="prompt" className="sr-only">
        Bauwerksbeschreibung
      </label>
      <TextArea
        id="prompt"
        data-testid="prompt-input"
        value={description}
        maxLength={MAX_DESCRIPTION_LENGTH}
        onChange={(e) => onDescriptionChange(e.target.value)}
        readOnly={!ready}
        rows={5}
        aria-describedby="prompt-help"
        className="min-h-32 resize-y"
        placeholder="z. B. Baue ein gemütliches Weihnachtshaus aus Fichtenholz mit Schornstein …"
      />
      <div className="mt-1.5 flex items-start justify-between gap-3 text-xs leading-snug text-fg-subtle">
        <span id="prompt-help">
          {aiActive ? 'Die Einstellungen stammen aus dem KI-Plan für diesen Text.' : 'Erkannte Wünsche werden in die Einstellungen übernommen.'}
        </span>
        <span className={`shrink-0 tabular-nums ${nearLimit ? 'text-warning-text' : ''}`}>
          <span className="sr-only">Zeichen: </span>
          {description.length} / {MAX_DESCRIPTION_LENGTH}
        </span>
      </div>

      <div aria-live="polite" className="flex flex-col gap-3 [&:not(:empty)]:mt-3" data-testid="parse-result">
        {!aiActive && parsed.recognized.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-fg-muted">Erkannt</p>
            <ul className="flex flex-wrap gap-1.5" aria-label="Erkannte Wünsche" data-testid="recognized-list">
              {parsed.recognized.map((r, i) => (
                <li
                  key={`${r.phrase}-${i}`}
                  className="rounded-full border border-line bg-raised px-2.5 py-0.5 text-xs leading-5 text-fg-muted"
                  title={`Aus „${r.phrase}“`}
                >
                  {r.effect}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {!aiActive && parsed.explanation ? (
          <p className="text-[13px] leading-snug text-fg-subtle" data-testid="parse-explanation">
            {parsed.explanation}
          </p>
        ) : null}
        {!aiActive && parsed.unsupported.length > 0 ? (
          <Callout tone="warning" title="Nicht umsetzbar" data-testid="parse-unsupported">
            <ul aria-label="Nicht umsetzbare Wünsche" className="flex flex-col gap-0.5">
              {parsed.unsupported.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Callout>
        ) : null}
        {!aiActive && parsed.warnings.length > 0 ? (
          <Callout tone="warning" title="Nicht umgesetzt" data-testid="parse-warnings">
            <ul aria-label="Nicht umgesetzte Wünsche" className="flex flex-col gap-0.5">
              {parsed.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Callout>
        ) : null}
        {conflicts.length > 0 ? (
          <Callout tone="neutral" title="Deine Einstellungen haben Vorrang" data-testid="parse-conflicts">
            <ul aria-label="Vorrang der Einstellungen" className="flex flex-col gap-0.5">
              {conflicts.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Callout>
        ) : null}
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-2 text-[13px] font-medium text-fg-muted" id="examples-label">
          Beispiel einsetzen <span className="font-normal text-fg-subtle">(ersetzt deinen Text)</span>
        </p>
        <ul className="flex flex-wrap gap-1.5" aria-labelledby="examples-label">
          {EXAMPLE_PROMPTS.map((example) => (
            <li key={example.label}>
              <button
                type="button"
                onClick={() => onDescriptionChange(example.text)}
                title={example.text}
                aria-label={`Beispiel ${example.label} einsetzen: ${example.text}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-raised px-3 text-[13px] text-fg-muted transition-colors hover:border-line-strong hover:bg-hover hover:text-fg"
              >
                <Icon name="plus" className="size-3.5 text-fg-subtle" />
                {example.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

/**
 * The main action, pinned to the bottom of the input column (sticky on mobile): generate
 * button, what generates (rule-based or with which AI) and the discard warning.
 */
export function GenerateBar({
  onGenerate,
  busy,
  planning = false,
  ready,
  confirmRegenerate = false,
  plannerLabel,
  className = '',
}: {
  onGenerate: () => void;
  busy: boolean;
  /** The AI is currently planning. */
  planning?: boolean;
  /** False until the page is hydrated – the button would not work before that. */
  ready: boolean;
  /** Manual edits exist: the next click regenerates and discards them. */
  confirmRegenerate?: boolean;
  /** One line: who plans and who sets the blocks. */
  plannerLabel: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {confirmRegenerate ? (
        <Callout tone="warning" role="alert" data-testid="regenerate-warning">
          Neu generieren verwirft deine manuellen Block-Änderungen. Zum Bestätigen erneut klicken.
        </Callout>
      ) : null}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={onGenerate}
        disabled={!ready}
        loading={busy}
        icon={<Icon name={confirmRegenerate ? 'refresh' : 'cube'} />}
        data-testid="generate-button"
        aria-describedby="generator-mode"
      >
        {planning ? 'KI plant …' : busy ? 'Wird generiert …' : confirmRegenerate ? 'Trotzdem neu generieren' : 'Bauwerk generieren'}
      </Button>
      <p id="generator-mode" className="text-center text-xs leading-snug text-fg-subtle" data-testid="generator-mode">
        {plannerLabel}
      </p>
    </div>
  );
}
