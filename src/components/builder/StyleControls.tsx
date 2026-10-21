'use client';

import {
  BUILD_SIZES,
  BUILD_STYLES,
  BUILDING_TYPES,
  COLOR_THEMES,
  DETAIL_LEVELS,
  isImplementedBuildingType,
  MATERIAL_THEMES,
  MAX_SEED,
  type BuildSpec,
} from '@/core/schema/buildSpec';
import { variantSeeds } from '@/core/generator/generateBuilding';
import { Panel } from '@/components/ui/Panel';
import { Segmented } from '@/components/ui/Segmented';
import {
  BUILDING_TYPE_LABELS,
  COLOR_LABELS,
  DETAIL_LABELS,
  MATERIAL_LABELS,
  SIZE_LABELS,
  STYLE_LABELS,
} from '@/components/builder/labels';

export function StyleControls({
  spec,
  onChange,
  disabled,
}: {
  spec: BuildSpec;
  onChange: (patch: Partial<BuildSpec>) => void;
  disabled: boolean;
}) {
  return (
    <Panel title="Einstellungen" headingId="settings-heading" description="Einstellungen haben Vorrang vor dem Text.">
      <div className="flex flex-col gap-4">
        <Segmented
          legend="Bauwerk"
          name="kind"
          testId="control-kind"
          value={spec.kind}
          disabled={disabled}
          onChange={(kind) => onChange({ kind })}
          options={BUILDING_TYPES.map((kind) => ({
            value: kind,
            label: BUILDING_TYPE_LABELS[kind],
            disabled: !isImplementedBuildingType(kind),
            hint: isImplementedBuildingType(kind) ? undefined : 'noch nicht verfügbar',
          }))}
        />
        <Segmented
          legend="Stil"
          name="style"
          testId="control-style"
          value={spec.style}
          disabled={disabled}
          onChange={(style) => onChange({ style })}
          options={BUILD_STYLES.map((v) => ({ value: v, label: STYLE_LABELS[v] }))}
        />
        <Segmented
          legend="Größe"
          name="size"
          testId="control-size"
          value={spec.size}
          disabled={disabled}
          onChange={(size) => onChange({ size })}
          options={BUILD_SIZES.map((v) => ({ value: v, label: SIZE_LABELS[v] }))}
        />
        <Segmented
          legend="Material"
          name="materialTheme"
          testId="control-material"
          value={spec.materialTheme}
          disabled={disabled}
          onChange={(materialTheme) => onChange({ materialTheme })}
          options={MATERIAL_THEMES.map((v) => ({ value: v, label: MATERIAL_LABELS[v] }))}
        />
        <Segmented
          legend="Farbthema"
          name="colorTheme"
          testId="control-color"
          value={spec.colorTheme}
          disabled={disabled}
          onChange={(colorTheme) => onChange({ colorTheme })}
          options={COLOR_THEMES.map((v) => ({ value: v, label: COLOR_LABELS[v] }))}
        />
        <Segmented
          legend="Detailgrad"
          name="detailLevel"
          testId="control-detail"
          value={spec.detailLevel}
          disabled={disabled}
          onChange={(detailLevel) => onChange({ detailLevel })}
          options={DETAIL_LEVELS.map((v) => ({ value: v, label: DETAIL_LABELS[v] }))}
        />
        <div>
          <label htmlFor="seed" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-mist-400">
            Seed (Startwert für Varianten)
          </label>
          <input
            id="seed"
            data-testid="control-seed"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_SEED}
            step={1}
            disabled={disabled}
            value={spec.seed}
            onChange={(e) => {
              const seed = Number.parseInt(e.target.value, 10);
              if (Number.isInteger(seed) && seed >= 0 && seed <= MAX_SEED) onChange({ seed });
            }}
            className="w-full rounded-lg border border-white/10 bg-night-950/70 px-3 py-2 text-sm text-snow-50 focus:border-gold-400/60 focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-mist-400">
            Erzeugt werden drei Varianten mit Seed {variantSeeds(spec.seed).join(', ')}.
          </p>
        </div>
      </div>
    </Panel>
  );
}
