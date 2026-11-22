/**
 * De onde vem o português falado (aulas do modo Ouvir, narração da Aventura, lições do
 * Kumitate, retorno das perguntas da Jornada). Ver docs/vozes.md.
 *
 * Uma voz só, gravada em `public/vozes-pt/voz1/`, com o texto como chave. Texto sem
 * gravação não toca (o teste `vozes-pt` barra texto novo sem áudio).
 */

export interface ManifestoPt {
  versao: number;
  voz: string;
  /** texto → arquivo. */
  falas: Record<string, string>;
}

const BASE = `${import.meta.env.BASE_URL}vozes-pt/voz1/`;

type Fetch = typeof fetch;

function valido(m: unknown): m is ManifestoPt {
  if (typeof m !== 'object' || m === null) return false;
  const x = m as Partial<ManifestoPt>;
  return typeof x.voz === 'string' && typeof x.falas === 'object' && x.falas !== null;
}

let manifesto: Promise<ManifestoPt | null> | null = null;

/** Baixa o manifesto uma vez só. Sem rede ou sem arquivo, fica null. */
export function carregarPt(f: Fetch = fetch): Promise<ManifestoPt | null> {
  manifesto ??= (async () => {
    try {
      const r = await f(`${BASE}manifesto.json`);
      if (!r.ok) return null;
      const m: unknown = await r.json();
      return valido(m) ? m : null;
    } catch {
      return null;
    }
  })();
  return manifesto;
}

/** Esquece o manifesto baixado (testes). */
export function esquecerPt(): void {
  manifesto = null;
}

/** Endereço da gravação do texto. */
export function urlPt(m: ManifestoPt | null, texto: string): string | undefined {
  const arquivo = m?.falas[texto];
  return arquivo ? `${BASE}${arquivo}` : undefined;
}
