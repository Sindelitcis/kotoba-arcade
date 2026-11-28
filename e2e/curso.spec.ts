import { passarApresentacao } from './apoio';
import { expect, test, type Page } from './base';

const SHOTS = process.env.SHOTS_DIR;
const SAVE_KEY = 'kotoba-arcade:save';

test.beforeEach(async ({ page }) => {
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.route('http://127.0.0.1:8791/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByTestId('hub-curso')).toBeVisible();
});

/** Responde a prática até o bloco acabar: a certa, menos na primeira pergunta, que erra de propósito. */
async function praticar(page: Page, errarPrimeira: boolean): Promise<void> {
  let errou = !errarPrimeira;
  for (let volta = 0; volta < 40; volta++) {
    if (await page.getByTestId('cs-intervalo').isVisible()) return;
    // Errou: o cartão volta ("Olhe de novo") antes da próxima pergunta.
    if (await page.getByTestId('apresentacao').isVisible()) {
      await expect(page.getByTestId('apresentacao')).toHaveAttribute('data-modo', 'de-novo');
      await passarApresentacao(page);
      continue;
    }
    const pergunta = page.getByTestId('cs-pergunta');
    await expect(pergunta).toBeVisible();
    const opcoes = page.getByTestId('cs-opcao');
    const n = await opcoes.count();
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(4);
    const certas = await opcoes.evaluateAll((els) => els.map((e) => e.hasAttribute('data-certa')));
    let i = certas.indexOf(true);
    const errando = !errou;
    if (errando) {
      i = certas.indexOf(false);
      errou = true;
    }
    const marcada = (await opcoes.nth(i).locator('span').textContent()) ?? '';
    await page.keyboard.press(String(i + 1));
    // A resposta fica na tela até a pessoa seguir.
    await expect(page.getByTestId('cs-retorno')).toBeVisible();
    // No erro, diz o que é a alternativa marcada.
    if (errando) await expect(page.getByTestId('cs-explica-erro')).toContainText(marcada);
    else await expect(page.getByTestId('cs-explica-erro')).toHaveCount(0);
    await page.waitForTimeout(300);
    await expect(page.getByTestId('cs-retorno')).toBeVisible();
    await page.keyboard.press('Enter');
  }
  throw new Error('a prática não terminou');
}

test('aluno do zero: o Enter abre o Módulo 0, não a unidade 1', async ({ page }) => {
  await expect(page.getByTestId('hub-curso')).toContainText('Módulo 0');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-hub.png` });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('m0-intro')).toBeVisible();
});

// Quem saía da lição de kana com Esc caía no mapa, e o Continuar dali pulava para a unidade 1.
test('aluno do zero: o Continuar do mapa também leva ao Módulo 0', async ({ page }) => {
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('m0-intro')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('cs-continuar')).toHaveAttribute('data-passo', 'kana');
  await expect(page.getByTestId('cs-continuar')).toContainText('Módulo 0');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('m0-intro')).toBeVisible();
});

test('quem já lê kana começa pela unidade 1: objetivo, palavras, prática, e o progresso fica salvo', async ({ page }) => {
  await page.getByTestId('hub-ja-sei-kana').click();
  await expect(page.getByTestId('cs-objetivo')).toContainText('me apresentar');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-objetivo.png` });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cs-intervalo')).toBeVisible();
  await page.keyboard.press('Enter');

  // Bloco de palavras: a apresentação vem antes de qualquer pergunta.
  await expect(page.getByTestId('cs-parte')).toContainText('Vocabulário');
  await expect(page.getByTestId('cs-pergunta')).toHaveCount(0);
  const total = await passarApresentacao(page);
  expect(total).toBeGreaterThanOrEqual(3);
  expect(total).toBeLessThanOrEqual(5);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-pratica.png` });
  await praticar(page, true);
  await expect(page.getByTestId('cs-intervalo')).toContainText('Parte 2 de');

  // Parar aqui e voltar: o curso continua da parte 3.
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('hub-curso')).toContainText('Parte 3 de');
  await page.reload();
  await expect(page.getByTestId('hub-curso')).toContainText('Parte 3 de');

  // A parte 3 é o kanji das palavras que acabaram de entrar, com a leitura usada nelas.
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cs-parte')).toContainText('Kanji');
  const cartao = page.getByTestId('apresentacao');
  await expect(cartao).toContainText('se lê');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-kanji.png` });
  await passarApresentacao(page);
  await praticar(page, false);
});

test('a unidade 2 só libera depois da prova da 1; com ela aprovada, abre', async ({ page }) => {
  await page.keyboard.press('u');
  const u2 = page.locator('[data-testid="cs-unidade"][data-unidade="a1-02"]');
  await expect(u2).toBeDisabled();
  await expect(u2).toContainText('Libera depois da unidade 1');
  // O mapa separa os níveis; a primeira do A2 espera a última do A1 e diz de qual nível é.
  await expect(page.getByTestId('cs-nivel')).toHaveCount(2);
  await expect(page.getByTestId('cs-nivel').nth(1)).toContainText('A2 · JLPT N4');
  await expect(page.locator('[data-testid="cs-unidade"][data-unidade="a2-02"]')).toContainText('Libera depois da unidade 1 do A2');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-mapa.png` });

  await page.evaluate((chave) => {
    const save = JSON.parse(localStorage.getItem(chave) ?? '{}');
    save.games ??= {};
    save.games.curso = { feitos: { 'a1-01': 99 }, concluidas: { 'a1-01': 1 }, provas: { 'a1-01': { melhor: 0.9, aprovada: true, tentativas: 1 } } };
    localStorage.setItem(chave, JSON.stringify(save));
  }, SAVE_KEY);
  await page.reload();
  await expect(page.getByTestId('hub-curso')).toContainText('Unidade 2');
  await page.keyboard.press('u');
  await expect(u2).toBeEnabled();
  await expect(page.locator('[data-testid="cs-unidade"][data-unidade="a1-03"]')).toBeDisabled();
  await expect(page.locator('[data-testid="cs-unidade"][data-unidade="a1-01"]')).toContainText('Feita');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cs-objetivo')).toContainText('números');
});

/** Grava um save de curso e recarrega. */
async function comCurso(page: Page, curso: unknown): Promise<void> {
  await page.evaluate(
    ([chave, c]) => {
      // Sem a versão, o site descarta o save: o da página nova pode ainda não ter sido gravado.
      const save = JSON.parse(localStorage.getItem(chave as string) ?? '{"v":2}');
      save.games ??= {};
      // A ordem das partes atual: sem ela, o site trata o save como antigo e recua quem está no meio.
      save.games.curso = { partes: 2, ...(c as object) };
      localStorage.setItem(chave as string, JSON.stringify(save));
    },
    [SAVE_KEY, curso],
  );
  await page.reload();
}

/** Responde a prova inteira: a certa nas `certas` primeiras, a errada no resto. */
async function responderProva(page: Page, certas: number): Promise<number> {
  const total = Number((await page.getByTestId('pv-inicio').textContent())?.match(/(\d+) questões/)?.[1]);
  expect(total).toBeGreaterThan(0);
  await page.keyboard.press('Enter');
  for (let n = 0; n < total; n++) {
    const q = page.getByTestId('pv-questao');
    await expect(q).toHaveAttribute('data-n', String(n + 1));
    const opcoes = page.getByTestId('pv-opcao');
    await expect(opcoes).toHaveCount(4);
    const marcas = await opcoes.evaluateAll((els) => els.map((e) => e.hasAttribute('data-certa')));
    const i = n < certas ? marcas.indexOf(true) : marcas.indexOf(false);
    // Sem escolher, Enter não passa: nada avança sozinho.
    await page.keyboard.press('Enter');
    await expect(q).toHaveAttribute('data-n', String(n + 1));
    await page.keyboard.press(String(i + 1));
    await expect(opcoes.nth(i)).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Enter');
  }
  return total;
}

test('com as partes feitas, falta a prova: passando com 80%, a unidade 2 abre', async ({ page }) => {
  await comCurso(page, { feitos: { 'a1-01': 99 }, concluidas: { 'a1-01': 1 } });
  await expect(page.getByTestId('hub-curso')).toContainText('Falta a prova');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pv-inicio')).toContainText('Passa com 80%');
  await expect(page.getByTestId('pv-codigo')).toHaveText(/^U01-[A-Z2-9]{4}$/);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-prova-inicio.png` });
  const total = await responderProva(page, 1e9);
  const resultado = page.getByTestId('pv-resultado');
  await expect(resultado).toHaveAttribute('data-aprovada', '1');
  await expect(resultado).toContainText(`${total} de ${total}`);
  await expect(resultado).toContainText('unidade 2');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-prova-resultado.png` });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cs-objetivo')).toContainText('números');
  // A aprovação fica salva.
  await page.reload();
  await expect(page.getByTestId('hub-curso')).toContainText('Unidade 2');
});

test('reprovou: mostra o que errou, revê os cartões e faz outra prova; a unidade 2 continua trancada', async ({ page }) => {
  await comCurso(page, { feitos: { 'a1-01': 99 }, concluidas: { 'a1-01': 1 } });
  await page.keyboard.press('Enter');
  const codigo = await page.getByTestId('pv-codigo').textContent();
  await responderProva(page, 2);
  const resultado = page.getByTestId('pv-resultado');
  await expect(resultado).toHaveAttribute('data-aprovada', '0');
  await expect(resultado).toContainText('O que errou');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('apresentacao')).toHaveAttribute('data-modo', 'de-novo');
  await passarApresentacao(page);
  await expect(page.getByTestId('pv-inicio')).toBeVisible();
  await expect(page.getByTestId('pv-codigo')).not.toHaveText(codigo ?? '');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.keyboard.press('u');
  await expect(page.locator('[data-testid="cs-unidade"][data-unidade="a1-02"]')).toBeDisabled();
  await expect(page.locator('[data-testid="cs-unidade"][data-unidade="a1-01"]')).toContainText('Falta a prova');
});

test('a prova impressa e o gabarito do mesmo código batem', async ({ page }) => {
  await page.goto('/?imprimir=prova&codigo=U04-K7QH');
  await expect(page.getByTestId('im-codigo')).toHaveText('U04-K7QH');
  await expect(page.getByTestId('im-qr-gabarito').locator('svg')).toBeVisible();
  // A prova da unidade 4 já tem escuta: o áudio dela vem num QR à parte.
  await expect(page.getByTestId('im-qr-escuta').locator('svg')).toBeVisible();
  const questoes = await page.locator('.im-questao').count();
  expect(questoes).toBeGreaterThanOrEqual(10);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-prova-impressa.png`, fullPage: true });
  await page.goto('/?gabarito=u04-k7qh');
  await expect(page.getByTestId('im-resposta')).toHaveCount(questoes);
  await page.goto('/?imprimir=apostila&unidade=a1-04');
  await expect(page.getByTestId('im-apostila')).toBeVisible();
  await page.goto('/?imprimir=escrita&unidade=a1-04');
  await expect(page.locator('.im-caixa.modelo').first()).toBeVisible();
});

test('o código digitado no mapa abre o gabarito', async ({ page }) => {
  await page.keyboard.press('u');
  await page.getByTestId('cs-codigo').fill('u04 zzzz');
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: 'Ver o gabarito' }).click()]);
  await expect(popup.getByTestId('im-gabarito')).toBeVisible();
});

test('nivelamento: "Não sei" na unidade 1 começa o curso nela, sem pular nada', async ({ page }) => {
  await page.keyboard.press('u');
  await page.getByTestId('cs-nivelamento').click();
  await page.keyboard.press('Enter');
  for (let i = 0; i < 4; i++) {
    await expect(page.getByTestId('nv-questao')).toHaveAttribute('data-unidade', 'a1-01');
    await page.keyboard.press('0');
  }
  await expect(page.getByTestId('nv-fim')).toContainText('unidade 1');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cs-objetivo')).toBeVisible();
});

test('nivelamento: quem acerta a unidade 1 pula para a 2', async ({ page }) => {
  await page.keyboard.press('u');
  await page.getByTestId('cs-nivelamento').click();
  await page.keyboard.press('Enter');
  for (let i = 0; i < 4; i++) {
    await expect(page.getByTestId('nv-questao')).toHaveAttribute('data-unidade', 'a1-01');
    const marcas = await page.getByTestId('nv-opcao').evaluateAll((els) => els.map((e) => e.hasAttribute('data-certa')));
    await page.keyboard.press(String(marcas.indexOf(true) + 1));
  }
  await expect(page.getByTestId('nv-questao')).toHaveAttribute('data-unidade', 'a1-02');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('nv-fim')).toContainText('unidade 2');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cs-objetivo')).toContainText('números');
});

test('os jogos continuam no fliperama: Jogar agora abre o KanjiMon', async ({ page }) => {
  await page.getByTestId('play-now').click();
  await expect(page.getByTestId('apresentacao')).toBeVisible();
});

test('aula, gramática com exemplo e montar frases: tudo no ritmo da pessoa', async ({ page }) => {
  // Fluxo longo (acha a aula recarregando parte por parte, depois faz a aula, a gramática e o montar).
  test.setTimeout(60_000);
  // Acha a parte da aula na unidade 1, abrindo o curso em cada parte até chegar nela.
  let achou = false;
  for (let parte = 1; parte < 30 && !achou; parte++) {
    await comCurso(page, { feitos: { 'a1-01': parte }, concluidas: {} });
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('cs-parte')).toBeVisible();
    achou = ((await page.getByTestId('cs-parte').textContent()) ?? '').includes('Aula');
  }
  expect(achou).toBe(true);
  const quadro = page.getByTestId('cs-aula');
  await expect(quadro).toHaveAttribute('data-i', '0');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-aula.png` });
  // Não passa sozinho.
  await page.waitForTimeout(800);
  await expect(quadro).toHaveAttribute('data-i', '0');
  const n = Number((await quadro.locator('.gr-tag').textContent())?.match(/de (\d+)/)?.[1]);
  for (let i = 0; i < n; i++) await page.keyboard.press('Enter');
  await expect(page.getByTestId('cs-intervalo')).toBeVisible();
  await page.keyboard.press('Enter');

  // Gramática: o cartão traz o exemplo com furigana.
  await expect(page.getByTestId('cs-parte')).toContainText('Gramática');
  await expect(page.locator('.ap-exemplo ruby').first()).toBeVisible();
  await passarApresentacao(page);
  await expect(page.getByTestId('cs-intervalo')).toBeVisible();
  await page.keyboard.press('Enter');

  // Montar frases: peça errada avisa e não entra; a certa entra; pronta, toca e espera o Enter.
  await expect(page.getByTestId('cs-parte')).toContainText('Montar frases');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-montar.png` });
  for (let volta = 0; volta < 12; volta++) {
    if (await page.getByTestId('cs-intervalo').isVisible()) break;
    const montar = page.getByTestId('cs-montar');
    await expect(montar).toBeVisible();
    const pt = await montar.locator('.cs-montar-pt').textContent();
    let primeira = true;
    while (!(await page.getByTestId('cs-retorno').isVisible())) {
      const pecas = page.getByTestId('cs-peca');
      const total = await pecas.count();
      let entrou = false;
      for (let k = 0; k < total && !entrou; k++) {
        const antes = await page.locator('.cs-peca.posta').count();
        await pecas.nth(k).click();
        entrou = (await page.locator('.cs-peca.posta').count()) > antes || (await page.getByTestId('cs-retorno').isVisible());
        if (!entrou && primeira) {
          await expect(montar.locator('.lc-retorno')).toBeVisible();
          primeira = false;
        }
      }
      expect(entrou).toBe(true);
    }
    await page.waitForTimeout(300);
    await expect(montar.locator('.cs-montar-pt')).toHaveText(pt ?? '');
    await page.keyboard.press('Enter');
  }
  await expect(page.getByTestId('cs-intervalo')).toBeVisible();
});

/**
 * Abre a unidade na parte cujo nome contém `nome`, abrindo o curso em cada parte até chegar nela.
 * As unidades antes dela ficam com a prova aprovada.
 */
async function irParaParte(page: Page, nome: string, unidade = 'a1-01'): Promise<void> {
  const n = Number(unidade.slice(-2));
  const provas = Object.fromEntries(Array.from({ length: n - 1 }, (_, i) => [`a1-${String(i + 1).padStart(2, '0')}`, { melhor: 1, aprovada: true, tentativas: 1 }]));
  for (let parte = 1; parte < 40; parte++) {
    await comCurso(page, { feitos: { [unidade]: parte }, concluidas: {}, provas, modulo0: 99 });
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('cs-parte')).toBeVisible();
    if (((await page.getByTestId('cs-parte').textContent()) ?? '').includes(nome)) return;
  }
  throw new Error(`parte ${nome} não encontrada`);
}

test('gramática com a tabela de formas e o exercício de transformar', async ({ page }) => {
  test.setTimeout(60_000);
  // Unidade 5: o primeiro cartão é o da forma ます.
  await irParaParte(page, 'Gramática', 'a1-05');
  const tabela = page.getByTestId('ap-formas');
  await expect(tabela).toBeVisible();
  await expect(tabela).toContainText('Como se forma');
  await expect(tabela.locator('tbody tr')).toHaveCount(4);
  await expect(tabela.locator('rt').first()).toBeAttached();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-tabela-formas.png` });
  await passarApresentacao(page);
  await expect(page.getByTestId('cs-intervalo')).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('cs-parte')).toContainText('Formas');
  const formas = page.getByTestId('cs-formas');
  const total = () => formas.locator('.gr-tag').textContent().then((t) => Number(t?.match(/de (\d+)/)?.[1]));
  const n = await total();
  // Errar a primeira: a forma certa e a regra aparecem, e a pergunta volta no fim.
  await page.keyboard.press('Enter');
  await expect(formas).toHaveAttribute('data-i', '0');
  let marcas = await page.getByTestId('cs-opcao').evaluateAll((els) => els.map((e) => e.hasAttribute('data-certa')));
  await page.keyboard.press(String(marcas.indexOf(false) + 1));
  await expect(page.getByTestId('cs-retorno')).toContainText('Esta volta no fim');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-formas-erro.png` });
  expect(await total()).toBe(n + 1);
  await page.keyboard.press('Enter');
  for (let i = 1; i <= n; i++) {
    await expect(formas).toHaveAttribute('data-i', String(i));
    marcas = await page.getByTestId('cs-opcao').evaluateAll((els) => els.map((e) => e.hasAttribute('data-certa')));
    await page.keyboard.press(String(marcas.indexOf(true) + 1));
    await expect(page.getByTestId('cs-retorno')).toContainText('Isso');
    await page.keyboard.press('Enter');
  }
  await expect(page.getByTestId('cs-intervalo')).toBeVisible();
});

test('completar, ditado e leitura com shadowing: nada passa sem a pessoa', async ({ page }) => {
  test.setTimeout(60_000);
  await irParaParte(page, 'Completar');
  const completar = page.getByTestId('cs-completar');
  const n = Number((await completar.locator('.gr-tag').textContent())?.match(/de (\d+)/)?.[1]);
  for (let i = 0; i < n; i++) {
    await expect(completar).toHaveAttribute('data-i', String(i));
    // Sem escolher, Enter não segue.
    await page.keyboard.press('Enter');
    await expect(completar).toHaveAttribute('data-i', String(i));
    const marcas = await page.getByTestId('cs-opcao').evaluateAll((els) => els.map((e) => e.hasAttribute('data-certa')));
    await page.keyboard.press(String(marcas.indexOf(i === 0 ? false : true) + 1));
    await expect(page.getByTestId('cs-retorno')).toContainText(i === 0 ? 'A peça é' : 'Isso');
    if (i === 0 && SHOTS) await page.screenshot({ path: `${SHOTS}/curso-completar.png` });
    await page.keyboard.press('Enter');
  }
  await expect(page.getByTestId('cs-intervalo')).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('cs-parte')).toContainText('Ditado');
  const campo = page.getByTestId('cs-ditado-campo');
  await expect(campo).toBeFocused();
  // A frase toca, mas a legenda não aparece: ela escrevia a resposta do ditado.
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('legenda')).toHaveCount(0);
  // Digitar em romaji vira kana na hora; o R no campo é letra, não "repetir".
  await campo.pressSequentially('watashi');
  await expect(page.getByTestId('cs-ditado-kana')).toHaveText('わたし');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cs-retorno')).toContainText('Compare');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-ditado.png` });
  const d = Number((await page.getByTestId('cs-ditado').locator('.gr-tag').textContent())?.match(/de (\d+)/)?.[1]);
  await page.keyboard.press('Enter');
  for (let i = 1; i < d; i++) {
    await campo.fill('a');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
  }
  await expect(page.getByTestId('cs-intervalo')).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('cs-parte')).toContainText('Leitura');
  await expect(page.locator('.cs-leitura-pt')).toHaveCount(0);
  await page.keyboard.press('t');
  await expect(page.locator('.cs-leitura-pt').first()).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-leitura.png` });
  await page.keyboard.press('Enter');
  const sh = page.getByTestId('cs-shadowing');
  await expect(sh).toHaveAttribute('data-i', '0');
  await page.waitForTimeout(600);
  await expect(sh).toHaveAttribute('data-i', '0');
  const f = Number((await sh.locator('.gr-tag').textContent())?.match(/de (\d+)/)?.[1]);
  for (let i = 0; i < f; i++) await page.keyboard.press('Enter');
  await expect(page.getByTestId('cs-intervalo')).toBeVisible();
});

test('simulado do A1 no formato do JLPT: aprovado, mostra a escala e abre o certificado com o nome', async ({ page }) => {
  const provas: Record<string, unknown> = {};
  for (let n = 1; n <= 19; n++) provas[`a1-${String(n).padStart(2, '0')}`] = { melhor: 0.9, aprovada: true, tentativas: 1 };
  await comCurso(page, { feitos: { 'a1-20': 99 }, concluidas: { 'a1-20': 1 }, provas });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pv-inicio')).toContainText('JLPT N5');
  await responderProva(page, 1e9);
  const resultado = page.getByTestId('pv-resultado');
  await expect(resultado).toHaveAttribute('data-aprovada', '1');
  await expect(page.getByTestId('pv-jlpt')).toContainText('180 de 180');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-simulado.png` });
  await page.getByTestId('pv-nome').fill('Rafael');
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByTestId('pv-abrir-certificado').click()]);
  await expect(popup.getByTestId('im-cert-nome')).toHaveText('Rafael');
  if (SHOTS) await popup.screenshot({ path: `${SHOTS}/curso-certificado.png` });
});

test('Módulo 0: a lição de kana apresenta, treina e marca o lote como feito', async ({ page }) => {
  await page.keyboard.press('u');
  await page.locator('[data-testid="cs-licao-kana"][data-id="m0-1"]').click();
  await expect(page.getByTestId('m0-intro')).toContainText('vogais');
  await page.keyboard.press('Enter');
  await passarApresentacao(page);
  const treino = page.getByTestId('m0-treino');
  await expect(treino).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-modulo0.png` });
  const n = Number((await treino.locator('.gr-tag').textContent())?.match(/de (\d+)/)?.[1]);
  for (let i = 0; i < n; i++) {
    await expect(treino).toHaveAttribute('data-i', String(i));
    const marcas = await page.getByTestId('m0-opcao').evaluateAll((els) => els.map((e) => e.hasAttribute('data-certa')));
    await page.keyboard.press(String(marcas.indexOf(true) + 1));
    await page.keyboard.press('Enter');
  }
  // O lote seguinte da mesma lição começa pela apresentação; o progresso fica salvo.
  await expect(page.locator('[data-testid="m0-treino"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="cs-licao-kana"][data-id="m0-1"]')).toContainText('1 de 3');
});
