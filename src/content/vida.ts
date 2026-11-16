/**
 * Vocabulário do dia a dia que não está nos 94 kanji do KanjiMon: o que se ouve
 * em aeroporto, estação, loja. Mesmo formato de `Word`, mesmas chaves de carta
 * (`w:palavra#meaning`), então a memória é a mesma dos outros jogos.
 */
import { KANJI, WORDS, type Word } from './index';
import { kanaToRomaji } from '../core/kana';

/** [como se escreve, leitura em kana, significado] */
const RAW: readonly (readonly [string, string, string])[] = [
  // Chegada
  ['次', 'つぎ', 'próximo'],
  ['どうぞ', 'どうぞ', 'pode vir / aqui está'],
  ['こんにちは', 'こんにちは', 'olá, boa tarde'],
  ['パスポート', 'パスポート', 'passaporte'],
  ['お願いします', 'おねがいします', 'por favor (pedindo algo)'],
  ['ありがとうございます', 'ありがとうございます', 'obrigado'],
  ['すみません', 'すみません', 'com licença / desculpe'],
  ['もう一度', 'もういちど', 'mais uma vez'],
  ['ゆっくり', 'ゆっくり', 'devagar'],
  ['分かる', 'わかる', 'entender'],
  ['どこ', 'どこ', 'onde'],
  ['から', 'から', 'de (ponto de partida)'],
  ['まで', 'まで', 'até'],
  ['ブラジル', 'ブラジル', 'Brasil'],
  ['観光', 'かんこう', 'turismo'],
  ['ワーキングホリデー', 'ワーキングホリデー', 'working holiday'],
  ['どのくらい', 'どのくらい', 'quanto (tempo)'],
  ['一年', 'いちねん', 'um ano'],
  ['ようこそ', 'ようこそ', 'bem-vindo'],
  ['食べ物', 'たべもの', 'comida'],
  ['駅', 'えき', 'estação'],
  ['地下', 'ちか', 'subsolo'],
  ['下', 'した', 'embaixo'],
  ['エスカレーター', 'エスカレーター', 'escada rolante'],
  ['トイレ', 'トイレ', 'banheiro'],
  ['あちら', 'あちら', 'ali, naquela direção'],
  ['気をつけて', 'きをつけて', 'vá com cuidado'],
  // Estação
  ['いらっしゃいませ', 'いらっしゃいませ', 'bem-vindo (em loja ou guichê)'],
  ['一枚', 'いちまい', 'um (bilhete, folha)'],
  ['切符', 'きっぷ', 'bilhete'],
  ['ここ', 'ここ', 'aqui'],
  ['預かる', 'あずかる', 'receber para guardar (dinheiro no caixa)'],
  ['お返し', 'おかえし', 'troco'],
  ['一番線', 'いちばんせん', 'plataforma 1'],
  ['ホーム', 'ホーム', 'plataforma'],
  ['まもなく', 'まもなく', 'em instantes'],
  ['遠い', 'とおい', 'longe'],
  ['まだまだ', 'まだまだ', 'ainda falta muito'],
  // Konbini
  ['いくら', 'いくら', 'quanto custa'],
  ['今', 'いま', 'agora'],
  ['飲む', 'のむ', 'beber'],
  ['飲み物', 'のみもの', 'bebida'],
  ['お弁当', 'おべんとう', 'bentô (marmita)'],
  ['温める', 'あたためる', 'esquentar'],
  ['食べる', 'たべる', 'comer'],
  ['レンジ', 'レンジ', 'micro-ondas'],
  ['袋', 'ふくろ', 'sacola'],
  ['利用', 'りよう', 'uso'],
  ['要る', 'いる', 'precisar'],
  ['全部', 'ぜんぶ', 'tudo'],
  ['カード', 'カード', 'cartão'],
];

const known = new Set(KANJI.map((k) => k.kanji));

export const DAILY_WORDS: readonly Word[] = RAW.map(([jp, kana, pt]) => ({
  id: `w:${jp}`,
  jp,
  kana,
  romaji: kanaToRomaji(kana),
  pt,
  kanji: [...jp].filter((c) => known.has(c)),
}));

const byId = new Map<string, Word>([...DAILY_WORDS, ...WORDS].map((w) => [w.id, w]));

/** Procura uma palavra no conteúdo todo (KanjiMon + dia a dia). */
export function findWord(id: string): Word | undefined {
  return byId.get(id);
}
