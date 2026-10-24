'use client';

import { PROFILES } from '@/core/compat/profile';
import { CANDIDATES, selectsVariants, variantSeeds } from '@/core/generator/generateBuilding';
import {
  BUILD_SIZES,
  BUILDING_TYPES,
  DETAIL_LEVELS,
  isImplementedBuildingType,
  MAX_SEED,
  STYLE_IDS,
  THEMES,
  type BuildSpec,
} from '@/core/schema/buildSpec';
import { STYLES } from '@/core/style/styles';
import { sourceOf, type SettingPath, type SettingSource } from '@/core/schema/resolveSpec';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { Segmented } from '@/components/ui/Segmented';
import { SourceBadge } from '@/components/ui/SourceBadge';
import { StepNumber } from '@/components/builder/PromptPanel';
import { BUILDING_TYPE_LABELS, DETAIL_LABELS, SIZE_LABELS, STYLE_LABELS, THEME_LABELS } from '@/components/builder/labels';

export interface SettingsBinding {
  spec: BuildSpec;
  sources: Record<SettingPath, SettingSource>;
  /** Sets a manual value (manual settings override the text). */
  set: (path: SettingPath, value: unknown) => void;
  /** Removes the manual value (text or default applies again). */
  reset: (path: SettingPath) => void;
  disabled: boolean;
}

/** Step 2: the main settings. Manual choices override what was read from the text. */
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
      title="Anpassen"
      headingId="settings-heading"
      icon={<StepNumber n={2} />}
      description="Optional. Was du hier wählst, hat Vorrang vor dem Text."
      actions={
        manualCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            icon={<Icon name="undo" />}
            onClick={onResetAll}
            data-testid="reset-manual"
            title="Alle manuellen Einstellungen zurücksetzen – dann gelten wieder Text und Standard"
          >
            {manualCount} zurücksetzen
          </Button>
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
        <div className="flex flex-col gap-2">
          <Segmented
            legend="Stil"
            name="style"
            testId="control-style"
            value={spec.style}
            disabled={disabled}
            badge={badge('style', 'Stil')}
            onChange={(style) => set('style', style)}
            options={STYLE_IDS.map((v) => ({ value: v, label: STYLE_LABELS[v] }))}
          />
          <p className="text-xs leading-snug text-fg-subtle" data-testid="style-summary">
            {STYLES[spec.style].summary}
          </p>
        </div>
        <Segmented
          legend="Thema"
          name="theme"
          testId="control-theme"
          value={spec.theme}
          disabled={disabled}
          badge={badge('theme', 'Thema')}
          onChange={(theme) => set('theme', theme)}
          options={THEMES.map((v) => ({ value: v, label: THEME_LABELS[v] }))}
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
          legend="Detailgrad"
          name="detailLevel"
          testId="control-detail"
          value={spec.detailLevel}
          disabled={disabled}
          badge={badge('detailLevel', 'Detailgrad')}
          description="Wie viel Schmuck und Kleinteile das Bauwerk bekommt."
          onChange={(detailLevel) => set('detailLevel', detailLevel)}
          options={DETAIL_LEVELS.map((v) => ({ value: v, label: DETAIL_LABELS[v] }))}
        />

        <div className="flex flex-col gap-4 border-t border-line pt-4">
          <Segmented
            legend="Minecraft-Version (Java)"
            name="targetMinecraftVersion"
            testId="control-version"
            value={spec.targetMinecraftVersion}
            disabled={disabled}
            description="Blöcke und Exportdatei passen genau zu dieser Version deiner Welt."
            onChange={onVersionChange}
            options={PROFILES.map((p) => ({
              value: p.minecraftVersion,
              label: p.minecraftVersion,
              hint: `DataVersion ${p.dataVersion}`,
            }))}
          />
          <Field
            label="Seed (Startwert)"
            htmlFor="seed"
            hint={
              selectsVariants(spec.kind)
                ? `Gleiche Zahl, gleiches Ergebnis. Die App bewertet ${CANDIDATES[spec.size]} Kandidaten (Seed ${spec.seed} bis ${variantSeeds(spec.seed, CANDIDATES[spec.size]).at(-1)}) nach Bauqualität und zeigt die drei besten, die sich deutlich unterscheiden.`
                : `Gleiche Zahl, gleiches Ergebnis. Erzeugt werden drei Varianten mit Seed ${variantSeeds(spec.seed).join(', ')}.`
            }
          >
            <TextInput
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
              className="tabular-nums"
            />
          </Field>
        </div>
      </div>
    </Panel>
  );
}
