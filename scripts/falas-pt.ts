/**
 * Todo o português falado: as aulas do modo Ouvir, a lição falada do Kumitate, a narração
 * da Aventura, o retorno das perguntas da Jornada, as fichas do Aprofundar e o significado
 * falado das apresentações de item novo (src/content/ensino.ts).
 *
 * `scripts/gravar-vozes-pt.mjs` grava esta lista em `public/vozes-pt/voz1/` (ver docs/vozes.md).
 * `tests/vozes-pt.test.ts` confere que cada texto tem gravação.
 */
import { AULAS } from '../src/aulas';
import { SCENES } from '../src/games/aventura/cenas';
import { LICOES_FALADAS } from '../src/games/gramatica/falado';
import { COURSE } from '../src/games/gramatica/pontos';
import { FRASES_DE_RETORNO } from '../src/jornada/retorno';
import { falasPtDaFicha, fichaDe, todosOsAlvos } from '../src/content/aprofundar/fichas';
import { falasPtDoEnsino } from '../src/content/ensino';
import { falasPtDasEtapas } from '../src/games/cena/aulas';

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
    ...todosOsAlvos().flatMap((a) => {
      const f = fichaDe(a);
      return f ? falasPtDaFicha(f).map((texto) => ({ texto, origem: `aprofundar/${a.t}` })) : [];
    }),
    ...falasPtDoEnsino().map((texto) => ({ texto, origem: 'ensino/significado' })),
    ...falasPtDasEtapas().map((texto) => ({ texto, origem: 'cena/etapa' })),
  ];
  const vistas = new Set<string>();
  return todas.filter((f) => {
    if (vistas.has(f.texto)) return false;
    vistas.add(f.texto);
    return true;
  });
}
