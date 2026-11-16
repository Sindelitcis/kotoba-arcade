/**
 * Cenas da Aventura, na ordem da história. Para escrever uma cena nova: crie o
 * arquivo aqui, some à lista e rode `npm test`. O teste de dados aponta escolha
 * sem saída, kanji sem leitura e palavra que falta em `src/content/vida.ts`.
 */
import type { Scene, Speaker } from '../engine';
import { aeroporto } from './01-aeroporto';
import { estacao } from './02-estacao';
import { konbini } from './03-konbini';

export const SCENES: readonly Scene[] = [aeroporto, estacao, konbini];

export const SPEAKERS: Readonly<Record<string, Speaker>> = {
  fiscal: { name: 'Fiscal da imigração' },
  funcionaria: { name: 'Funcionária do aeroporto' },
  atendente: { name: 'Atendente do guichê' },
  aviso: { name: 'Aviso da estação' },
  senhora: { name: 'Senhora no trem' },
  balconista: { name: 'Balconista' },
};
