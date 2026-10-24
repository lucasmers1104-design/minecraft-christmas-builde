'use client';

import { useState, type ReactNode } from 'react';
import { DEFAULT_PROFILE, getProfileForVersion } from '@/core/compat/profile';
import { schematicFileName } from '@/core/export/schematicFileName';
import { groundLevel, type VoxelModel } from '@/core/schema/voxelModel';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';

export interface ExportInfo {
  fileName: string;
  bytes: number;
  hash: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toLocaleString('de-DE')} Bytes`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${kib.toLocaleString('de-DE', { maximumFractionDigits: 1 })} KB`;
  return `${(kib / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;
}

/** A WorldEdit command in mono with a copy button. */
function Command({ command }: { command: string }) {
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied('ok');
    } catch {
      setCopied('failed');
    }
    window.setTimeout(() => setCopied(null), 2000);
  };
  return (
    <span className="mt-1.5 flex items-center gap-1 rounded-md border border-line bg-canvas py-0.5 pr-0.5 pl-2.5">
      <code className="min-w-0 flex-1 font-mono text-xs break-words text-fg">{command}</code>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void copy()}
        aria-label={`Befehl ${command} kopieren`}
        icon={<Icon name={copied === 'ok' ? 'check' : 'copy'} className={`size-4 ${copied === 'ok' ? 'text-accent-text' : ''}`} />}
      >
        <span aria-live="polite" className="text-xs">
          {copied === 'ok' ? 'Kopiert' : copied === 'failed' ? 'Nicht möglich' : 'Kopieren'}
        </span>
      </Button>
    </span>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full border border-line-strong text-xs font-medium text-fg-muted tabular-nums"
      >
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-fg">{title}</p>
        <div className="mt-0.5 text-fg-muted">{children}</div>
      </div>
    </li>
  );
}

const pathClass = 'rounded bg-raised px-1 py-px font-mono text-xs text-fg';

/** A folded area (native details) in the panel's style. */
function Disclosure({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <details className="group rounded-lg border border-line" data-testid={testId}>
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 text-sm font-medium text-fg hover:bg-hover/50 [&::-webkit-details-marker]:hidden">
        {title}
        <Icon name="chevron-down" className="size-4 -rotate-90 text-fg-subtle transition-transform group-open:rotate-0" />
      </summary>
      <div className="border-t border-line px-3 py-3 text-[13px] leading-snug">{children}</div>
    </details>
  );
}

/**
 * Export of the selected (possibly edited) model as a Sponge v3 schematic, with what the
 * file contains, the result of the last download and a short WorldEdit how-to
 * (docs/WORLD_EDIT_IMPORT.md).
 */
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
  const exportedThis = !!lastExport && !!model && lastExport.hash === model.hash;
  const profile = (model && getProfileForVersion(model.spec.targetMinecraftVersion)) || DEFAULT_PROFILE;
  const ground = model ? groundLevel(model.spec) : 0;
  const fileName = exportedThis ? lastExport.fileName : model ? schematicFileName(model) : null;
  const schemName = fileName?.replace(/\.schem$/, '') ?? '<Dateiname>';

  return (
    <Panel title="Export" headingId="export-heading" description="Dein Bauwerk als Datei für WorldEdit.">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            icon={<Icon name="download" />}
            loading={exporting}
            onClick={onExport}
            disabled={!model}
            data-testid="download-button"
          >
            {exporting ? 'Datei wird erstellt und geprüft …' : 'Als .schem herunterladen'}
          </Button>
          {!model ? <p className="text-center text-[13px] text-fg-muted">Erst ein Bauwerk generieren, dann kannst du es hier herunterladen.</p> : null}
        </div>

        {model && fileName ? (
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[13px] leading-snug">
            <dt className="text-fg-subtle">Datei</dt>
            <dd className="font-mono text-xs leading-5 break-words text-fg">{fileName}</dd>
            <dt className="text-fg-subtle">Maße</dt>
            <dd className="text-fg">
              {model.dimensions.width} × {model.dimensions.height} × {model.dimensions.length} Blöcke{' '}
              <span className="text-fg-subtle">(B × H × T)</span>
            </dd>
            <dt className="text-fg-subtle">Format</dt>
            <dd className="text-fg">Sponge Schematic v{profile.schematicVersion} für WorldEdit</dd>
            <dt className="text-fg-subtle">Minecraft</dt>
            <dd className="text-fg">Java Edition {profile.minecraftVersion}</dd>
          </dl>
        ) : null}

        <div aria-live="polite">
          {exportedThis ? (
            <Callout tone="success" title="Heruntergeladen und geprüft" data-testid="export-result">
              <span className="font-mono text-xs break-words text-fg">{lastExport.fileName}</span> · {formatBytes(lastExport.bytes)}
              <span className="mt-1 block">Die App hat die Datei nach dem Schreiben erneut eingelesen und Block für Block mit dem Modell verglichen.</span>
            </Callout>
          ) : lastExport && model ? (
            <Callout tone="neutral" title="Nicht mehr aktuell">
              Die zuletzt heruntergeladene Datei ({lastExport.fileName}) zeigt einen anderen Stand. Lade neu herunter, um diese Variante mit allen
              Änderungen zu bekommen.
            </Callout>
          ) : null}
        </div>

        <Disclosure title="So fügst du es in Minecraft ein" testId="export-guide">
          <ol className="flex flex-col gap-3">
            <Step n={1} title="Datei in den Schematic-Ordner kopieren">
              Server mit Paper oder Spigot: <span className={pathClass}>plugins/WorldEdit/schematics</span>. WorldEdit als Mod (Fabric, NeoForge): meist{' '}
              <span className={pathClass}>config/worldedit/schematics</span> im Ordner deines Minecraft-Profils. Mit{' '}
              <code className={pathClass}>{'//schem list'}</code> siehst du, ob WorldEdit die Datei findet.
            </Step>
            <Step n={2} title="Im Spiel laden">
              <Command command={`//schem load ${schemName}`} />
            </Step>
            <Step n={3} title="Hinstellen">
              Stell dich an eine freie, ebene Stelle. Deine Position wird zur unteren Nordwest-Ecke des Bauwerks; es wächst nach Osten (+X), oben (+Y)
              und Süden (+Z).{' '}
              {ground > 0
                ? `Der Boden des Grundstücks liegt auf Höhe deiner Füße, das Fundament reicht ${ground} ${ground > 1 ? 'Lagen' : 'Lage'} tiefer ins Gelände.`
                : 'Die unterste Ebene liegt auf Höhe deiner Füße.'}
            </Step>
            <Step n={4} title="Einfügen">
              <Command command="//paste" />
              <span className="mt-1.5 block">
                Fügt auch die Luft mit ein, ersetzt also alles im Bauraum (damit Innenräume frei sind). <code className={pathClass}>{'//undo'}</code> macht
                es rückgängig.
              </span>
            </Step>
          </ol>
          <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 text-xs leading-snug text-fg-subtle">
            <p>
              Du brauchst WorldEdit {profile.minecraftVersion === '1.21.11' ? '7.3.18 oder neuer (z. B. 7.4.2)' : profile.worldEditTarget} für Minecraft{' '}
              {profile.minecraftVersion}. Für einen Server mit einer anderen Version stellst du bei der Eingabe die Minecraft-Version um und generierst neu.
            </p>
            <p>
              Ehrlicher Stand: Der echte WorldEdit-Reader (7.4.2) liest die Dateien in den automatischen Tests fehlerfrei. Das Einfügen in einer
              Welt ist noch nicht von Hand abgenommen. Probiere es deshalb zuerst in einer Testwelt aus.
            </p>
          </div>
        </Disclosure>

        <Disclosure title="Technische Details" testId="export-details">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5">
            <dt className="text-fg-subtle">DataVersion</dt>
            <dd className="text-fg">
              <span data-testid="data-version">{profile.dataVersion}</span>{' '}
              <span className="text-fg-subtle">(interne Versionsnummer von Minecraft {profile.minecraftVersion})</span>
            </dd>
            <dt className="text-fg-subtle">WorldEdit</dt>
            <dd className="text-fg">Zielprofil {profile.worldEditTarget}</dd>
            <dt className="text-fg-subtle">Einfügepunkt</dt>
            <dd className="text-fg">
              Ecke mit den kleinsten X-, Y- und Z-Werten an deiner Position
              {ground > 0 ? `, ${ground} ${ground > 1 ? 'Lagen' : 'Lage'} tiefer (Offset 0, −${ground}, 0 für das Fundament)` : ''}
            </dd>
            <dt className="text-fg-subtle">Hash</dt>
            <dd className="min-w-0">
              <span className="font-mono text-xs break-all text-fg" data-testid="model-hash">
                {model ? model.hash : '–'}
              </span>
              <span className="mt-1 block text-xs text-fg-subtle">
                Fingerabdruck des Blockmodells. Die acht Zeichen am Ende des Dateinamens sind sein Anfang; nach jeder Bearbeitung ändert er sich.
              </span>
            </dd>
          </dl>
        </Disclosure>
      </div>
    </Panel>
  );
}
