import { expect, test, type Page } from '@playwright/test';

/**
 * A pintura colorida (o borrão que cresce com os acertos) tem que ficar atrás do conteúdo.
 * Ela chegou a cobrir as alternativas do KanjiMon, porque tinha posição própria e as
 * alternativas não.
 */
async function cobertosPelaPintura(page: Page, seletor: string): Promise<{ total: number; cobertos: string[] }> {
  return page.evaluate((sel) => {
    const style = document.createElement('style');
    // Cor no máximo e a pintura "clicável", só para a conta de quem fica por cima.
    style.textContent = '* { --cor: 1 !important; } .pinta { pointer-events: auto !important; }';
    document.head.appendChild(style);
    const els = [...document.querySelectorAll<HTMLElement>(sel)];
    const cobertos = els
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.classList.contains('pinta');
      })
      .map((el) => el.className || el.tagName);
    style.remove();
    return { total: els.length, cobertos };
  }, seletor);
}

test('KanjiMon: a cor no máximo não cobre a pergunta nem as alternativas', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('play-now').click();
  await expect(page.locator('.choice').first()).toBeVisible();
  const r = await cobertosPelaPintura(page, '.choice, .question .prompt, [data-testid=enemy-kanji]');
  expect(r.total).toBeGreaterThan(3);
  expect(r.cobertos).toEqual([]);
});

test('fliperama: a cor dos jogos já jogados não cobre os títulos', async ({ page }) => {
  await page.goto('/');
  const r = await cobertosPelaPintura(page, '.tile-title, .tile-blurb, .play-now-main');
  expect(r.total).toBeGreaterThan(3);
  expect(r.cobertos).toEqual([]);
});
