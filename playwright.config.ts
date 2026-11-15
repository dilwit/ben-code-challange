import { defineConfig, devices } from '@playwright/test'

const APP_PORT = 3000
const APP_URL = `http://localhost:${APP_PORT}`

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // The mock fails about 1 in 5 requests at random, so retry to keep the happy path from flaking.
  retries: 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: APP_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm mock',
      port: 4010,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm build && pnpm start --port ${APP_PORT}`,
      url: APP_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        COMMISSION_QUOTE_API_BASE_URL: 'http://localhost:4010/commission-quote-api',
        COMMISSION_QUOTE_API_KEY: 'local-dev-key', // the key in .env.example; the mock accepts any non-empty key
      },
    },
  ],
})
