import { signal } from '@preact/signals';
import { useLayoutEffect } from 'preact/hooks';
import { Furigana } from './Furigana';
import { legenda, legendaComRomaji, romajiDaLegenda } from './legenda';

/** Quantas telas pediram para esconder a legenda agora (pergunta de ouvir aberta). */
const escondida = signal(0);

/**
 * Esconde a legenda enquanto `ativo`: numa pergunta de ouvir (o kana do treino, o ditado, a
 * escuta da prova) a legenda entregava a resposta escrita. Depois de responder, volta.
 */
export function useSemLegenda(ativo: boolean): void {
  useLayoutEffect(() => {
    if (!ativo) return;
    escondida.value++;
    return () => {
      escondida.value--;
    };
  }, [ativo]);
}

/** A legenda da fala em japonês que está tocando (src/core/legenda.ts). */
export function LegendaVoz() {
  const l = legenda.value;
  if (!l || escondida.value > 0) return null;
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
