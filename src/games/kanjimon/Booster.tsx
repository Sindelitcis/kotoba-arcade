import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { app, commit, go, kanjimonSave } from '../../core/app';
import { sfx, speakKanji } from '../../core/audio';
import { burstFrom, onomato } from '../../core/fx';
import { teclaDe } from '../../core/teclas';
import { useAprofundar } from '../../core/aprofundar/estado';
import { RARITY_COLORS } from './art';
import { ArteCarta } from './ArteCarta';
import { BOOSTER_COST, canOpenBooster, openBooster, RARITY, type BoosterCard } from './engine';

export function Booster() {
  const [cards, setCards] = useState<BoosterCard[]>([]);
  const [revealed, setRevealed] = useState(0);
  useAprofundar(cards.slice(0, revealed).map((c) => ({ t: 'kanji', c: c.kanji.kanji }) as const));
  const opened = useRef(false);
  const row = useRef<HTMLDivElement>(null);

  const open = () => {
    const got = openBooster(app.data.profile, kanjimonSave(), app.data.cards, Math.random);
    commit();
    setCards(got);
    setRevealed(0);
    if (got.length === 0) go('hub');
  };

  if (!opened.current) {
    opened.current = true;
    queueMicrotask(open);
  }

  const reveal = () => {
    if (revealed >= cards.length) return;
    const card = cards[revealed] as BoosterCard;
    const tier = ['c', 'r', 'sr', 'ur'].indexOf(card.rarity);
    sfx.capture(tier);
    sfx.page();
    if (tier >= 2) sfx.rare();
    speakKanji(card.kanji.kanji, card.kanji.reading);
    setRevealed(revealed + 1);
    requestAnimationFrame(() => {
      const el = row.current?.children[revealed] ?? null;
      onomato(tier >= 2 ? 'raro' : 'revela', el, tier >= 2 ? 'raro' : 'neutro');
      burstFrom(el, RARITY_COLORS[card.rarity], 24 + tier * 18, 480);
    });
  };

  const done = cards.length > 0 && revealed >= cards.length;
  const again = canOpenBooster(app.data.profile, kanjimonSave(), app.data.cards) === 'ok';

  // Ligado junto com o desenho da tela: tecla apertada logo que a tela aparece não se perde.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tecla = teclaDe(e);
      if (tecla === null) return;
      if (tecla === 'Escape') go('hub');
      else if (tecla === 'Enter' || tecla === ' ') {
        e.preventDefault();
        if (!done) reveal();
        else if (again) open();
        else go('hub');
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  return (
    <main class="booster">
      <h1>Booster</h1>
      <div class="booster-row" ref={row}>
        {cards.map((c, i) =>
          i < revealed ? (
            <div key={i} class={`enemy-card r-${c.rarity} flip-in`}>
              <ArteCarta kanji={c.kanji} rarity={c.rarity} />
              <div class="enemy-kanji">{c.kanji.kanji}</div>
              <div class="enemy-rarity">{RARITY[c.rarity].name}</div>
              {c.newCard && <span class="badge">NOVA</span>}
            </div>
          ) : (
            <button key={i} class="enemy-card back" onClick={reveal} aria-label="Revelar carta">
              <div class="enemy-kanji">言</div>
            </button>
          ),
        )}
      </div>
      <div class="actions center">
        {!done && (
          <button class="primary" onClick={reveal}>
            Revelar <kbd>Enter</kbd>
          </button>
        )}
        {done && again && (
          <button class="primary" onClick={open}>
            Abrir outro ({kanjimonSave().boosters > 0 ? 'grátis' : `${BOOSTER_COST} moedas`}) <kbd>Enter</kbd>
          </button>
        )}
        <button onClick={() => go('hub')}>
          Voltar <kbd>Esc</kbd>
        </button>
      </div>
    </main>
  );
}
