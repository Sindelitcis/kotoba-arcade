/**
 * As formas dos verbos e dos adjetivos do curso: a tabela do cartão de gramática ("como se forma")
 * e o exercício de transformar (食べる → 食べます). Tudo sai do vocabulário já ensinado até a
 * unidade do ponto: a tabela nunca mostra verbo que a pessoa ainda não viu.
 *
 * Os verbos e os adjetivos das tabelas são uma lista conferida à mão, com o grupo escrito (deduzir
 * pelo português errava: "açúcar" parecia verbo, e o いる da lista é 要る, do grupo 1).
 */
import type { Unidade } from '../content/curso';
import { shuffle, type Rng } from '../core/rng';
import { unidadeDoPonto, vocabularioAte } from './exemplos';

export type Grupo = 'godan' | 'ichidan' | 'kuru' | 'suru';
export type Tipo = Grupo | 'adj-i' | 'adj-na';

/** O nome da forma, como aparece na coluna da tabela. */
export const FORMAS = {
  dic: 'dicionário',
  masu: 'ます',
  masen: 'ません',
  mashita: 'ました',
  masendeshita: 'ませんでした',
  masenka: 'ませんか',
  mashou: 'ましょう',
  tai: 'たい',
  te: 'て',
  teimasu: 'ています',
  nai: 'ない',
  ta: 'た',
  ikou: 'よう (vamos)',
  kanou: 'potencial',
  ba: 'ば',
  tara: 'たら',
  temo: 'ても',
  tari: 'たり',
  nakereba: 'なければ',
  ukemi: 'passiva',
  shieki: 'causativa',
  'shieki-ukemi': 'causativa passiva',
  meirei: 'ordem',
  adj: 'é',
  'adj-nai': 'não é',
  'adj-ta': 'foi',
  'adj-nakatta': 'não foi',
  'adj-naru': 'ficar',
} as const;
export type Forma = keyof typeof FORMAS;

export const NOME_DO_TIPO: Readonly<Record<Tipo, string>> = {
  ichidan: 'grupo 2',
  godan: 'grupo 1',
  suru: 'irregular',
  kuru: 'irregular',
  'adj-i': 'adjetivo い',
  'adj-na': 'adjetivo な',
};

/**
 * As palavras das tabelas, na ordem de preferência. Cada linha é a palavra em kana e, quando o
 * curso passa a escrever com kanji, a forma com kanji: a tabela usa a mais recente já ensinada.
 */
const PALAVRAS: readonly (readonly [Tipo, ...string[]])[] = [
  ['ichidan', '食べる'],
  ['godan', '飲む'],
  ['suru', 'する'],
  ['kuru', '来る'],
  ['godan', 'かう', '買う'],
  ['ichidan', '見る'],
  ['godan', '書く'],
  ['godan', '行く'],
  ['godan', '話す'],
  ['godan', 'まつ', '待つ'],
  ['godan', 'かえる', '帰る'],
  ['ichidan', 'おきる', '起きる'],
  ['godan', '読む'],
  ['godan', '聞く'],
  ['godan', '会う'],
  ['godan', 'あそぶ'],
  ['godan', 'およぐ'],
  ['godan', 'しぬ'],
  ['ichidan', 'ねる'],
  ['ichidan', '出る'],
  ['ichidan', 'おしえる', '教える'],
  ['ichidan', 'わすれる'],
  ['godan', 'うる', '売る'],
  ['godan', '休む'],
  ['godan', 'はたらく'],
  ['suru', 'べんきょうする'],
  ['adj-i', '高い'],
  ['adj-i', '大きい'],
  ['adj-i', 'おいしい'],
  ['adj-i', 'いい'],
  ['adj-i', 'むずかしい'],
  ['adj-na', 'きれい'],
  ['adj-na', 'しずか'],
  ['adj-na', 'ゆうめい', '有名'],
  ['adj-na', 'ひま'],
];

export interface Palavra {
  jp: string;
  kana: string;
  pt: string;
  tipo: Tipo;
}

/** As palavras das tabelas já ensinadas até a unidade de ordem `ordem`. */
export function palavrasDasFormas(ordem: number): Palavra[] {
  const vocab = vocabularioAte(ordem);
  const out: Palavra[] = [];
  for (const [tipo, ...grafias] of PALAVRAS) {
    // A grafia mais nova que o curso já ensinou (かう no A1, 買う no A2).
    const p = [...grafias].reverse().map((g) => vocab.get(g)).find((x) => x !== undefined);
    if (p) out.push({ jp: p.jp, kana: p.kana, pt: p.pt, tipo });
  }
  return out;
}

/** Todas as grafias da lista (o teste confere que cada uma existe no curso). */
export const GRAFIAS_DAS_FORMAS: readonly string[] = PALAVRAS.flatMap(([, ...g]) => g);

/* ───────── A conta ───────── */

const I_ROW: Record<string, string> = { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り' };
const A_ROW: Record<string, string> = { う: 'わ', く: 'か', ぐ: 'が', す: 'さ', つ: 'た', ぬ: 'な', ぶ: 'ば', む: 'ま', る: 'ら' };
const E_ROW: Record<string, string> = { う: 'え', く: 'け', ぐ: 'げ', す: 'せ', つ: 'て', ぬ: 'ね', ぶ: 'べ', む: 'め', る: 'れ' };
const O_ROW: Record<string, string> = { う: 'お', く: 'こ', ぐ: 'ご', す: 'そ', つ: 'と', ぬ: 'の', ぶ: 'ぼ', む: 'も', る: 'ろ' };
const TE: Record<string, string> = { う: 'って', つ: 'って', る: 'って', む: 'んで', ぶ: 'んで', ぬ: 'んで', く: 'いて', ぐ: 'いで', す: 'して' };
export const FINAIS_DO_GRUPO_1 = Object.keys(TE);

function deAdjetivo(p: Pick<Palavra, 'kana' | 'tipo'>, f: Forma): string {
  const k = p.kana;
  if (p.tipo === 'adj-i') {
    const base = k === 'いい' ? 'よ' : k.slice(0, -1);
    const formas: Partial<Record<Forma, string>> = {
      adj: `${k}です`,
      'adj-nai': `${base}くないです`,
      'adj-ta': `${base}かったです`,
      'adj-nakatta': `${base}くなかったです`,
      'adj-naru': `${base}くなる`,
    };
    const r = formas[f];
    if (r) return r;
  } else {
    const formas: Partial<Record<Forma, string>> = {
      adj: `${k}です`,
      'adj-nai': `${k}じゃないです`,
      'adj-ta': `${k}でした`,
      'adj-nakatta': `${k}じゃなかったです`,
      'adj-naru': `${k}になる`,
    };
    const r = formas[f];
    if (r) return r;
  }
  throw new Error(`a forma ${f} não é de adjetivo`);
}

/** A leitura (em kana) da forma. */
export function conjugar(p: Pick<Palavra, 'jp' | 'kana' | 'tipo'>, f: Forma): string {
  if (p.tipo === 'adj-i' || p.tipo === 'adj-na') return deAdjetivo(p, f);
  if (f.startsWith('adj')) throw new Error(`a forma ${f} não é de verbo`);
  const k = p.kana;
  const ultima = k.slice(-1);
  const corpo = k.slice(0, -1);
  let i: string; // a raiz do ます
  let a: string; // a raiz do ない
  let te: string;
  let vol: string;
  let pot: string;
  let ba: string;
  let uke: string;
  let sei: string;
  let mei: string;
  if (p.tipo === 'ichidan') {
    i = a = corpo;
    te = `${corpo}て`;
    vol = `${corpo}よう`;
    pot = uke = `${corpo}られる`;
    ba = `${corpo}れば`;
    sei = `${corpo}させる`;
    mei = `${corpo}ろ`;
  } else if (p.tipo === 'kuru') {
    const pre = k.slice(0, -2);
    i = `${pre}き`;
    a = `${pre}こ`;
    te = `${pre}きて`;
    vol = `${pre}こよう`;
    pot = uke = `${pre}こられる`;
    ba = `${pre}くれば`;
    sei = `${pre}こさせる`;
    mei = `${pre}こい`;
  } else if (p.tipo === 'suru') {
    const pre = k.slice(0, -2);
    i = a = `${pre}し`;
    te = `${pre}して`;
    vol = `${pre}しよう`;
    pot = `${pre}できる`;
    uke = `${pre}される`;
    ba = `${pre}すれば`;
    sei = `${pre}させる`;
    mei = `${pre}しろ`;
  } else {
    const ri = I_ROW[ultima];
    const ra = A_ROW[ultima];
    const re = E_ROW[ultima];
    const ro = O_ROW[ultima];
    const rt = TE[ultima];
    if (!ri || !ra || !re || !ro || !rt) throw new Error(`verbo do grupo 1 com final estranho: ${p.jp}`);
    i = corpo + ri;
    a = corpo + ra;
    // いく é o único do grupo 1 em く com て diferente: いって.
    te = k === 'いく' ? 'いって' : corpo + rt;
    vol = `${corpo + ro}う`;
    pot = `${corpo + re}る`;
    ba = `${corpo + re}ば`;
    uke = `${a}れる`;
    sei = `${a}せる`;
    mei = corpo + re;
  }
  const ta = te.slice(0, -1) + (te.endsWith('で') ? 'だ' : 'た');
  switch (f) {
    case 'dic':
      return k;
    case 'masu':
      return `${i}ます`;
    case 'masen':
      return `${i}ません`;
    case 'mashita':
      return `${i}ました`;
    case 'masendeshita':
      return `${i}ませんでした`;
    case 'masenka':
      return `${i}ませんか`;
    case 'mashou':
      return `${i}ましょう`;
    case 'tai':
      return `${i}たい`;
    case 'te':
      return te;
    case 'teimasu':
      return `${te}います`;
    case 'nai':
      return `${a}ない`;
    case 'nakereba':
      return `${a}なければ`;
    case 'ta':
      return ta;
    case 'tara':
      return `${ta}ら`;
    case 'tari':
      return `${ta}り`;
    case 'temo':
      return `${te}も`;
    case 'ikou':
      return vol;
    case 'kanou':
      return pot;
    case 'ba':
      return ba;
    case 'ukemi':
      return uke;
    case 'shieki':
      return sei;
    case 'shieki-ukemi':
      // No grupo 1, 書かせられる encurta para 書かされる, menos nos verbos em す (話させられる).
      return p.tipo === 'godan' && ultima !== 'す' ? `${a}される` : `${sei.slice(0, -1)}られる`;
    case 'meirei':
      return mei;
    default:
      throw new Error(`a forma ${f} não tem regra`);
  }
}

const KANJI = /[一-鿿々]/u;

/**
 * Como a forma se escreve: o kanji da palavra fica e o resto sai da leitura (来る: 来ます, 来ない,
 * com き e こ em cima do 来). A potencial de する é できる, sem kanji nenhum.
 */
export function escrever(p: Pick<Palavra, 'jp' | 'kana' | 'tipo'>, f: Forma): { jp: string; kana: string } {
  const kana = conjugar(p, f);
  const chars = [...p.jp];
  let ultimo = -1;
  chars.forEach((c, n) => {
    if (KANJI.test(c)) ultimo = n;
  });
  if (ultimo < 0) return { jp: kana, kana };
  const cabeca = chars.slice(0, ultimo + 1).join('');
  const okuri = chars.slice(ultimo + 1).join('');
  const n = p.kana.length - okuri.length;
  // A leitura do kanji é a mesma em todas as formas, menos no 来る (く, き, こ): ali, um kana só.
  const leituraDoKanji = p.tipo === 'kuru' ? kana.slice(0, n) : p.kana.slice(0, n);
  if (!kana.startsWith(leituraDoKanji)) return { jp: kana, kana };
  return { jp: cabeca + kana.slice(n), kana };
}

/* ───────── As tabelas dos pontos ───────── */

export interface TabelaDoPonto {
  /** A primeira coluna é a forma de partida; as outras, as que o ponto ensina. */
  formas: readonly Forma[];
  /** Verbos ou adjetivos. */
  de: 'verbo' | 'adjetivo';
  /** Como se forma, em uma ou duas frases (só kana: o cartão já mostra os kanji na tabela). */
  como: string;
  /** O て e o た mudam com o último som: a tabela mostra um verbo de cada final. */
  finais?: true;
}

export const TABELAS: Readonly<Record<string, TabelaDoPonto>> = {
  masu: {
    formas: ['dic', 'masu'],
    de: 'verbo',
    como: 'Grupo 2 (-iru, -eru): tire o る e ponha ます. Grupo 1: o último som passa para o som em i (む → み, う → い) e vem ます. する vira します; くる vira きます.',
  },
  'masu-negativo-passado': {
    formas: ['masu', 'masen', 'mashita', 'masendeshita'],
    de: 'verbo',
    como: 'Troque só o fim do ます: ません (não), ました (fiz), ませんでした (não fiz). O começo do verbo não muda.',
  },
  'adj-negativo-passado': {
    formas: ['adj', 'adj-nai', 'adj-ta', 'adj-nakatta'],
    de: 'adjetivo',
    como: 'Adjetivo い: tire o い e ponha くない, かった, くなかった (いい vira よくない, よかった). Adjetivo な: じゃない, でした, じゃなかった depois da palavra.',
  },
  masenka: {
    formas: ['masu', 'masenka'],
    de: 'verbo',
    como: 'Do ます para o convite: troque ます por ませんか.',
  },
  mashou: {
    formas: ['masu', 'mashou'],
    de: 'verbo',
    como: 'Do ます para o "vamos": troque ます por ましょう.',
  },
  tai: {
    formas: ['masu', 'tai'],
    de: 'verbo',
    como: 'Troque ます por たい. O たい se comporta como adjetivo い: たくない (não quero), たかった (queria).',
  },
  'te-forma': {
    formas: ['dic', 'te'],
    de: 'verbo',
    finais: true,
    como: 'Grupo 2: tire o る e ponha て. Grupo 1, pelo último som: う, つ, る → って; む, ぶ, ぬ → んで; く → いて; ぐ → いで; す → して. いく é exceção: いって. する → して; くる → きて.',
  },
  'te-imasu': {
    formas: ['dic', 'teimasu'],
    de: 'verbo',
    como: 'Faça a forma て e ponha います.',
  },
  'jisho-kei': {
    formas: ['masu', 'dic'],
    de: 'verbo',
    como: 'O caminho de volta. Grupo 2: tire ます e ponha る. Grupo 1: o som em i antes do ます volta para o som em u (のみます → のむ). します → する; きます → くる.',
  },
  'nai-kei': {
    formas: ['dic', 'nai'],
    de: 'verbo',
    como: 'Grupo 2: tire o る e ponha ない. Grupo 1: o último som passa para o som em a e vem ない (のむ → のまない); quando é う, vira わ (かう → かわない). する → しない; くる → こない.',
  },
  'ta-kei': {
    formas: ['dic', 'ta'],
    de: 'verbo',
    finais: true,
    como: 'Igual à forma て, com た no lugar de て e だ no lugar de で: たべて → たべた, のんで → のんだ.',
  },
  'ku-naru': {
    formas: ['adj', 'adj-naru'],
    de: 'adjetivo',
    como: 'Adjetivo い: tire o い e ponha くなる (たかい → たかくなる). Adjetivo な e nome: ponha になる.',
  },
  ikou: {
    formas: ['dic', 'ikou'],
    de: 'verbo',
    como: 'Grupo 2: tire o る e ponha よう. Grupo 1: o último som passa para o som em o e vem う (のむ → のもう). する → しよう; くる → こよう.',
  },
  kanoukei: {
    formas: ['dic', 'kanou'],
    de: 'verbo',
    como: 'Grupo 2: tire o る e ponha られる. Grupo 1: o último som passa para o som em e e vem る (のむ → のめる). する → できる; くる → こられる.',
  },
  tara: {
    formas: ['dic', 'tara'],
    de: 'verbo',
    finais: true,
    como: 'Faça a forma た e ponha ら: たべた → たべたら, のんだ → のんだら.',
  },
  ba: {
    formas: ['dic', 'ba'],
    de: 'verbo',
    como: 'Grupo 2: tire o る e ponha れば. Grupo 1: o último som passa para o som em e e vem ば (のむ → のめば). する → すれば; くる → くれば.',
  },
  temo: {
    formas: ['dic', 'temo'],
    de: 'verbo',
    finais: true,
    como: 'Faça a forma て e ponha も: たべて → たべても, のんで → のんでも.',
  },
  nakereba: {
    formas: ['dic', 'nakereba'],
    de: 'verbo',
    como: 'Faça a forma ない e troque o ない por なければ: のまない → のまなければ.',
  },
  shieki: {
    formas: ['dic', 'shieki'],
    de: 'verbo',
    como: 'Grupo 2: tire o る e ponha させる. Grupo 1: o último som passa para o som em a e vem せる (のむ → のませる; かう → かわせる). する → させる; くる → こさせる.',
  },
  ukemi: {
    formas: ['dic', 'ukemi'],
    de: 'verbo',
    como: 'Grupo 2: tire o る e ponha られる. Grupo 1: o último som passa para o som em a e vem れる (のむ → のまれる; かう → かわれる). する → される; くる → こられる.',
  },
  'shieki-ukemi': {
    formas: ['dic', 'shieki-ukemi'],
    de: 'verbo',
    como: 'Grupo 2: させられる no lugar do る. Grupo 1: o som em a mais される (のむ → のまされる); nos verbos em す, させられる (はなす → はなさせられる). する → させられる; くる → こさせられる.',
  },
  meirei: {
    formas: ['dic', 'meirei'],
    de: 'verbo',
    como: 'Grupo 2: tire o る e ponha ろ. Grupo 1: o último som passa para o som em e (のむ → のめ). する → しろ; くる → こい. É ordem dura: placa, esporte, briga.',
  },
  tari: {
    formas: ['dic', 'tari'],
    de: 'verbo',
    finais: true,
    como: 'Faça a forma た e ponha り: たべた → たべたり, のんだ → のんだり.',
  },
};

export interface LinhaDaTabela {
  palavra: Palavra;
  formas: { jp: string; kana: string }[];
}

export interface Tabela {
  ponto: string;
  colunas: string[];
  como: string;
  linhas: LinhaDaTabela[];
}

/** No máximo tantas linhas: a tabela tem de caber no cartão. */
const LINHAS = 5;
const LINHAS_COM_FINAIS = 7;

/** As palavras da tabela: um pouco de cada grupo, e um final de cada no て e no た. */
function escolherPalavras(t: TabelaDoPonto, ordem: number): Palavra[] {
  const todas = palavrasDasFormas(ordem).filter((p) => (t.de === 'adjetivo' ? p.tipo.startsWith('adj') : !p.tipo.startsWith('adj')));
  const teto = t.finais ? LINHAS_COM_FINAIS : LINHAS;
  const out: Palavra[] = [];
  const pega = (p: Palavra | undefined) => {
    if (p && !out.includes(p) && out.length < teto) out.push(p);
  };
  if (t.de === 'adjetivo') {
    for (const p of todas.filter((x) => x.tipo === 'adj-i').slice(0, 3)) pega(p);
    for (const p of todas.filter((x) => x.tipo === 'adj-na').slice(0, 2)) pega(p);
    return out;
  }
  pega(todas.find((p) => p.tipo === 'ichidan'));
  if (t.finais) {
    // Um verbo do grupo 1 por regra do て: う/つ/る, む/ぶ/ぬ, く, ぐ, す e o いく.
    for (const regra of [['う', 'つ', 'る'], ['む', 'ぶ', 'ぬ'], ['く'], ['ぐ'], ['す']])
      pega(todas.find((p) => p.tipo === 'godan' && p.kana !== 'いく' && regra.includes(p.kana.slice(-1))));
    pega(todas.find((p) => p.kana === 'いく'));
  } else {
    const g1 = todas.filter((p) => p.tipo === 'godan');
    pega(g1[0]);
    pega(g1.find((p) => p.kana.slice(-1) !== g1[0]?.kana.slice(-1)));
  }
  pega(todas.find((p) => p.tipo === 'suru'));
  pega(todas.find((p) => p.tipo === 'kuru'));
  for (const p of todas) pega(p);
  return out;
}

/** A tabela do ponto, com o vocabulário da unidade dele (undefined se o ponto não tem tabela). */
export function tabelaDoPonto(ponto: string, u: Pick<Unidade, 'ordem'> | undefined = unidadeDoPonto(ponto)): Tabela | undefined {
  const t = TABELAS[ponto];
  if (!t || !u) return undefined;
  const linhas = escolherPalavras(t, u.ordem).map((palavra) => ({ palavra, formas: t.formas.map((f) => escrever(palavra, f)) }));
  if (linhas.length === 0) return undefined;
  return { ponto, colunas: t.formas.map((f) => FORMAS[f]), como: t.como, linhas };
}

/* ───────── O exercício de transformar ───────── */

export interface PerguntaDeForma {
  ponto: string;
  palavra: Palavra;
  de: { forma: Forma; jp: string; kana: string };
  para: { forma: Forma; jp: string; kana: string };
  /** Quatro opções em kana (o kanji entregaria a certa). */
  opcoes: string[];
  como: string;
}

/** Erros que a pessoa de fato comete: o grupo trocado, o て de outro final, outra forma do verbo. */
function errosParecidos(p: Palavra, f: Forma, formasDoPonto: readonly Forma[]): string[] {
  const out: string[] = [];
  const tenta = (fn: () => string) => {
    try {
      out.push(fn());
    } catch {
      /* forma que não existe para este tipo */
    }
  };
  if (p.tipo === 'godan' || p.tipo === 'ichidan') {
    // O grupo trocado: かえる tratado como たべる, たべる tratado como かえる.
    if (p.kana.endsWith('る')) tenta(() => conjugar({ ...p, tipo: p.tipo === 'godan' ? 'ichidan' : 'godan' }, f));
  }
  if (p.tipo === 'godan')
    for (const fim of FINAIS_DO_GRUPO_1) if (fim !== p.kana.slice(-1)) tenta(() => conjugar({ ...p, kana: p.kana.slice(0, -1) + fim, jp: p.kana.slice(0, -1) + fim }, f));
  if (p.tipo === 'suru' || p.tipo === 'kuru') tenta(() => conjugar({ ...p, tipo: 'ichidan' }, f));
  if (p.tipo === 'adj-i') tenta(() => conjugar({ ...p, tipo: 'adj-na' }, f));
  if (p.tipo === 'adj-na') tenta(() => conjugar({ ...p, kana: `${p.kana}い`, tipo: 'adj-i' }, f));
  for (const outra of formasDoPonto) if (outra !== f) tenta(() => conjugar(p, outra));
  return out;
}

/** As perguntas de transformar de uma unidade: de cada linha das tabelas dela, até `teto`. */
export function perguntasDeForma(u: Unidade, rng: Rng, teto = 8): PerguntaDeForma[] {
  const out: PerguntaDeForma[] = [];
  for (const ponto of u.gramatica) {
    const t = TABELAS[ponto];
    const tabela = tabelaDoPonto(ponto, u);
    if (!t || !tabela) continue;
    const [de, ...alvos] = t.formas as [Forma, ...Forma[]];
    for (const [n, linha] of tabela.linhas.entries()) {
      const para = alvos[n % alvos.length]!;
      const certa = conjugar(linha.palavra, para);
      const erradas = [...new Set(errosParecidos(linha.palavra, para, alvos))].filter((x) => x !== certa);
      // Sem erro parecido que chegue, completa com a mesma forma de outra palavra da tabela.
      for (const outra of tabela.linhas) if (outra !== linha) erradas.push(conjugar(outra.palavra, para));
      const tres = [...new Set(erradas)].filter((x) => x !== certa).slice(0, 3);
      if (tres.length < 3) continue;
      out.push({
        ponto,
        palavra: linha.palavra,
        de: { forma: de, ...escrever(linha.palavra, de) },
        para: { forma: para, ...escrever(linha.palavra, para) },
        opcoes: shuffle(rng, [certa, ...tres]),
        como: t.como,
      });
    }
  }
  return shuffle(rng, out).slice(0, teto);
}
