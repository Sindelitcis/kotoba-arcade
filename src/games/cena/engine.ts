/**
 * Cena Viva: lugares do Japão com objetos clicáveis. Regras puras, sem tela.
 *
 * Cada lugar é um fundo desenhado com objetos por cima (as mesmas figuras da Memória).
 * Cada objeto sabe onde está em relação a outro (em cima, embaixo, ao lado, na frente, dentro).
 * As instruções saem desses dados, então toda instrução tem resposta, e os testes conferem
 * que a resposta é exatamente o conjunto de objetos que a frase descreve.
 *
 * Etapas, do N5 ao N3:
 *   achar     傘はどこ？
 *   cor       赤い傘はどこ？
 *   tamanho   大きいかばんはどこ？
 *   lugar     机の上の本はどこ？
 *   contar    りんごが三つあるところはどこ？
 *   acao      本を読んでいる人... (読んでいる人はどこ？)
 *   denso     テーブルの上にある赤いかばん / 左から二番目のコップ / いちばん小さい箱
 *   descrever montar a frase: 机の上に本があります
 */
import { cardKey, type Word } from '../../content';
import { BASE_COLORIDA, CORES, figura, PALAVRAS_COR, type Contador, type CorId, type Figura } from '../../content/imagens';
import { hasKanji } from '../../core/kana';
import { pickNext } from '../../core/picker';
import { levelInfo } from '../../core/progress';
import { pick, shuffle, type Rng } from '../../core/rng';
import type { Profile } from '../../core/save';
import { review, type CardState } from '../../core/srs';

// ───────── Dados da cena ─────────

export type Rel = 'ue' | 'shita' | 'yoko' | 'mae' | 'naka';

export interface Coisa {
  id: string;
  /** Imagem: figura de objeto (hon, kasa-ao) ou de ação (yomu). */
  img: string;
  /** Centro horizontal, em % da largura da cena. */
  x: number;
  /** Base (onde a coisa encosta), em % da altura da cena. */
  y: number;
  /** Largura, em % da largura da cena. */
  w: number;
  rel?: Rel;
  /** Id da coisa de referência da relação. */
  de?: string;
  /** Desenhada por cima das outras (padrão: pela base, quem está mais embaixo fica na frente). */
  z?: number;
  /** Espelhar na horizontal. */
  vira?: boolean;
}

export interface Lugar {
  id: string;
  /** Imagem do fundo (src/assets/lugares). */
  fundo: string;
  jp: string;
  kana: string;
  pt: string;
  coisas: Coisa[];
}

export const REL: Readonly<Record<Rel, { jp: string; kana: string; pt: string }>> = {
  ue: { jp: '上', kana: 'うえ', pt: 'em cima de' },
  shita: { jp: '下', kana: 'した', pt: 'embaixo de' },
  yoko: { jp: '横', kana: 'よこ', pt: 'ao lado de' },
  mae: { jp: '前', kana: 'まえ', pt: 'na frente de' },
  naka: { jp: '中', kana: 'なか', pt: 'dentro de' },
};

const SUFIXO_COR = new RegExp(`^(.+)-(${CORES.map((c) => c.id).join('|')})$`);

/** A figura (palavra) e a cor de uma coisa. */
export function daCoisa(c: Coisa): { figura: Figura; cor?: CorId } {
  const m = SUFIXO_COR.exec(c.img);
  if (m && BASE_COLORIDA.has(m[1]!)) return { figura: figura(m[1]!), cor: m[2] as CorId };
  return { figura: figura(c.img) };
}

export const palavraDe = (c: Coisa): Word => daCoisa(c).figura.word;
const ehPessoa = (c: Coisa) => daCoisa(c).figura.tipo === 'acao';
/** Gente e bicho "います"; coisa "あります". Gente parada (o médico, a avó) também vive, mas fica no lugar como as coisas. */
export const vive = (c: Coisa) => ehPessoa(c) || ['hiki', 'nin'].includes(daCoisa(c).figura.contador) || palavraDe(c).id === 'w:鳥';

// ───────── Texto da instrução ─────────

/** Pedaço de frase: texto e, se tiver kanji, a leitura (furigana). */
export interface Seg {
  t: string;
  r?: string;
}

const seg = (t: string, r?: string): Seg => (r && hasKanji(t) ? { t, r } : { t });
const segW = (w: { jp: string; kana: string }): Seg => seg(w.jp, w.kana);
/** Pessoa da cena: 人. */
const HITO: Seg = { t: '人', r: 'ひと' };

export const textoDe = (s: readonly Seg[]) => s.map((x) => x.t).join('');
export const kanaDe = (s: readonly Seg[]) => s.map((x) => x.r ?? x.t).join('');

/**
 * O que a cena diz agora: a pergunta inteira, ou em "descrever" só o pedaço já montado
 * (falar a frase toda entregaria a resposta). Nada montado ainda = nada a dizer.
 */
export function falaDaTarefa(t: Tarefa, montadas: number): string | null {
  if (!t.pecas) return textoDe(t.segs);
  return montadas > 0 ? textoDe(t.pecas.certas.slice(0, montadas)) : null;
}

/** O nome de uma coisa em voz: palavra solta na voz de palavra (chave no kana); pessoa (読んでいる人) como frase. */
export function falaDoNome(nome: readonly Seg[]): { texto: string; palavra: boolean } {
  return nome.length === 1 ? { texto: nome[0]!.r ?? nome[0]!.t, palavra: true } : { texto: textoDe(nome), palavra: false };
}

const NUM = ['', '一', '二', '三', '四', '五'];
const LEITURA_CONTADOR: Readonly<Record<Contador, readonly string[]>> = {
  tsu: ['', 'ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ'],
  hon: ['', 'いっぽん', 'にほん', 'さんぼん', 'よんほん', 'ごほん'],
  mai: ['', 'いちまい', 'にまい', 'さんまい', 'よんまい', 'ごまい'],
  hiki: ['', 'いっぴき', 'にひき', 'さんびき', 'よんひき', 'ごひき'],
  dai: ['', 'いちだい', 'にだい', 'さんだい', 'よんだい', 'ごだい'],
  satsu: ['', 'いっさつ', 'にさつ', 'さんさつ', 'よんさつ', 'ごさつ'],
  ko: ['', 'いっこ', 'にこ', 'さんこ', 'よんこ', 'ごこ'],
  nin: ['', 'ひとり', 'ふたり', 'さんにん', 'よにん', 'ごにん'],
};
const ESCRITA_CONTADOR: Readonly<Record<Contador, string>> = { tsu: 'つ', hon: '本', mai: '枚', hiki: '匹', dai: '台', satsu: '冊', ko: '個', nin: '人' };

/** 三本 (さんぼん), 二つ (ふたつ), 一人 (ひとり). */
export function contagem(n: number, c: Contador): Seg {
  const leitura = LEITURA_CONTADOR[c][n];
  if (!leitura) throw new Error(`contagem fora da tabela: ${n} ${c}`);
  return { t: `${NUM[n]}${ESCRITA_CONTADOR[c]}`, r: leitura };
}

const ORDINAL = ['', '一番目', '二番目', '三番目', '四番目'];
const ORDINAL_KANA = ['', 'いちばんめ', 'にばんめ', 'さんばんめ', 'よんばんめ'];

// ───────── Tarefas ─────────

export const ETAPAS = ['achar', 'cor', 'tamanho', 'lugar', 'contar', 'acao', 'denso', 'descrever'] as const;
export type Etapa = (typeof ETAPAS)[number];

export const ETAPA_INFO: Readonly<Record<Etapa, { titulo: string; nivel: string; licao: string; exemplo: readonly Seg[]; exemploPt: string }>> = {
  achar: { titulo: 'Ache o objeto', nivel: 'N5', licao: 'Clique no que a frase pede. Palavra nova aparece brilhando, com o nome e a voz.', exemplo: [seg('傘', 'かさ'), { t: 'はどこ？' }], exemploPt: 'Onde está o guarda-chuva?' },
  cor: { titulo: 'Cores', nivel: 'N5', licao: 'A cor vem antes da coisa, como em "vermelho guarda-chuva": 赤い傘. Os adjetivos de cor terminam em い.', exemplo: [seg('赤い', 'あかい'), seg('傘', 'かさ'), { t: 'はどこ？' }], exemploPt: 'Onde está o guarda-chuva vermelho?' },
  tamanho: { titulo: 'Grande e pequeno', nivel: 'N5', licao: '大きい (おおきい) é grande, 小さい (ちいさい) é pequeno. Também vêm antes da coisa.', exemplo: [seg('大きい', 'おおきい'), { t: 'かばんはどこ？' }], exemploPt: 'Onde está a bolsa grande?' },
  lugar: { titulo: 'Onde está', nivel: 'N5', licao: 'O japonês diz o lugar primeiro: 机の上の本 é "o livro de cima da mesa". 上 em cima, 下 embaixo, 横 ao lado, 前 na frente, 中 dentro.', exemplo: [seg('机', 'つくえ'), { t: 'の' }, seg('上', 'うえ'), { t: 'の' }, seg('本', 'ほん'), { t: 'はどこ？' }], exemploPt: 'Onde está o livro em cima da mesa?' },
  contar: { titulo: 'Contadores', nivel: 'N5', licao: 'Para contar, o número leva um contador: つ para coisas em geral, 本 para coisas compridas, 枚 para coisas finas, 匹 para bichos pequenos, 台 para máquinas e veículos, 冊 para livros, 人 para gente.', exemplo: [{ t: 'りんごが' }, seg('三つ', 'みっつ'), { t: 'あるところはどこ？' }], exemploPt: 'Onde estão as três maçãs?' },
  acao: { titulo: 'Quem está fazendo', nivel: 'N4', licao: 'Verbo na forma て + いる é o que está acontecendo agora: 読んでいる = está lendo. Antes de 人 (pessoa), descreve a pessoa: 読んでいる人 = a pessoa que está lendo.', exemplo: [seg('読んでいる', 'よんでいる'), HITO, { t: 'はどこ？' }], exemploPt: 'Onde está a pessoa que está lendo?' },
  denso: { titulo: 'Frases longas', nivel: 'N4–N3', licao: 'Tudo junto: o lugar, a cor e a coisa, sempre do detalhe para o nome. にある = "que está em". 左から二番目 = o segundo a partir da esquerda. いちばん = o mais.', exemplo: [{ t: 'テーブルの' }, seg('上', 'うえ'), { t: 'にある' }, seg('赤い', 'あかい'), { t: 'かばんはどこ？' }], exemploPt: 'Onde está a bolsa vermelha que está em cima da mesa?' },
  descrever: { titulo: 'Descreva a cena', nivel: 'N4–N3', licao: 'Agora é você quem fala: monte a frase sobre a coisa marcada. Lugar + に + coisa + が + あります. Gente e bicho usam います.', exemplo: [seg('机', 'つくえ'), { t: 'の' }, seg('上', 'うえ'), { t: 'に' }, seg('本', 'ほん'), { t: 'があります' }], exemploPt: 'Tem um livro em cima da mesa.' },
};

export interface Tarefa {
  etapa: Etapa;
  /** A pergunta (ou, em "descrever", a frase pronta). */
  segs: Seg[];
  /** Coisas que respondem certo. */
  alvo: string[];
  /** Palavras que levam nota. */
  palavras: Word[];
  /** Em "descrever": as peças na ordem certa e as que sobram. */
  pecas?: { certas: Seg[]; sobras: Seg[] };
}

const PERGUNTA: Seg = { t: 'はどこ？' };

function porPalavra(l: Lugar): Map<string, Coisa[]> {
  const m = new Map<string, Coisa[]>();
  for (const c of l.coisas) {
    const id = palavraDe(c).id;
    m.set(id, [...(m.get(id) ?? []), c]);
  }
  return m;
}

const achaCoisa = (l: Lugar, id: string | undefined) => l.coisas.find((c) => c.id === id);
const mesmoConjunto = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Frase do sujeito: pessoa vira "読んでいる人"; coisa vira a palavra. */
/** Como a cena chama uma coisa: a palavra, ou a pessoa pelo que ela faz (読んでいる人). */
export function nomeDe(c: Coisa): Seg[] {
  const f = daCoisa(c).figura;
  if (f.tipo === 'acao' && f.te) return [seg(`${f.te.jp}いる`, `${f.te.kana}いる`), HITO];
  return [segW(f.word)];
}

/** Grupos para contar: mesma palavra, mesma relação com a mesma coisa. */
export function grupos(l: Lugar): Coisa[][] {
  const m = new Map<string, Coisa[]>();
  for (const c of l.coisas) {
    if (!c.rel || !c.de || ehPessoa(c)) continue;
    const k = `${palavraDe(c).id}|${c.rel}|${c.de}`;
    m.set(k, [...(m.get(k) ?? []), c]);
  }
  return [...m.values()];
}

/** Todas as tarefas válidas de uma etapa num lugar, em ordem fixa. */
export function tarefas(l: Lugar, etapa: Etapa): Tarefa[] {
  const out: Tarefa[] = [];
  const pp = porPalavra(l);
  const objetos = l.coisas.filter((c) => !ehPessoa(c));
  const ids = (cs: readonly Coisa[]) => cs.map((c) => c.id);

  if (etapa === 'achar') {
    for (const [, cs] of pp) {
      if (ehPessoa(cs[0]!)) continue;
      const w = palavraDe(cs[0]!);
      out.push({ etapa, segs: [segW(w), PERGUNTA], alvo: ids(cs), palavras: [w] });
    }
  }

  if (etapa === 'cor') {
    for (const [, cs] of pp) {
      for (const cor of CORES) {
        const com = cs.filter((c) => daCoisa(c).cor === cor.id);
        if (com.length === 0 || com.length === cs.length) continue;
        const w = palavraDe(cs[0]!);
        out.push({ etapa, segs: [segW(cor), segW(w), PERGUNTA], alvo: ids(com), palavras: [PALAVRAS_COR[cor.id], w] });
      }
    }
  }

  if (etapa === 'tamanho') {
    for (const [, cs] of pp) {
      if (cs.length < 2 || ehPessoa(cs[0]!)) continue;
      const w = palavraDe(cs[0]!);
      const ord = [...cs].sort((a, b) => a.w - b.w);
      const menor = ord[0]!;
      const maior = ord[ord.length - 1]!;
      // Só vale com diferença clara: o maior com pelo menos 1,4 vez a largura do seguinte.
      if (maior.w >= ord[ord.length - 2]!.w * 1.4) out.push({ etapa, segs: [seg('大きい', 'おおきい'), segW(w), PERGUNTA], alvo: [maior.id], palavras: [w] });
      if (ord[1]!.w >= menor.w * 1.4) out.push({ etapa, segs: [seg('小さい', 'ちいさい'), segW(w), PERGUNTA], alvo: [menor.id], palavras: [w] });
    }
  }

  if (etapa === 'lugar') {
    const vistos = new Set<string>();
    for (const c of l.coisas) {
      const ref = achaCoisa(l, c.de);
      if (!c.rel || !ref) continue;
      const w = palavraDe(c);
      const wr = palavraDe(ref);
      const k = `${w.id}|${c.rel}|${wr.id}`;
      if (vistos.has(k)) continue;
      vistos.add(k);
      const alvo = l.coisas.filter((o) => palavraDe(o).id === w.id && o.rel === c.rel && o.de && palavraDe(achaCoisa(l, o.de)!).id === wr.id);
      const r = REL[c.rel];
      out.push({ etapa, segs: [...nomeDe(ref), { t: 'の' }, segW(r), { t: 'の' }, ...nomeDe(c), PERGUNTA], alvo: ids(alvo), palavras: [w] });
    }
  }

  if (etapa === 'contar') {
    const gs = grupos(l);
    for (const g of gs) {
      const w = palavraDe(g[0]!);
      const f = daCoisa(g[0]!).figura;
      const n = g.length;
      if (n > 5) continue;
      // A contagem precisa decidir: outro grupo da mesma coisa com outro número.
      const outros = gs.filter((o) => o !== g && palavraDe(o[0]!).id === w.id);
      if (!outros.some((o) => o.length !== n)) continue;
      if (outros.some((o) => o.length === n)) continue;
      out.push({ etapa, segs: [segW(w), { t: 'が' }, contagem(n, f.contador), { t: 'あるところ' }, PERGUNTA], alvo: ids(g), palavras: [w] });
    }
  }

  if (etapa === 'acao') {
    for (const [, cs] of pp) {
      if (!ehPessoa(cs[0]!)) continue;
      out.push({ etapa, segs: [...nomeDe(cs[0]!), PERGUNTA], alvo: ids(cs), palavras: [palavraDe(cs[0]!)] });
    }
  }

  if (etapa === 'denso') {
    // 1. Lugar + にある + cor + coisa.
    for (const c of objetos) {
      const ref = achaCoisa(l, c.de);
      const cor = daCoisa(c).cor;
      if (!c.rel || !ref || !cor) continue;
      const w = palavraDe(c);
      const alvo = objetos.filter((o) => palavraDe(o).id === w.id && daCoisa(o).cor === cor && o.rel === c.rel && o.de && palavraDe(achaCoisa(l, o.de)!).id === palavraDe(ref).id);
      // Só vale se o lugar e a cor, juntos, forem necessários.
      const soCor = objetos.filter((o) => palavraDe(o).id === w.id && daCoisa(o).cor === cor);
      const soLugar = objetos.filter((o) => palavraDe(o).id === w.id && o.rel === c.rel && o.de === c.de);
      if (mesmoConjunto(ids(alvo), ids(soCor)) || mesmoConjunto(ids(alvo), ids(soLugar))) continue;
      const corW = PALAVRAS_COR[cor];
      const t: Tarefa = { etapa, segs: [...nomeDe(ref), { t: 'の' }, segW(REL[c.rel]), { t: 'にある' }, segW(corW), segW(w), PERGUNTA], alvo: ids(alvo), palavras: [corW, w] };
      if (!out.some((o) => textoDe(o.segs) === textoDe(t.segs))) out.push(t);
    }
    // 2. 左から N番目 (três ou mais iguais em fila, sem empate de posição).
    for (const [, cs] of pp) {
      if (cs.length < 3 || ehPessoa(cs[0]!)) continue;
      const ord = [...cs].sort((a, b) => a.x - b.x);
      if (ord.some((c, i) => i > 0 && c.x - ord[i - 1]!.x < 3)) continue;
      const w = palavraDe(cs[0]!);
      for (let n = 2; n <= Math.min(3, ord.length); n++) {
        out.push({ etapa, segs: [seg('左', 'ひだり'), { t: 'から' }, seg(ORDINAL[n]!, ORDINAL_KANA[n]), { t: 'の' }, segW(w), PERGUNTA], alvo: [ord[n - 1]!.id], palavras: [w] });
      }
    }
    // 3. いちばん大きい / いちばん小さい (três ou mais).
    for (const [, cs] of pp) {
      if (cs.length < 3 || ehPessoa(cs[0]!)) continue;
      const ord = [...cs].sort((a, b) => a.w - b.w);
      const w = palavraDe(cs[0]!);
      if (ord[ord.length - 1]!.w >= ord[ord.length - 2]!.w * 1.3) out.push({ etapa, segs: [{ t: 'いちばん' }, seg('大きい', 'おおきい'), segW(w), PERGUNTA], alvo: [ord[ord.length - 1]!.id], palavras: [w] });
      if (ord[1]!.w >= ord[0]!.w * 1.3) out.push({ etapa, segs: [{ t: 'いちばん' }, seg('小さい', 'ちいさい'), segW(w), PERGUNTA], alvo: [ord[0]!.id], palavras: [w] });
    }
    // 4. Lugar + で + pessoa fazendo algo.
    for (const c of l.coisas) {
      const ref = achaCoisa(l, c.de);
      if (!ehPessoa(c) || !c.rel || !ref) continue;
      const f = daCoisa(c).figura;
      out.push({ etapa, segs: [...nomeDe(ref), { t: 'の' }, segW(REL[c.rel]), { t: 'で' }, seg(`${f.te!.jp}いる`, `${f.te!.kana}いる`), HITO, PERGUNTA], alvo: [c.id], palavras: [f.word] });
    }
  }

  if (etapa === 'descrever') {
    for (const c of l.coisas) {
      const ref = achaCoisa(l, c.de);
      if (!c.rel || !ref || ehPessoa(ref)) continue;
      const w = palavraDe(c);
      const sujeito = ehPessoa(c) ? [HITO] : nomeDe(c);
      const verbo: Seg = { t: vive(c) ? 'います' : 'あります' };
      const certas: Seg[] = [...nomeDe(ref), { t: 'の' }, segW(REL[c.rel]), { t: 'に' }, ...sujeito, { t: 'が' }, verbo];
      const outraRel = (Object.keys(REL) as Rel[]).find((r) => r !== c.rel && r !== 'naka')!;
      const sobras: Seg[] = [segW(REL[outraRel]), { t: 'を' }, { t: vive(c) ? 'あります' : 'います' }];
      const t: Tarefa = { etapa, segs: certas, alvo: [c.id], palavras: [w], pecas: { certas, sobras } };
      // Frase igual para duas coisas (dois livros no mesmo lugar) vale uma vez só.
      if (!out.some((o) => textoDe(o.segs) === textoDe(t.segs))) out.push(t);
    }
  }
  return out;
}

/** Valida um lugar: devolve uma lista de problemas (vazia = tudo certo). */
export function validarLugar(l: Lugar): string[] {
  const erros: string[] = [];
  const ids = new Set<string>();
  for (const c of l.coisas) {
    if (ids.has(c.id)) erros.push(`${l.id}: id repetido ${c.id}`);
    ids.add(c.id);
    try {
      daCoisa(c);
    } catch {
      erros.push(`${l.id}: imagem sem figura ${c.img}`);
    }
    if (c.rel && !c.de) erros.push(`${l.id}: ${c.id} tem relação sem referência`);
    if (c.de && !l.coisas.some((o) => o.id === c.de)) erros.push(`${l.id}: ${c.id} aponta para ${c.de}, que não existe`);
    if (c.de === c.id) erros.push(`${l.id}: ${c.id} aponta para si mesmo`);
    if (c.x < 0 || c.x > 100 || c.y < 0 || c.y > 100 || c.w <= 0 || c.w > 60) erros.push(`${l.id}: ${c.id} fora da cena`);
  }
  return erros;
}

// ───────── Navegação pelo teclado ─────────

export type Direcao = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

/** Centro aproximado de uma coisa (a altura vem das medidas da imagem). */
export interface Caixa {
  id: string;
  cx: number;
  cy: number;
}

/**
 * A coisa mais próxima na direção da seta. Ganha quem está mais perto no eixo da seta,
 * com o desvio lateral pesando o dobro. Sem ninguém naquela direção, fica onde está.
 */
export function vizinho(caixas: readonly Caixa[], de: string | null, dir: Direcao): string | null {
  if (caixas.length === 0) return null;
  const atual = caixas.find((c) => c.id === de);
  if (!atual) {
    const ord = [...caixas].sort((a, b) => a.cx - b.cx || a.cy - b.cy);
    return dir === 'ArrowLeft' || dir === 'ArrowUp' ? ord[ord.length - 1]!.id : ord[0]!.id;
  }
  let melhor: Caixa | null = null;
  let custo = Infinity;
  for (const c of caixas) {
    if (c === atual) continue;
    const dx = c.cx - atual.cx;
    const dy = c.cy - atual.cy;
    const [frente, lado] = dir === 'ArrowRight' ? [dx, dy] : dir === 'ArrowLeft' ? [-dx, dy] : dir === 'ArrowDown' ? [dy, dx] : [-dy, dx];
    if (frente <= 0.5) continue;
    const k = frente + 2 * Math.abs(lado);
    if (k < custo) {
      custo = k;
      melhor = c;
    }
  }
  return melhor ? melhor.id : atual.id;
}

// ───────── Save ─────────

export interface CenaSave {
  /** Etapas destravadas (começa em 1: só "achar"). */
  etapas: number;
  /** Acertos de primeira por etapa: abrem a próxima. */
  acertos: Record<string, number>;
  /** Etapas cuja lição já foi vista. */
  licoes: string[];
  /** Rodadas jogadas em cada lugar. */
  lugares: Record<string, number>;
  rounds: number;
  best: number;
}

export function emptyCenaSave(): CenaSave {
  return { etapas: 1, acertos: {}, licoes: [], lugares: {}, rounds: 0, best: 0 };
}

const isCount = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;

function tabela(x: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof x === 'object' && x !== null && !Array.isArray(x)) for (const [k, v] of Object.entries(x)) if (isCount(v)) out[k] = Math.floor(v);
  return out;
}

export function ensureCenaSave(games: Record<string, unknown>): CenaSave {
  const atual = games.cena;
  if (typeof atual !== 'object' || atual === null || Array.isArray(atual)) {
    const base = emptyCenaSave();
    games.cena = base;
    return base;
  }
  const s = atual as Record<string, unknown>;
  s.etapas = isCount(s.etapas) && s.etapas >= 1 ? Math.min(ETAPAS.length, Math.floor(s.etapas)) : 1;
  s.acertos = tabela(s.acertos);
  s.lugares = tabela(s.lugares);
  s.licoes = Array.isArray(s.licoes) ? s.licoes.filter((x): x is string => typeof x === 'string' && (ETAPAS as readonly string[]).includes(x)) : [];
  for (const k of ['rounds', 'best'] as const) if (!isCount(s[k])) s[k] = 0;
  return s as unknown as CenaSave;
}

// ───────── Rodada ─────────

export const TAREFAS_POR_RODADA = 8;
/** Acertos de primeira numa etapa para abrir a seguinte. */
export const ACERTOS_PARA_ABRIR = 5;
/** Cliques errados antes de o alvo brilhar. */
export const BRILHA_DEPOIS = 2;
export const RAPIDO_MS = 4000;
export const PONTOS = 10;
export const PONTOS_RAPIDO = 5;
export const XP_TAREFA = 2;
export const XP_RODADA = 10;
export const MOEDAS_RODADA = 5;

export const chave = (w: Word) => cardKey(w.id, 'meaning');

/** O lugar sugerido para a tecla Enter: o menos jogado, na ordem da lista. */
export function lugarSugerido(lugares: readonly Lugar[], save: CenaSave): Lugar {
  let melhor = lugares[0]!;
  for (const l of lugares) if ((save.lugares[l.id] ?? 0) < (save.lugares[melhor.id] ?? 0)) melhor = l;
  return melhor;
}

export type Evento =
  | { t: 'certo'; coisa: string; rapido: boolean; combo: number }
  | { t: 'outra'; coisa: string; nome: Seg[] }
  | { t: 'peca'; seg: Seg; completa: boolean }
  | { t: 'volta'; seg: Seg }
  | { t: 'abre'; etapa: Etapa }
  | { t: 'nivel'; level: number }
  | { t: 'fim'; resumo: Resumo };

export interface Resumo {
  tarefas: number;
  dePrimeira: number;
  pontos: number;
  bestCombo: number;
  novas: Word[];
  abertas: Etapa[];
  xp: number;
  moedas: number;
  recorde: boolean;
}

export interface Deps {
  lugar: Lugar;
  cards: Record<string, CardState>;
  profile: Profile;
  save: CenaSave;
  now: () => number;
  rng: Rng;
}

export type Fase = 'licao' | 'pergunta' | 'feita' | 'fim';

export class CenaRound {
  fase: Fase = 'pergunta';
  indice = 0;
  tarefa!: Tarefa;
  /** A tarefa ensina: palavra nunca vista ou primeira vez na etapa. O alvo brilha. */
  ensina = false;
  /** Cliques errados nesta tarefa. */
  erros = 0;
  /** Coisas já clicadas por engano (mostram o nome). */
  tentadas: string[] = [];
  /** Em "descrever": peças já encaixadas e a bandeja. */
  montadas: Seg[] = [];
  bandeja: Seg[] = [];
  pontos = 0;
  combo = 0;
  bestCombo = 0;
  resumo: Resumo | null = null;
  private desde = 0;
  private xp = 0;
  private dePrimeira = 0;
  private feitas = 0;
  private novas: Word[] = [];
  private abertas: Etapa[] = [];
  private usadas = new Set<string>();

  constructor(private deps: Deps) {
    this.proxima();
  }

  get lugar(): Lugar {
    return this.deps.lugar;
  }

  get etapasAbertas(): Etapa[] {
    return ETAPAS.slice(0, this.deps.save.etapas).filter((e) => tarefas(this.deps.lugar, e).length > 0);
  }

  /** Brilha: o alvo, quando a tarefa ensina ou depois de dois enganos. */
  brilha(id: string): boolean {
    return (this.ensina || this.erros >= BRILHA_DEPOIS) && this.tarefa.alvo.includes(id) && this.fase === 'pergunta';
  }

  /** Sorteia a etapa (a mais nova aberta com mais peso) e a tarefa, escolhendo a palavra pelo pickNext. */
  private sortear(): Tarefa {
    const { lugar, rng, cards, now, save } = this.deps;
    const abertas = this.etapasAbertas;
    const nova = abertas[abertas.length - 1]!;
    let etapa: Etapa = rng() < 0.55 || abertas.length === 1 ? nova : pick(rng, abertas);
    // A primeira tarefa de uma etapa nunca vista é dela, e vem com lição.
    const semLicao = abertas.find((e) => !save.licoes.includes(e));
    if (semLicao) etapa = semLicao;
    let lista = tarefas(lugar, etapa).filter((t) => !this.usadas.has(textoDe(t.segs)));
    if (lista.length === 0) lista = tarefas(lugar, etapa);
    // A palavra vem da memória compartilhada: o que venceu antes, novidade com calma.
    const porChave = new Map<string, Tarefa[]>();
    for (const t of lista) {
      const k = chave(t.palavras[t.palavras.length - 1]!);
      porChave.set(k, [...(porChave.get(k) ?? []), t]);
    }
    const p = pickNext([...porChave.keys()], cards, now(), rng, { maxYoung: 8 });
    return pick(rng, p ? porChave.get(p.key)! : lista);
  }

  private proxima(): void {
    const t = this.sortear();
    this.tarefa = t;
    this.usadas.add(textoDe(t.segs));
    this.erros = 0;
    this.tentadas = [];
    this.montadas = [];
    this.bandeja = t.pecas ? shuffle(this.deps.rng, [...t.pecas.certas, ...t.pecas.sobras]) : [];
    const { cards, save } = this.deps;
    const palavraNova = t.palavras.some((w) => !cards[chave(w)]);
    const etapaNova = !save.licoes.includes(t.etapa);
    this.ensina = palavraNova || etapaNova;
    this.fase = etapaNova ? 'licao' : 'pergunta';
    this.desde = this.deps.now();
  }

  /** Fechou a lição da etapa: vai para a pergunta (que ainda ensina, com o alvo brilhando). */
  comecar(): void {
    if (this.fase !== 'licao') return;
    if (!this.deps.save.licoes.includes(this.tarefa.etapa)) this.deps.save.licoes.push(this.tarefa.etapa);
    this.fase = 'pergunta';
    this.desde = this.deps.now();
  }

  /** Clique numa coisa da cena. */
  clicar(id: string): Evento[] {
    const ev: Evento[] = [];
    if (this.fase !== 'pergunta' || this.tarefa.pecas) return ev;
    const coisa = achaCoisa(this.deps.lugar, id);
    if (!coisa) return ev;
    if (this.tarefa.alvo.includes(id)) {
      this.acertou(ev, id);
      return ev;
    }
    // Errou: sem tela de erro. A coisa clicada diz o próprio nome, e isso também ensina.
    this.errou();
    if (!this.tentadas.includes(id)) this.tentadas.push(id);
    ev.push({ t: 'outra', coisa: id, nome: nomeDe(coisa) });
    return ev;
  }

  /** "Descrever": escolhe a peça `i` da bandeja. */
  peca(i: number): Evento[] {
    const ev: Evento[] = [];
    const t = this.tarefa;
    if (this.fase !== 'pergunta' || !t.pecas) return ev;
    const s = this.bandeja[i];
    if (!s) return ev;
    const esperada = t.pecas.certas[this.montadas.length]!;
    if (s.t === esperada.t) {
      this.montadas.push(s);
      this.bandeja.splice(i, 1);
      const completa = this.montadas.length === t.pecas.certas.length;
      ev.push({ t: 'peca', seg: s, completa });
      if (completa) this.acertou(ev, t.alvo[0]!);
      return ev;
    }
    this.errou();
    ev.push({ t: 'volta', seg: s });
    return ev;
  }

  /** A próxima peça certa (para brilhar depois de dois enganos). */
  get pecaCerta(): number {
    const t = this.tarefa;
    if (!t.pecas) return -1;
    const esperada = t.pecas.certas[this.montadas.length];
    return esperada ? this.bandeja.findIndex((s) => s.t === esperada.t) : -1;
  }

  private errou(): void {
    this.erros++;
    this.combo = 0;
    if (this.erros === 1 && !this.ensina) {
      for (const w of this.tarefa.palavras) this.notar(w, { correct: false });
    }
  }

  private notas = new Set<string>();
  private notar(w: Word, o: { correct: boolean; ms?: number; hinted?: boolean }): void {
    const k = chave(w);
    if (this.notas.has(k)) return;
    this.notas.add(k);
    const { cards, now } = this.deps;
    if (!cards[k] && !this.novas.includes(w)) this.novas.push(w);
    cards[k] = review(cards[k], o, now());
  }

  private acertou(ev: Evento[], id: string): void {
    const ms = this.deps.now() - this.desde;
    const limpo = this.erros === 0;
    const ajudado = this.ensina || this.erros >= BRILHA_DEPOIS;
    const rapido = limpo && !this.ensina && ms < RAPIDO_MS * (this.tarefa.pecas ? 3 : 1);
    this.feitas++;
    if (limpo) {
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.pontos += PONTOS + (rapido ? PONTOS_RAPIDO : 0) + Math.min(this.combo - 1, 5);
    } else this.pontos += Math.floor(PONTOS / 2);
    for (const w of this.tarefa.palavras) this.notar(w, { correct: true, ms, hinted: ajudado });
    ev.push({ t: 'certo', coisa: id, rapido, combo: this.combo });
    const s = this.deps.save;
    if (limpo && !this.ensina) {
      this.dePrimeira++;
      const e = this.tarefa.etapa;
      s.acertos[e] = (s.acertos[e] ?? 0) + 1;
      const i = ETAPAS.indexOf(e);
      if (i === s.etapas - 1 && s.acertos[e]! >= ACERTOS_PARA_ABRIR && s.etapas < ETAPAS.length) {
        s.etapas++;
        const aberta = ETAPAS[s.etapas - 1]!;
        this.abertas.push(aberta);
        ev.push({ t: 'abre', etapa: aberta });
      }
    }
    this.ganhar(XP_TAREFA, ev);
    this.fase = 'feita';
  }

  private ganhar(xp: number, ev: Evento[]): void {
    const p = this.deps.profile;
    const antes = levelInfo(p.xp).level;
    p.xp += xp;
    this.xp += xp;
    const depois = levelInfo(p.xp).level;
    if (depois > antes) ev.push({ t: 'nivel', level: depois });
  }

  /** Depois do acerto: a próxima tarefa, ou o fim da rodada. */
  seguir(): Evento[] {
    const ev: Evento[] = [];
    if (this.fase !== 'feita') return ev;
    this.indice++;
    if (this.indice >= TAREFAS_POR_RODADA) this.terminar(ev);
    else this.proxima();
    return ev;
  }

  /** Parar no meio: o que foi feito vale. */
  parar(): Evento[] {
    const ev: Evento[] = [];
    if (this.fase !== 'fim' && this.feitas > 0) this.terminar(ev);
    return ev;
  }

  private terminar(ev: Evento[]): void {
    this.ganhar(XP_RODADA, ev);
    const s = this.deps.save;
    const p = this.deps.profile;
    const moedas = MOEDAS_RODADA + Math.floor(this.pontos / 30);
    p.coins += moedas;
    s.rounds++;
    s.lugares[this.deps.lugar.id] = (s.lugares[this.deps.lugar.id] ?? 0) + 1;
    const recorde = this.pontos > s.best;
    if (recorde) s.best = this.pontos;
    this.fase = 'fim';
    this.resumo = { tarefas: this.feitas, dePrimeira: this.dePrimeira, pontos: this.pontos, bestCombo: this.bestCombo, novas: this.novas, abertas: this.abertas, xp: this.xp, moedas, recorde };
    ev.push({ t: 'fim', resumo: this.resumo });
  }
}
