/**
 * As rotas `/api` da Conversa por voz na Cloudflare (Pages Functions).
 *
 *   GET  /api/estado    o que está ligado (só com sessão; sem ela, 401)
 *   POST /api/entrar    { senha } -> cookie de sessão
 *   POST /api/sair      apaga o cookie
 *   POST /api/conversa  { mensagens, esquema } -> { texto }   (Workers AI)
 *   POST /api/ouvir     { audio: base64, dica } -> { texto }  (Workers AI)
 *   POST /api/leitura   { texto } -> { tokens }               (Workers AI, para o furigana)
 *
 * A voz dos personagens também não: as falas fixas tocam os mp3 gravados e o resto
 * usa a voz do navegador, porque o Workers AI não tem mais voz em japonês.
 */
import { conversar, leitura, LimiteDoDia, MODELO_CONVERSA, ouvir, pedidoInvalido, type Ai, type Mensagem } from './ia';
import { contarErro, esperaPara, zerar, type KV } from './tentativas';
import { cookieDaSessao, criarToken, DURACAO_S, lerCookie, senhaConfere, tokenValido } from './sessao';

export interface Env {
  /** Segredo: a senha da Conversa. */
  SENHA?: string;
  /** Segredo: chave que assina as sessões. Trocar derruba todas as sessões. */
  SESSAO_CHAVE?: string;
  /** Outras origens aceitas além do próprio site, separadas por vírgula. */
  ORIGENS?: string;
  AI?: Ai;
  TENTATIVAS?: KV;
}

export interface Opcoes {
  agora?: () => number;
}

const MAX_AUDIO_B64 = 3_000_000; // ~2 MB de áudio: bem mais que uma fala de 30 s

function origensAceitas(req: Request, env: Env): Set<string> {
  const s = new Set([new URL(req.url).origin]);
  for (const o of (env.ORIGENS ?? '').split(',')) if (o.trim()) s.add(o.trim().replace(/\/$/, ''));
  return s;
}

function json(corpo: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });
}

function comCors(r: Response, origem: string | null): Response {
  if (!origem) return r;
  const h = new Headers(r.headers);
  h.set('Access-Control-Allow-Origin', origem);
  h.set('Access-Control-Allow-Credentials', 'true');
  h.set('Vary', 'Origin');
  return new Response(r.body, { status: r.status, headers: h });
}

async function lerJson(req: Request, max: number): Promise<Record<string, unknown> | null> {
  const n = Number(req.headers.get('Content-Length') ?? '0');
  if (n > max) return null;
  const texto = await req.text();
  if (texto.length > max) return null;
  try {
    const v = JSON.parse(texto) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const ip = (req: Request) => req.headers.get('CF-Connecting-IP') ?? 'desconhecido';

export async function tratar(req: Request, env: Env, op: Opcoes = {}): Promise<Response> {
  const agora = op.agora ?? Date.now;
  const url = new URL(req.url);
  const rota = url.pathname.replace(/^.*\/api\//, '').replace(/\/$/, '');

  // CORS: só o próprio site (e o que estiver em ORIGENS). Pedido de outra origem nem chega na IA.
  const origem = req.headers.get('Origin');
  if (origem && !origensAceitas(req, env).has(origem)) return json({ erro: 'origem' }, 403);
  if (req.method === 'OPTIONS') {
    return comCors(
      new Response(null, {
        status: 204,
        headers: { 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' },
      }),
      origem,
    );
  }
  return comCors(await rotear(req, env, rota, agora), origem);
}

async function rotear(req: Request, env: Env, rota: string, agora: () => number): Promise<Response> {
  const chave = env.SESSAO_CHAVE ?? '';
  if (!env.SENHA || !chave) return json({ erro: 'configuracao' }, 503);

  if (rota === 'entrar') {
    if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);
    if (!env.TENTATIVAS) return json({ erro: 'configuracao' }, 503);
    const espera = await esperaPara(env.TENTATIVAS, ip(req), agora());
    if (espera > 0) return json({ erro: 'tentativas', esperar: espera }, 429, { 'Retry-After': String(espera) });
    const corpo = await lerJson(req, 2_000);
    if (!(await senhaConfere(corpo?.senha, env.SENHA))) {
      const restam = await contarErro(env.TENTATIVAS, ip(req), agora());
      return json({ erro: 'senha', restam }, 401);
    }
    await zerar(env.TENTATIVAS, ip(req));
    const { token, vence } = await criarToken(chave, agora());
    return json({ ok: true, vence }, 200, { 'Set-Cookie': cookieDaSessao(token, DURACAO_S) });
  }

  if (rota === 'sair') {
    if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);
    return json({ ok: true }, 200, { 'Set-Cookie': cookieDaSessao('', 0) });
  }

  // Daqui para baixo, toda rota é de IA: sem sessão válida, nada.
  if (!(await tokenValido(chave, lerCookie(req), agora()))) return json({ erro: 'sessao' }, 401);
  if (!env.AI) return json({ erro: 'configuracao' }, 503);

  try {
    if (rota === 'estado' && req.method === 'GET') {
      return json({
        ok: true,
        nuvem: true,
        conversa: { ok: true, modelo: MODELO_CONVERSA.split('/').pop() },
        fala: { ok: true },
        voz: { ok: false, motor: 'navegador' },
      });
    }
    if (rota === 'conversa' && req.method === 'POST') {
      const corpo = await lerJson(req, 64_000);
      const motivo = corpo ? pedidoInvalido(corpo.mensagens, corpo.esquema) : 'corpo';
      if (motivo || !corpo) return json({ erro: motivo }, 400);
      const t = agora();
      const r = await conversar(env.AI, corpo.mensagens as Mensagem[], corpo.esquema as object | undefined);
      return json({ texto: r.texto, modelo: r.modelo, ms: agora() - t });
    }
    if (rota === 'leitura' && req.method === 'POST') {
      const corpo = await lerJson(req, 4_000);
      const texto = typeof corpo?.texto === 'string' ? corpo.texto.slice(0, 400) : '';
      if (!texto) return json({ erro: 'texto' }, 400);
      return json({ tokens: await leitura(env.AI, texto) });
    }
    if (rota === 'ouvir' && req.method === 'POST') {
      const corpo = await lerJson(req, MAX_AUDIO_B64 + 2_000);
      const audio = corpo?.audio;
      if (typeof audio !== 'string' || !/^[A-Za-z0-9+/=]*$/.test(audio.slice(0, 200))) return json({ erro: 'audio' }, 400);
      // Menos de ~1 KB de áudio é clique de botão, não fala.
      if (audio.length < 1_400) return json({ texto: '', ms: 0 });
      const t = agora();
      const texto = await ouvir(env.AI, audio, typeof corpo?.dica === 'string' ? corpo.dica : '');
      return json({ texto, ms: agora() - t });
    }
  } catch (e) {
    if (e instanceof LimiteDoDia) return json({ erro: 'limite' }, 429);
    // Sem detalhes para fora: a mensagem pode trazer o pedido inteiro.
    return json({ erro: 'ia' }, 502);
  }
  return json({ erro: 'rota' }, 404);
}
