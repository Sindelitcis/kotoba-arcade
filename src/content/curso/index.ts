import { A1 } from './a1';
import { A2 } from './a2';
import { GRAMATICA_N4 } from './n4';
import { GRAMATICA_N5 } from './n5';
import type { Nivel, Palavra, PalavraLinha, Unidade } from './tipos';

export type { KanjiDaUnidade, Nivel, Nota, Palavra, Unidade } from './tipos';
export { GRAMATICA_N4, GRAMATICA_N5 };

/** Os níveis em ordem, e a lista de gramática do JLPT que cada um cobre. */
export const NIVEIS: readonly { nivel: Nivel; jlpt: 'N5' | 'N4'; gramatica: Readonly<Record<string, string>> }[] = [
  { nivel: 'A1', jlpt: 'N5', gramatica: GRAMATICA_N5 },
  { nivel: 'A2', jlpt: 'N4', gramatica: GRAMATICA_N4 },
];

/** Todos os pontos de gramática do curso, de todos os níveis. */
export const GRAMATICA: Readonly<Record<string, string>> = { ...GRAMATICA_N5, ...GRAMATICA_N4 };

export const UNIDADES: readonly Unidade[] = [...A1, ...A2].map((u, i) => ({ ...u, ordem: i + 1 }));

/** O JLPT que o nível cobre. */
export const jlptDo = (nivel: Nivel): 'N5' | 'N4' => NIVEIS.find((n) => n.nivel === nivel)?.jlpt ?? 'N5';

/** A unidade que vem depois desta no curso (pode ser a primeira do nível seguinte). */
export const seguinteDe = (u: Unidade): Unidade | null => UNIDADES[u.ordem] ?? null;

/** O que abre quando a prova da unidade passa: "a unidade 5 abre", "o A1 fica completo e o A2 começa". */
export function oQueAbre(u: Unidade): string {
  const s = seguinteDe(u);
  if (!s) return `o ${u.nivel} fica completo`;
  return s.nivel === u.nivel ? `a unidade ${s.numero} abre` : `o ${u.nivel} fica completo e o ${s.nivel} começa`;
}

/** "unidade 4" no A1; "unidade 4 do A2" nos outros níveis. */
export function nomeDaUnidade(u: Pick<Unidade, 'nivel' | 'numero'>): string {
  return u.nivel === 'A1' ? `unidade ${u.numero}` : `unidade ${u.numero} do ${u.nivel}`;
}

/** O mesmo, no começo da frase: "Unidade 4 do A2". */
export const NomeDaUnidade = (u: Pick<Unidade, 'nivel' | 'numero'>): string => {
  const n = nomeDaUnidade(u);
  return n[0]!.toUpperCase() + n.slice(1);
};

export function lerPalavra(linha: PalavraLinha): Palavra {
  const [jp = '', kana = '', pt = '', nota] = linha.split('|');
  return nota ? { jp, kana, pt, nota } : { jp, kana, pt };
}

export function palavrasDa(u: Pick<Unidade, 'palavras'>): Palavra[] {
  return u.palavras.map(lerPalavra);
}
