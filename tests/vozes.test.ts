import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listarFalas, TTS_CORRIGIDO } from '../scripts/falas';
import { SPEAKERS } from '../src/games/aventura/cenas';
import { WORDS } from '../src/content';
import { DAILY_WORDS } from '../src/content/vida';
import { CENAS } from '../src/games/conversa/engine';
import { VOZ_AVENTURA, VOZ_CONVERSA, VOZ_PADRAO, VOZ_PALAVRA, VOZES, vozDaAventura } from '../src/core/vozes';
import type { Manifesto } from '../src/core/audio';

const PASTA = join(__dirname, '../public/vozes');
const manifesto = JSON.parse(readFileSync(join(PASTA, 'manifesto.json'), 'utf8')) as Manifesto;

describe('vozes gravadas', () => {
  const falas = listarFalas();

  it('acha falas de todos os jogos', () => {
    const origens = new Set(falas.map((f) => f.origem.split('/')[0]));
    expect([...origens].sort()).toEqual(['aventura', 'conteudo', 'conversa', 'jornada', 'kana', 'kanaimagens', 'kumitate', 'pecas']);
    expect(falas.length).toBeGreaterThan(700);
  });

  it('todo texto fixo falado pelos jogos tem áudio no manifesto, na voz certa', () => {
    const faltando = falas.filter((f) => !manifesto.falas[f.texto]?.[f.voz]).map((f) => `${f.origem}: ${f.voz} "${f.texto}"`);
    expect(faltando, 'rode `npm run vozes` para gravar').toEqual([]);
  });

  it('todo arquivo do manifesto existe e nenhum mp3 sobra na pasta', () => {
    const arquivos = Object.values(manifesto.falas).flatMap((v) => Object.values(v));
    for (const a of arquivos) expect(existsSync(join(PASTA, a as string)), a).toBe(true);
    expect(new Set(arquivos).size).toBe(arquivos.length);
  });

  it('o manifesto só usa vozes conhecidas', () => {
    for (const v of Object.values(manifesto.falas)) for (const voz of Object.keys(v)) expect(VOZES).toHaveProperty(voz);
  });

  it('palavras soltas vão ao motor com kanji, para acertar leitura e acento (はし ponte e はし palitos)', () => {
    const hashi = falas.filter((f) => f.palavra?.kana === 'はし').map((f) => f.tts);
    for (const t of hashi) expect(t).toMatch(/[一-鿿]/);
  });

  it('palavras soltas e kana usam a voz de palavra, frases a voz padrão', () => {
    for (const f of falas) {
      if (f.palavra || f.origem.startsWith('kana/')) expect(f.voz, f.texto).toBe(VOZ_PALAVRA);
      if (f.origem.startsWith('conteudo/frase') || f.origem.startsWith('kumitate')) expect(f.voz, f.texto).toBe(VOZ_PADRAO);
    }
  });

  it('cada palavra com kanji leva a leitura certa, para o gravador trocar só ela por kana', () => {
    // Bug da primeira gravação: a frase inteira ia em kana e せんせいとはなします virou "...と わなします".
    const semLeitura = falas
      .filter((f) => !f.origem.startsWith('conteudo/frase') && !f.origem.endsWith('/pronta'))
      .flatMap((f) => f.partes.filter((p) => /[一-鿿]/.test(p.t) && !p.r).map((p) => `${f.origem}: ${p.t}`));
    expect(semLeitura).toEqual([]);
    const kumitate = falas.find((f) => f.texto === '先生と話します');
    expect(kumitate?.partes).toEqual([{ t: '先生', r: 'せんせい' }, { t: 'と' }, { t: '話します', r: 'はなします' }]);
    for (const f of falas) expect(f.partes.map((p) => p.t).join(''), f.origem).toBe(f.tts);
  });

  it('nenhuma palavra divide o kana com outra de kanji diferente (o jogo acha o áudio pelo kana)', () => {
    // Se isto falhar (はし ponte e はし palitos, por exemplo), o speak() das palavras precisa
    // receber o kanji também, senão as duas tocam o mesmo áudio com o acento de uma delas.
    const porKana = new Map<string, Set<string>>();
    for (const f of falas) if (f.palavra) porKana.set(f.texto, (porKana.get(f.texto) ?? new Set()).add(f.palavra.jp));
    for (const w of [...WORDS, ...DAILY_WORDS]) porKana.set(w.kana, (porKana.get(w.kana) ?? new Set()).add(w.jp));
    const repetidas = [...porKana].filter(([, jps]) => jps.size > 1).map(([k, jps]) => `${k}: ${[...jps].join(', ')}`);
    expect(repetidas).toEqual([]);
  });

  it('五分 vai ao motor como ごふん (o OpenJTalk lê ごぶ)', () => {
    const f = falas.find((x) => x.texto === '五分待ってください。');
    expect(f?.tts).toBe(TTS_CORRIGIDO['五分待ってください。']);
    expect(f?.tts.startsWith('ごふん')).toBe(true);
  });
});

describe('voz de cada personagem', () => {
  it('todo personagem da Aventura tem voz própria', () => {
    for (const who of Object.keys(SPEAKERS)) expect(VOZ_AVENTURA[who], who).toBeDefined();
  });

  it('o jogador e quem não está no mapa usam a voz padrão', () => {
    expect(vozDaAventura(undefined)).toBe(VOZ_PADRAO);
    expect(vozDaAventura('ninguem')).toBe(VOZ_PADRAO);
    expect(vozDaAventura('fiscal')).toBe('aida');
  });

  it('todo personagem da Conversa tem voz gravada', () => {
    for (const c of CENAS) expect(VOZ_CONVERSA[c.personagem.voz], c.id).toBeDefined();
  });
});

describe('speak', () => {
  const M: Manifesto = { versao: 1, falas: { はし: { mao: 'a.mp3' }, つぎ: { mao: 'b.mp3', aida: 'c.mp3' } } };
  let tocados: string[];
  let navegador: string[];

  beforeEach(() => {
    vi.resetModules();
    tocados = [];
    navegador = [];
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(M))));
    vi.stubGlobal(
      'Audio',
      class {
        constructor(public src: string) {}
        play() {
          tocados.push(this.src);
          return Promise.resolve();
        }
        pause() {}
      },
    );
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [{ lang: 'ja-JP' }],
      cancel: () => {},
      speak: (u: { text: string }) => navegador.push(u.text),
    });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        constructor(public text: string) {}
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('toca a gravação quando o texto está no manifesto', async () => {
    const { speak } = await import('../src/core/audio');
    await speak('はし');
    expect(tocados).toEqual(['/vozes/a.mp3']);
    expect(navegador).toEqual([]);
  });

  it('usa a voz do personagem e, sem ela, a padrão', async () => {
    const { speak } = await import('../src/core/audio');
    await speak('つぎ', 'aida');
    await speak('はし', 'aida');
    expect(tocados).toEqual(['/vozes/c.mp3', '/vozes/a.mp3']);
  });

  it('sem gravação, cai na voz do navegador', async () => {
    const { speak } = await import('../src/core/audio');
    await speak('ぜんぜん しらない ことば');
    expect(tocados).toEqual([]);
    expect(navegador).toEqual(['ぜんぜん しらない ことば']);
  });

  it('sem manifesto (rede fora), cai na voz do navegador', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('sem rede'))));
    const { speak } = await import('../src/core/audio');
    await speak('はし');
    expect(navegador).toEqual(['はし']);
  });

  it('se o arquivo não toca, fala pelo navegador', async () => {
    vi.stubGlobal(
      'Audio',
      class {
        play() {
          return Promise.reject(new Error('bloqueado'));
        }
        pause() {}
      },
    );
    const { speak } = await import('../src/core/audio');
    await speak('はし');
    await new Promise((r) => setTimeout(r, 0));
    expect(navegador).toEqual(['はし']);
  });

  it('com a voz desligada, não fala nada', async () => {
    const { speak } = await import('../src/core/audio');
    const { app } = await import('../src/core/app');
    app.data.settings.voice = false;
    await speak('はし');
    app.data.settings.voice = true;
    expect(tocados).toEqual([]);
    expect(navegador).toEqual([]);
  });
});
