import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BPM_MAX, BPM_MIN } from '../src/games/kanabeat/engine';
import { LICENCA_URL, loopMs, MAX_RATE_DIFF, pickTrack, songPosition, TRACKS } from '../src/games/kanabeat/tracks';

const DIR = join(__dirname, '..', 'src', 'assets', 'musica');

/** Duração de um .ogg vorbis: posição (em amostras) da última página dividida pela taxa. */
function oggSeconds(file: string): number {
  const buf = readFileSync(file);
  // Cabeçalho vorbis: 'vorbis', versão (4 bytes), canais (1), taxa (4).
  const rate = buf.readUInt32LE(buf.indexOf('vorbis') + 11);
  const last = buf.lastIndexOf('OggS');
  const granule = Number(buf.readBigUInt64LE(last + 6));
  return granule / rate;
}

describe('músicas do Kana Beat', () => {
  it('cada faixa da tabela tem arquivo, e cada arquivo está na tabela', () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith('.ogg')).sort();
    expect(files).toEqual(TRACKS.map((t) => `${t.id}.ogg`).sort());
  });

  it('créditos completos e licença que deixa publicar no site', () => {
    for (const t of TRACKS) {
      expect(t.titulo.length).toBeGreaterThan(0);
      expect(t.autor.length).toBeGreaterThan(0);
      expect(t.link).toMatch(/^https:\/\//);
      expect(LICENCA_URL[t.licenca]).toMatch(/^https:\/\//);
    }
  });

  it('o trecho tem um número inteiro de compassos, então o loop volta na batida', () => {
    for (const t of TRACKS) {
      expect(t.beats % 16, t.id).toBe(0);
      const real = oggSeconds(join(DIR, `${t.id}.ogg`));
      expect(Math.abs(real * 1000 - loopMs(t)), t.id).toBeLessThan(10);
      expect(real, t.id).toBeGreaterThan(45);
      expect(real, t.id).toBeLessThan(65);
    }
  });

  it('o primeiro tempo forte fica no começo do arquivo', () => {
    for (const t of TRACKS) expect(Math.abs(t.offsetMs), t.id).toBeLessThan(60_000 / t.bpm / 4);
  });

  it('arquivos leves: menos de 1 MB cada', () => {
    for (const t of TRACKS) expect(readFileSync(join(DIR, `${t.id}.ogg`)).length, t.id).toBeLessThan(1024 * 1024);
  });

  it('todo BPM do jogo tem faixa que precisa mudar no máximo 10% de velocidade', () => {
    for (let bpm = BPM_MIN; bpm <= BPM_MAX; bpm++) {
      const { rate } = pickTrack(bpm);
      expect(Math.abs(rate - 1), `${bpm} BPM`).toBeLessThanOrEqual(MAX_RATE_DIFF);
    }
  });

  it('escolhe a faixa de BPM mais perto, aceitando meio tempo e tempo dobrado', () => {
    expect(pickTrack(90)).toMatchObject({ rate: 1, perBeat: 1, track: { id: 'bartender' } });
    expect(pickTrack(80)).toMatchObject({ rate: 1, perBeat: 2, track: { id: 'japanese-modern' } });
    expect(pickTrack(150)).toMatchObject({ rate: 1, perBeat: 0.5, track: { id: 'letting-go' } });
    expect(pickTrack(70).track.id).toBe('letting-go');
  });

  it('cada batida do jogo cai num tempo da música', () => {
    for (const bpm of [50, 70, 88, 110, 137, 150]) {
      const choice = pickTrack(bpm);
      const songBeat = 60 / choice.track.bpm;
      const gameBeat = 60_000 / bpm;
      for (const k of [0, 1, 5, 37, 200]) {
        const pos = songPosition(choice, k * gameBeat) - choice.track.offsetMs / 1000;
        // perBeat 0.5 (tempo dobrado) põe nota também no meio do tempo; 2 (meio tempo) só nos tempos pares.
        const beats = pos / songBeat / choice.perBeat;
        expect(Math.abs(beats - Math.round(beats)), `${bpm} BPM, batida ${k}`).toBeLessThan(1e-6);
      }
      // Volta pro começo do trecho, sem passar do fim.
      expect(songPosition(choice, 10 ** 7)).toBeLessThan(loopMs(choice.track) / 1000);
    }
  });
});
