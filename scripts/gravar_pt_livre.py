"""Grava o português das aulas na voz livre (Kokoro-82M, voz pf_dora, Apache-2.0).

Chamado por `npm run aulas:livre` (scripts/gravar-aulas.mjs), que monta a lista de falas e
prende a placa: o Kokoro roda na CPU, o Whisper que confere roda na placa (na CPU, cada
fala levava mais de um minuto de processador).
Para cada texto: gera, confere com o Whisper (o que ele ouviu bate com o texto?), refaz com
outra velocidade se errou, corta o silêncio das pontas, normaliza o volume e grava mp3 em
`public/vozes-pt/` com o `manifesto.json`. O que continuar em dúvida vai para --duvidas.

Todo arquivo leva o comentário "kotoba-voz-livre" nos metadados: tests/voz-local.test.ts usa
isso para garantir que nenhuma gravação da voz do PC entre no repositório.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

import numpy as np
import soundfile as sf

def _dlls():
    """O ctranslate2 do Whisper precisa achar as DLLs de CUDA instaladas pelo pip."""
    base = Path(sys.prefix) / "Lib" / "site-packages" / "nvidia"
    for sub in ("cublas", "cudnn"):
        pasta = base / sub / "bin"
        if pasta.is_dir():
            os.add_dll_directory(str(pasta))
            os.environ["PATH"] = str(pasta) + os.pathsep + os.environ["PATH"]


VOZ = "pf_dora"
VELOCIDADES = (0.95, 0.9, 1.0)
MARCA = "kotoba-voz-livre"


def palavras(t: str) -> list[str]:
    from num2words import num2words

    t = unicodedata.normalize("NFKD", t.lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"\d+", lambda m: " " + num2words(int(m.group()), lang="pt_BR") + " ", t)
    return re.sub(r"[^\w\s]", " ", t).split()


def erros(esperado: str, ouvido: str) -> int:
    import difflib

    a, b = palavras(esperado), palavras(ouvido)
    n = 0
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op != "equal":
            n += max(i2 - i1, j2 - j1)
    return n


def mp3(audio: np.ndarray, sr: int, destino: Path):
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "a.wav"
        sf.write(wav, audio, sr)
        filtro = (
            "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,"
            "areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1,areverse,"
            "loudnorm=I=-18:TP=-1.5:LRA=11,aresample=24000"
        )
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-af", filtro, "-ac", "1",
             "-c:a", "libmp3lame", "-b:a", "48k", "-metadata", f"comment={MARCA}", str(destino)],
            check=True,
        )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--falas", required=True)
    ap.add_argument("--saida", required=True)
    ap.add_argument("--duvidas", required=True)
    ap.add_argument("--conferidas", required=True, help="json com o que o Whisper já ouviu (retoma de onde parou)")
    ap.add_argument("--whisper", default="mobiuslabsgmbh/faster-whisper-large-v3-turbo")
    ap.add_argument("--cpu", action="store_true", help="Whisper na CPU (bem mais lento)")
    args = ap.parse_args()
    if not args.cpu:
        _dlls()

    from faster_whisper import WhisperModel
    from kokoro import KPipeline
    import librosa

    falas = json.loads(Path(args.falas).read_text(encoding="utf-8"))["falas"]
    saida = Path(args.saida)
    saida.mkdir(parents=True, exist_ok=True)
    manifesto_path = saida / "manifesto.json"
    antigo = json.loads(manifesto_path.read_text(encoding="utf-8"))["falas"] if manifesto_path.exists() else {}

    pipe = KPipeline(lang_code="p", repo_id="hexgrad/Kokoro-82M", device="cpu")
    asr = (WhisperModel(args.whisper, device="cpu", compute_type="int8", cpu_threads=8) if args.cpu
           else WhisperModel(args.whisper, device="cuda", compute_type="float16"))
    conferidas_path = Path(args.conferidas)
    conferidas = json.loads(conferidas_path.read_text(encoding="utf-8")) if conferidas_path.exists() else {}

    novo, feitas, refeitas = {}, 0, 0
    for i, f in enumerate(falas):
        texto = f["texto"]
        arquivo = hashlib.sha1(f"{VOZ}|{texto}".encode("utf-8")).hexdigest()[:16] + ".mp3"
        novo[texto] = arquivo
        if (antigo.get(texto) == arquivo or arquivo in conferidas) and (saida / arquivo).exists():
            continue
        melhor = None
        for k, vel in enumerate(VELOCIDADES):
            audio = np.concatenate([np.asarray(a) for _, _, a in pipe(texto, voice=VOZ, speed=vel)])
            y16 = librosa.resample(audio.astype(np.float32), orig_sr=24000, target_sr=16000)
            segs = asr.transcribe(y16, language="pt", beam_size=5, vad_filter=True, condition_on_previous_text=False)[0]
            ouvido = " ".join(s.text.strip() for s in segs)
            e = erros(texto, ouvido)
            if melhor is None or e < melhor[0]:
                melhor = (e, audio, ouvido)
            if e < 2:
                break
            refeitas += 1
        e, audio, ouvido = melhor
        mp3(audio, 24000, saida / arquivo)
        conferidas[arquivo] = {"texto": texto, "ouvido": ouvido, "erros": e, "origem": f["origem"]}
        conferidas_path.write_text(json.dumps(conferidas, ensure_ascii=False, indent=1), encoding="utf-8")
        feitas += 1
        print(f"[{i + 1}/{len(falas)}] erros {e}: {texto[:60]}", flush=True)

    usados = set(novo.values())
    for velho in saida.glob("*.mp3"):
        if velho.name not in usados:
            velho.unlink()
    manifesto_path.write_text(
        json.dumps({"versao": 1, "voz": f"kokoro-{VOZ}", "falas": dict(sorted(novo.items()))}, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    duvidas = [c for a, c in conferidas.items() if a in usados and c["erros"] >= 2]
    Path(args.duvidas).write_text(json.dumps(duvidas, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"gravadas {feitas}, refeitas {refeitas}, em dúvida {len(duvidas)} (veja {args.duvidas})")


if __name__ == "__main__":
    sys.exit(main())
