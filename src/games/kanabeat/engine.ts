/**
 * Regras do Kana Beat, sem tela. Notas (kana ou palavras) chegam na linha no
 * tempo da batida; o jogador digita a leitura. Digitar em cima da batida
 * vale mais, mas basta digitar antes da nota passar. Não existe "game over":
 * a música sempre termina, e a nota final diz como foi.
 *
 * Ensinar antes de cobrar (core/ensino.ts): kana ou palavra que nunca foi vista não cai na
 * música. Antes de tocar, os novos da fase são apresentados com calma (`apresentando`).
 * Nota de item em prática vem com o romaji por cima, um tempo a mais de folga, e perder
 * essa nota não zera o combo.
 */
import { cardKey, KANA, WORDS } from '../../content';
import { acharPalavra } from '../../content/escola';
import { foco } from '../../core/foco';
import { kanaToRomaji, matchTyping } from '../../core/kana';
import { pickNext } from '../../core/picker';
import type { Rng } from '../../core/rng';
import type { Profile } from '../../core/save';
import { apresentar, avaliar, emPratica, foiApresentado, notaDaPratica, novidades } from '../../core/ensino';
import { masteryLevel, newCard, review, type CardState } from '../../core/srs';

export type Mode = 'hiragana' | 'katakana' | 'palavras';
export const MODES: Mode[] = ['palavras', 'hiragana', 'palavras', 'katakana'];
export const MODE_NAMES: Record<Mode, string> = { hiragana: 'Hiragana', katakana: 'Katakana', palavras: 'Palavras' };

export const BPM_MIN = 50;
export const BPM_MAX = 150;
export const BPM_START = 70;
export const BPM_STEP = 6;
/** Batidas entre a nota aparecer e chegar na linha. */
export const LEAD_BEATS = 4;

export interface KanaBeatSave {
  plays: number;
  bpm: Record<Mode, number>;
  best: Record<Mode, number>;
}

export function ensureKanaBeatSave(games: Record<string, unknown>): KanaBeatSave {
  const fresh = (): KanaBeatSave => ({
    plays: 0,
    bpm: { hiragana: BPM_START, katakana: BPM_START, palavras: BPM_START },
    best: { hiragana: 0, katakana: 0, palavras: 0 },
  });
  const current = games.kanabeat;
  if (typeof current !== 'object' || current === null || Array.isArray(current)) {
    const base = fresh();
    games.kanabeat = base;
    return base;
  }
  const save = current as Partial<KanaBeatSave>;
  const base = fresh();
  if (typeof save.plays !== 'number') save.plays = 0;
  for (const field of ['bpm', 'best'] as const) {
    const value = (typeof save[field] === 'object' && save[field] !== null ? save[field] : {}) as Record<string, unknown>;
    for (const m of Object.keys(base[field]) as Mode[]) {
      if (typeof value[m] !== 'number') value[m] = base[field][m];
    }
    save[field] = value as Record<Mode, number>;
  }
  return save as KanaBeatSave;
}

export type Judge = 'perfect' | 'good' | 'ok';

export interface Note {
  id: number;
  card: string;
  /** O que aparece na nota (kana, ou palavra com kanji). */
  text: string;
  /** O que precisa ser digitado, em kana. */
  kana: string;
  /** Leitura em kana por cima do kanji; some quando a leitura já está firme. */
  furigana?: string;
  /** Romaji de apoio, enquanto o item está em prática. */
  hint?: string;
  /** Item em prática: perder a nota não zera o combo. */
  pratica: boolean;
  /** Significado, para palavras. */
  pt?: string;
  /** Momento em que a nota cruza a linha, em ms desde o início. */
  time: number;
  state: 'pending' | 'hit' | 'miss';
  judge?: Judge;
}

export type BeatEvent =
  | { t: 'type'; ok: boolean; buffer: string }
  | { t: 'hit'; note: Note; judge: Judge; combo: number; points: number }
  | { t: 'miss'; note: Note; pratica: boolean }
  | { t: 'end'; result: StageResult };

export interface StageResult {
  mode: Mode;
  bpm: number;
  nextBpm: number;
  grade: 'S' | 'A' | 'B' | 'C';
  accuracy: number;
  score: number;
  maxCombo: number;
  perfect: number;
  good: number;
  ok: number;
  miss: number;
  coins: number;
  xp: number;
  record: boolean;
  missed: Note[];
}

export interface StageDeps {
  cards: Record<string, CardState>;
  profile: Profile;
  save: KanaBeatSave;
  rng: Rng;
  /** Relógio de parede, para a memória espaçada. */
  now: () => number;
}

const POINTS: Record<Judge, number> = { perfect: 100, good: 70, ok: 40 };

export interface Candidate {
  card: string;
  text: string;
  kana: string;
  pt?: string;
}

function candidates(mode: Mode): Candidate[] {
  if (mode === 'hiragana') return KANA.map((k) => ({ card: cardKey(k.id, 'reading'), text: k.hira, kana: k.hira }));
  if (mode === 'katakana') return KANA.map((k) => ({ card: cardKey(`ak:${k.kata}`, 'reading'), text: k.kata, kana: k.kata }));
  // Missão da Jornada com palavras de um tema: só elas (de qualquer parte do conteúdo).
  const ids = foco.value?.palavras;
  const words = ids && ids.length > 0 ? ids.flatMap((id) => acharPalavra(id) ?? []) : WORDS;
  return words.map((w) => ({ card: cardKey(w.id, 'reading'), text: w.jp, kana: w.kana, pt: w.pt }));
}

/** Quantas batidas uma nota ocupa: kana solto é uma; palavra cresce com o tamanho. */
export function beatsFor(kana: string): number {
  const letters = kanaToRomaji(kana).replace(/'/g, '').length;
  return Math.max(1, Math.ceil(letters / 3));
}

export function modeForPlay(plays: number): Mode {
  return MODES[plays % MODES.length] as Mode;
}

export class Stage {
  readonly notes: Note[] = [];
  readonly beatMs: number;
  readonly leadMs: number;
  readonly endTime: number;
  buffer = '';
  combo = 0;
  maxCombo = 0;
  score = 0;
  slips = 0;
  finished = false;
  result: StageResult | null = null;
  /** Itens novos desta fase, apresentados antes da música. */
  readonly novos: readonly Candidate[];
  /** A apresentação ainda está na tela: a música não começou. */
  apresentando: boolean;

  constructor(
    private readonly deps: StageDeps,
    readonly mode: Mode,
    readonly bpm: number,
    count = mode === 'palavras' ? 18 : 40,
  ) {
    this.beatMs = 60_000 / bpm;
    this.leadMs = this.beatMs * LEAD_BEATS;
    const { cards, rng, now } = deps;
    const all = candidates(mode);
    const byCard = new Map(all.map((c) => [c.card, c]));
    const used = new Map<string, number>();
    const recent: string[] = [];
    this.novos = novidades(
      all.map((c) => c.card),
      cards,
    ).map((k) => byCard.get(k) as Candidate);
    const novas = new Set(this.novos.map((c) => c.card));
    this.apresentando = this.novos.length > 0;
    // Simula o baralho para o seletor não escolher sempre a mesma carta nova. Os novos da
    // fase contam como apresentados: a apresentação vem antes da música.
    const scratch: Record<string, CardState> = { ...cards };
    apresentar(scratch, [...novas], now());
    let time = this.leadMs + this.beatMs;
    // Com poucos itens conhecidos (o começo), cada um pode voltar mais vezes na música.
    const conhecidos = all.filter((c) => foiApresentado(scratch, c.card)).length;
    const repete = conhecidos < 10 ? 4 : 2;
    for (let i = 0; i < count; i++) {
      const pool = all.map((c) => c.card).filter((k) => (used.get(k) ?? 0) < repete);
      const chosen = pickNext(pool, scratch, now(), rng, { recent: recent.slice(-Math.max(1, Math.min(6, conhecidos - 1))), maxYoung: mode === 'palavras' ? 8 : 24, newRatio: 0.5 });
      // Só sobrou a mesma da nota anterior: a música acaba aqui, sem repetir em seguida.
      if (!chosen || chosen.key === recent.at(-1)) break;
      const c = byCard.get(chosen.key) as Candidate;
      used.set(c.card, (used.get(c.card) ?? 0) + 1);
      recent.push(c.card);
      if (recent.length > 6) recent.shift();
      const pratica = novas.has(c.card) || emPratica(cards, c.card);
      scratch[c.card] = review(scratch[c.card] ?? newCard(now()), { correct: true, hinted: true }, now());
      const showReading = mode === 'palavras' && (pratica || masteryLevel(cards[c.card]) < 3);
      this.notes.push({
        id: i,
        card: c.card,
        text: c.text,
        kana: c.kana,
        furigana: showReading ? c.kana : undefined,
        hint: pratica ? kanaToRomaji(c.kana).replace(/'/g, '') : undefined,
        pratica,
        pt: c.pt,
        time,
        state: 'pending',
      });
      // Nota de prática ganha uma batida a mais de folga.
      time += beatsFor(c.kana) * this.beatMs + (mode === 'palavras' ? this.beatMs : 0) + (pratica ? this.beatMs : 0);
    }
    this.endTime = time + this.beatMs;
  }

  /** A apresentação acabou: os novos viram prática e a música pode começar. */
  apresentou(): void {
    if (!this.apresentando) return;
    apresentar(
      this.deps.cards,
      this.novos.map((c) => c.card),
      this.deps.now(),
    );
    this.apresentando = false;
  }

  /** A nota que o jogador está digitando: a pendente mais antiga. */
  get target(): Note | undefined {
    return this.notes.find((n) => n.state === 'pending');
  }

  /** Notas que já entraram na tela e ainda não foram resolvidas. */
  visible(t: number): Note[] {
    return this.notes.filter((n) => n.state === 'pending' && n.time - this.leadMs <= t);
  }

  private missWindow(): number {
    return this.beatMs * 1.25;
  }

  /** Avança o tempo: marca como perdida a nota que passou da linha. */
  update(t: number): BeatEvent[] {
    if (this.finished || this.apresentando) return [];
    const events: BeatEvent[] = [];
    for (const n of this.notes) {
      if (n.state !== 'pending') continue;
      if (t <= n.time + this.missWindow()) break;
      n.state = 'miss';
      if (!n.pratica) this.combo = 0;
      this.buffer = '';
      avaliar(this.deps.cards, n.card, { correct: false }, this.deps.now());
      events.push({ t: 'miss', note: n, pratica: n.pratica });
    }
    if (!this.target && t >= Math.min(this.endTime, (this.notes[this.notes.length - 1]?.time ?? 0) + this.beatMs)) {
      events.push({ t: 'end', result: this.finish() });
    }
    return events;
  }

  /** Uma tecla. Só vale para a nota da vez, e só depois que ela apareceu. */
  key(ch: string, t: number): BeatEvent[] {
    if (this.finished || this.apresentando) return [];
    const events = this.update(t);
    const note = this.target;
    if (!note || note.time - this.leadMs > t) return events;
    const attempt = this.buffer + ch.toLowerCase();
    let match = matchTyping(attempt, note.kana);
    if (match === 'no') {
      // Tecla errada: recomeça a nota. Se a tecla sozinha já serve de começo, aproveita.
      this.slips++;
      const restart = matchTyping(ch.toLowerCase(), note.kana);
      this.buffer = restart === 'no' ? '' : ch.toLowerCase();
      match = restart;
      if (match !== 'complete') {
        events.push({ t: 'type', ok: false, buffer: this.buffer });
        return events;
      }
    } else {
      this.buffer = attempt;
    }
    if (match === 'prefix') {
      events.push({ t: 'type', ok: true, buffer: this.buffer });
      return events;
    }
    const off = Math.abs(t - note.time);
    const judge: Judge = off <= this.beatMs * 0.3 ? 'perfect' : off <= this.beatMs * 0.7 ? 'good' : 'ok';
    note.state = 'hit';
    note.judge = judge;
    this.buffer = '';
    // Nota de prática não mexe no combo (nem para cima, nem para baixo).
    if (!note.pratica) this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const points = Math.round(POINTS[judge] * (1 + Math.min(this.combo, 20) / 20));
    this.score += points;
    avaliar(this.deps.cards, note.card, note.pratica ? notaDaPratica(true) : { correct: true }, this.deps.now());
    events.push({ t: 'hit', note, judge, combo: this.combo, points });
    if (!this.target) events.push({ t: 'end', result: this.finish() });
    return events;
  }

  clearBuffer(): void {
    this.buffer = '';
  }

  private finish(): StageResult {
    if (this.result) return this.result;
    this.finished = true;
    const { save, profile } = this.deps;
    const count = (j: Judge) => this.notes.filter((n) => n.judge === j).length;
    const missed = this.notes.filter((n) => n.state === 'miss');
    const total = this.notes.length || 1;
    const perfect = count('perfect');
    const good = count('good');
    const ok = count('ok');
    const accuracy = (perfect + good * 0.8 + ok * 0.5) / total;
    const grade = accuracy >= 0.93 && missed.length === 0 ? 'S' : accuracy >= 0.8 ? 'A' : accuracy >= 0.6 ? 'B' : 'C';
    let nextBpm = this.bpm;
    if (accuracy >= 0.85) nextBpm = Math.min(BPM_MAX, this.bpm + BPM_STEP);
    else if (accuracy < 0.55) nextBpm = Math.max(BPM_MIN, this.bpm - BPM_STEP);
    const coins = Math.round(this.score / 150);
    const xp = Math.round(this.score / 120);
    const record = this.score > save.best[this.mode];
    if (record) save.best[this.mode] = this.score;
    save.bpm[this.mode] = nextBpm;
    save.plays++;
    profile.coins += coins;
    profile.xp += xp;
    this.result = {
      mode: this.mode,
      bpm: this.bpm,
      nextBpm,
      grade,
      accuracy,
      score: this.score,
      maxCombo: this.maxCombo,
      perfect,
      good,
      ok,
      miss: missed.length,
      coins,
      xp,
      record,
      missed: missed.filter((n, i, list) => list.findIndex((o) => o.card === n.card) === i),
    };
    return this.result;
  }
}
