import { describe, expect, it } from 'vitest';
import { compareReading, kanaToRomaji, normalizePt, romajiToHiragana, toReadingKey } from '../src/core/kana';

describe('romajiToHiragana', () => {
  it.each([
    ['hitori', 'ひとり'],
    ['issho ni', 'いっしょに'],
    ["kin'youbi", 'きんようび'],
    ['sannin', 'さんにん'],
    ['onnanoko', 'おんなのこ'],
    ['shucchou', 'しゅっちょう'],
    ['roppyaku', 'ろっぴゃく'],
    ['gakkou', 'がっこう'],
    ['kitte', 'きって'],
    ['tenpura', 'てんぷら'],
    ['nanboku', 'なんぼく'],
    ['toukyou', 'とうきょう'],
    ['yunyuu', 'ゆにゅう'],
    ['genkin', 'げんきん'],
    ["ten'in", 'てんいん'],
    ['matcha', 'まっちゃ'],
    ['honn', 'ほん'],
    ['konnichiwa', 'こんにちわ'],
  ])('%s → %s', (romaji, kana) => {
    expect(romajiToHiragana(romaji)).toBe(kana);
  });

  it('aceita grafia kunrei', () => {
    expect(romajiToHiragana('tuki')).toBe('つき');
    expect(romajiToHiragana('syasin')).toBe('しゃしん');
    expect(romajiToHiragana('zyuu')).toBe('じゅう');
  });
});

describe('kanaToRomaji', () => {
  it('volta para Hepburn', () => {
    expect(kanaToRomaji('きんようび')).toBe("kin'youbi");
    expect(kanaToRomaji('しゅっちょう')).toBe('shutchou');
    expect(kanaToRomaji('ビール')).toBe('biiru');
    expect(kanaToRomaji('がっこう')).toBe('gakkou');
  });
});

describe('compareReading', () => {
  it('aceita romaji, hiragana e katakana', () => {
    expect(compareReading('hitori', 'ひとり')).toBe('exact');
    expect(compareReading('ひとり', 'ひとり')).toBe('exact');
    expect(compareReading('ヒトリ', 'ひとり')).toBe('exact');
    expect(compareReading(' Hitori ', 'ひとり')).toBe('exact');
  });

  it('avisa quando só a vogal longa está errada', () => {
    expect(compareReading('kyu', 'きゅう')).toBe('close');
    expect(compareReading('tokyo', 'とうきょう')).toBe('close');
    expect(compareReading('sense', 'せんせい')).toBe('close');
  });

  it('recusa leitura errada e resposta vazia', () => {
    expect(compareReading('futari', 'ひとり')).toBe('wrong');
    expect(compareReading('', 'ひとり')).toBe('wrong');
    expect(compareReading('   ', 'ひとり')).toBe('wrong');
  });

  it('não confunde ん + vogal com な行', () => {
    expect(compareReading("kin'youbi", 'きんようび')).toBe('exact');
    // sem apóstrofo e no estilo do teclado japonês também valem
    expect(compareReading('kinyoubi', 'きんようび')).toBe('exact');
    expect(compareReading('kinnyoubi', 'きんようび')).toBe('exact');
    expect(compareReading('sannin', 'さんにん')).toBe('exact');
    expect(compareReading('kiniyoubi', 'きんようび')).toBe('wrong');
    expect(compareReading('sanin', 'さんにん')).toBe('wrong');
  });
});

describe('texto', () => {
  it('toReadingKey tira pontuação', () => {
    expect(toReadingKey('ひとり。')).toBe('ひとり');
  });
  it('normalizePt ignora acento e caixa', () => {
    expect(normalizePt('  Água ')).toBe('agua');
    expect(normalizePt('MÃE')).toBe('mae');
  });
});
