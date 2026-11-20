/**
 * Dados do Kanji em peças: o conteúdo escrito à mão confere com os dados abertos
 * (recorte.json e tracos.json, gerados por scripts/pecas-dados.py).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KANJI } from '../src/content';
import { LEITURAS } from '../src/content/leituras';
import { KANJI_PECAS, PARECIDOS, PECAS_LISTA, peca } from '../src/games/pecas/dados';
import { pecasDoKanji } from '../src/games/pecas/engine';
import recorte from '../src/games/pecas/recorte.json';
import tracos from '../src/games/pecas/tracos.json';

interface Recorte {
  kanji: Record<string, { nivel: string; on: string[]; kun: string[]; tracos: number; krad: string[] }>;
  palavras: Record<string, { kana: string[]; comum: boolean }>;
}
interface Tracos {
  kanji: Record<string, { d: string[]; g: Record<string, number[]> }>;
  pecas: Record<string, { d: string[] }>;
}
const FONTES = join(__dirname, '..', 'src', 'assets', 'fontes');
const R = recorte as unknown as Recorte;
const T = tracos as unknown as Tracos;

const hira = (s: string) => [...s].map((c) => (c >= 'ァ' && c <= 'ヶ' ? String.fromCharCode(c.charCodeAt(0) - 0x60) : c)).join('');

/** Leituras do KANJIDIC2 sem marcas: やす.む vale やす e やすむ; -か vale か. */
function leiturasDe(k: string): Set<string> {
  const r = R.kanji[k];
  const out = new Set<string>();
  for (const on of r?.on ?? []) out.add(hira(on).replace(/-/g, ''));
  for (const kun of r?.kun ?? []) {
    const limpo = kun.replace(/-/g, '');
    out.add(limpo.replace('.', ''));
    out.add(limpo.split('.')[0] as string);
  }
  return out;
}

describe('lista de kanji', () => {
  it('cobre o N5, o N4 e o N3 inteiros, sem repetir', () => {
    const nossos = KANJI_PECAS.map((k) => k.kanji);
    expect(new Set(nossos).size).toBe(nossos.length);
    for (const nivel of ['N5', 'N4', 'N3']) {
      const oficiais = Object.entries(R.kanji)
        .filter(([, v]) => v.nivel === nivel)
        .map(([k]) => k)
        .sort();
      const daqui = KANJI_PECAS.filter((k) => k.nivel === nivel)
        .map((k) => k.kanji)
        .sort();
      expect(daqui, nivel).toEqual(oficiais);
    }
    // 612 do N5 ao N3, mais 士 (N1), par de 土 no modo intruso.
    expect(KANJI_PECAS.filter((k) => k.nivel !== 'N1').length).toBe(612);
    expect(KANJI_PECAS.filter((k) => k.nivel === 'N1').map((k) => k.kanji)).toEqual(['士']);
  });

  it('inclui os 94 kanji que já existiam no arcade', () => {
    const nossos = new Set(KANJI_PECAS.map((k) => k.kanji));
    expect(KANJI.filter((k) => !nossos.has(k.kanji)).map((k) => k.kanji)).toEqual([]);
  });

  it('o N2 já está no recorte, no mesmo formato, pronto para ganhar conteúdo', () => {
    const n2 = Object.values(R.kanji).filter((v) => v.nivel === 'N2');
    expect(n2.length).toBe(367);
    for (const v of n2) expect(v.tracos).toBeGreaterThan(0);
  });

  it('todo kanji tem peças, leitura, significado, palavra e historinha', () => {
    for (const k of KANJI_PECAS) {
      expect(k.pecas.length, k.kanji).toBeGreaterThan(0);
      expect(k.leitura, k.kanji).toMatch(/^[ぁ-ゖー]+$/);
      expect(k.pt.every((s) => s.length > 0), k.kanji).toBe(true);
      expect(k.palavra.jp, k.kanji).toContain(k.kanji);
      expect(k.palavra.kana, k.kanji).toMatch(/^[ぁ-ゖァ-ヺー]+$/);
      expect(k.palavra.pt.length, k.kanji).toBeGreaterThan(0);
      expect(k.historia.length, k.kanji).toBeGreaterThan(10);
      expect(k.historia.length, k.kanji).toBeLessThan(170);
    }
  });
});

describe('peças', () => {
  it('nenhuma peça sem nome nem imagem, e nenhum nome sobrando', () => {
    const usadas = new Set(KANJI_PECAS.flatMap((k) => k.pecas));
    const comNome = PECAS_LISTA.map((p) => p.peca);
    expect(new Set(comNome).size).toBe(comNome.length);
    expect([...usadas].filter((p) => !comNome.includes(p))).toEqual([]);
    expect(comNome.filter((p) => !usadas.has(p))).toEqual([]);
    for (const p of PECAS_LISTA) {
      expect(p.nome.length, p.peca).toBeGreaterThan(1);
      expect(p.nome.length, p.peca).toBeLessThan(26);
      expect(p.imagem, p.peca).toMatch(/\p{Extended_Pictographic}|[0-9]️?⃣|〰/u);
    }
  });

  it('toda peça está no kanji segundo o KanjiVG, e tem desenho próprio', () => {
    for (const k of KANJI_PECAS) {
      const t = T.kanji[k.kanji];
      expect(t, k.kanji).toBeDefined();
      for (const p of pecasDoKanji(k)) expect(t!.g[p], `${k.kanji}: ${p}`).toBeDefined();
    }
    for (const p of PECAS_LISTA) expect(T.pecas[p.peca]?.d.length, p.peca).toBeGreaterThan(0);
  });

  it('o que a historinha põe entre parênteses é peça do próprio kanji', () => {
    // Uma historinha que cita (木) num kanji sem 木 ensinaria uma peça que não está lá.
    for (const k of KANJI_PECAS) {
      const dentro = new Set([...k.pecas, ...Object.keys(T.kanji[k.kanji]?.g ?? {})]);
      for (const m of k.historia.matchAll(/\(([^)]+)\)/g)) {
        for (const c of m[1] as string) if (/\p{Script=Han}|[⺀-⻳]/u.test(c)) expect(dentro.has(c), `${k.kanji}: (${c})`).toBe(true);
      }
    }
  });

  it('kanji desenhado de uma coisa só usa ele mesmo como peça, e essa peça tem nome', () => {
    for (const k of KANJI_PECAS.filter((x) => pecasDoKanji(x).length === 0)) {
      expect(k.pecas, k.kanji).toEqual([k.kanji]);
      expect(peca(k.kanji).nome.length).toBeGreaterThan(1);
    }
  });
});

describe('leituras e palavras', () => {
  it('a leitura é uma leitura de verdade do kanji (KANJIDIC2)', () => {
    for (const k of KANJI_PECAS) expect(leiturasDe(k.kanji).has(k.leitura), `${k.kanji} ${k.leitura}`).toBe(true);
  });

  it('para os 94 kanji antigos, a leitura é a mesma conferida em leituras.ts', () => {
    for (const k of KANJI_PECAS) if (LEITURAS[k.kanji]) expect(k.leitura, k.kanji).toBe(LEITURAS[k.kanji]!.sozinho);
  });

  it('kanji que é palavra sozinho se lê como a palavra', () => {
    // Regra de leituras.ts: 他 sozinho é ほか, não た.
    for (const k of KANJI_PECAS) if (k.palavra.jp === k.kanji) expect(k.palavra.kana, k.kanji).toBe(k.leitura);
  });

  it('toda palavra de exemplo existe no JMdict com essa leitura e é de uso comum', () => {
    for (const k of KANJI_PECAS) {
      const p = R.palavras[k.palavra.jp];
      expect(p?.kana, k.palavra.jp).toContain(k.palavra.kana);
      const semCortesia = k.palavra.jp.replace(/^[おご]|さん$/g, '');
      expect(p!.comum || !!R.palavras[semCortesia]?.comum, k.palavra.jp).toBe(true);
    }
  });
});

describe('kanji parecidos', () => {
  it('os dois kanji de cada par estão no jogo, são diferentes e têm explicação', () => {
    const nossos = new Set(KANJI_PECAS.map((k) => k.kanji));
    for (const p of PARECIDOS) {
      expect(nossos.has(p.a) && nossos.has(p.b), `${p.a}/${p.b}`).toBe(true);
      expect(p.a).not.toBe(p.b);
      expect(p.diferenca.length).toBeGreaterThan(10);
    }
    expect(PARECIDOS.length).toBeGreaterThanOrEqual(40);
  });
});

describe('fonte de pincel', () => {
  it('todo kanji do jogo está no recorte comum ou no recorte só do Kanji em peças, e o CSS liga o segundo', () => {
    // Os kanji novos ficam num arquivo de fonte à parte (unicode-range), para o resto do fliperama não baixar.
    const base = new Set(readFileSync(join(FONTES, 'caracteres.txt'), 'utf-8'));
    const css = readFileSync(join(FONTES, 'pecas.css'), 'utf-8');
    const faixa = new Set([...css.matchAll(/U\+([0-9A-F]+)/g)].map((m) => String.fromCodePoint(parseInt(m[1] as string, 16))));
    const extra = readFileSync(join(FONTES, 'caracteres-pecas.txt'), 'utf-8');
    for (const c of extra) expect(faixa.has(c), c).toBe(true);
    for (const k of KANJI_PECAS) expect(base.has(k.kanji) || faixa.has(k.kanji), k.kanji).toBe(true);
  });
});
