/**
 * Tudo que toca no fliperama além das vozes: as trilhas de fundo (uma por clima) e os efeitos.
 * Cada arquivo tem fonte, autor e licença aqui; a tela de créditos e o README leem daqui.
 * Como os arquivos foram escolhidos e cortados: docs/musica.md.
 */

/** Clima da tela: cada um tem uma trilha. */
export type Clima = 'hub' | 'calmo' | 'historia' | 'acao' | 'chefe' | 'vitoria';

export type EfeitoId =
  | 'clique'
  | 'voltar'
  | 'menu'
  | 'acerto'
  | 'rapido'
  | 'erro'
  | 'combo'
  | 'captura'
  | 'raro'
  | 'bau'
  | 'nivel'
  | 'fim'
  | 'transicao'
  | 'carta'
  | 'vitoria'
  | 'taiko';

export type FonteId = 'maou' | 'lab';

export interface Fonte {
  nome: string;
  site: string;
  /** Página com as regras de uso. */
  regras: string;
  /** O que as regras pedem, em uma frase. */
  resumo: string;
  /** Crédito como o autor pede (ou sugere). */
  credito: string;
}

export const FONTES: Record<FonteId, Fonte> = {
  maou: {
    nome: '魔王魂 (Maou Damashii), de 森田交一',
    site: 'https://maou.audio/',
    regras: 'https://maou.audio/rule/',
    resumo: 'Uso livre em jogo, com corte e mudança de andamento. Não pode dizer que fez a música, redistribuir o arquivo solto nem usar IA para arranjar ou treinar.',
    credito: '音楽：魔王魂',
  },
  lab: {
    nome: '効果音ラボ (Sound Effect Lab)',
    site: 'https://soundeffect-lab.info/',
    regras: 'https://soundeffect-lab.info/agreement/',
    resumo: 'Uso livre como som de um app, sem crédito obrigatório. Não pode redistribuir o arquivo solto, linkar direto o arquivo do site deles nem usar para treinar IA.',
    credito: '効果音：効果音ラボ',
  },
};

export interface Trilha {
  titulo: string;
  fonte: FonteId;
  /** Página da faixa original. */
  link: string;
  /** Onde ela toca, para os créditos e o README. */
  onde: string;
}

export const TRILHAS: Record<Clima, Trilha> = {
  hub: { titulo: 'アコースティック27', fonte: 'maou', link: 'https://maou.audio/bgm_acoustic27/', onde: 'Fliperama, Jornada e menus' },
  calmo: { titulo: 'ヒーリング15', fonte: 'maou', link: 'https://maou.audio/bgm_healing15/', onde: 'Lições, modo Ouvir, Kumitate, Memória, Kana em imagens, Kanji em peças e KanjiDex' },
  historia: { titulo: 'アコースティック32', fonte: 'maou', link: 'https://maou.audio/bgm_acoustic32/', onde: 'Aventura e Cena Viva' },
  acao: { titulo: 'ネオロック73', fonte: 'maou', link: 'https://maou.audio/bgm_neorock73/', onde: 'KanjiMon e lutas do Kotodama' },
  chefe: { titulo: '民族33', fonte: 'maou', link: 'https://maou.audio/bgm_ethnic33/', onde: 'Chefe do Kotodama' },
  vitoria: { titulo: 'アコースティック03', fonte: 'maou', link: 'https://maou.audio/bgm_acoustic03/', onde: 'Telas de resultado e vitória' },
};

export interface Efeito {
  /** Nome do som no site de origem. */
  titulo: string;
  fonte: FonteId;
  /** Página da categoria onde o som está. */
  link: string;
  /** Quando toca. */
  quando: string;
}

const LAB_BOTAO = 'https://soundeffect-lab.info/sound/button/';
const LAB_ANIME = 'https://soundeffect-lab.info/sound/anime/';
const LAB_VARIOS = 'https://soundeffect-lab.info/sound/various/';

export const EFEITOS: Record<EfeitoId, Efeito> = {
  clique: { titulo: '決定ボタンを押す22', fonte: 'lab', link: LAB_BOTAO, quando: 'Botão e escolha' },
  voltar: { titulo: 'キャンセル3', fonte: 'lab', link: LAB_BOTAO, quando: 'Fechar menu ou ajuda' },
  menu: { titulo: 'メニューを開く4', fonte: 'lab', link: LAB_BOTAO, quando: 'Abrir Ajustes ou a ajuda' },
  acerto: { titulo: 'キラッ1', fonte: 'lab', link: LAB_ANIME, quando: 'Acerto; sobe de tom com o combo' },
  rapido: { titulo: 'シャキーン3', fonte: 'lab', link: LAB_ANIME, quando: 'Acerto rápido' },
  erro: { titulo: 'ボヨン', fonte: 'lab', link: LAB_ANIME, quando: 'Erro' },
  combo: { titulo: '決定ボタンを押す21', fonte: 'lab', link: LAB_BOTAO, quando: 'A cada 5 acertos seguidos' },
  captura: { titulo: 'きらきら輝く4', fonte: 'lab', link: LAB_ANIME, quando: 'Captura de carta' },
  raro: { titulo: 'ゴゴゴゴ', fonte: 'lab', link: LAB_ANIME, quando: 'Carta rara ou inimigo forte' },
  bau: { titulo: '宝箱を開ける', fonte: 'lab', link: LAB_ANIME, quando: 'Baú e recompensa' },
  nivel: { titulo: 'レベルアップ', fonte: 'lab', link: LAB_ANIME, quando: 'Subir de nível e recorde' },
  fim: { titulo: 'ちゃんちゃん♪1', fonte: 'lab', link: LAB_ANIME, quando: 'Fim de rodada sem vitória' },
  transicao: { titulo: 'シーン切り替え1', fonte: 'lab', link: LAB_ANIME, quando: 'Troca de tela' },
  carta: { titulo: 'カードをめくる', fonte: 'lab', link: LAB_VARIOS, quando: 'Virar carta ou página' },
  vitoria: { titulo: 'ジャジャーン', fonte: 'lab', link: LAB_ANIME, quando: 'Vitória' },
  taiko: { titulo: '和太鼓でドン', fonte: 'lab', link: LAB_ANIME, quando: 'Golpe forte e carta lendária' },
};

export const CLIMAS = Object.keys(TRILHAS) as Clima[];
export const EFEITO_IDS = Object.keys(EFEITOS) as EfeitoId[];
