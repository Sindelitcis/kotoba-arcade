/**
 * Memória espaçada com FSRS (ts-fsrs). Cada "carta" é um par item + habilidade
 * (ex.: reconhecer o significado de 山, ler 一人). Os jogos só informam o que
 * aconteceu numa resposta; o agendamento fica todo aqui.
 */
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';

export interface CardState {
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: State;
  last_review?: number;
}

export interface Outcome {
  correct: boolean;
  /** Tempo de resposta em ms, se o jogo mediu. */
  ms?: number;
  /** Respondeu com ajuda na tela (primeiro contato, dica). */
  hinted?: boolean;
}

const DAY = 86_400_000;

const scheduler = fsrs(
  generatorParameters({
    request_retention: 0.9,
    maximum_interval: 365,
    enable_fuzz: false,
    enable_short_term: true,
    learning_steps: ['1m', '10m'],
    relearning_steps: ['5m'],
  }),
);

function toCard(s: CardState): Card {
  return { ...s, due: new Date(s.due), last_review: s.last_review ? new Date(s.last_review) : undefined };
}

function fromCard(c: Card): CardState {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review?.getTime(),
  };
}

export function newCard(now: number): CardState {
  return fromCard(createEmptyCard(new Date(now)));
}

/** Traduz o que aconteceu no jogo para a nota do FSRS. */
export function gradeFor(o: Outcome): Grade {
  if (!o.correct) return Rating.Again;
  if (o.hinted) return Rating.Hard;
  if (o.ms !== undefined && o.ms < 2500) return Rating.Easy;
  return Rating.Good;
}

export function review(card: CardState | undefined, outcome: Outcome, now: number): CardState {
  const base = card ?? newCard(now);
  // Relógio do computador pode andar para trás (fuso, ajuste de hora). O FSRS não aceita
  // revisão "antes" da anterior, então a revisão nunca acontece antes da última registrada.
  const when = Math.max(now, base.last_review ?? now);
  return fromCard(scheduler.next(toCard(base), new Date(when), gradeFor(outcome)).card);
}

/** Chance (0 a 1) de lembrar agora. Carta nunca vista devolve 0. */
export function retrievability(card: CardState | undefined, now: number): number {
  if (!card || card.state === State.New) return 0;
  if (card.state !== State.Review) return 0.5;
  return scheduler.get_retrievability(toCard(card), new Date(now), false);
}

export function isLearning(card: CardState): boolean {
  return card.state === State.Learning || card.state === State.Relearning;
}

export function isDue(card: CardState, now: number): boolean {
  return card.state !== State.New && card.due <= now;
}

/** "Jovem" = ainda não firmou (aprendendo ou com menos de 3 dias de estabilidade). */
export function isYoung(card: CardState): boolean {
  return isLearning(card) || (card.state === State.Review && card.stability < 3);
}

/** "Conhecida" = já aguenta pelo menos uma semana sem revisar. */
export function isKnown(card: CardState | undefined): boolean {
  return !!card && card.state === State.Review && card.stability >= 7;
}

/** Nível de domínio de 0 a 5, para barras e estrelas na tela. */
export function masteryLevel(card: CardState | undefined): number {
  if (!card || card.state === State.New) return 0;
  if (isLearning(card)) return 1;
  const s = card.stability;
  if (s < 3) return 2;
  if (s < 10) return 3;
  if (s < 30) return 4;
  return 5;
}

export { State, DAY };
