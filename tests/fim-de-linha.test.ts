/**
 * Arquivo de texto do repositório termina linha só com \n. Um script em Python no Windows
 * gravou vários com \r\n de uma vez e o diff de cada um virou o arquivo inteiro.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = join(__dirname, '..');
const PASTAS = ['src', 'scripts', 'tests', 'e2e', 'docs', 'local', '.github'];
const TEXTO = new Set(['.ts', '.tsx', '.js', '.mjs', '.py', '.json', '.md', '.css', '.html', '.txt', '.yml', '.yaml']);

function arquivos(dir: string): string[] {
  let entradas;
  try {
    entradas = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entradas.flatMap((e) => {
    if (e.name === 'node_modules' || e.name === '__pycache__') return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? arquivos(p) : TEXTO.has(extname(e.name)) ? [p] : [];
  });
}

describe('fim de linha', () => {
  it('nenhum arquivo de texto usa \\r\\n', () => {
    const lista = [...PASTAS.flatMap((p) => arquivos(join(RAIZ, p))), ...['README.md', 'package.json', 'index.html'].map((f) => join(RAIZ, f))];
    expect(lista.length).toBeGreaterThan(100);
    const comCR = lista.filter((f) => {
      try {
        return readFileSync(f, 'utf8').includes('\r');
      } catch {
        return false;
      }
    });
    expect(comCR.map((f) => relative(RAIZ, f).replaceAll('\\', '/'))).toEqual([]);
  });
});
