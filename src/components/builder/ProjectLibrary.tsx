'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteProject,
  duplicateProject,
  listProjects,
  MAX_PROJECT_NAME_LENGTH,
  PersistenceError,
  renameProject,
  type ProjectSummary,
} from '@/lib/persistence/projects';
import { Button } from '@/components/ui/Button';

const dateFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

function describeError(error: unknown): string {
  if (error instanceof PersistenceError) return error.issues.length > 0 ? `${error.message}: ${error.issues.join('; ')}` : error.message;
  return error instanceof Error ? error.message : String(error);
}

type RowMode = { id: string; mode: 'rename' | 'delete' | 'open' } | null;

/**
 * Modal project list (native <dialog>: focus trap, Escape closes). All data is local to
 * this browser; nothing is synchronised.
 */
export function ProjectLibrary({
  open,
  onClose,
  onOpen,
  currentId,
  hasUnsavedChanges,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: (id: string) => Promise<void>;
  currentId: string | null;
  hasUnsavedChanges: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<RowMode>(null);
  const [nameDraft, setNameDraft] = useState('');

  const refresh = useCallback(async () => {
    try {
      setProjects(await listProjects());
      setError(null);
    } catch (e) {
      setError(describeError(e));
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      void refresh();
    } else if (!open && dialog.open) dialog.close();
  }, [open, refresh]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setRow(null);
      await refresh();
    } catch (e) {
      setError(describeError(e));
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="library-heading"
      data-testid="project-library"
      className="m-auto w-[min(640px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-night-850 p-0 text-snow-50 shadow-2xl backdrop:bg-night-950/80"
    >
      <header className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div>
          <h2 id="library-heading" className="text-base font-semibold">
            Projekte
          </h2>
          <p className="text-xs text-mist-400">Lokal in diesem Browser gespeichert (IndexedDB) – keine Cloud-Synchronisierung.</p>
        </div>
        <Button variant="ghost" onClick={onClose} aria-label="Projektliste schließen" data-testid="library-close">
          Schließen
        </Button>
      </header>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
        {error ? (
          <p role="alert" className="mb-3 rounded-lg border border-holly-500/40 bg-holly-600/20 px-3 py-2 text-sm text-holly-300" data-testid="library-error">
            {error}
          </p>
        ) : null}
        {projects === null ? (
          <p className="text-sm text-mist-400">Lade Projekte …</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-mist-400" data-testid="library-empty">
            Noch keine gespeicherten Projekte. Speichere ein generiertes Bauwerk über „Projekt speichern“.
          </p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="project-list">
            {projects.map((p) => {
              const active = row?.id === p.id ? row.mode : null;
              return (
                <li
                  key={p.id}
                  data-testid="project-row"
                  data-project-id={p.id}
                  className={`rounded-xl border px-3 py-2.5 ${p.id === currentId ? 'border-gold-400/50 bg-gold-400/8' : 'border-white/8 bg-white/3'}`}
                >
                  {active === 'rename' ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void run(() => renameProject(p.id, nameDraft));
                      }}
                    >
                      <label className="sr-only" htmlFor={`rename-${p.id}`}>
                        Neuer Name
                      </label>
                      <input
                        id={`rename-${p.id}`}
                        data-testid="rename-input"
                        autoFocus
                        value={nameDraft}
                        maxLength={MAX_PROJECT_NAME_LENGTH}
                        onChange={(e) => setNameDraft(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-white/15 bg-night-950/70 px-2 py-1 text-sm"
                      />
                      <Button type="submit" variant="secondary" data-testid="rename-confirm">
                        Übernehmen
                      </Button>
                      <Button variant="ghost" onClick={() => setRow(null)}>
                        Abbrechen
                      </Button>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" data-testid="project-name">
                          {p.name}
                          {p.id === currentId ? <span className="ml-2 text-[11px] font-normal text-gold-300">(geöffnet)</span> : null}
                        </p>
                        <p className="text-[11px] text-mist-400">
                          zuletzt geändert {dateFormat.format(p.updatedAt)} · {p.dimensions.width}×{p.dimensions.height}×{p.dimensions.length} · Java{' '}
                          {p.minecraftVersion} · {p.variantCount} Varianten{p.edited ? ' · bearbeitet' : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          variant="secondary"
                          className="min-h-8 px-3 py-1 text-xs"
                          data-testid="project-open"
                          onClick={() => {
                            if (hasUnsavedChanges && p.id !== currentId && active !== 'open') setRow({ id: p.id, mode: 'open' });
                            else void run(() => onOpen(p.id));
                          }}
                        >
                          {active === 'open' ? 'Trotzdem öffnen' : 'Öffnen'}
                        </Button>
                        <Button
                          variant="ghost"
                          className="min-h-8 px-3 py-1 text-xs"
                          data-testid="project-rename"
                          onClick={() => {
                            setNameDraft(p.name);
                            setRow({ id: p.id, mode: 'rename' });
                          }}
                        >
                          Umbenennen
                        </Button>
                        <Button
                          variant="ghost"
                          className="min-h-8 px-3 py-1 text-xs"
                          data-testid="project-duplicate"
                          onClick={() => void run(() => duplicateProject(p.id))}
                        >
                          Duplizieren
                        </Button>
                        <Button
                          variant="ghost"
                          className="min-h-8 px-3 py-1 text-xs text-holly-300"
                          data-testid="project-delete"
                          onClick={() => setRow({ id: p.id, mode: 'delete' })}
                        >
                          Löschen
                        </Button>
                      </div>
                    </div>
                  )}
                  {active === 'open' ? (
                    <p className="mt-2 text-xs text-gold-300" role="alert">
                      Ungespeicherte Änderungen am aktuellen Bauwerk gehen verloren. „Trotzdem öffnen“ zum Bestätigen.
                    </p>
                  ) : null}
                  {active === 'delete' ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-holly-500/40 bg-holly-600/15 px-3 py-2" role="alert">
                      <span className="text-xs text-holly-300">„{p.name}“ endgültig löschen?</span>
                      <Button
                        variant="primary"
                        className="min-h-8 px-3 py-1 text-xs"
                        data-testid="project-delete-confirm"
                        onClick={() => void run(() => deleteProject(p.id))}
                      >
                        Endgültig löschen
                      </Button>
                      <Button variant="ghost" className="min-h-8 px-3 py-1 text-xs" onClick={() => setRow(null)}>
                        Abbrechen
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </dialog>
  );
}
