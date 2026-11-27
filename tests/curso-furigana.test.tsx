import { render } from 'preact';
import { afterEach, describe, expect, it } from 'vitest';
import { UNIDADES } from '../src/content/curso';
import { Apresentacao } from '../src/core/Apresentacao';
import { cartaoDoKanji } from '../src/curso/cartoes';

const rubis = () => [...document.querySelectorAll('.ap-explica ruby')].map((r) => `${r.firstChild?.textContent}=${r.querySelector('rt')?.textContent}`);

function cartao(k: string, leitura: string) {
  for (const u of UNIDADES) for (const x of u.kanji) if (x.k === k && x.leitura === leitura) return cartaoDoKanji(x, u.id);
  throw new Error(`${k} ${leitura} não está no curso`);
}

describe('furigana no cartão de kanji do curso', () => {
  afterEach(() => render(null, document.body));

  // O dado geral lê 何人 como なんにん; na unidade 1 a palavra é なにじん, e o cartão dizia outra coisa em cima.
  it('a palavra citada leva a leitura do curso, não a do dado geral', () => {
    render(<Apresentacao itens={[cartao('何', 'なに')]} onFim={() => {}} />, document.body);
    expect(rubis()).toContain('何人=なにじん');
    expect(rubis()).not.toContain('何人=なんにん');
  });

  // "Em 日本 (にほん), 日 se lê に": com ひ em cima do 日 sozinho, o cartão se contradizia.
  it('o kanji do cartão, citado sozinho, fica sem leitura em cima', () => {
    render(<Apresentacao itens={[cartao('日', 'に')]} onFim={() => {}} />, document.body);
    expect(document.querySelector('.ap-explica')?.textContent).toContain('日 se lê に');
    expect(rubis().filter((r) => r.startsWith('日='))).toEqual([]);
    expect(rubis()).toContain('日本=にほん');
  });

  // 人 entra como じん em 日本人: com じん em cima do 人 grande, o aluno aprendia que 人 sozinho é じん.
  const grande = () => [...document.querySelectorAll('.ap-grande rt')].map((r) => r.textContent);
  it('o kanji grande só leva leitura em cima quando ele é a palavra sozinho', () => {
    render(<Apresentacao itens={[cartao('人', 'じん')]} onFim={() => {}} />, document.body);
    expect(grande()).toEqual([]);
    expect(document.querySelector('.ap-exemplo rt')?.textContent).toBeTruthy();
    render(null, document.body);
    render(<Apresentacao itens={[cartao('人', 'ひと')]} onFim={() => {}} />, document.body);
    expect(grande().join('')).toBe('ひと');
  });
});
