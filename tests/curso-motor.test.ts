// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { palavrasDa, UNIDADES } from '../src/content/curso';
import { apresentar, foiApresentado } from '../src/core/ensino';
import { seededRng } from '../src/core/rng';
import type { CardState } from '../src/core/srs';
import { cartaoDaPalavra, cartaoDoKanji, cartaoDoPonto, explicacaoDoKanji, falasDoCurso, significadoDoKanji } from '../src/curso/cartoes';
import {
  blocosDa,
  cartaDaPalavra,
  cartasDoKanji,
  concluiuBlocos,
  emLotes,
  ensureCursoSave,
  itensAte,
  itensDaRevisao,
  itensDoBloco,
  itensDoMiniteste,
  liberada,
  PERGUNTAS_DO_MINITESTE,
  ondeContinuar,
  proximaLicao,
  registrarBloco,
  registrarProva,
  venceu,
  type Bloco,
  type ItemPratica,
} from '../src/curso/motor';
import { Pratica } from '../src/curso/pratica';

const DIA = 86_400_000;

/** As cartas que o bloco apresenta (o que a tela faz no fim da apresentação). */
function cartasDoBloco(b: Bloco): string[] {
  if (b.tipo === 'palavras') return b.palavras.map(cartaDaPalavra);
  if (b.tipo === 'kanji') return b.kanji.flatMap(cartasDoKanji);
  return [];
}

describe('blocos da unidade', () => {
  it('lotes do mesmo tamanho, nunca mais de 5', () => {
    expect(emLotes([...Array(21).keys()]).map((l) => l.length)).toEqual([5, 4, 4, 4, 4]);
    expect(emLotes([...Array(5).keys()]).map((l) => l.length)).toEqual([5]);
    expect(emLotes([...Array(6).keys()]).map((l) => l.length)).toEqual([3, 3]);
    expect(emLotes([])).toEqual([]);
  });

  it('toda unidade começa pelo objetivo e passa por cada palavra e cada kanji uma vez', () => {
    for (const u of UNIDADES) {
      const bs = blocosDa(u);
      expect(bs[0]?.tipo, u.id).toBe('objetivo');
      expect(new Set(bs.map((b) => b.id)).size, u.id).toBe(bs.length);
      const palavras = bs.flatMap((b) => (b.tipo === 'palavras' ? b.palavras.map((p) => p.jp) : []));
      expect(palavras, u.id).toEqual(palavrasDa(u).map((p) => p.jp));
      const kanji = bs.flatMap((b) => (b.tipo === 'kanji' ? b.kanji : []));
      expect(kanji.length, u.id).toBe(u.kanji.length);
      for (const k of u.kanji) expect(kanji, `${u.id} ${k.k}`).toContain(k);
      for (const b of bs) if (b.tipo === 'palavras' || b.tipo === 'kanji') expect(itensDoBloco(b).length, b.id).toBeLessThanOrEqual(5);
      expect(bs.filter((b) => b.tipo === 'gramatica').length, u.id).toBe(u.gramatica.length > 0 ? 1 : 0);
      expect(bs.filter((b) => b.tipo === 'dialogo').length, u.id).toBe(u.situacoes?.length ?? 0);
    }
  });

  it('o kanji vem logo depois da palavra dele, nunca antes', () => {
    for (const u of UNIDADES) {
      const vistas = new Set<string>();
      for (const b of blocosDa(u)) {
        if (b.tipo === 'palavras') for (const p of b.palavras) vistas.add(p.jp);
        if (b.tipo === 'kanji') for (const k of b.kanji) expect(vistas.has(k.em), `${u.id}: ${k.k} antes de ${k.em}`).toBe(true);
      }
    }
  });

  it('nota cultural só entra depois de conferida contra a fonte', () => {
    for (const u of UNIDADES)
      for (const b of blocosDa(u)) if (b.tipo === 'notas') for (const n of b.notas) expect(n.conferida, `${u.id} ${n.titulo}`).toBe(true);
    const conferidas = UNIDADES.flatMap((u) => u.notas.filter((n) => n.conferida));
    const nosBlocos = UNIDADES.flatMap((u) => blocosDa(u).flatMap((b) => (b.tipo === 'notas' ? b.notas : [])));
    expect(nosBlocos.length).toBe(conferidas.length);
  });

  it('a unidade de revisão tem só o objetivo e a revisão', () => {
    for (const u of UNIDADES.filter((x) => x.revisao)) expect(blocosDa(u).map((b) => b.tipo)).toEqual(['objetivo', 'revisao']);
  });
});

describe('cartões', () => {
  it('todo kanji do curso tem significado e o cartão explica a leitura', () => {
    for (const u of UNIDADES)
      for (const k of u.kanji) {
        expect(significadoDoKanji(k.k), k.k).not.toBe('');
        const c = cartaoDoKanji(k, u.id);
        expect(c.leitura).toBe(k.em === k.k ? k.leitura : undefined);
        expect(c.explicacao, k.k).toContain(k.leitura);
        expect(c.explicacao, k.k).toBeTruthy();
      }
  });

  it('o cartão do kanji avisa das outras leituras e de quando elas entram', () => {
    const kin = UNIDADES.flatMap((u) => u.kanji).find((k) => k.k === '金' && k.leitura === 'きん');
    expect(kin).toBeDefined();
    const texto = explicacaoDoKanji(kin!);
    expect(texto).toMatch(/お金 \(おかね\) se lê かね \(unidade \d+\)/);
  });

  it('kanji que muda de leitura traz a explicação da troca no cartão', () => {
    for (const u of UNIDADES) for (const k of u.kanji) if (k.muda) expect(explicacaoDoKanji(k)).toContain(k.muda);
  });

  it('as chaves dos cartões são únicas dentro da unidade (人 entra duas vezes no A1-01)', () => {
    for (const u of UNIDADES) {
      const chaves = [...palavrasDa(u).map((p) => cartaoDaPalavra(p).chaves[0]), ...u.kanji.map((k) => cartaoDoKanji(k, u.id).chaves[0]), ...u.gramatica.map((g) => cartaoDoPonto(g, u.id).chaves[0])];
      expect(new Set(chaves).size, u.id).toBe(chaves.length);
    }
  });

  it('tudo o que os cartões falam está na lista de gravação', () => {
    const { jp, pt } = falasDoCurso();
    const textos = new Set(jp.map((f) => f.fala.texto));
    for (const u of UNIDADES) {
      const cartoes = [...palavrasDa(u).map(cartaoDaPalavra), ...u.kanji.map((k) => cartaoDoKanji(k, u.id))];
      for (const c of cartoes)
        for (const t of c.falas) {
          if (t.tipo === 'jp') expect(textos.has(t.fala.texto), `${u.id} ${c.grande}`).toBe(true);
          if (t.tipo === 'pt') expect(pt, `${u.id} ${c.grande}`).toContain(t.texto);
        }
    }
  });
});

describe('prática: só cobra o que já foi apresentado', () => {
  /**
   * Percorre o curso inteiro (A1 e A2) com um save zerado, como a tela faz: apresenta o bloco e pratica,
   * errando de vez em quando. A cada pergunta, o alvo e todas as alternativas precisam ter
   * passado pela apresentação.
   */
  it('o curso inteiro, do zero', () => {
    const cards: Record<string, CardState> = {};
    const rng = seededRng(7);
    let agora = Date.UTC(2026, 10, 22);
    const apresentadas = new Set<string>();
    for (const u of UNIDADES) {
      for (const b of blocosDa(u)) {
        const cartas = cartasDoBloco(b);
        apresentar(cards, cartas, agora);
        for (const c of cartas) apresentadas.add(c);
        const itens = b.tipo === 'revisao' ? itensDaRevisao(u, cards, rng) : itensDoBloco(b);
        if (b.tipo === 'revisao') expect(itens.length).toBeGreaterThan(0);
        if (itens.length === 0) continue;
        const conhecidos = itensAte(u.ordem);
        const pr = new Pratica(itens, conhecidos, { cards, now: () => agora, rng });
        let voltas = 0;
        while (!pr.fim) {
          const p = pr.pergunta!;
          expect(apresentadas.has(p.item.carta), `${b.id}: ${p.item.id}`).toBe(true);
          expect(p.opcoes, b.id).toContain(p.item.certa);
          expect(new Set(p.opcoes).size).toBe(p.opcoes.length);
          expect(p.opcoes.length).toBeLessThanOrEqual(3);
          for (const o of p.opcoes) {
            if (o === p.item.certa) continue;
            // A alternativa errada é resposta de um item do mesmo tipo já apresentado.
            const dono = conhecidos.find((i: ItemPratica) => i.tipo === p.item.tipo && i.certa === o && apresentadas.has(i.carta));
            expect(dono, `${b.id}: "${o}" em ${p.item.id}`).toBeDefined();
            expect(p.item.evitar, `${b.id}: ${o} também é leitura de ${p.item.destaque}`).not.toContain(o);
          }
          const errar = rng() < 0.2;
          pr.responder(errar ? (p.opcoes.find((o) => o !== p.item.certa) ?? p.item.certa) : p.item.certa);
          pr.seguir();
          agora += 30_000;
          expect(++voltas).toBeLessThan(200);
        }
        agora += DIA / 4;
      }
    }
  });

  it('errar mostra o item de novo e a pergunta volta no fim; o bloco só acaba com tudo acertado', () => {
    const u = UNIDADES[0]!;
    const b = blocosDa(u).find((x) => x.tipo === 'palavras')!;
    const cards: Record<string, CardState> = {};
    apresentar(cards, cartasDoBloco(b), 0);
    const itens = itensDoBloco(b);
    const pr = new Pratica(itens, itensAte(1), { cards, now: () => 1000, rng: seededRng(1) });
    const primeira = pr.pergunta!.item;
    const errada = pr.pergunta!.opcoes.find((o) => o !== primeira.certa)!;
    expect(pr.responder(errada)?.certa).toBe(false);
    expect(pr.mostrarDeNovo).toBe(primeira);
    // A primeira resposta é a que vale.
    expect(pr.responder(primeira.certa)).toBeNull();
    pr.seguir();
    const vistas: string[] = [];
    while (!pr.fim) {
      vistas.push(pr.pergunta!.item.id);
      pr.responder(pr.pergunta!.item.certa);
      pr.seguir();
    }
    expect(vistas[vistas.length - 1]).toBe(primeira.id);
    expect(pr.acertos).toBe(itens.length - 1);
  });

  it('na primeira vez, duas opções', () => {
    const u = UNIDADES[0]!;
    const b = blocosDa(u).find((x) => x.tipo === 'palavras')!;
    const cards: Record<string, CardState> = {};
    apresentar(cards, cartasDoBloco(b), 0);
    const pr = new Pratica(itensDoBloco(b), itensAte(1), { cards, now: () => 1000, rng: seededRng(3) });
    expect(pr.pergunta!.opcoes.length).toBe(2);
  });

  it('a pergunta de leitura nunca põe como errada outra leitura do mesmo kanji (人: じん e ひと)', () => {
    const u = UNIDADES[0]!;
    const cards: Record<string, CardState> = {};
    for (const b of blocosDa(u)) apresentar(cards, cartasDoBloco(b), 0);
    const hito = itensAte(1).find((i) => i.id === 'k:人:ひと')!;
    expect(hito.evitar).toContain('じん');
    for (let s = 0; s < 30; s++) {
      const pr = new Pratica([hito], itensAte(1), { cards, now: () => 1000, rng: seededRng(s) });
      expect(pr.pergunta!.opcoes).not.toContain('じん');
    }
  });

  it('item nunca apresentado não vira alternativa', () => {
    const u = UNIDADES[0]!;
    const [b1] = blocosDa(u).filter((x) => x.tipo === 'palavras');
    const cards: Record<string, CardState> = {};
    apresentar(cards, cartasDoBloco(b1!), 0);
    const doBloco = new Set(itensDoBloco(b1!).map((i) => i.certa));
    for (let s = 0; s < 20; s++) {
      const pr = new Pratica(itensDoBloco(b1!), itensAte(20), { cards, now: () => 1000, rng: seededRng(s) });
      for (const o of pr.pergunta!.opcoes) expect(doBloco.has(o)).toBe(true);
    }
    expect(foiApresentado(cards, 'w:先生#meaning')).toBe(itensDoBloco(b1!).some((i) => i.id === 'w:先生'));
  });
});

describe('progresso e liberação', () => {
  it('a data da primeira aprovação fica gravada (vai no certificado) e não muda depois', () => {
    const save = ensureCursoSave({});
    registrarProva(save, 'a1-20', 0.5, false, 1000);
    expect(save.provas['a1-20']?.quando).toBeUndefined();
    registrarProva(save, 'a1-20', 0.9, true, 2000);
    registrarProva(save, 'a1-20', 0.95, true, 3000);
    expect(save.provas['a1-20']?.quando).toBe(2000);
    const games: Record<string, unknown> = { curso: { ...save, nome: '  Rafa  ' } };
    const lido = ensureCursoSave(JSON.parse(JSON.stringify(games)));
    expect(lido.provas['a1-20']?.quando).toBe(2000);
    expect(lido.nome).toBe('Rafa');
    expect(ensureCursoSave({ curso: { nome: 5 } }).nome).toBeUndefined();
  });

  it('save novo: só a unidade 1 está liberada, e a próxima lição é o começo dela', () => {
    const games: Record<string, unknown> = {};
    const save = ensureCursoSave(games);
    expect(games.curso).toBe(save);
    expect(liberada(save, 'a1-01')).toBe(true);
    expect(liberada(save, 'a1-02')).toBe(false);
    expect(proximaLicao(save)).toEqual({ unidade: UNIDADES[0], bloco: 0 });
  });

  it('cada bloco feito fica gravado; parar no meio volta no mesmo ponto', () => {
    const save = ensureCursoSave({});
    const u = UNIDADES[0]!;
    expect(registrarBloco(save, u, 0)).toBe(false);
    expect(registrarBloco(save, u, 1)).toBe(false);
    expect(proximaLicao(save)?.bloco).toBe(2);
    // Refazer um bloco anterior não desfaz o progresso.
    registrarBloco(save, u, 0);
    expect(ondeContinuar(save, u)).toBe(2);
  });

  it('o último bloco leva à prova; só a prova aprovada libera a seguinte', () => {
    const save = ensureCursoSave({});
    const [u1, u2] = UNIDADES as [(typeof UNIDADES)[number], (typeof UNIDADES)[number]];
    const n = blocosDa(u1).length;
    for (let i = 0; i < n - 1; i++) expect(registrarBloco(save, u1, i)).toBe(false);
    expect(registrarBloco(save, u1, n - 1)).toBe(true);
    expect(concluiuBlocos(save, u1.id)).toBe(true);
    expect(venceu(save, u1.id)).toBe(false);
    expect(liberada(save, u2.id)).toBe(false);
    expect(proximaLicao(save)).toEqual({ unidade: u1, bloco: 0, prova: true });
    // Reprovou: continua trancada.
    registrarProva(save, u1.id, 0.7, false);
    expect(liberada(save, u2.id)).toBe(false);
    registrarProva(save, u1.id, 0.85, true);
    expect(venceu(save, u1.id)).toBe(true);
    expect(liberada(save, u2.id)).toBe(true);
    expect(liberada(save, UNIDADES[2]!.id)).toBe(false);
    expect(proximaLicao(save)).toEqual({ unidade: u2, bloco: 0 });
    // A unidade feita, aberta de novo, começa do início.
    expect(ondeContinuar(save, u1)).toBe(0);
  });

  it('com o curso todo feito, não há próxima lição', () => {
    const save = ensureCursoSave({});
    for (const u of UNIDADES) {
      registrarBloco(save, u, blocosDa(u).length - 1);
      registrarProva(save, u.id, 0.9, true);
    }
    expect(proximaLicao(save)).toBeNull();
  });

  it('unidade já começada antes das provas continua aberta', () => {
    const save = ensureCursoSave({ curso: { feitos: { 'a1-01': 99, 'a1-02': 2 }, concluidas: { 'a1-01': 1 } } });
    expect(liberada(save, 'a1-02')).toBe(true);
    expect(liberada(save, 'a1-03')).toBe(false);
    // A primeira lição pendente é a prova da unidade 1, que ainda não foi feita.
    expect(proximaLicao(save)).toMatchObject({ unidade: UNIDADES[0], prova: true });
  });

  it('a aprovação não se perde com uma prova pior depois, e a melhor nota fica', () => {
    const save = ensureCursoSave({});
    registrarProva(save, 'a1-01', 0.9, true);
    registrarProva(save, 'a1-01', 0.5, false);
    expect(save.provas['a1-01']).toMatchObject({ aprovada: true, melhor: 0.9, tentativas: 2 });
  });

  it('toda unidade de conteúdo termina com o mini-teste, antes da prova', () => {
    for (const u of UNIDADES.filter((x) => !x.revisao)) expect(blocosDa(u).at(-1)?.tipo, u.id).toBe('miniteste');
  });

  it('o mini-teste só pergunta o que a unidade apresentou', () => {
    for (const u of UNIDADES.filter((x) => !x.revisao)) {
      const cards: Record<string, CardState> = {};
      for (const b of blocosDa(u)) apresentar(cards, cartasDoBloco(b), 0);
      const itens = itensDoMiniteste(u, seededRng(7));
      expect(itens.length, u.id).toBeGreaterThan(0);
      expect(itens.length).toBeLessThanOrEqual(PERGUNTAS_DO_MINITESTE);
      for (const i of itens) expect(foiApresentado(cards, i.carta), `${u.id} ${i.id}`).toBe(true);
    }
  });

  it('save estragado ou de unidade que não existe é limpo', () => {
    const games: Record<string, unknown> = { curso: { feitos: { 'a1-01': 3, 'x-99': 2, 'a1-02': 'muito' }, concluidas: { 'a1-01': -1 } } };
    const save = ensureCursoSave(games);
    expect(save).toEqual({ feitos: { 'a1-01': 3 }, concluidas: {}, provas: {} });
    expect(ensureCursoSave({ curso: 'lixo' })).toEqual({ feitos: {}, concluidas: {}, provas: {} });
    const comProva = ensureCursoSave({ curso: { provas: { 'a1-01': { melhor: 2, aprovada: 'sim', tentativas: -3 }, 'x-99': { melhor: 1, aprovada: true, tentativas: 1 } } } });
    expect(comProva.provas).toEqual({ 'a1-01': { melhor: 1, aprovada: false, tentativas: 0 } });
  });
});
