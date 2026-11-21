// @vitest-environment node
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

  // No mesmo dia, o deploy-pages procurou o pacote no mesmo segundo em que ele foi criado e não achou,
  // três vezes seguidas (o pacote estava lá). O deploy tenta de novo sozinho depois de esperar.
  it('o deploy do GitHub Pages tenta de novo se não achar o pacote na primeira', () => {
    expect(yml).toMatch(/id: deploy\r?\n\s+continue-on-error: true\r?\n\s+uses: actions\/deploy-pages@v\d/);
    expect(yml).toMatch(/if: steps\.deploy\.outcome == 'failure'\r?\n\s+run: sleep \d+/);
    expect(yml).toMatch(/id: deploy-de-novo\r?\n\s+if: steps\.deploy\.outcome == 'failure'\r?\n\s+uses: actions\/deploy-pages@v\d[\s\S]*?artifact_name: github-pages-\$\{\{ github\.run_attempt \}\}/);
  });
});
