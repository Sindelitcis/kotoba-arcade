import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KANA } from '../src/content';
import {
  GRUPOS_PARECIDOS,
  KANA_IMAGENS,
  LOTES,
  PALAVRAS_KATAKANA,
  imagemDoObjeto,
  kanaDaPalavra,
  kanaItem,
  kanaPorChar,
} from '../src/content/kana';
import type { Manifesto } from '../src/core/audio';
import { kataToHira } from '../src/core/kana';
import { seededRng } from '../src/core/rng';
import { emptySave } from '../src/core/save';
import { masteryLevel, review } from '../src/core/srs';
import { VOZ_PALAVRA } from '../src/core/vozes';
import {
  ACERTOS_PARA_ABRIR,
  BLOCOS,
  NOVOS_POR_RODADA,
  RODADA,
  Rodada,
  TesteEntrada,
  abrirLotes,
  chaveImagem,
  distratores,
  emptyKanaImagensSave,
  ensureKanaImagensSave,
  modoPara,
  palavrasLegiveis,
  parMinimo,
  perguntaDe,
  perguntaRelampago,
  somEhPista,
  vistosDe,
  type Evento,
  type Pergunta,
} from '../src/games/kanaimagens/engine';

const T0 = new Date('2026-11-19T12:00:00').getTime();
const RAIZ = join(__dirname, '..');
const char = (c: string) => {
  const k = kanaPorChar(c);
  if (!k) throw new Error(c);
  return k;
};

describe('conteúdo do kana', () => {
  it('cobre todo kana do Kana Beat com o mesmo id de carta', () => {
    const ids = new Set(KANA_IMAGENS.map((k) => k.id));
    const faltam = KANA.flatMap((k) => [k.id, `ak:${k.kata}`]).filter((id) => !ids.has(id));
    expect(faltam).toEqual([]);
    expect(char('あ').carta).toBe('a:あ#reading');
    expect(char('ア').carta).toBe('ak:ア#reading');
  });

  it('tem todos os grupos pedidos: básicos, tenten, maru, combinados, pequenos, ー e estrangeiros', () => {
    for (const c of ['ぢ', 'づ', 'ぱ', 'ピ', 'きゃ', 'ぴょ', 'キャ', 'っ', 'ッ', 'ゃ', 'ャ', 'ー', 'ファ', 'ティ', 'ディ', 'ヴ', 'ウォ', 'シェ', 'チェ']) expect(kanaPorChar(c), c).toBeDefined();
    expect(KANA_IMAGENS.filter((k) => k.grupo === 'basico')).toHaveLength(92);
  });

  it('todo kana tem mnemônico, cena e exemplo que contém o próprio kana', () => {
    for (const k of KANA_IMAGENS) {
      expect(k.mnemonico.length, k.char).toBeGreaterThan(20);
      expect(k.cena.objeto, k.char).not.toBe('');
      expect(k.exemplo.pt, k.char).not.toBe('');
      expect(kataToHira(k.exemplo.kana), `${k.char} em ${k.exemplo.kana}`).toContain(kataToHira(k.char));
    }
  });

  it('exemplo escrito na outra escrita vem com uma nota avisando', () => {
    for (const k of KANA_IMAGENS) {
      const outra = k.escrita === 'hiragana' ? /[ァ-ヺ]/ : /[ぁ-ゖ]/;
      if (outra.test(k.exemplo.kana)) expect(k.nota, k.char).toBeTruthy();
    }
  });

  it('todo par que confunde existe nos dois lados', () => {
    for (const k of KANA_IMAGENS) for (const id of k.parecidos) expect(kanaItem(id).parecidos, `${k.char} ↔ ${kanaItem(id).char}`).toContain(k.id);
  });

  it('os pares pedidos estão todos lá', () => {
    const pedidos = [['シ', 'ツ'], ['ソ', 'ン'], ['ぬ', 'め'], ['わ', 'れ', 'ね'], ['る', 'ろ'], ['さ', 'ち'], ['は', 'ほ'], ['ク', 'ケ', 'タ']];
    for (const g of pedidos) for (const a of g) for (const b of g) if (a !== b) expect(char(a).parecidos, `${a}/${b}`).toContain(char(b).id);
    expect(GRUPOS_PARECIDOS.length).toBeGreaterThan(pedidos.length);
  });

  it('pronúncia revisada: ふ é sopro, を é "o", ん muda, a linha ら tem r fraco, じ não é "ji" de português', () => {
    expect(char('ふ').soa).toMatch(/lábios/);
    expect(char('ふ').soa).toMatch(/não o f de "faca"/);
    expect(char('を').romaji).toBe('o');
    expect(char('を').soa).toMatch(/igual a お/);
    expect(char('ん').nota).toMatch(/"m"/);
    expect(char('ん').nota).toMatch(/"ng"/);
    for (const c of ['ら', 'り', 'る', 'れ', 'ろ']) expect(char(c).soa, c).toMatch(/r fraco/);
    expect(char('ぎ').soa).toMatch(/gui/);
    expect(char('げ').soa).toMatch(/gue/);
    expect(char('ティ').soa).toMatch(/sem virar "tchi"/);
    expect(char('ヴ').soa).toMatch(/bu/);
    // A escola-japones dizia "ra de rato" (r forte): não pode voltar.
    expect(KANA_IMAGENS.map((k) => k.mnemonico).join(' ')).not.toMatch(/de "?rato"?/);
  });

  it('dentro da mesma escrita, cada kana tem uma imagem diferente', () => {
    for (const escrita of ['hiragana', 'katakana'] as const) {
      const chaves = KANA_IMAGENS.filter((k) => k.escrita === escrita).map(chaveImagem);
      expect(new Set(chaves).size).toBe(chaves.length);
      const objetos = KANA_IMAGENS.filter((k) => k.escrita === escrita && k.base === k.char).map((k) => k.cena.objeto);
      expect(new Set(objetos).size, escrita).toBe(objetos.length);
    }
  });

  it('cada objeto tem prompt no estúdio e ilustração exportada, nas duas versões', () => {
    const lista = JSON.parse(readFileSync(join(RAIZ, 'scripts/imagens/kana.json'), 'utf8')) as { itens: { id: string }[] };
    const objetos = new Set(KANA_IMAGENS.map((k) => imagemDoObjeto(k.cena.objeto)));
    expect(new Set(lista.itens.map((i) => i.id))).toEqual(objetos);
    for (const id of objetos) {
      expect(existsSync(join(RAIZ, 'src/assets/kana', `${id}.webp`)), id).toBe(true);
      expect(existsSync(join(RAIZ, 'src/assets/kana-tinta', `${id}.webp`)), id).toBe(true);
    }
  });

  it('todo kana tem áudio gravado: a letra (ou o exemplo, para っ e ー), o exemplo e as palavras', () => {
    const manifesto = JSON.parse(readFileSync(join(RAIZ, 'public/vozes/manifesto.json'), 'utf8')) as Manifesto;
    const gravada = (t: string) => !!manifesto.falas[t]?.[VOZ_PALAVRA];
    const textos = [...KANA_IMAGENS.flatMap((k) => [k.fala, k.exemplo.kana]), ...PALAVRAS_KATAKANA.map((p) => p.kana)];
    expect([...new Set(textos)].filter((t) => !gravada(t))).toEqual([]);
  });

  it('lotes cobrem cada kana uma vez, na ordem do básico ao denso', () => {
    const ids = LOTES.flatMap((l) => l.ids);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(KANA_IMAGENS.length);
    expect(LOTES[0]?.ids).toEqual(['a:あ', 'a:い', 'a:う', 'a:え', 'a:お']);
    expect(LOTES.at(-1)?.titulo).toMatch(/Sons de fora/);
  });

  it('palavras da leitura relâmpago: só kana conhecidos e significados que não se repetem', () => {
    for (const p of PALAVRAS_KATAKANA) expect(() => kanaDaPalavra(p.kana), p.kana).not.toThrow();
    const pts = PALAVRAS_KATAKANA.map((p) => p.pt);
    expect(new Set(pts).size).toBe(pts.length);
    for (const w of ['コンビニ', 'アルバイト', 'パスポート']) expect(PALAVRAS_KATAKANA.some((p) => p.kana === w), w).toBe(true);
    expect(kanaDaPalavra('ティッシュ').map((k) => k.char)).toEqual(['ティ', 'ッ', 'シュ']);
  });

  // O primeiro commit deste jogo saiu com CRLF e o rebase virou conflito no arquivo inteiro.
  it('os arquivos do jogo usam fim de linha LF', () => {
    const arquivos = [
      'src/content/kana.ts',
      'src/content/ajuda/kanaimagens.ts',
      'src/games/kanaimagens/engine.ts',
      'src/games/kanaimagens/Imagem.tsx',
      'src/games/kanaimagens/KanaImagensGame.tsx',
      'src/games/kanaimagens/kanaimagens.css',
      'scripts/imagens/kana.json',
      'tests/kanaimagens.test.ts',
      'e2e/kanaimagens.spec.ts',
      'docs/kana.md',
    ];
    expect(arquivos.filter((f) => readFileSync(join(RAIZ, f), 'utf8').includes('\r'))).toEqual([]);
  });
});

/* ───────── Regras ───────── */

function deps(seed = 1, now = T0) {
  const data = emptySave(now);
  const save = emptyKanaImagensSave();
  return { cards: data.cards, profile: data.profile, save, rng: seededRng(seed), now: () => now };
}

/** Responde certo (ou errado) e segue, como a tela faz. */
function jogar(r: Rodada, acertar: (p: Pergunta) => boolean = () => true): Evento[] {
  const todos: Evento[] = [];
  for (let n = 0; n < 200 && !r.fim; n++) {
    const p = r.atual;
    if (p.modo !== 'apresenta') {
      const ok = acertar(p);
      todos.push(...r.responder(ok ? p.certa : (p.certa + 1) % p.opcoes.length));
    }
    todos.push(...r.seguir());
  }
  return todos;
}

describe('save', () => {
  it('conserta save quebrado no próprio objeto', () => {
    const games: Record<string, unknown> = { kanaimagens: { rodadas: 'x', abertos: 999, acertos: { 'a:あ': 9, 'a:い': 'x' }, teste: 1 } };
    const s = ensureKanaImagensSave(games);
    expect(s).toBe(games.kanaimagens);
    expect(s).toEqual({ rodadas: 0, abertos: LOTES.length, recorde: 0, acertos: { 'a:あ': ACERTOS_PARA_ABRIR }, teste: false });
    expect(ensureKanaImagensSave({ kanaimagens: [] })).toEqual(emptyKanaImagensSave());
  });
});

describe('rodada', () => {
  it('primeiro contato ensina antes de cobrar: apresentação, depois a pergunta com imagem do mesmo kana', () => {
    const r = new Rodada(deps());
    expect(r.atual.modo).toBe('apresenta');
    const apresentados = r.fila.filter((p) => p.modo === 'apresenta').map((p) => p.alvo?.char);
    expect(apresentados).toEqual(['あ', 'い', 'う']);
    expect(apresentados.length).toBeLessThanOrEqual(NOVOS_POR_RODADA);
    const depois = r.fila.slice(3, 6);
    expect(depois.map((p) => p.alvo?.char)).toEqual(['あ', 'い', 'う']);
    for (const p of depois) {
      expect(p.modo).toBe('imagem-letra');
      expect(p.novo).toBe(true);
    }
  });

  it('acerto grava a carta compartilhada, soma XP e combo; a rodada acaba em RODADA perguntas', () => {
    const d = deps();
    const r = new Rodada(d);
    const ev = jogar(r);
    expect(ev.filter((e) => e.t === 'acerto')).toHaveLength(RODADA);
    const fim = ev.find((e) => e.t === 'fim');
    expect(fim && fim.t === 'fim' && fim.resumo.acertos).toBe(RODADA);
    expect(d.cards['a:あ#reading']).toBeDefined();
    expect(d.profile.xp).toBeGreaterThan(0);
    expect(d.save.rodadas).toBe(1);
    expect(r.comboMax).toBe(RODADA);
  });

  it('erro não para nada: mostra a certa e o kana volta em até três perguntas, com imagem', () => {
    const r = new Rodada(deps());
    while (r.atual.modo === 'apresenta') r.seguir();
    const alvo = r.atual.alvo?.id;
    const ev = r.responder((r.atual.certa + 1) % r.atual.opcoes.length);
    expect(ev).toEqual([{ t: 'erro', certa: r.atual.certa }]);
    const proximas = r.fila.slice(r.indice + 1, r.indice + 4);
    expect(proximas.some((p) => p.alvo?.id === alvo && p.modo === 'imagem-letra')).toBe(true);
    expect(r.errados.map((k) => k.id)).toEqual([alvo]);
  });

  it('responder duas vezes ou com número fora das opções não conta', () => {
    const r = new Rodada(deps());
    while (r.atual.modo === 'apresenta') r.seguir();
    expect(r.responder(9)).toEqual([]);
    expect(r.responder(r.atual.certa)).not.toEqual([]);
    expect(r.responder(r.atual.certa)).toEqual([]);
    expect(r.feitas).toBe(1);
  });

  it('com muita coisa mole na memória, a rodada não traz kana novo', () => {
    const d = deps();
    d.save.abertos = LOTES.length;
    for (const k of KANA_IMAGENS.slice(0, 14)) d.cards[k.carta] = review(undefined, { correct: false }, T0);
    const r = new Rodada(d);
    expect(r.fila.some((p) => p.modo === 'apresenta')).toBe(false);
  });

  it('o lote seguinte abre quando todo kana do último foi acertado de primeira duas vezes', () => {
    const s = emptyKanaImagensSave();
    for (const id of LOTES[0]!.ids.slice(1)) s.acertos[id] = ACERTOS_PARA_ABRIR;
    expect(abrirLotes(s)).toBe(0);
    s.acertos[LOTES[0]!.ids[0]!] = ACERTOS_PARA_ABRIR;
    expect(abrirLotes(s)).toBe(1);
    expect(s.abertos).toBe(2);
  });

  it('jogando várias rodadas certinhas, os lotes vão abrindo e aparecem kana novos', () => {
    const d = deps(3);
    for (let i = 0; i < 12; i++) jogar(new Rodada(d));
    expect(d.save.abertos).toBeGreaterThan(2);
    expect(vistosDe(d.cards).size).toBeGreaterThan(10);
  });
});

describe('perguntas', () => {
  const vistos = new Set(KANA_IMAGENS.map((k) => k.id));

  it('alternativas: mesma escrita, sem som repetido, sem imagem igual, sem a resposta duplicada', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const k of KANA_IMAGENS) {
        const d = distratores(k, vistos, seededRng(seed));
        expect(d, k.char).toHaveLength(3);
        for (const o of d) {
          expect(o.escrita).toBe(k.escrita);
          expect(o.romaji, `${k.char}/${o.char}`).not.toBe(k.romaji);
          expect(chaveImagem(o)).not.toBe(chaveImagem(k));
        }
        expect(new Set(d.map((o) => o.romaji)).size).toBe(3);
      }
    }
  });

  it('"só pelo som" nunca põe じ e ぢ (ou ず e づ) juntos: os dois soam igual', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const p = perguntaDe('som', char('じ'), vistos, seededRng(seed));
      expect(p.opcoes.map((o) => o.item?.char)).not.toContain('ぢ');
      const q = perguntaDe('som', char('ず'), vistos, seededRng(seed));
      expect(q.opcoes.map((o) => o.item?.char)).not.toContain('づ');
    }
  });

  it('pares: as opções são o kana e os parecidos dele, lado a lado', () => {
    const p = perguntaDe('pares', char('シ'), vistos, seededRng(1));
    expect(p.opcoes.map((o) => o.item?.char).sort()).toEqual(['シ', 'ツ', 'ン'].sort());
    expect(p.opcoes[p.certa]?.item?.char).toBe('シ');
  });

  it('っ, ー e os pequenos são perguntados pelo som da palavra, contra a palavra sem o detalhe', () => {
    expect(parMinimo(char('っ'))).toBe('きて');
    expect(parMinimo(char('ー'))).toBe('ビル');
    expect(parMinimo(char('ょ'))).toBe('きよう');
    const p = perguntaDe('imagem-letra', char('ー'), vistos, seededRng(2));
    expect(p.modo).toBe('som');
    expect(p.opcoes.map((o) => o.texto).sort()).toEqual(['ビル', 'ビール']);
    expect(p.fala).toBe('ビール');
  });

  it('o modo fica mais seco conforme a carta firma', () => {
    const k = char('し');
    const v = new Set([k.id]);
    expect(['imagem-letra', 'letra-imagem']).toContain(modoPara(k, undefined, v, seededRng(1)));
    let card = undefined;
    for (let i = 0; i < 6; i++) card = review(card, { correct: true }, T0 + i * 40 * 86_400_000);
    expect(masteryLevel(card)).toBeGreaterThanOrEqual(3);
    expect(modoPara(k, card, v, seededRng(1))).toBe('som');
  });

  it('leitura relâmpago só com palavras cujos kana já foram vistos', () => {
    expect(palavrasLegiveis(new Set())).toEqual([]);
    const pan = new Set(kanaDaPalavra('パン').map((k) => k.id));
    expect(palavrasLegiveis(pan).map((p) => p.kana)).toEqual(['パン']);
    const p = perguntaRelampago(PALAVRAS_KATAKANA[0]!, seededRng(4));
    expect(p.opcoes[p.certa]?.texto).toBe(PALAVRAS_KATAKANA[0]!.pt);
    expect(new Set(p.opcoes.map((o) => o.texto)).size).toBe(4);
  });

  it('o som toca sozinho só onde ele é a pista (senão entregaria a resposta)', () => {
    expect(['apresenta', 'som', 'pares'].every((m) => somEhPista(m as never))).toBe(true);
    expect(['imagem-letra', 'letra-imagem', 'relampago', 'leitura'].some((m) => somEhPista(m as never))).toBe(false);
  });

  it('treino de um modo só: só perguntas daquele modo', () => {
    const d = deps();
    for (const k of KANA_IMAGENS.filter((x) => x.escrita === 'katakana' && x.grupo === 'basico')) d.cards[k.carta] = review(undefined, { correct: true }, T0);
    d.save.abertos = LOTES.length;
    expect(Rodada.modosDisponiveis(d.cards).has('relampago')).toBe(true);
    for (const modo of ['letra-imagem', 'pares', 'relampago'] as const) {
      const r = new Rodada({ ...d, rng: seededRng(7) }, modo);
      expect(r.fila.length).toBeGreaterThan(0);
      for (const p of r.fila) expect(p.modo, modo).toBe(modo);
    }
  });

  it('save novo: só o modo de aprender está disponível', () => {
    expect([...Rodada.modosDisponiveis({})]).toEqual(['apresenta']);
  });
});

describe('teste de entrada', () => {
  it('quem já lê tudo passa por todos os blocos, e tudo vira revisão sem apresentação', () => {
    const d = deps();
    const t = new TesteEntrada(d);
    let res = null;
    for (let n = 0; n < 200 && !res; n++) {
      t.responder(t.atual.certa);
      res = t.seguir();
    }
    expect(res?.sabe).toHaveLength(BLOCOS.length);
    expect(res?.comeca).toBeNull();
    expect(d.save.abertos).toBe(LOTES.length);
    expect(d.save.teste).toBe(true);
    expect(KANA_IMAGENS.every((k) => d.cards[k.carta])).toBe(true);
    expect(new Rodada(d).fila.some((p) => p.modo === 'apresenta')).toBe(false);
  });

  it('quem não sabe para no primeiro bloco, em quatro perguntas, e nada conta como sabido', () => {
    const d = deps();
    const t = new TesteEntrada(d);
    let res = null;
    let n = 0;
    for (; n < 20 && !res; n++) {
      t.responder((t.atual.certa + 1) % t.atual.opcoes.length);
      res = t.seguir();
    }
    expect(n).toBe(4);
    expect(res).toEqual({ sabe: [], comeca: 'Hiragana' });
    expect(d.save.abertos).toBe(1);
  });

  it('Esc no meio vale o que já passou', () => {
    const d = deps();
    const t = new TesteEntrada(d);
    for (let n = 0; n < 4; n++) {
      t.responder(t.atual.certa);
      t.seguir();
    }
    expect(t.parar()).toEqual({ sabe: ['Hiragana'], comeca: 'Hiragana com tenten e maru' });
    expect(d.save.abertos).toBe(LOTES.findIndex((l) => l.id === 'hd1') + 1);
  });

  it('o teste pergunta a leitura com quatro romaji diferentes', () => {
    const t = new TesteEntrada(deps());
    const p = t.atual;
    expect(p.modo).toBe('leitura');
    expect(new Set(p.opcoes.map((o) => o.texto)).size).toBe(4);
    expect(p.opcoes[p.certa]?.texto).toBe(p.alvo?.romaji);
  });
});
