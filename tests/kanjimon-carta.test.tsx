import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { KANJI } from '../src/content';
import { ArteCarta } from '../src/games/kanjimon/ArteCarta';

const css = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');
const regra = (seletor: string) => css.match(new RegExp(`^${seletor.replace(/[.*]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'm'))?.[1] ?? '';

describe('carta do KanjiMon', () => {
  afterEach(() => render(null, document.body));

  // Em 22/11/2026 as artes (verticais, 384×688 e outros formatos) apareciam cortadas em cima e
  // embaixo, porque a carta era 3:4 e a imagem usava object-fit: cover.
  it('a arte aparece inteira, com uma cópia desfocada só de fundo', async () => {
    await act(() => render(<ArteCarta kanji={KANJI[0]!} rarity="c" />, document.body));
    const imgs = [...document.querySelectorAll('.arte-carta img')];
    expect(imgs.map((i) => i.className)).toEqual(['arte-fundo', 'arte-inteira']);
    expect(regra('.arte-carta .arte-inteira')).toMatch(/object-fit:\s*contain/);
  });

  it('as molduras das cartas têm o formato vertical das artes e não cortam a imagem', () => {
    expect(regra('.enemy-card')).toMatch(/aspect-ratio:\s*9 \/ 16/);
    expect(regra('.capture-card')).toMatch(/aspect-ratio:\s*9 \/ 16/);
    expect(css).not.toMatch(/\.(enemy|capture)-card img\s*\{[^}]*object-fit:\s*cover/);
  });

  it('todas as telas de carta usam a arte inteira', () => {
    for (const f of ['KanjiMonGame', 'Booster', 'Dex']) {
      const src = readFileSync(join(process.cwd(), `src/games/kanjimon/${f}.tsx`), 'utf8');
      expect(src, f).not.toMatch(/<img[^>]*artUrl\(/);
      expect(src, f).toMatch(/<ArteCarta /);
    }
  });
});
