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
import { exemplosDaUnidade, leituraDa, type Exemplo, type Leitura, type Peca } from './exemplos';
import { gramaticaAte, lacunaDo } from './exercicios';
import { itensAte, type ItemPratica } from './motor';

export const NOTA_MINIMA = 0.8;
/** Alternativas por questão na prova (a prática usa 2 ou 3). */
export const OPCOES_PROVA = 4;
/** Questões da própria unidade e de revisão das anteriores. */
export const QUESTOES_DA_UNIDADE = 16;
export const QUESTOES_DE_REVISAO = 4;
/**
 * O simulado do nível, na unidade de revisão, nas quatro partes do JLPT: vocabulário (文字・語彙),
 * gramática (文法), leitura (読解) e escuta (聴解).
 */
export const SIMULADO = { vocabulario: 14, gramatica: 8, leitura: 4, escuta: 6 } as const;
export type Secao = keyof typeof SIMULADO;
export const NOME_SECAO: Readonly<Record<Secao, string>> = {
  vocabulario: 'Vocabulário · 文字・語彙',
  gramatica: 'Gramática · 文法',
  leitura: 'Leitura · 読解',
  escuta: 'Escuta · 聴解',
};

export type TipoQuestao = 'significado' | 'palavra' | 'leitura';

interface QuestaoBase {
  n: number;
  secao: Secao;
  enunciado: string;
  opcoes: string[];
  certa: string;
}

/** Questão de uma palavra ou de um kanji do curso. */
export interface QuestaoDeItem extends QuestaoBase {
  tipo: TipoQuestao;
  item: ItemPratica;
}

/**
 * Questão de frase (só no simulado):
 * - completar: a frase com a lacuna; as opções são peças em japonês (`leituras` tem o kana delas);
 * - texto: um texto da leitura graduada; as opções dizem o que ele conta, em português;
 * - escuta: a frase só no áudio; as opções são o sentido, em português.
 */
export interface QuestaoDeFrase extends QuestaoBase {
  tipo: 'completar' | 'texto' | 'escuta';
  frase: Exemplo;
  antes?: Peca[];
  depois?: Peca[];
  leituras?: Record<string, string>;
  texto?: Leitura;
}

export type Questao = QuestaoDeItem | QuestaoDeFrase;

export const deItem = (q: Questao): q is QuestaoDeItem => 'item' in q;

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
  return `U${String(u.ordem).padStart(2, '0')}-${semente}`;
}

/** "u04-k7qh", com espaço ou sem traço, também vale. */
export function lerCodigo(texto: string): { unidade: Unidade; semente: string } | null {
  const m = /^U?(\d{1,2})[\s-]*([A-Z0-9]{4})$/.exec(texto.trim().toUpperCase());
  if (!m) return null;
  const unidade = UNIDADES.find((u) => u.ordem === Number(m[1]));
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
  const ate = itensAte(u.ordem);
  const anteriores = itensAte(u.ordem - 1);
  const daUnidade = ate.filter((i) => !anteriores.some((x) => x.id === i.id));
  if (u.revisao) return { codigo: codigoDaProva(u, semente), unidade: u, questoes: questoesDoSimulado(u, itensAte(u.ordem - 1, u.nivel), rng) };
  const escolhidos = [...sortear(daUnidade, QUESTOES_DA_UNIDADE, rng), ...sortear(anteriores, QUESTOES_DE_REVISAO, rng)];
  return { codigo: codigoDaProva(u, semente), unidade: u, questoes: questoesDeItens(escolhidos, ate, rng, 'vocabulario') };
}

function questoesDeItens(itens: readonly ItemPratica[], pool: readonly ItemPratica[], rng: Rng, secao: Secao, max = Infinity): QuestaoDeItem[] {
  const out: QuestaoDeItem[] = [];
  for (const item of itens) {
    if (out.length >= max) break;
    // Palavra: metade das vezes do japonês para o português, metade ao contrário.
    const tipo: TipoQuestao = item.tipo === 'kanji' ? 'leitura' : rng() < 0.5 ? 'significado' : 'palavra';
    const erradas = erradasPara(tipo, item, pool, rng);
    if (erradas.length < OPCOES_PROVA - 1) continue;
    const certa = respostaDe(tipo, item);
    out.push({ n: out.length + 1, secao, tipo, item, enunciado: enunciadoDe(tipo, item), opcoes: shuffle(rng, [certa, ...erradas]), certa });
  }
  return out;
}

/* ───────── Simulado ───────── */

/** Frase que diz algo (não "Obrigado."), para a pergunta de leitura, a escuta e as opções erradas. */
const fraseQueConta = (e: Exemplo) => e.pt.length >= 14;

function questoesDoSimulado(u: Unidade, anteriores: readonly ItemPratica[], rng: Rng): Questao[] {
  const nivel = UNIDADES.filter((x) => x.nivel === u.nivel && x.ordem < u.ordem && !x.revisao);
  const vocab = questoesDeItens(shuffle(rng, anteriores), anteriores, rng, 'vocabulario', SIMULADO.vocabulario);

  // Gramática: completar a frase, com as peças que o nível ensinou.
  const conhecidas = gramaticaAte(u.ordem);
  const frases = nivel.flatMap(exemplosDaUnidade);
  const gramatica: QuestaoDeFrase[] = [];
  for (const e of shuffle(rng, frases)) {
    if (gramatica.length >= SIMULADO.gramatica) break;
    const l = lacunaDo(e, rng, conhecidas);
    if (!l || l.opcoes.length < OPCOES_PROVA) continue;
    const leituras = Object.fromEntries(frases.flatMap((f) => f.pecas).filter((p) => l.opcoes.includes(p.t)).map((p) => [p.t, p.kana]));
    gramatica.push({ n: 0, secao: 'gramatica', tipo: 'completar', enunciado: 'Qual peça completa a frase?', frase: e, antes: l.antes, depois: l.depois, leituras, opcoes: l.opcoes, certa: l.resposta.t });
  }

  // Leitura: um texto do nível e o que ele conta; as opções erradas vêm de outros textos.
  const textos = nivel.map(leituraDa).filter((l): l is Leitura => !!l);
  const leitura: QuestaoDeFrase[] = [];
  for (const t of shuffle(rng, textos)) {
    if (leitura.length >= SIMULADO.leitura) break;
    const certa = shuffle(rng, t.frases.filter(fraseQueConta))[0];
    if (!certa) continue;
    const doTexto = new Set(t.frases.map((f) => f.pt));
    const outras = textos.filter((x) => x !== t).flatMap((x) => x.frases.filter(fraseQueConta).map((f) => f.pt));
    const erradas = [...new Set(shuffle(rng, outras))].filter((pt) => !doTexto.has(pt)).slice(0, OPCOES_PROVA - 1);
    if (erradas.length < OPCOES_PROVA - 1) continue;
    leitura.push({ n: 0, secao: 'leitura', tipo: 'texto', enunciado: 'Qual destas frases o texto diz?', frase: certa, texto: t, opcoes: shuffle(rng, [certa.pt, ...erradas]), certa: certa.pt });
  }

  // Escuta: a frase só no áudio; qual é o sentido.
  const escuta: QuestaoDeFrase[] = [];
  const usadas = new Set(gramatica.map((q) => q.frase.jp));
  for (const e of shuffle(rng, frases)) {
    if (escuta.length >= SIMULADO.escuta) break;
    if (usadas.has(e.jp) || !fraseQueConta(e)) continue;
    const outras = shuffle(rng, frases).filter((f) => f.jp !== e.jp && f.pt !== e.pt && fraseQueConta(f));
    const erradas = [...new Set(outras.map((f) => f.pt))].slice(0, OPCOES_PROVA - 1);
    if (erradas.length < OPCOES_PROVA - 1) continue;
    usadas.add(e.jp);
    escuta.push({ n: 0, secao: 'escuta', tipo: 'escuta', enunciado: 'Ouça a frase. O que ela quer dizer?', frase: e, opcoes: shuffle(rng, [e.pt, ...erradas]), certa: e.pt });
  }

  return [...vocab, ...gramatica, ...leitura, ...escuta].map((q, i) => ({ ...q, n: i + 1 }));
}

export interface NotaJlpt {
  /** Vocabulário, gramática e leitura juntos, de 0 a 120 (o N5 e o N4 pedem ao menos 38). */
  conhecimento: number;
  /** Escuta, de 0 a 60 (o N5 e o N4 pedem ao menos 19). */
  escuta: number;
  /** De 0 a 180 (o N5 pede ao menos 80; o N4, 90). */
  total: number;
  /** Acertos por parte. */
  partes: Record<Secao, { acertos: number; total: number }>;
}

/**
 * A nota do simulado na escala do JLPT. É proporcional aos acertos (a escala oficial é
 * equalizada), então serve de referência; quem passa no curso é quem chega a 80%.
 */
export function notaJlpt(p: Prova, respostas: readonly (string | undefined)[]): NotaJlpt {
  const partes = Object.fromEntries((Object.keys(SIMULADO) as Secao[]).map((s) => [s, { acertos: 0, total: 0 }])) as NotaJlpt['partes'];
  p.questoes.forEach((q, i) => {
    partes[q.secao].total++;
    if (respostas[i] === q.certa) partes[q.secao].acertos++;
  });
  const fracao = (...ss: Secao[]) => {
    const t = ss.reduce((a, s) => a + partes[s].total, 0);
    return t === 0 ? 0 : ss.reduce((a, s) => a + partes[s].acertos, 0) / t;
  };
  const conhecimento = Math.round(fracao('vocabulario', 'gramatica', 'leitura') * 120);
  const escuta = Math.round(fracao('escuta') * 60);
  return { conhecimento, escuta, total: conhecimento + escuta, partes };
}

/**
 * Os mínimos de cada nível do JLPT (jlpt.jp, "Scoring"): no N5, 80 de 180 no total; no N4, 90.
 * Nos dois, 38 em conhecimento e leitura e 19 em escuta.
 */
export const MINIMOS_JLPT: Readonly<Record<'N5' | 'N4', { total: number; conhecimento: number; escuta: number }>> = {
  N5: { total: 80, conhecimento: 38, escuta: 19 },
  N4: { total: 90, conhecimento: 38, escuta: 19 },
};

export const passariaNoJlpt = (n: NotaJlpt, jlpt: 'N5' | 'N4'): boolean => {
  const m = MINIMOS_JLPT[jlpt];
  return n.total >= m.total && n.conhecimento >= m.conhecimento && n.escuta >= m.escuta;
};

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
export function questoesDeNivelamento(u: Unidade, rng: Rng): QuestaoDeItem[] {
  const ate = itensAte(u.ordem);
  const anteriores = itensAte(u.ordem - 1);
  const daUnidade = ate.filter((i) => !anteriores.some((x) => x.id === i.id));
  const out: QuestaoDeItem[] = [];
  for (const item of shuffle(rng, daUnidade)) {
    if (out.length >= NIVEL_POR_UNIDADE) break;
    const tipo: TipoQuestao = item.tipo === 'kanji' ? 'leitura' : 'significado';
    const erradas = erradasPara(tipo, item, ate, rng);
    if (erradas.length < OPCOES_PROVA - 1) continue;
    const certa = respostaDe(tipo, item);
    out.push({ n: out.length + 1, secao: 'vocabulario', tipo, item, enunciado: enunciadoDe(tipo, item), opcoes: shuffle(rng, [certa, ...erradas]), certa });
  }
  return out;
}

/** As unidades que entram no nivelamento: as de conteúdo, em ordem. */
export const UNIDADES_DO_NIVELAMENTO: readonly Unidade[] = UNIDADES.filter((u) => !u.revisao);
