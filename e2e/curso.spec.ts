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
    expect(n).toBeLessThanOrEqual(3);
    const certas = await opcoes.evaluateAll((els) => els.map((e) => e.hasAttribute('data-certa')));
    let i = certas.indexOf(true);
    if (!errou) {
      i = certas.indexOf(false);
      errou = true;
    }
    await page.keyboard.press(String(i + 1));
    // A resposta fica na tela até a pessoa seguir.
    await expect(page.getByTestId('cs-retorno')).toBeVisible();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('cs-retorno')).toBeVisible();
    await page.keyboard.press('Enter');
  }
  throw new Error('a prática não terminou');
}

test('Enter na tela inicial continua o curso: objetivo, palavras, prática, e o progresso fica salvo', async ({ page }) => {
  await expect(page.getByTestId('hub-curso')).toContainText('Unidade 1');
  await expect(page.getByTestId('hub-curso')).toContainText('Parte 1 de');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/curso-hub.png` });

  await page.keyboard.press('Enter');
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
      save.games.curso = c;
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
  await expect(page.locator('.im-qr svg')).toBeVisible();
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
