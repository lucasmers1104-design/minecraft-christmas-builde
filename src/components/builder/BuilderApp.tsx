'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { requireProfile } from '@/core/compat/profile';
import { parseDescription, type SpecPatch } from '@/core/generator/parseDescription';
import { DEFAULT_HOUSE_SPEC, type BuildSpec } from '@/core/schema/buildSpec';
import { flattenPatch, resolveSpec, withManual, withoutManual, type SettingPath } from '@/core/schema/resolveSpec';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { ApiRequestError, requestGeneration, requestSchematic, triggerDownload } from '@/lib/client/builderApi';
import { useHydrated } from '@/lib/client/useHydrated';
import { AppHeader, type BuilderStatus } from '@/components/builder/AppHeader';
import { ExportPanel, type ExportInfo } from '@/components/builder/ExportPanel';
import { FineControls } from '@/components/builder/FineControls';
import { buildingTitle } from '@/components/builder/labels';
import { MaterialList } from '@/components/builder/MaterialList';
import { PromptPanel } from '@/components/builder/PromptPanel';
import { StyleControls, type SettingsBinding } from '@/components/builder/StyleControls';
import { VariantSelector } from '@/components/builder/VariantSelector';
import { PreviewPanel } from '@/components/preview/PreviewPanel';

type MobileTab = 'input' | 'preview' | 'details';

const MOBILE_TABS: { id: MobileTab; label: string }[] = [
  { id: 'input', label: 'Eingabe' },
  { id: 'preview', label: '3D-Vorschau' },
  { id: 'details', label: 'Material & Export' },
];

function describeError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.issues.length > 0 ? `${error.message}: ${error.issues.join('; ')}` : error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

/** True if text or settings differ from what the shown variants were generated from. */
function specChanged(current: BuildSpec, generated: BuildSpec | undefined): boolean {
  if (!generated) return false;
  return JSON.stringify(current) !== JSON.stringify(generated);
}

export function BuilderApp() {
  const [description, setDescription] = useState(DEFAULT_HOUSE_SPEC.description);
  const [manual, setManual] = useState<SpecPatch>({});
  const [seed, setSeed] = useState(DEFAULT_HOUSE_SPEC.seed);
  const [version, setVersion] = useState(DEFAULT_HOUSE_SPEC.targetMinecraftVersion);
  const [notes, setNotes] = useState<string[]>([]);
  const [variants, setVariants] = useState<VoxelModel[]>([]);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<BuilderStatus>('bereit');
  const [busy, setBusy] = useState<'generate' | 'export' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<ExportInfo | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('input');
  const abortRef = useRef<AbortController | null>(null);
  const hydrated = useHydrated();

  const parsed = useMemo(() => parseDescription(description), [description]);
  const resolved = useMemo(
    () =>
      resolveSpec({ ...DEFAULT_HOUSE_SPEC, description, seed, targetMinecraftVersion: version }, parsed, manual),
    [description, seed, version, parsed, manual],
  );
  const spec = resolved.spec;
  const model = variants[selected] ?? null;
  const stale = specChanged(spec, variants[0]?.spec);
  const title = useMemo(() => (model ? buildingTitle(model.spec.kind, model.spec.style) : ''), [model]);

  const setSetting = useCallback((path: SettingPath, value: unknown) => setManual((m) => withManual(m, path, value)), []);
  const resetSetting = useCallback((path: SettingPath) => setManual((m) => withoutManual(m, path)), []);

  const generate = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy('generate');
    setStatus('arbeitet');
    setError(null);
    try {
      const result = await requestGeneration(spec, controller.signal);
      setVariants(result.variants);
      setNotes(result.warnings);
      setSelected(0);
      setStatus('generiert');
      setMobileTab('preview');
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(`Generierung fehlgeschlagen – ${describeError(e)}`);
      setStatus('fehler');
    } finally {
      if (abortRef.current === controller) setBusy(null);
    }
  }, [spec]);

  const exportSelected = useCallback(async () => {
    if (!model) return;
    setBusy('export');
    setStatus('arbeitet');
    setError(null);
    try {
      const file = await requestSchematic(model);
      triggerDownload(file);
      setLastExport({ fileName: file.fileName, bytes: file.blob.size, hash: file.hash });
      setStatus('exportiert');
    } catch (e) {
      setError(`Export fehlgeschlagen – ${describeError(e)}`);
      setStatus('fehler');
    } finally {
      setBusy(null);
    }
  }, [model]);

  const selectVariant = useCallback(
    (index: number) => {
      setSelected(index);
      if (variants.length > 0) setStatus('generiert');
    },
    [variants.length],
  );

  const binding: SettingsBinding = {
    spec,
    sources: resolved.sources,
    set: setSetting,
    reset: resetSetting,
    disabled: busy === 'generate',
  };

  const panelVisibility = (tab: MobileTab) => (mobileTab === tab ? 'flex' : 'hidden lg:flex');

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <AppHeader status={status} profile={requireProfile(spec.targetMinecraftVersion)} />

      <nav aria-label="Bereiche" className="border-b border-white/6 bg-night-950/60 px-4 py-2 lg:hidden">
        <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-white/4 p-1">
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mobileTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              data-testid={`tab-${tab.id}`}
              onClick={() => setMobileTab(tab.id)}
              className={`min-h-9 rounded-lg text-xs font-semibold transition-colors ${
                mobileTab === tab.id ? 'bg-night-700 text-gold-300' : 'text-mist-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="grid flex-1 grid-cols-1 gap-4 p-4 lg:min-h-0 lg:grid-cols-[minmax(300px,340px)_minmax(0,1fr)_minmax(320px,360px)] lg:px-6">
        <div id="panel-input" className={`${panelVisibility('input')} min-w-0 flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1`}>
          <PromptPanel
            description={description}
            onDescriptionChange={setDescription}
            onGenerate={generate}
            busy={busy === 'generate'}
            ready={hydrated}
            parsed={parsed}
            conflicts={resolved.conflicts}
          />
          <StyleControls
            binding={binding}
            onSeedChange={setSeed}
            onVersionChange={setVersion}
            manualCount={flattenPatch(manual).size}
            onResetAll={() => setManual({})}
          />
          <FineControls binding={binding} />
        </div>

        <div id="panel-preview" className={`${panelVisibility('preview')} min-h-[60dvh] min-w-0 flex-col gap-2 lg:min-h-0`}>
          {stale ? (
            <p className="rounded-lg border border-gold-400/30 bg-gold-400/10 px-3 py-2 text-xs text-gold-300" data-testid="stale-hint">
              Beschreibung oder Einstellungen wurden geändert. Die Vorschau zeigt noch das zuletzt generierte Bauwerk – zum
              Übernehmen neu generieren.
            </p>
          ) : null}
          {notes.length > 0 ? (
            <ul className="rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-xs text-mist-300" data-testid="generation-notes">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}
          <div className="min-h-0 flex-1">
            <PreviewPanel model={model} title={title} busy={busy === 'generate'} error={error} />
          </div>
        </div>

        <div id="panel-details" className={`${panelVisibility('details')} min-w-0 flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pl-1`}>
          <VariantSelector variants={variants} selected={selected} onSelect={selectVariant} />
          <MaterialList model={model} />
          <ExportPanel model={model} onExport={exportSelected} exporting={busy === 'export'} lastExport={lastExport} />
        </div>
      </main>
    </div>
  );
}
