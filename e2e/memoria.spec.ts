import { expect, test, type Page } from '@playwright/test';
import { passarApresentacao, seApresentar } from './apoio';

const SHOTS = process.env.SHOTS_DIR;

test.beforeEach(async ({ page }) => {
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByTestId('play-now')).toBeVisible();
});

async function abrir(page: Page) {
  await expect(async () => {
    if (await page.getByTestId('play-now').isVisible()) await page.keyboard.press('m');
    await expect(page.getByTestId('me-menu')).toBeVisible({ timeout: 500 });
  }).toPass();
}

/** Fecha o par `par` pelo teclado: a tecla impressa em cada uma das duas cartas. */
async function fecharPar(page: Page, par: string) {
  const teclas = await page.locator(`.me-carta[data-par="${par}"]:not(.feita) kbd`).allTextContents();
  for (const t of teclas) await page.keyboard.press(t.toLowerCase());
}

/** Fecha todos os pares do quadro, na ordem em que aparecem. */
async function resolverQuadro(page: Page) {
  const abertas = page.locator('.me-carta:not(.feita)');
  for (let i = 0; i < 12 && (await abertas.count()) > 0; i++) await fecharPar(page, (await abertas.first().getAttribute('data-par'))!);
}

test('do fliperama ao primeiro par só no teclado: lição primeiro, depois o par fecha com cor', async ({ page }) => {
  await abrir(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/memoria-menu.png` });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('me-licao')).toBeVisible();
  // Jogador novo: as palavras do primeiro quadro são apresentadas antes, de 3 a 5, e nada é cobrado.
  await expect(page.getByTestId('me-quadro')).toHaveCount(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/memoria-licao.png` });
  const n = await passarApresentacao(page);
  expect(n).toBeGreaterThanOrEqual(3);
  expect(n).toBeLessThanOrEqual(5);
  await expect(page.getByTestId('me-quadro')).toBeVisible();
  await expect(page.getByTestId('me-pratica')).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/memoria-quadro.png` });
  const par = (await page.locator('.me-carta').first().getAttribute('data-par'))!;
  await fecharPar(page, par);
  await expect(page.locator(`.me-carta[data-par="${par}"].feita`)).toHaveCount(2);
});

test('na prática, carta errada não abre tela de erro nem tira nada: mostra a palavra de novo e o par certo ainda fecha', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Enter');
  await passarApresentacao(page);
  const cartas = page.locator('.me-carta');
  const pares = await cartas.evaluateAll((els) => els.map((e) => [e.getAttribute('data-par'), e.getAttribute('data-lado')]));
  const img = pares.findIndex(([, l]) => l === 'img');
  const outra = pares.findIndex(([p, l]) => l === 'palavra' && p !== pares[img]![0]);
  await cartas.nth(img).click();
  await cartas.nth(outra).click();
  // A palavra aparece de novo, por cima do quadro, e Enter volta para ele.
  await expect(page.getByTestId('apresentacao')).toHaveAttribute('data-modo', 'de-novo');
  await passarApresentacao(page);
  await expect(page.getByTestId('me-quadro')).toBeVisible();
  await expect(page.locator('.me-carta.feita')).toHaveCount(0);
  await fecharPar(page, pares[img]![0]!);
  await expect(page.locator('.me-carta.feita')).toHaveCount(2);
});

test('rodada inteira: três quadros com pausa entre eles, resumo e progresso salvo', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Enter');
  for (let q = 0; q < 3; q++) {
    await seApresentar(page);
    await expect(page.getByTestId('me-quadro')).toBeVisible();
    // Quadro de memória: as cartas começam viradas e a tecla abre.
    await resolverQuadro(page);
    if (q < 2) {
      await expect(page.getByTestId('me-pausa')).toBeVisible();
      if (SHOTS && q === 0) await page.screenshot({ path: `${SHOTS}/memoria-pausa.png` });
      await page.keyboard.press('Enter');
    }
  }
  await expect(page.getByTestId('me-resumo')).toContainText('Rodada concluída');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/memoria-resumo.png` });
  await page.reload();
  await abrir(page);
  await expect(page.getByTestId('me-start')).toContainText('Nova rodada');
});

test('Esc no meio para a rodada e mostra o que foi feito', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Enter');
  await passarApresentacao(page);
  await fecharPar(page, (await page.locator('.me-carta').first().getAttribute('data-par'))!);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('me-resumo')).toBeVisible();
});

test('no celular, o quadro cabe na tela sem rolar para o lado', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await abrir(page);
  await page.keyboard.press('Enter');
  // A apresentação também cabe na tela do celular.
  await expect(page.getByTestId('apresentacao')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/memoria-apresentacao-celular.png`, fullPage: true });
  await passarApresentacao(page);
  await expect(page.getByTestId('me-quadro')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/memoria-celular.png`, fullPage: true });
});
