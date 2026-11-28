// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { UNIDADES } from '../src/content/curso';
import { seededRng } from '../src/core/rng';
import { cartaoDoPonto } from '../src/curso/cartoes';
import { kanjiAte, unidadeDoPonto, vocabularioAte } from '../src/curso/exemplos';
import { conjugar, escrever, GRAFIAS_DAS_FORMAS, perguntasDeForma, TABELAS, tabelaDoPonto, type Forma, type Palavra } from '../src/curso/formas';
import { blocosDa } from '../src/curso/motor';

const KANJI = /[一-鿿々]/gu;
const v = (jp: string, kana: string, tipo: Palavra['tipo']): Palavra => ({ jp, kana, pt: '', tipo });

describe('a conta das formas', () => {
  // As que mais dão erro: o grupo 1 em る, o て de cada final, いく, する e くる.
  const casos: [Palavra, Forma, string][] = [
    [v('食べる', 'たべる', 'ichidan'), 'masu', 'たべます'],
    [v('帰る', 'かえる', 'godan'), 'masu', 'かえります'],
    [v('買う', 'かう', 'godan'), 'nai', 'かわない'],
    [v('飲む', 'のむ', 'godan'), 'te', 'のんで'],
    [v('書く', 'かく', 'godan'), 'te', 'かいて'],
    [v('およぐ', 'およぐ', 'godan'), 'ta', 'およいだ'],
    [v('話す', 'はなす', 'godan'), 'te', 'はなして'],
    [v('待つ', 'まつ', 'godan'), 'ta', 'まった'],
    [v('しぬ', 'しぬ', 'godan'), 'te', 'しんで'],
    [v('あそぶ', 'あそぶ', 'godan'), 'ta', 'あそんだ'],
    [v('行く', 'いく', 'godan'), 'te', 'いって'],
    [v('行く', 'いく', 'godan'), 'ta', 'いった'],
    [v('する', 'する', 'suru'), 'kanou', 'できる'],
    [v('べんきょうする', 'べんきょうする', 'suru'), 'kanou', 'べんきょうできる'],
    [v('来る', 'くる', 'kuru'), 'nai', 'こない'],
    [v('来る', 'くる', 'kuru'), 'masu', 'きます'],
    [v('来る', 'くる', 'kuru'), 'ba', 'くれば'],
    [v('来る', 'くる', 'kuru'), 'meirei', 'こい'],
    [v('飲む', 'のむ', 'godan'), 'ikou', 'のもう'],
    [v('飲む', 'のむ', 'godan'), 'kanou', 'のめる'],
    [v('食べる', 'たべる', 'ichidan'), 'kanou', 'たべられる'],
    [v('飲む', 'のむ', 'godan'), 'shieki-ukemi', 'のまされる'],
    [v('話す', 'はなす', 'godan'), 'shieki-ukemi', 'はなさせられる'],
    [v('食べる', 'たべる', 'ichidan'), 'shieki-ukemi', 'たべさせられる'],
    [v('高い', 'たかい', 'adj-i'), 'adj-nakatta', 'たかくなかったです'],
    [v('いい', 'いい', 'adj-i'), 'adj-ta', 'よかったです'],
    [v('きれい', 'きれい', 'adj-na'), 'adj-nai', 'きれいじゃないです'],
    [v('しずか', 'しずか', 'adj-na'), 'adj-ta', 'しずかでした'],
    [v('高い', 'たかい', 'adj-i'), 'adj-naru', 'たかくなる'],
  ];
  it.each(casos)('%o na forma %s', (p, f, esperado) => expect(conjugar(p, f)).toBe(esperado));

  it('o kanji fica e a leitura acompanha (来る muda: き, こ)', () => {
    expect(escrever(v('来る', 'くる', 'kuru'), 'nai')).toEqual({ jp: '来ない', kana: 'こない' });
    expect(escrever(v('来る', 'くる', 'kuru'), 'masu')).toEqual({ jp: '来ます', kana: 'きます' });
    expect(escrever(v('飲む', 'のむ', 'godan'), 'te')).toEqual({ jp: '飲んで', kana: 'のんで' });
    expect(escrever(v('高い', 'たかい', 'adj-i'), 'adj-nai')).toEqual({ jp: '高くないです', kana: 'たかくないです' });
  });
});

describe('a tabela do cartão de gramática', () => {
  it('toda palavra da lista existe no curso', () => {
    const todas = vocabularioAte(Number.MAX_SAFE_INTEGER);
    for (const g of GRAFIAS_DAS_FORMAS) expect(todas.has(g), g).toBe(true);
  });

  it('todo ponto com tabela é do curso e tem pelo menos três linhas', () => {
    for (const ponto of Object.keys(TABELAS)) {
      expect(unidadeDoPonto(ponto), ponto).toBeDefined();
      expect(tabelaDoPonto(ponto)?.linhas.length, ponto).toBeGreaterThanOrEqual(3);
    }
  });

  // Ensinar antes de cobrar: a tabela só mostra palavra e kanji que a pessoa já viu.
  it('só usa palavras e kanji ensinados até a unidade do ponto', () => {
    for (const ponto of Object.keys(TABELAS)) {
      const u = unidadeDoPonto(ponto)!;
      const vocab = vocabularioAte(u.ordem);
      const kanji = kanjiAte(u.ordem);
      for (const l of tabelaDoPonto(ponto)!.linhas) {
        expect(vocab.has(l.palavra.jp), `${ponto} ${l.palavra.jp}`).toBe(true);
        for (const f of l.formas) for (const c of f.jp.match(KANJI) ?? []) expect(kanji.has(c), `${ponto} ${f.jp}`).toBe(true);
      }
    }
  });

  it('a forma て mostra um verbo de cada final, quando já foram ensinados', () => {
    const t = tabelaDoPonto('te-forma')!;
    const finais = new Set(t.linhas.filter((l) => l.palavra.tipo === 'godan').map((l) => l.palavra.kana.slice(-1)));
    expect(finais.has('む') || finais.has('ぶ') || finais.has('ぬ')).toBe(true);
    expect(finais.has('く')).toBe(true);
    expect(t.linhas.some((l) => l.palavra.kana === 'いく')).toBe(true);
  });

  it('o cartão de gramática traz a regra e a tabela', () => {
    const u = unidadeDoPonto('masu')!;
    const c = cartaoDoPonto('masu', u.id);
    expect(c.tabela?.como).toMatch(/ます/u);
    expect(c.tabela?.linhas.map((l) => l.rotulo)).toContain('grupo 2');
    expect(cartaoDoPonto('desu', 'a1-01').tabela).toBeUndefined();
  });
});

describe('o exercício de transformar', () => {
  it('quatro opções em kana, diferentes, com a certa entre elas', () => {
    for (const u of UNIDADES)
      for (let s = 0; s < 5; s++)
        for (const q of perguntasDeForma(u, seededRng(s))) {
          expect(q.opcoes.length, q.de.jp).toBe(4);
          expect(new Set(q.opcoes).size, q.de.jp).toBe(4);
          expect(q.opcoes).toContain(q.para.kana);
          for (const o of q.opcoes) expect(o, q.de.jp).toMatch(/^[ぁ-ゖー]+$/u);
          // A forma de partida está na pergunta: oferecer ela como resposta não ensina nada.
          expect(q.opcoes, q.de.jp).not.toContain(q.de.kana);
        }
  });

  it('vem logo depois do cartão dos mesmos pontos', () => {
    let com = 0;
    for (const u of UNIDADES) {
      const bs = blocosDa(u);
      bs.forEach((b, i) => {
        if (b.tipo !== 'formas') return;
        com++;
        const cartao = bs[i - 1];
        expect(cartao?.tipo, b.id).toBe('gramatica');
        if (cartao?.tipo === 'gramatica') expect(b.pontos).toEqual(cartao.pontos);
        // Só pontos que têm tabela entram no exercício.
        expect(perguntasDeForma(u, seededRng(1), 8, b.pontos).every((q) => b.pontos.includes(q.ponto))).toBe(true);
      });
    }
    expect(com).toBeGreaterThanOrEqual(15);
  });
});
