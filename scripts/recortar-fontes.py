"""Recorta as fontes do jogo só com os caracteres que aparecem no código e no conteúdo.

Uso: python scripts/recortar-fontes.py PASTA_COM_AS_FONTES_ORIGINAIS
A pasta precisa ter DelaGothicOne-Regular.ttf e YujiSyuku-Regular.ttf (Google Fonts, licença OFL).
Precisa de fonttools e brotli: pip install fonttools brotli
"""
import pathlib
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "src" / "assets" / "fontes"
FONTES = ["DelaGothicOne-Regular", "YujiSyuku-Regular"]
# Latim com acentos do português, pontuação e os símbolos que a interface usa.
UNICODES = "U+0020-007E,U+00A0-00FF,U+2010-2027,U+2190-2193,U+25CB,U+25CF,U+2605,U+2665,U+00D7"


def caracteres() -> str:
    usados: set[str] = set()
    for padrao in ("*.ts", "*.tsx", "*.json"):
        for arquivo in (RAIZ / "src").rglob(padrao):
            usados |= set(arquivo.read_text(encoding="utf-8"))
    japones = {c for c in usados if ord(c) >= 0x3000}
    kana = {chr(c) for c in range(0x3040, 0x3100)} | {chr(c) for c in range(0xFF01, 0xFF5F)}
    return "".join(sorted(japones | kana))


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    origem = pathlib.Path(sys.argv[1])
    SAIDA.mkdir(parents=True, exist_ok=True)
    texto = caracteres()
    lista = SAIDA / "caracteres.txt"
    lista.write_text(texto, encoding="utf-8")
    for nome in FONTES:
        subprocess.run(
            [
                sys.executable, "-m", "fontTools.subset", str(origem / f"{nome}.ttf"),
                f"--text-file={lista}", f"--unicodes={UNICODES}",
                "--flavor=woff2", "--layout-features=*", f"--output-file={SAIDA / (nome + '.woff2')}",
            ],
            check=True,
        )
        print(nome, (SAIDA / f"{nome}.woff2").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
