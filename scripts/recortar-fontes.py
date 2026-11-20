"""Recorta as fontes do jogo só com os caracteres que aparecem no código e no conteúdo.

Os kanji que só o Kanji em peças usa (src/games/pecas) ficam num arquivo à parte da fonte de
pincel, YujiSyuku-Pecas.woff2, ligado por `unicode-range` em pecas.css: o navegador só baixa
esse arquivo quando um desses kanji aparece na tela. O resto do fliperama não paga por ele.

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


PECAS = RAIZ / "src" / "games" / "pecas"


def japones(so_pecas: bool) -> set[str]:
    usados: set[str] = set()
    for padrao in ("*.ts", "*.tsx", "*.json"):
        for arquivo in (RAIZ / "src").rglob(padrao):
            if (PECAS in arquivo.parents) == so_pecas:
                usados |= set(arquivo.read_text(encoding="utf-8"))
    return {c for c in usados if ord(c) >= 0x3000}


def caracteres() -> str:
    kana = {chr(c) for c in range(0x3040, 0x3100)} | {chr(c) for c in range(0xFF01, 0xFF5F)}
    return "".join(sorted(japones(False) | kana))


def subset(origem: pathlib.Path, nome: str, lista: pathlib.Path, saida: str, unicodes: str | None) -> None:
    args = [
        sys.executable, "-m", "fontTools.subset", str(origem / f"{nome}.ttf"),
        f"--text-file={lista}", "--flavor=woff2", "--layout-features=*", f"--output-file={SAIDA / saida}",
    ]
    if unicodes:
        args.append(f"--unicodes={unicodes}")
    subprocess.run(args, check=True)
    print(saida, (SAIDA / saida).stat().st_size // 1024, "KB")


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    origem = pathlib.Path(sys.argv[1])
    SAIDA.mkdir(parents=True, exist_ok=True)
    base = caracteres()
    extra = "".join(sorted(japones(True) - set(base)))
    lista = SAIDA / "caracteres.txt"
    lista_pecas = SAIDA / "caracteres-pecas.txt"
    # caracteres.txt tem tudo o que o jogo desenha (o teste de estilo confere contra ele).
    lista.write_text("".join(sorted(set(base) | set(extra))), encoding="utf-8", newline="\n")
    base_txt = SAIDA / "caracteres-base.tmp"
    base_txt.write_text(base, encoding="utf-8", newline="\n")
    lista_pecas.write_text(extra, encoding="utf-8", newline="\n")
    try:
        for nome in FONTES:
            subset(origem, nome, base_txt, f"{nome}.woff2", UNICODES)
        subset(origem, "YujiSyuku-Regular", lista_pecas, "YujiSyuku-Pecas.woff2", None)
    finally:
        base_txt.unlink()
    faixa = ",".join(f"U+{ord(c):X}" for c in extra)
    (SAIDA / "pecas.css").write_text(
        "/* Gerado por scripts/recortar-fontes.py: kanji que só o Kanji em peças usa. */\n"
        "@font-face {\n  font-family: 'Yuji Syuku';\n  src: url('./YujiSyuku-Pecas.woff2') format('woff2');\n"
        f"  font-display: swap;\n  unicode-range: {faixa};\n}}\n",
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    main()
