/** Efeitos sonoros sintetizados (sem arquivos) e voz em japonês pelo navegador. */
import { app } from './app';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!app.data.settings.sound) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface Tone {
  freq: number;
  dur: number;
  at?: number;
  type?: OscillatorType;
  gain?: number;
  slide?: number;
}

function play(tones: Tone[]): void {
  const ac = audio();
  if (!ac) return;
  for (const t of tones) {
    const start = ac.currentTime + (t.at ?? 0);
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = t.type ?? 'triangle';
    osc.frequency.setValueAtTime(t.freq, start);
    if (t.slide) osc.frequency.exponentialRampToValueAtTime(t.slide, start + t.dur);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(t.gain ?? 0.09, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(g).connect(ac.destination);
    osc.start(start);
    osc.stop(start + t.dur + 0.02);
  }
}

const NOTE = (semis: number) => 440 * 2 ** (semis / 12);

export const sfx = {
  click: () => play([{ freq: 660, dur: 0.05, gain: 0.04 }]),
  /** O tom sobe com o combo: acertar em sequência "soa" cada vez melhor. */
  hit: (combo: number) => {
    const step = Math.min(combo, 12);
    play([
      { freq: NOTE(step), dur: 0.12 },
      { freq: NOTE(step + 7), dur: 0.16, at: 0.05, gain: 0.06 },
    ]);
  },
  fast: () => play([{ freq: NOTE(19), dur: 0.1, at: 0.1, type: 'sine', gain: 0.07 }]),
  miss: () => play([{ freq: 180, dur: 0.25, type: 'sawtooth', gain: 0.06, slide: 90 }]),
  capture: (tier: number) => {
    const base = [0, 4, 7, 12, 16, 19];
    play(base.slice(0, 3 + tier).map((n, i) => ({ freq: NOTE(n), dur: 0.22, at: i * 0.07, gain: 0.08 })));
  },
  rare: () => play([0, 7, 12, 19, 24].map((n, i) => ({ freq: NOTE(n), dur: 0.3, at: i * 0.09, type: 'sine' as const, gain: 0.07 }))),
  chest: () => play([0, 5, 9, 12, 17].map((n, i) => ({ freq: NOTE(n), dur: 0.25, at: i * 0.08, gain: 0.08 }))),
  levelup: () => play([0, 4, 7, 12, 7, 12, 16].map((n, i) => ({ freq: NOTE(n + 5), dur: 0.2, at: i * 0.09, gain: 0.08 }))),
  over: () => play([{ freq: 330, dur: 0.5, slide: 110, type: 'sine', gain: 0.07 }]),
};

let jaVoice: SpeechSynthesisVoice | null | undefined;

function findVoice(): SpeechSynthesisVoice | null {
  if (jaVoice !== undefined) return jaVoice;
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null; // ainda carregando; tenta de novo na próxima
  jaVoice = voices.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ja')) ?? null;
  return jaVoice;
}

/** Fala um texto em japonês. Sem voz japonesa instalada, fica em silêncio. */
export function speak(text: string): void {
  if (!app.data.settings.voice || typeof speechSynthesis === 'undefined') return;
  const voice = findVoice();
  if (!voice) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = 'ja-JP';
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

export function hasJapaneseVoice(): boolean {
  return typeof speechSynthesis !== 'undefined' && !!findVoice();
}
