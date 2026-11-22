import { describe, expect, it } from 'vitest';
import { cardKey, KANJI } from '../src/content';
import { foiApresentado } from '../src/core/ensino';
import { readingMeter } from '../src/core/progress';
import { seededRng } from '../src/core/rng';
import { emptySave } from '../src/core/save';
import { review, State, type CardState, newCard } from '../src/core/srs';
import { KANJI_PECAS, kanjiPeca, PARECIDOS, type KanjiPeca } from '../src/games/pecas/dados';
import {
  cartaComposto,
  cartaPecas,
  cartaSignificado,
  COMPOSTOS,
  ensurePecasSave,
  ERROS_ATE_BRILHAR,
  opcoesDeLeitura,
  PecasRound,
  pecasDoKanji,
  PONTOS_ACERTO,
  PONTOS_RAPIDO,
  ROUND_SIZE,
  VARIANTES,
  type Deps,
  type Modo,
  type Pergunta,
} from '../src/games/pecas/engine';
import tracos from '../src/games/pecas/tracos.json';

const T = tracos as unknown as { kanji: Record<string, { g: Record<string, number[]> }> };
const elementos = (k: string) => Object.keys(T.kanji[k]?.g ?? {});

function deps(over: Partial<Deps> = {}): Deps & { clock: { t: number } } {
  const clock = { t: Date.UTC(2026, 10, 19, 12) };
  const save = emptySave(clock.t);
  return {
    cards: {},
    save: ensurePecasSave(save.games),
    profile: save.profile,
    now: () => clock.t,
    rng: seededRng(7),
    elementos,
    clock,
    ...over,
  };
}

/** Índice da resposta certa da pergunta atual. */
function certa(p: Pergunta): number {
  return p.modo === 'montar' ? -1 : p.certa;
}

/** Responde a pergunta atual certo (no montar, coloca as peças certas em ordem). */
function acertar(r: PecasRound) {
  if (r.fase === 'licao') r.seguir();
  const p = r.pergunta;
  if (p.modo === 'montar') {
    let ev = [] as ReturnType<PecasRound['responder']>;
    for (const x of p.precisa) ev = r.responder(p.bandeja.indexOf(x));
    return ev;
  }
  return r.responder(certa(p));
}

function errar(r: PecasRound) {
  if (r.fase === 'licao') r.seguir();
  const p = r.pergunta;
  if (p.modo === 'montar') return r.responder(p.bandeja.findIndex((x) => !p.precisa.includes(x)));
  return r.responder((certa(p) + 1) % (p.modo === 'intruso' ? p.grade.length : p.opcoes.length));
}

/** Cartas de peças já em cobrança (firmes, não vencidas) para a lista. */
function firmes(lista: readonly KanjiPeca[], t: number): Record<string, CardState> {
  const cards: Record<string, CardState> = {};
  for (const k of lista) {
    let c = review(newCard(0), { correct: true }, t - 400 * 86_400_000);
    while (c.state !== State.Review) c = review(c, { correct: true }, c.due);
    cards[cartaPecas(k)] = { ...c, due: t + 30 * 86_400_000 };
  }
  return cards;
}

/** Cartas de quem já viu os kanji (revisados há um tempo). */
function vistos(lista: readonly KanjiPeca[], t: number): Record<string, CardState> {
  const cards: Record<string, CardState> = {};
  for (const k of lista) {
    let c = review(newCard(0), { correct: true }, t - 20 * 86_400_000);
    c = review(c, { correct: true }, t - 10 * 86_400_000);
    cards[cartaPecas(k)] = c;
  }
  return cards;
}

describe('save', () => {
  it('cria e conserta o save do jogo', () => {
    const games: Record<string, unknown> = {};
    expect(ensurePecasSave(games)).toEqual({ rounds: 0, best: 0, bestCombo: 0 });
    games.pecas = { rounds: -3, best: 'x', bestCombo: 4 };
    expect(ensurePecasSave(games)).toEqual({ rounds: 0, best: 0, bestCombo: 4 });
    games.pecas = [1];
    expect(ensurePecasSave(games).rounds).toBe(0);
  });
});

describe('primeiro contato ensina antes de cobrar', () => {
  it('save novo: a primeira pergunta é de um kanji do N5 e abre com a lição', () => {
    const r = new PecasRound(deps());
    expect(r.fase).toBe('licao');
    expect(r.pergunta.k.nivel).toBe('N5');
    expect(r.pergunta.licao).toBe(true);
    // Na lição nada se responde: tecla de número não conta como resposta.
    expect(r.responder(0)).toEqual([]);
    r.seguir();
    expect(r.fase).toBe('pergunta');
  });

  it('kanji novo com todas as peças já conhecidas vem no modo adivinhar, sem lição, com ajuda anotada', () => {
    // 休 = 亻 + 木: com 何 (亻) e 木 vistos, as duas peças já são conhecidas.
    const d = deps();
    d.cards = vistos([kanjiPeca('何')!, kanjiPeca('木')!], d.clock.t);
    const r = new PecasRound({ ...d, modo: 'adivinhar' });
    expect(r.adivinhavel(kanjiPeca('休')!)).toBe(true);
    expect(r.pergunta.modo).toBe('adivinhar');
    expect(r.fase).toBe('pergunta');
    const k = r.pergunta.k;
    expect(d.cards[cartaPecas(k)]).toBeUndefined();
    acertar(r);
    // Chute com as peças na tela é acerto com ajuda: o FSRS não marca como fácil.
    expect(d.cards[cartaPecas(k)]!.reps).toBe(1);
    expect(d.cards[cartaSignificado(k)]).toBeDefined();
  });
});

describe('rodada', () => {
  it('na prática, acerto soma combo e pontos; erro mostra a explicação sem zerar o combo', () => {
    const d = deps();
    const r = new PecasRound(d);
    const ev = acertar(r);
    expect(ev[0]).toMatchObject({ combo: 1 });
    expect(r.fase).toBe('revela');
    expect(r.pontos).toBe(PONTOS_ACERTO); // depois de lição não vale bônus de rápido
    r.seguir();
    if (r.fase === 'licao') r.seguir();
    expect(r.pratica).toBe(true);
    const antes = r.pontos;
    const ev2 = errar(r);
    if (r.pergunta.modo !== 'montar') {
      expect(ev2[0]).toEqual({ t: 'erro' });
      expect(r.fase).toBe('revela');
      expect(r.pontos).toBe(antes);
      expect(r.combo).toBe(1);
    }
  });

  it('na cobrança, erro zera o combo e mostra a explicação', () => {
    const d = deps({ modo: 'peca' });
    d.cards = firmes(KANJI_PECAS, d.clock.t);
    const r = new PecasRound(d);
    expect(r.pratica).toBe(false);
    acertar(r);
    expect(r.combo).toBe(1);
    r.seguir();
    const antes = r.pontos;
    const ev = errar(r);
    expect(ev[0]).toEqual({ t: 'erro' });
    expect(r.fase).toBe('revela');
    expect(r.pontos).toBe(antes);
    expect(r.combo).toBe(0);
  });

  it('nenhuma pergunta cobra kanji que não foi apresentado', () => {
    for (const modo of ['misto', 'peca', 'montar', 'intruso', 'adivinhar', 'composto'] as Modo[]) {
      const d = deps({ modo });
      const r = new PecasRound(d);
      for (let i = 0; i < ROUND_SIZE && r.fase !== 'fim'; i++) {
        if (r.fase === 'licao') r.seguir();
        const p = r.pergunta;
        // Adivinhar pelas peças já conhecidas é o jeito de apresentar o kanji: as peças foram vistas.
        const pelasPecas = p.modo === 'adivinhar' && r.adivinhavel(p.k);
        // No composto, o item é a palavra (a tela mostra a leitura de cada kanji ao abrir).
        const visto = p.modo === 'composto' ? foiApresentado(d.cards, cartaComposto(p.palavra)) : Object.keys(d.cards).some((c) => c.startsWith(`${p.k.id}#`));
        expect(visto || pelasPecas, `${modo} ${p.k.kanji}`).toBe(true);
        acertar(r);
        d.clock.t += 60_000;
        r.seguir();
      }
    }
  });

  it('resposta rápida fora da lição vale bônus', () => {
    const d = deps({ modo: 'peca' });
    d.cards = vistos(KANJI_PECAS, d.clock.t);
    const r = new PecasRound(d);
    expect(r.fase).toBe('pergunta');
    d.clock.t += 1000;
    acertar(r);
    expect(r.pontos).toBe(PONTOS_ACERTO + PONTOS_RAPIDO);
  });

  it(`termina depois de ${ROUND_SIZE} perguntas e grava rodada, recorde e combo`, () => {
    const d = deps();
    const r = new PecasRound(d);
    let fim = null;
    for (let i = 0; i < ROUND_SIZE; i++) {
      acertar(r);
      const ev = r.seguir();
      fim = ev.find((e) => e.t === 'fim') ?? fim;
    }
    expect(r.fase).toBe('fim');
    expect(fim).toMatchObject({ t: 'fim', resumo: { perguntas: ROUND_SIZE, acertos: ROUND_SIZE, recorde: true } });
    expect(d.save.rounds).toBe(1);
    expect(d.save.best).toBe(r.pontos);
    expect(d.save.bestCombo).toBe(ROUND_SIZE);
    expect(d.profile.xp).toBeGreaterThan(0);
    // Seguir depois do fim não faz nada.
    expect(r.seguir()).toEqual([]);
  });

  it('o mesmo kanji não volta logo em seguida na mesma rodada, nem para quem está começando', () => {
    for (const seed of [1, 7, 13]) {
      const d = deps({ rng: seededRng(seed) });
      const r = new PecasRound(d);
      const vistosNaRodada: string[] = [];
      for (let i = 0; i < ROUND_SIZE && r.fase !== 'fim'; i++) {
        vistosNaRodada.push(r.pergunta.k.kanji);
        acertar(r);
        r.seguir();
      }
      for (let i = 1; i < vistosNaRodada.length; i++) expect(vistosNaRodada[i], `seed ${seed}, pergunta ${i}`).not.toBe(vistosNaRodada[i - 1]);
      expect(new Set(vistosNaRodada.slice(0, 3)).size).toBe(3);
    }
  });
});

describe('modo 1: achar a peça', () => {
  it('as alternativas erradas nunca estão no kanji (nem como outra forma da peça)', () => {
    // Bug que este teste evita: oferecer 人 como errada em 休, que tem 亻.
    // Tudo visto: há peça conhecida de sobra para as quatro alternativas.
    const todos = vistos(KANJI_PECAS, deps().clock.t);
    for (const k of KANJI_PECAS.filter((x) => pecasDoKanji(x).length > 0)) {
      const d = deps({ modo: 'peca', rng: seededRng(k.ordem + 1) });
      d.cards = { ...todos };
      const r = new PecasRound(d);
      // Uma semente por kanji: a rodada sorteia, e a regra vale para toda pergunta que sair.
      const p = r.pergunta;
      if (p.modo !== 'peca') continue;
      const dentro = new Set([...p.k.pecas, ...elementos(p.k.kanji)].flatMap((x) => [...(VARIANTES.find((v) => v.includes(x)) ?? x)]));
      expect(p.opcoes).toContain(p.alvo);
      expect(new Set(p.opcoes).size).toBe(4);
      for (const o of p.opcoes) if (o !== p.alvo) expect(dentro.has(o), `${p.k.kanji}: ${o}`).toBe(false);
    }
  });
});

describe('modo 1: só peça já vista confunde', () => {
  it('com poucos kanji vistos, toda alternativa errada é peça de um kanji visto', () => {
    const lista = KANJI_PECAS.filter((x) => pecasDoKanji(x).length > 0).slice(0, 4);
    const conhecidas = new Set(lista.flatMap((k) => [k.kanji, ...k.pecas]));
    for (let s = 1; s < 20; s++) {
      const d = deps({ modo: 'peca', rng: seededRng(s) });
      d.cards = vistos(lista, d.clock.t);
      const r = new PecasRound(d);
      const p = r.pergunta;
      if (p.modo === 'peca') for (const o of p.opcoes) if (o !== p.alvo) expect(conhecidas.has(o), o).toBe(true);
      if (p.modo === 'montar') for (const o of p.bandeja) if (!p.precisa.includes(o)) expect(conhecidas.has(o), o).toBe(true);
    }
  });

  it('o primeiro kanji, sem nada visto antes: monta com as peças dele em vez de escolher entre peças nunca vistas', () => {
    const d = deps({ modo: 'peca' });
    const r = new PecasRound(d);
    r.seguir();
    const p = r.pergunta;
    if (p.modo === 'peca') expect(p.opcoes).toEqual([p.alvo]);
    else if (p.modo === 'montar') expect(p.bandeja.every((x) => p.precisa.includes(x))).toBe(true);
  });
});

describe('modo 2: montar', () => {
  function montar(): { r: PecasRound; d: ReturnType<typeof deps> } {
    const d = deps({ modo: 'montar' });
    d.cards = vistos(KANJI_PECAS, d.clock.t);
    const r = new PecasRound(d);
    return { r, d };
  }

  it('peça errada volta para a bandeja; depois de duas, a certa brilha', () => {
    const { r } = montar();
    const p = r.pergunta;
    if (p.modo !== 'montar') throw new Error('modo');
    expect(p.precisa.length).toBeGreaterThanOrEqual(2);
    const erradas = p.bandeja.filter((x) => !p.precisa.includes(x));
    expect(r.responder(p.bandeja.indexOf(erradas[0]!))).toEqual([{ t: 'volta', peca: erradas[0] }]);
    expect(p.brilha).toBeNull();
    r.responder(p.bandeja.indexOf(erradas[1]!));
    expect(p.erros).toBe(ERROS_ATE_BRILHAR);
    expect(p.precisa).toContain(p.bandeja[p.brilha!]);
    // A peça certa encaixa e, se ainda falta outra, o brilho passa para ela.
    const ev = r.responder(p.brilha!);
    if (p.colocadas.length < p.precisa.length) {
      expect(ev[0]?.t).toBe('encaixe');
      expect(p.precisa).toContain(p.bandeja[p.brilha!]);
    }
  });

  it('montar com erro no meio termina o kanji e vale metade, sem tirar pontos', () => {
    const { r, d } = montar();
    const p = r.pergunta;
    if (p.modo !== 'montar') throw new Error('modo');
    r.responder(p.bandeja.findIndex((x) => !p.precisa.includes(x)));
    let ev = [] as ReturnType<PecasRound['responder']>;
    for (const x of p.precisa) ev = r.responder(p.bandeja.indexOf(x));
    expect(ev[0]).toEqual({ t: 'pronto', combo: 0 });
    expect(r.pontos).toBe(PONTOS_ACERTO / 2);
    expect(r.fase).toBe('revela');
    // Revisa o significado também: é a mesma memória do KanjiMon.
    expect(d.cards[cartaSignificado(p.k)]!.lapses + d.cards[cartaSignificado(p.k)]!.reps).toBeGreaterThan(0);
  });

  it('a mesma peça não encaixa duas vezes', () => {
    const { r } = montar();
    const p = r.pergunta;
    if (p.modo !== 'montar') throw new Error('modo');
    const i = p.bandeja.indexOf(p.precisa[0]!);
    r.responder(i);
    expect(r.responder(i)).toEqual([]);
    expect(p.colocadas).toEqual([p.precisa[0]]);
  });
});

describe('modo 3: intruso', () => {
  it('a grade tem seis kanji e só um diferente, de um par de parecidos', () => {
    for (let s = 1; s < 30; s++) {
      const d = deps({ modo: 'intruso', rng: seededRng(s) });
      // O intruso só usa par em que os dois kanji já foram vistos.
      d.cards = vistos(KANJI_PECAS, d.clock.t);
      const r = new PecasRound(d);
      const p = r.pergunta;
      if (p.modo !== 'intruso') throw new Error('modo');
      expect(p.grade).toHaveLength(6);
      expect(p.grade.filter((g) => g === p.diferente.kanji)).toHaveLength(1);
      expect(p.grade[p.certa]).toBe(p.diferente.kanji);
      expect(PARECIDOS.some((x) => [x.a, x.b].sort().join() === [p.maioria.kanji, p.diferente.kanji].sort().join())).toBe(true);
    }
  });
});

describe('modo 4: adivinhar', () => {
  it('escolhe kanji ainda não visto, e as alternativas não repetem significado', () => {
    const d = deps({ modo: 'adivinhar' });
    d.cards = vistos(KANJI_PECAS.slice(0, 30), d.clock.t);
    const r = new PecasRound(d);
    const p = r.pergunta;
    if (p.modo !== 'adivinhar') throw new Error('modo');
    expect(d.cards[cartaPecas(p.k)]).toBeUndefined();
    expect(pecasDoKanji(p.k).length).toBeGreaterThanOrEqual(2);
    expect(new Set(p.opcoes).size).toBe(4);
    expect(p.opcoes[p.certa]).toBe(p.k.pt[0]);
  });
});

describe('modo 5: palavras de dois kanji', () => {
  it('há palavras de sobra, e as alternativas trazem a leitura "colada" quando ela é diferente', () => {
    expect(COMPOSTOS.length).toBeGreaterThan(150);
    const densha = COMPOSTOS.find((c) => c.jp === '電車')!;
    const ops = opcoesDeLeitura(densha, seededRng(1));
    expect(ops[0]).toBe('でんしゃ');
    expect(ops).toContain('でんくるま');
    expect(new Set(ops).size).toBe(ops.length);
    expect(ops.length).toBe(4);
  });

  it('acerto revisa a carta da palavra, não a do kanji', () => {
    const d = deps({ modo: 'composto' });
    // Palavra já apresentada em outro jogo (o KanjiMon, a Jornada) e os dois kanji vistos aqui.
    d.cards = { ...vistos(COMPOSTOS[0]!.kanji, d.clock.t), [cardKey(`w:${COMPOSTOS[0]!.jp}`, 'meaning')]: newCard(d.clock.t) };
    const r = new PecasRound(d);
    const p = r.pergunta;
    if (p.modo !== 'composto') throw new Error('modo');
    const antes = { ...d.cards[cartaPecas(p.k)]! };
    expect(p.opcoes[p.certa]).toBe(p.palavra.kana);
    acertar(r);
    expect(d.cards[cartaComposto(p.palavra)]).toBeDefined();
    expect(d.cards[cartaPecas(p.k)]).toEqual(antes);
  });

  it('sem kanji visto, nenhuma palavra de dois kanji aparece (fica no achar a peça)', () => {
    const d = deps({ modo: 'composto' });
    const r = new PecasRound(d);
    expect(r.pergunta.modo).not.toBe('composto');
  });

  it('palavra nunca apresentada não vira pergunta, mesmo com os dois kanji vistos (学生 não se lê pelos kanji soltos)', () => {
    const d = deps({ modo: 'composto' });
    d.cards = vistos(KANJI_PECAS, d.clock.t);
    const r = new PecasRound(d);
    expect(r.pergunta.modo).not.toBe('composto');
  });
});

describe('todos os modos rodam uma rodada inteira sem travar', () => {
  for (const modo of ['misto', 'peca', 'montar', 'intruso', 'adivinhar', 'composto'] as (Modo | 'misto')[]) {
    it(modo, () => {
      const d = deps({ modo, rng: seededRng(3) });
      const r = new PecasRound(d);
      for (let i = 0; i < ROUND_SIZE; i++) {
        if (i % 3 === 0) errar(r);
        if (r.fase !== 'revela') acertar(r);
        expect(r.fase).toBe('revela');
        r.seguir();
      }
      expect(r.fase).toBe('fim');
    });
  }
});

describe('ligação com o resto do arcade', () => {
  it('a carta do jogo usa o mesmo item dos outros jogos (k:休), com habilidade própria', () => {
    const k = kanjiPeca('休')!;
    expect(cartaPecas(k)).toBe('k:休#pecas');
    expect(cartaSignificado(k)).toBe(cardKey('k:休', 'meaning'));
  });

  it('o KanjiMon continua com os 94 kanji dele, e cartas dos kanji novos não atrapalham', () => {
    expect(KANJI).toHaveLength(94);
    const t = Date.now();
    const cards = vistos(KANJI_PECAS.slice(0, 200), t);
    cards[cartaSignificado(kanjiPeca('働')!)] = review(newCard(0), { correct: true }, t);
    expect(() => readingMeter(cards)).not.toThrow();
  });
});
