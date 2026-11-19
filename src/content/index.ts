/**
 * Conteúdo de estudo, compartilhado por todos os jogos.
 * Hoje: os 94 kanji do KanjiMon original com palavras e frases, mais a tabela de kana.
 */
import raw from './data/kanjimon.raw.json';
import { hasKanji, kanaToRomaji, kataToHira, KANA_TABLE, romajiToHiragana } from '../core/kana';
import { LEITURAS, type LeituraKanji } from './leituras';

export interface Word {
  id: string;
  jp: string;
  /** Leitura em kana (hiragana, ou katakana onde a palavra é escrita assim). */
  kana: string;
  romaji: string;
  pt: string;
  /** Kanji desta coleção que aparecem na palavra. */
  kanji: string[];
}

export interface Sentence {
  jp: string;
  romaji: string;
  pt: string;
}

export interface Kanji {
  id: string;
  /** Número no KanjiMon original (define a arte da carta). */
  n: number;
  kanji: string;
  /** Significados com acento, para mostrar. O primeiro é o principal. */
  pt: string[];
  /** Leituras em romaji (Hepburn). */
  readings: string[];
  /** Leitura falada quando o kanji aparece sozinho na carta, em kana (九 = きゅう). */
  reading: string;
  /** Outras leituras comuns, em kana, para mostrar junto. */
  otherReadings: string[];
  story: string;
  words: Word[];
  sentences: Sentence[];
}

/** Os dados antigos guardavam significados sem acento (eram gabarito de digitação). */
const ACCENTS: Record<string, string> = {
  tres: 'três', agua: 'água', mes: 'mês', arvore: 'árvore', ceu: 'céu', mae: 'mãe', mao: 'mão', pe: 'pé',
  crianca: 'criança', circulo: 'círculo', paraiso: 'paraíso', ferias: 'férias', atras: 'atrás', espaco: 'espaço',
  lider: 'líder', lingua: 'língua', historia: 'história', veiculo: 'veículo', espirito: 'espírito',
  estacao: 'estação', 'estacao de trem': 'estação de trem', pais: 'país', nacao: 'nação', proximo: 'próximo',
  'ficar de pe': 'ficar de pé',
};

/** Leituras que a conversão automática de romaji erraria. */
const KANA_OVERRIDES: Record<string, string> = {
  円安: 'えんやす',
  親友: 'しんゆう',
  東南アジア: 'とうなんアジア',
  生ビール: 'なまビール',
};

/** Os dados antigos repetiam leituras em grafia kunrei (iti, tuki). Fica só a Hepburn. */
const isHepburn = (r: string) => kanaToRomaji(romajiToHiragana(r)).replace(/'/g, '') === r;

function buildKana(jp: string, romaji: string): string {
  const fixed = KANA_OVERRIDES[jp];
  if (fixed) return fixed;
  if (!hasKanji(jp) && !/[0-9０-９]/.test(jp)) return jp;
  return romajiToHiragana(romaji);
}

function leituraDe(kanji: string): LeituraKanji {
  const l = LEITURAS[kanji];
  if (!l) throw new Error(`kanji sem leitura conferida em leituras.ts: ${kanji}`);
  return l;
}

function build(): { kanji: Kanji[]; words: Word[] } {
  const wordsByJp = new Map<string, Word>();
  const known = new Set(raw.map((k) => k.kanji));
  const kanji: Kanji[] = raw.map((k) => {
    const words = k.words.map((w) => {
      let word = wordsByJp.get(w.jp);
      if (!word) {
        word = {
          id: `w:${w.jp}`,
          jp: w.jp,
          kana: buildKana(w.jp, w.romaji),
          romaji: w.romaji,
          pt: w.pt,
          kanji: [...w.jp].filter((c) => known.has(c)),
        };
        wordsByJp.set(w.jp, word);
      }
      return word;
    });
    return {
      id: `k:${k.kanji}`,
      n: k.n,
      kanji: k.kanji,
      pt: k.pt.filter((s) => !/^\d+$/.test(s)).map((s) => ACCENTS[s] ?? s),
      readings: k.romaji.filter(isHepburn),
      reading: leituraDe(k.kanji).sozinho,
      otherReadings: leituraDe(k.kanji).outras,
      story: k.story,
      words,
      sentences: k.sentences,
    };
  });
  return { kanji, words: [...wordsByJp.values()] };
}

const built = build();

export const KANJI: readonly Kanji[] = built.kanji;
export const WORDS: readonly Word[] = built.words;

const kanjiById = new Map(KANJI.map((k) => [k.id, k]));
const wordById = new Map(WORDS.map((w) => [w.id, w]));

export function getKanji(id: string): Kanji {
  const k = kanjiById.get(id);
  if (!k) throw new Error(`kanji desconhecido: ${id}`);
  return k;
}

export function getWord(id: string): Word {
  const w = wordById.get(id);
  if (!w) throw new Error(`palavra desconhecida: ${id}`);
  return w;
}

/** Habilidades treinadas. A chave da carta no save é `${itemId}#${skill}`. */
export type Skill = 'meaning' | 'reading' | 'recall';

export function cardKey(itemId: string, skill: Skill): string {
  return `${itemId}#${skill}`;
}

export function parseCardKey(key: string): { itemId: string; skill: Skill } {
  const i = key.lastIndexOf('#');
  return { itemId: key.slice(0, i), skill: key.slice(i + 1) as Skill };
}

export interface Kana {
  id: string;
  romaji: string;
  hira: string;
  kata: string;
}

export const KANA: readonly Kana[] = KANA_TABLE.map((k) => ({ id: `a:${k.hira}`, ...k }));

export { kataToHira };
