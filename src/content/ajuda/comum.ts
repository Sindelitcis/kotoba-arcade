/** Perguntas que valem para quase todo jogo. Cada tela escolhe as que fazem sentido para ela. */
import type { Pergunta } from './tipos';

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
