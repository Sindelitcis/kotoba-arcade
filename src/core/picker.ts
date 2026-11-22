/**
 * Escolhe a próxima carta para qualquer jogo. É aqui que mora a regra
 * "sem pilha de revisão": nada de contador de atrasadas. Quem volta depois
 * de dias fora recebe primeiro o que mais vale a pena rever, as novidades
 * pausam sozinhas enquanto há muita coisa mole, e sempre tem o que jogar.
 *
 * Só sai carta de item já apresentado (core/ensino.ts). "Novidade" aqui é o item que foi
 * apresentado e ainda não foi perguntado; o que nunca foi apresentado não sai nunca.
 */
import { foiApresentado } from './ensino';
import type { Rng } from './rng';
import { isDue, isLearning, isYoung, retrievability, State, type CardState } from './srs';

export type PickReason = 'learning' | 'due' | 'new' | 'practice';

export interface Pick {
  key: string;
  reason: PickReason;
}

export interface PickOptions {
  /** Máximo de cartas "jovens" ao mesmo tempo antes de parar de trazer novidade. */
  maxYoung?: number;
  /** Com esse tanto de revisões vencidas, novidade pausa. */
  backlogPause?: number;
  /** Chance de intercalar uma novidade quando também há revisão vencida. */
  newRatio?: number;
  /** Cartas a evitar por terem acabado de aparecer. */
  recent?: readonly string[];
}

export function pickNext(
  pool: readonly string[],
  cards: Readonly<Record<string, CardState>>,
  now: number,
  rng: Rng,
  opts: PickOptions = {},
): Pick | null {
  const maxYoung = opts.maxYoung ?? 8;
  const backlogPause = opts.backlogPause ?? 25;
  const newRatio = opts.newRatio ?? 0.3;
  const recent = new Set(opts.recent ?? []);

  const prontas = pool.filter((k) => foiApresentado(cards, k));
  let usable = prontas.filter((k) => !recent.has(k));
  if (usable.length === 0) usable = prontas.slice();
  if (usable.length === 0) return null;

  const seen: string[] = [];
  const fresh: string[] = [];
  const perguntada = (k: string) => !!cards[k] && cards[k].state !== State.New;
  for (const k of usable) (perguntada(k) ? seen : fresh).push(k);

  // 1. O que está em aprendizado e já venceu volta primeiro (é o que fixa na sessão).
  const learningDue = seen
    .filter((k) => isLearning(cards[k] as CardState) && isDue(cards[k] as CardState, now))
    .sort((a, b) => (cards[a] as CardState).due - (cards[b] as CardState).due);
  if (learningDue[0]) return { key: learningDue[0], reason: 'learning' };

  const due = seen
    .filter((k) => !isLearning(cards[k] as CardState) && isDue(cards[k] as CardState, now))
    .sort((a, b) => retrievability(cards[a], now) - retrievability(cards[b], now));

  // A contagem de "jovens" e de vencidas olha o baralho todo, não só o que sobrou do filtro.
  const all = prontas.filter(perguntada);
  const young = all.filter((k) => isYoung(cards[k] as CardState)).length;
  const backlog = all.filter((k) => isDue(cards[k] as CardState, now)).length;
  const canIntroduce = fresh.length > 0 && young < maxYoung && backlog < backlogPause;

  if (due[0]) {
    if (canIntroduce && rng() < newRatio) return { key: fresh[0] as string, reason: 'new' };
    // Entre as mais esquecidas, sorteia para não ficar sempre a mesma ordem.
    const top = due.slice(0, 3);
    return { key: top[Math.floor(rng() * top.length)] as string, reason: 'due' };
  }

  if (canIntroduce) return { key: fresh[0] as string, reason: 'new' };

  // Nada venceu e novidade está pausada: adianta o que está aprendendo, ou treina o mais fraco.
  const learningSoon = seen
    .filter((k) => isLearning(cards[k] as CardState))
    .sort((a, b) => (cards[a] as CardState).due - (cards[b] as CardState).due);
  if (learningSoon[0]) return { key: learningSoon[0], reason: 'learning' };

  if (seen.length > 0) {
    const weakest = seen.slice().sort((a, b) => retrievability(cards[a], now) - retrievability(cards[b], now));
    const top = weakest.slice(0, 4);
    return { key: top[Math.floor(rng() * top.length)] as string, reason: 'practice' };
  }

  return fresh[0] ? { key: fresh[0], reason: 'new' } : null;
}
