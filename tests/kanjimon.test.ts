import { describe, expect, it } from 'vitest';
import { cardKey, KANJI, WORDS } from '../src/content';
import { seededRng } from '../src/core/rng';
import { emptySave } from '../src/core/save';
import { DAY, review, type CardState } from '../src/core/srs';
import {
  BOOSTER_COST,
  canOpenBooster,
  CHEST_EVERY,
  checkAnswer,
  emptyKanjimonSave,
  ensureKanjimonSave,
  Hunt,
  kanjiMeaningQuestion,
  kanjiRecallQuestion,
  MAX_HEARTS,
  openBooster,
  PITY,
  wordMeaningQuestion,
  wordReadingQuestion,
  type HuntEvent,
} from '../src/games/kanjimon/engine';

const T0 = new Date('2026-11-15T12:00:00').getTime();

function setup(seed = 1) {
  const data = emptySave(T0);
  const save = emptyKanjimonSave();
  let t = T0;
  const hunt = new Hunt({ cards: data.cards, profile: data.profile, save, rng: seededRng(seed), now: () => t });
  return { data, save, hunt, tick: (ms: number) => (t += ms), now: () => t };
}

/** Joga respondendo sempre certo até acontecer `stop`. */
function playUntil(hunt: Hunt, tick: (ms: number) => void, stop: (e: HuntEvent) => boolean, max = 400): HuntEvent[] {
  const all: HuntEvent[] = [];
  for (let i = 0; i < max; i++) {
    tick(4000);
    const events = hunt.answer(hunt.question.answer, 4000);
    all.push(...events);
    if (events.some(stop)) return all;
    if (hunt.phase === 'chest') all.push(...hunt.continue());
  }
  throw new Error('não chegou no evento esperado');
}

describe('perguntas', () => {
  const rng = () => seededRng(3);

  it('toda pergunta tem 4 alternativas diferentes e a certa entre elas', () => {
    const r = rng();
    const all = [
      ...KANJI.map((k) => kanjiMeaningQuestion(k, r, false)),
      ...KANJI.map((k) => kanjiRecallQuestion(k, r)),
      ...WORDS.map((w) => wordMeaningQuestion(w, r, false)),
      ...WORDS.map((w) => wordReadingQuestion(w, r, false)),
    ];
    for (const q of all) {
      expect(q.choices, q.prompt).toHaveLength(4);
      expect(new Set(q.choices).size, q.prompt).toBe(4);
      expect(q.choices, q.prompt).toContain(q.answer);
    }
  });

  it('primeiro contato ensina antes de perguntar; revisão não', () => {
    const k = KANJI[0]!;
    expect(kanjiMeaningQuestion(k, rng(), true).teach?.title).toContain('一');
    expect(kanjiMeaningQuestion(k, rng(), false).teach).toBeUndefined();
  });

  it('digitação aceita romaji e kana, e trata vogal longa como quase', () => {
    const w = WORDS.find((x) => x.jp === '東京')!;
    const q = wordReadingQuestion(w, rng(), true);
    expect(checkAnswer(q, 'toukyou')).toBe('exact');
    expect(checkAnswer(q, 'とうきょう')).toBe('exact');
    expect(checkAnswer(q, 'tokyo')).toBe('close');
    expect(checkAnswer(q, 'kyouto')).toBe('wrong');
  });
});

describe('caçada', () => {
  it('começa com um kanji novo, ensinando o significado', () => {
    const { hunt } = setup();
    const [e] = hunt.start();
    expect(e).toMatchObject({ t: 'spawn', enemy: { isNew: true } });
    expect(hunt.enemy.kanji.kanji).toBe('一');
    expect(hunt.question.kind).toBe('kanji-meaning');
    expect(hunt.question.teach).toBeDefined();
    expect(hunt.hearts).toBe(MAX_HEARTS);
  });

  it('quebrar todos os selos captura a carta e paga moedas e XP', () => {
    const { hunt, data, save, tick } = setup();
    hunt.start();
    const first = hunt.enemy;
    const events = playUntil(hunt, tick, (e) => e.t === 'capture');
    const cap = events.find((e) => e.t === 'capture');
    expect(cap).toMatchObject({ t: 'capture', newCard: true });
    expect(events.filter((e) => e.t === 'hit')).toHaveLength(first.maxSeals);
    expect(save.captures).toBe(1);
    expect(Object.values(save.dex)).toEqual([1]);
    expect(data.profile.coins).toBeGreaterThan(0);
    expect(data.profile.xp).toBeGreaterThan(0);
    expect(data.cards[cardKey(first.kanji.id, 'meaning')]).toBeDefined();
  });

  it('erro tira um coração, zera o combo e a pergunta volta sem a aula', () => {
    const { hunt, data, tick } = setup();
    hunt.start();
    const q = hunt.question;
    tick(3000);
    const events = hunt.answer('resposta errada', 3000);
    expect(events).toEqual([{ t: 'miss', answer: q.answer, hearts: MAX_HEARTS - 1 }]);
    expect(hunt.combo).toBe(0);
    expect(data.cards[q.card]?.reps).toBe(1);
    // a mesma carta reaparece no máximo na pergunta seguinte
    const cardsAhead = [hunt.question.card];
    tick(3000);
    hunt.answer(hunt.question.answer, 3000);
    cardsAhead.push(hunt.question.card);
    expect(cardsAhead).toContain(q.card);
    const again = hunt.question.card === q.card ? hunt.question : null;
    if (again) expect(again.teach).toBeUndefined();
  });

  it('sem corações a caçada termina e não aceita mais respostas', () => {
    const { hunt, tick } = setup();
    hunt.start();
    let last: HuntEvent[] = [];
    for (let i = 0; i < MAX_HEARTS; i++) {
      tick(1000);
      last = hunt.answer('errado', 1000);
    }
    expect(last.at(-1)).toEqual({ t: 'over' });
    expect(hunt.phase).toBe('over');
    expect(hunt.answer(hunt.question.answer, 1000)).toEqual([]);
  });

  it('a cada 5 capturas vem um baú, devolve um coração e a caçada espera', () => {
    const { hunt, tick, data } = setup();
    hunt.start();
    tick(1000);
    hunt.answer('errado', 1000); // perde um coração para ver o baú devolver
    const coinsBefore = () => data.profile.coins;
    const events = playUntil(hunt, tick, (e) => e.t === 'chest');
    const chest = events.find((e) => e.t === 'chest');
    expect(events.filter((e) => e.t === 'capture')).toHaveLength(CHEST_EVERY);
    expect(chest).toMatchObject({ t: 'chest', hearts: MAX_HEARTS });
    expect(hunt.phase).toBe('chest');
    expect(hunt.answer('qualquer', 100)).toEqual([]);
    expect(coinsBefore()).toBeGreaterThan(0);
    expect(hunt.continue()[0]).toMatchObject({ t: 'spawn' });
    expect(hunt.phase).toBe('question');
  });

  it('resposta rápida dá bônus, mas não no primeiro contato', () => {
    const { hunt, tick } = setup();
    hunt.start();
    tick(500);
    const taught = hunt.answer(hunt.question.answer, 500);
    expect(taught[0]).toMatchObject({ t: 'hit', fast: false });
    // segue até uma pergunta sem aula
    for (let i = 0; i < 200 && hunt.question.teach; i++) {
      tick(4000);
      hunt.answer(hunt.question.answer, 4000);
      if (hunt.phase === 'chest') hunt.continue();
    }
    expect(hunt.question.teach).toBeUndefined();
    tick(500);
    expect(hunt.answer(hunt.question.answer, 500)[0]).toMatchObject({ t: 'hit', fast: true });
  });

  it('não repete o mesmo kanji em encontros seguidos', () => {
    const { hunt, tick } = setup(9);
    hunt.start();
    const seen: string[] = [hunt.enemy.kanji.kanji];
    for (let i = 0; i < 12; i++) {
      const events = playUntil(hunt, tick, (e) => e.t === 'capture');
      const spawn = events.find((e) => e.t === 'spawn');
      if (spawn && spawn.t === 'spawn') seen.push(spawn.enemy.kanji.kanji);
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i], `encontro ${i}`).not.toBe(seen[i - 1]);
  });

  it('numa sessão longa as novidades pausam em vez de empilhar', () => {
    const { hunt, tick, data } = setup(4);
    hunt.start();
    for (let i = 0; i < 40; i++) playUntil(hunt, tick, (e) => e.t === 'capture');
    const kanjiSeen = KANJI.filter((k) => data.cards[cardKey(k.id, 'meaning')]).length;
    expect(kanjiSeen).toBeGreaterThanOrEqual(6);
    expect(kanjiSeen).toBeLessThanOrEqual(20);
  });

  it('depois de muitos encontros sem carta rara, vem uma garantida', () => {
    const { hunt, tick, save } = setup(2);
    save.sinceRare = PITY;
    hunt.start();
    expect(['sr', 'ur']).toContain(hunt.enemy.rarity);
    expect(save.sinceRare).toBe(0);
    playUntil(hunt, tick, (e) => e.t === 'capture');
  });

  it('kanji já firme ganha pergunta inversa e leitura por digitação', () => {
    const { hunt, data, tick, now } = setup(6);
    // deixa 一 e suas palavras firmes
    const k = KANJI[0]!;
    const strong = (key: string) => {
      let c: CardState = review(undefined, { correct: true }, T0 - 200 * DAY);
      for (let i = 0; i < 10; i++) c = review(c, { correct: true }, c.due);
      c.due = now() - 1000;
      data.cards[key] = c;
    };
    strong(cardKey(k.id, 'meaning'));
    for (const w of k.words) {
      strong(cardKey(w.id, 'meaning'));
      strong(cardKey(w.id, 'reading'));
    }
    hunt.start();
    expect(hunt.enemy.kanji).toBe(k);
    const kinds: string[] = [hunt.question.kind];
    let sawTyping = hunt.question.typing;
    while (hunt.enemy.kanji === k && hunt.phase === 'question') {
      tick(4000);
      hunt.answer(hunt.question.answer, 4000);
      if (hunt.enemy.kanji === k) {
        kinds.push(hunt.question.kind);
        sawTyping ||= hunt.question.typing;
      }
    }
    expect(kinds[0]).toBe('kanji-meaning');
    expect(kinds.includes('kanji-recall') || sawTyping).toBe(true);
  });
});

describe('save do KanjiMon', () => {
  it('cria quando não existe e devolve sempre o mesmo objeto', () => {
    const games: Record<string, unknown> = {};
    const a = ensureKanjimonSave(games);
    a.captures = 7;
    const b = ensureKanjimonSave(games);
    expect(b).toBe(a);
    expect(games.kanjimon).toBe(a);
    expect(b.captures).toBe(7);
  });

  it('completa campos que faltam ou vieram estragados sem perder o resto', () => {
    const games: Record<string, unknown> = { kanjimon: { dex: { '1_c': 2 }, captures: 'muitas', boosters: null } };
    const s = ensureKanjimonSave(games);
    expect(s).toEqual({ dex: { '1_c': 2 }, captures: 0, bestCombo: 0, boosters: 0, sinceRare: 0 });
  });

  it('troca lixo por um save limpo', () => {
    expect(ensureKanjimonSave({ kanjimon: 'oi' })).toEqual(emptyKanjimonSave());
    expect(ensureKanjimonSave({ kanjimon: [1] })).toEqual(emptyKanjimonSave());
  });
});

describe('booster', () => {
  it('só abre com kanji conhecidos e moedas ou bilhete', () => {
    const { data, save } = setup();
    expect(canOpenBooster(data.profile, save, data.cards)).toBe('sem-kanji');
    for (const k of KANJI.slice(0, 3)) data.cards[cardKey(k.id, 'meaning')] = review(undefined, { correct: true }, T0);
    expect(canOpenBooster(data.profile, save, data.cards)).toBe('sem-moedas');
    expect(openBooster(data.profile, save, data.cards, seededRng(1))).toEqual([]);
    data.profile.coins = BOOSTER_COST;
    expect(canOpenBooster(data.profile, save, data.cards)).toBe('ok');
  });

  it('cobra as moedas, entrega 3 cartas de kanji conhecidos e a última é Rara ou melhor', () => {
    const { data, save } = setup();
    const known = KANJI.slice(0, 4);
    for (const k of known) data.cards[cardKey(k.id, 'meaning')] = review(undefined, { correct: true }, T0);
    data.profile.coins = BOOSTER_COST + 10;
    for (let seed = 1; seed <= 30; seed++) {
      data.profile.coins = BOOSTER_COST + 10;
      const cards = openBooster(data.profile, save, data.cards, seededRng(seed));
      expect(cards).toHaveLength(3);
      expect(data.profile.coins).toBe(10);
      for (const c of cards) expect(known).toContain(c.kanji);
      expect(cards[2]!.rarity).not.toBe('c');
    }
    expect(Object.values(save.dex).reduce((a, b) => a + b, 0)).toBe(90);
  });

  it('bilhete de booster é gasto antes das moedas', () => {
    const { data, save } = setup();
    for (const k of KANJI.slice(0, 3)) data.cards[cardKey(k.id, 'meaning')] = review(undefined, { correct: true }, T0);
    save.boosters = 1;
    data.profile.coins = 500;
    openBooster(data.profile, save, data.cards, seededRng(1));
    expect(save.boosters).toBe(0);
    expect(data.profile.coins).toBe(500);
  });
});
