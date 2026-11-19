/**
 * Ponte entre a tela e o servidor local (pasta `local/`), que roda no PC do
 * jogador com o reconhecimento de fala, o modelo de conversa e a voz.
 */
import type { AiClient, ChatMessage, Token } from "./engine";

export const SERVIDOR = "http://127.0.0.1:8791";

export interface Saude {
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
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
}

/** Devolve o estado do servidor local, ou null se ele não está ligado (ou se a página não é local). */
export async function procurarServidor(
  hostname: string,
  f: Fetch = fetch,
  base = SERVIDOR,
  timeoutMs = 1500,
): Promise<Saude | null> {
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`servidor local: ${r.status}`);
    return r;
  };
  return {
    chat: async (mensagens: ChatMessage[], esquema: object) =>
      (
        (await (await post("/conversa", { mensagens, esquema })).json()) as {
          texto: string;
        }
      ).texto,
    leitura: async (texto: string) =>
      (
        (await (await post("/leitura", { texto })).json()) as {
          tokens: Token[];
        }
      ).tokens,
    ouvir: async (audio: Blob, dica: string) => {
      const r = await f(`${base}/ouvir?dica=${encodeURIComponent(dica)}`, {
        method: "POST",
        headers: { "Content-Type": audio.type || "audio/webm" },
        body: audio,
      });
      if (!r.ok) throw new Error(`servidor local: ${r.status}`);
      return ((await r.json()) as { texto: string }).texto;
    },
    voz: async (texto: string, voz: string) =>
      (await post("/voz", { texto, voz })).blob(),
  };
}
