/**
 * Screenshots of the app's 3D preview (with the user's real Minecraft textures) for visual
 * checks and docs/screenshots. Drives the running app like a user: prompt, settings, generate,
 * then sets camera views through the scene's window.__mcbSetView hook.
 *
 *   npm run dev            (in another terminal; the app finds the Minecraft jar itself)
 *   node scripts/screenshots.mjs cases.json [outDir]
 *
 * cases.json: [{ "name": "medieval-medium", "prompt": "…", "kind": "Haus", "style": "Mittelalter",
 *   "theme": "Weihnachten", "size": "Mittel", "views": [[35, 28, 1], [215, 28, 1], [20, 12, 0.55, 0.3]] }]
 * Labels are the German UI labels. View = [azimuth°, elevation°, zoom, target height factor].
 */
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const BASE = process.env.MCB_SHOT_URL ?? 'http://localhost:3000';
const [casesFile, outDir = 'docs/screenshots'] = process.argv.slice(2);
if (!casesFile) {
  console.error('Aufruf: node scripts/screenshots.mjs cases.json [Zielordner]');
  process.exit(64);
}
const cases = JSON.parse(await readFile(casesFile, 'utf8'));
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });

async function choose(testId, label) {
  if (!label) return;
  const radio = page.getByTestId(testId).getByRole('radio', { name: label, exact: true });
  await radio.check({ force: true });
}

for (const c of cases) {
  const started = Date.now();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByTestId('generate-button').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('[data-testid="generate-button"]')?.hasAttribute('disabled'), null, { timeout: 60_000 });
  if (c.prompt) await page.getByTestId('prompt-input').fill(c.prompt);
  await choose('control-kind', c.kind);
  await choose('control-style', c.style);
  await choose('control-theme', c.theme);
  await choose('control-size', c.size);
  if (c.seed !== undefined) await page.getByTestId('control-seed').fill(String(c.seed));
  await page.getByTestId('generate-button').click();
  const scene = page.getByTestId('scene');
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="scene"]');
      const hash = el?.getAttribute('data-model-hash');
      return !!hash && el?.getAttribute('data-rendered-hash') === hash && el?.getAttribute('data-render-mode') === 'textures';
    },
    null,
    { timeout: 180_000 },
  );
  const views = c.views ?? [[35, 28, 1], [215, 30, 1], [15, 14, 0.55, 0.3]];
  for (const [i, view] of views.entries()) {
    await page.evaluate((v) => window.__mcbSetView?.(...v), view);
    await page.waitForTimeout(600);
    await scene.locator('canvas').screenshot({ path: join(outDir, `${c.name}-${i + 1}.png`) });
  }
  console.log(`${c.name}: ${views.length} Bilder (${((Date.now() - started) / 1000).toFixed(1)} s)`);
}
await browser.close();
