# Ensinar antes de cobrar

Ninguém lembra do que nunca viu. Então todo jogo segue a mesma ordem para cada coisa nova (palavra, kanji, kana, ponto de gramática):

1. **Apresentar.** Um cartão por item, de 3 a 5 por vez: imagem, o japonês em áudio e o que quer dizer, também falado em português (Voz 1 por padrão, Voz 2 com a tecla V). Uma frase de explicação e um exemplo. Enter segue, ← volta, R ouve de novo.
2. **Praticar com apoio.** Pergunta fácil, dica na tela, poucas opções (duas na primeira vez, três depois). Errar não tira vida, combo nem pontos: o item aparece de novo, num cartão mais apagado, e a pergunta volta.
3. **Cobrar.** Só depois de acertar na prática. Aí entram o tempo, as vidas, o combo e todas as opções.

## Onde isso mora

- `src/core/ensino.ts` decide a fase pelo estado da carta no FSRS. Sem carta: novo. Carta em New, Learning ou Relearning: prática. Em Review: cobrança. Apresentar é criar a carta vazia (`apresentar`), então "apresentado" fica no próprio save das cartas, sem campo novo.
- `avaliar()` é o único jeito de dar nota, e ele recusa item que nunca foi apresentado (`ItemNaoApresentado`). Cada jogo tem um teste que joga várias rodadas e confere isso.
- `notaDaPratica()` dá a nota da prática: acerto vale "bom", nunca "fácil" (o tempo não conta), e o erro só repete o passo de aprender, sem virar esquecimento. É o acerto na prática que leva a carta para a cobrança.
- `novidades()` escolhe os novos da vez: até 5, e nenhum enquanto houver 8 ou mais itens em prática.
- `src/core/Apresentacao.tsx` é o cartão, o mesmo em todos os jogos (estilo em `docs/estilo.md`). `src/content/ensino.ts` monta o item a partir da ficha do Aprofundar.

## Jogo por jogo

| Jogo | Apresenta | Prática | Cobrança |
| --- | --- | --- | --- |
| Kana em imagens | 3 kana: o desenho, o som, a palavra da imagem | a imagem fica por perto, dica e poucas opções | pares que confundem, só o som, leitura relâmpago. Quem já lê faz o teste rápido e vai direto para cá |
| Cena Viva | as coisas do lugar, uma a uma, brilhando na cena | primeira etapa só com o nome: これはなんですか？ → これは〜です. Errar não tira pontos e a coisa certa brilha | 〜はどこ？, cor, posição, contadores e frases longas, cada etapa com a sua lição antes |
| Memória | as palavras novas antes do primeiro quadro | quadro rápido com apoio; errar mostra a palavra de novo | o quadro de cartas viradas, só quando todas as palavras dele passaram da prática |
| KanjiMon | o kanji: desenho, leitura, significado falado e uma palavra | dica, duas opções, sem digitar; não tira coração nem combo | coração, combo, resposta rápida |
| Kana Beat | os kana ou palavras da música, antes de ela começar | nota com romaji, uma batida a mais, não zera o combo | ritmo normal; no fim, as de prática que passaram voltam numa apresentação |
| Kotodama | as cartas com kanji ou palavra ainda não vistos | dica e duas opções; mesmo errando, a carta sai forte | errar enfraquece a carta |
| Kanji em peças | a lição do kanji: peças pintadas, nomes, historinha, leitura | errar não zera o combo; nenhum kanji repete logo em seguida | "adivinhar" só com peças conhecidas, combo e tempo |
| Kumitate | a lição curta do ponto, com exemplo e áudio | a peça certa brilha; errar não zera o combo | frase inteira, tempo e combo |
| Aventura | até 5 palavras da cena antes da primeira fala | a primeira passada não vale nota | as cenas seguintes cobram |
| Conversa | as palavras da situação antes de conversar | palavra não apresentada conta só como primeiro contato | o resto da conversa |
| Jornada | o quadro da lição apresenta a palavra ou o kanji | a pergunta logo depois é prática | missões seguintes |

## A ordem entre os jogos

A Jornada (`src/jornada/etapas.ts`) põe os jogos na mesma ordem. Na etapa Kana: Kana em imagens de hiragana, Kana Beat de hiragana, a lição dos sons, Kana em imagens de katakana, Kana Beat de katakana. Depois, as primeiras palavras: a Cena Viva de um lugar, só com o nome das coisas, e a Memória com as mesmas palavras. O KanjiMon vem no N5, com os kanji. Nada fica trancado: é a sugestão de caminho, e `tests/jornada.test.ts` confere essa ordem.
