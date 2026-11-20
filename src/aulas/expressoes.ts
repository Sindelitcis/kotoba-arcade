/**
 * Expressões faladas: na aula, o professor conta quando se usa e você ouve a expressão;
 * na revisão, ele descreve a situação e você responde.
 */
export const EXPRESSOES_FALADAS: Readonly<Record<string, { ensino: string; revisao: string }>> = {
  'e-ohayou': {
    ensino: 'Bom dia. No trabalho, é o que se diz ao chegar, mesmo se o turno começa à tarde.',
    revisao: 'Você chegou no trabalho de manhã.',
  },
  'e-konnichiwa': {
    ensino: 'Olá, boa tarde. Para quem você não vê todo dia. Com colega de trabalho, não se usa.',
    revisao: 'Você encontra um vizinho à tarde.',
  },
  'e-konbanwa': {
    ensino: 'Boa noite, para cumprimentar. Não serve para ir embora.',
    revisao: 'Você chega num lugar à noite e cumprimenta as pessoas.',
  },
  'e-oyasumi': {
    ensino: 'Agora o boa noite de quem vai dormir.',
    revisao: 'Alguém da casa vai dormir.',
  },
  'e-hajimemashite': {
    ensino: 'Muito prazer. Só na primeira vez que você conhece a pessoa.',
    revisao: 'Você está conhecendo alguém agora.',
  },
  'e-yoroshiku': {
    ensino: 'Essa não tem tradução certinha. É como dizer conto com você. Fecha toda apresentação.',
    revisao: 'Você terminou de se apresentar.',
  },
  'e-arigatou': {
    ensino: 'Obrigado. Do jeito educado, serve para qualquer adulto.',
    revisao: 'Alguém te ajudou.',
  },
  'e-sumimasen': {
    ensino: 'Com licença, ou desculpa. Para chamar o garçom, pedir passagem, pedir desculpa por coisa pequena.',
    revisao: 'Você quer chamar o atendente.',
  },
  'e-gomennasai': {
    ensino: 'Desculpa, com gente próxima: amigo, família. No trabalho, não.',
    revisao: 'Você pisou no pé de um amigo.',
  },
  'e-moushiwake': {
    ensino: 'Esse é o pedido de desculpas sério, para cliente e para chefe.',
    revisao: 'Você errou um pedido de um cliente.',
  },
  'e-daijoubu': {
    ensino: 'Está tudo bem. Também é o jeito educado de recusar, por exemplo uma sacola.',
    revisao: 'O caixa pergunta se você quer sacola, e você não quer.',
  },
  'e-kekkou': {
    ensino: 'Não, obrigado, de um jeito firme. Pode soar seco, então guarde para vendedor insistente.',
    revisao: 'Um vendedor na rua não para de insistir.',
  },
  'e-otsukaresama': {
    ensino: 'Essa você vai ouvir o dia inteiro no trabalho. Reconhece o esforço da pessoa. Serve para colega e para chefe.',
    revisao: 'Você cruza com um colega no corredor.',
  },
  'e-osakini': {
    ensino: 'Com licença, vou embora antes. Quando você sai e os outros ainda estão trabalhando.',
    revisao: 'Seu turno acabou, mas os colegas ainda estão trabalhando.',
  },
  'e-shitsurei': {
    ensino: 'Com licença, ao entrar ou sair de uma sala, ou ao desligar o telefone.',
    revisao: 'Você vai entrar na sala do chefe.',
  },
  'e-osewa': {
    ensino: 'Essa abre e-mail e ligação com gente de outra empresa. Agradece a parceria de sempre.',
    revisao: 'Você atende a ligação de um parceiro da empresa.',
  },
  'e-kashikomarimashita': {
    ensino: 'Entendido, do jeito formal. Para pedido de cliente ou de chefe.',
    revisao: 'Um cliente fez um pedido e você confirma.',
  },
  'e-wakarimashita': {
    ensino: 'Entendi. Com colega, já basta.',
    revisao: 'Um colega explicou uma tarefa, e você entendeu.',
  },
  'e-itadakimasu': {
    ensino: 'Essa se diz antes de comer.',
    revisao: 'A comida chegou e você vai começar.',
  },
  'e-gochisousama': {
    ensino: 'E essa depois de comer. Também agradece a quem pagou.',
    revisao: 'Você terminou de comer.',
  },
  'e-ittekimasu': {
    ensino: 'Estou saindo e já volto. Ao sair de casa.',
    revisao: 'Você está saindo de casa de manhã.',
  },
  'e-itterasshai': {
    ensino: 'É a resposta de quem fica: vá e volte bem.',
    revisao: 'Alguém da casa está saindo.',
  },
  'e-tadaima': {
    ensino: 'Cheguei. Ao voltar para casa.',
    revisao: 'Você acabou de chegar em casa.',
  },
  'e-okaerinasai': {
    ensino: 'E a resposta: bem-vindo de volta.',
    revisao: 'Alguém da família chegou em casa.',
  },
  'e-wakarimasen': {
    ensino: 'Não entendo, ou não sei. Pode usar sem medo.',
    revisao: 'Alguém falou rápido demais e você não entendeu nada.',
  },
  'e-mouichido': {
    ensino: 'Mais uma vez, por favor. Para a pessoa repetir.',
    revisao: 'Você quer que a pessoa repita.',
  },
  'e-yukkuri': {
    ensino: 'Mais devagar, por favor.',
    revisao: 'A pessoa fala rápido demais.',
  },
  'e-onegaishimasu': {
    ensino: 'Por favor, ao pedir alguma coisa ou ao aceitar o que oferecem.',
    revisao: 'Oferecem esquentar a sua marmita, e você aceita.',
  },
  'e-kore-kudasai': {
    ensino: 'Isto, por favor. Você aponta e pede.',
    revisao: 'Você aponta um doce na vitrine.',
  },
  'e-sou-desu-ka': {
    ensino: 'Ah, é mesmo? Quando alguém te conta uma novidade. A voz desce no fim.',
    revisao: 'Um colega te conta que a reunião mudou de horário.',
  },
  'e-ii-desu-ne': {
    ensino: 'Que bom, ou boa ideia. Para concordar com uma proposta.',
    revisao: 'Um amigo chama você para almoçar, e você gosta da ideia.',
  },
  'e-irasshaimase': {
    ensino: 'Essa você só vai ouvir. É o bem-vindo do atendente na loja. Não precisa responder.',
    revisao: 'O que o atendente diz quando você entra na loja?',
  },
  'e-sayounara': {
    ensino: 'Adeus. Soa definitivo, para quem você vai ficar muito tempo sem ver.',
    revisao: 'Você se despede de alguém que vai morar em outro país.',
  },
  'e-mata-ashita': {
    ensino: 'Até amanhã. Para amigo ou colega próximo.',
    revisao: 'Você se despede de um amigo que vai ver amanhã.',
  },
  'e-ki-wo-tsukete': {
    ensino: 'Vá com cuidado, cuide-se. Para quem vai viajar ou voltar para casa.',
    revisao: 'Um amigo vai pegar a estrada.',
  },
  'e-omedetou': {
    ensino: 'Parabéns. Para aniversário, promoção, casamento.',
    revisao: 'É aniversário de uma colega.',
  },
};

/** Abertura de cada grupo de expressões da Jornada. */
export const GRUPO_FALADO: Readonly<Record<string, string>> = {
  cumprimentos: 'Seis cumprimentos. Com eles você já começa o dia no Japão.',
  agradecer: 'Agora agradecer e pedir desculpas. No Japão isso aparece toda hora.',
  trabalho: 'Expressões do trabalho. Ninguém ensina, mas todo mundo espera que você saiba.',
  casa: 'Expressões de casa e da hora de comer.',
  'nao-entendo': 'O que dizer quando você não entende. Talvez as mais úteis de todas.',
  despedidas: 'Reações e despedidas.',
};
