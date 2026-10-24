import { expect, test } from '@playwright/test';
import { expectCanvasHasContent, waitForRenderedModel } from './helpers';
import { fakeClientJar } from '../helpers/fakeMinecraftJar';

test('echte Texturen: Minecraft-Datei auswählen, texturierte Vorschau, umschaltbar', async ({ page }) => {
  // Preparing the atlas takes about 2 s normally, but much longer while Playwright records a trace.
  test.setTimeout(120_000);
  await page.goto('/');
  await page.getByTestId('generate-button').click();
  await waitForRenderedModel(page);

  // Pick a client jar (a generated stand-in in the vanilla layout) through the setup panel.
  await page.getByTestId('texture-setup-toggle').click();
  await expect(page.getByTestId('texture-setup-panel')).toBeVisible();
  await expect(page.getByTestId('texture-download')).toBeDisabled(); // Mojang download needs the EULA checkbox
  await page.getByTestId('texture-file-input').setInputFiles({ name: '1.21.11.jar', mimeType: 'application/java-archive', buffer: fakeClientJar() });

  await expect(page.getByTestId('texture-status')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await expect(page.getByTestId('texture-status')).toContainText('Minecraft 1.21.11', { timeout: 45_000 });
  const scene = page.getByTestId('scene');
  await expect(scene).toHaveAttribute('data-render-mode', 'textures');
  await waitForRenderedModel(page);
  await expectCanvasHasContent(page);
  // Block icons in the material list now use the textures.
  await expect(page.getByTestId('block-swatch-texture').first()).toBeVisible();

  await page.getByTestId('texture-toggle').click();
  await expect(scene).toHaveAttribute('data-render-mode', 'colors');
  await page.getByTestId('texture-toggle').click();
  await expect(scene).toHaveAttribute('data-render-mode', 'textures');

  // After a reload the imported textures are used right away.
  await page.reload();
  await expect(page.getByTestId('texture-status')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
});
