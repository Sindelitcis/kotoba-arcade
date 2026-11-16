/** Nível, dias jogados e o medidor "quanto eu já leio". Funções puras sobre o save. */
import { cardKey, KANJI, WORDS } from '../content';
import type { SaveData } from './save';
import { isKnown, type CardState } from './srs';

export function dayKey(now: number): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** XP necessário para sair do nível `level` (1, 2, 3...). Cresce devagar. */
export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 60;
}

export function levelInfo(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let rest = xp;
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level++;
  }
  return { level, into: rest, need: xpForLevel(level) };
}

/** Marca o dia de hoje como jogado. Devolve true se foi a primeira vez no dia. */
export function markPlayed(save: SaveData, now: number): boolean {
  const today = dayKey(now);
  if (save.profile.daysPlayed.includes(today)) return false;
  save.profile.daysPlayed.push(today);
  return true;
}

/**
 * Ritmo recente em vez de sequência que zera: quantos dos últimos `span` dias
 * tiveram jogo. Faltar um dia tira um ponto de sete, não apaga tudo.
 */
export function recentDays(save: SaveData, now: number, span = 7): boolean[] {
  const played = new Set(save.profile.daysPlayed);
  const out: boolean[] = [];
  for (let i = span - 1; i >= 0; i--) out.push(played.has(dayKey(now - i * 86_400_000)));
  return out;
}

export interface ReadingMeter {
  kanjiKnown: number;
  kanjiSeen: number;
  kanjiTotal: number;
  wordsKnown: number;
  wordsSeen: number;
  wordsTotal: number;
}

export function readingMeter(cards: Readonly<Record<string, CardState>>): ReadingMeter {
  const m: ReadingMeter = {
    kanjiKnown: 0,
    kanjiSeen: 0,
    kanjiTotal: KANJI.length,
    wordsKnown: 0,
    wordsSeen: 0,
    wordsTotal: WORDS.length,
  };
  for (const k of KANJI) {
    const c = cards[cardKey(k.id, 'meaning')];
    if (c) m.kanjiSeen++;
    if (isKnown(c)) m.kanjiKnown++;
  }
  for (const w of WORDS) {
    const c = cards[cardKey(w.id, 'reading')] ?? cards[cardKey(w.id, 'meaning')];
    if (c) m.wordsSeen++;
    if (isKnown(cards[cardKey(w.id, 'reading')]) || isKnown(cards[cardKey(w.id, 'meaning')])) m.wordsKnown++;
  }
  return m;
}
