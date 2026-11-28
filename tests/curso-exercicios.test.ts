// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { UNIDADES } from '../src/content/curso';
import { seededRng } from '../src/core/rng';
import { exemplosDaUnidade, exemplosDoPonto } from '../src/curso/exemplos';
import { confereDitado, ditadoDa, gramaticaAte, lacunaDo, lacunasDa, respostasDoDitado } from '../src/curso/exercicios';
import { blocosDa } from '../src/curso/motor';

const conteudo = UNIDADES.filter((u) => !u.revisao);
const PARECIDAS = [['は', 'が', 'も', 'を'], ['に', 'へ'], ['と', 'や'], ['か', 'よ', 'ね', 'です', 'でした', 'じゃありません', 'だ']];
const exemplo = (jp: string) => conteudo.flatMap(exemplosDaUnidade).find((e) => e.jp === jp)!;

describe('completar', () => {
  it('toda unidade de conteúdo tem lacunas, com a resposta entre as opções e ao menos três opções', () => {
    for (const u of conteudo) {
      const ls = lacunasDa(u, seededRng(3));
      expect(ls.length, u.id).toBeGreaterThanOrEqual(2);
      for (const l of ls) {
        expect(l.opcoes).toContain(l.resposta.t);
        expect(l.opcoes.length).toBeGreaterThanOrEqual(3);
        expect(new Set(l.opcoes).size).toBe(l.opcoes.length);
        expect([...l.antes, l.resposta, ...l.depois].map((p) => p.t).join('') + l.exemplo.jp.slice(-1)).toBe(l.exemplo.jp);
      }
    }
  });

  // Nada de opção que a pessoa ainda não viu, nem opção errada que também estaria certa.
  it('as opções erradas já foram apresentadas e não cabem no lugar', () => {
    for (const u of conteudo)
      for (let s = 0; s < 5; s++)
        for (const l of lacunasDa(u, seededRng(s))) {
          const vistas = gramaticaAte(u.ordem);
          const grupo = PARECIDAS.find((g) => g.includes(l.resposta.t)) ?? [l.resposta.t];
          for (const o of l.opcoes.filter((x) => x !== l.resposta.t)) {
            expect(vistas.has(o), `${u.id} ${l.exemplo.jp}: ${o}`).toBe(true);
            expect(grupo.includes(o), `${l.exemplo.jp}: ${o} no lugar de ${l.resposta.t}`).toBe(false);
            if (l.depois.length === 0) expect(o).not.toBe('の');
            else expect(['よ', 'ね']).not.toContain(o);
          }
        }
  });

  it('a primeira unidade só usa o que ela apresenta', () => {
    expect([...gramaticaAte(1)].sort()).toEqual(['か', 'じゃありません', 'です', 'の', 'は', 'も'].sort());
  });

  it('frase sem peça de gramática para apagar não vira lacuna', () => {
    const e = exemplosDoPonto('desu')[0]!;
    expect(lacunaDo({ ...e, pecas: e.pecas.filter((p) => p.t !== 'は' && p.t !== 'です') }, seededRng(1))).toBeNull();
  });
});

describe('ditado', () => {
  it('as frases do ditado são as mais curtas da unidade, três no máximo', () => {
    for (const u of conteudo) {
      const d = ditadoDa(u);
      expect(d.length, u.id).toBeGreaterThanOrEqual(2);
      expect(d.length).toBeLessThanOrEqual(3);
      const resto = exemplosDaUnidade(u).filter((e) => !d.some((x) => x.jp === e.jp));
      for (const e of resto) expect(e.kana.length).toBeGreaterThanOrEqual(Math.max(...d.map((x) => x.kana.length)));
    }
  });

  it('aceita a partícula escrita (は, へ) ou falada (わ, え), sem ligar para pontuação nem katakana', () => {
    const e = exemplo('母は先生です。');
    expect(respostasDoDitado(e)).toEqual(['はははせんせいです', 'ははわせんせいです']);
    expect(confereDitado('はははせんせいです', e)).toBe(true);
    expect(confereDitado('ははわせんせいです。', e)).toBe(true);
    expect(confereDitado('ははせんせいです', e)).toBe(false);
    expect(confereDitado('', e)).toBe(false);
    const k = exemplo('コンビニでアルバイトをしています。');
    expect(confereDitado('こんびにであるばいとをしています', k)).toBe(true);
    expect(confereDitado('こんびにであるばいとおしています', k)).toBe(true);
  });

  it('completar e ditado vêm depois de todas as palavras e de toda a gramática, antes da cultura', () => {
    for (const u of conteudo) {
      const tipos = blocosDa(u).map((b) => b.tipo);
      const ultimaGramatica = Math.max(...(['gramatica', 'formas', 'frases', 'palavras', 'kanji'] as const).map((t) => tipos.lastIndexOf(t)));
      expect(tipos.indexOf('completar'), u.id).toBe(ultimaGramatica + 1);
      expect(tipos.indexOf('ditado')).toBe(tipos.indexOf('completar') + 1);
      if (tipos.includes('notas')) expect(tipos.indexOf('notas')).toBeGreaterThan(tipos.indexOf('ditado'));
    }
  });
});
