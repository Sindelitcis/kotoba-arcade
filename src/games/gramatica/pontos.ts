/**
 * Curso do Kumitate: os pontos de gramática na ordem em que destravam, cada um
 * com a lição, um exemplo montado e as frases para montar. Só dados.
 *
 * A ordem segue três coisas: o que as listas N5 e N4 cobram, a frequência das
 * partículas no japonês escrito (の, に, は, を, が no topo) e a sequência de
 * aquisição da Teoria da Processabilidade aplicada ao japonês (Kawaguchi):
 * primeiro as pontas de verbo que mudam só a palavra (ます, ません, ました, たい),
 * depois as que ligam dois pedaços (て ください, ています) e por último as formas
 * simples (ない, た), que pedem saber o grupo do verbo.
 *
 * Marcação das frases: ver `parseSentence` em `engine.ts`.
 */
import type { Course, Point, Verb } from './engine';

export const VERBS: Readonly<Record<string, Verb>> = {
  行く: { jp: '行く', kana: 'いく', group: 'godan', pt: 'ir' },
  来る: { jp: '来る', kana: 'くる', group: 'kuru', pt: 'vir' },
  飲む: { jp: '飲む', kana: 'のむ', group: 'godan', pt: 'beber' },
  食べる: { jp: '食べる', kana: 'たべる', group: 'ichidan', pt: 'comer' },
  読む: { jp: '読む', kana: 'よむ', group: 'godan', pt: 'ler' },
  書く: { jp: '書く', kana: 'かく', group: 'godan', pt: 'escrever' },
  買う: { jp: '買う', kana: 'かう', group: 'godan', pt: 'comprar' },
  話す: { jp: '話す', kana: 'はなす', group: 'godan', pt: 'falar' },
  見る: { jp: '見る', kana: 'みる', group: 'ichidan', pt: 'ver' },
  分かる: { jp: '分かる', kana: 'わかる', group: 'godan', pt: 'entender' },
  入れる: { jp: '入れる', kana: 'いれる', group: 'ichidan', pt: 'colocar dentro' },
  休む: { jp: '休む', kana: 'やすむ', group: 'godan', pt: 'descansar' },
  する: { jp: 'する', kana: 'する', group: 'suru', pt: 'fazer' },
};

/** Palavras de apoio que não estão no conteúdo dos outros jogos. */
export const GLOSSARY: Readonly<Record<string, string>> = {
  わたし: 'eu',
  これ: 'isto',
  あそこ: 'ali',
  コーヒー: 'café',
  本: 'livro',
  です: 'é, são',
  あります: 'tem, existe (coisa)',
  います: 'tem, existe (gente, bicho)',
  ください: 'por favor (pedido)',
};

export const POINTS: readonly Point[] = [
  {
    id: 'wa',
    blocks: ['は'],
    roles: ['wa'],
    title: 'は: o assunto da frase',
    lesson: 'は vem logo depois do assunto, e o resto da frase fala sobre ele. Como partícula, se lê "wa". です fecha a frase de um jeito educado.',
    example: { jp: '[先生|せんせい|=] {wa} [日本人|にほんじん|=] です', pt: 'O professor é japonês.' },
    sentences: [
      { jp: 'わたし {wa} [学生|がくせい|=] です', pt: 'Eu sou estudante.' },
      { jp: '[友達|ともだち|=] {wa} [日本人|にほんじん|=] です', pt: 'Meu amigo é japonês.' },
      { jp: '[今日|きょう|=] {wa} [日曜日|にちようび|=] です', pt: 'Hoje é domingo.' },
      { jp: '[東京|とうきょう|=] {wa} [大きい|おおきい|=] です', pt: 'Tóquio é grande.' },
      { jp: '[駅|えき|=] {wa} [あちら||=] です', pt: 'A estação é para lá.' },
    ],
  },
  {
    id: 'no',
    blocks: ['の'],
    roles: ['no'],
    title: 'の: de quem, de quê',
    lesson: 'の liga duas palavras. A primeira diz de quem ou de quê é a segunda: わたしの 本 é "o meu livro".',
    example: { jp: 'これ {wa} [先生|せんせい|=] {no} [辞書|じしょ|=] です', pt: 'Isto é o dicionário do professor.' },
    sentences: [
      { jp: 'わたし {no} [友達|ともだち|=] {wa} [先生|せんせい|=] です', pt: 'Meu amigo é professor.' },
      { jp: 'これ {wa} [友達|ともだち|=] {no} [本|ほん] です', pt: 'Isto é o livro do meu amigo.' },
      { jp: '[あの人|あのひと|=] {wa} [日本語|にほんご|=] {no} [先生|せんせい|=] です', pt: 'Aquela pessoa é professora de japonês.' },
      { jp: '[駅|えき|=] {no} [出口|でぐち|=] {wa} [あちら||=] です', pt: 'A saída da estação é para lá.' },
    ],
  },
  {
    id: 'wo',
    blocks: ['を'],
    roles: ['wo'],
    title: 'を: o que sofre a ação',
    lesson: 'を marca a coisa que você come, bebe, compra, lê. Fica logo antes do verbo. Como partícula, se lê "o".',
    example: { jp: '[飲み物|のみもの|=] {wo} {masu:買う}', pt: 'Eu compro uma bebida.' },
    sentences: [
      { jp: '[お水|おみず|=] {wo} {masu:飲む}', pt: 'Eu bebo água.' },
      { jp: '[本|ほん] {wo} {masu:読む}', pt: 'Eu leio livros.' },
      { jp: '[お弁当|おべんとう|=] {wo} {masu:食べる}', pt: 'Eu como o bentô.' },
      { jp: '[切符|きっぷ|=] {wo} {masu:買う}', pt: 'Eu compro o bilhete.' },
      { jp: '[日本語|にほんご|=] {wo} {masu:話す}', pt: 'Eu falo japonês.' },
    ],
  },
  {
    id: 'masu',
    blocks: ['ます', 'ません'],
    roles: ['masu', 'masen'],
    title: 'ます e ません: sim e não',
    lesson: 'O verbo educado termina em ます. Para dizer "não", a ponta vira ません. A ponta do verbo é uma peça: escolha a certa e o verbo muda sozinho.',
    example: { jp: '[お父さん|おとうさん|=] {wa} [天ぷら|てんぷら|=] {wo} {masen:食べる}', pt: 'Meu pai não come tempurá.' },
    sentences: [
      { jp: 'わたし {wa} [和食|わしょく|=] {wo} {masu:食べる}', pt: 'Eu como comida japonesa.' },
      { jp: '[友達|ともだち|=] {wa} [日本語|にほんご|=] {wo} {masen:話す}', pt: 'Meu amigo não fala japonês.' },
      { jp: 'わたし {wa} コーヒー {wo} {masen:飲む}', pt: 'Eu não bebo café.' },
      { jp: '[今日|きょう|=] {wa} [学校|がっこう|=] {ni} {masen:行く}', pt: 'Hoje eu não vou à escola.' },
      { jp: '[毎週|まいしゅう|=] [買い物|かいもの|=] {wo} {masu:する}', pt: 'Toda semana eu faço compras.' },
    ],
  },
  {
    id: 'mashita',
    blocks: ['ました'],
    roles: ['mashita'],
    title: 'ました: já aconteceu',
    lesson: 'Para falar do passado, ます vira ました. Palavras como 去年 (ano passado) avisam que a frase é no passado.',
    example: { jp: '[去年|きょねん|=] [花見|はなみ|=] {wo} {mashita:する}', pt: 'No ano passado eu fiz hanami.' },
    sentences: [
      { jp: '[去年|きょねん|=] [日本|にほん|=] {ni} {mashita:行く}', pt: 'No ano passado eu fui ao Japão.' },
      { jp: '[今日|きょう|=] [お弁当|おべんとう|=] {wo} {mashita:食べる}', pt: 'Hoje eu comi bentô.' },
      { jp: '[この間|このあいだ|=] [新幹線|しんかんせん|=] {wo} {mashita:見る}', pt: 'Outro dia eu vi o trem-bala.' },
      { jp: '[週末|しゅうまつ|=] [友達|ともだち|=] {to} [花見|はなみ|=] {wo} {mashita:する}', pt: 'No fim de semana eu fiz hanami com amigos.' },
    ],
  },
  {
    id: 'ni',
    blocks: ['に', 'へ'],
    roles: ['ni'],
    title: 'に e へ: para onde',
    lesson: 'に e へ marcam para onde você vai. Com 行く (ir) e 来る (vir), as duas servem. へ, como partícula, se lê "e".',
    example: { jp: '[来週|らいしゅう|=] [空港|くうこう|=] {ni} {masu:行く}', pt: 'Semana que vem eu vou ao aeroporto.' },
    sentences: [
      { jp: 'わたし {wa} [東京|とうきょう|=] {ni} {masu:行く}', pt: 'Eu vou para Tóquio.' },
      { jp: '[来年|らいねん|=] [日本|にほん|=] {ni} {masu:行く}', pt: 'Ano que vem eu vou ao Japão.' },
      { jp: '[友達|ともだち|=] {wa} [駅|えき|=] {ni} {masu:来る}', pt: 'Meu amigo vem para a estação.' },
      { jp: '[週末|しゅうまつ|=] [銀行|ぎんこう|=] {ni} {masu:行く}', pt: 'No fim de semana eu vou ao banco.' },
    ],
  },
  {
    id: 'de',
    blocks: ['で'],
    roles: ['de'],
    title: 'で: onde a ação acontece',
    lesson: 'で marca o lugar onde você faz a coisa: onde come, compra, lê. Não confunda com に, que é para onde você vai.',
    example: { jp: '[お店|おみせ|=] {de} [お弁当|おべんとう|=] {wo} {masu:買う}', pt: 'Eu compro bentô na loja.' },
    sentences: [
      { jp: '[喫茶店|きっさてん|=] {de} コーヒー {wo} {masu:飲む}', pt: 'Eu bebo café na cafeteria.' },
      { jp: '[図書館|としょかん|=] {de} [本|ほん] {wo} {masu:読む}', pt: 'Eu leio livros na biblioteca.' },
      { jp: '[駅|えき|=] {de} [切符|きっぷ|=] {wo} {masu:買う}', pt: 'Eu compro o bilhete na estação.' },
      { jp: '[大学|だいがく|=] {de} [日本語|にほんご|=] {wo} {masu:話す}', pt: 'Eu falo japonês na faculdade.' },
    ],
  },
  {
    id: 'to',
    blocks: ['と'],
    roles: ['to'],
    title: 'と: com quem',
    lesson: 'と depois de uma pessoa quer dizer "com": com quem você faz a coisa.',
    example: { jp: '[友達|ともだち|=] {to} [喫茶店|きっさてん|=] {ni} {masu:行く}', pt: 'Eu vou à cafeteria com um amigo.' },
    sentences: [
      { jp: '[友達|ともだち|=] {to} [東京|とうきょう|=] {ni} {masu:行く}', pt: 'Eu vou a Tóquio com um amigo.' },
      { jp: '[お母さん|おかあさん|=] {to} [和食|わしょく|=] {wo} {masu:食べる}', pt: 'Eu como comida japonesa com a minha mãe.' },
      { jp: '[先生|せんせい|=] {to} {masu:話す}', pt: 'Eu converso com o professor.' },
      { jp: '[子供|こども|=] {to} [花火|はなび|=] {wo} {masu:見る}', pt: 'Eu vejo os fogos com as crianças.' },
    ],
  },
  {
    id: 'mo',
    blocks: ['も'],
    roles: ['mo'],
    title: 'も: também',
    lesson: 'も quer dizer "também". Ela entra no lugar de は: わたしは vira わたしも.',
    example: { jp: '[あの人|あのひと|=] {mo} [学生|がくせい|=] です', pt: 'Aquela pessoa também é estudante.' },
    sentences: [
      { jp: 'わたし {mo} [学生|がくせい|=] です', pt: 'Eu também sou estudante.' },
      { jp: '[友達|ともだち|=] {mo} [日本人|にほんじん|=] です', pt: 'Meu amigo também é japonês.' },
      { jp: '[お父さん|おとうさん|=] {mo} [東京|とうきょう|=] {ni} {masu:来る}', pt: 'Meu pai também vem para Tóquio.' },
      { jp: '[彼女|かのじょ|=] {mo} コーヒー {wo} {masen:飲む}', pt: 'Ela também não bebe café.' },
    ],
  },
  {
    id: 'ga',
    blocks: ['が'],
    roles: ['ga'],
    title: 'が com あります e います: tem',
    lesson: 'Para dizer que algo existe num lugar: lugar に, coisa が, あります. Se for gente ou bicho, います no lugar de あります.',
    example: { jp: '[駅前|えきまえ|=] に [銀行|ぎんこう|=] {ga} あります', pt: 'Em frente à estação tem um banco.' },
    sentences: [
      { jp: '[駅|えき|=] に [トイレ||=] {ga} あります', pt: 'Na estação tem banheiro.' },
      { jp: 'あそこ に [駅員|えきいん|=] {ga} います', pt: 'Ali tem um funcionário da estação.' },
      { jp: '[お店|おみせ|=] に [飲み物|のみもの|=] {ga} あります', pt: 'Na loja tem bebidas.' },
      { jp: '[図書館|としょかん|=] に [子供|こども|=] {ga} います', pt: 'Na biblioteca tem crianças.' },
    ],
  },
  {
    id: 'tai',
    blocks: ['たい'],
    roles: ['tai'],
    title: 'たい: quero',
    lesson: 'Para dizer que quer fazer algo, o verbo troca ます por たい: 行きます vira 行きたい. Com です no fim, fica educado.',
    example: { jp: '[お土産|おみやげ|=] {wo} {tai:買う} です', pt: 'Eu quero comprar lembrancinhas.' },
    sentences: [
      { jp: '[日本|にほん|=] {ni} {tai:行く} です', pt: 'Eu quero ir ao Japão.' },
      { jp: '[天ぷら|てんぷら|=] {wo} {tai:食べる} です', pt: 'Eu quero comer tempurá.' },
      { jp: '[富士山|ふじさん|=] {wo} {tai:見る} です', pt: 'Eu quero ver o Monte Fuji.' },
      { jp: '[日本語|にほんご|=] {wo} {tai:話す} です', pt: 'Eu quero falar japonês.' },
    ],
  },
  {
    id: 'te',
    blocks: ['て'],
    roles: ['te'],
    title: 'て ください: por favor',
    lesson: 'Para pedir algo com educação: verbo na forma て e depois ください. A forma て muda um pouco em cada verbo (書いて, 読んで, 食べて), mas a peça é sempre て.',
    example: { jp: '[ここ||=] {ni} [名前|なまえ|=] {wo} {te:書く} ください', pt: 'Escreva o nome aqui, por favor.' },
    sentences: [
      { jp: '[ゆっくり||=] {te:話す} ください', pt: 'Fale devagar, por favor.' },
      { jp: '[名前|なまえ|=] {wo} {te:書く} ください', pt: 'Escreva o seu nome, por favor.' },
      { jp: '[袋|ふくろ|=] {ni} {te:入れる} ください', pt: 'Coloque na sacola, por favor.' },
      { jp: '[ここ||=] {ni} {te:来る} ください', pt: 'Venha aqui, por favor.' },
      { jp: '[ここ||=] {de} {te:休む} ください', pt: 'Descanse aqui, por favor.' },
    ],
  },
  {
    id: 'teiru',
    blocks: ['ています'],
    roles: ['teiru'],
    title: 'ています: está fazendo',
    lesson: 'Para algo que está acontecendo agora: forma て e depois います. 読んでいます é "está lendo".',
    example: { jp: '[お母さん|おかあさん|=] {wa} [電話|でんわ|=] {wo} {teiru:する}', pt: 'Minha mãe está no telefone.' },
    sentences: [
      { jp: '[友達|ともだち|=] {wa} [本|ほん] {wo} {teiru:読む}', pt: 'Meu amigo está lendo um livro.' },
      { jp: '[今|いま|=] [お弁当|おべんとう|=] {wo} {teiru:食べる}', pt: 'Agora eu estou comendo bentô.' },
      { jp: '[あの人|あのひと|=] {wa} [電話|でんわ|=] {wo} {teiru:する}', pt: 'Aquela pessoa está falando ao telefone.' },
      { jp: '[子供|こども|=] {wa} [花火|はなび|=] {wo} {teiru:見る}', pt: 'As crianças estão vendo os fogos.' },
    ],
  },
  {
    id: 'nai',
    blocks: ['ない'],
    roles: ['nai'],
    title: 'ない: não, entre amigos',
    lesson: 'Com amigos se fala na forma simples, sem ます. O "não" simples é ない: 行かない (não vou), 食べない (não como).',
    example: { jp: '[来週|らいしゅう|=] {wa} {nai:来る}', pt: '(com um amigo) Semana que vem eu não venho.' },
    sentences: [
      { jp: '[今日|きょう|=] {wa} {nai:行く}', pt: '(com um amigo) Hoje eu não vou.' },
      { jp: '[日本語|にほんご|=] が {nai:分かる}', pt: '(com um amigo) Eu não entendo japonês.' },
      { jp: '[今日|きょう|=] {wa} [お弁当|おべんとう|=] {wo} {nai:食べる}', pt: '(com um amigo) Hoje eu não vou comer bentô.' },
      { jp: '[週末|しゅうまつ|=] {wa} {nai:休む}', pt: '(com um amigo) No fim de semana eu não descanso.' },
    ],
  },
  {
    id: 'ta',
    blocks: ['た'],
    roles: ['ta'],
    title: 'た: já foi, entre amigos',
    lesson: 'O passado simples, entre amigos, é た: 行った, 食べた, 読んだ. Sai da forma て, trocando て por た (e で por だ).',
    example: { jp: '[週末|しゅうまつ|=] [買い物|かいもの|=] {wo} {ta:する}', pt: '(com um amigo) No fim de semana eu fiz compras.' },
    sentences: [
      { jp: '[去年|きょねん|=] [東京|とうきょう|=] {ni} {ta:行く}', pt: '(com um amigo) No ano passado eu fui a Tóquio.' },
      { jp: '[今日|きょう|=] [天ぷら|てんぷら|=] {wo} {ta:食べる}', pt: '(com um amigo) Hoje eu comi tempurá.' },
      { jp: '[この間|このあいだ|=] [富士山|ふじさん|=] {wo} {ta:見る}', pt: '(com um amigo) Outro dia eu vi o Monte Fuji.' },
      { jp: '[友達|ともだち|=] {to} {ta:話す}', pt: '(com um amigo) Eu conversei com um amigo.' },
      { jp: '[駅|えき|=] {de} [切符|きっぷ|=] {wo} {ta:買う}', pt: '(com um amigo) Eu comprei o bilhete na estação.' },
    ],
  },
];

export const COURSE: Course = { points: POINTS, verbs: VERBS, glossary: GLOSSARY };
