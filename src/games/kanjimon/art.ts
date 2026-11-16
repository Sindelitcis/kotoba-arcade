import type { Kanji } from '../../content';
import type { Rarity } from './engine';

/** As artes das cartas continuam hospedadas junto do KanjiMon original. */
export const ART_BASE = 'https://kanjimon.online/assets/';

export function artUrl(k: Kanji, rarity: Rarity): string {
  return `${ART_BASE}${k.n}_${rarity}.jpg`;
}

export const RARITY_COLORS: Record<Rarity, string[]> = {
  c: ['#9aa5b1', '#cbd2d9'],
  r: ['#4cc9f0', '#a0e7ff'],
  sr: ['#ffd166', '#fff3b0'],
  ur: ['#ff6b9d', '#ffd166', '#b388ff'],
};
