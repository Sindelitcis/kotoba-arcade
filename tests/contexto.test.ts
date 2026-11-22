// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const raiz = process.cwd();
const ler = (f: string) => readFileSync(join(raiz, f), 'utf8');

// AGENTS.md é o contexto para qualquer pessoa ou IA continuar o projeto. Ele só serve se apontar
// para coisas que existem: link quebrado é sinal de que ficou velho.
describe('contexto do projeto', () => {
  it('o CLAUDE.md só puxa o AGENTS.md, para não haver dois contextos', () => {
    expect(ler('CLAUDE.md').trim()).toBe('@AGENTS.md');
  });

  it('todo arquivo citado no AGENTS.md existe', () => {
    const txt = ler('AGENTS.md');
    const citados = new Set([
      ...[...txt.matchAll(/\]\(([^)#]+)\)/g)].map((m) => m[1]!),
      ...[...txt.matchAll(/`((?:docs|scripts|tests|functions|nuvem|src|\.github)\/[^`\s]*)`/g)].map((m) => m[1]!),
    ]);
    expect(citados.size).toBeGreaterThan(5);
    for (const f of citados) expect(existsSync(join(raiz, f)), f).toBe(true);
  });

  it('todo script npm citado no AGENTS.md existe', () => {
    const scripts = JSON.parse(ler('package.json')).scripts as Record<string, string>;
    for (const m of ler('AGENTS.md').matchAll(/`npm run ([\w:-]+)`/g)) expect(scripts[m[1]!], m[1]).toBeDefined();
  });
});
