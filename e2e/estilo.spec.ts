import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.goto('/');
});

test('as fontes do mangá carregam e o título usa a de pincel', async ({ page }) => {
  await page.evaluate(() => document.fonts.ready);
  const families = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')));
  expect(families).toEqual(expect.arrayContaining(['Dela Gothic One', 'Yuji Syuku']));
  await expect(page.locator('.brand-jp')).toHaveCSS('font-family', /Yuji Syuku/);
});

test('o traço dos quadros fica dentro do quadro, mesmo quando o quadro corta o que sobra', async ({ page }) => {
  // Com a borda por fora e overflow: hidden, o traço de cima e da esquerda sumia nos cartões do fliperama.
  const frames = await page.locator('.tile, .play-now, .panel').evaluateAll((els) =>
    els.map((el) => {
      const after = getComputedStyle(el, '::after');
      return { overflow: getComputedStyle(el).overflow, top: parseFloat(after.top), left: parseFloat(after.left), border: after.borderTopWidth };
    }),
  );
  expect(frames.length).toBeGreaterThan(6);
  for (const f of frames) {
    expect(f.border).toBe('3px');
    if (f.overflow === 'hidden') {
      expect(f.top).toBeGreaterThanOrEqual(0);
      expect(f.left).toBeGreaterThanOrEqual(0);
    }
  }
});

test('os cartões do fliperama mostram o cenário de cada jogo', async ({ page }) => {
  const backgrounds = await page.locator('.tiles .tile').evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundImage));
  expect(backgrounds).toHaveLength(6);
  for (const bg of backgrounds) expect(bg).toMatch(/url\(/);
});

test('modo calmo para o tremor dos quadros', async ({ page }) => {
  const anim = () => page.locator('.play-now').evaluate((el) => getComputedStyle(el, '::after').animationName);
  expect(await anim()).toBe('boil');
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByLabel(/Modo calmo/).check();
  await page.keyboard.press('Escape');
  expect(await anim()).toBe('none');
  await expect(page.locator('html')).toHaveAttribute('data-calma', '');
});
