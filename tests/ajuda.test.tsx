import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { AJUDA, rotuloTeclas, SECOES, telaUsaF1 } from '../src/content/ajuda';
import { ANTES_DE_COBRAR, TECLAS_APRESENTA } from '../src/content/ajuda/comum';
import { abrirAjuda, ajudaAberta, fecharAjuda, secaoAjuda, teclaDeAjuda, useAoAbrirAjuda, type TelaAjuda } from '../src/core/help/ajuda';
import { HelpButton } from '../src/core/help/HelpButton';

const ler = (arquivo: string) => readFileSync(resolve('src', arquivo), 'utf8');

/** O código da tela e, se ela usa a apresentação de coisa nova, o teclado dela também. */
function teclado(arquivo: string): string {
  const fonte = ler(arquivo);
  return /from '(?:\.\.\/)+core\/Apresentacao'/.test(fonte) ? `${fonte}
${ler('core/Apresentacao.tsx')}` : fonte;
}

/** Arquivo onde mora o teclado de cada tela. */
const FONTE: Record<TelaAjuda, string> = {
  hub: 'hub/Hub.tsx',
  ajustes: 'hub/Hub.tsx',
  kanjimon: 'games/kanjimon/KanjiMonGame.tsx',
  kanjidex: 'games/kanjimon/Dex.tsx',
  booster: 'games/kanjimon/Booster.tsx',
  kanabeat: 'games/kanabeat/KanaBeatGame.tsx',
  roguelike: 'games/roguelike/RoguelikeGame.tsx',
  aventura: 'games/aventura/AventuraGame.tsx',
  conversa: 'games/conversa/ConversaGame.tsx',
  gramatica: 'games/gramatica/GramaticaGame.tsx',
  jornada: 'jornada/JornadaTela.tsx',
  licao: 'jornada/LicaoTela.tsx',
  pecas: 'games/pecas/PecasGame.tsx',
  kanaimagens: 'games/kanaimagens/KanaImagensGame.tsx',
  memoria: 'games/memoria/MemoriaGame.tsx',
  cena: 'games/cena/CenaGame.tsx',
  ouvir: 'ouvir/OuvirTela.tsx',
};

const NOMES: Record<string, string> = { Esc: 'Escape', Espaço: ' ', '↑': 'ArrowUp', '↓': 'ArrowDown', '←': 'ArrowLeft', '→': 'ArrowRight' };

/** Faixas de dígito que o código aceita, tiradas de regex como /^[1-4]$/. */
function faixas(fonte: string): Array<[number, number]> {
  return [...fonte.matchAll(/\[(\d)-(\d)\]/g)].map((m) => [Number(m[1]), Number(m[2])]);
}

/** A tecla, do jeito que aparece na ajuda, existe no código da tela? */
function existe(tecla: string, fonte: string): boolean {
  if (tecla === 'A–Z') return fonte.includes('a-zA-Z');
  if (/^\d$/.test(tecla)) {
    const n = Number(tecla);
    return fonte.includes(`'${tecla}'`) || faixas(fonte).some(([a, b]) => n >= a && n <= b);
  }
  if (/^[A-Z]$/.test(tecla)) return fonte.includes(`toLowerCase() === '${tecla.toLowerCase()}'`) || fonte.includes(`key === '${tecla.toLowerCase()}'`);
  return fonte.includes(`'${NOMES[tecla] ?? tecla}'`);
}

/** Teclas que o código compara por nome (`e.key === 'Enter'`, `tecla === 'Escape'`, `key === 'd'`...). */
function teclasNoCodigo(fonte: string): string[] {
  return [...fonte.matchAll(/(?:\be\.key|\btecla|\bkey)(?:\.toLowerCase\(\))? [!=]== '([^']+)'/g)].map((m) => m[1] as string);
}

function comoNaAjuda(tecla: string): string {
  const nome = Object.entries(NOMES).find(([, v]) => v === tecla)?.[0];
  if (nome) return nome;
  return /^[a-z]$/.test(tecla) ? tecla.toUpperCase() : tecla;
}

describe('conteúdo da ajuda', () => {
  it('toda tela do fliperama tem ajuda, e os Ajustes também', () => {
    const main = ler('main.tsx');
    const telas = new Set(['hub', 'ajustes', ...[...main.matchAll(/case '(\w+)':/g)].map((m) => m[1] as string)]);
    expect(new Set(Object.keys(AJUDA))).toEqual(telas);
    for (const [tela, a] of Object.entries(AJUDA)) expect(a.tela).toBe(tela);
  });

  it('toda tela tem as seis seções preenchidas', () => {
    expect(SECOES.map((s) => s.id)).toEqual(['objetivo', 'passos', 'teclas', 'tela', 'ensina', 'perguntas']);
    for (const a of Object.values(AJUDA)) {
      expect(a.titulo, a.tela).not.toBe('');
      expect(a.objetivo.length, a.tela).toBeGreaterThan(0);
      expect(a.passos.length, a.tela).toBeGreaterThan(0);
      expect(a.teclas.length, a.tela).toBeGreaterThan(0);
      expect(a.elementos.length, a.tela).toBeGreaterThan(0);
      expect(a.ensina.length, a.tela).toBeGreaterThan(0);
      expect(a.perguntas.length, a.tela).toBeGreaterThan(0);
      for (const t of [...a.objetivo, ...a.passos, ...a.ensina, ...a.elementos.map((e) => e.texto), ...a.perguntas.map((q) => q.r)]) {
        expect(t.trim(), a.tela).not.toBe('');
      }
    }
  });

  it('toda tecla citada na ajuda existe no código da tela', () => {
    for (const a of Object.values(AJUDA)) {
      const fonte = teclado(FONTE[a.tela]);
      for (const linha of a.teclas) for (const t of linha.teclas) expect(existe(t, fonte), `${a.tela}: ${t}`).toBe(true);
    }
  });

  it('toda tecla que o jogo trata por nome está na ajuda', () => {
    const porArquivo = new Map<string, Set<string>>();
    for (const a of Object.values(AJUDA)) {
      const citadas = porArquivo.get(FONTE[a.tela]) ?? new Set<string>();
      for (const l of a.teclas) for (const t of l.teclas) citadas.add(t);
      porArquivo.set(FONTE[a.tela], citadas);
    }
    for (const [arquivo, citadas] of porArquivo) {
      expect(teclasNoCodigo(ler(arquivo)).length, arquivo).toBeGreaterThan(0);
      for (const t of teclasNoCodigo(ler(arquivo))) expect(citadas.has(comoNaAjuda(t)), `${arquivo}: ${t}`).toBe(true);
    }
  });

  it('toda tela com apresentação de coisa nova explica as teclas dela e por que ela vem antes', () => {
    const comApresentacao = Object.values(AJUDA).filter((a) => teclado(FONTE[a.tela]) !== ler(FONTE[a.tela]));
    expect(comApresentacao.map((a) => a.tela).sort()).toEqual(['aventura', 'cena', 'conversa', 'gramatica', 'kanabeat', 'kanaimagens', 'kanjimon', 'memoria', 'pecas', 'roguelike']);
    for (const a of comApresentacao) {
      expect(a.teclas, a.tela).toContain(TECLAS_APRESENTA);
      expect(a.perguntas, a.tela).toContain(ANTES_DE_COBRAR);
    }
  });

  it('nenhum jogo usa a tecla ?, que é da ajuda', () => {
    for (const a of Object.values(AJUDA)) {
      expect(a.teclas.flatMap((l) => l.teclas)).not.toContain('?');
      expect(teclasNoCodigo(ler(FONTE[a.tela]))).not.toContain('?');
    }
  });

  it('só a Conversa usa a F1; lá ela continua traduzindo', () => {
    expect((Object.keys(AJUDA) as TelaAjuda[]).filter(telaUsaF1)).toEqual(['conversa']);
  });

  it('números seguidos aparecem como faixa', () => {
    expect(rotuloTeclas(['1', '2', '3', '4'])).toEqual(['1–4']);
    expect(rotuloTeclas(['1', '2'])).toEqual(['1', '2']);
    expect(rotuloTeclas(['0', 'P'])).toEqual(['0', 'P']);
  });
});

describe('tecla que abre a ajuda', () => {
  const ev = (key: string, target: EventTarget | null = document.body, extra: Partial<KeyboardEvent> = {}) => ({ key, target, ctrlKey: false, altKey: false, metaKey: false, ...extra });

  it('? abre fora de campo de texto e é texto dentro dele', () => {
    expect(teclaDeAjuda(ev('?'), false)).toBe(true);
    const campo = document.createElement('input');
    expect(teclaDeAjuda(ev('?', campo), false)).toBe(false);
    const caixa = document.createElement('input');
    caixa.type = 'checkbox';
    expect(teclaDeAjuda(ev('?', caixa), false)).toBe(true);
  });

  it('F1 abre, menos onde a tela já usa a F1', () => {
    expect(teclaDeAjuda(ev('F1'), false)).toBe(true);
    expect(teclaDeAjuda(ev('F1'), true)).toBe(false);
  });

  it('com Ctrl, Alt ou Cmd não abre', () => {
    expect(teclaDeAjuda(ev('?', document.body, { ctrlKey: true }), false)).toBe(false);
    expect(teclaDeAjuda(ev('F1', document.body, { altKey: true }), false)).toBe(false);
  });
});

describe('painel de ajuda', () => {
  let raiz: HTMLElement;
  const press = (key: string): void => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  };

  afterEach(async () => {
    await act(() => fecharAjuda());
    await act(() => render(null, raiz));
    raiz.remove();
  });

  async function montar(tela: TelaAjuda, filho?: preact.ComponentChildren) {
    raiz = document.createElement('div');
    raiz.id = 'app';
    document.body.append(raiz);
    await act(() =>
      render(
        <>
          {filho}
          <HelpButton tela={tela} />
        </>,
        raiz,
      ),
    );
  }

  it('nada abre sozinho', async () => {
    await montar('kanjimon');
    expect(ajudaAberta.value).toBe(false);
    expect(document.querySelector('[data-testid="ajuda"]')).toBeNull();
  });

  it('? abre, Esc fecha, e nenhuma das duas chega ao jogo', async () => {
    const recebidas: string[] = [];
    const jogo = (e: KeyboardEvent) => recebidas.push(e.key);
    addEventListener('keydown', jogo);
    try {
      await montar('kanjimon');
      await act(() => press('?'));
      expect(ajudaAberta.value).toBe(true);
      expect(document.querySelector('[data-testid="ajuda"] h2')?.textContent).toBe('KanjiMon');
      await act(() => {
        press('Enter');
        press('1');
        press('Escape');
      });
      expect(ajudaAberta.value).toBe(false);
      expect(recebidas).toEqual([]);
      press('Enter');
      expect(recebidas).toEqual(['Enter']);
    } finally {
      removeEventListener('keydown', jogo);
    }
  });

  it('com o IME japonês ligado: ？ de largura dupla abre, e o Esc que chega como Process fecha', async () => {
    await montar('kanjimon');
    await act(() => press('？'));
    expect(ajudaAberta.value).toBe(true);
    await act(() => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Process', code: 'Escape', keyCode: 229, bubbles: true, cancelable: true }));
    });
    expect(ajudaAberta.value).toBe(false);
  });

  it('números trocam a seção enquanto o painel está aberto', async () => {
    await montar('roguelike');
    await act(() => abrirAjuda());
    await act(() => press('3'));
    expect(secaoAjuda.value).toBe(2);
    expect(document.querySelector('.ajuda-secao')?.textContent).toBe('Teclas');
  });

  it('clique fora fecha', async () => {
    await montar('aventura');
    await act(() => abrirAjuda());
    await act(() => (document.querySelector('[data-testid="ajuda"]') as HTMLElement).click());
    expect(ajudaAberta.value).toBe(false);
  });

  it('na Conversa a F1 não abre a ajuda: ela é da tradução', async () => {
    const recebidas: string[] = [];
    const jogo = (e: KeyboardEvent) => recebidas.push(e.key);
    addEventListener('keydown', jogo);
    try {
      await montar('conversa');
      await act(() => press('F1'));
      expect(ajudaAberta.value).toBe(false);
      expect(recebidas).toEqual(['F1']);
    } finally {
      removeEventListener('keydown', jogo);
    }
  });

  it('jogo com tempo correndo fica sabendo quando a ajuda abre', async () => {
    let pausas = 0;
    function Jogo() {
      useAoAbrirAjuda(() => pausas++);
      return null;
    }
    await montar('kanabeat', <Jogo />);
    await act(() => press('F1'));
    expect(pausas).toBe(1);
  });

  it('o resto da tela fica inerte com o painel aberto', async () => {
    await montar('hub');
    await act(() => abrirAjuda());
    expect(raiz.hasAttribute('inert')).toBe(true);
    await act(() => fecharAjuda());
    expect(raiz.hasAttribute('inert')).toBe(false);
  });
});
