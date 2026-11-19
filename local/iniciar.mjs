// `npm run local`: sobe tudo que a Conversa por voz precisa neste PC e abre o jogo.
//   - o servidor local (fala, conversa e furigana) em Python
//   - o VOICEVOX (voz dos personagens), se o config apontar o run.exe
//   - o Ollama, se ainda não estiver rodando
//   - o fliperama em http://localhost:5173
// Ctrl+C fecha tudo que foi aberto aqui.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = dirname(AQUI);

function juntar(base, extra) {
  for (const [k, v] of Object.entries(extra)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') juntar(base[k], v);
    else base[k] = v;
  }
  return base;
}

const cfg = JSON.parse(readFileSync(join(AQUI, 'config.exemplo.json'), 'utf8'));
const localPath = join(AQUI, 'config.local.json');
if (existsSync(localPath)) juntar(cfg, JSON.parse(readFileSync(localPath, 'utf8')));
const python = cfg.python || (existsSync(join(AQUI, '.venv/Scripts/python.exe')) ? join(AQUI, '.venv/Scripts/python.exe') : 'python');
const env = {
  ...process.env,
  PYTHONDONTWRITEBYTECODE: '1',
  PYTHONIOENCODING: 'utf-8',
  PYTHONUTF8: '1',
};
if (cfg.cache_modelos) env.HF_HOME = cfg.cache_modelos;

const filhos = [];
function subir(nome, cmd, args, opts = {}) {
  const p = spawn(cmd, args, {
    env,
    cwd: opts.cwd ?? AQUI,
    shell: opts.shell ?? false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const linha = (buf) => {
    for (const l of buf.toString().split(/\r?\n/)) {
      if (!l.trim() || (opts.filtro && !opts.filtro(l))) continue;
      console.log(`[${nome}] ${l.replace(/^\[\w+\]\s*/, '')}`);
    }
  };
  p.stdout.on('data', linha);
  p.stderr.on('data', linha);
  p.on('exit', (code) => console.log(`[${nome}] parou (${code ?? 'sinal'})`));
  filhos.push(p);
  return p;
}

async function responde(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    return false;
  }
}

// Avisos de bibliotecas (torch, triton) só poluem a tela.
const semAviso = (l) => !/warn|deprecat|^\s+(warnings\.|equal \||mask \||return node|WeightNorm)|softmax|split the|important use|tracemalloc/i.test(l);

if (!(await responde(`${cfg.conversa.ollama}/api/version`))) {
  console.log('[ollama] não estava rodando, abrindo...');
  subir('ollama', 'ollama', ['serve'], { filtro: () => false });
}
subir('servidor', python, [join(AQUI, 'servidor.py')], { filtro: semAviso });
const vv = cfg.voz.voicevox;
if (cfg.voz.motor === 'voicevox' && !(await responde(`${vv.url}/version`))) {
  if (vv.exe && existsSync(vv.exe)) {
    const portaVoz = new URL(vv.url).port || '50021';
    subir('voz', vv.exe, ['--host', '127.0.0.1', '--port', portaVoz], {
      cwd: dirname(vv.exe),
      filtro: (l) => /error/i.test(l),
    });
  } else {
    console.log('[voz] O VOICEVOX não está aberto e o config não aponta o run.exe: as falas usam a voz do navegador.');
  }
}
subir('jogo', process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', '--strictPort'], {
  cwd: RAIZ,
  shell: process.platform === 'win32',
  filtro: (l) => /Local:|error/i.test(l),
});

console.log('\nSubindo. A primeira vez pode levar alguns minutos (o reconhecimento de fala baixa o modelo).');
console.log('Quando aparecer "tudo pronto", abra http://localhost:5173 e escolha Conversa.\n');

const inicio = Date.now();
const porta = cfg.porta ?? 8791;
const timer = setInterval(async () => {
  try {
    const s = await (
      await fetch(`http://127.0.0.1:${porta}/saude`, {
        signal: AbortSignal.timeout(1500),
      })
    ).json();
    if (s.conversa.ok && s.fala.ok && (s.voz.ok || cfg.voz.motor === 'nenhum')) {
      clearInterval(timer);
      console.log(`\ntudo pronto em ${Math.round((Date.now() - inicio) / 1000)}s: http://localhost:5173 (Ctrl+C fecha)\n`);
    }
  } catch {
    // ainda subindo
  }
}, 3000);

function fechar() {
  clearInterval(timer);
  for (const p of filhos) {
    if (p.exitCode !== null) continue;
    if (process.platform === 'win32')
      spawn('taskkill', ['/pid', String(p.pid), '/t', '/f'], {
        stdio: 'ignore',
      });
    else p.kill();
  }
  setTimeout(() => process.exit(0), 500);
}
process.on('SIGINT', fechar);
process.on('SIGTERM', fechar);
