/**
 * Regras do estúdio de imagens (scripts/estudio.py) que não precisam de placa de vídeo.
 * O módulo só importa a biblioteca padrão no topo; torch, PIL e o resto entram dentro de cada passo.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const RAIZ = join(__dirname, '..');
const PY = ['python3', 'python'].find((c) => {
  try {
    execFileSync(c, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
});

const pasta = mkdtempSync(join(tmpdir(), 'estudio-'));
afterAll(() => rmSync(pasta, { recursive: true, force: true }));

/** Roda um trecho de Python com o estúdio importado e devolve o que ele imprimir em JSON. */
function py(codigo: string): unknown {
  const arq = join(pasta, 'teste.py');
  writeFileSync(arq, `import sys, json, pathlib, time\nsys.path.insert(0, ${JSON.stringify(join(RAIZ, 'scripts'))})\nimport estudio\n${codigo}\n`);
  const saida = execFileSync(PY!, [arq], { encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUTF8: '1' } });
  // O estúdio escreve o andamento na saída; o resultado é a última linha.
  return JSON.parse(saida.trim().split('\n').at(-1)!);
}

describe.runIf(PY)('estúdio: a nota do CLIP guardada', () => {
  it('vale para o mesmo arquivo, com o mesmo rótulo e os mesmos rivais', () => {
    const r = py(`
png = pathlib.Path(${JSON.stringify(pasta)}) / "inu-1.png"
png.write_bytes(b"a")
rotulos = ["a dog", "a cat"]
e = {"rotulo": "a dog", "rotulos": estudio.resumo_rotulos(rotulos), "arquivo": estudio.assinatura(png)}
print(json.dumps(estudio.ainda_vale(e, "a dog", rotulos, estudio.assinatura(png))))`);
    expect(r).toBe(true);
  });

  it('imagem refeita com a mesma seed não herda a nota da antiga', () => {
    const r = py(`
png = pathlib.Path(${JSON.stringify(pasta)}) / "inu-2.png"
png.write_bytes(b"antiga")
rotulos = ["a dog", "a cat"]
e = {"rotulo": "a dog", "rotulos": estudio.resumo_rotulos(rotulos), "arquivo": estudio.assinatura(png)}
time.sleep(0.02)
png.write_bytes(b"nova imagem")
print(json.dumps(estudio.ainda_vale(e, "a dog", rotulos, estudio.assinatura(png))))`);
    expect(r).toBe(false);
  });

  it('candidata apagada ou movida sai do relatório lido (a folha quebrava ao abrir a imagem)', () => {
    const r = py(`
out = pathlib.Path(${JSON.stringify(pasta)}) / "lote"
out.mkdir(exist_ok=True)
(out / "kasa-1.png").write_bytes(b"x")
(out / "conferencia.json").write_text(json.dumps({"kasa-1": {"id": "kasa"}, "kasa-2": {"id": "kasa"}}), encoding="utf-8")
print(json.dumps(sorted(estudio.ler_relatorio(out))))`);
    expect(r).toEqual(['kasa-1']);
  });

  it('mudou um rival (mesmo número de rótulos), a nota é refeita', () => {
    const r = py(`
e = {"rotulo": "a dog", "rotulos": estudio.resumo_rotulos(["a dog", "a cat"]), "arquivo": "1-1"}
print(json.dumps([estudio.ainda_vale(e, "a dog", ["a dog", "a fox"], "1-1"), estudio.ainda_vale(None, "a dog", ["a dog"], "1-1"), estudio.ainda_vale({"rotulo": "a dog", "n": 2}, "a dog", ["a dog", "a cat"], "1-1")]))`);
    expect(r).toEqual([false, false, false]);
  });
});

const TEM_PIL = !!PY && (() => {
  try {
    execFileSync(PY, ['-c', 'import PIL'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe.runIf(PY)('estúdio: regerar o que é de um modelo antigo', () => {
  it('desde_seed deixa de fora as candidatas do Animagine (seed abaixo de 10000), mesmo aprovadas', () => {
    const r = py(`
lista = {"itens": [{"id": "inu"}, {"id": "neko"}], "desde_seed": 10000}
rel = {"inu-1": {"id": "inu", "ok": True, "p": 1.0}, "inu-10002": {"id": "inu", "ok": True, "p": 0.6},
       "neko-2": {"id": "neko", "ok": True, "p": 1.0, "revista": True}}
print(json.dumps([estudio.escolhidas(lista, rel), estudio.escolhidas({**lista, "desde_seed": 0}, rel), estudio.pode(lista, "kasa-aka-10001")]))`);
    expect(r).toEqual([{ inu: 'inu-10002', neko: null }, { inu: 'inu-1', neko: 'neko-2' }, true]);
  });
});

describe.runIf(TEM_PIL)('estúdio: exportar cenários e retratos', () => {
  it('a versão mangá vai para destino_tinta e o retrato é cortado na cintura', () => {
    const r = py(`
from PIL import Image
base = pathlib.Path(${JSON.stringify(pasta)}) / "exp"
out = base / "lote"
out.mkdir(parents=True, exist_ok=True)
estudio.pasta = lambda lista: out
Image.new("RGB", (100, 200), (200, 50, 50)).save(out / "yui-10001.png")
lista = {"itens": [{"id": "yui"}], "destino": "cor", "destino_tinta": "manga", "saida": 1000, "corte_altura": 0.5}
falta = estudio.exportar(lista, base, {"yui-10001": {"id": "yui", "ok": True, "p": 1.0}})
cor, manga = Image.open(base / "cor" / "yui.webp"), Image.open(base / "manga" / "yui.webp")
r, g, b = manga.convert("RGB").getpixel((50, 50))
print(json.dumps([falta, cor.size, manga.size, r == g == b, (base / "cor-tinta").exists()]))`);
    expect(r).toEqual([[], [100, 100], [100, 100], true, false]);
  });
});

describe.runIf(PY)('estúdio: prompt de cada item', () => {
  it('usa o estilo do lote, ou o do próprio item quando ele tem um (mão não leva "no humans")', () => {
    const r = py(`
m = {"prefixo": "best, ", "qualidade": "clean"}
lista = {"estilo": "no humans, white background"}
print(json.dumps([estudio.prompt_de(m, lista, {"prompt": "one cup"}), estudio.prompt_de(m, lista, {"prompt": "one hand", "estilo": "white background"})]))`);
    expect(r).toEqual(['best, one cup, no humans, white background, clean', 'best, one hand, white background, clean']);
  });
});

describe.runIf(PY)('estúdio: revisão de defeitos com o modelo de visão', () => {
  // Bug: o gato de costas com o rabo virado mancha solta passou, porque o CLIP não vê anatomia.
  const PREPARO = `
out = pathlib.Path(${JSON.stringify(pasta)}) / "rev"
out.mkdir(exist_ok=True)
for f in out.glob("*"): f.unlink()
estudio.pasta = lambda lista: out
lista = {"lote": "rev", "itens": [{"id": "neko", "rotulo": "a cat"}, {"id": "inu", "rotulo": "a dog"}]}
rel = {}
for k, p in (("neko-1", 0.99), ("neko-2", 0.95), ("neko-3", 0.90), ("inu-1", 0.99)):
    (out / f"{k}.png").write_bytes(k.encode())
    rel[k] = {"id": k.split("-")[0], "ok": True, "p": p, "sim": 0.3, "primeiro": "x"}
(out / "conferencia.json").write_text(json.dumps(rel), encoding="utf-8")
BOM = {"o_que_e": "a cat", "e_o_esperado": True, "membro_solto": False, "parte_faltando": False, "partes_soltas": False, "ambigua": False, "problemas": []}
perguntas = []
def visao(ruins):
    def perguntar(png, rotulo):
        perguntas.append(png.stem)
        return {**BOM, "membro_solto": True, "problemas": ["tail is a loose blob"]} if png.stem in ruins else BOM
    return perguntar
`;

  it('reprova membro solto, parte faltando, pedaço solto, figura ambígua ou outra coisa', () => {
    const r = py(`
BOM = {"o_que_e": "a cat", "e_o_esperado": True, "membro_solto": False, "parte_faltando": False, "partes_soltas": False, "ambigua": False, "problemas": []}
print(json.dumps([estudio.veredito(BOM)[0]] + [estudio.veredito({**BOM, c: True})[0] for c in ("membro_solto", "parte_faltando", "partes_soltas", "ambigua")] + [estudio.veredito({**BOM, "e_o_esperado": False, "o_que_e": "a blob"})]))`);
    expect(r).toEqual([true, false, false, false, false, [false, ['parece a blob']]]);
  });

  it('candidata com defeito sai da escolha e entra a próxima aprovada pelo CLIP', () => {
    const r = py(`${PREPARO}
sem_boa = estudio.revisar(lista, perguntar=visao({"neko-1"}))
esc = estudio.escolhidas(lista, estudio.ler_relatorio(out))
print(json.dumps([perguntas, sem_boa, esc]))`);
    expect(r).toEqual([['neko-1', 'neko-2', 'inu-1'], [], { neko: 'neko-2', inu: 'inu-1' }]);
  });

  it('a revisão guardada não é refeita; com a aprovada vetada, o arquivo refeito é revisto', () => {
    const r = py(`${PREPARO}
estudio.revisar(lista, perguntar=visao({"neko-1"}))
perguntas.clear()
estudio.revisar(lista, perguntar=visao(set()))
antes = list(perguntas)
time.sleep(0.02)
(out / "neko-1.png").write_bytes(b"refeita")
perguntas.clear()
estudio.revisar(lista, perguntar=visao(set()))
fica = (list(perguntas), estudio.escolhidas(lista, estudio.ler_relatorio(out))["neko"])
vetada = {**lista, "vetadas": ["neko-2"]}
perguntas.clear()
estudio.revisar(vetada, perguntar=visao(set()))
print(json.dumps([antes, *fica, perguntas, estudio.escolhidas(vetada, estudio.ler_relatorio(out))["neko"]]))`);
    expect(r).toEqual([[], [], 'neko-2', ['neko-1'], 'neko-1']);
  });

  it('lista que cresce: a imagem já aprovada fica, mesmo com o CLIP preferindo outra ou reprovando todas', () => {
    // Bug: com 98 rótulos novos, "a house" perdeu para "a school" e a toalha para o pano de chão;
    // o exportar trocou dez imagens antigas por candidatas sem revisão e tirou três do jogo.
    const r = py(`${PREPARO}
estudio.revisar(lista, perguntar=visao({"neko-1"}))
rel = json.loads((out / "conferencia.json").read_text(encoding="utf-8"))
rel["neko-3"]["p"] = 1.0
rel["inu-1"]["ok"] = False
(out / "conferencia.json").write_text(json.dumps(rel), encoding="utf-8")
perguntas.clear()
sem_boa = estudio.revisar(lista, perguntar=visao(set()))
print(json.dumps([perguntas, sem_boa, estudio.escolhidas(lista, estudio.ler_relatorio(out))]))`);
    expect(r).toEqual([[], [], { neko: 'neko-2', inu: 'inu-1' }]);
  });

  it('sem nenhuma candidata boa, o item volta para ser refeito; escolha fixada à mão fica', () => {
    const r = py(`${PREPARO}
sem_boa = estudio.revisar(lista, perguntar=visao({"neko-1", "neko-2", "neko-3"}))
fixa = estudio.revisar({**lista, "escolha": {"inu": 1}}, perguntar=visao({"inu-1"}))
print(json.dumps([sem_boa, estudio.escolhidas(lista, estudio.ler_relatorio(out))["neko"], fixa]))`);
    expect(r).toEqual([['neko'], null, ['neko']]);
  });
});

