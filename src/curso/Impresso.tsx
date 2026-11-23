/**
 * Material impresso do curso (docs/curso.md, "Provas" e "Material impresso"). Abre numa página
 * própria, pelo endereço, e sai do mesmo dado das lições:
 *
 *   ?imprimir=prova&codigo=U04-K7QH     a prova, com espaço para nome e um QR para o gabarito
 *   ?gabarito=U04-K7QH                   o gabarito da prova (é para onde o QR da folha leva)
 *   ?imprimir=apostila&unidade=a1-04    a unidade para ler longe da tela
 *   ?imprimir=cartoes&unidade=a1-04     cartões de frente e verso para recortar
 *   ?imprimir=escrita&unidade=a1-04     folha de escrita dos kanji, com a ordem dos traços
 */
import qrcode from 'qrcode-generator';
import { useEffect } from 'preact/hooks';
import { GRAMATICA_N5, palavrasDa, UNIDADES, type Unidade } from '../content/curso';
import { AULAS_DO_CURSO } from '../content/curso/aulas';
import { TAREFAS } from '../content/curso/tarefas';
import { Furigana, Misto } from '../core/Furigana';
import { hashString, seededRng } from '../core/rng';
import { exemplosDoPonto, falaEscrita, pecasParaMontar } from './exemplos';
import { carregarTracos, tracos } from '../games/pecas/Tracos';
import { significadoDoKanji } from './cartoes';
import { outrasLeituras, palavraDoCurso, partesDoPonto } from './motor';
import { provaDoCodigo, type Prova, type Questao } from './prova';
import './impresso.css';

export type Pedido =
  | { tipo: 'prova'; codigo: string }
  | { tipo: 'gabarito'; codigo: string }
  | { tipo: 'apostila' | 'cartoes' | 'escrita'; unidade: string };

/** Lê o pedido de impressão do endereço. `null`: é o site normal. */
export function pedidoDoEndereco(busca: string): Pedido | null {
  const q = new URLSearchParams(busca);
  const gabarito = q.get('gabarito');
  if (gabarito) return { tipo: 'gabarito', codigo: gabarito };
  const tipo = q.get('imprimir');
  if (tipo === 'prova') return { tipo, codigo: q.get('codigo') ?? '' };
  if (tipo === 'apostila' || tipo === 'cartoes' || tipo === 'escrita') return { tipo, unidade: q.get('unidade') ?? '' };
  return null;
}

/** O endereço de um material, a partir da página atual. */
export function enderecoDe(p: Pedido): string {
  const base = `${location.origin}${location.pathname}`;
  if (p.tipo === 'gabarito') return `${base}?gabarito=${encodeURIComponent(p.codigo)}`;
  if (p.tipo === 'prova') return `${base}?imprimir=prova&codigo=${encodeURIComponent(p.codigo)}`;
  return `${base}?imprimir=${p.tipo}&unidade=${encodeURIComponent(p.unidade)}`;
}

export function abrirImpresso(p: Pedido): void {
  window.open(enderecoDe(p), '_blank', 'noopener');
}

const LETRA = ['a', 'b', 'c', 'd', 'e'];

function Qr({ texto }: { texto: string }) {
  const q = qrcode(0, 'M');
  q.addData(texto);
  q.make();
  return <span class="im-qr" dangerouslySetInnerHTML={{ __html: q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }) }} />;
}

function Barra({ titulo }: { titulo: string }) {
  return (
    <div class="im-barra no-print">
      <span>{titulo}</span>
      <button class="primary" onClick={() => print()}>
        Imprimir
      </button>
    </div>
  );
}

function Erro({ texto }: { texto: string }) {
  return (
    <main class="im">
      <p>{texto}</p>
      <p>
        <a href={`${location.origin}${location.pathname}`}>Voltar ao curso</a>
      </p>
    </main>
  );
}

export function Impresso({ pedido }: { pedido: Pedido }) {
  useEffect(() => {
    document.body.classList.add('impresso');
    return () => document.body.classList.remove('impresso');
  }, []);
  if (pedido.tipo === 'prova' || pedido.tipo === 'gabarito') {
    const p = provaDoCodigo(pedido.codigo);
    if (!p) return <Erro texto={`Não achei a prova com o código "${pedido.codigo}". Confira as letras na folha.`} />;
    return pedido.tipo === 'prova' ? <ProvaImpressa prova={p} /> : <Gabarito prova={p} />;
  }
  const u = UNIDADES.find((x) => x.id === pedido.unidade);
  if (!u) return <Erro texto="Essa unidade não existe." />;
  if (pedido.tipo === 'apostila') return <Apostila unidade={u} />;
  if (pedido.tipo === 'cartoes') return <Cartoes unidade={u} />;
  return <Escrita unidade={u} />;
}

/* ───────── Prova ───────── */

/** O enunciado na folha. No de sentido, a palavra entra no meio, com a leitura em cima. */
function EnunciadoImpresso({ q }: { q: Questao }) {
  if (q.tipo !== 'significado') return <>{q.enunciado}</>;
  return (
    <>
      O que quer dizer{' '}
      <span lang="ja">
        <Furigana texto={q.item.jp} leitura={q.item.kana} />
      </span>
      ?
    </>
  );
}

function OpcaoTexto({ q, o }: { q: Questao; o: string }) {
  if (q.tipo === 'palavra') {
    // Toda alternativa em japonês leva furigana, não só a certa.
    const p = palavraDoCurso(o);
    return <span lang="ja">{p ? <Furigana texto={o} leitura={p.kana} /> : o}</span>;
  }
  return <span lang={q.tipo === 'leitura' ? 'ja' : undefined}>{o}</span>;
}

function ProvaImpressa({ prova }: { prova: Prova }) {
  const u = prova.unidade;
  return (
    <main class="im" data-testid="im-prova">
      <Barra titulo={`Prova da unidade ${u.numero}`} />
      <header class="im-cabeca">
        <div>
          <h1>
            Kotoba Arcade · Unidade {u.numero} · {u.titulo}
          </h1>
          <p>
            Prova · {prova.questoes.length} questões · para passar: {Math.ceil(prova.questoes.length * 0.8)} acertos (80%)
          </p>
          <p class="im-linhas">Nome: ______________________________ Data: ____/____/______</p>
        </div>
        <div class="im-codigo">
          <Qr texto={enderecoDe({ tipo: 'gabarito', codigo: prova.codigo })} />
          <b data-testid="im-codigo">{prova.codigo}</b>
          <small>gabarito: aponte o celular ou digite o código no curso</small>
        </div>
      </header>
      <p class="im-instrucao">Marque uma alternativa em cada questão. Sem consulta. Depois confira no gabarito.</p>
      <ol class="im-questoes">
        {prova.questoes.map((q) => (
          <li key={q.n} class="im-questao">
            <p>
              <EnunciadoImpresso q={q} />
            </p>
            <ul class="im-opcoes">
              {q.opcoes.map((o, i) => (
                <li key={o}>
                  <span class="im-bola">{LETRA[i]}</span> <OpcaoTexto q={q} o={o} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </main>
  );
}

/** A explicação de cada resposta: a palavra inteira, com leitura e sentido. */
function Explicacao({ q }: { q: Questao }) {
  return (
    <span class="im-explica">
      <span lang="ja">
        <Furigana texto={q.item.jp} leitura={q.item.kana} />
      </span>
      {q.item.tipo === 'kanji' ? ` · ${q.item.destaque} = ${q.item.certa} (${significadoDoKanji(q.item.destaque as string)})` : ` = ${q.item.certa}`}
    </span>
  );
}

function Gabarito({ prova }: { prova: Prova }) {
  return (
    <main class="im" data-testid="im-gabarito">
      <Barra titulo={`Gabarito · ${prova.codigo}`} />
      <header class="im-cabeca">
        <div>
          <h1>
            Gabarito · Unidade {prova.unidade.numero} · {prova.unidade.titulo}
          </h1>
          <p>
            Código {prova.codigo} · {prova.questoes.length} questões · passa com {Math.ceil(prova.questoes.length * 0.8)} acertos
          </p>
        </div>
      </header>
      <ol class="im-gabarito">
        {prova.questoes.map((q) => (
          <li key={q.n} data-testid="im-resposta">
            <b>
              {LETRA[q.opcoes.indexOf(q.certa)]}) <OpcaoTexto q={q} o={q.certa} />
            </b>{' '}
            <Explicacao q={q} />
          </li>
        ))}
      </ol>
      <p class="no-print">
        <a href={enderecoDe({ tipo: 'prova', codigo: prova.codigo })}>Abrir a prova deste código</a>
      </p>
    </main>
  );
}

/* ───────── Apostila ───────── */

function Apostila({ unidade: u }: { unidade: Unidade }) {
  const palavras = palavrasDa(u);
  const notas = u.notas.filter((n) => n.conferida);
  const aula = AULAS_DO_CURSO[u.id] ?? [];
  const tarefas = TAREFAS[u.id] ?? [];
  const rng = seededRng(hashString(u.id));
  const montar = u.gramatica.flatMap((g) => exemplosDoPonto(g).slice(1)).map((e) => ({ e, pecas: pecasParaMontar(e, rng) }));
  return (
    <main class="im" data-testid="im-apostila">
      <Barra titulo={`Apostila da unidade ${u.numero}`} />
      <header class="im-cabeca">
        <div>
          <h1>
            Unidade {u.numero} · {u.titulo}
          </h1>
          <p>Ao final: “Consigo {u.consigo}.”</p>
        </div>
        <div class="im-codigo">
          <Qr texto={`${location.origin}${location.pathname}`} />
          <small>o áudio está no curso</small>
        </div>
      </header>

      {palavras.length > 0 && (
        <section>
          <h2>Vocabulário</h2>
          <table class="im-tabela">
            <tbody>
              {palavras.map((p) => (
                <tr key={p.jp}>
                  <td lang="ja" class="im-jp">
                    <Furigana texto={p.jp} leitura={p.kana} />
                  </td>
                  <td>
                    {p.pt}
                    {p.nota && <small class="im-nota">{p.nota}</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {u.kanji.length > 0 && (
        <section>
          <h2>Kanji</h2>
          <table class="im-tabela">
            <tbody>
              {u.kanji.map((k) => {
                const outras = outrasLeituras(k).filter((o) => o.unidade !== u.numero);
                return (
                  <tr key={`${k.k}${k.leitura}`}>
                    <td lang="ja" class="im-kanji">
                      {k.k}
                    </td>
                    <td>
                      <b lang="ja">{k.leitura}</b> em <span lang="ja">{k.em}</span> · {significadoDoKanji(k.k)}
                      {k.muda && <small class="im-nota">{k.muda}</small>}
                      {outras.length > 0 && (
                        <small class="im-nota">
                          Outras leituras no curso:{' '}
                          {outras.map((o) => (
                            <span key={o.leitura} lang="ja">
                              {o.leitura} ({o.em}, unidade {o.unidade}){' '}
                            </span>
                          ))}
                        </small>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {aula.length > 0 && (
        <section>
          <h2>Aula</h2>
          {aula.map((q, i) => (
            <p key={i}>
              <Misto texto={falaEscrita(q.fala)} />
              {q.tela && (
                <span class="im-nota" lang="ja">
                  <Misto texto={q.tela} />
                </span>
              )}
            </p>
          ))}
        </section>
      )}

      {u.gramatica.length > 0 && (
        <section>
          <h2>Gramática</h2>
          <ul class="im-lista">
            {u.gramatica.map((g) => {
              const { grande, pt } = partesDoPonto(g);
              return (
                <li key={g}>
                  <b lang="ja">{grande}</b> {pt && `· ${pt}`}
                  {exemplosDoPonto(g).slice(0, 1).map((e) => (
                    <span key={e.jp} class="im-nota">
                      <span lang="ja">
                        <Furigana texto={e.jp} leitura={e.kana} />
                      </span>{' '}
                      {e.pt}
                    </span>
                  ))}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {montar.length > 0 && (
        <section class="im-exercicios" data-testid="im-exercicios">
          <h2>Exercício: monte a frase</h2>
          <p class="im-instrucao">Escreva a frase em japonês com as peças, na ordem certa. As respostas estão no fim.</p>
          <ol class="im-lista">
            {montar.map(({ e, pecas }) => (
              <li key={e.jp} class="im-questao">
                <p>“{e.pt}”</p>
                <p lang="ja" class="im-pecas">
                  {pecas.map((p, i) => (
                    <span key={i} class="im-peca">
                      <Furigana texto={p.t} leitura={p.kana} />
                    </span>
                  ))}
                </p>
                <p class="im-linha-escrever">&nbsp;</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {notas.length > 0 && (
        <section>
          <h2>Cultura</h2>
          {notas.map((n) => (
            <div key={n.titulo} class="im-cultura">
              <h3>{n.titulo}</h3>
              <p>
                <Misto texto={n.texto} />
              </p>
              <small>Fonte: {n.fontes.join('; ')}</small>
            </div>
          ))}
        </section>
      )}
      {tarefas.length > 0 && (
        <section>
          <h2>Para usar fora do curso</h2>
          <ul class="im-lista">
            {tarefas.map((t) => (
              <li key={t}>
                <Misto texto={t} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {montar.length > 0 && (
        <section class="im-respostas">
          <h2>Respostas do exercício</h2>
          <ol class="im-lista">
            {montar.map(({ e }) => (
              <li key={e.jp} lang="ja">
                <Furigana texto={e.jp} leitura={e.kana} />
              </li>
            ))}
          </ol>
        </section>
      )}
      {u.revisao && <p>Esta é a unidade de revisão do nível: a apostila de cada unidade tem o conteúdo.</p>}
      <p class="im-rodape">Pontos de gramática do N5 nesta unidade: {u.gramatica.map((g) => GRAMATICA_N5[g]).join(' · ') || 'nenhum'}.</p>
    </main>
  );
}

/* ───────── Cartões ───────── */

interface Cartao {
  frente: string;
  leitura?: string;
  verso: string;
}

function cartoesDa(u: Unidade): Cartao[] {
  return [
    ...palavrasDa(u).map((p) => ({ frente: p.jp, leitura: p.kana, verso: p.pt })),
    ...u.kanji.map((k) => ({ frente: k.k, leitura: `${k.leitura} (${k.em})`, verso: significadoDoKanji(k.k) })),
  ];
}

const POR_FOLHA = 8;

function Cartoes({ unidade: u }: { unidade: Unidade }) {
  const todos = cartoesDa(u);
  const folhas: Cartao[][] = [];
  for (let i = 0; i < todos.length; i += POR_FOLHA) folhas.push(todos.slice(i, i + POR_FOLHA));
  return (
    <main class="im" data-testid="im-cartoes">
      <Barra titulo={`Cartões da unidade ${u.numero} · imprima frente e verso, virando pela borda maior`} />
      {folhas.map((f, i) => (
        <div key={i}>
          <div class="im-folha im-cartoes">
            {f.map((c) => (
              <div key={c.frente + c.verso} class="im-cartao" lang="ja">
                <span class="im-cartao-frente">{c.frente}</span>
              </div>
            ))}
          </div>
          {/* O verso vem espelhado nas colunas: a frente da esquerda cai atrás na direita. */}
          <div class="im-folha im-cartoes im-verso">
            {f.map((c) => (
              <div key={c.frente + c.verso} class="im-cartao">
                <span lang="ja" class="im-cartao-leitura">
                  {c.leitura}
                </span>
                <span>{c.verso}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}

/* ───────── Escrita ───────── */

const CAIXAS = 10;

function OrdemDosTracos({ k }: { k: string }) {
  const t = tracos.value?.kanji[k];
  if (!t) return null;
  return (
    <div class="im-ordem" aria-label={`ordem dos traços de ${k}`}>
      {t.d.map((_, i) => (
        <svg key={i} viewBox="0 0 109 109" class="im-passo">
          {t.d.slice(0, i + 1).map((d, j) => (
            <path key={j} d={d} class={j === i ? 'agora' : ''} />
          ))}
        </svg>
      ))}
    </div>
  );
}

function Escrita({ unidade: u }: { unidade: Unidade }) {
  useEffect(() => {
    void carregarTracos();
  }, []);
  const kanji = [...new Set(u.kanji.map((k) => k.k))];
  return (
    <main class="im" data-testid="im-escrita">
      <Barra titulo={`Escrita dos kanji da unidade ${u.numero}`} />
      <h1>
        Unidade {u.numero} · escrita dos kanji
      </h1>
      <p class="im-instrucao">Siga a ordem dos traços. Cubra os modelos cinza e depois escreva sozinho nas caixas vazias.</p>
      {kanji.length === 0 && <p>Esta unidade não tem kanji novo.</p>}
      {kanji.map((k) => {
        const leituras = u.kanji.filter((x) => x.k === k);
        return (
          <section key={k} class="im-escrita">
            <p>
              <b lang="ja" class="im-kanji">
                {k}
              </b>{' '}
              {significadoDoKanji(k)} ·{' '}
              {leituras.map((x) => (
                <span key={x.leitura} lang="ja">
                  {x.leitura} ({x.em}){' '}
                </span>
              ))}
            </p>
            <OrdemDosTracos k={k} />
            <div class="im-caixas" lang="ja">
              {Array.from({ length: CAIXAS }, (_, i) => (
                <span key={i} class={`im-caixa${i === 0 ? ' modelo' : i < 4 ? ' guia' : ''}`}>
                  {i < 4 ? k : ''}
                </span>
              ))}
            </div>
          </section>
        );
      })}
      <p class="im-rodape">Traços: KanjiVG (Ulrich Apel e colaboradores, CC BY-SA 3.0).</p>
    </main>
  );
}
