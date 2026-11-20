import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  // Ninguém com servidor das aulas no ar: a voz do PC não responde.
  await page.route('http://127.0.0.1:8791/**', (route) => route.abort());
});

test('do fliperama a uma aula tocando, só no teclado, com a voz livre do site', async ({ page }) => {
  const pedidos: string[] = [];
  page.on('request', (r) => pedidos.push(new URL(r.url()).pathname));
  await page.goto('/');
  await expect(page.getByTestId('play-now')).toBeVisible();
  await page.keyboard.press('o');
  await expect(page.getByTestId('ouvir-titulo')).toHaveText('Como funciona o modo Ouvir');
  await page.keyboard.press(' ');
  await expect(page.getByTestId('ouvir-play')).toContainText('Pausar');
  // A primeira fala é português, na gravação da voz livre.
  await expect.poll(() => pedidos.some((p) => /\/vozes-pt\/[0-9a-f]{16}\.mp3$/.test(p))).toBe(true);
  await page.keyboard.press(' ');
  await expect(page.getByTestId('ouvir-play')).toContainText('Tocar');
  // ↓ escolhe a próxima aula; Esc volta ao fliperama.
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('ouvir-titulo')).not.toHaveText('Como funciona o modo Ouvir');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-now')).toBeVisible();
});

test('a Jornada leva ao modo Ouvir', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('j');
  await page.getByTestId('jn-ouvir').click();
  await expect(page.getByTestId('ouvir-titulo')).toBeVisible();
});
