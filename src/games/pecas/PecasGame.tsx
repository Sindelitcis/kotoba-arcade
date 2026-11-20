import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { app, commit, go, pecasSave, screen } from '../../core/app';
import { cenaStyle } from '../../core/arte';
import { sfx, speak, speakKanji } from '../../core/audio';
import { acertou, cor, corStyle, errou, zerar } from '../../core/cor';
import { onomato } from '../../core/fx';
import { Pintura } from '../../core/Pintura';
import { teclaDe } from '../../core/teclas';
import { VOZ_PALAVRA } from '../../core/vozes';
import { KANJI_PECAS, peca, type KanjiPeca, type Palavra } from './dados';
import { leituraOficial, MODOS, PecasRound, pecasDoKanji, ROUND_SIZE, vistos, type Evento, type Modo, type Pergunta, type Resumo } from './engine';
import '../../assets/fontes/pecas.css';
import { carregarTracos, CORES_PECA, elementosDe, KanjiDesenho, PecaDesenho, tracos } from './Tracos';

type Tela = 'menu' | 'rodada' | 'resumo';

/** Fala o kanji sozinho (gravação no próprio kanji, porque o kana se repete). */
function falarKanji(k: KanjiPeca) {
  void speakKanji(k.kanji, leituraOficial(k));
}

/** Fala uma palavra: a gravação fica na palavra com kanji (はし ponte e はし palitos têm acento diferente). */
function falarPalavra(p: Pick<Palavra, 'jp' | 'kana'>) {
  void speak(p.jp, VOZ_PALAVRA, p.kana);
}

/** Traz o bloco onde está para dentro da tela quando aparece: a explicação não pode ficar escondida embaixo. */
function Rolar() {
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const alvo = el.current?.parentElement;
    const calmo = document.documentElement.hasAttribute('data-calma') || matchMedia('(prefers-reduced-motion: reduce)').matches;
    alvo?.scrollIntoView?.({ block: 'nearest', behavior: calmo ? 'auto' : 'smooth' });
  }, []);
  return <span ref={el} hidden />;
}

function CartaPeca({ p, cor: c, mostrarNome = true }: { p: string; cor?: string; mostrarNome?: boolean }) {
  const info = peca(p);
  return (
    <span class="pc-carta" data-peca={p}>
      <span class="pc-desenho">
        <PecaDesenho peca={p} cor={c} />
      </span>
      <span class="pc-imagem" aria-hidden="true">
        {info.imagem}
      </span>
      {mostrarNome && <span class="pc-nome">{info.nome}</span>}
    </span>
  );
}

/** O kanji com as peças pintadas e a conta "peça + peça = significado". */
function Explicacao({ k, falar = true }: { k: KanjiPeca; falar?: boolean }) {
  const ps = pecasDoKanji(k);
  return (
    <div class="pc-explica" data-testid="pc-explica">
      <div class="pc-explica-topo">
        <KanjiDesenho kanji={k.kanji} pintar={ps} class="medio" />
        <div class="pc-conta">
          {ps.length > 0 ? (
            <>
              {ps.map((p, i) => (
                <span key={p} class="pc-conta-item">
                  {i > 0 && <span class="pc-mais">+</span>}
                  <CartaPeca p={p} cor={CORES_PECA[i % CORES_PECA.length]} />
                </span>
              ))}
              <span class="pc-mais">=</span>
            </>
          ) : (
            <span class="pc-conta-item">
              <span class="pc-imagem grande" aria-hidden="true">
                {peca(k.kanji).imagem}
              </span>
              <span class="pc-mais">=</span>
            </span>
          )}
          <b class="pc-significado">{k.pt.join(', ')}</b>
        </div>
      </div>
      <p class="pc-historia" data-testid="pc-historia">
        {k.historia}
      </p>
      <p class="pc-leitura" lang="ja">
        <button class="ghost" onClick={() => falarKanji(k)} disabled={!falar}>
          <b>{k.kanji}</b> = {leituraOficial(k)}
        </button>
        <button class="ghost" onClick={() => falarPalavra(k.palavra)}>
          <ruby>
            {k.palavra.jp}
            <rt>{k.palavra.kana}</rt>
          </ruby>{' '}
          <span class="muted">{k.palavra.pt}</span>
        </button>
      </p>
    </div>
  );
}

function Opcao({ i, children, estado, ok, onClick }: { i: number; children: preact.ComponentChildren; estado: string; ok: boolean; onClick: () => void }) {
  return (
    <button class={`pc-opcao ${estado}`} onClick={onClick} data-testid="pc-opcao" data-estado={estado} data-ok={ok ? 'yes' : 'no'}>
      <kbd>{i + 1}</kbd>
      {children}
    </button>
  );
}

export function PecasGame() {
  const save = pecasSave();
  const [tela, setTelaState] = useState<Tela>('menu');
  // Duas teclas seguidas chegam antes de a tela redesenhar: o teclado lê daqui, que muda na hora.
  const telaRef = useRef<Tela>('menu');
  const setTela = (t: Tela) => {
    telaRef.current = t;
    setTelaState(t);
  };
  const [, setFrame] = useState(0);
  const redesenhar = () => setFrame((n) => n + 1);
  const rodadaRef = useRef<PecasRound | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [aviso, setAviso] = useState('');
  const pedidoRef = useRef<Modo | 'misto' | null>(null);
  const rodada = rodadaRef.current;
  void tracos.value;

  const comecar = (modo: Modo | 'misto' = 'misto') => {
    // Os traços chegam em instantes; uma tecla antes disso começa assim que chegarem.
    if (!tracos.value) {
      pedidoRef.current = modo;
      void carregarTracos().then(() => {
        const m = pedidoRef.current;
        pedidoRef.current = null;
        if (m && screen.value === 'pecas') comecar(m);
      });
      return;
    }
    rodadaRef.current = new PecasRound({
      cards: app.data.cards,
      save,
      profile: app.data.profile,
      now: () => Date.now(),
      rng: Math.random,
      elementos: (k) => elementosDe(tracos.value, k),
      modo,
    });
    zerar();
    setResumo(null);
    setAviso('');
    setTela('rodada');
    sfx.click();
  };

  useEffect(() => {
    void carregarTracos().then(redesenhar);
  }, []);

  /** `i`: a alternativa apertada. Ela já está na tela; a pintura de certa/errada só vem no próximo render. */
  const reagir = (events: Evento[], i?: number) => {
    const r = rodadaRef.current;
    const apertada = i === undefined ? null : document.querySelectorAll('.pc-opcao')[i] ?? null;
    for (const e of events) {
      if (e.t === 'acerto') {
        sfx.hit(e.combo);
        if (e.rapido) sfx.fast();
        acertou(e.combo);
        onomato(e.rapido ? 'rapido' : 'acerto', apertada, 'shu', 0.9);
      } else if (e.t === 'erro') {
        sfx.miss();
        errou();
        onomato('erro', document.querySelector('.pc-perguntas'), 'tinta', 0.8);
      } else if (e.t === 'encaixe') {
        sfx.hit(Math.max(1, e.combo));
        onomato('encaixe', document.querySelector('.pc-montagem'), 'shu', 0.8);
      } else if (e.t === 'volta') {
        sfx.click();
        onomato('erro', document.querySelector('.pc-bandeja'), 'tinta', 0.7);
        setAviso(`${peca(e.peca).nome} não está neste kanji.`);
      } else if (e.t === 'pronto') {
        sfx.capture(1);
        if (e.combo > 0) acertou(e.combo);
        onomato('captura', document.querySelector('.pc-montagem'), 'shu');
      } else if (e.t === 'levelup') {
        sfx.levelup();
        setAviso(`Nível ${e.level}!`);
      } else if (e.t === 'fim') {
        sfx.chest();
        setResumo(e.resumo);
        setTela('resumo');
      }
    }
    // A resposta saiu: fala o que foi revelado.
    if (r && r.fase === 'revela' && events.some((e) => e.t === 'acerto' || e.t === 'erro' || e.t === 'pronto')) {
      const p = r.pergunta;
      if (p.modo === 'composto') falarPalavra(p.palavra);
      else if (p.modo === 'intruso') falarKanji(p.diferente);
      else falarKanji(p.k);
    }
    commit();
    redesenhar();
  };

  const responder = (i: number) => {
    const r = rodadaRef.current;
    if (!r) return;
    if (r.pergunta.modo !== 'montar') setAviso('');
    reagir(r.responder(i), i);
  };

  const seguir = () => {
    const r = rodadaRef.current;
    if (!r) return;
    setAviso('');
    reagir(r.seguir());
  };

  const ouvir = () => {
    const r = rodadaRef.current;
    if (!r) return;
    const p = r.pergunta;
    if (p.modo === 'composto') falarPalavra(p.palavra);
    else if (p.modo === 'intruso') falarKanji(r.fase === 'revela' ? p.diferente : p.maioria);
    else falarKanji(p.k);
  };

  // A lição fala o kanji assim que aparece: primeiro contato é ver, ouvir e entender.
  const fase = tela === 'rodada' && rodada ? rodada.fase : '';
  const indice = rodada?.indice ?? -1;
  useEffect(() => {
    if (fase === 'licao' && rodada) falarKanji(rodada.pergunta.k);
  }, [fase, indice]);

  // Sair da tela devolve o quadro ao traço.
  useEffect(() => () => zerar(), []);

  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tecla = teclaDe(e);
      if (tecla === null) return;
      // Na troca de tela este ouvinte ainda vive por um instante.
      if (screen.value !== 'pecas') return;
      const confirma = tecla === 'Enter' || tecla === ' ';
      const numero = /^[1-9]$/.test(tecla) ? Number(tecla) : 0;
      if (confirma) e.preventDefault();
      const t = telaRef.current;
      if (t === 'menu') {
        if (tecla === 'Escape') go('hub');
        else if (confirma) comecar('misto');
        else if (numero >= 1 && numero <= MODOS.length) comecar((MODOS[numero - 1] as (typeof MODOS)[number]).id);
      } else if (t === 'rodada') {
        const r = rodadaRef.current;
        if (!r) return;
        if (tecla === 'Escape') {
          zerar();
          setTela('menu');
        } else if (tecla.toLowerCase() === 'r') ouvir();
        else if (r.fase === 'pergunta') {
          if (numero) responder(numero - 1);
        } else if (confirma) seguir();
      } else if (t === 'resumo') {
        if (tecla === 'Escape') setTela('menu');
        else if (confirma) comecar(rodadaRef.current?.modo ?? 'misto');
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  if (tela === 'rodada' && rodada) {
    const p = rodada.pergunta;
    const revelada = rodada.fase === 'revela';
    return (
      <main class="pc">
        <header class="km-top">
          <button class="ghost" onClick={() => setTela('menu')}>
            Sair <kbd>Esc</kbd>
          </button>
          <div class="pc-progresso" data-testid="pc-progresso">
            {rodada.indice + 1} de {ROUND_SIZE} · <b>{rodada.pontos}</b> pontos{rodada.combo > 1 ? ` · combo ${rodada.combo}` : ''}
          </div>
          <span class="pc-aviso" data-testid="pc-aviso">
            {aviso}
          </span>
        </header>

        <section class="pc-quadro" style={{ ...cenaStyle('pecas-ryoanji'), ...corStyle(cor.value) }} data-testid="pc-quadro" data-modo={p.modo} data-fase={rodada.fase}>
          <Pintura cena="pecas-ryoanji" />
          {rodada.fase === 'licao' ? <Licao p={p} onSeguir={seguir} /> : <PerguntaView p={p} rodada={rodada} onResponder={responder} />}
          {revelada && (
            <div class="pc-revela" data-testid="pc-revela">
              <Rolar />
              <p class={rodada.acertou ? 'pc-veredito certo' : 'pc-veredito'}>{rodada.acertou ? 'Isso!' : 'Olha como é:'}</p>
              {p.modo === 'intruso' ? (
                <div class="pc-par">
                  <Explicacao k={p.diferente} />
                  <Explicacao k={p.maioria} />
                  <p class="pc-diferenca" data-testid="pc-diferenca">
                    {p.diferenca}
                  </p>
                </div>
              ) : p.modo === 'composto' ? (
                <div class="pc-composto-revela">
                  <p class="pc-palavra" lang="ja">
                    <ruby>
                      {p.palavra.jp}
                      <rt>{p.palavra.kana}</rt>
                    </ruby>{' '}
                    = {p.palavra.pt}
                  </p>
                  <div class="pc-par">
                    <Explicacao k={p.palavra.kanji[0]} />
                    <Explicacao k={p.palavra.kanji[1]} />
                  </div>
                </div>
              ) : (
                <Explicacao k={p.k} />
              )}
              <button class="primary" onClick={seguir} data-testid="pc-seguir">
                {rodada.indice + 1 < ROUND_SIZE ? 'Próximo' : 'Ver o resumo'} <kbd>Enter</kbd>
              </button>
            </div>
          )}
        </section>

        <footer class="av-keys">
          {rodada.fase === 'pergunta' ? (
            <span>
              <kbd>1</kbd>–<kbd>{p.modo === 'intruso' ? p.grade.length : p.modo === 'montar' ? p.bandeja.length : p.opcoes.length}</kbd> responder
            </span>
          ) : (
            <span>
              <kbd>Enter</kbd> seguir
            </span>
          )}
          <span>
            <kbd>R</kbd> ouvir
          </span>
        </footer>
      </main>
    );
  }

  if (tela === 'resumo' && resumo) {
    return (
      <main class="pc">
        <section class="av-panel" data-testid="pc-resumo">
          <span class="muted">Rodada concluída</span>
          <h2 class={resumo.recorde ? 'big win' : 'big'}>
            {resumo.pontos} pontos{resumo.recorde ? ' · recorde!' : ''}
          </h2>
          <div class="summary">
            <div>
              <b>
                {resumo.acertos}/{resumo.perguntas}
              </b>
              <span>acertos</span>
            </div>
            <div>
              <b>{resumo.melhorCombo}</b>
              <span>melhor combo</span>
            </div>
            <div>
              <b class="gain">+{resumo.xp}</b>
              <span>XP</span>
            </div>
          </div>
          {resumo.novos.length > 0 && (
            <>
              <h3>Kanji novos</h3>
              <p class="pc-novos" lang="ja" data-testid="pc-novos">
                {resumo.novos.join(' ')}
              </p>
            </>
          )}
          <div class="actions center">
            <button class="primary" onClick={() => comecar(rodada?.modo ?? 'misto')} data-testid="pc-de-novo">
              Outra rodada <kbd>Enter</kbd>
            </button>
            <button class="ghost" onClick={() => setTela('menu')}>
              Parar aqui <kbd>Esc</kbd>
            </button>
          </div>
        </section>
      </main>
    );
  }

  const quantos = vistos(app.data.cards);
  return (
    <main class="pc">
      <header class="km-top">
        <button class="ghost" onClick={() => go('hub')}>
          Fliperama <kbd>Esc</kbd>
        </button>
        <div class="pc-progresso">
          <b>Kanji em peças</b> · o kanji como desenho
        </div>
        <span />
      </header>
      <section class="av-panel" data-testid="pc-menu">
        <p class="muted">
          Todo kanji é feito de peças que se repetem: 休 é uma pessoa (亻) encostada na árvore (木), descansando. Aprenda as peças e o kanji novo vira um desenho que você já conhece.
        </p>
        <button class="play-now" onClick={() => comecar('misto')} data-testid="pc-comecar">
          <span class="play-now-main">{save.rounds > 0 ? 'Nova rodada' : 'Começar'}</span>
          <span class="play-now-sub">
            {quantos > 0 ? `${quantos} de ${KANJI_PECAS.length} kanji vistos · recorde ${save.best}` : `${ROUND_SIZE} perguntas, do N5 ao N3`} <kbd>Enter</kbd>
          </span>
        </button>
        <ol class="pc-modos" data-testid="pc-modos">
          {MODOS.map((m) => (
            <li key={m.id}>
              <button class="pc-modo" onClick={() => comecar(m.id)} data-modo={m.id}>
                <kbd>{m.tecla}</kbd>
                <b>{m.nome}</b>
                <span class="muted">{m.texto}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function Licao({ p, onSeguir }: { p: Pergunta; onSeguir: () => void }) {
  return (
    <div class="pc-licao" data-testid="pc-licao">
      <span class="gr-tag">Kanji novo</span>
      <Explicacao k={p.k} />
      <button class="primary" onClick={onSeguir} data-testid="pc-entendi">
        Entendi <kbd>Enter</kbd>
      </button>
    </div>
  );
}

function estadoOpcao(rodada: PecasRound, i: number, certa: number): string {
  if (rodada.fase !== 'revela') return '';
  if (i === certa) return 'certa';
  if (i === rodada.escolhida) return 'errada';
  return 'apagada';
}

function PerguntaView({ p, rodada, onResponder }: { p: Pergunta; rodada: PecasRound; onResponder: (i: number) => void }) {
  const revelada = rodada.fase === 'revela';
  switch (p.modo) {
    case 'peca':
      return (
        <div class="pc-perguntas">
          <p class="pc-pedido">Qual peça está neste kanji?</p>
          <KanjiDesenho kanji={p.k.kanji} pintar={revelada ? [p.alvo] : []} class="grande" />
          <div class="pc-opcoes">
            {p.opcoes.map((o, i) => (
              <Opcao key={o} i={i} estado={estadoOpcao(rodada, i, p.certa)} ok={i === p.certa} onClick={() => onResponder(i)}>
                <CartaPeca p={o} />
              </Opcao>
            ))}
          </div>
        </div>
      );
    case 'montar':
      return (
        <div class="pc-perguntas">
          <p class="pc-pedido">
            Monte o kanji de <b>{p.k.pt[0]}</b>
          </p>
          <div class="pc-montagem" data-testid="pc-montagem">
            {p.precisa.map((x, i) =>
              p.colocadas.includes(x) ? (
                <CartaPeca key={x} p={x} cor={CORES_PECA[i % CORES_PECA.length]} />
              ) : (
                <span key={x} class="pc-buraco">
                  ？
                </span>
              ),
            )}
            {revelada && <KanjiDesenho kanji={p.k.kanji} pintar={p.precisa} class="medio" />}
          </div>
          {!revelada && (
            <div class="pc-bandeja" data-testid="pc-bandeja">
              {p.bandeja.map((x, i) => (
                <Opcao key={x} i={i} estado={p.colocadas.includes(x) ? 'usada' : p.brilha === i ? 'brilha' : ''} ok={p.precisa.includes(x)} onClick={() => onResponder(i)}>
                  <CartaPeca p={x} />
                </Opcao>
              ))}
            </div>
          )}
        </div>
      );
    case 'intruso':
      return (
        <div class="pc-perguntas">
          <p class="pc-pedido">Qual é diferente?</p>
          <div class="pc-grade">
            {p.grade.map((g, i) => (
              <Opcao key={i} i={i} estado={estadoOpcao(rodada, i, p.certa)} ok={i === p.certa} onClick={() => onResponder(i)}>
                <span class="pc-glifo" lang="ja">
                  {g}
                </span>
              </Opcao>
            ))}
          </div>
        </div>
      );
    case 'adivinhar':
      return (
        <div class="pc-perguntas">
          <p class="pc-pedido">{pecasDoKanji(p.k).length >= 2 ? 'Kanji novo. Pelas peças, o que ele quer dizer?' : 'O que este kanji quer dizer?'}</p>
          <div class="pc-adivinha">
            <KanjiDesenho kanji={p.k.kanji} pintar={pecasDoKanji(p.k)} class="grande" />
            {/* Kanji de uma peça só (日, 山): a imagem da peça já é a resposta, então não aparece. */}
            {pecasDoKanji(p.k).length > 0 && (
              <div class="pc-conta">
                {pecasDoKanji(p.k).map((x, i) => (
                  <CartaPeca key={x} p={x} cor={CORES_PECA[i % CORES_PECA.length]} />
                ))}
              </div>
            )}
          </div>
          <div class="pc-opcoes texto">
            {p.opcoes.map((o, i) => (
              <Opcao key={o} i={i} estado={estadoOpcao(rodada, i, p.certa)} ok={i === p.certa} onClick={() => onResponder(i)}>
                <span>{o}</span>
              </Opcao>
            ))}
          </div>
        </div>
      );
    case 'composto':
      return (
        <div class="pc-perguntas">
          <p class="pc-pedido">Como se lê esta palavra?</p>
          <div class="pc-composto">
            {p.palavra.kanji.map((k) => (
              <div key={k.kanji} class="pc-composto-kanji">
                <KanjiDesenho kanji={k.kanji} pintar={pecasDoKanji(k)} class="medio" />
                <span class="pc-dica">
                  {k.pt[0]} · <span lang="ja">{leituraOficial(k)}</span>
                </span>
              </div>
            ))}
          </div>
          <p class="muted pc-dica-composto">Dica: dentro de palavras a leitura pode mudar.</p>
          <div class="pc-opcoes texto">
            {p.opcoes.map((o, i) => (
              <Opcao key={o} i={i} estado={estadoOpcao(rodada, i, p.certa)} ok={i === p.certa} onClick={() => onResponder(i)}>
                <span lang="ja">{o}</span>
              </Opcao>
            ))}
          </div>
        </div>
      );
  }
}
