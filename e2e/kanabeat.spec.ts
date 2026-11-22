import { expect, test, type Page } from '@playwright/test';
import { chavesDosKana, chavesDosKanji, firmarCartas, passarApresentacao } from './apoio';

const SHOTS = process.env.SHOTS_DIR;

/**
 * Abre o Kana Beat. Por padrão como quem já estudou tudo (as regras do ritmo valem para a cobrança);
 * `novo`: jogador novo, que passa antes pela apresentação.
 */
async function open(page: Page, novo = false) {
  await page.goto('/');
  if (!novo) await firmarCartas(page, [...chavesDosKanji(), ...chavesDosKana()]);
  await page.getByRole('button', { name: /Kana Beat/ }).click();
  if (novo) await passarApresentacao(page);
  await expect(page.getByTestId('target-note')).toBeVisible();
}

/** Digita a nota da vez quando ela chega perto da linha. */
async function hitTarget(page: Page) {
  const note = page.getByTestId('target-note');
  await expect.poll(async () => parseFloat((await note.getAttribute('style'))?.match(/left: ([\d.-]+)%/)?.[1] ?? '99'), { timeout: 15_000, intervals: [40] }).toBeLessThan(20);
  await page.keyboard.type((await note.getAttribute('data-romaji')) ?? '');
}

test('digitar a leitura na linha pontua e sobe o combo', async ({ page }) => {
  await open(page);
  await hitTarget(page);
  await hitTarget(page);
  await expect(page.getByTestId('score')).not.toHaveText('0');
  await expect(page.locator('.combo')).toHaveText('Combo x2');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/kanabeat-jogo.png` });
});

test('jogador novo: as palavras são apresentadas antes da música, e a nota em prática traz o romaji', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Kana Beat/ }).click();
  await expect(page.getByTestId('kb-apresenta')).toBeVisible();
  // A música espera: nada anda enquanto apresenta.
  await expect(page.getByTestId('score')).toHaveText('0');
  const n = await passarApresentacao(page);
  expect(n).toBeGreaterThanOrEqual(3);
  expect(n).toBeLessThanOrEqual(5);
  await expect(page.getByTestId('kb-apresenta')).toHaveCount(0);
  await expect(page.getByTestId('target-note').locator('.kb-hint')).not.toBeEmpty();
});

test('na prática, deixar a nota passar não zera o combo', async ({ page }) => {
  await open(page, true);
  await hitTarget(page);
  const combo = await page.locator('.combo').innerText();
  // Deixa a próxima passar sem digitar nada.
  const note = page.getByTestId('target-note');
  const antes = await note.getAttribute('data-romaji');
  await expect.poll(async () => (await note.getAttribute('data-romaji')) !== antes || !(await note.isVisible()), { timeout: 20_000 }).toBe(true);
  await expect(page.locator('.kb-judge.miss')).toContainText('prática: o combo fica');
  await expect(page.locator('.combo')).toHaveText(combo);
});

test('na nota, a leitura fica em cima da palavra e o significado embaixo', async ({ page }) => {
  await open(page, true);
  const note = page.getByTestId('target-note');
  const furi = await note.locator('.kb-furi').boundingBox();
  const text = await note.locator('.kb-text').boundingBox();
  const pt = await note.locator('.kb-pt').boundingBox();
  expect(furi!.y + furi!.height).toBeLessThanOrEqual(text!.y + 1);
  expect(text!.y + text!.height).toBeLessThanOrEqual(pt!.y + 1);
});

test('tecla errada não pontua e a nota continua na vez', async ({ page }) => {
  await open(page);
  const note = page.getByTestId('target-note');
  const romaji = (await note.getAttribute('data-romaji')) ?? '';
  await page.keyboard.press(romaji.startsWith('q') ? 'x' : 'q');
  await expect(page.getByTestId('score')).toHaveText('0');
  await expect(note).toHaveAttribute('data-romaji', romaji);
});

test('espaço pausa e qualquer tecla volta', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: 'Pausado' })).toBeVisible();
  const before = await page.getByTestId('target-note').getAttribute('style');
  await page.waitForTimeout(400);
  expect(await page.getByTestId('target-note').getAttribute('style')).toBe(before);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Pausado' })).toBeHidden();
});

test('a pausa congela as notas na hora, sem um último quadro andando por baixo do aviso', async ({ page }) => {
  // O laço ainda rodava um quadro depois da pausa e a nota dava um pulinho com "Pausado" já na tela.
  await open(page);
  await page.waitForTimeout(300);
  const styles = await page.evaluate(async () => {
    const style = () => document.querySelector('[data-testid="target-note"]')?.getAttribute('style') ?? '';
    dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    const seen = [style()];
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => setTimeout(r, 0));
      seen.push(style());
    }
    return seen;
  });
  await expect(page.getByRole('heading', { name: 'Pausado' })).toBeVisible();
  expect(styles[0]).not.toBe('');
  expect(new Set(styles).size).toBe(1);
});

test('a música sempre termina e mostra o resultado, mesmo sem tocar em nada', async ({ page }) => {
  await page.clock.install();
  await open(page);
  await page.clock.runFor(180_000);
  await expect(page.getByTestId('grade')).toHaveText('C');
  await expect(page.locator('.kb-missed')).toContainText('Para olhar de novo');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/kanabeat-resultado.png` });
  await page.getByTestId('next-song').click();
  await expect(page.getByTestId('grade')).toBeHidden();
  await expect(page.locator('.kb-mode')).toContainText('Hiragana');
});

test('Esc volta ao fliperama e o botão principal passa a continuar no Kana Beat', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-now')).toContainText('Kana Beat');
});

test('com o teclado japonês do Windows ligado (tecla chega como Process/229) a digitação ainda conta', async ({ page }) => {
  // Bug de 19/11/2026: com o IME japonês ativo o Chrome manda key "Process" e keyCode 229 em vez da letra.
  // O jogo só olhava e.key e jogava tudo fora. page.keyboard.type sempre manda a letra limpa, por isso o teste antigo passava.
  await open(page);
  const cdp = await page.context().newCDPSession(page);
  const note = page.getByTestId('target-note');
  await expect.poll(async () => parseFloat((await note.getAttribute('style'))?.match(/left: ([\d.-]+)%/)?.[1] ?? '99'), { timeout: 15_000, intervals: [40] }).toBeLessThan(20);
  const romaji = (await note.getAttribute('data-romaji')) ?? '';
  for (const ch of romaji) {
    const code = `Key${ch.toUpperCase()}`;
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Process', code, windowsVirtualKeyCode: 229, nativeVirtualKeyCode: 229 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch, code, windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0) });
  }
  await expect(page.getByTestId('score')).not.toHaveText('0');
});

test('a fase toca uma faixa de verdade e a tela de créditos mostra autor e licença', async ({ page }) => {
  const ogg = page.waitForResponse((r) => /\/assets\/.*\.ogg$/.test(r.url()) && r.ok());
  await page.clock.install();
  await open(page);
  await ogg;
  await expect(page.getByTestId('song')).toContainText('·');
  await page.clock.runFor(180_000);
  await expect(page.getByTestId('grade')).toBeVisible();
  await page.keyboard.press('c');
  const credits = page.locator('.kb-credits li');
  await expect(credits).toHaveCount(8);
  await expect(credits.first()).toContainText('Holizna');
  await expect(page.locator('.kb-credits')).toContainText('CC-BY 4.0');
  await page.keyboard.press('Escape');
  await expect(page.locator('.kb-credits')).toBeHidden();
  await expect(page.getByTestId('grade')).toBeVisible();
});

test('a primeira tecla logo que o Kana Beat abre não se perde', async ({ page }) => {
  // O ouvinte de teclado ligava depois da pintura: um espaço apertado logo ao abrir não pausava.
  // Quem já estudou tudo: a música começa direto, sem apresentação.
  await page.goto('/');
  await firmarCartas(page, [...chavesDosKanji(), ...chavesDosKana()]);
  await expect(page.getByRole('heading', { name: 'Kotoba Arcade' })).toBeVisible();
  await page.evaluate(async () => {
    dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', bubbles: true }));
    // A tela troca e é desenhada, mas ainda não foi pintada.
    await new Promise<void>((r) => queueMicrotask(r));
    await new Promise<void>((r) => queueMicrotask(r));
    if (!document.querySelector('.kb')) throw new Error('Kana Beat ainda não apareceu');
    dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  });
  await expect(page.getByRole('heading', { name: 'Pausado' })).toBeVisible();
});

// O Rafael não conseguia digitar nem clicando na caixa. A caixa agora é um campo de verdade,
// marcado como do jogo, que fica sempre com o foco: o IME do Windows e extensões que só
// entregam teclas a campos de texto passam a chegar no jogo.
test('a caixa de digitar já abre com o foco e mostra cada letra digitada', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('entrada')).toBeFocused();
  const romaji = (await page.getByTestId('target-note').getAttribute('data-romaji')) ?? '';
  await page.keyboard.press(romaji[0] as string);
  await expect(page.getByTestId('typed')).toHaveText(romaji[0] as string);
});

test('clicar em qualquer lugar da tela não tira o teclado do jogo', async ({ page }) => {
  await open(page);
  await page.getByTestId('song').click();
  // Perto do canto, mas dentro da curva da borda arredondada.
  await page.getByTestId('kb-track').click({ position: { x: 30, y: 30 } });
  await expect(page.getByTestId('entrada')).toBeFocused();
  await hitTarget(page);
  await expect(page.getByTestId('score')).not.toHaveText('0');
});

test('com o teclado japonês ligado, a tecla no meio da composição conta pela posição', async ({ page }) => {
  await open(page);
  const romaji = (await page.getByTestId('target-note').getAttribute('data-romaji')) ?? '';
  const ch = romaji[0] as string;
  await page.evaluate((c) => {
    const ev = new KeyboardEvent('keydown', { key: 'Process', code: `Key${c.toUpperCase()}`, isComposing: true, bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'keyCode', { get: () => 229 });
    document.activeElement?.dispatchEvent(ev);
  }, ch);
  await expect(page.getByTestId('typed')).toHaveText(ch);
});

test('letra errada aparece riscada na caixa', async ({ page }) => {
  await open(page);
  const romaji = (await page.getByTestId('target-note').getAttribute('data-romaji')) ?? '';
  const errada = romaji.startsWith('q') ? 'x' : 'q';
  await page.keyboard.press(errada);
  await expect(page.locator('.kb-wrong')).toHaveText(errada);
});

test('jogador novo: no fim, as notas de prática que passaram voltam numa apresentação antes do resultado', async ({ page }) => {
  await page.clock.install();
  await open(page, true);
  await page.clock.runFor(180_000);
  await expect(page.getByTestId('kb-de-novo')).toBeVisible();
  await expect(page.getByTestId('grade')).toHaveCount(0);
  await passarApresentacao(page);
  await expect(page.getByTestId('grade')).toBeVisible();
});
