/**
 * Leitura (furigana) do japonês que o site mostra.
 *
 * O conteúdo que já tem a leitura (palavra com kana, marcação de ruby) passa a leitura para o
 * `<Furigana>`. O que não tem acha aqui: `src/content/data/furigana.json`, feito por
 * `npm run furigana` (OpenJTalk, conferido com o conteúdo e com as vozes gravadas). Nada é
 * lido no navegador.
 */
import furigana from '../content/data/furigana.json';
import { hasKanji } from './kana';

const KANJI = /[一-鿿々〆ヶ]/;

/**
 * Texto → a leitura de cada pedaço de kanji, na ordem. Guardar por pedaço (e não a leitura
 * inteira) evita o alinhamento ambíguo: em 母は料理, a leitura ははりょうり não diz sozinha
 * onde termina はは.
 */
const LEITURAS: Readonly<Record<string, readonly string[]>> = furigana.leituras;

/** Peças de kanji que não são palavra (夂, 忄): nas historinhas são desenho, sem leitura. */
export const FORMAS_SEM_LEITURA: ReadonlySet<string> = new Set(furigana.formas);

/** Pedaços de kanji e de kana do texto, na ordem. */
export function blocosDoTexto(texto: string): { t: string; kanji: boolean }[] {
  const blocos: { t: string; kanji: boolean }[] = [];
  for (const c of texto) {
    const k = KANJI.test(c);
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && ultimo.kanji === k) ultimo.t += c;
    else blocos.push({ t: c, kanji: k });
  }
  return blocos;
}

/** Monta as partes com a leitura de cada pedaço de kanji (a dos dados, ou outra na mesma forma). */
export function partesDosBlocos(texto: string, leituras: readonly string[]): Parte[] | undefined {
  const blocos = blocosDoTexto(texto);
  if (blocos.filter((b) => b.kanji).length !== leituras.length) return undefined;
  let i = 0;
  return blocos.map((b) => (b.kanji ? { t: b.t, r: leituras[i++] } : { t: b.t }));
}

/**
 * Partes do texto para o furigana. A `leitura` dada pelo conteúdo vale (一日 é いちにち numa
 * lição e ついたち como palavra); os dados entram quando ela não vem, ou para dividir uma leitura
 * ambígua do mesmo jeito que ela lê.
 */
export function partesDe(texto: string, leitura?: string): Parte[] {
  const rs = LEITURAS[texto];
  const guardadas = rs ? partesDosBlocos(texto, rs) : undefined;
  if (!leitura) return guardadas ?? porPedacos(texto);
  if (guardadas && igualar(guardadas.map((p) => p.r ?? p.t).join('')) === igualar(leitura)) return guardadas;
  return partesFurigana(texto, leitura);
}

/**
 * Pedaços em japonês de um texto misturado com português ("A partícula は liga 学校 a…").
 * Pontuação japonesa fica junto do pedaço; espaço separa.
 */
/** Número colado no japonês entra junto (7時半), para a leitura do 時 depois dele sair certa. */
const TRECHO = /(?:[0-9０-９]+(?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆ヶ〜・、。？！「」『』…]))?[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆ヶ〜・、。？！「」『』…]+/gu;

export function trechosJp(texto: string): string[] {
  return [...texto.matchAll(TRECHO)].map((m) => m[0]);
}

/** Divide o texto em português e japonês, na ordem, para pôr furigana só no japonês com kanji. */
export function dividirMisto(texto: string): { t: string; jp: boolean }[] {
  const out: { t: string; jp: boolean }[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(TRECHO)) {
    if (m.index > ultimo) out.push({ t: texto.slice(ultimo, m.index), jp: false });
    out.push({ t: m[0], jp: hasKanji(m[0]) });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) out.push({ t: texto.slice(ultimo), jp: false });
  return out;
}

/**
 * Texto com kanji mostrado sem leitura. Vai para o console com esta marca, e os testes de
 * ponta a ponta falham se ela aparecer (e2e/base.ts).
 */
export const MARCA_SEM_LEITURA = '[furigana] sem leitura';

const avisados = new Set<string>();
export function avisarSemLeitura(texto: string): void {
  if (avisados.has(texto)) return;
  avisados.add(texto);
  console.warn(`${MARCA_SEM_LEITURA}: ${texto}`);
}

/**
 * Texto montado na hora ("Palavras novas: 本、机", "私 は") que não está inteiro nos dados:
 * cada pedaço em japonês acha a sua leitura.
 */
function porPedacos(texto: string): Parte[] {
  return dividirMisto(texto).flatMap((p): Parte[] => {
    if (!p.jp) return [{ t: p.t }];
    const rs = LEITURAS[p.t];
    return (rs && partesDosBlocos(p.t, rs)) || [{ t: p.t }];
  });
}

/* ───────── Furigana só em cima do kanji ───────── */

export interface Parte {
  t: string;
  /** Leitura, só nos pedaços com kanji. */
  r?: string;
}

/** Katakana e hiragana contam como o mesmo som na hora de alinhar. */
const igualar = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Divide o texto em pedaços de kanji (com leitura) e de kana (sem leitura), alinhando pela
 * leitura inteira. `guloso` alinha pelo outro lado: quando os dois jeitos dão partes
 * diferentes, a leitura sozinha é ambígua. Se não der para alinhar (leitura que não bate com o kana escrito), devolve
 * o texto inteiro com a leitura inteira, como antes.
 */
export function partesFurigana(texto: string, leitura: string | undefined, guloso = false): Parte[] {
  if (!leitura || !hasKanji(texto) || leitura === texto) return [{ t: texto }];
  const blocos = blocosDoTexto(texto);
  const molde = new RegExp(`^${blocos.map((b) => (b.kanji ? (guloso ? '(.+)' : '(.+?)') : `(${escapar(igualar(b.t))})`)).join('')}$`, 'u');
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
