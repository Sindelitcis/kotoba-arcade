/**
 * Módulo 0: kana e sons (docs/curso.md, "Níveis"). Onze lições antes do A1, com os mesmos kana,
 * desenhos e cartas do Kana em imagens (content/kana.ts). Cada lição é uma sequência de lotes
 * (3 a 6 kana): o kana é apresentado e depois treinado, ouvindo e lendo. O módulo é recomendado,
 * não obrigatório: quem já lê kana vai direto para o A1.
 *
 * A ordem é a dos lotes do Kana em imagens, com duas mudanças: os kana pequenos (っ, ゃ, ゅ, ょ e,
 * no katakana, o ー) vêm num lote só deles antes dos combinados, que são feitos com eles; e a vogal
 * longa ganha um cartão. O exemplo de cada kana é uma palavra do curso escrita só com kana que a
 * pessoa já viu (o do Kana em imagens, 朝 para あ, trazia kanji e kana ainda não vistos).
 *
 * Aqui só a lógica; a tela está em ModuloZero.tsx.
 */
import { palavrasDa, UNIDADES } from '../content/curso';
import { FRASES_FIXAS } from '../content/aprofundar/fichas';
import { itemNovoDe, type ItemNovo } from '../content/ensino';
import { KANA_IMAGENS, kanaDaPalavra, kanaItem, LOTES, type KanaItem } from '../content/kana';
import { shuffle, type Rng } from '../core/rng';

export interface LoteDoModulo {
  id: string;
  /** ids dos kana. */
  ids: readonly string[];
  /** Antes dos kana, o cartão da vogal longa. */
  longo?: true;
}

export interface LicaoKana {
  id: string;
  titulo: string;
  /** O que a lição explica antes dos kana (sons que o desenho não mostra). */
  intro: string;
  /** ids dos lotes (LOTES_DO_MODULO). */
  lotes: readonly string[];
}

const doKanaEmImagens = (id: string): LoteDoModulo => {
  const l = LOTES.find((x) => x.id === id);
  if (!l) throw new Error(`lote ${id} não existe`);
  return { id, ids: l.ids };
};
const dosChars = (id: string, chars: string, longo?: true): LoteDoModulo => ({ id, ids: kanaDaPalavra(chars).map((k) => k.id), ...(longo ? { longo } : {}) });
const serie = (pref: string, de: number, ate: number) => Array.from({ length: ate - de + 1 }, (_, i) => `${pref}${de + i}`);

/** Todos os lotes do módulo, na ordem (o progresso conta lotes feitos). */
export const LOTES_DO_MODULO: readonly LoteDoModulo[] = [
  ...serie('h', 1, 9).map(doKanaEmImagens),
  ...serie('hd', 1, 5).map(doKanaEmImagens),
  dosChars('hp', 'っゃゅょ', true),
  ...serie('hy', 1, 5).map(doKanaEmImagens),
  dosChars('hy6', 'ぴゃぴゅぴょ'),
  ...serie('k', 1, 9).map(doKanaEmImagens),
  ...serie('kd', 1, 5).map(doKanaEmImagens),
  dosChars('kp', 'ッャュョー'),
  ...serie('ky', 1, 5).map(doKanaEmImagens),
  dosChars('ky6', 'ピャピュピョ'),
  ...serie('ke', 1, 4).map(doKanaEmImagens),
];

export const LICOES_KANA: readonly LicaoKana[] = [
  {
    id: 'm0-1',
    titulo: 'Hiragana: as vogais e as linhas do K e do S',
    intro: 'O hiragana é a escrita básica do japonês. Cada letra é uma sílaba. Comece pelas cinco vogais, que soam como em português.',
    lotes: serie('h', 1, 3),
  },
  {
    id: 'm0-2',
    titulo: 'Hiragana: as linhas do T, N e H',
    intro: 'Atenção a três sons que não seguem a linha: し é shi, ち é chi e つ é tsu. O ふ fica entre o f e o h.',
    lotes: serie('h', 4, 6),
  },
  {
    id: 'm0-3',
    titulo: 'Hiragana: as linhas do M, Y, R, W e o ん',
    intro: 'O R japonês é um toque rápido da língua, como o r de "caro". O ん é o único som que é só consoante.',
    lotes: serie('h', 7, 9),
  },
  {
    id: 'm0-4',
    titulo: 'Hiragana: tenten e maru',
    intro: 'Dois tracinhos (tenten) deixam o som mais forte: か vira が, さ vira ざ. A bolinha (maru) faz o P: は vira ぱ. O desenho é o mesmo de antes, só com a marca.',
    lotes: serie('hd', 1, 5),
  },
  {
    id: 'm0-5',
    titulo: 'Hiragana: pequenos, combinados e sons longos',
    intro:
      'Primeiro os kana pequenos. O つ pequeno (っ) é uma pausa curta antes da consoante, como em きって. O や, ゆ e よ pequenos se juntam com a letra de antes: き e ゃ são きゃ, uma sílaba só. Depois, a vogal longa: ela dura o dobro, e muda o sentido da palavra.',
    lotes: ['hp', ...serie('hy', 1, 6)],
  },
  {
    id: 'm0-6',
    titulo: 'Katakana: as vogais e as linhas do K e do S',
    intro: 'O katakana tem os mesmos sons do hiragana, com outro desenho, mais reto. É usado nas palavras que vieram de fora, como コーヒー.',
    lotes: serie('k', 1, 3),
  },
  {
    id: 'm0-7',
    titulo: 'Katakana: as linhas do T, N e H',
    intro: 'Os mesmos sons do hiragana: シ é shi, チ é chi, ツ é tsu. Cuidado com シ e ツ, e com ソ e ン: o jeito do traço é que muda.',
    lotes: serie('k', 4, 6),
  },
  {
    id: 'm0-8',
    titulo: 'Katakana: as linhas do M, Y, R, W e o ン',
    intro: 'Fechando o katakana básico. O ヲ quase não aparece: ele existe, mas as palavras de fora não usam.',
    lotes: serie('k', 7, 9),
  },
  {
    id: 'm0-9',
    titulo: 'Katakana: tenten e maru',
    intro: 'As mesmas marcas do hiragana: カ vira ガ, ハ vira パ.',
    lotes: serie('kd', 1, 5),
  },
  {
    id: 'm0-10',
    titulo: 'Katakana: pequenos, combinados e o traço longo',
    intro: 'Os pequenos funcionam como no hiragana: ッ é a pausa, ャ, ュ e ョ se juntam com a letra de antes. No katakana, a vogal longa é um traço: ー, como em コーヒー.',
    lotes: ['kp', ...serie('ky', 1, 6)],
  },
  {
    id: 'm0-11',
    titulo: 'Katakana: sons de fora',
    intro: 'Para sons que o japonês não tinha, como fa e ti, usa-se uma vogal pequena depois: ファ, ティ.',
    lotes: serie('ke', 1, 4),
  },
];

/** A posição do lote no módulo. */
export const posicaoDoLote = (id: string): number => LOTES_DO_MODULO.findIndex((l) => l.id === id);

export const kanaDoLote = (lote: LoteDoModulo): KanaItem[] => lote.ids.map(kanaItem);

/** Os kana já apresentados até o lote (inclusive), na ordem do módulo. */
export function kanaAte(posicao: number): KanaItem[] {
  return LOTES_DO_MODULO.slice(0, posicao + 1).flatMap(kanaDoLote);
}

/* ───────── Exemplos e o cartão da vogal longa ───────── */

/**
 * As palavras dos exemplos: as do curso, na ordem em que ele as ensina, e depois os exemplos do Kana
 * em imagens escritos só em kana (o katakana do curso tem poucas palavras curtas). Todas têm voz.
 */
const PALAVRAS_DOS_EXEMPLOS: readonly { kana: string; pt: string }[] = [
  ...UNIDADES.flatMap((u) => palavrasDa(u)),
  ...KANA_IMAGENS.filter((k) => k.exemplo.jp === k.exemplo.kana).map((k) => k.exemplo),
];

/**
 * O exemplo do kana no Módulo 0: a palavra mais curta (a que vem antes, no empate) que tem
 * o kana e só usa kana já vistos. Escrita em kana: o kanji ainda não foi ensinado. Sem nenhuma, fica
 * sem exemplo (melhor que mostrar letra que a pessoa não conhece).
 */
export function exemploDoKana(k: KanaItem, vistos: readonly KanaItem[]): { jp: string; kana: string; pt: string } | undefined {
  const letras = new Set(vistos.flatMap((x) => [...x.char]));
  let melhor: { jp: string; kana: string; pt: string } | undefined;
  for (const p of PALAVRAS_DOS_EXEMPLOS) {
    const w = p.kana;
    if (!w.includes(k.char) || [...w].length < 2 || ![...w].every((c) => letras.has(c))) continue;
    if (!melhor || [...w].length < [...melhor.kana].length) melhor = { jp: w, kana: w, pt: p.pt };
  }
  return melhor;
}

/**
 * O cartão da vogal longa: o kana não mostra, mas o som dura o dobro e troca o sentido
 * (おばさん é tia; おばあさん, avó).
 */
export function cartaoDaVogalLonga(): ItemNovo {
  const fala = (kana: string) => ({ tipo: 'jp' as const, fala: { texto: kana, voz: 'palavra' as const, kana } });
  return {
    chaves: ['m0:vogal-longa'],
    alvo: { t: 'palavra', id: 'w:おばあさん' },
    tipo: 'Som longo',
    grande: 'おばあさん',
    pt: 'avó: o あ dura o dobro',
    explicacao:
      'A vogal longa dura o tempo de duas letras, e isso muda a palavra: おばさん é tia, おばあさん é avó; おじさん é tio, おじいさん é avô. No hiragana, o som longo se escreve com mais uma vogal. O お longo quase sempre vem escrito おう (ありがとう) e o え longo, えい (せんせい).',
    exemplo: { jp: 'おばさん', kana: 'おばさん', pt: 'tia: o あ é curto' },
    falas: [fala('おばあさん'), fala('おばさん'), fala('おじいさん'), fala('おじさん')],
  };
}

/**
 * Os cartões do lote: a vogal longa (no lote dela) e cada kana, com o exemplo trocado por uma
 * palavra só de kana já vistos. A fala do exemplo é a última do cartão (FRASES_FIXAS.exemplo e a
 * palavra): sai a antiga, entra a nova, ou nenhuma.
 */
export function itensDoLote(posicao: number): ItemNovo[] {
  const lote = LOTES_DO_MODULO[posicao];
  if (!lote) return [];
  const vistos = kanaAte(posicao);
  const kana = kanaDoLote(lote).flatMap((k: KanaItem): ItemNovo[] => {
    const item = itemNovoDe(k.carta);
    if (!item) return [];
    const ex = exemploDoKana(k, vistos);
    const n = item.falas.findIndex((t) => t.tipo === 'pt' && t.texto === FRASES_FIXAS.exemplo);
    const falas = n >= 0 ? item.falas.slice(0, n) : item.falas;
    return [
      {
        ...item,
        exemplo: ex,
        falas: ex ? [...falas, { tipo: 'pt', texto: FRASES_FIXAS.exemplo }, { tipo: 'jp', fala: { texto: ex.kana, voz: 'palavra', kana: ex.kana } }] : falas,
      },
    ];
  });
  return lote.longo ? [cartaoDaVogalLonga(), ...kana] : kana;
}

/* ───────── Progresso de quem fez o módulo na ordem antiga ───────── */

/**
 * Sobe quando a ordem dos lotes do módulo muda. 2: os pequenos antes dos combinados e as lições
 * menores. Antes, o módulo seguia os lotes do Kana em imagens um a um.
 */
export const VERSAO_DO_MODULO0 = 2;

/**
 * Quantos lotes da ordem nova a pessoa já fez, sabendo quantos fez na antiga: os primeiros lotes
 * cujos kana ela já viu. Pode rever um lote, nunca pular um kana.
 */
export function migrarModulo0(feitosNaOrdemAntiga: number): number {
  const vistos = new Set(LOTES.slice(0, feitosNaOrdemAntiga).flatMap((l) => l.ids));
  let n = 0;
  while (n < LOTES_DO_MODULO.length && (LOTES_DO_MODULO[n] as LoteDoModulo).ids.every((id) => vistos.has(id))) n++;
  return n;
}

/** Kana que soa sozinho (っ e ー não: a voz fala o exemplo, e a pergunta de ouvir não serve). */
const soaSozinho = (k: KanaItem) => k.fala === k.char;

export interface PerguntaKana {
  modo: 'ouvir' | 'ler';
  kana: KanaItem;
  /** Ouvir: os kana; ler: os romaji. */
  opcoes: string[];
  certa: string;
}

/**
 * O treino do lote: cada kana dele uma vez, ouvindo (escolhe o kana) ou lendo (escolhe o
 * romaji). As opções erradas só vêm de kana já apresentados no módulo, e nunca têm o mesmo som.
 */
export function perguntasDoLote(posicao: number, rng: Rng): PerguntaKana[] {
  const lote = LOTES_DO_MODULO[posicao];
  if (lote === undefined) return [];
  return perguntasDosKana(kanaDoLote(lote), kanaAte(posicao), rng);
}

/** "(pausa)", "(ya pequeno)": romaji que é descrição; entre as opções, só junto de outros iguais. */
const descrito = (k: KanaItem) => k.romaji.startsWith('(');

/** Uma pergunta para cada kana de `kanas`, com as opções erradas tiradas de `vistos`. */
export function perguntasDosKana(kanas: readonly KanaItem[], vistos: readonly KanaItem[], rng: Rng): PerguntaKana[] {
  return shuffle(rng, kanas).flatMap((k, i): PerguntaKana[] => {
    const modo = soaSozinho(k) && i % 2 === 0 ? 'ouvir' : 'ler';
    const outros = shuffle(
      rng,
      vistos.filter((x) => x.id !== k.id && x.romaji !== k.romaji && (modo === 'ler' ? descrito(x) === descrito(k) : soaSozinho(x))),
    );
    const vale = (x: KanaItem) => (modo === 'ouvir' ? x.char : x.romaji);
    const erradas = [...new Set(outros.map(vale))].slice(0, 3);
    if (erradas.length < 2) return [];
    return [{ modo, kana: k, opcoes: shuffle(rng, [vale(k), ...erradas]), certa: vale(k) }];
  });
}

/** Os kana que a pessoa já viu no módulo (os lotes feitos). */
export function kanaFeitos(feitos: number): KanaItem[] {
  return feitos > 0 ? kanaAte(Math.min(feitos, LOTES_DO_MODULO.length) - 1) : [];
}

/**
 * A lição de kana que o "Continuar" abre: a do próximo lote, enquanto o módulo não acabou e a
 * pessoa ainda não começou o A1 (quem já lê kana começa a unidade 1 e o módulo sai do caminho).
 */
export function licaoKanaPendente(save: { modulo0?: number; feitos: Readonly<Record<string, number>> }): LicaoKana | undefined {
  const feitos = save.modulo0 ?? 0;
  if (feitos >= LOTES_DO_MODULO.length || Object.keys(save.feitos).length > 0) return undefined;
  return licaoDaPosicao(feitos);
}

/** Em que lição está um lote do módulo. */
export function licaoDaPosicao(posicao: number): LicaoKana | undefined {
  const lote = LOTES_DO_MODULO[posicao];
  return LICOES_KANA.find((l) => lote !== undefined && l.lotes.includes(lote.id));
}

/** Onde a lição começa: o primeiro lote dela ainda não feito (ou o começo, se já foi toda feita). */
export function inicioDaLicao(licao: LicaoKana, feitos: number): number {
  const posicoes = licao.lotes.map(posicaoDoLote);
  return posicoes.find((p) => p >= feitos) ?? (posicoes[0] as number);
}
