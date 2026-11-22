/**
 * Ajudas dos testes de ponta a ponta para o fluxo de ensino: todo jogo apresenta a coisa nova
 * antes de perguntar (core/Apresentacao.tsx), pratica com apoio e só depois cobra.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';
import { KANA_TABLE } from '../src/core/kana';

const SAVE_KEY = 'kotoba-arcade:save';
/** A versão do save, lida do código (save.ts usa import.meta.env e não abre fora do Vite). */
const SAVE_VERSION = Number(/export const SAVE_VERSION = (\d+);/.exec(readFileSync(join(process.cwd(), 'src', 'core', 'save.ts'), 'utf8'))?.[1]);
const DIA = 86_400_000;

/**
 * Espera a apresentação de coisa nova e passa por ela só no teclado (Enter em cada item).
 * Passa só por esta apresentação, mesmo que outra (a lição da etapa, por exemplo) venha logo
 * depois. Devolve quantos itens ela tinha.
 */
export async function passarApresentacao(page: Page): Promise<number> {
  const cartao = page.getByTestId('apresentacao');
  await expect(cartao).toBeVisible();
  const total = Number(await cartao.getAttribute('data-total'));
  const inicio = Number(await cartao.getAttribute('data-i'));
  for (let n = inicio; n < total; n++) {
    const antes = `${await cartao.getAttribute('data-item')}|${n}`;
    await page.keyboard.press('Enter');
    // O cartão troca de item ou some (ou vira outra apresentação): espera antes da próxima tecla.
    await expect(async () => {
      if (!(await cartao.isVisible())) return;
      expect(`${await cartao.getAttribute('data-item')}|${await cartao.getAttribute('data-i')}`).not.toBe(antes);
    }).toPass({ timeout: 3000 });
  }
  return total;
}

/** Se houver apresentação na tela agora, passa por ela; senão, não faz nada. */
export async function seApresentar(page: Page): Promise<number> {
  await page.waitForTimeout(150);
  if (!(await page.getByTestId('apresentacao').isVisible())) return 0;
  return passarApresentacao(page);
}

/**
 * Deixa as cartas pedidas firmes (em cobrança, sem vencer), como de quem já estudou.
 * Precisa de uma página já aberta no site (sem save ainda, começa um novo); recarrega no fim.
 * Estabilidade 2,5: em Review (cobrança), mas no nível 2 de domínio, abaixo do 3, em que o KanjiMon
 * passa a pedir a leitura digitada. Com 60, a caçada às vezes pedia para digitar e o teste que só
 * clica nas opções ficava parado até estourar o tempo.
 */
export async function firmarCartas(page: Page, chaves: readonly string[]): Promise<void> {
  await page.evaluate(
    ({ chaves, chave, dia, vazio }) => {
      const agora = Date.now();
      const texto = localStorage.getItem(chave);
      const save = JSON.parse(texto ?? vazio);
      for (const k of chaves) {
        save.cards[k] = {
          due: agora + 30 * dia,
          stability: 2.5,
          difficulty: 5,
          elapsed_days: 2,
          scheduled_days: 30,
          learning_steps: 0,
          reps: 6,
          lapses: 0,
          state: 2,
          last_review: agora - 2 * dia,
        };
      }
      localStorage.setItem(chave, JSON.stringify(save));
    },
    { chaves: [...chaves], chave: SAVE_KEY, dia: DIA, vazio: JSON.stringify({ v: SAVE_VERSION, cards: {}, games: {} }) },
  );
  await page.reload();
}

/** Cartas de todos os kanji e palavras do KanjiMon (o mesmo conteúdo do Kotodama), lidas do arquivo de dados. */
export function chavesDosKanji(): string[] {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'src', 'content', 'data', 'kanjimon.raw.json'), 'utf8')) as {
    kanji: string;
    words: { jp: string }[];
  }[];
  return raw.flatMap((k) => [`k:${k.kanji}#meaning`, `k:${k.kanji}#recall`, ...k.words.flatMap((w) => [`w:${w.jp}#meaning`, `w:${w.jp}#reading`])]);
}

/** Cartas de leitura de todos os kana, em hiragana e katakana (as do Kana Beat). */
export function chavesDosKana(): string[] {
  return KANA_TABLE.flatMap((k) => [`a:${k.hira}#reading`, `ak:${k.kata}#reading`]);
}
