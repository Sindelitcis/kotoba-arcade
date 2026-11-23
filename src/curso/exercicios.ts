/**
 * Completar e ditado, a partir dos exemplos de gramática (exemplos.ts):
 * - completar: a frase com uma peça de gramática (partícula, です...) apagada e quatro opções;
 * - ditado: a frase só no áudio; a pessoa escreve em kana (no site, digitando em romaji).
 *
 * As opções erradas só usam o que já foi apresentado até a unidade, e nunca uma peça que também
 * caberia ali (は, が e も, por exemplo, se trocam em muitas frases). A tradução aparece junto e
 * desfaz o resto (電車で行きます é ir de trem; 電車が行きます, o trem que vai).
 */
import { UNIDADES, type Unidade } from '../content/curso';
import { GRAMATICA_EM_KANA } from '../content/curso/exemplos';
import { kataToHira } from '../core/kana';
import { shuffle, type Rng } from '../core/rng';
import { exemplosDaUnidade, type Exemplo, type Peca } from './exemplos';

/** Peças que se trocam sem a frase ficar errada (ou quase): uma nunca é opção errada da outra. */
const PARECIDAS: readonly (readonly string[])[] = [
  // を também vira は (コーヒーは飲みます: o café, eu tomo).
  ['は', 'が', 'も', 'を'],
  ['に', 'へ'],
  ['と', 'や'],
  // O fim da frase: おいしいです e おいしいね estão os dois certos.
  ['か', 'よ', 'ね', 'です', 'でした', 'じゃありません', 'だ', 'かな'],
  // Razão: 安いので e 安いし cabem os dois em muitas frases.
  ['ので', 'し'],
  // Suposição: o sentido muda pouco, e a frase fica certa com qualquer uma.
  ['かもしれません', 'でしょう', 'はず'],
  ['ようです', 'みたい', 'そうです', 'らしい'],
  // 東京より大きくない e 東京ほど大きくない estão os dois certos.
  ['より', 'ほど'],
  ['ため', 'ように'],
  ['という', 'って'],
  ['とき', 'あいだ', 'うちに'],
];

/** Opção errada que ficaria certa no lugar: の no fim (安いの。) e よ, ね no meio (あしたね、). */
function cabeAli(x: string, noFim: boolean): boolean {
  if (noFim) return x === 'の';
  return x === 'よ' || x === 'ね';
}

/** Peças que não viram lacuna: a vírgula e o さん (não é o que a unidade ensina). */
const NAO_APAGA = new Set(['、', 'さん']);

const grupoDe = (t: string): readonly string[] => PARECIDAS.find((g) => g.includes(t)) ?? [t];

/** As peças de gramática já apresentadas até a unidade (estão em algum exemplo dela ou de antes). */
const jaVistas = new Map<number, ReadonlySet<string>>();

export function gramaticaAte(ordem: number): ReadonlySet<string> {
  const pronta = jaVistas.get(ordem);
  if (pronta) return pronta;
  const s = new Set<string>();
  for (const u of UNIDADES) if (u.ordem <= ordem) for (const e of exemplosDaUnidade(u)) for (const p of e.pecas) if (GRAMATICA_EM_KANA.has(p.t) && !NAO_APAGA.has(p.t)) s.add(p.t);
  jaVistas.set(ordem, s);
  return s;
}

export interface Lacuna {
  exemplo: Exemplo;
  antes: Peca[];
  resposta: Peca;
  depois: Peca[];
  /** As quatro opções (ou menos, se ainda não há tantas), já embaralhadas; a certa entre elas. */
  opcoes: string[];
}

/** A frase com uma lacuna. `null` se ela não tem peça de gramática que dê para apagar. */
export function lacunaDo(e: Exemplo, rng: Rng, conhecidas = gramaticaAte(e.unidade.ordem)): Lacuna | null {
  const candidatas = e.pecas.map((p, i) => ({ p, i })).filter(({ p }) => GRAMATICA_EM_KANA.has(p.t) && !NAO_APAGA.has(p.t));
  for (const { p, i } of shuffle(rng, candidatas)) {
    const grupo = grupoDe(p.t);
    const noFim = i === e.pecas.length - 1;
    const erradas = shuffle(rng, [...conhecidas].filter((x) => !grupo.includes(x) && !cabeAli(x, noFim) && !e.pecas.some((q) => q.t === x))).slice(0, 3);
    if (erradas.length < 2) continue;
    return { exemplo: e, antes: e.pecas.slice(0, i), resposta: p, depois: e.pecas.slice(i + 1), opcoes: shuffle(rng, [p.t, ...erradas]) };
  }
  return null;
}

/** As lacunas da unidade: uma por exemplo que tenha peça para apagar, no máximo `max`. */
export function lacunasDa(u: Unidade, rng: Rng, max = 6): Lacuna[] {
  const conhecidas = gramaticaAte(u.ordem);
  return exemplosDaUnidade(u)
    .map((e) => lacunaDo(e, rng, conhecidas))
    .filter((l): l is Lacuna => l !== null)
    .slice(0, max);
}

/** As frases do ditado: as mais curtas da unidade (ditado longo cansa e não ensina mais). */
export function ditadoDa(u: Unidade, max = 3): Exemplo[] {
  return [...exemplosDaUnidade(u)].sort((a, b) => a.kana.length - b.kana.length || a.jp.localeCompare(b.jp)).slice(0, max);
}

/** Só o som: sem pontuação nem espaço, katakana como hiragana, を como お. */
const soSom = (s: string) => kataToHira(s).replace(/[\s、。，．,.？?！!「」・]/gu, '').replace(/を/g, 'お');

/** O que a pessoa pode escrever: como se escreve (は, へ) ou como se fala (わ, え). */
export function respostasDoDitado(e: Exemplo): string[] {
  const escrita = soSom(e.kana);
  const falada = soSom(e.pecas.map((p) => (p.t === 'は' ? 'わ' : p.t === 'へ' ? 'え' : p.kana)).join(''));
  return escrita === falada ? [escrita] : [escrita, falada];
}

export function confereDitado(digitado: string, e: Exemplo): boolean {
  const d = soSom(digitado);
  return d.length > 0 && respostasDoDitado(e).includes(d);
}
