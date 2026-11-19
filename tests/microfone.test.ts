import { describe, expect, it } from 'vitest';
import { gravar, type Dispositivos } from '../src/games/conversa/microfone';

function falso() {
  const trilha = { parada: false, stop() { this.parada = true; } };
  const stream = { getTracks: () => [trilha] } as unknown as MediaStream;
  class Recorder {
    state: RecordingState = 'inactive';
    mimeType = 'audio/webm';
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['x']) });
      this.onstop?.();
    }
  }
  const d: Dispositivos = { getUserMedia: async () => stream, Recorder: Recorder as unknown as Dispositivos['Recorder'] };
  return { d, trilha };
}

describe('microfone da Conversa', () => {
  it('parar devolve o áudio e desliga o microfone', async () => {
    const { d, trilha } = falso();
    const g = await gravar(d);
    const audio = await g.parar();
    expect(audio.size).toBeGreaterThan(0);
    expect(trilha.parada).toBe(true);
  });

  it('cancelar desliga o microfone na hora', async () => {
    // Sair da tela no meio da gravação deixava o microfone aberto (a luz do navegador seguia acesa).
    const { d, trilha } = falso();
    const g = await gravar(d);
    g.cancelar();
    expect(trilha.parada).toBe(true);
  });
});
