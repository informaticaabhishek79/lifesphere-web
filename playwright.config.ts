import { defineConfig } from '@playwright/test';

/**
 * End-to-end smoke tests. Needs the API running in development mode (OTP_DEV_ECHO=true so the
 * sign-in code is shown on screen) and this web app on http://localhost:3008.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:3008',
    viewport: { width: 1280, height: 860 },
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : undefined,
    screenshot: 'only-on-failure',
  },
});
