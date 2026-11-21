/**
 * Botão do Aprofundar (ao lado do de ajuda, sempre no mesmo canto), a tecla F4 ou !, o
 * painel com a ficha do que está na tela e a oferta do ritmo de estudo.
 *
 * Fica montado uma vez só, em `main.tsx`. Os jogos só dizem o que está na tela, com
 * `useAprofundar`; quem tem tempo correndo já pausa pela ajuda (`useAoAbrirAjuda`).
 */
import { createPortal } from 'preact/compat';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { chaveDoAlvo, mesmoAlvo, type Alvo } from '../../content/aprofundar/alvo';
import { fichaDe } from '../../content/aprofundar/fichas';
import { app, commit, screen } from '../app';
import { ajudaAberta, aprofundarAberto, emCampoDeTexto } from '../help/ajuda';
import { Icone } from '../Icone';
import { teclaDe } from '../teclas';
import { abrirAprofundar, estudoLeve, fecharAprofundar, naTela, oferta, ouvirRespostas, pilha, recentes, TEMPO_DE_ESTUDO_MS, trocarPara, voltar } from './estado';
import { CorpoFicha, pararDeTocar, tocar } from './Ficha';
import './aprofundar.css';

/** Abre ou fecha o Aprofundar com esta tecla? F4 sempre; ! fora de campo de texto. */
export function teclaDeAprofundar(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'metaKey' | 'target'>): boolean {
  if (e.ctrlKey || e.altKey || e.metaKey) return false;
  if (e.key === 'F4') return true;
  if (e.key === '!') return !emCampoDeTexto(e.target);
  return false;
}

function aoTeclar(e: KeyboardEvent): void {
  if (ajudaAberta.value) return;
  const tecla = teclaDe(e);
  const pedido = tecla !== null && teclaDeAprofundar({ key: tecla, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey, target: e.target });
  if (aprofundarAberto.value) {
    // Nenhuma tecla chega ao jogo. Tab e Enter seguem funcionando dentro do painel.
    e.stopImmediatePropagation();
    if (tecla === 'Escape' || pedido) {
      e.preventDefault();
      fecharAprofundar();
    } else if (tecla === 'Backspace' && !emCampoDeTexto(e.target)) {
      e.preventDefault();
      voltar();
    }
    return;
  }
  if (pedido) {
    e.preventDefault();
    e.stopImmediatePropagation();
    abrirAprofundar(oferta.value ?? undefined);
  }
}

const OFERTA_MS = 7000;

function Oferta({ alvo }: { alvo: Alvo }) {
  const f = fichaDe(alvo);
  useEffect(() => {
    const t = setTimeout(() => {
      if (oferta.value && mesmoAlvo(oferta.value, alvo)) oferta.value = null;
    }, OFERTA_MS);
    return () => clearTimeout(t);
  }, [chaveDoAlvo(alvo)]);
  if (!f) return null;
  return (
    <div class="apr-oferta" role="status" data-testid="apr-oferta">
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => abrirAprofundar(alvo)}>
        <Icone nome="book-open" />
        <span>
          Aprofundar <strong lang="ja">{f.grande}</strong>
        </span>
        <kbd>F4</kbd>
      </button>
      <button class="apr-oferta-x" onMouseDown={(e) => e.preventDefault()} onClick={() => (oferta.value = null)} aria-label="Agora não">
        <Icone nome="x" />
      </button>
    </div>
  );
}

function Lista({ titulo, alvos, atual }: { titulo: string; alvos: readonly Alvo[]; atual?: Alvo }) {
  if (alvos.length === 0) return null;
  return (
    <div class="apr-grupo">
      <h4>{titulo}</h4>
      {alvos.map((a) => {
        const f = fichaDe(a);
        if (!f) return null;
        const on = !!atual && mesmoAlvo(a, atual);
        return (
          <button key={chaveDoAlvo(a)} class={on ? 'on' : ''} aria-current={on ? 'true' : undefined} onClick={() => trocarPara(a)}>
            <span lang="ja">{f.grande}</span>
            <small>{f.tipo}</small>
          </button>
        );
      })}
    </div>
  );
}

function Painel() {
  const alvo = pilha.value[pilha.value.length - 1];
  const f = alvo ? fichaDe(alvo) : null;
  const corpo = useRef<HTMLElement>(null);
  const chave = alvo ? chaveDoAlvo(alvo) : '';

  useEffect(() => {
    const raiz = document.getElementById('app');
    raiz?.setAttribute('inert', '');
    return () => {
      raiz?.removeAttribute('inert');
      pararDeTocar();
    };
  }, []);

  // Ficha nova: rola para o topo e, depois de uns segundos aberta, conta como revisão leve.
  useEffect(() => {
    corpo.current?.focus({ preventScroll: true });
    if (corpo.current) corpo.current.scrollTop = 0;
    if (!alvo) return;
    const t = setTimeout(() => {
      if (estudoLeve(app.data.cards, alvo, Date.now()).length > 0) commit();
    }, TEMPO_DE_ESTUDO_MS);
    return () => clearTimeout(t);
  }, [chave]);

  const recentesFora = recentes.value.filter((r) => !naTela.value.some((n) => mesmoAlvo(n, r)));

  return createPortal(
    <div class="apr-fundo" onClick={fecharAprofundar} data-testid="aprofundar">
      <div class="apr-painel" role="dialog" aria-modal="true" aria-labelledby="apr-titulo" onClick={(e) => e.stopPropagation()}>
        <header class="apr-topo">
          {pilha.value.length > 1 && (
            <button class="ghost apr-voltar" onClick={() => voltar()} aria-label="Voltar para a ficha anterior">
              <Icone nome="arrow-left" />
            </button>
          )}
          <span class="apr-chip">{f ? f.tipo : 'Aprofundar'}</span>
          <h2 id="apr-titulo">
            {f ? (
              <>
                <span class="apr-grande" lang="ja">
                  {f.grande}
                </span>
                {f.leitura && (
                  <span class="apr-leitura" lang="ja">
                    {f.leitura}
                  </span>
                )}
                {f.pt && <span class="apr-sentido">{f.pt}</span>}
              </>
            ) : (
              'Aprofundar'
            )}
          </h2>
          {f && f.ouvir.length > 0 && (
            <button class="apr-ouvir-tudo" onClick={() => tocar(f.ouvir)} data-testid="apr-ouvir">
              <Icone nome="headphones" /> Ouvir
            </button>
          )}
          <button class="ghost" onClick={fecharAprofundar} data-testid="apr-fechar">
            Voltar ao jogo <kbd>Esc</kbd>
          </button>
        </header>
        <nav class="apr-indice" aria-label="O que dá para aprofundar">
          <Lista titulo="Na tela" alvos={naTela.value} atual={alvo} />
          <Lista titulo="Respondidos há pouco" alvos={recentesFora} atual={alvo} />
        </nav>
        <section class="apr-corpo" ref={corpo} tabIndex={-1} data-testid="apr-corpo">
          {f ? (
            <CorpoFicha f={f} />
          ) : (
            <p class="apr-vazio">Nada para aprofundar ainda. Responda alguma coisa no jogo e volte aqui: a ficha do que apareceu fica pronta.</p>
          )}
        </section>
      </div>
    </div>,
    document.body,
  );
}

export function Aprofundar() {
  useEffect(() => {
    addEventListener('keydown', aoTeclar, true);
    const parar = ouvirRespostas(
      () => app.data.cards,
      () => app.data.settings.ritmo,
      () => screen.value !== 'hub',
    );
    return () => {
      removeEventListener('keydown', aoTeclar, true);
      parar();
      fecharAprofundar();
    };
  }, []);

  // Trocou de tela: fecha, para não mostrar a ficha da tela anterior. Antes da pintura e só
  // na troca de verdade: um efeito atrasado fechava o painel que o F4 tinha acabado de abrir.
  const tela = screen.value;
  const telaAntes = useRef(tela);
  useLayoutEffect(() => {
    if (telaAntes.current === tela) return;
    telaAntes.current = tela;
    fecharAprofundar();
    oferta.value = null;
  }, [tela]);

  return (
    <>
      <button
        class="apr-botao"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => abrirAprofundar()}
        aria-label="Aprofundar: estudar o que está na tela"
        title="Aprofundar (F4)"
        data-testid="apr-botao"
      >
        <Icone nome="book-open" />
      </button>
      {oferta.value && !aprofundarAberto.value && <Oferta alvo={oferta.value} />}
      {aprofundarAberto.value && <Painel />}
    </>
  );
}
