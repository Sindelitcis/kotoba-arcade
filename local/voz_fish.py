"""Voz dos personagens com o Fish Speech instalado no PC.

Roda com o Python do próprio Fish Speech (ele tem torch e o modelo) e só
LÊ a instalação: os pesos, a voz de referência e o código de narração
(int8, saída só dos tokens de áudio) vêm dos caminhos do config.local.json.
Nada disso é copiado para o repositório.

Atende em 127.0.0.1 (porta fish.url do config): POST /voz {texto, voz} -> wav.
"""
import io
import json
import os
import re
import sys
import threading
import time
from pathlib import Path

sys.dont_write_bytecode = True  # não deixa __pycache__ nas pastas de outros projetos
AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from config import carregar_config  # noqa: E402

CFG = carregar_config()
F = CFG["voz"]["fish"]
if not F.get("motor") or not F.get("modelo"):
    sys.exit("Fish Speech sem configuração: preencha voz.fish em local/config.local.json.")

sys.path.insert(0, F["motor"])
import soundfile as sf  # noqa: E402
import torch  # noqa: E402
import narrador as N  # noqa: E402  (motor de narração dos audiobooks, só importado)
from loguru import logger  # noqa: E402

logger.remove()
logger.add(sys.stderr, level="WARNING")
from fish_speech.conversation import Conversation  # noqa: E402

Conversation.visualize = lambda *a, **k: None

N.MODEL = Path(F["modelo"])
N.OTIMIZAR = {"cabeca", "int8"}
N.LOTE = 1
# Falas curtas: referência (~750 tokens) + frase + uns 10 s de áudio cabem com folga, e o cache gasta menos VRAM.
N.MAX_LEN = int(F.get("max_len", 2048))
N.GEN = dict(N.GEN, max_new_tokens=400)
if not F.get("compilar", True):
    N.decode_one_token = N.decode_one_token_ar  # abre na hora, gera mais devagar

ALGARISMOS = "〇一二三四五六七八九"


def numero_kanji(n: int) -> str:
    # 400 -> 四百, 1200 -> 千二百: o modelo lê algarismo solto como se fosse português.
    if n == 0:
        return "〇"
    out = ""
    for valor, nome in ((10000, "万"), (1000, "千"), (100, "百"), (10, "十")):
        q, n = divmod(n, valor)
        if q:
            out += (numero_kanji(q) if valor == 10000 or q > 1 else "") + nome
    return out + (ALGARISMOS[n] if n else "")


def texto_falado(t: str) -> str:
    t = re.sub(r"[0-9０-９]+", lambda m: numero_kanji(int(m.group().translate(str.maketrans("０１２３４５６７８９", "0123456789")))), t)
    # Colchetes são marcas de controle no S2 Pro ([risada]...): viram parênteses.
    return t.replace("[", "(").replace("]", ")").replace("〜", "").strip()


estado = {"ok": False, "erro": ""}
trava = threading.Lock()
modelo = codec = None
refs = {}


def referencia(nome):
    if nome not in refs:
        v = F["vozes"].get(nome) or F["vozes"]["padrao"]
        refs[nome] = ([Path(v["txt"]).read_text(encoding="utf-8")], [N.encode_audio(Path(v["wav"]), codec, N.DEV).cpu()])
    return refs[nome]


def gerar(texto, voz, seed=1):
    audio = N.decode_to_audio(N.falar(modelo, texto_falado(texto), referencia(voz), seed=seed).to(N.DEV), codec).float().cpu()
    torch.cuda.empty_cache()
    return audio.numpy()


def carregar():
    global modelo, codec
    try:
        t = time.time()
        modelo = N.carregar_modelo()
        codec = N.load_codec_model(N.MODEL / "codec.pth", N.DEV, N.DT)
        print(f"[voz] Fish Speech carregado em {time.time() - t:.0f}s, aquecendo...", flush=True)
        t = time.time()
        gerar("こんにちは。", "padrao")
        print(f"[voz] Fish Speech pronto (aquecimento {time.time() - t:.0f}s)", flush=True)
        estado["ok"] = True
    except Exception as e:  # noqa: BLE001
        estado["erro"] = str(e)
        print(f"[voz] Fish Speech não abriu: {e}", flush=True)


from fastapi import FastAPI, HTTPException, Request  # noqa: E402
from fastapi.responses import Response  # noqa: E402

app = FastAPI()


@app.get("/saude")
def saude():
    return {"ok": estado["ok"], "erro": estado["erro"]}


@app.post("/voz")
async def voz(req: Request):
    if not estado["ok"]:
        raise HTTPException(503, "Fish Speech ainda carregando.")
    dados = await req.json()
    t = time.time()
    with trava:
        audio = gerar(dados["texto"][:200], dados.get("voz", "padrao"), seed=int(dados.get("seed", 1)))
    buf = io.BytesIO()
    sf.write(buf, audio, codec.sample_rate, format="WAV")
    return Response(buf.getvalue(), media_type="audio/wav", headers={"X-Tempo-Ms": str(round((time.time() - t) * 1000))})


if __name__ == "__main__":
    import uvicorn

    threading.Thread(target=carregar, daemon=True).start()
    porta = int(F["url"].rsplit(":", 1)[1])
    uvicorn.run(app, host="127.0.0.1", port=porta, log_level="warning")
