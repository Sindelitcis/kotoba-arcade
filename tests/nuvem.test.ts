// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { tratar, type Env } from '../nuvem/app';
import { ehLimite, MODELO_CONVERSA, MODELO_LEITURA, MODELO_OUVIDO, MODELO_RESERVA, tokensConferidos, type Ai } from '../nuvem/ia';
import { criarToken, tokenValido, DURACAO_S } from '../nuvem/sessao';
import { POR_IP, TOTAL, type KV } from '../nuvem/tentativas';

// Senha de teste: a de verdade só existe no segredo do servidor.
const SENHA = 'senha-de-teste';
const CHAVE = 'chave-de-teste-para-assinar';
const SITE = 'https://kotoba-arcade.pages.dev';
const T0 = Date.UTC(2026, 10, 20, 12);

function kvFalso(): KV & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return {
    dados,
    get: async (k) => dados.get(k) ?? null,
    put: async (k, v) => void dados.set(k, v),
    delete: async (k) => void dados.delete(k),
  };
}

function aiFalsa(respostas: Record<string, unknown | Error> = {}): Ai & { chamadas: { modelo: string; entrada: Record<string, unknown> }[] } {
  const chamadas: { modelo: string; entrada: Record<string, unknown> }[] = [];
  return {
    chamadas,
    run: async (modelo, entrada) => {
      chamadas.push({ modelo, entrada });
      const r = respostas[modelo];
      if (r instanceof Error) throw r;
      return r ?? { choices: [{ message: { content: '{"fala":"はい。"}' } }] };
    },
  };
}

function env(extra: Partial<Env> = {}): Env & { TENTATIVAS: ReturnType<typeof kvFalso>; AI: ReturnType<typeof aiFalsa> } {
  return { SENHA, SESSAO_CHAVE: CHAVE, TENTATIVAS: kvFalso(), AI: aiFalsa(), ...extra } as never;
}

function pedido(rota: string, init: RequestInit & { cookie?: string; ip?: string } = {}): Request {
  const h = new Headers(init.headers);
  if (init.cookie) h.set('Cookie', init.cookie);
  h.set('CF-Connecting-IP', init.ip ?? '203.0.113.7');
  if (init.body && !h.has('Content-Type')) h.set('Content-Type', 'application/json');
  return new Request(`${SITE}/api/${rota}`, { ...init, headers: h });
}

const entrar = (e: Env, senha: string, ip?: string, agora = T0) =>
  tratar(pedido('entrar', { method: 'POST', body: JSON.stringify({ senha }), ip }), e, { agora: () => agora });

async function cookieValido(e: Env, agora = T0): Promise<string> {
  const r = await entrar(e, SENHA, undefined, agora);
  expect(r.status).toBe(200);
  const sc = r.headers.get('Set-Cookie') ?? '';
  return sc.split(';')[0] as string;
}

describe('senha', () => {
  it('senha certa: entra e recebe um cookie de sessão protegido', async () => {
    const r = await entrar(env(), SENHA);
    expect(r.status).toBe(200);
    const sc = r.headers.get('Set-Cookie') ?? '';
    expect(sc).toMatch(/^kotoba_sessao=v1\.\d+\./);
    expect(sc).toContain('HttpOnly');
    expect(sc).toContain('Secure');
    expect(sc).toContain('SameSite=Strict');
    expect(sc).toContain('Path=/api');
    expect(sc).toContain(`Max-Age=${DURACAO_S}`);
    // A resposta nunca devolve a senha.
    expect(await r.text()).not.toContain(SENHA);
  });

  it('senha errada: recusa, não dá cookie e conta a tentativa', async () => {
    const e = env();
    const r = await entrar(e, 'chute');
    expect(r.status).toBe(401);
    expect(r.headers.get('Set-Cookie')).toBeNull();
    expect(await r.json()).toEqual({ erro: 'senha', restam: POR_IP.max - 1 });
  });

  it('senha que não é texto também é recusada', async () => {
    const r = await tratar(pedido('entrar', { method: 'POST', body: JSON.stringify({ senha: 123 }) }), env(), { agora: () => T0 });
    expect(r.status).toBe(401);
  });

  it(`depois de ${POR_IP.max} erros o endereço espera, até com a senha certa`, async () => {
    const e = env();
    for (let i = 0; i < POR_IP.max; i++) expect((await entrar(e, `chute${i}`)).status).toBe(401);
    const bloqueado = await entrar(e, SENHA, undefined, T0 + 60_000);
    expect(bloqueado.status).toBe(429);
    const corpo = (await bloqueado.json()) as { erro: string; esperar: number };
    expect(corpo.erro).toBe('tentativas');
    expect(corpo.esperar).toBeGreaterThan(0);
    // Outro endereço continua podendo tentar.
    expect((await entrar(e, SENHA, '198.51.100.9', T0 + 60_000)).status).toBe(200);
    // Passada a janela, o primeiro também volta.
    expect((await entrar(e, SENHA, undefined, T0 + POR_IP.janelaS * 1000 + 1000)).status).toBe(200);
  });

  it('erros espalhados por muitos endereços travam todo mundo', async () => {
    const e = env();
    for (let i = 0; i < TOTAL.max; i++) await entrar(e, 'chute', `10.0.${Math.floor(i / 4)}.${i % 4}`);
    expect((await entrar(e, SENHA, '192.0.2.1')).status).toBe(429);
  });

  it('acertar zera as tentativas daquele endereço', async () => {
    const e = env();
    await entrar(e, 'chute');
    await entrar(e, SENHA);
    expect((await (await entrar(e, 'chute')).json()) as object).toEqual({ erro: 'senha', restam: POR_IP.max - 1 });
  });

  it('sem os segredos configurados, ninguém entra', async () => {
    expect((await entrar(env({ SENHA: undefined }), SENHA)).status).toBe(503);
    expect((await entrar(env({ SESSAO_CHAVE: undefined }), SENHA)).status).toBe(503);
  });
});

describe('sessão', () => {
  it('token assinado vale até o prazo e depois vence', async () => {
    const { token, vence } = await criarToken(CHAVE, T0, 60);
    expect(vence).toBe(T0 / 1000 + 60);
    expect(await tokenValido(CHAVE, token, T0 + 59_000)).toBe(true);
    expect(await tokenValido(CHAVE, token, T0 + 60_000)).toBe(false);
  });

  it('token mexido ou assinado com outra chave não vale', async () => {
    const { token } = await criarToken(CHAVE, T0, 60);
    const [v, , sig] = token.split('.');
    expect(await tokenValido(CHAVE, `${v}.${T0 / 1000 + 99999}.${sig}`, T0)).toBe(false);
    expect(await tokenValido('outra-chave', token, T0)).toBe(false);
    expect(await tokenValido(CHAVE, 'lixo', T0)).toBe(false);
    expect(await tokenValido(CHAVE, null, T0)).toBe(false);
  });

  it('sessão vencida: a rota de IA recusa', async () => {
    const e = env();
    const cookie = await cookieValido(e, T0);
    const depois = T0 + (DURACAO_S + 1) * 1000;
    const r = await tratar(pedido('estado', { cookie }), e, { agora: () => depois });
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ erro: 'sessao' });
  });

  it('sair apaga o cookie', async () => {
    const r = await tratar(pedido('sair', { method: 'POST' }), env(), { agora: () => T0 });
    expect(r.headers.get('Set-Cookie')).toMatch(/^kotoba_sessao=; .*Max-Age=0/);
  });
});

describe('rotas de IA', () => {
  const rotas: [string, RequestInit][] = [
    ['estado', {}],
    ['conversa', { method: 'POST', body: JSON.stringify({ mensagens: [{ role: 'user', content: 'こんにちは' }] }) }],
    ['ouvir', { method: 'POST', body: JSON.stringify({ audio: 'A'.repeat(5000), dica: '' }) }],
    ['leitura', { method: 'POST', body: JSON.stringify({ texto: '駅' }) }],
  ];

  for (const [rota, init] of rotas) {
    it(`/api/${rota} sem sessão: 401 e a IA nem é chamada`, async () => {
      const e = env();
      const r = await tratar(pedido(rota, init), e, { agora: () => T0 });
      expect(r.status).toBe(401);
      expect(e.AI.chamadas).toHaveLength(0);
    });

    it(`/api/${rota} com cookie falso: 401`, async () => {
      const e = env();
      const r = await tratar(pedido(rota, { ...init, cookie: 'kotoba_sessao=v1.9999999999.abc' }), e, { agora: () => T0 });
      expect(r.status).toBe(401);
    });
  }

  it('com sessão: estado diz o que está ligado na nuvem', async () => {
    const e = env();
    const cookie = await cookieValido(e);
    const r = await tratar(pedido('estado', { cookie }), e, { agora: () => T0 });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, nuvem: true, conversa: { ok: true }, fala: { ok: true }, voz: { ok: false } });
  });

  it('com sessão: conversa manda as mensagens e o formato para o Gemma, sem pensar antes', async () => {
    const e = env();
    const cookie = await cookieValido(e);
    const mensagens = [
      { role: 'system', content: 'Você é a Sakura.' },
      { role: 'user', content: 'こおひいおください' },
    ];
    const esquema = { type: 'object', properties: { fala: { type: 'string' } } };
    const r = await tratar(pedido('conversa', { method: 'POST', cookie, body: JSON.stringify({ mensagens, esquema }) }), e, { agora: () => T0 });
    expect(r.status).toBe(200);
    expect(((await r.json()) as { texto: string }).texto).toBe('{"fala":"はい。"}');
    const [c] = e.AI.chamadas;
    expect(c?.modelo).toBe(MODELO_CONVERSA);
    expect(c?.entrada).toMatchObject({ messages: mensagens, response_format: { type: 'json_schema', json_schema: esquema }, chat_template_kwargs: { enable_thinking: false } });
  });

  it('se o Gemma falhar, o modelo reserva responde', async () => {
    const e = env({ AI: aiFalsa({ [MODELO_CONVERSA]: new Error('caiu'), [MODELO_RESERVA]: { response: { fala: 'はい' } } }) });
    const cookie = await cookieValido(e);
    const r = await tratar(pedido('conversa', { method: 'POST', cookie, body: JSON.stringify({ mensagens: [{ role: 'user', content: 'a' }] }) }), e, { agora: () => T0 });
    expect(await r.json()).toMatchObject({ texto: '{"fala":"はい"}', modelo: MODELO_RESERVA });
  });

  it('cota grátis do dia acabou: 429 com erro "limite", sem tentar o reserva', async () => {
    const e = env({ AI: aiFalsa({ [MODELO_CONVERSA]: new Error('4006: you have used up your daily free allocation of 10,000 neurons') }) });
    const cookie = await cookieValido(e);
    const r = await tratar(pedido('conversa', { method: 'POST', cookie, body: JSON.stringify({ mensagens: [{ role: 'user', content: 'a' }] }) }), e, { agora: () => T0 });
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ erro: 'limite' });
    expect(e.AI.chamadas).toHaveLength(1);
  });

  it('pedido grande demais ou estranho é recusado antes de gastar cota', async () => {
    const e = env();
    const cookie = await cookieValido(e);
    const ruim = [
      { mensagens: [] },
      { mensagens: [{ role: 'hacker', content: 'x' }] },
      { mensagens: [{ role: 'user', content: 'x'.repeat(30_000) }] },
      { mensagens: Array.from({ length: 41 }, () => ({ role: 'user', content: 'x' })) },
    ];
    for (const corpo of ruim) {
      const r = await tratar(pedido('conversa', { method: 'POST', cookie, body: JSON.stringify(corpo) }), e, { agora: () => T0 });
      expect(r.status).toBe(400);
    }
    expect(e.AI.chamadas).toHaveLength(0);
  });

  it('erro da IA não vaza detalhes para fora', async () => {
    const e = env({ AI: aiFalsa({ [MODELO_CONVERSA]: new Error('segredo interno'), [MODELO_RESERVA]: new Error('segredo interno') }) });
    const cookie = await cookieValido(e);
    const r = await tratar(pedido('conversa', { method: 'POST', cookie, body: JSON.stringify({ mensagens: [{ role: 'user', content: 'a' }] }) }), e, { agora: () => T0 });
    expect(r.status).toBe(502);
    expect(await r.text()).not.toContain('segredo');
  });

  it('ouvir: manda o áudio para o Whisper em japonês e tira o que ele inventa no silêncio', async () => {
    const e = env({
      AI: aiFalsa({ [MODELO_OUVIDO]: { text: 'x', segments: [{ text: 'コーヒーを', no_speech_prob: 0.1 }, { text: 'ください', no_speech_prob: 0.2 }, { text: 'ご視聴ありがとうございました', no_speech_prob: 0.95 }] } }),
    });
    const cookie = await cookieValido(e);
    const r = await tratar(pedido('ouvir', { method: 'POST', cookie, body: JSON.stringify({ audio: 'QUJD'.repeat(1000), dica: 'いらっしゃいませ' }) }), e, { agora: () => T0 });
    expect(await r.json()).toMatchObject({ texto: 'コーヒーをください' });
    expect(e.AI.chamadas[0]?.entrada).toMatchObject({ language: 'ja', initial_prompt: 'いらっしゃいませ' });
  });

  it('ouvir: áudio curto demais nem vai para o Whisper', async () => {
    const e = env();
    const cookie = await cookieValido(e);
    const r = await tratar(pedido('ouvir', { method: 'POST', cookie, body: JSON.stringify({ audio: 'QUJD', dica: '' }) }), e, { agora: () => T0 });
    expect(await r.json()).toEqual({ texto: '', ms: 0 });
    expect(e.AI.chamadas).toHaveLength(0);
  });

  it('leitura: frase sem kanji não gasta cota; com kanji, só aceita leitura que remonta a frase', async () => {
    const tokens = { tokens: [{ t: '四百', r: 'ヨンヒャク' }, { t: '円', r: 'エン' }, { t: 'です', r: 'デス' }, { t: '。', r: '' }] };
    const e = env({ AI: aiFalsa({ [MODELO_LEITURA]: { choices: [{ message: { content: JSON.stringify(tokens) } }] } }) });
    const cookie = await cookieValido(e);
    const ler = async (texto: string) =>
      (await (await tratar(pedido('leitura', { method: 'POST', cookie, body: JSON.stringify({ texto }) }), e, { agora: () => T0 })).json()) as object;
    expect(await ler('はい。')).toEqual({ tokens: [{ t: 'はい。' }] });
    expect(e.AI.chamadas).toHaveLength(0);
    expect(await ler('四百円です。')).toEqual({ tokens: [{ t: '四百', r: 'ヨンヒャク' }, { t: '円', r: 'エン' }, { t: 'です', r: 'デス' }, { t: '。' }] });
    // Mesmos tokens para outra frase: não remonta, então vai sem furigana.
    expect(await ler('五百円です。')).toEqual({ tokens: [{ t: '五百円です。' }] });
  });
});

describe('CORS', () => {
  it('pedido de outro site é recusado antes de qualquer coisa', async () => {
    const e = env();
    const r = await tratar(pedido('entrar', { method: 'POST', body: JSON.stringify({ senha: SENHA }), headers: { Origin: 'https://malvado.example' } }), e, { agora: () => T0 });
    expect(r.status).toBe(403);
    expect(r.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(e.TENTATIVAS.dados.size).toBe(0);
  });

  it('o próprio site recebe a liberação só para ele', async () => {
    const r = await tratar(pedido('entrar', { method: 'OPTIONS', headers: { Origin: SITE } }), env(), { agora: () => T0 });
    expect(r.status).toBe(204);
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe(SITE);
    expect(r.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });
});

describe('peças soltas', () => {
  it('reconhece o erro de cota do Workers AI', () => {
    expect(ehLimite(new Error('AiError: 4006: you have used up your daily free allocation of 10,000 neurons'))).toBe(true);
    expect(ehLimite(new Error('timeout'))).toBe(false);
  });

  it('leitura com kanji sem kana é recusada', () => {
    expect(tokensConferidos('駅', { tokens: [{ t: '駅', r: 'eki' }] })).toBeNull();
    expect(tokensConferidos('駅', { tokens: [{ t: '駅', r: 'エキ' }] })).toEqual([{ t: '駅', r: 'エキ' }]);
  });
});
