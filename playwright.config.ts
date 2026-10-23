import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3200);
// Optional installed browser instead of Playwright's own Chromium, e.g. PW_CHANNEL=msedge.
const channel = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    acceptDownloads: true,
    trace: 'retain-on-failure',
    launchOptions: {
      // Software WebGL for headless runs (no GPU in CI containers).
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, ...channel },
      testIgnore: /mobile\.spec\.ts/,
    },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], ...channel }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // Imported test textures go to a throw-away folder, not the project's .minecraft-assets.
    env: { ...(process.env as Record<string, string>), MCB_ASSET_CACHE_DIR: join(tmpdir(), `mcb-e2e-assets-${process.pid}`) },
  },
});
