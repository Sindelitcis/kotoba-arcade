/**
 * Módulo 0: kana e sons (docs/curso.md, "Níveis"). Seis lições antes do A1, com os mesmos kana,
 * desenhos e cartas do Kana em imagens (content/kana.ts). Cada lição é uma sequência de lotes
 * (3 a 6 kana): o kana é apresentado e depois treinado, ouvindo e lendo. O módulo é recomendado,
 * não obrigatório: quem já lê kana vai direto para o A1.
 *
 * Aqui só a lógica; a tela está em ModuloZero.tsx.
 */
import { kanaItem, LOTES, type KanaItem } from '../content/kana';
import { shuffle, type Rng } from '../core/rng';

export interface LicaoKana {
  id: string;
  titulo: string;
  /** O que a lição explica antes dos kana (sons que o desenho não mostra). */
  intro: string;
  /** Índices em LOTES. */
  lotes: number[];
}

const indices = (prefixo: string) => LOTES.flatMap((l, i) => (l.id.replace(/\d+$/, '') === prefixo ? [i] : []));

export const LICOES_KANA: readonly LicaoKana[] = [
  {
    id: 'm0-1',
    titulo: 'Hiragana: as vogais e as linhas do K e do S',
    intro: 'O hiragana é a escrita básica do japonês. Cada letra é uma sílaba. Comece pelas cinco vogais, que soam como em português.',
    lotes: indices('h').slice(0, 3),
  },
  {
    id: 'm0-2',
    titulo: 'Hiragana: as linhas do T, N e H',
    intro: 'Atenção a três sons que não seguem a linha: し é shi, ち é chi e つ é tsu. O ふ fica entre o f e o h.',
    lotes: indices('h').slice(3, 6),
  },
  {
    id: 'm0-3',
    titulo: 'Hiragana: as linhas do M, Y, R, W e o ん',
    intro: 'O R japonês é um toque rápido da língua, como o r de "caro". O ん é o único som que é só consoante.',
    lotes: indices('h').slice(6, 9),
  },
  {
    id: 'm0-4',
    titulo: 'Tenten, maru, sons combinados e sons longos',
    intro:
      'Dois tracinhos (tenten) deixam o som mais forte: か vira が. A bolinha (maru) faz o P: は vira ぱ. Um や, ゆ ou よ pequeno junta com a letra de antes: き e や pequeno são きゃ. O つ pequeno (っ) é uma pausa curta antes da consoante, como em きって. A vogal longa dura o dobro: おかあさん tem o あ esticado.',
    lotes: [...indices('hd'), ...indices('hy')],
  },
  {
    id: 'm0-5',
    titulo: 'Katakana básico',
    intro: 'O katakana tem os mesmos sons do hiragana, com outro desenho. É usado nas palavras que vieram de fora, como コーヒー.',
    lotes: indices('k').slice(0, 9),
  },
  {
    id: 'm0-6',
    titulo: 'Katakana: tenten, combinados e sons de fora',
    intro: 'No katakana, a vogal longa é um traço: ー. Para sons que o japonês não tinha, como fa e ti, usa-se uma vogal pequena: ファ, ティ.',
    lotes: [...indices('kd'), ...indices('ky'), ...indices('ke')],
  },
];

/** Todos os lotes do módulo, na ordem (o progresso conta lotes feitos). */
export const LOTES_DO_MODULO: readonly number[] = LICOES_KANA.flatMap((l) => l.lotes);

export const kanaDoLote = (lote: number): KanaItem[] => (LOTES[lote]?.ids ?? []).map(kanaItem);

/** Os kana já apresentados até o lote (inclusive), na ordem do módulo. */
export function kanaAte(posicao: number): KanaItem[] {
  return LOTES_DO_MODULO.slice(0, posicao + 1).flatMap(kanaDoLote);
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
  return LICOES_KANA.find((l) => lote !== undefined && l.lotes.includes(lote));
}

/** Onde a lição começa: o primeiro lote dela ainda não feito (ou o começo, se já foi toda feita). */
export function inicioDaLicao(licao: LicaoKana, feitos: number): number {
  const posicoes = licao.lotes.map((l) => LOTES_DO_MODULO.indexOf(l));
  return posicoes.find((p) => p >= feitos) ?? (posicoes[0] as number);
}
