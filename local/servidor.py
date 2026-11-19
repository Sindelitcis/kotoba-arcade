"""Servidor local da Conversa por voz do Kotoba Arcade.

Junta em http://127.0.0.1:8791 as três peças que o jogo usa:
  /ouvir     fala em japonês -> texto (Whisper, pelo faster-whisper)
  /conversa  o modelo que faz o personagem (Ollama)
  /voz       texto -> fala em japonês (VOICEVOX ou Fish Speech)
e mais /leitura (separa a frase em palavras com a leitura, para o furigana)
e /saude (o que está ligado).

Só atende a própria máquina. Quem sobe tudo é `npm run local` (local/iniciar.mjs).
"""
import io
import os
import re
import sys
import threading
import time
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from config import carregar_config  # noqa: E402


CFG = carregar_config()
app = FastAPI(title="Kotoba Arcade: conversa local")
# Só páginas abertas nesta máquina podem chamar: um site qualquer não consegue usar o modelo nem o microfone daqui.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$",
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
http = httpx.Client(timeout=120)

# ---------------------------------------------------------------- fala -> texto

_whisper = {"modelo": None, "estado": "carregando", "onde": ""}
_whisper_trava = threading.Lock()


def _dlls_nvidia():
    # O ctranslate2 precisa achar cuBLAS e cuDNN, que vêm nos pacotes nvidia-* do pip.
    for base in map(Path, sys.path):
        for sub in ("nvidia/cublas/bin", "nvidia/cudnn/bin", "nvidia/cuda_nvrtc/bin"):
            d = base / sub
            if d.is_dir():
                os.add_dll_directory(str(d))
                os.environ["PATH"] = str(d) + os.pathsep + os.environ["PATH"]


def _carregar_whisper():
    from faster_whisper import WhisperModel

    nome = CFG["fala"]["modelo"]
    onde = CFG["fala"]["dispositivo"]
    tentativas = [("cuda", "float16"), ("cpu", "int8")] if onde == "auto" else [(onde, "float16" if onde == "cuda" else "int8")]
    for dev, tipo in tentativas:
        try:
            if dev == "cuda":
                _dlls_nvidia()
            m = WhisperModel(nome, device=dev, compute_type=tipo, cpu_threads=6)
            # Uma transcrição de aquecimento: é aqui que uma GPU sem as DLLs certas falha.
            import numpy as np
            list(m.transcribe(np.zeros(16000, dtype="float32"), language="ja")[0])
            _whisper.update(modelo=m, estado="ok", onde=dev)
            print(f"[fala] Whisper {nome} pronto ({dev})", flush=True)
            return
        except Exception as e:  # noqa: BLE001
            print(f"[fala] Whisper em {dev} não abriu: {e}", flush=True)
    _whisper["estado"] = "erro"


threading.Thread(target=_carregar_whisper, daemon=True).start()

# Frases que o Whisper inventa quando só ouve silêncio ou ruído.
ALUCINACOES = re.compile(r"ご視聴ありがとうございました|チャンネル登録|字幕|おやすみなさい。?$^")


@app.post("/ouvir")
async def ouvir(req: Request, dica: str = ""):
    if _whisper["estado"] != "ok":
        raise HTTPException(503, "O reconhecimento de fala ainda está carregando.")
    audio = await req.body()
    if len(audio) < 1000:
        return {"texto": "", "ms": 0}
    t = time.time()
    with _whisper_trava:
        segs, _ = _whisper["modelo"].transcribe(
            io.BytesIO(audio), language="ja", beam_size=5, vad_filter=True,
            condition_on_previous_text=False, initial_prompt=dica[:200] or None,
        )
        texto = "".join(s.text for s in segs if s.no_speech_prob < 0.8).strip()
    if ALUCINACOES.search(texto):
        texto = ""
    return {"texto": texto, "ms": round((time.time() - t) * 1000)}


# ---------------------------------------------------------------- conversa

@app.post("/conversa")
async def conversa(req: Request):
    dados = await req.json()
    c = CFG["conversa"]
    corpo = {
        "model": c["modelo"],
        "messages": dados["mensagens"],
        "format": dados.get("esquema") or "json",
        "stream": False,
        "think": False,
        "keep_alive": "30m",
        "options": {"temperature": 0.7, "num_ctx": 4096, "num_predict": 400},
    }
    t = time.time()
    try:
        r = http.post(c["ollama"] + "/api/chat", json=corpo)
        r.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(503, f"O Ollama não respondeu: {e}") from e
    return {"texto": r.json()["message"]["content"], "ms": round((time.time() - t) * 1000)}


def _modelo_no_ollama():
    c = CFG["conversa"]
    try:
        nomes = [m["name"] for m in http.get(c["ollama"] + "/api/tags", timeout=3).json()["models"]]
        return c["modelo"] in nomes or c["modelo"] + ":latest" in nomes
    except Exception:  # noqa: BLE001
        return False


# ---------------------------------------------------------------- leitura (furigana)

_tagger = None


@app.post("/leitura")
async def leitura(req: Request):
    global _tagger
    if _tagger is None:
        import fugashi
        _tagger = fugashi.Tagger()
    texto = (await req.json())["texto"][:400]
    tokens = []
    for w in _tagger(texto):
        kana = getattr(w.feature, "kana", None)
        tokens.append({"t": (w.white_space or "") + w.surface, **({"r": kana} if kana and kana != "*" else {})})
    resto = texto[len("".join(t["t"] for t in tokens)):]
    if resto:
        tokens.append({"t": resto})
    return {"tokens": tokens}


# ---------------------------------------------------------------- texto -> fala

def _voz_voicevox(texto, voz):
    v = CFG["voz"]["voicevox"]
    falante = v["vozes"].get(voz, v["vozes"]["padrao"])
    q = http.post(v["url"] + "/audio_query", params={"text": texto, "speaker": falante})
    q.raise_for_status()
    consulta = q.json()
    consulta["speedScale"] = v.get("velocidade", 0.9)
    consulta["prePhonemeLength"] = 0.05
    r = http.post(v["url"] + "/synthesis", params={"speaker": falante}, json=consulta)
    r.raise_for_status()
    return r.content


def _voz_fish(texto, voz):
    r = http.post(CFG["voz"]["fish"]["url"] + "/voz", json={"texto": texto, "voz": voz})
    r.raise_for_status()
    return r.content


MOTORES = {"voicevox": _voz_voicevox, "fish": _voz_fish}


def _motor_vivo():
    motor = CFG["voz"]["motor"]
    try:
        if motor == "voicevox":
            return http.get(CFG["voz"]["voicevox"]["url"] + "/version", timeout=2).status_code == 200
        if motor == "fish":
            return http.get(CFG["voz"]["fish"]["url"] + "/saude", timeout=2).json().get("ok") is True
    except Exception:  # noqa: BLE001
        pass
    return False


@app.post("/voz")
async def voz(req: Request):
    dados = await req.json()
    texto = dados["texto"].strip()[:200]
    if not texto:
        raise HTTPException(400, "Sem texto.")
    motor = CFG["voz"]["motor"]
    if motor not in MOTORES:
        raise HTTPException(503, "Sem motor de voz: o jogo usa a voz do navegador.")
    t = time.time()
    try:
        wav = MOTORES[motor](texto, dados.get("voz", "padrao"))
    except httpx.HTTPError as e:
        raise HTTPException(503, f"O motor de voz ({motor}) não respondeu: {e}") from e
    return Response(wav, media_type="audio/wav", headers={"X-Tempo-Ms": str(round((time.time() - t) * 1000))})


# ---------------------------------------------------------------- saúde

@app.get("/saude")
def saude():
    return {
        "ok": True,
        "conversa": {"ok": _modelo_no_ollama(), "modelo": CFG["conversa"]["modelo"]},
        "fala": {"ok": _whisper["estado"] == "ok", "estado": _whisper["estado"], "modelo": CFG["fala"]["modelo"], "onde": _whisper["onde"]},
        "voz": {"ok": _motor_vivo(), "motor": CFG["voz"]["motor"]},
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(CFG["porta"]), log_level="warning")
