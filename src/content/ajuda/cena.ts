import { ANTES_DE_COBRAR, MEMORIA_UNICA, SAVE, TECLAS_APRESENTA, VOLTOU } from './comum';
import type { Ajuda } from './tipos';

export const CENA: Ajuda = {
  tela: 'cena',
  titulo: 'Cena Viva',
  jp: '生きた場面',
  objetivo: [
    'Achar na cena o que a frase em japonês pede e, no fim, descrever a cena montando frases.',
    'Cada rodada são 8 pedidos num lugar: konbini, estação, quarto, escritório, cozinha, farmácia, restaurante ou rua.',
  ],
  passos: [
    'Enter começa no lugar sugerido. Os números escolhem outro lugar.',
    'Primeiro as coisas da cena são apresentadas, de 3 a 5 por vez: a coisa brilha, o nome soa em japonês e o que quer dizer em português.',
    'A primeira etapa é só o nome: これはなんですか？ (o que é isto?) e você escolhe o nome da coisa que brilha. Ex.: これはかさです (isto é um guarda-chuva). "Onde está" vem depois.',
    'Leia (ou ouça) o pedido. Ex.: 傘はどこ？ (onde está o guarda-chuva?).',
    'Clique na coisa, ou ande pela cena com as setas e aperte Enter.',
    'Clicou na coisa errada? Ela diz o próprio nome e você tenta de novo. Depois de dois enganos, a certa brilha.',
    'Etapa nova chega com uma lição curta e um exemplo. Na prática, errar não tira pontos nem combo: a palavra aparece de novo e a coisa certa já brilha.',
    'Na etapa de descrever, a coisa marcada pede uma frase: escolha as peças na ordem com os números.',
  ],
  teclas: [
    { teclas: ['↑', '↓', '←', '→'], faz: 'Andar pela cena, de coisa em coisa' },
    { teclas: ['Enter', 'Espaço'], faz: 'Escolher a coisa marcada; seguir; começar' },
    { teclas: ['1', '2', '3', '4', '5', '6', '7', '8', '9'], faz: 'No menu, escolher o lugar; em "descrever", escolher a peça da frase' },
    { teclas: ['R'], faz: 'Ouvir o pedido de novo' },
    TECLAS_APRESENTA,
    { teclas: ['Esc'], faz: 'Parar a rodada (vale o que você fez); no menu, voltar ao fliperama' },
  ],
  elementos: [
    { nome: 'Pedido', texto: 'A frase em japonês, com a leitura em cima dos kanji.' },
    { nome: 'Coisa brilhando', texto: 'É a resposta. Aparece na prática, em etapa nova e depois de dois enganos.' },
    { nome: 'Nome em cima de uma coisa', texto: 'Você clicou nela por engano. O nome fica ali para você aprender essa também.' },
    { nome: 'Brilho', texto: 'A borda do quadro brilha mais a cada acerto seguido. Errar baixa um pouco.' },
    { nome: 'Pontos', texto: '10 por acerto de primeira, mais 5 se foi rápido, mais o combo. Acerto depois de engano vale 5.' },
  ],
  ensina: [
    'São nove etapas, do N5 ao N3: o nome das coisas (これは〜です), achar a coisa (〜はどこ？), cor, grande e pequeno, onde está (上, 下, 横, 前, 中), contadores (三本, 二枚, 一匹), quem está fazendo o quê (読んでいる人), frases longas (テーブルの上にある赤いかばん, 左から二番目, いちばん小さい) e descrever a cena.',
    'A próxima etapa abre com 5 acertos de primeira na última aberta.',
    'Cada pedido tem uma resposta só, ou um grupo só: o jogo monta as frases a partir da própria cena e confere isso.',
    'As palavras são as mesmas cartas da Memória e dos outros jogos.',
  ],
  perguntas: [
    ANTES_DE_COBRAR,
    { p: 'Errar tira alguma coisa?', r: 'Não. A coisa errada diz o nome dela e você tenta de novo. Só a nota daquela palavra na memória fica mais baixa, para ela voltar antes.' },
    { p: 'Posso sair no meio?', r: 'Pode. Esc para a rodada e o que você já acertou fica gravado.' },
    VOLTOU,
    MEMORIA_UNICA,
    SAVE,
  ],
};
