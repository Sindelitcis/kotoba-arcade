/**
 * Bug: na lição "O nome das coisas" da Cena Viva, a leitura aparecia em cima de tudo
 * (こ れ は か さ で す 。 por cima de これは傘です。). Furigana só vai em cima de kanji.
 */
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/core/app';
import { Apresentacao } from '../src/core/Apresentacao';
import { partesFurigana } from '../src/core/Furigana';
import { ETAPAS } from '../src/games/cena/engine';
import { itemDaEtapa } from '../src/games/cena/aulas';
import { Frase } from '../src/games/cena/CenaGame';

const KANJI = /[一-鿿々]/;

describe('furigana só em cima de kanji', () => {
  // Sem voz: o cartão não tenta baixar gravação no teste.
  beforeAll(() => void (app.data.settings.voice = false));
  afterAll(() => void (app.data.settings.voice = true));
  afterEach(() => render(null, document.body));

  it('divide pela leitura: kana fica sem leitura em cima', () => {
    expect(partesFurigana('これは傘です。', 'これはかさです。')).toEqual([{ t: 'これは' }, { t: '傘', r: 'かさ' }, { t: 'です。' }]);
    expect(partesFurigana('大きい', 'おおきい')).toEqual([{ t: '大', r: 'おお' }, { t: 'きい' }]);
    expect(partesFurigana('机の上の本', 'つくえのうえのほん')).toEqual([{ t: '机', r: 'つくえ' }, { t: 'の' }, { t: '上', r: 'うえ' }, { t: 'の' }, { t: '本', r: 'ほん' }]);
    // Katakana no texto e leitura em hiragana (ou o contrário) ainda alinham.
    expect(partesFurigana('テレビ台', 'てれびだい')).toEqual([{ t: 'テレビ' }, { t: '台', r: 'だい' }]);
    expect(partesFurigana('かばん', 'かばん')).toEqual([{ t: 'かばん' }]);
    expect(partesFurigana('かばん', undefined)).toEqual([{ t: 'かばん' }]);
  });

  it('a lição de cada etapa da Cena Viva: só kanji ganha leitura', async () => {
    for (const e of ETAPAS) {
      const item = itemDaEtapa(e);
      await act(() => render(<Apresentacao itens={[item]} onFim={() => {}} />, document.body));
      const rubis = [...document.querySelectorAll('.ap-grande ruby')];
      for (const r of rubis) {
        const base = [...r.childNodes].filter((n) => n.nodeName !== 'RT').map((n) => n.textContent).join('');
        expect(base, `${e}: "${base}" tem leitura em cima e não tem kanji`).toMatch(KANJI);
      }
      if (KANJI.test(item.grande)) expect(rubis.length, e).toBeGreaterThan(0);
    }
  });

  it('o caso relatado: これは傘です。 mostra かさ só em cima de 傘', async () => {
    await act(() => render(<Apresentacao itens={[itemDaEtapa('nome')]} onFim={() => {}} />, document.body));
    expect([...document.querySelectorAll('.ap-grande rt')].map((r) => r.textContent)).toEqual(['かさ']);
    expect(document.querySelector('.ap-grande')?.textContent).toBe('これは傘かさです。');
  });

  it('frase da Cena Viva com okurigana: 赤い ganha leitura só no 赤', async () => {
    await act(() => render(<Frase segs={[{ t: '赤い', r: 'あかい' }, { t: 'かさ', r: 'かさ' }]} />, document.body));
    expect([...document.querySelectorAll('rt')].map((r) => r.textContent)).toEqual(['あか']);
  });
});
