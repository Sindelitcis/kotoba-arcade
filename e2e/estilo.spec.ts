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
  expect(backgrounds).toHaveLength(8);
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

/** Valor de `--cor` que a tela pôs no quadro (0 = só tinta, 1 = cor cheia). */
async function corDe(page: import('@playwright/test').Page, testid: string): Promise<number> {
  return Number(await page.getByTestId(testid).evaluate((el) => (el as HTMLElement).style.getPropertyValue('--cor')));
}

test('o fliperama começa no traço e pinta o jogo que você já jogou', async ({ page }) => {
  // Save novo: nenhum cartão pintado, a capa em tinta pura.
  await expect(page.locator('.tiles .tile.pintado')).toHaveCount(0);
  expect(await corDe(page, 'play-now')).toBe(0);
  // Cada cartão tem por baixo a versão colorida do cenário, esperando a cor.
  const camadas = await page.locator('.tiles .tile').evaluateAll((els) =>
    els.map((el) => ({
      tinta: (el as HTMLElement).style.getPropertyValue('--cena'),
      cor: (el.querySelector('.pinta') as HTMLElement | null)?.style.getPropertyValue('--cena-cor') ?? '',
    })),
  );
  expect(camadas).toHaveLength(8);
  for (const c of camadas) {
    expect(c.cor).toMatch(/url\(/);
    expect(c.cor).not.toBe(c.tinta);
  }

  // Captura uma carta no KanjiMon e volta.
  await page.getByTestId('play-now').click();
  for (let i = 0; i < 200 && !(await page.locator('.overlay h2').isVisible()); i++) {
    const certa = page.locator('[data-answer="yes"]:not(.right)');
    if (await certa.isVisible()) await certa.click();
    await page.waitForTimeout(120);
  }
  await expect(page.locator('.overlay h2')).toHaveText('Capturado!');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Kotoba Arcade' })).toBeVisible();

  await expect(page.locator('.tiles .tile.pintado')).toHaveCount(1);
  await expect(page.getByTestId('tile-kanjimon')).toHaveClass(/pintado/);
  expect(await corDe(page, 'tile-kanjimon')).toBe(1);
  expect(await corDe(page, 'tile-kanabeat')).toBe(0);
  // Um jogo de todos: a capa pinta só a fração dele (a cor vai para o estilo com duas casas).
  const jogos = await page.locator('.tiles .tile').count();
  expect(await corDe(page, 'play-now')).toBeCloseTo(Math.round(100 / jogos) / 100, 2);
});

test('na caçada a cor sobe com os acertos seguidos e cai no erro', async ({ page }) => {
  await page.getByTestId('play-now').click();
  await expect(page.getByTestId('enemy-kanji')).toBeVisible();
  expect(await corDe(page, 'arena')).toBe(0);
  const valores: number[] = [];
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-answer="yes"]:not(.right)').click();
    await page.waitForTimeout(80);
    valores.push(await corDe(page, 'arena'));
    await expect(page.locator('[data-answer="yes"]:not(.right)')).toBeVisible();
  }
  expect(valores[0]).toBeGreaterThan(0);
  expect(valores[1]).toBeGreaterThan(valores[0]!);
  expect(valores[2]).toBeGreaterThan(valores[1]!);
  await page.locator('.choice:not([data-answer])').first().click();
  const depois = await corDe(page, 'arena');
  expect(depois).toBeGreaterThan(0);
  expect(depois).toBeLessThan(valores[2]!);
  // Ao sair da caçada, a próxima tela começa no traço.
  await page.keyboard.press('Escape');
  await page.getByTestId('play-now').click();
  expect(await corDe(page, 'arena')).toBe(0);
});

test('modo calmo deixa a cor chegar mais devagar e sem a animação de pintar', async ({ page }) => {
  const duracao = () => page.getByTestId('play-now').evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(await duracao()).toBe('0.9s');
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByLabel(/Modo calmo/).check();
  await page.keyboard.press('Escape');
  expect(await duracao()).toBe('1.6s');
});

test('com a cor cheia, o borrão pinta o quadro largo de ponta a ponta', async ({ page }) => {
  // O desenho do borrão mantinha a proporção quadrada: num cartão largo, a cor cheia só cobria o meio.
  const tile = page.getByTestId('tile-kanjimon');
  await tile.evaluate((el) => {
    (el as HTMLElement).style.setProperty('--veu', 'none');
    (el as HTMLElement).style.transition = 'none';
    (el as HTMLElement).style.setProperty('--cor', '1');
  });
  for (const t of await tile.locator(':scope > :not(.pinta)').all()) await t.evaluate((el) => ((el as HTMLElement).style.visibility = 'hidden'));
  const png = (await tile.locator('.pinta').screenshot()).toString('base64');
  // Saturação média de uma faixa estreita na beirada esquerda e na direita: a versão de mangá é cinza (perto de 0).
  const sat = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0);
    const faixa = (x0: number) => {
      const d = g.getImageData(x0, 0, Math.round(img.width * 0.06), img.height).data;
      let s = 0;
      for (let i = 0; i < d.length; i += 4) s += Math.max(d[i]!, d[i + 1]!, d[i + 2]!) - Math.min(d[i]!, d[i + 1]!, d[i + 2]!);
      return s / (d.length / 4);
    };
    return { esquerda: faixa(2), direita: faixa(Math.round(img.width * 0.92)) };
  }, png);
  expect(sat.esquerda).toBeGreaterThan(25);
  expect(sat.direita).toBeGreaterThan(25);
});
