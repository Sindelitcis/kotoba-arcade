/**
 * O gerenciador de som do fliperama: um só AudioContext, com um volume para a música,
 * um para os efeitos e um para a voz.
 *
 * - Nada toca antes da primeira interação (clique, toque ou tecla). Uma trilha pedida antes
 *   disso fica guardada e começa nessa hora.
 * - Quando uma voz fala, a música abaixa (ducking) e volta quando ela acaba: o áudio que
 *   ensina tem prioridade.
 * - Trocar de clima faz crossfade entre as trilhas.
 * - Som desligado nos Ajustes cala tudo; aba escondida baixa a música.
 */
import { signal } from '@preact/signals';
import { app } from '../app';
import { EFEITOS, TRILHAS, type Clima, type EfeitoId } from './catalogo';

const MUSICAS = import.meta.glob<string>('../../assets/som/musica/*.ogg', { eager: true, query: '?url', import: 'default' });
const SONS = import.meta.glob<string>('../../assets/som/efeitos/*.ogg', { eager: true, query: '?url', import: 'default' });

export function urlDaTrilha(clima: Clima): string | undefined {
  return MUSICAS[`../../assets/som/musica/${clima}.ogg`];
}

export function urlDoEfeito(id: EfeitoId): string | undefined {
  return SONS[`../../assets/som/efeitos/${id}.ogg`];
}

/** Quanto sobra da música enquanto uma voz fala. */
export const DUCK = 0.22;
const DUCK_DESCE = 0.12;
const DUCK_SOBE = 0.7;
const CROSSFADE = 1.4;
/** Volume das trilhas antes do ajuste do jogador: fundo, abaixo dos efeitos e da voz. */
const BASE_MUSICA = 0.5;

/** Primeira interação aconteceu: o navegador deixa tocar. */
export const liberado = signal(false);
/** Vozes tocando agora. */
export const vozesAtivas = signal(0);

let ac: AudioContext | null = null;
let mestre: GainNode | null = null;
let musica: GainNode | null = null;
let duck: GainNode | null = null;
let efeitos: GainNode | null = null;
let escondida = false;

/** Volume-alvo da música: o do jogador, e só uma fração dele enquanto alguém fala. */
export function alvoMusica(volMusica: number, vozes: number): number {
  return (vozes > 0 ? DUCK : 1) * volMusica;
}

function ligado(): boolean {
  return app.data.settings.sound;
}

/** O contexto de áudio, criado só depois da primeira interação. Null sem som ou sem Web Audio. */
export function contextoAudio(): AudioContext | null {
  if (!liberado.value || !ligado()) return null;
  if (!ac) {
    if (typeof AudioContext === 'undefined') return null;
    try {
      ac = new AudioContext();
    } catch {
      return null;
    }
    mestre = ac.createGain();
    mestre.connect(ac.destination);
    musica = ac.createGain();
    duck = ac.createGain();
    musica.connect(duck).connect(mestre);
    efeitos = ac.createGain();
    efeitos.connect(mestre);
    aplicarVolumes();
  }
  if (ac.state === 'suspended') void ac.resume();
  return ac;
}

/** Onde a música se liga (passa pelo volume de música e pelo ducking). */
export function barramentoMusica(): AudioNode | null {
  return contextoAudio() ? musica : null;
}

function rampa(g: GainNode | null, alvo: number, seg: number): void {
  if (!ac || !g) return;
  const t = ac.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.linearRampToValueAtTime(alvo, t + seg);
}

/** Lê os Ajustes e aplica nos volumes (chamado quando eles mudam). */
export function aplicarVolumes(): void {
  const s = app.data.settings;
  rampa(mestre, s.sound ? 1 : 0, 0.05);
  rampa(musica, escondida ? 0 : s.volMusica * BASE_MUSICA, 0.3);
  rampa(efeitos, s.volEfeitos, 0.05);
  rampa(duck, alvoMusica(1, vozesAtivas.value), vozesAtivas.value > 0 ? DUCK_DESCE : DUCK_SOBE);
}

/** Volume da voz (0 a 1), já contando o som desligado. */
export function volumeVoz(): number {
  return ligado() ? app.data.settings.volVoz : 0;
}

/**
 * Acompanha uma voz: aplica o volume de voz e abaixa a música enquanto ela toca.
 * Chame antes de começar a tocar ou falar.
 */
export function acompanharVoz(fonte: HTMLAudioElement): void {
  fonte.volume = volumeVoz();
  if (typeof fonte.addEventListener !== 'function') return;
  let ativa = false;
  const comeca = () => {
    if (ativa) return;
    ativa = true;
    vozesAtivas.value++;
    aplicarVolumes();
  };
  const acaba = () => {
    if (!ativa) return;
    ativa = false;
    vozesAtivas.value = Math.max(0, vozesAtivas.value - 1);
    aplicarVolumes();
  };
  for (const ev of ['play', 'playing']) fonte.addEventListener(ev, comeca);
  for (const ev of ['pause', 'ended', 'error', 'emptied', 'abort']) fonte.addEventListener(ev, acaba);
}

// ---------- arquivos ----------

const buffers = new Map<string, Promise<AudioBuffer | null>>();

export function carregar(c: AudioContext, url: string): Promise<AudioBuffer | null> {
  let p = buffers.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((d) => c.decodeAudioData(d))
      .catch(() => {
        buffers.delete(url);
        return null;
      });
    buffers.set(url, p);
  }
  return p;
}

// ---------- efeitos ----------

export interface OpcoesEfeito {
  /** Velocidade (sobe o tom): 1 é o normal. */
  rate?: number;
  /** Volume relativo, 0 a 1. */
  ganho?: number;
  /** Atraso em segundos. */
  atraso?: number;
}

/** Toca um efeito. Antes da primeira interação ou com som desligado, não faz nada. */
export function tocarEfeito(id: EfeitoId, op: OpcoesEfeito = {}): void {
  const c = contextoAudio();
  const url = urlDoEfeito(id);
  if (!c || !url || !efeitos || !EFEITOS[id]) return;
  const quando = c.currentTime + (op.atraso ?? 0);
  void carregar(c, url).then((buf) => {
    if (!buf || !efeitos) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = op.rate ?? 1;
    const g = c.createGain();
    g.gain.value = op.ganho ?? 1;
    src.connect(g).connect(efeitos);
    src.start(Math.max(quando, c.currentTime));
  });
}

// ---------- trilhas ----------

interface Tocando {
  clima: Clima;
  src: AudioBufferSourceNode;
  g: GainNode;
}

let tocando: Tocando | null = null;
let pedido: Clima | null = null;
let versao = 0;

/** Clima que deveria estar tocando agora (o último pedido). */
export function climaPedido(): Clima | null {
  return pedido;
}

/** Troca a trilha de fundo com crossfade. `null` deixa em silêncio (Kana Beat, Conversa). */
export function tocarClima(clima: Clima | null): void {
  pedido = clima;
  const v = ++versao;
  const c = contextoAudio();
  if (!c || !musica) return;
  if (tocando?.clima === clima) return;
  const antigo = tocando;
  tocando = null;
  if (antigo) {
    rampa(antigo.g, 0, CROSSFADE * 0.7);
    setTimeout(() => {
      try {
        antigo.src.stop();
      } catch {
        // já parada
      }
      antigo.g.disconnect();
    }, CROSSFADE * 1000);
  }
  const url = clima ? urlDaTrilha(clima) : undefined;
  if (!clima || !url || !TRILHAS[clima]) return;
  void carregar(c, url).then((buf) => {
    if (!buf || v !== versao || !musica) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = c.createGain();
    g.gain.value = 0;
    src.connect(g).connect(musica);
    src.start();
    rampa(g, 1, CROSSFADE);
    tocando = { clima, src, g };
  });
}

// ---------- primeira interação e aba escondida ----------

/** Libera o som (chamado na primeira interação) e começa a trilha que já estava pedida. */
export function liberar(): void {
  if (liberado.value) return;
  liberado.value = true;
  if (contextoAudio()) tocarClima(pedido);
}

const INTERACOES = ['pointerdown', 'keydown', 'touchstart'] as const;

function primeiraInteracao(): void {
  for (const ev of INTERACOES) window.removeEventListener(ev, primeiraInteracao, true);
  liberar();
}

function esperarInteracao(): void {
  if (typeof window === 'undefined') return;
  for (const ev of INTERACOES) window.addEventListener(ev, primeiraInteracao, true);
}

esperarInteracao();
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    escondida = document.hidden;
    aplicarVolumes();
  });
}

/** Só para testes: volta ao estado de antes da primeira interação. */
export function _zerarParaTeste(): void {
  liberado.value = false;
  vozesAtivas.value = 0;
  tocando = null;
  pedido = null;
  ac = mestre = musica = duck = efeitos = null;
  buffers.clear();
  esperarInteracao();
}
