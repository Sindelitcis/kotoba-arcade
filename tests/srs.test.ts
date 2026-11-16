import { describe, expect, it } from 'vitest';
import { pickNext } from '../src/core/picker';
import { seededRng } from '../src/core/rng';
import { DAY, isKnown, isLearning, masteryLevel, review, retrievability, type CardState } from '../src/core/srs';

const T0 = new Date('2026-11-15T12:00:00').getTime();
const MIN = 60_000;

/** Responde certo até a carta sair do aprendizado. */
function graduate(now: number): { card: CardState; now: number } {
  let card = review(undefined, { correct: true }, now);
  let t = now;
  for (let i = 0; i < 6 && isLearning(card); i++) {
    t = card.due;
    card = review(card, { correct: true }, t);
  }
  return { card, now: t };
}

describe('srs', () => {
  it('carta nova entra em aprendizado e volta em minutos', () => {
    const c = review(undefined, { correct: true }, T0);
    expect(isLearning(c)).toBe(true);
    expect(c.due - T0).toBeLessThanOrEqual(15 * MIN);
  });

  it('acertos seguidos graduam e o intervalo passa a ser de dias', () => {
    const { card, now } = graduate(T0);
    expect(isLearning(card)).toBe(false);
    expect(card.due - now).toBeGreaterThanOrEqual(DAY);
  });

  it('erro derruba a estabilidade e traz a carta de volta logo', () => {
    const { card, now } = graduate(T0);
    const later = card.due;
    const failed = review(card, { correct: false }, later);
    expect(failed.lapses).toBe(1);
    expect(failed.stability).toBeLessThan(card.stability);
    expect(failed.due - later).toBeLessThan(DAY);
    expect(now).toBeLessThan(later);
  });

  it('resposta com dica rende menos que resposta rápida', () => {
    const { card } = graduate(T0);
    const t = card.due;
    const hinted = review(card, { correct: true, hinted: true }, t);
    const fast = review(card, { correct: true, ms: 900 }, t);
    expect(fast.stability).toBeGreaterThan(hinted.stability);
  });

  it('relógio voltando no tempo não quebra a revisão', () => {
    const { card, now } = graduate(T0);
    const back = review(card, { correct: true }, now - 5 * DAY);
    expect(back.reps).toBe(card.reps + 1);
    expect(back.last_review).toBe(card.last_review);
  });

  it('chance de lembrar cai com o tempo', () => {
    const { card, now } = graduate(T0);
    expect(retrievability(card, now)).toBeGreaterThan(retrievability(card, now + 30 * DAY));
    expect(retrievability(undefined, now)).toBe(0);
  });

  it('domínio sobe de 0 a 5 e "conhecida" exige uma semana de estabilidade', () => {
    expect(masteryLevel(undefined)).toBe(0);
    let { card } = graduate(T0);
    expect(masteryLevel(card)).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < 8; i++) card = review(card, { correct: true }, card.due);
    expect(isKnown(card)).toBe(true);
    expect(masteryLevel(card)).toBeGreaterThanOrEqual(4);
  });
});

describe('pickNext', () => {
  const pool = Array.from({ length: 40 }, (_, i) => `c${i}`);

  it('save vazio começa pela primeira carta do currículo', () => {
    expect(pickNext(pool, {}, T0, seededRng(1))).toEqual({ key: 'c0', reason: 'new' });
  });

  it('pool vazio devolve null', () => {
    expect(pickNext([], {}, T0, seededRng(1))).toBeNull();
  });

  it('carta em aprendizado que venceu tem prioridade sobre novidade', () => {
    const cards = { c0: review(undefined, { correct: true }, T0) };
    const later = cards.c0.due + 1;
    expect(pickNext(pool, cards, later, seededRng(1))).toEqual({ key: 'c0', reason: 'learning' });
  });

  it('para de trazer novidade quando há muita carta jovem', () => {
    const cards: Record<string, CardState> = {};
    for (let i = 0; i < 8; i++) cards[`c${i}`] = review(undefined, { correct: true }, T0);
    const p = pickNext(pool, cards, T0 + 1000, seededRng(1));
    expect(p?.reason).toBe('learning');
    expect(cards[p?.key ?? '']).toBeDefined();
  });

  it('voltar depois de semanas não gera pilha: novidade pausa e sempre há o que jogar', () => {
    const cards: Record<string, CardState> = {};
    for (let i = 0; i < 30; i++) cards[`c${i}`] = graduate(T0).card;
    const back = T0 + 60 * DAY;
    const rng = seededRng(7);
    const reasons = new Set<string>();
    for (let i = 0; i < 20; i++) reasons.add(pickNext(pool, cards, back, rng)?.reason ?? 'null');
    expect([...reasons]).toEqual(['due']);
  });

  it('com tudo em dia e novidade pausada, oferece treino livre em vez de mandar esperar', () => {
    const small = ['a', 'b', 'c'];
    const cards: Record<string, CardState> = {};
    for (const k of small) cards[k] = graduate(T0).card;
    const p = pickNext(small, cards, T0 + 20 * MIN, seededRng(3));
    expect(p?.reason).toBe('practice');
  });

  it('não repete a carta que acabou de sair', () => {
    const cards: Record<string, CardState> = {};
    for (const k of ['a', 'b']) cards[k] = graduate(T0).card;
    const rng = seededRng(5);
    for (let i = 0; i < 10; i++) {
      expect(pickNext(['a', 'b'], cards, T0 + 90 * DAY, rng, { recent: ['a'] })?.key).toBe('b');
    }
  });

  it('intercala novidade com revisão quando há espaço', () => {
    const cards: Record<string, CardState> = {};
    for (let i = 0; i < 5; i++) cards[`c${i}`] = graduate(T0).card;
    const rng = seededRng(11);
    const reasons = new Set<string>();
    for (let i = 0; i < 60; i++) reasons.add(pickNext(pool, cards, T0 + 90 * DAY, rng)?.reason ?? 'null');
    expect(reasons.has('new')).toBe(true);
    expect(reasons.has('due')).toBe(true);
  });
});
