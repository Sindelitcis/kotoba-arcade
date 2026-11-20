/**
 * Grava o português falado (aulas do modo Ouvir, lição do Kumitate, narração da Aventura,
 * retorno da Jornada). A lista sai de `scripts/falas-pt.ts`.
 *
 *   npm run aulas:livre   voz livre (Kokoro, pf_dora), pela trava da placa (o Whisper confere na placa), em public/vozes-pt/ (vai para o site)
 *   npm run aulas:local   voz do PC (Fish Speech), pela trava da placa, numa pasta FORA do repositório
 *
 * A voz do PC lê os caminhos de local/config.local.json ("aulas"), que não vai para o Git. Ver docs/vozes.md.
 * Variáveis: VOZ_DIR (padrão D:/KotobaArcade/voz), PT_LIVRE_PYTHON.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const raiz = resolve(fileURLToPath(import.meta.url), '../..');
const vozDir = process.env.VOZ_DIR ?? 'D:/KotobaArcade/voz';
const local = process.argv.includes('--local');
if (!local && !process.argv.includes('--livre')) {
  console.error('use --livre (voz livre, para o site) ou --local (voz do PC, fica só no PC)');
  process.exit(2);
}

const vite = await createServer({
  root: raiz,
  configFile: false,
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true },
});
let falas;
try {
  falas = (await vite.ssrLoadModule('/scripts/falas-pt.ts')).listarFalasPt();
} finally {
  await vite.close();
}

const trabalho = join(vozDir, 'trabalho');
mkdirSync(trabalho, { recursive: true });
const entrada = join(trabalho, 'falas-pt.json');
writeFileSync(entrada, JSON.stringify({ falas }, null, 1));
console.log(`${falas.length} falas em português.`);

function juntar(base, extra) {
  for (const [k, v] of Object.entries(extra)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') juntar(base[k], v);
    else base[k] = v;
  }
  return base;
}

let r;
if (local) {
  const cfg = JSON.parse(readFileSync(join(raiz, 'local/config.exemplo.json'), 'utf8'));
  const cfgLocal = join(raiz, 'local/config.local.json');
  if (existsSync(cfgLocal)) juntar(cfg, JSON.parse(readFileSync(cfgLocal, 'utf8')));
  const a = cfg.aulas ?? {};
  const faltam = ['pasta', 'python', 'motor'].filter((k) => !a[k]);
  if (faltam.length) {
    console.error(`faltam em local/config.local.json, seção "aulas": ${faltam.join(', ')} (ver docs/vozes.md)`);
    process.exit(2);
  }
  r = spawnSync(
    a.python,
    ['-I', '-B', join(raiz, 'local/gravar_aulas.py'), '--falas', entrada, '--saida', a.pasta, '--duvidas', join(trabalho, 'duvidas-pt-local.json'), '--conferidas', join(trabalho, 'conferidas-pt-local.json'), '--motor', a.motor, '--voz', a.voz || 'amigo'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...(a.hf_home ? { HF_HOME: a.hf_home } : {}),
        ...(a.torch_home ? { TORCH_HOME: a.torch_home } : {}),
        PYTHONUTF8: '1',
        PYTHONDONTWRITEBYTECODE: '1',
      },
    },
  );
} else {
  const python = process.env.PT_LIVRE_PYTHON ?? join(vozDir, 'pt-livre/venv/Scripts/python.exe');
  r = spawnSync(
    python,
    ['-I', '-B', join(raiz, 'scripts/gravar_pt_livre.py'), '--falas', entrada, '--saida', join(raiz, 'public/vozes-pt'), '--duvidas', join(trabalho, 'duvidas-pt-livre.json'), '--conferidas', join(trabalho, 'conferidas-pt-livre.json')],
    // HF_HOME: o Whisper turbo e o Kokoro ficam no D:, junto dos outros modelos de voz.
    { stdio: 'inherit', env: { HF_HOME: 'D:/KotobaArcade/ia/hf', ...process.env, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1' } },
  );
}
process.exit(r.status ?? 1);
