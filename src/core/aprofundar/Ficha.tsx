/** Os blocos de uma ficha do Aprofundar, desenhados. */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Bloco, ExemploFicha, Ficha, PalavraFicha } from '../../content/aprofundar/fichas';
import { desenho, moras, NOME_ACENTO } from '../../content/aprofundar/acento';
import { carregarTracos, tracos } from '../../games/pecas/Tracos';
import { tocarSequencia, type FalaJp, type Trecho } from '../sequencia';
import { Icone } from '../Icone';
import { irPara } from './estado';

let tocando: { parar(): void } | null = null;

/** Toca e para o que estava tocando antes (botão de ouvir de qualquer lugar da ficha). */
export function tocar(trechos: readonly Trecho[]): void {
  tocando?.parar();
  tocando = trechos.length > 0 ? tocarSequencia(trechos) : null;
}

export function pararDeTocar(): void {
  tocando?.parar();
  tocando = null;
}

function Ouvir({ fala, rotulo }: { fala?: FalaJp; rotulo: string }) {
  if (!fala) return null;
  return (
    <button class="apr-ouvir" onClick={() => tocar([{ tipo: 'jp', fala }])} aria-label={`Ouvir ${rotulo}`} title="Ouvir">
      <Icone nome="volume-2" />
    </button>
  );
}

function Exemplos({ itens }: { itens: readonly ExemploFicha[] }) {
  return (
    <ul class="apr-exemplos">
      {itens.map((e) => (
        <li key={e.jp}>
          <Ouvir fala={e.fala} rotulo={e.jp} />
          <div>
            <p class="apr-jp" lang="ja">
              {e.jp}
            </p>
            {e.kana && e.kana !== e.jp && (
              <p class="apr-kana" lang="ja">
                {e.kana}
              </p>
            )}
            <p class="apr-pt">{e.pt}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Palavras({ itens }: { itens: readonly PalavraFicha[] }) {
  return (
    <ul class="apr-palavras">
      {itens.map((w) => (
        <li key={w.jp + w.kana}>
          <Ouvir fala={w.fala} rotulo={w.jp} />
          {w.alvo ? (
            <button class="apr-palavra" onClick={() => w.alvo && irPara(w.alvo)} title="Aprofundar esta">
              <span lang="ja">{w.jp}</span>
              {w.kana && w.kana !== w.jp && (
                <small lang="ja">{w.kana}</small>
              )}
              <em>{w.pt}</em>
            </button>
          ) : (
            <span class="apr-palavra">
              <span lang="ja">{w.jp}</span>
              {w.kana && w.kana !== w.jp && <small lang="ja">{w.kana}</small>}
              <em>{w.pt}</em>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** O acento como escada: cada mora alta ou baixa, e a partícula que viria depois. */
function Acento({ kana, acentos }: { kana: string; acentos: readonly number[] }) {
  const ms = moras(kana);
  const a = acentos[0] ?? 0;
  const alto = desenho(ms.length, a);
  return (
    <div class="apr-acento" data-testid="apr-acento">
      <div class="apr-moras" lang="ja" aria-hidden="true">
        {[...ms, 'が'].map((m, i) => (
          <span key={i} class={`${alto[i] ? 'alto' : 'baixo'}${i === ms.length ? ' particula' : ''}`}>
            {m}
          </span>
        ))}
      </div>
      <p class="apr-pt">
        Acento {NOME_ACENTO(ms.length, a)}.{acentos.length > 1 ? ` Também se ouve de outro jeito (${acentos.slice(1).join(', ')}).` : ''}
      </p>
    </div>
  );
}

/** Kanji traço a traço, na ordem certa, com o número de cada traço. */
function Tracos({ c }: { c: string }) {
  const [vez, setVez] = useState(0);
  useEffect(() => {
    void carregarTracos();
  }, []);
  const t = tracos.value?.kanji[c];
  if (!t) {
    return (
      <div class="apr-tracos sem">
        <span lang="ja">{c}</span>
      </div>
    );
  }
  return (
    <div class="apr-tracos">
      <svg key={vez} viewBox="0 0 109 109" role="img" aria-label={`${c}, ${t.d.length} traços`} data-testid="apr-tracos">
        {t.d.map((d, i) => (
          <path key={i} d={d} pathLength={1} style={{ animationDelay: `${i * 0.45}s` }} />
        ))}
      </svg>
      <p class="apr-pt">
        {t.d.length} {t.d.length === 1 ? 'traço' : 'traços'}, na ordem.{' '}
        <button class="ghost" onClick={() => setVez(vez + 1)}>
          Ver de novo
        </button>
      </p>
    </div>
  );
}

/** Frase para montar: as peças embaralhadas, clique na ordem. */
function Montar({ partes, pt, fala }: { partes: readonly string[]; pt: string; fala?: FalaJp }) {
  const ordem = useMemo(() => embaralhar(partes.map((_, i) => i)), [partes]);
  const [feitas, setFeitas] = useState<number[]>([]);
  const [errou, setErrou] = useState<number | null>(null);
  const pronta = feitas.length === partes.length;
  useEffect(() => {
    if (pronta && fala) tocar([{ tipo: 'jp', fala }]);
  }, [pronta]);
  const escolher = (i: number) => {
    if (partes[i] === partes[feitas.length]) {
      setFeitas([...feitas, i]);
      setErrou(null);
    } else setErrou(i);
  };
  return (
    <div class="apr-montar" data-testid="apr-montar">
      <p class="apr-pt">{pt}</p>
      <p class="apr-montada" lang="ja" aria-live="polite">
        {feitas.map((i) => partes[i]).join(' ') || '…'}
      </p>
      {pronta ? (
        <p class="apr-certo">
          Certo!{' '}
          <button class="ghost" onClick={() => setFeitas([])}>
            De novo
          </button>
        </p>
      ) : (
        <div class="apr-pecas">
          {ordem.map((i) =>
            feitas.includes(i) ? null : (
              <button key={i} class={errou === i ? 'errou' : ''} lang="ja" onClick={() => escolher(i)}>
                {partes[i]}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function embaralhar(xs: number[]): number[] {
  if (xs.length < 2) return xs;
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    const out = [...xs];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j] as number, out[i] as number];
    }
    if (out.some((x, i) => x !== i)) return out;
  }
  return [...xs].reverse();
}

function BlocoFicha({ b }: { b: Bloco }) {
  switch (b.k) {
    case 'texto':
      return <p>{b.t}</p>;
    case 'lista':
      return (
        <ul class="apr-lista">
          {b.itens.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      );
    case 'passos':
      return (
        <ol class="apr-passos">
          {b.itens.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      );
    case 'exemplos':
      return <Exemplos itens={b.itens} />;
    case 'palavras':
      return <Palavras itens={b.itens} />;
    case 'acento':
      return <Acento kana={b.kana} acentos={b.acentos} />;
    case 'tracos':
      return <Tracos c={b.c} />;
    case 'conjugacao':
      return (
        <table class="apr-conjugacao">
          <tbody>
            {b.linhas.map((l) => (
              <tr key={l.verbo}>
                <td lang="ja">{l.verbo}</td>
                <td>{l.grupo}</td>
                <td lang="ja">
                  <strong>{l.forma}</strong>
                  {l.leitura !== l.forma && <small> {l.leitura}</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'montar':
      return <Montar partes={b.partes} pt={b.pt} fala={b.fala} />;
  }
}

export function CorpoFicha({ f }: { f: Ficha }) {
  return (
    <>
      {f.secoes.map((s) => (
        <section key={s.titulo} class="apr-secao">
          <h3>{s.titulo}</h3>
          {s.blocos.map((b, i) => (
            <BlocoFicha key={i} b={b} />
          ))}
        </section>
      ))}
    </>
  );
}
