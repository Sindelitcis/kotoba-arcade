/**
 * A figura de uma palavra do curso, quando o site já tem uma (src/content/imagens.ts, as mesmas
 * da Memória e da Cena Viva). Vale a mesma escrita, ou o mesmo kana com o mesmo sentido: o kana
 * sozinho erraria (あめ é chuva no curso e bala na figura de 飴).
 */
import type { Palavra } from '../content/curso';
import { FIGURAS, type Figura } from '../content/imagens';

/** O primeiro sentido, sem detalhe: "chá (verde)" → "chá", "ouvir; perguntar" → "ouvir". */
export const primeiroSentido = (pt: string): string => (pt.split(/[,;/(]/)[0] ?? '').trim().toLowerCase();

const mesmoSentido = (a: string, b: string) => {
  const [x, y] = [primeiroSentido(a), primeiroSentido(b)];
  return x.length > 0 && y.length > 0 && (x.startsWith(y) || y.startsWith(x));
};

/** A figura da palavra; `existe` diz se a imagem está no site (o padrão aceita qualquer uma). */
export function figuraDoCurso(p: Pick<Palavra, 'jp' | 'kana' | 'pt'>, existe: (img: string) => boolean = () => true): Figura | undefined {
  return (
    FIGURAS.find((f) => f.word.jp === p.jp && existe(f.img)) ??
    FIGURAS.find((f) => f.word.kana === p.kana && mesmoSentido(f.word.pt, p.pt) && existe(f.img))
  );
}
