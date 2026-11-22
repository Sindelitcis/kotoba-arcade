import { expect, test, type Page } from '@playwright/test';
import { chavesDosKana, chavesDosKanji, firmarCartas } from './apoio';

test.beforeEach(async ({ page }) => {
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.goto('/');
  // Quem já estudou: a caçada cobra direto (o brilho do combo só sobe fora da prática).
  await firmarCartas(page, [...chavesDosKanji(), ...chavesDosKana()]);
});

test('as três fontes carregam: português, japonês e o kanji de estudo', async ({ page }) => {
  // A Klee One é a maior (kanji de estudo) e pode chegar depois do fonts.ready; espera ela vir sozinha.
  await expect
    .poll(() => page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, ''))))
    .toEqual(expect.arrayContaining(['Plus Jakarta Sans', 'Zen Maru Gothic', 'Klee One']));
  await expect(page.locator('.brand-jp')).toHaveCSS('font-family', /Klee One/);
  await expect(page.locator('.tile-title').first()).toHaveCSS('font-family', /Plus Jakarta Sans/);
});

test('os cartões do fliperama mostram a ilustração colorida de cada jogo, com a borda pintada', async ({ page }) => {
  // A ilustração fica no ::before do cartão, recortada por uma máscara de borda irregular.
  const artes = await page
    .locator('.tiles .tile')
    .evaluateAll((els) => els.map((el) => ({ fundo: getComputedStyle(el, '::before').backgroundImage, mascara: getComputedStyle(el, '::before').maskImage })));
  expect(artes).toHaveLength(10);
  for (const a of artes) {
    expect(a.fundo).toMatch(/url\(/);
    expect(a.mascara).toMatch(/url\("data:image\/svg\+xml/);
  }
  // Nada de versão em cinza: a imagem é a da pasta colorida.
  const cenas = await page.locator('.tiles .tile').evaluateAll((els) => els.map((el) => (el as HTMLElement).style.getPropertyValue('--cena')));
  for (const c of cenas) expect(c).not.toMatch(/-tinta|\/cenas\//);
});

test('jogo já jogado ganha o sinal no cartão e a contagem sobe', async ({ page }) => {
  await expect(page.locator('.tiles .tile.jogado')).toHaveCount(0);
  await expect(page.locator('.secao-titulo')).toContainText('0 de 10 já jogados');
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
  await expect(page.locator('.tiles .tile.jogado')).toHaveCount(1);
  await expect(page.getByTestId('tile-kanjimon')).toHaveClass(/jogado/);
  await expect(page.locator('.secao-titulo')).toContainText('1 de 10 já jogados');
});

/** Valor de `--cor` (brilho do combo, 0 a 1) que a tela pôs no cartão. */
async function corDe(page: Page, testid: string): Promise<number> {
  return Number(await page.getByTestId(testid).evaluate((el) => (el as HTMLElement).style.getPropertyValue('--cor')));
}

test('na caçada o brilho sobe com os acertos seguidos e cai no erro', async ({ page }) => {
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
  // Ao sair da caçada, a próxima tela começa sem brilho.
  await page.keyboard.press('Escape');
  await page.getByTestId('play-now').click();
  expect(await corDe(page, 'arena')).toBe(0);
});

test('o aro do combo acende no cartão do jogo', async ({ page }) => {
  await page.getByTestId('play-now').click();
  const sombra = () => page.getByTestId('arena').evaluate((el) => getComputedStyle(el).boxShadow);
  const antes = await sombra();
  await page.getByTestId('arena').evaluate((el) => {
    (el as HTMLElement).style.transition = 'none';
    (el as HTMLElement).style.setProperty('--cor', '1');
  });
  const depois = await sombra();
  expect(depois).not.toBe(antes);
  expect(depois).toMatch(/ 3px/);
});

test('modo calmo: brilho mais lento e faixas do Kana Beat paradas', async ({ page }) => {
  await page.getByTestId('play-now').click();
  const duracao = () => page.getByTestId('arena').evaluate((el) => getComputedStyle(el).transitionDuration.split(',')[0]);
  expect(await duracao()).toBe('0.9s');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByLabel(/Modo calmo/).check();
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-calma', '');
  await page.getByTestId('play-now').click();
  expect(await duracao()).toBe('1.6s');
  await page.keyboard.press('Escape');
  await page.keyboard.press('k');
  const anim = await page.getByTestId('kb-track').evaluate((el) => getComputedStyle(el, '::before').animationName);
  expect(anim).toBe('none');
});

test('tema escuro pelos ajustes: vale na hora e depois de recarregar', async ({ page }) => {
  const fundo = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const claro = await fundo();
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByRole('button', { name: 'Escuro' }).click();
  await expect(page.getByRole('button', { name: 'Escuro' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await fundo()).not.toBe(claro);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0d1220');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByRole('button', { name: 'Do sistema' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
});

test('sem escolha nos ajustes, o tema segue o do sistema', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto('/');
  const cor = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface').trim());
  expect(cor).toBe('#161e31');
  await ctx.close();
});

/** Contraste WCAG entre duas cores `#rrggbb`. */
function contraste(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

for (const tema of ['claro', 'escuro'] as const) {
  test(`contraste de texto em nível AA no tema ${tema}`, async ({ page }) => {
    await page.getByRole('button', { name: 'Ajustes' }).click();
    await page.getByRole('button', { name: tema === 'claro' ? 'Claro' : 'Escuro' }).click();
    const t = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      const nomes = ['bg', 'surface', 'surface-2', 'text', 'text-2', 'text-3', 'brand', 'on-brand', 'brand-soft', 'brand-text', 'ok-soft', 'ok-text', 'erro-soft', 'erro-text', 'raro-soft', 'raro-text', 'sakura-soft', 'sakura-text'];
      return Object.fromEntries(nomes.map((n) => [n, s.getPropertyValue(`--${n}`).trim()]));
    });
    const pares: [string, string][] = [
      ['text', 'surface'],
      ['text', 'bg'],
      ['text-2', 'surface'],
      ['text-2', 'bg'],
      ['text-2', 'surface-2'],
      ['text-3', 'surface'],
      ['text-3', 'bg'],
      ['on-brand', 'brand'],
      ['brand-text', 'brand-soft'],
      ['brand-text', 'surface'],
      ['ok-text', 'ok-soft'],
      ['erro-text', 'erro-soft'],
      ['raro-text', 'raro-soft'],
      ['sakura-text', 'sakura-soft'],
    ];
    const fracos = pares.map(([f, b]) => ({ par: `${f} sobre ${b}`, c: contraste(t[f]!, t[b]!) })).filter((p) => p.c < 4.5);
    expect(fracos).toEqual([]);
  });
}

test('foco do teclado sempre visível nos cartões', async ({ page }) => {
  await page.getByTestId('tile-kanjimon').focus();
  const outline = await page.getByTestId('tile-kanjimon').evaluate((el) => {
    const s = getComputedStyle(el);
    return { estilo: s.outlineStyle, largura: s.outlineWidth };
  });
  expect(outline.estilo).toBe('solid');
  expect(outline.largura).toBe('3px');
});

test('no celular o fliperama cabe na largura, sem rolagem de lado, e sem atalho de teclado', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.goto('/');
  const larga = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(larga).toBeLessThanOrEqual(360);
  await expect(page.locator('.tile-title kbd').first()).toBeHidden();
  await ctx.close();
});

test('no celular a tela de senha da Conversa cabe na largura, num cartão no meio', async ({ browser }) => {
  // O campo de senha esticava a coluna e o cartão passava da borda direita da tela.
  const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.route('http://127.0.0.1:8791/**', (route) => route.abort('connectionrefused'));
  await page.route('**/api/estado', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{"erro":"sessao"}' }));
  await page.goto('/');
  await page.getByTestId('tile-conversa').click();
  await expect(page.getByTestId('cv-senha-campo')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  const caixa = await page.getByTestId('cv-senha').boundingBox();
  expect(caixa!.x).toBeGreaterThanOrEqual(0);
  expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(360);
  await expect(page.getByTestId('cv-senha')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await ctx.close();
});

test('os quadros têm traço de pincel parado e os cartões do fliperama têm o canto cortado', async ({ page }) => {
  // O filtro existe na página e não tem nada animado dentro (o traço não treme).
  expect(await page.locator('svg filter#pincel').count()).toBe(1);
  expect(await page.locator('svg filter#pincel animate').count()).toBe(0);
  const traco = (sel: string) =>
    page.locator(sel).first().evaluate((el) => {
      const s = getComputedStyle(el, '::after');
      return { filtro: s.filter, borda: s.borderTopStyle, animacao: s.animationName };
    });
  for (const sel of ['.tiles .tile', '.jornada-faixa', '.panel']) {
    const t = await traco(sel);
    expect(t.filtro, sel).toContain('#pincel');
    expect(t.borda, sel).toBe('solid');
    expect(t.animacao, sel).toBe('none');
  }
  await expect(page.getByTestId('tile-kanjimon')).toHaveCSS('clip-path', /polygon/);
  // No jogo também: o quadro da caçada tem o traço.
  await page.getByTestId('play-now').click();
  expect((await traco('[data-testid="arena"]')).filtro).toContain('#pincel');
});

test('o foco do teclado aparece por dentro do cartão de canto cortado', async ({ page }) => {
  // O recorte esconderia um contorno por fora.
  await page.getByTestId('tile-kanjimon').focus();
  const offset = await page.getByTestId('tile-kanjimon').evaluate((el) => parseFloat(getComputedStyle(el).outlineOffset));
  expect(offset).toBeLessThan(0);
});

test('a mancha de tinta no canto do quadro cresce com o combo e some sem ele', async ({ page }) => {
  await page.getByTestId('play-now').click();
  const tamanho = (cor: string) =>
    page.getByTestId('arena').evaluate((el, cor) => {
      (el as HTMLElement).style.transition = 'none';
      (el as HTMLElement).style.setProperty('--cor', cor);
      const s = getComputedStyle(el, '::before');
      return { tam: parseFloat(s.maskSize), img: s.maskImage };
    }, cor);
  const sem = await tamanho('0');
  const meio = await tamanho('0.5');
  const cheio = await tamanho('1');
  expect(sem.tam).toBe(0);
  expect(meio.tam).toBeGreaterThan(0);
  expect(cheio.tam).toBeGreaterThan(meio.tam);
  expect(cheio.img).toMatch(/url\("data:image\/svg\+xml/);
});
