import { ANTES_DE_COBRAR, MEMORIA_UNICA, PARAR, SAVE, semNovidade, TECLAS_APRESENTA, VOLTOU } from './comum';
import type { Ajuda } from './tipos';

export const KANA_IMAGENS: Ajuda = {
  tela: 'kanaimagens',
  titulo: 'Kana em imagens',
  jp: 'かなの絵',
  objetivo: [
    'Aprender a ler hiragana e katakana pela imagem: cada letra mora dentro de um desenho. し é um anzol, つ é uma onda.',
    'A imagem é a ponte. Com o tempo ela some, e sobra só a letra.',
  ],
  passos: [
    'Enter começa uma rodada de 10 perguntas. Já lê kana? Aperte T no menu: um teste rápido pula o que você já sabe.',
    'Kana novo chega primeiro numa apresentação: a imagem com a letra, o som, uma frase curta e uma palavra de exemplo. Nada é cobrado ali.',
    'Logo depois vem a pergunta, ainda com a imagem: "que letra mora nesta imagem?".',
    'Responda com o número da alternativa. Acertou, a próxima vem sozinha.',
    'Errou, a certa aparece com a imagem e a frase, e ela volta duas perguntas depois. Enter segue.',
    'Conforme a letra firma, a pergunta muda: da letra para a imagem, pares que confundem, só o som e, por fim, palavras inteiras em katakana.',
  ],
  teclas: [
    { teclas: ['Enter', 'Espaço'], faz: 'Começar; seguir depois da apresentação ou de uma resposta' },
    { teclas: ['1', '2', '3', '4'], faz: 'Responder' },
    { teclas: ['1', '2', '3', '4', '5', '6'], faz: 'No menu: treinar um modo só' },
    { teclas: ['T'], faz: 'No menu: teste rápido para quem já lê' },
    { teclas: ['R'], faz: 'Ouvir de novo (no "só pelo som", antes de responder)' },
    { teclas: ['E'], faz: 'Ouvir a palavra de exemplo' },
    TECLAS_APRESENTA,
    { teclas: ['Esc'], faz: 'Voltar ao menu; no menu, ao fliperama' },
  ],
  elementos: [
    { nome: 'Imagem', texto: 'O desenho do kana. A letra fica por cima, no meio. Sem a letra, é a pergunta.' },
    { nome: 'Soa', texto: 'Como o kana soa para quem fala português, quando o romaji engana. Ex.: ふ é um sopro, não o f de "faca".' },
    { nome: 'Não confunda com', texto: 'Kana parecidos. Eles aparecem lado a lado no modo de pares.' },
    { nome: 'Brilho', texto: 'A borda do quadro brilha mais a cada acerto seguido.' },
    { nome: 'Caminho', texto: 'No menu: quanto de cada parte você já viu (barra clara) e quanto já está firme (barra escura).' },
    { nome: 'Modos', texto: '1 aprender, 2 imagem → letra, 3 letra → imagem, 4 pares que confundem, 5 só pelo som, 6 leitura relâmpago de palavras. Os que ainda não têm o que perguntar ficam apagados.' },
  ],
  ensina: [
    'A ordem vai do básico ao mais denso: hiragana, hiragana com tenten e maru, combinados (きゃ) e っ; depois o mesmo em katakana, com ー, e os sons de fora (ファ, ティ, ヴ).',
    'No máximo três kana novos por rodada. A parte seguinte abre quando cada kana da atual foi acertado de primeira duas vezes.',
    'Cada kana é uma carta na memória espaçada, a mesma do Kana Beat. O que você erra volta antes.',
    'Não tem vida nem tempo. Responder rápido só dá um pouco mais de XP.',
  ],
  perguntas: [
    ANTES_DE_COBRAR,
    { p: 'Por que a imagem tem a letra por cima?', r: 'É o ponto da memória visual: ver o anzol e a letra し no mesmo lugar. Depois de algumas vezes você vê し e lembra do anzol, e daí do som.' },
    { p: 'Eu já leio kana. Preciso passar por tudo?', r: 'Não. Aperte T no menu. O teste mostra quatro letras de cada parte; acertou três, a parte inteira conta como sabida e só volta para revisar.' },
    { p: 'Por que ん aparece como "n, m ou ng"?', r: 'Porque o som muda conforme a letra seguinte: さんぽ soa "sampo", てんき soa "tenki" com um "ng".' },
    semNovidade('12 kana ainda moles'),
    VOLTOU,
    MEMORIA_UNICA,
    PARAR,
    SAVE,
  ],
};
