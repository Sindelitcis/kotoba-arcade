import { describe, expect, it } from 'vitest';
import { cardKey, KANJI, WORDS } from '../src/content';
import { seededRng } from '../src/core/rng';
import { foiApresentado } from '../src/core/ensino';
import { apoiar } from '../src/core/questions';
import { emptySave } from '../src/core/save';
import { DAY, review, type CardState, newCard } from '../src/core/srs';
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

/** Deixa firmes (em cobrança) o significado de todos os kanji e as palavras deles. */
function firmarTudo(cards: Record<string, CardState>): void {
  const firme = (): CardState => {
    let c: CardState = review(newCard(0), { correct: true }, T0 - 400 * DAY);
    for (let i = 0; i < 6; i++) c = review(c, { correct: true }, c.due);
    return { ...c, due: T0 + 30 * DAY };
  };
  for (const k of KANJI) {
    cards[cardKey(k.id, 'meaning')] = firme();
    cards[cardKey(k.id, 'recall')] = firme();
    for (const w of k.words) {
      cards[cardKey(w.id, 'meaning')] = firme();
      cards[cardKey(w.id, 'reading')] = firme();
    }
  }
}

/**
 * Joga respondendo sempre certo até acontecer `stop`. A apresentação é vista inteira e
 * `cadaPergunta` confere cada pergunta antes da resposta.
 */
function playUntil(
  hunt: Hunt,
  tick: (ms: number) => void,
  stop: (e: HuntEvent) => boolean,
  max = 400,
  cadaPergunta?: (q: Hunt['question']) => void,
): HuntEvent[] {
  const all: HuntEvent[] = [];
  for (let i = 0; i < max; i++) {
    if (hunt.phase === 'apresenta') {
      const events = hunt.apresentou();
      all.push(...events);
      if (events.some(stop)) return all;
      continue;
    }
    cadaPergunta?.(hunt.question);
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
      ...KANJI.map((k) => kanjiMeaningQuestion(k, r)),
      ...KANJI.map((k) => kanjiRecallQuestion(k, r)),
      ...WORDS.map((w) => wordMeaningQuestion(w, r)),
      ...WORDS.map((w) => wordReadingQuestion(w, r, false)),
    ];
    for (const q of all) {
      expect(q.choices, q.prompt).toHaveLength(4);
      expect(new Set(q.choices).size, q.prompt).toBe(4);
      expect(q.choices, q.prompt).toContain(q.answer);
    }
  });

  it('item em prática ganha apoio (menos alternativas, sem digitar); em cobrança, não', () => {
    const k = KANJI[0]!;
    const cards: Record<string, CardState> = {};
    const q = kanjiMeaningQuestion(k, rng());
    cards[q.card] = newCard(T0);
    const pratica = apoiar(q, cards);
    expect(pratica.apoio).toBe(true);
    expect(pratica.choices).toHaveLength(2);
    expect(pratica.choices).toContain(q.answer);
    firmarTudo(cards);
    expect(apoiar(q, cards)).toMatchObject({ apoio: false, choices: q.choices });
    const leitura = wordReadingQuestion(k.words[0]!, rng(), true);
    cards[leitura.card] = newCard(T0);
    expect(apoiar(leitura, cards).typing).toBe(false);
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
  it('começa apresentando os kanji novos: nada vira pergunta antes disso', () => {
    const { hunt, data } = setup();
    const [e] = hunt.start();
    expect(e).toEqual({ t: 'apresenta', chaves: hunt.apresentando });
    expect(hunt.phase).toBe('apresenta');
    expect(hunt.apresentando.length).toBeGreaterThanOrEqual(3);
    expect(hunt.apresentando[0]).toBe(cardKey(KANJI[0]!.id, 'meaning'));
    expect(Object.keys(data.cards)).toHaveLength(0);
    expect(hunt.answer('qualquer', 1000)).toEqual([]);
    const [spawn] = hunt.apresentou();
    expect(spawn).toMatchObject({ t: 'spawn' });
    for (const k of hunt.stats.newKanji) expect(foiApresentado(data.cards, cardKey(`k:${k}`, 'meaning'))).toBe(true);
    expect(hunt.phase).toBe('question');
    expect(foiApresentado(data.cards, hunt.question.card)).toBe(true);
  });

  it('a primeira pergunta é prática: duas alternativas, dica e nada de digitar', () => {
    const { hunt } = setup();
    hunt.start();
    hunt.apresentou();
    expect(hunt.question.kind).toBe('kanji-meaning');
    expect(hunt.question.apoio).toBe(true);
    expect(hunt.question.choices).toHaveLength(2);
    expect(hunt.question.choices).toContain(hunt.question.answer);
    expect(hunt.question.dica.length).toBeGreaterThan(0);
    expect(hunt.question.typing).toBe(false);
  });

  it('nenhuma pergunta de uma caçada longa é de item que não foi apresentado', () => {
    const { hunt, tick, data } = setup(5);
    hunt.start();
    for (let i = 0; i < 25; i++) {
      playUntil(hunt, tick, (e) => e.t === 'capture', 400, (q) => expect(foiApresentado(data.cards, q.card), q.card).toBe(true));
    }
  });

  it('quebrar todos os selos captura a carta e paga moedas e XP', () => {
    const { hunt, data, save, tick } = setup();
    hunt.start();
    hunt.apresentou();
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

  it('errar na prática não tira coração nem combo, e o item aparece de novo', () => {
    const { hunt, data, tick } = setup();
    hunt.start();
    hunt.apresentou();
    tick(4000);
    hunt.answer(hunt.question.answer, 4000);
    const combo = hunt.combo;
    const q = hunt.question;
    expect(q.apoio).toBe(true);
    tick(3000);
    const events = hunt.answer('resposta errada', 3000);
    expect(events).toEqual([{ t: 'de-novo', answer: q.answer, card: q.card }]);
    expect(hunt.hearts).toBe(MAX_HEARTS);
    expect(hunt.combo).toBe(combo);
    expect(data.cards[q.card]?.lapses ?? 0).toBeGreaterThanOrEqual(0);
    // a mesma carta volta logo
    const cardsAhead = [hunt.question.card];
    tick(3000);
    hunt.answer(hunt.question.answer, 3000);
    cardsAhead.push(hunt.question.card);
    expect(cardsAhead).toContain(q.card);
  });

  it('na cobrança, erro tira um coração e zera o combo', () => {
    const { hunt, data, tick } = setup();
    firmarTudo(data.cards);
    hunt.start();
    expect(hunt.phase).toBe('question');
    expect(hunt.question.apoio).toBe(false);
    tick(4000);
    hunt.answer(hunt.question.answer, 4000);
    expect(hunt.combo).toBe(1);
    const q = hunt.question;
    tick(3000);
    const events = hunt.answer('resposta errada', 3000);
    expect(events).toEqual([{ t: 'miss', answer: q.answer, hearts: MAX_HEARTS - 1 }]);
    expect(hunt.combo).toBe(0);
  });

  it('sem corações a caçada termina e não aceita mais respostas', () => {
    const { hunt, tick, data } = setup();
    firmarTudo(data.cards);
    hunt.start();
    // Erra tudo o que é cobrança. O que errou volta como prática (e aí acerta).
    let last: HuntEvent[] = [];
    let erros = 0;
    for (let i = 0; i < 200 && hunt.phase !== 'over'; i++) {
      if (hunt.phase === 'apresenta') hunt.apresentou();
      else if (hunt.phase === 'chest') hunt.continue();
      else {
        tick(4000);
        if (hunt.question.apoio) hunt.answer(hunt.question.answer, 4000);
        else {
          last = hunt.answer('errado', 4000);
          erros++;
        }
      }
    }
    expect(erros).toBe(MAX_HEARTS);
    expect(last.at(-1)).toEqual({ t: 'over' });
    expect(hunt.phase).toBe('over');
    expect(hunt.answer(hunt.question.answer, 1000)).toEqual([]);
  });

  it('a cada 5 capturas vem um baú, devolve um coração e a caçada espera', () => {
    const { hunt, tick, data } = setup();
    firmarTudo(data.cards);
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

  it('resposta rápida dá bônus, mas não na prática', () => {
    const { hunt, tick } = setup();
    hunt.start();
    hunt.apresentou();
    tick(500);
    const praticada = hunt.answer(hunt.question.answer, 500);
    expect(praticada[0]).toMatchObject({ t: 'hit', fast: false });
    // segue até uma pergunta de cobrança
    for (let i = 0; i < 400 && (hunt.phase !== 'question' || hunt.question.apoio); i++) {
      if (hunt.phase === 'apresenta') hunt.apresentou();
      else if (hunt.phase === 'chest') hunt.continue();
      else {
        tick(4 * 60_000);
        hunt.answer(hunt.question.answer, 4000);
      }
    }
    expect(hunt.question.apoio).toBe(false);
    tick(500);
    expect(hunt.answer(hunt.question.answer, 500)[0]).toMatchObject({ t: 'hit', fast: true });
  });

  it('não repete o mesmo kanji em encontros seguidos', () => {
    const { hunt, tick } = setup(9);
    hunt.start();
    hunt.apresentou();
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
    hunt.apresentou();
    expect(['sr', 'ur']).toContain(hunt.enemy.rarity);
    expect(save.sinceRare).toBe(0);
    playUntil(hunt, tick, (e) => e.t === 'capture');
  });

  it('kanji já firme ganha pergunta inversa e leitura por digitação', () => {
    const { hunt, data, tick, now } = setup(6);
    // tudo firme; 一 vencido e sem a carta do caminho inverso
    const k = KANJI[0]!;
    firmarTudo(data.cards);
    (data.cards[cardKey(k.id, 'meaning')] as CardState).due = now() - 1000;
    delete data.cards[cardKey(k.id, 'recall')];
    for (const w of k.words) (data.cards[cardKey(w.id, 'reading')] as CardState).due = now() - 1000;
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

  it('número inválido e coleção em lista também são consertados', () => {
    // sinceRare NaN desligava para sempre a garantia de carta rara; dex em lista sumia no JSON.
    const games: Record<string, unknown> = { kanjimon: { dex: [], captures: Number.NaN, sinceRare: Infinity, bestCombo: 3 } };
    const s = ensureKanjimonSave(games);
    expect(s).toEqual({ dex: {}, captures: 0, bestCombo: 3, boosters: 0, sinceRare: 0 });
    const comLixo = ensureKanjimonSave({ kanjimon: { dex: { '1_c': 2, '2_r': 'duas', '3_sr': -1 } } });
    expect(comLixo.dex).toEqual({ '1_c': 2 });
    expect(ensureKanjimonSave({ kanjimon: comLixo }).dex).toBe(comLixo.dex);
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
    for (const k of KANJI.slice(0, 3)) data.cards[cardKey(k.id, 'meaning')] = review(newCard(0), { correct: true }, T0);
    expect(canOpenBooster(data.profile, save, data.cards)).toBe('sem-moedas');
    expect(openBooster(data.profile, save, data.cards, seededRng(1))).toEqual([]);
    data.profile.coins = BOOSTER_COST;
    expect(canOpenBooster(data.profile, save, data.cards)).toBe('ok');
  });

  it('cobra as moedas, entrega 3 cartas de kanji conhecidos e a última é Rara ou melhor', () => {
    const { data, save } = setup();
    const known = KANJI.slice(0, 4);
    for (const k of known) data.cards[cardKey(k.id, 'meaning')] = review(newCard(0), { correct: true }, T0);
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
    for (const k of KANJI.slice(0, 3)) data.cards[cardKey(k.id, 'meaning')] = review(newCard(0), { correct: true }, T0);
    save.boosters = 1;
    data.profile.coins = 500;
    openBooster(data.profile, save, data.cards, seededRng(1));
    expect(save.boosters).toBe(0);
    expect(data.profile.coins).toBe(500);
  });
});
