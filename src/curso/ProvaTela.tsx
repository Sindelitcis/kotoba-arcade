/**
 * A prova de fim de unidade e o nivelamento, na tela (a lógica está em prova.ts).
 *
 * Prova: uma questão por vez, quatro alternativas, sem dizer se acertou até o fim (como numa
 * prova de verdade). Dá para voltar e trocar a resposta. No fim, a nota, o que errou com a resposta
 * certa e, se não passou, rever os cartões do que errou e refazer com outra prova.
 *
 * Nivelamento: poucas questões por unidade, com "Não sei". Passou na unidade (3 de 4), ela conta
 * como feita e a seguinte é testada; não passou, o curso começa nela.
 */
import { useLayoutEffect, useMemo, useState } from 'preact/hooks';
import { jlptDo, NomeDaUnidade, nomeDaUnidade, oQueAbre, seguinteDe, UNIDADES, type Unidade } from '../content/curso';
import { app, commit, cursoAberto, cursoSave } from '../core/app';
import { Apresentacao } from '../core/Apresentacao';
import { apresentar, avaliar, foiApresentado } from '../core/ensino';
import { Furigana, Misto } from '../core/Furigana';
import { TAREFAS } from '../content/curso/tarefas';
import { seededRng } from '../core/rng';
import { cartaoDaPalavra, cartaoDoKanji } from './cartoes';
import { abrirImpresso } from './Impresso';
import { cartaDaPalavra, cartasDoKanji, ondeContinuar, palavraDoCurso, registrarProva, type ItemPratica } from './motor';
import { corrigir, deItem, montarProva, NIVEL_PARA_PASSAR, NOME_SECAO, NOTA_MINIMA, MINIMOS_JLPT, notaJlpt, novaSemente, passariaNoJlpt, questoesDeNivelamento, SIMULADO, UNIDADES_DO_NIVELAMENTO, type Questao, type Resultado, type Secao } from './prova';
import { FraseDaQuestao, OpcaoDeFrase } from './QuestaoFrase';
import { tocarSequencia } from '../core/sequencia';
import { falaDoExemplo } from './exemplos';
import { Icone } from '../core/Icone';
import { useSemLegenda } from '../core/LegendaVoz';
import { useTeclado } from './teclado';
import { palavrasDa } from '../content/curso';

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** O cartão de um item da prova, para rever o que errou. */
function cartaoDe(item: ItemPratica) {
  if (item.tipo === 'palavra') {
    const p = palavraDoCurso(item.jp);
    return p ? cartaoDaPalavra(p) : null;
  }
  for (const u of UNIDADES) for (const k of u.kanji) if (`k:${k.k}:${k.leitura}` === item.id) return cartaoDoKanji(k, u.id);
  return null;
}

/** O que aparece em destaque na questão. Na de leitura, sem furigana: a leitura é a pergunta. */
function Destaque({ q }: { q: Questao }) {
  if (!deItem(q)) return <FraseDaQuestao q={q} />;
  if (q.tipo === 'palavra') return null;
  return (
    <div class="lc-grande cs-pergunta-jp" lang="ja">
      {q.tipo === 'leitura' ? q.item.jp : <Furigana texto={q.item.jp} leitura={q.item.kana} />}
    </div>
  );
}

function TextoOpcao({ q, o }: { q: Questao; o: string }) {
  if (!deItem(q)) return <OpcaoDeFrase q={q} o={o} />;
  if (q.tipo === 'palavra') {
    const p = palavraDoCurso(o);
    return <span lang="ja">{p ? <Furigana texto={o} leitura={p.kana} /> : o}</span>;
  }
  return <span lang={q.tipo === 'leitura' ? 'ja' : undefined}>{o}</span>;
}

/* ───────── Prova ───────── */

export function ProvaTela({ unidade, onSair }: { unidade: Unidade; onSair: () => void }) {
  const [semente, setSemente] = useState(() => novaSemente());
  const prova = useMemo(() => montarProva(unidade, semente), [unidade, semente]);
  const [fase, setFase] = useState<'inicio' | 'questoes' | 'resultado' | 'rever'>('inicio');
  const [i, setI] = useState(0);
  const [respostas, setRespostas] = useState<(string | undefined)[]>([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const q = prova.questoes[i];
  const seguinte = seguinteDe(unidade);

  const comecar = () => {
    setRespostas([]);
    setI(0);
    setResultado(null);
    setFase('questoes');
  };

  const escolher = (o: string) => {
    const r = respostas.slice();
    r[i] = o;
    setRespostas(r);
  };

  const entregar = () => {
    const res = corrigir(prova, respostas);
    const cards = app.data.cards;
    // Cada resposta conta na memória, como uma revisão (só do que já foi apresentado).
    prova.questoes.forEach((x, n) => {
      if (deItem(x) && foiApresentado(cards, x.item.carta)) avaliar(cards, x.item.carta, { correct: respostas[n] === x.certa }, Date.now());
    });
    registrarProva(cursoSave(), unidade.id, res.nota, res.aprovada);
    commit();
    setResultado(res);
    setFase('resultado');
  };

  const proxima = () => {
    if (!q || respostas[i] === undefined) return;
    if (i + 1 < prova.questoes.length) setI(i + 1);
    else entregar();
  };

  const refazer = () => {
    setSemente(novaSemente());
    setFase('inicio');
  };

  // A escuta toca sozinha ao abrir a questão (e de novo com R); o texto nunca aparece, nem na legenda.
  useSemLegenda(fase === 'questoes' && !!q && !deItem(q) && q.tipo === 'escuta');
  const ouvirEscuta = () => {
    if (q && !deItem(q) && q.tipo === 'escuta') void tocarSequencia([falaDoExemplo(q.frase)]);
  };
  useLayoutEffect(() => {
    if (fase === 'questoes') ouvirEscuta();
  }, [fase, i]);

  const cartoesDoErro = () => (resultado?.erradas ?? []).flatMap((x) => (deItem(x) ? [cartaoDe(x.item)] : [])).filter((c) => c !== null);
  const rever = () => (cartoesDoErro().length > 0 ? setFase('rever') : refazer());

  const irParaSeguinte = () => {
    if (seguinte) cursoAberto.value = { unidade: seguinte.id, bloco: ondeContinuar(cursoSave(), seguinte) };
    else onSair();
  };

  useTeclado((tecla) => {
    if (tecla === 'Escape') {
      onSair();
      return true;
    }
    if (fase === 'inicio' && (tecla === 'Enter' || tecla === ' ')) {
      comecar();
      return true;
    }
    if (fase === 'questoes' && q) {
      if (/^[1-4]$/.test(tecla)) {
        const o = q.opcoes[Number(tecla) - 1];
        if (o !== undefined) escolher(o);
        return true;
      }
      if (tecla === 'Enter' || tecla === ' ') {
        proxima();
        return true;
      }
      if (tecla === 'ArrowLeft' && i > 0) {
        setI(i - 1);
        return true;
      }
      if (tecla.toLowerCase() === 'r') {
        ouvirEscuta();
        return true;
      }
    }
    if (fase === 'resultado' && resultado && (tecla === 'Enter' || tecla === ' ')) {
      if (resultado.aprovada) irParaSeguinte();
      else rever();
      return true;
    }
    return false;
  });

  if (fase === 'rever' && resultado) {
    const cartoes = cartoesDoErro();
    if (cartoes.length > 0) return <Apresentacao itens={cartoes} modo="de-novo" onFim={refazer} fim="Fazer outra prova" />;
  }

  if (fase === 'inicio')
    return (
      <div class="koma lc-quadro" data-testid="pv-inicio">
        <div class="lc-conteudo">
          <span class="gr-tag">Prova da {nomeDaUnidade(unidade)}</span>
          <h2 class="cs-titulo">{unidade.revisao ? `Simulado do ${unidade.nivel}` : unidade.titulo}</h2>
          <p class="lc-linha">
            {unidade.revisao && `No formato do JLPT ${jlptDo(unidade.nivel)}, em quatro partes: ${(Object.keys(SIMULADO) as Secao[]).map((s) => NOME_SECAO[s].split(' · ')[0]!.toLowerCase()).join(', ')}. Sem tempo marcado. `}
            {prova.questoes.length} questões com quatro alternativas. Passa com {pct(NOTA_MINIMA)} ({Math.ceil(prova.questoes.length * NOTA_MINIMA)} acertos), e então {oQueAbre(unidade)}.
          </p>
          <p class="lc-linha">O resultado só aparece no fim. Dá para voltar e trocar uma resposta antes de entregar.</p>
          <p class="muted">
            Código desta prova: <b data-testid="pv-codigo">{prova.codigo}</b>. Prefere no papel? Imprima, responda à mão e confira depois no gabarito.
          </p>
        </div>
        <div class="actions center">
          <button class="ghost" onClick={onSair}>
            Agora não <kbd>Esc</kbd>
          </button>
          <button onClick={() => abrirImpresso({ tipo: 'prova', codigo: prova.codigo })} data-testid="pv-imprimir">
            Imprimir esta prova
          </button>
          <button class="primary" onClick={comecar} data-testid="pv-comecar">
            Começar <kbd>Enter</kbd>
          </button>
        </div>
      </div>
    );

  if (fase === 'resultado' && resultado)
    return (
      <div class="koma lc-quadro" data-testid="pv-resultado" data-aprovada={resultado.aprovada ? '1' : '0'}>
        <div class="lc-conteudo">
          <span class="gr-tag">Prova da {nomeDaUnidade(unidade)} · {prova.codigo}</span>
          <h2 class="cs-titulo">
            {resultado.acertos} de {resultado.total} · {pct(resultado.nota)}
          </h2>
          <p class="lc-linha">
            {resultado.aprovada
              ? seguinte
                ? seguinte.nivel === unidade.nivel
                  ? `Passou. A unidade ${seguinte.numero}, ${seguinte.titulo}, está liberada.`
                  : `Passou. O ${unidade.nivel} está completo, e o ${seguinte.nivel} começa: ${seguinte.titulo}.`
                : `Passou. O ${unidade.nivel} está completo.`
              : `Faltou pouco: precisa de ${pct(NOTA_MINIMA)}. Reveja o que errou e faça outra prova, com outras questões.`}
          </p>
          {unidade.revisao && <NotaDoSimulado prova={prova} respostas={respostas} jlpt={jlptDo(unidade.nivel)} />}
          {unidade.revisao && resultado.aprovada && <PedirCertificado unidade={unidade} />}
          {resultado.aprovada && (TAREFAS[unidade.id]?.length ?? 0) > 0 && (
            <>
              <p class="lc-linha">Para usar fora do curso:</p>
              <ul class="pv-erros" data-testid="pv-tarefas">
                {TAREFAS[unidade.id]!.map((t) => (
                  <li key={t}>
                    <Misto texto={t} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {resultado.erradas.length > 0 && (
            <>
              <p class="lc-linha">O que errou:</p>
              <ul class="pv-erros">
                {resultado.erradas.map((x) => (
                  <li key={x.n}>
                    {x.n}. {x.enunciado}{' '}
                    <span lang="ja">{deItem(x) ? <Furigana texto={x.item.jp} leitura={x.item.kana} /> : <Furigana texto={x.frase.jp} leitura={x.frase.kana} />}</span>{' '}
                    → <TextoOpcao q={x} o={x.certa} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div class="actions center">
          <button class="ghost" onClick={onSair}>
            Ver o curso <kbd>Esc</kbd>
          </button>
          {resultado.aprovada ? (
            <button class="primary" onClick={irParaSeguinte} data-testid="pv-seguir">
              {seguinte ? NomeDaUnidade(seguinte) : 'Ver o curso'} <kbd>Enter</kbd>
            </button>
          ) : (
            <button class="primary" onClick={rever} data-testid="pv-rever">
              Rever o que errei <kbd>Enter</kbd>
            </button>
          )}
        </div>
      </div>
    );

  if (!q) return null;
  const escolhida = respostas[i];
  return (
    <div class="koma lc-quadro" data-testid="pv-questao" data-n={q.n}>
      <div class="lc-conteudo">
        <span class="gr-tag">
          Questão {q.n} de {prova.questoes.length}
          {unidade.revisao && ` · ${NOME_SECAO[q.secao]}`}
        </span>
        <p class="lc-enunciado">{q.enunciado}</p>
        <Destaque q={q} />
        {!deItem(q) && q.tipo === 'escuta' && (
          <button onClick={ouvirEscuta} data-testid="pv-ouvir">
            <Icone nome="volume-2" /> Ouvir de novo <kbd>R</kbd>
          </button>
        )}
        <div class="lc-opcoes">
          {q.opcoes.map((o, n) => (
            <button key={o} class={`lc-opcao${escolhida === o ? ' escolhida' : ''}`} aria-pressed={escolhida === o} onClick={() => escolher(o)} data-testid="pv-opcao" data-certa={o === q.certa ? '1' : undefined}>
              <kbd>{n + 1}</kbd> <TextoOpcao q={q} o={o} />
            </button>
          ))}
        </div>
      </div>
      <div class="actions center">
        <button class="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
          ← Anterior
        </button>
        <button class="primary" disabled={escolhida === undefined} onClick={proxima} data-testid="pv-proxima">
          {i + 1 < prova.questoes.length ? 'Próxima' : 'Entregar'} <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}

/** A nota do simulado por parte e na escala do JLPT. */
function NotaDoSimulado({ prova, respostas, jlpt }: { prova: Parameters<typeof notaJlpt>[0]; respostas: readonly (string | undefined)[]; jlpt: 'N5' | 'N4' }) {
  const n = notaJlpt(prova, respostas);
  const m = MINIMOS_JLPT[jlpt];
  return (
    <div class="pv-jlpt" data-testid="pv-jlpt">
      <ul class="pv-erros">
        {(Object.keys(SIMULADO) as Secao[]).map((s) => (
          <li key={s}>
            {NOME_SECAO[s]}: {n.partes[s].acertos} de {n.partes[s].total}
          </li>
        ))}
      </ul>
      <p class="lc-linha">
        Na escala do JLPT: <b>{n.total} de 180</b> (conhecimento e leitura {n.conhecimento} de 120, escuta {n.escuta} de 60).{' '}
        {passariaNoJlpt(n, jlpt) ? `Acima dos mínimos do ${jlpt} (${m.total} no total, ${m.conhecimento} e ${m.escuta} nas partes).` : `O ${jlpt} pede ${m.total} no total, com ao menos ${m.conhecimento} e ${m.escuta} nas partes.`}
      </p>
      <p class="muted">É uma conta proporcional aos acertos, para ter uma ideia. A nota oficial do JLPT é calculada de outro jeito.</p>
    </div>
  );
}

/** Depois do simulado aprovado: o nome para o certificado e o botão que abre a folha. */
function PedirCertificado({ unidade }: { unidade: Unidade }) {
  const [nome, setNome] = useState(cursoSave().nome ?? '');
  const abrir = () => {
    const save = cursoSave();
    const limpo = nome.trim().slice(0, 60);
    if (limpo) save.nome = limpo;
    else delete save.nome;
    commit();
    abrirImpresso({ tipo: 'certificado', unidade: unidade.id });
  };
  return (
    <div class="pv-certificado" data-testid="pv-certificado">
      <label>
        Seu nome no certificado{' '}
        <input value={nome} maxLength={60} onInput={(e) => setNome((e.target as HTMLInputElement).value)} data-testid="pv-nome" />
      </label>
      <button onClick={abrir} data-testid="pv-abrir-certificado">
        Abrir o certificado
      </button>
    </div>
  );
}

/* ───────── Nivelamento ───────── */

const NAO_SEI = 'Não sei';

/** Marca a unidade como feita pelo nivelamento: as cartas entram como vistas e a prova como aprovada. */
function passarNoNivelamento(u: Unidade, certas: readonly ItemPratica[]): void {
  const save = cursoSave();
  const cards = app.data.cards;
  const agora = Date.now();
  apresentar(cards, [...palavrasDa(u).map(cartaDaPalavra), ...u.kanji.flatMap(cartasDoKanji)], agora);
  for (const it of certas) avaliar(cards, it.carta, { correct: true }, agora);
  save.provas[u.id] = { melhor: 1, aprovada: true, tentativas: 0, nivelamento: true };
  commit();
}

export function NivelamentoTela({ onSair }: { onSair: () => void }) {
  const rng = useMemo(() => seededRng(Date.now() >>> 0), []);
  const [fase, setFase] = useState<'inicio' | 'questoes' | 'fim'>('inicio');
  const [ui, setUi] = useState(0);
  const unidade = UNIDADES_DO_NIVELAMENTO[ui];
  const questoes = useMemo(() => (unidade ? questoesDeNivelamento(unidade, rng) : []), [unidade, rng]);
  const [qi, setQi] = useState(0);
  const [certas, setCertas] = useState<ItemPratica[]>([]);
  const [paraEm, setParaEm] = useState<Unidade | null>(null);
  const q = questoes[qi];

  const terminar = (em: Unidade | null) => {
    setParaEm(em);
    setFase('fim');
  };

  const fecharUnidade = (acertos: ItemPratica[]) => {
    if (!unidade) return;
    if (acertos.length >= NIVEL_PARA_PASSAR) {
      passarNoNivelamento(unidade, acertos);
      const prox = UNIDADES_DO_NIVELAMENTO[ui + 1];
      if (!prox) return terminar(seguinteDe(unidade));
      setUi(ui + 1);
      setQi(0);
      setCertas([]);
    } else terminar(unidade);
  };

  const responder = (o: string) => {
    if (!q) return;
    const acertos = o === q.certa ? [...certas, q.item] : certas;
    if (qi + 1 < questoes.length) {
      setCertas(acertos);
      setQi(qi + 1);
    } else fecharUnidade(acertos);
  };

  const comecarCurso = () => {
    const u = paraEm;
    if (u) cursoAberto.value = { unidade: u.id, bloco: ondeContinuar(cursoSave(), u) };
    else onSair();
  };

  useTeclado((tecla) => {
    if (tecla === 'Escape') {
      if (fase === 'questoes') terminar(unidade ?? null);
      else onSair();
      return true;
    }
    if (fase === 'inicio' && (tecla === 'Enter' || tecla === ' ')) {
      setFase('questoes');
      return true;
    }
    if (fase === 'fim' && (tecla === 'Enter' || tecla === ' ')) {
      comecarCurso();
      return true;
    }
    if (fase === 'questoes' && q) {
      if (/^[1-4]$/.test(tecla)) {
        const o = q.opcoes[Number(tecla) - 1];
        if (o !== undefined) responder(o);
        return true;
      }
      if (tecla === '0' || tecla.toLowerCase() === 'n') {
        responder(NAO_SEI);
        return true;
      }
    }
    return false;
  });

  if (fase === 'inicio')
    return (
      <div class="koma lc-quadro" data-testid="nv-inicio">
        <div class="lc-conteudo">
          <span class="gr-tag">Nivelamento</span>
          <h2 class="cs-titulo">Já sabe um pouco? Comece do lugar certo.</h2>
          <p class="lc-linha">
            São {questoes.length} perguntas por unidade, em ordem. Acertou {NIVEL_PARA_PASSAR} de {questoes.length}, a unidade conta como feita e vem a seguinte. Na primeira em que não passar, o curso começa nela.
          </p>
          <p class="lc-linha">Não chute: quando não souber, aperte "Não sei" (tecla 0). Chutar só faz você pular o que ainda precisa aprender.</p>
          <p class="muted">Aqui aparece o que o curso ainda não ensinou. É a única tela que faz isso, e só para quem pediu.</p>
        </div>
        <div class="actions center">
          <button class="ghost" onClick={onSair}>
            Voltar <kbd>Esc</kbd>
          </button>
          <button class="primary" onClick={() => setFase('questoes')} data-testid="nv-comecar">
            Começar <kbd>Enter</kbd>
          </button>
        </div>
      </div>
    );

  if (fase === 'fim')
    return (
      <div class="koma lc-quadro" data-testid="nv-fim">
        <div class="lc-conteudo">
          <span class="gr-tag">Nivelamento</span>
          <h2 class="cs-titulo">{paraEm ? `Você começa na ${nomeDaUnidade(paraEm)}` : 'Você passou em todas as unidades'}</h2>
          <p class="lc-linha">
            {ui > 0 ? `${ui === 1 ? 'A unidade 1 ficou marcada' : `As unidades 1 a ${ui} ficaram marcadas`} como feitas. As palavras e os kanji delas entram na revisão diária, e dá para refazer qualquer uma pelo mapa.` : 'Nenhuma unidade foi pulada. O curso começa do início, com calma.'}
          </p>
        </div>
        <div class="actions center">
          <button class="primary" onClick={comecarCurso} data-testid="nv-seguir">
            {paraEm ? `Ir para a ${nomeDaUnidade(paraEm)}` : 'Ver o curso'} <kbd>Enter</kbd>
          </button>
        </div>
      </div>
    );

  if (!q || !unidade) return null;
  return (
    <div class="koma lc-quadro" data-testid="nv-questao" data-unidade={unidade.id}>
      <div class="lc-conteudo">
        <span class="gr-tag">
          Nivelamento · {nomeDaUnidade(unidade)} · {qi + 1} de {questoes.length}
        </span>
        <p class="lc-enunciado">{q.enunciado}</p>
        <Destaque q={q} />
        <div class="lc-opcoes">
          {q.opcoes.map((o, n) => (
            <button key={o} class="lc-opcao" onClick={() => responder(o)} data-testid="nv-opcao" data-certa={o === q.certa ? '1' : undefined}>
              <kbd>{n + 1}</kbd> <TextoOpcao q={q} o={o} />
            </button>
          ))}
          <button class="lc-opcao" onClick={() => responder(NAO_SEI)} data-testid="nv-nao-sei">
            <kbd>0</kbd> Não sei
          </button>
        </div>
      </div>
      <div class="actions center">
        <button class="ghost" onClick={() => terminar(unidade)}>
          Parar aqui <kbd>Esc</kbd>
        </button>
      </div>
    </div>
  );
}
