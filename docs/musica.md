# Som do fliperama

Tudo que toca no site, menos as vozes (essas estão em `docs/vozes.md`). A lista com fonte, autor e licença de cada arquivo fica em `src/core/som/catalogo.ts`. Dali saem a tela Créditos do som (nos Ajustes) e as tabelas abaixo. O `tests/som.test.ts` reclama se um arquivo ficar sem crédito, se o código citar um som que não existe ou se esta página esquecer algum.

## Como funciona

Um gerenciador só (`src/core/som/mixer.ts`) toca música e efeitos:

- Nada toca antes do primeiro clique, toque ou tecla. A trilha pedida antes disso começa nessa hora.
- Nos Ajustes há Som (liga e desliga tudo) e um volume para Música, Efeitos e Voz.
- Quando uma voz fala, a música desce para uns 20% e volta quando a voz acaba. Toda voz (gravada ou do navegador) passa por `acompanharVoz`.
- Cada tela tem um clima, e trocar de tela troca a trilha com crossfade de pouco mais de um segundo (`src/core/som/climas.ts`). Um jogo pode pedir outro clima por cima com `useClima`, como o chefe do Kotodama e as telas de resultado.
- Com modo calmo ou "reduzir movimento" no sistema, a troca de tela fica sem o som de transição.
- Aba escondida deixa a música em silêncio.
- O Kana Beat tem a música dele (abaixo) e passa pelo mesmo volume de música. Ele e a Conversa ficam sem trilha de fundo.

## Trilhas de fundo

Todas do 魔王魂 (Maou Damashii), de 森田交一, que libera o uso em jogo, com corte e mudança de andamento, e sugere o crédito "音楽：魔王魂". Não pode dizer que fez a música, redistribuir o arquivo solto nem usar IA para arranjar ou treinar. Regras: https://maou.audio/rule/

| Clima | Faixa | Onde toca |
| --- | --- | --- |
| hub | [アコースティック27](https://maou.audio/bgm_acoustic27/) | Fliperama, Jornada e menus |
| calmo | [ヒーリング15](https://maou.audio/bgm_healing15/) | Lições, modo Ouvir, Kumitate, Memória, Kana em imagens, Kanji em peças e KanjiDex |
| historia | [アコースティック32](https://maou.audio/bgm_acoustic32/) | Aventura e Cena Viva |
| acao | [ネオロック73](https://maou.audio/bgm_neorock73/) | KanjiMon e lutas do Kotodama |
| chefe | [民族33](https://maou.audio/bgm_ethnic33/) | Chefe do Kotodama |
| vitoria | [アコースティック03](https://maou.audio/bgm_acoustic03/) | Telas de resultado e vitória |

Cada faixa virou um loop sem emenda de 35 s a 90 s. Gravação tocada não segue uma grade de batidas exata, então o script procura dois pontos em que a música soa igual (acordes e ataques parecidos nos 4 segundos seguintes), acerta a emenda na amostra e mistura 0,12 s na passagem. Depois iguala o volume e grava ogg (uns 450 KB a 1,1 MB cada).

## Efeitos

Todos do 効果音ラボ (Sound Effect Lab). Uso livre como som de um app, sem crédito obrigatório (o site mostra "効果音：効果音ラボ" mesmo assim). Não pode redistribuir o arquivo solto, linkar o arquivo direto do site deles nem usar para treinar IA. Regras: https://soundeffect-lab.info/agreement/

| Id | Som | Quando toca |
| --- | --- | --- |
| clique | 決定ボタンを押す22 | Botão e escolha |
| voltar | キャンセル3 | Fechar menu ou ajuda |
| menu | メニューを開く4 | Abrir Ajustes ou a ajuda |
| acerto | キラッ1 | Acerto; sobe de tom com o combo |
| rapido | シャキーン3 | Acerto rápido |
| erro | ボヨン | Erro |
| combo | 決定ボタンを押す21 | A cada 5 acertos seguidos |
| captura | きらきら輝く4 | Captura de carta |
| raro | ゴゴゴゴ | Carta rara ou inimigo forte |
| bau | 宝箱を開ける | Baú e recompensa |
| nivel | レベルアップ | Subir de nível e recorde |
| fim | ちゃんちゃん♪1 | Fim de rodada sem vitória |
| transicao | シーン切り替え1 | Troca de tela |
| carta | カードをめくる | Virar carta ou página |
| vitoria | ジャジャーン | Vitória |
| taiko | 和太鼓でドン | Golpe forte e carta lendária |

O acerto sobe meio tom a cada acerto seguido, até 12, e a cada 5 seguidos entra o toque de combo. Cada efeito foi cortado no começo do som, limitado a poucos segundos com fade no fim, igualado no volume e gravado em ogg mono (uns 15 KB cada).

Os .ogg de `src/assets/som/` estão no repositório só como parte do jogo. Eles não têm licença livre: quem quiser usar uma música ou um efeito em outro projeto precisa baixar do site do autor e seguir as regras de lá.

## Arquivos originais e scripts

Ficam fora do repositório, em `D:\KotobaArcade\musica`:

- `baixadas/maou/`: as faixas originais do 魔王魂;
- `efeitos/lab/`: os efeitos originais do 効果音ラボ;
- `scripts/loop_bgm.py`: corta o loop de cada trilha e grava `cortes/bgm/bgm.json` com início, fim e qualidade da emenda;
- `scripts/efeitos.py`: prepara os efeitos e grava `cortes/efeitos/efeitos.json`.

Para trocar um som: baixe o original para a pasta certa, mude a tabela do script, rode `venv\Scripts\python -I scripts\loop_bgm.py cortesgm` (ou `efeitos.py cortes\efeitos`), copie o .ogg para `src/assets/som/musica/` ou `src/assets/som/efeitos/` e atualize `src/core/som/catalogo.ts` e esta página. Só use fonte que deixe pôr o som num jogo publicado e nunca trilha de anime ou de jogo oficial.

## Kana Beat

O Kana Beat toca trechos de faixas reais, não música sintetizada. Créditos e licenças estão no README e na tela Músicas, que abre pelo resultado da fase.

### Como a faixa é escolhida

Cada fase tem um BPM. Ele sobe quando você vai bem e desce quando não vai, de 50 a 150. O jogo pega a faixa que precisa mudar menos de velocidade para bater com esse BPM (`pickTrack` em `src/games/kanabeat/tracks.ts`):

- uma faixa de 75 serve para 75 BPM;
- uma de 160 serve para 80, com uma nota a cada dois tempos (meio tempo);
- uma de 75 serve para 150, com uma nota também no meio de cada tempo.

O ajuste fino é a velocidade de reprodução (`playbackRate`). Ela muda um pouco o tom, porque o Web Audio não tem como manter o tom no loop exato. Com essas oito faixas, nenhum BPM do jogo pede mais de 10% de diferença. Um teste confere isso para cada BPM de 50 a 150.

O tempo 0 da fase cai no primeiro tempo forte da faixa, e as notas caem nos tempos do jogo, então caem na batida. Ao sair da pausa, a música volta do ponto certo.

### Como os trechos foram feitos

Os arquivos originais e os scripts ficam fora do repositório, em `D:\KotobaArcade\\musica`:

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
