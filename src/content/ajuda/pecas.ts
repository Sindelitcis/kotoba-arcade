import { ANTES_DE_COBRAR, MEMORIA_UNICA, PARAR, SAVE, semNovidade, TECLAS_APRESENTA, VOLTOU } from './comum';
import type { Ajuda } from './tipos';

export const PECAS: Ajuda = {
  tela: 'pecas',
  titulo: 'Kanji em peças',
  jp: '漢字パズル',
  objetivo: [
    'Ver o kanji como um desenho feito de peças que se repetem. 休 é uma pessoa (亻) encostada na árvore (木): descansar.',
    'Uma rodada são oito perguntas curtas.',
  ],
  passos: [
    'Enter começa uma rodada misturada. As teclas 1 a 5 do menu começam uma rodada de um modo só.',
    'Kanji novo chega com uma lição: as peças pintadas, o nome de cada uma, a historinha, a leitura e uma palavra, com o português falado. Depois vem a pergunta.',
    'Kanji que você acabou de ver fica em prática: errar não zera o combo nem tira pontos, e a explicação aparece de novo.',
    'Responda com o número da alternativa (ou clique).',
    'Depois de cada resposta aparece a explicação, certa ou não. Enter segue.',
    'No modo Montar, escolha as peças uma por uma. Peça que não está no kanji volta para a bandeja. Depois de duas, a certa brilha.',
  ],
  teclas: [
    { teclas: ['Enter', 'Espaço'], faz: 'Começar; seguir depois da lição ou da resposta; outra rodada' },
    { teclas: ['1', '2', '3', '4', '5', '6'], faz: 'Responder (no menu, 1 a 5 escolhem o modo)' },
    { teclas: ['R'], faz: 'Ouvir a leitura do kanji ou da palavra' },
    TECLAS_APRESENTA,
    { teclas: ['Esc'], faz: 'Voltar ao menu; no menu, ao fliperama' },
  ],
  elementos: [
    { nome: 'Peça', texto: 'O desenho da parte, uma imagem para lembrar e o nome curto. Ex.: 氵 gotas d’água.' },
    { nome: 'Peças pintadas', texto: 'Cada peça ganha uma cor dentro do kanji, para você ver onde ela fica.' },
    { nome: '1 Achar a peça', texto: 'Veja o kanji e ache qual das peças está nele.' },
    { nome: '2 Montar', texto: 'O jogo diz o significado e você junta as peças do kanji.' },
    { nome: '3 Intruso', texto: 'Seis kanji, um diferente. Treina os parecidos: 未 e 末, 土 e 士, 待 e 持.' },
    { nome: '4 Adivinhar', texto: 'Um kanji que você nunca viu, com o nome das peças na tela. Pelas peças, chute o significado.' },
    { nome: '5 Palavras', texto: 'Uma palavra de dois kanji. Escolha a leitura. Dentro da palavra ela pode mudar (電 でん + 車 くるま = でんしゃ).' },
    { nome: 'Brilho', texto: 'A borda do quadro brilha mais com os acertos seguidos. Errar baixa um pouco o brilho, devagar.' },
    { nome: 'Pontos', texto: '10 por acerto, mais 5 se foi rápido (menos de 3 segundos). Kanji montado depois de erro vale 5.' },
  ],
  ensina: [
    'São 612 kanji, todos do N5, N4 e N3, e 383 peças. Os do N5 vêm primeiro. O 士 (do N1) entra só para fazer par com o 土 no Intruso.',
    'Quem conhece as peças lê kanji novo como desenho. Por isso, quando todas as peças de um kanji novo já são suas, ele chega no modo Adivinhar.',
    'As historinhas ligam as peças ao significado. Algumas brincam com o desenho, mas o significado e a leitura são os de verdade.',
    'A leitura mostrada é a mais comum hoje: a palavra, se o kanji é palavra sozinho (山 やま), ou a leitura das palavras do dia a dia (休 きゅう).',
    'Não tem vida nem tempo. Errar só mostra a explicação.',
  ],
  perguntas: [
    ANTES_DE_COBRAR,
    { p: 'De onde vêm as peças e os desenhos?', r: 'Dos dados abertos KanjiVG (traços) e KRADFILE/KANJIDIC2 (peças e leituras). Os nomes, as imagens e as historinhas foram escritos à mão para o jogo.' },
    { p: 'Por que a peça tem um desenho diferente do kanji?', r: 'Muita peça muda de forma quando entra num kanji: 人 vira 亻, 水 vira 氵, 手 vira 扌. É a mesma ideia.' },
    semNovidade('seis kanji'),
    VOLTOU,
    MEMORIA_UNICA,
    PARAR,
    SAVE,
  ],
};
