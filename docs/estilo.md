# Guia de estilo: Sora com pincel (空と筆)

O visual se chama Sora, "céu", com uma camada de pincel por cima. A base é limpa: um foco por tela, um azul de marca, ilustrações de anime sempre coloridas, tema claro e escuro. Por cima vem o traço pintado à mão: quadros com linha de pincel, canto cortado, ilustração com a borda pintada, etiquetas e botão principal em faixa de pincel, grão de papel no fundo.

Fica de fora qualquer coisa retrô: anos 80 e 90, city pop, neon, VHS, tela de tubo, pixel art nostálgica.

## Por que mudou

Até novembro de 2026 o jogo era mangá em preto e branco, com a cor de anime chegando como recompensa. Na prática não funcionou:

- As ilustrações ficavam cinzas e lavadas a maior parte do tempo. A arte do Anima Turbo é colorida e perdia a graça.
- Borda grossa de tinta, retícula, canto cortado e linha tremendo em todo lugar faziam barulho. Para quem tem TDAH isso disputa atenção com a pergunta.
- O fliperama tinha três blocos grandes brigando pelo primeiro lugar, e atalho de teclado escrito em tudo.
- Duas fontes pesadas (Dela Gothic e pincel) cansavam a leitura. Não havia tema escuro.
- No celular o topo ficava apertado e algumas telas sobravam vazias.

O Sora resolve com uma regra: **um foco por tela**. O que o jogador tem que olhar agora é o maior e o mais forte; o resto fica calmo.

### E por que o pincel voltou

O Sora puro ficou claro, mas genérico: parecia qualquer aplicativo. O Rafael pediu de volta o lado artístico do visual antigo, os efeitos de borda e de pintura. A camada "Pincel" traz isso sem o barulho de antes:

- O traço é parado. O tremor de linha do visual antigo não volta.
- Um efeito por elemento: quadro tem linha de pincel, ilustração tem borda pintada, etiqueta tem faixa. Nada de retícula e linha de velocidade espalhadas pela tela.
- A ilustração continua colorida. A pintura está na borda, não na imagem.
- O efeito vem de filtro e máscara em SVG, sem imagem duplicada.

A inspiração é o jeito de interface pintada de alguns jogos japoneses recentes, mas nada é copiado: as formas, as fontes e as imagens são nossas ou de licença livre.

## Cores

Toda cor sai dos tokens em `:root` no `src/styles.css`. Não use cor solta no CSS (as únicas exceções são os degradês da marca e o texto branco em cima de cor cheia). O tema escuro só troca os valores dos tokens (um teste confere que ele redefine todos).

| Token | Claro | Escuro | Para quê |
| --- | --- | --- | --- |
| `--bg` | `#f3f6fb` | `#0d1220` | fundo da página |
| `--surface` | `#ffffff` | `#161e31` | cartões e painéis |
| `--surface-2`, `-3` | `#f2f5fa`, `#e6ebf3` | `#1d2740`, `#27324f` | campos, hover, peça bloqueada |
| `--line`, `-2` | `#dfe5ef`, `#c3cddd` | `#2a3554`, `#3b4970` | bordas finas |
| `--text` | `#141c2e` | `#edf1fa` | texto |
| `--text-2`, `-3` | `#475069`, `#636c84` | `#b9c2d9`, `#949eb9` | texto secundário e apagado |
| `--brand` | `#2f62e6` | `#6f97ff` | azul de céu: botão principal, foco, seleção |
| `--ok` | `#12a46b` | `#34d399` | acerto, progresso, feito |
| `--erro` | `#e2484f` | `#ff6b72` | erro (sempre com a resposta certa junto) |
| `--raro` | `#f2a516` | `#ffc24b` | só raridade alta (UR), baú, recorde |
| `--sakura` | `#e9468f` | `#ff6fae` | festa: combo, captura, nível, SR |

Cada sinal tem `-soft` (fundo) e `-text` (texto em cima do fundo). Todos os pares de texto passam do contraste AA (4,5:1) nos dois temas; `e2e/estilo.spec.ts` mede.

Duas ou três cores fortes por tela, no máximo. Se azul, verde, dourado e rosa aparecem juntos, alguma está sobrando.

## Tema claro e escuro

Ajustes > Tema: **Do sistema** (padrão), **Claro** ou **Escuro**. A escolha fica no save (`settings.tema`). `src/core/tema.ts` põe `data-theme` no `<html>` e troca a cor da barra do navegador (`theme-color`). Sem escolha, vale o `prefers-color-scheme` do sistema.

## Fontes

Três fontes livres (SIL Open Font License 1.1), recortadas só com os caracteres que o jogo usa, em `src/assets/fontes/`.

| Token | Fonte | Para quê |
| --- | --- | --- |
| `--f-texto` | [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) | português, números, títulos |
| `--f-jp` | [Zen Maru Gothic](https://github.com/googlefonts/zen-marugothic) 500 e 700 | japonês corrido, kana, furigana |
| `--f-kanji` | [Klee One](https://github.com/fontworks-fonts/Klee) SemiBold | o kanji grande que se estuda: carta, pergunta, peça |

A Klee One tem traço de livro escolar: dá para ver como o kanji é escrito à mão. É só para um a quatro caracteres grandes; texto corrido vai na Zen Maru Gothic.

Quando entrar kanji novo no conteúdo, rode o recorte de novo. Um teste falha se algum caractere ficar sem desenho.

```bash
python scripts/recortar-fontes.py D:/KotobaArcade/arte/site-novo/fontes-originais
```

Os kanji que só o Kanji em peças usa ficam em arquivos à parte (`*-Pecas.woff2`, ligados por `unicode-range` em `pecas.css`). Eles têm que ter o mesmo `font-weight` da fonte principal, senão o navegador escolhe a face errada e o resto do texto cai na fonte do sistema (um teste confere).

## Forma

- Cantos quase retos: `--r-s` 6px (botão, campo), `--r-m` 8px (cartão), `--r-l` 10px (painel grande). Quadros com traço de pincel ficam com 4px. `--r-pill` só para etiquetas pequenas e contadores.
- Vão entre blocos (`--vao`): 16px.
- Sombra macia em três níveis (`--sh-1` a `--sh-3`). Quadro grande leva o traço de pincel (veja abaixo); caixa pequena leva linha fina de `--tinta`.
- Quando o texto fica por cima da ilustração, ela se dissolve num véu (`--veu-baixo`, `--veu-forte`, `--veu-lado`), para o texto ler bem.
- Ícones: [Lucide](https://lucide.dev) (ISC), em `src/assets/icones/`, pelo componente `<Icone nome="..." />`.

## Componentes

- **Botão**: `.primary` é uma pincelada azul, e tem um por tela. Os outros são de superfície. `.ghost` para voltar e ações pequenas.
- **Cartão de jogo** (`.tile`): canto cortado, ilustração colorida com borda pintada em cima, etiqueta em japonês, nome e uma linha embaixo. Jogo já jogado ganha o sinal ✓ (`.jogado`).
- **Etiqueta** (`.hub-rotulo`, raridade, `済`): pílula pequena com fundo `-soft`.
- **Segmento** (`.segmento`): botões com `aria-pressed` para escolhas curtas, como o tema.
- **Atalho** (`kbd`): só aparece com mouse e teclado. Em tela de toque (`pointer: coarse`) some.
- **Apresentação** (`.ap-cartao`, `src/core/Apresentacao.tsx`): o cartão de coisa nova, igual em todos os jogos. Em cima, os pontos (`.ap-pontos`: verde o que já passou, azul o da vez) e o tipo do item. No corpo, a imagem com borda de pincel (`.ap-visual`) ao lado do japonês grande (`.ap-grande`, com furigana em `rt`), o romaji, o significado em azul forte (`.ap-pt`), uma frase de explicação e um exemplo com filete de tinta à esquerda (`.ap-exemplo`). Embaixo, voltar, ouvir, a voz do português e o botão `.primary` de seguir. Item sem imagem fica centrado. Quando um erro na prática mostra o item de novo, o cartão vem em `.de-novo`, com o fundo `--surface-2`, para não parecer coisa nova.

## Pincel

Tudo fica no bloco "Pincel" no fim do `src/styles.css`, com as formas em SVG dentro do próprio CSS.

| Peça | Como é feita | Onde |
| --- | --- | --- |
| Traço do quadro | `::after` com borda de 2,5px em `--tinta` e o filtro `#pincel` (`index.html`): ruído que entorta a linha e abre falhas de cerda | cartões do fliperama, quadros dos jogos, barra do topo, painéis, ajuda |
| Canto cortado | `clip-path` com o canto de cima à direita cortado em `--corte` (22px); a diagonal também ganha traço | cartões do fliperama, Jornada, Ouvir, etapas |
| Borda pintada | máscara `--pincel-borda`: retângulo com a borda entortada por ruído | ilustração dos cartões |
| Faixa de pincel | máscara `--pincel-faixa` atrás do texto | etiquetas (`.tile-jp`, `.hub-rotulo`) e botão principal |
| Pincelada | máscara `--pincelada` embaixo do título | títulos grandes, "Jogos" |
| Ensō | máscara `--enso`, um círculo de pincel | 言葉 da marca |
| Mancha de tinta | máscara `--borrao`, borrão com respingos | no canto do quadro do jogo, crescendo com o combo (`--cor`); atrás do título da vitória e do resumo |
| Grão de papel | `--grao`, ruído quase invisível no fundo | página toda |
| Linhas de concentração | `repeating-conic-gradient` com máscara | só no cartão grande, ao passar o mouse |

`--tinta` é azul-marinho no tema claro e quase branco no escuro, então o traço vira giz claro sobre o fundo escuro. Sobre ilustração escura o traço é branco (`--traco`).

Regras:

- Nada do pincel se mexe sozinho. O modo calmo não precisa desligar nada aqui.
- Caixa pequena (narração, fala, explicação) não leva filtro: só uma linha fina de tinta, como balão de fala.
- O foco do teclado nos cartões de canto cortado fica por dentro (`outline-offset` negativo), senão o recorte esconde.
- Um teste (`e2e/estilo.spec.ts`) confere o traço, o canto cortado, a borda pintada e que nada disso anima.

## Fliperama

Um bloco principal: a faixa da Jornada ("Do zero até trabalhar no Japão") com a próxima missão. Ao lado, menores, o "Jogar agora" (último jogo, Enter) e o Ouvir. Embaixo, a grade dos dez jogos com "N de 10 já jogados". Ajustes fica num botão de ícone no topo.

## Brilho do combo

O cartão do jogo ganha um aro sakura e um brilho em volta que crescem com os acertos seguidos. A variável CSS é `--cor`, de 0 a 1, e sai de `src/core/cor.ts`:

- Acerto: sobe até o nível do combo. Seis acertos seguidos enchem (no Kana Beat, dez notas). Acerto nunca baixa.
- Erro: sobra 35%. Cai devagar (0,9 s), não some de uma vez.
- Pausa, recomeço e troca de tela: apaga.
- Progresso que só cresce (frases do Kumitate): `progresso()`, no máximo metade.

No Kana Beat a linha de acerto passa do azul para o rosa com o combo. No canto de baixo do quadro do jogo, uma mancha de tinta rosa cresce junto com o brilho e encolhe no erro.

## Feedback (onomatopeia)

Acerto e erro continuam com uma palavra curta em katakana carimbada perto de onde aconteceu: `onomato(palavra, elemento, cor)` em `src/core/fx.ts`.

| Cor | Quando |
| --- | --- |
| `bom` (verde) | acerto, acerto rápido, peça encaixada |
| `festa` (sakura) | captura, nota perfeita, frase montada, subir de nível |
| `raro` (dourado) | carta rara aparecendo, baú |
| `neutro` (cinza) | erro, carta virada, golpe e defesa |

Erro não é castigo: cinza, curto e sempre com a resposta certa na tela. Uma onomatopeia por evento; some em menos de um segundo e nunca cobre a pergunta seguinte.

## Movimento

Animação curta e com motivo: `--d-1` 120 ms (hover), `--d-2` 220 ms (troca de estado), `--d-3` 360 ms (entrada de tela). `--mola` só para o que comemora.

- Pergunta nova: sobe e aparece.
- Acerto: o botão certo fica verde com um pulo curto.
- Erro: o botão fica vermelho claro e riscado, a certa aparece, o quadro treme de lado.
- Vitória: raios lentos girando atrás do quadro.

O **modo calmo** (Ajustes) e o `prefers-reduced-motion` do sistema param toda animação que se repete, deixam o brilho mais lento (1,6 s), deixam a onomatopeia menor e sem giro e cortam a maior parte das faíscas. Um teste confere que toda animação sem fim tem a regra do modo calmo. A informação continua toda na tela.

## Acessibilidade

- Foco do teclado sempre visível: contorno de 3px em `--brand`.
- Contraste AA em todo texto, nos dois temas.
- Nada de rolagem para o lado no celular (360px).
- Tudo funciona só no teclado, com o IME japonês ligado também.

## Cenários e personagens

Lugares reais do Japão (Shibuya, Fushimi Inari, Dotonbori, Narita, Shinjuku) em `src/assets/cenas-cor/`, retratos em `src/assets/pessoas-cor/` e vocabulário em `imagens/`, `acoes/`, `gente/`, `lugares/` e `kana/`. Sempre coloridos, em WebP, até 960px e menos de 160 KB. Como gerar: `docs/imagens.md`.

## Cartas do KanjiMon

A arte de cada carta é a original, de `kanjimon.online`. A raridade fica na moldura:

- C: borda neutra.
- R: borda azul clara.
- SR: borda sakura com aro.
- UR: borda dourada com brilho e raios girando atrás.

## Ajuda

Toda tela tem um botão redondo de interrogação no canto de baixo. Ele, a tecla `?` ou a F1 abrem a explicação daquela tela: objetivo, como jogar, todas as teclas, o que cada coisa quer dizer, como aquilo ensina e as perguntas mais comuns. Nada abre sozinho. Na Conversa por voz a F1 continua traduzindo a fala; lá a ajuda abre com `?`.

Com a ajuda aberta, o jogo não recebe tecla nenhuma e o Kana Beat pausa. Esc ou um clique fora fecha.

O texto fica em `src/content/ajuda/`, um arquivo por jogo. Um teste confere que toda tela tem ajuda e que toda tecla citada existe de verdade no código da tela, e o contrário também.
