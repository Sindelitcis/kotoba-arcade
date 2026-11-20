/**
 * A imagem de um kana: a letra no meio, como o objeto principal, e rabiscos simples em
 * volta contando a cena (o anzol de し tem a linha, o peixe e a onda).
 *
 * Traço de mangá em tinta; a cor de anime entra pelos preenchimentos conforme `--cor`
 * sobe (docs/estilo.md). Sem a letra (`letra={false}`), sobra a cena com um vazio
 * tracejado no meio: é a pergunta "que letra mora aqui?".
 *
 * A ilustração vem do estúdio de imagens (scripts/imagens/kana.json, docs/imagens.md):
 * uma por objeto, em mangá (`kana-tinta`) e em cor (`kana`). Objeto sem ilustração
 * aprovada cai nos rabiscos em SVG deste arquivo.
 */
import type { JSX } from 'preact';
import { imagemDoObjeto, kanaPorChar, type KanaItem, type Peca, type Rabisco } from '../../content/kana';

const COR = import.meta.glob<string>('../../assets/kana/*.webp', { eager: true, query: '?url', import: 'default' });
const TINTA = import.meta.glob<string>('../../assets/kana-tinta/*.webp', { eager: true, query: '?url', import: 'default' });

/** Ilustrações do estúdio para um objeto: mangá e cor. Nada se ainda não houver. */
export function ilustracao(objeto: string): { tinta: string; cor: string } | undefined {
  const id = imagemDoObjeto(objeto);
  const tinta = TINTA[`../../assets/kana-tinta/${id}.webp`];
  const cor = COR[`../../assets/kana/${id}.webp`];
  return tinta && cor ? { tinta, cor } : undefined;
}

/** A cena: a ilustração (o mangá por baixo, a cor aparecendo com `--cor`) ou os rabiscos. */
function Fundo({ objeto, pecas }: { objeto: string; pecas: readonly Peca[] }) {
  const il = ilustracao(objeto);
  if (!il) return <Pecas pecas={pecas} />;
  return (
    <>
      <image href={il.tinta} x="0" y="0" width="120" height="120" />
      <image class="ki-cor" href={il.cor} x="0" y="0" width="120" height="120" />
    </>
  );
}

const T = { stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' } as const;
/** Preenchimentos que pegam cor de anime (sakura, sora, yuuhi, midori, kin). */
const F = (c: 'a' | 'b' | 'c' | 'd' | 'e') => ({ ...T, class: `ki-f ki-${c}` });

/** Cada rabisco fica centrado em (0, 0), cabendo em uns 26 × 26. */
export const RABISCO: Record<Rabisco, () => JSX.Element> = {
  dente: () => <path {...F('b')} d="M-9-10c4-3 14-3 18 0 2 6 0 10-2 14l-2 9c-1 2-3 2-3 0l-2-7-2 7c0 2-2 2-3 0l-2-9c-2-4-4-8-2-14z" />,
  estrela: () => <path {...F('e')} d="M0-12 3.5-4 12-3.5 5.5 2 7.5 11 0 6.5-7.5 11-5.5 2-12-3.5-3.5-4z" />,
  clipe: () => <path {...T} d="M-4 10V-8a4 4 0 0 1 8 0v16a6 6 0 0 1-12 0V-6" transform="rotate(90)" />,
  lua: () => <path {...F('e')} d="M4-12A12 12 0 1 0 8 9 9 9 0 1 1 4-12z" />,
  som: () => (
    <g {...T}>
      <path d="M-6-8a12 12 0 0 1 0 16" />
      <path d="M0-12a18 18 0 0 1 0 24" />
      <path d="M6-15a22 22 0 0 1 0 30" />
    </g>
  ),
  grama: () => <path {...T} d="M-30 4h60M-24 4l-3-8M-22 4l2-9M-6 4l-2-7M-4 4l3-9M12 4l-2-8M14 4l3-7M26 4l2-6" />,
  fumaca: () => <path {...T} d="M-4 12c-6-6 6-8 0-14S4-10-2-14M5 12C0 7 10 4 5-2" />,
  cadeado: () => (
    <g>
      <path {...T} d="M-6-2v-6a6 6 0 0 1 12 0v6" />
      <rect {...F('c')} x="-10" y="-2" width="20" height="15" rx="2" />
      <circle cx="0" cy="5" r="2" fill="currentColor" />
    </g>
  ),
  casa: () => (
    <g>
      <path {...F('c')} d="M-11 12V-2L0-12 11-2v14z" />
      <rect {...T} x="-3" y="2" width="6" height="10" />
    </g>
  ),
  chama: () => <path {...F('c')} d="M0 12c-8 0-10-7-6-13 1 4 3 4 3 1C-3-5 1-8 0-13c6 4 10 11 7 19 2-1 3-3 3-5 2 6-2 11-10 11z" />,
  sol: () => (
    <g>
      <circle {...F('c')} r="7" />
      <path {...T} d="M0-11v-3M0 11v3M-11 0h-3M11 0h3M-8-8l-2-2M8 8l2 2M-8 8l-2 2M8-8l2-2" />
    </g>
  ),
  garrafa: () => <path {...F('d')} d="M-2-14h4v6c4 2 6 5 6 9v13h-16V1c0-4 2-7 6-9z" />,
  linha: () => <path {...T} d="M0 0v30" stroke-dasharray="1 0" />,
  peixe: () => (
    <g>
      <path {...F('b')} d="M-12 0c5-8 15-8 20 0-5 8-15 8-20 0zM8 0l7-6v12z" />
      <circle cx="-6" cy="-1" r="1.3" fill="currentColor" />
    </g>
  ),
  onda: () => <path {...T} d="M-40 0c5-5 10-5 15 0s10 5 15 0 10-5 15 0 10 5 15 0 10-5 15 0 10 5 15 0" />,
  copo: () => (
    <g>
      <path {...F('c')} d="M-9-10h18l-3 22h-12z" />
      <path {...T} d="M-6-3h12" />
    </g>
  ),
  flor: () => (
    <g>
      <path {...T} d="M0 2v12" />
      <circle {...F('a')} cx="0" cy="-8" r="4" />
      <circle {...F('a')} cx="-6" cy="-3" r="4" />
      <circle {...F('a')} cx="6" cy="-3" r="4" />
      <circle {...F('e')} cx="0" cy="-3" r="3" />
    </g>
  ),
  tigela: () => (
    <g>
      <path {...F('c')} d="M-16-4h32c0 10-7 16-16 16S-16 6-16-4z" />
      <path {...T} d="M-6 12h12" />
    </g>
  ),
  martelo: () => (
    <g transform="rotate(-30)">
      <rect {...F('c')} x="-10" y="-12" width="20" height="8" rx="1" />
      <path {...T} d="M0-4v18" />
    </g>
  ),
  gota: () => <path {...F('b')} d="M0-10C4-4 7 0 7 4a7 7 0 0 1-14 0c0-4 3-8 7-14z" />,
  aranha: () => (
    <g>
      <circle {...F('a')} r="5" />
      <path {...T} d="M-4-2l-8-5M-4 0h-9M-4 2l-8 5M4-2l8-5M4 0h9M4 2l8 5" />
    </g>
  ),
  ovo: () => <ellipse {...F('e')} rx="7" ry="9" />,
  nuvem: () => <path {...F('b')} d="M-14 6a6 6 0 0 1 1-12 8 8 0 0 1 15-3 7 7 0 0 1 12 6 5 5 0 0 1 0 9z" />,
  olho: () => (
    <g>
      <path {...T} d="M-10 0c5-7 15-7 20 0-5 7-15 7-20 0z" />
      <circle cx="0" cy="0" r="3" fill="currentColor" />
    </g>
  ),
  vela: () => (
    <g>
      <rect {...F('a')} x="-4" y="-4" width="8" height="18" />
      <path {...F('c')} d="M0-6c-3-3-2-6 0-9 2 3 3 6 0 9z" />
    </g>
  ),
  nota: () => (
    <g>
      <ellipse cx="-4" cy="8" rx="5" ry="4" fill="currentColor" />
      <path {...T} d="M1 8v-20l8 4" />
    </g>
  ),
  passaro: () => <path {...T} d="M-12 0c4-6 8-6 12 0 4-6 8-6 12 0" />,
  bola: () => (
    <g>
      <circle {...F('e')} r="9" />
      <path {...T} d="M-9 0h18M0-9c-4 5-4 13 0 18" />
    </g>
  ),
  coracao: () => <path {...F('a')} d="M0 10C-14 1-10-11 0-4 10-11 14 1 0 10z" />,
  pensamento: () => (
    <g>
      <path {...F('b')} d="M-10 0a6 6 0 0 1 4-10 8 8 0 0 1 13 0 6 6 0 0 1 3 10 6 6 0 0 1-10 3 7 7 0 0 1-10-3z" />
      <circle {...T} cx="-12" cy="10" r="2.5" />
      <circle {...T} cx="-17" cy="15" r="1.5" />
    </g>
  ),
  arvore: () => (
    <g>
      <path {...T} d="M0 2v12" />
      <circle {...F('d')} cx="0" cy="-5" r="10" />
    </g>
  ),
  seta: () => <path {...T} d="M0 10V-10M-6-4l6-6 6 6" />,
  agulha: () => (
    <g transform="rotate(35)">
      <path {...T} d="M0-14v26" />
      <ellipse {...T} cx="0" cy="-10" rx="1.5" ry="3" />
    </g>
  ),
  dado: () => (
    <g>
      <rect {...F('a')} x="-10" y="-10" width="20" height="20" rx="3" />
      <circle cx="-4" cy="-4" r="2" fill="currentColor" />
      <circle cx="4" cy="4" r="2" fill="currentColor" />
    </g>
  ),
  pedra: () => <path {...F('e')} d="M-12 8c-2-8 4-14 12-14s14 6 12 14z" />,
  antena: () => <path {...T} d="M0 12V-4M0-4l-10-10M0-4l10-10" />,
  barco: () => (
    <g>
      <path {...F('c')} d="M-14 2h28l-6 9h-16z" />
      <path {...T} d="M0 2v-16l9 12H0" />
    </g>
  ),
  raio: () => <path {...F('e')} d="M3-14-7 2h6l-3 12 10-16H0z" />,
  presente: () => (
    <g>
      <rect {...F('a')} x="-10" y="-6" width="20" height="16" />
      <path {...T} d="M0-6v16M-10 0h20M0-6c-4-6-9-3-6 0M0-6c4-6 9-3 6 0" />
    </g>
  ),
  pizza: () => (
    <g>
      <path {...F('c')} d="M-12-10h24L0 13z" />
      <circle cx="-3" cy="-4" r="2" fill="currentColor" />
      <circle cx="4" cy="-2" r="2" fill="currentColor" />
    </g>
  ),
  prateleira: () => <path {...T} d="M-12-8h24M-12 0h24M-12 8h24" />,
  geladeira: () => (
    <g>
      <rect {...F('b')} x="-9" y="-14" width="18" height="28" rx="2" />
      <path {...T} d="M-9-3h18M5-10v4M5 1v6" />
    </g>
  ),
  tapaolho: () => (
    <g>
      <path {...T} d="M-14-6 14 4" />
      <ellipse cx="0" cy="0" rx="6" ry="5" fill="currentColor" />
    </g>
  ),
  moeda: () => (
    <g>
      <circle {...F('e')} r="9" />
      <circle {...T} r="3" />
    </g>
  ),
  folha: () => <path {...F('d')} d="M-10 8C-10-4 0-10 10-10 10 2 2 10-10 8zM-10 8 4-4" />,
};

function Pecas({ pecas }: { pecas: readonly Peca[] }) {
  return (
    <>
      {pecas.map((p, i) => {
        const R = RABISCO[p.r];
        return (
          <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
            <R />
          </g>
        );
      })}
    </>
  );
}

/** Letra grande no meio. Kana de duas letras divide o espaço, a segunda pequena. */
function Letra({ char, tamanho = 64 }: { char: string; tamanho?: number }) {
  return (
    <text class="ki-letra" x="60" y="62" font-size={tamanho} text-anchor="middle" dominant-baseline="central" lang="ja">
      {char}
    </text>
  );
}

function Marca({ marca }: { marca: KanaItem['marca'] }) {
  if (marca === 'tenten') {
    // Os dois tracinhos viram duas faíscas de vibração no canto.
    return (
      <g class="ki-marca" {...T} stroke-width={4}>
        <path d="M92 6l4 12M104 4l4 12" />
      </g>
    );
  }
  if (marca === 'maru') {
    return <circle class="ki-marca" {...T} stroke-width={3.5} cx="102" cy="12" r="7" />;
  }
  return null;
}

export interface ImagemProps {
  item: KanaItem;
  /** Mostra a letra dentro da cena. Sem ela, fica o vazio tracejado. */
  letra?: boolean;
  class?: string;
  titulo?: string;
}

export function Imagem({ item, letra = true, class: cls = '', titulo }: ImagemProps) {
  const base = kanaPorChar(item.base);
  const mini = item.mini ? kanaPorChar(item.mini) : undefined;
  const encolhido = item.marca === 'encolhido';
  const cena = (
    <>
      <Fundo objeto={item.cena.objeto} pecas={item.cena.pecas} />
      {letra ? (
        // Combinado: a grande no meio e a pequena no canto. Encolhido (っ, ゃ): a cena da grande, pequena.
        <Letra char={mini ? ([...item.char][0] as string) : encolhido ? (base?.char ?? item.char) : item.char} />
      ) : (
        !ilustracao(item.cena.objeto) && <rect class="ki-vazio" x="30" y="30" width="60" height="62" rx="2" />
      )}
    </>
  );
  return (
    <svg
      class={`ki-img ${cls}`}
      viewBox="0 0 120 120"
      role="img"
      aria-label={titulo ?? (letra ? `${item.char}: ${item.cena.objeto}` : `cena: ${item.cena.objeto}`)}
      data-kana={item.char}
    >
      {encolhido ? <g transform="translate(30 30) scale(0.5)">{cena}</g> : cena}
      {!encolhido && <Marca marca={item.marca} />}
      {mini && (
        <g class="ki-mini" transform="translate(74 74) scale(0.38)">
          <rect x="0" y="0" width="120" height="120" class="ki-mini-fundo" />
          <Fundo objeto={mini.cena.objeto} pecas={mini.cena.pecas} />
          {letra && <Letra char={item.char.slice(1)} tamanho={78} />}
        </g>
      )}
    </svg>
  );
}
