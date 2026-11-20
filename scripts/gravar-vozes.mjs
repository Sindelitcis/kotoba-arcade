/**
 * Grava a voz de tudo que os jogos falam e que é fixo.
 *
 *   npm run vozes
 *
 * O `npm run vozes` passa por `scripts/placa.py`, a trava da placa de vídeo: espera a placa ficar livre,
 * sobe os dois motores de voz, grava e derruba os motores no fim. Se a trava morrer, os motores morrem junto.
 *
 * 1. Lê a lista de falas de `scripts/falas.ts` (pelo Vite, que entende TypeScript).
 * 2. Chama `scripts/gravar_vozes.py`, que fala com os motores de voz, confere
 *    leitura e acento, normaliza o volume, corta o silêncio e grava mp3 em
 *    `public/vozes/`, junto com o `manifesto.json`.
 *
 * Usa o AivisSpeech Engine (frases) e o VOICEVOX Engine (palavras soltas e kana). Motor que já estiver
 * no ar é usado como está; o que não estiver, este script sobe e derruba. Modelos e ambiente ficam fora
 * do repositório; ver `docs/vozes.md`.
 * Variáveis: VOZ_DIR, VOZ_PYTHON, AIVIS_URL, VOICEVOX_URL, AIVIS_EXE, VOICEVOX_EXE.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, openSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const raiz = resolve(fileURLToPath(import.meta.url), '../..');
const vozDir = process.env.VOZ_DIR ?? 'D:/KotobaArcade/voz';
const python = process.env.VOZ_PYTHON ?? join(vozDir, 'venv/Scripts/python.exe');
const aivis = process.env.AIVIS_URL ?? 'http://127.0.0.1:10101';
const voicevox = process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021';
const motores = [
  { nome: 'AivisSpeech', url: aivis, exe: process.env.AIVIS_EXE ?? join(vozDir, 'aivis/Windows-x64/run.exe'), args: ['--use_gpu'] },
  { nome: 'VOICEVOX', url: voicevox, exe: process.env.VOICEVOX_EXE ?? 'D:/KotobaArcade/ia/voicevox/run.exe', args: [] },
];

async function noAr(url) {
  try {
    return (await fetch(`${url}/version`, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
}

/** Sobe o motor que não estiver no ar e espera responder. Devolve os processos que este script subiu. */
async function subirMotores(pasta) {
  const subidos = [];
  for (const m of motores) {
    if (await noAr(m.url)) continue;
    const log = openSync(join(pasta, `${m.nome.toLowerCase()}.log`), 'w');
    const porta = new URL(m.url).port;
    subidos.push(spawn(m.exe, [...m.args, '--port', porta], { stdio: ['ignore', log, log] }));
    console.log(`subindo o ${m.nome} na porta ${porta}...`);
  }
  const limite = Date.now() + 5 * 60_000;
  for (const m of motores) {
    while (!(await noAr(m.url))) {
      if (Date.now() > limite) throw new Error(`o ${m.nome} não respondeu em 5 minutos (veja ${pasta})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return subidos;
}

function derrubar(processos) {
  for (const p of processos) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/T', '/F', '/PID', String(p.pid)], { stdio: 'ignore' });
    else p.kill();
  }
}

const vite = await createServer({ root: raiz, configFile: false, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
let falas, vozes, padrao;
try {
  ({ listarFalas: falas } = await vite.ssrLoadModule('/scripts/falas.ts'));
  ({ VOZES: vozes, VOZ_PADRAO: padrao } = await vite.ssrLoadModule('/src/core/vozes.ts'));
  falas = falas();
} finally {
  await vite.close();
}

const trabalho = join(vozDir, 'trabalho');
mkdirSync(trabalho, { recursive: true });
const entrada = join(trabalho, 'falas.json');
writeFileSync(entrada, JSON.stringify({ vozes, padrao, falas }, null, 1));
console.log(`${falas.length} falas para gravar ou conferir.`);
// `npm run vozes -- --listar`: só grava a lista em VOZ_DIR/trabalho/falas.json.
if (process.argv.includes('--listar')) process.exit(0);

const subidos = await subirMotores(trabalho);
let r;
try {
  r = spawnSync(
    python,
    [
      join(raiz, 'scripts/gravar_vozes.py'),
      '--falas', entrada,
      '--saida', join(raiz, 'public/vozes'),
      '--aivis', aivis,
      '--voicevox', voicevox,
      '--kanjium', join(vozDir, 'dados/kanjium-accents.txt'),
      '--relatorio', join(trabalho, 'relatorio.json'),
      '--duvidas', join(trabalho, 'duvidas.json'),
      ...process.argv.slice(2),
    ],
    // HF_HOME: onde o Whisper large-v3-turbo já está baixado (o mesmo da Conversa por voz).
    { stdio: 'inherit', env: { HF_HOME: 'D:/KotobaArcade/ia/hf', ...process.env, PYTHONUTF8: '1' } },
  );
} finally {
  derrubar(subidos);
}
process.exit(r.status ?? 1);
