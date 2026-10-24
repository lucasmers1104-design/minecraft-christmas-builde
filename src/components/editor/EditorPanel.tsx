'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import { countMaterials } from '@/core/analysis/materialCounts';
import { labelFor } from '@/core/blocks/registry';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { BlockSwatch } from '@/components/preview/textures/BlockSwatch';
import { Button } from '@/components/ui/Button';
import { Callout, type CalloutTone } from '@/components/ui/Callout';
import { inputClass } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { BlockPicker, BlockProperties, CompactSelect } from '@/components/editor/BlockPicker';

export type EditMode = 'view' | 'place' | 'remove' | 'paint' | 'pick';

export const EDIT_MODES: { id: EditMode; label: string; hint: string }[] = [
  { id: 'view', label: 'Ansehen', hint: 'Nur drehen und zoomen' },
  { id: 'place', label: 'Setzen', hint: 'Klick auf eine Blockfläche setzt den gewählten Block daneben, ausgerichtet wie im Spiel' },
  { id: 'remove', label: 'Entfernen', hint: 'Klick entfernt den Block' },
  { id: 'paint', label: 'Ersetzen', hint: 'Klick ersetzt den Block durch den gewählten' },
  { id: 'pick', label: 'Pipette', hint: 'Klick übernimmt den Block als Auswahl' },
];

const modeLabel = (id: EditMode) => EDIT_MODES.find((m) => m.id === id)?.label ?? id;

type Axis = 'x' | 'y' | 'z';

const AXES: readonly { axis: Axis; name: string; direction: string }[] = [
  { axis: 'x', name: 'Breite', direction: 'nach Osten' },
  { axis: 'y', name: 'Höhe', direction: 'nach oben' },
  { axis: 'z', name: 'Tiefe', direction: 'nach Süden' },
];

/** A titled sub-area of the editor that can be folded away (open by default). */
function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <details open className="group border-t border-line">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 hover:bg-hover/40 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-fg">{title}</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-fg-muted">{description}</span>
        </span>
        <Icon name="chevron-down" className="mt-0.5 size-4 text-fg-subtle -rotate-90 transition-transform group-open:rotate-0" />
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">{children}</div>
    </details>
  );
}

/**
 * Editing beside the 3D view: the chosen block ("brush") with its properties and a block
 * search, setting a single block by coordinate, and replacing one block type everywhere.
 * Mouse editing itself happens in the preview toolbar; this panel explains the link.
 */
export function EditorPanel({
  model,
  brush,
  onBrushChange,
  onSetAt,
  onReplaceAll,
  editCount,
  message,
  messageTone = 'info',
}: {
  model: VoxelModel | null;
  brush: string;
  onBrushChange: (state: string) => void;
  onSetAt: (cell: { x: number; y: number; z: number }, remove: boolean) => void;
  onReplaceAll: (from: string, to: string) => void;
  editCount: number;
  message: string | null;
  /** Look of the message: `danger`/`warning` for refused edits, `success` for done ones. */
  messageTone?: CalloutTone;
}) {
  const baseId = useId();
  const [coords, setCoords] = useState<Record<Axis, string>>({ x: '0', y: '0', z: '0' });
  const [replaceFrom, setReplaceFrom] = useState('');
  const materials = useMemo(() => (model ? countMaterials(model).entries : []), [model]);
  const fromState = materials.some((m) => m.state === replaceFrom) ? replaceFrom : (materials[0]?.state ?? '');
  const fromCount = materials.find((m) => m.state === fromState)?.count ?? 0;
  const d = model?.dimensions;
  const brushLabel = labelFor(brush);

  const maxOf = (axis: Axis) => (d ? (axis === 'x' ? d.width : axis === 'y' ? d.height : d.length) - 1 : 0);
  const parsed = Object.fromEntries(
    AXES.map(({ axis }) => {
      const text = coords[axis].trim();
      const n = /^\d+$/.test(text) ? Number.parseInt(text, 10) : Number.NaN;
      return [axis, n];
    }),
  ) as Record<Axis, number>;
  const invalid = AXES.filter(({ axis }) => !(parsed[axis] >= 0 && parsed[axis] <= maxOf(axis))).map(({ axis }) => axis);
  const coordsValid = invalid.length === 0;

  const description: ReactNode = model ? (
    editCount > 0 ? (
      <>
        {editCount.toLocaleString('de-DE')} Änderung{editCount === 1 ? '' : 'en'} an dieser Variante ·{' '}
        <span className="whitespace-nowrap">Rückgängig mit Strg+Z</span>
      </>
    ) : (
      'Unverändert wie generiert.'
    )
  ) : (
    'Verfügbar, sobald ein Bauwerk generiert ist.'
  );

  // States of the same block differ only in their properties; show those only where needed.
  const ambiguous = new Set<string>();
  const seenIds = new Set<string>();
  for (const m of materials) {
    if (seenIds.has(m.blockId)) ambiguous.add(m.blockId);
    seenIds.add(m.blockId);
  }
  const optionText = (m: (typeof materials)[number]) => {
    const props = m.state.slice(m.blockId.length).replace(/^\[|\]$/g, '').replace(/,/g, ', ');
    return `${m.label} – ${m.count.toLocaleString('de-DE')} ×${ambiguous.has(m.blockId) && props ? ` (${props})` : ''}`;
  };

  return (
    <Panel
      // Remount when the first model arrives, so the panel opens by itself after generating.
      key={model ? 'ready' : 'empty'}
      title="Bearbeiten"
      headingId="editor-heading"
      description={description}
      collapsible
      defaultOpen={!!model}
      bodyClassName="p-0"
    >
      {!model ? (
        <div className="flex flex-col gap-2 p-4 text-[13px] leading-snug text-fg-muted">
          <p>Sobald ein Bauwerk da ist, kannst du hier:</p>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>einen Block auswählen und mit der Maus in der Vorschau setzen, entfernen oder ersetzen,</li>
            <li>einen Block genau per Koordinate setzen,</li>
            <li>einen Blocktyp im ganzen Modell austauschen.</li>
          </ul>
        </div>
      ) : (
        <div className="flex flex-col">
          <section aria-labelledby={`${baseId}-brush`} className="flex flex-col gap-3 p-4">
            <h3 id={`${baseId}-brush`} className="text-sm font-semibold text-fg">
              Gewählter Block
            </h3>
            <div className="flex items-center gap-3 rounded-lg border border-line bg-raised p-3">
              <BlockSwatch block={brush} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg" data-testid="brush-label">
                  {brushLabel}
                </p>
                <p className="mt-0.5 font-mono text-xs break-all text-fg-subtle" data-testid="brush-state" title="Block-ID mit Eigenschaften">
                  {brush}
                </p>
              </div>
            </div>
            <BlockProperties value={brush} onChange={onBrushChange} />
            <p className="flex gap-2 rounded-lg bg-info/8 px-3 py-2 text-xs leading-snug text-fg-muted">
              <Icon name="info" className="mt-px size-3.5 text-info-text" />
              <span>
                Mit der Maus: In der Werkzeugleiste der Vorschau „{modeLabel('place')}“ wählen und auf eine Blockfläche klicken. Mit „
                {modeLabel('pick')}“ übernimmst du einen Block aus dem Modell.
              </span>
            </p>
            <BlockPicker value={brush} onChange={onBrushChange} />
          </section>

          <Section title="Per Koordinate setzen" description="Einen einzelnen Block an eine genaue Stelle setzen oder dort entfernen.">
            <p className="text-xs leading-snug text-fg-subtle">
              X = Breite (nach Osten), Y = Höhe (nach oben), Z = Tiefe (nach Süden). 0 / 0 / 0 ist die untere Nordwest-Ecke, also die
              Ecke, an der WorldEdit beim Einfügen deine Position ansetzt.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {AXES.map(({ axis, name, direction }) => {
                const id = `${baseId}-coord-${axis}`;
                const bad = invalid.includes(axis);
                return (
                  <div key={axis} className="min-w-0">
                    <label htmlFor={id} className="mb-1 block text-xs font-medium text-fg-muted" title={`${name}, ${direction}`}>
                      <span className="text-fg">{axis.toUpperCase()}</span> · {name}
                    </label>
                    <input
                      id={id}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={maxOf(axis)}
                      step={1}
                      data-testid={`coord-${axis}`}
                      value={coords[axis]}
                      aria-invalid={bad || undefined}
                      aria-describedby={`${id}-range`}
                      onChange={(e) => setCoords((c) => ({ ...c, [axis]: e.target.value }))}
                      className={`${inputClass} h-9 px-2.5 tabular-nums`}
                    />
                    <p id={`${id}-range`} className={`mt-1 text-xs tabular-nums ${bad ? 'text-danger-text' : 'text-fg-subtle'}`}>
                      0 bis {maxOf(axis)}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Icon name="plus" />}
                disabled={!coordsValid}
                onClick={() => onSetAt(parsed, false)}
                data-testid="coord-set"
              >
                Block setzen
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Icon name="trash" />}
                disabled={!coordsValid}
                onClick={() => onSetAt(parsed, true)}
                data-testid="coord-remove"
              >
                Block entfernen
              </Button>
            </div>
            <p className="text-xs leading-snug text-fg-subtle">
              {coordsValid ? (
                <>
                  „Block setzen“ setzt „{brushLabel}“ an X {parsed.x}, Y {parsed.y}, Z {parsed.z}.
                </>
              ) : (
                <span className="text-danger-text">Bitte ganze Zahlen innerhalb der angegebenen Bereiche eingeben.</span>
              )}
            </p>
          </Section>

          <Section title="Alle ersetzen" description="Einen Blocktyp im ganzen Modell gegen den gewählten Block austauschen.">
            {materials.length > 0 ? (
              <>
                <div>
                  <label htmlFor={`${baseId}-replace-from`} className="mb-1 block text-xs font-medium text-fg-muted">
                    Diesen Block im Modell ersetzen
                  </label>
                  <CompactSelect
                    id={`${baseId}-replace-from`}
                    value={fromState}
                    onChange={(e) => setReplaceFrom(e.target.value)}
                    data-testid="replace-from"
                  >
                    {materials.map((m) => (
                      <option key={m.state} value={m.state} title={m.state}>
                        {optionText(m)}
                      </option>
                    ))}
                  </CompactSelect>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2 text-[13px]">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <BlockSwatch block={fromState} className="size-5" />
                    <span className="truncate text-fg">{labelFor(fromState)}</span>
                  </span>
                  <Icon name="arrow-right" className="size-4 text-fg-subtle" />
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <BlockSwatch block={brush} className="size-5" />
                    <span className="truncate text-fg">{brushLabel}</span>
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={!fromState || fromState === brush}
                  onClick={() => onReplaceAll(fromState, brush)}
                  data-testid="replace-all"
                >
                  {fromCount.toLocaleString('de-DE')} × durch „{brushLabel}“ ersetzen
                </Button>
                {fromState === brush ? (
                  <p className="text-xs leading-snug text-fg-subtle">Das ist schon der gewählte Block. Wähle oben einen anderen Block als Ersatz.</p>
                ) : null}
              </>
            ) : (
              <p className="text-[13px] text-fg-muted">Das Modell enthält keine Blöcke, die man ersetzen könnte.</p>
            )}
          </Section>
        </div>
      )}

      {/* Result of the last edit (also of clicks in the 3D view). Sticks to the bottom while the panel is in view. */}
      <div aria-live="polite" className={message && model ? 'sticky bottom-0 z-20 rounded-b-xl border-t border-line bg-surface p-3' : ''}>
        {message && model ? (
          <Callout tone={messageTone} data-testid="editor-message">
            {message}
          </Callout>
        ) : null}
      </div>
    </Panel>
  );
}
