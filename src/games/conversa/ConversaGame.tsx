import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useAprofundar } from '../../core/aprofundar/estado';
import { gramaticaDaFrase } from '../../content/aprofundar/detectar';
import { app, commit, conversaSave, go, screen } from '../../core/app';
import { CENA_CONVERSA, cenaStyle, pessoaUrl } from '../../core/arte';
import { sfx, speak, speakWord } from '../../core/audio';
import { acompanharVoz } from '../../core/som/mixer';
import { VOZ_CONVERSA } from '../../core/vozes';
import { onomato } from '../../core/fx';
import { foco } from '../../core/foco';
import { teclaDe } from '../../core/teclas';
import {
  avisoDaFalha,
  criarCliente,
  criarClienteHibrido,
  criarClienteNuvem,
  entrar,
  ESPERA_LICENCA_MS,
  escolherMotor,
  lerMotor,
  licencaDoPC,
  LINK_LIGAR_PC,
  MOTORES,
  podeProcurar,
  procurarNuvem,
  procurarServidor,
  salvarMotor,
  textoDeQuem,
  type Cliente,
  type ClienteHibrido,
  type ClienteNuvem,
  type Escolha,
  type Motor,
  type Saude,
} from './cliente';
import { CENAS, Conversa, proximaCena, type Cena, type Dica, type Evento, type Linha, type Resumo, type Ruby } from './engine';
import { gravar, type Gravacao } from './microfone';

type Fase = 'procurando' | 'senha' | 'desligado' | 'pc-fora' | 'menu' | 'conversa' | 'resumo';

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

/** Missão da Jornada: a situação dela vem primeiro no Enter. Sem missão, a próxima da lista. */
function cenaSugerida(save: Parameters<typeof proximaCena>[0]): Cena {
  return CENAS.find((c) => c.id === foco.value?.conversa) ?? proximaCena(save);
}

export function ConversaGame() {
  const [fase, setFase] = useState<Fase>('procurando');
  const [saude, setSaude] = useState<Saude | null>(null);
  const [, setFrame] = useState(0);
  const redraw = () => setFrame((n) => n + 1);
  const conversa = useRef<Conversa | null>(null);
  const cliente = useRef<Cliente>(criarCliente());
  const [senha, setSenha] = useState('');
  const [senhaAviso, setSenhaAviso] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [motor, setMotor] = useState<Motor>(lerMotor());
  const [avisoMotor, setAvisoMotor] = useState('');
  const [pcFora, setPcFora] = useState<Extract<Escolha, { onde: 'pc-fora' }> | null>(null);
  const [ligando, setLigando] = useState(false);
  /** PC ligado mas sem sessão na nuvem: o texto fica no modelo do PC até a pessoa entrar. */
  const [nuvemSemSessao, setNuvemSemSessao] = useState(false);
  const [texto, setTexto] = useState('');
  const [dica, setDica] = useState<Dica | null>(null);
  const [aviso, setAviso] = useState('');
  const [traduzidas, setTraduzidas] = useState<Set<number>>(new Set());
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [ouvindo, setOuvindo] = useState<'nao' | 'gravando' | 'transcrevendo'>('nao');
  // Aprofundar: a cena, as palavras dela que aparecem na última fala e a gramática dessa fala.
  const emConversa = (fase === 'conversa' && conversa.current) || (fase === 'resumo' && resumo ? resumo : null);
  const cenaAberta = emConversa ? emConversa.cena : null;
  const ultima = fase === 'conversa' ? conversa.current?.linhas.at(-1)?.jp ?? '' : '';
  useAprofundar(
    cenaAberta
      ? [
          ...cenaAberta.vocabulario.filter((t) => ultima.includes(t.jp) || ultima.includes(t.kana)).map((t) => ({ t: 'palavra', id: t.id }) as const),
          ...gramaticaDaFrase(ultima),
          { t: 'cena', id: `conversa:${cenaAberta.id}` },
        ]
      : [],
  );
  const gravacao = useRef<Gravacao | null>(null);
  const inputEl = useRef<HTMLInputElement>(null);
  const listaEl = useRef<HTMLOListElement>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);

  /** Quem faz a IA: o PC ou a nuvem, conforme a escolha (Automático, Nuvem, Meu PC). */
  const procurar = async (m: Motor = motor) => {
    setFase('procurando');
    setAvisoMotor('');
    const e = await escolherMotor(m, {
      licenca: () => licencaDoPC(location.hostname),
      procurarPC: (t) => procurarServidor(fetch, undefined, t),
      procurarNuvem: () => procurarNuvem(),
    });
    if (e.onde === 'pc') {
      await usarPC(e.saude);
      return;
    }
    if (e.onde === 'pc-fora') {
      setSaude(null);
      setPcFora(e);
      setFase('pc-fora');
      return;
    }
    if (e.aviso) setAvisoMotor(e.aviso);
    const n = e.procura;
    if (n.tipo === 'pronto') {
      cliente.current = criarClienteNuvem();
      setSaude(n.saude);
      setFase('menu');
    } else {
      setSaude(null);
      setFase(n.tipo === 'senha' ? 'senha' : 'desligado');
    }
  };

  const mandarSenha = async () => {
    if (entrando || !senha) return;
    setEntrando(true);
    setSenhaAviso('');
    const r = await entrar(senha);
    setEntrando(false);
    if (r.ok) {
      setSenha('');
      void procurar();
      return;
    }
    if (r.erro === 'senha') setSenhaAviso(r.restam > 0 ? `Senha errada. Mais ${r.restam} ${r.restam === 1 ? 'tentativa' : 'tentativas'} antes de uma pausa.` : 'Senha errada.');
    else if (r.erro === 'tentativas') setSenhaAviso(`Muitas tentativas. Espere ${Math.max(1, Math.ceil(r.esperar / 60))} min e tente de novo.`);
    else setSenhaAviso('Não consegui falar com o servidor. Confira a internet.');
  };

  const avisoDeFalha = () => {
    const c = cliente.current as Partial<ClienteNuvem>;
    return 'ultimaFalha' in c ? avisoDaFalha(c.ultimaFalha ?? null) : 'O servidor local não respondeu. Sua fala não se perdeu: mande de novo.';
  };

  /** Servidor do PC respondeu. Se o modelo ainda está abrindo na placa, espera até 3 minutos. */
  const usarPC = async (primeira: Saude) => {
    let s: Saude | null = primeira;
    for (let i = 0; i < 90 && s && !s.conversa.ok && !s.conversa.erro && screen.value === 'conversa'; i++) {
      setSaude(s);
      await new Promise((r) => setTimeout(r, 2000));
      s = await procurarServidor();
    }
    if (!s || !s.conversa.ok) {
      setSaude(s);
      setFase('desligado');
      return;
    }
    // Híbrido: com sessão na nuvem, o texto vai primeiro para o modelo maior de lá; o resto fica no PC.
    const n = await procurarNuvem();
    setNuvemSemSessao(n.tipo === 'senha');
    if (n.tipo === 'pronto') {
      cliente.current = criarClienteHibrido(criarCliente(), criarClienteNuvem(), { nuvem: n.saude.conversa.modelo, pc: s.conversa.modelo });
      setSaude({ ...s, texto: { modelo: n.saude.conversa.modelo } });
    } else {
      cliente.current = criarCliente();
      setSaude(s);
    }
    setFase('menu');
  };

  const trocarMotor = (m: Motor) => {
    if (m === motor) return;
    salvarMotor(m);
    setMotor(m);
    void procurar(m);
  };

  /** O link kotoba-local:// abre o local/iniciar.mjs --site. Aqui a tela espera a IA do PC responder. */
  const ligarPC = async () => {
    if (ligando) return;
    setLigando(true);
    const limite = Date.now() + 4 * 60_000;
    while (Date.now() < limite && montado.current) {
      const espera = (await licencaDoPC(location.hostname)) === 'perguntar' ? ESPERA_LICENCA_MS : 3000;
      const s = await procurarServidor(fetch, undefined, espera);
      if (s && (!s.placa || s.placa.ok)) {
        setLigando(false);
        await usarPC(s);
        return;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    setLigando(false);
  };

  // Saiu da tela: para a voz e desliga o microfone, mesmo no meio de uma gravação.
  const montado = useRef(true);
  useEffect(() => {
    void procurar();
    return () => {
      montado.current = false;
      audioEl.current?.pause();
      gravacao.current?.cancelar();
      gravacao.current = null;
    };
  }, []);

  /** Fala do personagem: voz do servidor local; se ela falhar, a gravada (abertura) ou a do navegador. */
  const tocar = async (linha: Linha, cena: Cena) => {
    if (!app.data.settings.voice) return;
    audioEl.current?.pause();
    if (saude?.voz.ok) {
      try {
        const blob = await cliente.current.voz(linha.jp, cena.personagem.voz);
        if (!montado.current) return;
        const url = URL.createObjectURL(blob);
        const a = new Audio(url);
        // Cada fala é um arquivo na memória: solta quando acaba de tocar.
        a.onended = a.onerror = () => URL.revokeObjectURL(url);
        audioEl.current = a;
        acompanharVoz(a);
        await a.play();
        return;
      } catch {
        // cai para a voz do navegador
      }
    }
    speak(linha.jp, VOZ_CONVERSA[cena.personagem.voz]);
  };

  const reagir = (events: Evento[]) => {
    const c = conversa.current;
    if (!c) return;
    for (const e of events) {
      if (e.t === 'linha' && e.linha.quem === 'personagem') void tocar(e.linha, c.cena);
      else if (e.t === 'passo') {
        sfx.capture(1);
        onomato('captura', document.querySelector('[data-testid="cv-goals"]'), 'festa', 0.9);
        setAviso(`Objetivo: ${e.passo.pt}`);
      } else if (e.t === 'nova') sfx.click();
      else if (e.t === 'dica') setDica(e.dica);
      else if (e.t === 'levelup') {
        sfx.levelup();
        setAviso(`Nível ${e.level}!`);
      } else if (e.t === 'falha') setAviso(avisoDeFalha());
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
        const g = await gravar();
        // A pessoa saiu da tela enquanto o navegador pedia permissão: desliga já.
        if (!montado.current) {
          g.cancelar();
          return;
        }
        gravacao.current = g;
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
      gravacao.current = null;
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
      const c = cliente.current as Partial<ClienteNuvem>;
      setAviso(c.ultimaFalha === 'limite' || c.ultimaFalha === 'sessao' ? avisoDaFalha(c.ultimaFalha) : 'O reconhecimento de fala não respondeu. Dá para digitar.');
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
    const tecla = teclaDe(e);
    if (tecla === null) return;
    if (screen.value !== 'conversa') return;
    // Na senha, Enter é do formulário.
    if (fase === 'senha') {
      if (tecla === 'Escape') {
        e.preventDefault();
        go('hub');
      }
      return;
    }
    const noCampo = e.target === inputEl.current;
    if (fase === 'conversa') {
      if (tecla === 'Escape') {
        e.preventDefault();
        encerrar();
      } else if (tecla === 'Tab') {
        e.preventDefault();
        void pedirDica();
      } else if (tecla === 'F2' || (tecla === ' ' && (!noCampo || texto === ''))) {
        e.preventDefault();
        void microfone();
      } else if (tecla === 'F1') {
        e.preventDefault();
        const i = ultimaDoPersonagem();
        if (i >= 0) traduzir(i);
      } else if (tecla === 'F3') {
        e.preventDefault();
        const c = conversa.current;
        const i = ultimaDoPersonagem();
        if (c && i >= 0) void tocar(c.linhas[i] as Linha, c.cena);
      }
      return;
    }
    if (tecla === 'Escape') {
      e.preventDefault();
      if (fase === 'resumo') setFase('menu');
      else go('hub');
    } else if (fase === 'menu' && /^[1-9]$/.test(tecla)) {
      const cena = CENAS[Number(tecla) - 1];
      if (cena) comecar(cena);
    } else if (tecla === 'Enter') {
      e.preventDefault();
      if (fase === 'menu' || fase === 'resumo') comecar(cenaSugerida(conversaSave()));
      else if (fase === 'desligado' || fase === 'pc-fora') void procurar();
    }
  };
  // Ligado junto com o desenho da tela: tecla apertada logo que a tela aparece não se perde.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => teclaRef.current(e);
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const voltar = (
    <button class="ghost" onClick={() => go('hub')}>
      ← Fliperama <kbd>Esc</kbd>
    </button>
  );

  const ondeRoda = !saude
    ? ''
    : saude.nuvem
      ? 'na nuvem'
      : saude.texto
        ? `texto na nuvem (${saude.texto.modelo}), ouvido, furigana e voz no seu PC`
        : `no seu PC (${saude.conversa.modelo})`;
  const seletor = (
    <div class="cv-motor" role="group" aria-label="Qual IA usar" data-testid="cv-motor">
      <span class="muted">IA:</span>
      {MOTORES.map((m) => (
        <button
          key={m.id}
          type="button"
          class={motor === m.id ? 'ghost small on' : 'ghost small'}
          aria-pressed={motor === m.id}
          onClick={() => trocarMotor(m.id)}
          data-motor={m.id}
        >
          {m.nome}
        </button>
      ))}
      {ondeRoda && (
        <span class="muted" data-testid="cv-onde">
          · rodando {ondeRoda}
        </span>
      )}
    </div>
  );
  const botaoLigar = (principal: boolean) => (
    <a
      class={principal ? 'button primary' : 'button ghost small'}
      href={LINK_LIGAR_PC}
      onClick={() => void ligarPC()}
      data-testid="cv-ligar-pc"
      aria-disabled={ligando}
    >
      {ligando ? 'Esperando a IA do PC...' : 'Ligar a IA do meu PC'}
    </a>
  );

  if (fase === 'pc-fora' && pcFora) {
    return (
      <main class="cv" data-testid="cv" data-phase="pc-fora">
        <header class="km-top">{voltar}</header>
        <section class="av-panel" data-testid="cv-pc-fora">
          <span class="tile-jp" lang="ja">
            会話
          </span>
          <h2 class="big">IA do seu PC</h2>
          {pcFora.motivo === 'desligado' && (
            <p class="cv-off-text">
              A IA do seu PC não está ligada. O botão abaixo liga (o navegador pergunta antes de abrir). Na primeira vez, ele também pede licença para o site falar com o PC: clique em Permitir.
            </p>
          )}
          {pcFora.motivo === 'licenca' && (
            <p class="cv-off-text">
              O navegador não deixa este site falar com o seu PC. Libere no cadeado ao lado do endereço, em "Acesso à rede local", e tente de novo.
            </p>
          )}
          {pcFora.motivo === 'placa' && (
            <p class="cv-off-text" data-testid="cv-placa">
              A placa de vídeo está ocupada ({pcFora.detalhe ?? 'outro programa'}). Quando ela ficar livre, a IA do PC abre sozinha. Até lá, dá para usar a nuvem.
            </p>
          )}
          {seletor}
          <div class="actions center">
            {pcFora.motivo === 'desligado' && botaoLigar(true)}
            <button class="ghost" onClick={() => void procurar()} data-testid="cv-retry">
              Procurar de novo <kbd>Enter</kbd>
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (fase === 'procurando') {
    return (
      <main class="cv" data-testid="cv" data-phase="procurando">
        <header class="km-top">{voltar}</header>
        <p class="muted cv-center" data-testid="cv-wait">
          {saude ? `Abrindo o modelo de conversa (${saude.conversa.modelo})...` : 'Ligando a IA da Conversa...'}
        </p>
      </main>
    );
  }

  if (fase === 'senha') {
    return (
      <main class="cv" data-testid="cv" data-phase="senha">
        <header class="km-top">{voltar}</header>
        <section class="av-panel" data-testid="cv-senha">
          <span class="tile-jp" lang="ja">
            会話
          </span>
          <h2 class="big">Conversa por voz</h2>
          <p class="cv-off-text">A IA da Conversa fica na nuvem e é só sua. Digite a senha uma vez: este navegador lembra por 30 dias.</p>
          <form
            class="cv-form"
            onSubmit={(e) => {
              e.preventDefault();
              void mandarSenha();
            }}
          >
            <input
              type="password"
              value={senha}
              onInput={(e) => setSenha((e.target as HTMLInputElement).value)}
              placeholder="Senha"
              autocomplete="current-password"
              aria-label="Senha da Conversa"
              data-testid="cv-senha-campo"
              ref={(el) => el?.focus()}
            />
            <button type="submit" class="primary" disabled={entrando || !senha} data-testid="cv-senha-entrar">
              {entrando ? 'Entrando...' : 'Entrar'} <kbd>Enter</kbd>
            </button>
          </form>
          {senhaAviso && (
            <p class="notice" data-testid="cv-senha-aviso" role="alert">
              {senhaAviso}
            </p>
          )}
          {seletor}
        </section>
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
          <p class="cv-off-text">Não consegui falar com a IA da Conversa agora. Confira a internet e tente de novo.</p>
          {podeProcurar(location.hostname) && (
            <p class="muted">
              Jogando no PC? Também dá para usar a IA do próprio PC: rode <code>npm run local</code>.
            </p>
          )}
          {saude && !saude.conversa.ok && (
            <p class="muted" data-testid="cv-model-off">
              O servidor local respondeu, mas o modelo de conversa não abriu
              {saude.conversa.erro ? `: ${saude.conversa.erro}` : '.'}
            </p>
          )}
          {seletor}
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
    const sugerida = cenaSugerida(save);
    return (
      <main class="cv" data-testid="cv" data-phase="menu">
        <header class="km-top">
          {voltar}
          <span class="muted">
            {save.concluidas} {save.concluidas === 1 ? 'conversa concluída' : 'conversas concluídas'}
          </span>
        </header>
        <section class="av-panel">
          {seletor}
          {avisoMotor && (
            <p class="notice" data-testid="cv-aviso-motor">
              {avisoMotor}
            </p>
          )}
          {nuvemSemSessao && saude && !saude.nuvem && (
            <p class="muted" data-testid="cv-entrar-nuvem">
              O texto está no modelo do PC. Com a senha da nuvem, ele vem do modelo maior de lá.{' '}
              <button class="ghost small" onClick={() => setFase('senha')}>
                Entrar na nuvem
              </button>
            </p>
          )}
          {motor === 'auto' && saude?.nuvem && <p class="muted">Quer a voz de cada personagem e sem limite diário? {botaoLigar(false)}</p>}
          <p class="muted">Escolha uma situação. Fale no microfone ou digite em romaji ou kana. Cada conversa leva de 2 a 4 minutos.</p>
          <button class="play-now" onClick={() => comecar(sugerida)} data-testid="cv-start">
            <span class="play-now-main">{sugerida.titulo}</span>
            <span class="play-now-sub">
              {sugerida.resumo} <kbd>Enter</kbd>
            </span>
          </button>
          <div class="av-scenes">
            {CENAS.map((c, i) => (
              <button
                key={c.id}
                class={save.cenas[c.id] ? 'tile done' : 'tile'}
                style={cenaStyle(CENA_CONVERSA[c.id]?.cena)}
                onClick={() => comecar(c)}
                data-scene={c.id}
              >
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
          {saude?.voz.ok && saude.voz.motor === 'voicevox' && (
            <p class="muted cv-credit" data-testid="cv-credit">
              Vozes: VOICEVOX:四国めたん, VOICEVOX:春日部つむぎ, VOICEVOX:青山龍星, VOICEVOX:玄野武宏
            </p>
          )}
          {saude?.voz.ok && saude.voz.motor === 'aivis' && (
            <p class="muted cv-credit" data-testid="cv-credit">
              Vozes: AivisSpeech (créditos no README)
            </p>
          )}
        </section>
      </main>
    );
  }

  if (fase === 'resumo' && resumo) {
    return (
      <main class="cv" data-testid="cv" data-phase="resumo">
        <section class="av-panel" data-testid="cv-summary">
          <span class="muted">{resumo.cena.titulo}</span>
          <h2 class={resumo.concluida ? 'big win' : 'big'}>{resumo.concluida ? 'Objetivo cumprido!' : 'Conversa encerrada'}</h2>
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
                    <button onClick={() => speakWord(t.kana)}>
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
            <button class="primary" onClick={() => comecar(cenaSugerida(conversaSave()))} data-testid="cv-again">
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
  const quem = (cliente.current as Partial<ClienteHibrido>).quem ?? null;
  return (
    <main class="cv" data-testid="cv" data-phase="conversa" data-turn={c.fase}>
      <header class="km-top">
        <button class="ghost" onClick={encerrar} data-testid="cv-stop">
          Encerrar <kbd>Esc</kbd>
        </button>
        <div class="av-place">
          <b>{c.cena.personagem.nome}</b> · {c.cena.personagem.papel}
        </div>
        {quem && (
          <span class="muted small" data-testid="cv-modelo" data-onde={quem.onde}>
            {textoDeQuem(quem)}
          </span>
        )}
        <ul class="cv-goals" data-testid="cv-goals">
          {c.cena.passos.map((p) => (
            <li key={p.id} class={c.feitos.has(p.id) ? 'done' : undefined}>
              {c.feitos.has(p.id) ? '✓' : '·'} {p.pt}
            </li>
          ))}
        </ul>
      </header>

      <section class="cv-chat">
        <div class="cv-cena" style={cenaStyle(CENA_CONVERSA[c.cena.id]?.cena)} data-testid="cv-cena">
          {pessoaUrl(CENA_CONVERSA[c.cena.id]?.pessoa) && (
            <img
              src={pessoaUrl(CENA_CONVERSA[c.cena.id]?.pessoa)}
              alt={c.cena.personagem.nome}
            />
          )}
          <p class="av-narra">{c.cena.lugar}</p>
        </div>
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
