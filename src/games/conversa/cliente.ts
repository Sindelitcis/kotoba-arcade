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
  /** Só no PC: a trava da placa de vídeo (scripts/placa.py). Ocupada = o PC não carregou os modelos. */
  placa?: { ok: boolean; motivo?: string };
  conversa: { ok: boolean; modelo: string; erro?: string };
  /** Só no modo híbrido (PC ligado e sessão na nuvem): o texto vem primeiro deste modelo da nuvem. */
  texto?: { modelo: string };
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

/** Página aberta no próprio PC (localhost). Fora dele, o servidor do PC só é procurado com permissão do navegador. */
export function podeProcurar(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname.endsWith('.localhost');
}

/** Devolve o estado do servidor do PC, ou null se ele não está ligado. */
export async function procurarServidor(f: Fetch = fetch, base = SERVIDOR, timeoutMs = 1500): Promise<Saude | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await f(`${base}/saude`, { signal: ctrl.signal });
    if (!r.ok) return null;
    const s = (await r.json()) as Partial<Saude> & { ok?: boolean };
    if (!s.ok || !s.conversa || !s.fala || !s.voz) return null;
    return { conversa: s.conversa, fala: s.fala, voz: s.voz, ...(s.placa ? { placa: s.placa } : {}) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- qual IA usar

/** Automático: o PC se ele responder, senão a nuvem. */
export type Motor = 'auto' | 'nuvem' | 'pc';
export const MOTORES: readonly { id: Motor; nome: string }[] = [
  { id: 'auto', nome: 'Automático' },
  { id: 'nuvem', nome: 'Nuvem' },
  { id: 'pc', nome: 'Meu PC' },
];
export const MOTOR_KEY = 'kotoba-arcade:motor-conversa';

interface Guardado {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export function lerMotor(store: Guardado | undefined = globalThis.localStorage): Motor {
  try {
    const m = store?.getItem(MOTOR_KEY);
    return m === 'nuvem' || m === 'pc' ? m : 'auto';
  } catch {
    return 'auto';
  }
}

export function salvarMotor(m: Motor, store: Guardado | undefined = globalThis.localStorage): void {
  try {
    store?.setItem(MOTOR_KEY, m);
  } catch {
    // navegador sem espaço: vale só até fechar a página
  }
}

/**
 * Se o navegador deixa este site falar com o PC. O Chrome e o Brave pedem licença
 * ("acesso à rede local") na primeira vez que um site publicado chama 127.0.0.1.
 */
export type Licenca = 'sim' | 'perguntar' | 'nao' | 'desconhecida';

export async function licencaDoPC(hostname: string, perms: Permissions | undefined = globalThis.navigator?.permissions): Promise<Licenca> {
  if (podeProcurar(hostname)) return 'sim';
  for (const name of ['local-network-access', 'loopback-network']) {
    try {
      const st = (await perms?.query({ name } as unknown as PermissionDescriptor))?.state;
      if (st === 'granted') return 'sim';
      if (st === 'denied') return 'nao';
      if (st === 'prompt') return 'perguntar';
    } catch {
      // este navegador não conhece a licença com esse nome
    }
  }
  return 'desconhecida';
}

export type Escolha =
  | { onde: 'pc'; saude: Saude }
  | { onde: 'nuvem'; procura: Procura; aviso?: string }
  /** "Meu PC" escolhido, mas ele não está pronto. */
  | { onde: 'pc-fora'; motivo: 'desligado' | 'licenca' | 'placa'; detalhe?: string };

export interface DepsEscolha {
  licenca(): Promise<Licenca>;
  procurarPC(timeoutMs: number): Promise<Saude | null>;
  procurarNuvem(): Promise<Procura>;
}

/** Quanto esperar o PC responder quando o navegador ainda vai perguntar se pode: dá tempo de clicar em Permitir. */
export const ESPERA_LICENCA_MS = 60_000;

/**
 * Decide quem faz a IA. No automático, o PC só é procurado se o navegador já deixou (assim
 * ninguém leva um pedido de licença de surpresa); com a placa ocupada, vai para a nuvem com aviso.
 */
/** Placa livre, ou o servidor acabou de abrir e ainda vai prender a trava (a tela espera o modelo). */
const placaServe = (s: Saude) => !s.placa || s.placa.ok || s.placa.motivo === 'abrindo';

export async function escolherMotor(motor: Motor, d: DepsEscolha): Promise<Escolha> {
  if (motor === 'nuvem') return { onde: 'nuvem', procura: await d.procurarNuvem() };
  const licenca = await d.licenca();
  if (motor === 'pc') {
    if (licenca === 'nao') return { onde: 'pc-fora', motivo: 'licenca' };
    const s = await d.procurarPC(licenca === 'perguntar' ? ESPERA_LICENCA_MS : 2500);
    if (!s) return { onde: 'pc-fora', motivo: 'desligado' };
    if (!placaServe(s)) return { onde: 'pc-fora', motivo: 'placa', detalhe: s.placa?.motivo };
    return { onde: 'pc', saude: s };
  }
  const s = licenca === 'sim' || licenca === 'desconhecida' ? await d.procurarPC(1500) : null;
  if (s && placaServe(s)) return { onde: 'pc', saude: s };
  const aviso = s?.placa && !s.placa.ok ? `A placa de vídeo do PC está ocupada (${s.placa.motivo ?? 'outro programa'}). Usando a nuvem.` : undefined;
  return { onde: 'nuvem', procura: await d.procurarNuvem(), ...(aviso ? { aviso } : {}) };
}

/** Link que o Windows entrega para local/iniciar.mjs --site (registrado por local/protocolo-instalar.ps1). */
export const LINK_LIGAR_PC = 'kotoba-local://iniciar';

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

// ---------------------------------------------------------------- híbrido

/** Quem escreveu a última resposta do personagem, para a tela mostrar. */
export interface QuemRespondeu {
  onde: 'nuvem' | 'pc';
  modelo: string;
  /** Quando o PC respondeu no lugar da nuvem: por que a nuvem não serviu. */
  motivo?: ErroNuvem;
}

export interface ClienteHibrido extends Cliente {
  quem: QuemRespondeu | null;
}

/** Quanto esperar a nuvem antes de passar o texto para o modelo do PC. */
export const ESPERA_NUVEM_MS = 25_000;

/**
 * PC ligado e sessão na nuvem: o texto vai primeiro para o modelo maior da nuvem; se ela falhar,
 * ficar sem cota ou sem internet, o modelo do PC responde no lugar. Ouvir, furigana e voz ficam no PC.
 * Depois de cota acabada ou sessão vencida, não insiste na nuvem até a próxima vez que abrir a Conversa.
 */
export function criarClienteHibrido(
  pc: Cliente,
  nuvem: ClienteNuvem,
  modelos: { nuvem: string; pc: string },
  esperaMs = ESPERA_NUVEM_MS,
): ClienteHibrido {
  let desistiu: ErroNuvem | null = null;
  const h: ClienteHibrido = {
    quem: null,
    chat: async (mensagens, esquema) => {
      let motivo: ErroNuvem | undefined = desistiu ?? undefined;
      if (!desistiu) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const texto = await Promise.race([
            nuvem.chat(mensagens, esquema),
            new Promise<never>((_, nao) => {
              timer = setTimeout(() => nao(new FalhaNuvem('rede')), esperaMs);
            }),
          ]);
          h.quem = { onde: 'nuvem', modelo: modelos.nuvem };
          return texto;
        } catch (e) {
          motivo = e instanceof FalhaNuvem ? e.motivo : 'ia';
          if (motivo === 'limite' || motivo === 'sessao') desistiu = motivo;
        } finally {
          clearTimeout(timer);
        }
      }
      const texto = await pc.chat(mensagens, esquema);
      h.quem = { onde: 'pc', modelo: modelos.pc, motivo };
      return texto;
    },
    leitura: (texto) => pc.leitura(texto),
    ouvir: (audio, dica) => pc.ouvir(audio, dica),
    voz: (texto, voz) => pc.voz(texto, voz),
  };
  return h;
}

/** A linha que a tela mostra embaixo da conversa: qual modelo escreveu a última resposta. */
export function textoDeQuem(q: QuemRespondeu | null): string {
  if (!q) return '';
  if (q.onde === 'nuvem') return `Texto: ${q.modelo} (nuvem)`;
  const porque = q.motivo === 'limite' ? 'a cota da nuvem acabou' : q.motivo === 'sessao' ? 'a sessão da nuvem venceu' : q.motivo ? 'a nuvem não respondeu' : '';
  return `Texto: ${q.modelo} (seu PC${porque ? `, porque ${porque}` : ''})`;
}
