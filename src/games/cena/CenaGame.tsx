import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useClima } from '../../core/som/climas';
import { useAprofundar } from '../../core/aprofundar/estado';
import { app, cenaSave, commit, go, screen } from '../../core/app';
import { sfx, speak, speakWord } from '../../core/audio';
import { acertou, cor, corStyle, errou, zerar } from '../../core/cor';
import { figuraUrl, medida } from '../../core/figuras';
import { onomato } from '../../core/fx';
import { teclaDe } from '../../core/teclas';
import { foco } from '../../core/foco';
import { Apresentacao } from '../../core/Apresentacao';
import { itemDaPalavra, type ItemNovo } from '../../content/ensino';
import { figuraDaPalavra } from '../../content/imagens';
import type { Word } from '../../content';
import { itemDaEtapa } from './aulas';
import {
  ACERTOS_PARA_ABRIR,
  CenaRound,
  chave,
  PERGUNTA_NOME,
  daCoisa,
  palavraDe,
  ETAPA_INFO,
  ETAPAS,
  falaDaTarefa,
  falaDoNome,
  lugarSugerido,
  TAREFAS_POR_RODADA,
  textoDe,
  vizinho,
  type Caixa,
  type Coisa,
  type Direcao,
  type Evento,
  type CenaSave,
  type Lugar,
  type Resumo,
  type Seg,
} from './engine';
import { LUGARES } from './lugares';
import { Furigana } from '../../core/Furigana';

type Modo = 'menu' | 'rodada' | 'resumo';

export function Frase({ segs }: { segs: readonly Seg[] }) {
  return (
    <>
      {segs.map((s, i) =>
        s.r ? (
          <span key={i}>
            <Furigana texto={s.t} leitura={s.r} />
          </span>
        ) : (
          <span key={i}>{s.t}</span>
        ),
      )}
    </>
  );
}

/** Proporção da cena (largura / altura), pela imagem de fundo. */
function proporcao(l: Lugar): number {
  const m = medida(l.fundo);
  return m.w / m.h;
}

/** Altura de uma coisa em % da altura da cena. */
function alturaDe(c: Coisa, prop: number): number {
  const m = medida(c.img);
  return c.w * (m.h / m.w) * prop;
}

export function caixas(l: Lugar): Caixa[] {
  const prop = proporcao(l);
  return l.coisas.map((c) => ({ id: c.id, cx: c.x, cy: c.y - alturaDe(c, prop) / 2 }));
}

/** O nome da coisa, para falar: palavra solta na voz de palavra; pessoa (読んでいる人) na voz de frase. */
function falarNome(nome: Seg[]): void {
  const f = falaDoNome(nome);
  if (f.palavra) void speakWord(f.texto);
  else void speak(f.texto);
}

/** A palavra como apresentação, com a figura dela. */
export function itemDaCena(w: Word): ItemNovo {
  const f = figuraDaPalavra(w.id);
  return itemDaPalavra(w, chave(w), { img: f ? figuraUrl(f.img) : undefined });
}

/** A dica da prática: a imagem e o significado das palavras do pedido. */
function Dica({ r }: { r: CenaRound }) {
  return (
    <p class="ap-dica cn-dica" data-testid="cn-dica">
      {r.tarefa.palavras.map((w) => {
        const f = figuraDaPalavra(w.id);
        return (
          <span key={w.id} class="cn-dica-item">
            {f && <img src={figuraUrl(f.img)} alt="" draggable={false} />}
            <span lang="ja">{w.jp}</span> = {w.pt}
          </span>
        );
      })}
    </p>
  );
}

/**
 * A cena com as coisas. `destaque`: na apresentação, a carta da palavra na tela; as coisas dela brilham.
 * Antes de a apresentação acabar não há tarefa, então nada de alvo nem de marcada.
 */
function Cena({
  r,
  cursor,
  onClick,
  mostrados,
  destaque = null,
}: {
  r: CenaRound;
  cursor: string | null;
  onClick: (id: string) => void;
  mostrados: Record<string, Seg[]>;
  destaque?: string | null;
}) {
  const l = r.lugar;
  const prop = proporcao(l);
  const t = r.temTarefa ? r.tarefa : null;
  const alvoDescrever = t?.pecas ? t.alvo[0] : null;
  const mostraTudo = r.fase === 'apresenta';
  return (
    <div class="cn-cena" data-testid="cn-cena" style={{ aspectRatio: String(prop), '--cena': `url("${figuraUrl(l.fundo)}")`, ...corStyle(cor.value) }}>
      {l.coisas.map((c) => {
        const h = alturaDe(c, prop);
        const cls = [
          'cn-coisa',
          daCoisa(c).figura.tipo,
          cursor === c.id ? 'cursor' : '',
          r.brilha(c.id) || (destaque !== null && chave(palavraDe(c)) === destaque) ? 'brilha' : '',
          alvoDescrever === c.id ? 'marcada' : '',
          r.fase === 'feita' && t?.alvo.includes(c.id) ? 'certa' : '',
          r.tentadas.includes(c.id) ? 'tentada' : '',
          !mostraTudo && !r.clicavel(c.id) ? 'apagada' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={c.id}
            class={cls}
            data-coisa={c.id}
            data-alvo={t?.alvo.includes(c.id) ? 'sim' : undefined}
            aria-label={daCoisa(c).figura.word.pt}
            style={{ left: `${c.x - c.w / 2}%`, top: `${c.y - h}%`, width: `${c.w}%`, height: `${h}%`, zIndex: c.z ?? Math.round(c.y * 10) }}
            onClick={() => onClick(c.id)}
            tabIndex={-1}
          >
            <img src={figuraUrl(c.img)} alt="" draggable={false} style={c.vira ? { transform: 'scaleX(-1)' } : undefined} />
            {mostrados[c.id] && (
              <span class="cn-nome" lang="ja">
                <Frase segs={mostrados[c.id]!} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** O lugar da vez: o da missão da Jornada, se houver; senão o menos jogado. */
function lugarDaVez(save: CenaSave): Lugar {
  return LUGARES.find((l) => l.id === foco.value?.lugar) ?? lugarSugerido(LUGARES, save);
}

export function CenaGame() {
  const save = cenaSave();
  const [modo, setModoState] = useState<Modo>('menu');
  useClima(modo === 'resumo' ? 'vitoria' : undefined);
  const modoRef = useRef<Modo>('menu');
  const setModo = (m: Modo) => {
    modoRef.current = m;
    setModoState(m);
  };
  const [, setFrame] = useState(0);
  const redesenhar = () => setFrame((n) => n + 1);
  const rodadaRef = useRef<CenaRound | null>(null);
  const lugarRef = useRef<Lugar>(lugarDaVez(save));
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [nota, setNota] = useState('');
  const cursorRef = useRef<string | null>(null);
  const [mostrados, setMostrados] = useState<Record<string, Seg[]>>({});
  /** Errou na prática: a palavra certa aparece de novo, com a voz. */
  const [deNovo, setDeNovo] = useState<ItemNovo | null>(null);
  /** Na apresentação: a carta da palavra na tela, para a coisa brilhar na cena. */
  const [destaque, setDestaque] = useState<string | null>(null);
  const deNovoRef = useRef<ItemNovo | null>(null);
  deNovoRef.current = deNovo;
  // Aprofundar: o lugar inteiro (vocabulário da cena e uma frase para montar).
  useAprofundar(modo === 'menu' ? null : { t: 'cena', id: `lugar:${lugarRef.current.id}` });
  const r = rodadaRef.current;

  const comecar = (l: Lugar = lugarRef.current) => {
    zerar();
    lugarRef.current = l;
    rodadaRef.current = new CenaRound({ lugar: l, cards: app.data.cards, profile: app.data.profile, save, now: () => Date.now(), rng: Math.random });
    cursorRef.current = null;
    setMostrados({});
    setDeNovo(null);
    setResumo(null);
    setNota('');
    setModo('rodada');
    sfx.click();
  };

  const reagir = (ev: Evento[]) => {
    for (const e of ev) {
      if (e.t === 'certo') {
        acertou(e.combo);
        sfx.hit(e.combo);
        if (e.rapido) sfx.fast();
        onomato(e.rapido ? 'rapido' : 'acerto', document.querySelector(`[data-coisa="${e.coisa}"]`), 'bom', 0.9);
        const t = rodadaRef.current?.tarefa;
        if (t?.pecas) void speak(textoDe(t.pecas.certas));
        else if (t?.marcada) void speak(textoDe(t.segs));
      } else if (e.t === 'de-novo') {
        setDeNovo(itemDaCena(e.palavra));
      } else if (e.t === 'outra') {
        errou();
        sfx.miss();
        onomato('erro', document.querySelector(`[data-coisa="${e.coisa}"]`), 'neutro', 0.7);
        setMostrados((m) => ({ ...m, [e.coisa]: e.nome }));
        falarNome(e.nome);
      } else if (e.t === 'peca') {
        sfx.hit(1);
        if (!e.completa) onomato('encaixe', document.querySelector('.cn-montada'), 'bom', 0.7);
      } else if (e.t === 'volta') {
        errou();
        sfx.miss();
        onomato('erro', document.querySelector('.cn-bandeja'), 'neutro', 0.7);
      } else if (e.t === 'abre') setNota(`Etapa nova: ${ETAPA_INFO[e.etapa].titulo}`);
      else if (e.t === 'nivel') {
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

  const clicar = (id: string) => {
    const rr = rodadaRef.current;
    if (!rr) return;
    cursorRef.current = id;
    if (rr.fase === 'feita') return seguir();
    reagir(rr.clicar(id));
  };

  const seguir = () => {
    const rr = rodadaRef.current;
    if (!rr) return;
    if (rr.fase === 'apresenta') {
      rr.apresentou();
      commit();
      redesenhar();
    } else if (rr.fase === 'licao') {
      rr.comecar();
      commit();
      redesenhar();
    } else if (rr.fase === 'feita') {
      setMostrados({});
      reagir(rr.seguir());
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

  // Cada pergunta nova é lida em voz alta.
  const indice = r?.indice ?? -1;
  const fase = modo === 'rodada' && r ? r.fase : '';
  useEffect(() => {
    const fala = fase === 'pergunta' && r ? falaDaTarefa(r.tarefa, 0) : null;
    if (fala) void speak(fala);
  }, [indice, fase === 'pergunta']);
  /** A apresentação "de novo" fechou: repete a pergunta. */
  const fecharDeNovo = () => {
    setDeNovo(null);
    const rr = rodadaRef.current;
    const fala = rr && rr.fase === 'pergunta' ? falaDaTarefa(rr.tarefa, rr.montadas.length) : null;
    if (fala) void speak(fala);
  };

  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tecla = teclaDe(e);
      if (tecla === null) return;
      if (screen.value !== 'cena') return;
      const confirma = tecla === 'Enter' || tecla === ' ';
      const digito = /^[1-9]$/.test(tecla) ? Number(tecla) : 0;
      const m = modoRef.current;
      if (m === 'menu') {
        if (confirma) {
          e.preventDefault();
          comecar();
        } else if (tecla === 'Escape') go('hub');
        else if (digito && LUGARES[digito - 1]) comecar(LUGARES[digito - 1]!);
        return;
      }
      if (m === 'resumo') {
        if (confirma) {
          e.preventDefault();
          comecar();
        } else if (tecla === 'Escape') setModo('menu');
        return;
      }
      const rr = rodadaRef.current;
      if (!rr) return;
      if (tecla === 'Escape') return parar();
      // Apresentação e lição na tela: as teclas são dela (core/Apresentacao.tsx).
      if (rr.fase === 'apresenta' || rr.fase === 'licao' || deNovoRef.current) return;
      if (tecla.toLowerCase() === 'r') {
        const fala = falaDaTarefa(rr.tarefa, rr.montadas.length);
        if (fala) void speak(fala);
        return;
      }
      if (tecla === 'ArrowUp' || tecla === 'ArrowDown' || tecla === 'ArrowLeft' || tecla === 'ArrowRight') {
        e.preventDefault();
        cursorRef.current = vizinho(caixas(lugarRef.current), cursorRef.current, tecla as Direcao);
        const c = lugarRef.current.coisas.find((x) => x.id === cursorRef.current);
        if (c && rr.fase === 'pergunta' && !rr.tarefa.pecas) sfx.click();
        redesenhar();
        return;
      }
      if (rr.fase === 'pergunta' && rr.tarefa.pecas && digito) {
        reagir(rr.peca(digito - 1));
        return;
      }
      if (rr.fase === 'pergunta' && rr.tarefa.marcada && digito) {
        reagir(rr.escolher(digito - 1));
        return;
      }
      if (confirma) {
        e.preventDefault();
        if (rr.fase === 'pergunta' && rr.tarefa.marcada) return;
        if (rr.fase === 'pergunta' && !rr.tarefa.pecas) {

          if (cursorRef.current) reagir(rr.clicar(cursorRef.current));
        } else seguir();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  if (modo === 'rodada' && r) {
    const cabeca = (
      <header class="km-top">
        <button class="ghost" onClick={parar}>
          Parar <kbd>Esc</kbd>
        </button>
        <div class="gr-progress" data-testid="cn-progresso">
          <span lang="ja">{lugarRef.current.jp}</span> · {r.indice + 1} de {TAREFAS_POR_RODADA} · <b>{r.pontos}</b> pontos
          {r.combo > 1 && <span class="combo on"> · combo {r.combo}</span>}
        </div>
        <span class="gr-note" data-testid="cn-nota">{nota}</span>
      </header>
    );
    // Na apresentação ainda não há tarefa: só as coisas da cena, uma a uma, brilhando.
    if (r.fase === 'apresenta') {
      return (
        <main class="cn">
          {cabeca}
          <Apresentacao itens={r.apresentadas.map(itemDaCena)} onFim={seguir} fim="Começar" onItem={(item) => setDestaque(item.chaves[0] ?? null)} />
          <Cena r={r} cursor={null} onClick={() => undefined} mostrados={{}} destaque={destaque} />
        </main>
      );
    }
    const t = r.tarefa;
    return (
      <main class="cn">
        {cabeca}

        {r.fase === 'licao' ? (
          <div data-testid="cn-licao">
            <Apresentacao key={t.etapa} itens={[itemDaEtapa(t.etapa)]} onFim={seguir} fim="Entendi" />
          </div>
        ) : deNovo ? (
          <>
            <Apresentacao key={deNovo.chaves[0]} itens={[deNovo]} modo="de-novo" onFim={fecharDeNovo} fim="Tentar de novo" />
            <Cena r={r} cursor={cursorRef.current} onClick={() => undefined} mostrados={mostrados} />
          </>
        ) : (
          <>
            <section class="cn-pedido" data-testid="cn-pedido">
              <button class="ghost cn-ouvir" onClick={() => {
                  const fala = falaDaTarefa(t, r.montadas.length);
                  if (fala) void speak(fala);
                }} title="Ouvir de novo">
                <kbd>R</kbd>
              </button>
              {r.apoio && r.fase === 'pergunta' && (
                <span class="ap-pratica" data-testid="cn-pratica">
                  Prática: errar aqui não tira nada
                </span>
              )}
              {t.marcada ? (
                <div class="cn-nome-pergunta">
                  <p class="cn-frase" lang="ja" data-testid="cn-frase">
                    {r.fase === 'feita' ? <Frase segs={t.segs} /> : <Frase segs={PERGUNTA_NOME} />}
                  </p>
                  {r.fase === 'pergunta' && (
                    <div class="cn-opcoes" data-testid="cn-opcoes">
                      {r.opcoes.map((w, i) => (
                        <button key={w.id} class="gr-block" onClick={() => reagir(r.escolher(i))} data-palavra={w.id} data-certa={w === t.palavras[0] ? 'sim' : undefined}>
                          <kbd>{i + 1}</kbd>
                          <span lang="ja">
                            <Frase segs={[w.jp !== w.kana ? { t: w.jp, r: w.kana } : { t: w.jp }]} />
                          </span>
                          {r.apoio && <small>{w.pt}</small>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : t.pecas ? (
                <div class="cn-montar">
                  <p class="muted">Monte a frase sobre o que está marcado:</p>
                  <p class="cn-montada" lang="ja" data-testid="cn-montada">
                    <Frase segs={r.montadas} />
                    {r.fase === 'pergunta' && <span class="gr-hole">？</span>}
                  </p>
                  {r.fase === 'pergunta' && (
                    <div class="cn-bandeja" data-testid="cn-bandeja">
                      {r.bandeja.map((s, i) => (
                        <button key={`${s.t}${i}`} class={`gr-block${r.erros >= 2 && i === r.pecaCerta ? ' hint' : ''}`} onClick={() => reagir(r.peca(i))}>
                          <kbd>{i + 1}</kbd>
                          <span lang="ja">
                            <Frase segs={[s]} />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p class="cn-frase" lang="ja" data-testid="cn-frase">
                  <Frase segs={t.segs} />
                </p>
              )}
              {r.apoio && r.fase === 'pergunta' && !t.marcada && <Dica r={r} />}

              {r.fase === 'feita' && (
                <button class="primary" onClick={seguir} data-testid="cn-seguir">
                  {r.indice + 1 < TAREFAS_POR_RODADA ? 'Próxima' : 'Ver o resumo'} <kbd>Enter</kbd>
                </button>
              )}
            </section>
            <Cena r={r} cursor={cursorRef.current} onClick={clicar} mostrados={mostrados} />
          </>
        )}

        <footer class="av-keys">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <kbd>←</kbd>
            <kbd>→</kbd> andar pela cena, <kbd>Enter</kbd> escolher
          </span>
          {t.pecas && (
            <span>
              <kbd>1</kbd>–<kbd>{Math.max(1, r.bandeja.length)}</kbd> peça
            </span>
          )}
          <span>
            <kbd>R</kbd> ouvir
          </span>
        </footer>
      </main>
    );
  }

  if (modo === 'resumo' && resumo) {
    return (
      <main class="cn">
        <section class="av-panel" data-testid="cn-resumo">
          <span class="muted">Rodada concluída · {lugarRef.current.pt}</span>
          <h2 class={resumo.recorde ? 'big win' : 'big'}>
            {resumo.pontos} pontos{resumo.recorde ? ' · recorde!' : ''}
          </h2>
          <div class="summary">
            <div>
              <b>
                {resumo.dePrimeira}/{resumo.tarefas}
              </b>
              <span>de primeira</span>
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
            <p class="muted" lang="ja">
              Palavras novas: {resumo.novas.map((w) => w.jp).join('、')}
            </p>
          )}
          {resumo.abertas.length > 0 && <p class="notice">Etapa nova aberta: {resumo.abertas.map((e) => ETAPA_INFO[e].titulo).join(', ')}</p>}
          <div class="actions center">
            <button class="primary" onClick={() => comecar()} data-testid="cn-outra">
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

  const sugerido = lugarDaVez(save);
  lugarRef.current = sugerido;
  return (
    <main class="cn">
      <header class="km-top">
        <button class="ghost" onClick={() => go('hub')}>
          Fliperama <kbd>Esc</kbd>
        </button>
        <div class="gr-progress">
          <b>Cena Viva</b> · lugares do Japão
        </div>
        <span />
      </header>
      <section class="av-panel" data-testid="cn-menu">
        <p class="muted">Lugares de verdade, cheios de coisas. Ache o que a frase pede e clique. Começa com uma palavra só e cresce até frases longas com lugar, cor, número e ação.</p>
        <button class="play-now" style={{ '--cena': `url("${figuraUrl(sugerido.fundo)}")` }} onClick={() => comecar(sugerido)} data-testid="cn-start">
          <span class="play-now-main">{save.rounds > 0 ? 'Nova rodada' : 'Começar'}</span>
          <span class="play-now-sub">
            <span lang="ja">{sugerido.jp}</span> · {sugerido.pt} · {TAREFAS_POR_RODADA} pedidos <kbd>Enter</kbd>
          </span>
        </button>
        <ol class="cn-lugares" data-testid="cn-lugares">
          {LUGARES.map((l, i) => (
            <li key={l.id}>
              <button onClick={() => comecar(l)} data-lugar={l.id}>
                <kbd>{i + 1}</kbd>
                <span lang="ja">{l.jp}</span>
                <small>
                  {l.pt} · {l.coisas.length} coisas{save.lugares[l.id] ? ` · ${save.lugares[l.id]}×` : ''}
                </small>
              </button>
            </li>
          ))}
        </ol>
        <ol class="gr-points" data-testid="cn-etapas">
          {ETAPAS.map((e, i) => {
            const aberta = i < save.etapas;
            const info = ETAPA_INFO[e];
            return (
              <li key={e} class={`gr-point ${aberta ? (save.licoes.includes(e) ? 'seen' : 'next') : 'locked'}`}>
                <span class="gr-point-blocks">{info.nivel}</span>
                <span class="gr-point-title">
                  {aberta ? info.titulo : i === save.etapas ? `Abre com ${ACERTOS_PARA_ABRIR} acertos de primeira na etapa anterior` : 'Mais adiante'}
                </span>
                {aberta && <span class="gr-stars">{save.acertos[e] ?? 0} acertos</span>}
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
