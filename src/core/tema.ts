/**
 * Tema claro ou escuro (docs/estilo.md). "auto" segue o sistema pelo `prefers-color-scheme`
 * do CSS; "claro" e "escuro" fixam o tema pelo atributo `data-theme` na raiz.
 */
import { effect } from '@preact/signals';
import { app, tick } from './app';
import type { Tema } from './save';

/** Cor da barra do navegador no celular, igual ao fundo de cada tema. */
export const COR_DA_BARRA = { claro: '#f3f6fb', escuro: '#0d1220' } as const;

export function atributoDoTema(tema: Tema): 'light' | 'dark' | null {
  return tema === 'claro' ? 'light' : tema === 'escuro' ? 'dark' : null;
}

export function aplicarTema(tema: Tema, raiz: HTMLElement = document.documentElement): void {
  const attr = atributoDoTema(tema);
  if (attr) raiz.setAttribute('data-theme', attr);
  else raiz.removeAttribute('data-theme');
  const escuro = attr === 'dark' || (attr === null && typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro ? COR_DA_BARRA.escuro : COR_DA_BARRA.claro);
}

if (typeof document !== 'undefined') {
  effect(() => {
    void tick.value;
    aplicarTema(app.data.settings.tema);
  });
}
