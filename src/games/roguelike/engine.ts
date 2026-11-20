/**
 * Regras do Kotodama, sem tela. Uma run sobe um mapa curto de nós até o chefe.
 * No combate, cada carta da mão é um kanji ou uma palavra com um efeito. Jogar
 * a carta abre uma pergunta sobre o item: acertou, o efeito sai forte; errou,
 * sai fraco. Morrer encerra a run, mas o que foi estudado fica na memória.
 */
import { cardKey, getKanji, getWord, KANJI, parseCardKey, WORDS, type Word } from '../../content';
import { acharPalavra } from '../../content/escola';
import { foco } from '../../core/foco';
import { pickNext } from '../../core/picker';
import { levelInfo } from '../../core/progress';
import {
  checkAnswer,
  kanjiMeaningQuestion,
  kanjiRecallQuestion,
  wordMeaningQuestion,
  wordReadingQuestion,
  type Question,
  type QuestionKind,
} from '../../core/questions';
import { pick, shuffle, weighted, type Rng } from '../../core/rng';
import type { Profile } from '../../core/save';
import { isYoung, masteryLevel, retrievability, review, type CardState } from '../../core/srs';

export const MAX_HP = 40;
export const ENERGY = 3;
export const HAND_SIZE = 5;
export const REST_HEAL = 12;
export const SHARPEN = 2;
/** Com esse tanto de itens ainda moles na memória, as recompensas param de trazer novidade. */
export const MAX_YOUNG = 10;
const FAST_MS = 2500;
const FAST_BONUS = 2;

export interface RoguelikeSave {
  runs: number;
  wins: number;
  bestFloor: number;
  bestCombo: number;
}

export function emptyRoguelikeSave(): RoguelikeSave {
  return { runs: 0, wins: 0, bestFloor: 0, bestCombo: 0 };
}

/** Devolve o save do jogo dentro de `games`, criando ou completando campos. Sempre o mesmo objeto. */
export function ensureRoguelikeSave(games: Record<string, unknown>): RoguelikeSave {
  const base = emptyRoguelikeSave();
  const current = games.roguelike;
  if (typeof current !== 'object' || current === null || Array.isArray(current)) {
    games.roguelike = base;
    return base;
  }
  const save = current as Record<string, unknown>;
  for (const [k, v] of Object.entries(base)) {
    if (typeof save[k] !== 'number' || !Number.isFinite(save[k])) save[k] = v;
  }
  return save as unknown as RoguelikeSave;
}

export type Effect = 'attack' | 'block' | 'heal' | 'draw';

export const EFFECTS: Record<Effect, { name: string; strong: number; weak: number; weight: number }> = {
  attack: { name: 'Golpe', strong: 9, weak: 3, weight: 35 },
  block: { name: 'Escudo', strong: 8, weak: 3, weight: 30 },
  heal: { name: 'Cura', strong: 6, weak: 2, weight: 15 },
  draw: { name: 'Foco', strong: 2, weak: 1, weight: 20 },
};

export function effectText(effect: Effect, amount: number): string {
  if (effect === 'attack') return `${amount} de dano`;
  if (effect === 'block') return `${amount} de escudo`;
  if (effect === 'heal') return `cura ${amount}`;
  return `compra ${amount}`;
}

export interface RunCard {
  uid: number;
  /** Id do kanji (`k:山`) ou da palavra (`w:山道`) em `src/content`. */
  itemId: string;
  effect: Effect;
}

export interface Face {
  kind: 'kanji' | 'word';
  jp: string;
  pt: string;
  kana?: string;
}

export function faceOf(itemId: string): Face {
  if (itemId.startsWith('k:')) {
    const k = getKanji(itemId);
    return { kind: 'kanji', jp: k.kanji, pt: k.pt.join(', ') };
  }
  const w = palavra(itemId);
  return { kind: 'word', jp: w.jp, pt: w.pt, kana: w.kana };
}

export type RelicId = 'leque' | 'sino' | 'ampulheta' | 'amuleto' | 'lanterna' | 'cha' | 'bolso';

export const RELICS: Record<RelicId, { name: string; jp: string; text: string }> = {
  leque: { name: 'Leque de ferro', jp: '扇', text: 'A cada 3 acertos seguidos, ganha 4 de escudo.' },
  sino: { name: 'Sino da manhã', jp: '鈴', text: 'A primeira carta de cada turno custa 0.' },
  ampulheta: { name: 'Ampulheta', jp: '砂', text: 'Resposta rápida dá +4 em vez de +2.' },
  amuleto: { name: 'Amuleto do aprendiz', jp: '守', text: 'Carta errada sai com metade da força, não com o efeito fraco.' },
  lanterna: { name: 'Lanterna', jp: '灯', text: 'Uma energia a mais no primeiro turno de cada combate.' },
  cha: { name: 'Chá quente', jp: '茶', text: 'Vencer um combate cura 4.' },
  bolso: { name: 'Bolso fundo', jp: '袋', text: 'Compra uma carta a mais por turno.' },
};

export const RELIC_IDS = Object.keys(RELICS) as RelicId[];

export type NodeKind = 'combat' | 'elite' | 'rest' | 'shop' | 'boss';

export const NODES: Record<NodeKind, { name: string; jp: string }> = {
  combat: { name: 'Combate', jp: '戦' },
  elite: { name: 'Elite', jp: '強' },
  rest: { name: 'Descanso', jp: '休' },
  shop: { name: 'Loja', jp: '店' },
  boss: { name: 'Chefe', jp: '鬼' },
};

/** Sete andares. Onde há dois nós, o jogador escolhe o caminho. */
export function buildMap(rng: Rng): NodeKind[][] {
  const pair = (a: NodeKind, b: NodeKind): NodeKind[] => (rng() < 0.5 ? [a, b] : [b, a]);
  return [['combat'], ['combat'], pair('rest', 'shop'), pair('combat', 'elite'), ['combat'], pair('rest', 'shop'), ['boss']];
}

export interface Intent {
  attack?: number;
  block?: number;
}

interface EnemyDef {
  name: string;
  jp: string;
  hp: number;
  pattern: Intent[];
}

const ENEMIES: Record<'combat' | 'elite' | 'boss', EnemyDef[]> = {
  combat: [
    { name: 'Kappa', jp: '河童', hp: 24, pattern: [{ attack: 7 }, { attack: 7 }, { block: 7 }] },
    { name: 'Tanuki', jp: '狸', hp: 28, pattern: [{ block: 6 }, { attack: 10 }] },
    { name: 'Karakasa', jp: '傘', hp: 21, pattern: [{ attack: 5 }, { attack: 6 }, { attack: 9 }] },
  ],
  elite: [
    { name: 'Tengu', jp: '天狗', hp: 44, pattern: [{ attack: 9 }, { attack: 6, block: 7 }, { attack: 14 }] },
    { name: 'Kitsune', jp: '狐', hp: 40, pattern: [{ attack: 8 }, { attack: 8 }, { block: 11 }, { attack: 15 }] },
  ],
  boss: [{ name: 'Oni', jp: '鬼', hp: 78, pattern: [{ attack: 9 }, { block: 9 }, { attack: 15 }, { attack: 7, block: 6 }] }],
};

export interface Enemy {
  kind: 'combat' | 'elite' | 'boss';
  name: string;
  jp: string;
  hp: number;
  maxHp: number;
  block: number;
  pattern: Intent[];
  step: number;
}

const PAYOUT: Record<Enemy['kind'], { gold: number; coins: number; xp: number }> = {
  combat: { gold: 20, coins: 6, xp: 12 },
  elite: { gold: 40, coins: 15, xp: 25 },
  boss: { gold: 0, coins: 40, xp: 60 },
};

export type ShopItem =
  | { t: 'card'; card: RunCard; price: number; sold: boolean }
  | { t: 'relic'; relic: RelicId; price: number; sold: boolean }
  | { t: 'heal'; amount: number; price: number; sold: boolean };

export interface Reward {
  gold: number;
  offers: RunCard[];
  /** Relíquia que veio junto (elite). Já entra na run. */
  relic?: RelicId;
}

export type RunEvent =
  | { t: 'enter'; node: NodeKind }
  | { t: 'ask'; question: Question }
  | {
      t: 'play';
      card: RunCard;
      correct: boolean;
      close: boolean;
      fast: boolean;
      amount: number;
      /** Dano que passou do escudo do inimigo. */
      damage: number;
      combo: number;
      answer: string;
    }
  | { t: 'relic'; relic: RelicId; note: string }
  | { t: 'enemy'; intent: Intent; damage: number; blocked: number }
  | { t: 'win'; kind: Enemy['kind']; gold: number; coins: number; xp: number }
  | { t: 'levelup'; level: number }
  | { t: 'over'; won: boolean };

export interface RunDeps {
  cards: Record<string, CardState>;
  profile: Profile;
  save: RoguelikeSave;
  rng: Rng;
  now: () => number;
}

export interface RunStats {
  correct: number;
  wrong: number;
  bestCombo: number;
  /** Itens vistos pela primeira vez nesta run. */
  newItems: string[];
  coins: number;
  xp: number;
  wins: number;
}

type Slot = 'kanji' | 'word' | 'any';

const meaningKey = (itemId: string) => cardKey(itemId, 'meaning');
const KANJI_IDS = KANJI.map((k) => k.id);
const WORD_IDS = WORDS.map((w) => w.id);

/** Palavra de qualquer parte do conteúdo (a missão da Jornada traz palavras dos temas da escola). */
function palavra(id: string): Word {
  return acharPalavra(id) ?? getWord(id);
}

/**
 * O que pode virar carta nesta run. Missão da Jornada: só o conteúdo dela, e palavra
 * entra mesmo sem os kanji vistos, porque a lição da missão já apresentou a palavra.
 */
function itensDaRun(): { kanji: readonly string[]; words: readonly string[]; gate: boolean } {
  const f = foco.value;
  if (f && (f.kanji?.length || f.palavras?.length)) return { kanji: f.kanji ?? [], words: f.palavras ?? [], gate: false };
  return { kanji: KANJI_IDS, words: WORD_IDS, gate: true };
}

export class Run {
  hp = MAX_HP;
  readonly maxHp = MAX_HP;
  block = 0;
  energy = 0;
  gold = 0;
  /** Bônus de dano dos golpes, ganho no descanso. */
  strength = 0;
  combo = 0;
  turn = 0;
  floor = 0;
  won = false;
  phase: 'map' | 'combat' | 'question' | 'reward' | 'rest' | 'shop' | 'over' = 'map';
  readonly map: NodeKind[][];
  /** Nó escolhido em cada andar já visitado. */
  readonly path: number[] = [];
  readonly relics: RelicId[] = [];
  readonly deck: RunCard[] = [];
  hand: RunCard[] = [];
  drawPile: RunCard[] = [];
  discard: RunCard[] = [];
  enemy: Enemy | null = null;
  question: Question | null = null;
  reward: Reward | null = null;
  shop: ShopItem[] = [];
  readonly stats: RunStats = { correct: 0, wrong: 0, bestCombo: 0, newItems: [], coins: 0, xp: 0, wins: 0 };
  private pending: RunCard | null = null;
  private playedThisTurn = 0;
  private nextUid = 1;
  private lastKind = new Map<string, QuestionKind>();

  constructor(private readonly deps: RunDeps) {
    this.map = buildMap(deps.rng);
    this.relics.push(pick(deps.rng, RELIC_IDS));
    const items = this.pickItems(['kanji', 'kanji', 'kanji', 'word'], 4);
    const effects: Effect[] = ['attack', 'attack', 'attack', 'attack', 'block', 'block', 'block', 'draw'];
    effects.forEach((effect, i) => this.deck.push(this.makeCard(items[i % items.length] as string, effect)));
  }

  /** Começa a run já dentro do primeiro combate: uma tecla e está jogando. */
  start(): RunEvent[] {
    this.deps.save.runs++;
    return this.choose(0);
  }

  has(relic: RelicId): boolean {
    return this.relics.includes(relic);
  }

  /** Opções do andar atual. */
  get options(): NodeKind[] {
    return this.map[this.floor] ?? [];
  }

  get intent(): Intent {
    const e = this.enemy;
    return e ? (e.pattern[e.step % e.pattern.length] as Intent) : {};
  }

  isNew(itemId: string): boolean {
    return !this.deps.cards[meaningKey(itemId)];
  }

  costOf(): number {
    return this.has('sino') && this.playedThisTurn === 0 ? 0 : 1;
  }

  get canPlay(): boolean {
    return this.phase === 'combat' && this.hand.length > 0 && this.energy >= this.costOf();
  }

  /** Quanto a carta faz se a resposta for certa (sem o bônus de rapidez). */
  strongAmount(card: RunCard): number {
    return EFFECTS[card.effect].strong + (card.effect === 'attack' ? this.strength : 0);
  }

  private makeCard(itemId: string, effect: Effect): RunCard {
    return { uid: this.nextUid++, itemId, effect };
  }

  /**
   * Escolhe itens para cartas novas. Quem decide é o `pickNext`: primeiro o que
   * precisa de revisão, depois novidade, e novidade pausa quando há muita coisa mole.
   * Palavra só entra depois que os kanji dela já apareceram.
   */
  private pickItems(slots: Slot[], maxNew: number): string[] {
    const { cards, rng, now } = this.deps;
    const taken = new Set(this.deck.map((c) => c.itemId));
    const itens = itensDaRun();
    const young = [...itens.kanji, ...itens.words].filter((id) => {
      const c = cards[meaningKey(id)];
      return c && isYoung(c);
    }).length;
    const allowNew = young >= MAX_YOUNG ? 0 : maxNew;
    const out: string[] = [];
    let fresh = 0;
    for (const slot of slots) {
      const known = (kanjiId: string) => !!cards[meaningKey(kanjiId)] || taken.has(kanjiId) || out.includes(kanjiId);
      const free = (id: string) => !taken.has(id) && !out.includes(id);
      const kanji = itens.kanji.filter(free);
      const words = itens.words.filter((id) => free(id) && (!itens.gate || palavra(id).kanji.every((c) => known(`k:${c}`))));
      let ids = slot === 'kanji' ? kanji : slot === 'word' ? words : rng() < 0.5 ? kanji : words;
      if (ids.length === 0) ids = kanji.length > 0 ? kanji : words;
      let pool = ids.map(meaningKey);
      if (fresh >= allowNew) {
        // Novidade pausada: fica no que já foi visto, mesmo que seja do outro tipo.
        const seen = pool.filter((k) => cards[k]);
        const anySeen = seen.length > 0 ? seen : [...kanji, ...words].map(meaningKey).filter((k) => cards[k]);
        if (anySeen.length > 0) pool = anySeen;
      }
      const chosen = pickNext(pool, cards, now(), rng, { maxYoung: MAX_YOUNG, newRatio: 0.5 });
      if (!chosen) continue;
      if (!cards[chosen.key]) fresh++;
      out.push(parseCardKey(chosen.key).itemId);
    }
    return out;
  }

  private offerCards(slots: Slot[], maxNew: number): RunCard[] {
    const { rng } = this.deps;
    const weights = Object.fromEntries((Object.keys(EFFECTS) as Effect[]).map((e) => [e, EFFECTS[e].weight])) as Record<Effect, number>;
    const used: Effect[] = [];
    return this.pickItems(slots, maxNew).map((itemId) => {
      let effect = weighted(rng, weights);
      for (let i = 0; i < 4 && used.includes(effect); i++) effect = weighted(rng, weights);
      used.push(effect);
      return this.makeCard(itemId, effect);
    });
  }

  /** Entra em um dos nós do andar atual. */
  choose(index: number): RunEvent[] {
    if (this.phase !== 'map') return [];
    const node = this.options[index];
    if (!node) return [];
    this.path.push(index);
    if (node === 'rest') this.phase = 'rest';
    else if (node === 'shop') this.openShop();
    else this.startCombat(node);
    return [{ t: 'enter', node }];
  }

  private finishNode(): void {
    this.floor++;
    this.deps.save.bestFloor = Math.max(this.deps.save.bestFloor, this.floor);
    this.enemy = null;
    this.reward = null;
    this.shop = [];
    this.phase = 'map';
  }

  private startCombat(kind: Enemy['kind']): void {
    const { rng } = this.deps;
    const def = pick(rng, ENEMIES[kind]);
    const hp = def.hp + this.floor * 3;
    const extra = Math.floor(this.floor / 2);
    this.enemy = {
      kind,
      name: def.name,
      jp: def.jp,
      hp,
      maxHp: hp,
      block: 0,
      pattern: def.pattern.map((p) => ({ ...p, attack: p.attack === undefined ? undefined : p.attack + extra })),
      step: 0,
    };
    this.drawPile = shuffle(rng, this.deck);
    this.hand = [];
    this.discard = [];
    this.turn = 0;
    this.phase = 'combat';
    this.startTurn();
  }

  private startTurn(): void {
    this.turn++;
    this.block = 0;
    this.playedThisTurn = 0;
    this.energy = ENERGY + (this.has('lanterna') && this.turn === 1 ? 1 : 0);
    this.draw(HAND_SIZE + (this.has('bolso') ? 1 : 0));
  }

  private draw(n: number): number {
    let drawn = 0;
    for (let i = 0; i < n; i++) {
      if (this.drawPile.length === 0) {
        if (this.discard.length === 0) break;
        this.drawPile = shuffle(this.deps.rng, this.discard);
        this.discard = [];
      }
      this.hand.push(this.drawPile.pop() as RunCard);
      drawn++;
    }
    return drawn;
  }

  /**
   * A pergunta de uma carta muda com a memória do item: primeiro contato ensina,
   * depois vem a habilidade ainda não vista, e por fim a mais fraca das duas.
   */
  private questionFor(card: RunCard): Question {
    const { cards, rng, now } = this.deps;
    const t = now();
    const id = card.itemId;
    const meaning = cards[meaningKey(id)];
    const other = cardKey(id, id.startsWith('k:') ? 'recall' : 'reading');
    const make = (useOther: boolean): Question => {
      if (id.startsWith('k:')) {
        const k = getKanji(id);
        return useOther ? kanjiRecallQuestion(k, rng) : kanjiMeaningQuestion(k, rng, !meaning);
      }
      const w = palavra(id);
      return useOther ? wordReadingQuestion(w, rng, masteryLevel(cards[other]) >= 3) : wordMeaningQuestion(w, rng, !meaning);
    };
    // O caminho inverso (e a leitura) só entram depois de o significado ter sido visto de verdade.
    const ready = !!meaning && meaning.reps >= (id.startsWith('k:') ? 2 : 1);
    if (!meaning || !ready) return make(false);
    if (!cards[other]) return make(true);
    const rm = retrievability(meaning, t);
    const ro = retrievability(cards[other], t);
    const weakerIsOther = ro < rm;
    const tie = Math.abs(ro - rm) < 0.15;
    if (!tie) return make(weakerIsOther);
    const last = this.lastKind.get(id);
    return make(last === 'kanji-meaning' || last === 'word-meaning');
  }

  /** Joga a carta da mão: abre a pergunta dela. O efeito sai na resposta. */
  playCard(index: number): RunEvent[] {
    if (this.phase !== 'combat') return [];
    const card = this.hand[index];
    if (!card || this.energy < this.costOf()) return [];
    this.pending = card;
    this.question = this.questionFor(card);
    this.lastKind.set(card.itemId, this.question.kind);
    this.phase = 'question';
    return [{ t: 'ask', question: this.question }];
  }

  answer(input: string, ms: number): RunEvent[] {
    const q = this.question;
    const card = this.pending;
    const enemy = this.enemy;
    if (this.phase !== 'question' || !q || !card || !enemy) return [];
    const { cards, now, save } = this.deps;
    const result = checkAnswer(q, input);
    const correct = result !== 'wrong';
    cards[q.card] = review(cards[q.card], { correct, ms, hinted: !!q.teach || result === 'close' }, now());
    if (q.teach) this.stats.newItems.push(faceOf(card.itemId).jp);

    const events: RunEvent[] = [];
    this.energy -= this.costOf();
    this.playedThisTurn++;
    this.hand = this.hand.filter((c) => c !== card);
    this.pending = null;
    this.question = null;
    this.phase = 'combat';

    const strong = this.strongAmount(card);
    const fast = correct && ms < FAST_MS && !q.teach;
    let amount: number;
    if (correct) {
      this.combo++;
      this.stats.correct++;
      this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
      save.bestCombo = Math.max(save.bestCombo, this.combo);
      amount = strong;
      // O bônus de rapidez não multiplica a compra de cartas.
      if (fast && card.effect !== 'draw') amount += this.has('ampulheta') ? FAST_BONUS * 2 : FAST_BONUS;
    } else {
      this.combo = 0;
      this.stats.wrong++;
      const weak = EFFECTS[card.effect].weak;
      amount = this.has('amuleto') ? Math.max(weak, Math.ceil(strong / 2)) : weak;
    }

    let damage = 0;
    if (card.effect === 'attack') {
      const absorbed = Math.min(enemy.block, amount);
      enemy.block -= absorbed;
      damage = amount - absorbed;
      enemy.hp = Math.max(0, enemy.hp - damage);
    } else if (card.effect === 'block') {
      this.block += amount;
    } else if (card.effect === 'heal') {
      this.hp = Math.min(this.maxHp, this.hp + amount);
    } else {
      this.draw(amount);
      if (correct) this.energy++;
    }
    this.discard.push(card);
    events.push({ t: 'play', card, correct, close: result === 'close', fast, amount, damage, combo: this.combo, answer: q.answer });

    if (correct && this.has('leque') && this.combo % 3 === 0) {
      this.block += 4;
      events.push({ t: 'relic', relic: 'leque', note: '+4 de escudo' });
    }
    if (enemy.hp <= 0) events.push(...this.winCombat(enemy));
    return events;
  }

  private winCombat(enemy: Enemy): RunEvent[] {
    const { profile, rng, save } = this.deps;
    const events: RunEvent[] = [];
    const pay = PAYOUT[enemy.kind];
    const gold = pay.gold === 0 ? 0 : pay.gold + Math.floor(rng() * 10);
    const before = levelInfo(profile.xp).level;
    this.gold += gold;
    profile.coins += pay.coins;
    profile.xp += pay.xp;
    this.stats.coins += pay.coins;
    this.stats.xp += pay.xp;
    this.stats.wins++;
    events.push({ t: 'win', kind: enemy.kind, gold, coins: pay.coins, xp: pay.xp });
    const after = levelInfo(profile.xp).level;
    if (after > before) events.push({ t: 'levelup', level: after });
    if (this.has('cha') && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + 4);
      events.push({ t: 'relic', relic: 'cha', note: 'curou 4' });
    }
    this.hand = [];
    this.block = 0;

    if (enemy.kind === 'boss') {
      this.floor++;
      save.bestFloor = Math.max(save.bestFloor, this.floor);
      save.wins++;
      this.won = true;
      this.phase = 'over';
      events.push({ t: 'over', won: true });
      return events;
    }
    const reward: Reward = { gold, offers: this.offerCards(['kanji', 'word', 'any'], 2) };
    if (enemy.kind === 'elite') {
      const relic = this.freeRelic();
      if (relic) {
        this.relics.push(relic);
        reward.relic = relic;
      }
    }
    this.reward = reward;
    this.phase = 'reward';
    return events;
  }

  private freeRelic(): RelicId | undefined {
    const free = RELIC_IDS.filter((r) => !this.has(r));
    return free.length > 0 ? pick(this.deps.rng, free) : undefined;
  }

  /** Fica com uma das cartas oferecidas (ou nenhuma, com `null`) e volta ao mapa. */
  takeReward(index: number | null): RunEvent[] {
    if (this.phase !== 'reward' || !this.reward) return [];
    if (index !== null) {
      const card = this.reward.offers[index];
      if (!card) return [];
      this.deck.push(card);
    }
    this.finishNode();
    return [];
  }

  /** Passa a vez: o inimigo faz o que anunciou e começa um turno novo. */
  endTurn(): RunEvent[] {
    const enemy = this.enemy;
    if (this.phase !== 'combat' || !enemy) return [];
    const intent = this.intent;
    enemy.block = intent.block ?? 0;
    const attack = intent.attack ?? 0;
    const blocked = Math.min(this.block, attack);
    const damage = attack - blocked;
    this.hp = Math.max(0, this.hp - damage);
    enemy.step++;
    this.discard.push(...this.hand);
    this.hand = [];
    const events: RunEvent[] = [{ t: 'enemy', intent, damage, blocked }];
    if (this.hp <= 0) {
      this.phase = 'over';
      events.push({ t: 'over', won: false });
      return events;
    }
    this.startTurn();
    return events;
  }

  rest(choice: 'heal' | 'sharpen'): RunEvent[] {
    if (this.phase !== 'rest') return [];
    if (choice === 'heal') this.hp = Math.min(this.maxHp, this.hp + REST_HEAL);
    else this.strength += SHARPEN;
    this.finishNode();
    return [];
  }

  private openShop(): void {
    const cards = this.offerCards(['kanji', 'word'], 1);
    this.shop = cards.map((card): ShopItem => ({ t: 'card', card, price: 30, sold: false }));
    const relic = this.freeRelic();
    if (relic) this.shop.push({ t: 'relic', relic, price: 60, sold: false });
    this.shop.push({ t: 'heal', amount: 12, price: 25, sold: false });
    this.phase = 'shop';
  }

  buy(index: number): boolean {
    const item = this.shop[index];
    if (this.phase !== 'shop' || !item || item.sold || this.gold < item.price) return false;
    this.gold -= item.price;
    item.sold = true;
    if (item.t === 'card') this.deck.push(item.card);
    else if (item.t === 'relic') this.relics.push(item.relic);
    else this.hp = Math.min(this.maxHp, this.hp + item.amount);
    return true;
  }

  leaveShop(): RunEvent[] {
    if (this.phase !== 'shop') return [];
    this.finishNode();
    return [];
  }
}
