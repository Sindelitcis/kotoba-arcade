/**
 * O currículo do curso (docs/curso.md). Cada unidade diz o que se consegue fazer ao final, o
 * vocabulário, os kanji com a leitura usada ali, a gramática e as notas culturais.
 * Nada é cobrado antes da unidade em que aparece (tests/curso.test.ts).
 */

export type Nivel = 'A1' | 'A2';

/**
 * Palavra da unidade, em uma linha: "como se escreve|leitura em kana|tradução" e, se precisar,
 * "|nota". Kanji que ainda não foi ensinado fica em kana até a unidade dele.
 */
export type PalavraLinha = string;

export interface Palavra {
  jp: string;
  kana: string;
  pt: string;
  nota?: string;
}

export interface KanjiDaUnidade {
  k: string;
  /** A leitura usada nesta unidade, em kana. */
  leitura: string;
  /** A palavra da unidade em que essa leitura aparece. */
  em: string;
  /**
   * Por que a leitura é outra da que já foi vista. Obrigatório quando o kanji já apareceu
   * antes com outra leitura: o aluno nunca vê a leitura mudar sem explicação.
   */
  muda?: string;
  /**
   * Kanji fora da lista do nível (N5 no A1; N5 e N4 no A2) que entra porque a palavra é do
   * dia a dia (駅, 会社...). Ensinado do mesmo jeito; só não conta na cobertura do nível.
   */
  extra?: true;
  /** O significado, só para kanji que não tem ficha no Aprofundar (as fichas vão do N5 ao N3). */
  significado?: string;
}

export interface Nota {
  titulo: string;
  texto: string;
  /** De onde vem a informação. Nota sem fonte não entra. */
  fontes: string[];
  /**
   * Conferida contra a fonte. Até lá a nota fica no currículo, mas a lição só usa notas
   * conferidas.
   */
  conferida: boolean;
}

export interface Unidade {
  id: string;
  nivel: Nivel;
  /** A posição dentro do nível (a unidade 1 do A2 é a 1). */
  numero: number;
  /** A posição no curso inteiro, contando os níveis em ordem (a unidade 1 do A2 é a 21). */
  ordem: number;
  titulo: string;
  /** "Consigo...": o que a pessoa faz ao final, no estilo can-do dos cursos de verdade. */
  consigo: string;
  gramatica: string[];
  kanji: KanjiDaUnidade[];
  palavras: PalavraLinha[];
  notas: Nota[];
  /** Unidade só de revisão, sem conteúdo novo. */
  revisao?: true;
}

/** A unidade como é escrita no arquivo do nível: a `ordem` é posta ao juntar os níveis. */
export type UnidadeEscrita = Omit<Unidade, 'ordem'>;
