import type { Kanji } from '../../content';
import type { Rarity } from './engine';
import { artUrl } from './art';

/**
 * A arte inteira da carta, sem corte. As artes do KanjiMon não têm todas o mesmo formato
 * (384×688, 424×632, 864×1216...), então a arte fica "contida" na moldura e uma cópia
 * desfocada dela preenche a sobra, em vez de cortar o topo e o pé (tests/kanjimon-carta.test.tsx).
 */
export function ArteCarta({ kanji, rarity }: { kanji: Kanji; rarity: Rarity }) {
  const src = artUrl(kanji, rarity);
  const esconder = (e: Event) => ((e.currentTarget as HTMLElement).parentElement!.style.visibility = 'hidden');
  return (
    <span class="arte-carta" aria-hidden="true">
      <img class="arte-fundo" src={src} alt="" onError={esconder} />
      <img class="arte-inteira" src={src} alt="" onError={esconder} />
    </span>
  );
}
