import { cenaCorUrl, type Cena } from './arte';

/**
 * Camada da versão colorida do cenário, por baixo do conteúdo do quadro.
 * Aparece como um borrão de tinta que cresce com `--cor` (definido no quadro ou acima dele).
 */
export function Pintura({ cena }: { cena: Cena | undefined }) {
  const url = cena && cenaCorUrl(cena);
  if (!url) return null;
  return <span class="pinta" aria-hidden="true" style={{ '--cena-cor': `url("${url}")` }} />;
}
