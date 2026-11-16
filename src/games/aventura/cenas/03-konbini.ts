import type { Scene } from '../engine';

/** Cena 3. Mais kanji e o jeito formal que todo caixa de loja usa. */
export const konbini: Scene = {
  id: 'konbini',
  title: 'Primeira compra',
  jp: 'コンビニ',
  place: 'Konbini perto da estação',
  start: 'abre',
  nodes: {
    abre: {
      kind: 'narra',
      pt: 'Tóquio, oito da noite. A fome venceu o sono. A porta do konbini abre sozinha e toca uma musiquinha.',
      next: 'oi',
    },
    oi: { kind: 'fala', who: 'balconista', jp: '[いらっしゃいませ||=]。', pt: 'Bem-vindo.', next: 'agua' },
    agua: {
      kind: 'escolha',
      pt: 'Bentô na mão. Falta a água, e você não acha. O que pergunta?',
      options: [
        { jp: '[すみません||=]、[お水|おみず|=]は [どこ||=]ですか。', pt: 'Com licença, onde fica a água?', r: 'ok', next: 'ali' },
        { jp: '[すみません||=]、[お水|おみず|=]は [いくら||=]ですか。', pt: 'Com licença, quanto custa a água?', r: 'ok', next: 'custa' },
        { jp: '[すみません||=]、[お水|おみず|=]を [飲みます|のみます|飲む]か。', pt: 'Com licença, você bebe água?', r: 'odd', next: 'bebe' },
      ],
    },
    ali: {
      kind: 'fala',
      who: 'balconista',
      jp: '[お水|おみず|=]は [あちら||=]です。[飲み物|のみもの|=]の コーナーに あります。',
      pt: 'A água fica ali. Está na seção de bebidas.',
      next: 'caixa',
    },
    custa: {
      kind: 'fala',
      who: 'balconista',
      jp: '[百十円|ひゃくじゅうえん]です。[あちら||=]に ありますよ。',
      pt: 'Custa 110 ienes. Fica ali.',
      next: 'caixa',
    },
    bebe: {
      kind: 'fala',
      who: 'balconista',
      jp: 'え？ いえ、[今|いま|=]は [大丈夫|だいじょうぶ|=]です…。[お水|おみず|=]は [あちら||=]ですよ。',
      pt: 'Hã? Não, agora estou bem... A água fica ali.',
      next: 'caixa',
    },
    caixa: { kind: 'narra', pt: 'Água encontrada. Você leva tudo ao caixa.', next: 'esquenta' },
    esquenta: {
      kind: 'escolha',
      who: 'balconista',
      jp: '[お弁当|おべんとう|=]、[温めます|あたためます|温める]か。',
      pt: 'Quer que esquente o bentô?',
      options: [
        { jp: 'はい、[おねがいします||お願いします]。', pt: 'Sim, por favor.', r: 'ok', next: 'sacola' },
        { jp: 'いいえ、[大丈夫|だいじょうぶ|=]です。', pt: 'Não precisa.', r: 'ok', next: 'sacola' },
        { jp: 'はい、[食べます|たべます|食べる]。', pt: 'Sim, vou comer.', r: 'odd', next: 'micro' },
      ],
    },
    micro: {
      kind: 'fala',
      who: 'balconista',
      jp: 'あ、はい…。[レンジ||=]で [温めます|あたためます|温める]か。',
      pt: 'Ah, tá... Esquento no micro-ondas?',
      next: 'esquenta',
    },
    sacola: {
      kind: 'escolha',
      who: 'balconista',
      jp: '[袋|ふくろ|=]は ご[利用|りよう|=]ですか。',
      pt: 'Vai usar sacola?',
      options: [
        { jp: 'はい、[おねがいします||お願いします]。', pt: 'Sim, por favor.', r: 'ok', next: 'total' },
        { jp: 'いいえ、[大丈夫|だいじょうぶ|=]です。', pt: 'Não precisa.', r: 'ok', next: 'total' },
        { jp: '[すみません||=]、[もう一度|もういちど|=] [おねがいします||お願いします]。', pt: 'Desculpe, pode repetir?', r: 'again', next: 'sacola2' },
      ],
    },
    sacola2: { kind: 'fala', who: 'balconista', jp: '[ふくろ||袋]。バッグ。[いります||要る]か。', pt: 'Sacola. Bag. Precisa?', next: 'sacola' },
    total: {
      kind: 'escolha',
      who: 'balconista',
      jp: '[全部|ぜんぶ|=]で [七百五十円|ななひゃくごじゅうえん]です。',
      pt: 'No total, 750 ienes.',
      options: [
        { jp: '[千円|せんえん|=]で [おねがいします||お願いします]。', pt: 'Aqui, 1.000 ienes.', r: 'ok', next: 'troco' },
        { jp: '[カード||=]で [おねがいします||お願いします]。', pt: 'No cartão, por favor.', r: 'ok', next: 'cartao' },
        { jp: '[七十五円|ななじゅうごえん]ですね。', pt: '75 ienes, certo.', r: 'odd', next: 'nao75' },
      ],
    },
    nao75: { kind: 'fala', who: 'balconista', jp: 'いえ、[七百五十円|ななひゃくごじゅうえん]です。', pt: 'Não, são 750 ienes.', next: 'total' },
    troco: {
      kind: 'fala',
      who: 'balconista',
      jp: '[千円|せんえん|=] お[預かり|あずかり|預かる]します。[二百五十円|にひゃくごじゅうえん]の [お返し|おかえし|=]です。',
      pt: 'Recebo 1.000 ienes. Seu troco, 250 ienes.',
      next: 'tchau',
    },
    cartao: { kind: 'fala', who: 'balconista', jp: 'はい、こちらに タッチして [ください||下さい]。', pt: 'Certo, encoste o cartão aqui.', next: 'tchau' },
    tchau: {
      kind: 'fala',
      who: 'balconista',
      jp: 'ありがとうございました。また [お越し|おこし] くださいませ。',
      pt: 'Muito obrigado. Volte sempre.',
      next: 'obrigado',
    },
    obrigado: { kind: 'fala', who: 'voce', jp: '[ありがとうございます||=]。', pt: 'Obrigado.', next: 'jantar' },
    jantar: { kind: 'narra', pt: 'Primeiro jantar no Japão: bentô de konbini num banco de praça. Amanhã tem mais.', next: 'fim' },
  },
};
