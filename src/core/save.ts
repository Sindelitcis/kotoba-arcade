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
    settings: { sound: true, voice: true, calm: false },
    cards: {},
    games: {},
  };
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
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
    },
    cards: isObject(input.cards) ? (input.cards as Record<string, CardState>) : {},
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
    store.setItem(`${SAVE_KEY}:corrompido:${now}`, text);
    return emptySave(now);
  }
}

export function writeSave(store: KeyValueStore, data: SaveData, now: number): void {
  data.updatedAt = now;
  store.setItem(SAVE_KEY, JSON.stringify(data));
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
