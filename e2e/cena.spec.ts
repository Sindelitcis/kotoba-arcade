import { expect, test, type Page } from './base';
import { passarApresentacao, seApresentar } from './apoio';

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
  await seApresentar(page);
  await seApresentar(page);
  await expect(page.getByTestId('cn-pedido')).toBeVisible();
  for (let i = 0; i < 12 && !(await page.getByTestId('cn-seguir').isVisible()); i++) {
    if (await page.getByTestId('apresentacao').isVisible()) await passarApresentacao(page);
    else if (await page.getByTestId('cn-opcoes').isVisible()) await page.locator('.cn-opcoes [data-certa="sim"]').click();
    else if (await page.getByTestId('cn-bandeja').isVisible()) {
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

test('do fliperama ao primeiro acerto: as coisas da cena primeiro, depois これは〜です com apoio, e só então a pergunta', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('.cn-lugares li')).toHaveCount(8);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cena-menu.png` });
  await page.keyboard.press('Enter');
  // As coisas da cena, uma a uma, com a coisa brilhando na cena.
  await expect(page.getByTestId('apresentacao')).toBeVisible();
  await expect(page.getByTestId('cn-cena')).toBeVisible();
  await expect(page.getByTestId('cn-pedido')).toHaveCount(0);
  await expect(page.locator('.cn-coisa.brilha').first()).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cena-apresentacao.png` });
  const n = await passarApresentacao(page);
  expect(n).toBeGreaterThanOrEqual(3);
  expect(n).toBeLessThanOrEqual(5);
  // Primeira etapa: só o nome das coisas.
  await expect(page.getByTestId('cn-licao')).toContainText('これは');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cena-licao.png` });
  await passarApresentacao(page);
  await expect(page.getByTestId('cn-frase')).toContainText('これはなんですか');
  await expect(page.getByTestId('cn-frase')).not.toContainText('どこ');
  await expect(page.getByTestId('cn-pratica')).toBeVisible();
  await expect(page.locator('.cn-opcoes .gr-block')).toHaveCount(2);
  // A coisa do "isto" brilha na cena.
  await expect(page.locator('.cn-coisa.brilha')).toHaveCount(1);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cena-pedido.png` });
  await page.locator('.cn-opcoes [data-certa="sim"]').click();
  await expect(page.getByTestId('cn-seguir')).toBeVisible();
  await expect(page.getByTestId('cn-frase')).toContainText('です');
});

test('na prática, errar o nome não tira pontos nem combo: a palavra aparece de novo e sobra a opção certa', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Enter');
  await passarApresentacao(page);
  await passarApresentacao(page);
  const pontos = await page.getByTestId('cn-progresso').innerText();
  const errada = await page.locator('.cn-opcoes .gr-block:not([data-certa]) kbd').innerText();
  await page.keyboard.press(errada);
  await expect(page.getByTestId('apresentacao')).toHaveAttribute('data-modo', 'de-novo');
  await passarApresentacao(page);
  await expect(page.getByTestId('cn-progresso')).toHaveText(pontos);
  await expect(page.locator('.cn-opcoes .gr-block')).toHaveCount(1);
  await page.keyboard.press('1');
  await expect(page.getByTestId('cn-seguir')).toBeVisible();
});

/** Deixa a etapa "onde está" aberta e sem lição vista: o primeiro pedido é dela. */
async function abrirAchar(page: Page) {
  await abrir(page);
  await page.keyboard.press('Enter');
  await passarApresentacao(page);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const chave = 'kotoba-arcade:save';
    const save = JSON.parse(localStorage.getItem(chave) as string);
    save.games.cena = { ...save.games.cena, etapas: 2, licoes: ['nome'] };
    localStorage.setItem(chave, JSON.stringify(save));
  });
  await page.reload();
  await abrir(page);
  await page.keyboard.press('Enter');
  await seApresentar(page);
  await expect(page.getByTestId('cn-licao')).toBeVisible();
  await passarApresentacao(page);
}

test('só no teclado: as setas andam pela cena e Enter escolhe; engano na prática mostra a palavra de novo, sem tela de erro', async ({ page }) => {
  await abrirAchar(page);
  await expect(page.getByTestId('cn-frase')).toContainText('どこ');
  await expect(page.getByTestId('cn-pedido')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.cn-coisa.cursor')).toHaveCount(1);
  // Anda até uma coisa que dá para escolher (na prática, só as já apresentadas) e que não é a pedida.
  const ruim = () => page.locator('.cn-coisa.cursor[data-alvo], .cn-coisa.cursor.apagada').count();
  for (let i = 0; i < 60 && (await ruim()); i++) await page.keyboard.press('ArrowRight');
  expect(await ruim()).toBe(0);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('apresentacao')).toHaveAttribute('data-modo', 'de-novo');
  await passarApresentacao(page);
  await expect(page.getByTestId('cn-pedido')).toBeVisible();
  await expect(page.getByTestId('cn-seguir')).toHaveCount(0);
  await expect(page.locator('.cn-coisa.brilha').first()).toBeVisible();
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
  // As coisas apresentadas e Esc: o save passa a existir.
  await abrir(page);
  await page.keyboard.press('Enter');
  await passarApresentacao(page);
  await page.keyboard.press('Escape');
  // Todas as etapas abertas e só "descrever" sem lição: o primeiro pedido é dela.
  await page.evaluate(() => {
    const chave = 'kotoba-arcade:save';
    const save = JSON.parse(localStorage.getItem(chave) as string);
    save.games.cena = { etapas: 9, ordem: 1, acertos: {}, licoes: ['nome', 'achar', 'cor', 'tamanho', 'lugar', 'contar', 'acao', 'denso'], lugares: {}, rounds: 1, best: 0 };
    localStorage.setItem(chave, JSON.stringify(save));
  });
  await page.reload();
  await abrir(page);
  await page.keyboard.press('Enter');
  await seApresentar(page);
  await expect(page.getByTestId('cn-licao')).toContainText('Monte a frase sobre a coisa marcada');
  await passarApresentacao(page);
  await expect(page.getByTestId('cn-bandeja')).toBeVisible();
  await expect(page.locator('.cn-coisa.marcada')).toHaveCount(1);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cena-montar.png` });
  // Duas peças erradas (ou não) e a certa passa a brilhar: segue a dica até fechar.
  for (let i = 0; i < 30 && !(await page.getByTestId('cn-seguir').isVisible()); i++) {
    // Na prática, peça errada mostra a palavra de novo antes de voltar às peças.
    if (await page.getByTestId('apresentacao').isVisible()) {
      await passarApresentacao(page);
      continue;
    }
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
  await expect(page.getByTestId('apresentacao')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await passarApresentacao(page);
  await passarApresentacao(page);
  await expect(page.getByTestId('cn-cena')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cena-celular.png`, fullPage: true });
});
