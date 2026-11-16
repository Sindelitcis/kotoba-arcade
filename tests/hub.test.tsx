import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '../src/core/app';
import { Hub } from '../src/hub/Hub';

function press(key: string) {
  dispatchEvent(new KeyboardEvent('keydown', { key }));
}

describe('teclado do fliperama', () => {
  afterEach(() => {
    render(null, document.body);
    screen.value = 'hub';
  });

  it('Enter no fliperama abre o jogo da vez', async () => {
    await act(() => render(<Hub />, document.body));
    press('Enter');
    expect(screen.value).toBe('kanjimon');
  });

  it('tecla apertada quando a tela já é de um jogo não é tratada pelo fliperama', async () => {
    // Na troca de tela o ouvinte do fliperama ainda vive por um instante.
    // Um Enter nesse intervalo abria o KanjiMon por cima do jogo que acabou de abrir.
    await act(() => render(<Hub />, document.body));
    screen.value = 'roguelike';
    press('Enter');
    expect(screen.value).toBe('roguelike');
    press('k');
    expect(screen.value).toBe('roguelike');
  });
});
