/**
 * Os exemplos de gramática do curso (dados em content/curso/exemplos.ts), montados: a frase, a
 * leitura inteira (para o furigana e a voz) e as peças (para o exercício de montar a frase).
 */
import { palavrasDa, UNIDADES, type Palavra, type Unidade } from '../content/curso';
import { shuffle, type Rng } from '../core/rng';
import type { Trecho } from '../core/sequencia';
import { EXEMPLOS, GRAMATICA_EM_KANA, NOMES, type ExemploLinha } from '../content/curso/exemplos';

const KANJI = /[一-鿿々]/u;

export interface Peca {
  t: string;
  kana: string;
  /** A palavra do vocabulário de que esta forma vem (食べます ← 食べる). */
  base?: string;
}

export interface Exemplo {
  ponto: string;
  unidade: Unidade;
  jp: string;
  kana: string;
  pt: string;
  pecas: Peca[];
}

/** 'jp', 'jp=kana', 'jp<base' ou 'jp=kana<base'. */
export function lerPeca(s: string): { t: string; r?: string; base?: string } {
  const [antes, base] = s.split('<') as [string, string | undefined];
  const [t, r] = antes.split('=') as [string, string | undefined];
  return { t, ...(r ? { r } : {}), ...(base ? { base } : {}) };
}

/** O vocabulário até a unidade; a palavra que volta com outra leitura fica com a mais recente (何人). */
export function vocabularioAte(numero: number): Map<string, Palavra> {
  const m = new Map<string, Palavra>();
  for (const u of UNIDADES) if (u.numero <= numero) for (const p of palavrasDa(u)) m.set(p.jp, p);
  return m;
}

export function kanjiAte(numero: number): Set<string> {
  return new Set(UNIDADES.filter((u) => u.numero <= numero).flatMap((u) => u.kanji.map((k) => k.k)));
}

export function unidadeDoPonto(ponto: string): Unidade | undefined {
  return UNIDADES.find((u) => u.gramatica.includes(ponto));
}

function montar(ponto: string, u: Unidade, linha: ExemploLinha, vocab: Map<string, Palavra>): Exemplo {
  const pecas: Peca[] = linha.pecas.map((s) => {
    const { t, r, base } = lerPeca(s);
    const kana = r ?? (base ? undefined : vocab.get(t)?.kana) ?? t;
    return { t, kana, ...(base ? { base } : {}) };
  });
  const fim = linha.fim ?? '。';
  return {
    ponto,
    unidade: u,
    jp: pecas.map((p) => p.t).join('') + fim,
    kana: pecas.map((p) => p.kana).join('') + fim,
    pt: linha.pt,
    pecas,
  };
}

/** Os exemplos de um ponto, montados com o vocabulário da unidade dele. */
export function exemplosDoPonto(ponto: string): Exemplo[] {
  const u = unidadeDoPonto(ponto);
  const linhas = EXEMPLOS[ponto];
  if (!u || !linhas) return [];
  const vocab = vocabularioAte(u.numero);
  return linhas.map((l) => montar(ponto, u, l, vocab));
}

/** Todos os exemplos da unidade, na ordem da gramática dela. */
export function exemplosDaUnidade(u: Unidade): Exemplo[] {
  return u.gramatica.flatMap(exemplosDoPonto);
}

/** O que está errado num exemplo: peça não ensinada, kanji não ensinado, leitura que falta. */
export function problemasDoExemplo(ponto: string, linha: ExemploLinha): string[] {
  const u = unidadeDoPonto(ponto);
  if (!u) return [`${ponto}: ponto sem unidade`];
  const vocab = vocabularioAte(u.numero);
  const kanji = kanjiAte(u.numero);
  const erros: string[] = [];
  for (const s of linha.pecas) {
    const { t, r, base } = lerPeca(s);
    for (const c of t) if (KANJI.test(c) && !kanji.has(c)) erros.push(`${ponto}: kanji ${c} ainda não ensinado (em ${t})`);
    if (base) {
      if (!vocab.has(base)) erros.push(`${ponto}: a base ${base} de ${t} não é do vocabulário até a unidade ${u.numero}`);
      if (KANJI.test(t) && !r) erros.push(`${ponto}: ${t} tem kanji e precisa da leitura`);
    } else if (!vocab.has(t) && !GRAMATICA_EM_KANA.has(t) && !NOMES.has(t)) {
      erros.push(`${ponto}: ${t} não foi ensinado até a unidade ${u.numero}`);
    }
    if (r && /[^ぁ-ゖー]/u.test(r)) erros.push(`${ponto}: a leitura de ${t} tem de ser em hiragana`);
  }
  return erros;
}

/* ───────── Falas e exercício ───────── */

export const falaDoExemplo = (e: Exemplo): Trecho => ({ tipo: 'jp', fala: { texto: e.jp, voz: 'frase', kana: e.kana } });

export type ParteDaFala = { pt: string } | { jp: string; kana: string };

/**
 * A fala do professor em pedaços: o português da Voz 1 e, entre chaves, o japonês da voz
 * japonesa (`{です}` ou `{食べます|たべます}`). Pedaço de português só com pontuação some.
 */
export function partesDaFala(fala: string): ParteDaFala[] {
  const out: ParteDaFala[] = [];
  for (const [i, pedaco] of fala.split(/[{}]/).entries()) {
    if (i % 2 === 1) {
      const [jp, kana] = pedaco.split('|') as [string, string | undefined];
      out.push({ jp, kana: kana ?? jp });
    } else {
      const t = pedaco.trim().replace(/^[,.:;]\s*/, '');
      // Cortado antes da palavra japonesa, o trecho termina em dois-pontos: a voz anuncia a palavra.
      if (/[\p{L}\p{N}]/u.test(t)) out.push({ pt: /[.!?:]$/.test(t) ? t : `${t.replace(/[,;]$/, '')}:` });
    }
  }
  return out;
}

/** A fala como aparece escrita: o japonês no lugar das chaves. */
export const falaEscrita = (fala: string): string => fala.replace(/\{([^}|]+)(\|[^}]*)?\}/g, '$1');

/** O que o quadro fala: o professor e, se houver, o exemplo com a pausa para repetir. */
export function trechosDoQuadro(fala: string, ex?: Exemplo): Trecho[] {
  const t: Trecho[] = partesDaFala(fala).map((p): Trecho => ('pt' in p ? { tipo: 'pt', texto: p.pt } : { tipo: 'jp', fala: { texto: p.kana, voz: 'palavra', kana: p.kana } }));
  if (ex) t.push(falaDoExemplo(ex), { tipo: 'pausa', vezes: 1.5 }, falaDoExemplo(ex));
  return t;
}

/** As peças do exercício: sem a vírgula (ela entra sozinha) e embaralhadas, nunca já na ordem certa. */
export function pecasParaMontar(e: Exemplo, rng: Rng): { t: string; kana: string; n: number }[] {
  const pecas = e.pecas.filter((p) => p.t !== '、').map((p, n) => ({ t: p.t, kana: p.kana, n }));
  if (pecas.length < 2) return pecas;
  for (let tent = 0; tent < 20; tent++) {
    const s = shuffle(rng, pecas);
    if (s.some((p, i) => p.n !== i)) return s;
  }
  return [...pecas].reverse();
}
