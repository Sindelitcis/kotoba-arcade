/**
 * Lições em quadrinhos da Jornada: uma ideia por quadro, uma tecla para avançar e uma
 * pergunta logo depois. Tudo aqui é montado a partir do conteúdo da escola-japones
 * (`src/content/escola`), sem texto novo de ensino: só o arranjo em quadros.
 *
 * Regras de montagem:
 * - Fundamentos e gramática seguem a ordem do texto original. A pergunta vem logo
 *   depois do quadro que ensina, nunca antes.
 * - Palavras, expressões e kanji vêm de três em três: três quadros, três perguntas.
 * - Alternativa errada é japonês de verdade, de outro contexto (regra da escola-japones).
 *   Expressões que se confundem de verdade (すみません e ごめんなさい) nunca aparecem
 *   como erradas uma da outra.
 */
import { cardKey, KANJI } from '../content';
import { hasKanji } from '../core/kana';
import { LEITURAS } from '../content/leituras';
import { EXPRESSOES, FUNDAMENTOS, GRAMATICA, KANJI_ESCOLA, LEITURAS_NOVAS, SITUACOES, palavrasDoTema, TEMAS, type PalavraTema } from '../content/escola';
import { SONS_LONGOS } from '../content/escola/fundamentos';
import { LACUNA } from '../content/escola/gramatica';
import { leituraContinua, textoSimples } from '../content/escola/ruby';
import type { ExercicioEscrito, Expressao, Kanji as KanjiEscola, Marcado, Pagina, Registro } from '../content/escola/tipos';
import type { FalaJp } from '../core/sequencia';

/**
 * O que a tecla R fala no quadro. `texto` é a chave da gravação (ver scripts/falas.ts);
 * `voz` palavra é a voz clara de palavra solta, frase é a voz padrão; `kana` é a leitura
 * para a voz do navegador quando faltar a gravação.
 */
export interface FalaQuadro extends FalaJp {
  /** Frase: o texto marcado, para o gravador saber a leitura de cada palavra com kanji. */
  marcado?: Marcado;
  /** Palavra solta (ou kanji sozinho): como se escreve e como se lê, igual aos jogos. */
  palavra?: { jp: string; kana: string };
}

export interface Quadro {
  tipo: 'quadro';
  titulo?: string;
  /** Kanji ou palavra em destaque, grande. */
  grande?: string;
  /** Leitura do destaque. */
  leitura?: string;
  /** Japonês marcado com furigana. */
  jp?: Marcado;
  pt?: string;
  /** Quem fala (situações). */
  quem?: string;
  registro?: Registro;
  linhas: readonly string[];
  /** Exemplos curtos, em japonês marcado, com tradução. */
  exemplos?: readonly { jp: Marcado; pt: string }[];
  fala?: FalaQuadro;
  /** Os exemplos falados, depois da `fala` (palavras com o kanji do quadro). */
  falasExemplos?: readonly FalaQuadro[];
  /** Carta da memória que o quadro apresenta (core/ensino.ts): a pergunta dela vem depois. */
  carta?: string;
}

export interface Pergunta {
  tipo: 'pergunta';
  id: string;
  enunciado: string;
  /** Frase em japonês mostrada na pergunta (com ＿＿ na lacuna). */
  frase?: Marcado;
  /** A frase completa, mostrada depois da resposta. */
  fraseCompleta?: Marcado;
  correta: string;
  erradas: readonly string[];
  /** As opções estão em japonês marcado (furigana) ou em português. */
  japones: boolean;
  explicacao?: string;
  /** Carta da memória (palavra ou kanji do arcade) que a resposta move. */
  carta?: string;
  /** O japonês que a pergunta mostra, falado quando ela aparece. */
  fala?: FalaQuadro;
  /** Falado depois da resposta: a frase completa ou a alternativa certa em japonês. */
  falaResposta?: FalaQuadro;
}

export interface Ordem {
  tipo: 'ordem';
  id: string;
  enunciado: string;
  /** Blocos na ordem certa. A tela embaralha. */
  blocos: readonly Marcado[];
  explicacao?: string;
  /** A frase montada, falada quando fica pronta. */
  falaResposta?: FalaQuadro;
}

export type Passo = Quadro | Pergunta | Ordem;

export interface Licao {
  id: string;
  titulo: string;
  minutos: number;
  passos: readonly Passo[];
}

const TRIO = 3;

function minutosDe(passos: readonly Passo[]): number {
  const s = passos.reduce((t, p) => t + (p.tipo === 'quadro' ? 15 : 25), 0);
  return Math.max(3, Math.ceil(s / 60));
}

function licao(id: string, titulo: string, passos: Passo[]): Licao {
  return { id, titulo, minutos: minutosDe(passos), passos };
}

/** Fala de uma frase: a chave é o texto como se escreve. */
export function falaFrase(jp: Marcado): FalaQuadro {
  return { texto: textoSimples(jp), voz: 'frase', kana: leituraContinua(jp), marcado: jp };
}

/** Fala de uma palavra solta: a chave é o kana, como nos jogos. */
export function falaPalavra(jp: string, kana: string, pronuncia?: string): FalaQuadro {
  return { texto: kana, voz: 'palavra', kana: pronuncia ?? kana, palavra: { jp, kana } };
}

/**
 * Palavra com kanji gravada no próprio texto, como o kanji sozinho e as palavras do Kanji
 * em peças: o kana se repete entre palavras diferentes (着る e 切る são きる).
 */
export function falaComKanji(jp: Marcado): FalaQuadro {
  const texto = textoSimples(jp);
  const kana = leituraContinua(jp);
  if (!hasKanji(texto)) return falaPalavra(texto, kana);
  return { texto, voz: 'palavra', kana, palavra: { jp: texto, kana } };
}

/** Exercício da escola-japones como passo da lição. */
export function passoDe(ex: ExercicioEscrito): Pergunta | Ordem {
  switch (ex.tipo) {
    case 'lacuna': {
      const fraseCompleta = ex.frase.replace(LACUNA, ` ${ex.resposta} `).replace(/\s+/g, ' ').trim();
      return {
        tipo: 'pergunta',
        id: ex.id,
        enunciado: ex.pt,
        frase: ex.frase,
        fraseCompleta,
        correta: ex.resposta,
        erradas: ex.erradas,
        japones: true,
        explicacao: ex.explicacao,
        falaResposta: falaFrase(fraseCompleta),
      };
    }
    case 'escolha': {
      const japones = temJapones(ex.correta);
      return {
        tipo: 'pergunta',
        id: ex.id,
        enunciado: ex.pergunta,
        correta: ex.correta,
        erradas: ex.erradas,
        japones,
        explicacao: ex.explicacao,
        ...(japones ? { falaResposta: falaFrase(ex.correta) } : {}),
      };
    }
    case 'significado':
      return { tipo: 'pergunta', id: ex.id, enunciado: 'O que quer dizer?', frase: ex.frase, correta: ex.correta, erradas: ex.erradas, japones: false, explicacao: ex.explicacao, fala: falaFrase(ex.frase) };
    case 'ordem':
      return { tipo: 'ordem', id: ex.id, enunciado: ex.pt, blocos: ex.blocos, explicacao: ex.explicacao, falaResposta: falaFrase(ex.blocos.join(' ')) };
  }
}

/** Opção que se mostra como japonês: tem kana ou kanji e nenhuma letra latina. */
export function temJapones(texto: string): boolean {
  return /[぀-ヿ一-鿿]/.test(texto) && !/[A-Za-zÀ-ÿ]/.test(texto);
}

// ───────── Fundamentos ─────────

function quadrosDaPagina(p: Pagina): Quadro[] {
  const quadros: Quadro[] = p.paragrafos.map((linha, i) => ({ tipo: 'quadro', titulo: i === 0 ? p.titulo : undefined, linhas: [linha] }));
  for (const ex of p.exemplos ?? []) quadros.push({ tipo: 'quadro', titulo: 'Exemplo', jp: ex.jp, pt: ex.pt, linhas: [], fala: falaFrase(ex.jp) });
  return quadros;
}

/** Uma pergunta depois de cada página; as que sobrarem vão para o fim. */
function intercalar(blocos: Passo[][], perguntas: readonly ExercicioEscrito[]): Passo[] {
  const passos: Passo[] = [];
  blocos.forEach((b, i) => {
    passos.push(...b);
    const ex = perguntas[i];
    if (ex) passos.push(passoDe(ex));
  });
  for (const ex of perguntas.slice(blocos.length)) passos.push(passoDe(ex));
  return passos;
}

const fundamentos = FUNDAMENTOS.map((f) => licao(`fund:${f.id}`, f.titulo, intercalar(f.paginas.map(quadrosDaPagina), f.exercicios)));

// ───────── Gramática ─────────

/** Nunca mais que isto de quadros seguidos sem uma pergunta. */
export const MAX_QUADROS_SEGUIDOS = 3;

/**
 * "O que quer dizer?" sobre uma frase que acabou de aparecer. As erradas são as
 * traduções de outras frases da mesma lição: português de verdade, nada inventado.
 */
function perguntaDaFrase(id: string, jp: Marcado, pt: string, outras: readonly string[]): Pergunta {
  const erradas = outras.filter((o) => o !== pt).filter((o, i, a) => a.indexOf(o) === i).slice(0, 2);
  return { tipo: 'pergunta', id, enunciado: 'O que quer dizer?', frase: jp, correta: pt, erradas, japones: false, fala: falaFrase(jp) };
}

/** Partes de no máximo `n` itens. */
function pedacos<T>(lista: readonly T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < lista.length; i += n) out.push(lista.slice(i, i + n));
  return out;
}

/**
 * Explicação e exemplos se revezam: até dois quadros de explicação, um exemplo e a
 * pergunta sobre ele. Os erros comuns vêm depois, e os exercícios da escola no fim,
 * quando tudo o que eles cobram já foi mostrado.
 */
const gramatica = GRAMATICA.map((g) => {
  const ensino: Quadro[] = [
    { tipo: 'quadro', titulo: 'A regra', linhas: [g.regra] },
    { tipo: 'quadro', titulo: 'O padrão', linhas: g.padroes },
    ...g.explicacao.map((linha): Quadro => ({ tipo: 'quadro', linhas: [linha] })),
  ];
  const traducoes = g.exemplos.map((ex) => ex.pt);
  const exemplos = g.exemplos.map((ex, i): Passo[] => [
    { tipo: 'quadro', titulo: 'Exemplo', jp: ex.jp, pt: ex.pt, linhas: ex.nota ? [ex.nota] : [], fala: falaFrase(ex.jp) },
    perguntaDaFrase(`${g.id}:exemplo${i}`, ex.jp, ex.pt, [...traducoes.slice(i + 1), ...traducoes.slice(0, i)]),
  ]);
  const blocos = pedacos(ensino, MAX_QUADROS_SEGUIDOS - 1);
  if (blocos.length > exemplos.length) throw new Error(`${g.id}: explicação longa demais para os exemplos`);
  const passos: Passo[] = exemplos.flatMap((ex, i) => [...(blocos[i] ?? []), ...ex]);
  const erros = g.errosComuns.map((linha, i): Quadro => ({ tipo: 'quadro', titulo: i === 0 ? 'Cuidado com' : undefined, linhas: [linha] }));
  if (erros.length > MAX_QUADROS_SEGUIDOS) throw new Error(`${g.id}: erros comuns demais seguidos`);
  passos.push(...erros, ...g.exercicios.map(passoDe));
  return licao(`gram:${g.id}`, g.titulo, passos);
});

// ───────── Expressões ─────────

/** As seis lições de expressões da escola-japones, na mesma ordem. */
export const GRUPOS_EXPRESSOES: readonly { id: string; titulo: string; ids: readonly string[] }[] = [
  { id: 'cumprimentos', titulo: 'Cumprimentos', ids: ['e-ohayou', 'e-konnichiwa', 'e-konbanwa', 'e-oyasumi', 'e-hajimemashite', 'e-yoroshiku'] },
  { id: 'agradecer', titulo: 'Agradecer e pedir desculpas', ids: ['e-arigatou', 'e-sumimasen', 'e-gomennasai', 'e-moushiwake', 'e-daijoubu', 'e-kekkou'] },
  { id: 'trabalho', titulo: 'No trabalho', ids: ['e-otsukaresama', 'e-osakini', 'e-shitsurei', 'e-osewa', 'e-kashikomarimashita', 'e-wakarimashita'] },
  { id: 'casa', titulo: 'Em casa e nas refeições', ids: ['e-itadakimasu', 'e-gochisousama', 'e-ittekimasu', 'e-itterasshai', 'e-tadaima', 'e-okaerinasai'] },
  { id: 'nao-entendo', titulo: 'Quando você não entende', ids: ['e-wakarimasen', 'e-mouichido', 'e-yukkuri', 'e-onegaishimasu', 'e-kore-kudasai', 'e-sou-desu-ka'] },
  { id: 'despedidas', titulo: 'Reações e despedidas', ids: ['e-ii-desu-ne', 'e-irasshaimase', 'e-sayounara', 'e-mata-ashita', 'e-ki-wo-tsukete', 'e-omedetou'] },
];

/**
 * Expressões que servem em situações parecidas. Uma nunca é a alternativa errada da
 * outra, porque quem escolhesse a "errada" não estaria errado de verdade.
 */
export const CONFUNDEM: readonly (readonly string[])[] = [
  ['e-ohayou', 'e-konnichiwa', 'e-konbanwa', 'e-otsukaresama'],
  ['e-konbanwa', 'e-oyasumi'],
  ['e-hajimemashite', 'e-yoroshiku'],
  ['e-yoroshiku', 'e-onegaishimasu', 'e-osewa'],
  ['e-arigatou', 'e-gochisousama', 'e-osewa', 'e-otsukaresama'],
  ['e-sumimasen', 'e-gomennasai', 'e-moushiwake', 'e-shitsurei'],
  ['e-daijoubu', 'e-kekkou'],
  ['e-kashikomarimashita', 'e-wakarimashita'],
  ['e-osakini', 'e-shitsurei', 'e-otsukaresama', 'e-sayounara', 'e-mata-ashita', 'e-ki-wo-tsukete', 'e-ittekimasu'],
  ['e-sayounara', 'e-mata-ashita', 'e-ki-wo-tsukete', 'e-oyasumi', 'e-itterasshai'],
  ['e-tadaima', 'e-okaerinasai'],
  ['e-wakarimasen', 'e-mouichido', 'e-yukkuri'],
  ['e-onegaishimasu', 'e-kore-kudasai'],
  ['e-sou-desu-ka', 'e-ii-desu-ne', 'e-omedetou'],
];

export function seConfundem(a: string, b: string): boolean {
  return a === b || CONFUNDEM.some((g) => g.includes(a) && g.includes(b));
}

const expressaoPorId = new Map(EXPRESSOES.map((e) => [e.id, e]));

/** Duas expressões de outro contexto, sempre as mesmas para a mesma pergunta. */
export function erradasDaExpressao(e: Expressao): Expressao[] {
  const i = EXPRESSOES.indexOf(e);
  const out: Expressao[] = [];
  for (let passo = 1; passo < EXPRESSOES.length && out.length < 2; passo++) {
    const o = EXPRESSOES[(i + passo * 7) % EXPRESSOES.length] as Expressao;
    if (!seConfundem(e.id, o.id) && !out.includes(o)) out.push(o);
  }
  return out;
}

const NOME_CURTO: Record<Registro, string> = { casual: 'Casual', polido: 'Polido', formal: 'Formal' };

function quadroExpressao(e: Expressao): Quadro {
  return {
    tipo: 'quadro',
    jp: e.jp,
    pt: e.pt,
    registro: e.registro,
    linhas: [`Quando usar: ${e.quando}`, ...(e.pronuncia ? [`Pronuncia-se ${e.pronuncia}.`] : []), ...(e.nota ? [e.nota] : [])],
    fala: falaFrase(e.jp),
  };
}

function perguntaExpressao(e: Expressao): Pergunta {
  return {
    tipo: 'pergunta',
    id: `expr:${e.id}`,
    enunciado: `${e.quando} O que dizer?`,
    correta: e.jp,
    erradas: erradasDaExpressao(e).map((o) => o.jp),
    japones: true,
    explicacao: `${textoSimples(e.jp)}: ${e.pt}. Registro ${NOME_CURTO[e.registro].toLowerCase()}.`,
    falaResposta: falaFrase(e.jp),
  };
}

function emTrios<T>(itens: readonly T[], quadro: (x: T) => Quadro, pergunta: (x: T) => Passo, porVez = TRIO): Passo[] {
  return pedacos(itens, porVez).flatMap((t) => [...t.map(quadro), ...t.map(pergunta)]);
}

const expressoes = GRUPOS_EXPRESSOES.map((g) => {
  const itens = g.ids.map((id) => {
    const e = expressaoPorId.get(id);
    if (!e) throw new Error(`expressão desconhecida: ${id}`);
    return e;
  });
  return licao(`expr:${g.id}`, g.titulo, emTrios(itens, quadroExpressao, perguntaExpressao));
});

// ───────── Situações ─────────

/**
 * O diálogo vem de duas em duas falas, cada par seguido de "o que quer dizer?" sobre a
 * última. Depois, as notas em grupos de até três, com um exercício da escola entre um
 * grupo e outro; os exercícios que sobram fecham a lição.
 */
const situacoes = SITUACOES.map((s) => {
  const traducoes = s.falas.map((f) => f.pt);
  const quadroFala = (f: (typeof s.falas)[number]): Quadro => ({ tipo: 'quadro', quem: f.quem, jp: f.jp, pt: f.pt, linhas: [], fala: falaFrase(f.jp) });
  const passos: Passo[] = [{ tipo: 'quadro', titulo: s.titulo, linhas: [s.contexto] }];
  const pares = pedacos(s.falas, 2);
  for (const par of pares) {
    passos.push(...par.map(quadroFala));
    const f = par[par.length - 1] as (typeof s.falas)[number];
    const j = s.falas.indexOf(f);
    passos.push(perguntaDaFrase(`${s.id}:fala${j}`, f.jp, f.pt, [...traducoes.slice(j + 1), ...traducoes.slice(0, j)]));
  }
  const exercicios = s.exercicios.map(passoDe);
  const notas = pedacos(
    s.notas.map((n, i): Quadro => ({ tipo: 'quadro', titulo: i === 0 ? 'Repare' : undefined, linhas: [n] })),
    MAX_QUADROS_SEGUIDOS,
  );
  if (exercicios.length < notas.length) throw new Error(`${s.id}: notas demais para os exercícios`);
  notas.forEach((grupo, i) => passos.push(...grupo, ...(i < notas.length - 1 ? [exercicios.shift() as Passo] : [])));
  passos.push(...exercicios);
  return licao(`sit:${s.id}`, s.titulo, passos);
});

// ───────── Palavras por tema ─────────

/** Até 6 palavras por lição, como na escola-japones. */
export const POR_LICAO = 6;

const porOrigem = new Map<string, PalavraTema>();

/**
 * Verbo fala na forma ます, que é a que o quadro mostra. O resto fala como nos jogos
 * (子ども usa a gravação de 子供, que é a mesma palavra).
 */
export function falaDaPalavra(p: PalavraTema): FalaQuadro {
  const { palavra, word } = p;
  if (!palavra.dicionario && word) return falaPalavra(word.jp, word.kana, palavra.pronuncia);
  return falaPalavra(textoSimples(palavra.jp), leituraContinua(palavra.jp), palavra.pronuncia);
}

function quadroPalavra(p: PalavraTema): Quadro {
  const { palavra } = p;
  const linhas: string[] = [];
  if (palavra.dicionario) linhas.push(`Forma de dicionário: ${textoSimples(palavra.dicionario)} (${leituraContinua(palavra.dicionario)}).`);
  if (palavra.pronuncia) linhas.push(`Pronuncia-se ${palavra.pronuncia}.`);
  if (palavra.nota) linhas.push(palavra.nota);
  for (const id of palavra.parecidas ?? []) {
    const par = porOrigem.get(id);
    if (par) linhas.push(`Não confunda com ${leituraContinua(par.palavra.jp)}: ${par.palavra.pt}.`);
  }
  return { tipo: 'quadro', jp: palavra.jp, pt: palavra.pt, linhas, fala: falaDaPalavra(p), carta: p.word ? cardKey(p.word.id, 'meaning') : undefined };
}

function perguntaPalavra(p: PalavraTema, vizinhas: readonly PalavraTema[]): Pergunta {
  // O par parecido (おばさん × おばあさん) é a melhor alternativa errada: treina o detalhe.
  const pares = (p.palavra.parecidas ?? []).map((id) => porOrigem.get(id)).filter((x): x is PalavraTema => !!x);
  const outras = vizinhas.filter((v) => v !== p && !pares.includes(v));
  const erradas = [...pares, ...outras].slice(0, 2).map((o) => o.palavra.pt);
  return {
    tipo: 'pergunta',
    id: `pal:${p.origem}`,
    enunciado: 'O que quer dizer?',
    frase: p.palavra.jp,
    correta: p.palavra.pt,
    erradas,
    japones: false,
    carta: p.word ? cardKey(p.word.id, 'meaning') : undefined,
    fala: falaDaPalavra(p),
  };
}

/** As palavras de cada lição de vocabulário, na ordem dos quadros (o modo Ouvir usa a mesma divisão). */
export const PALAVRAS_DA_LICAO = new Map<string, readonly PalavraTema[]>();

function licoesDoTema(tema: string): Licao[] {
  const todas = palavrasDoTema(tema);
  const out: Licao[] = [];
  // Grupos do mesmo tamanho (19 palavras viram 5, 5, 5 e 4, e não 6, 6, 6 e 1).
  const total = Math.ceil(todas.length / POR_LICAO);
  const tamanho = Math.ceil(todas.length / total);
  for (let i = 0; i < todas.length; i += tamanho) {
    const grupo = todas.slice(i, i + tamanho);
    const n = i / tamanho + 1;
    const titulo = total > 1 ? `${TEMAS[tema]} ${n}` : (TEMAS[tema] as string);
    // Alternativas erradas: palavras vizinhas do mesmo tema (mais difícil que sorteio solto).
    const vizinhas = (p: PalavraTema) => {
      const j = todas.indexOf(p);
      return [todas[(j + 1) % todas.length], todas[(j + 2) % todas.length], todas[(j + todas.length - 1) % todas.length]].filter((x): x is PalavraTema => !!x);
    };
    // Vogal longa e っ: cada palavra já com a pergunta, porque a lição abre com uma página de texto.
    const porVez = tema === 'sons' ? 1 : TRIO;
    PALAVRAS_DA_LICAO.set(`vocab:${tema}:${n}`, grupo);
    out.push(licao(`vocab:${tema}:${n}`, titulo, emTrios(grupo, quadroPalavra, (p) => perguntaPalavra(p, vizinhas(p)), porVez)));
  }
  return out;
}

// Todos os temas antes, para os pares parecidos (おっと está em "pessoas", おと em "sons").
const temas = Object.keys(TEMAS);
for (const t of temas) for (const p of palavrasDoTema(t)) porOrigem.set(p.origem, p);
const vocabulario = temas.flatMap(licoesDoTema);

/** A lição de vogal longa e っ abre com a página da escola e depois as palavras do tema "sons". */
const sons = (() => {
  const base = vocabulario.filter((l) => l.id.startsWith('vocab:sons:'));
  const passos: Passo[] = [...quadrosDaPagina(SONS_LONGOS), ...base.flatMap((l) => l.passos)];
  return licao('sons', 'Vogal longa e っ', passos);
})();

// ───────── Kanji ─────────

/** Leitura do kanji sozinho: a conferida à mão do KanjiMon ou a dos kanji novos. */
export function leituraDoKanji(char: string): { sozinho: string; outras: readonly string[] } {
  const l = LEITURAS[char] ?? LEITURAS_NOVAS[char];
  if (!l) throw new Error(`kanji sem leitura conferida: ${char}`);
  return l;
}

const doKanjiMon = new Set(KANJI.map((k) => k.kanji));

/** O kanji sozinho, gravado no próprio kanji (日 e 火 são os dois ひ). */
export function falaDoKanji(k: KanjiEscola): FalaQuadro {
  const l = leituraDoKanji(k.char);
  return { texto: k.char, voz: 'palavra', kana: l.sozinho, palavra: { jp: k.char, kana: l.sozinho } };
}

function quadroKanji(k: KanjiEscola): Quadro {
  const l = leituraDoKanji(k.char);
  return {
    tipo: 'quadro',
    grande: k.char,
    leitura: l.sozinho,
    pt: k.significado,
    linhas: [k.associacao, ...(l.outras.length > 0 ? [`Dentro de palavras também: ${l.outras.join(', ')}.`] : [])],
    exemplos: k.exemplos,
    fala: falaDoKanji(k),
    falasExemplos: k.exemplos.map((ex) => falaComKanji(ex.jp)),
    carta: doKanjiMon.has(k.char) ? cardKey(`k:${k.char}`, 'meaning') : undefined,
  };
}

function perguntaKanji(k: KanjiEscola, grupo: readonly KanjiEscola[]): Pergunta {
  const i = grupo.indexOf(k);
  const erradas = [1, 2].map((d) => (grupo[(i + d) % grupo.length] as KanjiEscola).significado);
  return {
    tipo: 'pergunta',
    id: `kanji:${k.char}`,
    enunciado: `O que quer dizer ${k.char}?`,
    correta: k.significado,
    erradas,
    japones: false,
    carta: doKanjiMon.has(k.char) ? cardKey(`k:${k.char}`, 'meaning') : undefined,
    fala: falaDoKanji(k),
  };
}

/** Os grupos de 6 kanji da escola-japones, na mesma ordem. */
export const GRUPOS_KANJI: readonly (readonly KanjiEscola[])[] = (() => {
  const out: KanjiEscola[][] = [];
  for (let i = 0; i < KANJI_ESCOLA.length; i += 6) out.push(KANJI_ESCOLA.slice(i, i + 6));
  return out;
})();

const kanji = GRUPOS_KANJI.map((g, i) => licao(`kanji:${i + 1}`, `Kanji ${i + 1}: ${g.map((k) => k.char).join(' ')}`, emTrios(g, quadroKanji, (k) => perguntaKanji(k, g))));

// ───────── Índice ─────────

export const LICOES: readonly Licao[] = [...fundamentos, sons, ...expressoes, ...gramatica, ...vocabulario.filter((l) => !l.id.startsWith('vocab:sons:')), ...kanji, ...situacoes];

const porId = new Map(LICOES.map((l) => [l.id, l]));

export function acharLicao(id: string): Licao | undefined {
  return porId.get(id);
}
