'use client';

import { planEntries } from '@/core/ai/planSchema';
import type { AiPlanState, AiStatus } from '@/lib/client/aiApi';
import { Panel } from '@/components/ui/Panel';

/**
 * Optional local AI (Ollama). Only offered when a real model is reachable; never pretends an
 * AI is active. The AI only proposes the plan – blocks are always set by the rule-based
 * generator.
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
  const tone = ready ? 'bg-fir-500' : status?.enabled ? 'bg-gold-400' : 'bg-mist-400';
  return (
    <Panel
      title="Lokale KI (optional)"
      headingId="ai-heading"
      description="Läuft auf deinem PC über Ollama – keine Cloud, keine Kosten."
      actions={
        <>
          <button
            type="button"
            onClick={onOpenSettings}
            data-testid="ai-open-settings"
            className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-mist-300 hover:text-snow-50"
          >
            Einrichten
          </button>
          <button
            type="button"
            onClick={onRecheck}
            disabled={checking}
            data-testid="ai-recheck"
            className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-mist-300 hover:text-snow-50 disabled:opacity-50"
          >
            {checking ? 'Prüft …' : 'Erneut prüfen'}
          </button>
        </>
      }
    >
      <p className="flex items-start gap-2 text-xs text-mist-300" data-testid="ai-status" data-ready={ready}>
        <span aria-hidden="true" className={`mt-1 size-2 shrink-0 rounded-full ${tone}`} />
        <span>{status ? status.message : 'Status wird geprüft …'}</span>
      </p>
      <label className={`mt-3 flex items-center gap-2 text-sm ${ready ? 'text-snow-50' : 'text-mist-400'}`}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={!ready && !enabled}
          onChange={(e) => onToggle(e.target.checked)}
          data-testid="ai-toggle"
          className="accent-gold-400"
        />
        Beim Generieren mit lokaler KI planen
      </label>
      <p className="mt-1 text-[11px] text-mist-400">
        Die KI liefert nur einen geprüften Bauplan (Typ, Stil, Größe, Bauteile, Materialien). Alle Blöcke setzt der regelbasierte Generator.
      </p>
      {!status?.enabled ? (
        <p className="mt-2 text-[11px] text-mist-400">Einrichtung: siehe docs/LOCAL_AI.md (Ollama installieren, Modell laden, .env.local).</p>
      ) : null}
      {notice ? (
        <p role="alert" className="mt-2 rounded-md border border-gold-400/30 bg-gold-400/10 px-2 py-1.5 text-[11px] text-gold-300" data-testid="ai-notice">
          {notice}
        </p>
      ) : null}
      {plan && planIsCurrent ? (
        <div className="mt-3 rounded-lg border border-fir-500/30 bg-fir-700/15 p-2.5 text-xs" data-testid="ai-plan">
          <p className="font-medium text-fir-300">
            Plan von {plan.model} ({(plan.durationMs / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} s)
          </p>
          {plan.explanation ? <p className="mt-1 text-mist-300">{plan.explanation}</p> : null}
          {plan.plan ? (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]" data-testid="ai-plan-fields">
              {planEntries(plan.plan).map((e) => (
                <div key={e.field} className="contents">
                  <dt className="text-mist-400">{e.label}</dt>
                  <dd className="text-snow-50">{e.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {(plan.attempts ?? 1) > 1 ? <p className="mt-1 text-[11px] text-mist-400">Erst die zweite Antwort war gültig (Reparaturrunde).</p> : null}
          {plan.unsupported.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1 text-[11px] text-gold-300" data-testid="ai-unsupported">
              {plan.unsupported.map((u) => (
                <li key={u}>⚠ Nicht umsetzbar: {u}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}
