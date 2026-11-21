import { request } from 'node:https';
import { describe, expect, it } from 'vitest';
import { ART_BASE } from '../src/games/kanjimon/art';

/** HEAD direto pelo Node: o fetch do jsdom aplicaria CORS, que o navegador não aplica a <img>. */
function head(url: string): Promise<{ status: number; tipo: string }> {
  return new Promise((ok, falha) => {
    const r = request(url, { method: 'HEAD' }, (res) => {
      ok({ status: res.statusCode ?? 0, tipo: String(res.headers['content-type'] ?? '') });
      res.resume();
    });
    r.on('error', falha);
    r.end();
  });
}

describe('artes do KanjiMon', () => {
  // Em 21/11/2026 o KanjiMon clássico foi para /classic/ e todas as cartas ficaram sem imagem.
  it('o endereço das artes responde com uma imagem', async () => {
    const r = await head(`${ART_BASE}1_c.jpg`);
    expect(r.status).toBe(200);
    expect(r.tipo).toMatch(/^image\//);
  }, 20_000);
});
