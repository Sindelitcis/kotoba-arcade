import { useLayoutEffect, useState } from 'preact/hooks';
import { cardKey, KANJI, type Kanji } from '../../content';
import { app, go, kanjimonSave, tick } from '../../core/app';
import { speak, speakKanji, speakWord } from '../../core/audio';
import { kanaToRomaji } from '../../core/kana';
import { masteryLevel } from '../../core/srs';
import { teclaDe } from '../../core/teclas';
import { useAprofundar } from '../../core/aprofundar/estado';
import { ArteCarta } from './ArteCarta';
import { dexKey, RARITIES, RARITY, type Rarity } from './engine';

function Stars({ level }: { level: number }) {
  return (
    <span class="stars" aria-label={`domínio ${level} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} class={i < level ? 'on' : ''} />
      ))}
    </span>
  );
}

export function Dex() {
  void tick.value;
  const [open, setOpen] = useState<Kanji | null>(null);
  const [face, setFace] = useState<Rarity>('c');
  useAprofundar(open ? { t: 'kanji', c: open.kanji } : null);
  const { cards } = app.data;
  const dex = kanjimonSave().dex;
  const owned = (k: Kanji) => RARITIES.filter((r) => dex[dexKey(k, r)]);

  // Ligado junto com o desenho da tela: tecla apertada logo que a tela aparece não se perde.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tecla = teclaDe(e);
      if (tecla === null) return;
      if (tecla !== 'Escape') return;
      if (open) setOpen(null);
      else go('hub');
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  const show = (k: Kanji) => {
    const mine = owned(k);
    setFace(mine[mine.length - 1] ?? 'c');
    setOpen(k);
  };

  const seenCount = KANJI.filter((k) => cards[cardKey(k.id, 'meaning')]).length;

  return (
    <main class="dex">
      <header class="km-top">
        <h1>KanjiDex</h1>
        <div class="muted">
          {seenCount} de {KANJI.length} kanji · {Object.keys(dex).length} de {KANJI.length * RARITIES.length} cartas
        </div>
        <button class="ghost" onClick={() => go('hub')}>
          Voltar <kbd>Esc</kbd>
        </button>
      </header>

      <section class="dex-grid">
        {KANJI.map((k) => {
          const seen = !!cards[cardKey(k.id, 'meaning')];
          const mine = owned(k);
          const best = mine[mine.length - 1];
          return (
            <button key={k.id} class={`dex-tile${seen ? '' : ' unseen'}${best ? ` r-${best}` : ''}`} disabled={!seen} onClick={() => show(k)}>
              <span class="dex-kanji">{seen ? k.kanji : '?'}</span>
              <span class="dex-pt">{seen ? k.pt[0] : '???'}</span>
              {seen && <Stars level={masteryLevel(cards[cardKey(k.id, 'meaning')])} />}
              <span class="dex-rarities">
                {RARITIES.map((r) => (
                  <i key={r} class={dex[dexKey(k, r)] ? `on r-${r}` : ''} />
                ))}
              </span>
            </button>
          );
        })}
      </section>

      {open && (
        <div class="modal" onClick={() => setOpen(null)}>
          <div class="modal-box wide" onClick={(e) => e.stopPropagation()}>
            <div class="dex-detail">
              <div>
                <div class={`enemy-card r-${face}${dex[dexKey(open, face)] ? '' : ' locked'}`}>
                  {dex[dexKey(open, face)] ? <ArteCarta kanji={open} rarity={face} /> : null}
                  <div class="enemy-kanji">{open.kanji}</div>
                  <div class="enemy-rarity">{dex[dexKey(open, face)] ? RARITY[face].name : 'Ainda não capturada'}</div>
                </div>
                <div class="faces">
                  {RARITIES.map((r) => (
                    <button key={r} class={r === face ? 'on' : ''} onClick={() => setFace(r)}>
                      {RARITY[r].name}
                      {dex[dexKey(open, r)] ? ` ×${dex[dexKey(open, r)]}` : ''}
                    </button>
                  ))}
                </div>
              </div>
              <div class="dex-info">
                <h2>
                  {open.kanji} <small>{open.pt.join(', ')}</small>
                </h2>
                <button class="word dex-reading" onClick={() => speakKanji(open.kanji, open.reading)} title="Ouvir" data-testid="dex-reading">
                  <b>{open.kanji}</b>
                  <span>{open.reading}</span>
                  <span class="muted">sozinho · {kanaToRomaji(open.reading).replace(/'/g, '')}</span>
                </button>
                {open.otherReadings.length > 0 && <p class="muted">Dentro de palavras também: {open.otherReadings.join(', ')}</p>}
                <p>{open.story}</p>
                <h3>Palavras</h3>
                {open.words.map((w) => (
                  <button key={w.id} class="word" onClick={() => speakWord(w.kana)} title="Ouvir">
                    <b>{w.jp}</b>
                    <span>{w.kana}</span>
                    <span class="muted">{w.pt}</span>
                    <Stars level={Math.max(masteryLevel(cards[cardKey(w.id, 'meaning')]), masteryLevel(cards[cardKey(w.id, 'reading')]))} />
                  </button>
                ))}
                {open.sentences.map((s) => (
                  <button key={s.jp} class="word sentence-line" onClick={() => speak(s.jp)} title="Ouvir">
                    <b>{s.jp}</b>
                    <span class="muted">
                      {s.romaji} · {s.pt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <button class="ghost" onClick={() => setOpen(null)}>
              Fechar <kbd>Esc</kbd>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
