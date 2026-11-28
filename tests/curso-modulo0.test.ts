// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOTES } from '../src/content/kana';
import type { Manifesto } from '../src/core/audio';
import { seededRng } from '../src/core/rng';
import { VOZ_PALAVRA } from '../src/core/vozes';
import {
  itensDoLote,
  kanaAte,
  kanaDoLote,
  licaoDaPosicao,
  LICOES_KANA,
  LOTES_DO_MODULO,
  migrarModulo0,
  perguntasDoLote,
  posicaoDoLote,
  VERSAO_DO_MODULO0,
} from '../src/curso/modulo0';

describe('Módulo 0: kana e sons', () => {
  it('as lições cobrem todos os kana do Kana em imagens, cada um uma vez, e cada lote uma vez, na ordem', () => {
    const doModulo = LOTES_DO_MODULO.flatMap((l) => l.ids);
    expect([...doModulo].sort()).toEqual(LOTES.flatMap((l) => l.ids).sort());
    expect(new Set(doModulo).size).toBe(doModulo.length);
    expect(LICOES_KANA.flatMap((l) => l.lotes)).toEqual(LOTES_DO_MODULO.map((l) => l.id));
    expect(licaoDaPosicao(0)?.id).toBe('m0-1');
    expect(licaoDaPosicao(LOTES_DO_MODULO.length - 1)?.id).toBe(LICOES_KANA.at(-1)?.id);
  });

  // A lição 4 tinha 11 lotes (tenten, maru, pequenos, combinados e sons longos de uma vez).
  it('nenhuma lição passa de sete lotes', () => {
    for (const l of LICOES_KANA) {
      expect(l.lotes.length, l.id).toBeGreaterThan(0);
      expect(l.lotes.length, l.id).toBeLessThanOrEqual(7);
    }
  });

  // Os combinados são feitos com os pequenos: o pequeno vem antes, explicado sozinho.
  it('os kana pequenos vêm antes dos combinados, no hiragana e no katakana', () => {
    const pos = (char: string) => LOTES_DO_MODULO.findIndex((l) => kanaDoLote(l).some((k) => k.char === char));
    expect(pos('ゃ')).toBeLessThan(pos('きゃ'));
    expect(pos('っ')).toBeLessThan(pos('きゃ'));
    expect(pos('ャ')).toBeLessThan(pos('キャ'));
    expect(pos('ー')).toBeLessThan(pos('キャ'));
  });

  it('a vogal longa tem cartão, que não vira carta de revisão', () => {
    const p = posicaoDoLote('hp');
    const itens = itensDoLote(p);
    expect(itens[0]?.tipo).toBe('Som longo');
    expect(itens[0]?.alvo.t).not.toBe('kana');
    expect(itens.filter((i) => i.alvo.t === 'kana').length).toBe(kanaDoLote(LOTES_DO_MODULO[p]!).length);
  });

  // O exemplo do Kana em imagens (朝 para あ) trazia kanji e kana que a pessoa ainda não tinha visto.
  it('o exemplo de cada kana só usa kana já vistos, sem kanji, e tem voz gravada', () => {
    const manifesto = JSON.parse(readFileSync(join(__dirname, '..', 'public/vozes/manifesto.json'), 'utf8')) as Manifesto;
    let com = 0;
    LOTES_DO_MODULO.forEach((_, p) => {
      const letras = new Set(kanaAte(p).flatMap((k) => [...k.char]));
      for (const i of itensDoLote(p)) {
        if (i.alvo.t !== 'kana' || !i.exemplo) continue;
        com++;
        const kana = i.exemplo.kana ?? '';
        expect(i.exemplo.jp).toBe(kana);
        for (const c of kana) expect(letras.has(c), `${i.grande}: ${kana}`).toBe(true);
        expect(kana, i.grande).toContain(i.grande);
        expect(manifesto.falas[kana]?.[VOZ_PALAVRA], `voz de ${kana}`).toBeTruthy();
        // A voz do cartão fala o exemplo novo, não o antigo.
        expect(i.falas.at(-1)).toMatchObject({ tipo: 'jp', fala: { texto: kana } });
      }
    });
    expect(com).toBeGreaterThanOrEqual(150);
  });

  it('o cartão da vogal longa tem voz gravada em todas as palavras', () => {
    const manifesto = JSON.parse(readFileSync(join(__dirname, '..', 'public/vozes/manifesto.json'), 'utf8')) as Manifesto;
    for (const t of itensDoLote(posicaoDoLote('hp'))[0]!.falas) if (t.tipo === 'jp') expect(manifesto.falas[t.fala.texto]?.[VOZ_PALAVRA], t.fala.texto).toBeTruthy();
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
    expect(ensureCursoSave({ curso: { modulo0: 4.7, modulo0Ordem: VERSAO_DO_MODULO0 } }).modulo0).toBe(4);
    expect(ensureCursoSave({ curso: { modulo0: 'x' } }).modulo0).toBeUndefined();
  });

  // A ordem dos lotes mudou (os pequenos antes dos combinados): quem fez o módulo na ordem antiga
  // fica com os lotes cujos kana já viu, e nunca pula um kana.
  it('save da ordem antiga: conta só os lotes novos já vistos por inteiro', async () => {
    const { ensureCursoSave } = await import('../src/curso/motor');
    for (let antigo = 0; antigo <= LOTES.length; antigo++) {
      const novo = migrarModulo0(antigo);
      const vistos = new Set(LOTES.slice(0, antigo).flatMap((l) => l.ids));
      for (const l of LOTES_DO_MODULO.slice(0, novo)) for (const id of l.ids) expect(vistos.has(id), `${antigo}: ${id}`).toBe(true);
    }
    expect(migrarModulo0(9)).toBe(9);
    expect(migrarModulo0(LOTES.length)).toBe(LOTES_DO_MODULO.length);
    // No meio dos combinados antigos: volta para o lote dos pequenos.
    expect(migrarModulo0(16)).toBe(posicaoDoLote('hp'));
    const s = ensureCursoSave({ curso: { modulo0: 16 } });
    expect(s.modulo0).toBe(posicaoDoLote('hp'));
    expect(s.modulo0Ordem).toBe(VERSAO_DO_MODULO0);
    expect(ensureCursoSave({ curso: { modulo0: 16, modulo0Ordem: VERSAO_DO_MODULO0 } }).modulo0).toBe(16);
  });
});
