/** Gravação do microfone para a Conversa. Fica fora da tela para dar para testar sem navegador. */

export interface Gravacao {
  /** Para e devolve o áudio gravado. */
  parar(): Promise<Blob>;
  /** Para e joga fora (o jogador saiu da tela). Desliga o microfone na hora. */
  cancelar(): void;
}

export interface Dispositivos {
  getUserMedia(c: MediaStreamConstraints): Promise<MediaStream>;
  Recorder: new (stream: MediaStream) => MediaRecorder;
}

const doNavegador = (): Dispositivos => ({
  getUserMedia: (c) => navigator.mediaDevices.getUserMedia(c),
  Recorder: MediaRecorder,
});

export async function gravar(d: Dispositivos = doNavegador()): Promise<Gravacao> {
  const stream = await d.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const rec = new d.Recorder(stream);
  const partes: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size > 0 && partes.push(e.data);
  rec.start();
  const desligar = () => stream.getTracks().forEach((t) => t.stop());
  return {
    parar: () =>
      new Promise((resolve) => {
        rec.onstop = () => {
          desligar();
          resolve(new Blob(partes, { type: rec.mimeType || 'audio/webm' }));
        };
        rec.stop();
      }),
    cancelar: () => {
      rec.onstop = null;
      if (rec.state !== 'inactive') rec.stop();
      desligar();
    },
  };
}
