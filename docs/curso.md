# O curso

Decidido em 22/11/2026. O Kotoba Arcade deixa de ser "jogos que ensinam" e vira um curso de japonês
linear, montado como os cursos de escola de verdade, com a parte de jogo por cima. O motivo foi
que o conhecimento estava solto. O cartão do 金 ensinava きん e o exemplo logo abaixo usava お金
(okane), sem explicar por que a leitura mudou.

A base é o uso real (situações de quem vai morar e trabalhar no Japão, na linha do Irodori da
Japan Foundation e do JF Standard) cruzado com o JLPT, para não deixar buraco: tudo do N5 até o fim
do A1 e tudo do N4 até o fim do A2. Dos cursos reais tiramos a estrutura, a ordem e os formatos de
prova. O conteúdo é escrito por nós.

## Princípios

1. **Uma linha só.** A tela inicial mostra a próxima lição. Nada fica solto: cada palavra, kanji,
   leitura e ponto de gramática tem a lição em que aparece pela primeira vez.
2. **Explicar o porquê.** Cada ponto vem com a regra geral e, quando houver, a história ou o
   costume por trás. As notas culturais precisam estar certas e ter fonte anotada no conteúdo,
   porque uma explicação bonita e errada ensina errado.
3. **Kanji pela palavra.** O kanji entra na lição em que a palavra dele é útil. O cartão mostra a
   leitura usada ali e avisa das outras: "em お金 se lê かね; em 金曜日 se lê きん (lição 3)".
4. **Ensinar, praticar, provar, usar.** Nenhum ponto é cobrado antes de ser ensinado
   ([ensino.md](ensino.md)). Nenhuma unidade libera a seguinte sem prova. Depois da prova, o que foi
   aprendido continua voltando em revisão e em tarefas de uso.
5. **Calma.** Blocos de 5 minutos, nada some antes de dar para ler, efeito sonoro nunca por cima da
   pronúncia, furigana em todo kanji para quem está começando.

### Exemplo de nota cultural: o お de お金

O お (e o ご) na frente de uma palavra é um prefixo de cortesia. Em お金, お茶 e お水 ele é o que
os gramáticos chamam de 美化語 (bikago), "linguagem que embeleza": deixa a fala mais educada e
cuidadosa, e em algumas palavras virou o costume (quase ninguém diz só 金 para dinheiro no dia a
dia). Em お母さん ele é respeito pela pessoa. Por isso, falando da própria mãe para alguém de fora,
o japonês usa 母 (はは), sem お, e para a mãe dos outros usa お母さん: é a ideia de 内 e 外, o grupo
de dentro e o de fora, que volta em todo o keigo. Regra geral: お vai em palavras de origem
japonesa (お金, お水) e ご nas de origem chinesa (ご家族, ご住所), com exceções famosas (お電話, お時間).

Isso vira uma nota da lição em que お金 aparece (unidade 4) e é retomado na lição da família
(unidade 9), onde 母 e お母さん entram lado a lado.

## Níveis

| Nível | JLPT | Unidades | Ao final |
|---|---|---|---|
| Módulo 0: kana e sons | | 6 lições | lê e escreve hiragana e katakana, sons longos, duplos e pequenos |
| A1 | N5 | 20 unidades | se vira em situações simples: apresentação, compras, horários, transporte, comida |
| A2 | N4 | 20 unidades | trabalho de meio período, moradia, prefeitura, banco, médico, keigo básico |
| Depois | N3 | a definir | |

Cada nível termina com um simulado no formato do JLPT e um certificado do curso.

### A1 (N5): esboço das unidades

| # | Situação (consigo...) | Gramática | Kanji e notas |
|---|---|---|---|
| 1 | me apresentar | です, は, の, か | 人, 日, 本 · nota: reverência e cartão de visita |
| 2 | dizer números, idade e telefone | なん, いくつ | 一 a 十, 百, 千 · nota: 4 e 9, números que se evitam |
| 3 | falar de horas e dias | 〜時, 〜から〜まで | 時, 分, 曜日 (金曜日 = きん) · nota: os dias da semana e os cinco elementos |
| 4 | comprar na konbini | これ・それ・あれ, いくら, 〜をください | 円, 金 (お金 = かね) · nota: o お de cortesia |
| 5 | falar de comida e bebida | 好き, verbos em ます, を | 食, 飲, 水 · nota: いただきます |
| 6 | contar minha rotina | ます/ません/ました, に (tempo) | 朝, 昼, 晩, 毎 |
| 7 | usar trem e estação | へ・に 行きます, で (meio) | 行, 来, 駅, 電 · nota: IC card e fila no trem |
| 8 | perguntar onde fica | あります・います, 上下中前後 | 上, 下, 中, 前, 後 |
| 9 | falar da família | 母 e お母さん | 父, 母, 子 · nota: 内 e 外 |
| 10 | descrever coisas | adjetivos い e な | 大, 小, 高, 安, 新, 古 |
| 11 | comprar roupa | 〜はありますか, cores | 色, 白, 黒, 赤 |
| 12 | convidar e combinar | 〜ませんか, 〜ましょう, 〜たい | 休, 週, 友 |
| 13 | pedir algo | forma て, 〜てください | 手, 口, 目 |
| 14 | dizer o que estou fazendo | 〜ています | 仕事, 会社 |
| 15 | entender regras | 〜てもいい, 〜てはいけない | 入, 出 · nota: lixo separado, onsen |
| 16 | falar com amigos | forma de dicionário e ない | 言, 話, 見 |
| 17 | contar experiências | forma た, 〜たことがある | 年, 先, 今 |
| 18 | ir ao médico | 〜ほうがいい, 痛い | 体, 病 · nota: seguro saúde |
| 19 | falar do tempo e das estações | 〜でしょう, より | 天, 気, 雨 · nota: 季節 |
| 20 | revisão do nível | | simulado N5 |

O currículo completo do A1 está em `src/content/curso/a1.ts`: objetivo, vocabulário, kanji com a
leitura usada em cada unidade, gramática e notas culturais com fonte. `tests/curso.test.ts` confere:

- todos os kanji do N5 e todos os pontos de gramática do N5 (`src/content/curso/n5.ts`) têm unidade;
- nenhuma palavra usa kanji ainda não ensinado (o que falta fica em kana);
- toda leitura nova de um kanji já visto vem com a explicação da troca;
- nenhuma palavra entra duas vezes e toda nota tem fonte.

Kanji fora do N5 que a vida pede cedo (駅, 会社, 曜日, 病気...) entram marcados como `extra`. Nota
cultural só vai para a lição com `conferida: true`, depois de conferida contra a fonte.

## A lição

Uma lição leva de 20 a 30 minutos, em blocos curtos que dá para parar e voltar:

1. **Objetivo:** "Ao final, você consegue..." e uma revisão rápida da lição anterior.
2. **Aula falada:** na Voz 1, com quadros na tela. Traz a regra geral e a nota cultural.
3. **Vocabulário:** imagem, áudio e legenda.
4. **Kanji:** a leitura usada nesta lição, com aviso das outras leituras e de quando elas entram.
5. **Gramática:** padrão, regra e exemplos feitos só com o que já foi ensinado.
6. **Prática guiada:** os jogos entram aqui como exercícios, só com o conteúdo da lição e das
   anteriores, sem perder vida.
7. **Diálogo:** escuta, leitura com furigana e shadowing.
8. **Mini-teste (小テスト):** 5 a 10 questões. Errar mostra a explicação de novo.
9. **Tarefa de uso:** escrever três frases, conversar com a IA sobre o tema da lição ou fazer uma
   missão de verdade ("leia o preço de três coisas no próximo mercado japonês que visitar").

## O motor do curso

Feito na fase 2, em `src/curso/`. A tela inicial abre com "Continuar o curso" (Enter), que leva à
próxima parte; a tecla U mostra o mapa das unidades.

- **Partes curtas.** `motor.ts` (`blocosDa`) divide a unidade em partes de uns 5 minutos: objetivo
  (com a revisão rápida da unidade anterior), palavras de 3 a 5 por vez, os kanji dessas palavras
  logo depois delas, a aula falada, a gramática, o montar frases, o completar, o ditado, a
  leitura graduada com shadowing, as notas culturais, o diálogo da situação e, no fim, o mini-teste (8 perguntas da unidade, com quatro alternativas, como na
  prova). A unidade de revisão tem só o objetivo e uma prática com o que já foi visto. Parte nova
  entra sempre antes da posição salva de quem já começou: a pessoa pode rever uma parte, nunca pular.
- **Cartões.** `cartoes.ts` monta a apresentação direto do currículo, no mesmo cartão dos jogos
  (`core/Apresentacao.tsx`). O do kanji mostra a leitura usada na palavra, a explicação da troca
  quando ela muda e as outras leituras do curso, com a unidade em que entram. O de gramática mostra
  o padrão, a regra e um exemplo falado.
- **Prática.** `pratica.ts`: duas opções na primeira vez e três depois, todas de itens do curso já
  apresentados. Errar não tira nada: a resposta fica na tela até a pessoa seguir, o cartão aparece
  de novo e a pergunta volta no fim. A parte acaba quando cada item foi acertado uma vez.
- **Memória.** As palavras e os kanji entram nas mesmas cartas do FSRS dos jogos (`w:<palavra>#meaning`,
  `k:<kanji>#meaning` e `#reading`). O que foi visto no curso os jogos já podem praticar.
- **Progresso.** Fica em `games.curso` no save: quantas partes de cada unidade foram feitas, quais
  foram concluídas e a prova de cada uma (melhor nota, se passou, tentativas). Parar no meio volta
  na mesma parte; com as partes feitas, "Continuar" leva à prova.
- **Liberação.** A unidade 1 é livre e cada outra abre quando a prova da anterior é aprovada
  (`venceu()`, em `motor.ts`). Unidade já começada antes das provas existirem continua aberta.
- **Voz.** Tudo o que os cartões falam (a palavra em japonês e o "Quer dizer..." na Voz 1) entra
  nas listas de gravação (`scripts/falas.ts` e `scripts/falas-pt.ts`, origem `curso`).

`tests/curso-motor.test.ts` percorre o A1 inteiro com um save zerado e confere, em cada pergunta,
que o alvo e todas as alternativas já foram apresentados; também cobre as partes, os cartões, o
progresso e a liberação. `e2e/curso.spec.ts` faz o caminho no navegador.

## Conteúdo do A1

Feito na fase 4, em `src/content/curso/`:

- **Exemplos de gramática** (`exemplos.ts`): dois por ponto do N5, em peças. Cada peça é palavra do
  vocabulário até a unidade, forma de uma delas (`食べます=たべます<食べる`), gramática em kana ou um
  nome da lista. `tests/curso-exemplos.test.ts` barra palavra ou kanji ainda não ensinados. O
  primeiro exemplo vai no cartão do ponto; o segundo, no montar frases. `src/curso/exemplos.ts`
  monta a frase e a leitura inteira, e as peças levam a leitura certa ao gravador de vozes.
- **Aula falada** (`aulas.ts`): quadros curtos por unidade, o professor na Voz 1 e o exemplo em
  japonês com pausa para repetir. A fala não tem japonês escrito (a voz em português leria errado);
  o japonês fica no texto da tela e no exemplo. Só regra de língua: costume e história ficam nas
  notas, que têm fonte. Tela em `src/curso/BlocosAula.tsx`.
- **Montar frases**: o sentido em português e as peças embaralhadas; a peça fora de ordem avisa e
  não entra. Pronta, a frase toca e espera o Enter.
- **Completar e ditado** (`src/curso/exercicios.ts`): no completar, a frase vem com uma peça de
  gramática apagada e quatro opções, todas já apresentadas. Peças que se trocam sem a frase ficar
  errada (は, が, も e を; に e へ; と e や; os fins de frase) nunca são opção errada uma da outra, e a
  tradução desfaz o resto. No ditado, a frase só toca; a pessoa digita em romaji (vira kana na
  hora) ou usa o teclado japonês. Vale a partícula escrita (は, へ) ou falada (わ, え), e を ou お.
- **Leitura graduada** (`leituras.ts`): um texto de 4 ou 5 frases por unidade, em peças, conferido
  como os exemplos (`tests/curso-leituras.test.ts`). Primeiro o texto inteiro (T mostra a
  tradução), depois o shadowing: cada frase toca, há uma pausa para falar junto e toca de novo.
- **Figura no vocabulário** (`src/curso/figura.ts`): a palavra do curso usa a figura do site quando
  há uma com a mesma escrita, ou o mesmo kana e o mesmo sentido (あめ é chuva no curso e bala na
  figura de 飴, então não vale). Hoje são umas 55 palavras, na tela e no verso dos cartões impressos.
- **Tarefa de uso** (`tarefas.ts`): aparece depois da prova aprovada e na apostila.
- **Notas culturais:** as 16 do A1 conferidas contra a fonte em 23/11/2026 (com três correções) e
  liberadas.
- **Apostila:** ganhou a aula escrita, os exemplos, os exercícios de montar e de completar, o
  ditado (o QR abre `?ditado=a1-04`, um botão por frase), a leitura, a tarefa de uso e as respostas
  de tudo no fim.

`tests/curso-aulas.test.ts` cobre aula, montar e tarefa; `tests/curso-exercicios.test.ts`, completar
e ditado.

**Vocabulário contra o N5 (23/11/2026).** Cruzado com a lista aberta de N5 de Jonathan Waller
(tanos.co.uk, pela versão do repositório open-anki-jlpt-decks; cópia só local, em
`D:\KotobaArcade\dados\brutos\n5-vocabulario.txt`, porque a licença dos dados não está clara). O
primeiro cruzamento achou só umas 240 das 697. Entraram então 410 palavras, cada uma na unidade
do tema dela (casa e direções na 8, roupas e cores na 11, datas do mês na 12, escola na 14...), com
kanji só quando ele já foi ensinado. Hoje o A1 tem 716 palavras e cobre 655 das 697. As 42 que
sobram estão no curso de outro jeito ou não valem a pena: sufixos e formas que a gramática ensina
(〜年, 〜分, 〜時, 〜か月, ない, では), verbos que entram na forma usada (住む e 知る como すんでいます
e しっています), palavras que já estão com お (お水) e palavras antigas que a lista ainda traz
(字引, 背広, 万年筆, 灰皿, ストーブ, 零).

## Conteúdo do A2

Feito na fase 6, no mesmo formato do A1. As unidades estão em `a2a.ts` a `a2d.ts` (cinco por
arquivo), e o resto em arquivos irmãos dos do A1: `exemplos-a2.ts`, `aulas-a2.ts`,
`leituras-a2.ts`, as tarefas em `tarefas.ts` e a gramática do N4 em `n4.ts` (76 pontos, cada um
em exatamente uma unidade). São 589 palavras novas e 161 kanji, que fecham a lista do N4 (o que
faltava dela já tinha entrado no A1 como extra). Os extras do A2 são 港, 働, 菜 e 園, além de 分
ensinado de novo com outra leitura. Kanji fora das fichas do Aprofundar (que vão até o N3) traz o
significado no próprio curso (`significado`, hoje só 菜).

- **Ordem no curso:** cada unidade tem `numero` (a posição no nível: a 1 do A2 é a 1) e `ordem`
  (a posição no curso inteiro: a 1 do A2 é a 21). Tudo que depende do que já foi ensinado
  (exemplos, prova, prática, gramática vista) usa `ordem`. O código da prova é `U` mais a ordem.
- **Simulado:** um por nível, na unidade 20 de cada um, só com itens e frases do próprio nível. O
  N4 pede 90 pontos no total; os mínimos por parte são os mesmos do N5.
- **Notas culturais:** as 19 do A2 conferidas contra a fonte em 23/11/2026 (o passe da JR, a
  multa de bicicleta de abril de 2026, o limite de horas do estudante, o sobrenome do casal...).
- **Tela:** o mapa do curso separa os níveis ("A1 · JLPT N5", "A2 · JLPT N4"), e os nomes de
  unidade dizem o nível quando não é o A1 ("unidade 4 do A2").

## Provas

Feitas na fase 3. A lógica está em `src/curso/prova.ts` e a tela em `src/curso/ProvaTela.tsx`.

- **Fim de unidade:** 16 questões da unidade e 4 de revisão das anteriores, quatro alternativas
  cada (sentido da palavra, palavra pelo sentido, leitura do kanji). Passa com 80%. O resultado só
  aparece no fim, e dá para voltar e trocar uma resposta antes de entregar. Cada resposta conta como
  revisão no FSRS. Quem não passa vê o que errou, revê os cartões disso e faz outra prova, com
  outras questões. A aprovação nunca se perde com uma tentativa pior depois.
- **Simulado do nível:** é a prova da unidade de revisão, nas quatro partes do JLPT, em ordem e
  sem tempo marcado: vocabulário (文字・語彙, 14 questões de palavra e leitura de kanji), gramática
  (文法, 8 de completar a frase), leitura (読解, 4 textos da leitura graduada e qual frase o texto
  diz; as erradas vêm de outros textos) e escuta (聴解, 6 frases só no áudio e o sentido delas).
  Passa com 80%, como as outras. O resultado mostra cada parte e a nota na escala do JLPT (120 de
  conhecimento e leitura, 60 de escuta, mínimos do N5 de 80, 38 e 19), avisando que é uma conta
  proporcional, não a nota oficial.
- **Certificado:** com o simulado aprovado, a pessoa escreve o nome (fica no save) e abre
  `?imprimir=certificado&unidade=a1-20`: nome, nível, nota, data da primeira aprovação e o aviso de
  que é certificado do curso, não do JLPT. O botão também fica no mapa, na unidade de revisão.
- **Só o que foi ensinado:** as questões e as alternativas erradas saem dos itens do curso até a
  unidade da prova, nunca são outra resposta certa nem duas palavras com o mesmo sentido.
- **Código:** cada prova tem um código, como `U04-K7QH` (unidade e semente, sem 0, O, 1, I e L).
  O mesmo código gera sempre a mesma prova, sem depender do save, então a folha e o gabarito batem
  em qualquer aparelho.
- **Nivelamento:** no mapa, enquanto não há progresso. Quatro questões por unidade, em ordem, com
  "Não sei". Acertou 3, a unidade conta como feita (as cartas entram como vistas) e vem a seguinte;
  na primeira em que não passa, o curso começa nela. É a exceção à regra de só cobrar o que foi
  ensinado ([ensino.md](ensino.md)).

## Material impresso

Feito na fase 3, em `src/curso/Impresso.tsx` (estilo em `impresso.css`, A4 em branco). Cada
impresso é uma página do próprio site, aberta numa aba nova e impressa pelo navegador:

- `?imprimir=prova&codigo=U04-K7QH`: a prova, com nome e data, o código e um QR para o gabarito.
  O botão "Imprimir esta prova" fica no começo de cada prova.
- `?gabarito=U04-K7QH`: a resposta de cada questão, com a palavra inteira e a explicação. No mapa
  do curso há um campo para digitar o código da folha.
- `?imprimir=apostila&unidade=a1-04`: vocabulário e kanji com leituras (e as outras leituras do
  curso), a gramática e as notas culturais conferidas.
- `?imprimir=cartoes&unidade=a1-04`: cartões para recortar, 8 por folha, com o verso espelhado para
  imprimir frente e verso.
- `?imprimir=escrita&unidade=a1-04`: para cada kanji, a ordem dos traços (KanjiVG) e uma linha de
  caixas com cruz, com o modelo e três guias para cobrir.

- `?escuta=U20-K7QH`: o áudio da parte de escuta do simulado impresso, um botão por questão. A
  folha do simulado traz esse QR ao lado do QR do gabarito, e a escuta não tem a frase escrita.

Tudo sai dos mesmos dados da lição, então o papel nunca fica diferente do site.
`tests/curso-prova.test.ts` e `tests/curso-impresso.test.tsx` cobrem as provas e os impressos.

## Reforço depois da prova

- **Revisão diária (FSRS):** o "dever de casa" que aparece na tela inicial.
- **Unidade de revisão a cada 4 unidades:** junta tudo numa situação maior (um dia inteiro em
  Tóquio, por exemplo).
- **Jogos livres:** KanjiMon, Kana Beat, Memória, Cena Viva e os outros, só com o que já foi estudado.
  A coleção do KanjiMon cresce com os kanji das lições.
- **Uso:** conversa por voz com a IA sobre os temas já vistos, leitura graduada e shadowing.
- **Caderno:** consulta da gramática, dos kanji e das notas culturais já vistos.

## A gamificação

Ela fica por cima do curso, não no lugar dele: sequência de dias, nível, XP por lição, a prova da
unidade como chefe e a coleção do KanjiMon. Nada de jogo precisa de velocidade para dar progresso.

## Áudio de kana isolado

A voz em japonês (AivisSpeech) pronuncia mal um kana sozinho. Duas frentes:

1. **Legenda (feita).** Toda fala em japonês gravada mostra, enquanto toca, o texto com furigana
   embaixo da tela (`src/core/legenda.ts` e `LegendaVoz.tsx`). Quem toca o áudio liga a legenda
   (`legendar`): a fala solta, a sequência das aulas e a Conversa. No Módulo 0 ela mostra também
   o romaji.
2. **Gravação melhor dos kana isolados (feita).** O gravador sabe quatro jeitos
   (`KANA_METODOS` em `scripts/gravar_vozes.py`): o de sempre (VOICEVOX, kana sozinho); esticado
   (mais devagar, vogal mais longa e silêncio em volta); recortado (o motor fala か、か e fica só a
   primeira, cortada pelo tempo de cada mora); e a voz das frases (AivisSpeech まお). As versões de
   26 kana já gravadas ficam em `D:\KotobaArcade\voz\comparacao-kana`
   (`npm run vozes -- --comparar-kana D:/KotobaArcade/voz/comparacao-kana`). `npm run comparar-kana`
   abre a comparação às cegas: cada kana toca em todas as versões, em ordem sorteada, e o
   resultado vai para `resultado.json` na mesma pasta. O jeito que ganhar entra em
   `scripts/kana-metodo.json`, e `npm run vozes` grava todos os kana de novo. Gravação humana
   com licença livre ficou de fora por ora: precisaria baixar um banco de áudio de fora.

   Resultado (23/11/2026): a voz das frases ganhou em 13 dos 26 kana, o recortado em 5 (し, ち,
   り, る, りゅ), o esticado em 1 (ん), o de sempre em nenhum, e em 7 nenhuma serviu (あ, お, ふ,
   を, ぴ, ファ, ヴ). O site passou a usar a voz das frases (`aivis`) para todo kana solto. Os 7 sem
   versão boa e os 5 em que o recorte soou melhor são o ponto de partida se um dia valer gravar
   kana a kana com jeitos diferentes; a legenda com romaji continua cobrindo a dúvida.

## Módulo 0: kana e sons

Feito na fase 5, em `src/curso/modulo0.ts` (lógica) e `ModuloZero.tsx` (tela). Seis lições no alto
do mapa, antes do A1, com os mesmos kana, desenhos e cartas do Kana em imagens: vogais e linhas do K
e do S; T, N e H; M, Y, R, W e ん; tenten, maru, combinados, っ e vogal longa; katakana básico;
katakana com tenten, combinados e sons de fora. Cada lição abre com o que o desenho não mostra
(し é shi, o R é um toque, っ é uma pausa) e segue por lotes de 3 a 6 kana: apresentação e um
treino curto, ouvindo (qual kana é este som) ou lendo (como se lê). As opções erradas só vêm de kana
já apresentados no módulo. O módulo não tranca o A1: quem já lê kana vai direto para a unidade 1. O
progresso fica em `games.curso.modulo0` (lotes feitos).

## O que já existe

O conteúdo atual (vocabulário, figuras, vozes, kanji, cenas) é reaproveitado e redistribuído pelas
unidades. Por enquanto a Jornada continua ao lado do curso, no fliperama; ela vai ser absorvida
por ele. Os jogos continuam, como exercícios das lições e como prática livre.

## Fases

1. **Currículo:** feito para o A1 e o A2 (`src/content/curso/`), com testes. O A1 foi cruzado com
   uma lista de N5; o A2 ainda não foi cruzado com uma lista de vocabulário do N4.
2. **Motor do curso:** feito (ver "O motor do curso", acima).
3. **Provas e impressos:** feito, com o simulado do JLPT e o certificado (ver "Provas" e
   "Material impresso", acima).
4. **Conteúdo do A1:** feito (ver "Conteúdo do A1", acima), com o vocabulário do N5.
5. **Áudio de kana e legendas:** feita: legendas, Módulo 0 e kana solto gravado com a
   voz que ganhou a comparação às cegas.
6. **A2:** feito (ver "Conteúdo do A2", acima).
