/**
 * Conteúdo do Kanji em peças: kanji do N5 ao N3, as peças de cada um e as historinhas.
 *
 * Cada arquivo `nX.ts` tem uma linha por kanji, escrita à mão:
 *   kanji | peças | leitura | significados | palavra:leitura:tradução | historinha
 * - peças: os componentes, sem separador (休 = 亻木). Kanji que é desenho de uma coisa só
 *   (山, 木) tem ele mesmo como peça.
 * - leitura: a mais comum hoje, com a regra de `src/content/leituras.ts` (kanji que é palavra
 *   sozinho usa a palavra; kanji preso usa a on'yomi mais frequente). Para os 94 kanji que já
 *   estavam no arcade, ela é igual à de `leituras.ts` (um teste confere).
 * - significados separados por vírgula, o primeiro é o principal.
 *
 * `scripts/pecas-dados.py` confere as linhas contra os dados abertos (KanjiVG, KANJIDIC2,
 * JMdict) e gera `recorte.json` e `tracos.json`. O N2 já está no recorte: para jogar com ele,
 * crie `n2.ts` no mesmo formato e acrescente em `NIVEIS` abaixo.
 */
import { N1_PARES } from './n1';
import { N3A } from './n3a';
import { N3B } from './n3b';
import { N4 } from './n4';
import { N5 } from './n5';
import { PECAS } from './pecas';

export type Nivel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface Palavra {
  jp: string;
  kana: string;
  pt: string;
}

export interface KanjiPeca {
  /** Mesmo id dos outros jogos (`k:休`): a memória do kanji é uma só no arcade. */
  id: string;
  kanji: string;
  nivel: Nivel;
  /** Ordem de apresentação (0 = primeiro). */
  ordem: number;
  pecas: string[];
  leitura: string;
  pt: string[];
  palavra: Palavra;
  historia: string;
}

export interface Peca {
  peca: string;
  nome: string;
  imagem: string;
}

const NIVEIS: [Nivel, string][] = [
  ['N5', N5],
  ['N4', N4],
  ['N3', N3A],
  ['N3', N3B],
  ['N1', N1_PARES],
];

function linhas(texto: string): string[][] {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.split('|'));
}

function lerKanji(): KanjiPeca[] {
  const out: KanjiPeca[] = [];
  for (const [nivel, texto] of NIVEIS) {
    for (const campos of linhas(texto)) {
      const [kanji, pecas, leitura, pt, palavra, historia] = campos as [string, string, string, string, string, string];
      if (campos.length !== 6) throw new Error(`linha de kanji com ${campos.length} campos: ${campos.join('|')}`);
      const [jp, kana, ptPalavra] = palavra.split(':') as [string, string, string];
      out.push({
        id: `k:${kanji}`,
        kanji,
        nivel,
        ordem: out.length,
        pecas: [...pecas],
        leitura,
        pt: pt.split(',').map((s) => s.trim()),
        palavra: { jp, kana, pt: ptPalavra },
        historia,
      });
    }
  }
  return out;
}

function lerPecas(): Peca[] {
  return linhas(PECAS).map((c) => {
    if (c.length !== 3) throw new Error(`linha de peça com ${c.length} campos: ${c.join('|')}`);
    const [peca, nome, imagem] = c as [string, string, string];
    return { peca, nome, imagem };
  });
}

export const KANJI_PECAS: readonly KanjiPeca[] = lerKanji();
export const PECAS_LISTA: readonly Peca[] = lerPecas();

const porKanji = new Map(KANJI_PECAS.map((k) => [k.kanji, k]));
const porPeca = new Map(PECAS_LISTA.map((p) => [p.peca, p]));

export function kanjiPeca(kanji: string): KanjiPeca | undefined {
  return porKanji.get(kanji);
}

export function peca(p: string): Peca {
  const achou = porPeca.get(p);
  if (!achou) throw new Error(`peça sem nome: ${p}`);
  return achou;
}

/**
 * Kanji parecidos que se confundem. O modo "intruso" mostra um no meio de vários do outro.
 * Cada par tem a explicação da diferença, em poucas palavras.
 */
export const PARECIDOS: readonly { a: string; b: string; diferenca: string }[] = [
  { a: '未', b: '末', diferenca: '未: o traço de cima é o curto. 末: o de cima é o comprido, a ponta.' },
  { a: '土', b: '士', diferenca: '土: o chão (de baixo) é comprido. 士: o de cima é comprido.' },
  { a: '人', b: '入', diferenca: '人: o traço da direita apoia no da esquerda. 入: o da esquerda fica por cima.' },
  { a: '待', b: '持', diferenca: '待 anda (彳). 持 segura com a mão (扌).' },
  { a: '日', b: '目', diferenca: '日 tem um traço no meio. 目 tem dois e é mais alto.' },
  { a: '大', b: '犬', diferenca: '犬 tem a orelha (丶) em cima, à direita.' },
  { a: '大', b: '太', diferenca: '太 tem um pingo (丶) embaixo, entre as pernas.' },
  { a: '天', b: '夫', diferenca: '夫: o traço do meio sobe e passa por cima dos dois deitados. 天: não passa.' },
  { a: '王', b: '主', diferenca: '主 tem um pingo em cima, a chama da lamparina.' },
  { a: '右', b: '石', diferenca: '右: o traço inclinado cruza o deitado. 石: começa embaixo dele, sem cruzar.' },
  { a: '右', b: '左', diferenca: '右 tem boca (口). 左 tem régua (工).' },
  { a: '午', b: '牛', diferenca: '牛 tem o chifre: o traço do meio passa por cima.' },
  { a: '千', b: '午', diferenca: '午 tem dois traços deitados. 千 tem um.' },
  { a: '休', b: '体', diferenca: '体 tem um traço a mais embaixo da árvore: 本, origem.' },
  { a: '問', b: '間', diferenca: '問 tem boca (口) no portão. 間 tem sol (日).' },
  { a: '聞', b: '問', diferenca: '聞 tem orelha (耳) no portão. 問 tem boca (口).' },
  { a: '開', b: '閉', diferenca: '開 tem as duas mãos (开) abrindo. 閉 tem a trava (才).' },
  { a: '失', b: '夫', diferenca: '失 tem um traço inclinado em cima, à esquerda.' },
  { a: '待', b: '特', diferenca: '待 anda (彳). 特 tem o boi (牛).' },
  { a: '持', b: '特', diferenca: '持 tem a mão (扌). 特 tem o boi (牛).' },
  { a: '晴', b: '情', diferenca: '晴 tem sol (日). 情 tem coração (忄).' },
  { a: '精', b: '情', diferenca: '精 tem arroz (米). 情 tem coração (忄).' },
  { a: '作', b: '昨', diferenca: '作 tem pessoa (亻). 昨 tem sol (日).' },
  { a: '使', b: '便', diferenca: '使 tem boca (口) em cima. 便 tem sol (日) no meio.' },
  { a: '帰', b: '婦', diferenca: '帰 tem a faca (刂). 婦 tem a mulher (女).' },
  { a: '住', b: '注', diferenca: '住 tem pessoa (亻). 注 tem água (氵).' },
  { a: '語', b: '話', diferenca: '語 tem 吾 (eu). 話 tem 舌 (língua).' },
  { a: '読', b: '続', diferenca: '読 tem palavras (言). 続 tem fio (糸).' },
  { a: '白', b: '百', diferenca: '百 tem um traço deitado em cima.' },
  { a: '万', b: '方', diferenca: '方 tem um pingo em cima.' },
  { a: '申', b: '由', diferenca: '申: o traço do meio sai em cima e embaixo. 由 só sai em cima.' },
  { a: '入', b: '八', diferenca: '入: os traços se tocam. 八: ficam separados.' },
  { a: '自', b: '白', diferenca: '自 tem dois traços dentro e é mais alto.' },
  { a: '目', b: '自', diferenca: '自 tem um tracinho em cima.' },
  { a: '東', b: '車', diferenca: '東 tem pernas abertas embaixo. 車 é todo de traços retos.' },
  { a: '束', b: '東', diferenca: '束 tem boca (口) no meio. 東 tem sol (日).' },
  { a: '本', b: '木', diferenca: '本 tem um traço a mais na raiz.' },
  { a: '木', b: '未', diferenca: '未 tem dois traços deitados em cima.' },
  { a: '予', b: '子', diferenca: '予 tem uma ponta a mais em cima.' },
  { a: '毎', b: '母', diferenca: '毎 tem um grampo em cima do 母.' },
  { a: '米', b: '来', diferenca: '来 tem um traço deitado em cima e a cruz passa mais alto.' },
  { a: '晩', b: '勉', diferenca: '晩 tem sol (日). 勉 tem força (力).' },
  { a: '列', b: '例', diferenca: '例 tem pessoa (亻) na frente.' },
  { a: '遠', b: '園', diferenca: '遠 anda (⻌). 園 fica dentro da cerca (囗).' },
  { a: '部', b: '都', diferenca: '部 tem 立 (de pé). 都 tem 者 (pessoa).' },
  { a: '病', b: '疲', diferenca: '病 tem 丙 dentro. 疲 tem pele (皮).' },
  { a: '族', b: '旅', diferenca: '族 tem flecha (矢). 旅 tem duas pessoas.' },
  { a: '鳥', b: '馬', diferenca: '鳥 tem o olho e a cauda. 馬 tem a crina.' },
  { a: '学', b: '覚', diferenca: '学 tem criança (子). 覚 tem ver (見).' },
  { a: '兄', b: '元', diferenca: '兄 tem boca (口). 元 tem dois traços (二).' },
  { a: '工', b: '土', diferenca: '工: o traço de pé não passa por cima. 土: passa, formando uma cruz.' },
];
