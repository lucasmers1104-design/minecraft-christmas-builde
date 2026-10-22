import { expect, test, type Page } from '@playwright/test';
import { waitForRenderedModel } from './helpers';

/**
 * UI behaviour of the optional local AI. The two AI endpoints are intercepted here (no model
 * can run in CI); the real Ollama client is covered by tests/integration/ai.test.ts against a
 * fake Ollama server. The block generation itself is real.
 */
const READY = {
  enabled: true,
  provider: 'ollama',
  model: 'qwen3:14b',
  reachable: true,
  modelInstalled: true,
  installedModels: ['qwen3:14b'],
  message: 'Lokale KI bereit (Ollama, Modell qwen3:14b).',
};

async function mockStatus(page: Page, status: object) {
  await page.route('**/api/ai/status', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(status) }));
}

test('ohne aktivierte KI: ehrlich als regelbasiert gekennzeichnet, Schalter gesperrt', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('ai-status')).toContainText('nicht aktiviert');
  await expect(page.getByTestId('ai-toggle')).toBeDisabled();
  await expect(page.getByTestId('generator-mode')).toContainText('keine KI aktiv');
  await page.getByTestId('generate-button').click();
  await waitForRenderedModel(page);
  await expect(page.getByTestId('planner-badge')).toHaveText('Regelbasierter Generator');
});

test('mit bereiter lokaler KI: Plan wird angezeigt, angewendet und gekennzeichnet', async ({ page }) => {
  await mockStatus(page, READY);
  let planCalls = 0;
  await page.route('**/api/ai/plan', async (route) => {
    planCalls++;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        source: 'ollama',
        model: 'qwen3:14b',
        durationMs: 4200,
        attempts: 1,
        plan: { kind: 'station', size: 'small', explanation: 'Ein kleiner Winterbahnhof.', unsupported: ['Dampflok'] },
        patch: { kind: 'station', size: 'small' },
      }),
    });
  });
  await page.goto('/');
  await expect(page.getByTestId('ai-status')).toHaveAttribute('data-ready', 'true');
  await page.getByTestId('ai-toggle').check();
  await expect(page.getByTestId('generator-mode')).toContainText('lokale KI (qwen3:14b)');
  await page.getByTestId('prompt-input').fill('Ein kleiner Bahnhof mit Dampflok');
  await page.getByTestId('generate-button').click();
  await expect(page.getByTestId('building-title')).toHaveText('Weihnachtlicher Bahnhof · Rustikal');
  await waitForRenderedModel(page);
  await expect(page.getByTestId('ai-plan')).toContainText('Ein kleiner Winterbahnhof.');
  await expect(page.getByTestId('ai-unsupported')).toContainText('Dampflok');
  await expect(page.getByTestId('planner-badge')).toHaveText('KI-Plan: qwen3:14b (lokal)');
  await expect(page.getByTestId('control-kind')).toContainText('von KI');
  // Same text again: the existing plan is reused, the model is not asked twice.
  await page.getByTestId('generate-button').click();
  await waitForRenderedModel(page);
  expect(planCalls).toBe(1);
});

test('KI-Fehler: regelbasierter Fallback mit Hinweis', async ({ page }) => {
  await mockStatus(page, READY);
  await page.route('**/api/ai/plan', (route) =>
    route.fulfill({ status: 504, contentType: 'application/json', body: JSON.stringify({ error: 'Die lokale KI hat nicht innerhalb von 120 s geantwortet.', code: 'timeout' }) }),
  );
  await page.goto('/');
  await page.getByTestId('ai-toggle').check();
  await page.getByTestId('prompt-input').fill('kleines Haus aus Eiche');
  await page.getByTestId('generate-button').click();
  await waitForRenderedModel(page);
  await expect(page.getByTestId('ai-notice')).toContainText('regelbasiert erzeugt');
  await expect(page.getByTestId('planner-badge')).toHaveText('Regelbasierter Generator');
  await expect(page.getByTestId('preview-dimensions')).toContainText('25 × 15 × 24');
});
