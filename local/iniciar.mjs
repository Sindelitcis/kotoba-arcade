// Sobe tudo que a Conversa por voz precisa neste PC.
//
//   npm run local          servidor + motores + o fliperama em http://localhost:5173
//   node local/iniciar.mjs --site
//                          só a IA, para o site publicado usar (é o que o link kotoba-local:// roda).
//                          Desliga sozinho depois de `desligar_ocioso_min` minutos sem conversa.
//
// O que sobe:
//   - o Ollama, se ainda não estiver rodando
//   - o servidor local (fala, conversa e furigana) em Python, que prende a trava da placa antes de carregar
//   - o AivisSpeech ou o VOICEVOX (voz dos personagens), depois que a placa estiver presa
// Ctrl+C (ou fechar a janela) fecha tudo que foi aberto aqui e tira o modelo da placa.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = dirname(AQUI);
const SITE = process.argv.includes('--site');

function juntar(base, extra) {
  for (const [k, v] of Object.entries(extra)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') juntar(base[k], v);
    else base[k] = v;
  }
  return base;
}

// Mesma ordem do config.py: KOTOBA_CONFIG, local/config.local.json, D:\KotobaArcade\ia\config.local.json.
const cfg = JSON.parse(readFileSync(join(AQUI, 'config.exemplo.json'), 'utf8'));
const candidatos = process.env.KOTOBA_CONFIG ? [process.env.KOTOBA_CONFIG] : [join(AQUI, 'config.local.json'), 'D:/KotobaArcade/ia/config.local.json'];
const localPath = candidatos.find((c) => existsSync(c));
if (localPath) juntar(cfg, JSON.parse(readFileSync(localPath, 'utf8')));
const python = cfg.python || (existsSync(join(AQUI, '.venv/Scripts/python.exe')) ? join(AQUI, '.venv/Scripts/python.exe') : 'python');
const env = {
  ...process.env,
  PYTHONDONTWRITEBYTECODE: '1',
  PYTHONIOENCODING: 'utf-8',
  PYTHONUTF8: '1',
};
if (cfg.cache_modelos) env.HF_HOME = cfg.cache_modelos;
const porta = cfg.porta ?? 8791;
const SAUDE = `http://127.0.0.1:${porta}/saude`;

async function lerSaude() {
  try {
    return await (await fetch(SAUDE, { signal: AbortSignal.timeout(6000) })).json();
  } catch {
    return null;
  }
}

if (SITE) {
  process.title = 'Kotoba Arcade: IA do PC';
  // Clicar no botão do site duas vezes não sobe tudo de novo.
  if (await lerSaude()) {
    console.log('A IA do PC já está ligada. Pode fechar esta janela.');
    setTimeout(() => process.exit(0), 3000);
    await new Promise(() => {});
  }
}

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
const servidor = subir('servidor', python, [join(AQUI, 'servidor.py')], { filtro: semAviso });
servidor.on('exit', () => void fechar());

if (!SITE) {
  subir('jogo', process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', '--strictPort'], {
    cwd: RAIZ,
    shell: process.platform === 'win32',
    filtro: (l) => /Local:|error/i.test(l),
  });
}

console.log('\nSubindo. A primeira vez pode levar alguns minutos (o reconhecimento de fala baixa o modelo).');
console.log(SITE ? 'Quando aparecer "tudo pronto", volte para o site: a Conversa usa a IA do PC.\n' : 'Quando aparecer "tudo pronto", abra http://localhost:5173 e escolha Conversa.\n');

// A voz só sobe depois que o servidor prende a placa: com ela no ar antes, a trava acharia que a placa está ocupada.
const motorVoz = cfg.voz[cfg.voz.motor];
let vozPedida = false;
async function subirVoz() {
  vozPedida = true;
  if (!motorVoz?.url || (await responde(`${motorVoz.url}/version`))) return;
  if (motorVoz.exe && existsSync(motorVoz.exe)) {
    const portaVoz = new URL(motorVoz.url).port;
    subir('voz', motorVoz.exe, ['--host', '127.0.0.1', '--port', portaVoz, ...(motorVoz.gpu ? ['--use_gpu'] : [])], {
      cwd: dirname(motorVoz.exe),
      // O AivisSpeech tenta escrever o japonês do log no console do Windows e reclama; a voz sai normal.
      filtro: (l) => /error/i.test(l) && !/Logging error|UnicodeEncodeError/.test(l),
    });
  } else {
    console.log(`[voz] O motor de voz (${cfg.voz.motor}) não está aberto e o config não aponta o run.exe: as falas usam a voz do navegador.`);
  }
}

const inicio = Date.now();
let pronto = false;
let avisouPlaca = '';
const ocioso = Number(cfg.desligar_ocioso_min ?? 20);
const timer = setInterval(async () => {
  const s = await lerSaude();
  if (!s) return; // ainda subindo
  if (s.placa && !s.placa.ok) {
    if (s.placa.motivo !== avisouPlaca && s.placa.motivo !== 'abrindo') console.log(`[placa] ocupada (${s.placa.motivo}). Esperando ficar livre; enquanto isso o site usa a nuvem.`);
    avisouPlaca = s.placa.motivo;
    return;
  }
  if (!vozPedida) await subirVoz();
  if (!pronto && s.conversa.ok && s.fala.ok && (s.voz.ok || cfg.voz.motor === 'nenhum')) {
    pronto = true;
    const onde = SITE ? 'volte para o site' : 'http://localhost:5173';
    console.log(`\ntudo pronto em ${Math.round((Date.now() - inicio) / 1000)}s: ${onde} (Ctrl+C fecha)\n`);
    if (SITE && ocioso > 0) console.log(`Sem conversa por ${ocioso} min, a IA do PC desliga sozinha e libera a placa.\n`);
  }
  if (SITE && ocioso > 0 && pronto && s.ocioso_s >= ocioso * 60) {
    console.log(`\n${ocioso} min sem conversa: desligando para liberar a placa.`);
    void fechar();
  }
}, 3000);

let fechando = false;
async function fechar() {
  if (fechando) return;
  fechando = true;
  clearInterval(timer);
  // Tira o modelo da placa antes de soltar a trava: senão a próxima pessoa acha a placa ocupada por 30 min.
  try {
    await fetch(`${cfg.conversa.ollama}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({ model: cfg.conversa.modelo, keep_alive: 0 }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Ollama já fechado
  }
  for (const p of filhos) {
    if (p.exitCode !== null) continue;
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(p.pid), '/t', '/f'], { stdio: 'ignore' });
    else p.kill();
  }
  setTimeout(() => process.exit(0), 500);
}
process.on('SIGINT', () => void fechar());
process.on('SIGTERM', () => void fechar());
process.on('SIGHUP', () => void fechar());
