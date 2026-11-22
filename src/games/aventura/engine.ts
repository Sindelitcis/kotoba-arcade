/**
 * Regras da Aventura, sem tela. Uma cena é um grafo de nós: narração, fala de
 * alguém e escolha. Não existe resposta "errada": cada opção leva a uma reação
 * (a pessoa entende, estranha ou repete) e a história segue. O que o jogador
 * entendeu ou não vai para a memória espaçada, a mesma dos outros jogos.
 *
 * As cenas ficam em `cenas/`, só dados. Aqui não entra texto de história.
 *
 * Ensinar antes de cobrar (core/ensino.ts): antes da primeira fala, as palavras novas da
 * cena são apresentadas com calma (`apresentando`). Palavra que ainda está em prática
 * aparece com leitura e significado por cima. Palavra nova que sobrou da apresentação é
 * apresentada ali mesmo, na fala, e só conta nota numa passada seguinte.
 */
import { cardKey, type Word } from '../../content';
import { hasKanji, isKana } from '../../core/kana';
import { levelInfo } from '../../core/progress';
import type { Profile } from '../../core/save';
import { apresentar, avaliar, foiApresentado, itemDe, NOVOS_MAX, novidades } from '../../core/ensino';
import { isYoung, retrievability, State, type CardState } from '../../core/srs';

/** `ok`: a pessoa entendeu. `odd`: estranhou. `again`: o jogador pediu para repetir. */
export type Result = 'ok' | 'odd' | 'again';

export interface Option {
  /** Fala do jogador, na marcação de `parseLine`. */
  jp: string;
  pt: string;
  r: Result;
  next: string;
}

export type SceneNode =
  | { kind: 'narra'; pt: string; next: string }
  | { kind: 'fala'; who: string; jp: string; pt: string; next: string }
  /** Com `jp`, alguém pergunta e o jogador responde. Sem `jp`, o jogador puxa a conversa. */
  | { kind: 'escolha'; who?: string; jp?: string; pt: string; options: Option[] };

export interface Scene {
  id: string;
  title: string;
  /** Título em japonês, só kana. */
  jp: string;
  place: string;
  start: string;
  nodes: Record<string, SceneNode>;
}

export interface Speaker {
  name: string;
}

/** Destino que encerra a cena. Nenhum nó pode ter esse nome. */
export const END = 'fim';
export const PLAYER = 'voce';

export const XP_FIRST_TRY = 6;
export const XP_CHOICE = 3;
export const XP_SCENE = 20;
export const COINS_SCENE = 10;
export const COINS_FIRST_TIME = 15;

export type WordLookup = (id: string) => Word | undefined;

export interface Token {
  text: string;
  /** Leitura em kana, só para trechos com kanji. */
  reading?: string;
  /** Id da palavra (`w:...`) que este trecho treina. */
  word?: string;
}

const TOKEN = /\[([^\]|]*)\|([^\]|]*)(?:\|([^\]|]*))?\]/g;

/**
 * Marcação das falas: `[texto|leitura|palavra]`.
 * `[駅|えき|=]` treina a palavra 駅; `[きました||来る]` é kana que treina 来る;
 * `[成田|なりた]` só mostra a leitura, sem carta. Fora dos colchetes é texto comum.
 */
export function parseLine(markup: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of markup.matchAll(TOKEN)) {
    if (m.index > last) out.push({ text: markup.slice(last, m.index) });
    const text = m[1] as string;
    const token: Token = { text };
    if (m[2]) token.reading = m[2];
    if (m[3]) token.word = `w:${m[3] === '=' ? text : m[3]}`;
    out.push(token);
    last = m.index + m[0].length;
  }
  if (last < markup.length) out.push({ text: markup.slice(last) });
  return out;
}

/** Texto para a voz: sem marcação e sem os espaços que separam as palavras na tela. */
export function plainText(tokens: readonly { text: string }[]): string {
  return tokens.map((t) => t.text).join('').replace(/\s+/g, '');
}

/**
 * Quanta ajuda uma palavra recebe sem o jogador pedir.
 * `full`: nunca vista, aparece com leitura e significado.
 * `reading`: ainda não firmou, fica só a leitura em cima do kanji.
 * `none`: firme na memória, texto limpo.
 */
export type Help = 'full' | 'reading' | 'none';

export function helpLevel(card: CardState | undefined): Help {
  // Nunca vista, ou apresentada e ainda não usada: leitura e significado na tela.
  if (!card || card.state === State.New) return 'full';
  return isYoung(card) ? 'reading' : 'none';
}

export interface TokenView {
  text: string;
  reading?: string;
  word?: Word;
  help: Help;
}

export function lineView(markup: string, cards: Readonly<Record<string, CardState>>, lookup: WordLookup): TokenView[] {
  return parseLine(markup).map((t) => {
    const word = t.word ? lookup(t.word) : undefined;
    // Trecho com leitura e sem carta (nome de lugar, preço) nunca perde o furigana.
    const help: Help = word ? helpLevel(cards[cardKey(word.id, 'meaning')]) : t.reading ? 'reading' : 'none';
    return { text: t.text, reading: t.reading, word, help };
  });
}

export interface AventuraSave {
  /** Cenas concluídas pelo menos uma vez. */
  done: string[];
  /** Frases já vividas, na ordem: `cena/nó` ou `cena/nó/opção`. */
  diary: string[];
  plays: number;
}

export function emptyAventuraSave(): AventuraSave {
  return { done: [], diary: [], plays: 0 };
}

/** Devolve o save da Aventura dentro de `games`, criando ou consertando o que faltar. Sempre o mesmo objeto. */
export function ensureAventuraSave(games: Record<string, unknown>): AventuraSave {
  const current = games.aventura;
  if (typeof current !== 'object' || current === null || Array.isArray(current)) {
    const base = emptyAventuraSave();
    games.aventura = base;
    return base;
  }
  const save = current as Record<string, unknown>;
  for (const k of ['done', 'diary'] as const) {
    const list = save[k];
    save[k] = Array.isArray(list) ? [...new Set(list.filter((x): x is string => typeof x === 'string'))] : [];
  }
  if (typeof save.plays !== 'number' || !Number.isFinite(save.plays)) save.plays = 0;
  return save as unknown as AventuraSave;
}

/** Ids das palavras que uma cena treina, sem repetir. */
export function sceneWords(scene: Scene): string[] {
  const ids = new Set<string>();
  const add = (markup: string | undefined) => {
    if (!markup) return;
    for (const t of parseLine(markup)) if (t.word) ids.add(t.word);
  };
  for (const node of Object.values(scene.nodes)) {
    if (node.kind === 'narra') continue;
    add(node.jp);
    if (node.kind === 'escolha') for (const o of node.options) add(o.jp);
  }
  return [...ids];
}

/** A cena abre quando a anterior foi concluída. */
export function isUnlocked(scenes: readonly Scene[], save: AventuraSave, index: number): boolean {
  if (index < 0 || index >= scenes.length) return false;
  if (index === 0) return true;
  const prev = scenes[index - 1];
  return !!prev && save.done.includes(prev.id);
}

/**
 * Cena que o Enter abre: a próxima da história. Com tudo concluído, a cena
 * cujas palavras estão mais perto de serem esquecidas (rever vivendo de novo).
 */
export function suggestScene(scenes: readonly Scene[], save: AventuraSave, cards: Readonly<Record<string, CardState>>, now: number): Scene | undefined {
  const next = scenes.find((s, i) => !save.done.includes(s.id) && isUnlocked(scenes, save, i));
  if (next) return next;
  let best: Scene | undefined;
  let bestScore = Infinity;
  for (const s of scenes) {
    const words = sceneWords(s);
    if (words.length === 0) continue;
    const score = words.reduce((sum, id) => sum + retrievability(cards[cardKey(id, 'meaning')], now), 0) / words.length;
    if (score < bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best ?? scenes[0];
}

export interface OptionView {
  tokens: TokenView[];
  pt: string;
  r: Result;
  /** Já escolhida nesta visita à cena (a conversa voltou para cá). */
  tried: boolean;
}

/** O que está na tela agora. */
export interface Shown {
  kind: 'narra' | 'fala' | 'escolha';
  who?: string;
  tokens: TokenView[];
  pt: string;
  options: OptionView[];
  /** Texto para a voz. Vazio em narração. */
  plain: string;
  /** O jogador pediu a leitura de tudo nesta fala. */
  reading: boolean;
  /** O jogador pediu o significado nesta fala. */
  meaning: boolean;
}

export interface SceneSummary {
  scene: Scene;
  /** Falas em japonês vividas nesta passada. */
  lines: number;
  choices: number;
  firstTry: number;
  newWords: Word[];
  /** Palavras que travaram a conversa. */
  missed: Word[];
  xp: number;
  coins: number;
  firstTime: boolean;
}

export type PlayEvent =
  | { t: 'result'; r: Result }
  | { t: 'new'; words: Word[] }
  | { t: 'levelup'; level: number }
  | { t: 'end'; summary: SceneSummary };

export interface PlayDeps {
  cards: Record<string, CardState>;
  profile: Profile;
  save: AventuraSave;
  lookup: WordLookup;
  now: () => number;
}

/** As palavras que a cena treina, na ordem em que aparecem nos nós. */
export function palavrasDaCena(scene: Scene): string[] {
  const ids: string[] = [];
  for (const n of Object.values(scene.nodes)) {
    const falas = n.kind === 'narra' ? [] : [n.jp ?? '', ...(n.kind === 'escolha' ? n.options.map((o) => o.jp) : [])];
    for (const f of falas) for (const t of parseLine(f)) if (t.word && !ids.includes(t.word)) ids.push(t.word);
  }
  return ids;
}

/** Uma passada por uma cena. */
export class ScenePlay {
  nodeId: string;
  shown: Shown;
  /** Muda a cada troca do que está na tela (a tela usa para falar o texto novo). */
  seq = 0;
  finished = false;
  summary: SceneSummary | null = null;
  /** Palavras novas apresentadas antes da primeira fala (a tela mostra enquanto houver). */
  apresentando: string[];

  private shownAt: number;
  /** Depois de escolher, a tela mostra a fala do jogador; este é o nó que vem em seguida. */
  private pending: string | null = null;
  private readonly tried = new Map<string, Set<number>>();
  /** Escolhas em que a conversa travou ou o jogador pediu para repetir. */
  private readonly stumbled = new Set<string>();
  /** Palavras que já ganharam nota boa nesta passada (uma por passada). */
  private readonly credited = new Set<string>();
  private readonly fresh = new Set<string>();
  private readonly missed = new Set<string>();
  private lines = 0;
  private choices = 0;
  private firstTry = 0;
  private xp = 0;

  constructor(
    readonly scene: Scene,
    private readonly deps: PlayDeps,
  ) {
    this.nodeId = scene.start;
    this.shownAt = deps.now();
    const conhecidas = palavrasDaCena(scene).filter((id) => deps.lookup(id));
    this.apresentando = novidades(
      conhecidas.map((id) => cardKey(id, 'meaning')),
      deps.cards,
      { max: NOVOS_MAX },
    ).map(itemDe);
    this.shown = this.build(this.nodeId);
  }

  /** A apresentação acabou: as palavras viram prática e a cena começa. */
  apresentou(): void {
    if (this.apresentando.length === 0) return;
    const now = this.deps.now();
    apresentar(
      this.deps.cards,
      this.apresentando.map((id) => cardKey(id, 'meaning')),
      now,
    );
    for (const id of this.apresentando) {
      this.fresh.add(id);
      this.credited.add(id);
    }
    this.apresentando = [];
    this.shownAt = now;
    this.shown = this.build(this.nodeId);
    this.seq++;
  }

  get awaitingChoice(): boolean {
    return !this.finished && this.apresentando.length === 0 && this.pending === null && this.shown.kind === 'escolha';
  }

  private node(id: string): SceneNode {
    const n = this.scene.nodes[id];
    if (!n) throw new Error(`cena ${this.scene.id}: nó desconhecido "${id}"`);
    return n;
  }

  private view(markup: string | undefined): TokenView[] {
    return markup ? lineView(markup, this.deps.cards, this.deps.lookup) : [];
  }

  private build(id: string): Shown {
    const n = this.node(id);
    const tokens = n.kind === 'narra' ? [] : this.view(n.jp);
    const tried = this.tried.get(id);
    return {
      kind: n.kind,
      who: n.kind === 'narra' ? undefined : n.who,
      tokens,
      pt: n.pt,
      options: n.kind === 'escolha' ? n.options.map((o, i) => ({ tokens: this.view(o.jp), pt: o.pt, r: o.r, tried: !!tried?.has(i) })) : [],
      plain: plainText(tokens),
      reading: false,
      meaning: false,
    };
  }

  private show(shown: Shown): void {
    this.shown = shown;
    this.shownAt = this.deps.now();
    this.seq++;
  }

  /** Mostra a leitura de tudo na fala atual. Conta como ajuda. */
  askReading(): void {
    this.shown.reading = true;
  }

  /** Mostra a tradução da fala atual (e das opções). Conta como ajuda. */
  askMeaning(): void {
    this.shown.meaning = true;
  }

  private wordIds(tokens: readonly TokenView[]): string[] {
    return [...new Set(tokens.flatMap((t) => (t.word ? [t.word.id] : [])))];
  }

  /**
   * Registra na memória o que aconteceu com as palavras de uma fala.
   * Palavra nunca vista só é apresentada ali (com leitura e significado na tela) e não
   * leva nota nesta passada, nem a apresentada antes da cena. Nota boa, uma por palavra
   * por passada.
   */
  private touch(ids: readonly string[], correct: boolean, hinted: boolean, ms?: number): Word[] {
    const { cards, lookup } = this.deps;
    const now = this.deps.now();
    const learned: Word[] = [];
    for (const id of ids) {
      const key = cardKey(id, 'meaning');
      if (!foiApresentado(cards, key)) {
        apresentar(cards, [key], now);
        this.fresh.add(id);
        this.credited.add(id);
        const w = lookup(id);
        if (w) learned.push(w);
      } else if (!correct) {
        if (this.fresh.has(id)) continue;
        avaliar(cards, key, { correct: false }, now);
        this.missed.add(id);
        this.credited.add(id);
      } else if (!this.credited.has(id)) {
        avaliar(cards, key, { correct: true, hinted, ms }, now);
        this.credited.add(id);
      }

    }
    return learned;
  }

  private remember(ref: string): void {
    const { diary } = this.deps.save;
    if (!diary.includes(ref)) diary.push(ref);
  }

  private gain(xp: number, events: PlayEvent[]): void {
    const { profile } = this.deps;
    const before = levelInfo(profile.xp).level;
    profile.xp += xp;
    this.xp += xp;
    const after = levelInfo(profile.xp).level;
    if (after > before) events.push({ t: 'levelup', level: after });
  }

  /** Segue a conversa: passa da narração, da fala ouvida ou da fala que o jogador acabou de dizer. */
  advance(): PlayEvent[] {
    // Com a apresentação na tela, a cena ainda não começou.
    if (this.finished || this.awaitingChoice || this.apresentando.length > 0) return [];
    const events: PlayEvent[] = [];
    let next: string;
    if (this.pending !== null) {
      next = this.pending;
      this.pending = null;
    } else {
      const n = this.node(this.nodeId);
      if (n.kind === 'escolha') return [];
      if (n.kind === 'fala') {
        const asked = this.shown.reading || this.shown.meaning;
        const learned = this.touch(this.wordIds(this.shown.tokens), true, asked);
        if (learned.length > 0) events.push({ t: 'new', words: learned });
        this.remember(`${this.scene.id}/${this.nodeId}`);
        this.lines++;
      }
      next = n.next;
    }
    if (next === END) return [...events, ...this.finish()];
    this.nodeId = next;
    this.show(this.build(next));
    return events;
  }

  /** Escolhe uma fala. A reação vem pelo próximo nó, nunca por uma tela de erro. */
  choose(index: number): PlayEvent[] {
    if (!this.awaitingChoice) return [];
    const n = this.node(this.nodeId);
    if (n.kind !== 'escolha') return [];
    const opt = n.options[index];
    const view = this.shown.options[index];
    if (!opt || !view) return [];
    const events: PlayEvent[] = [{ t: 'result', r: opt.r }];
    const ref = `${this.scene.id}/${this.nodeId}`;
    const ms = this.deps.now() - this.shownAt;
    const asked = this.shown.reading || this.shown.meaning;
    const heard = this.wordIds(this.shown.tokens);
    const said = this.wordIds(view.tokens);

    let set = this.tried.get(this.nodeId);
    if (!set) this.tried.set(this.nodeId, (set = new Set()));
    set.add(index);

    let learned: Word[] = [];
    if (opt.r === 'ok') {
      const clean = !asked && !this.stumbled.has(this.nodeId);
      learned = this.touch([...heard, ...said], true, !clean, clean ? ms : undefined);
      if (n.jp) {
        this.remember(ref);
        this.lines++;
      }
      this.remember(`${ref}/${index}`);
      this.lines++;
      this.choices++;
      if (clean) this.firstTry++;
      this.gain(clean ? XP_FIRST_TRY : XP_CHOICE, events);
    } else {
      // Estranhou: o que não foi entendido é a pergunta; se foi o jogador que puxou a conversa, a própria fala.
      if (opt.r === 'odd') learned = this.touch(n.jp ? heard : said, false, false);
      else learned = this.touch(heard, true, true);
      this.stumbled.add(this.nodeId);
    }
    if (learned.length > 0) events.push({ t: 'new', words: learned });

    this.pending = opt.next;
    this.show({ kind: 'fala', who: PLAYER, tokens: view.tokens, pt: opt.pt, options: [], plain: plainText(view.tokens), reading: false, meaning: false });
    return events;
  }

  private finish(): PlayEvent[] {
    const { save, profile, lookup } = this.deps;
    const events: PlayEvent[] = [];
    const firstTime = !save.done.includes(this.scene.id);
    if (firstTime) save.done.push(this.scene.id);
    save.plays++;
    const coins = COINS_SCENE + (firstTime ? COINS_FIRST_TIME : 0);
    profile.coins += coins;
    this.gain(XP_SCENE, events);
    const words = (ids: Iterable<string>) => [...ids].flatMap((id) => lookup(id) ?? []);
    this.finished = true;
    this.summary = {
      scene: this.scene,
      lines: this.lines,
      choices: this.choices,
      firstTry: this.firstTry,
      newWords: words(this.fresh),
      missed: words(this.missed),
      xp: this.xp,
      coins,
      firstTime,
    };
    events.push({ t: 'end', summary: this.summary });
    return events;
  }
}

export interface DiaryEntry {
  ref: string;
  scene: Scene;
  who: string;
  tokens: TokenView[];
  pt: string;
  plain: string;
}

/** Frases do diário, na ordem em que foram vividas. Referência que não existe mais nas cenas é ignorada. */
export function diaryEntries(scenes: readonly Scene[], save: AventuraSave, cards: Readonly<Record<string, CardState>>, lookup: WordLookup): DiaryEntry[] {
  const out: DiaryEntry[] = [];
  for (const ref of save.diary) {
    const [sceneId, nodeId, opt] = ref.split('/');
    const scene = scenes.find((s) => s.id === sceneId);
    const node = scene && nodeId ? scene.nodes[nodeId] : undefined;
    if (!scene || !node || node.kind === 'narra') continue;
    let who = node.who ?? PLAYER;
    let jp = node.jp;
    let pt = node.pt;
    if (opt !== undefined) {
      const option = node.kind === 'escolha' ? node.options[Number(opt)] : undefined;
      if (!option) continue;
      who = PLAYER;
      jp = option.jp;
      pt = option.pt;
    }
    if (!jp) continue;
    const tokens = lineView(jp, cards, lookup);
    out.push({ ref, scene, who, tokens, pt, plain: plainText(tokens) });
  }
  return out;
}

/**
 * Confere os dados das cenas. Devolve a lista de problemas (vazia = tudo certo).
 * É o que segura erro de digitação em cena nova antes de chegar ao jogador.
 */
export function validateScenes(scenes: readonly Scene[], speakers: Readonly<Record<string, Speaker>>, lookup: WordLookup): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();

  const checkLine = (where: string, markup: string) => {
    if (markup.trim() === '') problems.push(`${where}: fala vazia`);
    for (const t of parseLine(markup)) {
      const isToken = t.reading !== undefined || t.word !== undefined;
      if (!isToken) {
        if (/[[\]|]/.test(t.text)) problems.push(`${where}: marcação quebrada em "${t.text}"`);
        if (hasKanji(t.text)) problems.push(`${where}: kanji sem leitura em "${t.text}"`);
        continue;
      }
      if (t.text === '') problems.push(`${where}: trecho marcado sem texto`);
      if (hasKanji(t.text) && !t.reading) problems.push(`${where}: "${t.text}" tem kanji e não tem leitura`);
      if (t.reading !== undefined && !isKana(t.reading)) problems.push(`${where}: leitura de "${t.text}" não está em kana ("${t.reading}")`);
      if (t.reading !== undefined && !hasKanji(t.text)) problems.push(`${where}: "${t.text}" já é kana e não precisa de leitura`);
      if (t.word) {
        const w = lookup(t.word);
        if (!w) problems.push(`${where}: palavra desconhecida "${t.word}"`);
        else if (!isKana(w.kana)) problems.push(`${where}: a palavra "${t.word}" não tem leitura em kana`);
      }
    }
  };

  for (const scene of scenes) {
    const at = `cena ${scene.id}`;
    if (ids.has(scene.id)) problems.push(`${at}: id repetido`);
    ids.add(scene.id);
    if (scene.id.includes('/')) problems.push(`${at}: id não pode ter "/"`);
    if (!isKana(scene.jp)) problems.push(`${at}: título em japonês precisa ser kana`);
    if (!scene.nodes[scene.start]) problems.push(`${at}: começo "${scene.start}" não existe`);
    if (scene.nodes[END]) problems.push(`${at}: "${END}" é reservado para o final`);

    const targets = (n: SceneNode): string[] => (n.kind === 'escolha' ? n.options.map((o) => o.next) : [n.next]);

    for (const [id, n] of Object.entries(scene.nodes)) {
      const where = `${at}, nó ${id}`;
      if (id.includes('/')) problems.push(`${where}: nome não pode ter "/"`);
      if (n.pt.trim() === '') problems.push(`${where}: falta o texto em português`);
      if (n.kind !== 'narra' && n.who !== undefined && n.who !== PLAYER && !speakers[n.who]) problems.push(`${where}: personagem desconhecido "${n.who}"`);
      if (n.kind === 'fala') checkLine(where, n.jp);
      if (n.kind === 'escolha') {
        if (n.jp !== undefined) checkLine(where, n.jp);
        if (n.jp !== undefined && !n.who) problems.push(`${where}: pergunta sem personagem`);
        if (n.options.length < 2) problems.push(`${where}: escolha precisa de pelo menos duas opções`);
        if (!n.options.some((o) => o.r === 'ok')) problems.push(`${where}: nenhuma opção faz a conversa andar`);
        n.options.forEach((o, i) => {
          checkLine(`${where}, opção ${i + 1}`, o.jp);
          if (o.pt.trim() === '') problems.push(`${where}, opção ${i + 1}: falta o texto em português`);
          if (o.r !== 'ok' && o.next === END) problems.push(`${where}, opção ${i + 1}: a cena não pode acabar num desentendimento`);
        });
      }
      for (const t of targets(n)) {
        if (t !== END && !scene.nodes[t]) problems.push(`${where}: leva para "${t}", que não existe`);
      }
    }

    // Todo nó precisa ser alcançável a partir do começo...
    const seen = new Set<string>();
    const queue = scene.nodes[scene.start] ? [scene.start] : [];
    while (queue.length > 0) {
      const id = queue.pop() as string;
      if (seen.has(id)) continue;
      seen.add(id);
      const n = scene.nodes[id];
      if (n) for (const t of targets(n)) if (t !== END && scene.nodes[t]) queue.push(t);
    }
    for (const id of Object.keys(scene.nodes)) if (!seen.has(id)) problems.push(`${at}, nó ${id}: ninguém chega aqui`);

    // ...e de todo nó tem que dar para chegar ao final.
    const exits = new Set<string>();
    let grew = true;
    while (grew) {
      grew = false;
      for (const [id, n] of Object.entries(scene.nodes)) {
        if (exits.has(id)) continue;
        if (targets(n).some((t) => t === END || exits.has(t))) {
          exits.add(id);
          grew = true;
        }
      }
    }
    for (const id of Object.keys(scene.nodes)) if (!exits.has(id)) problems.push(`${at}, nó ${id}: sem saída até o final`);
  }
  return problems;
}
