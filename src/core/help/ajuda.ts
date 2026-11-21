/**
 * Estado da ajuda: qual tela está explicada e se o painel está aberto. Nada
 * abre sozinho: só o botão de interrogação, a tecla ? e a F1 (quando a tela
 * não usa a F1 para outra coisa).
 */
import { computed, signal } from '@preact/signals';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';

export type TelaAjuda = 'hub' | 'ajustes' | 'kanjimon' | 'kanjidex' | 'booster' | 'kanabeat' | 'roguelike' | 'aventura' | 'conversa' | 'gramatica' | 'jornada' | 'licao' | 'pecas' | 'kanaimagens' | 'memoria' | 'cena' | 'ouvir';

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
/** Painel do Aprofundar aberto agora (ver `core/aprofundar`). */
export const aprofundarAberto = signal(false);
/** Alguma camada por cima do jogo (ajuda ou Aprofundar): o jogo fica parado e sem teclado. */
export const camadaAberta = computed(() => ajudaAberta.value || aprofundarAberto.value);

const aoAbrir = new Set<() => void>();
const aoFechar = new Set<() => void>();
let focoAntes: Element | null = null;

/** Uma camada acabou de abrir: os jogos com tempo correndo pausam. */
export function avisarAbertura(): void {
  for (const fn of aoAbrir) fn();
}

/** Uma camada fechou. Se não sobrou nenhuma aberta, o jogo volta de onde parou. */
export function avisarFechamento(): void {
  if (camadaAberta.value) return;
  for (const fn of aoFechar) fn();
}

export function abrirAjuda(secao = 0): void {
  if (ajudaAberta.value) {
    secaoAjuda.value = secao;
    return;
  }
  focoAntes = document.activeElement;
  secaoAjuda.value = secao;
  ajudaAberta.value = true;
  avisarAbertura();
}

export function fecharAjuda(): void {
  if (!ajudaAberta.value) return;
  ajudaAberta.value = false;
  // Devolve o foco para onde estava (o campo de digitar do KanjiMon, da Conversa...).
  const antes = focoAntes;
  focoAntes = null;
  if (antes instanceof HTMLElement && antes.isConnected) antes.focus();
  avisarFechamento();
}

function useOuvinte(lista: Set<() => void>, fn: () => void): void {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const chamar = () => ref.current();
    lista.add(chamar);
    return () => void lista.delete(chamar);
  }, [lista]);
}

/** Roda `fn` toda vez que a ajuda ou o Aprofundar abrir. Jogo com tempo correndo usa para pausar. */
export function useAoAbrirAjuda(fn: () => void): void {
  useOuvinte(aoAbrir, fn);
}

/** Roda `fn` quando a última camada fechar: o jogo pausado por ela volta de onde parou. */
export function useAoFecharCamada(fn: () => void): void {
  useOuvinte(aoFechar, fn);
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
