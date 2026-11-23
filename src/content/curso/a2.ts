/**
 * Nível A2 (N4): as 20 unidades na ordem do curso, escritas em partes de cinco. Plano em
 * docs/curso.md; as regras são as do A1 (a1.ts) e os testes são os mesmos.
 */
import { A2_1_5 } from './a2a';
import { A2_6_10 } from './a2b';
import { A2_11_15 } from './a2c';
import { A2_16_20 } from './a2d';
import type { UnidadeEscrita } from './tipos';

export const A2: readonly UnidadeEscrita[] = [...A2_1_5, ...A2_6_10, ...A2_11_15, ...A2_16_20];
