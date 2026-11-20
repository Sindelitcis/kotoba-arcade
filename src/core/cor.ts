/**
 * Brilho do combo (docs/estilo.md): o cartão do jogo ganha um aro sakura e um brilho que crescem
 * com os acertos seguidos. Errar baixa o brilho sem apagar de vez; pausar ou sair apaga.
 *
 * `cor` vai de 0 (sem brilho) a 1 (combo cheio). O CSS lê o valor em `--cor`.
 */
import { signal } from '@preact/signals';
import type { AventuraSave } from '../games/aventura/engine';
import type { CenaSave } from '../games/cena/engine';
import type { ConversaSave } from '../games/conversa/engine';
import type { GramaticaSave } from '../games/gramatica/engine';
import type { KanaBeatSave } from '../games/kanabeat/engine';
import type { KanaImagensSave } from '../games/kanaimagens/engine';
import type { KanjimonSave } from '../games/kanjimon/engine';
import type { PecasSave } from '../games/pecas/engine';
import type { MemoriaSave } from '../games/memoria/engine';
import type { RoguelikeSave } from '../games/roguelike/engine';

export const cor = signal(0);

/** Acertos seguidos para a cor encher. */
export const COMBO_CHEIO = 6;
/** Quanto da cor sobra depois de um erro: cai, mas não some de uma vez. */
export const SOBRA_NO_ERRO = 0.35;

export function corDoCombo(combo: number, cheio = COMBO_CHEIO): number {
  if (!Number.isFinite(combo) || combo <= 0) return 0;
  return Math.min(1, combo / cheio);
}

/** Acerto: a cor sobe até o nível do combo e nunca desce num acerto. */
export function acertou(combo: number, cheio = COMBO_CHEIO): void {
  cor.value = Math.max(cor.value, corDoCombo(combo, cheio));
}

export function errou(): void {
  cor.value = Math.round(cor.value * SOBRA_NO_ERRO * 100) / 100;
}

/** Pausa, troca de tela, fim da caçada: o brilho apaga. */
export function zerar(): void {
  cor.value = 0;
}

/** Progresso que só cresce (frases montadas na rodada, cena concluída): 0 a 1. */
export function progresso(feito: number, total: number): number {
  if (total <= 0 || !Number.isFinite(feito)) return 0;
  return Math.max(0, Math.min(1, feito / total));
}

/** Estilo inline com `--cor` arredondado (o CSS faz a transição suave). */
export function corStyle(v: number): Record<string, string> {
  return { '--cor': String(Math.round(Math.max(0, Math.min(1, v)) * 100) / 100) };
}

export interface Saves {
  kanjimon: KanjimonSave;
  kanabeat: KanaBeatSave;
  roguelike: RoguelikeSave;
  aventura: AventuraSave;
  gramatica: GramaticaSave;
  conversa: ConversaSave;
  pecas: PecasSave;
  kanaimagens: KanaImagensSave;
  memoria: MemoriaSave;
  cena: CenaSave;
}

/** Jogos que o jogador já jogou de verdade: no fliperama o cartão ganha o sinal de jogado. */
export function visitados(s: Saves): Record<keyof Saves, boolean> {
  return {
    kanjimon: s.kanjimon.captures > 0,
    kanabeat: s.kanabeat.plays > 0,
    roguelike: s.roguelike.runs > 0,
    aventura: s.aventura.plays > 0 || s.aventura.done.length > 0,
    gramatica: s.gramatica.rounds > 0,
    conversa: s.conversa.conversas > 0,
    pecas: s.pecas.rounds > 0,
    kanaimagens: s.kanaimagens.rodadas > 0,
    memoria: s.memoria.rounds > 0,
    cena: s.cena.rounds > 0,
  };
}
