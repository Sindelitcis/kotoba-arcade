/**
 * Memória da placa no estúdio de imagens (scripts/estudio.py), sem placa de vídeo: o torch e os modelos
 * são trocados por imitações.
 *
 * Bug que estes testes cobrem: no `tudo`, o SDXL e o CLIP ficavam juntos na placa e o lote de 3 em 1024²
 * decodificava tudo de uma vez. Passava da memória e o driver jogava o excesso na RAM, sem erro.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const SCRIPTS = join(__dirname, '..', 'scripts');
const PY = ['python3', 'python'].find((c) => {
  try {
    execFileSync(c, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
});

const pasta = mkdtempSync(join(tmpdir(), 'estudio-memoria-'));
afterAll(() => rmSync(pasta, { recursive: true, force: true }));

// Um torch de mentira: só o que o estúdio usa fora dos modelos.
const FALSO = `
import sys, types, json, gc, weakref, pathlib
torch = types.ModuleType("torch")
class OOM(RuntimeError): pass
torch.cuda = types.SimpleNamespace(OutOfMemoryError=OOM, max_memory_allocated=lambda: 0,
    reset_peak_memory_stats=lambda: None, empty_cache=lambda: None)
sys.modules["torch"] = torch
sys.path.insert(0, ${JSON.stringify(SCRIPTS)})
import estudio
class Img:
    def save(self, p): pathlib.Path(p).write_bytes(b"png")
`;

function py(codigo: string): unknown {
  const arq = join(pasta, 'teste.py');
  writeFileSync(arq, `${FALSO}\n${codigo}\n`);
  const saida = execFileSync(PY!, [arq], {
    encoding: 'utf8',
    env: { ...process.env, KOTOBA_ARTE: pasta, KOTOBA_PLACA_SEM_SONDAS: '1', PYTHONDONTWRITEBYTECODE: '1', PYTHONUTF8: '1' },
  });
  // O estúdio escreve o andamento na saída; o resultado é a última linha.
  return JSON.parse(saida.trim().split('\n').at(-1)!);
}

const LISTA = `{"lote": "t", "destino": "x", "seeds": [1, 2, 3], "itens": [{"id": "neko", "rotulo": "a cat", "prompt": "cat"}]}`;

describe.runIf(PY)('estúdio: memória da placa', () => {
  it('no tudo, o modelo de imagem sai da placa antes do CLIP entrar', () => {
    const r = py(`
lista = json.loads('${LISTA}')
pathlib.Path(${JSON.stringify(pasta)}, "l.json").write_text(json.dumps(lista))
vivos, ordem = [], []
class Modelo: pass
def gerar(lista, so=None, rodada=0, pipe=None):
    m = Modelo(); vivos.append(weakref.ref(m)); ordem.append("gerar"); return m
def conferir(lista, clip=None):
    gc.collect()
    ordem.append("conferir com %d modelo(s) de imagem vivo(s)" % sum(1 for v in vivos if v()))
    return {}
estudio.gerar, estudio.conferir = gerar, conferir
estudio.revisar_e_soltar = lambda lista, so: None
estudio.escolhidas = lambda lista, rel: {"neko": None}
estudio.exportar = lambda *a: []
estudio.folha = lambda *a, **k: []
estudio.main(["tudo", str(pathlib.Path(${JSON.stringify(pasta)}, "l.json"))])
print(json.dumps(ordem))`);
    expect(r).toEqual([
      'gerar',
      'conferir com 0 modelo(s) de imagem vivo(s)',
      'gerar',
      'conferir com 0 modelo(s) de imagem vivo(s)',
      'gerar',
      'conferir com 0 modelo(s) de imagem vivo(s)',
    ]);
  });

  it('memória cheia com o lote de 3 vira lote de 1, sem perder imagem', () => {
    const r = py(`
lista = json.loads('${LISTA}')
lista["itens"].append({"id": "inu", "rotulo": "a dog", "prompt": "dog"})
# Lote de 3 e sem deslocamento de seed, seja qual for o motor padrão.
lista["por_motor"] = {estudio.motor({})["nome"]: {"lote": 3, "seed": 0}}
chamadas = []
def chamar(pipe, m, prompts, negativos, seeds, w, h):
    chamadas.append(len(seeds))
    if len(seeds) > 1: raise torch.cuda.OutOfMemoryError()
    return [Img()]
estudio._chamar = chamar
estudio.gerar(lista, pipe=object())
feitas = sorted(p.name for p in estudio.pasta(lista).glob("*.png"))
print(json.dumps([chamadas, feitas]))`);
    expect(r).toEqual([[3, 1, 1, 1, 1, 1, 1], ['inu-1.png', 'inu-2.png', 'inu-3.png', 'neko-1.png', 'neko-2.png', 'neko-3.png']]);
  });

  it('o motor vem da lista ou do ambiente, com ajuste por lista', () => {
    const r = py(`
padrao = estudio.motor({})
ajustado = estudio.motor({"por_motor": {padrao["nome"]: {"passos": 24}}})
try:
    estudio.motor({"motor": "nao-existe"}); erro = None
except SystemExit as e:
    erro = str(e)
print(json.dumps([padrao["nome"], ajustado["passos"], erro.startswith("motor desconhecido")]))`);
    expect(r).toEqual(['anima-turbo', 24, true]);
  });

  it('as seeds de um motor novo não repetem o nome das candidatas de outro motor', () => {
    const r = py(`
lista = json.loads('${LISTA}')
nome = estudio.motor({})["nome"]
item = lista["itens"][0]
print(json.dumps([estudio.seeds_de({**lista, "por_motor": {nome: {"seed": 0}}}, item), estudio.seeds_de({**lista, "por_motor": {nome: {"seed": 10000}}}, item, 1)]))`);
    expect(r).toEqual([[1, 2, 3], [11001, 11002, 11003]]);
  });
});
