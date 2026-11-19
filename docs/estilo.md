# Guia de estilo

O Kotoba Arcade mistura duas coisas: mangá em preto e branco (tinta sobre papel, retícula, quadros de HQ, onomatopeia desenhada) e anime colorido atual. A tela começa no traço. A cor de anime chega quando você vai bem e vai embora devagar quando você erra ou para. Veja "Mangá e anime" mais abaixo.

Fica de fora qualquer coisa com cara de anos 80 ou 90: city pop, neon, VHS, tela de tubo, pixel art, degradê roxo. A referência é mangá atual impresso e anime atual: cor limpa, luz clara, céu azul.

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

A paleta de anime só entra junto com a cor de recompensa (o `--cor` subindo), nunca no traço de mangá parado:

| Token | Valor | Para quê |
| --- | --- | --- |
| `--sora` | `#2f9be8` | azul de céu: linha do Kana Beat, raios de vitória |
| `--sakura` | `#ff6f9f` | rosa: combo cheio, chefe do Kotodama, captura |
| `--midori` | `#2fbf71` | verde: relíquias |
| `--yuuhi` | `#ff9f2e` | laranja de fim de tarde: relíquias, brilho do chefe |

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

## Mangá e anime

### A cor é recompensa

Cada quadro com cenário tem duas camadas: o desenho de mangá e, por cima, a mesma imagem pintada em anime (`<Pintura>` em `src/core/Pintura.tsx`). A camada colorida aparece por um borrão de tinta que cresce do meio do quadro, controlado pela variável CSS `--cor`, de 0 (só tinta) a 1 (cor cheia). O valor sai de `src/core/cor.ts`:

- Acerto: a cor sobe até o nível do combo. Seis acertos seguidos enchem (no Kana Beat, dez notas). Um acerto nunca tira cor.
- Erro: sobra 35% da cor. Ela cai devagar (a transição leva 0,9 s), não some de uma vez.
- Pausa, recomeço e troca de tela: volta para o traço.
- Progresso que só cresce (frases da rodada do Kumitate): usa `progresso()`.

### Onde é mangá

A leitura pede foco, então nessas telas o traço manda e a cor é só acento:

- Kumitate: o tabuleiro ganha no máximo metade da cor, aos poucos, a cada frase montada. A lição fica toda em mangá.
- Perguntas do KanjiMon: a arena pinta com o combo, mas a carta e as respostas continuam no traço.
- KanjiDex e painel de ajuda: só mangá, com o vermelho e o dourado de sempre.
- Quadros de passagem e onomatopeia: a narração da Aventura é um quadro de mangá, mesmo no meio de uma cena colorida.

### Onde é anime

Onde a graça é viver ou comemorar, a cor entra cheia:

- Aventura e Conversa: lugar e personagem em cor de anime durante a cena. A narração volta ao mangá. Os retratos coloridos são as mesmas pessoas do mangá.
- Captura e booster do KanjiMon: a arte da carta sai do cinza para a cor e estoura para fora do quadro com aros rosa e azul. A arte continua a original de `kanjimon.online`; só o efeito muda.
- Chefe e elite do Kotodama entram em cor cheia; relíquias têm fundo colorido. No combate comum o santuário pinta com os acertos.
- Kana Beat: a rua de Dotonbori acende com o combo, e a linha de acerto passa de tinta para azul.
- Vitória (nível, baú, fim de rodada): raios azuis e rosa atrás do quadro.

### O fliperama mistura os dois

A capa é mangá. Cada jogo que você já jogou de verdade (capturou, terminou uma música, uma run, uma cena, uma rodada, uma conversa) aparece pintado, como um mapa que vai ganhando cor. A capa "Jogar agora" pinta na mesma proporção: com os seis jogos jogados, Shibuya fica toda colorida. Nos menus da Aventura e da Conversa, cena concluída também fica pintada.

### Como uma passa para a outra

Sem corte seco nem esmaecido genérico. A passagem é sempre de tinta:

- Borrão de tinta que vira cor: a máscara cresce do centro, com respingos em volta.
- Pincelada: ao abrir uma cena da Aventura ou uma conversa, o borrão cresce do zero até cheio (animação `pintar`).
- Corte de quadro: a narração volta ao mangá dentro do mesmo quadro.

No modo calmo a cor ainda chega, mas mais devagar (1,6 s), um pouco menos saturada e sem as animações de pintar e de colorir carta.

## Cenários e personagens

Lugares reais do Japão (cruzamento de Shibuya, Fushimi Inari, Dotonbori, aeroporto de Narita, estação de Shinjuku), cada um em duas versões com a mesma composição: mangá em `src/assets/cenas/` e `src/assets/pessoas/` (WebP cinza) e anime em `src/assets/cenas-cor/` e `src/assets/pessoas-cor/` (WebP colorido). Todas com no máximo 960px de largura e menos de 160 KB. Um teste falha se uma imagem de mangá ficar sem a versão colorida.

Foram gerados no PC com um modelo aberto (veja os créditos no README). Para gerar de novo, siga `docs/imagens.md`.

## Cartas do KanjiMon

A arte de cada carta continua a original, vinda de `kanjimon.online`. O que muda é a moldura:

- C: quadro de tinta simples.
- R: quadro duplo, com fio branco por dentro.
- SR: quadro vermelho (`--shu`).
- UR: quadro vermelho com fio dourado (`--kin`) e linhas de concentração atrás.

O kanji da carta fica num balão de legenda branco, em pincel, no canto de cima.
