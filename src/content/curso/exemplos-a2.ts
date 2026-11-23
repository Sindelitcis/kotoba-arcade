/**
 * Exemplos dos pontos de gramática do A2 (N4), na mesma notação e com as mesmas regras dos do A1
 * (exemplos.ts): só o que o curso ensinou até a unidade do ponto.
 */
import type { ExemploLinha } from './exemplos';

export const EXEMPLOS_A2: Readonly<Record<string, readonly ExemploLinha[]>> = {
  /* Unidade 1 */
  ikou: [
    { pecas: ['いっしょに', '旅行しよう=りょこうしよう<旅行する'], pt: 'Vamos viajar juntos.' },
    { pecas: ['もう', 'ねよう<ねる'], pt: 'Vamos dormir, já está na hora.' },
  ],
  'to-omou': [
    { pecas: ['なつ休み', 'に', '日本', 'へ', '行こう=いこう<行く', 'と', '思います=おもいます<思う'], pt: 'Penso em ir ao Japão nas férias de verão.' },
    { pecas: ['来年', '、', 'ワーキングホリデー', 'の', 'ビザ', 'を', 'とろう<とる', 'と', '思っています=おもっています<思う'], pt: 'Estou pensando em tirar o visto de working holiday no ano que vem.' },
  ],
  tsumori: [
    { pecas: ['日本', 'で', 'はたらく', 'つもり', 'です'], pt: 'Pretendo trabalhar no Japão.' },
    { pecas: ['ことし', 'は', 'たばこ', 'を', 'すわない<すう', 'つもり', 'です'], pt: 'Este ano, pretendo não fumar.' },
  ],
  yotei: [
    { pecas: ['ひこうき', 'は', '四時', 'に', '着く', 'よてい', 'です'], pt: 'O avião está programado para chegar às quatro.' },
    { pecas: ['あさって', 'の', 'あさ', 'に', '出発する', 'よてい', 'です'], pt: 'A partida está marcada para depois de amanhã de manhã.' },
  ],

  /* Unidade 2 */
  sugiru: [
    { pecas: ['この', 'へや', 'は', '高すぎます=たかすぎます<高い'], pt: 'Este apartamento é caro demais.' },
    { pecas: ['きのう', '、', '食べすぎました=たべすぎました<食べる'], pt: 'Ontem comi demais.' },
  ],
  'yasui-nikui': [
    { pecas: ['この', 'ペン', 'は', '書きやすい=かきやすい<書く', 'です'], pt: 'Esta caneta é boa de escrever.' },
    { pecas: ['この', 'かんじ', 'は', 'おぼえにくい<おぼえる', 'です'], pt: 'Este kanji é difícil de decorar.' },
  ],
  'sou-aparencia': [
    { pecas: ['この', 'りょうり', 'は', 'おいしそう<おいしい', 'です', 'ね'], pt: 'Esta comida parece gostosa, hein.' },
    { pecas: ['あの', '家', 'は', '広そう=ひろそう<広い', 'です'], pt: 'Aquela casa parece espaçosa.' },
  ],
  shi: [
    { pecas: ['この', 'へや', 'は', '広い', 'し', '、', '明るい', 'です'], pt: 'Este apartamento é espaçoso e ainda é claro.' },
    { pecas: ['駅', 'に', '近い', 'し', '、', 'やちん', 'も', '安い', 'です'], pt: 'Fica perto da estação, e o aluguel também é barato.' },
  ],

  /* Unidade 3 */
  'ageru-kureru-morau': [
    { pecas: ['わたし', 'は', 'たなか', 'さん', 'に', 'はな', 'を', 'あげました<あげる'], pt: 'Eu dei flores para o Tanaka.' },
    { pecas: ['友だち', 'が', 'わたし', 'に', '本', 'を', 'くれました<くれる'], pt: 'Um amigo me deu um livro.' },
    { pecas: ['やまだ', 'さん', 'に', 'かさ', 'を', 'もらいました<もらう'], pt: 'Ganhei um guarda-chuva da Yamada.' },
  ],
  'te-ageru': [
    { pecas: ['にもつ', 'を', '持って=もって<持つ', 'あげます<あげる'], pt: 'Eu carrego a bagagem para você.' },
    { pecas: ['となり', 'の', '人', 'が', 'かぐ', 'を', '運んで=はこんで<運ぶ', 'くれました<くれる'], pt: 'O vizinho carregou os móveis para mim.' },
    { pecas: ['友だち', 'に', 'せんたくき', 'を', 'しゅうりして<しゅうりする', 'もらいました<もらう'], pt: 'Um amigo consertou a máquina de lavar para mim.' },
  ],
  'te-oku': [
    { pecas: ['ひっこし', 'の', 'まえに', 'ダンボール', 'を', 'かって<かう', 'おきます<おく'], pt: 'Antes da mudança, vou deixar as caixas de papelão compradas.' },
    { pecas: ['まど', 'を', '開けて=あけて<開ける', 'おいて<おく', 'ください'], pt: 'Deixe a janela aberta, por favor.' },
  ],
  'te-aru': [
    { pecas: ['ドア', 'に', '名前', 'が', '書いて=かいて<書く', 'あります'], pt: 'O nome está escrito na porta.' },
    { pecas: ['テーブル', 'に', 'おさら', 'が', 'ならべて<ならべる', 'あります'], pt: 'Os pratos já estão arrumados na mesa.' },
  ],

  /* Unidade 4 */
  kanoukei: [
    { pecas: ['日本語', 'が', '少し', '話せます=はなせます<話す'], pt: 'Consigo falar um pouco de japonês.' },
    { pecas: ['ここ', 'で', '写真', 'は', 'とれません<とる'], pt: 'Aqui não dá para tirar foto.' },
  ],
  'koto-ga-dekiru': [
    { pecas: ['この', 'まどぐち', 'で', 'じゅうしょ', 'の', 'とどけ', 'を', '出す', 'こと', 'が', 'できます<できる'], pt: 'Neste guichê dá para entregar o registro de endereço.' },
    { pecas: ['コンビニ', 'で', 'しょるい', 'を', 'もらう', 'こと', 'が', 'できます<できる'], pt: 'Dá para pegar documentos na konbini.' },
  ],
  'to-iu': [
    { pecas: ['これ', 'は', 'ざいりゅうカード', 'という', 'カード', 'です'], pt: 'Este é um cartão chamado zairyū card.' },
    { pecas: ['たなか', 'という', '人', 'を', 'しっています'], pt: 'Conheço uma pessoa chamada Tanaka.' },
  ],
  'ka-dou-ka': [
    { pecas: ['はんこ', 'が', 'ひつよう', 'かどうか', '分かりません=わかりません<分かる'], pt: 'Não sei se precisa de carimbo.' },
    { pecas: ['あした', 'やくしょ', 'が', 'あく', 'かどうか', 'しらべます<しらべる'], pt: 'Vou ver se a repartição abre amanhã.' },
  ],
  'pergunta-dentro': [
    { pecas: ['どこ', 'に', 'ならぶ', 'か', '分かりません=わかりません<分かる'], pt: 'Não sei onde fazer a fila.' },
    { pecas: ['何時', 'に', 'おわる', 'か', '聞いて=きいて<聞く', 'ください'], pt: 'Pergunte a que horas termina.' },
  ],

  /* Unidade 5 */
  tara: [
    { pecas: ['駅', 'に', '着いたら=ついたら<着く', '、', '電話', 'して<する', 'ください'], pt: 'Quando chegar à estação, me ligue.' },
    { pecas: ['お金', 'が', 'あったら<あります', '、', '旅行したい=りょこうしたい<旅行する', 'です'], pt: 'Se eu tivesse dinheiro, queria viajar.' },
  ],
  ba: [
    { pecas: ['この', 'ボタン', 'を', 'おせば<おす', '、', 'ドア', 'が', '開きます=あきます<あく'], pt: 'Se apertar este botão, a porta abre.' },
    { pecas: ['キャッシュカード', 'が', 'あれば<あります', '、', 'お金', 'を', 'おろせます<おろす'], pt: 'Com o cartão do banco, dá para sacar dinheiro.' },
  ],
  'to-condicao': [
    { pecas: ['右', 'に', 'まがる', 'と', '、', '銀行', 'が', 'あります'], pt: 'Virando à direita, tem um banco.' },
    { pecas: ['はる', 'に', 'なる', 'と', '、', 'はな', 'が', 'さきます<さく'], pt: 'Quando chega a primavera, as flores se abrem.' },
  ],
  nara: [
    { pecas: ['切手', 'なら', '、', 'コンビニ', 'で', 'も', 'かえます<かう'], pt: 'Se for selo, dá para comprar até na konbini.' },
    { pecas: ['りょうがえ', 'なら', '、', '銀行', 'が', 'いい', 'です', 'よ'], pt: 'Para trocar dinheiro, o banco é melhor.' },
  ],

  /* Unidade 6 */
  temo: [
    { pecas: ['高くても=たかくても<高い', '、', '買います=かいます<買う'], pt: 'Mesmo que seja caro, eu compro.' },
    { pecas: ['雨', 'が', 'ふっても<ふる', '、', '出かけます=でかけます<出かける'], pt: 'Mesmo que chova, eu saio.' },
  ],
  noni: [
    { pecas: ['新しい', 'のに', '、', 'もう', 'こわれました<こわれる'], pt: 'É novo, mas já quebrou.' },
    { pecas: ['お金', 'を', 'はらった<はらう', 'のに', '、', '品物', 'が', 'とどきません<とどく'], pt: 'Eu paguei, mas a mercadoria não chega.' },
  ],
  node: [
    { pecas: ['この', 'くつ', 'は', 'きつい', 'ので', '、', 'こうかんしたい<こうかんする', 'です'], pt: 'Este sapato está apertado, então queria trocar.' },
    { pecas: ['レジ', 'に', '人', 'が', '多い', 'ので', '、', 'あとで', '買います=かいます<買う'], pt: 'Como o caixa está cheio, compro depois.' },
  ],
  'dake-shika': [
    { pecas: ['この', '店', 'は', 'げんきん', 'しか', '使えません=つかえません<使う'], pt: 'Esta loja só aceita dinheiro vivo.' },
    { pecas: ['セール', 'で', '一つ', 'だけ', '買いました=かいました<買う'], pt: 'Na liquidação, comprei só um.' },
  ],

  /* Unidade 7 */
  'koto-ni-suru': [
    { pecas: ['コンビニ', 'で', '働く', 'こと', 'に', 'しました<する'], pt: 'Decidi trabalhar numa konbini.' },
    { pecas: ['毎日', '日本語', 'を', 'べんきょうする', 'こと', 'に', 'しています'], pt: 'Tenho como regra estudar japonês todo dia.' },
  ],
  'koto-ni-naru': [
    { pecas: ['来月', 'から', '工場', 'で', '働く', 'こと', 'に', 'なりました'], pt: 'Ficou decidido que vou trabalhar na fábrica a partir do mês que vem.' },
    { pecas: ['あした', '店長', 'と', '会う', 'こと', 'に', 'なりました'], pt: 'Ficou combinado que vou me encontrar com o gerente amanhã.' },
  ],
  'tame-ni': [
    { pecas: ['旅行', 'の', 'ため', 'に', 'お金', 'を', 'ためています<ためる'], pt: 'Estou juntando dinheiro para a viagem.' },
    { pecas: ['日本', 'で', '働く', 'ため', 'に', 'ビザ', 'が', 'ひつよう', 'です'], pt: 'Para trabalhar no Japão, é preciso visto.' },
  ],
  'you-ni': [
    { pecas: ['わすれない<わすれる', 'ように', '、', 'メモ', 'を', '書きます=かきます<書く'], pt: 'Faço uma anotação para não esquecer.' },
    { pecas: ['ちこくしない<ちこくする', 'ように', '、', 'はやく<はやい', '出かけます=でかけます<出かける'], pt: 'Saio cedo para não me atrasar.' },
  ],

  /* Unidade 8 */
  sonkeigo: [
    { pecas: ['店長', 'は', 'いらっしゃいます<いらっしゃる', 'か'], pt: 'O gerente está?' },
    { pecas: ['何', 'を', 'めしあがります<めしあがる', 'か'], pt: 'O que o senhor vai comer?' },
    { pecas: ['先生', 'は', 'もう', 'お読みに=およみに<読む', 'なりました'], pt: 'O professor já leu.' },
  ],
  gozaimasu: [
    { pecas: ['トイレ', 'は', 'あちら', 'でございます'], pt: 'O banheiro fica ali.' },
    { pecas: ['もう', '少し', '大きい', 'サイズ', 'も', 'ございます'], pt: 'Temos também um tamanho um pouco maior.' },
  ],
  itadakemasenka: [
    { pecas: ['もう一度', '言って=いって<言う', 'いただけません<いただく', 'か'], pt: 'Poderia dizer mais uma vez?' },
    { pecas: ['ゆっくり', '話して=はなして<話す', 'いただけません<いただく', 'か'], pt: 'Poderia falar mais devagar?' },
  ],

  /* Unidade 9 */
  kenjougo: [
    { pecas: ['私', 'は', 'ラファエル', 'と', 'もうします<もうす'], pt: 'Eu me chamo Rafael.' },
    { pecas: ['あした', 'また', 'まいります<まいる'], pt: 'Volto amanhã de novo.' },
    { pecas: ['にもつ', 'を', 'お持ちします=おもちします<持つ'], pt: 'Eu levo a bagagem para o senhor.' },
  ],
  'sasete-kudasai': [
    { pecas: ['私', 'に', 'やらせて<やる', 'ください'], pt: 'Deixe que eu faço.' },
    { pecas: ['少し', '休ませて=やすませて<休む', 'ください'], pt: 'Deixe-me descansar um pouco.' },
  ],
  'te-shimau': [
    { pecas: ['電車', 'に', 'かさ', 'を', 'わすれて<わすれる', 'しまいました<しまう'], pt: 'Acabei esquecendo o guarda-chuva no trem.' },
    { pecas: ['おさら', 'を', 'おとして<おとす', 'しまいました<しまう'], pt: 'Sem querer, deixei o prato cair.' },
  ],

  /* Unidade 10 */
  nakereba: [
    { pecas: ['あした', 'は', '早く=はやく<早い', '起きなければ=おきなければ<起きる', 'なりません<なる'], pt: 'Amanhã tenho de acordar cedo.' },
    { pecas: ['せいふく', 'を', 'きなければ<きる', 'なりません<なる'], pt: 'É obrigatório vestir o uniforme.' },
  ],
  nakutemo: [
    { pecas: ['土曜日', 'は', '来なくても=こなくても<来る', 'いい', 'です'], pt: 'No sábado não precisa vir.' },
    { pecas: ['てぶくろ', 'は', '持ってこなくても=もってこなくても<持ってくる', 'いい', 'です'], pt: 'Não precisa trazer luvas.' },
  ],
  shieki: [
    { pecas: ['店長', 'は', '私', 'に', 'そうじ', 'を', 'させました<させる'], pt: 'O gerente me mandou fazer a limpeza.' },
    { pecas: ['母', 'は', '子ども', 'に', 'やさい', 'を', '食べさせます=たべさせます<食べる'], pt: 'A mãe faz a criança comer verdura.' },
  ],
  meirei: [
    { pecas: ['ここ', 'で', '止まれ=とまれ<止まる'], pt: 'Pare aqui! (placa de trânsito)' },
    { pecas: ['ここ', 'で', 'たばこ', 'を', 'すう', 'な'], pt: 'Não fume aqui!' },
  ],

  /* Unidade 11 */
  kamoshirenai: [
    { pecas: ['これ', 'は', 'かぜ', 'かもしれません'], pt: 'Isto pode ser resfriado.' },
    { pecas: ['あした', 'は', '雨', 'が', 'ふる', 'かもしれません'], pt: 'Talvez chova amanhã.' },
  ],
  hazu: [
    { pecas: ['薬', 'を', '飲んだ=のんだ<飲む', 'から', '、', 'もう', 'なおる', 'はず', 'です'], pt: 'Tomei o remédio, então já deve sarar.' },
    { pecas: ['病院', 'は', '九時', 'に', 'あく', 'はず', 'です'], pt: 'O hospital deve abrir às nove.' },
  ],
  'you-da': [
    { pecas: ['ねつ', 'が', 'ある<あります', 'ようです'], pt: 'Parece que estou com febre.' },
    { pecas: ['足', 'の', 'ほね', 'が', 'おれた<おれる', 'みたい', 'です'], pt: 'Parece que quebrei o osso do pé.' },
  ],
  'sou-ouvi': [
    { pecas: ['たなか', 'さん', 'は', '入院した=にゅういんした<入院する', 'そうです'], pt: 'Dizem que o Tanaka foi internado.' },
    { pecas: ['あした', 'は', 'ゆき', 'が', 'ふる', 'そうです'], pt: 'Dizem que amanhã vai nevar.' },
  ],
  rashii: [
    { pecas: ['あの', '病院', 'は', 'いい', 'らしい', 'です'], pt: 'Dizem que aquele hospital é bom.' },
    { pecas: ['先生', 'は', 'きょう', '休み', 'らしい', 'です'], pt: 'Parece que o professor está de folga hoje.' },
  ],

  /* Unidade 12 */
  'te-miru': [
    { pecas: ['この', '料理', 'を', '食べて=たべて<食べる', 'みます<見る'], pt: 'Vou experimentar esta comida.' },
    { pecas: ['日本', 'の', '料理', 'を', '作って=つくって<作る', 'みたい<見る', 'です'], pt: 'Quero tentar fazer comida japonesa.' },
  ],
  kata: [
    { pecas: ['お茶', 'の', 'いれ方=いれかた<いれる', 'を', 'おしえて<おしえる', 'ください'], pt: 'Me ensine a preparar o chá.' },
    { pecas: ['この', 'かんじ', 'の', '読み方=よみかた<読む', 'が', '分かりません=わかりません<分かる'], pt: 'Não sei como se lê este kanji.' },
  ],
  'hajimeru-owaru': [
    { pecas: ['ご飯', 'を', '食べ始めました=たべはじめました<食べる'], pt: 'Comecei a comer.' },
    { pecas: ['この', '本', 'は', 'もう', '読み終わりました=よみおわりました<読む'], pt: 'Já terminei de ler este livro.' },
    { pecas: ['けさ', 'から', '雨', 'が', 'ふりつづけて<ふる', 'います'], pt: 'Está chovendo sem parar desde de manhã.' },
  ],
  nagara: [
    { pecas: ['テレビ', 'を', '見ながら=みながら<見る', 'ご飯', 'を', '食べます=たべます<食べる'], pt: 'Como vendo TV.' },
    { pecas: ['ラジオ', 'を', '聞きながら=ききながら<聞く', '料理します=りょうりします<料理する'], pt: 'Cozinho ouvindo rádio.' },
  ],

  /* Unidade 13 */
  tari: [
    { pecas: ['日曜日', 'は', '映画', 'を', '見たり=みたり<見る', '、', '歌', 'を', '歌ったり=うたったり<歌う', 'します'], pt: 'No domingo, vejo filme, canto, coisas assim.' },
    { pecas: ['海', 'で', 'およいだり<およぐ', '、', '走ったり=はしったり<走る', 'しました<する'], pt: 'Na praia, nadei, corri e tal.' },
  ],
  nominalizar: [
    { pecas: ['私', 'は', '歌う', 'の', 'が', '好き', 'です'], pt: 'Eu gosto de cantar.' },
    { pecas: ['しゅみ', 'は', '映画', 'を', '見る', 'こと', 'です'], pt: 'Meu passatempo é ver filmes.' },
  ],
  nanika: [
    { pecas: ['何か', '飲みます=のみます<飲む', 'か'], pt: 'Vai beber alguma coisa?' },
    { pecas: ['きのう', 'は', '何も', '食べませんでした=たべませんでした<食べる'], pt: 'Ontem não comi nada.' },
  ],
  demo: [
    { pecas: ['お茶', 'でも', '飲みません=のみません<飲む', 'か'], pt: 'Que tal um chá?' },
    { pecas: ['日曜日', 'に', '映画', 'でも', '見ましょう=みましょう<見る'], pt: 'Vamos ver um filme, ou algo assim, no domingo.' },
  ],

  /* Unidade 14 */
  'you-ni-naru': [
    { pecas: ['漢字', 'が', '読める=よめる<読む', 'ように', 'なりました'], pt: 'Passei a conseguir ler kanji.' },
    { pecas: ['日本語', 'で', '話せる=はなせる<話す', 'ように', 'なりたい<なる', 'です'], pt: 'Quero chegar a conseguir conversar em japonês.' },
  ],
  'you-ni-suru': [
    { pecas: ['毎日', '漢字', 'を', '書く', 'ように', 'しています'], pt: 'Procuro escrever kanji todos os dias.' },
    { pecas: ['あまい', 'もの', 'を', '食べない=たべない<食べる', 'ように', 'しています'], pt: 'Procuro não comer doce.' },
  ],
  nasai: [
    { pecas: ['早く=はやく<早い', 'ねなさい<ねる'], pt: 'Vá dormir logo.' },
    { pecas: ['しゅくだい', 'を', 'しなさい<する'], pt: 'Faça a lição de casa.' },
  ],

  /* Unidade 15 */
  ukemi: [
    { pecas: ['私', 'は', '母', 'に', 'しかられました<しかる'], pt: 'Levei bronca da minha mãe.' },
    { pecas: ['弟', 'は', '先生', 'に', 'ほめられました<ほめる'], pt: 'Meu irmão mais novo foi elogiado pelo professor.' },
  ],
  'te-hoshii': [
    { pecas: ['兄', 'に', '日本', 'へ', '来て=きて<来る', 'ほしい', 'です'], pt: 'Quero que meu irmão venha ao Japão.' },
    { pecas: ['友だち', 'に', '手紙', 'を', '書いて=かいて<書く', 'ほしい', 'です'], pt: 'Quero que meu amigo me escreva uma carta.' },
  ],
  garu: [
    { pecas: ['妹', 'は', '犬', 'を', 'ほしがっています<ほしい'], pt: 'Minha irmã mais nova quer um cachorro.' },
    { pecas: ['子ども', 'は', 'みんな', 'ゲーム', 'を', 'したがります<する'], pt: 'Toda criança quer jogar videogame.' },
  ],

  /* Unidade 16 */
  'te-iku-kuru': [
    { pecas: ['コンビニ', 'で', 'パン', 'を', '買って=かって<買う', 'きます<来る'], pt: 'Vou ali comprar pão na konbini e já volto.' },
    { pecas: ['だんだん', 'さむく<さむい', 'なって<なる', 'きました<来る'], pt: 'Foi esfriando aos poucos.' },
  ],
  toki: [
    { pecas: ['道', 'が', '分からない=わからない<分かる', 'とき', 'は', '、', '地図', 'を', '見ます=みます<見る'], pt: 'Quando não sei o caminho, olho o mapa.' },
    { pecas: ['駅', 'へ', '行く', 'とき', '、', '公園', 'を', '通ります=とおります<通る'], pt: 'Quando vou à estação, passo pelo parque.' },
  ],
  aida: [
    { pecas: ['私', 'が', '運転している=うんてんしている<運転する', 'あいだ', '、', '友だち', 'は', 'ねていました<ねる'], pt: 'Enquanto eu dirigia, meu amigo dormia.' },
    { pecas: ['なつ休み', 'の', 'あいだ', 'に', '自転車', 'を', '買いました=かいました<買う'], pt: 'Nas férias de verão, comprei uma bicicleta.' },
  ],
  'uchi-ni': [
    { pecas: ['雨', 'が', 'ふらない<ふる', 'うちに', '、', '帰りましょう=かえりましょう<帰る'], pt: 'Vamos voltar antes que chova.' },
    { pecas: ['明るい', 'うちに', '、', '公園', 'を', '歩きます=あるきます<歩く'], pt: 'Caminho pelo parque enquanto ainda está claro.' },
  ],
  'made-ni': [
    { pecas: ['四時', 'までに', '駅', 'に', '着きたい=つきたい<着く', 'です'], pt: 'Quero chegar à estação até as quatro.' },
    { pecas: ['金曜日', 'までに', 'しゅくだい', 'を', '出して=だして<出す', 'ください'], pt: 'Entregue a lição até sexta.' },
  ],

  /* Unidade 17 */
  tokoro: [
    { pecas: ['今', 'から', '出かける', 'ところ', 'です'], pt: 'Estou saindo agora mesmo.' },
    { pecas: ['今', '朝ご飯', 'を', '食べている=たべている<食べる', 'ところ', 'です'], pt: 'Estou tomando o café da manhã agora.' },
    { pecas: ['今', '帰った=かえった<帰る', 'ところ', 'です'], pt: 'Acabei de chegar em casa.' },
  ],
  bakari: [
    { pecas: ['日本', 'に', '来た=きた<来る', 'ばかり', 'です'], pt: 'Acabei de chegar ao Japão.' },
    { pecas: ['さくら', 'が', 'さいた<さく', 'ばかり', 'です'], pt: 'As cerejeiras acabaram de florir.' },
  ],
  mama: [
    { pecas: ['まど', 'を', '開けた=あけた<開ける', 'まま', '、', 'ねて<ねる', 'しまいました<しまう'], pt: 'Acabei dormindo com a janela aberta.' },
    { pecas: ['くつ', 'を', 'はいた<はく', 'まま', '、', '入らないで=はいらないで<入る', 'ください'], pt: 'Não entre de sapato.' },
  ],
  'naide-zuni': [
    { pecas: ['朝ご飯', 'を', '食べないで=たべないで<食べる', '出かけました=でかけました<出かける'], pt: 'Saí sem tomar o café da manhã.' },
    { pecas: ['かさ', 'を', '持たずに=もたずに<持つ', '出かけて=でかけて<出かける', 'しまいました<しまう'], pt: 'Acabei saindo sem guarda-chuva.' },
  ],

  /* Unidade 18 */
  inyou: [
    { pecas: ['たなか', 'さん', 'は', 'あした', '来る', 'と', '言いました=いいました<言う'], pt: 'O Tanaka disse que vem amanhã.' },
    { pecas: ['ニュース', 'で', '、', '雨', 'が', 'ふる', 'と', '言っていました=いっていました<言う'], pt: 'No noticiário, disseram que vai chover.' },
  ],
  tte: [
    { pecas: ['あした', 'は', '休み', 'だ', 'って'], pt: 'Disseram que amanhã é folga.' },
    { pecas: ['ラファエル', 'って', '人', '、', '知ってる=しってる<知る'], fim: '？', pt: 'Você conhece um tal de Rafael?' },
  ],
  'hodo-nai': [
    { pecas: ['きょう', 'は', 'きのう', 'ほど', 'あつくない<あつい', 'です'], pt: 'Hoje não está tão quente quanto ontem.' },
    { pecas: ['ブラジル', 'の', '冬', 'は', '日本', 'ほど', 'さむくない<さむい', 'です'], pt: 'O inverno do Brasil não é tão frio quanto o do Japão.' },
  ],
  gurai: [
    { pecas: ['駅', 'まで', '五分', 'ぐらい', 'かかります<かかる'], pt: 'Leva uns cinco minutos até a estação.' },
    { pecas: ['一週間', 'ぐらい', '日本', 'を', '旅行しました=りょこうしました<旅行する'], pt: 'Viajei pelo Japão por mais ou menos uma semana.' },
  ],
  sa: [
    { pecas: ['家', 'の', '広さ=ひろさ<広い', 'が', '大切', 'です'], pt: 'O tamanho da casa é importante.' },
    { pecas: ['冬', 'の', 'さむさ<さむい', 'が', 'にがて', 'です'], pt: 'O frio do inverno é o que eu não aguento.' },
  ],

  /* Unidade 19 */
  'shieki-ukemi': [
    { pecas: ['子ども', 'の', 'とき', '、', '母', 'に', 'やさい', 'を', '食べさせられました=たべさせられました<食べる'], pt: 'Quando criança, minha mãe me fazia comer verdura.' },
    { pecas: ['店長', 'に', 'そうじ', 'を', 'させられました<させる'], pt: 'O gerente me fez fazer a limpeza.' },
  ],
  'ba-yokatta': [
    { pecas: ['もっと', '日本語', 'を', '勉強すれば=べんきょうすれば<勉強する', 'よかった<いい', 'です'], pt: 'Eu devia ter estudado mais japonês.' },
    { pecas: ['かさ', 'を', '持ってくれば=もってくれば<持ってくる', 'よかった<いい'], pt: 'Devia ter trazido o guarda-chuva.' },
  ],
  kana: [
    { pecas: ['あした', 'は', '雨', 'かな'], pt: 'Será que chove amanhã?' },
    { pecas: ['この', '店', '、', 'まだ', 'あいている<あく', 'かな'], pt: 'Será que esta loja ainda está aberta?' },
  ],
  'tara-dou': [
    { pecas: ['医者', 'に', '行ったら=いったら<行く', 'どう', 'です', 'か'], pt: 'Que tal ir ao médico?' },
    { pecas: ['少し', '休んだら=やすんだら<休む', 'どう', 'です', 'か'], pt: 'Que tal descansar um pouco?' },
  ],
};
