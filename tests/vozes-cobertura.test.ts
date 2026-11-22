/**
 * Cada lugar que fala japonês acha um áudio gravado. O `vozes.test.ts` confere a lista de
 * `scripts/falas.ts`; aqui o teste parte dos jogos: das chamadas de `speak()` no código e
 * do que cada uma pode receber de verdade.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KANA, KANJI, WORDS } from '../src/content';
import { DAILY_WORDS, findWord } from '../src/content/vida';
import { listarFalas } from '../scripts/falas';
import type { Manifesto } from '../src/core/audio';
import { seededRng } from '../src/core/rng';
import { emptySave } from '../src/core/save';
import { DAY, review, newCard } from '../src/core/srs';
import { VOZ_PADRAO, VOZ_PALAVRA } from '../src/core/vozes';
import { CENAS } from '../src/games/conversa/engine';
import { cardOf, emptyGramaticaSave, exampleView, fits, GramaticaRound, plainSentence } from '../src/games/gramatica/engine';
import { COURSE } from '../src/games/gramatica/pontos';
import { FIGURAS } from '../src/content/imagens';
import { ETAPAS, falaDaTarefa, falaDoNome, nomeDe, tarefas } from '../src/games/cena/engine';
import { LUGARES } from '../src/games/cena/lugares';

const T0 = new Date('2026-11-19T12:00:00').getTime();
const RAIZ = join(__dirname, '..');
const manifesto = JSON.parse(readFileSync(join(RAIZ, 'public/vozes/manifesto.json'), 'utf8')) as Manifesto;
const gravada = (texto: string, voz: string) => !!manifesto.falas[texto]?.[voz as keyof Manifesto['falas'][string]];

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivos(join(dir, e.name)) : [join(dir, e.name)]));
}

/**
 * Toda chamada de fala do código, e de onde vem o texto dela. Chamada nova faz este teste
 * falhar: ponha a fonte do texto em `scripts/falas.ts`, rode `npm run vozes` e acrescente aqui.
 */
// Fora daqui: core/sequencia.ts, que toca o que as aulas, a Jornada e o Kumitate montam em trechos. O
// japonês desses trechos está em scripts/falas.ts (aulas(), jornada(), kumitate()), e vozes.test.ts confere.
const CHAMADAS: Record<string, string[]> = {
  'src/games/aventura/AventuraGame.tsx': [
    'speak(shown.plain, vozDaAventura(shown.who))', // falas das cenas (a narração vai em português, por tocarSequencia)
    'speak(entry.plain, vozDaAventura(entry.who))', // diário: as mesmas falas
    'speak(entry.plain, vozDaAventura(entry.who))',
    'speakWord(w.kana)', // glossário do resumo: palavras do conteúdo
  ],
  'src/games/cena/CenaGame.tsx': [
    'speakWord(f.texto)', // nome da coisa clicada: falaDoNome, palavra das figuras
    'speak(f.texto)', // pessoa (読んでいる人): cena() em scripts/falas.ts
    'speak(textoDe(t.pecas.certas))', // frase de "descrever" pronta
    'speak(textoDe(t.segs))', // etapa "nome": a resposta inteira (これは傘です), de falaDoNome em scripts/falas.ts
    'speak(fala)', // pedido lido sozinho: falaDaTarefa
    'speak(fala)', // tecla R: falaDaTarefa, inclusive pela metade
    'speak(fala)', // botão de ouvir de novo: falaDaTarefa
    'speak(fala)', // a apresentação "de novo" fechou: repete o pedido (falaDaTarefa)
  ],
  'src/games/conversa/ConversaGame.tsx': [
    'speak(linha.jp, VOZ_CONVERSA[cena.personagem.voz])', // abertura gravada; resposta do modelo vem do servidor local
    'speakWord(t.kana)', // palavras novas do resumo
  ],
  'src/games/gramatica/GramaticaGame.tsx': [
    'speak(e.plain)', // frase montada
    'speak(plainSentence(r.puzzle))', // tecla R com a frase pela metade (a lição vai por licaoFalada e tocarSequencia)
  ],
  'src/games/kanabeat/KanaBeatGame.tsx': ['speakWord(e.note.kana)', 'speakWord(n.kana)'],
  // Letras, exemplos e palavras do Kana em imagens: tudo passa por ouvir() (tests/kanaimagens.test.ts confere).
  'src/games/kanaimagens/KanaImagensGame.tsx': ['speakWord(texto)'],
  'src/games/kanjimon/Booster.tsx': ['speakKanji(card.kanji.kanji, card.kanji.reading)'], // kanji sozinho
  'src/games/kanjimon/Dex.tsx': ['speakKanji(open.kanji, open.reading)', 'speakWord(w.kana)', 'speak(s.jp)'],
  'src/games/kanjimon/KanjiMonGame.tsx': ['speak(asked.speak, VOZ_PALAVRA, asked.speakKana)'], // kanji sozinho ou palavra
  // Kanji em peças: kanji sozinho e palavra de exemplo, os dois de KANJI_PECAS (scripts/falas.ts, origem pecas/).
  'src/games/pecas/PecasGame.tsx': ['speak(p.jp, VOZ_PALAVRA, p.kana)', 'speakKanji(k.kanji, leituraOficial(k))'],
  'src/games/memoria/MemoriaGame.tsx': [
    'speakWord(e.fala)', // carta de palavra aberta
    'speakWord(e.figura.word.kana)', // par feito
    'speakWord(ultimaFala.current)', // tecla R
  ],
  'src/games/roguelike/RoguelikeGame.tsx': ['speak(q.speak, VOZ_PALAVRA, q.speakKana)'],
  'src/hub/Hub.tsx': ['speak(sentence.jp)'],
};

/** Pega `speak(...)`, `speakWord(...)` e `speakKanji(...)` com os parênteses balanceados. */
function chamadas(fonte: string): string[] {
  const out: string[] = [];
  for (const m of fonte.matchAll(/\bspeak(Word|Kanji)?\(/g)) {
    let fundo = 0;
    let i = m.index;
    for (; i < fonte.length; i++) {
      if (fonte[i] === '(') fundo++;
      else if (fonte[i] === ')' && --fundo === 0) break;
    }
    out.push(fonte.slice(m.index, i + 1));
  }
  return out;
}

describe('cobertura das vozes a partir dos jogos', () => {
  it('toda chamada de speak() no código tem a fonte do texto gravada', () => {
    const achadas: Record<string, string[]> = {};
    for (const f of arquivos(join(RAIZ, 'src')).filter((f) => /\.tsx?$/.test(f) && !f.endsWith(join('core', 'audio.ts')) && !f.endsWith(join('core', 'sequencia.ts')))) {
      const c = chamadas(readFileSync(f, 'utf8'));
      if (c.length) achadas[relative(RAIZ, f).replaceAll('\\', '/')] = c.sort();
    }
    expect(achadas).toEqual(Object.fromEntries(Object.entries(CHAMADAS).map(([f, c]) => [f, [...c].sort()])));
  });

  it('palavras e kana (KanjiMon, Kotodama, Kana Beat, Dex, glossário da Aventura) estão na voz de palavra', () => {
    const textos = [
      ...[...WORDS, ...DAILY_WORDS].map((w) => w.kana),
      ...KANJI.flatMap((k) => k.words.map((w) => w.kana)),
      // Kana Beat: kana soltos e as palavras do KanjiMon.
      ...KANA.flatMap((k) => [k.hira, k.kata]),
    ];
    expect([...new Set(textos)].filter((t) => !gravada(t, VOZ_PALAVRA))).toEqual([]);
    expect(findWord(WORDS[0]!.id)).toBeDefined();
  });

  it('cada kanji sozinho (carta do KanjiMon, Kotodama, booster, Dex) tem a leitura gravada na voz de palavra', () => {
    expect(KANJI.map((k) => k.kanji).filter((t) => !gravada(t, VOZ_PALAVRA))).toEqual([]);
  });

  it('palavras novas da Conversa estão na voz de palavra', () => {
    const faltam = CENAS.flatMap((c) => c.vocabulario).filter((t) => !gravada(t.kana, VOZ_PALAVRA)).map((t) => t.jp);
    expect(faltam).toEqual([]);
  });

  it('frases do Dex e do fliperama estão na voz padrão', () => {
    const faltam = KANJI.flatMap((k) => k.sentences.map((s) => s.jp)).filter((t) => !gravada(t, VOZ_PADRAO));
    expect(faltam).toEqual([]);
  });

  it('no Kumitate, tudo que a rodada fala tem áudio: lição, frase pela metade (tecla R) e frase pronta', () => {
    const faltam = new Set<string>();
    const ouvidas = new Set<string>();
    const ouvir = (t: string) => {
      ouvidas.add(t);
      if (!gravada(t, VOZ_PADRAO)) faltam.add(t);
    };
    for (let seed = 1; seed <= 80; seed++) {
      const rng = seededRng(seed);
      const data = emptySave(T0);
      const save = emptyGramaticaSave();
      save.unlocked = 1 + Math.floor(rng() * COURSE.points.length);
      // Pontos já vistos mudam quais buracos abrem.
      for (const p of COURSE.points) if (rng() < 0.5) data.cards[cardOf(p.id)] = review(newCard(0), { correct: true }, T0 - DAY);
      const round = new GramaticaRound({ course: COURSE, cards: data.cards, profile: data.profile, save, lookup: findWord, now: () => T0, rng });
      for (let frase = 0; frase < 6 && round.phase !== 'end'; frase++) {
        if (round.phase === 'lesson') {
          ouvir(exampleView(COURSE, round.puzzle.point).map((w) => w.text + w.tail).join(''));
          round.begin();
        }
        while (round.phase === 'build') {
          ouvir(plainSentence(round.puzzle));
          const slot = round.activeSlot!;
          const certas = slot.tray.filter((b) => fits(slot.role, b));
          for (const e of round.place(certas[Math.floor(rng() * certas.length)]!)) if (e.t === 'solved') ouvir(e.plain);
        }
        round.next();
      }
    }
    expect([...faltam]).toEqual([]);
    // A simulação passou mesmo por frases pela metade, e não só pelas prontas.
    const prontas = new Set(listarFalas().filter((f) => f.origem.startsWith('kumitate') && !f.origem.endsWith('/metade')).map((f) => f.texto));
    expect([...ouvidas].filter((t) => !prontas.has(t)).length).toBeGreaterThan(30);
  });

  it('Memória: o nome de cada figura está na voz de palavra', () => {
    expect([...new Set(FIGURAS.map((f) => f.word.kana))].filter((t) => !gravada(t, VOZ_PALAVRA))).toEqual([]);
  });

  it('Cena Viva: todo pedido, toda frase pela metade e todo nome de coisa têm áudio', () => {
    const faltam = new Set<string>();
    for (const l of LUGARES) {
      for (const e of ETAPAS) {
        for (const t of tarefas(l, e)) {
          for (let m = 0; m <= (t.pecas?.certas.length ?? 0); m++) {
            const fala = falaDaTarefa(t, m);
            if (fala && !gravada(fala, VOZ_PADRAO)) faltam.add(fala);
          }
        }
      }
      for (const c of l.coisas) {
        const f = falaDoNome(nomeDe(c));
        if (!gravada(f.texto, f.palavra ? VOZ_PALAVRA : VOZ_PADRAO)) faltam.add(f.texto);
      }
    }
    expect([...faltam]).toEqual([]);
  });
});
