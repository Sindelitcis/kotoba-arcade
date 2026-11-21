/**
 * Que ponto de gramática aparece numa frase do jogo (Aventura, Conversa, Cena Viva).
 * Só os padrões que não enganam: a ponta do verbo e o を. は, に e で ficam de fora,
 * porque aparecem dentro de palavras (でした, には, こんにちは) e o palpite sairia errado.
 */
import type { Alvo } from './alvo';

/** Cada padrão olha a frase sem as pontas mais longas já achadas (ています tem ます dentro). */
const PADROES: readonly [RegExp, string][] = [
  [/[てで]ください/g, 'te'],
  [/[てで](います|いました|いる|る)/g, 'teiru'],
  [/たい(です|。|$)/g, 'tai'],
  [/ました/g, 'mashita'],
  [/ま(す|せん)/g, 'masu'],
  [/を/g, 'wo'],
];

/** Os pontos de gramática da frase, o mais específico primeiro. */
export function gramaticaDaFrase(texto: string): Alvo[] {
  const out: Alvo[] = [];
  let resto = texto;
  for (const [re, id] of PADROES) {
    if (!resto.match(re)) continue;
    out.push({ t: 'gramatica', id });
    resto = resto.replace(re, '・');
  }
  return out;
}
