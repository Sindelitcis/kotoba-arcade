/**
 * O motor do curso (docs/curso.md, fase 2), sem tela: como uma unidade vira lição, o
 * progresso salvo e o que libera a unidade seguinte.
 *
 * Uma unidade é percorrida em blocos curtos, de uns 5 minutos, que dá para parar e voltar:
 *
 *   objetivo    "Ao final, você consegue..." e uma revisão rápida da unidade anterior
 *   palavras    de 3 a 5 palavras: apresentação e, logo depois, prática com apoio
 *   kanji       os kanji das palavras que acabaram de entrar, com a leitura usada ali
 *   gramatica   os pontos da unidade
 *   notas       notas culturais já conferidas contra a fonte (as outras ficam de fora)
 *   dialogo     a situação da unidade: escuta, leitura com furigana e repetição
 *   revisao     unidade de revisão: prática com o que já foi visto no nível
 *
 * A aula falada, o mini-teste e a tarefa de uso dependem do conteúdo da fase 4 e das provas
 * da fase 3; o motor já tem o lugar delas na ordem e pula o que ainda não existe.
 */
import { GRAMATICA_N5, palavrasDa, UNIDADES, type KanjiDaUnidade, type Nota, type Palavra, type Unidade } from '../content/curso';
import { cardKey } from '../content';
import { foiApresentado } from '../core/ensino';
import { shuffle, type Rng } from '../core/rng';
import type { CardState } from '../core/srs';

/* ───────── Blocos ───────── */

export type Bloco =
  | { tipo: 'objetivo'; id: string }
  | { tipo: 'palavras'; id: string; palavras: readonly Palavra[] }
  | { tipo: 'kanji'; id: string; kanji: readonly KanjiDaUnidade[] }
  | { tipo: 'gramatica'; id: string; pontos: readonly string[] }
  | { tipo: 'notas'; id: string; notas: readonly Nota[] }
  | { tipo: 'dialogo'; id: string; situacao: string }
  | { tipo: 'revisao'; id: string };

export type TipoBloco = Bloco['tipo'];

export const NOME_BLOCO: Readonly<Record<TipoBloco, string>> = {
  objetivo: 'Objetivo',
  palavras: 'Vocabulário',
  kanji: 'Kanji',
  gramatica: 'Gramática',
  notas: 'Cultura',
  dialogo: 'Diálogo',
  revisao: 'Revisão',
};

/** Itens por apresentação: de 3 a 5, como em todo o site (docs/ensino.md). */
export const POR_LOTE = 5;

/**
 * Divide em lotes de no máximo `max`, do mesmo tamanho (ou quase): 21 vira 5, 4, 4, 4, 4,
 * e não 5, 5, 5, 5, 1.
 */
export function emLotes<T>(lista: readonly T[], max = POR_LOTE): T[][] {
  if (lista.length === 0) return [];
  const n = Math.ceil(lista.length / max);
  const base = Math.floor(lista.length / n);
  const sobra = lista.length % n;
  const out: T[][] = [];
  let i = 0;
  for (let l = 0; l < n; l++) {
    const tam = base + (l < sobra ? 1 : 0);
    out.push(lista.slice(i, i + tam));
    i += tam;
  }
  return out;
}

/** Os blocos da unidade, na ordem. O kanji entra logo depois do lote em que a palavra dele apareceu. */
export function blocosDa(u: Unidade): Bloco[] {
  const out: Bloco[] = [{ tipo: 'objetivo', id: `${u.id}:objetivo` }];
  if (u.revisao) {
    out.push({ tipo: 'revisao', id: `${u.id}:revisao` });
    return out;
  }
  const lotes = emLotes(palavrasDa(u));
  const restantes = [...u.kanji];
  lotes.forEach((lote, i) => {
    out.push({ tipo: 'palavras', id: `${u.id}:palavras:${i + 1}`, palavras: lote });
    const jps = new Set(lote.map((p) => p.jp));
    const daqui = restantes.filter((k) => jps.has(k.em));
    for (const k of daqui) restantes.splice(restantes.indexOf(k), 1);
    emLotes(daqui).forEach((kl, j) => out.push({ tipo: 'kanji', id: `${u.id}:kanji:${i + 1}.${j + 1}`, kanji: kl }));
  });
  // Kanji cuja palavra não está nas palavras (o teste do currículo não deixa, mas o motor não perde nada).
  emLotes(restantes).forEach((kl, j) => out.push({ tipo: 'kanji', id: `${u.id}:kanji:fim.${j + 1}`, kanji: kl }));
  if (u.gramatica.length > 0) out.push({ tipo: 'gramatica', id: `${u.id}:gramatica`, pontos: u.gramatica });
  const notas = u.notas.filter((n) => n.conferida);
  if (notas.length > 0) out.push({ tipo: 'notas', id: `${u.id}:notas`, notas });
  for (const s of u.situacoes ?? []) out.push({ tipo: 'dialogo', id: `${u.id}:dialogo:${s}`, situacao: s });
  return out;
}

export function unidadePorId(id: string): Unidade | undefined {
  return UNIDADES.find((u) => u.id === id);
}

/* ───────── Cartas ───────── */

/** A carta da palavra: a mesma dos jogos (`w:<como se escreve>#meaning`). */
export const cartaDaPalavra = (p: Palavra): string => cardKey(`w:${p.jp}`, 'meaning');

/** As cartas do kanji: o significado (o KanjiMon usa) e a leitura, que a prática do curso cobra. */
export const cartasDoKanji = (k: KanjiDaUnidade): string[] => [cardKey(`k:${k.k}`, 'meaning'), cardKey(`k:${k.k}`, 'reading')];
export const cartaDaLeitura = (k: KanjiDaUnidade): string => cardKey(`k:${k.k}`, 'reading');

/**
 * As outras leituras do kanji no curso e onde entram, para o cartão avisar:
 * "em 金曜日 se lê きん (unidade 3)".
 */
export function outrasLeituras(k: KanjiDaUnidade): { leitura: string; em: string; unidade: number }[] {
  const out: { leitura: string; em: string; unidade: number }[] = [];
  for (const u of UNIDADES)
    for (const x of u.kanji) if (x.k === k.k && x.leitura !== k.leitura && !out.some((o) => o.leitura === x.leitura)) out.push({ leitura: x.leitura, em: x.em, unidade: u.numero });
  return out;
}

/** A palavra do curso escrita assim (para mostrar a leitura e o significado da palavra do kanji). */
export function palavraDoCurso(jp: string): Palavra | undefined {
  for (const u of UNIDADES) for (const p of palavrasDa(u)) if (p.jp === jp) return p;
  return undefined;
}

/* ───────── Gramática ───────── */

/** Ponto do N5 → ficha que já existe no site (Kumitate ou lição da escola), para a regra e o Aprofundar. */
export const FICHA_DA_GRAMATICA: Readonly<Record<string, string>> = {
  desu: 'g-desu',
  wa: 'wa',
  no: 'no',
  mo: 'mo',
  numeros: 'g-numeros',
  kosoado: 'g-kosoado',
  masu: 'masu',
  wo: 'wo',
  'to-ya': 'to',
  'masu-negativo-passado': 'mashita',
  'ni-tempo': 'ni',
  'de-lugar': 'de',
  'aru-iru': 'g-aru-iru',
  'ga-sujeito': 'ga',
  tai: 'tai',
  'te-forma': 'te',
  'te-imasu': 'teiru',
  'nai-kei': 'nai',
  'ta-kei': 'ta',
};

/** "horas e minutos: 〜じ, 〜ふん, はん" → o padrão grande e o que ele quer dizer. */
export function partesDoPonto(id: string): { grande: string; pt: string } {
  const d = GRAMATICA_N5[id] ?? id;
  const i = d.indexOf(': ');
  if (i < 0) return { grande: d, pt: '' };
  const antes = d.slice(0, i);
  const depois = d.slice(i + 2);
  // O japonês fica grande; a explicação em português fica embaixo.
  return /[぀-ヿ一-鿿〜]/u.test(antes) ? { grande: antes, pt: depois } : { grande: depois, pt: antes };
}

/* ───────── Progresso ───────── */

export interface CursoSave {
  /** Unidade → quantos blocos já foram feitos, em ordem. Só cresce. */
  feitos: Record<string, number>;
  /** Unidade → quantas vezes foi concluída. */
  concluidas: Record<string, number>;
}

export function ensureCursoSave(games: Record<string, unknown>): CursoSave {
  const raw = games.curso as Partial<CursoSave> | undefined;
  const limpar = (o: unknown): Record<string, number> => {
    const out: Record<string, number> = {};
    if (o && typeof o === 'object')
      for (const [k, v] of Object.entries(o)) if (unidadePorId(k) && typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = Math.floor(v);
    return out;
  };
  const save: CursoSave = { feitos: limpar(raw?.feitos), concluidas: limpar(raw?.concluidas) };
  games.curso = save;
  return save;
}

/**
 * O ponto de liberação: a unidade conta como vencida quando foi concluída.
 * A fase 3 troca isto pela prova de fim de unidade, com nota mínima de 80%.
 */
export function venceu(save: CursoSave, unidade: string): boolean {
  return (save.concluidas[unidade] ?? 0) > 0;
}

/** A primeira unidade é livre; cada outra só abre depois da anterior. */
export function liberada(save: CursoSave, unidade: string): boolean {
  const i = UNIDADES.findIndex((u) => u.id === unidade);
  if (i < 0) return false;
  return i === 0 || venceu(save, (UNIDADES[i - 1] as Unidade).id);
}

export interface Lugar {
  unidade: Unidade;
  /** Índice do bloco onde continuar. */
  bloco: number;
}

/** De onde continuar uma unidade: o primeiro bloco não feito (ou o começo, se já foi toda feita). */
export function ondeContinuar(save: CursoSave, u: Unidade): number {
  const feitos = save.feitos[u.id] ?? 0;
  return feitos >= blocosDa(u).length ? 0 : feitos;
}

/** A próxima lição do curso: a primeira unidade liberada ainda não vencida. Com tudo vencido, nada. */
export function proximaLicao(save: CursoSave): Lugar | null {
  for (const u of UNIDADES) {
    if (!liberada(save, u.id)) return null;
    if (!venceu(save, u.id)) return { unidade: u, bloco: ondeContinuar(save, u) };
  }
  return null;
}

/**
 * Registra o bloco feito. No último, a unidade fica concluída. Devolve `true` quando a unidade
 * acabou de ser concluída agora.
 */
export function registrarBloco(save: CursoSave, u: Unidade, bloco: number): boolean {
  const total = blocosDa(u).length;
  save.feitos[u.id] = Math.max(save.feitos[u.id] ?? 0, Math.min(total, bloco + 1));
  if (bloco + 1 < total) return false;
  save.concluidas[u.id] = (save.concluidas[u.id] ?? 0) + 1;
  return true;
}

/* ───────── Prática ───────── */

export interface ItemPratica {
  /** Único na unidade. */
  id: string;
  tipo: 'palavra' | 'kanji';
  /** A carta que a resposta avalia. */
  carta: string;
  /** O que aparece na pergunta. */
  jp: string;
  kana: string;
  /** Kanji: o caractere em destaque dentro de `jp`. */
  destaque?: string;
  /** A resposta certa (significado da palavra ou leitura do kanji). */
  certa: string;
  /** Respostas que não podem ser alternativa errada (outra leitura do mesmo kanji, o mesmo sentido). */
  evitar: readonly string[];
}

/** O primeiro sentido, para não pôr como errada uma alternativa que quer dizer a mesma coisa. */
const sentido = (pt: string) => (pt.split(/[,;(]/)[0] ?? pt).trim().toLowerCase();

export function itemDaPalavra(p: Palavra): ItemPratica {
  return { id: `w:${p.jp}`, tipo: 'palavra', carta: cartaDaPalavra(p), jp: p.jp, kana: p.kana, certa: p.pt, evitar: [] };
}

export function itemDoKanji(k: KanjiDaUnidade): ItemPratica {
  const p = palavraDoCurso(k.em);
  const todas = new Set<string>();
  for (const u of UNIDADES) for (const x of u.kanji) if (x.k === k.k) todas.add(x.leitura);
  return { id: `k:${k.k}:${k.leitura}`, tipo: 'kanji', carta: cartaDaLeitura(k), jp: k.em, kana: p?.kana ?? k.leitura, destaque: k.k, certa: k.leitura, evitar: [...todas] };
}

/** Todos os itens de prática do curso até a unidade `ate` (inclusive), na ordem. */
export function itensAte(ate: number): ItemPratica[] {
  const out: ItemPratica[] = [];
  for (const u of UNIDADES) {
    if (u.numero > ate) break;
    for (const p of palavrasDa(u)) out.push(itemDaPalavra(p));
    for (const k of u.kanji) out.push(itemDoKanji(k));
  }
  return out;
}

/** Itens do bloco que viram pergunta. */
export function itensDoBloco(b: Bloco): ItemPratica[] {
  if (b.tipo === 'palavras') return b.palavras.map(itemDaPalavra);
  if (b.tipo === 'kanji') return b.kanji.map(itemDoKanji);
  return [];
}

/** Na revisão de nível, quantas perguntas. */
export const PERGUNTAS_DA_REVISAO = 10;

/** Os itens da revisão: os já apresentados, dos menos firmes para os mais firmes. */
export function itensDaRevisao(u: Unidade, cards: Readonly<Record<string, CardState>>, rng: Rng): ItemPratica[] {
  const vistos = itensAte(u.numero - 1).filter((i) => foiApresentado(cards, i.carta));
  const estab = (i: ItemPratica) => cards[i.carta]?.stability ?? 0;
  return shuffle(rng, vistos)
    .sort((a, b) => estab(a) - estab(b))
    .slice(0, PERGUNTAS_DA_REVISAO);
}

export interface Pergunta {
  item: ItemPratica;
  opcoes: string[];
}

/**
 * Monta a pergunta do item. As alternativas erradas saem só de itens do mesmo tipo já
 * apresentados (as do mesmo bloco primeiro) e nunca são outra resposta certa. `n` é quantas
 * opções no total (2 na primeira vez, 3 depois: `opcoesPara` do core/ensino.ts).
 */
export function montarPergunta(item: ItemPratica, doBloco: readonly ItemPratica[], conhecidos: readonly ItemPratica[], cards: Readonly<Record<string, CardState>>, n: number, rng: Rng): Pergunta {
  const proibidas = new Set([item.certa, ...item.evitar]);
  const sentidos = new Set(item.tipo === 'palavra' ? [sentido(item.certa)] : []);
  const erradas: string[] = [];
  const tentar = (lista: readonly ItemPratica[]) => {
    for (const o of shuffle(rng, lista)) {
      if (erradas.length >= n - 1) return;
      if (o.tipo !== item.tipo || o.id === item.id || !foiApresentado(cards, o.carta)) continue;
      if (proibidas.has(o.certa) || erradas.includes(o.certa)) continue;
      if (item.tipo === 'palavra' && sentidos.has(sentido(o.certa))) continue;
      erradas.push(o.certa);
      if (item.tipo === 'palavra') sentidos.add(sentido(o.certa));
    }
  };
  tentar(doBloco);
  tentar(conhecidos);
  return { item, opcoes: shuffle(rng, [item.certa, ...erradas]) };
}
