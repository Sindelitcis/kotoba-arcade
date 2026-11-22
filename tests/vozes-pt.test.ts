/**
 * Português falado gravado na voz do site (public/vozes-pt/voz1). Texto novo numa aula, na
 * lição do Kumitate, na narração da Aventura ou no retorno da Jornada faz este teste falhar
 * até alguém gravar: `npm run vozes-pt`.
 *
 * Os áudios vão para o site; a voz de referência e os pesos do modelo nunca.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listarFalasPt } from '../scripts/falas-pt';
import type { ManifestoPt } from '../src/core/fala-pt';

const RAIZ = join(__dirname, '..');
const BASE = join(RAIZ, 'public', 'vozes-pt');
const manifesto = (voz: string) => JSON.parse(readFileSync(join(BASE, voz, 'manifesto.json'), 'utf8')) as ManifestoPt;
const MARCA = 'kotoba-voz-1';
// Voz de referência, pesos de modelo e a config com caminhos do PC: nunca no Git nem no site.
const PROIBIDO = /(^|\/)(amigo\.(wav|txt|mp3|flac)|[^/]*\.(safetensors|pth|ckpt|bin|pt|onnx)|config\.local\.json)$/i;

// Lê byte a byte mais de mil mp3: com os outros testes rodando junto, passa dos 5 s padrão.
const LER_TUDO = 60_000;

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivos(join(dir, e.name)) : [join(dir, e.name)]));
const rel = (f: string) => relative(RAIZ, f).replaceAll('\\', '/');
const git = (...args: string[]) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' });

describe('português gravado na voz do site', () => {
  const m = manifesto('voz1');
  const pasta = join(BASE, 'voz1');

  it('há uma voz só, numa pasta só, com seu manifesto', () => {
    expect(readdirSync(BASE)).toEqual(['voz1']);
    expect(m.voz).toBe('voz1');
  });

  it('todo texto falado em português tem gravação', () => {
    const faltam = listarFalasPt().filter((f) => !m.falas[f.texto]).map((f) => `${f.origem}: ${f.texto}`);
    expect(faltam, 'rode `npm run vozes-pt` para gravar').toEqual([]);
  });

  it('todo arquivo do manifesto existe e nenhum mp3 sobra na pasta', () => {
    const usados = Object.values(m.falas);
    expect(usados.filter((a) => !existsSync(join(pasta, a)))).toEqual([]);
    const set = new Set(usados);
    expect(readdirSync(pasta).filter((a) => a !== 'manifesto.json' && !set.has(a))).toEqual([]);
  });

  it('o manifesto não guarda texto que ninguém usa', () => {
    const textos = new Set(listarFalasPt().map((f) => f.texto));
    expect(Object.keys(m.falas).filter((t) => !textos.has(t))).toEqual([]);
  });

  it('todo mp3 leva a marca da voz do site', () => {
    const errados = readdirSync(pasta)
      .filter((a) => a.endsWith('.mp3'))
      .filter((a) => !readFileSync(join(pasta, a)).includes(MARCA));
    expect(errados).toEqual([]);
  }, LER_TUDO);

  it('nem voz de referência, nem pesos de modelo, nem config do PC no Git ou no site', () => {
    const noGit = git('ls-files', '-z').split('\0').filter((f) => PROIBIDO.test(f));
    const noSite = arquivos(join(RAIZ, 'public')).map(rel).filter((f) => PROIBIDO.test(f));
    expect([...noGit, ...noSite]).toEqual([]);
  });

  it('a config com os caminhos do PC é ignorada pelo Git, e a referência também', () => {
    expect(git('check-ignore', 'local/config.local.json').trim()).toBe('local/config.local.json');
    for (const f of ['amigo.wav', 'amigo.txt', 'public/vozes-pt/voz1/amigo.wav']) expect(git('check-ignore', f).trim(), f).toBe(f);
  });
});
