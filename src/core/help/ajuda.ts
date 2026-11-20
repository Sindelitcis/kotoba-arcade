/**
 * Estado da ajuda: qual tela está explicada e se o painel está aberto. Nada
 * abre sozinho: só o botão de interrogação, a tecla ? e a F1 (quando a tela
 * não usa a F1 para outra coisa).
 */
import { computed, signal } from '@preact/signals';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';

export type TelaAjuda = 'hub' | 'ajustes' | 'kanjimon' | 'kanjidex' | 'booster' | 'kanabeat' | 'roguelike' | 'aventura' | 'conversa' | 'gramatica' | 'jornada' | 'licao';

/** Tela atual do fliperama. Quem liga o botão define. */
export const telaAjuda = signal<TelaAjuda>('hub');
/** Parte da tela que tem ajuda própria por cima (os Ajustes, dentro do fliperama). */
export const subtelaAjuda = signal<TelaAjuda | null>(null);
/** A tela que o painel explica. */
export const telaAtual = computed<TelaAjuda>(() => subtelaAjuda.value ?? telaAjuda.value);
/** Painel aberto agora. */
export const ajudaAberta = signal(false);
/** Seção mostrada no painel (índice em `SECOES`). */
export const secaoAjuda = signal(0);

const aoAbrir = new Set<() => void>();
let focoAntes: Element | null = null;

export function abrirAjuda(secao = 0): void {
  if (ajudaAberta.value) {
    secaoAjuda.value = secao;
    return;
  }
  focoAntes = document.activeElement;
  secaoAjuda.value = secao;
  ajudaAberta.value = true;
  for (const fn of aoAbrir) fn();
}

export function fecharAjuda(): void {
  if (!ajudaAberta.value) return;
  ajudaAberta.value = false;
  // Devolve o foco para onde estava (o campo de digitar do KanjiMon, da Conversa...).
  const antes = focoAntes;
  focoAntes = null;
  if (antes instanceof HTMLElement && antes.isConnected) antes.focus();
}

/** Roda `fn` toda vez que o painel abrir. Jogo com tempo correndo usa para pausar. */
export function useAoAbrirAjuda(fn: () => void): void {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const chamar = () => ref.current();
    aoAbrir.add(chamar);
    return () => void aoAbrir.delete(chamar);
  }, []);
}

/** Enquanto `sub` não for nulo, a ajuda explica `sub` em vez da tela. Ex.: os Ajustes abertos no fliperama. */
export function useSubtelaAjuda(sub: TelaAjuda | null): void {
  useLayoutEffect(() => {
    subtelaAjuda.value = sub;
    return () => {
      subtelaAjuda.value = null;
    };
  }, [sub]);
}

/** Campo onde a pessoa está digitando texto: ali a tecla ? é texto, não ajuda. */
export function emCampoDeTexto(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  // A caixa do Kana Beat recebe teclas de jogo, não texto: ali o ? ainda abre a ajuda.
  if (alvo.dataset.teclaJogo !== undefined) return false;
  if (alvo.isContentEditable) return true;
  if (alvo instanceof HTMLTextAreaElement) return true;
  if (alvo instanceof HTMLInputElement) return !['checkbox', 'radio', 'button', 'submit', 'file', 'range'].includes(alvo.type);
  return false;
}

/** Deve abrir (ou fechar) a ajuda com esta tecla? `usaF1`: a tela já usa a F1 para outra coisa. */
export function teclaDeAjuda(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'metaKey' | 'target'>, usaF1: boolean): boolean {
  if (e.ctrlKey || e.altKey || e.metaKey) return false;
  if (e.key === 'F1') return !usaF1;
  if (e.key === '?') return !emCampoDeTexto(e.target);
  return false;
}
