/**
 * As peças de IA da Conversa no Workers AI. A personalidade e as regras de cada
 * personagem não moram aqui: vêm prontas do jogo (src/games/conversa/engine.ts),
 * as mesmas que o servidor do PC manda para o Ollama.
 *
 * Por que estes modelos (comparação em docs/nuvem.md):
 * - conversa: Gemma 4 26B, da mesma família do gemma4:12b do PC. Respondeu no
 *   formato pedido em todas as cenas, em 2 a 5 s, gastando uns 9 neurons por fala;
 * - reserva: Mistral Small 3.1, que também acertou o formato, se o Gemma falhar;
 * - ouvido: whisper-large-v3-turbo, o mesmo modelo do PC;
 * - leitura (furigana): Qwen 3.8 27B. Foi o único que acertou todas as leituras
 *   do teste (o Gemma leu 四百 como シヒャク). Custa mais, por isso só é chamado
 *   quando a frase tem kanji.
 */

export const MODELO_CONVERSA = '@cf/google/gemma-4-26b-a4b-it';
export const MODELO_RESERVA = '@cf/mistralai/mistral-small-3.1-24b-instruct';
export const MODELO_OUVIDO = '@cf/openai/whisper-large-v3-turbo';
export const MODELO_LEITURA = '@cf/qwen/qwen3.8-27b';

export interface Ai {
  run(modelo: string, entrada: Record<string, unknown>): Promise<unknown>;
}

export interface Mensagem {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** O plano gratuito acabou por hoje (10.000 neurons por dia, zera às 00:00 UTC). */
export class LimiteDoDia extends Error {
  constructor() {
    super('limite diário do Workers AI');
  }
}

export function ehLimite(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e);
  return /4006|daily free allocation|neurons|quota|rate limit|429/i.test(m);
}

const MAX_MENSAGENS = 40;
const MAX_TEXTO = 24_000;
const MAX_ESQUEMA = 8_000;

/** Confere o pedido do jogo antes de gastar cota. Devolve o motivo da recusa, ou null. */
export function pedidoInvalido(mensagens: unknown, esquema: unknown): string | null {
  if (!Array.isArray(mensagens) || mensagens.length === 0 || mensagens.length > MAX_MENSAGENS) return 'mensagens';
  let total = 0;
  for (const m of mensagens as Mensagem[]) {
    if (!m || !['system', 'user', 'assistant'].includes(m.role) || typeof m.content !== 'string') return 'mensagens';
    total += m.content.length;
  }
  if (total > MAX_TEXTO) return 'mensagens';
  if (esquema !== undefined && (typeof esquema !== 'object' || esquema === null || JSON.stringify(esquema).length > MAX_ESQUEMA)) return 'esquema';
  return null;
}

function textoDa(saida: unknown): string {
  const s = saida as { response?: unknown; choices?: { message?: { content?: unknown } }[] };
  const r = s?.choices?.[0]?.message?.content ?? s?.response;
  if (typeof r === 'string') return r;
  if (r && typeof r === 'object') return JSON.stringify(r);
  throw new Error('o modelo não devolveu texto');
}

function entradaConversa(modelo: string, mensagens: Mensagem[], esquema: object | undefined): Record<string, unknown> {
  return {
    messages: mensagens,
    ...(esquema ? { response_format: { type: 'json_schema', json_schema: esquema } } : {}),
    temperature: 0.7,
    max_tokens: 400,
    // O Gemma 4 pensa antes de responder se ninguém disser que não; aqui só atrasaria a fala.
    ...(modelo.includes('gemma-4') ? { chat_template_kwargs: { enable_thinking: false } } : {}),
  };
}

export async function conversar(ai: Ai, mensagens: Mensagem[], esquema: object | undefined): Promise<{ texto: string; modelo: string }> {
  try {
    return { texto: textoDa(await ai.run(MODELO_CONVERSA, entradaConversa(MODELO_CONVERSA, mensagens, esquema))), modelo: MODELO_CONVERSA };
  } catch (e) {
    if (ehLimite(e)) throw new LimiteDoDia();
  }
  try {
    return { texto: textoDa(await ai.run(MODELO_RESERVA, entradaConversa(MODELO_RESERVA, mensagens, esquema))), modelo: MODELO_RESERVA };
  } catch (e) {
    if (ehLimite(e)) throw new LimiteDoDia();
    throw e;
  }
}

/** Frases que o Whisper inventa quando só ouve silêncio ou ruído (as mesmas do servidor do PC). */
export const ALUCINACOES = /ご視聴ありがとうございました|チャンネル登録|字幕/;

export async function ouvir(ai: Ai, audioB64: string, dica: string): Promise<string> {
  let saida: { text?: unknown; segments?: { text?: string; no_speech_prob?: number }[] };
  try {
    saida = (await ai.run(MODELO_OUVIDO, {
      audio: audioB64,
      language: 'ja',
      vad_filter: true,
      condition_on_previous_text: false,
      ...(dica ? { initial_prompt: dica.slice(0, 200) } : {}),
    })) as typeof saida;
  } catch (e) {
    if (ehLimite(e)) throw new LimiteDoDia();
    throw e;
  }
  const texto = Array.isArray(saida.segments) && saida.segments.length > 0
    ? saida.segments.filter((s) => (s.no_speech_prob ?? 0) < 0.8).map((s) => s.text ?? '').join('')
    : typeof saida.text === 'string' ? saida.text : '';
  const limpo = texto.trim();
  return ALUCINACOES.test(limpo) ? '' : limpo;
}

// ---------------------------------------------------------------- leitura (furigana)

export interface Token {
  t: string;
  r?: string;
}

const KANJI = /[㐀-鿿豈-﫿々]/;
const SO_KANA = /^[ぁ-ゟ゠-ヿー]+$/;

const PROMPT_LEITURA = [
  'Você separa uma frase em japonês em palavras (como o MeCab) e dá a leitura de cada uma em katakana.',
  'Partículas e terminações (は, を, です, ます, ました) são palavras separadas. Pontuação é uma palavra sem leitura.',
  'Juntando os "t" na ordem tem que dar exatamente a frase original, sem tirar nem pôr nada.',
  '"r" é a leitura em katakana de como se fala a palavra (は partícula = ハ). Responda só com o JSON.',
].join(' ');

const ESQUEMA_LEITURA = {
  type: 'object',
  properties: {
    tokens: {
      type: 'array',
      items: { type: 'object', properties: { t: { type: 'string' }, r: { type: 'string' } }, required: ['t', 'r'] },
    },
  },
  required: ['tokens'],
};

/** Confere o que o modelo devolveu: as palavras têm que remontar a frase e a leitura tem que ser só kana. */
export function tokensConferidos(texto: string, bruto: unknown): Token[] | null {
  const lista = (bruto as { tokens?: unknown })?.tokens;
  if (!Array.isArray(lista)) return null;
  const out: Token[] = [];
  for (const item of lista as { t?: unknown; r?: unknown }[]) {
    if (typeof item?.t !== 'string' || !item.t) return null;
    const r = typeof item.r === 'string' ? item.r.trim() : '';
    if (KANJI.test(item.t) && !SO_KANA.test(r)) return null;
    out.push(r && SO_KANA.test(r) ? { t: item.t, r } : { t: item.t });
  }
  return out.map((t) => t.t).join('') === texto ? out : null;
}

export async function leitura(ai: Ai, texto: string): Promise<Token[]> {
  // Sem kanji não há furigana para pôr: nem gasta cota.
  if (!KANJI.test(texto)) return [{ t: texto }];
  let saida: unknown;
  try {
    saida = await ai.run(MODELO_LEITURA, {
      messages: [
        { role: 'system', content: PROMPT_LEITURA },
        { role: 'user', content: texto },
      ],
      response_format: { type: 'json_schema', json_schema: ESQUEMA_LEITURA },
      temperature: 0,
      max_tokens: 500,
      chat_template_kwargs: { enable_thinking: false },
    });
  } catch (e) {
    if (ehLimite(e)) throw new LimiteDoDia();
    throw e;
  }
  let bruto: unknown;
  try {
    bruto = JSON.parse(textoDa(saida));
  } catch {
    bruto = null;
  }
  // Leitura que não confere vira frase sem furigana: melhor que furigana errado.
  return tokensConferidos(texto, bruto) ?? [{ t: texto }];
}
