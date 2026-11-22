/**
 * Fala pedida sem gravação. O site não tem voz de reserva: o que não foi gravado fica
 * mudo. Para isso não passar calado, cada falta vai para o console com esta marca, e os
 * testes de ponta a ponta falham se ela aparecer (e2e/apoio.ts).
 */
export const MARCA_SEM_GRAVACAO = '[voz] sem gravação';

export function avisarSemGravacao(lingua: 'ja' | 'pt', texto: string): void {
  console.warn(`${MARCA_SEM_GRAVACAO} (${lingua}): ${texto}`);
}
