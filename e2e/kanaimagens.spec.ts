import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.goto('/');
});

/** Do fliperama ao menu pela tecla I. */
async function abrir(page: Page) {
  await expect(page.getByTestId('play-now')).toBeVisible();
  await page.keyboard.press('i');
  await expect(page.getByTestId('ki-menu')).toBeVisible();
}

test('do fliperama à primeira resposta só no teclado: apresentação antes da pergunta', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Enter');
  const quadro = page.getByTestId('ki-quadro');
  await expect(quadro).toHaveAttribute('data-modo', 'apresenta');
  await expect(page.getByTestId('ki-licao')).toContainText('あ');
  await expect(page.getByTestId('ki-licao')).toContainText('dentista');
  await expect(page.locator('.ki-licao svg[data-kana="あ"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/kanaimagens-apresentacao.png' });
  // Três kana novos, um de cada vez.
  for (let i = 0; i < 3; i++) {
    await expect(quadro).toHaveAttribute('data-modo', 'apresenta');
    await page.keyboard.press('Enter');
  }
  // Depois de apresentado, é cobrado com a imagem por perto (sem a letra).
  await expect(quadro).toHaveAttribute('data-modo', 'imagem-letra');
  await expect(page.locator('.ki-grande[data-kana="あ"]')).toBeVisible();
  const certa = await page.locator('.ki-opcao').evaluateAll((els) => els.findIndex((e) => e.getAttribute('data-certa') === 'sim'));
  await page.keyboard.press(String(certa + 1));
  await expect(page.locator('.ki-opcao.certa')).toContainText('あ');
  // Acertou: a próxima vem sozinha.
  await expect(page.locator('.ki-grande[data-kana="い"]')).toBeVisible();
});

test('erro não abre tela de erro: a certa aparece com a imagem e Enter segue', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Enter');
  for (let i = 0; i < 3; i++) await page.keyboard.press('Enter');
  const certa = await page.locator('.ki-opcao').evaluateAll((els) => els.findIndex((e) => e.getAttribute('data-certa') === 'sim'));
  await page.keyboard.press(String(((certa + 1) % 4) + 1));
  await expect(page.locator('.ki-opcao.errada')).toBeVisible();
  await expect(page.getByTestId('ki-volta')).toContainText('volta daqui a pouco');
  await expect(page.getByTestId('ki-quadro')).toBeVisible();
  await page.screenshot({ path: 'test-results/kanaimagens-erro.png' });
  await page.keyboard.press('Enter');
  await expect(page.locator('.ki-opcao.errada')).toHaveCount(0);
});

test('teste rápido: quem já lê pula para a leitura relâmpago', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('t');
  await expect(page.getByTestId('ki-teste')).toBeVisible();
  for (let n = 0; n < 40; n++) {
    if (await page.getByTestId('ki-teste-fim').isVisible()) break;
    const certa = await page.locator('.ki-opcao').evaluateAll((els) => els.findIndex((e) => e.getAttribute('data-certa') === 'sim'));
    await page.keyboard.press(String(certa + 1));
    await expect(page.locator('.ki-opcao.certa')).toBeVisible();
    await page.keyboard.press('Enter');
  }
  await expect(page.getByTestId('ki-teste-fim')).toContainText('Passou em tudo');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('ki-menu')).toBeVisible();
  await expect(page.locator('.ki-modo[data-modo="relampago"]')).toBeEnabled();
  await page.screenshot({ path: 'test-results/kanaimagens-menu.png', fullPage: true });
  await page.keyboard.press('6');
  await expect(page.getByTestId('ki-quadro')).toHaveAttribute('data-modo', 'relampago');
  await expect(page.getByTestId('ki-palavra')).not.toBeEmpty();
  await page.screenshot({ path: 'test-results/kanaimagens-relampago.png' });
  await page.keyboard.press('Escape');
  await page.keyboard.press('3');
  await expect(page.getByTestId('ki-quadro')).toHaveAttribute('data-modo', 'letra-imagem');
  await expect(page.locator('.ki-opcoes.imagens svg')).toHaveCount(4);
  await page.screenshot({ path: 'test-results/kanaimagens-letra-imagem.png' });
});

test('o tile aparece no fliperama e Esc volta para lá', async ({ page }) => {
  await expect(page.getByTestId('tile-kanaimagens')).toContainText('Kana em imagens');
  await abrir(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-now')).toBeVisible();
});
