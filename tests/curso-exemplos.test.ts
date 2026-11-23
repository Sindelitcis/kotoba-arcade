// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { GRAMATICA_N5, UNIDADES } from '../src/content/curso';
import { EXEMPLOS } from '../src/content/curso/exemplos';
import { exemplosDaUnidade, exemplosDoPonto, problemasDoExemplo } from '../src/curso/exemplos';

describe('exemplos de gramática do curso', () => {
  it('todo ponto do N5 tem pelo menos dois exemplos', () => {
    for (const id of Object.keys(GRAMATICA_N5)) expect(EXEMPLOS[id]?.length ?? 0, id).toBeGreaterThanOrEqual(2);
  });

  it('não há exemplo de ponto que não existe', () => {
    for (const id of Object.keys(EXEMPLOS)) expect(GRAMATICA_N5[id], id).toBeDefined();
  });

  // A regra de ensinar antes de cobrar vale também para o exemplo: ele não pode trazer palavra nova.
  it('cada peça é palavra, kanji ou gramática já ensinados até a unidade do ponto', () => {
    const erros = Object.entries(EXEMPLOS).flatMap(([id, linhas]) => linhas.flatMap((l) => problemasDoExemplo(id, l)));
    expect(erros).toEqual([]);
  });

  it('a frase montada tem leitura toda em kana e termina com pontuação', () => {
    for (const u of UNIDADES)
      for (const e of exemplosDaUnidade(u)) {
        expect(e.kana, e.jp).toMatch(/^[ぁ-ゖァ-ヺー、。？]+$/u);
        expect(e.jp).toMatch(/[。？]$/u);
        expect(e.pt.length).toBeGreaterThan(3);
      }
  });

  it('a palavra que volta com outra leitura usa a da unidade (何人 é なんにん na unidade 9)', () => {
    const [e] = exemplosDoPonto('contador-nin');
    expect(e?.kana).toContain('なんにん');
    const [p] = exemplosDoPonto('ka').slice(1);
    expect(p?.kana).toContain('なにじん');
  });

  it('nenhum exemplo repete outro', () => {
    const todos = UNIDADES.flatMap(exemplosDaUnidade).map((e) => e.jp);
    expect(new Set(todos).size).toBe(todos.length);
  });
});
