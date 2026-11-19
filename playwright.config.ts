import { defineConfig } from '@playwright/test';

// PW_PORT deixa rodar o e2e de dois worktrees ao mesmo tempo sem um testar o servidor do outro.
const PORT = Number(process.env.PW_PORT ?? 4173);

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  // Usa o Chrome já instalado na máquina (sem baixar navegador). PW_CHANNEL=chromium usa o do Playwright.
  use: { baseURL: `http://localhost:${PORT}`, viewport: { width: 1280, height: 800 }, channel: process.env.PW_CHANNEL ?? 'chrome' },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
  },
});
