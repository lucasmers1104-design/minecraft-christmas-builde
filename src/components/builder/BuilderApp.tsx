'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AIR, blockState, labelFor } from '@/core/blocks/registry';
import { requireProfile } from '@/core/compat/profile';
import {
  blockAtCell,
  EditHistory,
  removeBlockCommand,
  replaceAllCommand,
  setBlockCommand,
  type Cell,
  type EditCommand,
} from '@/core/editor/editOperations';
import { parseDescription, type ParsedDescription, type SpecPatch } from '@/core/generator/parseDescription';
import { DEFAULT_HOUSE_SPEC, type BuildSpec } from '@/core/schema/buildSpec';
import { flattenPatch, resolveSpec, withManual, withoutManual, type SettingPath } from '@/core/schema/resolveSpec';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { ApiRequestError, requestGeneration, requestSchematic, triggerDownload } from '@/lib/client/builderApi';
import { useHydrated } from '@/lib/client/useHydrated';
import { fetchAiStatus, requestAiPlan, type AiPlanState, type AiStatus } from '@/lib/client/aiApi';
import {
  loadProject,
  PersistenceError,
  saveNewProject,
  updateProject,
  type LoadedProject,
  type ProjectContent,
} from '@/lib/persistence/projects';
import { AppHeader, type BuilderStatus } from '@/components/builder/AppHeader';
import { ExportPanel, type ExportInfo } from '@/components/builder/ExportPanel';
import { FineControls } from '@/components/builder/FineControls';
import { buildingTitle } from '@/components/builder/labels';
import { MaterialList } from '@/components/builder/MaterialList';
import { AiPlannerPanel } from '@/components/builder/AiPlannerPanel';
import { ProjectLibrary } from '@/components/builder/ProjectLibrary';
import { PromptPanel } from '@/components/builder/PromptPanel';
import { SaveProjectPanel } from '@/components/builder/SaveProjectPanel';
import { StyleControls, type SettingsBinding } from '@/components/builder/StyleControls';
import { VariantSelector } from '@/components/builder/VariantSelector';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import type { CellAction } from '@/components/preview/VoxelScene';
import { EditorPanel, type EditMode } from '@/components/editor/EditorPanel';

type MobileTab = 'input' | 'preview' | 'details';

const MOBILE_TABS: { id: MobileTab; label: string }[] = [
  { id: 'input', label: 'Eingabe' },
  { id: 'preview', label: '3D-Vorschau' },
  { id: 'details', label: 'Material & Export' },
];

function describeError(error: unknown): string {
  if (error instanceof PersistenceError) {
    return error.issues.length > 0 ? `${error.message}: ${error.issues.join('; ')}` : error.message;
  }
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
  const [edits, setEdits] = useState<number[]>([]);
  const [project, setProject] = useState<Pick<LoadedProject, 'id' | 'name' | 'updatedAt'> | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<EditMode>('view');
  const [brush, setBrush] = useState(() => blockState('spruce_planks'));
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  /** Undo/redo availability of the selected variant, synced after every history change. */
  const [historyFlags, setHistoryFlags] = useState({ canUndo: false, canRedo: false });
  const [regenerateArmed, setRegenerateArmed] = useState(false);
  const historiesRef = useRef<EditHistory[]>([]);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [aiChecking, setAiChecking] = useState(false);
  const [aiOn, setAiOn] = useState(false);
  const [aiPlan, setAiPlan] = useState<AiPlanState | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [plannedBy, setPlannedBy] = useState<string | null>(null);
  const [variants, setVariants] = useState<VoxelModel[]>([]);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<BuilderStatus>('bereit');
  const [busy, setBusy] = useState<'generate' | 'plan' | 'export' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<ExportInfo | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('input');
  const abortRef = useRef<AbortController | null>(null);
  const hydrated = useHydrated();

  const parsed = useMemo(() => parseDescription(description), [description]);
  const aiReady = !!aiStatus?.enabled && aiStatus.reachable && aiStatus.modelInstalled;
  // An AI plan replaces the rule-based text reading – but only for the exact text it was made for.
  // A stored plan is data: applying it needs no running model.
  const aiActive = aiOn && aiPlan !== null && aiPlan.description === description;
  const resolved = useMemo(() => {
    const base = { ...DEFAULT_HOUSE_SPEC, description, seed, targetMinecraftVersion: version };
    if (aiActive && aiPlan) {
      const fromAi: ParsedDescription = { patch: aiPlan.patch, recognized: [], warnings: aiPlan.unsupported };
      return resolveSpec(base, fromAi, manual, 'ki');
    }
    return resolveSpec(base, parsed, manual);
  }, [description, seed, version, parsed, manual, aiActive, aiPlan]);
  const spec = resolved.spec;
  const model = variants[selected] ?? null;
  const stale = specChanged(spec, variants[0]?.spec);
  const title = useMemo(() => (model ? buildingTitle(model.spec.kind, model.spec.style) : ''), [model]);

  const content: ProjectContent = useMemo(
    () => ({
      description,
      manual,
      seed,
      targetMinecraftVersion: version,
      variants,
      edits: variants.map((_, i) => edits[i] ?? 0),
      selected,
      aiPlan: plannedBy && aiPlan ? aiPlan : null,
    }),
    [description, manual, seed, version, variants, edits, selected, plannedBy, aiPlan],
  );
  const contentKey = useMemo(
    () =>
      JSON.stringify({
        description,
        manual,
        seed,
        version,
        hashes: variants.map((v) => v.hash),
        selected,
      }),
    [description, manual, seed, version, variants, selected],
  );
  const dirty = project ? contentKey !== savedKey : variants.length > 0;

  // Warn before leaving the page with unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const saveProject = useCallback(
    async (name: string, asNew: boolean) => {
      setSaving(true);
      setError(null);
      try {
        const saved = project && !asNew ? await updateProject(project.id, content, name) : await saveNewProject(name, content);
        setProject({ id: saved.id, name: saved.name, updatedAt: saved.updatedAt });
        setSavedKey(contentKey);
        setStatus('gespeichert');
      } catch (e) {
        setError(`Speichern fehlgeschlagen – ${describeError(e)}`);
        setStatus('fehler');
      } finally {
        setSaving(false);
      }
    },
    [project, content, contentKey],
  );

  const openProject = useCallback(async (id: string) => {
    const loaded = await loadProject(id);
    abortRef.current?.abort();
    setDescription(loaded.description);
    setManual(loaded.manual);
    setSeed(loaded.seed);
    setVersion(loaded.targetMinecraftVersion);
    setVariants(loaded.variants);
    setEdits(loaded.edits);
    setSelected(loaded.selected);
    setAiPlan(loaded.aiPlan ?? null);
    setAiOn(!!loaded.aiPlan);
    setPlannedBy(loaded.aiPlan?.model ?? null);
    historiesRef.current = [];
    setHistoryFlags({ canUndo: false, canRedo: false });
    setEditorMessage(null);
    setRegenerateArmed(false);
    setNotes([]);
    setLastExport(null);
    setError(null);
    setProject({ id: loaded.id, name: loaded.name, updatedAt: loaded.updatedAt });
    setSavedKey(
      JSON.stringify({
        description: loaded.description,
        manual: loaded.manual,
        seed: loaded.seed,
        version: loaded.targetMinecraftVersion,
        hashes: loaded.variants.map((v) => v.hash),
        selected: loaded.selected,
      }),
    );
    setStatus('gespeichert');
    setLibraryOpen(false);
    setMobileTab('preview');
  }, []);

  const historyFor = (index: number): EditHistory => {
    historiesRef.current[index] ??= new EditHistory();
    return historiesRef.current[index];
  };

  const syncHistoryFlags = (index: number) => {
    const h = historiesRef.current[index];
    setHistoryFlags({ canUndo: !!h?.canUndo, canRedo: !!h?.canRedo });
  };

  const replaceSelected = useCallback(
    (next: VoxelModel, delta: number, message: string) => {
      setVariants((vs) => vs.map((v, i) => (i === selected ? next : v)));
      setEdits((es) => es.map((n, i) => (i === selected ? Math.max(0, n + delta) : n)));
      syncHistoryFlags(selected);
      setEditorMessage(message);
      setStatus('bearbeitet');
    },
    [selected],
  );

  const runEdit = useCallback(
    (build: (m: VoxelModel) => EditCommand | null) => {
      const current = variants[selected];
      if (!current) return;
      try {
        const command = build(current);
        if (!command) {
          setEditorMessage('Keine Änderung nötig.');
          return;
        }
        replaceSelected(historyFor(selected).execute(current, command), 1, command.label);
      } catch (e) {
        setEditorMessage(describeError(e));
      }
    },
    [variants, selected, replaceSelected],
  );

  const undo = useCallback(() => {
    const current = variants[selected];
    const history = historiesRef.current[selected];
    if (!current || !history?.canUndo) return;
    replaceSelected(history.undo(current), -1, 'Rückgängig gemacht.');
  }, [variants, selected, replaceSelected]);

  const redo = useCallback(() => {
    const current = variants[selected];
    const history = historiesRef.current[selected];
    if (!current || !history?.canRedo) return;
    replaceSelected(history.redo(current), 1, 'Wiederholt.');
  }, [variants, selected, replaceSelected]);

  const onCellAction = useCallback(
    (action: CellAction) => {
      const current = variants[selected];
      if (!current) return;
      if (mode === 'pick') {
        if (!action.hit) return;
        try {
          const state = blockAtCell(current, action.hit);
          if (state !== AIR) {
            setBrush(state);
            setEditorMessage(`Pipette: „${labelFor(state)}“ ausgewählt.`);
          }
        } catch (e) {
          setEditorMessage(describeError(e));
        }
        return;
      }
      const cell: Cell | null = mode === 'place' ? action.place : action.hit;
      if (!cell) return;
      if (mode === 'place') {
        const d = current.dimensions;
        if (cell.x < 0 || cell.y < 0 || cell.z < 0 || cell.x >= d.width || cell.y >= d.height || cell.z >= d.length) {
          setEditorMessage('Dort ist kein Platz mehr im Volumen (Grenze des Bauwerks erreicht).');
          return;
        }
        if (current.palette[current.indices[cell.x + d.width * (cell.z + d.length * cell.y)]!] !== AIR) {
          setEditorMessage('Diese Zelle ist bereits belegt.');
          return;
        }
        runEdit((m) => setBlockCommand(m, cell, brush));
      } else if (mode === 'remove') runEdit((m) => removeBlockCommand(m, cell));
      else if (mode === 'paint') runEdit((m) => setBlockCommand(m, cell, brush));
    },
    [variants, selected, mode, brush, runEdit],
  );

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z), Escape leaves the edit tool.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Escape') setMode('view');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const setSetting = useCallback((path: SettingPath, value: unknown) => setManual((m) => withManual(m, path, value)), []);
  const resetSetting = useCallback((path: SettingPath) => setManual((m) => withoutManual(m, path)), []);

  const hasEdits = edits.some((n) => n > 0);

  const generate = useCallback(async () => {
    if (hasEdits && !regenerateArmed) {
      setRegenerateArmed(true);
      return;
    }
    setRegenerateArmed(false);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy('generate');
    setStatus('arbeitet');
    setError(null);
    try {
      let target = spec;
      let planner: string | null = aiActive && aiPlan ? aiPlan.model : null;
      if (aiOn && !aiReady && !aiActive) {
        setAiNotice('Lokale KI ist gerade nicht erreichbar – es wurde regelbasiert erzeugt.');
      }
      if (aiOn && aiReady && !aiActive && description.trim().length > 0) {
        // Ask the local model first; fall back to the rule-based reading if that fails.
        setBusy('plan');
        try {
          const plan = await requestAiPlan(description, controller.signal);
          setAiPlan(plan);
          setAiNotice(null);
          planner = plan.model;
          target = resolveSpec(
            { ...DEFAULT_HOUSE_SPEC, description, seed, targetMinecraftVersion: version },
            { patch: plan.patch, recognized: [], warnings: plan.unsupported },
            manual,
            'ki',
          ).spec;
        } catch (e) {
          if (controller.signal.aborted) return;
          setAiNotice(`Lokale KI nicht nutzbar – ${describeError(e)}. Es wurde regelbasiert erzeugt.`);
          planner = null;
        }
        setBusy('generate');
      }
      const result = await requestGeneration(target, controller.signal);
      setPlannedBy(planner);
      setVariants(result.variants);
      setEdits(result.variants.map(() => 0));
      historiesRef.current = [];
      setHistoryFlags({ canUndo: false, canRedo: false });
      setEditorMessage(null);
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
  }, [spec, hasEdits, regenerateArmed, aiActive, aiPlan, aiOn, aiReady, description, seed, version, manual]);

  const checkAi = useCallback(async () => {
    setAiChecking(true);
    try {
      setAiStatus(await fetchAiStatus());
    } catch (e) {
      setAiStatus({
        enabled: false,
        provider: 'off',
        model: '',
        reachable: false,
        modelInstalled: false,
        installedModels: [],
        message: `KI-Status nicht abrufbar: ${describeError(e)}`,
      });
    } finally {
      setAiChecking(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchAiStatus()
      .then((s) => {
        if (!controller.signal.aborted) setAiStatus(s);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

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
      const h = historiesRef.current[index];
      setHistoryFlags({ canUndo: !!h?.canUndo, canRedo: !!h?.canRedo });
      if (variants.length > 0) setStatus('generiert');
    },
    [variants.length],
  );

  const binding: SettingsBinding = {
    spec,
    sources: resolved.sources,
    set: setSetting,
    reset: resetSetting,
    disabled: busy === 'generate' || busy === 'plan',
  };

  const panelVisibility = (tab: MobileTab) => (mobileTab === tab ? 'flex' : 'hidden lg:flex');

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <AppHeader
        status={status}
        profile={requireProfile(spec.targetMinecraftVersion)}
        projectName={project?.name ?? null}
        onOpenLibrary={() => setLibraryOpen(true)}
        plannedBy={variants.length > 0 ? plannedBy : null}
      />
      <ProjectLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onOpen={openProject}
        currentId={project?.id ?? null}
        hasUnsavedChanges={dirty}
      />

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
            busy={busy === 'generate' || busy === 'plan'}
            planning={busy === 'plan'}
            aiActive={aiActive}
            plannerLabel={aiOn && aiReady ? `Planung: lokale KI (${aiStatus?.model}) · Blöcke: regelbasierter Generator` : 'Regelbasierter Generator · keine KI aktiv'}
            ready={hydrated}
            confirmRegenerate={regenerateArmed}
            parsed={parsed}
            conflicts={resolved.conflicts}
          />
          <AiPlannerPanel
            status={aiStatus}
            checking={aiChecking}
            onRecheck={() => void checkAi()}
            enabled={aiOn}
            onToggle={setAiOn}
            plan={aiPlan}
            planIsCurrent={aiPlan !== null && aiPlan.description === description}
            notice={aiNotice}
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
            <PreviewPanel
              model={model}
              title={title}
              busy={busy === 'generate' || busy === 'plan'}
              error={error}
              editing={{
                mode,
                onModeChange: setMode,
                canUndo: historyFlags.canUndo,
                canRedo: historyFlags.canRedo,
                onUndo: undo,
                onRedo: redo,
                onCellAction,
                editCount: edits[selected] ?? 0,
              }}
            />
          </div>
        </div>

        <div id="panel-details" className={`${panelVisibility('details')} min-w-0 flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pl-1`}>
          <VariantSelector variants={variants} selected={selected} onSelect={selectVariant} edits={edits} />
          <EditorPanel
            model={model}
            brush={brush}
            onBrushChange={setBrush}
            onSetAt={(cell, remove) => runEdit((m) => (remove ? removeBlockCommand(m, cell) : setBlockCommand(m, cell, brush)))}
            onReplaceAll={(from, to) => runEdit((m) => replaceAllCommand(m, from, to))}
            editCount={edits[selected] ?? 0}
            message={editorMessage}
          />
          <MaterialList model={model} />
          <ExportPanel model={model} onExport={exportSelected} exporting={busy === 'export'} lastExport={lastExport} />
          <SaveProjectPanel
            key={project?.id ?? 'neu'}
            canSave={variants.length > 0}
            currentName={project?.name ?? null}
            defaultName={`${title || 'Bauwerk'} vom ${new Date().toLocaleDateString('de-DE')}`}
            dirty={dirty}
            busy={saving}
            lastSavedAt={project?.updatedAt ?? null}
            onSave={(name) => void saveProject(name, false)}
            onSaveAsNew={(name) => void saveProject(name, true)}
            onOpenLibrary={() => setLibraryOpen(true)}
          />
        </div>
      </main>
    </div>
  );
}
