import { MEMORIA_UNICA, PARAR, SAVE, VOLTOU } from './comum';
import type { Ajuda } from './tipos';

export const AVENTURA: Ajuda = {
  tela: 'aventura',
  titulo: 'Aventura',
  jp: '冒険',
  objetivo: [
    'Você acabou de chegar ao Japão. Viva cenas curtas do dia a dia: imigração, guichê do trem, konbini.',
    'As pessoas falam japonês de verdade, com voz. Você responde escolhendo o que dizer.',
    'Cada cena leva de 3 a 5 minutos.',
  ],
  passos: [
    'Enter abre a próxima cena da história. Ou escolha uma cena pelo número.',
    'Leia ou ouça a fala. Enter segue.',
    'Quando for a sua vez, escolha a resposta com 1, 2, 3…',
    'Não tem tela de erro. Se a pessoa não entende, ela estranha ou repete, e a conversa continua.',
    'Travou numa palavra? F mostra a leitura, S mostra o significado, R repete o áudio.',
    'No fim vem o resumo do que você passou a entender. As falas vão para o Diário.',
  ],
  teclas: [
    { teclas: ['Enter', 'Espaço'], faz: 'Começar a cena sugerida; seguir a conversa; ir para a próxima cena' },
    { teclas: ['1', '2', '3'], faz: 'Escolher a resposta. No menu: abrir a cena pelo número' },
    { teclas: ['F'], faz: 'Mostrar a leitura de tudo na fala (furigana)' },
    { teclas: ['S'], faz: 'Mostrar o significado. No Diário: mostrar ou esconder todas as traduções' },
    { teclas: ['R'], faz: 'Ouvir de novo' },
    { teclas: ['D'], faz: 'Abrir o Diário' },
    { teclas: ['↑', '↓'], faz: 'Diário: escolher a frase' },
    { teclas: ['Esc'], faz: 'Voltar ao menu de cenas; no menu, ao fliperama' },
  ],
  elementos: [
    { nome: 'Leitura e significado em volta da palavra', texto: 'Palavra que você nunca viu chega com leitura e significado. Ex.: 切符 com きっぷ e "bilhete".' },
    { nome: 'Só a leitura', texto: 'Palavra que você já viu mas ainda não firmou fica só com a leitura por cima.' },
    { nome: 'Texto limpo', texto: 'Palavra firme na memória aparece sem ajuda nenhuma.' },
    { nome: 'Reação da pessoa', texto: 'Ela entendeu, estranhou ou repetiu. É o jeito do jogo dizer se a resposta serviu.' },
    { nome: 'Cenas com cadeado', texto: 'Cada cena abre quando você conclui a anterior.' },
    { nome: 'Diário', texto: 'Todas as falas que você já viveu, para reler e ouvir.' },
  ],
  ensina: [
    'A ajuda some quando você já sabe. Primeiro leitura e significado, depois só a leitura, depois nada.',
    'Pedir leitura ou significado não é errar. Mas conta como ajuda, e a palavra volta mais cedo.',
    'Responder de primeira, sem ajuda, firma a palavra. Travar a conversa faz ela voltar logo.',
    'Com todas as cenas concluídas, o Enter abre a cena com as palavras mais perto de serem esquecidas.',
  ],
  perguntas: [
    { p: 'E se eu escolher a resposta errada?', r: 'A pessoa estranha ou repete, e você tenta de novo. Não tem game over.' },
    { p: 'Por que a palavra perdeu a leitura em cima?', r: 'Porque ela já firmou. Se travar, aperte F que a leitura volta naquela fala.' },
    VOLTOU,
    MEMORIA_UNICA,
    PARAR,
    SAVE,
  ],
};
