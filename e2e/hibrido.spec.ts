import { expect, test, type Page, type Route } from './base';
import { passarApresentacao } from './apoio';

// Modo híbrido: PC ligado e sessão na nuvem. O texto vem da nuvem; ouvir, furigana e voz, do PC.
const PC = 'http://127.0.0.1:8791';
const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const resposta = (fala: string) =>
  JSON.stringify({ entendi: true, correcao: null, passos: [], fala, traducao: 'Certo.', dica: 'Pergunte o preço.', sugestoes: [{ jp: 'いくらですか', pt: 'Quanto custa?' }] });

/** `nuvem`: a fila de status da rota /api/conversa (200 = responde). `sessao: false` = pede senha. */
async function preparar(page: Page, nuvem: number[], sessao = true) {
  const pedidos = { pc: [] as string[], nuvem: [] as string[] };
  await page.route(`${PC}/**`, (r) => {
    const rota = new URL(r.request().url()).pathname;
    pedidos.pc.push(rota);
    if (rota === '/saude') return json(r, { ok: true, placa: { ok: true }, conversa: { ok: true, modelo: 'gemma4:12b' }, fala: { ok: true }, voz: { ok: false, motor: 'nenhum' } });
    if (rota === '/conversa') return json(r, { texto: resposta('はい、ＰＣです。'), ms: 5 });
    if (rota === '/leitura') return json(r, { tokens: [{ t: (r.request().postDataJSON() as { texto: string }).texto }] });
    return json(r, {}, 404);
  });
  await page.route('**/api/**', (r) => {
    const rota = new URL(r.request().url()).pathname.replace(/^.*\/api/, '');
    pedidos.nuvem.push(rota);
    if (rota === '/estado')
      return sessao
        ? json(r, { ok: true, nuvem: true, conversa: { ok: true, modelo: 'gemma-4-26b-a4b-it' }, fala: { ok: true }, voz: { ok: false, motor: 'navegador' } })
        : json(r, { erro: 'sessao' }, 401);
    if (rota === '/conversa') {
      const st = nuvem.shift() ?? 200;
      return st === 200 ? json(r, { texto: resposta('はい、クラウドです。'), ms: 5 }) : json(r, { erro: st === 429 ? 'limite' : 'ia' }, st);
    }
    return json(r, {}, 404);
  });
  return pedidos;
}

async function dizer(page: Page, texto: string) {
  const antes = await page.getByTestId('cv-npc').count();
  await page.getByTestId('cv-text').fill(texto);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cv-npc')).toHaveCount(antes + 1);
}

async function abrirMenu(page: Page) {
  await page.goto('/');
  await page.locator('.tile', { hasText: 'Conversa por voz' }).click();
  await expect(page.getByTestId('cv')).toHaveAttribute('data-phase', 'menu');
}

test('PC ligado e sessão na nuvem: texto da nuvem, furigana do PC; cota acaba e o PC assume sem travar', async ({ page }) => {
  const pedidos = await preparar(page, [200, 429]);
  await abrirMenu(page);
  await expect(page.getByTestId('cv-onde')).toContainText('texto na nuvem (gemma-4-26b-a4b-it)');
  await expect(page.getByTestId('cv-onde')).toContainText('furigana e voz no seu PC');
  await page.keyboard.press('Enter');
  // Antes de conversar, as palavras novas da situação.
  await passarApresentacao(page);
  await expect(page.getByTestId('cv')).toHaveAttribute('data-phase', 'conversa');

  await dizer(page, 'koohii o kudasai');
  await expect(page.getByTestId('cv-npc').last()).toContainText('クラウド');
  await expect(page.getByTestId('cv-modelo')).toHaveAttribute('data-onde', 'nuvem');
  await expect(page.getByTestId('cv-modelo')).toContainText('gemma-4-26b-a4b-it (nuvem)');

  await dizer(page, 'ikura desu ka');
  await expect(page.getByTestId('cv-npc').last()).toContainText('ＰＣ');
  await expect(page.getByTestId('cv-modelo')).toHaveAttribute('data-onde', 'pc');
  await expect(page.getByTestId('cv-modelo')).toContainText('gemma4:12b (seu PC, porque a cota da nuvem acabou)');
  await expect(page.getByTestId('cv-note')).toHaveCount(0);

  // Cota acabou: a próxima fala nem tenta a nuvem.
  await dizer(page, 'hai');
  expect(pedidos.nuvem.filter((r) => r === '/conversa')).toHaveLength(2);
  expect(pedidos.pc.filter((r) => r === '/conversa')).toHaveLength(2);
  // Furigana sempre pelo PC (MeCab), nunca pela nuvem.
  expect(pedidos.pc).toContain('/leitura');
  expect(pedidos.nuvem).not.toContain('/leitura');
});

test('nuvem com erro no meio: o PC responde aquela fala e a seguinte volta para a nuvem', async ({ page }) => {
  await preparar(page, [500, 200]);
  await abrirMenu(page);
  await page.keyboard.press('Enter');
  // Antes de conversar, as palavras novas da situação.
  await passarApresentacao(page);
  await dizer(page, 'koohii o kudasai');
  await expect(page.getByTestId('cv-modelo')).toContainText('porque a nuvem não respondeu');
  await dizer(page, 'ikura desu ka');
  await expect(page.getByTestId('cv-modelo')).toHaveAttribute('data-onde', 'nuvem');
});

test('PC ligado sem sessão na nuvem: tudo no PC, com o convite para entrar', async ({ page }) => {
  const pedidos = await preparar(page, [], false);
  await abrirMenu(page);
  await expect(page.getByTestId('cv-onde')).toContainText('no seu PC (gemma4:12b)');
  await expect(page.getByTestId('cv-entrar-nuvem')).toBeVisible();
  await page.keyboard.press('Enter');
  // Antes de conversar, as palavras novas da situação.
  await passarApresentacao(page);
  await dizer(page, 'koohii o kudasai');
  await expect(page.getByTestId('cv-npc').last()).toContainText('ＰＣ');
  expect(pedidos.nuvem).not.toContain('/conversa');

});
