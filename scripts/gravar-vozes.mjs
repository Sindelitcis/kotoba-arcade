/**
 * Grava a voz de tudo que os jogos falam e que é fixo.
 *
 *   npm run vozes
 *
 * 1. Lê a lista de falas de `scripts/falas.ts` (pelo Vite, que entende TypeScript).
 * 2. Chama `scripts/gravar_vozes.py`, que fala com os motores de voz, confere
 *    leitura e acento, normaliza o volume, corta o silêncio e grava mp3 em
 *    `public/vozes/`, junto com o `manifesto.json`.
 *
 * O AivisSpeech Engine (frases) e o VOICEVOX Engine (palavras soltas e kana) precisam
 * estar rodando. Modelos e ambiente ficam fora do repositório; ver `docs/vozes.md`.
 * Variáveis: VOZ_DIR, VOZ_PYTHON, AIVIS_URL, VOICEVOX_URL.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const raiz = resolve(fileURLToPath(import.meta.url), '../..');
const vozDir = process.env.VOZ_DIR ?? 'D:/KotobaArcade-Voz';
const python = process.env.VOZ_PYTHON ?? join(vozDir, 'venv/Scripts/python.exe');
const aivis = process.env.AIVIS_URL ?? 'http://127.0.0.1:10101';
const voicevox = process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021';

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

const r = spawnSync(
  python,
  [
    join(raiz, 'scripts/gravar_vozes.py'),
    '--falas', entrada,
    '--saida', join(raiz, 'public/vozes'),
    '--aivis', aivis,
    '--voicevox', voicevox,
    '--kanjium', join(vozDir, 'dados/kanjium-accents.txt'),
    '--relatorio', join(trabalho, 'relatorio.json'),
    ...process.argv.slice(2),
  ],
  // HF_HOME: onde o Whisper large-v3-turbo já está baixado (o mesmo da Conversa por voz).
  { stdio: 'inherit', env: { HF_HOME: 'D:/KotobaArcade-IA/hf', ...process.env, PYTHONUTF8: '1' } },
);
process.exit(r.status ?? 1);
