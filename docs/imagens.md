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
| `pecas-ryoanji` | jardim de pedras do templo Ryoan-ji, Kyoto |

O modelo não copia o lugar ao pé da letra: é a impressão do lugar, como num mangá.

## Estúdio de imagens (ilustrações de vocabulário)

Os jogos de imagem (Memória, Cena Viva e os de kana e kanji com imagem) usam o estúdio: `scripts/estudio.py`. Ele gera tudo de novo a partir de uma lista de prompts versionada em `scripts/imagens/<lote>.json`, confere cada imagem com o CLIP e exporta só o resultado final para o repositório.

O que ele usa, tudo fora do repositório em `D:\KotobaArcade-Arte`:

| Modelo | Para quê | Tamanho | Licença |
| --- | --- | --- | --- |
| [Animagine XL 4.0](https://huggingface.co/cagliostrolab/animagine-xl-4.0) (`modelos\animagine-xl-4.0-opt.safetensors`) | gerar | 6,9 GB | CreativeML Open RAIL++-M (permite uso e publicação das imagens) |
| [CLIP ViT-H-14 da LAION](https://huggingface.co/laion/CLIP-ViT-H-14-laion2B-s32B-b79K) (`hf\hub\models--laion--CLIP-ViT-H-14-laion2B-s32B-b79K`) | conferir | 3,9 GB | MIT |

### Como rodar

```bash
cd D:/Rafael/Documents/GitHub/kotoba-arcade
export HF_HOME=D:/KotobaArcade-Arte/hf KOTOBA_SESSAO=nome-da-sua-sessao
PY=D:/KotobaArcade-Arte/venv/Scripts/python
$PY -I scripts/estudio.py tudo scripts/imagens/objetos.json
```

`tudo` faz, em ordem:

1. **gerar**: cada item sai em várias seeds (`seeds` da lista), em PNG, em `D:\KotobaArcade-Arte\estudio\<lote>\`. O que já existe não é gerado de novo.
2. **conferir**: o CLIP compara cada candidata com o rótulo do próprio item, com os rótulos de todos os outros itens do lote, com os `distratores` da lista e com alguns gerais (forma abstrata, objeto deformado, texto escrito). A imagem só passa se o próprio rótulo ganhar com chance de pelo menos 45% e 15 pontos de folga sobre o segundo. O relatório fica em `conferencia.json`.
3. **refazer**: item sem nenhuma candidata aprovada ganha outra leva de seeds, até duas vezes.
4. **exportar**: a melhor candidata aprovada vira WebP no `destino` da lista (cor) e em `<destino>-tinta` (versão mangá, em cinza). Com `"recorte": true` o fundo some (fica transparente).
5. **folha**: folhas de contato em JPG para olhar tudo de uma vez.

Cada passo também roda sozinho: `gerar`, `conferir`, `exportar`, `folha` (e `folha ... x` para ver só as reprovadas). `gerar` aceita ids para gerar só alguns.

O CLIP pega muita coisa (um "comendo" que parece só um hashi, uma chave deformada), mas não tudo. Depois de cada lote, olhe as folhas. Para vetar uma candidata, ponha a chave dela em `"vetadas"`. Para fixar uma à mão, use `"escolha": {"id": seed}`. Se nenhuma serve, mude o prompt e rode de novo.

### A placa é dividida

Tudo que usa a placa de vídeo passa por `scripts/placa.py`: o estúdio, a gravação de vozes e qualquer teste de modelo. Ela prende `D:\KotobaArcade-Arte\gpu.lock` com uma trava do sistema, num arquivo mantido aberto. Se o processo morre, o sistema solta a trava sozinho; enquanto ela está presa, o arquivo não pode ser apagado. O texto dentro do arquivo (sessão, hora, pid) é só para gente ler. Um lock do jeito antigo (só o arquivo) com o processo já morto não prende ninguém.

Antes de prender, ela espera o Ollama não ter modelo carregado, os motores de voz de outra pessoa saírem do ar e sobrar memória livre na placa (o Rafael pode estar jogando). Para envolver qualquer comando:

```bash
python -I scripts/placa.py --nome teste-flux --vram 12 -- D:/KotobaArcade-Arte/venv/Scripts/python -I meu-teste.py
python -I scripts/placa.py status
```

No Windows, se o `placa.py` for fechado, o comando morre junto: nunca fica nada usando a placa sem trava.

### Memória da placa

Só um modelo fica na placa por vez: no `tudo`, o modelo de imagem sai antes de o CLIP entrar, e o contrário antes de refazer as reprovadas. A VAE decodifica uma imagem por vez e em ladrilhos. O PyTorch recebe um teto igual à memória livre no começo: passar dele vira erro, e o estúdio segue com uma imagem por vez, em vez de o driver jogar o excesso na RAM (o que deixa tudo dezenas de vezes mais lento). O pico de cada fase sai no log.

### Motores

O modelo de imagem vem de `scripts/imagens/motores.json`. Cada motor diz o tipo (`sdxl-arquivo`, um `.safetensors` em `D:\KotobaArcade-Arte`, ou `diffusers`, uma pasta ou repositório), os passos, o cfg, o offload (`nenhum`, `modelo` ou `sequencial`), a memória que precisa livre (`vram`, em GB) e as palavras de qualidade que o modelo espera. Para trocar, use `"motor": "nome"` na lista ou `KOTOBA_MOTOR=nome`. Uma lista pode ajustar um motor em `"por_motor": {"nome": {"passos": 24}}`. Trocar de motor não refaz o que já foi aprovado: só gera as candidatas que faltam.

### Formato da lista

```json
{
  "lote": "objetos",
  "destino": "src/assets/imagens",
  "largura": 896, "altura": 896, "passos": 24, "saida": 384,
  "recorte": true,
  "estilo": "no humans, object focus, single object, ...",
  "negativo": "multiple objects, photo, ...",
  "distratores": ["a person", "a room"],
  "seeds": [1, 2, 3],
  "itens": [
    { "id": "kasa", "rotulo": "an umbrella", "prompt": "closed umbrella standing upright", "evitar": ["a cane"] }
  ]
}
```

- `id`: nome do arquivo (a-z, 0-9 e hífen).
- `rotulo`: o que o CLIP precisa reconhecer, em inglês, curto. Dois itens do mesmo lote com rótulos quase iguais vão se reprovar um ao outro: isso é bom, porque na tela eles também se confundiriam.
- `evitar`: rótulos extras só daquele item (o que ele não pode parecer).

Uma imagem precisa mostrar uma ideia só e não pode ter texto escrito. Por isso o estilo de objeto pede um objeto centralizado, sem pessoas, e o negativo tira letras, logotipos e etiquetas.
