import { expect, test, type Page } from './base';
import { chavesDosKana, chavesDosKanji, firmarCartas } from './apoio';

const SHOTS = process.env.SHOTS_DIR;

test.beforeEach(async ({ page }) => {
  // Artes de outro site e o servidor da Conversa ficam de fora: o teste não depende de rede nem do PC.
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.route('http://127.0.0.1:8791/**', (route) => route.abort());
  await page.goto('/');
  // Quem já estudou: os jogos abrem direto, sem a apresentação de coisa nova (que tem teste próprio abaixo).
  await firmarCartas(page, [...chavesDosKanji(), ...chavesDosKana()]);
  await expect(page.getByTestId('play-now')).toBeVisible();
});

const painel = (page: Page) => page.getByTestId('ajuda');

/** Dá ao save três kanji já vistos e moedas: o booster abre. */
async function liberarBooster(page: Page) {
  await page.keyboard.press('c');
  await page.locator('[data-answer="yes"]').first().click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-now')).toBeVisible();
  await page.evaluate(() => {
    const chave = 'kotoba-arcade:save';
    const save = JSON.parse(localStorage.getItem(chave) as string);
    const estado = Object.entries(save.cards).find(([k]) => k.startsWith('k:') && k.endsWith('#meaning'))?.[1];
    for (const k of ['一', '二', '三']) save.cards[`k:${k}#meaning`] = estado;
    save.profile.coins = 500;
    localStorage.setItem(chave, JSON.stringify(save));
  });
  await page.reload();
  await expect(page.getByTestId('play-now')).toBeVisible();
}

interface Caso {
  nome: string;
  titulo: string;
  entrar: (page: Page) => Promise<void>;
  /** Algo que só existe nesta tela: depois de fechar a ajuda, a tela tem que continuar a mesma. */
  marca: (page: Page) => ReturnType<Page['locator']>;
}

const CASOS: Caso[] = [
  { nome: 'fliperama', titulo: 'Fliperama', entrar: async () => {}, marca: (p) => p.getByTestId('play-now') },
  { nome: 'ajustes', titulo: 'Ajustes', entrar: (p) => p.getByRole('button', { name: 'Ajustes' }).click(), marca: (p) => p.getByRole('button', { name: 'Exportar backup' }) },
  { nome: 'kanjimon', titulo: 'KanjiMon', entrar: (p) => p.keyboard.press('c'), marca: (p) => p.getByTestId('enemy-kanji') },
  { nome: 'kanjidex', titulo: 'KanjiDex', entrar: (p) => p.keyboard.press('d'), marca: (p) => p.locator('.dex-grid') },
  {
    nome: 'booster',
    titulo: 'Booster',
    entrar: async (p) => {
      await liberarBooster(p);
      await p.keyboard.press('b');
    },
    marca: (p) => p.locator('.booster-row'),
  },
  { nome: 'kanabeat', titulo: 'Kana Beat', entrar: (p) => p.keyboard.press('k'), marca: (p) => p.locator('.kb-track') },
  { nome: 'kotodama', titulo: 'Kotodama', entrar: (p) => p.keyboard.press('r'), marca: (p) => p.getByTestId('rg') },
  { nome: 'aventura', titulo: 'Aventura', entrar: (p) => p.keyboard.press('a'), marca: (p) => p.locator('main.av') },
  { nome: 'conversa', titulo: 'Conversa por voz', entrar: (p) => p.keyboard.press('v'), marca: (p) => p.getByTestId('cv') },
  { nome: 'kumitate', titulo: 'Kumitate', entrar: (p) => p.keyboard.press('g'), marca: (p) => p.locator('main.gr') },
  { nome: 'memoria', titulo: 'Memória', entrar: (p) => p.keyboard.press('m'), marca: (p) => p.getByTestId('me-menu') },
  { nome: 'cena', titulo: 'Cena Viva', entrar: (p) => p.keyboard.press('l'), marca: (p) => p.getByTestId('cn-menu') },
  { nome: 'jornada', titulo: 'Jornada', entrar: (p) => p.keyboard.press('j'), marca: (p) => p.getByTestId('jn-proxima') },
  {
    nome: 'licao',
    titulo: 'Lição em quadrinhos',
    entrar: async (p) => {
      await p.keyboard.press('j');
      await p.getByTestId('jn-proxima').click();
    },
    marca: (p) => p.getByTestId('lc-quadro'),
  },
];

for (const c of CASOS) {
  test(`ajuda em ${c.nome}: abre pelo botão e pela tecla, fecha com Esc e com clique fora`, async ({ page }) => {
    await c.entrar(page);
    const marca = c.marca(page);
    await expect(marca).toBeVisible();
    await expect(painel(page)).toBeHidden();

    await page.getByTestId('ajuda-botao').click();
    await expect(painel(page)).toBeVisible();
    await expect(painel(page).locator('h2')).toHaveText(c.titulo);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/ajuda-${c.nome}.png` });

    // Esc fecha só a ajuda: não sai do jogo nem fecha os Ajustes.
    await page.keyboard.press('Escape');
    await expect(painel(page)).toBeHidden();
    await expect(marca).toBeVisible();

    await page.keyboard.press('?');
    await expect(painel(page)).toBeVisible();
    await painel(page).click({ position: { x: 5, y: 5 } });
    await expect(painel(page)).toBeHidden();
    await expect(marca).toBeVisible();
  });
}

test('depois de abrir pelo botão e fechar, o Enter do fliperama volta a continuar o curso', async ({ page }) => {
  // O foco ficava no botão de ajuda e o Enter reabria a ajuda em vez de seguir.
  await page.getByTestId('ajuda-botao').click();
  await expect(painel(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(painel(page)).toBeHidden();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cs-objetivo')).toBeVisible();
  await expect(painel(page)).toBeHidden();
});

test('o índice troca de seção pelo clique e pelo número', async ({ page }) => {
  await page.getByTestId('ajuda-botao').click();
  const corpo = page.getByTestId('ajuda-corpo');
  await expect(corpo.locator('h3').first()).toHaveText('Objetivo');
  await painel(page).getByRole('button', { name: /Teclas/ }).click();
  await expect(corpo.locator('h3').first()).toHaveText('Teclas');
  await expect(corpo).toContainText('Continuar o curso');
  await page.keyboard.press('6');
  await expect(corpo.locator('h3').first()).toHaveText('Perguntas comuns');
  await expect(corpo).toContainText('Como funciona o save?');
});

test('com a ajuda aberta, as teclas não chegam ao jogo', async ({ page }) => {
  await page.keyboard.press('c');
  await expect(page.getByTestId('enemy-kanji')).toBeVisible();
  const prompt = await page.getByTestId('prompt').innerText();
  await page.keyboard.press('?');
  await expect(painel(page)).toBeVisible();
  // 1 a 4 respondem no KanjiMon; Enter segue; letras abrem jogos no fliperama.
  for (const k of ['1', '2', '3', '4', 'Enter', 'Space', 'k']) await page.keyboard.press(k);
  await page.keyboard.press('Escape');
  await expect(painel(page)).toBeHidden();
  await expect(page.getByTestId('prompt')).toHaveText(prompt);
  await expect(page.locator('.choice.right, .choice.wrong')).toHaveCount(0);
  await expect(page.locator('.hearts .heart.on')).toHaveCount(5);
});

test('com a ajuda aberta por cima da apresentação de coisa nova, as teclas não chegam a ela', async ({ page }) => {
  // Jogador novo: o KanjiMon começa apresentando os kanji.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.keyboard.press('c');
  const cartao = page.getByTestId('apresentacao');
  await expect(cartao).toBeVisible();
  const item = await cartao.getAttribute('data-item');
  await page.keyboard.press('?');
  await expect(painel(page)).toBeVisible();
  await painel(page).getByRole('button', { name: /Perguntas comuns/ }).click();
  await expect(painel(page)).toContainText('Por que o jogo mostra as coisas antes de perguntar?');
  for (const k of ['Enter', 'Space', 'ArrowRight', 'v']) await page.keyboard.press(k);
  await page.keyboard.press('Escape');
  await expect(painel(page)).toBeHidden();
  await expect(cartao).toHaveAttribute('data-item', item!);
  await expect(page.getByTestId('apresentacao')).toBeVisible();
});

test('no fliperama, a letra de um jogo com a ajuda aberta não abre o jogo', async ({ page }) => {
  await page.keyboard.press('F1');
  await expect(painel(page)).toBeVisible();
  await page.keyboard.press('k');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-now')).toBeVisible();
});

test('abrir a ajuda pausa o Kana Beat; fechar volta a música de onde parou', async ({ page }) => {
  await page.keyboard.press('k');
  const nota = page.getByTestId('target-note');
  await expect(nota).toBeVisible();
  await page.keyboard.press('?');
  await expect(painel(page)).toBeVisible();
  const antes = await nota.getAttribute('style');
  await page.waitForTimeout(600);
  expect(await nota.getAttribute('style')).toBe(antes);

  await page.keyboard.press('Escape');
  await expect(painel(page)).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Pausado' })).toBeHidden();
  await expect.poll(async () => nota.getAttribute('style')).not.toBe(antes);
});

test('pausa do Kana Beat pelo Espaço continua esperando uma tecla depois da ajuda', async ({ page }) => {
  await page.keyboard.press('k');
  const nota = page.getByTestId('target-note');
  await expect(nota).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: 'Pausado' })).toBeVisible();
  await page.keyboard.press('?');
  await page.keyboard.press('Escape');
  await expect(painel(page)).toBeHidden();
  await page.waitForTimeout(300);
  await expect(page.getByRole('heading', { name: 'Pausado' })).toBeVisible();
});

test('na Conversa, F1 continua sendo do jogo e ? abre a ajuda', async ({ page }) => {
  await page.keyboard.press('v');
  await expect(page.getByTestId('cv')).toBeVisible();
  await page.keyboard.press('F1');
  await page.waitForTimeout(200);
  await expect(painel(page)).toBeHidden();
  await page.keyboard.press('?');
  await expect(painel(page)).toBeVisible();
  await expect(painel(page)).toContainText('protegida por senha');
});

test('nada da ajuda aparece sozinho', async ({ page }) => {
  for (const k of ['c', 'Escape', 'k', 'Escape', 'g', 'Escape']) {
    await page.keyboard.press(k);
    await page.waitForTimeout(150);
  }
  await expect(painel(page)).toBeHidden();
  await expect(page.getByTestId('ajuda-botao')).toBeVisible();
});
