import { useLayoutEffect, useRef } from 'preact/hooks';
import { screen } from '../core/app';
import { camadaAberta } from '../core/help/ajuda';
import { teclaDe } from '../core/teclas';

/** Uma tecla por vez: quem está na tela registra o que faz com ela. */
export type Teclado = (tecla: string, e: KeyboardEvent) => boolean;

export function useTeclado(fn: Teclado): void {
  const ref = useRef(fn);
  ref.current = fn;
  // Antes da pintura: tecla apertada logo que a tela aparece não se perde.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screen.value !== 'curso' || camadaAberta.value || e.ctrlKey || e.altKey || e.metaKey) return;
      const tecla = teclaDe(e);
      if (tecla === null) return;
      // Botão escolhido pelo Tab: o Enter e o espaço são dele.
      if ((tecla === 'Enter' || tecla === ' ') && e.target instanceof HTMLElement && e.target.closest('button, input')) return;
      if (ref.current(tecla, e)) e.preventDefault();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
}
