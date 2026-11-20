/**
 * Peças das aulas faladas do modo Ouvir. Uma aula é uma lista de trechos: o professor em
 * português, o exemplo em japonês, a pausa para repetir e o exemplo de novo.
 */
import { palavrasDoTema, TEMAS, type PalavraTema } from '../content/escola';
import type { Marcado } from '../content/escola/tipos';
import type { FalaJp, Trecho } from '../core/sequencia';
import { falaComKanji, falaDaPalavra, falaFrase, type FalaQuadro } from '../jornada/licoes';

export interface Aula {
  /** Mesmo id da lição da Jornada (ou `ouvir:...` para as que não têm lição). */
  id: string;
  titulo: string;
  trechos: readonly Trecho[];
}

/** O professor fala. */
export const pt = (texto: string): Trecho => ({ tipo: 'pt', texto });

/** Japonês já pronto (palavra, kanji, frase de um quadro). */
export const ja = (fala: FalaJp | FalaQuadro): Trecho => ({ tipo: 'jp', fala });

/** Frase em japonês marcado ({漢字|かんじ} e espaço entre palavras). */
export const frase = (jp: Marcado): Trecho => ja(falaFrase(jp));

/** Palavra solta em japonês marcado, gravada na voz de palavra. */
export const palavra = (jp: Marcado): Trecho => ja(falaComKanji(jp));

const vocabulario = new Map<string, PalavraTema>(Object.keys(TEMAS).flatMap((t) => palavrasDoTema(t).map((p): [string, PalavraTema] => [p.palavra.id, p])));

/** Palavra das lições de vocabulário, pelo id (`v-kitte`): a mesma gravação da lição. */
export function vocab(id: string): Trecho {
  const p = vocabulario.get(id);
  if (!p) throw new Error(`palavra desconhecida: ${id}`);
  return ja(falaDaPalavra(p));
}

/** Kana solto (uma partícula dita sozinha): a gravação do kana, na voz de palavra. */
export const kana = (k: string): Trecho => ja({ texto: k, voz: 'palavra', kana: k });

const PAUSA: Trecho = { tipo: 'pausa', vezes: 1.5 };
/** Pausa para pensar antes da resposta, na revisão: um pouco mais longa. */
const PAUSA_PENSAR: Trecho = { tipo: 'pausa', vezes: 2 };

/** Japonês, pausa para repetir em voz alta, japonês de novo. */
export function repetir(j: Trecho): Trecho[] {
  return [j, PAUSA, j];
}

/** Explica em português e depois o japonês, com a pausa para repetir. */
export function ensinar(texto: string, j: Trecho): Trecho[] {
  return [pt(texto), ...repetir(j)];
}

/** Revisão: o português, um tempo para responder e a resposta em japonês. */
export function perguntar(texto: string, j: Trecho): Trecho[] {
  return [pt(texto), PAUSA_PENSAR, j];
}

/** Ordem fixa e espalhada, sempre a mesma para a mesma aula (a revisão não segue a ordem do ensino). */
export function embaralhar<T>(itens: readonly T[]): T[] {
  if (itens.length < 3) return [...itens].reverse();
  const out: T[] = [];
  for (let passo = 0; passo < 2; passo++) for (let i = passo; i < itens.length; i += 2) out.push(itens[i] as T);
  return out.reverse();
}

/** Segundos aproximados da aula, para mostrar antes de começar. */
export function duracao(trechos: readonly Trecho[]): number {
  let s = 0;
  let ultimo = 1.5;
  for (const t of trechos) {
    if (t.tipo === 'pt') s += 0.9 + t.texto.length * 0.065;
    else if (t.tipo === 'jp') {
      ultimo = 0.5 + t.fala.kana.length * 0.16;
      s += ultimo;
    } else s += Math.min(8, Math.max(1.6, t.vezes * ultimo)) + 0.4;
  }
  return s;
}
