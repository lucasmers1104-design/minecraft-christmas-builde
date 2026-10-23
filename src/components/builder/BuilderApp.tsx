'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { modelDisplayName, type AiProvider } from '@/core/ai/providers';
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
import { planPlacement } from '@/core/editor/placement';
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
import { AppHeader, type BuilderStatus, type PlannedBy } from '@/components/builder/AppHeader';
import { ExportPanel, type ExportInfo } from '@/components/builder/ExportPanel';
import { FineControls } from '@/components/builder/FineControls';
import { buildingTitle } from '@/components/builder/labels';
import { MaterialList } from '@/components/builder/MaterialList';
import { AiPlannerPanel } from '@/components/builder/AiPlannerPanel';
import { ProjectLibrary } from '@/components/builder/ProjectLibrary';
import { GenerateBar, PromptPanel } from '@/components/builder/PromptPanel';
import { SaveProjectPanel } from '@/components/builder/SaveProjectPanel';
import { StyleControls, type SettingsBinding } from '@/components/builder/StyleControls';
import { VariantSelector } from '@/components/builder/VariantSelector';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import type { CellAction } from '@/components/preview/VoxelScene';
import { EditorPanel, type EditMode } from '@/components/editor/EditorPanel';
import { AiSettingsDialog } from '@/components/settings/AiSettingsDialog';
import { Callout } from '@/components/ui/Callout';

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

/** Who made a plan; plans saved before OpenRouter existed carry no source (= Ollama). */
function planSource(plan: object): AiProvider {
  return 'source' in plan && plan.source === 'openrouter' ? 'openrouter' : 'ollama';
}

/**
 * The AI plan as a project stores it. The stored schema is strict (unknown keys fail the
 * save), so only its fields are copied; optional ones only when present.
 */
function toStoredAiPlan(plan: AiPlanState): NonNullable<ProjectContent['aiPlan']> {
  const { description, model, durationMs, explanation, unsupported, patch, plan: fields, attempts, source, costUsd } = plan;
  return {
    description,
    model,
    durationMs,
    explanation,
    unsupported,
    patch,
    ...(fields ? { plan: fields } : {}),
    ...(attempts !== undefined ? { attempts } : {}),
    ...(source ? { source } : {}),
    ...(costUsd !== undefined ? { costUsd } : {}),
  };
}

/** One line under the generate button: who plans the building and who sets the blocks. */
function generatorModeLabel(aiOn: boolean, aiReady: boolean, aiActive: boolean, status: AiStatus | null): string {
  if (aiOn && aiReady && status) {
    const planner =
      status.provider === 'openrouter' ? (status.label ?? `${modelDisplayName(status.model)} über OpenRouter`) : `lokale KI (${status.model})`;
    return `Planung: ${planner} · Blöcke: regelbasierter Generator`;
  }
  if (aiActive) return 'Planung: vorhandener KI-Plan für diesen Text · Blöcke: regelbasierter Generator';
  if (aiOn) return 'Regelbasierter Generator · KI gerade nicht erreichbar';
  return 'Regelbasierter Generator · keine KI aktiv';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const [plannedBy, setPlannedBy] = useState<PlannedBy>(null);
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
      const fromAi: ParsedDescription = { patch: aiPlan.patch, recognized: [], warnings: [], unsupported: aiPlan.unsupported, explanation: aiPlan.explanation };
      return resolveSpec(base, fromAi, manual, 'ki');
    }
    return resolveSpec(base, parsed, manual);
  }, [description, seed, version, parsed, manual, aiActive, aiPlan]);
  const spec = resolved.spec;
  const model = variants[selected] ?? null;
  const stale = specChanged(spec, variants[0]?.spec);
  const title = useMemo(() => (model ? buildingTitle(model.spec.kind, model.spec.style, model.spec.theme) : ''), [model]);

  const content: ProjectContent = useMemo(
    () => ({
      description,
      manual,
      seed,
      targetMinecraftVersion: version,
      variants,
      edits: variants.map((_, i) => edits[i] ?? 0),
      selected,
      aiPlan: plannedBy && aiPlan ? toStoredAiPlan(aiPlan) : null,
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
    setPlannedBy(loaded.aiPlan ? { model: loaded.aiPlan.model, source: planSource(loaded.aiPlan) } : null);
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
        const notes = command.notes?.length ? ` Hinweis: ${command.notes.join('; ')}.` : '';
        if (command.changes.length === 0) {
          setEditorMessage(`Nicht gesetzt.${notes}`);
          return;
        }
        replaceSelected(historyFor(selected).execute(current, command), 1, `${command.label}.${notes}`);
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
      if (mode === 'place') {
        if (!action.place) return;
        // Orientation like in the game: view direction, clicked face and click height.
        const placement = planPlacement(
          { dimensions: current.dimensions, stateAt: (c) => blockAtCell(current, c) },
          { brush, hit: action.hit, place: action.place, face: action.face, point: action.point, look: action.look },
        );
        if (!placement.ok) {
          setEditorMessage(placement.reason);
          return;
        }
        runEdit((m) => setBlockCommand(m, placement.cell, placement.state));
        return;
      }
      const cell: Cell | null = action.hit;
      if (!cell) return;
      if (mode === 'remove') runEdit((m) => removeBlockCommand(m, cell));
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
      let planner: PlannedBy = aiActive && aiPlan ? { model: aiPlan.model, source: planSource(aiPlan) } : null;
      if (aiOn && !aiReady && !aiActive) {
        setAiNotice('Die KI ist gerade nicht erreichbar – es wurde regelbasiert erzeugt.');
      }
      if (aiOn && aiReady && !aiActive && description.trim().length > 0) {
        // Ask the AI for a plan first; fall back to the rule-based reading if that fails.
        setBusy('plan');
        try {
          const plan = await requestAiPlan(description, controller.signal);
          setAiPlan(plan);
          setAiNotice(null);
          planner = { model: plan.model, source: planSource(plan) };
          target = resolveSpec(
            { ...DEFAULT_HOUSE_SPEC, description, seed, targetMinecraftVersion: version },
            { patch: plan.patch, recognized: [], warnings: [], unsupported: plan.unsupported, explanation: plan.explanation },
            manual,
            'ki',
          ).spec;
        } catch (e) {
          if (controller.signal.aborted) return;
          setAiNotice(`Die KI-Planung hat nicht geklappt: ${describeError(e).replace(/\.$/, '')}. Es wurde regelbasiert erzeugt.`);
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

  // Mobile tabs: arrow keys move between the tabs (WAI-ARIA tabs pattern).
  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = MOBILE_TABS[(index + delta + MOBILE_TABS.length) % MOBILE_TABS.length];
    if (!next) return;
    setMobileTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  const busyLabel = busy === 'plan' ? 'KI plant …' : busy === 'export' ? 'Export wird geprüft …' : 'Wird erzeugt …';

  return (
    <div className="flex min-h-dvh flex-col bg-canvas lg:h-dvh">
      <AppHeader
        status={status}
        busyLabel={busyLabel}
        profile={requireProfile(spec.targetMinecraftVersion)}
        projectName={project?.name ?? null}
        onOpenLibrary={() => setLibraryOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        plannedBy={variants.length > 0 ? plannedBy : null}
      />
      <ProjectLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onOpen={openProject}
        currentId={project?.id ?? null}
        hasUnsavedChanges={dirty}
      />

      <AiSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={() => void checkAi()} />

      <nav aria-label="Bereiche" className="sticky top-0 z-20 border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur lg:hidden">
        <div role="tablist" aria-label="Bereich wählen" className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-surface p-1">
          {MOBILE_TABS.map((tab, index) => {
            const selectedTab = mobileTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selectedTab}
                aria-controls={`panel-${tab.id}`}
                tabIndex={selectedTab ? 0 : -1}
                data-testid={`tab-${tab.id}`}
                onClick={() => setMobileTab(tab.id)}
                onKeyDown={(e) => onTabKeyDown(e, index)}
                className={`h-9 rounded-md px-1 text-[13px] font-medium transition-colors ${
                  selectedTab ? 'bg-hover text-fg shadow-sm ring-1 ring-line-strong' : 'text-fg-muted hover:text-fg'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="grid flex-1 grid-cols-1 gap-4 p-4 lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)_300px] xl:grid-cols-[370px_minmax(0,1fr)_350px]">
        {/* Left: the guided input flow; the generate bar stays reachable at the bottom. */}
        <div id="panel-input" className={`${panelVisibility('input')} min-w-0 flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1.5`}>
          <PromptPanel
            description={description}
            onDescriptionChange={setDescription}
            ready={hydrated}
            aiActive={aiActive}
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
            onOpenSettings={() => setSettingsOpen(true)}
          />
          <StyleControls
            binding={binding}
            onSeedChange={setSeed}
            onVersionChange={setVersion}
            manualCount={flattenPatch(manual).size}
            onResetAll={() => setManual({})}
          />
          <FineControls binding={binding} />
          <div className="sticky bottom-0 z-10 -mx-4 mt-auto border-t border-line bg-canvas/95 px-4 pt-3 pb-4 backdrop-blur lg:mx-0 lg:border-t-0 lg:bg-canvas lg:px-0 lg:pt-2 lg:pb-0 lg:backdrop-blur-none">
            <GenerateBar
              onGenerate={generate}
              busy={busy === 'generate' || busy === 'plan'}
              planning={busy === 'plan'}
              ready={hydrated}
              confirmRegenerate={regenerateArmed}
              plannerLabel={generatorModeLabel(aiOn, aiReady, aiActive, aiStatus)}
              className="lg:rounded-xl lg:border lg:border-line lg:bg-surface lg:p-3 lg:shadow-(--shadow-panel)"
            />
          </div>
        </div>

        {/* Middle: the 3D preview dominates; hints above, variants right below it. */}
        <div id="panel-preview" className={`${panelVisibility('preview')} min-h-[60dvh] min-w-0 flex-col gap-3 lg:min-h-0`}>
          {stale ? (
            <Callout tone="warning" title="Die Vorschau ist nicht mehr aktuell" className="shrink-0" data-testid="stale-hint">
              Beschreibung oder Einstellungen wurden geändert. Die Vorschau zeigt noch das zuletzt generierte Bauwerk – generiere neu, um die
              Änderungen zu übernehmen.
            </Callout>
          ) : null}
          {notes.length > 0 ? (
            <Callout tone="info" title="Hinweise zum Bauwerk" className="shrink-0" data-testid="generation-notes">
              <ul className="flex flex-col gap-0.5">
                {notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Callout>
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
          {variants.length > 0 ? (
            <div className="shrink-0">
              <VariantSelector variants={variants} selected={selected} onSelect={selectVariant} edits={edits} />
            </div>
          ) : null}
        </div>

        {/* Right: what to do with the result – export, save, material, edit. */}
        <div id="panel-details" className={`${panelVisibility('details')} min-w-0 flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1.5`}>
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
          <MaterialList model={model} />
          <EditorPanel
            model={model}
            brush={brush}
            onBrushChange={setBrush}
            onSetAt={(cell, remove) => runEdit((m) => (remove ? removeBlockCommand(m, cell) : setBlockCommand(m, cell, brush)))}
            onReplaceAll={(from, to) => runEdit((m) => replaceAllCommand(m, from, to))}
            editCount={edits[selected] ?? 0}
            message={editorMessage}
          />
        </div>
      </main>
    </div>
  );
}
