/**
 * Foco da Jornada: quando uma missão abre um jogo, o jogo usa só o conteúdo daquela
 * etapa (estes kanji, estas palavras, esta cena). Sem missão, `foco` é null e cada
 * jogo funciona como sempre.
 *
 * O foco vive só na memória. Recarregar a página ou voltar ao fliperama solta o foco;
 * nada disso é gravado no save.
 */
import { signal } from '@preact/signals';

export interface FocoJogo {
  /** Ids de kanji do KanjiMon (k:日). */
  kanji?: readonly string[];
  /** Ids de palavra (w:水), de qualquer parte do conteúdo. */
  palavras?: readonly string[];
  /** Modo do Kana Beat. */
  kana?: 'hiragana' | 'katakana';
  /** Pontos do Kumitate (wa, no, masu...). */
  pontos?: readonly string[];
  /** Cena da Aventura. */
  cena?: string;
  /** Situação da Conversa. */
  conversa?: string;
  /** Lugar da Cena Viva. */
  lugar?: string;
}

export interface Foco extends FocoJogo {
  /** Missão da Jornada que abriu o jogo. */
  missao: string;
  /** Nome curto do recorte, mostrado no jogo ("Comida e bebida"). */
  titulo: string;
}

export const foco = signal<Foco | null>(null);

/** Recorta uma lista pelo foco. Sem foco (ou recorte vazio), a lista fica como está. */
export function recortar<T>(lista: readonly T[], ids: readonly string[] | undefined, idDe: (x: T) => string): readonly T[] {
  if (!ids || ids.length === 0) return lista;
  const quer = new Set(ids);
  const dentro = lista.filter((x) => quer.has(idDe(x)));
  return dentro.length > 0 ? dentro : lista;
}
