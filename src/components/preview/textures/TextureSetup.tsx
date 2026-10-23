'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_PROFILE } from '@/core/compat/profile';
import { useTextures } from '@/components/preview/textures/TextureProvider';
import { StatusDot } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Icon, Spinner } from '@/components/ui/Icon';
import { Switch } from '@/components/ui/Switch';

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong bg-raised text-xs font-semibold text-fg-muted"
      >
        {number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h4 className="pt-0.5 text-sm font-medium text-fg">
          <span className="sr-only">Weg {number}: </span>
          {title}
        </h4>
        {children}
      </div>
    </li>
  );
}

/**
 * Status line and setup for real Minecraft textures (footer of the preview). The textures come
 * from the user's own Minecraft installation (found automatically, picked as a file, or
 * downloaded from Mojang after an explicit EULA confirmation) and stay on this computer.
 * The setup opens as a non-modal popover above the footer; the parent owns `open`.
 */
export function TextureSetup({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { status, busy, error, pack, enabled, setEnabled, refresh, importFile, downloadFromMojang } = useTextures();
  const [eula, setEula] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const eulaId = useId();
  const titleId = useId();
  const panelId = useId();
  const toggleId = useId();
  const version = DEFAULT_PROFILE.minecraftVersion;
  const ready = !!pack;

  // Move focus into the popover when it opens, so keyboard users land in it.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const close = () => {
    onOpenChange(false);
    document.getElementById(toggleId)?.focus();
  };

  const statusText: ReactNode = busy ? (
    busy
  ) : ready && enabled ? (
    <>
      <span className="text-fg">Echte Texturen</span> aus Minecraft {pack.version}
    </>
  ) : ready ? (
    <>
      <span className="text-fg">Einfache Farben</span>
      <span className="text-fg-subtle"> – Texturen ausgeschaltet</span>
    </>
  ) : (
    <>
      <span className="text-fg">Einfache Farben</span>
      <span className="text-fg-subtle"> – Texturen nicht eingerichtet</span>
    </>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5" data-testid="texture-setup">
      <p className="flex min-w-0 items-center gap-2 text-[13px] text-fg-muted">
        {busy ? <Spinner className="size-3.5 text-fg-subtle" /> : <StatusDot tone={ready && enabled ? 'accent' : 'neutral'} />}
        <span className="min-w-0" data-testid="texture-status" data-ready={ready} aria-live="polite" title={status?.message}>
          {statusText}
        </span>
      </p>
      <div className="flex items-center gap-3">
        {ready ? <Switch checked={enabled} onChange={setEnabled} label="Texturen" testId="texture-toggle" className="py-1.5" /> : null}
        <Button
          id={toggleId}
          size="sm"
          variant={ready ? 'ghost' : 'secondary'}
          icon={<Icon name={ready ? 'settings' : 'image'} />}
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-controls={panelId}
          data-testid="texture-setup-toggle"
        >
          {ready ? 'Quelle ändern' : 'Texturen einrichten'}
        </Button>
      </div>

      {error && !open ? (
        <p role="alert" className="flex basis-full items-start gap-1.5 text-xs text-danger-text" data-testid="texture-error">
          <Icon name="alert" className="mt-px size-3.5" />
          <span>Texturen: {error}</span>
        </p>
      ) : null}

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          tabIndex={-1}
          data-testid="texture-setup-panel"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              close();
            }
          }}
          className="absolute right-3 bottom-full left-3 z-20 mb-2 flex max-h-[min(70dvh,640px)] flex-col overflow-hidden rounded-xl border border-line-strong bg-surface shadow-(--shadow-dialog) focus:outline-none sm:right-auto sm:w-[460px]"
        >
          <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <h3 id={titleId} className="text-sm font-semibold text-fg">
                Echte Minecraft-Texturen
              </h3>
              <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">
                Aus deiner eigenen Minecraft-Installation, nur lokal ausgelesen. Sie bleiben auf diesem PC; das Projekt enthält keine
                Mojang-Dateien.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Texturen-Einrichtung schließen"
              className="-mt-1 -mr-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fg-subtle hover:bg-hover hover:text-fg"
            >
              <Icon name="x" />
            </button>
          </header>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 py-4 text-[13px] leading-snug text-fg-muted">
            {busy ? (
              <p role="status" className="flex items-center gap-2 text-fg">
                <Spinner className="size-4 text-accent-text" />
                {busy}
              </p>
            ) : ready ? (
              <Callout tone="success" title={`Aktiv: Minecraft ${pack.version}`}>
                {status?.source?.label ? `Quelle: ${status.source.label}` : null}
              </Callout>
            ) : status && !status.available && status.message ? (
              <Callout tone="warning">{status.message}</Callout>
            ) : null}
            {error ? (
              <Callout tone="danger" role="alert" title="Das hat nicht geklappt" data-testid="texture-error">
                {error}
              </Callout>
            ) : null}

            <ol className="flex flex-col gap-4">
              <Step number={1} title="Automatisch suchen">
                <p>
                  In den Ordnern des offiziellen Launchers, von CurseForge, Modrinth und Prism. Version {version} muss dort einmal gestartet
                  worden sein.
                </p>
                <Button size="sm" icon={<Icon name="refresh" />} onClick={refresh} disabled={!!busy} className="self-start" data-testid="texture-refresh">
                  Erneut suchen
                </Button>
              </Step>

              <Step number={2} title="Minecraft-Datei selbst auswählen">
                <p>Die Client-Datei {version}.jar deiner Installation.</p>
                <details className="group rounded-lg border border-line bg-canvas/60">
                  <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1.5 px-3 text-fg hover:text-fg [&::-webkit-details-marker]:hidden">
                    <Icon name="chevron-right" className="size-3.5 text-fg-subtle transition-transform group-open:rotate-90" />
                    Wo liegt die Datei?
                  </summary>
                  <dl className="flex flex-col gap-1.5 border-t border-line px-3 py-2">
                    <div>
                      <dt className="text-xs text-fg-subtle">CurseForge</dt>
                      <dd>
                        <code className="font-mono text-xs break-all text-fg">
                          C:\Users\&lt;Name&gt;\curseforge\minecraft\Install\versions\{version}\{version}.jar
                        </code>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-fg-subtle">Offizieller Launcher</dt>
                      <dd>
                        <code className="font-mono text-xs break-all text-fg">%APPDATA%\.minecraft\versions\{version}\{version}.jar</code>
                      </dd>
                    </div>
                  </dl>
                </details>
                <Button
                  size="sm"
                  icon={<Icon name="folder" />}
                  onClick={() => fileRef.current?.click()}
                  disabled={!!busy}
                  className="self-start"
                  data-testid="texture-pick-file"
                >
                  Minecraft-Datei auswählen …
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".jar,application/java-archive"
                  className="hidden"
                  data-testid="texture-file-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void importFile(file);
                  }}
                />
              </Step>

              <Step number={3} title="Von Mojang laden">
                <p>
                  Die offizielle Client-Datei {version} (ca. 30 MB) von Mojangs Servern, geprüft mit der Prüfsumme aus Mojangs Versionsliste.
                </p>
                <label htmlFor={eulaId} className="flex cursor-pointer items-start gap-2.5 py-1">
                  <input
                    id={eulaId}
                    type="checkbox"
                    checked={eula}
                    onChange={(e) => setEula(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 cursor-pointer accent-accent"
                    data-testid="texture-eula"
                  />
                  <span>
                    Ich besitze Minecraft Java Edition und akzeptiere die{' '}
                    <a
                      href="https://www.minecraft.net/eula"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-fg underline decoration-fg-subtle underline-offset-2 hover:decoration-fg"
                    >
                      Minecraft-EULA
                      <Icon name="external" className="size-3" />
                    </a>
                    .
                  </span>
                </label>
                <Button
                  size="sm"
                  icon={<Icon name="download" />}
                  disabled={!eula || !!busy}
                  onClick={() => void downloadFromMojang(version)}
                  className="self-start"
                  data-testid="texture-download"
                >
                  Von Mojang laden
                </Button>
              </Step>
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  );
}
