'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useId, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { EditToolbar, LayerControl, ModeHint, PreviewToolbar } from '@/components/preview/PreviewToolbar';
import type { CameraAction, CellAction, RenderMode } from '@/components/preview/VoxelScene';
import type { EditMode } from '@/components/editor/EditorPanel';
import { SceneErrorBoundary } from '@/components/preview/SceneErrorBoundary';
import { TextureSetup } from '@/components/preview/textures/TextureSetup';
import { useTextures } from '@/components/preview/textures/TextureProvider';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Icon, Spinner } from '@/components/ui/Icon';

const VoxelScene = dynamic(() => import('@/components/preview/VoxelScene').then((m) => m.VoxelScene), {
  ssr: false,
  loading: () => (
    <CenteredState>
      <p role="status" className="flex items-center gap-2 text-sm text-fg-muted">
        <Spinner className="size-4 text-fg-subtle" />
        3D-Ansicht wird geladen …
      </p>
    </CenteredState>
  ),
});

/** Centres its content in the scene area; scrolls instead of clipping when the area is small. */
function CenteredState({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex overflow-y-auto p-6">
      <div className="m-auto w-full max-w-md">{children}</div>
    </div>
  );
}

function subscribeReducedMotion(callback: () => void): () => void {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

export interface PreviewEditing {
  mode: EditMode;
  onModeChange: (mode: EditMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCellAction: (action: CellAction) => void;
  editCount: number;
}

const EMPTY_STEPS: { title: string; text: string }[] = [
  { title: 'Beschreiben', text: 'Schreib in ein paar Sätzen, was du bauen möchtest – Art, Größe, Stil, Material.' },
  { title: '„Bauwerk generieren“ klicken', text: 'Daraus entsteht ein echtes Minecraft-Bauwerk in drei Varianten.' },
  { title: 'Ansehen, anpassen, exportieren', text: 'Dreh es hier in 3D, ändere einzelne Blöcke und lade es als .schem für WorldEdit herunter.' },
];

function EmptyState() {
  return (
    <CenteredState>
      <div className="text-center" data-testid="preview-empty">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl border border-line bg-raised text-fg-subtle">
          <Icon name="cube" className="size-6" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-fg">Noch kein Bauwerk</h3>
        <p className="mt-1 text-sm text-fg-muted">In drei Schritten zu deinem Minecraft-Bauwerk:</p>
      </div>
      <ol className="mt-5 flex flex-col gap-2">
        {EMPTY_STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3 rounded-lg border border-line bg-raised/60 px-3.5 py-3">
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-full border border-accent/45 bg-accent/12 text-xs font-semibold text-accent-text"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">
                <span className="sr-only">Schritt {index + 1}: </span>
                {step.title}
              </p>
              <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </CenteredState>
  );
}

function busyText(planning: boolean): string {
  return planning ? 'KI plant das Bauwerk …' : 'Bauwerk wird erzeugt …';
}

/** "Generierung fehlgeschlagen – details" → title + details; other messages stay whole. */
function splitError(error: string): { title: string; detail: string | null } {
  const at = error.indexOf(' – ');
  if (at <= 0) return { title: 'Das hat nicht geklappt', detail: error };
  return { title: error.slice(0, at), detail: error.slice(at + 3) };
}

/** Short model hash with a copy button: the same value appears in the export and in saved projects. */
function HashChip({ hash }: { hash: string }) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'failed'>('idle');
  const copy = () => {
    const done = (result: 'ok' | 'failed') => {
      setCopied(result);
      window.setTimeout(() => setCopied('idle'), 2000);
    };
    // The clipboard API exists only in secure contexts (localhost counts as one).
    if (!navigator.clipboard) return done('failed');
    navigator.clipboard.writeText(hash).then(
      () => done('ok'),
      () => done('failed'),
    );
  };
  return (
    <button
      type="button"
      onClick={copy}
      data-testid="preview-hash"
      title={`Prüfsumme des Modells (SHA-256): ${hash}\nGleich in Vorschau, Projekt und Export. Klick kopiert sie.`}
      aria-label={`Prüfsumme ${hash.slice(0, 8)} kopieren`}
      className="-mx-1 inline-flex h-6 items-center gap-1 rounded-md px-1 font-mono text-xs text-fg-subtle transition-colors hover:bg-hover hover:text-fg-muted"
    >
      {hash.slice(0, 8)}
      <Icon name={copied === 'ok' ? 'check' : 'copy'} className={`size-3.5 ${copied === 'ok' ? 'text-accent-text' : ''}`} />
      <span aria-live="polite" className={copied === 'idle' ? 'sr-only' : 'font-sans'}>
        {copied === 'ok' ? 'kopiert' : copied === 'failed' ? 'Kopieren nicht möglich' : ''}
      </span>
    </button>
  );
}

function ControlsHelp({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['Drehen', 'Linke Maustaste ziehen · ein Finger'],
    ['Zoomen', 'Mausrad · zwei Finger auseinander/zusammen'],
    ['Verschieben', 'Rechte Maustaste ziehen · zwei Finger ziehen'],
    ['Bearbeiten', 'Werkzeug wählen, dann kurz auf einen Block klicken'],
    ['Zurück', 'Strg+Z rückgängig, Strg+Y wiederholen, Esc wechselt zu „Ansehen“'],
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-fg">Bedienung der 3D-Ansicht</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Bedienhilfe schließen"
          className="-mr-1.5 inline-flex size-8 items-center justify-center rounded-md text-fg-subtle hover:bg-hover hover:text-fg"
        >
          <Icon name="x" />
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        {rows.map(([term, text]) => (
          <div key={term} className="contents">
            <dt className="font-medium text-fg">{term}</dt>
            <dd className="text-fg-muted">{text}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs leading-snug text-fg-subtle">Die Knöpfe rechts in der Ansicht drehen und zoomen auch per Tastatur oder Touch.</p>
    </div>
  );
}

export function PreviewPanel({
  model,
  title,
  busy,
  planning = false,
  error,
  editing,
}: {
  model: VoxelModel | null;
  title: string;
  busy: boolean;
  /** The AI is planning (before the generator runs); only changes the loading text. */
  planning?: boolean;
  error: string | null;
  editing: PreviewEditing;
}) {
  const [resetToken, setResetToken] = useState(0);
  const [layerY, setLayerY] = useState<number | null>(null);
  const [cameraAction, setCameraAction] = useState<CameraAction | null>(null);
  const maxLayer = model ? model.dimensions.height - 1 : 0;
  const effectiveLayer = layerY === null ? null : Math.min(layerY, maxLayer);
  const [showGrid, setShowGrid] = useState(true);
  const [rendered, setRendered] = useState<{ hash: string; faces: number; mode: RenderMode } | null>(null);
  const reducedMotion = useReducedMotion();
  const { pack, enabled } = useTextures();
  const texturePack = enabled ? pack : null;
  const renderMode: RenderMode = texturePack ? 'textures' : 'colors';
  const onRendered = useCallback((hash: string, faces: number, mode: RenderMode) => setRendered({ hash, faces, mode }), []);
  // Only a mesh of exactly this model in the current render mode counts as rendered.
  const renderedNow = rendered && model && rendered.hash === model.hash && rendered.mode === renderMode ? rendered : null;

  // One footer popover at a time: texture setup or controls help.
  const [popover, setPopover] = useState<'textures' | 'help' | null>(null);
  const helpId = useId();
  // A new texture pack means the setup worked: close it, the status line shows the result.
  const [seenPack, setSeenPack] = useState(pack);
  if (seenPack !== pack) {
    setSeenPack(pack);
    if (pack && popover === 'textures') setPopover(null);
  }
  useEffect(() => {
    if (popover !== 'help') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopover(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [popover]);

  const editingActive = !!model && editing.mode !== 'view';
  const failure = error ? splitError(error) : null;

  return (
    <section
      aria-labelledby="preview-heading"
      aria-busy={busy || undefined}
      className="relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-(--shadow-panel)"
    >
      <header className="flex min-w-0 flex-col gap-0.5 border-b border-line px-4 py-3">
        <h2 id="preview-heading" className="truncate text-[15px] leading-6 font-semibold text-fg" data-testid="building-title">
          {model ? title : '3D-Vorschau'}
        </h2>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-fg-muted" data-testid="preview-dimensions">
            {model ? (
              <>
                <span title="Breite × Höhe × Tiefe in Blöcken">
                  <span className="text-fg tabular-nums">
                    {model.dimensions.width} × {model.dimensions.height} × {model.dimensions.length}
                  </span>{' '}
                  Blöcke <span className="text-fg-subtle">(B × H × T)</span>
                </span>
                <span aria-hidden="true" className="text-fg-subtle">
                  ·
                </span>
                <span title="Startwert des Generators – derselbe Seed ergibt dasselbe Bauwerk">Seed {model.spec.seed}</span>
                {editing.editCount > 0 ? (
                  <Badge tone="gold" icon={<Icon name="pencil" className="size-3" />}>
                    bearbeitet ({editing.editCount})
                  </Badge>
                ) : null}
              </>
            ) : (
              'Hier erscheint dein Bauwerk in 3D.'
            )}
          </p>
          {model ? <HashChip key={model.hash} hash={model.hash} /> : null}
        </div>
      </header>

      {model ? (
        <div className="@container border-b border-line px-4 py-2.5">
          <EditToolbar
            mode={editing.mode}
            onModeChange={editing.onModeChange}
            canUndo={editing.canUndo}
            canRedo={editing.canRedo}
            onUndo={editing.onUndo}
            onRedo={editing.onRedo}
            disabled={!model}
          />
          <div className="mt-2">
            <ModeHint mode={editing.mode} />
          </div>
        </div>
      ) : null}

      {failure ? (
        <Callout tone="danger" role="alert" data-testid="error-alert" title={failure.title} className="mx-4 my-3">

          {failure.detail ? <p className="text-fg">{failure.detail}</p> : null}
          <p className="mt-1">
            Versuche es noch einmal. Bleibt der Fehler, hilft oft ein Neuladen der Seite – nicht gespeicherte Änderungen gehen dabei
            verloren.
          </p>
        </Callout>
      ) : null}

      <div
        className="relative min-h-[55dvh] flex-1 bg-canvas lg:min-h-0"
        data-testid="scene"
        data-model-hash={model?.hash ?? ''}
        data-rendered-hash={renderedNow?.hash ?? ''}
        data-face-count={renderedNow?.faces ?? 0}
        data-render-mode={renderMode}
      >
        {model ? (
          <SceneErrorBoundary>
            <VoxelScene
              model={model}
              resetToken={resetToken}
              showGrid={showGrid}
              reducedMotion={reducedMotion}
              mode={editing.mode}
              layerY={effectiveLayer}
              cameraAction={cameraAction}
              texturePack={texturePack}
              onRendered={onRendered}
              onCellAction={editing.onCellAction}
            />
          </SceneErrorBoundary>
        ) : busy ? (
          <CenteredState>
            <div role="status" className="flex flex-col items-center gap-3 text-center">
              <Spinner className="size-7 text-accent-text" />
              <p className="text-sm font-medium text-fg">{busyText(planning)}</p>
              <p className="text-[13px] text-fg-muted">Gleich siehst du es hier in 3D.</p>
            </div>
          </CenteredState>
        ) : (
          <EmptyState />
        )}

        {model ? (
          <>
            {/* Edit modes: a quiet accent frame shows that a click changes the model. */}
            {editingActive ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 ring-1 ring-accent/45 ring-inset" /> : null}
            <PreviewToolbar
              className="absolute top-3 right-3 z-10"
              onReset={() => setResetToken((t) => t + 1)}
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid((g) => !g)}
              onRotate={(dir) => setCameraAction((a) => ({ kind: 'rotate', value: (dir * Math.PI) / 8, seq: (a?.seq ?? 0) + 1 }))}
              onZoom={(dir) => setCameraAction((a) => ({ kind: 'zoom', value: dir > 0 ? 0.8 : 1.25, seq: (a?.seq ?? 0) + 1 }))}
              disabled={!model}
            />
            <LayerControl
              className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)]"
              layerY={effectiveLayer}
              maxLayer={maxLayer}
              onLayerChange={setLayerY}
              disabled={!model}
            />
          </>
        ) : null}

        {busy && model ? (
          <>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-canvas/35" />
            <p
              role="status"
              className="pointer-events-none absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-surface/95 px-3 py-1.5 text-[13px] text-fg shadow-(--shadow-panel)"
            >
              <Spinner className="size-3.5 text-accent-text" />
              {busyText(planning)}
            </p>
          </>
        ) : null}
      </div>

      <footer className="relative flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line px-4 py-2">
        <TextureSetup open={popover === 'textures'} onOpenChange={(open) => setPopover(open ? 'textures' : null)} />
        <Button
          variant="ghost"
          size="sm"
          icon={<Icon name="info" />}
          onClick={() => setPopover((p) => (p === 'help' ? null : 'help'))}
          aria-expanded={popover === 'help'}
          aria-controls={helpId}
          data-testid="controls-help-toggle"
          className="ml-auto"
        >
          Bedienung
        </Button>
        {popover === 'help' ? (
          <div
            id={helpId}
            role="region"
            aria-label="Bedienung der 3D-Ansicht"
            className="absolute right-3 bottom-full z-20 mb-2 w-[min(380px,calc(100%-1.5rem))] rounded-xl border border-line-strong bg-surface p-4 shadow-(--shadow-dialog)"
          >
            <ControlsHelp onClose={() => setPopover(null)} />
          </div>
        ) : null}
      </footer>
    </section>
  );
}
