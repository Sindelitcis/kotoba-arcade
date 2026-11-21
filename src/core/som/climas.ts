/**
 * Qual trilha toca em cada tela, e os ganchos que ligam o som ao resto do site sem mexer
 * no visual: troca de tela, abrir e fechar a ajuda e os Ajustes, e Ajustes mudando.
 */
import { effect, signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { app, screen, tick, type Screen } from '../app';
import { ajudaAberta, subtelaAjuda } from '../help/ajuda';
import { calm } from '../fx';
import type { Clima } from './catalogo';
import { aplicarVolumes, climaPedido, tocarClima, tocarEfeito } from './mixer';

/**
 * Trilha de cada tela. `null` é silêncio: o Kana Beat tem a música dele (que precisa da
 * batida) e a Conversa usa o microfone.
 */
export const CLIMA_DA_TELA: Record<Screen, Clima | null> = {
  hub: 'hub',
  jornada: 'hub',
  licao: 'calmo',
  ouvir: 'calmo',
  gramatica: 'calmo',
  memoria: 'calmo',
  kanaimagens: 'calmo',
  pecas: 'calmo',
  kanjidex: 'calmo',
  booster: 'hub',
  aventura: 'historia',
  cena: 'historia',
  kanjimon: 'acao',
  roguelike: 'acao',
  kanabeat: null,
  conversa: null,
};

/** Clima pedido por um jogo por cima do da tela (chefe, vitória). `undefined`: o da tela. */
export const climaDoJogo = signal<Clima | null | undefined>(undefined);

/** O clima que deve tocar agora. */
export function climaAtual(tela: Screen, doJogo: Clima | null | undefined): Clima | null {
  return doJogo !== undefined ? doJogo : CLIMA_DA_TELA[tela];
}

/**
 * Um jogo troca a trilha enquanto estiver montado: `useClima(run.won ? 'vitoria' : undefined)`.
 * `undefined` devolve a da tela.
 */
export function useClima(clima: Clima | null | undefined): void {
  useEffect(() => {
    climaDoJogo.value = clima;
    return () => {
      climaDoJogo.value = undefined;
    };
  }, [clima]);
}

let ligado = false;

/** Liga os ganchos (uma vez, no main). */
export function ligarSom(): void {
  if (ligado) return;
  ligado = true;
  // Ajustes mudaram (cada gravação mexe no tick): volumes de novo, e a trilha começa se o
  // som acabou de ser ligado.
  effect(() => {
    void tick.value;
    aplicarVolumes();
    if (app.data.settings.sound) tocarClima(climaPedido());
  });
  // Tela nova zera o clima do jogo anterior.
  let telaAnterior = screen.peek();
  effect(() => {
    const tela = screen.value;
    if (tela !== telaAnterior) {
      telaAnterior = tela;
      climaDoJogo.value = undefined;
      // Com movimento reduzido a troca de tela fica sem o "whoosh".
      if (!calm()) tocarEfeito('transicao', { ganho: 0.6 });
    }
  });
  effect(() => {
    tocarClima(climaAtual(screen.value, climaDoJogo.value));
  });
  // Ajuda e Ajustes: som de abrir e de fechar.
  let ajuda = ajudaAberta.peek();
  effect(() => {
    const aberta = ajudaAberta.value;
    if (aberta === ajuda) return;
    ajuda = aberta;
    tocarEfeito(aberta ? 'menu' : 'voltar', { ganho: aberta ? 1 : 0.8 });
  });
  let ajustes = subtelaAjuda.peek() === 'ajustes';
  effect(() => {
    const aberto = subtelaAjuda.value === 'ajustes';
    if (aberto === ajustes) return;
    ajustes = aberto;
    tocarEfeito(aberto ? 'menu' : 'voltar', { ganho: aberto ? 1 : 0.8 });
  });
}
