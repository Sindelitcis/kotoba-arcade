/**
 * De onde vem o português falado (aulas do modo Ouvir, narração da Aventura, lições do
 * Kumitate, retorno das perguntas da Jornada). Ver docs/vozes.md.
 *
 * Duas vozes gravadas, com o mesmo texto como chave:
 * - Voz 1 (`public/vozes-pt/voz1/`), a padrão.
 * - Voz 2 (`public/vozes-pt/voz2/`), sintética.
 *
 * Toca a voz escolhida nos Ajustes; texto que só a outra tem toca na outra. Sem gravação
 * em nenhuma das duas, a voz do navegador.
 */

export const VOZES_PT = ['voz1', 'voz2'] as const;
export type VozPt = (typeof VOZES_PT)[number];
export const VOZ_PT_PADRAO: VozPt = 'voz1';

/** Nome de cada voz como aparece nos Ajustes. */
export const NOME_VOZ_PT: Record<VozPt, string> = {
  voz1: 'Voz 1',
  voz2: 'Voz 2',
};

export interface ManifestoPt {
  versao: number;
  voz: string;
  /** texto → arquivo. */
  falas: Record<string, string>;
}

/** Manifestos já baixados de cada voz (null: não veio). */
export type FontesPt = Record<VozPt, ManifestoPt | null>;

const BASE = `${import.meta.env.BASE_URL}vozes-pt/`;

type Fetch = typeof fetch;

function valido(m: unknown): m is ManifestoPt {
  if (typeof m !== 'object' || m === null) return false;
  const x = m as Partial<ManifestoPt>;
  return typeof x.voz === 'string' && typeof x.falas === 'object' && x.falas !== null;
}

async function baixar(url: string, f: Fetch): Promise<ManifestoPt | null> {
  try {
    const r = await f(url);
    if (!r.ok) return null;
    const m: unknown = await r.json();
    return valido(m) ? m : null;
  } catch {
    return null;
  }
}

let fontes: Promise<FontesPt> | null = null;

/** Baixa os dois manifestos uma vez só. */
export function carregarPt(f: Fetch = fetch): Promise<FontesPt> {
  fontes ??= (async () => {
    const [voz1, voz2] = await Promise.all(VOZES_PT.map((v) => baixar(`${BASE}${v}/manifesto.json`, f)));
    return { voz1: voz1 ?? null, voz2: voz2 ?? null };
  })();
  return fontes;
}

/** Esquece os manifestos baixados (testes). */
export function esquecerPt(): void {
  fontes = null;
}

/** Endereço da gravação do texto: a voz escolhida primeiro, depois a outra. */
export function urlPt(fontesPt: FontesPt, texto: string, voz: VozPt): string | undefined {
  for (const v of [voz, ...VOZES_PT.filter((x) => x !== voz)]) {
    const arquivo = fontesPt[v]?.falas[texto];
    if (arquivo) return `${BASE}${v}/${arquivo}`;
  }
  return undefined;
}
