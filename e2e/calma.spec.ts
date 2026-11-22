/**
 * Ritmo calmo (docs/ensino.md, "Calma"). Pedido do Rafael: no KanjiMon, depois de acertar 水, o
 * "水 · みず (mizu) · água" sumia quase na hora, o "Capturado!" entrava por cima e o som do acerto
 * tapava a pronúncia. Aqui cada jogo responde, espera alguns segundos e confere que o retorno
 * continua na tela, que nada veio por cima e que nenhum efeito tocou junto com uma voz.
 */
import { expect, test, type Page } from './base';
import { passarApresentacao } from './apoio';

/** Mais que o tempo que os jogos esperavam antes (1,8 s) e que qualquer palavra gravada. */
const ESPERA = 3500;

interface Som {
  tipo: 'efeito' | 'voz';
  ini: number;
  fim: number;
}

test.beforeEach(async ({ page }) => {
  await page.route('https://kanjimon.online/**', (route) => route.abort());
  // Anota quando cada efeito (Web Audio) e cada voz (<audio>) toca, para conferir que não se cruzam.
  await page.addInitScript(() => {
    const sons: { tipo: string; ini: number; fim: number }[] = [];
    (window as unknown as { __sons: typeof sons }).__sons = sons;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, when = 0, ...resto: number[]) {
      if (!this.loop) {
        const ctx = this.context;
        const ini = performance.now() + Math.max(0, when - ctx.currentTime) * 1000;
        const s = { tipo: 'efeito', ini, fim: ini + ((this.buffer?.duration ?? 0) / this.playbackRate.value) * 1000 };
        sons.push(s);
        const stop = this.stop.bind(this);
        this.stop = (w?: number) => {
          s.fim = Math.min(s.fim, performance.now() + Math.max(0, (w ?? ctx.currentTime) - ctx.currentTime) * 1000);
          stop(w);
        };
      }
      return start.call(this, when, ...resto);
    };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      const s = { tipo: 'voz', ini: Infinity, fim: Infinity };
      this.addEventListener('playing', () => {
        if (s.ini !== Infinity) return;
        s.ini = performance.now();
        sons.push(s);
      });
      for (const ev of ['ended', 'pause', 'error']) this.addEventListener(ev, () => s.ini !== Infinity && s.fim === Infinity && (s.fim = performance.now()));
      return play.call(this);
    };
  });
  await page.goto('/');
  await expect(page.getByTestId('play-now')).toBeVisible();
});

/** Nenhum efeito tocou por cima de uma voz (tolerância: a descida de 60 ms quando a voz começa). */
async function semEfeitoSobreVoz(page: Page) {
  const sons = await page.evaluate(() => {
    const agora = performance.now();
    return (window as unknown as { __sons: Som[] }).__sons.map((s) => ({ ...s, fim: Number.isFinite(s.fim) ? s.fim : agora }));
  });
  const vozes = sons.filter((s) => s.tipo === 'voz');
  const efeitos = sons.filter((s) => s.tipo === 'efeito');
  expect(vozes.length, 'tocou alguma voz').toBeGreaterThan(0);
  expect(efeitos.length, 'tocou algum efeito').toBeGreaterThan(0);
  for (const v of vozes)
    for (const e of efeitos) {
      const junto = Math.min(v.fim, e.fim) - Math.max(v.ini, e.ini);
      expect(junto, `efeito em ${Math.round(e.ini)} ms por cima da voz em ${Math.round(v.ini)} ms`).toBeLessThan(90);
    }
}

test('KanjiMon: depois de acertar, a leitura e o significado ficam até a pessoa seguir, e o som do acerto não tapa a pronúncia', async ({ page }) => {
  await page.getByTestId('play-now').click();
  await passarApresentacao(page);
  await expect(page.getByTestId('enemy-kanji')).toBeVisible();
  const kanji = (await page.getByTestId('enemy-kanji').innerText()).trim();
  await page.locator('[data-answer="yes"]').click();
  const retorno = page.locator('.echo.show');
  await expect(retorno).toBeVisible();
  const texto = await retorno.innerText();
  expect(texto).toContain(kanji);
  await page.waitForTimeout(ESPERA);
  // Nada passou sozinho: o mesmo retorno, o mesmo kanji, nenhum aviso por cima.
  expect(await retorno.innerText()).toBe(texto);
  await expect(page.getByTestId('enemy-kanji')).toHaveText(kanji);
  await expect(page.locator('.overlay')).toHaveCount(0);
  await semEfeitoSobreVoz(page);
  await page.getByTestId('seguir').click();
  await expect(page.locator('.echo.show')).toHaveCount(0);
});

test('KanjiMon: o "Capturado!" só vem depois do Seguir e fica até o Enter', async ({ page }) => {
  await page.getByTestId('play-now').click();
  await passarApresentacao(page);
  for (let i = 0; i < 60; i++) {
    if (await page.locator('.overlay h2', { hasText: 'Capturado!' }).isVisible()) break;
    if (await page.getByTestId('apresentacao').isVisible()) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);
      continue;
    }
    const certa = page.locator('[data-answer="yes"]:not(.right)');
    if (await page.getByTestId('seguir').isVisible()) {
      // O retorno da resposta que captura ainda está na tela, sem o aviso por cima.
      await expect(page.locator('.overlay')).toHaveCount(0);
      await page.getByTestId('seguir').click();
    } else if (await certa.isVisible()) await certa.click();
    await page.waitForTimeout(100);
  }
  const aviso = page.locator('.overlay h2', { hasText: 'Capturado!' });
  await expect(aviso).toBeVisible();
  await page.waitForTimeout(ESPERA);
  await expect(aviso).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(aviso).toHaveCount(0);
});

test('Kotodama: o retorno da carta jogada fica até a pessoa seguir', async ({ page }) => {
  await page.locator('.tile', { hasText: 'Kotodama' }).click();
  if ((await page.getByTestId('rg').getAttribute('data-phase')) !== 'combat') await passarApresentacao(page);
  await expect(page.getByTestId('rg')).toHaveAttribute('data-phase', 'combat');
  await page.keyboard.press('1');
  await expect(page.getByTestId('rg')).toHaveAttribute('data-phase', 'question');
  await page.locator('[data-answer="yes"]').first().click();
  const retorno = page.getByTestId('rg-echo');
  await expect(retorno).toHaveClass(/show/);
  await page.waitForTimeout(ESPERA);
  await expect(retorno).toHaveClass(/show/);
  await expect(page.getByTestId('rg')).toHaveAttribute('data-phase', 'question');
  await semEfeitoSobreVoz(page);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('rg')).not.toHaveAttribute('data-phase', 'question');
});

test('Kana em imagens: depois de acertar, a resposta fica até o Enter', async ({ page }) => {
  await page.keyboard.press('i');
  await expect(page.getByTestId('ki-menu')).toBeVisible();
  await page.keyboard.press('Enter');
  await passarApresentacao(page);
  await expect(page.locator('.ki-grande[data-kana="あ"]')).toBeVisible();
  const certa = await page.locator('.ki-opcao').evaluateAll((els) => els.findIndex((e) => e.getAttribute('data-certa') === 'sim'));
  await page.keyboard.press(String(certa + 1));
  await expect(page.locator('.ki-opcao.certa')).toContainText('あ');
  await page.waitForTimeout(ESPERA);
  await expect(page.locator('.ki-opcao.certa')).toContainText('あ');
  await expect(page.getByTestId('ki-seguir')).toBeVisible();
  await semEfeitoSobreVoz(page);
  await page.keyboard.press('Enter');
  await expect(page.locator('.ki-grande[data-kana="い"]')).toBeVisible();
});
