/**
 * O site mudou do GitHub Pages para a Cloudflare. O endereço antigo virou uma
 * página que lê o save de lá (o navegador guarda o save por endereço) e manda
 * para cá no fim do link: `#migrar=<save em base64url>`. O fim do link (depois do
 * #) não vai para servidor nenhum.
 *
 * Este arquivo roda antes de tudo (primeiro import do main.tsx), antes de o jogo
 * ler o save.
 */
import { normalizeSave, SAVE_KEY, type KeyValueStore } from './save';

export const PREFIXO = '#migrar=';

function deBase64url(texto: string): string {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function paraBase64url(texto: string): string {
  let bin = '';
  for (const b of new TextEncoder().encode(texto)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export type Resultado = 'sem-migracao' | 'importado' | 'mantido' | 'invalido';

/**
 * Traz o save que veio no link. Só substitui o daqui se o que chegou for mais
 * novo; o que for substituído fica guardado numa cópia.
 */
export function aplicarMudanca(hash: string, store: KeyValueStore, now: number): Resultado {
  if (!hash.startsWith(PREFIXO)) return 'sem-migracao';
  let chegou: ReturnType<typeof normalizeSave>;
  let texto: string;
  try {
    texto = deBase64url(hash.slice(PREFIXO.length));
    chegou = normalizeSave(JSON.parse(texto), now);
  } catch {
    return 'invalido';
  }
  const atual = store.getItem(SAVE_KEY);
  if (atual) {
    try {
      const aqui = normalizeSave(JSON.parse(atual), now);
      if (aqui.updatedAt >= chegou.updatedAt) return 'mantido';
    } catch {
      // save daqui estragado: o que chegou ganha
    }
    store.setItem(`${SAVE_KEY}:antes-da-mudanca:${now}`, atual);
  }
  store.setItem(SAVE_KEY, texto);
  return 'importado';
}

if (typeof location !== 'undefined' && location.hash.startsWith(PREFIXO)) {
  try {
    aplicarMudanca(location.hash, localStorage, Date.now());
  } catch {
    // sem espaço no navegador: abre com o save que já estava aqui
  }
  history.replaceState(null, '', location.pathname + location.search);
}
