/**
 * A tela do Módulo 0 (a lógica está em modulo0.ts): a introdução da lição e, para cada lote,
 * a apresentação dos kana (com o desenho do Kana em imagens) e um treino curto. Enquanto ela está
 * aberta, a legenda da voz mostra o romaji: o kana ainda é novo.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { kanaItem } from '../content/kana';
import { app, commit, cursoSave } from '../core/app';
import { Apresentacao } from '../core/Apresentacao';
import { speakWord } from '../core/audio';
import { itemNovoDe, type ItemNovo } from '../content/ensino';
import { apresentar, avaliar, foiApresentado } from '../core/ensino';
import { Icone } from '../core/Icone';
import { legendaComRomaji } from '../core/legenda';
import { Imagem } from '../games/kanaimagens/Imagem';
import '../games/kanaimagens/kanaimagens.css';
import { inicioDaLicao, kanaDoLote, LOTES_DO_MODULO, perguntasDoLote, type LicaoKana } from './modulo0';
import { useTeclado } from './teclado';

const desenho = (item: ItemNovo) => (item.alvo.t === 'kana' ? <Imagem item={kanaItem(item.alvo.id)} letra={false} class="ki-grande" /> : null);

function Treino({ posicao, onFim }: { posicao: number; onFim: () => void }) {
  const perguntas = useMemo(() => perguntasDoLote(posicao, Math.random), [posicao]);
  const [i, setI] = useState(0);
  const [escolha, setEscolha] = useState<string | null>(null);
  const p = perguntas[i];
  const ouvir = () => {
    if (p) void speakWord(p.kana.fala);
  };
  useEffect(() => {
    if (p?.modo === 'ouvir') ouvir();
  }, [i]);

  const escolher = (o: string) => {
    if (!p || escolha !== null) return;
    setEscolha(o);
    const cards = app.data.cards;
    if (foiApresentado(cards, p.kana.carta)) avaliar(cards, p.kana.carta, { correct: o === p.certa }, Date.now());
    // Depois da resposta, a voz fala o kana: o som fica ligado à letra.
    ouvir();
  };
  const seguir = () => {
    if (escolha === null) return;
    if (i + 1 < perguntas.length) {
      setI(i + 1);
      setEscolha(null);
    } else onFim();
  };
  useTeclado((tecla) => {
    if (p && /^[1-4]$/.test(tecla)) {
      const o = p.opcoes[Number(tecla) - 1];
      if (o) escolher(o);
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
  useEffect(() => {
    if (perguntas.length === 0) onFim();
  }, [perguntas]);
  if (!p) return null;
  const certa = escolha === p.certa;
  return (
    <div class="koma lc-quadro" data-testid="m0-treino" data-i={i}>
      <div class="lc-conteudo">
        <span class="gr-tag">
          Treino · {i + 1} de {perguntas.length}
        </span>
        {p.modo === 'ouvir' ? (
          <>
            <p class="lc-enunciado">Ouça. Qual kana é este som?</p>
            <button onClick={ouvir} data-testid="m0-ouvir">
              <Icone nome="volume-2" /> Ouvir <kbd>R</kbd>
            </button>
          </>
        ) : (
          <>
            <p class="lc-enunciado">Como se lê?</p>
            <p class="lc-grande" lang="ja">
              {p.kana.char}
            </p>
          </>
        )}
        <div class="lc-opcoes">
          {p.opcoes.map((o, n) => (
            <button
              key={o}
              class={`lc-opcao${escolha !== null && o === p.certa ? ' certa' : ''}${escolha === o && !certa ? ' errada' : ''}`}
              disabled={escolha !== null}
              onClick={() => escolher(o)}
              data-testid="m0-opcao"
              data-certa={o === p.certa ? '1' : undefined}
              lang={p.modo === 'ouvir' ? 'ja' : undefined}
            >
              <kbd>{n + 1}</kbd> {o}
            </button>
          ))}
        </div>
        {escolha !== null && (
          <p class={certa ? 'lc-retorno bom' : 'lc-retorno'} role="status">
            {certa ? 'Isso.' : `É ${p.kana.char}, ${p.kana.romaji}.`} {p.kana.soa && `Soa como ${p.kana.soa}.`}
          </p>
        )}
      </div>
      <div class="actions center">
        <button class="primary" disabled={escolha === null} onClick={seguir} data-testid="m0-seguir">
          Seguir <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}

export function ModuloZeroTela({ licao, onSair }: { licao: LicaoKana; onSair: () => void }) {
  const [posicao, setPosicao] = useState(() => inicioDaLicao(licao, cursoSave().modulo0 ?? 0));
  const comecoDaLicao = LOTES_DO_MODULO.indexOf(licao.lotes[0] as number);
  const [fase, setFase] = useState<'intro' | 'apresentar' | 'treino' | 'fim'>(posicao === comecoDaLicao ? 'intro' : 'apresentar');
  const lote = LOTES_DO_MODULO[posicao] as number;
  const itens = useMemo(() => kanaDoLote(lote).map((k) => itemNovoDe(k.carta)).filter((x): x is ItemNovo => !!x), [lote]);

  // A legenda mostra o romaji só aqui.
  useEffect(() => {
    legendaComRomaji.value = true;
    return () => {
      legendaComRomaji.value = false;
    };
  }, []);

  const loteFeito = () => {
    const save = cursoSave();
    save.modulo0 = Math.max(save.modulo0 ?? 0, posicao + 1);
    commit();
    const prox = posicao + 1;
    if (licao.lotes.includes(LOTES_DO_MODULO[prox] as number)) {
      setPosicao(prox);
      setFase('apresentar');
    } else setFase('fim');
  };

  useTeclado((tecla) => {
    if (tecla === 'Escape') {
      onSair();
      return true;
    }
    if ((fase === 'intro' || fase === 'fim') && (tecla === 'Enter' || tecla === ' ')) {
      if (fase === 'intro') setFase('apresentar');
      else onSair();
      return true;
    }
    return false;
  });

  if (fase === 'intro')
    return (
      <div class="koma lc-quadro" data-testid="m0-intro">
        <div class="lc-conteudo">
          <span class="gr-tag">Módulo 0 · kana e sons</span>
          <h2 class="cs-titulo">{licao.titulo}</h2>
          <p class="lc-linha" lang="pt-BR">
            {licao.intro}
          </p>
          <p class="muted">Enquanto o kana é novo, a legenda embaixo da tela mostra o romaji junto com o som.</p>
        </div>
        <div class="actions center">
          <button class="primary" onClick={() => setFase('apresentar')} data-testid="m0-comecar">
            Começar <kbd>Enter</kbd>
          </button>
        </div>
      </div>
    );
  if (fase === 'fim')
    return (
      <div class="koma lc-quadro" data-testid="m0-fim">
        <div class="lc-conteudo">
          <span class="gr-tag">Módulo 0</span>
          <h2 class="cs-titulo">Lição feita: {licao.titulo}</h2>
          <p class="lc-linha">Os kana desta lição entram na revisão diária. Para treinar mais, o Kana em imagens e o Kana Beat usam as mesmas cartas.</p>
        </div>
        <div class="actions center">
          <button class="primary" onClick={onSair} data-testid="m0-voltar">
            Voltar ao curso <kbd>Enter</kbd>
          </button>
        </div>
      </div>
    );
  if (fase === 'apresentar')
    return (
      <Apresentacao
        key={posicao}
        itens={itens}
        visual={desenho}
        onFim={() => {
          apresentar(app.data.cards, itens.flatMap((x) => x.chaves), Date.now());
          commit();
          setFase('treino');
        }}
      />
    );
  return <Treino key={posicao} posicao={posicao} onFim={loteFeito} />;
}
