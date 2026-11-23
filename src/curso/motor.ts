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
 *   miniteste   小テスト: perguntas da unidade com todas as alternativas, sem perder nada
 *   revisao     unidade de revisão: prática com o que já foi visto no nível
 *
 * Depois dos blocos vem a prova da unidade (prova.ts): ela é que libera a seguinte.
 *
 * A aula falada (content/curso/aulas.ts) vem depois das palavras e dos kanji, antes dos cartões de
 * gramática; o exercício de montar frases (com o segundo exemplo de cada ponto), logo depois deles.
 */
import { GRAMATICA, nomeDaUnidade, palavrasDa, UNIDADES, type KanjiDaUnidade, type Nivel, type Nota, type Palavra, type Unidade } from '../content/curso';
import { cardKey } from '../content';
import { AULAS_DO_CURSO } from '../content/curso/aulas';
import { exemplosDaUnidade, leituraDa, type Exemplo, type Leitura } from './exemplos';
import { ditadoDa, lacunasDa } from './exercicios';
import { foiApresentado } from '../core/ensino';
import { shuffle, type Rng } from '../core/rng';
import type { CardState } from '../core/srs';

/* ───────── Blocos ───────── */

export type Bloco =
  | { tipo: 'objetivo'; id: string }
  | { tipo: 'palavras'; id: string; palavras: readonly Palavra[] }
  | { tipo: 'kanji'; id: string; kanji: readonly KanjiDaUnidade[] }
  | { tipo: 'aula'; id: string }
  | { tipo: 'gramatica'; id: string; pontos: readonly string[] }
  | { tipo: 'frases'; id: string; exemplos: readonly Exemplo[] }
  | { tipo: 'completar'; id: string }
  | { tipo: 'ditado'; id: string; exemplos: readonly Exemplo[] }
  | { tipo: 'leitura'; id: string; leitura: Leitura }
  | { tipo: 'notas'; id: string; notas: readonly Nota[] }
  | { tipo: 'dialogo'; id: string; situacao: string }
  | { tipo: 'miniteste'; id: string }
  | { tipo: 'revisao'; id: string };

export type TipoBloco = Bloco['tipo'];

export const NOME_BLOCO: Readonly<Record<TipoBloco, string>> = {
  objetivo: 'Objetivo',
  palavras: 'Vocabulário',
  kanji: 'Kanji',
  aula: 'Aula',
  gramatica: 'Gramática',
  frases: 'Montar frases',
  completar: 'Completar',
  ditado: 'Ditado',
  leitura: 'Leitura',
  notas: 'Cultura',
  dialogo: 'Diálogo',
  miniteste: 'Mini-teste',
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
  // A aula vem depois das palavras e dos kanji: o exemplo dela só usa o que já foi apresentado.
  if (AULAS_DO_CURSO[u.id]) out.push({ tipo: 'aula', id: `${u.id}:aula` });
  if (u.gramatica.length > 0) out.push({ tipo: 'gramatica', id: `${u.id}:gramatica`, pontos: u.gramatica });
  // O primeiro exemplo de cada ponto está no cartão; o exercício usa os outros.
  const paraMontar = u.gramatica.flatMap((g) => exemplosDaUnidade({ ...u, gramatica: [g] }).slice(1));
  if (paraMontar.length > 0) out.push({ tipo: 'frases', id: `${u.id}:frases`, exemplos: paraMontar });
  // Completar e ditado usam todos os exemplos (os do cartão também): ali a frase já foi vista.
  if (lacunasDa(u, () => 0.5).length > 0) out.push({ tipo: 'completar', id: `${u.id}:completar` });
  const ditado = ditadoDa(u);
  if (ditado.length > 0) out.push({ tipo: 'ditado', id: `${u.id}:ditado`, exemplos: ditado });
  const leitura = leituraDa(u);
  if (leitura) out.push({ tipo: 'leitura', id: `${u.id}:leitura`, leitura });
  const notas = u.notas.filter((n) => n.conferida);
  if (notas.length > 0) out.push({ tipo: 'notas', id: `${u.id}:notas`, notas });
  for (const s of u.situacoes ?? []) out.push({ tipo: 'dialogo', id: `${u.id}:dialogo:${s}`, situacao: s });
  out.push({ tipo: 'miniteste', id: `${u.id}:miniteste` });
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
export function outrasLeituras(k: KanjiDaUnidade): { leitura: string; em: string; unidade: string; nome: string }[] {
  const out: { leitura: string; em: string; unidade: string; nome: string }[] = [];
  for (const u of UNIDADES)
    for (const x of u.kanji) if (x.k === k.k && x.leitura !== k.leitura && !out.some((o) => o.leitura === x.leitura)) out.push({ leitura: x.leitura, em: x.em, unidade: u.id, nome: nomeDaUnidade(u) });
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
  const d = GRAMATICA[id] ?? id;
  const i = d.indexOf(': ');
  if (i < 0) return { grande: d, pt: '' };
  const antes = d.slice(0, i);
  const depois = d.slice(i + 2);
  // O japonês fica grande; a explicação em português fica embaixo.
  return /[぀-ヿ一-鿿〜]/u.test(antes) ? { grande: antes, pt: depois } : { grande: depois, pt: antes };
}

/* ───────── Progresso ───────── */

export interface ProvaSave {
  /** Melhor nota, de 0 a 1. */
  melhor: number;
  aprovada: boolean;
  tentativas: number;
  /** Passou pelo nivelamento, sem fazer as partes. */
  nivelamento?: true;
  /** Quando passou pela primeira vez (ms). Vai no certificado do nível. */
  quando?: number;
}

export interface CursoSave {
  /** Unidade → quantos blocos já foram feitos, em ordem. Só cresce. */
  feitos: Record<string, number>;
  /** Unidade → quantas vezes os blocos foram feitos até o fim. */
  concluidas: Record<string, number>;
  /** Unidade → a prova. É ela que libera a unidade seguinte. */
  provas: Record<string, ProvaSave>;
  /** O nome que vai no certificado, como a pessoa escreveu. */
  nome?: string;
  /** Módulo 0: quantos lotes de kana já foram feitos, em ordem. */
  modulo0?: number;
}

export function ensureCursoSave(games: Record<string, unknown>): CursoSave {
  const raw = games.curso as Partial<CursoSave> | undefined;
  const limpar = (o: unknown): Record<string, number> => {
    const out: Record<string, number> = {};
    if (o && typeof o === 'object')
      for (const [k, v] of Object.entries(o)) if (unidadePorId(k) && typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = Math.floor(v);
    return out;
  };
  const provas: Record<string, ProvaSave> = {};
  if (raw?.provas && typeof raw.provas === 'object')
    for (const [k, v] of Object.entries(raw.provas)) {
      if (!unidadePorId(k) || !v || typeof v !== 'object') continue;
      const p = v as Partial<ProvaSave>;
      const melhor = typeof p.melhor === 'number' && Number.isFinite(p.melhor) ? Math.min(1, Math.max(0, p.melhor)) : 0;
      const tentativas = typeof p.tentativas === 'number' && Number.isFinite(p.tentativas) ? Math.max(0, Math.floor(p.tentativas)) : 0;
      const quando = typeof p.quando === 'number' && Number.isFinite(p.quando) && p.quando > 0 ? p.quando : undefined;
      provas[k] = { melhor, aprovada: p.aprovada === true, tentativas, ...(p.nivelamento ? { nivelamento: true as const } : {}), ...(quando ? { quando } : {}) };
    }
  const nome = typeof raw?.nome === 'string' ? raw.nome.trim().slice(0, 60) : '';
  const m0 = typeof raw?.modulo0 === 'number' && Number.isFinite(raw.modulo0) ? Math.max(0, Math.floor(raw.modulo0)) : 0;
  const save: CursoSave = { feitos: limpar(raw?.feitos), concluidas: limpar(raw?.concluidas), provas, ...(nome ? { nome } : {}), ...(m0 ? { modulo0: m0 } : {}) };
  games.curso = save;
  return save;
}

/** O ponto de liberação: a unidade conta como vencida quando a prova dela foi aprovada (80%). */
export function venceu(save: CursoSave, unidade: string): boolean {
  return save.provas[unidade]?.aprovada === true;
}

/** As partes foram feitas até o fim: a prova da unidade pode ser feita. */
export function concluiuBlocos(save: CursoSave, unidade: string): boolean {
  return (save.concluidas[unidade] ?? 0) > 0;
}

/** Guarda o resultado de uma prova. A aprovação não se perde com uma tentativa pior depois. */
export function registrarProva(save: CursoSave, unidade: string, nota: number, aprovada: boolean, agora = Date.now()): void {
  const antes = save.provas[unidade];
  const quando = antes?.quando ?? (aprovada ? agora : undefined);
  save.provas[unidade] = {
    melhor: Math.max(antes?.melhor ?? 0, nota),
    aprovada: aprovada || antes?.aprovada === true,
    tentativas: (antes?.tentativas ?? 0) + 1,
    ...(antes?.nivelamento ? { nivelamento: true as const } : {}),
    ...(quando ? { quando } : {}),
  };
}

/**
 * A primeira unidade é livre; cada outra só abre depois da prova da anterior. Unidade já começada
 * (de antes das provas existirem) continua aberta: progresso feito não se tranca.
 */
export function liberada(save: CursoSave, unidade: string): boolean {
  const i = UNIDADES.findIndex((u) => u.id === unidade);
  if (i < 0) return false;
  return i === 0 || venceu(save, (UNIDADES[i - 1] as Unidade).id) || (save.feitos[unidade] ?? 0) > 0;
}

export interface Lugar {
  unidade: Unidade;
  /** Índice do bloco onde continuar. */
  bloco: number;
  /** As partes estão feitas e falta a prova. */
  prova?: true;
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
    if (!venceu(save, u.id)) return concluiuBlocos(save, u.id) ? { unidade: u, bloco: 0, prova: true } : { unidade: u, bloco: ondeContinuar(save, u) };
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

/**
 * Todos os itens de prática do curso até a unidade de ordem `ate` (inclusive), na ordem. Com
 * `nivel`, só os desse nível (a revisão e o simulado do A2 cobram o A2).
 */
const itensProntos = new Map<string, readonly ItemPratica[]>();

export function itensAte(ate: number, nivel?: Nivel): readonly ItemPratica[] {
  // Os dados não mudam: monta uma vez por corte (a prova e o simulado pedem o mesmo corte muitas vezes).
  const chave = `${ate}:${nivel ?? ''}`;
  const pronto = itensProntos.get(chave);
  if (pronto) return pronto;
  const out: ItemPratica[] = [];
  for (const u of UNIDADES) {
    if (u.ordem > ate) break;
    if (nivel && u.nivel !== nivel) continue;
    for (const p of palavrasDa(u)) out.push(itemDaPalavra(p));
    for (const k of u.kanji) out.push(itemDoKanji(k));
  }
  itensProntos.set(chave, out);
  return out;
}

/** No mini-teste, quantas perguntas da unidade. */
export const PERGUNTAS_DO_MINITESTE = 8;

/** Os itens do mini-teste: um sorteio dos itens da unidade, todos já apresentados nos blocos antes. */
export function itensDoMiniteste(u: Unidade, rng: Rng): ItemPratica[] {
  const daUnidade = [...palavrasDa(u).map(itemDaPalavra), ...u.kanji.map(itemDoKanji)];
  return shuffle(rng, daUnidade).slice(0, PERGUNTAS_DO_MINITESTE);
}

/** Itens do bloco que viram pergunta. */
export function itensDoBloco(b: Bloco): ItemPratica[] {
  if (b.tipo === 'palavras') return b.palavras.map(itemDaPalavra);
  if (b.tipo === 'kanji') return b.kanji.map(itemDoKanji);
  return [];
}

/** Na revisão de nível, quantas perguntas (do próprio nível). */
export const PERGUNTAS_DA_REVISAO = 10;

/** Os itens da revisão: os já apresentados, dos menos firmes para os mais firmes. */
export function itensDaRevisao(u: Unidade, cards: Readonly<Record<string, CardState>>, rng: Rng): ItemPratica[] {
  const vistos = itensAte(u.ordem - 1, u.nivel).filter((i) => foiApresentado(cards, i.carta));
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
