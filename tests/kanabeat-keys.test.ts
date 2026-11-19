import { describe, expect, it } from 'vitest';
import { isTypingKey, normalKey, type KeyLike } from '../src/games/kanabeat/keys';

const k = (key: string, code: string, extra: Partial<KeyLike> = {}): KeyLike => ({ key, code, keyCode: 0, isComposing: false, ...extra });

describe('normalKey: teclado japonês do Windows (bug de 19/11/2026)', () => {
  it('letra normal passa como veio', () => {
    expect(normalKey(k('t', 'KeyT'))).toBe('t');
    expect(normalKey(k('T', 'KeyT'))).toBe('T');
  });

  it('com o IME ligado, "Process" e 229 viram a letra da tecla física', () => {
    expect(normalKey(k('Process', 'KeyT', { keyCode: 229 }))).toBe('t');
    expect(normalKey(k('Unidentified', 'KeyK', { keyCode: 229, isComposing: true }))).toBe('k');
  });

  it('no modo de entrada em kana, a tecla vale pela posição', () => {
    expect(normalKey(k('か', 'KeyT'))).toBe('t');
  });

  it('espaço, apagar, Esc e números também funcionam com o IME ligado', () => {
    expect(normalKey(k('Process', 'Space', { keyCode: 229 }))).toBe(' ');
    expect(normalKey(k('Process', 'Backspace', { keyCode: 229 }))).toBe('Backspace');
    expect(normalKey(k('Process', 'Escape', { keyCode: 229 }))).toBe('Escape');
    expect(normalKey(k('Process', 'Digit2', { keyCode: 229 }))).toBe('2');
    expect(normalKey(k('Process', 'Minus', { keyCode: 229 }))).toBe('-');
  });

  it('teclas sem letra não viram digitação', () => {
    expect(isTypingKey(normalKey(k('Dead', 'Quote')))).toBe(false);
    expect(isTypingKey(normalKey(k('Shift', 'ShiftLeft')))).toBe(false);
    expect(isTypingKey(normalKey(k('ç', 'Semicolon')))).toBe(false);
    expect(isTypingKey(normalKey(k('Process', 'KeyA', { keyCode: 229 })))).toBe(true);
  });
});
