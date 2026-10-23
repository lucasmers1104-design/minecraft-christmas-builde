'use client';

import { useCallback, useState } from 'react';
import {
  deleteProject,
  duplicateProject,
  listProjects,
  MAX_PROJECT_NAME_LENGTH,
  PersistenceError,
  renameProject,
  type ProjectSummary,
} from '@/lib/persistence/projects';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Dialog } from '@/components/ui/Dialog';
import { TextInput } from '@/components/ui/Field';
import { Icon, Spinner } from '@/components/ui/Icon';

const dateFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

function describeError(error: unknown): string {
  if (error instanceof PersistenceError) return error.issues.length > 0 ? `${error.message}: ${error.issues.join('; ')}` : error.message;
  return error instanceof Error ? error.message : String(error);
}

type RowMode = { id: string; mode: 'rename' | 'delete' | 'open' } | null;

/**
 * Modal project list on the shared Dialog (focus trap, Escape and backdrop close). All data is
 * local to this browser (IndexedDB); nothing is synchronised.
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

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setRow(null);
      await refresh();
    } catch (e) {
      setError(describeError(e));
    }
  };

  const close = () => {
    setRow(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      onOpened={() => void refresh()}
      title="Projekte"
      description="Nur in diesem Browser gespeichert – keine Cloud, keine Synchronisierung zwischen Geräten."
      testId="project-library"
      headingId="library-heading"
      closeLabel="Projektliste schließen"
      closeTestId="library-close"
      size="lg"
    >
      {error ? (
        <Callout tone="danger" role="alert" title="Das hat nicht geklappt" className="mb-3" data-testid="library-error">
          {error}
        </Callout>
      ) : null}
      {projects === null ? (
        <p className="flex items-center gap-2 py-6 text-sm text-fg-muted">
          <Spinner />
          Projekte werden geladen …
        </p>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center" data-testid="library-empty">
          <span className="flex size-10 items-center justify-center rounded-full bg-raised text-fg-subtle">
            <Icon name="folder" className="size-5" />
          </span>
          <p className="text-sm font-medium text-fg">Noch keine gespeicherten Projekte</p>
          <p className="max-w-sm text-[13px] text-fg-muted">
            Generiere ein Bauwerk und speichere es rechts unter „Projekt speichern“. Danach findest du es hier wieder.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="project-list">
          {projects.map((p) => {
            const active = row?.id === p.id ? row.mode : null;
            const isCurrent = p.id === currentId;
            return (
              <li
                key={p.id}
                data-testid="project-row"
                data-project-id={p.id}
                className={`rounded-lg border px-3 py-3 ${isCurrent ? 'border-gold/40 bg-gold/5' : 'border-line bg-raised'}`}
              >
                {active === 'rename' ? (
                  <form
                    className="flex flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(() => renameProject(p.id, nameDraft));
                    }}
                  >
                    <label className="sr-only" htmlFor={`rename-${p.id}`}>
                      Neuer Name für „{p.name}“
                    </label>
                    <TextInput
                      id={`rename-${p.id}`}
                      data-testid="rename-input"
                      autoFocus
                      value={nameDraft}
                      maxLength={MAX_PROJECT_NAME_LENGTH}
                      onChange={(e) => setNameDraft(e.target.value)}
                      className="h-8 min-w-48 flex-1 basis-48"
                    />
                    <Button type="submit" variant="primary" size="sm" data-testid="rename-confirm" disabled={!nameDraft.trim()}>
                      Übernehmen
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRow(null)}>
                      Abbrechen
                    </Button>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1 basis-56">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="min-w-0 truncate text-sm font-medium text-fg" data-testid="project-name">
                          {p.name}
                        </p>
                        {isCurrent ? (
                          <Badge tone="gold" data-testid="project-current">
                            aktuell geöffnet
                          </Badge>
                        ) : null}
                        {p.edited ? <Badge tone="neutral">bearbeitet</Badge> : null}
                      </div>
                      <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">
                        zuletzt geändert {dateFormat.format(p.updatedAt)}
                      </p>
                      <p className="text-xs leading-snug text-fg-subtle">
                        {p.dimensions.width} × {p.dimensions.height} × {p.dimensions.length} Blöcke · Java {p.minecraftVersion} ·{' '}
                        {p.variantCount} {p.variantCount === 1 ? 'Variante' : 'Varianten'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant={active === 'open' ? 'danger' : 'secondary'}
                        size="sm"
                        data-testid="project-open"
                        icon={<Icon name="folder" />}
                        onClick={() => {
                          if (hasUnsavedChanges && !isCurrent && active !== 'open') setRow({ id: p.id, mode: 'open' });
                          else void run(() => onOpen(p.id));
                        }}
                      >
                        {active === 'open' ? 'Trotzdem öffnen' : 'Öffnen'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        data-testid="project-rename"
                        aria-label={`„${p.name}“ umbenennen`}
                        title="Umbenennen"
                        onClick={() => {
                          setNameDraft(p.name);
                          setRow({ id: p.id, mode: 'rename' });
                        }}
                      >
                        <Icon name="pencil" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        data-testid="project-duplicate"
                        aria-label={`„${p.name}“ duplizieren`}
                        title="Duplizieren (als Kopie speichern)"
                        onClick={() => void run(() => duplicateProject(p.id))}
                      >
                        <Icon name="copy" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        data-testid="project-delete"
                        aria-label={`„${p.name}“ löschen`}
                        title="Löschen"
                        className="hover:text-danger-text"
                        onClick={() => setRow({ id: p.id, mode: 'delete' })}
                      >
                        <Icon name="trash" />
                      </Button>
                    </div>
                  </div>
                )}
                {active === 'open' ? (
                  <Callout
                    tone="warning"
                    role="alert"
                    className="mt-3"
                    title="Ungespeicherte Änderungen gehen verloren"
                    actions={
                      <Button variant="ghost" size="sm" onClick={() => setRow(null)}>
                        Abbrechen
                      </Button>
                    }
                  >
                    Dein aktuelles Bauwerk hat Änderungen, die noch nicht gespeichert sind. Klicke „Trotzdem öffnen“, um sie zu verwerfen.
                  </Callout>
                ) : null}
                {active === 'delete' ? (
                  <Callout
                    tone="danger"
                    role="alert"
                    className="mt-3"
                    title={`„${p.name}“ endgültig löschen?`}
                    actions={
                      <>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Icon name="trash" />}
                          data-testid="project-delete-confirm"
                          onClick={() => void run(() => deleteProject(p.id))}
                        >
                          Endgültig löschen
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setRow(null)}>
                          Abbrechen
                        </Button>
                      </>
                    }
                  >
                    Das Projekt mit allen Varianten wird aus diesem Browser entfernt. Das lässt sich nicht rückgängig machen.
                  </Callout>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
