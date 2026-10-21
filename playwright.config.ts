import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3200);

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
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      testIgnore: /mobile\.spec\.ts/,
    },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
