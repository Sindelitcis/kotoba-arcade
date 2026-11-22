/**
 * Memória (pares): imagem ↔ palavra. Regras puras, sem tela.
 *
 * Uma rodada tem três quadros curtos (1 a 3 minutos no total):
 *  1. rápido, cartas abertas, 4 pares;
 *  2. memória, cartas viradas, 6 pares;
 *  3. rápido com 6 pares, ou "parecidas" quando já há palavras firmes que se confundem.
 *
 * Cada palavra sobe de jeito sozinha (`nivel` no save):
 *  0 = a carta mostra a palavra em kana (com áudio);
 *  1 = mostra em kanji (o kana aparece depois do par feito); palavra sem kanji pula este;
 *  2 = só áudio.
 * Dois pares limpos seguidos sobem um nível; uma confusão desce um.
 *
 * Palavra nunca vista é apresentada no começo da rodada (core/ensino.ts: imagem, palavra, voz
 * e significado) e só depois entra num quadro. Quadro com palavra ainda em prática fica aberto,
 * com a palavra em kana, e confundir não tira combo nem pontos: a palavra é apresentada de novo.
 * O quadro de memória (cartas viradas) só vem quando todas as palavras dele já passaram da prática.
 * Errar não tem tela de erro: a carta treme e o par certo brilha depois de duas confusões.
 */
import { cardKey, type Word } from '../../content';
import { FIGURAS, type Figura } from '../../content/imagens';
import { pickNext } from '../../core/picker';
import { levelInfo } from '../../core/progress';
import { shuffle, type Rng } from '../../core/rng';
import type { Profile } from '../../core/save';
import { apresentar, avaliar, emPratica, notaDaPratica, novidades } from '../../core/ensino';
import type { CardState, Outcome } from '../../core/srs';

// ───────── Save ─────────

export interface MemoriaSave {
  /** Nível de cada palavra: 0 kana, 1 kanji, 2 áudio. */
  nivel: Record<string, number>;
  /** Pares limpos seguidos no nível atual. */
  seq: Record<string, number>;
  rounds: number;
  best: number;
  bestCombo: number;
}

export function emptyMemoriaSave(): MemoriaSave {
  return { nivel: {}, seq: {}, rounds: 0, best: 0, bestCombo: 0 };
}

const isCount = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;

function tabela(x: unknown, max: number): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof x === 'object' && x !== null && !Array.isArray(x)) {
    for (const [k, v] of Object.entries(x)) if (isCount(v)) out[k] = Math.min(max, Math.floor(v));
  }
  return out;
}

/** Devolve o save da Memória dentro de `games`, criando ou consertando o que faltar. Sempre o mesmo objeto. */
export function ensureMemoriaSave(games: Record<string, unknown>): MemoriaSave {
  const atual = games.memoria;
  if (typeof atual !== 'object' || atual === null || Array.isArray(atual)) {
    const base = emptyMemoriaSave();
    games.memoria = base;
    return base;
  }
  const s = atual as Record<string, unknown>;
  s.nivel = tabela(s.nivel, NIVEL_MAX);
  s.seq = tabela(s.seq, 99);
  for (const k of ['rounds', 'best', 'bestCombo'] as const) if (!isCount(s[k])) s[k] = 0;
  return s as unknown as MemoriaSave;
}

// ───────── Constantes ─────────

export const NIVEL_MAX = 2;
/** Pares limpos seguidos para a palavra subir de nível. */
export const SOBE_COM = 2;
export const QUADROS = [
  { modo: 'rapido', pares: 4 },
  { modo: 'memoria', pares: 6 },
  { modo: 'rapido', pares: 6 },
] as const;
/** Palavras novas apresentadas no começo da rodada, no máximo. */
export const NOVAS_POR_RODADA = 4;
/** Palavras no nível de áudio necessárias para aparecer o quadro de parecidas. */
export const PARECIDAS_MIN = 4;
/** Confusões com o mesmo par antes de ele brilhar. */
export const BRILHA_DEPOIS = 2;
export const RAPIDO_MS = 2500;
export const PONTOS_PAR = 10;
export const PONTOS_RAPIDO = 5;
export const XP_PAR = 1;
export const XP_QUADRO = 4;
export const XP_RODADA = 8;
export const MOEDAS_RODADA = 4;

export type Mostra = 'kana' | 'kanji' | 'audio';
export type Modo = 'rapido' | 'memoria';

export const chave = (w: Word) => cardKey(w.id, 'meaning');

const temKanji = (w: Word) => /[一-鿿々]/.test(w.jp);

/** Como a carta de palavra aparece, pelo nível da palavra. */
export function mostraDe(w: Word, nivel: number): Mostra {
  if (nivel >= 2) return 'audio';
  if (nivel === 1 && temKanji(w)) return 'kanji';
  return 'kana';
}

/** Próximo nível depois de um par limpo. Palavra sem kanji pula o nível de kanji. */
export function subir(w: Word, nivel: number): number {
  const n = Math.min(NIVEL_MAX, nivel + 1);
  return n === 1 && !temKanji(w) ? 2 : n;
}

export function descer(w: Word, nivel: number): number {
  const n = Math.max(0, nivel - 1);
  return n === 1 && !temKanji(w) ? 0 : n;
}

/** Distância de edição entre dois textos em kana (かさ / かぎ = 1). */
export function distancia(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  let prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[y.length]!;
}

/** Duas palavras "se confundem" quando o kana difere em um só som (はな/はこ, いす/いぬ). */
export function seConfundem(a: Word, b: Word): boolean {
  return a.kana !== b.kana && distancia(a.kana, b.kana) === 1;
}

/** Duas figuras não podem estar no mesmo quadro: mesmo som (雨/飴) ou mesma palavra. */
export function brigam(a: Figura, b: Figura): boolean {
  return a.word.id === b.word.id || a.word.kana === b.word.kana;
}

/** Figuras da Memória: uma por palavra (o objeto colorido entra uma vez só). */
export const FIGURAS_MEMORIA: readonly Figura[] = FIGURAS;

// ───────── Quadro ─────────

export interface Carta {
  /** Índice do par (as duas cartas do par têm o mesmo). */
  par: number;
  lado: 'img' | 'palavra';
  figura: Figura;
  mostra: Mostra;
  /** Aberta (rápido) ou virada para cima agora (memória). */
  aberta: boolean;
  feita: boolean;
  /** Já foi vista alguma vez (memória). */
  vista: boolean;
}

export interface Quadro {
  modo: Modo;
  parecidas: boolean;
  cartas: Carta[];
  /** Quadro de prática: alguma palavra ainda está em prática. Cartas abertas, palavra em kana, errar não custa. */
  apoio: boolean;
}

/** Monta as cartas de um quadro, embaralhadas. */
export function montarQuadro(figs: readonly Figura[], modo: Modo, nivel: (w: Word) => number, rng: Rng, apoio = false, parecidas = false): Quadro {
  const cartas: Carta[] = [];
  figs.forEach((f, par) => {
    const aberta = modo === 'rapido';
    cartas.push({ par, lado: 'img', figura: f, mostra: 'kana', aberta, feita: false, vista: false });
    cartas.push({ par, lado: 'palavra', figura: f, mostra: apoio ? 'kana' : mostraDe(f.word, nivel(f.word)), aberta, feita: false, vista: false });
  });
  return { modo, parecidas, cartas: shuffle(rng, cartas), apoio };
}

/** Escolhe um grupo de figuras que se confundem entre si, entre as candidatas. */
export function grupoParecido(cands: readonly Figura[], quantas: number, rng: Rng): Figura[] {
  const ordem = shuffle(rng, cands);
  let melhor: Figura[] = [];
  for (const semente of ordem) {
    const grupo = [semente];
    for (const f of ordem) {
      if (grupo.length >= quantas) break;
      if (grupo.some((g) => brigam(g, f))) continue;
      if (grupo.some((g) => seConfundem(g.word, f.word))) grupo.push(f);
    }
    if (grupo.length > melhor.length) melhor = grupo;
    if (melhor.length >= quantas) break;
  }
  return melhor;
}

// ───────── Rodada ─────────

export type Evento =
  | { t: 'abre'; carta: number; fala: string | null }
  | { t: 'par'; cartas: [number, number]; figura: Figura; rapido: boolean; combo: number }
  | { t: 'confusao'; cartas: [number, number] }
  /** Confundiu na prática: o jogo mostra de novo a palavra da imagem escolhida. */
  | { t: 'de-novo'; figura: Figura }
  | { t: 'sobe'; figura: Figura; nivel: number }
  | { t: 'quadro'; numero: number }
  | { t: 'nivel'; level: number }
  | { t: 'fim'; resumo: Resumo };

export interface Resumo {
  pares: number;
  limpos: number;
  pontos: number;
  bestCombo: number;
  novas: Figura[];
  subiram: Figura[];
  xp: number;
  moedas: number;
  recorde: boolean;
}

export interface Deps {
  cards: Record<string, CardState>;
  profile: Profile;
  save: MemoriaSave;
  now: () => number;
  rng: Rng;
  figuras?: readonly Figura[];
}

/** apresenta: as palavras novas, antes do primeiro quadro. */
export type Fase = 'apresenta' | 'jogo' | 'pausa' | 'fim';

export class MemoriaRound {
  fase: Fase = 'jogo';
  numero = 0;
  quadro!: Quadro;
  /** Palavras apresentadas no começo da rodada. */
  readonly apresentadas: Figura[] = [];
  /** Cartas escolhidas e ainda sem par (no máximo uma; duas na memória enquanto mostram o erro). */
  escolha: number[] = [];
  pontos = 0;
  combo = 0;
  bestCombo = 0;
  resumo: Resumo | null = null;
  private desde = 0;
  private xp = 0;
  private pares = 0;
  private limpos = 0;
  private novasRodada: Figura[] = [];
  private subiram: Figura[] = [];
  /** Palavras que já levaram nota nesta rodada (uma nota por palavra). */
  private notadas = new Set<string>();
  private confusas = new Map<number, number>();

  constructor(private deps: Deps) {
    const porChave = new Map(this.figs.map((f) => [chave(f.word), f]));
    for (const k of novidades([...porChave.keys()], deps.cards, { max: NOVAS_POR_RODADA })) this.apresentadas.push(porChave.get(k)!);
    this.novasRodada.push(...this.apresentadas);
    if (this.apresentadas.length > 0) this.fase = 'apresenta';
    else this.abrirQuadro();
  }

  /** A apresentação acabou: as palavras viram cartas e abre o primeiro quadro. */
  apresentou(): void {
    if (this.fase !== 'apresenta') return;
    apresentar(this.deps.cards, this.apresentadas.map((f) => chave(f.word)), this.deps.now());
    this.abrirQuadro();
  }


  private get figs(): readonly Figura[] {
    return this.deps.figuras ?? FIGURAS_MEMORIA;
  }

  nivelDe = (w: Word): number => this.deps.save.nivel[w.id] ?? 0;

  /**
   * Escolhe as figuras do próximo quadro com o `pickNext` (memória compartilhada). Só entra
   * palavra já apresentada; com poucas apresentadas (começo do jogo), o quadro fica menor.
   */
  private escolher(pares: number): { figs: Figura[]; parecidas: boolean } {
    const { cards, now, rng } = this.deps;
    const t = now();
    const ultimo = this.numero === QUADROS.length - 1;
    if (ultimo) {
      const firmes = this.figs.filter((f) => this.nivelDe(f.word) >= NIVEL_MAX && cards[chave(f.word)] && !emPratica(cards, chave(f.word)));
      if (firmes.length >= PARECIDAS_MIN) {
        const g = grupoParecido(firmes, pares, rng);
        if (g.length >= 3) return { figs: g, parecidas: true };
      }
    }
    const porChave = new Map(this.figs.map((f) => [chave(f.word), f]));
    const pool = [...porChave.keys()];
    const out: Figura[] = [];
    // Só evita repetir dentro do quadro: palavra do quadro anterior pode (e deve) voltar para fixar.
    const recentes: string[] = [];
    let tentativas = 0;
    while (out.length < pares && tentativas++ < pares * 12) {
      const sem = pool.filter((k) => !recentes.includes(k) && !out.some((f) => brigam(f, porChave.get(k)!)));
      if (sem.length === 0) break;
      const p = pickNext(sem, cards, t, rng, { maxYoung: Infinity });
      if (!p) break;
      recentes.push(p.key);
      out.push(porChave.get(p.key)!);
    }
    return { figs: out, parecidas: false };
  }

  private abrirQuadro(): void {
    const q = QUADROS[this.numero]!;
    const { figs, parecidas } = this.escolher(q.pares);
    const apoio = figs.some((f) => emPratica(this.deps.cards, chave(f.word)));
    // Palavra em prática: quadro aberto. Memória com cartas viradas só depois da prática.
    this.quadro = montarQuadro(figs, parecidas || apoio ? 'rapido' : q.modo, this.nivelDe, this.deps.rng, apoio, parecidas);
    this.escolha = [];
    this.confusas.clear();
    this.fase = 'jogo';
    this.desde = this.deps.now();
  }

  /** A carta brilha: par de quem já se confundiu demais. */
  brilha(i: number): boolean {
    const c = this.quadro.cartas[i];
    if (!c || c.feita) return false;
    return (this.confusas.get(c.par) ?? 0) >= BRILHA_DEPOIS;
  }

  /** Na memória, as duas cartas erradas ficam abertas até a próxima jogada. Fecha agora. */
  fecharErradas(): void {
    if (this.quadro.modo !== 'memoria' || this.escolha.length < 2) return;
    for (const i of this.escolha) this.quadro.cartas[i]!.aberta = false;
    this.escolha = [];
  }

  /** O que dizer quando a carta abre: a palavra (em kana) em todo lado de palavra, e na imagem quando já é par. */
  private fala(c: Carta): string | null {
    return c.lado === 'palavra' ? c.figura.word.kana : null;
  }

  escolher_carta(i: number): Evento[] {
    const ev: Evento[] = [];
    if (this.fase !== 'jogo') return ev;
    const q = this.quadro;
    const c = q.cartas[i];
    if (!c || c.feita) return ev;
    if (q.modo === 'memoria' && this.escolha.length >= 2) this.fecharErradas();
    if (this.escolha.includes(i)) {
      // Escolher de novo a mesma carta só repete a voz (no rápido, desmarca).
      if (q.modo === 'rapido') this.escolha = [];
      ev.push({ t: 'abre', carta: i, fala: this.fala(c) });
      return ev;
    }
    const jaVista = c.vista;
    c.vista = true;
    c.aberta = true;
    ev.push({ t: 'abre', carta: i, fala: this.fala(c) });
    if (this.escolha.length === 0) {
      this.escolha = [i];
      this.desde = this.deps.now();
      return ev;
    }
    const j = this.escolha[0]!;
    const a = q.cartas[j]!;
    if (a.par === c.par && a.lado !== c.lado) {
      a.feita = c.feita = true;
      a.aberta = c.aberta = true;
      this.escolha = [];
      this.acerto(a, [j, i], ev);
      if (q.cartas.every((x) => x.feita)) this.fimDoQuadro(ev);
      return ev;
    }
    if (a.lado === c.lado) {
      // Duas imagens ou duas palavras: só troca a escolha, não é erro.
      if (q.modo === 'memoria') a.aberta = false;
      this.escolha = [i];
      return ev;
    }
    // Par errado. Na memória, só é confusão se a segunda carta já tinha sido vista (escolha consciente).
    const confusao = q.modo === 'rapido' || jaVista;
    if (q.modo === 'memoria') this.escolha = [j, i];
    else this.escolha = [];
    if (confusao) {
      for (const x of [a, c]) {
        this.confusas.set(x.par, (this.confusas.get(x.par) ?? 0) + 1);
        this.notar(x.figura, { correct: false });
      }
      ev.push({ t: 'confusao', cartas: [j, i] });
      if (q.apoio) {
        // Prática: confundir não tira combo nem nível. A palavra da imagem aparece de novo.
        ev.push({ t: 'de-novo', figura: (a.lado === 'img' ? a : c).figura });
      } else {
        this.combo = 0;
        for (const x of [a, c]) {
          const s = this.deps.save;
          s.nivel[x.figura.word.id] = descer(x.figura.word, this.nivelDe(x.figura.word));
          s.seq[x.figura.word.id] = 0;
        }
      }
    }
    return ev;
  }

  private notar(f: Figura, o: Outcome): void {
    const k = chave(f.word);
    if (this.notadas.has(k)) return;
    this.notadas.add(k);
    avaliar(this.deps.cards, k, o, this.deps.now());
  }

  private acerto(a: Carta, cartas: [number, number], ev: Evento[]): void {
    const f = a.figura;
    const ms = this.deps.now() - this.desde;
    const apoio = this.quadro.apoio;
    const limpo = !this.confusas.has(a.par);
    const rapido = limpo && !apoio && ms < RAPIDO_MS;
    this.pares++;
    if (limpo) this.limpos++;
    if (apoio) {
      // Prática: pontos fixos, o combo não mexe.
      this.pontos += Math.floor(PONTOS_PAR / 2);
    } else {
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.pontos += PONTOS_PAR + (rapido ? PONTOS_RAPIDO : 0) + Math.min(this.combo - 1, 5);
    }
    this.notar(f, apoio && limpo ? notaDaPratica(true, ms) : { correct: true, ms, hinted: apoio || this.brilhaPar(a.par) });
    ev.push({ t: 'par', cartas, figura: f, rapido, combo: this.combo });
    if (limpo && !apoio) {

      const s = this.deps.save;
      const id = f.word.id;
      s.seq[id] = (s.seq[id] ?? 0) + 1;
      const antes = this.nivelDe(f.word);
      if (s.seq[id]! >= SOBE_COM && antes < NIVEL_MAX) {
        s.nivel[id] = subir(f.word, antes);
        s.seq[id] = 0;
        if (!this.subiram.includes(f)) this.subiram.push(f);
        ev.push({ t: 'sobe', figura: f, nivel: s.nivel[id]! });
      }
    }
    this.ganhar(XP_PAR, ev);
  }

  private brilhaPar(par: number): boolean {
    return (this.confusas.get(par) ?? 0) >= BRILHA_DEPOIS;
  }

  private ganhar(xp: number, ev: Evento[]): void {
    const p = this.deps.profile;
    const antes = levelInfo(p.xp).level;
    p.xp += xp;
    this.xp += xp;
    const depois = levelInfo(p.xp).level;
    if (depois > antes) ev.push({ t: 'nivel', level: depois });
  }

  private fimDoQuadro(ev: Evento[]): void {
    this.ganhar(XP_QUADRO, ev);
    if (this.numero + 1 >= QUADROS.length) {
      this.terminar(ev);
      return;
    }
    // Ponto de parada: entre um quadro e outro dá para sair sem perder nada.
    this.fase = 'pausa';
    ev.push({ t: 'quadro', numero: this.numero });
  }

  /** Depois da pausa entre quadros: o próximo. */
  proximo(): void {
    if (this.fase !== 'pausa') return;
    this.numero++;
    this.abrirQuadro();
  }

  /** Para no meio (Esc na pausa): o que foi feito vale, como uma rodada curta. */
  parar(): Evento[] {
    const ev: Evento[] = [];
    if (this.fase !== 'fim' && this.pares > 0) this.terminar(ev);
    return ev;
  }

  private terminar(ev: Evento[]): void {
    this.ganhar(XP_RODADA, ev);
    const s = this.deps.save;
    const p = this.deps.profile;
    const moedas = MOEDAS_RODADA + Math.floor(this.pontos / 40);
    p.coins += moedas;
    s.rounds++;
    const recorde = this.pontos > s.best;
    if (recorde) s.best = this.pontos;
    s.bestCombo = Math.max(s.bestCombo, this.bestCombo);
    this.fase = 'fim';
    this.resumo = {
      pares: this.pares,
      limpos: this.limpos,
      pontos: this.pontos,
      bestCombo: this.bestCombo,
      novas: this.novasRodada,
      subiram: this.subiram,
      xp: this.xp,
      moedas,
      recorde,
    };
    ev.push({ t: 'fim', resumo: this.resumo });
  }
}
