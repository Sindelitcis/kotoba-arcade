import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AULAS } from '../src/aulas';
import { app, screen } from '../src/core/app';
import { carregarPt, esquecerPt, urlPt, type ManifestoPt } from '../src/core/fala-pt';
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
    esperar: async (ms) => {
      log.push(`esperar ${ms}`);
    },
  };
  return { log, saida };
}

const manifestoPt = (falas: Record<string, string>, voz = 'voz1'): ManifestoPt => ({ versao: 1, voz, falas });
const jp = (texto: string, kana = texto) => ({ tipo: 'jp', fala: { texto, voz: 'frase', kana } }) as const;

describe('save do modo Ouvir', () => {
  it('não há escolha de voz em português; save antigo com a escolha abre sem ela', () => {
    expect('vozPt' in emptySave(T0).settings).toBe(false);
    // Saves do tempo em que dava para escolher Voz 1 ou Voz 2, e do tempo da voz do PC.
    for (const antigo of [{ vozPt: 'voz2' }, { vozPt: 'voz1' }, { vozPt: 'amigo' }, { vozLocal: true }]) {
      const s = importSave(JSON.stringify({ v: 1, settings: { ...antigo, calm: true } }), T0);
      expect(Object.keys(s.settings).sort()).toEqual(Object.keys(emptySave(T0).settings).sort());
      expect(s.settings.calm).toBe(true);
    }
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

  it('acha a gravação pelo texto; sem ela ou sem manifesto, nada', () => {
    const m = manifestoPt({ Oi: 'a.mp3' });
    expect(urlPt(m, 'Oi')).toBe('/vozes-pt/voz1/a.mp3');
    expect(urlPt(m, 'Nada')).toBeUndefined();
    expect(urlPt(null, 'Oi')).toBeUndefined();
  });

  it('baixa o manifesto do próprio site, uma vez só, e nunca pergunta à rede local', async () => {
    const pedidos: string[] = [];
    const f = (async (url: string) => {
      pedidos.push(url);
      return new Response(JSON.stringify(manifestoPt({ Oi: 'b.mp3' })));
    }) as typeof fetch;
    await carregarPt(f);
    await carregarPt(f);
    expect(pedidos).toEqual(['/vozes-pt/voz1/manifesto.json']);
  });

  it('manifesto fora do ar, sumido ou estranho vira nulo', async () => {
    const respostas = [async () => Promise.reject(new Error('recusado')), async () => new Response('', { status: 404 }), async () => new Response('{"oi":1}')];
    for (const f of respostas) {
      esquecerPt();
      expect(await carregarPt(f as unknown as typeof fetch)).toBeNull();
    }
  });
});

describe('tocar uma aula', () => {
  const fontes = (pt: Record<string, string>) => async () => ({
    jp: { versao: 1, falas: { 水: { mao: 'agua.mp3' } } } as never,
    pt: manifestoPt(pt),
  });

  it('português, japonês, pausa do tamanho da fala e japonês de novo', async () => {
    const { log, saida } = saidaFalsa({ '/vozes/agua.mp3': 2 });
    const trechos: Trecho[] = [{ tipo: 'pt', texto: 'Água.' }, jp('水', 'みず'), { tipo: 'pausa', vezes: 1.5 }, jp('水', 'みず')];
    const t = tocarSequencia(trechos, { saida, fontes: fontes({ 'Água.': 'a.mp3' }) });
    expect(await t.fim).toBe(true);
    expect(log).toEqual(['tocar /vozes-pt/voz1/a.mp3', 'tocar /vozes/agua.mp3', 'esperar 3400', 'tocar /vozes/agua.mp3']);
  });

  it('sem gravação, não fala nada e avisa no console (não há voz do navegador)', async () => {
    const { log, saida } = saidaFalsa();
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const t = tocarSequencia([{ tipo: 'pt', texto: 'Sem áudio.' }, jp('山', 'やま')], { saida, fontes: fontes({}) });
      await t.fim;
      expect(log).toEqual([]);
      expect(aviso.mock.calls.map((c) => c[0])).toEqual(['[voz] sem gravação (pt): Sem áudio.', '[voz] sem gravação (ja): 山']);
    } finally {
      aviso.mockRestore();
    }
  });

  it('japonês sem gravação do texto toca a do kana, se houver', async () => {
    const { log, saida } = saidaFalsa();
    await tocarSequencia([jp('お水', '水')], { saida, fontes: fontes({}) }).fim;
    expect(log).toEqual(['tocar /vozes/agua.mp3']);
  });

  it('começa do trecho pedido e avisa cada trecho', async () => {
    const { log, saida } = saidaFalsa();
    const vistos: number[] = [];
    const t = tocarSequencia([{ tipo: 'pt', texto: 'A.' }, { tipo: 'pt', texto: 'B.' }], { saida, fontes: fontes({ 'A.': 'a.mp3', 'B.': 'b.mp3' }), desde: 1, aoTrecho: (i) => vistos.push(i) });
    await t.fim;
    expect(log).toEqual(['tocar /vozes-pt/voz1/b.mp3']);
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
      esperar: async () => {},
    };
    const t = tocarSequencia([{ tipo: 'pt', texto: 'A.' }, { tipo: 'pt', texto: 'B.' }], { saida, fontes: fontes({ 'A.': 'a.mp3', 'B.': 'b.mp3' }) });
    parar = t.parar;
    expect(await t.fim).toBe(false);
    expect(log).toEqual(['/vozes-pt/voz1/a.mp3']);
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

  it('nos Ajustes do fliperama não há escolha de voz', async () => {
    await act(() => render(<Hub />, document.body));
    await act(() => document.querySelector<HTMLButtonElement>('button[aria-label="Ajustes"]')?.click());
    const ajustes = document.querySelector('[role="dialog"]');
    expect(ajustes).not.toBeNull();
    expect(ajustes?.querySelector('[data-testid^="voz-pt"]')).toBeNull();
    expect(ajustes?.textContent).not.toMatch(/Voz 1|Voz 2|Voz em português/);
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
