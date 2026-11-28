/**
 * Os diálogos do curso: uma conversa curta da situação da unidade, feita só com o que o curso
 * ensinou até ela (tests/curso-leituras.test.ts confere peça por peça, como nas leituras). Antes
 * o curso usava as situações da escola (content/escola/situacoes.ts), que trazem と申します,
 * お世話になります e keigo logo na unidade 1: coisa que o aluno ainda não tinha visto.
 *
 * Cada fala toca, dá um tempo para repetir em voz alta e toca de novo (shadowing).
 */
import type { ExemploLinha } from './exemplos';

export interface FalaDoDialogo extends ExemploLinha {
  /** Quem fala, em português (nome ou papel). */
  quem: string;
}

export interface DialogoLinhas {
  titulo: string;
  /** A cena, em uma frase. */
  contexto: string;
  falas: readonly FalaDoDialogo[];
}

export const DIALOGOS: Readonly<Record<string, DialogoLinhas>> = {
  'a1-01': {
    titulo: 'Na aula de japonês',
    contexto: 'Primeiro dia de aula. O Rafael conhece o professor Tanaka.',
    falas: [
      { quem: 'Tanaka', pecas: ['はじめまして'], pt: 'Muito prazer.' },
      { quem: 'Tanaka', pecas: ['わたし', 'は', 'たなか', 'です'], pt: 'Eu sou o Tanaka.' },
      { quem: 'Rafael', pecas: ['はじめまして'], pt: 'Muito prazer.' },
      { quem: 'Rafael', pecas: ['ラファエル', 'です'], pt: 'Sou o Rafael.' },
      { quem: 'Tanaka', pecas: ['ラファエル', 'さん', 'は', 'ブラジル人', 'です', 'か'], fim: '？', pt: 'Você é brasileiro?' },
      { quem: 'Rafael', pecas: ['はい', '、', 'ブラジル人', 'です'], pt: 'Sim, sou brasileiro.' },
      { quem: 'Tanaka', pecas: ['よろしくおねがいします'], pt: 'Conto com você.' },
      { quem: 'Rafael', pecas: ['こちらこそ', '、', 'よろしくおねがいします'], pt: 'Eu é que conto com você.' },
    ],
  },
  'a1-04': {
    titulo: 'No caixa da konbini',
    contexto: 'O Rafael vai pagar um onigiri e uma água.',
    falas: [
      { quem: 'Rafael', pecas: ['すみません'], pt: 'Com licença.' },
      { quem: 'Rafael', pecas: ['この', 'おにぎり', 'は', 'いくら', 'です', 'か'], fim: '？', pt: 'Quanto custa este onigiri?' },
      { quem: 'Atendente', pecas: ['百円', 'です'], pt: 'Cem ienes.' },
      { quem: 'Rafael', pecas: ['この', 'おにぎり', 'を', 'ください'], pt: 'Quero este onigiri.' },
      { quem: 'Rafael', pecas: ['お水', 'も', 'ください'], pt: 'E uma água também.' },
      { quem: 'Atendente', pecas: ['二百円=にひゃくえん<百円', 'です'], pt: 'São duzentos ienes.' },
      { quem: 'Rafael', pecas: ['ありがとうございます'], pt: 'Obrigado.' },
    ],
  },
  'a1-05': {
    titulo: 'O que vamos comer?',
    contexto: 'Hora do almoço. O Tanaka e o Rafael escolhem a comida.',
    falas: [
      { quem: 'Tanaka', pecas: ['ラファエル', 'さん', 'は', 'さかな', 'が', '好き', 'です', 'か'], fim: '？', pt: 'Rafael, você gosta de peixe?' },
      { quem: 'Rafael', pecas: ['はい', '、', '大好き', 'です'], pt: 'Sim, adoro.' },
      { quem: 'Tanaka', pecas: ['わたし', 'は', 'さかな', 'と', 'ごはん', 'を', '食べます=たべます<食べる'], pt: 'Eu vou comer peixe e arroz.' },
      { quem: 'Rafael', pecas: ['わたし', 'は', 'カレー', 'を', '食べます=たべます<食べる'], pt: 'Eu vou comer curry.' },
      { quem: 'Tanaka', pecas: ['おちゃ', 'を', '飲みます=のみます<飲む', 'か'], fim: '？', pt: 'Vai tomar chá?' },
      { quem: 'Rafael', pecas: ['はい', '、', '飲みます=のみます<飲む'], pt: 'Vou, sim.' },
      { quem: 'Os dois', pecas: ['いただきます'], pt: 'Bom apetite.' },
    ],
  },
  'a1-07': {
    titulo: 'Na plataforma',
    contexto: 'O Rafael confere o trem com um funcionário da estação.',
    falas: [
      { quem: 'Rafael', pecas: ['すみません'], pt: 'Com licença.' },
      { quem: 'Rafael', pecas: ['この', '電車', 'は', 'つぎ', 'の', '駅', 'に', 'とまります<とまる', 'か'], fim: '？', pt: 'Este trem para na próxima estação?' },
      { quem: 'Funcionário', pecas: ['はい', '、', 'とまります<とまる'], pt: 'Para, sim.' },
      { quem: 'Funcionário', pecas: ['バス', 'で', '行きます=いきます<行く', 'か'], fim: '？', pt: 'O senhor vai de ônibus?' },
      { quem: 'Rafael', pecas: ['いいえ', '、', '電車', 'で', '行きます=いきます<行く'], pt: 'Não, vou de trem.' },
      { quem: 'Rafael', pecas: ['ありがとうございます'], pt: 'Obrigado.' },
    ],
  },
  'a1-12': {
    titulo: 'Um convite',
    contexto: 'A Yamada chama o Rafael para o cinema.',
    falas: [
      { quem: 'Yamada', pecas: ['ラファエル', 'さん', '、', '来週', 'の', '土曜日', 'は', 'ひま', 'です', 'か'], fim: '？', pt: 'Rafael, você está livre no sábado que vem?' },
      { quem: 'Rafael', pecas: ['はい', '、', 'ひま', 'です'], pt: 'Sim, estou livre.' },
      { quem: 'Yamada', pecas: ['いっしょに', 'えいが', 'を', '見ません=みません<見る', 'か'], fim: '？', pt: 'Vamos ver um filme juntos?' },
      { quem: 'Rafael', pecas: ['見たい=みたい<見る', 'です'], pt: 'Quero ver!' },
      { quem: 'Yamada', pecas: ['えいがかん', 'で', '会いましょう=あいましょう<会う'], pt: 'Vamos nos encontrar no cinema.' },
      { quem: 'Rafael', pecas: ['はい', '、', '会いましょう=あいましょう<会う'], pt: 'Combinado, vamos.' },
    ],
  },
  'a1-14': {
    titulo: 'O que você faz?',
    contexto: 'Numa festa, o Tanaka puxa conversa com o Rafael.',
    falas: [
      { quem: 'Tanaka', pecas: ['ラファエル', 'さん', 'は', '仕事', 'を', 'しています<する', 'か'], fim: '？', pt: 'Rafael, você trabalha?' },
      { quem: 'Rafael', pecas: ['はい', '、', 'みせ', 'で', 'アルバイト', 'を', 'しています<する'], pt: 'Sim, faço bico numa loja.' },
      { quem: 'Rafael', pecas: ['日本語', 'も', 'ならっています<ならう'], pt: 'E também estou aprendendo japonês.' },
      { quem: 'Tanaka', pecas: ['かんじ', 'は', '分かります=わかります<分かる', 'か'], fim: '？', pt: 'Você entende kanji?' },
      { quem: 'Rafael', pecas: ['ちょっと', '分かります=わかります<分かる'], pt: 'Entendo um pouco.' },
    ],
  },
  'a1-18': {
    titulo: 'No consultório',
    contexto: 'O Rafael está gripado e vai ao médico.',
    falas: [
      { quem: 'Médico', pecas: ['どう', 'しました<する', 'か'], pt: 'O que houve?' },
      { quem: 'Rafael', pecas: ['あたま', 'が', 'いたい', 'んです'], pt: 'É que estou com dor de cabeça.' },
      { quem: 'Rafael', pecas: ['ねつ', 'も', 'ある<あります', 'んです'], pt: 'E estou com febre também.' },
      { quem: 'Médico', pecas: ['かぜ', 'です'], pt: 'É um resfriado.' },
      { quem: 'Médico', pecas: ['この', '薬', 'を', '飲んで=のんで<飲む', 'ください'], pt: 'Tome este remédio.' },
      { quem: 'Médico', pecas: ['よく', 'ねた<ねる', 'ほう', 'が', 'いい', 'です'], pt: 'É melhor dormir bem.' },
      { quem: 'Rafael', pecas: ['ありがとうございます'], pt: 'Obrigado.' },
    ],
  },
};
