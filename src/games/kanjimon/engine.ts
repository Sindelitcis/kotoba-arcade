/**
 * Regras do KanjiMon, sem tela. Uma caçada é uma sequência de encontros:
 * cada KanjiMon tem selos, cada selo é uma pergunta diferente sobre o mesmo
 * kanji (significado, leitura de uma palavra, o caminho inverso). Quebrou
 * todos os selos, capturou a carta.
 */
import { cardKey, getKanji, KANJI, WORDS, type Kanji, type Skill, type Word } from '../../content';
import { compareReading, type ReadingMatch } from '../../core/kana';
import { pickNext } from '../../core/picker';
import { levelInfo } from '../../core/progress';
import { pick, shuffle, weighted, type Rng } from '../../core/rng';
import type { Profile } from '../../core/save';
import { isDue, masteryLevel, retrievability, review, type CardState } from '../../core/srs';

export type Rarity = 'c' | 'r' | 'sr' | 'ur';

export const RARITY: Record<Rarity, { name: string; weight: number; seals: number; coins: number; xp: number }> = {
  c: { name: 'Comum', weight: 76, seals: 2, coins: 8, xp: 10 },
  r: { name: 'Rara', weight: 16, seals: 3, coins: 16, xp: 18 },
  sr: { name: 'Super Rara', weight: 6, seals: 3, coins: 30, xp: 30 },
  ur: { name: 'Ultra Rara', weight: 2, seals: 4, coins: 60, xp: 50 },
};

export const RARITIES = Object.keys(RARITY) as Rarity[];
export const MAX_HEARTS = 5;
export const CHEST_EVERY = 5;
export const BOOSTER_COST = 150;
export const BOOSTER_SIZE = 3;
/** Sem carta SR ou UR por esse tanto de encontros, a próxima vem garantida. */
export const PITY = 25;

export interface KanjimonSave {
  /** Cartas na coleção: `${n}_${raridade}` → quantidade. */
  dex: Record<string, number>;
  captures: number;
  bestCombo: number;
  boosters: number;
  sinceRare: number;
}

export function emptyKanjimonSave(): KanjimonSave {
  return { dex: {}, captures: 0, bestCombo: 0, boosters: 0, sinceRare: 0 };
}

/**
 * Devolve o save do KanjiMon dentro de `games`, criando ou completando campos que faltem.
 * Sempre o mesmo objeto: uma caçada em andamento e a tela do fliperama escrevem no mesmo lugar.
 */
export function ensureKanjimonSave(games: Record<string, unknown>): KanjimonSave {
  const base = emptyKanjimonSave();
  const current = games.kanjimon;
  if (typeof current !== 'object' || current === null || Array.isArray(current)) {
    games.kanjimon = base;
    return base;
  }
  const save = current as Record<string, unknown>;
  for (const [k, v] of Object.entries(base)) {
    if (typeof save[k] !== typeof v || save[k] === null) save[k] = v;
  }
  return save as unknown as KanjimonSave;
}

export function dexKey(k: Kanji, r: Rarity): string {
  return `${k.n}_${r}`;
}

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

export interface Enemy {
  kanji: Kanji;
  rarity: Rarity;
  seals: number;
  maxSeals: number;
  isNew: boolean;
}

export type HuntEvent =
  | { t: 'spawn'; enemy: Enemy }
  | { t: 'hit'; fast: boolean; close: boolean; combo: number; sealsLeft: number }
  | { t: 'miss'; answer: string; hearts: number }
  | { t: 'capture'; enemy: Enemy; newCard: boolean; coins: number; xp: number }
  | { t: 'levelup'; level: number }
  | { t: 'chest'; coins: number; booster: boolean; hearts: number }
  | { t: 'over' };

export interface HuntDeps {
  cards: Record<string, CardState>;
  profile: Profile;
  save: KanjimonSave;
  rng: Rng;
  now: () => number;
}

export interface HuntStats {
  captured: number;
  correct: number;
  wrong: number;
  newKanji: string[];
  coins: number;
  xp: number;
  bestCombo: number;
}

const FAST_MS = 2500;

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

export class Hunt {
  hearts = MAX_HEARTS;
  combo = 0;
  sinceChest = 0;
  phase: 'question' | 'chest' | 'over' = 'question';
  enemy!: Enemy;
  question!: Question;
  readonly stats: HuntStats = { captured: 0, correct: 0, wrong: 0, newKanji: [], coins: 0, xp: 0, bestCombo: 0 };
  private queue: Question[] = [];
  private recent: string[] = [];

  constructor(private readonly deps: HuntDeps) {}

  start(): HuntEvent[] {
    return [this.spawn()];
  }

  private rollRarity(): Rarity {
    const { save, rng } = this.deps;
    let r = weighted(rng, Object.fromEntries(RARITIES.map((k) => [k, RARITY[k].weight])) as Record<Rarity, number>);
    if (save.sinceRare >= PITY && (r === 'c' || r === 'r')) r = 'sr';
    save.sinceRare = r === 'sr' || r === 'ur' ? 0 : save.sinceRare + 1;
    return r;
  }

  private spawn(): HuntEvent {
    const { cards, rng, now } = this.deps;
    const pool = KANJI.map((k) => cardKey(k.id, 'meaning'));
    const chosen = pickNext(pool, cards, now(), rng, { recent: this.recent, maxYoung: 6 });
    const key = chosen?.key ?? (pool[0] as string);
    const kanji = getKanji(key.slice(0, key.lastIndexOf('#')));
    const isNew = !cards[key];
    this.recent = [...this.recent, key].slice(-3);
    const rarity = this.rollRarity();
    const seals = RARITY[rarity].seals;
    this.enemy = { kanji, rarity, seals, maxSeals: seals, isNew };
    this.queue = this.planQuestions(kanji, seals, isNew);
    this.question = this.queue.shift() as Question;
    this.phase = 'question';
    return { t: 'spawn', enemy: this.enemy };
  }

  /** Monta as perguntas do encontro: significado primeiro, depois palavras e o caminho inverso. */
  private planQuestions(k: Kanji, seals: number, isNew: boolean): Question[] {
    const { cards, rng, now } = this.deps;
    const t = now();
    const out: Question[] = [kanjiMeaningQuestion(k, rng, isNew)];
    const usedWords = new Set<string>();
    let taught = 0;

    const nextWordQuestion = (): Question | null => {
      const options = k.words.filter((w) => !usedWords.has(w.id));
      if (options.length === 0) return null;
      const score = (w: Word) => {
        const m = cards[cardKey(w.id, 'meaning')];
        const r = cards[cardKey(w.id, 'reading')];
        if (!m) return 2; // nova
        if ((m && isDue(m, t)) || (r && isDue(r, t)) || !r) return 0; // precisa de atenção
        return 1 + Math.min(retrievability(m, t), retrievability(r, t));
      };
      const sorted = options.slice().sort((a, b) => score(a) - score(b));
      const w = sorted[0] as Word;
      usedWords.add(w.id);
      const m = cards[cardKey(w.id, 'meaning')];
      const r = cards[cardKey(w.id, 'reading')];
      if (!m) {
        // No máximo uma palavra nova por encontro, e nenhuma se o kanji também é novo demais.
        if (taught >= 1) return null;
        taught++;
        return wordMeaningQuestion(w, rng, true);
      }
      if (!r) return wordReadingQuestion(w, rng, false);
      const weakerIsReading = retrievability(r, t) <= retrievability(m, t);
      if (weakerIsReading) return wordReadingQuestion(w, rng, masteryLevel(r) >= 3);
      return wordMeaningQuestion(w, rng, false);
    };

    const recallReady = masteryLevel(cards[cardKey(k.id, 'meaning')]) >= 2;
    while (out.length < seals) {
      const wantRecall = recallReady && out.length === seals - 1 && !out.some((q) => q.kind === 'kanji-recall');
      const q = wantRecall ? kanjiRecallQuestion(k, rng) : (nextWordQuestion() ?? kanjiRecallQuestion(k, rng));
      // Evita duas perguntas idênticas no mesmo encontro.
      if (out.some((o) => o.card === q.card)) {
        const alt = k.words.find((w) => !out.some((o) => o.card === cardKey(w.id, 'reading')));
        out.push(alt ? wordReadingQuestion(alt, rng, false) : kanjiMeaningQuestion(k, rng, false));
      } else {
        out.push(q);
      }
    }
    return out;
  }

  answer(input: string, ms: number): HuntEvent[] {
    if (this.phase !== 'question') return [];
    const { cards, now, save, profile } = this.deps;
    const q = this.question;
    const result = checkAnswer(q, input);
    const correct = result !== 'wrong';
    cards[q.card] = review(cards[q.card], { correct, ms, hinted: !!q.teach || result === 'close' }, now());
    const events: HuntEvent[] = [];

    if (!correct) {
      this.combo = 0;
      this.hearts--;
      this.stats.wrong++;
      events.push({ t: 'miss', answer: q.answer, hearts: this.hearts });
      if (this.hearts <= 0) {
        this.phase = 'over';
        events.push({ t: 'over' });
        return events;
      }
      // A mesma pergunta volta depois da próxima, sem a aula e com as opções embaralhadas de novo.
      const retry: Question = { ...q, teach: undefined, choices: shuffle(this.deps.rng, q.choices) };
      this.queue.splice(Math.min(1, this.queue.length), 0, retry);
      this.question = this.queue.shift() as Question;
      return events;
    }

    this.combo++;
    this.stats.correct++;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
    save.bestCombo = Math.max(save.bestCombo, this.combo);
    this.enemy.seals--;
    const fast = ms < FAST_MS && !q.teach;
    if (fast) {
      profile.coins += 2;
      this.stats.coins += 2;
    }
    events.push({ t: 'hit', fast, close: result === 'close', combo: this.combo, sealsLeft: this.enemy.seals });

    const next = this.queue.shift();
    if (this.enemy.seals > 0 && next) {
      this.question = next;
      return events;
    }

    // Captura
    const e = this.enemy;
    const mult = 1 + Math.min(this.combo, 10) * 0.1;
    const coins = Math.round(RARITY[e.rarity].coins * mult);
    const xp = Math.round(RARITY[e.rarity].xp * mult);
    const key = dexKey(e.kanji, e.rarity);
    const newCard = !save.dex[key];
    save.dex[key] = (save.dex[key] ?? 0) + 1;
    save.captures++;
    const before = levelInfo(profile.xp).level;
    profile.coins += coins;
    profile.xp += xp;
    this.stats.coins += coins;
    this.stats.xp += xp;
    this.stats.captured++;
    if (e.isNew) this.stats.newKanji.push(e.kanji.kanji);
    events.push({ t: 'capture', enemy: e, newCard, coins, xp });
    const after = levelInfo(profile.xp).level;
    if (after > before) events.push({ t: 'levelup', level: after });

    this.sinceChest++;
    if (this.sinceChest >= CHEST_EVERY) {
      this.sinceChest = 0;
      const chestCoins = 40 + Math.floor(this.deps.rng() * 51);
      const booster = this.deps.rng() < 0.25;
      profile.coins += chestCoins;
      this.stats.coins += chestCoins;
      if (booster) save.boosters++;
      this.hearts = Math.min(MAX_HEARTS, this.hearts + 1);
      this.phase = 'chest';
      events.push({ t: 'chest', coins: chestCoins, booster, hearts: this.hearts });
      return events;
    }
    events.push(this.spawn());
    return events;
  }

  /** Depois do baú: segue a caçada. */
  continue(): HuntEvent[] {
    if (this.phase !== 'chest') return [];
    return [this.spawn()];
  }
}

export interface BoosterCard {
  kanji: Kanji;
  rarity: Rarity;
  newCard: boolean;
}

const BOOSTER_WEIGHTS: Record<Rarity, number> = { c: 55, r: 30, sr: 12, ur: 3 };

/** Kanji que já apareceram em caçada. Booster só dá carta de kanji que o jogador conhece. */
export function seenKanji(cards: Readonly<Record<string, CardState>>): Kanji[] {
  return KANJI.filter((k) => cards[cardKey(k.id, 'meaning' as Skill)]);
}

export function canOpenBooster(profile: Profile, save: KanjimonSave, cards: Readonly<Record<string, CardState>>): 'ok' | 'sem-kanji' | 'sem-moedas' {
  if (seenKanji(cards).length < BOOSTER_SIZE) return 'sem-kanji';
  if (save.boosters <= 0 && profile.coins < BOOSTER_COST) return 'sem-moedas';
  return 'ok';
}

export function openBooster(profile: Profile, save: KanjimonSave, cards: Readonly<Record<string, CardState>>, rng: Rng): BoosterCard[] {
  if (canOpenBooster(profile, save, cards) !== 'ok') return [];
  if (save.boosters > 0) save.boosters--;
  else profile.coins -= BOOSTER_COST;
  const pool = seenKanji(cards);
  const out: BoosterCard[] = [];
  for (let i = 0; i < BOOSTER_SIZE; i++) {
    const kanji = pick(rng, pool);
    // A última carta do pacote é pelo menos Rara.
    let rarity = weighted(rng, BOOSTER_WEIGHTS);
    if (i === BOOSTER_SIZE - 1 && rarity === 'c') rarity = 'r';
    const key = dexKey(kanji, rarity);
    out.push({ kanji, rarity, newCard: !save.dex[key] });
    save.dex[key] = (save.dex[key] ?? 0) + 1;
  }
  return out;
}
