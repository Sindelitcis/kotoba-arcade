import { describe, expect, it } from 'vitest';
import { compareReading, kanaToRomaji, matchTyping, normalizePt, romajiToHiragana, toReadingKey } from '../src/core/kana';

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

describe('matchTyping (digitação letra a letra)', () => {
  it('acompanha a digitação até completar', () => {
    expect(matchTyping('', 'さくら')).toBe('prefix');
    expect(matchTyping('s', 'さくら')).toBe('prefix');
    expect(matchTyping('saku', 'さくら')).toBe('prefix');
    expect(matchTyping('sakura', 'さくら')).toBe('complete');
    expect(matchTyping('sakuro', 'さくら')).toBe('no');
    expect(matchTyping('sakuraa', 'さくら')).toBe('no');
  });

  it('aceita Hepburn e kunrei', () => {
    expect(matchTyping('shi', 'し')).toBe('complete');
    expect(matchTyping('si', 'し')).toBe('complete');
    expect(matchTyping('tsu', 'つ')).toBe('complete');
    expect(matchTyping('tu', 'つ')).toBe('complete');
    expect(matchTyping('sya', 'しゃ')).toBe('complete');
    expect(matchTyping('jo', 'じょ')).toBe('complete');
    expect(matchTyping('zyo', 'じょ')).toBe('complete');
  });

  it('consoante dobrada', () => {
    expect(matchTyping('kitte', 'きって')).toBe('complete');
    expect(matchTyping('gakkou', 'がっこう')).toBe('complete');
    expect(matchTyping('shucchou', 'しゅっちょう')).toBe('complete');
    expect(matchTyping('shutchou', 'しゅっちょう')).toBe('complete');
    expect(matchTyping('kite', 'きって')).toBe('no');
  });

  it('ん de todo jeito que as pessoas digitam', () => {
    expect(matchTyping('hon', 'ほん')).toBe('complete');
    expect(matchTyping('honn', 'ほん')).toBe('complete');
    expect(matchTyping('sannin', 'さんにん')).toBe('complete');
    expect(matchTyping("kin'youbi", 'きんようび')).toBe('complete');
    expect(matchTyping('kinnyoubi', 'きんようび')).toBe('complete');
    expect(matchTyping('kinyoubi', 'きんようび')).toBe('complete');
    expect(matchTyping('tenki', 'てんき')).toBe('complete');
  });

  it('katakana e vogal longa com traço ou vogal repetida', () => {
    expect(matchTyping('bi-ru', 'ビール')).toBe('complete');
    expect(matchTyping('biiru', 'ビール')).toBe('complete');
    expect(matchTyping('a', 'ア')).toBe('complete');
  });

  it('maiúsculas contam igual', () => {
    expect(matchTyping('SAKURA', 'さくら')).toBe('complete');
  });
});

describe('sons de palavras estrangeiras', () => {
  // ファイル virava "fuぁiru" e quem digitava "fairu" errava.
  it('viram romaji Hepburn', () => {
    expect(kanaToRomaji('ファイル')).toBe('fairu');
    expect(kanaToRomaji('パーティー')).toBe('paatii');
    expect(kanaToRomaji('シェフ')).toBe('shefu');
  });

  it('digitar em romaji acerta', () => {
    expect(compareReading('fairu', 'ファイル')).toBe('exact');
    expect(matchTyping('fairu', 'ファイル')).toBe('complete');
    expect(matchTyping('shefu', 'シェフ')).toBe('complete');
  });

  it('ti, tu e wo digitados continuam sendo ち, つ e を', () => {
    expect(romajiToHiragana('ti')).toBe('ち');
    expect(romajiToHiragana('tu')).toBe('つ');
    expect(romajiToHiragana('wo')).toBe('を');
  });
});
