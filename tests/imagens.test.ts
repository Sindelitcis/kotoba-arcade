import { describe, expect, it } from 'vitest';
import { WORDS } from '../src/content';
import { JORNADA_WORDS } from '../src/content/escola';
import { BASE_COLORIDA, CORES, FIGURAS, IMAGEM_WORDS, SEM_IMAGEM } from '../src/content/imagens';
import { medida, temMedida } from '../src/content/medidas';
import { DAILY_WORDS } from '../src/content/vida';
import { LUGARES } from '../src/games/cena/lugares';

describe('vocabulário em imagem', () => {
  it('toda figura tem imagem exportada, em cor e em traço (a medida só existe depois do exportar)', () => {
    const faltam = FIGURAS.map((f) => f.img).filter((id) => !temMedida(id));
    expect(faltam).toEqual([]);
  });

  it('todo objeto colorido tem as quatro cores, menos as que ficaram sem imagem', () => {
    const faltam: string[] = [];
    for (const base of BASE_COLORIDA) for (const c of CORES) if (!SEM_IMAGEM.has(`${base}-${c.id}`) && !temMedida(`${base}-${c.id}`)) faltam.push(`${base}-${c.id}`);
    expect(faltam).toEqual([]);
  });

  it('toda coisa de todo lugar e todo fundo têm imagem', () => {
    const faltam = LUGARES.flatMap((l) => [l.fundo, ...l.coisas.map((c) => c.img)]).filter((id) => !temMedida(id));
    expect(faltam).toEqual([]);
    for (const l of LUGARES) for (const c of l.coisas) expect(SEM_IMAGEM.has(c.img), c.img).toBe(false);
  });

  it('imagens no tamanho combinado: objeto até 384 px, ação e pessoa até 512, fundo 960 de largura', () => {
    for (const f of FIGURAS) {
      const m = medida(f.img);
      expect(Math.max(m.w, m.h), f.img).toBeLessThanOrEqual(f.tipo === 'objeto' ? 384 : 512);
    }
    for (const l of LUGARES) expect(medida(l.fundo).w).toBe(960);
  });

  it('nenhuma palavra nova repete id de palavra que o arcade já tinha', () => {
    const antigas = new Set([...WORDS, ...DAILY_WORDS, ...JORNADA_WORDS].map((w) => w.id));
    expect(IMAGEM_WORDS.filter((w) => antigas.has(w.id)).map((w) => w.jp)).toEqual([]);
    expect(new Set(IMAGEM_WORDS.map((w) => w.id)).size).toBe(IMAGEM_WORDS.length);
  });

  it('são centenas de figuras, com objeto, ação e pessoa', () => {
    expect(FIGURAS.filter((f) => f.tipo === 'objeto').length).toBeGreaterThanOrEqual(230);
    expect(FIGURAS.filter((f) => f.tipo === 'acao').length).toBeGreaterThanOrEqual(40);
    expect(FIGURAS.filter((f) => f.tipo === 'pessoa').length).toBeGreaterThanOrEqual(15);
  });

  it('uma figura por palavra e um arquivo por figura', () => {
    expect(new Set(FIGURAS.map((f) => f.img)).size).toBe(FIGURAS.length);
    const porPalavra = new Map<string, string[]>();
    for (const f of FIGURAS) porPalavra.set(f.word.id, [...(porPalavra.get(f.word.id) ?? []), f.img]);
    expect([...porPalavra].filter(([, imgs]) => imgs.length > 1)).toEqual([]);
  });

  it('pessoa conta com 人 e não tem forma て (não é ação)', () => {
    for (const f of FIGURAS.filter((x) => x.tipo === 'pessoa')) {
      expect(f.contador, f.img).toBe('nin');
      expect(f.te, f.img).toBeUndefined();
    }
  });
});
