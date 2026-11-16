import { useEffect, useRef, useState } from 'preact/hooks';
import { KANJI, type Sentence } from '../content';
import { app, commit, go, kanjimonSave, replaceSave, screen, tick, type Screen } from '../core/app';
import { hasJapaneseVoice, sfx, speak } from '../core/audio';
import { levelInfo, readingMeter, recentDays } from '../core/progress';
import { exportSave } from '../core/save';
import { BOOSTER_COST, canOpenBooster } from '../games/kanjimon/engine';

interface Tile {
  id: string;
  title: string;
  jp: string;
  blurb: string;
  screen?: Screen;
}

const TILES: Tile[] = [
  { id: 'kanjimon', title: 'KanjiMon', jp: '漢字モン', blurb: 'Cace kanji, quebre os selos, complete a coleção.', screen: 'kanjimon' },
  { id: 'kanabeat', title: 'Kana Beat', jp: 'かなビート', blurb: 'Digite no ritmo. Kana e palavras no tempo da batida.', screen: 'kanabeat' },
  { id: 'roguelike', title: 'Kotodama', jp: '言霊', blurb: 'Roguelike de cartas. Runs curtas, relíquias e um chefe no topo.', screen: 'roguelike' },
  { id: 'aventura', title: 'Aventura', jp: '冒険', blurb: 'Você chegou ao Japão. Cenas curtas com japonês de verdade.', screen: 'aventura' },
  { id: 'voz', title: 'Conversa por voz', jp: '会話', blurb: 'Personagens com IA rodando no seu PC. Na fila.' },
];

/** Frases cujo kanji o jogador já encontrou: prova concreta de que dá para ler mais que ontem. */
function readableSentences(): Sentence[] {
  const seen = new Set(KANJI.filter((k) => app.data.cards[`${k.id}#meaning`]).map((k) => k.kanji));
  const all = new Set(KANJI.map((k) => k.kanji));
  const out: Sentence[] = [];
  for (const k of KANJI) {
    for (const s of k.sentences) {
      const needed = [...s.jp].filter((c) => all.has(c));
      if (needed.length > 0 && needed.every((c) => seen.has(c))) out.push(s);
    }
  }
  return out;
}

export function Hub() {
  void tick.value;
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { profile, settings, cards } = app.data;
  const lv = levelInfo(profile.xp);
  const meter = readingMeter(cards);
  const days = recentDays(app.data, Date.now());
  const km = kanjimonSave();
  const sentences = readableSentences();
  const sentence = sentences.length > 0 ? sentences[sentences.length - 1] : undefined;
  const nextGame: Screen =
    profile.lastGame === 'kanabeat' || profile.lastGame === 'roguelike' || profile.lastGame === 'aventura' ? profile.lastGame : 'kanjimon';
  const nextLabel = { kanabeat: 'Kana Beat · Próxima música', roguelike: 'Kotodama · Nova run', aventura: 'Aventura · Próxima cena', kanjimon: 'KanjiMon · Caçada' }[nextGame];
  const booster = canOpenBooster(profile, km, cards);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Na troca de tela este ouvinte ainda vive por um instante: tecla de outro jogo não é do fliperama.
      if (screen.value !== 'hub') return;
      if (showSettings) {
        if (e.key === 'Escape') setShowSettings(false);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go(nextGame);
      } else if (e.key.toLowerCase() === 'd') go('kanjidex');
      else if (e.key.toLowerCase() === 'b' && booster === 'ok') go('booster');
      else if (e.key.toLowerCase() === 'k') go('kanabeat');
      else if (e.key.toLowerCase() === 'c') go('kanjimon');
      else if (e.key.toLowerCase() === 'r') go('roguelike');
      else if (e.key.toLowerCase() === 'a') go('aventura');
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [showSettings, booster, nextGame]);

  const toggle = (key: 'sound' | 'voice' | 'calm') => {
    settings[key] = !settings[key];
    commit();
    sfx.click();
  };

  const download = () => {
    const blob = new Blob([exportSave(app.data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kotoba-arcade-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMessage('Backup salvo na pasta de downloads.');
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      replaceSave(await file.text());
      setMessage('Save importado.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não deu para importar.');
    }
  };

  return (
    <main class="hub">
      <header class="hub-top">
        <div class="brand">
          <span class="brand-jp">言葉</span>
          <div>
            <h1>Kotoba Arcade</h1>
            <p>Jogue. O japonês vem junto.</p>
          </div>
        </div>
        <div class="stats">
          <div class="stat" title="Nível">
            <span class="stat-label">Nível {lv.level}</span>
            <div class="bar">
              <i style={{ width: `${(lv.into / lv.need) * 100}%` }} />
            </div>
          </div>
          <div class="stat" title="Moedas">
            <span class="coin">●</span> <b data-testid="coins">{profile.coins}</b>
          </div>
          <div class="stat week" title="Dias jogados nos últimos 7. Faltar um dia não apaga nada.">
            {days.map((on, i) => (
              <span key={i} class={on ? 'day on' : 'day'} />
            ))}
          </div>
          <button class="ghost" onClick={() => setShowSettings(true)} aria-label="Ajustes">
            Ajustes
          </button>
        </div>
      </header>

      <button class="play-now" onClick={() => go(nextGame)} data-testid="play-now">
        <span class="play-now-main">Jogar agora</span>
        <span class="play-now-sub">{nextLabel} <kbd>Enter</kbd></span>
      </button>

      <section class="tiles">
        {TILES.map((t) => (
          <button key={t.id} class={t.screen ? 'tile' : 'tile soon'} disabled={!t.screen} onClick={() => t.screen && go(t.screen)}>
            <span class="tile-jp">{t.jp}</span>
            <span class="tile-title">
              {t.title}
              {t.id === 'kanjimon' && <kbd>C</kbd>}
              {t.id === 'kanabeat' && <kbd>K</kbd>}
              {t.id === 'roguelike' && <kbd>R</kbd>}
              {t.id === 'aventura' && <kbd>A</kbd>}
            </span>
            <span class="tile-blurb">{t.blurb}</span>
          </button>
        ))}
      </section>

      <section class="row">
        <div class="panel">
          <h2>O que você já lê</h2>
          <div class="meter">
            <div>
              <b data-testid="kanji-seen">{meter.kanjiSeen}</b> de {meter.kanjiTotal} kanji encontrados
              <div class="bar">
                <i class="soft" style={{ width: `${(meter.kanjiSeen / meter.kanjiTotal) * 100}%` }} />
                <i style={{ width: `${(meter.kanjiKnown / meter.kanjiTotal) * 100}%` }} />
              </div>
              <small>{meter.kanjiKnown} já firmes na memória</small>
            </div>
            <div>
              <b>{meter.wordsSeen}</b> de {meter.wordsTotal} palavras
              <div class="bar">
                <i class="soft" style={{ width: `${(meter.wordsSeen / meter.wordsTotal) * 100}%` }} />
                <i style={{ width: `${(meter.wordsKnown / meter.wordsTotal) * 100}%` }} />
              </div>
              <small>{meter.wordsKnown} já firmes na memória</small>
            </div>
          </div>
          {sentence ? (
            <button class="sentence" onClick={() => speak(sentence.jp)} title="Ouvir">
              <span class="sentence-count">{sentences.length} {sentences.length === 1 ? 'frase' : 'frases'} que você já consegue ler. A mais recente:</span>
              <span class="sentence-jp">{sentence.jp}</span>
              <span class="sentence-pt">{sentence.romaji} · {sentence.pt}</span>
            </button>
          ) : (
            <p class="muted">Capture seus primeiros KanjiMon e as frases que você consegue ler aparecem aqui.</p>
          )}
        </div>

        <div class="panel">
          <h2>KanjiMon</h2>
          <p class="muted">
            {km.captures} capturas · {Object.keys(km.dex).length} de {KANJI.length * 4} cartas · melhor combo {km.bestCombo}
          </p>
          <div class="actions">
            <button onClick={() => go('kanjimon')}>Caçar</button>
            <button onClick={() => go('kanjidex')}>
              KanjiDex <kbd>D</kbd>
            </button>
            <button disabled={booster !== 'ok'} onClick={() => go('booster')}>
              Booster {km.boosters > 0 ? `(${km.boosters} grátis)` : `(${BOOSTER_COST} moedas)`} <kbd>B</kbd>
            </button>
          </div>
          {booster === 'sem-kanji' && <small class="muted">O booster abre depois que você encontrar 3 kanji.</small>}
        </div>
      </section>

      {showSettings && (
        <div class="modal" onClick={() => setShowSettings(false)}>
          <div class="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>Ajustes</h2>
            <label class="check">
              <input type="checkbox" checked={settings.sound} onChange={() => toggle('sound')} /> Efeitos sonoros
            </label>
            <label class="check">
              <input type="checkbox" checked={settings.voice} onChange={() => toggle('voice')} /> Voz em japonês
              {!hasJapaneseVoice() && <small class="muted"> (este navegador não tem voz japonesa instalada)</small>}
            </label>
            <label class="check">
              <input type="checkbox" checked={settings.calm} onChange={() => toggle('calm')} /> Modo calmo (menos tremor e partículas)
            </label>
            <h3>Save</h3>
            <p class="muted">O progresso fica neste navegador. Guarde um backup de vez em quando.</p>
            <div class="actions">
              <button onClick={download}>Exportar backup</button>
              <button onClick={() => fileRef.current?.click()}>Importar backup</button>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void upload((e.target as HTMLInputElement).files?.[0])} />
            </div>
            {message && <p class="notice">{message}</p>}
            <button class="ghost" onClick={() => setShowSettings(false)}>
              Fechar <kbd>Esc</kbd>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
