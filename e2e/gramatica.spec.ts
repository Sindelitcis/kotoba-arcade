import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.goto('/');
});

/** Do fliperama para o menu do Kumitate pela tecla G. Repete se a tecla chegar antes de a tela estar pronta. */
async function openGame(page: Page) {
  await expect(async () => {
    if (await page.getByTestId('play-now').isVisible()) await page.keyboard.press('g');
    await expect(page.getByTestId('gr-menu')).toBeVisible({ timeout: 500 });
  }).toPass();
}

async function startRound(page: Page) {
  await expect(async () => {
    if (await page.getByTestId('gr-menu').isVisible()) await page.keyboard.press('Enter');
    await expect(page.getByTestId('gr-progress')).toContainText('Frase 1', { timeout: 500 });
  }).toPass();
}

/** Monta a frase da vez, sempre com a peça certa, e segue para a próxima. */
async function solveSentence(page: Page) {
  if (await page.getByTestId('gr-lesson').isVisible()) await page.keyboard.press('Enter');
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('gr-done').isVisible()) break;
    await page.locator('.gr-block[data-ok="yes"]').first().click();
  }
  await expect(page.getByTestId('gr-done')).toBeVisible();
  await page.keyboard.press('Enter');
}

test('do fliperama à primeira peça só no teclado: lição primeiro, depois a peça certa brilha', async ({ page }) => {
  await openGame(page);
  await startRound(page);
  await expect(page.getByTestId('gr-lesson')).toContainText('は: o assunto da frase');
  await expect(page.locator('.gr-example .mark')).toHaveText('は');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('gr-board')).toBeVisible();
  await expect(page.getByTestId('gr-goal')).not.toBeEmpty();
  await expect(page.locator('.gr-block.hint')).toHaveText(/は/);
  const ok = await page.locator('.gr-block').evaluateAll((els) => els.findIndex((e) => e.getAttribute('data-ok') === 'yes'));
  await page.keyboard.press(String(ok + 1));
  await expect(page.getByTestId('gr-done')).toBeVisible();
  await expect(page.locator('.gr-slot.filled')).toHaveText(/は/);
  // A peça que fecha a frase carimba só o ピカッ: as duas onomatopeias juntas tapavam a frase.
  await expect(page.locator('.onomato')).toHaveCount(1);
  await expect(page.locator('.onomato')).toHaveText('ピカッ');
});

test('peça que não serve volta com o porquê, sem tela de erro', async ({ page }) => {
  await openGame(page);
  await startRound(page);
  await page.keyboard.press('Enter');
  const bad = await page.locator('.gr-block').evaluateAll((els) => els.findIndex((e) => e.getAttribute('data-ok') === 'no'));
  expect(bad).toBeGreaterThanOrEqual(0);
  await page.keyboard.press(String(bad + 1));
  await expect(page.getByTestId('gr-why')).toContainText('não encaixa aqui');
  await expect(page.getByTestId('gr-why')).toContainText('vai は');
  await expect(page.locator('.gr-block.tried')).toHaveCount(1);
  await expect(page.getByTestId('gr-board')).toBeVisible();
  await expect(page.getByTestId('gr-done')).toHaveCount(0);
  await page.locator('.gr-block[data-ok="yes"]').click();
  await expect(page.getByTestId('gr-done')).toBeVisible();
  await expect(page.getByTestId('gr-why')).toHaveCount(0);
});

test('uma rodada inteira termina no resumo, destrava の e o progresso fica salvo', async ({ page }) => {
  await openGame(page);
  await startRound(page);
  for (let i = 0; i < 6; i++) await solveSentence(page);
  await expect(page.getByTestId('gr-summary')).toContainText('Rodada concluída');
  await expect(page.getByTestId('gr-summary')).toContainText('は: o assunto da frase');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('gr-menu')).toBeVisible();
  await expect(page.locator('.gr-point[data-point="no"]')).not.toHaveClass(/locked/);
  await expect(page.getByTestId('gr-start')).toContainText('Nova rodada');

  await page.reload();
  await expect(page.getByTestId('coins')).not.toHaveText('0');
  await expect(page.getByTestId('play-now')).toContainText('Kumitate');
  await openGame(page);
  await expect(page.locator('.gr-point[data-point="wa"] .gr-stars')).toBeVisible();
  await expect(page.locator('.gr-point[data-point="no"]')).not.toHaveClass(/locked/);
});

test('sair no meio da rodada volta ao menu e Esc volta ao fliperama', async ({ page }) => {
  await openGame(page);
  await startRound(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('gr-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-now')).toBeVisible();
});
