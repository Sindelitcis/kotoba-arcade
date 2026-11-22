/**
 * A apresentação de itens novos, igual em todos os jogos (core/ensino.ts).
 *
 * Um item por vez, sem pergunta e sem relógio: imagem, a escrita grande com a leitura, o
 * japonês falado, o significado em português (também falado), uma
 * explicação curta e um exemplo. No fim, o botão leva à prática.
 *
 * Teclas (ficam só aqui; a ajuda de cada jogo cita estas):
 *   Enter, Espaço, →   próximo (no último, começar a prática)
 *   ←                  voltar um
 *   R                  ouvir de novo
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { ItemNovo } from '../content/ensino';
import { useAprofundar } from './aprofundar/estado';
import { fichaDe } from '../content/aprofundar/fichas';
import { camadaAberta } from './help/ajuda';
import { Icone } from './Icone';
import { tocarSequencia, type Tocador } from './sequencia';
import { teclaDe } from './teclas';
import { Furigana } from './Furigana';

export interface PropsApresentacao {
  itens: readonly ItemNovo[];
  /** Chamado no fim (ou no Esc, se o jogo deixar). */
  onFim: () => void;
  /** "novos": primeira vez. "de-novo": errou na prática e o jogo mostra de novo. */
  modo?: 'novos' | 'de-novo';
  /** Texto do botão final. */
  fim?: string;
  /** Desenho do item quando não é uma imagem (kana desenhado, carta do KanjiMon). */
  visual?: (item: ItemNovo) => ComponentChildren;
  /** Avisa qual item está na tela (a Cena Viva faz a coisa brilhar). */
  onItem?: (item: ItemNovo) => void;
}

let tocador: Tocador | null = null;
function falar(item: ItemNovo | undefined): void {
  tocador?.parar();
  tocador = item && item.falas.length > 0 ? tocarSequencia(item.falas) : null;
}

function Escrita({ item }: { item: ItemNovo }) {
  const fur = item.leitura && item.alvo.t !== 'kana' && item.leitura !== item.grande;
  const longo = [...item.grande].length > 4;
  return (
    <span class={`ap-grande${longo ? ' longo' : ''}${item.alvo.t === 'kanji' ? ' kanji' : ''}`} lang="ja">
      {fur ? <Furigana texto={item.grande} leitura={item.leitura} /> : item.grande}
    </span>
  );
}

export function Apresentacao({ itens, onFim, modo = 'novos', fim, visual, onItem }: PropsApresentacao) {
  const [i, setI] = useState(0);
  const item = itens[i];
  const ultimo = i >= itens.length - 1;
  const fimRef = useRef(onFim);
  fimRef.current = onFim;
  // A estrutura de uma etapa (sem ficha) não abre o Aprofundar.
  useAprofundar(item && fichaDe(item.alvo) ? item.alvo : null);

  const itemRef = useRef(onItem);
  itemRef.current = onItem;
  useEffect(() => {
    falar(item);
    if (item) itemRef.current?.(item);
  }, [item]);
  useEffect(() => () => tocador?.parar(), []);

  const seguir = () => {
    if (ultimo) {
      tocador?.parar();
      fimRef.current();
    } else setI((n) => n + 1);
  };
  const voltar = () => setI((n) => Math.max(0, n - 1));

  const teclas = useRef({ seguir, voltar, item });
  teclas.current = { seguir, voltar, item };
  // Antes da pintura: com useEffect, um Enter logo que o cartão aparecia se perdia.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (camadaAberta.value || e.ctrlKey || e.altKey || e.metaKey) return;
      const tecla = teclaDe(e);
      if (tecla === null) return;
      const t = teclas.current;
      const key = tecla.toLowerCase();
      let feito = true;
      if (tecla === 'Enter' || tecla === ' ' || tecla === 'ArrowRight') t.seguir();
      else if (tecla === 'ArrowLeft') t.voltar();
      else if (key === 'r') falar(t.item);
      else feito = false;
      if (feito) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    // Na captura: a apresentação está por cima do jogo, então a tecla é dela.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  if (!item) return null;
  const desenho = visual?.(item);
  return (
    <section class={`ap-cartao ${modo}`} data-testid="apresentacao" data-modo={modo} data-item={item.chaves[0]} data-i={i} data-total={itens.length} aria-live="polite">
      <header class="ap-topo">
        <span class="gr-tag">{modo === 'novos' ? (itens.length > 1 ? 'Novos' : 'Novo') : 'Olhe de novo'}</span>
        {itens.length > 1 && (
          <ol class="ap-pontos" aria-label={`${i + 1} de ${itens.length}`}>
            {itens.map((x, n) => (
              <li key={x.chaves[0]} class={n === i ? 'agora' : n < i ? 'visto' : ''} />
            ))}
          </ol>
        )}
        <span class="ap-tipo">{item.tipo}</span>
      </header>

      <div class="ap-corpo">
        {(desenho || item.img) && <div class="ap-visual">{desenho ?? <img src={item.img} alt="" draggable={false} />}</div>}
        <div class="ap-texto">
          <Escrita item={item} />
          {item.alvo.t === 'kana' && item.leitura && <span class="ap-romaji">{item.leitura}</span>}
          <p class="ap-pt">{item.pt}</p>
          {item.explicacao && item.explicacao !== item.pt && <p class="ap-explica">{item.explicacao}</p>}
          {item.exemplo && (
            <p class="ap-exemplo">
              <span class="ap-ex-jp" lang="ja">
                {item.exemplo.jp}
              </span>
              {item.exemplo.kana && item.exemplo.kana !== item.exemplo.jp && (
                <span class="ap-ex-kana" lang="ja">
                  {item.exemplo.kana}
                </span>
              )}
              <span class="ap-ex-pt">{item.exemplo.pt}</span>
            </p>
          )}
        </div>
      </div>

      <footer class="ap-acoes">
        <button class="ghost" onClick={voltar} disabled={i === 0} aria-label="Voltar um">
          <Icone nome="arrow-left" /> <kbd>←</kbd>
        </button>
        <button onClick={() => falar(item)} data-testid="ap-ouvir">
          <Icone nome="volume-2" /> Ouvir <kbd>R</kbd>
        </button>
        <button class="primary" onClick={seguir} data-testid="ap-seguir">
          {ultimo ? (fim ?? (modo === 'novos' ? 'Praticar' : 'Entendi')) : 'Próximo'} <kbd>Enter</kbd>
        </button>
      </footer>
    </section>
  );
}
