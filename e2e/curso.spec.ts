import { passarApresentacao } from './apoio';
import { expect, test, type Page } from './base';

const SHOTS = process.env.SHOTS_DIR;
const SAVE_KEY = 'kotoba-arcade:save';

test.beforeEach(async ({ page }) => {
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.route('http://127.0.0.1:8791/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByTestId('hub-curso')).toBeVisible();
});

/** Responde a prática até o bloco acabar: a certa, menos na primeira pergunta, que erra de propósito. */
async function praticar(page: Page, errarPrimeira: boolean): Promise<void> {
  let errou = !errarPrimeira;
  for (let volta = 0; volta < 40; volta++) {
    if (await page.getByTestId('cs-intervalo').isVisible()) return;
    // Errou: o cartão volta ("Olhe de novo") antes da próxima pergunta.
    if (await page.getByTestId('apresentacao').isVisible()) {
      await expect(page.getByTestId('apresentacao')).toHaveAttribute('data-modo', 'de-novo');
      await passarApresentacao(page);
      continue;
    }
    const pergunta = page.getByTestId('cs-pergunta');
    await expect(pergunta).toBeVisible();
    const opcoes = page.getByTestId('cs-opcao');
    const n = await opcoes.count();
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(3);
    const certas = await opcoes.evaluateAll((els) => els.map((e) => e.hasAttribute('data-certa')));
    let i = certas.indexOf(true);
    if (!errou) {
      i = certas.indexOf(false);
      errou = true;
    }
    await page.keyboard.press(String(i + 1));
    // A resposta fica na tela até a pessoa seguir.
    await expect(page.getByTestId('cs-retorno')).toBeVisible();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('cs-retorno')).toBeVisible();
    await page.keyboard.press('Enter');
  }
  throw new Error('a prática não terminou');
}

test('Enter na tela inicial continua o curso: objetivo, palavras, prática, e o progresso fica salvo', async ({ page }) => {
  await expect(page.getByTestId('hub-curso')).toContainText('Unidade 1');
  await expect(page.getByTestId('hub-curso')).toContainText('Parte 1 de');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-hub.png` });

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cs-objetivo')).toContainText('me apresentar');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-objetivo.png` });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cs-intervalo')).toBeVisible();
  await page.keyboard.press('Enter');

  // Bloco de palavras: a apresentação vem antes de qualquer pergunta.
  await expect(page.getByTestId('cs-parte')).toContainText('Vocabulário');
  await expect(page.getByTestId('cs-pergunta')).toHaveCount(0);
  const total = await passarApresentacao(page);
  expect(total).toBeGreaterThanOrEqual(3);
  expect(total).toBeLessThanOrEqual(5);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-pratica.png` });
  await praticar(page, true);
  await expect(page.getByTestId('cs-intervalo')).toContainText('Parte 2 de');

  // Parar aqui e voltar: o curso continua da parte 3.
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('hub-curso')).toContainText('Parte 3 de');
  await page.reload();
  await expect(page.getByTestId('hub-curso')).toContainText('Parte 3 de');

  // A parte 3 é o kanji das palavras que acabaram de entrar, com a leitura usada nelas.
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cs-parte')).toContainText('Kanji');
  const cartao = page.getByTestId('apresentacao');
  await expect(cartao).toContainText('se lê');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-kanji.png` });
  await passarApresentacao(page);
  await praticar(page, false);
});

test('a unidade 2 só libera depois da 1; com a 1 feita, ela abre', async ({ page }) => {
  await page.keyboard.press('u');
  const u2 = page.locator('[data-testid="cs-unidade"][data-unidade="a1-02"]');
  await expect(u2).toBeDisabled();
  await expect(u2).toContainText('Libera depois da unidade 1');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-mapa.png` });

  await page.evaluate((chave) => {
    const save = JSON.parse(localStorage.getItem(chave) ?? '{}');
    save.games ??= {};
    save.games.curso = { feitos: { 'a1-01': 99 }, concluidas: { 'a1-01': 1 } };
    localStorage.setItem(chave, JSON.stringify(save));
  }, SAVE_KEY);
  await page.reload();
  await expect(page.getByTestId('hub-curso')).toContainText('Unidade 2');
  await page.keyboard.press('u');
  await expect(u2).toBeEnabled();
  await expect(page.locator('[data-testid="cs-unidade"][data-unidade="a1-03"]')).toBeDisabled();
  await expect(page.locator('[data-testid="cs-unidade"][data-unidade="a1-01"]')).toContainText('Feita');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cs-objetivo')).toContainText('números');
});

test('os jogos continuam no fliperama: Jogar agora abre o KanjiMon', async ({ page }) => {
  await page.getByTestId('play-now').click();
  await expect(page.getByTestId('apresentacao')).toBeVisible();
});
