import { expect, test, type Page } from '@playwright/test';

const SHOTS = process.env.SHOTS_DIR;

test.beforeEach(async ({ page }) => {
  // Artes de outro site e o servidor da Conversa ficam de fora: o teste não depende de rede nem do PC.
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.route('http://127.0.0.1:8791/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByTestId('play-now')).toBeVisible();
});

const painel = (page: Page) => page.getByTestId('aprofundar');

/** Responde a primeira pergunta do KanjiMon (certo) e espera o retorno aparecer. */
async function responderKanjiMon(page: Page) {
  await page.keyboard.press('c');
  await expect(page.getByTestId('enemy-kanji')).toBeVisible();
  await page.locator('[data-answer="yes"]').first().click();
  await expect(page.locator('.choice.right')).toBeVisible();
}

interface Caso {
  nome: string;
  entrar: (page: Page) => Promise<void>;
  marca: (page: Page) => ReturnType<Page['locator']>;
}

const CASOS: Caso[] = [
  { nome: 'fliperama', entrar: async () => {}, marca: (p) => p.getByTestId('play-now') },
  { nome: 'kanjimon', entrar: (p) => p.keyboard.press('c'), marca: (p) => p.getByTestId('enemy-kanji') },
  { nome: 'kanjidex', entrar: (p) => p.keyboard.press('d'), marca: (p) => p.locator('.dex-grid') },
  { nome: 'kanabeat', entrar: (p) => p.keyboard.press('k'), marca: (p) => p.locator('.kb-track') },
  { nome: 'kotodama', entrar: (p) => p.keyboard.press('r'), marca: (p) => p.getByTestId('rg') },
  { nome: 'aventura', entrar: (p) => p.keyboard.press('a'), marca: (p) => p.locator('main.av') },
  { nome: 'conversa', entrar: (p) => p.keyboard.press('v'), marca: (p) => p.getByTestId('cv') },
  { nome: 'kumitate', entrar: (p) => p.keyboard.press('g'), marca: (p) => p.locator('main.gr') },
  { nome: 'memoria', entrar: (p) => p.keyboard.press('m'), marca: (p) => p.getByTestId('me-menu') },
  { nome: 'cena', entrar: (p) => p.keyboard.press('l'), marca: (p) => p.getByTestId('cn-menu') },
  { nome: 'jornada', entrar: (p) => p.keyboard.press('j'), marca: (p) => p.getByTestId('jn-proxima') },
  {
    nome: 'licao',
    entrar: async (p) => {
      await p.keyboard.press('j');
      await p.getByTestId('jn-proxima').click();
    },
    marca: (p) => p.getByTestId('lc-quadro'),
  },
];

for (const c of CASOS) {
  test(`Aprofundar em ${c.nome}: o botão e o F4 abrem, Esc volta para a mesma tela`, async ({ page }) => {
    await c.entrar(page);
    const marca = c.marca(page);
    await expect(marca).toBeVisible();
    await expect(page.getByTestId('apr-botao')).toBeVisible();
    // F4 logo ao entrar: um efeito atrasado da troca de tela fechava o painel recém-aberto.
    await page.keyboard.press('F4');
    await expect(painel(page)).toBeVisible();
    await page.waitForTimeout(300);
    await expect(painel(page)).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/aprofundar-${c.nome}.png` });
    await page.keyboard.press('Escape');
    await expect(painel(page)).toBeHidden();
    await expect(marca).toBeVisible();
    await page.getByTestId('apr-botao').click();
    await expect(painel(page)).toBeVisible();
    await painel(page).click({ position: { x: 5, y: 5 } });
    await expect(painel(page)).toBeHidden();
    await expect(marca).toBeVisible();
  });
}

test('no KanjiMon, a ficha só aparece depois da resposta, para não entregar nada', async ({ page }) => {
  await page.keyboard.press('c');
  await expect(page.getByTestId('enemy-kanji')).toBeVisible();
  await page.keyboard.press('F4');
  await expect(painel(page)).toContainText('Nada para aprofundar ainda');
  await page.keyboard.press('Escape');

  await page.locator('[data-answer="yes"]').first().click();
  await expect(page.locator('.choice.right')).toBeVisible();
  const kanji = (await page.getByTestId('enemy-kanji').innerText()).trim();
  await page.keyboard.press('F4');
  await expect(painel(page).locator('.apr-grande')).toHaveText(kanji);
  await expect(painel(page)).toContainText('Leituras');
  await expect(painel(page)).toContainText('Palavras da mesma família');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/aprofundar-ficha-kanji.png` });
});

test('com o Aprofundar aberto, as teclas não chegam ao jogo', async ({ page }) => {
  await responderKanjiMon(page);
  await page.keyboard.press('F4');
  await expect(painel(page)).toBeVisible();
  for (const k of ['1', '2', 'Enter', 'Space', 'k', 'c']) await page.keyboard.press(k);
  await page.keyboard.press('Escape');
  await expect(painel(page)).toBeHidden();
  await expect(page.getByTestId('enemy-kanji')).toBeVisible();
  await expect(page.locator('.hearts .heart.on')).toHaveCount(5);
});

test('o Aprofundar pausa o Kana Beat e, ao fechar, a música volta de onde parou', async ({ page }) => {
  await page.keyboard.press('k');
  const nota = page.getByTestId('target-note');
  await expect(nota).toBeVisible();
  await page.keyboard.press('F4');
  await expect(painel(page)).toBeVisible();
  const antes = await nota.getAttribute('style');
  await page.waitForTimeout(600);
  expect(await nota.getAttribute('style')).toBe(antes);
  await page.keyboard.press('Escape');
  await expect(painel(page)).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Pausado' })).toBeHidden();
  await expect.poll(async () => nota.getAttribute('style')).not.toBe(antes);
});

test('na Aventura, a ficha da cena tem o vocabulário e uma frase para montar', async ({ page }) => {
  await page.keyboard.press('a');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('av-stage')).toBeVisible();
  await page.keyboard.press('F4');
  await expect(painel(page)).toBeVisible();
  await painel(page).locator('.apr-grupo button', { hasText: 'Cena' }).first().click();
  await expect(painel(page)).toContainText('Vocabulário da cena');
  const montar = painel(page).getByTestId('apr-montar');
  await expect(montar).toBeVisible();
  // Clica as peças na ordem da frase até dar certo (a errada só pisca).
  for (let i = 0; i < 12 && (await montar.locator('.apr-certo').count()) === 0; i++) {
    const pecas = montar.locator('.apr-pecas button');
    const n = await pecas.count();
    for (let j = 0; j < n; j++) {
      const antes = await montar.locator('.apr-montada').innerText();
      await pecas.nth(j).click();
      if ((await montar.locator('.apr-montada').innerText()) !== antes) break;
    }
  }
  await expect(montar.locator('.apr-certo')).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/aprofundar-cena.png` });
});

test('ritmo "mais estudo": depois de um erro, o jogo oferece a ficha num canto', async ({ page }) => {
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByTestId('ritmo-estudo').click();
  await expect(page.getByTestId('ritmo-estudo')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await page.keyboard.press('c');
  await expect(page.getByTestId('enemy-kanji')).toBeVisible();
  // Primeira pergunta: a carta é nova, e no ritmo de estudo isso já oferece.
  await page.locator('.choice:not([data-answer])').first().click();
  const oferta = page.getByTestId('apr-oferta');
  await expect(oferta).toBeVisible();
  await oferta.getByRole('button', { name: /Aprofundar/ }).click();
  await expect(painel(page)).toBeVisible();
  await expect(painel(page).locator('.apr-grande')).not.toBeEmpty();
});

test('ritmo "mais jogo": nada é oferecido', async ({ page }) => {
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByTestId('ritmo-jogo').click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('c');
  await expect(page.getByTestId('enemy-kanji')).toBeVisible();
  await page.locator('.choice:not([data-answer])').first().click();
  await page.waitForTimeout(400);
  await expect(page.getByTestId('apr-oferta')).toBeHidden();
});
