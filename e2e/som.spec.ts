import { expect, test } from './base';

test.beforeEach(async ({ page }) => {
  await page.route('https://kanjimon.online/**', (route) => route.abort());
});

test('nenhum áudio é criado antes da primeira interação; depois dela a trilha do fliperama é baixada', async ({ page }) => {
  // Conta quantos AudioContext a página cria.
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    (window as unknown as { criados: number }).criados = 0;
    window.AudioContext = class extends Original {
      constructor(o?: AudioContextOptions) {
        super(o);
        (window as unknown as { criados: number }).criados++;
      }
    };
  });
  const trilhas: string[] = [];
  page.on('request', (r) => {
    if (/\/(hub|calmo|historia|acao|chefe|vitoria)[^/]*\.ogg/.test(r.url())) trilhas.push(r.url());
  });
  await page.goto('/');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as unknown as { criados: number }).criados)).toBe(0);
  expect(trilhas).toEqual([]);
  await page.mouse.click(5, 5);
  await expect.poll(() => page.evaluate(() => (window as unknown as { criados: number }).criados)).toBe(1);
  await expect.poll(() => trilhas.some((u) => /\/hub[^/]*\.ogg/.test(u))).toBe(true);
});

test('ajustes: os volumes ficam guardados e os créditos listam músicas e efeitos', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ajustes' }).click();
  const musica = page.getByTestId('som-volMusica');
  await musica.fill('20');
  await page.getByRole('button', { name: /Fechar/ }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await expect(page.getByTestId('som-volMusica')).toHaveValue('20');
  await page.getByTestId('som-creditos').click();
  const lista = page.getByTestId('som-creditos-lista');
  await expect(lista).toContainText('音楽：魔王魂');
  await expect(lista).toContainText('効果音：効果音ラボ');
  await expect(lista).toContainText('Músicas do Kana Beat');
});

test('som desligado deixa os volumes travados', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByTestId('som-ligado').uncheck();
  await expect(page.getByTestId('som-volEfeitos')).toBeDisabled();
});
