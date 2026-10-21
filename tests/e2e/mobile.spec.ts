import { expect, test } from '@playwright/test';
import { downloadSchematic, waitForRenderedModel } from './helpers';

test('Mobil: Tabs, bedienbare 3D-Szene und Export', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('tab-input')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('generate-button').click();
  await expect(page.getByTestId('tab-preview')).toHaveAttribute('aria-selected', 'true');
  const hash = await waitForRenderedModel(page);
  const box = await page.getByTestId('scene').locator('canvas').boundingBox();
  expect(box!.width).toBeGreaterThan(300);
  expect(box!.height).toBeGreaterThan(300);

  // Touch drag on the canvas must not scroll the page away from the scene.
  const before = await page.evaluate(() => window.scrollY);
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);

  await page.getByTestId('tab-details').click();
  await expect(page.getByTestId('material-total')).toBeVisible();
  // No horizontal overflow (which would make mobile browsers zoom out).
  for (const tab of ['input', 'preview', 'details']) {
    await page.getByTestId(`tab-${tab}`).click();
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, `Tab ${tab}`).toBeLessThanOrEqual(clientWidth);
  }
  await page.getByTestId('tab-details').click();
  const { report } = await downloadSchematic(page);
  expect(report.ok).toBe(true);
  expect(report.decoded?.hash).toBe(hash);
});
