/**
 * Largura e altura (px) de cada imagem do estúdio, gravadas pelo `scripts/estudio.py exportar`.
 * Módulo puro (só JSON): serve ao jogo, aos testes e aos scripts em Node.
 */
import objetos from '../assets/imagens/medidas.json';
import acoes from '../assets/acoes/medidas.json';
import gente from '../assets/gente/medidas.json';
import lugares from '../assets/lugares/medidas.json';

const TODAS: Readonly<Record<string, number[]>> = { ...objetos, ...acoes, ...gente, ...lugares };

export function medida(id: string): { w: number; h: number } {
  const m = TODAS[id];
  return m ? { w: m[0]!, h: m[1]! } : { w: 1, h: 1 };
}

export function temMedida(id: string): boolean {
  return id in TODAS;
}
