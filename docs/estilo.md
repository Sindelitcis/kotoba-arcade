# Guia de estilo

O Kotoba Arcade tem cara de mangá em preto e branco: tinta sobre papel, retícula, quadros de HQ e onomatopeia desenhada. A cor quase não aparece. Quando aparece, é porque você acertou ou ganhou alguma coisa.

Fica de fora qualquer coisa com cara de anos 80 ou 90: city pop, neon, VHS, tela de tubo, pixel art, degradê roxo. A referência é mangá atual impresso.

## Cores

Todas ficam em `:root` no `src/styles.css`. Não use cor solta no CSS: use o token.

| Token | Valor | Para quê |
| --- | --- | --- |
| `--papel` | `#f4f0e6` | fundo de tudo |
| `--papel-2` | `#e8e2d4` | papel mais escuro, campos de texto |
| `--tinta` | `#151313` | traço, texto, quadro |
| `--tinta-2` | `#4a4642` | texto secundário |
| `--cinza` | `#8b857b` | texto apagado, peça bloqueada |
| `--shu` | `#d7261e` | o vermelho: acerto, recompensa, combo, recorde |
| `--kin` | `#e0a526` | o segundo tom: só raridade alta (SR e UR) e baú |

Erro nunca é vermelho. Erro é tinta: risco, tremor, retícula escura. Vermelho é sempre coisa boa.

`--shu` e `--kin` são cores de destaque. Se uma tela tiver mais de dois ou três pontos vermelhos ao mesmo tempo, algum está sobrando.

## Fontes

As duas fontes desenhadas são livres (SIL Open Font License 1.1) e vêm recortadas só com os caracteres que o jogo usa, em `src/assets/fontes/`.

| Token | Fonte | Para quê |
| --- | --- | --- |
| `--f-titulo` | [Dela Gothic One](https://github.com/syakuzen/DelaGothic) | títulos, botões grandes, onomatopeias, números de placar |
| `--f-pincel` | [Yuji Syuku](https://github.com/Kinutafontfactory/Yuji) | kanji grande: carta, inimigo, prompt de pergunta |
| `--jp` | fonte do sistema (Yu Gothic, Hiragino, Noto Sans JP) | japonês corrido, furigana, frases |
| `--f-texto` | fonte do sistema | português |

Texto corrido nunca vai em pincel ou em Dela Gothic: cansa a leitura. Pincel é para um a quatro caracteres bem grandes.

Quando entrar kanji novo no conteúdo, rode o recorte de novo (veja abaixo). Um teste (`tests/estilo.test.ts`) falha se algum kanji do conteúdo ficar sem desenho na fonte de pincel.

```bash
python scripts/recortar-fontes.py CAMINHO_DAS_FONTES_ORIGINAIS
```

## Quadros (コマ)

Cada tela é uma página de mangá: blocos são quadros com borda de tinta grossa e um vão branco entre eles.

- `--quadro`: borda de 3px em `--tinta`. Botão usa 2px.
- Vão entre quadros (`--vao`): 14px.
- Quadro principal da tela (`.koma` ou os painéis de cada jogo) pode ter um canto cortado com `clip-path`, para não ficar tudo retangular igual planilha.
- Sombra só a dura, deslocada e sem desfoque (`--sombra`), como um segundo traço. Nada de brilho ou sombra difusa.
- Cantos retos. No máximo 2px de arredondamento.

## Retícula (スクリーントーン)

Retícula é o cinza do mangá. Feita com `radial-gradient` em pontos, nunca com cinza chapado.

- `--tom-leve`: pontos pequenos e espaçados. Fundo de painel secundário, hover.
- `--tom-medio`: pontos médios. Fundo de cenário atrás do texto, carta virada.
- `--tom-forte`: pontos grandes. Erro, coisa bloqueada, sombra de impacto.

As fotos de cenário e os personagens passam por um filtro que deixa tudo em tons de cinza. A retícula vai por cima.

## Linhas de velocidade

- Linhas de concentração (集中線, `.speed`): raios saindo do centro, para o momento importante: captura, chefe, nota perfeita, botão de jogar.
- Linhas paralelas (`.speed-h`): movimento, no Kana Beat e na troca de quadro.

## Onomatopeia (擬音)

Feedback de acerto e erro é uma onomatopeia carimbada na tela, perto de onde aconteceu. Chame `onomato(palavra, elemento, cor)` de `src/core/fx.ts`.

| Palavra | Quando | Cor |
| --- | --- | --- |
| ドン | acerto | `shu` |
| ズバッ | acerto rápido | `shu` |
| カチッ | peça encaixada (Kumitate) | `shu` |
| ピカッ | captura, nota perfeita, objetivo cumprido | `shu` |
| ドドン | subir de nível | `shu` |
| パカッ | baú | `kin` |
| ゴゴゴ | carta ou inimigo raro aparecendo | `kin` |
| バッ | carta virada no booster | `tinta` |
| ガキン | escudo segurou o golpe | `tinta` |
| バキッ | inimigo acertou você | `tinta` |
| スカッ | erro | `tinta` |

Regras:

- Uma onomatopeia por evento. Duas ao mesmo tempo viram ruído.
- Some em menos de um segundo e nunca cobre a pergunta seguinte (`pointer-events: none`).
- Contorno de papel em volta da letra, para ler em cima de qualquer fundo.
- Cada onomatopeia tem um som parecido em `src/core/audio.ts`.

## Movimento

- Traço que se desenha: título e sublinhado de pincel entram com `stroke` animado.
- Tremor de quadro: as bordas dos quadros principais tremem de leve, trocando entre três filtros de deslocamento (o "line boil" de animação à mão). É para a tela não parecer parada.
- Impacto: acerto dá um tranco curto no quadro; erro dá um tremor de lado.

O modo calmo (`Ajustes`) e o `prefers-reduced-motion` do sistema desligam o tremor de quadro, encurtam os trancos, deixam a onomatopeia menor e sem giro e cortam a maior parte dos respingos. A informação continua toda na tela.

## Cenários e personagens

Lugares reais do Japão, desenhados em preto e branco (cruzamento de Shibuya, Fushimi Inari, Dotonbori, aeroporto de Narita, estação de Shinjuku). Ficam em `src/assets/cenas/` e `src/assets/pessoas/`, em WebP cinza, com no máximo 960px de largura.

Foram gerados no PC com um modelo aberto (veja os créditos no README). Para gerar de novo, siga `docs/imagens.md`.

## Cartas do KanjiMon

A arte de cada carta continua a original, vinda de `kanjimon.online`. O que muda é a moldura:

- C: quadro de tinta simples.
- R: quadro duplo, com fio branco por dentro.
- SR: quadro vermelho (`--shu`).
- UR: quadro vermelho com fio dourado (`--kin`) e linhas de concentração atrás.

O kanji da carta fica num balão de legenda branco, em pincel, no canto de cima.
