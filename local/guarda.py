"""Quem pode falar com o servidor do PC. Só biblioteca padrão, para dar para testar sem instalar nada.

O servidor escuta só em 127.0.0.1, mas o navegador deixa qualquer site mandar pedido para lá. Por isso:
- só páginas abertas neste PC (localhost) e as origens do config ("origens", que já traz o site
  publicado) recebem resposta; pedido com outra Origin leva 403 antes de chegar no modelo;
- o Host tem que ser 127.0.0.1, localhost ou [::1] com a porta do servidor: um site que aponte um nome
  próprio para 127.0.0.1 (DNS rebinding) também leva 403;
- a pré-verificação do Chrome e do Brave para um site público falar com o PC (Private Network Access)
  só recebe o sim para essas mesmas origens.
"""
from __future__ import annotations

import re

LOCAL = re.compile(r"^http://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$")
SITE = "https://kotoba-arcade.pages.dev"


def origens_do_config(cfg: dict) -> set[str]:
    return {o.rstrip("/") for o in cfg.get("origens", []) if isinstance(o, str) and o.startswith(("https://", "http://"))}


def origem_aceita(origem: str, origens: set[str]) -> bool:
    return bool(LOCAL.match(origem)) or origem in origens


def host_aceito(host: str, porta: int) -> bool:
    return host in {f"127.0.0.1:{porta}", f"localhost:{porta}", f"[::1]:{porta}"}


def decidir(metodo: str, origem: str | None, host: str, pede_rede_privada: bool, porta: int, origens: set[str]):
    """Devolve (status, cabeçalhos). Status None = segue para a rota, juntando os cabeçalhos na resposta."""
    if not host_aceito(host, porta):
        return 403, {}
    if origem is not None and not origem_aceita(origem, origens):
        return 403, {}
    cab: dict[str, str] = {}
    if origem is not None:
        cab["Access-Control-Allow-Origin"] = origem
        cab["Vary"] = "Origin"
    if metodo == "OPTIONS" and origem is not None:
        cab["Access-Control-Allow-Methods"] = "GET, POST"
        cab["Access-Control-Allow-Headers"] = "Content-Type"
        cab["Access-Control-Max-Age"] = "600"
        if pede_rede_privada:
            cab["Access-Control-Allow-Private-Network"] = "true"
        return 204, cab
    return None, cab


class Guarda:
    """Middleware ASGI que aplica `decidir` em todo pedido HTTP."""

    def __init__(self, app, porta: int, origens: set[str], ao_usar=None):
        self.app = app
        self.porta = porta
        self.origens = origens
        self.ao_usar = ao_usar

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        h = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope.get("headers", [])}
        status, cab = decidir(
            scope["method"], h.get("origin"), h.get("host", ""),
            h.get("access-control-request-private-network") == "true", self.porta, self.origens,
        )
        if status is not None:
            await send({"type": "http.response.start", "status": status,
                        "headers": [(k.lower().encode(), v.encode()) for k, v in cab.items()]})
            await send({"type": "http.response.body", "body": b""})
            return
        if self.ao_usar:
            self.ao_usar(scope["path"])

        async def enviar(msg):
            if msg["type"] == "http.response.start":
                msg = {**msg, "headers": list(msg.get("headers", [])) + [(k.lower().encode(), v.encode()) for k, v in cab.items()]}
            await send(msg)

        return await self.app(scope, receive, enviar)
