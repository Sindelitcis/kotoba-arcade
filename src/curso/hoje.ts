/**
 * O que o "Continuar o curso" faz hoje, nesta ordem:
 *
 * 1. a revisão de hoje, quando há o que rever: os kana do Módulo 0 e as palavras e os kanji das
 *    unidades já começadas que venceram na memória. É curta (um teto de kana e de itens) e não
 *    mostra contador de atrasadas: quem volta depois de dias recebe o que mais vale rever, não uma
 *    pilha (a mesma regra do core/picker.ts);
 * 2. a próxima lição do Módulo 0, enquanto ele não acabou e o A1 não começou;
 * 3. a próxima parte do curso (motor.ts, proximaLicao).
 *
 * Sem isso, o Enter levava o aluno do zero direto à unidade 1, sem kana, e a repetição espaçada
 * só acontecia se ele fosse a um jogo por conta própria.
 */
import type { KanaItem } from '../content/kana';
import { UNIDADES } from '../content/curso';
import { foiApresentado } from '../core/ensino';
import { isDue, retrievability, type CardState } from '../core/srs';
import { kanaFeitos, licaoKanaPendente, type LicaoKana } from './modulo0';
import { itensAte, proximaLicao, type CursoSave, type ItemPratica, type Lugar } from './motor';

/** Teto da revisão de hoje: uns poucos minutos, nunca uma pilha. */
export const KANA_DE_HOJE = 6;
export const ITENS_DE_HOJE = 10;

export interface RevisaoDeHoje {
  kana: KanaItem[];
  itens: ItemPratica[];
}

type Cards = Readonly<Record<string, CardState>>;

/** O que venceu, do mais esquecido para o menos, até o teto. */
function vencidos<T>(xs: readonly T[], carta: (x: T) => string, cards: Cards, now: number, teto: number): T[] {
  return xs
    .filter((x) => {
      const c = cards[carta(x)];
      return !!c && foiApresentado(cards, carta(x)) && isDue(c, now);
    })
    .sort((a, b) => retrievability(cards[carta(a)], now) - retrievability(cards[carta(b)], now))
    .slice(0, teto);
}

/** A unidade mais adiantada que a pessoa já começou (0 se nenhuma). */
export function ateOndeFoi(save: CursoSave): number {
  let ate = 0;
  for (const u of UNIDADES) if ((save.feitos[u.id] ?? 0) > 0 || (save.concluidas[u.id] ?? 0) > 0) ate = Math.max(ate, u.ordem);
  return ate;
}

export function revisaoDeHoje(save: CursoSave, cards: Cards, now: number): RevisaoDeHoje {
  const ate = ateOndeFoi(save);
  return {
    kana: vencidos(kanaFeitos(save.modulo0 ?? 0), (k) => k.carta, cards, now, KANA_DE_HOJE),
    itens: ate > 0 ? vencidos(itensAte(ate), (i) => i.carta, cards, now, ITENS_DE_HOJE) : [],
  };
}

export type Passo = { tipo: 'revisao'; revisao: RevisaoDeHoje } | { tipo: 'kana'; licao: LicaoKana } | { tipo: 'unidade'; lugar: Lugar } | null;

export function proximoPasso(save: CursoSave, cards: Cards, now: number): Passo {
  const revisao = revisaoDeHoje(save, cards, now);
  if (revisao.kana.length > 0 || revisao.itens.length > 0) return { tipo: 'revisao', revisao };
  const licao = licaoKanaPendente(save);
  if (licao) return { tipo: 'kana', licao };
  const lugar = proximaLicao(save);
  return lugar ? { tipo: 'unidade', lugar } : null;
}
