/**
 * Ritmo calmo (docs/ensino.md, "Calma"): depois de uma resposta, nada passa sozinho. O caso do
 * Rafael: no KanjiMon, o "水 · みず (mizu) · água" sumia em menos de meio segundo e o "Capturado!"
 * entrava por cima, também sozinho, enquanto a palavra ainda era falada.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Seguinte, TRAVA_TECLA_MS } from '../src/core/calma';

const SRC = join(__dirname, '..', 'src');

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivos(join(dir, e.name)) : [join(dir, e.name)]));
}

describe('Seguinte: o retorno espera a pessoa', () => {
  afterEach(() => vi.useRealTimers());

  it('não segue sozinho; o clique segue uma vez só', () => {
    vi.useFakeTimers();
    const s = new Seguinte();
    const proximo = vi.fn();
    s.marcar(proximo);
    vi.advanceTimersByTime(60_000);
    expect(proximo).not.toHaveBeenCalled();
    expect(s.esperando).toBe(true);
    expect(s.seguir()).toBe(true);
    expect(s.seguir()).toBe(false);
    expect(proximo).toHaveBeenCalledTimes(1);
    expect(s.esperando).toBe(false);
  });

  it('a tecla que acabou de responder (o Enter da resposta digitada) e a tecla segurada não seguem', () => {
    vi.useFakeTimers();
    const s = new Seguinte();
    const proximo = vi.fn();
    s.marcar(proximo);
    expect(s.seguirPorTecla({})).toBe(false);
    vi.advanceTimersByTime(TRAVA_TECLA_MS + 10);
    expect(s.seguirPorTecla({ repeat: true })).toBe(false);
    expect(proximo).not.toHaveBeenCalled();
    expect(s.seguirPorTecla({})).toBe(true);
    expect(proximo).toHaveBeenCalledTimes(1);
  });

  it('limpar (sair do jogo) esquece o que vinha depois', () => {
    const s = new Seguinte();
    const proximo = vi.fn();
    s.marcar(proximo);
    s.limpar();
    expect(s.seguir()).toBe(false);
    expect(proximo).not.toHaveBeenCalled();
  });
});

describe('nenhuma tela passa sozinha depois de uma resposta', () => {
  /**
   * Temporizador nos jogos e na Jornada só onde não é retorno de resposta: procurar o servidor
   * da Conversa, o relógio do Kana Beat (o tempo é o jogo), a oferta do Aprofundar e o estudo
   * leve dele. Qualquer outro precisa de motivo e de entrar aqui.
   */
  const PERMITIDOS: Record<string, number> = {
    'games/conversa/ConversaGame.tsx': 2,
    'games/conversa/cliente.ts': 3,
    'games/kanabeat/music.ts': 2,
    'core/aprofundar/Aprofundar.tsx': 2,
  };

  it('setTimeout e setInterval só nos lugares conhecidos', () => {
    const achados: Record<string, number> = {};
    for (const f of arquivos(SRC).filter((f) => /[\\/](games|jornada|hub|ouvir|core[\\/]aprofundar)[\\/].*\.tsx?$/.test(f))) {
      const n = [...readFileSync(f, 'utf8').matchAll(/\bset(?:Timeout|Interval)\(/g)].length;
      if (n > 0) achados[relative(SRC, f).replaceAll('\\', '/')] = n;
    }
    for (const [f, n] of Object.entries(achados)) expect(n, `${f}: temporizador novo depois de resposta? (docs/ensino.md, "Calma")`).toBeLessThanOrEqual(PERMITIDOS[f] ?? 0);
  });

  it('o aviso de captura do KanjiMon não fecha sozinho', () => {
    const fonte = readFileSync(join(SRC, 'games/kanjimon/KanjiMonGame.tsx'), 'utf8');
    expect(fonte).not.toMatch(/setTimeout\(dismiss/);
    expect(fonte).toContain('seguinte.current.marcar(');
  });
});
