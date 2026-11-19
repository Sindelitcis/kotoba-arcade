import type { Kanji } from '../../content';
import { INK } from '../../core/fx';
import type { Rarity } from './engine';

/** As artes das cartas continuam hospedadas junto do KanjiMon original. */
export const ART_BASE = 'https://kanjimon.online/assets/';

export function artUrl(k: Kanji, rarity: Rarity): string {
  return `${ART_BASE}${k.n}_${rarity}.jpg`;
}

/** Respingo de tinta de cada raridade: preto nas comuns, vermelho e dourado nas raras. */
export const RARITY_COLORS: Record<Rarity, string[]> = {
  c: [INK.tinta],
  r: [INK.tinta, INK.tinta, INK.shu],
  sr: [INK.shu, INK.tinta],
  ur: [INK.shu, INK.kin, INK.tinta],
};
