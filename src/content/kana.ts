/**
 * Kana como imagem: cada kana com um desenho em que a letra é o objeto principal,
 * uma frase curta que liga o desenho ao som, os kana que confundem e uma palavra comum.
 *
 * A base veio de `escola-japones/src/content/kana.ts`, revisada (veja o relatório no README
 * do jogo e docs/kana.md). Os ids e as cartas são os mesmos do Kana Beat: `a:あ` e `ak:ア`,
 * habilidade `reading`. Quem aprendeu o kana num jogo já chega com ele no outro.
 */
import { cardKey } from './index';
import { hiraToKata, kanaToRomaji } from '../core/kana';

export type Escrita = 'hiragana' | 'katakana';
export type Grupo = 'basico' | 'tenten' | 'maru' | 'youon' | 'pequeno' | 'longo' | 'estrangeiro';

/** Desenhos simples que formam a cena em volta da letra (src/games/kanaimagens/rabiscos.ts). */
export const RABISCOS = [
  'dente', 'estrela', 'clipe', 'lua', 'som', 'grama', 'fumaca', 'cadeado', 'casa', 'chama', 'sol', 'garrafa',
  'linha', 'peixe', 'onda', 'copo', 'flor', 'tigela', 'martelo', 'gota', 'aranha', 'ovo', 'nuvem', 'olho',
  'vela', 'nota', 'passaro', 'bola', 'coracao', 'pensamento', 'arvore', 'seta', 'agulha', 'dado', 'pedra',
  'antena', 'barco', 'raio', 'presente', 'pizza', 'prateleira', 'geladeira', 'tapaolho', 'moeda', 'folha',
] as const;
export type Rabisco = (typeof RABISCOS)[number];

export interface Peca {
  r: Rabisco;
  x: number;
  y: number;
  /** Escala (1 = tamanho normal, uns 24 de 120). */
  s: number;
}

/** Cena de um kana básico. A letra fica no meio (60, 60 num quadro de 120). */
export interface Cena {
  /** O que a letra é no desenho, em poucas palavras ("anzol"). */
  objeto: string;
  pecas: Peca[];
}

export interface Exemplo {
  /** Como se escreve no dia a dia (com kanji quando é o normal). */
  jp: string;
  kana: string;
  pt: string;
}

export interface KanaItem {
  id: string;
  char: string;
  escrita: Escrita;
  grupo: Grupo;
  /** Romaji Hepburn, só para conferência depois da resposta. */
  romaji: string;
  /** Como soa para quem fala português do Brasil, quando o romaji engana. */
  soa?: string;
  mnemonico: string;
  /** Kana básico cuja cena é a base desta (が usa a de か, きゃ a de き). */
  base: string;
  cena: Cena;
  /** Marca desenhada por cima da cena da base: tracinhos, bolinha ou a cena encolhida (っ, ゃ). */
  marca?: 'tenten' | 'maru' | 'encolhido';
  /** Kana grande cuja cena aparece pequena no canto (き + や = きゃ, フ + ア = ファ). */
  mini?: string;
  /** ids dos kana que confundem com este (sempre nos dois sentidos). */
  parecidos: string[];
  exemplo: Exemplo;
  nota?: string;
  /** O que a voz fala quando o kana aparece. Kana que não soa sozinho (っ, ー) fala o exemplo. */
  fala: string;
  carta: string;
}

/* ───────── Cenas e mnemônicos dos básicos ───────── */

type Base = [char: string, objeto: string, mnemonico: string, pecas: string, exemplo: [jp: string, kana: string, pt: string], soa?: string];

const HIRAGANA: Base[] = [
  ['あ', 'boca aberta', 'A volta de baixo é uma boca bem aberta no dentista: "Aaa".', 'dente 100 24; estrela 20 28 .7', ['朝', 'あさ', 'manhã']],
  ['い', 'ilha', 'Uma ilha com dois coqueiros, um maior que o outro. "I" de ilha.', 'sol 100 22; onda 60 110', ['犬', 'いぬ', 'cachorro']],
  ['う', 'orelha', 'Uma orelha de brinco ouvindo o lobo uivar para a lua: "Uuu".', 'lua 22 24; som 100 60', ['海', 'うみ', 'mar'], 'u com os lábios quase sem arredondar'],
  ['え', 'ema', 'Uma ema correndo, com uma pena espetada na cabeça. "E" de ema.', 'grama 60 108; fumaca 104 96 .7', ['駅', 'えき', 'estação']],
  ['お', 'tropeço', 'Parece あ, mas tem um tracinho voando no canto: "Opa!", caiu o chapéu.', 'som 102 22 .8; estrela 22 100 .6', ['お茶', 'おちゃ', 'chá']],
  ['か', 'mosquito', 'Um mosquito de ferrão para baixo; o tracinho é a asa. Mosquito em japonês se diz "ka".', 'som 102 28 .8; gota 98 100 .8', ['傘', 'かさ', 'guarda-chuva']],
  ['き', 'chave', 'Uma chave antiga, com dentes. Em inglês chave é "key", que soa "ki".', 'cadeado 102 96', ['着物', 'きもの', 'quimono']],
  ['く', 'bico de cuco', 'O bico aberto do cuco saindo do relógio: "Cu-cu!".', 'casa 22 30; som 100 60', ['靴', 'くつ', 'sapato']],
  ['け', 'espeto de queijo', 'Dois espetos na brasa; no da direita tem queijo coalho. "Que" de queijo.', 'chama 40 108 .8; chama 80 108 .8', ['携帯', 'けいたい', 'celular'], 'que, como em "queijo"'],
  ['こ', 'cobra enrolada', 'Uma cobrinha enrolada tomando sol: as duas voltas do corpo são os dois traços. "Co" de cobra.', 'sol 100 22; grama 60 108', ['米', 'こめ', 'arroz (cru)']],
  ['さ', 'saca-rolhas', 'Um saca-rolhas: a cruz é o cabo, a curva é a rosca. "Sa" de saca-rolhas.', 'garrafa 102 92', ['魚', 'さかな', 'peixe']],
  ['し', 'anzol', 'Um anzol pendurado na linha, esperando o peixe. O pescador pede silêncio: "Shhh".', 'linha 36 0; peixe 98 98; onda 60 112 .8', ['塩', 'しお', 'sal'], 'xi, como em "xícara"'],
  ['す', 'canudo', 'Um canudo que dá uma volta antes de chegar no copo. "Su" de suco.', 'copo 100 96', ['寿司', 'すし', 'sushi']],
  ['せ', 'cerca', 'Um pedaço de cerca com uma tábua dobrada embaixo. "Ce" de cerca.', 'grama 60 110; flor 102 96 .8', ['席', 'せき', 'lugar, assento']],
  ['そ', 'fumaça da sopa', 'Fumaça em zigue-zague subindo de uma sopa quente. "So" de sopa.', 'tigela 60 106', ['空', 'そら', 'céu']],
  ['た', 'tábuas', 'Uma cruz e duas tábuas empilhadas ao lado. "Ta" de tábua.', 'martelo 102 98', ['卵', 'たまご', 'ovo']],
  ['ち', 'mergulho', 'Alguém pulando de barriga na piscina: "Tchibum!".', 'onda 60 110; gota 100 36 .7; gota 108 54 .6', ['地図', 'ちず', 'mapa'], 'tchi, como "tia" falado no Rio'],
  ['つ', 'tsunami', 'Uma onda enorme se curvando. "Tsu" de tsunami.', 'barco 100 100; onda 26 104 .8', ['机', 'つくえ', 'mesa de estudo'], 'tsu, com o t e o s colados'],
  ['て', 'teia', 'Uma aranha descendo pelo fio da teia. "Te" de teia.', 'aranha 62 106 .8', ['手', 'て', 'mão'], 'te, sem virar "tchi"'],
  ['と', 'martelo', 'Um martelo batendo forte na madeira: "toc".', 'martelo 100 28; grama 60 110 .6', ['鳥', 'とり', 'pássaro']],
  ['な', 'nadador', 'Alguém nadando: a cruz são os braços, a volta é a onda. "Na" de nadar.', 'onda 60 110; gota 102 36 .7', ['夏', 'なつ', 'verão']],
  ['に', 'ninho', 'Um galho em pé e, ao lado, os dois gravetos de um ninho. "Ni" de ninho.', 'passaro 100 26; ovo 102 98 .8', ['肉', 'にく', 'carne'], 'ni, sem virar "nhi"'],
  ['ぬ', 'nuvem enrolada', 'Uma nuvem que se enrola e termina num laço de chuva. "Nu" de nuvem.', 'gota 30 106 .7; gota 50 112 .6; sol 102 22 .8', ['ぬいぐるみ', 'ぬいぐるみ', 'bicho de pelúcia']],
  ['ね', 'gato', 'Um gato deitado; o laço é o rabo enrolado. Gato em japonês é ねこ, "neko".', 'peixe 102 100 .8', ['猫', 'ねこ', 'gato']],
  ['の', 'novelo', 'Um novelo de lã visto de cima. "No" de novelo.', 'agulha 102 26', ['海苔', 'のり', 'alga nori']],
  ['は', 'risada', 'Alguém pendurado num poste, rindo: "Ha ha!".', 'som 102 30', ['花', 'はな', 'flor'], 'ha, com o h soprado de uma risada'],
  ['ひ', 'sorriso', 'Um sorrisão de orelha a orelha, rindo baixinho: "Hi hi hi".', 'olho 44 24 .7; olho 76 24 .7', ['人', 'ひと', 'pessoa'], 'hi, com o h soprado'],
  ['ふ', 'sopro', 'Um bolo de aniversário: o sopro que apaga as velas faz "Fuu". O som sai só dos lábios, sem encostar os dentes.', 'vela 102 98; som 104 38 .8', ['船', 'ふね', 'barco'], 'fu de sopro, com os lábios, não o f de "faca"'],
  ['へ', 'morrinho', 'Um morrinho. Quem sobe chega sem fôlego: "He... he...".', 'sol 100 24; nuvem 24 28 .7', ['部屋', 'へや', 'quarto'], 'he, com o h soprado'],
  ['ほ', 'chaminé', 'Igual a は com um traço a mais em cima: a chaminé por onde o Papai Noel desce, "Ho ho ho!".', 'fumaca 26 20 .8; presente 102 100 .8', ['本', 'ほん', 'livro'], 'ho, com o h soprado'],
  ['ま', 'mastro', 'Um mastro de barco com duas velas e a corda enrolada embaixo. "Ma" de mastro.', 'onda 60 112; passaro 102 24 .7', ['窓', 'まど', 'janela']],
  ['み', 'nota musical', 'Uma nota musical com a perninha cruzada. Dó, ré, "mi".', 'nota 102 28; nota 20 40 .7', ['耳', 'みみ', 'orelha']],
  ['む', 'vaca', 'Uma vaca de perfil, chifre em cima e rabo do lado: "Muu".', 'grama 60 110; som 104 50 .7', ['虫', 'むし', 'inseto']],
  ['め', 'olho', 'Um olho com o cílio cruzando. Olho em japonês é め, "me".', 'estrela 102 24 .7; gota 98 92 .6', ['目', 'め', 'olho']],
  ['も', 'isca', 'Um anzol com duas minhocas penduradas, todo molhado. "Mo" de molhado.', 'gota 26 92 .7; peixe 100 100 .8', ['桃', 'もも', 'pêssego']],
  ['や', 'iate', 'Um iate de vela aberta no mar. "Ia" de iate.', 'onda 60 112; sol 102 22 .8', ['山', 'やま', 'montanha'], 'ia'],
  ['ゆ', 'peixe no anzol', 'Um peixe dá a volta no anzol, todo feliz: "Iupi!".', 'onda 60 112; gota 102 28 .7', ['雪', 'ゆき', 'neve'], 'iu'],
  ['よ', 'ioiô', 'Um ioiô pendurado no dedo. "Io" de ioiô.', 'som 104 92 .8; estrela 20 30 .6', ['夜', 'よる', 'noite'], 'io'],
  ['ら', 'arara', 'Uma arara sentada no galho; o tracinho é o topete. "Ra" de arara.', 'folha 104 92; folha 20 96 .7', ['来年', 'らいねん', 'próximo ano'], 'ra com o r fraco de "arara", nunca o de "rato"'],
  ['り', 'siri', 'As duas patas de um siri saindo da areia. "Ri" de siri.', 'onda 60 112 .8; sol 102 22 .8; pedra 24 104 .7', ['りんご', 'りんご', 'maçã'], 'ri com o r fraco de "siri"'],
  ['る', 'canguru', 'Um canguru pulando, com o rabo enrolado no fim. "Ru" de canguru.', 'som 104 70 .8; grama 60 112 .7', ['猿', 'さる', 'macaco'], 'ru com o r fraco de "canguru"'],
  ['れ', 'chute', 'Uma perna dando um chute na bola, e a cara de quem fez força: "re" de careta.', 'bola 106 92', ['冷蔵庫', 'れいぞうこ', 'geladeira'], 're com o r fraco de "careta"'],
  ['ろ', 'garoto gritando', 'Um garoto de boca aberta, chamando o amigo: "ro" de garoto. Diferente de る, não tem laço no fim.', 'som 104 56', ['色', 'いろ', 'cor'], 'ro com o r fraco de "garoto"'],
  ['わ', 'abraço', 'Alguém abrindo os braços para um abraço apertado: "Uau!".', 'coracao 102 24 .8', ['私', 'わたし', 'eu'], 'ua'],
  ['を', 'surfista', 'Um surfista em cima da onda gritando "Ôôô!".', 'onda 60 112; sol 102 22 .7', ['手を洗う', 'てをあらう', 'lavar as mãos'], 'o, igual a お'],
  ['ん', 'pensando', 'Alguém sentado com a perna esticada, pensando: "Hmm".', 'pensamento 102 24', ['天気', 'てんき', 'tempo (clima)'], 'n, m ou ng, conforme a letra que vem depois'],
];

const KATAKANA: Base[] = [
  ['ア', 'machado', 'Um machado cortando a árvore: a lâmina em cima, o cabo curvo embaixo. "A" de árvore.', 'arvore 102 92', ['アイス', 'アイス', 'sorvete']],
  ['イ', 'pessoa encostada', 'Alguém encostado num poste, todo inclinado. "I" de inclinado.', 'lua 102 24 .8; grama 60 110 .7', ['イヤホン', 'イヤホン', 'fone de ouvido']],
  ['ウ', 'fantasma de capuz', 'Igual a う, agora de capuz: um fantasma fazendo "Uuu".', 'lua 102 22; estrela 20 30 .6', ['ウイルス', 'ウイルス', 'vírus'], 'u com os lábios quase sem arredondar'],
  ['エ', 'elevador', 'O poço de um elevador: teto em cima, chão embaixo. "E" de elevador.', 'seta 104 50; seta 104 80 .8', ['エアコン', 'エアコン', 'ar-condicionado']],
  ['オ', 'susto', 'Alguém caindo para trás de susto, braços abertos: "Ôôô!".', 'som 102 30; estrela 22 100 .6', ['オレンジ', 'オレンジ', 'laranja']],
  ['カ', 'mosquito', 'Igual a か sem o tracinho: o mosquito perdeu a asa, mas o nome continua "ka".', 'som 102 30 .8', ['カメラ', 'カメラ', 'câmera']],
  ['キ', 'chave', 'Igual a き sem a curva de baixo: a chave só com os dentes. "Ki" de "key".', 'cadeado 102 98', ['キロ', 'キロ', 'quilo']],
  ['ク', 'bico de cuco', 'O bico do cuco, só que reto: dois traços. "Cu-cu!".', 'casa 22 30 .9; som 100 60 .8', ['クッキー', 'クッキー', 'biscoito']],
  ['ケ', 'espeto de queijo', 'Um espeto torto com o queijo na ponta de cima. "Que" de queijo.', 'chama 60 110 .8', ['ケーキ', 'ケーキ', 'bolo'], 'que, como em "queijo"'],
  ['コ', 'contêiner', 'Um contêiner aberto de lado, no porto. "Co" de contêiner.', 'onda 60 112 .8; barco 104 104 .7', ['コーヒー', 'コーヒー', 'café']],
  ['サ', 'sacola', 'Uma sacola com duas alças, uma mais comprida. "Sa" de sacola.', 'moeda 102 98 .8', ['サラダ', 'サラダ', 'salada']],
  ['シ', 'vento com chuva', 'Gotas de chuva vindo de lado com o vento. O traço longo sobe, como o vento que sopra: "Shhh".', 'nuvem 22 22 .8; arvore 104 96 .8', ['タクシー', 'タクシー', 'táxi'], 'xi, como em "xícara"'],
  ['ス', 'surfista', 'Um surfista em pé na prancha, perna para trás. "Su" de surfista.', 'onda 60 112; sol 102 22 .7', ['スマホ', 'スマホ', 'celular']],
  ['セ', 'cerca', 'Igual a せ, sem a curva: o pedaço de cerca. "Ce" de cerca.', 'grama 60 110; flor 102 96 .8', ['セーター', 'セーター', 'suéter']],
  ['ソ', 'colher pingando', 'A colher pinga e a sopa escorre de cima para baixo. "So" de sopa. O traço longo desce.', 'tigela 60 108; gota 30 92 .6', ['ソース', 'ソース', 'molho']],
  ['タ', 'tábua no bico', 'O bico de ク com uma tábua atravessada no meio. "Ta" de tábua.', 'martelo 102 98', ['タオル', 'タオル', 'toalha']],
  ['チ', 'mergulho', 'O mergulhador de ち, agora de chapéu, pulando: "Tchibum!".', 'onda 60 112; gota 102 40 .7', ['チーズ', 'チーズ', 'queijo'], 'tchi, como "tia" falado no Rio'],
  ['ツ', 'tsunami', 'Duas gotas lado a lado em cima e uma onda que cai de cima. "Tsu" de tsunami.', 'barco 104 104 .8; onda 22 108 .7', ['ツアー', 'ツアー', 'excursão'], 'tsu, com o t e o s colados'],
  ['テ', 'antena de TV', 'Uma antena de TV antiga no telhado. "Te" de テレビ, televisão.', 'casa 60 108 .9; som 104 26 .7', ['テレビ', 'テレビ', 'televisão'], 'te, sem virar "tchi"'],
  ['ト', 'tronco', 'Um tronco com um galho para a direita, e o pica-pau batendo: "toc, toc".', 'passaro 100 30 .8; grama 60 110 .7', ['トイレ', 'トイレ', 'banheiro']],
  ['ナ', 'nadador', 'O nadador de な sem a onda: uma cruz de perna torta. "Na" de nadar.', 'onda 60 112; gota 102 36 .7', ['ナイフ', 'ナイフ', 'faca']],
  ['ニ', 'número dois', 'Dois traços: o número dois, 二, que se lê に, "ni".', 'dado 102 98', ['テニス', 'テニス', 'tênis (esporte)'], 'ni, sem virar "nhi"'],
  ['ヌ', 'raio na nuvem', 'Um raio atravessando a nuvem: ス com um risco no meio. "Nu" de nuvem.', 'nuvem 22 24 .8; gota 100 100 .7', ['カヌー', 'カヌー', 'canoa']],
  ['ネ', 'gato', 'Um gato sentado de costas, orelha em cima e rabo embaixo. ねこ, "neko", de novo.', 'peixe 102 100 .8', ['ネクタイ', 'ネクタイ', 'gravata']],
  ['ノ', 'novelo', 'Um fio só: o novelo de の desenrolado. "No" de novelo.', 'agulha 102 26', ['ノート', 'ノート', 'caderno']],
  ['ハ', 'risada', 'Dois traços se abrindo, como uma boca rindo: "Ha ha".', 'som 102 30', ['ハンバーガー', 'ハンバーガー', 'hambúrguer'], 'ha, com o h soprado de uma risada'],
  ['ヒ', 'sorriso', 'Meio sorriso: a boca de ひ vista de lado, rindo baixinho: "Hi hi".', 'som 102 30 .8; grama 60 112 .7', ['ヒーター', 'ヒーター', 'aquecedor'], 'hi, com o h soprado'],
  ['フ', 'bandeira ao vento', 'Uma bandeira dobrada pelo vento: o sopro "fuu". Saem só os lábios, sem os dentes.', 'som 24 60; nuvem 100 26 .7', ['フルーツ', 'フルーツ', 'frutas'], 'fu de sopro, com os lábios, não o f de "faca"'],
  ['ヘ', 'morrinho', 'Igual a へ: o morrinho. "He... he..."', 'nuvem 24 26 .8; sol 102 22 .8', ['ヘルメット', 'ヘルメット', 'capacete'], 'he, com o h soprado'],
  ['ホ', 'árvore de Natal', 'Uma árvore de Natal com dois enfeites: "Ho ho ho!".', 'estrela 60 8 .8; presente 102 102 .8', ['ホテル', 'ホテル', 'hotel'], 'ho, com o h soprado'],
  ['マ', 'fatia de pizza', 'Uma fatia de pizza de ponta para baixo. "Ma" de massa.', 'pizza 102 98 .8; fumaca 24 24 .6', ['マスク', 'マスク', 'máscara']],
  ['ミ', 'minhocas', 'Minhocas subindo da terra. "Mi" de minhoca.', 'grama 60 112; sol 102 22 .7', ['ミルク', 'ミルク', 'leite']],
  ['ム', 'vaca', 'O focinho de uma vaca de perfil: "Muu".', 'grama 60 112; som 104 40 .7', ['ゲーム', 'ゲーム', 'jogo, videogame']],
  ['メ', 'tapa-olho', 'Um X tapando o olho, como um tapa-olho de pirata. め é olho.', 'tapaolho 102 26 .8; barco 102 100 .7', ['メール', 'メール', 'e-mail']],
  ['モ', 'isca', 'Igual a も com o traço de baixo reto: o anzol com as minhocas. "Mo" de molhado.', 'gota 24 92 .7; peixe 100 100 .8', ['メモ', 'メモ', 'anotação']],
  ['ヤ', 'iate', 'Quase igual a や: o iate. "Ia" de iate.', 'onda 60 112; sol 102 22 .8', ['タイヤ', 'タイヤ', 'pneu'], 'ia'],
  ['ユ', 'banheira', 'Uma banheira vista de lado. Água quente em japonês é ゆ, "yu".', 'fumaca 40 18 .7; fumaca 70 18 .7; gota 104 96 .6', ['ユニフォーム', 'ユニフォーム', 'uniforme'], 'iu'],
  ['ヨ', 'geladeira de iogurte', 'Três prateleiras da geladeira, cheias de iogurte. "Io" de iogurte.', 'geladeira 102 92 .8; copo 22 98 .6', ['ヨーグルト', 'ヨーグルト', 'iogurte'], 'io'],
  ['ラ', 'arara', 'O bico da arara com o topete em cima. "Ra" de arara.', 'folha 104 94; folha 22 98 .7', ['ラーメン', 'ラーメン', 'lámen'], 'ra com o r fraco de "arara", nunca o de "rato"'],
  ['リ', 'siri', 'Igual a り: as patas do siri. "Ri" de siri.', 'onda 60 112 .8; pedra 24 104 .7', ['リモコン', 'リモコン', 'controle remoto'], 'ri com o r fraco de "siri"'],
  ['ル', 'canguru', 'Duas pernas, a de trás com o pé levantado: o canguru pulando. "Ru" de canguru.', 'som 104 60 .8; grama 60 112 .7', ['ルール', 'ルール', 'regra'], 'ru com o r fraco de "canguru"'],
  ['レ', 'chute', 'A perna do chute de れ, sozinha. "Re" de careta.', 'bola 104 90', ['レストラン', 'レストラン', 'restaurante'], 're com o r fraco de "careta"'],
  ['ロ', 'garoto gritando', 'A boca do garoto de ろ, agora quadrada (口 é boca). "Ro" de garoto.', 'som 104 56', ['ロッカー', 'ロッカー', 'armário com chave'], 'ro com o r fraco de "garoto"'],
  ['ワ', 'abraço', 'Um braço envolvendo alguém: "Uau!". Parece ウ sem o tracinho.', 'coracao 102 24 .8', ['ワイン', 'ワイン', 'vinho'], 'ua'],
  ['ヲ', 'prancha de surfe', 'フ com um traço no meio: a prancha do surfista de を. Se lê "o".', 'onda 60 112; sol 102 22 .7', ['ヲタク', 'ヲタク', 'otaku (escrita de brincadeira)'], 'o, igual a オ'],
  ['ン', 'pensando', 'Um pontinho e um traço que SOBE de baixo, como quem levanta o olhar pensando: "Hmm".', 'pensamento 102 24', ['パン', 'パン', 'pão'], 'n, m ou ng, conforme a letra que vem depois'],
];

/** Pares que confundem, nos dois sentidos. Escritos com o caractere, viram id mais embaixo. */
export const GRUPOS_PARECIDOS: readonly string[][] = [
  ['シ', 'ツ'],
  ['ソ', 'ン'],
  ['シ', 'ン'],
  ['ツ', 'ソ'],
  ['ぬ', 'め'],
  ['わ', 'れ', 'ね'],
  ['る', 'ろ'],
  ['さ', 'ち'],
  ['さ', 'き'],
  ['ら', 'ち'],
  ['は', 'ほ'],
  ['ま', 'ほ'],
  ['あ', 'お'],
  ['い', 'り'],
  ['た', 'な'],
  ['ク', 'ケ', 'タ'],
  ['ス', 'ヌ'],
  ['コ', 'ユ'],
  ['ア', 'マ'],
  ['マ', 'ム'],
  ['ウ', 'ワ', 'フ'],
  ['チ', 'テ'],
  ['ナ', 'メ'],
  ['ロ', 'コ'],
  ['ぬ', 'ね'],
  ['め', 'あ'],
];

/* ───────── O que muda nos derivados ───────── */

/** Som de cada kana para quem fala português, nos que enganam. */
const SOA_EXTRA: Record<string, string> = {
  ぎ: 'gui, como em "guitarra", nunca "ji"',
  げ: 'gue, como em "guerra", nunca "je"',
  じ: 'dji, como "dia" falado no Rio',
  ぢ: 'dji, igual a じ',
  づ: 'zu, igual a ず',
  ず: 'zu',
  ぶ: 'bu',
  ぴ: 'pi',
  きゃ: 'kia numa batida só',
  しゃ: 'xa, como em "xará"',
  しゅ: 'xu, como em "chuva"',
  しょ: 'xo, como em "chocolate"',
  ちゃ: 'tcha',
  ちゅ: 'tchu',
  ちょ: 'tcho',
  にゃ: 'nha, como em "manhã"',
  にゅ: 'nhu',
  にょ: 'nho, como em "nhoque"',
  じゃ: 'dja',
  じゅ: 'dju',
  じょ: 'djo',
  ぎゃ: 'guia numa batida só',
  ぎゅ: 'guiu numa batida só',
  ぎょ: 'guio numa batida só',
  りゃ: 'ria com o r fraco, numa batida só',
  りゅ: 'riu com o r fraco, numa batida só',
  りょ: 'rio com o r fraco, numa batida só',
};

/** Exemplo dos derivados e combinados (hiragana e katakana). */
const EXEMPLOS: Record<string, [jp: string, kana: string, pt: string]> = {
  が: ['学校', 'がっこう', 'escola'], ぎ: ['銀行', 'ぎんこう', 'banco'], ぐ: ['家具', 'かぐ', 'móveis'], げ: ['元気', 'げんき', 'saudável, com energia'], ご: ['ご飯', 'ごはん', 'arroz cozido, refeição'],
  ざ: ['雑誌', 'ざっし', 'revista'], じ: ['時間', 'じかん', 'tempo, horas'], ず: ['水', 'みず', 'água'], ぜ: ['全部', 'ぜんぶ', 'tudo'], ぞ: ['象', 'ぞう', 'elefante'],
  だ: ['大学', 'だいがく', 'universidade'], ぢ: ['鼻血', 'はなぢ', 'sangue do nariz'], づ: ['続く', 'つづく', 'continuar'], で: ['電話', 'でんわ', 'telefone'], ど: ['どこ', 'どこ', 'onde'],
  ば: ['晩ご飯', 'ばんごはん', 'jantar'], び: ['蛇', 'へび', 'cobra'], ぶ: ['豚', 'ぶた', 'porco'], べ: ['弁当', 'べんとう', 'marmita'], ぼ: ['帽子', 'ぼうし', 'chapéu'],
  ぱ: ['乾杯', 'かんぱい', 'saúde! (no brinde)'], ぴ: ['ぴかぴか', 'ぴかぴか', 'brilhando'], ぷ: ['天ぷら', 'てんぷら', 'tempurá'], ぺ: ['ぺこぺこ', 'ぺこぺこ', 'morrendo de fome'], ぽ: ['散歩', 'さんぽ', 'passeio a pé'],
  ガ: ['ガム', 'ガム', 'chiclete'], ギ: ['ギター', 'ギター', 'violão, guitarra'], グ: ['グループ', 'グループ', 'grupo'], ゲ: ['ゲーム', 'ゲーム', 'jogo, videogame'], ゴ: ['ゴルフ', 'ゴルフ', 'golfe'],
  ザ: ['デザート', 'デザート', 'sobremesa'], ジ: ['ジム', 'ジム', 'academia'], ズ: ['サイズ', 'サイズ', 'tamanho'], ゼ: ['ゼロ', 'ゼロ', 'zero'], ゾ: ['アマゾン', 'アマゾン', 'Amazônia'],
  ダ: ['ダンス', 'ダンス', 'dança'], デ: ['デパート', 'デパート', 'loja de departamentos'], ド: ['ドア', 'ドア', 'porta'],
  バ: ['バス', 'バス', 'ônibus'], ビ: ['ビザ', 'ビザ', 'visto'], ブ: ['ブラジル', 'ブラジル', 'Brasil'], ベ: ['ベッド', 'ベッド', 'cama'], ボ: ['ボタン', 'ボタン', 'botão'],
  パ: ['パスポート', 'パスポート', 'passaporte'], ピ: ['ピアノ', 'ピアノ', 'piano'], プ: ['プール', 'プール', 'piscina'], ペ: ['ペン', 'ペン', 'caneta'], ポ: ['ポスト', 'ポスト', 'caixa de correio'],
  きゃ: ['お客さん', 'おきゃくさん', 'cliente, visita'], きゅ: ['九州', 'きゅうしゅう', 'região de Kyushu'], きょ: ['今日', 'きょう', 'hoje'],
  しゃ: ['電車', 'でんしゃ', 'trem'], しゅ: ['宿題', 'しゅくだい', 'lição de casa'], しょ: ['食事', 'しょくじ', 'refeição'],
  ちゃ: ['茶碗', 'ちゃわん', 'tigela de arroz'], ちゅ: ['中国', 'ちゅうごく', 'China'], ちょ: ['ちょっと', 'ちょっと', 'um pouco'],
  にゃ: ['こんにゃく', 'こんにゃく', 'konjac (gelatina de batata)'], にゅ: ['牛乳', 'ぎゅうにゅう', 'leite'], にょ: ['にょろにょろ', 'にょろにょろ', 'se arrastando como cobra'],
  ひゃ: ['百円', 'ひゃくえん', '100 ienes'], ひゅ: ['ひゅうひゅう', 'ひゅうひゅう', 'assobio do vento'], ひょ: ['標識', 'ひょうしき', 'placa de trânsito'],
  みゃ: ['脈', 'みゃく', 'pulso'], みゅ: ['ミュージック', 'ミュージック', 'música'], みょ: ['名字', 'みょうじ', 'sobrenome'],
  りゃ: ['略', 'りゃく', 'abreviação'], りゅ: ['留学', 'りゅうがく', 'intercâmbio'], りょ: ['旅行', 'りょこう', 'viagem'],
  ぎゃ: ['逆', 'ぎゃく', 'ao contrário'], ぎゅ: ['牛肉', 'ぎゅうにく', 'carne de boi'], ぎょ: ['餃子', 'ぎょうざ', 'guioza'],
  じゃ: ['じゃあね', 'じゃあね', 'tchau'], じゅ: ['十分', 'じゅうぶん', 'suficiente'], じょ: ['上手', 'じょうず', 'habilidoso'],
  びゃ: ['三百', 'さんびゃく', '300'], びゅ: ['びゅうびゅう', 'びゅうびゅう', 'vento forte soprando'], びょ: ['病院', 'びょういん', 'hospital'],
  ぴゃ: ['八百', 'はっぴゃく', '800'], ぴゅ: ['コンピューター', 'コンピューター', 'computador'], ぴょ: ['発表', 'はっぴょう', 'apresentação'],
  キャ: ['キャンプ', 'キャンプ', 'acampamento'], キュ: ['バーベキュー', 'バーベキュー', 'churrasco'], キョ: ['キョロキョロ', 'キョロキョロ', 'olhando para todo lado'],
  シャ: ['シャツ', 'シャツ', 'camisa'], シュ: ['シューズ', 'シューズ', 'tênis (calçado)'], ショ: ['ショッピング', 'ショッピング', 'compras'],
  チャ: ['チャンス', 'チャンス', 'chance'], チュ: ['チューブ', 'チューブ', 'tubo, bisnaga'], チョ: ['チョコレート', 'チョコレート', 'chocolate'],
  ニャ: ['ニャー', 'ニャー', 'miau'], ニュ: ['ニュース', 'ニュース', 'notícias'], ニョ: ['ニョッキ', 'ニョッキ', 'nhoque'],
  ヒャ: ['百円', 'ひゃくえん', '100 ienes'], ヒュ: ['ヒューズ', 'ヒューズ', 'fusível'], ヒョ: ['ヒョウ', 'ヒョウ', 'leopardo'],
  ミャ: ['ミャンマー', 'ミャンマー', 'Mianmar'], ミュ: ['ミュージック', 'ミュージック', 'música'], ミョ: ['ミョウガ', 'ミョウガ', 'myoga (broto de gengibre)'],
  リャ: ['リャマ', 'リャマ', 'lhama'], リュ: ['リュック', 'リュック', 'mochila'], リョ: ['旅行', 'りょこう', 'viagem'],
  ギャ: ['ギャグ', 'ギャグ', 'piada'], ギュ: ['牛肉', 'ぎゅうにく', 'carne de boi'], ギョ: ['ギョーザ', 'ギョーザ', 'guioza'],
  ジャ: ['ジャケット', 'ジャケット', 'jaqueta'], ジュ: ['ジュース', 'ジュース', 'suco'], ジョ: ['ジョギング', 'ジョギング', 'corrida, cooper'],
  ビャ: ['三百', 'さんびゃく', '300'], ビュ: ['ビュッフェ', 'ビュッフェ', 'bufê'], ビョ: ['病院', 'びょういん', 'hospital'],
  ピャ: ['八百', 'はっぴゃく', '800'], ピュ: ['コンピューター', 'コンピューター', 'computador'], ピョ: ['ピョンピョン', 'ピョンピョン', 'pulando'],
};

/** Combinados que quase só aparecem na outra escrita: o exemplo vem dela, e a nota avisa. */
const NOTA_RARO: Record<string, string> = {
  みゅ: 'Quase só aparece em katakana, como em ミュージック.',
  ぴゅ: 'Quase só aparece em katakana, como em コンピューター.',
  ひゅ: 'Aparece pouco. Mais em sons, como ひゅうひゅう.',
  びゅ: 'Aparece pouco. Mais em sons, como びゅうびゅう.',
  ヒャ: 'Quase não aparece em katakana. O som é o de ひゃ, como em ひゃくえん.',
  リョ: 'Quase não aparece em katakana. O som é o de りょ, como em りょこう.',
  ギュ: 'Quase não aparece em katakana. O som é o de ぎゅ, como em ぎゅうにく.',
  ビャ: 'Quase não aparece em katakana. O som é o de びゃ, como em さんびゃく.',
  ビョ: 'Quase não aparece em katakana. O som é o de びょ, como em びょういん.',
  ピャ: 'Quase não aparece em katakana. O som é o de ぴゃ, como em はっぴゃく.',
};

const NOTAS: Record<string, string> = {
  は: 'Como partícula (わたしは), は se lê "wa".',
  へ: 'Como partícula de direção (にほんへ), へ se lê "e".',
  を: 'Hoje só aparece como partícula e se lê "o". A grafia "wo" é só do romaji.',
  ヲ: 'Quase nunca aparece. Às vezes em letreiro antigo ou de brincadeira, como ヲタク.',
  ん: 'Antes de b, p e m soa "m" (さんぽ, sampo). Antes de k e g soa "ng" (てんき, tenki). No fim da palavra é um "n" nasal, como em "pão".',
  ン: 'Antes de b, p e m soa "m". Antes de k e g soa "ng". No fim da palavra é um "n" nasal: パン soa quase como "pã".',
  ぢ: 'Mesmo som de じ. Aparece em poucas palavras, quase sempre quando ち vira ぢ: はな + ち = はなぢ.',
  づ: 'Mesmo som de ず. Aparece quando つ se repete ou vira づ: つづく.',
  ふ: 'Os lábios ficam quase fechados, como quem sopra uma vela. Os dentes não encostam.',
  フ: 'Os lábios ficam quase fechados, como quem sopra uma vela. Os dentes não encostam.',
  ら: 'Toda a linha ら, り, る, れ, ろ usa o r fraco de "arara" e "caro". O r forte de "rato" não existe em japonês.',
  ラ: 'Toda a linha ラ, リ, ル, レ, ロ usa o r fraco de "arara" e "caro".',
  ち: 'Diferente de て: て é "te" mesmo, sem chiar.',
  つ: 'O t e o s saem juntos, rápido, como no fim de "tsunami".',
};

/** Nome do arquivo da ilustração de um objeto (scripts/imagens/kana.json): "fumaça da sopa" → "fumaca-da-sopa". */
export function imagemDoObjeto(objeto: string): string {
  return objeto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/* ───────── Montagem ───────── */

function parsePecas(spec: string): Peca[] {
  return spec.split(';').map((p) => {
    const [r, x, y, s] = p.trim().split(/\s+/);
    if (!(RABISCOS as readonly string[]).includes(r as string)) throw new Error(`rabisco desconhecido: ${r}`);
    return { r: r as Rabisco, x: Number(x), y: Number(y), s: s ? Number(s) : 1 };
  });
}

const romajiDe = (char: string) => kanaToRomaji(char).replace(/'/g, '');
const idDe = (char: string, escrita: Escrita) => (escrita === 'hiragana' ? `a:${char}` : `ak:${char}`);
const exemplo = ([jp, kana, pt]: [string, string, string]): Exemplo => ({ jp, kana, pt });

const itens: KanaItem[] = [];
const porChar = new Map<string, KanaItem>();

function add(item: Omit<KanaItem, 'carta' | 'parecidos'> & { parecidos?: string[] }): KanaItem {
  const full: KanaItem = { ...item, parecidos: item.parecidos ?? [], carta: cardKey(item.id, 'reading') };
  if (porChar.has(full.char)) throw new Error(`kana repetido: ${full.char}`);
  itens.push(full);
  porChar.set(full.char, full);
  return full;
}

function basicos(lista: Base[], escrita: Escrita): void {
  for (const [char, objeto, mnemonico, pecas, ex, soa] of lista) {
    add({
      id: idDe(char, escrita),
      char,
      escrita,
      grupo: 'basico',
      romaji: char === 'を' || char === 'ヲ' ? 'o' : romajiDe(char),
      soa,
      mnemonico,
      base: char,
      cena: { objeto, pecas: parsePecas(pecas) },
      exemplo: exemplo(ex),
      nota: NOTAS[char],
      fala: char,
    });
  }
}

const TENTEN_DE: Record<string, string> = {};
for (const [base, row] of [
  ['かきくけこ', 'がぎぐげご'],
  ['さしすせそ', 'ざじずぜぞ'],
  ['たちつてと', 'だぢづでど'],
  ['はひふへほ', 'ばびぶべぼ'],
] as const) [...row].forEach((c, i) => (TENTEN_DE[c] = base[i] as string));
const MARU_DE: Record<string, string> = {};
[...'ぱぴぷぺぽ'].forEach((c, i) => (MARU_DE[c] = 'はひふへほ'[i] as string));

function derivados(escrita: Escrita): void {
  const conv = (c: string) => (escrita === 'hiragana' ? c : hiraToKata(c));
  for (const [hira, baseHira] of [...Object.entries(TENTEN_DE), ...Object.entries(MARU_DE)]) {
    const char = conv(hira);
    const baseChar = conv(baseHira);
    const base = porChar.get(baseChar);
    if (!base) throw new Error(`base desconhecida: ${baseChar}`);
    // ヂ e ヅ quase não existem em katakana: ficam de fora.
    if (escrita === 'katakana' && (hira === 'ぢ' || hira === 'づ')) continue;
    const maru = hira in MARU_DE;
    const som = romajiDe(char);
    const mnemonico = maru
      ? `É ${baseChar} (${base.cena.objeto}) com uma bolinha (゜, maru). Com a bolinha, o som estoura nos lábios: "${base.romaji}" vira "${som}".`
      : `É ${baseChar} (${base.cena.objeto}) com dois tracinhos (゛, tenten). Os tracinhos fazem a garganta vibrar: "${base.romaji}" vira "${som}".`;
    const ex = EXEMPLOS[char];
    if (!ex) throw new Error(`sem exemplo: ${char}`);
    add({
      id: idDe(char, escrita),
      char,
      escrita,
      grupo: maru ? 'maru' : 'tenten',
      romaji: som,
      soa: SOA_EXTRA[hira],
      mnemonico,
      base: baseChar,
      cena: base.cena,
      marca: maru ? 'maru' : 'tenten',
      exemplo: exemplo(ex),
      nota: NOTAS[char],
      fala: char,
    });
  }
}

const YOUON_HIRA = ['き', 'し', 'ち', 'に', 'ひ', 'み', 'り', 'ぎ', 'じ', 'び', 'ぴ'];
const PEQUENOS = ['ゃ', 'ゅ', 'ょ'];
const GRANDE_DE: Record<string, string> = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ' };

function youon(escrita: Escrita): void {
  const conv = (c: string) => (escrita === 'hiragana' ? c : hiraToKata(c));
  for (const grande of YOUON_HIRA) {
    for (const p of PEQUENOS) {
      const hira = grande + p;
      const char = conv(hira);
      const g = porChar.get(conv(grande));
      if (!g) throw new Error(`sem base: ${grande}`);
      const som = romajiDe(char);
      const ex = EXEMPLOS[char];
      if (!ex) throw new Error(`sem exemplo: ${char}`);
      add({
        id: idDe(char, escrita),
        char,
        escrita,
        grupo: 'youon',
        romaji: som,
        soa: SOA_EXTRA[hira] ?? `${som}, numa batida só`,
        mnemonico: `É ${g.char} (${g.cena.objeto}) com um ${conv(p)} pequeno grudado. As duas letras viram uma batida só: "${g.romaji}" + "${romajiDe(GRANDE_DE[p] as string)}" = "${som}".`,
        base: g.char,
        cena: g.cena,
        mini: conv(GRANDE_DE[p] as string),
        exemplo: exemplo(ex),
        nota: NOTA_RARO[char],
        fala: char,
      });
    }
  }
}

function pequenosELongo(escrita: Escrita): void {
  const conv = (c: string) => (escrita === 'hiragana' ? c : hiraToKata(c));
  const tsu = porChar.get(conv('つ')) as KanaItem;
  const exTsu: [string, string, string] = escrita === 'hiragana' ? ['切手', 'きって', 'selo postal'] : ['チケット', 'チケット', 'ingresso, passagem'];
  add({
    id: idDe(conv('っ'), escrita),
    char: conv('っ'),
    escrita,
    grupo: 'pequeno',
    romaji: '(pausa)',
    soa: 'uma pausinha antes da consoante seguinte',
    mnemonico: `A onda de ${conv('つ')} encolheu e virou uma pausa: a voz para um instante e a consoante seguinte sai dobrada. ${exTsu[1]} soa "${romajiDe(exTsu[1])}".`,
    base: tsu.char,
    cena: tsu.cena,
    marca: 'encolhido',
    exemplo: exemplo(exTsu),
    nota: escrita === 'hiragana' ? 'Compare きって (kitte, selo) com きて (kite, venha): só o っ muda.' : 'Compare ベッド (beddo, cama) com ベド, que não é palavra: sem a pausa o som fica errado.',
    fala: exTsu[1],
  });
  const exPeq: Record<string, [string, string, string]> =
    escrita === 'hiragana'
      ? { ゃ: ['玩具', 'おもちゃ', 'brinquedo'], ゅ: ['留学', 'りゅうがく', 'intercâmbio'], ょ: ['今日', 'きょう', 'hoje'] }
      : { ャ: ['シャツ', 'シャツ', 'camisa'], ュ: ['ジュース', 'ジュース', 'suco'], ョ: ['チョコレート', 'チョコレート', 'chocolate'] };
  for (const [p, grande] of [['ゃ', 'や'], ['ゅ', 'ゆ'], ['ょ', 'よ']] as const) {
    const g = porChar.get(conv(grande)) as KanaItem;
    const char = conv(p);
    const ex = exPeq[char] as [string, string, string];
    add({
      id: idDe(char, escrita),
      char,
      escrita,
      grupo: 'pequeno',
      romaji: `(${g.romaji} pequeno)`,
      soa: `gruda na letra de antes e vira uma batida só`,
      mnemonico: `É ${g.char} (${g.cena.objeto}), só que pequeno. Sozinho não se lê: gruda na letra de antes, e as duas viram uma batida só.`,
      base: g.char,
      cena: g.cena,
      marca: 'encolhido',
      exemplo: exemplo(ex),
      nota: `Tamanho importa: ${conv('きや')} (ki-ya) tem duas batidas, ${conv('きゃ')} (kya) tem uma.`,
      fala: ex[1],
    });
  }
  if (escrita === 'katakana') {
    add({
      id: 'ak:ー',
      char: 'ー',
      escrita,
      grupo: 'longo',
      romaji: '(vogal longa)',
      soa: 'a vogal de antes dura o dobro',
      mnemonico: 'Uma estrada reta e comprida: a vogal de antes segue por ela e dura o dobro. ビール é "biiru".',
      base: 'ー',
      cena: { objeto: 'estrada comprida', pecas: parsePecas('casa 16 96 .7; arvore 104 96 .7; sol 100 22 .7') },
      exemplo: exemplo(['ビール', 'ビール', 'cerveja']),
      nota: 'Compare ビール (biiru, cerveja) com ビル (biru, prédio): só a vogal longa muda.',
      fala: 'ビール',
    });
  }
}

/** Sons que o japonês não tinha e o katakana monta para palavras estrangeiras. */
const ESTRANGEIROS: [char: string, romaji: string, ex: [string, string, string], soa?: string][] = [
  ['ファ', 'fa', ['ファン', 'ファン', 'fã'], 'fa de sopro, com os lábios'],
  ['フィ', 'fi', ['フィリピン', 'フィリピン', 'Filipinas'], 'fi de sopro, com os lábios'],
  ['フェ', 'fe', ['カフェ', 'カフェ', 'café (o lugar)'], 'fe de sopro, com os lábios'],
  ['フォ', 'fo', ['フォーク', 'フォーク', 'garfo'], 'fo de sopro, com os lábios'],
  ['ティ', 'ti', ['パーティー', 'パーティー', 'festa'], 'ti seco, sem virar "tchi"'],
  ['ディ', 'di', ['ディナー', 'ディナー', 'jantar (de restaurante)'], 'di seco, sem virar "dji"'],
  ['トゥ', 'tu', ['タトゥー', 'タトゥー', 'tatuagem']],
  ['ドゥ', 'du', ['ヒンドゥー', 'ヒンドゥー', 'hindu']],
  ['チェ', 'che', ['チェックイン', 'チェックイン', 'check-in'], 'tche'],
  ['シェ', 'she', ['シェフ', 'シェフ', 'chef de cozinha'], 'xe, como em "chefe"'],
  ['ジェ', 'je', ['ジェットコースター', 'ジェットコースター', 'montanha-russa'], 'dje'],
  ['ウィ', 'wi', ['ウィスキー', 'ウィスキー', 'uísque'], 'ui'],
  ['ウェ', 'we', ['ウェイター', 'ウェイター', 'garçom'], 'ue'],
  ['ウォ', 'wo', ['ウォーキング', 'ウォーキング', 'caminhada'], 'uo'],
  ['ヴ', 'vu', ['ヴィーガン', 'ヴィーガン', 'vegano'], 'no Japão quase todo mundo fala "bu"'],
  ['ヴァ', 'va', ['ヴァイオリン', 'ヴァイオリン', 'violino'], 'no Japão quase todo mundo fala "ba"'],
];

function estrangeiros(): void {
  for (const [char, romaji, ex, soa] of ESTRANGEIROS) {
    const [grande = '', pequeno] = [...char];
    const g = porChar.get(grande === 'ヴ' ? 'ウ' : grande) as KanaItem;
    const ehVu = char === 'ヴ';
    add({
      id: `ak:${char}`,
      char,
      escrita: 'katakana',
      grupo: 'estrangeiro',
      romaji,
      soa,
      mnemonico: ehVu
        ? 'O fantasma de ウ ganhou tenten para imitar o "v" de fora. Como o japonês não tem "v", quase todo mundo fala "bu".'
        : `É ${grande} (${g.cena.objeto}) com um ${pequeno} pequeno: juntos imitam o som de fora, "${romaji}", numa batida só.`,
      base: g.char,
      cena: g.cena,
      marca: char.startsWith('ヴ') ? 'tenten' : undefined,
      mini: ehVu ? undefined : hiraToKata(String.fromCharCode((pequeno as string).charCodeAt(0) + 1)),
      exemplo: exemplo(ex),
      nota: char.startsWith('ヴ') ? 'Muitas palavras têm as duas grafias: ヴァイオリン e バイオリン. A pronúncia é a mesma.' : undefined,
      fala: char,
    });
  }
}

basicos(HIRAGANA, 'hiragana');
derivados('hiragana');
youon('hiragana');
pequenosELongo('hiragana');
basicos(KATAKANA, 'katakana');
derivados('katakana');
youon('katakana');
pequenosELongo('katakana');
estrangeiros();

for (const grupo of GRUPOS_PARECIDOS) {
  for (const a of grupo) {
    const item = porChar.get(a);
    if (!item) throw new Error(`parecido desconhecido: ${a}`);
    for (const b of grupo) {
      const outro = porChar.get(b) as KanaItem;
      if (b !== a && !item.parecidos.includes(outro.id)) item.parecidos.push(outro.id);
    }
  }
}

export const KANA_IMAGENS: readonly KanaItem[] = itens;

const porId = new Map(itens.map((k) => [k.id, k]));

export function kanaItem(id: string): KanaItem {
  const k = porId.get(id);
  if (!k) throw new Error(`kana desconhecido: ${id}`);
  return k;
}

export function kanaPorChar(char: string): KanaItem | undefined {
  return porChar.get(char);
}

/* ───────── Lotes: a ordem de estudo, do básico ao mais denso ───────── */

export interface Lote {
  id: string;
  titulo: string;
  ids: string[];
}

function lote(id: string, titulo: string, chars: string): Lote {
  return { id, titulo, ids: kanaDaPalavra(chars).map((k) => k.id) };
}

const linhas = (pref: string, nome: string, chars: string[]): Lote[] => chars.map((c, i) => lote(`${pref}${i + 1}`, `${nome} ${i + 1}`, c));

export const LOTES: readonly Lote[] = [
  ...linhas('h', 'Hiragana', ['あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの', 'はひふへほ', 'まみむめも', 'やゆよわを', 'らりるれろん']),
  ...linhas('hd', 'Hiragana com tenten e maru', ['がぎぐげご', 'ざじずぜぞ', 'だぢづでど', 'ばびぶべぼ', 'ぱぴぷぺぽ']),
  ...linhas('hy', 'Hiragana combinado', ['きゃきゅきょしゃしゅしょ', 'ちゃちゅちょにゃにゅにょ', 'ひゃひゅひょみゃみゅみょ', 'りゃりゅりょぎゃぎゅぎょ', 'じゃじゅじょびゃびゅびょ', 'ぴゃぴゅぴょっゃゅょ']),
  ...linhas('k', 'Katakana', ['アイウエオ', 'カキクケコ', 'サシスセソ', 'タチツテト', 'ナニヌネノ', 'ハヒフヘホ', 'マミムメモ', 'ヤユヨワヲ', 'ラリルレロン']),
  ...linhas('kd', 'Katakana com tenten e maru', ['ガギグゲゴ', 'ザジズゼゾ', 'ダデドバビ', 'ブベボパピ', 'プペポ']),
  ...linhas('ky', 'Katakana combinado', ['キャキュキョシャシュショ', 'チャチュチョニャニュニョ', 'ヒャヒュヒョミャミュミョ', 'リャリュリョギャギュギョ', 'ジャジュジョビャビュビョ', 'ピャピュピョッャュョー']),
  ...linhas('ke', 'Sons de fora', ['ファフィフェフォ', 'ティディトゥドゥ', 'チェシェジェ', 'ウィウェウォヴヴァ']),
];

/** Lote de cada kana. */
export const LOTE_DE: ReadonlyMap<string, number> = new Map(LOTES.flatMap((l, i) => l.ids.map((id) => [id, i] as const)));

/* ───────── Palavras inteiras em katakana (leitura relâmpago) ───────── */

export interface PalavraKatakana {
  kana: string;
  pt: string;
}

export const PALAVRAS_KATAKANA: readonly PalavraKatakana[] = [
  { kana: 'コンビニ', pt: 'loja de conveniência' },
  { kana: 'アルバイト', pt: 'trabalho de meio período' },
  { kana: 'パスポート', pt: 'passaporte' },
  { kana: 'コーヒー', pt: 'café' },
  { kana: 'ビール', pt: 'cerveja' },
  { kana: 'テレビ', pt: 'televisão' },
  { kana: 'タクシー', pt: 'táxi' },
  { kana: 'ホテル', pt: 'hotel' },
  { kana: 'レストラン', pt: 'restaurante' },
  { kana: 'スマホ', pt: 'celular' },
  { kana: 'パン', pt: 'pão' },
  { kana: 'バス', pt: 'ônibus' },
  { kana: 'カード', pt: 'cartão' },
  { kana: 'メニュー', pt: 'cardápio' },
  { kana: 'トイレ', pt: 'banheiro' },
  { kana: 'エレベーター', pt: 'elevador' },
  { kana: 'チケット', pt: 'ingresso, passagem' },
  { kana: 'ゲーム', pt: 'jogo, videogame' },
  { kana: 'カメラ', pt: 'câmera' },
  { kana: 'パソコン', pt: 'computador' },
  { kana: 'シャワー', pt: 'chuveiro' },
  { kana: 'ジュース', pt: 'suco' },
  { kana: 'アイス', pt: 'sorvete' },
  { kana: 'ケーキ', pt: 'bolo' },
  { kana: 'ラーメン', pt: 'lámen' },
  { kana: 'チーズ', pt: 'queijo' },
  { kana: 'サラダ', pt: 'salada' },
  { kana: 'ノート', pt: 'caderno' },
  { kana: 'ドア', pt: 'porta' },
  { kana: 'ベッド', pt: 'cama' },
  { kana: 'シャツ', pt: 'camisa' },
  { kana: 'スーパー', pt: 'supermercado' },
  { kana: 'デパート', pt: 'loja de departamentos' },
  { kana: 'アパート', pt: 'apartamento' },
  { kana: 'フォーク', pt: 'garfo' },
  { kana: 'ナイフ', pt: 'faca' },
  { kana: 'ティッシュ', pt: 'lenço de papel' },
  { kana: 'パーティー', pt: 'festa' },
  { kana: 'ビザ', pt: 'visto' },
  { kana: 'ワーキングホリデー', pt: 'working holiday' },
  { kana: 'レジ', pt: 'caixa (de pagar)' },
  { kana: 'エアコン', pt: 'ar-condicionado' },
  { kana: 'ブラジル', pt: 'Brasil' },
  { kana: 'ジム', pt: 'academia' },
  { kana: 'チェックイン', pt: 'check-in' },
  { kana: 'カフェ', pt: 'café (o lugar)' },
  { kana: 'メール', pt: 'e-mail' },
  { kana: 'リュック', pt: 'mochila' },
];

/** Kana que formam uma palavra, um por unidade de leitura (シャ conta como um). */
export function kanaDaPalavra(palavra: string): KanaItem[] {
  const out: KanaItem[] = [];
  const s = [...palavra];
  for (let i = 0; i < s.length; i++) {
    const dois = (s[i] as string) + (s[i + 1] ?? '');
    const k = porChar.get(dois) ?? porChar.get(s[i] as string);
    if (!k) throw new Error(`kana sem item: ${s[i]} em ${palavra}`);
    out.push(k);
    if (k.char.length === 2) i++;
  }
  return out;
}
