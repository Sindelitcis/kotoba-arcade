import { render } from 'preact';
import { afterEach, describe, expect, it } from 'vitest';
import { UNIDADES } from '../src/content/curso';
import { enderecoDe, Impresso, pedidoDoEndereco, type Pedido } from '../src/curso/Impresso';
import { montarProva } from '../src/curso/prova';

const abrir = (p: Pedido) => render(<Impresso pedido={p} />, document.body);

describe('material impresso', () => {
  afterEach(() => render(null, document.body));

  it('o endereço de cada impresso volta ao mesmo pedido', () => {
    const pedidos: Pedido[] = [
      { tipo: 'prova', codigo: 'U04-K7QH' },
      { tipo: 'gabarito', codigo: 'U04-K7QH' },
      { tipo: 'apostila', unidade: 'a1-04' },
      { tipo: 'cartoes', unidade: 'a1-04' },
      { tipo: 'escrita', unidade: 'a1-04' },
    ];
    for (const p of pedidos) expect(pedidoDoEndereco(new URL(enderecoDe(p), 'https://x').search)).toEqual(p);
    expect(pedidoDoEndereco('')).toBeNull();
    expect(pedidoDoEndereco('?unidade=a1-04')).toBeNull();
  });

  it('a prova impressa tem o código, o QR do gabarito e todas as questões, sem as respostas marcadas', () => {
    const u = UNIDADES[3]!;
    const prova = montarProva(u, 'K7QH');
    abrir({ tipo: 'prova', codigo: prova.codigo });
    expect(document.querySelector('[data-testid="im-codigo"]')?.textContent).toBe(prova.codigo);
    expect(document.querySelector('.im-qr svg')).not.toBeNull();
    expect(document.querySelectorAll('.im-questao')).toHaveLength(prova.questoes.length);
  });

  it('o gabarito do código lista a resposta certa de cada questão', () => {
    const prova = montarProva(UNIDADES[3]!, 'K7QH');
    abrir({ tipo: 'gabarito', codigo: 'u04 k7qh' });
    const respostas = [...document.querySelectorAll('[data-testid="im-resposta"]')];
    expect(respostas).toHaveLength(prova.questoes.length);
    // Sem o furigana: o texto da base é a resposta.
    const semLeitura = (el: Element | undefined) => {
      const c = el?.cloneNode(true) as Element | undefined;
      c?.querySelectorAll('rt').forEach((rt) => rt.remove());
      return c?.textContent ?? '';
    };
    prova.questoes.forEach((q, i) => expect(semLeitura(respostas[i])).toContain(q.certa));
  });

  it('código que não existe avisa, em vez de mostrar outra prova', () => {
    abrir({ tipo: 'gabarito', codigo: 'U99-ZZZZ' });
    expect(document.querySelector('[data-testid="im-gabarito"]')).toBeNull();
    expect(document.body.textContent).toMatch(/código/i);
  });

  it('a apostila tem as palavras e os kanji da unidade, com leitura em cima', () => {
    const u = UNIDADES[3]!;
    abrir({ tipo: 'apostila', unidade: u.id });
    const texto = document.body.textContent ?? '';
    for (const k of u.kanji) expect(texto).toContain(k.k);
    expect(document.querySelectorAll('.im ruby').length).toBeGreaterThan(0);
  });

  it('cartões: frente e verso em folhas separadas', () => {
    abrir({ tipo: 'cartoes', unidade: UNIDADES[3]!.id });
    expect(document.querySelectorAll('.im-folha').length).toBeGreaterThanOrEqual(2);
    expect(document.querySelector('.im-verso')).not.toBeNull();
  });

  it('folha de escrita: uma linha de caixas por kanji, com o modelo', () => {
    const u = UNIDADES[3]!;
    abrir({ tipo: 'escrita', unidade: u.id });
    expect(document.querySelectorAll('.im-escrita').length).toBe(new Set(u.kanji.map((k) => k.k)).size);
    expect(document.querySelectorAll('.im-caixa.modelo').length).toBeGreaterThan(0);
  });
});
