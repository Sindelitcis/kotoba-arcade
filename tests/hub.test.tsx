import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { saved, screen } from '../src/core/app';
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

  it('G no fliperama abre o Kumitate', async () => {
    await act(() => render(<Hub />, document.body));
    press('g');
    expect(screen.value).toBe('gramatica');
  });
});

describe('fliperama com o IME e com o Tab', () => {
  afterEach(() => {
    render(null, document.body);
    screen.value = 'hub';
  });

  it('atalho de letra funciona com o IME japonês ligado', async () => {
    await act(() => render(<Hub />, document.body));
    const e = new KeyboardEvent('keydown', { key: 'Process', code: 'KeyG' });
    Object.defineProperty(e, 'keyCode', { value: 229 });
    dispatchEvent(e);
    expect(screen.value).toBe('gramatica');
  });

  it('Enter num botão escolhido pelo Tab abre esse botão, não o jogo da vez', async () => {
    // O ouvinte global tomava o Enter de qualquer botão focado e abria o KanjiMon.
    await act(() => render(<Hub />, document.body));
    const kumitate = [...document.querySelectorAll<HTMLButtonElement>('.tile')].find((b) => b.textContent?.includes('Kumitate'));
    expect(kumitate).toBeTruthy();
    kumitate?.focus();
    kumitate?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(screen.value).toBe('hub');
  });

  it('Ajustes abre como diálogo e leva o foco para dentro', async () => {
    await act(() => render(<Hub />, document.body));
    const botao = document.querySelector<HTMLButtonElement>('[aria-label="Ajustes"]');
    await act(() => botao?.click());
    const dialogo = document.querySelector('[role="dialog"]');
    expect(dialogo?.getAttribute('aria-modal')).toBe('true');
    expect(dialogo?.contains(document.activeElement)).toBe(true);
  });
});

describe('aviso de gravação', () => {
  afterEach(() => {
    render(null, document.body);
    saved.value = true;
  });

  it('quando o navegador recusa gravar, o fliperama avisa e aponta o backup', async () => {
    saved.value = false;
    await act(() => render(<Hub />, document.body));
    expect(document.querySelector('[data-testid="save-failed"]')?.textContent).toContain('backup');
  });

  it('J no fliperama abre a Jornada, e Enter continua abrindo o jogo da vez', async () => {
    await act(() => render(<Hub />, document.body));
    press('j');
    expect(screen.value).toBe('jornada');
    screen.value = 'hub';
    // A Jornada não vira o "jogo da vez": Enter segue com uma tecla só.
    press('Enter');
    expect(['kanjimon', 'kanabeat', 'roguelike', 'aventura', 'conversa', 'gramatica']).toContain(screen.value);
  });

  it('M abre a Memória e L abre a Cena Viva', async () => {
    screen.value = 'hub';
    await act(() => render(<Hub />, document.body));
    press('m');
    expect(screen.value).toBe('memoria');
    screen.value = 'hub';
    press('L');
    expect(screen.value).toBe('cena');
  });
});
