/**
 * Trava da placa de vídeo (scripts/placa.py). Cada teste usa uma pasta própria no lugar de
 * D:\KotobaArcade\\arte e desliga as sondas do Ollama, dos motores de voz e do nvidia-smi.
 *
 * Bug que estes testes cobrem: o lock antigo era só um arquivo. Outra sessão apagava o arquivo ou o dono
 * morria sem apagar, e o estúdio rodou horas com a placa sem lock nenhum.
 */
import { type ChildProcess, execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPTS = join(__dirname, '..', 'scripts');
const PLACA = join(SCRIPTS, 'placa.py');
const PY = ['python3', 'python'].find((c) => {
  try {
    execFileSync(c, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
});

const vivos: ChildProcess[] = [];
const pastas: string[] = [];
afterEach(() => {
  for (const p of vivos.splice(0)) p.kill();
  for (const d of pastas.splice(0)) rmSync(d, { recursive: true, force: true, maxRetries: 20 });
});

function ambiente(): NodeJS.ProcessEnv {
  const arte = mkdtempSync(join(tmpdir(), 'placa-'));
  pastas.push(arte);
  return { ...process.env, KOTOBA_ARTE: arte, KOTOBA_PLACA_SEM_SONDAS: '1', PYTHONDONTWRITEBYTECODE: '1' };
}

/** Tenta entrar sem esperar; devolve o código de saída (0 entrou, 75 ocupada). */
function tentar(env: NodeJS.ProcessEnv): number | null {
  return spawnSync(PY!, ['-I', PLACA, '--nome', 'B', '--nao-esperar', '--', PY!, '-c', 'pass'], { env }).status;
}

/** Sobe um processo e espera ele escrever `marca` na saída; devolve o processo e a linha da marca. */
function subir(args: string[], env: NodeJS.ProcessEnv, marca: string): Promise<{ p: ChildProcess; linha: string }> {
  const p = spawn(PY!, args, { env });
  vivos.push(p);
  return new Promise((ok, falha) => {
    let saida = '';
    p.stdout!.on('data', (d) => {
      saida += String(d);
      const linha = saida.split('\n').find((l) => l.startsWith(marca));
      if (linha) ok({ p, linha });
    });
    p.on('exit', (c) => falha(new Error(`saiu com ${c} antes de "${marca}": ${saida}`)));
  });
}

/** Processo que prende a placa pela biblioteca e fica parado. */
const dono = async (env: NodeJS.ProcessEnv) =>
  (
    await subir(
      ['-c', `import sys, time; sys.path.insert(0, ${JSON.stringify(SCRIPTS)}); import placa\nwith placa.Placa("A"):\n    print("dentro", flush=True); time.sleep(60)`],
      env,
      'dentro',
    )
  ).p;
const morrer = (p: ChildProcess) => new Promise((ok) => (p.on('exit', ok), p.kill()));

describe.runIf(PY)('trava da placa', () => {
  it('dois processos disputando: só um entra', async () => {
    const env = ambiente();
    await dono(env);
    expect(tentar(env)).toBe(75);
  });

  it('o dono morto com kill solta a trava sozinho', async () => {
    const env = ambiente();
    const a = await dono(env);
    expect(tentar(env)).toBe(75);
    await morrer(a);
    expect(tentar(env)).toBe(0);
  });

  it('lock antigo (só o arquivo) com pid morto não prende ninguém', () => {
    const env = ambiente();
    writeFileSync(join(env.KOTOBA_ARTE!, 'gpu.lock'), 'cena-viva 2026-11-20 00:47:00 pid 999999\n');
    expect(tentar(env)).toBe(0);
  });

  it('lock antigo com pid vivo é respeitado, mas só por algumas horas', () => {
    const env = ambiente();
    const arq = join(env.KOTOBA_ARTE!, 'gpu.lock');
    writeFileSync(arq, `outra-sessao 2026-11-20 00:47:00 pid ${process.pid}\n`);
    expect(tentar(env)).toBe(75);
    const antes = Date.now() / 1000 - 7 * 3600;
    utimesSync(arq, antes, antes);
    expect(tentar(env)).toBe(0);
  });

  it('matar só o placa.py de fora nunca deixa o comando rodando sem trava', async () => {
    const env = ambiente();
    const { p: fora, linha } = await subir(
      ['-I', PLACA, '--nome', 'A', '--', PY!, '-c', 'import os, time; print("filho", os.getpid(), flush=True); time.sleep(60)'],
      env,
      'filho',
    );
    const filho = Number(linha.split(' ')[1]);
    const vivo = () => {
      try {
        process.kill(filho, 0);
        return true;
      } catch {
        return false;
      }
    };
    try {
      await morrer(fora);
      await new Promise((r) => setTimeout(r, 300));
      if (process.platform === 'win32') {
        // A trava do Windows é do processo; o Job Object leva o comando junto.
        expect(vivo()).toBe(false);
        expect(tentar(env)).toBe(0);
      } else {
        // No Linux o comando herdou a trava.
        expect(vivo()).toBe(true);
        expect(tentar(env)).toBe(75);
      }
    } finally {
      if (vivo()) process.kill(filho);
    }
  });

  it.runIf(process.platform === 'win32')('com a trava presa, o arquivo não pode ser apagado', async () => {
    const env = ambiente();
    await dono(env);
    expect(() => unlinkSync(join(env.KOTOBA_ARTE!, 'gpu.lock'))).toThrow();
    expect(tentar(env)).toBe(75);
  });
});

describe('quem usa a placa passa pela trava', () => {
  it('npm run vozes prende a placa antes de subir os motores de voz', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    expect(pkg.scripts.vozes).toMatch(/^python -I scripts\/placa\.py .*-- node scripts\/gravar-vozes\.mjs$/);
  });

  it('a gravação do português prende a placa, e só há uma voz para gravar', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    expect(pkg.scripts['vozes-pt']).toMatch(/^python -I scripts\/placa\.py .*-- node scripts\/gravar-vozes-pt\.mjs$/);
    expect(Object.keys(pkg.scripts).filter((k) => k.startsWith('vozes-pt:'))).toEqual([]);
    // Sem servidor das aulas: o site toca a voz sozinho.
    expect(Object.keys(pkg.scripts).filter((k) => k.startsWith('aulas'))).toEqual([]);
  });

  it('o estúdio usa a mesma trava, e não a implementação antiga', () => {
    const estudio = readFileSync(join(SCRIPTS, 'estudio.py'), 'utf8');
    expect(estudio).toContain('from placa import Placa');
    expect(estudio).not.toMatch(/open\(LOCK, "x"/);
  });
});
