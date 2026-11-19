# Como as imagens foram feitas

Cenários e personagens foram gerados no PC, numa RTX 5060 Ti de 16 GB, com o modelo aberto [Animagine XL 4.0](https://huggingface.co/cagliostrolab/animagine-xl-4.0) (licença CreativeML Open RAIL++-M). Nenhuma imagem passou por serviço online.

O que fica no repositório são só as imagens finais, em `src/assets/cenas/` e `src/assets/pessoas/`: WebP em tons de cinza, com até 960px de largura e menos de 160 KB cada (um teste confere).

## Gerar de novo

Os scripts e o modelo ficam fora do repositório, em `D:\KotobaArcade-Arte`:

```
D:\KotobaArcade-Arte
  modelos\animagine-xl-4.0-opt.safetensors   (6,9 GB)
  venv\                                       Python 3.11 + PyTorch (CUDA 12.8) + diffusers
  scripts\gerar.py                            prompts de cada cenário e personagem
  scripts\otimizar.py                         escolhe a versão, passa para cinza e copia para cá
  geradas\                                    todas as versões em PNG
```

Antes de gerar, feche o Ollama e o servidor da Conversa: os dois disputam a mesma placa.

```bash
cd D:/KotobaArcade-Arte
HF_HOME=D:/KotobaArcade-Arte/hf venv/Scripts/python -I scripts/gerar.py
python -I scripts/otimizar.py D:/Rafael/Documents/GitHub/kotoba-arcade
```

`gerar.py` aceita ids para gerar só alguns (`scripts/gerar.py p-yui kotodama-inari`). Cada imagem leva uns 12 segundos.

Os prompts seguem o guia de estilo: mangá em preto e branco, retícula, nanquim. O prompt negativo tira cor, texto, balão e qualquer coisa com cara de anos 80 ou 90.

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
