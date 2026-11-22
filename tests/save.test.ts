import { describe, expect, it } from 'vitest';
import { KANJI, WORDS, getWord } from '../src/content';
import { isKana } from '../src/core/kana';
import { dayKey, levelInfo, markPlayed, readingMeter, recentDays } from '../src/core/progress';
import { emptySave, exportSave, importSave, loadSave, memoryStore, SAVE_KEY, writeSave } from '../src/core/save';
import { DAY, review, newCard } from '../src/core/srs';

const T0 = new Date('2026-11-15T12:00:00').getTime();

describe('save', () => {
  it('sem nada salvo começa do zero', () => {
    const s = loadSave(memoryStore(), T0);
    expect(s.profile).toEqual({ xp: 0, coins: 0, daysPlayed: [] });
    expect(s.cards).toEqual({});
  });

  it('grava e lê de volta igual', () => {
    const store = memoryStore();
    const s = emptySave(T0);
    s.profile.coins = 42;
    s.cards['k:一#meaning'] = review(newCard(0), { correct: true }, T0);
    s.games.kanjimon = { dex: { '1_c': 2 } };
    writeSave(store, s, T0 + 5);
    expect(loadSave(store, T0 + 10)).toEqual(s);
  });

  it('exportar e importar preserva tudo', () => {
    const s = emptySave(T0);
    s.profile.xp = 900;
    s.profile.daysPlayed = ['2026-11-14', '2026-11-15'];
    expect(importSave(exportSave(s), T0)).toEqual(s);
  });

  it('recusa arquivo que não é save, com mensagem clara', () => {
    expect(() => importSave('oi', T0)).toThrow(/Não consegui ler/);
    expect(() => importSave('[1,2]', T0)).toThrow(/inválido/);
    expect(() => importSave('{"v":99}', T0)).toThrow(/versão mais nova/);
  });

  it('save corrompido não quebra o jogo e fica guardado numa cópia', () => {
    const store = memoryStore();
    store.setItem(SAVE_KEY, '{quebrado');
    const s = loadSave(store, T0);
    expect(s.profile.xp).toBe(0);
    expect(store.getItem(`${SAVE_KEY}:corrompido:${T0}`)).toBe('{quebrado');
  });

  it('campos ruins num save importado viram valores seguros', () => {
    const s = importSave(JSON.stringify({ v: 1, profile: { xp: -5, coins: 'muito', daysPlayed: ['ontem', '2026-11-01'] } }), T0);
    expect(s.profile).toEqual({ xp: 0, coins: 0, daysPlayed: ['2026-11-01'], lastGame: undefined });
    expect(s.settings.sound).toBe(true);
  });

  it('os volumes de música, efeitos e voz ficam entre 0 e 1; valor estranho volta ao padrão', () => {
    const s = importSave(JSON.stringify({ v: 1, settings: { volMusica: 3, volEfeitos: -1, volVoz: 'alto' } }), T0).settings;
    expect([s.volMusica, s.volEfeitos, s.volVoz]).toEqual([1, 0, 1]);
    const padrao = importSave(JSON.stringify({ v: 1 }), T0).settings;
    expect([padrao.volMusica, padrao.volEfeitos, padrao.volVoz]).toEqual([0.6, 0.8, 1]);
  });

  it('o tema fica entre automático, claro e escuro; valor estranho volta ao automático', () => {
    expect(importSave(JSON.stringify({ v: 1, settings: { tema: 'escuro' } }), T0).settings.tema).toBe('escuro');
    expect(importSave(JSON.stringify({ v: 1, settings: { tema: 'neon' } }), T0).settings.tema).toBe('auto');
    expect(importSave(JSON.stringify({ v: 1 }), T0).settings.tema).toBe('auto');
  });
});

describe('progresso', () => {
  it('nível sobe com XP e nunca fica com resto maior que o necessário', () => {
    expect(levelInfo(0)).toEqual({ level: 1, into: 0, need: 100 });
    expect(levelInfo(100)).toEqual({ level: 2, into: 0, need: 160 });
    const info = levelInfo(5000);
    expect(info.into).toBeLessThan(info.need);
  });

  it('dia jogado conta uma vez só', () => {
    const s = emptySave(T0);
    expect(markPlayed(s, T0)).toBe(true);
    expect(markPlayed(s, T0 + 1000)).toBe(false);
    expect(s.profile.daysPlayed).toEqual([dayKey(T0)]);
  });

  it('faltar um dia não zera o histórico', () => {
    const s = emptySave(T0);
    markPlayed(s, T0 - 3 * DAY);
    markPlayed(s, T0 - 2 * DAY);
    markPlayed(s, T0);
    expect(recentDays(s, T0)).toEqual([false, false, false, true, true, false, true]);
  });

  it('medidor de leitura conta vistos e conhecidos', () => {
    const s = emptySave(T0);
    expect(readingMeter(s.cards).kanjiSeen).toBe(0);
    s.cards['k:一#meaning'] = review(newCard(0), { correct: true }, T0);
    const m = readingMeter(s.cards);
    expect(m.kanjiSeen).toBe(1);
    expect(m.kanjiKnown).toBe(0);
    expect(m.kanjiTotal).toBe(94);
  });
});

describe('conteúdo', () => {
  it('traz os 94 kanji com significado, história, palavras e frase', () => {
    expect(KANJI).toHaveLength(94);
    for (const k of KANJI) {
      expect(k.pt.length, k.kanji).toBeGreaterThan(0);
      expect(k.story.length, k.kanji).toBeGreaterThan(0);
      expect(k.words.length, k.kanji).toBe(3);
      expect(k.sentences.length, k.kanji).toBe(1);
      expect(k.readings.length, k.kanji).toBeGreaterThan(0);
    }
  });

  it('significados aparecem com acento', () => {
    const pt = (c: string) => KANJI.find((k) => k.kanji === c)?.pt;
    expect(pt('水')).toEqual(['água']);
    expect(pt('三')).toEqual(['três']);
    expect(pt('母')).toEqual(['mãe']);
  });

  it('toda palavra tem leitura só em kana', () => {
    for (const w of WORDS) expect(isKana(w.kana), `${w.jp} → ${w.kana}`).toBe(true);
  });

  it('leituras que a conversão automática erraria estão certas', () => {
    expect(getWord('w:金曜日').kana).toBe('きんようび');
    expect(getWord('w:親友').kana).toBe('しんゆう');
    expect(getWord('w:円安').kana).toBe('えんやす');
    expect(getWord('w:生ビール').kana).toBe('なまビール');
    expect(getWord('w:店員').kana).toBe('てんいん');
    expect(getWord('w:一緒に').kana).toBe('いっしょに');
    expect(getWord('w:お水').kana).toBe('おみず');
    expect(getWord('w:４時半').kana).toBe('よじはん');
  });

  it('palavra repetida em dois kanji é uma só', () => {
    const ids = WORDS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getWord('w:花火').kanji).toEqual(['花', '火']);
  });
});

describe('cartas estragadas no save', () => {
  it('carta com campo inválido é descartada e as boas ficam', () => {
    // Um backup editado à mão (ou de versão antiga) com "due" em texto quebrava o FSRS na hora da revisão.
    const boa = review(newCard(0), { correct: true }, T0);
    const texto = JSON.stringify({
      v: 1,
      cards: {
        'k:一#meaning': boa,
        'k:二#meaning': { ...boa, due: 'amanhã' },
        'k:三#meaning': { ...boa, state: 9 },
        'k:四#meaning': { ...boa, stability: null },
        'k:五#meaning': 'oi',
      },
    });
    const s = importSave(texto, T0);
    expect(Object.keys(s.cards)).toEqual(['k:一#meaning']);
    expect(() => review(s.cards['k:一#meaning']!, { correct: true }, T0 + DAY)).not.toThrow();
  });
});

describe('navegador que não deixa gravar', () => {
  it('gravação recusada (espaço cheio, modo privado) não derruba o jogo', () => {
    // O erro do localStorage subia de dentro do commit() e a tela parava no meio da jogada.
    const cheio = { getItem: () => null, setItem: () => { throw new DOMException('cheio', 'QuotaExceededError'); } };
    expect(writeSave(cheio, emptySave(T0), T0)).toBe(false);
    expect(writeSave(memoryStore(), emptySave(T0), T0)).toBe(true);
  });

  it('save corrompido que nem dá para copiar ainda abre limpo', () => {
    const store = { getItem: () => '{quebrado', setItem: () => { throw new Error('cheio'); } };
    expect(loadSave(store, T0).cards).toEqual({});
  });
});
