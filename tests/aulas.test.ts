import { describe, expect, it } from 'vitest';
import { listarFalasPt } from '../scripts/falas-pt';
import { AULAS, acharAula, duracao, textosPtDasAulas } from '../src/aulas';
import { msDaPausa } from '../src/core/sequencia';
import { LICOES } from '../src/jornada/licoes';
import { COURSE } from '../src/games/gramatica/pontos';
import { LICOES_FALADAS, licaoFalada } from '../src/games/gramatica/falado';
import { ERRO_COM_RESPOSTA, ERRO_DE_NOVO, retornoFalado } from '../src/jornada/retorno';

const JAPONES = /[぀-ヿ㐀-鿿]/;
// A voz em português lê romaji do jeito dela ("masu" vira "mazu"): o japonês vai sempre pela gravação em japonês.
// ("no", "de", "a" ficam de fora: são palavras nossas.)
const ROMAJI = /\b(desu|masu|mashita|masen|arigatou|sumimasen|konnichiwa|ohayou|onegai|kudasai|hiragana|katakana|romaji|wo)\b/i;

describe('aulas do modo Ouvir', () => {
  it('toda lição da Jornada tem a sua aula, na mesma ordem', () => {
    expect(AULAS.map((a) => a.id)).toEqual(['ouvir:como', ...LICOES.map((l) => l.id)]);
    for (const l of LICOES) expect(acharAula(l.id)?.titulo).toBe(l.titulo);
  });

  it('cada aula explica em português, mostra o japonês e pede para repetir', () => {
    for (const a of AULAS) {
      const tipos = new Set(a.trechos.map((t) => t.tipo));
      expect(a.trechos[0]?.tipo, a.id).toBe('pt');
      expect(a.trechos.at(-1)?.tipo, a.id).toBe('pt');
      if (a.id === 'ouvir:como') continue;
      expect(tipos.has('jp') && tipos.has('pausa'), a.id).toBe(true);
    }
  });

  it('todo silêncio é para repetir um japonês ou para responder antes dele', () => {
    for (const a of AULAS)
      a.trechos.forEach((t, i) => {
        if (t.tipo !== 'pausa') return;
        const antes = a.trechos[i - 1]?.tipo;
        const depois = a.trechos[i + 1]?.tipo;
        const msg = `${a.id} trecho ${i}`;
        expect(antes === 'pausa' || depois === 'pausa', msg).toBe(false);
        expect(antes === 'jp' || (antes === 'pt' && depois === 'jp'), msg).toBe(true);
      });
  });

  it('aulas curtas, para ouvir de uma vez (até três minutos)', () => {
    for (const a of AULAS) {
      const s = duracao(a.trechos);
      expect(s, a.id).toBeGreaterThan(20);
      expect(s, a.id).toBeLessThan(180);
    }
  });

  it('o português falado não tem japonês, número, romaji nem notação de texto escrito', () => {
    for (const { texto, origem } of listarFalasPt()) {
      const msg = `${origem}: ${texto}`;
      expect(JAPONES.test(texto), msg).toBe(false);
      expect(/\d/.test(texto), msg).toBe(false);
      expect(/[/()[\]*_#]/.test(texto), msg).toBe(false);
      expect(ROMAJI.test(texto), msg).toBe(false);
      expect(texto.trim(), msg).toBe(texto);
      expect(/[.!?:]$/.test(texto), msg).toBe(true);
    }
  });

  it('a lista do gravador cobre todo português das aulas, sem repetir', () => {
    const lista = listarFalasPt().map((f) => f.texto);
    expect(new Set(lista).size).toBe(lista.length);
    for (const t of textosPtDasAulas()) expect(lista).toContain(t);
    expect(lista).toContain(ERRO_COM_RESPOSTA);
    expect(lista).toContain(ERRO_DE_NOVO);
  });

  it('a pausa para repetir acompanha o tamanho da fala, dentro de um limite', () => {
    expect(msDaPausa(1, 1)).toBe(2000);
    expect(msDaPausa(1.5, 2)).toBe(3400);
    expect(msDaPausa(2, 10)).toBe(8400);
  });
});

describe('lição falada do Kumitate', () => {
  it('toda peça do curso tem lição falada, e ela termina no exemplo em japonês', () => {
    for (const p of COURSE.points) {
      expect(LICOES_FALADAS[p.id], p.id).toBeDefined();
      const t = licaoFalada(COURSE, p);
      expect(t[0]?.tipo).toBe('pt');
      expect(t.at(-1)?.tipo).toBe('jp');
    }
  });

  it('a partícula は é dita como soa (わ)', () => {
    const wa = COURSE.points.find((p) => p.id === 'wa');
    const peca = licaoFalada(COURSE, wa!).find((t) => t.tipo === 'jp' && t.fala.voz === 'palavra');
    expect(peca && peca.tipo === 'jp' && peca.fala.kana).toBe('わ');
  });
});

describe('retorno falado da Jornada', () => {
  const fala = { texto: '駅', voz: 'palavra' as const, kana: 'えき', palavra: { texto: '駅', kana: 'えき' } };
  it('acerto: só o japonês certo', () => {
    const p = { tipo: 'escolha', falaResposta: fala } as never;
    expect(retornoFalado(p, true)).toEqual([{ tipo: 'jp', fala }]);
  });
  it('erro: a frase curta e depois o japonês certo', () => {
    const p = { tipo: 'escolha', falaResposta: fala } as never;
    expect(retornoFalado(p, false)).toEqual([{ tipo: 'pt', texto: ERRO_COM_RESPOSTA }, { tipo: 'jp', fala }]);
    const q = { tipo: 'escolha', fala } as never;
    expect(retornoFalado(q, false)).toEqual([{ tipo: 'pt', texto: ERRO_DE_NOVO }, { tipo: 'jp', fala }]);
    expect(retornoFalado(q, true)).toEqual([]);
  });
});
