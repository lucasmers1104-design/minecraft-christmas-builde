'use client';

import { useMemo, useState } from 'react';
import { labelFor } from '@/core/blocks/registry';
import { resolveHouseParameters } from '@/core/generator/buildHouse';
import {
  FOOTPRINT_LIMITS,
  MATERIAL_CHOICES,
  WOOD_TYPES,
  type BuildOptions,
  type MaterialPart,
} from '@/core/schema/buildOptions';
import type { BuildSpec } from '@/core/schema/buildSpec';
import { sourceOf, type SettingPath } from '@/core/schema/resolveSpec';
import { Panel } from '@/components/ui/Panel';
import { SourceBadge } from '@/components/ui/SourceBadge';
import type { SettingsBinding } from '@/components/builder/StyleControls';

const WOOD_LABELS: Record<(typeof WOOD_TYPES)[number], string> = {
  spruce: 'Fichte',
  oak: 'Eiche',
  dark_oak: 'Schwarzeiche',
  birch: 'Birke',
};

const PART_LABELS: Record<MaterialPart, string> = {
  wall: 'Wände',
  roof: 'Dach',
  floor: 'Boden',
  foundation: 'Fundament & Weg',
  accent: 'Akzente (Fensterläden, Schleifen)',
};

const FLAG_LABELS: [keyof BuildOptions & ('snow' | 'chimney' | 'lights' | 'garland' | 'christmasTree' | 'presents'), string][] = [
  ['snow', 'Schnee auf dem Dach'],
  ['chimney', 'Schornstein'],
  ['lights', 'Beleuchtung (Leuchtstein)'],
  ['garland', 'Girlanden'],
  ['christmasTree', 'Weihnachtsbaum innen'],
  ['presents', 'Geschenke'],
];

const oddRange = (min: number, max: number) => Array.from({ length: Math.floor((max - min) / 2) + 1 }, (_, i) => min + 2 * i);
const intRange = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i);

/** Returns what the generator would use if this option were left automatic. */
function automaticValue(spec: BuildSpec, path: SettingPath): string {
  const [, key, sub] = path.split('.');
  const options: BuildOptions = { ...spec.options };
  if (key === 'materials' && sub) {
    options.materials = { ...options.materials, [sub]: undefined };
  } else delete options[key as keyof BuildOptions];
  const p = resolveHouseParameters({ ...spec, options });
  switch (key) {
    case 'width':
      return String(p.width);
    case 'depth':
      return String(p.depth);
    case 'wallHeight':
      return String(p.wallHeight);
    case 'roofShape':
      return p.rise === 2 ? 'steil' : 'normal';
    case 'windows':
      return { few: 'wenige', normal: 'normal', many: 'viele' }[p.windows];
    case 'frameWood':
      return labelFor(p.materials.post);
    case 'materials':
      return labelFor(
        sub === 'wall'
          ? p.materials.wall
          : sub === 'roof'
            ? p.roof
            : sub === 'floor'
              ? p.materials.floor
              : sub === 'foundation'
                ? p.materials.foundation
                : p.colors.primaryAccent,
      );
    default:
      return (p as unknown as Record<string, boolean>)[key as string] ? 'an' : 'aus';
  }
}

function currentValue(spec: BuildSpec, path: SettingPath): unknown {
  const [, key, sub] = path.split('.');
  if (key === 'materials' && sub) return spec.options.materials?.[sub as MaterialPart];
  return spec.options[key as keyof BuildOptions];
}

export function FineControls({ binding }: { binding: SettingsBinding }) {
  const [open, setOpen] = useState(false);
  const { spec, sources, set, reset, disabled } = binding;
  const isHouse = spec.kind === 'house';

  const field = (path: SettingPath, label: string, choices: { value: string; label: string }[], parse: (v: string) => unknown = (v) => v) => {
    const source = sourceOf(sources, path);
    const value = currentValue(spec, path);
    // "Automatisch" is only selected when neither text nor manual setting provides a value.
    const selected = source === 'standard' || value === undefined ? '' : String(value);
    const id = `fine-${path.replace(/\./g, '-')}`;
    return (
      <div key={path} className="min-w-0">
        <label htmlFor={id} className="mb-1 flex items-center gap-2 text-[11px] font-medium text-mist-300">
          {label}
          <SourceBadge source={source} label={label} onReset={() => reset(path)} />
        </label>
        <select
          id={id}
          data-testid={id}
          disabled={disabled || !isHouse}
          value={selected}
          onChange={(e) => (e.target.value === '' ? reset(path) : set(path, parse(e.target.value)))}
          className="w-full rounded-lg border border-white/10 bg-night-950/70 px-2 py-1.5 text-sm text-snow-50 focus:border-gold-400/60 focus:outline-none disabled:opacity-50"
        >
          <option value="">Automatisch ({automaticValue(spec, path)})</option>
          {choices.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const materialChoices = (part: MaterialPart) => MATERIAL_CHOICES[part].map((id) => ({ value: id, label: labelFor(`minecraft:${id}`) }));
  const flagChoices = [
    { value: 'true', label: 'an' },
    { value: 'false', label: 'aus' },
  ];

  const summary = useMemo(() => {
    const p = resolveHouseParameters(spec);
    return `${p.width} × ${p.depth} Grundfläche, Wandhöhe ${p.wallHeight}`;
  }, [spec]);

  return (
    <Panel
      title="Feinparameter"
      headingId="fine-heading"
      description={isHouse ? summary : 'Für diesen Bauwerkstyp nicht verfügbar.'}
      actions={
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="fine-body"
          data-testid="toggle-fine"
          className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-mist-300 hover:text-snow-50"
        >
          {open ? 'Einklappen' : 'Anzeigen'}
        </button>
      }
    >
      {open ? (
        <div id="fine-body" className="flex flex-col gap-4">
          <fieldset className="min-w-0 grid grid-cols-3 gap-2">
            <legend className="mb-1.5 text-xs font-medium uppercase tracking-wider text-mist-400">Maße</legend>
            {field(
              'options.width',
              'Breite',
              oddRange(FOOTPRINT_LIMITS.width.min, FOOTPRINT_LIMITS.width.max).map((v) => ({ value: String(v), label: String(v) })),
              Number,
            )}
            {field(
              'options.depth',
              'Tiefe',
              oddRange(FOOTPRINT_LIMITS.depth.min, FOOTPRINT_LIMITS.depth.max).map((v) => ({ value: String(v), label: String(v) })),
              Number,
            )}
            {field(
              'options.wallHeight',
              'Wandhöhe',
              intRange(FOOTPRINT_LIMITS.wallHeight.min, FOOTPRINT_LIMITS.wallHeight.max).map((v) => ({ value: String(v), label: String(v) })),
              Number,
            )}
          </fieldset>
          <fieldset className="min-w-0 grid grid-cols-2 gap-2">
            <legend className="mb-1.5 text-xs font-medium uppercase tracking-wider text-mist-400">Form</legend>
            {field('options.roofShape', 'Dachneigung', [
              { value: 'gable', label: 'normal (45°)' },
              { value: 'steep', label: 'steil' },
            ])}
            {field('options.windows', 'Fenster', [
              { value: 'few', label: 'wenige' },
              { value: 'normal', label: 'normal' },
              { value: 'many', label: 'viele' },
            ])}
          </fieldset>
          <fieldset className="min-w-0 grid grid-cols-2 gap-2">
            <legend className="mb-1.5 text-xs font-medium uppercase tracking-wider text-mist-400">Ausstattung</legend>
            {FLAG_LABELS.map(([key, label]) => field(`options.${key}`, label, flagChoices, (v) => v === 'true'))}
          </fieldset>
          <fieldset className="min-w-0 grid grid-cols-1 gap-2">
            <legend className="mb-1.5 text-xs font-medium uppercase tracking-wider text-mist-400">Material pro Bauteil</legend>
            {(Object.keys(PART_LABELS) as MaterialPart[]).map((part) => field(`options.materials.${part}`, PART_LABELS[part], materialChoices(part)))}
            {field(
              'options.frameWood',
              'Balken & Pfosten',
              WOOD_TYPES.map((w) => ({ value: w, label: WOOD_LABELS[w] })),
            )}
          </fieldset>
        </div>
      ) : null}
    </Panel>
  );
}
