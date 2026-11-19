import { describe, expect, it } from 'vitest';
import { KANJI, WORDS } from '../src/content';
import { LEITURAS } from '../src/content/leituras';
import { kanaToRomaji, romajiToHiragana } from '../src/core/kana';
import { kanjiMeaningQuestion, kanjiRecallQuestion, readingLines } from '../src/core/questions';
import { seededRng } from '../src/core/rng';

const romaji = (kana: string) => kanaToRomaji(kana).replace(/'/g, '');
const kanji = (c: string) => KANJI.find((k) => k.kanji === c)!;

describe('leitura do kanji sozinho', () => {
  it('todo kanji tem leitura conferida, e nenhuma sobra na tabela', () => {
    expect(Object.keys(LEITURAS).sort()).toEqual(KANJI.map((k) => k.kanji).sort());
  });

  it('a leitura escolhida é uma das leituras do kanji, sem erro de digitação', () => {
    const fora = KANJI.filter((k) => !k.readings.includes(romaji(k.reading))).map((k) => `${k.kanji}=${k.reading}`);
    expect(fora).toEqual([]);
  });

  it('a leitura é kana de verdade e vira romaji ida e volta', () => {
    for (const k of KANJI) {
      expect(k.reading).toMatch(/^[ぁ-ゟ]+$/);
      expect(romajiToHiragana(romaji(k.reading))).toBe(k.reading);
      for (const o of k.otherReadings) expect(o).toMatch(/^[ぁ-ゟ]+$/);
      expect(k.otherReadings).not.toContain(k.reading);
    }
  });

  it('números na forma mais usada hoje', () => {
    // O 九 falava くがつ (setembro) e quem ouvia aprendia que 九 se lê "kugatsu".
    expect(['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万'].map((c) => kanji(c).reading)).toEqual([
      'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう', 'じゅう', 'ひゃく', 'せん', 'まん',
    ]);
  });

  it('kanji que é palavra sozinho usa a palavra', () => {
    expect(['山', '人', '水', '月', '車', '店', '道'].map((c) => kanji(c).reading)).toEqual(['やま', 'ひと', 'みず', 'つき', 'くるま', 'みせ', 'みち']);
  });
});

describe('a carta de kanji fala o que está na tela', () => {
  it('a voz e o texto que aparece depois da resposta são a leitura do kanji, não a palavra de exemplo', () => {
    for (const k of KANJI) {
      for (const q of [kanjiMeaningQuestion(k, seededRng(1), true), kanjiRecallQuestion(k, seededRng(1))]) {
        expect(q.speak).toBe(k.kanji);
        expect(q.speakKana).toBe(k.reading);
        expect(q.echo).toBe(`${k.kanji} · ${k.reading} (${romaji(k.reading)}) · ${k.pt[0]}`);
      }
    }
    const nove = kanjiMeaningQuestion(kanji('九'), seededRng(1), true);
    expect(nove.speakKana).toBe('きゅう');
    expect(nove.echo).not.toContain('くがつ');
  });

  it('o primeiro contato ensina a leitura sozinha, as outras e um exemplo com a leitura dele', () => {
    const q = kanjiMeaningQuestion(kanji('九'), seededRng(1), true);
    expect(q.teach?.lines).toContain('Sozinho, lê-se きゅう (kyuu).');
    expect(q.teach?.lines).toContain('Dentro de palavras também: く, ここの.');
    expect(q.teach?.lines.some((l) => l.includes('九月 (くがつ)'))).toBe(true);
    expect(readingLines(kanji('週'))).toEqual(['Sozinho, lê-se しゅう (shuu).']);
  });
});

describe('palavras de exemplo', () => {
  it('o primeiro exemplo do 一 não é o 一日 lido ついたち, que ensinaria a leitura menos óbvia', () => {
    expect(kanji('一').words[0]!.jp).toBe('一人');
    expect(WORDS.find((w) => w.jp === '一日')?.pt).toContain('いちにち');
  });

  it('nada de grafia rara: 円い (o comum é 丸い) saiu', () => {
    expect(WORDS.some((w) => w.jp === '円い')).toBe(false);
    expect(WORDS.find((w) => w.jp === '五千円')?.kana).toBe('ごせんえん');
  });
});
