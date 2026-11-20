# Vozes

O japonês que os jogos falam vem de arquivos gravados em `public/vozes/`: palavras, frases dos kanji, kana, falas da Aventura, frases do Kumitate (prontas e pela metade, na tecla R), abertura, respostas prontas e palavras novas da Conversa. A única fala montada na hora é a resposta do modelo na Conversa, e quem fala é o servidor local, com o AivisSpeech. A voz do navegador só aparece se um arquivo não tocar ou se o servidor perder a voz no meio.

## Como funciona

- `scripts/falas.ts` lista cada texto que vai para `speak()`, com a voz e a leitura esperada.
- `npm run vozes` grava o que falta e atualiza `public/vozes/manifesto.json` (texto → voz → arquivo). O nome do arquivo é um hash do texto, da voz e do que foi mandado ao motor. Mudou a frase, muda o arquivo; o que sobrar é apagado.
- `speak(texto, voz)` em `src/core/audio.ts` procura o texto no manifesto e toca o mp3. Palavra solta e kana usam `speakWord(kana)`, que pede a voz de palavra. Sem gravação, usa a voz do navegador.
- `tests/vozes.test.ts` falha se algum texto da lista ficar sem áudio. Escreveu uma cena nova, rode `npm run vozes`.
- `tests/vozes-cobertura.test.ts` parte dos jogos: lista toda chamada de `speak()` do código (chamada nova falha até alguém dizer de onde vem o texto) e joga 80 rodadas do Kumitate conferindo cada frase que a rodada fala, inteira ou pela metade.

A frase pela metade do Kumitate tem 200 formas possíveis, então todas foram gravadas. No buraco ainda vazio, o motor recebe uma vírgula, para soar como uma pausa, e não como uma palavra que sumiu.

## Gravar de novo

O motor e os modelos ficam fora do repositório, em `D:\KotobaArcade\\voz`:

| Pasta | O que é |
| --- | --- |
| `aivis\Windows-x64` | AivisSpeech Engine 1.2.0 (frases) |
| `venv` | Python do gravador (faster-whisper, pyopenjtalk-plus) |
| `dados\kanjium-accents.txt` | base de acento da Kanjium |
| `trabalho` | lista de falas e relatório da última gravação |

Os modelos de voz ficam onde o AivisSpeech guarda (`%APPDATA%\AivisSpeech-Engine\Models`). O VOICEVOX (palavras e kana) e o Whisper são os mesmos da Conversa por voz, em `D:\KotobaArcade\\ia`.

```bash
npm run vozes
```

O `npm run vozes` passa pela trava da placa (`scripts/placa.py`, explicada em `docs/imagens.md`): espera a placa ficar livre, sobe o AivisSpeech (`--use_gpu`, porta 10101) e o VOICEVOX (porta 50021), grava e derruba os dois no fim. O log de cada motor fica em `trabalho/`. Se outra pessoa estiver com um motor de voz no ar, ele espera. Os executáveis podem ser trocados com `AIVIS_EXE` e `VOICEVOX_EXE`.

Na primeira vez o motor baixa o modelo de texto (deberta, 650 MB). Se a pasta de cache dele quebrar no Windows, apague `%APPDATA%\AivisSpeech-Engine\BertModelCaches` e rode com `HF_HUB_OFFLINE=1` depois de copiar os arquivos de `D:\KotobaArcade\voz\bert-onnx` para a pasta do snapshot.

Variáveis: `VOZ_DIR`, `VOZ_PYTHON`, `AIVIS_URL`, `VOICEVOX_URL`, `AIVIS_EXE`, `VOICEVOX_EXE`. `node scripts/gravar-vozes.mjs --listar` só escreve a lista de falas, sem prender a placa. `-- --refazer` grava tudo de novo.

## O que o gravador confere

1. **Leitura.** O motor recebe o texto com kanji, que acerta mais leitura e acento do que o kana solto. Antes, o gravador pergunta como ele lê cada palavra com kanji. A palavra que ele lê errado (日本人 vira ニッポンジン, この間 vira このかん) vai em kana, só ela. A frase inteira em kana erra mais: em せんせいとはなします, o は vira partícula e sai "と わなします".
2. **Acento.** Palavra solta tem o acento conferido na Kanjium. Se o motor errar, o acento é trocado antes de gravar. É assim que はし (ponte) e はし (palitos) saem diferentes.
3. **Ouvido.** O Whisper ouve cada gravação. Palavra curta também é ouvida depois de uma frase-moldura (次の言葉は、…), que dá contexto sem entregar a resposta. Se ele não entender a mesma coisa, o gravador tenta de novo: mais silêncio em volta, mais devagar, a palavra inteira em kana e, nas falas sem personagem, outra voz do AivisSpeech (まい, コハク, にせ, nessa ordem). Fica a primeira versão que bater. O que continua diferente vai para `trabalho/duvidas.json`, que guarda as dúvidas entre uma gravação e outra. `npm run vozes -- --refazer-textos lista.json` grava de novo só os textos da lista. Kana solto não dá para conferir assim: o Whisper não reconhece uma mora sozinha.
4. **Volume e silêncio.** Corta o silêncio das pontas, deixa tudo em -18 LUFS e grava mp3 mono de 48 kbps.

Quando o OpenJTalk lê uma frase errado pelo kanji (五分 vira ごぶ), a correção vai em `TTS_CORRIGIDO`, em `scripts/falas.ts`.

## Vozes usadas

Frases: AivisSpeech, modelos do AivisHub sob a [ACML 1.0](https://github.com/Aivis-Project/ACML/blob/master/ACML-1.0.md), que permite qualquer uso, inclusive comercial, e publicar o áudio. O crédito é opcional, mas está aqui e no README.

Palavras soltas e kana: VOICEVOX 四国めたん. O [termo de uso](https://zunko.jp/con_ongen_kiyaku.html) permite uso comercial e não comercial e pede o crédito "VOICEVOX:四国めたん", que está no README.

| Id | Voz | Onde |
| --- | --- | --- |
| `metan` | VOICEVOX:四国めたん | palavras soltas (KanjiMon, Kotodama, Kana Beat, Dex) e kana |
| `mao` | まお (卯畑まお ©Oz Chat/Trippy, CV: ねゆたろ) | frases sem personagem, o jogador na Aventura |
| `kohaku` | コハク (猫音コハク ©Oz Chat/Trippy, CV: ねゆたろ) | funcionária do aeroporto, Sakura |
| `mai` | まい | aviso da estação, senhora no trem, Yui |
| `nise` | にせ | atendente do guichê, balconista, Takeshi |
| `aida` | 阿井田 茂 (CV: 古山キリヲ) | fiscal da imigração, Tanaka |

## Por que AivisSpeech

Comparação feita em novembro de 2026, com 14 frases iguais em todas as vozes: seis palavras em pares mínimos de acento (橋/箸, 雨/飴, 紙/神) e oito frases do dia a dia. Medidas:

- **Leitura:** o Whisper large-v3-turbo transcreve, e as duas leituras viram kana pelo OpenJTalk antes de comparar.
- **Acento:** nos pares mínimos, quem tem a primeira mora alta precisa cair mais que o par.
- **Qualidade do sinal:** DNSMOS. Ele mede ruído e clareza, não a naturalidade da fala.

| Voz | Erro de leitura (frases) | Erro de leitura (palavras soltas) | Pares de acento certos |
| --- | --- | --- | --- |
| AivisSpeech まお | 3% | 8% | 3 de 3 |
| AivisSpeech コハク | 0% | 25% | 3 de 3 |
| AivisSpeech まい | 0% | 25% | 2 de 3 |
| AivisSpeech にせ | 0% | 33% | 1 de 3 |
| AivisSpeech 阿井田 茂 | 0% | 17% | 0 de 3 |
| VOICEVOX 四国めたん | 0% | 0% | 3 de 3 |
| VOICEVOX 春日部つむぎ | 0% | 25% | 3 de 3 |
| VOICEVOX 玄野武宏 | 1% | 17% | 2 de 3 |
| VOICEVOX 青山龍星 | 0% | 17% | 1 de 3 |

Nas vozes masculinas, a medida de acento erra por oitava (o detector de tom pula para o dobro da frequência), então o 0 de 3 do 阿井田 茂 é mais a medida do que a voz. Palavra de duas moras sozinha é o caso mais difícil para todo mundo, inclusive para o Whisper, que ouviu アメン em várias vozes.

As duas famílias acertaram leitura e acento parecido nas frases. O critério que desempata é a naturalidade: o AivisSpeech usa o Style-Bert-VITS2 JP-Extra, com entonação e respiração de gente, e o VOICEVOX soa mais de personagem de anime. Nas frases ficou o AivisSpeech, com a まお de voz principal porque foi a que melhor acertou palavra solta e acento entre as dele.

Palavra solta mudou a escolha. Na primeira gravação completa, o Whisper não entendeu 66 das palavras da まお (がくせい virou 覚醒, ごご virou ココ). Num teste com 55 dessas palavras mais 40 que tinham saído bem:

| Versão | Palavras difíceis | Palavras fáceis |
| --- | --- | --- |
| まお | 20 de 55 | 31 de 40 |
| まお mais devagar (0,85) | 18 de 55 | 30 de 40 |
| VOICEVOX 四国めたん | 42 de 55 | 35 de 40 |

Uma palavra que não se entende ensina errado, então palavra e kana ficaram com a 四国めたん.

A まお também embola algumas palavras dentro da frase. 切符 sai きっと em toda versão que tentamos (devagar, em kana, com mais silêncio); a にせ acertou 3 de 3. Por isso nove frases sem personagem estão em outra voz: sete com a にせ (as de 切符 e 友達が家へ来ます) e duas com a まい. Vale mais uma palavra clara numa voz diferente do que a voz de sempre ensinando a palavra errada.

## Dúvidas que ficaram

Estas gravações o Whisper não confirmou, em nenhuma versão:

| Texto | Voz | O Whisper ouviu | Por quê |
| --- | --- | --- | --- |
| さんびゃく | 四国めたん | 3略 | escreve o número; o "略" é o juiz |
| まちなか | 四国めたん | 街中 | o OpenJTalk lê 街中 como まちじゅう; a gravação está certa |
| つぎのかた、どうぞ。 | 阿井田 茂 | 次の方、どうぞ。 | o OpenJTalk lê 方 como ほう; a gravação está certa |
| はい、あいています。 | まお | はい、会えています | nas outras tentativas ele ouviu 開いて, que o OpenJTalk lê ひらいて; pode ser o juiz ou o い curto |
| いいえ、まだまだです。 | まお | いえ、まだまだです | o いいえ sai curto |
| ごご | 四国めたん | 子語 (com moldura) | palavra de duas moras; sem moldura ele ouve ここ |
| 新, 長, 立, 入, 出 | 四国めたん | チン, ちょっ, いつ, にゅ, 術 | kanji sozinho na leitura on'yomi, uma ou duas moras sem contexto. O motor recebeu o kana certo (しん, ちょう, りつ, にゅう, しゅつ), e a duração bate com きゅう e こう, que o Whisper confirmou |
| 十 | 四国めたん | 10. | escreve o número; a gravação está certa | O VOICEVOX também aceita o acento marcado e recalcula a altura de cada mora, o que deixa a correção de acento da Kanjium valer de verdade.

Não entraram nas amostras:

- **Irodori-TTS v4.1 (MIT):** instalado em `D:\KotobaArcade\voz\irodori`, mas a geração foi bloqueada pela permissão da sessão. Não tem como mandar acento, só texto.
- **Fish Speech S2 Pro, GPT-SoVITS, CosyVoice:** clonam voz a partir de uma gravação de referência, então precisariam de uma voz com licença para isso. O Fish Speech tem licença só para pesquisa, sem uso comercial. Nenhum deixa marcar o acento.
- **Áudio humano do Tatoeba:** das nossas 286 frases, só 24 têm gravação lá. A maioria dessas gravações é CC BY-NC-ND ou CC BY-NC, e cada uma tem um falante diferente. Ficaria uma colcha de vozes cobrindo 8% das frases.

## Português falado

As aulas do modo Ouvir (tecla `O` no fliperama), a lição de cada peça nova do Kumitate, a narração da Aventura e a frase curta de quando você erra na Jornada são faladas em português. O português vem antes; o exemplo em japonês vem depois, na gravação de sempre de `public/vozes/`.

- `src/aulas/` tem as aulas: uma por lição da Jornada, de 30 segundos a 3 minutos. Cada uma explica em português, toca o japonês, faz uma pausa para você repetir em voz alta e toca o japonês de novo. No fim, uma revisão: você ouve em português e responde antes de ouvir a resposta.
- `src/core/sequencia.ts` toca uma lista de trechos (português, japonês, pausa). A pausa tem o tamanho da última fala em japonês, entre 2 e 8 segundos.
- `scripts/falas-pt.ts` lista todo o português falado. Os textos não têm número, romaji nem japonês: a voz em português leria "masu" como "mazu". Partícula e palavra japonesa vão sempre pela gravação em japonês (`tests/aulas.test.ts` confere).

Há duas vozes em português, as duas no site, com o mesmo texto como chave. O nome é genérico de propósito: Voz 1 e Voz 2.

| Voz | Pasta | Quem é |
| --- | --- | --- |
| Voz 1 (padrão) | `public/vozes-pt/voz1/` | voz em português de um amigo do Rafael, usada com autorização (Fish Speech com um modelo afinado) |
| Voz 2 | `public/vozes-pt/voz2/` | Kokoro-82M, voz pf_dora (Apache-2.0) |

Em Ajustes, "Voz em português" escolhe uma das duas; a escolha fica no save (`settings.vozPt`, padrão `voz1`). Se a voz escolhida não tiver uma fala, toca a outra; sem as duas, a voz do navegador. Nenhuma das duas precisa de servidor no PC.

Cada mp3 leva nos metadados o comentário da sua voz: `kotoba-voz-1` ou `kotoba-voz-2`. `tests/vozes-pt.test.ts` falha se algum texto faltar em qualquer das vozes, se sobrar arquivo, se um mp3 estiver na pasta errada, ou se aparecer no Git ou em `public/` uma voz de referência (`amigo.wav`, `amigo.txt`), pesos de modelo (`.safetensors`, `.pth`, `.ckpt`, `.bin`) ou o `local/config.local.json`. O `.gitignore` também barra esses nomes.

### Voz 1

Gravada com o motor dos audiobooks (`D:\Estudio\audiobooks\motor`, só leitura) e o modelo do Fish Speech afinado. A gravação de referência e os pesos ficam no PC; só os mp3 entram no site.

```bash
npm run vozes-pt:voz1
```

Passa pela trava da placa (`--vram 11`). Pesos em int8, duas falas por vez (com o autoteste do lote), e o Whisper conferindo cada fala e refazendo até três vezes. Corta o silêncio, deixa em -18 LUFS e grava mp3 mono de 48 kbps em `public/vozes-pt/voz1/`, com o `manifesto.json`. O nome de cada arquivo é o começo do SHA-1 de `referência|texto`. Os caminhos do motor ficam em `local/config.local.json`, seção `voz1` (o arquivo não vai para o Git; `local/config.exemplo.json` mostra os campos vazios). O que o Whisper ouviu fica em `D:\KotobaArcade\voz\trabalho\conferidas-pt-voz1.json`, e uma gravação interrompida continua dali; as dúvidas vão para `duvidas-pt-voz1.json`.

### Voz 2: Kokoro-82M, voz pf_dora

Comparamos seis vozes que podem ser publicadas, todas na CPU, com 12 frases das aulas. O Whisper (large-v3-turbo) transcreveu cada uma, e o UTMOS22 deu uma nota de naturalidade de 1 a 5.

| Voz | Licença | Erro do Whisper | Naturalidade |
| --- | --- | --- | --- |
| Kokoro pf_dora | Apache-2.0 | 2% | 3,79 |
| Kokoro pm_alex | Apache-2.0 | 2% | 3,53 |
| Kokoro pm_santa | Apache-2.0 | 4% | 3,07 |
| Piper faber | CC0 (dados) | 2% | 3,56 |
| Piper cadu | CC0 (dados) | 6% | 3,95 |
| Piper jeff | CC0 (dados) | 9% | 2,36 |

O resto do erro da dora, da faber e do alex era número escrito em algarismo e "quê" sem acento: nenhuma palavra trocada. A cadu soa melhor, mas engoliu "Trezentos ienes" e falou "Isso" de um jeito que o Whisper ouviu "Ivo". Ficou a dora: lê certo e soa natural. Velocidade 0,95.

```bash
npm run vozes-pt:voz2
```

Passa pela trava da placa: o Kokoro roda na CPU e o Whisper que confere roda na placa (na CPU, cada fala levava mais de um minuto de processador). O Python fica em `D:\KotobaArcade\voz\pt-livre\venv` (kokoro, faster-whisper, num2words; `PT_VOZ2_PYTHON` troca). Para cada texto: gera, o Whisper ouve, e se ele ouvir duas palavras ou mais diferentes, gera de novo a 0,9 e a 1,0 e fica a melhor. Corta o silêncio, deixa em -18 LUFS e grava mp3 mono de 48 kbps em `public/vozes-pt/voz2/`. O que o Whisper ouviu fica em `trabalho/conferidas-pt-voz2.json`, e as dúvidas em `trabalho/duvidas-pt-voz2.json`.
