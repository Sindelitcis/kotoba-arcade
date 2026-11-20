/**
 * Aulas do modo Ouvir: uma por lição da Jornada, para aprender sem olhar a tela. Cada
 * uma tem a explicação em português, o exemplo em japonês, a pausa para repetir e o
 * exemplo de novo, e fecha com uma revisão em que você responde antes de ouvir.
 */
import { EXPRESSOES, KANJI_ESCOLA, palavrasDoTema, type PalavraTema } from '../content/escola';
import type { Kanji as KanjiEscola } from '../content/escola/tipos';
import type { Trecho } from '../core/sequencia';
import { falaComKanji, falaDoKanji, GRUPOS_EXPRESSOES, LICOES, PALAVRAS_DA_LICAO } from '../jornada/licoes';
import { EXPRESSOES_FALADAS, GRUPO_FALADO } from './expressoes';
import { KANJI_FALADO } from './kanji';
import { embaralhar, ensinar, frase, ja, perguntar, pt, vocab, type Aula } from './montar';
import { GLOSSAS, TEMA_FALADO, type Glossa } from './palavras';
import { COMO_FUNCIONA, ROTEIROS } from './roteiros';

export type { Aula } from './montar';
export { duracao } from './montar';

const REVISAO = [
  'Agora sem ajuda. Eu falo em português e você responde em japonês, antes de ouvir a resposta.',
  'Revisão rápida. Responda em voz alta antes de ouvir.',
  'Agora é com você. Responda antes de mim.',
];

const FECHO = [
  'Pronto, acabou. Se der, escute de novo amanhã.',
  'Fim da aula. Uma por dia já faz diferença.',
  'É isso. Quando quiser, a próxima está esperando.',
  'Terminamos. Pode ouvir de novo quantas vezes quiser.',
];

const ensinoDe = (g: Glossa) => (typeof g === 'string' ? g : g.ensino);
const revisaoDe = (g: Glossa) => (typeof g === 'string' ? g : g.revisao);

function glossa(p: PalavraTema): Glossa {
  const g = GLOSSAS[p.palavra.id];
  if (!g) throw new Error(`palavra sem fala na aula: ${p.palavra.id}`);
  return g;
}

/** Ensina as palavras e depois revisa, fora de ordem. */
function aulaDePalavras(abertura: readonly Trecho[], palavras: readonly PalavraTema[], n: number): Trecho[] {
  return [
    ...abertura,
    ...palavras.flatMap((p) => ensinar(ensinoDe(glossa(p)), vocab(p.palavra.id))),
    pt(REVISAO[n % REVISAO.length] as string),
    ...embaralhar(palavras).flatMap((p) => perguntar(revisaoDe(glossa(p)), vocab(p.palavra.id))),
  ];
}

const expressaoPorId = new Map(EXPRESSOES.map((e) => [e.id, e]));

function aulaDeExpressoes(grupo: (typeof GRUPOS_EXPRESSOES)[number], n: number): Trecho[] {
  const itens = grupo.ids.map((id) => {
    const e = expressaoPorId.get(id);
    const f = EXPRESSOES_FALADAS[id];
    if (!e || !f) throw new Error(`expressão sem fala na aula: ${id}`);
    return { e, f };
  });
  const abertura = GRUPO_FALADO[grupo.id];
  if (!abertura) throw new Error(`grupo de expressões sem abertura: ${grupo.id}`);
  return [
    pt(abertura),
    ...itens.flatMap(({ e, f }) => ensinar(f.ensino, frase(e.jp))),
    pt(REVISAO[n % REVISAO.length] as string),
    ...embaralhar(itens).flatMap(({ e, f }) => perguntar(f.revisao, frase(e.jp))),
  ];
}

const kanjiPorChar = new Map(KANJI_ESCOLA.map((k) => [k.char, k]));

function aulaDeKanji(grupo: readonly KanjiEscola[], n: number): Trecho[] {
  const falado = (k: KanjiEscola) => {
    const f = KANJI_FALADO[k.char];
    if (!f) throw new Error(`kanji sem fala na aula: ${k.char}`);
    return f;
  };
  return [
    pt(n === 0 ? 'Kanji de ouvido. Em cada um você ouve o sentido, depois como ele se lê sozinho e, às vezes, uma palavra que usa ele.' : 'Mais seis kanji, do mesmo jeito: o sentido, a leitura e uma palavra.'),
    ...grupo.flatMap((k) => {
      const f = falado(k);
      const ex = f.exemplo ? k.exemplos[f.exemplo.indice] : undefined;
      if (f.exemplo && !ex) throw new Error(`exemplo que não existe: ${k.char} ${f.exemplo.indice}`);
      return [...ensinar(f.sentido, ja(falaDoKanji(k))), ...(f.exemplo && ex ? ensinar(f.exemplo.pt, ja(falaComKanji(ex.jp))) : [])];
    }),
    pt(REVISAO[n % REVISAO.length] as string),
    ...embaralhar(grupo).flatMap((k) => perguntar(falado(k).sentido, ja(falaDoKanji(k)))),
  ];
}

function trechosDa(id: string, n: number): Trecho[] {
  const roteiro = ROTEIROS[id];
  if (id === 'sons') return aulaDePalavras(roteiro ?? [], palavrasDoTema('sons'), n);
  if (roteiro) return roteiro;
  if (id.startsWith('expr:')) {
    const g = GRUPOS_EXPRESSOES.find((x) => `expr:${x.id}` === id);
    if (g) return aulaDeExpressoes(g, n);
  }
  if (id.startsWith('kanji:')) {
    const i = Number(id.slice('kanji:'.length)) - 1;
    const grupo = KANJI_ESCOLA.slice(i * 6, i * 6 + 6);
    if (grupo.length > 0 && grupo.every((k) => kanjiPorChar.has(k.char))) return aulaDeKanji(grupo, i);
  }
  const palavras = PALAVRAS_DA_LICAO.get(id);
  if (palavras) {
    const [, tema, parte] = id.split(':') as [string, string, string];
    const t = TEMA_FALADO[tema];
    if (!t) throw new Error(`tema sem abertura falada: ${tema}`);
    return aulaDePalavras([pt(parte === '1' ? t.primeira : t.seguinte)], palavras, n);
  }
  throw new Error(`lição sem aula falada: ${id}`);
}

export const AULAS: readonly Aula[] = [
  { id: 'ouvir:como', titulo: 'Como funciona o modo Ouvir', trechos: COMO_FUNCIONA },
  ...LICOES.map((l, n) => ({ id: l.id, titulo: l.titulo, trechos: [...trechosDa(l.id, n), pt(FECHO[n % FECHO.length] as string)] })),
];

const porId = new Map(AULAS.map((a) => [a.id, a]));

export function acharAula(id: string): Aula | undefined {
  return porId.get(id);
}

/** Todo português das aulas, sem repetição: é o que o gravador grava. */
export function textosPtDasAulas(): string[] {
  return [...new Set(AULAS.flatMap((a) => a.trechos.flatMap((t) => (t.tipo === 'pt' ? [t.texto] : []))))];
}
