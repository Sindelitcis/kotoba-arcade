/**
 * Furigana só em cima de kanji. これは傘です。 com a leitura これはかさです。 vira
 * これは + 傘(かさ) + です。: o kana já está escrito, então não ganha leitura em cima.
 *
 * Todo japonês com kanji na tela passa por aqui. A leitura de cada pedaço vem dos dados
 * versionados (`leitura-jp.ts`) ou, fora deles, da `leitura` dada; sem nenhuma, o console
 * avisa e o e2e falha.
 * Nos Ajustes dá para esconder a leitura dos kanji que você já lê (carta de leitura firme).
 */
import { cardKey } from '../content';
import { app } from './app';
import { avisarSemLeitura, dividirMisto, FORMAS_SEM_LEITURA, partesDe } from './leitura-jp';
import { isKnown } from './srs';

export { partesFurigana, type Parte } from './leitura-jp';

const KANJI = /[一-鿿々〆ヶ]/;

/** O kanji cuja leitura já está firme na memória (aguenta uma semana sem revisar). */
function jaLe(trecho: string): boolean {
  const ks = [...trecho].filter((c) => KANJI.test(c));
  return ks.length > 0 && ks.every((c) => isKnown(app.data.cards[cardKey(`k:${c}`, 'reading')]));
}

export function Furigana({ texto, leitura }: { texto: string; leitura?: string }) {
  const partes = partesDe(texto, leitura);
  if (partes.some((p) => !p.r && KANJI.test(p.t)) && !FORMAS_SEM_LEITURA.has(texto)) avisarSemLeitura(texto);
  const esconder = app.data.settings.furigana === 'aprendendo';
  return (
    <>
      {partes.map((p, i) =>
        p.r && !(esconder && jaLe(p.t)) ? (
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

/**
 * Texto em português com japonês no meio: furigana só nos pedaços em japonês com kanji.
 * `assunto`: o kanji de que o texto fala, citado sozinho ("Em 日本, 日 se lê に"). Ele fica sem
 * leitura em cima: a leitura dele muda de palavra para palavra e já está grande no cartão.
 * `leituras`: a leitura de cada palavra citada, quando o conteúdo a sabe (何人 é なにじん no curso,
 * e não なんにん).
 */
export function Misto({ texto, assunto, leituras }: { texto: string; assunto?: string; leituras?: Readonly<Record<string, string>> }) {
  return (
    <>
      {dividirMisto(texto).map((p, i) =>
        p.jp && p.t === assunto ? (
          <span key={i} lang="ja">
            {p.t}
          </span>
        ) : p.jp ? (
          <span key={i} lang="ja">
            <Furigana texto={p.t} leitura={leituras?.[p.t]} />
          </span>
        ) : (
          p.t
        ),
      )}
    </>
  );
}

/** Japonês do conteúdo: com rótulo ou explicação em português junto ("Você: …", "飲む (beber)"), só o japonês ganha leitura. */
export function Jp({ texto, leitura }: { texto: string; leitura?: string }) {
  return /[A-Za-zÀ-ú]/.test(texto) ? <Misto texto={texto} /> : <Furigana texto={texto} leitura={leitura} />;
}
