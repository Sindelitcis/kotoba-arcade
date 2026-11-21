import { expect, test, type Page, type Route } from '@playwright/test';

// Seletor de IA da Conversa: Automático, Nuvem, Meu PC. PC e nuvem são simulados.
const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const SAUDE_PC = { ok: true, conversa: { ok: true, modelo: 'gemma4:12b' }, fala: { ok: true }, voz: { ok: true, motor: 'aivis' } };

/** `pc`: null = desligado; senão o que o /saude do PC responde. A nuvem já está com sessão. */
async function preparar(page: Page, pc: Record<string, unknown> | null) {
  const pedidosPC: string[] = [];
  await page.route('http://127.0.0.1:8791/**', (r) => {
    pedidosPC.push(new URL(r.request().url()).pathname);
    return pc ? json(r, pc) : r.abort('connectionrefused');
  });
  await page.route('**/api/estado', (r) =>
    json(r, { ok: true, nuvem: true, conversa: { ok: true, modelo: 'gemma-4-26b-a4b-it' }, fala: { ok: true }, voz: { ok: false, motor: 'navegador' } }),
  );
  return { pedidosPC };
}

async function abrir(page: Page) {
  await page.goto('/');
  await page.locator('.tile', { hasText: 'Conversa por voz' }).click();
}

const fase = (page: Page) => page.getByTestId('cv');

test('automático com o PC desligado: usa a nuvem e oferece ligar a IA do PC', async ({ page }) => {
  await preparar(page, null);
  await abrir(page);
  await expect(fase(page)).toHaveAttribute('data-phase', 'menu');
  await expect(page.locator('[data-motor="auto"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('cv-onde')).toContainText('na nuvem');
  await expect(page.getByTestId('cv-ligar-pc')).toHaveAttribute('href', 'kotoba-local://iniciar');
});

test('automático com o PC ligado (e sessão na nuvem): usa o PC, com o texto da nuvem', async ({ page }) => {
  await preparar(page, SAUDE_PC);
  await abrir(page);
  await expect(fase(page)).toHaveAttribute('data-phase', 'menu');
  await expect(page.getByTestId('cv-onde')).toContainText('ouvido, furigana e voz no seu PC');
  await expect(page.getByTestId('cv-ligar-pc')).toHaveCount(0);
});

test('automático com a placa ocupada: nuvem, com aviso', async ({ page }) => {
  await preparar(page, { ...SAUDE_PC, placa: { ok: false, motivo: 'em uso: estudio-imagens' } });
  await abrir(page);
  await expect(fase(page)).toHaveAttribute('data-phase', 'menu');
  await expect(page.getByTestId('cv-onde')).toContainText('na nuvem');
  await expect(page.getByTestId('cv-aviso-motor')).toContainText('estudio-imagens');
});

test('Meu PC com ele desligado: explica e mostra o botão de ligar; Nuvem volta ao menu e a escolha fica guardada', async ({ page }) => {
  const { pedidosPC } = await preparar(page, null);
  await abrir(page);
  await expect(fase(page)).toHaveAttribute('data-phase', 'menu');

  await page.locator('[data-motor="pc"]').click();
  await expect(fase(page)).toHaveAttribute('data-phase', 'pc-fora');
  await expect(page.getByTestId('cv-pc-fora')).toContainText('não está ligada');
  await expect(page.getByTestId('cv-ligar-pc')).toBeVisible();
  await expect(page.locator('[data-motor="pc"]')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('[data-motor="nuvem"]').click();
  await expect(fase(page)).toHaveAttribute('data-phase', 'menu');
  await expect(page.getByTestId('cv-onde')).toContainText('na nuvem');

  // Com "Nuvem" escolhido, abrir de novo nem procura o PC.
  const antes = pedidosPC.length;
  await page.reload();
  await page.locator('.tile', { hasText: 'Conversa por voz' }).click();
  await expect(fase(page)).toHaveAttribute('data-phase', 'menu');
  await expect(page.locator('[data-motor="nuvem"]')).toHaveAttribute('aria-pressed', 'true');
  expect(pedidosPC.length).toBe(antes);
});

test('Meu PC com a placa ocupada: diz quem está usando', async ({ page }) => {
  await preparar(page, { ...SAUDE_PC, placa: { ok: false, motivo: 'em uso: vozes' } });
  await page.addInitScript(() => localStorage.setItem('kotoba-arcade:motor-conversa', 'pc'));
  await abrir(page);
  await expect(fase(page)).toHaveAttribute('data-phase', 'pc-fora');
  await expect(page.getByTestId('cv-placa')).toContainText('em uso: vozes');
});
