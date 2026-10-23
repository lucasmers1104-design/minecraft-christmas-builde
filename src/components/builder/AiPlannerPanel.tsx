'use client';

import { planEntries } from '@/core/ai/planSchema';
import { formatUsd, formatUsdCents, modelDisplayName } from '@/core/ai/providers';
import type { AiPlanState, AiStatus } from '@/lib/client/aiApi';
import { Badge, StatusDot, type Tone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { Switch } from '@/components/ui/Switch';

/**
 * Optional AI planning (OpenRouter in the cloud or Ollama on this PC). The status always comes
 * from the server; nothing pretends an AI is active. The AI only proposes the plan – all
 * blocks are set by the rule-based generator.
 */
export function AiPlannerPanel({
  status,
  checking,
  onRecheck,
  enabled,
  onToggle,
  plan,
  planIsCurrent,
  notice,
  onOpenSettings,
}: {
  status: AiStatus | null;
  checking: boolean;
  onRecheck: () => void;
  enabled: boolean;
  onToggle: (on: boolean) => void;
  plan: AiPlanState | null;
  planIsCurrent: boolean;
  notice: string | null;
  /** Opens the AI settings dialog (provider, key, model). */
  onOpenSettings: () => void;
}) {
  const ready = !!status?.enabled && status.reachable && status.modelInstalled;
  // Unknown while the first status request runs; "not set up" only once the server said so.
  const notSetUp = !!status && !status.enabled;
  const tone: Tone = checking || !status ? 'info' : ready ? 'accent' : status.enabled ? 'warning' : 'neutral';
  const credit = status?.provider === 'openrouter' && typeof status.creditUsd === 'number' ? status.creditUsd : null;
  const setup = setupLabel(status);

  return (
    <Panel
      title="KI-Planung"
      headingId="ai-heading"
      description={
        // Once an AI is set up, the header carries two buttons – the model line then moves into
        // the status block below, so the narrow header column stays readable.
        setup ? (
          <Badge>optional</Badge>
        ) : (
          <>
            <Badge className="mr-1.5 align-[1px]">optional</Badge>
            Versteht freie Beschreibungen besser als die eingebaute Texterkennung.
          </>
        )
      }
      actions={
        <>
          {/* Same wording as the server's status messages ("Unter „KI einrichten“ …"). */}
          {notSetUp ? null : (
            <Button variant="ghost" size="sm" icon={<Icon name="settings" />} onClick={onOpenSettings} data-testid="ai-open-settings">
              KI einrichten
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            icon={<Icon name="refresh" />}
            onClick={onRecheck}
            loading={checking}
            aria-label="KI-Status erneut prüfen"
            title="Erneut prüfen"
            data-testid="ai-recheck"
          />
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5" aria-live="polite" data-testid="ai-status" data-ready={ready}>
          <span className={setup ? 'mt-[7px]' : 'mt-1.5'}>
            <StatusDot tone={tone} pulse={checking || !status} />
          </span>
          <div className="min-w-0 text-[13px] leading-snug">
            {setup ? <p className="mb-0.5 text-sm leading-5 font-medium text-fg">{setup}</p> : null}
            <p className="text-fg-muted">{status ? status.message : 'KI-Status wird geprüft …'}</p>
            {credit !== null ? <p className="mt-1 text-xs text-fg-subtle">Guthaben bei OpenRouter: {formatUsd(credit)}</p> : null}
          </div>
        </div>

        {notSetUp ? (
          <Callout
            tone="neutral"
            icon="sparkles"
            actions={
              <Button variant="secondary" size="sm" icon={<Icon name="settings" />} onClick={onOpenSettings} data-testid="ai-open-settings">
                KI einrichten
              </Button>
            }
          >
            Am einfachsten über OpenRouter: ca. 0,1 Cent pro Plan, nur ein API-Schlüssel nötig. Oder kostenlos lokal mit Ollama, wenn dein PC eine starke
            Grafikkarte hat.
          </Callout>
        ) : null}

        <Switch
          checked={enabled}
          onChange={onToggle}
          disabled={!ready && !enabled}
          testId="ai-toggle"
          label="Beim Generieren mit KI planen"
          description="Die KI liefert nur einen geprüften Bauplan. Alle Blöcke setzt der Generator."
        />

        {notice ? (
          <Callout tone="warning" role="alert" data-testid="ai-notice">
            {notice}
          </Callout>
        ) : null}

        {plan && planIsCurrent ? <PlanResult plan={plan} /> : null}
      </div>
    </Panel>
  );
}

/** Which AI is set up ("GPT-6 Luna über OpenRouter"), or null when none is. */
function setupLabel(status: AiStatus | null): string | null {
  if (!status || !status.enabled || status.provider === 'off') return null;
  if (status.provider === 'openrouter') return status.label ?? `${modelDisplayName(status.model)} über OpenRouter`;
  return `${status.model} – lokal über Ollama, kostenlos`;
}

function PlanResult({ plan }: { plan: AiPlanState }) {
  const modelName = plan.source === 'openrouter' ? modelDisplayName(plan.model) : plan.model;
  const seconds = (plan.durationMs / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 });
  const cost = typeof plan.costUsd === 'number' ? (plan.costUsd > 0 ? formatUsdCents(plan.costUsd) : 'kostenlos') : null;
  const fields = plan.plan ? planEntries(plan.plan) : [];
  return (
    <section aria-label="Plan der KI" className="rounded-lg border border-accent/30 bg-accent/6 p-3" data-testid="ai-plan">
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px]">
        <Icon name="sparkles" className="size-4 text-accent-text" />
        <span className="font-medium text-accent-text">Plan von {modelName}</span>
        <span className="text-fg-subtle tabular-nums">
          · {seconds} s{cost ? ` · ${cost}` : ''}
        </span>
      </p>
      {plan.explanation ? <p className="mt-1.5 text-[13px] leading-snug text-fg">{plan.explanation}</p> : null}

      {(plan.attempts ?? 1) > 1 ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs leading-snug text-fg-subtle">
          <Icon name="refresh" className="mt-px size-3.5" />
          Erst die zweite Antwort war gültig (Reparaturrunde).
        </p>
      ) : null}

      {plan.unsupported.length > 0 ? (
        <div className="mt-2.5 rounded-md border border-warning/35 bg-warning/8 px-2.5 py-2" data-testid="ai-unsupported">
          <p className="flex items-center gap-1.5 text-xs font-medium text-warning-text">
            <Icon name="alert" className="size-3.5" />
            Nicht umsetzbar:
          </p>
          <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5 text-xs leading-snug text-fg-muted marker:text-fg-subtle">
            {plan.unsupported.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {fields.length > 0 ? (
        <details className="group mt-2.5">
          <summary className="flex cursor-pointer list-none items-center gap-1 rounded-sm text-xs font-medium text-fg-muted hover:text-fg [&::-webkit-details-marker]:hidden">
            <Icon name="chevron-right" className="size-3.5 transition-transform group-open:rotate-90" />
            Bauplan im Detail ({fields.length} {fields.length === 1 ? 'Angabe' : 'Angaben'})
          </summary>
          <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs" data-testid="ai-plan-fields">
            {fields.map((e) => (
              <div key={e.field} className="contents">
                <dt className="text-fg-subtle">{e.label}</dt>
                <dd className="break-words text-fg">{e.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </section>
  );
}
