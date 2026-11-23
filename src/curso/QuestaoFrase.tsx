/**
 * As questões de frase do simulado (prova.ts), iguais na tela e no papel: a frase com a lacuna,
 * o texto da leitura e, na escuta, nada escrito (a frase só aparece no gabarito).
 */
import { Furigana } from '../core/Furigana';
import type { QuestaoDeFrase } from './prova';

export function FraseDaQuestao({ q }: { q: QuestaoDeFrase }) {
  if (q.tipo === 'completar')
    return (
      <>
        <p class="cs-montada pv-frase" lang="ja" data-testid="pv-frase">
          {(q.antes ?? []).map((p, k) => (
            <Furigana key={k} texto={p.t} leitura={p.kana} />
          ))}
          <span class="cs-lacuna">{'　'}</span>
          {(q.depois ?? []).map((p, k) => (
            <Furigana key={k} texto={p.t} leitura={p.kana} />
          ))}
          {q.frase.jp.slice(-1)}
        </p>
        <p class="muted">“{q.frase.pt}”</p>
      </>
    );
  if (q.tipo === 'texto' && q.texto)
    return (
      <div class="pv-texto" lang="ja" data-testid="pv-texto">
        <p class="pv-texto-titulo" lang="pt-BR">
          {q.texto.titulo}
        </p>
        <p>
          {q.texto.frases.map((f) => (
            <Furigana key={f.jp} texto={f.jp} leitura={f.kana} />
          ))}
        </p>
      </div>
    );
  return null;
}

/** Uma alternativa: peça em japonês (com furigana) no completar, português nas outras. */
export function OpcaoDeFrase({ q, o }: { q: QuestaoDeFrase; o: string }) {
  if (q.tipo === 'completar')
    return (
      <span lang="ja">
        <Furigana texto={o} leitura={q.leituras?.[o]} />
      </span>
    );
  return <span>{o}</span>;
}
