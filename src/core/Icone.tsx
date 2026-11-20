/**
 * Ícones do Lucide (licença ISC, src/assets/icones/LICENSE-lucide.txt), desenhados com a cor do texto.
 * O SVG entra no HTML para herdar `currentColor` e o tamanho do `.icone`.
 */
const SVGS = import.meta.glob<string>('../assets/icones/*.svg', { eager: true, query: '?raw', import: 'default' });

export type NomeIcone =
  | 'arrow-left'
  | 'check'
  | 'chevron-right'
  | 'circle-question-mark'
  | 'coins'
  | 'flame'
  | 'headphones'
  | 'heart'
  | 'lock'
  | 'map'
  | 'mic'
  | 'moon'
  | 'play'
  | 'settings'
  | 'sparkles'
  | 'sun'
  | 'volume-2'
  | 'x';

export function svgDoIcone(nome: NomeIcone): string {
  return SVGS[`../assets/icones/${nome}.svg`] ?? '';
}

export function Icone({ nome }: { nome: NomeIcone }) {
  return <span class="icone" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svgDoIcone(nome) }} />;
}
