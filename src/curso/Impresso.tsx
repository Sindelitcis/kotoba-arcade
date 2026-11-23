/**
 * Material impresso do curso (docs/curso.md, "Provas" e "Material impresso"). Abre numa página
 * própria, pelo endereço, e sai do mesmo dado das lições:
 *
 *   ?imprimir=prova&codigo=U04-K7QH     a prova, com espaço para nome e um QR para o gabarito
 *   ?gabarito=U04-K7QH                   o gabarito da prova (é para onde o QR da folha leva)
 *   ?imprimir=apostila&unidade=a1-04    a unidade para ler longe da tela
 *   ?imprimir=cartoes&unidade=a1-04     cartões de frente e verso para recortar
 *   ?imprimir=escrita&unidade=a1-04     folha de escrita dos kanji, com a ordem dos traços
 *   ?ditado=a1-04                        o áudio do ditado da apostila (é para onde o QR dela leva)
 *   ?escuta=U20-K7QH                     o áudio da parte de escuta do simulado impresso
 *   ?imprimir=certificado&unidade=a1-20  o certificado do nível, depois do simulado aprovado
 */
import qrcode from 'qrcode-generator';
import { useEffect, useState } from 'preact/hooks';
import { GRAMATICA, jlptDo, NomeDaUnidade, nomeDaUnidade, palavrasDa, UNIDADES, type Unidade } from '../content/curso';
import { AULAS_DO_CURSO } from '../content/curso/aulas';
import { TAREFAS } from '../content/curso/tarefas';
import { Furigana, Misto } from '../core/Furigana';
import { hashString, seededRng } from '../core/rng';
import { exemplosDoPonto, falaDoExemplo, falaEscrita, leituraDa, pecasParaMontar } from './exemplos';
import { ditadoDa, lacunasDa } from './exercicios';
import { tocarSequencia } from '../core/sequencia';
import { carregarTracos, tracos } from '../games/pecas/Tracos';
import { significadoDoKanji } from './cartoes';
import { figuraDoCurso } from './figura';
import { figuraUrl, temFigura } from '../core/figuras';
import { outrasLeituras, palavraDoCurso, partesDoPonto } from './motor';
import { deItem, NOME_SECAO, provaDoCodigo, type Prova, type Questao } from './prova';
import { FraseDaQuestao, OpcaoDeFrase } from './QuestaoFrase';
import { cursoSave } from '../core/app';
import './impresso.css';

export type Pedido =
  | { tipo: 'prova'; codigo: string }
  | { tipo: 'gabarito'; codigo: string }
  | { tipo: 'escuta'; codigo: string }
  | { tipo: 'certificado'; unidade: string }
  | { tipo: 'apostila' | 'cartoes' | 'escrita' | 'ditado'; unidade: string };

/** Lê o pedido de impressão do endereço. `null`: é o site normal. */
export function pedidoDoEndereco(busca: string): Pedido | null {
  const q = new URLSearchParams(busca);
  const gabarito = q.get('gabarito');
  if (gabarito) return { tipo: 'gabarito', codigo: gabarito };
  const escuta = q.get('escuta');
  if (escuta) return { tipo: 'escuta', codigo: escuta };
  const ditado = q.get('ditado');
  if (ditado) return { tipo: 'ditado', unidade: ditado };
  const tipo = q.get('imprimir');
  if (tipo === 'prova') return { tipo, codigo: q.get('codigo') ?? '' };
  if (tipo === 'apostila' || tipo === 'cartoes' || tipo === 'escrita' || tipo === 'certificado') return { tipo, unidade: q.get('unidade') ?? '' };
  return null;
}

/** O endereço de um material, a partir da página atual. */
export function enderecoDe(p: Pedido): string {
  const base = `${location.origin}${location.pathname}`;
  if (p.tipo === 'gabarito') return `${base}?gabarito=${encodeURIComponent(p.codigo)}`;
  if (p.tipo === 'escuta') return `${base}?escuta=${encodeURIComponent(p.codigo)}`;
  if (p.tipo === 'ditado') return `${base}?ditado=${encodeURIComponent(p.unidade)}`;
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
  if (pedido.tipo === 'prova' || pedido.tipo === 'gabarito' || pedido.tipo === 'escuta') {
    const p = provaDoCodigo(pedido.codigo);
    if (!p) return <Erro texto={`Não achei a prova com o código "${pedido.codigo}". Confira as letras na folha.`} />;
    if (pedido.tipo === 'escuta') return <AudioDaEscuta prova={p} />;
    return pedido.tipo === 'prova' ? <ProvaImpressa prova={p} /> : <Gabarito prova={p} />;
  }
  const u = UNIDADES.find((x) => x.id === pedido.unidade);
  if (!u) return <Erro texto="Essa unidade não existe." />;
  if (pedido.tipo === 'apostila') return <Apostila unidade={u} />;
  if (pedido.tipo === 'cartoes') return <Cartoes unidade={u} />;
  if (pedido.tipo === 'ditado') return <AudioDoDitado unidade={u} />;
  if (pedido.tipo === 'certificado') return <Certificado unidade={u} />;
  return <Escrita unidade={u} />;
}

/* ───────── Prova ───────── */

/** O enunciado na folha. No de sentido, a palavra entra no meio, com a leitura em cima. */
function EnunciadoImpresso({ q }: { q: Questao }) {
  if (!deItem(q))
    return (
      <>
        {q.tipo === 'escuta' ? 'Ouça a frase desta questão pelo código no alto da folha. O que ela quer dizer?' : q.enunciado}
        <FraseDaQuestao q={q} />
      </>
    );
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
  if (!deItem(q)) return <OpcaoDeFrase q={q} o={o} />;
  if (q.tipo === 'palavra') {
    // Toda alternativa em japonês leva furigana, não só a certa.
    const p = palavraDoCurso(o);
    return <span lang="ja">{p ? <Furigana texto={o} leitura={p.kana} /> : o}</span>;
  }
  return <span lang={q.tipo === 'leitura' ? 'ja' : undefined}>{o}</span>;
}

function ProvaImpressa({ prova }: { prova: Prova }) {
  const u = prova.unidade;
  const temEscuta = prova.questoes.some((q) => !deItem(q) && q.tipo === 'escuta');
  return (
    <main class="im" data-testid="im-prova">
      <Barra titulo={`Prova da ${nomeDaUnidade(u)}`} />
      <header class="im-cabeca">
        <div>
          <h1>
            Kotoba Arcade · {NomeDaUnidade(u)} · {u.titulo}
          </h1>
          <p>
            Prova · {prova.questoes.length} questões · para passar: {Math.ceil(prova.questoes.length * 0.8)} acertos (80%)
          </p>
          <p class="im-linhas">Nome: ______________________________ Data: ____/____/______</p>
        </div>
        {temEscuta && (
          <div class="im-codigo" data-testid="im-qr-escuta">
            <Qr texto={enderecoDe({ tipo: 'escuta', codigo: prova.codigo })} />
            <small>áudio da escuta</small>
          </div>
        )}
        <div class="im-codigo">
          <Qr texto={enderecoDe({ tipo: 'gabarito', codigo: prova.codigo })} />
          <b data-testid="im-codigo">{prova.codigo}</b>
          <small>gabarito: aponte o celular ou digite o código no curso</small>
        </div>
      </header>
      <p class="im-instrucao">Marque uma alternativa em cada questão. Sem consulta. Depois confira no gabarito.</p>
      <ol class="im-questoes">
        {prova.questoes.map((q, i) => (
          <li key={q.n} class="im-questao">
            {u.revisao && prova.questoes[i - 1]?.secao !== q.secao && <h2 class="im-secao">{NOME_SECAO[q.secao]}</h2>}
            <div>
              <EnunciadoImpresso q={q} />
            </div>
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
  if (!deItem(q))
    return (
      <span class="im-explica">
        <span lang="ja">
          <Furigana texto={q.frase.jp} leitura={q.frase.kana} />
        </span>{' '}
        = {q.frase.pt}
      </span>
    );
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
            Gabarito · {NomeDaUnidade(prova.unidade)} · {prova.unidade.titulo}
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
  const lacunas = u.revisao ? [] : lacunasDa(u, rng);
  const ditado = u.revisao ? [] : ditadoDa(u);
  const leitura = leituraDa(u);
  return (
    <main class="im" data-testid="im-apostila">
      <Barra titulo={`Apostila da ${nomeDaUnidade(u)}`} />
      <header class="im-cabeca">
        <div>
          <h1>
            {NomeDaUnidade(u)} · {u.titulo}
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
                const outras = outrasLeituras(k).filter((o) => o.unidade !== u.id);
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
                              {o.leitura} ({o.em}, {o.nome}){' '}
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

      {lacunas.length > 0 && (
        <section class="im-exercicios" data-testid="im-completar">
          <h2>Exercício: complete</h2>
          <p class="im-instrucao">Escreva a peça que falta. As opções estão entre parênteses.</p>
          <ol class="im-lista">
            {lacunas.map((l) => (
              <li key={l.exemplo.jp} class="im-questao">
                <p lang="ja">
                  {l.antes.map((x, i) => (
                    <Furigana key={i} texto={x.t} leitura={x.kana} />
                  ))}
                  <span class="im-lacuna">&nbsp;</span>
                  {l.depois.map((x, i) => (
                    <Furigana key={i} texto={x.t} leitura={x.kana} />
                  ))}
                  {l.exemplo.jp.slice(-1)} <span class="im-opcoes">({l.opcoes.join('・')})</span>
                </p>
                <p class="im-nota">{l.exemplo.pt}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {ditado.length > 0 && (
        <section class="im-exercicios" data-testid="im-ditado">
          <h2>Ditado</h2>
          <div class="im-ditado-cabeca">
            <p class="im-instrucao">
              Aponte a câmera para o código: ele abre o áudio das frases. Ouça cada uma quantas vezes quiser e escreva em kana.
            </p>
            <Qr texto={enderecoDe({ tipo: 'ditado', unidade: u.id })} />
          </div>
          <ol class="im-lista">
            {ditado.map((e) => (
              <li key={e.jp} class="im-questao">
                <p class="im-linha-escrever">&nbsp;</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {leitura && (
        <section data-testid="im-leitura">
          <h2>Leitura: {leitura.titulo}</h2>
          <p class="im-instrucao">Leia em voz alta. A tradução está no fim.</p>
          <p lang="ja" class="im-leitura">
            {leitura.frases.map((f) => (
              <Furigana key={f.jp} texto={f.jp} leitura={f.kana} />
            ))}
          </p>
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

      {(montar.length > 0 || lacunas.length > 0 || ditado.length > 0 || leitura) && (
        <section class="im-respostas" data-testid="im-respostas">
          <h2>Respostas dos exercícios</h2>
          {montar.length > 0 && (
            <>
              <h3>Monte a frase</h3>
              <ol class="im-lista">
                {montar.map(({ e }) => (
                  <li key={e.jp} lang="ja">
                    <Furigana texto={e.jp} leitura={e.kana} />
                  </li>
                ))}
              </ol>
            </>
          )}
          {lacunas.length > 0 && (
            <>
              <h3>Complete</h3>
              <ol class="im-lista">
                {lacunas.map((l) => (
                  <li key={l.exemplo.jp} lang="ja">
                    {l.resposta.t}
                  </li>
                ))}
              </ol>
            </>
          )}
          {leitura && (
            <>
              <h3>Tradução da leitura</h3>
              <p>{leitura.frases.map((f) => f.pt).join(' ')}</p>
            </>
          )}
          {ditado.length > 0 && (
            <>
              <h3>Ditado</h3>
              <ol class="im-lista">
                {ditado.map((e) => (
                  <li key={e.jp} lang="ja">
                    {e.kana} <span class="im-nota">{e.pt}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      )}
      {u.revisao && <p>Esta é a unidade de revisão do nível: a apostila de cada unidade tem o conteúdo.</p>}
      <p class="im-rodape">Pontos de gramática do {jlptDo(u.nivel)} nesta unidade: {u.gramatica.map((g) => GRAMATICA[g]).join(' · ') || 'nenhum'}.</p>
    </main>
  );
}

/* ───────── Áudio da escuta e certificado ───────── */

/** A página que o QR da prova impressa abre: um botão por questão de escuta. */
function AudioDaEscuta({ prova }: { prova: Prova }) {
  const escuta = prova.questoes.filter((q) => !deItem(q) && q.tipo === 'escuta');
  return (
    <main class="im im-audio" data-testid="im-audio-escuta">
      <h1>Escuta · {prova.codigo}</h1>
      <p>Toque na questão para ouvir a frase. Pode ouvir mais de uma vez.</p>
      <ol class="im-lista">
        {escuta.map((q) => (
          <li key={q.n}>
            <button class="primary" onClick={() => !deItem(q) && void tocarSequencia([falaDoExemplo(q.frase)])} data-testid="im-ouvir">
              Questão {q.n}
            </button>
          </li>
        ))}
      </ol>
    </main>
  );
}

const dataPorExtenso = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

/** O certificado do nível: só com o simulado aprovado neste aparelho. */
function Certificado({ unidade: u }: { unidade: Unidade }) {
  const save = cursoSave();
  const p = save.provas[u.id];
  if (!u.revisao || !p?.aprovada) return <Erro texto="O certificado sai depois do simulado do nível, com 80% ou mais." />;
  const nivel = u.nivel;
  return (
    <main class="im im-certificado" data-testid="im-certificado">
      <Barra titulo={`Certificado do ${nivel}`} />
      <div class="im-cert-folha">
        <p class="im-cert-marca">Kotoba Arcade · curso de japonês</p>
        <h1>Certificado de conclusão</h1>
        <p class="im-cert-texto">Certificamos que</p>
        <p class="im-cert-nome" data-testid="im-cert-nome">
          {save.nome || '______________________________'}
        </p>
        <p class="im-cert-texto">
          concluiu o nível {nivel} do curso, equivalente ao conteúdo do JLPT {jlptDo(u.nivel)}, com aprovação no simulado final: {Math.round(p.melhor * 100)}%.
        </p>
        <p class="im-cert-texto">
          {UNIDADES.filter((x) => x.id.startsWith(`${u.id.split('-')[0]}-`) && !x.revisao).length} unidades, com vocabulário, kanji, gramática, leitura, escuta e notas de cultura.
        </p>
        {p.quando && <p class="im-cert-data">{dataPorExtenso(p.quando)}</p>}
        <p class="im-cert-aviso">Certificado do curso, não do JLPT. O JLPT é aplicado pela Japan Foundation e pelo JEES.</p>
      </div>
    </main>
  );
}

/* ───────── Áudio do ditado ───────── */

/** A página que o QR do ditado abre (no celular): um botão por frase, sem o texto. */
function AudioDoDitado({ unidade: u }: { unidade: Unidade }) {
  const frases = ditadoDa(u);
  const [ver, setVer] = useState(false);
  return (
    <main class="im im-audio" data-testid="im-audio-ditado">
      <h1>
        Ditado · {nomeDaUnidade(u)}
      </h1>
      <p>Toque numa frase para ouvir. Escreva em kana na folha.</p>
      <ol class="im-lista">
        {frases.map((e, i) => (
          <li key={e.jp}>
            <button class="primary" onClick={() => void tocarSequencia([falaDoExemplo(e)])} data-testid="im-ouvir">
              Ouvir a frase {i + 1}
            </button>
            {ver && (
              <span lang="ja" class="im-nota">
                {e.kana}
              </span>
            )}
          </li>
        ))}
      </ol>
      <button onClick={() => setVer(!ver)}>{ver ? 'Esconder as respostas' : 'Ver as respostas'}</button>
    </main>
  );
}

/* ───────── Cartões ───────── */

interface Cartao {
  frente: string;
  leitura?: string;
  verso: string;
  /** A figura da palavra, no verso, junto do significado. */
  img?: string;
}

function cartoesDa(u: Unidade): Cartao[] {
  return [
    ...palavrasDa(u).map((p) => {
      const f = figuraDoCurso(p, temFigura);
      const img = f ? figuraUrl(f.img) : undefined;
      return { frente: p.jp, leitura: p.kana, verso: p.pt, ...(img ? { img } : {}) };
    }),
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
      <Barra titulo={`Cartões da ${nomeDaUnidade(u)} · imprima frente e verso, virando pela borda maior`} />
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
                {c.img && <img class="im-cartao-img" src={c.img} alt="" data-testid="im-cartao-img" />}
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
      <Barra titulo={`Escrita dos kanji da ${nomeDaUnidade(u)}`} />
      <h1>
        {NomeDaUnidade(u)} · escrita dos kanji
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
