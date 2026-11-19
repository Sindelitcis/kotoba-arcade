/**
 * Vozes gravadas do fliperama (ver docs/vozes.md).
 *
 * Frases: AivisSpeech (Style-Bert-VITS2 JP-Extra), modelos do AivisHub sob a ACML 1.0,
 * que permite publicar o áudio; o crédito é opcional, mas fica registrado.
 * Palavras soltas e kana: VOICEVOX 四国めたん, que se entende melhor em palavra curta.
 * A licença dela pede o crédito "VOICEVOX:四国めたん".
 * Nomes e créditos de cada voz estão no README e em docs/vozes.md (aqui o kanji deles
 * sairia fora do recorte das fontes).
 */
export interface Voz {
  motor: 'aivis' | 'voicevox';
  /** Modelo no AivisHub (só AivisSpeech). */
  modelo?: string;
  /** Id do estilo na API do motor. */
  estilo: number;
}

export const VOZES = {
  mao: {
    motor: 'aivis',
    modelo: 'a59cb814-0083-4369-8542-f51a29e72af7',
    estilo: 888753760,
  },
  kohaku: {
    motor: 'aivis',
    modelo: '22e8ed77-94fe-4ef2-871f-a86f94e9a579',
    estilo: 1878365376,
  },
  mai: {
    motor: 'aivis',
    modelo: 'e9339137-2ae3-4d41-9394-fb757a7e61e6',
    estilo: 1431611904,
  },
  nise: {
    motor: 'aivis',
    modelo: '6d11c6c2-f4a4-4435-887e-23dd60f8b8dd',
    estilo: 1937616896,
  },
  aida: {
    motor: 'aivis',
    modelo: '47e53151-a378-46f3-abee-ce13aa07feb1',
    estilo: 1310138976,
  },
  metan: {
    motor: 'voicevox',
    estilo: 2,
  },
} as const satisfies Record<string, Voz>;

export type VozId = keyof typeof VOZES;

/** Voz das frases sem personagem e do jogador na Aventura. */
export const VOZ_PADRAO: VozId = 'mao';

/** Voz das palavras soltas e dos kana: precisa ser entendida numa palavra de duas moras. */
export const VOZ_PALAVRA: VozId = 'metan';

/** Voz de cada personagem da Aventura. Quem não está aqui (o jogador) usa a voz padrão. */
export const VOZ_AVENTURA: Readonly<Record<string, VozId>> = {
  fiscal: 'aida',
  funcionaria: 'kohaku',
  atendente: 'nise',
  aviso: 'mai',
  senhora: 'mai',
  balconista: 'nise',
};

/** Voz de cada personagem da Conversa (mesmos nomes de `cena.personagem.voz`). */
export const VOZ_CONVERSA: Readonly<Record<string, VozId>> = {
  sakura: 'kohaku',
  yui: 'mai',
  takeshi: 'nise',
  tanaka: 'aida',
};

/** Voz de quem fala na Aventura (sem `who` ou desconhecido: a voz padrão). */
export function vozDaAventura(who: string | undefined): VozId {
  return (who !== undefined && VOZ_AVENTURA[who]) || VOZ_PADRAO;
}
