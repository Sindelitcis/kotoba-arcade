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

# Partes do corpo: o estilo dos objetos diz "no humans", que apaga a mão ou o rosto. Elas usam este.
CORPO_ESTILO = (
    "body part focus, close-up, centered, white background, simple background, "
    "black outline, clean lineart, flat color, anime coloring, cel shading, bright colors"
)
CORPO = {"te", "ashi", "me", "mimi", "kuchi", "ha", "kao"}

# id, rótulo do CLIP, prompt
# Saíram depois de três rodadas sem nenhuma imagem que se reconheça sem texto escrito:
# 雑誌, 新聞, カード, 切符, 名刺, 紙, 目薬, 絆創膏, 歯磨き粉, 雨, 太陽, 雪だるま e o guarda-chuva branco.
# Na segunda leva (Anima) saíram せんべい (virava biscoito ou pão), イヤホン (um rolo de fio) e
# 横断歩道 (a faixa vinha com um carro ou um poste no meio), sem candidata que se reconheça.
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
    ("sakana", "a fish", "one whole fish, side view, silver scales, fins and tail, mackerel"),
    ("niku", "a piece of meat", "raw red meat steak"),
    ("budou", "grapes", "bunch of purple grapes"),
    ("suika", "a watermelon", "slice of watermelon"),
    ("jagaimo", "a potato", "one potato"),
    # comida e bebida
    ("ocha", "a cup of green tea", "japanese teacup of green tea, yunomi"),
    ("koohii", "a coffee can", "one small steel drink can, plain brown and cream stripes, blank"),
    ("mizu", "a bottle of water", "transparent plastic water bottle, blank, unlabeled, no sticker, blue cap"),
    ("jusu", "a glass of orange juice", "glass of orange juice"),
    ("biru", "a mug of beer", "glass beer mug with handle, golden beer and thick white foam on top"),
    ("onigiri", "an onigiri rice ball", "one triangle onigiri, white rice, rectangular black nori sheet wrapped at the bottom, front view"),
    ("bento", "a bento lunch box", "japanese bento lunch box, open, rice and side dishes"),
    ("sandoitchi", "a sandwich", "triangle sandwich"),
    ("aisu", "an ice cream cone", "ice cream cone"),
    ("okashi", "snacks and sweets on a plate", "white plate with round rice crackers, cookies and colorful candy balls"),
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
    ("cupramen", "a cup noodle", "plain white paper cup of instant ramen seen from above at an angle, paper lid peeled back, curly noodles inside, completely plain cup"),
    ("donburi", "a donburi bowl", "large ceramic donburi bowl, rice topped with fried pork cutlet and egg, katsudon, lid beside it"),
    # konbini e loja
    ("tana", "a store shelf", "empty white metal store shelf unit, three empty shelves, front view, nothing on the shelves"),
    ("reji", "a cash register", "cash register machine"),
    ("denchi", "batteries", "two AA batteries"),
    ("kago", "a shopping basket", "plastic shopping basket with handles, empty"),
    ("fukuro", "a plastic bag", "white plastic shopping bag, empty"),
    ("kitte", "a postage stamp", "one postage stamp with flower picture, perforated edge"),
    ("okane", "coins", "pile of gold and silver coins"),
    # farmácia
    ("kusuri", "medicine pills", "white round medicine tablets and capsules in a silver blister pack, no bottle"),
    ("masuku", "a face mask", "white surgical face mask"),
    ("taionkei", "a thermometer", "digital thermometer"),
    ("houtai", "a roll of bandage", "one roll of white gauze bandage, partly unrolled strip, side view"),
    ("shanpu", "a shampoo bottle", "transparent pump bottle filled with pink liquid soap, no label, soap bubbles around"),
    ("sekken", "a bar of soap", "one white rectangular bar of soap on a small soap dish, soap bubbles, no bottle"),
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
    ("hanko", "a stamp seal", "one plain black cylindrical japanese seal stamp, hanko, lying on its side, blank, no characters, no engraving, small round red ink pad beside it"),
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
    ("jihanki", "a vending machine", "red drink vending machine, front view, rows of plain colored bottles, blank panels, unlabeled"),
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
    # Segunda leva (Anima Turbo): palavras do arcade e da Jornada que dá para desenhar sem texto.
    # bichos
    ("usagi", "a rabbit", "one white rabbit sitting, full body, side view, long ears"),
    ("kingyo", "a goldfish", "one orange goldfish, side view, fins and tail"),
    ("kame", "a turtle", "one green turtle walking, full body, side view, shell"),
    ("nezumi", "a mouse", "one small grey mouse, full body, side view, long thin tail"),
    ("saru", "a monkey", "one japanese macaque monkey sitting, full body, red face"),
    ("chou", "a butterfly", "one yellow butterfly, wings open, top view"),
    ("niwatori", "a chicken", "one white hen chicken standing, full body, side view, red comb"),
    # comida
    ("yasai", "vegetables", "small basket full of assorted vegetables, carrot, cabbage, tomato, eggplant, green pepper"),
    ("kudamono", "fruits", "small basket full of assorted fruits, apple, banana, grapes, orange"),
    ("chiizu", "a piece of cheese", "one yellow wedge of cheese with round holes"),
    ("teishoku", "a japanese set meal", "japanese set meal on a wooden tray, bowl of rice, bowl of miso soup, grilled fish on a plate, small side dish, view from above at an angle"),
    ("remon", "a lemon", "one yellow lemon"),
    ("momo", "a peach", "one pink peach with a green leaf"),
    ("meron", "a melon", "one round green melon with net pattern skin"),
    ("kyuri", "a cucumber", "one long green cucumber"),
    ("nasu", "an eggplant", "one purple japanese eggplant with green stem"),
    ("daikon", "a daikon radish", "one long white daikon radish with green leaves"),
    ("toumorokoshi", "an ear of corn", "one ear of yellow corn, green husk partly open"),
    ("kabocha", "a pumpkin", "one dark green japanese kabocha squash"),
    ("toufu", "a block of tofu", "one white block of tofu on a small plate"),
    ("natto", "natto", "small white styrofoam pack of natto, lid open, sticky brown fermented soybeans"),
    ("hanbaga", "a hamburger", "one hamburger, bun, beef patty, lettuce, cheese"),
    ("piza", "a pizza", "one whole round pizza, view from above, tomato sauce, cheese, slices"),
    ("supagetti", "spaghetti", "plate of spaghetti with tomato sauce, fork"),
    ("oden", "oden", "oden in a paper cup, daikon slice, boiled egg, fishcake on a skewer, broth"),
    ("karaage", "fried chicken", "plate of japanese fried chicken karaage pieces with a lemon wedge"),
    ("nikuman", "a steamed meat bun", "one white steamed meat bun, nikuman, round, twisted top"),
    ("soba", "soba noodles", "cold soba noodles on a bamboo tray, small cup of dipping sauce beside"),
    ("takoyaki", "takoyaki", "six takoyaki balls in a boat-shaped tray, brown sauce, mayonnaise, bonito flakes"),
    ("okonomiyaki", "okonomiyaki", "one okonomiyaki pancake on a plate, brown sauce, mayonnaise lines, green seaweed flakes"),
    ("sashimi", "sashimi", "plate of sliced raw tuna and salmon sashimi, green shiso leaf"),
    ("dango", "dango", "three round dango on one wooden skewer, pink, white and green"),
    ("choko", "a chocolate bar", "one chocolate bar, partly unwrapped, plain red wrapper, squares of chocolate"),
    ("kukki", "cookies", "three round brown cookies with chocolate chips"),
    ("donatsu", "a donut", "one donut with pink frosting and sprinkles"),
    ("purin", "a custard pudding", "one japanese custard pudding with brown caramel on top, on a small plate"),
    ("wain", "a glass of red wine", "one wine glass with red wine"),
    ("sake", "a sake set", "white ceramic sake flask tokkuri and one small sake cup, blank"),
    ("suitou", "a water bottle", "one tall metal thermos water bottle with cap, plain"),
    # casa e roupa
    ("mado", "a window", "one closed window with wooden frame and glass panes, front view, no curtains"),
    ("doa", "a door", "one closed wooden door with a round doorknob, front view"),
    ("sentakuki", "a washing machine", "white front-loading washing machine, round glass door, front view"),
    ("soujiki", "a vacuum cleaner", "one upright vacuum cleaner"),
    ("senpuki", "an electric fan", "white electric fan on a stand, round blade guard"),
    ("hanga", "a clothes hanger", "one empty wooden clothes hanger"),
    ("futon", "a futon", "folded japanese futon mattress and blanket, stacked, pillow on top"),
    ("kaaten", "curtains", "pair of blue window curtains hanging from a rod"),
    ("surippa", "slippers", "pair of indoor slippers"),
    ("kimono", "a kimono", "red japanese kimono with floral pattern, displayed spread on a stand, front view"),
    ("tebukuro", "gloves", "pair of knitted winter gloves"),
    ("mafura", "a scarf", "red knitted winter scarf, loosely coiled"),
    ("seta", "a sweater", "knitted sweater laid flat, front view"),
    ("sukato", "a skirt", "pleated skirt laid flat, front view"),
    ("suutsu", "a business suit", "dark navy business suit jacket and trousers on a hanger, white shirt"),
    ("epuron", "an apron", "one green apron laid flat"),
    ("mezamashi", "an alarm clock", "red twin bell alarm clock, round face, no numbers"),
    ("doraiya", "a hair dryer", "one hair dryer, side view"),
    ("jougi", "a ruler", "one long transparent plastic ruler, straight, diagonal, tick marks, no numbers"),
    ("heddohon", "headphones", "black over-ear headphones"),
    ("houki", "a broom", "one long broom, whole broom visible, diagonal"),
    ("baketsu", "a bucket", "one blue plastic bucket with a handle"),
    ("moppu", "a mop", "one mop, long handle, whole mop visible, diagonal"),
    ("zoukin", "a cleaning cloth", "one folded white cleaning cloth, zokin, stitched pattern"),
    # trabalho
    ("herumetto", "a hard hat", "one yellow construction hard hat"),
    ("gunte", "work gloves", "pair of white cotton work gloves"),
    ("daisha", "a hand cart", "flat platform hand cart with a handle and four wheels, empty, side view"),
    # rua, estação, prédios e natureza
    ("hikouki", "an airplane", "white passenger airplane flying, side view"),
    ("shinkansen", "a bullet train", "white japanese bullet train shinkansen with long pointed nose, blue stripe, side view"),
    ("fune", "a ship", "small white ship on the water, side view"),
    ("kaisatsu", "a ticket gate", "japanese train station automatic ticket gate, two gate machines, front view, no text"),
    ("esukareta", "an escalator", "one escalator, side view, steps, handrails"),
    ("erebeta", "an elevator", "elevator with closed silver metal doors, call buttons beside, front view"),
    ("birudingu", "an office building", "one tall office building, glass windows, front view"),
    ("byouin", "a hospital", "hospital building with a red cross on the front, front view, no text"),
    ("gakkou", "a school", "japanese school building with a clock at the top, front view, no text"),
    ("jinja", "a shinto shrine", "small shinto shrine with a red torii gate in front"),
    ("otera", "a buddhist temple", "japanese five-story pagoda, temple"),
    ("hanabi", "fireworks", "colorful fireworks bursting, dark blue night sky square"),
    ("yuki", "snow", "one white snowflake crystal, light blue outline"),
    ("niji", "a rainbow", "rainbow arc with small white clouds at both ends"),
    ("kaminari", "lightning", "dark grey cloud with a yellow lightning bolt"),
    ("hoshi", "a star", "one yellow five-pointed star"),
    ("kawa", "a river", "small square view of a blue river flowing between green grassy banks, view from above"),
    ("shima", "an island", "small round island with one palm tree, blue sea around"),
    ("sakura", "cherry blossoms", "branch of cherry blossoms, pink flowers"),
    ("ishi", "a stone", "one grey stone"),
    ("happa", "a leaf", "one green leaf"),
    ("take", "bamboo", "three green bamboo stalks with leaves"),
    # corpo
    ("te", "a hand", "one open hand, palm facing viewer, five fingers"),
    ("ashi", "a foot", "one bare foot, side view"),
    ("me", "an eye", "one eye, close-up, eyelashes, brown iris"),
    ("mimi", "an ear", "one human ear, side view, close-up"),
    ("kuchi", "a mouth", "smiling mouth, lips, close-up"),
    ("ha", "a tooth", "one white tooth, cute cartoon molar"),
    ("kao", "a face", "face of a smiling boy, front view, close-up, head only"),
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
    ("neru", "a person sleeping", "1boy, sleeping, lying on his side, side view, horizontal, eyes closed, head on a pillow, blanket, no bed"),
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
    # Segunda leva (Anima Turbo).
    ("okiru", "a person waking up", "1boy, waking up in bed, sitting up on futon, stretching both arms up, yawning, blanket"),
    ("miru", "a person watching television", "1girl, sitting on the floor, watching a television in front of her, side view, television visible"),
    ("hataraku", "a person working at a computer", "1man, business suit, necktie, sitting at office desk, typing on laptop computer, side view"),
    ("yasumu", "a person resting on a sofa", "1girl, resting on a sofa, relaxed, eyes closed, leaning back"),
    ("noru", "a person riding a bicycle", "1boy, riding a bicycle, side view, whole bicycle visible, both wheels"),
    ("akeru", "a person opening a door", "1girl, opening a door, hand on doorknob, door half open, side view"),
    ("asobu", "a child playing with a ball", "1boy, child, playing with a red ball, kicking the ball, happy"),
    ("sentaku", "a person hanging laundry", "1girl, hanging laundry on a clothesline, shirt and towel on the line"),
    ("unten", "a person driving a car", "1man, driving a small car, sitting inside, hands on steering wheel, side view, whole car visible"),
    ("kiru", "a person putting on a jacket", "1boy, putting on a jacket, one arm in the sleeve"),
    ("migaku", "a person brushing teeth", "1girl, brushing teeth with a toothbrush, white foam"),
    ("hiku", "a person playing the guitar", "1boy, sitting on a chair, playing an acoustic guitar"),
    ("osu", "a person pushing a hand cart", "1man, work clothes, pushing a flat hand cart loaded with cardboard boxes, side view"),
    ("nageru", "a person throwing a ball", "1boy, throwing a baseball, pitching pose, one arm forward"),
    ("noboru", "a person going up stairs", "1girl, walking up a staircase, side view, stairs visible"),
    ("ayamaru", "a person bowing to apologize", "1man, business suit, bowing deeply, apologizing, side view"),
    ("kangaeru", "a person thinking", "1girl, thinking, hand on chin, looking up"),
    ("okoru", "an angry person", "1boy, angry, frowning, clenched fists, red face"),
    ("tsukareru", "a tired person", "1man, office worker, very tired, slumped shoulders, sweat, exhausted, dark circles under eyes"),
]

PESSOA_ESTILO = (
    "full body, standing, white background, simple background, black outline, clean lineart, flat color, anime coloring, "
    "cel shading, bright colors"
)
PESSOA_NEG = "crowd, frame, border, photo, realistic, 3d, scenery, gradient background, drop shadow, cropped feet, text, letters, logo, name tag"

# Pessoas e profissões: a figura parada, sem ação. Na Cena Viva contam com 人 e "estão" (います).
PESSOAS = [
    ("otokonoko", "a boy", "solo, 1boy, young boy, about eight years old, t-shirt and shorts"),
    ("onnanoko", "a girl", "solo, 1girl, young girl, about eight years old, dress"),
    ("otokonohito", "a man", "solo, 1man, adult man, about thirty, casual clothes"),
    ("onnanohito", "a woman", "solo, 1woman, adult woman, about thirty, casual clothes"),
    ("akachan", "a baby", "solo, baby, sitting, diaper, chubby, smiling"),
    ("ojiisan", "an old man", "solo, old man, grey hair, glasses, cardigan, walking cane"),
    ("obaasan", "an old woman", "solo, old woman, grey hair in a bun, apron, gentle smile"),
    ("kazoku", "a family", "family of four standing together, father, mother, son and daughter, smiling"),
    ("gakusei", "a student", "solo, 1boy, japanese high school student, school uniform, school bag"),
    ("sensei", "a teacher", "solo, 1woman, teacher, holding a textbook, pointing stick, cardigan"),
    ("isha", "a doctor", "solo, 1man, doctor, white coat, stethoscope around neck"),
    ("kangoshi", "a nurse", "solo, 1woman, nurse, light pink nurse uniform, clipboard"),
    ("keisatsukan", "a police officer", "solo, 1man, japanese police officer, dark blue uniform, police cap"),
    ("tenin", "a shop clerk", "solo, 1girl, convenience store clerk, striped uniform shirt, apron"),
    ("ekiin", "a station attendant", "solo, 1man, japanese train station attendant, navy blue uniform, cap, white gloves"),
    ("kaishain", "an office worker", "solo, 1man, office worker, business suit, necktie, briefcase"),
]

LUGAR_ESTILO = (
    "no humans, scenery, empty room, wide shot, eye level, interior, clean lineart, anime background, cel shading, "
    "bright natural light, detailed background"
)
LUGAR_NEG = "people, text, sign, letters, clutter, frame, border, photo, realistic, 3d, neon, dark"

LUGARES = [
    ("konbini", "an empty convenience store interior", "inside japanese convenience store, empty floor, white tiled floor, bare walls, glass door, bright ceiling lights"),
    ("eki", "a train station platform", "japanese train station platform, empty, yellow tactile paving, roof, railway tracks"),
    ("heya", "an empty bedroom", "empty japanese apartment room with no furniture, bare wooden floor, white walls, window with curtains, daylight, no bed"),
    ("jimusho", "an empty office", "empty japanese office room, grey carpet floor, white walls, large windows, city view"),
    ("daidokoro", "an empty kitchen", "japanese home kitchen, counter, sink, wooden floor, window, empty counter"),
    ("yakkyoku", "an empty pharmacy interior", "inside japanese pharmacy, pharmacist counter at the back, green cross sign on the wall, white walls, shelves with medicine boxes, empty floor, clean, bright"),
    ("resutoran", "an empty restaurant interior", "inside small japanese restaurant, wooden walls, wooden floor, warm light, noren curtain, empty"),
    ("michi", "a residential street", "japanese residential street, asphalt road, sidewalk, houses in background, blue sky, utility poles, empty street"),
]

# Cenários e retratos dos outros jogos (Aventura, Conversa, hub...). Antes eram do Animagine em mangá, pintados depois;
# agora saem coloridos do Anima, como todo o resto.
# Placas e letreiros saíram dos prompts: o modelo escreve letras falsas.
CENA_ESTILO = "scenery, wide shot, eye level, detailed background, anime background, clean lineart, cel shading, bright natural light"
CENA_NEG = "text, letters, english text, sign text, watermark, signature, frame, border, photo, realistic, 3d, blurry"

CENAS = [
    ("hub-shibuya", "a busy city crossing", "shibuya scramble crossing, tokyo, empty crossing, no humans, tall glass buildings, plain facades, daytime, street level view, zebra crossing, traffic lights"),
    ("kanjimon-takao", "a forest mountain trail", "mount takao hiking trail, japan, cedar forest, stone lanterns, stone steps, light mist, no humans"),
    ("kanabeat-dotonbori", "a canal street at night", "dotonbori, osaka, canal, colorful shop facades, bridge, crowd, evening, view from bridge"),
    ("kotodama-inari", "a tunnel of red torii gates", "fushimi inari taisha, kyoto, endless tunnel of red torii gates, stone path, one point perspective, no humans"),
    ("kumitate-gion", "an old wooden street", "hanamikoji street, gion, kyoto, wooden machiya houses, paper lanterns, stone pavement, no humans"),
    ("pecas-ryoanji", "a zen rock garden", "ryoanji temple, kyoto, zen rock garden, raked white gravel, large stones, low earthen wall, wooden veranda, trees behind the wall, no humans"),
    ("aventura-narita", "an airport arrival hall", "airport arrival hall, japan, immigration counters, luggage carts, large windows, airplane outside, a few travelers"),
    ("aventura-shinjuku", "a train station concourse", "big japanese train station concourse, ticket gates, commuters, train platform in the distance"),
    ("aventura-konbini", "a convenience store interior", "japanese convenience store interior, shelves with onigiri and drinks, cash register counter, no humans"),
    ("conversa-cafe", "a small cafe interior", "small cafe interior in tokyo, wooden counter, coffee cups, window with street view, plants, no humans"),
    ("conversa-osaka", "a residential street", "residential street in osaka, japan, utility poles, power lines, vending machine, bicycles, small houses, no humans"),
    ("conversa-sharehouse", "a shared house kitchen", "kitchen of a japanese share house, table, chairs, rice cooker, window, cozy, no humans"),
    ("conversa-restaurante", "a small restaurant interior", "inside a small japanese izakaya restaurant, counter seats, noren curtain, wooden walls, no humans"),
]

PERSONAGEM_ESTILO = "solo, upper body, portrait, from front, looking at viewer, simple background, white background, clean lineart, anime, cel shading"
PERSONAGEM_NEG = "multiple people, text, letters, name tag text, watermark, signature, frame, border, photo, realistic, 3d, gradient background"

PERSONAGENS = [
    ("fiscal", "an immigration officer", "1man, adult, japanese immigration officer, uniform, cap, serious face"),
    ("funcionaria", "an airport staff woman", "1girl, adult woman, japanese airport employee, navy uniform, scarf, polite smile, head and shoulders, hands out of frame"),
    ("atendente", "a train station attendant", "1man, young adult, japanese train station staff, uniform, cap, helpful smile, arms at sides, empty hands"),
    ("senhora", "an old woman", "1girl, old woman, japanese grandmother, grey hair, cardigan, gentle smile"),
    ("balconista", "a convenience store clerk", "1boy, young man, japanese convenience store clerk, striped uniform shirt, smile"),
    ("sakura", "a cafe waitress", "1girl, young woman, cafe waitress, apron, short hair, cheerful smile"),
    ("takeshi", "a middle-aged man", "1man, middle-aged man, japanese, glasses, casual jacket, friendly"),
    ("yui", "a university student", "1girl, young woman, university student, long hair, hoodie, friendly smile"),
    ("tanaka", "a restaurant manager", "1man, adult man, japanese restaurant manager, white shirt, apron, short hair, calm"),
]

# Depois de olhar as folhas: candidatas vetadas (passaram no CLIP mas ensinam errado) e escolhas à mão.
AJUSTES: dict[str, dict] = {
    # neko: no Anima, a seed 10003 é o gato inteiro de lado com o rabo ligado; a 10002 tem uma assinatura falsa no canto.
    # tsuki: a 10001 é a lua crescente limpa. gita: as de antes saíam com o braço cortado ou deformadas.
    # okonomiyaki: a 10002 parece panqueca com manteiga. houki: a 10003 são duas vassouras cruzadas.
    # kaisatsu: a 10003 tem letreiro na tela. te: a 10001 é uma luva rosa. kuchi: o modelo de visão
    # reprova toda boca em close ("falta a cabeça"), mas é o que a palavra pede.
    # densha: o trem de lado cabe na estação da Cena Viva; o de frente ficava enorme.
    # okashi: com "snacks" no prompt sempre vinham pacotes de marca com letra falsa; agora só o que vai no prato.
    # cupramen: todo copo sai com letra; a 10002 tem só uma marquinha.
    # chawan, foku, gomibako, posuto, tokei: a escolhida tinha letra falsa (ou três garfos); estas não têm.
    # Os itens que só saíam com letra falsa, e o peixe que virou fatia de toranja, ganharam prompt novo;
    # as candidatas antigas foram para D:\KotobaArcade\arte\estudio\objetos\descartadas.
    "objetos": {"escolha": {"densha": 10002, "cupramen": 10002, "sakana": 10002, "mizu": 10003, "donburi": 10001, "kusuri": 10001, "sekken": 10002, "hanko": 10003, "jihanki": 10001, "chawan": 11002, "foku": 10003, "gomibako": 10002, "posuto": 10002, "tokei": 10001, "neko": 10003, "tsuki": 10001, "okonomiyaki": 10001, "houki": 10002,
                            "kaisatsu": 10001, "te": 10002, "kuchi": 10001},
                "vetadas": ["gita-2", "gita-10001", "gita-10002", "gita-10003"]},
    # oyogu: as seis primeiras do Anima mostram um menino parado na borda da piscina, não nadando.
    # kiru, kangaeru, tsukareru: o CLIP achou outra ação em todas, mas estas mostram a certa sem dúvida a olho.
    # neru: as primeiras eram vistas de cima, numa cama em pé; agora a pessoa dorme de lado, sem cama (vai no banco e no futon).
    # aruku, denwasuru, warau: o CLIP reprovou todas, mas estas mostram a ação sem dúvida a olho.
    "acoes": {"escolha": {"aruku": 10003, "denwasuru": 11001, "warau": 10003, "kiru": 10003, "kangaeru": 10002, "tsukareru": 10001}, "vetadas": [f"oyogu-{s}" for s in (10001, 10002, 10003, 11001, 11002, 11003)]},
    # michi: as outras olham a rua por dentro de uma porta. yakkyoku: a 10002 tem menos caixa com letra falsa.
    "lugares": {"escolha": {"michi": 10001, "yakkyoku": 10002}},
    # hub-shibuya: a multidão saía como silhuetas brancas, e os prédios com letreiro de letra falsa; agora o cruzamento é vazio.
    # aventura-konbini: a 10003 tem uma faixa com letras falsas em cima do caixa.
    "cenas": {"escolha": {"aventura-konbini": 10001, "hub-shibuya": 11001}, "vetadas": [f"hub-shibuya-{s}" for s in (10001, 10002, 10003)]},
    # balconista e tanaka: o CLIP confunde os uniformes (balcão, estação, restaurante); estas foram escolhidas a olho.
    # O boné azul do balconista sai com logotipo falso. Funcionária e atendente saíam segurando um bastão
    # (um com letras falsas): "staff", em inglês, também é cajado; agora é "employee". Do atendente ficou a 11001, a única sem bastão; a funcionária ganhou prompt de ombros
    # para cima e as candidatas antigas foram para D:\KotobaArcade\arte\estudio\personagens\descartadas.
    "personagens": {"escolha": {"balconista": 12001, "tanaka": 11001, "atendente": 11001},
                    "vetadas": [f"{i}-{s}" for i in ("atendente",) for s in (10001, 10002, 10003)]},
    # O CLIP confunde avó com mulher e estudante com menino; estas foram escolhidas a olho.
    # 運転手 saiu: toda candidata de motorista parecia policial.
    "pessoas": {"escolha": {"obaasan": 11003, "gakusei": 10001, "tenin": 10001}},
}


# Tudo que ainda era do Animagine (seed abaixo de 10000) foi refeito no Anima Turbo: as candidatas antigas não voltam.
ANIMA = 10000


def escrever(nome, dados):
    dados["desde_seed"] = ANIMA
    dados.update(AJUSTES[nome])
    (AQUI / f"{nome}.json").write_text(json.dumps(dados, indent=1, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


escrever("objetos", {
    "lote": "objetos", "destino": "src/assets/imagens", "largura": 896, "altura": 896,
    "saida": 384, "recorte": True, "estilo": OBJ_ESTILO, "negativo": OBJ_NEG, "seeds": [1, 2, 3],
    "distratores": ["a person", "a room", "a toy"],
    "itens": [{"id": i, "rotulo": r, "prompt": p, **({"estilo": CORPO_ESTILO} if i in CORPO else {})} for i, r, p in OBJETOS],
})
escrever("acoes", {
    "lote": "acoes", "destino": "src/assets/acoes", "largura": 832, "altura": 1216,
    "saida": 512, "recorte": True, "estilo": ACAO_ESTILO, "negativo": ACAO_NEG, "seeds": [1, 2, 3],
    "distratores": ["a person posing", "a group of people", "an object"],
    "itens": [{"id": i, "rotulo": r, "prompt": p} for i, r, p in ACOES],
})
escrever("pessoas", {
    "lote": "pessoas", "destino": "src/assets/gente", "largura": 832, "altura": 1216,
    "saida": 512, "recorte": True, "estilo": PESSOA_ESTILO, "negativo": PESSOA_NEG, "seeds": [1, 2, 3],
    "distratores": ["an object", "a room", "an animal"],
    "itens": [{"id": i, "rotulo": r, "prompt": p} for i, r, p in PESSOAS],
})
escrever("lugares", {
    "lote": "lugares", "destino": "src/assets/lugares", "largura": 1216, "altura": 832,
    "saida": 960, "recorte": False, "estilo": LUGAR_ESTILO, "negativo": LUGAR_NEG, "seeds": [1, 2, 3],
    "distratores": ["a crowded room full of people", "a forest", "a shrine"],
    "itens": [{"id": i, "rotulo": r, "prompt": p} for i, r, p in LUGARES],
})
escrever("cenas", {
    "lote": "cenas", "destino": "src/assets/cenas-cor", "medidas": False,
    "largura": 1216, "altura": 832, "saida": 960, "recorte": False, "estilo": CENA_ESTILO, "negativo": CENA_NEG,
    "seeds": [1, 2, 3], "distratores": ["a portrait of a person", "a single object", "a blank wall"],
    "itens": [{"id": i, "rotulo": r, "prompt": p} for i, r, p in CENAS],
})
escrever("personagens", {
    "lote": "personagens", "destino": "src/assets/pessoas-cor", "medidas": False,
    "largura": 832, "altura": 1216, "saida": [520, 1040], "corte_altura": 0.72, "recorte": False,
    "estilo": PERSONAGEM_ESTILO, "negativo": PERSONAGEM_NEG, "seeds": [1, 2, 3],
    "distratores": ["an object", "a room", "an animal"],
    "itens": [{"id": i, "rotulo": r, "prompt": p} for i, r, p in PERSONAGENS],
})
print(len(OBJETOS), "objetos,", len(ACOES), "ações,", len(PESSOAS), "pessoas,", len(LUGARES), "lugares,", len(CENAS), "cenários,", len(PERSONAGENS), "personagens")
