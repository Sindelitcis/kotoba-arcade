import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { app, commit, go, jornadaSave, licaoAberta, screen } from '../core/app';
import { cenaStyle } from '../core/arte';
import { sfx } from '../core/audio';
import { acertou, cor, corStyle, errou } from '../core/cor';
import { onomato } from '../core/fx';
import { Pintura } from '../core/Pintura';
import { tocarSequencia, type Trecho } from '../core/sequencia';
import { teclaDe } from '../core/teclas';
import { NOME_REGISTRO } from '../content/escola/tipos';
import { Andamento, MOEDAS_LICAO, XP_ACERTO, XP_LICAO } from './andamento';
import { etapaDa, registrarMissao } from './etapas';
import { acharLicao, temJapones, type Passo, type Quadro } from './licoes';
import { Marcado } from './Marcado';
import { falaDaPergunta, falaDoQuadro, retornoFalado } from './retorno';

function falar(trechos: readonly Trecho[]): void {
  if (trechos.length > 0) tocarSequencia(trechos);
}

/** O que o passo fala quando aparece (e na tecla R). */
function falaDoPasso(p: Passo | undefined): Trecho[] {
  if (p?.tipo === 'quadro') return falaDoQuadro(p);
  if (p?.tipo === 'pergunta') return falaDaPergunta(p);
  return [];
}

function QuadroView({ q }: { q: Quadro }) {
  return (
    <div class="lc-conteudo">
      {q.titulo && <h2 class="lc-titulo">{q.titulo}</h2>}
      {q.quem && <span class="lc-quem">{q.quem}</span>}
      {q.grande && (
        <div class="lc-grande" lang="ja">
          <ruby>
            {q.grande}
            <rt>{q.leitura}</rt>
          </ruby>
        </div>
      )}
      {q.jp && <Marcado texto={q.jp} class={q.quem ? 'lc-fala' : 'lc-jp'} />}
      {q.pt && <p class="lc-pt">{q.pt}</p>}
      {q.registro && <p class="lc-registro">{NOME_REGISTRO[q.registro]}</p>}
      {q.linhas.map((l, i) => (
        <p key={i} class="lc-linha">
          {l}
        </p>
      ))}
      {q.exemplos && (
        <ul class="lc-exemplos">
          {q.exemplos.map((ex, i) => (
            <li key={i}>
              <Marcado texto={ex.jp} /> <span class="lc-ex-pt">{ex.pt}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Opção de resposta: japonês com furigana ou português. */
function Opcao({ texto }: { texto: string }) {
  return temJapones(texto) ? <Marcado texto={texto} /> : <span>{texto}</span>;
}

export function LicaoTela() {
  const aberta = licaoAberta.value;
  const licao = aberta ? acharLicao(aberta.licao) : undefined;
  const etapa = aberta ? etapaDa(aberta.missao) : undefined;
  const andRef = useRef<Andamento | null>(null);
  if (licao && andRef.current?.licao !== licao) andRef.current = new Andamento(licao, { cards: app.data.cards, now: () => Date.now(), rng: Math.random });
  const [, setFrame] = useState(0);
  const redraw = () => setFrame((n) => n + 1);
  const quadroEl = useRef<HTMLDivElement>(null);
  const a = andRef.current;

  const sair = () => {
    licaoAberta.value = null;
    go('jornada');
  };

  const concluir = () => {
    if (!aberta || !a) return sair();
    registrarMissao(jornadaSave(), aberta.missao);
    app.data.profile.xp += XP_LICAO + a.acertos * XP_ACERTO;
    app.data.profile.coins += MOEDAS_LICAO;
    commit();
    sair();
  };

  const seguir = () => {
    if (!a) return;
    if (a.fim) return concluir();
    if (!a.avancar()) return;
    sfx.page();
    redraw();
    falar(falaDoPasso(a.passo));
  };

  const responder = (opcao: string) => {
    if (!a) return;
    const p = a.passo;
    const r = a.responder(opcao);
    if (!r) return;
    if (p?.tipo === 'pergunta') falar(retornoFalado(p, r.certa));
    if (r.certa) {
      sfx.hit(a.combo);
      acertou(a.combo);
      onomato('acerto', quadroEl.current, 'shu', 0.9);
    } else {
      sfx.miss();
      errou();
    }
    commit();
    redraw();
  };

  const colocar = (indice: number) => {
    if (!a) return;
    const r = a.colocar(indice);
    if (r === 'volta') {
      sfx.miss();
      onomato('erro', quadroEl.current, 'tinta', 0.7);
    } else if (r === 'certo') sfx.click();
    else if (r === 'pronta') {
      const p = a.passo;
      if (p?.tipo === 'ordem') falar(retornoFalado(p, true));
      sfx.hit(a.combo);
      acertou(a.combo);
      onomato('encaixe', quadroEl.current, 'shu', 0.9);
    }
    redraw();
  };

  // O primeiro quadro também fala, se tiver voz.
  useLayoutEffect(() => {
    falar(falaDoPasso(a?.passo));
  }, [licao]);

  // Ligado junto com o desenho: tecla apertada logo que a tela aparece não se perde.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tecla = teclaDe(e);
      if (tecla === null || screen.value !== 'licao') return;
      const x = andRef.current;
      if (!x) return;
      if (tecla === 'Escape') return sair();
      if (tecla === 'Enter' || tecla === ' ') {
        if (e.target instanceof HTMLElement && e.target.closest('button')) return;
        e.preventDefault();
        return seguir();
      }
      if (tecla.toLowerCase() === 'r') {
        const p = x.passo;
        if (p?.tipo === 'ordem') falar(x.montagemPronta ? retornoFalado(p, true) : []);
        else if (p?.tipo === 'pergunta' && x.resposta) falar([...falaDaPergunta(p), ...retornoFalado(p, true)]);
        else falar(falaDoPasso(p));
        return;
      }
      if (/^[1-9]$/.test(tecla)) {
        const n = Number(tecla) - 1;
        const p = x.passo;
        if (p?.tipo === 'pergunta') {
          const o = x.opcoes[n];
          if (o !== undefined) responder(o);
        } else if (p?.tipo === 'ordem') {
          const b = x.bandeja[n];
          if (b !== undefined) colocar(b);
        }
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  if (!licao || !a) {
    return (
      <main class="lc">
        <p class="notice">Essa lição não existe mais.</p>
        <button onClick={sair}>
          Voltar à Jornada <kbd>Esc</kbd>
        </button>
      </main>
    );
  }

  const p = a.passo;
  const feitos = Math.min(a.i, licao.passos.length);

  return (
    <main class="lc">
      <header class="lc-topo">
        <button class="ghost" onClick={sair}>
          ← Parar aqui <kbd>Esc</kbd>
        </button>
        <div>
          <h1>{licao.titulo}</h1>
          <small class="muted">
            Quadro {Math.min(feitos + 1, licao.passos.length)} de {licao.passos.length}
          </small>
        </div>
      </header>
      <div class="bar lc-barra" aria-hidden="true">
        <i style={{ width: `${(feitos / licao.passos.length) * 100}%` }} />
      </div>

      <div key={a.i} ref={quadroEl} class={`koma lc-quadro${p ? ` ${p.tipo}` : ''}`} style={{ ...cenaStyle(etapa?.cena), ...corStyle(cor.value) }} data-testid="lc-quadro">
        <Pintura cena={etapa?.cena} />
        {p?.tipo === 'quadro' && <QuadroView q={p} />}

        {p?.tipo === 'pergunta' && (
          <div class="lc-conteudo">
            <p class="lc-enunciado">{p.enunciado}</p>
            {p.frase && <Marcado texto={a.resposta && p.fraseCompleta ? p.fraseCompleta : p.frase} class="lc-jp" />}
            <div class="lc-opcoes">
              {a.opcoes.map((o, i) => {
                const marca = a.resposta ? (o === p.correta ? ' certa' : o === a.resposta.escolhida ? ' errada' : ' apagada') : '';
                return (
                  <button key={o} class={`lc-opcao${marca}`} disabled={!!a.resposta} onClick={() => responder(o)} data-testid="lc-opcao">
                    <kbd>{i + 1}</kbd> <Opcao texto={o} />
                  </button>
                );
              })}
            </div>
            {a.resposta && (
              <p class={a.resposta.certa ? 'lc-retorno bom' : 'lc-retorno'} role="status">
                {a.resposta.certa ? 'Isso.' : 'A resposta é a marcada.'} {p.explicacao}
              </p>
            )}
          </div>
        )}

        {p?.tipo === 'ordem' && (
          <div class="lc-conteudo">
            <p class="lc-enunciado">Monte a frase: {p.enunciado}</p>
            <div class="lc-montada" lang="ja">
              {a.montada.length === 0 ? <span class="muted">…</span> : a.montada.map((b) => <Marcado key={b} texto={p.blocos[b] as string} />)}
            </div>
            <div class="lc-opcoes">
              {a.bandeja.map((b, i) => (
                <button
                  key={b}
                  class={`lc-opcao${a.dica === b ? ' brilha' : ''}`}
                  disabled={a.montada.includes(b) || a.montagemPronta}
                  onClick={() => colocar(b)}
                  data-testid="lc-bloco"
                >
                  <kbd>{i + 1}</kbd> <Marcado texto={p.blocos[b] as string} />
                </button>
              ))}
            </div>
            {a.montagemPronta && p.explicacao && <p class="lc-retorno bom">{p.explicacao}</p>}
          </div>
        )}

        {!p && (
          <div class="lc-conteudo lc-fim">
            <h2 class="lc-titulo">Lição feita</h2>
            <p class="lc-linha">
              {a.total > 0 ? `${a.acertos} de ${a.total} de primeira.` : 'Tudo lido.'} Dá para refazer quando quiser.
            </p>
          </div>
        )}
      </div>

      <div class="actions center">
        {falaDoPasso(p).length > 0 && (
          <button onClick={() => falar(falaDoPasso(p))}>
            Ouvir <kbd>R</kbd>
          </button>
        )}
        <button class="primary" disabled={!a.fim && !a.podeSeguir} onClick={seguir} data-testid="lc-seguir">
          {a.fim ? 'Voltar à Jornada' : 'Seguir'} <kbd>Enter</kbd>
        </button>
      </div>
    </main>
  );
}
