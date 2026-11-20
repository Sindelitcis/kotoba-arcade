"""Grava o português falado na Voz 1 (Fish Speech com o modelo afinado) em public/vozes-pt/voz1/.

Chamado por `npm run vozes-pt:voz1` (scripts/gravar-vozes-pt.mjs), que passa pela trava da placa.
Usa o motor dos audiobooks como está (pesos em int8, dois trechos por vez, o Whisper conferindo
cada fala e refazendo até 3 vezes o que ouviu diferente). Fala de uma ou duas palavras é refeita
uma vez só: sem frase em volta o Whisper erra muito ("Porta." vira "Boa noite."), e cada tentativa
custa uma geração inteira. O que ele ouviu de cada fala fica em --conferidas, e uma gravação
interrompida continua dali. Só lê o motor e a voz de referência: não escreve nada lá.

Os áudios vão para o site; a voz de referência e os pesos do modelo nunca (tests/vozes-pt.test.ts
confere). Todo mp3 leva o comentário "kotoba-voz-1".
"""
import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
import time
import warnings
from pathlib import Path

MARCA = "kotoba-voz-1"
CURTA = 3  # menos palavras que isto: uma tentativa a mais, no máximo


def mp3(wav_np, sr, destino: Path):
    import soundfile as sf

    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "a.wav"
        sf.write(wav, wav_np, sr)
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
    ap.add_argument("--motor", required=True, help="pasta do motor dos audiobooks (narrador.py)")
    ap.add_argument("--referencia", required=True, help="nome da voz de referência no motor (sem extensão)")
    ap.add_argument("--conferidas", required=True)
    ap.add_argument("--lote", type=int, default=2)
    args = ap.parse_args()

    saida = Path(args.saida)
    saida.mkdir(parents=True, exist_ok=True)
    falas = json.loads(Path(args.falas).read_text(encoding="utf-8"))["falas"]
    manifesto_path = saida / "manifesto.json"
    antigo = json.loads(manifesto_path.read_text(encoding="utf-8"))["falas"] if manifesto_path.exists() else {}

    conferidas_path = Path(args.conferidas)
    conferidas = json.loads(conferidas_path.read_text(encoding="utf-8")) if conferidas_path.exists() else {}
    novo = {}
    pendentes = []
    for f in falas:
        arquivo = hashlib.sha1(f"{args.referencia}|{f['texto']}".encode("utf-8")).hexdigest()[:16] + ".mp3"
        novo[f["texto"]] = arquivo
        if not ((antigo.get(f["texto"]) == arquivo or arquivo in conferidas) and (saida / arquivo).exists()):
            pendentes.append((f, arquivo))
    print(f"{len(falas)} falas, {len(pendentes)} para gravar.", flush=True)

    if pendentes:
        sys.path.insert(0, str(Path(args.motor)))
        warnings.filterwarnings("ignore")
        import narrador as N
        from loguru import logger
        from fish_speech.conversation import Conversation

        logger.remove()
        logger.add(sys.stderr, level="WARNING")
        Conversation.visualize = lambda *a, **k: None
        N.OTIMIZAR.add("int8")
        N.LOTE = max(1, args.lote)
        t0 = time.time()
        model = N.carregar_modelo()
        codec = N.load_codec_model(N.MODEL / "codec.pth", N.DEV, N.DT)
        ref = N.referencia(codec, args.referencia)
        print(f"modelo carregado em {time.time() - t0:.0f}s", flush=True)
        if N.LOTE > 1 and not N.autoteste(model, ref):
            N.LOTE = 1
        conferente = N.Conferente()
        sr = codec.sample_rate
        seed = 42
        passo = max(N.LOTE, 1)
        for i in range(0, len(pendentes), passo):
            grupo = pendentes[i:i + passo]
            textos = [f["texto"] for f, _ in grupo]
            audios = N.gerar_varios(model, codec, ref, textos, seed)
            confs = [conferente.enviar(t, a, sr) for t, a in zip(textos, audios)]
            for (f, arquivo), audio, conf in zip(grupo, audios, confs):
                erros, ouvido, _ = conf.result()
                tentativa = 0
                limite = N.REFAZER if len(f["texto"].split()) >= CURTA else 1
                while erros >= 2 and tentativa < limite:
                    tentativa += 1
                    outro = N.gerar(model, codec, ref, f["texto"], seed + 1000 * tentativa)
                    e2, o2, _ = conferente.enviar(f["texto"], outro, sr).result()
                    if e2 < erros:
                        audio, erros, ouvido = outro, e2, o2
                mp3(audio.numpy(), sr, saida / arquivo)
                conferidas[arquivo] = {"texto": f["texto"], "ouvido": ouvido, "erros": erros, "tentativas": tentativa + 1, "origem": f["origem"]}
            conferidas_path.write_text(json.dumps(conferidas, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"[{min(i + passo, len(pendentes))}/{len(pendentes)}] {textos[0][:60]}", flush=True)

    usados = set(novo.values())
    for velho in saida.glob("*.mp3"):
        if velho.name not in usados:
            velho.unlink()
    manifesto_path.write_text(
        json.dumps({"versao": 1, "voz": "voz1", "falas": dict(sorted(novo.items()))}, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    duvidas = [c for a, c in conferidas.items() if a in usados and c["erros"] >= 2]
    Path(args.duvidas).write_text(json.dumps(duvidas, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"pronto: {len(pendentes)} gravadas, {len(duvidas)} em dúvida (veja {args.duvidas})", flush=True)


if __name__ == "__main__":
    main()
