/**
 * O `test` de todos os testes de ponta a ponta. Além do de sempre, cada teste falha se a
 * página pedir uma fala sem gravação (a marca de `src/core/sem-gravacao.ts` no console):
 * o site não tem voz de reserva, então fala sem gravação é fala muda.
 *
 * Cada falta também vai para `test-results/sem-gravacao.txt`, para gravar tudo de uma vez.
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { expect, test as base } from '@playwright/test';

const MARCA = '[voz] sem gravação';

export const test = base.extend<{ semGravacao: void }>({
  semGravacao: [
    async ({ page }, use, info) => {
      const faltas: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'warning' && m.text().startsWith(MARCA)) faltas.push(m.text());
      });
      await use();
      if (faltas.length > 0) {
        mkdirSync('test-results', { recursive: true });
        appendFileSync('test-results/sem-gravacao.txt', faltas.map((f) => `${info.titlePath.join(' › ')}\t${f}\n`).join(''));
      }
      expect([...new Set(faltas)], 'fala sem gravação (rode `npm run vozes` ou `npm run vozes-pt`)').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
export type { Page, Route } from '@playwright/test';
