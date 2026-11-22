/**
 * A peça nova do Kumitate falada: o professor explica em português, você ouve a peça
 * sozinha (quando ela é uma partícula) e o exemplo da lição em japonês. A tela continua
 * com o texto escrito; isto é o que toca quando a lição aparece e na tecla R.
 */
import type { Trecho } from '../../core/sequencia';
import type { ItemNovo } from '../../content/ensino';
import { cardOf, exampleView, type Course, type Point } from './engine';

export interface LicaoFalada {
  explicacao: string;
  /** A partícula dita sozinha, como ela soa (は soa わ): a gravação do kana. */
  peca?: string;
  /** O sentido do exemplo, dito antes dele. */
  exemplo: string;
}

export const LICOES_FALADAS: Readonly<Record<string, LicaoFalada>> = {
  wa: {
    explicacao: 'Peça nova. Esta vem logo depois do assunto, e o resto da frase fala sobre ele. Ela se escreve com o ha, mas se fala assim:',
    peca: 'わ',
    exemplo: 'O professor é japonês.',
  },
  no: {
    explicacao: 'Peça nova. Esta liga duas palavras, como o nosso de. Só que primeiro vem o dono, depois a coisa.',
    peca: 'の',
    exemplo: 'Isto é o dicionário do professor.',
  },
  wo: {
    explicacao: 'Peça nova. Esta marca a coisa que você come, bebe, compra ou lê. Fica logo antes do verbo, e se fala assim:',
    peca: 'を',
    exemplo: 'Eu compro uma bebida.',
  },
  masu: {
    explicacao: 'Peça nova: a ponta do verbo. Uma ponta diz que sim, que você faz. A outra diz que não. Escolha a ponta e o verbo muda sozinho.',
    exemplo: 'Meu pai não come tempurá.',
  },
  mashita: {
    explicacao: 'Peça nova: a ponta do passado. Palavras como ano passado avisam que a frase já aconteceu.',
    exemplo: 'No ano passado eu fui ver as cerejeiras.',
  },
  ni: {
    explicacao: 'Peça nova. Esta marca para onde você vai.',
    peca: 'に',
    exemplo: 'Semana que vem eu vou ao aeroporto.',
  },
  de: {
    explicacao: 'Peça nova. Esta marca o lugar onde a coisa acontece: onde você come, compra ou lê. Não confunda com a de para onde você vai.',
    peca: 'で',
    exemplo: 'Eu compro bentô na loja.',
  },
  to: {
    explicacao: 'Peça nova. Depois de uma pessoa, esta quer dizer com.',
    peca: 'と',
    exemplo: 'Eu vou à cafeteria com um amigo.',
  },
  mo: {
    explicacao: 'Peça nova. Esta quer dizer também, e entra no lugar da peça do assunto.',
    peca: 'も',
    exemplo: 'Aquela pessoa também é estudante.',
  },
  ga: {
    explicacao: 'Peça nova. Para dizer que uma coisa existe num lugar, esta marca a coisa. Se for gente ou bicho, o verbo do fim muda.',
    peca: 'が',
    exemplo: 'Em frente à estação tem um banco.',
  },
  tai: {
    explicacao: 'Peça nova: a ponta do querer. Com ela, o verbo vira quero fazer.',
    exemplo: 'Eu quero comprar lembrancinhas.',
  },
  te: {
    explicacao: 'Peça nova: a ponta do pedido. O verbo muda um pouco e depois vem o por favor.',
    exemplo: 'Escreva o nome aqui, por favor.',
  },
  teiru: {
    explicacao: 'Peça nova: a ponta do está fazendo, para o que acontece agora.',
    exemplo: 'Minha mãe está no telefone.',
  },
  nai: {
    explicacao: 'Peça nova. Entre amigos, o verbo não usa a ponta educada. O não fica mais curto.',
    exemplo: 'Falando com um amigo: semana que vem eu não venho.',
  },
  ta: {
    explicacao: 'Peça nova. E o passado entre amigos, também mais curto.',
    exemplo: 'Falando com um amigo: no fim de semana eu fiz compras.',
  },
};

/** O exemplo da lição como ele é dito (a mesma gravação da tecla R). */
export function textoDoExemplo(course: Course, point: Point): string {
  return exampleView(course, point)
    .map((w) => w.text + w.tail)
    .join('');
}

/** A lição inteira em trechos: explicação, peça, sentido do exemplo e o exemplo. */
/** A lição do ponto como apresentação (core/Apresentacao.tsx): a peça, o porquê e o exemplo. */
export function itemDaLicao(course: Course, point: Point): ItemNovo {
  const kana = exampleView(course, point)
    .map((w) => (w.reading ?? w.text) + w.tail)
    .join('');
  return {
    chaves: [cardOf(point.id)],
    alvo: { t: 'gramatica', id: point.id },
    tipo: 'Peça nova',
    grande: point.blocks.join(' · '),
    pt: point.title,
    explicacao: point.lesson,
    exemplo: { jp: textoDoExemplo(course, point), kana, pt: point.example.pt },
    falas: licaoFalada(course, point),
  };
}

export function licaoFalada(course: Course, point: Point): Trecho[] {

  const l = LICOES_FALADAS[point.id];
  if (!l) throw new Error(`peça sem lição falada: ${point.id}`);
  const kana = exampleView(course, point)
    .map((w) => (w.reading ?? w.text) + w.tail)
    .join('');
  return [
    { tipo: 'pt', texto: l.explicacao },
    ...(l.peca ? [{ tipo: 'jp', fala: { texto: l.peca, voz: 'palavra', kana: l.peca } } as const] : []),
    { tipo: 'pt', texto: l.exemplo },
    { tipo: 'jp', fala: { texto: textoDoExemplo(course, point), voz: 'frase', kana } },
  ];
}
