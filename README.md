# Kotoba Arcade

Fliperama de jogos para aprender japonês, feito pensando em quem tem TDAH. A regra da casa é simples: primeiro tem que ser um jogo bom. O estudo acontece por dentro dele.

Jogos que já dá para jogar:

- **KanjiMon**: o [KanjiMon original](https://github.com/Sindelitcis/KanjiMon) refeito aqui dentro. Você caça kanji, quebra os selos respondendo e junta as cartas na KanjiDex.
- **Kana Beat**: ritmo e digitação. Kana e palavras chegam na linha no tempo da batida e você digita a leitura. A música acelera quando você vai bem e desacelera quando não vai.
- **Kotodama**: roguelike de cartas. Cada carta é um kanji ou uma palavra. Jogar a carta abre uma pergunta: acertou, o golpe sai forte; errou, sai fraco. Você sobe sete andares até o chefe, pega relíquias que mudam as regras e escolhe cartas novas depois de cada luta. Uma run leva de 5 a 10 minutos.
- **Aventura**: você acabou de chegar ao Japão e vive cenas curtas do dia a dia (imigração, guichê do trem, konbini). As pessoas falam japonês de verdade, com áudio, e você responde escolhendo o que dizer. Não tem tela de erro: se a pessoa não entende, ela estranha, repete, e a conversa continua. Palavra nova aparece com leitura e significado; conforme firma na memória, a ajuda some. Cada cena leva de 3 a 5 minutos e as falas vividas ficam num diário para reler e ouvir.
- **Kumitate**: puzzle de montar frases. Cada frase tem buracos e você encaixa partículas (は, を, に, で...) e pontas de verbo (ます, ません, た, ない...) até ela dizer o que foi pedido em português. A ponta encaixada transforma o verbo na hora: 飲む vira 飲みました. Peça que não serve volta para a bandeja com o motivo, sem tela de erro. Cada ponto de gramática é uma peça nova que destrava depois de você acertar a anterior de primeira algumas vezes, e chega com uma lição curta e um exemplo antes de ser cobrado. Uma rodada são seis frases.
- **Conversa por voz**: você escolhe uma cena (pedir no café, perguntar o caminho, se apresentar, entrevista de trabalho) e conversa em japonês falando no microfone ou digitando em romaji ou kana. O personagem responde com voz e com furigana, no seu nível, puxando as palavras que você já está aprendendo. Travou, aperta Tab: vem uma dica e, na segunda vez, duas respostas prontas. Cada cena tem um objetivo, dura de 2 a 4 minutos e acaba num resumo com o que você disse bem, uma ou duas sugestões para soar mais natural e as palavras novas, que entram na memória. A IA roda no seu PC (veja abaixo); no site publicado esse jogo só explica como ligar.

## Como rodar

Precisa de Node 22 ou mais novo.

```bash
npm install
npm run dev
```

Abre em http://localhost:5173. Para gerar a versão final, `npm run build` (sai na pasta `dist`).

### Conversa por voz (IA no seu PC)

Esse jogo precisa de três programas rodando na sua máquina, e um comando liga todos:

```bash
npm run local
```

Ele sobe o servidor da pasta `local/` em `127.0.0.1:8791`, abre o Ollama e o VOICEVOX se ainda não estiverem abertos e roda o jogo em http://localhost:5173. Quando aparecer "tudo pronto", é só jogar. Ctrl+C fecha tudo.

| Parte      | O que usa                                                                                 | Onde roda                                   |
| ---------- | ----------------------------------------------------------------------------------------- | ------------------------------------------- |
| Ouvir você | [faster-whisper](https://github.com/SYSTRAN/faster-whisper) com o modelo `large-v3-turbo` | placa de vídeo (ou processador, mais lento) |
| Conversar  | [Ollama](https://ollama.com) com `gemma4:12b`                                             | placa de vídeo                              |
| Falar      | [VOICEVOX](https://voicevox.hiroshiba.jp)                                                 | processador                                 |

Requisitos:

- Windows com placa NVIDIA de 12 GB ou mais (testado numa RTX 5060 Ti de 16 GB: o modelo de conversa ocupa uns 8 GB e o Whisper uns 2 GB).
- Uns 15 GB livres em disco para os modelos.
- Python 3.11, Ollama 0.40 ou mais novo e o VOICEVOX Engine (testado na 0.26).

Preparação, uma vez só:

```bash
python -m venv C:/caminho/do/venv
C:/caminho/do/venv/Scripts/pip install -r local/requirements.txt
ollama pull gemma4:12b
```

Baixe o VOICEVOX Engine para Windows (versão CPU) no [GitHub do projeto](https://github.com/VOICEVOX/voicevox_engine/releases) e extraia numa pasta. Depois copie `local/config.exemplo.json` para `local/config.local.json` (esse arquivo não vai para o git) e preencha:

- `python`: o `python.exe` do venv;
- `cache_modelos`: a pasta onde o Whisper vai guardar o modelo (uns 1,6 GB no primeiro uso);
- `voz.voicevox.exe`: o `run.exe` do VOICEVOX.

Sem o VOICEVOX o jogo usa a voz japonesa do navegador. O primeiro `npm run local` demora alguns minutos porque baixa o Whisper e carrega os modelos; depois sobe em uns 10 segundos.

O servidor só aceita conexões do próprio PC. Nada do que você fala sai da máquina.

## Testes

```bash
npm test          # regras do jogo, memória, save (Vitest)
npm run e2e       # joga de verdade no Chrome (Playwright)
npm run check     # tipos + testes + build + e2e, tudo de uma vez
```

Todo bug corrigido entra com um teste que reproduz o caso.

Cada commit no `main` passa por essa bateria no GitHub Actions e, se tudo passar, o site em https://sindelitcis.github.io/kotoba-arcade/ é atualizado sozinho. Se algum teste falhar, nada é publicado.

## Como o jogo ensina

Essas escolhas vêm do que se sabe sobre TDAH e sobre memória, e do que costuma fazer a gente largar app de estudo.

- **Começar custa uma tecla.** Abriu, apertou Enter, está jogando. Sem login, sem menu.
- **Não existe pilha de revisão.** O agendamento usa FSRS, mas nenhum contador de "atrasadas" aparece. Quem some por uns dias volta e recebe primeiro o que mais vale rever. Coisa nova pausa sozinha enquanto tem muita coisa mole.
- **Faltar um dia não zera nada.** Em vez de sequência que quebra, o fliperama mostra os últimos sete dias.
- **Primeiro contato não tem como errar.** Kanji novo aparece com o significado, uma historinha e a resposta destacada. A cobrança vem minutos depois, quando lembrar já dá trabalho.
- **Cada acerto responde na hora.** Som que sobe com o combo, partículas, selo quebrando. Resposta rápida ganha bônus, resposta lenta não perde nada.
- **A pergunta muda conforme você melhora.** Começa em reconhecer o significado, passa por ler a palavra e chega em digitar a leitura.
- **Tem ponto de parada.** No Kumitate, cada rodada são seis frases e acaba num resumo. Na Conversa por voz, cada cena dura no máximo 4 minutos. Na Aventura, cada cena termina com o resumo do que você passou a entender. No KanjiMon, a cada cinco capturas vem um baú com o resumo da sessão. No Kana Beat, cada música dura perto de um minuto. No Kotodama, o mapa aparece entre uma luta e outra. Dá para parar ali ou seguir por horas.
- **Ninguém é expulso do jogo.** No Kana Beat a música sempre vai até o fim. Errou muito, a próxima vem mais lenta. No Kotodama, perder a run não apaga nada do que foi estudado. No Kumitate não tem vida nem tempo: depois de duas peças erradas a certa brilha.
- **O progresso é concreto.** O fliperama mostra quantos kanji e palavras você já reconhece e as frases que já consegue ler.

### A ordem da gramática no Kumitate

São 15 pontos, do N5 ao começo do N4, nesta ordem: は, の, を, ます/ません, ました, に/へ, で, と, も, が (com あります/います), たい, て ください, ています, ない e た. A ordem junta três fontes:

- o que as listas de estudo do N5 e do N4 cobram;
- as partículas mais frequentes no japonês escrito (の, に, は, を e が ficam no topo), que entram primeiro;
- a sequência de aquisição que a Teoria da Processabilidade prevê para o japonês (estudos de Satomi Kawaguchi): quem aprende domina antes as pontas que mudam só o verbo (ます, ません, ました, たい), depois as que ligam dois pedaços (て ください, ています) e por último as formas simples (ない, た), que pedem saber o grupo do verbo.

As frases usam só o vocabulário que já está nos outros jogos, mais umas poucas palavras de apoio em kana (わたし, これ, コーヒー). Cada ponto é uma carta na memória espaçada (`g:<ponto>#uso`).

Kanji nunca vem sozinho: toda carta traz palavras de verdade, com leitura em kana e áudio (voz japonesa do navegador).

## Organização

```
src/core      memória espaçada, seletor de cartas, perguntas, save, kana, som, efeitos, imagens, ajuda
src/assets    fontes recortadas, cenários e personagens
docs          guia de estilo (estilo.md) e como as imagens foram feitas (imagens.md)
src/content   kanji, palavras e frases (os 94 kanji do KanjiMon original e o vocabulário do dia a dia)
src/hub       o fliperama
src/games     um jogo por pasta; as regras ficam separadas da tela
local         servidor da Conversa por voz (Whisper, Ollama e VOICEVOX) e o `npm run local`
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

O jogo tem cara de mangá em preto e branco: tinta, retícula, quadros e onomatopeia desenhada. Vermelho só aparece quando você acerta ou ganha alguma coisa. As regras estão em [docs/estilo.md](docs/estilo.md). O modo calmo, em Ajustes, tira o tremor das linhas e diminui os efeitos.

## Créditos

As artes das cartas e o conteúdo dos 94 kanji vêm do KanjiMon original, feito com Leonardo Carvalho.

Fontes, as duas pela SIL Open Font License 1.1 (o texto da licença está em `src/assets/fontes/`):

- [Dela Gothic One](https://github.com/syakuzen/DelaGothic), de The Dela Gothic Project Authors: títulos e onomatopeias.
- [Yuji Syuku](https://github.com/Kinutafontfactory/Yuji), de The Yuji Project Authors (Kinuta Font Factory): kanji em pincel.

Cenários e personagens: gerados no PC com o [Animagine XL 4.0](https://huggingface.co/cagliostrolab/animagine-xl-4.0) (Cagliostro Research Lab, licença CreativeML Open RAIL++-M, que permite usar as imagens geradas). Detalhes em [docs/imagens.md](docs/imagens.md).

Sons: todos sintetizados no próprio jogo (`src/core/audio.ts`), sem arquivo de áudio de terceiros.

Vozes da Conversa por voz: VOICEVOX:四国めたん, VOICEVOX:春日部つむぎ, VOICEVOX:青山龍星 e VOICEVOX:玄野武宏.
