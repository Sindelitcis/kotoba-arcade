/**
 * Legenda da voz em japonês: enquanto uma fala toca, o texto aparece embaixo da tela, com o
 * furigana (a voz japonesa às vezes come um som; lendo junto, a pessoa não perde nada). No
 * Módulo 0 (kana e sons) a legenda mostra também o romaji, porque o kana ainda é novo.
 */
import { signal } from '@preact/signals';
import { hasKanji, kanaToRomaji } from './kana';

export interface Legenda {
  texto: string;
  /** Leitura inteira em kana, quando quem toca sabe (a sequência sabe; a fala solta nem sempre). */
  kana?: string;
}

export const legenda = signal<Legenda | null>(null);

/** Romaji embaixo do kana: ligado pela tela do Módulo 0 enquanto ela está aberta. */
export const legendaComRomaji = signal(false);

/** O romaji da legenda, quando dá para saber a leitura inteira (kana dado ou texto sem kanji). */
export function romajiDaLegenda(l: Legenda): string | undefined {
  const kana = l.kana ?? (hasKanji(l.texto) ? undefined : l.texto);
  if (!kana) return undefined;
  return kanaToRomaji(kana.replace(/[。、？！?!.,「」\s]/gu, ' ').trim()).replace(/\s+/g, ' ');
}

/** Liga a legenda ao áudio: aparece quando ele começa a tocar e some quando ele para. */
export function legendar(a: HTMLAudioElement, texto: string, kana?: string): void {
  if (typeof a.addEventListener !== 'function') return;
  const esta: Legenda = kana && kana !== texto ? { texto, kana } : { texto };
  a.addEventListener('playing', () => {
    legenda.value = esta;
  });
  const sumir = () => {
    if (legenda.value === esta) legenda.value = null;
  };
  for (const ev of ['pause', 'ended', 'error', 'emptied', 'abort']) a.addEventListener(ev, sumir);
}
