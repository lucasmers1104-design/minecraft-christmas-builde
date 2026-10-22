'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
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

/**
 * Block selection for the editor: category chips, a search over German label and id, a
 * keyboard-navigable list (only a page of rows is rendered at a time) and one select per block
 * state property. Properties the app computes itself (from neighbours, like the game) are hidden.
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
  const def = getBlockDefinition(currentId);
  const props = parseBlockState(value)?.properties ?? {};
  const properties = def ? visibleProperties(def) : { shown: [], computed: [] };
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

  return (
    <div className="flex min-w-0 flex-col gap-2" data-testid="block-picker">
      <label htmlFor={`${baseId}-search`} className="text-[11px] font-medium text-mist-300">
        Block suchen
      </label>
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
        placeholder="z. B. Treppe Fichte, Glas, lantern …"
        data-testid="block-search"
        aria-controls={`${baseId}-list`}
        className="rounded-lg border border-white/10 bg-night-950/70 px-3 py-1.5 text-sm text-snow-50 focus:border-gold-400/60 focus:outline-none"
      />
      <div role="group" aria-label="Kategorien" className="flex flex-wrap gap-1" data-testid="block-categories">
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
              className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-300 ${
                selected
                  ? 'border-gold-400/70 bg-gold-400/15 text-gold-300'
                  : count === 0
                    ? 'border-white/5 text-mist-400/60'
                    : 'border-white/10 text-mist-300 hover:border-white/25 hover:text-snow-50'
              }`}
            >
              {c === 'all' ? 'Alle' : CATEGORY_LABELS[c]}
              {words.length > 0 ? <span className="ml-1 tabular-nums text-mist-400">{count}</span> : null}
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
        className="max-h-52 overflow-y-auto rounded-lg border border-white/8 focus-visible:outline-2 focus-visible:outline-gold-300"
        data-testid="block-list"
      >
        {groups.map((group) => (
          <div key={group.category} role="group" aria-labelledby={`${baseId}-group-${group.category}`}>
            <div
              id={`${baseId}-group-${group.category}`}
              role="presentation"
              className="sticky top-0 z-10 bg-night-800/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-mist-400 backdrop-blur"
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
                  className={`flex w-full cursor-pointer items-center gap-2 px-2 py-1 text-left text-xs ${
                    selected ? 'bg-gold-400/12 text-gold-300' : 'text-mist-300 hover:bg-white/5'
                  } ${isActive ? 'outline-1 -outline-offset-1 outline-gold-300/70' : ''}`}
                >
                  <BlockSwatch block={entry.def.id} className="size-4" />
                  <span className="min-w-0 truncate">{entry.def.label}</span>
                  <span className="ml-auto min-w-0 truncate font-mono text-[10px] text-mist-400">{entry.short}</span>
                </div>
              );
            })}
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="px-2 py-1 text-xs text-mist-400">
            {matches.length > 0 && category !== 'all' ? (
              <>
                Nichts in „{CATEGORY_LABELS[category]}“.{' '}
                <button type="button" className="underline hover:text-snow-50" onClick={() => setCategory('all')}>
                  In allen Kategorien suchen ({matches.length})
                </button>
              </>
            ) : (
              'Kein Block gefunden.'
            )}
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] text-mist-400">
        <span data-testid="block-count">
          {visible.length < filtered.length ? `${visible.length} von ${filtered.length} Blöcken` : `${filtered.length} Blöcke`}
        </span>
        {visible.length < filtered.length ? (
          <button
            type="button"
            onClick={() => setLimit((n) => n + PAGE)}
            data-testid="block-list-more"
            className="rounded-md border border-white/10 px-2 py-0.5 text-mist-300 hover:border-white/25 hover:text-snow-50"
          >
            Weitere {Math.min(PAGE, filtered.length - visible.length)} anzeigen
          </button>
        ) : null}
      </div>
      {def && properties.shown.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {properties.shown.map(([name, values]) => (
            <label key={name} className="flex min-w-0 flex-col gap-1 text-[11px] text-mist-300">
              <span className="truncate" title={name}>
                {PROPERTY_LABELS[name] ?? name} <span className="font-mono text-[10px] text-mist-400">{name}</span>
              </span>
              <select
                value={props[name] ?? def.defaults[name]}
                data-testid={`block-prop-${name}`}
                onChange={(e) => onChange(blockState(currentId, { ...props, [name]: e.target.value }))}
                className="w-full min-w-0 rounded-md border border-white/10 bg-night-950/70 px-2 py-1 text-xs text-snow-50"
              >
                {values.map((v) => (
                  <option key={v} value={v}>
                    {VALUE_LABELS[v] ? `${VALUE_LABELS[v]} (${v})` : v}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}
      {def && (properties.computed.length > 0 || ORIENTED.has(def.shape)) ? (
        <ul className="flex flex-col gap-0.5 text-[11px] text-mist-400" data-testid="block-prop-notes">
          {properties.computed.length > 0 ? (
            <li>Automatisch wie im Spiel: {COMPUTED_LABELS[def.shape] ?? properties.computed.join(', ')} – die App berechnet das aus den Nachbarblöcken.</li>
          ) : null}
          {ORIENTED.has(def.shape) ? (
            <li>Beim Setzen per Klick im 3D-Modell richtet sich der Block wie im Spiel nach Blickrichtung und angeklickter Fläche aus.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
