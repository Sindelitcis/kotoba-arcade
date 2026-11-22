"""Leitura de textos em japonês pelo OpenJTalk (o mesmo dicionário que o gravador de vozes usa).

Chamado por scripts/furigana.ts, com o Python do motor de voz (pyopenjtalk). Roda só na CPU.

    python leituras_jp.py tokens entrada.json saida.json
        entrada: lista de textos. saída: {texto: [[pedaço, leitura, pronúncia], ...]} (katakana)
    python leituras_jp.py pronuncia entrada.json saida.json
        entrada: lista de textos (com kanji ou em kana). saída: {texto: pronúncia em katakana}
"""
import json
import sys

import pyopenjtalk


def tokens(texto: str) -> list:
    return [[t["string"], t["read"], t["pron"]] for t in pyopenjtalk.run_frontend(texto)]


def main() -> None:
    modo, entrada, saida = sys.argv[1:4]
    textos = json.load(open(entrada, encoding="utf-8"))
    if modo == "tokens":
        out = {t: tokens(t) for t in textos}
    elif modo == "pronuncia":
        out = {t: pyopenjtalk.g2p(t, kana=True) for t in textos}
    else:
        raise SystemExit(f"modo desconhecido: {modo}")
    json.dump(out, open(saida, "w", encoding="utf-8"), ensure_ascii=False)


if __name__ == "__main__":
    main()
