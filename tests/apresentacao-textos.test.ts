/**
 * Bug: a lição "O nome das coisas" da Cena Viva dizia duas vezes a mesma coisa ("A coisa
 * marcada brilha; escolha o nome dela. A coisa marcada brilha na cena. Escolha o nome dela.").
 * Nenhum cartão de apresentação pode repetir frase.
 */
import { describe, expect, it } from 'vitest';
import { fichaDe, todosOsAlvos } from '../src/content/aprofundar/fichas';
import { itemDaFicha, type ItemNovo } from '../src/content/ensino';
import { ETAPAS } from '../src/games/cena/engine';
import { itemDaEtapa } from '../src/games/cena/aulas';
import { itemDaLicao } from '../src/games/gramatica/falado';
import { COURSE } from '../src/games/gramatica/pontos';

const normal = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Frases do texto, sem as muito curtas (uma palavra solta pode repetir à vontade). */
const frases = (texto: string) =>
  texto
    .split(/(?<=[.!?;。])\s*/)
    .map(normal)
    .filter((f) => f.split(' ').length >= 4);

export function repetidas(item: ItemNovo): string[] {
  const fs = [item.pt, item.explicacao ?? ''].flatMap(frases);
  const out: string[] = [];
  fs.forEach((a, i) => fs.forEach((b, j) => i < j && (a === b || a.includes(b) || b.includes(a)) && out.push(`"${a}" / "${b}"`)));
  return out;
}

describe('cartão de apresentação sem frase repetida', () => {
  it('pega o caso relatado', () => {
    const relato = { pt: 'Isto é um guarda-chuva.', explicacao: 'これは〜です quer dizer "isto é ~". A coisa marcada brilha; escolha o nome dela. A coisa marcada brilha na cena. Escolha o nome dela.' };
    expect(repetidas(relato as ItemNovo)).not.toEqual([]);
  });

  it('lições de etapa da Cena Viva', () => {
    for (const e of ETAPAS) expect(repetidas(itemDaEtapa(e)), e).toEqual([]);
  });

  it('lições do Kumitate', () => {
    for (const p of COURSE.points) expect(repetidas(itemDaLicao(COURSE, p)), p.id).toEqual([]);
  });

  it('todo item com ficha (palavra, kanji, kana, gramática)', () => {
    const ruins = todosOsAlvos().flatMap((a) => {
      const f = fichaDe(a);
      return f ? repetidas(itemDaFicha(f, ['x'])).map((r) => `${JSON.stringify(a)} ${r}`) : [];
    });
    expect(ruins).toEqual([]);
  });
});
