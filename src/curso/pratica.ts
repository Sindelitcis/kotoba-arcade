/**
 * A prática guiada de um bloco do curso, sem tela (docs/ensino.md):
 *
 * - só pergunta o que já foi apresentado, e as alternativas erradas também já foram vistas;
 * - duas opções na primeira vez, três depois, quatro quando o item já está em cobrança;
 * - as erradas são as mais parecidas com a certa, e a que a pessoa marcou errado volta como opção;
 * - errar não tira nada: a resposta certa fica na tela até a pessoa seguir, o item é
 *   mostrado de novo e a pergunta volta no fim da fila;
 * - o bloco acaba quando cada item foi acertado uma vez.
 */
import { avaliar, emPratica, notaDaPratica, opcoesPara } from '../core/ensino';
import type { Rng } from '../core/rng';
import type { CardState } from '../core/srs';
import { montarPergunta, type ItemPratica, type Pergunta } from './motor';

export interface PraticaDeps {
  cards: Record<string, CardState>;
  now: () => number;
  rng: Rng;
}

export interface RespostaPratica {
  escolhida: string;
  certa: boolean;
}

/** Na prática, o máximo de opções (só o item já em cobrança chega a ele). */
export const OPCOES_MAX = 4;

export class Pratica {
  private fila: ItemPratica[];
  pergunta: Pergunta | null = null;
  resposta: RespostaPratica | null = null;
  /** Acertos de primeira e total de perguntas feitas. */
  acertos = 0;
  feitas = 0;
  private errados = new Set<string>();
  /** Por item: erradas que a pessoa marcou e erradas que já apareceram. */
  private confundidas = new Map<string, string[]>();
  private usadas = new Map<string, string[]>();

  constructor(
    readonly itens: readonly ItemPratica[],
    /** Itens já vistos do curso, de onde saem mais alternativas erradas. */
    private readonly conhecidos: readonly ItemPratica[],
    private readonly deps: PraticaDeps,
    /** Mini-teste: sempre com este número de opções, sem subir de 2 para 3. */
    private readonly opcoesFixas?: number,
  ) {
    this.fila = [...itens];
    this.proxima();
  }

  get fim(): boolean {
    return this.pergunta === null;
  }

  /** Itens que ainda faltam acertar (incluindo o da pergunta atual). */
  get faltam(): number {
    return this.fila.length + (this.pergunta && !this.resposta?.certa ? 1 : 0);
  }

  private proxima(): void {
    this.resposta = null;
    const item = this.fila.shift();
    if (!item) {
      this.pergunta = null;
      return;
    }
    const n = this.opcoesFixas ?? Math.min(OPCOES_MAX, opcoesPara(this.deps.cards, item.carta, OPCOES_MAX));
    this.pergunta = montarPergunta(item, this.itens, this.conhecidos, this.deps.cards, n, this.deps.rng, {
      confundidas: this.confundidas.get(item.id),
      usadas: this.usadas.get(item.id),
    });
    const usadas = this.usadas.get(item.id) ?? [];
    for (const o of this.pergunta.opcoes) if (o !== item.certa && !usadas.includes(o)) usadas.push(o);
    this.usadas.set(item.id, usadas);
  }

  /** A primeira resposta é a que vale. */
  responder(opcao: string): RespostaPratica | null {
    const p = this.pergunta;
    if (!p || this.resposta || !p.opcoes.includes(opcao)) return null;
    const certa = opcao === p.item.certa;
    this.resposta = { escolhida: opcao, certa };
    this.feitas++;
    if (certa && !this.errados.has(p.item.id)) this.acertos++;
    const { cards, now } = this.deps;
    avaliar(cards, p.item.carta, emPratica(cards, p.item.carta) ? notaDaPratica(certa) : { correct: certa }, now());
    if (!certa) {
      this.errados.add(p.item.id);
      const c = this.confundidas.get(p.item.id) ?? [];
      if (!c.includes(opcao)) c.push(opcao);
      this.confundidas.set(p.item.id, c);
      this.fila.push(p.item);
    }
    return this.resposta;
  }

  /** Item que errou e precisa ser mostrado de novo antes de seguir. */
  get mostrarDeNovo(): ItemPratica | null {
    return this.resposta && !this.resposta.certa ? (this.pergunta as Pergunta).item : null;
  }

  /** Vai para a próxima pergunta. Só depois de responder. */
  seguir(): boolean {
    if (!this.resposta) return false;
    this.proxima();
    return true;
  }
}
