/**
 * Regras do Kana em imagens, sem tela.
 *
 * Uma rodada tem até RODADA perguntas. Kana novo chega primeiro na apresentação comum
 * (core/ensino.ts: imagem, letra, som e a frase para lembrar) e só depois é perguntado. Enquanto
 * está em prática, a pergunta tem duas ou três alternativas, a imagem fica na tela e errar
 * não zera o combo. Conforme a carta
 * firma na memória, a pergunta fica mais seca: imagem → letra, letra → imagem, pares que
 * confundem e, por fim, só o som. Palavras inteiras em katakana aparecem quando todos os
 * kana delas já foram vistos. Erro não para nada: a resposta certa aparece com a imagem,
 * e o kana volta duas perguntas depois.
 *
 * As cartas são as mesmas do Kana Beat (`a:あ#reading`, `ak:ア#reading`).
 */
import {
  KANA_IMAGENS,
  LOTES,
  LOTE_DE,
  PALAVRAS_KATAKANA,
  kanaDaPalavra,
  kanaItem,
  type KanaItem,
  type PalavraKatakana,
  type Escrita,
} from '../../content/kana';
import { levelInfo } from '../../core/progress';
import { pickNext } from '../../core/picker';
import { shuffle, type Rng } from '../../core/rng';
import type { Profile } from '../../core/save';
import { apresentar, avaliar, emPratica, foiApresentado, notaDaPratica, opcoesPara } from '../../core/ensino';
import { masteryLevel, type CardState } from '../../core/srs';

export type Modo = 'apresenta' | 'imagem-letra' | 'letra-imagem' | 'pares' | 'som' | 'relampago' | 'leitura';

/** Os seis modos, na ordem em que aparecem conforme a pessoa avança. */
export const MODOS: readonly { modo: Exclude<Modo, 'leitura'>; nome: string; tecla: string }[] = [
  { modo: 'apresenta', nome: 'Aprender', tecla: '1' },
  { modo: 'imagem-letra', nome: 'Imagem → letra', tecla: '2' },
  { modo: 'letra-imagem', nome: 'Letra → imagem', tecla: '3' },
  { modo: 'pares', nome: 'Pares que confundem', tecla: '4' },
  { modo: 'som', nome: 'Só pelo som', tecla: '5' },
  { modo: 'relampago', nome: 'Leitura relâmpago', tecla: '6' },
];

/** Modos em que o som é a pista: toca logo que a pergunta aparece, e R repete antes de responder. */
export function somEhPista(modo: Modo): boolean {
  return modo === 'som' || modo === 'pares';
}

/** Perguntas por rodada (sem contar as apresentações). */
export const RODADA = 10;
/** Kana novos por rodada, no máximo. */
export const NOVOS_POR_RODADA = 3;
/** Acertos de primeira de cada kana do último lote aberto para o próximo abrir. */
export const ACERTOS_PARA_ABRIR = 2;
/** Resposta abaixo disso é "rápida": ganha mais e vale como fácil na memória. */
export const RAPIDO_MS = 2500;
/** Perguntas por bloco no teste de entrada. */
export const TESTE_POR_BLOCO = 4;

export interface KanaImagensSave {
  rodadas: number;
  /** Quantos lotes estão abertos (o primeiro sempre está). */
  abertos: number;
  recorde: number;
  /** Acertos de primeira por kana, só até ACERTOS_PARA_ABRIR. */
  acertos: Record<string, number>;
  /** Já fez o teste de entrada. */
  teste: boolean;
}

export function emptyKanaImagensSave(): KanaImagensSave {
  return { rodadas: 0, abertos: 1, recorde: 0, acertos: {}, teste: false };
}

export function ensureKanaImagensSave(games: Record<string, unknown>): KanaImagensSave {
  const cur = games.kanaimagens;
  if (typeof cur !== 'object' || cur === null || Array.isArray(cur)) {
    const fresh = emptyKanaImagensSave();
    games.kanaimagens = fresh;
    return fresh;
  }
  // Conserta no próprio objeto: quem já guardou a referência continua vendo o mesmo save.
  const s = cur as Partial<KanaImagensSave>;
  const inteiro = (v: unknown, min: number, max: number, padrao: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : padrao;
  s.rodadas = inteiro(s.rodadas, 0, Number.MAX_SAFE_INTEGER, 0);
  s.abertos = inteiro(s.abertos, 1, LOTES.length, 1);
  s.recorde = inteiro(s.recorde, 0, Number.MAX_SAFE_INTEGER, 0);
  s.teste = s.teste === true;
  const acertos: Record<string, number> = {};
  if (typeof s.acertos === 'object' && s.acertos !== null && !Array.isArray(s.acertos)) {
    for (const [id, n] of Object.entries(s.acertos)) {
      if (typeof n === 'number' && Number.isFinite(n) && n > 0) acertos[id] = Math.min(ACERTOS_PARA_ABRIR, Math.floor(n));
    }
  }
  s.acertos = acertos;
  return s as KanaImagensSave;
}

/* ───────── Opções e perguntas ───────── */

export interface Opcao {
  /** Kana mostrado como letra ou como imagem. */
  item?: KanaItem;
  /** Texto (palavra em kana, significado, romaji). */
  texto?: string;
}

export interface Pergunta {
  modo: Modo;
  /** O kana cobrado. Na leitura relâmpago, não há um só. */
  alvo?: KanaItem;
  palavra?: PalavraKatakana;
  opcoes: Opcao[];
  certa: number;
  /** O que a voz fala (na apresentação e no "só pelo som", logo que aparece). */
  fala: string;
  /** Kana em prática (core/ensino.ts): a imagem fica na tela e errar não zera o combo. */
  novo?: boolean;
}

/** Chave da imagem: dois kana com a mesma chave teriam o mesmo desenho. */
export function chaveImagem(k: KanaItem): string {
  return `${k.base}|${k.marca ?? ''}|${k.mini ?? ''}`;
}

/** Kana que só fazem sentido dentro de palavra: perguntados pelo som da palavra. */
export function dentroDePalavra(k: KanaItem): boolean {
  return k.grupo === 'pequeno' || k.grupo === 'longo';
}

/** A mesma palavra sem o detalhe que o kana ensina: きって → きて, ビール → ビル, きょう → きよう. */
export function parMinimo(k: KanaItem): string {
  const w = k.exemplo.kana;
  if (k.char === 'っ' || k.char === 'ッ' || k.char === 'ー') return w.replace(k.char, '');
  const grande = String.fromCharCode(k.char.charCodeAt(0) + 1);
  return w.replace(k.char, grande);
}

export function sorteiaOpcoes(rng: Rng, certa: Opcao, outras: Opcao[], n = 4): { opcoes: Opcao[]; certa: number } {
  const opcoes = shuffle(rng, [certa, ...outras.slice(0, n - 1)]);
  return { opcoes, certa: opcoes.indexOf(certa) };
}

/**
 * Outros kana para as alternativas: mesma escrita, som diferente, desenho diferente.
 * Primeiro os que confundem (se já vistos ou do mesmo lote), depois os já vistos, depois o resto do lote.
 */
export function distratores(alvo: KanaItem, vistos: ReadonlySet<string>, rng: Rng, n = 3): KanaItem[] {
  const lote = LOTE_DE.get(alvo.id) ?? 0;
  const ok = (k: KanaItem) =>
    k.id !== alvo.id && k.escrita === alvo.escrita && k.romaji !== alvo.romaji && chaveImagem(k) !== chaveImagem(alvo) && !dentroDePalavra(k);
  const out: KanaItem[] = [];
  const poe = (lista: KanaItem[]) => {
    for (const k of shuffle(rng, lista)) if (out.length < n && ok(k) && !out.some((o) => o.id === k.id || o.romaji === k.romaji)) out.push(k);
  };
  poe(alvo.parecidos.map(kanaItem).filter((k) => vistos.has(k.id) || LOTE_DE.get(k.id) === lote));
  // Do mesmo tipo primeiro (combinado com combinado), para a pergunta não se resolver pelo tamanho.
  poe(KANA_IMAGENS.filter((k) => vistos.has(k.id) && k.grupo === alvo.grupo));
  poe(KANA_IMAGENS.filter((k) => vistos.has(k.id)));
  poe(KANA_IMAGENS.filter((k) => LOTE_DE.get(k.id) === lote));
  poe(KANA_IMAGENS.filter((k) => (LOTE_DE.get(k.id) ?? 0) <= lote + 1));
  return out;
}

/** `n`: quantas alternativas (na prática, duas ou três). */
export function perguntaDe(modo: Modo, alvo: KanaItem, vistos: ReadonlySet<string>, rng: Rng, n = 4): Pergunta {
  if (dentroDePalavra(alvo)) {
    // っ, ー e os pequenos: ouça a palavra e escolha a grafia certa.
    const certa: Opcao = { texto: alvo.exemplo.kana };
    const s = sorteiaOpcoes(rng, certa, [{ texto: parMinimo(alvo) }], 2);
    return { modo: 'som', alvo, ...s, fala: alvo.exemplo.kana };
  }
  if (modo === 'pares') {
    const lote = LOTE_DE.get(alvo.id);
    const grupo = alvo.parecidos.map(kanaItem).filter((k) => k.romaji !== alvo.romaji && (vistos.has(k.id) || LOTE_DE.get(k.id) === lote));
    if (grupo.length === 0) return perguntaDe('letra-imagem', alvo, vistos, rng);
    const s = sorteiaOpcoes(rng, { item: alvo }, grupo.map((item) => ({ item })), grupo.length + 1);
    return { modo, alvo, ...s, fala: alvo.fala };
  }
  if (modo === 'leitura') {
    const outras = distratores(alvo, vistos, rng).map((k) => ({ texto: k.romaji }));
    const s = sorteiaOpcoes(rng, { texto: alvo.romaji }, outras, n);
    return { modo, alvo, ...s, fala: alvo.fala };
  }
  const outras = distratores(alvo, vistos, rng).map((item) => ({ item }));
  const s = sorteiaOpcoes(rng, { item: alvo }, outras, n);
  return { modo, alvo, ...s, fala: alvo.fala };
}

/** Palavras em katakana que já dá para ler: todos os kana delas foram vistos. */
export function palavrasLegiveis(vistos: ReadonlySet<string>): PalavraKatakana[] {
  return PALAVRAS_KATAKANA.filter((p) => kanaDaPalavra(p.kana).every((k) => vistos.has(k.id)));
}

export function perguntaRelampago(palavra: PalavraKatakana, rng: Rng): Pergunta {
  const outras = shuffle(rng, PALAVRAS_KATAKANA.filter((p) => p.kana !== palavra.kana && p.pt !== palavra.pt)).slice(0, 3);
  const s = sorteiaOpcoes(rng, { texto: palavra.pt }, outras.map((p) => ({ texto: p.pt })));
  return { modo: 'relampago', palavra, ...s, fala: palavra.kana };
}

/** Modo da pergunta conforme a carta firma. Pares só quando já viu um parecido. */
export function modoPara(alvo: KanaItem, card: CardState | undefined, vistos: ReadonlySet<string>, rng: Rng): Modo {
  if (dentroDePalavra(alvo)) return 'som';
  const nivel = masteryLevel(card);
  const temPar = alvo.parecidos.some((id) => vistos.has(id));
  if (nivel <= 1) return rng() < 0.6 ? 'imagem-letra' : 'letra-imagem';
  if (nivel === 2) return temPar && rng() < 0.5 ? 'pares' : 'letra-imagem';
  if (temPar && rng() < 0.35) return 'pares';
  return 'som';
}

/** Escrita de um lote: a do primeiro kana dele (os lotes não misturam). */
const escritaDoLote = (l: { ids: readonly string[] }): Escrita => kanaItem(l.ids[0]!).escrita;

/**
 * Ids dos lotes abertos, na ordem. Com `escrita` (missão da Jornada), só os lotes dela;
 * se nenhum lote dela abriu ainda, o primeiro dela, que entra pela apresentação como qualquer novo.
 */
export function idsAbertos(save: KanaImagensSave, escrita?: Escrita): string[] {
  const abertos = LOTES.slice(0, save.abertos);
  if (!escrita) return abertos.flatMap((l) => l.ids);
  const dela = abertos.filter((l) => escritaDoLote(l) === escrita);
  const lotes = dela.length > 0 ? dela : LOTES.filter((l) => escritaDoLote(l) === escrita).slice(0, 1);
  return lotes.flatMap((l) => l.ids);
}

/** Já viu: tem carta na memória (em qualquer jogo, inclusive no Kana Beat). */
export function vistosDe(cards: Readonly<Record<string, CardState>>): Set<string> {
  return new Set(KANA_IMAGENS.filter((k) => cards[k.carta]).map((k) => k.id));
}

/** Abre o próximo lote quando todo kana do último aberto já foi acertado de primeira o bastante. */
export function abrirLotes(save: KanaImagensSave): number {
  let abertos = 0;
  while (save.abertos < LOTES.length) {
    const ultimo = LOTES[save.abertos - 1];
    if (!ultimo || !ultimo.ids.every((id) => (save.acertos[id] ?? 0) >= ACERTOS_PARA_ABRIR)) break;
    save.abertos++;
    abertos++;
  }
  return abertos;
}

/* ───────── A rodada ───────── */

export interface RodadaDeps {
  cards: Record<string, CardState>;
  profile: Profile;
  save: KanaImagensSave;
  rng: Rng;
  now: () => number;
  /** Missão da Jornada: só hiragana ou só katakana. */
  escrita?: Escrita;
}

export type Evento =
  | { t: 'acerto'; combo: number; rapido: boolean }
  | { t: 'erro'; certa: number }
  | { t: 'lote'; titulo: string }
  | { t: 'nivel'; nivel: number }
  | { t: 'fim'; resumo: Resumo };

export interface Resumo {
  acertos: number;
  perguntas: number;
  comboMax: number;
  novos: KanaItem[];
  xp: number;
  moedas: number;
  recorde: boolean;
  /** Kana que a pessoa errou nesta rodada, para rever a imagem no resumo. */
  errados: KanaItem[];
  lotes: string[];
}

export class Rodada {
  readonly fila: Pergunta[] = [];
  /** Os kana novos estão sendo apresentados (antes da primeira pergunta). */
  apresentando = false;
  indice = 0;
  /** Perguntas de verdade (sem apresentações) já respondidas. */
  feitas = 0;
  acertos = 0;
  combo = 0;
  comboMax = 0;
  xp = 0;
  respondida: number | null = null;
  fim = false;
  readonly novos: KanaItem[] = [];
  readonly errados: KanaItem[] = [];
  private readonly recentes: string[] = [];
  private readonly vistos: Set<string>;
  private readonly lotesAbertos: string[] = [];
  private mostradaEm = 0;
  private resumo: Resumo | null = null;

  constructor(
    private readonly deps: RodadaDeps,
    /** Treino de um modo só. Sem ele, a rodada mistura tudo e traz kana novo. */
    readonly modoFixo?: Exclude<Modo, 'apresenta' | 'leitura'>,
  ) {
    this.vistos = vistosDe(deps.cards);
    if (!modoFixo) this.apresentarNovos();
    // Com novos na tela, o resto da fila espera a apresentação (só sai pergunta de kana apresentado).
    if (!this.apresentando) this.completar();
    // Treino sem nada para perguntar: a tela nem deixa começar, mas a rodada não quebra.
    if (this.fila.length === 0 && !this.apresentando) this.fim = true;
    this.mostradaEm = deps.now();
  }

  /** A apresentação acabou: os kana novos viram cartas e começa a primeira pergunta. */
  apresentou(): void {
    if (!this.apresentando) return;
    apresentar(this.deps.cards, this.novos.map((k) => k.carta), this.deps.now());
    this.apresentando = false;
    this.completar();
    this.mostradaEm = this.deps.now();
  }

  /** Pergunta do kana na fase em que ele está: na prática, a imagem por perto e menos alternativas. */
  private perguntaPara(modo: Modo, alvo: KanaItem): Pergunta {
    const { cards, rng } = this.deps;
    const novo = this.novos.includes(alvo) || emPratica(cards, alvo.carta);
    const n = novo ? opcoesPara(cards, alvo.carta, 4) : 4;
    const comImagem = modo === 'imagem-letra' || modo === 'letra-imagem' || dentroDePalavra(alvo);
    // No treino de um modo só, o modo fica; o apoio é ter menos alternativas.
    const p = perguntaDe(novo && !comImagem && !this.modoFixo ? 'imagem-letra' : modo, alvo, this.vistos, rng, n);
    return novo ? { ...p, novo: true } : p;
  }

  get atual(): Pergunta {
    return this.fila[this.indice] as Pergunta;
  }

  private apresentarNovos(): void {
    const { save, cards } = this.deps;
    const novos = idsAbertos(save, this.deps.escrita)
      .filter((id) => !this.vistos.has(id))
      .slice(0, NOVOS_POR_RODADA)
      .map(kanaItem);
    // Muita coisa ainda mole na memória: segura as novidades, como o resto do fliperama.
    const moles = KANA_IMAGENS.filter((k) => cards[k.carta] && masteryLevel(cards[k.carta]) <= 1).length;
    const cabem = Math.max(0, Math.min(novos.length, 12 - moles));
    for (const k of novos.slice(0, Math.max(cabem, this.vistos.size === 0 ? 1 : 0))) this.novos.push(k);
    if (this.novos.length > 0) this.apresentando = true;
    // Ensina antes de cobrar: cada novo é perguntado logo depois da apresentação, com a imagem por perto.
    for (const k of this.novos) this.vistos.add(k.id);
    for (const k of this.novos) {
      this.fila.push(this.perguntaPara(dentroDePalavra(k) ? 'som' : 'imagem-letra', k));
      this.recentes.push(k.carta);
    }
  }

  /** Enche a fila até RODADA perguntas, escolhendo pela memória espaçada. */
  private completar(): void {
    const { cards, rng, now } = this.deps;
    const naFila = () => this.fila.length;
    const pool = idsAbertos(this.deps.save, this.deps.escrita)
      .filter((id) => this.vistos.has(id))
      .map((id) => kanaItem(id))
      .filter((k) => this.serve(k));
    let tentativas = 0;
    while (naFila() < RODADA && tentativas++ < RODADA * 4) {
      const legiveis = palavrasLegiveis(this.vistos);
      if ((this.modoFixo === 'relampago' || (!this.modoFixo && rng() < 0.2)) && legiveis.length > 0) {
        const palavra = legiveis[Math.floor(rng() * legiveis.length)] as PalavraKatakana;
        if (!this.fila.some((p) => p.palavra?.kana === palavra.kana)) {
          this.fila.push(perguntaRelampago(palavra, rng));
          continue;
        }
      }
      if (this.modoFixo === 'relampago') {
        if (legiveis.length === 0) break;
        continue;
      }
      if (pool.length === 0) break;
      const escolha = pickNext(
        pool.map((k) => k.carta),
        cards,
        now(),
        rng,
        { recent: this.recentes.slice(-4), maxYoung: 1000, newRatio: 0 },
      );
      if (!escolha) break;
      const alvo = pool.find((k) => k.carta === escolha.key) as KanaItem;
      this.recentes.push(alvo.carta);
      const modo = this.modoFixo ?? modoPara(alvo, cards[alvo.carta], this.vistos, rng);
      this.fila.push(this.perguntaPara(modo, alvo));
    }
  }

  /** O kana pode ser cobrado no modo fixo? */
  private serve(k: KanaItem): boolean {
    if (!this.modoFixo) return true;
    if (dentroDePalavra(k)) return this.modoFixo === 'som';
    if (this.modoFixo === 'pares') return k.parecidos.some((id) => this.vistos.has(id));
    return true;
  }

  /** Modos de treino que dá para jogar agora (precisa ter o que perguntar). */
  static modosDisponiveis(cards: Readonly<Record<string, CardState>>): Set<Modo> {
    const vistos = vistosDe(cards);
    const out = new Set<Modo>(['apresenta']);
    const basicos = KANA_IMAGENS.filter((k) => vistos.has(k.id) && !dentroDePalavra(k));
    if (basicos.length >= 2) {
      out.add('imagem-letra');
      out.add('letra-imagem');
      out.add('som');
    }
    if (basicos.some((k) => k.parecidos.some((id) => vistos.has(id)))) out.add('pares');
    if (palavrasLegiveis(vistos).length > 0) out.add('relampago');
    return out;
  }

  /** Pergunta respondida: segue para a próxima. */
  seguir(): Evento[] {
    if (this.fim || this.apresentando || this.respondida === null) return [];
    return this.avancar();
  }

  responder(i: number): Evento[] {
    const p = this.atual;
    if (this.fim || this.apresentando || this.respondida !== null || i < 0 || i >= p.opcoes.length) return [];
    const { cards, save, profile, now } = this.deps;
    const ms = now() - this.mostradaEm;
    const certo = i === p.certa;
    this.respondida = i;
    this.feitas++;
    const ev: Evento[] = [];
    if (p.alvo) {
      // Na prática, a imagem é a dica e acertar conta como bom. Depois, com a imagem por perto, é difícil.
      const hinted = p.modo === 'imagem-letra' || p.modo === 'letra-imagem';
      avaliar(cards, p.alvo.carta, p.novo ? notaDaPratica(certo, ms) : { correct: certo, ms, hinted }, now());
    }
    if (certo) {
      this.acertos++;
      // Na prática, o combo não conta (nem sobe, nem cai).
      if (!p.novo) this.combo++;
      this.comboMax = Math.max(this.comboMax, this.combo);
      const rapido = ms < RAPIDO_MS;
      const antes = levelInfo(profile.xp).level;
      const ganho = (rapido ? 4 : 3) + Math.min(3, Math.floor(this.combo / 3));
      profile.xp += ganho;
      this.xp += ganho;
      if (p.alvo) save.acertos[p.alvo.id] = Math.min(ACERTOS_PARA_ABRIR, (save.acertos[p.alvo.id] ?? 0) + 1);
      ev.push({ t: 'acerto', combo: this.combo, rapido });
      const depois = levelInfo(profile.xp).level;
      if (depois > antes) ev.push({ t: 'nivel', nivel: depois });
      for (let n = abrirLotes(save); n > 0; n--) {
        const titulo = (LOTES[save.abertos - n] as { titulo: string }).titulo;
        this.lotesAbertos.push(titulo);
        ev.push({ t: 'lote', titulo });
      }
    } else {
      if (!p.novo) this.combo = 0;
      ev.push({ t: 'erro', certa: p.certa });
      if (p.alvo) {
        if (!this.errados.some((k) => k.id === p.alvo?.id)) this.errados.push(p.alvo);
        // Volta duas perguntas depois, com a imagem por perto de novo (a carta voltou para a prática).
        const volta = this.perguntaPara(dentroDePalavra(p.alvo) ? 'som' : 'imagem-letra', p.alvo);
        this.fila.splice(Math.min(this.fila.length, this.indice + 3), 0, volta);
      }
    }
    return ev;
  }

  private avancar(): Evento[] {
    this.respondida = null;
    this.indice++;
    this.mostradaEm = this.deps.now();
    if (this.feitas >= RODADA || this.indice >= this.fila.length) return this.encerrar();
    return [];
  }

  private encerrar(): Evento[] {
    const { save, profile } = this.deps;
    this.fim = true;
    save.rodadas++;
    const moedas = Math.floor(this.acertos / 2);
    profile.coins += moedas;
    const recorde = this.comboMax > save.recorde;
    if (recorde) save.recorde = this.comboMax;
    this.resumo = {
      acertos: this.acertos,
      perguntas: this.feitas,
      comboMax: this.comboMax,
      novos: this.novos,
      xp: this.xp,
      moedas,
      recorde,
      errados: this.errados,
      lotes: this.lotesAbertos,
    };
    return [{ t: 'fim', resumo: this.resumo }];
  }
}

/* ───────── Teste de entrada ───────── */

/** Blocos do teste: cada um junta lotes do mesmo tipo. */
export const BLOCOS: readonly { titulo: string; lotes: number[] }[] = (() => {
  const nomes: [string, string][] = [
    ['h', 'Hiragana'],
    ['hd', 'Hiragana com tenten e maru'],
    ['hy', 'Hiragana combinado e っ'],
    ['k', 'Katakana'],
    ['kd', 'Katakana com tenten e maru'],
    ['ky', 'Katakana combinado, ッ e ー'],
    ['ke', 'Sons de fora em katakana'],
  ];
  return nomes.map(([pref, titulo]) => ({
    titulo,
    lotes: LOTES.flatMap((l, i) => (l.id.replace(/\d+$/, '') === pref ? [i] : [])),
  }));
})();

export interface ResultadoTeste {
  /** Blocos que a pessoa já domina. */
  sabe: string[];
  /** Onde começa a aprender. */
  comeca: string | null;
}

/**
 * Teste rápido para quem já lê: mostra a letra, a pessoa escolhe a leitura. Quatro por bloco;
 * acertou três, o bloco inteiro conta como sabido e vai para a memória como revisão.
 * O primeiro bloco que não passa encerra o teste: dali em diante é aprender.
 */
export class TesteEntrada {
  bloco = 0;
  perguntas: Pergunta[] = [];
  i = 0;
  acertosBloco = 0;
  respondida: number | null = null;
  fim = false;
  readonly sabe: string[] = [];
  private mostradaEm = 0;

  constructor(private readonly deps: RodadaDeps) {
    this.montarBloco();
  }

  get atual(): Pergunta {
    return this.perguntas[this.i] as Pergunta;
  }

  get tituloBloco(): string {
    return (BLOCOS[this.bloco] as { titulo: string }).titulo;
  }

  private montarBloco(): void {
    const { rng } = this.deps;
    const b = BLOCOS[this.bloco] as { lotes: number[] };
    const ids = b.lotes.flatMap((i) => (LOTES[i] as { ids: string[] }).ids).map(kanaItem).filter((k) => !dentroDePalavra(k));
    const escolhidos = shuffle(rng, ids).slice(0, TESTE_POR_BLOCO);
    const vistos = new Set(ids.map((k) => k.id));
    this.perguntas = escolhidos.map((k) => perguntaDe('leitura', k, vistos, rng));
    this.i = 0;
    this.acertosBloco = 0;
    this.mostradaEm = this.deps.now();
  }

  responder(op: number): boolean | null {
    if (this.fim || this.respondida !== null) return null;
    const p = this.atual;
    if (op < 0 || op >= p.opcoes.length) return null;
    this.respondida = op;
    const certo = op === p.certa;
    if (certo) this.acertosBloco++;
    const { cards, now } = this.deps;
    // Só dá nota a kana já apresentado: o que o teste encontra pela primeira vez entra pela apresentação
    // (ou como sabido, se o bloco passar).
    if (p.alvo && foiApresentado(cards, p.alvo.carta)) avaliar(cards, p.alvo.carta, { correct: certo, ms: now() - this.mostradaEm }, now());
    return certo;
  }

  /** Próxima pergunta ou próximo bloco. Devolve o resultado quando acaba. */
  seguir(): ResultadoTeste | null {
    if (this.fim || this.respondida === null) return null;
    this.respondida = null;
    this.i++;
    this.mostradaEm = this.deps.now();
    if (this.i < this.perguntas.length) return null;
    if (this.acertosBloco >= TESTE_POR_BLOCO - 1) {
      this.marcarSabido();
      this.bloco++;
      if (this.bloco < BLOCOS.length) {
        this.montarBloco();
        return null;
      }
    }
    return this.encerrar();
  }

  /** Esc no meio: vale o que já passou. */
  parar(): ResultadoTeste {
    return this.encerrar();
  }

  private marcarSabido(): void {
    const { cards, save, now } = this.deps;
    const b = BLOCOS[this.bloco] as { titulo: string; lotes: number[] };
    this.sabe.push(b.titulo);
    for (const li of b.lotes) {
      for (const id of (LOTES[li] as { ids: string[] }).ids) {
        const k = kanaItem(id);
        // Quem já sabe não precisa da apresentação nem da prática: a carta entra como fácil,
        // direto na cobrança (ms 0 vira Easy no FSRS).
        if (!cards[k.carta]) {
          apresentar(cards, [k.carta], now());
          avaliar(cards, k.carta, { correct: true, ms: 0 }, now());
        }

        save.acertos[id] = ACERTOS_PARA_ABRIR;
      }
    }
    save.abertos = Math.max(save.abertos, Math.min(LOTES.length, Math.max(...b.lotes) + 2));
  }

  private encerrar(): ResultadoTeste {
    this.fim = true;
    this.deps.save.teste = true;
    const b = this.sabe.length < BLOCOS.length ? BLOCOS[this.bloco] : undefined;
    return { sabe: this.sabe, comeca: b && this.sabe.length < BLOCOS.length ? b.titulo : null };
  }
}
