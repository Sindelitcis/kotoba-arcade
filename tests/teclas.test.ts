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

  it('no Kana Beat, letras, traço, espaço e apagar chegam com o IME ligado', () => {
    // Bug de 19/11/2026: com o IME em hiragana não dava para digitar nada no Kana Beat.
    expect(teclaDe(evento({ key: 'Process', code: 'KeyT', keyCode: 229 }))).toBe('t');
    expect(teclaDe(evento({ key: 'Process', code: 'Minus', keyCode: 229 }))).toBe('-');
    expect(teclaDe(evento({ key: 'Process', code: 'Space', keyCode: 229 }))).toBe(' ');
    expect(teclaDe(evento({ key: 'Process', code: 'Backspace', keyCode: 229 }))).toBe('Backspace');
  });

  it('número de largura dupla vira o comum', () => {
    expect(teclaDe(evento({ key: '１' }))).toBe('1');
  });

  it('no campo do próprio jogo (data-tecla-jogo), a tecla vale mesmo no meio da composição', () => {
    // A caixa do Kana Beat recusava a tecla quando o IME marcava composição, e o Rafael não conseguia digitar.
    const caixa = document.createElement('input');
    caixa.dataset.teclaJogo = '';
    expect(teclaDe(evento({ key: 'Process', code: 'KeyS', keyCode: 229, isComposing: true }, caixa))).toBe('s');
    expect(teclaDe(evento({ key: 'Process', code: 'KeyA', keyCode: 229 }, caixa))).toBe('a');
    expect(teclaDe(evento({ key: 'Escape', code: 'Escape', isComposing: true }, caixa))).toBe('Escape');
    // Campo de texto comum continua com o IME.
    const campo = document.createElement('input');
    expect(teclaDe(evento({ key: 'Process', code: 'KeyS', keyCode: 229 }, campo))).toBeNull();
  });
});
