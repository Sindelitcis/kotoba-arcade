/**
 * Save local, versionado, com exportar e importar. Sem login e sem servidor.
 * Tudo que um jogo quiser guardar vai em `games[idDoJogo]`.
 */
import { State, type CardState } from './srs';

/**
 * 1: o primeiro save.
 * 2: "ensinar antes de cobrar" (core/ensino.ts). Ter carta passou a querer dizer "já foi
 *    apresentado". No save 1, os jogos criavam carta sem apresentar nada, então a carta de lá
 *    não prova que a pessoa viu o item: ver `cartasDoSave1`.
 */
export const SAVE_VERSION = 2;
export const SAVE_KEY = 'kotoba-arcade:save';

export interface Settings {
  /** Som ligado (música, efeitos e voz). Desligado, nada toca. */
  sound: boolean;
  /** Volumes de 0 a 1 de cada parte do som (ajuste fino; o `sound` desliga tudo). */
  volMusica: number;
  volEfeitos: number;
  volVoz: number;
  voice: boolean;
  /** Reduz tremor de tela e partículas. */
  calm: boolean;
  /** Tema da tela: o do sistema, claro ou escuro (docs/estilo.md). */
  tema: Tema;
  /** Ritmo de estudo: quanto os jogos oferecem o Aprofundar sozinhos (ver `core/aprofundar`). */
  ritmo: Ritmo;
  /** Leitura em cima do kanji: sempre, ou só nos kanji cuja leitura ainda não está firme. */
  furigana: ModoFurigana;
}

export type ModoFurigana = 'sempre' | 'aprendendo';
export const MODOS_FURIGANA: readonly ModoFurigana[] = ['sempre', 'aprendendo'];

export type Tema = 'auto' | 'claro' | 'escuro';
const TEMAS: readonly Tema[] = ['auto', 'claro', 'escuro'];

/** `jogo`: nunca oferece. `equilibrado`: depois de errar o mesmo item duas vezes. `estudo`: depois de cada erro e de cada item novo. */
export type Ritmo = 'jogo' | 'equilibrado' | 'estudo';
export const RITMOS: readonly Ritmo[] = ['jogo', 'equilibrado', 'estudo'];

export interface Profile {
  xp: number;
  coins: number;
  /** Dias em que jogou (AAAA-MM-DD, horário local). Nunca zera. */
  daysPlayed: string[];
  lastGame?: string;
}

export interface SaveData {
  v: number;
  createdAt: number;
  updatedAt: number;
  profile: Profile;
  settings: Settings;
  /** Memória espaçada: chave da carta → estado do FSRS. */
  cards: Record<string, CardState>;
  games: Record<string, unknown>;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function emptySave(now: number): SaveData {
  return {
    v: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    profile: { xp: 0, coins: 0, daysPlayed: [] },
    settings: { sound: true, volMusica: 0.6, volEfeitos: 0.8, volVoz: 1, voice: true, calm: false, tema: 'auto', ritmo: 'equilibrado', furigana: 'sempre' },
    cards: {},
    games: {},
  };
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

const CARD_NUMBERS = ['due', 'stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'learning_steps', 'reps', 'lapses'] as const;

/** Uma carta só entra se o FSRS consegue usá-la. Carta estragada some; ela volta a ser "nova". */
function isCard(x: unknown): x is CardState {
  if (!isObject(x)) return false;
  const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (!CARD_NUMBERS.every((k) => finite(x[k]))) return false;
  if (!(typeof x.state === 'number' && Number.isInteger(x.state) && x.state >= 0 && x.state <= 3)) return false;
  return x.last_review === undefined || finite(x.last_review);
}

function cleanCards(input: unknown): Record<string, CardState> {
  const out: Record<string, CardState> = {};
  if (!isObject(input)) return out;
  for (const [k, v] of Object.entries(input)) if (isCard(v)) out[k] = v;
  return out;
}

/**
 * Cartas de um save da versão 1. Lá, qualquer jogo criava carta ao mostrar uma palavra, sem
 * apresentar (a Memória punha armário, cama e cadeira no quadro sem nunca ter ensinado). Fica
 * só o item que a pessoa já sabe de verdade: pelo menos uma carta dele em revisão no FSRS.
 * O resto sai e volta a ser novo, para ser apresentado antes da primeira pergunta.
 */
export function cartasDoSave1(cards: Record<string, CardState>): Record<string, CardState> {
  const item = (k: string) => (k.includes('#') ? k.slice(0, k.lastIndexOf('#')) : k);
  const sabidos = new Set<string>();
  for (const [k, c] of Object.entries(cards)) if (c.state === State.Review) sabidos.add(item(k));
  const out: Record<string, CardState> = {};
  for (const [k, c] of Object.entries(cards)) if (sabidos.has(item(k))) out[k] = c;
  return out;
}

/** Valida e completa um save vindo de fora (arquivo importado, versão antiga). */
export function normalizeSave(input: unknown, now: number): SaveData {
  if (!isObject(input)) throw new Error('Arquivo de save inválido.');
  if (typeof input.v !== 'number') throw new Error('Arquivo de save sem versão.');
  if (input.v > SAVE_VERSION) throw new Error('Este save é de uma versão mais nova do jogo.');
  const base = emptySave(now);
  const profile = isObject(input.profile) ? input.profile : {};
  const settings = isObject(input.settings) ? input.settings : {};
  const num = (x: unknown, fallback: number) => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);
  const vol = (x: unknown, fallback: number) => Math.min(1, Math.max(0, num(x, fallback)));
  return {
    v: SAVE_VERSION,
    createdAt: num(input.createdAt, now),
    updatedAt: num(input.updatedAt, now),
    profile: {
      xp: Math.max(0, num(profile.xp, 0)),
      coins: Math.max(0, num(profile.coins, 0)),
      daysPlayed: Array.isArray(profile.daysPlayed)
        ? profile.daysPlayed.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
        : [],
      lastGame: typeof profile.lastGame === 'string' ? profile.lastGame : undefined,
    },
    settings: {
      sound: typeof settings.sound === 'boolean' ? settings.sound : base.settings.sound,
      volMusica: vol(settings.volMusica, base.settings.volMusica),
      volEfeitos: vol(settings.volEfeitos, base.settings.volEfeitos),
      volVoz: vol(settings.volVoz, base.settings.volVoz),
      voice: typeof settings.voice === 'boolean' ? settings.voice : base.settings.voice,
      calm: typeof settings.calm === 'boolean' ? settings.calm : base.settings.calm,
      tema: TEMAS.includes(settings.tema as Tema) ? (settings.tema as Tema) : base.settings.tema,
      ritmo: RITMOS.includes(settings.ritmo as Ritmo) ? (settings.ritmo as Ritmo) : base.settings.ritmo,
      furigana: MODOS_FURIGANA.includes(settings.furigana as ModoFurigana) ? (settings.furigana as ModoFurigana) : base.settings.furigana,
    },
    cards: input.v < 2 ? cartasDoSave1(cleanCards(input.cards)) : cleanCards(input.cards),
    games: isObject(input.games) ? input.games : {},
  };
}

export function loadSave(store: KeyValueStore, now: number): SaveData {
  const text = store.getItem(SAVE_KEY);
  if (!text) return emptySave(now);
  try {
    return normalizeSave(JSON.parse(text), now);
  } catch {
    // Save corrompido: guarda uma cópia para não perder nada e começa limpo.
    try {
      store.setItem(`${SAVE_KEY}:corrompido:${now}`, text);
    } catch {
      // Sem espaço nem para a cópia: o jogo abre mesmo assim.
    }
    return emptySave(now);
  }
}

/** Grava o save. Devolve false se o navegador recusou (espaço cheio, modo privado): o jogo segue na memória. */
export function writeSave(store: KeyValueStore, data: SaveData, now: number): boolean {
  data.updatedAt = now;
  try {
    store.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function exportSave(data: SaveData): string {
  return JSON.stringify(data, null, 1);
}

export function importSave(text: string, now: number): SaveData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Não consegui ler o arquivo. Ele precisa ser o .json exportado pelo jogo.');
  }
  return normalizeSave(parsed, now);
}

export function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

/** Nome de cada ritmo nos Ajustes, de "mais jogo" a "mais estudo". */
export const NOME_RITMO: Record<Ritmo, string> = {
  jogo: 'Mais jogo',
  equilibrado: 'Equilibrado',
  estudo: 'Mais estudo',
};

export const EXPLICA_RITMO: Record<Ritmo, string> = {
  jogo: 'O Aprofundar só abre quando você pedir (F4 ou o botão do livro).',
  equilibrado: 'Errou a mesma coisa duas vezes? O jogo oferece o Aprofundar dela, num cantinho. Ignore e a oferta some.',
  estudo: 'Depois de cada erro e de cada palavra nova, o jogo oferece o Aprofundar dela. Ignore e a oferta some.',
};

export const NOME_FURIGANA: Record<ModoFurigana, string> = {
  sempre: 'Sempre',
  aprendendo: 'Só no que ainda aprendo',
};

export const EXPLICA_FURIGANA: Record<ModoFurigana, string> = {
  sempre: 'Todo kanji vem com a leitura em kana por cima.',
  aprendendo: 'A leitura some do kanji que você já lê bem (a leitura dele aguenta uma semana sem revisar). O resto continua com ela.',
};
