import { ANTES_DE_COBRAR, MEMORIA_UNICA, SAVE, TECLAS_APRESENTA } from './comum';
import type { Ajuda } from './tipos';

export const CURSO: Ajuda = {
  tela: 'curso',
  titulo: 'Curso',
  jp: '講座',
  objetivo: [
    'Aprender japonês em uma linha só, unidade por unidade, como num curso de escola. Cada unidade termina com algo que você consegue fazer na vida real: se apresentar, comprar na konbini, pegar o trem.',
    'Cada unidade é dividida em partes curtas, de uns 5 minutos. Dá para parar em qualquer parte e voltar depois do mesmo ponto.',
  ],
  passos: [
    'Na tela inicial, Enter continua o curso de onde você parou.',
    'A unidade começa pelo objetivo e por uma revisão rápida da unidade anterior.',
    'Palavras e kanji chegam de 3 a 5 por vez, num cartão com a escrita, a leitura e o som. Depois vem a prática: aperte o número da resposta.',
    'Errou? A certa fica marcada até você apertar Enter. O cartão aparece de novo e a pergunta volta no fim.',
    'Depois vêm a gramática e, quando a unidade tem, um diálogo para ouvir e repetir em voz alta.',
    'No fim da unidade, a seguinte é liberada.',
  ],
  teclas: [
    { teclas: ['Enter', 'Espaço'], faz: 'Seguir; no mapa, continuar o curso' },
    { teclas: ['1', '2', '3'], faz: 'Responder na prática' },
    { teclas: ['R'], faz: 'Ouvir de novo' },
    TECLAS_APRESENTA,
    { teclas: ['Esc'], faz: 'Parar aqui; no mapa, voltar ao fliperama' },
  ],
  elementos: [
    { nome: 'Parte X de Y', texto: 'Onde você está na unidade. Cada parte feita fica gravada.' },
    { nome: 'Unidade trancada', texto: 'Abre quando a anterior é feita. Por enquanto basta chegar ao fim da anterior; quando as provas de unidade chegarem, vai ser preciso passar nela.' },
    { nome: 'Kanji', texto: 'O cartão mostra a leitura usada nesta unidade. Se o kanji se lê de outro jeito em outra palavra, ele avisa qual e em que unidade isso aparece.' },
    { nome: 'Furigana', texto: 'A leitura em hiragana pequena em cima de todo kanji. Na pergunta de leitura do kanji, ela só aparece depois da resposta.' },
  ],
  ensina: [
    'Ensinar, praticar, só depois cobrar: nenhuma pergunta usa palavra ou kanji que você ainda não viu, nem como alternativa errada.',
    'O kanji entra junto da palavra em que ele é útil, com a leitura daquela palavra. Quando a leitura muda, o cartão explica por quê.',
    'As palavras e os kanji do curso entram na mesma memória dos jogos: o que você viu aqui os jogos já podem praticar.',
  ],
  perguntas: [
    { p: 'Posso pular unidade?', r: 'Ainda não. O curso é uma linha: cada unidade usa o que a anterior ensinou. Quando o nivelamento chegar, quem já sabe vai poder fazer uma prova e começar mais à frente.' },
    { p: 'Posso refazer uma unidade?', r: 'Pode. No mapa, clique numa unidade feita. Refazer não apaga nada.' },
    { p: 'E os jogos e a Jornada?', r: 'Continuam no fliperama, do mesmo jeito. O curso é o caminho principal; os jogos são prática livre.' },
    ANTES_DE_COBRAR,
    MEMORIA_UNICA,
    SAVE,
  ],
};
