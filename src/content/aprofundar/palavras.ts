/**
 * Todas as palavras do arcade num lugar só, para o Aprofundar achar a família de um kanji,
 * as frases em que uma palavra aparece e o acento dela.
 */
import { KANJI, WORDS, type Word } from '../index';
import { DAILY_WORDS } from '../vida';
import { JORNADA_WORDS, PALAVRAS_TEMA, type PalavraTema } from '../escola';
import { IMAGEM_WORDS, PALAVRAS_COR } from '../imagens';
import { KANJI_PECAS } from '../../games/pecas/dados';
import { hasKanji } from '../../core/kana';

/** Palavra com id de jogo (tem carta) ou só de exemplo (palavra do Kanji em peças). */
export interface PalavraSimples {
  id?: string;
  jp: string;
  kana: string;
  pt: string;
}

const LISTAS: readonly (readonly Word[])[] = [WORDS, DAILY_WORDS, JORNADA_WORDS, IMAGEM_WORDS, Object.values(PALAVRAS_COR)];

export const TODAS_AS_PALAVRAS: readonly Word[] = (() => {
  const vistas = new Map<string, Word>();
  for (const lista of LISTAS) for (const w of lista) if (!vistas.has(w.id)) vistas.set(w.id, w);
  return [...vistas.values()];
})();

const porId = new Map(TODAS_AS_PALAVRAS.map((w) => [w.id, w]));

export function palavraPorId(id: string): Word | undefined {
  return porId.get(id);
}

/** A palavra como a escola-japones descreve (nota, grupo do verbo, pronúncia, parecidas). */
export function palavraDaEscola(id: string): PalavraTema | undefined {
  return PALAVRAS_TEMA.find((p) => p.word?.id === id);
}

/** Palavras do Kanji em peças que não estão em nenhuma outra lista. */
export const PALAVRAS_DAS_PECAS: readonly PalavraSimples[] = (() => {
  const conhecidas = new Set(TODAS_AS_PALAVRAS.map((w) => w.jp));
  const out = new Map<string, PalavraSimples>();
  for (const k of KANJI_PECAS) {
    const p = k.palavra;
    if (!conhecidas.has(p.jp) && !out.has(p.jp)) out.set(p.jp, { jp: p.jp, kana: p.kana, pt: p.pt });
  }
  return [...out.values()];
})();

const TUDO: readonly PalavraSimples[] = [...TODAS_AS_PALAVRAS, ...PALAVRAS_DAS_PECAS];

/** Palavras que usam o kanji, as do dia a dia primeiro (com carta nos jogos), sem repetir. */
export function familia(char: string): PalavraSimples[] {
  return TUDO.filter((w) => w.jp.includes(char) && w.jp !== char);
}

/** Palavras da mesma família de uma palavra: as que dividem algum kanji com ela. */
export function parentes(w: PalavraSimples): PalavraSimples[] {
  const chars = [...w.jp].filter((c) => hasKanji(c));
  return TUDO.filter((o) => o.jp !== w.jp && chars.some((c) => o.jp.includes(c)));
}

/** Tudo o que o Aprofundar pode mostrar com acento: as palavras e os kanji lidos sozinhos. */
export function palavrasComAcento(): { jp: string; kana: string }[] {
  const out = new Map<string, { jp: string; kana: string }>();
  for (const w of TUDO) out.set(`${w.jp}|${w.kana}`, { jp: w.jp, kana: w.kana });
  for (const k of KANJI) out.set(`${k.kanji}|${k.reading}`, { jp: k.kanji, kana: k.reading });
  return [...out.values()];
}
