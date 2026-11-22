/**
 * O site fala só com gravação: AivisSpeech/VOICEVOX no japonês, a voz do amigo do Rafael no
 * português. A voz genérica do navegador (speechSynthesis) e a antiga Voz 2 (Kokoro), com
 * a troca de voz, saíram de vez. O `dist` é conferido em e2e/dist.spec.ts, depois do build.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = join(__dirname, '..');
const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivos(join(dir, e.name)) : [join(dir, e.name)]));
const rel = (f: string) => relative(RAIZ, f).replaceAll('\\', '/');

/** O que não pode voltar: voz do navegador, Voz 2, Kokoro e a escolha de voz. */
export const PROIBIDO: readonly [string, RegExp][] = [
  ['voz do navegador', /speechSynthesis|SpeechSynthesis(Utterance|Voice)/],
  ['Voz 2', /Voz 2|voz2|Kokoro|pf_dora/i],
  ['escolha de voz', /vozPt|voz-pt-|NOME_VOZ_PT|VOZES_PT|trocarVoz|ap-voz/],
];

describe('sem voz do navegador e sem Voz 2', () => {
  it('nada disso no código do site', () => {
    const achados = arquivos(join(RAIZ, 'src'))
      .filter((f) => /\.(ts|tsx|css|html)$/.test(f))
      .flatMap((f) => {
        const t = readFileSync(f, 'utf8');
        return PROIBIDO.filter(([, re]) => re.test(t)).map(([nome]) => `${rel(f)}: ${nome}`);
      });
    expect(achados).toEqual([]);
  });

  it('nem nos scripts, no package.json, no index.html ou em public/', () => {
    const fontes = [
      ...arquivos(join(RAIZ, 'scripts')).filter((f) => /\.(ts|mjs|js|py|json)$/.test(f)),
      join(RAIZ, 'package.json'),
      join(RAIZ, 'index.html'),
    ];
    const achados = fontes.flatMap((f) => {
      const t = readFileSync(f, 'utf8');
      return PROIBIDO.filter(([, re]) => re.test(t)).map(([nome]) => `${rel(f)}: ${nome}`);
    });
    const pastas = arquivos(join(RAIZ, 'public')).map(rel).filter((f) => /voz2|kokoro/i.test(f));
    expect([...achados, ...pastas]).toEqual([]);
  });

  it('todo teste de ponta a ponta usa o `test` que falha com fala sem gravação', () => {
    const specs = readdirSync(join(RAIZ, 'e2e')).filter((f) => f.endsWith('.spec.ts'));
    const fora = specs.filter((f) => {
      const t = readFileSync(join(RAIZ, 'e2e', f), 'utf8');
      return !/import \{[^}]*\btest\b[^}]*\} from '\.\/base';/.test(t) || /from '@playwright\/test'/.test(t);
    });
    expect(specs.length).toBeGreaterThan(10);
    expect(fora).toEqual([]);
  });
});
