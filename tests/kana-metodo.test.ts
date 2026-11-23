// @vitest-environment node
/**
 * O jeito de gravar kana solto (scripts/kana-metodo.json) tem de ser um dos que o gravador sabe
 * (KANA_METODOS em scripts/gravar_vozes.py); senão `npm run vozes` para no meio. A comparação às
 * cegas (scripts/comparar-kana.html) mostra todos eles, sem dizer qual é qual.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = join(__dirname, '..');
const gravador = readFileSync(join(RAIZ, 'scripts/gravar_vozes.py'), 'utf8');
const bloco = /KANA_METODOS = \{([\s\S]*?)\n\}/.exec(gravador)?.[1] ?? '';
const metodos = [...bloco.matchAll(/^\s+"([a-z]+)":/gm)].map((m) => m[1]);

describe('jeito de gravar kana solto', () => {
  it('o gravador sabe mais de um jeito, e o de sempre continua entre eles', () => {
    expect(metodos.length).toBeGreaterThan(1);
    expect(metodos).toContain('atual');
  });

  it('o jeito escolhido é um dos que o gravador sabe', () => {
    const { metodo } = JSON.parse(readFileSync(join(RAIZ, 'scripts/kana-metodo.json'), 'utf8')) as { metodo: string };
    expect(metodos).toContain(metodo);
  });

  it('a página da comparação não mostra o nome do jeito, só o número da versão', () => {
    const pagina = readFileSync(join(RAIZ, 'scripts/comparar-kana.html'), 'utf8');
    for (const m of metodos) expect(pagina).not.toMatch(new RegExp(`>[^<]*\\$\\{m\\}|>${m}<`));
    expect(pagina).toContain('Ouvir ${n + 1}');
  });
});
