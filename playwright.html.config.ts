import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/html', timeout: 30_000, workers: 1,
  use: { viewport: { width: 1280, height: 900 }, launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] } },
});
