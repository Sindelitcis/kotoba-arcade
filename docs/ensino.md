# Ensinar antes de cobrar

Ninguém lembra do que nunca viu. Então todo jogo segue a mesma ordem para cada coisa nova (palavra, kanji, kana, ponto de gramática):

1. **Apresentar.** Um cartão por item, de 3 a 5 por vez: imagem, o japonês em áudio e o que quer dizer, também falado em português. Uma frase de explicação e um exemplo. Enter segue, ← volta, R ouve de novo.
2. **Praticar com apoio.** Pergunta fácil, dica na tela, poucas opções (duas na primeira vez, três depois). Errar não tira vida, combo nem pontos: o item aparece de novo, num cartão mais apagado, e a pergunta volta.
3. **Cobrar.** Só depois de acertar na prática. Aí entram o tempo, as vidas, o combo e todas as opções.

## Onde isso mora

- `src/core/ensino.ts` decide a fase pelo estado da carta no FSRS. Sem carta: novo. Carta em New, Learning ou Relearning: prática. Em Review: cobrança. Apresentar é criar a carta vazia (`apresentar`), então "apresentado" fica no próprio save das cartas, sem campo novo.
- `avaliar()` é o único jeito de dar nota, e ele recusa item que nunca foi apresentado (`ItemNaoApresentado`). Cada jogo tem um teste que joga várias rodadas e confere isso.
- `notaDaPratica()` dá a nota da prática: acerto vale "bom", nunca "fácil" (o tempo não conta), e o erro só repete o passo de aprender, sem virar esquecimento. É o acerto na prática que leva a carta para a cobrança.
- `novidades()` escolhe os novos da vez: até 5, e nenhum enquanto houver 8 ou mais itens em prática.
- `src/core/Apresentacao.tsx` é o cartão, o mesmo em todos os jogos (estilo em `docs/estilo.md`). `src/content/ensino.ts` monta o item a partir da ficha do Aprofundar.

## Só se cobra o que já foi apresentado

A regra vale para tudo o que aparece numa pergunta, não só para o alvo:

- **Alvo, alternativas e cartas do tabuleiro** saem só de itens já apresentados. Distrator nunca visto não entra; com pouca coisa vista, a pergunta tem menos alternativas (`core/questions.ts` recebe as cartas e filtra; o Kana em imagens, o Kumitate e o Kanji em peças fazem o mesmo com o que é deles).
- **Coisa clicável** na Cena Viva é só a já apresentada. O resto fica no desenho, como cenário.
- **Frases** (Aventura, Conversa, Kumitate) usam o que já foi visto ou trazem a glosa na tela (leitura e significado). Palavra que só passou numa fala **não conta como apresentada**: ela ganha o cartão na próxima passada. Antes, passar numa fala criava a carta, e a Memória e o KanjiMon passavam a cobrar a palavra.
- **Lotes pequenos**: de 3 a 5 por apresentação (`novidades()`), e nada novo enquanto 8 ou mais itens estão em prática. Cada rodada pratica o que já está em prática antes de somar coisa nova.

### Um registro só, para todos os jogos

"Já apresentado" é ter carta no FSRS, de qualquer habilidade, criada por qualquer jogo (`foiApresentado`). A carta só nasce no cartão de apresentação (`apresentar()`), na lição do jogo, no quadro da Jornada ou no cartão do curso. É isso que faz a continuidade: a Cena Viva da sala apresenta 本 e 椅子, e a Memória já pode pôr os dois no quadro sem apresentar de novo; o KanjiMon apresenta 学生, e o Kanji em peças pode perguntar a leitura dela.

O save da versão 1 (antes desta regra) tinha cartas criadas sem apresentação. Foi assim que a Memória ensinou テレビ e logo cobrou たな, ベッド, 椅子 e 本. Na abertura de um save antigo, `cartasDoSave1` (em `core/save.ts`) deixa só os itens que a pessoa já sabe (alguma carta em revisão); o resto volta a ser novo e passa pelo cartão antes da primeira pergunta.

### Exceções, de propósito

- **Teste rápido do Kana em imagens**: é para quem já lê pular a parte de aprender. Pergunta kana não apresentado de propósito, e só dá nota ao que já foi apresentado.
- **Adivinhar, no Kanji em peças**: o kanji é novo, mas todas as peças dele já foram vistas; as peças na tela são a apresentação. As alternativas são significados de kanji já vistos.
- **Primeiro ponto do Kumitate e primeiro kanji do Kanji em peças**: ainda não há nada visto para confundir. A bandeja tem só a peça certa (que brilha), e o primeiro kanji é montado com as próprias peças.
- **Leitura relâmpago (Kana em imagens)**: a palavra em katakana é nova, mas todo kana dela já foi visto; as alternativas são em português.
- **Recompensa do Kotodama**: a carta oferecida pode ser de item novo, com o selo NOVO. Não é pergunta: se a pessoa pegar, a carta é apresentada antes do próximo combate.
- **Nivelamento do curso** (`src/curso/prova.ts`): é para quem já sabe japonês pular unidades, e só aparece se a pessoa pedir. Pergunta o que o curso ainda não apresentou, sempre com "Não sei". O que ela passa entra como visto.
- **Jornada, primeira palavra do tema "sons"** (uma por vez): não há palavra anterior para virar alternativa errada, então entram as vizinhas do tema.

### Os testes

`tests/continuidade.test.ts` começa cada jogo com um save zerado, joga várias rodadas e guarda à parte tudo o que passou pela apresentação. A cada pergunta confere que o alvo, cada alternativa, cada carta do quadro e cada coisa clicável estão nesse registro. Também cobre o caso relatado (save antigo na Memória), a sequência da Jornada (Cena Viva da sala e depois a Memória da sala) e, na Jornada, que toda alternativa errada já apareceu num quadro antes. O e2e `e2e/memoria.spec.ts` refaz o caso relatado no navegador, com o save antigo no localStorage.

O exemplo dos cartões de estrutura segue a mesma regra. Na Cena Viva, a lição de cada etapa pega como exemplo uma pergunta de verdade do lugar em que você está, montada só com coisas já apresentadas (na コンビニ, これはパンです。 e não これは傘です。). Em "nome" e "descrever" ela evita a pergunta que vem logo depois, para não entregar a resposta. O exemplo já tem voz, porque é a mesma frase gravada para a pergunta, e o cartão escreve o que cada palavra quer dizer. No Kumitate, se a frase de exemplo do ponto tem palavra ainda não vista, o cartão dessa palavra vem antes do cartão do ponto. `tests/exemplo-estrutura.test.ts` confere isso em todos os lugares e em todos os pontos.

## Jogo por jogo

| Jogo | Apresenta | Prática | Cobrança |
| --- | --- | --- | --- |
| Kana em imagens | 3 kana: o desenho, o som, a palavra da imagem | a imagem fica por perto, dica e poucas opções, todas de kana já vistos | pares que confundem, só o som, leitura relâmpago. Quem já lê faz o teste rápido e vai direto para cá |
| Cena Viva | as coisas do lugar, uma a uma, brilhando na cena | primeira etapa só com o nome: これはなんですか？ → これは〜です. Errar não tira pontos e a coisa certa brilha. Só a coisa apresentada pode ser clicada | 〜はどこ？, cor, posição, contadores e frases longas, cada etapa com a sua lição antes |
| Memória | as palavras novas antes do primeiro quadro; o que outro jogo já apresentou (a Cena Viva do mesmo lugar) entra direto | quadro rápido com apoio; errar mostra a palavra de novo | o quadro de cartas viradas, só quando todas as palavras dele passaram da prática. Toda carta do quadro já foi apresentada |
| KanjiMon | o kanji: desenho, leitura, significado falado e uma palavra | dica, duas opções (de kanji e palavras já vistos), sem digitar; não tira coração nem combo | coração, combo, resposta rápida |
| Kana Beat | os kana ou palavras da música, antes de ela começar | nota com romaji, uma batida a mais, não zera o combo | ritmo normal; no fim, as de prática que passaram voltam numa apresentação |
| Kotodama | as cartas com kanji ou palavra ainda não vistos | dica e duas opções, de itens já vistos; mesmo errando, a carta sai forte | errar enfraquece a carta |
| Kanji em peças | a lição do kanji: peças pintadas, nomes, historinha, leitura | errar não zera o combo; nenhum kanji repete logo em seguida; peça errada só de kanji já visto | "adivinhar" só com peças conhecidas, intruso só com os dois kanji vistos, palavra de dois kanji só se já foi apresentada em outro jogo |
| Kumitate | a lição curta do ponto, com exemplo e áudio | a peça certa brilha; errar não zera o combo; a bandeja só tem peça de ponto já ensinado | frase inteira, tempo e combo; a frase prefere só gramática já vista |
| Aventura | até 5 palavras da cena antes da primeira fala | a primeira passada não vale nota; palavra não apresentada vem com leitura e significado e não ganha carta | as cenas seguintes cobram |
| Conversa | as palavras da situação antes de conversar | palavra não apresentada aparece com o significado (aviso "nova"), sem carta | o resto da conversa |
| Curso | as palavras de cada parte (de 3 a 5) e, logo depois, os kanji delas, com a leitura da palavra e o aviso das outras | duas opções na primeira vez, três depois (quatro em cobrança), todas de itens do curso já apresentados e as mais parecidas com a certa; errar diz o que é a alternativa marcada, mostra o cartão de novo e a pergunta volta no fim; nunca põe outra leitura do mesmo kanji como errada | a prova de unidade (fase 3) |
| Jornada | o quadro da lição apresenta a palavra ou o kanji, de três em três | a pergunta logo depois é prática; a alternativa errada é de um quadro anterior (o trio de expressões evita juntar as que se confundem) | missões seguintes |

## Calma: nada rápido a ponto de atrapalhar

Pedido do Rafael: no KanjiMon, depois de acertar 水, o "Rápido! +2" e o "水 · みず (mizu) · água" sumiam
quase na hora, o "Capturado!" entrava por cima e o som do acerto tapava a pronúncia. Jogo nenhum pode ser
tão rápido ou caótico que atrapalhe entender e guardar o que está na tela. Vale para todos os jogos e para
a Jornada.

- **O retorno espera a pessoa.** Depois de responder, a resposta certa com a leitura e o significado fica
  na tela até a pessoa seguir (Enter, espaço ou o botão Seguir). Nada passa sozinho para a próxima
  pergunta, nem abre um aviso (captura, nível, baú) por cima, enquanto a palavra ainda está sendo falada.
  O aviso de captura também espera o Enter. O Enter que mandou a resposta digitada não conta como
  "seguir" (`src/core/calma.ts`).
- **Efeito nunca por cima de voz.** O efeito do acerto ou do erro toca primeiro e é curto. A voz espera
  ele acabar (no máximo 0,7 s) e o que sobrar some quando ela começa. Efeito pedido enquanto alguém
  fala não toca, e a música abaixa enquanto a voz fala (`src/core/som/mixer.ts`). A pronúncia sempre
  tem prioridade.
- **Nada some rápido demais.** A palavra de efeito (ドン, ピカッ) fica 1,6 s. Na Memória, o par errado
  fica aberto até você abrir a próxima carta. Na Conversa, o resumo só abre quando você pede, depois da
  última fala.
- **Tempo só onde o tempo é o jogo.** O Kana Beat segue a música, e a resposta rápida dá bônus em alguns
  jogos. Mesmo assim, o retorno depois da resposta nunca tem pressa.

Os testes: `tests/som.test.ts` confere que efeito não toca enquanto a voz fala e que a voz espera o efeito.
Os e2e (`e2e/calma.spec.ts`) respondem em cada jogo, esperam alguns segundos e conferem que o retorno
continua na tela e que nada veio por cima. No navegador, eles também conferem que nenhum efeito começa
enquanto uma voz toca.

## A ordem entre os jogos

A Jornada (`src/jornada/etapas.ts`) põe os jogos na mesma ordem. Na etapa Kana: Kana em imagens de hiragana, Kana Beat de hiragana, a lição dos sons, Kana em imagens de katakana, Kana Beat de katakana. Depois, as primeiras palavras: a Cena Viva de um lugar, só com o nome das coisas, e a Memória com as mesmas palavras. O KanjiMon vem no N5, com os kanji. Nada fica trancado: é a sugestão de caminho, e `tests/jornada.test.ts` confere essa ordem.
