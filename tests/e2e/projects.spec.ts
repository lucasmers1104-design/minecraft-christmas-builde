import { expect, test } from '@playwright/test';
import { downloadSchematic, waitForRenderedModel } from './helpers';

test.describe('Phase 3: Projekte (IndexedDB)', () => {
  test('Speichern → Reload → Öffnen ergibt identischen Hash und korrekten Export', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('prompt-input').fill('Ein kleines Haus aus Eiche');
    await page.getByTestId('generate-button').click();
    await waitForRenderedModel(page);
    await page.getByTestId('variant-1').click();
    const hash = await waitForRenderedModel(page);

    await page.getByTestId('project-name-input').fill('Test-Projekt');
    await page.getByTestId('save-button').click();
    await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'gespeichert');
    await expect(page.getByTestId('open-library')).toContainText('Test-Projekt');

    await page.reload();
    await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'bereit');
    await expect(page.getByTestId('scene')).toHaveAttribute('data-model-hash', '');

    await page.getByTestId('open-library').click();
    const row = page.getByTestId('project-row').filter({ hasText: 'Test-Projekt' });
    await expect(row).toContainText('zuletzt geändert');
    await row.getByTestId('project-open').click();
    await expect(page.getByTestId('project-library')).not.toBeVisible();
    expect(await waitForRenderedModel(page)).toBe(hash);
    await expect(page.getByTestId('variant-1')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('prompt-input')).toHaveValue('Ein kleines Haus aus Eiche');
    await expect(page.getByTestId('preview-dimensions')).toContainText('25 × 17 × 31');

    const { report } = await downloadSchematic(page);
    expect(report.ok).toBe(true);
    expect(report.decoded?.hash).toBe(hash);
  });

  test('Umbenennen, Duplizieren, Löschen mit Bestätigung', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('generate-button').click();
    await waitForRenderedModel(page);
    await page.getByTestId('project-name-input').fill('Original');
    await page.getByTestId('save-button').click();
    await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'gespeichert');

    await page.getByTestId('open-library').click();
    const library = page.getByTestId('project-library');
    await library.getByTestId('project-rename').click();
    await library.getByTestId('rename-input').fill('Umbenannt');
    await library.getByTestId('rename-confirm').click();
    await expect(library.getByTestId('project-name').first()).toContainText('Umbenannt');

    await library.getByTestId('project-duplicate').first().click();
    await expect(library.getByTestId('project-row')).toHaveCount(2);
    await expect(library).toContainText('Umbenannt (Kopie)');

    const copy = library.getByTestId('project-row').filter({ hasText: '(Kopie)' });
    await copy.getByTestId('project-delete').click();
    await expect(copy).toContainText('endgültig löschen?');
    await copy.getByTestId('project-delete-confirm').click();
    await expect(library.getByTestId('project-row')).toHaveCount(1);
    await library.getByTestId('library-close').click();
    await expect(library).not.toBeVisible();
  });

  test('ungespeicherte Änderungen werden vor dem Öffnen eines anderen Projekts gemeldet', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('generate-button').click();
    await waitForRenderedModel(page);
    await page.getByTestId('project-name-input').fill('Erstes');
    await page.getByTestId('save-button').click();
    await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'gespeichert');
    await page.getByTestId('save-as-new-button').click();
    await expect(page.getByTestId('status')).toHaveAttribute('data-status', 'gespeichert');

    // Change something → dirty.
    await page.getByTestId('variant-2').click();
    await expect(page.getByTestId('project-heading-header')).toContainText('Ungespeicherte Änderungen');
    await page.getByTestId('open-library').click();
    const other = page.getByTestId('project-row').filter({ hasNot: page.getByTestId('project-current') }).first();
    await other.getByTestId('project-open').click();
    await expect(other).toContainText('Ungespeicherte Änderungen');
    await other.getByTestId('project-open').click();
    await expect(page.getByTestId('project-library')).not.toBeVisible();
  });
});
