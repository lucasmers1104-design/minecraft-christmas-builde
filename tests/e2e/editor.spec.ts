import { expect, test, type Page } from '@playwright/test';
import { downloadSchematic, waitForRenderedModel } from './helpers';

async function total(page: Page): Promise<number> {
  return Number((await page.getByTestId('material-total').innerText()).replace(/\D/g, ''));
}

async function clickSceneCenter(page: Page): Promise<void> {
  const box = (await page.getByTestId('scene').locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe('Editor', () => {
  test('Klick im 3D-Modell entfernt einen Block; Rückgängig/Wiederholen; Export enthält die Änderung', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('generate-button').click();
    const original = await waitForRenderedModel(page);
    const before = await total(page);

    await page.getByTestId('mode-remove').click();
    await clickSceneCenter(page);
    await expect(page.getByTestId('scene')).not.toHaveAttribute('data-model-hash', original);
    const edited = await waitForRenderedModel(page);
    expect(edited).not.toBe(original);
    expect(await total(page)).toBe(before - 1);
    await expect(page.getByTestId('preview-dimensions')).toContainText('bearbeitet (1)');
    await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'bearbeitet');

    await page.getByTestId('undo').click();
    await expect(page.getByTestId('scene')).toHaveAttribute('data-model-hash', original);
    expect(await waitForRenderedModel(page)).toBe(original);
    await page.keyboard.press('Control+y');
    await expect(page.getByTestId('scene')).toHaveAttribute('data-model-hash', edited);
    expect(await waitForRenderedModel(page)).toBe(edited);

    const { report } = await downloadSchematic(page);
    expect(report.ok).toBe(true);
    expect(report.decoded?.hash).toBe(edited);
  });

  test('Setzen-Werkzeug im 3D-Modell und Pipette', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('generate-button').click();
    await waitForRenderedModel(page);
    const before = await total(page);
    await page.getByTestId('block-search').fill('gold');
    await page.getByTestId('block-option-gold_block').click();
    await expect(page.getByTestId('brush-state')).toHaveText('minecraft:gold_block');
    await page.getByTestId('mode-place').click();
    await clickSceneCenter(page);
    await waitForRenderedModel(page);
    expect(await total(page)).toBe(before + 1);

    await page.getByTestId('mode-pick').click();
    await page.getByTestId('rotate-left').click();
    await page.waitForTimeout(300); // let the camera move settle before clicking
    await clickSceneCenter(page);
    await expect(page.getByTestId('editor-message')).toContainText('Pipette');
  });

  test('Koordinaten-Werkzeug, Material austauschen und Ebenenansicht', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('generate-button').click();
    await waitForRenderedModel(page);

    await page.getByTestId('block-search').fill('Goldblock');
    await page.getByTestId('block-option-gold_block').click();
    await page.getByTestId('coord-x').fill('0');
    await page.getByTestId('coord-y').fill('0');
    await page.getByTestId('coord-z').fill('0');
    await page.getByTestId('coord-set').click();
    await waitForRenderedModel(page);

    await page.getByTestId('block-search').fill('Weiße Wolle');
    await page.getByTestId('block-search').fill('wool');
    await page.getByTestId('block-option-white_wool').click();
    await page.getByTestId('replace-from').selectOption('minecraft:red_wool');
    await page.getByTestId('replace-all').click();
    await waitForRenderedModel(page);
    await expect(page.getByTestId('material-table')).not.toContainText('minecraft:red_wool');

    const { report } = await downloadSchematic(page);
    const d = report.decoded!;
    expect(d.palette[d.indices[0]!]).toBe('minecraft:gold_block');
    expect(d.palette).not.toContain('minecraft:red_wool');

    const facesAll = Number(await page.getByTestId('scene').getAttribute('data-face-count'));
    await page.getByTestId('layer-toggle').check();
    await page.getByTestId('layer-slider').fill('2');
    await expect(page.getByTestId('layer-value')).toHaveText('bis Y=2');
    await expect.poll(async () => Number(await page.getByTestId('scene').getAttribute('data-face-count'))).toBeLessThan(facesAll);
  });

  test('bearbeitetes Modell speichern, neu laden und öffnen; Neu generieren warnt', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('generate-button').click();
    const original = await waitForRenderedModel(page);
    await page.getByTestId('coord-set').click();
    await expect(page.getByTestId('scene')).not.toHaveAttribute('data-model-hash', original);
    const edited = await waitForRenderedModel(page);
    expect(edited).not.toBe(original);
    await page.getByTestId('project-name-input').fill('Bearbeitet');
    await page.getByTestId('save-button').click();
    await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'gespeichert');

    await page.reload();
    await page.getByTestId('open-library').click();
    await expect(page.getByTestId('project-row').first()).toContainText('bearbeitet');
    await page.getByTestId('project-open').first().click();
    await expect(page.getByTestId('scene')).toHaveAttribute('data-model-hash', edited);
    expect(await waitForRenderedModel(page)).toBe(edited);
    await expect(page.getByTestId('variant-0-edited')).toContainText('bearbeitet (1)');

    await page.getByTestId('generate-button').click();
    await expect(page.getByTestId('regenerate-warning')).toBeVisible();
    await page.getByTestId('generate-button').click();
    await expect(page.getByTestId('regenerate-warning')).toHaveCount(0);
    await expect(page.getByTestId('scene')).toHaveAttribute('data-model-hash', original);
    expect(await waitForRenderedModel(page)).toBe(original);
  });
});
