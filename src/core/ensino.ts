/**
 * Ensinar antes de cobrar, igual em todos os jogos.
 *
 * Cada item (palavra, kanji, kana, ponto de gramática) passa por três fases, tiradas do
 * estado da carta no FSRS:
 *
 *   novo       sem carta nenhuma do item. Nunca vira pergunta: primeiro a apresentação.
 *   prática    apresentado (carta no estado New do FSRS) ou ainda aprendendo
 *              (Learning, Relearning). Pergunta fácil, com dica na tela, poucas
 *              alternativas, e errar não tira vida, combo nem pontos.
 *   cobrança   a carta já passou para Review. Agora entram o tempo, as vidas, o combo e
 *              todas as alternativas.
 *
 * A apresentação cria a carta vazia do FSRS (`newCard`), então "apresentado" mora no próprio
 * save das cartas. `avaliar()` é o único jeito de dar nota, e ele recusa item que nunca foi
 * apresentado: é a trava que os testes de cada jogo conferem.
 */
import { parseCardKey } from '../content';
import { isLearning, newCard, review, State, type CardState, type Outcome } from './srs';

export type FaseEnsino = 'novo' | 'pratica' | 'cobranca';

/** Itens novos por apresentação: nunca menos de 3 (quando há), nunca mais de 5. */
export const NOVOS_MIN = 3;
export const NOVOS_MAX = 5;
export const NOVOS_PADRAO = 4;
/** Alternativas na prática: duas na primeira vez, três depois. */
export const OPCOES_PRIMEIRA = 2;
export const OPCOES_PRATICA = 3;
/** Com tanto item ainda em prática, o jogo segura as novidades. */
export const PRATICA_MAX = 8;

export class ItemNaoApresentado extends Error {
  constructor(readonly chave: string) {
    super(`item cobrado sem ter sido apresentado: ${chave}`);
  }
}

/** O item de uma chave de carta (`w:棚#meaning` → `w:棚`). */
export function itemDe(chave: string): string {
  return chave.includes('#') ? parseCardKey(chave).itemId : chave;
}

/** O item já foi apresentado: tem alguma carta, de qualquer habilidade, em qualquer jogo. */
export function foiApresentado(cards: Readonly<Record<string, CardState>>, chave: string): boolean {
  if (cards[chave]) return true;
  const prefixo = `${itemDe(chave)}#`;
  for (const k in cards) if (k.startsWith(prefixo)) return true;
  return false;
}

/** Todos os itens já apresentados, de uma vez (para filtrar listas grandes sem varrer as cartas a cada item). */
export function itensApresentados(cards: Readonly<Record<string, CardState>>): Set<string> {
  const out = new Set<string>();
  for (const k in cards) out.add(itemDe(k));
  return out;
}

export function faseDe(cards: Readonly<Record<string, CardState>>, chave: string): FaseEnsino {
  const c = cards[chave];
  if (!c) return foiApresentado(cards, chave) ? 'pratica' : 'novo';
  if (c.state === State.New || isLearning(c)) return 'pratica';
  return 'cobranca';
}

export const emPratica = (cards: Readonly<Record<string, CardState>>, chave: string) => faseDe(cards, chave) === 'pratica';

/** Marca como apresentado: cria a carta vazia do FSRS de cada chave que ainda não tem. */
export function apresentar(cards: Record<string, CardState>, chaves: readonly string[], now: number): void {
  for (const k of chaves) cards[k] ??= newCard(now);
}

/**
 * Dá a nota de uma resposta. Recusa (lança `ItemNaoApresentado`) item que nunca foi
 * apresentado. Habilidade nova de um item já apresentado (o significado de 山 já foi visto,
 * a leitura ainda não) começa numa carta vazia.
 */
export function avaliar(cards: Record<string, CardState>, chave: string, outcome: Outcome, now: number): CardState {
  if (!foiApresentado(cards, chave)) throw new ItemNaoApresentado(chave);
  const depois = review(cards[chave] ?? newCard(now), outcome, now);
  cards[chave] = depois;
  return depois;
}

/** Nota de uma resposta na prática: a dica já faz parte da pergunta, então acerto conta como bom. */
export function notaDaPratica(correct: boolean, ms?: number): Outcome {
  return correct ? { correct: true, ms: ms !== undefined ? Math.max(ms, 2500) : undefined } : { correct: false };
}

/** Quantas alternativas a pergunta mostra: 2 na primeira vez, 3 na prática, `cheio` na cobrança. */
export function opcoesPara(cards: Readonly<Record<string, CardState>>, chave: string, cheio: number): number {
  const c = cards[chave];
  const fase = faseDe(cards, chave);
  if (fase === 'cobranca') return cheio;
  if (!c || c.reps === 0) return Math.min(cheio, OPCOES_PRIMEIRA);
  return Math.min(cheio, OPCOES_PRATICA);
}

/** Corta a lista de alternativas para `n`, sem perder a certa. Mantém a ordem. */
export function cortarOpcoes<T>(opcoes: readonly T[], certa: T, n: number): T[] {
  if (opcoes.length <= n) return [...opcoes];
  const erradas = opcoes.filter((o) => o !== certa).slice(0, n - 1);
  const out = opcoes.filter((o) => o === certa || erradas.includes(o));
  return out;
}

export interface OpcoesNovidade {
  /** Máximo nesta apresentação (padrão 4, nunca mais de 5). */
  max?: number;
  /** Itens em prática que seguram as novidades (padrão 8). */
  praticaMax?: number;
}

/**
 * Os itens novos para apresentar agora, na ordem do `pool` (a ordem do conteúdo é a ordem de
 * ensino). Um por item, mesmo que o item tenha várias chaves no pool. Com muita coisa ainda em
 * prática, nada novo entra; sem nada apresentado ainda, entra o mínimo (3).
 */
export function novidades(pool: readonly string[], cards: Readonly<Record<string, CardState>>, opts: OpcoesNovidade = {}): string[] {
  const max = Math.min(NOVOS_MAX, opts.max ?? NOVOS_PADRAO);
  const praticaMax = opts.praticaMax ?? PRATICA_MAX;
  const itens = new Set<string>();
  const novos: string[] = [];
  let emPraticaAgora = 0;
  let algumVisto = false;
  for (const k of pool) {
    const item = itemDe(k);
    if (itens.has(item)) continue;
    itens.add(item);
    const f = faseDe(cards, k);
    if (f === 'novo') novos.push(k);
    else {
      algumVisto = true;
      if (f === 'pratica') emPraticaAgora++;
    }
  }
  const cabem = algumVisto ? Math.max(0, Math.min(max, praticaMax - emPraticaAgora)) : max;
  // Menos de três de uma vez só no fim do conteúdo; senão espera a prática andar.
  if (cabem < Math.min(NOVOS_MIN, max) && novos.length > cabem) return [];
  return novos.slice(0, cabem);
}

/** Só as chaves que já podem virar pergunta. */
export function soApresentados(pool: readonly string[], cards: Readonly<Record<string, CardState>>): string[] {
  return pool.filter((k) => foiApresentado(cards, k));
}
