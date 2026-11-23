/**
 * Dois blocos da unidade que vêm do conteúdo da fase 4:
 * - a aula falada: um quadro por vez, o professor na Voz 1 e o exemplo em japonês;
 * - montar frases: as peças embaralhadas de um exemplo, a pessoa põe na ordem.
 * Nada passa sozinho: Enter segue, R repete (docs/ensino.md, "Calma").
 */
import { useLayoutEffect, useMemo, useState } from 'preact/hooks';
import type { Unidade } from '../content/curso';
import { AULAS_DO_CURSO } from '../content/curso/aulas';
import { Furigana, Misto } from '../core/Furigana';
import { Icone } from '../core/Icone';
import { tocarSequencia } from '../core/sequencia';
import { exemplosDoPonto, falaDoExemplo, falaEscrita, pecasParaMontar, trechosDoQuadro, type Exemplo } from './exemplos';
import { useTeclado } from './teclado';

function ExemploNaTela({ e }: { e: Exemplo }) {
  return (
    <p class="ap-exemplo cs-aula-ex">
      <span class="ap-ex-jp" lang="ja">
        <Furigana texto={e.jp} leitura={e.kana} />
      </span>
      <span class="ap-ex-pt">{e.pt}</span>
    </p>
  );
}

export function AulaView({ unidade, onFim }: { unidade: Unidade; onFim: () => void }) {
  const quadros = AULAS_DO_CURSO[unidade.id] ?? [];
  const [i, setI] = useState(0);
  const q = quadros[i];
  const ex = q?.ex ? exemplosDoPonto(q.ex)[0] : undefined;
  const tocar = () => {
    if (q) void tocarSequencia(trechosDoQuadro(q.fala, ex));
  };
  useLayoutEffect(tocar, [i]);
  const seguir = () => {
    if (i + 1 < quadros.length) setI(i + 1);
    else onFim();
  };
  useTeclado((tecla) => {
    if (tecla === 'Enter' || tecla === ' ') {
      seguir();
      return true;
    }
    if (tecla.toLowerCase() === 'r') {
      tocar();
      return true;
    }
    if (tecla === 'ArrowLeft' && i > 0) {
      setI(i - 1);
      return true;
    }
    return false;
  });
  if (!q) return null;
  return (
    <div class="koma lc-quadro" data-testid="cs-aula" data-i={i}>
      <div class="lc-conteudo">
        <span class="gr-tag">
          Aula · {i + 1} de {quadros.length}
        </span>
        <p class="lc-linha cs-aula-fala">
          <Misto texto={falaEscrita(q.fala)} />
        </p>
        {q.tela && (
          <p class="cs-aula-tela" lang="ja">
            <Misto texto={q.tela} />
          </p>
        )}
        {ex && <ExemploNaTela e={ex} />}
      </div>
      <div class="actions center">
        <button class="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
          ← <kbd>←</kbd>
        </button>
        <button onClick={tocar}>
          <Icone nome="volume-2" /> Ouvir <kbd>R</kbd>
        </button>
        <button class="primary" onClick={seguir} data-testid="cs-seguir">
          {i + 1 < quadros.length ? 'Seguir' : 'Fim da aula'} <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}

/* ───────── Montar frases ───────── */

export function MontarView({ exemplos, onFim }: { exemplos: readonly Exemplo[]; onFim: (acertos: number) => void }) {
  const [i, setI] = useState(0);
  const e = exemplos[i];
  const pecas = useMemo(() => (e ? pecasParaMontar(e, Math.random) : []), [e]);
  const [postas, setPostas] = useState<number[]>([]);
  const [errou, setErrou] = useState<number | null>(null);
  const [erros, setErros] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const pronta = postas.length === pecas.length && pecas.length > 0;

  const ouvir = () => {
    if (e && pronta) void tocarSequencia([falaDoExemplo(e)]);
  };

  const por = (k: number) => {
    const p = pecas[k];
    if (!p || pronta || postas.includes(k)) return;
    // A próxima peça certa é a de menor posição ainda não posta (o texto, para peças repetidas).
    const proxima = pecas.filter((_, j) => !postas.includes(j)).sort((a, b) => a.n - b.n)[0];
    if (proxima && p.t === proxima.t) {
      const novas = [...postas, k];
      setPostas(novas);
      setErrou(null);
      if (novas.length === pecas.length) {
        if (erros === 0) setAcertos((a) => a + 1);
        void tocarSequencia([falaDoExemplo(e as Exemplo)]);
      }
    } else {
      setErrou(k);
      setErros((x) => x + 1);
    }
  };

  const seguir = () => {
    if (!pronta) return;
    if (i + 1 < exemplos.length) {
      setI(i + 1);
      setPostas([]);
      setErrou(null);
      setErros(0);
    } else onFim(acertos);
  };

  useTeclado((tecla) => {
    if (/^[1-9]$/.test(tecla)) {
      const livres = pecas.map((_, k) => k).filter((k) => !postas.includes(k));
      const k = livres[Number(tecla) - 1];
      if (k !== undefined) por(k);
      return true;
    }
    if (tecla === 'Enter' || tecla === ' ') {
      seguir();
      return true;
    }
    if (tecla.toLowerCase() === 'r') {
      ouvir();
      return true;
    }
    return false;
  });

  if (!e) return null;
  const livres = pecas.map((p, k) => ({ p, k })).filter(({ k }) => !postas.includes(k));
  return (
    <div class="koma lc-quadro" data-testid="cs-montar" data-i={i}>
      <div class="lc-conteudo">
        <span class="gr-tag">
          Montar frases · {i + 1} de {exemplos.length}
        </span>
        <p class="lc-enunciado">Monte em japonês:</p>
        <p class="lc-linha cs-montar-pt">“{e.pt}”</p>
        <div class="cs-montada" lang="ja" data-testid="cs-montada">
          {pronta ? (
            <Furigana texto={e.jp} leitura={e.kana} />
          ) : (
            postas.map((k) => (
              <span key={k} class="cs-peca posta">
                <Furigana texto={pecas[k]!.t} leitura={pecas[k]!.kana} />
              </span>
            ))
          )}
          {!pronta && <span class="cs-cursor" aria-hidden="true" />}
        </div>
        {!pronta && (
          <div class="cs-pecas" lang="ja">
            {livres.map(({ p, k }, n) => (
              <button key={k} class={`cs-peca${errou === k ? ' errada' : ''}`} onClick={() => por(k)} data-testid="cs-peca" data-t={p.t}>
                <kbd>{n + 1}</kbd> <Furigana texto={p.t} leitura={p.kana} />
              </button>
            ))}
          </div>
        )}
        {errou !== null && !pronta && (
          <p class="lc-retorno" role="status">
            Essa peça vem depois. Pense na ordem do japonês: o verbo e o です ficam no fim.
          </p>
        )}
        {pronta && (
          <p class={erros === 0 ? 'lc-retorno bom' : 'lc-retorno'} role="status" data-testid="cs-retorno">
            {erros === 0 ? 'Isso, de primeira.' : 'Montada. Ouça e repita em voz alta.'}
          </p>
        )}
      </div>
      <div class="actions center">
        <button onClick={ouvir} disabled={!pronta}>
          <Icone nome="volume-2" /> Ouvir <kbd>R</kbd>
        </button>
        <button class="primary" disabled={!pronta} onClick={seguir} data-testid="cs-seguir">
          Seguir <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}
