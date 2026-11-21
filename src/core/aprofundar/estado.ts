/**
 * Estado do Aprofundar: o que está na tela agora (cada jogo diz com `useAprofundar`), o
 * que foi respondido há pouco, a ficha aberta e a oferta do ritmo de estudo.
 *
 * Abrir pausa o jogo (os mesmos ouvintes da ajuda) e fechar devolve tudo como estava.
 * O que foi estudado na ficha conta como revisão leve no FSRS (`estudoLeve`).
 */
import { signal } from '@preact/signals';
import { useLayoutEffect } from 'preact/hooks';
import { alvoDaCarta, chaveDoAlvo, mesmoAlvo, type Alvo } from '../../content/aprofundar/alvo';
import { fichaDe } from '../../content/aprofundar/fichas';
import { ajudaAberta, aprofundarAberto, avisarAbertura, avisarFechamento } from '../help/ajuda';
import { ouvintesDeRevisao, retrievability, review, State, type CardState, type Outcome } from '../srs';
import type { Ritmo } from '../save';

/** O que o jogo mostra agora, o principal primeiro. */
export const naTela = signal<readonly Alvo[]>([]);
/** Itens respondidos há pouco (o mais novo primeiro). */
export const recentes = signal<readonly Alvo[]>([]);
/** Ficha aberta no painel e o caminho até ela (clicar numa palavra da família empilha). */
export const pilha = signal<readonly Alvo[]>([]);
/** Oferta do ritmo de estudo: "aprofundar isto? F4". Some sozinha. */
export const oferta = signal<Alvo | null>(null);

const MAX_RECENTES = 8;

/** Os alvos que têm ficha, sem repetir. */
function comFicha(alvos: readonly Alvo[]): Alvo[] {
  const out: Alvo[] = [];
  for (const a of alvos) if (!out.some((b) => mesmoAlvo(a, b)) && fichaDe(a)) out.push(a);
  return out;
}

/**
 * O jogo diz o que está na tela. Mudou a pergunta, muda o que o Aprofundar abre.
 * `null` e lista vazia: nada para aprofundar agora (o painel mostra os recentes).
 */
export function useAprofundar(alvos: Alvo | readonly Alvo[] | null | undefined): void {
  const lista = !alvos ? [] : Array.isArray(alvos) ? (alvos as readonly Alvo[]) : [alvos as Alvo];
  const chave = lista.map(chaveDoAlvo).join('|');
  useLayoutEffect(() => {
    naTela.value = comFicha(lista);
    return () => {
      naTela.value = [];
    };
    // A chave resume a lista: o jogo pode criar o array de novo a cada desenho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
}

export function abrirAprofundar(alvo?: Alvo): void {
  if (ajudaAberta.value) return;
  const primeiro = alvo ?? naTela.value[0] ?? recentes.value[0];
  oferta.value = null;
  pilha.value = primeiro ? [primeiro] : [];
  if (aprofundarAberto.value) return;
  aprofundarAberto.value = true;
  avisarAbertura();
}

export function fecharAprofundar(): void {
  if (!aprofundarAberto.value) return;
  aprofundarAberto.value = false;
  pilha.value = [];
  avisarFechamento();
}

/** Abre outra ficha por cima (palavra da família, kanji da palavra). */
export function irPara(alvo: Alvo): void {
  const atual = pilha.value[pilha.value.length - 1];
  if (atual && mesmoAlvo(atual, alvo)) return;
  pilha.value = [...pilha.value, alvo];
}

/** Troca a ficha do topo (as abas "na tela" e "recentes"). */
export function trocarPara(alvo: Alvo): void {
  pilha.value = [alvo];
}

export function voltar(): boolean {
  if (pilha.value.length <= 1) return false;
  pilha.value = pilha.value.slice(0, -1);
  return true;
}

/* ───────── Revisão leve ───────── */

/** A carta (item, sem a habilidade) de cada alvo. Cena não tem carta. */
export function itemDoAlvo(a: Alvo): string | null {
  switch (a.t) {
    case 'kanji': return `k:${a.c}`;
    case 'palavra': return a.id;
    case 'kana': return a.id;
    case 'gramatica': return a.id.startsWith('g-') ? `gram:${a.id}` : `g:${a.id}`;
    case 'expressao': return `expr:${a.id}`;
    case 'cena': return null;
  }
}

/** Quanto tempo a ficha precisa ficar aberta para contar como estudo. */
export const TEMPO_DE_ESTUDO_MS = 4000;
const estudadas = new Set<string>();
let revisandoLeve = false;

/**
 * A ficha ficou aberta tempo bastante: as cartas do item que já estavam para vencer
 * (chance de lembrar abaixo de 90%) ganham uma revisão "difícil", que adia um pouco sem
 * punir. Só carta que já existe e está em revisão; uma vez por item a cada sessão. Nunca
 * cria carta nova: abrir a ficha não é o mesmo que acertar no jogo.
 * Devolve as chaves revisadas.
 */
export function estudoLeve(cards: Record<string, CardState>, alvo: Alvo, now: number): string[] {
  const item = itemDoAlvo(alvo);
  if (!item || estudadas.has(item)) return [];
  estudadas.add(item);
  const feitas: string[] = [];
  revisandoLeve = true;
  try {
    for (const [chave, card] of Object.entries(cards)) {
      if (!chave.startsWith(`${item}#`)) continue;
      if (card.state !== State.Review || retrievability(card, now) >= 0.9) continue;
      cards[chave] = review(card, { correct: true, hinted: true }, now);
      feitas.push(chave);
    }
  } finally {
    revisandoLeve = false;
  }
  return feitas;
}

/** Testes: esquece o que foi estudado nesta sessão. */
export function esquecerSessao(): void {
  estudadas.clear();
  errosNaSessao.clear();
  recentes.value = [];
  oferta.value = null;
}

/* ───────── Respostas dos jogos ───────── */

interface Pendente {
  card: CardState;
  outcome: Outcome;
  nova: boolean;
}

let pendentes: Pendente[] = [];
const errosNaSessao = new Map<string, number>();

/** O que o ritmo faz com uma resposta: oferecer a ficha ou não. */
export function deveOferecer(ritmo: Ritmo, outcome: Outcome, nova: boolean, errosDoItem: number): boolean {
  if (ritmo === 'jogo') return false;
  if (ritmo === 'estudo') return !outcome.correct || nova;
  return !outcome.correct && errosDoItem >= 2;
}

/**
 * Liga o Aprofundar às respostas: cada `review()` dos jogos vira recente e, conforme o
 * ritmo, uma oferta. O jogo grava a carta logo depois de `review()`; a chave dela é
 * achada no fim da tarefa, procurando o estado novo dentro de `cards()`.
 */
export function ouvirRespostas(cards: () => Record<string, CardState>, ritmo: () => Ritmo, telaDeJogo: () => boolean): () => void {
  const ouvinte = (card: CardState, outcome: Outcome, nova: boolean) => {
    if (revisandoLeve) return;
    if (pendentes.length === 0) queueMicrotask(processar);
    pendentes.push({ card, outcome, nova });
  };
  const processar = () => {
    const lote = pendentes;
    pendentes = [];
    const porEstado = new Map<CardState, Pendente>(lote.map((p) => [p.card, p]));
    for (const [chave, card] of Object.entries(cards())) {
      const p = porEstado.get(card);
      if (!p) continue;
      const alvo = alvoDaCarta(chave);
      if (!alvo || !fichaDe(alvo)) continue;
      recentes.value = [alvo, ...recentes.value.filter((a) => !mesmoAlvo(a, alvo))].slice(0, MAX_RECENTES);
      const k = chaveDoAlvo(alvo);
      const erros = (errosNaSessao.get(k) ?? 0) + (p.outcome.correct ? 0 : 1);
      errosNaSessao.set(k, erros);
      if (telaDeJogo() && !aprofundarAberto.value && deveOferecer(ritmo(), p.outcome, p.nova, erros)) oferta.value = alvo;
    }
  };
  ouvintesDeRevisao.add(ouvinte);
  return () => void ouvintesDeRevisao.delete(ouvinte);
}

/** Alvos das cartas (chaves do FSRS), sem as que não são de item estudável. */
export function alvosDasCartas(chaves: readonly (string | null | undefined)[]): Alvo[] {
  return chaves.flatMap((c) => {
    const a = c ? alvoDaCarta(c) : null;
    return a ? [a] : [];
  });
}

/** O assunto de uma lição da Jornada (ou aula do Ouvir) pelo id: gramática ou situação. */
export function alvosDaLicaoPorId(id: string): Alvo[] {
  if (id.startsWith('gram:')) return [{ t: 'gramatica', id: id.slice(5) }];
  if (id.startsWith('sit:')) return [{ t: 'cena', id: `situacao:${id.slice(4)}` }];
  if (id.startsWith('expr:')) return [];
  return [];
}
