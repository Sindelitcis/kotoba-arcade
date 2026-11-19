import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { app, commit, go, kanjimonSave } from '../../core/app';
import { sfx, speak } from '../../core/audio';
import { cenaStyle } from '../../core/arte';
import { burstFrom, onomato, pulse } from '../../core/fx';
import { teclaDe } from '../../core/teclas';
import { artUrl, RARITY_COLORS } from './art';
import { CHEST_EVERY, Hunt, MAX_HEARTS, RARITY, type Enemy, type HuntEvent, type Question } from './engine';

interface View {
  enemy: Enemy;
  question: Question;
  hearts: number;
  combo: number;
  sinceChest: number;
}

interface Feedback {
  ok: boolean;
  chosen: string;
  note?: string;
}

type Overlay =
  | { t: 'capture'; enemy: Enemy; newCard: boolean; coins: number; xp: number }
  | { t: 'levelup'; level: number }
  | { t: 'chest'; coins: number; booster: boolean }
  | { t: 'over' };

const HIT_DELAY = 420;
const MISS_DELAY = 1700;

function newHunt(): Hunt {
  return new Hunt({
    cards: app.data.cards,
    profile: app.data.profile,
    save: kanjimonSave(),
    rng: Math.random,
    now: () => Date.now(),
  });
}

function snapshot(h: Hunt): View {
  return { enemy: { ...h.enemy }, question: h.question, hearts: h.hearts, combo: h.combo, sinceChest: h.sinceChest };
}

export function KanjiMonGame() {
  const hunt = useRef<Hunt | null>(null);
  if (!hunt.current) {
    hunt.current = newHunt();
    hunt.current.start();
  }
  const h = hunt.current;
  const [view, setView] = useState<View>(() => snapshot(h));
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [typed, setTyped] = useState('');
  const shownAt = useRef(performance.now());
  const locked = useRef(false);
  const cardEl = useRef<HTMLDivElement>(null);
  const arenaEl = useRef<HTMLElement>(null);
  const inputEl = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const overlay = overlays[0];
  const q = view.question;

  /** Mostra a próxima pergunta (ou o próximo KanjiMon) e libera a resposta. */
  const advance = () => {
    const current = hunt.current as Hunt;
    const next = snapshot(current);
    setView(next);
    setFeedback(null);
    setTyped('');
    shownAt.current = performance.now();
    locked.current = false;
    if (next.enemy.kanji !== view.enemy.kanji) {
      pulse(cardEl.current, 'pop');
      if (next.enemy.rarity === 'sr' || next.enemy.rarity === 'ur') {
        sfx.rare();
        onomato('raro', cardEl.current, 'kin');
        burstFrom(cardEl.current, RARITY_COLORS[next.enemy.rarity], 40);
      }
    }
  };

  const submit = (input: string) => {
    if (locked.current || overlay) return;
    const current = hunt.current as Hunt;
    locked.current = true;
    const asked = current.question;
    const events = current.answer(input, performance.now() - shownAt.current);
    commit();
    speak(asked.speak);

    const hit = events.find((e): e is Extract<HuntEvent, { t: 'hit' }> => e.t === 'hit');
    const queue: Overlay[] = [];
    for (const e of events) {
      if (e.t === 'capture' || e.t === 'levelup' || e.t === 'chest' || e.t === 'over') queue.push(e);
    }

    if (hit) {
      sfx.hit(hit.combo);
      if (hit.fast) sfx.fast();
      onomato(hit.fast ? 'rapido' : 'acerto', cardEl.current, 'shu');
      burstFrom(cardEl.current, RARITY_COLORS[view.enemy.rarity], hit.fast ? 34 : 20);
      pulse(cardEl.current, 'hurt');
      setFeedback({
        ok: true,
        chosen: input,
        note: hit.close ? `Valeu, mas repare na vogal longa: ${asked.answer}` : hit.fast ? 'Rápido! +2' : undefined,
      });
      const captured = events.some((e) => e.t === 'capture');
      setView((v) => ({
        ...v,
        combo: current.combo,
        sinceChest: captured ? v.sinceChest + 1 : v.sinceChest,
        enemy: { ...v.enemy, seals: hit.sealsLeft },
      }));
    } else {
      sfx.miss();
      onomato('erro', cardEl.current);
      pulse(arenaEl.current, 'flash-bad');
      pulse(arenaEl.current, 'shake');
      setFeedback({ ok: false, chosen: input });
      setView((v) => ({ ...v, combo: 0, hearts: current.hearts }));
    }

    timer.current = window.setTimeout(
      () => {
        if (queue.length > 0) setOverlays(queue);
        else advance();
      },
      hit ? (hit.close ? MISS_DELAY : HIT_DELAY) : MISS_DELAY,
    );
  };

  /** Fecha o aviso atual; quando acabam os avisos, a caçada segue. */
  const dismiss = () => {
    if (!overlay) return;
    if (overlay.t === 'over') {
      hunt.current = newHunt();
      hunt.current.start();
      setOverlays([]);
      setView(snapshot(hunt.current));
      setFeedback(null);
      shownAt.current = performance.now();
      locked.current = false;
      return;
    }
    const rest = overlays.slice(1);
    setOverlays(rest);
    if (rest.length === 0) {
      const current = hunt.current as Hunt;
      if (current.phase === 'chest') current.continue();
      advance();
    }
  };

  const leave = () => {
    commit();
    go('hub');
  };

  // Efeitos de cada aviso ao aparecer
  useEffect(() => {
    if (!overlay) return;
    if (overlay.t === 'capture') {
      const tier = ['c', 'r', 'sr', 'ur'].indexOf(overlay.enemy.rarity);
      sfx.capture(tier);
      onomato('captura', document.querySelector('.capture-card'), 'shu', 1.3);
      burstFrom(document.querySelector('.capture-card'), RARITY_COLORS[overlay.enemy.rarity], 30 + tier * 20, 520);
      const auto = window.setTimeout(dismiss, 1500);
      return () => clearTimeout(auto);
    }
    if (overlay.t === 'levelup') {
      sfx.levelup();
      onomato('nivel', document.querySelector('.overlay h2'), 'shu', 1.4);
    }
    if (overlay.t === 'chest') {
      sfx.chest();
      onomato('bau', document.querySelector('.overlay h2'), 'kin', 1.2);
    }
    if (overlay.t === 'over') sfx.over();
    return undefined;
  }, [overlay]);

  // Ligado junto com o desenho da tela: tecla apertada logo que a tela aparece não se perde.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tecla = teclaDe(e);
      if (tecla === null) return;
      if (tecla === 'Escape') {
        e.preventDefault();
        leave();
        return;
      }
      if (overlay) {
        if (tecla === 'Enter' || tecla === ' ') {
          e.preventDefault();
          dismiss();
        }
        return;
      }
      if (!q.typing && /^[1-4]$/.test(tecla)) {
        const choice = q.choices[Number(tecla) - 1];
        if (choice) submit(choice);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (q.typing && !overlay) inputEl.current?.focus();
  }, [q, overlay]);

  const hideCard = q.kind === 'kanji-recall' && !feedback;
  const stats = h.stats;

  return (
    <main class="km">
      <header class="km-top">
        <div class="hearts" aria-label={`${view.hearts} corações`} data-testid="hearts">
          {Array.from({ length: MAX_HEARTS }, (_, i) => (
            <span key={i} class={i < view.hearts ? 'heart on' : 'heart'}>
              ♥
            </span>
          ))}
        </div>
        <div class={view.combo > 1 ? 'combo on' : 'combo'}>Combo x{view.combo}</div>
        <div class="chest-track" title="Capturas até o próximo baú">
          {Array.from({ length: CHEST_EVERY }, (_, i) => (
            <span key={i} class={i < view.sinceChest ? 'dot on' : 'dot'} />
          ))}
          <span class="chest-icon">baú</span>
        </div>
        <div class="stat">
          <span class="coin">●</span> <b>{app.data.profile.coins}</b>
        </div>
        <button class="ghost" onClick={leave}>
          Sair <kbd>Esc</kbd>
        </button>
      </header>

      <section class="arena" ref={arenaEl} style={cenaStyle('kanjimon-takao')}>
        <div class={`enemy-card r-${view.enemy.rarity}${hideCard ? ' hidden-face' : ''}`} ref={cardEl}>
          <img src={artUrl(view.enemy.kanji, view.enemy.rarity)} alt="" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />
          <div class="enemy-kanji" data-testid="enemy-kanji">
            {hideCard ? '？' : view.enemy.kanji.kanji}
          </div>
          <div class="enemy-rarity">{RARITY[view.enemy.rarity].name}</div>
          {view.enemy.isNew && <span class="badge">NOVO</span>}
          <div class="seals">
            {Array.from({ length: view.enemy.maxSeals }, (_, i) => (
              <span key={i} class={i < view.enemy.seals ? 'seal on' : 'seal'} />
            ))}
          </div>
        </div>

        <div class="question">
          {q.teach && !feedback && (
            <div class="teach" data-testid="teach">
              <b>{q.teach.title}</b>
              {q.teach.lines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
          )}
          <div key={q.prompt} class={`prompt ${q.kind}`} data-testid="prompt">
            {q.prompt}
          </div>
          {q.sub && <div class="sub">{q.sub}</div>}
          <div class="ask">{q.ask}</div>

          {q.typing ? (
            <form
              class="typing"
              onSubmit={(e) => {
                e.preventDefault();
                if (typed.trim()) submit(typed);
              }}
            >
              <input
                ref={inputEl}
                value={typed}
                onInput={(e) => setTyped((e.target as HTMLInputElement).value)}
                placeholder="ex.: hitori ou ひとり"
                autocomplete="off"
                autocapitalize="off"
                spellcheck={false}
                disabled={!!feedback}
                class={feedback ? (feedback.ok ? 'right' : 'wrong') : ''}
                data-testid="typing"
              />
              <button type="submit" disabled={!!feedback}>
                Atacar <kbd>Enter</kbd>
              </button>
            </form>
          ) : (
            <div class={`choices ${q.kind}`}>
              {q.choices.map((c, i) => {
                let cls = 'choice';
                if (feedback) {
                  if (c === q.answer) cls += ' right';
                  else if (c === feedback.chosen) cls += ' wrong';
                  else cls += ' dim';
                } else if (q.teach && c === q.answer) cls += ' hint';
                return (
                  <button key={c} class={cls} onClick={() => submit(c)} data-answer={c === q.answer ? 'yes' : undefined}>
                    <kbd>{i + 1}</kbd>
                    <span>{c}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div class={`echo${feedback ? ' show' : ''}${feedback && !feedback.ok ? ' bad' : ''}`}>
            {feedback && (
              <>
                {!feedback.ok && <b>Era: {q.answer}</b>}
                {feedback.note && <b>{feedback.note}</b>}
                <span>{q.echo}</span>
              </>
            )}
          </div>
        </div>
      </section>

      {overlay?.t === 'capture' && (
        <div class="overlay win" onClick={dismiss}>
          <div class={`capture-card r-${overlay.enemy.rarity}`}>
            <img src={artUrl(overlay.enemy.kanji, overlay.enemy.rarity)} alt="" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />
            <div class="enemy-kanji">{overlay.enemy.kanji.kanji}</div>
          </div>
          <h2>Capturado!</h2>
          <p>
            {overlay.enemy.kanji.kanji} · {overlay.enemy.kanji.pt[0]} · {RARITY[overlay.enemy.rarity].name}
            {overlay.newCard && <span class="badge inline">carta nova</span>}
          </p>
          <p class="gain">
            +{overlay.coins} moedas · +{overlay.xp} XP
          </p>
        </div>
      )}

      {overlay?.t === 'levelup' && (
        <div class="overlay win" onClick={dismiss}>
          <h2 class="big win">Nível {overlay.level}!</h2>
          <p class="muted">
            <kbd>Enter</kbd> para seguir
          </p>
        </div>
      )}

      {overlay?.t === 'chest' && (
        <div class="overlay win">
          <h2 class="big win">Baú!</h2>
          <p class="gain">
            +{overlay.coins} moedas{overlay.booster ? ' · +1 booster grátis' : ''} · +1 coração
          </p>
          <Summary stats={stats} />
          <p class="muted">Bom ponto para parar, se quiser.</p>
          <div class="actions center">
            <button class="primary" onClick={dismiss} data-testid="continue">
              Continuar caçada <kbd>Enter</kbd>
            </button>
            <button onClick={leave}>
              Parar por aqui <kbd>Esc</kbd>
            </button>
          </div>
        </div>
      )}

      {overlay?.t === 'over' && (
        <div class="overlay">
          <h2 class="big">Fim da caçada</h2>
          <p class="muted">Os corações acabaram. Tudo que você capturou continua seu.</p>
          <Summary stats={stats} />
          <div class="actions center">
            <button class="primary" onClick={dismiss}>
              Nova caçada <kbd>Enter</kbd>
            </button>
            <button onClick={leave}>
              Voltar ao fliperama <kbd>Esc</kbd>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Summary({ stats }: { stats: Hunt['stats'] }) {
  const total = stats.correct + stats.wrong;
  return (
    <div class="summary">
      <div>
        <b>{stats.captured}</b>
        <span>capturas</span>
      </div>
      <div>
        <b>{total === 0 ? '-' : `${Math.round((stats.correct / total) * 100)}%`}</b>
        <span>de acerto</span>
      </div>
      <div>
        <b>{stats.bestCombo}</b>
        <span>melhor combo</span>
      </div>
      <div>
        <b>{stats.newKanji.length > 0 ? stats.newKanji.join(' ') : '-'}</b>
        <span>kanji novos</span>
      </div>
    </div>
  );
}
