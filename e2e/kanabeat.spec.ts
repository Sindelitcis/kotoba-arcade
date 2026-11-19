import { expect, test, type Page } from '@playwright/test';

const SHOTS = process.env.SHOTS_DIR;

async function open(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Kana Beat/ }).click();
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

test('na nota, a leitura fica em cima da palavra e o significado embaixo', async ({ page }) => {
  await open(page);
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
  await page.goto('/');
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
