'use client';

import { DEFAULT_PROFILE, getProfileForVersion } from '@/core/compat/profile';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';

export interface ExportInfo {
  fileName: string;
  bytes: number;
  hash: string;
}

export function ExportPanel({
  model,
  onExport,
  exporting,
  lastExport,
}: {
  model: VoxelModel | null;
  onExport: () => void;
  exporting: boolean;
  lastExport: ExportInfo | null;
}) {
  const exportedThis = lastExport && model && lastExport.hash === model.hash;
  const profile = (model && getProfileForVersion(model.spec.targetMinecraftVersion)) || DEFAULT_PROFILE;
  return (
    <Panel title="Export & Technik" headingId="export-heading">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-mist-400">Minecraft</dt>
        <dd className="text-snow-50">Java Edition {profile.minecraftVersion} (Vanilla)</dd>
        <dt className="text-mist-400">DataVersion</dt>
        <dd className="text-snow-50" data-testid="data-version">
          {profile.dataVersion}
        </dd>
        <dt className="text-mist-400">Format</dt>
        <dd className="text-snow-50">Sponge Schematic v{profile.schematicVersion} (.schem)</dd>
        <dt className="text-mist-400">WorldEdit</dt>
        <dd className="text-snow-50">Zielprofil {profile.worldEditTarget}</dd>
        <dt className="text-mist-400">Einfügepunkt</dt>
        <dd className="text-snow-50">Ecke min. X/Y/Z an deiner Position, Eingang nach Norden (−Z)</dd>
        <dt className="text-mist-400">Hash</dt>
        <dd className="break-all font-mono text-[10px] text-mist-300" data-testid="model-hash">
          {model ? model.hash : '–'}
        </dd>
      </dl>

      <Button
        variant="secondary"
        className="mt-4 w-full"
        onClick={onExport}
        disabled={!model || exporting}
        data-testid="download-button"
      >
        {exporting ? 'Export wird geprüft …' : '.schem herunterladen'}
      </Button>
      {exportedThis ? (
        <p className="mt-2 text-[11px] text-fir-300" data-testid="export-result" role="status">
          Exportiert und geprüft: {lastExport.fileName} ({lastExport.bytes.toLocaleString('de-DE')} Bytes)
        </p>
      ) : null}

    </Panel>
  );
}
