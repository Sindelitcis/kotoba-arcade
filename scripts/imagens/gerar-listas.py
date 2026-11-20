"""Escreve as listas de prompts do vocabulário em imagem (objetos.json, acoes.json, lugares.json).

As listas são o que o estúdio lê (scripts/estudio.py). Este arquivo só existe para manter os
prompts num lugar legível: rode `python scripts/imagens/gerar-listas.py` depois de mudar algo aqui.
O conteúdo dos jogos (palavra, kana, significado) fica em src/content/imagens.ts e aponta para o id.
Ajustes feitos depois de olhar as folhas (vetadas, escolha) ficam em AJUSTES, no fim.
"""
import json
import pathlib

AQUI = pathlib.Path(__file__).resolve().parent

OBJ_ESTILO = (
    "no humans, object focus, still life, single object, centered, white background, simple background, "
    "black outline, clean lineart, flat color, anime coloring, cel shading, bright colors"
)
OBJ_NEG = (
    "multiple objects, duplicate, frame, border, photo, realistic, 3d, scenery, person, hands, gradient background, "
    "drop shadow, cast shadow, glossy, rainbow, iridescent, holographic, sticker, price tag, "
    "text, letters, english text, japanese text, kanji, numbers, logo, label, brand name, watermark, signature"
)

# id, rótulo do CLIP, prompt
# Saíram depois de três rodadas sem nenhuma imagem que se reconheça sem texto escrito:
# 雑誌, 新聞, カード, 切符, 名刺, 紙, 目薬, 絆創膏, 歯磨き粉, 雨, 太陽, 雪だるま e o guarda-chuva branco.
OBJETOS = [
    # quarto
    ("hon", "a book", "one closed hardcover book"),
    ("tsukue", "a desk", "wooden study desk with drawers, side view"),
    ("isu", "a chair", "one wooden chair, side view"),
    ("beddo", "a bed", "single bed with blanket and pillow, side view"),
    ("makura", "a pillow", "one white pillow"),
    ("tokei", "a clock", "round wall clock with hands, no numbers"),
    ("terebi", "a television", "flat screen television on stand, black screen"),
    ("pasokon", "a laptop computer", "small open laptop computer, dark blank screen, centered, wide empty white margin all around"),
    ("sumaho", "a smartphone", "one smartphone, black screen"),
    ("megane", "eyeglasses", "pair of eyeglasses, black frame"),
    ("udedokei", "a wristwatch", "one wristwatch seen from the front, round white dial with two black hands, brown leather strap curved in a circle"),
    ("kutsushita", "socks", "pair of socks"),
    ("zubon", "trousers", "pair of blue jeans, trousers, folded flat"),
    ("koto", "a coat", "long winter coat on hanger"),
    ("shashin", "a framed photo", "framed photograph of a mountain landscape, picture frame"),
    ("hana", "a flower", "one red tulip flower in a small vase"),
    ("gomibako", "a trash can", "small trash can, wastebasket"),
    ("kagi", "a key", "one metal house key"),
    ("saifu", "a wallet", "brown leather wallet, closed"),
    ("noto", "a notebook", "closed spiral notebook, blank cover"),
    ("pen", "a pen", "one ballpoint pen"),
    ("enpitsu", "a pencil", "one yellow wooden pencil, sharpened"),
    ("keshigomu", "an eraser", "one white rubber eraser"),
    ("hasami", "scissors", "pair of scissors, open"),
    ("hako", "a cardboard box", "closed cardboard box"),
    ("nuigurumi", "a teddy bear", "brown teddy bear plush toy, sitting"),
    ("gita", "a guitar", "one small acoustic guitar lying diagonally, zoomed out, the entire guitar visible including the headstock and tuning pegs, wide empty white margin all around"),
    ("kagami", "a mirror", "round standing mirror on stand"),
    ("taoru", "a towel", "folded blue towel"),
    ("haburashi", "a toothbrush", "one toothbrush lying diagonally, blue plastic handle, white bristles at the end"),
    ("hondana", "a bookshelf", "empty wooden bookshelf, three empty shelves, front view, nothing on the shelves"),
    ("sofa", "a sofa", "green two-seat sofa, front view"),
    ("teburu", "a table", "wide rectangular wooden dining table, front view, four legs, empty tabletop"),
    ("eakon", "an air conditioner", "long white wall-mounted split air conditioner unit, front view, horizontal vent at the bottom"),
    ("sutando", "a desk lamp", "desk lamp, adjustable arm"),
    ("kamera", "a camera", "black digital camera"),
    ("tegami", "an envelope", "closed white envelope, letter"),
    # cozinha
    ("reizouko", "a refrigerator", "white refrigerator, two doors, front view"),
    ("denshirenji", "a microwave oven", "white microwave oven, front view"),
    ("suihanki", "a rice cooker", "white electric rice cooker"),
    ("nabe", "a cooking pot", "metal cooking pot with lid and two handles"),
    ("furaipan", "a frying pan", "black frying pan"),
    ("houchou", "a kitchen knife", "japanese kitchen knife"),
    ("manaita", "a cutting board", "wooden cutting board, empty"),
    ("sara", "a plate", "empty white plate"),
    ("chawan", "a rice bowl", "empty japanese rice bowl, chawan"),
    ("hashi", "chopsticks", "pair of wooden chopsticks lying side by side"),
    ("supun", "a spoon", "one metal spoon"),
    ("foku", "a fork", "one metal fork"),
    ("koppu", "a glass of water", "clear drinking glass of water"),
    ("kappu", "a coffee cup", "white coffee cup with saucer, steam"),
    ("yakan", "a kettle", "metal kettle"),
    ("tamago", "an egg", "one white chicken egg"),
    ("gyunyu", "a carton of milk", "milk carton with gable top, white carton with blue cow spots, blank"),
    ("pan", "bread", "loaf of bread"),
    ("gohan", "a bowl of rice", "bowl of white rice"),
    ("ringo", "an apple", "one red apple"),
    ("mikan", "a mandarin orange", "one mandarin orange with leaf"),
    ("banana", "a banana", "bunch of yellow bananas"),
    ("ichigo", "a strawberry", "one red strawberry"),
    ("tomato", "a tomato", "one red tomato"),
    ("ninjin", "a carrot", "one orange carrot with green leaves"),
    ("tamanegi", "an onion", "one brown onion"),
    ("kyabetsu", "a cabbage", "one green cabbage"),
    ("sakana", "a fish", "one whole raw fish"),
    ("niku", "a piece of meat", "raw red meat steak"),
    ("budou", "grapes", "bunch of purple grapes"),
    ("suika", "a watermelon", "slice of watermelon"),
    ("jagaimo", "a potato", "one potato"),
    # comida e bebida
    ("ocha", "a cup of green tea", "japanese teacup of green tea, yunomi"),
    ("koohii", "a coffee can", "one small steel drink can, plain brown and cream stripes, blank"),
    ("mizu", "a bottle of water", "plastic bottle of water, plain label"),
    ("jusu", "a glass of orange juice", "glass of orange juice"),
    ("biru", "a mug of beer", "glass beer mug with handle, golden beer and thick white foam on top"),
    ("onigiri", "an onigiri rice ball", "one triangle onigiri, white rice, rectangular black nori sheet wrapped at the bottom, front view"),
    ("bento", "a bento lunch box", "japanese bento lunch box, open, rice and side dishes"),
    ("sandoitchi", "a sandwich", "triangle sandwich"),
    ("aisu", "an ice cream cone", "ice cream cone"),
    ("okashi", "a bag of snacks", "bag of potato chips, plain orange bag with a picture of chips, blank"),
    ("ramen", "a bowl of ramen", "bowl of ramen noodles with egg and chashu"),
    ("sushi", "sushi", "two pieces of nigiri sushi on wooden plate"),
    ("tenpura", "tempura", "shrimp tempura on plate"),
    ("kare", "curry rice", "plate of japanese curry rice"),
    ("udon", "a bowl of udon", "bowl of udon noodles"),
    ("misoshiru", "miso soup", "bowl of miso soup with tofu"),
    ("keki", "a slice of cake", "slice of strawberry shortcake"),
    ("gyoza", "gyoza dumplings", "plate of gyoza dumplings"),
    ("yakitori", "yakitori skewers", "yakitori, grilled chicken skewers"),
    ("edamame", "edamame beans", "bowl of green edamame pods"),
    ("shoyu", "a soy sauce bottle", "small glass soy sauce dispenser with red cap, dark brown sauce, blank"),
    ("cupramen", "a cup noodle", "cup noodles, instant ramen cup with lid"),
    ("donburi", "a donburi bowl", "katsudon in a donburi bowl"),
    # konbini e loja
    ("tana", "a store shelf", "empty white metal store shelf unit, three empty shelves, front view, nothing on the shelves"),
    ("reji", "a cash register", "cash register machine"),
    ("denchi", "batteries", "two AA batteries"),
    ("kago", "a shopping basket", "plastic shopping basket with handles, empty"),
    ("fukuro", "a plastic bag", "white plastic shopping bag, empty"),
    ("kitte", "a postage stamp", "one postage stamp with flower picture, perforated edge"),
    ("okane", "coins", "pile of gold and silver coins"),
    # farmácia
    ("kusuri", "medicine pills", "white medicine pills and a pill bottle"),
    ("masuku", "a face mask", "white surgical face mask"),
    ("taionkei", "a thermometer", "digital thermometer"),
    ("houtai", "a roll of bandage", "one roll of white gauze bandage, partly unrolled strip, side view"),
    ("shanpu", "a shampoo bottle", "shampoo pump bottle, plain"),
    ("sekken", "a bar of soap", "one bar of soap"),
    ("tisshu", "a tissue box", "tissue box with tissue sticking out"),
    # escritório
    ("denwa", "a desk telephone", "office desk telephone with handset"),
    ("kopiki", "a photocopier", "large office photocopier machine"),
    ("fairu", "a file folder", "blue ring binder file folder"),
    ("hotchikisu", "a stapler", "black stapler"),
    ("karenda", "a wall calendar", "wall calendar with blank grid, no numbers"),
    ("nekutai", "a necktie", "one red striped necktie laid flat, full length, knot at top, pointed tip at bottom"),
    ("howaitobodo", "a whiteboard", "blank whiteboard on stand"),
    ("purinta", "a printer", "office printer"),
    ("hanko", "a stamp seal", "one cylindrical japanese name seal stamp, hanko, standing upright, red ink on the bottom, small round red ink pad beside it"),
    ("kanyoshokubutsu", "a potted plant", "green leafy potted plant"),
    # rua e estação
    ("basu", "a bus", "city bus, side view"),
    ("takushi", "a taxi", "japanese taxi car, side view"),
    ("densha", "a train", "commuter train car, side view"),
    # jitensha: o de antes saía com a roda cortada ou com rabisco embaixo.
    ("jitensha", "a bicycle", "one whole bicycle, side view, both wheels fully visible, entire bicycle inside the frame, centered"),
    ("shingou", "a traffic light", "traffic light on pole, green light"),
    ("ki", "a tree", "one green tree"),
    ("posuto", "a mailbox", "red japanese post box, mailbox"),
    ("jihanki", "a vending machine", "drink vending machine, front view, no text"),
    ("inu", "a dog", "shiba inu dog standing, full body, side view, four legs, curled tail"),
    # neko: o de antes saiu de costas, com o rabo virado mancha solta. De lado, inteiro, sem dúvida.
    ("neko", "a cat", "one cat sitting, full body, side view, head turned to viewer, four legs, tail attached to body"),
    ("tori", "a bird", "small sparrow bird"),
    ("ie", "a house", "small japanese house"),
    ("benchi", "a bench", "wooden park bench"),
    ("suutsukesu", "a suitcase", "rolling suitcase"),
    ("ryukku", "a backpack", "backpack"),
    ("chizu", "a map", "unfolded paper map, green parks, blue river, red route line, blank"),
    ("kaidan", "stairs", "staircase, steps"),
    ("chouchin", "a paper lantern", "red japanese paper lantern, chochin, no text"),
    ("baiku", "a motorcycle", "scooter motorcycle, side view"),
    ("ame-kyandi", "a candy", "one round hard candy in a clear wrapper twisted at both ends, side view"),
    ("kumo", "a cloud", "one white fluffy cloud"),
    ("tsuki", "the moon", "one yellow crescent moon, simple shape"),
    ("yama", "a mountain", "mount fuji, mountain"),
    ("umi", "the sea", "small square view of the blue sea, horizon line, calm waves, light blue sky above"),
]

# Objetos em quatro cores, para "あかいかさ" e afins na Cena Viva.
CORES = [("aka", "red"), ("ao", "blue"), ("kuro", "black"), ("shiro", "white")]
COLORIDOS = [
    ("kasa", "umbrella", "open umbrella seen from the side, dome canopy, curved J handle"),
    ("kaban", "bag", "shoulder bag"),
    ("kuruma", "car", "small car, side view"),
    ("boushi", "hat", "baseball cap"),
    ("kutsu", "shoes", "pair of sneakers"),
    ("shatsu", "t-shirt", "short sleeve t-shirt laid flat, front view, plain, no print, round collar"),
]
# O guarda-chuva branco some no fundo branco e vira caneta para o CLIP e para o olho.
SEM_IMAGEM = {"kasa-shiro"}

for cid, en, prompt in COLORIDOS:
    for sufixo, cor in CORES:
        if f"{cid}-{sufixo}" in SEM_IMAGEM:
            continue
        # Preto saía cinza e branco sumia no fundo branco: os dois ganham um reforço.
        reforco = {"kuro": ", jet black, very dark", "shiro": ", pure white with soft light grey shading, thick black outline"}.get(sufixo, "")
        OBJETOS.append((f"{cid}-{sufixo}", f"a {cor} {en}", f"{cor} {prompt}, entirely {cor}{reforco}"))

ACAO_ESTILO = (
    "solo, full body, white background, simple background, black outline, clean lineart, flat color, anime coloring, "
    "cel shading, bright colors, casual clothes"
)
ACAO_NEG = "multiple people, crowd, frame, border, photo, realistic, 3d, scenery, gradient background, drop shadow, cropped feet, text, letters, logo"

# id, rótulo, prompt
ACOES = [
    ("taberu", "a person eating a meal", "1girl, sitting at small table, eating rice from bowl with chopsticks, mouth open"),
    ("nomu", "a person drinking", "1boy, standing, drinking from a glass, head tilted back"),
    ("yomu", "a person reading a book", "1girl, sitting, reading an open book, looking at book"),
    ("kaku", "a person writing on a whiteboard", "1boy, standing, side view, writing on a whiteboard with a marker, arm raised"),
    ("neru", "a person sleeping", "1boy, sleeping, lying down, eyes closed, futon, blanket"),
    ("hashiru", "a person running", "1girl, running, motion lines, sportswear"),
    ("aruku", "a person walking", "1boy, walking, side view, calm"),
    ("suwaru", "a person sitting on a chair", "1girl, sitting on chair, hands on lap, chair"),
    ("tatsu", "a person standing", "1boy, standing straight, arms at sides, front view"),
    ("denwasuru", "a person talking on the phone", "1girl, standing, side view, holding a smartphone against her ear with one hand, talking, open mouth"),
    ("ryouri", "a person cooking", "1boy, apron, cooking, stirring frying pan on stove"),
    ("arau", "a person washing dishes", "1girl, apron, washing dishes at sink, water, sponge"),
    ("utau", "a person singing", "1girl, singing into microphone, open mouth, music notes"),
    ("naku", "a person crying", "1boy, crying, tears, sad"),
    ("warau", "a person laughing", "1girl, laughing, big smile, closed eyes, happy"),
    ("kiku", "a person listening to music", "1boy, wearing headphones, listening to music, eyes closed"),
    ("souji", "a person cleaning with a vacuum", "1girl, cleaning floor with vacuum cleaner"),
    ("odoru", "a person dancing", "1girl, dancing, dynamic pose"),
    ("hakobu", "a person carrying a box", "1boy, carrying large cardboard box with both arms"),
    ("oyogu", "a person swimming", "1boy, swimming, front crawl stroke, body horizontal in the water, one arm reaching forward over the water, face in the water, side view, swim cap, goggles"),
    ("toru", "a person taking a photo", "1girl, holding camera up to face, taking photo"),
    # 待つ saiu: em três rodadas nenhuma imagem mostrou, sem dúvida, alguém esperando.
    ("kau", "a person shopping with a basket", "1girl, standing, holding a shopping basket full of vegetables and bread in one hand and a wallet in the other"),
    ("benkyou", "a person studying", "1boy, studying at desk, textbook, notebook, pencil, thinking"),
]

LUGAR_ESTILO = (
    "no humans, scenery, empty room, wide shot, eye level, interior, clean lineart, anime background, cel shading, "
    "bright natural light, detailed background"
)
LUGAR_NEG = "people, text, sign, letters, clutter, frame, border, photo, realistic, 3d, neon, dark"

LUGARES = [
    ("konbini", "an empty convenience store interior", "inside japanese convenience store, empty floor, white tiled floor, bare walls, glass door, bright ceiling lights"),
    ("eki", "a train station platform", "japanese train station platform, empty, yellow tactile paving, roof, railway tracks"),
    ("heya", "an empty bedroom", "empty japanese apartment bedroom, wooden floor, white walls, window with curtains, daylight"),
    ("jimusho", "an empty office", "empty japanese office room, grey carpet floor, white walls, large windows, city view"),
    ("daidokoro", "an empty kitchen", "japanese home kitchen, counter, sink, wooden floor, window, empty counter"),
    ("yakkyoku", "an empty pharmacy interior", "inside japanese pharmacy, pharmacist counter at the back, green cross sign on the wall, white walls, shelves with medicine boxes, empty floor, clean, bright"),
    ("resutoran", "an empty restaurant interior", "inside small japanese restaurant, wooden walls, wooden floor, warm light, noren curtain, empty"),
    ("michi", "a residential street", "japanese residential street, asphalt road, sidewalk, houses in background, blue sky, utility poles, empty street"),
]

# Depois de olhar as folhas: candidatas vetadas (passaram no CLIP mas ensinam errado) e escolhas à mão.
AJUSTES: dict[str, dict] = {
    # teburu: a mesa larga (seed 3) cabe as coisas da cena; a quadradinha que o CLIP preferiu, não.
    # neko: no Anima, a seed 10003 é o gato inteiro de lado com o rabo ligado; a 10002 tem uma assinatura falsa no canto.
    # tsuki: a 10001 é a lua crescente limpa. gita: as de antes saíam com o braço cortado ou deformadas.
    "objetos": {"escolha": {"teburu": 3, "neko": 10003, "tsuki": 10001},
                "vetadas": ["gita-2", "gita-10001", "gita-10002", "gita-10003"]},
    # warau: o CLIP achava "dançando", mas a seed 2 é uma pessoa rindo de olho fechado, sem dúvida a olho.
    # oyogu: as seis primeiras do Anima mostram um menino parado na borda da piscina, não nadando.
    "acoes": {"escolha": {"warau": 2}, "vetadas": [f"oyogu-{s}" for s in (10001, 10002, 10003, 11001, 11002, 11003)]},
    "lugares": {},
}


def escrever(nome, dados):
    dados.update(AJUSTES[nome])
    (AQUI / f"{nome}.json").write_text(json.dumps(dados, indent=1, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


escrever("objetos", {
    "lote": "objetos", "destino": "src/assets/imagens", "largura": 896, "altura": 896,
    "saida": 384, "recorte": True, "estilo": OBJ_ESTILO, "negativo": OBJ_NEG, "seeds": [1, 2, 3],
    "distratores": ["a person", "a room", "a toy"],
    "itens": [{"id": i, "rotulo": r, "prompt": p} for i, r, p in OBJETOS],
})
escrever("acoes", {
    "lote": "acoes", "destino": "src/assets/acoes", "largura": 832, "altura": 1216,
    "saida": 512, "recorte": True, "estilo": ACAO_ESTILO, "negativo": ACAO_NEG, "seeds": [1, 2, 3],
    "distratores": ["a person posing", "a group of people", "an object"],
    "itens": [{"id": i, "rotulo": r, "prompt": p} for i, r, p in ACOES],
})
escrever("lugares", {
    "lote": "lugares", "destino": "src/assets/lugares", "largura": 1216, "altura": 832,
    "saida": 960, "recorte": False, "estilo": LUGAR_ESTILO, "negativo": LUGAR_NEG, "seeds": [1, 2, 3],
    "distratores": ["a crowded room full of people", "a forest", "a shrine"],
    "itens": [{"id": i, "rotulo": r, "prompt": p} for i, r, p in LUGARES],
})
print(len(OBJETOS), "objetos,", len(ACOES), "ações,", len(LUGARES), "lugares")
