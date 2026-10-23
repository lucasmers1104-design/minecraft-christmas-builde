'use client';

import { useState } from 'react';
import { MAX_PROJECT_NAME_LENGTH } from '@/lib/persistence/projects';
import { StatusDot, type Tone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';

/** Save the current work as a project in this browser (IndexedDB). */
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
  const state: { tone: Tone; text: string } = currentName
    ? dirty
      ? { tone: 'gold', text: 'Ungespeicherte Änderungen' }
      : { tone: 'accent', text: `Gespeichert${lastSavedAt ? ` um ${new Date(lastSavedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : ''}` }
    : canSave
      ? { tone: 'gold', text: 'Noch nicht gespeichert' }
      : { tone: 'neutral', text: 'Noch nichts zu speichern' };
  return (
    <Panel
      title="Projekt speichern"
      headingId="project-heading"
      description={
        <span className="inline-flex items-center gap-2">
          <StatusDot tone={state.tone} />
          {state.text}
        </span>
      }
      actions={
        <Button variant="ghost" size="sm" icon={<Icon name="folder" />} onClick={onOpenLibrary} data-testid="open-library-panel">
          Alle Projekte
        </Button>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave && trimmed) onSave(trimmed);
        }}
      >
        <Field label="Projektname" htmlFor="project-name">
          <TextInput
            id="project-name"
            data-testid="project-name-input"
            value={name}
            maxLength={MAX_PROJECT_NAME_LENGTH}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            icon={<Icon name="save" />}
            loading={busy}
            disabled={!canSave || !trimmed}
            data-testid="save-button"
          >
            {busy ? 'Speichert …' : 'Speichern'}
          </Button>
          {currentName ? (
            <Button
              variant="secondary"
              className="flex-1"
              icon={<Icon name="copy" />}
              disabled={!canSave || !trimmed || busy}
              onClick={() => onSaveAsNew(trimmed)}
              data-testid="save-as-new-button"
              title="Speichert eine Kopie unter diesem Namen; das geöffnete Projekt bleibt unverändert."
            >
              Als neues Projekt
            </Button>
          ) : null}
        </div>
        <p className="flex items-start gap-1.5 text-xs leading-snug text-fg-subtle">
          <Icon name="info" className="mt-px size-3.5" />
          <span>
            {canSave
              ? 'Nur in diesem Browser gespeichert: Text, Einstellungen, Seed und alle Varianten samt Bearbeitungen.'
              : 'Zuerst ein Bauwerk generieren. Gespeichert wird nur in diesem Browser.'}
          </span>
        </p>
      </form>
    </Panel>
  );
}
