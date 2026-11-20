/**
 * A voz do PC (o modelo afinado com a voz de um amigo) nunca sai do PC. Nada dela pode
 * entrar no repositório nem no site: nem a gravação de referência, nem os pesos, nem
 * qualquer áudio feito com ela. Estes testes falham se algo assim aparecer.
 *
 * Os áudios dela levam o comentário "kotoba-voz-local" (local/gravar_aulas.py); os da voz
 * livre, que podem ser publicados, levam "kotoba-voz-livre" (scripts/gravar_pt_livre.py).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = join(__dirname, '..');
const MARCA_LOCAL = Buffer.from('kotoba-voz-local');
const MARCA_LIVRE = Buffer.from('kotoba-voz-livre');
// Referência da voz, pesos e codec do modelo: nomes que nunca podem estar no repositório.
const PROIBIDO = /(^|\/)(amigo\.(wav|txt|mp3|flac)|[^/]*\.(safetensors|pth|ckpt|pt|bin|onnx)|config\.local\.json)$/i;

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivos(join(dir, e.name)) : [join(dir, e.name)]));
}

const rel = (f: string) => relative(RAIZ, f).replaceAll('\\', '/');

const git = (...args: string[]) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' });

describe('a voz do PC fica no PC', () => {
  it('nenhum arquivo do site (public/) foi gravado com a voz do PC', () => {
    const achados = arquivos(join(RAIZ, 'public')).filter((f) => readFileSync(f).includes(MARCA_LOCAL));
    expect(achados.map(rel)).toEqual([]);
  });

  it('nenhum arquivo do Git foi gravado com a voz do PC', () => {
    const lista = git('ls-files', '-z').split('\0').filter(Boolean);
    const achados = lista.filter((f) => {
      try {
        return readFileSync(join(RAIZ, f)).includes(MARCA_LOCAL);
      } catch {
        return false;
      }
    });
    // Este teste e o gravador citam a marca no código; áudio nenhum pode ter.
    expect(achados.filter((f) => !/\.(ts|tsx|py|mjs|md)$/.test(f))).toEqual([]);
  });

  it('nem voz de referência, nem pesos de modelo, nem config do PC no Git ou no site', () => {
    const noGit = git('ls-files', '-z').split('\0').filter((f) => PROIBIDO.test(f));
    const noSite = arquivos(join(RAIZ, 'public')).map(rel).filter((f) => PROIBIDO.test(f));
    expect([...noGit, ...noSite]).toEqual([]);
  });

  it('a config com os caminhos do PC é ignorada pelo Git', () => {
    expect(git('check-ignore', 'local/config.local.json').trim()).toBe('local/config.local.json');
  });

  it('toda gravação em português do site é da voz livre', () => {
    const mp3 = arquivos(join(RAIZ, 'public', 'vozes-pt')).filter((f) => f.endsWith('.mp3'));
    expect(mp3.filter((f) => !readFileSync(f).includes(MARCA_LIVRE)).map(rel)).toEqual([]);
  });

  it('o gravador da voz do PC se recusa a gravar dentro do repositório', () => {
    const PY = ['python3', 'python'].find((c) => spawnSync(c, ['--version']).status === 0);
    if (!PY) return;
    const tmp = mkdtempSync(join(tmpdir(), 'voz-local-'));
    try {
      const falas = join(tmp, 'falas.json');
      writeFileSync(falas, JSON.stringify({ falas: [{ texto: 'Oi.', origem: 'teste' }] }));
      for (const saida of [join(RAIZ, 'public', 'vozes-pt'), RAIZ, join(RAIZ, 'qualquer')]) {
        const r = spawnSync(PY, ['-I', '-B', join(RAIZ, 'local', 'gravar_aulas.py'), '--falas', falas, '--saida', saida, '--duvidas', join(tmp, 'd.json'), '--conferidas', join(tmp, 'c.json'), '--motor', tmp], {
          encoding: 'utf8',
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        });
        expect(r.status, saida).not.toBe(0);
        expect(r.stderr, saida).toContain('recusado');
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
    // Três Pythons em seguida: com a máquina ocupada, passa dos 5 s padrão.
  }, 30_000);
});
