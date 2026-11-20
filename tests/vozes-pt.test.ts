/**
 * Português falado gravado na voz livre (public/vozes-pt). Texto novo numa aula, na lição
 * do Kumitate, na narração da Aventura ou no retorno da Jornada faz este teste falhar até
 * alguém rodar `npm run aulas:livre`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listarFalasPt } from '../scripts/falas-pt';
import type { ManifestoPt } from '../src/core/fala-pt';

const PASTA = join(__dirname, '..', 'public', 'vozes-pt');
const manifesto = JSON.parse(readFileSync(join(PASTA, 'manifesto.json'), 'utf8')) as ManifestoPt;

describe('português gravado na voz livre', () => {
  it('todo texto falado em português tem gravação', () => {
    const faltam = listarFalasPt().filter((f) => !manifesto.falas[f.texto]).map((f) => `${f.origem}: ${f.texto}`);
    expect(faltam, 'rode `npm run aulas:livre` para gravar').toEqual([]);
  });

  it('todo arquivo do manifesto existe e nenhum mp3 sobra na pasta', () => {
    const arquivos = Object.values(manifesto.falas);
    expect(arquivos.filter((a) => !existsSync(join(PASTA, a)))).toEqual([]);
    const usados = new Set(arquivos);
    expect(readdirSync(PASTA).filter((a) => a.endsWith('.mp3') && !usados.has(a))).toEqual([]);
  });

  it('o manifesto diz qual voz livre fala, e não guarda texto que ninguém usa', () => {
    expect(manifesto.voz).toBe('kokoro-pf_dora');
    const textos = new Set(listarFalasPt().map((f) => f.texto));
    expect(Object.keys(manifesto.falas).filter((t) => !textos.has(t))).toEqual([]);
  });
});
