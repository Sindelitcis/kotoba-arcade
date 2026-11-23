/**
 * Leitura graduada: um texto curto por unidade, feito só com o que o curso ensinou até ela
 * (tests/curso-leituras.test.ts confere peça por peça, como nos exemplos). Primeiro a pessoa lê
 * o texto inteiro; depois faz o shadowing, frase por frase: ouve, repete junto, ouve de novo.
 *
 * As frases usam a mesma notação de peças dos exemplos (exemplos.ts).
 */
import type { ExemploLinha } from './exemplos';

export interface LeituraLinhas {
  titulo: string;
  frases: readonly ExemploLinha[];
}

export const LEITURAS: Readonly<Record<string, LeituraLinhas>> = {
  'a1-01': {
    titulo: 'O Rafael se apresenta',
    frases: [
      { pecas: ['はじめまして'], pt: 'Muito prazer.' },
      { pecas: ['わたし', 'は', 'ラファエル', 'です'], pt: 'Eu sou o Rafael.' },
      { pecas: ['ブラジル人', 'です'], pt: 'Sou brasileiro.' },
      { pecas: ['日本語', 'の', '学生', 'です'], pt: 'Sou estudante de japonês.' },
      { pecas: ['よろしくおねがいします'], pt: 'Conto com você.' },
    ],
  },
  'a1-02': {
    titulo: 'O professor Tanaka',
    frases: [
      { pecas: ['たなか', 'さん', 'は', '日本語', 'の', '先生', 'です'], pt: 'O senhor Tanaka é professor de japonês.' },
      { pecas: ['たなか', 'さん', 'は', '五十さい=ごじゅっさい<五', 'です'], pt: 'O Tanaka tem cinquenta anos.' },
      { pecas: ['やまだ', 'さん', 'は', '三十さい=さんじゅっさい<三', 'です'], pt: 'A Yamada tem trinta anos.' },
      { pecas: ['わたし', 'も', '三十さい=さんじゅっさい<三', 'です'], pt: 'Eu também tenho trinta anos.' },
    ],
  },
  'a1-03': {
    titulo: 'Que dia é hoje?',
    frases: [
      { pecas: ['きのう', 'は', '日曜日', 'でした'], pt: 'Ontem foi domingo.' },
      { pecas: ['きょう', 'は', '月曜日', 'です'], pt: 'Hoje é segunda-feira.' },
      { pecas: ['今', '、', '午前', '九時', 'です'], pt: 'Agora são nove da manhã.' },
      { pecas: ['日本語', 'は', '午後', '一時', 'から', '四時', 'まで', 'です'], pt: 'A aula de japonês é da uma às quatro da tarde.' },
    ],
  },
  'a1-04': {
    titulo: 'Na konbini',
    frases: [
      { pecas: ['この', 'おにぎり', 'は', '百円', 'です'], pt: 'Este onigiri custa cem ienes.' },
      { pecas: ['お水', 'は', 'いくら', 'です', 'か'], pt: 'Quanto custa a água?' },
      { pecas: ['お水', 'も', '百円', 'です'], pt: 'A água também custa cem ienes.' },
      { pecas: ['おにぎり', 'を', 'ください'], pt: 'Um onigiri, por favor.' },
      { pecas: ['ありがとうございます'], pt: 'Obrigado.' },
    ],
  },
  'a1-05': {
    titulo: 'Do que eu gosto',
    frases: [
      { pecas: ['わたし', 'は', 'くだもの', 'が', '大好き', 'です'], pt: 'Eu adoro fruta.' },
      { pecas: ['毎日', 'くだもの', 'を', '食べます=たべます<食べる'], pt: 'Como fruta todo dia.' },
      { pecas: ['にく', 'も', '好き', 'です'], pt: 'Gosto de carne também.' },
      { pecas: ['コーヒー', 'は', 'きらい', 'です'], pt: 'De café eu não gosto.' },
    ],
  },
  'a1-06': {
    titulo: 'Meu dia',
    frases: [
      { pecas: ['毎日', '七時=しちじ<七', 'に', 'おきます<おきる'], pt: 'Todo dia acordo às sete.' },
      { pecas: ['九時', 'から', '五時=ごじ<五', 'まで', 'はたらきます<はたらく'], pt: 'Trabalho das nove às cinco.' },
      { pecas: ['よる', 'は', 'うち', 'で', '本', 'を', '読みます=よみます<読む'], pt: 'À noite leio livros em casa.' },
      { pecas: ['十一時=じゅういちじ<十', 'に', 'ねます<ねる'], pt: 'Durmo às onze.' },
    ],
  },
  'a1-07': {
    titulo: 'Visita ao Tanaka',
    frases: [
      { pecas: ['あした', '、', 'たなか', 'さん', 'の', 'うち', 'へ', '行きます=いきます<行く'], pt: 'Amanhã vou à casa do Tanaka.' },
      { pecas: ['ちかてつ', 'で', '行きます=いきます<行く'], pt: 'Vou de metrô.' },
      { pecas: ['たなか', 'さん', 'は', '北口', 'に', '来ます'], pt: 'O Tanaka vem até a saída norte.' },
      { pecas: ['よる', '、', 'バス', 'で', 'うち', 'へ', 'かえります<かえる'], pt: 'À noite volto para casa de ônibus.' },
    ],
  },
  'a1-08': {
    titulo: 'Perto de casa',
    frases: [
      { pecas: ['わたし', 'の', 'うち', 'の', 'ちかく', 'に', 'コンビニ', 'が', 'あります'], pt: 'Perto da minha casa tem uma konbini.' },
      { pecas: ['コンビニ', 'の', 'となり', 'に', '駅', 'が', 'あります'], pt: 'Ao lado da konbini fica a estação.' },
      { pecas: ['うち', 'に', 'ねこ', 'が', 'います'], pt: 'Em casa tem um gato.' },
      { pecas: ['ねこ', 'は', 'いつも', 'つくえ', 'の', '上', 'に', 'います'], pt: 'O gato está sempre em cima da mesa.' },
    ],
  },
  'a1-09': {
    titulo: 'Minha família',
    frases: [
      { pecas: ['わたし', 'の', 'かぞく', 'は', '四人=よにん<四', 'です'], pt: 'Minha família tem quatro pessoas.' },
      { pecas: ['父', 'は', '会社員', 'です'], pt: 'Meu pai é funcionário de empresa.' },
      { pecas: ['母', 'は', '日本語', 'の', '先生', 'です'], pt: 'Minha mãe é professora de japonês.' },
      { pecas: ['きょうだい', 'が', '一人', 'います'], pt: 'Tenho um irmão.' },
    ],
  },
  'a1-10': {
    titulo: 'Minha casa',
    frases: [
      { pecas: ['わたし', 'の', 'うち', 'は', '小さい', 'です'], pt: 'Minha casa é pequena.' },
      { pecas: ['とても', 'ふるい', 'です'], pt: 'É muito velha.' },
      { pecas: ['うち', 'の', 'ちかく', 'は', 'しずか', 'です'], pt: 'Perto de casa é tranquilo.' },
      { pecas: ['ちかく', 'に', '大きい', '駅', 'が', 'あります'], pt: 'Perto tem uma estação grande.' },
    ],
  },
  'a1-11': {
    titulo: 'Um boné vermelho',
    frases: [
      { pecas: ['すみません', '、', '赤い=あかい<赤', 'ぼうし', 'は', 'あります', 'か'], pt: 'Com licença, tem boné vermelho?' },
      { pecas: ['はい', '、', 'あります'], pt: 'Sim, tem.' },
      { pecas: ['この', 'ぼうし', 'は', 'いくら', 'です', 'か'], pt: 'Quanto custa este boné?' },
      { pecas: ['この', '赤い=あかい<赤', 'ぼうし', 'に', 'します'], pt: 'Vou levar este boné vermelho.' },
    ],
  },
  'a1-12': {
    titulo: 'Um convite',
    frases: [
      { pecas: ['今週', 'の', '土曜日', '、', 'ひま', 'です', 'か'], pt: 'Você está livre neste sábado?' },
      { pecas: ['いっしょに', 'ばんごはん', 'を', '食べません=たべません<食べる', 'か'], pt: 'Não quer jantar comigo?' },
      { pecas: ['土曜日', 'は', 'ちょっと', 'いそがしい', 'です'], pt: 'No sábado estou um pouco ocupado.' },
      { pecas: ['日曜日', 'に', '行きましょう=いきましょう<行く'], pt: 'Vamos no domingo.' },
    ],
  },
  'a1-13': {
    titulo: 'Na aula',
    frases: [
      { pecas: ['先生', 'は', 'いつも', 'ゆっくり', '話します=はなします<話す'], pt: 'O professor sempre fala devagar.' },
      { pecas: ['本', 'を', 'あけて<あける', 'ください'], pt: 'Abram o livro, por favor.' },
      { pecas: ['ここ', 'に', 'すわって<すわる', 'ください'], pt: 'Sente aqui, por favor.' },
      { pecas: ['もう一度', '聞いて=きいて<聞く', 'ください'], pt: 'Ouça mais uma vez.' },
    ],
  },
  'a1-14': {
    titulo: 'Trabalho e casa',
    frases: [
      { pecas: ['わたし', 'は', '会社', 'で', 'はたらいています<はたらく'], pt: 'Eu trabalho numa empresa.' },
      { pecas: ['駅', 'の', 'ちかく', 'に', 'すんでいます'], pt: 'Moro perto da estação.' },
      { pecas: ['やまだ', 'さん', 'は', 'みせ', 'で', 'アルバイト', 'を', 'しています'], pt: 'A Yamada trabalha meio período numa loja.' },
      { pecas: ['やまだ', 'さん', 'は', 'けっこんしています'], pt: 'A Yamada é casada.' },
    ],
  },
  'a1-15': {
    titulo: 'No onsen',
    frases: [
      { pecas: ['おんせん', 'に', '入っても=はいっても<入る', 'いい', 'です', 'か'], pt: 'Posso entrar no onsen?' },
      { pecas: ['はい', '、', '入っても=はいっても<入る', 'いい', 'です'], pt: 'Sim, pode entrar.' },
      { pecas: ['くつ', 'を', 'ぬいで<ぬぐ', 'ください'], pt: 'Tire os sapatos, por favor.' },
      { pecas: ['ここ', 'に', 'ゴミ', 'を', '出しては=だしては<出す', 'いけません'], pt: 'Não pode deixar lixo aqui.' },
    ],
  },
  'a1-16': {
    titulo: 'Mensagem para um amigo',
    frases: [
      { pecas: ['あした', '、', 'ひま'], fim: '？', pt: 'Está livre amanhã?' },
      { pecas: ['うん', '、', 'ひま', 'だ', 'よ'], pt: 'Sim, estou livre.' },
      { pecas: ['いっしょに', 'えいが', 'を', '見る'], fim: '？', pt: 'Vamos ver um filme juntos?' },
      { pecas: ['いい', 'ね'], pt: 'Boa!' },
    ],
  },
  'a1-17': {
    titulo: 'O Japão ainda não',
    frases: [
      { pecas: ['わたし', 'は', '日本', 'に', '行った=いった<行く', 'こと', 'が', 'ありません<あります'], pt: 'Eu nunca fui ao Japão.' },
      { pecas: ['日本語', 'を', '一年', 'べんきょうしました<べんきょうする'], pt: 'Estudei japonês por um ano.' },
      { pecas: ['日本', 'の', 'えいが', 'を', '見た=みた<見る', 'こと', 'が', 'あります'], pt: 'Já vi filmes japoneses.' },
      { pecas: ['ことし', '、', '日本', 'に', '行きたい=いきたい<行く', 'です'], pt: 'Este ano quero ir ao Japão.' },
    ],
  },
  'a1-18': {
    titulo: 'Resfriado',
    frases: [
      { pecas: ['きのう', 'から', 'のど', 'が', 'いたい', 'です'], pt: 'Estou com dor de garganta desde ontem.' },
      { pecas: ['ねつ', 'も', 'あります'], pt: 'Também estou com febre.' },
      { pecas: ['びょういん', 'に', '行きました=いきました<行く'], pt: 'Fui ao hospital.' },
      { pecas: ['薬', 'を', '飲んで=のんで<飲む', '、', 'ねます<ねる'], pt: 'Tomo o remédio e vou dormir.' },
    ],
  },
  'a1-19': {
    titulo: 'O tempo',
    frases: [
      { pecas: ['きょう', 'は', 'いい', '天気', 'です', 'ね'], pt: 'Hoje o tempo está bom, né?' },
      { pecas: ['あした', 'は', 'くもり', 'でしょう'], pt: 'Amanhã deve ficar nublado.' },
      { pecas: ['わたし', 'は', 'なつ', 'が', '一番', '好き', 'です'], pt: 'O verão é a estação de que mais gosto.' },
      { pecas: ['日本', 'の', 'なつ', 'は', 'とても', 'あつい', 'です'], pt: 'O verão do Japão é muito quente.' },
    ],
  },
};
