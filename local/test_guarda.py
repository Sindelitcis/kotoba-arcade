"""Testes de quem pode falar com o servidor do PC. Rodam com `python -m unittest discover -s local` (sem instalar nada)."""
import asyncio
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from guarda import SITE, Guarda, decidir, origens_do_config  # noqa: E402

PORTA = 8791
ORIGENS = origens_do_config({"origens": [SITE + "/"]})
H = f"127.0.0.1:{PORTA}"


class Decidir(unittest.TestCase):
    def test_site_publicado_e_localhost_passam(self):
        for o in (SITE, "http://localhost:5173", "http://127.0.0.1:4173", "http://[::1]:5173"):
            self.assertEqual(decidir("POST", o, H, False, PORTA, ORIGENS), (None, {"Access-Control-Allow-Origin": o, "Vary": "Origin"}))

    def test_outras_origens_levam_403(self):
        for o in ("https://malvado.example", "https://abc123.kotoba-arcade.pages.dev", "http://kotoba-arcade.pages.dev",
                  SITE + ".evil.com", "null", "http://localhost.evil.com"):
            self.assertEqual(decidir("POST", o, H, False, PORTA, ORIGENS), (403, {}), o)

    def test_pre_verificacao_de_rede_privada_so_para_a_origem_certa(self):
        status, cab = decidir("OPTIONS", SITE, H, True, PORTA, ORIGENS)
        self.assertEqual(status, 204)
        self.assertEqual(cab["Access-Control-Allow-Private-Network"], "true")
        self.assertEqual(cab["Access-Control-Allow-Origin"], SITE)
        self.assertEqual(decidir("OPTIONS", "https://malvado.example", H, True, PORTA, ORIGENS), (403, {}))
        # Sem o pedido de rede privada, não manda o cabeçalho.
        self.assertNotIn("Access-Control-Allow-Private-Network", decidir("OPTIONS", SITE, H, False, PORTA, ORIGENS)[1])

    def test_host_estranho_leva_403_mesmo_da_origem_certa(self):
        for host in ("malvado.example:8791", "127.0.0.1:9999", "", "127.0.0.1"):
            self.assertEqual(decidir("GET", SITE, host, False, PORTA, ORIGENS)[0], 403, host)

    def test_sem_origin_passa_sem_cors(self):
        # curl e o próprio iniciar.mjs não mandam Origin.
        self.assertEqual(decidir("GET", None, f"localhost:{PORTA}", False, PORTA, ORIGENS), (None, {}))

    def test_config_ignora_lixo(self):
        self.assertEqual(origens_do_config({"origens": ["ftp://x", 3, "https://a.b/"]}), {"https://a.b"})


class Middleware(unittest.TestCase):
    def rodar(self, metodo, cabecalhos, path="/conversa"):
        chamadas, enviados = [], []

        async def app(scope, receive, send):
            chamadas.append(scope["path"])
            await send({"type": "http.response.start", "status": 200, "headers": []})
            await send({"type": "http.response.body", "body": b"ok"})

        async def send(msg):
            enviados.append(msg)

        usos = []
        g = Guarda(app, PORTA, ORIGENS, ao_usar=usos.append)
        scope = {"type": "http", "method": metodo, "path": path,
                 "headers": [(k.encode(), v.encode()) for k, v in cabecalhos.items()]}
        asyncio.run(g(scope, None, send))
        return chamadas, enviados, usos

    def test_outra_origem_nem_chega_na_rota(self):
        chamadas, enviados, usos = self.rodar("POST", {"host": H, "origin": "https://malvado.example"})
        self.assertEqual(chamadas, [])
        self.assertEqual(usos, [])
        self.assertEqual(enviados[0]["status"], 403)

    def test_origem_certa_chega_e_leva_o_cors(self):
        chamadas, enviados, usos = self.rodar("POST", {"host": H, "origin": SITE})
        self.assertEqual(chamadas, ["/conversa"])
        self.assertEqual(usos, ["/conversa"])
        self.assertIn((b"access-control-allow-origin", SITE.encode()), enviados[0]["headers"])

    def test_pre_verificacao_responde_sem_chamar_a_rota(self):
        chamadas, enviados, _ = self.rodar("OPTIONS", {"host": H, "origin": SITE, "access-control-request-private-network": "true"})
        self.assertEqual(chamadas, [])
        self.assertEqual(enviados[0]["status"], 204)
        self.assertIn((b"access-control-allow-private-network", b"true"), enviados[0]["headers"])


if __name__ == "__main__":
    unittest.main()
