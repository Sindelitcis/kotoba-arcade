// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { UNIDADES } from '../src/content/curso';
import { LEITURAS } from '../src/content/curso/leituras';
import { leituraDa, problemasDaLinha } from '../src/curso/exemplos';
import { blocosDa } from '../src/curso/motor';

const conteudo = UNIDADES.filter((u) => !u.revisao);

describe('leitura graduada', () => {
  it('toda unidade de conteúdo tem leitura, de 4 ou 5 frases', () => {
    for (const u of conteudo) {
      const l = leituraDa(u);
      expect(l, u.id).toBeDefined();
      expect(l!.frases.length).toBeGreaterThanOrEqual(4);
      expect(l!.frases.length).toBeLessThanOrEqual(5);
    }
  });

  // Leitura graduada: nada que a pessoa ainda não viu.
  it('só usa vocabulário, kanji e gramática já ensinados até a unidade', () => {
    for (const [id, l] of Object.entries(LEITURAS)) {
      const u = UNIDADES.find((x) => x.id === id)!;
      for (const f of l.frases) expect(problemasDaLinha(id, u.ordem, f)).toEqual([]);
    }
  });

  it('a leitura inteira de cada frase é só kana', () => {
    for (const u of conteudo) for (const f of leituraDa(u)!.frases) expect(f.kana, f.jp).toMatch(/^[ぁ-ゖァ-ヺー、。？]+$/u);
  });

  it('o problema aparece quando a frase usa o que vem depois', () => {
    expect(problemasDaLinha('x', 1, { pecas: ['パン', 'です'], pt: '' })).toEqual(['x: パン não foi ensinado até a unidade de ordem 1']);
  });

  it('a leitura vem depois do ditado e antes da cultura e do mini-teste', () => {
    for (const u of conteudo) {
      const tipos = blocosDa(u).map((b) => b.tipo);
      expect(tipos.indexOf('leitura'), u.id).toBe(tipos.indexOf('ditado') + 1);
      expect(tipos.indexOf('miniteste')).toBeGreaterThan(tipos.indexOf('leitura'));
    }
  });
});
