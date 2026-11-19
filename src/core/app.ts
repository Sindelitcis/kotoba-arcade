/** Estado do app no navegador: save carregado, tela atual e gravação. */
import { signal } from '@preact/signals';
import { ensureAventuraSave, type AventuraSave } from '../games/aventura/engine';
import { ensureConversaSave, type ConversaSave } from '../games/conversa/engine';
import { ensureKanaBeatSave, type KanaBeatSave } from '../games/kanabeat/engine';
import { ensureKanjimonSave, type KanjimonSave } from '../games/kanjimon/engine';
import { ensureRoguelikeSave, type RoguelikeSave } from '../games/roguelike/engine';
import { markPlayed } from './progress';
import { importSave, loadSave, writeSave, type SaveData } from './save';

export type Screen = 'hub' | 'kanjimon' | 'kanjidex' | 'booster' | 'kanabeat' | 'roguelike' | 'aventura' | 'conversa';

export const app: { data: SaveData } = { data: loadSave(localStorage, Date.now()) };

/** Muda a cada gravação. Componentes leem `tick.value` para redesenhar. */
export const tick = signal(0);
export const screen = signal<Screen>('hub');

export function commit(): void {
  writeSave(localStorage, app.data, Date.now());
  tick.value++;
}

export function go(next: Screen): void {
  if (next !== 'hub') {
    app.data.profile.lastGame = next === 'kanjidex' || next === 'booster' ? 'kanjimon' : next;
    markPlayed(app.data, Date.now());
    commit();
  }
  screen.value = next;
}

export function replaceSave(text: string): void {
  app.data = importSave(text, Date.now());
  commit();
}

export function kanjimonSave(): KanjimonSave {
  return ensureKanjimonSave(app.data.games);
}

export function kanaBeatSave(): KanaBeatSave {
  return ensureKanaBeatSave(app.data.games);
}

export function aventuraSave(): AventuraSave {
  return ensureAventuraSave(app.data.games);
}

export function conversaSave(): ConversaSave {
  return ensureConversaSave(app.data.games);
}

export function roguelikeSave(): RoguelikeSave {
  return ensureRoguelikeSave(app.data.games);
}
