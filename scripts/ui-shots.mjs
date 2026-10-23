/**
 * Screenshots of the whole UI for design reviews (desktop 1440 × 900 and mobile 412 × 915).
 * Unlike scripts/screenshots.mjs (3D views with real textures) this one captures the page.
 *
 *   npm run dev                              (in another terminal)
 *   node scripts/ui-shots.mjs [outDir] [--generate] [--settings] [--library] [--mobile-only] [--desktop-only]
 *
 * --generate  clicks "Bauwerk generieren" and waits for the 3D scene
 * --settings  also captures the AI settings dialog
 * --library   also captures the project library dialog
 * MCB_SHOT_URL (default http://localhost:3000), MCB_SHOT_CHANNEL (e.g. "msedge" to use the
 * installed Microsoft Edge instead of Playwright's own Chromium).
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const outDir = args.find((a) => !a.startsWith('--')) ?? 'ui-shots';
const BASE = process.env.MCB_SHOT_URL ?? 'http://localhost:3000';
const channel = process.env.MCB_SHOT_CHANNEL || undefined;
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const viewports = [
  ...(flags.has('--mobile-only') ? [] : [{ name: 'desktop', width: 1440, height: 900, mobile: false }]),
  ...(flags.has('--desktop-only') ? [] : [{ name: 'mobile', width: 412, height: 915, mobile: true }]),
];

for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, isMobile: vp.mobile, hasTouch: vp.mobile });
  const shot = async (name, fullPage = false) => {
    const file = join(outDir, `${vp.name}-${name}.png`);
    await page.screenshot({ path: file, fullPage });
    console.log(file);
  };
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.querySelector('[data-testid="generate-button"]')?.hasAttribute('disabled'), null, { timeout: 120_000 });
  await page.waitForTimeout(500);
  await shot('start');
  if (vp.mobile) await shot('start-full', true);
  if (flags.has('--settings')) {
    const open = page.getByTestId('open-settings').or(page.getByTestId('ai-open-settings')).first();
    await open.click();
    await page.getByTestId('ai-settings').waitFor({ state: 'visible' });
    await page.waitForTimeout(800);
    await shot('settings');
    await page.keyboard.press('Escape');
  }
  if (flags.has('--library')) {
    await page.getByTestId('open-library').click();
    await page.getByTestId('project-library').waitFor({ state: 'visible' });
    await page.waitForTimeout(400);
    await shot('library');
    await page.keyboard.press('Escape');
  }
  if (flags.has('--generate')) {
    await page.getByTestId('generate-button').click();
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="scene"]');
        const hash = el?.getAttribute('data-model-hash');
        return !!hash && el?.getAttribute('data-rendered-hash') === hash;
      },
      null,
      { timeout: 180_000 },
    );
    await page.waitForTimeout(800);
    await shot('generated');
    if (vp.mobile) {
      for (const tab of ['input', 'details']) {
        await page.getByTestId(`tab-${tab}`).click();
        await page.waitForTimeout(300);
        await shot(`generated-${tab}`, true);
      }
    } else {
      await shot('generated-full', true);
    }
  }
  await page.close();
}
await browser.close();
