/**
 * Limite de tentativas de senha, guardado no Workers KV (o plano gratuito tem
 * 1.000 gravações por dia; só a senha errada grava).
 *
 * - por endereço: 5 erros em 15 minutos e aquele endereço espera o resto dos 15 minutos;
 * - no total: 40 erros numa hora, de qualquer lugar, e ninguém entra até a hora passar.
 *
 * O KV demora alguns segundos para espalhar uma gravação pelo mundo, então quem
 * tenta muito rápido de vários lugares ganha umas tentativas a mais. Para uma
 * senha de jogo pessoal, isso basta.
 */

export interface KV {
  get(chave: string): Promise<string | null>;
  put(chave: string, valor: string, opcoes?: { expirationTtl?: number }): Promise<void>;
  delete(chave: string): Promise<void>;
}

export const POR_IP = { max: 5, janelaS: 15 * 60 };
export const TOTAL = { max: 40, janelaS: 60 * 60 };

interface Contagem {
  n: number;
  /** Quando a janela começou, em segundos. */
  desde: number;
}

function ler(bruto: string | null, agoraS: number, janelaS: number): Contagem {
  try {
    const c = JSON.parse(bruto ?? '') as Contagem;
    if (typeof c.n === 'number' && typeof c.desde === 'number' && agoraS - c.desde < janelaS) return c;
  } catch {
    // sem registro ou registro estragado: começa do zero
  }
  return { n: 0, desde: agoraS };
}

const chaves = (ip: string) => ({ ip: `senha:ip:${ip}`, total: 'senha:total' });

/** Quantos segundos falta esperar (0 = pode tentar). */
export async function esperaPara(kv: KV, ip: string, agoraMs: number): Promise<number> {
  const agoraS = Math.floor(agoraMs / 1000);
  const k = chaves(ip);
  const [a, b] = await Promise.all([kv.get(k.ip), kv.get(k.total)]);
  const ipC = ler(a, agoraS, POR_IP.janelaS);
  const totC = ler(b, agoraS, TOTAL.janelaS);
  let espera = 0;
  if (ipC.n >= POR_IP.max) espera = Math.max(espera, ipC.desde + POR_IP.janelaS - agoraS);
  if (totC.n >= TOTAL.max) espera = Math.max(espera, totC.desde + TOTAL.janelaS - agoraS);
  return espera;
}

/** Conta uma senha errada. Devolve quantas tentativas aquele endereço ainda tem. */
export async function contarErro(kv: KV, ip: string, agoraMs: number): Promise<number> {
  const agoraS = Math.floor(agoraMs / 1000);
  const k = chaves(ip);
  const [a, b] = await Promise.all([kv.get(k.ip), kv.get(k.total)]);
  const ipC = ler(a, agoraS, POR_IP.janelaS);
  const totC = ler(b, agoraS, TOTAL.janelaS);
  ipC.n++;
  totC.n++;
  // O KV não aceita prazo menor que 60 s.
  const ttl = (c: Contagem, janela: number) => Math.max(60, c.desde + janela - agoraS);
  await Promise.all([
    kv.put(k.ip, JSON.stringify(ipC), { expirationTtl: ttl(ipC, POR_IP.janelaS) }),
    kv.put(k.total, JSON.stringify(totC), { expirationTtl: ttl(totC, TOTAL.janelaS) }),
  ]);
  return Math.max(0, POR_IP.max - ipC.n);
}

/** Acertou: o endereço volta a ter todas as tentativas. */
export async function zerar(kv: KV, ip: string): Promise<void> {
  const k = chaves(ip);
  if ((await kv.get(k.ip)) !== null) await kv.delete(k.ip);
}
