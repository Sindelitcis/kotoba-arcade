/** Base rítmica gerada na hora (bumbo, chimbal, baixo), sem arquivos de áudio. */
import { audioContext } from '../../core/audio';

export interface Music {
  stop(): void;
  pause(): void;
  resume(): void;
}

const SCALE = [0, 3, 5, 7, 10]; // pentatônica menor
const ROOT = 110;

export function startMusic(bpm: number, durationMs: number, delayMs: number): Music {
  const ac = audioContext();
  if (!ac) return { stop() {}, pause() {}, resume() {} };
  const master = ac.createGain();
  master.gain.value = 0.5;
  master.connect(ac.destination);
  const beat = 60 / bpm;
  const start = ac.currentTime + delayMs / 1000;
  const beats = Math.ceil(durationMs / 1000 / beat) + 2;

  const voice = (at: number, freq: number, dur: number, type: OscillatorType, gain: number, slide?: number) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, at + dur);
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  };

  for (let b = 0; b < beats; b++) {
    const at = start + b * beat;
    voice(at, 130, 0.16, 'sine', 0.5, 45); // bumbo
    voice(at + beat / 2, 7000, 0.04, 'square', 0.03); // chimbal no contratempo
    if (b % 2 === 1) voice(at, 220, 0.09, 'triangle', 0.12, 160); // caixa leve
    const degree = SCALE[(b * 2 + Math.floor(b / 4)) % SCALE.length] as number;
    voice(at, ROOT * 2 ** (degree / 12), beat * 0.9, 'triangle', 0.1); // baixo
    if (b % 4 === 3) voice(at + beat / 2, ROOT * 4 * 2 ** (degree / 12), beat * 0.4, 'sine', 0.05);
  }

  return {
    stop() {
      master.gain.setValueAtTime(master.gain.value, ac.currentTime);
      master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.15);
      setTimeout(() => master.disconnect(), 250);
      if (ac.state === 'suspended') void ac.resume();
    },
    pause: () => void ac.suspend(),
    resume: () => void ac.resume(),
  };
}
