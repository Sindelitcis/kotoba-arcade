import { MEMORIA_UNICA, PARAR, SAVE, VOLTOU } from './comum';
import type { Ajuda } from './tipos';

export const MEMORIA: Ajuda = {
  tela: 'memoria',
  titulo: 'Memória',
  jp: '絵合わせ',
  objetivo: ['Ligar cada imagem à palavra em japonês que diz o que ela é.', 'Uma rodada são três quadros curtos, uns dois minutos no total.'],
  passos: [
    'Enter começa uma rodada.',
    'Palavra que você nunca viu aparece antes do quadro, com a imagem, o significado e a voz. Enter começa o quadro.',
    'Quadro rápido: as cartas estão abertas. Escolha uma imagem e depois a palavra dela (ou o contrário).',
    'Quadro de memória: as cartas estão viradas. Abra duas por vez e ache os pares.',
    'Par certo fica colorido e diz a palavra. Par errado treme e volta, sem tela de erro.',
    'Entre um quadro e outro dá para parar com Esc. O que você fez já vale.',
  ],
  teclas: [
    { teclas: ['1', '2', '3', '4', 'A–Z'], faz: 'Escolher a carta: a tecla está no canto dela (1 2 3 4, Q W E R, A S D F, Z X C V, como no teclado)' },
    { teclas: ['Enter', 'Espaço'], faz: 'Começar; seguir depois das palavras novas e entre os quadros; outra rodada' },
    { teclas: ['R'], faz: 'Ouvir de novo a última palavra (fora do quadro; dentro dele, escolha a carta de novo)' },
    { teclas: ['Esc'], faz: 'Parar a rodada (vale o que você fez); no menu, voltar ao fliperama' },
  ],
  elementos: [
    { nome: 'Carta de imagem', texto: 'Desenho em traço de mangá. Quando o par fecha, ganha cor.' },
    { nome: 'Carta de palavra', texto: 'Mostra a palavra em kana, depois em kanji, e por fim só um alto-falante: aí você acha pelo som.' },
    { nome: 'Carta brilhando', texto: 'Depois de duas confusões com o mesmo par, ele brilha para você não travar.' },
    { nome: 'Combo', texto: 'Pares seguidos sem confundir. O fundo vai ganhando cor com ele.' },
    { nome: 'Pontos', texto: '10 por par, mais 5 se foi rápido (menos de 2,5 segundos), mais um bônus pequeno pelo combo.' },
  ],
  ensina: [
    'Cada palavra sobe sozinha: começa em kana, passa para kanji e termina só no som. Dois pares limpos seguidos sobem um degrau. Uma confusão desce um.',
    'Quando você já tem várias palavras firmes no som, o último quadro junta palavras que soam parecido (かさ e かぎ, いす e いぬ).',
    'Palavras com o mesmo som (雨 e 飴, as duas あめ) nunca aparecem juntas: só pelo som não daria para separar.',
    'Na memória, abrir uma carta que você nunca viu não é erro. Só conta como confusão escolher uma carta que já estava à vista.',
  ],
  perguntas: [
    { p: 'Por que a palavra agora aparece em kanji?', r: 'Porque você acertou ela duas vezes seguidas em kana. O kana aparece por cima depois que o par fecha.' },
    { p: 'Como ouço a palavra de novo no meio do quadro?', r: 'Escolha a carta de novo. Ela repete a voz.' },
    VOLTOU,
    MEMORIA_UNICA,
    PARAR,
    SAVE,
  ],
};
