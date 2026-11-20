/**
 * Regras de uma lição em quadrinhos, sem tela.
 *
 * - Quadro: uma tecla avança.
 * - Pergunta: a primeira resposta é a que vale. Errou, a certa aparece com a explicação
 *   e a tecla segue; não tem tela de erro nem segunda chance obrigatória.
 * - Montar a frase: cada número põe o próximo bloco. Bloco fora de ordem volta; depois
 *   de duas voltas, o certo brilha.
 * - Memória: palavra ou kanji que nunca apareceu antes entra só como apresentado (nota
 *   "com ajuda", nunca ruim), a mesma regra da Aventura e do Kumitate. O que já tinha
 *   carta ganha nota boa ou ruim pela primeira resposta.
 */
import { shuffle, type Rng } from '../core/rng';
import { review, type CardState } from '../core/srs';
import type { Licao, Passo, Pergunta } from './licoes';

export interface AndamentoDeps {
  cards: Record<string, CardState>;
  now: () => number;
  rng: Rng;
}

export interface Resposta {
  escolhida: string;
  certa: boolean;
}

export const XP_ACERTO = 2;
export const XP_LICAO = 10;
export const MOEDAS_LICAO = 3;

export class Andamento {
  i = 0;
  combo = 0;
  /** Perguntas e montagens respondidas certo de primeira. */
  acertos = 0;
  /** Perguntas e montagens da lição. */
  readonly total: number;
  resposta: Resposta | null = null;
  /** Opções da pergunta atual, já embaralhadas. */
  opcoes: string[] = [];
  /** Blocos da montagem atual, embaralhados: índice na ordem certa. */
  bandeja: number[] = [];
  /** Blocos já colocados, na ordem. */
  montada: number[] = [];
  voltas = 0;
  private errouMontagem = false;

  constructor(
    readonly licao: Licao,
    private readonly deps: AndamentoDeps,
  ) {
    this.total = licao.passos.filter((p) => p.tipo !== 'quadro').length;
    this.preparar();
  }

  get passo(): Passo | undefined {
    return this.licao.passos[this.i];
  }

  get fim(): boolean {
    return this.i >= this.licao.passos.length;
  }

  /** Bloco que brilha na montagem (depois de duas voltas), ou -1. */
  get dica(): number {
    const p = this.passo;
    if (p?.tipo !== 'ordem' || this.voltas < 2) return -1;
    const alvo = p.blocos[this.montada.length];
    return p.blocos.findIndex((b, i) => b === alvo && !this.montada.includes(i));
  }

  get montagemPronta(): boolean {
    const p = this.passo;
    return p?.tipo === 'ordem' && this.montada.length === p.blocos.length;
  }

  /** Pode seguir: quadro, pergunta respondida ou frase montada. */
  get podeSeguir(): boolean {
    const p = this.passo;
    if (!p) return false;
    if (p.tipo === 'quadro') return true;
    if (p.tipo === 'pergunta') return this.resposta !== null;
    return this.montagemPronta;
  }

  private preparar(): void {
    this.resposta = null;
    this.montada = [];
    this.voltas = 0;
    this.errouMontagem = false;
    const p = this.passo;
    this.opcoes = p?.tipo === 'pergunta' ? shuffle(this.deps.rng, [p.correta, ...p.erradas]) : [];
    this.bandeja = p?.tipo === 'ordem' ? embaralharDiferente(this.deps.rng, p.blocos.length) : [];
  }

  /** Vai para o próximo passo. Devolve false se o passo atual ainda pede resposta. */
  avancar(): boolean {
    if (!this.podeSeguir) return false;
    this.i++;
    this.preparar();
    return true;
  }

  responder(opcao: string): Resposta | null {
    const p = this.passo;
    if (p?.tipo !== 'pergunta' || this.resposta) return null;
    const certa = opcao === p.correta;
    this.resposta = { escolhida: opcao, certa };
    this.contar(certa);
    if (p.carta) this.memorizar(p, certa);
    return this.resposta;
  }

  /** Põe o bloco `indice` (na ordem certa) como o próximo da frase. */
  colocar(indice: number): 'certo' | 'volta' | 'pronta' | null {
    const p = this.passo;
    if (p?.tipo !== 'ordem' || this.montagemPronta || this.montada.includes(indice)) return null;
    // Blocos iguais (duas vezes です) valem no mesmo lugar.
    if (p.blocos[indice] !== p.blocos[this.montada.length]) {
      this.voltas++;
      this.errouMontagem = true;
      this.combo = 0;
      return 'volta';
    }
    this.montada.push(indice);
    if (!this.montagemPronta) return 'certo';
    this.contar(!this.errouMontagem);
    return 'pronta';
  }

  private contar(certa: boolean): void {
    if (certa) {
      this.acertos++;
      this.combo++;
    } else this.combo = 0;
  }

  private memorizar(p: Pergunta, certa: boolean): void {
    const { cards, now } = this.deps;
    const key = p.carta as string;
    const antes = cards[key];
    cards[key] = antes ? review(antes, { correct: certa }, now()) : review(undefined, { correct: true, hinted: true }, now());
  }
}

/** Ordem embaralhada que não seja a própria resposta (com 3 ou mais blocos). */
function embaralharDiferente(rng: Rng, n: number): number[] {
  const certa = [...Array(n).keys()];
  for (let t = 0; t < 10; t++) {
    const e = shuffle(rng, certa);
    if (n < 2 || e.some((v, i) => v !== i)) return e;
  }
  return certa.slice().reverse();
}
