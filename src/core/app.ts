/** Estado do app no navegador: save carregado, tela atual e gravação. */
import { signal } from '@preact/signals';
import { ensureAventuraSave, type AventuraSave } from '../games/aventura/engine';
import { ensureCenaSave, type CenaSave } from '../games/cena/engine';
import { ensureConversaSave, type ConversaSave } from '../games/conversa/engine';
import { ensureGramaticaSave, type GramaticaSave } from '../games/gramatica/engine';
import { ensureKanaBeatSave, type KanaBeatSave } from '../games/kanabeat/engine';
import { ensureKanaImagensSave, type KanaImagensSave } from '../games/kanaimagens/engine';
import { ensureKanjimonSave, type KanjimonSave } from '../games/kanjimon/engine';
import { ensurePecasSave, type PecasSave } from '../games/pecas/engine';
import { ensureMemoriaSave, type MemoriaSave } from '../games/memoria/engine';
import { ensureRoguelikeSave, type RoguelikeSave } from '../games/roguelike/engine';
import { ensureOuvirSave, type OuvirSave } from '../ouvir/save';
import { ensureJornadaSave, registrarMissao, type JornadaSave } from '../jornada/etapas';
import { ensureCursoSave, type CursoSave } from '../curso/motor';
import { foco } from './foco';
import { markPlayed } from './progress';
import { importSave, loadSave, writeSave, type SaveData } from './save';

export type Screen = 'hub' | 'kanjimon' | 'kanjidex' | 'booster' | 'kanabeat' | 'roguelike' | 'aventura' | 'conversa' | 'gramatica' | 'jornada' | 'licao' | 'pecas' | 'kanaimagens' | 'memoria' | 'cena' | 'ouvir' | 'curso';

export const app: { data: SaveData } = { data: loadSave(localStorage, Date.now()) };

/** Muda a cada gravação. Componentes leem `tick.value` para redesenhar. */
export const tick = signal(0);
export const screen = signal<Screen>('hub');

/** false quando a última gravação foi recusada pelo navegador. O fliperama avisa e sugere o backup. */
export const saved = signal(true);

export function commit(): void {
  saved.value = writeSave(localStorage, app.data, Date.now());
  tick.value++;
}

/** Unidade do curso aberta no tocador e o bloco em que ela está. `null`: o mapa das unidades. */
export const cursoAberto = signal<{ unidade: string; bloco: number; modo?: 'prova' | 'nivelamento' | 'modulo0' | 'revisao' } | null>(null);

/** Lição em quadrinhos aberta e a missão da Jornada que a abriu. */
export const licaoAberta = signal<{ licao: string; missao: string } | null>(null);

export function go(next: Screen): void {
  // Jogo aberto por uma missão da Jornada: a saída dele volta para a Jornada e conta a missão.
  const f = foco.value;
  if (next === 'hub' && f) {
    registrarMissao(jornadaSave(), f.missao);
    foco.value = null;
    next = 'jornada';
  }
  if (next !== 'hub' && next !== 'jornada') {
    if (next !== 'licao' && next !== 'ouvir' && next !== 'curso') app.data.profile.lastGame = next === 'kanjidex' || next === 'booster' ? 'kanjimon' : next;
    markPlayed(app.data, Date.now());
    commit();
  } else if (next === 'jornada') commit();
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

export function kanaImagensSave(): KanaImagensSave {
  return ensureKanaImagensSave(app.data.games);
}

export function gramaticaSave(): GramaticaSave {
  return ensureGramaticaSave(app.data.games);
}

export function jornadaSave(): JornadaSave {
  return ensureJornadaSave(app.data.games);
}

export function pecasSave(): PecasSave {
  return ensurePecasSave(app.data.games);
}

export function memoriaSave(): MemoriaSave {
  return ensureMemoriaSave(app.data.games);
}

export function ouvirSave(): OuvirSave {
  return ensureOuvirSave(app.data.games);
}

export function cursoSave(): CursoSave {
  return ensureCursoSave(app.data.games);
}

export function cenaSave(): CenaSave {
  return ensureCenaSave(app.data.games);
}
