import { describe, expect, it } from 'vitest';
import { FIGURAS, figura } from '../src/content/imagens';
import { seededRng } from '../src/core/rng';
import { emptySave } from '../src/core/save';
import { review, type CardState } from '../src/core/srs';
import {
  brigam,
  chave,
  distancia,
  ensureMemoriaSave,
  grupoParecido,
  MemoriaRound,
  montarQuadro,
  mostraDe,
  QUADROS,
  seConfundem,
  SOBE_COM,
  subir,
  type MemoriaSave,
} from '../src/games/memoria/engine';

/** Carta já firme (em revisão), com estabilidade de alguns dias ou semanas. */
function firme(dias: number): CardState {
  let c = review(undefined, { correct: true }, 0);
  let t = 0;
  while (c.stability < dias) {
    t = c.due;
    c = review(c, { correct: true }, t);
  }
  return c;
}
const FIRME5 = firme(5);
const FIRME30 = firme(30);

function rodada(seed = 1, prep?: (s: ReturnType<typeof emptySave>, m: MemoriaSave) => void) {
  const data = emptySave(0);
  const save = ensureMemoriaSave(data.games);
  prep?.(data, save);
  let t = 1_000_000;
  const r = new MemoriaRound({ cards: data.cards, profile: data.profile, save, now: () => (t += 3000), rng: seededRng(seed) });
  return { r, data, save };
}

/** Joga o quadro inteiro sem errar. */
function resolver(r: MemoriaRound) {
  const ev = [];
  r.comecar();
  const pares = new Map<number, number[]>();
  r.quadro.cartas.forEach((c, i) => pares.set(c.par, [...(pares.get(c.par) ?? []), i]));
  for (const [a, b] of pares.values()) {
    ev.push(...r.escolher_carta(a!), ...r.escolher_carta(b!));
  }
  return ev;
}

describe('Memória: regras puras', () => {
  it('distância de kana conta um som trocado', () => {
    expect(distancia('かさ', 'かぎ')).toBe(1);
    expect(distancia('いす', 'いぬ')).toBe(1);
    expect(distancia('ねこ', 'いぬ')).toBe(2);
  });

  it('palavras com o mesmo kana (雨 e 飴) nunca dividem o quadro, nem como "parecidas"', () => {
    // 雨 saiu do vocabulário em imagem (nenhuma imagem de chuva ficou clara), mas a regra vale para qualquer par assim.
    const doce = figura('ame-kyandi');
    const ame = { ...doce, img: 'ame', word: { ...doce.word, id: 'w:雨', jp: '雨', pt: 'chuva' } };
    expect(brigam(ame, doce)).toBe(true);
    expect(seConfundem(ame.word, doce.word)).toBe(false);
  });

  it('a carta de palavra muda com o nível: kana, kanji, áudio; palavra sem kanji pula o kanji', () => {
    const kasa = figura('kasa');
    expect(mostraDe(kasa.word, 0)).toBe('kana');
    expect(mostraDe(kasa.word, 1)).toBe('kanji');
    expect(mostraDe(kasa.word, 2)).toBe('audio');
    const tv = figura('terebi');
    expect(subir(tv.word, 0)).toBe(2);
    expect(subir(kasa.word, 0)).toBe(1);
  });

  it('o quadro tem duas cartas por figura, uma imagem e uma palavra', () => {
    const figs = FIGURAS.slice(0, 4);
    const q = montarQuadro(figs, 'memoria', () => 0, seededRng(3));
    expect(q.cartas).toHaveLength(8);
    for (let p = 0; p < 4; p++) {
      const do_par = q.cartas.filter((c) => c.par === p);
      expect(do_par.map((c) => c.lado).sort()).toEqual(['img', 'palavra']);
    }
    expect(q.cartas.every((c) => !c.aberta)).toBe(true);
  });

  it('grupo de parecidas: todos se confundem com alguém e nenhum briga', () => {
    const g = grupoParecido(FIGURAS, 6, seededRng(5));
    expect(g.length).toBeGreaterThanOrEqual(3);
    for (const f of g) {
      expect(g.some((o) => o !== f && seConfundem(o.word, f.word))).toBe(true);
      expect(g.filter((o) => o !== f && brigam(o, f))).toEqual([]);
    }
  });

  it('save quebrado é consertado no mesmo objeto', () => {
    const games: Record<string, unknown> = { memoria: { nivel: { 'w:傘': 9, x: 'a' }, rounds: -1, best: NaN } };
    const s = ensureMemoriaSave(games);
    expect(s).toBe(games.memoria);
    expect(s.nivel).toEqual({ 'w:傘': 2 });
    expect(s.rounds).toBe(0);
    expect(s.best).toBe(0);
  });
});

describe('Memória: rodada', () => {
  it('jogador novo: o primeiro quadro apresenta as palavras antes de cobrar', () => {
    const { r } = rodada();
    expect(r.fase).toBe('licao');
    expect(r.quadro.novas.length).toBe(r.quadro.cartas.length / 2);
    // Antes de "começar", escolher carta não faz nada.
    expect(r.escolher_carta(0)).toEqual([]);
  });

  it('nenhum quadro tem duas palavras que brigam', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { r } = rodada(seed);
      for (let n = 0; n < QUADROS.length; n++) {
        const figs = [...new Set(r.quadro.cartas.map((c) => c.figura))];
        for (const a of figs) for (const b of figs) if (a !== b) expect(brigam(a, b)).toBe(false);
        resolver(r);
        r.proximo();
      }
    }
  });

  it('três quadros com pausa entre eles; o fim dá resumo, XP e moedas', () => {
    const { r, data, save } = rodada(2);
    const ev1 = resolver(r);
    expect(ev1.some((e) => e.t === 'quadro')).toBe(true);
    expect(r.fase).toBe('pausa');
    r.proximo();
    resolver(r);
    r.proximo();
    const fim = resolver(r);
    const e = fim.find((x) => x.t === 'fim');
    expect(e && e.t === 'fim' && e.resumo.pares).toBe(4 + 6 + 6);
    expect(save.rounds).toBe(1);
    expect(data.profile.coins).toBeGreaterThan(0);
    expect(data.profile.xp).toBeGreaterThan(0);
  });

  it('palavra nova acertada leva nota "com ajuda", nunca nota ruim', () => {
    const { r, data } = rodada(4);
    resolver(r);
    for (const c of r.quadro.cartas) {
      const card = data.cards[chave(c.figura.word)];
      expect(card).toBeDefined();
      expect(card!.lapses).toBe(0);
    }
  });

  it('rápido: par errado é confusão (combo zera, nota ruim, nível desce), sem tela de erro', () => {
    const { r, data, save } = rodada(6, (d, m) => {
      // Todas as palavras já vistas: o quadro não abre lição.
      for (const f of FIGURAS) {
        d.cards[chave(f.word)] = FIRME5;
        m.nivel[f.word.id] = 1;
      }
    });
    expect(r.fase).toBe('jogo');
    const cs = r.quadro.cartas;
    const img = cs.findIndex((c) => c.lado === 'img');
    const errada = cs.findIndex((c) => c.lado === 'palavra' && c.par !== cs[img]!.par);
    const ev = [...r.escolher_carta(img), ...r.escolher_carta(errada)];
    expect(ev.some((e) => e.t === 'confusao')).toBe(true);
    expect(r.combo).toBe(0);
    const w = cs[img]!.figura.word;
    expect(data.cards[chave(w)]!.lapses).toBe(1);
    expect(save.nivel[w.id]).toBe(0);
    expect(r.fase).toBe('jogo');
  });

  it('memória: errar com carta nunca vista é explorar, não confusão', () => {
    const { r } = rodada(8, (d) => {
      for (const f of FIGURAS) d.cards[chave(f.word)] = FIRME5;
    });
    resolver(r);
    r.proximo();
    r.comecar();
    expect(r.quadro.modo).toBe('memoria');
    const cs = r.quadro.cartas;
    const img = cs.findIndex((c) => c.lado === 'img');
    const errada = cs.findIndex((c) => c.lado === 'palavra' && c.par !== cs[img]!.par);
    const ev = [...r.escolher_carta(img), ...r.escolher_carta(errada)];
    expect(ev.some((e) => e.t === 'confusao')).toBe(false);
    // As duas ficam abertas até a próxima jogada, e fecham sozinhas.
    expect(cs[img]!.aberta && cs[errada]!.aberta).toBe(true);
    r.fecharErradas();
    expect(cs[img]!.aberta || cs[errada]!.aberta).toBe(false);
    // Agora a palavra já foi vista: repetir o mesmo par errado é confusão.
    const ev2 = [...r.escolher_carta(img), ...r.escolher_carta(errada)];
    expect(ev2.some((e) => e.t === 'confusao')).toBe(true);
  });

  it(`${SOBE_COM} pares limpos seguidos sobem o nível da palavra`, () => {
    const { r, save } = rodada(9, (d) => {
      for (const f of FIGURAS) d.cards[chave(f.word)] = FIRME5;
    });
    const w = r.quadro.cartas[0]!.figura.word;
    save.seq[w.id] = SOBE_COM - 1;
    const ev = resolver(r);
    expect(ev.some((e) => e.t === 'sobe' && e.figura.word.id === w.id)).toBe(true);
    expect(save.nivel[w.id]).toBeGreaterThan(0);
  });

  it('com palavras firmes no áudio, o último quadro é de parecidas', () => {
    const { r } = rodada(10, (d, m) => {
      for (const f of FIGURAS) {
        d.cards[chave(f.word)] = FIRME30;
        m.nivel[f.word.id] = 2;
      }
    });
    resolver(r);
    r.proximo();
    resolver(r);
    r.proximo();
    expect(r.quadro.parecidas).toBe(true);
    expect(r.quadro.cartas.every((c) => c.lado === 'img' || c.mostra === 'audio')).toBe(true);
  });

  it('parar na pausa vale como rodada curta', () => {
    const { r, save } = rodada(11);
    resolver(r);
    const ev = r.parar();
    expect(ev.some((e) => e.t === 'fim')).toBe(true);
    expect(save.rounds).toBe(1);
  });

  it('confusão repetida faz o par certo brilhar', () => {
    const { r } = rodada(12, (d) => {
      for (const f of FIGURAS) d.cards[chave(f.word)] = FIRME5;
    });
    const cs = r.quadro.cartas;
    const img = cs.findIndex((c) => c.lado === 'img');
    const certa = cs.findIndex((c) => c.lado === 'palavra' && c.par === cs[img]!.par);
    const errada = cs.findIndex((c) => c.lado === 'palavra' && c.par !== cs[img]!.par);
    r.escolher_carta(img);
    r.escolher_carta(errada);
    expect(r.brilha(certa)).toBe(false);
    r.escolher_carta(img);
    r.escolher_carta(errada);
    expect(r.brilha(certa)).toBe(true);
  });
});
