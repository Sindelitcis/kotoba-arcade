/**
 * Regras do Kumitate (montar frases), sem tela. Cada frase tem buracos: o jogador
 * encaixa partículas (は, を, に...) e pontas de verbo (ます, ません, て...) até a
 * frase dizer o que foi pedido em português. Peça que não serve não dá tela de
 * erro: ela volta para a bandeja com o porquê.
 *
 * Cada ponto de gramática é uma carta da memória espaçada (`g:<ponto>#uso`), a
 * mesma dos outros jogos. Os textos de lição e as frases ficam em `pontos.ts`.
 */
import { pickNext } from '../../core/picker';
import { levelInfo } from '../../core/progress';
import { shuffle, type Rng } from '../../core/rng';
import type { Profile } from '../../core/save';
import { review, type CardState } from '../../core/srs';

// ───────── Peças ─────────

export const PARTICLES = ['は', 'の', 'を', 'に', 'へ', 'で', 'と', 'も', 'が'] as const;
export const ENDINGS = ['ます', 'ません', 'ました', 'たい', 'て', 'ています', 'ない', 'た'] as const;
export type Particle = (typeof PARTICLES)[number];
export type Ending = (typeof ENDINGS)[number];
export type Block = Particle | Ending;

/** O que cada buraco pede. Partícula: o papel da palavra. Verbo: a forma. */
export const ROLES = ['wa', 'no', 'wo', 'ni', 'de', 'to', 'mo', 'ga', 'masu', 'masen', 'mashita', 'tai', 'te', 'teiru', 'nai', 'ta'] as const;
export type Role = (typeof ROLES)[number];

export const ANSWERS: Readonly<Record<Role, readonly Block[]>> = {
  wa: ['は'],
  no: ['の'],
  wo: ['を'],
  ni: ['に', 'へ'],
  de: ['で'],
  to: ['と'],
  mo: ['も'],
  ga: ['が'],
  masu: ['ます'],
  masen: ['ません'],
  mashita: ['ました'],
  tai: ['たい'],
  te: ['て'],
  teiru: ['ています'],
  nai: ['ない'],
  ta: ['た'],
};

export function isEnding(b: Block): b is Ending {
  return (ENDINGS as readonly string[]).includes(b);
}

export function isVerbRole(role: Role): boolean {
  return isEnding((ANSWERS[role] as readonly Block[])[0] as Block);
}

/** Uma frase sobre o que a peça faz. Junto com `NEEDS`, explica por que ela não encaixa. */
export const DOES: Readonly<Record<Block, string>> = {
  は: 'は marca o assunto da frase.',
  の: 'の liga duas palavras, como "de" em "livro do amigo".',
  を: 'を marca o que sofre a ação.',
  に: 'に marca para onde algo vai.',
  へ: 'へ marca a direção, para onde se vai.',
  で: 'で marca onde a ação acontece.',
  と: 'と depois de uma pessoa quer dizer "com".',
  も: 'も quer dizer "também".',
  が: 'が marca o que existe ou o que aparece.',
  ます: 'ます deixa o verbo educado, no presente e afirmativo.',
  ません: 'ません nega o verbo, de forma educada.',
  ました: 'ました põe o verbo no passado, de forma educada.',
  たい: 'たい quer dizer "quero fazer".',
  て: 'て liga o verbo ao que vem depois, como ください.',
  ています: 'ています diz que a ação está acontecendo.',
  ない: 'ない é o "não" da forma simples, entre amigos.',
  た: 'た é o passado da forma simples, entre amigos.',
};

export const NEEDS: Readonly<Record<Role, string>> = {
  wa: 'Aqui a palavra é o assunto da frase: vai は.',
  no: 'Aqui a primeira palavra diz de quem ou de quê é a segunda: vai の.',
  wo: 'Aqui a palavra é o que sofre a ação do verbo: vai を.',
  ni: 'Aqui é para onde algo vai: vai に ou へ.',
  de: 'Aqui é o lugar onde a ação acontece: vai で.',
  to: 'Aqui é com quem se faz a coisa: vai と.',
  mo: 'A frase pedida diz "também": vai も.',
  ga: 'Aqui é a coisa que existe no lugar: vai が.',
  masu: 'A frase pedida é educada, no presente e afirmativa: vai ます.',
  masen: 'A frase pedida diz "não", de forma educada: vai ません.',
  mashita: 'A frase pedida está no passado: vai ました.',
  tai: 'A frase pedida diz "quero": vai たい.',
  te: 'Antes de ください o verbo vai para a forma て.',
  teiru: 'A frase pedida diz "está fazendo": vai ています.',
  nai: 'A frase pedida é um "não" entre amigos: vai ない.',
  ta: 'A frase pedida é passado entre amigos: vai た.',
};

/** Confusões comuns ganham explicação própria. Chave: `papel|peça`. */
const SPECIAL: Readonly<Record<string, string>> = {
  'wa|が': 'が também cabe aqui, mas muda o sentido: destaca a pessoa ("sou EU que..."). Para só apresentar o assunto, は.',
  'wa|も': 'も quer dizer "também", e a frase pedida não tem "também". Aqui vai は.',
  'mo|は': 'は apresenta o assunto, mas a frase pedida diz "também". Troque por も.',
  'ni|で': 'で marca onde uma ação acontece. Aqui é para onde se vai: に ou へ.',
  'de|に': 'に marca para onde se vai. Aqui o lugar é onde a ação acontece: で.',
  'de|へ': 'へ marca para onde se vai. Aqui o lugar é onde a ação acontece: で.',
  'ga|は': 'は apresentaria o assunto. Para dizer que algo existe num lugar, a coisa leva が.',
  'ga|を': 'を é para o que sofre uma ação. あります e います não fazem nada com a coisa: ela só existe, e leva が.',
  'nai|ません': 'ません também nega, mas é a forma educada. Entre amigos, a forma simples: ない.',
  'ta|ました': 'ました também é passado, mas é a forma educada. Entre amigos, a forma simples: た.',
  'masen|ない': 'ない também nega, mas é a forma simples. A frase pedida é educada: ません.',
  'mashita|た': 'た também é passado, mas é a forma simples. A frase pedida é educada: ました.',
  'teiru|て': 'Só て deixa a frase pela metade. Para "está fazendo", ています.',
  'te|ています': 'ています é "está fazendo". Antes de ください vai só て.',
};

/** Por que a peça não encaixa nesse buraco. */
export function whyNot(role: Role, block: Block): string {
  return SPECIAL[`${role}|${block}`] ?? `${DOES[block]} ${NEEDS[role]}`;
}

export function fits(role: Role, block: Block): boolean {
  return ANSWERS[role].includes(block);
}

// ───────── Verbos ─────────

export type VerbGroup = 'godan' | 'ichidan' | 'kuru' | 'suru';

export interface Verb {
  /** Forma de dicionário, como se escreve. */
  jp: string;
  kana: string;
  group: VerbGroup;
  pt: string;
}

const I_ROW: Record<string, string> = { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り' };
const A_ROW: Record<string, string> = { う: 'わ', く: 'か', ぐ: 'が', す: 'さ', つ: 'た', ぬ: 'な', ぶ: 'ば', む: 'ま', る: 'ら' };
const TE: Record<string, string> = { う: 'って', つ: 'って', る: 'って', む: 'んで', ぶ: 'んで', ぬ: 'んで', く: 'いて', ぐ: 'いで', す: 'して' };

/** Conjuga a leitura (em kana) de um verbo na forma que a peça pede. */
export function conjugateKana(verb: Verb, ending: Ending): string {
  const k = verb.kana;
  const last = k.slice(-1);
  const body = k.slice(0, -1);
  let iStem: string;
  let aStem: string;
  let te: string;
  if (verb.group === 'ichidan') {
    iStem = aStem = body;
    te = `${body}て`;
  } else if (verb.group === 'kuru') {
    const pre = k.slice(0, -2);
    iStem = `${pre}き`;
    aStem = `${pre}こ`;
    te = `${pre}きて`;
  } else if (verb.group === 'suru') {
    const pre = k.slice(0, -2);
    iStem = aStem = `${pre}し`;
    te = `${pre}して`;
  } else {
    const i = I_ROW[last];
    const a = A_ROW[last];
    const t = TE[last];
    if (!i || !a || !t) throw new Error(`verbo godan com final estranho: ${verb.jp}`);
    iStem = body + i;
    aStem = body + a;
    // 行く é o único godan em く com forma て irregular.
    te = verb.jp === '行く' ? `${body}って` : body + t;
  }
  switch (ending) {
    case 'ます':
    case 'ません':
    case 'ました':
    case 'たい':
      return iStem + ending;
    case 'て':
      return te;
    case 'ています':
      return `${te}います`;
    case 'ない':
      return `${aStem}ない`;
    case 'た':
      return te.slice(0, -1) + (te.endsWith('で') ? 'だ' : 'た');
  }
}

/** Pedaço que vai na tela: kanji com leitura em cima e o resto em kana. */
export interface Written {
  text: string;
  reading?: string;
  tail: string;
}

/**
 * Como o verbo conjugado se escreve. O kanji fica, a leitura dele vem da conta
 * (no 来る ela muda: 来[く]る, 来[き]ます, 来[こ]ない).
 */
export function conjugateWritten(verb: Verb, ending: Ending | null): Written {
  const kana = ending ? conjugateKana(verb, ending) : verb.kana;
  const kanji = [...verb.jp].filter((c) => !/[぀-ヿ]/.test(c)).join('');
  if (!kanji) return { text: '', tail: kana };
  const okuri = verb.jp.slice(kanji.length);
  const readLen = verb.kana.length - okuri.length;
  return { text: kanji, reading: kana.slice(0, readLen), tail: kana.slice(readLen) };
}

// ───────── Frases ─────────

export interface Point {
  /** Vai na chave da carta: `g:<id>#uso`. */
  id: string;
  /** As peças que este ponto traz para a bandeja. */
  blocks: readonly Block[];
  /** Os buracos que este ponto ensina. */
  roles: readonly Role[];
  title: string;
  /** Duas ou três frases curtas explicando, antes de cobrar. */
  lesson: string;
  /** Exemplo montado, na marcação de `parseSentence`. */
  example: { jp: string; pt: string };
  /** Frases para montar. */
  sentences: readonly { jp: string; pt: string }[];
}

export interface Course {
  points: readonly Point[];
  verbs: Readonly<Record<string, Verb>>;
  /** Significado de palavras de apoio (わたし, これ...) que não estão no conteúdo. */
  glossary: Readonly<Record<string, string>>;
}

export type Piece =
  | { k: 'text'; text: string; reading?: string; word?: string }
  | { k: 'gap'; role: Role; verb?: string };

const TOKEN = /^\[([^\]|]*)\|([^\]|]*)(?:\|([^\]|]*))?\]$/;
const GAP = /^\{([a-z]+)(?::([^}]+))?\}$/;

/**
 * Marcação das frases, peças separadas por espaço:
 * `[友達|ともだち|=]` palavra com leitura e carta `w:友達`; `[本|ほん]` só leitura;
 * `[ゆっくり||=]` kana com carta; `{wa}` buraco de partícula; `{masu:飲む}` buraco
 * de verbo; qualquer outra coisa é texto comum (です, わたし).
 */
export function parseSentence(markup: string): Piece[] {
  return markup
    .trim()
    .split(/\s+/)
    .map((raw): Piece => {
      const gap = GAP.exec(raw);
      if (gap) {
        const role = gap[1] as Role;
        if (!(ROLES as readonly string[]).includes(role)) throw new Error(`buraco desconhecido: ${raw}`);
        return gap[2] ? { k: 'gap', role, verb: gap[2] } : { k: 'gap', role };
      }
      const tok = TOKEN.exec(raw);
      if (tok) {
        const text = tok[1] as string;
        const piece: Piece = { k: 'text', text };
        if (tok[2]) piece.reading = tok[2];
        if (tok[3]) piece.word = tok[3] === '=' ? `w:${text}` : `w:${tok[3]}`;
        return piece;
      }
      return { k: 'text', text: raw };
    });
}

export function pointOfRole(course: Course, role: Role): Point {
  const p = course.points.find((x) => x.roles.includes(role));
  if (!p) throw new Error(`nenhum ponto ensina o buraco ${role}`);
  return p;
}

export function pointOfBlock(course: Course, block: Block): Point | undefined {
  return course.points.find((x) => x.blocks.includes(block));
}

export const cardOf = (pointId: string) => `g:${pointId}#uso`;

/** Confere as frases do curso. Devolve a lista de problemas (vazia = tudo certo). */
export function validateCourse(course: Course, hasWord: (id: string) => boolean): string[] {
  const errors: string[] = [];
  const blocks = new Set<Block>();
  for (const p of course.points) {
    for (const b of p.blocks) {
      if (blocks.has(b)) errors.push(`peça ${b} em mais de um ponto`);
      blocks.add(b);
    }
  }
  for (const r of ROLES) {
    if (course.points.filter((p) => p.roles.includes(r)).length !== 1) errors.push(`buraco ${r} precisa de exatamente um ponto`);
    for (const a of ANSWERS[r]) if (!blocks.has(a)) errors.push(`resposta ${a} de ${r} não vem de nenhum ponto`);
  }
  const check = (where: string, markup: string, mustHave?: Point) => {
    let pieces: Piece[];
    try {
      pieces = parseSentence(markup);
    } catch (e) {
      errors.push(`${where}: ${(e as Error).message}`);
      return;
    }
    for (const piece of pieces) {
      if (piece.k === 'gap') {
        const verbRole = isVerbRole(piece.role);
        if (verbRole && !piece.verb) errors.push(`${where}: buraco de verbo sem verbo (${piece.role})`);
        if (!verbRole && piece.verb) errors.push(`${where}: buraco de partícula com verbo (${piece.role})`);
        if (piece.verb && !course.verbs[piece.verb]) errors.push(`${where}: verbo desconhecido ${piece.verb}`);
      } else if (piece.word) {
        if (!hasWord(piece.word)) errors.push(`${where}: palavra fora do conteúdo ${piece.word}`);
      } else if (!piece.reading && /[一-鿿]/.test(piece.text)) {
        errors.push(`${where}: kanji sem leitura em ${piece.text}`);
      }
    }
    if (mustHave && !pieces.some((x) => x.k === 'gap' && mustHave.roles.includes(x.role))) errors.push(`${where}: não treina ${mustHave.id}`);
  };
  for (const p of course.points) {
    check(`${p.id} (exemplo)`, p.example.jp, p);
    if (p.sentences.length < 3) errors.push(`${p.id}: precisa de pelo menos 3 frases`);
    p.sentences.forEach((s, i) => check(`${p.id}#${i}`, s.jp, p));
  }
  return errors;
}

// ───────── Save ─────────

export interface GramaticaSave {
  /** Quantos pontos já estão destravados, na ordem do curso. Começa em 1. */
  unlocked: number;
  /** Encaixes de primeira, sem dica, por ponto. Destrava o próximo. */
  wins: Record<string, number>;
  rounds: number;
  best: number;
}

export function emptyGramaticaSave(): GramaticaSave {
  return { unlocked: 1, wins: {}, rounds: 0, best: 0 };
}

const isCount = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;

/** Devolve o save do Kumitate dentro de `games`, criando ou consertando o que faltar. Sempre o mesmo objeto. */
export function ensureGramaticaSave(games: Record<string, unknown>): GramaticaSave {
  const current = games.gramatica;
  if (typeof current !== 'object' || current === null || Array.isArray(current)) {
    const base = emptyGramaticaSave();
    games.gramatica = base;
    return base;
  }
  const save = current as Record<string, unknown>;
  save.unlocked = isCount(save.unlocked) && save.unlocked >= 1 ? Math.floor(save.unlocked) : 1;
  const wins = save.wins;
  const clean: Record<string, number> = {};
  if (typeof wins === 'object' && wins !== null && !Array.isArray(wins)) {
    for (const [k, v] of Object.entries(wins)) if (isCount(v)) clean[k] = v;
  }
  save.wins = clean;
  for (const k of ['rounds', 'best'] as const) if (!isCount(save[k])) save[k] = 0;
  return save as unknown as GramaticaSave;
}

/** Encaixes limpos de um ponto para abrir o seguinte. */
export const WINS_TO_UNLOCK = 3;
export const ROUND_SIZE = 6;
/** No máximo tantos buracos abertos por frase. */
export const MAX_OPEN = 3;
/** Peças na bandeja (a certa e as que confundem). */
export const TRAY_SIZE = 4;
/** Depois de tantas peças que não serviram, a certa brilha. */
export const HINT_AFTER = 2;
export const FAST_MS = 3000;
export const SCORE_FIT = 10;
export const SCORE_FAST = 5;
export const XP_FIT = 2;
export const XP_SENTENCE = 3;
export const XP_ROUND = 10;
export const COINS_ROUND = 5;

/** Pontos que entram no sorteio: os destravados. */
export function openPoints(course: Course, save: GramaticaSave): Point[] {
  return course.points.slice(0, Math.min(save.unlocked, course.points.length));
}

// ───────── Rodada ─────────

export interface Slot {
  role: Role;
  verb?: Verb;
  /** Fechado = já vem preenchido (ponto que o jogador ainda não viu). */
  open: boolean;
  filled: Block | null;
  /** Peças que o jogador tentou e não serviram. */
  tried: Block[];
  tray: Block[];
  /** A peça certa brilha (primeiro contato ou depois de duas tentativas). */
  hint: boolean;
  /** Tempo até encaixar, em ms. */
  ms?: number;
}

export type ShownPiece =
  | { k: 'text'; text: string; reading?: string; gloss?: string }
  | { k: 'slot'; slot: number };

export interface Puzzle {
  point: Point;
  /** Primeiro contato com o ponto: veio de uma lição e a peça certa brilha. */
  teach: boolean;
  pt: string;
  pieces: ShownPiece[];
  slots: Slot[];
  /** Explicação da última peça que voltou. */
  why: { block: Block; text: string } | null;
}

export type RoundEvent =
  | { t: 'fit'; block: Block; fast: boolean; combo: number }
  | { t: 'bounce'; block: Block; why: string }
  | { t: 'solved'; plain: string }
  | { t: 'unlock'; point: Point }
  | { t: 'levelup'; level: number }
  | { t: 'end'; summary: RoundSummary };

export interface RoundSummary {
  sentences: number;
  /** Buracos encaixados de primeira. */
  clean: number;
  gaps: number;
  score: number;
  bestCombo: number;
  learned: Point[];
  unlocked: Point[];
  xp: number;
  coins: number;
  record: boolean;
}

export interface RoundDeps {
  course: Course;
  cards: Record<string, CardState>;
  profile: Profile;
  save: GramaticaSave;
  lookup: (id: string) => { pt: string } | undefined;
  now: () => number;
  rng: Rng;
  /**
   * Missão da Jornada: só estes pontos, destravados ou não (na Jornada nada fica
   * trancado). Ponto ainda não visto chega com a lição, como sempre.
   */
  focus?: readonly string[];
}

/** Pontos da rodada: os da missão da Jornada, se houver; senão os destravados. */
export function roundPoints(course: Course, save: GramaticaSave, focus?: readonly string[]): Point[] {
  const doFoco = focus ? course.points.filter((p) => focus.includes(p.id)) : [];
  return doFoco.length > 0 ? doFoco : openPoints(course, save);
}

export type Phase = 'lesson' | 'build' | 'solved' | 'end';

/** Uma rodada de `ROUND_SIZE` frases. */
export class GramaticaRound {
  phase: Phase = 'build';
  puzzle!: Puzzle;
  /** Frase atual (0 a ROUND_SIZE-1). */
  index = 0;
  score = 0;
  combo = 0;
  summary: RoundSummary | null = null;

  private activeSince: number;
  private readonly recentSentences: string[] = [];
  private readonly recentPoints: string[] = [];
  private readonly learned: Point[] = [];
  private readonly unlockedNow: Point[] = [];
  private bestCombo = 0;
  private clean = 0;
  private gaps = 0;
  private xp = 0;

  constructor(private readonly deps: RoundDeps) {
    this.activeSince = deps.now();
    this.load();
  }

  /** Buraco da vez: o primeiro aberto ainda vazio. */
  get active(): number {
    return this.puzzle.slots.findIndex((s) => s.open && s.filled === null);
  }

  get activeSlot(): Slot | undefined {
    return this.puzzle.slots[this.active];
  }

  private load(): void {
    const { course, cards, save, now, rng } = this.deps;
    const pool = roundPoints(course, save, this.deps.focus);
    const pick = pickNext(
      pool.map((p) => cardOf(p.id)),
      cards,
      now(),
      rng,
      { maxYoung: 5, newRatio: 0.5, recent: this.recentPoints.slice(-1) },
    );
    const point = pool.find((p) => pick && cardOf(p.id) === pick.key) ?? (pool[0] as Point);
    this.recentPoints.push(cardOf(point.id));
    const teach = !cards[cardOf(point.id)];
    const choices = point.sentences.filter((s) => !this.recentSentences.includes(s.jp));
    const list = choices.length > 0 ? choices : point.sentences;
    const sentence = list[Math.floor(rng() * list.length)] as { jp: string; pt: string };
    this.recentSentences.push(sentence.jp);
    this.puzzle = this.build(point, sentence, teach);
    this.phase = teach ? 'lesson' : 'build';
    this.activeSince = now();
  }

  /** Ponto já visto (tem carta) ou que é o desta frase. */
  private known(point: Point, target: Point): boolean {
    return point === target || !!this.deps.cards[cardOf(point.id)];
  }

  private build(point: Point, sentence: { jp: string; pt: string }, teach: boolean): Puzzle {
    const { course, lookup, rng } = this.deps;
    const pieces: ShownPiece[] = [];
    const slots: Slot[] = [];
    const raw = parseSentence(sentence.jp);
    // Abre primeiro os buracos do ponto da frase, depois os de pontos já vistos, até MAX_OPEN.
    const gapIdx = raw.flatMap((p, i) => (p.k === 'gap' ? [i] : []));
    const target = gapIdx.filter((i) => point.roles.includes((raw[i] as { role: Role }).role));
    const others = gapIdx.filter((i) => !target.includes(i) && this.known(pointOfRole(course, (raw[i] as { role: Role }).role), point));
    const open = new Set([...target, ...others].slice(0, Math.max(MAX_OPEN, target.length)));

    raw.forEach((p, i) => {
      if (p.k === 'text') {
        const gloss = p.word ? lookup(p.word)?.pt : course.glossary[p.text];
        pieces.push({ k: 'text', text: p.text, reading: p.reading, gloss });
        return;
      }
      const verb = p.verb ? course.verbs[p.verb] : undefined;
      const isOpen = open.has(i);
      const answer = ANSWERS[p.role][0] as Block;
      const slot: Slot = {
        role: p.role,
        verb,
        open: isOpen,
        filled: isOpen ? null : answer,
        tried: [],
        tray: isOpen ? this.tray(p.role, point, rng) : [],
        hint: isOpen && teach && point.roles.includes(p.role),
      };
      pieces.push({ k: 'slot', slot: slots.length });
      slots.push(slot);
    });
    return { point, teach, pt: sentence.pt, pieces, slots, why: null };
  }

  /** A peça certa e algumas que confundem, só da mesma família (partícula ou ponta de verbo). */
  private tray(role: Role, target: Point, rng: Rng): Block[] {
    const { course } = this.deps;
    const family: readonly Block[] = isVerbRole(role) ? ENDINGS : PARTICLES;
    const answers = ANSWERS[role];
    const right = answers.filter((b) => {
      const p = pointOfBlock(course, b);
      return p && this.known(p, target);
    });
    const correct = right.length > 0 ? right : [answers[0] as Block];
    const wrong = family.filter((b) => !answers.includes(b));
    const seen = wrong.filter((b) => {
      const p = pointOfBlock(course, b);
      return p && this.known(p, target);
    });
    // Ainda não tem peça conhecida para confundir: entra a do próximo ponto (a explicação ensina).
    const order = (b: Block) => course.points.findIndex((p) => p.blocks.includes(b));
    const unseen = wrong.filter((b) => !seen.includes(b)).sort((a, b) => order(a) - order(b));
    const shuffled = shuffle(rng, seen);
    const room = TRAY_SIZE - correct.length;
    const distract = shuffled.slice(0, room);
    if (correct.length + distract.length < 2) distract.push(...unseen.slice(0, 2 - correct.length - distract.length));
    return shuffle(rng, [...correct, ...distract]);
  }

  /** Sai da lição e vai montar. */
  begin(): void {
    if (this.phase !== 'lesson') return;
    this.phase = 'build';
    this.activeSince = this.deps.now();
  }

  /** Tenta encaixar a peça da bandeja (pela posição) no buraco da vez. */
  placeAt(trayIndex: number): RoundEvent[] {
    const block = this.activeSlot?.tray[trayIndex];
    return block ? this.place(block) : [];
  }

  place(block: Block): RoundEvent[] {
    if (this.phase !== 'build') return [];
    const slot = this.activeSlot;
    if (!slot || !slot.tray.includes(block) || slot.tried.includes(block)) return [];
    const now = this.deps.now();
    if (!fits(slot.role, block)) {
      slot.tried.push(block);
      if (slot.tried.length >= HINT_AFTER) slot.hint = true;
      const text = whyNot(slot.role, block);
      this.puzzle.why = { block, text };
      this.combo = 0;
      return [{ t: 'bounce', block, why: text }];
    }
    const events: RoundEvent[] = [];
    slot.filled = block;
    slot.ms = now - this.activeSince;
    this.activeSince = now;
    this.puzzle.why = null;
    this.gaps++;
    const clean = slot.tried.length === 0 && !slot.hint;
    let fast = false;
    if (clean) {
      this.clean++;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      fast = slot.ms < FAST_MS;
      this.score += SCORE_FIT + (fast ? SCORE_FAST : 0);
      this.gain(XP_FIT, events);
    } else {
      this.score += Math.floor(SCORE_FIT / 2);
    }
    events.unshift({ t: 'fit', block, fast, combo: this.combo });
    if (this.active < 0) events.push(...this.solve());
    return events;
  }

  /** Frase completa: registra na memória e confere se o próximo ponto destrava. */
  private solve(): RoundEvent[] {
    const { course, cards, save, now } = this.deps;
    const events: RoundEvent[] = [];
    const puzzle = this.puzzle;
    const byPoint = new Map<Point, Slot[]>();
    for (const s of puzzle.slots) {
      if (!s.open) continue;
      const p = pointOfRole(course, s.role);
      byPoint.set(p, [...(byPoint.get(p) ?? []), s]);
    }
    const t = now();
    for (const [p, slots] of byPoint) {
      const key = cardOf(p.id);
      const clean = slots.every((s) => s.tried.length === 0 && !s.hint);
      if (!cards[key]) {
        // Primeiro contato ensina, não cobra.
        cards[key] = review(undefined, { correct: true, hinted: true }, t);
        this.learned.push(p);
      } else {
        const ms = Math.max(...slots.map((s) => s.ms ?? 0));
        cards[key] = review(cards[key], clean ? { correct: true, ms } : { correct: false }, t);
      }
      const wins = slots.filter((s) => s.tried.length === 0 && !s.hint).length;
      if (wins > 0) save.wins[p.id] = (save.wins[p.id] ?? 0) + wins;
    }
    const last = course.points[save.unlocked - 1];
    const next = course.points[save.unlocked];
    if (last && next && (save.wins[last.id] ?? 0) >= WINS_TO_UNLOCK) {
      save.unlocked++;
      this.unlockedNow.push(next);
      events.push({ t: 'unlock', point: next });
    }
    this.gain(XP_SENTENCE, events);
    this.phase = 'solved';
    events.unshift({ t: 'solved', plain: plainSentence(puzzle) });
    return events;
  }

  /** Depois da frase pronta: a próxima ou o fim da rodada. */
  next(): RoundEvent[] {
    if (this.phase !== 'solved') return [];
    this.index++;
    if (this.index >= ROUND_SIZE) return this.finish();
    this.load();
    return [];
  }

  private finish(): RoundEvent[] {
    const { save, profile } = this.deps;
    const events: RoundEvent[] = [];
    save.rounds++;
    const record = this.score > save.best;
    if (record) save.best = this.score;
    const coins = COINS_ROUND + Math.floor(this.score / 25);
    profile.coins += coins;
    this.gain(XP_ROUND, events);
    this.phase = 'end';
    this.summary = {
      sentences: ROUND_SIZE,
      clean: this.clean,
      gaps: this.gaps,
      score: this.score,
      bestCombo: this.bestCombo,
      learned: this.learned,
      unlocked: this.unlockedNow,
      xp: this.xp,
      coins,
      record,
    };
    events.push({ t: 'end', summary: this.summary });
    return events;
  }

  private gain(xp: number, events: RoundEvent[]): void {
    const { profile } = this.deps;
    const before = levelInfo(profile.xp).level;
    profile.xp += xp;
    this.xp += xp;
    const after = levelInfo(profile.xp).level;
    if (after > before) events.push({ t: 'levelup', level: after });
  }
}

/** Texto de uma peça de buraco: a partícula, ou o verbo conjugado (ou ainda na forma de dicionário). */
export function slotWritten(slot: Slot): Written {
  if (slot.verb) return conjugateWritten(slot.verb, slot.filled as Ending | null);
  return { text: '', tail: slot.filled ?? '' };
}

/** A frase como se lê, para a voz. */
export function plainSentence(puzzle: Puzzle): string {
  return puzzle.pieces
    .map((p) => {
      if (p.k === 'text') return p.text;
      const w = slotWritten(puzzle.slots[p.slot] as Slot);
      return w.text + w.tail;
    })
    .join('');
}

/** Exemplo de uma lição já montado, com as peças do ponto marcadas. */
export function exampleView(course: Course, point: Point): (Written & { mark: boolean })[] {
  return parseSentence(point.example.jp).map((p) => {
    if (p.k === 'text') return { text: p.reading ? p.text : '', reading: p.reading, tail: p.reading ? '' : p.text, mark: false };
    const answer = ANSWERS[p.role][0] as Block;
    const mark = point.roles.includes(p.role);
    if (p.verb) return { ...conjugateWritten(course.verbs[p.verb] as Verb, answer as Ending), mark };
    return { text: '', tail: answer, mark };
  });
}
