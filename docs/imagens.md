# Como as imagens foram feitas

Tudo foi gerado no PC, numa RTX 5060 Ti de 16 GB. Nenhuma imagem passou por serviço online.

- Cenários e personagens, e as primeiras ilustrações de vocabulário: [Animagine XL 4.0](https://huggingface.co/cagliostrolab/animagine-xl-4.0), da Cagliostro Research Lab (licença CreativeML Open RAIL++-M). O arquivo do modelo foi apagado do PC em novembro de 2026; para gerar estas de novo, baixe outra vez.
- Ilustrações de vocabulário daqui para a frente (Memória, Cena Viva, kana com imagem): [Anima Turbo v1.1](https://huggingface.co/circlestone-labs/Anima), da CircleStone Labs. Ganhou de seis modelos num teste com os mesmos prompts: traço de anime mais natural, gato com o rabo ligado ao corpo, konbini sem texto falso e o único que fez uma reverência de verdade.

O que fica no repositório são só as imagens finais, sempre coloridas: cenários em `src/assets/cenas-cor/`, retratos em `src/assets/pessoas-cor/` e vocabulário em `imagens/`, `acoes/`, `gente/`, `lugares/` e `kana/`. Até novembro de 2026 cada imagem tinha também uma cópia em cinza para o visual de mangá; o visual Sora (docs/estilo.md) usa só a colorida, e as cópias saíram. Todas com até 960px de largura e menos de 160 KB cada (um teste confere).

## Gerar de novo

Os scripts e o modelo ficam fora do repositório, em `D:\KotobaArcade\\arte`:

```
D:\KotobaArcade\\arte
  modelos\animagine-xl-4.0-opt.safetensors   (6,9 GB; apagado em novembro de 2026, baixe de novo para refazer)
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
cd D:/KotobaArcade/arte
HF_HOME=D:/KotobaArcade/arte/hf venv/Scripts/python -I scripts/gerar.py
python -I scripts/otimizar.py D:/Rafael/Documents/GitHub/kotoba-arcade
```

`gerar.py` aceita ids para gerar só alguns (`scripts/gerar.py p-yui kotodama-inari`). Cada imagem leva uns 12 segundos.

Os prompts seguiam o guia de estilo da época: mangá em preto e branco, retícula, nanquim. O prompt negativo tira cor, texto, balão e qualquer coisa com cara de anos 80 ou 90.

## Versão anime

A versão colorida não é gerada do zero: `colorir.py` parte do PNG de mangá escolhido e pinta por cima (img2img, força 0,80, mesma seed). Assim o lugar, o enquadramento e a pessoa são os mesmos nas duas versões. Com força 0,55 e 0,70 a imagem continuava quase cinza.

```bash
HF_HOME=D:/KotobaArcade/arte/hf venv/Scripts/python -I scripts/colorir.py 0.80
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

O que ele usa, tudo fora do repositório em `D:\KotobaArcade\\arte`:

| Modelo | Para quê | Tamanho | Licença |
| --- | --- | --- | --- |
| [Anima Turbo v1.1](https://huggingface.co/circlestone-labs/Anima) (base em `modelos\anima`, pesos do Turbo em `modelos\anima-variantes\split_files\diffusion_models\anima-turbo-v1.1.safetensors`) | gerar | 5,3 GB + 3,9 GB | CircleStone Labs Non-Commercial License v1.0 |
| [CLIP ViT-H-14 da LAION](https://huggingface.co/laion/CLIP-ViT-H-14-laion2B-s32B-b79K) (`hf\hub\models--laion--CLIP-ViT-H-14-laion2B-s32B-b79K`) | conferir | 3,9 GB | MIT |
| [Gemma 4 12B](https://ollama.com/library/gemma4), no Ollama (`gemma4:12b`) | revisar defeitos | 7,6 GB | Apache 2.0 |

A licença do Anima é não comercial. O Kotoba Arcade é um projeto pessoal, sem venda nem anúncio, e o Rafael liberou o uso por isso. Pela licença, a imagem gerada é de quem gerou e pode ser usada à vontade; a restrição vale para o modelo. Se o projeto um dia virar comercial, o modelo tem de ser trocado ou licenciado com a CircleStone. Aviso pedido pela licença:

> The CircleStone Model is licensed by CircleStone Labs LLC under the CircleStone Non-Commercial License. Copyright CircleStone Labs LLC.

O Anima Turbo roda com 10 passos e cfg 1. Com cfg 1 o prompt negativo não faz efeito, então a clareza vem do prompt e das duas conferências. O prompt começa com `masterpiece, best quality, safe, `, seguido das tags e da frase do item. Leva uns 7 segundos por imagem, com pico de 9,4 GB na placa. Objetos finos (um anzol, por exemplo) mudam muito de uma seed para outra; por isso continuam três seeds por item.

### Como rodar

```bash
cd D:/Rafael/Documents/GitHub/kotoba-arcade
export HF_HOME=D:/KotobaArcade/arte/hf KOTOBA_SESSAO=nome-da-sua-sessao
PY=D:/KotobaArcade/arte/venv/Scripts/python
$PY -I scripts/estudio.py tudo scripts/imagens/objetos.json
```

`tudo` faz, em ordem:

1. **gerar**: cada item sai em várias seeds (`seeds` da lista), em PNG, em `D:\KotobaArcade\arte\estudio\<lote>\`. O que já existe não é gerado de novo.
2. **conferir**: o CLIP compara cada candidata com o rótulo do próprio item, com os rótulos de todos os outros itens do lote, com os `distratores` da lista e com alguns gerais (forma abstrata, objeto deformado, texto escrito). A imagem só passa se o próprio rótulo ganhar com chance de pelo menos 45% e 15 pontos de folga sobre o segundo. O relatório fica em `conferencia.json`. A nota guardada só é reaproveitada para o mesmo arquivo com a mesma lista de rótulos: imagem refeita com a mesma seed é conferida de novo.
3. **revisar**: o CLIP vê que é um gato, mas não vê que o rabo virou uma mancha solta. Por isso a candidata escolhida passa ainda por um modelo de visão local (`gemma4:12b`, no Ollama), que responde o que a figura mostra e se tem membro solto, parte faltando, pedaço solto ou se está ambígua (um bicho só de costas, por exemplo). Com qualquer defeito, ela sai e a próxima aprovada pelo CLIP é revista. O resultado fica em `revisao.json` e só é refeito para arquivo novo ou outro modelo. Roda com o modelo de imagem e o CLIP já fora da placa, sob a mesma trava, e o modelo de visão é descarregado no fim (`keep_alive: 0`). Troque o modelo com `KOTOBA_VISAO`.
4. **refazer**: item sem nenhuma candidata aprovada ganha outra leva de seeds, até duas vezes.
5. **exportar**: a melhor candidata aprovada vira WebP no `destino` da lista. Com `"recorte": true` o fundo some (fica transparente).
6. **folha**: folhas de contato em JPG para olhar tudo de uma vez. A reprovada na revisão aparece em vermelho com o defeito. Mesmo com as duas conferências, olhe a folha antes de publicar.

Cada passo também roda sozinho: `gerar`, `conferir`, `exportar`, `folha` (e `folha ... x` para ver só as reprovadas). `gerar` aceita ids para gerar só alguns.

O CLIP pega muita coisa (um "comendo" que parece só um hashi, uma chave deformada), mas não tudo. Depois de cada lote, olhe as folhas. Para vetar uma candidata, ponha a chave dela em `"vetadas"`. Para fixar uma à mão, use `"escolha": {"id": seed}`. Se nenhuma serve, mude o prompt e rode de novo.

### A placa é dividida

Tudo que usa a placa de vídeo passa por `scripts/placa.py`: o estúdio, a gravação de vozes e qualquer teste de modelo. Ela prende `D:\KotobaArcade\arte\gpu.lock` com uma trava do sistema, num arquivo mantido aberto. Se o processo morre, o sistema solta a trava sozinho; enquanto ela está presa, o arquivo não pode ser apagado. O texto dentro do arquivo (sessão, hora, pid) é só para gente ler. Um lock do jeito antigo (só o arquivo) com o processo já morto não prende ninguém.

Antes de prender, ela espera o Ollama não ter modelo carregado, os motores de voz de outra pessoa saírem do ar e sobrar memória livre na placa (o Rafael pode estar jogando). Para envolver qualquer comando:

```bash
python -I scripts/placa.py --nome teste-flux --vram 12 -- D:/KotobaArcade/arte/venv/Scripts/python -I meu-teste.py
python -I scripts/placa.py status
```

No Windows, se o `placa.py` for fechado, o comando morre junto: nunca fica nada usando a placa sem trava.

### Memória da placa

Só um modelo fica na placa por vez: no `tudo`, o modelo de imagem sai antes de o CLIP entrar, e o contrário antes de refazer as reprovadas. A VAE decodifica uma imagem por vez e em ladrilhos. O PyTorch recebe um teto igual à memória livre no começo: passar dele vira erro, e o estúdio segue com uma imagem por vez, em vez de o driver jogar o excesso na RAM (o que deixa tudo dezenas de vezes mais lento). O pico de cada fase sai no log.

### Motores

O modelo de imagem vem de `scripts/imagens/motores.json`. Cada motor diz o tipo (`anima`, a base do Anima com os pesos de uma variante por cima; `sdxl-arquivo`, um `.safetensors` em `D:\KotobaArcade\\arte`; ou `diffusers`, uma pasta ou repositório), os passos, o cfg, o offload (`nenhum`, `modelo` ou `sequencial`), a memória que precisa livre (`vram`, em GB) as palavras que o modelo espera no começo (`prefixo`) e no fim (`qualidade`) do prompt, onde nasce a seed (`gerador`), quantas imagens por chamada (`lote`) e um deslocamento de seed (`seed`). O deslocamento dá outro nome de arquivo à candidata de um modelo novo: sem ele, o estúdio acharia que `neko-1` já foi gerada. Para trocar, use `"motor": "nome"` na lista ou `KOTOBA_MOTOR=nome`. Uma lista pode ajustar um motor em `"por_motor": {"nome": {"passos": 24}}`. Trocar de motor não refaz o que já foi aprovado: só gera as candidatas que faltam.

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

### Os lotes do vocabulário

Os prompts ficam em `scripts/imagens/gerar-listas.py`, que escreve as quatro listas. Os ajustes feitos depois de olhar as folhas (`vetadas`, `escolha`) ficam no fim dele, em `AJUSTES`, com o motivo.

| Lote | O que tem | Gerado em | Sai em |
| --- | --- | --- | --- |
| `objetos.json` | 258 imagens: coisas do dia a dia, comida, bichos, prédios, tempo e partes do corpo, uma por imagem, mais seis objetos (guarda-chuva, bolsa, carro, chapéu, sapato, camiseta) em vermelho, azul, preto e branco. O guarda-chuva branco não tem imagem (`SEM_IMAGEM`): no fundo recortado ele some | 896×896, fundo recortado | `src/assets/imagens` (384 px) |
| `acoes.json` | 42 imagens de uma pessoa fazendo uma coisa (ler, comer, dirigir, pedir desculpas...), para 読んでいる人 | 832×1216, fundo recortado | `src/assets/acoes` (512 px) |
| `pessoas.json` | 17 imagens de gente parada: menino, avó, médico, funcionário da estação... Contam com 人 e, na Cena Viva, ficam no lugar como as coisas, mas com います | 832×1216, fundo recortado | `src/assets/gente` (512 px) |
| `lugares.json` | os oito fundos da Cena Viva, sem gente e sem objeto solto no meio | 1216×832 | `src/assets/lugares` (960 px) |

Saíram da lista as palavras que o modelo não desenhou de forma reconhecível em três rodadas de prompt: cartão, boneco de neve, bilhete, cartão de visita, revista, jornal, papel, colírio, curativo, pasta de dente, bala, sol e o verbo esperar. Quase todas dependem de texto escrito ou são uma folha lisa, que vira só um retângulo. Elas continuam nos outros jogos, só não têm imagem. Na segunda leva, já no Anima, saíram também せんべい, イヤホン e 横断歩道 pelo mesmo motivo.

As partes do corpo (mão, olho, boca...) usam um estilo próprio (`estilo` no item), porque o dos objetos pede "no humans" e apagava a mão. O modelo de visão reprova toda boca em close dizendo que falta a cabeça; a boca foi escolhida à mão.

Quando a lista ganha palavras novas, as notas do CLIP dos itens antigos mudam: "a house" passa a disputar com "a school", a toalha com o pano de chão. Por isso a candidata já aprovada pelo modelo de visão continua a escolhida, mesmo que o CLIP prefira outra ou reprove todas. Sem isso, o `exportar` trocava imagens boas por candidatas que ninguém revisou.

O conteúdo de cada imagem (palavra, kana, significado, nível, contador) fica em `src/content/imagens.ts`, que aponta para o id. A Cena Viva monta cada lugar por cima do fundo em `src/games/cena/lugares.ts`: as coisas são postas umas em relação às outras (em cima, embaixo, ao lado, na frente, dentro) usando a medida real de cada imagem, guardada em `medidas.json` pelo `exportar`. As frases dos pedidos saem desses dados; nenhuma é escrita à mão.
