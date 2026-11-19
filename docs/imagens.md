# Como as imagens foram feitas

Cenários e personagens foram gerados no PC, numa RTX 5060 Ti de 16 GB, com o modelo aberto [Animagine XL 4.0](https://huggingface.co/cagliostrolab/animagine-xl-4.0) (licença CreativeML Open RAIL++-M). Nenhuma imagem passou por serviço online.

O que fica no repositório são só as imagens finais: a versão de mangá em `src/assets/cenas/` e `src/assets/pessoas/` (WebP em tons de cinza) e a versão anime em `src/assets/cenas-cor/` e `src/assets/pessoas-cor/` (WebP colorido). Todas com até 960px de largura e menos de 160 KB cada (um teste confere).

## Gerar de novo

Os scripts e o modelo ficam fora do repositório, em `D:\KotobaArcade-Arte`:

```
D:\KotobaArcade-Arte
  modelos\animagine-xl-4.0-opt.safetensors   (6,9 GB)
  venv\                                       Python 3.11 + PyTorch (CUDA 12.8) + diffusers
  scripts\gerar.py                            prompts de cada cenário e personagem
  scripts\otimizar.py                         escolhe a versão, passa para cinza e copia para cá
  scripts\colorir.py                          pinta a versão de mangá escolhida em anime (img2img)
  scripts\otimizar_cor.py                     passa as coloridas para WebP e copia para cá
  geradas\                                    todas as versões em PNG
  coloridas\                                  versões anime em PNG
```

Antes de gerar, feche o Ollama e o servidor da Conversa: os dois disputam a mesma placa.

```bash
cd D:/KotobaArcade-Arte
HF_HOME=D:/KotobaArcade-Arte/hf venv/Scripts/python -I scripts/gerar.py
python -I scripts/otimizar.py D:/Rafael/Documents/GitHub/kotoba-arcade
```

`gerar.py` aceita ids para gerar só alguns (`scripts/gerar.py p-yui kotodama-inari`). Cada imagem leva uns 12 segundos.

Os prompts seguem o guia de estilo: mangá em preto e branco, retícula, nanquim. O prompt negativo tira cor, texto, balão e qualquer coisa com cara de anos 80 ou 90.

## Versão anime

A versão colorida não é gerada do zero: `colorir.py` parte do PNG de mangá escolhido e pinta por cima (img2img, força 0,80, mesma seed). Assim o lugar, o enquadramento e a pessoa são os mesmos nas duas versões. Com força 0,55 e 0,70 a imagem continuava quase cinza.

```bash
HF_HOME=D:/KotobaArcade-Arte/hf venv/Scripts/python -I scripts/colorir.py 0.80
python -I scripts/otimizar_cor.py D:/Rafael/Documents/GitHub/kotoba-arcade
```

O prompt é o mesmo do mangá, trocando o estilo por anime atual: cor viva, cel shading limpo, luz natural, céu azul. O negativo tira monocromático, sépia, neon, synthwave, VHS e cara de anos 80 e 90. Algumas imagens têm uma dica de cor própria em `DICA` (os torii de Fushimi Inari são vermelho-alaranjados, o cabelo do Takeshi é preto), porque sem ela o modelo pintava tudo de arco-íris.

## Lugares

| Arquivo | Lugar |
| --- | --- |
| `hub-shibuya` | cruzamento de Shibuya, Tóquio |
| `kanjimon-takao` | trilha do monte Takao |
| `kanabeat-dotonbori` | canal de Dotonbori, Osaka |
| `kotodama-inari` | túnel de torii do Fushimi Inari, Kyoto |
| `kumitate-gion` | rua Hanamikoji, Gion, Kyoto |
| `aventura-narita` | saguão de chegada do aeroporto de Narita |
| `aventura-shinjuku` | catracas da estação de Shinjuku |
| `aventura-konbini` | konbini por dentro |
| `conversa-cafe` | café pequeno em Tóquio |
| `conversa-osaka` | rua de bairro em Osaka |
| `conversa-sharehouse` | cozinha de casa compartilhada |
| `conversa-restaurante` | restaurante pequeno (izakaya) |

O modelo não copia o lugar ao pé da letra: é a impressão do lugar, como num mangá.
