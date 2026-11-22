/** Perguntas que valem para quase todo jogo. Cada tela escolhe as que fazem sentido para ela. */
import type { LinhaTecla, Pergunta } from './tipos';

/** Teclas da apresentação de coisa nova, igual em todos os jogos. */
export const TECLAS_APRESENTA: LinhaTecla = {
  teclas: ['←', '→', 'R'],
  faz: 'Na apresentação de coisa nova: voltar, seguir, ouvir de novo',
};

/** Por que tem apresentação e prática antes da cobrança. */
export const ANTES_DE_COBRAR: Pergunta = {
  p: 'Por que o jogo mostra as coisas antes de perguntar?',
  r: 'Porque não dá para lembrar do que você nunca viu. Coisa nova chega primeiro numa apresentação, de 3 a 5 por vez: imagem, som em japonês e o que quer dizer, falado em português. Depois vem a prática: pergunta fácil, com dica e poucas opções, e errar ali não custa nada, o item só aparece de novo. Tempo, vida, combo e mais opções só entram quando você já acertou na prática.',
};

export const VOLTOU: Pergunta = {
  p: 'Por que essa palavra voltou?',
  r: 'Porque está na hora de lembrar dela. O jogo anota quando você viu cada coisa e se acertou, e traz de volta pouco antes de você esquecer. Errou, ela volta mais cedo. Acertou fácil, demora mais para voltar.',
};

export function semNovidade(limite: string): Pergunta {
  return {
    p: 'Por que não aparece coisa nova?',
    r: `Coisa nova pausa sozinha quando tem muita coisa ainda mole na memória (${limite}) ou muita revisão esperando. Siga jogando: conforme as antigas firmam, as novas voltam a aparecer. Não precisa fazer nada.`,
  };
}

export const SAVE: Pergunta = {
  p: 'Como funciona o save?',
  r: 'O progresso grava sozinho enquanto você joga e fica neste navegador. Não tem conta nem nuvem. Se limpar os dados do navegador, o save some. Por isso vale guardar um backup de vez em quando: no fliperama, em Ajustes, tem Exportar backup e Importar backup.',
};

export const MEMORIA_UNICA: Pergunta = {
  p: 'O que eu aprendo aqui conta nos outros jogos?',
  r: 'Conta. Todos os jogos usam a mesma memória. Uma palavra que você firmou no KanjiMon já chega mais limpa no Kana Beat e na Aventura.',
};

export const PARAR: Pergunta = {
  p: 'Posso sair no meio?',
  r: 'Pode. Esc sai e o que você respondeu até ali já está gravado.',
};

/** Vale para todas as telas: o painel de ajuda mostra junto das perguntas da tela. */
export const APROFUNDAR: Pergunta = {
  p: 'Quero estudar isto com calma. Como faço?',
  r: 'Aperte F4 (ou !) ou clique no livro, ao lado da interrogação. O jogo pausa e abre a ficha do que está na tela: leituras, acento, exemplos, palavras da mesma família, como se escreve e os erros comuns. Numa pergunta, a ficha aparece depois que você responde, para não entregar a resposta. Esc volta ao jogo do mesmo ponto. O que você estudou ali conta como revisão leve, sem tirar ponto. Nos Ajustes, o ritmo de estudo diz se o jogo oferece a ficha sozinho depois de um erro.',
};
