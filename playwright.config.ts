import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/web', timeout: 30_000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:8083', viewport: { width: 1440, height: 900 }, launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] } },
  webServer: { command: 'node scripts/pc-preview.mjs', env: { SPOTCLIP_PREVIEW_PORT: '8083', SPOTCLIP_NO_BROWSER: '1' }, url: 'http://127.0.0.1:8083', timeout: 20_000, reuseExistingServer: false },
});
