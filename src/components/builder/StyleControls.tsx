'use client';

import { PROFILES } from '@/core/compat/profile';
import { variantSeeds } from '@/core/generator/generateBuilding';
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
import { sourceOf, type SettingPath, type SettingSource } from '@/core/schema/resolveSpec';
import { Panel } from '@/components/ui/Panel';
import { Segmented } from '@/components/ui/Segmented';
import { SourceBadge } from '@/components/ui/SourceBadge';
import {
  BUILDING_TYPE_LABELS,
  COLOR_LABELS,
  DETAIL_LABELS,
  MATERIAL_LABELS,
  SIZE_LABELS,
  STYLE_LABELS,
} from '@/components/builder/labels';

export interface SettingsBinding {
  spec: BuildSpec;
  sources: Record<SettingPath, SettingSource>;
  /** Sets a manual value (manual settings override the text). */
  set: (path: SettingPath, value: unknown) => void;
  /** Removes the manual value (text or default applies again). */
  reset: (path: SettingPath) => void;
  disabled: boolean;
}

export function StyleControls({
  binding,
  onSeedChange,
  onVersionChange,
  manualCount,
  onResetAll,
}: {
  binding: SettingsBinding;
  onSeedChange: (seed: number) => void;
  onVersionChange: (version: string) => void;
  manualCount: number;
  onResetAll: () => void;
}) {
  const { spec, sources, set, reset, disabled } = binding;
  const badge = (path: SettingPath, label: string) => (
    <SourceBadge source={sourceOf(sources, path)} label={label} onReset={() => reset(path)} />
  );
  return (
    <Panel
      title="Einstellungen"
      headingId="settings-heading"
      description="Manuelle Einstellungen haben Vorrang vor dem Text."
      actions={
        manualCount > 0 ? (
          <button
            type="button"
            onClick={onResetAll}
            className="text-[11px] text-mist-400 underline-offset-2 hover:text-snow-50 hover:underline"
            data-testid="reset-manual"
          >
            {manualCount} manuelle zurücksetzen
          </button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <Segmented
          legend="Bauwerk"
          name="kind"
          testId="control-kind"
          value={spec.kind}
          disabled={disabled}
          badge={badge('kind', 'Bauwerk')}
          onChange={(kind) => set('kind', kind)}
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
          badge={badge('style', 'Stil')}
          onChange={(style) => set('style', style)}
          options={BUILD_STYLES.map((v) => ({ value: v, label: STYLE_LABELS[v] }))}
        />
        <Segmented
          legend="Größe"
          name="size"
          testId="control-size"
          value={spec.size}
          disabled={disabled}
          badge={badge('size', 'Größe')}
          onChange={(size) => set('size', size)}
          options={BUILD_SIZES.map((v) => ({ value: v, label: SIZE_LABELS[v] }))}
        />
        <Segmented
          legend="Material"
          name="materialTheme"
          testId="control-material"
          value={spec.materialTheme}
          disabled={disabled}
          badge={badge('materialTheme', 'Material')}
          onChange={(materialTheme) => set('materialTheme', materialTheme)}
          options={MATERIAL_THEMES.map((v) => ({ value: v, label: MATERIAL_LABELS[v] }))}
        />
        <Segmented
          legend="Farbthema"
          name="colorTheme"
          testId="control-color"
          value={spec.colorTheme}
          disabled={disabled}
          badge={badge('colorTheme', 'Farbthema')}
          onChange={(colorTheme) => set('colorTheme', colorTheme)}
          options={COLOR_THEMES.map((v) => ({ value: v, label: COLOR_LABELS[v] }))}
        />
        <Segmented
          legend="Detailgrad"
          name="detailLevel"
          testId="control-detail"
          value={spec.detailLevel}
          disabled={disabled}
          badge={badge('detailLevel', 'Detailgrad')}
          onChange={(detailLevel) => set('detailLevel', detailLevel)}
          options={DETAIL_LEVELS.map((v) => ({ value: v, label: DETAIL_LABELS[v] }))}
        />
        <Segmented
          legend="Minecraft-Version (Java)"
          name="targetMinecraftVersion"
          testId="control-version"
          value={spec.targetMinecraftVersion}
          disabled={disabled}
          onChange={onVersionChange}
          options={PROFILES.map((p) => ({ value: p.minecraftVersion, label: `${p.minecraftVersion} (DataVersion ${p.dataVersion})` }))}
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
              if (Number.isInteger(seed) && seed >= 0 && seed <= MAX_SEED) onSeedChange(seed);
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
