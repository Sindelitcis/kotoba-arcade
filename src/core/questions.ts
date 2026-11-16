/**
 * Perguntas sobre kanji e palavras, usadas por mais de um jogo: significado,
 * leitura e o caminho inverso (do significado para o kanji).
 */
import { cardKey, KANJI, WORDS, type Kanji, type Word } from '../content';
import { compareReading, type ReadingMatch } from './kana';
import { shuffle, type Rng } from './rng';

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
  /** Primeiro contato: a tela ensina antes de perguntar. */
  teach?: { title: string; lines: string[] };
  /** O que falar em voz alta depois da resposta. */
  speak: string;
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

/** Três alternativas erradas, plausíveis, sem repetir e sem coincidir com a certa. */
function distractors(rng: Rng, answer: string, near: string[], far: readonly string[]): string[] {
  const out: string[] = [];
  const add = (v: string) => {
    if (v !== answer && !out.includes(v) && out.length < 3) out.push(v);
  };
  for (const v of shuffle(rng, near)) add(v);
  for (const v of shuffle(rng, far)) add(v);
  return out;
}

function choicesFor(rng: Rng, answer: string, near: string[], far: readonly string[]): string[] {
  return shuffle(rng, [answer, ...distractors(rng, answer, near, far)]);
}

export function kanjiMeaningQuestion(k: Kanji, rng: Rng, isNew: boolean): Question {
  const idx = KANJI.indexOf(k);
  const answer = k.pt[0] as string;
  const near = neighbors(KANJI, idx, 6).map((o) => o.pt[0] as string);
  const example = k.words[0] as Word;
  return {
    kind: 'kanji-meaning',
    card: cardKey(k.id, 'meaning'),
    prompt: k.kanji,
    ask: 'O que significa?',
    choices: choicesFor(rng, answer, near, KANJI.map((o) => o.pt[0] as string)),
    answer,
    typing: false,
    teach: isNew
      ? { title: `${k.kanji} = ${k.pt.join(', ')}`, lines: [k.story, `${example.jp} (${example.kana}) · ${example.pt}`] }
      : undefined,
    speak: example.kana,
    echo: echoOf(example),
  };
}

export function kanjiRecallQuestion(k: Kanji, rng: Rng): Question {
  const idx = KANJI.indexOf(k);
  return {
    kind: 'kanji-recall',
    card: cardKey(k.id, 'recall'),
    prompt: k.pt[0] as string,
    ask: 'Qual é o kanji?',
    choices: choicesFor(rng, k.kanji, neighbors(KANJI, idx, 6).map((o) => o.kanji), KANJI.map((o) => o.kanji)),
    answer: k.kanji,
    typing: false,
    speak: (k.words[0] as Word).kana,
    echo: echoOf(k.words[0] as Word),
  };
}

function echoOf(w: Word): string {
  return `${w.jp} · ${w.kana} · ${w.pt}`;
}

function wordNeighbors(w: Word): Word[] {
  return neighbors(WORDS, WORDS.indexOf(w), 9);
}

export function wordMeaningQuestion(w: Word, rng: Rng, isNew: boolean): Question {
  return {
    kind: 'word-meaning',
    card: cardKey(w.id, 'meaning'),
    prompt: w.jp,
    sub: w.kana,
    ask: 'O que significa?',
    choices: choicesFor(rng, w.pt, wordNeighbors(w).map((o) => o.pt), WORDS.map((o) => o.pt)),
    answer: w.pt,
    typing: false,
    teach: isNew ? { title: `${w.jp} = ${w.pt}`, lines: [`Lê-se ${w.kana} (${w.romaji})`] } : undefined,
    speak: w.kana,
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
    speak: w.kana,
    echo: echoOf(w),
  };
}

/** Confere a resposta. Para digitação, vogal longa errada vale como "quase". */
export function checkAnswer(q: Question, input: string): ReadingMatch {
  if (q.typing) return compareReading(input, q.answer);
  return input === q.answer ? 'exact' : 'wrong';
}
