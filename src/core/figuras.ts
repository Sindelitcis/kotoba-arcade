/**
 * Imagens do vocabulário em imagem (docs/imagens.md, "Estúdio de imagens"): cada figura tem
 * a versão colorida (anime) e a de mangá (tinta), com o mesmo desenho. O Vite cuida dos nomes
 * com hash na versão publicada.
 */
import { temMedida } from '../content/medidas';

export { medida } from '../content/medidas';

const COR = import.meta.glob<string>(['../assets/imagens/*.webp', '../assets/acoes/*.webp', '../assets/gente/*.webp', '../assets/lugares/*.webp'], { eager: true, query: '?url', import: 'default' });
const TINTA = import.meta.glob<string>(['../assets/imagens-tinta/*.webp', '../assets/acoes-tinta/*.webp', '../assets/gente-tinta/*.webp', '../assets/lugares-tinta/*.webp'], {
  eager: true,
  query: '?url',
  import: 'default',
});

const PASTAS = ['imagens', 'acoes', 'gente', 'lugares'] as const;

function achar(tabela: Record<string, string>, sufixo: string, id: string): string | undefined {
  for (const p of PASTAS) {
    const u = tabela[`../assets/${p}${sufixo}/${id}.webp`];
    if (u) return u;
  }
  return undefined;
}

/** URL da figura em cor (anime). */
export function figuraUrl(id: string): string | undefined {
  return achar(COR, '', id);
}

/** URL da figura em traço de mangá. */
export function figuraTintaUrl(id: string): string | undefined {
  return achar(TINTA, '-tinta', id);
}

export function temFigura(id: string): boolean {
  return temMedida(id) && !!figuraUrl(id) && !!figuraTintaUrl(id);
}
