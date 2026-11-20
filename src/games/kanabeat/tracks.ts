/**
 * As músicas do Kana Beat: trechos de ~1 minuto de faixas livres, cortados em loop limpo.
 * Como foram cortadas e medidas: docs/musica.md. Créditos: README e a tela de créditos do jogo.
 *
 * `bpm` e `offsetMs` foram medidos no arquivo final (scripts em D:\KotobaArcade\\musica).
 * `offsetMs` é onde cai o primeiro tempo forte; o trecho tem `beats` tempos inteiros, então o loop
 * volta no tempo certo.
 */

export type Licenca = 'CC0' | 'CC-BY 3.0' | 'CC-BY 4.0' | 'OGA-BY 3.0';

export interface Track {
  id: string;
  titulo: string;
  autor: string;
  /** Página da faixa original. */
  link: string;
  licenca: Licenca;
  bpm: number;
  offsetMs: number;
  /** Quantos tempos o trecho tem (múltiplo de 16). */
  beats: number;
}

export const LICENCA_URL: Record<Licenca, string> = {
  CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC-BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC-BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'OGA-BY 3.0': 'https://static.opengameart.org/OGA-BY-3.0.txt',
};

export const TRACKS: readonly Track[] = [
  { id: 'letting-go', titulo: 'Letting Go Of The Past', autor: 'Holizna', link: 'https://opengameart.org/content/happy-lo-fi-lofi-collection', licenca: 'CC0', bpm: 75.0, offsetMs: 3.7, beats: 64 },
  { id: 'blue-skies', titulo: 'Blue Skies', autor: 'Holizna', link: 'https://opengameart.org/content/happy-lo-fi-lofi-collection', licenca: 'CC0', bpm: 82.0, offsetMs: -0.6, beats: 80 },
  { id: 'bartender', titulo: 'Bartender', autor: 'TAD', link: 'https://opengameart.org/content/lofi-compilation', licenca: 'CC0', bpm: 90.0, offsetMs: 0.4, beats: 80 },
  { id: 'happy-lofi-day', titulo: 'happy lofi day', autor: 'Tarush Singhal', link: 'https://opengameart.org/content/happy-lofi-day', licenca: 'CC0', bpm: 99.002, offsetMs: 0, beats: 96 },
  { id: 'ninja-anthem', titulo: 'Ninja Anthem EDM Beat', autor: 'ISAo (airyluvs)', link: 'https://opengameart.org/content/ninja-anthem-edm-beat', licenca: 'OGA-BY 3.0', bpm: 120.003, offsetMs: 0, beats: 96 },
  { id: 'only-115', titulo: 'Only 115 (Dance Loop)', autor: 'Snabisch', link: 'https://opengameart.org/content/only-115-dance-loop', licenca: 'CC-BY 3.0', bpm: 125.0, offsetMs: -1.5, beats: 112 },
  { id: 'arukas-bloom', titulo: 'Arukas Bloom', autor: 'TAD', link: 'https://opengameart.org/content/arukas-bloom', licenca: 'CC-BY 4.0', bpm: 130.0, offsetMs: -1.4, beats: 128 },
  { id: 'japanese-modern', titulo: 'Japanese Modern loop', autor: 'F_kaiba', link: 'https://opengameart.org/content/japanese-modern-loop', licenca: 'CC-BY 4.0', bpm: 160.0, offsetMs: 0.4, beats: 160 },
];

/** Duração do trecho em ms. */
export function loopMs(track: Track): number {
  return (track.beats * 60_000) / track.bpm;
}

/** Quanto a música pode acelerar ou frear. Mais que isso o tom muda demais. */
export const MAX_RATE_DIFF = 0.1;

export interface TrackChoice {
  track: Track;
  /** Velocidade de reprodução. */
  rate: number;
  /** Tempos da música por batida do jogo: 2 = meio tempo (nota a cada 2 tempos), 0.5 = tempo dobrado. */
  perBeat: number;
}

/**
 * A faixa que menos precisa mudar de velocidade para bater com o BPM do jogo.
 * Uma faixa de 150 serve para 75 tocando uma nota a cada 2 tempos, e vice-versa.
 */
export function pickTrack(bpm: number, tracks: readonly Track[] = TRACKS): TrackChoice {
  let best: TrackChoice | null = null;
  let bestDiff = Infinity;
  for (const track of tracks) {
    for (const perBeat of [1, 2, 0.5]) {
      const rate = (bpm * perBeat) / track.bpm;
      const diff = Math.abs(Math.log(rate));
      if (diff < bestDiff - 1e-9) {
        bestDiff = diff;
        best = { track, rate, perBeat };
      }
    }
  }
  if (!best) throw new Error('Kana Beat sem músicas');
  return best;
}

/**
 * Posição no arquivo (em segundos) que deve estar tocando quando o jogo está em `gameMs`.
 * O tempo 0 do jogo cai no primeiro tempo forte; as notas caem nos tempos do jogo, então caem na batida.
 */
export function songPosition(choice: TrackChoice, gameMs: number): number {
  const len = loopMs(choice.track);
  const pos = choice.track.offsetMs + gameMs * choice.rate;
  return (((pos % len) + len) % len) / 1000;
}
