import { expect, test, type Page } from './base';
import { chavesDosKanji, firmarCartas, passarApresentacao, seguir } from './apoio';

test.beforeEach(async ({ page }) => {
  // As artes vêm de outro site; nos testes ficam de fora para não depender de rede.
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  await page.goto('/');
});

/** Entra na caçada pelo botão grande (o atalho Enter tem teste próprio) e passa pela apresentação. */
async function startHunt(page: Page): Promise<number> {
  await page.getByTestId('play-now').click();
  const n = await passarApresentacao(page);
  await expect(page.getByTestId('enemy-kanji')).toBeVisible();
  return n;
}

/** Tudo já firme, de quem já estudou: a caçada cobra direto, sem apresentação nem prática. */
async function firmarTudo(page: Page) {
  await page.getByTestId('play-now').click();
  await passarApresentacao(page);
  await page.keyboard.press('Escape');
  await firmarCartas(page, chavesDosKanji());
}

/** Responde certo e fecha avisos até aparecer o aviso com o título pedido. */
async function playUntilOverlay(page: Page, title: string) {
  for (let i = 0; i < 200; i++) {
    if (await page.getByTestId('apresentacao').isVisible()) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);
      continue;
    }
    const heading = page.locator('.overlay h2');
    if (await heading.isVisible()) {
      if ((await heading.innerText()) === title) return;
      await page.keyboard.press('Enter');
      await page.waitForTimeout(120);
      continue;
    }
    const right = page.locator('[data-answer="yes"]:not(.right)');
    if (await page.getByTestId('seguir').isVisible()) await page.getByTestId('seguir').click();
    else if (await right.isVisible()) await right.click();
    await page.waitForTimeout(120);
  }
  throw new Error(`não chegou em "${title}"`);
}

test('do fliperama para a caçada com uma tecla: primeiro os kanji novos são apresentados, depois a prática', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Kotoba Arcade' })).toBeVisible();
  // Uma tecla só, logo que a página abre. O ouvinte ligava depois da pintura e a tecla se perdia.
  // (O Enter agora continua o curso; o atalho do KanjiMon é o C.)
  await page.keyboard.press('c');
  const cartao = page.getByTestId('apresentacao');
  await expect(cartao).toHaveAttribute('data-item', 'k:一#meaning');
  await expect(cartao).toContainText('um');
  // Nada de pergunta enquanto apresenta.
  await expect(page.getByTestId('enemy-kanji')).toHaveCount(0);
  const n = await passarApresentacao(page);
  expect(n).toBeGreaterThanOrEqual(3);
  expect(n).toBeLessThanOrEqual(5);
  await expect(page.getByTestId('enemy-kanji')).toBeVisible();
  // Prática: dica, duas opções, sem digitar.
  await expect(page.getByTestId('km-pratica')).toBeVisible();
  await expect(page.getByTestId('km-dica')).not.toBeEmpty();
  await expect(page.locator('.choice')).toHaveCount(2);
  await expect(page.getByTestId('hearts').locator('.heart.on')).toHaveCount(5);
});

test('acertar quebra os selos, captura a carta e paga moedas', async ({ page }) => {
  const apresentados = await startHunt(page);
  await playUntilOverlay(page, 'Capturado!');
  await expect(page.locator('.overlay')).toContainText('carta nova');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('coins')).not.toHaveText('0');
  // Os apresentados já contam como vistos.
  await expect(page.getByTestId('kanji-seen')).toHaveText(String(apresentados));
});

test('acertar com o mouse em cima da resposta ainda mostra o verde do acerto e a palavra ドン', async ({ page }) => {
  // O hover dos botões ganhava do estilo de acerto e a resposta certa ficava sem cor nenhuma.
  await startHunt(page);
  await page.locator('[data-answer="yes"]').click();
  await expect(page.locator('.choice.right')).toHaveCSS('background-color', 'rgb(18, 164, 107)');
  await expect(page.locator('.onomato')).toHaveText(/ドン|ズバッ/);
});

test('na prática, errar não tira coração nem combo: o kanji aparece de novo', async ({ page }) => {
  await startHunt(page);
  await expect(page.getByTestId('km-pratica')).toBeVisible();
  const combo = await page.locator('.combo').innerText();
  await page.locator('.choice:not([data-answer])').first().click();
  await expect(page.locator('.echo')).toContainText('Prática: não perdeu nada');
  await expect(page.getByTestId('hearts').locator('.heart.on')).toHaveCount(5);
  await expect(page.locator('.combo')).toHaveText(combo);
  await seguir(page);
  // O item volta numa apresentação rápida.
  await expect(page.getByTestId('apresentacao')).toBeVisible();
  await passarApresentacao(page);
  await expect(page.getByTestId('hearts').locator('.heart.on')).toHaveCount(5);
});

test('na cobrança, errar tira um coração e mostra a resposta certa', async ({ page }) => {
  await firmarTudo(page);
  await page.getByTestId('play-now').click();
  await expect(page.getByTestId('enemy-kanji')).toBeVisible();
  await expect(page.getByTestId('apresentacao')).toHaveCount(0);
  await expect(page.getByTestId('km-pratica')).toHaveCount(0);
  expect(await page.locator('.choice').count()).toBeGreaterThanOrEqual(3);
  await page.locator('.choice:not([data-answer])').first().click();
  await expect(page.getByTestId('hearts').locator('.heart.on')).toHaveCount(4);
  await expect(page.locator('.echo')).toContainText('Era:');
});

test('teclas 1 a 4 respondem', async ({ page }) => {
  await startHunt(page);
  const index = await page.locator('.choice').evaluateAll((els) => els.findIndex((e) => e.getAttribute('data-answer') === 'yes'));
  await page.keyboard.press(String(index + 1));
  await expect(page.locator('.choice.right')).toHaveCount(1);
  await expect(page.getByTestId('hearts').locator('.heart.on')).toHaveCount(5);
});

test('o progresso continua depois de recarregar a página', async ({ page }) => {
  const apresentados = await startHunt(page);
  await playUntilOverlay(page, 'Capturado!');
  await page.reload();
  await expect(page.getByTestId('kanji-seen')).toHaveText(String(apresentados));
  await page.keyboard.press('d');
  await expect(page.locator('.dex-tile:not(.unseen)')).toHaveCount(apresentados);
});

test('baú a cada 5 capturas, e Esc no baú volta ao fliperama', async ({ page }) => {
  await startHunt(page);
  await playUntilOverlay(page, 'Baú!');
  await expect(page.locator('.summary')).toContainText('capturas');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('play-now')).toBeVisible();
});

test('booster fica bloqueado até encontrar 3 kanji', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Booster/ })).toBeDisabled();
  await page.waitForTimeout(300);
  await page.keyboard.press('b');
  await expect(page.getByTestId('play-now')).toBeVisible();
});

test('ajustes: exportar gera um arquivo de backup', async ({ page }) => {
  await page.getByRole('button', { name: 'Ajustes' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar backup' }).click();
  expect((await download).suggestedFilename()).toMatch(/^kotoba-arcade-save-\d{4}-\d{2}-\d{2}\.json$/);
});

test('com o IME japonês ligado, o número ainda escolhe a alternativa e o Esc da conversão não tira da caçada', async ({ page }) => {
  // Com o IME em hiragana o Chrome manda key "Process" (229) e os números não respondiam.
  await startHunt(page);
  await page.evaluate(() => {
    const e = new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true });
    dispatchEvent(e);
  });
  await expect(page.getByTestId('enemy-kanji')).toBeVisible();
  await page.evaluate(() => {
    const e = new KeyboardEvent('keydown', { key: 'Process', code: 'Digit1', bubbles: true });
    Object.defineProperty(e, 'keyCode', { value: 229 });
    dispatchEvent(e);
  });
  await expect(page.locator('.choice.right, .choice.wrong').first()).toBeVisible();
});

// Pedido do Rafael: a frase de exemplo do cartão (火を消して。) aparecia sem leitura em cima.
test('cartão de apresentação: a frase de exemplo tem furigana em cima de cada kanji', async ({ page }) => {
  await page.getByTestId('play-now').click();
  const cartao = page.getByTestId('apresentacao');
  await expect(cartao).toBeVisible();
  const total = Number(await cartao.getAttribute('data-total'));
  let vistos = 0;
  for (let n = 0; n < total; n++) {
    const exemplo = cartao.locator('.ap-ex-jp');
    if (await exemplo.isVisible()) {
      // Cada pedaço de kanji está num <ruby> com <rt>, e nenhum kanji fica solto fora dele.
      const solto = await exemplo.evaluate((el) => {
        const fora = [...el.childNodes].filter((c) => c.nodeName !== 'RUBY').map((c) => c.textContent ?? '').join('');
        return /[一-鿿々]/.test(fora) ? fora : '';
      });
      expect(solto, `kanji sem leitura em "${await exemplo.textContent()}"`).toBe('');
      expect(await exemplo.locator('ruby rt').count()).toBeGreaterThan(0);
      for (const rt of await exemplo.locator('rt').allTextContents()) expect(rt).toMatch(/^[ぁ-ゖァ-ヺー]+$/);
      vistos++;
    }
    const antes = `${await cartao.getAttribute('data-item')}|${n}`;
    await page.keyboard.press('Enter');
    await expect(async () => {
      if (!(await cartao.isVisible())) return;
      expect(`${await cartao.getAttribute('data-item')}|${await cartao.getAttribute('data-i')}`).not.toBe(antes);
    }).toPass({ timeout: 3000 });
  }
  expect(vistos).toBeGreaterThan(0);
});
