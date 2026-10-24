'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  OPENROUTER_RECOMMENDED,
  REASONING_LABELS,
  estimatePlanCostUsd,
  formatPricePerM,
  formatUsdCents,
  plansPerDollar,
  type ModelInfo,
  type ModelCatalogResponse,
  type ModelPrice,
  type ReasoningEffort,
  type RecommendedModel,
} from '@/core/ai/providers';
import { fetchModelCatalog } from '@/lib/client/aiApi';
import { Badge } from '@/components/ui/Badge';
import { Field, TextInput } from '@/components/ui/Field';
import { Icon, Spinner } from '@/components/ui/Icon';
import { ChoiceCard } from '@/components/settings/ChoiceCard';
import { ExternalLink } from '@/components/settings/ExternalLink';
import { isRecommendedModel, looksLikeModelId, priceOf, pricesAsOfLabel } from '@/components/settings/aiSettingsForm';

export type CatalogState = { phase: 'loading' } | { phase: 'done'; data: ModelCatalogResponse } | { phase: 'error'; message: string };

const RECOMMENDED = OPENROUTER_RECOMMENDED.find((m) => m.role === 'recommended') ?? OPENROUTER_RECOMMENDED[0];

/**
 * "Welches Modell?": the three recommended OpenRouter models as cards with estimated cost per
 * plan (live prices when OpenRouter answers, else the dated snapshot), plus a free model id.
 */
export function ModelPicker({
  catalog,
  card,
  customModel,
  reasoning,
  onSelectCard,
  onCustomModelChange,
  customInputId,
  customError,
}: {
  catalog: CatalogState;
  card: string;
  customModel: string;
  reasoning: ReasoningEffort;
  onSelectCard: (id: string) => void;
  onCustomModelChange: (id: string) => void;
  customInputId: string;
  customError?: string;
}) {
  const data = catalog.phase === 'done' ? catalog.data : null;
  const live = !!data?.live;
  const custom = customModel.trim();
  const selected = custom || card;

  return (
    <section aria-labelledby={`${customInputId}-heading`} className="flex flex-col gap-3">
      <div>
        <h3 id={`${customInputId}-heading`} className="text-sm font-semibold text-fg">
          Welches Modell?
        </h3>
        {RECOMMENDED ? (
          <p className="mt-1 flex items-start gap-2 text-[13px] leading-snug text-fg-muted">
            <Icon name="sparkles" className="mt-px size-4 text-accent-text" />
            <span>
              <strong className="font-semibold text-fg">Unsere Empfehlung: {RECOMMENDED.name}</strong> – schnell, zuverlässig und sehr günstig.
            </span>
          </p>
        ) : null}
      </div>

      <div role="radiogroup" aria-labelledby={`${customInputId}-heading`} className="flex flex-col gap-2">
        {OPENROUTER_RECOMMENDED.map((model) => (
          <ModelCard key={model.id} model={model} catalog={data} reasoning={reasoning} checked={selected === model.id} onSelect={onSelectCard} />
        ))}
      </div>

      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-snug text-fg-subtle" aria-live="polite">
        {catalog.phase === 'loading' ? (
          <>
            <Spinner className="size-3.5" /> Aktuelle Preise werden bei OpenRouter abgefragt …
          </>
        ) : live ? (
          <>
            <Icon name="check" className="size-3.5 text-accent-text" /> Live-Preise von OpenRouter.
          </>
        ) : (
          <>
            <Icon name="info" className="size-3.5" /> Preise Stand {pricesAsOfLabel()}
            {data?.message || catalog.phase === 'error' ? ' – OpenRouter war gerade nicht erreichbar' : ''}.
          </>
        )}
        <span>
          Kosten pro Plan geschätzt mit Nachdenken „{REASONING_LABELS[reasoning].label}“; eine seltene Reparaturrunde kostet extra.
        </span>
      </p>

      <Field
        label="Anderes Modell"
        htmlFor={customInputId}
        badge={custom && !isRecommendedModel(custom) ? <Badge tone="accent">ausgewählt</Badge> : <Badge>optional</Badge>}
        hint={
          <>
            Eine Modell-ID von <ExternalLink href="https://openrouter.ai/models">openrouter.ai/models</ExternalLink> in der Form anbieter/modell. Das Modell muss
            strukturierte Ausgabe (JSON-Schema) unterstützen.
          </>
        }
        error={customError}
      >
        <TextInput
          id={customInputId}
          value={customModel}
          onChange={(e) => onCustomModelChange(e.target.value)}
          placeholder="anbieter/modell"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={customError ? true : undefined}
          data-testid="openrouter-model-input"
          className="font-mono"
        />
      </Field>
      {custom && !customError && !isRecommendedModel(custom) && looksLikeModelId(custom) ? <CustomModelCheck id={custom} reasoning={reasoning} /> : null}
    </section>
  );
}

function ModelCard({
  model,
  catalog,
  reasoning,
  checked,
  onSelect,
}: {
  model: RecommendedModel;
  catalog: ModelCatalogResponse | null;
  reasoning: ReasoningEffort;
  checked: boolean;
  onSelect: (id: string) => void;
}) {
  const { price } = priceOf(model.id, catalog);
  const cost = price ? estimatePlanCostUsd(price, reasoning) : null;
  const recommended = model.role === 'recommended';
  return (
    <ChoiceCard
      name="openrouter-model"
      value={model.id}
      checked={checked}
      onSelect={onSelect}
      testId={`model-option-${model.id}`}
      title={model.name}
      meta={model.vendor}
      badge={<Badge tone={recommended ? 'accent' : 'neutral'}>{model.roleLabel}</Badge>}
      highlight={recommended}
      aside={cost !== null ? <CostSummary cost={cost} /> : null}
    >
      <span className="block">{model.summary}</span>
      <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-fg-subtle">
        <span className="inline-flex items-center gap-1">
          <Icon name="bolt" className="size-3.5" />
          Tempo {model.speed}
        </span>
        {price ? <PricePerM price={price} /> : null}
      </span>
      {model.caveat ? (
        <span className="mt-1.5 flex items-start gap-1.5 text-xs leading-snug text-fg-subtle">
          <Icon name="info" className="mt-px size-3.5" />
          {model.caveat}
        </span>
      ) : null}
    </ChoiceCard>
  );
}

function CostSummary({ cost }: { cost: number }) {
  return (
    <>
      <span className="block text-sm font-semibold text-fg tabular-nums">
        ca. {formatUsdCents(cost)} <span className="font-normal text-fg-muted">pro Plan</span>
      </span>
      <span className="block text-xs text-fg-subtle tabular-nums">≈ {plansPerDollar(cost).toLocaleString('de-DE')} Pläne pro 1 $</span>
    </>
  );
}

function PricePerM({ price }: { price: ModelPrice }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon name="coins" className="size-3.5" />
      {formatPricePerM(price)} je 1 Mio. Tokens (Ein-/Ausgabe)
    </span>
  );
}

type CustomLookup = { id: string; live: boolean; info: ModelInfo | null } | { id: string; failed: true };

/** Looks a free model id up in OpenRouter's catalogue (debounced) and says honestly what it found. */
function CustomModelCheck({ id, reasoning }: { id: string; reasoning: ReasoningEffort }) {
  const [lookup, setLookup] = useState<CustomLookup | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchModelCatalog(id, controller.signal)
        .then((res) => setLookup({ id, live: res.live, info: res.models.find((m) => m.id === id) ?? null }))
        .catch(() => {
          if (!controller.signal.aborted) setLookup({ id, failed: true });
        });
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [id]);

  const current = lookup?.id === id ? lookup : null;
  let content: ReactNode;
  if (!current) {
    content = (
      <span className="flex items-center gap-1.5 text-fg-subtle">
        <Spinner className="size-3.5" /> Wird bei OpenRouter nachgeschlagen …
      </span>
    );
  } else if ('failed' in current || !current.live) {
    content = (
      <span className="flex items-start gap-1.5 text-fg-subtle">
        <Icon name="info" className="mt-px size-3.5" />
        OpenRouter ist gerade nicht erreichbar, das Modell ließ sich nicht nachschlagen. Ob es passt, zeigt die Prüfung nach dem Speichern.
      </span>
    );
  } else if (!current.info) {
    content = (
      <span className="flex items-start gap-1.5 text-warning-text">
        <Icon name="alert" className="mt-px size-3.5" />
        OpenRouter kennt kein Modell mit dieser ID. Prüfe die Schreibweise auf openrouter.ai/models.
      </span>
    );
  } else if (!current.info.structuredOutputs) {
    content = (
      <span className="flex items-start gap-1.5 text-warning-text">
        <Icon name="alert" className="mt-px size-3.5" />
        {current.info.name} unterstützt keine strukturierte Ausgabe (JSON-Schema). Damit bekommt die App keinen gültigen Bauplan – wähle besser eine der Empfehlungen.
      </span>
    );
  } else {
    const cost = current.info.price ? estimatePlanCostUsd(current.info.price, reasoning) : null;
    content = (
      <span className="flex items-start gap-1.5 text-accent-text">
        <Icon name="check" className="mt-px size-3.5" />
        <span>
          Gefunden: {current.info.name} · unterstützt strukturierte Ausgabe
          {cost !== null ? ` · ca. ${formatUsdCents(cost)} pro Plan` : ''}
        </span>
      </span>
    );
  }
  return (
    <p className="-mt-1 text-xs leading-snug" aria-live="polite" data-testid="openrouter-model-check">
      {content}
    </p>
  );
}
