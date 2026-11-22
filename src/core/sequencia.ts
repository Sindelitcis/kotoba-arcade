/**
 * Toca uma fala depois da outra: o português do professor, o japonês, uma pausa para
 * repetir e o japonês de novo. É o que toca as aulas do modo Ouvir e o retorno falado
 * dos jogos (explicação em português e, logo depois, o exemplo em japonês).
 *
 * Japonês vem de `public/vozes` (as mesmas gravações dos jogos). Português vem de
 * `fala-pt.ts`. Trecho sem gravação fica mudo e avisa no console (`sem-gravacao.ts`).
 * Qualquer fala nova (`speak()`) para a sequência.
 */
import { app } from './app';
import { assumirFala, largarFala, loadVoices, recordedFile, VOZES_URL, type Manifesto } from './audio';
import { carregarPt, urlPt, type ManifestoPt } from './fala-pt';
import { avisarSemGravacao } from './sem-gravacao';
import { acompanharVoz, esperarEfeitos } from './som/mixer';
import { VOZ_PADRAO, VOZ_PALAVRA } from './vozes';

/** Japonês falado: a chave da gravação, a voz e o kana (outra chave, se o texto não tiver gravação). */
export interface FalaJp {
  texto: string;
  voz: 'palavra' | 'frase';
  kana: string;
}

export type Trecho =
  | { tipo: 'pt'; texto: string }
  | { tipo: 'jp'; fala: FalaJp }
  /** Silêncio para repetir em voz alta: `vezes` a duração do último japonês. */
  | { tipo: 'pausa'; vezes: number };

/** Pausa para repetir: um pouco mais que a fala, nunca curta demais nem longa a ponto de distrair. */
export function msDaPausa(vezes: number, ultimoJpSeg: number): number {
  const s = Math.min(8, Math.max(1.6, vezes * ultimoJpSeg)) + 0.4;
  return Math.round(s * 1000);
}

/** O que a sequência precisa do navegador: tocar um endereço e esperar. */
export interface Saida {
  /** Toca o arquivo; resolve com a duração em segundos (0 se não tocou). */
  tocar(url: string, sinal: AbortSignal): Promise<number>;
  esperar(ms: number, sinal: AbortSignal): Promise<void>;
}

const abortado = (sinal: AbortSignal) => new Promise<void>((resolve) => sinal.addEventListener('abort', () => resolve(), { once: true }));

export const saidaDoNavegador: Saida = {
  async tocar(url, sinal) {
    if (typeof Audio === 'undefined') return 0;
    // Efeito curto que acabou de tocar termina antes; voz nunca fica por baixo de efeito.
    await esperarEfeitos();
    if (sinal.aborted) return 0;
    const a = new Audio(url);
    acompanharVoz(a);
    const fim = new Promise<number>((resolve) => {
      a.addEventListener('ended', () => resolve(Number.isFinite(a.duration) ? a.duration : 0), { once: true });
      a.addEventListener('error', () => resolve(0), { once: true });
      a.play().catch(() => resolve(0));
    });
    return Promise.race([fim, abortado(sinal).then(() => (a.pause(), 0))]);
  },
  esperar(ms, sinal) {
    return new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      sinal.addEventListener('abort', () => (clearTimeout(t), resolve()), { once: true });
    });
  },
};

export interface Fontes {
  jp: Manifesto | null;
  pt: ManifestoPt | null;
}

async function fontesPadrao(): Promise<Fontes> {
  const [jp, pt] = await Promise.all([loadVoices(), carregarPt()]);
  return { jp, pt };
}

export interface Tocador {
  /** Para tudo. A sequência não continua sozinha depois disso. */
  parar(): void;
  /** Resolve quando acaba ou para. `true` se tocou até o fim. */
  fim: Promise<boolean>;
}

export interface Opcoes {
  /** Começa deste trecho. */
  desde?: number;
  /** Avisado antes de cada trecho. */
  aoTrecho?: (i: number) => void;
  /** Troca o navegador e os manifestos (testes). */
  saida?: Saida;
  fontes?: () => Promise<Fontes>;
}

/**
 * Toca os trechos em ordem. Com a voz desligada nos ajustes, não toca nada. Começar uma
 * sequência cala a fala anterior, e uma fala nova cala esta.
 */
export function tocarSequencia(trechos: readonly Trecho[], opcoes: Opcoes = {}): Tocador {
  const ctrl = new AbortController();
  const parar = () => ctrl.abort();
  if (!app.data.settings.voice) return { parar, fim: Promise.resolve(false) };
  assumirFala(parar);
  const saida = opcoes.saida ?? saidaDoNavegador;
  const fim = (async () => {
    const fontes = await (opcoes.fontes ?? fontesPadrao)();
    let ultimoJp = 1.5;
    for (let i = opcoes.desde ?? 0; i < trechos.length; i++) {
      if (ctrl.signal.aborted) return false;
      opcoes.aoTrecho?.(i);
      const t = trechos[i] as Trecho;
      if (t.tipo === 'pausa') {
        await saida.esperar(msDaPausa(t.vezes, ultimoJp), ctrl.signal);
      } else if (t.tipo === 'pt') {
        const url = urlPt(fontes.pt, t.texto);
        if (url) await saida.tocar(url, ctrl.signal);
        else if (fontes.pt) avisarSemGravacao('pt', t.texto);
      } else {
        const voz = t.fala.voz === 'palavra' ? VOZ_PALAVRA : VOZ_PADRAO;
        const arquivo = fontes.jp ? (recordedFile(fontes.jp, t.fala.texto, voz) ?? recordedFile(fontes.jp, t.fala.kana, voz)) : undefined;
        const dur = arquivo ? await saida.tocar(VOZES_URL + arquivo, ctrl.signal) : 0;
        if (dur) ultimoJp = dur;
        if (!arquivo && fontes.jp) avisarSemGravacao('ja', t.fala.texto);
      }
    }
    return !ctrl.signal.aborted;
  })().finally(() => largarFala(parar));
  return { parar, fim };
}
