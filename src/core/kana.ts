/** Conversão entre romaji (Hepburn, com tolerância a kunrei) e kana. */

const ROWS: [string, string][] = [
  ['a', 'あ'], ['i', 'い'], ['u', 'う'], ['e', 'え'], ['o', 'お'],
  ['ka', 'か'], ['ki', 'き'], ['ku', 'く'], ['ke', 'け'], ['ko', 'こ'],
  ['sa', 'さ'], ['shi', 'し'], ['su', 'す'], ['se', 'せ'], ['so', 'そ'],
  ['ta', 'た'], ['chi', 'ち'], ['tsu', 'つ'], ['te', 'て'], ['to', 'と'],
  ['na', 'な'], ['ni', 'に'], ['nu', 'ぬ'], ['ne', 'ね'], ['no', 'の'],
  ['ha', 'は'], ['hi', 'ひ'], ['fu', 'ふ'], ['he', 'へ'], ['ho', 'ほ'],
  ['ma', 'ま'], ['mi', 'み'], ['mu', 'む'], ['me', 'め'], ['mo', 'も'],
  ['ya', 'や'], ['yu', 'ゆ'], ['yo', 'よ'],
  ['ra', 'ら'], ['ri', 'り'], ['ru', 'る'], ['re', 'れ'], ['ro', 'ろ'],
  ['wa', 'わ'], ['wo', 'を'], ['n', 'ん'],
  ['ga', 'が'], ['gi', 'ぎ'], ['gu', 'ぐ'], ['ge', 'げ'], ['go', 'ご'],
  ['za', 'ざ'], ['ji', 'じ'], ['zu', 'ず'], ['ze', 'ぜ'], ['zo', 'ぞ'],
  ['da', 'だ'], ['de', 'で'], ['do', 'ど'],
  ['ba', 'ば'], ['bi', 'び'], ['bu', 'ぶ'], ['be', 'べ'], ['bo', 'ぼ'],
  ['pa', 'ぱ'], ['pi', 'ぴ'], ['pu', 'ぷ'], ['pe', 'ぺ'], ['po', 'ぽ'],
  ['kya', 'きゃ'], ['kyu', 'きゅ'], ['kyo', 'きょ'],
  ['sha', 'しゃ'], ['shu', 'しゅ'], ['sho', 'しょ'],
  ['cha', 'ちゃ'], ['chu', 'ちゅ'], ['cho', 'ちょ'],
  ['nya', 'にゃ'], ['nyu', 'にゅ'], ['nyo', 'にょ'],
  ['hya', 'ひゃ'], ['hyu', 'ひゅ'], ['hyo', 'ひょ'],
  ['mya', 'みゃ'], ['myu', 'みゅ'], ['myo', 'みょ'],
  ['rya', 'りゃ'], ['ryu', 'りゅ'], ['ryo', 'りょ'],
  ['gya', 'ぎゃ'], ['gyu', 'ぎゅ'], ['gyo', 'ぎょ'],
  ['ja', 'じゃ'], ['ju', 'じゅ'], ['jo', 'じょ'],
  ['bya', 'びゃ'], ['byu', 'びゅ'], ['byo', 'びょ'],
  ['pya', 'ぴゃ'], ['pyu', 'ぴゅ'], ['pyo', 'ぴょ'],
];

/** Grafias alternativas que o jogador pode digitar (kunrei e teclado). */
const ALIASES: [string, string][] = [
  ['si', 'し'], ['ti', 'ち'], ['tu', 'つ'], ['hu', 'ふ'], ['zi', 'じ'], ['o', 'を'],
  ['di', 'ぢ'], ['du', 'づ'],
  ['sya', 'しゃ'], ['syu', 'しゅ'], ['syo', 'しょ'],
  ['tya', 'ちゃ'], ['tyu', 'ちゅ'], ['tyo', 'ちょ'],
  ['zya', 'じゃ'], ['zyu', 'じゅ'], ['zyo', 'じょ'],
  ['jya', 'じゃ'], ['jyu', 'じゅ'], ['jyo', 'じょ'],
];

const TO_KANA = new Map<string, string>();
for (const [r, k] of ALIASES) if (r !== 'o') TO_KANA.set(r, k);
for (const [r, k] of ROWS) TO_KANA.set(r, k);

const TO_ROMAJI = new Map<string, string>();
for (const [r, k] of ROWS) TO_ROMAJI.set(k, r);
TO_ROMAJI.set('ぢ', 'ji');
TO_ROMAJI.set('づ', 'zu');

const VOWELS = 'aiueo';

/** Tabela de kana básicos (46 + dakuten + combinações), na ordem de estudo. */
export const KANA_TABLE: readonly { romaji: string; hira: string; kata: string }[] = ROWS.map(([romaji, hira]) => ({
  romaji,
  hira,
  kata: hiraToKata(hira),
}));

export function kataToHira(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

export function hiraToKata(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

/** Letras e números de largura dupla (Ａ, ４) viram os comuns. */
export function toHalfWidth(s: string): string {
  return s.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ');
}

export function isKana(s: string): boolean {
  return s.length > 0 && /^[ぁ-ゖァ-ヺー]+$/.test(s);
}

export function hasKanji(s: string): boolean {
  return /[一-鿿々]/.test(s);
}

/**
 * "kin'youbi" → きんようび, "issho ni" → いっしょに, "shucchou" → しゅっちょう.
 * Com `imeNn`, "nn" sempre vira só ん, como no teclado japonês (kinnyoubi → きんようび).
 */
export function romajiToHiragana(input: string, imeNn = false): string {
  const s = toHalfWidth(input).toLowerCase().replace(/[\s\-.]/g, '');
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i] as string;
    const next = s[i + 1];
    if (c === "'") {
      i++;
      continue;
    }
    if (c === 'n') {
      if (next === undefined || next === "'") {
        out += 'ん';
        i++;
        continue;
      }
      if (next === 'n') {
        // "nn" antes de vogal é ん + な行 (sannin); antes de consoante ou no fim é só ん
        out += 'ん';
        const after = s[i + 2];
        i += !imeNn && after !== undefined && (VOWELS.includes(after) || after === 'y') ? 1 : 2;
        continue;
      }
      if (!VOWELS.includes(next) && next !== 'y') {
        out += 'ん';
        i++;
        continue;
      }
    }
    // consoante dobrada vira っ (kitte, gakkou, shucchou, matcha)
    if (next !== undefined && /[a-z]/.test(c) && !VOWELS.includes(c) && c !== 'n' && (c === next || (c === 't' && next === 'c'))) {
      out += 'っ';
      i++;
      continue;
    }
    let matched = false;
    for (const len of [3, 2, 1]) {
      const kana = TO_KANA.get(s.slice(i, i + len));
      if (kana) {
        out += kana;
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += c;
      i++;
    }
  }
  return out;
}

/** きんようび → kin'youbi (Hepburn). Aceita katakana. */
export function kanaToRomaji(input: string): string {
  const s = kataToHira(input);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const two = TO_ROMAJI.get(s.slice(i, i + 2));
    if (two) {
      out += two;
      i++;
      continue;
    }
    const c = s[i] as string;
    if (c === 'っ') {
      const nextRomaji = TO_ROMAJI.get(s.slice(i + 1, i + 3)) ?? TO_ROMAJI.get(s[i + 1] ?? '');
      if (nextRomaji) out += nextRomaji.startsWith('ch') ? 't' : (nextRomaji[0] as string);
      continue;
    }
    if (c === 'ー') {
      out += out.slice(-1);
      continue;
    }
    if (c === 'ん') {
      const nextRomaji = TO_ROMAJI.get(s[i + 1] ?? '');
      out += nextRomaji && (VOWELS.includes(nextRomaji[0] as string) || nextRomaji[0] === 'y') ? "n'" : 'n';
      continue;
    }
    out += TO_ROMAJI.get(c) ?? c;
  }
  return out;
}

/** Qualquer coisa que o jogador digitar (romaji, hiragana, katakana) vira hiragana. */
export function toReadingKey(input: string): string {
  const s = kataToHira(toHalfWidth(input).trim());
  return romajiToHiragana(s).replace(/[\s。、.,!?！？]/g, '');
}

function collapseLong(kana: string): string {
  // おう/おお → お, うう → う, えい/ええ → え, ああ → あ, いい → い; ー some
  const romaji = kanaToRomaji(kana.replace(/ー/g, '')).replace(/'/g, '');
  return romaji.replace(/ou/g, 'o').replace(/ei/g, 'e').replace(/([aiueo])\1+/g, '$1');
}

export type ReadingMatch = 'exact' | 'close' | 'wrong';

/**
 * Compara a leitura digitada com a esperada (em kana).
 * 'close' = só errou o tamanho da vogal (kyu por kyuu): vale, mas a tela avisa.
 */
export function compareReading(input: string, expectedKana: string): ReadingMatch {
  const given = toReadingKey(input);
  const expected = toReadingKey(expectedKana);
  if (!given) return 'wrong';
  if (given === expected) return 'exact';
  const typed = toHalfWidth(input).toLowerCase().replace(/[\s\-.']/g, '');
  if (/^[a-z]+$/.test(typed)) {
    // Quem digita em romaji costuma escrever "kinyoubi" (sem apóstrofo) ou "kinnyoubi" (teclado japonês).
    if (typed === kanaToRomaji(expected).replace(/'/g, '')) return 'exact';
    if (romajiToHiragana(typed, true) === expected) return 'exact';
  }
  if (collapseLong(given) === collapseLong(expected)) return 'close';
  return 'wrong';
}

/** Compara texto em português sem ligar para acento, maiúscula ou espaço sobrando. */
export function normalizePt(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/* ───────── Digitação letra a letra (jogos de ritmo) ───────── */

const SPELLINGS = new Map<string, string[]>();
for (const [r, k] of [...ROWS, ...ALIASES]) {
  if (r === 'o' && k === 'を') continue;
  const list = SPELLINGS.get(k) ?? [];
  if (!list.includes(r)) list.push(r);
  SPELLINGS.set(k, list);
}

/**
 * Quebra uma leitura em kana nas unidades que o jogador digita, cada uma com
 * as grafias aceitas (Hepburn, kunrei, teclado japonês).
 */
export function typingUnits(kana: string): string[][] {
  const s = kataToHira(kana).replace(/[\s。、]/g, '');
  const raw: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (SPELLINGS.has(two)) {
      raw.push(two);
      i++;
    } else raw.push(s[i] as string);
  }
  const base = (u: string | undefined): string[] => (u === undefined ? [] : (SPELLINGS.get(u) ?? [u]));
  const units: string[][] = [];
  for (let i = 0; i < raw.length; i++) {
    const u = raw[i] as string;
    if (u === 'っ' && raw[i + 1] !== undefined && SPELLINGS.has(raw[i + 1] as string)) {
      const next = base(raw[i + 1]);
      const doubled = new Set<string>();
      for (const sp of next) {
        doubled.add((sp[0] as string) + sp);
        if (sp.startsWith('ch')) doubled.add('t' + sp);
      }
      units.push([...doubled]);
      i++;
    } else if (u === 'ん') {
      const next = base(raw[i + 1]);
      const ambiguous = next.some((sp) => VOWELS.includes(sp[0] as string) || sp[0] === 'y' || sp[0] === 'n');
      units.push(ambiguous ? ['nn', "n'", 'n'] : ['n', 'nn', "n'"]);
    } else if (u === 'ー') {
      const prev = units[units.length - 1]?.[0];
      units.push(prev ? ['-', prev.slice(-1)] : ['-']);
    } else {
      units.push(base(u));
    }
  }
  return units;
}

export type TypingMatch = 'complete' | 'prefix' | 'no';

function matchUnits(buf: string, i: number, units: string[][]): TypingMatch {
  if (i === units.length) return buf === '' ? 'complete' : 'no';
  if (buf === '') return 'prefix';
  let best: TypingMatch = 'no';
  for (const sp of units[i] as string[]) {
    if (buf.startsWith(sp)) {
      const rest = matchUnits(buf.slice(sp.length), i + 1, units);
      if (rest === 'complete') return 'complete';
      if (rest === 'prefix') best = 'prefix';
    } else if (sp.startsWith(buf)) {
      best = 'prefix';
    }
  }
  return best;
}

/** O que já foi digitado bate com a leitura? Completo, no caminho, ou errado. */
export function matchTyping(buffer: string, kana: string): TypingMatch {
  return matchUnits(toHalfWidth(buffer).toLowerCase(), 0, typingUnits(kana));
}
