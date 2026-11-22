import { A1 } from './a1';
import type { Palavra, PalavraLinha, Unidade } from './tipos';

export type { KanjiDaUnidade, Nota, Palavra, Unidade } from './tipos';
export { GRAMATICA_N5 } from './n5';

export const UNIDADES: readonly Unidade[] = [...A1];

export function lerPalavra(linha: PalavraLinha): Palavra {
  const [jp = '', kana = '', pt = '', nota] = linha.split('|');
  return nota ? { jp, kana, pt, nota } : { jp, kana, pt };
}

export function palavrasDa(u: Unidade): Palavra[] {
  return u.palavras.map(lerPalavra);
}
