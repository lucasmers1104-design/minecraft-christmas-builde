import { readFile } from 'node:fs/promises';
import { expect, type Page } from '@playwright/test';
import { validateSchematic, type SchematicValidationReport } from '../../src/core/export/validateSchematic';

/**
 * Waits until the 3D scene has built geometry for exactly the currently selected model.
 * Generating (houses score their candidates first) and meshing with software WebGL can take
 * longer than the default 15 s on a slow machine under test load, hence the longer limit.
 */
export async function waitForRenderedModel(page: Page): Promise<string> {
  const scene = page.getByTestId('scene');
  await expect(scene).toHaveAttribute('data-model-hash', /^[0-9a-f]{64}$/, { timeout: 45_000 });
  const hash = (await scene.getAttribute('data-model-hash'))!;
  await expect(scene).toHaveAttribute('data-rendered-hash', hash, { timeout: 45_000 });
  const faces = Number(await scene.getAttribute('data-face-count'));
  expect(faces).toBeGreaterThan(100);
  await expect(scene.locator('canvas')).toBeVisible();
  return hash;
}

/** The canvas shows more than a flat background colour. */
export async function expectCanvasHasContent(page: Page): Promise<void> {
  const canvas = page.getByTestId('scene').locator('canvas');
  const stats = await canvas.evaluate((el: HTMLCanvasElement) => {
    const probe = document.createElement('canvas');
    probe.width = 64;
    probe.height = 64;
    const ctx = probe.getContext('2d')!;
    ctx.drawImage(el, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    const colours = new Set<number>();
    for (let i = 0; i < data.length; i += 4) colours.add((data[i]! >> 3) * 1024 + (data[i + 1]! >> 3) * 32 + (data[i + 2]! >> 3));
    return colours.size;
  });
  expect(stats).toBeGreaterThan(8);
}

export async function downloadSchematic(page: Page): Promise<{ fileName: string; bytes: Uint8Array; report: SchematicValidationReport }> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('download-button').click();
  const download = await downloadPromise;
  const path = await download.path();
  const bytes = new Uint8Array(await readFile(path));
  return { fileName: download.suggestedFilename(), bytes, report: validateSchematic(bytes) };
}

export async function materialRowSum(page: Page): Promise<number> {
  const counts = await page.getByTestId('material-row').evaluateAll((rows) => rows.map((r) => Number(r.getAttribute('data-count'))));
  return counts.reduce((a, b) => a + b, 0);
}
