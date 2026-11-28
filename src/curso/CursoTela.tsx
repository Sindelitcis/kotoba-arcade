/**
 * O curso: o mapa das unidades e o tocador de lição (docs/curso.md, fase 2).
 *
 * O tocador percorre os blocos da unidade (`blocosDa`, em motor.ts). Bloco de palavras ou de
 * kanji: a apresentação (core/Apresentacao.tsx) e, logo depois, a prática com apoio
 * (pratica.ts). Cada bloco feito fica salvo; parar no meio volta no mesmo bloco.
 *
 * Teclas:
 *   Enter, Espaço   seguir (no mapa: continuar o curso)
 *   1, 2, 3         responder na prática
 *   R               ouvir de novo
 *   Esc             parar aqui (no mapa: voltar ao fliperama)
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { NIVEIS, NomeDaUnidade, nomeDaUnidade, oQueAbre, palavrasDa, seguinteDe, UNIDADES, type Palavra, type Unidade } from '../content/curso';
import { app, commit, cursoAberto, cursoSave, go } from '../core/app';
import { cenaStyle } from '../core/arte';
import { Apresentacao } from '../core/Apresentacao';
import { sfx } from '../core/audio';
import { acertou, errou } from '../core/cor';
import { apresentar } from '../core/ensino';
import { Furigana, Misto } from '../core/Furigana';
import { Icone } from '../core/Icone';
import { useAprofundar } from '../core/aprofundar/estado';
import { tocarSequencia } from '../core/sequencia';
import type { Alvo } from '../content/aprofundar/alvo';
import { MOEDAS_LICAO, XP_ACERTO, XP_LICAO } from '../jornada/andamento';
import { cartaoDaPalavra, cartaoDoKanji, cartaoDoPonto, falaDaPalavra } from './cartoes';
import { figuraDoCurso } from './figura';
import { figuraUrl, temFigura } from '../core/figuras';
import { blocosDa, cartaDaPalavra, cartasDoKanji, concluiuBlocos, explicacaoDoErro, itensAte, itensDaRevisao, itensDoBloco, itensDoMiniteste, liberada, NOME_BLOCO, ondeContinuar, proximaLicao, registrarBloco, unidadePorId, venceu, type Bloco, type ItemPratica } from './motor';
import { abrirImpresso } from './Impresso';
import { lerCodigo, OPCOES_PROVA } from './prova';
import { falaDoExemplo, type Dialogo } from './exemplos';
import { NivelamentoTela, ProvaTela } from './ProvaTela';
import { useTeclado } from './teclado';
import { kanaFeitos, LICOES_KANA, perguntasDosKana, posicaoDoLote } from './modulo0';
import { ModuloZeroTela, TreinoKana } from './ModuloZero';
import { ateOndeFoi, proximoPasso, revisaoDeHoje } from './hoje';
import { AulaView, CompletarView, DitadoView, FormasView, LeituraView, MontarView } from './BlocosAula';
import { Pratica } from './pratica';
import './curso.css';

const voltarAoHub = () => {
  cursoAberto.value = null;
  go('hub');
};

/** Abre a unidade no bloco pedido (ou onde ela parou). */
export function abrirUnidade(u: Unidade, bloco = ondeContinuar(cursoSave(), u)): void {
  cursoAberto.value = { unidade: u.id, bloco };
}

/** Abre a prova da unidade. */
export function abrirProva(u: Unidade): void {
  cursoAberto.value = { unidade: u.id, bloco: 0, modo: 'prova' };
}

/** Continua o curso de onde parou (o "Continuar o curso" da tela inicial). */
export function continuarCurso(): void {
  const passo = proximoPasso(cursoSave(), app.data.cards, Date.now());
  if (passo?.tipo === 'revisao') cursoAberto.value = { unidade: 'hoje', bloco: 0, modo: 'revisao' };
  else if (passo?.tipo === 'kana') cursoAberto.value = { unidade: passo.licao.id, bloco: 0, modo: 'modulo0' };
  else if (passo?.lugar.prova) abrirProva(passo.lugar.unidade);
  else if (passo) abrirUnidade(passo.lugar.unidade, passo.lugar.bloco);
  else cursoAberto.value = null;
  go('curso');
}

/** Começa pela unidade 1, para quem já lê kana (o Módulo 0 sai do caminho). */
export function comecarPeloA1(): void {
  abrirUnidade(UNIDADES[0]!, 0);
  go('curso');
}

export function CursoTela() {
  const aberto = cursoAberto.value;
  const sair = () => {
    cursoAberto.value = null;
    commit();
  };
  const licaoKana = aberto?.modo === 'modulo0' ? LICOES_KANA.find((l) => l.id === aberto.unidade) : undefined;
  if (licaoKana)
    return (
      <main class="lc cs">
        <header class="lc-topo">
          <button class="ghost" onClick={sair}>
            ← Parar aqui <kbd>Esc</kbd>
          </button>
          <div>
            <h1>Módulo 0 · {licaoKana.titulo}</h1>
            <small class="muted">Kana e sons</small>
          </div>
        </header>
        <ModuloZeroTela key={licaoKana.id} licao={licaoKana} onSair={sair} />
      </main>
    );
  if (aberto?.modo === 'revisao')
    return (
      <main class="lc cs">
        <header class="lc-topo">
          <button class="ghost" onClick={sair}>
            ← Parar aqui <kbd>Esc</kbd>
          </button>
          <div>
            <h1>Revisão de hoje</h1>
            <small class="muted">O que está na hora de lembrar</small>
          </div>
        </header>
        <RevisaoDeHojeTela onSair={sair} />
      </main>
    );
  if (aberto?.modo === 'nivelamento')
    return (
      <main class="lc cs">
        <NivelamentoTela onSair={sair} />
      </main>
    );
  const u = aberto ? unidadePorId(aberto.unidade) : undefined;
  if (aberto?.modo === 'prova' && u && liberada(cursoSave(), u.id))
    return (
      <main class="lc cs">
        <header class="lc-topo">
          <button class="ghost" onClick={sair}>
            ← Parar aqui <kbd>Esc</kbd>
          </button>
          <div>
            <h1>
              {NomeDaUnidade(u)} · {u.titulo}
            </h1>
            <small class="muted">Prova da unidade</small>
          </div>
        </header>
        <ProvaTela key={u.id} unidade={u} onSair={sair} />
      </main>
    );
  if (aberto && u && liberada(cursoSave(), u.id)) return <Tocador key={`${u.id}:${aberto.bloco}`} unidade={u} bloco={aberto.bloco} />;
  return <Mapa />;
}

/* ───────── Mapa ───────── */

/** As lições do Módulo 0, antes do A1. Não trancam nada: quem já lê kana pode pular. */
function ModuloZeroNoMapa({ feitos }: { feitos: number }) {
  return (
    <section class="cs-modulo0" data-testid="cs-modulo0">
      <h2>Módulo 0 · kana e sons</h2>
      <p class="muted">Para quem ainda não lê hiragana e katakana. Já lê? Pode ir direto para a unidade 1.</p>
      <ol class="cs-licoes-kana">
        {LICOES_KANA.map((l) => {
          const posicoes = l.lotes.map(posicaoDoLote);
          const feitosAqui = posicoes.filter((p) => p < feitos).length;
          const feita = feitosAqui === posicoes.length;
          return (
            <li key={l.id}>
              <button class={feita ? 'ghost feita' : 'ghost'} onClick={() => (cursoAberto.value = { unidade: l.id, bloco: 0, modo: 'modulo0' })} data-testid="cs-licao-kana" data-id={l.id}>
                {feita ? '✓ ' : ''}
                {l.titulo}
                <small class="muted">
                  {' '}
                  · {feitosAqui} de {posicoes.length}
                </small>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Mapa() {
  const save = cursoSave();
  const prox = proximaLicao(save);
  const comecou = UNIDADES.some((x) => (save.feitos[x.id] ?? 0) > 0 || save.provas[x.id]);
  const ir = () => {
    if (!prox) return;
    if (prox.prova) abrirProva(prox.unidade);
    else abrirUnidade(prox.unidade, prox.bloco);
  };

  useTeclado((tecla) => {
    if (tecla === 'Escape') {
      voltarAoHub();
      return true;
    }
    if ((tecla === 'Enter' || tecla === ' ') && prox) {
      ir();
      return true;
    }
    return false;
  });

  return (
    <main class="lc cs">
      <header class="lc-topo">
        <button class="ghost" onClick={voltarAoHub}>
          ← Fliperama <kbd>Esc</kbd>
        </button>
        <div>
          <h1>Curso · {prox ? prox.unidade.nivel : NIVEIS.map((n) => n.nivel).join(' e ')}</h1>
          <small class="muted">Uma unidade depois da outra. Cada uma libera a seguinte.</small>
        </div>
      </header>

      {prox ? (
        <button class="koma jornada-faixa cs-continuar" style={cenaStyle('aventura-narita')} onClick={ir} data-testid="cs-continuar">
          <span class="hub-rotulo">
            <Icone nome="play" /> Continuar <kbd>Enter</kbd>
          </span>
          <span class="jornada-faixa-txt">
            <b>
              {NomeDaUnidade(prox.unidade)} · {prox.unidade.titulo}
            </b>
            <span>
              {prox.prova ? 'As partes estão feitas. Falta a prova.' : `Parte ${prox.bloco + 1} de ${blocosDa(prox.unidade).length}: ${NOME_BLOCO[(blocosDa(prox.unidade)[prox.bloco] as Bloco).tipo]}`}
            </span>
          </span>
        </button>
      ) : (
        <p class="notice">O curso inteiro está feito, do A1 ao {NIVEIS[NIVEIS.length - 1]!.nivel}. Dá para refazer qualquer unidade.</p>
      )}

      {!comecou && (
        <p class="cs-nivelamento">
          Já estudou japonês antes?{' '}
          <button class="ghost" onClick={() => (cursoAberto.value = { unidade: '', bloco: 0, modo: 'nivelamento' })} data-testid="cs-nivelamento">
            Fazer o nivelamento
          </button>
        </p>
      )}

      <ModuloZeroNoMapa feitos={save.modulo0 ?? 0} />

      {NIVEIS.map((n) => (
      <section key={n.nivel} class="cs-nivel" data-testid="cs-nivel" data-nivel={n.nivel}>
      <h2>
        {n.nivel} · JLPT {n.jlpt}
      </h2>
      <ol class="cs-unidades">
        {UNIDADES.filter((x) => x.nivel === n.nivel).map((x) => {
          const livre = liberada(save, x.id);
          const feita = venceu(save, x.id);
          const total = blocosDa(x).length;
          const feitos = Math.min(save.feitos[x.id] ?? 0, total);
          const faltaProva = !feita && concluiuBlocos(save, x.id);
          const prova = save.provas[x.id];
          return (
            <li key={x.id}>
              <button class={`cs-unidade${feita ? ' feita' : ''}${livre ? '' : ' trancada'}`} disabled={!livre} onClick={() => abrirUnidade(x, feita ? 0 : undefined)} data-testid="cs-unidade" data-unidade={x.id}>
                <span class="cs-num">{x.numero}</span>
                <span class="cs-unidade-txt">
                  <b>{x.titulo}</b>
                  <span>Consigo {x.consigo}.</span>
                  {livre ? (
                    <span class="cs-estado">
                      {feita
                        ? prova?.nivelamento
                          ? 'Feita pelo nivelamento.'
                          : `Feita · prova ${Math.round((prova?.melhor ?? 0) * 100)}%. Pode refazer.`
                        : faltaProva
                          ? 'Partes feitas. Falta a prova.'
                          : feitos > 0
                            ? `${feitos} de ${total} partes`
                            : `${total} partes`}
                    </span>
                  ) : (
                    <span class="cs-estado">
                      <Icone nome="lock" /> Libera depois da {nomeDaUnidade(UNIDADES[x.ordem - 2] ?? x)}
                    </span>
                  )}
                </span>
              </button>
              {livre && (
                <div class="cs-material">
                  {(feita || faltaProva) && (
                    <button class="ghost" onClick={() => abrirProva(x)} data-testid="cs-prova">
                      {feita ? 'Refazer a prova' : 'Fazer a prova'}
                    </button>
                  )}
                  <button class="ghost" onClick={() => abrirImpresso({ tipo: 'apostila', unidade: x.id })} data-testid="cs-apostila">
                    Apostila
                  </button>
                  {x.kanji.length > 0 && (
                    <button class="ghost" onClick={() => abrirImpresso({ tipo: 'escrita', unidade: x.id })}>
                      Folha de escrita
                    </button>
                  )}
                  <button class="ghost" onClick={() => abrirImpresso({ tipo: 'cartoes', unidade: x.id })}>
                    Cartões
                  </button>
                  {x.revisao && feita && (
                    <button class="ghost" onClick={() => abrirImpresso({ tipo: 'certificado', unidade: x.id })} data-testid="cs-certificado">
                      Certificado
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      </section>
      ))}

      <Gabarito />
    </main>
  );
}

/** Conferir uma prova feita no papel: o código está no alto da folha. */
function Gabarito() {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState(false);
  const conferir = (e: Event) => {
    e.preventDefault();
    const c = lerCodigo(texto);
    setErro(!c);
    if (c) abrirImpresso({ tipo: 'gabarito', codigo: texto });
  };
  return (
    <form class="cs-gabarito" onSubmit={conferir}>
      <label for="cs-codigo">Fez uma prova no papel? Digite o código do alto da folha para ver o gabarito.</label>
      <div class="cs-gabarito-linha">
        <input id="cs-codigo" value={texto} onInput={(e) => setTexto((e.target as HTMLInputElement).value)} placeholder="U04-K7QH" autocomplete="off" spellcheck={false} data-testid="cs-codigo" />
        <button type="submit">Ver o gabarito</button>
      </div>
      {erro && (
        <p class="lc-retorno" role="status">
          Esse código não existe. Ele tem a unidade e quatro letras, como U04-K7QH.
        </p>
      )}
    </form>
  );
}

/* ───────── Tocador ───────── */

function Tocador({ unidade, bloco }: { unidade: Unidade; bloco: number }) {
  const blocos = useMemo(() => blocosDa(unidade), [unidade]);
  const b = blocos[bloco];
  const [feito, setFeito] = useState<{ acertos: number; concluiu: boolean } | null>(null);

  const parar = () => {
    cursoAberto.value = null;
    commit();
  };

  // Esc para em qualquer parte do bloco, até no meio da apresentação.
  useTeclado((tecla) => {
    if (tecla !== 'Escape') return false;
    parar();
    return true;
  });

  const terminar = (acertos = 0) => {
    const concluiu = registrarBloco(cursoSave(), unidade, bloco);
    app.data.profile.xp += XP_LICAO + acertos * XP_ACERTO;
    if (concluiu) app.data.profile.coins += MOEDAS_LICAO;
    commit();
    setFeito({ acertos, concluiu });
  };

  if (!b) {
    cursoAberto.value = null;
    return null;
  }

  return (
    <main class="lc cs">
      <header class="lc-topo">
        <button class="ghost" onClick={parar}>
          ← Parar aqui <kbd>Esc</kbd>
        </button>
        <div>
          <h1>
            {NomeDaUnidade(unidade)} · {unidade.titulo}
          </h1>
          <small class="muted" data-testid="cs-parte">
            Parte {bloco + 1} de {blocos.length} · {NOME_BLOCO[b.tipo]}
          </small>
        </div>
      </header>
      <div class="bar lc-barra" aria-hidden="true">
        <i style={{ width: `${((bloco + (feito ? 1 : 0)) / blocos.length) * 100}%` }} />
      </div>

      {feito ? <Intervalo unidade={unidade} bloco={bloco} total={blocos.length} acertos={feito.acertos} concluiu={feito.concluiu} onParar={parar} /> : <BlocoView unidade={unidade} bloco={b} onFim={terminar} />}
    </main>
  );
}

function BlocoView({ unidade, bloco, onFim }: { unidade: Unidade; bloco: Bloco; onFim: (acertos?: number) => void }) {
  switch (bloco.tipo) {
    case 'objetivo':
      return <Objetivo unidade={unidade} onFim={onFim} />;
    case 'palavras':
    case 'kanji':
      return <Estudo unidade={unidade} bloco={bloco} onFim={onFim} />;
    case 'gramatica':
      return <Apresentacao itens={bloco.pontos.map((p) => cartaoDoPonto(p, unidade.id))} onFim={() => onFim()} fim="Seguir" />;
    case 'notas':
      return <Notas bloco={bloco} onFim={onFim} />;
    case 'dialogo':
      return <DialogoView dialogo={bloco.dialogo} onFim={onFim} />;
    case 'revisao':
      return <Revisao unidade={unidade} onFim={onFim} />;
    case 'miniteste':
      return <Miniteste unidade={unidade} onFim={onFim} />;
    case 'aula':
      return <AulaView quadros={bloco.quadros} onFim={onFim} />;
    case 'frases':
      return <MontarView exemplos={bloco.exemplos} onFim={onFim} />;
    case 'completar':
      return <CompletarView unidade={unidade} onFim={onFim} />;
    case 'formas':
      return <FormasView unidade={unidade} pontos={bloco.pontos} onFim={onFim} />;
    case 'ditado':
      return <DitadoView exemplos={bloco.exemplos} onFim={onFim} />;
    case 'leitura':
      return <LeituraView leitura={bloco.leitura} onFim={() => onFim()} />;
  }
}

/** Entre um bloco e outro: o que foi feito e o que vem. Enter segue, Esc para. */
function Intervalo({ unidade, bloco, total, acertos, concluiu, onParar }: { unidade: Unidade; bloco: number; total: number; acertos: number; concluiu: boolean; onParar: () => void }) {
  const seguinte = seguinteDe(unidade);
  const prox = blocosDa(unidade)[bloco + 1];
  const jaVenceu = venceu(cursoSave(), unidade.id);
  const seguir = () => {
    if (!concluiu && prox) abrirUnidade(unidade, bloco + 1);
    else if (!jaVenceu) abrirProva(unidade);
    else if (seguinte) abrirUnidade(seguinte, ondeContinuar(cursoSave(), seguinte));
    else onParar();
  };
  useTeclado((tecla) => {
    if (tecla === 'Enter' || tecla === ' ') {
      seguir();
      return true;
    }
    return false;
  });
  return (
    <div class="koma lc-quadro" data-testid="cs-intervalo">
      <div class="lc-conteudo lc-fim">
        {concluiu ? (
          <>
            <h2 class="cs-titulo" data-testid="cs-unidade-feita">
              Partes da {nomeDaUnidade(unidade)} feitas
            </h2>
            <p class="lc-linha">O objetivo era: “Consigo {unidade.consigo}.”</p>
            {jaVenceu ? (
              <p class="lc-linha">A prova desta unidade já foi aprovada. Pode refazê-la pelo mapa quando quiser.</p>
            ) : (
              <p class="lc-linha">
                Agora vem a prova. Passando com 80%, {oQueAbre(unidade)}. Pode fazer agora ou depois: o curso guarda este ponto.
              </p>
            )}
          </>
        ) : (
          <>
            <h2 class="cs-titulo">
              Parte {bloco + 1} de {total} feita
            </h2>
            {acertos > 0 && <p class="lc-linha">{acertos === 1 ? '1 acerto de primeira.' : `${acertos} acertos de primeira.`}</p>}
            {prox && <p class="lc-linha">A próxima é {NOME_BLOCO[prox.tipo].toLowerCase()}. Pode parar aqui e voltar depois: o curso continua deste ponto.</p>}
          </>
        )}
      </div>
      <div class="actions center">
        <button class="ghost" onClick={onParar}>
          Parar aqui <kbd>Esc</kbd>
        </button>
        <button class="primary" onClick={seguir} data-testid="cs-seguir">
          {concluiu ? (!jaVenceu ? 'Ir para a prova' : seguinte ? NomeDaUnidade(seguinte) : 'Ver o curso') : 'Seguir'} <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}

/* ───────── Objetivo ───────── */

function Objetivo({ unidade, onFim }: { unidade: Unidade; onFim: () => void }) {
  const anterior = UNIDADES[unidade.ordem - 2];
  // Revisão rápida: algumas palavras da unidade anterior, para lembrar antes de começar.
  const revisar = useMemo(() => (anterior ? palavrasDa(anterior).filter((p) => app.data.cards[cartaDaPalavra(p)]).slice(0, 5) : []), [anterior]);
  useTeclado((tecla) => {
    if (tecla === 'Enter' || tecla === ' ') {
      onFim();
      return true;
    }
    return false;
  });
  return (
    <div class="koma lc-quadro" data-testid="cs-objetivo">
      <div class="lc-conteudo">
        <span class="gr-tag">Objetivo</span>
        <h2 class="cs-titulo">Ao final, você vai poder dizer: “Consigo {unidade.consigo}.”</h2>
        {!unidade.revisao && (
          <p class="lc-linha">
            {unidade.palavras.length} palavras, {new Set(unidade.kanji.map((k) => k.k)).size} kanji e {unidade.gramatica.length} {unidade.gramatica.length === 1 ? 'ponto' : 'pontos'} de gramática, em partes curtas.
          </p>
        )}
        {revisar.length > 0 && (
          <>
            <p class="lc-linha">Antes, lembre da {anterior ? nomeDaUnidade(anterior) : ''}:</p>
            <ul class="cs-revisar">
              {revisar.map((p) => (
                <li key={p.jp}>
                  <button class="ghost" onClick={() => void tocarSequencia([{ tipo: 'jp', fala: falaDaPalavra(p) }])}>
                    <span lang="ja" class="jn-jp">
                      <Furigana texto={p.jp} leitura={p.kana} />
                    </span>{' '}
                    <span class="lc-ex-pt">{p.pt}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div class="actions center">
        <button class="primary" onClick={() => onFim()} data-testid="cs-seguir">
          Começar <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}

/* ───────── Palavras e kanji: apresentar e praticar ───────── */

function Estudo({ unidade, bloco, onFim }: { unidade: Unidade; bloco: Extract<Bloco, { tipo: 'palavras' | 'kanji' }>; onFim: (acertos?: number) => void }) {
  const [fase, setFase] = useState<'apresentar' | 'praticar'>('apresentar');
  const cartoes = useMemo(() => (bloco.tipo === 'palavras' ? bloco.palavras.map(cartaoComFigura) : bloco.kanji.map((k) => cartaoDoKanji(k, unidade.id))), [bloco, unidade]);
  const cartas = useMemo(() => (bloco.tipo === 'palavras' ? bloco.palavras.map(cartaDaPalavra) : bloco.kanji.flatMap(cartasDoKanji)), [bloco]);

  if (fase === 'apresentar')
    return (
      <Apresentacao
        itens={cartoes}
        onFim={() => {
          apresentar(app.data.cards, cartas, Date.now());
          commit();
          setFase('praticar');
        }}
      />
    );
  return <PraticaView itens={itensDoBloco(bloco)} conhecidos={itensAte(unidade.ordem)} cartaoDe={(i) => cartaoDoItem(i, bloco, unidade)} onFim={onFim} />;
}

/** O cartão da palavra, com a figura dela quando o site tem uma. */
function cartaoComFigura(p: Palavra) {
  const f = figuraDoCurso(p, temFigura);
  const img = f ? figuraUrl(f.img) : undefined;
  return { ...cartaoDaPalavra(p), ...(img ? { img } : {}) };
}

/** O cartão que volta quando a pessoa erra. */
function cartaoDoItem(i: ItemPratica, bloco: Bloco | null, unidade: Unidade) {
  if (i.tipo === 'palavra') {
    const p = (bloco?.tipo === 'palavras' ? bloco.palavras : UNIDADES.flatMap(palavrasDa)).find((x) => `w:${x.jp}` === i.id);
    if (p) return cartaoComFigura(p);
  }
  for (const u of bloco ? [unidade] : UNIDADES) for (const k of u.kanji) if (`k:${k.k}:${k.leitura}` === i.id) return cartaoDoKanji(k, u.id);
  return null;
}

/** Mini-teste: o que a unidade ensinou, com quatro alternativas, como vai ser na prova. */
function Miniteste({ unidade, onFim }: { unidade: Unidade; onFim: (acertos?: number) => void }) {
  const itens = useMemo(() => itensDoMiniteste(unidade, Math.random), [unidade]);
  if (itens.length === 0) return <Vazio texto="Esta unidade não tem palavras para o mini-teste." onFim={onFim} />;
  return <PraticaView itens={itens} conhecidos={itensAte(unidade.ordem)} cartaoDe={(i) => cartaoDoItem(i, null, unidade)} onFim={onFim} opcoes={OPCOES_PROVA} rotulo="Mini-teste" />;
}

function Revisao({ unidade, onFim }: { unidade: Unidade; onFim: (acertos?: number) => void }) {
  const itens = useMemo(() => itensDaRevisao(unidade, app.data.cards, Math.random), [unidade]);
  if (itens.length === 0) return <Vazio texto="Ainda não há nada visto para revisar. Faça as unidades antes desta." onFim={onFim} />;
  return <PraticaView itens={itens} conhecidos={itensAte(unidade.ordem)} cartaoDe={(i) => cartaoDoItem(i, null, unidade)} onFim={onFim} />;
}

function PraticaView({
  itens,
  conhecidos,
  cartaoDe,
  onFim,
  opcoes,
  rotulo = 'Prática',
}: {
  itens: ItemPratica[];
  conhecidos: readonly ItemPratica[];
  cartaoDe: (i: ItemPratica) => ReturnType<typeof cartaoDaPalavra> | null;
  onFim: (acertos: number) => void;
  opcoes?: number;
  rotulo?: string;
}) {
  const ref = useRef<Pratica | null>(null);
  ref.current ??= new Pratica(itens, conhecidos, { cards: app.data.cards, now: () => Date.now(), rng: Math.random }, opcoes);
  const pr = ref.current;
  const [, setFrame] = useState(0);
  const redraw = () => setFrame((n) => n + 1);
  const [deNovo, setDeNovo] = useState(false);
  const combo = useRef(0);
  const p = pr.pergunta;
  const item = p?.item;

  const ouvir = () => {
    if (item?.tipo === 'palavra') void tocarSequencia([{ tipo: 'jp', fala: falaDaPalavra(item) }]);
    else if (item && pr.resposta) void tocarSequencia([{ tipo: 'jp', fala: falaDaPalavra(item) }]);
  };

  // A palavra fala quando a pergunta aparece. A leitura do kanji só depois da resposta (senão entrega).
  useLayoutEffect(() => {
    if (item?.tipo === 'palavra' && !pr.resposta && !deNovo) ouvir();
  }, [p, deNovo]);

  const alvos: Alvo[] = item && pr.resposta ? [item.tipo === 'palavra' ? { t: 'palavra', id: item.id } : { t: 'kanji', c: item.destaque as string }] : [];
  useAprofundar(alvos);

  const responder = (o: string) => {
    const r = pr.responder(o);
    if (!r) return;
    if (r.certa) {
      combo.current++;
      sfx.hit(combo.current);
      acertou(combo.current);
    } else {
      sfx.miss();
      errou();
    }
    commit();
    redraw();
  };

  const seguir = () => {
    if (!pr.resposta) return;
    if (pr.mostrarDeNovo && !deNovo && cartaoDe(pr.mostrarDeNovo)) {
      setDeNovo(true);
      return;
    }
    setDeNovo(false);
    pr.seguir();
    if (pr.fim) onFim(pr.acertos);
    else redraw();
  };

  useTeclado((tecla) => {
    if (tecla === 'Enter' || tecla === ' ') {
      seguir();
      return true;
    }
    if (tecla.toLowerCase() === 'r') {
      ouvir();
      return true;
    }
    if (/^[1-4]$/.test(tecla) && p && !pr.resposta) {
      const o = p.opcoes[Number(tecla) - 1];
      if (o !== undefined) responder(o);
      return true;
    }
    return false;
  });

  if (!p || !item) return null;
  if (deNovo) {
    const c = cartaoDe(item);
    if (c) return <Apresentacao itens={[c]} modo="de-novo" onFim={seguir} />;
  }

  const enunciado = item.tipo === 'palavra' ? 'O que quer dizer?' : item.jp === item.destaque ? `Como se lê ${item.destaque}?` : `Em ${item.jp}, como se lê ${item.destaque}?`;
  return (
    <div class="koma lc-quadro" data-testid="cs-pergunta" data-item={item.id}>
      <div class="lc-conteudo">
        <span class="gr-tag">
          {rotulo} · faltam {pr.faltam}
        </span>
        <p class="lc-enunciado">{enunciado}</p>
        <div class="lc-grande cs-pergunta-jp" lang="ja">
          {/* A leitura do kanji só aparece depois da resposta: ela é a pergunta. */}
          {item.tipo === 'palavra' || pr.resposta ? <Furigana texto={item.jp} leitura={item.kana} /> : item.jp}
        </div>
        <div class="lc-opcoes">
          {p.opcoes.map((o, i) => {
            const marca = pr.resposta ? (o === item.certa ? ' certa' : o === pr.resposta.escolhida ? ' errada' : ' apagada') : '';
            return (
              <button key={o} class={`lc-opcao${marca}`} disabled={!!pr.resposta} onClick={() => responder(o)} data-testid="cs-opcao" data-certa={o === item.certa ? '1' : undefined}>
                <kbd>{i + 1}</kbd> <span lang={item.tipo === 'kanji' ? 'ja' : undefined}>{o}</span>
              </button>
            );
          })}
        </div>
        {pr.resposta && (
          <p class={pr.resposta.certa ? 'lc-retorno bom' : 'lc-retorno'} role="status" data-testid="cs-retorno">
            {pr.resposta.certa ? 'Isso.' : 'A certa é a marcada. Ela volta daqui a pouco.'}{' '}
            <span lang="ja">
              <Furigana texto={item.jp} leitura={item.kana} />
            </span>{' '}
            {item.tipo === 'kanji' ? `: ${item.destaque} = ${item.certa}` : `= ${item.certa}`}
          </p>
        )}
        {pr.resposta && !pr.resposta.certa && explicacaoDoErro(p, pr.resposta.escolhida) && (
          <p class="lc-retorno" data-testid="cs-explica-erro">
            {explicacaoDoErro(p, pr.resposta.escolhida)}
          </p>
        )}
      </div>
      <div class="actions center">
        <button onClick={ouvir} disabled={item.tipo === 'kanji' && !pr.resposta}>
          <Icone nome="volume-2" /> Ouvir <kbd>R</kbd>
        </button>
        <button class="primary" disabled={!pr.resposta} onClick={seguir} data-testid="cs-seguir">
          Seguir <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}

/**
 * A revisão de hoje (hoje.ts): primeiro os kana, depois as palavras e os kanji. Acabou, o Enter
 * segue o curso de onde parou.
 */
function RevisaoDeHojeTela({ onSair }: { onSair: () => void }) {
  const rev = useMemo(() => revisaoDeHoje(cursoSave(), app.data.cards, Date.now()), []);
  const [fase, setFase] = useState<'kana' | 'itens' | 'fim'>(rev.kana.length > 0 ? 'kana' : rev.itens.length > 0 ? 'itens' : 'fim');
  const seguir = () => {
    commit();
    continuarCurso();
  };
  useTeclado((tecla) => {
    if (tecla === 'Escape') {
      onSair();
      return true;
    }
    if (fase === 'fim' && (tecla === 'Enter' || tecla === ' ')) {
      seguir();
      return true;
    }
    return false;
  });
  if (fase === 'kana')
    return (
      <TreinoKana
        rotulo="Kana"
        gerar={() => perguntasDosKana(rev.kana, kanaFeitos(cursoSave().modulo0 ?? 0), Math.random)}
        onFim={() => {
          commit();
          setFase(rev.itens.length > 0 ? 'itens' : 'fim');
        }}
      />
    );
  if (fase === 'itens')
    return (
      <PraticaView
        itens={rev.itens}
        conhecidos={itensAte(Math.max(1, ateOndeFoi(cursoSave())))}
        cartaoDe={(i) => cartaoDoItem(i, null, UNIDADES[0]!)}
        onFim={() => setFase('fim')}
        rotulo="Revisão"
      />
    );
  return (
    <div class="koma lc-quadro" data-testid="cs-revisao-fim">
      <div class="lc-conteudo">
        <span class="gr-tag">Revisão de hoje</span>
        <h2 class="cs-titulo">Revisão feita.</h2>
        <p class="lc-linha">O que você acabou de lembrar volta mais tarde, cada coisa no seu tempo. Agora o curso segue de onde parou.</p>
      </div>
      <div class="actions center">
        <button class="primary" onClick={seguir} data-testid="cs-revisao-seguir">
          Seguir o curso <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}

function Vazio({ texto, onFim }: { texto: string; onFim: () => void }) {
  useTeclado((tecla) => {
    if (tecla !== 'Enter' && tecla !== ' ') return false;
    onFim();
    return true;
  });
  return (
    <div class="koma lc-quadro">
      <p class="lc-linha">{texto}</p>
      <div class="actions center">
        <button class="primary" onClick={() => onFim()} data-testid="cs-seguir">
          Seguir <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}

/* ───────── Notas culturais ───────── */

function Notas({ bloco, onFim }: { bloco: Extract<Bloco, { tipo: 'notas' }>; onFim: () => void }) {
  useTeclado((tecla) => {
    if (tecla === 'Enter' || tecla === ' ') {
      onFim();
      return true;
    }
    return false;
  });
  return (
    <div class="koma lc-quadro" data-testid="cs-notas">
      <div class="lc-conteudo">
        {bloco.notas.map((n) => (
          <section key={n.titulo} class="cs-nota">
            <h2 class="cs-titulo">
              <Misto texto={n.titulo} />
            </h2>
            <p class="lc-linha">
              <Misto texto={n.texto} />
            </p>
            <small class="muted">Fonte: {n.fontes.join('; ')}</small>
          </section>
        ))}
      </div>
      <div class="actions center">
        <button class="primary" onClick={() => onFim()} data-testid="cs-seguir">
          Seguir <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}

/* ───────── Diálogo ───────── */

/** Uma fala por vez: ela toca, dá um tempo para repetir em voz alta (shadowing) e toca de novo. */
function DialogoView({ dialogo: s, onFim }: { dialogo: Dialogo; onFim: () => void }) {
  const [i, setI] = useState(0);
  const falas = s.falas;
  const tocar = (n: number) => {
    const f = falas[n];
    if (!f) return;
    const jp = falaDoExemplo(f);
    void tocarSequencia([jp, { tipo: 'pausa', vezes: 1.2 }, jp]);
  };
  useLayoutEffect(() => tocar(i), [i]);
  const seguir = () => {
    if (i + 1 < falas.length) setI(i + 1);
    else onFim();
  };
  useTeclado((tecla) => {
    if (tecla === 'Enter' || tecla === ' ') {
      seguir();
      return true;
    }
    if (tecla.toLowerCase() === 'r') {
      tocar(i);
      return true;
    }
    return false;
  });
  return (
    <div class="koma lc-quadro" data-testid="cs-dialogo">
      <div class="lc-conteudo">
        <span class="gr-tag">Diálogo · {s.titulo}</span>
        <p class="lc-linha">{s.contexto}</p>
        <p class="muted">Ouça, repita em voz alta no intervalo e ouça de novo.</p>
        <ol class="cs-falas">
          {falas.slice(0, i + 1).map((f, n) => (
            <li key={n} class={n === i ? 'agora' : ''}>
              <span class="lc-quem">{f.quem}</span>
              <span class="lc-fala">
                <Furigana texto={f.jp} leitura={f.kana} />
              </span>
              <span class="lc-ex-pt">{f.pt}</span>
            </li>
          ))}
        </ol>
      </div>
      <div class="actions center">
        <button onClick={() => tocar(i)}>
          <Icone nome="volume-2" /> Ouvir <kbd>R</kbd>
        </button>
        <button class="primary" onClick={seguir} data-testid="cs-seguir">
          {i + 1 < falas.length ? 'Próxima fala' : 'Seguir'} <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}
