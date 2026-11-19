import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { findWord } from '../../content/vida';
import { app, commit, go, gramaticaSave, screen } from '../../core/app';
import { cenaStyle } from '../../core/arte';
import { corStyle, progresso } from '../../core/cor';
import { Pintura } from '../../core/Pintura';
import { sfx, speak } from '../../core/audio';
import { onomato } from '../../core/fx';
import { masteryLevel } from '../../core/srs';
import { teclaDe } from '../../core/teclas';
import { cardOf, exampleView, fits, GramaticaRound, openPoints, plainSentence, ROUND_SIZE, slotWritten, WINS_TO_UNLOCK, type RoundEvent, type RoundSummary, type Written } from './engine';
import { COURSE, POINTS } from './pontos';

type Mode = 'menu' | 'round' | 'summary';

function Word({ w }: { w: Written }) {
  return (
    <>
      {w.text && w.reading ? (
        <ruby>
          {w.text}
          <rt>{w.reading}</rt>
        </ruby>
      ) : (
        w.text
      )}
      {w.tail}
    </>
  );
}

export function GramaticaGame() {
  const save = gramaticaSave();
  const [mode, setModeState] = useState<Mode>('menu');
  // Duas teclas seguidas chegam antes de a tela redesenhar: o teclado lê o modo daqui, que muda na hora.
  const modeRef = useRef<Mode>('menu');
  const setMode = (next: Mode) => {
    modeRef.current = next;
    setModeState(next);
  };
  const [, setFrame] = useState(0);
  const redraw = () => setFrame((n) => n + 1);
  const roundRef = useRef<GramaticaRound | null>(null);
  const [summary, setSummary] = useState<RoundSummary | null>(null);
  const [note, setNote] = useState('');
  const round = roundRef.current;

  const start = () => {
    roundRef.current = new GramaticaRound({
      course: COURSE,
      cards: app.data.cards,
      profile: app.data.profile,
      save,
      lookup: findWord,
      now: () => Date.now(),
      rng: Math.random,
    });
    setSummary(null);
    setNote('');
    setMode('round');
    sfx.click();
  };

  const react = (events: RoundEvent[]) => {
    for (const e of events) {
      if (e.t === 'fit') {
        sfx.hit(e.combo);
        if (e.fast) sfx.fast();
        // A última peça fecha a frase: aí quem fala é o ピカッ, uma onomatopeia por vez.
        if (!events.some((x) => x.t === 'solved')) onomato('encaixe', document.querySelector('.gr-slot.active'), 'shu', 0.9);
      } else if (e.t === 'bounce') {
        sfx.click();
        onomato('erro', document.querySelector('.gr-tray'), 'tinta', 0.8);
      } else if (e.t === 'solved') {
        sfx.capture(1);
        onomato('captura', document.querySelector('.gr-sentence'), 'shu');
        speak(e.plain);
      } else if (e.t === 'unlock') setNote(`Peça nova a caminho: ${e.point.blocks.join(' ')}`);
      else if (e.t === 'levelup') {
        sfx.levelup();
        setNote(`Nível ${e.level}!`);
      } else if (e.t === 'end') {
        sfx.chest();
        setSummary(e.summary);
        setMode('summary');
      }
    }
    commit();
    redraw();
  };

  const place = (i: number) => {
    const r = roundRef.current;
    if (r) react(r.placeAt(i));
  };

  const proceed = () => {
    const r = roundRef.current;
    if (!r) return;
    if (r.phase === 'lesson') {
      r.begin();
      redraw();
    } else if (r.phase === 'solved') {
      setNote('');
      react(r.next());
    }
  };

  const phase = mode === 'round' && round ? round.phase : '';
  const index = round?.index ?? -1;
  useEffect(() => {
    if (phase === 'lesson' && round) speak(exampleView(COURSE, round.puzzle.point).map((w) => w.text + w.tail).join(''));
  }, [phase, index]);

  // Ouvinte ligado junto com o desenho da tela: tecla apertada logo que a tela aparece não se perde.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tecla = teclaDe(e);
      if (tecla === null) return;
      // Na troca de tela este ouvinte ainda vive por um instante.
      if (screen.value !== 'gramatica') return;
      const confirm = tecla === 'Enter' || tecla === ' ';
      const digit = /^[1-9]$/.test(tecla) ? Number(tecla) : 0;
      if (confirm) e.preventDefault();
      const mode = modeRef.current;
      if (mode === 'menu') {
        if (tecla === 'Escape') go('hub');
        else if (confirm) start();
      } else if (mode === 'round') {
        const r = roundRef.current;
        if (!r) return;
        if (tecla === 'Escape') setMode('menu');
        else if (tecla.toLowerCase() === 'r') speak(r.phase === 'lesson' ? exampleView(COURSE, r.puzzle.point).map((w) => w.text + w.tail).join('') : plainSentence(r.puzzle));
        else if (r.phase === 'build') {
          if (digit) place(digit - 1);
        } else if (confirm) proceed();
      } else if (mode === 'summary') {
        if (tecla === 'Escape') setMode('menu');
        else if (confirm) start();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  if (mode === 'round' && round) {
    const pz = round.puzzle;
    const active = round.active;
    const slot = round.activeSlot;
    return (
      <main class="gr">
        <header class="km-top">
          <button class="ghost" onClick={() => setMode('menu')}>
            Sair <kbd>Esc</kbd>
          </button>
          <div class="gr-progress" data-testid="gr-progress">
            Frase {round.index + 1} de {ROUND_SIZE} · <b>{round.score}</b> pontos
          </div>
          <span class="gr-note" data-testid="gr-note">{note}</span>
        </header>

        {round.phase === 'lesson' ? (
          <section class="gr-lesson" data-testid="gr-lesson" style={cenaStyle('kumitate-gion')}>
            <span class="gr-tag">Peça nova</span>
            <h2>{pz.point.title}</h2>
            <p>{pz.point.lesson}</p>
            <p class="gr-example" lang="ja">
              {exampleView(COURSE, pz.point).map((w, i) => (
                <span key={i} class={w.mark ? 'gr-piece mark' : 'gr-piece'}>
                  <Word w={w} />
                </span>
              ))}
            </p>
            <p class="gr-goal">{pz.point.example.pt}</p>
            <button class="primary" onClick={proceed} data-testid="gr-begin">
              Montar uma <kbd>Enter</kbd>
            </button>
          </section>
        ) : (
          <section
            class="gr-board"
            data-testid="gr-board"
            // Kumitate é leitura: segue mangá, e só o fundo de Gion ganha um acento de cor a cada frase montada (no máximo metade).
            style={{ ...cenaStyle('kumitate-gion'), ...corStyle(0.5 * progresso(round.index + (round.phase === 'solved' ? 1 : 0), ROUND_SIZE)) }}
          >
            <Pintura cena="kumitate-gion" />
            <p class="gr-goal" data-testid="gr-goal">{pz.pt}</p>
            <div class="gr-sentence" lang="ja" data-testid="gr-sentence">
              {pz.pieces.map((p, i) => {
                if (p.k === 'text') {
                  return (
                    <span key={i} class="gr-piece">
                      <span class="gr-jp">
                        <Word w={p.reading ? { text: p.text, reading: p.reading, tail: '' } : { text: '', tail: p.text }} />
                      </span>
                      {p.gloss && <small class="gr-gloss">{p.gloss}</small>}
                    </span>
                  );
                }
                const s = pz.slots[p.slot]!;
                const cls = !s.open ? 'gr-slot fixed' : s.filled ? 'gr-slot filled' : p.slot === active ? 'gr-slot active' : 'gr-slot empty';
                const w = slotWritten(s);
                return (
                  <span key={i} class={cls} data-slot={p.slot}>
                    <span class="gr-jp">
                      {s.verb && !s.filled ? (
                        <>
                          <span class="gr-dict">
                            <Word w={w} />
                          </span>
                          <span class="gr-hole">？</span>
                        </>
                      ) : s.filled ? (
                        <Word w={w} />
                      ) : (
                        <span class="gr-hole">？</span>
                      )}
                    </span>
                    {s.verb && <small class="gr-gloss">{s.verb.pt}</small>}
                  </span>
                );
              })}
            </div>

            {pz.why && (
              <p class="gr-why" data-testid="gr-why">
                <b lang="ja">{pz.why.block}</b> não encaixa aqui. {pz.why.text}
              </p>
            )}

            {round.phase === 'build' && slot && (
              <div class="gr-tray" data-testid="gr-tray">
                {slot.tray.map((b, i) => {
                  const tried = slot.tried.includes(b);
                  const fit = fits(slot.role, b);
                  return (
                    <button
                      key={b}
                      class={`gr-block${tried ? ' tried' : ''}${slot.hint && fit ? ' hint' : ''}`}
                      data-ok={fit ? 'yes' : 'no'}
                      disabled={tried}
                      onClick={() => place(i)}
                    >
                      <kbd>{i + 1}</kbd>
                      <span lang="ja">{b}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {round.phase === 'solved' && (
              <div class="gr-done" data-testid="gr-done">
                <span>Frase pronta!</span>
                <button class="primary" onClick={proceed} data-testid="gr-next">
                  {round.index + 1 < ROUND_SIZE ? 'Próxima frase' : 'Ver o resumo'} <kbd>Enter</kbd>
                </button>
              </div>
            )}
          </section>
        )}

        <footer class="av-keys">
          {round.phase === 'build' ? (
            <span>
              <kbd>1</kbd>–<kbd>{slot?.tray.length ?? 1}</kbd> encaixar peça
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

  if (mode === 'summary' && summary) {
    return (
      <main class="gr">
        <section class="av-panel" data-testid="gr-summary">
          <span class="muted">Rodada concluída</span>
          <h2 class={summary.record ? 'big win' : 'big'}>{summary.score} pontos{summary.record ? ' · recorde!' : ''}</h2>
          <div class="summary">
            <div>
              <b>{summary.sentences}</b>
              <span>frases montadas</span>
            </div>
            <div>
              <b>
                {summary.clean}/{summary.gaps}
              </b>
              <span>peças de primeira</span>
            </div>
            <div>
              <b>{summary.bestCombo}</b>
              <span>melhor combo</span>
            </div>
            <div>
              <b class="gain">+{summary.xp}</b>
              <span>XP · +{summary.coins} moedas</span>
            </div>
          </div>
          {summary.learned.length > 0 && (
            <>
              <h3>Peças novas</h3>
              <ul class="gr-learned">
                {summary.learned.map((p) => (
                  <li key={p.id}>{p.title}</li>
                ))}
              </ul>
            </>
          )}
          {summary.unlocked.length > 0 && <p class="muted">Na próxima rodada chega: {summary.unlocked.map((p) => p.blocks.join(' ')).join(', ')}</p>}
          <div class="actions center">
            <button class="primary" onClick={start} data-testid="gr-again">
              Outra rodada <kbd>Enter</kbd>
            </button>
            <button class="ghost" onClick={() => setMode('menu')}>
              Parar aqui <kbd>Esc</kbd>
            </button>
          </div>
        </section>
      </main>
    );
  }

  const open = openPoints(COURSE, save);
  return (
    <main class="gr">
      <header class="km-top">
        <button class="ghost" onClick={() => go('hub')}>
          Fliperama <kbd>Esc</kbd>
        </button>
        <div class="gr-progress">
          <b>Kumitate</b> · montar frases
        </div>
        <span />
      </header>
      <section class="av-panel" data-testid="gr-menu">
        <p class="muted">
          Encaixe partículas e pontas de verbo até a frase dizer o que foi pedido. Peça que não serve volta com o motivo. Cada rodada tem {ROUND_SIZE} frases.
        </p>
        <button class="play-now" onClick={start} data-testid="gr-start">
          <span class="play-now-main">{save.rounds > 0 ? 'Nova rodada' : 'Começar'}</span>
          <span class="play-now-sub">
            {save.rounds > 0 ? `${save.rounds} ${save.rounds === 1 ? 'rodada' : 'rodadas'} · recorde ${save.best}` : `${ROUND_SIZE} frases`} <kbd>Enter</kbd>
          </span>
        </button>
        <ol class="gr-points" data-testid="gr-points">
          {POINTS.map((p, i) => {
            const isOpen = i < open.length;
            const card = app.data.cards[cardOf(p.id)];
            const level = masteryLevel(card);
            const state = !isOpen ? 'locked' : card ? 'seen' : 'next';
            return (
              <li key={p.id} class={`gr-point ${state}`} data-point={p.id}>
                <span class="gr-point-blocks" lang="ja">{isOpen ? p.blocks.join(' ') : '？'}</span>
                <span class="gr-point-title">{isOpen ? p.title : i === open.length ? `Abre com ${WINS_TO_UNLOCK} encaixes de primeira no ponto anterior` : 'Mais adiante'}</span>
                {card && (
                  <span class="gr-stars" title="Quanto já está firme na memória">
                    {'★'.repeat(level)}
                    {'☆'.repeat(5 - level)}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
