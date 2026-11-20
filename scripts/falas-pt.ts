/**
 * Todo o português falado: as aulas do modo Ouvir, a lição falada do Kumitate, a narração
 * da Aventura e o retorno das perguntas da Jornada.
 *
 * `scripts/gravar-aulas.mjs` grava esta lista duas vezes: na voz livre, que vai para
 * `public/vozes-pt/`, e na voz do PC, que fica fora do repositório (ver docs/vozes.md).
 * `tests/vozes-pt.test.ts` confere que cada texto tem gravação na voz livre.
 */
import { AULAS } from '../src/aulas';
import { SCENES } from '../src/games/aventura/cenas';
import { LICOES_FALADAS } from '../src/games/gramatica/falado';
import { COURSE } from '../src/games/gramatica/pontos';
import { FRASES_DE_RETORNO } from '../src/jornada/retorno';

export interface FalaPt {
  /** Exatamente o texto do trecho `{ tipo: 'pt' }`. */
  texto: string;
  origem: string;
}

/** Lista sem repetição, na ordem em que aparece (aulas primeiro). */
export function listarFalasPt(): FalaPt[] {
  const todas: FalaPt[] = [
    ...AULAS.flatMap((a) => a.trechos.flatMap((t) => (t.tipo === 'pt' ? [{ texto: t.texto, origem: `ouvir/${a.id}` }] : []))),
    ...COURSE.points.flatMap((p) => {
      const l = LICOES_FALADAS[p.id];
      return l ? [{ texto: l.explicacao, origem: `kumitate/${p.id}` }, { texto: l.exemplo, origem: `kumitate/${p.id}` }] : [];
    }),
    ...SCENES.flatMap((s) => Object.entries(s.nodes).flatMap(([id, n]) => (n.kind === 'narra' ? [{ texto: n.pt, origem: `aventura/${s.id}/${id}` }] : []))),
    ...FRASES_DE_RETORNO.map((texto) => ({ texto, origem: 'jornada/retorno' })),
  ];
  const vistas = new Set<string>();
  return todas.filter((f) => {
    if (vistas.has(f.texto)) return false;
    vistas.add(f.texto);
    return true;
  });
}
