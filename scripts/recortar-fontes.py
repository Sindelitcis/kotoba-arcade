"""Recorta as fontes do jogo só com os caracteres que aparecem no código e no conteúdo.

Três fontes livres (SIL Open Font License 1.1, Google Fonts), veja docs/estilo.md:
- Plus Jakarta Sans (variável): português e números.
- Zen Maru Gothic (500 e 700): todo o japonês corrido, títulos em japonês, kana grande.
- Klee One (600): o kanji grande que se estuda (carta, pergunta, peça), com o traço de livro escolar.

Os kanji que só o Kanji em peças usa (src/games/pecas) ficam em arquivos à parte, ligados por
`unicode-range` em pecas.css: o navegador só baixa esses arquivos quando um desses kanji aparece.

Uso: python scripts/recortar-fontes.py PASTA_COM_AS_FONTES_ORIGINAIS
A pasta precisa ter PlusJakartaSans[wght].ttf, ZenMaruGothic-Medium.ttf, ZenMaruGothic-Bold.ttf
e KleeOne-SemiBold.ttf. Precisa de fonttools e brotli: pip install fonttools brotli
"""
import pathlib
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "src" / "assets" / "fontes"
# Latim com acentos do português, pontuação e os símbolos que a interface usa.
LATIM = "U+0020-007E,U+00A0-00FF,U+0152-0153,U+2010-2027,U+2030-203A,U+2190-2193,U+2212,U+00D7"
JAPONESAS = ["ZenMaruGothic-Medium", "ZenMaruGothic-Bold", "KleeOne-SemiBold"]
PECAS = RAIZ / "src" / "games" / "pecas"


def japones(so_pecas: bool) -> set[str]:
    usados: set[str] = set()
    for padrao in ("*.ts", "*.tsx", "*.json"):
        for arquivo in (RAIZ / "src").rglob(padrao):
            if (PECAS in arquivo.parents) == so_pecas:
                usados |= set(arquivo.read_text(encoding="utf-8"))
    return {c for c in usados if ord(c) >= 0x3000}


def caracteres() -> str:
    kana = {chr(c) for c in range(0x3000, 0x3100)} | {chr(c) for c in range(0xFF01, 0xFF5F)}
    return "".join(sorted(japones(False) | kana))


def subset(origem: pathlib.Path, nome: str, saida: str, texto: pathlib.Path | None, unicodes: str | None) -> None:
    args = [
        sys.executable, "-m", "fontTools.subset", str(origem / f"{nome}.ttf"),
        "--flavor=woff2", "--layout-features=*", f"--output-file={SAIDA / saida}",
    ]
    if texto:
        args.append(f"--text-file={texto}")
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
    # caracteres.txt tem tudo o que o jogo desenha (o teste de estilo confere contra ele).
    (SAIDA / "caracteres.txt").write_text("".join(sorted(set(base) | set(extra))), encoding="utf-8", newline="\n")
    (SAIDA / "caracteres-pecas.txt").write_text(extra, encoding="utf-8", newline="\n")
    base_txt = SAIDA / "caracteres-base.tmp"
    base_txt.write_text(base, encoding="utf-8", newline="\n")
    pecas_txt = SAIDA / "caracteres-pecas.tmp"
    pecas_txt.write_text(extra, encoding="utf-8", newline="\n")
    try:
        subset(origem, "PlusJakartaSans[wght]", "PlusJakartaSans.woff2", None, LATIM)
        for nome in JAPONESAS:
            subset(origem, nome, f"{nome}.woff2", base_txt, None)
        for nome in ("ZenMaruGothic-Bold", "KleeOne-SemiBold"):
            subset(origem, nome, f"{nome}-Pecas.woff2", pecas_txt, None)
    finally:
        base_txt.unlink()
        pecas_txt.unlink()
    faixa = ",".join(f"U+{ord(c):X}" for c in extra)
    # O peso tem que ser a mesma faixa do @font-face principal em styles.css. Com peso diferente o
    # navegador escolhe a face pelo peso antes de olhar o unicode-range e o resto do texto cai na
    # fonte do sistema (foi o que aconteceu com o 言葉 do fliperama).
    faces = [("Zen Maru Gothic", "ZenMaruGothic-Bold-Pecas", "600 900"), ("Klee One", "KleeOne-SemiBold-Pecas", "400 900")]
    css = "/* Gerado por scripts/recortar-fontes.py: kanji que só o Kanji em peças usa. */\n"
    for familia, arquivo, peso in faces:
        css += (
            f"@font-face {{\n  font-family: '{familia}';\n  src: url('./{arquivo}.woff2') format('woff2');\n"
            f"  font-weight: {peso};\n  font-display: swap;\n  unicode-range: {faixa};\n}}\n"
        )
    (SAIDA / "pecas.css").write_text(css, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
