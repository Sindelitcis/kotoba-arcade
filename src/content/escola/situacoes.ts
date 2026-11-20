import type { Situacao } from './tipos';

export const SITUACOES: readonly Situacao[] = [
  {
    id: 's-apresentacao',
    titulo: 'Apresentar-se no primeiro dia de trabalho',
    contexto: 'Primeiro dia na empresa. Você se apresenta para a equipe.',
    falas: [
      {
        quem: 'Você',
        jp: 'はじめまして。シルバ と {申|もう}します。',
        pt: 'Muito prazer. Meu nome é Silva.',
      },
      { quem: 'Você', jp: 'ブラジル から {来|き}ました。', pt: 'Vim do Brasil.' },
      {
        quem: 'Você',
        jp: '{今日|きょう} から お{世話|せわ} に なります。',
        pt: 'A partir de hoje, vou trabalhar com vocês.',
      },
      { quem: 'Você', jp: 'よろしく お{願|ねが}いします。', pt: 'Conto com vocês.' },
      {
        quem: 'Tanaka',
        jp: '{田中|たなか} です。よろしく お{願|ねが}いします。',
        pt: 'Eu sou Tanaka. Conto com você.',
      },
    ],
    notas: [
      'と申します é a forma humilde de "me chamo". É a mais adequada no trabalho. Com amigos, basta シルバです.',
      'お世話になります é dito ao começar a fazer parte de um grupo ou a trabalhar com alguém.',
      'É comum fazer uma leve reverência (inclinar o corpo para a frente) ao dizer よろしくお願いします.',
      'Cartões de visita (名刺) são entregues e recebidos com as duas mãos.',
    ],
    exercicios: [
      {
        id: 's-apresentacao-1',
        tipo: 'escolha',
        pergunta: 'Primeiro dia na empresa. Qual é a forma mais adequada de dizer o seu nome?',
        correta: 'シルバ と {申|もう}します。',
        erradas: ['シルバ さん ですか。', 'シルバ さん を {呼|よ}んで ください。'],
      },
      {
        id: 's-apresentacao-2',
        tipo: 'escolha',
        pergunta: 'Qual frase encerra uma apresentação pessoal?',
        correta: 'よろしく お{願|ねが}いします。',
        erradas: ['いただきます。', 'お{先|さき} に {失礼|しつれい} します。'],
      },
      {
        id: 's-apresentacao-3',
        tipo: 'significado',
        frase: 'ブラジル から {来|き}ました。',
        correta: 'Vim do Brasil.',
        erradas: ['Vou para o Brasil.', 'Moro no Brasil.'],
      },
    ],
  },
  {
    id: 's-saida',
    titulo: 'Ir embora no fim do expediente',
    contexto: 'Você terminou o seu trabalho. Alguns colegas ainda estão trabalhando.',
    falas: [
      {
        quem: 'Você',
        jp: 'すみません、お{先|さき} に {失礼|しつれい} します。',
        pt: 'Com licença, vou embora antes.',
      },
      {
        quem: 'Colega',
        jp: 'お{疲|つか}れ{様|さま} でした。',
        pt: '(Obrigado pelo trabalho de hoje.)',
      },
      { quem: 'Você', jp: 'お{疲|つか}れ{様|さま} です。', pt: '(Bom trabalho para você também.)' },
    ],
    notas: [
      'Ao sair antes dos colegas, diga お先に失礼します. Quem fica responde お疲れ様でした.',
      'ご苦労様 é usado por superiores para subordinados. Não use com quem está acima de você.',
      'さようなら não é usado entre colegas no fim do dia.',
    ],
    exercicios: [
      {
        id: 's-saida-1',
        tipo: 'escolha',
        pergunta: 'Você vai embora e os colegas ainda estão trabalhando. O que dizer?',
        correta: 'お{先|さき} に {失礼|しつれい} します。',
        erradas: ['いただきます。', 'いらっしゃいませ。'],
      },
      {
        id: 's-saida-2',
        tipo: 'escolha',
        pergunta: 'Um colega diz お先に失礼します. O que responder?',
        correta: 'お{疲|つか}れ{様|さま} でした。',
        erradas: ['いらっしゃいませ。', 'はじめまして。'],
      },
    ],
  },
  {
    id: 's-konbini',
    titulo: 'Pagar na loja de conveniência',
    contexto: 'Você leva uma marmita até o caixa da loja de conveniência.',
    falas: [
      { quem: 'Atendente', jp: 'いらっしゃいませ。', pt: 'Bem-vindo(a).' },
      {
        quem: 'Atendente',
        jp: 'お{弁当|べんとう} は {温|あたた}めますか。',
        pt: 'Quer que esquente a marmita?',
      },
      { quem: 'Você', jp: 'はい、お{願|ねが}いします。', pt: 'Sim, por favor.' },
      {
        quem: 'Atendente',
        jp: '{袋|ふくろ} は ご{利用|りよう} ですか。',
        pt: 'Vai querer sacola?',
      },
      { quem: 'Você', jp: 'いいえ、{大丈夫|だいじょうぶ} です。', pt: 'Não, não precisa.' },
      { quem: 'Atendente', jp: '{六百五十円|ろっぴゃくごじゅうえん} です。', pt: 'São 650 ienes.' },
      { quem: 'Você', jp: 'カード で お{願|ねが}いします。', pt: 'No cartão, por favor.' },
      { quem: 'Atendente', jp: 'ありがとう ございました。', pt: 'Obrigado(a).' },
    ],
    notas: [
      'いらっしゃいませ não precisa de resposta. Um leve aceno com a cabeça é suficiente.',
      '大丈夫です é a forma mais comum de recusar algo oferecido no atendimento.',
      'Muitos caixas têm uma bandeja para o dinheiro. Coloque o dinheiro na bandeja em vez de entregar na mão.',
    ],
    exercicios: [
      {
        id: 's-konbini-1',
        tipo: 'escolha',
        pergunta: 'O atendente pergunta se você quer sacola. Você não quer. Responda:',
        correta: 'いいえ、{大丈夫|だいじょうぶ} です。',
        erradas: ['いらっしゃいませ。', 'いただきます。'],
      },
      {
        id: 's-konbini-2',
        tipo: 'significado',
        frase: '{温|あたた}めますか。',
        correta: 'Quer que eu esquente?',
        erradas: ['Quer sacola?', 'Vai pagar com cartão?'],
      },
      {
        id: 's-konbini-3',
        tipo: 'escolha',
        pergunta: 'Como dizer "No cartão, por favor"?',
        correta: 'カード で お{願|ねが}いします。',
        erradas: ['カード は いくら ですか。', 'カード が あります。'],
      },
    ],
  },
  {
    id: 's-restaurante',
    titulo: 'Pedir comida em um restaurante',
    contexto: 'Você entra em um restaurante com uma pessoa.',
    falas: [
      {
        quem: 'Atendente',
        jp: 'いらっしゃいませ。{何名様|なんめいさま} ですか。',
        pt: 'Bem-vindos. Quantas pessoas?',
      },
      { quem: 'Você', jp: '{二人|ふたり} です。', pt: 'Duas.' },
      { quem: 'Atendente', jp: 'こちら へ どうぞ。', pt: 'Por aqui, por favor.' },
      {
        quem: 'Você',
        jp: 'すみません、メニュー を ください。',
        pt: 'Com licença, o cardápio, por favor.',
      },
      { quem: 'Você', jp: 'これ を {一|ひと}つ お{願|ねが}いします。', pt: 'Um deste, por favor.' },
      {
        quem: 'Você',
        jp: 'すみません、お{会計|かいけい} お{願|ねが}いします。',
        pt: 'Com licença, a conta, por favor.',
      },
      {
        quem: 'Você',
        jp: 'ごちそうさま でした。',
        pt: '(Expressão ao sair, agradecendo a refeição.)',
      },
    ],
    notas: [
      'Para chamar o atendente, levante a mão e diga すみません. Muitas mesas têm um botão de chamada.',
      'No Japão não se dá gorjeta.',
      'Para contar pessoas: 一人 (ひとり), 二人 (ふたり), 三人 (さんにん).',
      'Em muitos restaurantes, você paga no caixa, perto da saída, e não na mesa.',
    ],
    exercicios: [
      {
        id: 's-restaurante-1',
        tipo: 'significado',
        frase: '{何名様|なんめいさま} ですか。',
        correta: 'Quantas pessoas são?',
        erradas: ['Qual é o seu nome?', 'O que vai pedir?'],
      },
      {
        id: 's-restaurante-2',
        tipo: 'escolha',
        pergunta: 'Como pedir a conta?',
        correta: 'お{会計|かいけい} お{願|ねが}いします。',
        erradas: ['いただきます。', 'いらっしゃいませ。'],
      },
      {
        id: 's-restaurante-3',
        tipo: 'escolha',
        pergunta: 'Vocês são duas pessoas. Como responder?',
        correta: '{二人|ふたり} です。',
        erradas: ['{二|ふた}つ です。', '{二時|にじ} です。'],
        explicacao: '二つ conta objetos; 二時 são duas horas. Para pessoas: 二人 (ふたり).',
      },
    ],
  },
  {
    id: 's-direcoes',
    titulo: 'Pedir direções na rua',
    contexto: 'Você está procurando a estação e pergunta a uma pessoa na rua.',
    falas: [
      {
        quem: 'Você',
        jp: 'すみません。{駅|えき} は どこ ですか。',
        pt: 'Com licença. Onde fica a estação?',
      },
      {
        quem: 'Pessoa',
        jp: 'この {道|みち} を まっすぐ {行|い}って、{二|ふた}つ{目|め} の {角|かど} を {右|みぎ} に {曲|ま}がって ください。',
        pt: 'Siga reto por esta rua e vire à direita na segunda esquina.',
      },
      {
        quem: 'Você',
        jp: '{右|みぎ} です ね。ありがとう ございます。',
        pt: 'À direita, certo? Obrigado(a).',
      },
      { quem: 'Pessoa', jp: 'いいえ、どう いたしまして。', pt: 'De nada.' },
      {
        quem: 'Você (na estação)',
        jp: '{新宿|しんじゅく} に {行|い}きたい です が、{何番線|なんばんせん} ですか。',
        pt: 'Quero ir para Shinjuku. Qual é a plataforma?',
      },
    ],
    notas: [
      'Repetir a informação (右ですね) confirma que você entendeu. Isso é bem visto.',
      'ね no fim da frase pede confirmação: "certo?".',
      'Em estações, procure 改札 (かいさつ, catraca) e 番線 (ばんせん, número da plataforma).',
    ],
    exercicios: [
      {
        id: 's-direcoes-1',
        tipo: 'significado',
        frase: '{右|みぎ} に {曲|ま}がって ください。',
        correta: 'Vire à direita, por favor.',
        erradas: ['Vire à esquerda, por favor.', 'Siga reto, por favor.'],
      },
      {
        id: 's-direcoes-2',
        tipo: 'escolha',
        pergunta: 'Como perguntar onde fica a estação?',
        correta: '{駅|えき} は どこ ですか。',
        erradas: ['{駅|えき} は いくら ですか。', '{駅|えき} は {何時|なんじ} ですか。'],
      },
    ],
  },
  {
    id: 's-telefone',
    titulo: 'Atender o telefone da empresa',
    contexto:
      'Você trabalha na empresa Sakura. Um cliente liga procurando o seu colega Tanaka, que não está na mesa.',
    falas: [
      {
        quem: 'Você',
        jp: 'はい、サクラ{商事|しょうじ} で ございます。',
        pt: 'Alô, Sakura Comercial.',
      },
      {
        quem: 'Cliente',
        jp: '{山本|やまもと} と {申|もう}します が、{田中|たなか} さん は いらっしゃいますか。',
        pt: 'Aqui é Yamamoto. O(A) Sr(a). Tanaka está?',
      },
      {
        quem: 'Você',
        jp: '{申|もう}し{訳|わけ} ございません。{田中|たなか} は {今|いま}、{席|せき} を {外|はず}して おります。',
        pt: 'Sinto muito. Tanaka não está na mesa no momento.',
      },
      {
        quem: 'Você',
        jp: '{後|のち}ほど こちら から お{電話|でんわ} いたします。',
        pt: 'Retornaremos a ligação mais tarde.',
      },
      { quem: 'Cliente', jp: 'はい、お{願|ねが}いします。', pt: 'Sim, por favor.' },
    ],
    notas: [
      'Ao falar de um colega da sua empresa com alguém de fora, não use さん: diga 田中は, e não 田中さんは.',
      'でございます é a forma formal de です.',
      'おります é a forma humilde de います: usada para você e para a sua empresa.',
      'いらっしゃいます é a forma respeitosa de います: usada para outras pessoas.',
      'もしもし é comum em ligações pessoais. Ao atender o telefone da empresa, comece com はい、(nome da empresa)でございます.',
    ],
    exercicios: [
      {
        id: 's-telefone-1',
        tipo: 'escolha',
        pergunta: 'Um cliente procura o seu colega Tanaka, que não está. Qual frase está correta?',
        correta: '{田中|たなか} は {今|いま}、{席|せき} を {外|はず}して おります。',
        erradas: [
          '{田中|たなか} さん は どこ ですか。',
          '{田中|たなか} は {明日|あした} {休|やす}みたい です。',
        ],
        explicacao: 'Com pessoas de fora, fale do colega sem さん e use a forma humilde おります.',
      },
      {
        id: 's-telefone-2',
        tipo: 'escolha',
        pergunta: 'Como atender o telefone da empresa?',
        correta: 'はい、サクラ{商事|しょうじ} で ございます。',
        erradas: ['お{疲|つか}れ{様|さま} でした。', 'いらっしゃいませ。'],
      },
    ],
  },
  {
    id: 's-farmacia',
    titulo: 'Comprar remédio na farmácia',
    contexto: 'Você está com dor de cabeça e vai a uma farmácia.',
    falas: [
      {
        quem: 'Você',
        jp: 'すみません。{頭|あたま} が {痛|いた}い です。{薬|くすり} は ありますか。',
        pt: 'Com licença. Estou com dor de cabeça. Tem remédio?',
      },
      { quem: 'Farmacêutico', jp: 'アレルギー は ありますか。', pt: 'Você tem alguma alergia?' },
      { quem: 'Você', jp: 'いいえ、ありません。', pt: 'Não, não tenho.' },
      {
        quem: 'Farmacêutico',
        jp: 'では、こちら は いかが ですか。{一日|いちにち} {三回|さんかい}、{食後|しょくご} に {飲|の}んで ください。',
        pt: 'Então, que tal este? Tome três vezes ao dia, depois das refeições.',
      },
      {
        quem: 'Você',
        jp: '{一日|いちにち} {三回|さんかい} です ね。{分|わ}かりました。',
        pt: 'Três vezes ao dia, certo? Entendi.',
      },
    ],
    notas: [
      'Em japonês, remédio se "bebe": 薬を飲みます.',
      '熱があります = estou com febre. お腹が痛いです = estou com dor de barriga.',
      'Emergências: 119 (ambulância e bombeiros) e 110 (polícia).',
    ],
    exercicios: [
      {
        id: 's-farmacia-1',
        tipo: 'escolha',
        pergunta: 'Como dizer "Estou com dor de cabeça"?',
        correta: '{頭|あたま} が {痛|いた}い です。',
        erradas: ['お{腹|なか} が {痛|いた}い です。', '{熱|ねつ} が あります。'],
      },
      {
        id: 's-farmacia-2',
        tipo: 'significado',
        frase: '{一日|いちにち} {三回|さんかい} {飲|の}んで ください。',
        correta: 'Tome três vezes ao dia.',
        erradas: ['Tome uma vez a cada três dias.', 'Tome três comprimidos de uma vez.'],
      },
    ],
  },
  {
    id: 's-reuniao',
    titulo: 'Combinar uma reunião com um colega',
    contexto: 'Um colega pergunta sobre a reunião de amanhã.',
    falas: [
      {
        quem: 'Colega',
        jp: 'シルバ さん、{明日|あした} の {会議|かいぎ} は {何時|なんじ} から ですか。',
        pt: 'Silva, a reunião de amanhã começa a que horas?',
      },
      {
        quem: 'Você',
        jp: '{十時|じゅうじ} から です。{三階|さんがい} の {会議室|かいぎしつ} です。',
        pt: 'Às 10h. É na sala de reunião do terceiro andar.',
      },
      {
        quem: 'Colega',
        jp: '{分|わ}かりました。{資料|しりょう} を {送|おく}って もらえますか。',
        pt: 'Entendi. Você pode me enviar o material?',
      },
      {
        quem: 'Você',
        jp: 'はい、{今日中|きょうじゅう} に メール で {送|おく}ります。',
        pt: 'Sim, envio por e-mail ainda hoje.',
      },
      {
        quem: 'Colega',
        jp: 'ありがとう ございます。{助|たす}かります。',
        pt: 'Obrigado(a). Isso ajuda muito.',
      },
    ],
    notas: [
      '分かりました é a forma polida de "entendi". Com clientes e superiores, use かしこまりました.',
      '～てもらえますか é uma forma educada de pedir um favor a um colega.',
      '助かります agradece uma ajuda concreta.',
      '階 (かい) conta andares: 一階 (いっかい), 二階 (にかい), 三階 (さんがい).',
    ],
    exercicios: [
      {
        id: 's-reuniao-1',
        tipo: 'significado',
        frase: '{資料|しりょう} を メール で {送|おく}ります。',
        correta: 'Vou enviar o material por e-mail.',
        erradas: ['Recebi o material por e-mail.', 'Vou imprimir o material.'],
      },
      {
        id: 's-reuniao-2',
        tipo: 'escolha',
        pergunta: 'O seu chefe pede uma tarefa. Qual resposta é a mais adequada?',
        correta: 'かしこまりました。',
        erradas: ['{分|わ}かった。', 'いい よ。'],
        explicacao: '分かった e いいよ são formas casuais, usadas entre amigos.',
      },
    ],
  },
];
