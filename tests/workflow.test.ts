import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const yml = readFileSync(new URL('../.github/workflows/publicar.yml', import.meta.url), 'utf8');

describe('workflow de publicação', () => {
  // Em 21/11/2026 o deploy do GitHub Pages falhou por instabilidade do GitHub. Rodar o job de novo
  // subia um segundo pacote "github-pages" na mesma run, e o deploy-pages recusava os dois.
  it('o pacote do GitHub Pages tem um nome por tentativa, no upload e no deploy', () => {
    expect(yml).toMatch(/upload-pages-artifact@v\d[\s\S]*?name: github-pages-\$\{\{ github\.run_attempt \}\}/);
    expect(yml).toMatch(/deploy-pages@v\d[\s\S]*?artifact_name: github-pages-\$\{\{ github\.run_attempt \}\}/);
  });
});
