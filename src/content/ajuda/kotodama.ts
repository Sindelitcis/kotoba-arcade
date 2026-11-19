import { MEMORIA_UNICA, SAVE, semNovidade, VOLTOU } from './comum';
import type { Ajuda } from './tipos';

export const KOTODAMA: Ajuda = {
  tela: 'roguelike',
  titulo: 'Kotodama',
  jp: '言霊',
  objetivo: [
    'Subir sete andares e vencer o chefe, o Oni (鬼).',
    'Cada carta é um kanji ou uma palavra. Jogar a carta abre uma pergunta: acertou, o efeito sai forte; errou, sai fraco.',
    'Uma run leva de 5 a 10 minutos.',
  ],
  passos: [
    'A run começa direto num combate. Você tem 3 de energia por turno e 5 cartas na mão.',
    'Escolha uma carta (clique ou o número dela). Cada carta custa 1 de energia.',
    'Responda a pergunta sobre o kanji ou a palavra da carta. Acertou: efeito forte. Errou: fraco, mas sai.',
    'Sem energia ou sem jogada boa, termine o turno. O inimigo faz o que mostrou em cima dele.',
    'Venceu: escolha uma carta nova para o baralho ou pule.',
    'No mapa, onde tem dois caminhos, você escolhe: combate, elite, descanso ou loja.',
    'Se a vida chegar a zero, a run acaba. O que você estudou fica na memória.',
  ],
  teclas: [
    { teclas: ['1', '2', '3', '4', '5'], faz: 'Combate: jogar a carta. Pergunta: escolher a resposta (1 a 4)' },
    { teclas: ['Enter', 'Espaço', 'E'], faz: 'Combate: terminar o turno' },
    { teclas: ['1', '2'], faz: 'Mapa: escolher o caminho (Enter vai no primeiro)' },
    { teclas: ['0', 'P'], faz: 'Recompensa: pular a carta nova' },
    { teclas: ['1', '2'], faz: 'Descanso: 1 cura, 2 afia' },
    { teclas: ['Enter'], faz: 'Loja: sair. Fim da run: nova run' },
    { teclas: ['Esc'], faz: 'Sair para o fliperama' },
  ],
  elementos: [
    { nome: 'Golpe', texto: 'Dano no inimigo. 9 se acertar, 3 se errar. O escudo do inimigo absorve antes.' },
    { nome: 'Escudo', texto: 'Segura dano neste turno. 8 se acertar, 3 se errar. Zera no começo do seu turno.' },
    { nome: 'Cura', texto: 'Recupera vida. 6 se acertar, 2 se errar.' },
    { nome: 'Foco', texto: 'Compra cartas. 2 se acertar, 1 se errar. Acertando, devolve a energia gasta.' },
    { nome: 'Intenção do inimigo', texto: 'O que ele vai fazer quando você terminar o turno: atacar, defender ou os dois.' },
    { nome: 'Energia', texto: '3 por turno. Cada carta gasta 1.' },
    { nome: 'Combo', texto: 'Acertos seguidos. Algumas relíquias usam.' },
    { nome: 'Resposta rápida', texto: 'Acertou em menos de 2,5 segundos: +2 no efeito (não vale para Foco).' },
    { nome: 'Relíquias', texto: 'Mudam as regras da run. Você começa com uma; elite e loja dão outras. Ex.: Sino da manhã (鈴): a primeira carta do turno custa 0. Amuleto do aprendiz (守): carta errada sai com metade da força.' },
    { nome: 'Ouro', texto: 'Só vale nesta run. Vem dos combates e paga a loja: carta 30, relíquia 60, cura 25.' },
    { nome: 'Descanso', texto: 'Cura 12 de vida ou afia: +2 em todos os Golpes até o fim da run.' },
    { nome: 'Mapa', texto: '戦 combate, 強 elite (mais forte, dá relíquia), 休 descanso, 店 loja, 鬼 chefe.' },
  ],
  ensina: [
    'Cada jogada é uma pergunta de verdade sobre o kanji ou a palavra. Quem decide o golpe é a sua memória.',
    'Errar não trava o jogo: a carta sai fraca e a resposta certa aparece.',
    'As cartas novas que o jogo oferece seguem a memória: primeiro o que precisa revisar, depois novidade. Palavra só entra depois que os kanji dela já apareceram.',
  ],
  perguntas: [
    { p: 'Perdi a run. Perdi o que estudei?', r: 'Não. Cada resposta já foi gravada na memória. Só a run, o ouro e as relíquias acabam.' },
    { p: 'Por que a carta não joga?', r: 'Falta energia. Termine o turno para recarregar.' },
    VOLTOU,
    semNovidade('no Kotodama, 10 itens ainda aprendendo'),
    MEMORIA_UNICA,
    SAVE,
  ],
};
