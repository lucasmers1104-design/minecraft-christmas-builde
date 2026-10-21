import { expect, test } from '@playwright/test';
import { downloadSchematic, expectCanvasHasContent, materialRowSum, waitForRenderedModel } from './helpers';

test.describe('Weihnachtshaus: Eingabe → 3D → Materialliste → .schem', () => {
  test('vollständiger Durchlauf mit echtem Download', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'bereit');
    await expect(page.getByTestId('download-button')).toBeDisabled();

    await page.getByTestId('prompt-input').fill('Baue ein gemütliches Weihnachtshaus aus Fichtenholz mit Schornstein.');
    await page.getByTestId('generate-button').click();
    await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'generiert');

    const hash = await waitForRenderedModel(page);
    await expectCanvasHasContent(page);
    await expect(page.getByTestId('model-hash')).toHaveText(hash);
    await expect(page.getByTestId('preview-dimensions')).toContainText('15 × 14 × 13');

    // Material list is consistent: the rows add up to the displayed total.
    const total = Number((await page.getByTestId('material-total').innerText()).replace(/\D/g, ''));
    expect(total).toBeGreaterThan(500);
    expect(await materialRowSum(page)).toBe(total);

    // Download really contains the selected volume.
    const { fileName, bytes, report } = await downloadSchematic(page);
    expect(fileName).toMatch(/\.schem$/);
    expect(bytes.length).toBeGreaterThan(100);
    expect(report.issues).toEqual([]);
    expect(report.decoded?.hash).toBe(hash);
    expect(report.decoded?.dataVersion).toBe(3955);
    const nonAir = report.decoded!.indices.reduce((n, i) => n + (report.decoded!.palette[i] === 'minecraft:air' ? 0 : 1), 0);
    expect(nonAir).toBe(total);
    await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'exportiert');
    await expect(page.getByTestId('export-result')).toContainText(fileName);
  });

  test('Variantenwechsel ändert ausgewählte Daten, 3D-Ansicht und Exportdatei', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('generate-button').click();
    const first = await waitForRenderedModel(page);
    const firstFile = await downloadSchematic(page);
    expect(firstFile.report.decoded?.hash).toBe(first);

    await page.getByTestId('variant-1').click();
    await expect(page.getByTestId('variant-1')).toHaveAttribute('aria-checked', 'true');
    const second = await waitForRenderedModel(page);
    expect(second).not.toBe(first);
    await expect(page.getByTestId('model-hash')).toHaveText(second);
    await expect(page.getByTestId('preview-dimensions')).toContainText('Seed 2');

    const secondFile = await downloadSchematic(page);
    expect(secondFile.report.ok).toBe(true);
    expect(secondFile.report.decoded?.hash).toBe(second);
    expect(Buffer.from(secondFile.bytes).equals(Buffer.from(firstFile.bytes))).toBe(false);
  });

  test('Einstellungen wirken: kleines Haus hat andere Maße und Daten', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('generate-button').click();
    const medium = await waitForRenderedModel(page);
    await page.getByTestId('control-size').getByText('Klein').click();
    await expect(page.getByTestId('stale-hint')).toBeVisible();
    await page.getByTestId('generate-button').click();
    await expect(page.getByTestId('stale-hint')).toHaveCount(0);
    const small = await waitForRenderedModel(page);
    expect(small).not.toBe(medium);
    await expect(page.getByTestId('preview-dimensions')).toContainText('11 × 11 × 9');
  });

  test('nicht implementierte Optionen sind deaktiviert und gekennzeichnet', async ({ page }) => {
    await page.goto('/');
    const kinds = page.getByTestId('control-kind');
    for (const label of ['Weihnachtsbaum', 'Marktstand', 'Bahnhof']) {
      const option = kinds.getByRole('radio', { name: new RegExp(label) });
      await expect(option).toBeDisabled();
    }
    await expect(kinds).toContainText('noch nicht verfügbar');
    await expect(page.getByTestId('save-button')).toBeDisabled();
    await expect(page.getByText('Regelbasierter Generator').first()).toBeVisible();
  });

  test('Serverfehler werden sichtbar gemeldet, Status = fehler', async ({ page }) => {
    await page.route('**/api/generate', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Testfehler vom Server' }) }),
    );
    await page.goto('/');
    await page.getByTestId('generate-button').click();
    await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'fehler');
    await expect(page.getByTestId('error-alert')).toContainText('Testfehler vom Server');
    await expect(page.getByTestId('download-button')).toBeDisabled();
  });

  test('Tastaturbedienung: Generieren per Tastatur', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('generate-button').focus();
    await page.keyboard.press('Enter');
    await waitForRenderedModel(page);
    await page.getByTestId('reset-view').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'generiert');
  });
});
