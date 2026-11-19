/**
 * Sons do jogo, todos sintetizados na hora (sem arquivo de áudio): pincel, papel, impacto de taiko,
 * página virando e notas de koto na escala japonesa. Voz em japonês pelo navegador.
 */
import { app } from './app';

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

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

/** Contexto de áudio compartilhado (null com som desligado). */
export function audioContext(): AudioContext | null {
  return audio();
}

/** Um segundo de ruído branco, gerado uma vez e reaproveitado por todos os sons de papel e pincel. */
function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ac.sampleRate) return noise;
  noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

interface Swish {
  /** Atraso em segundos. */
  at?: number;
  dur: number;
  /** Frequência do filtro no começo e no fim: subir soa como pincel, descer como papel assentando. */
  from: number;
  to: number;
  q?: number;
  gain?: number;
  type?: BiquadFilterType;
}

/** Ruído filtrado: pincel no papel, folha virando, papel amassando. */
function swish(ac: AudioContext, s: Swish): void {
  const start = ac.currentTime + (s.at ?? 0);
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = s.type ?? 'bandpass';
  f.Q.value = s.q ?? 1.2;
  f.frequency.setValueAtTime(s.from, start);
  f.frequency.exponentialRampToValueAtTime(s.to, start + s.dur);
  const g = ac.createGain();
  const peak = s.gain ?? 0.12;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + s.dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, start + s.dur);
  src.connect(f).connect(g).connect(ac.destination);
  src.start(start, Math.random() * 0.5);
  src.stop(start + s.dur + 0.02);
}

/** Batida de taiko: corpo grave que cai de tom e um estalo de pele por cima. */
function taiko(ac: AudioContext, at = 0, gain = 0.32, pitch = 120): void {
  const start = ac.currentTime + at;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(pitch * 1.6, start);
  osc.frequency.exponentialRampToValueAtTime(pitch * 0.55, start + 0.35);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
  osc.connect(g).connect(ac.destination);
  osc.start(start);
  osc.stop(start + 0.5);
  swish(ac, { at, dur: 0.06, from: 1800, to: 600, q: 0.7, gain: gain * 0.5 });
}

/** Corda dedilhada (Karplus-Strong simplificado com dois osciladores): som de koto. */
function koto(ac: AudioContext, freq: number, at = 0, gain = 0.09, dur = 0.7): void {
  const start = ac.currentTime + at;
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, start);
  out.gain.exponentialRampToValueAtTime(gain, start + 0.004);
  out.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(freq * 6, start);
  lp.frequency.exponentialRampToValueAtTime(freq * 1.5, start + dur * 0.6);
  lp.connect(out).connect(ac.destination);
  for (const [mult, type] of [
    [1, 'triangle'],
    [2.003, 'sawtooth'],
  ] as const) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq * mult, start);
    const og = ac.createGain();
    og.gain.value = mult === 1 ? 1 : 0.18;
    o.connect(og).connect(lp);
    o.start(start);
    o.stop(start + dur + 0.02);
  }
}

/** Escala yo (pentatônica japonesa sem semitom): ré, mi, sol, lá, si. */
const YO = [0, 2, 5, 7, 9];
export function yo(step: number, base = 293.66): number {
  const octave = Math.floor(step / YO.length);
  const degree = YO[((step % YO.length) + YO.length) % YO.length] as number;
  return base * 2 ** octave * 2 ** (degree / 12);
}

function withAudio(fn: (ac: AudioContext) => void): void {
  const ac = audio();
  if (ac) fn(ac);
}

export const sfx = {
  /** Toque de papel: botão, escolha. */
  click: () => withAudio((ac) => swish(ac, { dur: 0.05, from: 4200, to: 2600, q: 2, gain: 0.07 })),
  /** Acerto: taiko e uma nota de koto que sobe com o combo. */
  hit: (combo: number) =>
    withAudio((ac) => {
      taiko(ac, 0, 0.26);
      koto(ac, yo(Math.min(combo, 12)), 0.03, 0.08, 0.5);
    }),
  /** Acerto rápido: pincelada seca de cima a baixo. */
  fast: () => withAudio((ac) => swish(ac, { at: 0.06, dur: 0.16, from: 900, to: 6000, q: 0.9, gain: 0.14 })),
  /** Erro: golpe no vazio, um sopro que cai e um toque de madeira abafado. */
  miss: () =>
    withAudio((ac) => {
      swish(ac, { dur: 0.22, from: 2500, to: 300, q: 0.8, gain: 0.1 });
      taiko(ac, 0.04, 0.12, 70);
    }),
  /** Captura: pincelada e arpejo de koto, mais longo conforme a raridade. */
  capture: (tier: number) =>
    withAudio((ac) => {
      swish(ac, { dur: 0.2, from: 700, to: 5000, q: 0.9, gain: 0.12 });
      for (let i = 0; i < 3 + tier; i++) koto(ac, yo(5 + i), 0.08 + i * 0.07, 0.08, 0.8);
    }),
  /** Raro: ronco grave (ゴゴゴ) e um sino agudo. */
  rare: () =>
    withAudio((ac) => {
      swish(ac, { dur: 0.9, from: 90, to: 160, q: 3, gain: 0.22, type: 'lowpass' });
      koto(ac, yo(12), 0.5, 0.07, 1.2);
      koto(ac, yo(14), 0.62, 0.06, 1.2);
    }),
  /** Baú: página virando e duas notas. */
  chest: () =>
    withAudio((ac) => {
      page(ac);
      koto(ac, yo(7), 0.22, 0.08);
      koto(ac, yo(10), 0.32, 0.08, 1);
    }),
  /** Subir de nível: ドドン no taiko e o arpejo inteiro. */
  levelup: () =>
    withAudio((ac) => {
      taiko(ac, 0, 0.3);
      taiko(ac, 0.14, 0.34, 100);
      [5, 7, 9, 10, 12].forEach((s, i) => koto(ac, yo(s), 0.3 + i * 0.08, 0.08, 0.9));
    }),
  /** Fim: notas descendo devagar. */
  over: () => withAudio((ac) => [7, 5, 3, 0].forEach((s, i) => koto(ac, yo(s), i * 0.22, 0.07, 1.1))),
  /** Página virando: troca de tela, carta virada. */
  page: () => withAudio((ac) => page(ac)),
};

function page(ac: AudioContext): void {
  swish(ac, { dur: 0.18, from: 1200, to: 4500, q: 0.6, gain: 0.09 });
  swish(ac, { at: 0.12, dur: 0.12, from: 3000, to: 900, q: 0.7, gain: 0.07 });
}

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
