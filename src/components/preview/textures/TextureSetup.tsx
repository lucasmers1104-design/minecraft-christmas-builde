'use client';

import { useId, useRef, useState } from 'react';
import { DEFAULT_PROFILE } from '@/core/compat/profile';
import { useTextures } from '@/components/preview/textures/TextureProvider';

/**
 * Status line and setup for real Minecraft textures. The textures come from the user's own
 * Minecraft installation (found automatically, picked as a file, or downloaded from Mojang after
 * an explicit EULA confirmation) and stay on this computer.
 */
export function TextureSetup() {
  const { status, busy, error, pack, enabled, setEnabled, refresh, importFile, downloadFromMojang } = useTextures();
  const [open, setOpen] = useState(false);
  const [eula, setEula] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const eulaId = useId();
  const version = DEFAULT_PROFILE.minecraftVersion;
  const ready = !!pack;

  return (
    <div className="flex min-w-0 flex-col gap-2 text-[11px] text-mist-400" data-testid="texture-setup">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rounded-full ${ready ? 'bg-fir-500' : busy ? 'animate-pulse bg-gold-400' : 'bg-mist-400'}`}
        />
        <span className="min-w-0 flex-1" data-testid="texture-status" data-ready={ready}>
          {busy ?? (ready ? (status?.message ?? `Echte Texturen (Minecraft ${pack.version})`) : 'Einfarbige Blöcke – echte Minecraft-Texturen sind noch nicht eingerichtet.')}
        </span>
        {ready ? (
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            aria-pressed={enabled}
            data-testid="texture-toggle"
            className="rounded-md border border-white/10 px-2 py-0.5 text-mist-300 hover:text-snow-50"
          >
            {enabled ? 'Texturen an' : 'Texturen aus'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          data-testid="texture-setup-toggle"
          className="rounded-md border border-white/10 px-2 py-0.5 text-mist-300 hover:text-snow-50"
        >
          {ready ? 'Quelle ändern' : 'Texturen einrichten'}
        </button>
      </div>
      {error ? (
        <p role="alert" className="rounded-md border border-holly-500/40 bg-holly-600/15 px-2 py-1 text-holly-300" data-testid="texture-error">
          {error}
        </p>
      ) : null}
      {open ? (
        <div className="flex flex-col gap-2 rounded-lg border border-white/8 bg-night-950/50 p-2.5" data-testid="texture-setup-panel">
          <p>
            Die Texturen stammen aus <strong className="text-mist-300">deiner eigenen Minecraft-Installation</strong> und bleiben auf diesem
            PC. Die App sucht automatisch in den Ordnern des offiziellen Launchers, von CurseForge, Modrinth und Prism.
          </p>
          {status && !status.available && status.message ? <p className="text-gold-300">{status.message}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!!busy}
              data-testid="texture-pick-file"
              className="rounded-md bg-gold-400/15 px-2.5 py-1 font-medium text-gold-300 hover:bg-gold-400/25 disabled:opacity-50"
            >
              Minecraft-Datei auswählen …
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".jar,application/java-archive"
              className="hidden"
              data-testid="texture-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void importFile(file);
              }}
            />
            <button
              type="button"
              onClick={refresh}
              disabled={!!busy}
              className="rounded-md border border-white/10 px-2.5 py-1 text-mist-300 hover:text-snow-50 disabled:opacity-50"
            >
              Erneut suchen
            </button>
          </div>
          <p>
            Gesucht ist die Client-Datei der Version, z. B. bei CurseForge meist{' '}
            <code className="break-all text-mist-300">C:\Users\&lt;Name&gt;\curseforge\minecraft\Install\versions\{version}\{version}.jar</code>, beim
            offiziellen Launcher <code className="break-all text-mist-300">%APPDATA%\.minecraft\versions\{version}\{version}.jar</code>. Die Version
            muss im Launcher einmal gestartet worden sein.
          </p>
          <div className="flex flex-col gap-1.5 border-t border-white/6 pt-2">
            <label htmlFor={eulaId} className="flex items-start gap-2">
              <input id={eulaId} type="checkbox" checked={eula} onChange={(e) => setEula(e.target.checked)} className="mt-0.5 accent-gold-400" data-testid="texture-eula" />
              <span>
                Ich besitze Minecraft Java Edition und akzeptiere die{' '}
                <a href="https://www.minecraft.net/eula" target="_blank" rel="noreferrer" className="underline hover:text-snow-50">
                  Minecraft-EULA
                </a>
                . Die App darf die offizielle Client-Datei {version} (ca. 30 MB) von Mojangs Servern laden.
              </span>
            </label>
            <button
              type="button"
              disabled={!eula || !!busy}
              onClick={() => void downloadFromMojang(version)}
              data-testid="texture-download"
              className="self-start rounded-md border border-white/10 px-2.5 py-1 text-mist-300 hover:text-snow-50 disabled:opacity-50"
            >
              Von Mojang laden
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
