/**
 * A aula falada das unidades do A2, no mesmo formato das do A1 (aulas.ts): a fala em português na
 * Voz 1, o japonês entre chaves para a voz japonesa, e o complemento escrito na tela.
 */
import type { QuadroAula } from './aulas';

export const AULAS_A2: Readonly<Record<string, readonly QuadroAula[]>> = {
  'a2-01': [
    { fala: 'Começa o nível A dois. Daqui em diante, as frases ficam mais longas e mais naturais. Nesta unidade, o assunto é falar de planos: o que você quer fazer, o que pretende e o que já está marcado.' },
    { fala: 'O verbo tem uma forma para convidar e para decidir em voz alta, a volitiva. No grupo do {かう}, a última vogal vira o, com o som esticado: {行く|いく} vira {行こう|いこう}. No grupo do {食べる|たべる}, o fim troca por {よう}: {食べよう|たべよう}. E {する} vira {しよう}.', tela: '行く → 行こう · 食べる → 食べよう · する → しよう · 来る → こよう', ex: 'ikou' },
    { fala: 'Com {と思います|とおもいます} depois, a forma volitiva vira intenção: penso em fazer. Usar {と思っています|とおもっています} mostra que a ideia já vem de algum tempo.', tela: '日本へ行こうと思います。', ex: 'to-omou' },
    { fala: 'A palavra {つもり} é a intenção mais firme. Vem depois do verbo na forma de dicionário. Para dizer que pretende não fazer, o verbo vai na forma do não.', tela: '行くつもりです · 行かないつもりです', ex: 'tsumori' },
    { fala: 'Já {よてい} é o que está marcado, com dia e hora, e não depende só da sua vontade: o voo, a reunião, a mudança.', tela: '四時に着くよていです。', ex: 'yotei' },
  ],
  'a2-02': [
    { fala: 'Unidade dois: procurar casa. Para escolher, é preciso dizer o que sobra, o que falta e o que parece bom.' },
    { fala: 'O verbo {すぎる} quer dizer passar do ponto. Grudado no adjetivo ou no verbo, ele vira demais. O adjetivo perde a ponta {い}; o verbo entra na forma educada, sem a ponta {ます}.', tela: '高い → 高すぎる · 食べます → 食べすぎる', ex: 'sugiru' },
    { fala: 'Do mesmo jeito, {やすい} grudado no verbo quer dizer fácil de fazer, e {にくい}, difícil. Cuidado: aqui {やすい} não tem nada a ver com barato.', tela: '書きやすい · おぼえにくい', ex: 'yasui-nikui' },
    { fala: 'O final {そう} quer dizer parece, pelo que se vê. O adjetivo perde a ponta {い}: gostoso vira {おいしそう}. A exceção é bom: {いい} vira {よさそう}.', tela: 'おいしい → おいしそう · いい → よさそう', ex: 'sou-aparencia' },
    { fala: 'E {し} junta razões, uma depois da outra: é perto, e ainda é barato. Dá a ideia de que há mais motivos além desses.', tela: '広いし、明るいです。', ex: 'shi' },
  ],
  'a2-03': [
    { fala: 'Unidade três: a mudança e os vizinhos. O japonês tem três verbos para dar e receber, e eles dependem de quem dá para quem.' },
    { fala: 'O verbo {あげる} é dar de mim para os outros, ou de alguém para alguém. O verbo {くれる} é quando alguém dá para mim, ou para alguém do meu lado. E {もらう} é receber, olhando do lado de quem ganha.', tela: 'あげる: eu → outro · くれる: outro → eu · もらう: eu recebo', ex: 'ageru-kureru-morau' },
    { fala: 'Os mesmos três verbos vão depois da forma te para falar de favores: fazer algo por alguém, alguém fazer algo por mim, ou eu conseguir que alguém faça.', tela: '持ってあげます · 運んでくれました · しゅうりしてもらいました', ex: 'te-ageru' },
    { fala: 'A forma te mais {おく} quer dizer deixar feito, já pensando no depois: comprar antes, deixar aberto.', tela: 'かっておきます · 開けておいてください', ex: 'te-oku' },
    { fala: 'A forma te mais {あります} conta como a coisa está, porque alguém fez de propósito: está escrito, está arrumado. Aqui o objeto vem com {が}.', tela: 'ドアに名前が書いてあります。', ex: 'te-aru' },
  ],
  'a2-04': [
    { fala: 'Unidade quatro: a prefeitura. Para resolver papéis, você vai dizer o que consegue fazer e perguntar o que não sabe.' },
    { fala: 'A forma potencial diz o que se consegue fazer. No grupo do {かう}, a última vogal vira e, e o verbo termina em {る}: {話す|はなす} vira {話せる|はなせる}. No grupo do {食べる|たべる}, entra {られる}: {食べられる|たべられる}. E {する} vira {できる}.', tela: '話す → 話せる · 食べる → 食べられる · する → できる · 来る → こられる', ex: 'kanoukei' },
    { fala: 'Outro jeito, um pouco mais formal, é o verbo na forma de dicionário mais {ことができます}. Quer dizer a mesma coisa: é possível.', tela: '出すことができます。', ex: 'koto-ga-dekiru' },
    { fala: 'Para dizer chamado, ou que se chama, use {という} entre o nome e a coisa.', tela: 'ざいりゅうカードというカード', ex: 'to-iu' },
    { fala: 'Para uma dúvida de sim ou não dentro da frase, use {かどうか}: não sei se precisa.', tela: 'ひつようかどうか分かりません。', ex: 'ka-dou-ka' },
    { fala: 'Se a dúvida tem palavra de pergunta, como onde ou quando, basta {か} no fim dela, e a frase continua.', tela: 'どこにならぶか分かりません。', ex: 'pergunta-dentro' },
  ],
  'a2-05': [
    { fala: 'Unidade cinco: banco e correio. Aqui entram as quatro formas de dizer se, cada uma com o seu jeito.' },
    { fala: 'A mais usada é {たら}: a forma ta com {ら} no fim. Serve para se e para quando, e funciona em quase tudo.', tela: '着いたら · あったら', ex: 'tara' },
    { fala: 'A forma {ば} é a condição pura: se isto, então aquilo. A última vogal do verbo vira e, mais {ば}: {おす} vira {おせば}. O verbo {ある} vira {あれば}.', tela: 'おす → おせば · ある → あれば · いい → よければ', ex: 'ba' },
    { fala: 'Com {と} depois da forma de dicionário, o resultado vem sempre, quase sem querer: virando à direita, tem um banco; chegando a primavera, as flores abrem. Não serve para pedido nem para vontade.', tela: '右にまがると、銀行があります。', ex: 'to-condicao' },
    { fala: 'E {なら} pega o que o outro falou e responde a partir dele: se é selo que você quer, então compre na konbini.', tela: '切手なら、コンビニでもかえます。', ex: 'nara' },
  ],

  'a2-06': [
    { fala: 'Unidade seis: compras e trocas. Para reclamar com educação, é preciso ligar as ideias: mesmo assim, apesar disso, por isso.' },
    { fala: 'A forma te mais {も} quer dizer mesmo que. O adjetivo troca a ponta {い} por {くても}: mesmo caro, {高くても|たかくても}.', tela: 'ふっても · 高くても · 安くても', ex: 'temo' },
    { fala: 'A palavra {のに} quer dizer apesar de, e carrega um pouco de queixa ou de surpresa: é novo, e mesmo assim quebrou.', tela: '新しいのに、もうこわれました。', ex: 'noni' },
    { fala: 'Já {ので} dá o motivo, como {から}, mas soa mais suave e educado. É a escolha certa para explicar um pedido.', tela: 'きついので、こうかんしたいです。', ex: 'node' },
    { fala: 'Para dizer só, há dois jeitos. {だけ} é neutro: só um. {しか} pede o verbo no negativo e reforça a falta: só aceita dinheiro vivo, e mais nada.', tela: '一つだけ買いました · げんきんしか使えません', ex: 'dake-shika' },
  ],
  'a2-07': [
    { fala: 'Unidade sete: procurar um bico. Aqui você aprende a contar decisões e a dizer para que faz cada coisa.' },
    { fala: 'Com {ことにする}, a decisão é sua: decidi trabalhar na konbini. No presente contínuo, {ことにしています}, vira um costume que você se impôs.', tela: '働くことにしました · べんきょうすることにしています', ex: 'koto-ni-suru' },
    { fala: 'Com {ことになる}, a decisão veio de fora, da empresa, da escola ou das circunstâncias: ficou decidido.', tela: '働くことになりました。', ex: 'koto-ni-naru' },
    { fala: 'A palavra {ために} dá o objetivo de uma ação que você controla: junto dinheiro para viajar. Com substantivo, entra {の} antes.', tela: '旅行のために · 働くために', ex: 'tame-ni' },
    { fala: 'Já {ように} é para que algo aconteça, ou deixe de acontecer, e vem muito com o negativo: para não esquecer, para não chegar atrasado.', tela: 'わすれないように · ちこくしないように', ex: 'you-ni' },
  ],
  'a2-08': [
    { fala: 'Unidade oito: a entrevista. Chegou a hora do keigo, a linguagem de respeito. Ele parece difícil, mas no começo é um punhado de verbos especiais.' },
    { fala: 'O keigo de respeito eleva o que o outro faz. Alguns verbos trocam inteiros: estar, ir e vir viram {いらっしゃる}; dizer vira {おっしゃる}; comer e beber viram {めしあがる}.', tela: 'いる・行く・来る → いらっしゃる · 言う → おっしゃる · 食べる → めしあがる', ex: 'sonkeigo' },
    { fala: 'Para os outros verbos, há um molde: {お}, o verbo na forma educada sem a ponta {ます}, e {になる}. Ler vira {お読みになる|およみになる}.', tela: 'お + 読み + になる' },
    { fala: 'Em loja e em atendimento, {あります} vira {ございます}, e {です} vira {でございます}. É o tom do balcão.', tela: 'あちらでございます · サイズもございます', ex: 'gozaimasu' },
    { fala: 'Para pedir algo com muito cuidado, troque o {ください} por {いただけませんか}: poderia, por favor?', tela: 'もう一度言っていただけませんか。', ex: 'itadakemasenka' },
  ],
  'a2-09': [
    { fala: 'Unidade nove: o primeiro dia de trabalho. Se o keigo de respeito eleva o outro, o de humildade abaixa o que eu faço por ele.' },
    { fala: 'Alguns verbos humildes também trocam inteiros: ir e vir viram {まいる}; fazer vira {いたす}; dizer e se chamar viram {もうす}; estar vira {おる}.', tela: '行く・来る → まいる · する → いたす · 言う → もうす · いる → おる', ex: 'kenjougo' },
    { fala: 'E há um molde: {お}, o verbo na forma educada sem a ponta {ます}, e {する}. Levar a bagagem para o cliente é {お持ちします|おもちします}.', tela: 'お + 持ち + します' },
    { fala: 'A forma causativa, que vem na próxima unidade, tem um uso educado já agora: {させてください} quer dizer deixe que eu faça.', tela: 'やらせてください · 休ませてください', ex: 'sasete-kudasai' },
    { fala: 'A forma te mais {しまう} quer dizer acabar fazendo, quase sempre sem querer, com um tom de lamento: acabei esquecendo.', tela: 'わすれてしまいました。', ex: 'te-shimau' },
  ],
  'a2-10': [
    { fala: 'Unidade dez: as regras do trabalho. Saber o que é obrigatório, o que é opcional e o que é proibido evita muita confusão.' },
    { fala: 'Para ter de fazer, use a forma do não, troque a ponta {ない} por {なければ}, e acrescente {なりません}. Quer dizer, ao pé da letra: se não fizer, não dá.', tela: '起きない → 起きなければなりません', ex: 'nakereba' },
    { fala: 'Para não precisar, a forma do não troca a ponta {ない} por {なくても}, mais {いいです}: mesmo sem fazer, tudo bem.', tela: '来ない → 来なくてもいいです', ex: 'nakutemo' },
    { fala: 'A forma causativa é fazer ou deixar alguém fazer. No grupo do {かう}, a última vogal vira a, mais {せる}. No grupo do {食べる|たべる}, entra {させる}. E {する} vira {させる}.', tela: '食べる → 食べさせる · する → させる · 来る → こさせる', ex: 'shieki' },
    { fala: 'Nas placas e nos gritos de alerta aparece a forma de ordem, bem seca: {止まれ|とまれ}, pare. E o verbo de dicionário com {な} no fim é proibição: não faça. No dia a dia, ninguém fala assim com os outros.', tela: '止まる → 止まれ · すう → すうな', ex: 'meirei' },
  ],

  'a2-11': [
    { fala: 'Unidade onze: médico e farmácia. Aqui entram os jeitos de falar sem certeza: talvez, deve ser, parece, dizem que.' },
    { fala: 'A forma {かもしれません} é talvez, pode ser. Vem depois do verbo, do adjetivo ou do substantivo, sem mudar nada antes.', tela: 'かぜかもしれません · ふるかもしれません', ex: 'kamoshirenai' },
    { fala: 'A palavra {はず} é o que deveria ser, pela lógica: tomei o remédio, então devo sarar. Se não acontece, a pessoa estranha.', tela: 'なおるはずです · あくはずです', ex: 'hazu' },
    { fala: 'O final {ようです} é parece, por sinais que a própria pessoa nota: o corpo quente, a dor. Na conversa, o mesmo sentido vem com {みたい}, mais solto.', tela: 'ねつがあるようです · おれたみたいです', ex: 'you-da' },
    { fala: 'Depois da forma simples, {そうです} quer dizer dizem que, ouvi que. Não confunda com o parece da unidade dois, que gruda no adjetivo sem a ponta {い}.', tela: '入院したそうです (dizem que) · おいしそうです (parece)', ex: 'sou-ouvi' },
    { fala: 'E {らしい} é o parece de quem ouviu de outros e não tem certeza: dizem por aí que aquele hospital é bom.', tela: 'いいらしいです', ex: 'rashii' },
  ],
  'a2-12': [
    { fala: 'Unidade doze: na cozinha. Para seguir uma receita, é preciso dizer como se faz, o que começa, o que termina e o que vai junto.' },
    { fala: 'A forma te mais {みる} é experimentar fazer, para ver como é: experimentar a comida, tentar cozinhar.', tela: '食べてみます · 作ってみたい', ex: 'te-miru' },
    { fala: 'O jeito de fazer é a forma educada sem a ponta {ます}, mais {かた}: o jeito de ler, o jeito de preparar o chá.', tela: '読み方 · いれ方', ex: 'kata' },
    { fala: 'Do mesmo jeito, grudam no verbo {はじめる}, começar a, {おわる}, terminar de, e {つづける}, continuar a.', tela: '食べ始める · 読み終わる · ふりつづける', ex: 'hajimeru-owaru' },
    { fala: 'E {ながら} é fazer duas coisas ao mesmo tempo. A ação principal fica no fim: como, vendo televisão.', tela: '見ながら食べます。', ex: 'nagara' },
  ],
  'a2-13': [
    { fala: 'Unidade treze: o fim de semana. Para contar o que você faz no tempo livre, há jeitos de listar sem fechar a lista.' },
    { fala: 'A forma ta com {り}, repetida, mais {する} no fim, lista ações como exemplos: vejo filme, canto, coisas assim.', tela: '見たり、歌ったりします。', ex: 'tari' },
    { fala: 'Para transformar uma ação em coisa, o verbo de dicionário ganha {の} ou {こと}. Com gostar, os dois servem. Para dizer o que algo é, como o meu passatempo é ver filmes, use {こと}.', tela: '歌うのが好き · 見ることです', ex: 'nominalizar' },
    { fala: 'Com {か}, as palavras de pergunta viram algo indefinido: {なにか}, alguma coisa; {どこか}, algum lugar. Com {も} e o verbo no negativo, viram nada, ninguém, lugar nenhum.', tela: '何か · 何も〜ません', ex: 'nanika' },
    { fala: 'E {でも}, depois de um substantivo, deixa a sugestão leve: um chá, ou outra coisa, se você preferir.', tela: 'お茶でも飲みませんか。', ex: 'demo' },
  ],
  'a2-14': [
    { fala: 'Unidade catorze: estudar japonês. Aqui você conta o que já consegue fazer e o que procura fazer para melhorar.' },
    { fala: 'A forma potencial mais {ようになる} é passar a conseguir: antes não lia kanji, agora lê.', tela: '読めるようになりました。', ex: 'you-ni-naru' },
    { fala: 'O verbo mais {ようにする} é procurar fazer, criar o hábito. No presente contínuo, é o esforço que já faz parte do dia.', tela: '書くようにしています · 食べないようにしています', ex: 'you-ni-suru' },
    { fala: 'A forma educada sem a ponta {ます}, mais {なさい}, é uma ordem suave, de pai para filho ou de professor para aluno. Entre adultos, soa mandona.', tela: 'ねなさい · しなさい', ex: 'nasai' },
  ],
  'a2-15': [
    { fala: 'Unidade quinze: família e amigos. Para contar o que alguém fez com você, entra a voz passiva.' },
    { fala: 'A voz passiva tem a mesma cara da potencial no grupo do {食べる|たべる}: {られる}. No grupo do {かう}, a última vogal vira a, mais {れる}: {しかる} vira {しかられる}. Quem fez a ação vem com {に}.', tela: 'しかる → しかられる · ほめる → ほめられる · する → される', ex: 'ukemi' },
    { fala: 'A forma te mais {ほしい} é querer que alguém faça algo. A pessoa vem com {に}.', tela: '兄に来てほしいです。', ex: 'te-hoshii' },
    { fala: 'Para falar do que outra pessoa sente ou quer, o japonês evita afirmar por ela. O adjetivo perde a ponta {い} e ganha {がる}: ela quer, pelo que mostra. O mesmo vale para a forma de querer fazer: {したがる}.', tela: 'ほしい → ほしがる · したい → したがる', ex: 'garu' },
  ],

  'a2-16': [
    { fala: 'Unidade dezesseis: pela cidade. Para explicar caminhos e combinar horários, entram as palavras de tempo: quando, durante, antes que e até.' },
    { fala: 'A forma te mais {いく} ou {くる} mostra movimento ou mudança. Com {くる}, pode ser ir e voltar: vou ali comprar e já volto. Também mostra o que veio mudando até agora: foi esfriando.', tela: '買ってきます · さむくなってきました', ex: 'te-iku-kuru' },
    { fala: 'A palavra {とき} quer dizer quando. Vem depois do verbo, do adjetivo ou de substantivo com {の}.', tela: '分からないとき · 行くとき · 子どものとき', ex: 'toki' },
    { fala: 'Com {あいだ}, a ação dura o tempo todo: enquanto eu dirigia, ele dormia. Com {あいだに}, algo acontece em algum ponto desse tempo.', tela: '運転しているあいだ · なつ休みのあいだに', ex: 'aida' },
    { fala: 'A palavra {うちに} é aproveitar enquanto ainda dá: enquanto está claro, antes que chova. Com o negativo, vira antes que.', tela: '明るいうちに · ふらないうちに', ex: 'uchi-ni' },
    { fala: 'Cuidado com a diferença: {まで} é até, de forma contínua, e {までに} é o prazo, até tal hora no máximo.', tela: '四時まで待つ · 四時までに着く', ex: 'made-ni' },
  ],
  'a2-17': [
    { fala: 'Unidade dezessete: as estações do ano. Junto com as festas, entram os jeitos de dizer em que ponto da ação você está.' },
    { fala: 'A palavra {ところ} marca o momento da ação. Com o verbo de dicionário, estou prestes a fazer. Com a forma te mais {いる}, estou no meio. Com a forma ta, acabei de fazer.', tela: '出かけるところ · 食べているところ · 帰ったところ', ex: 'tokoro' },
    { fala: 'A forma ta mais {ばかり} também é acabei de, mas com a sensação de que ainda é recente, mesmo que já tenha passado um tempo.', tela: '来たばかりです。', ex: 'bakari' },
    { fala: 'A palavra {まま} é deixar como está, sem mudar: dormi com a janela aberta, entrou de sapato.', tela: '開けたまま · はいたまま', ex: 'mama' },
    { fala: 'Para sem fazer, use a forma do não mais {で}. Na escrita e na fala mais formal, troque o {ないで} por {ずに}. O verbo {する} vira {せずに}.', tela: '食べないで · 持たずに · せずに', ex: 'naide-zuni' },
  ],
  'a2-18': [
    { fala: 'Unidade dezoito: notícias e opiniões. Aqui você aprende a contar o que os outros disseram e a comparar.' },
    { fala: 'Para contar o que alguém disse, use a forma simples, mais {と}, mais o verbo {言う|いう}: ele disse que vem amanhã.', tela: 'あした来ると言いました。', ex: 'inyou' },
    { fala: 'Na conversa, {って} faz o mesmo papel, bem mais solto: dizem que, ou um tal de.', tela: '休みだって · ラファエルって人', ex: 'tte' },
    { fala: 'O par {ほど} e o negativo diz que algo não chega a tanto: não é tão frio quanto o Japão.', tela: '日本ほどさむくないです。', ex: 'hodo-nai' },
    { fala: 'A palavra {ぐらい}, ou {くらい}, é mais ou menos, por volta de. Vem depois da quantidade.', tela: '五分ぐらい · 一週間ぐらい', ex: 'gurai' },
    { fala: 'E o adjetivo do primeiro tipo, trocando a ponta {い} por {さ}, vira o nome da qualidade: largo vira a largura; frio vira o frio.', tela: '広い → 広さ · さむい → さむさ · 高い → 高さ', ex: 'sa' },
  ],
  'a2-19': [
    { fala: 'Unidade dezenove: olhar para trás. É a última unidade de conteúdo do nível A dois, sobre o que se viveu, o que se lamenta e o que se aconselha.' },
    { fala: 'A causativa passiva junta as duas: ser obrigado a fazer. A forma causativa ganha a terminação da passiva: comer vira {食べさせられる|たべさせられる}. A pessoa que obrigou vem com {に}.', tela: '食べる → 食べさせる → 食べさせられる', ex: 'shieki-ukemi' },
    { fala: 'A forma {ば} mais {よかった} é lamento: se eu tivesse feito, teria sido bom. Ou seja, devia ter feito.', tela: '勉強すればよかった · 持ってくればよかった', ex: 'ba-yokatta' },
    { fala: 'No fim da frase, {かな} é falar sozinho em voz alta: será que? É da conversa entre amigos.', tela: '雨かな · まだあいているかな', ex: 'kana' },
    { fala: 'E a forma ta com {ら}, mais {どうですか}, é um conselho leve: que tal ir ao médico?', tela: '行ったらどうですか。', ex: 'tara-dou' },
  ],
};
