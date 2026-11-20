/**
 * Ponte entre a tela e quem faz a IA da Conversa:
 * - a nuvem (padrão): as rotas `/api` do próprio site na Cloudflare (pasta `nuvem/`),
 *   protegidas por senha;
 * - o servidor local (opcional, pasta `local/`), que roda no PC do jogador e só é
 *   procurado quando a página está aberta no próprio PC.
 */
import type { AiClient, ChatMessage, Token } from './engine';

export const SERVIDOR = 'http://127.0.0.1:8791';

export interface Saude {
  /** true quando quem responde é a nuvem (e não o servidor do PC). */
  nuvem?: boolean;
  conversa: { ok: boolean; modelo: string; erro?: string };
  fala: { ok: boolean; estado?: string };
  voz: { ok: boolean; motor: string };
}

export interface Cliente extends AiClient {
  /** Áudio gravado no microfone → o que foi dito, em japonês. */
  ouvir(audio: Blob, dica: string): Promise<string>;
  /** Texto → áudio com a voz do personagem. */
  voz(texto: string, voz: string): Promise<Blob>;
}

type Fetch = typeof fetch;

/** Só uma página aberta no próprio PC procura o servidor. O site público nem tenta. */
export function podeProcurar(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname.endsWith('.localhost');
}

/** Devolve o estado do servidor local, ou null se ele não está ligado (ou se a página não é local). */
export async function procurarServidor(hostname: string, f: Fetch = fetch, base = SERVIDOR, timeoutMs = 1500): Promise<Saude | null> {
  if (!podeProcurar(hostname)) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await f(`${base}/saude`, { signal: ctrl.signal });
    if (!r.ok) return null;
    const s = (await r.json()) as Partial<Saude> & { ok?: boolean };
    if (!s.ok || !s.conversa || !s.fala || !s.voz) return null;
    return { conversa: s.conversa, fala: s.fala, voz: s.voz };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function criarCliente(f: Fetch = fetch, base = SERVIDOR): Cliente {
  const post = async (path: string, body: unknown): Promise<Response> => {
    const r = await f(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`servidor local: ${r.status}`);
    return r;
  };
  return {
    chat: async (mensagens: ChatMessage[], esquema: object) =>
      (
        (await (await post('/conversa', { mensagens, esquema })).json()) as {
          texto: string;
        }
      ).texto,
    leitura: async (texto: string) =>
      (
        (await (await post('/leitura', { texto })).json()) as {
          tokens: Token[];
        }
      ).tokens,
    ouvir: async (audio: Blob, dica: string) => {
      const r = await f(`${base}/ouvir?dica=${encodeURIComponent(dica)}`, {
        method: 'POST',
        headers: { 'Content-Type': audio.type || 'audio/webm' },
        body: audio,
      });
      if (!r.ok) throw new Error(`servidor local: ${r.status}`);
      return ((await r.json()) as { texto: string }).texto;
    },
    voz: async (texto: string, voz: string) => (await post('/voz', { texto, voz })).blob(),
  };
}

// ---------------------------------------------------------------- nuvem

/** As rotas da Conversa no próprio site (Pages Functions). Relativo à página: funciona em qualquer endereço. */
export const NUVEM = `${import.meta.env.BASE_URL}api`;

/** O motivo de a nuvem recusar um pedido, para a tela explicar em português. */
export type ErroNuvem = 'limite' | 'sessao' | 'rede' | 'ia';

export class FalhaNuvem extends Error {
  constructor(readonly motivo: ErroNuvem) {
    super(`nuvem: ${motivo}`);
  }
}

export type Procura = { tipo: 'pronto'; saude: Saude } | { tipo: 'senha' } | { tipo: 'fora' };

/** Pergunta à nuvem se ela está lá e se esta página já tem sessão. */
export async function procurarNuvem(f: Fetch = fetch, base = NUVEM, timeoutMs = 8000): Promise<Procura> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await f(`${base}/estado`, { signal: ctrl.signal, credentials: 'same-origin' });
    if (r.status === 401) return { tipo: 'senha' };
    if (!r.ok || !(r.headers.get('Content-Type') ?? '').includes('json')) return { tipo: 'fora' };
    const s = (await r.json()) as Partial<Saude> & { ok?: boolean };
    if (!s.ok || !s.conversa || !s.fala || !s.voz) return { tipo: 'fora' };
    return { tipo: 'pronto', saude: { nuvem: true, conversa: s.conversa, fala: s.fala, voz: s.voz } };
  } catch {
    return { tipo: 'fora' };
  } finally {
    clearTimeout(timer);
  }
}

export type Entrada = { ok: true } | { ok: false; erro: 'senha'; restam: number } | { ok: false; erro: 'tentativas'; esperar: number } | { ok: false; erro: 'rede' };

/** Manda a senha. Se ela estiver certa, o servidor devolve o cookie da sessão (que a página nem enxerga). */
export async function entrar(senha: string, f: Fetch = fetch, base = NUVEM): Promise<Entrada> {
  try {
    const r = await f(`${base}/entrar`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    });
    const d = (await r.json().catch(() => ({}))) as { restam?: number; esperar?: number };
    if (r.ok) return { ok: true };
    if (r.status === 401) return { ok: false, erro: 'senha', restam: d.restam ?? 0 };
    if (r.status === 429) return { ok: false, erro: 'tentativas', esperar: d.esperar ?? 900 };
    return { ok: false, erro: 'rede' };
  } catch {
    return { ok: false, erro: 'rede' };
  }
}

function paraBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export interface ClienteNuvem extends Cliente {
  /** O motivo da última falha, para a tela dizer o que aconteceu (a cota do dia acabou, a sessão venceu...). */
  ultimaFalha: ErroNuvem | null;
}

export function criarClienteNuvem(f: Fetch = fetch, base = NUVEM): ClienteNuvem {
  const cliente: ClienteNuvem = {
    ultimaFalha: null,
    chat: async (mensagens: ChatMessage[], esquema: object) =>
      ((await (await post('/conversa', { mensagens, esquema })).json()) as { texto: string }).texto,
    leitura: async (texto: string) => ((await (await post('/leitura', { texto })).json()) as { tokens: Token[] }).tokens,
    ouvir: async (audio: Blob, dica: string) => {
      const audioB64 = paraBase64(new Uint8Array(await audio.arrayBuffer()));
      return ((await (await post('/ouvir', { audio: audioB64, dica })).json()) as { texto: string }).texto;
    },
    // A nuvem não tem voz em japonês: a tela usa os mp3 gravados e a voz do navegador.
    voz: () => Promise.reject(new FalhaNuvem('ia')),
  };
  async function post(path: string, body: unknown): Promise<Response> {
    let r: Response;
    try {
      r = await f(`${base}${path}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      cliente.ultimaFalha = 'rede';
      throw new FalhaNuvem('rede');
    }
    if (r.ok) {
      cliente.ultimaFalha = null;
      return r;
    }
    const motivo: ErroNuvem = r.status === 401 ? 'sessao' : r.status === 429 ? 'limite' : 'ia';
    cliente.ultimaFalha = motivo;
    throw new FalhaNuvem(motivo);
  }
  return cliente;
}

/** O que a tela diz quando a nuvem falha no meio da conversa. */
export function avisoDaFalha(motivo: ErroNuvem | null): string {
  switch (motivo) {
    case 'limite':
      return 'A IA gratuita da nuvem já usou toda a cota de hoje. Ela volta às 21h (horário de Brasília). Até lá, os outros jogos funcionam normalmente.';
    case 'sessao':
      return 'Sua sessão venceu. Saia e entre de novo na Conversa para digitar a senha.';
    case 'rede':
      return 'Não consegui falar com a nuvem. Confira a internet. Sua fala não se perdeu: mande de novo.';
    default:
      return 'A IA não respondeu desta vez. Sua fala não se perdeu: mande de novo.';
  }
}
