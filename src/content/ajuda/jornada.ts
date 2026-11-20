import { MEMORIA_UNICA, SAVE } from './comum';
import type { Ajuda } from './tipos';

export const JORNADA: Ajuda = {
  tela: 'jornada',
  titulo: 'Jornada',
  jp: '旅',
  objetivo: [
    'Mostrar o caminho inteiro, do zero até trabalhar no Japão, e dar sempre um próximo passo curto.',
    'Cada passo é uma missão de 3 a 10 minutos: uma lição em quadrinhos ou um jogo do arcade só com o conteúdo daquela parte.',
  ],
  passos: [
    'Aperte Enter para começar a missão sugerida (o quadro grande no alto).',
    'Quer ver outra parte? Aperte o número da etapa (1 a 7) ou clique no quadro dela.',
    'Dentro da etapa, escolha a missão com ↑ e ↓ e aperte Enter.',
    'Terminou a missão, você volta para cá. A missão ganha a marca 済 e a etapa ganha cor.',
  ],
  teclas: [
    { teclas: ['Enter', 'Espaço'], faz: 'Começar a missão sugerida (ou a escolhida, dentro da etapa)' },
    { teclas: ['1', '2', '3', '4', '5', '6', '7'], faz: 'Abrir uma etapa do mapa' },
    { teclas: ['↑', '↓'], faz: 'Escolher a missão, dentro da etapa' },
    { teclas: ['Esc'], faz: 'Voltar ao mapa; no mapa, ao fliperama' },
  ],
  elementos: [
    { nome: 'Etapas', texto: 'Fundamentos, Kana, Expressões de sobrevivência, N5, N4, Trabalho e dia a dia, N3. Cada quadro diz quantas missões tem e quanto tempo leva no total.' },
    { nome: 'Próxima missão', texto: 'A primeira que você ainda não fez, na ordem do mapa. É só uma sugestão: qualquer missão pode ser feita a qualquer hora.' },
    { nome: 'Lição em quadrinhos', texto: 'Uma ideia por quadro, Enter avança, e uma pergunta logo depois do que foi ensinado.' },
    { nome: 'Missão de jogo', texto: 'Abre o KanjiMon, o Kana Beat, o Kotodama, a Aventura, o Kumitate ou a Conversa só com os kanji, palavras ou pontos daquela missão. Saiu do jogo, volta para a Jornada.' },
    { nome: '済', texto: 'Missão feita. O número diz quantas vezes. Refazer conta de novo e nunca atrapalha.' },
    { nome: 'Vem depois', texto: 'Temas que ainda não têm conteúdo no arcade, com a fonte (nível do JLPT ou tópico do Marugoto). O N3 ainda é só isso.' },
  ],
  ensina: [
    'O conteúdo das lições veio da escola-japones: regra em uma frase, exemplos, erros comuns e o momento certo de usar cada expressão.',
    'Primeiro a lição apresenta, depois o jogo treina com o mesmo conteúdo. As palavras e kanji entram na mesma memória dos outros jogos.',
    'Nada fica trancado e não existe contador de atraso. Ficar dias sem abrir não apaga nem atrasa nada.',
  ],
  perguntas: [
    { p: 'Preciso seguir a ordem?', r: 'Não. A ordem é só a sugestão de caminho. Se você já sabe kana, pule direto para o N5.' },
    { p: 'Por que o N3 está vazio?', r: 'Porque o conteúdo dele ainda não foi escrito. O mapa mostra os temas que vêm, para você ver o caminho inteiro sem achar que já está pronto.' },
    { p: 'Faltei uns dias. Perdi alguma coisa?', r: 'Nada. A Jornada volta exatamente onde você parou.' },
    MEMORIA_UNICA,
    SAVE,
  ],
};

export const LICAO: Ajuda = {
  tela: 'licao',
  titulo: 'Lição em quadrinhos',
  jp: '授業',
  objetivo: ['Aprender uma coisa por vez: um quadro, uma ideia. Logo depois vem uma pergunta sobre o que acabou de ver.'],
  passos: [
    'Leia o quadro e aperte Enter para seguir.',
    'Quadro com japonês fala sozinho. R ouve de novo.',
    'Na pergunta, aperte o número da resposta. A primeira resposta é a que vale.',
    'Errou? A certa fica marcada, com a explicação. Enter segue, sem tela de erro.',
    'Para montar uma frase, aperte os números dos pedaços na ordem certa. Pedaço fora de ordem volta; depois de duas vezes, o certo brilha.',
    'No último quadro, Enter volta para a Jornada e a missão fica marcada como feita.',
  ],
  teclas: [
    { teclas: ['Enter', 'Espaço'], faz: 'Seguir para o próximo quadro' },
    { teclas: ['1', '2', '3', '4', '5', '6', '7', '8', '9'], faz: 'Responder a pergunta ou pôr o próximo pedaço da frase' },
    { teclas: ['R'], faz: 'Ouvir o japonês do quadro' },
    { teclas: ['Esc'], faz: 'Parar aqui e voltar para a Jornada' },
  ],
  elementos: [
    { nome: 'Quadro X de Y', texto: 'Onde você está e quanto falta. A lição inteira leva de 3 a 10 minutos.' },
    { nome: 'Furigana', texto: 'A leitura em hiragana pequena em cima de todo kanji.' },
    { nome: 'Registro', texto: 'Nas expressões: casual (amigos e família), polido (o padrão com adultos) ou formal (clientes e superiores).' },
    { nome: 'Cor', texto: 'O quadro ganha cor de anime conforme você acerta em sequência.' },
  ],
  ensina: [
    'Ver, depois lembrar: a pergunta vem logo depois do quadro que ensina, e a resposta mostra a forma certa na hora.',
    'As alternativas erradas são japonês de verdade usado no lugar errado, nunca forma inventada.',
    'Palavra ou kanji novo entra na memória dos jogos como apresentado. Só o que você já tinha visto ganha nota pela resposta.',
  ],
  perguntas: [
    { p: 'Posso sair no meio?', r: 'Pode. Esc volta para a Jornada. A lição só conta como feita quando você chega ao fim, e dá para recomeçar quando quiser.' },
    { p: 'Por que へ nunca aparece como errada quando a resposta é に?', r: 'Porque, para destino, as duas estão certas. Uma nunca é a alternativa errada da outra.' },
    MEMORIA_UNICA,
  ],
};
