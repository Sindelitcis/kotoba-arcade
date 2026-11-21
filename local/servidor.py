"""Servidor local da Conversa por voz do Kotoba Arcade.

Junta em http://127.0.0.1:8791 as três peças que o jogo usa:
  /ouvir     fala em japonês -> texto (Whisper, pelo faster-whisper)
  /conversa  o modelo que faz o personagem (Ollama)
  /voz       texto -> fala em japonês (AivisSpeech ou VOICEVOX)
e mais /leitura (separa a frase em palavras com a leitura, para o furigana)
e /saude (o que está ligado).

Só atende a própria máquina: páginas abertas em localhost e o site publicado (config "origens"),
que no Chrome e no Brave chega aqui pelo Private Network Access (local/guarda.py).
Quem sobe tudo é `npm run local` ou o link kotoba-local:// do site (local/iniciar.mjs).

Antes de pôr qualquer coisa na placa de vídeo, o servidor prende a trava dela (scripts/placa.py). Se
outro programa está com a placa, ele não carrega nada, avisa no /saude e tenta de novo a cada 30 s:
o jogo usa a nuvem enquanto isso.
"""
import asyncio
import io
import os
import re
import sys
import threading
import time
from pathlib import Path

import httpx
from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.responses import Response

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from config import carregar_config  # noqa: E402
from guarda import Guarda, origens_do_config  # noqa: E402

sys.path.insert(0, str(AQUI.parent / "scripts"))
from placa import Ocupada, Placa  # noqa: E402


CFG = carregar_config()
app = FastAPI(title="Kotoba Arcade: conversa local")
# Rotas que gastam a placa: só elas contam como uso para o desligamento por ociosidade (iniciar.mjs).
ROTAS_DE_USO = {"/ouvir", "/conversa", "/voz", "/leitura"}
_uso = {"ultimo": time.time()}


def _marcar_uso(path):
    if path in ROTAS_DE_USO:
        _uso["ultimo"] = time.time()


# Só páginas abertas nesta máquina e o site publicado podem chamar: um site qualquer não usa o modelo daqui.
app.add_middleware(Guarda, porta=int(CFG["porta"]), origens=origens_do_config(CFG), ao_usar=_marcar_uso)
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

    def transcrever():
        with _whisper_trava:
            segs, _ = _whisper["modelo"].transcribe(
                io.BytesIO(audio), language="ja", beam_size=5, vad_filter=True,
                condition_on_previous_text=False, initial_prompt=dica[:200] or None,
            )
            return "".join(s.text for s in segs if s.no_speech_prob < 0.8).strip()

    # Fora do laço de eventos: enquanto transcreve, as outras rotas continuam respondendo.
    texto = await asyncio.to_thread(transcrever)
    if ALUCINACOES.search(texto):
        texto = ""
    return {"texto": texto, "ms": round((time.time() - t) * 1000)}


# ---------------------------------------------------------------- conversa

# As rotas que esperam outro programa são `def` comuns: o FastAPI roda cada uma numa thread e o servidor
# não trava enquanto o modelo pensa.
@app.post("/conversa")
def conversa(dados: dict = Body(...)):
    c = CFG["conversa"]
    corpo = {
        "model": c["modelo"],
        "messages": dados["mensagens"],
        "format": dados.get("esquema") or "json",
        "stream": False,
        "think": False,
        # O modelo do PC é reserva da nuvem: sobe só quando chamado e sai da placa depois de um tempo parado.
        "keep_alive": c.get("keep_alive", "5m"),
        "options": {"temperature": 0.7, "num_ctx": 4096, "num_predict": 400},
    }
    t = time.time()
    try:
        r = http.post(c["ollama"] + "/api/chat", json=corpo)
        r.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(503, f"O Ollama não respondeu: {e}") from e
    return {"texto": r.json()["message"]["content"], "ms": round((time.time() - t) * 1000)}


_modelo = {"pronto": False, "erro": ""}


def _conferir_modelo():
    # Só confere que o modelo existe no Ollama, sem carregar na placa: no site publicado o texto vem
    # primeiro da nuvem, e o modelo do PC só sobe se ela falhar (a primeira resposta dele demora mais).
    c = CFG["conversa"]
    for _ in range(60):
        try:
            r = http.post(c["ollama"] + "/api/show", json={"model": c["modelo"]}, timeout=10)
            if r.status_code == 404:
                _modelo["erro"] = f"o modelo {c['modelo']} não está no Ollama (ollama pull {c['modelo']})"
                print(f"[conversa] {_modelo['erro']}", flush=True)
                return
            r.raise_for_status()
            _modelo["pronto"] = True
            print(f"[conversa] {c['modelo']} disponível (sobe na placa quando for usado)", flush=True)
            threading.Thread(target=_ler_do_disco, args=(r.json().get("modelfile", ""),), daemon=True).start()
            return
        except httpx.HTTPError:
            time.sleep(2)  # o Ollama ainda está abrindo


def _ler_do_disco(modelfile: str):
    """Lê os arquivos do modelo uma vez, para o Windows guardar no cache de disco (RAM, não placa).

    Medido: com o arquivo fora do cache, o Ollama leva 35 s para subir o modelo na primeira reserva;
    com ele no cache, 5 s. Assim a conversa não fica parada quando a nuvem falha.
    """
    t = time.time()
    total = 0
    for linha in modelfile.splitlines():
        caminho = Path(linha[5:].strip()) if linha.startswith("FROM ") else None
        if not caminho or not caminho.is_file():
            continue
        with open(caminho, "rb", buffering=0) as f:
            while bloco := f.read(16 * 1024 * 1024):
                total += len(bloco)
    if total:
        print(f"[conversa] modelo lido do disco ({total / 1e9:.1f} GB em {time.time() - t:.0f} s): a reserva sobe rápido", flush=True)


# ---------------------------------------------------------------- placa de vídeo

_placa = {"ok": False, "motivo": "abrindo"}
_trava = []


def _prender_placa():
    """Prende a placa e só então carrega o Whisper e confere o modelo de conversa. Ocupada: tenta de novo a cada 30 s."""
    vram = float((CFG.get("placa") or {}).get("vram_gb", 0))
    while True:
        try:
            trava = Placa("conversa-local (Conversa por voz no PC)", vram_gb=vram, esperar=False)
            trava.__enter__()
        except Ocupada as e:
            if _placa["motivo"] != str(e):
                print(f"[placa] ocupada ({e}): o jogo usa a nuvem até ela ficar livre", flush=True)
            _placa.update(ok=False, motivo=str(e))
            time.sleep(30)
            continue
        _trava.append(trava)  # fica presa até o processo terminar; o sistema solta sozinho
        _placa.update(ok=True, motivo="")
        print("[placa] presa para a Conversa", flush=True)
        threading.Thread(target=_carregar_whisper, daemon=True).start()
        threading.Thread(target=_conferir_modelo, daemon=True).start()
        return


threading.Thread(target=_prender_placa, daemon=True).start()


# ---------------------------------------------------------------- leitura (furigana)

_tagger = None


@app.post("/leitura")
def leitura(dados: dict = Body(...)):
    global _tagger
    if _tagger is None:
        import fugashi
        _tagger = fugashi.Tagger()
    texto = dados["texto"][:400]
    tokens = []
    for w in _tagger(texto):
        kana = getattr(w.feature, "kana", None)
        if w.surface == "私" and kana == "ワタクシ":
            kana = "ワタシ"  # o dicionário dá a leitura formal; numa conversa comum é わたし
        tokens.append({"t": (w.white_space or "") + w.surface, **({"r": kana} if kana and kana != "*" else {})})
    resto = texto[len("".join(t["t"] for t in tokens)):]
    if resto:
        tokens.append({"t": resto})
    return {"tokens": tokens}


# ---------------------------------------------------------------- texto -> fala

def _voz_api(motor):
    """VOICEVOX e AivisSpeech têm a mesma API (/audio_query e /synthesis)."""

    def falar(texto, voz):
        v = CFG["voz"][motor]
        falante = v["vozes"].get(voz, v["vozes"]["padrao"])
        q = http.post(v["url"] + "/audio_query", params={"text": texto, "speaker": falante})
        q.raise_for_status()
        consulta = q.json()
        consulta["speedScale"] = v.get("velocidade", 1.0)
        consulta["prePhonemeLength"] = 0.05
        r = http.post(v["url"] + "/synthesis", params={"speaker": falante}, json=consulta)
        r.raise_for_status()
        return r.content

    return falar


MOTORES = {"aivis": _voz_api("aivis"), "voicevox": _voz_api("voicevox")}


def _motor_vivo():
    motor = CFG["voz"]["motor"]
    try:
        if motor in MOTORES:
            return http.get(CFG["voz"][motor]["url"] + "/version", timeout=0.5).status_code == 200
    except Exception:  # noqa: BLE001
        pass
    return False


@app.post("/voz")
def voz(dados: dict = Body(...)):
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
        "placa": dict(_placa),
        "ocioso_s": round(time.time() - _uso["ultimo"]),
        "conversa": {"ok": _modelo["pronto"], "modelo": CFG["conversa"]["modelo"], "erro": _modelo["erro"]},
        "fala": {"ok": _whisper["estado"] == "ok", "estado": _whisper["estado"], "modelo": CFG["fala"]["modelo"], "onde": _whisper["onde"]},
        "voz": {"ok": _motor_vivo(), "motor": CFG["voz"]["motor"]},
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(CFG["porta"]), log_level="warning")
