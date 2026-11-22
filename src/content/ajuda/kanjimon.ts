import { ANTES_DE_COBRAR, MEMORIA_UNICA, PARAR, SAVE, semNovidade, TECLAS_APRESENTA, VOLTOU } from './comum';
import type { Ajuda } from './tipos';

export const KANJIMON: Ajuda = {
  tela: 'kanjimon',
  titulo: 'KanjiMon',
  jp: '漢字モン',
  objetivo: [
    'Caçar kanji. Cada KanjiMon tem selos, e cada selo é uma pergunta sobre aquele kanji.',
    'Quebrou todos os selos, a carta é sua e vai para a KanjiDex.',
  ],
  passos: [
    'Kanji novo chega antes, numa apresentação: o desenho, a leitura, o que quer dizer (falado em português) e uma palavra de exemplo. Enter passa para o próximo.',
    'Aparece um KanjiMon. As bolinhas embaixo da carta são os selos.',
    'Responda a pergunta. Com opções, clique ou aperte 1 a 4. Quando pedir para digitar, escreva a leitura em romaji ou kana e aperte Enter. Ex.: 一人 → hitori ou ひとり.',
    'Acertou: um selo quebra. Errou: a resposta certa aparece e a pergunta volta logo depois.',
    'Kanji que você acabou de conhecer vem em prática: com dica, duas opções e sem digitar. Ali, errar não tira coração nem combo. Depois que você acerta, ele passa a ser cobrado: aí um erro tira um coração.',
    'Quebrou todos os selos: captura. Ganha moedas e XP.',
    'A cada 5 capturas vem um baú, com moedas, um coração de volta e às vezes um booster grátis. É um bom ponto para parar.',
    'Acabaram os 5 corações, a caçada termina. Tudo o que você capturou continua seu.',
  ],
  teclas: [
    { teclas: ['1', '2', '3', '4'], faz: 'Escolher a resposta' },
    { teclas: ['Enter'], faz: 'Mandar a resposta digitada; seguir depois de captura, baú ou fim' },
    { teclas: ['Espaço'], faz: 'Seguir depois de captura, baú ou fim' },
    TECLAS_APRESENTA,
    { teclas: ['Esc'], faz: 'Sair para o fliperama' },
  ],
  elementos: [
    { nome: 'Corações (♥)', texto: 'Cinco por caçada. Cada erro fora da prática tira um. O baú devolve um.' },
    { nome: 'Combo', texto: 'Acertos seguidos. Quanto maior, mais moedas e XP na captura (até o dobro, com 10 seguidos). Um erro fora da prática zera.' },
    { nome: 'Trilha do baú', texto: 'Os cinco pontinhos ao lado da palavra baú. Cada captura enche um.' },
    { nome: 'Selos', texto: 'As bolinhas embaixo da carta. Cheia é selo inteiro; vazia já foi quebrada.' },
    { nome: 'Raridade', texto: 'Comum (2 selos), Rara (3), Super Rara (3) e Ultra Rara (4). Mais rara paga mais. Se passar 25 encontros sem Super Rara ou Ultra Rara, a próxima vem Super Rara garantida.' },
    { nome: 'Prática', texto: 'Aparece em cima da pergunta de um kanji que você acabou de conhecer. Tem dica e só duas opções, e errar não custa nada.' },
    { nome: '？ no lugar do kanji', texto: 'Pergunta ao contrário: você vê o significado e acha o kanji. Só aparece depois que o significado já está pegando.' },
    { nome: 'Resposta rápida', texto: 'Acertou em menos de 2,5 segundos, ganha 2 moedas a mais. Resposta lenta não perde nada. Na prática, o tempo não conta.' },
  ],
  ensina: [
    'Primeiro o jogo mostra, depois pergunta. Kanji novo chega numa apresentação, vira prática com dica e só depois é cobrado com coração e tempo.',
    'A pergunta muda conforme você melhora: reconhecer o significado, ler uma palavra (山道 → やまみち), achar o kanji pelo significado e, por fim, digitar a leitura.',
    'No máximo uma palavra nova por encontro, para não entupir.',
    'O que você errou volta logo depois. É aí que a memória firma.',
  ],
  perguntas: [
    ANTES_DE_COBRAR,
    VOLTOU,
    semNovidade('no KanjiMon, 6 kanji ainda aprendendo ao mesmo tempo'),
    { p: 'Posso digitar em kana em vez de romaji?', r: 'Pode. ひとり e hitori valem igual. Um errinho de digitação conta como acerto, e o jogo mostra a forma certa.' },
    { p: 'Perdi todos os corações. Perdi as cartas?', r: 'Não. A caçada acaba, mas as cartas e o que você estudou ficam.' },
    MEMORIA_UNICA,
    PARAR,
    SAVE,
  ],
};

export const KANJIDEX: Ajuda = {
  tela: 'kanjidex',
  titulo: 'KanjiDex',
  jp: '漢字ずかん',
  objetivo: ['A sua coleção. Todos os kanji do jogo, as cartas que você já pegou e o quanto cada um já firmou.'],
  passos: [
    'Cada quadro é um kanji. Os que você ainda não encontrou aparecem com ?.',
    'Clique num kanji encontrado para abrir os detalhes.',
    'Nos detalhes, troque a raridade para ver cada carta. Clique numa palavra ou frase para ouvir.',
    'Esc fecha os detalhes. Outro Esc volta ao fliperama.',
  ],
  teclas: [{ teclas: ['Esc'], faz: 'Fechar os detalhes; voltar ao fliperama' }],
  elementos: [
    { nome: '?', texto: 'Kanji que ainda não apareceu numa caçada.' },
    { nome: 'Estrelas', texto: 'Domínio de 0 a 5. Sobem conforme o kanji (ou a palavra) aguenta mais tempo sem revisão.' },
    { nome: 'Quatro marquinhas', texto: 'As raridades que você já tem daquele kanji: Comum, Rara, Super Rara e Ultra Rara.' },
    { nome: '×2, ×3…', texto: 'Quantas cópias da carta você tem.' },
    { nome: 'Detalhes', texto: 'Leituras, historinha, palavras com leitura e significado (ex.: 一人, ひとり, uma pessoa) e frases de exemplo.' },
  ],
  ensina: [
    'As estrelas mostram a memória de verdade, não quantas vezes você jogou.',
    'Ouvir a palavra junto com a leitura ajuda a ligar o som ao kanji.',
  ],
  perguntas: [
    { p: 'Por que as estrelas de um kanji baixaram?', r: 'Você errou depois de um tempo sem ver. Não é castigo: é o jogo marcando que vale rever. Ele volta nas caçadas.' },
    { p: 'Como pego uma Ultra Rara?', r: 'Caçando (2% de chance por encontro) ou abrindo booster (3% por carta).' },
    SAVE,
  ],
};

export const BOOSTER: Ajuda = {
  tela: 'booster',
  titulo: 'Booster',
  jp: 'ブースター',
  objetivo: ['Abrir um pacote com 3 cartas de KanjiMon para a coleção.'],
  passos: [
    'O pacote abre sozinho quando você entra. Custa 150 moedas, ou um booster grátis se você tiver.',
    'Aperte Enter (ou clique numa carta) para revelar uma por vez. Cada carta fala a primeira palavra do kanji.',
    'Revelou as 3: Enter abre outro, se der. Esc volta.',
  ],
  teclas: [
    { teclas: ['Enter', 'Espaço'], faz: 'Revelar a próxima carta; abrir outro pacote' },
    { teclas: ['Esc'], faz: 'Voltar ao fliperama' },
  ],
  elementos: [
    { nome: 'NOVA', texto: 'Carta que você ainda não tinha.' },
    { nome: 'Raridade', texto: 'Comum, Rara, Super Rara (quadro vermelho) e Ultra Rara (vermelho com fio dourado). A última carta do pacote é pelo menos Rara.' },
  ],
  ensina: ['O pacote só traz kanji que você já encontrou. Cada carta revelada é mais uma vez que você vê e ouve aquele kanji.'],
  perguntas: [
    { p: 'Por que o booster está desligado?', r: 'Ou você ainda não encontrou 3 kanji, ou não tem 150 moedas nem booster grátis.' },
    { p: 'De onde vem booster grátis?', r: 'Do baú do KanjiMon, que sai a cada 5 capturas. Um em cada quatro baús traz um.' },
  ],
};
