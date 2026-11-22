import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useClima } from '../../core/som/climas';
import { useAprofundar } from '../../core/aprofundar/estado';
import type { Word } from '../../content';
import { FIGURAS, type Figura } from '../../content/imagens';
import { app, commit, go, memoriaSave, screen } from '../../core/app';
import { sfx, speakWord } from '../../core/audio';
import { acertou, cor, corStyle, errou, zerar } from '../../core/cor';
import { figuraUrl } from '../../core/figuras';
import { onomato } from '../../core/fx';
import { teclaDe } from '../../core/teclas';
import { Apresentacao } from '../../core/Apresentacao';
import { itemDaPalavra, type ItemNovo } from '../../content/ensino';
import { chave } from './engine';
import { FIGURAS_MEMORIA, MemoriaRound, QUADROS, type Carta, type Evento, type Resumo } from './engine';
import { foco, recortar } from '../../core/foco';
import { Furigana } from '../../core/Furigana';

type Modo = 'menu' | 'rodada' | 'resumo';

/** Tecla de cada carta, pela posição no teclado: a grade da tela é a grade das teclas. */
export const GRADE = ['1', '2', '3', '4', 'q', 'w', 'e', 'r', 'a', 's', 'd', 'f', 'z', 'x', 'c', 'v'] as const;

const FUNDO = 'heya';

function Escrita({ w, leitura }: { w: Word; leitura: boolean }) {
  if (w.jp === w.kana) return <>{w.jp}</>;
  return leitura ? <Furigana texto={w.jp} leitura={w.kana} /> : <>{w.jp}</>;
}

function Alto() {
  return (
    <svg class="me-alto" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
    </svg>
  );
}

function CartaView({ c, i, onClick, brilha, escolhida }: { c: Carta; i: number; onClick: () => void; brilha: boolean; escolhida: boolean }) {
  const f = c.figura;
  const cls = ['me-carta', c.lado, c.aberta ? 'aberta' : 'fechada', c.feita ? 'feita' : '', brilha ? 'brilha' : '', escolhida ? 'escolhida' : ''].filter(Boolean).join(' ');
  const rotulo = c.aberta ? (c.lado === 'img' ? `imagem: ${f.word.pt}` : c.mostra === 'audio' ? 'palavra em áudio' : f.word.kana) : 'carta virada';
  return (
    <button class={cls} onClick={onClick} data-carta={i} data-par={c.par} data-lado={c.lado} data-palavra={f.word.id} aria-label={rotulo}>
      <kbd>{GRADE[i]!.toUpperCase()}</kbd>
      {!c.aberta ? (
        <span class="me-verso" lang="ja">
          言
        </span>
      ) : c.lado === 'img' ? (
        <span class="me-fig">
          <img src={figuraUrl(f.img)} alt="" draggable={false} />
        </span>
      ) : c.mostra === 'audio' && !c.feita ? (
        <span class="me-palavra audio">
          <Alto />
        </span>
      ) : (
        <span class={`me-palavra ${c.mostra}`} lang="ja">
          <Escrita w={f.word} leitura={c.mostra !== 'kanji' || c.feita} />
          {c.feita && <small>{f.word.pt}</small>}
        </span>
      )}
    </button>
  );
}

/** A figura como apresentação: imagem, palavra, voz e significado. */
export function itemDaFigura(f: Figura): ItemNovo {
  return itemDaPalavra(f.word, chave(f.word), { img: figuraUrl(f.img) });
}

export function MemoriaGame() {
  const save = memoriaSave();
  const [modo, setModoState] = useState<Modo>('menu');
  useClima(modo === 'resumo' ? 'vitoria' : undefined);
  const modoRef = useRef<Modo>('menu');
  const setModo = (m: Modo) => {
    modoRef.current = m;
    setModoState(m);
  };
  const [, setFrame] = useState(0);
  const redesenhar = () => setFrame((n) => n + 1);
  const rodadaRef = useRef<MemoriaRound | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [nota, setNota] = useState('');
  /** Confundiu na prática: a palavra aparece de novo. */
  const [deNovo, setDeNovo] = useState<ItemNovo | null>(null);
  const deNovoRef = useRef<ItemNovo | null>(null);
  deNovoRef.current = deNovo;
  const ultimaFala = useRef<string | null>(null);
  const r = rodadaRef.current;
  // Aprofundar: as palavras dos pares já feitos (e as novas apresentadas); no fim, as novas e as que subiram.
  useAprofundar(
    modo === 'rodada' && r
      ? r.quadro?.cartas.filter((c) => c.feita && c.lado === 'palavra').map((c) => ({ t: 'palavra', id: c.figura.word.id }) as const) ?? []
      : modo === 'resumo' && resumo
        ? [...resumo.novas, ...resumo.subiram].map((f) => ({ t: 'palavra', id: f.word.id }) as const)
        : [],
  );

  const comecar = () => {
    zerar();
    // Missão da Jornada: só as figuras das palavras dela.
    const figuras = recortar(FIGURAS_MEMORIA, foco.value?.palavras, (f) => f.word.id);
    rodadaRef.current = new MemoriaRound({ cards: app.data.cards, profile: app.data.profile, save, now: () => Date.now(), rng: Math.random, figuras });
    setResumo(null);
    setNota('');
    setModo('rodada');
    sfx.click();
  };

  const reagir = (ev: Evento[]) => {
    for (const e of ev) {
      if (e.t === 'abre') {
        if (e.fala) {
          ultimaFala.current = e.fala;
          void speakWord(e.fala);
        } else sfx.page();
      } else if (e.t === 'par') {
        acertou(e.combo);
        sfx.hit(e.combo);
        if (e.rapido) sfx.fast();
        const el = document.querySelector(`[data-carta="${e.cartas[1]}"]`);
        onomato(e.rapido ? 'rapido' : 'acerto', el, 'bom', 0.8);
        ultimaFala.current = e.figura.word.kana;
        void speakWord(e.figura.word.kana);
      } else if (e.t === 'confusao') {
        errou();
        sfx.miss();
        onomato('erro', document.querySelector(`[data-carta="${e.cartas[1]}"]`), 'neutro', 0.7);
        setNota('Não é par. Elas fecham quando você abrir a próxima carta.');
      } else if (e.t === 'de-novo') {
        setDeNovo(itemDaFigura(e.figura));
      } else if (e.t === 'sobe') setNota(`${e.figura.word.kana}: ${e.nivel === 1 ? 'agora em kanji' : 'agora só no som'}`);
      else if (e.t === 'quadro') {
        sfx.chest();
        onomato('captura', document.querySelector('.me-quadro'), 'festa');
      } else if (e.t === 'nivel') {
        sfx.levelup();
        setNota(`Nível ${e.level}!`);
      } else if (e.t === 'fim') {
        sfx.chest();
        setResumo(e.resumo);
        setModo('resumo');
      }
    }
    commit();
    redesenhar();
  };

  const escolher = (i: number) => {
    const rr = rodadaRef.current;
    if (!rr) return;
    // Na memória, o par errado fica aberto até a próxima carta: dá para ler e ouvir com calma.
    if (rr.quadro.modo === 'memoria' && rr.escolha.length >= 2) setNota('');
    reagir(rr.escolher_carta(i));
  };

  const seguir = () => {
    const rr = rodadaRef.current;
    if (!rr) return;
    if (rr.fase === 'apresenta') {
      rr.apresentou();
      commit();
      redesenhar();
    } else if (rr.fase === 'pausa') {
      zerar();
      setNota('');
      rr.proximo();
      redesenhar();
    }
  };

  const parar = () => {
    const rr = rodadaRef.current;
    if (rr && rr.fase !== 'fim') {
      const ev = rr.parar();
      if (ev.length > 0) {
        reagir(ev);
        return;
      }
    }
    zerar();
    setModo('menu');
  };

  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tecla = teclaDe(e);
      if (tecla === null) return;
      if (screen.value !== 'memoria') return;
      const confirma = tecla === 'Enter' || tecla === ' ';
      if (confirma) e.preventDefault();
      const m = modoRef.current;
      if (m === 'menu') {
        if (tecla === 'Escape') go('hub');
        else if (confirma) comecar();
        return;
      }
      if (m === 'resumo') {
        if (tecla === 'Escape') setModo('menu');
        else if (confirma) comecar();
        return;
      }
      const rr = rodadaRef.current;
      if (!rr) return;
      // Apresentação na tela: as teclas são dela (core/Apresentacao.tsx).
      if (tecla !== 'Escape' && (rr.fase === 'apresenta' || deNovoRef.current)) return;
      if (tecla === 'Escape') parar();
      else if (tecla.toLowerCase() === 'r' && rr.fase !== 'jogo') {
        if (ultimaFala.current) void speakWord(ultimaFala.current);
      } else if (confirma) seguir();
      else if (rr.fase === 'jogo' && (/^[1-4]$/.test(tecla) || /^[a-zA-Z]$/.test(tecla))) {
        const i = GRADE.indexOf(tecla.toLowerCase() as (typeof GRADE)[number]);
        if (i >= 0 && i < rr.quadro.cartas.length) escolher(i);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  const fundo = { '--cena': `url("${figuraUrl(FUNDO)}")` };

  if (modo === 'rodada' && r && r.fase === 'apresenta') {
    return (
      <main class="me">
        <header class="km-top">
          <button class="ghost" onClick={parar}>
            Parar <kbd>Esc</kbd>
          </button>
          <div class="gr-progress">Palavras novas antes do quadro</div>
          <span />
        </header>
        <div data-testid="me-licao">
          <Apresentacao itens={r.apresentadas.map(itemDaFigura)} onFim={seguir} fim="Começar o quadro" />
        </div>
      </main>
    );
  }

  if (modo === 'rodada' && r) {
    const q = r.quadro;
    const colunas = 4;
    return (
      <main class="me">
        <header class="km-top">
          <button class="ghost" onClick={parar}>
            Parar <kbd>Esc</kbd>
          </button>
          <div class="gr-progress" data-testid="me-progresso">
            Quadro {r.numero + 1} de {QUADROS.length}
            {q.parecidas ? ' · parecidas' : q.modo === 'memoria' ? ' · memória' : ' · rápido'} · <b>{r.pontos}</b> pontos
            {r.combo > 1 && <span class="combo on"> · combo {r.combo}</span>}
          </div>
          <span class="gr-note" data-testid="me-nota">{nota}</span>
        </header>
        {deNovo ? (
          <Apresentacao key={deNovo.chaves[0]} itens={[deNovo]} modo="de-novo" onFim={() => setDeNovo(null)} fim="Voltar ao quadro" />
        ) : (
          <section class="me-quadro" data-testid="me-quadro" style={{ ...fundo, ...corStyle(cor.value) }}>
            {q.apoio && (
              <span class="ap-pratica" data-testid="me-pratica">
                Prática: confundir aqui não tira nada
              </span>
            )}
            <p class="me-dica">
              {q.parecidas

                ? 'Palavras que soam parecido. Ouça com calma.'
                : q.modo === 'memoria'
                  ? 'Cartas viradas: ache cada imagem e a palavra dela.'
                  : 'Ligue cada imagem à palavra dela.'}
            </p>
            <div class="me-grade" style={{ gridTemplateColumns: `repeat(${colunas}, 1fr)` }}>
              {q.cartas.map((c, i) => (
                <CartaView key={i} c={c} i={i} onClick={() => escolher(i)} brilha={r.brilha(i)} escolhida={r.escolha.includes(i)} />
              ))}
            </div>
            {r.fase === 'pausa' && (
              <div class="gr-done" data-testid="me-pausa">
                <span>Quadro pronto!</span>
                <button class="primary" onClick={seguir} data-testid="me-proximo">
                  Próximo quadro <kbd>Enter</kbd>
                </button>
                <button class="ghost" onClick={parar}>
                  Parar aqui <kbd>Esc</kbd>
                </button>
              </div>
            )}
          </section>
        )}
        <footer class="av-keys">
          {r.fase === 'jogo' ? (
            <span>
              <kbd>1</kbd>–<kbd>V</kbd> a tecla no canto da carta
            </span>
          ) : (
            <span>
              <kbd>Enter</kbd> seguir
            </span>
          )}
          {r.fase === 'jogo' ? (
            <span>escolher a carta de novo repete a voz</span>
          ) : (
            <span>
              <kbd>R</kbd> ouvir de novo
            </span>
          )}
        </footer>
      </main>
    );
  }

  if (modo === 'resumo' && resumo) {
    return (
      <main class="me">
        <section class="av-panel" data-testid="me-resumo">
          <span class="muted">Rodada concluída</span>
          <h2 class={resumo.recorde ? 'big win' : 'big'}>
            {resumo.pontos} pontos{resumo.recorde ? ' · recorde!' : ''}
          </h2>
          <div class="summary">
            <div>
              <b>{resumo.pares}</b>
              <span>pares</span>
            </div>
            <div>
              <b>
                {resumo.limpos}/{resumo.pares}
              </b>
              <span>sem confundir</span>
            </div>
            <div>
              <b>{resumo.bestCombo}</b>
              <span>melhor combo</span>
            </div>
            <div>
              <b class="gain">+{resumo.xp}</b>
              <span>XP · +{resumo.moedas} moedas</span>
            </div>
          </div>
          {resumo.novas.length > 0 && (
            <>
              <h3>Palavras novas</h3>
              <ul class="me-lista" lang="ja">
                {resumo.novas.map((f) => (
                  <li key={f.img}>
                    <img src={figuraUrl(f.img)} alt="" />
                    <Furigana texto={f.word.jp} leitura={f.word.kana} /> <small>{f.word.pt}</small>
                  </li>
                ))}
              </ul>
            </>
          )}
          {resumo.subiram.length > 0 && <p class="muted">Subiram de nível: {resumo.subiram.map((f) => f.word.kana).join('、')}</p>}
          <div class="actions center">
            <button class="primary" onClick={comecar} data-testid="me-outra">
              Outra rodada <kbd>Enter</kbd>
            </button>
            <button class="ghost" onClick={() => setModo('menu')}>
              Parar aqui <kbd>Esc</kbd>
            </button>
          </div>
        </section>
      </main>
    );
  }

  const vistasF = FIGURAS.filter((f) => app.data.cards[`${f.word.id}#meaning`]);
  const niveis = vistasF.map((f) => save.nivel[f.word.id] ?? 0);
  const vistas = vistasF.length;
  return (
    <main class="me">
      <header class="km-top">
        <button class="ghost" onClick={() => go('hub')}>
          Fliperama <kbd>Esc</kbd>
        </button>
        <div class="gr-progress">
          <b>Memória</b> · imagem e palavra
        </div>
        <span />
      </header>
      <section class="av-panel" data-testid="me-menu">
        <p class="muted">
          Ligue cada imagem à palavra dela. Três quadros curtos por rodada: um rápido, um de memória com as cartas viradas e outro rápido. Cada palavra começa em kana, passa para kanji e depois fica só no som.
        </p>
        <button class="play-now" style={fundo} onClick={comecar} data-testid="me-start">
          <span class="play-now-main">{save.rounds > 0 ? 'Nova rodada' : 'Começar'}</span>
          <span class="play-now-sub">
            {save.rounds > 0 ? `${save.rounds} ${save.rounds === 1 ? 'rodada' : 'rodadas'} · recorde ${save.best}` : '3 quadros, uns 2 minutos'} <kbd>Enter</kbd>
          </span>
        </button>
        {vistas > 0 && (
          <p class="muted" data-testid="me-niveis">
            Em kana: {niveis.filter((n) => n === 0).length} · em kanji: {niveis.filter((n) => n === 1).length} · só no som: {niveis.filter((n) => n === 2).length}
          </p>
        )}
      </section>
    </main>
  );
}
