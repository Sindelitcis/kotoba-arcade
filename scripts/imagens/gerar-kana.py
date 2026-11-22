"""Escreve scripts/imagens/kana.json, a lista do estúdio para as ilustrações do Kana em imagens.

Cada item é o objeto do mnemônico de um kana (src/content/kana.ts): a imagem tem de mostrar
esse objeto com clareza, sem texto escrito. Os prompts seguem o jeito do Anima Turbo (tags e
uma frase curta), como as listas de gerar-listas.py.

    python -I scripts/imagens/gerar-kana.py

Os ajustes feitos depois de olhar as folhas (escolha à mão, candidata vetada) ficam em AJUSTES,
com o motivo.
"""
import json
import pathlib

BASE = "white background, simple background, black outline, clean lineart, flat color, anime coloring, cel shading, bright colors"
ESTILOS = {
    "objeto": f"no humans, object focus, single object, centered, {BASE}",
    "bicho": f"no humans, animal focus, solo, full body, centered, {BASE}",
    "cena": f"no humans, centered, {BASE}",
    "pessoa": f"solo, full body, {BASE}, casual clothes",
    "rosto": f"solo, upper body, {BASE}",
    "corpo": f"close-up, body part focus, {BASE}",
    "dupla": f"2people, full body, {BASE}, casual clothes",
}

# id, objeto (como em kana.ts), tipo, rótulo do CLIP, prompt
ITENS = [
    ("boca-aberta", "boca aberta", "rosto", "a person with a wide open mouth at the dentist", "1boy, sitting in a dentist chair, mouth wide open, saying aaa, small dentist mirror near the mouth"),
    ("ilha", "ilha", "cena", "a small island with two palm trees", "small round sand island in the blue sea, two coconut palm trees, one tall and one short"),
    ("orelha", "orelha", "corpo", "a human ear", "one human ear on its own, tan skin, thick dark outline, small round earring, small in the frame, lots of white space around it"),
    ("ema", "ema", "bicho", "an emu", "emu, large flightless bird, long neck, long legs, running, side view, one feather sticking up on the head"),
    ("tropeco", "tropeço", "pessoa", "a person tripping and falling", "1boy, tripping over a stone and falling forward, cap flying off the head, surprised face, motion lines"),
    ("mosquito", "mosquito", "bicho", "a mosquito", "one mosquito, side view, long thin proboscis pointing down, thin long legs, transparent wings"),
    ("chave", "chave", "objeto", "an old key", "one antique brass key, round bow, long shaft, big teeth"),
    ("bico-de-cuco", "bico de cuco", "objeto", "a cuckoo clock with the bird out", "cuckoo clock with a round clock face and hands, small cuckoo bird coming out of the little door above the clock face, beak wide open"),
    ("espeto-de-queijo", "espeto de queijo", "objeto", "cheese on a skewer", "two wooden skewers standing upright, grilled cheese cubes on the right skewer, golden crust"),
    ("cobra-enrolada", "cobra enrolada", "bicho", "a coiled snake", "one cute green snake coiled in two loops, smiling, lying in the sun"),
    ("saca-rolhas", "saca-rolhas", "objeto", "a corkscrew", "wine corkscrew, wooden T shaped handle, long spiral metal screw, cork stuck on the tip"),
    ("anzol", "anzol", "objeto", "a fishing hook", "one big fishing hook hanging from a fishing line, shiny metal, J shape, sharp barb"),
    ("canudo", "canudo", "objeto", "a drinking straw in juice", "glass of orange juice, long bendy drinking straw that makes a loop"),
    ("cerca", "cerca", "objeto", "a wooden fence", "short section of white wooden picket fence, grass at the bottom"),
    ("fumaca-da-sopa", "fumaça da sopa", "objeto", "a bowl of hot soup", "bowl of hot soup, wavy steam rising high above it"),
    ("tabuas", "tábuas", "objeto", "wooden planks", "two long wooden planks stacked on top of each other, wood grain, lumber"),
    ("mergulho", "mergulho", "pessoa", "a person jumping into a pool", "1boy, swim trunks, jumping into a swimming pool, belly flop, huge water splash"),
    ("tsunami", "tsunami", "cena", "a giant ocean wave", "one giant curling ocean wave, white foam, tiny boat"),
    ("teia", "teia", "bicho", "a spider hanging from a thread", "one black spider hanging down from a single silk thread, small spider web above"),
    ("martelo", "martelo", "objeto", "a hammer", "one claw hammer with wooden handle hitting a nail into a wooden board, impact star"),
    ("nadador", "nadador", "pessoa", "a person swimming", "1boy, swimming in the water, body horizontal, only head and arms above the water, freestyle stroke, swimming cap, goggles"),
    ("ninho", "ninho", "objeto", "a bird nest", "bird nest with three blue eggs on a tree branch"),
    ("nuvem-enrolada", "nuvem enrolada", "cena", "a curly rain cloud", "one curly swirly cloud, raindrops falling below"),
    ("gato", "gato", "bicho", "a cat", "orange cat lying down, full body, long tail curled around"),
    ("novelo", "novelo", "objeto", "a ball of yarn", "one ball of red yarn, loose thread"),
    ("risada", "risada", "rosto", "a person laughing out loud", "1boy, laughing out loud, mouth wide open, eyes closed, tears of joy, holding belly, green t-shirt"),
    ("sorriso", "sorriso", "rosto", "a person with a big smile", "1girl, big happy grin, showing teeth, eyes closed, blushing, giggling"),
    ("sopro", "sopro", "rosto", "a person blowing out birthday candles", "1girl, blowing out candles on a birthday cake, puffed cheeks, wind lines"),
    ("morrinho", "morrinho", "cena", "a small hill", "one small green hill, winding path to the top, sun"),
    ("chamine", "chaminé", "objeto", "a roof with a chimney", "snowy house roof, red brick chimney, smoke"),
    ("mastro", "mastro", "objeto", "a ship mast with sails", "tall wooden ship mast, two white square sails, rope coiled at the bottom"),
    ("nota-musical", "nota musical", "objeto", "a musical note", "one big black eighth note music symbol, round note head, straight stem, one flag, musical symbol"),
    ("vaca", "vaca", "bicho", "a cow", "cow, side view, horns, tail, mooing"),
    ("olho", "olho", "corpo", "an eye", "one anime eye, long eyelashes, sparkle in the iris"),
    ("isca", "isca", "objeto", "worms on a fishing hook", "fishing hook with two pink earthworms hanging from it, water drops"),
    ("iate", "iate", "objeto", "a white yacht", "white sailing yacht with one big open sail on the sea, side view"),
    ("peixe-no-anzol", "peixe no anzol", "bicho", "a fish on a fishing hook", "happy orange fish curled around a big fishing hook on a line, smiling"),
    ("ioio", "ioiô", "objeto", "a yo-yo", "red yo-yo hanging from its string, motion lines"),
    ("arara", "arara", "bicho", "a macaw parrot", "scarlet macaw sitting on a branch, crest feathers on the head"),
    ("siri", "siri", "bicho", "a crab", "small crab with two raised claws, on sand"),
    ("canguru", "canguru", "bicho", "a kangaroo", "kangaroo jumping, side view, big feet, long thick tail"),
    ("chute", "chute", "pessoa", "a person kicking a ball", "1boy, soccer player in red jersey kicking a soccer ball, leg swinging, effort face, side view"),
    ("garoto-gritando", "garoto gritando", "pessoa", "a boy shouting", "1boy, side view, calling a friend far away, both hands cupped around the open mouth like a megaphone"),
    ("abraco", "abraço", "dupla", "two people hugging", "1boy, 1girl, two friends hugging each other tightly, happy"),
    ("surfista", "surfista", "pessoa", "a surfer on a wave", "1boy, surfing, standing on a surfboard, riding a blue wave, arms open"),
    ("prancha-de-surfe", "prancha de surfe", "objeto", "a surfboard", "one surfboard standing upright in beach sand"),
    ("pensando", "pensando", "pessoa", "a person thinking", "1girl, sitting on the floor, one leg stretched, hand on chin, thinking, thought bubble above the head"),
    ("machado", "machado", "objeto", "an axe in a tree trunk", "one axe stuck in a tree stump, wood chips"),
    ("pessoa-encostada", "pessoa encostada", "pessoa", "a person leaning on a lamp post", "1man, brown coat, leaning his shoulder against a street lamp post, whole body tilted, legs crossed"),
    ("fantasma-de-capuz", "fantasma de capuz", "objeto", "a ghost wearing a hood", "cute little ghost wearing a purple hood, floating, wavy tail"),
    ("elevador", "elevador", "objeto", "an elevator with open doors", "elevator with the doors open, empty elevator car, call buttons beside it"),
    ("susto", "susto", "rosto", "a scared surprised person", "1boy, very surprised, wide eyes, mouth wide open, hands up, colorful hoodie"),
    ("conteiner", "contêiner", "objeto", "a shipping container", "one blue shipping container, doors open on the side"),
    ("sacola", "sacola", "objeto", "a shopping bag", "one paper shopping bag with two handles"),
    ("vento-com-chuva", "vento com chuva", "cena", "an umbrella in wind and rain", "red umbrella turned inside out by strong wind, heavy diagonal rain"),
    ("colher-pingando", "colher pingando", "objeto", "a spoon dripping soup", "one spoon dripping soup drops into a bowl"),
    ("tabua-no-bico", "tábua no bico", "bicho", "a bird carrying a plank", "small bird flying, carrying a wooden plank in its beak"),
    ("antena-de-tv", "antena de TV", "objeto", "a TV antenna on a roof", "old television antenna on a house roof"),
    ("tronco", "tronco", "bicho", "a woodpecker on a tree trunk", "woodpecker pecking a tree trunk that has one branch"),
    ("numero-dois", "número dois", "corpo", "a hand making a peace sign", "one hand showing two fingers, peace sign, no face"),
    ("raio-na-nuvem", "raio na nuvem", "cena", "a storm cloud with lightning", "dark storm cloud, big yellow lightning bolt coming out of it"),
    ("bandeira-ao-vento", "bandeira ao vento", "objeto", "a flag waving in the wind", "big red flag on a tall pole, cloth waving in strong wind"),
    ("arvore-de-natal", "árvore de Natal", "objeto", "a christmas tree", "decorated christmas tree, star on top, two big ornaments"),
    ("fatia-de-pizza", "fatia de pizza", "objeto", "a slice of pizza", "one triangular slice of pizza pointing down, pepperoni, melted cheese"),
    ("minhocas", "minhocas", "bicho", "earthworms coming out of the soil", "three pink earthworms coming out of brown soil"),
    ("tapa-olho", "tapa-olho", "rosto", "a pirate with an eye patch", "1boy, young pirate, black eye patch over one eye, red bandana, grin"),
    ("banheira", "banheira", "objeto", "a bathtub", "white bathtub full of hot water, steam, side view, rubber duck"),
    ("geladeira-de-iogurte", "geladeira de iogurte", "objeto", "a fridge full of yogurt", "open refrigerator, three shelves full of plain white cups, blank cups, no labels"),
    ("estrada-comprida", "estrada comprida", "cena", "a long straight road", "long straight road going to the horizon, flat green fields"),
]

# Ajustes depois de olhar as folhas: {"id": seed} escolhida à mão, e as vetadas, com o motivo.
ESCOLHA: dict[str, int] = {
    "antena-de-tv": 10002,  # as outras parecem caixa de ar-condicionado no telhado
    "bandeira-ao-vento": 10001,  # bandeira grande; nas outras ela fica pequena no canto
    "fumaca-da-sopa": 10001,  # a 10002 tem creme caindo, sem fumaça
    "isca": 10001,  # minhocas no anzol; as outras parecem camarão
    "elevador": 10003,  # as outras têm número escrito no painel
    "mergulho": 10002,  # a 10003 sai da piscina pela escada
    "morrinho": 10002,
    "teia": 10003,  # a única com a teia em cima
    "sopro": 10002,
    "sorriso": 10002,  # a 10003 tem uma marca de logotipo no canto
    "susto": 10001,  # o CLIP reprova todas, mas o susto está claro
    "risada": 10002,  # o CLIP reprova todas; a risada está clara
    "numero-dois": 12002,  # mão fazendo V; o modelo de visão reclama do pulso cortado
    # Segunda leva de prompt:
    "bico-de-cuco": 10022,  # relógio com o cuco saindo da portinha
    "garoto-gritando": 10022,  # o megafone saiu no lugar das mãos, mas o chamado está claro
    "geladeira-de-iogurte": 10023,  # potes brancos sem rótulo (com rótulo o modelo escreve letras falsas)
    "martelo": 10022,
    "nota-musical": 10023,
    "nadador": 10022,  # nadando na água; as da primeira leva pareciam o mergulho
    "saca-rolhas": 10022,
    "orelha": 11021,  # pele morena: o recorte do fundo não apaga a borda
}
# Prompts trocados depois da primeira folha: estas candidatas eram de outro prompt e mostravam outra coisa.
VETADAS: list[str] = [
    f"{i}-{s}"
    for i in ("bico-de-cuco", "garoto-gritando", "geladeira-de-iogurte", "martelo", "nota-musical", "nadador", "saca-rolhas")
    for s in (10001, 10002, 10003, 11001, 11002, 11003, 12001, 12002, 12003)
] + [
    # Orelha em close encosta na borda e o recorte do fundo apaga a pele clara: prompt novo com margem.
    f"orelha-{s}" for s in (10001, 10002, 10003, 11001, 11002, 11003, 12001, 12002, 12003)
]

# Itens com prompt novo ganham seeds novas (as antigas já existem e estão vetadas).
SEEDS: dict[str, list[int]] = {
    i: [21, 22, 23]
    for i in ("bico-de-cuco", "garoto-gritando", "geladeira-de-iogurte", "martelo", "nota-musical", "nadador", "saca-rolhas", "orelha")
}


def lista() -> dict:
    return {
        "lote": "kana",
        "destino": "src/assets/kana",
        "largura": 896,
        "altura": 896,
        "saida": 384,
        "recorte": True,
        "estilo": ESTILOS["objeto"],
        "negativo": "multiple panels, frame, border, photo, realistic, 3d, gradient background, drop shadow, text, letters, english text, japanese text, kanji, numbers, logo, watermark, signature",
        "distratores": ["a letter of the alphabet", "a landscape", "a room"],
        "seeds": [1, 2, 3],
        "desde_seed": 10000,
        "escolha": ESCOLHA,
        "vetadas": VETADAS,
        "itens": [
            {"id": i, "objeto": o, "rotulo": r, "prompt": p, **({"estilo": ESTILOS[t]} if t != "objeto" else {}), **({"seeds": SEEDS[i]} if i in SEEDS else {})}
            for i, o, t, r, p in ITENS
        ],
    }


if __name__ == "__main__":
    destino = pathlib.Path(__file__).with_name("kana.json")
    destino.write_text(json.dumps(lista(), ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(len(ITENS), "itens em", destino)
