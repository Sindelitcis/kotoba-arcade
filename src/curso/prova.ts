/**
 * Provas do curso (docs/curso.md, fase 3), sem tela.
 *
 * - **Prova de unidade:** no fim de cada unidade. Nota mínima de 80% para liberar a seguinte.
 *   Quem não passa revê o que errou e refaz com outra prova (outra semente).
 * - **Código:** cada prova tem um código (U04-K7QH) que guarda a unidade e a semente. O mesmo código
 *   gera sempre a mesma prova, então a folha impressa e o gabarito no site batem, em qualquer
 *   aparelho e para qualquer pessoa: a prova não depende do save.
 * - **Nivelamento:** quem já sabe algo responde poucas questões por unidade, com "Não sei", e começa
 *   da primeira unidade em que não passou. É a única cobrança de algo não apresentado no curso, e é
 *   pedida pela pessoa (docs/ensino.md, exceções).
 *
 * As alternativas erradas saem só de itens do curso até a unidade da prova, todas já ensinadas a
 * quem chegou ali pelo caminho normal, e nunca são outra resposta certa.
 */
import { UNIDADES, type Unidade } from '../content/curso';
import { hashString, seededRng, shuffle, type Rng } from '../core/rng';
import { itensAte, type ItemPratica } from './motor';

export const NOTA_MINIMA = 0.8;
/** Alternativas por questão na prova (a prática usa 2 ou 3). */
export const OPCOES_PROVA = 4;
/** Questões da própria unidade e de revisão das anteriores. */
export const QUESTOES_DA_UNIDADE = 16;
export const QUESTOES_DE_REVISAO = 4;
/** O simulado do nível, na unidade de revisão. */
export const QUESTOES_DO_SIMULADO = 30;

export type TipoQuestao = 'significado' | 'palavra' | 'leitura';

export interface Questao {
  n: number;
  tipo: TipoQuestao;
  item: ItemPratica;
  enunciado: string;
  opcoes: string[];
  certa: string;
}

export interface Prova {
  codigo: string;
  unidade: Unidade;
  questoes: Questao[];
}

/* ───────── Código ───────── */

// Sem 0/O, 1/I/L: o código é digitado à mão a partir da folha.
const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TAM_SEMENTE = 4;

export function novaSemente(rng: Rng = Math.random): string {
  let s = '';
  for (let i = 0; i < TAM_SEMENTE; i++) s += LETRAS[Math.floor(rng() * LETRAS.length)];
  return s;
}

export function codigoDaProva(u: Unidade, semente: string): string {
  return `U${String(u.numero).padStart(2, '0')}-${semente}`;
}

/** "u04-k7qh", com espaço ou sem traço, também vale. */
export function lerCodigo(texto: string): { unidade: Unidade; semente: string } | null {
  const m = /^U?(\d{1,2})[\s-]*([A-Z0-9]{4})$/.exec(texto.trim().toUpperCase());
  if (!m) return null;
  const unidade = UNIDADES.find((u) => u.numero === Number(m[1]));
  const semente = m[2] as string;
  if (!unidade || [...semente].some((c) => !LETRAS.includes(c))) return null;
  return { unidade, semente };
}

/* ───────── Montagem ───────── */

const sentido = (pt: string) => (pt.split(/[,;(]/)[0] ?? pt).trim().toLowerCase();

function enunciadoDe(tipo: TipoQuestao, item: ItemPratica): string {
  if (tipo === 'leitura') return item.jp === item.destaque ? `Como se lê ${item.destaque}?` : `Em ${item.jp}, como se lê ${item.destaque}?`;
  if (tipo === 'palavra') return `Qual é "${item.certa}"?`;
  // O japonês aparece em destaque, com a leitura em cima; no enunciado ficaria sem furigana.
  return 'O que quer dizer?';
}

/** O que a questão pede como resposta, para cada item. */
function respostaDe(tipo: TipoQuestao, item: ItemPratica): string {
  return tipo === 'palavra' ? item.jp : item.certa;
}

function erradasPara(tipo: TipoQuestao, item: ItemPratica, pool: readonly ItemPratica[], rng: Rng): string[] {
  const certa = respostaDe(tipo, item);
  const proibidas = new Set([certa, ...item.evitar]);
  const sentidos = new Set([sentido(item.certa)]);
  const out: string[] = [];
  for (const o of shuffle(rng, pool)) {
    if (out.length >= OPCOES_PROVA - 1) break;
    if (o.tipo !== item.tipo || o.id === item.id) continue;
    const r = respostaDe(tipo, o);
    if (proibidas.has(r) || out.includes(r)) continue;
    // Duas palavras com o mesmo sentido não podem estar juntas: as duas seriam certas.
    if (item.tipo === 'palavra' && sentidos.has(sentido(o.certa))) continue;
    if (tipo === 'palavra' && o.jp === item.jp) continue;
    out.push(r);
    sentidos.add(sentido(o.certa));
  }
  return out;
}

/** Sorteia `n` itens sem repetir, pela semente. */
function sortear(itens: readonly ItemPratica[], n: number, rng: Rng): ItemPratica[] {
  return shuffle(rng, itens).slice(0, n);
}

/** A prova do código. Mesmo código, mesma prova. */
export function montarProva(u: Unidade, semente: string): Prova {
  const rng = seededRng(hashString(`${u.id}:${semente}`));
  const ate = itensAte(u.numero);
  const anteriores = itensAte(u.numero - 1);
  const daUnidade = ate.filter((i) => !anteriores.some((x) => x.id === i.id));
  const escolhidos = u.revisao
    ? sortear(anteriores, QUESTOES_DO_SIMULADO, rng)
    : [...sortear(daUnidade, QUESTOES_DA_UNIDADE, rng), ...sortear(anteriores, QUESTOES_DE_REVISAO, rng)];
  const questoes: Questao[] = [];
  for (const item of escolhidos) {
    // Palavra: metade das vezes do japonês para o português, metade ao contrário.
    const tipo: TipoQuestao = item.tipo === 'kanji' ? 'leitura' : rng() < 0.5 ? 'significado' : 'palavra';
    const erradas = erradasPara(tipo, item, ate, rng);
    if (erradas.length < OPCOES_PROVA - 1) continue;
    const certa = respostaDe(tipo, item);
    questoes.push({ n: questoes.length + 1, tipo, item, enunciado: enunciadoDe(tipo, item), opcoes: shuffle(rng, [certa, ...erradas]), certa });
  }
  return { codigo: codigoDaProva(u, semente), unidade: u, questoes };
}

export function provaDoCodigo(codigo: string): Prova | null {
  const c = lerCodigo(codigo);
  return c ? montarProva(c.unidade, c.semente) : null;
}

/* ───────── Correção ───────── */

export interface Resultado {
  acertos: number;
  total: number;
  nota: number;
  aprovada: boolean;
  erradas: Questao[];
}

/** `respostas[i]` é a opção escolhida na questão i (ou `undefined`, em branco). */
export function corrigir(p: Prova, respostas: readonly (string | undefined)[]): Resultado {
  const erradas = p.questoes.filter((q, i) => respostas[i] !== q.certa);
  const total = p.questoes.length;
  const acertos = total - erradas.length;
  const nota = total === 0 ? 0 : acertos / total;
  return { acertos, total, nota, aprovada: nota >= NOTA_MINIMA, erradas };
}

/* ───────── Nivelamento ───────── */

/** Questões por unidade no nivelamento, e quantas precisa acertar para pular a unidade. */
export const NIVEL_POR_UNIDADE = 4;
export const NIVEL_PARA_PASSAR = 3;

/** As questões de nivelamento de uma unidade. */
export function questoesDeNivelamento(u: Unidade, rng: Rng): Questao[] {
  const ate = itensAte(u.numero);
  const anteriores = itensAte(u.numero - 1);
  const daUnidade = ate.filter((i) => !anteriores.some((x) => x.id === i.id));
  const out: Questao[] = [];
  for (const item of shuffle(rng, daUnidade)) {
    if (out.length >= NIVEL_POR_UNIDADE) break;
    const tipo: TipoQuestao = item.tipo === 'kanji' ? 'leitura' : 'significado';
    const erradas = erradasPara(tipo, item, ate, rng);
    if (erradas.length < OPCOES_PROVA - 1) continue;
    const certa = respostaDe(tipo, item);
    out.push({ n: out.length + 1, tipo, item, enunciado: enunciadoDe(tipo, item), opcoes: shuffle(rng, [certa, ...erradas]), certa });
  }
  return out;
}

/** As unidades que entram no nivelamento: as de conteúdo, em ordem. */
export const UNIDADES_DO_NIVELAMENTO: readonly Unidade[] = UNIDADES.filter((u) => !u.revisao);
