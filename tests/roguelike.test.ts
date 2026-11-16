import { describe, expect, it } from 'vitest';
import { cardKey, getWord, parseCardKey } from '../src/content';
import { seededRng } from '../src/core/rng';
import { emptySave } from '../src/core/save';
import { review } from '../src/core/srs';
import {
  buildMap,
  EFFECTS,
  emptyRoguelikeSave,
  ensureRoguelikeSave,
  ENERGY,
  HAND_SIZE,
  MAX_HP,
  REST_HEAL,
  Run,
  SHARPEN,
  type RelicId,
  type RunCard,
  type RunEvent,
} from '../src/games/roguelike/engine';

const T0 = new Date('2026-11-16T12:00:00').getTime();

function setup(seed = 1, relic?: RelicId) {
  const data = emptySave(T0);
  const save = emptyRoguelikeSave();
  let t = T0;
  const run = new Run({ cards: data.cards, profile: data.profile, save, rng: seededRng(seed), now: () => t });
  if (relic) run.relics.splice(0, run.relics.length, relic);
  const events = run.start();
  return { data, save, run, events, tick: (ms: number) => (t += ms) };
}

/** Joga a carta `index` e responde certo ou errado. */
function playCard(run: Run, index: number, correct: boolean, ms = 4000): RunEvent[] {
  const asked = run.playCard(index);
  if (asked.length === 0) return [];
  const q = run.question!;
  const input = correct ? q.answer : (q.choices.find((c) => c !== q.answer) as string);
  return run.answer(input, ms);
}

function played(events: RunEvent[]) {
  return events.find((e): e is Extract<RunEvent, { t: 'play' }> => e.t === 'play')!;
}

/** Posição de uma carta com esse efeito na mão. Se a mão sorteada não tem, puxa uma do monte. */
function handIndex(run: Run, effect: RunCard['effect']): number {
  const found = run.hand.findIndex((c) => c.effect === effect);
  if (found >= 0) return found;
  const at = run.drawPile.findIndex((c) => c.effect === effect);
  run.hand.push(...run.drawPile.splice(at, 1));
  return run.hand.length - 1;
}

/** Carta que um jogador atento jogaria: escudo se o golpe do inimigo ainda passa, senão golpe. */
function sensibleCard(run: Run): number {
  const needBlock = (run.intent.attack ?? 0) > run.block;
  const order: RunCard['effect'][] = needBlock ? ['block', 'attack'] : ['attack', 'draw'];
  for (const effect of order) {
    const i = run.hand.findIndex((c) => c.effect === effect);
    if (i >= 0) return i;
  }
  return 0;
}

/** Joga a run inteira com uma regra fixa de acerto. Devolve todos os eventos. */
function autoplay(run: Run, tick: (ms: number) => void, correct: () => boolean, max = 3000): RunEvent[] {
  const all: RunEvent[] = [];
  for (let i = 0; i < max && run.phase !== 'over'; i++) {
    tick(5000);
    if (run.phase === 'map') all.push(...run.choose(0));
    else if (run.phase === 'combat') all.push(...(run.canPlay ? playCard(run, sensibleCard(run), correct()) : run.endTurn()));
    else if (run.phase === 'reward') all.push(...run.takeReward(0));
    else if (run.phase === 'rest') all.push(...run.rest('heal'));
    else if (run.phase === 'shop') {
      run.buy(0);
      all.push(...run.leaveShop());
    }
  }
  return all;
}

describe('mapa', () => {
  it('tem 7 andares, começa em combate, termina no chefe e passa por descanso, loja e elite', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const map = buildMap(seededRng(seed));
      expect(map).toHaveLength(7);
      expect(map[0]).toEqual(['combat']);
      expect(map[6]).toEqual(['boss']);
      const all = map.flat();
      for (const kind of ['rest', 'shop', 'elite'] as const) expect(all).toContain(kind);
    }
  });
});

describe('começo da run', () => {
  it('já começa no primeiro combate, com mão cheia, energia e uma relíquia', () => {
    const { run, save, events } = setup();
    expect(events).toEqual([{ t: 'enter', node: 'combat' }]);
    expect(run.phase).toBe('combat');
    expect(run.hand).toHaveLength(HAND_SIZE + (run.has('bolso') ? 1 : 0));
    expect(run.energy).toBe(ENERGY + (run.has('lanterna') ? 1 : 0));
    expect(run.relics).toHaveLength(1);
    expect(run.hp).toBe(MAX_HP);
    expect(save.runs).toBe(1);
  });

  it('o baralho inicial tem 8 cartas: golpes, escudos e um foco', () => {
    const { run } = setup();
    expect(run.deck.map((c) => c.effect).sort()).toEqual(['attack', 'attack', 'attack', 'attack', 'block', 'block', 'block', 'draw']);
    expect(new Set(run.deck.map((c) => c.uid)).size).toBe(8);
  });

  it('para quem nunca jogou, o baralho traz os primeiros kanji e uma palavra feita só deles', () => {
    const { run } = setup();
    const items = [...new Set(run.deck.map((c) => c.itemId))];
    expect(items.slice(0, 3)).toEqual(['k:一', 'k:二', 'k:三']);
    const word = getWord(items[3] as string);
    expect(word.kanji.every((c) => ['一', '二', '三'].includes(c))).toBe(true);
  });
});

describe('cartas e perguntas', () => {
  it('carta nunca vista ensina antes de perguntar, e responder vale como acerto com ajuda', () => {
    const { run, data } = setup();
    const card = run.hand[0] as RunCard;
    const [ask] = run.playCard(0);
    expect(ask?.t).toBe('ask');
    expect(run.phase).toBe('question');
    expect(run.question!.teach).toBeDefined();
    const key = run.question!.card;
    expect(parseCardKey(key).itemId).toBe(card.itemId);
    const events = run.answer(run.question!.answer, 800);
    expect(played(events).correct).toBe(true);
    // Primeiro contato não conta como resposta rápida.
    expect(played(events).fast).toBe(false);
    expect(data.cards[key]?.reps).toBe(1);
    expect(run.stats.newItems).toHaveLength(1);
  });

  it('a segunda vez que a carta aparece pergunta sem ensinar', () => {
    const { run, data } = setup();
    data.cards[cardKey('k:一', 'meaning')] = review(undefined, { correct: true, hinted: true }, T0);
    const i = run.hand.findIndex((c) => c.itemId === 'k:一');
    const again = i >= 0 ? i : (run.hand.push(run.deck.find((c) => c.itemId === 'k:一') as RunCard), run.hand.length - 1);
    run.playCard(again);
    expect(run.question!.teach).toBeUndefined();
    expect(run.question!.kind).toBe('kanji-meaning');
  });

  it('acertar solta o efeito forte e errar solta o fraco, mostrando a resposta', () => {
    const a = setup(3, 'cha');
    const hpA = a.run.enemy!.hp;
    const hit = played(playCard(a.run, handIndex(a.run, 'attack'), true));
    expect(hit.amount).toBe(EFFECTS.attack.strong);
    expect(a.run.enemy!.hp).toBe(hpA - EFFECTS.attack.strong);

    const b = setup(3, 'cha');
    const hpB = b.run.enemy!.hp;
    const index = handIndex(b.run, 'attack');
    b.run.playCard(index);
    const answer = b.run.question!.answer;
    const miss = played(b.run.answer('errado de propósito', 4000));
    expect(miss.correct).toBe(false);
    expect(miss.amount).toBe(EFFECTS.attack.weak);
    expect(miss.answer).toBe(answer);
    expect(b.run.enemy!.hp).toBe(hpB - EFFECTS.attack.weak);
  });

  it('cada resposta registra a revisão na carta certa', () => {
    const { run, data } = setup(3, 'cha');
    run.playCard(0);
    const key = run.question!.card;
    run.answer('errado', 4000);
    expect(data.cards[key]?.reps).toBe(1);
    expect(Object.keys(data.cards)).toEqual([key]);
  });

  it('resposta rápida dá bônus e lenta não tira nada', () => {
    const { run, data } = setup(3, 'cha');
    for (const c of run.deck) data.cards[cardKey(c.itemId, 'meaning')] = review(undefined, { correct: true, hinted: true }, T0);
    const fast = played(playCard(run, handIndex(run, 'attack'), true, 1000));
    expect(fast.fast).toBe(true);
    expect(fast.amount).toBe(EFFECTS.attack.strong + 2);
    const slow = played(playCard(run, handIndex(run, 'attack'), true, 30_000));
    expect(slow.amount).toBe(EFFECTS.attack.strong);
  });

  it('cada carta gasta uma energia, e sem energia a carta não sai', () => {
    const { run } = setup(3, 'cha');
    for (let i = 0; i < ENERGY; i++) playCard(run, handIndex(run, 'block'), true);
    expect(run.energy).toBe(0);
    expect(run.canPlay).toBe(false);
    expect(run.playCard(0)).toEqual([]);
    expect(run.phase).toBe('combat');
  });

  it('escudo segura o ataque do inimigo e some no turno seguinte', () => {
    const { run } = setup(3, 'cha');
    playCard(run, handIndex(run, 'block'), true);
    expect(run.block).toBe(EFFECTS.block.strong);
    const attack = run.intent.attack ?? 0;
    const [enemy] = run.endTurn();
    expect(enemy).toMatchObject({ t: 'enemy', blocked: Math.min(attack, EFFECTS.block.strong), damage: Math.max(0, attack - EFFECTS.block.strong) });
    expect(run.block).toBe(0);
    expect(run.turn).toBe(2);
    expect(run.hand.length).toBeGreaterThan(0);
  });

  it('o baralho recicla o descarte quando acaba', () => {
    const { run } = setup(3, 'cha');
    for (let i = 0; i < 6; i++) {
      run.hp = MAX_HP;
      run.endTurn();
    }
    expect(run.hand).toHaveLength(HAND_SIZE);
    expect(run.hand.length + run.drawPile.length + run.discard.length).toBe(run.deck.length);
  });
});

describe('relíquias', () => {
  it('sino: a primeira carta do turno custa zero', () => {
    const { run } = setup(3, 'sino');
    expect(run.costOf()).toBe(0);
    playCard(run, 0, true);
    expect(run.energy).toBeGreaterThanOrEqual(ENERGY);
    expect(run.costOf()).toBe(1);
  });

  it('leque: três acertos seguidos dão escudo', () => {
    const { run } = setup(3, 'leque');
    const events: RunEvent[] = [];
    for (let i = 0; i < 3; i++) events.push(...playCard(run, handIndex(run, 'block'), true));
    expect(events.some((e) => e.t === 'relic' && e.relic === 'leque')).toBe(true);
    expect(run.block).toBe(EFFECTS.block.strong * 3 + 4);
  });

  it('amuleto: carta errada sai com metade da força', () => {
    const { run } = setup(3, 'amuleto');
    const miss = played(playCard(run, handIndex(run, 'attack'), false));
    expect(miss.amount).toBe(Math.ceil(EFFECTS.attack.strong / 2));
  });

  it('lanterna e bolso: energia extra no primeiro turno e uma carta a mais na mão', () => {
    const lit = setup(3, 'lanterna');
    expect(lit.run.energy).toBe(ENERGY + 1);
    lit.run.endTurn();
    expect(lit.run.energy).toBe(ENERGY);
    const deep = setup(3, 'bolso');
    expect(deep.run.hand).toHaveLength(HAND_SIZE + 1);
  });
});

describe('recompensa, descanso e loja', () => {
  function winFirst(seed = 3) {
    const s = setup(seed, 'cha');
    for (let i = 0; i < 200 && s.run.phase !== 'reward'; i++) {
      s.tick(5000);
      if (s.run.canPlay) playCard(s.run, 0, true);
      else s.run.endTurn();
    }
    return s;
  }

  it('vencer paga ouro, moedas e XP e oferece 3 cartas de itens que não estão no baralho', () => {
    const { run, data } = winFirst();
    expect(run.phase).toBe('reward');
    expect(run.gold).toBeGreaterThanOrEqual(20);
    expect(data.profile.coins).toBeGreaterThan(0);
    expect(data.profile.xp).toBeGreaterThan(0);
    const offers = run.reward!.offers;
    expect(offers).toHaveLength(3);
    const inDeck = new Set(run.deck.map((c) => c.itemId));
    for (const o of offers) expect(inDeck.has(o.itemId)).toBe(false);
    expect(new Set(offers.map((o) => o.itemId)).size).toBe(3);
  });

  it('a recompensa não traz item novo quando há muita coisa mole na memória', () => {
    const busy = setup(3, 'cha');
    // 30 kanji recém-vistos: todos ainda em aprendizado.
    for (let i = 0; i < 30; i++) {
      const id = `k:${'一二三四五六七八九十百千万円日月火水木金土山川田人口目耳手足'[i]}`;
      busy.data.cards[cardKey(id, 'meaning')] = review(undefined, { correct: true, hinted: true }, T0);
    }
    for (let i = 0; i < 200 && busy.run.phase !== 'reward'; i++) {
      if (busy.run.canPlay) playCard(busy.run, 0, true);
      else busy.run.endTurn();
    }
    expect(busy.run.reward!.offers.filter((o) => busy.run.isNew(o.itemId))).toHaveLength(0);
  });

  it('escolher uma carta aumenta o baralho e leva ao mapa; pular não aumenta', () => {
    const a = winFirst();
    const size = a.run.deck.length;
    a.run.takeReward(1);
    expect(a.run.deck).toHaveLength(size + 1);
    expect(a.run.phase).toBe('map');
    expect(a.run.floor).toBe(1);
    expect(a.save.bestFloor).toBe(1);

    const b = winFirst();
    b.run.takeReward(null);
    expect(b.run.deck).toHaveLength(size);
    expect(b.run.phase).toBe('map');
  });

  function goTo(kind: 'rest' | 'shop') {
    const s = winFirst();
    s.run.takeReward(null);
    for (let i = 0; i < 400 && s.run.floor < 2; i++) {
      if (s.run.phase === 'map') s.run.choose(0);
      else if (s.run.phase === 'reward') s.run.takeReward(null);
      else if (s.run.canPlay) playCard(s.run, 0, true);
      else s.run.endTurn();
    }
    s.run.choose(s.run.options.indexOf(kind));
    return s;
  }

  it('descanso: dormir cura, afiar aumenta o dano dos golpes', () => {
    const a = goTo('rest');
    a.run.hp = 10;
    a.run.rest('heal');
    expect(a.run.hp).toBe(10 + REST_HEAL);
    expect(a.run.phase).toBe('map');

    const b = goTo('rest');
    b.run.rest('sharpen');
    expect(b.run.strength).toBe(SHARPEN);
    expect(b.run.strongAmount({ uid: 0, itemId: 'k:一', effect: 'attack' })).toBe(EFFECTS.attack.strong + SHARPEN);
    expect(b.run.strongAmount({ uid: 0, itemId: 'k:一', effect: 'block' })).toBe(EFFECTS.block.strong);
  });

  it('loja: compra gasta ouro, não deixa comprar duas vezes nem sem ouro', () => {
    const { run } = goTo('shop');
    expect(run.phase).toBe('shop');
    const card = run.shop.findIndex((i) => i.t === 'card');
    run.gold = 30;
    const size = run.deck.length;
    expect(run.buy(card)).toBe(true);
    expect(run.gold).toBe(0);
    expect(run.deck).toHaveLength(size + 1);
    expect(run.buy(card)).toBe(false);
    expect(run.buy(run.shop.findIndex((i) => i.t === 'heal'))).toBe(false);
    run.gold = 60;
    const relic = run.shop.findIndex((i) => i.t === 'relic');
    expect(run.buy(relic)).toBe(true);
    expect(run.relics).toHaveLength(2);
    run.leaveShop();
    expect(run.phase).toBe('map');
  });
});

describe('run inteira', () => {
  it('acertando tudo, vence o chefe em qualquer semente', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { run, save, tick, data } = setup(seed);
      const events = autoplay(run, tick, () => true);
      expect(run.phase, `semente ${seed}`).toBe('over');
      expect(run.won, `semente ${seed}`).toBe(true);
      expect(events.at(-1)).toEqual({ t: 'over', won: true });
      expect(run.floor).toBe(7);
      expect(save.wins).toBe(1);
      expect(save.bestFloor).toBe(7);
      expect(data.profile.xp).toBeGreaterThan(0);
    }
  });

  it('errando tudo, a run acaba em derrota e o estudo continua registrado', () => {
    const { run, save, tick, data } = setup(5);
    const events = autoplay(run, tick, () => false);
    expect(events.at(-1)).toEqual({ t: 'over', won: false });
    expect(run.won).toBe(false);
    expect(run.hp).toBe(0);
    expect(save.wins).toBe(0);
    expect(Object.keys(data.cards).length).toBeGreaterThan(0);
    expect(run.stats.wrong).toBeGreaterThan(0);
    // Depois do fim, nada mais acontece.
    expect(run.endTurn()).toEqual([]);
    expect(run.playCard(0)).toEqual([]);
  });

  it('acertando metade, dá para ir longe sem ser garantido', () => {
    let floors = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const { run, tick } = setup(seed);
      const coin = seededRng(seed * 7);
      autoplay(run, tick, () => coin() < 0.5);
      floors += run.floor;
    }
    expect(floors / 20).toBeGreaterThan(2);
  });

  it('pegar o caminho da elite rende uma relíquia', () => {
    const { run, tick } = setup(2);
    for (let i = 0; i < 2000 && run.phase !== 'over'; i++) {
      tick(5000);
      if (run.phase === 'map') run.choose(Math.max(0, run.options.indexOf('elite')));
      else if (run.phase === 'reward') {
        if (run.enemy?.kind === 'elite') {
          expect(run.reward!.relic).toBeDefined();
          expect(run.relics).toHaveLength(2);
          return;
        }
        run.takeReward(0);
      } else if (run.phase === 'rest') run.rest('heal');
      else if (run.phase === 'shop') run.leaveShop();
      else if (run.canPlay) playCard(run, 0, true);
      else run.endTurn();
    }
    throw new Error('não chegou na elite');
  });
});

describe('save', () => {
  it('cria, completa campos e devolve sempre o mesmo objeto', () => {
    const games: Record<string, unknown> = {};
    const a = ensureRoguelikeSave(games);
    a.runs = 3;
    expect(ensureRoguelikeSave(games)).toBe(a);
    const broken: Record<string, unknown> = { roguelike: { runs: 'x', wins: 2 } };
    expect(ensureRoguelikeSave(broken)).toEqual({ runs: 0, wins: 2, bestFloor: 0, bestCombo: 0 });
    expect(ensureRoguelikeSave({ roguelike: null })).toEqual(emptyRoguelikeSave());
  });
});
