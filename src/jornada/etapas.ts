/**
 * O mapa da Jornada: do zero até trabalhar no Japão, em etapas.
 *
 * Fundamentos → kana → expressões de sobrevivência → N5 → N4 → trabalho e dia a dia → N3.
 *
 * Cada etapa tem missões curtas (3 a 10 minutos): uma lição em quadrinhos ou um jogo
 * do arcade já recortado no conteúdo da etapa. O que ainda não tem conteúdo aparece em
 * `depois`, com o tema e de onde ele vem (JLPT, JF Standard/Marugoto), para a pessoa
 * ver o caminho inteiro sem achar que já está tudo pronto.
 *
 * Regras de TDAH: nada fica trancado, o tempo de cada missão aparece antes, não existe
 * contador de atraso e faltar não zera nada. O save só guarda quantas vezes cada missão
 * foi feita.
 */
import { KANJI } from '../content';
import { palavrasDoTema, TEMAS } from '../content/escola';
import type { Cena } from '../core/arte';
import type { FocoJogo } from '../core/foco';
import { palavrasDaCena } from '../games/cena/engine';
import { LUGARES } from '../games/cena/lugares';
import { GRUPOS_EXPRESSOES, GRUPOS_KANJI, LICOES } from './licoes';

export type TelaJogo = 'kanjimon' | 'kanabeat' | 'roguelike' | 'aventura' | 'gramatica' | 'conversa' | 'kanaimagens' | 'cena' | 'memoria';

export type Acao = { tipo: 'licao'; licao: string } | { tipo: 'jogo'; tela: TelaJogo; foco: FocoJogo };

export interface Missao {
  id: string;
  titulo: string;
  minutos: number;
  acao: Acao;
}

export interface Trilha {
  titulo: string;
  missoes: readonly Missao[];
}

export interface TemaFuturo {
  titulo: string;
  /** De onde vem o tema (nível do JLPT, tópico do Marugoto/JF Standard). */
  fonte: string;
}

export interface Etapa {
  id: string;
  titulo: string;
  jp: string;
  resumo: string;
  cena: Cena;
  trilhas: readonly Trilha[];
  /** Temas da etapa que ainda não têm conteúdo no arcade. */
  depois: readonly TemaFuturo[];
}

/** Nome do jogo como aparece na missão. */
export const NOME_JOGO: Record<TelaJogo, string> = {
  kanjimon: 'KanjiMon',
  kanabeat: 'Kana Beat',
  roguelike: 'Kotodama',
  aventura: 'Aventura',
  gramatica: 'Kumitate',
  conversa: 'Conversa',
  kanaimagens: 'Kana em imagens',
  cena: 'Cena Viva',
  memoria: 'Memória',
};

/** Duração de uma partida de cada jogo, em minutos. */
export const MINUTOS_JOGO: Record<TelaJogo, number> = {
  kanjimon: 5,
  kanabeat: 4,
  roguelike: 8,
  aventura: 5,
  gramatica: 5,
  conversa: 4,
  kanaimagens: 4,
  cena: 5,
  memoria: 4,
};

const licaoPorId = new Map(LICOES.map((l) => [l.id, l]));

/** Lugares da Cena Viva que abrem as primeiras palavras, na ordem da Jornada. */
const PRIMEIRAS_PALAVRAS = LUGARES.slice(0, 2);

function licao(id: string): Missao {
  const l = licaoPorId.get(id);
  if (!l) throw new Error(`lição desconhecida: ${id}`);
  return { id: `m:${id}`, titulo: l.titulo, minutos: l.minutos, acao: { tipo: 'licao', licao: id } };
}

function jogo(id: string, tela: TelaJogo, titulo: string, foco: FocoJogo): Missao {
  return { id: `m:${id}`, titulo: `${NOME_JOGO[tela]}: ${titulo}`, minutos: MINUTOS_JOGO[tela], acao: { tipo: 'jogo', tela, foco } };
}

const licoesQueComecam = (prefixo: string) => LICOES.filter((l) => l.id.startsWith(prefixo)).map((l) => licao(l.id));

// ───────── Gramática: a lição da escola e, logo depois, o Kumitate dos mesmos pontos ─────────

/**
 * Pontos do Kumitate que treinam cada lição de gramática da escola-japones. Lição sem
 * ponto correspondente fica só com os quadrinhos. Nenhum ponto foi copiado: o Kumitate
 * continua sendo a fonte das frases de montar.
 */
export const KUMITATE_DA_LICAO: Readonly<Record<string, readonly string[]>> = {
  'g-desu': ['wa'],
  'g-no-mo': ['no', 'mo'],
  'g-masu': ['masu', 'mashita'],
  'g-particulas': ['wo', 'ni', 'de'],
  'g-aru-iru': ['ga'],
  'g-tai-mashou': ['tai'],
  'g-te-kudasai': ['te'],
  'g-teimasu': ['teiru'],
};

/** Ponto do Kumitate que a escola-japones não tem: entra sozinho no N5. */
const SO_KUMITATE_N5 = ['to'];

const gramaticaN5: Missao[] = LICOES.filter((l) => l.id.startsWith('gram:')).flatMap((l) => {
  const id = l.id.slice('gram:'.length);
  const pontos = KUMITATE_DA_LICAO[id];
  const lic = licao(l.id);
  return pontos ? [lic, jogo(`kumitate:${id}`, 'gramatica', l.titulo.split(':')[0] as string, { pontos })] : [lic];
});
gramaticaN5.push(jogo('kumitate:to', 'gramatica', 'と, com quem', { pontos: SO_KUMITATE_N5 }));

// ───────── Palavras: a lição de cada tema e um jogo com as palavras dele ─────────

const palavrasN5: Missao[] = Object.entries(TEMAS)
  .filter(([tema]) => tema !== 'sons')
  .flatMap(([tema, nome], i) => {
    const ids = palavrasDoTema(tema).flatMap((p) => (p.word ? [p.word.id] : []));
    // Alterna os jogos para não ficar sempre igual: Kotodama pede significado, Kana Beat a leitura.
    const tela: TelaJogo = i % 2 === 0 ? 'roguelike' : 'kanabeat';
    return [...licoesQueComecam(`vocab:${tema}:`), jogo(`palavras:${tema}`, tela, nome, { palavras: ids })];
  });

// ───────── Kanji: a lição de cada grupo e o KanjiMon com os que ele tem ─────────

const noKanjiMon = new Set(KANJI.map((k) => k.kanji));

const kanjiN5: Missao[] = GRUPOS_KANJI.flatMap((grupo, i) => {
  const ids = grupo.filter((k) => noKanjiMon.has(k.char)).map((k) => `k:${k.char}`);
  return [licao(`kanji:${i + 1}`), jogo(`kanjimon:${i + 1}`, 'kanjimon', grupo.map((k) => k.char).join(' '), { kanji: ids })];
});

/** Kanji que o KanjiMon já tinha e a escola-japones não: entram de 8 em 8, só no jogo. */
const naEscola = new Set(GRUPOS_KANJI.flat().map((k) => k.char));
const restantes = KANJI.filter((k) => !naEscola.has(k.kanji));
const maisKanji: Missao[] = [];
for (let i = 0; i < restantes.length; i += 8) {
  const grupo = restantes.slice(i, i + 8);
  maisKanji.push(jogo(`kanji-mais:${i / 8 + 1}`, 'kanjimon', grupo.map((k) => k.kanji).join(' '), { kanji: grupo.map((k) => k.id) }));
}

// ───────── Etapas ─────────

export const ETAPAS: readonly Etapa[] = [
  {
    id: 'fundamentos',
    titulo: 'Fundamentos',
    jp: '基本',
    resumo: 'Como o japonês funciona: escrita, sons, ordem da frase e polidez.',
    cena: 'hub-shibuya',
    trilhas: [{ titulo: 'Lições', missoes: licoesQueComecam('fund:') }],
    depois: [],
  },
  {
    id: 'kana',
    titulo: 'Kana',
    jp: 'かな',
    resumo: 'Hiragana e katakana, no ritmo da música, e os sons que mudam o significado.',
    cena: 'kanabeat-dotonbori',
    trilhas: [
      {
        // Ensinar antes de cobrar, também entre os jogos: primeiro o kana com a imagem
        // (apresentação e prática), depois o Kana Beat, que cobra no ritmo.
        titulo: 'Ler e digitar',
        missoes: [
          jogo('kanaimagens:hiragana', 'kanaimagens', 'hiragana', { kana: 'hiragana' }),
          jogo('kana:hiragana', 'kanabeat', 'hiragana', { kana: 'hiragana' }),
          licao('sons'),
          jogo('kanaimagens:katakana', 'kanaimagens', 'katakana', { kana: 'katakana' }),
          jogo('kana:katakana', 'kanabeat', 'katakana', { kana: 'katakana' }),
        ],
      },
      {
        // As primeiras palavras: a Cena Viva apresenta as coisas e pergunta o nome (これは〜です);
        // a Memória treina as mesmas palavras. O KanjiMon vem no N5, com os kanji.
        titulo: 'Primeiras palavras',
        missoes: PRIMEIRAS_PALAVRAS.flatMap((l) => [
          jogo(`cena:${l.id}`, 'cena', `o nome das coisas: ${l.pt}`, { lugar: l.id }),
          jogo(`memoria:${l.id}`, 'memoria', `as coisas: ${l.pt}`, { palavras: palavrasDaCena(l, ['nome']).map((w) => w.id) }),
        ]),
      },
    ],
    depois: [],
  },
  {
    id: 'sobrevivencia',
    titulo: 'Expressões de sobrevivência',
    jp: '挨拶',
    resumo: 'As frases prontas dos primeiros dias, com o momento certo de usar cada uma.',
    cena: 'aventura-narita',
    trilhas: [
      { titulo: 'Expressões', missoes: GRUPOS_EXPRESSOES.map((g) => licao(`expr:${g.id}`)) },
      {
        titulo: 'Na rua',
        missoes: [
          jogo('aventura:aeroporto', 'aventura', 'aeroporto', { cena: 'aeroporto' }),
          jogo('aventura:estacao', 'aventura', 'estação', { cena: 'estacao' }),
          jogo('aventura:konbini', 'aventura', 'konbini', { cena: 'konbini' }),
          jogo('conversa:pedido', 'conversa', 'pedir no café', { conversa: 'pedido' }),
          jogo('conversa:caminho', 'conversa', 'perguntar o caminho', { conversa: 'caminho' }),
        ],
      },
    ],
    depois: [],
  },
  {
    id: 'n5',
    titulo: 'N5',
    jp: '初級',
    resumo: 'A base do primeiro nível do JLPT: gramática essencial, 250 palavras por tema e os kanji mais usados.',
    cena: 'kumitate-gion',
    trilhas: [
      { titulo: 'Gramática', missoes: gramaticaN5 },
      { titulo: 'Palavras por tema', missoes: palavrasN5 },
      { titulo: 'Kanji essenciais', missoes: kanjiN5 },
      { titulo: 'Mais kanji do KanjiMon', missoes: maisKanji },
    ],
    depois: [
      { titulo: 'Contadores (〜つ, 〜人, 〜枚, 〜本)', fonte: 'JLPT N5' },
      { titulo: 'Passado de adjetivos (高かった, 静かでした)', fonte: 'JLPT N5' },
      { titulo: 'Rotina e horários: o seu dia', fonte: 'Marugoto A1 · まいにちの生活' },
    ],
  },
  {
    id: 'n4',
    titulo: 'N4',
    jp: '初中級',
    resumo: 'A forma simples dos verbos, que abre a conversa entre amigos e a maior parte da gramática do N4.',
    cena: 'kotodama-inari',
    trilhas: [
      {
        titulo: 'Forma simples',
        missoes: [jogo('kumitate:nai', 'gramatica', 'ない, não', { pontos: ['nai'] }), jogo('kumitate:ta', 'gramatica', 'た, já foi', { pontos: ['ta'] })],
      },
    ],
    depois: [
      { titulo: 'Forma de dicionário e os três grupos de verbo', fonte: 'JLPT N4' },
      { titulo: 'Comparar: より e のほうが', fonte: 'JLPT N4' },
      { titulo: 'Experiência: 〜たことがあります', fonte: 'JLPT N4' },
      { titulo: 'Dar e receber: あげる, くれる, もらう', fonte: 'JLPT N4' },
      { titulo: 'Conseguir fazer: forma potencial', fonte: 'JLPT N4' },
      { titulo: 'Se e quando: 〜たら', fonte: 'JLPT N4' },
      { titulo: 'Obrigação: 〜なければなりません', fonte: 'JLPT N4' },
      { titulo: 'Tentar fazer: 〜てみる', fonte: 'JLPT N4' },
      { titulo: 'Viagem e passeio', fonte: 'Marugoto A2 · 旅行' },
      { titulo: 'Gostos e passatempos', fonte: 'Marugoto A2 · 好きなこと' },
    ],
  },
  {
    id: 'trabalho',
    titulo: 'Trabalho e dia a dia',
    jp: '仕事',
    resumo: 'Diálogos completos: primeiro dia na empresa, telefone, reunião, farmácia, restaurante.',
    cena: 'conversa-restaurante',
    trilhas: [
      { titulo: 'Situações', missoes: licoesQueComecam('sit:') },
      {
        titulo: 'Na prática',
        missoes: [
          jogo('conversa:apresentacao', 'conversa', 'se apresentar', { conversa: 'apresentacao' }),
          jogo('conversa:entrevista', 'conversa', 'entrevista de trabalho', { conversa: 'entrevista' }),
        ],
      },
    ],
    depois: [
      { titulo: 'Avisar, relatar e consultar (報連相)', fonte: 'JF Standard A2 · trabalho' },
      { titulo: 'Escala de turnos e pedir folga (シフト)', fonte: 'JF Standard A2 · trabalho' },
      { titulo: 'Currículo japonês (履歴書)', fonte: 'JF Standard A2 · trabalho' },
      { titulo: 'Regras de segurança e avisos do local', fonte: 'JF Standard A2 · trabalho' },
      { titulo: 'Holerite, imposto e seguro', fonte: 'JF Standard A2 · vida no Japão' },
      { titulo: 'Prefeitura, lixo e contrato de aluguel', fonte: 'Marugoto A2 · 町と住まい' },
    ],
  },
  {
    id: 'n3',
    titulo: 'N3',
    jp: '中級',
    resumo: 'O nível pedido em muitas vagas: keigo em uso, ler avisos e notícias simples, dar opinião.',
    cena: 'conversa-osaka',
    trilhas: [],
    depois: [
      { titulo: 'Keigo em uso: respeitoso e humilde', fonte: 'JLPT N3' },
      { titulo: 'Dar opinião: 〜と思います, 〜ので', fonte: 'JLPT N3' },
      { titulo: 'Fazer junto: 〜ながら, 〜ために', fonte: 'JLPT N3' },
      { titulo: 'Voz passiva e causativa', fonte: 'JLPT N3' },
      { titulo: 'Ler avisos e comunicados', fonte: 'JLPT N3 · leitura' },
      { titulo: 'E-mail de trabalho', fonte: 'Marugoto B1 · 仕事' },
      { titulo: 'Notícias simples', fonte: 'JLPT N3 · leitura' },
      { titulo: 'Saúde: consulta e seguro', fonte: 'Marugoto B1 · 健康' },
    ],
  },
];

export const MISSOES: readonly Missao[] = ETAPAS.flatMap((e) => e.trilhas.flatMap((t) => t.missoes));

const missaoPorId = new Map(MISSOES.map((m) => [m.id, m]));

export function acharMissao(id: string): Missao | undefined {
  return missaoPorId.get(id);
}

export function missoesDa(etapa: Etapa): Missao[] {
  return etapa.trilhas.flatMap((t) => t.missoes);
}

// ───────── Save ─────────

export interface JornadaSave {
  /** Missão → quantas vezes foi feita. Só cresce. */
  feitas: Record<string, number>;
  /** Etapa aberta da última vez, para voltar nela. */
  etapa?: string;
}

export function ensureJornadaSave(games: Record<string, unknown>): JornadaSave {
  const raw = games.jornada as Partial<JornadaSave> | undefined;
  const feitas: Record<string, number> = {};
  if (raw && typeof raw.feitas === 'object' && raw.feitas) {
    for (const [k, v] of Object.entries(raw.feitas)) if (typeof v === 'number' && Number.isFinite(v) && v > 0) feitas[k] = Math.floor(v);
  }
  const save: JornadaSave = { feitas };
  if (raw && typeof raw.etapa === 'string' && ETAPAS.some((e) => e.id === raw.etapa)) save.etapa = raw.etapa;
  games.jornada = save;
  return save;
}

export function registrarMissao(save: JornadaSave, missao: string): void {
  save.feitas[missao] = (save.feitas[missao] ?? 0) + 1;
}

/** Quanto da etapa já foi feito, de 0 a 1 (cada missão conta uma vez). */
export function andamento(etapa: Etapa, save: JornadaSave): number {
  const ms = missoesDa(etapa);
  if (ms.length === 0) return 0;
  return ms.filter((m) => (save.feitas[m.id] ?? 0) > 0).length / ms.length;
}

/**
 * Próxima missão sugerida: a primeira ainda não feita, na ordem do mapa (ou da etapa
 * pedida). Com tudo feito, a que foi feita menos vezes. Nunca depende de data: quem
 * some por uma semana volta para o mesmo ponto, sem nada atrasado.
 */
export function proximaMissao(save: JornadaSave, etapa?: Etapa): Missao | undefined {
  const lista = etapa ? missoesDa(etapa) : MISSOES;
  const nova = lista.find((m) => !save.feitas[m.id]);
  if (nova) return nova;
  return lista.slice().sort((a, b) => (save.feitas[a.id] ?? 0) - (save.feitas[b.id] ?? 0))[0];
}

/** Etapa de uma missão. */
export function etapaDa(missao: string): Etapa | undefined {
  return ETAPAS.find((e) => missoesDa(e).some((m) => m.id === missao));
}
