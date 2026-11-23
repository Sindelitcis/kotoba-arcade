import { describe, expect, it } from 'vitest';
import { palavrasDa, UNIDADES } from '../src/content/curso';
import { figuraDoCurso, primeiroSentido } from '../src/curso/figura';
import { temFigura } from '../src/core/figuras';

const palavra = (jp: string) => UNIDADES.flatMap(palavrasDa).find((p) => p.jp === jp)!;

describe('figura no cartão de vocabulário', () => {
  it('acha pela escrita, ou pelo kana com o mesmo sentido', () => {
    expect(figuraDoCurso(palavra('学生'))?.img).toBe('gakusei');
    expect(figuraDoCurso(palavra('ねこ'))?.word.jp).toBe('猫');
    expect(figuraDoCurso(palavra('おちゃ'))?.img).toBe('ocha');
  });

  // あめ é chuva no curso; a figura de あめ no site é 飴, bala.
  it('o mesmo kana com outro sentido não vira figura', () => {
    expect(figuraDoCurso(palavra('雨'))).toBeUndefined();
  });

  it('o primeiro sentido tira o detalhe', () => {
    expect(primeiroSentido('chá (verde)')).toBe('chá');
    expect(primeiroSentido('ouvir; perguntar')).toBe('ouvir');
    expect(primeiroSentido('bolsa, mochila')).toBe('bolsa');
  });

  it('boa parte do vocabulário concreto do A1 tem figura, e toda figura achada existe no site', () => {
    const achadas = UNIDADES.flatMap(palavrasDa).map((p) => figuraDoCurso(p, temFigura)).filter(Boolean);
    expect(achadas.length).toBeGreaterThanOrEqual(45);
    for (const f of achadas) expect(temFigura(f!.img), f!.img).toBe(true);
  });
});
