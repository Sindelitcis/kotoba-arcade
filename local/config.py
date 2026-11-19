"""Lê local/config.exemplo.json e, por cima, local/config.local.json (que fica fora do Git)."""
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
    local = Path(os.environ.get("KOTOBA_CONFIG", AQUI / "config.local.json"))
    if local.exists():
        _juntar(cfg, json.loads(local.read_text(encoding="utf-8")))
    return cfg
