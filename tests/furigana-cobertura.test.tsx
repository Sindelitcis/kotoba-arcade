/**
 * Pedido do Rafael: kanji sem a leitura em cima atrapalha quem está começando. O caso dele foi o
 * cartão de apresentação do KanjiMon, com a frase de exemplo 火を消して。 sem furigana.
 *
 * Todo japonês com kanji que o site mostra tem leitura: a do conteúdo ou a de
 * `src/content/data/furigana.json` (feito por `npm run furigana`). Aqui o teste passa por todo o
 * texto do conteúdo (`scripts/textos-jp.ts`); o e2e falha se a tela mostrar kanji sem leitura.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cardKey, KANJI } from '../src/content';
import furigana from '../src/content/data/furigana.json';
import { fichaDe } from '../src/content/aprofundar/fichas';
import { itemDaFicha } from '../src/content/ensino';
import { app } from '../src/core/app';
import { Apresentacao } from '../src/core/Apresentacao';
import { Furigana, Misto } from '../src/core/Furigana';
import { blocosDoTexto, FORMAS_SEM_LEITURA, MARCA_SEM_LEITURA, partesDe } from '../src/core/leitura-jp';
import { emptySave, importSave } from '../src/core/save';
import { newCard, review, DAY } from '../src/core/srs';
import { listarTextosJp } from '../scripts/textos-jp';

const RAIZ = join(__dirname, '..');
const KANJI_RE = /[一-鿿々〆ヶ]/;
const LEITURAS = furigana.leituras as Record<string, string[]>;
const textos = listarTextosJp();
const T0 = new Date('2026-11-22T12:00:00').getTime();

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivos(join(dir, e.name)) : [join(dir, e.name)]));
}

const rts = () => [...document.querySelectorAll('rt')].map((r) => r.textContent);

describe('todo japonês com kanji do conteúdo tem leitura', () => {
  it('cada texto tem leitura em cada pedaço de kanji, só em kana', () => {
    const sem: string[] = [];
    for (const t of textos) {
      if (FORMAS_SEM_LEITURA.has(t.texto)) continue;
      const partes = partesDe(t.texto, t.leitura);
      if (partes.some((p) => KANJI_RE.test(p.t) && !p.r)) sem.push(`${t.texto}  [${t.origem}]`);
      for (const p of partes) if (p.r && !/^[ぁ-ゖァ-ヺー]+$/.test(p.r)) sem.push(`${t.texto}: leitura "${p.r}" não é kana`);
    }
    expect(sem, 'rode `npm run furigana`').toEqual([]);
    expect(textos.length).toBeGreaterThan(2000);
  });

  it('os dados guardam o texto inteiro do conteúdo, com um pedaço de leitura por pedaço de kanji', () => {
    const listados = new Set(textos.map((t) => t.texto));
    const fora = textos.filter((t) => !FORMAS_SEM_LEITURA.has(t.texto) && !LEITURAS[t.texto]).map((t) => t.texto);
    expect(fora, 'rode `npm run furigana`').toEqual([]);
    // Nada sobrando: texto que saiu do conteúdo sai dos dados também.
    expect(Object.keys(LEITURAS).filter((t) => !listados.has(t))).toEqual([]);
    expect(furigana.formas.filter((t) => !listados.has(t))).toEqual([]);
    for (const [t, rs] of Object.entries(LEITURAS)) expect(rs.length, t).toBe(blocosDoTexto(t).filter((b) => b.kanji).length);
  });

  it('as correções à mão são de textos que existem, e ganham dos outros', () => {
    const correcoes = JSON.parse(readFileSync(join(RAIZ, 'scripts/furigana-correcoes.json'), 'utf8')) as Record<string, string[]>;
    const listados = new Set(textos.map((t) => t.texto));
    for (const [t, rs] of Object.entries(correcoes)) {
      expect(listados.has(t), t).toBe(true);
      expect(LEITURAS[t], t).toEqual(rs);
    }
  });

  it('as frases de exemplo dos kanji (cartão de apresentação, Dex, frase do dia) estão todas nos dados', () => {
    const faltam = KANJI.flatMap((k) => k.sentences.map((s) => s.jp)).filter((jp) => !LEITURAS[jp]);
    expect(faltam).toEqual([]);
  });

  it('leituras ambíguas e de número ficam certas', () => {
    // A leitura inteira (ははりょうり…) não diz onde termina はは; os dados guardam por pedaço.
    expect(LEITURAS['母は料理が上手です。']).toEqual(['はは', 'りょうり', 'じょうず']);
    // O OpenJTalk lê 日本人 como にっぽんじん; o conteúdo diz にほんじん.
    expect(LEITURAS['先生は日本人です']).toEqual(['せんせい', 'にほんじん']);
    // A pronúncia, não a leitura do dicionário: 三本 = さんぼん, 四時 = よじ.
    expect(LEITURAS['三本']).toEqual(['さんぼん']);
    expect(LEITURAS['四時に会いましょう。']?.[0]).toBe('よじ');
    // Número em algarismo fica sem leitura; o 時 depois dele, com.
    expect(partesDe('3時半')).toEqual([{ t: '3' }, { t: '時半', r: 'じはん' }]);
  });

  it('todo <Furigana texto="…"> escrito no código tem leitura', () => {
    const faltam: string[] = [];
    for (const f of arquivos(join(RAIZ, 'src')).filter((f) => f.endsWith('.tsx'))) {
      for (const m of readFileSync(f, 'utf8').matchAll(/<Furigana texto="([^"]+)"( leitura="[^"]+")? \/>/g)) {
        const t = m[1] as string;
        if (!m[2] && partesDe(t).some((p) => KANJI_RE.test(p.t) && !p.r)) faltam.push(t);
      }
    }
    expect(faltam).toEqual([]);
  });

  it('o e2e procura a mesma marca de kanji sem leitura', () => {
    expect(readFileSync(join(RAIZ, 'e2e/base.ts'), 'utf8')).toContain(`'${MARCA_SEM_LEITURA}'`);
  });
});

describe('<Furigana> e <Misto>', () => {
  beforeAll(() => void (app.data.settings.voice = false));
  afterAll(() => void (app.data.settings.voice = true));
  afterEach(() => {
    render(null, document.body);
    app.data.settings.furigana = 'sempre';
    app.data.cards = {};
  });

  it('o caso relatado: o cartão do 火 mostra 火を消して。 com ひ em cima de 火 e け em cima de 消', async () => {
    const ficha = fichaDe({ t: 'kanji', c: '火' })!;
    const item = itemDaFicha(ficha, [cardKey('k:火', 'meaning')]);
    expect(item.exemplo?.jp).toBe('火を消して。');
    await act(() => render(<Apresentacao itens={[item]} onFim={() => {}} />, document.body));
    expect([...document.querySelectorAll('.ap-ex-jp rt')].map((r) => r.textContent)).toEqual(['ひ', 'け']);
    expect(document.querySelector('.ap-ex-jp')?.textContent).toBe('火ひを消けして。');
  });

  it('sem leitura nenhuma, avisa no console com a marca do e2e', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await act(() => render(<Furigana texto="鬱蒼とした森" />, document.body));
      expect(aviso.mock.calls.map((c) => c[0])).toContain(`${MARCA_SEM_LEITURA}: 鬱蒼とした森`);
    } finally {
      aviso.mockRestore();
    }
  });

  it('a leitura dada pelo conteúdo vale: 一日 é いちにち numa lição e ついたち como palavra', async () => {
    await act(() => render(<Furigana texto="一日" leitura="いちにち" />, document.body));
    expect(rts()).toEqual(['いちにち']);
    await act(() => render(<Furigana texto="一日" />, document.body));
    expect(rts()).toEqual(['ついたち']);
  });

  it('texto em português com japonês no meio: leitura só no japonês com kanji', async () => {
    await act(() => render(<Misto texto="A partícula は liga 学校 ao resto. Às 3時半." />, document.body));
    expect(rts()).toEqual(['がっこう', 'じはん']);
    expect(document.body.textContent).toBe('A partícula は liga 学校がっこう ao resto. Às 3時半じはん.');
  });

  it('nos Ajustes, "Só no que ainda aprendo" tira a leitura do kanji que você já lê bem', async () => {
    // 火 com a leitura firme (aguenta uma semana); 消 ainda não tem carta.
    let c = newCard(T0 - 60 * DAY);
    for (let d = 59; d > 0; d -= 15) c = review(c, { correct: true }, T0 - d * DAY);
    app.data.cards[cardKey('k:火', 'reading')] = c;
    await act(() => render(<Furigana texto="火を消して。" />, document.body));
    expect(rts()).toEqual(['ひ', 'け']);
    app.data.settings.furigana = 'aprendendo';
    await act(() => render(<Furigana texto="火を消して。" />, document.body));
    expect(rts()).toEqual(['け']);
  });

  it('o padrão é mostrar sempre; save antigo ou estragado volta para o padrão', () => {
    expect(emptySave(T0).settings.furigana).toBe('sempre');
    for (const antigo of [{}, { furigana: 'nunca' }, { furigana: 3 }]) {
      expect(importSave(JSON.stringify({ v: 2, settings: antigo }), T0).settings.furigana).toBe('sempre');
    }
    expect(importSave(JSON.stringify({ v: 2, settings: { furigana: 'aprendendo' } }), T0).settings.furigana).toBe('aprendendo');
  });
});
