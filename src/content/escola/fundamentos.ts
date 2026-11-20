/**
 * Fundamentos: como o japonês funciona (escrita, sons, ordem da frase, polidez).
 * Veio da escola-japones; o texto foi ajustado onde falava das telas de lá.
 */
import type { Fundamento, Pagina } from './tipos';

export const FUNDAMENTOS: readonly Fundamento[] = [
  {
    id: 'l-escrita',
    titulo: 'Os sistemas de escrita',
    paginas: [
      {
        titulo: 'Três sistemas de escrita',
        paragrafos: [
          'O japonês usa três sistemas de escrita ao mesmo tempo, muitas vezes na mesma frase.',
          'Hiragana (ひらがな): letras arredondadas. Cada letra é uma sílaba. Usado para partículas, finais de verbos e palavras sem kanji.',
          'Katakana (カタカナ): letras retas. Mesmos sons do hiragana. Usado para palavras estrangeiras, nomes estrangeiros (como o seu) e ênfase.',
          'Kanji (漢字): caracteres que representam ideias. Cada kanji pode ter mais de uma leitura.',
        ],
        exemplos: [
          {
            jp: '{私|わたし} は コーヒー を {飲|の}みます。',
            pt: 'Eu bebo café. (kanji: 私 飲 · katakana: コーヒー · hiragana: は を みます)',
          },
        ],
      },
      {
        titulo: 'Sem espaços entre as palavras',
        paragrafos: [
          'O japonês escrito não usa espaços. Os kanji e as mudanças de sistema ajudam a ver onde as palavras começam.',
          'No começo, os exemplos das lições aparecem com um espaço entre as palavras, para você ver onde cada uma termina.',
          'Os kanji aparecem com furigana: a leitura em hiragana pequena, em cima do kanji.',
          'O romaji (japonês com letras do nosso alfabeto) é só um apoio no começo. A meta é ler direto em kana.',
        ],
      },
    ],
    exercicios: [
      {
        id: 'l-escrita-1',
        tipo: 'escolha',
        pergunta: 'Qual destas palavras está escrita em katakana?',
        correta: 'コーヒー',
        erradas: ['すし', '{日本|にほん}'],
      },
      {
        id: 'l-escrita-2',
        tipo: 'escolha',
        pergunta: 'Qual sistema é usado para escrever nomes estrangeiros, como o seu?',
        correta: 'カタカナ',
        erradas: ['ひらがな', '{漢字|かんじ}'],
      },
      {
        id: 'l-escrita-3',
        tipo: 'escolha',
        pergunta: 'Qual sistema representa ideias e pode ter várias leituras?',
        correta: '{漢字|かんじ}',
        erradas: ['ひらがな', 'カタカナ'],
      },
    ],
  },
  {
    id: 'l-sons',
    titulo: 'Os sons do japonês',
    paginas: [
      {
        titulo: 'Cinco vogais e um ritmo regular',
        paragrafos: [
          'O japonês tem só cinco vogais: a, i, u, e, o. Elas soam parecidas com as do português, sem o som nasal e sem "e" ou "o" abertos.',
          'O "u" é pronunciado sem arredondar os lábios.',
          'Cada kana dura o mesmo tempo, como batidas de um relógio. Essa unidade se chama "mora".',
          'O "r" japonês é um toque rápido da língua, como o "r" de "caro". Nunca é o "r" forte de "rato".',
        ],
      },
      {
        titulo: 'Sons que mudam o significado',
        paragrafos: [
          'Vogal longa: dura duas batidas e muda a palavra. おばさん (tia) × おばあさん (avó).',
          'っ pequeno: uma pausa de uma batida antes da consoante. きて (venha) × きって (selo).',
          'ん: vale uma batida inteira. しんぶん (jornal) tem 4 batidas: し・ん・ぶ・ん.',
          'A altura da voz (subir e descer) também diferencia palavras. A melhor forma de aprender é ouvir o áudio e imitar.',
        ],
      },
      {
        titulo: 'Como o romaji é escrito aqui',
        paragrafos: [
          'O romaji do arcade segue a escrita em kana, letra por letra. Assim, o que você vê é o que você digita.',
          'とうきょう aparece como "toukyou". コーヒー aparece como "koohii". O traço ー vira a vogal repetida.',
          'As partículas são escritas como se falam: は = "wa", へ = "e", を = "o".',
          'Nas respostas, você pode digitar em romaji ou direto em kana.',
        ],
      },
    ],
    exercicios: [
      {
        id: 'l-sons-1',
        tipo: 'escolha',
        pergunta: 'Quantas batidas (moras) tem きって (selo)?',
        correta: '3',
        erradas: ['2', '4'],
        explicacao: 'き・っ・て: o っ vale uma batida.',
      },
      {
        id: 'l-sons-2',
        tipo: 'escolha',
        pergunta: 'おばさん e おばあさん significam a mesma coisa?',
        correta: 'Não. おばさん é tia; おばあさん é avó.',
        erradas: ['Sim, são duas grafias da mesma palavra.', 'Sim, a diferença é só de sotaque.'],
      },
      {
        id: 'l-sons-3',
        tipo: 'escolha',
        pergunta: 'Como o "r" japonês soa?',
        correta: 'Como o "r" de "caro".',
        erradas: ['Como o "r" de "rato".', 'Como o "r" do inglês.'],
      },
    ],
  },
  {
    id: 'l-frase',
    titulo: 'A ordem da frase',
    paginas: [
      {
        titulo: 'O verbo fica no fim',
        paragrafos: [
          'Em português dizemos "Eu bebo água". Em japonês, a ordem é "Eu água bebo": 私は水を飲みます.',
          'Partículas pequenas (は, を, に, で…) vêm DEPOIS da palavra e dizem a função dela na frase.',
          'Como as partículas marcam a função, a ordem das outras partes pode variar. O verbo, porém, fica no fim.',
        ],
        exemplos: [
          {
            jp: '{私|わたし} は {水|みず} を {飲|の}みます。',
            pt: 'Eu bebo água. (eu-tópico · água-objeto · bebo)',
          },
        ],
      },
      {
        titulo: 'O que o japonês não tem',
        paragrafos: [
          'Não há artigos (o, a, um, uma). 本 pode ser "livro", "o livro" ou "um livro".',
          'Normalmente não há plural. 本 também pode ser "livros".',
          'Não há gênero gramatical, e o verbo não muda com a pessoa: 食べます serve para eu, você, ela e eles.',
          'O sujeito é omitido quando o contexto deixa claro. "Vou amanhã" é só 明日行きます.',
        ],
      },
    ],
    exercicios: [
      {
        id: 'l-frase-1',
        tipo: 'escolha',
        pergunta: 'Onde fica o verbo na frase japonesa?',
        correta: 'No final da frase.',
        erradas: ['No começo da frase.', 'Logo depois do sujeito.'],
      },
      {
        id: 'l-frase-2',
        tipo: 'escolha',
        pergunta: 'Onde ficam as partículas, como を?',
        correta: 'Depois da palavra que elas marcam.',
        erradas: ['Antes da palavra que elas marcam.', 'Sempre no fim da frase.'],
      },
    ],
  },
  {
    id: 'l-polidez',
    titulo: 'Polidez e tratamento',
    paginas: [
      {
        titulo: 'Três níveis de polidez',
        paragrafos: [
          'Casual: com amigos próximos e família. Verbos no dicionário (食べる) e frases curtas.',
          'Polido: o padrão com adultos, no trabalho e com desconhecidos. Frases terminam em です ou ます.',
          'Formal/respeitoso (敬語, keigo): com clientes, superiores e em situações oficiais.',
          'O arcade ensina primeiro a forma polida, porque é a forma segura em quase todas as situações de adulto.',
        ],
      },
      {
        titulo: 'Nomes e tratamento',
        paragrafos: [
          'Use o sobrenome + さん para falar com outras pessoas: 田中さん.',
          'Nunca use さん com o seu próprio nome.',
          'あなた (você) quase não é usado. Use o nome da pessoa + さん.',
          'No trabalho, cargos substituem o nome: 部長 (chefe de departamento), 課長 (chefe de seção).',
        ],
      },
    ],
    exercicios: [
      {
        id: 'l-polidez-1',
        tipo: 'escolha',
        pergunta: 'Qual nível de polidez usar com um colega novo no trabalho?',
        correta: 'Polido (です/ます)',
        erradas: ['Casual', 'Nenhum: tanto faz'],
      },
      {
        id: 'l-polidez-2',
        tipo: 'escolha',
        pergunta: 'Como chamar a Sra. Tanaka?',
        correta: '{田中|たなか} さん',
        erradas: ['あなた', '{田中|たなか}'],
      },
    ],
  },
];

/** Abertura da lição de vogal longa e っ, que vem junto das palavras do tema "sons". */
export const SONS_LONGOS: Pagina = {
  titulo: 'Vogal longa e っ pequeno',
  paragrafos: [
    'Vogal longa: a vogal dura duas batidas. Em hiragana, escreve-se com uma vogal extra (おばあさん). Em katakana, com o traço ー (ビール).',
    'お longo costuma ser escrito com う: とうきょう (toukyou). え longo costuma ser escrito com い: せんせい (sensei).',
    'っ pequeno: uma pausa curta antes da consoante seguinte. Em romaji, a consoante dobra: きって = kitte.',
    'Nesta lição, cada palavra tem um "par" que só muda nesse detalhe. Ouça e compare.',
  ],
};
