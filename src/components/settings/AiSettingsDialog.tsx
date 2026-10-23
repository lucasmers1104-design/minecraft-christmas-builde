'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_REASONING,
  OPENROUTER_CREDITS_URL,
  OPENROUTER_KEYS_URL,
  REASONING_EFFORTS,
  REASONING_LABELS,
  estimatePlanCostUsd,
  formatUsd,
  modelDisplayName,
  plansPerDollar,
  type AiProvider,
  type AiSettingsView,
  type AiStatus,
} from '@/core/ai/providers';
import { AiRequestError, fetchAiSettings, fetchAiStatus, fetchModelCatalog, saveAiSettings } from '@/lib/client/aiApi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Dialog } from '@/components/ui/Dialog';
import { Field, TextInput } from '@/components/ui/Field';
import { Icon, Spinner, type IconName } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { ChoiceCard } from '@/components/settings/ChoiceCard';
import { ExternalLink } from '@/components/settings/ExternalLink';
import { ModelPicker, type CatalogState } from '@/components/settings/ModelPicker';
import { OpenRouterKeyField } from '@/components/settings/OpenRouterKeyField';
import { buildUpdate, draftFromView, priceOf, validateDraft, type AiSettingsDraft, type DraftIssues } from '@/components/settings/aiSettingsForm';

/**
 * Settings dialog of the AI planning: provider (off / OpenRouter / Ollama), OpenRouter key,
 * model recommendation with estimated costs, reasoning, Ollama address and model.
 * "Speichern und prüfen" saves on the server and shows the real status check right here.
 *
 * The body only exists while the dialog is open, so every opening starts fresh (settings
 * reloaded, a typed key is never kept in memory after closing).
 */
export function AiSettingsDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** Called after settings were saved, so the app can re-check the AI status. */
  onSaved: () => void;
}) {
  return open ? <AiSettingsDialogBody onClose={onClose} onSaved={onSaved} /> : null;
}

type Phase = 'edit' | 'saving' | 'checking' | 'checked';
type CheckResult = { kind: 'status'; status: AiStatus } | { kind: 'error'; message: string };
interface SaveError {
  message: string;
  issues: string[];
}

const PROVIDER_CARDS: { id: AiProvider; title: string; icon: IconName; badge?: string; points: string[] }[] = [
  { id: 'off', title: 'Ohne KI', icon: 'search', points: ['Eingebaute Texterkennung', 'Kostenlos, funktioniert offline'] },
  { id: 'openrouter', title: 'OpenRouter', icon: 'cloud', badge: 'Empfohlen', points: ['Cloud, sehr gute Qualität', 'ca. 0,1 Cent pro Plan', 'API-Schlüssel nötig'] },
  { id: 'ollama', title: 'Ollama', icon: 'cpu', points: ['Lokal auf deinem PC, kostenlos', 'Braucht eine starke Grafikkarte', 'Deutlich ungenauer'] },
];

function describeError(e: unknown): string {
  if (e instanceof AiRequestError) {
    if (e.status === 404) return 'Die App kennt diese Schnittstelle nicht (HTTP 404). Starte die App nach einem Update neu.';
    return e.message;
  }
  if (e instanceof TypeError) return 'Keine Verbindung zur App. Läuft der Server noch?';
  return e instanceof Error ? e.message : String(e);
}

function isReady(status: AiStatus): boolean {
  return status.enabled && status.reachable && status.modelInstalled;
}

const codeClass = 'font-mono [overflow-wrap:anywhere]';

function AiSettingsDialogBody({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const baseId = useId();
  const ids = {
    form: `${baseId}-form`,
    primary: `${baseId}-primary`,
    apiKey: `${baseId}-key`,
    customModel: `${baseId}-model`,
    ollamaBaseUrl: `${baseId}-ollama-url`,
    ollamaModel: `${baseId}-ollama-model`,
  };

  const [view, setView] = useState<AiSettingsView | null>(null);
  const [draft, setDraft] = useState<AiSettingsDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [catalog, setCatalog] = useState<CatalogState>({ phase: 'loading' });
  const [issues, setIssues] = useState<DraftIssues>({});
  const [phase, setPhase] = useState<Phase>('edit');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [saveError, setSaveError] = useState<SaveError | null>(null);
  const outcomeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAiSettings()
      .then((settings) => {
        if (cancelled) return;
        setView(settings);
        setDraft(draftFromView(settings));
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(describeError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  useEffect(() => {
    const controller = new AbortController();
    fetchModelCatalog(undefined, controller.signal)
      .then((data) => setCatalog({ phase: 'done', data }))
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setCatalog({ phase: 'error', message: describeError(e) });
      });
    return () => controller.abort();
  }, []);

  // Results and errors appear below the form: bring them into view. After the check the focus
  // moves to "Fertig" (the save button it replaced was disabled while checking).
  useEffect(() => {
    if (result || saveError) outcomeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [result, saveError]);
  useEffect(() => {
    if (phase === 'checked') document.getElementById(ids.primary)?.focus();
  }, [phase, ids.primary]);

  const change = useCallback((patch: Partial<AiSettingsDraft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setIssues((prev) => {
      const next = { ...prev };
      if ('apiKey' in patch || 'keyAction' in patch || 'provider' in patch) delete next.apiKey;
      if ('customModel' in patch || 'card' in patch) delete next.customModel;
      if ('ollamaBaseUrl' in patch) delete next.ollamaBaseUrl;
      if ('ollamaModel' in patch) delete next.ollamaModel;
      return next;
    });
    // A shown check result belongs to the saved values – editing makes it stale.
    setResult(null);
    setPhase((p) => (p === 'checked' ? 'edit' : p));
  }, []);

  const runCheck = useCallback(async () => {
    setPhase('checking');
    setResult(null);
    try {
      setResult({ kind: 'status', status: await fetchAiStatus() });
    } catch (e) {
      setResult({ kind: 'error', message: describeError(e) });
    }
    setPhase('checked');
  }, []);

  const save = async () => {
    if (!view || !draft) return;
    const found = validateDraft(view, draft);
    setIssues(found);
    const firstInvalid = (['apiKey', 'customModel', 'ollamaBaseUrl', 'ollamaModel'] as const).find((k) => found[k]);
    if (firstInvalid) {
      document.getElementById(ids[firstInvalid])?.focus();
      return;
    }
    setPhase('saving');
    setSaveError(null);
    setResult(null);
    let saved: AiSettingsView;
    try {
      saved = await saveAiSettings(buildUpdate(view, draft));
    } catch (e) {
      setSaveError({ message: describeError(e), issues: e instanceof AiRequestError ? e.issues : [] });
      setPhase('edit');
      return;
    }
    // The server's answer is the new baseline; the typed key is dropped (it lives on the server now).
    setView(saved);
    setDraft(draftFromView(saved));
    onSaved();
    await runCheck();
  };

  const busy = phase === 'saving' || phase === 'checking';
  const checkedFine = phase === 'checked' && result?.kind === 'status' && (isReady(result.status) || !result.status.enabled);

  const footer = !view ? (
    <Button variant="secondary" onClick={onClose}>
      Schließen
    </Button>
  ) : (
    <>
      {phase !== 'checked' ? (
        <Button variant="secondary" onClick={onClose}>
          Abbrechen
        </Button>
      ) : checkedFine ? null : (
        <Button variant="secondary" icon={<Icon name="refresh" />} onClick={() => void runCheck()} data-testid="ai-settings-recheck">
          Erneut prüfen
        </Button>
      )}
      {phase === 'checked' ? (
        <Button id={ids.primary} variant="primary" icon={<Icon name="check" />} onClick={onClose} data-testid="ai-settings-done">
          Fertig
        </Button>
      ) : (
        <Button id={ids.primary} variant="primary" type="submit" form={ids.form} loading={busy} data-testid="ai-settings-save">
          Speichern und prüfen
        </Button>
      )}
    </>
  );

  let content: ReactNode;
  if (loadError) {
    content = (
      <Callout
        tone="danger"
        role="alert"
        title="Die KI-Einstellungen ließen sich nicht laden."
        actions={
          <Button
            size="sm"
            icon={<Icon name="refresh" />}
            onClick={() => {
              setLoadError(null);
              setLoadAttempt((n) => n + 1);
            }}
          >
            Erneut versuchen
          </Button>
        }
      >
        {loadError}
      </Callout>
    );
  } else if (!view || !draft) {
    content = (
      <p role="status" className="flex items-center justify-center gap-2 py-16 text-[13px] text-fg-muted">
        <Spinner /> Einstellungen werden geladen …
      </p>
    );
  } else {
    content = (
      <form
        id={ids.form}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void save();
        }}
      >
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-6">
          {view.source === 'env' ? (
            <Callout tone="info" title="Eingestellt über die Datei .env.local">
              Die aktuellen Werte kommen aus <code className={codeClass}>.env.local</code>. Wenn du hier speicherst, gelten ab dann die Einstellungen der App
              (gespeichert in <code className={codeClass}>{view.storedIn}</code>).
            </Callout>
          ) : null}

          <fieldset className="min-w-0">
            <legend className="mb-2.5 text-sm font-semibold text-fg">Wie soll geplant werden?</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {PROVIDER_CARDS.map((p) => (
                <ChoiceCard
                  key={p.id}
                  name="ai-provider"
                  value={p.id}
                  checked={draft.provider === p.id}
                  onSelect={(value) => change({ provider: value as AiProvider })}
                  testId={`ai-provider-${p.id}`}
                  title={p.title}
                  icon={<Icon name={p.icon} />}
                  badge={p.badge ? <Badge tone="accent">{p.badge}</Badge> : undefined}
                  highlight={p.id === 'openrouter'}
                >
                  {p.points.map((point) => (
                    <span key={point} className="block">
                      {point}
                    </span>
                  ))}
                </ChoiceCard>
              ))}
            </div>
          </fieldset>

          {draft.provider === 'off' ? (
            <Callout tone="neutral" title="Planung mit der eingebauten Texterkennung">
              Die App sucht feste Begriffe in deiner Beschreibung, etwa Bauwerk, Stil, Größe und Material. Das klappt offline und kostenlos, freie Formulierungen
              versteht eine KI aber deutlich besser.
              {view.openrouter.hasKey ? ' Dein gespeicherter OpenRouter-Schlüssel bleibt erhalten.' : ''}
            </Callout>
          ) : null}

          {draft.provider === 'openrouter' ? (
            <section aria-label="OpenRouter einrichten" className="flex flex-col gap-6 border-t border-line pt-5">
              <OpenRouterKeyField
                inputId={ids.apiKey}
                hasKey={view.openrouter.hasKey}
                keyHint={view.openrouter.keyHint}
                keyFromEnv={view.openrouter.keyFromEnv}
                apiKey={draft.apiKey}
                keyAction={draft.keyAction}
                error={issues.apiKey}
                onKeyChange={(apiKey) => change({ apiKey })}
                onKeyActionChange={(keyAction) => change({ keyAction, apiKey: '' })}
              />

              <ModelPicker
                catalog={catalog}
                card={draft.card}
                customModel={draft.customModel}
                reasoning={draft.reasoning}
                onSelectCard={(card) => change({ card, customModel: '' })}
                onCustomModelChange={(customModel) => change({ customModel })}
                customInputId={ids.customModel}
                customError={issues.customModel}
              />

              <div>
                <Segmented
                  legend="Nachdenken"
                  name="ai-reasoning"
                  testId="reasoning-control"
                  badge={<Badge>Empfohlen: {REASONING_LABELS[DEFAULT_REASONING].label}</Badge>}
                  description="Wie lange das Modell überlegt, bevor es den Bauplan schreibt."
                  options={REASONING_EFFORTS.map((effort) => ({ value: effort, label: REASONING_LABELS[effort].label }))}
                  value={draft.reasoning}
                  onChange={(reasoning) => change({ reasoning })}
                />
                <p className="mt-2 text-xs leading-snug text-fg-subtle" aria-live="polite">
                  {REASONING_LABELS[draft.reasoning].hint}
                </p>
              </div>

              <Callout tone="info" icon="shield" title="Datenschutz">
                Deine Beschreibung wird an OpenRouter und den Modellanbieter geschickt. Der Schlüssel bleibt auf diesem PC (
                <code className={codeClass}>{view.openrouter.keyFromEnv ? '.env.local' : view.storedIn}</code>) und wird nie an den Browser zurückgegeben.
              </Callout>
            </section>
          ) : null}

          {draft.provider === 'ollama' ? (
            <section aria-label="Ollama einrichten" className="flex flex-col gap-4 border-t border-line pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Adresse" htmlFor={ids.ollamaBaseUrl} hint={`Standard: ${DEFAULT_OLLAMA_BASE_URL}`} error={issues.ollamaBaseUrl}>
                  <TextInput
                    id={ids.ollamaBaseUrl}
                    value={draft.ollamaBaseUrl}
                    onChange={(e) => change({ ollamaBaseUrl: e.target.value })}
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={issues.ollamaBaseUrl ? true : undefined}
                    data-testid="ollama-base-url-input"
                    className="font-mono"
                  />
                </Field>
                <Field label="Modell" htmlFor={ids.ollamaModel} hint={`Standard: ${DEFAULT_OLLAMA_MODEL}`} error={issues.ollamaModel}>
                  <TextInput
                    id={ids.ollamaModel}
                    value={draft.ollamaModel}
                    onChange={(e) => change({ ollamaModel: e.target.value })}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    aria-invalid={issues.ollamaModel ? true : undefined}
                    data-testid="ollama-model-input"
                    className="font-mono"
                  />
                </Field>
              </div>
              <Callout tone="neutral" title="So richtest du Ollama ein">
                <ol className="mt-1 flex list-decimal flex-col gap-1 pl-4">
                  <li>
                    Ollama installieren: <ExternalLink href="https://ollama.com/download">ollama.com/download</ExternalLink>
                  </li>
                  <li>
                    Im Terminal das Modell laden:{' '}
                    <code className="rounded bg-canvas px-1 py-px font-mono text-xs break-all text-fg">
                      ollama pull {draft.ollamaModel.trim() || DEFAULT_OLLAMA_MODEL}
                    </code>{' '}
                    (einmalig, mehrere GB).
                  </li>
                  <li>Hier „Speichern und prüfen“ wählen.</li>
                </ol>
                <p className="mt-1.5">
                  Ausführliche Anleitung: <code className={codeClass}>docs/KI.md</code> im Projektordner.
                </p>
              </Callout>
            </section>
          ) : null}
        </fieldset>

        <div ref={outcomeRef} className="mt-6 flex scroll-mb-4 flex-col gap-3 empty:hidden">
          {saveError ? (
            <Callout tone="danger" role="alert" title="Nicht gespeichert" data-testid="ai-settings-error">
              <p>{saveError.message}</p>
              {saveError.issues.length > 0 ? (
                <ul className="mt-1 list-disc pl-4">
                  {saveError.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
            </Callout>
          ) : null}
          {busy ? (
            <p role="status" className="flex items-center gap-2 text-[13px] text-fg-muted">
              <Spinner /> {phase === 'saving' ? 'Wird gespeichert …' : 'Gespeichert. Verbindung wird geprüft …'}
            </p>
          ) : null}
          {result ? <CheckResultView result={result} view={view} /> : null}
        </div>
      </form>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="KI einrichten"
      description="Wähle, ob und mit welcher KI deine Beschreibung in einen Bauplan übersetzt wird. Die Blöcke setzt immer der Generator."
      size="lg"
      testId="ai-settings"
      closeTestId="ai-settings-close"
      footer={footer}
    >
      {content}
    </Dialog>
  );
}

/** The status check after saving: what works now, or what to do next. */
function CheckResultView({ result, view }: { result: CheckResult; view: AiSettingsView }) {
  let ready = false;
  let body: ReactNode;
  if (result.kind === 'error') {
    body = (
      <Callout tone="danger" role="alert" title="Gespeichert, aber die Prüfung schlug fehl">
        {result.message} Du kannst es später im Bereich „KI-Planung“ mit „Erneut prüfen“ versuchen.
      </Callout>
    );
  } else if (!result.status.enabled) {
    body = (
      <Callout tone="neutral" icon="check" role="status" title="Gespeichert: ohne KI">
        {result.status.message}
      </Callout>
    );
  } else if (isReady(result.status)) {
    const s = result.status;
    ready = true;
    const label = s.label ?? (s.provider === 'openrouter' ? `${modelDisplayName(s.model)} über OpenRouter` : `${s.model} (lokal)`);
    const price = s.price ?? priceOf(s.model, null).price;
    const cost = price ? estimatePlanCostUsd(price, view.openrouter.reasoning) : null;
    const credit = typeof s.creditUsd === 'number' ? s.creditUsd : null;
    body = (
      <Callout tone="success" role="status" title={`Bereit: ${label}`}>
        <p>{s.message}</p>
        {s.provider === 'openrouter' && credit !== null ? (
          <p className="mt-1">
            Guthaben bei OpenRouter: <strong className="font-semibold text-fg">{formatUsd(credit)}</strong>
            {/* plansPerDollar(cost / credit) = plans the whole credit pays for, rounded down. */}
            {cost && credit > 0 ? ` – reicht für etwa ${plansPerDollar(cost / credit).toLocaleString('de-DE')} Pläne (geschätzt).` : '.'}
          </p>
        ) : null}
      </Callout>
    );
  } else {
    const s = result.status;
    body = (
      <Callout
        tone="danger"
        role="alert"
        title="Gespeichert, aber noch nicht bereit"
        actions={
          s.provider === 'openrouter' ? (
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              <ExternalLink href={OPENROUTER_KEYS_URL}>Schlüssel auf openrouter.ai prüfen</ExternalLink>
              <ExternalLink href={OPENROUTER_CREDITS_URL}>Guthaben ansehen</ExternalLink>
            </span>
          ) : null
        }
      >
        {s.message}
      </Callout>
    );
  }
  return (
    <div data-testid="ai-settings-status" data-ready={ready ? 'true' : 'false'}>
      {body}
    </div>
  );
}
