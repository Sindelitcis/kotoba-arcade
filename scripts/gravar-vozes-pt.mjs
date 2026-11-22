/**
 * Grava o português falado (aulas do modo Ouvir, lição do Kumitate, narração da Aventura,
 * retorno da Jornada). A lista sai de `scripts/falas-pt.ts`.
 *
 *   npm run vozes-pt   Fish Speech com o modelo afinado, em public/vozes-pt/voz1/
 *
 * Passa pela trava da placa. Os caminhos do motor ficam em local/config.local.json (seção
 * "voz1"), que não vai para o Git. Ver docs/vozes.md.
 * Variável: VOZ_DIR (padrão D:/KotobaArcade/voz).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const raiz = resolve(fileURLToPath(import.meta.url), '../..');
const vozDir = process.env.VOZ_DIR ?? 'D:/KotobaArcade/voz';

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

const cfg = JSON.parse(readFileSync(join(raiz, 'local/config.exemplo.json'), 'utf8'));
const cfgLocal = join(raiz, 'local/config.local.json');
if (existsSync(cfgLocal)) juntar(cfg, JSON.parse(readFileSync(cfgLocal, 'utf8')));
const a = cfg.voz1 ?? {};
const faltam = ['python', 'motor', 'referencia'].filter((k) => !a[k]);
if (faltam.length) {
  console.error(`faltam em local/config.local.json, seção "voz1": ${faltam.join(', ')} (ver docs/vozes.md)`);
  process.exit(2);
}
const r = spawnSync(
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
process.exit(r.status ?? 1);
