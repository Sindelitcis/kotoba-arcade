/**
 * Qual tecla o jogador apertou, mesmo com o teclado japonês do Windows ligado.
 *
 * Com o IME ativo o Chrome não manda a letra: `key` vem como "Process", `keyCode` como 229
 * e às vezes `isComposing` vem ligado. A tecla física continua em `code` ("KeyT", "Space"),
 * então é dali que a letra sai. No modo de entrada em kana, `key` traz o kana ("か")
 * e a letra também sai de `code`.
 */
export type KeyLike = Pick<KeyboardEvent, 'key' | 'code' | 'keyCode' | 'isComposing'>;

const BY_CODE: Record<string, string> = {
  Space: ' ',
  Backspace: 'Backspace',
  Enter: 'Enter',
  NumpadEnter: 'Enter',
  Escape: 'Escape',
  Minus: '-',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
};

export function normalKey(e: KeyLike): string {
  if (/^[a-zA-Z]$/.test(e.key)) return e.key;
  const ime = e.key === 'Process' || e.keyCode === 229 || e.isComposing;
  const letter = /^Key([A-Z])$/.exec(e.code ?? '');
  // Letra que não é do alfabeto latino (kana, outro layout) ou tecla engolida pelo IME: vale a tecla física.
  if (letter && (ime || (e.key.length === 1 && !/^[\x20-\x7e]$/.test(e.key)))) return (letter[1] as string).toLowerCase();
  if (ime) return BY_CODE[e.code ?? ''] ?? e.key;
  return e.key;
}

/** A tecla serve para digitar a leitura? */
export function isTypingKey(key: string): boolean {
  return /^[a-zA-Z'-]$/.test(key);
}
