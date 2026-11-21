/**
 * O que dá para aprofundar: um kanji, uma palavra, um kana, um ponto de gramática, uma
 * expressão pronta ou uma cena inteira. Os jogos dizem o que está na tela com um `Alvo`;
 * a memória (as cartas do FSRS) também vira `Alvo`, pela chave da carta.
 */
import { parseCardKey } from '../index';

export type Alvo =
  /** `c`: o caractere (山). Vale para kanji do KanjiMon, da escola e do Kanji em peças. */
  | { t: 'kanji'; c: string }
  /** `id`: o id da palavra nos jogos (`w:山道`). */
  | { t: 'palavra'; id: string }
  /** `id`: o id do kana nos jogos (`a:あ`, `ak:ア`). */
  | { t: 'kana'; id: string }
  /** `id`: ponto do Kumitate (`wa`, `masu`) ou lição da escola (`g-desu`). */
  | { t: 'gramatica'; id: string }
  /** `id`: expressão da escola (`e-ohayou`). */
  | { t: 'expressao'; id: string }
  /** `id`: `aventura:<cena>`, `conversa:<cena>`, `lugar:<lugar da Cena Viva>` ou `situacao:<id>`. */
  | { t: 'cena'; id: string };

export type TipoAlvo = Alvo['t'];

/** Chave estável, para comparar e guardar. */
export function chaveDoAlvo(a: Alvo): string {
  return a.t === 'kanji' ? `kanji:${a.c}` : `${a.t}:${a.id}`;
}

export function mesmoAlvo(a: Alvo, b: Alvo): boolean {
  return chaveDoAlvo(a) === chaveDoAlvo(b);
}

/**
 * O item de uma carta da memória. Carta que não é de um item estudável (progresso de lição,
 * por exemplo) devolve `null`.
 */
export function alvoDaCarta(chave: string): Alvo | null {
  if (!chave.includes('#')) return null;
  const { itemId } = parseCardKey(chave);
  if (itemId.startsWith('k:')) return { t: 'kanji', c: itemId.slice(2) };
  if (itemId.startsWith('w:')) return { t: 'palavra', id: itemId };
  if (itemId.startsWith('a:') || itemId.startsWith('ak:')) return { t: 'kana', id: itemId };
  if (itemId.startsWith('g:')) return { t: 'gramatica', id: itemId.slice(2) };
  if (itemId.startsWith('gram:')) return { t: 'gramatica', id: itemId.slice(5) };
  if (itemId.startsWith('expr:')) return { t: 'expressao', id: itemId.slice(5) };
  return null;
}
