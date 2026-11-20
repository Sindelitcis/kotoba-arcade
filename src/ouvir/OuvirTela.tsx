/**
 * Modo Ouvir: aulas curtas para aprender sem olhar a tela. Espaço toca e pausa, as setas
 * pulam, e no fim de uma aula a próxima começa sozinha. Os botões do fone também mandam
 * (Media Session). O texto da aula aparece só se você quiser.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { AULAS, duracao, type Aula } from '../aulas';
import { app, commit, go, ouvirSave, screen, tick } from '../core/app';
import { sfx } from '../core/audio';
import { tocarSequencia, type Tocador, type Trecho } from '../core/sequencia';
import { teclaDe } from '../core/teclas';
import { ETAPAS, missoesDa } from '../jornada/etapas';
import { registrarOuvida } from './save';

interface Grupo {
  titulo: string;
  aulas: Aula[];
}

const porId = new Map(AULAS.map((a) => [a.id, a]));

/** As aulas na ordem da Jornada, uma etapa por grupo. */
export const GRUPOS: readonly Grupo[] = [
  { titulo: 'Comece aqui', aulas: [porId.get('ouvir:como') as Aula] },
  ...ETAPAS.map((e) => ({
    titulo: e.titulo,
    aulas: missoesDa(e).flatMap((m) => (m.acao.tipo === 'licao' && porId.has(m.acao.licao) ? [porId.get(m.acao.licao) as Aula] : [])),
  })).filter((g) => g.aulas.length > 0),
];

/** Lista corrida, na ordem em que uma aula puxa a outra. */
export const FILA: readonly Aula[] = GRUPOS.flatMap((g) => g.aulas);

/** Começo do bloco anterior ou do seguinte: um bloco é uma explicação em português e o que vem até a próxima. */
export function pular(trechos: readonly Trecho[], atual: number, d: 1 | -1): number {
  const inicios = trechos.flatMap((t, i) => (t.tipo === 'pt' ? [i] : []));
  if (d > 0) return inicios.find((i) => i > atual) ?? trechos.length;
  // Voltar no meio do bloco recomeça o bloco; logo no começo dele, vai para o anterior.
  const antes = inicios.filter((i) => i < atual);
  return antes.length ? (antes[antes.length - 1] as number) : 0;
}

function minutos(a: Aula): string {
  const m = Math.max(1, Math.round(duracao(a.trechos) / 60));
  return `${m} min`;
}

function textoDo(t: Trecho): string {
  if (t.tipo === 'pt') return t.texto;
  if (t.tipo === 'jp') return t.fala.texto;
  return '(repita)';
}

export function OuvirTela() {
  void tick.value;
  const save = ouvirSave();
  const { settings } = app.data;
  const [idx, setIdx] = useState(() => Math.max(0, FILA.findIndex((a) => a.id === save.ultima)));
  const [trecho, setTrecho] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [texto, setTexto] = useState(false);
  const tocador = useRef<Tocador | null>(null);
  const listaEl = useRef<HTMLOListElement>(null);
  const aula = FILA[idx] as Aula;

  const parar = () => {
    tocador.current?.parar();
    tocador.current = null;
    setTocando(false);
  };

  const tocar = (i: number, desde: number) => {
    tocador.current?.parar();
    const a = FILA[i];
    if (!a) return;
    setIdx(i);
    setTrecho(desde);
    save.ultima = a.id;
    commit();
    if (!app.data.settings.voice) return;
    const t = tocarSequencia(a.trechos, { desde, aoTrecho: setTrecho });
    tocador.current = t;
    setTocando(true);
    void t.fim.then((inteira) => {
      if (tocador.current !== t) return;
      tocador.current = null;
      setTocando(false);
      if (!inteira) return;
      registrarOuvida(ouvirSave(), a.id);
      commit();
      // A próxima aula começa sozinha: dá para seguir sem olhar a tela.
      if (i + 1 < FILA.length && screen.value === 'ouvir') tocar(i + 1, 0);
    });
  };

  const alternar = () => (tocando ? parar() : tocar(idx, trecho >= aula.trechos.length ? 0 : trecho));
  const pularBloco = (d: 1 | -1) => {
    const alvo = pular(aula.trechos, trecho, d);
    if (alvo >= aula.trechos.length) {
      if (idx + 1 < FILA.length) tocar(idx + 1, 0);
      return;
    }
    if (tocando) tocar(idx, alvo);
    else setTrecho(alvo);
  };
  const escolher = (i: number) => {
    const n = Math.min(Math.max(0, i), FILA.length - 1);
    if (tocando) tocar(n, 0);
    else {
      setIdx(n);
      setTrecho(0);
    }
  };

  // Sair da tela cala a aula.
  useEffect(() => () => tocador.current?.parar(), []);

  // Botões do fone e da tela bloqueada.
  useEffect(() => {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
    if (!ms) return;
    ms.metadata = typeof MediaMetadata === 'undefined' ? null : new MediaMetadata({ title: aula.titulo, artist: 'Kotoba Arcade', album: 'Ouvir' });
    const acoes: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => !tocando && tocar(idx, trecho)],
      ['pause', () => parar()],
      ['nexttrack', () => pularBloco(1)],
      ['previoustrack', () => pularBloco(-1)],
    ];
    for (const [acao, fn] of acoes) {
      try {
        ms.setActionHandler(acao, fn);
      } catch {
        // navegador sem essa ação
      }
    }
    return () => {
      for (const [acao] of acoes) {
        try {
          ms.setActionHandler(acao, null);
        } catch {
          // idem
        }
      }
    };
  });

  useLayoutEffect(() => {
    listaEl.current?.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  }, [idx]);

  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tecla = teclaDe(e);
      if (tecla === null || screen.value !== 'ouvir') return;
      if (e.target instanceof HTMLElement && e.target.closest('input, button') && (tecla === ' ' || tecla === 'Enter')) return;
      if (tecla === 'Escape') {
        e.preventDefault();
        parar();
        go('hub');
      } else if (tecla === ' ' || tecla === 'Enter') {
        e.preventDefault();
        alternar();
      } else if (tecla === 'ArrowRight') {
        e.preventDefault();
        pularBloco(1);
      } else if (tecla === 'ArrowLeft') {
        e.preventDefault();
        pularBloco(-1);
      } else if (tecla === 'ArrowDown') {
        e.preventDefault();
        escolher(idx + 1);
      } else if (tecla === 'ArrowUp') {
        e.preventDefault();
        escolher(idx - 1);
      } else if (tecla.toLowerCase() === 't') setTexto((v) => !v);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  const ligarVoz = () => {
    settings.voice = true;
    commit();
    sfx.click();
  };

  let n = 0;
  return (
    <main class="jn ouvir">
      <header class="jn-topo">
        <button class="ghost" onClick={() => (parar(), go('hub'))}>
          ← Fliperama <kbd>Esc</kbd>
        </button>
        <div>
          <h1>
            <span class="jn-topo-jp">聞</span> Ouvir
          </h1>
          <p class="muted">Aulas curtas para ouvir sem olhar a tela: no ônibus, lavando louça, antes de dormir. Fale junto nas pausas.</p>
        </div>
      </header>

      {!settings.voice && (
        <p class="notice" role="alert">
          A voz está desligada nos Ajustes, então as aulas ficam mudas. <button onClick={ligarVoz}>Ligar a voz</button>
        </p>
      )}

      <section class="panel ouvir-tocando" aria-live="polite">
        <div class="ouvir-agora">
          <span class="muted">{tocando ? 'Tocando' : 'Parado'}</span>
          <h2 data-testid="ouvir-titulo">{aula.titulo}</h2>
          <div class="bar" aria-hidden="true">
            <i style={{ width: `${Math.min(100, (trecho / Math.max(1, aula.trechos.length)) * 100)}%` }} />
          </div>
        </div>
        <div class="actions">
          <button onClick={() => pularBloco(-1)} title="Voltar um pedaço">
            Voltar <kbd>←</kbd>
          </button>
          <button class="ouvir-play" onClick={alternar} data-testid="ouvir-play">
            {tocando ? 'Pausar' : 'Tocar'} <kbd>Espaço</kbd>
          </button>
          <button onClick={() => pularBloco(1)} title="Pular um pedaço">
            Pular <kbd>→</kbd>
          </button>
          <button class="ghost" onClick={() => setTexto((v) => !v)} aria-pressed={texto}>
            Texto <kbd>T</kbd>
          </button>
        </div>
        {texto && (
          <ol class="ouvir-texto" data-testid="ouvir-texto">
            {aula.trechos.map((t, i) =>
              t.tipo === 'pausa' ? null : (
                <li key={i} class={`${i === trecho ? 'sel' : ''}${t.tipo === 'jp' ? ' jp' : ''}`} lang={t.tipo === 'jp' ? 'ja' : 'pt-BR'}>
                  {textoDo(t)}
                </li>
              ),
            )}
          </ol>
        )}
      </section>

      <ol class="jn-trilhas" ref={listaEl}>
        {GRUPOS.map((g) => (
          <li key={g.titulo} class="jn-trilha">
            <h2>{g.titulo}</h2>
            <ol>
              {g.aulas.map((a) => {
                const i = n++;
                const vezes = save.ouvidas[a.id] ?? 0;
                return (
                  <li key={a.id}>
                    <button class={`jn-missao${i === idx ? ' sel' : ''}${vezes > 0 ? ' feita' : ''}`} onClick={() => tocar(i, 0)} data-testid="ouvir-aula">
                      <span class="jn-missao-titulo">{a.titulo}</span>
                      <span class="jn-missao-tipo">
                        {minutos(a)}
                        {vezes > 0 ? ` · ouvida ${vezes}×` : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </main>
  );
}
