/** Partículas e tremor de tela. Um canvas só, por cima de tudo, que dorme quando não há nada. */
import { app } from './app';

interface Particle {
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
let particles: Particle[] = [];
let running = false;
let last = 0;

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
  particles = particles.filter((p) => p.life > 0);
  for (const p of particles) {
    p.life -= dt;
    p.vy += 900 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    g.globalAlpha = Math.max(0, p.life / p.max);
    g.fillStyle = p.color;
    g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  g.globalAlpha = 1;
  if (particles.length > 0) requestAnimationFrame(frame);
  else running = false;
}

export function burst(x: number, y: number, colors: string[], count = 24, power = 420): void {
  if (!ensureCanvas()) return;
  const n = app.data.settings.calm ? Math.ceil(count / 4) : count;
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = power * (0.3 + Math.random() * 0.7);
    const life = 0.5 + Math.random() * 0.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - power * 0.4,
      life,
      max: life,
      size: 4 + Math.random() * 6,
      color: colors[i % colors.length] as string,
    });
  }
  if (!running) {
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
}

export function burstFrom(el: Element | null, colors: string[], count?: number, power?: number): void {
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
