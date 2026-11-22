import { createPortal } from 'preact/compat';
import { useEffect, useRef } from 'preact/hooks';
import { AJUDA, rotuloTeclas, SECOES, telaUsaF1, type Ajuda } from '../../content/ajuda';
import { APROFUNDAR } from '../../content/ajuda/comum';
import { Furigana, Misto } from '../Furigana';
import { fecharAjuda, secaoAjuda, telaAtual } from './ajuda';

function Teclas({ teclas }: { teclas: readonly string[] }) {
  return (
    <span class="ajuda-teclas">
      {rotuloTeclas(teclas).map((t) => (
        <kbd key={t}>{t}</kbd>
      ))}
    </span>
  );
}

function Corpo({ a, secao }: { a: Ajuda; secao: number }) {
  const id = SECOES[secao]?.id;
  if (id === 'objetivo') return <>{a.objetivo.map((p) => <p key={p}><Misto texto={p} /></p>)}</>;
  if (id === 'passos')
    return (
      <ol class="ajuda-passos">
        {a.passos.map((p) => (
          <li key={p}>
            <Misto texto={p} />
          </li>
        ))}
      </ol>
    );
  if (id === 'teclas')
    return (
      <dl class="ajuda-lista">
        {a.teclas.map((l) => (
          <div key={l.faz}>
            <dt>
              <Teclas teclas={l.teclas} />
            </dt>
            <dd>
              <Misto texto={l.faz} />
            </dd>
          </div>
        ))}
        <div>
          <dt>
            <Teclas teclas={telaUsaF1(a.tela) ? ['?'] : ['?', 'F1']} />
          </dt>
          <dd>Abrir e fechar esta ajuda</dd>
        </div>
        <div>
          <dt>
            <Teclas teclas={['F4', '!']} />
          </dt>
          <dd>Aprofundar: estudar com calma o que está na tela</dd>
        </div>
      </dl>
    );
  if (id === 'tela')
    return (
      <dl class="ajuda-lista larga">
        {a.elementos.map((e) => (
          <div key={e.nome}>
            <dt>
              <Misto texto={e.nome} />
            </dt>
            <dd>
              <Misto texto={e.texto} />
            </dd>
          </div>
        ))}
      </dl>
    );
  if (id === 'ensina')
    return (
      <ul class="ajuda-pontos">
        {a.ensina.map((p) => (
          <li key={p}>
            <Misto texto={p} />
          </li>
        ))}
      </ul>
    );
  return (
    <div class="ajuda-perguntas">
      {[...a.perguntas, APROFUNDAR].map((q) => (
        <div key={q.p}>
          <h3>
            <Misto texto={q.p} />
          </h3>
          <p>
            <Misto texto={q.r} />
          </p>
        </div>
      ))}
    </div>
  );
}

/** O painel em si. Fica fora do #app, que fica inerte enquanto ele está aberto. */
export function HelpPanel() {
  const a = AJUDA[telaAtual.value];
  const secao = secaoAjuda.value;
  const corpo = useRef<HTMLElement>(null);

  useEffect(() => {
    const raiz = document.getElementById('app');
    raiz?.setAttribute('inert', '');
    return () => raiz?.removeAttribute('inert');
  }, []);

  useEffect(() => {
    corpo.current?.focus({ preventScroll: true });
    if (corpo.current) corpo.current.scrollTop = 0;
  }, [secao, a]);

  return createPortal(
    <div class="ajuda-fundo" onClick={fecharAjuda} data-testid="ajuda">
      <div class="ajuda-painel" role="dialog" aria-modal="true" aria-labelledby="ajuda-titulo" onClick={(e) => e.stopPropagation()}>
        <header class="ajuda-topo">
          <span class="ajuda-jp" lang="ja">
            <Furigana texto={a.jp} />
          </span>
          <h2 id="ajuda-titulo">{a.titulo}</h2>
          <button class="ghost" onClick={fecharAjuda} data-testid="ajuda-fechar">
            Fechar <kbd>Esc</kbd>
          </button>
        </header>
        <nav class="ajuda-indice" aria-label="Seções da ajuda">
          {SECOES.map((s, i) => (
            <button key={s.id} class={i === secao ? 'on' : ''} aria-current={i === secao ? 'true' : undefined} onClick={() => (secaoAjuda.value = i)}>
              <kbd>{i + 1}</kbd> {s.titulo}
            </button>
          ))}
        </nav>
        <section class="ajuda-corpo" ref={corpo} tabIndex={-1} aria-label={SECOES[secao]?.titulo} data-testid="ajuda-corpo">
          <h3 class="ajuda-secao">{SECOES[secao]?.titulo}</h3>
          <Corpo a={a} secao={secao} />
        </section>
      </div>
    </div>,
    document.body,
  );
}
