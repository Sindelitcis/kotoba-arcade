/**
 * Conteúdo trazido da escola-japones, o outro projeto do mesmo autor (Sindelitcis).
 * Mesma autoria e mesma licença do resto do Kotoba Arcade.
 *
 * Texto japonês usa a marcação de `ruby.ts`: "{漢字|かんじ}" para kanji e espaço
 * entre palavras.
 */

export type Marcado = string;

export type Registro = 'casual' | 'polido' | 'formal';

export const NOME_REGISTRO: Record<Registro, string> = {
  casual: 'Casual: amigos e família',
  polido: 'Polido: padrão com adultos, no trabalho e com desconhecidos',
  formal: 'Formal/respeitoso: clientes, superiores, situações oficiais',
};

export interface Palavra {
  id: string;
  jp: Marcado;
  pt: string;
  tema: string;
  /** Pronúncia quando difere da escrita (ex.: こんにちは → こんにちわ). */
  pronuncia?: string;
  /** Forma de dicionário, para verbos apresentados na forma ます. */
  dicionario?: Marcado;
  /** Grupo do verbo: 1 (godan), 2 (ichidan), 3 (irregular). */
  grupoVerbo?: 1 | 2 | 3;
  nota?: string;
  /** IDs de palavras que se confundem (pares mínimos). */
  parecidas?: readonly string[];
}

export interface Expressao {
  id: string;
  jp: Marcado;
  pt: string;
  /** Situação de uso, descrita de forma literal. */
  quando: string;
  registro: Registro;
  pronuncia?: string;
  nota?: string;
}

export interface Kanji {
  id: string;
  char: string;
  significado: string;
  /** Leituras on'yomi em katakana. */
  on: readonly string[];
  /** Leituras kun'yomi em hiragana; o ponto separa o okurigana (た.べる). */
  kun: readonly string[];
  /** Como o kanji é formado ou uma imagem que ajuda a lembrar. */
  associacao: string;
  exemplos: readonly { jp: Marcado; pt: string }[];
}

interface ExercicioBase {
  id: string;
  /** Explicação mostrada depois da resposta, certa ou errada. */
  explicacao?: string;
}

/** Completar a lacuna (＿＿) da frase. */
export interface ExercicioLacuna extends ExercicioBase {
  tipo: 'lacuna';
  frase: Marcado;
  pt: string;
  resposta: Marcado;
  /** Alternativas erradas. Nunca incluir outra resposta gramaticalmente correta. */
  erradas: readonly Marcado[];
}

/** Pergunta em português com alternativas em japonês. */
export interface ExercicioEscolha extends ExercicioBase {
  tipo: 'escolha';
  pergunta: string;
  correta: Marcado;
  erradas: readonly Marcado[];
}

/** Frase em japonês com alternativas de significado em português. */
export interface ExercicioSignificado extends ExercicioBase {
  tipo: 'significado';
  frase: Marcado;
  correta: string;
  erradas: readonly string[];
}

/** Montar a frase na ordem. Só para frases com uma única ordem natural. */
export interface ExercicioOrdem extends ExercicioBase {
  tipo: 'ordem';
  pt: string;
  blocos: readonly Marcado[];
}

export type ExercicioEscrito = ExercicioLacuna | ExercicioEscolha | ExercicioSignificado | ExercicioOrdem;

export interface Exemplo {
  jp: Marcado;
  pt: string;
  nota?: string;
}

export interface Gramatica {
  id: string;
  titulo: string;
  /** A regra em uma frase. */
  regra: string;
  /** Padrões, ex.: "A は B です". */
  padroes: readonly string[];
  explicacao: readonly string[];
  exemplos: readonly Exemplo[];
  errosComuns: readonly string[];
  exercicios: readonly ExercicioEscrito[];
}

export interface Fala {
  quem: string;
  jp: Marcado;
  pt: string;
}

export interface Situacao {
  id: string;
  titulo: string;
  contexto: string;
  falas: readonly Fala[];
  notas: readonly string[];
  exercicios: readonly ExercicioEscrito[];
}

export interface Pagina {
  titulo: string;
  paragrafos: readonly string[];
  exemplos?: readonly Exemplo[];
}

/** Lição de leitura dos Fundamentos: páginas curtas e perguntas no fim. */
export interface Fundamento {
  id: string;
  titulo: string;
  paginas: readonly Pagina[];
  exercicios: readonly ExercicioEscrito[];
}
