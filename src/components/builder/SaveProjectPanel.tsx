'use client';

import { useState } from 'react';
import { MAX_PROJECT_NAME_LENGTH } from '@/lib/persistence/projects';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';

export function SaveProjectPanel({
  canSave,
  currentName,
  defaultName,
  dirty,
  busy,
  lastSavedAt,
  onSave,
  onSaveAsNew,
  onOpenLibrary,
}: {
  canSave: boolean;
  currentName: string | null;
  defaultName: string;
  dirty: boolean;
  busy: boolean;
  lastSavedAt: number | null;
  onSave: (name: string) => void;
  onSaveAsNew: (name: string) => void;
  onOpenLibrary: () => void;
}) {
  // The parent re-mounts this panel (key) when another project is opened.
  const [name, setName] = useState(currentName ?? defaultName);
  const trimmed = name.trim();
  return (
    <Panel
      title="Projekt"
      headingId="project-heading"
      description={
        currentName
          ? dirty
            ? 'Ungespeicherte Änderungen'
            : `Gespeichert${lastSavedAt ? ` um ${new Date(lastSavedAt).toLocaleTimeString('de-DE')}` : ''}`
          : 'Noch nicht gespeichert'
      }
      actions={
        <Button variant="ghost" className="min-h-8 px-3 py-1 text-xs" onClick={onOpenLibrary} data-testid="open-library-panel">
          Projekte …
        </Button>
      }
    >
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave && trimmed) onSave(trimmed);
        }}
      >
        <label htmlFor="project-name" className="text-[11px] font-medium text-mist-300">
          Projektname
        </label>
        <input
          id="project-name"
          data-testid="project-name-input"
          value={name}
          maxLength={MAX_PROJECT_NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-white/10 bg-night-950/70 px-3 py-2 text-sm text-snow-50 focus:border-gold-400/60 focus:outline-none"
        />
        <Button type="submit" variant="secondary" disabled={!canSave || !trimmed || busy} data-testid="save-button">
          {busy ? 'Speichert …' : currentName ? 'Projekt speichern' : 'Als neues Projekt speichern'}
        </Button>
        {currentName ? (
          <Button
            variant="ghost"
            disabled={!canSave || !trimmed || busy}
            onClick={() => onSaveAsNew(trimmed)}
            data-testid="save-as-new-button"
          >
            Als Kopie speichern
          </Button>
        ) : null}
        {!canSave ? <p className="text-[11px] text-mist-400">Zuerst ein Bauwerk generieren.</p> : null}
        <p className="text-[11px] text-mist-400">Gespeichert wird lokal in diesem Browser – Text, Einstellungen, Seed und alle Varianten inkl. Bearbeitungen.</p>
      </form>
    </Panel>
  );
}
