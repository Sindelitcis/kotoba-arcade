import { describe, expect, it } from 'vitest';
import { KANJI, WORDS } from '../src/content';

/**
 * Leituras conferidas contra o OpenJTalk e a Kanjium (ver docs/vozes.md).
 * Cada linha aqui é um erro que já existiu no conteúdo.
 */
describe('leituras do conteúdo', () => {
  const palavra = (jp: string) => WORDS.find((w) => w.jp === jp);
  const frase = (jp: string) => KANJI.flatMap((k) => k.sentences).find((s) => s.jp === jp);

  it('百貨店 é ひゃっかてん (estava ひゃくかてん)', () => {
    expect(palavra('百貨店')).toMatchObject({ kana: 'ひゃっかてん', romaji: 'hyakkaten' });
  });

  it('友達が家へ来ます: o romaji segue a frase (estava "kuru")', () => {
    expect(frase('友達が家へ来ます。')?.romaji).toBe('tomodachi ga ie e kimasu');
  });

  it('何ですか se fala なんですか no dia a dia', () => {
    expect(frase('これは何ですか？')?.romaji).toBe('kore wa nan desu ka?');
  });

  it("千円 tem o apóstrofo que separa ん da vogal (sen'en, não senen)", () => {
    expect(frase('千円を払いました。')?.romaji).toBe("sen'en o haraimashita");
  });

  it('formas do dia a dia: 私 = わたし, 一日 (dia 1) = ついたち, 十分 (suficiente) = じゅうぶん', () => {
    expect(palavra('一日')?.kana).toBe('ついたち');
    expect(palavra('十分')?.kana).toBe('じゅうぶん');
    for (const w of WORDS) expect(w.kana, w.jp).not.toContain('わたくし');
  });
});
