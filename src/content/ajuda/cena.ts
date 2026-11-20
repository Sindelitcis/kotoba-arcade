import { MEMORIA_UNICA, SAVE, VOLTOU } from './comum';
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
    'Leia (ou ouça) o pedido. Ex.: 傘はどこ？ (onde está o guarda-chuva?).',
    'Clique na coisa, ou ande pela cena com as setas e aperte Enter.',
    'Clicou na coisa errada? Ela diz o próprio nome e você tenta de novo. Depois de dois enganos, a certa brilha.',
    'Etapa nova chega com uma lição curta. Palavra nova aparece brilhando na primeira vez.',
    'Na etapa de descrever, a coisa marcada pede uma frase: escolha as peças na ordem com os números.',
  ],
  teclas: [
    { teclas: ['↑', '↓', '←', '→'], faz: 'Andar pela cena, de coisa em coisa' },
    { teclas: ['Enter', 'Espaço'], faz: 'Escolher a coisa marcada; seguir; começar' },
    { teclas: ['1', '2', '3', '4', '5', '6', '7', '8', '9'], faz: 'No menu, escolher o lugar; em "descrever", escolher a peça da frase' },
    { teclas: ['R'], faz: 'Ouvir o pedido de novo' },
    { teclas: ['Esc'], faz: 'Parar a rodada (vale o que você fez); no menu, voltar ao fliperama' },
  ],
  elementos: [
    { nome: 'Pedido', texto: 'A frase em japonês, com a leitura em cima dos kanji.' },
    { nome: 'Coisa brilhando', texto: 'É a resposta. Aparece em palavra nova, em etapa nova e depois de dois enganos.' },
    { nome: 'Nome em cima de uma coisa', texto: 'Você clicou nela por engano. O nome fica ali para você aprender essa também.' },
    { nome: 'Fundo', texto: 'Começa em traço de mangá e ganha cor com o combo.' },
    { nome: 'Pontos', texto: '10 por acerto de primeira, mais 5 se foi rápido, mais o combo. Acerto depois de engano vale 5.' },
  ],
  ensina: [
    'São oito etapas, do N5 ao N3: achar a coisa, cor, grande e pequeno, onde está (上, 下, 横, 前, 中), contadores (三本, 二枚, 一匹), quem está fazendo o quê (読んでいる人), frases longas (テーブルの上にある赤いかばん, 左から二番目, いちばん小さい) e descrever a cena.',
    'A próxima etapa abre com 5 acertos de primeira na última aberta.',
    'Cada pedido tem uma resposta só, ou um grupo só: o jogo monta as frases a partir da própria cena e confere isso.',
    'As palavras são as mesmas cartas da Memória e dos outros jogos.',
  ],
  perguntas: [
    { p: 'Errar tira alguma coisa?', r: 'Não. A coisa errada diz o nome dela e você tenta de novo. Só a nota daquela palavra na memória fica mais baixa, para ela voltar antes.' },
    { p: 'Posso sair no meio?', r: 'Pode. Esc para a rodada e o que você já acertou fica gravado.' },
    VOLTOU,
    MEMORIA_UNICA,
    SAVE,
  ],
};
