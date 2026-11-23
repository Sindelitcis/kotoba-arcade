import { Furigana } from './Furigana';
import { legenda, legendaComRomaji, romajiDaLegenda } from './legenda';

/** A legenda da fala em japonês que está tocando (src/core/legenda.ts). */
export function LegendaVoz() {
  const l = legenda.value;
  if (!l) return null;
  const romaji = legendaComRomaji.value ? romajiDaLegenda(l) : undefined;
  return (
    <div class="legenda-voz" data-testid="legenda" aria-hidden="true">
      <span class="legenda-jp" lang="ja">
        <Furigana texto={l.texto} leitura={l.kana} />
      </span>
      {romaji && <span class="legenda-romaji">{romaji}</span>}
    </div>
  );
}
