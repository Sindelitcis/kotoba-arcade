/**
 * Acento do japonês (alto e baixo, não força). O número da Kanjium diz depois de qual mora
 * a voz cai: 0 = não cai (heiban), 1 = cai depois da primeira, e assim por diante.
 * Dados: Kanjium, de Uros O. (CC BY-SA 4.0), recortados por `scripts/gerar-acentos.mjs`.
 */
import ACENTOS from './acentos.json';

const TABELA = ACENTOS as unknown as Readonly<Record<string, readonly number[]>>;

/** Kana pequeno que gruda no anterior e não conta mora sozinho (きゃ é uma mora). */
const GRUDA = new Set([...'ゃゅょぁぃぅぇぉャュョァィゥェォ']);

/** Divide em moras: きょう → きょ・う; がっこう → が・っ・こ・う. */
export function moras(kana: string): string[] {
  const out: string[] = [];
  for (const c of kana) {
    if (GRUDA.has(c) && out.length > 0) out[out.length - 1] += c;
    else out.push(c);
  }
  return out;
}

/** Acentos conhecidos da palavra, o mais comum primeiro. Vazio quando a Kanjium não tem. */
export function acentosDe(jp: string, kana: string): readonly number[] {
  return TABELA[`${jp}|${kana}`] ?? [];
}

/**
 * Alto (true) ou baixo de cada mora, mais a partícula que vem depois (a última posição):
 * em heiban ela continua alta; nas outras, cai.
 */
export function desenho(nMoras: number, acento: number): boolean[] {
  const out: boolean[] = [];
  for (let i = 1; i <= nMoras + 1; i++) {
    if (acento === 0) out.push(i > 1);
    else if (acento === 1) out.push(i === 1);
    else out.push(i > 1 && i <= acento);
  }
  return out;
}

export const NOME_ACENTO = (nMoras: number, acento: number): string => {
  if (acento === 0) return 'reto (heiban): sobe depois da primeira mora e fica lá em cima, até na partícula';
  if (acento === 1) return 'cai depois da primeira (atamadaka): começa alto e desce';
  if (acento === nMoras) return 'cai no fim (odaka): sobe e só desce na partícula que vem depois';
  return `cai depois da ${acento}ª mora (nakadaka): sobe, e desce no meio`;
};
