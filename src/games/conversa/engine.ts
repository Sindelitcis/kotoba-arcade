/**
 * Regras da Conversa, sem tela. O jogador escolhe uma cena curta (pedir comida,
 * perguntar o caminho...) e conversa em japonês com um personagem. Quem fala
 * pelo personagem é um modelo de IA rodando no PC do jogador, que chega aqui
 * por uma interface (`AiClient`): o texto que pedimos a ele e a conferência do
 * que ele devolve ficam neste arquivo, e os testes usam um cliente falso.
 *
 * Ensinar antes de cobrar (core/ensino.ts): antes da conversa, o vocabulário novo da cena
 * é apresentado (`termosParaApresentar`). Palavra que aparece na conversa sem ter sido
 * apresentada só é apresentada ali (primeiro contato), sem nota.
 */
import { cardKey, WORDS } from '../../content';
import { DAILY_WORDS } from '../../content/vida';
import { hasKanji, kanaToRomaji, kataToHira, romajiToHiragana, toHalfWidth } from '../../core/kana';
import { pickNext } from '../../core/picker';
import { levelInfo } from '../../core/progress';
import type { Rng } from '../../core/rng';
import type { Profile } from '../../core/save';
import { apresentar, avaliar, foiApresentado, NOVOS_MAX, novidades } from '../../core/ensino';
import { isDue, type CardState } from '../../core/srs';

/** Quantas vezes o jogador fala antes de o personagem se despedir. */
export const MAX_TURNOS = 10;
/** Passou disso, a próxima fala do personagem é a despedida. */
export const LIMITE_MS = 4 * 60_000;
export const XP_TURNO = 6;
export const XP_PASSO = 12;
export const XP_FIM = 20;
export const MOEDAS_PASSO = 5;
export const MOEDAS_FIM = 10;
const MAX_FALA = 90;

export interface ConversaSave {
  conversas: number;
  concluidas: number;
  falas: number;
  /** Quantas vezes cada cena foi concluída. */
  cenas: Record<string, number>;
}

export function emptyConversaSave(): ConversaSave {
  return { conversas: 0, concluidas: 0, falas: 0, cenas: {} };
}

/** Devolve o save do jogo dentro de `games`, criando ou completando campos. Sempre o mesmo objeto. */
export function ensureConversaSave(games: Record<string, unknown>): ConversaSave {
  const base = emptyConversaSave();
  const current = games.conversa;
  if (typeof current !== 'object' || current === null || Array.isArray(current)) {
    games.conversa = base;
    return base;
  }
  const save = current as Record<string, unknown>;
  for (const k of ['conversas', 'concluidas', 'falas'] as const) {
    if (typeof save[k] !== 'number' || !Number.isFinite(save[k])) save[k] = 0;
  }
  if (typeof save.cenas !== 'object' || save.cenas === null || Array.isArray(save.cenas)) save.cenas = {};
  const cenas = save.cenas as Record<string, unknown>;
  for (const [k, v] of Object.entries(cenas)) if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) delete cenas[k];
  return save as unknown as ConversaSave;
}

/** Pedaço de texto com a leitura por cima (furigana). Sem `r`, é só texto. */
export interface Ruby {
  t: string;
  r?: string;
}

export interface Texto {
  jp: string;
  kana: string;
  ruby: Ruby[];
}

const KANJI_RUN = /([一-鿿々]+)\[([ぁ-ゖー]+)\]/g;
const TEM_JAPONES = /[ぁ-ゖァ-ヺ一-鿿々]/;

/** "駅[えき]はどこですか" → texto, leitura e furigana. É como as falas fixas são escritas aqui. */
export function marcado(texto: string): Texto {
  const ruby: Ruby[] = [];
  let last = 0;
  for (const m of texto.matchAll(KANJI_RUN)) {
    if (m.index > last) ruby.push({ t: texto.slice(last, m.index) });
    ruby.push({ t: m[1] as string, r: m[2] as string });
    last = m.index + m[0].length;
  }
  if (last < texto.length) ruby.push({ t: texto.slice(last) });
  return {
    jp: ruby.map((x) => x.t).join(''),
    kana: ruby.map((x) => x.r ?? x.t).join(''),
    ruby,
  };
}

/** Palavra como o analisador do servidor devolve: como se escreve e como se lê. */
export interface Token {
  t: string;
  r?: string;
}

/**
 * Monta o furigana a partir das palavras analisadas. A leitura vai só em cima
 * dos kanji: em 食べます o べます fica fora, em お水 o お fica fora.
 */
export function montarRuby(tokens: readonly Token[]): Ruby[] {
  const out: Ruby[] = [];
  const plain = (t: string) => {
    if (!t) return;
    const prev = out[out.length - 1];
    if (prev && !prev.r) prev.t += t;
    else out.push({ t });
  };
  for (const tk of tokens) {
    const reading = tk.r ? kataToHira(tk.r) : '';
    if (!hasKanji(tk.t) || !reading || reading === kataToHira(tk.t)) {
      plain(tk.t);
      continue;
    }
    let head = 0;
    while (head < tk.t.length && head < reading.length && !hasKanji(tk.t[head] as string) && kataToHira(tk.t[head] as string) === reading[head]) head++;
    let tail = 0;
    while (
      tail < tk.t.length - head &&
      tail < reading.length - head &&
      !hasKanji(tk.t[tk.t.length - 1 - tail] as string) &&
      kataToHira(tk.t[tk.t.length - 1 - tail] as string) === reading[reading.length - 1 - tail]
    ) {
      tail++;
    }
    const middle = tk.t.slice(head, tk.t.length - tail);
    const middleReading = reading.slice(head, reading.length - tail);
    plain(tk.t.slice(0, head));
    if (middle && middleReading) out.push({ t: middle, r: middleReading });
    else plain(middle);
    plain(tk.t.slice(tk.t.length - tail));
  }
  return out;
}

export interface Termo {
  /** Mesma chave das palavras do resto do fliperama: `w:` + como se escreve. */
  id: string;
  jp: string;
  kana: string;
  pt: string;
  /** Outras formas em kana que contam como a mesma palavra (verbo conjugado). */
  formas?: string[];
}

function termo(texto: string, pt: string, formas?: string[]): Termo {
  const { jp, kana } = marcado(texto);
  return { id: `w:${jp}`, jp, kana, pt, formas };
}

export interface Passo {
  id: string;
  pt: string;
  /** Expressões (em hiragana) que cumprem o passo sozinhas, mesmo se o modelo esquecer de marcar. */
  sinais?: string[];
}

const AGRADECER = ['ありがとう', 'しつれいします', 'さようなら', 'どうも'];

/** O jogador disse uma das expressões que cumprem o passo? */
export function cumpreSozinho(passo: Passo, fala: string, leitura = ''): boolean {
  const kana = kataToHira(`${fala}\n${leitura}`);
  return (passo.sinais ?? []).some((s) => kana.includes(s));
}

export interface Sugestao {
  jp: string;
  kana: string;
  romaji: string;
  pt: string;
}

const FORA: [string, string][] = [
  ['ふぁ', 'fa'],
  ['ふぃ', 'fi'],
  ['ふぇ', 'fe'],
  ['ふぉ', 'fo'],
  ['てぃ', 'ti'],
  ['でぃ', 'di'],
  ['うぃ', 'wi'],
  ['うぇ', 'we'],
];
/** Partícula sozinha se fala diferente de como se escreve. */
const PARTICULA: Record<string, string> = { は: 'wa', を: 'o', へ: 'e' };

/** Romaji para ler em voz alta, com sons de palavra estrangeira (ふぁ = fa). */
export function romajiDe(kana: string): string {
  let s = kataToHira(kana);
  for (const [k, r] of FORA) s = s.replaceAll(k, r);
  return kanaToRomaji(s);
}

/** Romaji com as palavras separadas, a partir das palavras analisadas. */
export function romajiDasPalavras(tokens: readonly Token[]): string {
  return tokens
    .map((tk) => PARTICULA[tk.t] ?? romajiDe(tk.r ?? tk.t))
    .filter((w) => /[a-z]/.test(w))
    .join(' ');
}

function sugestao(texto: string, romaji: string, pt: string): Sugestao {
  const { jp, kana } = marcado(texto);
  return { jp, kana, romaji, pt };
}

export interface Cena {
  id: string;
  titulo: string;
  jp: string;
  /** Uma linha para a tela de escolha. */
  resumo: string;
  /** O que está acontecendo, para o jogador. */
  lugar: string;
  personagem: { nome: string; papel: string; voz: string };
  /** O que o modelo precisa saber para fazer o papel. */
  papel: string;
  passos: Passo[];
  abertura: { texto: string; pt: string };
  /** Dica e respostas prontas para a primeira fala: o primeiro contato ensina antes de cobrar. */
  primeiraDica: string;
  primeiras: Sugestao[];
  vocabulario: Termo[];
}

export const CENAS: readonly Cena[] = [
  {
    id: 'pedido',
    titulo: 'Pedir no café',
    jp: '注文',
    resumo: 'Peça algo, veja quanto custa e pague.',
    lugar: 'Você entrou num café pequeno em Tóquio. A atendente veio até a sua mesa.',
    personagem: { nome: 'Sakura', papel: 'atendente do café', voz: 'sakura' },
    papel:
      'Você é Sakura (さくら), atendente de um café pequeno em Tóquio. O cliente acabou de sentar. O café tem コーヒー (400円), お茶 (300円), お水 (de graça), ケーキ (500円) e サンドイッチ (600円). Anote o pedido, diga o preço quando ele perguntar ou pedir a conta, e receba o pagamento (現金 ou カード).',
    passos: [
      { id: 'pedir', pt: 'Pedir algo para comer ou beber' },
      { id: 'conta', pt: 'Perguntar quanto custa ou pedir a conta' },
      { id: 'pagar', pt: 'Pagar e agradecer' },
    ],
    abertura: {
      texto: 'いらっしゃいませ。ご注文[ちゅうもん]は？',
      pt: 'Bem-vindo! O que vai pedir?',
    },
    primeiraDica: 'Peça uma bebida. "... o kudasai" quer dizer "me dá ..., por favor".',
    primeiras: [
      sugestao('コーヒーをください', 'koohii o kudasai', 'Um café, por favor.'),
      sugestao('お水[みず]をお願[ねが]いします', 'omizu o onegaishimasu', 'Uma água, por favor.'),
    ],
    vocabulario: [
      termo('ください', 'me dá, por favor'),
      termo('お願[ねが]いします', 'por favor (pedindo algo)'),
      termo('コーヒー', 'café'),
      termo('お水[みず]', 'água'),
      termo('お茶[ちゃ]', 'chá'),
      termo('ケーキ', 'bolo'),
      termo('注文[ちゅうもん]', 'pedido'),
      termo('いくら', 'quanto custa'),
      termo('お会計[かいけい]', 'a conta'),
      termo('円[えん]', 'iene'),
      termo('カード', 'cartão'),
      termo('現金[げんきん]', 'dinheiro vivo'),
      termo('ありがとうございます', 'obrigado', ['ありがとうございました']),
    ],
  },
  {
    id: 'caminho',
    titulo: 'Perguntar o caminho',
    jp: '道',
    resumo: 'Descubra como chegar à estação.',
    lugar: 'Você está perdido numa rua de Osaka e parou um senhor que passava.',
    personagem: { nome: 'Takeshi', papel: 'morador do bairro', voz: 'takeshi' },
    papel:
      'Você é Takeshi (たけし), um senhor simpático que mora em Osaka. Um estrangeiro parou você na rua. A estação (駅) fica perto: seguir reto (まっすぐ), virar à direita (右) no semáforo (信号), uns 5 minutos a pé. Explique em pedaços pequenos, um de cada vez.',
    passos: [
      { id: 'perguntar', pt: 'Perguntar onde fica a estação' },
      {
        id: 'confirmar',
        pt: 'Confirmar o caminho (direita, esquerda, reto, perto, longe)',
      },
      { id: 'agradecer', pt: 'Agradecer', sinais: AGRADECER },
    ],
    abertura: { texto: 'はい、どうしましたか？', pt: 'Pois não, o que houve?' },
    primeiraDica: 'Pergunte onde fica a estação. "... wa doko desu ka" quer dizer "onde fica ...?".',
    primeiras: [
      sugestao('すみません、駅[えき]はどこですか', 'sumimasen, eki wa doko desu ka', 'Com licença, onde fica a estação?'),
      sugestao('駅[えき]に行[い]きたいです', 'eki ni ikitai desu', 'Quero ir à estação.'),
    ],
    vocabulario: [
      termo('すみません', 'com licença / desculpe'),
      termo('駅[えき]', 'estação'),
      termo('どこ', 'onde'),
      termo('右[みぎ]', 'direita'),
      termo('左[ひだり]', 'esquerda'),
      termo('まっすぐ', 'reto, em frente'),
      termo('信号[しんごう]', 'semáforo'),
      termo('近[ちか]い', 'perto', ['ちかく']),
      termo('遠[とお]い', 'longe', ['とおく']),
      termo('行[い]く', 'ir', ['いき', 'いって', 'いけ']),
      termo('分[わ]かりました', 'entendi'),
      termo('ありがとうございます', 'obrigado', ['ありがとうございました']),
    ],
  },
  {
    id: 'apresentacao',
    titulo: 'Se apresentar',
    jp: '自己紹介',
    resumo: 'Conheça uma colega de casa e fale de você.',
    lugar: 'Primeiro dia na casa compartilhada. Uma moradora veio falar com você na cozinha.',
    personagem: { nome: 'Yui', papel: 'colega de casa', voz: 'yui' },
    papel:
      'Você é Yui (ゆい), 24 anos, mora numa casa compartilhada em Tóquio e trabalha numa livraria. Um morador novo, estrangeiro, acabou de chegar. Você é curiosa e gentil: pergunta o nome, de onde ele é e do que ele gosta, e conta um pouco de você quando ele perguntar.',
    passos: [
      { id: 'nome', pt: 'Dizer o seu nome' },
      { id: 'origem', pt: 'Dizer de onde você é' },
      {
        id: 'gosto',
        pt: 'Contar algo de que você gosta ou perguntar algo a ela',
      },
    ],
    abertura: {
      texto: 'はじめまして。ゆいです。お名前[なまえ]は？',
      pt: 'Prazer. Sou a Yui. Qual é o seu nome?',
    },
    primeiraDica: 'Diga o seu nome e termine com "desu". Ex.: "Rafa desu".',
    primeiras: [
      sugestao('はじめまして。ラファです', 'hajimemashite. rafa desu', 'Prazer. Sou o Rafa. (troque pelo seu nome)'),
      sugestao('よろしくお願[ねが]いします', 'yoroshiku onegaishimasu', 'Prazer em conhecer, conto com você.'),
    ],
    vocabulario: [
      termo('はじめまして', 'prazer em conhecer'),
      termo('名前[なまえ]', 'nome'),
      termo('ブラジル', 'Brasil'),
      termo('出身[しゅっしん]', 'de onde a pessoa é'),
      termo('来[き]ました', 'vim'),
      termo('好[す]き', 'gostar'),
      termo('仕事[しごと]', 'trabalho'),
      termo('日本語[にほんご]', 'língua japonesa'),
      termo('勉強[べんきょう]', 'estudo'),
      termo('趣味[しゅみ]', 'passatempo'),
      termo('よろしくお願[ねが]いします', 'conto com você'),
    ],
  },
  {
    id: 'entrevista',
    titulo: 'Entrevista de trabalho',
    jp: '面接',
    resumo: 'Uma entrevista simples para um bico num restaurante.',
    lugar: 'Você se candidatou a um trabalho de meio período num restaurante. O gerente chamou você para conversar.',
    personagem: {
      nome: 'Tanaka',
      papel: 'gerente do restaurante',
      voz: 'tanaka',
    },
    papel:
      'Você é Tanaka (田中), gerente de um restaurante de lámen em Tóquio, entrevistando um estrangeiro para um trabalho de meio período (アルバイト) na cozinha. Você é educado e paciente. Pergunte o nome e de onde ele é, depois quantos dias por semana ou em que horário ele pode trabalhar, e encerre dizendo que vai entrar em contato.',
    passos: [
      { id: 'apresentar', pt: 'Dizer o seu nome e de onde você é' },
      {
        id: 'disponibilidade',
        pt: 'Dizer quando ou quantos dias você pode trabalhar',
      },
      {
        id: 'encerrar',
        pt: 'Agradecer e se despedir com educação',
        sinais: AGRADECER,
      },
    ],
    abertura: {
      texto: 'こんにちは。田中[たなか]です。お名前[なまえ]をお願[ねが]いします。',
      pt: 'Boa tarde. Sou o Tanaka. Seu nome, por favor.',
    },
    primeiraDica: 'Diga o seu nome com "desu" e depois "yoroshiku onegaishimasu".',
    primeiras: [
      sugestao('ラファです。ブラジルから来[き]ました', 'rafa desu. burajiru kara kimashita', 'Sou o Rafa. Vim do Brasil. (troque pelo seu nome)'),
      sugestao('よろしくお願[ねが]いします', 'yoroshiku onegaishimasu', 'Conto com o senhor.'),
    ],
    vocabulario: [
      termo('アルバイト', 'trabalho de meio período'),
      termo('仕事[しごと]', 'trabalho'),
      termo('働[はたら]く', 'trabalhar', ['はたらき', 'はたらけ', 'はたらいて']),
      termo('週[しゅう]', 'semana'),
      termo('時間[じかん]', 'tempo, horas'),
      termo('いつ', 'quando'),
      termo('少[すこ]し', 'um pouco'),
      termo('できます', 'consigo, posso'),
      termo('大丈夫[だいじょうぶ]', 'tudo bem, sem problema'),
      termo('頑張[がんば]ります', 'vou me esforçar'),
      termo('来[き]ました', 'vim'),
      termo('よろしくお願[ねが]いします', 'conto com você'),
    ],
  },
];

export function getCena(id: string): Cena {
  const cena = CENAS.find((c) => c.id === id);
  if (!cena) throw new Error(`cena desconhecida: ${id}`);
  return cena;
}

/** Tudo que a conversa sabe reconhecer: o vocabulário das cenas e as palavras do resto do fliperama. */
const LEXICO: readonly Termo[] = (() => {
  const byId = new Map<string, Termo>();
  for (const c of CENAS) for (const t of c.vocabulario) if (!byId.has(t.id)) byId.set(t.id, t);
  for (const w of [...WORDS, ...DAILY_WORDS]) if (!byId.has(w.id)) byId.set(w.id, { id: w.id, jp: w.jp, kana: w.kana, pt: w.pt });
  return [...byId.values()];
})();

const DAS_CENAS = new Set(CENAS.flatMap((c) => c.vocabulario.map((t) => t.id)));

/** O que o jogador escreveu vira hiragana se veio em romaji. Kana e kanji passam como estão. */
export function paraJapones(digitado: string): string {
  const s = toHalfWidth(digitado).trim();
  if (TEM_JAPONES.test(s)) return s;
  let r = s.toLowerCase();
  for (const [k, rom] of FORA) r = r.replaceAll(rom, k);
  const kana = romajiToHiragana(r.replace(/[,;]/g, '、'));
  // Sobrou letra (palavra em outra língua, erro de digitação): fica como ele escreveu, o modelo se vira.
  return /[a-z]/.test(kana) ? s : kana;
}

/** Palavras conhecidas que aparecem num texto. `leitura` é o mesmo texto em kana, quando se tem. */
export function acharTermos(texto: string, leitura = ''): Termo[] {
  const kana = kataToHira(`${texto}\n${leitura}`);
  return LEXICO.filter((t) => {
    if (texto.includes(t.jp)) return true;
    // Palavra curta de fora das cenas só vale escrita igual: "き" aparece dentro de qualquer coisa.
    const min = DAS_CENAS.has(t.id) ? 2 : 3;
    return [t.kana, ...(t.formas ?? [])].some((f) => f.length >= min && kana.includes(kataToHira(f)));
  });
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** A IA que roda no PC. Os testes passam um cliente falso. */
export interface AiClient {
  /** Devolve o texto cru do modelo, que deve ser um JSON no formato de `ESQUEMA`. */
  chat(messages: ChatMessage[], schema: object): Promise<string>;
  /** Separa um texto em palavras com a leitura de cada uma. */
  leitura(texto: string): Promise<Token[]>;
}

export const ESQUEMA = {
  type: 'object',
  properties: {
    entendi: { type: 'boolean' },
    correcao: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          properties: { melhor: { type: 'string' }, nota: { type: 'string' } },
          required: ['melhor', 'nota'],
        },
      ],
    },
    passos: { type: 'array', items: { type: 'string' } },
    fala: { type: 'string' },
    traducao: { type: 'string' },
    dica: { type: 'string' },
    sugestoes: {
      type: 'array',
      items: {
        type: 'object',
        properties: { jp: { type: 'string' }, pt: { type: 'string' } },
        required: ['jp', 'pt'],
      },
    },
  },
  required: ['entendi', 'correcao', 'passos', 'fala', 'traducao', 'dica', 'sugestoes'],
} as const;

/** O formato da resposta para uma cena: em `passos` só cabem os ids dos objetivos dela. */
export function esquemaDa(cena: Cena): object {
  return {
    ...ESQUEMA,
    properties: {
      ...ESQUEMA.properties,
      passos: {
        type: 'array',
        items: { type: 'string', enum: cena.passos.map((p) => p.id) },
      },
    },
  };
}

export interface Correcao {
  /** O que o jogador disse. */
  dito: string;
  melhor: string;
  nota: string;
}

export interface Resposta {
  fala: string;
  traducao: string;
  entendi: boolean;
  passos: string[];
  correcao: { melhor: string; nota: string } | null;
  dica: string;
  sugestoes: { jp: string; pt: string }[];
}

/**
 * Duas falas em kana soam igual? Ignora katakana/hiragana, vogal longa (コーヒー = こおひい),
 * pontuação e as partículas escritas de um jeito e faladas de outro (は/わ, を/お, へ/え).
 */
export function mesmoSom(a: string, b: string): boolean {
  const som = (s: string) =>
    kanaToRomaji(kataToHira(semEnfeite(s)).replace(/ー/g, '').replace(/は/g, 'わ').replace(/を/g, 'お').replace(/へ/g, 'え'))
      .replace(/'/g, '')
      .replace(/ou/g, 'o')
      .replace(/ei/g, 'e')
      .replace(/([aiueo])\1+/g, '$1');
  return som(a) === som(b);
}

const semEnfeite = (s: string) => s.replace(/[\s。、．，.,!?！？「」『』…~〜]/g, '');

/** Tira o que o modelo às vezes põe na fala e a tela não quer: leitura entre parênteses, aspas, quebras. */
function limparFala(s: string): string {
  return s
    .replace(/[（(][ぁ-ゖァ-ヺーa-zA-Zāīūēō\s']+[)）]/g, '')
    .replace(/^[「『"']+|[」』"']+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const temRomaji = (s: string) => /[A-Za-zÀ-ÿ]{4,}/.test(s);

/**
 * Confere o que o modelo devolveu. Só passa uma fala curta, em japonês, sem
 * romaji. O resto (tradução, dica, sugestões, correção) é aproveitado se vier
 * bom e descartado se não vier, sem derrubar a conversa.
 */
export function lerResposta(texto: string, cena: Cena, dito = ''): { ok: true; resposta: Resposta } | { ok: false; motivo: string } {
  const start = texto.indexOf('{');
  const end = texto.lastIndexOf('}');
  if (start < 0 || end <= start) return { ok: false, motivo: 'sem json' };
  let raw: unknown;
  try {
    raw = JSON.parse(texto.slice(start, end + 1));
  } catch {
    return { ok: false, motivo: 'json quebrado' };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, motivo: 'json não é objeto' };
  const o = raw as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === 'string' ? x.trim() : '');

  const fala = limparFala(str(o.fala));
  if (!fala) return { ok: false, motivo: 'sem fala' };
  if (!TEM_JAPONES.test(fala)) return { ok: false, motivo: 'fala sem japonês' };
  if (temRomaji(fala)) return { ok: false, motivo: 'fala com romaji' };
  if (fala.length > MAX_FALA) return { ok: false, motivo: 'fala comprida' };

  const ids = new Set(cena.passos.map((p) => p.id));
  const passos = Array.isArray(o.passos) ? [...new Set(o.passos.filter((p): p is string => typeof p === 'string' && ids.has(p)))] : [];

  let correcao: Resposta['correcao'] = null;
  if (typeof o.correcao === 'object' && o.correcao !== null) {
    const c = o.correcao as Record<string, unknown>;
    const melhor = limparFala(str(c.melhor));
    const nota = str(c.nota);
    const igual = semEnfeite(kataToHira(melhor)) === semEnfeite(kataToHira(dito));
    if (melhor && nota && TEM_JAPONES.test(melhor) && !temRomaji(melhor) && melhor.length <= MAX_FALA && !igual) {
      correcao = { melhor, nota: nota.slice(0, 200) };
    }
  }

  const sugestoes: Resposta['sugestoes'] = [];
  if (Array.isArray(o.sugestoes)) {
    for (const s of o.sugestoes) {
      if (typeof s !== 'object' || s === null) continue;
      const jp = limparFala(str((s as Record<string, unknown>).jp));
      const pt = str((s as Record<string, unknown>).pt);
      if (!jp || !TEM_JAPONES.test(jp) || temRomaji(jp) || jp.length > 60) continue;
      if (sugestoes.some((x) => x.jp === jp)) continue;
      sugestoes.push({ jp, pt: pt.slice(0, 120) });
      if (sugestoes.length === 2) break;
    }
  }

  return {
    ok: true,
    resposta: {
      fala,
      traducao: str(o.traducao).slice(0, 200),
      entendi: o.entendi !== false,
      passos,
      correcao,
      dica: str(o.dica).slice(0, 200),
      sugestoes,
    },
  };
}

/** Palavras que o jogador já viu em algum jogo, com as que estão para vencer na frente: a conversa também revisa. */
export function palavrasConhecidas(cards: Readonly<Record<string, CardState>>, now: number, max = 40): Termo[] {
  const seen = LEXICO.filter((t) => cards[cardKey(t.id, 'meaning')] || cards[cardKey(t.id, 'reading')]);
  const card = (t: Termo) => (cards[cardKey(t.id, 'meaning')] ?? cards[cardKey(t.id, 'reading')]) as CardState;
  return seen
    .slice()
    .sort((a, b) => Number(isDue(card(b), now)) - Number(isDue(card(a), now)) || card(a).due - card(b).due)
    .slice(0, max);
}

/** O vocabulário da cena que ainda não foi apresentado (até cinco), na ordem da cena. */
export function termosParaApresentar(cena: Cena, cards: Readonly<Record<string, CardState>>): Termo[] {
  const chaves = novidades(
    cena.vocabulario.map((t) => cardKey(t.id, 'meaning')),
    cards,
    { max: NOVOS_MAX },
  );
  return cena.vocabulario.filter((t) => chaves.includes(cardKey(t.id, 'meaning')));
}

/** A apresentação acabou: o vocabulário vira prática. */
export function apresentarTermos(cards: Record<string, CardState>, termos: readonly Termo[], now: number): void {
  apresentar(
    cards,
    termos.map((t) => cardKey(t.id, 'meaning')),
    now,
  );
}

/** Até três palavras da cena para o personagem puxar: o que venceu primeiro, depois novidade. */
export function palavrasEmFoco(cena: Cena, cards: Readonly<Record<string, CardState>>, now: number, rng: Rng): Termo[] {
  const pool = cena.vocabulario.map((t) => cardKey(t.id, 'meaning'));
  const out: Termo[] = [];
  const recent: string[] = [];
  while (out.length < 3 && recent.length < pool.length) {
    const chosen = pickNext(pool, cards, now, rng, { recent });
    if (!chosen) break;
    recent.push(chosen.key);
    const t = cena.vocabulario.find((v) => cardKey(v.id, 'meaning') === chosen.key);
    if (t) out.push(t);
  }
  return out;
}

/** O texto que diz ao modelo quem ele é e como falar. */
export function montarPrompt(cena: Cena, conhecidas: readonly Termo[], foco: readonly Termo[]): string {
  const linhas = [
    cena.papel,
    '',
    'Você conversa em japonês com um brasileiro que está começando a aprender. Continue a cena como se fosse real.',
    '',
    'Como você fala (campo "fala"):',
    '- Só japonês, educado (です/ます), natural. Uma ou duas frases curtas, no máximo 40 caracteres no total.',
    '- Nível iniciante (JLPT N5). Nada de romaji, de leitura entre parênteses, de emoji ou de português.',
    '- Uma pergunta por vez. Se ele não entender, diga a mesma coisa de um jeito mais simples.',
    '- Nunca corrija o japonês dele dentro da fala. A correção vai no campo "correcao".',
  ];
  if (conhecidas.length > 0) linhas.push(`- Dê preferência a palavras que ele já conhece: ${conhecidas.map((t) => t.jp).join('、')}。`);
  if (foco.length > 0) linhas.push(`- Se couber na cena, use: ${foco.map((t) => t.jp).join('、')}。`);
  linhas.push(
    '',
    'O objetivo dele nesta cena tem estes passos:',
    ...cena.passos.map((p) => `- ${p.id}: ${p.pt}`),
    'Em "passos", liste os ids que ele já cumpriu, contando a conversa inteira. Só marque o que ele mesmo disse.',
    'Quando todos estiverem cumpridos, despeça-se numa frase curta.',
    '',
    'Sobre o que ele escreve: ele fala no microfone ou digita em romaji, que chega convertido para hiragana. Ignore falta de kanji, espaços, e troca de は/わ, を/お, へ/え.',
    '- "entendi": false só se a mensagem não fizer sentido na cena.',
    '- "correcao": null se deu para entender bem. Se houver um erro que muda o sentido ou soa rude, ponha em "melhor" a frase dele do jeito natural (em japonês) e em "nota" uma explicação gentil em português, de uma frase, sem a palavra "errado".',
    '- "traducao": a sua fala em português do Brasil.',
    '- "dica": uma frase em português dizendo o que ele pode fazer agora.',
    '- "sugestoes": duas respostas curtas e diferentes que ele poderia dar agora, em japonês simples, cada uma com a tradução em "pt".',
    '',
    'Responda só com o JSON.',
  );
  return linhas.join('\n');
}

export interface Linha {
  quem: 'personagem' | 'jogador';
  jp: string;
  ruby: Ruby[];
  pt?: string;
  /** O que o jogador digitou, quando foi em romaji. */
  digitado?: string;
  correcao?: Correcao;
  /** O personagem entendeu esta fala do jogador. */
  entendida?: boolean;
  /** O jogador estava com as sugestões abertas quando falou. */
  comAjuda?: boolean;
}

export interface Dica {
  /** 1 = só a dica em português. 2 = dica e duas respostas prontas. */
  nivel: 1 | 2;
  texto: string;
  sugestoes: Sugestao[];
}

export interface Resumo {
  cena: Cena;
  concluida: boolean;
  passos: { pt: string; feito: boolean }[];
  /** Falas do jogador que o personagem entendeu sem nada a ajustar. */
  bem: Linha[];
  /** No máximo duas, as primeiras que apareceram. */
  correcoes: Correcao[];
  /** Palavras que entraram na memória nesta conversa. */
  novas: Termo[];
  /** Palavras que o jogador usou por conta própria. */
  usadas: Termo[];
  turnos: number;
  xp: number;
  coins: number;
  ms: number;
}

export type Evento =
  | { t: 'linha'; linha: Linha }
  | { t: 'passo'; passo: Passo }
  | { t: 'nova'; termo: Termo }
  | { t: 'dica'; dica: Dica }
  | { t: 'levelup'; level: number }
  /** O servidor não respondeu. A fala do jogador não foi gasta: é só mandar de novo. */
  | { t: 'falha' }
  | { t: 'fim'; resumo: Resumo };

export interface ConversaDeps {
  cards: Record<string, CardState>;
  profile: Profile;
  save: ConversaSave;
  rng: Rng;
  now: () => number;
  ai: AiClient;
  /** Palavras apresentadas logo antes da conversa: entram no resumo como novas. */
  apresentadas?: readonly Termo[];
}

const RESERVA: Resposta = {
  fala: 'すみません、もう一度お願いします。',
  traducao: 'Desculpe, pode repetir?',
  entendi: true,
  passos: [],
  correcao: null,
  dica: '',
  sugestoes: [],
};

export class Conversa {
  fase: 'vez' | 'pensando' | 'fim' = 'vez';
  readonly linhas: Linha[] = [];
  readonly feitos = new Set<string>();
  turnos = 0;
  xp = 0;
  coins = 0;
  /** Nível da dica aberta nesta vez (0 = fechada). */
  nivelDica: 0 | 1 | 2 = 0;
  readonly foco: Termo[];
  private readonly historico: ChatMessage[] = [];
  private readonly esquema: object;
  private readonly novas: Termo[] = [];
  private readonly usadas: Termo[] = [];
  private readonly revistas = new Set<string>();
  private dicaTexto: string;
  private sugestoes: (Sugestao | { jp: string; pt: string })[];
  private semEntender = 0;
  private inicio = 0;
  private fim = 0;
  private fechada = false;

  constructor(
    readonly cena: Cena,
    private readonly deps: ConversaDeps,
  ) {
    const now = deps.now();
    this.foco = palavrasEmFoco(cena, deps.cards, now, deps.rng);
    this.novas.push(...(deps.apresentadas ?? []));
    this.esquema = esquemaDa(cena);
    this.dicaTexto = cena.primeiraDica;
    this.sugestoes = cena.primeiras;
    this.historico.push({
      role: 'system',
      content: montarPrompt(cena, palavrasConhecidas(deps.cards, now), this.foco),
    });
  }

  /** O personagem abre a cena com uma fala fixa. */
  iniciar(): Evento[] {
    if (this.linhas.length > 0) return [];
    const { cena, deps } = this;
    this.inicio = deps.now();
    deps.save.conversas++;
    const m = marcado(cena.abertura.texto);
    const linha: Linha = {
      quem: 'personagem',
      jp: m.jp,
      ruby: m.ruby,
      pt: cena.abertura.pt,
    };
    this.linhas.push(linha);
    this.historico.push({
      role: 'assistant',
      content: JSON.stringify({ fala: m.jp }),
    });
    return [{ t: 'linha', linha }, ...this.ouvir(m.jp, m.kana)];
  }

  /** Palavra que o personagem disse e o jogador nunca tinha visto entra na memória, como primeiro contato. */
  private ouvir(fala: string, leitura: string): Evento[] {
    const { cards, now } = this.deps;
    const events: Evento[] = [];
    for (const t of acharTermos(fala, leitura)) {
      const key = cardKey(t.id, 'meaning');
      if (foiApresentado(cards, key)) continue;
      apresentar(cards, [key], now());
      this.revistas.add(t.id);
      this.novas.push(t);
      events.push({ t: 'nova', termo: t });
    }
    return events;
  }

  /** Palavra que o jogador usou conta como lembrada. Uma vez por conversa cada. */
  private falar(jp: string, comAjuda: boolean): Evento[] {
    const { cards, now } = this.deps;
    const events: Evento[] = [];
    for (const t of acharTermos(jp)) {
      if (this.revistas.has(t.id)) continue;
      this.revistas.add(t.id);
      const key = cardKey(t.id, 'meaning');
      const nova = !foiApresentado(cards, key);
      // Usou sozinho uma palavra nunca vista: é o primeiro contato, sem nota.
      if (nova) apresentar(cards, [key], now());
      else avaliar(cards, key, { correct: true, hinted: comAjuda }, now());
      if (nova) {
        this.novas.push(t);
        events.push({ t: 'nova', termo: t });
      } else if (!comAjuda) {
        this.usadas.push(t);
      }
    }
    return events;
  }

  private async ruby(texto: string): Promise<{ ruby: Ruby[]; kana: string; romaji: string }> {
    try {
      const tokens = await this.deps.ai.leitura(texto);
      if (tokens.map((t) => t.t).join('') !== texto) throw new Error('leitura não bate com o texto');
      return {
        ruby: montarRuby(tokens),
        kana: tokens.map((t) => kataToHira(t.r ?? t.t)).join(''),
        romaji: romajiDasPalavras(tokens),
      };
    } catch {
      // Sem leitura a fala aparece sem furigana, e a conversa segue.
      const kana = hasKanji(texto) ? '' : texto;
      return {
        ruby: [{ t: texto }],
        kana,
        romaji: romajiDe(kana.replace(/[。、！？!?]/g, ' ').trim()),
      };
    }
  }

  private async perguntar(conteudo: string, dito: string): Promise<Resposta> {
    const { ai } = this.deps;
    const messages = [...this.historico, { role: 'user' as const, content: conteudo }];
    const first = lerResposta(await ai.chat(messages, this.esquema), this.cena, dito);
    if (first.ok) return first.resposta;
    const again = lerResposta(
      await ai.chat(
        [
          ...messages,
          {
            role: 'user',
            content: '(Responda de novo, só com o JSON pedido e a "fala" curta, em japonês.)',
          },
        ],
        this.esquema,
      ),
      this.cena,
      dito,
    );
    return again.ok ? again.resposta : RESERVA;
  }

  /** O jogador disse algo (falado e transcrito, ou digitado). */
  async dizer(texto: string): Promise<Evento[]> {
    if (this.fase !== 'vez') return [];
    const digitado = texto.trim().slice(0, 200);
    if (!digitado) return [];
    const { deps, cena } = this;
    const jp = paraJapones(digitado);
    const ultima = this.turnos + 1 >= MAX_TURNOS || deps.now() - this.inicio >= LIMITE_MS;
    const comAjuda = this.nivelDica === 2;

    let conteudo = jp === digitado ? jp : `${jp} (digitado em romaji: "${digitado}")`;
    // O modelo esquecia de marcar os objetivos: cada fala lembra o que ainda falta.
    const faltam = cena.passos.filter((p) => !this.feitos.has(p.id));
    conteudo += `\n(Objetivos que ele ainda não cumpriu: ${faltam.map((p) => `${p.id} = ${p.pt}`).join('; ')}. Ponha em "passos" os que esta fala cumpriu.)`;
    if (ultima) conteudo += '\n(Esta é a última fala da cena: responda e despeça-se numa frase curta.)';

    this.fase = 'pensando';
    let r: Resposta;
    try {
      r = await this.perguntar(conteudo, jp);
    } catch {
      if (this.fechada) return [];
      this.fase = 'vez';
      return [{ t: 'falha' }];
    }
    // Tudo que precisa esperar o servidor vem antes de mexer no estado: se o jogador encerrar
    // a conversa no meio, a resposta atrasada é jogada fora inteira.
    const reserva = r === RESERVA;
    const correcaoLida = r.correcao ? await this.ruby(r.correcao.melhor) : null;
    const pendentes = cena.passos.filter((p) => !this.feitos.has(p.id));
    const leitura = pendentes.some((p) => p.sinais) ? (await this.ruby(jp)).kana : '';
    const lido = await this.ruby(r.fala);
    if (this.fechada) return [];

    this.historico.push({ role: 'user', content: conteudo });
    this.historico.push({
      role: 'assistant',
      content: JSON.stringify({
        entendi: r.entendi,
        passos: r.passos,
        fala: r.fala,
      }),
    });
    this.turnos++;
    deps.save.falas++;

    const events: Evento[] = [];
    const before = levelInfo(deps.profile.xp).level;
    const minha: Linha = { quem: 'jogador', jp, ruby: [{ t: jp }], comAjuda };
    if (jp !== digitado) minha.digitado = digitado;
    if (!reserva) minha.entendida = r.entendi;
    if (r.correcao && correcaoLida) {
      // O modelo às vezes "corrige" só a escrita (こおひい → コーヒー): soa igual, então não é correção.
      if (!correcaoLida.kana || !mesmoSom(correcaoLida.kana, jp)) minha.correcao = { dito: jp, ...r.correcao };
    }
    this.linhas.push(minha);
    events.push({ t: 'linha', linha: minha });

    if (r.entendi && !reserva) {
      this.ganhar(XP_TURNO, 0);
      events.push(...this.falar(jp, comAjuda));
    }
    // O modelo às vezes não marca a despedida: "arigatou gozaimashita" encerra a entrevista de qualquer jeito.
    for (const p of pendentes) {
      if (!r.passos.includes(p.id) && !cumpreSozinho(p, jp, leitura)) continue;
      this.feitos.add(p.id);
      this.ganhar(XP_PASSO, MOEDAS_PASSO);
      events.push({ t: 'passo', passo: p });
    }

    const dela: Linha = {
      quem: 'personagem',
      jp: r.fala,
      ruby: lido.ruby,
      pt: r.traducao || undefined,
    };
    this.linhas.push(dela);
    events.push({ t: 'linha', linha: dela }, ...this.ouvir(r.fala, lido.kana));

    this.dicaTexto = r.dica;
    this.sugestoes = r.sugestoes;
    this.nivelDica = 0;
    this.semEntender = r.entendi ? 0 : this.semEntender + 1;

    if (this.feitos.size === cena.passos.length || ultima) {
      events.push({ t: 'fim', resumo: this.encerrar() });
    } else {
      this.fase = 'vez';
      // Duas falas seguidas sem o personagem entender: as respostas prontas aparecem sozinhas.
      if (this.semEntender >= 2) {
        this.nivelDica = 1;
        const dica = await this.pedirDica();
        if (!this.fechada) events.push({ t: 'dica', dica });
      }
    }
    const after = levelInfo(deps.profile.xp).level;
    if (after > before) events.push({ t: 'levelup', level: after });
    return events;
  }

  private ganhar(xp: number, coins: number): void {
    this.deps.profile.xp += xp;
    this.deps.profile.coins += coins;
    this.xp += xp;
    this.coins += coins;
  }

  /** Primeira vez: uma dica em português. Segunda: duas respostas prontas, com leitura. */
  async pedirDica(): Promise<Dica> {
    const semTexto = !this.dicaTexto;
    this.nivelDica = this.nivelDica === 0 && !semTexto ? 1 : 2;
    if (this.nivelDica === 1) return { nivel: 1, texto: this.dicaTexto, sugestoes: [] };
    const prontas: Sugestao[] = [];
    for (const s of this.sugestoes.length > 0 ? this.sugestoes : this.cena.primeiras) {
      if ('romaji' in s) {
        prontas.push(s);
        continue;
      }
      const { kana, romaji } = await this.ruby(s.jp);
      prontas.push({ jp: s.jp, kana, romaji, pt: s.pt });
    }
    this.sugestoes = prontas;
    return {
      nivel: 2,
      texto: this.dicaTexto || 'Você pode responder com uma destas:',
      sugestoes: prontas,
    };
  }

  resumo(): Resumo {
    const { cena } = this;
    const minhas = this.linhas.filter((l) => l.quem === 'jogador');
    return {
      cena,
      concluida: this.feitos.size === cena.passos.length,
      passos: cena.passos.map((p) => ({
        pt: p.pt,
        feito: this.feitos.has(p.id),
      })),
      bem: minhas
        .filter((l) => l.entendida && !l.correcao)
        .sort((a, b) => Number(!!a.comAjuda) - Number(!!b.comAjuda) || b.jp.length - a.jp.length)
        .slice(0, 3),
      correcoes: minhas.flatMap((l) => (l.correcao ? [l.correcao] : [])).slice(0, 2),
      novas: this.novas.slice(),
      usadas: this.usadas.slice(),
      turnos: this.turnos,
      xp: this.xp,
      coins: this.coins,
      ms: (this.fim || this.deps.now()) - this.inicio,
    };
  }

  /** Fecha a conversa (pelo fim da cena ou porque o jogador quis parar) e entrega o resumo. Só conta uma vez. */
  encerrar(): Resumo {
    if (!this.fechada) {
      this.fechada = true;
      this.fase = 'fim';
      this.fim = this.deps.now();
      if (this.feitos.size === this.cena.passos.length) {
        const { save } = this.deps;
        save.concluidas++;
        save.cenas[this.cena.id] = (save.cenas[this.cena.id] ?? 0) + 1;
        this.ganhar(XP_FIM, MOEDAS_FIM);
      }
    }
    return this.resumo();
  }
}

/** A cena para o "jogar agora": a primeira ainda não concluída, ou a menos jogada. */
export function proximaCena(save: ConversaSave): Cena {
  const nova = CENAS.find((c) => !save.cenas[c.id]);
  if (nova) return nova;
  return CENAS.slice().sort((a, b) => (save.cenas[a.id] ?? 0) - (save.cenas[b.id] ?? 0))[0] as Cena;
}
