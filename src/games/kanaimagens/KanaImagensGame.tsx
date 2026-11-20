import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { KANA_IMAGENS, LOTES, kanaItem, type KanaItem } from '../../content/kana';
import { app, commit, go, kanaImagensSave, screen } from '../../core/app';
import { sfx, speakWord } from '../../core/audio';
import { acertou, cor, corStyle, errou, zerar } from '../../core/cor';
import { onomato } from '../../core/fx';
import { masteryLevel } from '../../core/srs';
import { teclaDe } from '../../core/teclas';
import { BLOCOS, MODOS, RODADA, Rodada, somEhPista, TesteEntrada, type Evento, type Modo, type Pergunta, type Resumo, type ResultadoTeste } from './engine';
import { Imagem } from './Imagem';
import './kanaimagens.css';

type Fase = 'menu' | 'rodada' | 'resumo' | 'teste' | 'teste-fim';
type ModoTreino = Exclude<Modo, 'apresenta' | 'leitura'>;

/** Toda fala do jogo passa por aqui: letras, exemplos e palavras são gravados na voz de palavra. */
function ouvir(texto: string): void {
  void speakWord(texto);
}

/** Depois de um acerto, a próxima pergunta vem sozinha. */
const ESPERA_ACERTO_MS = 750;

function Opcoes({ p, respondida, onEscolha }: { p: Pergunta; respondida: number | null; onEscolha: (i: number) => void }) {
  const imagem = p.modo === 'letra-imagem';
  return (
    <div class={`ki-opcoes${imagem ? ' imagens' : ''}${p.opcoes.length <= 3 ? ' poucas' : ''}`} data-testid="ki-opcoes">
      {p.opcoes.map((o, i) => {
        const estado = respondida === null ? '' : i === p.certa ? ' certa' : i === respondida ? ' errada' : ' apagada';
        return (
          <button key={i} class={`ki-opcao${estado}`} data-certa={i === p.certa ? 'sim' : 'nao'} disabled={respondida !== null} onClick={() => onEscolha(i)}>
            <kbd>{i + 1}</kbd>
            {o.item && imagem ? (
              <Imagem item={o.item} letra={respondida !== null} />
            ) : o.item ? (
              <span class="ki-op-letra" lang="ja">
                {o.item.char}
              </span>
            ) : (
              <span class={p.modo === 'relampago' || p.modo === 'leitura' ? 'ki-op-texto' : 'ki-op-letra'} lang={p.modo === 'som' ? 'ja' : undefined}>
                {o.texto}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** A lição do kana: imagem com a letra, som, frase, exemplo e o que confunde. */
function Licao({ k, compacta = false }: { k: KanaItem; compacta?: boolean }) {
  return (
    <div class={`ki-licao${compacta ? ' compacta' : ''}`} data-testid="ki-licao">
      <Imagem item={k} class="ki-licao-img" />
      <div class="ki-licao-texto">
        <p class="ki-char" lang="ja">
          {k.char} <span class="ki-romaji">{k.romaji}</span>
        </p>
        {k.soa && <p class="ki-soa">Soa: {k.soa}</p>}
        <p class="ki-mnemo">{k.mnemonico}</p>
        {!compacta && (
          <button class="ki-exemplo" onClick={() => ouvir(k.exemplo.kana)} title="Ouvir o exemplo (E)">
            <span lang="ja">{k.exemplo.jp !== k.exemplo.kana ? `${k.exemplo.kana} (${k.exemplo.jp})` : k.exemplo.kana}</span>
            <small>{k.exemplo.pt}</small>
          </button>
        )}
        {!compacta && k.nota && <p class="ki-nota">{k.nota}</p>}
        {!compacta && k.parecidos.length > 0 && (
          <p class="ki-parecidos">
            Não confunda com:{' '}
            {k.parecidos.map((id) => (
              <b key={id} lang="ja">
                {kanaItem(id).char}
              </b>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}

function Enunciado({ p }: { p: Pergunta }) {
  const k = p.alvo;
  switch (p.modo) {
    case 'imagem-letra':
      return (
        <>
          <p class="ki-pede">Que letra mora nesta imagem?</p>
          {k && <Imagem item={k} letra={false} class="ki-grande" />}
          {k && p.novo && <p class="ki-dica">{k.cena.objeto}</p>}
        </>
      );
    case 'letra-imagem':
      return (
        <>
          <p class="ki-pede">Qual é a imagem desta letra?</p>
          <p class="ki-letra-grande" lang="ja">{k?.char}</p>
        </>
      );
    case 'pares':
      return (
        <>
          <p class="ki-pede">Ouça e olhe a cena. Qual destas é?</p>
          {k && <Imagem item={k} letra={false} class="ki-media" />}
        </>
      );
    case 'som':
      return (
        <>
          <p class="ki-pede">{k && k.exemplo.kana === p.fala && p.opcoes.some((o) => o.texto) ? 'Ouça a palavra. Qual é a grafia certa?' : 'Ouça. Qual é a letra?'}</p>
          <button class="ki-som" onClick={() => ouvir(p.fala)} data-testid="ki-som" aria-label="Ouvir de novo">
            <span aria-hidden="true">♪</span> <kbd>R</kbd>
          </button>
        </>
      );
    case 'relampago':
      return (
        <>
          <p class="ki-pede">Leia rápido. O que é?</p>
          <p class="ki-palavra" lang="ja" data-testid="ki-palavra">{p.palavra?.kana}</p>
        </>
      );
    case 'leitura':
      return (
        <>
          <p class="ki-pede">Como se lê?</p>
          <p class="ki-letra-grande" lang="ja">{k?.char}</p>
        </>
      );
    default:
      return null;
  }
}

export function KanaImagensGame() {
  const save = kanaImagensSave();
  const [fase, setFaseState] = useState<Fase>('menu');
  // Teclas seguidas chegam antes de a tela redesenhar: o teclado lê a fase daqui.
  const faseRef = useRef<Fase>('menu');
  const setFase = (f: Fase) => {
    faseRef.current = f;
    setFaseState(f);
  };
  const [, setFrame] = useState(0);
  const redraw = () => setFrame((n) => n + 1);
  const rodadaRef = useRef<Rodada | null>(null);
  const testeRef = useRef<TesteEntrada | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [resultado, setResultado] = useState<ResultadoTeste | null>(null);
  const [aviso, setAviso] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const disponiveis = Rodada.modosDisponiveis(app.data.cards);
  const novato = save.rodadas === 0 && !save.teste;

  const limparTimer = () => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
  };
  useEffect(() => limparTimer, []);

  const deps = () => ({ cards: app.data.cards, profile: app.data.profile, save, rng: Math.random, now: () => Date.now() });

  const comecar = (modo?: ModoTreino) => {
    limparTimer();
    if (modo && !disponiveis.has(modo)) return;
    rodadaRef.current = new Rodada(deps(), modo);
    zerar();
    setResumo(null);
    setAviso('');
    setFase('rodada');
    sfx.click();
    falarAoMostrar(rodadaRef.current.atual);
  };

  const comecarTeste = () => {
    limparTimer();
    testeRef.current = new TesteEntrada(deps());
    zerar();
    setResultado(null);
    setFase('teste');
    sfx.click();
  };

  /** Apresentação, "só pelo som" e pares falam logo que aparecem. */
  const falarAoMostrar = (p: Pergunta | undefined) => {
    if (p && somEhPista(p.modo)) ouvir(p.fala);
  };

  const reagir = (eventos: Evento[]) => {
    for (const e of eventos) {
      if (e.t === 'acerto') {
        sfx.hit(e.combo);
        if (e.rapido) sfx.fast();
        acertou(e.combo);
        onomato(e.rapido ? 'rapido' : 'acerto', document.querySelector('.ki-opcao.certa'), 'shu', 0.9);
      } else if (e.t === 'erro') {
        sfx.miss();
        errou();
        onomato('erro', document.querySelector('.ki-opcao.errada'), 'tinta', 0.8);
      } else if (e.t === 'lote') {
        setAviso(`Abriu: ${e.titulo}`);
      } else if (e.t === 'nivel') {
        sfx.levelup();
        setAviso(`Nível ${e.nivel}!`);
      } else if (e.t === 'fim') {
        sfx.chest();
        setResumo(e.resumo);
        setFase('resumo');
      }
    }
    commit();
    redraw();
  };

  const seguir = () => {
    limparTimer();
    const r = rodadaRef.current;
    if (!r) return;
    reagir(r.seguir());
    if (!r.fim) falarAoMostrar(r.atual);
  };

  const escolher = (i: number) => {
    const r = rodadaRef.current;
    if (!r || r.respondida !== null) return;
    const p = r.atual;
    const ev = r.responder(i);
    if (ev.length === 0) return;
    reagir(ev);
    // Depois de responder, a voz confirma o som certo.
    if (p.modo === 'relampago' && p.palavra) ouvir(p.palavra.kana);
    else if (p.modo === 'imagem-letra' || p.modo === 'letra-imagem') ouvir(p.fala);
    if (ev.some((e) => e.t === 'acerto')) timer.current = window.setTimeout(seguir, ESPERA_ACERTO_MS);
  };

  const escolherTeste = (i: number) => {
    const t = testeRef.current;
    if (!t) return;
    const certo = t.responder(i);
    if (certo === null) return;
    if (certo) sfx.hit(1);
    else sfx.click();
    commit();
    redraw();
    timer.current = window.setTimeout(seguirTeste, certo ? 450 : 1100);
  };

  const seguirTeste = () => {
    limparTimer();
    const t = testeRef.current;
    if (!t) return;
    const res = t.seguir();
    commit();
    if (res) {
      setResultado(res);
      setFase('teste-fim');
    }
    redraw();
  };

  const pararTeste = () => {
    limparTimer();
    const t = testeRef.current;
    if (!t) return setFase('menu');
    setResultado(t.parar());
    commit();
    setFase('teste-fim');
  };

  // Ligado junto com o desenho da tela: tecla apertada logo que a tela aparece não se perde.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tecla = teclaDe(e);
      if (tecla === null) return;
      if (screen.value !== 'kanaimagens') return;
      const confirma = tecla === 'Enter' || tecla === ' ';
      const num = /^[1-9]$/.test(tecla) ? Number(tecla) : 0;
      if (confirma) e.preventDefault();
      const f = faseRef.current;
      if (f === 'menu') {
        if (tecla === 'Escape') go('hub');
        else if (confirma) comecar();
        else if (tecla.toLowerCase() === 't') comecarTeste();
        else if (num >= 1 && num <= MODOS.length) {
          const m = (MODOS[num - 1] as { modo: Modo }).modo;
          if (m === 'apresenta') comecar();
          else comecar(m as ModoTreino);
        }
      } else if (f === 'rodada') {
        const r = rodadaRef.current;
        if (!r) return;
        if (tecla === 'Escape') {
          limparTimer();
          zerar();
          setFase('menu');
          return;
        }
        const p = r.atual;
        // Antes de responder, R só repete o som onde o som é a pista; nos outros ele entregaria a resposta.
        if (tecla.toLowerCase() === 'r') {
          if (r.respondida !== null || somEhPista(p.modo)) ouvir(p.fala);
        }
        else if (tecla.toLowerCase() === 'e' && p.alvo && (p.modo === 'apresenta' || r.respondida !== null)) ouvir(p.alvo.exemplo.kana);
        else if (p.modo === 'apresenta' || r.respondida !== null) {
          if (confirma) seguir();
        } else if (num) escolher(num - 1);
      } else if (f === 'resumo') {
        if (tecla === 'Escape') setFase('menu');
        else if (confirma) comecar();
      } else if (f === 'teste') {
        const t = testeRef.current;
        if (tecla === 'Escape') pararTeste();
        else if (t && t.respondida !== null && confirma) seguirTeste();
        else if (num) escolherTeste(num - 1);
      } else if (f === 'teste-fim') {
        if (tecla === 'Escape') setFase('menu');
        else if (confirma) comecar();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  const r = rodadaRef.current;
  if (fase === 'rodada' && r && !r.fim) {
    const p = r.atual;
    const respondeu = r.respondida !== null;
    const errou = respondeu && r.respondida !== p.certa;
    return (
      <main class="ki">
        <header class="km-top">
          <button class="ghost" onClick={() => setFase('menu')}>
            Sair <kbd>Esc</kbd>
          </button>
          <div class="gr-progress" data-testid="ki-progresso">
            {p.modo === 'apresenta' ? 'Kana novo' : `Pergunta ${Math.min(RODADA, r.feitas + (respondeu ? 0 : 1))} de ${RODADA}`}
            {r.combo > 1 && (
              <>
                {' '}· combo <b>{r.combo}</b>
              </>
            )}
          </div>
          <span class="gr-note" data-testid="ki-aviso">{aviso}</span>
        </header>

        <section class={`ki-quadro modo-${p.modo}`} data-testid="ki-quadro" data-modo={p.modo} style={corStyle(cor.value)}>
          {p.modo === 'apresenta' && p.alvo ? (
            <>
              <span class="gr-tag">Kana novo</span>
              <Licao k={p.alvo} />
              <button class="primary" onClick={seguir} data-testid="ki-entendi">
                Entendi <kbd>Enter</kbd>
              </button>
            </>
          ) : (
            <>
              <Enunciado p={p} />
              <Opcoes p={p} respondida={r.respondida} onEscolha={escolher} />
              {errou && p.alvo && (
                <div class="ki-volta" data-testid="ki-volta">
                  <p class="muted">Esta era a certa. Ela volta daqui a pouco.</p>
                  <Licao k={p.alvo} compacta />
                </div>
              )}
              {errou && p.palavra && (
                <p class="ki-volta" data-testid="ki-volta" lang="ja">
                  {p.palavra.kana} · {p.palavra.pt}
                </p>
              )}
              {respondeu && (
                <button class={errou ? 'primary' : 'ghost'} onClick={seguir} data-testid="ki-seguir">
                  Seguir <kbd>Enter</kbd>
                </button>
              )}
            </>
          )}
        </section>

        <footer class="av-keys">
          {p.modo === 'apresenta' || respondeu ? (
            <span>
              <kbd>Enter</kbd> seguir
            </span>
          ) : (
            <span>
              <kbd>1</kbd>–<kbd>{p.opcoes.length}</kbd> responder
            </span>
          )}
          <span>
            <kbd>R</kbd> ouvir
          </span>
          {p.alvo && (p.modo === 'apresenta' || respondeu) && (
            <span>
              <kbd>E</kbd> ouvir o exemplo
            </span>
          )}
        </footer>
      </main>
    );
  }

  const t = testeRef.current;
  if (fase === 'teste' && t && !t.fim) {
    const p = t.atual;
    return (
      <main class="ki">
        <header class="km-top">
          <button class="ghost" onClick={pararTeste}>
            Parar o teste <kbd>Esc</kbd>
          </button>
          <div class="gr-progress" data-testid="ki-teste-bloco">
            Teste rápido · <b>{t.tituloBloco}</b> · {t.i + 1} de {t.perguntas.length}
          </div>
          <span />
        </header>
        <section class="ki-quadro" data-testid="ki-teste" data-modo="leitura">
          <Enunciado p={p} />
          <Opcoes p={p} respondida={t.respondida} onEscolha={escolherTeste} />
        </section>
        <footer class="av-keys">
          <span>
            <kbd>1</kbd>–<kbd>4</kbd> responder
          </span>
          <span>
            <kbd>Esc</kbd> parar e começar dali
          </span>
        </footer>
      </main>
    );
  }

  if (fase === 'teste-fim' && resultado) {
    return (
      <main class="ki">
        <section class="av-panel" data-testid="ki-teste-fim">
          <span class="muted">Teste rápido</span>
          <h2 class="big">{resultado.sabe.length > 0 ? 'Você já lê bastante coisa' : 'Vamos do começo'}</h2>
          {resultado.sabe.length > 0 && (
            <p>
              Já conta como sabido: <b>{resultado.sabe.join(', ')}</b>. Esses kana voltam de vez em quando para revisar, sem apresentação.
            </p>
          )}
          {resultado.comeca ? <p>Começamos em: <b>{resultado.comeca}</b>.</p> : <p>Passou em tudo. Agora é revisar e ler palavras inteiras.</p>}
          <div class="actions center">
            <button class="primary" onClick={() => comecar()} data-testid="ki-jogar">
              Jogar <kbd>Enter</kbd>
            </button>
            <button class="ghost" onClick={() => setFase('menu')}>
              Menu <kbd>Esc</kbd>
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (fase === 'resumo' && resumo) {
    return (
      <main class="ki">
        <section class="av-panel" data-testid="ki-resumo">
          <span class="muted">Rodada concluída</span>
          <h2 class={resumo.recorde ? 'big win' : 'big'}>
            {resumo.acertos} de {resumo.perguntas}
            {resumo.recorde ? ' · recorde de combo!' : ''}
          </h2>
          <div class="summary">
            <div>
              <b>{resumo.novos.length}</b>
              <span>kana novos</span>
            </div>
            <div>
              <b>{resumo.comboMax}</b>
              <span>melhor combo</span>
            </div>
            <div>
              <b class="gain">+{resumo.xp}</b>
              <span>XP</span>
            </div>
            <div>
              <b>+{resumo.moedas}</b>
              <span>moedas</span>
            </div>
          </div>
          {resumo.lotes.length > 0 && <p data-testid="ki-lotes">Abriu: <b>{resumo.lotes.join(', ')}</b></p>}
          {resumo.errados.length > 0 && (
            <>
              <h3>Para olhar de novo</h3>
              <div class="ki-rever">
                {resumo.errados.map((k) => (
                  <Licao key={k.id} k={k} compacta />
                ))}
              </div>
            </>
          )}
          <div class="actions center">
            <button class="primary" onClick={() => comecar()} data-testid="ki-outra">
              Outra rodada <kbd>Enter</kbd>
            </button>
            <button class="ghost" onClick={() => setFase('menu')}>
              Parar aqui <kbd>Esc</kbd>
            </button>
          </div>
        </section>
      </main>
    );
  }

  const cards = app.data.cards;
  return (
    <main class="ki">
      <header class="km-top">
        <button class="ghost" onClick={() => go('hub')}>
          Fliperama <kbd>Esc</kbd>
        </button>
        <div class="gr-progress">
          <b>Kana em imagens</b> · cada letra é um desenho
        </div>
        <span />
      </header>
      <section class="av-panel" data-testid="ki-menu">
        <p class="muted">Cada kana mora dentro de uma imagem: し é um anzol, つ é uma onda. Primeiro você vê a imagem, depois ela vai sumindo até sobrar só a letra.</p>
        <button class="play-now" onClick={() => comecar()} data-testid="ki-comecar">
          <span class="play-now-main">{novato ? 'Começar do zero' : 'Jogar'}</span>
          <span class="play-now-sub">
            {novato ? 'Três kana novos por rodada' : `${save.rodadas} ${save.rodadas === 1 ? 'rodada' : 'rodadas'} · melhor combo ${save.recorde}`} <kbd>Enter</kbd>
          </span>
        </button>
        <button class="ki-teste-btn" onClick={comecarTeste} data-testid="ki-teste-btn">
          {save.teste ? 'Refazer o teste rápido' : 'Já lê kana? Faça o teste rápido e pule o que já sabe'} <kbd>T</kbd>
        </button>

        <h3>Modos</h3>
        <ol class="ki-modos" data-testid="ki-modos">
          {MODOS.map((m) => {
            const pode = disponiveis.has(m.modo);
            return (
              <li key={m.modo}>
                <button
                  class="ki-modo"
                  disabled={!pode}
                  data-modo={m.modo}
                  onClick={() => (m.modo === 'apresenta' ? comecar() : comecar(m.modo as ModoTreino))}
                  title={pode ? '' : 'Abre quando houver kana vistos o bastante'}
                >
                  <kbd>{m.tecla}</kbd> {m.nome}
                </button>
              </li>
            );
          })}
        </ol>

        <h3>Caminho</h3>
        <ul class="ki-caminho" data-testid="ki-caminho">
          {BLOCOS.map((b) => {
            const ids = b.lotes.flatMap((i) => (LOTES[i] as { ids: string[] }).ids);
            const vistos = ids.filter((id) => cards[kanaItem(id).carta]).length;
            const firmes = ids.filter((id) => masteryLevel(cards[kanaItem(id).carta]) >= 3).length;
            const aberto = (b.lotes[0] as number) < save.abertos;
            return (
              <li key={b.titulo} class={aberto ? 'aberto' : 'fechado'}>
                <span>{b.titulo}</span>
                <div class="bar">
                  <i class="soft" style={{ width: `${(vistos / ids.length) * 100}%` }} />
                  <i style={{ width: `${(firmes / ids.length) * 100}%` }} />
                </div>
                <small>
                  {vistos}/{ids.length}
                </small>
              </li>
            );
          })}
        </ul>
        <p class="muted">{KANA_IMAGENS.length} kana ao todo. A barra clara é o que você já viu; a escura, o que já está firme.</p>
      </section>
    </main>
  );
}
