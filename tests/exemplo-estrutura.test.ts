/**
 * Bug: na コンビニ a Cena Viva tinha apresentado 棚, おにぎり, サンドイッチ e パン, mas o cartão
 * da estrutura dava como exemplo これは傘です。, e 傘 nunca tinha sido apresentado.
 *
 * Os cartões de estrutura (lição de etapa da Cena Viva e peça nova do Kumitate) só usam no
 * exemplo palavras que já foram apresentadas, ou que o próprio cartão apresenta antes. A
 * fala do exemplo é gravada.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Manifesto } from '../src/core/audio';
import { foiApresentado } from '../src/core/ensino';
import { seededRng } from '../src/core/rng';
import { emptySave } from '../src/core/save';
import { VOZ_PADRAO, VOZ_PALAVRA } from '../src/core/vozes';
import { falaDaEtapa, itemDaEtapa } from '../src/games/cena/aulas';
import { CenaRound, chave, ensureCenaSave, ETAPAS, tarefas, textoDe, type Etapa } from '../src/games/cena/engine';
import { LUGARES } from '../src/games/cena/lugares';
import { cartaDaPalavra, cardOf, emptyGramaticaSave, fits, GramaticaRound, palavrasDoExemplo } from '../src/games/gramatica/engine';
import { COURSE } from '../src/games/gramatica/pontos';
import { findWord } from '../src/content/vida';

const T0 = new Date('2026-11-22T12:00:00').getTime();
const DIA = 86_400_000;
const manifesto = JSON.parse(readFileSync(join(__dirname, '../public/vozes/manifesto.json'), 'utf8')) as Manifesto;
const KANJI = /[一-鿿々]/g;
/** Kanji da própria estrutura (lugar, contador, ordem, tamanho, pessoa), não vocabulário. */
const DA_ESTRUTURA = new Set([...'上下横前中左右番目一二三四五本枚匹台冊個人大小']);

describe('exemplo do cartão de estrutura só com o que já foi apresentado', () => {
  it('Cena Viva, em cada lugar, com o save zerado: o exemplo de cada etapa usa palavras já apresentadas e tem voz', () => {
    const vistas: Record<string, Set<Etapa>> = {};
    for (const lugar of LUGARES) {
      const data = emptySave(T0);
      const save = ensureCenaSave(data.games);
      save.etapas = ETAPAS.length;
      vistas[lugar.id] = new Set();
      let t = T0;
      for (let rodada = 0; rodada < 6; rodada++) {
        const r = new CenaRound({ lugar, cards: data.cards, profile: data.profile, save, now: () => (t += 2000), rng: seededRng(rodada + 3) });
        r.apresentou();
        for (let i = 0; i < 12 && r.fase !== 'fim'; i++) {
          if (r.fase === 'licao') {
            const e = r.tarefa.etapa;
            vistas[lugar.id]!.add(e);
            const ex = r.exemploDaLicao();
            const onde = `${lugar.id}/${e}: ${textoDe(ex.segs)}`;
            expect(ex.etapa, onde).toBe(e);
            for (const w of ex.palavras) expect(foiApresentado(data.cards, chave(w)), `${onde}: ${w.jp} não foi apresentada`).toBe(true);
            const item = itemDaEtapa(e, ex);
            const conhecidos = new Set(ex.palavras.flatMap((w) => [...w.jp]));
            const soltos = [...`${item.grande} ${item.explicacao ?? ''}`.matchAll(KANJI)].map((m) => m[0]).filter((k) => !conhecidos.has(k) && !DA_ESTRUTURA.has(k));
            expect(soltos, `${onde}: kanji de palavra não apresentada no cartão`).toEqual([]);
            // Nome e descrever: o exemplo não pode ser a resposta da pergunta que vem logo depois.
            // Só cai nela mesma quando não há outra pergunta pronta da etapa.
            if ((e === 'nome' || e === 'descrever') && textoDe(ex.segs) === textoDe(r.tarefa.segs)) {
              const prontas = tarefas(lugar, e).filter((o) => r.pronta(o));
              expect(prontas.length, onde).toBe(1);
            }
            for (const f of falaDaEtapa(e, ex)) {
              if (f.tipo !== 'jp') continue;
              const voz = f.fala.voz === 'frase' ? VOZ_PADRAO : VOZ_PALAVRA;
              expect(manifesto.falas[f.fala.texto]?.[voz], `${onde}: "${f.fala.texto}" sem gravação`).toBeTruthy();
            }
            r.comecar();
          }
          const tarefa = r.tarefa;
          if (tarefa.marcada) r.escolher(r.opcoes.indexOf(tarefa.palavras[0]!));
          else if (tarefa.pecas) for (const s of tarefa.pecas.certas) r.peca(r.bandeja.findIndex((b) => b.t === s.t));
          else r.clicar(tarefa.alvo[0]!);
          r.seguir();
        }
        t += DIA;
      }
    }
    // O teste passou mesmo por lições: em todo lugar, pelo menos a de "nome".
    for (const lugar of LUGARES) expect(vistas[lugar.id]!.has('nome'), lugar.id).toBe(true);
    expect(new Set(Object.values(vistas).flatMap((s) => [...s])).size).toBeGreaterThan(5);
  });

  it('o caso relatado: na コンビニ, o exemplo de "nome" é de uma coisa já apresentada, não 傘', () => {
    const konbini = LUGARES.find((l) => l.id === 'konbini')!;
    const data = emptySave(T0);
    const r = new CenaRound({ lugar: konbini, cards: data.cards, profile: data.profile, save: ensureCenaSave(data.games), now: () => T0, rng: seededRng(1) });
    r.apresentou();
    expect(r.fase).toBe('licao');
    const ex = r.exemploDaLicao();
    expect(textoDe(ex.segs)).not.toContain('傘');
    expect(textoDe(ex.segs)).toMatch(/^これは.+です。$/);
    expect(ex.palavras.every((w) => r.apresentadas.some((a) => a.id === w.id))).toBe(true);
    // E não é a resposta da pergunta que vem depois.
    expect(textoDe(ex.segs)).not.toBe(textoDe(r.tarefa.segs));
  });

  it('Kumitate: as palavras do exemplo de cada peça nova já foram vistas ou o cartão as apresenta antes', () => {
    const data = emptySave(T0);
    const save = emptyGramaticaSave();
    const pontos = new Set<string>();
    let t = T0;
    for (let rodada = 0; rodada < 40 && pontos.size < COURSE.points.length; rodada++) {
      const r = new GramaticaRound({ course: COURSE, cards: data.cards, profile: data.profile, save, lookup: findWord, now: () => (t += 3000), rng: seededRng(rodada + 1) });
      for (let n = 0; n < 40 && r.phase !== 'end'; n++) {
        if (r.phase === 'lesson') {
          const p = r.puzzle.point;
          pontos.add(p.id);
          const novas = new Set(r.novasDoExemplo().map((w) => w.id));
          for (const w of palavrasDoExemplo(p)) {
            expect(foiApresentado(data.cards, cartaDaPalavra(w.id)) || novas.has(w.id), `${p.id}: ${w.jp}`).toBe(true);
          }
          r.begin();
          for (const w of palavrasDoExemplo(p)) expect(foiApresentado(data.cards, cartaDaPalavra(w.id)), `${p.id}: ${w.jp} depois do cartão`).toBe(true);
          expect(foiApresentado(data.cards, cardOf(p.id))).toBe(true);
        }
        for (let i = 0; i < 10 && r.phase === 'build'; i++) {
          const slot = r.activeSlot!;
          r.place(slot.tray.find((b) => fits(slot.role, b))!);
        }
        r.next();
      }
      t += DIA;
      // Abre o próximo ponto, como quem já ganhou o bastante.
      save.unlocked = Math.min(COURSE.points.length, save.unlocked + 1);
    }
    expect(pontos.size).toBeGreaterThan(3);
  });

  it('Kumitate: toda palavra do exemplo das lições existe no conteúdo (dá para apresentar)', () => {
    for (const p of COURSE.points) for (const w of palavrasDoExemplo(p)) expect(findWord(w.id), `${p.id}: ${w.jp}`).toBeTruthy();
  });
});
