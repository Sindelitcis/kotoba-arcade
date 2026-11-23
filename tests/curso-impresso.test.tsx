import { render } from 'preact';
import { afterEach, describe, expect, it } from 'vitest';
import { UNIDADES } from '../src/content/curso';
import { enderecoDe, Impresso, pedidoDoEndereco, type Pedido } from '../src/curso/Impresso';
import { deItem, montarProva } from '../src/curso/prova';
import { app } from '../src/core/app';
import { ensureCursoSave, registrarProva } from '../src/curso/motor';

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
      { tipo: 'ditado', unidade: 'a1-04' },
      { tipo: 'escuta', codigo: 'U20-K7QH' },
      { tipo: 'certificado', unidade: 'a1-20' },
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

  it('a apostila tem completar e ditado, o QR do áudio do ditado e as respostas no fim', () => {
    abrir({ tipo: 'apostila', unidade: 'a1-04' });
    const completar = document.querySelector('[data-testid=im-completar]')!;
    expect(completar.querySelectorAll('.im-lacuna').length).toBeGreaterThanOrEqual(2);
    const ditado = document.querySelector('[data-testid=im-ditado]')!;
    expect(ditado.querySelector('.im-qr svg')).not.toBeNull();
    // O ditado na folha não mostra a frase: só a linha para escrever.
    expect(ditado.textContent).not.toMatch(/[ぁ-ん]/u);
    const respostas = document.querySelector('[data-testid=im-respostas]')!.textContent!;
    expect(respostas).toContain('Complete');
    expect(respostas).toContain('これはパンです');
  });

  it('o simulado impresso tem as quatro partes, o QR da escuta e a escuta sem a frase escrita', () => {
    const p = montarProva(UNIDADES.find((u) => u.revisao)!, 'K7QH');
    abrir({ tipo: 'prova', codigo: p.codigo });
    expect([...document.querySelectorAll('.im-secao')].map((h) => h.textContent)).toEqual(['Vocabulário · 文字・語彙', 'Gramática · 文法', 'Leitura · 読解', 'Escuta · 聴解']);
    expect(document.querySelector('[data-testid=im-qr-escuta] svg')).not.toBeNull();
    const folha = document.body.textContent!;
    for (const q of p.questoes) if (!deItem(q) && q.tipo === 'escuta') expect(folha).not.toContain(q.frase.jp);
    abrir({ tipo: 'escuta', codigo: p.codigo });
    expect(document.querySelectorAll('[data-testid=im-ouvir]').length).toBe(p.questoes.filter((q) => q.secao === 'escuta').length);
    abrir({ tipo: 'gabarito', codigo: p.codigo });
    expect(document.querySelectorAll('[data-testid=im-resposta]').length).toBe(p.questoes.length);
  });

  it('o certificado só sai com o simulado aprovado, com o nome, a nota e a data', () => {
    const save = ensureCursoSave(app.data.games);
    delete save.provas['a1-20'];
    abrir({ tipo: 'certificado', unidade: 'a1-20' });
    expect(document.querySelector('[data-testid=im-certificado]')).toBeNull();
    // A página relê o save: pega o objeto de novo.
    const save2 = ensureCursoSave(app.data.games);
    registrarProva(save2, 'a1-20', 0.875, true, new Date('2026-11-23T12:00:00').getTime());
    save2.nome = 'Rafael';
    abrir({ tipo: 'certificado', unidade: 'a1-20' });
    const c = document.querySelector('[data-testid=im-certificado]')!.textContent!;
    expect(c).toContain('Rafael');
    expect(c).toContain('88%');
    expect(c).toContain('23 de novembro de 2026');
    expect(c).toContain('não do JLPT');
    const save3 = ensureCursoSave(app.data.games);
    delete save3.provas['a1-20'];
    delete save3.nome;
  });

  it('a página do áudio do ditado tem um botão por frase e só mostra o texto quando pedido', () => {
    abrir({ tipo: 'ditado', unidade: 'a1-04' });
    expect(document.querySelectorAll('[data-testid=im-ouvir]').length).toBe(3);
    expect(document.querySelector('[data-testid=im-audio-ditado]')!.textContent).not.toContain('これはパンです');
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
    // A unidade 4 (konbini) tem パン e お金, que têm figura: ela vai no verso.
    expect(document.querySelectorAll('.im-verso [data-testid=im-cartao-img]').length).toBeGreaterThanOrEqual(2);
  });

  it('folha de escrita: uma linha de caixas por kanji, com o modelo', () => {
    const u = UNIDADES[3]!;
    abrir({ tipo: 'escrita', unidade: u.id });
    expect(document.querySelectorAll('.im-escrita').length).toBe(new Set(u.kanji.map((k) => k.k)).size);
    expect(document.querySelectorAll('.im-caixa.modelo').length).toBeGreaterThan(0);
  });
});
