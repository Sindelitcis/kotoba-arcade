/**
 * Perguntas sobre kanji e palavras, usadas por mais de um jogo: significado,
 * leitura e o caminho inverso (do significado para o kanji).
 */
import { cardKey, KANJI, WORDS, type Kanji, type Word } from '../content';
import { compareReading, kanaToRomaji, type ReadingMatch } from './kana';
import { cortarOpcoes, emPratica, opcoesPara } from './ensino';
import { shuffle, type Rng } from './rng';
import type { CardState } from './srs';

export type QuestionKind = 'kanji-meaning' | 'kanji-recall' | 'word-reading' | 'word-meaning';

export interface Question {
  kind: QuestionKind;
  card: string;
  /** Texto grande da pergunta. */
  prompt: string;
  /** Apoio abaixo do texto grande (leitura em kana, por exemplo). */
  sub?: string;
  ask: string;
  choices: string[];
  answer: string;
  /** Resposta por digitação (leitura em romaji ou kana) em vez de escolha. */
  typing: boolean;
  /** Dica que aparece na prática (sem entregar a resposta). */
  dica: string;
  /** Prática com apoio (core/ensino.ts): menos alternativas, dica na tela, errar não custa. */
  apoio?: boolean;
  /**
   * O que falar em voz alta depois da resposta: a chave da gravação. Na carta de kanji é o
   * próprio kanji (a gravação diz a leitura dele sozinho); na palavra, o kana.
   */
  speak: string;
  /** A mesma fala em kana, para a voz do navegador quando faltar a gravação. */
  speakKana: string;
  /** Texto que acompanha a voz, mostrado depois da resposta. */
  echo: string;
}

function neighbors<T>(list: readonly T[], index: number, radius: number): T[] {
  const out: T[] = [];
  for (let i = Math.max(0, index - radius); i <= Math.min(list.length - 1, index + radius); i++) {
    if (i !== index) out.push(list[i] as T);
  }
  return out;
}

/**
 * Três alternativas erradas, plausíveis, sem repetir e sem coincidir com a certa.
 * `alsoRight` marca opções que também estariam certas (outro kanji com o mesmo significado).
 */
function distractors(rng: Rng, answer: string, near: string[], far: readonly string[], alsoRight: (v: string) => boolean): string[] {
  const out: string[] = [];
  const add = (v: string) => {
    if (v !== answer && !alsoRight(v) && !out.includes(v) && out.length < 3) out.push(v);
  };
  for (const v of shuffle(rng, near)) add(v);
  for (const v of shuffle(rng, far)) add(v);
  return out;
}

function choicesFor(rng: Rng, answer: string, near: string[], far: readonly string[], alsoRight: (v: string) => boolean = () => false): string[] {
  return shuffle(rng, [answer, ...distractors(rng, answer, near, far, alsoRight)]);
}

export function kanjiMeaningQuestion(k: Kanji, rng: Rng): Question {
  const idx = KANJI.indexOf(k);
  const answer = k.pt[0] as string;
  const near = neighbors(KANJI, idx, 6).map((o) => o.pt[0] as string);
  return {
    kind: 'kanji-meaning',
    card: cardKey(k.id, 'meaning'),
    prompt: k.kanji,
    ask: 'O que significa?',
    choices: choicesFor(rng, answer, near, KANJI.map((o) => o.pt[0] as string), (v) => k.pt.includes(v)),
    answer,
    typing: false,
    dica: k.story,
    ...kanjiVoice(k),
  };
}

export function kanjiRecallQuestion(k: Kanji, rng: Rng): Question {
  const idx = KANJI.indexOf(k);
  const meaning = k.pt[0] as string;
  // 天 e 空 querem dizer "céu": um não pode ser a alternativa errada do outro.
  const sameMeaning = new Set(KANJI.filter((o) => o !== k && o.pt.includes(meaning)).map((o) => o.kanji));
  return {
    kind: 'kanji-recall',
    card: cardKey(k.id, 'recall'),
    prompt: k.pt[0] as string,
    ask: 'Qual é o kanji?',
    choices: choicesFor(rng, k.kanji, neighbors(KANJI, idx, 6).map((o) => o.kanji), KANJI.map((o) => o.kanji), (v) => sameMeaning.has(v)),
    answer: k.kanji,
    typing: false,
    dica: readingLines(k)[0] as string,
    ...kanjiVoice(k),
  };
}

const romaji = (kana: string) => kanaToRomaji(kana).replace(/'/g, '');

/** A carta mostra só o kanji: a voz e o texto que a acompanha são a leitura dele sozinho. */
function kanjiVoice(k: Kanji): Pick<Question, 'speak' | 'speakKana' | 'echo'> {
  return { speak: k.kanji, speakKana: k.reading, echo: `${k.kanji} · ${k.reading} (${romaji(k.reading)}) · ${k.pt[0]}` };
}

/** Leitura do kanji sozinho e as outras que aparecem dentro das palavras. */
export function readingLines(k: Kanji): string[] {
  const lines = [`Sozinho, lê-se ${k.reading} (${romaji(k.reading)}).`];
  if (k.otherReadings.length > 0) lines.push(`Dentro de palavras também: ${k.otherReadings.join(', ')}.`);
  return lines;
}

function echoOf(w: Word): string {
  return `${w.jp} · ${w.kana} · ${w.pt}`;
}

function wordNeighbors(w: Word): Word[] {
  return neighbors(WORDS, WORDS.indexOf(w), 9);
}

export function wordMeaningQuestion(w: Word, rng: Rng): Question {
  return {
    kind: 'word-meaning',
    card: cardKey(w.id, 'meaning'),
    prompt: w.jp,
    sub: w.kana,
    ask: 'O que significa?',
    choices: choicesFor(rng, w.pt, wordNeighbors(w).map((o) => o.pt), WORDS.map((o) => o.pt)),
    answer: w.pt,
    typing: false,
    dica: `Lê-se ${w.kana}.`,
    speak: w.kana,
    speakKana: w.kana,
    echo: echoOf(w),
  };
}

export function wordReadingQuestion(w: Word, rng: Rng, typing: boolean): Question {
  // Alternativas de tamanho parecido, para não dar para acertar só pelo comprimento.
  const near = wordNeighbors(w)
    .filter((o) => Math.abs(o.kana.length - w.kana.length) <= 1)
    .map((o) => o.kana);
  const far = WORDS.filter((o) => Math.abs(o.kana.length - w.kana.length) <= 1).map((o) => o.kana);
  return {
    kind: 'word-reading',
    card: cardKey(w.id, 'reading'),
    prompt: w.jp,
    sub: w.pt,
    ask: typing ? 'Digite a leitura (romaji ou kana)' : 'Como se lê?',
    choices: choicesFor(rng, w.kana, near, far.length >= 4 ? far : WORDS.map((o) => o.kana)),
    answer: w.kana,
    typing,
    dica: `Começa com ${[...w.kana][0]}.`,
    speak: w.kana,
    speakKana: w.kana,
    echo: echoOf(w),
  };
}

/**
 * Pergunta de item ainda em prática: duas ou três alternativas, dica na tela e nada de
 * digitar. Item já firme volta como veio.
 */
export function apoiar(q: Question, cards: Readonly<Record<string, CardState>>): Question {
  if (!emPratica(cards, q.card)) return { ...q, apoio: false };
  return { ...q, apoio: true, typing: false, ask: q.ask.startsWith('Digite') ? 'Como se lê?' : q.ask, choices: cortarOpcoes(q.choices, q.answer, opcoesPara(cards, q.card, q.choices.length)) };
}

/** Confere a resposta. Para digitação, vogal longa errada vale como "quase". */

export function checkAnswer(q: Question, input: string): ReadingMatch {
  if (q.typing) return compareReading(input, q.answer);
  return input === q.answer ? 'exact' : 'wrong';
}
