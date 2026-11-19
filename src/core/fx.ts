/**
 * Efeitos de tela no estilo mangá: respingos de tinta, onomatopeias desenhadas e tremor de quadro.
 * Um canvas só, por cima de tudo, que dorme quando não há nada. O modo calmo corta tremor e respingos.
 */
import { effect } from '@preact/signals';
import { app, tick } from './app';

/** Tinta, vermelho dos acertos e o segundo tom das recompensas raras. Iguais aos tokens de `styles.css`. */
export const INK = {
  tinta: '#151313',
  shu: '#d7261e',
  kin: '#e0a526',
  papel: '#f4f0e6',
} as const;

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

let canvas: HTMLCanvasElement | null = null;
let g: CanvasRenderingContext2D | null = null;
let drops: Drop[] = [];
let running = false;
let last = 0;

function calm(): boolean {
  return app.data.settings.calm || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// O CSS lê o modo calmo pelo atributo na raiz: some o tremor das linhas e as animações longas.
if (typeof document !== 'undefined') {
  effect(() => {
    void tick.value;
    document.documentElement.toggleAttribute('data-calma', app.data.settings.calm);
  });
}

function ensureCanvas(): boolean {
  if (canvas) return true;
  canvas = document.createElement('canvas');
  canvas.className = 'fx-layer';
  document.body.appendChild(canvas);
  g = canvas.getContext('2d');
  const resize = () => {
    if (!canvas) return;
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  };
  resize();
  addEventListener('resize', resize);
  return !!g;
}

function frame(t: number): void {
  if (!g || !canvas) return;
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  g.clearRect(0, 0, canvas.width, canvas.height);
  drops = drops.filter((p) => p.life > 0);
  for (const p of drops) {
    p.life -= dt;
    p.vy += 900 * dt;
    p.vx *= 0.98;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const k = Math.max(0, p.life / p.max);
    g.globalAlpha = Math.min(1, k * 1.6);
    g.fillStyle = p.color;
    // Gota de tinta: um borrão alongado na direção do voo, que encolhe ao secar.
    const angle = Math.atan2(p.vy, p.vx);
    g.beginPath();
    g.ellipse(p.x, p.y, p.size * (0.6 + k), p.size * 0.5 * (0.4 + k), angle, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  if (drops.length > 0) requestAnimationFrame(frame);
  else running = false;
}

/** Respingo de tinta saindo de um ponto. */
export function burst(x: number, y: number, colors: readonly string[], count = 24, power = 420): void {
  if (!ensureCanvas()) return;
  const n = calm() ? Math.ceil(count / 4) : count;
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = power * (0.3 + Math.random() * 0.7);
    const life = 0.45 + Math.random() * 0.45;
    drops.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - power * 0.35,
      life,
      max: life,
      size: 2 + Math.random() * 5,
      color: colors[i % colors.length] as string,
    });
  }
  if (!running) {
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
}

export function burstFrom(el: Element | null, colors: readonly string[], count?: number, power?: number): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, colors, count, power);
}

/** Reinicia uma animação CSS trocando a classe (tremor, flash, pulo). */
export function pulse(el: Element | null, cls: string): void {
  if (!el) return;
  if (app.data.settings.calm && cls === 'shake') return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

/**
 * Onomatopeias do jogo. Vermelho só para acerto e recompensa; o resto sai em tinta.
 * Cada uma tem um som parecido em `audio.ts`, para olho e ouvido dizerem a mesma coisa.
 */
export const SFX_WORDS = {
  acerto: 'ドン',
  rapido: 'ズバッ',
  erro: 'スカッ',
  captura: 'ピカッ',
  raro: 'ゴゴゴ',
  nivel: 'ドドン',
  bau: 'パカッ',
  encaixe: 'カチッ',
  defesa: 'ガキン',
  golpe: 'バキッ',
  revela: 'バッ',
} as const;

export type SfxWord = keyof typeof SFX_WORDS;

let layer: HTMLDivElement | null = null;

function ensureLayer(): HTMLDivElement {
  if (layer && layer.isConnected) return layer;
  layer = document.createElement('div');
  layer.className = 'onomato-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  return layer;
}

/**
 * Carimba uma onomatopeia desenhada perto de um elemento.
 * `cor`: 'shu' (vermelho, acerto), 'kin' (dourado, raro) ou 'tinta' (preto, o resto).
 */
export function onomato(word: SfxWord, el: Element | null, cor: 'shu' | 'kin' | 'tinta' = 'tinta', size = 1): HTMLElement | null {
  if (!el || typeof document === 'undefined') return null;
  const r = el.getBoundingClientRect();
  const quiet = calm();
  const span = document.createElement('span');
  span.className = `onomato c-${cor}${quiet ? ' quiet' : ''}`;
  span.dataset.word = word;
  span.textContent = SFX_WORDS[word];
  // Cada carimbo cai num lugar e num ângulo um pouco diferentes, como letra à mão.
  const side = Math.random() < 0.5 ? -1 : 1;
  const x = r.left + r.width / 2 + side * r.width * (0.18 + Math.random() * 0.2);
  // Em elemento baixo (um título, uma frase) a palavra vai por cima dele, para não tapar o texto.
  const y = r.height < 120 ? r.top - 34 * size : r.top + r.height * (0.2 + Math.random() * 0.25);
  span.style.left = `${Math.max(40, Math.min(innerWidth - 40, x))}px`;
  span.style.top = `${Math.max(30, Math.min(innerHeight - 30, y))}px`;
  span.style.setProperty('--rot', `${quiet ? 0 : side * (6 + Math.random() * 10)}deg`);
  span.style.setProperty('--size', String(size));
  ensureLayer().appendChild(span);
  window.setTimeout(() => span.remove(), quiet ? 700 : 950);
  return span;
}
