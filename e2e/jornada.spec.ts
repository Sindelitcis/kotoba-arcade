import { expect, test } from '@playwright/test';

const SHOTS = process.env.SHOTS_DIR;

test.beforeEach(async ({ page }) => {
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.route('http://127.0.0.1:8791/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByTestId('play-now')).toBeVisible();
});

test('J abre a Jornada, Enter começa a lição sugerida e o fim volta com a missão feita', async ({ page }) => {
  await expect(page.getByTestId('hub-jornada')).toBeVisible();
  await page.keyboard.press('j');
  await expect(page.getByTestId('jn-proxima')).toContainText('Lição em quadrinhos');
  await expect(page.getByTestId('jn-etapa-n3')).toContainText('Ainda sem conteúdo');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/jornada-mapa.png` });

  await page.keyboard.press('Enter');
  const quadro = page.getByTestId('lc-quadro');
  await expect(quadro).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/jornada-licao.png` });

  // Segue a lição até o fim: quadro avança com Enter, pergunta com o número 1.
  for (let i = 0; i < 80; i++) {
    // A lição acabou: a Jornada volta aberta na etapa da missão.
    if (await page.getByTestId('jn-missao').first().isVisible()) break;
    if ((await page.getByTestId('lc-opcao').count()) > 0 && (await page.getByTestId('lc-opcao').first().isEnabled())) {
      await page.keyboard.press('1');
      await expect(page.getByTestId('lc-opcao').first()).toBeDisabled();
    } else if ((await page.getByTestId('lc-bloco').count()) > 0 && !(await page.getByTestId('lc-seguir').isEnabled())) {
      await page.keyboard.press('1');
    }
    await page.keyboard.press('Enter');
  }
  await expect(page.getByTestId('jn-missao').first()).toContainText('feita 1×');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('jn-etapa-fundamentos')).toContainText('1 de 4 missões');
});

test('missão de jogo abre o jogo recortado e a saída volta para a Jornada', async ({ page }) => {
  await page.keyboard.press('j');
  await page.keyboard.press('2');
  const missoes = page.getByTestId('jn-missao');
  // Ensinar antes de cobrar, entre os jogos: o kana com imagem vem antes do Kana Beat.
  await expect(missoes.nth(0)).toContainText('Kana em imagens');
  await expect(missoes.nth(1)).toContainText('Kana Beat');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('.kb-track, [data-testid="kb-apresenta"]').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('jn-missao').nth(1)).toContainText('feita 1×');
});

test('missão de katakana no Kana em imagens apresenta katakana, não o あ', async ({ page }) => {
  await page.keyboard.press('j');
  await page.keyboard.press('2');
  const missoes = page.getByTestId('jn-missao');
  await expect(missoes.nth(3)).toContainText('Kana em imagens: katakana');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('ki-menu')).toBeVisible();
  await page.keyboard.press('Enter');
  const cartao = page.getByTestId('apresentacao');
  await expect(page.getByTestId('ki-apresenta')).toBeVisible();
  await expect(cartao.locator('svg[data-kana="ア"]')).toBeVisible();
  await expect(cartao.locator('svg[data-kana="あ"]')).toHaveCount(0);
});

test('as primeiras palavras: a Cena Viva da missão abre no lugar dela, apresentando as coisas', async ({ page }) => {
  await page.keyboard.press('j');
  await page.keyboard.press('2');
  const missoes = page.getByTestId('jn-missao');
  await expect(missoes.nth(5)).toContainText('Cena Viva: o nome das coisas');
  await expect(missoes.nth(6)).toContainText('Memória');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('apresentacao')).toBeVisible();
  await expect(page.getByTestId('cn-progresso')).toContainText('コンビニ');
});

test('Esc na lição volta para a Jornada sem contar a missão', async ({ page }) => {
  await page.keyboard.press('j');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('lc-quadro')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('jn-missao').first()).not.toContainText('feita');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('jn-etapa-fundamentos')).toContainText('0 de 4 missões');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-now')).toBeVisible();
});
