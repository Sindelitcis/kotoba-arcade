import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // As artes vêm de outro site; nos testes ficam de fora para não depender de rede.
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.goto('/');
});

/** Entra na caçada pelo botão grande (o atalho Enter tem teste próprio). */
async function startHunt(page: Page) {
  await page.getByTestId('play-now').click();
  await expect(page.getByTestId('enemy-kanji')).toBeVisible();
}

/** Responde certo e fecha avisos até aparecer o aviso com o título pedido. */
async function playUntilOverlay(page: Page, title: string) {
  for (let i = 0; i < 200; i++) {
    const heading = page.locator('.overlay h2');
    if (await heading.isVisible()) {
      if ((await heading.innerText()) === title) return;
      await page.keyboard.press('Enter');
      await page.waitForTimeout(120);
      continue;
    }
    const right = page.locator('[data-answer="yes"]:not(.right)');
    if (await right.isVisible()) await right.click();
    await page.waitForTimeout(120);
  }
  throw new Error(`não chegou em "${title}"`);
}

test('do fliperama para a caçada com uma tecla, e a primeira carta ensina antes de perguntar', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Kotoba Arcade' })).toBeVisible();
  await expect(async () => {
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('enemy-kanji')).toHaveText('一', { timeout: 500 });
  }).toPass();
  await expect(page.getByTestId('teach')).toContainText('一 = um');
  await expect(page.getByTestId('hearts').locator('.heart.on')).toHaveCount(5);
});

test('acertar quebra os selos, captura a carta e paga moedas', async ({ page }) => {
  await startHunt(page);
  await playUntilOverlay(page, 'Capturado!');
  await expect(page.locator('.overlay')).toContainText('carta nova');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('coins')).not.toHaveText('0');
  await expect(page.getByTestId('kanji-seen')).toHaveText('1');
});

test('acertar com o mouse em cima da resposta ainda mostra o vermelho do acerto e carimba ドン', async ({ page }) => {
  // O hover dos botões ganhava do estilo de acerto e a resposta certa ficava sem cor nenhuma.
  await startHunt(page);
  await page.locator('[data-answer="yes"]').click();
  await expect(page.locator('.choice.right')).toHaveCSS('background-color', 'rgb(215, 38, 30)');
  await expect(page.locator('.onomato')).toHaveText(/ドン|ズバッ/);
});

test('errar tira um coração e mostra a resposta certa', async ({ page }) => {
  await startHunt(page);
  await page.locator('.choice:not([data-answer])').first().click();
  await expect(page.getByTestId('hearts').locator('.heart.on')).toHaveCount(4);
  await expect(page.locator('.echo')).toContainText('Era: um');
});

test('teclas 1 a 4 respondem', async ({ page }) => {
  await startHunt(page);
  const index = await page.locator('.choice').evaluateAll((els) => els.findIndex((e) => e.getAttribute('data-answer') === 'yes'));
  await page.keyboard.press(String(index + 1));
  await expect(page.locator('.choice.right')).toHaveCount(1);
  await expect(page.getByTestId('hearts').locator('.heart.on')).toHaveCount(5);
});

test('o progresso continua depois de recarregar a página', async ({ page }) => {
  await startHunt(page);
  await playUntilOverlay(page, 'Capturado!');
  await page.reload();
  await expect(page.getByTestId('kanji-seen')).toHaveText('1');
  await page.keyboard.press('d');
  await expect(page.locator('.dex-tile:not(.unseen)')).toHaveCount(1);
});

test('baú a cada 5 capturas, e Esc no baú volta ao fliperama', async ({ page }) => {
  await startHunt(page);
  await playUntilOverlay(page, 'Baú!');
  await expect(page.locator('.summary')).toContainText('capturas');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-now')).toBeVisible();
});

test('booster fica bloqueado até encontrar 3 kanji', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Booster/ })).toBeDisabled();
  await page.waitForTimeout(300);
  await page.keyboard.press('b');
  await expect(page.getByTestId('play-now')).toBeVisible();
});

test('ajustes: exportar gera um arquivo de backup', async ({ page }) => {
  await page.getByRole('button', { name: 'Ajustes' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar backup' }).click();
  expect((await download).suggestedFilename()).toMatch(/^kotoba-arcade-save-\d{4}-\d{2}-\d{2}\.json$/);
});

test('com o IME japonês ligado, o número ainda escolhe a alternativa e o Esc da conversão não tira da caçada', async ({ page }) => {
  // Com o IME em hiragana o Chrome manda key "Process" (229) e os números não respondiam.
  await startHunt(page);
  await page.evaluate(() => {
    const e = new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true });
    dispatchEvent(e);
  });
  await expect(page.getByTestId('enemy-kanji')).toBeVisible();
  await page.evaluate(() => {
    const e = new KeyboardEvent('keydown', { key: 'Process', code: 'Digit1', bubbles: true });
    Object.defineProperty(e, 'keyCode', { value: 229 });
    dispatchEvent(e);
  });
  await expect(page.locator('.choice.right, .choice.wrong').first()).toBeVisible();
});
