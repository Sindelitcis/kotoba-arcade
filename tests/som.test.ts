import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tomDoAcerto } from '../src/core/audio';
import { CLIMAS, EFEITO_IDS, EFEITOS, FONTES, TRILHAS } from '../src/core/som/catalogo';
import { CLIMA_DA_TELA, climaAtual } from '../src/core/som/climas';

const SRC = join(__dirname, '..', 'src');
const SOM = join(SRC, 'assets', 'som');

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? arquivos(p) : [p];
  });
}

/** Duração de um .ogg vorbis: posição (em amostras) da última página dividida pela taxa. */
function oggSeconds(file: string): number {
  const buf = readFileSync(file);
  const rate = buf.readUInt32LE(buf.indexOf('vorbis') + 11);
  const last = buf.lastIndexOf('OggS');
  return Number(buf.readBigUInt64LE(last + 6)) / rate;
}

describe('arquivos e créditos do som', () => {
  it('cada clima e cada efeito do catálogo tem arquivo, e cada arquivo está no catálogo', () => {
    const nomes = (d: string) => readdirSync(join(SOM, d)).sort();
    expect(nomes('musica')).toEqual(CLIMAS.map((c) => `${c}.ogg`).sort());
    expect(nomes('efeitos')).toEqual(EFEITO_IDS.map((e) => `${e}.ogg`).sort());
    expect(readdirSync(SOM).sort()).toEqual(['efeitos', 'musica']);
  });

  it('todo arquivo tem crédito: título, link da origem e uma fonte com regras de uso', () => {
    for (const t of [...Object.values(TRILHAS), ...Object.values(EFEITOS)]) {
      expect(t.titulo.length).toBeGreaterThan(0);
      expect(t.link).toMatch(/^https:\/\//);
      const f = FONTES[t.fonte];
      expect(f.regras).toMatch(/^https:\/\//);
      expect(f.credito.length).toBeGreaterThan(0);
    }
  });

  it('a página de cada trilha é a do próprio autor, não um espelho', () => {
    for (const t of Object.values(TRILHAS)) expect(t.link).toMatch(/^https:\/\/maou\.audio\/bgm_/);
  });

  it('trilhas em loop de 30 s a 2 min e leves; efeitos curtos', () => {
    for (const c of CLIMAS) {
      const f = join(SOM, 'musica', `${c}.ogg`);
      expect(oggSeconds(f), c).toBeGreaterThan(30);
      expect(oggSeconds(f), c).toBeLessThan(120);
      expect(statSync(f).size, c).toBeLessThan(1.3 * 1024 * 1024);
    }
    for (const e of EFEITO_IDS) expect(oggSeconds(join(SOM, 'efeitos', `${e}.ogg`)), e).toBeLessThan(3);
  });

  it('todo efeito e clima citado no código existe no catálogo', () => {
    const efeitos = new Set<string>(EFEITO_IDS);
    const climas = new Set<string>(CLIMAS);
    const ruins: string[] = [];
    let citados = 0;
    for (const f of arquivos(SRC).filter((f) => /\.tsx?$/.test(f))) {
      const txt = readFileSync(f, 'utf-8');
      const onde = relative(SRC, f);
      for (const m of txt.matchAll(/tocarEfeito\('([^']+)'/g)) {
        citados++;
        if (!efeitos.has(m[1]!)) ruins.push(`${onde}: efeito ${m[1]}`);
      }
      // Clima é o valor escolhido: logo depois de `?` ou `:` (ou o argumento direto).
      for (const chamada of txt.matchAll(/(?:useClima|tocarClima)\(([^;]*)\);/g)) {
        for (const m of chamada[1]!.matchAll(/(?:^|[?:]\s*)'([^']+)'/g)) {
          citados++;
          if (!climas.has(m[1]!)) ruins.push(`${onde}: clima ${m[1]}`);
        }
      }
    }
    expect(citados).toBeGreaterThan(20);
    expect(ruins).toEqual([]);
  });

  it('o docs/musica.md cita toda trilha e todo efeito', () => {
    const doc = readFileSync(join(__dirname, '..', 'docs', 'musica.md'), 'utf-8');
    for (const t of Object.values(TRILHAS)) expect(doc, t.titulo).toContain(t.titulo);
    for (const e of Object.values(EFEITOS)) expect(doc, e.titulo).toContain(e.titulo);
  });
});

describe('clima de cada tela', () => {
  it('o Kana Beat e a Conversa ficam sem trilha de fundo; o resto tem uma', () => {
    for (const [tela, clima] of Object.entries(CLIMA_DA_TELA)) {
      if (tela === 'kanabeat' || tela === 'conversa') expect(clima, tela).toBeNull();
      else expect(CLIMAS, tela).toContain(clima);
    }
  });

  it('o clima do jogo (chefe, vitória) vence o da tela, e undefined devolve o da tela', () => {
    expect(climaAtual('roguelike', 'chefe')).toBe('chefe');
    expect(climaAtual('roguelike', undefined)).toBe('acao');
    expect(climaAtual('hub', null)).toBeNull();
  });

  it('o acerto sobe de tom com o combo e para no 12', () => {
    expect(tomDoAcerto(0)).toBe(1);
    expect(tomDoAcerto(12)).toBeCloseTo(Math.SQRT2);
    expect(tomDoAcerto(40)).toBe(tomDoAcerto(12));
  });
});

/** AudioContext de mentira: guarda os ganhos e para onde cada rampa vai. */
class GanhoFalso {
  gain = {
    value: 1,
    alvo: 1,
    cancelScheduledValues() {},
    setValueAtTime(v: number) {
      this.value = v;
    },
    linearRampToValueAtTime(v: number) {
      this.alvo = v;
    },
  };
  connect<T>(n: T): T {
    return n;
  }
  disconnect() {}
}

class FonteFalsa extends GanhoFalso {
  buffer: unknown = null;
  loop = false;
  playbackRate = { value: 1 };
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}

/** Duração dos áudios decodificados pelo contexto falso, em segundos. */
let duracaoFalsa = 60;

let criados: ContextoFalso[] = [];
class ContextoFalso {
  currentTime = 0;
  state = 'running';
  destination = {};
  ganhos: GanhoFalso[] = [];
  fontes: FonteFalsa[] = [];
  constructor() {
    criados.push(this);
  }
  createGain() {
    const g = new GanhoFalso();
    this.ganhos.push(g);
    return g;
  }
  createBufferSource() {
    const f = new FonteFalsa();
    this.fontes.push(f);
    return f;
  }
  decodeAudioData() {
    return Promise.resolve({ duration: duracaoFalsa });
  }
  resume() {
    return Promise.resolve();
  }
}

describe('gerenciador de som', () => {
  beforeEach(async () => {
    criados = [];
    duracaoFalsa = 60;
    vi.stubGlobal('AudioContext', ContextoFalso);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })),
    );
    (await import('../src/core/som/mixer'))._zerarParaTeste();
  });
  afterEach(async () => {
    (await import('../src/core/som/mixer'))._zerarParaTeste();
    vi.unstubAllGlobals();
  });

  it('nada toca antes da primeira interação; a trilha pedida começa no primeiro toque', async () => {
    const m = await import('../src/core/som/mixer');
    m.tocarEfeito('clique');
    m.tocarClima('hub');
    expect(criados).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('pointerdown'));
    expect(m.liberado.value).toBe(true);
    expect(criados).toHaveLength(1);
    await vi.waitFor(() => expect(criados[0]!.fontes.some((f) => f.loop && f.start.mock.calls.length > 0)).toBe(true));
  });

  it('com som desligado nos Ajustes, nem depois do toque cria áudio', async () => {
    const m = await import('../src/core/som/mixer');
    const { app } = await import('../src/core/app');
    app.data.settings.sound = false;
    m.liberar();
    m.tocarEfeito('acerto');
    app.data.settings.sound = true;
    expect(criados).toHaveLength(0);
  });

  it('a música abaixa quando uma voz começa e volta quando ela acaba', async () => {
    const m = await import('../src/core/som/mixer');
    m.liberar();
    // mestre, música, ducking, efeitos: o ducking é o terceiro ganho criado.
    const duck = criados[0]!.ganhos[2]!;
    expect(duck.gain.alvo).toBe(1);
    const voz = new Audio();
    m.acompanharVoz(voz);
    voz.dispatchEvent(new Event('play'));
    expect(m.vozesAtivas.value).toBe(1);
    expect(duck.gain.alvo).toBeCloseTo(m.DUCK);
    voz.dispatchEvent(new Event('ended'));
    expect(m.vozesAtivas.value).toBe(0);
    expect(duck.gain.alvo).toBe(1);
  });

  it('duas vozes seguidas: a música só volta quando as duas acabam', async () => {
    const m = await import('../src/core/som/mixer');
    m.liberar();
    const duck = criados[0]!.ganhos[2]!;
    const [a, b] = [new Audio(), new Audio()];
    m.acompanharVoz(a);
    m.acompanharVoz(b);
    a.dispatchEvent(new Event('play'));
    a.dispatchEvent(new Event('playing'));
    b.dispatchEvent(new Event('play'));
    expect(m.vozesAtivas.value).toBe(2);
    a.dispatchEvent(new Event('pause'));
    a.dispatchEvent(new Event('ended'));
    expect(duck.gain.alvo).toBeCloseTo(m.DUCK);
    b.dispatchEvent(new Event('ended'));
    expect(duck.gain.alvo).toBe(1);
  });

  it('a voz toca no volume de voz dos Ajustes, e fica muda com o som desligado', async () => {
    const m = await import('../src/core/som/mixer');
    const { app } = await import('../src/core/app');
    app.data.settings.volVoz = 0.4;
    const a = new Audio();
    m.acompanharVoz(a);
    expect(a.volume).toBeCloseTo(0.4);
    app.data.settings.sound = false;
    expect(m.volumeVoz()).toBe(0);
    app.data.settings.sound = true;
    app.data.settings.volVoz = 1;
  });

  it('trocar de clima faz crossfade: a trilha velha desce e a nova sobe', async () => {
    const m = await import('../src/core/som/mixer');
    m.liberar();
    const ac = criados[0]!;
    m.tocarClima('hub');
    await vi.waitFor(() => expect(ac.fontes).toHaveLength(1));
    const ganhoHub = ac.ganhos.at(-1)!;
    expect(ganhoHub.gain.alvo).toBe(1);
    m.tocarClima('acao');
    expect(ganhoHub.gain.alvo).toBe(0);
    await vi.waitFor(() => expect(ac.fontes).toHaveLength(2));
    expect(ac.ganhos.at(-1)!.gain.alvo).toBe(1);
  });
});

describe('voz e efeito nunca ao mesmo tempo (ritmo calmo)', () => {
  beforeEach(async () => {
    criados = [];
    duracaoFalsa = 0.3;
    vi.stubGlobal('AudioContext', ContextoFalso);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })),
    );
    (await import('../src/core/som/mixer'))._zerarParaTeste();
  });
  afterEach(async () => {
    (await import('../src/core/som/mixer'))._zerarParaTeste();
    vi.unstubAllGlobals();
  });

  const efeitosTocados = () => criados[0]!.fontes.filter((f) => !f.loop && f.start.mock.calls.length > 0);

  it('efeito pedido enquanto uma voz fala não toca', async () => {
    const m = await import('../src/core/som/mixer');
    m.liberar();
    const voz = new Audio();
    m.acompanharVoz(voz);
    voz.dispatchEvent(new Event('play'));
    m.tocarEfeito('acerto');
    m.tocarEfeito('captura');
    await new Promise((r) => setTimeout(r, 20));
    expect(efeitosTocados()).toHaveLength(0);
    voz.dispatchEvent(new Event('ended'));
    m.tocarEfeito('acerto');
    await vi.waitFor(() => expect(efeitosTocados()).toHaveLength(1));
  });

  it('a voz espera o efeito curto do acerto acabar antes de começar', async () => {
    const m = await import('../src/core/som/mixer');
    m.liberar();
    const ac = criados[0]!;
    m.tocarEfeito('acerto');
    let comecou = false;
    const espera = m.esperarEfeitos().then(() => (comecou = true));
    await vi.waitFor(() => expect(efeitosTocados()).toHaveLength(1));
    // Falta o efeito inteiro (0,3 s): a voz ainda não começou.
    expect(m.msAteEfeitosAcabarem()).toBeCloseTo(300);
    await new Promise((r) => setTimeout(r, 100));
    expect(comecou).toBe(false);
    ac.currentTime = 0.3;
    await espera;
    expect(comecou).toBe(true);
  });

  it('efeito longo não segura a voz: ela espera no máximo um instante e o efeito some quando ela começa', async () => {
    duracaoFalsa = 2.5;
    const m = await import('../src/core/som/mixer');
    m.liberar();
    m.tocarEfeito('vitoria');
    await vi.waitFor(() => expect(efeitosTocados()).toHaveLength(1));
    const t0 = Date.now();
    await m.esperarEfeitos();
    expect(Date.now() - t0).toBeLessThan(m.ESPERA_MAX_EFEITO_MS + 150);
    const voz = new Audio();
    m.acompanharVoz(voz);
    voz.dispatchEvent(new Event('play'));
    expect(efeitosTocados()[0]!.stop).toHaveBeenCalled();
    expect(m.msAteEfeitosAcabarem()).toBe(0);
  });

  it('sem efeito tocando, a voz não espera nada', async () => {
    const m = await import('../src/core/som/mixer');
    m.liberar();
    const t0 = Date.now();
    await m.esperarEfeitos();
    expect(Date.now() - t0).toBeLessThan(30);
  });
});
