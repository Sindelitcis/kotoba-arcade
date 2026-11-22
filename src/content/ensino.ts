/**
 * O que a apresentação mostra e fala de cada item novo (core/ensino.ts, Apresentacao.tsx).
 *
 * Tudo sai da ficha do Aprofundar: a escrita, a leitura, o significado, a explicação curta e
 * um exemplo. O que a apresentação acrescenta é o significado falado em português ("Quer
 * dizer prateleira."), gravado nas duas vozes (`scripts/falas-pt.ts`).
 */
import { alvoDaCarta, type Alvo } from './aprofundar/alvo';
import { falavelEmPt, fichaDe, FRASES_FIXAS, todosOsAlvos, type ExemploFicha, type Ficha } from './aprofundar/fichas';
import type { Trecho } from '../core/sequencia';

export interface ItemNovo {
  /** Chaves de carta que a apresentação cria (a primeira identifica o item). */
  chaves: string[];
  alvo: Alvo;
  /** Kanji, Palavra, Hiragana, Gramática... */
  tipo: string;
  grande: string;
  leitura?: string;
  /** Significado curto, do jeito que aparece grande. */
  pt: string;
  /** Uma ou duas linhas que explicam (história do kanji, regra, mnemônico). */
  explicacao?: string;
  exemplo?: ExemploFicha;
  /** Imagem do item, quando o jogo tem (figura da Memória, do Kana em imagens). */
  img?: string;
  /** Leitura das palavras citadas na explicação, quando o conteúdo sabe (texto → kana). */
  leituras?: Readonly<Record<string, string>>;
  /** O que toca ao aparecer: o japonês, o português e o exemplo. */
  falas: Trecho[];
}

const NUMEROS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

/** Raiz dos ordinais, sem a letra do gênero: 2ª → segunda, 2º → segundo. */
const ORDINAL: Readonly<Record<number, string>> = { 1: 'primeir', 2: 'segund', 3: 'terceir', 4: 'quart', 5: 'quint', 6: 'sext', 7: 'sétim', 8: 'oitav', 9: 'non', 10: 'décim' };

/** Dia da semana: 3ª feira é terça, não terceira. */
const DIA_DA_SEMANA: Readonly<Record<number, string>> = { 2: 'segunda', 3: 'terça', 4: 'quarta', 5: 'quinta', 6: 'sexta' };

/** Número por extenso (até 999.999), para a voz em português: 300 → trezentos. */
export function porExtenso(n: number): string {
  if (n < 20) return NUMEROS[n]!;
  if (n < 100) return DEZENAS[Math.floor(n / 10)]! + (n % 10 ? ` e ${NUMEROS[n % 10]}` : '');
  if (n === 100) return 'cem';
  if (n < 1000) return CENTENAS[Math.floor(n / 100)]! + (n % 100 ? ` e ${porExtenso(n % 100)}` : '');
  const mil = Math.floor(n / 1000);
  const resto = n % 1000;
  const cabeca = mil === 1 ? 'mil' : `${porExtenso(mil)} mil`;
  if (!resto) return cabeca;
  return `${cabeca}${resto < 100 || resto % 100 === 0 ? ' e' : ''} ${porExtenso(resto)}`;
}

/**
 * O significado como se fala: o primeiro sentido, sem parênteses, com número por extenso.
 * "dia 1º do mês (um dia inteiro é いちにち)" → "dia primeiro do mês"; "emergência/por acaso" →
 * "emergência ou por acaso"; "10.000 ienes" → "dez mil ienes".
 */
export function significadoFalado(pt: string): string {
  let s = pt.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/[「」"“”]/g, '');
  s = s.split(/[;,]/)[0] ?? s;
  s = s.replace(/\s*\/\s*/g, ' ou ');
  // Ordinal: "2ª feira" é segunda-feira, "1ª vez" é primeira vez, "1º" é primeiro. Antes o número
  // virava "dois" e o ª ficava, e as duas vozes liam "doisª feira".
  s = s.replace(/(\d+)ª\s*feira/g, (m, d: string) => (DIA_DA_SEMANA[Number(d)] ? `${DIA_DA_SEMANA[Number(d)]}-feira` : m));
  s = s.replace(/(\d+)([ºª])/g, (m, d: string, g: string) => (ORDINAL[Number(d)] ? `${ORDINAL[Number(d)]}${g === 'ª' ? 'a' : 'o'}` : m));
  s = s.replace(/\d{1,3}(?:\.\d{3})+|\d+/g, (m) => porExtenso(Number(m.replace(/\./g, ''))));
  return s.replace(/[…!?.]+$/, '').replace(/\s+/g, ' ').trim();
}

/** "Quer dizer prateleira." O que a voz em português diz depois do japonês. Sem jeito de falar, nada. */
export function frasePtDoSignificado(pt: string): string | null {
  const s = significadoFalado(pt);
  if (!s) return null;
  const frase = `Quer dizer ${s}.`;
  return falavelEmPt(frase) ? frase : null;
}

const jpDe = (f: Ficha) => f.ouvir.find((t): t is Extract<Trecho, { tipo: 'jp' }> => t.tipo === 'jp');

function primeiroExemplo(f: Ficha): ExemploFicha | undefined {
  for (const s of f.secoes) for (const b of s.blocos) if (b.k === 'exemplos') return b.itens.find((x) => x.fala) ?? b.itens[0];
  return undefined;
}

function explicacaoDe(f: Ficha): string | undefined {
  for (const s of f.secoes) {
    if (!['Para lembrar', 'O traço', 'A regra'].includes(s.titulo)) continue;
    for (const b of s.blocos) {
      if (b.k === 'texto') return b.t;
      if (b.k === 'lista' && b.itens[0]) return b.itens[0];
    }
  }
  return undefined;
}

/** A apresentação de um item a partir da ficha. Palavra e kanji ganham o significado falado. */
export function itemDaFicha(f: Ficha, chaves: string[], extra: Partial<ItemNovo> = {}): ItemNovo {
  const exemplo = primeiroExemplo(f);
  const falas: Trecho[] = [];
  if (f.alvo.t === 'palavra' || f.alvo.t === 'kanji') {
    // Kanji: a leitura dele sozinho; palavra: a palavra.
    const jp = f.alvo.t === 'kanji' ? f.ouvir.find((t, i) => t.tipo === 'jp' && i <= 1) : jpDe(f);
    if (jp) falas.push(jp);
    const pt = frasePtDoSignificado(f.pt);
    if (pt) falas.push({ tipo: 'pt', texto: pt });
    if (exemplo?.fala) falas.push({ tipo: 'pt', texto: FRASES_FIXAS.exemplo }, { tipo: 'jp', fala: exemplo.fala });
  } else falas.push(...f.ouvir);
  return {
    chaves,
    alvo: f.alvo,
    tipo: f.tipo,
    grande: f.grande,
    leitura: f.leitura,
    pt: f.alvo.t === 'gramatica' ? (extra.pt ?? f.grande) : f.pt,
    explicacao: explicacaoDe(f),
    exemplo,
    falas,
    ...extra,
  };
}

/** A apresentação da carta (`w:棚#meaning`). Carta sem ficha (progresso de lição) devolve null. */
export function itemNovoDe(chave: string, extra: Partial<ItemNovo> = {}, outrasChaves: string[] = []): ItemNovo | null {
  const alvo = alvoDaCarta(chave);
  const f = alvo ? fichaDe(alvo) : null;
  return f ? itemDaFicha(f, [chave, ...outrasChaves], extra) : null;
}

/** Palavra solta (vocabulário em imagem, palavra de uma cena): pela ficha, ou só com o que a palavra tem. */
export function itemDaPalavra(w: { id: string; jp: string; kana: string; pt: string }, chave: string, extra: Partial<ItemNovo> = {}): ItemNovo {
  const pela = itemNovoDe(chave, extra);
  if (pela) return pela;
  const frase = frasePtDoSignificado(w.pt);
  return {
    chaves: [chave],
    alvo: { t: 'palavra', id: w.id },
    tipo: 'Palavra',
    grande: w.jp,
    leitura: w.jp === w.kana ? undefined : w.kana,
    pt: w.pt,
    falas: [{ tipo: 'jp', fala: { texto: w.kana, voz: 'palavra', kana: w.kana } }, ...(frase ? [{ tipo: 'pt', texto: frase } as const] : [])],
    ...extra,
  };
}

/** Todo o português novo das apresentações, para gravar nas duas vozes. */

export function falasPtDoEnsino(): string[] {
  const out = new Set<string>();
  for (const a of todosOsAlvos()) {
    if (a.t !== 'palavra' && a.t !== 'kanji') continue;
    const f = fichaDe(a);
    const frase = f ? frasePtDoSignificado(f.pt) : null;
    if (frase) out.add(frase);
  }
  return [...out];
}
