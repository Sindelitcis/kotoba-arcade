/**
 * Os blocos da unidade que vêm dos exemplos de gramática:
 * - a aula falada: um quadro por vez, o professor na Voz 1 e o exemplo em japonês;
 * - montar frases: as peças embaralhadas de um exemplo, a pessoa põe na ordem;
 * - completar: a frase com uma peça apagada, quatro opções;
 * - formas: transformar o verbo ou o adjetivo (食べる → 食べます), quatro opções em kana;
 * - ditado: a frase só no áudio, a pessoa escreve em kana;
 * - leitura graduada: o texto inteiro e, depois, o shadowing frase por frase.
 * Nada passa sozinho: Enter segue, R repete (docs/ensino.md, "Calma").
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Unidade } from '../content/curso';
import { AULAS_DO_CURSO } from '../content/curso/aulas';
import { Furigana, Misto } from '../core/Furigana';
import { Icone } from '../core/Icone';
import { useSemLegenda } from '../core/LegendaVoz';
import { romajiToHiragana } from '../core/kana';
import { tocarSequencia } from '../core/sequencia';
import { confereDitado, lacunasDa } from './exercicios';
import { FORMAS, NOME_DO_TIPO, perguntasDeForma } from './formas';
import { exemplosDoPonto, falaDoExemplo, falaEscrita, pecasParaMontar, trechosDoQuadro, type Exemplo, type Leitura } from './exemplos';
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

/* ───────── Formas ───────── */

/**
 * Transformar a forma: a palavra numa forma, a pessoa escolhe a outra. Errou: aparece a forma certa
 * escrita, a regra, e a pergunta volta uma vez no fim (como no treino de kana).
 */
export function FormasView({ unidade, onFim }: { unidade: Unidade; onFim: (acertos: number) => void }) {
  const [fila, setFila] = useState(() => perguntasDeForma(unidade, Math.random));
  const [i, setI] = useState(0);
  const [escolha, setEscolha] = useState<string | null>(null);
  const [acertos, setAcertos] = useState(0);
  const [voltou] = useState(() => new Set<number>());
  const q = fila[i];

  const escolher = (o: string) => {
    if (!q || escolha !== null) return;
    setEscolha(o);
    if (o === q.para.kana) setAcertos((a) => a + 1);
    else if (!voltou.has(i)) {
      voltou.add(fila.length);
      setFila((f) => [...f, { ...q, opcoes: [...q.opcoes].reverse() }]);
    }
  };
  const seguir = () => {
    if (escolha === null) return;
    if (i + 1 < fila.length) {
      setI(i + 1);
      setEscolha(null);
    } else onFim(acertos);
  };
  useTeclado((tecla) => {
    if (q && /^[1-4]$/.test(tecla)) {
      const o = q.opcoes[Number(tecla) - 1];
      if (o) escolher(o);
      return true;
    }
    if (tecla === 'Enter' || tecla === ' ') {
      seguir();
      return true;
    }
    return false;
  });

  if (!q) return null;
  const certa = escolha === q.para.kana;
  return (
    <div class="koma lc-quadro" data-testid="cs-formas" data-i={i}>
      <div class="lc-conteudo">
        <span class="gr-tag">
          Formas · {i + 1} de {fila.length}
        </span>
        <p class="lc-enunciado">
          Passe para a forma <b lang={/[぀-ヿ]/u.test(FORMAS[q.para.forma]) ? 'ja' : 'pt-BR'}>{FORMAS[q.para.forma]}</b>:
        </p>
        <p class="cs-montada" lang="ja">
          <Furigana texto={q.de.jp} leitura={q.de.kana} /> → <span class={`cs-lacuna${escolha === null ? '' : certa ? ' certa' : ' errada'}`}>{escolha === null ? '　' : <Furigana texto={q.para.jp} leitura={q.para.kana} />}</span>
        </p>
        <p class="lc-linha cs-montar-pt">{q.palavra.pt}</p>
        <div class="cs-pecas" lang="ja">
          {q.opcoes.map((o, n) => (
            <button
              key={o}
              class={`cs-peca${escolha !== null && o === q.para.kana ? ' certa' : ''}${escolha === o && !certa ? ' errada' : ''}`}
              disabled={escolha !== null}
              onClick={() => escolher(o)}
              data-testid="cs-opcao"
              data-certa={o === q.para.kana ? '1' : undefined}
            >
              <kbd>{n + 1}</kbd> {o}
            </button>
          ))}
        </div>
        {escolha !== null && (
          <p class={certa ? 'lc-retorno bom' : 'lc-retorno'} role="status" data-testid="cs-retorno">
            {certa ? 'Isso.' : <>É {q.para.kana} (<Furigana texto={q.de.jp} leitura={q.de.kana} /> é {NOME_DO_TIPO[q.palavra.tipo]}). <Misto texto={q.como} />{voltou.has(i) ? '' : ' Esta volta no fim.'}</>}
          </p>
        )}
      </div>
      <div class="actions center">
        <button class="primary" disabled={escolha === null} onClick={seguir} data-testid="cs-seguir">
          Seguir <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}

/* ───────── Completar ───────── */

export function CompletarView({ unidade, onFim }: { unidade: Unidade; onFim: (acertos: number) => void }) {
  const lacunas = useMemo(() => lacunasDa(unidade, Math.random), [unidade]);
  const [i, setI] = useState(0);
  const [escolha, setEscolha] = useState<string | null>(null);
  const [acertos, setAcertos] = useState(0);
  const l = lacunas[i];

  const escolher = (o: string) => {
    if (!l || escolha !== null) return;
    setEscolha(o);
    if (o === l.resposta.t) setAcertos((a) => a + 1);
    void tocarSequencia([falaDoExemplo(l.exemplo)]);
  };
  const seguir = () => {
    if (escolha === null) return;
    if (i + 1 < lacunas.length) {
      setI(i + 1);
      setEscolha(null);
    } else onFim(acertos);
  };

  useTeclado((tecla) => {
    if (l && /^[1-4]$/.test(tecla)) {
      const o = l.opcoes[Number(tecla) - 1];
      if (o) escolher(o);
      return true;
    }
    if (tecla === 'Enter' || tecla === ' ') {
      seguir();
      return true;
    }
    if (tecla.toLowerCase() === 'r' && l && escolha !== null) {
      void tocarSequencia([falaDoExemplo(l.exemplo)]);
      return true;
    }
    return false;
  });

  if (!l) return null;
  const certa = escolha === l.resposta.t;
  const pedacos = (ps: readonly { t: string; kana: string }[]) => ps.map((p, k) => <Furigana key={k} texto={p.t} leitura={p.kana} />);
  return (
    <div class="koma lc-quadro" data-testid="cs-completar" data-i={i}>
      <div class="lc-conteudo">
        <span class="gr-tag">
          Completar · {i + 1} de {lacunas.length}
        </span>
        <p class="lc-enunciado">Qual peça falta?</p>
        <p class="cs-montada" lang="ja">
          {pedacos(l.antes)}
          <span class={`cs-lacuna${escolha === null ? '' : certa ? ' certa' : ' errada'}`} data-testid="cs-lacuna">
            {escolha === null ? '　' : <Furigana texto={l.resposta.t} leitura={l.resposta.kana} />}
          </span>
          {pedacos(l.depois)}
          {l.exemplo.jp.slice(-1)}
        </p>
        <p class="lc-linha cs-montar-pt">“{l.exemplo.pt}”</p>
        <div class="cs-pecas" lang="ja">
          {l.opcoes.map((o, n) => (
            <button
              key={o}
              class={`cs-peca${escolha !== null && o === l.resposta.t ? ' certa' : ''}${escolha === o && !certa ? ' errada' : ''}`}
              disabled={escolha !== null}
              onClick={() => escolher(o)}
              data-testid="cs-opcao"
              data-t={o}
              data-certa={o === l.resposta.t ? '1' : undefined}
            >
              <kbd>{n + 1}</kbd> {o}
            </button>
          ))}
        </div>
        {escolha !== null && (
          <p class={certa ? 'lc-retorno bom' : 'lc-retorno'} role="status" data-testid="cs-retorno">
            {certa ? 'Isso.' : `A peça é ${l.resposta.t}. Ouça a frase inteira e repita.`}
          </p>
        )}
      </div>
      <div class="actions center">
        <button class="primary" disabled={escolha === null} onClick={seguir} data-testid="cs-seguir">
          Seguir <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}

/* ───────── Ditado ───────── */

export function DitadoView({ exemplos, onFim }: { exemplos: readonly Exemplo[]; onFim: (acertos: number) => void }) {
  const [i, setI] = useState(0);
  const [texto, setTexto] = useState('');
  const [conferido, setConferido] = useState<boolean | null>(null);
  const [acertos, setAcertos] = useState(0);
  const campo = useRef<HTMLInputElement>(null);
  const e = exemplos[i];
  useSemLegenda(conferido === null);
  const ouvir = () => {
    if (e) void tocarSequencia([falaDoExemplo(e)]);
  };
  useLayoutEffect(() => {
    ouvir();
    campo.current?.focus();
  }, [i]);

  const kana = romajiToHiragana(texto, true);
  const conferir = () => {
    if (!e || conferido !== null || !texto.trim()) return;
    const ok = confereDitado(kana, e);
    setConferido(ok);
    if (ok) setAcertos((a) => a + 1);
  };
  const seguir = () => {
    if (conferido === null) return conferir();
    if (i + 1 < exemplos.length) {
      setI(i + 1);
      setTexto('');
      setConferido(null);
    } else onFim(acertos);
  };

  useTeclado((tecla, ev) => {
    if (tecla === 'Enter') {
      seguir();
      return true;
    }
    // No campo, as letras são do ditado; o R repete o áudio fora dele ou depois de conferir.
    if (tecla.toLowerCase() === 'r' && (conferido !== null || ev.target !== campo.current)) {
      ouvir();
      return true;
    }
    return false;
  });

  if (!e) return null;
  return (
    <div class="koma lc-quadro" data-testid="cs-ditado" data-i={i}>
      <div class="lc-conteudo">
        <span class="gr-tag">
          Ditado · {i + 1} de {exemplos.length}
        </span>
        <p class="lc-enunciado">Ouça e escreva a frase em kana. Digite em romaji (watashi) ou use o teclado japonês.</p>
        <input
          ref={campo}
          class="cs-ditado-campo"
          value={texto}
          disabled={conferido !== null}
          onInput={(ev) => setTexto((ev.target as HTMLInputElement).value)}
          onKeyDown={(ev) => {
            // O teclado do curso deixa o Enter do campo para o campo: aqui ele confere.
            if (ev.key === 'Enter' && !ev.isComposing) {
              ev.preventDefault();
              seguir();
            }
          }}
          aria-label="Sua frase"
          autocomplete="off"
          spellcheck={false}
          data-testid="cs-ditado-campo"
        />
        <p class="cs-ditado-kana" lang="ja" data-testid="cs-ditado-kana">
          {kana || ' '}
        </p>
        {conferido !== null && (
          <>
            <p class={conferido ? 'lc-retorno bom' : 'lc-retorno'} role="status" data-testid="cs-retorno">
              {conferido ? 'Isso, igual ao áudio.' : 'Quase. Compare com a frase certa e ouça de novo.'}
            </p>
            <ExemploNaTela e={e} />
            <p class="cs-ditado-kana certa" lang="ja">
              {e.kana}
            </p>
          </>
        )}
      </div>
      <div class="actions center">
        <button onClick={ouvir}>
          <Icone nome="volume-2" /> Ouvir <kbd>R</kbd>
        </button>
        <button class="primary" disabled={!texto.trim()} onClick={seguir} data-testid="cs-seguir">
          {conferido === null ? 'Conferir' : 'Seguir'} <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}

/* ───────── Leitura graduada e shadowing ───────── */

/** Shadowing: a frase, uma pausa para falar junto e a frase de novo. */
export const trechosDoShadowing = (e: Exemplo) => [falaDoExemplo(e), { tipo: 'pausa' as const, vezes: 1.5 }, falaDoExemplo(e)];

export function LeituraView({ leitura, onFim }: { leitura: Leitura; onFim: () => void }) {
  const [fase, setFase] = useState<'ler' | 'shadowing'>('ler');
  const [i, setI] = useState(0);
  const [traducao, setTraducao] = useState(false);
  const frases = leitura.frases;
  const e = frases[i];

  const ouvirTudo = () => void tocarSequencia(frases.flatMap((f, k) => (k === 0 ? [falaDoExemplo(f)] : [{ tipo: 'pausa' as const, vezes: 0.5 }, falaDoExemplo(f)])));
  const ouvirFrase = () => {
    if (e) void tocarSequencia(trechosDoShadowing(e));
  };
  useLayoutEffect(() => {
    if (fase === 'shadowing') ouvirFrase();
  }, [fase, i]);

  const seguir = () => {
    if (fase === 'ler') {
      setFase('shadowing');
      setI(0);
    } else if (i + 1 < frases.length) setI(i + 1);
    else onFim();
  };

  useTeclado((tecla) => {
    if (tecla === 'Enter' || tecla === ' ') {
      seguir();
      return true;
    }
    if (tecla.toLowerCase() === 'r') {
      if (fase === 'ler') ouvirTudo();
      else ouvirFrase();
      return true;
    }
    if (tecla.toLowerCase() === 't') {
      setTraducao((t) => !t);
      return true;
    }
    return false;
  });

  if (fase === 'ler')
    return (
      <div class="koma lc-quadro" data-testid="cs-leitura">
        <div class="lc-conteudo">
          <span class="gr-tag">Leitura</span>
          <h3 class="cs-leitura-titulo">{leitura.titulo}</h3>
          <p class="lc-enunciado">Leia o texto. Toque numa frase para ouvir.</p>
          <div class="cs-leitura-texto" lang="ja">
            {frases.map((f) => (
              <button key={f.jp} class="cs-leitura-frase" onClick={() => void tocarSequencia([falaDoExemplo(f)])}>
                <Furigana texto={f.jp} leitura={f.kana} />
                {traducao && (
                  <span class="cs-leitura-pt" lang="pt-BR">
                    {f.pt}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div class="actions center">
          <button onClick={() => setTraducao(!traducao)} data-testid="cs-traducao">
            {traducao ? 'Esconder a tradução' : 'Ver a tradução'} <kbd>T</kbd>
          </button>
          <button onClick={ouvirTudo}>
            <Icone nome="volume-2" /> Ouvir tudo <kbd>R</kbd>
          </button>
          <button class="primary" onClick={seguir} data-testid="cs-seguir">
            Shadowing <kbd>Enter</kbd>
          </button>
        </div>
      </div>
    );

  if (!e) return null;
  return (
    <div class="koma lc-quadro" data-testid="cs-shadowing" data-i={i}>
      <div class="lc-conteudo">
        <span class="gr-tag">
          Shadowing · {i + 1} de {frases.length}
        </span>
        <p class="lc-enunciado">Ouça e fale junto, logo atrás da voz. Na pausa, repita sozinho.</p>
        <ExemploNaTela e={e} />
      </div>
      <div class="actions center">
        <button onClick={ouvirFrase}>
          <Icone nome="volume-2" /> Ouvir de novo <kbd>R</kbd>
        </button>
        <button class="primary" onClick={seguir} data-testid="cs-seguir">
          {i + 1 < frases.length ? 'Próxima frase' : 'Fim da leitura'} <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}
