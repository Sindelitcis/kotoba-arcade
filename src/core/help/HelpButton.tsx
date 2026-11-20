/**
 * Botão de interrogação discreto num canto da tela. Fica montado uma vez só, em
 * `main.tsx`, e segue a tela atual. Os jogos não precisam ligar nada: quem tem
 * tempo correndo usa `useAoAbrirAjuda` para pausar, e uma janela com ajuda
 * própria (os Ajustes) usa `useSubtelaAjuda`. Nada abre sozinho.
 */
import { useEffect, useLayoutEffect } from 'preact/hooks';
import { Icone } from '../Icone';
import { SECOES, telaUsaF1 } from '../../content/ajuda';
import { abrirAjuda, ajudaAberta, fecharAjuda, secaoAjuda, teclaDeAjuda, telaAjuda, telaAtual, type TelaAjuda } from './ajuda';
import { teclaDe } from '../teclas';
import { HelpPanel } from './HelpPanel';
import './ajuda.css';

/**
 * Ouve o teclado antes de todo mundo (fase de captura na janela). Com o painel
 * aberto, nenhuma tecla chega ao jogo: os jogos ouvem na fase de bolha.
 */
function aoTeclar(e: KeyboardEvent): void {
  const tela = telaAtual.value;
  // Mesmo filtro dos jogos: com o IME japonês ligado, a tecla vem pela posição; ？ vira ?.
  const tecla = teclaDe(e);
  if (ajudaAberta.value) {
    e.stopImmediatePropagation();
    if (tecla === null) return;
    if (tecla === 'Escape' || tecla === '?' || tecla === 'F1') {
      e.preventDefault();
      if (tecla !== 'F1' || !telaUsaF1(tela)) fecharAjuda();
      return;
    }
    const n = /^[1-9]$/.test(tecla) ? Number(tecla) : 0;
    if (n >= 1 && n <= SECOES.length) {
      e.preventDefault();
      secaoAjuda.value = n - 1;
    } else if (tecla === 'ArrowLeft' || tecla === 'ArrowRight') {
      e.preventDefault();
      const passo = tecla === 'ArrowLeft' ? -1 : 1;
      secaoAjuda.value = (secaoAjuda.value + passo + SECOES.length) % SECOES.length;
    }
    return;
  }
  if (tecla !== null && teclaDeAjuda({ key: tecla, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey, target: e.target }, telaUsaF1(tela))) {
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
      {/* O clique do mouse não leva o foco para o botão: ao fechar, o Enter volta a ser "jogar agora", não "abrir a ajuda de novo". */}
      <button class="ajuda-botao" onMouseDown={(e) => e.preventDefault()} onClick={() => abrirAjuda()} aria-label="Ajuda: como funciona esta tela" title="Ajuda (?)" data-testid="ajuda-botao">
        <Icone nome="circle-question-mark" />
      </button>
      {ajudaAberta.value && <HelpPanel />}
    </>
  );
}
