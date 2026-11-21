import { describe, expect, it } from 'vitest';
import {
  ESPERA_LICENCA_MS,
  escolherMotor,
  lerMotor,
  licencaDoPC,
  MOTOR_KEY,
  procurarServidor,
  salvarMotor,
  type DepsEscolha,
  type Licenca,
  type Procura,
  type Saude,
} from '../src/games/conversa/cliente';
import { memoryStore } from '../src/core/save';

const PC: Saude = { conversa: { ok: true, modelo: 'gemma4:12b' }, fala: { ok: true }, voz: { ok: true, motor: 'aivis' }, placa: { ok: true } };
const NUVEM: Procura = { tipo: 'pronto', saude: { nuvem: true, conversa: { ok: true, modelo: 'gemma-4-26b-a4b-it' }, fala: { ok: true }, voz: { ok: false, motor: 'navegador' } } };

function deps(licenca: Licenca, pc: Saude | null) {
  const esperas: number[] = [];
  let nuvem = 0;
  const d: DepsEscolha = {
    licenca: async () => licenca,
    procurarPC: async (t) => {
      esperas.push(t);
      return pc;
    },
    procurarNuvem: async () => {
      nuvem++;
      return NUVEM;
    },
  };
  return { d, esperas, nuvem: () => nuvem };
}

describe('qual IA a Conversa usa', () => {
  it('automático com o PC ligado: usa o PC', async () => {
    const x = deps('sim', PC);
    expect(await escolherMotor('auto', x.d)).toEqual({ onde: 'pc', saude: PC });
    expect(x.nuvem()).toBe(0);
  });

  it('automático com o PC fora do ar: cai para a nuvem, sem aviso', async () => {
    const x = deps('sim', null);
    expect(await escolherMotor('auto', x.d)).toEqual({ onde: 'nuvem', procura: NUVEM });
    expect(x.esperas).toEqual([1500]);
  });

  it('automático sem licença do navegador ainda: nem procura o PC (ninguém leva pedido de licença de surpresa)', async () => {
    const x = deps('perguntar', PC);
    expect((await escolherMotor('auto', x.d)).onde).toBe('nuvem');
    expect(x.esperas).toEqual([]);
  });

  it('automático com a placa ocupada: nuvem, com aviso dizendo por quê', async () => {
    const x = deps('sim', { ...PC, placa: { ok: false, motivo: 'em uso: estudio-imagens' } });
    const e = await escolherMotor('auto', x.d);
    expect(e).toMatchObject({ onde: 'nuvem', aviso: expect.stringContaining('estudio-imagens') });
  });

  it('nuvem: nem olha o PC', async () => {
    const x = deps('sim', PC);
    expect((await escolherMotor('nuvem', x.d)).onde).toBe('nuvem');
    expect(x.esperas).toEqual([]);
  });

  it('meu PC com ele desligado: tela da IA do PC fora do ar (não cai para a nuvem)', async () => {
    const x = deps('sim', null);
    expect(await escolherMotor('pc', x.d)).toEqual({ onde: 'pc-fora', motivo: 'desligado' });
    expect(x.nuvem()).toBe(0);
  });

  it('meu PC na primeira vez: espera o tempo de a pessoa clicar em Permitir', async () => {
    const x = deps('perguntar', PC);
    expect((await escolherMotor('pc', x.d)).onde).toBe('pc');
    expect(x.esperas).toEqual([ESPERA_LICENCA_MS]);
  });

  it('meu PC com a licença negada no navegador: explica sem tentar', async () => {
    const x = deps('nao', PC);
    expect(await escolherMotor('pc', x.d)).toEqual({ onde: 'pc-fora', motivo: 'licenca' });
    expect(x.esperas).toEqual([]);
  });

  it('meu PC com a placa ocupada: diz quem está usando', async () => {
    const x = deps('sim', { ...PC, placa: { ok: false, motivo: 'em uso: vozes' } });
    expect(await escolherMotor('pc', x.d)).toEqual({ onde: 'pc-fora', motivo: 'placa', detalhe: 'em uso: vozes' });
  });
});

describe('escolha guardada no navegador', () => {
  it('começa no automático e lembra a troca', () => {
    const store = memoryStore();
    expect(lerMotor(store)).toBe('auto');
    salvarMotor('pc', store);
    expect(store.getItem(MOTOR_KEY)).toBe('pc');
    expect(lerMotor(store)).toBe('pc');
  });

  it('valor estranho ou navegador sem espaço: automático', () => {
    const store = memoryStore();
    store.setItem(MOTOR_KEY, 'marte');
    expect(lerMotor(store)).toBe('auto');
    const quebrado = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(lerMotor(quebrado)).toBe('auto');
    expect(() => salvarMotor('nuvem', quebrado)).not.toThrow();
  });
});

describe('licença do navegador para falar com o PC', () => {
  const perms = (estado: string | Error) =>
    ({
      query: async () => {
        if (estado instanceof Error) throw estado;
        return { state: estado };
      },
    }) as unknown as Permissions;

  it('página aberta no próprio PC não precisa de licença', async () => {
    expect(await licencaDoPC('localhost', perms('denied'))).toBe('sim');
  });

  it('site publicado: segue o que o navegador diz', async () => {
    expect(await licencaDoPC('kotoba-arcade.pages.dev', perms('granted'))).toBe('sim');
    expect(await licencaDoPC('kotoba-arcade.pages.dev', perms('prompt'))).toBe('perguntar');
    expect(await licencaDoPC('kotoba-arcade.pages.dev', perms('denied'))).toBe('nao');
  });

  it('navegador que não conhece essa licença (Firefox): desconhecida, e o automático tenta', async () => {
    expect(await licencaDoPC('kotoba-arcade.pages.dev', perms(new TypeError('nome inválido')))).toBe('desconhecida');
    const x = deps('desconhecida', PC);
    expect((await escolherMotor('auto', x.d)).onde).toBe('pc');
  });
});

describe('saúde do servidor do PC', () => {
  const resposta = (corpo: unknown) => (async () => new Response(JSON.stringify(corpo), { status: 200 })) as typeof fetch;

  it('traz o estado da placa junto', async () => {
    const s = await procurarServidor(resposta({ ok: true, ...PC, placa: { ok: false, motivo: 'em uso' } }));
    expect(s?.placa).toEqual({ ok: false, motivo: 'em uso' });
  });

  it('servidor antigo, sem placa: continua valendo', async () => {
    const { placa: _p, ...semPlaca } = PC;
    const s = await procurarServidor(resposta({ ok: true, ...semPlaca }));
    expect(s).toEqual(semPlaca);
  });

  it('fora do ar: null', async () => {
    expect(await procurarServidor((async () => { throw new TypeError('refused'); }) as typeof fetch)).toBeNull();
  });
});
