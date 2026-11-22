import { describe, expect, it } from 'vitest';
import { cardKey, WORDS } from '../src/content';
import { foiApresentado } from '../src/core/ensino';
import { DAILY_WORDS, findWord } from '../src/content/vida';
import { isKana } from '../src/core/kana';
import { emptySave } from '../src/core/save';
import { DAY, review, State, type CardState, newCard } from '../src/core/srs';
import { SCENES, SPEAKERS } from '../src/games/aventura/cenas';
import {
  COINS_FIRST_TIME,
  COINS_SCENE,
  diaryEntries,
  emptyAventuraSave,
  END,
  ensureAventuraSave,
  helpLevel,
  isUnlocked,
  lineView,
  parseLine,
  plainText,
  ScenePlay,
  sceneWords,
  suggestScene,
  validateScenes,
  type PlayEvent,
  type Result,
  type Scene,
} from '../src/games/aventura/engine';

const T0 = new Date('2026-11-16T12:00:00').getTime();
const key = (jp: string) => cardKey(`w:${jp}`, 'meaning');

/**
 * Uma passada pela cena. `ver`: a apresentação das palavras novas já foi vista, como na tela.
 * `firmes`: palavras (jp) que já estão em cobrança antes da cena começar.
 */
function setup(scene: Scene = SCENES[0] as Scene, ver = true, firmes: readonly string[] = []) {
  const data = emptySave(T0);
  for (const jp of firmes) data.cards[key(jp)] = firm();
  const save = emptyAventuraSave();
  let t = T0;
  const deps = { cards: data.cards, profile: data.profile, save, lookup: findWord, now: () => t };
  const play = new ScenePlay(scene, deps);
  if (ver) play.apresentou();
  return { data, save, play, deps, tick: (ms: number) => (t += ms) };
}

/** Carta já em revisão, vista pela última vez dez dias antes de T0. */
function firm(): CardState {
  let card = review(newCard(0), { correct: true }, T0 - 10 * DAY);
  while (card.state !== State.Review) card = review(card, { correct: true }, card.due);
  return card;
}

/** Segue a cena até a próxima escolha (ou até o fim). */
function toChoice(play: ScenePlay): PlayEvent[] {
  const events: PlayEvent[] = [];
  for (let i = 0; i < 200 && !play.finished && !play.awaitingChoice; i++) events.push(...play.advance());
  return events;
}

function pick(play: ScenePlay, r: Result): PlayEvent[] {
  const index = play.shown.options.findIndex((o) => o.r === r && !o.tried);
  if (index < 0) throw new Error(`sem opção "${r}" em ${play.nodeId}`);
  return play.choose(index);
}

/** Joga a cena inteira escolhendo sempre o que faz a conversa andar. */
function playThrough(play: ScenePlay): PlayEvent[] {
  const events: PlayEvent[] = [];
  play.apresentou();
  for (let i = 0; i < 400 && !play.finished; i++) {
    events.push(...toChoice(play));
    if (play.awaitingChoice) events.push(...pick(play, 'ok'));
  }
  return events;
}

/** Cena mínima para testar regras sem depender do texto da história. */
const MINI: Scene = {
  id: 'mini',
  title: 'Mini',
  jp: 'ミニ',
  place: 'Teste',
  start: 'a',
  nodes: {
    a: { kind: 'fala', who: 'fiscal', jp: '[こんにちは||=]。', pt: 'Olá.', next: 'b' },
    b: {
      kind: 'escolha',
      who: 'fiscal',
      jp: '[どこ||=][から||=] [きました||来る]か。',
      pt: 'De onde você veio?',
      options: [
        { jp: '[ブラジル||=][から||=] [きました||来る]。', pt: 'Vim do Brasil.', r: 'ok', next: END },
        { jp: '[ブラジル||=]です。', pt: 'É o Brasil.', r: 'odd', next: 'c' },
        { jp: '[すみません||=]。', pt: 'Desculpe.', r: 'again', next: 'c' },
      ],
    },
    c: { kind: 'fala', who: 'fiscal', jp: 'え？', pt: 'Hã?', next: 'b' },
  },
};

describe('dados das cenas', () => {
  it('as cenas passam na conferência: toda escolha leva a algum lugar, toda leitura é kana, nenhuma cena sem saída', () => {
    expect(validateScenes(SCENES, SPEAKERS, findWord)).toEqual([]);
  });

  it('existem pelo menos três cenas, e cada uma tem escolhas e falas com áudio', () => {
    expect(SCENES.length).toBeGreaterThanOrEqual(3);
    for (const scene of SCENES) {
      const nodes = Object.values(scene.nodes);
      expect(nodes.filter((n) => n.kind === 'escolha').length).toBeGreaterThanOrEqual(3);
      expect(nodes.filter((n) => n.kind === 'fala').length).toBeGreaterThanOrEqual(5);
    }
  });

  it('toda cena dá para jogar do começo ao fim só com respostas entendidas', () => {
    for (const scene of SCENES) {
      const { play } = setup(scene);
      const events = playThrough(play);
      expect(play.finished, scene.id).toBe(true);
      expect(events.at(-1)?.t).toBe('end');
    }
  });

  it('toda opção de toda escolha pode ser escolhida e a cena ainda chega ao fim', () => {
    for (const scene of SCENES) {
      for (const [id, node] of Object.entries(scene.nodes)) {
        if (node.kind !== 'escolha') continue;
        node.options.forEach((_, index) => {
          const { play } = setup(scene);
          for (let i = 0; i < 400 && !play.finished && play.nodeId !== id; i++) {
            toChoice(play);
            if (play.awaitingChoice && play.nodeId !== id) pick(play, 'ok');
          }
          expect(play.nodeId, `${scene.id}/${id}`).toBe(id);
          play.choose(index);
          playThrough(play);
          expect(play.finished, `${scene.id}/${id}/${index}`).toBe(true);
        });
      }
    }
  });

  it('a dificuldade cresce: a primeira cena é só kana e as seguintes já trazem kanji', () => {
    const kanjiIn = (scene: Scene) => {
      const text = Object.values(scene.nodes)
        .flatMap((n) => (n.kind === 'narra' ? [] : [n.jp ?? '', ...(n.kind === 'escolha' ? n.options.map((o) => o.jp) : [])]))
        .flatMap((jp) => parseLine(jp).map((t) => t.text))
        .join('');
      return new Set(text.match(/[一-鿿]/g) ?? []).size;
    };
    const counts = SCENES.map(kanjiIn);
    expect(counts[0]).toBe(0);
    for (const n of counts.slice(1)) expect(n).toBeGreaterThan(0);
  });

  it('o vocabulário do dia a dia tem leitura em kana e não repete o que já existe no conteúdo', () => {
    const existing = new Set(WORDS.map((w) => w.id));
    const ids = new Set<string>();
    for (const w of DAILY_WORDS) {
      expect(isKana(w.kana), w.jp).toBe(true);
      expect(existing.has(w.id), w.jp).toBe(false);
      expect(ids.has(w.id), w.jp).toBe(false);
      expect(w.pt.length).toBeGreaterThan(0);
      ids.add(w.id);
    }
    // Palavra que já existia continua valendo com a mesma chave dos outros jogos.
    expect(findWord('w:電車')?.kana).toBe('でんしゃ');
    expect(findWord('w:駅')?.kanji).toEqual(['駅']);
  });

  it('a conferência acusa cena quebrada', () => {
    const broken: Scene = {
      id: 'ruim',
      title: 'Ruim',
      jp: '駅',
      place: 'x',
      start: 'a',
      nodes: {
        a: { kind: 'fala', who: 'ninguem', jp: '駅は [東京|toukyou] [あれ||não-existe]です。', pt: 'x', next: 'b' },
        b: {
          kind: 'escolha',
          who: 'fiscal',
          jp: 'はい。',
          pt: 'x',
          options: [
            { jp: 'はい。', pt: 'x', r: 'odd', next: 'b' },
            { jp: 'いいえ。', pt: 'x', r: 'again', next: 'sumiu' },
          ],
        },
        solto: { kind: 'narra', pt: 'x', next: END },
      },
    };
    const text = validateScenes([broken], SPEAKERS, findWord).join('\n');
    expect(text).toContain('título em japonês precisa ser kana');
    expect(text).toContain('personagem desconhecido "ninguem"');
    expect(text).toContain('kanji sem leitura');
    expect(text).toContain('não está em kana');
    expect(text).toContain('palavra desconhecida');
    expect(text).toContain('nenhuma opção faz a conversa andar');
    expect(text).toContain('leva para "sumiu", que não existe');
    expect(text).toContain('nó solto: ninguém chega aqui');
    expect(text).toContain('nó b: sem saída até o final');
  });
});

describe('marcação das falas', () => {
  it('separa texto, leitura e palavra', () => {
    expect(parseLine('[東京|とうきょう|=][まで||=]、[きました||来る]か。[成田|なりた]')).toEqual([
      { text: '東京', reading: 'とうきょう', word: 'w:東京' },
      { text: 'まで', word: 'w:まで' },
      { text: '、' },
      { text: 'きました', word: 'w:来る' },
      { text: 'か。' },
      { text: '成田', reading: 'なりた' },
    ]);
  });

  it('o texto para a voz sai sem marcação e sem espaços', () => {
    expect(plainText(parseLine('[お水|おみず|=]は [どこ||=]ですか。'))).toBe('お水はどこですか。');
  });
});

describe('ajuda por palavra', () => {
  it('some aos poucos: nova mostra tudo, jovem mostra a leitura, firme fica limpa', () => {
    expect(helpLevel(undefined)).toBe('full');
    let card = review(newCard(0), { correct: true, hinted: true }, T0);
    expect(helpLevel(card)).toBe('reading');
    let t = T0;
    for (let i = 0; i < 12 && helpLevel(card) !== 'none'; i++) {
      t = Math.max(t + DAY, card.due);
      card = review(card, { correct: true }, t);
    }
    expect(card.state).toBe(State.Review);
    expect(helpLevel(card)).toBe('none');
    // Esqueceu: a leitura volta.
    expect(helpLevel(review(card, { correct: false }, t + DAY))).toBe('reading');
  });

  it('trecho com leitura e sem carta (preço, nome de lugar) nunca perde a leitura', () => {
    const view = lineView('[成田|なりた]です。', {}, findWord);
    expect(view[0]?.help).toBe('reading');
    expect(view[1]?.help).toBe('none');
  });

  it('a mesma fala muda de ajuda conforme a memória do jogador', () => {
    const { data } = setup();
    const markup = '[電車|でんしゃ|=]です。';
    expect(lineView(markup, data.cards, findWord)[0]?.help).toBe('full');
    data.cards[key('電車')] = review(newCard(0), { correct: true }, T0);
    expect(lineView(markup, data.cards, findWord)[0]?.help).toBe('reading');
  });
});

describe('uma cena em andamento', () => {
  it('começa na primeira linha, e Enter em cima de uma escolha não pula nada', () => {
    const { play } = setup(MINI);
    expect(play.shown.kind).toBe('fala');
    expect(play.shown.plain).toBe('こんにちは。');
    play.advance();
    expect(play.awaitingChoice).toBe(true);
    expect(play.advance()).toEqual([]);
    expect(play.nodeId).toBe('b');
    expect(play.choose(9)).toEqual([]);
  });

  it('antes da primeira fala, as palavras novas da cena são apresentadas; nada anda antes disso', () => {
    const { play, data } = setup(MINI, false);
    expect(play.apresentando).toEqual(['w:こんにちは', 'w:どこ', 'w:から', 'w:来る', 'w:ブラジル']);
    expect(play.advance()).toEqual([]);
    expect(play.awaitingChoice).toBe(false);
    expect(Object.keys(data.cards)).toHaveLength(0);
    play.apresentou();
    for (const id of ['こんにちは', 'どこ', 'から', '来る', 'ブラジル']) expect(data.cards[key(id)]?.reps, id).toBe(0);
    // Apresentada e ainda não usada: leitura e significado na tela.
    expect(play.shown.tokens[0]?.help).toBe('full');
    // Primeira passada: a palavra só foi apresentada, sem nota.
    expect(play.advance()).toEqual([]);
    expect(data.cards[key('こんにちは')]?.reps).toBe(0);
  });

  it('palavra que sobrou da apresentação aparece com glosa na fala, mas não conta como apresentada', () => {
    const { play, data } = setup(MINI, false);
    // Só a primeira foi apresentada antes; as outras só passam pela fala, com leitura e significado.
    play.apresentando = ['w:こんにちは'];
    play.apresentou();
    play.advance();
    const events = pick(play, 'ok');
    expect(events.some((e) => e.t === 'new')).toBe(true);
    // Sem carta: a Memória e o KanjiMon não podem cobrar o que só passou numa fala.
    expect(data.cards[key('どこ')]).toBeUndefined();
    expect(foiApresentado(data.cards, key('どこ'))).toBe(false);
  });

  it('entender a pergunta faz a história andar e registra as palavras ouvidas e ditas', () => {
    const { play, data, save } = setup(MINI);
    play.advance();
    const events = pick(play, 'ok');
    expect(events[0]).toEqual({ t: 'result', r: 'ok' });
    for (const jp of ['どこ', 'から', '来る', 'ブラジル']) expect(data.cards[key(jp)], jp).toBeDefined();
    // Depois de escolher, a tela mostra a fala do jogador; o Enter leva adiante.
    expect(play.shown.who).toBe('voce');
    expect(play.shown.plain).toBe('ブラジルからきました。');
    expect(play.finished).toBe(false);
    const end = play.advance();
    expect(end.at(-1)?.t).toBe('end');
    expect(save.done).toEqual(['mini']);
    expect(save.diary).toEqual(['mini/a', 'mini/b', 'mini/b/0']);
  });

  it('não entender não trava: a pessoa reage, a conversa volta e a opção fica marcada', () => {
    const { play } = setup(MINI);
    play.advance();
    expect(pick(play, 'odd')[0]).toEqual({ t: 'result', r: 'odd' });
    play.advance();
    expect(play.nodeId).toBe('c');
    expect(play.shown.plain).toBe('え？');
    play.advance();
    expect(play.nodeId).toBe('b');
    expect(play.shown.options.map((o) => o.tried)).toEqual([false, true, false]);
    expect(play.finished).toBe(false);
  });

  it('palavra nova não leva nota ruim na mesma passada, palavra já vista leva', () => {
    const fresh = setup(MINI);
    fresh.play.advance();
    pick(fresh.play, 'odd');
    expect(fresh.data.cards[key('どこ')]?.lapses).toBe(0);
    expect(fresh.data.cards[key('どこ')]?.state).toBe(State.New);

    const seen = setup(MINI, true, ['どこ']);
    seen.play.advance();
    pick(seen.play, 'odd');
    expect(seen.data.cards[key('どこ')]?.lapses).toBe(1);
    // A fala do jogador não era o problema: ブラジル só foi apresentada.
    expect(seen.data.cards[key('ブラジル')]?.reps).toBe(0);
  });

  it('pedir leitura ou significado conta como ajuda na nota', () => {
    const plain = setup(MINI, true, ['こんにちは']);
    plain.play.advance();
    const helped = setup(MINI, true, ['こんにちは']);
    helped.play.askMeaning();
    expect(helped.play.shown.meaning).toBe(true);
    helped.play.advance();
    const a = plain.data.cards[key('こんにちは')]!;
    const b = helped.data.cards[key('こんにちは')]!;
    expect(b.stability).toBeLessThan(a.stability);
    expect(b.lapses).toBe(0);
  });

  it('resposta rápida dá bônus e resposta lenta não pune', () => {
    const run = (ms: number) => {
      const s = setup(MINI, true, ['どこ', 'から', '来る', 'ブラジル', 'こんにちは']);
      s.play.advance();
      s.tick(ms);
      pick(s.play, 'ok');
      return s.data.cards[key('どこ')]!;
    };
    const fast = run(1500);
    const slow = run(60_000);
    expect(fast.stability).toBeGreaterThan(slow.stability);
    expect(slow.lapses).toBe(0);
    expect(slow.stability).toBeGreaterThan(firm().stability);
  });

  it('cada palavra ganha no máximo uma nota boa por passada', () => {
    const { play, data } = setup(MINI);
    play.advance();
    pick(play, 'again');
    play.advance();
    play.advance();
    const before = data.cards[key('どこ')]?.reps;
    pick(play, 'ok');
    expect(data.cards[key('どこ')]?.reps).toBe(before);
  });

  it('o fim da cena é um ponto de parada com resumo, XP e moedas', () => {
    const { play, data, save } = setup(MINI);
    const events = playThrough(play);
    const end = events.at(-1);
    if (end?.t !== 'end') throw new Error('sem resumo');
    expect(end.summary.firstTime).toBe(true);
    expect(end.summary.choices).toBe(1);
    expect(end.summary.firstTry).toBe(1);
    expect(end.summary.lines).toBe(3);
    expect(end.summary.newWords.map((w) => w.jp)).toEqual(['こんにちは', 'どこ', 'から', '来る', 'ブラジル']);
    expect(data.profile.coins).toBe(COINS_SCENE + COINS_FIRST_TIME);
    expect(data.profile.xp).toBe(end.summary.xp);
    expect(play.advance()).toEqual([]);

    // Reviver a cena não paga o bônus de primeira vez nem duplica o diário.
    const again = new ScenePlay(MINI, { cards: data.cards, profile: data.profile, save, lookup: findWord, now: () => T0 + DAY });
    const second = playThrough(again).at(-1);
    if (second?.t !== 'end') throw new Error('sem resumo');
    expect(second.summary.firstTime).toBe(false);
    expect(second.summary.coins).toBe(COINS_SCENE);
    // Só a palavra que ficou de fora da primeira apresentação (máximo de 5) é nova agora.
    expect(second.summary.newWords.map((w) => w.jp)).toEqual(['すみません']);
    expect(save.done).toEqual(['mini']);
    expect(save.diary).toHaveLength(3);
    expect(save.plays).toBe(2);
  });

  it('conversa que travou não conta como entendida de primeira', () => {
    const { play } = setup(MINI);
    play.advance();
    pick(play, 'odd');
    const end = playThrough(play).at(-1);
    if (end?.t !== 'end') throw new Error('sem resumo');
    expect(end.summary.firstTry).toBe(0);
    expect(end.summary.choices).toBe(1);
  });

  it('subir de nível avisa', () => {
    const { play, data } = setup(MINI);
    data.profile.xp = 99;
    expect(playThrough(play).some((e) => e.t === 'levelup')).toBe(true);
  });
});

describe('progresso entre cenas', () => {
  it('as cenas abrem em ordem e o Enter leva para a próxima da história', () => {
    const { save, data } = setup();
    expect(SCENES.map((_, i) => isUnlocked(SCENES, save, i))).toEqual([true, false, false]);
    expect(suggestScene(SCENES, save, data.cards, T0)?.id).toBe('aeroporto');
    save.done.push('aeroporto');
    expect(isUnlocked(SCENES, save, 1)).toBe(true);
    expect(isUnlocked(SCENES, save, 2)).toBe(false);
    expect(suggestScene(SCENES, save, data.cards, T0)?.id).toBe('estacao');
  });

  it('número de cena que não existe nunca conta como aberta', () => {
    // Com a última cena concluída, "a cena depois da última" passava por aberta (a tela só não quebrava por sorte).
    const { save } = setup();
    for (const s of SCENES) save.done.push(s.id);
    expect(isUnlocked(SCENES, save, SCENES.length)).toBe(false);
    expect(isUnlocked(SCENES, save, -1)).toBe(false);
  });

  it('com tudo concluído, sugere reviver a cena mais perto de ser esquecida', () => {
    const { data, save, deps } = setup();
    let t = T0;
    for (const scene of SCENES) {
      playThrough(new ScenePlay(scene, { ...deps, now: () => t }));
      t += 60_000;
    }
    expect(save.done).toEqual(SCENES.map((s) => s.id));
    // As palavras do konbini foram esquecidas; as outras estão em dia.
    const later = t + 40 * DAY;
    const shared = new Set([...sceneWords(SCENES[0] as Scene), ...sceneWords(SCENES[1] as Scene)]);
    for (const id of shared) {
      data.cards[cardKey(id, 'meaning')] = { ...firm(), stability: 30, last_review: later, due: later + 30 * DAY };
    }
    expect(suggestScene(SCENES, save, data.cards, later)?.id).toBe('konbini');
  });

  it('o diário guarda as falas vividas na ordem, com quem falou e a tradução', () => {
    const { play, data, save } = setup();
    playThrough(play);
    const entries = diaryEntries(SCENES, save, data.cards, findWord);
    expect(entries.length).toBe(save.diary.length);
    expect(entries[0]).toMatchObject({ who: 'fiscal', plain: 'つぎのかた、どうぞ。', pt: 'Próximo, por favor.' });
    expect(entries.some((e) => e.who === 'voce' && e.plain === 'ブラジルからきました。')).toBe(true);
    // Referência de uma cena que mudou ou sumiu não quebra o diário.
    save.diary.push('aeroporto/nao-existe', 'sumiu/a', 'aeroporto/passaporte/9');
    expect(diaryEntries(SCENES, save, data.cards, findWord).length).toBe(entries.length);
  });
});

describe('save da aventura', () => {
  it('devolve sempre o mesmo objeto e conserta o que vier estragado', () => {
    const games: Record<string, unknown> = {};
    const save = ensureAventuraSave(games);
    expect(save).toEqual(emptyAventuraSave());
    save.done.push('aeroporto');
    expect(ensureAventuraSave(games)).toBe(save);
    expect(ensureAventuraSave(games).done).toEqual(['aeroporto']);

    const broken: Record<string, unknown> = { aventura: { done: 'x', diary: ['a/b', 3, 'a/b'], plays: 'muitas' } };
    expect(ensureAventuraSave(broken)).toEqual({ done: [], diary: ['a/b'], plays: 0 });
    expect(ensureAventuraSave({ aventura: [] })).toEqual(emptyAventuraSave());
  });
});
