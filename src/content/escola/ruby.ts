/**
 * Marcação de texto japonês com furigana.
 *
 * Formato: kanji com leitura entre chaves, palavras separadas por espaço.
 *   "{私|わたし} は {会社員|かいしゃいん} です。"
 *
 * Os espaços marcam onde termina cada palavra. Eles servem para gerar o
 * romaji e a opção "separar palavras"; na exibição normal são removidos,
 * como no japonês escrito.
 */

export interface Segmento {
  texto: string;
  /** Leitura em kana quando o segmento tem kanji. */
  leitura?: string;
}

/** Uma palavra (bloco entre espaços) dividida em segmentos. */
export type Palavra = Segmento[];

const PADRAO = /\{([^|{}]+)\|([^|{}]+)\}/g;

function segmentar(bloco: string): Segmento[] {
  const segmentos: Segmento[] = [];
  let ultimo = 0;
  for (const m of bloco.matchAll(PADRAO)) {
    const inicio = m.index;
    if (inicio > ultimo) segmentos.push({ texto: bloco.slice(ultimo, inicio) });
    segmentos.push({ texto: m[1] ?? '', leitura: m[2] ?? '' });
    ultimo = inicio + m[0].length;
  }
  if (ultimo < bloco.length) segmentos.push({ texto: bloco.slice(ultimo) });
  return segmentos;
}

export function palavras(marcado: string): Palavra[] {
  return marcado.trim().split(/\s+/).filter(Boolean).map(segmentar);
}

/** Texto como é escrito em japonês: com kanji e sem espaços. */
export function textoSimples(marcado: string): string {
  return palavras(marcado)
    .map((p) => p.map((s) => s.texto).join(''))
    .join('');
}

/** Leitura em kana, com espaço entre as palavras. */
export function leitura(marcado: string): string {
  return palavras(marcado)
    .map((p) => p.map((s) => s.leitura ?? s.texto).join(''))
    .join(' ');
}

/** Leitura em kana sem espaços (para áudio e comparação). */
export function leituraContinua(marcado: string): string {
  return leitura(marcado).replace(/\s+/g, '');
}

/** Lista de problemas de marcação, usada nos testes de conteúdo. */
export function problemasDeMarcacao(marcado: string): string[] {
  const problemas: string[] = [];
  const semMarcas = marcado.replace(PADRAO, '');
  if (/[{}|]/.test(semMarcas)) problemas.push('chaves ou barra soltas');
  return problemas;
}
