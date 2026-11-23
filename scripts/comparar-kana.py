"""Comparação às cegas dos jeitos de gravar kana solto (docs/curso.md, "Áudio de kana isolado").

    npm run vozes -- --comparar-kana D:/KotobaArcade/voz/comparacao-kana   (grava as versões)
    npm run comparar-kana                                                   (abre a comparação)

Serve a página `scripts/comparar-kana.html` com os áudios da pasta, em http://127.0.0.1:4790.
Cada kana toca em todas as versões, numa ordem sorteada e sem dizer qual é qual. O resultado
vai para `resultado.json` na mesma pasta, e a conta por jeito aparece aqui no terminal. O jeito
escolhido vai para `scripts/kana-metodo.json`, e `npm run vozes` grava os kana de novo.
"""
import http.server
import json
import sys
import webbrowser
from pathlib import Path

_ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
PASTA = Path(_ARGS[0] if _ARGS else "D:/KotobaArcade/voz/comparacao-kana")
PAGINA = Path(__file__).with_name("comparar-kana.html")
PORTA = 4790


class Pedido(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(PASTA), **k)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            corpo = PAGINA.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(corpo)))
            self.end_headers()
            self.wfile.write(corpo)
            return
        super().do_GET()

    def do_POST(self):
        if self.path != "/resultado":
            self.send_error(404)
            return
        dados = json.loads(self.rfile.read(int(self.headers["Content-Length"])).decode("utf-8"))
        (PASTA / "resultado.json").write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
        print("Resultado salvo em", PASTA / "resultado.json")
        for metodo, n in sorted(dados["conta"].items(), key=lambda x: -x[1]):
            print(f"  {metodo}: {n}")
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    if not (PASTA / "lista.json").exists():
        sys.exit(f"Não achei {PASTA / 'lista.json'}. Grave as versões antes (ver o topo deste arquivo).")
    servidor = http.server.ThreadingHTTPServer(("127.0.0.1", PORTA), Pedido)
    url = f"http://127.0.0.1:{PORTA}/"
    print("Comparação em", url, "(Ctrl+C para sair)")
    if "--sem-abrir" not in sys.argv:
        webbrowser.open(url)
    servidor.serve_forever()
