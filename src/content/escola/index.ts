/**
 * Ponte entre o conteúdo da escola-japones e o do arcade.
 *
 * - As palavras por tema viram `Word`, com a mesma chave de carta dos outros jogos
 *   (`w:<como se escreve>`). Palavra que o arcade já tinha (em `WORDS` ou `DAILY_WORDS`)
 *   não ganha cópia: o tema aponta para a que já existe.
 * - Verbos entram pela forma de dicionário (飲む), como no resto do arcade; a forma
 *   ます fica guardada para as lições.
 * - Os kanji que o KanjiMon não tem ganham leitura conferida à mão, no mesmo modelo
 *   de `leituras.ts`.
 */
import { KANJI, WORDS, type Word } from '../index';
import { DAILY_WORDS } from '../vida';
import { kanaToRomaji } from '../../core/kana';
import type { LeituraKanji } from '../leituras';
import { EXPRESSOES } from './expressoes';
import { FUNDAMENTOS } from './fundamentos';
import { GRAMATICA } from './gramatica';
import { KANJI as KANJI_ESCOLA } from './kanji';
import { PALAVRAS, TEMAS } from './palavras';
import { leituraContinua, textoSimples } from './ruby';
import { SITUACOES } from './situacoes';
import type { Palavra } from './tipos';

export { EXPRESSOES, FUNDAMENTOS, GRAMATICA, KANJI_ESCOLA, PALAVRAS, SITUACOES, TEMAS };

/** Palavra da escola como `Word` do arcade, mais o que só as lições usam. */
export interface PalavraTema {
  /** Id na escola-japones (v-mizu). */
  origem: string;
  /** A carta dos jogos. Falta só na palavra que fica de fora dos jogos (ver `SO_NA_LICAO`). */
  word?: Word;
  palavra: Palavra;
}

const conhecidos = new Set(KANJI.map((k) => k.kanji));
const doArcade = new Map<string, Word>([...WORDS, ...DAILY_WORDS].map((w) => [w.id, w]));

function comoWord(p: Palavra): Word {
  const forma = p.dicionario ?? p.jp;
  const jp = textoSimples(forma);
  const kana = leituraContinua(forma);
  return { id: `w:${jp}`, jp, kana, romaji: kanaToRomaji(kana), pt: p.pt, kanji: [...jp].filter((c) => conhecidos.has(c)) };
}

/** A escola escreve 子ども; o arcade já tinha a mesma palavra como 子供. */
const MESMA_PALAVRA: Readonly<Record<string, string>> = { 'v-kodomo': 'w:子供' };

/**
 * Palavras que só aparecem na lição, sem carta nos jogos. O jogo acha o áudio da
 * palavra pelo kana, e いる (estar) tem o mesmo kana de 要る (precisar), que o
 * arcade já tinha. います continua na lição de vocabulário e na de gramática.
 */
export const SO_NA_LICAO: ReadonlySet<string> = new Set(['v-imasu']);

/** Todas as palavras por tema, já ligadas à `Word` do arcade (nova ou a que já existia). */
export const PALAVRAS_TEMA: readonly PalavraTema[] = PALAVRAS.map((palavra) => {
  if (SO_NA_LICAO.has(palavra.id)) return { origem: palavra.id, palavra };
  const nova = comoWord(palavra);
  const alias = MESMA_PALAVRA[palavra.id];
  const word = (alias ? doArcade.get(alias) : undefined) ?? doArcade.get(nova.id) ?? nova;
  return { origem: palavra.id, palavra, word };
});

/** Só as palavras que o arcade ainda não tinha. */
export const JORNADA_WORDS: readonly Word[] = (() => {
  const vistas = new Set<string>();
  const out: Word[] = [];
  for (const { word } of PALAVRAS_TEMA) {
    if (!word || doArcade.has(word.id) || vistas.has(word.id)) continue;
    vistas.add(word.id);
    out.push(word);
  }
  return out;
})();

const todas = new Map<string, Word>([...doArcade.values(), ...JORNADA_WORDS].map((w) => [w.id, w]));

/** Procura uma palavra em todo o conteúdo: KanjiMon, dia a dia e temas da escola. */
export function acharPalavra(id: string): Word | undefined {
  return todas.get(id);
}

export function palavrasDoTema(tema: string): PalavraTema[] {
  return PALAVRAS_TEMA.filter((p) => p.palavra.tema === tema);
}

/**
 * Leitura dos kanji da escola que o KanjiMon não tem, no modelo de `leituras.ts`:
 * `sozinho` é como um japonês diria o kanji isolado; quando ele quase não aparece
 * sozinho, vale a leitura mais frequente nas palavras do dia a dia.
 */
export const LEITURAS_NOVAS: Readonly<Record<string, LeituraKanji>> = {
  // 自分, 半分, 十分, 気分: ぶん é a leitura mais comum. Minutos (五分) mudam para ふん/ぷん.
  分: { sozinho: 'ぶん', outras: ['ふん', 'ぷん', 'わ'] },
  // 先 sozinho é palavra: さき (à frente, antes). 先生 e 先週 usam せん.
  先: { sozinho: 'さき', outras: ['せん'] },
  // 会 sozinho é かい (encontro, reunião); 会う usa あ.
  会: { sozinho: 'かい', outras: ['あ'] },
  // 社 quase não aparece sozinho; em 会社 e 社長 é しゃ, em 神社 vira じゃ.
  社: { sozinho: 'しゃ', outras: ['じゃ', 'やしろ'] },
  // 午 só aparece em 午前, 午後: ご.
  午: { sozinho: 'ご', outras: [] },
};

/** Kanji da escola que o KanjiMon não tem: entram nas lições em quadrinhos da Jornada. */
export const KANJI_NOVOS = KANJI_ESCOLA.filter((k) => !conhecidos.has(k.char));
