"""Gera o recorte de dados abertos do jogo Kanji em peças e confere o conteúdo escrito à mão.

Uso: python -I -X utf8 scripts/pecas-dados.py [PASTA_DOS_DADOS]
A pasta (padrão D:/KotobaArcade/dados/brutos) precisa ter, baixados da fonte original:
- kanjidic2.xml        (EDRDG, CC BY-SA 4.0)  http://ftp.edrdg.org/pub/Nihongo/kanjidic2.xml.gz
- JMdict_e             (EDRDG, CC BY-SA 4.0)  http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz
- ../krad/kradfile     (EDRDG, CC BY-SA 4.0)  http://ftp.edrdg.org/pub/Nihongo/kradzip.zip
- kanjivg-*.xml        (KanjiVG, CC BY-SA 3.0) https://github.com/KanjiVG/kanjivg/releases
- kanji-data.json      (níveis do JLPT, MIT)   https://github.com/davidluzgouveia/kanji-data

Escreve dois arquivos em src/games/pecas/:
- recorte.json: N5 a N2 (nível, traços, leituras do KANJIDIC2, peças do KRADFILE) e, para cada
  palavra de exemplo do conteúdo, as leituras que o JMdict registra e se ela é de uso comum.
- tracos.json: os traços do KanjiVG de cada kanji do conteúdo, que traço pertence a qual peça,
  e o desenho de cada peça sozinha.

No fim imprime o que não bate (peça que o KanjiVG não reconhece, leitura fora do KANJIDIC2,
palavra fora do JMdict). Os testes (tests/pecas-dados.test.ts) conferem o mesmo a partir do recorte.
"""
import glob
import json
import pathlib
import re
import sys
import xml.etree.ElementTree as ET

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "src" / "games" / "pecas"
KVG = "{http://kanjivg.tagaini.net}"
NIVEIS = {5: "N5", 4: "N4", 3: "N3", 2: "N2"}
# Do N1 só entram os kanji que o conteúdo usa (士, par de 土 no modo intruso).
N1 = {1: "N1"}
# O KRADFILE usa kanji inteiros no lugar das formas de radical que não existiam no JIS X 0208.
KRAD_FORMA = {"化": "亻", "汁": "氵", "扎": "扌", "忙": "忄", "礼": "礻", "初": "衤", "刈": "刂",
              "犯": "⺨", "艾": "艹", "込": "⻌", "尚": "⺌", "阡": "⻖", "邦": "⻏", "杰": "灬", "老": "耂", "疔": "疒", "滴": "啇"}


def hira(s: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)


def conteudo() -> list[dict]:
    """Lê as linhas `kanji|peças|leitura|significados|palavra|historinha` dos arquivos de dados."""
    out = []
    for arq in sorted((SAIDA / "dados").glob("n*.ts")):
        for linha in arq.read_text(encoding="utf-8").splitlines():
            partes = linha.split("|")
            if len(partes) != 6 or not partes[0] or ord(partes[0][0]) < 0x3000:
                continue
            k, pecas, leitura, pt, palavra, historia = partes
            jp, kana, _ = palavra.split(":", 2)
            out.append({"k": k, "pecas": list(pecas), "leitura": leitura, "jp": jp, "kana": kana, "arquivo": arq.name})
    return out


def main() -> None:
    dados = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "D:/KotobaArcade/dados/brutos")
    itens = conteudo()
    nosso = {i["k"] for i in itens}

    niveis = {k: {**NIVEIS, **N1}[v["jlpt_new"]] for k, v in json.loads((dados / "kanji-data.json").read_text(encoding="utf-8")).items()
              if v.get("jlpt_new") in NIVEIS or (v.get("jlpt_new") in N1 and k in nosso)}

    kanjidic = {}
    for ch in ET.parse(dados / "kanjidic2.xml").getroot().iter("character"):
        lit = ch.findtext("literal")
        if lit not in niveis:
            continue
        on = [hira(r.text or "") for r in ch.iter("reading") if r.get("r_type") == "ja_on"]
        kun = [r.text or "" for r in ch.iter("reading") if r.get("r_type") == "ja_kun"]
        tracos = int(ch.findtext("misc/stroke_count") or 0)
        kanjidic[lit] = {"on": on, "kun": kun, "tracos": tracos}

    krad = {}
    for linha in (dados.parent / "krad" / "kradfile").read_text(encoding="euc-jp").splitlines():
        if linha.startswith("#") or " : " not in linha:
            continue
        k, comps = linha.split(" : ")
        if k in niveis:
            krad[k] = [KRAD_FORMA.get(c, c) for c in comps.split()]

    # JMdict: só as palavras de exemplo do conteúdo, com as leituras e a marca de uso comum.
    # Palavra com お/ご de cortesia ou さん (お酒, お客さん) conta como comum quando a palavra sem eles é.
    sem_cortesia = {i["jp"]: re.sub(r"^[おご]|さん$", "", i["jp"]) for i in itens}
    procurar = {i["jp"] for i in itens} | set(sem_cortesia.values())
    palavras: dict[str, dict] = {}
    for _, e in ET.iterparse(dados / "JMdict_e", events=("end",)):
        if e.tag != "entry":
            continue
        kebs = [k.findtext("keb") for k in e.iter("k_ele")]
        for keb in kebs:
            if keb in procurar:
                p = palavras.setdefault(keb, {"kana": [], "comum": False})
                for r in e.iter("r_ele"):
                    restr = [x.text for x in r.iter("re_restr")]
                    if restr and keb not in restr:
                        continue
                    reb = r.findtext("reb")
                    if reb not in p["kana"]:
                        p["kana"].append(reb)
                for k in e.iter("k_ele"):
                    if k.findtext("keb") == keb and any(x.text in ("news1", "ichi1", "spec1", "spec2", "gai1") for x in k.iter("ke_pri")):
                        p["comum"] = True
        e.clear()

    # KanjiVG: traços de cada kanji do conteúdo e quais traços formam cada peça.
    kvg_arq = sorted(glob.glob(str(dados / "kanjivg-*.xml")))[-1]
    raiz_kvg = ET.parse(kvg_arq).getroot()
    sozinhos: dict[str, list[str]] = {}
    tracos: dict[str, dict] = {}
    for kj in raiz_kvg.iter("kanji"):
        if "-" in kj.get("id", ""):
            continue
        g = kj.find("g")
        el = g.get(KVG + "element") if g is not None else None
        if not el:
            continue
        caminhos = [p.get("d") for p in kj.iter("path")]
        sozinhos.setdefault(el, caminhos)
        if el not in nosso:
            continue
        indice = {id(p): i for i, p in enumerate(kj.iter("path"))}
        grupos: dict[str, list[int]] = {}
        for sub in g.iter("g"):
            nome = sub.get(KVG + "element")
            if not nome or sub is g:
                continue
            idx = grupos.setdefault(nome, [])
            for p in sub.iter("path"):
                if indice[id(p)] not in idx:
                    idx.append(indice[id(p)])
        tracos[el] = {"d": caminhos, "g": {n: sorted(v) for n, v in grupos.items()}}

    problemas = []
    pecas_usadas: dict[str, str] = {}
    for i in itens:
        k = i["k"]
        if k not in tracos:
            problemas.append(f"{k}: sem traços no KanjiVG")
            continue
        g = tracos[k]["g"]
        for p in i["pecas"]:
            if p != k and p not in g:
                problemas.append(f"{k}: o KanjiVG não tem a peça {p} (tem {''.join(g)})")
            pecas_usadas.setdefault(p, k)
        if k not in niveis:
            problemas.append(f"{k}: fora da lista do JLPT")
        leituras = {re.sub(r"[.\-].*$", "", x) if "." in x else x.replace("-", "") for x in kanjidic.get(k, {}).get("kun", [])}
        leituras |= {x.replace("-", "") for x in kanjidic.get(k, {}).get("on", [])}
        leituras |= {x.replace(".", "").replace("-", "") for x in kanjidic.get(k, {}).get("kun", [])}
        if i["leitura"] not in leituras:
            problemas.append(f"{k}: leitura {i['leitura']} não está no KANJIDIC2 ({' '.join(sorted(leituras))})")
        p = palavras.get(i["jp"])
        if not p or i["kana"] not in p["kana"]:
            problemas.append(f"{k}: palavra {i['jp']} ({i['kana']}) não está no JMdict com essa leitura ({p and p['kana']})")
        elif not p["comum"] and not palavras.get(sem_cortesia[i["jp"]], {}).get("comum"):
            problemas.append(f"{k}: palavra {i['jp']} não está marcada como comum no JMdict")
        if k not in i["jp"]:
            problemas.append(f"{k}: a palavra {i['jp']} não tem o kanji")

    # Desenho de cada peça sozinha: a entrada própria do KanjiVG ou, sem ela, os traços dela dentro do kanji.
    pecas_desenho = {}
    for p, host in pecas_usadas.items():
        if p in sozinhos:
            pecas_desenho[p] = {"d": sozinhos[p]}
        elif host in tracos and p in tracos[host]["g"]:
            pecas_desenho[p] = {"d": [tracos[host]["d"][i] for i in tracos[host]["g"][p]]}
        else:
            problemas.append(f"peça {p}: sem desenho")

    recorte = {
        "fonte": "KANJIDIC2, KRADFILE e JMdict (EDRDG, CC BY-SA 4.0); níveis do JLPT de davidluzgouveia/kanji-data (MIT)",
        "kanji": {k: {"nivel": niveis[k], **kanjidic.get(k, {"on": [], "kun": [], "tracos": 0}), "krad": krad.get(k, [])}
                  for k in sorted(niveis, key=lambda k: (niveis[k], k))},
        "palavras": dict(sorted(palavras.items())),
    }
    (SAIDA / "recorte.json").write_text(json.dumps(recorte, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    saida_tracos = {
        "fonte": "KanjiVG (Ulrich Apel e colaboradores, CC BY-SA 3.0)",
        "kanji": dict(sorted(tracos.items())),
        "pecas": dict(sorted(pecas_desenho.items())),
    }
    (SAIDA / "tracos.json").write_text(json.dumps(saida_tracos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(len(itens), "kanji no conteúdo,", len(pecas_usadas), "peças,", len(recorte["kanji"]), "kanji no recorte")
    for p in problemas:
        print("!", p)


if __name__ == "__main__":
    main()
