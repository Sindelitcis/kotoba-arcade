import { expect, test, type Page } from '@playwright/test';

const SHOTS = process.env.SHOTS_DIR;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

async function open(page: Page) {
  await page.locator('.tile', { hasText: 'Kotodama' }).click();
  await expect(page.getByTestId('rg')).toHaveAttribute('data-phase', 'combat');
}

const phase = (page: Page) => page.getByTestId('rg').getAttribute('data-phase');

async function enemyHp(page: Page): Promise<number> {
  return parseInt(await page.getByTestId('rg-enemy-hp').innerText(), 10);
}

/** Joga só no teclado, acertando tudo, até a run acabar. */
async function playToTheEnd(page: Page) {
  const seen = new Set<string>();
  for (let i = 0; i < 1500; i++) {
    const now = (await phase(page)) ?? '';
    if (SHOTS && !seen.has(now)) {
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${SHOTS}/roguelike-${now}.png` });
    }
    seen.add(now);
    if (now === 'over') return seen;
    if (now === 'question') {
      // Leitura que já firmou vira digitação.
      const typing = page.getByTestId('typing');
      if ((await typing.count()) > 0 && (await typing.isEnabled())) {
        await page.keyboard.type((await typing.getAttribute('data-answer')) ?? '');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(60);
        continue;
      }
      const index = await page.locator('.choice').evaluateAll((els) => els.findIndex((e) => e.getAttribute('data-answer') === 'yes' && !e.classList.contains('right')));
      if (index >= 0) await page.keyboard.press(String(index + 1));
    } else if (now === 'combat') {
      // Escudo quando o golpe do inimigo ainda passa, senão golpe.
      const attack = Number((await page.locator('.rg-intent').innerText()).match(/ataca (\d+)/)?.[1] ?? 0);
      const block = parseInt((await page.getByTestId('rg-block').innerText()).replace(/\D/g, ''), 10);
      const effects = await page.getByTestId('rg-card').evaluateAll((els) => els.map((e) => e.className));
      const want = attack > block ? ['e-block', 'e-attack'] : ['e-attack', 'e-draw'];
      let index = -1;
      for (const w of want) if (index < 0) index = effects.findIndex((c) => c.includes(w));
      await page.keyboard.press(String(Math.max(0, index) + 1));
    } else if (now === 'reward' || now === 'rest') {
      await page.keyboard.press('1');
    } else {
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(60);
  }
  throw new Error('a run não terminou');
}

test('do fliperama para o primeiro combate com uma tecla', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Kotoba Arcade' })).toBeVisible();
  await expect(async () => {
    await page.keyboard.press('r');
    await expect(page.getByTestId('rg')).toHaveAttribute('data-phase', 'combat', { timeout: 500 });
  }).toPass();
  await expect(page.getByTestId('rg-card').first()).toBeVisible();
  await expect(page.getByTestId('rg-relics').locator('.rg-relic')).toHaveCount(1);
  await expect(page.getByTestId('rg-hp')).toContainText('40/40');
});

test('carta nova ensina antes de perguntar, e acertar solta o efeito forte', async ({ page }) => {
  await open(page);
  const before = await enemyHp(page);
  await page.locator('.rg-card.e-attack').first().click();
  await expect(page.getByTestId('teach')).toBeVisible();
  await page.locator('[data-answer="yes"]').click();
  await expect(page.getByTestId('rg-echo')).toContainText('Golpe: 9 de dano');
  await expect(page.getByTestId('rg-ask')).toBeHidden();
  expect(await enemyHp(page)).toBe(before - 9);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/roguelike-combate.png` });
});

test('errar solta o efeito fraco e mostra a resposta certa', async ({ page }) => {
  await open(page);
  const before = await enemyHp(page);
  await page.locator('.rg-card.e-attack').first().click();
  const answer = await page.locator('[data-answer="yes"] span').innerText();
  await page.locator('.choice:not([data-answer])').first().click();
  await expect(page.getByTestId('rg-echo')).toContainText(`Era: ${answer}`);
  await expect(page.getByTestId('rg-echo')).toContainText('efeito fraco');
  await expect(page.getByTestId('rg-ask')).toBeHidden({ timeout: 4000 });
  // Com o Amuleto do aprendiz, a carta errada sai com metade da força.
  const amulet = (await page.getByTestId('rg-relics').innerText()).includes('Amuleto');
  expect(await enemyHp(page)).toBe(before - (amulet ? 5 : 3));
  await expect(page.getByTestId('rg-hp')).toContainText('40/40');
});

test('passar a vez deixa o inimigo agir e traz mão nova', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('rg-note')).toContainText(/atacou|se defendeu/);
  await expect(page.getByTestId('rg-card').first()).toBeVisible();
  await expect(page.getByTestId('rg')).toHaveAttribute('data-phase', 'combat');
});

test('Enter logo depois de entrar no jogo não cai em outro jogo', async ({ page }) => {
  // O fliperama ouvia o Enter por um instante depois da troca de tela e abria o KanjiMon.
  for (let i = 0; i < 5; i++) {
    await page.locator('.tile', { hasText: 'Kotodama' }).click();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    await expect(page.getByTestId('rg')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('play-now')).toBeVisible();
  }
});

test('uma run inteira só no teclado, do primeiro nó até o chefe', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page);
  const seen = await playToTheEnd(page);
  await expect(page.getByTestId('rg-over')).toContainText('Chefe derrotado!');
  await expect(page.getByTestId('rg-over')).toContainText('7/7');
  for (const p of ['combat', 'question', 'reward', 'map']) expect(seen).toContain(p);
  expect(seen.has('rest') || seen.has('shop')).toBe(true);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/roguelike-fim.png` });

  // O estudo e as moedas ficam no fliperama.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('coins')).not.toHaveText('0');
  await expect(page.getByTestId('kanji-seen')).not.toHaveText('0');
  await expect(page.getByTestId('play-now')).toContainText('Kotodama');
});

test('Esc no meio da run volta ao fliperama sem perder o que foi estudado', async ({ page }) => {
  await open(page);
  await page.locator('.rg-card').first().click();
  await page.locator('[data-answer="yes"]').click();
  await expect(page.getByTestId('rg-ask')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-now')).toBeVisible();
  await page.reload();
  const kanji = Number(await page.getByTestId('kanji-seen').innerText());
  const words = await page.locator('.meter b').nth(1).innerText();
  expect(kanji + Number(words)).toBe(1);
});
