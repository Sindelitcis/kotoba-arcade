/**
 * Cenários e personagens em anime colorido (docs/estilo.md e docs/imagens.md). Os arquivos ficam
 * em src/assets/cenas-cor e src/assets/pessoas-cor; o Vite cuida dos nomes com hash na versão publicada.
 */

const CENAS = import.meta.glob<string>('../assets/cenas-cor/*.webp', { eager: true, query: '?url', import: 'default' });
const PESSOAS = import.meta.glob<string>('../assets/pessoas-cor/*.webp', { eager: true, query: '?url', import: 'default' });

export const NOMES_CENAS = [
  'hub-shibuya',
  'kanjimon-takao',
  'kanabeat-dotonbori',
  'kotodama-inari',
  'kumitate-gion',
  'pecas-ryoanji',
  'aventura-narita',
  'aventura-shinjuku',
  'aventura-konbini',
  'conversa-cafe',
  'conversa-osaka',
  'conversa-sharehouse',
  'conversa-restaurante',
] as const;

export const NOMES_PESSOAS = ['fiscal', 'funcionaria', 'atendente', 'senhora', 'balconista', 'sakura', 'takeshi', 'yui', 'tanaka'] as const;

export type Cena = (typeof NOMES_CENAS)[number];
export type Pessoa = (typeof NOMES_PESSOAS)[number];

export function cenaUrl(nome: Cena): string | undefined {
  return CENAS[`../assets/cenas-cor/${nome}.webp`];
}

export function pessoaUrl(nome: string | undefined): string | undefined {
  return nome ? PESSOAS[`../assets/pessoas-cor/${nome}.webp`] : undefined;
}

/** Estilo inline que o CSS usa como fundo do cartão (`--cena`). Vazio se a imagem não existir. */
export function cenaStyle(nome: Cena | undefined): Record<string, string> {
  const url = nome && cenaUrl(nome);
  return url ? { '--cena': `url("${url}")` } : {};
}

/** Cenário de cada cena da Aventura, pelo id da cena. */
export const CENA_AVENTURA: Readonly<Record<string, Cena>> = {
  aeroporto: 'aventura-narita',
  estacao: 'aventura-shinjuku',
  konbini: 'aventura-konbini',
};

/** Cenário e personagem de cada situação da Conversa, pelo id da situação. */
export const CENA_CONVERSA: Readonly<Record<string, { cena: Cena; pessoa: Pessoa }>> = {
  pedido: { cena: 'conversa-cafe', pessoa: 'sakura' },
  caminho: { cena: 'conversa-osaka', pessoa: 'takeshi' },
  apresentacao: { cena: 'conversa-sharehouse', pessoa: 'yui' },
  entrevista: { cena: 'conversa-restaurante', pessoa: 'tanaka' },
};
