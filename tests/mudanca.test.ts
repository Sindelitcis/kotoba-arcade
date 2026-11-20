import { describe, expect, it } from 'vitest';
import { aplicarMudanca, paraBase64url, PREFIXO } from '../src/core/mudanca';
import { emptySave, memoryStore, SAVE_KEY } from '../src/core/save';

const link = (save: object) => PREFIXO + paraBase64url(JSON.stringify(save));

describe('mudança do GitHub Pages para a Cloudflare', () => {
  it('sem save aqui, o save que veio no link entra (com acento e kana)', () => {
    const store = memoryStore();
    const veio = { ...emptySave(1000), updatedAt: 5000, games: { nota: 'ação ありがとう' } };
    expect(aplicarMudanca(link(veio), store, 9000)).toBe('importado');
    expect(JSON.parse(store.getItem(SAVE_KEY) as string)).toEqual(veio);
  });

  it('save daqui mais novo fica; o que veio é ignorado', () => {
    const store = memoryStore();
    const aqui = { ...emptySave(1000), updatedAt: 8000 };
    store.setItem(SAVE_KEY, JSON.stringify(aqui));
    expect(aplicarMudanca(link({ ...emptySave(1000), updatedAt: 5000 }), store, 9000)).toBe('mantido');
    expect(JSON.parse(store.getItem(SAVE_KEY) as string)).toEqual(aqui);
  });

  it('save daqui mais velho é trocado, mas guardado numa cópia', () => {
    const store = memoryStore();
    const aqui = JSON.stringify({ ...emptySave(1000), updatedAt: 2000 });
    store.setItem(SAVE_KEY, aqui);
    expect(aplicarMudanca(link({ ...emptySave(1000), updatedAt: 5000 }), store, 9000)).toBe('importado');
    expect(store.getItem(`${SAVE_KEY}:antes-da-mudanca:9000`)).toBe(aqui);
  });

  it('link estragado ou sem migração não mexe em nada', () => {
    const store = memoryStore();
    expect(aplicarMudanca('#outra-coisa', store, 1)).toBe('sem-migracao');
    expect(aplicarMudanca(`${PREFIXO}%%%`, store, 1)).toBe('invalido');
    expect(aplicarMudanca(PREFIXO + paraBase64url('{"v":99}'), store, 1)).toBe('invalido');
    expect(store.data.size).toBe(0);
  });
});
