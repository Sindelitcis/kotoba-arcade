import { expect, test, type Page } from '@playwright/test';
import { passarApresentacao } from './apoio';

test.beforeEach(async ({ page }) => {
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.goto('/');
});

async function openGame(page: Page) {
  await page.locator('.tiles .tile', { hasText: 'Aventura' }).click();
  await expect(page.getByTestId('av-menu')).toBeVisible();
}

/**
 * Enter na lista de cenas abre a cena da vez (repete se a tecla chegar antes de a tela estar pronta).
 * Palavra nova da cena é apresentada antes da primeira fala; devolve quantas foram.
 */
async function startScene(page: Page): Promise<number> {
  await expect(async () => {
    if (await page.getByTestId('av-menu').isVisible()) await page.keyboard.press('Enter');
    await expect(page.getByTestId('av-stage').or(page.getByTestId('av-apresenta'))).toBeVisible({ timeout: 500 });
  }).toPass();
  const n = (await page.getByTestId('av-apresenta').isVisible()) ? await passarApresentacao(page) : 0;
  await expect(page.getByTestId('av-stage')).toBeVisible();
  return n;
}

/** Segue a conversa até aparecer uma escolha. */
async function toChoice(page: Page) {
  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId('av-options').isVisible()) return;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(40);
  }
  throw new Error('não chegou numa escolha');
}

/** Joga a cena aberta até o resumo, sempre com a resposta que faz a conversa andar. */
async function playScene(page: Page) {
  for (let i = 0; i < 300; i++) {
    if (await page.getByTestId('av-summary').isVisible()) return;
    const ok = page.locator('.av-option[data-result="ok"]:not(.tried)').first();
    if (await ok.isVisible()) await ok.click();
    else await page.keyboard.press('Enter');
    await page.waitForTimeout(40);
  }
  throw new Error('a cena não terminou');
}

test('do fliperama para a primeira fala só no teclado, e palavra nova já vem com o significado', async ({ page }) => {
  await expect(async () => {
    await page.keyboard.press('a');
    await expect(page.getByTestId('av-menu')).toBeVisible({ timeout: 500 });
  }).toPass();
  // Jogador novo: as palavras novas da cena (até 5) vêm antes da primeira fala.
  const n = await startScene(page);
  expect(n).toBeGreaterThanOrEqual(3);
  expect(n).toBeLessThanOrEqual(5);
  await expect(page.getByTestId('av-narra')).toContainText('Narita');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('av-who')).toHaveText('Fiscal da imigração');
  await expect(page.getByTestId('av-line')).toContainText('どうぞ');
  await expect(page.getByTestId('av-glosses').first()).toContainText('próximo');
  // A tradução da frase inteira só aparece quando pedida.
  await expect(page.getByTestId('av-pt')).toHaveCount(0);
  await page.keyboard.press('s');
  await expect(page.getByTestId('av-pt')).toHaveText('Próximo, por favor.');
});

test('resposta que não faz sentido não dá tela de erro: a pessoa estranha e a conversa volta', async ({ page }) => {
  await openGame(page);
  await startScene(page);
  await toChoice(page);
  await expect(page.getByTestId('av-line')).toContainText('パスポート');
  const odd = await page.locator('.av-option').evaluateAll((els) => els.findIndex((e) => e.getAttribute('data-result') === 'odd'));
  await page.keyboard.press(String(odd + 1));
  await expect(page.getByTestId('av-who')).toHaveText('Você');
  await expect(page.getByTestId('av-line')).toHaveText('いただきます。');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('av-who')).toHaveText('Fiscal da imigração');
  await expect(page.getByTestId('av-line')).toContainText('じゃ ありませんよ');
  await page.keyboard.press('Enter');
  await expect(page.locator('.av-option.tried')).toHaveCount(1);
  await expect(page.locator('.av-option.tried')).toContainText('いただきます');
  await expect(page.locator('.overlay')).toHaveCount(0);
  // Enter em cima da escolha não pula a pergunta.
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('av-options')).toBeVisible();
});

test('as três cenas se jogam em sequência e o progresso fica salvo', async ({ page }) => {
  await openGame(page);
  await expect(page.locator('.av-scenes .tile:disabled')).toHaveCount(2);
  await startScene(page);

  await playScene(page);
  await expect(page.getByTestId('av-summary')).toContainText('Chegada');
  await expect(page.getByTestId('av-summary')).toContainText('Você passou a entender');
  await expect(page.locator('.av-words li').first()).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page.locator('.av-place')).toContainText('O trem para Tóquio');
  await toChoice(page);
  // Na segunda cena entram kanji, com a leitura em cima.
  await expect(page.locator('.av-option-jp rt', { hasText: 'とうきょう' }).first()).toBeVisible();
  await playScene(page);
  await expect(page.getByTestId('av-summary')).toContainText('O trem para Tóquio');

  await page.keyboard.press('Enter');
  await expect(page.locator('.av-place')).toContainText('Primeira compra');
  await playScene(page);
  await expect(page.getByTestId('av-summary')).toContainText('Primeira compra');

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('av-menu')).toBeVisible();
  await expect(page.locator('.av-scenes .tile.done')).toHaveCount(3);
  await expect(page.getByTestId('av-start')).toContainText('Reviver uma cena');

  await page.reload();
  await expect(page.getByTestId('coins')).not.toHaveText('0');
  await expect(page.getByTestId('play-now')).toContainText('Aventura');
  await openGame(page);
  await expect(page.locator('.av-scenes .tile.done')).toHaveCount(3);
});

test('o diário guarda as falas vividas e dá para andar nele pelo teclado', async ({ page }) => {
  await openGame(page);
  await expect(page.getByRole('button', { name: /Diário/ })).toBeDisabled();
  await startScene(page);
  await playScene(page);
  await page.keyboard.press('d');
  const entries = page.locator('.av-entry');
  await expect(page.getByTestId('av-diary')).toBeVisible();
  expect(await entries.count()).toBeGreaterThan(10);
  await expect(entries.first()).toContainText('どうぞ');
  await expect(entries.last()).toHaveClass(/on/);
  await expect(entries.last()).toContainText('Vá com cuidado.');
  await page.keyboard.press('ArrowUp');
  await expect(entries.nth((await entries.count()) - 2)).toHaveClass(/on/);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('av-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-now')).toBeVisible();
});

test('sair no meio da cena volta para a lista de cenas sem perder o que foi visto', async ({ page }) => {
  await openGame(page);
  await startScene(page);
  await toChoice(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('av-menu')).toBeVisible();
  await expect(page.getByRole('button', { name: /Diário \(1\)/ })).toBeEnabled();
});

test('a cena tem cenário e retrato coloridos, a narração também; cena feita ganha o sinal no menu', async ({ page }) => {
  await openGame(page);
  await expect(page.locator('.av-scenes .tile.done')).toHaveCount(0);
  await startScene(page);
  const vistos = new Set<string>();
  for (let i = 0; i < 300 && !(await page.getByTestId('av-summary').isVisible()); i++) {
    const palco = page.getByTestId('av-stage');
    if (await palco.isVisible()) {
      const { kind, cena, retrato } = await palco.evaluate((el) => ({
        kind: el.getAttribute('data-kind') ?? '',
        cena: (el as HTMLElement).style.getPropertyValue('--cena'),
        retrato: el.querySelector<HTMLImageElement>('.av-portrait')?.getAttribute('src') ?? '',
      }));
      expect(cena, kind).toMatch(/aventura-narita/);
      if (retrato) expect(retrato, kind).not.toBe('');
      vistos.add(kind === 'narra' ? 'narra' : 'cena');
    }
    const ok = page.locator('.av-option[data-result="ok"]:not(.tried)').first();
    if (await ok.isVisible()) await ok.click();
    else await page.keyboard.press('Enter');
    await page.waitForTimeout(40);
  }
  expect([...vistos].sort()).toEqual(['cena', 'narra']);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('av-menu')).toBeVisible();
  await expect(page.locator('.av-scenes .tile.done')).toHaveCount(1);
});
