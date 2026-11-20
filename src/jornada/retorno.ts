/**
 * O que as lições da Jornada falam em volta das perguntas. Acerto: só o japonês certo,
 * para fixar sem atrasar. Erro: uma frase curta em português e o japonês certo logo
 * depois. Nada de sermão: a explicação continua escrita na tela.
 */
import type { Trecho } from '../core/sequencia';
import type { FalaQuadro, Ordem, Pergunta, Quadro } from './licoes';

/** Errou e a resposta certa é japonês: ela vem logo depois. */
export const ERRO_COM_RESPOSTA = 'Não foi essa. A certa é assim:';
/** Errou numa pergunta em português sobre um japonês: o japonês toca de novo. */
export const ERRO_DE_NOVO = 'Não foi essa. Escute de novo:';

export const FRASES_DE_RETORNO = [ERRO_COM_RESPOSTA, ERRO_DE_NOVO] as const;

const jp = (fala: FalaQuadro): Trecho => ({ tipo: 'jp', fala });

/** Quadro: a fala dele e, no quadro de kanji, as palavras de exemplo. */
export function falaDoQuadro(q: Quadro): Trecho[] {
  return q.fala ? [q.fala, ...(q.falasExemplos ?? [])].map(jp) : [];
}

/** Quando a pergunta aparece: o japonês que ela mostra (se mostra algum completo). */
export function falaDaPergunta(p: Pergunta): Trecho[] {
  return p.fala ? [jp(p.fala)] : [];
}

/** Depois da resposta. */
export function retornoFalado(p: Pergunta | Ordem, certa: boolean): Trecho[] {
  if (p.tipo === 'ordem') return p.falaResposta ? [jp(p.falaResposta)] : [];
  if (p.falaResposta) return certa ? [jp(p.falaResposta)] : [{ tipo: 'pt', texto: ERRO_COM_RESPOSTA }, jp(p.falaResposta)];
  if (!certa && p.fala) return [{ tipo: 'pt', texto: ERRO_DE_NOVO }, jp(p.fala)];
  return [];
}
