import { describe, expect, it } from 'vitest';
import { teclaDe } from '../src/core/teclas';

function evento(init: KeyboardEventInit & { keyCode?: number }, alvo?: HTMLElement): KeyboardEvent {
  const e = new KeyboardEvent('keydown', init);
  if (init.keyCode !== undefined) Object.defineProperty(e, 'keyCode', { value: init.keyCode });
  if (alvo) Object.defineProperty(e, 'target', { value: alvo });
  return e;
}

describe('tecla de jogo com o IME japonês do Windows', () => {
  it('tecla comum passa como está', () => {
    expect(teclaDe(evento({ key: 'Enter' }))).toBe('Enter');
    expect(teclaDe(evento({ key: 'k' }))).toBe('k');
  });

  it('com o IME ligado, "Process" (229) vira a tecla pela posição', () => {
    // Antes os números das alternativas e os atalhos de letra não respondiam com o IME em hiragana.
    expect(teclaDe(evento({ key: 'Process', code: 'Digit2', keyCode: 229 }))).toBe('2');
    expect(teclaDe(evento({ key: 'Process', code: 'Numpad3', keyCode: 229 }))).toBe('3');
    expect(teclaDe(evento({ key: 'Process', code: 'KeyG', keyCode: 229 }))).toBe('g');
    expect(teclaDe(evento({ key: 'Unidentified', code: 'Enter', keyCode: 229 }))).toBe('Enter');
  });

  it('Esc e Enter que pertencem à conversão do IME são ignorados', () => {
    // O Esc que desfaz um kana na Conversa encerrava a conversa inteira.
    expect(teclaDe(evento({ key: 'Escape', isComposing: true }))).toBeNull();
    expect(teclaDe(evento({ key: 'Enter', isComposing: true }))).toBeNull();
  });

  it('num campo de texto, a tecla que abre a composição fica com o IME', () => {
    const campo = document.createElement('input');
    expect(teclaDe(evento({ key: 'Process', code: 'Digit1', keyCode: 229 }, campo))).toBeNull();
  });

  it('número de largura dupla vira o comum', () => {
    expect(teclaDe(evento({ key: '１' }))).toBe('1');
  });
});
