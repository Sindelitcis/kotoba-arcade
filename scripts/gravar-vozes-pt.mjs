/**
 * Grava o português falado (aulas do modo Ouvir, lição do Kumitate, narração da Aventura,
 * retorno da Jornada). A lista sai de `scripts/falas-pt.ts`.
 *
 *   npm run vozes-pt:voz1   Voz 1 (Fish Speech com o modelo afinado), em public/vozes-pt/voz1/
 *   npm run vozes-pt:voz2   Voz 2 (Kokoro, pf_dora), em public/vozes-pt/voz2/
 *
 * As duas passam pela trava da placa. A Voz 1 lê os caminhos do motor em local/config.local.json
 * (seção "voz1"), que não vai para o Git. Ver docs/vozes.md.
 * Variáveis: VOZ_DIR (padrão D:/KotobaArcade/voz), PT_VOZ2_PYTHON.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const raiz = resolve(fileURLToPath(import.meta.url), '../..');
const vozDir = process.env.VOZ_DIR ?? 'D:/KotobaArcade/voz';
const voz1 = process.argv.includes('--voz1');
if (!voz1 && !process.argv.includes('--voz2')) {
  console.error('use --voz1 ou --voz2');
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
if (voz1) {
  const cfg = JSON.parse(readFileSync(join(raiz, 'local/config.exemplo.json'), 'utf8'));
  const cfgLocal = join(raiz, 'local/config.local.json');
  if (existsSync(cfgLocal)) juntar(cfg, JSON.parse(readFileSync(cfgLocal, 'utf8')));
  const a = cfg.voz1 ?? {};
  const faltam = ['python', 'motor', 'referencia'].filter((k) => !a[k]);
  if (faltam.length) {
    console.error(`faltam em local/config.local.json, seção "voz1": ${faltam.join(', ')} (ver docs/vozes.md)`);
    process.exit(2);
  }
  r = spawnSync(
    a.python,
    ['-I', '-B', join(raiz, 'scripts/gravar_pt_voz1.py'), '--falas', entrada, '--saida', join(raiz, 'public/vozes-pt/voz1'), '--duvidas', join(trabalho, 'duvidas-pt-voz1.json'), '--conferidas', join(trabalho, 'conferidas-pt-voz1.json'), '--motor', a.motor, '--referencia', a.referencia],
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
  const python = process.env.PT_VOZ2_PYTHON ?? join(vozDir, 'pt-livre/venv/Scripts/python.exe');
  r = spawnSync(
    python,
    ['-I', '-B', join(raiz, 'scripts/gravar_pt_voz2.py'), '--falas', entrada, '--saida', join(raiz, 'public/vozes-pt/voz2'), '--duvidas', join(trabalho, 'duvidas-pt-voz2.json'), '--conferidas', join(trabalho, 'conferidas-pt-voz2.json')],
    // HF_HOME: o Whisper turbo e o Kokoro ficam no D:, junto dos outros modelos de voz.
    { stdio: 'inherit', env: { HF_HOME: 'D:/KotobaArcade/ia/hf', ...process.env, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1' } },
  );
}
process.exit(r.status ?? 1);
