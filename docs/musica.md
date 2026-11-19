# Músicas do Kana Beat

O Kana Beat toca trechos de faixas reais, não música sintetizada. Créditos e licenças estão no README e na tela Músicas, que abre pelo resultado da fase.

## Como a faixa é escolhida

Cada fase tem um BPM. Ele sobe quando você vai bem e desce quando não vai, de 50 a 150. O jogo pega a faixa que precisa mudar menos de velocidade para bater com esse BPM (`pickTrack` em `src/games/kanabeat/tracks.ts`):

- uma faixa de 75 serve para 75 BPM;
- uma de 160 serve para 80, com uma nota a cada dois tempos (meio tempo);
- uma de 75 serve para 150, com uma nota também no meio de cada tempo.

O ajuste fino é a velocidade de reprodução (`playbackRate`). Ela muda um pouco o tom, porque o Web Audio não tem como manter o tom no loop exato. Com essas oito faixas, nenhum BPM do jogo pede mais de 10% de diferença. Um teste confere isso para cada BPM de 50 a 150.

O tempo 0 da fase cai no primeiro tempo forte da faixa, e as notas caem nos tempos do jogo, então caem na batida. Ao sair da pausa, a música volta do ponto certo.

## Como os trechos foram feitos

Os arquivos originais e os scripts ficam fora do repositório, em `D:\KotobaArcade-Musica`:

- `baixadas/`: as faixas originais do OpenGameArt;
- `scripts/oga.py`: lê título, autor, licença e arquivos de uma página do OpenGameArt;
- `scripts/refinar.py`: mede o BPM fino ajustando uma reta sobre as batidas que o librosa acha;
- `scripts/cortar.py`: corta os trechos e imprime a tabela de metadados;
- `cortes/`: os .ogg finais e a `tabela.json`.

O `cortar.py` faz assim:

1. mede o BPM no trecho que vai virar loop;
2. começa no tempo forte do compasso, o que tem mais grave, contando de 4 em 4;
3. usa um número inteiro de grupos de 16 tempos, perto de 1 minuto, para o fim emendar no começo no tempo certo;
4. mistura os 40 ms seguintes ao fim no começo do trecho, para a emenda não estalar;
5. iguala o volume e grava ogg vorbis (qualidade 3, uns 700 KB por faixa);
6. mede de novo o arquivo final. O BPM e o primeiro tempo (`offsetMs`) da tabela são dessa segunda medição.

Para trocar ou acrescentar uma faixa, use só licença que deixe publicar no site (CC0, CC-BY, OGA-BY). Depois: baixe o arquivo para `baixadas/`, ponha uma linha em `FAIXAS` no `cortar.py`, rode `venv\Scripts\python scripts\cortar.py cortes`, copie o .ogg para `src/assets/musica/` e a linha da tabela para `TRACKS`. O `tests/kanabeat-musica.test.ts` reclama se faltar arquivo, crédito ou cobertura de BPM.
