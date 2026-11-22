import { expect, test } from './base';

// Em 22/11/2026 a arte do kanji no cartão "Antes de caçar: conheça os novos" aparecia cortada em cima
// e embaixo: a caixa era quadrada e a imagem vertical esticava até a altura natural.
// Aqui a arte é trocada por uma imagem do mesmo formato das do KanjiMon (384×688), feita na hora.
const ARTE_VERTICAL = `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="688"><rect width="384" height="688" fill="#36c"/></svg>`;

test('a arte vertical aparece inteira no cartão de apresentação', async ({ page }) => {
  await page.route('https://kanjimon.online/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: ARTE_VERTICAL }),
  );
  await page.goto('/');
  await page.getByTestId('play-now').click();
  const img = page.getByTestId('apresentacao').locator('.ap-visual img');
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);

  const { caixa, foto } = await img.evaluate((i) => {
    const r = (e: Element) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: b.height, w: b.width }; };
    return { caixa: r(i.parentElement!), foto: r(i) };
  });
  // A imagem cabe inteira na caixa (nada sobra para fora e é cortado)...
  expect(foto.top).toBeGreaterThanOrEqual(caixa.top - 1);
  expect(foto.bottom).toBeLessThanOrEqual(caixa.bottom + 1);
  // ...e a caixa tem o formato vertical da arte, em vez de um quadrado.
  expect(caixa.h / caixa.w).toBeGreaterThan(1.5);
});
