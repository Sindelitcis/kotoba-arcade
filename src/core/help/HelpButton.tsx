/**
 * Botão de interrogação discreto num canto da tela. Fica montado uma vez só, em
 * `main.tsx`, e segue a tela atual. Os jogos não precisam ligar nada: quem tem
 * tempo correndo usa `useAoAbrirAjuda` para pausar, e uma janela com ajuda
 * própria (os Ajustes) usa `useSubtelaAjuda`. Nada abre sozinho.
 */
import { useEffect, useLayoutEffect } from 'preact/hooks';
import { SECOES, telaUsaF1 } from '../../content/ajuda';
import { abrirAjuda, ajudaAberta, fecharAjuda, secaoAjuda, teclaDeAjuda, telaAjuda, telaAtual, type TelaAjuda } from './ajuda';
import { HelpPanel } from './HelpPanel';
import './ajuda.css';

/**
 * Ouve o teclado antes de todo mundo (fase de captura na janela). Com o painel
 * aberto, nenhuma tecla chega ao jogo: os jogos ouvem na fase de bolha.
 */
function aoTeclar(e: KeyboardEvent): void {
  const tela = telaAtual.value;
  if (ajudaAberta.value) {
    e.stopImmediatePropagation();
    if (e.key === 'Escape' || e.key === '?' || e.key === 'F1') {
      e.preventDefault();
      if (e.key !== 'F1' || !telaUsaF1(tela)) fecharAjuda();
      return;
    }
    const n = /^[1-9]$/.test(e.key) ? Number(e.key) : 0;
    if (n >= 1 && n <= SECOES.length) {
      e.preventDefault();
      secaoAjuda.value = n - 1;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const passo = e.key === 'ArrowLeft' ? -1 : 1;
      secaoAjuda.value = (secaoAjuda.value + passo + SECOES.length) % SECOES.length;
    }
    return;
  }
  if (teclaDeAjuda(e, telaUsaF1(tela))) {
    e.preventDefault();
    e.stopImmediatePropagation();
    abrirAjuda();
  }
}

export function HelpButton({ tela }: { tela: TelaAjuda }) {
  // Antes da pintura: a tecla ? apertada logo que a tela aparece já explica a tela certa.
  // Se a tela trocar com o painel aberto, ele fecha, para não explicar a tela errada.
  useLayoutEffect(() => {
    telaAjuda.value = tela;
    fecharAjuda();
  }, [tela]);

  useEffect(() => {
    addEventListener('keydown', aoTeclar, true);
    return () => {
      removeEventListener('keydown', aoTeclar, true);
      fecharAjuda();
    };
  }, []);

  return (
    <>
      <button class="ajuda-botao" onClick={() => abrirAjuda()} aria-label="Ajuda: como funciona esta tela" title="Ajuda (?)" data-testid="ajuda-botao">
        ?
      </button>
      {ajudaAberta.value && <HelpPanel />}
    </>
  );
}
