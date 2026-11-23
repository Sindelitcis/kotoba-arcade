// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NIVEIS, UNIDADES, palavrasDa } from '../src/content/curso';
import { SITUACOES } from '../src/content/escola';
import { N4 } from '../src/games/pecas/dados/n4';
import { N5 } from '../src/games/pecas/dados/n5';

const KANJI = /[一-鿿々]/u;
const lista = (dados: string) =>
  new Set(
    dados
      .split('\n')
      .filter((l) => l.includes('|'))
      .map((l) => l.split('|')[0]!.trim()),
  );
const KANJI_N5 = lista(N5);
const KANJI_N4 = lista(N4);
const A1 = UNIDADES.filter((u) => u.nivel === 'A1');
const A2 = UNIDADES.filter((u) => u.nivel === 'A2');

describe('currículo do curso', () => {
  it('as unidades estão em ordem, nível por nível, sem buraco', () => {
    UNIDADES.forEach((u, i) => expect(u.ordem, u.id).toBe(i + 1));
    for (const { nivel } of NIVEIS) {
      const doNivel = UNIDADES.filter((u) => u.nivel === nivel);
      expect(doNivel.length, nivel).toBe(20);
      doNivel.forEach((u, i) => {
        expect(u.numero, u.id).toBe(i + 1);
        expect(u.id).toBe(`${nivel.toLowerCase()}-${String(i + 1).padStart(2, '0')}`);
      });
      expect(doNivel.at(-1)?.revisao, `${nivel}: a última unidade é o simulado`).toBe(true);
    }
    expect(UNIDADES.map((u) => u.nivel)).toEqual([...A1.map(() => 'A1'), ...A2.map(() => 'A2')]);
  });

  it('todo kanji do N5 é ensinado no A1', () => {
    expect(KANJI_N5.size).toBeGreaterThan(70);
    const ensinados = new Set(A1.flatMap((u) => u.kanji.filter((k) => !k.extra).map((k) => k.k)));
    expect([...KANJI_N5].filter((k) => !ensinados.has(k))).toEqual([]);
  });

  it('todo kanji do N4 é ensinado até o fim do A2 (alguns já no A1, como extra)', () => {
    expect(KANJI_N4.size).toBeGreaterThan(160);
    const ensinados = new Set(UNIDADES.flatMap((u) => u.kanji.map((k) => k.k)));
    expect([...KANJI_N4].filter((k) => !ensinados.has(k))).toEqual([]);
  });

  it('extra é o kanji de fora do nível: no A1, o que não é do N5; no A2, o que não é do N5 nem do N4', () => {
    for (const u of UNIDADES)
      for (const k of u.kanji) {
        const doNivel = KANJI_N5.has(k.k) || (u.nivel === 'A2' && KANJI_N4.has(k.k));
        expect(doNivel ? !k.extra : k.extra, `${u.id} ${k.k}`).toBe(true);
      }
  });

  // Exemplo do problema: o cartão ensinava 金 = きん e o exemplo usava お金 (おかね) sem dizer nada.
  it('kanji que volta com outra leitura explica a troca, e a leitura aparece na palavra indicada', () => {
    const vistas = new Map<string, Set<string>>();
    for (const u of UNIDADES) {
      const palavras = new Map(palavrasDa(u).map((p) => [p.jp, p.kana]));
      for (const k of u.kanji) {
        const kana = palavras.get(k.em);
        expect(kana, `${u.id}: ${k.em} não está nas palavras da unidade`).toBeDefined();
        expect(k.em.includes(k.k), `${u.id}: ${k.em} não tem ${k.k}`).toBe(true);
        expect(kana!.includes(k.leitura), `${u.id}: ${k.k} = ${k.leitura} não aparece em ${kana}`).toBe(true);
        const antes = vistas.get(k.k);
        if (antes) {
          expect(antes.has(k.leitura), `${u.id}: ${k.k} ${k.leitura} repete uma leitura já ensinada`).toBe(false);
          expect(k.muda, `${u.id}: ${k.k} muda de leitura sem explicar`).toBeTruthy();
        } else {
          expect(k.muda, `${u.id}: ${k.k} explica mudança sem ter leitura anterior`).toBeUndefined();
        }
        vistas.set(k.k, (antes ?? new Set()).add(k.leitura));
      }
    }
  });

  it('nenhuma palavra usa kanji que ainda não foi ensinado', () => {
    const ensinados = new Set<string>();
    for (const u of UNIDADES) {
      for (const k of u.kanji) ensinados.add(k.k);
      for (const p of palavrasDa(u))
        for (const c of p.jp) if (KANJI.test(c)) expect(ensinados.has(c), `${u.id}: ${p.jp} usa ${c}`).toBe(true);
    }
  });

  it('cada palavra tem leitura em kana e tradução, e entra uma vez só no curso', () => {
    const vistas = new Set<string>();
    for (const u of UNIDADES)
      for (const p of palavrasDa(u)) {
        expect(p.kana, `${u.id} ${p.jp}`).toMatch(/^[ぁ-ゖァ-ヺー]+$/u);
        expect(p.pt, `${u.id} ${p.jp}`).not.toBe('');
        expect(vistas.has(`${p.jp}|${p.kana}`), `${u.id}: ${p.jp} repetida`).toBe(false);
        vistas.add(`${p.jp}|${p.kana}`);
      }
  });

  it('cada ponto de gramática do nível (N5 no A1, N4 no A2) entra em exatamente uma unidade dele', () => {
    for (const { nivel, gramatica } of NIVEIS) {
      const usados = UNIDADES.filter((u) => u.nivel === nivel).flatMap((u) => u.gramatica);
      for (const g of usados) expect(gramatica[g], `${nivel} ${g}`).toBeDefined();
      expect(new Set(usados).size).toBe(usados.length);
      expect(Object.keys(gramatica).filter((g) => !usados.includes(g)), nivel).toEqual([]);
    }
  });

  it('toda nota cultural tem fonte', () => {
    for (const u of UNIDADES) for (const n of u.notas) expect(n.fontes.length, `${u.id} ${n.titulo}`).toBeGreaterThan(0);
  });

  it('as situações citadas existem', () => {
    const ids = new Set(SITUACOES.map((s) => s.id));
    for (const u of UNIDADES) for (const s of u.situacoes ?? []) expect(ids.has(s), `${u.id} ${s}`).toBe(true);
  });

  it('só a unidade de revisão vem sem conteúdo novo', () => {
    for (const u of UNIDADES)
      if (u.revisao) expect(u.kanji.length + u.palavras.length + u.gramatica.length).toBe(0);
      else expect(u.palavras.length, u.id).toBeGreaterThan(5);
  });
});
