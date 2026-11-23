import { AULAS_A2 } from './aulas-a2';

/**
 * A aula falada de cada unidade (docs/curso.md, "A lição"): quadros curtos que o professor fala
 * na Voz 1, com o exemplo em japonês na voz japonesa. A pessoa passa de quadro com Enter.
 *
 * - `fala`: o que o professor diz, em português. A palavra japonesa no meio vai entre chaves,
 *   `{です}` ou `{食べます|たべます}` com kanji: ela é dita pela voz japonesa e aparece em japonês na
 *   tela. A Voz 1 nunca lê japonês nem romaji (ela pronuncia errado).
 * - `tela`: um complemento escrito, que pode ter japonês (ganha furigana na tela).
 * - `ex`: o ponto de gramática cujo primeiro exemplo (content/curso/exemplos.ts) toca depois da
 *   fala, com uma pausa para repetir.
 *
 * Só regra de língua aqui. Costume e história ficam nas notas culturais, que têm fonte.
 */

export interface QuadroAula {
  fala: string;
  tela?: string;
  ex?: string;
}

const AULAS_A1: Readonly<Record<string, readonly QuadroAula[]>> = {
  'a1-01': [
    { fala: 'Primeira unidade. O objetivo é se apresentar: dizer o nome, de onde você é e o que faz. Para isso, uma frase só já resolve quase tudo.' },
    { fala: 'A frase base do japonês é: o assunto, a partícula do assunto, a informação e, no fim, {です}, que fecha a frase com educação. É como dizer: quanto a mim, estudante, sou.', tela: 'A は B です。 → "Quanto a A, é B."', ex: 'desu' },
    { fala: 'A partícula do assunto se escreve com a letra {は}, mas se fala {わ}. É uma exceção antiga da escrita, e vale sempre que ela é partícula.', tela: 'は como partícula soa わ.', ex: 'wa' },
    { fala: 'Para perguntar, a ordem das palavras não muda: só entra {か} no fim. No japonês escrito com cuidado, a pergunta termina com ponto final, e não com ponto de interrogação.', tela: '〜ですか。', ex: 'ka' },
    { fala: 'A partícula {の} liga duas palavras, como o nosso de. Mas a ordem é a contrária: primeiro o dono, depois a coisa. Meu nome fica assim: {わたしのなまえ}.', tela: 'わたしの名前 = "o nome de mim" = meu nome.', ex: 'no' },
    { fala: 'A partícula {も} quer dizer também. Ela entra no lugar da partícula do assunto, e não junto com ela.', tela: 'わたしは → わたしも', ex: 'mo' },
    { fala: 'E {さん} vai depois do nome dos outros, nunca do seu. Serve para homem e mulher, e é o jeito normal de chamar alguém.', ex: 'san' },
  ],
  'a1-02': [
    { fala: 'Unidade dois: números. Com eles você diz a idade, o telefone e, mais adiante, preços e horas.' },
    { fala: 'Os números japoneses são montados como peças. Onze é dez e um. Vinte é dois e dez. Quarenta e cinco é quatro, dez, cinco. Sabendo de um a dez, você chega a noventa e nove.', tela: '十一 = 11 · 二十 = 20 · 四十五 = 45', ex: 'numeros' },
    { fala: 'Alguns números têm duas leituras. O quatro pode ser {よん}, ou então {し}. O sete, {なな}, ou então {しち}. O nove, {きゅう}, ou então {く}. Na dúvida, use a primeira de cada par, que é a que menos confunde.', tela: '四 よん / し · 七 なな / しち · 九 きゅう / く' },
    { fala: 'Para a idade, o número ganha {さい} no fim. Para perguntar a idade, diga {なんさいですか}, ou, com mais cuidado, {おいくつですか}.', tela: '何さいですか。 · おいくつですか。', ex: 'nansai' },
  ],
  'a1-03': [
    { fala: 'Unidade três: horas e dias. Aqui aparece a primeira grande troca de leitura: o mesmo kanji lido de jeitos diferentes conforme a palavra.' },
    { fala: 'A hora é o número com {じ} no fim. O minuto é {ふん}, ou então {ぷん}, conforme o número, e a meia hora é {はん}. Antes do meio-dia é {ごぜん}, depois é {ごご}.', tela: '午後四時半 = quatro e meia da tarde', ex: 'horas' },
    { fala: 'A palavra {から} quer dizer a partir de. A palavra {まで} quer dizer até. Servem para horário, para dias e, mais tarde, para lugares.', ex: 'kara-made' },
    { fala: 'Os dias da semana são todos dia de alguma coisa: da lua, do fogo, da água, da árvore, do metal, da terra e do sol. Sexta-feira é o dia do metal, e por isso o kanji do dinheiro aparece ali, lido {きん}.', tela: '月 火 水 木 金 土 日 + 曜日', ex: 'youbi' },
  ],
  'a1-04': [
    { fala: 'Unidade quatro: comprar na loja de conveniência. Você vai apontar para as coisas, perguntar o preço e pedir.' },
    { fala: 'A palavra {これ} é isto, perto de quem fala. {それ} é isso, perto de quem ouve. {あれ} é aquilo, longe dos dois. E {どれ} é qual. São quatro palavras da mesma família.', tela: 'これ・それ・あれ・どれ', ex: 'kosoado' },
    { fala: 'Quando vem uma coisa logo depois, a palavra muda: {この}, {その}, {あの}, {どの}. A primeira família fica sozinha. A segunda sempre vem colada numa coisa.', tela: 'これ は… / この パン は…', ex: 'kono-sono' },
    { fala: 'Para perguntar o preço: {いくらですか}. A resposta vem em ienes, com {えん} depois do número.', ex: 'ikura' },
    { fala: 'E para pedir: a coisa, a partícula {を}, e {ください}. É educado e serve em qualquer loja.', tela: '〜をください。 (を soa お)', ex: 'wo-kudasai' },
  ],
  'a1-05': [
    { fala: 'Unidade cinco: comida e bebida. Agora entram os verbos, e com eles a frase ganha ação.' },
    { fala: 'O verbo aparece no dicionário numa forma, e na conversa educada em outra, que termina em {ます}. Comer vira {たべます}. Beber vira {のみます}. Por enquanto, use sempre essa forma.', tela: '食べる → 食べます · 飲む → 飲みます', ex: 'masu' },
    { fala: 'O verbo vai sempre no fim da frase. A coisa que você come ou bebe ganha a partícula {を}, que tem uma letra própria só para esse papel.', tela: 'X を 食べます。', ex: 'wo' },
    { fala: 'Para dizer que gosta, a coisa de que você gosta vem com {が}, e depois {すきです}. Essa palavra não é verbo: funciona como um adjetivo.', tela: 'さかな が 好きです。', ex: 'ga-suki' },
    { fala: 'A partícula {と} junta coisas numa lista completa: pão e café, só isso. A partícula {や} dá exemplos e deixa a lista aberta: carne, peixe e outras coisas.', ex: 'to-ya' },
  ],
  'a1-06': [
    { fala: 'Unidade seis: a rotina. Você vai dizer o que faz, o que não faz e o que já fez.' },
    { fala: 'A forma educada do verbo tem quatro pontas. {ます}: faço. {ません}: não faço. {ました}: fiz. {ませんでした}: não fiz. O começo do verbo não muda.', tela: '食べます · 食べません · 食べました · 食べませんでした', ex: 'masu-negativo-passado' },
    { fala: 'A partícula {に} marca o momento exato: às seis, no domingo. Palavras como hoje, amanhã e todo dia não levam essa partícula.', tela: '六時に ✓ · 毎日 (sem に)', ex: 'ni-tempo' },
    { fala: 'Palavras de frequência vão antes do verbo. Atenção: {あまり} e {ぜんぜん} só aparecem com o verbo no negativo. A primeira é não muito, a segunda é nada.', ex: 'frequencia' },
    { fala: 'A partícula {で} marca onde a ação acontece: em casa, na escola, na loja.', tela: 'うち で べんきょうします。', ex: 'de-lugar' },
  ],
  'a1-07': [
    { fala: 'Unidade sete: trem e estação. É a unidade de quem vai se virar sozinho no transporte.' },
    { fala: 'Para dizer para onde vai, use {へ}, ou então {に} depois do lugar. As duas servem. A primeira se escreve com a letra {へ}, mas, como partícula, soa {え}.', tela: '駅へ (へ soa え) · 駅に', ex: 'he-ni-destino' },
    { fala: 'A partícula {で}, que já marcava o lugar da ação, também marca o meio: de trem, de ônibus, de carro.', ex: 'de-meio' },
    { fala: 'Três verbos de movimento: {いく}, ir. {くる}, vir. {かえる}, voltar para casa. Este último é voltar para o lugar a que você pertence: a sua casa, o seu país.', ex: 'iku-kuru-kaeru' },
  ],
  'a1-08': [
    { fala: 'Unidade oito: onde fica. Você vai perguntar por lugares e coisas, e entender a resposta.' },
    { fala: 'Para dizer que algo existe ou está em algum lugar, o japonês tem dois verbos. {あります} é para coisas e plantas. {います} é para pessoas e animais, tudo o que se mexe sozinho.', tela: '本が あります · ねこが います', ex: 'aru-iru' },
    { fala: 'Nessas frases, o que existe ganha {が}, e não a partícula do assunto. Ela aponta algo novo, que você acabou de notar.', ex: 'ga-sujeito' },
    { fala: 'A posição se diz com {の}: em cima da mesa vira {つくえのうえ}. Depois vem {に}, para marcar o lugar onde a coisa está.', tela: 'つくえ の 上 に…', ex: 'posicao-no' },
    { fala: 'Aqui é {ここ}, aí é {そこ}, lá é {あそこ} e onde é {どこ}. É a mesma família do isto e do isso, agora para lugares.', ex: 'doko' },
  ],
  'a1-09': [
    { fala: 'Unidade nove: a família. Aqui o japonês faz uma coisa que o português não faz: tem palavras diferentes para a sua família e para a família dos outros.' },
    { fala: 'Para contar pessoas, um e dois são especiais: {ひとり} e {ふたり}. Do três em diante é o número com {にん}.', tela: '一人 ひとり · 二人 ふたり · 三人 さんにん', ex: 'contador-nin' },
    { fala: 'Falando da sua mãe para alguém de fora, você diz {はは}. Falando da mãe de outra pessoa, ou chamando a sua, diz {おかあさん}. Com o pai é igual: {ちち} e {おとうさん}.', tela: '母 (a minha) · お母さん (a dos outros)', ex: 'uchi-soto' },
  ],
  'a1-10': [
    { fala: 'Unidade dez: descrever as coisas. Os adjetivos japoneses são de dois tipos, e cada um muda de um jeito.' },
    { fala: 'O primeiro tipo termina em {い}, como {たかい}, caro, e {おいしい}, gostoso. Ele vai direto antes da coisa, ou no fim da frase, com {です}.', tela: '高い パン · パンは 高いです。', ex: 'adj-i' },
    { fala: 'O segundo tipo precisa de {な} para ficar antes da coisa. No fim da frase, fica sem ele: {しずかです}.', tela: 'ゆうめいな 先生 · 先生は ゆうめいです。', ex: 'adj-na' },
    { fala: 'O adjetivo do primeiro tipo muda a própria ponta: caro vira {たかくない}, não é caro, e {たかかった}, era caro. O do segundo tipo não muda: quem muda é o final da frase.', tela: '高くないです · 高かったです · しずかじゃありません', ex: 'adj-negativo-passado' },
    { fala: 'Uma exceção que todo mundo usa: {いい}, bom, vira {よくない} e {よかった}. A raiz antiga da palavra é {よい}.', tela: 'いい → よくない · よかった' },
  ],
  'a1-11': [
    { fala: 'Unidade onze: comprar roupa. Você vai perguntar se tem, escolher e dizer o que quer.' },
    { fala: 'Para perguntar se a loja tem algo: a coisa, a partícula do assunto e {ありますか}. É a mesma existência da unidade oito, agora como pergunta.', ex: 'arimasu-ka' },
    { fala: 'Com {にします}, você decide: fico com este. É o que se diz no caixa ou no restaurante, apontando.', ex: 'ni-shimasu' },
    { fala: 'A palavra {ほしい} é querer uma coisa. A coisa vem com {が}. Para querer fazer algo, a forma é outra, que vem na próxima unidade.', ex: 'hoshii' },
  ],
  'a1-12': [
    { fala: 'Unidade doze: convidar e combinar. Você vai chamar alguém para sair e marcar o dia.' },
    { fala: 'O convite mais educado é uma pergunta no negativo: não quer ver um filme? É a ponta {ませんか}. Soa gentil porque deixa a pessoa livre para recusar.', tela: '見ませんか。', ex: 'masenka' },
    { fala: 'A ponta {ましょう} quer dizer vamos. Serve para aceitar um convite ou para propor junto.', ex: 'mashou' },
    { fala: 'Para dizer que quer fazer algo, troque {ます} pela ponta {たい}: {いきます} vira {いきたい}. Essa forma funciona como adjetivo do primeiro tipo, então leva {です} no fim.', tela: '行きます → 行きたいです', ex: 'tai' },
    { fala: 'Os meses são o número com {がつ}: janeiro é {いちがつ}, abril é {しがつ}. Os dias do mês têm leituras especiais nos dez primeiros, que vão aparecer com calma.', ex: 'datas' },
  ],
  'a1-13': [
    { fala: 'Unidade treze: pedir algo. Aqui entra a forma te, a mais importante do japonês básico, porque ela abre muitas outras.' },
    { fala: 'A forma te liga ações em sequência: faço isto e depois aquilo. Cada grupo de verbo forma de um jeito. Os da família de comer só trocam a ponta: {たべる} vira {たべて}.', tela: '食べる → 食べて · かえる → かえって', ex: 'te-forma' },
    { fala: 'A forma te mais {ください} é um pedido educado: faça, por favor.', tela: '話す → 話して ください', ex: 'te-kudasai' },
    { fala: 'Para pedir que não faça, use a forma do não, mais {でください}.', tela: 'すわる → すわらないで ください', ex: 'naide-kudasai' },
  ],
  'a1-14': [
    { fala: 'Unidade catorze: o que estou fazendo. Com uma peça nova, você diz o que está acontecendo agora e como as coisas estão.' },
    { fala: 'A forma te mais {います} é estar fazendo: estou lendo. A mesma forma também diz um estado que continua: moro em, sei, sou casado. Por isso, morar quase sempre aparece como {すんでいます}.', tela: '読んでいます · すんでいます · けっこんしています', ex: 'te-imasu' },
  ],
  'a1-15': [
    { fala: 'Unidade quinze: regras. Placas, avisos e o que se pode ou não fazer.' },
    { fala: 'Para pedir permissão: a forma te, mais {もいいですか}. Ao pé da letra: mesmo fazendo, está bom?', tela: 'とっても いいですか。', ex: 'temo-ii' },
    { fala: 'Para proibir: a forma te, mais {はいけません}. É o que aparece em regra e aviso. Na conversa, quem recusa um pedido costuma ser mais suave.', tela: 'すっては いけません。', ex: 'tewa-ikenai' },
  ],
  'a1-16': [
    { fala: 'Unidade dezesseis: falar com amigos. Até aqui, tudo foi na forma educada. Entre amigos, o japonês usa formas mais curtas.' },
    { fala: 'A forma do dicionário é também o presente da fala casual. {たべる} quer dizer comer e também eu como, entre amigos.', ex: 'jisho-kei' },
    { fala: 'A forma do não, como {のまない}, é o não da fala casual. Ela também serve de base para outras formas, como o não faça da unidade treze.', tela: '飲む → 飲まない · 行く → 行かない', ex: 'nai-kei' },
    { fala: 'Na fala casual, {です} some ou vira {だ}, e a pergunta muitas vezes perde o {か}: basta subir a voz no fim.', ex: 'casual' },
    { fala: 'As pontas {よ} e {ね} mudam o tom da frase. A segunda pede concordância: né? A primeira traz uma informação nova: viu, fica sabendo.', ex: 'yo-ne' },
    { fala: 'A partícula {が}, depois de uma frase inteira, quer dizer mas. É diferente da que marca o sujeito.', ex: 'ga-contraste' },
  ],
  'a1-17': [
    { fala: 'Unidade dezessete: experiências. Você vai contar o que fez e o que já fez alguma vez na vida.' },
    { fala: 'A forma ta é o passado da fala casual. Ela se forma como a forma te, só trocando a última vogal: {みて} vira {みた}.', tela: '見て → 見た · 行って → 行った', ex: 'ta-kei' },
    { fala: 'A forma ta, mais {ことがあります}, é já fiz alguma vez. A frase diz, ao pé da letra: existe o fato de eu ter feito.', ex: 'ta-koto-ga-aru' },
    { fala: 'Antes de é {まえに}, e vem depois da forma do dicionário. Depois de é {あとで}, e vem depois da forma ta.', tela: 'ねる まえに · 食べた あとで', ex: 'mae-ni-ato-de' },
    { fala: 'A forma te, mais {から}, também é depois de, com a ideia de uma coisa só depois que a outra terminou.', ex: 'te-kara' },
    { fala: 'Já é {もう}. Ainda é {まだ}. Para responder que ainda não fez, basta dizer {まだです}.', ex: 'mada-mou' },
  ],
  'a1-18': [
    { fala: 'Unidade dezoito: ir ao médico. Você vai dizer o que sente e entender um conselho.' },
    { fala: 'Para aconselhar: o verbo no passado casual, como {のんだ}, mais {ほうがいいです}. É melhor fazer isso. Repare que o conselho usa a forma do passado, mesmo falando do futuro.', ex: 'hou-ga-ii' },
    { fala: 'A ponta {んです}, no fim da frase, explica a situação. É o que você diz ao chegar no médico: é que estou com dor de cabeça. Soa mais natural do que a frase seca.', ex: 'ndesu' },
    { fala: 'A palavra {から}, depois de uma frase, quer dizer porque. Primeiro vem o motivo, depois o resultado: como estou com febre, não vou.', ex: 'kara-motivo' },
  ],
  'a1-19': [
    { fala: 'Unidade dezenove: tempo e estações. É a última com conteúdo novo deste nível.' },
    { fala: 'A ponta {でしょう} quer dizer provavelmente. É o que se ouve na previsão do tempo.', ex: 'deshou' },
    { fala: 'Para comparar, {より} marca com o que você compara: o verão é, em relação ao inverno, mais quente. Quando as duas coisas estão em jogo, a escolhida ganha {のほうが}.', tela: 'なつは ふゆより あつい · バスより 電車のほうが 安い', ex: 'yori-hikaku' },
    { fala: 'A palavra {いちばん} é o número um, o mais. Vem antes do adjetivo ou do gostar.', ex: 'ichiban' },
    { fala: 'Para dizer que algo ficou de outro jeito, o adjetivo do primeiro tipo troca a ponta e ganha {なる}: frio vira {さむくなる}. Com substantivo, é {になる}.', tela: 'さむい → さむくなりました · はるになりました', ex: 'ku-naru' },
  ],
};

export const AULAS_DO_CURSO: Readonly<Record<string, readonly QuadroAula[]>> = { ...AULAS_A1, ...AULAS_A2 };
