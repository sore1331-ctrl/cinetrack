// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 7_500 },
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: 'node scripts/dev-server.js 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 20_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        browserName: 'chromium',
      },
    },
  ],
});
