/**
 * Imagens do vocabulário em imagem (docs/imagens.md, "Estúdio de imagens"), em anime colorido.
 * O Vite cuida dos nomes com hash na versão publicada.
 */
import { temMedida } from '../content/medidas';

export { medida } from '../content/medidas';

const COR = import.meta.glob<string>(['../assets/imagens/*.webp', '../assets/acoes/*.webp', '../assets/gente/*.webp', '../assets/lugares/*.webp'], { eager: true, query: '?url', import: 'default' });

const PASTAS = ['imagens', 'acoes', 'gente', 'lugares'] as const;

function achar(id: string): string | undefined {
  for (const p of PASTAS) {
    const u = COR[`../assets/${p}/${id}.webp`];
    if (u) return u;
  }
  return undefined;
}

/** URL da figura em cor (anime). */
export function figuraUrl(id: string): string | undefined {
  return achar(id);
}

export function temFigura(id: string): boolean {
  return temMedida(id) && !!figuraUrl(id);
}
