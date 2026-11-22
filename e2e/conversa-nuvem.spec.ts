import { expect, test, type Page, type Route } from './base';
import { passarApresentacao } from './apoio';

// A Conversa na nuvem (Cloudflare) com o servidor simulado: aqui o e2e roda no vite preview, sem as Functions.
const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const resposta = (r: Record<string, unknown> = {}) =>
  JSON.stringify({
    entendi: true,
    correcao: null,
    passos: [],
    fala: 'はい、コーヒーですね。',
    traducao: 'Certo, um café.',
    dica: 'Pergunte quanto custa.',
    sugestoes: [
      { jp: 'いくらですか', pt: 'Quanto custa?' },
      { jp: 'お会計をお願いします', pt: 'A conta, por favor.' },
    ],
    ...r,
  });

/** Nuvem falsa: só entra com `certa`, e depois disso responde como a de verdade. */
async function nuvemFalsa(page: Page, certa: string, conversa?: (n: number) => [unknown, number]) {
  let sessao = false;
  const senhas: string[] = [];
  let conversas = 0;
  await page.route('http://127.0.0.1:8791/**', (r) => r.abort('connectionrefused'));
  await page.route('**/api/estado', (r) =>
    sessao
      ? json(r, { ok: true, nuvem: true, conversa: { ok: true, modelo: 'gemma-4-26b-a4b-it' }, fala: { ok: true }, voz: { ok: false, motor: 'navegador' } })
      : json(r, { erro: 'sessao' }, 401),
  );
  await page.route('**/api/entrar', (r) => {
    const { senha } = r.request().postDataJSON() as { senha: string };
    senhas.push(senha);
    if (senhas.length > 3) return json(r, { erro: 'tentativas', esperar: 840 }, 429);
    if (senha !== certa) return json(r, { erro: 'senha', restam: 5 - senhas.length }, 401);
    sessao = true;
    return json(r, { ok: true, vence: 0 });
  });
  await page.route('**/api/conversa', (r) => {
    if (!sessao) return json(r, { erro: 'sessao' }, 401);
    const [corpo, status] = conversa?.(conversas++) ?? [{ texto: resposta(), ms: 5 }, 200];
    return json(r, corpo, status);
  });
  await page.route('**/api/leitura', (r) => {
    const { texto } = r.request().postDataJSON() as { texto: string };
    return json(r, { tokens: [{ t: texto }] });
  });
  return { senhas };
}

async function abrir(page: Page) {
  await page.goto('/');
  await page.locator('.tile', { hasText: 'Conversa por voz' }).click();
}

test('sem sessão, a Conversa pede a senha; errada é recusada, certa abre o menu', async ({ page }) => {
  const nuvem = await nuvemFalsa(page, 'certa-de-teste');
  await abrir(page);
  await expect(page.getByTestId('cv')).toHaveAttribute('data-phase', 'senha');
  const campo = page.getByTestId('cv-senha-campo');
  await expect(campo).toHaveAttribute('type', 'password');
  await expect(campo).toBeFocused();

  await campo.fill('chute');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cv-senha-aviso')).toContainText('Senha errada. Mais 4 tentativas');
  await expect(page.getByTestId('cv')).toHaveAttribute('data-phase', 'senha');

  await campo.fill('certa-de-teste');
  await page.getByTestId('cv-senha-entrar').click();
  await expect(page.getByTestId('cv')).toHaveAttribute('data-phase', 'menu');
  expect(nuvem.senhas).toEqual(['chute', 'certa-de-teste']);
  // A senha não fica guardada na página.
  const guardado = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie);
  expect(guardado).not.toContain('certa-de-teste');
});

test('muitas tentativas: a tela pede para esperar', async ({ page }) => {
  await nuvemFalsa(page, 'certa-de-teste');
  await abrir(page);
  const campo = page.getByTestId('cv-senha-campo');
  for (const chute of ['a', 'b', 'c', 'd']) {
    await campo.fill(chute);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('cv-senha-aviso')).toBeVisible();
  }
  await expect(page.getByTestId('cv-senha-aviso')).toContainText('Muitas tentativas. Espere 14 min');
});

test('Esc na tela de senha volta ao fliperama', async ({ page }) => {
  await nuvemFalsa(page, 'certa-de-teste');
  await abrir(page);
  await expect(page.getByTestId('cv')).toHaveAttribute('data-phase', 'senha');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-now')).toBeVisible();
});

test('com sessão, a conversa vai pela nuvem; cota do dia acabou vira aviso amigável', async ({ page }) => {
  await nuvemFalsa(page, 'certa-de-teste', (n) => (n === 0 ? [{ texto: resposta({ passos: ['pedir'] }), ms: 5 }, 200] : [{ erro: 'limite' }, 429]));
  await abrir(page);
  await page.getByTestId('cv-senha-campo').fill('certa-de-teste');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cv')).toHaveAttribute('data-phase', 'menu');
  await page.keyboard.press('Enter');
  // Antes de conversar, as palavras novas da situação.
  await passarApresentacao(page);
  await expect(page.getByTestId('cv')).toHaveAttribute('data-phase', 'conversa');
  // Na nuvem o microfone também funciona (Whisper no Workers AI).
  await expect(page.getByTestId('cv-mic')).toBeEnabled();

  await page.getByTestId('cv-text').fill('koohii o kudasai');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cv-npc')).toHaveCount(2);
  await expect(page.getByTestId('cv-npc').last()).toContainText('コーヒーですね');
  await expect(page.getByTestId('cv-goals').locator('li.done')).toHaveCount(1);

  await page.getByTestId('cv-text').fill('ikura desu ka');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cv-note')).toContainText('cota de hoje');
  await expect(page.getByTestId('cv-note')).toContainText('21h');
});
