import { describe, expect, it } from 'vitest';
import { findWord } from '../src/content/vida';
import { seededRng } from '../src/core/rng';
import { emptySave } from '../src/core/save';
import { DAY, review, State, type CardState } from '../src/core/srs';
import {
  ANSWERS,
  cardOf,
  conjugateKana,
  conjugateWritten,
  emptyGramaticaSave,
  ENDINGS,
  ensureGramaticaSave,
  exampleView,
  fits,
  GramaticaRound,
  isVerbRole,
  parseSentence,
  PARTICLES,
  plainSentence,
  ROLES,
  ROUND_SIZE,
  SCORE_FAST,
  SCORE_FIT,
  validateCourse,
  whyNot,
  WINS_TO_UNLOCK,
  type Block,
  type Course,
  type RoundEvent,
} from '../src/games/gramatica/engine';
import { COURSE, POINTS, VERBS } from '../src/games/gramatica/pontos';

const T0 = new Date('2026-11-19T12:00:00').getTime();

function setup(seed = 1, course: Course = COURSE) {
  const data = emptySave(T0);
  const save = emptyGramaticaSave();
  let t = T0;
  const deps = { course, cards: data.cards, profile: data.profile, save, lookup: findWord, now: () => t, rng: seededRng(seed) };
  return { data, save, deps, tick: (ms: number) => (t += ms), round: () => new GramaticaRound(deps) };
}

/** Carta já firme, vista ontem, que ainda não venceu. */
function firm(): CardState {
  let card = review(undefined, { correct: true }, T0 - DAY);
  while (card.state !== State.Review) card = review(card, { correct: true }, card.due);
  return card;
}

/** Encaixa a primeira peça certa da bandeja em cada buraco até a frase fechar. */
function solve(r: GramaticaRound, before?: () => void): RoundEvent[] {
  r.begin();
  const events: RoundEvent[] = [];
  for (let i = 0; i < 10 && r.phase === 'build'; i++) {
    const slot = r.activeSlot!;
    before?.();
    events.push(...r.place(slot.tray.find((b) => fits(slot.role, b))!));
  }
  return events;
}

/** Erra uma vez (se der) e depois acerta, em cada buraco. */
function wrongFirst(r: GramaticaRound): RoundEvent[] {
  r.begin();
  const events: RoundEvent[] = [];
  for (let i = 0; i < 10 && r.phase === 'build'; i++) {
    const slot = r.activeSlot!;
    const bad = slot.tray.find((b) => !fits(slot.role, b));
    if (bad) events.push(...r.place(bad));
    events.push(...r.place(slot.tray.find((b) => fits(slot.role, b))!));
  }
  return events;
}

describe('curso', () => {
  it('todas as frases estão bem marcadas e usam só palavras do conteúdo', () => {
    expect(validateCourse(COURSE, (id) => !!findWord(id))).toEqual([]);
  });

  it('o curso cobre todas as partículas e pontas de verbo pedidas', () => {
    const blocks = POINTS.flatMap((p) => p.blocks);
    for (const b of [...PARTICLES, ...ENDINGS]) expect(blocks).toContain(b);
  });

  it('a validação pega palavra fora do conteúdo, verbo desconhecido e kanji sem leitura', () => {
    const broken: Course = {
      ...COURSE,
      points: [{ ...(POINTS[0] as (typeof POINTS)[number]), sentences: [{ jp: '[猫|ねこ|=] {wa} 犬 です', pt: '' }, { jp: '{masu:泳ぐ} {wa}', pt: '' }, { jp: 'です', pt: '' }] }, ...POINTS.slice(1)],
    };
    const errors = validateCourse(broken, (id) => !!findWord(id)).join('\n');
    expect(errors).toContain('palavra fora do conteúdo w:猫');
    expect(errors).toContain('kanji sem leitura em 犬');
    expect(errors).toContain('verbo desconhecido 泳ぐ');
    expect(errors).toContain('não treina wa');
  });

  it('cada buraco tem resposta e toda peça errada da mesma família tem explicação', () => {
    for (const role of ROLES) {
      const family: readonly Block[] = isVerbRole(role) ? ENDINGS : PARTICLES;
      for (const b of family) {
        if (ANSWERS[role].includes(b)) expect(fits(role, b)).toBe(true);
        else expect(whyNot(role, b).length).toBeGreaterThan(20);
      }
    }
  });

  it('confusão comum ganha explicação própria', () => {
    expect(whyNot('de', 'に')).toContain('onde a ação acontece');
    expect(whyNot('nai', 'ません')).toContain('educada');
    expect(whyNot('wo', 'は')).toBe('は marca o assunto da frase. Aqui a palavra é o que sofre a ação do verbo: vai を.');
  });
});

describe('marcação e verbos', () => {
  it('lê palavras, kana de apoio e buracos', () => {
    expect(parseSentence('[友達|ともだち|=] {wa} [ゆっくり||=] [本|ほん] {masu:飲む} です')).toEqual([
      { k: 'text', text: '友達', reading: 'ともだち', word: 'w:友達' },
      { k: 'gap', role: 'wa' },
      { k: 'text', text: 'ゆっくり', word: 'w:ゆっくり' },
      { k: 'text', text: '本', reading: 'ほん' },
      { k: 'gap', role: 'masu', verb: '飲む' },
      { k: 'text', text: 'です' },
    ]);
    expect(() => parseSentence('{xyz}')).toThrow('buraco desconhecido');
  });

  it.each([
    ['行く', ['いきます', 'いきません', 'いきました', 'いきたい', 'いって', 'いっています', 'いかない', 'いった']],
    ['飲む', ['のみます', 'のみません', 'のみました', 'のみたい', 'のんで', 'のんでいます', 'のまない', 'のんだ']],
    ['書く', ['かきます', 'かきません', 'かきました', 'かきたい', 'かいて', 'かいています', 'かかない', 'かいた']],
    ['話す', ['はなします', 'はなしません', 'はなしました', 'はなしたい', 'はなして', 'はなしています', 'はなさない', 'はなした']],
    ['買う', ['かいます', 'かいません', 'かいました', 'かいたい', 'かって', 'かっています', 'かわない', 'かった']],
    ['分かる', ['わかります', 'わかりません', 'わかりました', 'わかりたい', 'わかって', 'わかっています', 'わからない', 'わかった']],
    ['食べる', ['たべます', 'たべません', 'たべました', 'たべたい', 'たべて', 'たべています', 'たべない', 'たべた']],
    ['見る', ['みます', 'みません', 'みました', 'みたい', 'みて', 'みています', 'みない', 'みた']],
    ['来る', ['きます', 'きません', 'きました', 'きたい', 'きて', 'きています', 'こない', 'きた']],
    ['する', ['します', 'しません', 'しました', 'したい', 'して', 'しています', 'しない', 'した']],
  ])('conjuga %s', (jp, forms) => {
    const verb = VERBS[jp]!;
    expect(ENDINGS.map((e) => conjugateKana(verb, e))).toEqual(forms);
  });

  it('o kanji fica e a leitura acompanha a conta, até no 来る', () => {
    expect(conjugateWritten(VERBS['来る']!, 'ない')).toEqual({ text: '来', reading: 'こ', tail: 'ない' });
    expect(conjugateWritten(VERBS['話す']!, 'て')).toEqual({ text: '話', reading: 'はな', tail: 'して' });
    expect(conjugateWritten(VERBS['飲む']!, null)).toEqual({ text: '飲', reading: 'の', tail: 'む' });
    expect(conjugateWritten(VERBS['する']!, 'た')).toEqual({ text: '', tail: 'した' });
  });

  it('o exemplo da lição vem montado, com a peça nova marcada', () => {
    const view = exampleView(COURSE, POINTS.find((p) => p.id === 'mashita')!);
    expect(view.map((w) => w.text + w.tail).join('')).toBe('去年花見をしました');
    expect(view.filter((w) => w.mark).map((w) => w.tail)).toEqual(['しました']);
  });
});

describe('save', () => {
  it('cria o save e devolve sempre o mesmo objeto', () => {
    const games: Record<string, unknown> = {};
    const a = ensureGramaticaSave(games);
    expect(a).toEqual(emptyGramaticaSave());
    expect(ensureGramaticaSave(games)).toBe(a);
  });

  it('conserta save estragado sem perder o que é válido', () => {
    const games: Record<string, unknown> = { gramatica: { unlocked: -2, wins: { wa: 3, no: 'x' }, rounds: 'muitas', best: 40 } };
    const save = ensureGramaticaSave(games);
    expect(save).toEqual({ unlocked: 1, wins: { wa: 3 }, rounds: 0, best: 40 });
    expect(ensureGramaticaSave({ gramatica: [] })).toEqual(emptyGramaticaSave());
  });
});

describe('rodada', () => {
  it('a primeira frase ensina antes de cobrar: lição, exemplo e a peça certa brilhando', () => {
    const { round } = setup();
    const r = round();
    expect(r.phase).toBe('lesson');
    expect(r.puzzle.point.id).toBe('wa');
    expect(r.place('は')).toEqual([]);
    r.begin();
    expect(r.phase).toBe('build');
    expect(r.activeSlot!.hint).toBe(true);
    expect(r.activeSlot!.tray).toContain('は');
  });

  it('peça errada volta com o porquê, sem tela de erro, e a frase continua', () => {
    const { round } = setup();
    const r = round();
    r.begin();
    const slot = r.activeSlot!;
    const bad = slot.tray.find((b) => !fits(slot.role, b))!;
    expect(bad).toBeDefined();
    const events = r.place(bad);
    expect(events).toEqual([{ t: 'bounce', block: bad, why: whyNot('wa', bad) }]);
    expect(r.puzzle.why?.block).toBe(bad);
    expect(r.phase).toBe('build');
    expect(slot.tried).toEqual([bad]);
    // A mesma peça de novo não faz nada.
    expect(r.place(bad)).toEqual([]);
    r.place('は');
    expect(r.phase).toBe('solved');
    expect(r.puzzle.why).toBeNull();
  });

  it('primeiro contato não leva nota ruim, mesmo errando', () => {
    const { round, deps } = setup();
    wrongFirst(round());
    const card = deps.cards[cardOf('wa')]!;
    expect(card.lapses).toBe(0);
    expect(card.reps).toBe(1);
    expect(card).toEqual(review(undefined, { correct: true, hinted: true }, T0));
  });

  it('depois do primeiro contato, errar conta na memória', () => {
    const { round, deps, tick } = setup();
    const r = round();
    solve(r);
    const before = deps.cards[cardOf('wa')]!;
    tick(60_000);
    r.next();
    expect(r.puzzle.point.id).toBe('wa');
    expect(r.phase).toBe('build');
    wrongFirst(r);
    expect(deps.cards[cardOf('wa')]).toEqual(review(before, { correct: false }, T0 + 60_000));
  });

  it('resposta rápida ganha bônus e a lenta não perde nada', () => {
    const fast = setup();
    const r1 = fast.round();
    solve(r1);
    r1.next();
    solve(r1, () => fast.tick(1000));
    const slow = setup();
    const r2 = slow.round();
    solve(r2);
    r2.next();
    solve(r2, () => slow.tick(20_000));
    const gaps = r2.puzzle.slots.filter((s) => s.open).length;
    expect(r1.score - r2.score).toBe(gaps * SCORE_FAST);
    expect(r2.score).toBeGreaterThanOrEqual(SCORE_FIT * gaps);
  });

  it('depois de duas peças erradas a certa brilha', () => {
    const { round, deps } = setup();
    // Com quatro pontos vistos a bandeja tem mais de uma peça errada.
    deps.save.unlocked = 4;
    for (const id of ['wa', 'no', 'wo', 'masu']) deps.cards[cardOf(id)] = firm();
    const r = round();
    expect(r.puzzle.teach).toBe(false);
    const slot = r.activeSlot!;
    const bad = slot.tray.filter((b) => !fits(slot.role, b));
    expect(bad.length).toBeGreaterThanOrEqual(2);
    r.place(bad[0]!);
    expect(slot.hint).toBe(false);
    r.place(bad[1]!);
    expect(slot.hint).toBe(true);
  });

  it('a bandeja só tem peças da mesma família, sem repetir, e sempre uma que serve', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { round, deps } = setup(seed);
      deps.save.unlocked = POINTS.length;
      for (const p of POINTS) deps.cards[cardOf(p.id)] = firm();
      const r = round();
      for (const s of r.puzzle.slots.filter((x) => x.open)) {
        const family: readonly Block[] = isVerbRole(s.role) ? ENDINGS : PARTICLES;
        expect(s.tray.length).toBeGreaterThanOrEqual(2);
        expect(new Set(s.tray).size).toBe(s.tray.length);
        expect(s.tray.every((b) => family.includes(b))).toBe(true);
        expect(s.tray.some((b) => fits(s.role, b))).toBe(true);
      }
    }
  });

  it('buraco de ponto ainda não visto já vem preenchido', () => {
    const { round, deps } = setup();
    deps.save.unlocked = 3;
    deps.cards[cardOf('wa')] = firm();
    deps.cards[cardOf('no')] = firm();
    // Só を é novo: a frase vem dele e o verbo já vem com ます.
    const r = round();
    expect(r.puzzle.point.id).toBe('wo');
    const verb = r.puzzle.slots.find((s) => s.verb)!;
    expect(verb.open).toBe(false);
    expect(verb.filled).toBe('ます');
    expect(plainSentence(r.puzzle)).toMatch(/ます$/);
  });

  it('encaixes de primeira destravam o próximo ponto', () => {
    const { round, save } = setup();
    const r = round();
    const events: RoundEvent[] = [];
    for (let i = 0; i < ROUND_SIZE && save.unlocked === 1; i++) {
      events.push(...solve(r));
      r.next();
    }
    expect(save.wins.wa).toBe(WINS_TO_UNLOCK);
    expect(save.unlocked).toBe(2);
    expect(events.filter((e) => e.t === 'unlock').map((e) => (e as { point: { id: string } }).point.id)).toEqual(['no']);
  });

  it('o ponto novo chega com a lição dele', () => {
    const { round, save } = setup(3);
    const r = round();
    const seen: string[] = [];
    for (let i = 0; i < ROUND_SIZE; i++) {
      if (r.phase === 'lesson') seen.push(r.puzzle.point.id);
      solve(r);
      if (i < ROUND_SIZE - 1) r.next();
    }
    expect(save.unlocked).toBe(2);
    expect(seen[0]).toBe('wa');
    // Se の já entrou nesta rodada, entrou com lição.
    expect(seen.every((id, i) => seen.indexOf(id) === i)).toBe(true);
  });

  it('a rodada termina num resumo, com moedas e recorde', () => {
    const { round, save, data } = setup();
    const r = round();
    let end: RoundEvent | undefined;
    for (let i = 0; i < ROUND_SIZE; i++) {
      solve(r);
      end = r.next().find((e) => e.t === 'end');
    }
    expect(r.phase).toBe('end');
    expect(end).toBeDefined();
    const s = r.summary!;
    expect(s.sentences).toBe(ROUND_SIZE);
    expect(s.learned.map((p) => p.id)).toContain('wa');
    expect(s.record).toBe(true);
    expect(save.rounds).toBe(1);
    expect(save.best).toBe(s.score);
    expect(data.profile.coins).toBe(s.coins);
    expect(data.profile.xp).toBe(s.xp);
    expect(r.next()).toEqual([]);
  });

  it('errar muito não expulsa ninguém: a rodada sempre chega ao fim', () => {
    const { round } = setup(7);
    const r = round();
    for (let i = 0; i < ROUND_SIZE; i++) {
      wrongFirst(r);
      r.next();
    }
    expect(r.phase).toBe('end');
    expect(r.summary!.clean).toBe(0);
  });

  it('cartas de gramática usam a chave g:<ponto>#uso', () => {
    const { round, deps } = setup();
    solve(round());
    expect(Object.keys(deps.cards)).toEqual(['g:wa#uso']);
    expect(deps.cards['g:wa#uso']!.state).toBe(State.Learning);
  });

  it('mesma semente, mesma rodada', () => {
    const a = setup(11);
    const b = setup(11);
    a.save.unlocked = b.save.unlocked = 6;
    const ra = a.round();
    const rb = b.round();
    expect(plainSentence(ra.puzzle)).toBe(plainSentence(rb.puzzle));
    expect(ra.puzzle.slots.map((s) => s.tray)).toEqual(rb.puzzle.slots.map((s) => s.tray));
  });
});
