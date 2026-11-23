// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { UNIDADES } from '../src/content/curso';
import { AULAS_DO_CURSO } from '../src/content/curso/aulas';
import { TAREFAS } from '../src/content/curso/tarefas';
import { seededRng } from '../src/core/rng';
import { exemplosDaUnidade, exemplosDoPonto, falaEscrita, kanjiAte, partesDaFala, pecasParaMontar, trechosDoQuadro } from '../src/curso/exemplos';
import { blocosDa } from '../src/curso/motor';

const JAPONES = /[぀-ヿ一-鿿]/u;
const conteudo = UNIDADES.filter((u) => !u.revisao);

describe('aula falada do curso', () => {
  it('toda unidade de conteúdo tem aula, e a aula fala de todos os pontos da unidade', () => {
    for (const u of conteudo) {
      const aula = AULAS_DO_CURSO[u.id];
      expect(aula?.length ?? 0, u.id).toBeGreaterThanOrEqual(2);
      const pontos = new Set(aula!.flatMap((q) => (q.ex ? [q.ex] : [])));
      for (const g of u.gramatica) expect(pontos.has(g), `${u.id} ${g}`).toBe(true);
    }
  });

  // A Voz 1 é em português: japonês escrito no meio sairia lido errado.
  it('o português da fala não tem japonês; o japonês vem entre chaves, em kana para a voz', () => {
    for (const [id, aula] of Object.entries(AULAS_DO_CURSO))
      for (const q of aula)
        for (const p of partesDaFala(q.fala)) {
          if ('pt' in p) expect(JAPONES.test(p.pt), `${id}: ${p.pt}`).toBe(false);
          else expect(p.kana, `${id}: ${p.jp}`).toMatch(/^[ぁ-ゖー]+$/u);
        }
  });

  it('a fala vira trechos: português, japonês, português', () => {
    expect(partesDaFala('A partícula {は} soa {わ}.')).toEqual([{ pt: 'A partícula:' }, { jp: 'は', kana: 'は' }, { pt: 'soa:' }, { jp: 'わ', kana: 'わ' }]);
    expect(partesDaFala('Comer vira {食べます|たべます}.')).toEqual([{ pt: 'Comer vira:' }, { jp: '食べます', kana: 'たべます' }]);
    expect(falaEscrita('Comer vira {食べます|たべます}.')).toBe('Comer vira 食べます.');
  });

  it('o exemplo do quadro é de um ponto da própria unidade', () => {
    for (const u of conteudo) for (const q of AULAS_DO_CURSO[u.id] ?? []) if (q.ex) expect(u.gramatica, `${u.id} ${q.ex}`).toContain(q.ex);
  });

  it('o texto escrito do quadro só usa kanji já ensinado até a unidade', () => {
    for (const u of conteudo) {
      const ks = kanjiAte(u.ordem);
      for (const q of AULAS_DO_CURSO[u.id] ?? []) for (const c of q.tela ?? '') if (/[一-鿿]/u.test(c)) expect(ks.has(c), `${u.id}: ${c} em ${q.tela}`).toBe(true);
    }
  });

  it('o quadro com exemplo fala o português, o japonês, a pausa e o japonês de novo', () => {
    const [ex] = exemplosDoPonto('desu');
    expect(trechosDoQuadro('Oi.', ex).map((t) => t.tipo)).toEqual(['pt', 'jp', 'pausa', 'jp']);
    expect(trechosDoQuadro('Oi.').map((t) => t.tipo)).toEqual(['pt']);
  });

  it('a aula vem depois das palavras e dos kanji, e o montar frases depois da gramática', () => {
    for (const u of conteudo) {
      const tipos = blocosDa(u).map((b) => b.tipo);
      const aula = tipos.indexOf('aula');
      expect(aula, u.id).toBeGreaterThan(tipos.lastIndexOf('palavras'));
      expect(aula).toBeGreaterThan(tipos.lastIndexOf('kanji'));
      expect(tipos.indexOf('gramatica')).toBe(aula + 1);
      expect(tipos.indexOf('frases')).toBe(aula + 2);
    }
  });

  it('o montar frases usa exemplos que o cartão não mostrou', () => {
    for (const u of conteudo) {
      const b = blocosDa(u).find((x) => x.tipo === 'frases');
      const noCartao = new Set(u.gramatica.map((g) => exemplosDoPonto(g)[0]?.jp));
      if (b?.tipo !== 'frases') throw new Error(u.id);
      for (const e of b.exemplos) expect(noCartao.has(e.jp), e.jp).toBe(false);
    }
  });
});

describe('montar frases', () => {
  it('as peças nunca chegam já na ordem, e a vírgula não vira peça', () => {
    const rng = seededRng(5);
    for (const u of conteudo)
      for (const e of exemplosDaUnidade(u)) {
        const p = pecasParaMontar(e, rng);
        expect(p.some((x) => x.t === '、')).toBe(false);
        if (p.length > 1 && new Set(p.map((x) => x.t)).size > 1) expect(p.map((x) => x.t).join('')).not.toBe(e.pecas.filter((x) => x.t !== '、').map((x) => x.t).join(''));
      }
  });
});

describe('tarefa de uso', () => {
  it('toda unidade de conteúdo tem tarefa, e ela só usa kanji já ensinado', () => {
    for (const u of conteudo) {
      const t = TAREFAS[u.id];
      expect(t?.length ?? 0, u.id).toBeGreaterThanOrEqual(1);
      const ks = kanjiAte(u.ordem);
      for (const x of t ?? []) for (const c of x) if (/[一-鿿]/u.test(c)) expect(ks.has(c), `${u.id}: ${c}`).toBe(true);
    }
  });
});
