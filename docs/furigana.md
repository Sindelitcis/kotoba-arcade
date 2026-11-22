# Furigana

Todo japonês com kanji que aparece no site tem a leitura em kana por cima do kanji. A leitura vai só em cima do kanji: em これは傘です。, só o 傘 ganha かさ.

## De onde vem a leitura

1. **Do próprio conteúdo**, quando ele já tem: a palavra e o kana dela, a marcação de ruby das lições (`{私|わたし}`), as partes que o gravador de vozes usa. O componente recebe essa leitura (`<Furigana texto leitura>`), e ela vale.
2. **De `src/content/data/furigana.json`**, para o resto: frases de exemplo dos kanji, nomes de tela, japonês no meio das explicações em português. O arquivo guarda a leitura de cada pedaço de kanji, na ordem (`"母は料理が上手です。": ["はは", "りょうり", "じょうず"]`). Assim a divisão nunca fica ambígua.

Nada é lido no navegador. A exceção é a Conversa, que fala com a IA na hora: a fala do personagem, a do jogador e a correção ganham a leitura do mesmo serviço de leitura que a Conversa já usa. Se ele falhar, a frase aparece sem furigana e a conversa segue.

## Gerar de novo

Depois de mudar conteúdo:

```
npm run furigana
```

O script (`scripts/furigana.ts`) junta todo o japonês do site (`scripts/textos-jp.ts`) e faz assim:

- O que o conteúdo já lê, fica.
- O resto é lido pelo OpenJTalk, o mesmo que o gravador de vozes usa. Ele vem do Python do motor de voz (`VOZ_PYTHON` ou `D:\KotobaArcade\voz\venv`) e roda só na CPU, sem a trava da placa. A leitura usada é a pronúncia de verdade: 三本 é さんぼん, 四時 é よじ.
- Palavra de dois kanji ou mais que o conteúdo sempre lê de um jeito só vale como o conteúdo lê.
- Confere com as vozes gravadas: o kana do furigana tem de bater com o que a voz falou.
- `scripts/furigana-correcoes.json` decide nos casos que sobram, com a pronúncia mais comum (魔王魂 = まおうだましい, 報連相 = ほうれんそう, 〜人 = にん).

Se sobrar texto sem leitura, ou leitura que não bate com a voz, o script lista tudo em `test-results/furigana-revisar.txt` e termina com erro.

## Onde não tem furigana, de propósito

- O kanji que é a própria pergunta: a carta do KanjiMon na caçada, a face da carta do Kotodama, o kanji desenhado do Kanji em peças e a carta "só kanji" da Memória. A leitura em cima entregaria a resposta.
- A peça de kanji que aparece sozinha numa historinha da ficha do Aprofundar (夂, 忄, 頁). É desenho, não palavra. A lista fica em `formas`, no mesmo arquivo.
- O verso da carta da Memória (言), que é só enfeite.

## Esconder o que você já sabe

Nos Ajustes, "Leitura em cima do kanji" tem duas opções:

- **Sempre**, o padrão.
- **Só no que ainda aprendo**, que tira a leitura do kanji cuja carta de leitura já está firme, isto é, aguenta uma semana sem revisar. Kanji sem carta continua com a leitura.

## Testes

- `tests/furigana-cobertura.test.tsx` passa por todo o japonês do conteúdo e falha se algum kanji ficar sem leitura. Também cobre o caso relatado (火を消して。 no cartão do KanjiMon), o japonês no meio do português e o modo de esconder.
- Todo teste de ponta a ponta falha se a tela mostrar kanji sem leitura: o `<Furigana>` avisa no console com `[furigana] sem leitura`, e `e2e/base.ts` procura essa marca.
- `e2e/kanjimon.spec.ts` confere o `<rt>` na frase de exemplo de cada cartão de apresentação do KanjiMon.
