/**
 * Toca a música do Kana Beat: um trecho de faixa real em loop (ver tracks.ts).
 *
 * Web Audio em vez de <audio>: o loop emenda na amostra exata e o começo é agendado no relógio do áudio,
 * então as notas caem na batida. O ajuste fino de andamento é `playbackRate`, que muda um pouco o tom;
 * a escolha da faixa mantém essa mudança em no máximo 10% (menos de um tom e meio).
 */
import { audioContext } from '../../core/audio';
import { pickTrack, songPosition, type Track, type TrackChoice } from './tracks';

const ARQUIVOS = import.meta.glob<string>('../../assets/musica/*.ogg', { eager: true, query: '?url', import: 'default' });
const VOLUME = 0.55;
/** Se a música não carregar nesse tempo, a fase começa sem ela. */
const LOAD_TIMEOUT = 4000;

export function trackUrl(track: Track): string | undefined {
  return ARQUIVOS[`../../assets/musica/${track.id}.ogg`];
}

const cache = new Map<string, Promise<AudioBuffer | null>>();

function load(ac: AudioContext, track: Track): Promise<AudioBuffer | null> {
  const url = trackUrl(track);
  if (!url) return Promise.resolve(null);
  let p = cache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((data) => ac.decodeAudioData(data))
      .catch(() => {
        cache.delete(url);
        return null;
      });
    cache.set(url, p);
  }
  return p;
}

export interface Music {
  readonly choice: TrackChoice;
  /** Resolve quando a música está pronta para tocar (ou quando desistiu dela). */
  readonly ready: Promise<void>;
  /**
   * Começa a tocar do ponto que corresponde a `gameMs`, daqui a `delayMs`.
   * Devolve o `performance.now()` em que esse ponto vai soar, já contando a latência de saída.
   */
  play(gameMs: number, delayMs: number): number;
  /** Para de tocar, mas pode voltar com `play`. */
  halt(): void;
  /** Para de vez, com um fade curto. */
  stop(): void;
}

export function startMusic(bpm: number): Music {
  const choice = pickTrack(bpm);
  const ac = audioContext();
  let buffer: AudioBuffer | null = null;
  let source: AudioBufferSourceNode | null = null;
  let master: GainNode | null = null;
  let stopped = false;

  const ready: Promise<void> = ac
    ? Promise.race([
        load(ac, choice.track).then((b) => {
          buffer = b;
        }),
        new Promise<void>((resolve) => setTimeout(resolve, LOAD_TIMEOUT)),
      ])
    : Promise.resolve();

  const halt = () => {
    if (!source) return;
    try {
      source.stop();
    } catch {
      // já parada
    }
    source.disconnect();
    source = null;
  };

  return {
    choice,
    ready,
    play(gameMs, delayMs) {
      halt();
      const now = performance.now();
      if (!ac || !buffer || stopped) return now + delayMs;
      if (!master) {
        master = ac.createGain();
        master.gain.value = VOLUME;
        master.connect(ac.destination);
      }
      const at = ac.currentTime + delayMs / 1000;
      source = ac.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.playbackRate.value = choice.rate;
      source.connect(master);
      source.start(at, songPosition(choice, gameMs));
      const latency = (ac.outputLatency || ac.baseLatency || 0) * 1000;
      return now + delayMs + latency;
    },
    halt,
    stop() {
      stopped = true;
      if (!ac || !master) return halt();
      const g = master;
      g.gain.setValueAtTime(g.gain.value, ac.currentTime);
      g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3);
      const s = source;
      source = null;
      setTimeout(() => {
        try {
          s?.stop();
        } catch {
          // já parada
        }
        g.disconnect();
      }, 350);
    },
  };
}
