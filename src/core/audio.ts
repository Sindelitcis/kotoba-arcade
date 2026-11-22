/**
 * Sons do jogo: efeitos curtos (arquivos do 効果音ラボ, lista em `som/catalogo.ts`) tocados
 * pelo gerenciador de som (`som/mixer.ts`), que cuida dos volumes e da primeira interação.
 *
 * Voz em japonês: gravações em `public/vozes/` (ver `scripts/gravar-vozes.mjs`), achadas pelo
 * manifesto `texto → voz → arquivo`. Não há voz de reserva: o que não foi gravado fica mudo
 * e avisa no console (`sem-gravacao.ts`). Toda voz passa por `acompanharVoz`, que aplica o
 * volume de voz e abaixa a música enquanto ela fala.
 */
import { app } from './app';
import { avisarSemGravacao } from './sem-gravacao';
import { acompanharVoz, esperarEfeitos, tocarEfeito } from './som/mixer';
import { VOZ_PADRAO, VOZ_PALAVRA, type VozId } from './vozes';

/** Tom do acerto: sobe meio passo a cada acerto seguido, até 12. */
export function tomDoAcerto(combo: number): number {
  return 2 ** (Math.min(Math.max(combo, 0), 12) / 24);
}

export const sfx = {
  /** Botão, escolha. */
  click: () => tocarEfeito('clique'),
  /** Abrir Ajustes ou a ajuda. */
  menu: () => tocarEfeito('menu'),
  /** Fechar menu ou ajuda. */
  voltar: () => tocarEfeito('voltar', { ganho: 0.8 }),
  /** Acerto: brilho que sobe de tom com o combo; a cada 5 seguidos, o toque de combo. */
  hit: (combo: number) => {
    tocarEfeito('acerto', { rate: tomDoAcerto(combo) });
    if (combo > 0 && combo % 5 === 0) tocarEfeito('combo', { atraso: 0.08, ganho: 0.8 });
  },
  /** Acerto rápido. */
  fast: () => tocarEfeito('rapido', { atraso: 0.05, ganho: 0.7 }),
  /** Erro. */
  miss: () => tocarEfeito('erro'),
  /** Captura: brilho, e o taiko junto nas cartas mais raras. */
  capture: (tier: number) => {
    tocarEfeito('captura');
    if (tier >= 3) tocarEfeito('taiko', { atraso: 0.05 });
  },
  /** Carta rara ou inimigo forte (ゴゴゴ). */
  rare: () => tocarEfeito('raro'),
  /** Baú e recompensa. */
  chest: () => tocarEfeito('bau'),
  /** Subir de nível e recorde. */
  levelup: () => tocarEfeito('nivel'),
  /** Fim de rodada sem vitória. */
  over: () => tocarEfeito('fim'),
  /** Vitória (chefe vencido, rodada completa). */
  vitoria: () => tocarEfeito('vitoria'),
  /** Virar carta ou página. */
  page: () => tocarEfeito('carta'),
};

export interface Manifesto {
  versao: number;
  /** texto → voz → arquivo em `vozes/`. */
  falas: Record<string, Partial<Record<VozId, string>>>;
}

export const VOZES_URL = `${import.meta.env.BASE_URL}vozes/`;
let manifesto: Promise<Manifesto | null> | null = null;

/** Baixa o manifesto uma vez. Sem rede ou sem arquivo, fica null e nada toca. */
export function loadVoices(): Promise<Manifesto | null> {
  manifesto ??= fetch(`${VOZES_URL}manifesto.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Manifesto>) : null))
    .catch(() => null);
  return manifesto;
}

/** Arquivo gravado para o texto, na voz pedida ou, se não houver, na padrão. */
export function recordedFile(m: Manifesto, text: string, voz: VozId = VOZ_PADRAO): string | undefined {
  const f = m.falas[text];
  if (!f) return undefined;
  return f[voz] ?? f[VOZ_PADRAO] ?? Object.values(f)[0];
}

let playing: HTMLAudioElement | null = null;
let request = 0;
/** Quem mais está falando (uma sequência de `sequencia.ts`): para junto quando outra fala começa. */
let outraFala: (() => void) | null = null;

function silence(): void {
  playing?.pause();
  playing = null;
  const parar = outraFala;
  outraFala = null;
  parar?.();
}

/**
 * Cala tudo (fala solta e sequência) e registra `parar`, chamado quando a próxima fala
 * começar. Uma sequência chama isto antes de tocar.
 */
export function assumirFala(parar: () => void): void {
  ++request;
  silence();
  outraFala = parar;
}

/** Larga a vez sem calar nada (a sequência terminou sozinha). */
export function largarFala(parar: () => void): void {
  if (outraFala === parar) outraFala = null;
}

/** Palavra solta ou kana: o áudio é achado pelo kana, na voz de palavra (mais clara em palavra curta). */
export function speakWord(kana: string): Promise<void> {
  return speak(kana, VOZ_PALAVRA);
}

/**
 * Kanji sozinho: a gravação fica no próprio kanji, porque o kana se repete (日 e 火 são
 * ひ, com acento diferente). Sem gravação do kanji, toca a do kana.
 */
export function speakKanji(kanji: string, kana: string): Promise<void> {
  return speak(kanji, VOZ_PALAVRA, kana);
}

/**
 * Fala um texto em japonês gravado. Uma fala nova corta a anterior. `voz` escolhe o
 * personagem (Aventura). `alternativa` é outra chave para procurar quando o texto não
 * tem gravação (o kana de um kanji solto).
 */
export function speak(text: string, voz: VozId = VOZ_PADRAO, alternativa?: string): Promise<void> {
  return tocarJp(text, voz, alternativa, true);
}

/**
 * Igual a `speak`, mas sem aviso quando não há gravação: para o texto que a IA da Conversa
 * escreve na hora, que não tem como estar gravado (sem o PC, ele fica sem voz).
 */
export function speakSeGravado(text: string, voz: VozId = VOZ_PADRAO): Promise<void> {
  return tocarJp(text, voz, undefined, false);
}

function tocarJp(text: string, voz: VozId, alternativa: string | undefined, avisar: boolean): Promise<void> {
  if (!app.data.settings.voice) return Promise.resolve();
  const n = ++request;
  silence();
  return loadVoices().then(async (m) => {
    if (n !== request) return; // outra fala veio antes de o manifesto chegar
    const file = m ? (recordedFile(m, text, voz) ?? (alternativa ? recordedFile(m, alternativa, voz) : undefined)) : undefined;
    if (!file) {
      if (m && avisar) avisarSemGravacao('ja', text);
      return;
    }
    if (typeof Audio === 'undefined') return;
    // O efeito do acerto ou do erro toca antes, curto; a pronúncia vem depois, sem nada por cima.
    await esperarEfeitos();
    if (n !== request) return;
    const a = new Audio(VOZES_URL + file);
    playing = a;
    acompanharVoz(a);
    a.play().catch(() => {});
  });
}
