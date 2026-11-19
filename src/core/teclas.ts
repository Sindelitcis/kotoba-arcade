/**
 * Tecla de jogo a partir de um evento de teclado, à prova do IME japonês do Windows.
 *
 * Com o IME ligado, o navegador manda `key: 'Process'` (keyCode 229) em vez da letra,
 * e o Enter, o Esc e o espaço que confirmam ou cancelam a conversão chegam com
 * `isComposing`. Sem este filtro, o Esc que desfaz um kana tirava o jogador da tela
 * e os números das alternativas não respondiam.
 */
import { toHalfWidth } from './kana';

const CODES: Record<string, string> = {
  Enter: 'Enter',
  NumpadEnter: 'Enter',
  Space: ' ',
  Escape: 'Escape',
  Tab: 'Tab',
  Backspace: 'Backspace',
  // O traço do ー no Kana Beat.
  Minus: '-',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
};

/**
 * Campo de digitar que é o próprio jogo (a caixa do Kana Beat): tudo que chega nele é
 * tecla de jogo, mesmo com o IME ligado. Marque com `data-tecla-jogo`.
 */
export function campoDoJogo(alvo: EventTarget | null): boolean {
  return !!alvo && typeof (alvo as HTMLElement).tagName === 'string' && (alvo as HTMLElement).dataset?.teclaJogo !== undefined;
}

function editavel(alvo: EventTarget | null): boolean {
  if (!alvo || typeof (alvo as HTMLElement).tagName !== 'string') return false;
  if (campoDoJogo(alvo)) return false;
  const el = alvo as HTMLElement;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

/** Tecla pela posição física (KeyA → a, Digit1 → 1). */
function pelaPosicao(code: string): string | null {
  const letra = /^Key([A-Z])$/.exec(code);
  if (letra) return (letra[1] as string).toLowerCase();
  const numero = /^(?:Digit|Numpad)(\d)$/.exec(code);
  if (numero) return numero[1] as string;
  return CODES[code] ?? null;
}

/**
 * Devolve a tecla que o jogo deve tratar, ou `null` quando o evento pertence ao IME
 * (o jogador está escrevendo em japonês num campo e a tecla é da conversão).
 * Letras e números de largura dupla (１, Ａ) viram os comuns.
 */
export function teclaDe(e: KeyboardEvent): string | null {
  const doJogo = campoDoJogo(e.target);
  const processo = e.key === 'Process' || e.keyCode === 229;
  // No campo do próprio jogo, a composição do IME não conta: vale a tecla física.
  if (e.isComposing && !doJogo) return null;
  if (e.isComposing && !processo) return pelaPosicao(e.code) ?? (e.key.length === 1 ? toHalfWidth(e.key) : e.key);
  if (processo) {
    // Num campo de texto, a tecla vai começar uma composição: é do IME, não do jogo.
    if (editavel(e.target)) return null;
    return pelaPosicao(e.code);
  }
  return e.key.length === 1 ? toHalfWidth(e.key) : e.key;
}
