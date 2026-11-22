/**
 * A ficha do Aprofundar: tudo o que o arcade sabe sobre um item, em seções curtas, e o
 * que toca no botão de ouvir (explicação em português, exemplos em japonês).
 *
 * Nada aqui é inventado na hora: cada linha vem do conteúdo (`src/content`, as lições da
 * escola, o Kanji em peças, o Kumitate). O que só o Aprofundar diz (formalidade, quando
 * usar, conjugação passo a passo) fica em `gramatica.ts`.
 */
import { KANJI, KANA, type Kanji as KanjiArcade, type Word } from '../index';
import { EXPRESSOES, GRAMATICA, KANJI_ESCOLA, LEITURAS_NOVAS, PALAVRAS_TEMA, SITUACOES } from '../escola';
import { leituraContinua, textoSimples } from '../escola/ruby';
import { NOME_REGISTRO, type Marcado } from '../escola/tipos';
import { KANA_IMAGENS, kanaDaPalavra, type KanaItem } from '../kana';
import { LEITURAS } from '../leituras';
import { KANJI_PECAS, PARECIDOS, peca as pecaDoKanji, type KanjiPeca } from '../../games/pecas/dados';
import { COURSE } from '../../games/gramatica/pontos';
import { LICOES_FALADAS, licaoFalada } from '../../games/gramatica/falado';
import { conjugateWritten, exampleView, type Ending, type Point, type Verb } from '../../games/gramatica/engine';
import { SCENES } from '../../games/aventura/cenas';
import { parseLine, plainText, type Scene } from '../../games/aventura/engine';
import { CENAS, marcado as marcadoConversa, type Cena as CenaConversa } from '../../games/conversa/engine';
import { LUGARES } from '../../games/cena/lugares';
import { ETAPAS, palavraDe, tarefas, type Lugar } from '../../games/cena/engine';
import type { FalaJp, Trecho } from '../../core/sequencia';
import { hasKanji } from '../../core/kana';
import type { Alvo } from './alvo';
import { acentosDe } from './acento';
import { familia, palavraDaEscola, palavraPorId, parentes, TODAS_AS_PALAVRAS, type PalavraSimples } from './palavras';
import { ESCOLA_DO_PONTO, REGRA_DA_PONTA, USO_DA_ESCOLA, USO_DO_PONTO } from './gramatica';

/** Fala em japonês com o que o gravador precisa (igual à `FalaQuadro` das lições). */
export interface FalaFicha extends FalaJp {
  marcado?: Marcado;
  palavra?: { jp: string; kana: string };
}

export interface ExemploFicha {
  jp: string;
  /** Leitura inteira em kana (quando o conteúdo tem). */
  kana?: string;
  pt: string;
  fala?: FalaFicha;
}

export interface PalavraFicha {
  jp: string;
  kana: string;
  pt: string;
  /** Abre a ficha desta palavra. */
  alvo?: Alvo;
  fala?: FalaFicha;
}

export type Bloco =
  | { k: 'texto'; t: string }
  | { k: 'lista'; itens: string[] }
  | { k: 'passos'; itens: string[] }
  | { k: 'exemplos'; itens: ExemploFicha[] }
  | { k: 'palavras'; itens: PalavraFicha[] }
  | { k: 'acento'; kana: string; acentos: readonly number[] }
  | { k: 'tracos'; c: string }
  /** As peças do kanji, como desenho (sem leitura: muitas peças não são palavra). */
  | { k: 'pecas'; itens: { peca: string; nome: string }[] }
  | { k: 'conjugacao'; linhas: { verbo: string; grupo: string; forma: string; leitura: string }[] }
  /** Frase para montar: as palavras embaralhadas na tela, clique na ordem. */
  | { k: 'montar'; partes: string[]; pt: string; fala?: FalaFicha };

export interface Secao {
  titulo: string;
  blocos: Bloco[];
}

export interface Ficha {
  alvo: Alvo;
  /** Kanji, Palavra, Kana, Gramática, Expressão, Cena. */
  tipo: string;
  /** O que aparece grande no topo. */
  grande: string;
  leitura?: string;
  pt: string;
  secoes: Secao[];
  /** O que toca no botão de ouvir. */
  ouvir: Trecho[];
}

/* ───────── Ajudantes ───────── */

const JAPONES = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

/** Nome de coisa do japonês escrito em romaji: a voz em português lê errado. */
const ROMAJI = /\b(desu|masu|mashita|masen|arigatou|sumimasen|konnichiwa|ohayou|onegai|kudasai|hiragana|katakana|romaji|wo)\b/i;

/**
 * Português que dá para gravar, com as mesmas regras das aulas faladas: sem kana nem kanji
 * (a voz em português não lê), sem número, romaji nem notação de texto escrito, e com
 * pontuação no fim.
 */
export const falavelEmPt = (t: string) =>
  !JAPONES.test(t) && !/\d/.test(t) && !/[/()[\]*_#]/.test(t) && !ROMAJI.test(t) && t.trim() === t && /[.!?:]$/.test(t);

export const FRASES_FIXAS = {
  sozinho: 'Sozinho, ele se lê assim.',
  palavra: 'Numa palavra.',
  frase: 'Numa frase.',
  exemplo: 'Por exemplo.',
  cena: 'Palavras da cena.',
  montar: 'Agora monte a frase.',
} as const;

const pt = (texto: string): Trecho => ({ tipo: 'pt', texto });
const jp = (fala: FalaFicha): Trecho => ({ tipo: 'jp', fala });

function falaPalavra(jpTexto: string, kana: string, pronuncia?: string): FalaFicha {
  return { texto: kana, voz: 'palavra', kana: pronuncia ?? kana, palavra: { jp: jpTexto, kana } };
}

/** Palavra gravada no próprio texto com kanji (as do Kanji em peças e os kanji sozinhos). */
function falaComKanji(jpTexto: string, kana: string): FalaFicha {
  if (!hasKanji(jpTexto)) return falaPalavra(jpTexto, kana);
  return { texto: jpTexto, voz: 'palavra', kana, palavra: { jp: jpTexto, kana } };
}

function falaMarcada(m: Marcado): FalaFicha {
  return { texto: textoSimples(m), voz: 'frase', kana: leituraContinua(m), marcado: m };
}

/** Frase já gravada pelo texto (frases dos kanji do KanjiMon). */
const falaFrase = (texto: string): FalaFicha => ({ texto, voz: 'frase', kana: texto });

function fichaDePalavra(w: PalavraSimples): PalavraFicha {
  if (w.id) {
    return { jp: w.jp, kana: w.kana, pt: w.pt, alvo: { t: 'palavra', id: w.id }, fala: falaPalavra(w.jp, w.kana) };
  }
  return { jp: w.jp, kana: w.kana, pt: w.pt, fala: falaComKanji(w.jp, w.kana) };
}

/** Tira os blocos sem itens e as seções que ficaram sem bloco. */
function semVazias(secoes: Secao[]): Secao[] {
  return secoes
    .map((s) => ({ ...s, blocos: s.blocos.filter((b) => (!('itens' in b) || b.itens.length > 0) && (b.k !== 'texto' || b.t.trim() !== '')) }))
    .filter((s) => s.blocos.length > 0);
}

/* ───────── Frases do arcade, para achar exemplos ───────── */

interface FraseConhecida {
  jp: string;
  kana?: string;
  pt: string;
  fala: FalaFicha;
}

const FRASES: readonly FraseConhecida[] = (() => {
  const out: FraseConhecida[] = [];
  for (const k of KANJI) for (const s of k.sentences) out.push({ jp: s.jp, pt: s.pt, fala: falaFrase(s.jp) });
  for (const g of GRAMATICA) for (const e of g.exemplos) out.push({ jp: textoSimples(e.jp), kana: leituraContinua(e.jp), pt: e.pt, fala: falaMarcada(e.jp) });
  const vistas = new Set<string>();
  return out.filter((f) => !vistas.has(f.jp) && vistas.add(f.jp));
})();

/** Frases do arcade em que a palavra aparece, as mais curtas primeiro. */
export function frasesCom(jpTexto: string, max = 2): FraseConhecida[] {
  return FRASES.filter((f) => f.jp.includes(jpTexto) && f.jp !== jpTexto)
    .sort((a, b) => a.jp.length - b.jp.length)
    .slice(0, max);
}

/* ───────── Kanji ───────── */

const KANJI_ARCADE = new Map(KANJI.map((k) => [k.kanji, k]));
const KANJI_DA_ESCOLA = new Map(KANJI_ESCOLA.map((k) => [k.char, k]));
const KANJI_DAS_PECAS = new Map(KANJI_PECAS.map((k) => [k.kanji, k]));

/** Todos os kanji que têm ficha. */
export const TODOS_OS_KANJI: readonly string[] = [...new Set([...KANJI_ARCADE.keys(), ...KANJI_DA_ESCOLA.keys(), ...KANJI_DAS_PECAS.keys()])];

const hira = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

function leiturasDoKanji(c: string): { sozinho: string; outras: readonly string[] } | undefined {
  const l = LEITURAS[c] ?? LEITURAS_NOVAS[c];
  if (l) return l;
  const p = KANJI_DAS_PECAS.get(c);
  return p ? { sozinho: p.leitura, outras: [] } : undefined;
}

/** Por que a leitura do kanji sozinho é aquela, em português simples. */
function porQueEssaLeitura(c: string, sozinho: string): string | undefined {
  const e = KANJI_DA_ESCOLA.get(c);
  if (!e) return undefined;
  const on = e.on.map(hira);
  const kun = e.kun.map((k) => k.split('.')[0] ?? k);
  if (kun.includes(sozinho) && on.length > 0)
    return `Sozinho, o kanji vira palavra e usa a leitura japonesa (kun): ${sozinho}. Junto de outro kanji, quase sempre usa a leitura de origem chinesa (on): ${on.join(', ')}.`;
  if (on.includes(sozinho))
    return `A leitura mais ouvida é a de origem chinesa (on), ${sozinho}, porque o kanji aparece mais em palavras compostas do que sozinho.`;
  return undefined;
}

function errosDoKanji(c: string): string[] {
  const out = PARECIDOS.filter((p) => p.a === c || p.b === c).map((p) => `Não confunda ${p.a} com ${p.b}. ${p.diferenca}`);
  return out;
}

function fichaKanji(c: string): Ficha | null {
  const a: KanjiArcade | undefined = KANJI_ARCADE.get(c);
  const e = KANJI_DA_ESCOLA.get(c);
  const p: KanjiPeca | undefined = KANJI_DAS_PECAS.get(c);
  if (!a && !e && !p) return null;
  const l = leiturasDoKanji(c);
  const sozinho = l?.sozinho ?? a?.reading ?? p?.leitura ?? '';
  const significado = a?.pt.join(', ') ?? e?.significado ?? p?.pt.join(', ') ?? '';

  const leituras: string[] = [];
  if (sozinho) leituras.push(`Sozinho: ${sozinho}.`);
  if (l && l.outras.length > 0) leituras.push(`Dentro de palavras também: ${l.outras.join(', ')}.`);
  if (e && e.on.length > 0) leituras.push(`On (de origem chinesa): ${e.on.join(', ')}.`);
  if (e && e.kun.length > 0) leituras.push(`Kun (japonesa): ${e.kun.map((k) => k.replace('.', '')).join(', ')}.`);
  const porQue = porQueEssaLeitura(c, sozinho);

  const fam = familia(c).slice(0, 8).map(fichaDePalavra);
  if (p && !fam.some((w) => w.jp === p.palavra.jp)) fam.unshift({ jp: p.palavra.jp, kana: p.palavra.kana, pt: p.palavra.pt, fala: falaComKanji(p.palavra.jp, p.palavra.kana) });
  // Os exemplos da escola são palavras: entram na família, com a gravação de palavra da Jornada.
  for (const x of [...(e?.exemplos ?? [])].reverse()) {
    const jpx = textoSimples(x.jp);
    if (!fam.some((w) => w.jp === jpx)) fam.unshift({ jp: jpx, kana: leituraContinua(x.jp), pt: x.pt, fala: falaComKanji(jpx, leituraContinua(x.jp)) });
  }

  const exemplos: ExemploFicha[] = [];
  for (const s of a?.sentences ?? []) exemplos.push({ jp: s.jp, pt: s.pt, fala: falaFrase(s.jp) });

  const lembrar: string[] = [];
  if (a?.story) lembrar.push(a.story);
  if (e?.associacao && e.associacao !== a?.story) lembrar.push(e.associacao);
  if (p?.historia && !lembrar.includes(p.historia)) lembrar.push(p.historia);
  const pecas = p ? p.pecas.map((x) => { const pc = pecaDoKanji(x); return { peca: pc.peca, nome: pc.nome }; }) : [];

  const ouvir: Trecho[] = [];
  if (sozinho) ouvir.push(pt(FRASES_FIXAS.sozinho), jp(falaComKanji(c, sozinho)));
  const pal = fam[0];
  if (pal?.fala) ouvir.push(pt(FRASES_FIXAS.palavra), jp(pal.fala));
  const ex = exemplos.find((x) => x.fala);
  if (ex?.fala) ouvir.push(pt(FRASES_FIXAS.frase), jp(ex.fala));

  return {
    alvo: { t: 'kanji', c },
    tipo: 'Kanji',
    grande: c,
    leitura: sozinho,
    pt: significado,
    ouvir,
    secoes: semVazias([
      { titulo: 'Leituras', blocos: [{ k: 'lista', itens: leituras }, ...(porQue ? [{ k: 'texto', t: porQue } as const] : []), ...(sozinho ? [{ k: 'acento', kana: sozinho, acentos: acentosDe(c, sozinho) } as const] : [])] },
      { titulo: 'Como se escreve', blocos: [{ k: 'tracos', c }, ...(pecas.length > 0 ? [{ k: 'pecas', itens: pecas } as const] : [])] },
      { titulo: 'Para lembrar', blocos: [{ k: 'lista', itens: lembrar }] },
      { titulo: 'Palavras da mesma família', blocos: [{ k: 'palavras', itens: fam }] },
      { titulo: 'Em frases', blocos: [{ k: 'exemplos', itens: exemplos.slice(0, 3) }] },
      { titulo: 'Erros comuns', blocos: [{ k: 'lista', itens: errosDoKanji(c) }] },
    ]),
  };
}

/* ───────── Palavra ───────── */

function fichaPalavra(id: string): Ficha | null {
  const w: Word | undefined = palavraPorId(id);
  if (!w) return null;
  const escola = palavraDaEscola(id)?.palavra;
  const kanji = [...w.jp].filter((c) => hasKanji(c) && TODOS_OS_KANJI.includes(c));
  const sobre: string[] = [];
  if (escola?.pronuncia) sobre.push(`Pronuncia-se ${escola.pronuncia}.`);
  if (escola?.dicionario) sobre.push(`Forma de dicionário: ${textoSimples(escola.dicionario)} (${leituraContinua(escola.dicionario)}).`);
  if (escola?.grupoVerbo) sobre.push(`Verbo do grupo ${escola.grupoVerbo}${escola.grupoVerbo === 3 ? ' (irregular)' : ''}.`);
  if (escola?.nota) sobre.push(escola.nota);
  const erros = (escola?.parecidas ?? []).map((pid) => {
    const op = PALAVRA_DA_ESCOLA_POR_ORIGEM.get(pid);
    return op ? `Não confunda com ${textoSimples(op.jp)} (${leituraContinua(op.jp)}): ${op.pt}.` : '';
  }).filter(Boolean);
  const exemplos = frasesCom(w.jp).map((f) => ({ jp: f.jp, kana: f.kana, pt: f.pt, fala: f.fala }));
  const fam = parentes(w).slice(0, 6).map(fichaDePalavra);
  const acentos = acentosDe(w.jp, w.kana);
  const fala = falaPalavra(w.jp, w.kana, escola?.pronuncia);
  const ouvir: Trecho[] = [jp(fala)];
  if (exemplos[0]?.fala) ouvir.push(pt(FRASES_FIXAS.frase), jp(exemplos[0].fala));
  const kanjiItens: PalavraFicha[] = kanji.map((c) => {
    const l = leiturasDoKanji(c);
    const sig = KANJI_ARCADE.get(c)?.pt[0] ?? KANJI_DA_ESCOLA.get(c)?.significado ?? KANJI_DAS_PECAS.get(c)?.pt[0] ?? '';
    return { jp: c, kana: l?.sozinho ?? '', pt: sig, alvo: { t: 'kanji', c } };
  });
  return {
    alvo: { t: 'palavra', id },
    tipo: 'Palavra',
    grande: w.jp,
    leitura: w.jp === w.kana ? undefined : w.kana,
    pt: w.pt,
    ouvir,
    secoes: semVazias([
      { titulo: 'Como se fala', blocos: [...(acentos.length > 0 ? [{ k: 'acento', kana: escola?.pronuncia ?? w.kana, acentos } as const] : []), { k: 'lista', itens: sobre }] },
      { titulo: 'Os kanji dela', blocos: [{ k: 'palavras', itens: kanjiItens }] },
      ...(hasKanji(w.jp) ? [] : [{ titulo: 'Como se escreve', blocos: [{ k: 'palavras', itens: letrasDe(w.jp) } as Bloco] }]),
      { titulo: 'Em frases', blocos: [{ k: 'exemplos', itens: exemplos }] },
      { titulo: 'Palavras da mesma família', blocos: [{ k: 'palavras', itens: fam }] },
      { titulo: 'Erros comuns', blocos: [{ k: 'lista', itens: erros }] },
    ]),
  };
}

const PALAVRA_DA_ESCOLA_POR_ORIGEM = new Map<string, { jp: Marcado; pt: string }>(PALAVRAS_TEMA.map((p) => [p.origem, { jp: p.palavra.jp, pt: p.palavra.pt }]));

/** As letras de uma palavra em kana, cada uma abrindo a ficha dela. */
function letrasDe(kana: string): PalavraFicha[] {
  return kanaDaPalavra(kana).map((k) => ({ jp: k.char, kana: k.romaji, pt: k.cena.objeto, alvo: { t: 'kana', id: k.id } }));
}

/* ───────── Kana ───────── */

const KANA_POR_ID = new Map<string, KanaItem>(KANA_IMAGENS.map((k) => [k.id, k]));
/** Do id de carta (`a:あ`, `ak:ア`) para o kana em imagens; o Kana Beat usa o mesmo id. */
export function kanaDoId(id: string): KanaItem | undefined {
  const k = KANA_POR_ID.get(id);
  if (k) return k;
  const c = id.replace(/^ak?:/, '');
  return KANA_IMAGENS.find((x) => x.char === c);
}

/** O par na outra escrita (あ ↔ ア). */
function parDoKana(k: KanaItem): string | undefined {
  const base = KANA.find((x) => x.hira === k.char || x.kata === k.char);
  if (!base) return undefined;
  return k.char === base.hira ? base.kata : base.hira;
}

function fichaKana(id: string): Ficha | null {
  const k = kanaDoId(id);
  if (!k) return null;
  const parecidos = k.parecidos.map((p) => KANA_POR_ID.get(p)).filter((x): x is KanaItem => !!x);
  const par = parDoKana(k);
  const som: string[] = [];
  if (k.soa) som.push(k.soa);
  if (k.nota) som.push(k.nota);
  if (par) som.push(`Na outra escrita (${k.escrita === 'hiragana' ? 'katakana' : 'hiragana'}): ${par}.`);
  const fala: FalaFicha = { texto: k.fala, voz: 'palavra', kana: k.fala };
  const exemplo = falaPalavra(k.exemplo.jp, k.exemplo.kana);
  const ouvir: Trecho[] = [];
  if (falavelEmPt(k.mnemonico)) ouvir.push(pt(k.mnemonico));
  if (k.fala === k.char) ouvir.push(jp(fala));
  ouvir.push(pt(FRASES_FIXAS.exemplo), jp(exemplo));
  return {
    alvo: { t: 'kana', id: k.id },
    tipo: k.escrita === 'hiragana' ? 'Hiragana' : 'Katakana',
    grande: k.char,
    leitura: k.romaji,
    pt: k.cena.objeto,
    ouvir,
    secoes: semVazias([
      { titulo: 'O traço', blocos: [{ k: 'tracos', c: k.char }, { k: 'texto', t: k.mnemonico }] },
      { titulo: 'O som', blocos: [{ k: 'lista', itens: som }] },
      { titulo: 'Não confunda', blocos: [{ k: 'lista', itens: parecidos.map((p) => `${p.char} (${p.romaji}): ${p.mnemonico}`) }] },
      { titulo: 'Numa palavra', blocos: [{ k: 'exemplos', itens: [{ jp: k.exemplo.jp, kana: k.exemplo.kana, pt: k.exemplo.pt, fala: exemplo }] }] },
    ]),
  };
}

/* ───────── Gramática ───────── */

const PONTOS = new Map(COURSE.points.map((p) => [p.id, p]));
const LICOES = new Map(GRAMATICA.map((g) => [g.id, g]));

/** Ponta de verbo de cada ponto do Kumitate. */
const PONTA_DO_PONTO: Readonly<Record<string, Ending[]>> = {
  masu: ['ます', 'ません'],
  mashita: ['ました'],
  tai: ['たい'],
  te: ['て'],
  teiru: ['ています'],
  nai: ['ない'],
  ta: ['た'],
};
const PONTA_DA_ESCOLA: Readonly<Record<string, Ending[]>> = {
  'g-masu': ['ます', 'ません', 'ました'],
  'g-tai-mashou': ['たい'],
  'g-te-kudasai': ['て'],
  'g-temoii': ['て'],
  'g-teimasu': ['ています'],
};

/** Um verbo de cada grupo, para a tabela de conjugação. */
const VERBOS_EXEMPLO = ['飲む', '行く', '食べる', 'する', '来る'];
const NOME_GRUPO: Record<Verb['group'], string> = { godan: 'grupo 1', ichidan: 'grupo 2', kuru: 'irregular', suru: 'irregular' };

function conjugacao(pontas: readonly Ending[]): Bloco[] {
  const out: Bloco[] = [];
  for (const ponta of pontas) {
    out.push({ k: 'passos', itens: REGRA_DA_PONTA[ponta] });
    out.push({
      k: 'conjugacao',
      linhas: VERBOS_EXEMPLO.map((v) => {
        const verb = COURSE.verbs[v] as Verb;
        const w = conjugateWritten(verb, ponta);
        return { verbo: `${verb.jp} (${verb.pt})`, grupo: NOME_GRUPO[verb.group], forma: w.text + w.tail, leitura: (w.reading ?? w.text) + w.tail };
      }),
    });
  }
  return out;
}

function exemploDoPonto(p: Point): ExemploFicha {
  const view = exampleView(COURSE, p);
  return { jp: view.map((w) => w.text + w.tail).join(''), kana: view.map((w) => (w.reading ?? w.text) + w.tail).join(''), pt: p.example.pt };
}

function fichaGramatica(id: string): Ficha | null {
  const ponto = PONTOS.get(id);
  const licao = LICOES.get(ponto ? (ESCOLA_DO_PONTO[id] ?? '') : id);
  if (!ponto && !licao) return null;
  const uso = ponto ? USO_DO_PONTO[id] : USO_DA_ESCOLA[id];
  const regra: Bloco[] = [];
  if (ponto) regra.push({ k: 'texto', t: ponto.lesson });
  if (licao) {
    regra.push({ k: 'texto', t: licao.regra });
    if (licao.padroes.length > 0) regra.push({ k: 'lista', itens: [...licao.padroes] });
    if (!ponto) regra.push({ k: 'lista', itens: [...licao.explicacao] });
  }
  const exemplos: ExemploFicha[] = [];
  if (ponto) exemplos.push(exemploDoPonto(ponto));
  for (const e of licao?.exemplos ?? []) if (exemplos.length < 4) exemplos.push({ jp: textoSimples(e.jp), kana: leituraContinua(e.jp), pt: e.nota ? `${e.pt} (${e.nota})` : e.pt, fala: falaMarcada(e.jp) });
  const pontas = ponto ? (PONTA_DO_PONTO[id] ?? []) : (PONTA_DA_ESCOLA[id] ?? []);
  const ouvir: Trecho[] = ponto && LICOES_FALADAS[id] ? licaoFalada(COURSE, ponto) : [];
  if (!ponto && licao) {
    if (falavelEmPt(licao.regra)) ouvir.push(pt(licao.regra));
    const ex = licao.exemplos[0];
    if (ex) ouvir.push(pt(FRASES_FIXAS.exemplo), jp(falaMarcada(ex.jp)));
  }
  const montar = licao?.exemplos.find((e) => e.jp.trim().split(/\s+/).length >= 3);
  return {
    alvo: { t: 'gramatica', id },
    tipo: 'Gramática',
    grande: ponto?.title ?? licao?.titulo ?? id,
    pt: licao?.regra ?? ponto?.lesson ?? '',
    ouvir,
    secoes: semVazias([
      { titulo: 'A regra', blocos: regra },
      { titulo: 'Conjugação passo a passo', blocos: conjugacao(pontas) },
      { titulo: 'Formalidade', blocos: uso ? [{ k: 'texto', t: uso.registro }] : [] },
      { titulo: 'No Japão de verdade', blocos: uso ? [{ k: 'texto', t: uso.noJapao }] : [] },
      { titulo: 'Exemplos', blocos: [{ k: 'exemplos', itens: exemplos }] },
      { titulo: 'Erros comuns', blocos: [{ k: 'lista', itens: [...(licao?.errosComuns ?? [])] }] },
      ...(montar ? [{ titulo: 'Monte a frase', blocos: [blocoMontar(montar.jp, montar.pt)] }] : []),
    ]),
  };
}

/** Todos os ids de gramática com ficha: pontos do Kumitate e lições da escola. */
export const TODA_A_GRAMATICA: readonly string[] = [...PONTOS.keys(), ...LICOES.keys()];

/* ───────── Expressão ───────── */

function fichaExpressao(id: string): Ficha | null {
  const e = EXPRESSOES.find((x) => x.id === id);
  if (!e) return null;
  const fala = falaMarcada(e.jp);
  const ouvir: Trecho[] = [];
  if (falavelEmPt(e.quando)) ouvir.push(pt(e.quando));
  ouvir.push(jp(fala));
  const sobre: string[] = [];
  if (e.pronuncia) sobre.push(`Pronuncia-se ${e.pronuncia}.`);
  if (e.nota) sobre.push(e.nota);
  return {
    alvo: { t: 'expressao', id },
    tipo: 'Expressão',
    grande: textoSimples(e.jp),
    leitura: leituraContinua(e.jp),
    pt: e.pt,
    ouvir,
    secoes: semVazias([
      { titulo: 'Quando usar', blocos: [{ k: 'texto', t: e.quando }] },
      { titulo: 'Formalidade', blocos: [{ k: 'texto', t: NOME_REGISTRO[e.registro] }] },
      { titulo: 'Como se fala', blocos: [{ k: 'lista', itens: sobre }] },
    ]),
  };
}

/* ───────── Cena ───────── */

/** Embaralha as palavras de uma frase marcada da escola sem deixar na ordem certa. */
function blocoMontar(m: Marcado, ptTexto: string): Bloco {
  const partes = m.trim().split(/\s+/).map((b) => textoSimples(b)).filter((b) => !/^[、。？！]+$/.test(b));
  return { k: 'montar', partes, pt: ptTexto, fala: falaMarcada(m) };
}

/** Frase do jogo (Aventura) em peças para montar: cada palavra marcada é uma peça, e o texto entre elas também. */
function montarAventura(markup: string, ptTexto: string): Bloco | null {
  const tokens = parseLine(markup);
  const partes = tokens.flatMap((t) => (t.word ? [t.text] : t.text.split(/[\s、。？！?!]+/))).map((x) => x.trim()).filter(Boolean);
  if (partes.length < 3) return null;
  return { k: 'montar', partes, pt: ptTexto, fala: { texto: plainText(tokens), voz: 'frase', kana: plainText(tokens) } };
}

function palavrasDeIds(ids: readonly string[]): PalavraFicha[] {
  return ids.map((id) => palavraPorId(id)).filter((w): w is Word => !!w).map(fichaDePalavra);
}

function fichaAventura(s: Scene): Ficha {
  const vocab = palavrasDeIds([...new Set(Object.values(s.nodes).flatMap((n) => (n.kind === 'narra' ? [] : [...(n.jp ? parseLine(n.jp) : []), ...(n.kind === 'escolha' ? n.options.flatMap((o) => parseLine(o.jp)) : [])].flatMap((t) => (t.word ? [t.word] : [])))))]);
  // A resposta certa com mais peças (a fala do jogador é a que ele precisa saber montar).
  let montar: Bloco | null = null;
  for (const n of Object.values(s.nodes)) {
    if (n.kind !== 'escolha') continue;
    for (const o of n.options) {
      if (o.r !== 'ok') continue;
      const m = montarAventura(o.jp, o.pt);
      if (m && m.k === 'montar' && (!montar || (montar.k === 'montar' && m.partes.length > montar.partes.length))) montar = m;
    }
  }
  return fichaDeCena({ t: 'cena', id: `aventura:${s.id}` }, s.title, s.jp, s.place, vocab, montar);
}

function fichaConversa(c: CenaConversa): Ficha {
  const vocab: PalavraFicha[] = c.vocabulario.map((t) => ({ jp: t.jp, kana: t.kana, pt: t.pt, alvo: palavraPorId(t.id) ? { t: 'palavra', id: t.id } : undefined, fala: falaPalavra(t.jp, t.kana) }));
  const primeira = c.primeiras[0];
  const montar: Bloco | null = primeira ? montarConversa(primeira.jp, primeira.pt) : null;
  return fichaDeCena({ t: 'cena', id: `conversa:${c.id}` }, c.titulo, c.jp, c.lugar, vocab, montar);
}

function montarConversa(texto: string, ptTexto: string): Bloco | null {
  const t = marcadoConversa(texto);
  const partes = t.jp.split(/(?<=[はをにでがもと、])/).map((s) => s.replace(/[、。？！?]+$/, '')).filter(Boolean);
  if (partes.length < 2) return null;
  return { k: 'montar', partes, pt: ptTexto, fala: { texto: t.jp, voz: 'frase', kana: t.kana } };
}

function fichaLugar(l: Lugar): Ficha {
  const ws = [...new Map(l.coisas.map((c) => palavraDe(c)).map((w) => [w.id, w])).values()];
  // A frase de "descrever": o jogo já monta e fala ela, peça por peça.
  const descrever = ETAPAS.flatMap((e) => tarefas(l, e)).find((t) => t.pecas && t.pecas.certas.length >= 3);
  const certas = descrever?.pecas?.certas ?? [];
  const montar: Bloco | null =
    certas.length > 0
      ? { k: 'montar', partes: certas.map((x) => x.t), pt: 'Monte a frase que descreve a cena.', fala: { texto: certas.map((x) => x.t).join(''), voz: 'frase', kana: certas.map((x) => x.r ?? x.t).join('') } }
      : null;
  return fichaDeCena({ t: 'cena', id: `lugar:${l.id}` }, l.pt, l.jp, `${l.jp} (${l.kana})`, ws.map(fichaDePalavra), montar);
}

function fichaSituacao(id: string): Ficha | null {
  const s = SITUACOES.find((x) => x.id === id);
  if (!s) return null;
  const falas: ExemploFicha[] = s.falas.map((f) => ({ jp: `${f.quem}: ${textoSimples(f.jp)}`, kana: leituraContinua(f.jp), pt: f.pt, fala: falaMarcada(f.jp) }));
  const fala = s.falas.find((f) => f.jp.trim().split(/\s+/).length >= 3);
  const f = fichaDeCena({ t: 'cena', id: `situacao:${id}` }, s.titulo, '', s.contexto, [], fala ? blocoMontar(fala.jp, fala.pt) : null);
  f.secoes.splice(0, 0, { titulo: 'A conversa', blocos: [{ k: 'exemplos', itens: falas }] }, ...(s.notas.length > 0 ? [{ titulo: 'Notas', blocos: [{ k: 'lista', itens: [...s.notas] } as Bloco] }] : []));
  const f0 = falas[0]?.fala;
  if (f0) f.ouvir.push(pt(FRASES_FIXAS.exemplo), jp(f0));
  return f;
}

function fichaDeCena(alvo: Alvo, titulo: string, jpTitulo: string, lugar: string, vocab: PalavraFicha[], montar: Bloco | null): Ficha {
  const ouvir: Trecho[] = [];
  const comFala = vocab.filter((v) => v.fala).slice(0, 6);
  if (comFala.length > 0) ouvir.push(pt(FRASES_FIXAS.cena), ...comFala.map((v) => jp(v.fala as FalaFicha)));
  if (montar && montar.k === 'montar' && montar.fala) ouvir.push(pt(FRASES_FIXAS.montar), jp(montar.fala));
  return {
    alvo,
    tipo: 'Cena',
    grande: jpTitulo || titulo,
    pt: jpTitulo ? titulo : '',
    ouvir,
    secoes: semVazias([
      { titulo: 'Onde', blocos: [{ k: 'texto', t: lugar }] },
      { titulo: 'Vocabulário da cena', blocos: [{ k: 'palavras', itens: vocab }] },
      ...(montar ? [{ titulo: 'Monte a frase', blocos: [montar] }] : []),
    ]),
  };
}

/** Todas as cenas com ficha. */
export const TODAS_AS_CENAS: readonly string[] = [
  ...SCENES.map((s) => `aventura:${s.id}`),
  ...CENAS.map((c) => `conversa:${c.id}`),
  ...LUGARES.map((l) => `lugar:${l.id}`),
  ...SITUACOES.map((s) => `situacao:${s.id}`),
];

function fichaCena(id: string): Ficha | null {
  const [tipo, resto = ''] = id.split(/:(.*)/s);
  if (tipo === 'aventura') { const s = SCENES.find((x) => x.id === resto); return s ? fichaAventura(s) : null; }
  if (tipo === 'conversa') { const c = CENAS.find((x) => x.id === resto); return c ? fichaConversa(c) : null; }
  if (tipo === 'lugar') { const l = LUGARES.find((x) => x.id === resto); return l ? fichaLugar(l) : null; }
  if (tipo === 'situacao') return fichaSituacao(resto);
  return null;
}

/* ───────── Entrada ───────── */

const cache = new Map<string, Ficha | null>();

export function fichaDe(a: Alvo): Ficha | null {
  const chave = a.t === 'kanji' ? `kanji:${a.c}` : `${a.t}:${a.id}`;
  const visto = cache.get(chave);
  if (visto !== undefined) return visto;
  let f: Ficha | null;
  switch (a.t) {
    case 'kanji': f = fichaKanji(a.c); break;
    case 'palavra': f = fichaPalavra(a.id); break;
    case 'kana': f = fichaKana(a.id); break;
    case 'gramatica': f = fichaGramatica(a.id); break;
    case 'expressao': f = fichaExpressao(a.id); break;
    case 'cena': f = fichaCena(a.id); break;
  }
  cache.set(chave, f);
  return f;
}

/** Tudo o que tem ficha (para os testes e para a lista de falas). */
export function todosOsAlvos(): Alvo[] {
  return [
    ...TODOS_OS_KANJI.map((c): Alvo => ({ t: 'kanji', c })),
    ...TODAS_AS_PALAVRAS.map((w): Alvo => ({ t: 'palavra', id: w.id })),
    ...KANA_IMAGENS.map((k): Alvo => ({ t: 'kana', id: k.id })),
    ...TODA_A_GRAMATICA.map((id): Alvo => ({ t: 'gramatica', id })),
    ...EXPRESSOES.map((e): Alvo => ({ t: 'expressao', id: e.id })),
    ...TODAS_AS_CENAS.map((id): Alvo => ({ t: 'cena', id })),
  ];
}

/** Todo o japonês que a ficha pode falar: o botão de ouvir, os exemplos, as palavras e a frase para montar. */
export function falasDaFicha(f: Ficha): FalaFicha[] {
  const out: FalaFicha[] = [];
  for (const t of f.ouvir) if (t.tipo === 'jp') out.push(t.fala);
  for (const s of f.secoes)
    for (const b of s.blocos) {
      if (b.k === 'exemplos' || b.k === 'palavras') for (const x of b.itens) if (x.fala) out.push(x.fala);
      if (b.k === 'montar' && b.fala) out.push(b.fala);
    }
  return out;
}

/** Todo o português que a ficha fala (vai para as duas vozes em português). */
export function falasPtDaFicha(f: Ficha): string[] {
  return f.ouvir.flatMap((t) => (t.tipo === 'pt' ? [t.texto] : []));
}
