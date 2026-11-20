/**
 * De onde vem o português falado (aulas do modo Ouvir, narração da Aventura, lições do
 * Kumitate, retorno das perguntas da Jornada). Ver docs/vozes.md.
 *
 * - Voz do PC: o servidor local (`npm run aulas`) entrega gravações que ficam só no PC,
 *   fora do Git e do site. O site pergunta por ele quando a página é local ou quando o
 *   ajuste "voz do PC" está ligado.
 * - Voz livre: gravações em `public/vozes-pt/`, com licença que permite publicar.
 *
 * As duas usam o mesmo texto como chave. Texto sem gravação em nenhuma das duas cai na
 * voz do navegador.
 */
import { signal } from '@preact/signals';

export const SERVIDOR_LOCAL = 'http://127.0.0.1:8791';

export interface ManifestoPt {
  versao: number;
  /** Quem fala (crédito da voz livre, ou "local"). */
  voz: string;
  /** texto → arquivo. */
  falas: Record<string, string>;
}

export interface FontesPt {
  /** Gravações do servidor local, com o endereço de cada arquivo. */
  local: ManifestoPt | null;
  publico: ManifestoPt | null;
}

/** A voz do PC respondeu na última procura. */
export const vozLocalNoAr = signal(false);

const PUBLICO_URL = `${import.meta.env.BASE_URL}vozes-pt/`;

type Fetch = typeof fetch;

/** Página aberta no próprio PC: pode procurar o servidor sem pedir licença ao navegador. */
export function paginaLocal(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname.endsWith('.localhost');
}

function valido(m: unknown): m is ManifestoPt {
  if (typeof m !== 'object' || m === null) return false;
  const x = m as Partial<ManifestoPt>;
  return typeof x.voz === 'string' && typeof x.falas === 'object' && x.falas !== null;
}

async function baixar(url: string, f: Fetch, timeoutMs?: number): Promise<ManifestoPt | null> {
  try {
    const r = await f(url, timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : undefined);
    if (!r.ok) return null;
    const m: unknown = await r.json();
    return valido(m) ? m : null;
  } catch {
    return null;
  }
}

/** Procura o servidor local. Só responde quem roda no PC; um site qualquer não chega nele. */
export function procurarLocal(f: Fetch = fetch, base = SERVIDOR_LOCAL, timeoutMs = 1200): Promise<ManifestoPt | null> {
  return baixar(`${base}/aulas/manifesto.json`, f, timeoutMs);
}

let fontes: Promise<FontesPt> | null = null;
let procurouLocal = false;

/**
 * Carrega o manifesto público uma vez e, se `usarLocal`, procura o servidor local. Ligar o
 * ajuste depois faz uma nova procura; o manifesto público não é baixado de novo.
 */
export function carregarPt(usarLocal: boolean, f: Fetch = fetch): Promise<FontesPt> {
  if (fontes && (procurouLocal || !usarLocal)) return fontes;
  const anterior = fontes;
  procurouLocal = usarLocal;
  fontes = (async () => {
    const publico = anterior ? (await anterior).publico : await baixar(`${PUBLICO_URL}manifesto.json`, f);
    const local = usarLocal ? await procurarLocal(f) : null;
    vozLocalNoAr.value = !!local && Object.keys(local.falas).length > 0;
    return { local, publico };
  })();
  return fontes;
}

/** Esquece a procura: a próxima fala procura o servidor de novo (ele pode ter subido agora). */
export function esquecerPt(): void {
  fontes = null;
  procurouLocal = false;
}

/** Endereço da gravação do texto: a voz do PC primeiro, depois a livre. */
export function urlPt(fontesPt: FontesPt, texto: string, base = SERVIDOR_LOCAL): string | undefined {
  const local = fontesPt.local?.falas[texto];
  if (local) return `${base}/aulas/${local}`;
  const publico = fontesPt.publico?.falas[texto];
  return publico ? PUBLICO_URL + publico : undefined;
}
