/**
 * Senha e sessão da Conversa na nuvem.
 *
 * A senha só existe como segredo do servidor (`wrangler pages secret put SENHA`).
 * Quem acerta recebe um cookie com o prazo e uma assinatura HMAC; o servidor não
 * guarda nada sobre a sessão, só confere a assinatura e o prazo.
 */

export const COOKIE = 'kotoba_sessao';
/** A senha é pedida uma vez a cada 30 dias. */
export const DURACAO_S = 30 * 24 * 60 * 60;
const VERSAO = 'v1';

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer): string {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(chave: string, texto: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', enc.encode(chave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(texto));
}

/** Compara sem dar pista pelo tempo de resposta: os dois lados viram um HMAC de mesmo tamanho antes. */
async function iguais(a: string, b: string): Promise<boolean> {
  const sal = crypto.getRandomValues(new Uint8Array(16)).join('.');
  const [ha, hb] = await Promise.all([hmac(sal, a), hmac(sal, b)]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let dif = 0;
  for (let i = 0; i < x.length; i++) dif |= (x[i] as number) ^ (y[i] as number);
  return dif === 0;
}

export function senhaConfere(digitada: unknown, certa: string): Promise<boolean> {
  if (typeof digitada !== 'string' || !certa) return Promise.resolve(false);
  return iguais(digitada, certa);
}

/** `v1.<vence em segundos>.<assinatura>` */
export async function criarToken(chave: string, agoraMs: number, duracaoS = DURACAO_S): Promise<{ token: string; vence: number }> {
  const vence = Math.floor(agoraMs / 1000) + duracaoS;
  const corpo = `${VERSAO}.${vence}`;
  return { token: `${corpo}.${b64url(await hmac(chave, corpo))}`, vence };
}

export async function tokenValido(chave: string, token: string | null | undefined, agoraMs: number): Promise<boolean> {
  if (!chave || !token) return false;
  const partes = token.split('.');
  if (partes.length !== 3 || partes[0] !== VERSAO || !/^\d{1,12}$/.test(partes[1] as string)) return false;
  const vence = Number(partes[1]);
  if (vence * 1000 <= agoraMs) return false;
  const esperada = b64url(await hmac(chave, `${VERSAO}.${vence}`));
  return iguais(esperada, partes[2] as string);
}

export function lerCookie(req: Request, nome = COOKIE): string | null {
  const bruto = req.headers.get('Cookie') ?? '';
  for (const parte of bruto.split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nome) return parte.slice(i + 1).trim();
  }
  return null;
}

/** Só vale para as rotas `/api`, nunca é lido pelo JavaScript da página e não vai em pedido de outro site. */
export function cookieDaSessao(token: string, maxAgeS: number): string {
  return `${COOKIE}=${token}; Path=/api; Max-Age=${maxAgeS}; HttpOnly; Secure; SameSite=Strict`;
}
