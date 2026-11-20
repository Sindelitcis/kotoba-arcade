/**
 * Vocabulário em imagem: cada palavra aqui tem uma ilustração própria, feita no estúdio
 * (scripts/estudio.py, listas em scripts/imagens/). Usado pela Memória e pela Cena Viva.
 *
 * A palavra é a mesma carta dos outros jogos (`w:<como se escreve>#meaning`). Se ela já
 * existe no KanjiMon, no dia a dia (vida.ts) ou nos temas da Jornada, a carta é reaproveitada;
 * só o que falta vira palavra nova (`IMAGEM_WORDS`).
 */
import { KANJI, type Word } from './index';
import { acharPalavra } from './escola';
import { kanaToRomaji } from '../core/kana';

/** Nível do JLPT em que a palavra costuma aparecer. */
export type Nivel = 5 | 4 | 3;

/** Contadores que a Cena Viva usa. */
export type Contador = 'tsu' | 'hon' | 'mai' | 'hiki' | 'dai' | 'satsu' | 'ko' | 'nin';

export interface Figura {
  /** Arquivo da imagem (src/assets/imagens, acoes ou gente). */
  img: string;
  /** Pessoa é gente parada (médico, avó): na Cena Viva fica como as coisas, mas "está" (います). */
  tipo: 'objeto' | 'acao' | 'pessoa';
  word: Word;
  nivel: Nivel;
  contador: Contador;
  /** Verbo: a forma て (食べて), para "〜ている". */
  te?: { jp: string; kana: string };
  /** Grupo de sentido. A Memória não põe duas figuras do mesmo grupo de "parecidas" no tabuleiro fácil. */
  grupo: string;
}

/** [imagem, como se escreve, kana, significado, nível, contador, grupo] */
type Linha = readonly [string, string, string, string, Nivel, Contador, string];

const OBJETOS: readonly Linha[] = [
  // quarto e casa
  ['hon', '本', 'ほん', 'livro', 5, 'satsu', 'casa'],
  ['tsukue', '机', 'つくえ', 'escrivaninha', 5, 'tsu', 'moveis'],
  ['isu', '椅子', 'いす', 'cadeira', 5, 'tsu', 'moveis'],
  ['beddo', 'ベッド', 'ベッド', 'cama', 5, 'tsu', 'moveis'],
  ['makura', '枕', 'まくら', 'travesseiro', 4, 'tsu', 'casa'],
  ['tokei', '時計', 'とけい', 'relógio', 5, 'tsu', 'casa'],
  ['terebi', 'テレビ', 'テレビ', 'televisão', 5, 'dai', 'eletro'],
  ['pasokon', 'パソコン', 'パソコン', 'computador', 5, 'dai', 'eletro'],
  ['sumaho', 'スマホ', 'スマホ', 'celular (smartphone)', 5, 'dai', 'eletro'],
  ['megane', '眼鏡', 'めがね', 'óculos', 5, 'tsu', 'roupa'],
  ['udedokei', '腕時計', 'うでどけい', 'relógio de pulso', 4, 'tsu', 'roupa'],
  ['kutsushita', '靴下', 'くつした', 'meia', 5, 'tsu', 'roupa'],
  ['zubon', 'ズボン', 'ズボン', 'calça', 5, 'mai', 'roupa'],
  ['koto', 'コート', 'コート', 'casaco', 5, 'mai', 'roupa'],
  ['shashin', '写真', 'しゃしん', 'foto', 5, 'mai', 'casa'],
  ['hana', '花', 'はな', 'flor', 5, 'hon', 'natureza'],
  ['gomibako', 'ごみ箱', 'ごみばこ', 'lixeira', 4, 'tsu', 'casa'],
  ['kagi', '鍵', 'かぎ', 'chave', 5, 'tsu', 'casa'],
  ['saifu', '財布', 'さいふ', 'carteira', 5, 'tsu', 'casa'],
  ['noto', 'ノート', 'ノート', 'caderno', 5, 'satsu', 'escrita'],
  ['pen', 'ペン', 'ペン', 'caneta', 5, 'hon', 'escrita'],
  ['enpitsu', '鉛筆', 'えんぴつ', 'lápis', 5, 'hon', 'escrita'],
  ['keshigomu', '消しゴム', 'けしゴム', 'borracha', 5, 'ko', 'escrita'],
  ['hasami', 'はさみ', 'はさみ', 'tesoura', 4, 'tsu', 'escrita'],
  ['hako', '箱', 'はこ', 'caixa', 5, 'tsu', 'casa'],
  ['nuigurumi', 'ぬいぐるみ', 'ぬいぐるみ', 'bicho de pelúcia', 4, 'tsu', 'casa'],
  ['gita', 'ギター', 'ギター', 'violão', 5, 'tsu', 'casa'],
  ['kagami', '鏡', 'かがみ', 'espelho', 4, 'tsu', 'casa'],
  ['taoru', 'タオル', 'タオル', 'toalha', 5, 'mai', 'banho'],
  ['haburashi', '歯ブラシ', 'はブラシ', 'escova de dentes', 4, 'hon', 'banho'],
  ['hondana', '本棚', 'ほんだな', 'estante', 4, 'tsu', 'moveis'],
  ['sofa', 'ソファー', 'ソファー', 'sofá', 4, 'tsu', 'moveis'],
  ['teburu', 'テーブル', 'テーブル', 'mesa', 5, 'tsu', 'moveis'],
  ['eakon', 'エアコン', 'エアコン', 'ar-condicionado', 4, 'dai', 'eletro'],
  ['sutando', 'スタンド', 'スタンド', 'luminária de mesa', 4, 'tsu', 'eletro'],
  ['kamera', 'カメラ', 'カメラ', 'câmera', 5, 'dai', 'eletro'],
  ['tegami', '手紙', 'てがみ', 'carta', 5, 'tsu', 'escrita'],
  // cozinha
  ['reizouko', '冷蔵庫', 'れいぞうこ', 'geladeira', 5, 'dai', 'eletro'],
  ['denshirenji', '電子レンジ', 'でんしレンジ', 'micro-ondas', 4, 'dai', 'eletro'],
  ['suihanki', '炊飯器', 'すいはんき', 'panela de arroz', 3, 'dai', 'eletro'],
  ['nabe', '鍋', 'なべ', 'panela', 4, 'tsu', 'cozinha'],
  ['furaipan', 'フライパン', 'フライパン', 'frigideira', 4, 'tsu', 'cozinha'],
  ['houchou', '包丁', 'ほうちょう', 'faca de cozinha', 3, 'hon', 'cozinha'],
  ['manaita', 'まな板', 'まないた', 'tábua de corte', 3, 'mai', 'cozinha'],
  ['sara', '皿', 'さら', 'prato', 5, 'mai', 'cozinha'],
  ['chawan', '茶碗', 'ちゃわん', 'tigela de arroz', 4, 'tsu', 'cozinha'],
  ['hashi', '箸', 'はし', 'hashi (palitinhos)', 5, 'tsu', 'cozinha'],
  ['supun', 'スプーン', 'スプーン', 'colher', 5, 'hon', 'cozinha'],
  ['foku', 'フォーク', 'フォーク', 'garfo', 5, 'hon', 'cozinha'],
  ['koppu', 'コップ', 'コップ', 'copo', 5, 'tsu', 'cozinha'],
  ['kappu', 'カップ', 'カップ', 'xícara', 4, 'tsu', 'cozinha'],
  ['yakan', 'やかん', 'やかん', 'chaleira', 3, 'tsu', 'cozinha'],
  ['tamago', '卵', 'たまご', 'ovo', 5, 'ko', 'comida'],
  ['gyunyu', '牛乳', 'ぎゅうにゅう', 'leite', 5, 'hon', 'bebida'],
  ['pan', 'パン', 'パン', 'pão', 5, 'tsu', 'comida'],
  ['gohan', 'ご飯', 'ごはん', 'arroz (cozido)', 5, 'tsu', 'comida'],
  ['ringo', 'りんご', 'りんご', 'maçã', 5, 'tsu', 'fruta'],
  ['mikan', 'みかん', 'みかん', 'tangerina', 5, 'tsu', 'fruta'],
  ['banana', 'バナナ', 'バナナ', 'banana', 5, 'hon', 'fruta'],
  ['ichigo', 'いちご', 'いちご', 'morango', 5, 'tsu', 'fruta'],
  ['tomato', 'トマト', 'トマト', 'tomate', 5, 'tsu', 'legume'],
  ['ninjin', 'にんじん', 'にんじん', 'cenoura', 5, 'hon', 'legume'],
  ['tamanegi', '玉ねぎ', 'たまねぎ', 'cebola', 4, 'tsu', 'legume'],
  ['kyabetsu', 'キャベツ', 'キャベツ', 'repolho', 4, 'tsu', 'legume'],
  ['sakana', '魚', 'さかな', 'peixe', 5, 'hiki', 'comida'],
  ['niku', '肉', 'にく', 'carne', 5, 'mai', 'comida'],
  ['budou', 'ぶどう', 'ぶどう', 'uva', 5, 'tsu', 'fruta'],
  ['suika', 'すいか', 'すいか', 'melancia', 4, 'tsu', 'fruta'],
  ['jagaimo', 'じゃがいも', 'じゃがいも', 'batata', 4, 'tsu', 'legume'],
  // comida e bebida
  ['ocha', 'お茶', 'おちゃ', 'chá verde', 5, 'tsu', 'bebida'],
  ['koohii', 'コーヒー', 'コーヒー', 'café', 5, 'hon', 'bebida'],
  ['mizu', '水', 'みず', 'água', 5, 'hon', 'bebida'],
  ['jusu', 'ジュース', 'ジュース', 'suco', 5, 'tsu', 'bebida'],
  ['biru', 'ビール', 'ビール', 'cerveja', 5, 'tsu', 'bebida'],
  ['onigiri', 'おにぎり', 'おにぎり', 'bolinho de arroz', 5, 'ko', 'comida'],
  ['bento', 'お弁当', 'おべんとう', 'bentô (marmita)', 5, 'tsu', 'comida'],
  ['sandoitchi', 'サンドイッチ', 'サンドイッチ', 'sanduíche', 5, 'tsu', 'comida'],
  ['aisu', 'アイス', 'アイス', 'sorvete', 5, 'tsu', 'doce'],
  ['okashi', 'お菓子', 'おかし', 'doces e salgadinhos', 5, 'tsu', 'doce'],
  ['ramen', 'ラーメン', 'ラーメン', 'lámen', 5, 'tsu', 'prato'],
  ['sushi', '寿司', 'すし', 'sushi', 5, 'tsu', 'prato'],
  ['tenpura', '天ぷら', 'てんぷら', 'tempurá', 5, 'tsu', 'prato'],
  ['kare', 'カレー', 'カレー', 'curry com arroz', 5, 'tsu', 'prato'],
  ['udon', 'うどん', 'うどん', 'udon (macarrão grosso)', 5, 'tsu', 'prato'],
  ['misoshiru', '味噌汁', 'みそしる', 'sopa de missô', 4, 'tsu', 'prato'],
  ['keki', 'ケーキ', 'ケーキ', 'bolo', 5, 'tsu', 'doce'],
  ['gyoza', '餃子', 'ぎょうざ', 'guioza', 4, 'tsu', 'prato'],
  ['yakitori', '焼き鳥', 'やきとり', 'espetinho de frango', 4, 'hon', 'prato'],
  ['edamame', '枝豆', 'えだまめ', 'edamame (soja verde)', 3, 'tsu', 'prato'],
  ['shoyu', '醤油', 'しょうゆ', 'shoyu', 4, 'hon', 'cozinha'],
  ['cupramen', 'カップラーメン', 'カップラーメン', 'lámen instantâneo de copo', 4, 'ko', 'comida'],
  ['donburi', '丼', 'どんぶり', 'tigela de arroz com cobertura', 3, 'tsu', 'prato'],
  // loja, konbini e dinheiro
  ['tana', '棚', 'たな', 'prateleira', 4, 'tsu', 'moveis'],
  ['reji', 'レジ', 'レジ', 'caixa (onde se paga)', 5, 'dai', 'loja'],
  ['denchi', '電池', 'でんち', 'pilha', 4, 'hon', 'loja'],
  ['kago', 'かご', 'かご', 'cesta de compras', 4, 'tsu', 'loja'],
  ['fukuro', '袋', 'ふくろ', 'sacola', 5, 'mai', 'loja'],
  ['kitte', '切手', 'きって', 'selo postal', 5, 'mai', 'loja'],
  ['okane', 'お金', 'おかね', 'dinheiro', 5, 'tsu', 'loja'],
  // farmácia
  ['kusuri', '薬', 'くすり', 'remédio', 5, 'tsu', 'saude'],
  ['masuku', 'マスク', 'マスク', 'máscara', 5, 'mai', 'saude'],
  ['taionkei', '体温計', 'たいおんけい', 'termômetro', 3, 'hon', 'saude'],
  ['houtai', '包帯', 'ほうたい', 'atadura', 3, 'tsu', 'saude'],
  ['shanpu', 'シャンプー', 'シャンプー', 'xampu', 5, 'hon', 'banho'],
  ['sekken', '石鹸', 'せっけん', 'sabonete', 4, 'ko', 'banho'],
  ['tisshu', 'ティッシュ', 'ティッシュ', 'lenço de papel', 4, 'tsu', 'banho'],
  // escritório
  ['denwa', '電話', 'でんわ', 'telefone', 5, 'dai', 'eletro'],
  ['kopiki', 'コピー機', 'コピーき', 'copiadora', 4, 'dai', 'eletro'],
  ['fairu', 'ファイル', 'ファイル', 'pasta de arquivo', 4, 'satsu', 'escrita'],
  ['hotchikisu', 'ホッチキス', 'ホッチキス', 'grampeador', 3, 'tsu', 'escrita'],
  ['karenda', 'カレンダー', 'カレンダー', 'calendário', 4, 'mai', 'casa'],
  ['nekutai', 'ネクタイ', 'ネクタイ', 'gravata', 5, 'hon', 'roupa'],
  ['howaitobodo', 'ホワイトボード', 'ホワイトボード', 'quadro branco', 4, 'tsu', 'escrita'],
  ['purinta', 'プリンター', 'プリンター', 'impressora', 4, 'dai', 'eletro'],
  ['hanko', 'はんこ', 'はんこ', 'carimbo pessoal (hanko)', 4, 'ko', 'escrita'],
  ['kanyoshokubutsu', '植木', 'うえき', 'planta em vaso', 3, 'tsu', 'natureza'],
  // rua, estação e natureza
  ['basu', 'バス', 'バス', 'ônibus', 5, 'dai', 'veiculo'],
  ['takushi', 'タクシー', 'タクシー', 'táxi', 5, 'dai', 'veiculo'],
  ['densha', '電車', 'でんしゃ', 'trem', 5, 'tsu', 'veiculo'],
  ['jitensha', '自転車', 'じてんしゃ', 'bicicleta', 5, 'dai', 'veiculo'],
  ['shingou', '信号', 'しんごう', 'semáforo', 4, 'tsu', 'rua'],
  ['ki', '木', 'き', 'árvore', 5, 'hon', 'natureza'],
  ['posuto', 'ポスト', 'ポスト', 'caixa de correio', 5, 'tsu', 'rua'],
  ['jihanki', '自動販売機', 'じどうはんばいき', 'máquina de venda automática', 3, 'dai', 'rua'],
  ['inu', '犬', 'いぬ', 'cachorro', 5, 'hiki', 'animal'],
  ['neko', '猫', 'ねこ', 'gato', 5, 'hiki', 'animal'],
  ['tori', '鳥', 'とり', 'pássaro', 5, 'tsu', 'animal'],
  ['ie', '家', 'いえ', 'casa', 5, 'tsu', 'rua'],
  ['benchi', 'ベンチ', 'ベンチ', 'banco (de sentar)', 4, 'tsu', 'rua'],
  ['suutsukesu', 'スーツケース', 'スーツケース', 'mala de viagem', 4, 'tsu', 'viagem'],
  ['ryukku', 'リュック', 'リュック', 'mochila', 4, 'tsu', 'viagem'],
  ['chizu', '地図', 'ちず', 'mapa', 5, 'mai', 'viagem'],
  ['kaidan', '階段', 'かいだん', 'escada', 5, 'tsu', 'rua'],
  ['chouchin', '提灯', 'ちょうちん', 'lanterna de papel', 3, 'tsu', 'rua'],
  ['baiku', 'バイク', 'バイク', 'moto', 4, 'dai', 'veiculo'],
  ['ame-kyandi', '飴', 'あめ', 'bala (doce)', 4, 'ko', 'doce'],
  ['kumo', '雲', 'くも', 'nuvem', 4, 'tsu', 'tempo'],
  ['tsuki', '月', 'つき', 'lua', 5, 'tsu', 'tempo'],
  ['yama', '山', 'やま', 'montanha', 5, 'tsu', 'natureza'],
  ['umi', '海', 'うみ', 'mar', 5, 'tsu', 'natureza'],
  // segunda leva: bichos
  ['usagi', 'うさぎ', 'うさぎ', 'coelho', 5, 'hiki', 'animal'],
  ['kingyo', '金魚', 'きんぎょ', 'peixinho dourado', 4, 'hiki', 'animal'],
  ['kame', '亀', 'かめ', 'tartaruga', 4, 'hiki', 'animal'],
  ['nezumi', 'ねずみ', 'ねずみ', 'rato', 4, 'hiki', 'animal'],
  ['saru', '猿', 'さる', 'macaco', 4, 'hiki', 'animal'],
  ['chou', '蝶', 'ちょう', 'borboleta', 3, 'hiki', 'animal'],
  ['niwatori', '鶏', 'にわとり', 'galinha', 4, 'hiki', 'animal'],
  // comida
  ['yasai', '野菜', 'やさい', 'verduras e legumes', 5, 'tsu', 'legume'],
  ['kudamono', '果物', 'くだもの', 'fruta', 5, 'tsu', 'fruta'],
  ['chiizu', 'チーズ', 'チーズ', 'queijo', 5, 'ko', 'comida'],
  ['teishoku', '定食', 'ていしょく', 'prato feito', 4, 'tsu', 'prato'],
  ['remon', 'レモン', 'レモン', 'limão', 4, 'ko', 'fruta'],
  ['momo', '桃', 'もも', 'pêssego', 4, 'ko', 'fruta'],
  ['meron', 'メロン', 'メロン', 'melão', 4, 'ko', 'fruta'],
  ['kyuri', 'きゅうり', 'きゅうり', 'pepino', 4, 'hon', 'legume'],
  ['nasu', 'なす', 'なす', 'berinjela', 4, 'hon', 'legume'],
  ['daikon', '大根', 'だいこん', 'nabo japonês (daikon)', 4, 'hon', 'legume'],
  ['toumorokoshi', 'とうもろこし', 'とうもろこし', 'milho', 4, 'hon', 'legume'],
  ['kabocha', 'かぼちゃ', 'かぼちゃ', 'abóbora', 4, 'ko', 'legume'],
  ['toufu', '豆腐', 'とうふ', 'tofu', 4, 'tsu', 'comida'],
  ['natto', '納豆', 'なっとう', 'natô (soja fermentada)', 3, 'tsu', 'comida'],
  ['hanbaga', 'ハンバーガー', 'ハンバーガー', 'hambúrguer', 5, 'ko', 'comida'],
  ['piza', 'ピザ', 'ピザ', 'pizza', 5, 'mai', 'comida'],
  ['supagetti', 'スパゲッティ', 'スパゲッティ', 'espaguete', 5, 'tsu', 'prato'],
  ['oden', 'おでん', 'おでん', 'oden (cozido da konbini)', 4, 'tsu', 'prato'],
  ['karaage', '唐揚げ', 'からあげ', 'frango frito (karaage)', 4, 'ko', 'prato'],
  ['nikuman', '肉まん', 'にくまん', 'pãozinho de carne no vapor', 4, 'ko', 'comida'],
  ['soba', 'そば', 'そば', 'sobá', 4, 'tsu', 'prato'],
  ['takoyaki', 'たこ焼き', 'たこやき', 'takoyaki', 4, 'ko', 'prato'],
  ['okonomiyaki', 'お好み焼き', 'おこのみやき', 'okonomiyaki', 4, 'mai', 'prato'],
  ['sashimi', '刺身', 'さしみ', 'sashimi', 4, 'tsu', 'prato'],
  ['dango', '団子', 'だんご', 'dango (bolinho no espeto)', 4, 'hon', 'doce'],
  ['choko', 'チョコレート', 'チョコレート', 'chocolate', 5, 'mai', 'doce'],
  ['kukki', 'クッキー', 'クッキー', 'biscoito (cookie)', 5, 'mai', 'doce'],
  ['donatsu', 'ドーナツ', 'ドーナツ', 'rosquinha (donut)', 5, 'ko', 'doce'],
  ['purin', 'プリン', 'プリン', 'pudim', 4, 'ko', 'doce'],
  ['wain', 'ワイン', 'ワイン', 'vinho', 4, 'tsu', 'bebida'],
  ['sake', 'お酒', 'おさけ', 'saquê, bebida alcoólica', 5, 'hon', 'bebida'],
  ['suitou', '水筒', 'すいとう', 'garrafinha térmica', 3, 'hon', 'viagem'],
  // casa e roupa
  ['mado', '窓', 'まど', 'janela', 5, 'tsu', 'casa'],
  ['doa', 'ドア', 'ドア', 'porta', 5, 'tsu', 'casa'],
  ['sentakuki', '洗濯機', 'せんたくき', 'máquina de lavar', 4, 'dai', 'eletro'],
  ['soujiki', '掃除機', 'そうじき', 'aspirador de pó', 4, 'dai', 'eletro'],
  ['senpuki', '扇風機', 'せんぷうき', 'ventilador', 4, 'dai', 'eletro'],
  ['hanga', 'ハンガー', 'ハンガー', 'cabide', 4, 'hon', 'casa'],
  ['futon', '布団', 'ふとん', 'futon', 4, 'mai', 'moveis'],
  ['kaaten', 'カーテン', 'カーテン', 'cortina', 4, 'mai', 'casa'],
  ['surippa', 'スリッパ', 'スリッパ', 'chinelo de casa', 4, 'tsu', 'roupa'],
  ['kimono', '着物', 'きもの', 'quimono', 4, 'mai', 'roupa'],
  ['tebukuro', '手袋', 'てぶくろ', 'luvas', 4, 'tsu', 'roupa'],
  ['mafura', 'マフラー', 'マフラー', 'cachecol', 4, 'hon', 'roupa'],
  ['seta', 'セーター', 'セーター', 'suéter', 5, 'mai', 'roupa'],
  ['sukato', 'スカート', 'スカート', 'saia', 5, 'mai', 'roupa'],
  ['suutsu', 'スーツ', 'スーツ', 'terno', 4, 'mai', 'roupa'],
  ['epuron', 'エプロン', 'エプロン', 'avental', 4, 'mai', 'roupa'],
  ['mezamashi', '目覚まし時計', 'めざましどけい', 'despertador', 4, 'tsu', 'casa'],
  ['doraiya', 'ドライヤー', 'ドライヤー', 'secador de cabelo', 4, 'tsu', 'banho'],
  ['jougi', '定規', 'じょうぎ', 'régua', 3, 'hon', 'escrita'],
  ['heddohon', 'ヘッドホン', 'ヘッドホン', 'headphone', 4, 'tsu', 'eletro'],
  ['houki', 'ほうき', 'ほうき', 'vassoura', 4, 'hon', 'limpeza'],
  ['baketsu', 'バケツ', 'バケツ', 'balde', 4, 'tsu', 'limpeza'],
  ['moppu', 'モップ', 'モップ', 'esfregão (mop)', 3, 'hon', 'limpeza'],
  ['zoukin', '雑巾', 'ぞうきん', 'pano de chão', 3, 'mai', 'limpeza'],
  // trabalho
  ['herumetto', 'ヘルメット', 'ヘルメット', 'capacete', 4, 'tsu', 'trabalho'],
  ['gunte', '軍手', 'ぐんて', 'luva de trabalho', 3, 'tsu', 'trabalho'],
  ['daisha', '台車', 'だいしゃ', 'carrinho de carga', 3, 'dai', 'trabalho'],
  // rua, estação, prédios e natureza
  ['hikouki', '飛行機', 'ひこうき', 'avião', 5, 'dai', 'veiculo'],
  ['shinkansen', '新幹線', 'しんかんせん', 'trem-bala', 4, 'dai', 'veiculo'],
  ['fune', '船', 'ふね', 'barco, navio', 4, 'tsu', 'veiculo'],
  ['kaisatsu', '改札', 'かいさつ', 'catraca da estação', 3, 'tsu', 'rua'],
  ['esukareta', 'エスカレーター', 'エスカレーター', 'escada rolante', 4, 'tsu', 'rua'],
  ['erebeta', 'エレベーター', 'エレベーター', 'elevador', 4, 'tsu', 'rua'],
  ['birudingu', 'ビル', 'ビル', 'prédio', 5, 'tsu', 'predio'],
  ['byouin', '病院', 'びょういん', 'hospital', 5, 'tsu', 'predio'],
  ['gakkou', '学校', 'がっこう', 'escola', 5, 'tsu', 'predio'],
  ['jinja', '神社', 'じんじゃ', 'santuário xintoísta', 4, 'tsu', 'predio'],
  ['otera', 'お寺', 'おてら', 'templo budista', 4, 'tsu', 'predio'],
  ['hanabi', '花火', 'はなび', 'fogos de artifício', 4, 'tsu', 'tempo'],
  ['yuki', '雪', 'ゆき', 'neve', 5, 'tsu', 'tempo'],
  ['niji', '虹', 'にじ', 'arco-íris', 4, 'tsu', 'tempo'],
  ['kaminari', '雷', 'かみなり', 'trovão, raio', 4, 'tsu', 'tempo'],
  ['hoshi', '星', 'ほし', 'estrela', 5, 'tsu', 'tempo'],
  ['kawa', '川', 'かわ', 'rio', 5, 'hon', 'natureza'],
  ['shima', '島', 'しま', 'ilha', 4, 'tsu', 'natureza'],
  ['sakura', '桜', 'さくら', 'cerejeira (flor)', 4, 'hon', 'natureza'],
  ['ishi', '石', 'いし', 'pedra', 5, 'ko', 'natureza'],
  ['happa', '葉っぱ', 'はっぱ', 'folha', 4, 'mai', 'natureza'],
  ['take', '竹', 'たけ', 'bambu', 3, 'hon', 'natureza'],
  // corpo
  ['te', '手', 'て', 'mão', 5, 'tsu', 'corpo'],
  ['ashi', '足', 'あし', 'pé, perna', 5, 'tsu', 'corpo'],
  ['me', '目', 'め', 'olho', 5, 'tsu', 'corpo'],
  ['mimi', '耳', 'みみ', 'orelha, ouvido', 5, 'tsu', 'corpo'],
  ['kuchi', '口', 'くち', 'boca', 5, 'tsu', 'corpo'],
  ['ha', '歯', 'は', 'dente', 5, 'hon', 'corpo'],
  ['kao', '顔', 'かお', 'rosto', 5, 'tsu', 'corpo'],
];

/** Pessoas paradas (src/assets/gente): contam com 人 e, na Cena Viva, "estão" (います). [imagem, como se escreve, kana, significado, nível] */
const PESSOAS: readonly (readonly [string, string, string, string, Nivel])[] = [
  ['otokonoko', '男の子', 'おとこのこ', 'menino', 5],
  ['onnanoko', '女の子', 'おんなのこ', 'menina', 5],
  ['otokonohito', '男の人', 'おとこのひと', 'homem', 5],
  ['onnanohito', '女の人', 'おんなのひと', 'mulher', 5],
  ['akachan', '赤ちゃん', 'あかちゃん', 'bebê', 4],
  ['ojiisan', 'おじいさん', 'おじいさん', 'avô, senhor idoso', 5],
  ['obaasan', 'おばあさん', 'おばあさん', 'avó, senhora idosa', 5],
  ['kazoku', '家族', 'かぞく', 'família', 5],
  ['gakusei', '学生', 'がくせい', 'estudante', 5],
  ['sensei', '先生', 'せんせい', 'professor', 5],
  ['isha', '医者', 'いしゃ', 'médico', 5],
  ['kangoshi', '看護師', 'かんごし', 'enfermeiro, enfermeira', 4],
  ['keisatsukan', '警察官', 'けいさつかん', 'policial', 4],
  ['tenin', '店員', 'てんいん', 'funcionário da loja', 4],
  ['ekiin', '駅員', 'えきいん', 'funcionário da estação', 4],
  ['kaishain', '会社員', 'かいしゃいん', 'funcionário de empresa', 4],
];

/** Objetos desenhados em quatro cores. A imagem "neutra" (Memória) é a primeira cor. */
export const CORES = [
  { id: 'aka', jp: '赤い', kana: 'あかい', pt: 'vermelho' },
  { id: 'ao', jp: '青い', kana: 'あおい', pt: 'azul' },
  { id: 'kuro', jp: '黒い', kana: 'くろい', pt: 'preto' },
  { id: 'shiro', jp: '白い', kana: 'しろい', pt: 'branco' },
] as const;
export type CorId = (typeof CORES)[number]['id'];

const COLORIDOS: readonly Linha[] = [
  ['kasa', '傘', 'かさ', 'guarda-chuva', 5, 'hon', 'chuva'],
  ['kaban', 'かばん', 'かばん', 'bolsa', 5, 'tsu', 'viagem'],
  ['kuruma', '車', 'くるま', 'carro', 5, 'dai', 'veiculo'],
  ['boushi', '帽子', 'ぼうし', 'boné, chapéu', 5, 'tsu', 'roupa'],
  ['kutsu', '靴', 'くつ', 'sapato', 5, 'tsu', 'roupa'],
  ['shatsu', 'シャツ', 'シャツ', 'camiseta', 5, 'mai', 'roupa'],
];

/** [imagem, dicionário, kana, significado, nível, forma て, kana da forma て] */
const ACOES: readonly (readonly [string, string, string, string, Nivel, string, string])[] = [
  ['taberu', '食べる', 'たべる', 'comer', 5, '食べて', 'たべて'],
  ['nomu', '飲む', 'のむ', 'beber', 5, '飲んで', 'のんで'],
  ['yomu', '読む', 'よむ', 'ler', 5, '読んで', 'よんで'],
  ['kaku', '書く', 'かく', 'escrever', 5, '書いて', 'かいて'],
  ['neru', '寝る', 'ねる', 'dormir', 5, '寝て', 'ねて'],
  ['hashiru', '走る', 'はしる', 'correr', 5, '走って', 'はしって'],
  ['aruku', '歩く', 'あるく', 'andar a pé', 5, '歩いて', 'あるいて'],
  ['suwaru', '座る', 'すわる', 'sentar', 5, '座って', 'すわって'],
  ['tatsu', '立つ', 'たつ', 'ficar de pé', 5, '立って', 'たって'],
  ['denwasuru', '電話する', 'でんわする', 'telefonar', 5, '電話して', 'でんわして'],
  ['ryouri', '料理する', 'りょうりする', 'cozinhar', 4, '料理して', 'りょうりして'],
  ['arau', '洗う', 'あらう', 'lavar', 5, '洗って', 'あらって'],
  ['utau', '歌う', 'うたう', 'cantar', 5, '歌って', 'うたって'],
  ['naku', '泣く', 'なく', 'chorar', 4, '泣いて', 'ないて'],
  ['warau', '笑う', 'わらう', 'rir', 4, '笑って', 'わらって'],
  ['kiku', '聞く', 'きく', 'ouvir', 5, '聞いて', 'きいて'],
  ['souji', '掃除する', 'そうじする', 'limpar', 5, '掃除して', 'そうじして'],
  ['odoru', '踊る', 'おどる', 'dançar', 4, '踊って', 'おどって'],
  ['hakobu', '運ぶ', 'はこぶ', 'carregar (levar)', 4, '運んで', 'はこんで'],
  ['oyogu', '泳ぐ', 'およぐ', 'nadar', 5, '泳いで', 'およいで'],
  ['toru', '撮る', 'とる', 'tirar (foto)', 4, '撮って', 'とって'],
  ['kau', '払う', 'はらう', 'pagar', 4, '払って', 'はらって'],
  ['benkyou', '勉強する', 'べんきょうする', 'estudar', 5, '勉強して', 'べんきょうして'],
  // segunda leva
  ['okiru', '起きる', 'おきる', 'acordar', 5, '起きて', 'おきて'],
  ['miru', '見る', 'みる', 'ver, assistir', 5, '見て', 'みて'],
  ['hataraku', '働く', 'はたらく', 'trabalhar', 5, '働いて', 'はたらいて'],
  ['yasumu', '休む', 'やすむ', 'descansar', 5, '休んで', 'やすんで'],
  ['noru', '乗る', 'のる', 'andar em (veículo), embarcar', 5, '乗って', 'のって'],
  ['akeru', '開ける', 'あける', 'abrir', 5, '開けて', 'あけて'],
  ['asobu', '遊ぶ', 'あそぶ', 'brincar', 5, '遊んで', 'あそんで'],
  ['sentaku', '洗濯する', 'せんたくする', 'lavar roupa', 4, '洗濯して', 'せんたくして'],
  ['unten', '運転する', 'うんてんする', 'dirigir', 4, '運転して', 'うんてんして'],
  ['kiru', '着る', 'きる', 'vestir', 5, '着て', 'きて'],
  ['migaku', '磨く', 'みがく', 'escovar (os dentes), polir', 4, '磨いて', 'みがいて'],
  ['hiku', '弾く', 'ひく', 'tocar (instrumento)', 4, '弾いて', 'ひいて'],
  ['osu', '押す', 'おす', 'empurrar', 4, '押して', 'おして'],
  ['nageru', '投げる', 'なげる', 'arremessar', 4, '投げて', 'なげて'],
  ['noboru', '上る', 'のぼる', 'subir', 4, '上って', 'のぼって'],
  ['ayamaru', '謝る', 'あやまる', 'pedir desculpas', 4, '謝って', 'あやまって'],
  ['kangaeru', '考える', 'かんがえる', 'pensar', 4, '考えて', 'かんがえて'],
  ['okoru', '怒る', 'おこる', 'ficar bravo', 4, '怒って', 'おこって'],
  ['tsukareru', '疲れる', 'つかれる', 'cansar-se', 4, '疲れて', 'つかれて'],
];

const conhecidos = new Set(KANJI.map((k) => k.kanji));
const novas: Word[] = [];

/** A palavra que já existe no arcade, ou uma nova com o mesmo formato. */
function palavra(jp: string, kana: string, pt: string): Word {
  const id = `w:${jp}`;
  const ja = acharPalavra(id) ?? novas.find((w) => w.id === id);
  if (ja) return ja;
  const w: Word = { id, jp, kana, romaji: kanaToRomaji(kana), pt, kanji: [...jp].filter((c) => conhecidos.has(c)) };
  novas.push(w);
  return w;
}

export const FIGURAS: readonly Figura[] = [
  ...OBJETOS.map(([img, jp, kana, pt, nivel, contador, grupo]): Figura => ({ img, tipo: 'objeto', word: palavra(jp, kana, pt), nivel, contador, grupo })),
  ...COLORIDOS.map(([img, jp, kana, pt, nivel, contador, grupo]): Figura => ({ img: `${img}-aka`, tipo: 'objeto', word: palavra(jp, kana, pt), nivel, contador, grupo })),
  ...ACOES.map(([img, jp, kana, pt, nivel, te, teKana]): Figura => ({
    img,
    tipo: 'acao',
    word: palavra(jp, kana, pt),
    nivel,
    contador: 'nin',
    te: { jp: te, kana: teKana },
    grupo: 'acao',
  })),
  ...PESSOAS.map(([img, jp, kana, pt, nivel]): Figura => ({ img, tipo: 'pessoa', word: palavra(jp, kana, pt), nivel, contador: 'nin', grupo: 'pessoa' })),
];

/** Palavras das cores (赤い...), também cartas compartilhadas. */
export const PALAVRAS_COR: Readonly<Record<CorId, Word>> = Object.fromEntries(CORES.map((c) => [c.id, palavra(c.jp, c.kana, c.pt)])) as Record<CorId, Word>;

/** Base de cada objeto colorido (kasa, kaban...) → a figura dele. */
export const BASE_COLORIDA: ReadonlySet<string> = new Set(COLORIDOS.map((c) => c[0]));

/** Combinação de objeto e cor que não tem imagem (o guarda-chuva branco some no fundo). A cena não usa. */
export const SEM_IMAGEM: ReadonlySet<string> = new Set(['kasa-shiro']);

/** Só as palavras que nenhum outro conteúdo do arcade tinha. */
export const IMAGEM_WORDS: readonly Word[] = novas;

const porImg = new Map(FIGURAS.map((f) => [f.img, f]));
const porWord = new Map(FIGURAS.map((f) => [f.word.id, f]));

export function figura(img: string): Figura {
  const f = porImg.get(img) ?? porImg.get(`${img}-aka`);
  if (!f) throw new Error(`figura desconhecida: ${img}`);
  return f;
}

export function figuraDaPalavra(wordId: string): Figura | undefined {
  return porWord.get(wordId);
}
