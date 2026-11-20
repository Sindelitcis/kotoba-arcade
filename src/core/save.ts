/**
 * Save local, versionado, com exportar e importar. Sem login e sem servidor.
 * Tudo que um jogo quiser guardar vai em `games[idDoJogo]`.
 */
import type { CardState } from './srs';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'kotoba-arcade:save';

export interface Settings {
  sound: boolean;
  voice: boolean;
  /** Reduz tremor de tela e partículas. */
  calm: boolean;
  /**
   * Português das aulas pela voz do servidor local (`npm run aulas`), quando ele estiver no ar.
   * Desligado, o site nem procura o servidor e usa a voz livre gravada em `public/vozes-pt`.
   * Numa página aberta no próprio PC (localhost), ele é procurado sempre.
   */
  vozLocal: boolean;
}

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
    settings: { sound: true, voice: true, calm: false, vozLocal: false },
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

/** Valida e completa um save vindo de fora (arquivo importado, versão antiga). */
export function normalizeSave(input: unknown, now: number): SaveData {
  if (!isObject(input)) throw new Error('Arquivo de save inválido.');
  if (typeof input.v !== 'number') throw new Error('Arquivo de save sem versão.');
  if (input.v > SAVE_VERSION) throw new Error('Este save é de uma versão mais nova do jogo.');
  const base = emptySave(now);
  const profile = isObject(input.profile) ? input.profile : {};
  const settings = isObject(input.settings) ? input.settings : {};
  const num = (x: unknown, fallback: number) => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);
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
      voice: typeof settings.voice === 'boolean' ? settings.voice : base.settings.voice,
      calm: typeof settings.calm === 'boolean' ? settings.calm : base.settings.calm,
      vozLocal: typeof settings.vozLocal === 'boolean' ? settings.vozLocal : base.settings.vozLocal,
    },
    cards: cleanCards(input.cards),
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
