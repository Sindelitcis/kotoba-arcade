/**
 * O que a gramática do Aprofundar acrescenta ao que já existe (lição do Kumitate e lições
 * da escola-japones): o nível de formalidade, quando usar no Japão de verdade e, para as
 * pontas de verbo, a conjugação passo a passo.
 */
import type { Ending } from '../../games/gramatica/engine';

export interface UsoGramatica {
  /** Casual, polido, formal ou neutro (serve para todos). */
  registro: string;
  /** Uma ou duas frases sobre o uso de verdade: com quem, onde, o que soa estranho. */
  noJapao: string;
}

/** Ponto do Kumitate → lição da escola sobre o mesmo assunto. */
export const ESCOLA_DO_PONTO: Readonly<Record<string, string>> = {
  wa: 'g-desu',
  no: 'g-no-mo',
  wo: 'g-particulas',
  masu: 'g-masu',
  mashita: 'g-masu',
  ni: 'g-particulas',
  de: 'g-particulas',
  mo: 'g-no-mo',
  ga: 'g-aru-iru',
  tai: 'g-tai-mashou',
  te: 'g-te-kudasai',
  teiru: 'g-teimasu',
};

export const USO_DO_PONTO: Readonly<Record<string, UsoGramatica>> = {
  wa: {
    registro: 'Neutro. は vale em qualquer conversa; quem deixa a frase educada é o です do fim.',
    noJapao: 'Entre amigos, é comum tirar o です (ou trocar por だ) e até a própria は: 私、学生. Com desconhecidos, no trabalho e em loja, fale inteiro: 私は学生です.',
  },
  no: {
    registro: 'Neutro. Serve igual com amigos e com o chefe.',
    noJapao: 'Aparece o tempo todo em nome de lugar e de empresa: 東京の駅, 会社の人. A ordem é sempre dono primeiro, coisa depois, ao contrário do português.',
  },
  wo: {
    registro: 'Neutro.',
    noJapao: 'Na fala casual, を costuma sumir: コーヒー飲む? (bebe café?). Em fala educada e por escrito, mantenha.',
  },
  masu: {
    registro: 'Polido (teineigo). É o padrão com quem você não tem intimidade.',
    noJapao: 'Use com atendente, colega de trabalho, vizinho e qualquer adulto que você não conhece. Com amigos próximos, a forma de dicionário (食べる, 食べない) soa mais natural; com cliente e chefe, ainda tem o keigo por cima.',
  },
  mashita: {
    registro: 'Polido (teineigo), no passado.',
    noJapao: 'É o passado que você vai mais usar no começo: no trabalho, na loja, com o dono do apartamento. Com amigos, o passado casual é a forma た (食べた).',
  },
  ni: {
    registro: 'Neutro.',
    noJapao: 'に marca destino, horário e onde algo está: 駅に行きます, 七時に起きます. へ só serve para direção; aparece mais por escrito (placas, cartas). Na dúvida, に funciona.',
  },
  de: {
    registro: 'Neutro.',
    noJapao: 'で é onde a ação acontece e com o que ela é feita: 駅で待ちます, 電車で行きます. Não troque por に quando há uma ação no lugar: 家で食べます (como em casa).',
  },
  to: {
    registro: 'Neutro.',
    noJapao: 'と junta coisas numa lista fechada (pão と leite: só os dois) e diz com quem: 友達と行きます. Para "e outras coisas", o japonês usa や.',
  },
  mo: {
    registro: 'Neutro.',
    noJapao: 'も entra no lugar de は ou de を: 私も, コーヒーも. Não fica junto delas (nada de はも).',
  },
  ga: {
    registro: 'あります e います são polidos; com amigos, ある e いる.',
    noJapao: 'あります é para coisas e plantas; います é para gente e bicho. Perguntar o que tem por perto é muito útil: トイレはありますか (tem banheiro?).',
  },
  tai: {
    registro: 'Polido com です (行きたいです). Fala só do que você quer.',
    noJapao: 'Para perguntar o que o outro quer, 〜たいですか soa direto demais com chefe e cliente. Para convidar, use 〜ませんか (行きませんか). Para falar do desejo de outra pessoa, o japonês evita たい e usa たがっています.',
  },
  te: {
    registro: 'て ください é um pedido educado, mas ainda é uma instrução.',
    noJapao: 'Atendente fala assim com cliente: お待ちください. Com chefe, professor ou cliente, peça com mais jeito: 〜ていただけますか ou 〜てくださいませんか.',
  },
  teiru: {
    registro: 'Polido com ています; com amigos, vira てる (食べてる).',
    noJapao: 'Serve para o que está acontecendo agora (食べています) e para estados que continuam: 結婚しています (sou casado), 東京に住んでいます (moro em Tóquio). Não é só o gerúndio do português.',
  },
  nai: {
    registro: 'Casual. É o "não" entre amigos e família.',
    noJapao: 'Com desconhecidos, use ません. Mas ない aparece em frase educada também, por dentro: 食べないでください (por favor, não coma).',
  },
  ta: {
    registro: 'Casual. É o passado entre amigos e família.',
    noJapao: 'Com desconhecidos, use ました. A forma た também entra por dentro de frase educada: 日本に行ったことがあります (já fui ao Japão).',
  },
};

export const USO_DA_ESCOLA: Readonly<Record<string, UsoGramatica>> = {
  'g-desu': USO_DO_PONTO.wa as UsoGramatica,
  'g-no-mo': { registro: 'Neutro.', noJapao: 'の e も servem com qualquer pessoa. も substitui は e を; ela não vem junto delas.' },
  'g-kosoado': {
    registro: 'Neutro. As formas こちら, そちら e あちら são as educadas.',
    noJapao: 'Atendente diz こちらへどうぞ (por aqui, por favor) e não ここ. Quando for apontar algo para um funcionário, これ e それ estão ótimos.',
  },
  'g-numeros': {
    registro: 'Neutro.',
    noJapao: 'Preço sempre aparece com 円. Na fala, 4 e 7 quase sempre são よん e なな; mas 4時 é よじ e 7時 é しちじ.',
  },
  'g-masu': USO_DO_PONTO.masu as UsoGramatica,
  'g-particulas': {
    registro: 'Neutro.',
    noJapao: 'を, に, へ e で mudam o sentido, não a educação da frase. Na fala casual, を some com frequência; に, で e へ ficam.',
  },
  'g-aru-iru': USO_DO_PONTO.ga as UsoGramatica,
  'g-adjetivos': {
    registro: 'Polido com です; com amigos, o adjetivo い fica sozinho (高い!) e o な ganha だ (きれいだ).',
    noJapao: 'Nunca ponha です depois de だ. E o passado de adjetivo い muda o próprio adjetivo (高かったです), não o です.',
  },
  'g-tai-mashou': USO_DO_PONTO.tai as UsoGramatica,
  'g-te-kudasai': USO_DO_PONTO.te as UsoGramatica,
  'g-temoii': {
    registro: 'Polido.',
    noJapao: 'Em placa e aviso você vai ver 〜てはいけません e a versão curta 〜ないでください. Perguntar 〜てもいいですか antes de tirar foto ou sentar é o normal.',
  },
  'g-teimasu': USO_DO_PONTO.teiru as UsoGramatica,
  'g-kara-ga': {
    registro: 'Neutro. Com chefe e cliente, ので soa mais suave que から para dar motivo.',
    noJapao: 'Japonês costuma dar o motivo e deixar o pedido no ar: 頭が痛いので… (é que estou com dor de cabeça...). Quem ouve completa.',
  },
  'g-keigo': {
    registro: 'Formal e respeitoso (敬語).',
    noJapao: 'Você não precisa falar keigo no começo, mas vai ouvir o tempo todo em loja, banco e prefeitura. O importante é reconhecer: いらっしゃいませ, 少々お待ちください, かしこまりました.',
  },
};

/** Como montar cada ponta de verbo, em passos. */
export const REGRA_DA_PONTA: Readonly<Record<Ending, string[]>> = {
  ます: [
    'Grupo 1 (o último som é u): troque o u pelo i. 飲む (nomu) → 飲み (nomi).',
    'Grupo 2 (termina em eru ou iru, quase sempre): tire o る. 食べる → 食べ.',
    'Irregulares: する → し, 来る (くる) → 来 (き).',
    'Ponha ます no fim.',
  ],
  ません: ['Monte a base igual à de ます (飲み, 食べ, し, 来).', 'Ponha ません no fim.'],
  ました: ['Monte a base igual à de ます (飲み, 食べ, し, 来).', 'Ponha ました no fim.'],
  たい: ['Monte a base igual à de ます (飲み, 食べ, し, 来).', 'Ponha たい no fim. Para ficar educado, mais です: 飲みたいです.'],
  て: [
    'Grupo 1, pela última letra: う, つ e る viram って; む, ぶ e ぬ viram んで; く vira いて; ぐ vira いで; す vira して.',
    'Exceção que todo mundo usa: 行く → 行って.',
    'Grupo 2: tire o る e ponha て. 食べる → 食べて.',
    'Irregulares: する → して, 来る → 来て (きて).',
  ],
  ています: ['Monte a forma て (飲んで, 食べて, して).', 'Ponha います no fim.'],
  ない: [
    'Grupo 1: troque o u pelo a. 飲む → 飲ま. Se termina em う, vira わ: 買う → 買わ.',
    'Grupo 2: tire o る. 食べる → 食べ.',
    'Irregulares: する → し, 来る → 来 (こ).',
    'Ponha ない no fim. A exceção é ある, que vira só ない.',
  ],
  た: ['Faça igual à forma て e troque o て por た (で vira だ). 飲んで → 飲んだ, 食べて → 食べた, 行って → 行った.'],
};
