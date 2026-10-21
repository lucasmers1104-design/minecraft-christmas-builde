'use client';

import { MAX_DESCRIPTION_LENGTH } from '@/core/schema/buildSpec';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';

export const EXAMPLE_PROMPTS = [
  'Baue ein gemütliches Weihnachtshaus aus Fichtenholz, mit verschneitem Dach, roten Akzenten, leuchtenden Fenstern und einem Schornstein.',
  'Eine kleine verschneite Hütte aus Eiche mit eisblauen Fenstern.',
  'Großes Steinhaus im Märchenstil mit festlicher Dekoration.',
];

export function PromptPanel({
  description,
  onDescriptionChange,
  onGenerate,
  busy,
  ready,
  textInterpretationAvailable,
}: {
  description: string;
  onDescriptionChange: (value: string) => void;
  onGenerate: () => void;
  busy: boolean;
  /** False until the page is hydrated – the button would not work before that. */
  ready: boolean;
  textInterpretationAvailable: boolean;
}) {
  return (
    <Panel
      title="Beschreibung"
      headingId="prompt-heading"
      description="Beschreibe dein Bauwerk in eigenen Worten."
    >
      <label htmlFor="prompt" className="sr-only">
        Bauwerksbeschreibung
      </label>
      <textarea
        id="prompt"
        data-testid="prompt-input"
        value={description}
        maxLength={MAX_DESCRIPTION_LENGTH}
        onChange={(e) => onDescriptionChange(e.target.value)}
        rows={5}
        className="w-full resize-y rounded-xl border border-white/10 bg-night-950/70 p-3 text-sm leading-relaxed text-snow-50 placeholder:text-mist-400 focus:border-gold-400/60 focus:outline-none"
        placeholder="z. B. Baue ein gemütliches Weihnachtshaus aus Fichtenholz …"
      />
      <div className="mt-1 flex justify-between text-[11px] text-mist-400">
        <span>
          {textInterpretationAvailable
            ? 'Erkannte Wünsche werden in die Einstellungen übernommen.'
            : 'Hinweis: Der Freitext wird in dieser Version noch nicht ausgewertet – es gelten die Einstellungen unten.'}
        </span>
        <span aria-hidden="true">
          {description.length}/{MAX_DESCRIPTION_LENGTH}
        </span>
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-mist-400">Beispiele</p>
        <ul className="flex flex-col gap-1.5">
          {EXAMPLE_PROMPTS.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => onDescriptionChange(example)}
                className="w-full rounded-lg border border-white/6 bg-white/3 px-3 py-2 text-left text-xs leading-snug text-mist-300 transition-colors hover:border-white/15 hover:text-snow-50"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Button
        variant="primary"
        className="mt-4 w-full text-base"
        onClick={onGenerate}
        disabled={busy || !ready}
        data-testid="generate-button"
        aria-describedby="generator-mode"
      >
        {busy ? 'Wird generiert …' : 'Bauwerk generieren'}
      </Button>
      <p id="generator-mode" className="mt-2 text-center text-[11px] text-mist-400">
        Regelbasierter Generator · keine KI aktiv
      </p>
    </Panel>
  );
}
