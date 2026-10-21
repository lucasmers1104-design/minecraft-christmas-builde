import type { CompatibilityProfile } from '@/core/compat/profile';

export type BuilderStatus = 'bereit' | 'generiert' | 'exportiert' | 'fehler' | 'arbeitet';

const STATUS_STYLES: Record<BuilderStatus, string> = {
  bereit: 'border-white/10 text-mist-300',
  arbeitet: 'border-gold-400/40 text-gold-300',
  generiert: 'border-fir-500/50 text-fir-300',
  exportiert: 'border-ice-300/50 text-ice-200',
  fehler: 'border-holly-500/50 text-holly-300',
};

export function AppHeader({ status, profile }: { status: BuilderStatus; profile: CompatibilityProfile }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 bg-night-950/70 px-4 py-3 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-9 rounded-lg" shapeRendering="crispEdges">
          <rect width="16" height="16" fill="#13233c" />
          <rect x="2" y="7" width="12" height="7" fill="#6b4f2f" />
          <rect x="7" y="10" width="2" height="4" fill="#0b1526" />
          <rect x="3" y="9" width="2" height="2" fill="#f2cf86" />
          <rect x="11" y="9" width="2" height="2" fill="#f2cf86" />
          <rect x="1" y="6" width="14" height="1" fill="#f4f8fc" />
          <rect x="3" y="4" width="10" height="2" fill="#f4f8fc" />
          <rect x="5" y="2" width="6" height="2" fill="#f4f8fc" />
          <rect x="11" y="1" width="2" height="4" fill="#966153" />
        </svg>
        <div>
          <h1 className="text-base font-semibold leading-tight tracking-tight text-snow-50 sm:text-lg">
            Minecraft Christmas Builder
          </h1>
          <p className="text-[11px] text-mist-400">Echte Blockdaten · 3D-Vorschau · WorldEdit-Export</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span
          className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-mist-300"
          title="Aktives Kompatibilitätsprofil"
          data-testid="profile-badge"
        >
          Java {profile.minecraftVersion} · DataVersion {profile.dataVersion} · Sponge v{profile.schematicVersion}
        </span>
        <span className="rounded-full border border-fir-500/40 bg-fir-700/30 px-2.5 py-1 text-fir-300">
          Regelbasierter Generator
        </span>
        <span
          role="status"
          aria-live="polite"
          data-testid="status"
          data-status={status}
          className={`rounded-full border bg-white/4 px-2.5 py-1 font-medium ${STATUS_STYLES[status]}`}
        >
          Status: {status}
        </span>
      </div>
    </header>
  );
}
