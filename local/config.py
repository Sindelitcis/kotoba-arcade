"""Lê local/config.exemplo.json e, por cima, o config do PC (fora do Git).

O config do PC é o primeiro que existir: KOTOBA_CONFIG, local/config.local.json ou
D:\KotobaArcade\ia\config.local.json (onde ficam os programas da Conversa neste PC).
"""
import json
import os
from pathlib import Path

AQUI = Path(__file__).resolve().parent


def _juntar(base, extra):
    for k, v in extra.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            _juntar(base[k], v)
        else:
            base[k] = v


def carregar_config():
    cfg = json.loads((AQUI / "config.exemplo.json").read_text(encoding="utf-8"))
    for local in caminhos_do_config():
        if local.exists():
            _juntar(cfg, json.loads(local.read_text(encoding="utf-8")))
            break
    return cfg


def caminhos_do_config():
    if os.environ.get("KOTOBA_CONFIG"):
        return [Path(os.environ["KOTOBA_CONFIG"])]
    return [AQUI / "config.local.json", Path("D:/KotobaArcade/ia/config.local.json")]
