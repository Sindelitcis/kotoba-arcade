import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app, commit } from '../src/core/app';
import { CENA_AVENTURA, CENA_CONVERSA, NOMES_CENAS, NOMES_PESSOAS, cenaStyle, cenaUrl, pessoaUrl } from '../src/core/arte';
import { aplicarTema, atributoDoTema } from '../src/core/tema';
import { yo } from '../src/core/audio';
import { onomato, SFX_WORDS } from '../src/core/fx';
import { SCENES, SPEAKERS } from '../src/games/aventura/cenas';
import { CENAS } from '../src/games/conversa/engine';

const SRC = join(__dirname, '..', 'src');

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivos(join(dir, e.name)) : [join(dir, e.name)]));
}

describe('fontes recortadas', () => {
  it('todo caractere japonês do código e do conteúdo está no recorte das fontes', () => {
    // Kanji novo no conteúdo sem rodar scripts/recortar-fontes.py sairia na fonte do sistema, fora do estilo.
    const recorte = new Set(readFileSync(join(SRC, 'assets/fontes/caracteres.txt'), 'utf-8'));
    const faltando = new Set<string>();
    for (const f of arquivos(SRC).filter((f) => /\.(tsx?|json)$/.test(f))) {
      for (const c of readFileSync(f, 'utf-8')) if (c.codePointAt(0)! >= 0x3000 && !recorte.has(c)) faltando.add(c);
    }
    expect([...faltando].join('')).toBe('');
  });

  it('as fontes extras do Kanji em peças têm o mesmo peso da fonte principal', () => {
    // Com peso diferente o navegador escolhia a face das peças pelo peso, via que 言葉 não estava no
    // unicode-range dela e desenhava o kanji do fliperama na fonte do sistema.
    const faces = (css: string) =>
      [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => ({
        familia: /font-family:\s*'([^']+)'/.exec(m[1]!)![1],
        peso: /font-weight:\s*([^;]+);/.exec(m[1]!)![1]!.trim(),
      }));
    const principais = faces(readFileSync(join(SRC, 'styles.css'), 'utf8'));
    const pecas = faces(readFileSync(join(SRC, 'assets', 'fontes', 'pecas.css'), 'utf8'));
    expect(pecas.length).toBeGreaterThan(0);
    for (const f of pecas) expect(principais, `${f.familia} ${f.peso}`).toContainEqual(f);
  });

  it('as onomatopeias usam só katakana que está no recorte', () => {
    const recorte = new Set(readFileSync(join(SRC, 'assets/fontes/caracteres.txt'), 'utf-8'));
    for (const w of Object.values(SFX_WORDS)) for (const c of w) expect(recorte.has(c), `${w}: ${c}`).toBe(true);
  });
});

describe('cenários e personagens', () => {
  it('toda imagem nomeada existe em src/assets, e nenhuma sobra sem nome', () => {
    for (const n of NOMES_CENAS) expect(cenaUrl(n), n).toBeDefined();
    for (const n of NOMES_PESSOAS) expect(pessoaUrl(n), n).toBeDefined();
    const cenas = readdirSync(join(SRC, 'assets/cenas-cor')).map((f) => f.replace('.webp', ''));
    const pessoas = readdirSync(join(SRC, 'assets/pessoas-cor')).map((f) => f.replace('.webp', ''));
    expect(cenas.sort()).toEqual([...NOMES_CENAS].sort());
    expect(pessoas.sort()).toEqual([...NOMES_PESSOAS].sort());
  });

  it('nenhuma imagem passa de 160 KB', () => {
    for (const dir of ['cenas-cor', 'pessoas-cor']) {
      for (const f of arquivos(join(SRC, 'assets', dir))) expect(readFileSync(f).length, f).toBeLessThan(160 * 1024);
    }
  });

  it('cada cena da Aventura tem cenário e cada personagem que fala tem retrato', () => {
    for (const s of SCENES) expect(CENA_AVENTURA[s.id], s.id).toBeDefined();
    // O aviso da estação é só voz no alto-falante: não tem rosto.
    for (const id of Object.keys(SPEAKERS).filter((id) => id !== 'aviso')) expect(pessoaUrl(id), id).toBeDefined();
  });

  it('cada situação da Conversa tem cenário e personagem', () => {
    for (const c of CENAS) {
      const arte = CENA_CONVERSA[c.id];
      expect(arte, c.id).toBeDefined();
      expect(cenaStyle(arte!.cena)['--cena']).toMatch(/^url\(/);
      expect(pessoaUrl(arte!.pessoa)).toBeDefined();
    }
  });

  it('sem cenário, o quadro fica sem fundo em vez de quebrar', () => {
    expect(cenaStyle(undefined)).toEqual({});
  });
});

describe('sons', () => {
  it('a escala yo não tem semitom e sobe uma oitava a cada cinco notas', () => {
    for (let i = 0; i < 14; i++) {
      const semis = 12 * Math.log2(yo(i + 1) / yo(i));
      expect(semis).toBeGreaterThanOrEqual(1.99);
    }
    expect(yo(5) / yo(0)).toBeCloseTo(2);
  });
});

describe('onomatopeia e modo calmo', () => {
  afterEach(() => {
    vi.useRealTimers();
    app.data.settings.calm = false;
    commit();
    document.body.innerHTML = '';
  });

  it('carimba a palavra perto do elemento e some sozinha', () => {
    vi.useFakeTimers();
    const alvo = document.createElement('div');
    document.body.appendChild(alvo);
    const el = onomato('acerto', alvo, 'bom');
    expect(el?.textContent).toBe('ドン');
    expect(el?.classList.contains('c-bom')).toBe(true);
    expect(document.querySelectorAll('.onomato')).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(document.querySelectorAll('.onomato')).toHaveLength(0);
  });

  it('sem elemento não faz nada', () => {
    expect(onomato('erro', null)).toBeNull();
  });

  it('no modo calmo a onomatopeia sai menor e sem giro, e a página ganha o atributo que corta o tremor', () => {
    app.data.settings.calm = true;
    commit();
    expect(document.documentElement.hasAttribute('data-calma')).toBe(true);
    const alvo = document.createElement('div');
    document.body.appendChild(alvo);
    const el = onomato('erro', alvo)!;
    expect(el.classList.contains('quiet')).toBe(true);
    expect(el.style.getPropertyValue('--rot')).toBe('0deg');
    app.data.settings.calm = false;
    commit();
    expect(document.documentElement.hasAttribute('data-calma')).toBe(false);
  });
});

describe('tema claro e escuro', () => {
  afterEach(() => {
    app.data.settings.tema = 'auto';
    commit();
  });

  it('automático deixa o sistema decidir; claro e escuro fixam o atributo na raiz', () => {
    expect(atributoDoTema('auto')).toBeNull();
    app.data.settings.tema = 'escuro';
    commit();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    app.data.settings.tema = 'claro';
    commit();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    app.data.settings.tema = 'auto';
    commit();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('a barra do navegador acompanha o tema', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
    aplicarTema('escuro');
    expect(meta.content).toBe('#0d1220');
    aplicarTema('claro');
    expect(meta.content).toBe('#f3f6fb');
    meta.remove();
  });

  it('o tema escuro redefine todos os tokens de cor do claro', () => {
    // Token esquecido no escuro deixaria texto claro sobre fundo claro.
    const css = readFileSync(join(SRC, 'styles.css'), 'utf-8');
    const bloco = (inicio: string) => {
      const i = css.indexOf(inicio);
      return css.slice(i, css.indexOf('}', i));
    };
    const cores = (b: string) => new Set([...b.matchAll(/(--[a-z0-9-]+):\s*#/g)].map((m) => m[1]));
    const claro = cores(bloco(':root {'));
    const escuro = cores(bloco(":root[data-theme='dark'] {"));
    const sistema = cores(bloco(":root:not([data-theme='light']) {"));
    expect([...claro].filter((t) => !escuro.has(t))).toEqual([]);
    expect([...escuro].sort()).toEqual([...sistema].sort());
  });
});

describe('modo calmo', () => {
  it('toda animação sem fim tem uma regra do modo calmo que a para', () => {
    // As dicas tracejadas, o "pensando" e o microfone da Conversa continuavam piscando com o modo calmo ligado.
    const css = readFileSync(join(SRC, 'styles.css'), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
    const calmas = [...css.matchAll(/([^{}]*\[data-calma\][^{}]*)\{[^}]*animation:\s*none/g)].map((m) => m[1] as string).join(',');
    const soltas: string[] = [];
    for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const seletor = (m[1] as string).trim();
      if (!/animation:[^;]*infinite/.test(m[2] as string) || seletor.startsWith('@') || seletor.includes('[data-calma]')) continue;
      for (const s of seletor.split(',').map((x) => x.trim())) {
        if (/::?(before|after)\b/.test(s)) continue; // [data-calma] *::before, *::after
        if (!calmas.includes(`[data-calma] ${s}`)) soltas.push(s);
      }
    }
    expect(soltas).toEqual([]);
  });
});
