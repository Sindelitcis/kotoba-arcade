import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { findWord } from '../../content/vida';
import { app, aventuraSave, commit, go, screen } from '../../core/app';
import { CENA_AVENTURA, cenaStyle, pessoaCorUrl, pessoaUrl } from '../../core/arte';
import { corStyle } from '../../core/cor';
import { Pintura } from '../../core/Pintura';
import { sfx, speak, speakWord } from '../../core/audio';
import { vozDaAventura } from '../../core/vozes';
import { onomato } from '../../core/fx';
import { hasKanji } from '../../core/kana';
import { foco } from '../../core/foco';
import { tocarSequencia } from '../../core/sequencia';
import { teclaDe } from '../../core/teclas';
import { SCENES, SPEAKERS } from './cenas';
import { diaryEntries, isUnlocked, PLAYER, ScenePlay, suggestScene, type PlayEvent, type Scene, type SceneSummary, type Shown, type TokenView } from './engine';

/** A narração vai na voz em português; as falas, na voz de quem fala. */
function falarQuadro(shown: Shown): void {
  if (shown.kind === 'narra') tocarSequencia([{ tipo: 'pt', texto: shown.pt }]);
  else if (shown.plain) speak(shown.plain, vozDaAventura(shown.who));
}

type Mode = 'menu' | 'play' | 'summary' | 'diary';

function whoName(who: string | undefined): string {
  if (!who) return '';
  return who === PLAYER ? 'Você' : (SPEAKERS[who]?.name ?? '');
}

/** Uma fala em japonês: leitura em cima do kanji conforme a ajuda de cada palavra. */
function Line({ tokens, allReadings }: { tokens: readonly TokenView[]; allReadings: boolean }) {
  return (
    <>
      {tokens.map((t, i) => {
        const cls = t.word ? (t.help === 'full' ? 'av-w new' : 'av-w') : undefined;
        if (t.reading && (allReadings || t.help !== 'none')) {
          return (
            <ruby key={i} class={cls}>
              {t.text}
              <rt>{t.reading}</rt>
            </ruby>
          );
        }
        return (
          <span key={i} class={cls}>
            {t.text}
          </span>
        );
      })}
    </>
  );
}

/** Palavras da fala com o significado: as novas sempre, as outras quando o jogador pede. */
function Glosses({ tokens, all }: { tokens: readonly TokenView[]; all: boolean }) {
  const seen = new Set<string>();
  const items = tokens.filter((t) => {
    if (!t.word || seen.has(t.word.id) || (!all && t.help !== 'full')) return false;
    seen.add(t.word.id);
    return true;
  });
  if (items.length === 0) return null;
  return (
    <ul class="av-glosses" data-testid="av-glosses">
      {items.map((t) => {
        const w = t.word!;
        return (
          <li key={w.id} class={t.help === 'full' ? 'new' : undefined}>
            <b>{t.text}</b>
            {w.jp !== t.text && <i>{hasKanji(w.jp) && w.kana !== t.text ? `${w.jp}・${w.kana}` : w.jp}</i>}
            <span>{w.pt}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function AventuraGame() {
  const save = aventuraSave();
  const [mode, setModeState] = useState<Mode>('menu');
  // Duas teclas seguidas chegam antes de a tela redesenhar: o teclado lê o modo daqui, que muda na hora.
  const modeRef = useRef<Mode>('menu');
  const setMode = (next: Mode) => {
    modeRef.current = next;
    setModeState(next);
  };
  const [, setFrame] = useState(0);
  const redraw = () => setFrame((n) => n + 1);
  const playRef = useRef<ScenePlay | null>(null);
  const [summary, setSummary] = useState<SceneSummary | null>(null);
  const [note, setNote] = useState('');
  const [diaryIndex, setDiaryIndex] = useState(0);
  const [diaryMeaning, setDiaryMeaning] = useState(false);
  const diaryEl = useRef<HTMLOListElement>(null);
  const play = playRef.current;

  // Missão da Jornada: o Enter abre a cena da missão, mesmo antes de a história chegar nela.
  const sugerida = () => SCENES.find((s) => s.id === foco.value?.cena) ?? suggestScene(SCENES, save, app.data.cards, Date.now());
  const suggested = sugerida();
  const allDone = SCENES.every((s) => save.done.includes(s.id));
  const diary = mode === 'diary' ? diaryEntries(SCENES, save, app.data.cards, findWord) : [];

  const start = (scene: Scene | undefined) => {
    if (!scene) return;
    playRef.current = new ScenePlay(scene, {
      cards: app.data.cards,
      profile: app.data.profile,
      save,
      lookup: findWord,
      now: () => Date.now(),
    });
    setSummary(null);
    setNote('');
    setMode('play');
    sfx.click();
  };

  const react = (events: PlayEvent[]) => {
    for (const e of events) {
      if (e.t === 'result') {
        if (e.r === 'ok') sfx.hit(3);
        else sfx.click();
      } else if (e.t === 'levelup') {
        sfx.levelup();
        setNote(`Nível ${e.level}!`);
      } else if (e.t === 'end') {
        sfx.chest();
        requestAnimationFrame(() => onomato('captura', document.querySelector('.av-panel h2'), 'shu', 1.2));
        setSummary(e.summary);
        setMode('summary');
      }
    }
    commit();
    redraw();
  };

  const advance = () => {
    const p = playRef.current;
    if (!p || p.awaitingChoice) return;
    react(p.advance());
  };

  const choose = (index: number) => {
    const p = playRef.current;
    if (!p || !p.awaitingChoice) return;
    react(p.choose(index));
  };

  const openDiary = () => {
    const count = diaryEntries(SCENES, save, app.data.cards, findWord).length;
    setDiaryIndex(Math.max(0, count - 1));
    setDiaryMeaning(false);
    setMode('diary');
  };

  // A voz acompanha o que entra na tela.
  const seq = mode === 'play' && play ? play.seq : -1;
  useEffect(() => {
    if (mode === 'play' && play) falarQuadro(play.shown);
  }, [mode, play, seq]);

  useEffect(() => {
    if (mode !== 'diary') return;
    diaryEl.current?.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
  }, [mode, diaryIndex]);

  // Ouvinte ligado junto com o desenho da tela: tecla apertada logo que a tela aparece não se perde.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tecla = teclaDe(e);
      if (tecla === null) return;
      // Na troca de tela este ouvinte ainda vive por um instante.
      if (screen.value !== 'aventura') return;
      const key = tecla.toLowerCase();
      const confirm = tecla === 'Enter' || tecla === ' ';
      const digit = /^[1-9]$/.test(tecla) ? Number(tecla) : 0;
      if (confirm || tecla === 'ArrowUp' || tecla === 'ArrowDown') e.preventDefault();

      const mode = modeRef.current;
      const summary = playRef.current?.summary ?? null;
      if (mode === 'menu') {
        if (tecla === 'Escape') go('hub');
        else if (confirm) start(sugerida());
        else if (key === 'd' && save.diary.length > 0) openDiary();
        else if (digit && isUnlocked(SCENES, save, digit - 1)) start(SCENES[digit - 1]);
      } else if (mode === 'play') {
        const p = playRef.current;
        if (!p) return;
        if (tecla === 'Escape') setMode('menu');
        else if (key === 'f') {
          p.askReading();
          redraw();
        } else if (key === 's') {
          p.askMeaning();
          redraw();
        } else if (key === 'r') {
          falarQuadro(p.shown);
        } else if (p.awaitingChoice) {
          if (digit) choose(digit - 1);
        } else if (confirm) advance();
      } else if (mode === 'summary') {
        if (tecla === 'Escape') setMode('menu');
        else if (confirm && foco.value) go('hub');
        else if (confirm) {
          const index = summary ? SCENES.indexOf(summary.scene) : -1;
          const next = SCENES[index + 1];
          if (next) start(next);
          else setMode('menu');
        } else if (key === 'd') openDiary();
      } else if (mode === 'diary') {
        if (tecla === 'Escape') setMode('menu');
        else if (tecla === 'ArrowDown') setDiaryIndex((i) => Math.min(save.diary.length - 1, i + 1));
        else if (tecla === 'ArrowUp') setDiaryIndex((i) => Math.max(0, i - 1));
        else if (key === 's') setDiaryMeaning((v) => !v);
        else if (confirm || key === 'r') {
          const entry = diaryEntries(SCENES, save, app.data.cards, findWord)[diaryIndex];
          if (entry) speak(entry.plain, vozDaAventura(entry.who));
        }
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  if (mode === 'play' && play) {
    const s = play.shown;
    const mine = s.who === PLAYER;
    return (
      <main class="av">
        <header class="km-top">
          <button class="ghost" onClick={() => setMode('menu')}>
            Sair <kbd>Esc</kbd>
          </button>
          <div class="av-place">
            <b>{play.scene.title}</b> · {play.scene.place}
          </div>
          <span class="av-note">{note}</span>
        </header>

        <section
          class={`av-stage ${s.kind}${mine ? ' mine' : ''}`}
          data-testid="av-stage"
          data-kind={s.kind}
          // Viver a cena é em cor de anime; a narração é o quadro de mangá que faz a passagem.
          style={{ ...cenaStyle(CENA_AVENTURA[play.scene.id]), ...corStyle(s.kind === 'narra' ? 0 : 1) }}
        >
          <Pintura cena={CENA_AVENTURA[play.scene.id]} />
          {!mine && pessoaUrl(s.who) && (
            <img
              key={`${s.who}-${s.kind === 'narra' ? 'tinta' : 'cor'}`}
              class={s.kind === 'narra' ? 'av-portrait' : 'av-portrait cor'}
              src={(s.kind !== 'narra' && pessoaCorUrl(s.who)) || pessoaUrl(s.who)}
              alt={whoName(s.who)}
            />
          )}
          {s.kind === 'narra' || s.tokens.length === 0 ? (
            <p class="av-narra" data-testid="av-narra">{s.pt}</p>
          ) : (
            <>
              <span class="av-who" data-testid="av-who">{whoName(s.who)}</span>
              <p class="av-line" data-testid="av-line" lang="ja">
                <Line tokens={s.tokens} allReadings={s.reading} />
              </p>
              <Glosses tokens={s.tokens} all={s.meaning} />
              {s.meaning && <p class="av-pt" data-testid="av-pt">{s.pt}</p>}
            </>
          )}

          {play.awaitingChoice && (
            <div class="av-options" data-testid="av-options">
              {s.options.map((o, i) => (
                <button key={i} class={o.tried ? 'av-option tried' : 'av-option'} data-result={o.r} onClick={() => choose(i)}>
                  <kbd>{i + 1}</kbd>
                  <span class="av-option-text">
                    <span class="av-option-jp" lang="ja">
                      <Line tokens={o.tokens} allReadings={s.reading} />
                    </span>
                    {s.meaning && <small class="muted">{o.pt}</small>}
                    <Glosses tokens={o.tokens} all={s.meaning} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <footer class="av-keys">
          {play.awaitingChoice ? (
            <span>
              <kbd>1</kbd>–<kbd>{s.options.length}</kbd> responder
            </span>
          ) : (
            <button class="primary" onClick={advance} data-testid="av-next">
              Seguir <kbd>Enter</kbd>
            </button>
          )}
          <span>
            <kbd>R</kbd> ouvir de novo
          </span>
          <span>
            <kbd>F</kbd> leitura
          </span>
          <span>
            <kbd>S</kbd> significado
          </span>
        </footer>
      </main>
    );
  }

  if (mode === 'summary' && summary) {
    const index = SCENES.indexOf(summary.scene);
    const next = SCENES[index + 1];
    return (
      <main class="av">
        <section class="av-panel" data-testid="av-summary">
          <span class="muted">Cena concluída</span>
          <h2 class="big win">{summary.scene.title}</h2>
          <div class="summary">
            <div>
              <b>{summary.lines}</b>
              <span>falas vividas</span>
            </div>
            <div>
              <b>
                {summary.firstTry}/{summary.choices}
              </b>
              <span>entendidas de primeira</span>
            </div>
            <div>
              <b>{summary.newWords.length}</b>
              <span>palavras novas</span>
            </div>
            <div>
              <b class="gain">+{summary.xp}</b>
              <span>XP · +{summary.coins} moedas</span>
            </div>
          </div>
          {summary.newWords.length > 0 && (
            <>
              <h3>Você passou a entender</h3>
              <ul class="av-words">
                {summary.newWords.map((w) => (
                  <li key={w.id}>
                    <button onClick={() => speakWord(w.kana)} title="Ouvir">
                      <b lang="ja">{w.jp}</b>
                      {hasKanji(w.jp) && <i>{w.kana}</i>}
                      <span>{w.pt}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {summary.missed.length > 0 && (
            <p class="muted">
              Voltam em breve, nas próximas cenas e nos outros jogos: {summary.missed.map((w) => w.jp).join('、')}
            </p>
          )}
          <div class="actions center">
            {foco.value ? (
              <button class="primary" onClick={() => go('hub')}>
                Voltar à Jornada <kbd>Enter</kbd>
              </button>
            ) : (
              <button class="primary" onClick={() => (next ? start(next) : setMode('menu'))}>
                {next ? `Próxima cena: ${next.title}` : 'Voltar às cenas'} <kbd>Enter</kbd>
              </button>
            )}
            <button onClick={openDiary}>
              Diário <kbd>D</kbd>
            </button>
            <button class="ghost" onClick={() => setMode('menu')}>
              Parar aqui <kbd>Esc</kbd>
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (mode === 'diary') {
    return (
      <main class="av">
        <header class="km-top">
          <button class="ghost" onClick={() => setMode('menu')}>
            Voltar <kbd>Esc</kbd>
          </button>
          <div class="av-place">
            <b>Diário</b> · {diary.length} {diary.length === 1 ? 'fala vivida' : 'falas vividas'}
          </div>
          <span />
        </header>
        <ol class="av-diary" data-testid="av-diary" ref={diaryEl}>
          {diary.map((entry, i) => (
            <li key={entry.ref}>
              {(i === 0 || diary[i - 1]?.scene !== entry.scene) && <h3>{entry.scene.title}</h3>}
              <button
                class={i === diaryIndex ? 'av-entry on' : 'av-entry'}
                onClick={() => {
                  setDiaryIndex(i);
                  speak(entry.plain, vozDaAventura(entry.who));
                }}
              >
                <span class="av-who">{whoName(entry.who)}</span>
                <span class="av-entry-jp" lang="ja">
                  <Line tokens={entry.tokens} allReadings={false} />
                </span>
                {(diaryMeaning || i === diaryIndex) && <small class="muted">{entry.pt}</small>}
              </button>
            </li>
          ))}
        </ol>
        <footer class="av-keys">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> escolher
          </span>
          <span>
            <kbd>Enter</kbd> ouvir
          </span>
          <span>
            <kbd>S</kbd> {diaryMeaning ? 'esconder' : 'mostrar'} todas as traduções
          </span>
        </footer>
      </main>
    );
  }

  return (
    <main class="av">
      <header class="km-top">
        <button class="ghost" onClick={() => go('hub')}>
          Fliperama <kbd>Esc</kbd>
        </button>
        <div class="av-place">
          <b>Aventura</b> · um ano no Japão
        </div>
        <span />
      </header>
      <section class="av-panel" data-testid="av-menu">
        <p class="muted">
          Você acabou de chegar ao Japão. Ninguém aqui fala português. Responda como der: se a pessoa não entender, ela reage e a conversa continua.
        </p>
        <button class="play-now" onClick={() => start(suggested)} data-testid="av-start">
          <span class="play-now-main">{allDone ? 'Reviver uma cena' : save.done.length > 0 ? 'Continuar' : 'Começar'}</span>
          <span class="play-now-sub">
            {suggested?.title} <kbd>Enter</kbd>
          </span>
        </button>
        <div class="av-scenes">
          {SCENES.map((scene, i) => {
            const open = isUnlocked(SCENES, save, i);
            const done = save.done.includes(scene.id);
            return (
              <button
                key={scene.id}
                class={done ? 'tile done pintado' : open ? 'tile' : 'tile soon'}
                style={{ ...cenaStyle(CENA_AVENTURA[scene.id]), ...corStyle(done ? 1 : 0) }}
                disabled={!open}
                onClick={() => start(scene)}
                data-scene={scene.id}
              >
                <Pintura cena={CENA_AVENTURA[scene.id]} />
                <span class="tile-jp" lang="ja">{scene.jp}</span>
                <span class="tile-title">
                  {scene.title}
                  {open && <kbd>{i + 1}</kbd>}
                </span>
                <span class="tile-blurb">{done ? `${scene.place} · concluída` : open ? scene.place : 'Abre depois da cena anterior'}</span>
              </button>
            );
          })}
        </div>
        <div class="actions center">
          <button disabled={save.diary.length === 0} onClick={openDiary}>
            Diário ({save.diary.length}) <kbd>D</kbd>
          </button>
        </div>
      </section>
    </main>
  );
}
