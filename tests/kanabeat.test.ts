import { describe, expect, it } from 'vitest';
import { kanaToRomaji, matchTyping } from '../src/core/kana';
import { seededRng } from '../src/core/rng';
import { emptySave } from '../src/core/save';
import { DAY, review, newCard, type CardState } from '../src/core/srs';
import { cardKey, KANA, WORDS } from '../src/content';
import { foiApresentado } from '../src/core/ensino';
import {
  beatsFor,
  BPM_MAX,
  BPM_MIN,
  BPM_START,
  BPM_STEP,
  ensureKanaBeatSave,
  modeForPlay,
  Stage,
  type BeatEvent,
  type Mode,
  type Note,
} from '../src/games/kanabeat/engine';

const T0 = new Date('2026-11-15T12:00:00').getTime();

/** Deixa firmes (em cobrança) as `n` primeiras cartas do modo. */
function firmar(cards: Record<string, CardState>, mode: Mode, n: number): void {
  const ids = mode === 'palavras' ? WORDS.map((w) => cardKey(w.id, 'reading')) : KANA.map((k) => (mode === 'hiragana' ? cardKey(k.id, 'reading') : cardKey(`ak:${k.kata}`, 'reading')));
  for (const k of ids.slice(0, n)) {
    let c: CardState = review(newCard(0), { correct: true }, T0 - 300 * DAY);
    for (let i = 0; i < 6; i++) c = review(c, { correct: true }, c.due);
    cards[k] = { ...c, due: T0 + 30 * DAY };
  }
}

/** A fase pronta para tocar: `firmes` cartas já em cobrança e a apresentação dos novos já vista. */
function setup(mode: Mode = 'hiragana', bpm = 60, count?: number, seed = 1, firmes = 0) {
  const data = emptySave(T0);
  const save = ensureKanaBeatSave(data.games);
  firmar(data.cards, mode, firmes);
  const stage = new Stage({ cards: data.cards, profile: data.profile, save, rng: seededRng(seed), now: () => T0 }, mode, bpm, count);
  stage.apresentou();
  return { data, save, stage };
}

const spell = (n: Note) => kanaToRomaji(n.kana).replace(/'/g, '');

/** Digita a nota inteira no instante `t`. */
function typeNote(stage: Stage, note: Note, t: number): BeatEvent[] {
  const out: BeatEvent[] = [];
  for (const ch of spell(note)) out.push(...stage.key(ch, t));
  return out;
}

/** Toca a fase inteira digitando cada nota com `offset` ms de erro. */
function playAll(stage: Stage, offset = 0): BeatEvent[] {
  const out: BeatEvent[] = [];
  for (const note of stage.notes) out.push(...typeNote(stage, note, note.time + offset));
  return out;
}

describe('montagem da fase', () => {
  it('as notas vêm em ordem de tempo, cada uma digitável', () => {
    for (const mode of ['hiragana', 'katakana', 'palavras'] as Mode[]) {
      const { stage } = setup(mode);
      expect(stage.notes.length).toBeGreaterThan(10);
      for (let i = 1; i < stage.notes.length; i++) {
        expect(stage.notes[i]!.time).toBeGreaterThan(stage.notes[i - 1]!.time);
      }
      for (const n of stage.notes) expect(matchTyping(spell(n), n.kana), `${mode} ${n.text}`).toBe('complete');
    }
  });

  it('com muita coisa conhecida, a mesma carta aparece no máximo duas vezes e nunca duas seguidas', () => {
    const { stage } = setup('hiragana', 60, 40, 3, 20);
    const counts = new Map<string, number>();
    stage.notes.forEach((n, i) => {
      counts.set(n.card, (counts.get(n.card) ?? 0) + 1);
      if (i > 0) expect(n.card).not.toBe(stage.notes[i - 1]!.card);
    });
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
  });

  it('jogador novo: os kana novos são apresentados antes da música, e a música só tem eles', () => {
    const data = emptySave(T0);
    const save = ensureKanaBeatSave(data.games);
    const stage = new Stage({ cards: data.cards, profile: data.profile, save, rng: seededRng(1), now: () => T0 }, 'hiragana', 60, 12);
    expect(stage.apresentando).toBe(true);
    expect(stage.novos.map((c) => c.text)).toEqual(['あ', 'い', 'う', 'え']);
    // Antes da apresentação acabar, nada toca e nada é gravado.
    expect(stage.key('a', stage.notes[0]!.time)).toEqual([]);
    expect(stage.update(stage.endTime + 10_000)).toEqual([]);
    expect(Object.keys(data.cards)).toHaveLength(0);
    stage.apresentou();
    for (const c of stage.novos) expect(foiApresentado(data.cards, c.card)).toBe(true);
    for (const n of stage.notes) {
      expect(stage.novos.map((c) => c.card)).toContain(n.card);
      expect(n.pratica).toBe(true);
    }
    // Poucos conhecidos: cada um volta mais vezes, mas nunca dois seguidos.
    stage.notes.forEach((n, i) => i > 0 && expect(n.card).not.toBe(stage.notes[i - 1]!.card));
  });

  it('nota em prática vem com romaji de apoio e uma batida a mais de folga; carta firme não', () => {
    const { stage } = setup('hiragana', 60, 5);
    expect(stage.notes[0]!.hint).toBe('a');
    const [a, b] = stage.notes;
    expect(b!.time - a!.time).toBe(2 * stage.beatMs);
    const firme = setup('hiragana', 60, 5, 1, 999).stage;
    for (const n of firme.notes) {
      expect(n.pratica).toBe(false);
      expect(n.hint).toBeUndefined();
    }
  });

  it('palavras mostram a leitura por cima e o significado', () => {
    const { stage } = setup('palavras');
    const n = stage.notes[0]!;
    expect(n.furigana).toBe(n.kana);
    expect(n.pt).toBeTruthy();
  });

  it('palavra longa ocupa mais batidas', () => {
    expect(beatsFor('あ')).toBe(1);
    expect(beatsFor('きんようび')).toBeGreaterThan(beatsFor('やま'));
  });

  it('os modos se revezam para a sessão não ficar igual', () => {
    expect([0, 1, 2, 3, 4].map(modeForPlay)).toEqual(['palavras', 'hiragana', 'palavras', 'katakana', 'palavras']);
  });
});

describe('tocando', () => {
  it('digitar em cima da batida é Perfeito e aumenta o combo', () => {
    const { stage } = setup('hiragana', 60, undefined, 1, 999);
    const n = stage.notes[0]!;
    const events = typeNote(stage, n, n.time);
    expect(events.at(-1)).toMatchObject({ t: 'hit', judge: 'perfect', combo: 1 });
    expect(n.state).toBe('hit');
    expect(stage.score).toBeGreaterThan(0);
  });

  it('adiantado ou atrasado ainda vale, com nota menor', () => {
    const { stage } = setup();
    const [a, b] = stage.notes;
    expect(typeNote(stage, a!, a!.time - stage.beatMs * 0.5).at(-1)).toMatchObject({ judge: 'good' });
    expect(typeNote(stage, b!, b!.time + stage.beatMs * 1.1).at(-1)).toMatchObject({ judge: 'ok' });
  });

  it('nota que ainda não apareceu não aceita tecla', () => {
    const { stage } = setup();
    const n = stage.notes[0]!;
    expect(stage.key('a', n.time - stage.leadMs - 50)).toEqual([]);
    expect(n.state).toBe('pending');
  });

  it('deixar a nota passar conta como perdida, zera o combo e registra o erro na memória', () => {
    const { stage, data } = setup('hiragana', 60, undefined, 1, 999);
    const [a, b] = stage.notes;
    typeNote(stage, a!, a!.time);
    expect(stage.combo).toBe(1);
    const reps = data.cards[b!.card]!.reps;
    const events = stage.update(b!.time + stage.beatMs * 2);
    expect(events[0]).toMatchObject({ t: 'miss', note: { id: b!.id }, pratica: false });
    expect(stage.combo).toBe(0);
    expect(data.cards[b!.card]?.reps).toBe(reps + 1);
  });

  it('nota de prática perdida não zera o combo; acertada também não soma', () => {
    const { stage, data } = setup('hiragana', 60, 20, 1, 10);
    const pratica = stage.notes.filter((n) => n.pratica);
    expect(pratica.length).toBeGreaterThan(0);
    stage.combo = 4;
    for (const n of stage.notes) {
      if (n === pratica[0]) break;
      n.state = 'hit';
    }
    const p = pratica[0]!;
    typeNote(stage, p, p.time);
    expect(stage.combo).toBe(4);
    const q = pratica.find((n) => n.state === 'pending')!;
    for (const n of stage.notes) if (n !== q && n.time < q.time && n.state === 'pending') n.state = 'hit';
    const ev = stage.update(q.time + stage.beatMs * 2);
    expect(ev.find((e) => e.t === 'miss')).toMatchObject({ pratica: true });
    expect(stage.combo).toBe(4);
    expect(data.cards[q.card]!.lapses + data.cards[q.card]!.reps).toBeGreaterThan(0);
  });

  it('tecla errada recomeça a nota sem perder a vez', () => {
    const { stage } = setup('palavras', 60, 6);
    const n = stage.notes[0]!;
    const romaji = spell(n);
    const wrong = romaji[0] === 'x' ? 'q' : 'x';
    stage.key(romaji[0]!, n.time);
    expect(stage.key(wrong, n.time)).toEqual([{ t: 'type', ok: false, buffer: '' }]);
    expect(stage.slips).toBe(1);
    expect(typeNote(stage, n, n.time).at(-1)).toMatchObject({ t: 'hit' });
  });

  it('tecla errada que já é o começo certo é aproveitada', () => {
    const { stage } = setup('palavras', 60, 6);
    const n = stage.notes[0]!;
    const romaji = spell(n);
    expect(romaji[1]).not.toBe(romaji[0]);
    stage.key(romaji[0]!, n.time);
    expect(stage.key(romaji[0]!, n.time)).toEqual([{ t: 'type', ok: false, buffer: romaji[0] }]);
    // segue a partir da letra aproveitada
    let last: BeatEvent[] = [];
    for (const ch of romaji.slice(1)) last = stage.key(ch, n.time);
    expect(last.at(-1)).toMatchObject({ t: 'hit' });
  });

  it('a fase sempre termina, mesmo sem acertar nada', () => {
    const { stage } = setup('hiragana', 60, 8);
    const events = stage.update(stage.endTime + 10_000);
    expect(events.filter((e) => e.t === 'miss')).toHaveLength(8);
    expect(events.at(-1)).toMatchObject({ t: 'end', result: { grade: 'C', miss: 8 } });
    expect(stage.finished).toBe(true);
    expect(stage.key('a', stage.endTime + 20_000)).toEqual([]);
  });
});

describe('resultado', () => {
  it('fase perfeita dá S, paga moedas e XP, e acelera a próxima', () => {
    const { stage, data, save } = setup('hiragana', BPM_START);
    const end = playAll(stage).at(-1);
    expect(end).toMatchObject({ t: 'end', result: { grade: 'S', miss: 0, nextBpm: BPM_START + BPM_STEP, record: true } });
    expect(data.profile.coins).toBeGreaterThan(0);
    expect(data.profile.xp).toBeGreaterThan(0);
    expect(save.bpm.hiragana).toBe(BPM_START + BPM_STEP);
    expect(save.plays).toBe(1);
    expect(save.best.hiragana).toBe(stage.score);
  });

  it('fase ruim desacelera a próxima e lista o que foi perdido sem repetir', () => {
    const { stage, save } = setup('hiragana', BPM_START, 10);
    const r = stage.update(stage.endTime + 5000).at(-1);
    if (r?.t !== 'end') throw new Error('esperava o fim');
    expect(r.result.nextBpm).toBe(BPM_START - BPM_STEP);
    expect(new Set(r.result.missed.map((n) => n.card)).size).toBe(r.result.missed.length);
    expect(save.bpm.hiragana).toBe(BPM_START - BPM_STEP);
  });

  it('o andamento respeita piso e teto', () => {
    const top = setup('hiragana', BPM_MAX, 6);
    playAll(top.stage);
    expect(top.save.bpm.hiragana).toBe(BPM_MAX);
    const bottom = setup('hiragana', BPM_MIN, 6);
    bottom.stage.update(bottom.stage.endTime + 5000);
    expect(bottom.save.bpm.hiragana).toBe(BPM_MIN);
  });

  it('o resultado é calculado uma vez só', () => {
    const { stage, data } = setup('hiragana', 60, 6);
    playAll(stage);
    const coins = data.profile.coins;
    stage.update(stage.endTime + 99_999);
    expect(data.profile.coins).toBe(coins);
  });
});

describe('save do Kana Beat', () => {
  it('cria, reaproveita o mesmo objeto e conserta campos estragados', () => {
    const games: Record<string, unknown> = {};
    const a = ensureKanaBeatSave(games);
    a.bpm.hiragana = 100;
    expect(ensureKanaBeatSave(games)).toBe(a);
    const broken: Record<string, unknown> = { kanabeat: { plays: 'x', bpm: { hiragana: 90 } } };
    expect(ensureKanaBeatSave(broken)).toEqual({
      plays: 0,
      bpm: { hiragana: 90, katakana: BPM_START, palavras: BPM_START },
      best: { hiragana: 0, katakana: 0, palavras: 0 },
    });
  });
});
