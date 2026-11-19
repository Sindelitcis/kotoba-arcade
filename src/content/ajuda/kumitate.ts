import { MEMORIA_UNICA, PARAR, SAVE, VOLTOU } from './comum';
import type { Ajuda } from './tipos';

export const KUMITATE: Ajuda = {
  tela: 'gramatica',
  titulo: 'Kumitate',
  jp: '組み立て',
  objetivo: [
    'Montar frases. Cada frase tem buracos, e você encaixa partículas (は, を, に…) e pontas de verbo (ます, ません, た…) até ela dizer o que foi pedido em português.',
    'Uma rodada são seis frases.',
  ],
  passos: [
    'Enter começa uma rodada.',
    'Leia o pedido em português. Ex.: "Eu bebo café."',
    'Escolha a peça da bandeja para o buraco da vez: clique ou aperte o número dela.',
    'A ponta de verbo transforma o verbo na hora. Ex.: 飲む (のむ, beber) + ました vira 飲みました (bebi).',
    'Peça que não serve volta para a bandeja com o motivo. Depois de duas erradas, a certa brilha.',
    'Frase pronta: Enter vai para a próxima. Depois da sexta, vem o resumo.',
    'Ponto de gramática novo chega com uma lição curta e um exemplo antes de ser cobrado.',
  ],
  teclas: [
    { teclas: ['1', '2', '3', '4'], faz: 'Encaixar a peça da bandeja' },
    { teclas: ['Enter', 'Espaço'], faz: 'Começar; seguir depois da lição ou da frase pronta; outra rodada' },
    { teclas: ['R'], faz: 'Ouvir a frase (ou o exemplo da lição)' },
    { teclas: ['Esc'], faz: 'Voltar ao menu; no menu, ao fliperama' },
  ],
  elementos: [
    { nome: 'Buraco', texto: 'Onde falta uma peça. No máximo três por frase.' },
    { nome: 'Bandeja', texto: 'Quatro peças: a certa e outras que confundem.' },
    { nome: 'Peça brilhando', texto: 'Aparece depois de duas peças que não serviram. É a certa.' },
    { nome: 'カチッ', texto: 'Peça encaixada.' },
    { nome: 'Pontos', texto: '10 por peça que encaixa de primeira, mais 5 se foi rápida (menos de 3 segundos). Peça que só entrou depois de erro vale 5.' },
    { nome: 'Recorde', texto: 'Seus melhores pontos numa rodada.' },
  ],
  ensina: [
    'São 15 pontos de gramática, do N5 ao começo do N4, nesta ordem: は, の, を, ます/ません, ました, に/へ, で, と, も, が, たい, てください, ています, ない e た.',
    'O próximo ponto destrava depois que você encaixa o anterior de primeira 3 vezes.',
    'Cada ponto é uma carta na memória espaçada. Ponto que você erra volta antes.',
    'Não tem vida nem tempo. Errar só mostra o motivo.',
  ],
  perguntas: [
    { p: 'Por que não aparece ponto novo?', r: 'O próximo só abre depois de você acertar o atual de primeira 3 vezes. Siga jogando as rodadas.' },
    { p: 'Por que に e へ servem no mesmo buraco?', r: 'Para indicar destino (行きます, いきます, ir), as duas funcionam. O jogo aceita qualquer uma.' },
    VOLTOU,
    MEMORIA_UNICA,
    PARAR,
    SAVE,
  ],
};
