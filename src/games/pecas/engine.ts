/**
 * Kanji em peças: regras puras. A tela (PecasGame.tsx) só mostra o que a rodada decide.
 *
 * Cinco modos, do mais fácil ao mais denso:
 * 1. peca      ver o kanji e achar a peça que está nele;
 * 2. montar    juntar as peças do kanji pedido pelo significado;
 * 3. intruso   achar o kanji diferente no meio de vários parecidos (未/末, 土/士);
 * 4. adivinhar adivinhar o significado de um kanji pelas peças, com o nome delas na tela;
 * 5. composto  ler uma palavra de dois kanji, com a ajuda das peças e da leitura de cada um.
 *
 * Regras de TDAH do fliperama: kanji novo chega com lição antes de ser cobrado (ou com as
 * peças nomeadas, no modo 4), errar só mostra a resposta, e não há vida nem tempo.
 *
 * Ensinar antes de cobrar (core/ensino.ts): a lição apresenta o kanji. No modo 4 e nas
 * palavras de dois kanji, a própria tela (as peças com o nome, a leitura de cada kanji) é a
 * apresentação, e a pergunta já nasce como prática. Enquanto o kanji está em prática, errar
 * não zera o combo nem tira pontos.
 */
import { cardKey, type Skill } from '../../content';
import { LEITURAS } from '../../content/leituras';
import { pickNext } from '../../core/picker';
import { levelInfo } from '../../core/progress';
import { shuffle, type Rng } from '../../core/rng';
import type { Profile } from '../../core/save';
import { apresentar, avaliar, emPratica, foiApresentado, notaDaPratica } from '../../core/ensino';
import { masteryLevel, type CardState } from '../../core/srs';
import { KANJI_PECAS, kanjiPeca, PARECIDOS, type KanjiPeca } from './dados';

export type Modo = 'peca' | 'montar' | 'intruso' | 'adivinhar' | 'composto';

export const MODOS: readonly { id: Modo; tecla: string; nome: string; texto: string }[] = [
  { id: 'peca', tecla: '1', nome: 'Achar a peça', texto: 'Veja o kanji e ache a peça que está nele.' },
  { id: 'montar', tecla: '2', nome: 'Montar', texto: 'Junte as peças do kanji pedido.' },
  { id: 'intruso', tecla: '3', nome: 'Intruso', texto: 'Ache o kanji diferente no meio dos parecidos.' },
  { id: 'adivinhar', tecla: '4', nome: 'Adivinhar', texto: 'Diga o significado de um kanji novo pelas peças.' },
  { id: 'composto', tecla: '5', nome: 'Palavras', texto: 'Leia palavras de dois kanji pelas peças.' },
];

/** Perguntas por rodada: curta, para caber numa pausa. */
export const ROUND_SIZE = 8;
export const PONTOS_ACERTO = 10;
export const PONTOS_RAPIDO = 5;
/** Resposta em menos que isso conta como rápida. */
export const RAPIDO_MS = 3000;
/** Peças erradas no modo montar até a certa brilhar. */
export const ERROS_ATE_BRILHAR = 2;
export const XP_ACERTO = 3;
export const XP_RODADA = 10;
/** Kanji "jovens" ao mesmo tempo antes de parar de trazer novidade. */
export const MAX_JOVENS = 6;

const PECAS_SKILL: Skill = 'pecas';

/** Carta deste jogo para um kanji. Mesmo item (`k:休`) dos outros jogos, habilidade própria. */
export function cartaPecas(k: KanjiPeca): string {
  return cardKey(k.id, PECAS_SKILL);
}

export function cartaSignificado(k: KanjiPeca): string {
  return cardKey(k.id, 'meaning');
}

export function cartaComposto(c: Composto): string {
  return cardKey(`w:${c.jp}`, 'reading');
}

// ---------------------------------------------------------------- save

export interface PecasSave {
  rounds: number;
  /** Melhor pontuação numa rodada. */
  best: number;
  /** Maior combo já feito. */
  bestCombo: number;
}

function isCount(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0;
}

export function ensurePecasSave(games: Record<string, unknown>): PecasSave {
  const current = games.pecas;
  if (typeof current !== 'object' || current === null || Array.isArray(current)) {
    const base: PecasSave = { rounds: 0, best: 0, bestCombo: 0 };
    games.pecas = base;
    return base;
  }
  const save = current as Record<string, unknown>;
  for (const k of ['rounds', 'best', 'bestCombo'] as const) if (!isCount(save[k])) save[k] = 0;
  return save as unknown as PecasSave;
}

// ---------------------------------------------------------------- dados derivados

export interface Composto {
  jp: string;
  kana: string;
  pt: string;
  kanji: [KanjiPeca, KanjiPeca];
}

/** Palavras de exemplo com exatamente dois kanji, os dois do jogo. */
export const COMPOSTOS: readonly Composto[] = (() => {
  const out = new Map<string, Composto>();
  for (const k of KANJI_PECAS) {
    const chars = [...k.palavra.jp];
    if (chars.length !== 2) continue;
    const a = kanjiPeca(chars[0] as string);
    const b = kanjiPeca(chars[1] as string);
    if (a && b && !out.has(k.palavra.jp)) out.set(k.palavra.jp, { ...k.palavra, kanji: [a, b] });
  }
  return [...out.values()];
})();

/** Formas da mesma peça. Uma nunca entra como alternativa errada quando a outra está no kanji. */
export const VARIANTES: readonly string[] = ['亻人', '氵水', '扌手才', '忄心', '礻示', '衤', '刂刀', '⺨犬', '灬火', '飠食', '王玉主', '⻖⻏', '月肉', '⺌⺍小', '耂老', '龰足疋', '⺕', '罒', '艹', '冫', '攵', '⺤'];

/** Peças pequenas demais (um traço) para servir de alternativa errada: aparecem em quase tudo. */
const MIUDAS = new Set(['一', '丨', '丿', '丶', '乙', '亅', '二', '八', '十', '口', '儿', '亠', '冖', '凵', '匕', '几', '厶', '又', '卜', '乂', '丁', '七', '九', '人', '入']);

function variantesDe(p: string): string[] {
  const g = VARIANTES.find((v) => v.includes(p));
  return g ? [...g] : [p];
}

/** Uma peça ainda pode confundir com o kanji? (está nele, é forma dela, ou é miúda). */
function serveDeErrada(p: string, k: KanjiPeca, elementos: readonly string[]): boolean {
  if (MIUDAS.has(p) || p === k.kanji) return false;
  const dentro = new Set([...k.pecas, ...elementos].flatMap(variantesDe));
  return !dentro.has(p) && ![...p].some((c) => dentro.has(c));
}

const TODAS_PECAS = [...new Set(KANJI_PECAS.flatMap((k) => k.pecas))];

/** Peças com mais de um uso: são as que vale a pena treinar. */
export function pecasDoKanji(k: KanjiPeca): string[] {
  return [...new Set(k.pecas)].filter((p) => p !== k.kanji);
}

// ---------------------------------------------------------------- perguntas

interface Base {
  /** O kanji que a rodada escolheu (a carta revisada). */
  k: KanjiPeca;
  /** Primeiro contato: veio com lição antes. */
  licao: boolean;
}

export type Pergunta =
  | (Base & { modo: 'peca'; alvo: string; opcoes: string[]; certa: number })
  | (Base & { modo: 'montar'; bandeja: string[]; precisa: string[]; colocadas: string[]; erros: number; brilha: number | null })
  | (Base & { modo: 'intruso'; maioria: KanjiPeca; diferente: KanjiPeca; grade: string[]; certa: number; diferenca: string })
  | (Base & { modo: 'adivinhar'; opcoes: string[]; certa: number })
  | (Base & { modo: 'composto'; palavra: Composto; opcoes: string[]; certa: number });

export type Evento =
  | { t: 'acerto'; combo: number; rapido: boolean }
  | { t: 'erro' }
  | { t: 'encaixe'; combo: number }
  | { t: 'volta'; peca: string }
  | { t: 'pronto'; combo: number }
  | { t: 'levelup'; level: number }
  | { t: 'fim'; resumo: Resumo };

export interface Resumo {
  perguntas: number;
  acertos: number;
  pontos: number;
  melhorCombo: number;
  /** Kanji vistos pela primeira vez nesta rodada. */
  novos: string[];
  xp: number;
  recorde: boolean;
}

export type Fase = 'licao' | 'pergunta' | 'revela' | 'fim';

export interface Deps {
  cards: Record<string, CardState>;
  save: PecasSave;
  profile: Profile;
  now: () => number;
  rng: Rng;
  /** Todas as peças que o KanjiVG marca dentro do kanji, em qualquer nível (vem de tracos.json). */
  elementos: (kanji: string) => readonly string[];
  /** Modo fixo, ou misto (a rodada escolhe pelo que você já sabe). */
  modo?: Modo | 'misto';
}

const contar = <T>(lista: readonly T[], p: (x: T) => boolean) => lista.reduce((n, x) => n + (p(x) ? 1 : 0), 0);

export class PecasRound {
  fase: Fase = 'pergunta';
  pergunta!: Pergunta;
  /** Número da pergunta (0 a ROUND_SIZE-1). */
  indice = 0;
  combo = 0;
  melhorCombo = 0;
  pontos = 0;
  acertos = 0;
  xp = 0;
  /** Resposta dada na pergunta atual (índice), para a tela marcar. */
  escolhida: number | null = null;
  acertou = false;
  novos: string[] = [];
  resumo: Resumo | null = null;
  private recentes: string[] = [];
  private inicio = 0;

  constructor(private readonly deps: Deps) {
    this.montarPergunta();
  }

  get modo(): Modo | 'misto' {
    return this.deps.modo ?? 'misto';
  }

  // ------------------------------------------------ escolha do kanji e do modo

  private visto(k: KanjiPeca): boolean {
    return !!this.deps.cards[cartaPecas(k)];
  }

  /** Peças conhecidas: estão em algum kanji já visto, ou são elas mesmas um kanji visto. */
  private conhecidas(): Set<string> {
    const out = new Set<string>();
    for (const k of KANJI_PECAS) {
      if (!this.visto(k)) continue;
      out.add(k.kanji);
      for (const p of k.pecas) out.add(p);
    }
    return out;
  }

  pecaConhecida(p: string): boolean {
    return this.conhecidas().has(p);
  }

  /** Dá para adivinhar pelas peças: duas ou mais peças, todas já conhecidas. */
  adivinhavel(k: KanjiPeca): boolean {
    return this.adivinhavelCom(k, this.conhecidas());
  }

  private adivinhavelCom(k: KanjiPeca, conhecidas: ReadonlySet<string>): boolean {
    const ps = pecasDoKanji(k);
    return ps.length >= 2 && ps.every((p) => conhecidas.has(p));
  }

  private viavel(m: Modo, k: KanjiPeca): boolean {
    switch (m) {
      case 'peca':
        return pecasDoKanji(k).length >= 1;
      case 'montar':
        return pecasDoKanji(k).length >= 2;
      case 'intruso':
        return this.paresConhecidos(k).length > 0;
      case 'adivinhar':
        return true;
      case 'composto':
        return COMPOSTOS.some((c) => c.kanji.includes(k) && this.compostoPronto(c));
    }
  }

  /**
   * Palavra de dois kanji que já pode virar pergunta: apresentada antes (no KanjiMon, na Jornada,
   * em qualquer jogo) e com os dois kanji já vistos aqui. A leitura dentro da palavra pode mudar
   * (学生 é がくせい), então adivinhar pela leitura dos kanji seria cobrar o que ninguém ensinou.
   */
  private compostoPronto(c: Composto): boolean {
    return foiApresentado(this.deps.cards, cartaComposto(c)) && c.kanji.every((x) => this.visto(x));
  }

  /** Pares de parecidos do kanji em que o outro kanji também já foi visto. */
  private paresConhecidos(k: KanjiPeca): (typeof PARECIDOS)[number][] {
    return PARECIDOS.filter((p) => {
      if (p.a !== k.kanji && p.b !== k.kanji) return false;
      const outro = kanjiPeca(p.a === k.kanji ? p.b : p.a);
      return !!outro && this.visto(outro);
    });
  }

  private escolherKanji(filtro: (k: KanjiPeca) => boolean): KanjiPeca {
    const { cards, now, rng } = this.deps;
    const lista = KANJI_PECAS.filter(filtro);
    const base = lista.length > 0 ? lista : KANJI_PECAS;
    const pool = base.map(cartaPecas);
    const pick = pickNext(pool, cards, now(), rng, { recent: this.recentes, maxYoung: MAX_JOVENS });
    // Kanji novo (com lição) quando não há o que praticar, quando só sobrou o que acabou de
    // aparecer, ou às vezes no meio das revisões; com três ainda em prática, espera.
    const novo = base.find((k) => !this.visto(k));
    const praticando = pool.filter((k) => this.deps.cards[k] && emPratica(cards, k)).length;
    const repetiria = !!pick && this.recentes.includes(pick.key);
    const cabeNovo = !!novo && praticando < 3 && (!pick || pick.reason === 'practice' || repetiria || rng() < 0.3);
    const key = cabeNovo && novo ? cartaPecas(novo) : (pick?.key ?? (pool[0] as string));
    this.recentes = [...this.recentes, key].slice(-4);
    return kanjiPeca(key.slice(2, key.lastIndexOf('#'))) as KanjiPeca;
  }

  private montarPergunta(): void {
    const { cards, rng } = this.deps;
    const modo = this.modo;
    this.escolhida = null;
    this.acertou = false;

    if (modo === 'composto') return this.perguntaComposto();
    if (modo === 'adivinhar') {
      // Kanji ainda não visto, de preferência com todas as peças conhecidas.
      const ineditos = KANJI_PECAS.filter((k) => !this.visto(k) && pecasDoKanji(k).length >= 2);
      const conhecidas = this.conhecidas();
      const bons = ineditos.filter((k) => this.adivinhavelCom(k, conhecidas));
      const lista = bons.length > 0 ? bons : ineditos;
      const k = lista.length > 0 ? (lista[Math.floor(rng() * Math.min(lista.length, 5))] as KanjiPeca) : this.escolherKanji(() => true);
      // Só dá para adivinhar sem lição quando as peças já são conhecidas.
      return this.perguntaAdivinhar(k, !this.visto(k) && !this.adivinhavelCom(k, conhecidas));
    }
    if (modo !== 'misto') {
      const k = this.escolherKanji((x) => this.viavel(modo, x));
      // Treino de um modo que ainda não dá (intruso sem o par visto): fica no "achar a peça".
      return this.abrir(k, this.viavel(modo, k) ? modo : 'peca');
    }

    const k = this.escolherKanji(() => true);
    if (!this.visto(k)) {
      // Novidade: com as peças todas conhecidas, adivinha pelas peças; senão, lição antes.
      if (this.adivinhavel(k)) return this.perguntaAdivinhar(k, false);
      return this.abrir(k, pecasDoKanji(k).length >= 1 ? 'peca' : 'adivinhar');
    }
    const nivel = masteryLevel(cards[cartaPecas(k)]);
    const candidatos: Modo[] = nivel <= 1 ? ['peca', 'adivinhar'] : nivel === 2 ? ['montar', 'peca'] : ['montar', 'intruso', 'composto'];
    const possiveis = candidatos.filter((m) => this.viavel(m, k));
    const m = possiveis.length > 0 ? (possiveis[Math.floor(rng() * possiveis.length)] as Modo) : 'adivinhar';
    return this.abrir(k, m);
  }

  /** Monta a pergunta do modo para o kanji. Kanji nunca visto ganha lição antes (em todos os modos). */
  private abrir(k: KanjiPeca, m: Modo): void {
    const licao = !this.visto(k);
    switch (m) {
      case 'peca':
        this.perguntaPeca(k, licao);
        break;
      case 'montar':
        this.perguntaMontar(k, licao);
        break;
      case 'intruso':
        this.perguntaIntruso(k, licao);
        break;
      case 'adivinhar':
        this.perguntaAdivinhar(k, licao);
        break;
      case 'composto':
        this.perguntaComposto(k);
        break;
    }
  }

  private iniciar(p: Pergunta): void {
    this.pergunta = p;
    this.fase = p.licao ? 'licao' : 'pergunta';
    this.inicio = this.deps.now();
  }

  /**
   * Alternativas erradas de peça: peças que não estão no kanji e que a pessoa já viu (em algum
   * kanji apresentado). Peça nunca vista não entra: com pouca coisa vista, há menos opções.
   */
  private pecasErradas(k: KanjiPeca, n: number): string[] {
    const { rng, elementos } = this.deps;
    const els = elementos(k.kanji);
    const sabe = this.conhecidas();
    return shuffle(rng, TODAS_PECAS.filter((p) => serveDeErrada(p, k, els) && sabe.has(p))).slice(0, n);
  }

  private perguntaPeca(k: KanjiPeca, licao: boolean): void {
    const { rng } = this.deps;
    const ps = pecasDoKanji(k);
    const erradas = this.pecasErradas(k, 3);
    // O primeiro kanji não tem com o que confundir: em vez de uma escolha de uma opção só,
    // a pessoa monta o kanji com as peças que acabou de ver (se ele tiver duas ou mais).
    if (erradas.length === 0 && ps.length >= 2) return this.perguntaMontar(k, licao);
    const alvo = ps[Math.floor(rng() * ps.length)] as string;
    const opcoes = shuffle(rng, [alvo, ...erradas]);
    this.iniciar({ modo: 'peca', k, licao, alvo, opcoes, certa: opcoes.indexOf(alvo) });
  }

  private perguntaMontar(k: KanjiPeca, licao: boolean): void {
    const { rng } = this.deps;
    const precisa = pecasDoKanji(k);
    const bandeja = shuffle(rng, [...precisa, ...this.pecasErradas(k, Math.max(2, 6 - precisa.length))]);
    this.iniciar({ modo: 'montar', k, licao, bandeja, precisa, colocadas: [], erros: 0, brilha: null });
  }

  private perguntaIntruso(k: KanjiPeca, licao = false): void {
    const { rng } = this.deps;
    const pares = this.paresConhecidos(k);
    const par = pares[Math.floor(rng() * pares.length)] as (typeof PARECIDOS)[number];
    const outro = kanjiPeca(par.a === k.kanji ? par.b : par.a) as KanjiPeca;
    // O kanji escolhido é a maioria ou o diferente, sorteado.
    const [maioria, diferente] = rng() < 0.5 ? [k, outro] : [outro, k];
    const certa = Math.floor(rng() * 6);
    const grade = Array.from({ length: 6 }, (_, i) => (i === certa ? diferente.kanji : maioria.kanji));
    this.iniciar({ modo: 'intruso', k, licao, maioria, diferente, grade, certa, diferenca: par.diferenca });
  }

  private perguntaAdivinhar(k: KanjiPeca, licao: boolean): void {
    const { rng } = this.deps;
    const certo = k.pt[0] as string;
    // Alternativas: significados de outros kanji já vistos, sem repetir palavra.
    const usados = new Set([certo, ...k.pt]);
    const outros = shuffle(rng, KANJI_PECAS.filter((x) => x !== k && this.visto(x)))
      .map((x) => x.pt[0] as string)
      .filter((s) => (usados.has(s) ? false : (usados.add(s), true)))
      .slice(0, 3);
    const opcoes = shuffle(rng, [certo, ...outros]);
    this.iniciar({ modo: 'adivinhar', k, licao, opcoes, certa: opcoes.indexOf(certo) });
  }

  private perguntaComposto(k?: KanjiPeca): void {
    const { cards, now, rng } = this.deps;
    const todos = (k ? COMPOSTOS.filter((c) => c.kanji.includes(k)) : COMPOSTOS).filter((c) => this.compostoPronto(c));
    // Nenhuma palavra pronta ainda (treino de compostos logo no começo): fica no kanji.
    if (todos.length === 0) return this.abrir(k ?? this.escolherKanji((x) => this.viavel('peca', x)), 'peca');
    const lista = todos;
    const pool = lista.map(cartaComposto);
    const pick = pickNext(pool, cards, now(), rng, { recent: this.recentes, maxYoung: MAX_JOVENS });
    // Palavra nova: de preferência uma com os dois kanji já vistos.
    const key = pick?.key ?? (pool[0] as string);
    this.recentes = [...this.recentes, key].slice(-4);
    const palavra = lista[pool.indexOf(key)] as Composto;
    const opcoes = shuffle(rng, opcoesDeLeitura(palavra, rng));
    this.iniciar({ modo: 'composto', k: k ?? palavra.kanji[0], licao: false, palavra, opcoes, certa: opcoes.indexOf(palavra.kana) });
  }

  // ------------------------------------------------ jogada

  /** Sai da lição para a pergunta, ou da resposta para a próxima. */
  seguir(): Evento[] {
    if (this.fase === 'licao') {
      apresentar(this.deps.cards, [cartaPecas(this.pergunta.k)], this.deps.now());
      this.fase = 'pergunta';
      this.inicio = this.deps.now();
      return [];
    }
    if (this.fase !== 'revela') return [];
    this.indice++;
    if (this.indice >= ROUND_SIZE) return this.terminar();
    this.montarPergunta();
    return [];
  }

  /** Escolha da alternativa `i` (nos modos de montar, a peça `i` da bandeja). */
  responder(i: number): Evento[] {
    if (this.fase !== 'pergunta') return [];
    const p = this.pergunta;
    if (p.modo === 'montar') return this.colocar(i);
    const total = p.modo === 'intruso' ? p.grade.length : p.opcoes.length;
    if (!Number.isInteger(i) || i < 0 || i >= total) return [];
    this.escolhida = i;
    return this.fechar(i === p.certa);
  }

  private colocar(i: number): Evento[] {
    const p = this.pergunta;
    if (p.modo !== 'montar' || !Number.isInteger(i) || i < 0 || i >= p.bandeja.length) return [];
    const peca = p.bandeja[i] as string;
    if (p.colocadas.includes(peca)) return [];
    if (!p.precisa.includes(peca)) {
      p.erros++;
      if (this.combo > 0 && !this.pratica) this.combo = 0;
      if (p.erros >= ERROS_ATE_BRILHAR) {
        const falta = p.precisa.find((x) => !p.colocadas.includes(x)) as string;
        p.brilha = p.bandeja.indexOf(falta);
      }
      return [{ t: 'volta', peca }];
    }
    p.colocadas.push(peca);
    p.brilha = null;
    if (p.erros >= ERROS_ATE_BRILHAR && p.colocadas.length < p.precisa.length) {
      const falta = p.precisa.find((x) => !p.colocadas.includes(x)) as string;
      p.brilha = p.bandeja.indexOf(falta);
    }
    if (p.colocadas.length < p.precisa.length) return [{ t: 'encaixe', combo: this.combo }];
    return this.fechar(p.erros === 0);
  }

  /** A carta da pergunta da vez ainda está em prática: errar não custa combo nem pontos. */
  get pratica(): boolean {
    const p = this.pergunta;
    if (p.licao) return true;
    return emPratica(this.deps.cards, p.modo === 'composto' ? cartaComposto(p.palavra) : cartaPecas(p.k));
  }

  private fechar(certo: boolean): Evento[] {
    const { cards, now, profile } = this.deps;
    const p = this.pergunta;
    const t = now();
    const ms = t - this.inicio;
    const novo = !this.visto(p.k);
    // Kanji nunca visto no modo 4: as peças com o nome na tela são a apresentação dele.
    if (p.modo === 'adivinhar' && novo) apresentar(cards, [cartaPecas(p.k)], t);
    const pratica = this.pratica;
    const rapido = certo && ms < RAPIDO_MS && !pratica;
    this.acertou = certo;
    this.fase = 'revela';
    const ajuda = p.modo === 'montar' && p.erros >= ERROS_ATE_BRILHAR;
    const outcome = pratica ? notaDaPratica(certo, ms) : { correct: certo, ms, hinted: ajuda };
    if (p.modo === 'composto') {
      avaliar(cards, cartaComposto(p.palavra), outcome, t);
    } else {
      if (novo || p.licao) this.novos.push(p.k.kanji);
      avaliar(cards, cartaPecas(p.k), outcome, t);
      // Montar e adivinhar cobram o significado: a memória de significado é a mesma do KanjiMon.
      if (p.modo === 'montar' || p.modo === 'adivinhar') avaliar(cards, cartaSignificado(p.k), outcome, t);
    }

    const events: Evento[] = [];
    if (certo) {
      this.combo++;
      this.melhorCombo = Math.max(this.melhorCombo, this.combo);
      this.acertos++;
      this.pontos += PONTOS_ACERTO + (rapido ? PONTOS_RAPIDO : 0);
      this.ganhar(XP_ACERTO, events);
      events.unshift(p.modo === 'montar' ? { t: 'pronto', combo: this.combo } : { t: 'acerto', combo: this.combo, rapido });
    } else {
      if (!pratica) this.combo = 0;
      // Montar com erro no meio ainda termina o kanji: vale metade (na prática, inteiro).
      if (p.modo === 'montar') {
        this.pontos += pratica ? PONTOS_ACERTO : PONTOS_ACERTO / 2;
        events.unshift({ t: 'pronto', combo: 0 });
      } else events.unshift({ t: 'erro' });
    }
    void profile;
    return events;
  }

  private terminar(): Evento[] {
    const { save } = this.deps;
    const events: Evento[] = [];
    this.ganhar(XP_RODADA, events);
    this.fase = 'fim';
    save.rounds++;
    const recorde = this.pontos > save.best;
    save.best = Math.max(save.best, this.pontos);
    save.bestCombo = Math.max(save.bestCombo, this.melhorCombo);
    this.resumo = {
      perguntas: ROUND_SIZE,
      acertos: this.acertos,
      pontos: this.pontos,
      melhorCombo: this.melhorCombo,
      novos: this.novos.slice(),
      xp: this.xp,
      recorde,
    };
    events.push({ t: 'fim', resumo: this.resumo });
    return events;
  }

  private ganhar(xp: number, events: Evento[]): void {
    const { profile } = this.deps;
    const before = levelInfo(profile.xp).level;
    profile.xp += xp;
    this.xp += xp;
    const after = levelInfo(profile.xp).level;
    if (after > before) events.push({ t: 'levelup', level: after });
  }
}

/**
 * Alternativas de leitura de um composto: a certa, a "colada" (leitura de cada kanji sozinho,
 * que é o erro mais comum) e outras palavras do jogo com tamanho parecido.
 */
export function opcoesDeLeitura(c: Composto, rng: Rng): string[] {
  const certa = c.kana;
  const out = [certa];
  const colada = c.kanji.map((k) => k.leitura).join('');
  if (colada !== certa) out.push(colada);
  const parecidas = shuffle(
    rng,
    COMPOSTOS.filter((x) => x.jp !== c.jp && Math.abs([...x.kana].length - [...certa].length) <= 1).map((x) => x.kana),
  );
  for (const k of parecidas) {
    if (out.length >= 4) break;
    if (!out.includes(k)) out.push(k);
  }
  return out;
}

/** Quantos kanji do jogo a pessoa já viu (para o menu e o fliperama). */
export function vistos(cards: Readonly<Record<string, CardState>>): number {
  return contar(KANJI_PECAS, (k) => !!cards[cartaPecas(k)]);
}

/** Leitura oficial do kanji: para os 94 antigos, a de `leituras.ts`. */
export function leituraOficial(k: KanjiPeca): string {
  return LEITURAS[k.kanji]?.sozinho ?? k.leitura;
}
