// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { jlptDo, UNIDADES } from '../src/content/curso';
import { seededRng } from '../src/core/rng';
import { blocosDa, itensAte } from '../src/curso/motor';
import { exemplosDaUnidade } from '../src/curso/exemplos';
import {
  codigoDaProva,
  deItem,
  notaJlpt,
  MINIMOS_JLPT,
  passariaNoJlpt,
  SIMULADO,
  type Questao,
  corrigir,
  lerCodigo,
  montarProva,
  NIVEL_POR_UNIDADE,
  NOTA_MINIMA,
  novaSemente,
  OPCOES_PROVA,
  provaDoCodigo,
  QUESTOES_DA_UNIDADE,
  QUESTOES_DE_REVISAO,
  questoesDeNivelamento,
  UNIDADES_DO_NIVELAMENTO,
} from '../src/curso/prova';

const SEMENTES = ['K7QH', 'AAAA', '2Z9M', 'PQRS', 'HJ34'];

const chave = (q: Questao) => (deItem(q) ? q.item.id : q.frase.jp);

describe('código da prova', () => {
  it('ida e volta: o código guarda a unidade e a semente', () => {
    const rng = seededRng(1);
    for (const u of UNIDADES) {
      const s = novaSemente(rng);
      const c = lerCodigo(codigoDaProva(u, s));
      expect(c?.unidade.id).toBe(u.id);
      expect(c?.semente).toBe(s);
    }
  });

  it('aceita minúscula, espaço e sem traço; recusa o que não existe', () => {
    expect(lerCodigo('u04-k7qh')?.unidade.numero).toBe(4);
    expect(lerCodigo(' U04 K7QH ')?.semente).toBe('K7QH');
    expect(lerCodigo('4k7qh')?.unidade.numero).toBe(4);
    expect(lerCodigo('U99-K7QH')).toBeNull();
    expect(lerCodigo('U04-K7Q0')).toBeNull(); // 0 não é usado: confunde com O
    expect(lerCodigo('qualquer coisa')).toBeNull();
  });

  it('a semente só usa letras que não se confundem à mão', () => {
    const rng = seededRng(9);
    for (let i = 0; i < 200; i++) expect(novaSemente(rng)).toMatch(/^[A-HJKMNP-Z2-9]{4}$/);
  });
});

describe('montagem da prova', () => {
  it('o mesmo código dá sempre a mesma prova (a folha impressa bate com o gabarito)', () => {
    for (const u of UNIDADES) {
      const a = montarProva(u, 'K7QH');
      const b = provaDoCodigo(a.codigo);
      expect(b?.questoes.map((q) => [chave(q), q.opcoes, q.certa])).toEqual(a.questoes.map((q) => [chave(q), q.opcoes, q.certa]));
    }
  });

  it('outra semente, outra prova', () => {
    const u = UNIDADES[3]!;
    expect(montarProva(u, 'AAAA').questoes.map(chave)).not.toEqual(montarProva(u, 'BBBB').questoes.map(chave));
  });

  it('quatro alternativas diferentes, uma certa, numeradas em ordem', () => {
    for (const u of UNIDADES)
      for (const s of SEMENTES) {
        const p = montarProva(u, s);
        expect(p.questoes.length, u.id).toBeGreaterThanOrEqual(10);
        p.questoes.forEach((q, i) => {
          expect(q.n).toBe(i + 1);
          expect(q.opcoes).toHaveLength(OPCOES_PROVA);
          expect(new Set(q.opcoes).size).toBe(OPCOES_PROVA);
          expect(q.opcoes.filter((o) => o === q.certa)).toHaveLength(1);
        });
      }
  });

  it('só cai o que o curso já ensinou até a unidade, até nas alternativas erradas', () => {
    for (const u of UNIDADES)
      for (const s of SEMENTES) {
        const ate = itensAte(u.ordem);
        const ids = new Set(ate.map((i) => i.id));
        const respostas = new Set(ate.flatMap((i) => [i.jp, i.certa]));
        for (const q of montarProva(u, s).questoes.filter(deItem)) {
          expect(ids.has(q.item.id), `${u.id} ${q.item.id}`).toBe(true);
          for (const o of q.opcoes) expect(respostas.has(o), `${u.id} ${q.n}: ${o}`).toBe(true);
        }
      }
  });

  it('nenhuma alternativa errada é também uma resposta certa', () => {
    const sentido = (t: string | undefined) => t?.split(/[,;(]/)[0]?.trim().toLowerCase();
    for (const u of UNIDADES) {
      const ate = itensAte(u.ordem);
      for (const s of SEMENTES)
        for (const q of montarProva(u, s).questoes.filter(deItem)) {
          const erradas = q.opcoes.filter((o) => o !== q.certa);
          for (const o of erradas) expect(q.item.evitar.includes(o), `${u.id} ${q.n}: ${o}`).toBe(false);
          if (q.tipo === 'palavra') {
            // "Qual é 'água'?": nenhuma outra opção pode querer dizer água também.
            const sentidos = erradas.map((o) => sentido(ate.find((i) => i.tipo === 'palavra' && i.jp === o)?.certa));
            expect(sentidos).not.toContain(sentido(q.item.certa));
          }
        }
    }
  });

  it('unidade de conteúdo: a maior parte é dela, e há revisão das anteriores', () => {
    const u = UNIDADES.find((x) => x.numero === 5 && !x.revisao)!;
    const anteriores = new Set(itensAte(u.ordem - 1).map((i) => i.id));
    const p = montarProva(u, 'K7QH');
    const daUnidade = p.questoes.filter((q) => deItem(q) && !anteriores.has(q.item.id)).length;
    expect(daUnidade).toBeGreaterThanOrEqual(QUESTOES_DA_UNIDADE * 0.75);
    expect(p.questoes.filter(deItem).length - daUnidade).toBeLessThanOrEqual(QUESTOES_DE_REVISAO);
  });

  it('a unidade de revisão é um simulado do que veio antes', () => {
    for (const u of UNIDADES.filter((x) => x.revisao)) {
      const anteriores = new Set(itensAte(u.ordem - 1).map((i) => i.id));
      const p = montarProva(u, 'K7QH');
      expect(p.questoes.length).toBeGreaterThanOrEqual(20);
      for (const q of p.questoes.filter(deItem)) expect(anteriores.has(q.item.id)).toBe(true);
    }
  });

  // O simulado do JLPT: vocabulário, gramática, leitura e escuta, nessa ordem.
  const SIMULADOS = UNIDADES.filter((x) => x.revisao);

  it('há um simulado por nível, no fim dele', () => {
    expect(SIMULADOS.map((u) => u.nivel)).toEqual(['A1', 'A2']);
  });

  it('o simulado tem as quatro partes do JLPT, cheias e em ordem', () => {
    for (const u of SIMULADOS)
    for (const s of SEMENTES) {
      const p = montarProva(u, s);
      const secoes = p.questoes.map((q) => q.secao);
      for (const [secao, n] of Object.entries(SIMULADO)) expect(secoes.filter((x) => x === secao).length, `${s} ${secao}`).toBe(n);
      expect(secoes).toEqual([...secoes].sort((a, b) => Object.keys(SIMULADO).indexOf(a) - Object.keys(SIMULADO).indexOf(b)));
    }
  });

  it('no simulado, as frases só usam o que o nível ensinou, e a escuta não repete frase da gramática', () => {
    for (const u of SIMULADOS) {
    const doNivel = new Set(UNIDADES.filter((x) => x.nivel === u.nivel && x.ordem < u.ordem).flatMap(exemplosDaUnidade).map((e) => e.jp));
    for (const s of SEMENTES) {
      const frases = montarProva(u, s).questoes.filter((q) => !deItem(q));
      for (const q of frases) if (!deItem(q) && q.tipo !== 'texto') expect(doNivel.has(q.frase.jp), q.frase.jp).toBe(true);
      const gram = new Set(frases.filter((q) => q.secao === 'gramatica').map((q) => !deItem(q) && q.frase.jp));
      for (const q of frases.filter((x) => x.secao === 'escuta')) expect(gram.has(!deItem(q) && q.frase.jp)).toBe(false);
    }
    }
  });

  it('na leitura, a certa é uma frase do texto e as erradas não estão nele', () => {
    for (const u of SIMULADOS)
    for (const s of SEMENTES)
      for (const q of montarProva(u, s).questoes)
        if (!deItem(q) && q.tipo === 'texto') {
          const doTexto = q.texto!.frases.map((f) => f.pt);
          expect(doTexto).toContain(q.certa);
          for (const o of q.opcoes.filter((x) => x !== q.certa)) expect(doTexto).not.toContain(o);
        }
  });

  it('a nota na escala do JLPT: 120 para conhecimento e leitura, 60 para escuta, e os mínimos de cada nível', () => {
    for (const u of SIMULADOS) {
      const jlpt = jlptDo(u.nivel);
      const p = montarProva(u, 'K7QH');
      const tudo = notaJlpt(p, p.questoes.map((q) => q.certa));
      expect([tudo.conhecimento, tudo.escuta, tudo.total]).toEqual([120, 60, 180]);
      expect(passariaNoJlpt(tudo, jlpt)).toBe(true);
      // Tudo certo menos a escuta: passa no total, mas não no mínimo de escuta.
      const semEscuta = notaJlpt(p, p.questoes.map((q) => (q.secao === 'escuta' ? undefined : q.certa)));
      expect(semEscuta.escuta).toBe(0);
      expect(passariaNoJlpt(semEscuta, jlpt)).toBe(false);
    }
  });

  it('o N4 pede mais pontos no total que o N5, com os mesmos mínimos por parte', () => {
    const n = (total: number) => ({ total, conhecimento: 50, escuta: 30 }) as Parameters<typeof passariaNoJlpt>[0];
    expect(MINIMOS_JLPT.N5.total).toBe(80);
    expect(MINIMOS_JLPT.N4.total).toBe(90);
    expect(passariaNoJlpt(n(85), 'N5')).toBe(true);
    expect(passariaNoJlpt(n(85), 'N4')).toBe(false);
    expect(passariaNoJlpt(n(90), 'N4')).toBe(true);
  });

  it('a questão de leitura não mostra a resposta no enunciado', () => {
    for (const u of UNIDADES)
      for (const q of montarProva(u, 'K7QH').questoes) if (q.tipo === 'leitura') expect(q.enunciado.includes(q.certa), q.enunciado).toBe(false);
  });
});

describe('correção', () => {
  const p = montarProva(UNIDADES[2]!, 'K7QH');
  const total = p.questoes.length;
  const certas = p.questoes.map((q) => q.certa);
  const errar = (n: number) => certas.map((c, i) => (i < n ? p.questoes[i]!.opcoes.find((o) => o !== c) : c));

  it('80% passa, menos que isso não', () => {
    const podeErrar = total - Math.ceil(total * NOTA_MINIMA);
    expect(corrigir(p, errar(podeErrar)).aprovada).toBe(true);
    expect(corrigir(p, errar(podeErrar + 1)).aprovada).toBe(false);
  });

  it('em branco conta como errada, e a lista de erros vem na ordem', () => {
    const r = corrigir(p, [undefined, ...certas.slice(1)]);
    expect(r.acertos).toBe(total - 1);
    expect(r.erradas.map((q) => q.n)).toEqual([1]);
    expect(corrigir(p, []).acertos).toBe(0);
  });
});

describe('nivelamento', () => {
  it('não entra a unidade de revisão', () => {
    expect(UNIDADES_DO_NIVELAMENTO.some((u) => u.revisao)).toBe(false);
    expect(UNIDADES_DO_NIVELAMENTO[0]?.id).toBe(UNIDADES[0]?.id);
  });

  it('as questões de cada unidade são dela, com quatro alternativas do curso até ali', () => {
    for (const u of UNIDADES_DO_NIVELAMENTO) {
      const anteriores = new Set(itensAte(u.ordem - 1).map((i) => i.id));
      const qs = questoesDeNivelamento(u, seededRng(3));
      expect(qs.length, u.id).toBe(NIVEL_POR_UNIDADE);
      for (const q of qs) {
        expect(anteriores.has(q.item.id)).toBe(false);
        expect(new Set(q.opcoes).size).toBe(OPCOES_PROVA);
        expect(q.opcoes).toContain(q.certa);
      }
    }
  });

  it('toda unidade de conteúdo tem prova depois do mini-teste', () => {
    for (const u of UNIDADES_DO_NIVELAMENTO) expect(blocosDa(u).some((b) => b.tipo === 'miniteste')).toBe(true);
  });
});

describe('prova da unidade: além do vocabulário', () => {
  // A prova só cobrava palavra e leitura de kanji: o objetivo da unidade (frases) nunca era testado.
  it('a partir da unidade 4, toda prova tem frase para completar e frase para ouvir, da própria unidade', () => {
    for (const u of UNIDADES.filter((x) => !x.revisao && x.ordem >= 4))
      for (const s of SEMENTES) {
        const p = montarProva(u, s);
        const frases = p.questoes.filter((q) => !deItem(q));
        const daqui = new Set(exemplosDaUnidade(u).map((e) => e.jp));
        expect(frases.some((q) => q.tipo === 'completar') || frases.some((q) => q.tipo === 'escuta'), u.id).toBe(true);
        for (const q of frases) expect(daqui.has(!deItem(q) ? q.frase.jp : ''), `${u.id} ${q.tipo}`).toBe(true);
        expect(p.questoes.map((q) => q.n)).toEqual(p.questoes.map((_, i) => i + 1));
      }
  });
});
