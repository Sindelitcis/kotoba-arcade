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

A placa é dividida com outras sessões. Antes de carregar qualquer modelo o estúdio prende a placa com
scripts/placa.py (trava do sistema, solta sozinha se o processo morrer) e espera o Ollama descarregar, os
motores de voz saírem do ar e sobrar memória livre na placa. Só um modelo fica na placa por vez.

O modelo de imagem vem de scripts/imagens/motores.json (um "motor" por modelo, com passos, cfg e offload
próprios). Troque com "motor" na lista ou com KOTOBA_MOTOR=<nome>.

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
from collections import deque

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))  # -I tira a pasta do script do caminho
from placa import Placa  # noqa: E402

ARTE = pathlib.Path(os.environ.get("KOTOBA_ARTE", "D:/KotobaArcade-Arte"))
MOTORES = pathlib.Path(__file__).resolve().parent / "imagens" / "motores.json"
CLIP = "laion/CLIP-ViT-H-14-laion2B-s32B-b79K"
CLIP_VRAM_GB = 4
SESSAO = os.environ.get("KOTOBA_SESSAO", "estudio")
# Folga deixada fora do teto de memória do PyTorch (o Windows usa um pouco da placa para a tela).
FOLGA_GB = 0.8
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


def motor(lista: dict) -> dict:
    """O motor de geração (modelo + passos, cfg, offload) da lista, do ambiente ou o padrão.
    A lista pode ajustar um motor em "por_motor": {"nome": {"passos": 24}}."""
    tabela = json.loads(MOTORES.read_text(encoding="utf-8"))
    nome = os.environ.get("KOTOBA_MOTOR") or lista.get("motor") or tabela["padrao"]
    if nome not in tabela["motores"]:
        raise SystemExit(f"motor desconhecido: {nome} (veja {MOTORES.name})")
    m = {"nome": nome, "cfg": 5, "passos": 26, "offload": "nenhum", "vram": 10, "qualidade": "", "negativo": True}
    m.update(tabela["motores"][nome])
    m.update(lista.get("por_motor", {}).get(nome, {}))
    return m


def teto_de_memoria() -> None:
    """Põe um teto no PyTorch igual ao que está livre agora. Passar dele vira erro de memória,
    em vez de o driver do Windows jogar o excesso na RAM em silêncio (fica dezenas de vezes mais lento)."""
    import torch

    livre, total = torch.cuda.mem_get_info()
    fracao = max(0.1, min(0.95, (livre - FOLGA_GB * 2**30) / total))
    torch.cuda.set_per_process_memory_fraction(fracao)
    print(f"teto de memória: {fracao * total / 2**30:.1f} GB de {total / 2**30:.1f}", flush=True)


def pico(fase: str) -> None:
    import torch

    print(f"[{fase}] pico de memória na placa: {torch.cuda.max_memory_allocated() / 2**30:.1f} GB", flush=True)
    torch.cuda.reset_peak_memory_stats()


def descarregar() -> None:
    """Devolve à placa a memória dos modelos que ninguém mais usa. Quem chama solta a referência antes."""
    import gc

    import torch

    gc.collect()
    torch.cuda.empty_cache()


# ---------------------------------------------------------------- gerar


def _pipe(m: dict):
    import torch
    from diffusers.utils import logging as dlog

    dlog.set_verbosity_error()
    dlog.disable_progress_bar()
    teto_de_memoria()
    dtype = getattr(torch, m.get("dtype", "float16"))
    if m["tipo"] == "sdxl-arquivo":
        from diffusers import EulerAncestralDiscreteScheduler, StableDiffusionXLPipeline

        pipe = StableDiffusionXLPipeline.from_single_file(str(ARTE / m["arquivo"]), torch_dtype=dtype, use_safetensors=True)
        if m.get("agendador", "euler-a") == "euler-a":
            pipe.scheduler = EulerAncestralDiscreteScheduler.from_config(pipe.scheduler.config)
    elif m["tipo"] == "diffusers":
        from diffusers import DiffusionPipeline

        origem = str(ARTE / m["pasta"]) if "pasta" in m else m["repo"]
        pipe = DiffusionPipeline.from_pretrained(origem, torch_dtype=dtype)
    else:
        raise SystemExit(f"tipo de motor desconhecido: {m['tipo']}")
    if m["offload"] == "modelo":
        pipe.enable_model_cpu_offload()
    elif m["offload"] == "sequencial":
        pipe.enable_sequential_cpu_offload()
    else:
        pipe.to("cuda")
    # A VAE decodifica uma imagem por vez e em ladrilhos: o lote de 3 em 1024² não estoura mais a memória.
    # (diffusers 0.43 tirou pipe.enable_vae_slicing; o método ficou na própria VAE.)
    vae = getattr(pipe, "vae", None)
    for antigo, novo in (("enable_vae_slicing", "enable_slicing"), ("enable_vae_tiling", "enable_tiling")):
        if hasattr(vae, novo):
            getattr(vae, novo)()
        elif hasattr(pipe, antigo):
            getattr(pipe, antigo)()
    pipe.set_progress_bar_config(disable=True)
    return pipe


def _chamar(pipe, m: dict, prompts: list[str], negativos: list[str], seeds: list[int], w: int, h: int):
    """Uma chamada do modelo, só com os argumentos que ele aceita (FLUX não tem negativo, por exemplo)."""
    import inspect

    import torch

    aceita = inspect.signature(pipe.__call__).parameters
    args = dict(
        prompt=prompts, width=w, height=h, guidance_scale=m["cfg"], num_inference_steps=m["passos"],
        generator=[torch.Generator("cuda").manual_seed(s) for s in seeds],
    )
    if m["negativo"] and "negative_prompt" in aceita:
        args["negative_prompt"] = negativos
    return pipe(**{k: v for k, v in args.items() if k in aceita}).images


def lotes(seeds: list[int], tamanho: int) -> list[list[int]]:
    return [seeds[i:i + tamanho] for i in range(0, len(seeds), tamanho)]


def gerar(lista: dict, so: set[str] | None = None, rodada: int = 0, pipe=None):
    import torch

    m = motor(lista)
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
    pipe = pipe or _pipe(m)
    t0 = time.time()
    lote = len(seeds_de(lista, pendentes[0][0]))
    for n, (item, seeds) in enumerate(pendentes, 1):
        prompt = ", ".join(x for x in (item["prompt"], lista.get("estilo", ""), m["qualidade"]) if x)
        negativo = f"{item.get('negativo', '')}, {neg}".strip(", ")
        for grupo in lotes(seeds, lote):
            try:
                imgs = _chamar(pipe, m, [prompt] * len(grupo), [negativo] * len(grupo), grupo, w, h)
            except torch.cuda.OutOfMemoryError:
                if lote == 1:
                    raise
                # Bateu no teto: segue de uma em uma, em vez de vazar para a RAM.
                torch.cuda.empty_cache()
                lote = 1
                print("memória cheia com o lote; seguindo de uma imagem por vez", flush=True)
                imgs = [_chamar(pipe, m, [prompt], [negativo], [s], w, h)[0] for s in grupo]
            for s, img in zip(grupo, imgs):
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
    teto_de_memoria()
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
        with Placa(SESSAO, vram_gb=motor(lista)["vram"]):
            if gerar(lista, set(resto) or None):
                pico("gerar")
    elif cmd == "conferir":
        with Placa(SESSAO, vram_gb=CLIP_VRAM_GB):
            rel = conferir(lista)
            pico("conferir")
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
        # Gerar e conferir se alternam, e só um modelo fica na placa por vez: o SDXL e o CLIP juntos
        # passavam da memória da placa e o excesso ia para a RAM.
        with Placa(SESSAO, vram_gb=motor(lista)["vram"]):
            pipe = gerar(lista, set(resto) or None)
            if pipe:
                pico("gerar")
                pipe = None
                descarregar()
            rel = conferir(lista)
            pico("conferir")
            descarregar()
            for rodada in range(1, RODADAS_EXTRAS + 1):
                faltam = {i for i, k in escolhidas(lista, rel).items() if not k and (not resto or i in resto)}
                if not faltam:
                    break
                print(f"refazendo {len(faltam)} reprovadas (rodada {rodada}): {sorted(faltam)}", flush=True)
                pipe = gerar(lista, faltam, rodada)
                if pipe:
                    pico(f"gerar, rodada {rodada}")
                    pipe = None
                    descarregar()
                rel = conferir(lista)
                pico(f"conferir, rodada {rodada}")
                descarregar()
        faltando = exportar(lista, repo, rel)
        print("sem imagem aprovada:", faltando or "nenhum")
        for p in folha(lista, rel):
            print(p)
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
