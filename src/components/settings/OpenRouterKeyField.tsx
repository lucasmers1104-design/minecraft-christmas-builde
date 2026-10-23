'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { OPENROUTER_CREDITS_URL, OPENROUTER_KEYS_URL, looksLikeOpenRouterKey } from '@/core/ai/providers';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import type { KeyAction } from '@/components/settings/aiSettingsForm';
import { ExternalLink } from '@/components/settings/ExternalLink';

/**
 * The OpenRouter API key: input with show/hide, the stored (masked) key with "Ersetzen" and
 * "Entfernen", and a short how-to. The stored key itself never reaches the browser – only
 * the server's masked hint ("sk-or-v1-…a1b2").
 */
export function OpenRouterKeyField({
  inputId,
  hasKey,
  keyHint,
  keyFromEnv,
  apiKey,
  keyAction,
  error,
  onKeyChange,
  onKeyActionChange,
}: {
  inputId: string;
  hasKey: boolean;
  keyHint: string | null;
  keyFromEnv: boolean;
  apiKey: string;
  keyAction: KeyAction;
  error?: string;
  onKeyChange: (key: string) => void;
  onKeyActionChange: (action: KeyAction) => void;
}) {
  const [visible, setVisible] = useState(false);
  const showInput = !hasKey || keyAction === 'replace';
  const trimmed = apiKey.trim();
  const shapeWarning = showInput && trimmed.length > 0 && !looksLikeOpenRouterKey(trimmed);

  // "Ersetzen" moves the focus straight into the new (empty) input.
  useEffect(() => {
    if (keyAction === 'replace') document.getElementById(inputId)?.focus();
  }, [keyAction, inputId]);

  const removing = keyAction === 'remove';
  return (
    <div className="flex flex-col gap-3">
      {hasKey ? (
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-fg-muted">API-Schlüssel</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-raised px-3 py-2">
            <span className="flex min-w-0 flex-1 basis-48 items-center gap-2 text-sm">
              <Icon name="key" className={`size-4 ${removing ? 'text-fg-subtle' : 'text-accent-text'}`} />
              <span className="min-w-0">
                <span className="text-fg-muted">{removing ? 'Wird beim Speichern entfernt: ' : 'Gespeichert: '}</span>
                <code className={`font-mono text-[13px] break-all ${removing ? 'text-fg-subtle line-through' : 'text-fg'}`} data-testid="openrouter-key-hint">
                  {keyHint ?? 'sk-or-v1-…'}
                </code>
              </span>
            </span>
            <span className="flex gap-1.5">
              {removing ? null : (
                <Button size="sm" onClick={() => onKeyActionChange(keyAction === 'replace' ? 'keep' : 'replace')} data-testid="openrouter-key-replace">
                  {keyAction === 'replace' ? 'Behalten' : 'Ersetzen'}
                </Button>
              )}
              {keyFromEnv || keyAction === 'replace' ? null : (
                <Button
                  size="sm"
                  variant={removing ? 'secondary' : 'ghost'}
                  icon={removing ? <Icon name="undo" /> : <Icon name="trash" />}
                  onClick={() => onKeyActionChange(removing ? 'keep' : 'remove')}
                  data-testid={removing ? 'openrouter-key-restore' : 'openrouter-key-remove'}
                >
                  {removing ? 'Rückgängig' : 'Entfernen'}
                </Button>
              )}
            </span>
          </div>
          {keyFromEnv ? (
            <p className="mt-1.5 text-xs leading-snug text-fg-subtle">
              Dieser Schlüssel steht in der Datei <code className="font-mono">.env.local</code> (OPENROUTER_API_KEY). Entfernen kannst du ihn nur dort.
            </p>
          ) : null}
          {removing && error ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-danger-text" role="alert">
              <Icon name="alert" className="mt-px size-3.5" />
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {showInput ? (
        <Field
          label={hasKey ? 'Neuer API-Schlüssel' : 'API-Schlüssel'}
          htmlFor={inputId}
          hint="Beginnt mit sk-or-v1-. Er wird nur auf diesem PC gespeichert."
          error={error}
        >
          <div className="relative">
            <TextInput
              id={inputId}
              type={visible ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => onKeyChange(e.target.value)}
              placeholder="sk-or-v1-…"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              data-testid="openrouter-key-input"
              className="pr-11 font-mono"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Schlüssel verbergen' : 'Schlüssel anzeigen'}
              aria-pressed={visible}
              aria-controls={inputId}
              className="absolute top-1 right-1 inline-flex size-8 items-center justify-center rounded-md text-fg-subtle hover:bg-hover hover:text-fg"
            >
              <Icon name={visible ? 'eye-off' : 'eye'} />
            </button>
          </div>
        </Field>
      ) : null}
      {shapeWarning ? (
        <p className="-mt-1 flex items-start gap-1.5 text-xs leading-snug text-warning-text" aria-live="polite">
          <Icon name="alert" className="mt-px size-3.5" />
          Das sieht nicht wie ein OpenRouter-Schlüssel aus (sie beginnen mit sk-or-v1-). Speichern geht trotzdem – die Prüfung zeigt, ob er funktioniert.
        </p>
      ) : null}

      {showInput ? (
        <ExternalLink href={OPENROUTER_KEYS_URL} className="self-start text-[13px]">
          Schlüssel auf openrouter.ai erstellen
        </ExternalLink>
      ) : null}

      <details className="group rounded-lg border border-line bg-canvas/40 px-3 py-2.5" open={!hasKey}>
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-fg-muted hover:text-fg [&::-webkit-details-marker]:hidden">
          <Icon name="chevron-right" className="size-4 text-fg-subtle transition-transform group-open:rotate-90" />
          So bekommst du einen Schlüssel
        </summary>
        <ol className="mt-2.5 flex flex-col gap-2 text-[13px] leading-snug text-fg-muted">
          <Step n={1}>
            Konto auf <ExternalLink href="https://openrouter.ai/">openrouter.ai</ExternalLink> anlegen.
          </Step>
          <Step n={2}>
            <ExternalLink href={OPENROUTER_CREDITS_URL}>Guthaben aufladen</ExternalLink>, z. B. 10 $. OpenRouter nimmt dabei 5,5 % Gebühr, mindestens 0,80 $.
          </Step>
          <Step n={3}>
            <ExternalLink href={OPENROUTER_KEYS_URL}>Schlüssel erstellen</ExternalLink> und hier einfügen.
          </Step>
        </ol>
      </details>
    </div>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden="true" className="mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent-text">
        {n}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}
