"""Estúdio de imagens do Kotoba Arcade: gera, confere e exporta ilustrações a partir de uma lista de prompts.

Roda no PC, na placa de vídeo, com o Python de D:\\KotobaArcade-Arte\\venv (veja docs/imagens.md).
Cada lista fica em scripts/imagens/<lote>.json e diz o estilo, o destino e os itens.

Uso (de dentro da pasta do repositório):

    PY=D:/KotobaArcade-Arte/venv/Scripts/python
    $PY -I scripts/estudio.py gerar    scripts/imagens/objetos.json [id ...]   # candidatas, várias seeds
    $PY -I scripts/estudio.py conferir scripts/imagens/objetos.json            # CLIP: a imagem mostra a ideia certa?
    $PY -I scripts/estudio.py folha    scripts/imagens/objetos.json            # folhas de contato para olhar
    $PY -I scripts/estudio.py exportar scripts/imagens/objetos.json            # WebP cor + tinta no repositório
    $PY -I scripts/estudio.py tudo     scripts/imagens/objetos.json            # os quatro acima, refazendo as reprovadas

As candidatas e os relatórios ficam fora do repositório, em D:\\KotobaArcade-Arte\\estudio\\<lote>\\.
Só a imagem final (WebP) entra no repositório.

A placa é dividida com outras sessões. Antes de carregar qualquer modelo o estúdio cria
D:\\KotobaArcade-Arte\\gpu.lock com o nome de quem está usando e espera se o arquivo já existir,
ou se o Ollama tiver um modelo carregado, ou se um motor de voz estiver no ar. Apaga o lock ao terminar.

Formato da lista (JSON):

    {
      "lote": "objetos",                       nome da pasta de trabalho
      "destino": "src/assets/imagens",         pasta no repositório (cor); a versão mangá vai em <destino>-tinta
      "largura": 1024, "altura": 1024,         tamanho da geração
      "saida": 384,                            lado maior do WebP final
      "recorte": true,                         tira o fundo branco (fica transparente)
      "estilo": "...", "negativo": "...",      somados ao prompt de cada item
      "modelo_rotulo": "an illustration of {}", frase do CLIP
      "distratores": ["a person", ...],        rótulos extras que a imagem NÃO pode parecer
      "seeds": [1, 2, 3],
      "itens": [
        {"id": "kasa", "rotulo": "an umbrella", "prompt": "closed umbrella, ...",
         "evitar": ["a cane"], "seeds": [7, 8]}   evitar e seeds são opcionais
      ]
    }

O id vira o nome do arquivo (só a-z, 0-9 e hífen). O rótulo é o que o CLIP compara: a imagem só passa
se o próprio rótulo ganhar de todos os outros rótulos do lote e dos distratores, com folga.
"""
from __future__ import annotations

import warnings

warnings.filterwarnings("ignore")

import json
import os
import pathlib
import re
import sys
import time
import urllib.request
from collections import deque

ARTE = pathlib.Path(os.environ.get("KOTOBA_ARTE", "D:/KotobaArcade-Arte"))
MODELO = ARTE / "modelos" / "animagine-xl-4.0-opt.safetensors"
CLIP = "laion/CLIP-ViT-H-14-laion2B-s32B-b79K"
LOCK = ARTE / "gpu.lock"
SESSAO = os.environ.get("KOTOBA_SESSAO", "estudio")

QUAL = "masterpiece, high score, great score, absurdres"
NEG_BASE = (
    "lowres, bad anatomy, bad hands, text, letters, words, writing, logo, label, caption, kanji, english text, "
    "speech bubble, signature, watermark, username, error, cropped, worst quality, low quality, low score, "
    "bad score, average score, blurry, jpeg artifacts, retro, 1990s (style), 1980s (style), vhs, crt, neon, "
    "synthwave, chromatic aberration"
)
# Probabilidade mínima do rótulo certo e folga mínima sobre o segundo colocado.
ACEITE_P = 0.45
ACEITE_FOLGA = 0.15
# Quantas levas extras de seeds tentar com um item reprovado.
RODADAS_EXTRAS = 2


# ---------------------------------------------------------------- lista


def ler_lista(caminho: str) -> dict:
    lista = json.loads(pathlib.Path(caminho).read_text(encoding="utf-8"))
    ids = [i["id"] for i in lista["itens"]]
    ruins = [i for i in ids if not re.fullmatch(r"[a-z0-9-]+", i)]
    if ruins:
        raise SystemExit(f"id inválido (use a-z, 0-9 e hífen): {ruins}")
    repetidos = {i for i in ids if ids.count(i) > 1}
    if repetidos:
        raise SystemExit(f"id repetido: {sorted(repetidos)}")
    return lista


def pasta(lista: dict) -> pathlib.Path:
    p = ARTE / "estudio" / lista["lote"]
    p.mkdir(parents=True, exist_ok=True)
    return p


def seeds_de(lista: dict, item: dict, rodada: int = 0) -> list[int]:
    base = item.get("seeds") or lista.get("seeds") or [1, 2, 3]
    return [s + 1000 * rodada for s in base]


# ---------------------------------------------------------------- placa de vídeo


def _ollama_carregado() -> bool:
    try:
        with urllib.request.urlopen("http://127.0.0.1:11434/api/ps", timeout=2) as r:
            return bool(json.load(r).get("models"))
    except Exception:
        return False


def _voz_no_ar() -> bool:
    for porta in (10101, 50021):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{porta}/version", timeout=2)
            return True
        except Exception:
            pass
    return False


class Placa:
    """Trava da placa de vídeo, dividida entre as sessões. Use com `with Placa():`."""

    def __enter__(self):
        avisou = False
        while True:
            ocupada = LOCK.exists() or _ollama_carregado() or _voz_no_ar()
            if not ocupada:
                try:
                    with open(LOCK, "x", encoding="utf-8") as f:
                        f.write(f"{SESSAO} {time.strftime('%Y-%m-%d %H:%M:%S')} pid {os.getpid()}\n")
                    return self
                except FileExistsError:
                    pass
            if not avisou:
                dono = LOCK.read_text(encoding="utf-8").strip() if LOCK.exists() else "Ollama ou motor de voz"
                print(f"placa ocupada ({dono}); esperando...", flush=True)
                avisou = True
            time.sleep(30)

    def __exit__(self, *exc):
        try:
            if LOCK.exists() and f"pid {os.getpid()}" in LOCK.read_text(encoding="utf-8"):
                LOCK.unlink()
        except OSError:
            pass
        return False


# ---------------------------------------------------------------- gerar


def _pipe():
    import torch
    from diffusers import EulerAncestralDiscreteScheduler, StableDiffusionXLPipeline
    from diffusers.utils import logging as dlog

    dlog.set_verbosity_error()
    dlog.disable_progress_bar()

    pipe = StableDiffusionXLPipeline.from_single_file(str(MODELO), torch_dtype=torch.float16, use_safetensors=True)
    pipe.scheduler = EulerAncestralDiscreteScheduler.from_config(pipe.scheduler.config)
    pipe.to("cuda")
    pipe.set_progress_bar_config(disable=True)
    return pipe


def gerar(lista: dict, so: set[str] | None = None, rodada: int = 0, pipe=None) -> None:
    import torch

    out = pasta(lista)
    w, h = lista.get("largura", 1024), lista.get("altura", 1024)
    neg = f"{lista.get('negativo', '')}, {NEG_BASE}".strip(", ")
    pendentes = []
    for item in lista["itens"]:
        if so and item["id"] not in so:
            continue
        seeds = [s for s in seeds_de(lista, item, rodada) if not (out / f"{item['id']}-{s}.png").exists()]
        if seeds:
            pendentes.append((item, seeds))
    if not pendentes:
        return
    pipe = pipe or _pipe()
    t0 = time.time()
    for n, (item, seeds) in enumerate(pendentes, 1):
        prompt = f"{item['prompt']}, {lista.get('estilo', '')}, {QUAL}"
        imgs = pipe(
            prompt=[prompt] * len(seeds),
            negative_prompt=[f"{item.get('negativo', '')}, {neg}".strip(", ")] * len(seeds),
            width=w,
            height=h,
            guidance_scale=lista.get("cfg", 5),
            num_inference_steps=lista.get("passos", 26),
            generator=[torch.Generator("cuda").manual_seed(s) for s in seeds],
        ).images
        for s, img in zip(seeds, imgs):
            img.save(out / f"{item['id']}-{s}.png")
        resta = (time.time() - t0) / n * (len(pendentes) - n)
        print(f"[{n}/{len(pendentes)}] {item['id']} seeds {seeds} (faltam ~{resta / 60:.0f} min)", flush=True)
    return pipe


# ---------------------------------------------------------------- conferir


def _clip():
    import torch
    from transformers import CLIPModel, CLIPProcessor

    from transformers.utils import logging as tlog

    tlog.disable_progress_bar()
    tlog.set_verbosity_error()
    modelo = CLIPModel.from_pretrained(CLIP, dtype=torch.float16).to("cuda").eval()
    proc = CLIPProcessor.from_pretrained(CLIP)
    return modelo, proc


# Rótulos que toda imagem precisa vencer: pegam desenho deformado, abstrato ou com texto.
DISTRATORES_GERAIS = [
    "an abstract shape",
    "a deformed object",
    "a random tool",
    "a piece of wood",
    "written text and letters",
    "a pattern",
]


def _rotulos(lista: dict) -> list[str]:
    vistos: list[str] = []
    extras = lista.get("distratores", []) + DISTRATORES_GERAIS
    for r in [i["rotulo"] for i in lista["itens"]] + extras + [e for i in lista["itens"] for e in i.get("evitar", [])]:
        if r not in vistos:
            vistos.append(r)
    return vistos


def conferir(lista: dict, clip=None) -> dict:
    """Dá nota a cada candidata: chance do rótulo certo contra todos os outros rótulos."""
    import torch
    from PIL import Image

    out = pasta(lista)
    modelo, proc = clip or _clip()
    rotulos = _rotulos(lista)
    frase = lista.get("modelo_rotulo", "an illustration of {}")
    ti = proc(text=[frase.format(r) for r in rotulos], return_tensors="pt", padding=True).to("cuda")
    relatorio_path = out / "conferencia.json"
    relatorio = json.loads(relatorio_path.read_text(encoding="utf-8")) if relatorio_path.exists() else {}
    for item in lista["itens"]:
        alvo = rotulos.index(item["rotulo"])
        for png in sorted(out.glob(f"{item['id']}-*.png")):
            if not re.fullmatch(rf"{re.escape(item['id'])}-\d+", png.stem):
                continue
            chave = png.stem
            if chave in relatorio and relatorio[chave].get("rotulo") == item["rotulo"] and relatorio[chave].get("n") == len(rotulos):
                continue
            img = Image.open(png).convert("RGB")
            with torch.no_grad():
                ii = proc(images=img, return_tensors="pt").to("cuda")
                saida = modelo(input_ids=ti["input_ids"], attention_mask=ti["attention_mask"], pixel_values=ii["pixel_values"].half())
                logits = saida.logits_per_image.float()[0]
                probs = logits.softmax(dim=-1).cpu().tolist()
                sim = float(logits[alvo]) / float(modelo.logit_scale.exp())
            ordem = sorted(range(len(rotulos)), key=lambda k: -probs[k])
            segundo = next(k for k in ordem if k != alvo)
            relatorio[chave] = {
                "id": item["id"],
                "rotulo": item["rotulo"],
                "n": len(rotulos),
                "p": round(probs[alvo], 3),
                "sim": round(sim, 4),
                "folga": round(probs[alvo] - probs[segundo], 3),
                "primeiro": rotulos[ordem[0]],
                "segundo": rotulos[segundo],
                "ok": ordem[0] == alvo and probs[alvo] >= ACEITE_P and probs[alvo] - probs[segundo] >= ACEITE_FOLGA,
            }
    relatorio_path.write_text(json.dumps(relatorio, indent=1, ensure_ascii=False), encoding="utf-8")
    return relatorio


def escolhidas(lista: dict, relatorio: dict) -> dict[str, str | None]:
    """Melhor candidata aprovada de cada item (ou a fixada à mão em "escolha"), ou None se nenhuma passou."""
    fixas = lista.get("escolha", {})
    res: dict[str, str | None] = {}
    for item in lista["itens"]:
        if item["id"] in fixas:
            res[item["id"]] = f"{item['id']}-{fixas[item['id']]}"
            continue
        # Desempate pela semelhança com o rótulo: o CLIP satura a chance em 1,00 com facilidade.
        boas = [(round(v["p"], 2), v.get("sim", 0), k) for k, v in relatorio.items() if v["id"] == item["id"] and v["ok"] and k not in lista.get("vetadas", [])]
        res[item["id"]] = max(boas)[2] if boas else None
    return res


# ---------------------------------------------------------------- exportar


def recortar(img):
    """Tira o fundo claro ligado à borda (flood fill) e devolve RGBA recortado no objeto."""
    import numpy as np
    from PIL import Image, ImageFilter

    rgb = np.asarray(img.convert("RGB")).astype(np.int16)
    h, w, _ = rgb.shape
    # Cor do fundo = mediana da borda. O fundo nem sempre sai branco puro (às vezes cinza claro ou bege).
    borda = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    cor_fundo = np.median(borda, axis=0)
    claro = np.abs(rgb - cor_fundo).max(axis=2) <= 30
    fundo = np.zeros((h, w), dtype=bool)
    fila = deque()
    for x in range(w):
        for y in (0, h - 1):
            if claro[y, x] and not fundo[y, x]:
                fundo[y, x] = True
                fila.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if claro[y, x] and not fundo[y, x]:
                fundo[y, x] = True
                fila.append((y, x))
    while fila:
        y, x = fila.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and claro[ny, nx] and not fundo[ny, nx]:
                fundo[ny, nx] = True
                fila.append((ny, nx))
    alfa = Image.fromarray(np.where(fundo, 0, 255).astype("uint8"), "L")
    # Borda macia de 1 px, sem halo branco.
    alfa = alfa.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    rgba = img.convert("RGB")
    rgba.putalpha(alfa)
    caixa = alfa.point(lambda v: 255 if v > 8 else 0).getbbox()
    return rgba.crop(caixa) if caixa else rgba


def tinta(img):
    """Versão mangá: cinza com contraste de nanquim. Mantém o alfa."""
    from PIL import Image, ImageEnhance, ImageOps

    alfa = img.getchannel("A") if img.mode == "RGBA" else None
    cinza = ImageOps.autocontrast(img.convert("L"), cutoff=0.5)
    cinza = ImageEnhance.Contrast(cinza).enhance(1.15)
    if alfa is None:
        return cinza
    out = Image.merge("LA", (cinza, alfa))
    return out


def exportar(lista: dict, repo: pathlib.Path, relatorio: dict) -> list[str]:
    from PIL import Image

    out = pasta(lista)
    destino = repo / lista["destino"]
    destino_tinta = repo / f"{lista['destino']}-tinta"
    destino.mkdir(parents=True, exist_ok=True)
    destino_tinta.mkdir(parents=True, exist_ok=True)
    lado = lista.get("saida", 384)
    faltando = []
    for iid, chave in escolhidas(lista, relatorio).items():
        if not chave:
            faltando.append(iid)
            continue
        img = Image.open(out / f"{chave}.png")
        img = recortar(img) if lista.get("recorte") else img.convert("RGB")
        img.thumbnail((lado, lado), Image.LANCZOS)
        img.save(destino / f"{iid}.webp", "WEBP", quality=lista.get("qualidade", 72), method=6)
        tinta(img).save(destino_tinta / f"{iid}.webp", "WEBP", quality=lista.get("qualidade", 72), method=6)
    return faltando


def folha(lista: dict, relatorio: dict, so_reprovadas: bool = False) -> list[pathlib.Path]:
    """Folhas de contato (fora do repositório) para conferir as imagens a olho."""
    from PIL import Image, ImageDraw

    out = pasta(lista)
    cel, cols, por_folha = 200, 8, 48
    chaves = sorted(relatorio)
    if so_reprovadas:
        chaves = [k for k in chaves if not relatorio[k]["ok"]]
    folhas = []
    for f in range(0, len(chaves), por_folha):
        parte = chaves[f : f + por_folha]
        linhas = (len(parte) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * cel, linhas * (cel + 28)), "white")
        d = ImageDraw.Draw(sheet)
        for n, k in enumerate(parte):
            im = Image.open(out / f"{k}.png").convert("RGB")
            im.thumbnail((cel, cel))
            x, y = (n % cols) * cel, (n // cols) * (cel + 28)
            sheet.paste(im, (x, y))
            v = relatorio[k]
            d.text((x + 2, y + cel + 1), f"{k} {'OK' if v['ok'] else 'X'} {v['p']:.2f}", fill="black")
            d.text((x + 2, y + cel + 13), f"1:{v['primeiro'][:30]}", fill="black" if v["ok"] else "red")
        p = out / f"folha-{f // por_folha + 1}{'-x' if so_reprovadas else ''}.jpg"
        sheet.save(p, quality=80)
        folhas.append(p)
    return folhas


# ---------------------------------------------------------------- comandos


def main(argv: list[str]) -> None:
    if len(argv) < 2:
        raise SystemExit(__doc__)
    cmd, lista = argv[0], ler_lista(argv[1])
    resto = argv[2:]
    repo = pathlib.Path(__file__).resolve().parent.parent
    if cmd == "gerar":
        with Placa():
            gerar(lista, set(resto) or None)
    elif cmd == "conferir":
        with Placa():
            rel = conferir(lista)
        ok = sum(1 for k in escolhidas(lista, rel).values() if k)
        print(f"{ok}/{len(lista['itens'])} itens com candidata aprovada")
    elif cmd == "folha":
        rel = json.loads((pasta(lista) / "conferencia.json").read_text(encoding="utf-8"))
        for p in folha(lista, rel, "x" in resto):
            print(p)
    elif cmd == "exportar":
        rel = json.loads((pasta(lista) / "conferencia.json").read_text(encoding="utf-8"))
        faltando = exportar(lista, repo, rel)
        print("sem imagem aprovada:", faltando or "nenhum")
    elif cmd == "tudo":
        with Placa():
            pipe = gerar(lista, set(resto) or None)
            clip = _clip()
            rel = conferir(lista, clip)
            for rodada in range(1, RODADAS_EXTRAS + 1):
                faltam = {i for i, k in escolhidas(lista, rel).items() if not k and (not resto or i in resto)}
                if not faltam:
                    break
                print(f"refazendo {len(faltam)} reprovadas (rodada {rodada}): {sorted(faltam)}", flush=True)
                pipe = gerar(lista, faltam, rodada, pipe) or pipe
                rel = conferir(lista, clip)
        faltando = exportar(lista, repo, rel)
        print("sem imagem aprovada:", faltando or "nenhum")
        for p in folha(lista, rel):
            print(p)
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
