"""Estúdio de imagens do Kotoba Arcade: gera, confere e exporta ilustrações a partir de uma lista de prompts.

Roda no PC, na placa de vídeo, com o Python de D:\\KotobaArcade\\arte\\venv (veja docs/imagens.md).
Cada lista fica em scripts/imagens/<lote>.json e diz o estilo, o destino e os itens.

Uso (de dentro da pasta do repositório):

    PY=D:/KotobaArcade/arte/venv/Scripts/python
    $PY -I scripts/estudio.py gerar    scripts/imagens/objetos.json [id ...]   # candidatas, várias seeds
    $PY -I scripts/estudio.py conferir scripts/imagens/objetos.json            # CLIP: a imagem mostra a ideia certa?
    $PY -I scripts/estudio.py revisar  scripts/imagens/objetos.json [id ...]   # modelo de visão: tem defeito?
    $PY -I scripts/estudio.py folha    scripts/imagens/objetos.json            # folhas de contato para olhar
    $PY -I scripts/estudio.py exportar scripts/imagens/objetos.json            # WebP no repositório
    $PY -I scripts/estudio.py tudo     scripts/imagens/objetos.json            # todos acima, refazendo as reprovadas

As candidatas e os relatórios ficam fora do repositório, em D:\\KotobaArcade\\arte\\estudio\\<lote>\\.
Só a imagem final (WebP) entra no repositório.

A placa é dividida com outras sessões. Antes de carregar qualquer modelo o estúdio prende a placa com
scripts/placa.py (trava do sistema, solta sozinha se o processo morrer) e espera o Ollama descarregar, os
motores de voz saírem do ar e sobrar memória livre na placa. Só um modelo fica na placa por vez.

O modelo de imagem vem de scripts/imagens/motores.json (um "motor" por modelo, com passos, cfg e offload
próprios). Troque com "motor" na lista ou com KOTOBA_MOTOR=<nome>.

Formato da lista (JSON):

    {
      "lote": "objetos",                       nome da pasta de trabalho
      "destino": "src/assets/imagens",         pasta no repositório
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

import hashlib
import json
import os
import pathlib
import re
import sys
import time
import urllib.request
from collections import deque

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))  # -I tira a pasta do script do caminho
from placa import Placa  # noqa: E402

ARTE = pathlib.Path(os.environ.get("KOTOBA_ARTE", "D:/KotobaArcade/arte"))
MOTORES = pathlib.Path(__file__).resolve().parent / "imagens" / "motores.json"
CLIP = "laion/CLIP-ViT-H-14-laion2B-s32B-b79K"
CLIP_VRAM_GB = 4
# Revisão de defeitos: modelo de visão local, no Ollama. O CLIP vê "é um gato", mas não vê o rabo solto.
OLLAMA = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
VISAO = os.environ.get("KOTOBA_VISAO", "gemma4:12b")
VISAO_VRAM_GB = 9
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
    """Seeds da rodada. Cada motor soma o seu deslocamento ("seed"), para a candidata de um modelo
    novo não ter o mesmo nome de arquivo que a de outro modelo (que seria pulada como já gerada)."""
    base = item.get("seeds") or lista.get("seeds") or [1, 2, 3]
    return [s + 1000 * rodada + motor(lista).get("seed", 0) for s in base]


# ---------------------------------------------------------------- placa de vídeo


def motor(lista: dict) -> dict:
    """O motor de geração (modelo + passos, cfg, offload) da lista, do ambiente ou o padrão.
    A lista pode ajustar um motor em "por_motor": {"nome": {"passos": 24}}."""
    tabela = json.loads(MOTORES.read_text(encoding="utf-8"))
    nome = os.environ.get("KOTOBA_MOTOR") or lista.get("motor") or tabela["padrao"]
    if nome not in tabela["motores"]:
        raise SystemExit(f"motor desconhecido: {nome} (veja {MOTORES.name})")
    m = {"nome": nome, "cfg": 5, "passos": 26, "offload": "nenhum", "vram": 10, "prefixo": "", "qualidade": "",
         "negativo": True, "gerador": "cuda", "seed": 0}
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

    from transformers.utils import logging as tlog

    dlog.set_verbosity_error()
    dlog.disable_progress_bar()
    tlog.set_verbosity_error()
    tlog.disable_progress_bar()
    teto_de_memoria()
    dtype = getattr(torch, m.get("dtype", "float16"))
    if m["tipo"] == "sdxl-arquivo":
        from diffusers import EulerAncestralDiscreteScheduler, StableDiffusionXLPipeline

        pipe = StableDiffusionXLPipeline.from_single_file(str(ARTE / m["arquivo"]), torch_dtype=dtype, use_safetensors=True)
        if m.get("agendador", "euler-a") == "euler-a":
            pipe.scheduler = EulerAncestralDiscreteScheduler.from_config(pipe.scheduler.config)
    elif m["tipo"] == "anima":
        pipe = _Anima(ARTE / m["base"], ARTE / m["variante"] if m.get("variante") else None, dtype)
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


class _Anima:
    """Anima (CircleStone Labs): pipeline modular do diffusers, com a mesma chamada dos outros.
    A base fica no formato diffusers; a variante (Turbo, por exemplo) é um arquivo único do ComfyUI
    com o transformer e o adaptador do LLM juntos, que entram por cima da base."""

    def __init__(self, base: pathlib.Path, variante: pathlib.Path | None, dtype):
        from diffusers import ClassifierFreeGuidance, ModularPipeline

        self.p = ModularPipeline.from_pretrained(str(base))
        self.p.load_components(torch_dtype=dtype)
        if variante:
            from diffusers.loaders.single_file_utils import convert_cosmos_transformer_checkpoint_to_diffusers
            from safetensors.torch import load_file

            sd = {k.removeprefix("model.diffusion_model."): v for k, v in load_file(str(variante)).items()}
            adaptador = {k.removeprefix("llm_adapter."): v for k, v in sd.items() if k.startswith("llm_adapter.")}
            transformer = convert_cosmos_transformer_checkpoint_to_diffusers({k: v for k, v in sd.items() if not k.startswith("llm_adapter.")})
            self.p.transformer.load_state_dict(transformer, strict=True)
            self.p.text_conditioner.load_state_dict(adaptador, strict=True)
            del sd, adaptador, transformer
        self._guia = ClassifierFreeGuidance
        if hasattr(self.p, "set_progress_bar_config"):
            self.p.set_progress_bar_config(disable=True)

    def to(self, dispositivo: str) -> "_Anima":
        self.p.to(dispositivo)
        return self

    def set_progress_bar_config(self, **kw) -> None:
        pass

    def __call__(self, prompt, guidance_scale: float, num_inference_steps: int, width: int, height: int, generator, negative_prompt=None):
        """Uma imagem por prompt (o pipeline modular não recebe lista de seeds)."""
        self.p.update_components(guider=self._guia(guidance_scale=guidance_scale))
        prompts = [prompt] if isinstance(prompt, str) else prompt
        geradores = generator if isinstance(generator, list) else [generator]
        negativos = negative_prompt if isinstance(negative_prompt, list) else [negative_prompt] * len(prompts)
        imgs = []
        for pr, g, neg in zip(prompts, geradores, negativos):
            extra = {"negative_prompt": neg} if neg else {}
            imgs += list(self.p(prompt=pr, num_inference_steps=num_inference_steps, width=width, height=height, generator=g, output="images", **extra))

        class Resultado:
            images = imgs

        return Resultado()


def _chamar(pipe, m: dict, prompts: list[str], negativos: list[str], seeds: list[int], w: int, h: int):
    """Uma chamada do modelo, só com os argumentos que ele aceita (FLUX não tem negativo, por exemplo)."""
    import inspect

    import torch

    aceita = inspect.signature(pipe.__call__).parameters
    args = dict(
        prompt=prompts, width=w, height=h, guidance_scale=m["cfg"], num_inference_steps=m["passos"],
        generator=[torch.Generator(m["gerador"]).manual_seed(s) for s in seeds],
    )
    if m["negativo"] and "negative_prompt" in aceita:
        args["negative_prompt"] = negativos
    return pipe(**{k: v for k, v in args.items() if k in aceita}).images


def lotes(seeds: list[int], tamanho: int) -> list[list[int]]:
    return [seeds[i:i + tamanho] for i in range(0, len(seeds), tamanho)]


def prompt_de(m: dict, lista: dict, item: dict) -> str:
    """Prompt de um item: o dele, o estilo do lote (ou o próprio, quando o item tem um) e a qualidade do motor.
    Uma mão ou um rosto não podem levar o "no humans" do estilo dos objetos."""
    estilo = item.get("estilo", lista.get("estilo", ""))
    return m["prefixo"] + ", ".join(x for x in (item["prompt"], estilo, m["qualidade"]) if x)


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
    lote = min(m.get("lote", 99), len(seeds_de(lista, pendentes[0][0])))
    for n, (item, seeds) in enumerate(pendentes, 1):
        prompt = prompt_de(m, lista, item)
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


def assinatura(png: pathlib.Path) -> str:
    """Identifica o arquivo: gerar de novo com a mesma seed troca a assinatura."""
    st = png.stat()
    return f"{st.st_size}-{st.st_mtime_ns}"


def resumo_rotulos(rotulos: list[str]) -> str:
    return hashlib.sha1("\n".join(rotulos).encode("utf-8")).hexdigest()[:12]


def ainda_vale(entrada: dict | None, rotulo: str, rotulos: list[str], arquivo: str) -> bool:
    """A nota guardada só vale para o mesmo arquivo, comparado com o mesmo rótulo e os mesmos rivais.
    Antes valia só pelo rótulo: imagem refeita com a mesma seed herdava a nota da antiga."""
    return bool(entrada) and entrada.get("rotulo") == rotulo and entrada.get("rotulos") == resumo_rotulos(rotulos) and entrada.get("arquivo") == arquivo


def ler_relatorio(out: pathlib.Path, com_revisao: bool = True) -> dict:
    """Lê `conferencia.json` sem as candidatas cujo arquivo não existe mais (apagada ou movida
    para refazer com outro prompt). Antes elas ficavam e a folha quebrava ao abrir a imagem.
    Com a revisão, a candidata que o modelo de visão reprovou conta como reprovada, e a que ele aprovou
    conta como aprovada e "revista", mesmo que a nota do CLIP tenha caído depois. A nota cai quando a lista
    ganha rótulos parecidos (a casa perto da escola, a toalha perto do pano de chão)."""
    caminho = out / "conferencia.json"
    rel = json.loads(caminho.read_text(encoding="utf-8")) if caminho.exists() else {}
    rel = {k: v for k, v in rel.items() if (out / f"{k}.png").exists()}
    if com_revisao:
        rev = ler_revisao(out)
        for k, v in rel.items():
            r = rev.get(k)
            if r and revisao_vale(r, assinatura(out / f"{k}.png")):
                rel[k] = {**v, "ok": True, "revista": True} if r["ok"] else {**v, "ok": False, "defeitos": r["defeitos"]}
    return rel


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
    relatorio = ler_relatorio(out, com_revisao=False)
    for item in lista["itens"]:
        alvo = rotulos.index(item["rotulo"])
        for png in sorted(out.glob(f"{item['id']}-*.png")):
            if not re.fullmatch(rf"{re.escape(item['id'])}-\d+", png.stem):
                continue
            chave = png.stem
            arquivo = assinatura(png)
            if ainda_vale(relatorio.get(chave), item["rotulo"], rotulos, arquivo):
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
                "rotulos": resumo_rotulos(rotulos),
                "arquivo": arquivo,
                "p": round(probs[alvo], 3),
                "sim": round(sim, 4),
                "folga": round(probs[alvo] - probs[segundo], 3),
                "primeiro": rotulos[ordem[0]],
                "segundo": rotulos[segundo],
                "ok": ordem[0] == alvo and probs[alvo] >= ACEITE_P and probs[alvo] - probs[segundo] >= ACEITE_FOLGA,
            }
    relatorio_path.write_text(json.dumps(relatorio, indent=1, ensure_ascii=False), encoding="utf-8", newline="\n")
    return relatorio


def pode(lista: dict, chave: str) -> bool:
    """A candidata pode ser escolhida: não foi vetada e não é de um modelo antigo. `desde_seed` deixa
    de fora as seeds abaixo dele (as do Animagine vão de 1 a 9999; as do Anima começam em 10000)."""
    seed = chave.rsplit("-", 1)[1]
    return chave not in lista.get("vetadas", []) and (not seed.isdigit() or int(seed) >= lista.get("desde_seed", 0))


def escolhidas(lista: dict, relatorio: dict) -> dict[str, str | None]:
    """Melhor candidata aprovada de cada item (ou a fixada à mão em "escolha"), ou None se nenhuma passou.
    A já aprovada pelo modelo de visão vem antes de qualquer outra: senão uma lista que cresce troca
    a imagem boa de um item antigo por uma candidata que ninguém revisou."""
    fixas = lista.get("escolha", {})
    res: dict[str, str | None] = {}
    for item in lista["itens"]:
        if item["id"] in fixas:
            res[item["id"]] = f"{item['id']}-{fixas[item['id']]}"
            continue
        # Desempate pela semelhança com o rótulo: o CLIP satura a chance em 1,00 com facilidade.
        boas = [(v.get("revista", False), round(v["p"], 2), v.get("sim", 0), k) for k, v in relatorio.items() if v["id"] == item["id"] and v["ok"] and pode(lista, k)]
        res[item["id"]] = max(boas)[-1] if boas else None
    return res


# ---------------------------------------------------------------- revisar


PERGUNTA = """This drawing should show: {rotulo}.
Look closely at the whole drawing, part by part, and answer:
- o_que_e: what the drawing shows, in a few English words.
- e_o_esperado: true if a person would call it "{rotulo}" at first glance.
- membro_solto: true if a limb, tail, ear, handle or other part floats detached from the body.
- parte_faltando: true if a head, leg, limb or other essential part is missing or cut off.
- partes_soltas: true if there are stray blobs, smudges or extra fragments not attached to anything.
- ambigua: true if it is hard to tell what it is, or the angle hides what it is (for example an animal seen only from behind).
- problemas: short list of the defects you see (empty if none)."""

FORMATO = {
    "type": "object",
    "properties": {
        "o_que_e": {"type": "string"},
        "e_o_esperado": {"type": "boolean"},
        "membro_solto": {"type": "boolean"},
        "parte_faltando": {"type": "boolean"},
        "partes_soltas": {"type": "boolean"},
        "ambigua": {"type": "boolean"},
        "problemas": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["o_que_e", "e_o_esperado", "membro_solto", "parte_faltando", "partes_soltas", "ambigua", "problemas"],
}

DEFEITOS = {"membro_solto": "membro solto", "parte_faltando": "parte faltando", "partes_soltas": "pedaços soltos", "ambigua": "ambígua"}


def veredito(resposta: dict) -> tuple[bool, list[str]]:
    """Passa só sem nenhum defeito e se parecer o que devia."""
    defeitos = [nome for chave, nome in DEFEITOS.items() if resposta.get(chave)]
    if not resposta.get("e_o_esperado"):
        defeitos.insert(0, f"parece {resposta.get('o_que_e') or 'outra coisa'}")
    return not defeitos, defeitos + [str(x) for x in resposta.get("problemas", [])][:3]


def _ollama(caminho: str, corpo: dict, espera: float = 600) -> dict:
    req = urllib.request.Request(f"{OLLAMA}{caminho}", data=json.dumps(corpo).encode("utf-8"), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=espera) as r:
        return json.load(r)


def perguntar_visao(png: pathlib.Path, rotulo: str) -> dict:
    import base64
    import io

    from PIL import Image

    img = Image.open(png).convert("RGB")
    img.thumbnail((768, 768))
    buf = io.BytesIO()
    img.save(buf, "PNG")
    r = _ollama("/api/generate", {
        "model": VISAO, "prompt": PERGUNTA.format(rotulo=rotulo), "images": [base64.b64encode(buf.getvalue()).decode()],
        "format": FORMATO, "stream": False, "think": False, "keep_alive": "10m", "options": {"temperature": 0},
    })
    return json.loads(r["response"])


def descarregar_visao() -> None:
    """Tira o modelo de visão da placa na hora (keep_alive 0)."""
    try:
        _ollama("/api/generate", {"model": VISAO, "keep_alive": 0}, espera=60)
    except Exception as e:
        print(f"não deu para descarregar {VISAO}: {e}", flush=True)


def ler_revisao(out: pathlib.Path) -> dict:
    caminho = out / "revisao.json"
    return json.loads(caminho.read_text(encoding="utf-8")) if caminho.exists() else {}


def revisao_vale(entrada: dict, arquivo: str) -> bool:
    """A revisão guardada vale para o mesmo arquivo, vista pelo mesmo modelo."""
    return entrada.get("arquivo") == arquivo and entrada.get("modelo") == VISAO


def ordem_de_revisao(lista: dict, relatorio: dict, iid: str) -> list[str]:
    """Candidatas de um item na ordem em que seriam escolhidas: a fixada à mão, ou as aprovadas pelo CLIP."""
    fixa = lista.get("escolha", {}).get(iid)
    if fixa is not None:
        return [f"{iid}-{fixa}"]
    boas = [(round(v["p"], 2), v.get("sim", 0), k) for k, v in relatorio.items() if v["id"] == iid and v["ok"] and pode(lista, k)]
    return [k for *_, k in sorted(boas, reverse=True)]


def revisar(lista: dict, so: set[str] | None = None, perguntar=perguntar_visao) -> list[str]:
    """Pergunta ao modelo de visão se a candidata escolhida tem defeito; se tiver, passa para a próxima
    aprovada pelo CLIP. Devolve os itens que ficaram sem nenhuma candidata boa (para refazer)."""
    out = pasta(lista)
    rel = ler_relatorio(out, com_revisao=False)
    rev = ler_revisao(out)
    sem_boa = []
    for item in lista["itens"]:
        if so and item["id"] not in so:
            continue
        fixa = item["id"] in lista.get("escolha", {})
        # Já tem candidata aprovada na revisão: não pergunta de novo nem manda refazer.
        achou = not fixa and any(
            v["id"] == item["id"] and pode(lista, k) and k in rev and rev[k]["ok"] and revisao_vale(rev[k], assinatura(out / f"{k}.png"))
            for k, v in rel.items()
        )
        for k in [] if achou else ordem_de_revisao(lista, rel, item["id"]):
            png = out / f"{k}.png"
            if not png.exists():
                continue
            arquivo = assinatura(png)
            if not (k in rev and revisao_vale(rev[k], arquivo)):
                ok, defeitos = veredito(perguntar(png, item["rotulo"]))
                rev[k] = {"ok": ok, "defeitos": defeitos, "arquivo": arquivo, "modelo": VISAO}
                (out / "revisao.json").write_text(json.dumps(rev, indent=1, ensure_ascii=False), encoding="utf-8", newline="\n")
                print(f"{k}: {'ok' if ok else 'reprovada: ' + '; '.join(defeitos)}", flush=True)
            if rev[k]["ok"]:
                achou = True
                break
            if item["id"] in lista.get("escolha", {}):
                print(f"{k} foi fixada à mão e continua, mesmo reprovada na revisão", flush=True)
                achou = True
        if not achou:
            sem_boa.append(item["id"])
    return sem_boa


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



def salvar_webp(img, destino: pathlib.Path, qualidade: int, limite: int) -> int:
    """Salva em WebP baixando a qualidade até caber no limite (o teste do repositório barra acima de 160 KB)."""
    import io

    for q in range(qualidade, 29, -5):
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=q, method=6)
        if buf.tell() <= limite:
            break
    destino.write_bytes(buf.getvalue())
    return q


def exportar(lista: dict, repo: pathlib.Path, relatorio: dict) -> list[str]:
    from PIL import Image

    out = pasta(lista)
    destino = repo / lista["destino"]
    destino.mkdir(parents=True, exist_ok=True)
    # saida: lado máximo, ou [largura, altura] máximas (o retrato antigo tinha 520 de largura).
    caixa = lista.get("saida", 384)
    caixa = tuple(caixa) if isinstance(caixa, list) else (caixa, caixa)
    limite = lista.get("limite_kb", 150) * 1024
    faltando = []
    medidas: dict[str, list[int]] = {}
    for iid, chave in escolhidas(lista, relatorio).items():
        if not chave:
            faltando.append(iid)
            continue
        img = Image.open(out / f"{chave}.png")
        img = recortar(img) if lista.get("recorte") else img.convert("RGB")
        if lista.get("corte_altura"):
            # Retrato: só da cintura para cima.
            img = img.crop((0, 0, img.width, int(img.height * lista["corte_altura"])))
        img.thumbnail(caixa, Image.LANCZOS)
        salvar_webp(img, destino / f"{iid}.webp", lista.get("qualidade", 72), limite)
        medidas[iid] = [img.width, img.height]
    if not lista.get("medidas", True):
        # Cenários e retratos dos outros jogos não usam medidas; a pasta deles só tem imagens.
        return faltando
    # Largura e altura de cada imagem: os jogos usam para montar a cena sem esperar a imagem carregar.
    (destino / "medidas.json").write_text(json.dumps(dict(sorted(medidas.items())), indent=0) + "\n", encoding="utf-8", newline="\n")
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
            nota = "defeito: " + "; ".join(v["defeitos"]) if v.get("defeitos") else f"1:{v['primeiro']}"
            d.text((x + 2, y + cel + 13), nota[:32], fill="black" if v["ok"] else "red")
        p = out / f"folha-{f // por_folha + 1}{'-x' if so_reprovadas else ''}.jpg"
        sheet.save(p, quality=80)
        folhas.append(p)
    return folhas


# ---------------------------------------------------------------- comandos


def revisar_e_soltar(lista: dict, so: set[str] | None) -> None:
    try:
        revisar(lista, so)
    finally:
        descarregar_visao()


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
    elif cmd == "revisar":
        with Placa(SESSAO, vram_gb=VISAO_VRAM_GB):
            try:
                sem_boa = revisar(lista, set(resto) or None)
            finally:
                descarregar_visao()
        print("sem candidata sem defeito (refazer):", sem_boa or "nenhum")
    elif cmd == "folha":
        rel = ler_relatorio(pasta(lista))
        for p in folha(lista, rel, "x" in resto):
            print(p)
    elif cmd == "exportar":
        rel = ler_relatorio(pasta(lista))
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
            conferir(lista)
            pico("conferir")
            descarregar()
            revisar_e_soltar(lista, set(resto) or None)
            rel = ler_relatorio(pasta(lista))
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
                conferir(lista)
                pico(f"conferir, rodada {rodada}")
                descarregar()
                revisar_e_soltar(lista, faltam)
                rel = ler_relatorio(pasta(lista))
        faltando = exportar(lista, repo, rel)
        print("sem imagem aprovada:", faltando or "nenhum")
        for p in folha(lista, rel):
            print(p)
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
