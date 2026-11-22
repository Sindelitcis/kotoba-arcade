import { describe, expect, it } from 'vitest';
import { cardKey } from '../src/content';
import { seededRng } from '../src/core/rng';
import { emptySave } from '../src/core/save';
import { review, newCard } from '../src/core/srs';
import {
  acharTermos,
  CENAS,
  Conversa,
  cumpreSozinho,
  emptyConversaSave,
  ensureConversaSave,
  esquemaDa,
  getCena,
  lerResposta,
  LIMITE_MS,
  marcado,
  mesmoSom,
  MAX_TURNOS,
  MOEDAS_FIM,
  MOEDAS_PASSO,
  montarPrompt,
  montarRuby,
  palavrasConhecidas,
  palavrasEmFoco,
  paraJapones,
  proximaCena,
  apresentarTermos,
  termosParaApresentar,
  XP_FIM,
  XP_PASSO,
  XP_TURNO,
  type AiClient,
  type ChatMessage,
  type Evento,
  type Token,
} from '../src/games/conversa/engine';

const T0 = new Date('2026-11-16T12:00:00').getTime();
const cafe = getCena('pedido');

interface Reply {
  fala?: string;
  traducao?: string;
  entendi?: boolean;
  passos?: string[];
  correcao?: { melhor: string; nota: string } | null;
  dica?: string;
  sugestoes?: { jp: string; pt: string }[];
}

const json = (r: Reply) =>
  JSON.stringify({
    entendi: true,
    correcao: null,
    passos: [],
    fala: 'はい、コーヒーですね。',
    traducao: 'Certo, um café.',
    dica: 'Pergunte quanto custa.',
    sugestoes: [
      { jp: 'いくらですか', pt: 'Quanto custa?' },
      { jp: 'お会計をお願いします', pt: 'A conta, por favor.' },
    ],
    ...r,
  });

/** Cliente falso: devolve as respostas da fila, na ordem, e guarda o que recebeu. */
function fakeAi(replies: (string | Error)[], tokens?: (texto: string) => Token[]) {
  const calls: ChatMessage[][] = [];
  const schemas: object[] = [];
  const ai: AiClient = {
    chat: async (messages, schema) => {
      calls.push(messages.map((m) => ({ ...m })));
      schemas.push(schema);
      const next = replies.shift();
      if (next === undefined) throw new Error('fila de respostas vazia');
      if (next instanceof Error) throw next;
      return next;
    },
    leitura: async (texto) => {
      if (!tokens) throw new Error('sem analisador');
      return tokens(texto);
    },
  };
  return { ai, calls, schemas };
}

/** Uma conversa começando. Como na tela, as palavras da cena já foram apresentadas antes (`ver: false` pula isso). */
function setup(replies: (string | Error)[], opts: { cena?: string; tokens?: (t: string) => Token[]; ver?: boolean } = {}) {
  const data = emptySave(T0);
  const save = emptyConversaSave();
  let t = T0;
  const fake = fakeAi(replies, opts.tokens);
  const cena = getCena(opts.cena ?? 'pedido');
  const apresentadas = opts.ver === false ? [] : termosParaApresentar(cena, data.cards);
  apresentarTermos(data.cards, apresentadas, T0);
  const conversa = new Conversa(cena, {
    apresentadas,
    cards: data.cards,
    profile: data.profile,
    save,
    rng: seededRng(1),
    now: () => t,
    ai: fake.ai,
  });
  const inicio = conversa.iniciar();
  return {
    data,
    save,
    conversa,
    inicio,
    ...fake,
    tick: (ms: number) => (t += ms),
  };
}

const kinds = (events: Evento[]) => events.map((e) => e.t);
const fim = (events: Evento[]) => events.find((e): e is Extract<Evento, { t: 'fim' }> => e.t === 'fim')?.resumo;

describe('texto com furigana', () => {
  it('fala fixa marcada com colchetes vira texto, leitura e furigana', () => {
    const m = marcado('すみません、駅[えき]はどこですか');
    expect(m.jp).toBe('すみません、駅はどこですか');
    expect(m.kana).toBe('すみません、えきはどこですか');
    expect(m.ruby).toEqual([{ t: 'すみません、' }, { t: '駅', r: 'えき' }, { t: 'はどこですか' }]);
  });

  it('a leitura fica só em cima dos kanji', () => {
    const ruby = montarRuby([{ t: 'お水', r: 'オミズ' }, { t: 'を', r: 'ヲ' }, { t: '食べ', r: 'タベ' }, { t: 'ます', r: 'マス' }, { t: '。' }]);
    expect(ruby).toEqual([{ t: 'お' }, { t: '水', r: 'みず' }, { t: 'を' }, { t: '食', r: 'た' }, { t: 'べます。' }]);
  });

  it('palavra em katakana ou sem leitura passa como texto', () => {
    expect(montarRuby([{ t: 'コーヒー', r: 'コーヒー' }, { t: '四百', r: 'ヨンヒャク' }, { t: '円' }])).toEqual([
      { t: 'コーヒー' },
      { t: '四百', r: 'よんひゃく' },
      { t: '円' },
    ]);
  });

  it('todas as falas fixas das cenas têm leitura em kana e pelo menos três passos', () => {
    for (const c of CENAS) {
      expect(marcado(c.abertura.texto).kana, c.id).not.toMatch(/[一-鿿]/);
      expect(c.passos.length, c.id).toBeGreaterThanOrEqual(3);
      expect(c.primeiras).toHaveLength(2);
      for (const s of c.primeiras) {
        expect(s.kana, s.jp).not.toMatch(/[一-鿿[\]]/);
        expect(s.romaji, s.jp).toMatch(/^[a-z' .,]+$/);
        // O romaji mostrado, digitado de volta, vira kana sem sobrar letra.
        expect(paraJapones(s.romaji), s.jp).not.toMatch(/[a-z]/);
      }
      for (const t of c.vocabulario) expect(t.kana, t.jp).not.toMatch(/[一-鿿[\]]/);
    }
  });
});

describe('o que o jogador escreve', () => {
  it('romaji vira hiragana, kana passa como está', () => {
    expect(paraJapones('koohii wo kudasai')).toBe('こおひいをください');
    expect(paraJapones('Eki wa doko desu ka?')).toBe('えきわどこですか?');
    expect(paraJapones('rafaeru desu')).toBe('らふぁえるです');
    // Palavra que não é japonês fica como foi escrita.
    expect(paraJapones('coffee kudasai')).toBe('coffee kudasai');
    expect(paraJapones(' コーヒーをください ')).toBe('コーヒーをください');
  });

  it('reconhece palavras da cena em kana, kanji e verbo conjugado', () => {
    const ids = (s: string) => acharTermos(s).map((t) => t.jp);
    expect(ids('えきわどこですか')).toEqual(expect.arrayContaining(['駅', 'どこ']));
    expect(ids('駅に行きたいです')).toContain('駅');
    expect(ids('えきにいきたいです')).toContain('行く');
    expect(ids('ありがとうございました')).toContain('ありがとうございます');
    expect(ids('はい')).toEqual([]);
  });

  it('palavra curta de fora das cenas só conta escrita igual', () => {
    // 木 (き) é palavra do KanjiMon: não pode casar com qualquer "き" solto.
    expect(acharTermos('きょうはいいてんきですね').map((t) => t.jp)).not.toContain('木');
  });
});

describe('conferência da resposta do modelo', () => {
  const ok = (r: Reply, dito = '') => {
    const out = lerResposta(json(r), cafe, dito);
    if (!out.ok) throw new Error(out.motivo);
    return out.resposta;
  };

  it('aceita uma resposta boa e guarda só os passos que existem na cena', () => {
    const r = ok({ passos: ['pedir', 'inventado', 'pedir'] });
    expect(r.fala).toBe('はい、コーヒーですね。');
    expect(r.passos).toEqual(['pedir']);
    expect(r.sugestoes).toHaveLength(2);
  });

  it('aceita json dentro de bloco de código e com texto em volta', () => {
    expect(lerResposta('Claro!\n```json\n' + json({}) + '\n```', cafe).ok).toBe(true);
  });

  it('recusa o que não serve como fala', () => {
    const motivo = (texto: string) => {
      const out = lerResposta(texto, cafe);
      return out.ok ? 'ok' : out.motivo;
    };
    expect(motivo('não sei')).toBe('sem json');
    expect(motivo('{"fala": ')).toBe('sem json');
    expect(motivo('{"fala": "x" "y"}')).toBe('json quebrado');
    expect(motivo(json({ fala: '' }))).toBe('sem fala');
    expect(motivo(json({ fala: 'Welcome to the cafe!' }))).toBe('fala sem japonês');
    expect(motivo(json({ fala: 'はい、koohii desu ne。' }))).toBe('fala com romaji');
    expect(motivo(json({ fala: 'あ'.repeat(120) }))).toBe('fala comprida');
  });

  it('tira leitura entre parênteses e aspas da fala', () => {
    expect(ok({ fala: '「お水(みず)は無料（むりょう）です。」' }).fala).toBe('お水は無料です。');
  });

  it('correção igual ao que o jogador disse, ou sem japonês, é descartada', () => {
    expect(ok({ correcao: { melhor: 'コーヒーをください。', nota: 'Perfeito.' } }, 'コーヒーをください').correcao).toBeNull();
    expect(ok({ correcao: { melhor: 'koohii', nota: 'x' } }, 'こーひー').correcao).toBeNull();
    expect(
      ok(
        {
          correcao: {
            melhor: 'コーヒーをください',
            nota: 'Com を fica mais natural.',
          },
        },
        'こーひーください',
      ).correcao,
    ).toEqual({
      melhor: 'コーヒーをください',
      nota: 'Com を fica mais natural.',
    });
  });

  it('sugestões ruins saem, e ficam no máximo duas', () => {
    const r = ok({
      sugestoes: [
        { jp: 'ikura desu ka', pt: 'x' },
        { jp: 'いくらですか', pt: 'Quanto custa?' },
        { jp: 'いくらですか', pt: 'repetida' },
        { jp: 'お会計をお願いします', pt: 'A conta.' },
        { jp: 'カードでお願いします', pt: 'No cartão.' },
      ],
    });
    expect(r.sugestoes.map((s) => s.jp)).toEqual(['いくらですか', 'お会計をお願いします']);
  });

  it('campos que faltam ganham um padrão seguro', () => {
    const out = lerResposta('{"fala":"はい。"}', cafe);
    expect(out.ok && out.resposta).toMatchObject({
      entendi: true,
      passos: [],
      correcao: null,
      sugestoes: [],
      dica: '',
      traducao: '',
    });
  });
});

describe('o que vai para o modelo', () => {
  it('o prompt traz o papel, os passos e as palavras que o jogador conhece', () => {
    const data = emptySave(T0);
    data.cards[cardKey('w:駅', 'meaning')] = review(newCard(0), { correct: true }, T0);
    const conhecidas = palavrasConhecidas(data.cards, T0);
    expect(conhecidas.map((t) => t.jp)).toEqual(['駅']);
    // Só palavra apresentada vira foco da conversa.
    expect(palavrasEmFoco(cafe, data.cards, T0, seededRng(1)).map((t) => t.jp)).toEqual([]);
    apresentarTermos(data.cards, termosParaApresentar(cafe, data.cards), T0);
    const foco = palavrasEmFoco(cafe, data.cards, T0, seededRng(1));
    expect(foco).toHaveLength(3);
    const prompt = montarPrompt(cafe, conhecidas, foco);
    expect(prompt).toContain('Sakura');
    expect(prompt).toContain('- pedir: Pedir algo para comer ou beber');
    expect(prompt).toContain('palavras que ele já conhece: 駅');
    expect(prompt).toContain(foco[0]!.jp);
  });

  it('a conversa manda o prompt, a abertura e a fala do jogador, com o formato da resposta', async () => {
    const s = setup([json({})]);
    await s.conversa.dizer('koohii wo kudasai');
    const sent = s.calls[0]!;
    expect(sent.map((m) => m.role)).toEqual(['system', 'assistant', 'user']);
    expect(sent[1]!.content).toContain('いらっしゃいませ');
    expect(sent[2]!.content.split('\n')[0]).toBe('こおひいをください (digitado em romaji: "koohii wo kudasai")');
    expect(s.schemas[0]).toEqual(esquemaDa(cafe));
    expect(JSON.stringify(s.schemas[0])).toContain('"enum":["pedir","conta","pagar"]');
  });

  it('cada fala lembra o modelo dos objetivos que ainda faltam', async () => {
    // Visto na máquina: numa entrevista inteira o modelo não marcou nenhum objetivo.
    const s = setup([json({ passos: ['pedir'] }), json({})]);
    await s.conversa.dizer('koohii wo kudasai');
    expect(s.calls[0]!.at(-1)!.content).toContain('ainda não cumpriu: pedir = Pedir algo para comer ou beber; conta =');
    await s.conversa.dizer('ikura desu ka');
    const segunda = s.calls[1]!.at(-1)!.content;
    expect(segunda).not.toContain('pedir =');
    expect(segunda).toContain('conta = ');
  });
});

describe('conversa', () => {
  it('abre com a fala fixa do personagem e a primeira dica já ensina', async () => {
    const s = setup([]);
    expect(kinds(s.inicio)[0]).toBe('linha');
    expect(s.conversa.linhas[0]).toMatchObject({
      quem: 'personagem',
      jp: 'いらっしゃいませ。ご注文は？',
      pt: 'Bem-vindo! O que vai pedir?',
    });
    expect(s.conversa.fase).toBe('vez');
    expect(s.save.conversas).toBe(1);
    const d1 = await s.conversa.pedirDica();
    expect(d1).toMatchObject({ nivel: 1, sugestoes: [] });
    expect(d1.texto).toContain('kudasai');
    const d2 = await s.conversa.pedirDica();
    expect(d2.nivel).toBe(2);
    expect(d2.sugestoes[0]).toMatchObject({
      jp: 'コーヒーをください',
      romaji: 'koohii o kudasai',
    });
    // Sem ter ido ao modelo nenhuma vez.
    expect(s.calls).toHaveLength(0);
  });

  it('palavra nova que o personagem disse aparece com o significado, mas não conta como apresentada', () => {
    const s = setup([]);
    const nova = s.inicio.filter((e) => e.t === 'nova').map((e) => (e.t === 'nova' ? e.termo.jp : ''));
    expect(nova).toContain('注文');
    // Só ouvir não é apresentação: a Memória não pode passar a cobrar 注文.
    expect(s.data.cards[cardKey('w:注文', 'meaning')]).toBeUndefined();
  });

  it('uma fala entendida rende xp, marca o passo e mostra a resposta com furigana', async () => {
    const tokens = (t: string): Token[] =>
      t === 'はい、お水ですね。' ? [{ t: 'はい' }, { t: '、' }, { t: 'お水', r: 'オミズ' }, { t: 'です' }, { t: 'ね' }, { t: '。' }] : [{ t }];
    const s = setup([json({ fala: 'はい、お水ですね。', passos: ['pedir'] })], {
      tokens,
    });
    const events = await s.conversa.dizer('omizu wo kudasai');
    expect(kinds(events)).toEqual(expect.arrayContaining(['linha', 'passo']));
    const [minha, dela] = s.conversa.linhas.slice(-2);
    expect(minha).toMatchObject({
      quem: 'jogador',
      jp: 'おみずをください',
      digitado: 'omizu wo kudasai',
      entendida: true,
    });
    expect(dela!.ruby).toEqual([{ t: 'はい、お' }, { t: '水', r: 'みず' }, { t: 'ですね。' }]);
    expect(s.conversa.feitos.has('pedir')).toBe(true);
    expect(s.data.profile.xp).toBe(XP_TURNO + XP_PASSO);
    expect(s.data.profile.coins).toBe(MOEDAS_PASSO);
    expect(s.conversa.fase).toBe('vez');
  });

  it('agradecer encerra a entrevista mesmo se o modelo esquecer de marcar a despedida', async () => {
    // Caso real: "arigatou gozaimashita" no fim da entrevista e o modelo devolveu passos vazio.
    const s = setup(
      [
        json({ fala: 'ラファさん、何日働けますか。', passos: ['apresentar'] }),
        json({ fala: 'わかりました。', passos: ['disponibilidade'] }),
        json({ fala: 'はい、失礼します。', passos: [] }),
      ],
      { cena: 'entrevista' },
    );
    await s.conversa.dizer('rafa desu. burajiru kara kimashita');
    await s.conversa.dizer('shuu ni mikka hatarakemasu');
    const events = await s.conversa.dizer('arigatou gozaimashita');
    expect(s.conversa.feitos.has('encerrar')).toBe(true);
    expect(fim(events)?.concluida).toBe(true);
  });

  it('o passo de agradecer vale pela leitura quando a fala veio com kanji', async () => {
    const tokens = (t: string): Token[] => (t === '失礼します' ? [{ t: '失礼', r: 'シツレイ' }, { t: 'します' }] : [{ t }]);
    const s = setup([json({ fala: 'はい、どうしましたか。', passos: [] })], {
      cena: 'caminho',
      tokens,
    });
    await s.conversa.dizer('失礼します');
    expect(s.conversa.feitos.has('agradecer')).toBe(true);
    // Pedir o caminho não conta como agradecer.
    expect(cumpreSozinho({ id: 'x', pt: '', sinais: ['ありがとう'] }, 'えきはどこですか')).toBe(false);
  });

  it('sem analisador de leitura a fala aparece sem furigana e a conversa segue', async () => {
    const s = setup([json({ fala: 'はい、お水ですね。' })]);
    await s.conversa.dizer('omizu wo kudasai');
    expect(s.conversa.linhas.at(-1)!.ruby).toEqual([{ t: 'はい、お水ですね。' }]);
  });

  it('palavra usada por conta própria é revisada uma vez só; com as sugestões abertas conta como ajuda', async () => {
    const s = setup([json({}), json({}), json({})]);
    const key = cardKey('w:ください', 'meaning');
    await s.conversa.dizer('koohii wo kudasai');
    const first = s.data.cards[key]!;
    expect(first.reps).toBe(1);
    await s.conversa.dizer('keeki mo kudasai');
    expect(s.data.cards[key]).toEqual(first);

    await s.conversa.pedirDica();
    await s.conversa.pedirDica();
    await s.conversa.dizer('ikura desu ka');
    expect(s.conversa.linhas.filter((l) => l.quem === 'jogador').at(-1)!.comAjuda).toBe(true);
    const resumo = s.conversa.resumo();
    expect(resumo.usadas.map((t) => t.jp)).not.toContain('いくら');
    expect(resumo.novas.map((t) => t.jp)).toEqual(expect.arrayContaining(['ください', 'いくら']));
  });

  it('palavra que o jogador já conhecia e usou sozinho aparece em "usadas" e avança na memória', async () => {
    const s = setup([json({})]);
    const key = cardKey('w:ください', 'meaning');
    s.data.cards[key] = review(newCard(0), { correct: true }, T0 - 86_400_000);
    await s.conversa.dizer('koohii wo kudasai');
    expect(s.data.cards[key]!.reps).toBe(2);
    expect(s.conversa.resumo().usadas.map((t) => t.jp)).toContain('ください');
  });

  it('cumprir todos os passos encerra com resumo, bônus e a cena contada no save', async () => {
    const s = setup([
      json({ passos: ['pedir'] }),
      json({
        passos: ['pedir', 'conta'],
        fala: '四百円です。',
        correcao: {
          melhor: 'いくらですか',
          nota: 'Com "desu ka" a pergunta fica completa.',
        },
      }),
      json({
        passos: ['pedir', 'conta', 'pagar'],
        fala: 'ありがとうございました。',
      }),
    ]);
    await s.conversa.dizer('koohii wo kudasai');
    await s.conversa.dizer('ikura');
    s.tick(90_000);
    const events = await s.conversa.dizer('kaado de onegaishimasu. arigatou gozaimasu');
    const resumo = fim(events)!;
    expect(resumo.concluida).toBe(true);
    expect(resumo.passos.every((p) => p.feito)).toBe(true);
    expect(resumo.turnos).toBe(3);
    expect(resumo.ms).toBe(90_000);
    expect(resumo.bem.map((l) => l.jp)).toEqual(['かあどでおねがいしますありがとうございます', 'こおひいをください']);
    expect(resumo.correcoes).toEqual([
      {
        dito: 'いくら',
        melhor: 'いくらですか',
        nota: 'Com "desu ka" a pergunta fica completa.',
        // As duas frases do "para soar mais natural" com a leitura do serviço de leitura (aqui, sem kanji).
        rubyDito: [{ t: 'いくら' }],
        rubyMelhor: expect.any(Array),
      },
    ]);
    expect(resumo.xp).toBe(3 * XP_TURNO + 3 * XP_PASSO + XP_FIM);
    expect(resumo.coins).toBe(3 * MOEDAS_PASSO + MOEDAS_FIM);
    expect(s.data.profile.xp).toBe(resumo.xp);
    expect(s.save).toMatchObject({
      conversas: 1,
      concluidas: 1,
      falas: 3,
      cenas: { pedido: 1 },
    });
    expect(s.conversa.fase).toBe('fim');
    // Encerrar de novo não paga duas vezes, e falar depois do fim não faz nada.
    s.conversa.encerrar();
    expect(s.data.profile.xp).toBe(resumo.xp);
    expect(await s.conversa.dizer('mou ikkai')).toEqual([]);
  });

  it('passo marcado não desmarca se o modelo esquecer dele depois', async () => {
    const s = setup([json({ passos: ['pedir'] }), json({ passos: [] })]);
    await s.conversa.dizer('koohii wo kudasai');
    await s.conversa.dizer('hai');
    expect([...s.conversa.feitos]).toEqual(['pedir']);
    expect(s.data.profile.xp).toBe(2 * XP_TURNO + XP_PASSO);
  });

  it('correção que só muda a escrita, e soa igual, não aparece', async () => {
    // Visto na máquina: o jogador digitou "koohii o kudasai" (certo) e o modelo "corrigiu" para コーヒーをください.
    const tokens = (t: string): Token[] =>
      t === 'コーヒーをください。' ? [{ t: 'コーヒー', r: 'コーヒー' }, { t: 'を', r: 'ヲ' }, { t: 'ください', r: 'クダサイ' }, { t: '。' }] : [{ t }];
    const s = setup(
      [
        json({
          correcao: {
            melhor: 'コーヒーをください。',
            nota: 'Café tem o som longo.',
          },
        }),
      ],
      { tokens },
    );
    await s.conversa.dizer('koohii o kudasai');
    expect(s.conversa.linhas.at(-2)!.correcao).toBeUndefined();
    expect(mesmoSom('えきわどこですか', 'えきはどこですか。')).toBe(true);
    expect(mesmoSom('こおひいおください', 'コーヒーをください')).toBe(true);
    expect(mesmoSom('いくら', 'いくらですか')).toBe(false);
  });

  it('o resumo guarda no máximo duas correções', async () => {
    const c = (n: number) => ({
      melhor: `コーヒーを${n}つください`,
      nota: 'Assim fica mais natural.',
    });
    const s = setup([json({ correcao: c(1) }), json({ correcao: c(2) }), json({ correcao: c(3) })]);
    for (const t of ['a', 'i', 'u']) await s.conversa.dizer(t);
    expect(s.conversa.resumo().correcoes).toHaveLength(2);
  });

  it('na última fala o modelo é avisado para se despedir, e a conversa acaba mesmo sem todos os passos', async () => {
    const s = setup(Array.from({ length: MAX_TURNOS }, () => json({})));
    let events: Evento[] = [];
    for (let i = 0; i < MAX_TURNOS; i++) events = await s.conversa.dizer('hai');
    expect(s.calls.at(-1)!.at(-1)!.content).toContain('última fala da cena');
    expect(s.calls.at(-2)!.at(-1)!.content).not.toContain('última fala');
    const resumo = fim(events)!;
    expect(resumo.concluida).toBe(false);
    expect(s.save.concluidas).toBe(0);
    expect(s.data.profile.xp).toBe(MAX_TURNOS * XP_TURNO);
  });

  it('passou do tempo, a próxima fala é a última', async () => {
    const s = setup([json({}), json({})]);
    await s.conversa.dizer('hai');
    s.tick(LIMITE_MS);
    const events = await s.conversa.dizer('hai');
    expect(s.calls[1]!.at(-1)!.content).toContain('última fala da cena');
    expect(fim(events)).toBeDefined();
  });

  it('resposta que não serve é pedida de novo uma vez', async () => {
    const s = setup(['desculpe, não entendi o formato', json({ fala: 'はい、どうぞ。' })]);
    await s.conversa.dizer('koohii wo kudasai');
    expect(s.calls).toHaveLength(2);
    expect(s.calls[1]!.at(-1)!.content).toContain('só com o JSON');
    expect(s.conversa.linhas.at(-1)!.jp).toBe('はい、どうぞ。');
  });

  it('duas respostas ruins seguidas: o personagem pede para repetir e ninguém leva a culpa', async () => {
    const s = setup(['x', json({ fala: 'Sorry, I can only speak English.' })]);
    const events = await s.conversa.dizer('koohii wo kudasai');
    expect(kinds(events)).not.toContain('falha');
    expect(s.conversa.linhas.at(-1)!.jp).toBe('すみません、もう一度お願いします。');
    const minha = s.conversa.linhas.at(-2)!;
    expect(minha.entendida).toBeUndefined();
    expect(s.data.profile.xp).toBe(0);
    expect(s.conversa.fase).toBe('vez');
    // A dica dessa vez cai nas respostas fixas da cena.
    expect((await s.conversa.pedirDica()).sugestoes[0]!.jp).toBe('コーヒーをください');
  });

  it('servidor caiu no meio: a fala não é gasta e dá para mandar de novo', async () => {
    const s = setup([new Error('Failed to fetch'), json({ passos: ['pedir'] })]);
    const failed = await s.conversa.dizer('koohii wo kudasai');
    expect(failed).toEqual([{ t: 'falha' }]);
    expect(s.conversa.fase).toBe('vez');
    expect(s.conversa.linhas).toHaveLength(1);
    expect(s.conversa.turnos).toBe(0);
    const again = await s.conversa.dizer('koohii wo kudasai');
    expect(kinds(again)).toContain('passo');
    // O histórico mandado ao modelo não repete a fala que falhou.
    expect(s.calls[1]!.filter((m) => m.role === 'user')).toHaveLength(1);
  });

  it('enquanto o personagem pensa, uma segunda fala é ignorada', async () => {
    const s = setup([json({})]);
    const first = s.conversa.dizer('koohii wo kudasai');
    expect(s.conversa.fase).toBe('pensando');
    expect(await s.conversa.dizer('hai')).toEqual([]);
    await first;
    expect(s.conversa.turnos).toBe(1);
  });

  it('fala vazia não vai ao modelo', async () => {
    const s = setup([]);
    expect(await s.conversa.dizer('   ')).toEqual([]);
    expect(s.calls).toHaveLength(0);
  });

  it('duas falas seguidas sem o personagem entender abrem as respostas prontas sozinhas', async () => {
    const s = setup([json({ entendi: false, fala: 'すみません、もう一度お願いします。' }), json({ entendi: false, fala: 'ご注文は？' })]);
    expect(kinds(await s.conversa.dizer('asdf'))).not.toContain('dica');
    const events = await s.conversa.dizer('qwer');
    const dica = events.find((e): e is Extract<Evento, { t: 'dica' }> => e.t === 'dica')!.dica;
    expect(dica.nivel).toBe(2);
    expect(dica.sugestoes.map((x) => x.jp)).toEqual(['いくらですか', 'お会計をお願いします']);
    // Fala não entendida não rende xp nem entra em "disse bem", e também não tira nada.
    expect(s.data.profile.xp).toBe(0);
    expect(s.conversa.resumo().bem).toEqual([]);
  });

  it('as sugestões do modelo ganham leitura para o jogador conseguir digitar', async () => {
    const tokens = (t: string): Token[] =>
      t === 'お会計をお願いします'
        ? [
            { t: 'お会計', r: 'オカイケイ' },
            { t: 'を', r: 'ヲ' },
            { t: 'お願い', r: 'オネガイ' },
            { t: 'します', r: 'シマス' },
          ]
        : [{ t, r: t }];
    const s = setup([json({})], { tokens });
    await s.conversa.dizer('koohii wo kudasai');
    await s.conversa.pedirDica();
    const d = await s.conversa.pedirDica();
    expect(d.sugestoes[1]).toMatchObject({
      jp: 'お会計をお願いします',
      kana: 'おかいけいをおねがいします',
      romaji: 'okaikei o onegai shimasu',
    });
  });

  it('parar no meio entrega o resumo do que houve, sem bônus de conclusão', async () => {
    const s = setup([json({ passos: ['pedir'] })]);
    await s.conversa.dizer('koohii wo kudasai');
    const resumo = s.conversa.encerrar();
    expect(resumo.concluida).toBe(false);
    expect(resumo.passos.map((p) => p.feito)).toEqual([true, false, false]);
    expect(resumo.xp).toBe(XP_TURNO + XP_PASSO);
    expect(s.save.concluidas).toBe(0);
  });

  it('subir de nível durante a conversa avisa a tela', async () => {
    const s = setup([json({ passos: ['pedir'] })]);
    s.data.profile.xp = 95;
    expect(kinds(await s.conversa.dizer('koohii wo kudasai'))).toContain('levelup');
  });
});

describe('save da conversa', () => {
  it('cria, completa e devolve sempre o mesmo objeto', () => {
    const games: Record<string, unknown> = {
      conversa: { conversas: 3, cenas: 'x' },
    };
    const save = ensureConversaSave(games);
    expect(save).toEqual({ conversas: 3, concluidas: 0, falas: 0, cenas: {} });
    expect(ensureConversaSave(games)).toBe(save);
    const fresh: Record<string, unknown> = { conversa: null };
    expect(ensureConversaSave(fresh)).toEqual(emptyConversaSave());
  });

  it('a próxima cena é a primeira ainda não concluída, depois a menos jogada', () => {
    const save = emptyConversaSave();
    expect(proximaCena(save).id).toBe('pedido');
    save.cenas.pedido = 1;
    expect(proximaCena(save).id).toBe('caminho');
    for (const c of CENAS) save.cenas[c.id] = 2;
    save.cenas.apresentacao = 1;
    expect(proximaCena(save).id).toBe('apresentacao');
  });
});

describe('save da Conversa estragado', () => {
  it('contagem de cena que não é número volta a zero', () => {
    // "2" + 1 virava "21" e a cena seguinte sugerida ficava errada.
    const games: Record<string, unknown> = { conversa: { cenas: { pedido: '2', caminho: 3, entrevista: NaN } } };
    expect(ensureConversaSave(games).cenas).toEqual({ caminho: 3 });
  });
});

describe('encerrar enquanto o personagem pensa', () => {
  it('a resposta que chega depois não reabre a conversa nem dá pontos', async () => {
    // Esc com o modelo ainda pensando mostrava o resumo, e a resposta atrasada voltava a conversa para "vez",
    // somava XP depois do resumo e tocava a voz do personagem por cima do menu.
    const { conversa, data } = setup([json({ passos: ['pedir'] })]);
    const pendente = conversa.dizer('koohii wo kudasai');
    const resumo = conversa.encerrar();
    const xp = data.profile.xp;
    const events = await pendente;
    expect(events).toEqual([]);
    expect(conversa.fase).toBe('fim');
    expect(data.profile.xp).toBe(xp);
    expect(conversa.linhas.filter((l) => l.quem === 'jogador')).toHaveLength(0);
    expect(resumo.turnos).toBe(0);
  });
});
