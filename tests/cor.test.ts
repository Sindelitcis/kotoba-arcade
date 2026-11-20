import { ensurePecasSave } from '../src/games/pecas/engine';
import { afterEach, describe, expect, it } from 'vitest';
import { acertou, cor, COMBO_CHEIO, corDoCombo, corStyle, errou, progresso, visitados, zerar, type Saves } from '../src/core/cor';
import { emptyAventuraSave } from '../src/games/aventura/engine';
import { emptyCenaSave } from '../src/games/cena/engine';
import { emptyConversaSave } from '../src/games/conversa/engine';
import { emptyGramaticaSave } from '../src/games/gramatica/engine';
import { ensureKanaBeatSave } from '../src/games/kanabeat/engine';
import { emptyKanaImagensSave } from '../src/games/kanaimagens/engine';
import { emptyKanjimonSave } from '../src/games/kanjimon/engine';
import { emptyMemoriaSave } from '../src/games/memoria/engine';
import { emptyRoguelikeSave } from '../src/games/roguelike/engine';

function saves(): Saves {
  return {
    kanjimon: emptyKanjimonSave(),
    kanabeat: ensureKanaBeatSave({}),
    roguelike: emptyRoguelikeSave(),
    aventura: emptyAventuraSave(),
    gramatica: emptyGramaticaSave(),
    conversa: emptyConversaSave(),
    pecas: ensurePecasSave({}),
    kanaimagens: emptyKanaImagensSave(),
    memoria: emptyMemoriaSave(),
    cena: emptyCenaSave(),
  };
}

afterEach(() => zerar());

describe('cor como recompensa', () => {
  it('o combo enche a cor até o máximo e nunca passa de 1', () => {
    expect(corDoCombo(0)).toBe(0);
    expect(corDoCombo(-3)).toBe(0);
    expect(corDoCombo(Number.NaN)).toBe(0);
    expect(corDoCombo(COMBO_CHEIO / 2)).toBe(0.5);
    expect(corDoCombo(COMBO_CHEIO)).toBe(1);
    expect(corDoCombo(99)).toBe(1);
    expect(corDoCombo(5, 10)).toBe(0.5);
  });

  it('acerto só sobe a cor; erro derruba sem apagar de uma vez', () => {
    acertou(COMBO_CHEIO);
    expect(cor.value).toBe(1);
    // Um acerto com combo menor (depois de um erro) não tira cor que o jogador já ganhou.
    acertou(1);
    expect(cor.value).toBe(1);
    errou();
    expect(cor.value).toBeGreaterThan(0);
    expect(cor.value).toBeLessThan(0.5);
    errou();
    errou();
    expect(cor.value).toBeLessThan(0.05);
  });

  it('zerar volta para a tinta', () => {
    acertou(3);
    zerar();
    expect(cor.value).toBe(0);
  });

  it('progresso fica entre 0 e 1', () => {
    expect(progresso(0, 5)).toBe(0);
    expect(progresso(2, 4)).toBe(0.5);
    expect(progresso(9, 4)).toBe(1);
    expect(progresso(-1, 4)).toBe(0);
    expect(progresso(1, 0)).toBe(0);
  });

  it('corStyle arredonda e limita o valor que vai para o CSS', () => {
    expect(corStyle(0.333333)).toEqual({ '--cor': '0.33' });
    expect(corStyle(2)).toEqual({ '--cor': '1' });
    expect(corStyle(-1)).toEqual({ '--cor': '0' });
  });
});

describe('mapa sendo pintado', () => {
  it('save novo: nenhum jogo pintado', () => {
    expect(Object.values(visitados(saves())).some(Boolean)).toBe(false);
  });

  it('cada jogo jogado de verdade ganha cor, e só ele', () => {
    const s = saves();
    s.kanjimon.captures = 1;
    s.aventura.done = ['aeroporto'];
    s.conversa.conversas = 2;
    expect(visitados(s)).toEqual({ kanjimon: true, kanabeat: false, roguelike: false, aventura: true, gramatica: false, conversa: true, pecas: false, kanaimagens: false, memoria: false, cena: false });
    s.kanabeat.plays = 1;
    s.roguelike.runs = 1;
    s.gramatica.rounds = 1;
    s.pecas.rounds = 1;
    s.kanaimagens.rodadas = 1;
    s.memoria.rounds = 1;
    s.cena.rounds = 1;
    expect(Object.values(visitados(s)).every(Boolean)).toBe(true);
  });
});
