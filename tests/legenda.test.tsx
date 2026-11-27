import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { legenda, legendaComRomaji, legendar, romajiDaLegenda } from '../src/core/legenda';
import { LegendaVoz, useSemLegenda } from '../src/core/LegendaVoz';
import { tocarSequencia, type Saida } from '../src/core/sequencia';
import { app } from '../src/core/app';

afterEach(() => {
  legenda.value = null;
  legendaComRomaji.value = false;
});

describe('legenda da voz em japonês', () => {
  it('aparece quando o áudio começa e some quando ele acaba', () => {
    const a = new Audio();
    legendar(a, '水', 'みず');
    expect(legenda.value).toBeNull();
    a.dispatchEvent(new Event('playing'));
    expect(legenda.value).toEqual({ texto: '水', kana: 'みず' });
    a.dispatchEvent(new Event('ended'));
    expect(legenda.value).toBeNull();
  });

  it('o fim de uma fala antiga não apaga a legenda da fala nova', () => {
    const [a, b] = [new Audio(), new Audio()];
    legendar(a, 'あ');
    legendar(b, 'い');
    a.dispatchEvent(new Event('playing'));
    b.dispatchEvent(new Event('playing'));
    a.dispatchEvent(new Event('pause'));
    expect(legenda.value?.texto).toBe('い');
  });

  it('o romaji sai do kana; com kanji e sem leitura, não sai', () => {
    expect(romajiDaLegenda({ texto: 'きんようび' })).toBe("kin'youbi");
    expect(romajiDaLegenda({ texto: '水です。', kana: 'みずです。' })).toBe('mizudesu');
    expect(romajiDaLegenda({ texto: '水' })).toBeUndefined();
  });

  it('mostra o kana com furigana, e o romaji só no modo do Módulo 0', async () => {
    const raiz = document.createElement('div');
    legenda.value = { texto: 'みず' };
    await act(() => render(<LegendaVoz />, raiz));
    expect(raiz.querySelector('[data-testid=legenda]')?.textContent).toBe('みず');
    await act(() => {
      legendaComRomaji.value = true;
    });
    expect(raiz.querySelector('.legenda-romaji')?.textContent).toBe('mizu');
    await act(() => {
      legenda.value = null;
    });
    expect(raiz.innerHTML).toBe('');
    await act(() => render(null, raiz));
  });

  it('a sequência passa o texto e o kana de cada japonês para a legenda', async () => {
    app.data.settings.voice = true;
    const vistas: unknown[] = [];
    const saida: Saida = {
      tocar: async (_url, _s, l) => (vistas.push(l), 1),
      esperar: async () => {},
    };
    const fontes = async () => ({ jp: { falas: { '水です。': { x: 'a.mp3' } } } as never, pt: null });
    await tocarSequencia([{ tipo: 'jp', fala: { texto: '水です。', voz: 'frase', kana: 'みずです。' } }], { saida, fontes }).fim;
    expect(vistas).toEqual([{ texto: '水です。', kana: 'みずです。' }]);
  });
});

describe('pergunta de ouvir sem legenda', () => {
  // A legenda escrevia o kana do treino, a frase do ditado e a da escuta da prova: a resposta.
  function Pergunta({ aberta }: { aberta: boolean }) {
    useSemLegenda(aberta);
    return <LegendaVoz />;
  }

  it('com a pergunta aberta a legenda some; respondida, volta', () => {
    legenda.value = { texto: 'う' };
    act(() => render(<Pergunta aberta />, document.body));
    expect(document.querySelector('[data-testid="legenda"]')).toBeNull();
    act(() => render(<Pergunta aberta={false} />, document.body));
    expect(document.querySelector('[data-testid="legenda"]')?.textContent).toContain('う');
    act(() => render(null, document.body));
  });
});
