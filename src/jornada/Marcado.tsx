import { palavras } from '../content/escola/ruby';
import { Furigana } from '../core/Furigana';

/**
 * Japonês marcado da escola-japones ("{私|わたし} は …") com furigana em todo kanji.
 * Cada palavra fica num bloco com um respiro entre elas, para ver onde uma termina.
 */
export function Marcado({ texto, class: cls }: { texto: string; class?: string }) {
  return (
    <span class={cls ? `jn-jp ${cls}` : 'jn-jp'} lang="ja">
      {palavras(texto).map((p, i) => (
        <span key={i} class="jn-palavra">
          {p.map((s, j) =>
            s.leitura ? (
              <span key={j}>
                <Furigana texto={s.texto} leitura={s.leitura} />
              </span>
            ) : (
              // Sem marcação de leitura: a dos dados (texto simples numa opção, por exemplo).
              <span key={j}>
                <Furigana texto={s.texto} />
              </span>
            ),
          )}
        </span>
      ))}
    </span>
  );
}
