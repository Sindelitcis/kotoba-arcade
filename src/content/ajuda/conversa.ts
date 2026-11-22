import { ANTES_DE_COBRAR, MEMORIA_UNICA, SAVE, TECLAS_APRESENTA } from './comum';
import type { Ajuda } from './tipos';

export const CONVERSA: Ajuda = {
  tela: 'conversa',
  titulo: 'Conversa por voz',
  jp: '会話',
  objetivo: [
    'Conversar em japonês com um personagem, falando no microfone ou digitando.',
    'Cada cena tem objetivos (pedir, perguntar, se apresentar) e dura de 2 a 4 minutos.',
    'A IA fica na nuvem e é protegida por senha. Você digita a senha uma vez e o navegador lembra por 30 dias.',
  ],
  passos: [
    'Na primeira vez, digite a senha da Conversa e aperte Enter. Com a IA do seu PC ligada, ela entra no lugar da nuvem e não pede senha. A linha "IA: Automático · Nuvem · Meu PC" escolhe qual usar.',
    'Escolha uma situação pelo número, ou Enter para a sugerida.',
    'Antes de conversar, as palavras novas da situação aparecem uma por uma, com som e o que querem dizer.',
    'O personagem fala com voz e com a leitura por cima dos kanji.',
    'Responda: Espaço (com o campo vazio) liga o microfone, ou digite em romaji ou kana e aperte Enter. Ex.: koohii wo kudasai ou コーヒーをください.',
    'Travou? Tab dá uma dica. Na segunda vez, vêm duas respostas prontas.',
    'Cumpriu os objetivos ou o tempo acabou, o personagem se despede e vem o resumo.',
  ],
  teclas: [
    { teclas: ['Enter'], faz: 'Mandar a fala ou a senha; no menu, começar a cena sugerida; sem conexão, tentar de novo' },
    { teclas: ['1', '2', '3', '4'], faz: 'Menu: escolher a situação pelo número' },
    { teclas: ['Espaço', 'F2'], faz: 'Ligar e desligar o microfone (Espaço só com o campo vazio)' },
    { teclas: ['Tab'], faz: 'Pedir dica' },
    { teclas: ['F1'], faz: 'Traduzir a última fala do personagem' },
    { teclas: ['F3'], faz: 'Ouvir de novo a última fala' },
    TECLAS_APRESENTA,
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
    'Palavra que aparece na conversa sem ter sido apresentada conta só como primeiro contato, sem nota.',
  ],
  perguntas: [
    ANTES_DE_COBRAR,
    { p: 'Por que pede senha?', r: 'A IA da nuvem tem uma cota grátis por dia. A senha garante que só você gasta essa cota. Depois de entrar, o navegador lembra por 30 dias.' },
    { p: 'Apareceu que a cota de hoje acabou.', r: 'A nuvem grátis tem um limite por dia, que zera às 21h (horário de Brasília). Até lá, os outros jogos funcionam. Com a IA do seu PC (escolha "Meu PC"), não tem limite.' },
    { p: 'Por que a voz do personagem às vezes muda?', r: 'As falas fixas tocam a gravação. O resto usa a voz japonesa do navegador, porque a nuvem grátis não tem voz em japonês. Com a IA do seu PC, a voz vem do AivisSpeech, uma para cada personagem.' },
    { p: 'Como uso a IA do meu PC no site?', r: 'Escolha "Meu PC" e clique em "Ligar a IA do meu PC". Na primeira vez, o navegador pede licença para o site falar com o PC: clique em Permitir. Depois disso, o Automático acha o PC sozinho.' },
    { p: 'O microfone não liga.', r: 'O reconhecimento de fala ainda está carregando, ou o navegador não deu permissão. Enquanto isso, digite.' },
    { p: 'O que eu falo sai do meu PC?', r: 'Na nuvem, o áudio vai para a IA da Cloudflare, vira texto e não fica guardado. Com a IA do seu PC, nada sai da máquina.' },
    { p: 'Por que a conversa acabou do nada?', r: 'Cada cena tem no máximo 10 falas suas e 4 minutos. Passou disso, o personagem se despede. É para ter um ponto de parada.' },
    { p: 'A ajuda abre com F1?', r: 'Aqui não, porque a F1 traduz a fala. Use a tecla ? (fora do campo de texto) ou o botão de interrogação.' },
    MEMORIA_UNICA,
    SAVE,
  ],
};
