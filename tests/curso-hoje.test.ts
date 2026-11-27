// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { apresentar, avaliar } from '../src/core/ensino';
import type { CardState } from '../src/core/srs';
import { ITENS_DE_HOJE, KANA_DE_HOJE, proximoPasso, revisaoDeHoje } from '../src/curso/hoje';
import { kanaFeitos, LICOES_KANA, LOTES_DO_MODULO, perguntasDosKana } from '../src/curso/modulo0';
import { ensureCursoSave, itensAte } from '../src/curso/motor';
import { seededRng } from '../src/core/rng';

const DIA = 24 * 3600 * 1000;
const T0 = Date.UTC(2026, 10, 1);

/** Apresenta e acerta cada carta hoje: daqui a uns dias, todas venceram. */
function vistas(chaves: readonly string[]): Record<string, CardState> {
  const cards: Record<string, CardState> = {};
  apresentar(cards, chaves, T0);
  for (const c of chaves) avaliar(cards, c, { correct: true }, T0);
  return cards;
}

describe('o que o Continuar abre hoje', () => {
  it('aluno novo: a primeira lição do Módulo 0, não a unidade 1', () => {
    const passo = proximoPasso(ensureCursoSave({}), {}, T0);
    expect(passo).toEqual({ tipo: 'kana', licao: LICOES_KANA[0] });
  });

  it('o Módulo 0 segue de onde parou; acabado, vem a unidade 1', () => {
    const save = ensureCursoSave({});
    save.modulo0 = 4;
    expect(proximoPasso(save, {}, T0)).toMatchObject({ tipo: 'kana', licao: { id: LICOES_KANA[1]!.id } });
    save.modulo0 = LOTES_DO_MODULO.length;
    expect(proximoPasso(save, {}, T0)).toMatchObject({ tipo: 'unidade', lugar: { unidade: { id: 'a1-01' } } });
  });

  it('quem já lê kana e começou a unidade 1 não volta ao Módulo 0', () => {
    const save = ensureCursoSave({});
    save.feitos['a1-01'] = 2;
    expect(proximoPasso(save, {}, T0)).toMatchObject({ tipo: 'unidade', lugar: { unidade: { id: 'a1-01' }, bloco: 2 } });
  });

  it('com coisa vencida, a revisão vem antes, curta e sem pilha', () => {
    const save = ensureCursoSave({});
    save.modulo0 = LOTES_DO_MODULO.length;
    save.feitos['a1-01'] = 99;
    save.feitos['a1-02'] = 1;
    const kana = kanaFeitos(save.modulo0).map((k) => k.carta);
    const itens = itensAte(2).map((i) => i.carta);
    const cards = vistas([...kana, ...itens]);
    // No mesmo dia, nada venceu: segue o curso.
    expect(proximoPasso(save, cards, T0 + 1000)?.tipo).toBe('unidade');
    const depois = T0 + 30 * DIA;
    const passo = proximoPasso(save, cards, depois);
    expect(passo?.tipo).toBe('revisao');
    const rev = revisaoDeHoje(save, cards, depois);
    expect(rev.kana.length).toBe(KANA_DE_HOJE);
    expect(rev.itens.length).toBe(ITENS_DE_HOJE);
    // Só o que foi visto: nada de unidade que a pessoa ainda não começou.
    const ate2 = new Set(itens);
    for (const i of rev.itens) expect(ate2.has(i.carta)).toBe(true);
  });

  it('a revisão de kana pergunta cada kana vencido, com opções que a pessoa já viu', () => {
    const vistos = kanaFeitos(6);
    const ps = perguntasDosKana(vistos.slice(0, 5), vistos, seededRng(2));
    expect(ps.length).toBeGreaterThan(0);
    const ids = new Set(vistos.map((k) => (k.romaji)));
    for (const p of ps) {
      expect(p.opcoes).toContain(p.certa);
      if (p.modo === 'ler') for (const o of p.opcoes) expect(ids.has(o)).toBe(true);
    }
  });

  it('"(pausa)" e "(ya pequeno)" só aparecem entre opções do mesmo jeito', () => {
    const todos = kanaFeitos(LOTES_DO_MODULO.length);
    for (let s = 0; s < 20; s++)
      for (const p of perguntasDosKana(todos, todos, seededRng(s)))
        if (p.modo === 'ler') expect(new Set(p.opcoes.map((o) => o.startsWith('('))).size, p.kana.char).toBe(1);
  });
});

