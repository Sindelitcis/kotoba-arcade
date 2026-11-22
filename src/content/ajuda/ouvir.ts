import { SAVE } from './comum';
import type { Ajuda } from './tipos';

export const OUVIR: Ajuda = {
  tela: 'ouvir',
  titulo: 'Ouvir',
  jp: '聞',
  objetivo: [
    'Aprender só ouvindo, sem olhar a tela. Cada lição da Jornada tem uma aula curta, de um a três minutos.',
    'Serve para o ônibus, a louça, a caminhada. Os botões do fone também funcionam.',
  ],
  passos: [
    'Aperte Espaço para tocar. A aula explica em português e depois vem o japonês.',
    'Na pausa, fale o japonês em voz alta. Logo depois ele toca de novo, para você comparar.',
    'No fim tem uma revisão: você ouve em português e responde em japonês antes de ouvir a resposta.',
    'Acabou uma aula, a próxima começa sozinha.',
  ],
  teclas: [
    { teclas: ['Espaço', 'Enter'], faz: 'Tocar ou pausar' },
    { teclas: ['←', '→'], faz: 'Voltar ou pular um pedaço da aula' },
    { teclas: ['↑', '↓'], faz: 'Escolher outra aula' },
    { teclas: ['T'], faz: 'Mostrar ou esconder o texto da aula' },
    { teclas: ['Esc'], faz: 'Voltar ao fliperama' },
  ],
  elementos: [
    { nome: 'Lista', texto: 'As aulas na ordem da Jornada, uma etapa por grupo. A marca 済 diz que você ouviu até o fim.' },
    { nome: 'Texto', texto: 'O que está sendo dito, com o pedaço atual marcado. Fica escondido para você não depender dele.' },
  ],
  ensina: [
    'Ouvir, repetir e conferir: a pausa é do tamanho da frase, para dar tempo de falar sem pressa.',
    'Uma ideia por vez e nada de enrolação, para caber na atenção de quem se distrai fácil.',
    'O japonês é a mesma gravação dos jogos: o que você ouve aqui você reconhece lá.',
  ],
  perguntas: [
    { p: 'Preciso ouvir na ordem?', r: 'Não. Escolha qualquer aula. A ordem é só a da Jornada.' },
    { p: 'A aula conta como missão da Jornada?', r: 'Não. Ela prepara a lição em quadrinhos, que continua sendo a missão.' },
    SAVE,
  ],
};
