/**
 * Furigana só em cima de kanji. これは傘です。 com a leitura これはかさです。 vira
 * これは + 傘(かさ) + です。: o kana já está escrito, então não ganha leitura em cima.
 */
import { hasKanji } from './kana';

export interface Parte {
  t: string;
  /** Leitura, só nos pedaços com kanji. */
  r?: string;
}

const KANJI = /[一-鿿々〆ヶ]/;

/** Katakana e hiragana contam como o mesmo som na hora de alinhar. */
const igualar = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Divide o texto em pedaços de kanji (com leitura) e de kana (sem leitura), alinhando pela
 * leitura inteira. Se não der para alinhar (leitura que não bate com o kana escrito), devolve
 * o texto inteiro com a leitura inteira, como antes.
 */
export function partesFurigana(texto: string, leitura: string | undefined): Parte[] {
  if (!leitura || !hasKanji(texto) || leitura === texto) return [{ t: texto }];
  const blocos: { t: string; kanji: boolean }[] = [];
  for (const c of texto) {
    const k = KANJI.test(c);
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && ultimo.kanji === k) ultimo.t += c;
    else blocos.push({ t: c, kanji: k });
  }
  const molde = new RegExp(`^${blocos.map((b) => (b.kanji ? '(.+?)' : `(${escapar(igualar(b.t))})`)).join('')}$`, 'u');
  const m = molde.exec(igualar(leitura));
  if (!m) return [{ t: texto, r: leitura }];
  // A leitura original (não a igualada), cortada nas mesmas posições.
  let pos = 0;
  const pedacos = m.slice(1).map((g) => {
    const p = leitura.slice(pos, pos + (g as string).length);
    pos += (g as string).length;
    return p;
  });
  return blocos.map((b, i) => (b.kanji ? { t: b.t, r: pedacos[i] } : { t: b.t }));
}

export function Furigana({ texto, leitura }: { texto: string; leitura?: string }) {
  return (
    <>
      {partesFurigana(texto, leitura).map((p, i) =>
        p.r ? (
          <ruby key={i}>
            {p.t}
            <rt>{p.r}</rt>
          </ruby>
        ) : (
          p.t
        ),
      )}
    </>
  );
}
