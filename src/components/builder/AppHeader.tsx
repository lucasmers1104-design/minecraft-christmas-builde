import type { CompatibilityProfile } from '@/core/compat/profile';
import { plannerBadgeText, type AiProvider } from '@/core/ai/providers';
import { Badge, StatusDot, type Tone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export type BuilderStatus = 'bereit' | 'generiert' | 'bearbeitet' | 'gespeichert' | 'exportiert' | 'fehler' | 'arbeitet';

/** Visible text and dot colour per status; `data-status` keeps the machine value for tests. */
const STATUS_VIEW: Record<BuilderStatus, { label: string; tone: Tone }> = {
  bereit: { label: 'Bereit', tone: 'neutral' },
  arbeitet: { label: 'Arbeitet …', tone: 'gold' },
  generiert: { label: 'Generiert', tone: 'accent' },
  bearbeitet: { label: 'Bearbeitet', tone: 'gold' },
  gespeichert: { label: 'Gespeichert', tone: 'accent' },
  exportiert: { label: 'Exportiert', tone: 'info' },
  fehler: { label: 'Fehler', tone: 'danger' },
};

/** Who planned the shown building: an AI (model + provider) or nobody (rule-based reading). */
export type PlannedBy = { model: string; source?: AiProvider } | null;

/** The app's pixel-house logo (same motif as public/favicon.svg). */
function Logo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-8 shrink-0 rounded-lg" shapeRendering="crispEdges">
      <rect width="16" height="16" fill="#182029" />
      <rect x="2" y="7" width="12" height="7" fill="#6b4f2f" />
      <rect x="7" y="10" width="2" height="4" fill="#0c1016" />
      <rect x="3" y="9" width="2" height="2" fill="#f1d08f" />
      <rect x="11" y="9" width="2" height="2" fill="#f1d08f" />
      <rect x="1" y="6" width="14" height="1" fill="#e7ecf2" />
      <rect x="3" y="4" width="10" height="2" fill="#e7ecf2" />
      <rect x="5" y="2" width="6" height="2" fill="#e7ecf2" />
      <rect x="11" y="1" width="2" height="4" fill="#966153" />
    </svg>
  );
}

/**
 * Slim app bar (56 px): logo, name and the compatibility profile on the left; quiet status
 * information and the two global actions (projects, AI settings) on the right.
 */
export function AppHeader({
  status,
  busyLabel,
  profile,
  projectName,
  onOpenLibrary,
  onOpenSettings,
  plannedBy,
}: {
  status: BuilderStatus;
  /** Visible text while `status` is "arbeitet" (e.g. "Wird generiert …"). */
  busyLabel?: string;
  profile: CompatibilityProfile;
  projectName: string | null;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  /** Set if the shown building was planned by an AI, else null. */
  plannedBy: PlannedBy;
}) {
  const view = STATUS_VIEW[status];
  const statusLabel = status === 'arbeitet' && busyLabel ? busyLabel : view.label;
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4 lg:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Logo />
        <div className="min-w-0">
          <h1 className="truncate text-[15px] leading-5 font-semibold text-fg">Minecraft Christmas Builder</h1>
          <p
            className="hidden truncate text-xs leading-4 text-fg-subtle sm:block"
            title={`Aktives Kompatibilitätsprofil: Minecraft Java Edition ${profile.minecraftVersion}, DataVersion ${profile.dataVersion} (interne Versionsnummer der Blockdaten), Sponge Schematic v${profile.schematicVersion} (.schem für WorldEdit)`}
            data-testid="profile-badge"
          >
            Java {profile.minecraftVersion} · DataVersion {profile.dataVersion} · Sponge v{profile.schematicVersion}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 lg:gap-3">
        <Badge
          tone={plannedBy ? 'accent' : 'neutral'}
          icon={<Icon name={plannedBy ? 'sparkles' : 'cube'} className="size-3.5" />}
          className="max-lg:hidden"
          title={
            plannedBy
              ? 'Die KI hat den Bauplan geliefert, alle Blöcke setzt der regelbasierte Generator.'
              : 'Ohne KI: Text und Einstellungen werden regelbasiert gelesen.'
          }
          data-testid="planner-badge"
        >
          {plannedBy ? plannerBadgeText(plannedBy) : 'Regelbasierter Generator'}
        </Badge>
        <p
          role="status"
          aria-live="polite"
          data-testid="status"
          data-status={status}
          className="flex items-center gap-2 px-1 text-[13px] whitespace-nowrap text-fg-muted"
        >
          <StatusDot tone={view.tone} pulse={status === 'arbeitet'} />
          <span className="sr-only sm:not-sr-only">{statusLabel}</span>
        </p>

        <span aria-hidden="true" className="hidden h-6 w-px bg-line sm:block" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenLibrary}
          data-testid="open-library"
          aria-haspopup="dialog"
          title={projectName ? `Projekte – geöffnet: ${projectName}` : 'Gespeicherte Projekte öffnen'}
          icon={<Icon name="folder" />}
          className="text-fg"
        >
          <span className="sr-only sm:not-sr-only">Projekte</span>
          {projectName ? (
            <>
              <span aria-hidden="true" className="hidden text-fg-subtle xl:inline">
                ·
              </span>
              <span className="sr-only xl:not-sr-only xl:max-w-48 xl:truncate xl:font-normal xl:text-fg-muted">{projectName}</span>
            </>
          ) : null}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenSettings}
          data-testid="open-settings"
          aria-haspopup="dialog"
          title="Einstellungen der KI-Anbindung: ohne KI, Ollama (lokal) oder OpenRouter (Cloud)"
          icon={<Icon name="sparkles" />}
        >
          {/* Same wording as the server messages and docs/KI.md. */}
          <span className="sr-only sm:not-sr-only">KI einrichten</span>
        </Button>
      </div>
    </header>
  );
}
