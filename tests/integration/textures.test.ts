import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as statusRoute } from '@/app/api/textures/route';
import { GET as resourcesRoute } from '@/app/api/textures/resources/route';
import { POST as importRoute } from '@/app/api/textures/import/route';
import { POST as downloadRoute } from '@/app/api/textures/download/route';
import { isAvailableIn, listBlockDefinitions } from '@/core/blocks/registry';
import type { AssetPack } from '@/core/textures/assetTypes';
import { bakeBlockState } from '@/core/textures/blockModel';
import { jarVersionFromPath, readClientJar } from '@/lib/textures/minecraftJar';
import type { TextureStatus } from '@/lib/textures/textureService';
import { fakeClientJar } from '../helpers/fakeMinecraftJar';

let home: string;

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'mcb-textures-'));
  // Isolate from real launcher folders and caches on this machine.
  vi.stubEnv('HOME', home);
  vi.stubEnv('USERPROFILE', home);
  vi.stubEnv('APPDATA', join(home, 'AppData', 'Roaming'));
  vi.stubEnv('MCB_ASSET_CACHE_DIR', join(home, 'cache'));
  vi.stubEnv('MINECRAFT_JAR', '');
  vi.stubEnv('MCB_MINECRAFT_JAR', '');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await rm(home, { recursive: true, force: true });
});

const status = async (): Promise<TextureStatus> => (await statusRoute()).json() as Promise<TextureStatus>;

function upload(data: Buffer, name = '1.21.11.jar'): Request {
  return new Request('http://localhost/api/textures/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/java-archive', 'X-File-Name': encodeURIComponent(name) },
    body: new Uint8Array(data),
  });
}

describe('Launcher-Dateinamen', () => {
  it('erkennt die Modrinth-App (Ordner = Dateiname mit App-Suffix), aber keine Loader-Jars', () => {
    expect(jarVersionFromPath('C:/Users/x/AppData/Roaming/ModrinthApp/meta/versions/1.21.11-0.19.3/1.21.11-0.19.3.jar')).toBe('1.21.11');
    expect(jarVersionFromPath('C:/m/versions/fabric-loader-0.16.9-1.21.11/fabric-loader-0.16.9-1.21.11.jar')).toBeNull();
    expect(jarVersionFromPath('C:/m/versions/1.21.11-0.19.3/other.jar')).toBeNull();
    expect(jarVersionFromPath('C:/curseforge/minecraft/Install/versions/1.21.11/1.21.11.jar')).toBe('1.21.11');
  });
});

describe('Textur-API', () => {
  it('ohne Minecraft-Installation: nicht verfügbar, Ressourcen 404', async () => {
    const s = await status();
    expect(s.available).toBe(false);
    expect(s.message).toMatch(/Keine Minecraft-Installation gefunden/);
    expect((await resourcesRoute()).status).toBe(404);
  });

  it('Datei-Übernahme: Client-Jar wird gelesen, gespeichert und als Ressourcen ausgeliefert', async () => {
    const res = await importRoute(upload(fakeClientJar(), 'meine 1.21.11.jar'));
    expect(res.status).toBe(200);
    const s = (await res.json()) as TextureStatus;
    expect(s).toMatchObject({ available: true, version: '1.21.11', source: { kind: 'upload', label: 'meine 1.21.11.jar' } });
    expect((await status()).available).toBe(true);
    const resources = (await (await resourcesRoute()).json()) as AssetPack;
    expect(resources.blockstates.spruce_planks).toBeDefined();
    expect(Object.keys(resources.blockstates)).toHaveLength(listBlockDefinitions().length - 1); // no blockstate for air
    expect(resources.textures['block/spruce_planks']).toBeDefined();
  });

  it('Datei-Übernahme lehnt Fremdes ab', async () => {
    expect((await importRoute(upload(Buffer.from('kein jar')))).status).toBe(422);
    expect((await importRoute(upload(Buffer.alloc(0)))).status).toBe(400);
  });

  it('findet die Client-Datei im Ordner des offiziellen Launchers und übernimmt sie', async () => {
    const dir = process.platform === 'win32' ? join(home, 'AppData', 'Roaming', '.minecraft') : join(home, '.minecraft');
    const versions = process.platform === 'darwin' ? join(home, 'Library', 'Application Support', 'minecraft') : dir;
    await mkdir(join(versions, 'versions', '1.21.11'), { recursive: true });
    await writeFile(join(versions, 'versions', '1.21.11', '1.21.11.jar'), fakeClientJar());
    const s = await status();
    expect(s).toMatchObject({ available: true, version: '1.21.11', source: { kind: 'launcher' } });
    expect(s.candidates.map((c) => c.version)).toEqual(['1.21.11']);
  });

  it('findet die Client-Datei der Modrinth-App zwischen Bibliotheken, Profilen und Loader-Jars', async () => {
    const root =
      process.platform === 'win32'
        ? join(home, 'AppData', 'Roaming', 'ModrinthApp')
        : process.platform === 'darwin'
          ? join(home, 'Library', 'Application Support', 'ModrinthApp')
          : join(home, '.local', 'share', 'ModrinthApp');
    // Layout of the Modrinth App: client jars in meta/versions/<v>-<app>/, a deep libraries tree,
    // instances under profiles/ (mods, saves …) and loader jars that are no client.
    for (let i = 0; i < 40; i++) await mkdir(join(root, 'meta', 'libraries', 'org', `lib${i}`, 'a', 'b', 'c'), { recursive: true });
    await mkdir(join(root, 'profiles', 'Weihnachten', 'mods'), { recursive: true });
    await mkdir(join(root, 'profiles', 'Weihnachten', 'saves', 'Welt'), { recursive: true });
    await writeFile(join(root, 'profiles', 'Weihnachten', 'mods', 'worldedit-mod-7.3.18.jar'), Buffer.from('mod'));
    const loader = join(root, 'meta', 'versions', 'fabric-loader-0.16.9-1.21.11');
    await mkdir(loader, { recursive: true });
    await writeFile(join(loader, 'fabric-loader-0.16.9-1.21.11.jar'), Buffer.from('loader'));
    for (const [folder, version] of [
      ['1.21.1-0.19.3', '1.21.1'],
      ['1.21.11-0.19.3', '1.21.11'],
    ] as const) {
      await mkdir(join(root, 'meta', 'versions', folder), { recursive: true });
      await writeFile(join(root, 'meta', 'versions', folder, `${folder}.jar`), fakeClientJar({ version }));
    }
    const s = await status();
    expect(s).toMatchObject({ available: true, version: '1.21.11', source: { kind: 'launcher', label: 'Modrinth App, 1.21.11' } });
    expect(s.candidates.map((c) => c.version).sort()).toEqual(['1.21.1', '1.21.11']);
    expect(s.candidates.every((c) => c.launcher === 'Modrinth App')).toBe(true);
  });

  it('MINECRAFT_JAR hat Vorrang', async () => {
    const jar = join(home, 'eigene.jar');
    await writeFile(jar, fakeClientJar({ version: '1.21.1' }));
    vi.stubEnv('MINECRAFT_JAR', jar);
    expect(await status()).toMatchObject({ available: true, version: '1.21.1', source: { kind: 'env', path: jar } });
  });

  it('Download von Mojang nur mit Zustimmung; Prüfsumme wird kontrolliert', async () => {
    const post = (body: unknown) =>
      downloadRoute(new Request('http://localhost/api/textures/download', { method: 'POST', body: JSON.stringify(body) }));
    expect((await post({ version: '1.21.11' })).status).toBe(400);
    expect((await post({ version: '1.21.11', acceptEula: false })).status).toBe(400);
    expect((await post({ version: '1.7.10', acceptEula: true })).status).toBe(400);

    const jar = fakeClientJar();
    let sha1 = createHash('sha1').update(jar).digest('hex');
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (input: string | URL) => {
      const url = String(input);
      urls.push(url);
      if (url.endsWith('version_manifest_v2.json')) {
        return Response.json({ versions: [{ id: '1.21.11', url: 'https://piston-meta.mojang.com/v1/packages/x/1.21.11.json' }] });
      }
      if (url.endsWith('1.21.11.json')) {
        return Response.json({ downloads: { client: { url: 'https://piston-data.mojang.com/v1/objects/y/client.jar', sha1, size: jar.length } } });
      }
      return new Response(new Uint8Array(jar));
    });
    const ok = await post({ version: '1.21.11', acceptEula: true });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ available: true, source: { kind: 'mojang' } });
    expect(urls.every((u) => /^https:\/\/piston-(meta|data)\.mojang\.com\//.test(u))).toBe(true);

    sha1 = '0'.repeat(40);
    const bad = await post({ version: '1.21.11', acceptEula: true });
    expect(bad.status).toBe(502);
    expect(((await bad.json()) as { error: string }).error).toMatch(/Prüfsumme/);
  });
});

// Runs only with a real client jar: MCB_MINECRAFT_JAR=/path/to/1.21.11.jar npx vitest run tests/integration/textures.test.ts
const realJar = process.env.MCB_MINECRAFT_JAR;
describe.skipIf(!realJar || !existsSync(realJar))('Echte Minecraft-Client-Datei', () => {
  it('jeder Registry-Blockzustand wird vollständig aus den Original-Modellen gebacken', () => {
    const pack = readClientJar(readFileSync(realJar!));
    let states = 0;
    for (const def of listBlockDefinitions().filter((d) => isAvailableIn(d.id, '1.21.11'))) {
      const combos = Object.entries(def.properties).reduce<Record<string, string>[]>(
        (acc, [k, values]) => acc.flatMap((c) => values.map((v) => ({ ...c, [k]: v }))),
        [{}],
      );
      for (const props of combos) {
        states++;
        const baked = bakeBlockState(def.id, props, pack);
        expect(baked.missing, `${def.id} ${JSON.stringify(props)}`).toEqual([]);
        // A wall without post and sides is invisible in vanilla, too (the resolver never makes it).
        const invisibleWall = def.shape === 'wall' && props.up === 'false' && ['north', 'east', 'south', 'west'].every((d) => props[d] === 'none');
        if (def.id !== 'minecraft:air' && !invisibleWall) expect(baked.quads.length, def.id).toBeGreaterThan(0);
        for (const q of baked.quads) expect(pack.textures[q.texture], q.texture).toBeDefined();
      }
    }
    expect(states).toBeGreaterThan(200);
    const front = (facing: string) =>
      bakeBlockState('minecraft:jack_o_lantern', { facing }, pack).quads.find((q) => q.texture === 'block/jack_o_lantern')?.direction;
    expect(['north', 'east', 'south', 'west'].map(front)).toEqual(['north', 'east', 'south', 'west']);
    const ends = bakeBlockState('minecraft:oak_log', { axis: 'x' }, pack).quads.filter((q) => q.texture === 'block/oak_log_top');
    expect(ends.map((q) => q.direction).sort()).toEqual(['east', 'west']);
  });
});
