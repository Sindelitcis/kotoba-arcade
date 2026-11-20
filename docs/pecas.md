# Kanji em peças: de onde vêm os dados

O jogo mostra cada kanji como um desenho feito de peças. Os traços, as peças e as leituras vêm de dados abertos; os nomes das peças, as imagens, as historinhas e a escolha da palavra de exemplo foram escritos à mão para o jogo.

## Quanto tem

- 612 kanji: todos os do N5 (79), N4 (166) e N3 (367), contando os 94 do KanjiMon. Mais o 士, do N1, que entra só para fazer par com o 土 no modo Intruso.
- 383 peças, cada uma com nome curto em português e um emoji como imagem para lembrar.
- 51 pares de kanji parecidos para o Intruso (未/末, 土/士, 人/入, 待/持…), cada um com a diferença explicada.
- Os 367 do N2 já estão no recorte de dados (`recorte.json`), com leituras, traços e peças. Falta só o conteúdo escrito à mão.

## Fontes e licenças

| Dado | Para quê | Licença |
| --- | --- | --- |
| [KanjiVG](https://kanjivg.tagaini.net), de Ulrich Apel | traços de cada kanji e de cada peça, e quais traços formam cada peça | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project), da EDRDG | leituras on e kun, número de traços | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| [KRADFILE/RADKFILE](https://www.edrdg.org/krad/kradinf.html), da EDRDG | lista de peças de cada kanji | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| [JMdict](https://www.edrdg.org/jmdict/j_jmdict.html), da EDRDG | conferir que cada palavra de exemplo existe, com aquela leitura, e é comum | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| [kanji-data](https://github.com/davidluzgouveia/kanji-data), de David Luz Gouveia | nível do JLPT de cada kanji | MIT |

Os arquivos gerados a partir desses dados (`src/games/pecas/recorte.json` e `src/games/pecas/tracos.json`) seguem as licenças de origem: CC BY-SA. O conteúdo escrito à mão (`src/games/pecas/dados/`) pode ser usado nos mesmos termos.

## Como regenerar

Os arquivos brutos não entram no repositório. Baixe para uma pasta fora dele (aqui usamos `D:\KotobaArcade\\dados`):

- `brutos/kanjivg-AAAAMMDD.xml` (o arquivo único do KanjiVG);
- `brutos/kanjidic2.xml`, `brutos/JMdict_e` e `brutos/kanji.json` (kanji-data);
- `krad/kradfile` e `krad/kradfile2` (EUC-JP).

Depois:

```bash
python -I -X utf8 scripts/pecas-dados.py D:/KotobaArcade/dados
```

O script lê as linhas de `src/games/pecas/dados/` e confere cada uma: toda peça tem que ser uma parte do kanji no KanjiVG, a leitura tem que estar no KANJIDIC2, a palavra tem que estar no JMdict com aquela leitura, ser comum e conter o kanji. Qualquer problema aparece na tela e nada é gravado.

Se mudar a lista de kanji, rode também `scripts/recortar-fontes.py`: os kanji que só este jogo usa ficam em `YujiSyuku-Pecas.woff2`, que o navegador baixa só quando um deles aparece.

## Como pôr o N2

1. Crie `src/games/pecas/dados/n2.ts` no mesmo formato de `n5.ts`: `kanji|peças|leitura|significados|palavra:kana:português|historinha`.
2. Ponha `N2` em `NIVEIS`, em `src/games/pecas/dados/index.ts`.
3. Dê nome às peças novas em `pecas.ts`.
4. Rode o script acima, o recorte das fontes e `npm run vozes`.

Os testes de `tests/pecas-dados.test.ts` avisam se faltar peça sem nome, leitura fora do KANJIDIC2 ou palavra que não é comum.

## Regras do conteúdo

- **Leitura**: a mais usada hoje, a mesma regra de `src/content/leituras.ts`. Se o kanji sozinho é palavra (山 やま), vale a palavra; senão, a leitura das palavras do dia a dia (休 きゅう). Os 94 do KanjiMon usam exatamente a leitura de lá.
- **Historinha**: liga as peças ao significado. Pode brincar com o desenho, mas não inventa origem: quando a história diz "parece", é só para lembrar.
- **Palavra de exemplo**: comum no JMdict (news1, ichi1, spec1, spec2 ou gai1) e que contém o kanji.
