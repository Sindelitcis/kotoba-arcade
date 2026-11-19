/**
 * Tudo o que os jogos falam em voz alta e que é fixo: palavras, frases, falas da
 * Aventura, frases montadas do Kumitate, abertura e respostas prontas da Conversa.
 *
 * `scripts/gravar-vozes.mjs` usa esta lista para gravar os áudios, e
 * `tests/vozes.test.ts` confere que cada item tem arquivo no manifesto.
 * O que é dito na hora (resposta do modelo na Conversa, frase do Kumitate ainda
 * pela metade) não entra: cai na voz do navegador.
 */
import { KANA, KANJI, WORDS, type Word } from '../src/content';
import { DAILY_WORDS } from '../src/content/vida';
import { hasKanji, kataToHira } from '../src/core/kana';
import { parseLine, plainText, type Scene } from '../src/games/aventura/engine';
import { SCENES } from '../src/games/aventura/cenas';
import { CENAS, marcado } from '../src/games/conversa/engine';
import { ANSWERS, conjugateWritten, parseSentence, type Block, type Ending, type Piece } from '../src/games/gramatica/engine';
import { COURSE } from '../src/games/gramatica/pontos';
import { VOZ_CONVERSA, VOZ_PADRAO, VOZ_PALAVRA, VOZES, vozDaAventura, type VozId } from '../src/core/vozes';

export interface Fala {
  /** Exatamente o texto que o jogo passa para `speak()`. */
  texto: string;
  voz: VozId;
  /** O que vai para o motor de voz: com kanji quando dá, para acertar leitura e acento. */
  tts: string;
  /**
   * Os pedaços de `tts`, cada palavra com a leitura certa em kana. O gravador pergunta ao
   * motor como ele lê cada palavra com kanji; se ler errado (日本人 = ニッポンジン), manda
   * só aquela palavra em kana. Mandar a frase toda em kana erra mais: o は de はなします
   * vira partícula.
   */
  partes: Parte[];
  /** Palavra solta do conteúdo: o gravador confere o acento numa base aberta. */
  palavra?: { jp: string; kana: string };
  origem: string;
}

export interface Parte {
  t: string;
  /** Leitura em kana, quando `t` tem kanji. */
  r?: string;
}

const juntar = (partes: readonly Parte[]) => partes.map((p) => p.t).join('');

/**
 * Frases que o OpenJTalk do motor lê errado pelo kanji: o motor recebe o trecho em kana.
 * Achadas comparando a leitura do OpenJTalk com o romaji do conteúdo.
 */
export const TTS_CORRIGIDO: Readonly<Record<string, string>> = {
  '五分待ってください。': 'ごふん待ってください。', // OpenJTalk diz ごぶ
};

function palavra(w: Word, origem: string): Fala {
  return {
    texto: w.kana,
    voz: VOZ_PALAVRA,
    tts: hasKanji(w.jp) ? w.jp : w.kana,
    partes: [hasKanji(w.jp) ? { t: w.jp, r: kataToHira(w.kana) } : { t: w.kana }],
    palavra: { jp: w.jp, kana: w.kana },
    origem,
  };
}

/** Fala da Aventura: o texto da voz é o kana da tela; para o motor, troca cada palavra pelo kanji dela. */
function falaAventura(markup: string, voz: VozId, origem: string, lookup: (id: string) => Word | undefined): Fala {
  const tokens = parseLine(markup);
  const texto = plainText(tokens);
  const partes: Parte[] = tokens
    .map((t): Parte => {
      const text = t.text.replace(/\s+/g, '');
      const w = t.word ? lookup(t.word) : undefined;
      if (w && w.kana === text && hasKanji(w.jp)) return { t: w.jp, r: kataToHira(w.kana) };
      return t.reading ? { t: text, r: kataToHira(t.reading) } : { t: text };
    })
    .filter((p) => p.t);
  return { texto, voz, tts: juntar(partes), partes, origem };
}

function aventura(scenes: readonly Scene[]): Fala[] {
  const byId = new Map<string, Word>([...DAILY_WORDS, ...WORDS].map((w) => [w.id, w]));
  const lookup = (id: string) => byId.get(id);
  const out: Fala[] = [];
  for (const scene of scenes) {
    for (const [id, node] of Object.entries(scene.nodes)) {
      const origem = `aventura/${scene.id}/${id}`;
      if (node.kind === 'narra') continue;
      const voz = vozDaAventura(node.who);
      if (node.jp) out.push(falaAventura(node.jp, voz, origem, lookup));
      if (node.kind === 'escolha') node.options.forEach((o, i) => out.push(falaAventura(o.jp, VOZ_PADRAO, `${origem}/${i}`, lookup)));
    }
  }
  return out;
}

/** Todas as formas prontas de uma frase do Kumitate (に e へ valem no mesmo buraco). */
function montagens(markup: string): Parte[][] {
  let frases: Parte[][] = [[]];
  for (const p of parseSentence(markup) as Piece[]) {
    let opcoes: Parte[];
    if (p.k === 'text') opcoes = [p.reading ? { t: p.text, r: p.reading } : { t: p.text }];
    else if (p.verb) {
      const verb = COURSE.verbs[p.verb];
      if (!verb) throw new Error(`verbo desconhecido: ${p.verb}`);
      opcoes = ANSWERS[p.role].map((b: Block) => {
        const w = conjugateWritten(verb, b as Ending);
        return w.reading ? { t: w.text + w.tail, r: w.reading + w.tail } : { t: w.text + w.tail };
      });
    } else opcoes = ANSWERS[p.role].map((b: Block) => ({ t: b }));
    frases = frases.flatMap((a) => opcoes.map((o) => [...a, o]));
  }
  return frases;
}

function kumitate(): Fala[] {
  const out: Fala[] = [];
  for (const point of COURSE.points) {
    const frases = [point.example.jp, ...point.sentences.map((s) => s.jp)];
    frases.forEach((markup, i) => {
      // O exemplo da lição usa só a primeira resposta de cada buraco.
      const formas = i === 0 ? montagens(markup).slice(0, 1) : montagens(markup);
      for (const partes of formas) out.push({ texto: juntar(partes), voz: VOZ_PADRAO, tts: juntar(partes), partes, origem: `kumitate/${point.id}/${i}` });
    });
  }
  return out;
}

const rubyPartes = (ruby: readonly { t: string; r?: string }[]): Parte[] => ruby.map((x) => (x.r ? { t: x.t, r: x.r } : { t: x.t }));

function conversa(): Fala[] {
  const out: Fala[] = [];
  for (const cena of CENAS) {
    const a = marcado(cena.abertura.texto);
    out.push({ texto: a.jp, voz: VOZ_CONVERSA[cena.personagem.voz] ?? VOZ_PADRAO, tts: a.jp, partes: rubyPartes(a.ruby), origem: `conversa/${cena.id}/abertura` });
    // A sugestão guarda só o texto e a leitura juntos; vai inteira, e o Whisper confere.
    for (const s of cena.primeiras) out.push({ texto: s.jp, voz: VOZ_PADRAO, tts: s.jp, partes: [{ t: s.jp }], origem: `conversa/${cena.id}/pronta` });
  }
  return out;
}

/** Lista sem repetição (mesmo texto na mesma voz entra uma vez só). */
export function listarFalas(): Fala[] {
  const todas: Fala[] = [
    ...WORDS.map((w) => palavra(w, 'conteudo/palavra')),
    ...DAILY_WORDS.map((w) => palavra(w, 'conteudo/vida')),
    ...KANJI.flatMap((k) =>
      k.sentences.map((s) => {
        const tts = TTS_CORRIGIDO[s.jp] ?? s.jp;
        return { texto: s.jp, voz: VOZ_PADRAO, tts, partes: [{ t: tts }], origem: `conteudo/frase/${k.kanji}` };
      }),
    ),
    ...KANA.flatMap((k) => [
      { texto: k.hira, voz: VOZ_PALAVRA, tts: k.hira, partes: [{ t: k.hira }], origem: 'kana/hiragana' },
      { texto: k.kata, voz: VOZ_PALAVRA, tts: k.kata, partes: [{ t: k.kata }], origem: 'kana/katakana' },
    ]),
    ...aventura(SCENES),
    ...kumitate(),
    ...conversa(),
  ];
  const vistas = new Set<string>();
  return todas.filter((f) => {
    if (!(f.voz in VOZES)) throw new Error(`voz desconhecida: ${f.voz}`);
    const chave = `${f.voz}\n${f.texto}`;
    if (vistas.has(chave)) return false;
    vistas.add(chave);
    return true;
  });
}
