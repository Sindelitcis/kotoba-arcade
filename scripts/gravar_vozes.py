"""Grava as falas fixas dos jogos (AivisSpeech e VOICEVOX). Chamado por gravar-vozes.mjs.

Para cada fala:
1. Monta o texto do motor palavra por palavra: com kanji, que acerta mais leitura e
   acento; a palavra que o motor lê errado pelo kanji (日本人 = ニッポンジン) vai em kana.
2. Palavra solta: confere o acento na Kanjium (CC BY-SA 4.0) e corrige se o motor errou.
3. Sintetiza, corta silêncio, normaliza o volume e grava mp3 mono.
4. Confere com o Whisper: se o que ele ouve não bate com a leitura, tenta de novo
   com mais silêncio em volta e fica com a melhor versão.

Arquivos já gravados (mesmo texto, mesma voz, mesma entrada) não são refeitos.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

VERSAO = 2
PONTUACAO = set("、。？！?!.,　 ・「」『』…'")


def _dlls():
    """O ctranslate2 do Whisper precisa achar as DLLs de CUDA instaladas pelo pip."""
    base = Path(sys.prefix) / "Lib" / "site-packages" / "nvidia"
    for sub in ("cublas", "cudnn"):
        pasta = base / sub / "bin"
        if pasta.is_dir():
            os.add_dll_directory(str(pasta))
            os.environ["PATH"] = str(pasta) + os.pathsep + os.environ["PATH"]


_dlls()
import pyopenjtalk  # noqa: E402
from faster_whisper import WhisperModel  # noqa: E402

VOGAL = {}
for vogal, linha in (("ア", "アカサタナハマヤラワガザダバパァャヮ"), ("イ", "イキシチニヒミリギジヂビピィ"),
                     ("ウ", "ウクスツヌフムユルグズヅブプゥュヴ"), ("エ", "エケセテネヘメレゲゼデベペェ"),
                     ("オ", "オコソトノホモヨロヲゴゾドボポォョ")):
    for c in linha:
        VOGAL[c] = vogal


def limpar(kana: str) -> str:
    """Forma comparável de uma leitura: katakana, sem pontuação, ヲ = オ e vogal longa
    escrita sempre igual (とう, とー e トオ viram トオ; せい e せー viram セエ)."""
    out = []
    for c in kana:
        if "ぁ" <= c <= "ゖ":
            c = chr(ord(c) + 0x60)
        if c in PONTUACAO:
            continue
        if c == "ヲ":
            c = "オ"
        anterior = VOGAL.get(out[-1]) if out else None
        if c == "ー" and anterior:
            c = anterior
        elif (c == "ウ" and anterior == "オ") or (c == "イ" and anterior == "エ"):
            c = anterior
        out.append(c)
    return "".join(out)


def pronuncia(texto: str) -> str:
    """Como o OpenJTalk pronuncia (は partícula vira ワ etc.), na forma de `limpar`."""
    return limpar(pyopenjtalk.g2p(texto, kana=True))


def moras(consulta: dict) -> str:
    return limpar("".join(m["text"] for ap in consulta["accent_phrases"] for m in ap["moras"]))


def hira(s: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)


class Motor:
    def __init__(self, base: str, voicevox: bool = False):
        self.base = base.rstrip("/")
        self.voicevox = voicevox
        self._leituras = {}

    def _req(self, path, params, body=None, raw=False):
        url = f"{self.base}{path}?{urllib.parse.urlencode(params)}"
        data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(url, data=data, method="POST", headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=300) as r:
            out = r.read()
        return out if raw else json.loads(out.decode("utf-8"))

    def consulta(self, texto: str, estilo: int) -> dict:
        return self._req("/audio_query", {"text": texto, "speaker": estilo})

    def leitura(self, texto: str, estilo: int) -> str:
        chave = (texto, estilo)
        if chave not in self._leituras:
            self._leituras[chave] = moras(self.consulta(texto, estilo))
        return self._leituras[chave]

    def texto_do_motor(self, partes: list, estilo: int, avisos: list) -> str:
        """Junta as partes; a que o motor lê diferente da leitura certa vai em kana.
        Mandar a frase inteira em kana erra mais: o は de はなします vira partícula."""
        out = []
        for p in partes:
            r = p.get("r")
            if r and self.leitura(p["t"], estilo) != limpar(r):
                avisos.append({"palavra": p["t"], "motor": self.leitura(p["t"], estilo), "certo": limpar(r)})
                out.append(r)
            else:
                out.append(p["t"])
        return "".join(out)

    def recalcular_tom(self, consulta: dict, estilo: int) -> None:
        """O VOICEVOX guarda a altura de cada mora: depois de mudar o acento, pede de novo.
        O AivisSpeech tira a altura do acento sozinho."""
        if self.voicevox:
            consulta["accent_phrases"] = self._req("/mora_pitch", {"speaker": estilo}, body=consulta["accent_phrases"])

    def sintese(self, consulta: dict, estilo: int) -> bytes:
        return self._req("/synthesis", {"speaker": estilo}, body=consulta, raw=True)


def cer(ref: str, hyp: str) -> float:
    if not ref:
        return 0.0
    ant = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        cur = [i]
        for j, h in enumerate(hyp, 1):
            cur.append(min(ant[j] + 1, cur[j - 1] + 1, ant[j - 1] + (r != h)))
        ant = cur
    return ant[-1] / len(ref)


def carregar_kanjium(caminho: str) -> dict:
    acentos = {}
    if not Path(caminho).exists():
        return acentos
    for linha in Path(caminho).read_text(encoding="utf-8").splitlines():
        partes = linha.split("\t")
        if len(partes) >= 3:
            acentos[(partes[0], partes[1])] = [int(x) for x in partes[2].split(",") if x.strip().isdigit()]
    return acentos


def processar(wav: bytes, destino: Path) -> None:
    """Corta silêncio nas pontas, normaliza a altura (-18 LUFS) e grava mp3 mono 24 kHz."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as t:
        t.write(wav)
        bruto = t.name
    filtro = (
        "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,"
        "areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.12,areverse,"
        "loudnorm=I=-18:TP=-1.5:LRA=11"
    )
    try:
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", bruto, "-af", filtro, "-ac", "1", "-ar", "24000",
             "-c:a", "libmp3lame", "-b:a", "48k", str(destino)],
            check=True,
        )
    finally:
        os.unlink(bruto)


def corrigir_acento(f: dict, consulta: dict, motor: Motor, estilo: int, kanjium: dict, rel: dict) -> None:
    p = f.get("palavra")
    if not p or len(consulta["accent_phrases"]) != 1:
        return
    frase = consulta["accent_phrases"][0]
    total = len(frase["moras"])
    certos = kanjium.get((p["jp"], hira(p["kana"]))) or kanjium.get((p["kana"], hira(p["kana"])))
    if not certos:
        return
    validos = [total if a == 0 else a for a in certos if a <= total]
    if validos and frase["accent"] not in validos:
        rel["acento_corrigido"].append({"palavra": p["jp"], "kana": p["kana"], "motor": frase["accent"], "kanjium": certos})
        frase["accent"] = validos[0]
        motor.recalcular_tom(consulta, estilo)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--falas", required=True)
    ap.add_argument("--saida", required=True)
    ap.add_argument("--aivis", required=True)
    ap.add_argument("--voicevox", required=True)
    ap.add_argument("--kanjium", required=True)
    ap.add_argument("--relatorio", required=True)
    ap.add_argument("--whisper", default="mobiuslabsgmbh/faster-whisper-large-v3-turbo")
    ap.add_argument("--refazer", action="store_true", help="grava tudo de novo")
    args = ap.parse_args()

    dados = json.loads(Path(args.falas).read_text(encoding="utf-8"))
    vozes, falas = dados["vozes"], dados["falas"]
    saida = Path(args.saida)
    saida.mkdir(parents=True, exist_ok=True)
    motores = {"aivis": Motor(args.aivis), "voicevox": Motor(args.voicevox, voicevox=True)}
    kanjium = carregar_kanjium(args.kanjium)
    whisper = WhisperModel(args.whisper, device="cuda", compute_type="float16")

    manifesto = {}
    usados = set()
    rel = {"total": len(falas), "gravadas": 0, "ja_existiam": 0, "palavra_em_kana": [], "acento_corrigido": [],
           "whisper_divergente": [], "whisper_refeitas": 0, "sem_conferir": 0}
    for n, f in enumerate(falas, 1):
        if n % 50 == 0:
            print(f"{n}/{len(falas)}", flush=True)
        voz = vozes[f["voz"]]
        partes = "|".join(f"{p['t']}={p.get('r', '')}" for p in f["partes"])
        chave = f"{VERSAO}\n{f['voz']}\n{f['texto']}\n{partes}"
        arquivo = hashlib.sha1(chave.encode("utf-8")).hexdigest()[:16] + ".mp3"
        manifesto.setdefault(f["texto"], {})[f["voz"]] = arquivo
        usados.add(arquivo)
        destino = saida / arquivo
        if destino.exists() and not args.refazer:
            rel["ja_existiam"] += 1
            continue

        estilo = voz["estilo"]
        motor = motores[voz["motor"]]
        avisos = []
        consulta = motor.consulta(motor.texto_do_motor(f["partes"], estilo, avisos), estilo)
        rel["palavra_em_kana"] += [{"texto": f["texto"], **a} for a in avisos]
        corrigir_acento(f, consulta, motor, estilo, kanjium, rel)

        if f["origem"].startswith("kana/"):
            # Kana solto: o Whisper não reconhece uma mora sozinha, então não dá para conferir.
            processar(motor.sintese(consulta, estilo), destino)
            rel["gravadas"] += 1
            rel["sem_conferir"] += 1
            continue

        esperado = moras(consulta)
        melhor = None
        for tentativa in range(2):
            q = dict(consulta)
            if tentativa == 1:
                q["prePhonemeLength"], q["postPhonemeLength"] = 0.25, 0.35
                rel["whisper_refeitas"] += 1
            wav = motor.sintese(q, estilo)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as t:
                t.write(wav)
                tmp = t.name
            segs, _ = whisper.transcribe(tmp, language="ja", beam_size=5)
            os.unlink(tmp)
            ouviu = "".join(s.text for s in segs).strip()
            erro = cer(esperado, pronuncia(ouviu)) if ouviu else 1.0
            if melhor is None or erro < melhor[0]:
                melhor = (erro, wav, ouviu)
            # Frase longa aceita um deslize do Whisper; palavra curta precisa bater.
            if erro == 0 or (len(esperado) >= 8 and erro <= 0.1):
                break
        erro, wav, ouviu = melhor
        if erro > 0 and not (len(esperado) >= 8 and erro <= 0.1):
            rel["whisper_divergente"].append({"texto": f["texto"], "voz": f["voz"], "esperado": esperado, "ouviu": ouviu, "cer": round(erro, 3)})
        processar(wav, destino)
        rel["gravadas"] += 1

    sobras = [a for a in saida.glob("*.mp3") if a.name not in usados]
    for a in sobras:
        a.unlink()
    rel["removidas"] = len(sobras)
    corpo = {"versao": VERSAO, "falas": {k: dict(sorted(v.items())) for k, v in sorted(manifesto.items())}}
    (saida / "manifesto.json").write_text(json.dumps(corpo, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
    Path(args.relatorio).write_text(json.dumps(rel, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"gravadas {rel['gravadas']}, já existiam {rel['ja_existiam']}, removidas {len(sobras)}, "
          f"palavra em kana {len(rel['palavra_em_kana'])}, acento corrigido {len(rel['acento_corrigido'])}, "
          f"whisper divergente {len(rel['whisper_divergente'])}, sem conferir {rel['sem_conferir']}")


if __name__ == "__main__":
    main()
