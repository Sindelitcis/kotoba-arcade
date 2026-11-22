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
japonesa (お金, お水) e ご nas de origem chinesa (ご家族, ご住所), com exceções famosas (ご飯, お電話).

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

Kanji fora do N5 que a vida pede cedo (駅, 会社, 曜日, 病気...) entram marcados como `extra`. As notas
culturais estão com `conferida: false`: cada uma precisa ser conferida contra a fonte antes de ir
para a lição publicada.

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
  logo depois delas, a gramática, as notas culturais já conferidas e o diálogo da situação. A
  unidade de revisão tem só o objetivo e uma prática com o que já foi visto. Os passos que dependem
  do conteúdo da fase 4 (aula falada, exemplos de gramática, tarefa de uso) e das provas da fase 3
  (mini-teste) ainda não entram.
- **Cartões.** `cartoes.ts` monta a apresentação direto do currículo, no mesmo cartão dos jogos
  (`core/Apresentacao.tsx`). O do kanji mostra a leitura usada na palavra, a explicação da troca
  quando ela muda e as outras leituras do curso, com a unidade em que entram. O de gramática mostra
  o padrão e a regra, sem exemplo até a fase 4.
- **Prática.** `pratica.ts`: duas opções na primeira vez e três depois, todas de itens do curso já
  apresentados. Errar não tira nada: a resposta fica na tela até a pessoa seguir, o cartão aparece
  de novo e a pergunta volta no fim. A parte acaba quando cada item foi acertado uma vez.
- **Memória.** As palavras e os kanji entram nas mesmas cartas do FSRS dos jogos (`w:<palavra>#meaning`,
  `k:<kanji>#meaning` e `#reading`). O que foi visto no curso os jogos já podem praticar.
- **Progresso.** Fica em `games.curso` no save: quantas partes de cada unidade foram feitas e
  quais unidades foram concluídas. Parar no meio volta na mesma parte.
- **Liberação.** A unidade 1 é livre e cada outra abre quando a anterior é concluída. O ponto que
  decide isso é `venceu()`, em `motor.ts`; a fase 3 troca "chegou ao fim" pela prova com 80%.
- **Voz.** Tudo o que os cartões falam (a palavra em japonês e o "Quer dizer..." na Voz 1) entra
  nas listas de gravação (`scripts/falas.ts` e `scripts/falas-pt.ts`, origem `curso`).

`tests/curso-motor.test.ts` percorre o A1 inteiro com um save zerado e confere, em cada pergunta,
que o alvo e todas as alternativas já foram apresentados; também cobre as partes, os cartões, o
progresso e a liberação. `e2e/curso.spec.ts` faz o caminho no navegador.

## Provas

- **Fim de unidade:** prova digital no site, com nota mínima de 80% para liberar a próxima. Quem
  não passa recebe uma revisão do que errou e pode refazer, com questões diferentes.
- **Versão para imprimir:** a mesma prova em PDF/página de impressão, com espaço para escrever à
  mão. Cada prova tem um código. O gabarito fica no site, aberto pelo código ou por um QR na folha,
  para conferir depois.
- **Fim de nível:** simulado no formato do JLPT (vocabulário, gramática, leitura e escuta), com
  certificado do curso.
- **Nivelamento:** quem já sabe algo faz uma prova de entrada e começa da unidade certa.

## Material impresso

Não fica só nas provas. Sempre que o papel ajudar a aprender, a lição tem a sua versão impressa:

- **Apostila da unidade:** a aula resumida, a tabela de vocabulário e kanji com leituras, a
  gramática e as notas culturais, para ler longe da tela.
- **Folhas de exercício:** escrita de kana e kanji com a ordem dos traços e quadriculado (原稿用紙),
  completar frases, ligar, ditado (o áudio fica no site, aberto por QR).
- **Cartões para recortar:** vocabulário e kanji da unidade, frente e verso.
- **Gabarito:** de tudo o que é impresso, no site, aberto pelo código ou pelo QR da folha.

Tudo é gerado a partir dos mesmos dados da lição, então a apostila nunca fica diferente do site.

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

1. Toda fala em japonês ganha legenda (kana e, no módulo 0, romaji).
2. Os kana isolados ganham uma gravação melhor. Os caminhos são: gerar dentro de uma frase e
   recortar, testar outro modelo de voz, ou usar gravações humanas com licença livre. A escolha
   é feita por comparação às cegas, como foi feito com as imagens.

## O que já existe

O conteúdo atual (vocabulário, figuras, vozes, kanji, cenas) é reaproveitado e redistribuído pelas
unidades. Por enquanto a Jornada continua ao lado do curso, no fliperama; ela vai ser absorvida
por ele. Os jogos continuam, como exercícios das lições e como prática livre.

## Fases

1. **Currículo:** feito para o A1 (`src/content/curso/`), com testes. Falta conferir as notas
   culturais contra as fontes e cruzar o vocabulário com uma lista de N5.
2. **Motor do curso:** feito (ver "O motor do curso", acima). Falta o que depende das fases 3 e 4.
3. **Provas e impressos:** mini-teste, prova de unidade digital e imprimível, apostila, folhas de
   exercício, cartões, gabarito por código e nivelamento.
4. **Conteúdo do A1:** aulas faladas na Voz 1, diálogos, quadros e exercícios, unidade por unidade.
5. **Áudio de kana e legendas.**
6. **A2.**
