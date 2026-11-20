# Kana em imagens: de onde veio o conteúdo e o que mudou

O conteúdo fica em `src/content/kana.ts`. A base foram os mnemônicos de `escola-japones/src/content/kana.ts`, as lições de hiragana e katakana de lá e `docs/estudo-aprendizagem.md`, que pede uma associação visual curta, ligada ao formato da letra e ao som, usada como ponte e não como muleta.

## O que tem

- 92 básicos (46 hiragana, 46 katakana, contando を e ヲ).
- Tenten e maru: 25 em hiragana (com ぢ e づ) e 23 em katakana (ヂ e ヅ ficaram de fora: quase não existem).
- 33 combinados em cada escrita (きゃ, キャ...).
- Pequenos: っ, ッ, ゃ ゅ ょ, ャ ュ ョ. E o ー.
- 16 sons de fora em katakana: ファ フィ フェ フォ, ティ ディ, トゥ ドゥ, チェ シェ ジェ, ウィ ウェ ウォ, ヴ e ヴァ.

São 231 kana. Cada um tem: objeto da imagem, frase que liga o desenho ao som, como soa para quem fala português (quando o romaji engana), kana que confundem (sempre nos dois sentidos), palavra comum de exemplo e, quando precisa, uma nota.

Os ids são os do Kana Beat (`a:あ`, `ak:ア`) e a carta é a mesma (`#reading`). O que se aprende num jogo conta no outro.

## O que mudou em relação à escola-japones, e por quê

### Som errado

- **ら, り, る, れ, ろ**: a escola ligava ao "ra" de *rato*, "ri" de *rio*, "ru" de *rua*, "ro" de *rota*. No Brasil esse é o r forte, que soa quase como h. O r japonês é o fraco, de *arara* e *caro*. Agora: arara, siri, canguru, careta, garoto. Todos com o r no meio da palavra.
- **ふ e フ**: o "fu" de *Fuji* levava ao f de *faca*, com os dentes no lábio. O japonês é um sopro só com os lábios. Agora a imagem é alguém soprando uma vela, e o "soa" diz isso.
- **を**: a escola guardava a chave como "wo", e o romaji mostrado saía "wo". Hoje se fala "o", igual a お. Aqui o romaji mostrado é "o", e a nota explica que só aparece como partícula.
- **ん**: a escola dizia só "a letra n cursiva". Agora a nota explica que vira "m" antes de b, p e m (さんぽ), "ng" antes de k e g (てんき) e "n" nasal no fim.
- **ぎ e げ**: em português "gi" e "ge" soam "ji" e "je". Agora diz "gui" e "gue".
- **て e ティ, で e ディ**: no Brasil "ti" e "di" costumam virar "tchi" e "dji". Avisamos que て é "te" e ティ é "ti" seco.
- **ヴ**: o som "vu" é do romaji. No Japão quase todo mundo fala "bu". Está no "soa" e na frase.
- **にゃ, にゅ, にょ**: ligados ao "nh" do português (manhã, nhoque), que é o som certo.

### Mnemônico que não era imagem

Vários da escola descreviam traços ("lembra as letras n e i juntas", "parece K torta"). Isso não dá desenho. Viraram objetos: に é um ninho, け é um espeto de queijo coalho, せ é uma cerca, た são tábuas, エ é um poço de elevador, サ é uma sacola, ユ é uma banheira (お湯 é água quente), ヨ é a geladeira de iogurte.

Dois mudaram depois de ver as ilustrações. い eram dois ímãs, mas nenhuma das 16 tentativas saiu com cara de ímã; virou uma ilha com dois coqueiros ("i" de ilha). こ eram duas cobras, e o desenho sempre saía com uma só; virou uma cobra enrolada, com as duas voltas do corpo fazendo os dois traços.

### Ligação mais forte entre hiragana e katakana

Quando a letra katakana vem da mesma origem, a imagem é a mesma: カ é o mosquito de か sem a asa, キ é a chave, ケ o espeto, セ a cerca, モ a isca, ヤ o iate, リ o siri, ル o canguru, レ o chute, ロ o garoto de ろ com a boca quadrada.

### Pares que confundem

Entraram os pares pedidos (シ/ツ, ソ/ン, ぬ/め, わ/れ/ね, る/ろ, さ/ち, は/ほ, ク/ケ/タ) e mais alguns da escola (あ/お, い/り, た/な, ス/ヌ, コ/ユ, ア/マ). Todos nos dois sentidos: a escola tinha alguns de um lado só (ま apontava para ほ, mas ほ não para ま).

### Texto

Frases mais curtas, sem "como" repetido, uma ideia por frase.

## Imagens

Cada objeto tem uma ilustração do estúdio de imagens (`scripts/imagens/kana.json`, ver docs/imagens.md), em mangá e em cor. A letra é desenhada por cima, no meio. Sem a letra, a imagem vira a pergunta. Objeto sem ilustração aprovada cai num desenho simples em SVG (`src/games/kanaimagens/Imagem.tsx`).

Tenten e maru aparecem como uma marca vermelha no canto (dois traços ou uma bolinha). Nos combinados, a imagem do kana pequeno aparece num quadrinho no canto: きゃ é a chave com o iate pequeno. っ e ゃ são a imagem da letra grande, encolhida.
