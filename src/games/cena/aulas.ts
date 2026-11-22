/**
 * A lição falada de cada etapa da Cena Viva: a estrutura nova, explicada em português e
 * ouvida em japonês, antes da primeira pergunta da etapa (ver core/Apresentacao.tsx).
 *
 * O português vai para as duas vozes (scripts/falas-pt.ts); o japonês (a peça e o exemplo)
 * vai para `npm run vozes` (scripts/falas.ts).
 */
import type { ItemNovo } from '../../content/ensino';
import type { Trecho } from '../../core/sequencia';
import { ETAPA_INFO, kanaDe, textoDe, type Etapa } from './engine';

interface AulaEtapa {
  /** O que a estrutura faz, em português que dá para falar (sem kana, sem número). */
  explicacao: string;
  /** A peça nova em japonês, dita sozinha (opcional). */
  peca?: string;
  /** O que o exemplo quer dizer, falado depois dele. */
  exemplo: string;
  /** Como a etapa é jogada. */
  comoJoga: string;
}

export const AULAS_ETAPA: Readonly<Record<Etapa, AulaEtapa>> = {
  nome: {
    explicacao: 'Primeiro, o nome das coisas. Para dizer o que uma coisa é, o japonês começa assim:',
    peca: 'これは',
    exemplo: 'Quer dizer: isto é um guarda-chuva.',
    comoJoga: 'A coisa marcada brilha na cena. Escolha o nome dela.',
  },
  achar: {
    explicacao: 'Agora, perguntar onde está. Diga o nome da coisa e termine com esta pergunta:',
    peca: 'はどこ',
    exemplo: 'Quer dizer: onde está o guarda-chuva?',
    comoJoga: 'Ouça a pergunta e clique na coisa certa.',
  },
  cor: {
    explicacao: 'A cor vem antes da coisa, como se fosse vermelho guarda-chuva. As cores terminam com o som i.',
    exemplo: 'Quer dizer: onde está o guarda-chuva vermelho?',
    comoJoga: 'Agora a cor decide qual das coisas é a certa.',
  },
  tamanho: {
    explicacao: 'Grande e pequeno também vêm antes da coisa.',
    exemplo: 'Quer dizer: onde está a bolsa grande?',
    comoJoga: 'Compare o tamanho das coisas iguais.',
  },
  lugar: {
    explicacao: 'O japonês diz o lugar primeiro e a coisa depois: o livro de cima da mesa.',
    exemplo: 'Quer dizer: onde está o livro em cima da mesa?',
    comoJoga: 'Olhe onde cada coisa está: em cima, embaixo, ao lado, na frente ou dentro.',
  },
  contar: {
    explicacao: 'Para contar, o número leva uma palavrinha que muda com o tipo de coisa: uma para coisas compridas, outra para finas, outra para bichos.',
    exemplo: 'Quer dizer: onde estão as três maçãs?',
    comoJoga: 'Conte as coisas iguais e ache o grupo certo.',
  },
  acao: {
    explicacao: 'Para falar de quem está fazendo alguma coisa agora, o verbo vem antes da palavra pessoa.',
    exemplo: 'Quer dizer: onde está a pessoa que está lendo?',
    comoJoga: 'Ache a pessoa que faz o que a frase diz.',
  },
  denso: {
    explicacao: 'Agora tudo junto: o lugar, a cor e a coisa, sempre do detalhe para o nome.',
    exemplo: 'Quer dizer: onde está a bolsa vermelha que está em cima da mesa?',
    comoJoga: 'Leia a frase inteira antes de clicar.',
  },
  descrever: {
    explicacao: 'Agora é você quem fala. Primeiro o lugar, depois a coisa, e no fim tem ou está.',
    exemplo: 'Quer dizer: tem um livro em cima da mesa.',
    comoJoga: 'Monte a frase sobre a coisa marcada, peça por peça.',
  },
};

/** O que a lição da etapa fala: explicação, a peça, o exemplo em japonês e o que ele quer dizer. */
export function falaDaEtapa(e: Etapa): Trecho[] {
  const a = AULAS_ETAPA[e];
  const ex = ETAPA_INFO[e].exemplo;
  return [
    { tipo: 'pt', texto: a.explicacao },
    ...(a.peca ? [{ tipo: 'jp', fala: { texto: a.peca, voz: 'palavra', kana: a.peca } } as const] : []),
    { tipo: 'pt', texto: 'Por exemplo.' },
    { tipo: 'jp', fala: { texto: textoDe(ex), voz: 'frase', kana: kanaDe(ex) } },
    { tipo: 'pt', texto: a.exemplo },
    { tipo: 'pt', texto: a.comoJoga },
  ];
}

/** A lição da etapa como apresentação (um cartão, sem imagem). */
export function itemDaEtapa(e: Etapa): ItemNovo {
  const info = ETAPA_INFO[e];
  return {
    chaves: [`cena-etapa:${e}`],
    alvo: { t: 'cena', id: `etapa:${e}` },
    tipo: `Estrutura · ${info.nivel}`,
    grande: textoDe(info.exemplo),
    leitura: kanaDe(info.exemplo),
    pt: info.exemploPt,
    explicacao: `${info.licao} ${AULAS_ETAPA[e].comoJoga}`,
    falas: falaDaEtapa(e),
  };
}

/** Todo o português das lições de etapa (para gravar nas duas vozes). */
export function falasPtDasEtapas(): string[] {
  return Object.values(AULAS_ETAPA).flatMap((a) => [a.explicacao, a.exemplo, a.comoJoga]);
}
