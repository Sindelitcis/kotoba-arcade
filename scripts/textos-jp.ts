/**
 * Todo o japonês com kanji que o site mostra, para pôr a leitura (furigana) em cima.
 *
 * Cada texto vem com a leitura quando o próprio conteúdo já a tem (a palavra e o kana dela,
 * a marcação de ruby, as partes que o gravador de vozes usa). O resto, `npm run furigana`
 * lê pelo OpenJTalk e guarda em `src/content/data/furigana.json`. `tests/furigana-cobertura.test.ts`
 * confere que nada daqui fica sem leitura.
 *
 * Fora daqui, de propósito: o kanji que é a própria pergunta (a carta do KanjiMon, a face da
 * carta do Kotodama, o kanji desenhado do Kanji em peças, a carta "só kanji" da Memória),
 * porque a leitura em cima entregaria a resposta.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KANJI, WORDS } from '../src/content';
import { DAILY_WORDS } from '../src/content/vida';
import { IMAGEM_WORDS } from '../src/content/imagens';
import { JORNADA_WORDS } from '../src/content/escola';
import { AJUDA } from '../src/content/ajuda';
import { fichaDe, todosOsAlvos } from '../src/content/aprofundar/fichas';
import { CENAS } from '../src/games/conversa/engine';
import { KANJI_PECAS } from '../src/games/pecas/dados';
import { trechosJp } from '../src/core/leitura-jp';
import { hasKanji, kataToHira } from '../src/core/kana';
import { listarFalas } from './falas';

export interface TextoJp {
  texto: string;
  /** Leitura que o conteúdo já tem (alinhada ao texto: o kana escrito continua igual). */
  leitura?: string;
  origem: string;
}

const RAIZ = process.cwd();

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivos(join(dir, e.name)) : [join(dir, e.name)]));
}

/** Pastas de dados do código que não aparecem como texto (peças de kanji, acentos, traços). */
const SEM_TEXTO = /[\\/](pecas[\\/]dados|data)[\\/]|\.json$|[\\/]pecas[\\/](engine|recorte|tracos)/;

/**
 * Do código: nome em japonês de tela, carta, relíquia e lugar, opção de lição, e o japonês no meio
 * de textos em português (ajuda, explicação de lição, ficha do Aprofundar).
 */
function doCodigo(): TextoJp[] {
  const out: TextoJp[] = [];
  for (const f of arquivos(join(RAIZ, 'src')).filter((f) => /\.tsx?$/.test(f) && !SEM_TEXTO.test(f))) {
    const fonte = readFileSync(f, 'utf8');
    const origem = f.slice(RAIZ.length + 1).replaceAll('\\', '/');
    // Todo texto entre aspas com kanji: o japonês dele, pedaço por pedaço. A marcação de ruby
    // ("{私|わたし}", e a da Aventura "[わたし||私]") já traz a leitura e fica de fora.
    for (const m of fonte.matchAll(/'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`|"((?:[^"\\\n]|\\.)*)"/g)) {
      const s = (m[1] ?? m[2] ?? m[3]) as string;
      if (!hasKanji(s) || /[{}[\]|]/.test(s)) continue;
      for (const t of trechosJp(s)) if (hasKanji(t)) out.push({ texto: t, origem });
    }
  }
  return out;
}

function daAjuda(): TextoJp[] {
  const out: TextoJp[] = [];
  for (const a of Object.values(AJUDA)) {
    const textos = [a.jp, ...a.objetivo, ...a.passos, ...a.teclas.map((t) => t.faz), ...a.elementos.flatMap((e) => [e.nome, e.texto]), ...a.ensina, ...a.perguntas.flatMap((p) => [p.p, p.r])];
    for (const s of textos) for (const t of trechosJp(s)) if (hasKanji(t)) out.push({ texto: t, origem: `ajuda/${a.tela}` });
  }
  return out;
}

function doAprofundar(): TextoJp[] {
  const out: TextoJp[] = [];
  for (const a of todosOsAlvos()) {
    const f = fichaDe(a);
    if (!f) continue;
    const origem = `aprofundar/${a.t}`;
    // O kanji sozinho no topo da ficha de kanji já mostra as leituras logo embaixo.
    if (a.t !== 'kanji') out.push({ texto: f.grande, leitura: f.leitura && f.leitura !== f.grande ? kataToHira(f.leitura) : undefined, origem });
    const misto = (s: string) => trechosJp(s).filter(hasKanji).forEach((t) => out.push({ texto: t, origem }));
    misto(f.pt);
    for (const s of f.secoes)
      for (const b of s.blocos) {
        if (b.k === 'texto') misto(b.t);
        if (b.k === 'lista' || b.k === 'passos') b.itens.forEach(misto);
        if (b.k === 'exemplos') for (const e of b.itens) out.push({ texto: e.jp, leitura: e.kana, origem }), misto(e.pt);
        if (b.k === 'palavras') for (const w of b.itens) out.push({ texto: w.jp, leitura: w.kana, origem }), misto(w.pt);
        if (b.k === 'montar') for (const p of b.partes) out.push({ texto: p, origem });
        if (b.k === 'conjugacao') for (const l of b.linhas) out.push({ texto: l.verbo, origem }, { texto: l.forma, leitura: l.leitura, origem });
      }
  }
  return out;
}

/** Uma fala gravada traz a leitura quando cada pedaço com kanji tem a sua. */
function dasFalas(): TextoJp[] {
  const out: TextoJp[] = [];
  for (const f of listarFalas()) {
    if (f.palavra && hasKanji(f.palavra.jp)) out.push({ texto: f.palavra.jp, leitura: kataToHira(f.palavra.kana), origem: f.origem });
    const texto = f.partes.map((p) => p.t).join('');
    if (!hasKanji(texto) || texto !== f.texto) continue;
    const completa = f.partes.every((p) => !hasKanji(p.t) || p.r);
    out.push({ texto, leitura: completa ? f.partes.map((p) => p.r ?? p.t).join('') : undefined, origem: f.origem });
  }
  return out;
}

function dasPalavras(): TextoJp[] {
  const ws = [...WORDS, ...DAILY_WORDS, ...IMAGEM_WORDS, ...JORNADA_WORDS, ...KANJI.flatMap((k) => k.words)];
  return [
    ...ws.map((w) => ({ texto: w.jp, leitura: kataToHira(w.kana), origem: 'palavras' })),
    ...CENAS.flatMap((c) => [
      ...c.vocabulario.map((t) => ({ texto: t.jp, leitura: kataToHira(t.kana), origem: `conversa/${c.id}` })),
      ...c.primeiras.map((s) => ({ texto: s.jp, leitura: s.kana, origem: `conversa/${c.id}` })),
    ]),
    ...KANJI_PECAS.map((k) => ({ texto: k.palavra.jp, leitura: kataToHira(k.palavra.kana), origem: 'pecas/palavra' })),
  ];
}

/** As frases de exemplo dos kanji (Dex, cartão de apresentação, frase do dia no fliperama). */
const dosKanji = (): TextoJp[] => KANJI.flatMap((k) => k.sentences.map((s) => ({ texto: s.jp, origem: `kanjimon/${k.kanji}` })));

/**
 * Texto com português junto ("Você: 二人です。", "飲む (beber)") vira os pedaços em japonês, como o
 * `<Misto>` mostra. A leitura acompanha quando ela se divide nos mesmos pedaços.
 */
function soJapones(t: TextoJp): TextoJp[] {
  if (!/[A-Za-zÀ-ú]/.test(t.texto)) return [t];
  const pedacos = trechosJp(t.texto);
  const lidos = t.leitura ? trechosJp(t.leitura) : [];
  return pedacos.map((texto, i) => ({ texto, leitura: lidos.length === pedacos.length ? lidos[i] : undefined, origem: t.origem }));
}

/** Sem repetição; quando o mesmo texto aparece com e sem leitura, fica a que tem. `origem` junta todas, separadas por espaço. */
export function listarTextosJp(): TextoJp[] {
  const porTexto = new Map<string, TextoJp>();
  for (const t of [...dasPalavras(), ...dasFalas(), ...dosKanji(), ...doAprofundar(), ...daAjuda(), ...doCodigo()].flatMap(soJapones)) {
    if (!hasKanji(t.texto)) continue;
    const visto = porTexto.get(t.texto);
    if (!visto) porTexto.set(t.texto, { ...t });
    else {
      if (!visto.leitura && t.leitura) visto.leitura = t.leitura;
      if (!visto.origem.split(' ').includes(t.origem)) visto.origem += ` ${t.origem}`;
    }
  }
  return [...porTexto.values()];
}
