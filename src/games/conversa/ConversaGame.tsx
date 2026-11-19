import { useEffect, useRef, useState } from 'preact/hooks';
import { app, commit, conversaSave, go, screen } from '../../core/app';
import { sfx, speak } from '../../core/audio';
import { criarCliente, procurarServidor, type Cliente, type Saude } from './cliente';
import { CENAS, Conversa, proximaCena, type Cena, type Dica, type Evento, type Linha, type Resumo, type Ruby } from './engine';

type Fase = 'procurando' | 'desligado' | 'menu' | 'conversa' | 'resumo';

function RubyText({ ruby }: { ruby: readonly Ruby[] }) {
  return (
    <>
      {ruby.map((r, i) =>
        r.r ? (
          <ruby key={i}>
            {r.t}
            <rt>{r.r}</rt>
          </ruby>
        ) : (
          <span key={i}>{r.t}</span>
        ),
      )}
    </>
  );
}

/** Grava o microfone até `parar()`. */
interface Gravacao {
  parar(): Promise<Blob>;
}

async function gravar(): Promise<Gravacao> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const rec = new MediaRecorder(stream);
  const partes: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size > 0 && partes.push(e.data);
  rec.start();
  return {
    parar: () =>
      new Promise((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(partes, { type: rec.mimeType || 'audio/webm' }));
        };
        rec.stop();
      }),
  };
}

export function ConversaGame() {
  const [fase, setFase] = useState<Fase>('procurando');
  const [saude, setSaude] = useState<Saude | null>(null);
  const [, setFrame] = useState(0);
  const redraw = () => setFrame((n) => n + 1);
  const conversa = useRef<Conversa | null>(null);
  const cliente = useRef<Cliente>(criarCliente());
  const [texto, setTexto] = useState('');
  const [dica, setDica] = useState<Dica | null>(null);
  const [aviso, setAviso] = useState('');
  const [traduzidas, setTraduzidas] = useState<Set<number>>(new Set());
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [ouvindo, setOuvindo] = useState<'nao' | 'gravando' | 'transcrevendo'>('nao');
  const gravacao = useRef<Gravacao | null>(null);
  const inputEl = useRef<HTMLInputElement>(null);
  const listaEl = useRef<HTMLOListElement>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);

  const procurar = async () => {
    setFase('procurando');
    const s = await procurarServidor(location.hostname);
    setSaude(s);
    setFase(s && s.conversa.ok ? 'menu' : 'desligado');
  };

  useEffect(() => {
    void procurar();
    return () => audioEl.current?.pause();
  }, []);

  /** Fala do personagem: voz do servidor local; se ela falhar, a do navegador. */
  const tocar = async (linha: Linha, cena: Cena) => {
    if (!app.data.settings.voice) return;
    audioEl.current?.pause();
    if (saude?.voz.ok) {
      try {
        const blob = await cliente.current.voz(linha.jp, cena.personagem.voz);
        const a = new Audio(URL.createObjectURL(blob));
        audioEl.current = a;
        await a.play();
        return;
      } catch {
        // cai para a voz do navegador
      }
    }
    speak(linha.jp);
  };

  const reagir = (events: Evento[]) => {
    const c = conversa.current;
    if (!c) return;
    for (const e of events) {
      if (e.t === 'linha' && e.linha.quem === 'personagem') void tocar(e.linha, c.cena);
      else if (e.t === 'passo') {
        sfx.capture(1);
        setAviso(`Objetivo: ${e.passo.pt}`);
      } else if (e.t === 'nova') sfx.click();
      else if (e.t === 'dica') setDica(e.dica);
      else if (e.t === 'levelup') {
        sfx.levelup();
        setAviso(`Nível ${e.level}!`);
      } else if (e.t === 'falha') setAviso('O servidor local não respondeu. Sua fala não se perdeu: mande de novo.');
      else if (e.t === 'fim') {
        if (e.resumo.concluida) sfx.chest();
        setResumo(e.resumo);
        setTimeout(() => setFase('resumo'), 1800);
      }
    }
    commit();
    redraw();
    requestAnimationFrame(() => listaEl.current?.lastElementChild?.scrollIntoView({ block: 'nearest' }));
  };

  const comecar = (cena: Cena) => {
    const c = new Conversa(cena, {
      cards: app.data.cards,
      profile: app.data.profile,
      save: conversaSave(),
      rng: Math.random,
      now: () => Date.now(),
      ai: cliente.current,
    });
    conversa.current = c;
    setTexto('');
    setDica(null);
    setAviso('');
    setTraduzidas(new Set());
    setResumo(null);
    setFase('conversa');
    reagir(c.iniciar());
    requestAnimationFrame(() => inputEl.current?.focus());
  };

  const enviar = async (fala: string) => {
    const c = conversa.current;
    if (!c || c.fase !== 'vez' || !fala.trim()) return;
    setTexto('');
    setDica(null);
    setAviso('');
    const pending = c.dizer(fala);
    redraw();
    reagir(await pending);
    requestAnimationFrame(() => inputEl.current?.focus());
  };

  const pedirDica = async () => {
    const c = conversa.current;
    if (!c || c.fase !== 'vez') return;
    setDica(await c.pedirDica());
  };

  const microfone = async () => {
    const c = conversa.current;
    if (!c || c.fase !== 'vez' || !saude?.fala.ok) return;
    if (ouvindo === 'nao') {
      try {
        gravacao.current = await gravar();
        audioEl.current?.pause();
        setOuvindo('gravando');
      } catch {
        setAviso('Não consegui abrir o microfone. Dá para digitar em romaji ou kana.');
      }
      return;
    }
    if (ouvindo !== 'gravando' || !gravacao.current) return;
    setOuvindo('transcrevendo');
    try {
      const audio = await gravacao.current.parar();
      const ultima = [...c.linhas].reverse().find((l) => l.quem === 'personagem');
      const dito = await cliente.current.ouvir(audio, ultima?.jp ?? '');
      setOuvindo('nao');
      if (!dito) {
        setAviso('Não ouvi nada. Tente de novo, mais perto do microfone, ou digite.');
        return;
      }
      await enviar(dito);
    } catch {
      setOuvindo('nao');
      setAviso('O reconhecimento de fala não respondeu. Dá para digitar.');
    }
  };

  const encerrar = () => {
    const c = conversa.current;
    if (!c) return;
    audioEl.current?.pause();
    setResumo(c.encerrar());
    commit();
    setFase('resumo');
  };

  const traduzir = (i: number) => {
    const next = new Set(traduzidas);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setTraduzidas(next);
  };

  const ultimaDoPersonagem = (): number => {
    const linhas = conversa.current?.linhas ?? [];
    for (let i = linhas.length - 1; i >= 0; i--) if (linhas[i]?.quem === 'personagem') return i;
    return -1;
  };

  // O tratador é trocado a cada desenho, na hora: com useEffect ele só trocava depois da pintura, e um
  // Enter apertado logo que o menu aparecia caía no tratador velho e se perdia.
  const teclaRef = useRef<(e: KeyboardEvent) => void>(() => {});
  teclaRef.current = (e: KeyboardEvent) => {
    if (screen.value !== 'conversa') return;
    const noCampo = e.target === inputEl.current;
    if (fase === 'conversa') {
      if (e.key === 'Escape') {
        e.preventDefault();
        encerrar();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        void pedirDica();
      } else if (e.key === 'F2' || (e.key === ' ' && (!noCampo || texto === ''))) {
        e.preventDefault();
        void microfone();
      } else if (e.key === 'F1') {
        e.preventDefault();
        const i = ultimaDoPersonagem();
        if (i >= 0) traduzir(i);
      } else if (e.key === 'F3') {
        e.preventDefault();
        const c = conversa.current;
        const i = ultimaDoPersonagem();
        if (c && i >= 0) void tocar(c.linhas[i] as Linha, c.cena);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (fase === 'resumo') setFase('menu');
      else go('hub');
    } else if (fase === 'menu' && /^[1-9]$/.test(e.key)) {
      const cena = CENAS[Number(e.key) - 1];
      if (cena) comecar(cena);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (fase === 'menu' || fase === 'resumo') comecar(proximaCena(conversaSave()));
      else if (fase === 'desligado') void procurar();
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => teclaRef.current(e);
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const voltar = (
    <button class="ghost" onClick={() => go('hub')}>
      ← Fliperama <kbd>Esc</kbd>
    </button>
  );

  if (fase === 'procurando') {
    return (
      <main class="cv" data-testid="cv" data-phase="procurando">
        <header class="km-top">{voltar}</header>
        <p class="muted cv-center">Procurando a IA no seu PC...</p>
      </main>
    );
  }

  if (fase === 'desligado') {
    return (
      <main class="cv" data-testid="cv" data-phase="desligado">
        <header class="km-top">{voltar}</header>
        <section class="av-panel" data-testid="cv-off">
          <span class="tile-jp" lang="ja">
            会話
          </span>
          <h2 class="big">Conversa por voz</h2>
          <p class="cv-off-text">
            Este jogo roda só no seu PC: abra a pasta do Kotoba Arcade, rode <code>npm run local</code> e jogue em <code>http://localhost:5173</code>.
          </p>
          {saude && !saude.conversa.ok && <p class="muted">O servidor local respondeu, mas o modelo {saude.conversa.modelo} não está no Ollama.</p>}
          <div class="actions center">
            <button class="primary" onClick={() => void procurar()} data-testid="cv-retry">
              Procurar de novo <kbd>Enter</kbd>
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (fase === 'menu') {
    const save = conversaSave();
    const sugerida = proximaCena(save);
    return (
      <main class="cv" data-testid="cv" data-phase="menu">
        <header class="km-top">
          {voltar}
          <span class="muted">
            {save.concluidas} {save.concluidas === 1 ? 'conversa concluída' : 'conversas concluídas'}
          </span>
        </header>
        <section class="av-panel">
          <p class="muted">Escolha uma situação. Fale no microfone ou digite em romaji ou kana. Cada conversa leva de 2 a 4 minutos.</p>
          <button class="play-now" onClick={() => comecar(sugerida)} data-testid="cv-start">
            <span class="play-now-main">{sugerida.titulo}</span>
            <span class="play-now-sub">
              {sugerida.resumo} <kbd>Enter</kbd>
            </span>
          </button>
          <div class="av-scenes">
            {CENAS.map((c, i) => (
              <button key={c.id} class={save.cenas[c.id] ? 'tile done' : 'tile'} onClick={() => comecar(c)} data-scene={c.id}>
                <span class="tile-jp" lang="ja">
                  {c.jp}
                </span>
                <span class="tile-title">
                  {c.titulo} <kbd>{i + 1}</kbd>
                </span>
                <span class="tile-blurb">{save.cenas[c.id] ? `${c.resumo} · feita ${save.cenas[c.id]}x` : c.resumo}</span>
              </button>
            ))}
          </div>
          {!saude?.fala.ok && <p class="muted">O reconhecimento de fala ainda não está pronto: por enquanto, digite.</p>}
        </section>
      </main>
    );
  }

  if (fase === 'resumo' && resumo) {
    return (
      <main class="cv" data-testid="cv" data-phase="resumo">
        <section class="av-panel" data-testid="cv-summary">
          <span class="muted">{resumo.cena.titulo}</span>
          <h2 class="big">{resumo.concluida ? 'Objetivo cumprido!' : 'Conversa encerrada'}</h2>
          <ul class="cv-goals">
            {resumo.passos.map((p) => (
              <li key={p.pt} class={p.feito ? 'done' : undefined}>
                {p.feito ? '✓' : '·'} {p.pt}
              </li>
            ))}
          </ul>
          <div class="summary">
            <div>
              <b>{resumo.turnos}</b>
              <span>falas suas</span>
            </div>
            <div>
              <b>{Math.max(1, Math.round(resumo.ms / 60000))} min</b>
              <span>de conversa</span>
            </div>
            <div>
              <b>{resumo.novas.length}</b>
              <span>palavras novas</span>
            </div>
            <div>
              <b class="gain">+{resumo.xp}</b>
              <span>XP · +{resumo.coins} moedas</span>
            </div>
          </div>
          {resumo.bem.length > 0 && (
            <div class="cv-block" data-testid="cv-good">
              <h3>O que você disse bem</h3>
              {resumo.bem.map((l, i) => (
                <p key={i} class="cv-said" lang="ja">
                  {l.jp}
                  {l.digitado && <small class="muted"> · {l.digitado}</small>}
                </p>
              ))}
            </div>
          )}
          {resumo.correcoes.length > 0 && (
            <div class="cv-block" data-testid="cv-fix">
              <h3>Para soar mais natural</h3>
              {resumo.correcoes.map((c, i) => (
                <div key={i} class="cv-fix">
                  <p lang="ja">
                    <span class="muted">{c.dito}</span> → <b>{c.melhor}</b>
                  </p>
                  <small>{c.nota}</small>
                </div>
              ))}
            </div>
          )}
          {resumo.novas.length > 0 && (
            <div class="cv-block" data-testid="cv-new">
              <h3>Palavras novas na sua memória</h3>
              <ul class="av-words">
                {resumo.novas.map((t) => (
                  <li key={t.id}>
                    <button onClick={() => speak(t.jp)}>
                      <b lang="ja">{t.jp}</b>
                      {t.kana !== t.jp && <i lang="ja">{t.kana}</i>}
                      <span>{t.pt}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div class="actions center">
            <button class="primary" onClick={() => comecar(proximaCena(conversaSave()))} data-testid="cv-again">
              Outra conversa <kbd>Enter</kbd>
            </button>
            <button class="ghost" onClick={() => setFase('menu')}>
              Escolher situação <kbd>Esc</kbd>
            </button>
          </div>
        </section>
      </main>
    );
  }

  const c = conversa.current;
  if (!c) return null;
  const pensando = c.fase === 'pensando' || ouvindo === 'transcrevendo';
  return (
    <main class="cv" data-testid="cv" data-phase="conversa" data-turn={c.fase}>
      <header class="km-top">
        <button class="ghost" onClick={encerrar} data-testid="cv-stop">
          Encerrar <kbd>Esc</kbd>
        </button>
        <div class="av-place">
          <b>{c.cena.personagem.nome}</b> · {c.cena.personagem.papel}
        </div>
        <ul class="cv-goals" data-testid="cv-goals">
          {c.cena.passos.map((p) => (
            <li key={p.id} class={c.feitos.has(p.id) ? 'done' : undefined}>
              {c.feitos.has(p.id) ? '✓' : '·'} {p.pt}
            </li>
          ))}
        </ul>
      </header>

      <section class="cv-chat">
        <p class="av-narra">{c.cena.lugar}</p>
        <ol class="cv-lines" ref={listaEl} data-testid="cv-lines">
          {c.linhas.map((l, i) => (
            <li key={i} class={`cv-line ${l.quem}`} data-testid={l.quem === 'personagem' ? 'cv-npc' : 'cv-me'}>
              <span class="av-who">{l.quem === 'personagem' ? c.cena.personagem.nome : 'Você'}</span>
              <p class="cv-jp" lang="ja">
                <RubyText ruby={l.ruby} />
              </p>
              {l.digitado && <small class="muted">{l.digitado}</small>}
              {l.quem === 'personagem' && (
                <div class="cv-tools">
                  <button class="ghost small" onClick={() => void tocar(l, c.cena)}>
                    Ouvir
                  </button>
                  {l.pt && (
                    <button class="ghost small" onClick={() => traduzir(i)} data-testid="cv-translate">
                      {traduzidas.has(i) ? 'Esconder tradução' : 'Tradução'}
                    </button>
                  )}
                </div>
              )}
              {traduzidas.has(i) && l.pt && (
                <p class="av-pt" data-testid="cv-pt">
                  {l.pt}
                </p>
              )}
            </li>
          ))}
          {c.fase === 'pensando' && (
            <li class="cv-line personagem thinking" data-testid="cv-thinking">
              <span class="av-who">{c.cena.personagem.nome}</span>
              <p class="cv-jp">…</p>
            </li>
          )}
        </ol>
      </section>

      <footer class="cv-input">
        {dica && (
          <div class="cv-hint" data-testid="cv-hint">
            <p>{dica.texto}</p>
            {dica.sugestoes.map((s, i) => (
              <button
                key={i}
                class="cv-suggest"
                onClick={() => {
                  setTexto(s.romaji || s.jp);
                  inputEl.current?.focus();
                }}
                data-testid="cv-suggest"
              >
                <b lang="ja">{s.jp}</b>
                {s.romaji && <i>{s.romaji}</i>}
                <span>{s.pt}</span>
              </button>
            ))}
          </div>
        )}
        {aviso && (
          <p class="notice" data-testid="cv-note">
            {aviso}
          </p>
        )}
        <form
          class="cv-form"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar(texto);
          }}
        >
          <button
            type="button"
            class={ouvindo === 'gravando' ? 'cv-mic on' : 'cv-mic'}
            disabled={!saude?.fala.ok || pensando}
            onClick={() => void microfone()}
            data-testid="cv-mic"
            title={saude?.fala.ok ? 'Falar (Espaço com o campo vazio)' : 'O reconhecimento de fala não está ligado'}
          >
            {ouvindo === 'gravando' ? 'Parar e enviar' : ouvindo === 'transcrevendo' ? 'Ouvindo...' : 'Falar'} <kbd>Espaço</kbd>
          </button>
          <input
            ref={inputEl}
            value={texto}
            onInput={(e) => setTexto((e.target as HTMLInputElement).value)}
            placeholder="Digite em romaji ou kana: koohii o kudasai"
            disabled={pensando}
            data-testid="cv-text"
            autocomplete="off"
            spellcheck={false}
          />
          <button type="submit" class="primary" disabled={pensando || !texto.trim()} data-testid="cv-send">
            Enviar <kbd>Enter</kbd>
          </button>
        </form>
        <p class="av-keys">
          <span>
            <kbd>Tab</kbd> dica
          </span>
          <span>
            <kbd>F1</kbd> tradução
          </span>
          <span>
            <kbd>F3</kbd> ouvir de novo
          </span>
        </p>
      </footer>
    </main>
  );
}
