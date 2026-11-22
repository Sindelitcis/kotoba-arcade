import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from './base';

/**
 * O site publicado (dist, gerado pelo build antes do e2e) não tem voz do navegador, Voz 2
 * nem escolha de voz, e cabe no Cloudflare Pages: até 20 000 arquivos, 25 MiB por arquivo.
 */
const DIST = join(process.cwd(), 'dist');
const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivos(join(dir, e.name)) : [join(dir, e.name)]));

test('o dist não tem voz do navegador, Voz 2 nem escolha de voz, e cabe no Cloudflare Pages', () => {
  expect(existsSync(DIST), 'rode `npm run build` antes').toBe(true);
  const todos = arquivos(DIST);
  const textos = todos.filter((f) => /\.(js|css|html|json)$/.test(f));
  const proibido = /speechSynthesis|SpeechSynthesisUtterance|Kokoro|voz2|Voz 2|voz-pt-/;
  expect(textos.filter((f) => proibido.test(readFileSync(f, 'utf8')))).toEqual([]);
  expect(todos.filter((f) => /voz2|kokoro/i.test(f))).toEqual([]);
  expect(todos.length).toBeLessThan(20_000);
  expect(todos.filter((f) => statSync(f).size > 25 * 1024 * 1024)).toEqual([]);
});
