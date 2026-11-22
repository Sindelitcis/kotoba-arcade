import { expect, test, type Page } from './base';
import { chavesDasPecas, firmarCartas, passarApresentacao } from './apoio';

test.beforeEach(async ({ page }) => {
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.goto('/');
});

/** Do fliperama para o menu pela tecla P. Repete se a tecla chegar antes de a tela estar pronta. */
async function abrir(page: Page) {
  await expect(async () => {
    if (await page.getByTestId('play-now').isVisible()) await page.keyboard.press('p');
    await expect(page.getByTestId('pc-menu')).toBeVisible({ timeout: 500 });
  }).toPass();
}

async function comecar(page: Page, tecla = 'Enter') {
  await expect(async () => {
    if (await page.getByTestId('pc-menu').isVisible()) await page.keyboard.press(tecla);
    await expect(page.getByTestId('pc-progresso')).toContainText('1 de 8', { timeout: 1500 });
  }).toPass();
}

/** Índice (0…) da alternativa certa na tela. */
async function certa(page: Page): Promise<number> {
  return page.locator('[data-testid="pc-opcao"]').evaluateAll((els) => els.findIndex((e) => e.getAttribute('data-ok') === 'yes'));
}

/** Responde certo (no montar, as peças certas uma a uma) e segue. */
async function acertar(page: Page) {
  if (await page.getByTestId('pc-licao').isVisible()) await page.keyboard.press('Enter');
  for (let n = 0; n < 6 && !(await page.getByTestId('pc-revela').isVisible()); n++) {
    const i = await page.locator('[data-testid="pc-opcao"]').evaluateAll((els) =>
      els.findIndex((e) => e.getAttribute('data-ok') === 'yes' && e.getAttribute('data-estado') !== 'usada'),
    );
    await page.keyboard.press(String(i + 1));
  }
  await expect(page.getByTestId('pc-revela')).toBeVisible();
  await page.keyboard.press('Enter');
}

test('do fliperama à primeira resposta só no teclado: lição primeiro, com as peças desenhadas', async ({ page }) => {
  await abrir(page);
  await comecar(page);
  const licao = page.getByTestId('pc-licao');
  await expect(licao).toBeVisible();
  // A historinha das peças, com o português falado.
  await expect(licao.locator('.ap-explica')).not.toBeEmpty();
  // Traços do KanjiVG: o kanji é desenho, não letra.
  await expect(licao.locator('svg.pc-kanji path').first()).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pc-licao')).toHaveCount(0);
  // O primeiro kanji é 日, de uma peça só: a imagem dele (sol) entregaria a resposta.
  // Na pergunta, imagem só aparece dentro da carta de uma peça, nunca solta ao lado do kanji.
  await expect(page.locator('.pc-perguntas .pc-imagem:not(.pc-carta .pc-imagem)')).toHaveCount(0);
  const i = await certa(page);
  expect(i).toBeGreaterThanOrEqual(0);
  await page.keyboard.press(String(i + 1));
  await expect(page.getByTestId('pc-revela')).toContainText('Isso!');
  await expect(page.locator('.onomato')).toHaveCount(1);
  await expect(page.locator('.pc-opcao.certa')).toHaveCount(1);
});

test('erro não tem tela de erro: mostra a explicação e segue', async ({ page }) => {
  // Peça errada, intruso e significados só saem do que já foi visto: aqui, todos os kanji.
  await firmarCartas(page, chavesDasPecas());
  await abrir(page);
  await comecar(page);
  await page.keyboard.press('Enter');
  const i = await certa(page);
  await page.keyboard.press(String(((i + 1) % 4) + 1));
  await expect(page.getByTestId('pc-revela')).toContainText('Olha como é');
  await expect(page.locator('.onomato')).toHaveCount(1);
  await expect(page.getByTestId('pc-explica')).toBeVisible();
  await expect(page.locator('.pc-opcao.errada')).toHaveCount(1);
  await expect(page.locator('.pc-opcao.certa')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pc-progresso')).toContainText('2 de 8');
});

test('uma rodada inteira termina no resumo e o progresso fica salvo', async ({ page }) => {
  await abrir(page);
  await comecar(page);
  for (let n = 0; n < 8; n++) await acertar(page);
  await expect(page.getByTestId('pc-resumo')).toContainText('Rodada concluída');
  await expect(page.getByTestId('pc-resumo')).toContainText('8/8');
  await expect(page.getByTestId('pc-novos')).not.toBeEmpty();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pc-comecar')).toContainText('Nova rodada');

  await page.reload();
  await expect(page.getByTestId('play-now')).toContainText('Kanji em peças');
  await expect(page.getByTestId('tile-pecas')).toHaveClass(/jogado/);
  await abrir(page);
  await expect(page.getByTestId('pc-comecar')).toContainText('kanji vistos');
});

test('modo intruso (tecla 3): seis kanji e um diferente, com a diferença explicada', async ({ page }) => {
  // Peça errada, intruso e significados só saem do que já foi visto: aqui, todos os kanji.
  await firmarCartas(page, chavesDasPecas());
  await abrir(page);
  await comecar(page, '3');
  // Kanji nunca visto ganha lição antes, em qualquer modo.
  if (await page.getByTestId('pc-licao').isVisible()) await passarApresentacao(page);
  await expect(page.getByTestId('pc-quadro')).toHaveAttribute('data-modo', 'intruso');
  await expect(page.locator('[data-testid="pc-opcao"]')).toHaveCount(6);
  // Kanji grande o bastante para ver a diferença de um traço (antes saía com 17 px).
  const tamanho = await page.locator('.pc-glifo').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(tamanho).toBeGreaterThanOrEqual(40);
  const i = await certa(page);
  await page.keyboard.press(String(i + 1));
  await expect(page.getByTestId('pc-diferenca')).not.toBeEmpty();
});

test('modo montar (tecla 2): peça errada volta para a bandeja e a rodada continua', async ({ page }) => {
  // Peça errada, intruso e significados só saem do que já foi visto: aqui, todos os kanji.
  await firmarCartas(page, chavesDasPecas());
  await abrir(page);
  await comecar(page, '2');
  if (await page.getByTestId('pc-licao').isVisible()) await page.keyboard.press('Enter');
  await expect(page.getByTestId('pc-bandeja')).toBeVisible();
  const errada = await page.locator('[data-testid="pc-opcao"]').evaluateAll((els) => els.findIndex((e) => e.getAttribute('data-ok') === 'no'));
  await page.keyboard.press(String(errada + 1));
  await expect(page.getByTestId('pc-aviso')).toContainText('não está neste kanji');
  await expect(page.getByTestId('pc-revela')).toHaveCount(0);
});

test('Esc sai da rodada para o menu e do menu para o fliperama', async ({ page }) => {
  await abrir(page);
  await comecar(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pc-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-now')).toBeVisible();
});

test('em tela baixa, a explicação rola para dentro da tela depois da resposta', async ({ page }) => {
  // Peça errada, intruso e significados só saem do que já foi visto: aqui, todos os kanji.
  await firmarCartas(page, chavesDasPecas());
  await page.setViewportSize({ width: 800, height: 560 });
  await abrir(page);
  await comecar(page, '4');
  if (await page.getByTestId('pc-licao').isVisible()) await passarApresentacao(page);
  const i = await certa(page);
  await page.keyboard.press(String(((i + 1) % 4) + 1));
  await expect(page.getByTestId('pc-seguir')).toBeInViewport();
});
