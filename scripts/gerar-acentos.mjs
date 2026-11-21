/**
 * Tira da base da Kanjium (CC BY-SA 4.0) o acento das palavras que os jogos usam e grava
 * em `src/content/aprofundar/acentos.json`. O Aprofundar mostra o desenho do acento (alto
 * e baixo) em cima de cada mora.
 *
 *   node scripts/gerar-acentos.mjs [caminho da kanjium-accents.txt]
 *
 * Padrão: D:/KotobaArcade/voz/dados/kanjium-accents.txt. Só muda o arquivo quando muda
 * alguma palavra; rode de novo quando entrar vocabulário novo (o teste avisa).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const raiz = resolve(fileURLToPath(import.meta.url), '../..');
const base = process.argv[2] ?? 'D:/KotobaArcade/voz/dados/kanjium-accents.txt';

const vite = await createServer({ root: raiz, configFile: false, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } });
let palavras;
try {
  palavras = (await vite.ssrLoadModule('/src/content/aprofundar/palavras.ts')).palavrasComAcento();
} finally {
  await vite.close();
}

const hira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const kanjium = new Map();
for (const linha of readFileSync(base, 'utf8').split(/\r?\n/)) {
  const [jp, kana, acentos] = linha.split('\t');
  if (!acentos) continue;
  const lista = acentos.split(',').map((x) => Number(x.trim())).filter((n) => Number.isInteger(n) && n >= 0);
  if (lista.length) kanjium.set(`${jp}\t${kana}`, lista);
}

const saida = {};
let achadas = 0;
for (const { jp, kana } of palavras) {
  const k = hira(kana);
  const lista = kanjium.get(`${jp}\t${k}`) ?? kanjium.get(`${kana}\t${k}`) ?? kanjium.get(`${k}\t${k}`);
  if (!lista) continue;
  saida[`${jp}|${kana}`] = lista;
  achadas++;
}
const ordenado = Object.fromEntries(Object.entries(saida).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
writeFileSync(resolve(raiz, 'src/content/aprofundar/acentos.json'), `${JSON.stringify(ordenado, null, 0).replace(/\],"/g, '],\n"')}\n`);
console.log(`${achadas} de ${palavras.length} palavras com acento na Kanjium.`);
