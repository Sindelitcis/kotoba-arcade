/**
 * Como se lê cada kanji quando ele aparece sozinho na carta.
 *
 * O KanjiMon falava a primeira palavra de exemplo (九 virava 九月, くがつ) com só o 九 na
 * tela, e quem ouvia aprendia que 九 se lê "kugatsu". Agora a carta fala a leitura do
 * próprio kanji, e o exemplo aparece escrito com a leitura dele.
 *
 * Regra da escolha, conferida kanji por kanji:
 * - Kanji que é palavra sozinho usa essa palavra, a forma que um japonês diria: 山 = やま,
 *   人 = ひと, 九 = きゅう (contando: いち, に, さん, よん, ご…).
 * - Kanji que quase nunca aparece sozinho (休, 週, 校…) usa a leitura mais frequente nas
 *   palavras do dia a dia, quase sempre a on'yomi: 休 = きゅう (休日), 週 = しゅう (今週).
 * - Números seguem a contagem mais comum hoje: 四 = よん e 七 = なな, não し e しち.
 *
 * `outras` lista as leituras que aparecem nas palavras do jogo, para a pessoa não
 * estranhar quando o mesmo kanji soar diferente dentro de uma palavra.
 */
export interface LeituraKanji {
  /** Leitura falada e mostrada quando o kanji aparece sozinho. */
  sozinho: string;
  /** Outras leituras comuns, na ordem em que mais aparecem. */
  outras: string[];
}

export const LEITURAS: Readonly<Record<string, LeituraKanji>> = {
  一: { sozinho: 'いち', outras: ['ひと', 'いっ'] },
  二: { sozinho: 'に', outras: ['ふた'] },
  三: { sozinho: 'さん', outras: ['み'] },
  四: { sozinho: 'よん', outras: ['よ', 'し'] },
  五: { sozinho: 'ご', outras: ['いつ'] },
  六: { sozinho: 'ろく', outras: ['む', 'ろっ'] },
  七: { sozinho: 'なな', outras: ['しち', 'なの'] },
  八: { sozinho: 'はち', outras: ['や', 'よう'] },
  九: { sozinho: 'きゅう', outras: ['く', 'ここの'] },
  十: { sozinho: 'じゅう', outras: ['とお', 'じゅっ'] },
  百: { sozinho: 'ひゃく', outras: ['びゃく', 'ぴゃく'] },
  千: { sozinho: 'せん', outras: ['ぜん', 'ち'] },
  万: { sozinho: 'まん', outras: ['ばん'] },
  円: { sozinho: 'えん', outras: ['まる'] },
  日: { sozinho: 'ひ', outras: ['にち', 'び', 'か', 'に'] },
  月: { sozinho: 'つき', outras: ['げつ', 'がつ'] },
  火: { sozinho: 'ひ', outras: ['か', 'び'] },
  水: { sozinho: 'みず', outras: ['すい'] },
  木: { sozinho: 'き', outras: ['もく'] },
  金: { sozinho: 'きん', outras: ['かね', 'こん'] },
  土: { sozinho: 'つち', outras: ['ど', 'と'] },
  山: { sozinho: 'やま', outras: ['さん', 'ざん'] },
  川: { sozinho: 'かわ', outras: ['がわ', 'せん'] },
  天: { sozinho: 'てん', outras: ['あま'] },
  空: { sozinho: 'そら', outras: ['くう', 'あ', 'す'] },
  雨: { sozinho: 'あめ', outras: ['あま', 'う'] },
  花: { sozinho: 'はな', outras: ['ばな', 'か'] },
  人: { sozinho: 'ひと', outras: ['じん', 'にん'] },
  男: { sozinho: 'おとこ', outras: ['だん', 'なん'] },
  女: { sozinho: 'おんな', outras: ['じょ', 'にょ'] },
  子: { sozinho: 'こ', outras: ['し', 'す'] },
  目: { sozinho: 'め', outras: ['もく'] },
  口: { sozinho: 'くち', outras: ['ぐち', 'こう'] },
  耳: { sozinho: 'みみ', outras: ['じ'] },
  手: { sozinho: 'て', outras: ['しゅ'] },
  足: { sozinho: 'あし', outras: ['そく', 'た'] },
  父: { sozinho: 'ちち', outras: ['とう', 'ふ'] },
  母: { sozinho: 'はは', outras: ['かあ', 'ぼ'] },
  上: { sozinho: 'うえ', outras: ['じょう', 'うわ', 'のぼ'] },
  下: { sozinho: 'した', outras: ['か', 'げ', 'くだ'] },
  左: { sozinho: 'ひだり', outras: ['さ'] },
  右: { sozinho: 'みぎ', outras: ['う', 'ゆう'] },
  中: { sozinho: 'なか', outras: ['ちゅう', 'じゅう'] },
  前: { sozinho: 'まえ', outras: ['ぜん'] },
  後: { sozinho: 'あと', outras: ['ご', 'うし', 'こう'] },
  外: { sozinho: 'そと', outras: ['がい', 'ほか'] },
  北: { sozinho: 'きた', outras: ['ほく', 'ぼく', 'ほっ'] },
  南: { sozinho: 'みなみ', outras: ['なん'] },
  東: { sozinho: 'ひがし', outras: ['とう'] },
  西: { sozinho: 'にし', outras: ['さい', 'せい'] },
  年: { sozinho: 'とし', outras: ['ねん'] },
  休: { sozinho: 'きゅう', outras: ['やす'] },
  今: { sozinho: 'いま', outras: ['こん', 'きょう', 'こ'] },
  週: { sozinho: 'しゅう', outras: [] },
  時: { sozinho: 'とき', outras: ['じ'] },
  間: { sozinho: 'あいだ', outras: ['かん', 'ま'] },
  半: { sozinho: 'はん', outras: [] },
  大: { sozinho: 'だい', outras: ['おお', 'たい'] },
  小: { sozinho: 'しょう', outras: ['ちい', 'こ'] },
  高: { sozinho: 'こう', outras: ['たか'] },
  安: { sozinho: 'あん', outras: ['やす'] },
  新: { sozinho: 'しん', outras: ['あたら'] },
  古: { sozinho: 'こ', outras: ['ふる'] },
  長: { sozinho: 'ちょう', outras: ['なが'] },
  多: { sozinho: 'た', outras: ['おお'] },
  少: { sozinho: 'しょう', outras: ['すく', 'すこ'] },
  白: { sozinho: 'しろ', outras: ['はく', 'しら'] },
  学: { sozinho: 'がく', outras: ['まな', 'がっ'] },
  校: { sozinho: 'こう', outras: [] },
  見: { sozinho: 'けん', outras: ['み'] },
  食: { sozinho: 'しょく', outras: ['た'] },
  飲: { sozinho: 'いん', outras: ['の'] },
  行: { sozinho: 'こう', outras: ['い', 'ぎょう'] },
  来: { sozinho: 'らい', outras: ['く', 'き', 'こ'] },
  語: { sozinho: 'ご', outras: [] },
  立: { sozinho: 'りつ', outras: ['た'] },
  生: { sozinho: 'せい', outras: ['なま', 'い', 'しょう'] },
  話: { sozinho: 'はなし', outras: ['わ', 'はな'] },
  読: { sozinho: 'どく', outras: ['よ'] },
  書: { sozinho: 'しょ', outras: ['か'] },
  買: { sozinho: 'ばい', outras: ['か'] },
  入: { sozinho: 'にゅう', outras: ['い', 'はい'] },
  出: { sozinho: 'しゅつ', outras: ['で', 'だ', 'しゅっ'] },
  友: { sozinho: 'とも', outras: ['ゆう'] },
  車: { sozinho: 'くるま', outras: ['しゃ'] },
  電: { sozinho: 'でん', outras: [] },
  気: { sozinho: 'き', outras: ['け'] },
  本: { sozinho: 'ほん', outras: ['ぽん', 'ぼん', 'もと'] },
  何: { sozinho: 'なに', outras: ['なん'] },
  名: { sozinho: 'な', outras: ['めい', 'みょう'] },
  駅: { sozinho: 'えき', outras: [] },
  店: { sozinho: 'みせ', outras: ['てん'] },
  道: { sozinho: 'みち', outras: ['どう'] },
  国: { sozinho: 'くに', outras: ['こく', 'ごく', 'こっ'] },
};
