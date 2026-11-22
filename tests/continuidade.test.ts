/**
 * Continuidade do ensino (docs/ensino.md): a pessoa só é cobrada pelo que já foi apresentado.
 *
 * Cada jogo começa com um save zerado e joga várias rodadas. Um registro à parte guarda o que
 * passou pelo cartão de apresentação (ou pela lição do jogo). A cada pergunta, o alvo, toda
 * alternativa, toda carta do tabuleiro e toda coisa clicável precisam estar nesse registro.
 * O registro é do teste, não do jogo: se um jogo marcar como apresentada uma palavra que só
 * passou numa fala, ou tirar distrator do conteúdo inteiro, o teste pega.
 */
import { describe, expect, it } from 'vitest';
import { cardKey, getKanji, KANJI, WORDS } from '../src/content';
import { FIGURAS } from '../src/content/imagens';
import { KANA_IMAGENS } from '../src/content/kana';
import { foiApresentado, itemDe } from '../src/core/ensino';
import { recortar } from '../src/core/foco';
import { seededRng } from '../src/core/rng';
import { emptySave, importSave } from '../src/core/save';
import { newCard } from '../src/core/srs';
import { emptyAventuraSave, ScenePlay } from '../src/games/aventura/engine';
import { SCENES } from '../src/games/aventura/cenas';
import { CenaRound, chave as chaveCena, ensureCenaSave, palavraDe, palavrasDaCena } from '../src/games/cena/engine';
import { LUGARES } from '../src/games/cena/lugares';
import { CENAS, palavrasEmFoco, termosParaApresentar, apresentarTermos } from '../src/games/conversa/engine';
import { cardOf, emptyGramaticaSave, fits, GramaticaRound, pointOfBlock } from '../src/games/gramatica/engine';
import { COURSE } from '../src/games/gramatica/pontos';
import { ensureKanaBeatSave, Stage } from '../src/games/kanabeat/engine';
import { emptyKanaImagensSave, Rodada } from '../src/games/kanaimagens/engine';
import { emptyKanjimonSave, Hunt } from '../src/games/kanjimon/engine';
import { chave as chaveMemoria, ensureMemoriaSave, MemoriaRound } from '../src/games/memoria/engine';
import { ensurePecasSave, PecasRound, pecasDoKanji } from '../src/games/pecas/engine';
import { KANJI_PECAS, kanjiPeca } from '../src/games/pecas/dados';
import tracos from '../src/games/pecas/tracos.json';
import { emptyRoguelikeSave, Run } from '../src/games/roguelike/engine';
import { findWord } from '../src/content/vida';
import { LICOES } from '../src/jornada/licoes';

const T0 = new Date('2026-11-22T12:00:00').getTime();

/** O que passou pela apresentação, por item (`w:本`, `k:山`, `a:あ`, `g:wa`). */
class Registro {
  readonly itens = new Set<string>();
  add(chaves: Iterable<string>): void {
    for (const k of chaves) this.itens.add(itemDe(k));
  }
  tem(chave: string): boolean {
    return this.itens.has(itemDe(chave));
  }
  /** Tudo o que um item mostra como texto de alternativa: kanji, leitura, significado. */
  textos(): Set<string> {
    const out = new Set<string>();
    for (const id of this.itens) {
      if (id.startsWith('k:')) {
        const k = KANJI.find((x) => x.id === id);
        if (k) for (const t of [k.kanji, k.reading, k.pt[0]!]) out.add(t);
      } else if (id.startsWith('w:')) {
        for (const w of WORDS.filter((x) => x.id === id)) for (const t of [w.jp, w.kana, w.pt]) out.add(t);
      }
    }
    return out;
  }
}

describe('Memória', () => {
  it('save zerado: nenhum quadro traz carta de palavra que não passou pela apresentação', () => {
    const data = emptySave(T0);
    const save = ensureMemoriaSave(data.games);
    const reg = new Registro();
    let t = T0;
    for (let rodada = 0; rodada < 8; rodada++) {
      const r = new MemoriaRound({ cards: data.cards, profile: data.profile, save, now: () => (t += 3000), rng: seededRng(rodada + 1) });
      if (r.fase === 'apresenta') {
        reg.add(r.apresentadas.map((f) => chaveMemoria(f.word)));
        r.apresentou();
      }
      for (let q = 0; q < 3 && r.fase !== 'fim'; q++) {
        for (const c of r.quadro.cartas) expect(reg.tem(chaveMemoria(c.figura.word)), `rodada ${rodada}: ${c.figura.word.jp}`).toBe(true);
        const pares = new Map<number, number[]>();
        r.quadro.cartas.forEach((c, i) => pares.set(c.par, [...(pares.get(c.par) ?? []), i]));
        for (const [a, b] of pares.values()) {
          r.escolher_carta(a!);
          r.escolher_carta(b!);
        }
        if (r.fase === 'pausa') r.proximo();
      }
      t += 86_400_000;
    }
  });

  it('caso relatado: save antigo com carta de armário, cama, cadeira e livro sem apresentação. A Memória apresenta antes de pôr no quadro', () => {
    // No save da versão 1, a carta existia sem a pessoa ter visto a palavra. Ensinava テレビ e
    // cobrava たな (o armário, a prateleira), ベッド, いす e ほん.
    const velhas = ['w:棚', 'w:ベッド', 'w:椅子', 'w:本'];
    for (const id of velhas) expect(FIGURAS.some((f) => f.word.id === id), id).toBe(true);
    const cards = Object.fromEntries(velhas.map((id) => [cardKey(id, 'meaning'), newCard(T0 - 86_400_000)]));
    const data = importSave(JSON.stringify({ v: 1, cards }), T0);
    const save = ensureMemoriaSave(data.games);
    const reg = new Registro();
    const r = new MemoriaRound({ cards: data.cards, profile: data.profile, save, now: () => T0, rng: seededRng(3) });
    expect(r.fase).toBe('apresenta');
    reg.add(r.apresentadas.map((f) => chaveMemoria(f.word)));
    r.apresentou();
    for (const c of r.quadro.cartas) expect(reg.tem(chaveMemoria(c.figura.word)), c.figura.word.jp).toBe(true);
  });

  it('Jornada: a Cena Viva da sala apresenta, e a Memória da sala só usa o que já foi apresentado (nas duas)', () => {
    const heya = LUGARES.find((l) => l.id === 'heya')!;
    const data = emptySave(T0);
    const reg = new Registro();
    let t = T0;
    const cena = new CenaRound({ lugar: heya, cards: data.cards, profile: data.profile, save: ensureCenaSave(data.games), now: () => (t += 2000), rng: seededRng(1) });
    reg.add(cena.apresentadas.map(chaveCena));
    cena.apresentou();
    const palavras = palavrasDaCena(heya, ['nome']).map((w) => w.id);
    const figuras = recortar(FIGURAS, palavras, (f) => f.word.id);
    const mem = new MemoriaRound({ cards: data.cards, profile: data.profile, save: ensureMemoriaSave(data.games), now: () => (t += 3000), rng: seededRng(2), figuras });
    if (mem.fase === 'apresenta') {
      // O que a Cena Viva já apresentou não volta no cartão: a Memória aproveita.
      for (const f of mem.apresentadas) expect(reg.tem(chaveMemoria(f.word))).toBe(false);
      reg.add(mem.apresentadas.map((f) => chaveMemoria(f.word)));
      mem.apresentou();
    }
    for (const c of mem.quadro.cartas) {
      expect(reg.tem(chaveMemoria(c.figura.word)), c.figura.word.jp).toBe(true);
      expect(palavras).toContain(c.figura.word.id);
    }
  });
});

describe('Cena Viva', () => {
  it('save zerado: tarefa, alternativas do nome e coisas clicáveis só do que foi apresentado', () => {
    for (const lugar of LUGARES) {
      const data = emptySave(T0);
      const save = ensureCenaSave(data.games);
      const reg = new Registro();
      let t = T0;
      for (let rodada = 0; rodada < 4; rodada++) {
        const r = new CenaRound({ lugar, cards: data.cards, profile: data.profile, save, now: () => (t += 2000), rng: seededRng(rodada + 7) });
        reg.add(r.apresentadas.map(chaveCena));
        r.apresentou();
        for (let i = 0; i < 12 && r.fase !== 'fim'; i++) {
          r.comecar();
          const tarefa = r.tarefa;
          for (const w of tarefa.palavras) expect(reg.tem(chaveCena(w)), `${lugar.id}: ${w.jp}`).toBe(true);
          for (const w of r.opcoes) expect(reg.tem(chaveCena(w)), `${lugar.id} opção: ${w.jp}`).toBe(true);
          for (const c of lugar.coisas) if (r.clicavel(c.id)) expect(reg.tem(chaveCena(palavraDe(c))), `${lugar.id} clicável: ${c.id}`).toBe(true);
          if (tarefa.marcada) r.escolher(r.opcoes.indexOf(tarefa.palavras[0]!));
          else if (tarefa.pecas) for (const s of tarefa.pecas.certas) r.peca(r.bandeja.findIndex((b) => b.t === s.t));
          else r.clicar(tarefa.alvo[0]!);
          r.seguir();
        }
        t += 86_400_000;
      }
    }
  });
});

describe('KanjiMon', () => {
  it('save zerado: o kanji, a palavra e toda alternativa da caçada já foram apresentados', () => {
    const data = emptySave(T0);
    const reg = new Registro();
    let t = T0;
    const hunt = new Hunt({ cards: data.cards, profile: data.profile, save: emptyKanjimonSave(), rng: seededRng(5), now: () => t });
    hunt.start();
    let perguntas = 0;
    for (let i = 0; i < 600 && hunt.phase !== 'over'; i++) {
      if (hunt.phase === 'apresenta') {
        reg.add(hunt.apresentando);
        hunt.apresentou();
        continue;
      }
      if (hunt.phase === 'chest') {
        hunt.continue();
        continue;
      }
      const q = hunt.question;
      expect(reg.tem(q.card), q.card).toBe(true);
      const textos = reg.textos();
      for (const c of q.choices) expect(textos.has(c), `${q.card}: alternativa ${c}`).toBe(true);
      perguntas++;
      t += 4000;
      hunt.answer(q.answer, 4000);
    }
    expect(perguntas).toBeGreaterThan(100);
  });
});

describe('Kotodama', () => {
  it('save zerado: carta jogada e toda alternativa da pergunta já foram apresentadas', () => {
    const data = emptySave(T0);
    const reg = new Registro();
    let t = T0;
    const run = new Run({ cards: data.cards, profile: data.profile, save: emptyRoguelikeSave(), rng: seededRng(4), now: () => t });
    run.start();
    let perguntas = 0;
    for (let i = 0; i < 3000 && run.phase !== 'over'; i++) {
      t += 5000;
      if (run.phase === 'apresenta') {
        reg.add(run.apresentando.map((id) => cardKey(id, 'meaning')));
        run.apresentou();
      } else if (run.phase === 'map') run.choose(0);
      else if (run.phase === 'combat') {
        if (!run.canPlay) run.endTurn();
        else {
          run.playCard(0);
          const q = run.question;
          if (q) {
            expect(reg.tem(q.card), q.card).toBe(true);
            const textos = reg.textos();
            for (const c of q.choices) expect(textos.has(c), `${q.card}: alternativa ${c}`).toBe(true);
            perguntas++;
            run.answer(q.answer, 4000);
          }
        }
      } else if (run.phase === 'reward') run.takeReward(0);
      else if (run.phase === 'rest') run.rest('heal');
      else if (run.phase === 'shop') run.leaveShop();
    }
    expect(perguntas).toBeGreaterThan(20);
  });
});

describe('Kana em imagens', () => {
  it('save zerado: o kana cobrado e toda alternativa (desenho ou romaji) já foram apresentados', () => {
    const data = emptySave(T0);
    const save = emptyKanaImagensSave();
    const reg = new Registro();
    for (let rodada = 0; rodada < 15; rodada++) {
      const r = new Rodada({ cards: data.cards, profile: data.profile, save, rng: seededRng(rodada + 1), now: () => T0 + rodada * 86_400_000 });
      for (let n = 0; n < 200 && !r.fim; n++) {
        if (r.apresentando) {
          reg.add(r.novos.map((k) => k.carta));
          r.apresentou();
        }
        const p = r.atual;
        if (p.alvo) expect(reg.tem(p.alvo.carta), p.alvo.char).toBe(true);
        if (p.modo !== 'som' && p.modo !== 'relampago') {
          for (const o of p.opcoes) {
            if (o.item) expect(reg.tem(o.item.carta), `${p.alvo?.char}: ${o.item.char}`).toBe(true);
            // Leitura: o romaji da alternativa é de um kana já visto (da mesma escrita).
            if (o.texto && p.alvo) expect(KANA_IMAGENS.some((k) => k.romaji === o.texto && k.escrita === p.alvo!.escrita && reg.tem(k.carta)), `${p.alvo.char}: ${o.texto}`).toBe(true);
          }
        }
        r.responder(p.certa);
        r.seguir();
      }
    }
    expect(reg.itens.size).toBeGreaterThan(10);
  });
});

describe('Kana Beat', () => {
  for (const mode of ['hiragana', 'katakana', 'palavras'] as const) {
    it(`save zerado (${mode}): toda nota da música já foi apresentada`, () => {
      const data = emptySave(T0);
      const save = ensureKanaBeatSave(data.games);
      const reg = new Registro();
      for (let fase = 0; fase < 5; fase++) {
        const stage = new Stage({ cards: data.cards, profile: data.profile, save, rng: seededRng(fase + 1), now: () => T0 + fase * 3_600_000 }, mode, 90);
        reg.add(stage.novos.map((c) => c.card));
        stage.apresentou();
        for (const n of stage.notes) expect(reg.tem(n.card), n.text).toBe(true);
      }
    });
  }
});

describe('Kanji em peças', () => {
  const T = tracos as unknown as { kanji: Record<string, { g: Record<string, number[]> }> };
  const elementos = (k: string) => Object.keys(T.kanji[k]?.g ?? {});

  it('save zerado: peças erradas, significados, intruso e palavras só de kanji já vistos', () => {
    for (const modo of ['misto', 'peca', 'montar', 'intruso', 'adivinhar', 'composto'] as const) {
      const data = emptySave(T0);
      const save = ensurePecasSave(data.games);
      const vistos = new Set<string>();
      const pecasVistas = () => new Set([...vistos].flatMap((c) => [c, ...(kanjiPeca(c)?.pecas ?? [])]));
      let t = T0;
      for (let rodada = 0; rodada < 4; rodada++) {
        const r = new PecasRound({ cards: data.cards, save, profile: data.profile, now: () => (t += 4000), rng: seededRng(rodada + 3), elementos, modo });
        for (let n = 0; n < 60 && r.fase !== 'fim'; n++) {
          if (r.fase === 'licao') {
            vistos.add(r.pergunta.k.kanji);
            r.seguir();
          }
          const p = r.pergunta;
          // "Adivinhar" sem lição: kanji novo com todas as peças já vistas, é dele a apresentação.
          if (p.modo === 'adivinhar' && !vistos.has(p.k.kanji)) {
            expect(pecasDoKanji(p.k).every((x) => pecasVistas().has(x)), `${modo}: ${p.k.kanji}`).toBe(true);
            vistos.add(p.k.kanji);
          }
          expect(vistos.has(p.k.kanji), `${modo}: ${p.k.kanji}`).toBe(true);
          const sabe = pecasVistas();
          if (p.modo === 'peca') for (const o of p.opcoes) if (o !== p.alvo) expect(sabe.has(o), `${modo} ${p.k.kanji}: peça ${o}`).toBe(true);
          if (p.modo === 'montar') for (const o of p.bandeja) if (!p.precisa.includes(o)) expect(sabe.has(o), `${modo} ${p.k.kanji}: peça ${o}`).toBe(true);
          if (p.modo === 'intruso') for (const k of [p.maioria, p.diferente]) expect(vistos.has(k.kanji), `${modo}: intruso ${k.kanji}`).toBe(true);
          if (p.modo === 'composto') for (const k of p.palavra.kanji) expect(vistos.has(k.kanji), `${modo}: ${p.palavra.jp}`).toBe(true);
          if (p.modo === 'adivinhar') {
            const significados = new Set(KANJI_PECAS.filter((k) => vistos.has(k.kanji)).flatMap((k) => k.pt));
            for (const o of p.opcoes) expect(significados.has(o), `${modo} ${p.k.kanji}: ${o}`).toBe(true);
          }
          if (p.modo === 'montar') for (const x of p.precisa) r.responder(p.bandeja.indexOf(x));
          else r.responder(p.certa);
          r.seguir();
        }
      }
    }
  });
});

describe('Kumitate', () => {
  it('save zerado: a bandeja só tem peça de ponto já ensinado', () => {
    const data = emptySave(T0);
    const save = emptyGramaticaSave();
    const reg = new Registro();
    let t = T0;
    for (let rodada = 0; rodada < 8; rodada++) {
      const r = new GramaticaRound({ course: COURSE, cards: data.cards, profile: data.profile, save, lookup: findWord, now: () => (t += 3000), rng: seededRng(rodada + 1) });
      for (let n = 0; n < 40 && r.phase !== 'end'; n++) {
        if (r.phase === 'lesson') {
          reg.add([cardOf(r.puzzle.point.id)]);
          r.begin();
        }
        expect(reg.tem(cardOf(r.puzzle.point.id)), r.puzzle.point.id).toBe(true);
        for (const slot of r.puzzle.slots.filter((s) => s.open)) {
          for (const b of slot.tray) {
            const p = pointOfBlock(COURSE, b);
            expect(fits(slot.role, b) || (!!p && reg.tem(cardOf(p.id))), `${r.puzzle.point.id}: peça ${b}`).toBe(true);
          }
        }
        for (let i = 0; i < 10 && r.phase === 'build'; i++) {
          const slot = r.activeSlot!;
          r.place(slot.tray.find((b) => fits(slot.role, b))!);
        }
        r.next();
      }
      t += 86_400_000;
    }
  });
});

describe('Aventura', () => {
  it('save zerado: palavra das falas e das opções ou foi apresentada, ou vem com leitura e significado na tela', () => {
    const data = emptySave(T0);
    const reg = new Registro();
    let t = T0;
    for (const scene of SCENES.slice(0, 4)) {
      const play = new ScenePlay(scene, { cards: data.cards, profile: data.profile, save: emptyAventuraSave(), lookup: findWord, now: () => (t += 3000) });
      reg.add(play.apresentando.map((id) => cardKey(id, 'meaning')));
      play.apresentou();
      for (let i = 0; i < 400 && !play.finished; i++) {
        const tokens = [...play.shown.tokens, ...play.shown.options.flatMap((o) => o.tokens)];
        for (const tk of tokens) if (tk.word && !reg.tem(cardKey(tk.word.id, 'meaning'))) expect(tk.help, `${scene.id}: ${tk.text}`).toBe('full');
        if (play.awaitingChoice) play.choose(play.shown.options.findIndex((o) => o.r === 'ok' && !o.tried));
        else play.advance();
      }
      // Só a apresentação conta: palavra que passou na fala não ganha carta.
      for (const id of Object.keys(data.cards)) expect(reg.tem(id), id).toBe(true);
    }
  });
});

describe('Conversa', () => {
  it('as palavras que o personagem puxa já foram apresentadas antes da conversa', () => {
    for (const cena of CENAS) {
      const data = emptySave(T0);
      const termos = termosParaApresentar(cena, data.cards);
      apresentarTermos(data.cards, termos, T0);
      const ids = new Set(termos.map((x) => x.id));
      for (const t of palavrasEmFoco(cena, data.cards, T0, seededRng(1))) expect(ids.has(t.id), `${cena.id}: ${t.jp}`).toBe(true);
    }
  });
});

describe('Jornada', () => {
  it('nas lições de palavras, expressões e kanji, a alternativa errada já apareceu num quadro antes', () => {
    // Antes = num quadro da própria lição, ou numa lição anterior (todas, na ordem do conteúdo).
    const visto = new Set<string>();
    const falhas: string[] = [];
    for (const l of LICOES) {
      if (!/^(vocab|expr|kanji):/.test(l.id)) {
        for (const p of l.passos) if (p.tipo === 'quadro') for (const x of [p.pt, p.jp ? JSON.stringify(p.jp) : undefined]) if (x) visto.add(x);
        continue;
      }
      for (const p of l.passos) {
        if (p.tipo === 'quadro') {
          if (p.pt) visto.add(p.pt);
          if (p.jp) visto.add(JSON.stringify(p.jp));
          // "Não confunda com X: Y." também apresenta o par parecido.
          for (const linha of p.linhas) {
            const m = /^Não confunda com .+: (.+)\.$/.exec(linha);
            if (m) visto.add(m[1]!);
          }
          continue;
        }
        if (p.tipo !== 'pergunta') continue;
        for (const e of p.erradas) if (!visto.has(e) && !visto.has(JSON.stringify(e))) falhas.push(`${l.id} ${p.id}: ${e}`);
      }
    }
    // O tema "sons" vem uma palavra por vez: só a primeira delas não tem do que tirar alternativa.
    expect(falhas.filter((f) => !f.startsWith('vocab:sons:1 ')).slice(0, 10)).toEqual([]);
  });
});

describe('registro compartilhado', () => {
  it('o que um jogo apresentou vale nos outros: o kanji do KanjiMon é alternativa conhecida no Kotodama', () => {
    const data = emptySave(T0);
    const hunt = new Hunt({ cards: data.cards, profile: data.profile, save: emptyKanjimonSave(), rng: seededRng(1), now: () => T0 });
    hunt.start();
    const apresentados = [...hunt.apresentando];
    hunt.apresentou();
    for (const k of apresentados) expect(foiApresentado(data.cards, k)).toBe(true);
    expect(getKanji(itemDe(apresentados[0]!))).toBeDefined();
  });
});
