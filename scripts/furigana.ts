/**
 * Gera `src/content/data/furigana.json`: a leitura de todo japonês com kanji que o site mostra
 * (`listarTextosJp` em scripts/textos-jp.ts), guardada por pedaço de kanji. Rode com
 * `npm run furigana` (scripts/furigana.mjs) depois de mudar conteúdo.
 *
 * 1. `scripts/furigana-correcoes.json` decide primeiro (texto → leitura de cada pedaço de kanji).
 * 2. Texto que o conteúdo já traz com leitura: fica a do conteúdo. Se a leitura inteira não diz
 *    onde cada pedaço termina (母は料理 = ははりょうり), vale a divisão do OpenJTalk, quando ele lê igual.
 * 3. O resto: o OpenJTalk (pyopenjtalk, o mesmo do gravador de vozes) divide em palavras e lê,
 *    com a pronúncia de verdade (三本 = さんぼん, 四時 = よじ).
 * 4. Pedaço de dois ou mais kanji que o conteúdo lê sempre de um jeito só vale o do conteúdo
 *    (日本人: o OpenJTalk diz にっぽんじん, o conteúdo diz にほんじん).
 * 5. Confere com as vozes gravadas: a pronúncia do furigana tem de bater com o que o motor de voz
 *    falou. O que não bate, ou não deu para ler, vai para test-results/furigana-revisar.txt e o
 *    script falha; resolva em furigana-correcoes.json.
 *
 * Roda só na CPU (não usa a placa). Python: o do motor de voz (`VOZ_PYTHON` ou
 * D:\KotobaArcade\voz\venv), que tem o pyopenjtalk.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hasKanji, kataToHira } from '../src/core/kana';
import { blocosDoTexto, partesDosBlocos, partesFurigana, type Parte } from '../src/core/leitura-jp';
import { PECAS_LISTA } from '../src/games/pecas/dados';
import { listarFalas } from './falas';
import { listarTextosJp } from './textos-jp';

const RAIZ = process.cwd();
const SAIDA = join(RAIZ, 'src/content/data/furigana.json');
const CORRECOES = join(RAIZ, 'scripts/furigana-correcoes.json');
const REVISAR = join(RAIZ, 'test-results/furigana-revisar.txt');
const python = process.env.VOZ_PYTHON ?? 'D:/KotobaArcade/voz/venv/Scripts/python.exe';
const KANJI = /[一-鿿々〆ヶ]/;

type Token = [string, string, string];

function perguntarAoPython<T>(modo: 'tokens' | 'pronuncia', textos: string[]): Record<string, T> {
  const pasta = mkdtempSync(join(tmpdir(), 'furigana-'));
  const entrada = join(pasta, 'entrada.json');
  const saida = join(pasta, 'saida.json');
  writeFileSync(entrada, JSON.stringify(textos));
  execFileSync(python, ['-I', join(RAIZ, 'scripts/leituras_jp.py'), modo, entrada, saida], { stdio: 'inherit' });
  return JSON.parse(readFileSync(saida, 'utf8')) as Record<string, T>;
}

const VOGAL: Record<string, string> = {};
for (const [v, linha] of [['ア', 'アカサタナハマヤラワガザダバパァャヮ'], ['イ', 'イキシチニヒミリギジヂビピィ'], ['ウ', 'ウクスツヌフムユルグズヅブプゥュヴ'], ['エ', 'エケセテネヘメレゲゼデベペェ'], ['オ', 'オコソトノホモヨロヲゴゾドボポォョ']] as const)
  for (const c of linha) VOGAL[c] = v;

/**
 * Leitura de um pedaço: a pronúncia (que já tem 三本 = サンボン e 四 = ヨ em 四時), com a vogal
 * longa escrita como na leitura (キョー vira キョウ).
 */
function lerToken(read: string, pron: string): string {
  const p = pron.replace(/’/g, '');
  if (p.length === read.length) return [...p].map((c, i) => (c === 'ー' ? (read[i] as string) : c)).join('');
  return [...p].map((c, i, a) => (c === 'ー' ? ({ オ: 'ウ', エ: 'イ' } as Record<string, string>)[VOGAL[a[i - 1] as string] ?? ''] ?? VOGAL[a[i - 1] as string] ?? c : c)).join('');
}

/** Leitura de cada pedaço de kanji pelo OpenJTalk, ou null se ele mudou o texto ou não alinhou. */
function blocosDoOpenJTalk(texto: string, tokens: readonly Token[]): string[] | null {
  const NUMERO = /^[〇一二三四五六七八九十百千万]+$/;
  const partes: Parte[] = [];
  let pos = 0;
  for (let i = 0; i < tokens.length; i++) {
    const [s, read, pron] = tokens[i] as Token;
    if (!texto.startsWith(s, pos)) {
      // O OpenJTalk escreve o número por extenso (7 → 七): o algarismo fica, sem leitura em cima.
      const digitos = /^[0-9０-９]+/.exec(texto.slice(pos));
      if (!digitos || !NUMERO.test(s)) return null;
      while (i + 1 < tokens.length && NUMERO.test((tokens[i + 1] as Token)[0]) && !texto.startsWith((tokens[i + 1] as Token)[0], pos + digitos[0].length)) i++;
      partes.push({ t: digitos[0] });
      pos += digitos[0].length;
      continue;
    }
    pos += s.length;
    if (!KANJI.test(s)) {
      partes.push({ t: s });
      continue;
    }
    const ps = partesFurigana(s, kataToHira(lerToken(read, pron)));
    if (ps.some((p) => p.r && !KANJI.test(p.t)) || (ps.length === 1 && blocosDoTexto(s).length > 1)) return null;
    partes.push(...ps);
  }
  if (pos !== texto.length) return null;
  // Pedaços de kanji vizinhos (日本 + 人) viram um só, como na tela.
  const juntos: Parte[] = [];
  for (const p of partes) {
    const ultimo = juntos[juntos.length - 1];
    if (ultimo && p.r && ultimo.r) juntos[juntos.length - 1] = { t: ultimo.t + p.t, r: ultimo.r + p.r };
    else juntos.push({ ...p });
  }
  const blocos = juntos.filter((p) => p.r).map((p) => p.r as string);
  // Leitura que não é kana (o OpenJTalk lê algumas peças de kanji como pontuação): não leu.
  return blocos.every((r) => /^[ぁ-ゖァ-ヺー]+$/.test(r)) ? blocos : null;
}

/** Leitura de cada pedaço de kanji alinhando a leitura inteira; null se não alinha ou é ambígua. */
function blocosDaLeitura(texto: string, leitura: string): { blocos: string[] | null; ambigua: boolean } {
  const curto = partesFurigana(texto, leitura);
  const longo = partesFurigana(texto, leitura, true);
  const alinhou = curto.every((p) => !KANJI.test(p.t) || (p.r && !(curto.length === 1 && blocosDoTexto(texto).length > 1)));
  if (!alinhou) return { blocos: null, ambigua: false };
  const ambigua = JSON.stringify(curto) !== JSON.stringify(longo);
  return { blocos: ambigua ? null : curto.filter((p) => p.r).map((p) => p.r as string), ambigua };
}

/** Forma comparável de uma pronúncia (como o `limpar` do gravador). は/わ e へ/え contam igual. */
function comparavel(kana: string): string {
  const out: string[] = [];
  for (let c of kana) {
    if (c >= 'ぁ' && c <= 'ゖ') c = String.fromCharCode(c.charCodeAt(0) + 0x60);
    if (/[、。？！?!.,　 ・「」『』…'’]/.test(c)) continue;
    if (c === 'ヲ') c = 'オ';
    if (c === 'ハ') c = 'ワ';
    if (c === 'ヘ') c = 'エ';
    const antes = out.length ? VOGAL[out[out.length - 1] as string] : undefined;
    if (c === 'ー' && antes) c = antes;
    else if ((c === 'ウ' && antes === 'オ') || (c === 'イ' && antes === 'エ')) c = antes;
    out.push(c);
  }
  return out.join('');
}

const lidas = (texto: string, blocos: readonly string[]) => (partesDosBlocos(texto, blocos) ?? []).map((p) => p.r ?? p.t).join('');

export function gerarFurigana(): boolean {
  const textos = listarTextosJp();
  const correcoes = JSON.parse(readFileSync(CORRECOES, 'utf8')) as Record<string, string[]>;
  const tokens = perguntarAoPython<Token[]>('tokens', textos.map((t) => t.texto));

  // Como o conteúdo lê cada pedaço de dois ou mais kanji.
  const doConteudo = new Map<string, Set<string>>();
  for (const t of textos) {
    if (!t.leitura) continue;
    const { blocos } = blocosDaLeitura(t.texto, t.leitura);
    for (const p of blocos ? (partesDosBlocos(t.texto, blocos) ?? []) : [])
      if (p.r && [...p.t].length > 1) (doConteudo.get(p.t) ?? doConteudo.set(p.t, new Set()).get(p.t)!).add(p.r);
  }

  const leituras: Record<string, string[]> = {};
  /** Peça de kanji que não é palavra (夂, 忄): aparece nas historinhas como desenho, sem leitura. */
  const pecasDeKanji = new Set(PECAS_LISTA.map((p) => p.peca));
  const formas: string[] = [];
  /** Textos cuja leitura não veio pronta do conteúdo (OpenJTalk ou correção): estes são conferidos com a voz. */
  const conferir = new Set<string>();
  const problemas: string[] = [];
  const trocados: string[] = [];
  let pelaMaquina = 0;
  for (const t of textos) {
    const maquina = blocosDoOpenJTalk(t.texto, tokens[t.texto] ?? []);
    let blocos: string[] | null = correcoes[t.texto] ?? null;
    if (blocos || !t.leitura) conferir.add(t.texto);
    if (!blocos && t.leitura) {
      const r = blocosDaLeitura(t.texto, t.leitura);
      blocos = r.blocos;
      if (r.ambigua && maquina && comparavel(lidas(t.texto, maquina)) === comparavel(t.leitura)) blocos = maquina;
      if (!blocos) problemas.push(`${r.ambigua ? 'leitura ambígua' : 'leitura não alinha'}: ${t.texto} = ${t.leitura}  [${t.origem}]`);
    } else if (!blocos && t.origem.split(' ').every((o) => o === 'aprofundar/kanji') && (pecasDeKanji.has(t.texto) || ([...t.texto].length === 1 && !maquina))) {
      // Peça sozinha numa historinha da ficha de kanji (夂, 忄, 頁, ou uma variante que nem o
      // OpenJTalk conhece, como 龶): desenho, sem leitura.
      formas.push(t.texto);
    } else if (!blocos) {
      blocos = maquina;
      pelaMaquina++;
      if (!blocos) problemas.push(`o OpenJTalk não leu: ${t.texto}  [${t.origem}]`);
      else {
        const partes = partesDosBlocos(t.texto, blocos) ?? [];
        blocos = partes.flatMap((p) => {
          if (!p.r) return [];
          const certas = doConteudo.get(p.t);
          if (certas && certas.size === 1 && !certas.has(p.r)) {
            const nova = [...certas][0] as string;
            trocados.push(`${t.texto}: ${p.t} ${p.r} → ${nova}`);
            return [nova];
          }
          return [p.r];
        });
      }
    }
    if (blocos) {
      if (!partesDosBlocos(t.texto, blocos)) problemas.push(`número de pedaços errado: ${t.texto} ${JSON.stringify(blocos)}  [${t.origem}]`);
      else leituras[t.texto] = blocos;
    }
  }

  // Conferir com as vozes gravadas: o que o motor falou (a parte com leitura vai em kana, o resto o
  // OpenJTalk do motor lê) e o kana do furigana. Leitura que veio pronta do conteúdo é a que o
  // gravador usou, então só a do OpenJTalk e a das correções são conferidas.
  // Fala cujos pedaços com kanji já têm leitura (o kanji sozinho do Kanji em peças) leva essa
  // leitura para a tela também; a dos dados não chega nela.
  const comLeituraPropria = (f: ReturnType<typeof listarFalas>[number]) => f.partes.every((p) => !KANJI.test(p.t) || p.r);
  const gravadas = listarFalas().filter((f) => conferir.has(f.texto) && leituras[f.texto] && !comLeituraPropria(f));
  const falado = (f: (typeof gravadas)[number]) => f.partes.map((p) => p.r ?? p.t).join('');
  const pron = perguntarAoPython<string>('pronuncia', [...new Set(gravadas.map(falado))]);
  const divergem: string[] = [];
  for (const f of gravadas) {
    const a = comparavel(pron[falado(f)] ?? '');
    const b = comparavel(lidas(f.texto, leituras[f.texto]!));
    if (a !== b) divergem.push(`${f.texto}: voz ${a} · furigana ${b} ${JSON.stringify(leituras[f.texto])}  [${f.origem}]`);
  }

  const ordenadas = Object.fromEntries(Object.entries(leituras).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  writeFileSync(SAIDA, JSON.stringify({ versao: 2, formas: formas.sort(), leituras: ordenadas }, null, 1) + '\n');
  mkdirSync(join(RAIZ, 'test-results'), { recursive: true });
  writeFileSync(REVISAR, [`# trocados pelo conteúdo (${trocados.length})`, ...trocados, '', `# voz e furigana divergem (${divergem.length})`, ...divergem, '', `# problemas (${problemas.length})`, ...problemas, ''].join('\n'));
  console.log(`${Object.keys(leituras).length} textos; ${pelaMaquina} lidos pelo OpenJTalk; ${trocados.length} pedaços trocados pelo conteúdo.`);
  console.log(`divergem da voz: ${divergem.length}; problemas: ${problemas.length} (lista em test-results/furigana-revisar.txt)`);
  return problemas.length === 0 && divergem.length === 0;
}
