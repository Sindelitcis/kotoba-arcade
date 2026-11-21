import { describe, expect, it } from 'vitest';
import { criarClienteHibrido, criarClienteNuvem, FalhaNuvem, textoDeQuem, type Cliente, type ClienteNuvem } from '../src/games/conversa/cliente';

const MODELOS = { nuvem: 'gemma-4-26b-a4b-it', pc: 'gemma4:12b' };

/** PC falso que anota o que pediram para ele. */
function pcFalso() {
  const pedidos: string[] = [];
  const pc: Cliente = {
    chat: async () => {
      pedidos.push('chat');
      return '{"fala":"pc"}';
    },
    leitura: async (t) => {
      pedidos.push('leitura');
      return [{ t, r: 'mecab' }] as never;
    },
    ouvir: async () => {
      pedidos.push('ouvir');
      return 'コーヒー';
    },
    voz: async () => {
      pedidos.push('voz');
      return new Blob(['wav']);
    },
  };
  return { pc, pedidos };
}

/** Nuvem de verdade (criarClienteNuvem) sobre um fetch falso. */
function nuvemCom(resposta: () => Promise<Response>) {
  const caminhos: string[] = [];
  const f = (async (url: string) => {
    caminhos.push(new URL(url, 'https://x').pathname);
    return resposta();
  }) as unknown as typeof fetch;
  return { nuvem: criarClienteNuvem(f, '/api'), caminhos };
}

const ok = () => Promise.resolve(new Response(JSON.stringify({ texto: '{"fala":"nuvem"}' }), { status: 200 }));
const status = (n: number) => () => Promise.resolve(new Response('{}', { status: n }));

describe('modo híbrido: texto na nuvem, resto no PC', () => {
  it('o texto vai para a nuvem e a tela sabe que foi ela', async () => {
    const { pc, pedidos } = pcFalso();
    const { nuvem, caminhos } = nuvemCom(ok);
    const h = criarClienteHibrido(pc, nuvem, MODELOS);
    expect(await h.chat([], {})).toBe('{"fala":"nuvem"}');
    expect(caminhos).toEqual(['/api/conversa']);
    expect(pedidos).toEqual([]);
    expect(h.quem).toEqual({ onde: 'nuvem', modelo: 'gemma-4-26b-a4b-it' });
    expect(textoDeQuem(h.quem)).toBe('Texto: gemma-4-26b-a4b-it (nuvem)');
  });

  it('cota da nuvem acabou (429): o PC responde e a nuvem não é chamada de novo', async () => {
    const { pc, pedidos } = pcFalso();
    const { nuvem, caminhos } = nuvemCom(status(429));
    const h = criarClienteHibrido(pc, nuvem, MODELOS);
    expect(await h.chat([], {})).toBe('{"fala":"pc"}');
    expect(h.quem).toEqual({ onde: 'pc', modelo: 'gemma4:12b', motivo: 'limite' });
    expect(textoDeQuem(h.quem)).toBe('Texto: gemma4:12b (seu PC, porque a cota da nuvem acabou)');
    await h.chat([], {});
    expect(caminhos).toEqual(['/api/conversa']);
    expect(pedidos).toEqual(['chat', 'chat']);
  });

  it('sem internet: o PC responde, e na próxima fala tenta a nuvem de novo', async () => {
    const { pc } = pcFalso();
    let caiu = true;
    const { nuvem, caminhos } = nuvemCom(() => (caiu ? Promise.reject(new TypeError('Failed to fetch')) : ok()));
    const h = criarClienteHibrido(pc, nuvem, MODELOS);
    expect(await h.chat([], {})).toBe('{"fala":"pc"}');
    expect(h.quem?.motivo).toBe('rede');
    expect(textoDeQuem(h.quem)).toContain('a nuvem não respondeu');
    caiu = false;
    expect(await h.chat([], {})).toBe('{"fala":"nuvem"}');
    expect(caminhos).toHaveLength(2);
  });

  it('erro da IA na nuvem (500) e sessão vencida (401) também caem para o PC', async () => {
    for (const [n, motivo] of [
      [500, 'ia'],
      [401, 'sessao'],
    ] as const) {
      const { pc } = pcFalso();
      const h = criarClienteHibrido(pc, nuvemCom(status(n)).nuvem, MODELOS);
      expect(await h.chat([], {})).toBe('{"fala":"pc"}');
      expect(h.quem?.motivo).toBe(motivo);
    }
  });

  it('nuvem lenta demais: não trava a conversa, o PC responde', async () => {
    const { pc } = pcFalso();
    const { nuvem } = nuvemCom(() => new Promise(() => {}));
    const h = criarClienteHibrido(pc, nuvem, MODELOS, 20);
    expect(await h.chat([], {})).toBe('{"fala":"pc"}');
    expect(h.quem?.motivo).toBe('rede');
  });

  it('nuvem e PC fora: o erro chega na tela (a fala não se perde, dá para mandar de novo)', async () => {
    const pc = { ...pcFalso().pc, chat: () => Promise.reject(new Error('servidor local: 503')) };
    const h = criarClienteHibrido(pc, nuvemCom(status(429)).nuvem, MODELOS);
    await expect(h.chat([], {})).rejects.toThrow('servidor local');
  });

  it('ouvir, furigana e voz ficam no PC, mesmo com a nuvem no ar', async () => {
    const { pc, pedidos } = pcFalso();
    const { nuvem, caminhos } = nuvemCom(ok);
    const h = criarClienteHibrido(pc, nuvem, MODELOS);
    expect(await h.ouvir(new Blob(['a']), '')).toBe('コーヒー');
    expect(await h.leitura('四百')).toEqual([{ t: '四百', r: 'mecab' }]);
    await h.voz('はい', 'sakura');
    expect(pedidos).toEqual(['ouvir', 'leitura', 'voz']);
    expect(caminhos).toEqual([]);
  });

  it('o erro que a nuvem joga é FalhaNuvem (é o que o híbrido usa para saber o motivo)', async () => {
    const n: ClienteNuvem = nuvemCom(status(429)).nuvem;
    await expect(n.chat([], {})).rejects.toBeInstanceOf(FalhaNuvem);
  });
});
