import { expect, test, type Page } from '@playwright/test';

const SHOTS = process.env.SHOTS_DIR;

test.beforeEach(async ({ page }) => {
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByTestId('play-now')).toBeVisible();
});

async function abrir(page: Page) {
  await expect(async () => {
    if (await page.getByTestId('play-now').isVisible()) await page.keyboard.press('l');
    await expect(page.getByTestId('cn-menu')).toBeVisible({ timeout: 500 });
  }).toPass();
}

/** Responde o pedido da vez: clica no que brilha, ou monta a frase com a peça que brilha. */
async function responder(page: Page) {
  if (await page.getByTestId('cn-licao').isVisible()) await page.keyboard.press('Enter');
  await expect(page.getByTestId('cn-pedido')).toBeVisible();
  for (let i = 0; i < 12 && !(await page.getByTestId('cn-seguir').isVisible()); i++) {
    if (await page.getByTestId('cn-bandeja').isVisible()) {
      // Duas peças erradas fazem a certa brilhar: a primeira serve de treino de engano.
      const dica = page.locator('.cn-bandeja .gr-block.hint');
      if (await dica.count()) await dica.click();
      else await page.locator('.cn-bandeja .gr-block').first().click();
    } else {
      const brilha = page.locator('.cn-coisa.brilha');
      if (await brilha.count()) await brilha.first().click({ force: true });
      else await page.locator('.cn-coisa:not(.tentada)').first().click({ force: true });
    }
  }
  await expect(page.getByTestId('cn-seguir')).toBeVisible();
  await page.keyboard.press('Enter');
}

test('do fliperama ao primeiro acerto: lição, pedido em japonês e a palavra nova brilhando', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('.cn-lugares li')).toHaveCount(8);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cena-menu.png` });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cn-licao')).toContainText('Ache o objeto');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cena-licao.png` });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cn-frase')).toContainText('どこ');
  await expect(page.locator('.cn-coisa.brilha').first()).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cena-pedido.png` });
  await page.locator('.cn-coisa.brilha').first().click({ force: true });
  await expect(page.getByTestId('cn-seguir')).toBeVisible();
  await expect(page.locator('.cn-coisa.certa').first()).toBeVisible();
});

test('só no teclado: as setas andam pela cena e Enter escolhe; clique errado diz o nome, sem tela de erro', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cn-pedido')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.cn-coisa.cursor')).toHaveCount(1);
  // Anda até uma coisa que não é a pedida e aperta Enter.
  for (let i = 0; i < 30 && (await page.locator('.cn-coisa.cursor.brilha').count()); i++) await page.keyboard.press('ArrowRight');
  const errada = await page.locator('.cn-coisa.cursor').getAttribute('data-coisa');
  await page.keyboard.press('Enter');
  await expect(page.locator(`[data-coisa="${errada}"] .cn-nome`)).toBeVisible();
  await expect(page.getByTestId('cn-pedido')).toBeVisible();
  await expect(page.getByTestId('cn-seguir')).toHaveCount(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cena-engano.png` });
});

test('rodada inteira de oito pedidos termina no resumo e o lugar conta como jogado', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Enter');
  for (let i = 0; i < 8; i++) await responder(page);
  await expect(page.getByTestId('cn-resumo')).toContainText('Rodada concluída');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cena-resumo.png` });
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('cn-menu')).toBeVisible();
  await expect(page.getByTestId('cn-start')).toContainText('Nova rodada');
  await expect(page.locator('.cn-lugares li').first()).toContainText('1×');
});

test('etapa de montar a frase: lição primeiro, peças em kana, a frase cresce e fecha com o verbo', async ({ page }) => {
  // Um acerto e Esc: o save passa a existir.
  await abrir(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.locator('.cn-coisa.brilha').first().click({ force: true });
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('cn-resumo')).toBeVisible();
  // Todas as etapas abertas e só "descrever" sem lição: o primeiro pedido é dela.
  await page.evaluate(() => {
    const chave = 'kotoba-arcade:save';
    const save = JSON.parse(localStorage.getItem(chave) as string);
    save.games.cena = { etapas: 8, acertos: {}, licoes: ['achar', 'cor', 'tamanho', 'lugar', 'contar', 'acao', 'denso'], lugares: {}, rounds: 1, best: 0 };
    localStorage.setItem(chave, JSON.stringify(save));
  });
  await page.reload();
  await abrir(page);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cn-licao')).toContainText('Descreva a cena');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cn-bandeja')).toBeVisible();
  await expect(page.locator('.cn-coisa.marcada')).toHaveCount(1);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cena-montar.png` });
  // Duas peças erradas (ou não) e a certa passa a brilhar: segue a dica até fechar.
  for (let i = 0; i < 30 && !(await page.getByTestId('cn-seguir').isVisible()); i++) {
    const dica = page.locator('.cn-bandeja .gr-block.hint');
    if (await dica.count()) await dica.click();
    else await page.keyboard.press('1');
  }
  await expect(page.getByTestId('cn-montada')).toContainText(/(あり|い)ます/);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cena-montada.png` });
});

test('no celular, a cena cabe na tela sem rolar para o lado', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await abrir(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cn-cena')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cena-celular.png`, fullPage: true });
});
