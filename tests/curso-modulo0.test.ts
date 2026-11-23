// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { LOTES } from '../src/content/kana';
import { seededRng } from '../src/core/rng';
import { kanaAte, kanaDoLote, licaoDaPosicao, LICOES_KANA, LOTES_DO_MODULO, perguntasDoLote } from '../src/curso/modulo0';

describe('Módulo 0: kana e sons', () => {
  it('seis lições cobrem todos os lotes de kana, cada um uma vez, na ordem', () => {
    expect(LICOES_KANA).toHaveLength(6);
    expect([...LOTES_DO_MODULO]).toEqual(LOTES.map((_, i) => i));
    for (const l of LICOES_KANA) expect(l.lotes.length, l.id).toBeGreaterThan(0);
    expect(licaoDaPosicao(0)?.id).toBe('m0-1');
    expect(licaoDaPosicao(LOTES_DO_MODULO.length - 1)?.id).toBe('m0-6');
  });

  // Nada cobrado antes de ser apresentado, nem como opção errada.
  it('o treino de cada lote só usa kana já apresentados, e toda pergunta tem a certa entre as opções', () => {
    for (let pos = 0; pos < LOTES_DO_MODULO.length; pos++)
      for (const s of [1, 2, 3]) {
        const vistos = kanaAte(pos);
        const chars = new Set(vistos.map((k) => k.char));
        const romajis = new Set(vistos.map((k) => k.romaji));
        for (const p of perguntasDoLote(pos, seededRng(s))) {
          expect(p.opcoes).toContain(p.certa);
          expect(new Set(p.opcoes).size).toBe(p.opcoes.length);
          for (const o of p.opcoes) expect((p.modo === 'ouvir' ? chars : romajis).has(o), `${pos} ${o}`).toBe(true);
        }
      }
  });

  it('o primeiro lote já tem treino, e cada kana do lote cai no máximo uma vez', () => {
    const ps = perguntasDoLote(0, seededRng(1));
    expect(ps.length).toBe(kanaDoLote(LOTES_DO_MODULO[0]!).length);
    expect(new Set(ps.map((p) => p.kana.id)).size).toBe(ps.length);
  });

  it('っ e ー (que não soam sozinhos) nunca caem na pergunta de ouvir', () => {
    for (let pos = 0; pos < LOTES_DO_MODULO.length; pos++)
      for (const p of perguntasDoLote(pos, seededRng(7))) if (p.modo === 'ouvir') expect(p.kana.fala).toBe(p.kana.char);
  });
});

describe('progresso do Módulo 0', () => {
  it('a lição continua do primeiro lote não feito; feita, recomeça do início', async () => {
    const { inicioDaLicao } = await import('../src/curso/modulo0');
    const [l1, l2] = LICOES_KANA as [(typeof LICOES_KANA)[number], (typeof LICOES_KANA)[number]];
    expect(inicioDaLicao(l1, 0)).toBe(0);
    expect(inicioDaLicao(l1, 2)).toBe(2);
    expect(inicioDaLicao(l1, 99)).toBe(0);
    expect(inicioDaLicao(l2, 0)).toBe(l1.lotes.length);
  });

  it('o save guarda os lotes feitos e descarta valor estranho', async () => {
    const { ensureCursoSave } = await import('../src/curso/motor');
    expect(ensureCursoSave({ curso: { modulo0: 4.7 } }).modulo0).toBe(4);
    expect(ensureCursoSave({ curso: { modulo0: 'x' } }).modulo0).toBeUndefined();
  });
});
