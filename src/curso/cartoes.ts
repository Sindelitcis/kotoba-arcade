/**
 * Os cartões de apresentação do curso (core/Apresentacao.tsx), montados direto do currículo
 * (src/content/curso): a palavra com o significado da unidade, o kanji com a leitura usada ali
 * e o aviso das outras, e o ponto de gramática.
 *
 * Tudo o que um cartão fala está gravado: o japonês pela lista de `scripts/falas.ts` e o
 * português pela de `scripts/falas-pt.ts`, as duas tiradas daqui (`falasDoCurso`).
 */
import { palavrasDa, UNIDADES, type KanjiDaUnidade, type Palavra } from '../content/curso';
import { frasePtDoSignificado, type ItemNovo } from '../content/ensino';
import { FRASES_FIXAS, fichaDe } from '../content/aprofundar/fichas';
import type { FalaJp, Trecho } from '../core/sequencia';
import { cartaDaPalavra, FICHA_DA_GRAMATICA, outrasLeituras, palavraDoCurso, partesDoPonto, unidadeDoKanji } from './motor';
import { exemplosDoPonto, kanjiAte } from './exemplos';
import { NOME_DO_TIPO, tabelaDoPonto } from './formas';

/** A palavra solta, como nos jogos: a gravação fica no kana, na voz de palavra. */
export function falaDaPalavra(p: Pick<Palavra, 'jp' | 'kana'>): FalaJp {
  return { texto: p.kana, voz: 'palavra', kana: p.kana };
}

export function cartaoDaPalavra(p: Palavra): ItemNovo {
  const frase = frasePtDoSignificado(p.pt);
  return {
    chaves: [cartaDaPalavra(p)],
    alvo: { t: 'palavra', id: `w:${p.jp}` },
    tipo: 'Palavra',
    grande: p.jp,
    leitura: p.jp === p.kana ? undefined : p.kana,
    pt: p.pt,
    explicacao: p.nota,
    falas: [{ tipo: 'jp', fala: falaDaPalavra(p) }, ...(frase ? [{ tipo: 'pt', texto: frase } as const] : [])],
  };
}

/** O significado do kanji, pela ficha do Aprofundar; o kanji sem ficha traz o dele no curso (tests/curso-motor.test.ts). */
export function significadoDoKanji(k: string): string {
  return fichaDe({ t: 'kanji', c: k })?.pt ?? UNIDADES.flatMap((u) => u.kanji).find((x) => x.k === k && x.significado)?.significado ?? '';
}

/** O texto do cartão: a leitura de agora, a troca (se houver) e as leituras que vêm depois. */
/** As palavras do curso citadas no texto do cartão, com a leitura delas. */
export function leiturasCitadas(texto: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const u of UNIDADES)
    for (const p of palavrasDa(u)) if (p.jp !== p.kana && texto.includes(p.jp) && !(p.jp in out)) out[p.jp] = p.kana;
  return out;
}

/** A palavra como a pessoa consegue ler até a unidade de ordem `ordem`: com kanji, se todos já foram ensinados; senão, em kana. */
export function palavraAte(jp: string, ordem: number): string {
  const ensinados = kanjiAte(ordem);
  return [...jp].every((c) => !/[一-鿿々]/u.test(c) || ensinados.has(c)) ? jp : (palavraDoCurso(jp)?.kana ?? jp);
}

export function explicacaoDoKanji(k: KanjiDaUnidade): string {
  const partes: string[] = [];
  // Toda palavra citada leva a leitura junto: nenhum kanji fica sem leitura na tela.
  const comLeitura = (jp: string) => {
    const kana = palavraDoCurso(jp)?.kana;
    return kana && kana !== jp ? `${jp} (${kana})` : jp;
  };
  if (k.muda) partes.push(k.muda);
  else partes.push(k.em === k.k ? `Sozinho, ${k.k} se lê ${k.leitura}.` : `Em ${comLeitura(k.em)}, ${k.k} se lê ${k.leitura}.`);
  // Separa o que a pessoa já viu do que vem depois. Do que vem depois, a palavra só vai com kanji se
  // todos os kanji dela já foram ensinados; senão, vai em kana (三人 na unidade 1 é さんにん).
  const ordem = unidadeDoKanji(k)?.ordem ?? Number.MAX_SAFE_INTEGER;
  const todas = outrasLeituras(k);
  const vistas = todas.filter((o) => o.ordem < ordem).map((o) => `em ${comLeitura(o.em)} se lê ${o.leitura}`);
  const agora = todas.filter((o) => o.ordem === ordem).map((o) => `em ${comLeitura(o.em)} se lê ${o.leitura}`);
  const depois = todas
    .filter((o) => o.ordem > ordem)
    .map((o) => `${o.leitura} na ${o.nome}, em ${palavraAte(o.em, ordem) === o.em ? comLeitura(o.em) : palavraAte(o.em, ordem)}`);
  if (vistas.length > 0) partes.push(`Você já viu: ${vistas.join('; ')}.`);
  if (agora.length > 0) partes.push(`Nesta unidade, também: ${agora.join('; ')}.`);
  if (depois.length > 0) partes.push(`Mais adiante, ${k.k} também se lê ${depois.join('; ')}.`);
  if (k.extra) partes.push('Não cai no N5, mas aparece muito no dia a dia.');
  return partes.join(' ');
}

export function cartaoDoKanji(k: KanjiDaUnidade, unidade: string): ItemNovo {
  const sig = significadoDoKanji(k.k);
  const palavra = palavraDoCurso(k.em);
  const frase = frasePtDoSignificado(sig);
  const falas: Trecho[] = [];
  if (frase) falas.push({ tipo: 'pt', texto: frase });
  if (palavra) falas.push({ tipo: 'pt', texto: FRASES_FIXAS.palavra }, { tipo: 'jp', fala: falaDaPalavra(palavra) });
  return {
    // O mesmo kanji pode entrar duas vezes na unidade, com leituras diferentes (人: じん e ひと).
    chaves: [`curso:${unidade}:${k.k}:${k.leitura}`],
    alvo: { t: 'kanji', c: k.k },
    tipo: 'Kanji',
    grande: k.k,
    // A leitura só vai em cima do kanji quando ele é a palavra sozinho. Em 日本人, 人 é じん, mas
    // sozinho é ひと: じん em cima do 人 grande ensinava errado. A leitura de dentro da palavra fica
    // na explicação e no exemplo, que é o que a fala diz.
    leitura: k.em === k.k ? k.leitura : undefined,
    pt: sig,
    explicacao: explicacaoDoKanji(k),
    leituras: leiturasCitadas(explicacaoDoKanji(k)),
    exemplo: palavra && palavra.jp !== k.k ? { jp: palavra.jp, kana: palavra.kana, pt: palavra.pt } : undefined,
    falas,
  };
}

/** A regra curta do ponto, pela ficha que já existe no site (Kumitate ou escola). */
function regraDoPonto(id: string): string | undefined {
  const ficha = FICHA_DA_GRAMATICA[id];
  const f = ficha ? fichaDe({ t: 'gramatica', id: ficha }) : null;
  if (!f) return undefined;
  for (const s of f.secoes) {
    if (s.titulo !== 'A regra') continue;
    for (const b of s.blocos) {
      if (b.k === 'texto') return b.t;
      if (b.k === 'lista' && b.itens[0]) return b.itens[0];
    }
  }
  return undefined;
}

/**
 * O cartão do ponto de gramática: o padrão, a regra e um exemplo feito só com o que já foi
 * ensinado (curso/exemplos.ts), falado em japonês.
 */
export function cartaoDoPonto(id: string, unidade: string): ItemNovo {
  const { grande, pt } = partesDoPonto(id);
  const ficha = FICHA_DA_GRAMATICA[id];
  const [ex] = exemplosDoPonto(id);
  const tabela = tabelaDoPonto(id);
  return {
    chaves: [`curso:${unidade}:gramatica:${id}`],
    alvo: { t: 'gramatica', id: ficha ?? id },
    tipo: 'Gramática',
    grande,
    // Sem explicação separada ("A は B です"), o padrão já diz tudo: nada repetido embaixo.
    pt,
    explicacao: regraDoPonto(id),
    ...(ex ? { exemplo: { jp: ex.jp, kana: ex.kana, pt: ex.pt } } : {}),
    ...(tabela ? { tabela: { como: tabela.como, colunas: tabela.colunas, linhas: tabela.linhas.map((l) => ({ rotulo: NOME_DO_TIPO[l.palavra.tipo], formas: l.formas })) } } : {}),
    falas: ex ? [{ tipo: 'jp', fala: { texto: ex.jp, voz: 'frase', kana: ex.kana } }] : [],
  };
}

/** Tudo o que os cartões do curso falam, para gravar. */
export function falasDoCurso(): { jp: { fala: FalaJp; palavra: Palavra; origem: string }[]; pt: string[] } {
  const jp: { fala: FalaJp; palavra: Palavra; origem: string }[] = [];
  const pt = new Set<string>();
  const add = (t: Trecho, palavra?: Palavra, origem = '') => {
    if (t.tipo === 'pt') pt.add(t.texto);
    else if (t.tipo === 'jp' && palavra && !jp.some((x) => x.fala.texto === t.fala.texto)) jp.push({ fala: t.fala, palavra, origem });
  };
  for (const u of UNIDADES) {
    for (const p of palavrasDa(u)) for (const t of cartaoDaPalavra(p).falas) add(t, p, `curso/${u.id}`);
    for (const k of u.kanji) for (const t of cartaoDoKanji(k, u.id).falas) add(t, palavraDoCurso(k.em), `curso/${u.id}`);
  }
  return { jp, pt: [...pt] };
}
