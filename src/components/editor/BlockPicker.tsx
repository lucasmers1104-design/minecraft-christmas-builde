'use client';

import { useMemo, useState } from 'react';
import { blockIdOf, blockState, getBlockDefinition, listBlockDefinitions, parseBlockState } from '@/core/blocks/registry';

/** Searchable list of all registry blocks plus selectors for block-state properties. */
export function BlockPicker({ value, onChange }: { value: string; onChange: (state: string) => void }) {
  const [query, setQuery] = useState('');
  const blocks = useMemo(
    () => listBlockDefinitions().filter((d) => d.id !== 'minecraft:air').sort((a, b) => a.label.localeCompare(b.label, 'de')),
    [],
  );
  const q = query.trim().toLowerCase();
  const filtered = q ? blocks.filter((b) => b.label.toLowerCase().includes(q) || b.id.includes(q)) : blocks;
  const currentId = blockIdOf(value);
  const def = getBlockDefinition(currentId);
  const props = parseBlockState(value)?.properties ?? {};

  return (
    <div className="flex min-w-0 flex-col gap-2" data-testid="block-picker">
      <label htmlFor="block-search" className="text-[11px] font-medium text-mist-300">
        Block suchen
      </label>
      <input
        id="block-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="z. B. Wolle, Glas, spruce …"
        data-testid="block-search"
        className="rounded-lg border border-white/10 bg-night-950/70 px-3 py-1.5 text-sm text-snow-50 focus:border-gold-400/60 focus:outline-none"
      />
      <ul role="listbox" aria-label="Blöcke" className="max-h-44 overflow-y-auto rounded-lg border border-white/8" data-testid="block-list">
        {filtered.map((b) => {
          const selected = b.id === currentId;
          return (
            <li key={b.id} role="option" aria-selected={selected}>
              <button
                type="button"
                onClick={() => onChange(blockState(b.id))}
                data-testid={`block-option-${b.id.replace('minecraft:', '')}`}
                className={`flex w-full items-center gap-2 px-2 py-1 text-left text-xs ${selected ? 'bg-gold-400/12 text-gold-300' : 'text-mist-300 hover:bg-white/5'}`}
              >
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-sm border border-white/20"
                  style={{ background: b.render.color, opacity: b.render.opacity ?? 1 }}
                />
                <span className="min-w-0 truncate">{b.label}</span>
                <span className="ml-auto min-w-0 truncate font-mono text-[10px] text-mist-400">{b.id.replace('minecraft:', '')}</span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 ? <li className="px-2 py-1 text-xs text-mist-400">Kein Block gefunden.</li> : null}
      </ul>
      {def && Object.keys(def.properties).length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(def.properties).map(([name, values]) => (
            <label key={name} className="flex flex-col gap-1 text-[11px] text-mist-300">
              {name}
              <select
                value={props[name] ?? def.defaults[name]}
                data-testid={`block-prop-${name}`}
                onChange={(e) => onChange(blockState(currentId, { ...props, [name]: e.target.value }))}
                className="w-full min-w-0 rounded-md border border-white/10 bg-night-950/70 px-2 py-1 text-xs text-snow-50"
              >
                {values.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
