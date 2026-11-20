# Kotoba Arcade

Fliperama de jogos para aprender japonês, feito pensando em quem tem TDAH. A regra da casa é simples: primeiro tem que ser um jogo bom. O estudo acontece por dentro dele.

Por cima dos jogos fica a **Jornada** (tecla `J` no fliperama): um mapa em quadros de mangá com o caminho do zero até trabalhar no Japão. Cada passo é uma missão curta, uma lição em quadrinhos ou um dos jogos abaixo só com o conteúdo daquela parte. O Enter do fliperama continua abrindo o jogo da vez.

Para aprender só ouvindo existe o modo **Ouvir** (tecla `O`): uma aula de um a três minutos para cada lição da Jornada. A explicação vem em português, depois o exemplo em japonês, uma pausa para você repetir em voz alta e o japonês de novo. O português tem duas vozes, Voz 1 e Voz 2; a escolha fica em Ajustes. Dá para usar sem olhar a tela: espaço toca e pausa, as setas pulam, uma aula puxa a outra e os botões do fone funcionam.

Jogos que já dá para jogar:

- **KanjiMon**: o [KanjiMon original](https://github.com/Sindelitcis/KanjiMon) refeito aqui dentro. Você caça kanji, quebra os selos respondendo e junta as cartas na KanjiDex.
- **Kana em imagens**: cada kana mora dentro de um desenho. し é um anzol, つ é uma onda gigante, ふ é alguém soprando uma vela. Kana novo chega numa apresentação com a imagem, o som, uma frase curta e uma palavra comum, e só depois é perguntado, ainda com a imagem por perto. Conforme a letra firma, a pergunta fica mais seca: da imagem para a letra, da letra para a imagem, pares que confundem lado a lado (シ e ツ, ぬ e め), só pelo som e, por fim, palavras inteiras em katakana (コンビニ, アルバイト, パスポート). Vai do あ aos sons de fora (ファ, ティ, ヴ), 231 kana ao todo. Quem já lê faz um teste rápido e pula o que sabe. Rodadas de dez perguntas.
- **Kana Beat**: ritmo e digitação. Kana e palavras chegam na linha no tempo da batida e você digita a leitura. A música é de verdade (lofi, eletrônica e batida com koto) e acelera quando você vai bem e desacelera quando não vai.
- **Kotodama**: roguelike de cartas. Cada carta é um kanji ou uma palavra. Jogar a carta abre uma pergunta: acertou, o golpe sai forte; errou, sai fraco. Você sobe sete andares até o chefe, pega relíquias que mudam as regras e escolhe cartas novas depois de cada luta. Uma run leva de 5 a 10 minutos.
- **Aventura**: você acabou de chegar ao Japão e vive cenas curtas do dia a dia (imigração, guichê do trem, konbini). As pessoas falam japonês de verdade, com áudio, e você responde escolhendo o que dizer. Não tem tela de erro: se a pessoa não entende, ela estranha, repete, e a conversa continua. Palavra nova aparece com leitura e significado; conforme firma na memória, a ajuda some. Cada cena leva de 3 a 5 minutos e as falas vividas ficam num diário para reler e ouvir.
- **Kumitate**: puzzle de montar frases. Cada frase tem buracos e você encaixa partículas (は, を, に, で...) e pontas de verbo (ます, ません, た, ない...) até ela dizer o que foi pedido em português. A ponta encaixada transforma o verbo na hora: 飲む vira 飲みました. Peça que não serve volta para a bandeja com o motivo, sem tela de erro. Cada ponto de gramática é uma peça nova que destrava depois de você acertar a anterior de primeira algumas vezes, e chega com uma lição curta e um exemplo antes de ser cobrado. Uma rodada são seis frases.
- **Kanji em peças**: o kanji visto como desenho feito de peças que se repetem. 休 é uma pessoa (亻) encostada na árvore (木): descansar. São cinco modos curtos: achar a peça, montar o kanji, achar o intruso entre kanji parecidos (未 e 末, 土 e 士), adivinhar o significado de um kanji nunca visto só pelas peças e ler palavras de dois kanji. Cobre todos os kanji do N5, N4 e N3 (612), com 383 peças, cada uma com nome em português e uma imagem. No fliperama, a tecla P abre direto.
- **Conversa por voz**: você escolhe uma cena (pedir no café, perguntar o caminho, se apresentar, entrevista de trabalho) e conversa em japonês falando no microfone ou digitando em romaji ou kana. O personagem responde com voz e com furigana, no seu nível, puxando as palavras que você já está aprendendo. Travou, aperta Tab: vem uma dica e, na segunda vez, duas respostas prontas. Cada cena tem um objetivo, dura de 2 a 4 minutos e acaba num resumo com o que você disse bem, uma ou duas sugestões para soar mais natural e as palavras novas, que entram na memória. A IA fica na nuvem da Cloudflare, protegida por senha (veja `docs/nuvem.md`). Quem joga no PC pode usar a IA da própria máquina com `npm run local`.
- **Memória** (tecla `M`): jogo da memória de imagem e palavra. Cada carta de imagem tem o par com a palavra em japonês. Começa com a palavra em kana, passa para o kanji, depois só o áudio (a carta fala e você acha a imagem) e por fim pares que se confundem, como いす (cadeira) e いぬ (cachorro). Uma rodada são três quadros curtos, com pausa entre eles, e leva de 1 a 3 minutos. Palavra nova aparece antes numa lição, com imagem e voz. Par errado só desvira; depois de dois enganos, o par certo brilha.
- **Cena Viva** (tecla `L`): oito lugares de verdade (konbini, estação, quarto, escritório, cozinha, farmácia, restaurante e rua), cada um com 20 a 35 coisas que dá para clicar. A frase pede e você acha: começa em 傘はどこ？ e cresce para cor (赤い傘), tamanho, lugar (机の上の本), contadores (りんごが三つ), quem está fazendo o quê (読んでいる人), frases longas que juntam tudo e, no fim, você mesmo monta a frase que descreve a cena (テーブルの上にかばんがあります). Vai do N5 ao N3. Clicou na coisa errada, ela diz o próprio nome e o pedido continua. Cada rodada são oito pedidos.

## Como rodar

Precisa de Node 22 ou mais novo.

```bash
npm install
npm run dev
```

Abre em http://localhost:5173. Para gerar a versão final, `npm run build` (sai na pasta `dist`).

### Conversa por voz no PC (opcional)

Por padrão a Conversa usa a nuvem (`docs/nuvem.md`). Para usar a IA da sua máquina, com a voz do AivisSpeech e sem cota diária, são três programas, e um comando liga todos:

```bash
npm run local
```

Ele sobe o servidor da pasta `local/` em `127.0.0.1:8791`, abre o Ollama e o AivisSpeech se ainda não estiverem abertos e roda o jogo em http://localhost:5173. Quando aparecer "tudo pronto", é só jogar. Ctrl+C fecha tudo.

| Parte      | O que usa                                                                                 | Onde roda                                   |
| ---------- | ----------------------------------------------------------------------------------------- | ------------------------------------------- |
| Ouvir você | [faster-whisper](https://github.com/SYSTRAN/faster-whisper) com o modelo `large-v3-turbo` | placa de vídeo (ou processador, mais lento) |
| Conversar  | [Ollama](https://ollama.com) com `gemma4:12b`                                             | placa de vídeo                              |
| Falar      | [AivisSpeech Engine](https://github.com/Aivis-Project/AivisSpeech-Engine)                 | placa de vídeo                              |

Requisitos:

- Windows com placa NVIDIA de 16 GB (testado numa RTX 5060 Ti: com o modelo de conversa, o Whisper e o AivisSpeech abertos, a placa fica em 15,7 GB). Com placa de 12 GB, use o VOICEVOX, que roda no processador.
- Uns 15 GB livres em disco para os modelos.
- Python 3.11, Ollama 0.40 ou mais novo e o AivisSpeech Engine (testado na 1.2.0).

Preparação, uma vez só:

```bash
python -m venv C:/caminho/do/venv
C:/caminho/do/venv/Scripts/pip install -r local/requirements.txt
ollama pull gemma4:12b
```

Baixe o AivisSpeech Engine para Windows no [GitHub do projeto](https://github.com/Aivis-Project/AivisSpeech-Engine/releases) e extraia numa pasta. Na primeira vez ele baixa as vozes まお e コハク; as outras três (まい, にせ, 阿井田 茂) se instalam pelo AivisHub, com os ids que estão em `src/core/vozes.ts`. Depois copie `local/config.exemplo.json` para `local/config.local.json` (esse arquivo não vai para o git) e preencha:

- `python`: o `python.exe` do venv;
- `cache_modelos`: a pasta onde o Whisper vai guardar o modelo (uns 1,6 GB no primeiro uso);
- `voz.aivis.exe`: o `run.exe` do AivisSpeech Engine.

Quem preferir o VOICEVOX, que roda no processador, troca `voz.motor` para `voicevox` e preenche `voz.voicevox.exe`.

Sem motor de voz a Conversa usa a voz japonesa do navegador. O primeiro `npm run local` demora alguns minutos porque baixa o Whisper e carrega os modelos; depois sobe em uns 10 segundos.

O servidor só aceita conexões do próprio PC. Nada do que você fala sai da máquina.

## Testes

```bash
npm test          # regras do jogo, memória, save (Vitest)
npm run e2e       # joga de verdade no Chrome (Playwright)
npm run check     # tipos + testes + build + e2e, tudo de uma vez
```

Todo bug corrigido entra com um teste que reproduz o caso.

Cada commit no `main` passa por essa bateria no GitHub Actions e, se tudo passar, o site em https://kotoba-arcade.pages.dev/ (Cloudflare Pages) é atualizado sozinho. Se algum teste falhar, nada é publicado. O endereço antigo, https://sindelitcis.github.io/kotoba-arcade/, virou um redirecionamento que leva o progresso salvo junto.

## Jornada

O mapa tem sete etapas, nesta ordem: Fundamentos, Kana, Expressões de sobrevivência, N5, N4, Trabalho e dia a dia, N3. Cada etapa tem missões de 3 a 10 minutos:

- **Lição em quadrinhos.** Uma ideia por quadro, Enter avança, e nunca mais que três quadros sem uma pergunta sobre o que acabou de aparecer. Errou, a resposta certa aparece com a explicação e a lição segue.
- **Missão de jogo.** Abre o KanjiMon, o Kana Beat, o Kotodama, a Aventura, o Kumitate ou a Conversa só com os kanji, palavras, pontos de gramática ou cena daquela missão. Saiu do jogo, volta para a Jornada e a missão fica marcada.

Nada fica trancado. A Jornada sugere a primeira missão ainda não feita, mas dá para abrir qualquer uma. Não existe contador de atraso e ficar dias sem abrir não apaga nada. Palavras e kanji das lições entram na mesma memória espaçada dos jogos.

O N4, o trabalho e o N3 também mostram o que ainda não tem conteúdo, com a fonte de cada tema (lista do JLPT, tópico do Marugoto ou do JF Standard). O N3 por enquanto é só isso.

O conteúdo das lições veio da [escola-japones](https://github.com/Sindelitcis/escola-japones), do mesmo autor, e fica em `src/content/escola/`: os quatro fundamentos, 36 expressões com registro e quando usar, 14 lições de gramática (regra, padrão, exemplos e erros comuns), 260 palavras em 14 temas, 60 kanji e 8 situações de trabalho e dia a dia. As regras de cuidado vieram junto e viraram teste (`tests/escola-conteudo.test.ts`): japonês padrão, alternativa errada que é japonês de verdade usado no lugar errado, に e へ nunca uma como errada da outra, vogal longa e っ marcadas como diferença de significado, furigana em todo kanji. A gramática da escola aponta para os pontos do Kumitate em vez de copiar, e as palavras que o arcade já tinha usam a mesma carta.

## Como o jogo ensina

Essas escolhas vêm do que se sabe sobre TDAH e sobre memória, e do que costuma fazer a gente largar app de estudo.

- **Começar custa uma tecla.** Abriu, apertou Enter, está jogando. Sem login, sem menu.
- **Não existe pilha de revisão.** O agendamento usa FSRS, mas nenhum contador de "atrasadas" aparece. Quem some por uns dias volta e recebe primeiro o que mais vale rever. Coisa nova pausa sozinha enquanto tem muita coisa mole.
- **Faltar um dia não zera nada.** Em vez de sequência que quebra, o fliperama mostra os últimos sete dias.
- **Primeiro contato não tem como errar.** Kanji novo aparece com o significado, uma historinha e a resposta destacada. A cobrança vem minutos depois, quando lembrar já dá trabalho.
- **Cada acerto responde na hora.** Som que sobe com o combo, partículas, selo quebrando. Resposta rápida ganha bônus, resposta lenta não perde nada.
- **A pergunta muda conforme você melhora.** Começa em reconhecer o significado, passa por ler a palavra e chega em digitar a leitura.
- **Tem ponto de parada.** No Kana em imagens, cada rodada são dez perguntas. No Kumitate, cada rodada são seis frases e acaba num resumo. No Kanji em peças, são oito perguntas. Na Conversa por voz, cada cena dura no máximo 4 minutos. Na Aventura, cada cena termina com o resumo do que você passou a entender. No KanjiMon, a cada cinco capturas vem um baú com o resumo da sessão. No Kana Beat, cada música dura perto de um minuto. No Kotodama, o mapa aparece entre uma luta e outra. Na Memória, cada quadro termina numa pausa. Na Cena Viva, a rodada são oito pedidos. Dá para parar ali ou seguir por horas.
- **Ninguém é expulso do jogo.** No Kana Beat a música sempre vai até o fim. Errou muito, a próxima vem mais lenta. No Kotodama, perder a run não apaga nada do que foi estudado. No Kumitate e no Kanji em peças não tem vida nem tempo: depois de duas peças erradas a certa brilha. Na Memória e na Cena Viva também não tem relógio contra você; o tempo só dá bônus.
- **O progresso é concreto.** O fliperama mostra quantos kanji e palavras você já reconhece e as frases que já consegue ler.

### A ordem da gramática no Kumitate

São 15 pontos, do N5 ao começo do N4, nesta ordem: は, の, を, ます/ません, ました, に/へ, で, と, も, が (com あります/います), たい, て ください, ています, ない e た. A ordem junta três fontes:

- o que as listas de estudo do N5 e do N4 cobram;
- as partículas mais frequentes no japonês escrito (の, に, は, を e が ficam no topo), que entram primeiro;
- a sequência de aquisição que a Teoria da Processabilidade prevê para o japonês (estudos de Satomi Kawaguchi): quem aprende domina antes as pontas que mudam só o verbo (ます, ません, ました, たい), depois as que ligam dois pedaços (て ください, ています) e por último as formas simples (ない, た), que pedem saber o grupo do verbo.

As frases usam só o vocabulário que já está nos outros jogos, mais umas poucas palavras de apoio em kana (わたし, これ, コーヒー). Cada ponto é uma carta na memória espaçada (`g:<ponto>#uso`).

Kanji nunca vem sozinho: toda carta traz palavras de verdade, com leitura em kana e áudio gravado. Como as vozes foram escolhidas e gravadas: [docs/vozes.md](docs/vozes.md).

## Organização

```
src/core      memória espaçada, seletor de cartas, perguntas, save, kana, som, efeitos, imagens, ajuda
src/assets    fontes recortadas, cenários, personagens, músicas do Kana Beat e as ilustrações do estúdio (imagens, acoes, lugares)
docs          a nuvem (nuvem.md), guia de estilo (estilo.md), como as imagens (imagens.md) e as vozes (vozes.md) foram feitas, dados do Kanji em peças (pecas.md), kana (kana.md)
public/vozes  falas gravadas em mp3 e o manifesto texto → arquivo
public/vozes-pt  português falado (aulas, Kumitate, Aventura): voz1/ e voz2/
src/content   kanji, palavras, frases e kana (os 94 kanji do KanjiMon original, o vocabulário do dia a dia, os mnemônicos de kana e, em escola/, o conteúdo da escola-japones)
src/jornada   a Jornada: mapa, missões, lições em quadrinhos
src/hub       o fliperama
src/games     um jogo por pasta; as regras ficam separadas da tela
local         servidor da Conversa por voz no PC (Whisper, Ollama e AivisSpeech) e o `npm run local`
nuvem         a Conversa na Cloudflare: senha, sessão, limite de tentativas e Workers AI (functions/ só aponta para cá)
scripts       importação do conteúdo, recorte das fontes, gravação das vozes (`npm run vozes`) e o estúdio de imagens (`estudio.py`)
tests         testes das regras
e2e           testes jogando no navegador
```

As regras de cada jogo ficam em `engine.ts`, sem nada de tela, para dar para testar tudo. Os jogos não conversam entre si. O que eles dividem é a memória do jogador: uma palavra aprendida em um jogo já conta nos outros.

O save fica no navegador. Em Ajustes dá para exportar e importar um arquivo de backup.

## Ajuda dentro do jogo

Toda tela tem um botão de interrogação discreto no canto de baixo. Ele, a tecla `?` ou a F1 abrem a explicação daquela tela: objetivo, como jogar, todas as teclas, o que cada coisa da tela quer dizer, como aquilo ensina e as perguntas mais comuns. Nada abre sozinho. Na Conversa por voz a F1 continua traduzindo a fala; lá a ajuda abre com `?`.

Com a ajuda aberta, o jogo não recebe tecla nenhuma e o Kana Beat pausa. Esc ou um clique fora fecha.

O texto fica em `src/content/ajuda/`, um arquivo por jogo. Um teste confere que toda tela tem ajuda e que toda tecla citada existe de verdade no código da tela, e o contrário também. Mudou uma tecla, o teste avisa que a ajuda ficou velha.

## Visual

O visual se chama Sora: tela limpa, cartões arredondados, um azul de marca e as ilustrações de anime sempre coloridas. Uma coisa em foco por vez. Acertos seguidos fazem o quadro do jogo brilhar; errar baixa o brilho devagar. Tem tema claro e escuro (Ajustes > Tema, ou o do sistema). O modo calmo, em Ajustes, para as animações que se repetem e diminui os efeitos. As regras e o motivo da mudança estão em [docs/estilo.md](docs/estilo.md).

## Créditos

As artes das cartas e o conteúdo dos 94 kanji vêm do KanjiMon original, feito com Leonardo Carvalho.

O conteúdo das lições da Jornada vem da [escola-japones](https://github.com/Sindelitcis/escola-japones), de Sindelitcis.

Fontes, as três pela SIL Open Font License 1.1 (o texto da licença está em `src/assets/fontes/`):

- [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans), de The Plus Jakarta Sans Project Authors: português e números.
- [Zen Maru Gothic](https://github.com/googlefonts/zen-marugothic), de The Zen Maru Gothic Project Authors: japonês corrido.
- [Klee One](https://github.com/fontworks-fonts/Klee), de The Klee Project Authors (Fontworks): o kanji grande de estudo.

Ícones: [Lucide](https://lucide.dev), pela licença ISC (texto em `src/assets/icones/LICENSE-lucide.txt`).

Cenários e personagens e as primeiras ilustrações de vocabulário: gerados no PC com o [Animagine XL 4.0](https://huggingface.co/cagliostrolab/animagine-xl-4.0) (Cagliostro Research Lab, licença CreativeML Open RAIL++-M, que permite usar as imagens geradas). As ilustrações novas da Memória e da Cena Viva: [Anima Turbo v1.1](https://huggingface.co/circlestone-labs/Anima), da CircleStone Labs, sob licença não comercial (a imagem gerada é livre). The CircleStone Model is licensed by CircleStone Labs LLC under the CircleStone Non-Commercial License. Copyright CircleStone Labs LLC. Detalhes em [docs/imagens.md](docs/imagens.md).

Kanji em peças: traços e peças do [KanjiVG](https://kanjivg.tagaini.net), de Ulrich Apel (CC BY-SA 3.0); leituras, lista de peças e conferência das palavras pelo KANJIDIC2, KRADFILE e JMdict, da [EDRDG](https://www.edrdg.org) (CC BY-SA 4.0); nível do JLPT pelo [kanji-data](https://github.com/davidluzgouveia/kanji-data), de David Luz Gouveia (MIT). Os arquivos gerados desses dados seguem CC BY-SA. Nomes das peças, imagens e historinhas foram escritos para o jogo. Detalhes e como regenerar: [docs/pecas.md](docs/pecas.md).

Efeitos sonoros: todos sintetizados no próprio jogo (`src/core/audio.ts`). As falas em japonês são gravações, com as vozes no fim desta seção.

Músicas do Kana Beat: trechos de cerca de 1 minuto, cortados em loop, de faixas livres do [OpenGameArt](https://opengameart.org). Como foram escolhidas e cortadas está em [docs/musica.md](docs/musica.md). Dentro do jogo, a tela de resultado tem o botão Músicas com esta mesma lista.

| Faixa | Autor | Licença | BPM |
| --- | --- | --- | --- |
| [Letting Go Of The Past](https://opengameart.org/content/happy-lo-fi-lofi-collection) | Holizna | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | 75 |
| [Blue Skies](https://opengameart.org/content/happy-lo-fi-lofi-collection) | Holizna | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | 82 |
| [Bartender](https://opengameart.org/content/lofi-compilation) | TAD | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | 90 |
| [happy lofi day](https://opengameart.org/content/happy-lofi-day) | Tarush Singhal | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | 99 |
| [Ninja Anthem EDM Beat](https://opengameart.org/content/ninja-anthem-edm-beat) | ISAo (airyluvs) | [OGA-BY 3.0](https://static.opengameart.org/OGA-BY-3.0.txt) | 120 |
| [Only 115 (Dance Loop)](https://opengameart.org/content/only-115-dance-loop) | Snabisch | [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/) | 125 |
| [Arukas Bloom](https://opengameart.org/content/arukas-bloom) | TAD | [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 130 |
| [Japanese Modern loop](https://opengameart.org/content/japanese-modern-loop) | F_kaiba | [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 160 |

Os trechos foram cortados, tiveram o volume igualado e foram convertidos para ogg; fora isso, a música é a original.

Vozes: AivisSpeech, modelos do AivisHub pela licença ACML 1.0. AivisSpeech: まお e AivisSpeech: コハク (©Oz Chat/Trippy, CV: ねゆたろ), AivisSpeech: まい, AivisSpeech: にせ e AivisSpeech: 阿井田 茂 (CV: 古山キリヲ). Palavras soltas e kana: VOICEVOX:四国めたん. Português falado: Voz 1, voz em português de um amigo do Rafael, usada com autorização; Voz 2, [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), voz pf_dora (Apache-2.0). O acento das palavras foi conferido na base da [Kanjium](https://github.com/mifunetoshiro/kanjium), de Uros O. (CC BY-SA 4.0).
