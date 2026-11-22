import { afterEach, describe, expect, it } from 'vitest';
import { cardKey, KANJI, WORDS } from '../src/content';
import { acharPalavra, JORNADA_WORDS } from '../src/content/escola';
import { DAILY_WORDS } from '../src/content/vida';
import { app, go, jornadaSave, screen } from '../src/core/app';
import { foco } from '../src/core/foco';
import { recortar } from '../src/core/foco';
import { seededRng } from '../src/core/rng';
import { emptySave } from '../src/core/save';
import { review, newCard, State } from '../src/core/srs';
import { SCENES } from '../src/games/aventura/cenas';
import { CENAS } from '../src/games/conversa/engine';
import { POINTS } from '../src/games/gramatica/pontos';
import { emptyKanjimonSave, Hunt } from '../src/games/kanjimon/engine';
import { ensureKanaBeatSave, Stage } from '../src/games/kanabeat/engine';
import { emptyRoguelikeSave, Run } from '../src/games/roguelike/engine';
import { emptyKanaImagensSave, idsAbertos, Rodada } from '../src/games/kanaimagens/engine';
import { FIGURAS_MEMORIA, MemoriaRound, ensureMemoriaSave } from '../src/games/memoria/engine';
import { palavrasDaCena } from '../src/games/cena/engine';
import { LUGARES } from '../src/games/cena/lugares';
import { KANA_IMAGENS } from '../src/content/kana';
import { Andamento } from '../src/jornada/andamento';
import {
  acharMissao,
  andamento,
  ensureJornadaSave,
  ETAPAS,
  etapaDa,
  MISSOES,
  missoesDa,
  proximaMissao,
  registrarMissao,
} from '../src/jornada/etapas';
import { acharLicao, LICOES, MAX_QUADROS_SEGUIDOS, type Licao } from '../src/jornada/licoes';

const T0 = new Date('2026-11-19T12:00:00').getTime();

describe('lições em quadrinhos', () => {
  it('ids únicos e cada lição de 3 a 10 minutos', () => {
    const ids = LICOES.map((l) => l.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    for (const l of LICOES) {
      expect(l.minutos, l.id).toBeGreaterThanOrEqual(3);
      expect(l.minutos, l.id).toBeLessThanOrEqual(10);
    }
  });

  it('começa ensinando, tem pergunta e toda pergunta vem logo depois de um quadro ou de outra pergunta', () => {
    for (const l of LICOES) {
      expect(l.passos[0]?.tipo, l.id).toBe('quadro');
      expect(l.passos.some((p) => p.tipo !== 'quadro'), l.id).toBe(true);
    }
  });

  // Gramática e situações traziam até 12 quadros seguidos antes da primeira pergunta.
  it('a pergunta vem no máximo 3 quadros depois do que ensinou (nunca um bloco de teoria e depois a prova)', () => {
    for (const l of LICOES) {
      // Fundamentos (e a lição de sons, que abre com a página da escola): uma página curta, depois a pergunta.
      const limite = l.id.startsWith('fund:') || l.id === 'sons' ? 5 : MAX_QUADROS_SEGUIDOS;
      let seguidos = 0;
      for (const p of l.passos) {
        seguidos = p.tipo === 'quadro' ? seguidos + 1 : 0;
        expect(seguidos, l.id).toBeLessThanOrEqual(limite);
      }
      expect(l.passos[l.passos.length - 1]?.tipo, `${l.id} termina sem pergunta`).not.toBe('quadro');
    }
  });

  it('perguntas sobre exemplos e falas usam traduções da própria lição, todas diferentes', () => {
    const g = acharLicao('gram:g-desu')!;
    const sobreExemplos = g.passos.filter((p) => p.tipo === 'pergunta' && p.id.startsWith('g-desu:exemplo'));
    expect(sobreExemplos.length).toBe(5);
    const s = acharLicao('sit:s-konbini')!;
    expect(s.passos.filter((p) => p.tipo === 'pergunta' && p.id.startsWith('s-konbini:fala')).length).toBe(4);
  });

  it('opções da pergunta são diferentes entre si e a certa está entre elas', () => {
    for (const l of LICOES) {
      for (const p of l.passos) {
        if (p.tipo !== 'pergunta') continue;
        const opcoes = [p.correta, ...p.erradas];
        expect(new Set(opcoes).size, `${l.id}/${p.id}`).toBe(opcoes.length);
        expect(opcoes.length, `${l.id}/${p.id}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('a carta que a pergunta move existe no arcade', () => {
    const itens = new Set([...KANJI.map((k) => k.id), ...WORDS.map((w) => w.id), ...DAILY_WORDS.map((w) => w.id), ...JORNADA_WORDS.map((w) => w.id)]);
    for (const l of LICOES) {
      for (const p of l.passos) {
        if (p.tipo !== 'pergunta' || !p.carta) continue;
        expect(itens.has(p.carta.slice(0, p.carta.lastIndexOf('#'))), `${l.id}: ${p.carta}`).toBe(true);
      }
    }
  });

  it('quadro que fala tem a leitura em kana para a voz do navegador', () => {
    for (const l of LICOES) {
      for (const p of l.passos) {
        if (p.tipo !== 'quadro' || !p.fala) continue;
        expect(p.fala.kana, l.id).toMatch(/^[ぁ-ゖァ-ーー、。？！… ]+$/);
      }
    }
  });
});

describe('andamento da lição', () => {
  const licao = acharLicao('vocab:comida:1') ?? (LICOES.find((l) => l.id.startsWith('vocab:')) as Licao);

  function abrir(cards = emptySave(T0).cards) {
    return { cards, a: new Andamento(licao, { cards, now: () => T0, rng: seededRng(1) }) };
  }

  function irAtePergunta(a: Andamento) {
    while (a.passo?.tipo === 'quadro') a.avancar();
  }

  it('pergunta não deixa seguir sem resposta, e só a primeira resposta vale', () => {
    const { a } = abrir();
    irAtePergunta(a);
    expect(a.avancar()).toBe(false);
    const p = a.passo;
    if (p?.tipo !== 'pergunta') throw new Error('sem pergunta');
    expect(a.responder(p.erradas[0] as string)?.certa).toBe(false);
    expect(a.responder(p.correta)).toBeNull();
    expect(a.acertos).toBe(0);
    expect(a.avancar()).toBe(true);
  });

  it('palavra nova é apresentada no quadro; errar logo depois é prática, sem virar esquecimento; a que já tinha carta é avaliada', () => {
    const { a, cards } = abrir();
    irAtePergunta(a);
    const p = a.passo;
    if (p?.tipo !== 'pergunta' || !p.carta) throw new Error('pergunta sem carta');
    a.responder(p.erradas[0] as string);
    expect(cards[p.carta]).toBeDefined();
    expect(cards[p.carta]?.lapses ?? 0).toBe(0);

    const base = emptySave(T0).cards;
    const antes = review(newCard(0), { correct: true }, T0 - 86_400_000 * 3);
    base[p.carta] = antes;
    const outra = new Andamento(licao, { cards: base, now: () => T0, rng: seededRng(1) });
    irAtePergunta(outra);
    outra.responder(p.erradas[0] as string);
    expect(base[p.carta]).toEqual(review(antes, { correct: false }, T0));
    expect(cards[p.carta]?.reps).toBe(1);
    expect(cards[p.carta]?.lapses).toBe(0);
    expect(cards[p.carta]?.state).not.toBe(State.Review);
  });

  it('montar a frase: bloco errado volta, e depois de duas voltas o certo brilha', () => {
    const l = LICOES.find((x) => x.passos.some((p) => p.tipo === 'ordem')) as Licao;
    const a = new Andamento(l, { cards: emptySave(T0).cards, now: () => T0, rng: seededRng(2) });
    while (a.passo?.tipo !== 'ordem') {
      if (a.passo?.tipo === 'pergunta') a.responder(a.passo.correta);
      a.avancar();
    }
    const p = a.passo;
    const errado = p.blocos.findIndex((b) => b !== p.blocos[0]);
    expect(a.colocar(errado)).toBe('volta');
    expect(a.dica).toBe(-1);
    expect(a.colocar(errado)).toBe('volta');
    expect(p.blocos[a.dica]).toBe(p.blocos[0]);
    for (let i = 0; i < p.blocos.length; i++) a.colocar(i);
    expect(a.montagemPronta).toBe(true);
    expect(a.combo).toBe(0);
  });

  it('blocos iguais valem em qualquer ordem', () => {
    const l: Licao = { id: 't', titulo: 't', minutos: 3, passos: [{ tipo: 'ordem', id: 'o', enunciado: '', blocos: ['です', 'か', 'です'] }] };
    const a = new Andamento(l, { cards: {}, now: () => T0, rng: seededRng(1) });
    expect(a.colocar(2)).toBe('certo');
    expect(a.colocar(1)).toBe('certo');
    expect(a.colocar(0)).toBe('pronta');
    expect(a.acertos).toBe(1);
  });
});

describe('mapa da Jornada', () => {
  it('sete etapas na ordem do caminho', () => {
    expect(ETAPAS.map((e) => e.id)).toEqual(['fundamentos', 'kana', 'sobrevivencia', 'n5', 'n4', 'trabalho', 'n3']);
  });

  // A lição kanji:1 e o KanjiMon do mesmo grupo tinham o id m:kanji:1: fazer uma marcava a outra.
  it('missões com id único, de 3 a 10 minutos', () => {
    const ids = MISSOES.map((m) => m.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    for (const m of MISSOES) {
      expect(m.minutos, m.id).toBeGreaterThanOrEqual(3);
      expect(m.minutos, m.id).toBeLessThanOrEqual(10);
    }
  });

  it('toda lição está em alguma missão', () => {
    const usadas = new Set(MISSOES.flatMap((m) => (m.acao.tipo === 'licao' ? [m.acao.licao] : [])));
    expect(LICOES.map((l) => l.id).filter((id) => !usadas.has(id))).toEqual([]);
  });

  it('cada missão aponta para conteúdo que existe', () => {
    const kanji = new Set(KANJI.map((k) => k.id));
    const pontos = new Set(POINTS.map((p) => p.id));
    for (const m of MISSOES) {
      if (m.acao.tipo === 'licao') {
        expect(acharLicao(m.acao.licao), m.id).toBeDefined();
        continue;
      }
      const f = m.acao.foco;
      for (const k of f.kanji ?? []) expect(kanji.has(k), `${m.id}: ${k}`).toBe(true);
      // Palavra da escola ou figura da Memória e da Cena Viva.
      for (const w of f.palavras ?? []) expect(acharPalavra(w) ?? FIGURAS_MEMORIA.find((x) => x.word.id === w), `${m.id}: ${w}`).toBeDefined();
      for (const p of f.pontos ?? []) expect(pontos.has(p), `${m.id}: ${p}`).toBe(true);
      if (f.cena) expect(SCENES.some((s) => s.id === f.cena), m.id).toBe(true);
      if (f.conversa) expect(CENAS.some((c) => c.id === f.conversa), m.id).toBe(true);
      if (f.lugar) expect(LUGARES.some((l) => l.id === f.lugar), m.id).toBe(true);
      const recorte =
        (f.kanji?.length ?? 0) + (f.palavras?.length ?? 0) + (f.pontos?.length ?? 0) + (f.cena ? 1 : 0) + (f.conversa ? 1 : 0) + (f.kana ? 1 : 0) + (f.lugar ? 1 : 0);
      expect(recorte, `${m.id} abre o jogo sem recorte`).toBeGreaterThan(0);
    }
  });

  it('o N3 ainda não tem missão, só o que vem depois; o que vem depois diz a fonte', () => {
    const n3 = ETAPAS.find((e) => e.id === 'n3')!;
    expect(missoesDa(n3)).toEqual([]);
    for (const e of ETAPAS) for (const d of e.depois) expect(d.fonte, d.titulo).toMatch(/JLPT|Marugoto|JF Standard/);
    expect(n3.depois.length).toBeGreaterThan(0);
  });

  it('sugere a primeira não feita, sem trancar nada e sem depender da data', () => {
    const save = ensureJornadaSave({});
    expect(proximaMissao(save)?.id).toBe(MISSOES[0]?.id);
    // Fazer uma missão lá do fim não mexe na sugestão nem tranca o resto.
    registrarMissao(save, MISSOES[MISSOES.length - 1]!.id);
    expect(proximaMissao(save)?.id).toBe(MISSOES[0]?.id);
    registrarMissao(save, MISSOES[0]!.id);
    expect(proximaMissao(save)?.id).toBe(MISSOES[1]?.id);
    const kana = ETAPAS.find((e) => e.id === 'kana')!;
    expect(proximaMissao(save, kana)?.id).toBe(missoesDa(kana)[0]?.id);
  });

  it('com tudo feito, sugere a feita menos vezes; refazer só soma', () => {
    const save = ensureJornadaSave({});
    for (const m of MISSOES) registrarMissao(save, m.id);
    registrarMissao(save, MISSOES[0]!.id);
    expect(proximaMissao(save)?.id).toBe(MISSOES[1]?.id);
    expect(save.feitas[MISSOES[0]!.id]).toBe(2);
    expect(andamento(ETAPAS[0]!, save)).toBe(1);
  });

  it('save estragado é limpo sem perder o que vale', () => {
    const games: Record<string, unknown> = { jornada: { feitas: { 'm:a': 2, 'm:b': -1, 'm:c': 'x', 'm:d': 1.7 }, etapa: 'nao-existe' } };
    const save = ensureJornadaSave(games);
    expect(save).toEqual({ feitas: { 'm:a': 2, 'm:d': 1 } });
    expect(ensureJornadaSave({ jornada: { feitas: {}, etapa: 'n4' } }).etapa).toBe('n4');
    expect(ensureJornadaSave({ jornada: 'lixo' })).toEqual({ feitas: {} });
  });

  it('cada missão pertence a uma etapa', () => {
    for (const m of MISSOES) {
      expect(etapaDa(m.id), m.id).toBeDefined();
      expect(acharMissao(m.id)).toBe(m);
    }
  });
});

describe('jogos abertos por uma missão', () => {
  afterEach(() => {
    foco.value = null;
    screen.value = 'hub';
  });

  const missaoDeJogo = (tela: string) => MISSOES.find((m) => m.acao.tipo === 'jogo' && m.acao.tela === tela)!;

  it('recortar: sem ids ou com recorte vazio, a lista fica inteira', () => {
    expect(recortar([1, 2, 3], undefined, String)).toEqual([1, 2, 3]);
    expect(recortar([1, 2, 3], ['9'], String)).toEqual([1, 2, 3]);
    expect(recortar([1, 2, 3], ['2'], String)).toEqual([2]);
  });

  it('KanjiMon só traz os kanji da missão', () => {
    const ids = ['k:山', 'k:川'];
    foco.value = { missao: 'm:t', titulo: 't', kanji: ids };
    const data = emptySave(T0);
    let t = T0;
    const hunt = new Hunt({ cards: data.cards, profile: data.profile, save: emptyKanjimonSave(), rng: seededRng(3), now: () => t });
    hunt.start();
    // Só os kanji da missão são apresentados antes da caçada.
    expect(hunt.apresentando.map((k) => k.replace(/#.*/, ''))).toEqual(expect.arrayContaining(ids));
    expect(hunt.apresentando.every((k) => ids.some((id) => k.startsWith(`${id}#`)))).toBe(true);
    hunt.apresentou();
    const vistos = new Set<string>();
    for (let i = 0; i < 6; i++) {
      vistos.add(hunt.enemy.kanji.id);
      t += 60_000;
      (hunt as unknown as { spawn(): void }).spawn();
    }
    expect([...vistos].every((k) => ids.includes(k))).toBe(true);
  });

  it('Kana Beat de palavras só traz as palavras da missão, mesmo as que vieram da escola', () => {
    const m = MISSOES.find((x) => x.acao.tipo === 'jogo' && x.acao.tela === 'kanabeat' && !!x.acao.foco.palavras)!;
    if (m.acao.tipo !== 'jogo') throw new Error();
    const ids = m.acao.foco.palavras!;
    foco.value = { missao: m.id, titulo: m.titulo, ...m.acao.foco };
    const data = emptySave(T0);
    const stage = new Stage({ cards: data.cards, profile: data.profile, save: ensureKanaBeatSave(data.games), rng: seededRng(1), now: () => T0 }, 'palavras', 60);
    expect(stage.notes.length).toBeGreaterThan(0);
    for (const n of stage.notes) expect(ids.map((id) => cardKey(id, 'reading'))).toContain(n.card);
  });

  it('Kotodama só dá cartas do conteúdo da missão, sem esperar os kanji da palavra', () => {
    const m = MISSOES.find((x) => x.acao.tipo === 'jogo' && x.acao.tela === 'roguelike' && !!x.acao.foco.palavras)!;
    if (m.acao.tipo !== 'jogo') throw new Error();
    foco.value = { missao: m.id, titulo: m.titulo, ...m.acao.foco };
    const quer = new Set([...(m.acao.foco.kanji ?? []), ...(m.acao.foco.palavras ?? [])]);
    const data = emptySave(T0);
    const run = new Run({ cards: data.cards, profile: data.profile, save: emptyRoguelikeSave(), rng: seededRng(1), now: () => T0 });
    run.start();
    expect(run.deck.length).toBeGreaterThan(0);
    for (const c of run.deck) expect(quer.has(c.itemId), c.itemId).toBe(true);
  });

  it('Kumitate, Aventura e Conversa recebem o ponto, a cena e a situação da missão', () => {
    for (const tela of ['gramatica', 'aventura', 'conversa']) expect(missaoDeJogo(tela), tela).toBeDefined();
  });

  it('sair do jogo volta para a Jornada e conta a missão; sem missão, volta ao fliperama', () => {
    app.data = emptySave(T0);
    const m = missaoDeJogo('kanjimon');
    foco.value = { missao: m.id, titulo: m.titulo };
    screen.value = 'kanjimon';
    go('hub');
    expect(screen.value).toBe('jornada');
    expect(foco.value).toBeNull();
    expect(jornadaSave().feitas[m.id]).toBe(1);
    screen.value = 'kanjimon';
    go('hub');
    expect(screen.value).toBe('hub');
    expect(jornadaSave().feitas[m.id]).toBe(1);
  });

  it('a Jornada põe os jogos na ordem de ensinar: Kana em imagens, Kana Beat, Cena Viva, Memória e só depois o KanjiMon', () => {
    const ordem = MISSOES.flatMap((m, i) => (m.acao.tipo === 'jogo' ? [{ tela: m.acao.tela, i }] : []));
    const primeira = (tela: string) => ordem.find((x) => x.tela === tela)!.i;
    expect(primeira('kanaimagens')).toBeLessThan(primeira('kanabeat'));
    expect(primeira('kanabeat')).toBeLessThan(primeira('cena'));
    expect(primeira('cena')).toBeLessThan(primeira('memoria'));
    expect(primeira('memoria')).toBeLessThan(primeira('kanjimon'));
    // Katakana com imagem vem antes do Kana Beat de katakana.
    const kata = (tela: string) => MISSOES.findIndex((m) => m.acao.tipo === 'jogo' && m.acao.tela === tela && m.acao.foco.kana === 'katakana');
    expect(kata('kanaimagens')).toBeGreaterThan(-1);
    expect(kata('kanaimagens')).toBeLessThan(kata('kanabeat'));
  });

  it('Kana em imagens da missão só apresenta e pergunta a escrita dela', () => {
    for (const escrita of ['hiragana', 'katakana'] as const) {
      const data = emptySave(T0);
      const save = emptyKanaImagensSave();
      const ids = new Set(idsAbertos(save, escrita));
      expect(ids.size, escrita).toBeGreaterThan(0);
      const r = new Rodada({ cards: data.cards, profile: data.profile, save, rng: seededRng(2), now: () => T0, escrita });
      expect(r.apresentando).toBe(true);
      expect(r.novos.length).toBeGreaterThan(0);
      for (const k of r.novos) expect(ids.has(k.id), `${escrita}: ${k.id}`).toBe(true);
    }
    // Sem missão, continua do jeito de sempre: o primeiro lote (hiragana).
    const kata = new Set(KANA_IMAGENS.filter((k) => k.escrita === 'katakana').map((k) => k.id));
    expect(idsAbertos(emptyKanaImagensSave()).some((id) => kata.has(id))).toBe(false);
    expect(idsAbertos(emptyKanaImagensSave(), 'katakana').every((id) => kata.has(id))).toBe(true);
  });

  it('Cena Viva e Memória das primeiras palavras usam o mesmo lugar: a Memória treina o que a cena apresentou', () => {
    const cenas = MISSOES.filter((m) => m.acao.tipo === 'jogo' && m.acao.tela === 'cena');
    expect(cenas.length).toBeGreaterThan(0);
    for (const c of cenas) {
      if (c.acao.tipo !== 'jogo') throw new Error();
      const id = c.acao.foco.lugar;
      const lugar = LUGARES.find((l) => l.id === id)!;
      const mem = MISSOES.find((m) => m.id === `m:memoria:${lugar.id}`);
      if (mem?.acao.tipo !== 'jogo') throw new Error(`falta a Memória de ${lugar.id}`);
      expect(MISSOES.indexOf(mem)).toBeGreaterThan(MISSOES.indexOf(c));
      const ids = mem.acao.foco.palavras!;
      expect(ids).toEqual(palavrasDaCena(lugar, ['nome']).map((w) => w.id));
      // A Memória da missão só monta com as figuras dessas palavras.
      foco.value = { missao: mem.id, titulo: mem.titulo, ...mem.acao.foco };
      const figuras = recortar(FIGURAS_MEMORIA, foco.value.palavras, (f) => f.word.id);
      expect(figuras.length).toBeGreaterThan(0);
      const data = emptySave(T0);
      const r = new MemoriaRound({ cards: data.cards, profile: data.profile, save: ensureMemoriaSave(data.games), now: () => T0, rng: seededRng(1), figuras });
      for (const f of r.apresentadas) expect(ids).toContain(f.word.id);
    }
  });

  it('abrir uma lição não muda o "jogo da vez" do fliperama', () => {
    app.data = emptySave(T0);
    app.data.profile.lastGame = 'kanabeat';
    go('licao');
    expect(app.data.profile.lastGame).toBe('kanabeat');
  });
});
