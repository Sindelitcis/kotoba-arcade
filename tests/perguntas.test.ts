import { describe, expect, it } from 'vitest';
import { KANJI } from '../src/content';
import { kanjiMeaningQuestion, kanjiRecallQuestion } from '../src/core/questions';
import { seededRng } from '../src/core/rng';

describe('alternativas sem segunda resposta certa', () => {
  it('"Qual é o kanji?" não oferece outro kanji que também quer dizer aquilo', () => {
    // 天 e 空 querem dizer "céu"; a pergunta "céu → kanji" punha os dois e só aceitava 天.
    for (const k of KANJI) {
      for (let seed = 0; seed < 30; seed++) {
        const q = kanjiRecallQuestion(k, seededRng(seed));
        const outras = q.choices.filter((c) => c !== q.answer);
        for (const c of outras) {
          const dono = KANJI.find((o) => o.kanji === c);
          expect(dono?.pt, `${k.kanji}: ${q.prompt} também é ${c}`).not.toContain(q.prompt);
        }
      }
    }
  });

  it('"O que significa?" não oferece outro significado do mesmo kanji', () => {
    for (const k of KANJI) {
      for (let seed = 0; seed < 30; seed++) {
        const q = kanjiMeaningQuestion(k, seededRng(seed), false);
        const outras = q.choices.filter((c) => c !== q.answer);
        for (const c of outras) expect(k.pt, `${k.kanji} também significa ${c}`).not.toContain(c);
      }
    }
  });
});
