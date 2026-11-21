import type { Kanji } from '../../content';
import { FX_COR } from '../../core/fx';
import type { Rarity } from './engine';

/**
 * As artes das cartas continuam hospedadas junto do KanjiMon original. Em 21/11/2026 ele foi para
 * /classic/ e o endereço antigo (/assets/) passou a dar 404: tests/kanjimon-arte.test.ts confere o endereço.
 */
export const ART_BASE = 'https://kanjimon.online/classic/assets/';

export function artUrl(k: Kanji, rarity: Rarity): string {
  return `${ART_BASE}${k.n}_${rarity}.jpg`;
}

/** Faíscas de cada raridade: azul nas comuns, rosa e dourado nas raras. */
export const RARITY_COLORS: Record<Rarity, string[]> = {
  c: [FX_COR.marca, FX_COR.neutro],
  r: [FX_COR.marca, FX_COR.marca, FX_COR.bom],
  sr: [FX_COR.festa, FX_COR.marca],
  ur: [FX_COR.raro, FX_COR.festa, FX_COR.marca],
};
