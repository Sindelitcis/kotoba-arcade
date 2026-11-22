/**
 * A lição falada de cada etapa da Cena Viva: a estrutura nova, explicada em português e
 * ouvida em japonês, antes da primeira pergunta da etapa (ver core/Apresentacao.tsx).
 *
 * O português vai para `npm run vozes-pt` (scripts/falas-pt.ts); o japonês da peça vai para
 * `npm run vozes` (scripts/falas.ts). O exemplo é uma pergunta da cena, já gravada.
 */
import type { ItemNovo } from '../../content/ensino';
import type { Trecho } from '../../core/sequencia';
import { ETAPA_INFO, ETAPAS, kanaDe, textoDe, type Etapa, type Tarefa } from './engine';

interface AulaEtapa {
  /** O que a estrutura faz, em português que dá para falar (sem kana, sem número). */
  explicacao: string;
  /** A peça nova em japonês, dita sozinha (opcional). */
  peca?: string;
  /** Como a etapa é jogada. */
  comoJoga: string;
}

export const AULAS_ETAPA: Readonly<Record<Etapa, AulaEtapa>> = {
  nome: {
    explicacao: 'Primeiro, o nome das coisas. Para dizer o que uma coisa é, o japonês começa assim:',
    peca: 'これは',
    comoJoga: 'A coisa marcada brilha na cena. Escolha o nome dela.',
  },
  achar: {
    explicacao: 'Agora, perguntar onde está. Diga o nome da coisa e termine com esta pergunta:',
    peca: 'はどこ',
    comoJoga: 'Ouça a pergunta e clique na coisa certa.',
  },
  cor: {
    explicacao: 'A cor vem antes da coisa, como se fosse vermelho guarda-chuva. As cores terminam com o som i.',
    comoJoga: 'Agora a cor decide qual das coisas é a certa.',
  },
  tamanho: {
    explicacao: 'Grande e pequeno também vêm antes da coisa.',
    comoJoga: 'Compare o tamanho das coisas iguais.',
  },
  lugar: {
    explicacao: 'O japonês diz o lugar primeiro e a coisa depois: o livro de cima da mesa.',
    comoJoga: 'Olhe onde cada coisa está: em cima, embaixo, ao lado, na frente ou dentro.',
  },
  contar: {
    explicacao: 'Para contar, o número leva uma palavrinha que muda com o tipo de coisa: uma para coisas compridas, outra para finas, outra para bichos.',
    comoJoga: 'Conte as coisas iguais e ache o grupo certo.',
  },
  acao: {
    explicacao: 'Para falar de quem está fazendo alguma coisa agora, o verbo vem antes da palavra pessoa.',
    comoJoga: 'Ache a pessoa que faz o que a frase diz.',
  },
  denso: {
    explicacao: 'Agora tudo junto: o lugar, a cor e a coisa, sempre do detalhe para o nome.',
    comoJoga: 'Leia a frase inteira antes de clicar.',
  },
  descrever: {
    explicacao: 'Agora é você quem fala. Primeiro o lugar, depois a coisa, e no fim tem ou está.',
    comoJoga: 'Monte a frase sobre a coisa marcada, peça por peça.',
  },
};

/**
 * O que a lição da etapa fala: explicação, a peça, um exemplo em japonês e como se joga.
 * O exemplo é uma pergunta de verdade do lugar, só com palavras já apresentadas
 * (`CenaRound.exemploDaLicao`); a frase dela já está gravada, porque é fala da própria cena.
 */
export function falaDaEtapa(e: Etapa, exemplo: Tarefa): Trecho[] {
  const a = AULAS_ETAPA[e];
  return [
    { tipo: 'pt', texto: a.explicacao },
    ...(a.peca ? [{ tipo: 'jp', fala: { texto: a.peca, voz: 'palavra', kana: a.peca } } as const] : []),
    { tipo: 'pt', texto: 'Por exemplo.' },
    { tipo: 'jp', fala: { texto: textoDe(exemplo.segs), voz: 'frase', kana: kanaDe(exemplo.segs) } },
    { tipo: 'pt', texto: a.comoJoga },
  ];
}

/** A lição da etapa como apresentação (um cartão, sem imagem). Embaixo, o sentido de cada palavra do exemplo. */
export function itemDaEtapa(e: Etapa, exemplo: Tarefa): ItemNovo {
  const info = ETAPA_INFO[e];
  return {
    chaves: [`cena-etapa:${e}`],
    alvo: { t: 'cena', id: `etapa:${e}` },
    tipo: `Estrutura · ${info.nivel}`,
    grande: textoDe(exemplo.segs),
    leitura: kanaDe(exemplo.segs),
    pt: exemplo.palavras.map((w) => `${w.jp} = ${w.pt}`).join(' · '),
    explicacao: `${info.licao} ${AULAS_ETAPA[e].comoJoga}`,
    falas: falaDaEtapa(e, exemplo),
  };
}

/** Todo o português fixo das lições de etapa (para gravar). */
export function falasPtDasEtapas(): string[] {
  return ['Por exemplo.', ...Object.values(AULAS_ETAPA).flatMap((a) => [a.explicacao, a.comoJoga])];
}

/** A peça nova de cada etapa, dita sozinha em japonês (para gravar). */
export function pecasDasEtapas(): { etapa: Etapa; peca: string }[] {
  return ETAPAS.flatMap((e) => (AULAS_ETAPA[e].peca ? [{ etapa: e, peca: AULAS_ETAPA[e].peca as string }] : []));
}
