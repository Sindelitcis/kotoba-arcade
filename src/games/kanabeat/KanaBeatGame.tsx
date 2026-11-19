import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { app, commit, go, kanaBeatSave } from '../../core/app';
import { sfx, speak } from '../../core/audio';
import { cenaStyle } from '../../core/arte';
import { useAoAbrirAjuda } from '../../core/help/ajuda';
import { teclaDe } from '../../core/teclas';
import { burst, INK, onomato, pulse } from '../../core/fx';
import { kanaToRomaji } from '../../core/kana';
import { MODE_NAMES, modeForPlay, Stage, type BeatEvent, type Judge, type Mode, type StageResult } from './engine';
import { startMusic, type Music } from './music';
import { LICENCA_URL, TRACKS } from './tracks';

const HIT_X = 16; // posição da linha, em % da largura da pista
const START_DELAY = 150;
/** Atraso ao voltar da pausa: o tempo de agendar o som de novo. */
const RESUME_DELAY = 60;
const JUDGE_TEXT: Record<Judge | 'miss', string> = { perfect: 'Perfeito!', good: 'Bom!', ok: 'Valeu', miss: 'Passou' };
const JUDGE_COLORS: Record<Judge, string[]> = {
  perfect: [INK.shu, INK.shu, INK.tinta],
  good: [INK.tinta],
  ok: [INK.tinta],
};

interface Run {
  stage: Stage;
  music: Music;
  /** performance.now() em que o tempo da fase vale 0; null enquanto a música carrega. */
  t0: number | null;
  pausedAt: number | null;
  /** O tempo da fase nunca volta para trás deste ponto (ao sair da pausa o som leva uns ms para voltar). */
  floor: number;
}

function newRun(mode?: Mode): Run {
  const save = kanaBeatSave();
  const chosen = mode ?? modeForPlay(save.plays);
  const stage = new Stage(
    { cards: app.data.cards, profile: app.data.profile, save, rng: Math.random, now: () => Date.now() },
    chosen,
    save.bpm[chosen],
  );
  return { stage, music: startMusic(stage.bpm), t0: null, pausedAt: null, floor: 0 };
}

export function KanaBeatGame() {
  const run = useRef<Run | null>(null);
  if (!run.current) run.current = newRun();
  const [t, setT] = useState(0);
  const [result, setResult] = useState<StageResult | null>(null);
  const [paused, setPaused] = useState(false);
  const [judge, setJudge] = useState<{ text: string; cls: string; n: number }>({ text: '', cls: '', n: 0 });
  const [typoAt, setTypoAt] = useState(0);
  const [started, setStarted] = useState(false);
  const [credits, setCredits] = useState(false);
  const trackEl = useRef<HTMLDivElement>(null);
  const lineEl = useRef<HTMLDivElement>(null);
  const stage = run.current.stage;

  const now = () => {
    const r = run.current as Run;
    if (r.t0 === null) return 0;
    return Math.max(r.floor, (r.pausedAt ?? performance.now()) - r.t0);
  };

  const handle = (events: BeatEvent[]) => {
    for (const e of events) {
      if (e.t === 'hit') {
        sfx.hit(e.combo);
        const r = lineEl.current?.getBoundingClientRect();
        if (r) burst(r.left + r.width / 2, r.top + r.height / 2, JUDGE_COLORS[e.judge], e.judge === 'perfect' ? 30 : 16, 380);
        pulse(lineEl.current, 'line-hit');
        if (e.judge === 'perfect') onomato('captura', lineEl.current, 'shu', 0.8);
        setJudge((j) => ({ text: JUDGE_TEXT[e.judge], cls: e.judge, n: j.n + 1 }));
        if (e.note.pt) speak(e.note.kana);
      } else if (e.t === 'miss') {
        sfx.miss();
        pulse(trackEl.current, 'flash-bad');
        setJudge((j) => ({ text: `${JUDGE_TEXT.miss}: ${e.note.text} = ${kanaToRomaji(e.note.kana).replace(/'/g, '')}`, cls: 'miss', n: j.n + 1 }));
      } else if (e.t === 'type') {
        if (!e.ok) setTypoAt(performance.now());
      } else if (e.t === 'end') {
        (run.current as Run).music.stop();
        commit();
        setResult(e.result);
        if (e.result.grade === 'S' || e.result.record) {
          sfx.levelup();
          requestAnimationFrame(() => onomato('nivel', document.querySelector('.kb-grade'), 'shu', 1.3));
        } else sfx.chest();
      }
    }
  };

  // A fase começa quando a música carregou: o tempo 0 cai no primeiro tempo forte da faixa.
  const current = run.current;
  useEffect(() => {
    const r = current;
    let alive = true;
    void r.music.ready.then(() => {
      if (!alive || run.current !== r || r.t0 !== null) return;
      // Pausou antes de carregar: o tempo fica em 0 e a música entra quando voltar.
      r.t0 = r.pausedAt ?? r.music.play(0, START_DELAY);
      setStarted(true);
    });
    return () => {
      alive = false;
    };
  }, [current]);

  // Laço do jogo
  useEffect(() => {
    if (result || paused || !started) return;
    let frame = 0;
    const loop = () => {
      const time = now();
      handle((run.current as Run).stage.update(time));
      setT(time);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [result, paused, started]);

  const setPause = (on: boolean) => {
    const r = run.current as Run;
    if (result || on === (r.pausedAt !== null)) return;
    if (on) {
      r.pausedAt = performance.now();
      r.music.halt();
      // Congela a tela no instante da pausa. Sem isto, um último quadro do laço ainda mexia as notas com o aviso de pausa já na tela.
      setT(now());
    } else {
      const g = now();
      r.pausedAt = null;
      if (r.t0 !== null) {
        r.t0 = r.music.play(g, RESUME_DELAY) - g;
        r.floor = g;
      }
    }
    setPaused(on);
  };

  useAoAbrirAjuda(() => setPause(true));

  const restart = (mode?: Mode) => {
    (run.current as Run).music.stop();
    run.current = newRun(mode);
    setResult(null);
    setPaused(false);
    setT(0);
    setStarted(false);
    setCredits(false);
    setJudge({ text: '', cls: '', n: 0 });
  };

  const leave = () => {
    (run.current as Run).music.stop();
    commit();
    go('hub');
  };

  // Liga o teclado junto com o desenho: com useEffect ele só ligava depois da pintura e a primeira tecla se perdia.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = teclaDe(e);
      if (key === null) return;
      if (credits) {
        if (key === 'Escape' || key === 'Enter' || key === ' ' || key.toLowerCase() === 'c') {
          e.preventDefault();
          setCredits(false);
        }
        return;
      }
      if (key === 'Escape') {
        e.preventDefault();
        leave();
        return;
      }
      if (result) {
        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          restart();
        } else if (key === '1') restart('hiragana');
        else if (key === '2') restart('katakana');
        else if (key === '3') restart('palavras');
        else if (key.toLowerCase() === 'c') setCredits(true);
        return;
      }
      if (paused) {
        e.preventDefault();
        setPause(false);
        return;
      }
      if (key === 'Backspace') {
        e.preventDefault();
        (run.current as Run).stage.clearBuffer();
        setTypoAt(0);
        return;
      }
      if (key === ' ') {
        e.preventDefault();
        setPause(true);
        return;
      }
      if (/^[a-zA-Z'-]$/.test(key)) {
        e.preventDefault();
        handle((run.current as Run).stage.key(key, now()));
      }
    };
    const onHide = () => {
      if (document.hidden) setPause(true);
    };
    addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onHide);
    };
  });

  useEffect(() => () => run.current?.music.stop(), []);

  const visible = stage.visible(t);
  const target = stage.target;
  const beatPhase = ((t % stage.beatMs) + stage.beatMs) % stage.beatMs / stage.beatMs;
  const progress = Math.max(0, Math.min(1, t / stage.endTime));
  const typoFresh = performance.now() - typoAt < 250;

  return (
    <main class="kb">
      <header class="km-top">
        <div class="kb-mode">
          <b>{MODE_NAMES[stage.mode]}</b> <span class="muted">{stage.bpm} BPM</span>
          <small class="muted kb-song" data-testid="song">
            ♪ {run.current.music.choice.track.titulo} · {run.current.music.choice.track.autor}
          </small>
        </div>
        <div class={stage.combo > 1 ? 'combo on' : 'combo'}>Combo x{stage.combo}</div>
        <div class="kb-score" data-testid="score">
          {stage.score}
        </div>
        <div class="bar kb-progress">
          <i style={{ width: `${progress * 100}%` }} />
        </div>
        <button class="ghost" onClick={leave}>
          Sair <kbd>Esc</kbd>
        </button>
      </header>

      <section class="kb-stage">
        <div class="kb-track" ref={trackEl} style={cenaStyle('kanabeat-dotonbori')}>
          <div class="kb-line" ref={lineEl} style={{ left: `${HIT_X}%`, opacity: 0.55 + 0.45 * (1 - beatPhase) }} />
          {visible.map((n) => {
            const x = HIT_X + ((n.time - t) / stage.leadMs) * (100 - HIT_X);
            return (
              <div
                key={n.id}
                class={`kb-note${n === target ? ' target' : ''}${n.pt ? ' is-word' : ''}`}
                style={{ left: `${x}%`, top: n.id % 2 === 0 ? '26%' : '66%' }}
                data-testid={n === target ? 'target-note' : undefined}
                data-romaji={n === target ? kanaToRomaji(n.kana).replace(/'/g, '') : undefined}
              >
                {n.furigana && <span class="kb-furi">{n.furigana}</span>}
                <span class="kb-text">{n.text}</span>
                {n.hint && <span class="kb-hint">{n.hint}</span>}
                {n.pt && <span class="kb-pt">{n.pt}</span>}
              </div>
            );
          })}
          <div key={judge.n} class={`kb-judge ${judge.cls}`} style={{ left: `${HIT_X}%` }}>
            {judge.text}
          </div>
        </div>

        <div class={`kb-typed${typoFresh ? ' typo' : ''}`} data-testid="typed">
          {stage.buffer || <span class="muted">{!started ? 'Carregando a música…' : t < stage.leadMs ? 'Digite a leitura quando a nota chegar na linha' : ' '}</span>}
        </div>
        <p class="muted kb-help">
          Digite em romaji · <kbd>Espaço</kbd> pausa · <kbd>Backspace</kbd> apaga
        </p>
      </section>

      {paused && !result && (
        <div class="overlay" onClick={() => setPause(false)}>
          <h2 class="big">Pausado</h2>
          <p class="muted">Qualquer tecla para voltar · <kbd>Esc</kbd> sai</p>
        </div>
      )}

      {result && (
        <div class={result.grade === 'S' || result.record ? 'overlay win' : 'overlay'}>
          <div class={`kb-grade g-${result.grade}`} data-testid="grade">
            {result.grade}
          </div>
          {result.record && <p class="gain">Novo recorde em {MODE_NAMES[result.mode]}!</p>}
          <div class="summary">
            <div>
              <b>{result.score}</b>
              <span>pontos</span>
            </div>
            <div>
              <b>{Math.round(result.accuracy * 100)}%</b>
              <span>precisão</span>
            </div>
            <div>
              <b>{result.maxCombo}</b>
              <span>melhor combo</span>
            </div>
            <div>
              <b>
                {result.perfect}/{result.good}/{result.ok}/{result.miss}
              </b>
              <span>perfeito/bom/valeu/passou</span>
            </div>
          </div>
          <p class="gain">
            +{result.coins} moedas · +{result.xp} XP
          </p>
          <p class="muted">
            {result.nextBpm > result.bpm
              ? `Foi bem: a próxima de ${MODE_NAMES[result.mode]} sobe para ${result.nextBpm} BPM.`
              : result.nextBpm < result.bpm
                ? `A próxima de ${MODE_NAMES[result.mode]} desce para ${result.nextBpm} BPM.`
                : `A próxima de ${MODE_NAMES[result.mode]} continua em ${result.nextBpm} BPM.`}
          </p>
          {result.missed.length > 0 && (
            <div class="kb-missed">
              <span class="muted">Para olhar de novo:</span>
              {result.missed.slice(0, 8).map((n) => (
                <button key={n.id} onClick={() => speak(n.kana)} title="Ouvir">
                  <b>{n.text}</b> {n.furigana && n.furigana !== n.text ? `${n.furigana} · ` : ''}
                  {kanaToRomaji(n.kana).replace(/'/g, '')}
                  {n.pt ? ` · ${n.pt}` : ''}
                </button>
              ))}
            </div>
          )}
          <div class="actions center">
            <button class="primary" onClick={() => restart()} data-testid="next-song">
              Próxima música <kbd>Enter</kbd>
            </button>
            <button onClick={() => restart('hiragana')}>
              Hiragana <kbd>1</kbd>
            </button>
            <button onClick={() => restart('katakana')}>
              Katakana <kbd>2</kbd>
            </button>
            <button onClick={() => restart('palavras')}>
              Palavras <kbd>3</kbd>
            </button>
            <button onClick={leave}>
              Fliperama <kbd>Esc</kbd>
            </button>
            <button class="ghost" onClick={() => setCredits(true)} data-testid="credits">
              Músicas <kbd>C</kbd>
            </button>
          </div>
        </div>
      )}

      {credits && (
        <div class="overlay kb-credits" onClick={() => setCredits(false)}>
          <h2>Músicas do Kana Beat</h2>
          <p class="muted">Trechos de faixas livres, cortados em loop. Obrigado a quem fez e liberou.</p>
          <ul>
            {TRACKS.map((tr) => (
              <li key={tr.id}>
                <a href={tr.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                  {tr.titulo}
                </a>{' '}
                de {tr.autor} ·{' '}
                <a href={LICENCA_URL[tr.licenca]} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                  {tr.licenca}
                </a>
              </li>
            ))}
          </ul>
          <p class="muted">
            Voltar <kbd>Esc</kbd>
          </p>
        </div>
      )}
    </main>
  );
}
