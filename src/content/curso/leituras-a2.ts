/**
 * Leitura graduada das unidades do A2, no formato das do A1 (leituras.ts): um texto curto por
 * unidade, só com o que o curso ensinou até ela.
 */
import type { LeituraLinhas } from './leituras';

export const LEITURAS_A2: Readonly<Record<string, LeituraLinhas>> = {
  'a2-01': {
    titulo: 'Os planos do Rafael',
    frases: [
      { pecas: ['ラファエル', 'は', '来年', '、', '日本', 'へ', '行く', 'つもり', 'です'], pt: 'O Rafael pretende ir ao Japão no ano que vem.' },
      { pecas: ['ワーキングホリデー', 'の', 'ビザ', 'を', 'とろう<とる', 'と', '思っています=おもっています<思う'], pt: 'Está pensando em tirar o visto de working holiday.' },
      { pecas: ['ひこうき', 'は', '一月', 'に', '出発する', 'よてい', 'です'], pt: 'O avião está marcado para partir em janeiro.' },
      { pecas: ['日本', 'で', 'たくさん', 'の', 'ところ', 'を', 'けんぶつしたい<けんぶつする', 'です'], pt: 'Ele quer conhecer muitos lugares no Japão.' },
      { pecas: ['それ', 'が', 'ラファエル', 'の', 'ゆめ', 'です'], pt: 'Esse é o sonho do Rafael.' },
    ],
  },
  'a2-02': {
    titulo: 'Dois apartamentos',
    frases: [
      { pecas: ['ラファエル', 'は', 'ふどうさんや', 'で', 'へや', 'を', 'さがしました<さがす'], pt: 'O Rafael procurou um apartamento na imobiliária.' },
      { pecas: ['一つ', 'は', '広い', 'です', 'が', '、', '駅', 'から', 'とおすぎます<とおい'], pt: 'Um era espaçoso, mas longe demais da estação.' },
      { pecas: ['もう', '一つ', 'は', '駅', 'に', '近い', 'し', '、', '明るい', 'です'], pt: 'O outro fica perto da estação e é claro.' },
      { pecas: ['でも', '、', 'やちん', 'が', '少し', '高い', 'です'], pt: 'Mas o aluguel é um pouco caro.' },
      { pecas: ['ラファエル', 'は', '駅', 'に', '近い', 'へや', 'に', 'しました<する'], pt: 'O Rafael ficou com o apartamento perto da estação.' },
    ],
  },
  'a2-03': {
    titulo: 'O dia da mudança',
    frases: [
      { pecas: ['きょう', 'は', 'ひっこし', 'です'], pt: 'Hoje é dia de mudança.' },
      { pecas: ['友だち', 'が', '来て=きて<来る', '、', '重い', 'かぐ', 'を', '運んで=はこんで<運ぶ', 'くれました<くれる'], pt: 'Um amigo veio e carregou os móveis pesados para mim.' },
      { pecas: ['ダンボール', 'は', 'きのう', 'の', 'ばん', 'に', 'かたづけて<かたづける', 'おきました<おく'], pt: 'As caixas, eu já tinha arrumado ontem à noite.' },
      { pecas: ['あとで', 'となり', 'の', '人', 'に', 'あいさつしました<あいさつする'], pt: 'Depois, fui me apresentar ao vizinho.' },
      { pecas: ['となり', 'の', '人', 'に', 'おかし', 'を', 'あげました<あげる'], pt: 'Dei doces para o vizinho.' },
    ],
  },
  'a2-04': {
    titulo: 'Na prefeitura do bairro',
    frases: [
      { pecas: ['ラファエル', 'は', 'くやくしょ', 'へ', '行きました=いきました<行く'], pt: 'O Rafael foi à prefeitura do bairro.' },
      { pecas: ['まどぐち', 'で', 'じゅうしょ', 'の', 'とどけ', 'を', '出しました=だしました<出す'], pt: 'Entregou o registro de endereço no guichê.' },
      { pecas: ['ざいりゅうカード', 'と', 'パスポート', 'が', 'ひつよう', 'でした'], pt: 'Precisava do cartão de residente e do passaporte.' },
      { pecas: ['しょるい', 'に', '名字', 'を', 'カタカナ', 'で', '書きました=かきました<書く'], pt: 'No formulário, escreveu o sobrenome em katakana.' },
      { pecas: ['日本語', 'の', 'せつめい', 'も', '分かりました=わかりました<分かる'], pt: 'Entendeu também a explicação em japonês.' },
    ],
  },
  'a2-05': {
    titulo: 'Uma conta no banco',
    frases: [
      { pecas: ['ラファエル', 'は', '銀行', 'で', 'こうざ', 'を', 'つくりました<つくる'], pt: 'O Rafael abriu uma conta no banco.' },
      { pecas: ['キャッシュカード', 'は', '一週間', 'で', 'とどきます<とどく'], pt: 'O cartão chega em uma semana.' },
      { pecas: ['カード', 'が', 'とどいたら<とどく', '、', 'コンビニ', 'で', 'も', 'お金', 'が', 'おろせます<おろす'], pt: 'Quando o cartão chegar, dá para sacar dinheiro até na konbini.' },
      { pecas: ['ブラジル', 'の', '母', 'に', '手紙', 'を', '送りました=おくりました<送る'], pt: 'Mandou uma carta para a mãe, no Brasil.' },
      { pecas: ['切手', 'は', 'ゆうびんきょく', 'で', 'かいました<かう'], pt: 'Comprou o selo no correio.' },
    ],
  },
  'a2-06': {
    titulo: 'A camisa apertada',
    frases: [
      { pecas: ['きのう', 'デパート', 'で', 'シャツ', 'を', '買いました=かいました<買う'], pt: 'Ontem comprei uma camisa na loja de departamentos.' },
      { pecas: ['でも', '、', 'うち', 'で', 'きたら<きる', '、', 'きつかった<きつい', 'です'], pt: 'Mas, quando vesti em casa, estava apertada.' },
      { pecas: ['きょう', '店', 'へ', '行って=いって<行く', '、', '店員', 'に', '話しました=はなしました<話す'], pt: 'Hoje fui à loja e falei com o atendente.' },
      { pecas: ['レシート', 'が', 'あった<あります', 'ので', '、', 'こうかん', 'できました<できる'], pt: 'Como eu tinha o recibo, deu para trocar.' },
      { pecas: ['新しい', 'シャツ', 'は', 'ぴったり', 'です'], pt: 'A camisa nova ficou certinha.' },
    ],
  },
  'a2-07': {
    titulo: 'Uma vaga na padaria',
    frases: [
      { pecas: ['ラファエル', 'は', 'アルバイト', 'を', 'さがしています<さがす'], pt: 'O Rafael está procurando um bico.' },
      { pecas: ['駅前', 'の', 'パン屋', 'で', 'ぼしゅう', 'が', 'ありました<あります'], pt: 'A padaria em frente à estação tinha uma vaga.' },
      { pecas: ['じきゅう', 'も', '高い', 'し', '、', '家', 'から', '近い', 'です'], pt: 'O pagamento por hora é bom, e fica perto de casa.' },
      { pecas: ['ラファエル', 'は', 'おうぼする', 'こと', 'に', 'しました<する'], pt: 'O Rafael decidiu se candidatar.' },
      { pecas: ['めんせつ', 'の', 'ため', 'に', 'りれきしょ', 'を', '書きました=かきました<書く'], pt: 'Escreveu o currículo para a entrevista.' },
    ],
  },
  'a2-08': {
    titulo: 'A entrevista',
    frases: [
      { pecas: ['店長', 'は', 'やさしい', '方', 'でした'], pt: 'O gerente era uma pessoa gentil.' },
      { pecas: ['店長', 'が', 'しゅみ', 'を', '聞きました=ききました<聞く'], pt: 'O gerente perguntou sobre os hobbies dele.' },
      { pecas: ['ラファエル', 'は', 'ていねい', 'に', '答えました=こたえました<答える'], pt: 'O Rafael respondeu com educação.' },
      { pecas: ['日本語', 'の', 'けいご', 'は', 'まだ', 'にがて', 'です'], pt: 'O keigo ainda é o ponto fraco dele.' },
      { pecas: ['でも', '、', 'がんばります<がんばる'], pt: 'Mas ele vai se esforçar.' },
    ],
  },
  'a2-09': {
    titulo: 'O primeiro dia',
    frases: [
      { pecas: ['ラファエル', 'は', '早く=はやく<早い', '起きました=おきました<起きる'], pt: 'O Rafael acordou cedo.' },
      { pecas: ['店', 'で', 'みなさん', 'に', 'あいさつしました<あいさつする'], pt: 'Na loja, cumprimentou todo mundo.' },
      { pecas: ['せんぱい', 'が', '仕事', 'を', 'おしえて<おしえる', 'くれました<くれる'], pt: 'Um veterano ensinou o serviço a ele.' },
      { pecas: ['ラファエル', 'は', 'おさら', 'を', 'おとして<おとす', 'しまいました<しまう'], pt: 'O Rafael deixou um prato cair.' },
      { pecas: ['でも', '、', 'みんな', 'やさしかった<やさしい', 'です'], pt: 'Mas todos foram gentis.' },
    ],
  },
  'a2-10': {
    titulo: 'As regras da fábrica',
    frases: [
      { pecas: ['工場', 'に', 'は', 'きそく', 'が', '多い', 'です'], pt: 'Na fábrica há muitas regras.' },
      { pecas: ['中', 'で', 'は', 'せいふく', 'を', 'きなければ<きる', 'なりません<なる'], pt: 'Lá dentro, é obrigatório vestir o uniforme.' },
      { pecas: ['てぶくろ', 'と', 'マスク', 'も', 'かならず', 'つけます<つける'], pt: 'Luvas e máscara também, sempre.' },
      { pecas: ['きけん', 'です', 'から', '、', '工場', 'の', '中', 'で', 'は', 'はしって<はしる', 'は', 'いけません'], pt: 'Como é perigoso, não se pode correr dentro da fábrica.' },
      { pecas: ['きそく', 'を', 'まもれば<まもる', '、', '安心', 'です'], pt: 'Seguindo as regras, dá para ficar tranquilo.' },
    ],
  },
  'a2-11': {
    titulo: 'Gripado',
    frases: [
      { pecas: ['けさ', 'から', 'ラファエル', 'は', 'ぐあい', 'が', '悪い', 'です'], pt: 'Desde hoje cedo, o Rafael não está bem.' },
      { pecas: ['せき', 'も', 'ある<あります', 'し', '、', 'ねつ', 'も', 'ある<あります', 'ようです'], pt: 'Tem tosse, e parece que tem febre também.' },
      { pecas: ['インフルエンザ', 'かもしれません'], pt: 'Pode ser gripe.' },
      { pecas: ['ラファエル', 'は', '病院', 'へ', '行きました=いきました<行く'], pt: 'O Rafael foi ao hospital.' },
      { pecas: ['薬', 'を', '飲めば=のめば<飲む', '、', 'すぐに', 'なおる', 'そうです'], pt: 'Dizem que, tomando o remédio, ele sara logo.' },
    ],
  },
  'a2-12': {
    titulo: 'Curry em casa',
    frases: [
      { pecas: ['きょう', 'は', 'うち', 'で', 'カレー', 'を', '作って=つくって<作る', 'みました<見る'], pt: 'Hoje experimentei fazer curry em casa.' },
      { pecas: ['なべ', 'で', '牛肉', 'と', '野菜', 'を', 'いためました<いためる'], pt: 'Refoguei a carne e os legumes na panela.' },
      { pecas: ['それから', '、', 'お水', 'を', 'いれて<いれる', '、', 'にました<にる'], pt: 'Depois, pus água e deixei cozinhar.' },
      { pecas: ['ラジオ', 'を', '聞きながら=ききながら<聞く', '待ちました=まちました<待つ'], pt: 'Esperei ouvindo rádio.' },
      { pecas: ['味', 'は', 'ちょっと', 'からかった<からい', 'です', 'が', '、', 'おいしかった<おいしい', 'です'], pt: 'Ficou um pouco apimentado, mas estava gostoso.' },
    ],
  },
  'a2-13': {
    titulo: 'Domingo de karaokê',
    frases: [
      { pecas: ['日曜日', 'は', 'ひま', 'でした'], pt: 'No domingo, eu estava livre.' },
      { pecas: ['友だち', 'を', 'さそって<さそう', '、', 'カラオケ', 'へ', '行きました=いきました<行く'], pt: 'Chamei um amigo e fomos ao karaokê.' },
      { pecas: ['アニメ', 'の', '歌', 'を', '歌ったり=うたったり<歌う', '、', 'おどったり<おどる', 'しました<する'], pt: 'Cantamos músicas de anime, dançamos, essas coisas.' },
      { pecas: ['あとで', '海', 'の', 'ちかく', 'を', '歩きました=あるきました<歩く'], pt: 'Depois, caminhamos perto do mar.' },
      { pecas: ['とても', '楽しかった=たのしかった<楽しい', 'です'], pt: 'Foi muito divertido.' },
    ],
  },
  'a2-14': {
    titulo: 'Um ano de japonês',
    frases: [
      { pecas: ['ラファエル', 'は', '一年', '日本語', 'を', '勉強しました=べんきょうしました<勉強する'], pt: 'O Rafael estudou japonês por um ano.' },
      { pecas: ['今', 'は', '漢字', 'が', '少し', '読める=よめる<読む', 'ように', 'なりました'], pt: 'Agora ele já consegue ler um pouco de kanji.' },
      { pecas: ['毎日', '、', '作文', 'を', '書く', 'ように', 'しています'], pt: 'Todo dia, procura escrever uma redação.' },
      { pecas: ['でも', '、', '発音', 'は', 'まだ', 'にがて', 'です'], pt: 'Mas a pronúncia ainda é o ponto fraco dele.' },
      { pecas: ['来年', '、', '試験', 'を', 'うけよう<うける', 'と', '思っています=おもっています<思う'], pt: 'Está pensando em fazer o exame no ano que vem.' },
    ],
  },
  'a2-15': {
    titulo: 'A irmã do Rafael',
    frases: [
      { pecas: ['ラファエル', 'に', 'は', '妹', 'が', 'います'], pt: 'O Rafael tem uma irmã mais nova.' },
      { pecas: ['妹', 'は', 'ブラジル', 'に', '住んで=すんで<住む', 'います'], pt: 'Ela mora no Brasil.' },
      { pecas: ['妹', 'は', 'とても', 'さびしがっています<さびしい'], pt: 'Ela está com muita saudade.' },
      { pecas: ['ラファエル', 'は', '妹', 'に', '日本', 'へ', '来て=きて<来る', 'ほしい', 'です'], pt: 'O Rafael quer que a irmã venha ao Japão.' },
      { pecas: ['でも', '、', '妹', 'は', 'まだ', '学生', 'です'], pt: 'Mas ela ainda é estudante.' },
    ],
  },
  'a2-16': {
    titulo: 'De bicicleta',
    frases: [
      { pecas: ['ラファエル', 'は', '自転車', 'で', '店', 'に', '通っています=かよっています<通う'], pt: 'O Rafael vai de bicicleta para a loja.' },
      { pecas: ['家', 'から', '店', 'まで', 'は', '近い', 'です'], pt: 'Da casa até a loja é perto.' },
      { pecas: ['行く', 'とき', '、', '公園', 'の', '中', 'を', '通ります=とおります<通る'], pt: 'No caminho, ele passa por dentro do parque.' },
      { pecas: ['きのう', 'は', '雨', 'が', 'ふらない<ふる', 'うちに', '、', '帰りました=かえりました<帰る'], pt: 'Ontem, voltou para casa antes que chovesse.' },
      { pecas: ['あした', 'は', '九時', 'までに', '店', 'に', '着かなければ=つかなければ<着く', 'なりません<なる'], pt: 'Amanhã, tem de chegar à loja até as nove.' },
    ],
  },
  'a2-17': {
    titulo: 'O primeiro hanami',
    frases: [
      { pecas: ['春', 'に', 'なりました'], pt: 'Chegou a primavera.' },
      { pecas: ['さくら', 'が', 'さいた<さく', 'ばかり', 'です'], pt: 'As cerejeiras acabaram de florir.' },
      { pecas: ['日曜日', 'に', '友だち', 'と', '花見', 'を', 'しました<する'], pt: 'No domingo, fiz hanami com os amigos.' },
      { pecas: ['夜', 'まで', '公園', 'で', '食べたり=たべたり<食べる', '、', '飲んだり=のんだり<飲む', 'しました<する'], pt: 'Até a noite, comemos e bebemos no parque.' },
      { pecas: ['日本', 'の', '春', 'は', 'とても', 'きれい', 'です'], pt: 'A primavera do Japão é muito bonita.' },
    ],
  },
  'a2-18': {
    titulo: 'Um tremor à noite',
    frases: [
      { pecas: ['きのう', 'の', '夜', '、', '小さい', 'じしん', 'が', 'ありました<あります'], pt: 'Ontem à noite, houve um terremoto pequeno.' },
      { pecas: ['ニュース', 'で', '、', 'つなみ', 'の', 'しんぱい', 'は', 'ありません<あります', 'と', '言っていました=いっていました<言う'], pt: 'No noticiário, disseram que não havia risco de tsunami.' },
      { pecas: ['日本', 'は', 'ブラジル', 'より', 'じしん', 'が', '多い', 'です'], pt: 'O Japão tem mais terremotos que o Brasil.' },
      { pecas: ['ラファエル', 'は', '少し', '不安', 'に', 'なりました'], pt: 'O Rafael ficou um pouco inseguro.' },
      { pecas: ['でも', '、', 'じょうほう', 'が', 'はっきり', '分かれば=わかれば<分かる', '、', '安心', 'です'], pt: 'Mas, com a informação clara, dá para ficar tranquilo.' },
    ],
  },
  'a2-19': {
    titulo: 'Um ano no Japão',
    frases: [
      { pecas: ['ラファエル', 'が', '東京', 'に', '来て=きて<来る', '、', 'もう', '一年', 'です'], pt: 'Já faz um ano que o Rafael veio para Tóquio.' },
      { pecas: ['去年', 'は', '日本語', 'が', 'あまり', '話せません=はなせません<話す', 'でした'], pt: 'No ano passado, ele quase não falava japonês.' },
      { pecas: ['今', 'は', '仕事', 'で', 'も', '日本語', 'を', '使って=つかって<使う', 'います'], pt: 'Agora, usa japonês até no trabalho.' },
      { pecas: ['たくさん', 'の', '思い出', 'が', 'できました<できる'], pt: 'Ficaram muitas lembranças.' },
      { pecas: ['もっと', 'はやく<はやい', '日本', 'に', '来れば=くれば<来る', 'よかった<いい', 'と', '思います=おもいます<思う'], pt: 'Ele acha que devia ter vindo para o Japão antes.' },
    ],
  },
};
