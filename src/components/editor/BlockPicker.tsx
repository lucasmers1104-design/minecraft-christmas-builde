'use client';

import { useId, useMemo, useState, type KeyboardEvent, type SelectHTMLAttributes } from 'react';
import {
  blockIdOf,
  blockState,
  CATEGORY_LABELS,
  getBlockDefinition,
  listBlockDefinitions,
  parseBlockState,
  type BlockCategory,
  type BlockDefinition,
} from '@/core/blocks/registry';
import type { ShapeClass } from '@/core/blocks/shapes';
import { BlockSwatch } from '@/components/preview/textures/BlockSwatch';
import { Button } from '@/components/ui/Button';
import { inputClass } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';

/**
 * Block selection for the editor.
 *
 * - `BlockPicker`: search over German label and id, category chips and a keyboard-navigable
 *   list (only a page of rows is rendered at a time).
 * - `BlockProperties`: one select per block state property of the chosen block. Properties
 *   the app computes itself (from neighbours, like the game) are hidden and explained instead.
 */

type CategoryFilter = BlockCategory | 'all';

const PAGE = 60;
const CATEGORIES = Object.keys(CATEGORY_LABELS) as BlockCategory[];

/** Never set by hand: always false (`waterlogged`) or computed by the state resolver. */
const ALWAYS_HIDDEN = new Set(['waterlogged']);
const COMPUTED: Partial<Record<ShapeClass, readonly string[]>> = {
  stairs: ['shape'],
  fence: ['north', 'east', 'south', 'west'],
  pane: ['north', 'east', 'south', 'west'],
  wall: ['north', 'east', 'south', 'west', 'up'],
  leaves: ['distance', 'persistent'],
  fence_gate: ['in_wall'],
  door: ['half'],
  campfire: ['signal_fire'],
  grass_block: ['snowy'],
};

const COMPUTED_LABELS: Partial<Record<ShapeClass, string>> = {
  stairs: 'Treppenform (Ecken)',
  fence: 'Verbindungen zu den Nachbarn',
  pane: 'Verbindungen zu den Nachbarn',
  wall: 'Verbindungen und Mittelpfosten',
  leaves: 'Abstand zum Stamm (Laub zerfällt nie)',
  fence_gate: 'Absenkung zwischen Mauern',
  door: 'obere Türhälfte',
  campfire: 'Signalrauch über Heuballen',
  grass_block: 'verschneit unter Schnee',
};

/** Shapes that are oriented automatically when placed with a click in the 3D view. */
const ORIENTED: ReadonlySet<ShapeClass> = new Set([
  'stairs',
  'slab',
  'trapdoor',
  'door',
  'fence_gate',
  'pillar',
  'chain',
  'facing_cube',
  'barrel',
  'campfire',
  'petals',
  'lantern',
  'button',
  'end_rod',
  'lightning_rod',
  'rail',
  'vine',
]);

const PROPERTY_LABELS: Readonly<Record<string, string>> = {
  facing: 'Richtung',
  half: 'Hälfte',
  type: 'Art',
  axis: 'Achse',
  open: 'Offen',
  hinge: 'Scharnier',
  powered: 'Mit Redstone-Signal',
  lit: 'An',
  candles: 'Kerzen',
  layers: 'Schichten',
  hanging: 'Hängend',
  face: 'Befestigt an',
  stage: 'Wachstum',
  flower_amount: 'Blüten',
  shape: 'Form',
  up: 'Oben',
  north: 'Norden',
  east: 'Osten',
  south: 'Süden',
  west: 'Westen',
};

const VALUE_LABELS: Readonly<Record<string, string>> = {
  north: 'Norden',
  east: 'Osten',
  south: 'Süden',
  west: 'Westen',
  up: 'oben',
  down: 'unten',
  top: 'oben',
  bottom: 'unten',
  double: 'doppelt',
  true: 'ja',
  false: 'nein',
  x: 'X (Ost–West)',
  y: 'Y (senkrecht)',
  z: 'Z (Nord–Süd)',
  left: 'links',
  right: 'rechts',
  floor: 'Boden',
  wall: 'Wand',
  ceiling: 'Decke',
  north_south: 'gerade Nord–Süd',
  east_west: 'gerade Ost–West',
  ascending_north: 'steigt nach Norden',
  ascending_east: 'steigt nach Osten',
  ascending_south: 'steigt nach Süden',
  ascending_west: 'steigt nach Westen',
  north_east: 'Kurve Nord–Ost',
  north_west: 'Kurve Nord–West',
  south_east: 'Kurve Süd–Ost',
  south_west: 'Kurve Süd–West',
};

/** Lower case, umlauts and ß spelled out, underscores as spaces. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/_/g, ' ');
}

interface PickerEntry {
  def: BlockDefinition;
  short: string;
  haystack: string;
}

/** All placeable blocks, by category (registry order) and label. */
const ENTRIES: readonly PickerEntry[] = listBlockDefinitions()
  .filter((d) => d.id !== 'minecraft:air')
  .map((def) => {
    const short = def.id.replace('minecraft:', '');
    return { def, short, haystack: `${normalize(def.label)} ${normalize(short)} ${short}` };
  })
  .sort((a, b) => CATEGORIES.indexOf(a.def.category) - CATEGORIES.indexOf(b.def.category) || a.def.label.localeCompare(b.def.label, 'de'));

function visibleProperties(def: BlockDefinition): { shown: [string, readonly string[]][]; computed: string[] } {
  const computed = new Set(COMPUTED[def.shape] ?? []);
  const shown: [string, readonly string[]][] = [];
  const hidden: string[] = [];
  for (const [name, values] of Object.entries(def.properties)) {
    if (ALWAYS_HIDDEN.has(name)) continue;
    if (computed.has(name)) hidden.push(name);
    else shown.push([name, values]);
  }
  return { shown, computed: hidden };
}

const optionId = (base: string, short: string) => `${base}-${short}`;

/** A 36 px high select for the compact editor forms (the shared `Select` is 40 px). */
export function CompactSelect({ children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={`${inputClass} h-9 appearance-none pr-8 pl-2.5`} {...rest}>
        {children}
      </select>
      <Icon name="chevron-down" className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-fg-subtle" />
    </div>
  );
}

/** Selects for the editable properties of the chosen block, plus notes on automatic ones. */
export function BlockProperties({ value, onChange }: { value: string; onChange: (state: string) => void }) {
  const baseId = useId();
  const currentId = blockIdOf(value);
  const def = getBlockDefinition(currentId);
  if (!def) return null;
  const props = parseBlockState(value)?.properties ?? {};
  const properties = visibleProperties(def);
  const oriented = ORIENTED.has(def.shape);
  if (properties.shown.length === 0 && properties.computed.length === 0 && !oriented) return null;

  return (
    <div className="flex flex-col gap-3">
      {properties.shown.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-2 gap-y-3">
          {properties.shown.map(([name, values]) => {
            const id = `${baseId}-${name}`;
            return (
              <div key={name} className="min-w-0">
                <label htmlFor={id} className="mb-1 block truncate text-xs font-medium text-fg-muted" title={`Eigenschaft „${name}“`}>
                  {PROPERTY_LABELS[name] ?? name}
                </label>
                <CompactSelect
                  id={id}
                  value={props[name] ?? def.defaults[name]}
                  data-testid={`block-prop-${name}`}
                  onChange={(e) => onChange(blockState(currentId, { ...props, [name]: e.target.value }))}
                >
                  {values.map((v) => (
                    <option key={v} value={v}>
                      {VALUE_LABELS[v] ?? v}
                    </option>
                  ))}
                </CompactSelect>
              </div>
            );
          })}
        </div>
      ) : null}
      {properties.computed.length > 0 || oriented ? (
        <ul className="flex flex-col gap-1.5 text-xs leading-snug text-fg-subtle" data-testid="block-prop-notes">
          {properties.computed.length > 0 ? (
            <li className="flex gap-1.5">
              <Icon name="info" className="mt-px size-3.5" />
              <span>
                Automatisch wie im Spiel: {COMPUTED_LABELS[def.shape] ?? properties.computed.join(', ')}. Die App berechnet das aus den
                Nachbarblöcken.
              </span>
            </li>
          ) : null}
          {oriented ? (
            <li className="flex gap-1.5">
              <Icon name="info" className="mt-px size-3.5" />
              <span>Beim Setzen mit der Maus richtet sich der Block wie im Spiel nach Blickrichtung und angeklickter Fläche aus.</span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

/** Search, category chips and the block list. Choosing a block sets it with default properties. */
export function BlockPicker({ value, onChange }: { value: string; onChange: (state: string) => void }) {
  const baseId = useId();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [limit, setLimit] = useState(PAGE);
  const [active, setActive] = useState<string | null>(null);

  const words = useMemo(() => normalize(query).split(/\s+/).filter(Boolean), [query]);
  const matches = useMemo(() => ENTRIES.filter((e) => words.every((w) => e.haystack.includes(w))), [words]);
  const counts = useMemo(() => {
    const out = new Map<CategoryFilter, number>([['all', matches.length]]);
    for (const e of matches) out.set(e.def.category, (out.get(e.def.category) ?? 0) + 1);
    return out;
  }, [matches]);
  const filtered = useMemo(() => (category === 'all' ? matches : matches.filter((e) => e.def.category === category)), [matches, category]);
  const visible = filtered.slice(0, limit);

  const currentId = blockIdOf(value);
  const activeShort = active && visible.some((e) => e.short === active) ? active : null;

  const select = (entry: PickerEntry) => {
    setActive(entry.short);
    onChange(blockState(entry.def.id));
  };

  const resetPaging = () => {
    setLimit(PAGE);
    setActive(null);
  };

  const moveActive = (next: PickerEntry | undefined) => {
    if (!next) return;
    setActive(next.short);
    document.getElementById(optionId(baseId, next.short))?.scrollIntoView({ block: 'nearest' });
  };

  const onListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (visible.length === 0) return;
    const index = activeShort ? visible.findIndex((v) => v.short === activeShort) : visible.findIndex((v) => v.def.id === currentId);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveActive(visible[Math.min(visible.length - 1, index + 1)]);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(visible[Math.max(0, index - 1)]);
        break;
      case 'Home':
        e.preventDefault();
        moveActive(visible[0]);
        break;
      case 'End':
        e.preventDefault();
        moveActive(visible[visible.length - 1]);
        break;
      case 'Enter':
      case ' ': {
        const entry = visible[index];
        if (entry) {
          e.preventDefault();
          select(entry);
        }
        break;
      }
    }
  };

  // Rows grouped under category headings (consecutive, since the list is sorted by category).
  const groups: { category: BlockCategory; entries: PickerEntry[] }[] = [];
  for (const entry of visible) {
    const last = groups.at(-1);
    if (last && last.category === entry.def.category) last.entries.push(entry);
    else groups.push({ category: entry.def.category, entries: [entry] });
  }
  const remaining = filtered.length - visible.length;

  return (
    <div className="flex min-w-0 flex-col gap-2.5" data-testid="block-picker">
      <div>
        <label htmlFor={`${baseId}-search`} className="mb-1.5 block text-[13px] font-medium text-fg-muted">
          Anderen Block wählen
        </label>
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            id={`${baseId}-search`}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPaging();
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && visible.length > 0) {
                e.preventDefault();
                document.getElementById(`${baseId}-list`)?.focus();
                moveActive(visible[0]);
              }
            }}
            placeholder="Suchen, z. B. Fichte, Glas, lantern"
            data-testid="block-search"
            aria-controls={`${baseId}-list`}
            className={`${inputClass} h-9 pr-3 pl-9`}
          />
        </div>
      </div>

      <div role="group" aria-label="Kategorien" className="flex flex-wrap gap-1.5" data-testid="block-categories">
        {(['all', ...CATEGORIES] as CategoryFilter[]).map((c) => {
          const count = counts.get(c) ?? 0;
          const selected = category === c;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setCategory(c);
                resetPaging();
              }}
              data-testid={`block-category-${c}`}
              className={`inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs transition-colors ${
                selected
                  ? 'border-accent/70 bg-accent/15 font-medium text-accent-text'
                  : count === 0
                    ? 'border-line text-fg-subtle/70'
                    : 'border-line bg-raised text-fg-muted hover:border-line-strong hover:text-fg'
              }`}
            >
              {c === 'all' ? 'Alle' : CATEGORY_LABELS[c]}
              {words.length > 0 ? <span className={`tabular-nums ${selected ? 'text-accent-text/80' : 'text-fg-subtle'}`}>{count}</span> : null}
            </button>
          );
        })}
      </div>

      <div
        id={`${baseId}-list`}
        role="listbox"
        aria-label="Blöcke"
        tabIndex={0}
        aria-activedescendant={activeShort ? optionId(baseId, activeShort) : undefined}
        onKeyDown={onListKeyDown}
        className="max-h-64 overflow-y-auto rounded-lg border border-line bg-canvas/40"
        data-testid="block-list"
      >
        {groups.map((group) => (
          <div key={group.category} role="group" aria-labelledby={`${baseId}-group-${group.category}`}>
            <div
              id={`${baseId}-group-${group.category}`}
              role="presentation"
              className="sticky top-0 z-10 border-y border-line bg-raised px-3 py-1 text-xs font-medium text-fg-subtle first:border-t-0"
            >
              {CATEGORY_LABELS[group.category]}
            </div>
            {group.entries.map((entry) => {
              const selected = entry.def.id === currentId;
              const isActive = entry.short === activeShort;
              return (
                <div
                  key={entry.def.id}
                  id={optionId(baseId, entry.short)}
                  role="option"
                  aria-selected={selected}
                  onClick={() => select(entry)}
                  data-testid={`block-option-${entry.short}`}
                  className={`flex min-h-9 w-full cursor-pointer items-center gap-2.5 px-3 py-1 text-left text-[13px] ${
                    selected ? 'bg-accent/12 text-accent-text' : 'text-fg hover:bg-hover'
                  } ${isActive ? 'outline-2 -outline-offset-2 outline-accent-text' : ''}`}
                >
                  <BlockSwatch block={entry.def.id} className="size-5" />
                  <span className={`min-w-0 flex-1 truncate ${selected ? 'font-medium' : ''}`}>{entry.def.label}</span>
                  <span className="max-w-[45%] min-w-0 truncate font-mono text-xs text-fg-subtle" title={entry.def.id}>
                    {entry.short}
                  </span>
                  {selected ? <Icon name="check" className="size-4 text-accent-text" /> : null}
                </div>
              );
            })}
          </div>
        ))}
        {filtered.length === 0 ? (
          <div className="px-3 py-3 text-[13px] text-fg-muted">
            {matches.length > 0 && category !== 'all' ? (
              <>
                Nichts in „{CATEGORY_LABELS[category]}“.{' '}
                <button type="button" className="font-medium text-accent-text underline-offset-2 hover:underline" onClick={() => setCategory('all')}>
                  In allen Kategorien suchen ({matches.length})
                </button>
              </>
            ) : (
              <>Kein Block gefunden. Versuche es mit einem anderen Wort, auf Deutsch oder mit der englischen ID.</>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-8 items-center justify-between gap-2 text-xs text-fg-subtle">
        <span data-testid="block-count" aria-live="polite">
          {remaining > 0 ? `${visible.length} von ${filtered.length} Blöcken` : `${filtered.length} ${filtered.length === 1 ? 'Block' : 'Blöcke'}`}
        </span>
        {remaining > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => setLimit((n) => n + PAGE)} data-testid="block-list-more" icon={<Icon name="chevron-down" />}>
            Weitere {Math.min(PAGE, remaining)} anzeigen
          </Button>
        ) : null}
      </div>
    </div>
  );
}
