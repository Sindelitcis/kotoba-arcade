"""Grava as falas fixas dos jogos (AivisSpeech e VOICEVOX). Chamado por gravar-vozes.mjs.

Para cada fala:
1. Monta o texto do motor palavra por palavra: com kanji, que acerta mais leitura e
   acento; a palavra que o motor lê errado pelo kanji (日本人 = ニッポンジン) vai em kana.
2. Palavra solta: confere o acento na Kanjium (CC BY-SA 4.0) e corrige se o motor errou.
3. Sintetiza, corta silêncio, normaliza o volume e grava mp3 mono.
4. Confere com o Whisper. Palavra curta também é ouvida depois de uma frase-moldura
   (次の言葉は、…), que dá contexto sem dizer a resposta. Se não bater, tenta de novo:
   mais silêncio em volta, mais devagar e, na palavra solta com kanji, tudo em kana.
   Fala sem personagem (voz padrão) que ainda assim não bate vai para outra voz do
   AivisSpeech (`RESERVA`): a まお embola algumas palavras (切符 sai きっと).
   Fica a primeira que bater ou, se nenhuma, a melhor; essa vai para `duvidas.json`.

Arquivos já gravados (mesmo texto, mesma voz, mesma entrada) não são refeitos.
`--refazer-textos arquivo.json` (lista de textos) refaz só esses.

Kana solto: o jeito de gravar fica em `scripts/kana-metodo.json` (ver `KANA_METODOS`).
`--comparar-kana PASTA` não grava o site: grava cada jeito para alguns kana, para a comparação
às cegas (`npm run comparar-kana`).
"""
import argparse
import hashlib
import io
import json
import os
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import wave
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


def juntar_wav(a: bytes, b: bytes) -> bytes:
    """Dois wav do mesmo motor e voz, um depois do outro."""
    with wave.open(io.BytesIO(a)) as wa, wave.open(io.BytesIO(b)) as wb:
        params = wa.getparams()
        quadros = wa.readframes(wa.getnframes()) + wb.readframes(wb.getnframes())
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setparams(params)
        w.writeframes(quadros)
    return out.getvalue()


MOLDURA = "次の言葉は、"


def aceita(erro: float, esperado: str) -> bool:
    """Frase longa aceita um deslize do Whisper; palavra curta precisa bater."""
    return erro == 0 or (len(esperado) >= 8 and erro <= 0.1)


class Ouvido:
    """O Whisper ouvindo uma gravação, com e sem a frase-moldura antes."""

    def __init__(self, whisper):
        self.whisper = whisper
        self._molduras = {}

    def transcrever(self, wav: bytes) -> str:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as t:
            t.write(wav)
            tmp = t.name
        try:
            segs, _ = self.whisper.transcribe(tmp, language="ja", beam_size=5)
            return "".join(s.text for s in segs).strip()
        finally:
            os.unlink(tmp)

    def moldura(self, motor, estilo: int):
        if estilo not in self._molduras:
            q = motor.consulta(MOLDURA, estilo)
            self._molduras[estilo] = (motor.sintese(q, estilo), moras(q))
        return self._molduras[estilo]

    def conferir(self, wav: bytes, esperado: str, motor, estilo: int):
        """(erro, o que ouviu)."""
        ouviu = self.transcrever(wav)
        erro = cer(esperado, pronuncia(ouviu)) if ouviu else 1.0
        if aceita(erro, esperado) or len(esperado) >= 8:
            return erro, ouviu
        # Palavra curta solta engana o Whisper (ごご vira ここ). Com contexto antes, ele acerta mais.
        fala, ref_moldura = self.moldura(motor, estilo)
        ouviu2 = self.transcrever(juntar_wav(fala, wav))
        ref = ref_moldura + esperado
        erro2 = cer(ref, pronuncia(ouviu2)) * len(ref) / len(esperado) if ouviu2 else 1.0
        return (erro2, f"{ouviu2} (com moldura)") if erro2 < erro else (erro, ouviu)


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


# Os jeitos de gravar um kana sozinho (docs/curso.md, "Áudio de kana isolado"). A mora solta
# sai curta e às vezes embolada; a escolha entre eles é do ouvido, na comparação às cegas.
KANA_METODOS = {
    "atual": "o motor fala o kana sozinho, como sempre foi",
    "esticado": "o kana sozinho, mais devagar, com a vogal mais longa e silêncio em volta",
    "recorte": "o motor fala o kana duas vezes (か、か) e fica só a primeira, recortada pelo tempo de cada mora",
    "aivis": "a voz das frases (AivisSpeech まお) fala o kana sozinho, com silêncio em volta",
}
# Os kana da comparação: vogais, os que fogem da linha (し, ち, つ, ふ), o R, o ん, tenten,
# maru, combinados e os sons de fora do katakana.
KANA_COMPARAR = ["あ", "い", "う", "え", "お", "か", "し", "ち", "つ", "ふ", "ら", "り", "る", "ん", "を",
                 "が", "ぜ", "ぴ", "きゃ", "しゅ", "ちょ", "りゅ", "ツ", "ファ", "ティ", "ヴ"]


def _cortar(wav: bytes, fim: float, fade: float = 0.04) -> bytes:
    """Corta o wav (16 bits, mono) em `fim` segundos, com um fade-out curto no fim."""
    import array
    with wave.open(io.BytesIO(wav)) as w:
        taxa, largura, canais = w.getframerate(), w.getsampwidth(), w.getnchannels()
        amostras = array.array("h", w.readframes(w.getnframes()))
    assert largura == 2 and canais == 1, (largura, canais)
    corte = amostras[: max(1, int(fim * taxa))]
    n = min(len(corte), int(fade * taxa))
    for i in range(n):
        corte[len(corte) - n + i] = int(corte[len(corte) - n + i] * (n - i) / n)
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(taxa)
        w.writeframes(corte.tobytes())
    return out.getvalue()


def kana_isolado(metodo: str, kana: str, motores: dict, vozes: dict) -> bytes:
    """O wav de um kana sozinho, gravado do jeito `metodo` (KANA_METODOS)."""
    vv, est = motores["voicevox"], vozes["metan"]["estilo"]
    if metodo == "atual":
        return vv.sintese(vv.consulta(kana, est), est)
    if metodo == "esticado":
        q = vv.consulta(kana, est)
        ultima = q["accent_phrases"][-1]["moras"][-1]
        ultima["vowel_length"] *= 1.6
        return vv.sintese(dict(q, speedScale=0.9, prePhonemeLength=0.2, postPhonemeLength=0.3), est)
    if metodo == "recorte":
        q = vv.consulta(f"{kana}、{kana}", est)
        primeira = q["accent_phrases"][0]["moras"]
        dur = q["prePhonemeLength"] + sum((m.get("consonant_length") or 0) + m["vowel_length"] for m in primeira)
        return _cortar(vv.sintese(q, est), dur / q["speedScale"] + 0.06)
    if metodo == "aivis":
        av, est = motores["aivis"], vozes["mao"]["estilo"]
        q = av.consulta(kana, est)
        return av.sintese(dict(q, prePhonemeLength=0.25, postPhonemeLength=0.35), est)
    raise ValueError(f"jeito de gravar kana desconhecido: {metodo}")


def comparar_kana(pasta: Path, motores: dict, vozes: dict) -> None:
    """Grava cada kana de KANA_COMPARAR de todos os jeitos, para a comparação às cegas."""
    pasta.mkdir(parents=True, exist_ok=True)
    lista = []
    for i, kana in enumerate(KANA_COMPARAR):
        arquivos = {}
        for metodo in KANA_METODOS:
            nome = f"{i:02d}-{metodo}.mp3"
            processar(kana_isolado(metodo, kana, motores, vozes), pasta / nome)
            arquivos[metodo] = nome
        lista.append({"kana": kana, "arquivos": arquivos})
        print(f"{kana}: {len(arquivos)} versões", flush=True)
    corpo = {"metodos": KANA_METODOS, "kana": lista}
    (pasta / "lista.json").write_text(json.dumps(corpo, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
    print(f"{len(lista)} kana em {pasta}")


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


# Vozes que substituem a padrão, na ordem, quando o Whisper não entende nenhuma versão dela.
RESERVA = ["mai", "kohaku", "nise"]


def variantes(f: dict, consulta: dict, motor: Motor, estilo: int, kanjium: dict, reservas: list):
    """As versões que o gravador tenta, na ordem, até o Whisper confirmar uma:
    (nome, consulta, motor, estilo)."""
    yield "normal", consulta, motor, estilo
    q = dict(consulta, prePhonemeLength=0.25, postPhonemeLength=0.35)
    yield "silencio", q, motor, estilo
    yield "devagar", dict(q, speedScale=0.9), motor, estilo
    p = f.get("palavra")
    if p and p["jp"] != p["kana"]:
        k = motor.consulta(p["kana"], estilo)
        corrigir_acento(f, k, motor, estilo, kanjium, {"acento_corrigido": []})
        yield "kana", dict(k, prePhonemeLength=0.25, postPhonemeLength=0.35), motor, estilo
    for nome, outro, est in reservas:
        c = outro.consulta(outro.texto_do_motor(f["partes"], est, []), est)
        yield f"voz {nome}", dict(c, prePhonemeLength=0.25, postPhonemeLength=0.35), outro, est


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
    ap.add_argument("--refazer-textos", help="json com a lista de textos para gravar de novo")
    ap.add_argument("--duvidas", help="json com as gravações que o Whisper não confirmou (vai sendo atualizado)")
    ap.add_argument("--comparar-kana", help="pasta: grava os kana da comparação às cegas, e só")
    args = ap.parse_args()

    dados = json.loads(Path(args.falas).read_text(encoding="utf-8"))
    vozes, falas, padrao = dados["vozes"], dados["falas"], dados["padrao"]
    motores = {"aivis": Motor(args.aivis), "voicevox": Motor(args.voicevox, voicevox=True)}
    if args.comparar_kana:
        comparar_kana(Path(args.comparar_kana), motores, vozes)
        return
    metodo_kana = json.loads((Path(__file__).parent / "kana-metodo.json").read_text(encoding="utf-8"))["metodo"]
    assert metodo_kana in KANA_METODOS, metodo_kana
    saida = Path(args.saida)
    saida.mkdir(parents=True, exist_ok=True)
    kanjium = carregar_kanjium(args.kanjium)
    ouvido = Ouvido(WhisperModel(args.whisper, device="cuda", compute_type="float16"))
    refazer = set(json.loads(Path(args.refazer_textos).read_text(encoding="utf-8"))) if args.refazer_textos else set()
    duvidas = {}
    if args.duvidas and Path(args.duvidas).exists():
        duvidas = json.loads(Path(args.duvidas).read_text(encoding="utf-8"))

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
        if f["origem"].startswith("kana/") and metodo_kana != "atual":
            chave += f"\nkana:{metodo_kana}"
        arquivo = hashlib.sha1(chave.encode("utf-8")).hexdigest()[:16] + ".mp3"
        manifesto.setdefault(f["texto"], {})[f["voz"]] = arquivo
        usados.add(arquivo)
        destino = saida / arquivo
        if destino.exists() and not args.refazer and f["texto"] not in refazer:
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
            processar(kana_isolado(metodo_kana, f["tts"], motores, vozes), destino)
            rel["gravadas"] += 1
            rel["sem_conferir"] += 1
            continue

        esperado = moras(consulta)
        reservas = []
        if f["voz"] == padrao and not f.get("palavra"):
            reservas = [(v, motores[vozes[v]["motor"]], vozes[v]["estilo"]) for v in RESERVA if v in vozes]
        melhor = None
        for nome, q, m, est in variantes(f, consulta, motor, estilo, kanjium, reservas):
            wav = m.sintese(q, est)
            erro, ouviu = ouvido.conferir(wav, esperado, m, est)
            if melhor is None or erro < melhor[0]:
                melhor = (erro, wav, ouviu, nome)
            if aceita(erro, esperado):
                break
            rel["whisper_refeitas"] += 1
        erro, wav, ouviu, nome = melhor
        duvidas.pop(arquivo, None)
        if nome.startswith("voz "):
            rel.setdefault("outra_voz", []).append({"texto": f["texto"], "voz": nome[4:], "aceita": aceita(erro, esperado)})
        if not aceita(erro, esperado):
            item = {"texto": f["texto"], "voz": f["voz"], "esperado": esperado, "ouviu": ouviu,
                    "cer": round(erro, 3), "versao": nome}
            rel["whisper_divergente"].append(item)
            duvidas[arquivo] = item
        processar(wav, destino)
        rel["gravadas"] += 1

    sobras = [a for a in saida.glob("*.mp3") if a.name not in usados]
    for a in sobras:
        a.unlink()
    rel["removidas"] = len(sobras)
    corpo = {"versao": VERSAO, "falas": {k: dict(sorted(v.items())) for k, v in sorted(manifesto.items())}}
    (saida / "manifesto.json").write_text(json.dumps(corpo, ensure_ascii=False, indent=0) + "\n", encoding="utf-8", newline="\n")
    duvidas = {a: d for a, d in duvidas.items() if a in usados}
    rel["duvidas"] = list(duvidas.values())
    if args.duvidas:
        Path(args.duvidas).write_text(json.dumps(duvidas, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8", newline="\n")
    Path(args.relatorio).write_text(json.dumps(rel, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
    print(f"gravadas {rel['gravadas']}, já existiam {rel['ja_existiam']}, removidas {len(sobras)}, "
          f"palavra em kana {len(rel['palavra_em_kana'])}, acento corrigido {len(rel['acento_corrigido'])}, "
          f"whisper divergente {len(rel['whisper_divergente'])}, sem conferir {rel['sem_conferir']}, "
          f"dúvidas guardadas {len(duvidas)}")


if __name__ == "__main__":
    main()
