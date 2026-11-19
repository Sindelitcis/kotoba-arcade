import { expect, test, type Page, type Route } from '@playwright/test';

const SERVIDOR = 'http://127.0.0.1:8791';
const SHOTS = process.env.SHOTS_DIR;

const resposta = (r: Record<string, unknown>) =>
  JSON.stringify({
    entendi: true,
    correcao: null,
    passos: [],
    fala: 'はい。',
    traducao: 'Certo.',
    dica: 'Pergunte quanto custa.',
    sugestoes: [
      { jp: 'いくらですか', pt: 'Quanto custa?' },
      { jp: 'お会計をお願いします', pt: 'A conta, por favor.' },
    ],
    ...r,
  });

const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** Simula o servidor local: as respostas do personagem saem da fila, na ordem. */
async function servidorFalso(page: Page, fila: (string | number)[]) {
  const pedidos: { mensagens: { role: string; content: string }[] }[] = [];
  await page.route(`${SERVIDOR}/saude`, (r) =>
    json(r, { ok: true, conversa: { ok: true, modelo: 'falso' }, fala: { ok: true }, voz: { ok: false, motor: 'nenhum' } }),
  );
  await page.route(`${SERVIDOR}/conversa`, (r) => {
    pedidos.push(r.request().postDataJSON());
    const next = fila.shift();
    if (typeof next === 'number') return json(r, { detail: 'caiu' }, next);
    return json(r, { texto: next ?? resposta({}), ms: 10 });
  });
  await page.route(`${SERVIDOR}/leitura`, (r) => {
    const { texto } = r.request().postDataJSON() as { texto: string };
    const tokens = texto === '四百円です。' ? [{ t: '四百', r: 'ヨンヒャク' }, { t: '円', r: 'エン' }, { t: 'です' }, { t: '。' }] : [{ t: texto }];
    return json(r, { tokens });
  });
  return pedidos;
}

async function abrir(page: Page) {
  await page.goto('/');
  await page.locator('.tile', { hasText: 'Conversa por voz' }).click();
}

async function dizer(page: Page, texto: string) {
  const antes = await page.getByTestId('cv-npc').count();
  await page.getByTestId('cv-text').fill(texto);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cv-npc')).toHaveCount(antes + 1);
  await expect(page.getByTestId('cv')).toHaveAttribute('data-turn', /vez|fim/);
}

test('sem o servidor local, a tela explica em uma frase como ligar e não trava', async ({ page }) => {
  // No GitHub Actions não há servidor; aqui a rota é derrubada para o teste não depender da máquina.
  await page.route(`${SERVIDOR}/**`, (r) => r.abort('connectionrefused'));
  await abrir(page);
  await expect(page.getByTestId('cv')).toHaveAttribute('data-phase', 'desligado');
  await expect(page.getByTestId('cv-off')).toContainText('Este jogo roda só no seu PC');
  await expect(page.getByTestId('cv-off')).toContainText('npm run local');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/conversa-desligado.png` });
  // Procurar de novo também não quebra.
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cv')).toHaveAttribute('data-phase', 'desligado');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-now')).toBeVisible();
});

test('a tecla V abre a Conversa a partir do fliperama', async ({ page }) => {
  await page.route(`${SERVIDOR}/**`, (r) => r.abort('connectionrefused'));
  await page.goto('/');
  await expect(async () => {
    await page.keyboard.press('v');
    await expect(page.getByTestId('cv')).toBeVisible({ timeout: 500 });
  }).toPass();
});

test('uma conversa digitada completa, do pedido ao resumo', async ({ page }) => {
  const pedidos = await servidorFalso(page, [
    resposta({ passos: ['pedir'], fala: 'はい、コーヒーですね。', traducao: 'Certo, um café.' }),
    resposta({
      passos: ['pedir', 'conta'],
      fala: '四百円です。',
      traducao: 'São 400 ienes.',
      correcao: { melhor: 'いくらですか', nota: 'Com "desu ka" a pergunta fica completa.' },
    }),
    resposta({ passos: ['pedir', 'conta', 'pagar'], fala: 'ありがとうございました。', traducao: 'Muito obrigado.' }),
  ]);
  await abrir(page);
  await expect(page.getByTestId('cv')).toHaveAttribute('data-phase', 'menu');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cv')).toHaveAttribute('data-phase', 'conversa');
  await expect(page.getByTestId('cv-npc').first()).toContainText('いらっしゃいませ');
  // Furigana na fala fixa de abertura.
  await expect(page.getByTestId('cv-npc').first().locator('rt')).toHaveText('ちゅうもん');

  await dizer(page, 'koohii o kudasai');
  await expect(page.getByTestId('cv-me').last()).toContainText('こおひいおください');
  await expect(page.getByTestId('cv-goals').locator('li.done')).toHaveCount(1);
  expect(pedidos[0]!.mensagens[0]!.content).toContain('Kenta');

  await dizer(page, 'ikura');
  await expect(page.getByTestId('cv-npc').last().locator('rt')).toHaveText(['よんひゃく', 'えん']);
  // Tradução só quando pede.
  await expect(page.getByTestId('cv-pt')).toHaveCount(0);
  await page.keyboard.press('F1');
  await expect(page.getByTestId('cv-pt')).toHaveText('São 400 ienes.');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/conversa-meio.png` });

  await dizer(page, 'kaado de onegaishimasu. arigatou gozaimasu');
  await expect(page.getByTestId('cv')).toHaveAttribute('data-phase', 'resumo', { timeout: 5000 });
  const resumo = page.getByTestId('cv-summary');
  await expect(resumo).toContainText('Objetivo cumprido!');
  await expect(page.getByTestId('cv-good')).toContainText('こおひいおください');
  await expect(page.getByTestId('cv-fix')).toContainText('いくらですか');
  await expect(page.getByTestId('cv-fix')).toContainText('fica completa');
  await expect(page.getByTestId('cv-new')).toContainText('ください');
  await expect(resumo).not.toContainText(/errado|erro/i);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/conversa-resumo.png` });

  // O estudo e as moedas ficam no fliperama.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('cv')).toHaveAttribute('data-phase', 'menu');
  await expect(page.locator('[data-scene="pedido"]')).toContainText('feita 1x');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('coins')).not.toHaveText('0');
  await page.reload();
  expect(Number(await page.locator('.meter b').nth(1).innerText())).toBeGreaterThan(0);
});

test('a dica vem em dois degraus: primeiro a ideia, depois respostas prontas', async ({ page }) => {
  await servidorFalso(page, []);
  await abrir(page);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cv')).toHaveAttribute('data-phase', 'conversa');
  await page.getByTestId('cv-text').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('cv-hint')).toContainText('kudasai');
  await expect(page.getByTestId('cv-suggest')).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('cv-suggest')).toHaveCount(2);
  await page.getByTestId('cv-suggest').first().click();
  await expect(page.getByTestId('cv-text')).toHaveValue('koohii o kudasai');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cv-npc')).toHaveCount(2);
});

test('o servidor cai no meio: a fala não se perde e dá para mandar de novo', async ({ page }) => {
  await servidorFalso(page, [503, resposta({ passos: ['pedir'], fala: 'はい、どうぞ。' })]);
  await abrir(page);
  await page.keyboard.press('Enter');
  await page.getByTestId('cv-text').fill('koohii o kudasai');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cv-note')).toContainText('não respondeu');
  await expect(page.getByTestId('cv-me')).toHaveCount(0);
  await dizer(page, 'koohii o kudasai');
  await expect(page.getByTestId('cv-npc').last()).toContainText('はい、どうぞ。');
});

test('Esc no meio da conversa encerra com o resumo do que houve', async ({ page }) => {
  await servidorFalso(page, [resposta({ passos: ['pedir'] })]);
  await abrir(page);
  await page.keyboard.press('Enter');
  await dizer(page, 'koohii o kudasai');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('cv-summary')).toContainText('Conversa encerrada');
  await expect(page.getByTestId('cv-summary').locator('.cv-goals li.done')).toHaveCount(1);
});
