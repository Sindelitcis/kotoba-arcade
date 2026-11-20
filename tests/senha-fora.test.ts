// @vitest-environment node
/**
 * A senha da Conversa só pode existir como segredo da Cloudflare. Este teste
 * procura o texto dela em todo arquivo versionado e no dist (o que vai para o
 * site). A senha não está escrita aqui: vem de KOTOBA_SENHA (segredo do GitHub
 * no Actions) ou de D:\KotobaArcade\dados\conversa-senha.txt no PC do Rafael.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ARQUIVO_LOCAL = 'D:/KotobaArcade/dados/conversa-senha.txt';
const RAIZ = join(__dirname, '..');

function senha(): string | null {
  const doAmbiente = process.env.KOTOBA_SENHA?.trim();
  if (doAmbiente) return doAmbiente;
  if (existsSync(ARQUIVO_LOCAL)) return readFileSync(ARQUIVO_LOCAL, 'utf8').trim() || null;
  return null;
}

function arquivosDe(pasta: string): string[] {
  if (!existsSync(pasta)) return [];
  const out: string[] = [];
  for (const nome of readdirSync(pasta)) {
    const p = join(pasta, nome);
    if (statSync(p).isDirectory()) out.push(...arquivosDe(p));
    else out.push(p);
  }
  return out;
}

function onde(segredo: string, arquivos: string[]): string[] {
  const agulhas = [Buffer.from(segredo, 'utf8'), Buffer.from(segredo, 'utf16le'), Buffer.from(segredo.toUpperCase(), 'utf8')];
  return arquivos.filter((f) => {
    const b = readFileSync(f);
    return agulhas.some((a) => b.includes(a));
  });
}

const s = senha();

describe('a senha da Conversa não vaza', () => {
  it('no Actions a senha está disponível para a busca', () => {
    // Sem isso o teste passaria sempre no CI sem procurar nada.
    if (process.env.CI) expect(s, 'defina o segredo KOTOBA_SENHA no GitHub').toBeTruthy();
  });

  it.skipIf(!s)('não aparece em nenhum arquivo versionado', { timeout: 120_000 }, () => {
    const versionados = execFileSync('git', ['ls-files', '-z'], { cwd: RAIZ })
      .toString('utf8')
      .split('\0')
      .filter(Boolean)
      .map((f) => join(RAIZ, f))
      .filter((f) => existsSync(f));
    expect(versionados.length).toBeGreaterThan(100);
    expect(onde(s as string, versionados)).toEqual([]);
  });

  it.skipIf(!s)('não aparece no dist (o que vai para o site)', { timeout: 120_000 }, () => {
    const dist = arquivosDe(join(RAIZ, 'dist'));
    if (process.env.CI) expect(dist.length, 'o dist precisa ser gerado antes do teste').toBeGreaterThan(0);
    expect(onde(s as string, dist)).toEqual([]);
  });
});
