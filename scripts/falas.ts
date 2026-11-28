/**
 * Tudo o que os jogos falam em voz alta e que é fixo: palavras, frases, falas da
 * Aventura, frases do Kumitate, abertura, respostas prontas e palavras novas da Conversa,
 * palavras do vocabulário em imagem (Memória) e pedidos e frases da Cena Viva.
 *
 * `scripts/gravar-vozes.mjs` usa esta lista para gravar os áudios, e
 * `tests/vozes.test.ts` confere que cada item tem arquivo no manifesto.
 * A frase do Kumitate pela metade (tecla R no meio da montagem) também é finita:
 * entram todas, com uma pausa no lugar do buraco vazio.
 * Só a resposta do modelo na Conversa é dita na hora, pelo servidor local; sem ele,
 * pela voz do navegador.
 */
import { KANA, KANJI, WORDS, type Word } from '../src/content';
import { KANA_IMAGENS, PALAVRAS_KATAKANA } from '../src/content/kana';
import { DAILY_WORDS } from '../src/content/vida';
import { hasKanji, kataToHira } from '../src/core/kana';
import { parseLine, plainText, type Scene } from '../src/games/aventura/engine';
import { SCENES } from '../src/games/aventura/cenas';
import { CENAS, marcado } from '../src/games/conversa/engine';
import { ANSWERS, MAX_OPEN, conjugateWritten, parseSentence, type Block, type Ending, type Piece } from '../src/games/gramatica/engine';
import { COURSE } from '../src/games/gramatica/pontos';
import { LICOES_FALADAS } from '../src/games/gramatica/falado';
import { KANJI_PECAS } from '../src/games/pecas/dados';
import { leituraOficial } from '../src/games/pecas/engine';
import { VOZ_CONVERSA, VOZ_PADRAO, VOZ_PALAVRA, VOZES, vozDaAventura, type VozId } from '../src/core/vozes';
import { JORNADA_WORDS } from '../src/content/escola';
import { palavras as palavrasMarcadas } from '../src/content/escola/ruby';
import { LICOES, type FalaQuadro } from '../src/jornada/licoes';
import { AULAS } from '../src/aulas';
import type { FalaJp } from '../src/core/sequencia';
import { FIGURAS, IMAGEM_WORDS } from '../src/content/imagens';
import { pecasDasEtapas } from '../src/games/cena/aulas';
import { daCoisa, ETAPAS, falaDaTarefa, falaDoNome, nomeDe, PERGUNTA_NOME, tarefas, type Seg } from '../src/games/cena/engine';
import { LUGARES } from '../src/games/cena/lugares';
import { falasDaFicha, fichaDe, todosOsAlvos } from '../src/content/aprofundar/fichas';
import { falasDoCurso } from '../src/curso/cartoes';
import { dialogoDa, exemplosDaUnidade, leituraDa, partesDaFala, type Exemplo } from '../src/curso/exemplos';
import { AULAS_DO_CURSO } from '../src/content/curso/aulas';
import { UNIDADES } from '../src/content/curso';

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

function palavra(w: Pick<Word, 'jp' | 'kana'>, origem: string): Fala {
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

/** Pausa no lugar de uma partícula que o jogador ainda não pôs. Só vai ao motor, não ao texto. */
const BURACO = '、';

/**
 * Formas de uma frase do Kumitate. `estado(i)` diz o que o buraco `i` tem: todas as
 * respostas certas (に e へ valem no mesmo buraco), só a primeira (buraco fechado, que o
 * jogo já mostra preenchido) ou nada (aberto e ainda vazio).
 */
function formas(pieces: readonly Piece[], estado: (i: number) => 'todas' | 'primeira' | 'vazio'): Parte[][] {
  let frases: Parte[][] = [[]];
  pieces.forEach((p, i) => {
    let opcoes: Parte[];
    if (p.k === 'text') opcoes = [p.reading ? { t: p.text, r: p.reading } : { t: p.text }];
    else {
      const e = estado(i);
      const blocos: (Block | null)[] = e === 'vazio' ? [null] : e === 'primeira' ? [ANSWERS[p.role][0] as Block] : [...ANSWERS[p.role]];
      if (p.verb) {
        const verb = COURSE.verbs[p.verb];
        if (!verb) throw new Error(`verbo desconhecido: ${p.verb}`);
        // Sem ponta ainda, o verbo aparece na forma de dicionário.
        opcoes = blocos.map((b) => {
          const w = conjugateWritten(verb, b as Ending | null);
          return w.reading ? { t: w.text + w.tail, r: w.reading + w.tail } : { t: w.text + w.tail };
        });
      } else opcoes = blocos.map((b) => ({ t: b ?? BURACO }));
    }
    frases = frases.flatMap((a) => opcoes.map((o) => [...a, o]));
  });
  return frases;
}

/** Todas as formas prontas de uma frase do Kumitate. */
const montagens = (markup: string): Parte[][] => formas(parseSentence(markup), () => 'todas');

/**
 * Tudo que a tecla R pode falar no meio da montagem: os buracos abertos se enchem na
 * ordem da frase, e os fechados já vêm com a primeira resposta. Quais abrem depende dos
 * pontos que o jogador já viu, então entram todas as combinações (o motor do Kumitate
 * abre os do ponto da frase e depois os de pontos vistos, até MAX_OPEN).
 */
export function metades(markup: string, roles: readonly string[]): Parte[][] {
  const pieces = parseSentence(markup);
  const gaps = pieces.flatMap((p, i) => (p.k === 'gap' ? [i] : []));
  const alvo = gaps.filter((i) => roles.includes((pieces[i] as { role: string }).role));
  const outros = gaps.filter((i) => !alvo.includes(i));
  const out: Parte[][] = [];
  for (let mask = 0; mask < 1 << outros.length; mask++) {
    const vistos = outros.filter((_, j) => mask & (1 << j));
    const abertos = [...alvo, ...vistos].slice(0, Math.max(MAX_OPEN, alvo.length)).sort((a, b) => a - b);
    for (let cheios = 0; cheios < abertos.length; cheios++) {
      out.push(...formas(pieces, (i) => {
        const pos = abertos.indexOf(i);
        return pos < 0 ? 'primeira' : pos < cheios ? 'todas' : 'vazio';
      }));
    }
  }
  return out;
}

/** O texto que o jogo passa para `speak()`: sem a pausa do buraco. */
const semBuraco = (partes: readonly Parte[]) => partes.filter((p) => p.t !== BURACO).map((p) => p.t).join('');

/** A pausa não começa nem termina a frase, e não repete. */
function tirarPausasSobrando(partes: Parte[]): Parte[] {
  const out = partes.filter((p, i) => p.t !== BURACO || (i > 0 && partes[i - 1]?.t !== BURACO));
  while (out[0]?.t === BURACO) out.shift();
  while (out.at(-1)?.t === BURACO) out.pop();
  return out;
}

function kumitate(): Fala[] {
  const out: Fala[] = [];
  for (const point of COURSE.points) {
    // A peça nova dita sozinha na lição falada (は soa わ): o kana, na voz de palavra.
    const peca = LICOES_FALADAS[point.id]?.peca;
    if (peca) out.push({ texto: peca, voz: VOZ_PALAVRA, tts: peca, partes: [{ t: peca }], origem: `kumitate/${point.id}/peca` });
    const frases = [point.example.jp, ...point.sentences.map((s) => s.jp)];
    frases.forEach((markup, i) => {
      // O exemplo da lição usa só a primeira resposta de cada buraco.
      const prontas = i === 0 ? montagens(markup).slice(0, 1) : montagens(markup);
      for (const partes of prontas) out.push({ texto: juntar(partes), voz: VOZ_PADRAO, tts: juntar(partes), partes, origem: `kumitate/${point.id}/${i}` });
      if (i === 0) return;
      for (const cheia of metades(markup, point.roles)) {
        const partes = tirarPausasSobrando(cheia);
        out.push({ texto: semBuraco(partes), voz: VOZ_PADRAO, tts: juntar(partes), partes, origem: `kumitate/${point.id}/${i}/metade` });
      }
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
    // Palavras novas do resumo: o botão de ouvir fala o kana.
    for (const t of cena.vocabulario) out.push(palavra(t, `conversa/${cena.id}/palavra`));
  }
  return out;
}

/**
 * Japonês das lições da Jornada e das aulas do modo Ouvir. Palavra solta e kanji sozinho
 * vão como nos jogos (chave no kana, ou no kanji); kana solto (uma partícula dita sozinha)
 * vai como os kana. Frase vai palavra por palavra: cada bloco da marcação da escola-japones
 * com kanji leva a leitura dele.
 */
function falaDoQuadro(f: FalaQuadro | FalaJp, origem: string): Fala {
  const palavraDoQuadro = 'palavra' in f ? f.palavra : undefined;
  if (palavraDoQuadro) {
    const { jp, kana } = palavraDoQuadro;
    return { texto: f.texto, voz: VOZ_PALAVRA, tts: hasKanji(jp) ? jp : kana, partes: [hasKanji(jp) ? { t: jp, r: kataToHira(kana) } : { t: kana }], palavra: { jp, kana }, origem };
  }
  if (f.voz === 'palavra') {
    if (hasKanji(f.texto)) throw new Error(`palavra com kanji sem leitura: ${f.texto}`);
    return { texto: f.texto, voz: VOZ_PALAVRA, tts: f.texto, partes: [{ t: f.texto }], origem };
  }
  const marcadoDoQuadro = 'marcado' in f ? f.marcado : undefined;
  // A marcação não põe espaço depois de 、 e 。: a pontuação vira parte própria, e cada
  // pedaço entre ela é uma palavra (今、電話 são duas, cada uma com a sua leitura).
  const partes: Parte[] = [];
  for (const segs of palavrasMarcadas(marcadoDoQuadro ?? f.texto)) {
    let t = '';
    let r = '';
    const fechar = () => {
      if (t) partes.push(hasKanji(t) ? { t, r: kataToHira(r) } : { t });
      t = '';
      r = '';
    };
    for (const s of segs) {
      if (s.leitura) {
        t += s.texto;
        r += s.leitura;
        continue;
      }
      for (const pedaco of s.texto.split(/([、。？！…]+)/)) {
        if (!pedaco) continue;
        if (/^[、。？！…]+$/.test(pedaco)) {
          fechar();
          partes.push({ t: pedaco });
        } else {
          t += pedaco;
          r += pedaco;
        }
      }
    }
    fechar();
  }
  return { texto: f.texto, voz: VOZ_PADRAO, tts: juntar(partes), partes, origem };
}

/**
 * Lições da Jornada: o quadro (e as palavras de exemplo do kanji), o japonês que a
 * pergunta mostra e o que toca depois da resposta.
 */
function jornada(): Fala[] {
  return LICOES.flatMap((l) =>
    l.passos.flatMap((p) => {
      const falas =
        p.tipo === 'quadro' ? [p.fala, ...(p.falasExemplos ?? [])] : p.tipo === 'pergunta' ? [p.fala, p.falaResposta] : [p.falaResposta];
      return falas.filter((f): f is FalaQuadro => !!f).map((f) => falaDoQuadro(f, 'jornada/' + l.id));
    }),
  );
}

/** O japonês das aulas do modo Ouvir (quase tudo já é dos jogos; o resto é novo). */
function aulas(): Fala[] {
  return AULAS.flatMap((a) => a.trechos.flatMap((t) => (t.tipo === 'jp' ? [falaDoQuadro(t.fala, 'ouvir/' + a.id)] : [])));
}

/**
 * Kanji em peças: a leitura de cada kanji sozinho e a palavra de exemplo. As duas ficam
 * gravadas no texto com kanji, porque o kana se repete (日 e 火 são ひ; 着る e 切る são きる).
 */
function pecas(): Fala[] {
  return KANJI_PECAS.flatMap((k): Fala[] => [
    {
      texto: k.kanji,
      voz: VOZ_PALAVRA,
      tts: k.kanji,
      partes: [{ t: k.kanji, r: leituraOficial(k) }],
      palavra: { jp: k.kanji, kana: leituraOficial(k) },
      origem: 'pecas/kanji',
    },
    {
      texto: k.palavra.jp,
      voz: VOZ_PALAVRA,
      tts: k.palavra.jp,
      partes: [{ t: k.palavra.jp, r: kataToHira(k.palavra.kana) }],
      palavra: { jp: k.palavra.jp, kana: k.palavra.kana },
      origem: 'pecas/palavra',
    },
  ]);
}

/** Frase da Cena Viva: cada pedaço com kanji leva a leitura que a tela mostra. */
function falaCena(segs: readonly Seg[], origem: string): Fala {
  const partes: Parte[] = segs.map((x) => (x.r ? { t: x.t, r: kataToHira(x.r) } : { t: x.t }));
  return { texto: juntar(partes), voz: VOZ_PADRAO, tts: juntar(partes), partes, origem };
}

/**
 * Cena Viva: o pedido de cada tarefa, a frase de "descrever" em cada pedaço montado (tecla R
 * no meio da montagem) e o nome que cada coisa diz quando é clicada.
 */
function cena(): Fala[] {
  const out: Fala[] = [];
  for (const l of LUGARES) {
    for (const e of ETAPAS) {
      for (const t of tarefas(l, e)) {
        const origem = `cena/${l.id}/${e}`;
        const n = t.pecas ? t.pecas.certas.length : 0;
        for (let m = 0; m <= n; m++) {
          if (!falaDaTarefa(t, m)) continue;
          // "nome": a pergunta (これはなんですか？) antes, e a frase com o nome depois do acerto.
          if (t.marcada) out.push(falaCena(PERGUNTA_NOME, origem));
          out.push(falaCena(t.pecas ? t.pecas.certas.slice(0, m) : t.segs, origem));
        }
      }
    }
    for (const c of l.coisas) {
      const nome = nomeDe(c);
      const f = falaDoNome(nome);
      // Palavra solta já entra pelas figuras, com a chave no kana.
      if (f.palavra && f.texto !== daCoisa(c).figura.word.kana) throw new Error(`nome fora do kana da palavra: ${c.img}`);
      if (!f.palavra) out.push(falaCena(nome, `cena/${l.id}/nome`));
    }
  }
  return out;
}

/**
 * Cena Viva: a peça nova de cada lição de etapa, dita sozinha. O exemplo da lição é uma
 * pergunta da própria cena (já gravada em cena()).
 */
function cenaEtapas(): Fala[] {
  return pecasDasEtapas().map(({ etapa, peca }) => falaDoQuadro({ texto: peca, voz: 'palavra', kana: peca }, `cena/etapa/${etapa}`));
}

/** Aprofundar: o japonês de cada ficha (quase tudo já é dos jogos; o resto é novo). */
/** Exemplos de gramática do curso: cada peça já vem com a leitura certa. */
function falaDoExemploDoCurso(e: Exemplo, origem: string): Fala {
  const partes: Parte[] = e.pecas.map((p) => (hasKanji(p.t) ? { t: p.t, r: p.kana } : { t: p.t }));
  partes.push({ t: e.jp.slice(-1) });
  return { texto: e.jp, voz: VOZ_PADRAO, tts: e.jp, partes, origem };
}

/** Os exemplos de gramática e as frases da leitura graduada de cada unidade. */
function exemplosDoCurso(): Fala[] {
  return UNIDADES.flatMap((u) => [
    ...exemplosDaUnidade(u).map((e) => falaDoExemploDoCurso(e, `curso/${u.id}/exemplo/${e.ponto}`)),
    ...(leituraDa(u)?.frases ?? []).map((e) => falaDoExemploDoCurso(e, `curso/${u.id}/leitura`)),
    ...(dialogoDa(u)?.falas ?? []).map((e) => falaDoExemploDoCurso(e, `curso/${u.id}/dialogo`)),
  ]);
}

function aprofundar(): Fala[] {
  return todosOsAlvos().flatMap((a) => {
    const f = fichaDe(a);
    return f ? falasDaFicha(f).map((x) => falaDoQuadro(x, `aprofundar/${a.t}`)) : [];
  });
}

/** Lista sem repetição (mesmo texto na mesma voz entra uma vez só). */
export function listarFalas(): Fala[] {
  const todas: Fala[] = [
    ...WORDS.map((w) => palavra(w, 'conteudo/palavra')),
    // Kanji sozinho na carta: a chave é o kanji (日 e 火 são os dois ひ, com acento diferente).
    ...KANJI.map((k): Fala => ({
      texto: k.kanji,
      voz: VOZ_PALAVRA,
      tts: k.kanji,
      partes: [{ t: k.kanji, r: k.reading }],
      palavra: { jp: k.kanji, kana: k.reading },
      origem: 'conteudo/kanji',
    })),
    ...DAILY_WORDS.map((w) => palavra(w, 'conteudo/vida')),
    ...JORNADA_WORDS.map((w) => palavra(w, 'conteudo/escola')),
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
    // Kana em imagens: as letras que o Kana Beat não tem (ぢ, ファ, ヴ...), o exemplo de cada kana
    // e as palavras da leitura relâmpago. っ e ー não soam sozinhos: a fala deles é o exemplo.
    ...KANA_IMAGENS.flatMap((k): Fala[] => [
      ...(k.fala === k.char ? [{ texto: k.char, voz: VOZ_PALAVRA, tts: k.char, partes: [{ t: k.char }], origem: 'kana/letra' }] : []),
      palavra(k.exemplo, 'kanaimagens/exemplo'),
    ]),
    ...PALAVRAS_KATAKANA.map((p) => palavra({ jp: p.kana, kana: p.kana }, 'kanaimagens/palavra')),
    ...aventura(SCENES),
    ...kumitate(),
    ...conversa(),
    ...jornada(),
    ...aulas(),
    ...pecas(),
    // Memória e Cena Viva: o nome de cada figura, na voz de palavra (chave no kana).
    ...FIGURAS.map((f) => palavra(f.word, 'imagens/figura')),
    ...IMAGEM_WORDS.map((w) => palavra(w, 'imagens/palavra')),
    ...cena(),
    // Curso: as palavras do currículo (os cartões de palavra e de kanji falam a palavra).
    ...falasDoCurso().jp.map((f) => palavra(f.palavra, f.origem)),
    ...exemplosDoCurso(),
    // Aula do curso: a palavra japonesa no meio da fala do professor, na voz de palavra.
    ...Object.entries(AULAS_DO_CURSO).flatMap(([id, aula]) =>
      aula.flatMap((q) => partesDaFala(q.fala).flatMap((p) => ('jp' in p ? [falaDoQuadro({ texto: p.kana, voz: 'palavra', kana: p.kana }, `curso/${id}/aula`)] : []))),
    ),
    ...cenaEtapas(),
    ...aprofundar(),
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
