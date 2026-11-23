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
import { cartaDaPalavra, FICHA_DA_GRAMATICA, outrasLeituras, palavraDoCurso, partesDoPonto } from './motor';
import { exemplosDoPonto } from './exemplos';

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

export function explicacaoDoKanji(k: KanjiDaUnidade): string {
  const partes: string[] = [];
  // Toda palavra citada leva a leitura junto: nenhum kanji fica sem leitura na tela.
  const comLeitura = (jp: string) => {
    const kana = palavraDoCurso(jp)?.kana;
    return kana && kana !== jp ? `${jp} (${kana})` : jp;
  };
  if (k.muda) partes.push(k.muda);
  else partes.push(k.em === k.k ? `Sozinho, ${k.k} se lê ${k.leitura}.` : `Em ${comLeitura(k.em)}, ${k.k} se lê ${k.leitura}.`);
  const outras = outrasLeituras(k).map((o) => `em ${comLeitura(o.em)} se lê ${o.leitura} (${o.nome})`);
  if (outras.length > 0) partes.push(`Outras leituras que vêm no curso: ${outras.join('; ')}.`);
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
    leitura: k.leitura,
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
  return {
    chaves: [`curso:${unidade}:gramatica:${id}`],
    alvo: { t: 'gramatica', id: ficha ?? id },
    tipo: 'Gramática',
    grande,
    // Sem explicação separada ("A は B です"), o padrão já diz tudo: nada repetido embaixo.
    pt,
    explicacao: regraDoPonto(id),
    ...(ex ? { exemplo: { jp: ex.jp, kana: ex.kana, pt: ex.pt } } : {}),
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
