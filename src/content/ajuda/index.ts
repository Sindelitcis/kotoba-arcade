/** Texto de ajuda de cada tela. Tela nova no fliperama precisa de entrada aqui: um teste falha se faltar. */
import type { TelaAjuda } from '../../core/help/ajuda';
import { AVENTURA } from './aventura';
import { CONVERSA } from './conversa';
import { AJUSTES, HUB } from './hub';
import { JORNADA, LICAO } from './jornada';
import { KANABEAT } from './kanabeat';
import { BOOSTER, KANJIDEX, KANJIMON } from './kanjimon';
import { KOTODAMA } from './kotodama';
import { KUMITATE } from './kumitate';
import { PECAS } from './pecas';
import type { Ajuda } from './tipos';

export type { Ajuda, Item, LinhaTecla, Pergunta } from './tipos';
export { SECOES } from './tipos';

export const AJUDA: Record<TelaAjuda, Ajuda> = {
  hub: HUB,
  ajustes: AJUSTES,
  kanjimon: KANJIMON,
  kanjidex: KANJIDEX,
  booster: BOOSTER,
  kanabeat: KANABEAT,
  roguelike: KOTODAMA,
  aventura: AVENTURA,
  conversa: CONVERSA,
  gramatica: KUMITATE,
  jornada: JORNADA,
  licao: LICAO,
  pecas: PECAS,
};

/** A tela usa a F1 para outra coisa (a Conversa traduz com ela). Ali a F1 não abre a ajuda. */
export function telaUsaF1(tela: TelaAjuda): boolean {
  return AJUDA[tela].teclas.some((l) => l.teclas.includes('F1'));
}

/** Teclas de um grupo como aparecem: números seguidos viram faixa ("1–4"). */
export function rotuloTeclas(teclas: readonly string[]): string[] {
  const nums = teclas.map((t) => (/^\d$/.test(t) ? Number(t) : NaN));
  const seguidos = teclas.length > 2 && nums.every((n, i) => !Number.isNaN(n) && (i === 0 || n === (nums[i - 1] as number) + 1));
  return seguidos ? [`${teclas[0]}–${teclas[teclas.length - 1]}`] : teclas.slice();
}
