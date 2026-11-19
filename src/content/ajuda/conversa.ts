import { MEMORIA_UNICA, SAVE } from './comum';
import type { Ajuda } from './tipos';

export const CONVERSA: Ajuda = {
  tela: 'conversa',
  titulo: 'Conversa por voz',
  jp: '会話',
  objetivo: [
    'Conversar em japonês com um personagem, falando no microfone ou digitando.',
    'Cada cena tem objetivos (pedir, perguntar, se apresentar) e dura de 2 a 4 minutos.',
    'Só funciona com a IA ligada no seu PC, pelo comando npm run local. Veja o primeiro passo em Como jogar.',
  ],
  passos: [
    'Antes de tudo: este jogo precisa da IA rodando no seu PC. Na pasta do Kotoba Arcade, rode npm run local e jogue em http://localhost:5173. No site publicado ele só explica como ligar.',
    'Escolha uma situação pelo número, ou Enter para a sugerida.',
    'O personagem fala com voz e com a leitura por cima dos kanji.',
    'Responda: Espaço (com o campo vazio) liga o microfone, ou digite em romaji ou kana e aperte Enter. Ex.: koohii wo kudasai ou コーヒーをください.',
    'Travou? Tab dá uma dica. Na segunda vez, vêm duas respostas prontas.',
    'Cumpriu os objetivos ou o tempo acabou, o personagem se despede e vem o resumo.',
  ],
  teclas: [
    { teclas: ['Enter'], faz: 'Mandar a fala; no menu, começar a cena sugerida; sem servidor, procurar de novo' },
    { teclas: ['1', '2', '3', '4'], faz: 'Menu: escolher a situação pelo número' },
    { teclas: ['Espaço', 'F2'], faz: 'Ligar e desligar o microfone (Espaço só com o campo vazio)' },
    { teclas: ['Tab'], faz: 'Pedir dica' },
    { teclas: ['F1'], faz: 'Traduzir a última fala do personagem' },
    { teclas: ['F3'], faz: 'Ouvir de novo a última fala' },
    { teclas: ['Esc'], faz: 'Encerrar a conversa; voltar ao menu; sair para o fliperama' },
  ],
  elementos: [
    { nome: 'Objetivos', texto: 'A lista em cima. Cada um que você cumpre fica marcado e dá moedas e XP.' },
    { nome: 'Leitura em cima do kanji', texto: 'Toda fala do personagem vem com furigana. Ex.: 水 com みず em cima.' },
    { nome: 'Traduzir e ouvir', texto: 'Os botões embaixo de cada fala. Fazem o mesmo que F1 e F3.' },
    { nome: 'Dica', texto: 'Primeiro uma pista do que dizer. Pedindo de novo, duas respostas prontas para clicar.' },
    { nome: 'Resumo', texto: 'O que você disse bem, uma ou duas sugestões para soar mais natural e as palavras novas.' },
  ],
  ensina: [
    'Falar obriga a montar a frase sozinho. É o passo que os outros jogos preparam.',
    'O personagem fala no seu nível e puxa as palavras que você já está aprendendo.',
    'As palavras novas do resumo entram na memória e aparecem nos outros jogos.',
    'Errar não para a conversa. O personagem entende o que dá e segue.',
  ],
  perguntas: [
    { p: 'Por que aparece "Este jogo roda só no seu PC"?', r: 'Porque a Conversa precisa de npm run local. Ele liga o servidor que ouve você (Whisper), o que conversa (Ollama) e o que fala (VOICEVOX). Sem isso, o jogo não tem com quem conversar. Os passos estão no README.' },
    { p: 'O microfone não liga.', r: 'O reconhecimento de fala ainda está carregando, ou o navegador não deu permissão. Enquanto isso, digite.' },
    { p: 'O que eu falo sai do meu PC?', r: 'Não. O servidor só aceita conexão do próprio PC.' },
    { p: 'Por que a conversa acabou do nada?', r: 'Cada cena tem no máximo 10 falas suas e 4 minutos. Passou disso, o personagem se despede. É para ter um ponto de parada.' },
    { p: 'A ajuda abre com F1?', r: 'Aqui não, porque a F1 traduz a fala. Use a tecla ? (fora do campo de texto) ou o botão de interrogação.' },
    MEMORIA_UNICA,
    SAVE,
  ],
};
