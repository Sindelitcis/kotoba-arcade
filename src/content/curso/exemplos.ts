import { EXEMPLOS_A2 } from './exemplos-a2';

/**
 * Exemplos dos pontos de gramática do A1 (os do A2 ficam em exemplos-a2.ts), feitos só com o que o curso já ensinou até a unidade
 * do ponto (tests/curso-exemplos.test.ts confere peça por peça).
 *
 * Cada frase vem em peças, na ordem. A peça é:
 * - uma palavra do vocabulário (`学生`), com a leitura do curso;
 * - uma forma de palavra do vocabulário, com a base depois de `<` (`食べます=たべます<食べる`);
 *   com kanji, a leitura vem depois de `=`;
 * - um pedaço de gramática em kana (`は`, `です`, `ください`...), da lista `GRAMATICA_EM_KANA`;
 * - um nome de pessoa da lista `NOMES`.
 *
 * As peças também viram o exercício de montar a frase.
 */

export interface ExemploLinha {
  pecas: string[];
  /** Fim da frase: 。 (padrão) ou ？ na fala casual. */
  fim?: '。' | '？';
  pt: string;
}

/** Pedaços de gramática que entram como peça sem estar no vocabulário. */
export const GRAMATICA_EM_KANA: ReadonlySet<string> = new Set([
  '、', 'は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'か', 'や', 'よ', 'ね', 'より',
  'だ', 'です', 'でした', 'じゃありません', 'さん', 'します', 'しています', 'いけません', 'こと', 'ほう',
  'んです', 'なりました', 'でしょう',
  // A2
  'し', 'という', 'って', 'かどうか', 'なら', 'ので', 'のに', 'しか', 'ため', 'ように', 'ございます',
  'でございます', 'かもしれません', 'はず', 'ようです', 'みたい', 'そうです', 'らしい', 'ほど', 'ぐらい',
  'かな', 'まま', 'ところ', 'ばかり', 'までに', 'あいだ', 'うちに', 'とき', 'な',
]);

/** Nomes que podem aparecer nos exemplos (escritos em kana: o kanji deles não é do curso). */
export const NOMES: ReadonlySet<string> = new Set(['ラファエル', 'たなか', 'やまだ']);

const EXEMPLOS_A1: Readonly<Record<string, readonly ExemploLinha[]>> = {
  /* Unidade 1 */
  desu: [
    { pecas: ['わたし', 'は', '学生', 'です'], pt: 'Eu sou estudante.' },
    { pecas: ['ラファエル', 'さん', 'は', 'ブラジル人', 'です'], pt: 'O Rafael é brasileiro.' },
  ],
  wa: [
    { pecas: ['たなか', 'さん', 'は', '先生', 'です'], pt: 'O senhor Tanaka é professor.' },
    { pecas: ['やまだ', 'さん', 'は', '会社員', 'です'], pt: 'A senhora Yamada é funcionária de empresa.' },
  ],
  ka: [
    { pecas: ['たなか', 'さん', 'は', '日本人', 'です', 'か'], pt: 'O senhor Tanaka é japonês?' },
    { pecas: ['何人', 'です', 'か'], pt: 'De que nacionalidade você é?' },
  ],
  no: [
    { pecas: ['わたし', 'の', '名前', 'は', 'ラファエル', 'です'], pt: 'Meu nome é Rafael.' },
    { pecas: ['日本語', 'の', '先生', 'です'], pt: 'É professor de japonês.' },
  ],
  mo: [
    { pecas: ['わたし', 'も', 'ブラジル人', 'です'], pt: 'Eu também sou brasileiro.' },
    { pecas: ['やまだ', 'さん', 'も', '学生', 'です', 'か'], pt: 'A Yamada também é estudante?' },
  ],
  san: [
    { pecas: ['やまだ', 'さん', 'は', '日本人', 'です'], pt: 'A senhora Yamada é japonesa.' },
    { pecas: ['はい', '、', 'ラファエル', 'です'], pt: 'Sim, sou o Rafael. (sem さん: é o próprio nome)' },
  ],

  /* Unidade 2 */
  numeros: [
    { pecas: ['先生', 'は', '四十さい=よんじゅっさい<四', 'です'], pt: 'O professor tem quarenta anos.' },
    { pecas: ['いくつ', 'です', 'か'], pt: 'Quantos são? (também serve para perguntar a idade)' },
  ],
  nansai: [
    { pecas: ['何さい', 'です', 'か'], pt: 'Quantos anos você tem?' },
    { pecas: ['わたし', 'は', '三十さい=さんじゅっさい<三', 'です'], pt: 'Eu tenho trinta anos.' },
  ],

  /* Unidade 3 */
  horas: [
    { pecas: ['今', '、', '何時', 'です', 'か'], pt: 'Que horas são agora?' },
    { pecas: ['午後', '四時', '半', 'です'], pt: 'São quatro e meia da tarde.' },
  ],
  'kara-made': [
    { pecas: ['九時', 'から', '五時=ごじ<五', 'まで', 'です'], pt: 'É das nove às cinco.' },
    { pecas: ['月曜日', 'から', '金曜日', 'まで', 'です'], pt: 'É de segunda a sexta.' },
  ],
  youbi: [
    { pecas: ['きょう', 'は', '何曜日', 'です', 'か'], pt: 'Que dia da semana é hoje?' },
    { pecas: ['あした', 'は', '土曜日', 'です'], pt: 'Amanhã é sábado.' },
  ],

  /* Unidade 4 */
  kosoado: [
    { pecas: ['これ', 'は', 'パン', 'です'], pt: 'Isto é pão.' },
    { pecas: ['それ', 'は', 'おにぎり', 'です', 'か'], pt: 'Isso aí é onigiri?' },
  ],
  'kono-sono': [
    { pecas: ['この', 'パン', 'は', 'いくら', 'です', 'か'], pt: 'Quanto custa este pão?' },
    { pecas: ['あの', 'コンビニ', 'は', '安い', 'です'], pt: 'Aquela konbini é barata.' },
  ],
  ikura: [
    { pecas: ['これ', 'は', 'いくら', 'です', 'か'], pt: 'Quanto custa isto?' },
    { pecas: ['おにぎり', 'は', '百円', 'です'], pt: 'O onigiri custa cem ienes.' },
  ],
  'wo-kudasai': [
    { pecas: ['ふくろ', 'を', 'ください'], pt: 'Uma sacola, por favor.' },
    { pecas: ['すみません', '、', 'レシート', 'を', 'ください'], pt: 'Com licença, a nota fiscal, por favor.' },
  ],

  /* Unidade 5 */
  masu: [
    { pecas: ['わたし', 'は', 'パン', 'を', '食べます=たべます<食べる'], pt: 'Eu como pão.' },
    { pecas: ['毎日', 'コーヒー', 'を', '飲みます=のみます<飲む'], pt: 'Tomo café todo dia.' },
  ],
  wo: [
    { pecas: ['おちゃ', 'を', '飲みます=のみます<飲む'], pt: 'Tomo chá.' },
    { pecas: ['やさい', 'を', '食べます=たべます<食べる'], pt: 'Como verdura.' },
  ],
  'ga-suki': [
    { pecas: ['わたし', 'は', 'さかな', 'が', '好き', 'です'], pt: 'Eu gosto de peixe.' },
    { pecas: ['たまご', 'が', 'きらい', 'です'], pt: 'Não gosto de ovo.' },
  ],
  'to-ya': [
    { pecas: ['あさごはん', 'は', 'パン', 'と', 'コーヒー', 'です'], pt: 'O café da manhã é pão e café.' },
    { pecas: ['にく', 'や', 'さかな', 'を', '食べます=たべます<食べる'], pt: 'Como carne, peixe e outras coisas.' },
  ],

  /* Unidade 6 */
  'masu-negativo-passado': [
    { pecas: ['きのう', 'は', 'べんきょうしませんでした<べんきょうする'], pt: 'Ontem eu não estudei.' },
    { pecas: ['あさごはん', 'を', '食べました=たべました<食べる'], pt: 'Tomei o café da manhã.' },
  ],
  'ni-tempo': [
    { pecas: ['毎日', '六時=ろくじ<六', 'に', 'おきます<おきる'], pt: 'Todo dia eu acordo às seis.' },
    { pecas: ['十時=じゅうじ<十', 'に', 'ねます<ねる'], pt: 'Durmo às dez.' },
  ],
  frequencia: [
    { pecas: ['ときどき', 'コーヒー', 'を', '飲みます=のみます<飲む'], pt: 'Às vezes eu tomo café.' },
    { pecas: ['さかな', 'は', 'あまり', '食べません=たべません<食べる'], pt: 'Não como muito peixe.' },
  ],
  'de-lugar': [
    { pecas: ['うち', 'で', 'べんきょうします<べんきょうする'], pt: 'Estudo em casa.' },
    { pecas: ['いつも', 'うち', 'で', '本', 'を', '読みます=よみます<読む'], pt: 'Sempre leio livros em casa.' },
  ],

  /* Unidade 7 */
  'he-ni-destino': [
    { pecas: ['駅', 'へ', '行きます=いきます<行く'], pt: 'Vou para a estação.' },
    { pecas: ['あした', 'コンビニ', 'に', '行きます=いきます<行く'], pt: 'Amanhã vou à konbini.' },
  ],
  'de-meio': [
    { pecas: ['電車', 'で', '行きます=いきます<行く'], pt: 'Vou de trem.' },
    { pecas: ['バス', 'で', 'うち', 'へ', 'かえります<かえる'], pt: 'Volto para casa de ônibus.' },
  ],
  'iku-kuru-kaeru': [
    { pecas: ['たなか', 'さん', 'は', 'あした', '来ます'], pt: 'O Tanaka vem amanhã.' },
    { pecas: ['九時', 'に', 'うち', 'に', 'かえります<かえる'], pt: 'Volto para casa às nove.' },
  ],

  /* Unidade 8 */
  'aru-iru': [
    { pecas: ['つくえ', 'の', '上', 'に', '本', 'が', 'あります'], pt: 'Tem um livro em cima da mesa.' },
    { pecas: ['いす', 'の', '下', 'に', 'ねこ', 'が', 'います'], pt: 'Tem um gato embaixo da cadeira.' },
  ],
  'ga-sujeito': [
    { pecas: ['あそこ', 'に', 'いぬ', 'が', 'います'], pt: 'Tem um cachorro ali.' },
    { pecas: ['駅', 'の', 'ちかく', 'に', 'コンビニ', 'が', 'あります'], pt: 'Tem uma konbini perto da estação.' },
  ],
  'posicao-no': [
    { pecas: ['かばん', 'の', '中', 'に', 'お金', 'が', 'あります'], pt: 'Tem dinheiro dentro da bolsa.' },
    { pecas: ['駅', 'の', '右', 'に', 'コンビニ', 'が', 'あります'], pt: 'Tem uma konbini à direita da estação.' },
  ],
  doko: [
    { pecas: ['トイレ', 'は', 'どこ', 'です', 'か'], pt: 'Onde fica o banheiro?' },
    { pecas: ['出口', 'は', 'あそこ', 'です'], pt: 'A saída é lá.' },
  ],

  /* Unidade 9 */
  'contador-nin': [
    { pecas: ['かぞく', 'は', '何人=なんにん', 'です', 'か'], pt: 'Quantas pessoas tem na sua família?' },
    { pecas: ['友だち', 'が', '三人', 'います'], pt: 'Tenho três amigos.' },
  ],
  'uchi-soto': [
    { pecas: ['母', 'は', '先生', 'です'], pt: 'Minha mãe é professora.' },
    { pecas: ['たなか', 'さん', 'の', 'お母さん', 'は', '先生', 'です', 'か'], pt: 'A mãe do Tanaka é professora?' },
  ],

  /* Unidade 10 */
  'adj-i': [
    { pecas: ['この', '本', 'は', 'おもしろい', 'です'], pt: 'Este livro é interessante.' },
    { pecas: ['日本語', 'は', 'むずかしい', 'です'], pt: 'Japonês é difícil.' },
  ],
  'adj-na': [
    { pecas: ['この', '駅', 'は', 'しずか', 'です'], pt: 'Esta estação é tranquila.' },
    { pecas: ['たなか', 'さん', 'は', 'ゆうめいな<ゆうめい', '先生', 'です'], pt: 'O Tanaka é um professor famoso.' },
  ],
  'adj-negativo-passado': [
    { pecas: ['この', '車', 'は', '高くない=たかくない<高い', 'です'], pt: 'Este carro não é caro.' },
    { pecas: ['その', '本', 'は', 'おもしろかった<おもしろい', 'です'], pt: 'Esse livro foi interessante.' },
  ],

  /* Unidade 11 */
  'arimasu-ka': [
    { pecas: ['白い=しろい<白', 'シャツ', 'は', 'あります', 'か'], pt: 'Vocês têm camisa branca?' },
    { pecas: ['もうすこし', '大きい', 'サイズ', 'は', 'あります', 'か'], pt: 'Tem um tamanho um pouco maior?' },
  ],
  'ni-shimasu': [
    { pecas: ['これ', 'に', 'します'], pt: 'Vou levar este.' },
    { pecas: ['この', '青い=あおい<青', 'かさ', 'に', 'します'], pt: 'Vou levar este guarda-chuva azul.' },
  ],
  hoshii: [
    { pecas: ['あたらしい', 'くつ', 'が', 'ほしい', 'です'], pt: 'Quero sapatos novos.' },
    { pecas: ['黒い=くろい<黒', 'かばん', 'が', 'ほしい', 'です'], pt: 'Quero uma bolsa preta.' },
  ],

  /* Unidade 12 */
  masenka: [
    { pecas: ['いっしょに', 'えいが', 'を', '見ません=みません<見る', 'か'], pt: 'Não quer ver um filme comigo?' },
    { pecas: ['あした', '、', 'コーヒー', 'を', '飲みません=のみません<飲む', 'か'], pt: 'Vamos tomar um café amanhã?' },
  ],
  mashou: [
    { pecas: ['いっしょに', '行きましょう=いきましょう<行く'], pt: 'Vamos juntos.' },
    { pecas: ['土曜日', 'に', 'えいが', 'を', '見ましょう=みましょう<見る'], pt: 'Vamos ver um filme no sábado.' },
  ],
  tai: [
    { pecas: ['日本', 'に', '行きたい=いきたい<行く', 'です'], pt: 'Quero ir ao Japão.' },
    { pecas: ['おにぎり', 'が', '食べたい=たべたい<食べる', 'です'], pt: 'Quero comer onigiri.' },
  ],
  datas: [
    { pecas: ['きょう', 'は', '何月', '何日', 'です', 'か'], pt: 'Que dia é hoje (mês e dia)?' },
    { pecas: ['来月', 'は', '四月', 'です'], pt: 'Mês que vem é abril.' },
  ],

  /* Unidade 13 */
  'te-forma': [
    { pecas: ['ごはん', 'を', '食べて=たべて<食べる', '、', 'ねます<ねる'], pt: 'Janto e vou dormir.' },
    { pecas: ['うち', 'に', 'かえって<かえる', '、', '本', 'を', '読みます=よみます<読む'], pt: 'Volto para casa e leio um livro.' },
  ],
  'te-kudasai': [
    { pecas: ['ゆっくり', '話して=はなして<話す', 'ください'], pt: 'Fale devagar, por favor.' },
    { pecas: ['もう一度', '言って=いって<言う', 'ください'], pt: 'Diga mais uma vez, por favor.' },
  ],
  'naide-kudasai': [
    { pecas: ['ここ', 'に', 'すわらないで<すわる', 'ください'], pt: 'Não sente aqui, por favor.' },
    { pecas: ['けさないで<けす', 'ください'], pt: 'Não desligue, por favor.' },
  ],

  /* Unidade 14 */
  'te-imasu': [
    { pecas: ['今', '、', '本', 'を', '読んでいます=よんでいます<読む'], pt: 'Agora estou lendo um livro.' },
    { pecas: ['コンビニ', 'で', 'アルバイト', 'を', 'しています'], pt: 'Trabalho meio período numa konbini.' },
  ],

  /* Unidade 15 */
  'temo-ii': [
    { pecas: ['しゃしん', 'を', 'とっても<とる', 'いい', 'です', 'か'], pt: 'Posso tirar foto?' },
    { pecas: ['ここ', 'に', 'すわっても<すわる', 'いい', 'です', 'か'], pt: 'Posso sentar aqui?' },
  ],
  'tewa-ikenai': [
    { pecas: ['ここ', 'で', 'たばこ', 'を', 'すっては<すう', 'いけません'], pt: 'Aqui não se pode fumar.' },
    { pecas: ['おんせん', 'で', 'しゃしん', 'を', 'とっては<とる', 'いけません'], pt: 'No onsen não se pode tirar foto.' },
  ],

  /* Unidade 16 */
  'jisho-kei': [
    { pecas: ['あした', '、', 'えいが', 'を', '見る'], pt: 'Amanhã vou ver um filme. (fala casual)' },
    { pecas: ['毎日', '日本語', 'を', 'べんきょうする'], pt: 'Estudo japonês todo dia. (fala casual)' },
  ],
  'nai-kei': [
    { pecas: ['きょう', 'は', 'コーヒー', 'を', '飲まない=のまない<飲む'], pt: 'Hoje não vou tomar café.' },
    { pecas: ['あした', 'は', '行かない=いかない<行く'], pt: 'Amanhã não vou.' },
  ],
  casual: [
    { pecas: ['この', 'えいが', '、', 'おもしろい'], fim: '？', pt: 'Esse filme é bom? (entre amigos)' },
    { pecas: ['うん', '、', 'たのしい'], pt: 'É, é divertido.' },
  ],
  'yo-ne': [
    { pecas: ['この', 'パン', '、', 'おいしい', 'ね'], pt: 'Este pão é gostoso, né?' },
    { pecas: ['あした', 'は', '休み', 'だ', 'よ'], pt: 'Amanhã é folga, viu?' },
  ],
  'ga-contraste': [
    { pecas: ['日本語', 'は', 'むずかしい', 'です', 'が', '、', 'おもしろい', 'です'], pt: 'Japonês é difícil, mas é interessante.' },
    { pecas: ['高い', 'です', 'が', '、', 'おいしい', 'です'], pt: 'É caro, mas é gostoso.' },
  ],

  /* Unidade 17 */
  'ta-kei': [
    { pecas: ['きのう', '、', 'えいが', 'を', '見た=みた<見る'], pt: 'Ontem eu vi um filme.' },
    { pecas: ['きょねん', '、', '日本', 'に', '行った=いった<行く'], pt: 'Ano passado eu fui ao Japão.' },
  ],
  'ta-koto-ga-aru': [
    { pecas: ['おんせん', 'に', '入った=はいった<入る', 'こと', 'が', 'あります'], pt: 'Já entrei num onsen.' },
    { pecas: ['日本', 'に', '行った=いった<行く', 'こと', 'が', 'あります', 'か'], pt: 'Você já foi ao Japão?' },
  ],
  'mae-ni-ato-de': [
    { pecas: ['ねる', 'まえに', '本', 'を', '読みます=よみます<読む'], pt: 'Antes de dormir, leio um livro.' },
    { pecas: ['ごはん', 'を', '食べた=たべた<食べる', 'あとで', '、', 'べんきょうします<べんきょうする'], pt: 'Depois de comer, estudo.' },
  ],
  'te-kara': [
    { pecas: ['うち', 'に', 'かえって<かえる', 'から', '、', 'ごはん', 'を', '食べます=たべます<食べる'], pt: 'Depois de voltar para casa, janto.' },
    { pecas: ['コーヒー', 'を', '飲んで=のんで<飲む', 'から', '、', '仕事', 'を', 'します'], pt: 'Depois de tomar café, trabalho.' },
  ],
  'mada-mou': [
    { pecas: ['もう', 'ごはん', 'を', '食べました=たべました<食べる', 'か'], pt: 'Você já comeu?' },
    { pecas: ['いいえ', '、', 'まだ', 'です'], pt: 'Não, ainda não.' },
  ],

  /* Unidade 18 */
  'hou-ga-ii': [
    { pecas: ['薬', 'を', '飲んだ=のんだ<飲む', 'ほう', 'が', 'いい', 'です'], pt: 'É melhor tomar o remédio.' },
    { pecas: ['びょういん', 'に', '行った=いった<行く', 'ほう', 'が', 'いい', 'です', 'よ'], pt: 'É melhor ir ao hospital, viu?' },
  ],
  ndesu: [
    { pecas: ['あたま', 'が', 'いたい', 'んです'], pt: 'É que estou com dor de cabeça.' },
    { pecas: ['ねつ', 'が', 'ある<あります', 'んです'], pt: 'É que estou com febre.' },
  ],
  'kara-motivo': [
    { pecas: ['ねつ', 'が', 'あります', 'から', '、', '学校', 'に', '行きません=いきません<行く'], pt: 'Como estou com febre, não vou à escola.' },
    { pecas: ['かぜ', 'です', 'から', '、', 'うち', 'に', 'かえります<かえる'], pt: 'Como estou resfriado, vou para casa.' },
  ],

  /* Unidade 19 */
  deshou: [
    { pecas: ['あした', 'は', '雨', 'でしょう'], pt: 'Amanhã provavelmente vai chover.' },
    { pecas: ['あした', 'は', 'さむい', 'でしょう'], pt: 'Amanhã provavelmente vai fazer frio.' },
  ],
  'yori-hikaku': [
    { pecas: ['なつ', 'は', 'ふゆ', 'より', 'あつい', 'です'], pt: 'O verão é mais quente que o inverno.' },
    { pecas: ['バス', 'より', '電車', 'の', 'ほう', 'が', '安い', 'です'], pt: 'O trem é mais barato que o ônibus.' },
  ],
  ichiban: [
    { pecas: ['あき', 'が', '一番', '好き', 'です'], pt: 'O outono é a estação de que mais gosto.' },
    { pecas: ['かぞく', 'の', '中', 'で', '、', '母', 'が', '一番', 'やさしい', 'です'], pt: 'Na família, minha mãe é a mais gentil.' },
  ],
  'ku-naru': [
    { pecas: ['さむく<さむい', 'なりました', 'ね'], pt: 'Esfriou, né?' },
    { pecas: ['はる', 'に', 'なりました'], pt: 'Chegou a primavera.' },
  ],
};

export const EXEMPLOS: Readonly<Record<string, readonly ExemploLinha[]>> = { ...EXEMPLOS_A1, ...EXEMPLOS_A2 };
