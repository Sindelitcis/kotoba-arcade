import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/core/rng';
import { foiApresentado } from '../src/core/ensino';
import { emptySave } from '../src/core/save';
import { review, type CardState, newCard } from '../src/core/srs';
import {
  ACERTOS_PARA_ABRIR,
  CenaRound,
  chave,
  contagem,
  daCoisa,
  ensureCenaSave,
  ETAPAS,
  kanaDe,
  lugarSugerido,
  palavraDe,
  REL,
  TAREFAS_POR_RODADA,
  tarefas,
  textoDe,
  validarLugar,
  vizinho,
  type Coisa,
  type Etapa,
  type Lugar,
  type Tarefa,
} from '../src/games/cena/engine';
import { LUGARES } from '../src/games/cena/lugares';

/** Uma cena pequena, feita à mão, para as regras. */
const SALA: Lugar = {
  id: 'sala',
  fundo: 'heya',
  jp: '部屋',
  kana: 'へや',
  pt: 'quarto',
  coisas: [
    { id: 'mesa', img: 'teburu', x: 40, y: 90, w: 30 },
    { id: 'cadeira', img: 'isu', x: 70, y: 95, w: 10 },
    { id: 'b1', img: 'kaban-aka', x: 30, y: 70, w: 6, rel: 'ue', de: 'mesa' },
    { id: 'b2', img: 'kaban-ao', x: 45, y: 70, w: 6, rel: 'ue', de: 'mesa' },
    { id: 'b3', img: 'kaban-aka', x: 70, y: 80, w: 9, rel: 'ue', de: 'cadeira' },
    { id: 'r1', img: 'ringo', x: 33, y: 70, w: 3, rel: 'ue', de: 'mesa' },
    { id: 'r2', img: 'ringo', x: 37, y: 70, w: 3, rel: 'ue', de: 'mesa' },
    { id: 'r3', img: 'ringo', x: 41, y: 70, w: 3, rel: 'ue', de: 'mesa' },
    { id: 'r4', img: 'ringo', x: 70, y: 97, w: 3, rel: 'shita', de: 'cadeira' },
    { id: 'gato', img: 'neko', x: 40, y: 89, w: 6, rel: 'shita', de: 'mesa' },
    { id: 'leitor', img: 'yomu', x: 90, y: 98, w: 9 },
  ],
};

/** Vê a apresentação e a lição (se houver) e responde a tarefa certa (todas as etapas). */
function responder(r: CenaRound) {
  r.apresentou();
  r.comecar();
  const t = r.tarefa;
  if (t.marcada) return r.escolher(r.opcoes.indexOf(t.palavras[0]!));
  if (t.pecas) {
    const ev = [];
    for (const s of t.pecas.certas) ev.push(...r.peca(r.bandeja.findIndex((b) => b.t === s.t)));
    return ev;
  }
  return r.clicar(t.alvo[0]!);
}

function firme(): CardState {
  let c = review(newCard(0), { correct: true }, 0);
  while (c.stability < 5) c = review(c, { correct: true }, c.due);
  return c;
}

function rodada(lugar: Lugar, seed = 1, etapas = 1, todasVistas = false) {
  const data = emptySave(0);
  const save = ensureCenaSave(data.games);
  save.etapas = etapas;
  if (todasVistas) {
    save.licoes = [...ETAPAS];
    for (const c of lugar.coisas) data.cards[chave(palavraDe(c))] = firme();
  }
  let t = 1_000_000;
  const r = new CenaRound({ lugar, cards: data.cards, profile: data.profile, save, now: () => (t += 2000), rng: seededRng(seed) });
  // Com tudo visto, o que sobrar de palavra (cores, contadores) é apresentado de uma vez.
  if (todasVistas) r.apresentou();
  return { r, data, save };
}

/** Confere que a resposta de uma tarefa é exatamente o que a frase descreve. */
function confere(l: Lugar, t: Tarefa) {
  expect(t.alvo.length, textoDe(t.segs)).toBeGreaterThan(0);
  for (const id of t.alvo) expect(l.coisas.some((c) => c.id === id)).toBe(true);
  expect(new Set(t.alvo).size).toBe(t.alvo.length);
}

describe('Cena Viva: instruções geradas', () => {
  it('achar: aceita qualquer coisa daquela palavra, de qualquer cor', () => {
    const t = tarefas(SALA, 'achar').find((x) => textoDe(x.segs) === 'かばんはどこ？')!;
    expect(t.alvo.sort()).toEqual(['b1', 'b2', 'b3']);
  });

  it('cor: só as da cor pedida, e só quando a cor decide', () => {
    const ts = tarefas(SALA, 'cor').map((t) => [textoDe(t.segs), t.alvo.sort()]);
    expect(ts).toContainEqual(['赤いかばんはどこ？', ['b1', 'b3']]);
    expect(ts).toContainEqual(['青いかばんはどこ？', ['b2']]);
    // A maçã só tem uma cor: não vira pergunta de cor.
    expect(ts.some(([t]) => (t as string).includes('りんご'))).toBe(false);
  });

  it('tamanho: só com diferença clara', () => {
    const ts = tarefas(SALA, 'tamanho').map((t) => [textoDe(t.segs), t.alvo]);
    expect(ts).toContainEqual(['大きいかばんはどこ？', ['b3']]);
  });

  it('lugar: "テーブルの上のりんご" é o grupo de cima da mesa, não a maçã embaixo da cadeira', () => {
    const t = tarefas(SALA, 'lugar').find((x) => textoDe(x.segs) === 'テーブルの上のりんごはどこ？')!;
    expect(t.alvo.sort()).toEqual(['r1', 'r2', 'r3']);
    expect(kanaDe(t.segs)).toBe('テーブルのうえのりんごはどこ？');
  });

  it('contar: o grupo de três e o de um, cada um com o contador certo', () => {
    const ts = tarefas(SALA, 'contar');
    const tres = ts.find((t) => textoDe(t.segs).includes('三つ'))!;
    expect(tres.alvo.sort()).toEqual(['r1', 'r2', 'r3']);
    expect(kanaDe(tres.segs)).toBe('りんごがみっつあるところはどこ？');
    expect(ts.find((t) => textoDe(t.segs) === 'りんごが一つあるところはどこ？')!.alvo).toEqual(['r4']);
  });

  it('contadores: leitura certa nas irregulares', () => {
    expect(contagem(3, 'hon').r).toBe('さんぼん');
    expect(contagem(1, 'hiki').r).toBe('いっぴき');
    expect(contagem(2, 'nin').r).toBe('ふたり');
    expect(contagem(4, 'tsu')).toEqual({ t: '四つ', r: 'よっつ' });
    expect(() => contagem(9, 'tsu')).toThrow();
  });

  it('ação: 読んでいる人', () => {
    const t = tarefas(SALA, 'acao')[0]!;
    expect(textoDe(t.segs)).toBe('読んでいる人はどこ？');
    expect(kanaDe(t.segs)).toBe('よんでいるひとはどこ？');
    expect(t.alvo).toEqual(['leitor']);
  });

  it('denso: lugar + cor só quando os dois juntos decidem', () => {
    const t = tarefas(SALA, 'denso').find((x) => textoDe(x.segs) === 'テーブルの上にある赤いかばんはどこ？')!;
    expect(t.alvo).toEqual(['b1']);
    expect(t.palavras.map((w) => w.jp)).toEqual(['テーブル', '赤い', 'かばん']);
    // Na cadeira só tem a vermelha: "椅子の上にある赤いかばん" não precisaria da cor.
    expect(tarefas(SALA, 'denso').some((x) => textoDe(x.segs).startsWith('椅子の上にある赤い'))).toBe(false);
  });

  it('denso: 左から二番目 segue a ordem da esquerda para a direita', () => {
    const t = tarefas(SALA, 'denso').find((x) => textoDe(x.segs) === '左から二番目のりんごはどこ？')!;
    expect(t.alvo).toEqual(['r2']);
  });

  it('descrever: a frase certa, com います para bicho e あります para coisa', () => {
    const ds = tarefas(SALA, 'descrever');
    expect(ds.map((t) => textoDe(t.segs))).toContain('テーブルの下に猫がいます');
    expect(ds.map((t) => textoDe(t.segs))).toContain('テーブルの上にかばんがあります');
    for (const t of ds) {
      expect(t.pecas!.sobras.length).toBeGreaterThan(0);
      for (const s of t.pecas!.sobras) expect(t.pecas!.certas.some((c) => c.t === s.t)).toBe(false);
    }
  });

  it('descrever: gente parada (o médico) "está" (います), como bicho, e fica no lugar como as coisas', () => {
    const l: Lugar = { ...SALA, coisas: [...SALA.coisas, { id: 'medico', img: 'isha', x: 62, y: 90, w: 8, rel: 'yoko', de: 'mesa' }] };
    const ds = tarefas(l, 'descrever').map((t) => textoDe(t.segs));
    expect(ds).toContain('テーブルの横に医者がいます');
    expect(ds.some((t) => t.includes('医者があります'))).toBe(false);
  });

  it('palavra com kanji leva leitura; a frase sem leitura não tem kanji', () => {
    for (const l of LUGARES)
      for (const e of ETAPAS)
        for (const t of tarefas(l, e)) for (const s of t.segs) if (/[一-鿿]/.test(s.t)) expect(s.r, `${l.id}: ${s.t}`).toBeTruthy();
  });
});

describe('Cena Viva: os oito lugares', () => {
  it('são oito, e cada um passa na validação', () => {
    expect(LUGARES.map((l) => l.id)).toEqual(['konbini', 'eki', 'heya', 'jimusho', 'daidokoro', 'yakkyoku', 'resutoran', 'michi']);
    for (const l of LUGARES) expect(validarLugar(l)).toEqual([]);
  });

  it('cada lugar tem dezenas de coisas', () => {
    for (const l of LUGARES) expect(l.coisas.length, l.id).toBeGreaterThanOrEqual(20);
  });

  it('todo lugar tem tarefa em todas as oito etapas (senão a etapa travaria ali)', () => {
    for (const l of LUGARES) for (const e of ETAPAS) expect(tarefas(l, e).length, `${l.id} / ${e}`).toBeGreaterThan(0);
  });

  it('toda resposta existe e nenhuma tarefa repete o texto com outra resposta', () => {
    for (const l of LUGARES) {
      const vistos = new Map<string, string>();
      for (const e of ETAPAS) {
        for (const t of tarefas(l, e)) {
          confere(l, t);
          const k = textoDe(t.segs);
          const alvo = [...t.alvo].sort().join(',');
          if (vistos.has(k)) expect(vistos.get(k), `${l.id}: ${k}`).toBe(alvo);
          vistos.set(k, alvo);
        }
      }
    }
  });

  it('achar e lugar: a resposta é exatamente o conjunto que a frase descreve', () => {
    for (const l of LUGARES) {
      for (const t of tarefas(l, 'achar')) {
        const w = t.palavras[0]!;
        expect(t.alvo.sort()).toEqual(l.coisas.filter((c) => palavraDe(c).id === w.id).map((c) => c.id).sort());
      }
      for (const t of tarefas(l, 'lugar')) {
        const w = t.palavras[0]!;
        const rel = (Object.keys(REL) as (keyof typeof REL)[]).find((r) => t.segs.some((s) => s.t === REL[r].jp))!;
        const esperado = l.coisas.filter((c) => palavraDe(c).id === w.id && c.rel === rel && textoDe(t.segs).startsWith(palavraDe(l.coisas.find((o) => o.id === c.de)!).jp));
        for (const c of esperado) expect(t.alvo).toContain(c.id);
      }
    }
  });

  it('total de instruções diferentes (para o relatório)', () => {
    const n = LUGARES.reduce((a, l) => a + ETAPAS.reduce((b, e) => b + tarefas(l, e).length, 0), 0);
    expect(n).toBeGreaterThan(400);
  });
});

describe('Cena Viva: rodada', () => {
  it('jogador novo: primeiro as coisas da cena, uma a uma; depois a lição de "isto é"; só então a pergunta', () => {
    const { r, data } = rodada(LUGARES[0]!);
    expect(r.fase).toBe('apresenta');
    expect(r.apresentadas.length).toBeGreaterThanOrEqual(3);
    expect(r.apresentadas.length).toBeLessThanOrEqual(5);
    expect(Object.keys(data.cards)).toHaveLength(0);
    // Nada responde antes da apresentação acabar, e ainda não há tarefa (a tela não pode pedir uma).
    expect(r.clicar(LUGARES[0]!.coisas[0]!.id)).toEqual([]);
    expect(r.temTarefa).toBe(false);
    expect(() => r.tarefa).toThrow(/apresentação/);
    r.apresentou();
    for (const w of r.apresentadas) expect(foiApresentado(data.cards, chave(w))).toBe(true);
    expect(r.fase).toBe('licao');
    expect(r.tarefa.etapa).toBe('nome');
    r.comecar();
    expect(r.fase).toBe('pergunta');
    expect(r.apoio).toBe(true);
    expect(r.tarefa.marcada).toBeTruthy();
    expect(r.brilha(r.tarefa.marcada!)).toBe(true);
    expect(r.opcoes).toHaveLength(2);
    expect(r.opcoes).toContain(r.tarefa.palavras[0]);
  });

  it('a primeira etapa é só o nome das coisas; "onde está" só abre depois', () => {
    expect(ETAPAS[0]).toBe('nome');
    expect(ETAPAS[1]).toBe('achar');
    const { r, save } = rodada(LUGARES[1]!, 2);
    for (let i = 0; i < TAREFAS_POR_RODADA; i++) {
      responder(r);
      expect(r.tarefa.etapa).toBe('nome');
      r.seguir();
      if (r.fase === 'fim') break;
    }
    expect(save.etapas).toBe(1);
  });

  it('nenhuma pergunta usa palavra que não foi apresentada', () => {
    for (let seed = 1; seed < 12; seed++) {
      const { r, data } = rodada(LUGARES[seed % LUGARES.length]!, seed, 1 + (seed % 4));
      for (let i = 0; i < TAREFAS_POR_RODADA && r.fase !== 'fim'; i++) {
        responder(r);
        for (const w of r.tarefa.palavras) expect(foiApresentado(data.cards, chave(w)), w.jp).toBe(true);
        r.seguir();
      }
    }
  });

  it('erro na prática não tira pontos nem combo: mostra a palavra de novo e o alvo já brilha', () => {
    const { r } = rodada(SALA, 3, 2);
    r.apresentou();
    r.comecar();
    expect(r.apoio).toBe(true);
    const combo = r.combo;
    const pontos = r.pontos;
    const t = r.tarefa;
    const ev = t.marcada ? r.escolher(r.opcoes.findIndex((w) => w !== t.palavras[0])) : r.clicar(SALA.coisas.find((c) => !t.alvo.includes(c.id) && r.clicavel(c.id))!.id);
    expect(ev.some((e) => e.t === 'de-novo')).toBe(true);
    expect(r.combo).toBe(combo);
    expect(r.pontos).toBe(pontos);
    if (t.marcada) expect(r.opcoes).toHaveLength(1);
    else expect(r.brilha(t.alvo[0]!)).toBe(true);
  });

  it('na cobrança, clique errado: a coisa diz o nome, combo zera, sem tela de erro; dois enganos fazem o alvo brilhar', () => {
    const { r, data } = rodada(SALA, 3, 2, true);
    let guarda = 0;
    while (r.tarefa.etapa !== 'achar' && guarda++ < 30) {
      responder(r);
      r.seguir();
    }
    expect(r.fase).toBe('pergunta');
    expect(r.apoio).toBe(false);
    const outra = SALA.coisas.find((c) => !r.tarefa.alvo.includes(c.id))!;
    const ev = r.clicar(outra.id);
    expect(ev[0]).toMatchObject({ t: 'outra', coisa: outra.id });
    expect(r.combo).toBe(0);
    expect(r.fase).toBe('pergunta');
    const w = r.tarefa.palavras[0]!;
    expect(data.cards[chave(w)]!.lapses).toBe(1);
    expect(r.brilha(r.tarefa.alvo[0]!)).toBe(false);
    r.clicar(outra.id);
    expect(r.brilha(r.tarefa.alvo[0]!)).toBe(true);
  });

  it('rodada inteira: 8 tarefas, resumo, XP, moedas e o lugar contado', () => {
    const { r, save, data } = rodada(LUGARES[2]!, 4);
    let fim = null;
    for (let i = 0; i < TAREFAS_POR_RODADA; i++) {
      responder(r);
      expect(r.fase).toBe('feita');
      const ev = r.seguir();
      fim = ev.find((e) => e.t === 'fim') ?? fim;
    }
    expect(fim).toBeTruthy();
    expect(save.rounds).toBe(1);
    expect(save.lugares.heya).toBe(1);
    expect(data.profile.coins).toBeGreaterThan(0);
  });

  it(`${ACERTOS_PARA_ABRIR} acertos de primeira na cobrança abrem a etapa seguinte, que chega com lição`, () => {
    const { r, save } = rodada(SALA, 5, 1, true);
    save.licoes = ['nome'];
    let abriu = false;
    for (let i = 0; i < ACERTOS_PARA_ABRIR; i++) {
      const ev = responder(r);
      if (ev.some((e) => e.t === 'abre')) abriu = true;
      r.seguir();
    }
    expect(abriu).toBe(true);
    expect(save.etapas).toBe(2);
    // A próxima tarefa é a da etapa nova, com lição.
    expect(r.tarefa.etapa).toBe('achar');
    expect(r.fase).toBe('licao');
  });

  it('acerto na prática não conta para abrir a etapa seguinte', () => {
    const { r, save } = rodada(SALA, 5, 1);
    for (let i = 0; i < ACERTOS_PARA_ABRIR; i++) {
      const praticando = r.fase === 'apresenta' || r.apoio;
      const ev = responder(r);
      if (praticando) expect(ev.some((e) => e.t === 'abre')).toBe(false);
      r.seguir();
    }
    expect(save.acertos.nome ?? 0).toBeLessThan(ACERTOS_PARA_ABRIR);
  });

  it('descrever: peça errada volta, a certa encaixa; a frase completa acerta', () => {
    const { r } = rodada(SALA, 6, ETAPAS.length, true);
    let tentativas = 0;
    while (!r.tarefa.pecas && tentativas++ < 50) {
      responder(r);
      r.seguir();
      if (r.fase === 'fim') return;
    }
    const t = r.tarefa;
    expect(t.pecas).toBeTruthy();
    const errada = r.bandeja.findIndex((s) => s.t !== t.pecas!.certas[0]!.t);
    expect(r.peca(errada)[0]!.t).toBe('volta');
    const ev = responder(r);
    expect(ev.some((e) => e.t === 'certo')).toBe(true);
  });

  it('parar no meio vale como rodada curta; sem nada feito, não conta', () => {
    const a = rodada(SALA, 7, 1, true);
    expect(a.r.parar()).toEqual([]);
    expect(a.save.rounds).toBe(0);
    responder(a.r);
    expect(a.r.parar().some((e) => e.t === 'fim')).toBe(true);
    expect(a.save.rounds).toBe(1);
  });

  it('sorteio nunca escolhe etapa fechada', () => {
    for (let seed = 1; seed < 30; seed++) {
      const { r, save } = rodada(LUGARES[seed % LUGARES.length]!, seed, 3, true);
      for (let i = 0; i < TAREFAS_POR_RODADA; i++) {
        expect(ETAPAS.indexOf(r.tarefa.etapa as Etapa)).toBeLessThan(save.etapas);
        responder(r);
        r.seguir();
      }
    }
  });

  it('save de antes da etapa "nome" não perde etapa nenhuma; save novo começa no nome', () => {
    const antigo = ensureCenaSave({ cena: { etapas: 2, rounds: 4, acertos: {}, lugares: {}, licoes: ['achar', 'cor'], best: 0 } });
    expect(antigo.etapas).toBe(3);
    expect(antigo.ordem).toBe(1);
    // Rodar de novo não soma outra vez.
    expect(ensureCenaSave({ cena: antigo }).etapas).toBe(3);
    const jogouUmaVez = ensureCenaSave({ cena: { etapas: 1, rounds: 1 } });
    expect(jogouUmaVez.etapas).toBe(2);
    const novo = ensureCenaSave({});
    expect(novo.etapas).toBe(1);
    expect(ETAPAS[novo.etapas - 1]).toBe('nome');
  });

  it('o lugar sugerido é o menos jogado', () => {
    const save = ensureCenaSave({});
    expect(lugarSugerido(LUGARES, save).id).toBe('konbini');
    save.lugares = { konbini: 2, eki: 1 };
    expect(lugarSugerido(LUGARES, save).id).toBe('heya');
  });

  it('save quebrado é consertado no mesmo objeto', () => {
    const games: Record<string, unknown> = { cena: { etapas: 99, acertos: { achar: 'x', cor: 2 }, licoes: ['achar', 'nada', 3], rounds: NaN } };
    const s = ensureCenaSave(games);
    expect(s).toBe(games.cena);
    expect(s.etapas).toBe(ETAPAS.length);
    expect(s.acertos).toEqual({ cor: 2 });
    expect(s.licoes).toEqual(['achar']);
    expect(s.rounds).toBe(0);
  });
});

describe('Cena Viva: teclado', () => {
  const caixas = [
    { id: 'a', cx: 10, cy: 50 },
    { id: 'b', cx: 50, cy: 50 },
    { id: 'c', cx: 50, cy: 10 },
    { id: 'd', cx: 90, cy: 52 },
  ];
  it('as setas andam para a coisa mais próxima naquela direção', () => {
    expect(vizinho(caixas, 'a', 'ArrowRight')).toBe('b');
    expect(vizinho(caixas, 'b', 'ArrowRight')).toBe('d');
    expect(vizinho(caixas, 'b', 'ArrowUp')).toBe('c');
    expect(vizinho(caixas, 'c', 'ArrowDown')).toBe('b');
  });
  it('sem ninguém naquela direção, fica onde está; sem cursor, começa por uma ponta', () => {
    expect(vizinho(caixas, 'a', 'ArrowLeft')).toBe('a');
    expect(vizinho(caixas, null, 'ArrowRight')).toBe('a');
    expect(vizinho([], null, 'ArrowRight')).toBe(null);
  });
  it('toda coisa de todo lugar é alcançável pelas setas', () => {
    for (const l of LUGARES) {
      const cx = l.coisas.map((c: Coisa) => ({ id: c.id, cx: c.x, cy: c.y - 5 }));
      const vistos = new Set<string>();
      const fila = [cx[0]!.id];
      while (fila.length) {
        const id = fila.pop()!;
        if (vistos.has(id)) continue;
        vistos.add(id);
        for (const d of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const) fila.push(vizinho(cx, id, d)!);
      }
      expect(vistos.size, l.id).toBe(l.coisas.length);
    }
  });
  it('daCoisa separa a cor do objeto colorido', () => {
    expect(daCoisa({ id: 'x', img: 'kasa-ao', x: 1, y: 1, w: 1 })).toMatchObject({ cor: 'ao' });
    expect(daCoisa({ id: 'x', img: 'kasa-ao', x: 1, y: 1, w: 1 }).figura.word.jp).toBe('傘');
  });
});
