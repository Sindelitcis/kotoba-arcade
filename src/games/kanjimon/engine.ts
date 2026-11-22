/**
 * Regras do KanjiMon, sem tela. Uma caçada é uma sequência de encontros:
 * cada KanjiMon tem selos, cada selo é uma pergunta diferente sobre o mesmo
 * kanji (significado, leitura de uma palavra, o caminho inverso). Quebrou
 * todos os selos, capturou a carta.
 */
import { cardKey, getKanji, KANJI, type Kanji, type Skill, type Word } from '../../content';
import { foco, recortar } from '../../core/foco';
import { pickNext } from '../../core/picker';
import { levelInfo } from '../../core/progress';
import { checkAnswer, kanjiMeaningQuestion, kanjiRecallQuestion, wordMeaningQuestion, wordReadingQuestion, type Question } from '../../core/questions';
import { pick, shuffle, weighted, type Rng } from '../../core/rng';
import type { Profile } from '../../core/save';
import { apresentar, avaliar, emPratica, faseDe, foiApresentado, notaDaPratica, novidades } from '../../core/ensino';
import { apoiar } from '../../core/questions';
import { isDue, masteryLevel, retrievability, type CardState } from '../../core/srs';


export { checkAnswer, kanjiMeaningQuestion, kanjiRecallQuestion, wordMeaningQuestion, wordReadingQuestion };
export type { Question, QuestionKind } from '../../core/questions';

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
  const count = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;
  for (const k of ['captures', 'bestCombo', 'boosters', 'sinceRare'] as const) {
    if (!count(save[k])) save[k] = base[k];
  }
  // A coleção é consertada no lugar: quem já tem a referência continua escrevendo nela.
  if (typeof save.dex !== 'object' || save.dex === null || Array.isArray(save.dex)) save.dex = {};
  const dex = save.dex as Record<string, unknown>;
  for (const [k, v] of Object.entries(dex)) if (!count(v) || v === 0) delete dex[k];
  return save as unknown as KanjimonSave;
}

export function dexKey(k: Kanji, r: Rarity): string {
  return `${k.n}_${r}`;
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
  /** Itens novos para apresentar antes de seguir (core/ensino.ts). */
  | { t: 'apresenta'; chaves: string[] }
  | { t: 'hit'; fast: boolean; close: boolean; combo: number; sealsLeft: number }
  | { t: 'miss'; answer: string; hearts: number }
  /** Errou na prática: sem perder coração nem combo; o item é apresentado de novo. */
  | { t: 'de-novo'; answer: string; card: string }
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
/** Kanji novos apresentados por vez no começo da caçada. */
export const KANJI_NOVOS = 3;

/**
 * Uma caçada. Começa apresentando até três kanji novos (o kanji, a leitura, o significado
 * falado e uma frase). Só kanji apresentado aparece como KanjiMon; palavra nova de um kanji é
 * apresentada antes do encontro dela. Enquanto o item está em prática, a pergunta tem duas ou
 * três alternativas e uma dica, e errar não tira coração nem combo.
 */
export class Hunt {
  hearts = MAX_HEARTS;
  combo = 0;
  sinceChest = 0;
  phase: 'apresenta' | 'question' | 'chest' | 'over' = 'question';
  enemy!: Enemy;
  question!: Question;
  /** O que está sendo apresentado agora (fase 'apresenta'). */
  apresentando: string[] = [];
  readonly stats: HuntStats = { captured: 0, correct: 0, wrong: 0, newKanji: [], coins: 0, xp: 0, bestCombo: 0 };
  private queue: Question[] = [];
  private recent: string[] = [];
  /** Depois da apresentação: começa o encontro (true) ou só segue o que já estava na tela. */
  private depois: 'spawn' | 'question' = 'spawn';

  constructor(private readonly deps: HuntDeps) {}

  private get pool(): string[] {
    // Missão da Jornada: só os kanji da etapa.
    return recortar(KANJI, foco.value?.kanji, (k) => k.id).map((k) => cardKey(k.id, 'meaning'));
  }

  start(): HuntEvent[] {
    const novos = novidades(this.pool, this.deps.cards, { max: KANJI_NOVOS });
    if (novos.length > 0) return [this.apresentar(novos, 'spawn')];
    return this.encontro();
  }

  /** Começa um encontro. Com palavra nova nele, avisa que ela vai ser apresentada antes da pergunta. */
  private encontro(): HuntEvent[] {
    const ev = this.spawn();
    return this.phase === 'apresenta' && ev.t === 'spawn' ? [ev, { t: 'apresenta', chaves: this.apresentando }] : [ev];
  }

  private apresentar(chaves: string[], depois: 'spawn' | 'question'): HuntEvent {
    this.apresentando = chaves;
    this.depois = depois;
    this.phase = 'apresenta';
    return { t: 'apresenta', chaves };
  }

  /** A apresentação acabou: os itens viram cartas e a caçada segue. */
  apresentou(): HuntEvent[] {
    if (this.phase !== 'apresenta') return [];
    const { cards, now } = this.deps;
    apresentar(cards, this.apresentando, now());
    for (const k of this.apresentando) if (k.startsWith('k:')) this.stats.newKanji.push(getKanji(k.slice(0, k.lastIndexOf('#'))).kanji);
    this.apresentando = [];
    if (this.depois === 'spawn') return this.encontro();
    this.phase = 'question';
    return [];
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
    const pool = this.pool;
    const chosen = pickNext(pool, cards, now(), rng, { recent: this.recent, maxYoung: 6 });
    if (!chosen) {
      // Nada apresentado no recorte (missão nova): apresenta antes de caçar.
      return this.apresentar(novidades(pool, cards, { max: KANJI_NOVOS }), 'spawn');
    }
    const key = chosen.key;
    const kanji = getKanji(key.slice(0, key.lastIndexOf('#')));
    const isNew = emPratica(cards, key) && (cards[key]?.reps ?? 0) === 0;
    this.recent = [...this.recent, key].slice(-3);
    const rarity = this.rollRarity();
    const seals = RARITY[rarity].seals;
    this.enemy = { kanji, rarity, seals, maxSeals: seals, isNew };
    const { perguntas, novaPalavra } = this.planQuestions(kanji, seals);
    this.queue = perguntas;
    this.question = this.queue.shift() as Question;
    this.phase = 'question';
    if (novaPalavra) {
      // A palavra nova do encontro é apresentada antes da pergunta dela.
      this.apresentando = [cardKey(novaPalavra.id, 'meaning')];
      this.depois = 'question';
      this.phase = 'apresenta';
    }
    return { t: 'spawn', enemy: this.enemy };
  }

  /**
   * Monta as perguntas do encontro: significado primeiro, depois palavras e o caminho inverso.
   * Palavra nunca apresentada só entra se o kanji já passou da prática, uma por encontro, e é
   * apresentada antes. O caminho inverso (do significado para o kanji) só na cobrança.
   */
  private planQuestions(k: Kanji, seals: number): { perguntas: Question[]; novaPalavra: Word | null } {
    const { cards, rng, now } = this.deps;
    const t = now();
    const ap = (q: Question) => apoiar(q, cards);
    const out: Question[] = [ap(kanjiMeaningQuestion(k, rng))];
    const usedWords = new Set<string>();
    let novaPalavra: Word | null = null;
    const kanjiFirme = faseDe(cards, cardKey(k.id, 'meaning')) === 'cobranca';

    const nextWordQuestion = (): Question | null => {
      const options = k.words.filter((w) => !usedWords.has(w.id) && (foiApresentado(cards, cardKey(w.id, 'meaning')) || (kanjiFirme && !novaPalavra)));
      if (options.length === 0) return null;
      const score = (w: Word) => {
        const m = cards[cardKey(w.id, 'meaning')];
        const r = cards[cardKey(w.id, 'reading')];
        if (!m) return 2; // nova
        if (isDue(m, t) || (r && isDue(r, t)) || !r) return 0; // precisa de atenção
        return 1 + Math.min(retrievability(m, t), retrievability(r, t));
      };
      const sorted = options.slice().sort((a, b) => score(a) - score(b));
      const w = sorted[0] as Word;
      usedWords.add(w.id);
      const m = cards[cardKey(w.id, 'meaning')];
      const r = cards[cardKey(w.id, 'reading')];
      if (!m) {
        if (!foiApresentado(cards, cardKey(w.id, 'meaning'))) novaPalavra = w;
        return wordMeaningQuestion(w, rng);
      }
      // A leitura só depois do significado firmar.
      if (emPratica(cards, cardKey(w.id, 'meaning'))) return wordMeaningQuestion(w, rng);
      if (!r) return wordReadingQuestion(w, rng, false);
      const weakerIsReading = retrievability(r, t) <= retrievability(m, t);
      if (weakerIsReading) return wordReadingQuestion(w, rng, masteryLevel(r) >= 3 && !emPratica(cards, cardKey(w.id, 'reading')));
      return wordMeaningQuestion(w, rng);
    };

    while (out.length < seals) {
      const wantRecall = kanjiFirme && out.length === seals - 1 && !out.some((q) => q.kind === 'kanji-recall');
      const q = wantRecall ? kanjiRecallQuestion(k, rng) : nextWordQuestion();
      if (!q) {
        // Sem palavra que dê para perguntar ainda: o significado de novo, com as opções embaralhadas.
        out.push(ap({ ...kanjiMeaningQuestion(k, rng) }));
        continue;
      }
      // Evita duas perguntas idênticas no mesmo encontro.
      if (out.some((o) => o.card === q.card)) {
        const alt = kanjiFirme ? k.words.find((w) => foiApresentado(cards, cardKey(w.id, 'meaning')) && !emPratica(cards, cardKey(w.id, 'meaning')) && !out.some((o) => o.card === cardKey(w.id, 'reading'))) : undefined;
        out.push(ap(alt ? wordReadingQuestion(alt, rng, false) : kanjiMeaningQuestion(k, rng)));
      } else {
        out.push(ap(q));
      }
    }
    return { perguntas: out, novaPalavra };
  }

  answer(input: string, ms: number): HuntEvent[] {
    if (this.phase !== 'question') return [];
    const { cards, now, save, profile } = this.deps;
    const q = this.question;
    const result = checkAnswer(q, input);
    const correct = result !== 'wrong';
    avaliar(cards, q.card, q.apoio ? notaDaPratica(correct, ms) : { correct, ms, hinted: result === 'close' }, now());
    const events: HuntEvent[] = [];

    if (!correct) {
      this.stats.wrong++;
      // A mesma pergunta volta depois da próxima, com as opções embaralhadas de novo.
      const retry: Question = { ...apoiar(q, cards), choices: shuffle(this.deps.rng, apoiar(q, cards).choices) };
      if (q.apoio) {
        // Prática: errar não tira coração nem combo. O item aparece de novo, com calma.
        events.push({ t: 'de-novo', answer: q.answer, card: q.card });
        this.queue.splice(Math.min(1, this.queue.length), 0, retry);
        this.question = this.queue.shift() as Question;
        return events;
      }
      this.combo = 0;
      this.hearts--;
      events.push({ t: 'miss', answer: q.answer, hearts: this.hearts });
      if (this.hearts <= 0) {
        this.phase = 'over';
        events.push({ t: 'over' });
        return events;
      }
      this.queue.splice(Math.min(1, this.queue.length), 0, retry);
      this.question = this.queue.shift() as Question;
      return events;
    }

    this.stats.correct++;
    if (!q.apoio) {
      this.combo++;
      this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
      save.bestCombo = Math.max(save.bestCombo, this.combo);
    }
    this.enemy.seals--;
    const fast = ms < FAST_MS && !q.apoio;
    if (fast) {
      profile.coins += 2;
      this.stats.coins += 2;
    }
    events.push({ t: 'hit', fast, close: result === 'close', combo: this.combo, sealsLeft: this.enemy.seals });

    const next = this.queue.shift();
    if (this.enemy.seals > 0 && next) {
      // A pergunta seguinte já sabe se o item continua em prática depois desta resposta.
      this.question = apoiar(next, cards);
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
    events.push(...this.depoisDaCaptura());
    return events;
  }

  /** Depois da captura: kanji novo para apresentar (se a prática deixar), ou o próximo encontro. */
  private depoisDaCaptura(): HuntEvent[] {
    const pool = this.pool;
    const { cards } = this.deps;
    // Novidade só quando o que já foi apresentado saiu da prática.
    const emTreino = pool.filter((k) => foiApresentado(cards, k) && emPratica(cards, k)).length;
    if (emTreino === 0) {
      const novos = novidades(pool, cards, { max: KANJI_NOVOS });
      if (novos.length > 0) return [this.apresentar(novos, 'spawn')];
    }
    return this.encontro();
  }

  /** Depois do baú: segue a caçada. */
  continue(): HuntEvent[] {
    if (this.phase !== 'chest') return [];
    return this.depoisDaCaptura();
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
