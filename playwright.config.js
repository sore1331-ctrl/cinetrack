// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 7_500 },
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: 'npx http-server . -p 4173 -c-1 --silent',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 20_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
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
