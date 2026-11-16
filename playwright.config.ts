import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  // Usa o Chrome já instalado na máquina (sem baixar navegador). PW_CHANNEL=chromium usa o do Playwright.
  use: { baseURL: 'http://localhost:4173', viewport: { width: 1280, height: 800 }, channel: process.env.PW_CHANNEL ?? 'chrome' },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
});
