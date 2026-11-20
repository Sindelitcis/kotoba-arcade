/**
 * Desenho dos kanji e das peças com os traços do KanjiVG (CC BY-SA 3.0).
 *
 * A fonte de pincel não tem as formas de radical (亻, 氵, 扌…), e o jogo precisa pintar cada
 * peça dentro do kanji. Os traços ficam em `tracos.json`, carregado só quando o jogo abre
 * (são uns 700 KB, que o resto do fliperama não precisa baixar).
 */
import { signal } from '@preact/signals';
import { useLayoutEffect, useRef } from 'preact/hooks';

export interface TracosKanji {
  d: string[];
  /** Peça → índices dos traços dela. */
  g: Record<string, number[]>;
}

export interface Tracos {
  kanji: Record<string, TracosKanji>;
  pecas: Record<string, { d: string[] }>;
}

export const tracos = signal<Tracos | null>(null);
let carregando: Promise<Tracos> | null = null;

export function carregarTracos(): Promise<Tracos> {
  carregando ??= import('./tracos.json').then((m) => {
    const t = (m as unknown as { default: Tracos }).default;
    tracos.value = t;
    return t;
  });
  return carregando;
}

/** Peças que o KanjiVG marca dentro do kanji (em qualquer nível). */
export function elementosDe(t: Tracos | null, kanji: string): string[] {
  return t ? Object.keys(t.kanji[kanji]?.g ?? {}) : [];
}

/** Cores das peças, na ordem: a paleta de anime do guia de estilo. */
export const CORES_PECA = ['var(--sora)', 'var(--sakura)', 'var(--midori)', 'var(--yuuhi)'];

interface KanjiProps {
  kanji: string;
  /** Peças pintadas, cada uma com a cor da posição dela. */
  pintar?: readonly string[];
  class?: string;
}

/** O kanji traço a traço. Sem os traços carregados, mostra o caractere na fonte. */
export function KanjiDesenho({ kanji, pintar = [], class: cls = '' }: KanjiProps) {
  const t = tracos.value?.kanji[kanji];
  if (!t) {
    return (
      <span class={`pc-kanji-texto ${cls}`} lang="ja">
        {kanji}
      </span>
    );
  }
  const corDe = new Map<number, string>();
  pintar.forEach((p, i) => {
    for (const idx of t.g[p] ?? []) if (!corDe.has(idx)) corDe.set(idx, CORES_PECA[i % CORES_PECA.length] as string);
  });
  return (
    <svg class={`pc-kanji ${cls}`} viewBox="0 0 109 109" role="img" aria-label={kanji} data-kanji={kanji}>
      {t.d.map((d, i) => (
        <path key={i} d={d} class={corDe.has(i) ? 'pc-traco pintado' : 'pc-traco'} style={corDe.has(i) ? { stroke: corDe.get(i) } : undefined} />
      ))}
    </svg>
  );
}

/** Uma peça sozinha, com o quadro cortado em volta do desenho. */
export function PecaDesenho({ peca, cor }: { peca: string; cor?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const d = tracos.value?.pecas[peca]?.d;
  useLayoutEffect(() => {
    const svg = ref.current;
    if (!svg || typeof svg.getBBox !== 'function') return;
    try {
      const b = svg.getBBox();
      if (b.width > 0 && b.height > 0) {
        const lado = Math.max(b.width, b.height) + 16;
        svg.setAttribute('viewBox', `${b.x + b.width / 2 - lado / 2} ${b.y + b.height / 2 - lado / 2} ${lado} ${lado}`);
      }
    } catch {
      // Sem layout (teste), fica o quadro inteiro.
    }
  }, [peca, d]);
  if (!d) {
    return (
      <span class="pc-peca-texto" lang="ja">
        {peca}
      </span>
    );
  }
  return (
    <svg ref={ref} class="pc-peca-svg" viewBox="0 0 109 109" role="img" aria-label={peca} data-peca={peca}>
      {d.map((x, i) => (
        <path key={i} d={x} class="pc-traco" style={cor ? { stroke: cor } : undefined} />
      ))}
    </svg>
  );
}
