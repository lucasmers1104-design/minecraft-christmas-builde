'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState, useSyncExternalStore } from 'react';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { PreviewToolbar } from '@/components/preview/PreviewToolbar';
import { SceneErrorBoundary } from '@/components/preview/SceneErrorBoundary';

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

export function PreviewPanel({
  model,
  title,
  busy,
  error,
}: {
  model: VoxelModel | null;
  title: string;
  busy: boolean;
  error: string | null;
}) {
  const [resetToken, setResetToken] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [rendered, setRendered] = useState<{ hash: string; faces: number } | null>(null);
  const reducedMotion = useReducedMotion();
  const onRendered = useCallback((hash: string, faces: number) => setRendered({ hash, faces }), []);

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
              ? `${model.dimensions.width} × ${model.dimensions.height} × ${model.dimensions.length} Blöcke (B × H × T) · Seed ${model.spec.seed}`
              : 'Noch kein Bauwerk generiert'}
          </p>
        </div>
        <PreviewToolbar
          onReset={() => setResetToken((t) => t + 1)}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid((g) => !g)}
          disabled={!model}
        />
      </header>

      <div
        className="relative flex-1"
        data-testid="scene"
        data-model-hash={model?.hash ?? ''}
        data-rendered-hash={rendered && model && rendered.hash === model.hash ? rendered.hash : ''}
        data-face-count={rendered && model && rendered.hash === model.hash ? rendered.faces : 0}
      >
        {model ? (
          <SceneErrorBoundary>
            <VoxelScene
              model={model}
              resetToken={resetToken}
              showGrid={showGrid}
              reducedMotion={reducedMotion}
              onRendered={onRendered}
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
      <p className="border-t border-white/6 px-4 py-2 text-[11px] text-mist-400">
        Vereinfachte Voxel-Darstellung (keine Original-Texturen). Ziehen = drehen, Mausrad/Pinch = zoomen, Rechtsklick/zwei Finger = verschieben.
      </p>
    </section>
  );
}
