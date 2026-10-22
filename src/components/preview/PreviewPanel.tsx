'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState, useSyncExternalStore } from 'react';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { EditToolbar, PreviewToolbar } from '@/components/preview/PreviewToolbar';
import type { CameraAction, CellAction, RenderMode } from '@/components/preview/VoxelScene';
import type { EditMode } from '@/components/editor/EditorPanel';
import { SceneErrorBoundary } from '@/components/preview/SceneErrorBoundary';
import { TextureSetup } from '@/components/preview/textures/TextureSetup';
import { useActiveTexturePack } from '@/components/preview/textures/TextureProvider';

const VoxelScene = dynamic(() => import('@/components/preview/VoxelScene').then((m) => m.VoxelScene), {
  ssr: false,
  loading: () => <SceneMessage>3D-Ansicht wird geladen …</SceneMessage>,
});

function SceneMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-mist-400">{children}</div>;
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

export function PreviewPanel({
  model,
  title,
  busy,
  error,
  editing,
}: {
  model: VoxelModel | null;
  title: string;
  busy: boolean;
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
  const texturePack = useActiveTexturePack();
  const renderMode: RenderMode = texturePack ? 'textures' : 'colors';
  const onRendered = useCallback((hash: string, faces: number, mode: RenderMode) => setRendered({ hash, faces, mode }), []);
  // Only a mesh of exactly this model in the current render mode counts as rendered.
  const renderedNow = rendered && model && rendered.hash === model.hash && rendered.mode === renderMode ? rendered : null;

  return (
    <section
      aria-labelledby="preview-heading"
      className="relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/8 bg-night-900 shadow-[0_20px_60px_-30px_rgb(0_0_0/0.9)]"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-4 py-3">
        <div>
          <h2 id="preview-heading" className="text-base font-semibold text-snow-50" data-testid="building-title">
            {model ? title : '3D-Vorschau'}
          </h2>
          <p className="text-xs text-mist-400" data-testid="preview-dimensions">
            {model
              ? `${model.dimensions.width} × ${model.dimensions.height} × ${model.dimensions.length} Blöcke (B × H × T) · Seed ${model.spec.seed}${
                  editing.editCount > 0 ? ` · bearbeitet (${editing.editCount})` : ''
                }`
              : 'Noch kein Bauwerk generiert'}
          </p>
        </div>
        <PreviewToolbar
          onReset={() => setResetToken((t) => t + 1)}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid((g) => !g)}
          onRotate={(dir) => setCameraAction((a) => ({ kind: 'rotate', value: (dir * Math.PI) / 8, seq: (a?.seq ?? 0) + 1 }))}
          onZoom={(dir) => setCameraAction((a) => ({ kind: 'zoom', value: dir > 0 ? 0.8 : 1.25, seq: (a?.seq ?? 0) + 1 }))}
          disabled={!model}
        />
      </header>
      <div className="border-b border-white/6 px-4 py-2">
        <EditToolbar
          mode={editing.mode}
          onModeChange={editing.onModeChange}
          canUndo={editing.canUndo}
          canRedo={editing.canRedo}
          onUndo={editing.onUndo}
          onRedo={editing.onRedo}
          layerY={effectiveLayer}
          maxLayer={maxLayer}
          onLayerChange={setLayerY}
          disabled={!model}
        />
      </div>

      <div
        className="relative min-h-[55dvh] flex-1 lg:min-h-0"
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
        ) : (
          <SceneMessage>
            {busy ? 'Bauwerk wird generiert …' : 'Klicke auf „Bauwerk generieren“, um das Weihnachtshaus zu erzeugen.'}
          </SceneMessage>
        )}
        {busy && model ? (
          <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-gold-400" aria-hidden="true" />
        ) : null}
        {error ? (
          <div role="alert" data-testid="error-alert" className="absolute inset-x-4 bottom-4 rounded-xl border border-holly-500/40 bg-holly-600/20 p-3 text-sm text-holly-300">
            {error}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 border-t border-white/6 px-4 py-2">
        <TextureSetup />
        <p className="text-[11px] text-mist-400">
          Ziehen = drehen, Mausrad/Pinch = zoomen, Rechtsklick/zwei Finger = verschieben. Im Bearbeitungsmodus bearbeitet ein kurzer Klick den
          markierten Block.
        </p>
      </div>
    </section>
  );
}
