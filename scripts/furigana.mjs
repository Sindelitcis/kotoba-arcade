/**
 * Gera a leitura (furigana) de todo japonês com kanji do site.
 *
 *   npm run furigana
 *
 * Carrega scripts/furigana.ts pelo Vite (que entende TypeScript), como o gravador de vozes faz.
 * Roda só na CPU: o OpenJTalk do motor de voz, sem a placa de vídeo. Ver docs/furigana.md.
 */
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const raiz = fileURLToPath(new URL('..', import.meta.url));
process.chdir(raiz);
const vite = await createServer({ root: raiz, configFile: false, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { gerarFurigana } = await vite.ssrLoadModule('/scripts/furigana.ts');
  if (!gerarFurigana()) process.exitCode = 1;
} finally {
  await vite.close();
}
