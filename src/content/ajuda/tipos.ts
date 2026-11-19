/**
 * Formato do texto de ajuda de uma tela. Toda tela tem as mesmas seis seções,
 * na mesma ordem, para quem abre a ajuda saber onde achar cada coisa.
 */
import type { TelaAjuda } from '../../core/help/ajuda';

/**
 * Nome de tecla como aparece na tela. Letras em maiúscula ('D'), números ('1'),
 * e os nomes: Enter, Esc, Espaço, Backspace, Tab, F1, F2, F3, ↑, ↓.
 * Um teste confere que cada uma existe de verdade no código da tela.
 */
export type Tecla = string;

export interface LinhaTecla {
  teclas: Tecla[];
  faz: string;
}

export interface Item {
  nome: string;
  texto: string;
}

export interface Pergunta {
  p: string;
  r: string;
}

export interface Ajuda {
  tela: TelaAjuda;
  titulo: string;
  /** Nome em japonês, como no fliperama. */
  jp: string;
  /** Uma a três frases curtas. */
  objetivo: string[];
  /** Passo a passo, na ordem em que acontece. */
  passos: string[];
  teclas: LinhaTecla[];
  /** O que cada coisa da tela quer dizer. */
  elementos: Item[];
  /** Como aquilo ensina. */
  ensina: string[];
  perguntas: Pergunta[];
}

export const SECOES = [
  { id: 'objetivo', titulo: 'Objetivo' },
  { id: 'passos', titulo: 'Como jogar' },
  { id: 'teclas', titulo: 'Teclas' },
  { id: 'tela', titulo: 'O que tem na tela' },
  { id: 'ensina', titulo: 'Como isso ensina' },
  { id: 'perguntas', titulo: 'Perguntas comuns' },
] as const;
