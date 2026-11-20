/** O que o modo Ouvir guarda: quantas vezes cada aula foi ouvida até o fim, e a última aberta. */
export interface OuvirSave {
  ouvidas: Record<string, number>;
  ultima?: string;
}

export function emptyOuvirSave(): OuvirSave {
  return { ouvidas: {} };
}

/** Devolve o save do modo Ouvir dentro de `games`, criando ou consertando o que faltar. Sempre o mesmo objeto. */
export function ensureOuvirSave(games: Record<string, unknown>): OuvirSave {
  const atual = games.ouvir;
  if (typeof atual !== 'object' || atual === null || Array.isArray(atual)) {
    const base = emptyOuvirSave();
    games.ouvir = base;
    return base;
  }
  const s = atual as Record<string, unknown>;
  const ouvidas = typeof s.ouvidas === 'object' && s.ouvidas !== null && !Array.isArray(s.ouvidas) ? (s.ouvidas as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries(ouvidas)) if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) delete ouvidas[k];
  s.ouvidas = ouvidas;
  if (typeof s.ultima !== 'string') delete s.ultima;
  return s as unknown as OuvirSave;
}

/** Aula ouvida até o fim. */
export function registrarOuvida(save: OuvirSave, id: string): void {
  save.ouvidas[id] = (save.ouvidas[id] ?? 0) + 1;
}
