# Vozes

Tudo que os jogos falam e que é sempre igual vem de arquivos gravados em `public/vozes/`: palavras, frases dos kanji, kana, falas da Aventura, frases do Kumitate, abertura e respostas prontas da Conversa. A voz do navegador só aparece no que muda a cada vez (a resposta do modelo na Conversa quando o servidor local está desligado, a frase do Kumitate ainda pela metade).

## Como funciona

- `scripts/falas.ts` lista cada texto que vai para `speak()`, com a voz e a leitura esperada.
- `npm run vozes` grava o que falta e atualiza `public/vozes/manifesto.json` (texto → voz → arquivo). O nome do arquivo é um hash do texto, da voz e do que foi mandado ao motor. Mudou a frase, muda o arquivo; o que sobrar é apagado.
- `speak(texto, voz)` em `src/core/audio.ts` procura o texto no manifesto e toca o mp3. Sem gravação, usa a voz do navegador.
- `tests/vozes.test.ts` falha se algum texto fixo ficar sem áudio. Escreveu uma cena nova, rode `npm run vozes`.

## Gravar de novo

O motor e os modelos ficam fora do repositório, em `D:\KotobaArcade-Voz`:

| Pasta | O que é |
| --- | --- |
| `aivis\Windows-x64` | AivisSpeech Engine 1.2.0 (frases) |
| `venv` | Python do gravador (faster-whisper, pyopenjtalk-plus) |
| `dados\kanjium-accents.txt` | base de acento da Kanjium |
| `trabalho` | lista de falas e relatório da última gravação |

Os modelos de voz ficam onde o AivisSpeech guarda (`%APPDATA%\AivisSpeech-Engine\Models`). O VOICEVOX (palavras e kana) e o Whisper são os mesmos da Conversa por voz, em `D:\KotobaArcade-IA`.

```bash
D:/KotobaArcade-Voz/aivis/Windows-x64/run.exe --use_gpu --port 10101
D:/KotobaArcade-IA/voicevox/run.exe --port 50021
npm run vozes
```

Na primeira vez o motor baixa o modelo de texto (deberta, 650 MB). Se a pasta de cache dele quebrar no Windows, apague `%APPDATA%\AivisSpeech-Engine\BertModelCaches` e rode com `HF_HUB_OFFLINE=1` depois de copiar os arquivos de `D:\KotobaArcade-Voz\bert-onnx` para a pasta do snapshot.

Variáveis: `VOZ_DIR`, `VOZ_PYTHON`, `AIVIS_URL`, `VOICEVOX_URL`. `npm run vozes -- --listar` só escreve a lista de falas. `-- --refazer` grava tudo de novo.

## O que o gravador confere

1. **Leitura.** O motor recebe o texto com kanji, que acerta mais leitura e acento do que o kana solto. Antes, o gravador pergunta como ele lê cada palavra com kanji. A palavra que ele lê errado (日本人 vira ニッポンジン, この間 vira このかん) vai em kana, só ela. A frase inteira em kana erra mais: em せんせいとはなします, o は vira partícula e sai "と わなします".
2. **Acento.** Palavra solta tem o acento conferido na Kanjium. Se o motor errar, o acento é trocado antes de gravar. É assim que はし (ponte) e はし (palitos) saem diferentes.
3. **Ouvido.** O Whisper ouve cada gravação. Se ele não entender a mesma coisa, o gravador tenta de novo com mais silêncio em volta e fica com a melhor. O que continua diferente vai para `trabalho/relatorio.json`. Kana solto não dá para conferir assim: o Whisper não reconhece uma mora sozinha.
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

Uma palavra que não se entende ensina errado, então palavra e kana ficaram com a 四国めたん. O VOICEVOX também aceita o acento marcado e recalcula a altura de cada mora, o que deixa a correção de acento da Kanjium valer de verdade.

Não entraram nas amostras:

- **Irodori-TTS v4.1 (MIT):** instalado em `D:\KotobaArcade-Voz\irodori`, mas a geração foi bloqueada pela permissão da sessão. Não tem como mandar acento, só texto.
- **Fish Speech S2 Pro, GPT-SoVITS, CosyVoice:** clonam voz a partir de uma gravação de referência, então precisariam de uma voz com licença para isso. O Fish Speech tem licença só para pesquisa, sem uso comercial. Nenhum deixa marcar o acento.
- **Áudio humano do Tatoeba:** das nossas 286 frases, só 24 têm gravação lá. A maioria dessas gravações é CC BY-NC-ND ou CC BY-NC, e cada uma tem um falante diferente. Ficaria uma colcha de vozes cobrindo 8% das frases.
