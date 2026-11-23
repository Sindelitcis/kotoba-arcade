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
import { useMemo, useState } from 'preact/hooks';
import { UNIDADES, type Unidade } from '../content/curso';
import { app, commit, cursoAberto, cursoSave } from '../core/app';
import { Apresentacao } from '../core/Apresentacao';
import { apresentar, avaliar, foiApresentado } from '../core/ensino';
import { Furigana } from '../core/Furigana';
import { seededRng } from '../core/rng';
import { cartaoDaPalavra, cartaoDoKanji } from './cartoes';
import { abrirImpresso } from './Impresso';
import { cartaDaPalavra, cartasDoKanji, ondeContinuar, palavraDoCurso, registrarProva, type ItemPratica } from './motor';
import { corrigir, montarProva, NIVEL_PARA_PASSAR, NOTA_MINIMA, novaSemente, questoesDeNivelamento, UNIDADES_DO_NIVELAMENTO, type Questao, type Resultado } from './prova';
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
  if (q.tipo === 'palavra') return null;
  return (
    <div class="lc-grande cs-pergunta-jp" lang="ja">
      {q.tipo === 'leitura' ? q.item.jp : <Furigana texto={q.item.jp} leitura={q.item.kana} />}
    </div>
  );
}

function TextoOpcao({ q, o }: { q: Questao; o: string }) {
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
  const seguinte = UNIDADES[unidade.numero];

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
      if (foiApresentado(cards, x.item.carta)) avaliar(cards, x.item.carta, { correct: respostas[n] === x.certa }, Date.now());
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
    }
    if (fase === 'resultado' && resultado && (tecla === 'Enter' || tecla === ' ')) {
      if (resultado.aprovada) irParaSeguinte();
      else setFase('rever');
      return true;
    }
    return false;
  });

  if (fase === 'rever' && resultado) {
    const cartoes = resultado.erradas.map((x) => cartaoDe(x.item)).filter((c) => c !== null);
    if (cartoes.length > 0) return <Apresentacao itens={cartoes} modo="de-novo" onFim={refazer} fim="Fazer outra prova" />;
  }

  if (fase === 'inicio')
    return (
      <div class="koma lc-quadro" data-testid="pv-inicio">
        <div class="lc-conteudo">
          <span class="gr-tag">Prova da unidade {unidade.numero}</span>
          <h2 class="cs-titulo">{unidade.revisao ? 'Simulado do A1' : unidade.titulo}</h2>
          <p class="lc-linha">
            {prova.questoes.length} questões com quatro alternativas. Passa com {pct(NOTA_MINIMA)} ({Math.ceil(prova.questoes.length * NOTA_MINIMA)} acertos), e então {seguinte ? `a unidade ${seguinte.numero} abre` : 'o A1 fica completo'}.
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
          <span class="gr-tag">Prova da unidade {unidade.numero} · {prova.codigo}</span>
          <h2 class="cs-titulo">
            {resultado.acertos} de {resultado.total} · {pct(resultado.nota)}
          </h2>
          <p class="lc-linha">
            {resultado.aprovada
              ? seguinte
                ? `Passou. A unidade ${seguinte.numero}, ${seguinte.titulo}, está liberada.`
                : 'Passou. O A1 está completo.'
              : `Faltou pouco: precisa de ${pct(NOTA_MINIMA)}. Reveja o que errou e faça outra prova, com outras questões.`}
          </p>
          {resultado.erradas.length > 0 && (
            <>
              <p class="lc-linha">O que errou:</p>
              <ul class="pv-erros">
                {resultado.erradas.map((x) => (
                  <li key={x.n}>
                    {x.n}. {x.enunciado}{' '}
                    <span lang="ja">
                      <Furigana texto={x.item.jp} leitura={x.item.kana} />
                    </span>{' '}
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
              {seguinte ? `Unidade ${seguinte.numero}` : 'Ver o curso'} <kbd>Enter</kbd>
            </button>
          ) : (
            <button class="primary" onClick={() => setFase('rever')} data-testid="pv-rever">
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
        </span>
        <p class="lc-enunciado">{q.enunciado}</p>
        <Destaque q={q} />
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
      if (!prox) return terminar(UNIDADES[unidade.numero] ?? null);
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
          <h2 class="cs-titulo">{paraEm ? `Você começa na unidade ${paraEm.numero}` : 'Você passou em todas as unidades'}</h2>
          <p class="lc-linha">
            {ui > 0 ? `${ui === 1 ? 'A unidade 1 ficou marcada' : `As unidades 1 a ${ui} ficaram marcadas`} como feitas. As palavras e os kanji delas entram na revisão diária, e dá para refazer qualquer uma pelo mapa.` : 'Nenhuma unidade foi pulada. O curso começa do início, com calma.'}
          </p>
        </div>
        <div class="actions center">
          <button class="primary" onClick={comecarCurso} data-testid="nv-seguir">
            {paraEm ? `Ir para a unidade ${paraEm.numero}` : 'Ver o curso'} <kbd>Enter</kbd>
          </button>
        </div>
      </div>
    );

  if (!q || !unidade) return null;
  return (
    <div class="koma lc-quadro" data-testid="nv-questao" data-unidade={unidade.id}>
      <div class="lc-conteudo">
        <span class="gr-tag">
          Nivelamento · unidade {unidade.numero} · {qi + 1} de {questoes.length}
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
