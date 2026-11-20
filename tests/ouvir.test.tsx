import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { AULAS } from '../src/aulas';
import { app, screen } from '../src/core/app';
import { carregarPt, esquecerPt, paginaLocal, procurarLocal, urlPt, type ManifestoPt } from '../src/core/fala-pt';
import { emptySave, importSave } from '../src/core/save';
import { tocarSequencia, type Saida, type Trecho } from '../src/core/sequencia';
import { Hub } from '../src/hub/Hub';
import { FILA, GRUPOS, OuvirTela, pular } from '../src/ouvir/OuvirTela';
import { ensureOuvirSave, registrarOuvida } from '../src/ouvir/save';

const T0 = new Date('2026-11-20T12:00:00').getTime();
const press = (key: string) => dispatchEvent(new KeyboardEvent('keydown', { key }));

/** Navegador de mentira: anota o que tocou, falou e esperou. */
function saidaFalsa(duracoes: Record<string, number> = {}) {
  const log: string[] = [];
  const saida: Saida = {
    tocar: async (url) => {
      log.push(`tocar ${url}`);
      return duracoes[url] ?? 1;
    },
    falarNavegador: async (texto, lang) => {
      log.push(`navegador ${lang} ${texto}`);
    },
    esperar: async (ms) => {
      log.push(`esperar ${ms}`);
    },
  };
  return { log, saida };
}

const manifestoPt = (falas: Record<string, string>, voz = 'kokoro-pf_dora'): ManifestoPt => ({ versao: 1, voz, falas });
const jp = (texto: string, kana = texto) => ({ tipo: 'jp', fala: { texto, voz: 'frase', kana } }) as const;

describe('save do modo Ouvir', () => {
  it('voz do PC começa desligada e valor estranho vira desligado', () => {
    expect(emptySave(T0).settings.vozLocal).toBe(false);
    const s = importSave(JSON.stringify({ v: 1, settings: { vozLocal: 'sim' } }), T0);
    expect(s.settings.vozLocal).toBe(false);
    expect(importSave(JSON.stringify({ v: 1, settings: { vozLocal: true } }), T0).settings.vozLocal).toBe(true);
  });

  it('aulas ouvidas: conserta o que vier estragado e conta cada vez', () => {
    const games: Record<string, unknown> = { ouvir: { ouvidas: { a: 2, b: -1, c: 'x' }, ultima: 3 } };
    const s = ensureOuvirSave(games);
    expect(s).toEqual({ ouvidas: { a: 2 } });
    registrarOuvida(s, 'a');
    registrarOuvida(s, 'novo');
    expect(s.ouvidas).toEqual({ a: 3, novo: 1 });
    expect(ensureOuvirSave({ ouvir: [] })).toEqual({ ouvidas: {} });
  });
});

describe('de onde vem o português', () => {
  afterEach(() => esquecerPt());

  it('só a própria máquina conta como página local', () => {
    for (const h of ['localhost', '127.0.0.1', '[::1]', 'app.localhost']) expect(paginaLocal(h), h).toBe(true);
    for (const h of ['sindelitcis.github.io', 'localhost.com', '192.168.0.2']) expect(paginaLocal(h), h).toBe(false);
  });

  it('a voz do PC vem primeiro; sem ela, a livre; sem as duas, nada', () => {
    const fontes = { local: manifestoPt({ Oi: 'aaaaaaaaaaaaaaaa.mp3' }, 'local'), publico: manifestoPt({ Oi: 'b.mp3', Tchau: 'c.mp3' }) };
    expect(urlPt(fontes, 'Oi', 'http://pc')).toBe('http://pc/aulas/aaaaaaaaaaaaaaaa.mp3');
    expect(urlPt(fontes, 'Tchau')).toBe('/vozes-pt/c.mp3');
    expect(urlPt(fontes, 'Nada')).toBeUndefined();
  });

  it('visitante do site não faz pergunta à rede local: só procura o servidor com o ajuste ligado', async () => {
    const pedidos: string[] = [];
    const f = (async (url: string) => {
      pedidos.push(url);
      return new Response(JSON.stringify(manifestoPt({ Oi: 'b.mp3' })));
    }) as typeof fetch;
    await carregarPt(false, f);
    expect(pedidos).toEqual(['/vozes-pt/manifesto.json']);
    // Ligou o ajuste: procura o servidor, sem baixar o manifesto público de novo.
    await carregarPt(true, f);
    expect(pedidos).toEqual(['/vozes-pt/manifesto.json', 'http://127.0.0.1:8791/aulas/manifesto.json']);
  });

  it('servidor fora do ar ou resposta estranha não quebram nada', async () => {
    expect(await procurarLocal((async () => Promise.reject(new Error('recusado'))) as typeof fetch)).toBeNull();
    expect(await procurarLocal((async () => new Response('{"oi":1}')) as typeof fetch)).toBeNull();
    expect(await procurarLocal((async () => new Response('', { status: 404 })) as typeof fetch)).toBeNull();
  });
});

describe('tocar uma aula', () => {
  const fontes = (pt: Record<string, string>) => async () => ({
    jp: { versao: 1, falas: { 水: { mao: 'agua.mp3' } } } as never,
    pt: { local: null, publico: manifestoPt(pt) },
  });

  it('português, japonês, pausa do tamanho da fala e japonês de novo', async () => {
    const { log, saida } = saidaFalsa({ '/vozes/agua.mp3': 2 });
    const trechos: Trecho[] = [{ tipo: 'pt', texto: 'Água.' }, jp('水', 'みず'), { tipo: 'pausa', vezes: 1.5 }, jp('水', 'みず')];
    const t = tocarSequencia(trechos, { saida, fontes: fontes({ 'Água.': 'a.mp3' }) });
    expect(await t.fim).toBe(true);
    expect(log).toEqual(['tocar /vozes-pt/a.mp3', 'tocar /vozes/agua.mp3', 'esperar 3400', 'tocar /vozes/agua.mp3']);
  });

  it('sem gravação, cai na voz do navegador (o japonês pela leitura em kana)', async () => {
    const { log, saida } = saidaFalsa();
    const t = tocarSequencia([{ tipo: 'pt', texto: 'Sem áudio.' }, jp('山', 'やま')], { saida, fontes: fontes({}) });
    await t.fim;
    expect(log).toEqual(['navegador pt-BR Sem áudio.', 'navegador ja-JP やま']);
  });

  it('começa do trecho pedido e avisa cada trecho', async () => {
    const { log, saida } = saidaFalsa();
    const vistos: number[] = [];
    const t = tocarSequencia([{ tipo: 'pt', texto: 'A.' }, { tipo: 'pt', texto: 'B.' }], { saida, fontes: fontes({ 'A.': 'a.mp3', 'B.': 'b.mp3' }), desde: 1, aoTrecho: (i) => vistos.push(i) });
    await t.fim;
    expect(log).toEqual(['tocar /vozes-pt/b.mp3']);
    expect(vistos).toEqual([1]);
  });

  it('parar no meio não deixa a aula seguir sozinha', async () => {
    let parar = () => {};
    const log: string[] = [];
    const saida: Saida = {
      tocar: async (url) => {
        log.push(url);
        parar();
        return 1;
      },
      falarNavegador: async () => {},
      esperar: async () => {},
    };
    const t = tocarSequencia([{ tipo: 'pt', texto: 'A.' }, { tipo: 'pt', texto: 'B.' }], { saida, fontes: fontes({ 'A.': 'a.mp3', 'B.': 'b.mp3' }) });
    parar = t.parar;
    expect(await t.fim).toBe(false);
    expect(log).toEqual(['/vozes-pt/a.mp3']);
  });

  it('com a voz desligada nos ajustes, não toca nada', async () => {
    const { log, saida } = saidaFalsa();
    app.data.settings.voice = false;
    try {
      expect(await tocarSequencia([{ tipo: 'pt', texto: 'A.' }], { saida, fontes: fontes({}) }).fim).toBe(false);
      expect(log).toEqual([]);
    } finally {
      app.data.settings.voice = true;
    }
  });
});

describe('tela do modo Ouvir', () => {
  afterEach(() => {
    render(null, document.body);
    screen.value = 'hub';
  });

  it('todas as aulas aparecem, na ordem da Jornada, começando pelo como funciona', () => {
    expect(FILA[0]?.id).toBe('ouvir:como');
    expect(new Set(FILA.map((a) => a.id))).toEqual(new Set(AULAS.map((a) => a.id)));
    expect(GRUPOS.every((g) => g.aulas.length > 0)).toBe(true);
  });

  it('as setas pulam de explicação em explicação', () => {
    const t: Trecho[] = [{ tipo: 'pt', texto: 'A.' }, jp('水'), { tipo: 'pausa', vezes: 1 }, jp('水'), { tipo: 'pt', texto: 'B.' }, jp('山')];
    expect(pular(t, 0, 1)).toBe(4);
    expect(pular(t, 4, 1)).toBe(6);
    expect(pular(t, 5, -1)).toBe(4);
    expect(pular(t, 4, -1)).toBe(0);
    expect(pular(t, 0, -1)).toBe(0);
  });

  it('O no fliperama abre o modo Ouvir, e Esc volta', async () => {
    await act(() => render(<Hub />, document.body));
    press('o');
    expect(screen.value).toBe('ouvir');
    render(null, document.body);
    await act(() => render(<OuvirTela />, document.body));
    press('Escape');
    expect(screen.value).toBe('hub');
  });

  it('↓ escolhe a próxima aula, T mostra o texto, e com a voz desligada avisa', async () => {
    screen.value = 'ouvir';
    app.data.settings.voice = false;
    try {
      await act(() => render(<OuvirTela />, document.body));
      expect(document.body.textContent).toContain('A voz está desligada');
      const antes = document.querySelector('[data-testid="ouvir-titulo"]')?.textContent;
      await act(() => void press('ArrowDown'));
      expect(document.querySelector('[data-testid="ouvir-titulo"]')?.textContent).not.toBe(antes);
      expect(document.querySelector('[data-testid="ouvir-texto"]')).toBeNull();
      await act(() => void press('t'));
      expect(document.querySelector('[data-testid="ouvir-texto"]')?.textContent).toContain(FILA[1]?.trechos.find((t) => t.tipo === 'pt')?.texto as string);
    } finally {
      app.data.settings.voice = true;
    }
  });
});
