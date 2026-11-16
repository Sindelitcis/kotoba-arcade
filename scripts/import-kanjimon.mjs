// Converte os dados do KanjiMon antigo (kanji.json + historinhas do index.html)
// para um JSON intermediário. Uso:
//   node scripts/import-kanjimon.mjs <pasta do KanjiMon antigo>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const src = process.argv[2];
if (!src) throw new Error('Passe a pasta do KanjiMon antigo');
const raw = JSON.parse(readFileSync(join(src, 'kanji.json'), 'utf8'));
const html = readFileSync(join(src, 'index.html'), 'utf8');

// historinhas: '一': "texto",
const stories = {};
const inicio = html.indexOf('const historias = {');
const bloco = html.slice(inicio, html.indexOf('};', inicio));
for (const linha of bloco.split('\n')) {
  const m = linha.match(/^\s*'(.)':\s*"(.*)",?\s*$/u);
  if (m) stories[m[1]] = m[2].split('\\"').join('"');
}

const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const out = [];
for (const k of raw) {
  const words = [];
  const sentences = [];
  for (const v of k.vocab) {
    const t = strip(v);
    const isSentence = t.includes('Frase:');
    const body = t.replace(/^.*Frase:\s*/u, '');
    const m = body.match(/^(.+?)\s*\((.+)\s+-\s+(.+)\)$/u);
    if (!m) {
      console.warn('não entendi:', k.kanji, t);
      continue;
    }
    const entry = { jp: m[1].trim(), romaji: m[2].trim(), pt: m[3].trim() };
    (isSentence ? sentences : words).push(entry);
  }
  out.push({ n: k.id, kanji: k.kanji, romaji: k.romaji, pt: k.sig, story: stories[k.kanji] ?? '', hp: k.hpBase, atk: k.atk, words, sentences });
}
writeFileSync(process.argv[3] ?? 'src/content/data/kanjimon.raw.json', JSON.stringify(out, null, 1));
console.log(
  out.length, 'kanji;',
  out.reduce((a, k) => a + k.words.length, 0), 'palavras;',
  out.reduce((a, k) => a + k.sentences.length, 0), 'frases;',
  out.filter((k) => !k.story).length, 'sem historinha',
);
