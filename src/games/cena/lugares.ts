/**
 * Os lugares da Cena Viva. Cada um é um fundo (src/assets/lugares) com coisas por cima.
 *
 * As coisas são montadas umas em relação às outras: `sobre` põe em cima (上), `sob` embaixo (下),
 * `lado` ao lado (横), `frente` na frente (前) e `dentro` dentro (中). A posição sai da medida
 * real de cada imagem, então "o livro em cima da mesa" fica mesmo em cima da mesa.
 * As instruções saem desses dados (engine.ts): não tem frase escrita à mão aqui.
 */
import { medida } from '../../content/medidas';
import type { Coisa, Lugar } from './engine';

/** Onde fica a superfície de apoio de cada móvel, em fração da altura contada do topo. */
const TAMPO: Readonly<Record<string, number>> = {
  teburu: 0.08,
  tsukue: 0.06,
  tana: 0.03,
  hondana: 0.02,
  beddo: 0.42,
  sofa: 0.45,
  benchi: 0.42,
  isu: 0.48,
  reji: 0.05,
  reizouko: 0.02,
  kopiki: 0.04,
  jihanki: 0.02,
  hako: 0.04,
  suutsukesu: 0.04,
};

/** Prateleiras abertas: base de cada nível, em fração da altura contada do topo. */
const NIVEIS: Readonly<Record<string, readonly number[]>> = {
  tana: [0.37, 0.57, 0.77],
  hondana: [0.3, 0.58, 0.85],
};

/** Recipientes: o que está dentro aparece saindo pela boca (desenhado atrás). */
const BOCA: Readonly<Record<string, number>> = { kago: 0.45, fukuro: 0.4, hako: 0.4, gomibako: 0.4, nabe: 0.5 };

type Extra = Partial<Pick<Coisa, 'z' | 'vira'>>;

class Montador {
  readonly coisas: Coisa[] = [];
  constructor(private readonly prop: number) {}

  /** Altura em % da cena. */
  altura(img: string, w: number): number {
    const m = medida(img);
    return w * (m.h / m.w) * this.prop;
  }

  private pega(id: string): Coisa {
    const c = this.coisas.find((x) => x.id === id);
    if (!c) throw new Error(`coisa de referência ainda não existe: ${id}`);
    return c;
  }

  private z(c: Coisa): number {
    return c.z ?? Math.round(c.y * 10);
  }

  private add(c: Coisa): this {
    if (this.coisas.some((x) => x.id === c.id)) throw new Error(`id repetido: ${c.id}`);
    this.coisas.push(c);
    return this;
  }

  /** No chão (ou na parede), com a base em `y`. */
  chao(id: string, img: string, x: number, y: number, w: number, e: Extra = {}): this {
    return this.add({ id, img, x, y, w, ...e });
  }

  /** Em cima de `pai`, a `fx` (0 a 1) da largura dele. */
  sobre(id: string, img: string, pai: string, fx: number, w: number, e: Extra = {}): this {
    const p = this.pega(pai);
    const topo = p.y - this.altura(p.img, p.w) * (1 - (TAMPO[p.img] ?? 0.08));
    return this.add({ id, img, x: p.x + (fx - 0.5) * p.w, y: topo, w, rel: 'ue', de: pai, z: this.z(p) + 2, ...e });
  }

  /** Embaixo de `pai` (no chão, entre os pés), desenhado atrás dele. */
  sob(id: string, img: string, pai: string, fx: number, w: number, e: Extra = {}): this {
    const p = this.pega(pai);
    return this.add({ id, img, x: p.x + (fx - 0.5) * p.w, y: p.y - 0.8, w, rel: 'shita', de: pai, z: this.z(p) - 1, ...e });
  }

  /** Ao lado de `pai`, à esquerda (-1) ou à direita (1), no mesmo chão. */
  lado(id: string, img: string, pai: string, lado: -1 | 1, w: number, e: Extra = {}): this {
    const p = this.pega(pai);
    return this.add({ id, img, x: p.x + lado * (p.w / 2 + w / 2 + 0.8), y: p.y, w, rel: 'yoko', de: pai, ...e });
  }

  /** Na frente de `pai`: um pouco mais para baixo na tela e desenhado por cima. */
  frente(id: string, img: string, pai: string, fx: number, w: number, e: Extra = {}): this {
    const p = this.pega(pai);
    return this.add({ id, img, x: p.x + (fx - 0.5) * p.w, y: Math.min(99, p.y + 3), w, rel: 'mae', de: pai, z: this.z(p) + 40, ...e });
  }

  /** Dentro de `pai`: no nível `nivel` de uma prateleira, ou saindo pela boca de um recipiente. */
  dentro(id: string, img: string, pai: string, fx: number, w: number, nivel = 0, e: Extra = {}): this {
    const p = this.pega(pai);
    const h = this.altura(p.img, p.w);
    const niveis = NIVEIS[p.img];
    if (niveis) {
      const base = niveis[nivel];
      if (base === undefined) throw new Error(`${pai} não tem nível ${nivel}`);
      return this.add({ id, img, x: p.x + (fx - 0.5) * p.w, y: p.y - h * (1 - base), w, rel: 'naka', de: pai, z: this.z(p) + 2, ...e });
    }
    const boca = BOCA[p.img] ?? 0.4;
    return this.add({ id, img, x: p.x + (fx - 0.5) * p.w, y: p.y - h * (1 - boca) + h * 0.35, w, rel: 'naka', de: pai, z: this.z(p) - 1, ...e });
  }
}

function lugar(id: string, jp: string, kana: string, pt: string, montar: (m: Montador) => void): Lugar {
  const fundo = id;
  const md = medida(fundo);
  const m = new Montador(md.w / md.h);
  montar(m);
  return { id, fundo, jp, kana, pt, coisas: m.coisas };
}

export const LUGARES: readonly Lugar[] = [
  lugar('konbini', 'コンビニ', 'コンビニ', 'loja de conveniência', (m) => {
    m.chao('tana1', 'tana', 20, 90, 26)
      .dentro('onigiri1', 'onigiri', 'tana1', 0.2, 5, 0)
      .dentro('onigiri2', 'onigiri', 'tana1', 0.42, 5, 0)
      .dentro('onigiri3', 'onigiri', 'tana1', 0.64, 5, 0)
      .dentro('sando1', 'sandoitchi', 'tana1', 0.85, 5, 0)
      .dentro('pan1', 'pan', 'tana1', 0.25, 8, 1)
      .dentro('okashi1', 'okashi', 'tana1', 0.62, 6, 1)
      .dentro('okashi2', 'okashi', 'tana1', 0.85, 6, 1)
      .dentro('cup1', 'cupramen', 'tana1', 0.25, 5, 2)
      .dentro('cup2', 'cupramen', 'tana1', 0.5, 5, 2)
      .dentro('denchi1', 'denchi', 'tana1', 0.78, 5, 2)
      .sobre('okashi3', 'okashi', 'tana1', 0.3, 6)
      .sobre('pan2', 'pan', 'tana1', 0.72, 7)
      .chao('tana2', 'tana', 50, 90, 26)
      .dentro('mizu1', 'mizu', 'tana2', 0.15, 3.5, 0)
      .dentro('mizu2', 'mizu', 'tana2', 0.3, 3.5, 0)
      .dentro('mizu3', 'mizu', 'tana2', 0.45, 3.5, 0)
      .dentro('ocha1', 'ocha', 'tana2', 0.7, 4.5, 0)
      .dentro('koohii1', 'koohii', 'tana2', 0.15, 3, 1)
      .dentro('koohii2', 'koohii', 'tana2', 0.35, 3, 1)
      .dentro('koohii3', 'koohii', 'tana2', 0.55, 3, 1)
      .dentro('koohii4', 'koohii', 'tana2', 0.75, 3, 1)
      .dentro('gyunyu1', 'gyunyu', 'tana2', 0.25, 5, 2)
      .dentro('jusu1', 'jusu', 'tana2', 0.55, 4, 2)
      .dentro('aisu1', 'aisu', 'tana2', 0.8, 4, 2)
      .chao('teburu1', 'teburu', 82, 88, 24)
      .sobre('reji1', 'reji', 'teburu1', 0.6, 11)
      .sobre('fukuro1', 'fukuro', 'teburu1', 0.2, 7)
      .frente('kau1', 'kau', 'teburu1', 0.25, 10)
      .chao('kago1', 'kago', 38, 97, 11)
      .dentro('kasa1', 'kasa-aka', 'kago1', 0.35, 3)
      .dentro('kasa2', 'kasa-ao', 'kago1', 0.6, 3)
      .chao('kago2', 'kago', 66, 96, 7)
      .lado('kasa3', 'kasa-aka', 'tana2', 1, 3)
      .chao('yomu1', 'yomu', 6, 98, 10);
  }),

  lugar('eki', '駅', 'えき', 'estação de trem', (m) => {
    m.chao('densha1', 'densha', 22, 46, 34, { z: 1 })
      .chao('benchi1', 'benchi', 22, 88, 22)
      .sobre('kaban1', 'kaban-kuro', 'benchi1', 0.25, 6)
      .sobre('kaban4', 'kaban-aka', 'benchi1', 0.45, 5)
      .sobre('hon1', 'hon', 'benchi1', 0.75, 5)
      .sob('kaban2', 'kaban-aka', 'benchi1', 0.5, 6)
      .chao('benchi2', 'benchi', 56, 90, 22)
      .sobre('neru1', 'neru', 'benchi2', 0.5, 18)
      .sob('kaban3', 'kaban-kuro', 'benchi2', 0.3, 6)
      .chao('jihanki1', 'jihanki', 84, 86, 13)
      .lado('gomibako1', 'gomibako', 'jihanki1', -1, 5)
      .frente('nomu1', 'nomu', 'jihanki1', 0.4, 9)
      .chao('tokei1', 'tokei', 58, 30, 7)
      .chao('suutsukesu1', 'suutsukesu', 40, 96, 8)
      .lado('ryukku1', 'ryukku', 'suutsukesu1', 1, 6)
      .chao('kiku1', 'kiku', 8, 97, 9)
      .chao('denwa1', 'denwasuru', 72, 99, 9)
      .chao('kasa1', 'kasa-ao', 33, 99, 3)
      .chao('kasa2', 'kasa-kuro', 47, 99, 3)
      .chao('kasa3', 'kasa-ao', 93, 99, 3)
      .chao('tori1', 'tori', 70, 22, 4)
      .chao('tori2', 'tori', 76, 22, 2.5)
      .chao('chizu1', 'chizu', 71, 52, 6);
  }),

  lugar('heya', '部屋', 'へや', 'quarto', (m) => {
    m.chao('beddo1', 'beddo', 24, 92, 34)
      .sobre('makura1', 'makura', 'beddo1', 0.18, 8)
      .sobre('neko1', 'neko', 'beddo1', 0.55, 7)
      .sobre('nuigurumi1', 'nuigurumi', 'beddo1', 0.82, 6)
      .sob('kutsushita1', 'kutsushita', 'beddo1', 0.6, 5)
      .sob('hako1', 'hako', 'beddo1', 0.3, 8)
      .sob('kutsu2', 'kutsu-aka', 'beddo1', 0.82, 5)
      .sob('kutsu3', 'kutsu-kuro', 'beddo1', 0.95, 5)
      .sobre('hon6', 'hon', 'beddo1', 0.36, 7)
      .chao('tsukue1', 'tsukue', 66, 90, 24)
      .sobre('pasokon1', 'pasokon', 'tsukue1', 0.3, 9)
      .sobre('hon1', 'hon', 'tsukue1', 0.62, 4)
      .sobre('hon2', 'hon', 'tsukue1', 0.72, 4)
      .sobre('sutando1', 'sutando', 'tsukue1', 0.9, 5)
      .sobre('megane1', 'megane', 'tsukue1', 0.5, 4)
      .chao('isu1', 'isu', 52, 97, 10)
      .sobre('boushi1', 'boushi-aka', 'isu1', 0.5, 5)
      .sob('kaban1', 'kaban-ao', 'tsukue1', 0.25, 7)
      .chao('hondana1', 'hondana', 86, 90, 22)
      .dentro('hon3', 'hon', 'hondana1', 0.22, 2.5, 0)
      .dentro('hon4', 'hon', 'hondana1', 0.32, 2.5, 0)
      .dentro('hon5', 'hon', 'hondana1', 0.42, 2.5, 0)
      .dentro('tokei1', 'tokei', 'hondana1', 0.32, 4, 1)
      .dentro('shashin1', 'shashin', 'hondana1', 0.32, 4, 2)
      .chao('gita1', 'gita', 44, 92, 7)
      .chao('gomibako1', 'gomibako', 68, 97, 5)
      .chao('eakon1', 'eakon', 30, 20, 16)
      .chao('kagami1', 'kagami', 4, 90, 8)
      .chao('boushi2', 'boushi-kuro', 8, 99, 5)
      .chao('kutsu1', 'kutsu-shiro', 13, 99, 6)
      .chao('kutsu4', 'kutsu-aka', 19, 99, 6)
      .chao('kiku1', 'kiku', 38, 99, 9);
  }),

  lugar('jimusho', '事務所', 'じむしょ', 'escritório', (m) => {
    m.chao('tsukue1', 'tsukue', 22, 88, 26)
      .sobre('pasokon1', 'pasokon', 'tsukue1', 0.35, 9)
      .sobre('denwa1', 'denwa', 'tsukue1', 0.75, 6)
      .sobre('fairu1', 'fairu', 'tsukue1', 0.1, 4)
      .sob('kaban1', 'kaban-kuro', 'tsukue1', 0.7, 6)
      .sob('kaban2', 'kaban-ao', 'tsukue1', 0.88, 6)
      .sobre('pen4', 'pen', 'tsukue1', 0.58, 4)
      .chao('isu1', 'isu', 14, 98, 10)
      .sobre('kaban3', 'kaban-kuro', 'isu1', 0.5, 9)
      .chao('tsukue2', 'tsukue', 58, 88, 26)
      .sobre('pen1', 'pen', 'tsukue2', 0.15, 4)
      .sobre('pen2', 'pen', 'tsukue2', 0.25, 4)
      .sobre('pen3', 'pen', 'tsukue2', 0.35, 4)
      .sobre('hotchikisu1', 'hotchikisu', 'tsukue2', 0.55, 5)
      .sobre('kappu1', 'kappu', 'tsukue2', 0.75, 4)
      .sobre('noto1', 'noto', 'tsukue2', 0.9, 4)
      .sob('gomibako1', 'gomibako', 'tsukue2', 0.4, 5)
      .frente('kaku1', 'kaku', 'tsukue2', 0.7, 11)
      .chao('kopiki1', 'kopiki', 88, 90, 14)
      .sobre('fairu2', 'fairu', 'kopiki1', 0.3, 4)
      .sobre('fairu3', 'fairu', 'kopiki1', 0.6, 4)
      .lado('kanyo1', 'kanyoshokubutsu', 'kopiki1', -1, 7)
      .chao('howaito1', 'howaitobodo', 40, 70, 14, { z: 5 })
      .chao('karenda1', 'karenda', 66, 46, 6)
      .chao('tokei1', 'tokei', 50, 30, 5)
      .chao('denwasuru1', 'denwasuru', 34, 99, 9)
      .chao('kasa1', 'kasa-kuro', 4, 99, 3)
      .chao('kasa2', 'kasa-ao', 7, 99, 3)
      .sobre('nekutai1', 'nekutai', 'kopiki1', 0.85, 3);
  }),

  lugar('daidokoro', '台所', 'だいどころ', 'cozinha', (m) => {
    m.chao('reizouko1', 'reizouko', 10, 90, 14)
      .sobre('denshirenji1', 'denshirenji', 'reizouko1', 0.5, 11)
      .chao('teburu1', 'teburu', 48, 92, 34)
      .sobre('ringo1', 'ringo', 'teburu1', 0.1, 3.5)
      .sobre('ringo2', 'ringo', 'teburu1', 0.18, 3.5)
      .sobre('ringo3', 'ringo', 'teburu1', 0.26, 3.5)
      .sobre('sara1', 'sara', 'teburu1', 0.42, 6)
      .sobre('chawan1', 'chawan', 'teburu1', 0.55, 4)
      .sobre('hashi1', 'hashi', 'teburu1', 0.64, 4)
      .sobre('koppu1', 'koppu', 'teburu1', 0.74, 3)
      .sobre('nabe1', 'nabe', 'teburu1', 0.9, 8)
      .sob('neko1', 'neko', 'teburu1', 0.5, 6)
      .chao('isu1', 'isu', 26, 98, 10)
      .sobre('kaban2', 'kaban-aka', 'isu1', 0.5, 6)
      .sob('kaban3', 'kaban-shiro', 'teburu1', 0.15, 6)
      .sob('kaban4', 'kaban-aka', 'teburu1', 0.82, 6)
      .chao('kago1', 'kago', 76, 97, 10)
      .dentro('ringo4', 'ringo', 'kago1', 0.35, 3)
      .dentro('ringo5', 'ringo', 'kago1', 0.65, 2)
      .lado('kyabetsu1', 'kyabetsu', 'kago1', 1, 6)
      .chao('ryouri1', 'ryouri', 88, 92, 13)
      .chao('suihanki1', 'suihanki', 70, 52, 6)
      .chao('yakan1', 'yakan', 79, 56, 5)
      .chao('furaipan1', 'furaipan', 62, 49, 6)
      .chao('teburu2', 'teburu', 30, 76, 20, { z: 300 })
      .sobre('manaita1', 'manaita', 'teburu2', 0.3, 6)
      .sobre('houchou1', 'houchou', 'teburu2', 0.48, 2.5)
      .sobre('tamago1', 'tamago', 'teburu2', 0.62, 2)
      .sobre('tamago2', 'tamago', 'teburu2', 0.72, 3)
      .sobre('ninjin1', 'ninjin', 'teburu2', 0.12, 4)
      .sobre('tomato1', 'tomato', 'teburu2', 0.88, 3)
      .chao('banana1', 'banana', 86, 61, 5)
      .chao('gyunyu1', 'gyunyu', 20, 99, 4)
      .chao('kaban1', 'kaban-shiro', 4, 99, 6);
  }),

  lugar('yakkyoku', '薬局', 'やっきょく', 'farmácia', (m) => {
    m.chao('tana1', 'tana', 22, 90, 28)
      .dentro('kusuri1', 'kusuri', 'tana1', 0.2, 5, 0)
      .dentro('kusuri2', 'kusuri', 'tana1', 0.45, 5, 0)
      .dentro('kusuri3', 'kusuri', 'tana1', 0.75, 4, 0)
      .dentro('masuku1', 'masuku', 'tana1', 0.25, 6, 1)
      .dentro('taionkei1', 'taionkei', 'tana1', 0.55, 1.5, 1)
      .dentro('sekken2', 'sekken', 'tana1', 0.8, 4, 1)
      .dentro('houtai1', 'houtai', 'tana1', 0.25, 4, 2)
      .dentro('houtai2', 'houtai', 'tana1', 0.45, 4, 2)
      .dentro('tisshu1', 'tisshu', 'tana1', 0.75, 6, 2)
      .sobre('tisshu2', 'tisshu', 'tana1', 0.3, 6)
      .chao('tana2', 'tana', 54, 90, 28)
      .dentro('shanpu1', 'shanpu', 'tana2', 0.2, 3.5, 0)
      .dentro('shanpu2', 'shanpu', 'tana2', 0.35, 3.5, 0)
      .dentro('shanpu3', 'shanpu', 'tana2', 0.5, 3.5, 0)
      .dentro('sekken1', 'sekken', 'tana2', 0.75, 4, 0)
      .dentro('haburashi3', 'haburashi', 'tana2', 0.3, 4, 1)
      .dentro('haburashi1', 'haburashi', 'tana2', 0.6, 4, 1)
      .dentro('haburashi2', 'haburashi', 'tana2', 0.75, 4, 1)
      .dentro('taoru1', 'taoru', 'tana2', 0.4, 7, 2)
      .chao('teburu1', 'teburu', 84, 88, 24)
      .sobre('reji1', 'reji', 'teburu1', 0.65, 10)
      .sobre('fukuro1', 'fukuro', 'teburu1', 0.2, 6)
      .frente('kau1', 'kau', 'teburu1', 0.3, 10)
      .chao('kago1', 'kago', 40, 98, 9)
      .dentro('masuku2', 'masuku', 'kago1', 0.35, 5)
      .dentro('masuku3', 'masuku', 'kago1', 0.68, 3.5)
      .chao('naku1', 'naku', 6, 98, 9)
      .chao('kasa1', 'kasa-ao', 70, 99, 3)
      .chao('kasa2', 'kasa-aka', 73, 99, 3);
  }),

  lugar('resutoran', 'レストラン', 'レストラン', 'restaurante', (m) => {
    m.chao('teburu1', 'teburu', 26, 92, 32)
      .sobre('ramen1', 'ramen', 'teburu1', 0.2, 7)
      .sobre('gyoza1', 'gyoza', 'teburu1', 0.45, 7)
      .sobre('biru1', 'biru', 'teburu1', 0.65, 4)
      .sobre('biru2', 'biru', 'teburu1', 0.75, 4)
      .sobre('shoyu1', 'shoyu', 'teburu1', 0.9, 2.5)
      .chao('isu1', 'isu', 10, 98, 10)
      .chao('isu2', 'isu', 42, 98, 10)
      .sobre('kaban1', 'kaban-aka', 'isu2', 0.5, 6)
      .chao('teburu2', 'teburu', 72, 92, 32)
      .sobre('sushi1', 'sushi', 'teburu2', 0.15, 7)
      .sobre('tenpura1', 'tenpura', 'teburu2', 0.35, 7)
      .sobre('misoshiru1', 'misoshiru', 'teburu2', 0.55, 5)
      .sobre('ocha1', 'ocha', 'teburu2', 0.7, 3.5)
      .sobre('ocha2', 'ocha', 'teburu2', 0.8, 3.5)
      .sobre('ocha3', 'ocha', 'teburu2', 0.9, 3.5)
      .sob('kaban2', 'kaban-aka', 'teburu2', 0.3, 6)
      .sob('kaban3', 'kaban-ao', 'teburu2', 0.6, 6)
      .frente('taberu1', 'taberu', 'teburu2', 0.5, 13)
      .chao('chouchin1', 'chouchin', 12, 30, 7)
      .chao('chouchin2', 'chouchin', 50, 30, 5)
      .chao('chouchin3', 'chouchin', 88, 30, 7)
      .chao('warau1', 'warau', 92, 99, 9)
      .chao('utau1', 'utau', 52, 70, 9, { z: 3 })
      .chao('keki1', 'keki', 4, 99, 5);
  }),

  lugar('michi', '道', 'みち', 'rua', (m) => {
    m.chao('ie1', 'ie', 16, 56, 22, { z: 1 })
      .chao('ki1', 'ki', 50, 62, 18, { z: 2 })
      .chao('ki2', 'ki', 62, 60, 10, { z: 2 })
      .chao('ie2', 'ie', 85, 56, 20, { z: 1 })
      .chao('kuruma1', 'kuruma-aka', 31, 80, 13)
      .chao('kuruma2', 'kuruma-shiro', 63, 82, 13)
      .chao('kuruma3', 'kuruma-aka', 88, 76, 9)
      .chao('basu1', 'basu', 12, 74, 17)
      .chao('posuto1', 'posuto', 45, 92, 6)
      .lado('inu1', 'inu', 'posuto1', 1, 6)
      .chao('jitensha1', 'jitensha', 75, 96, 15)
      .chao('shingou1', 'shingou', 96, 70, 5)
      .sob('neko1', 'neko', 'kuruma2', 0.5, 5)
      .sobre('neko2', 'neko', 'kuruma1', 0.55, 5)
      .sobre('tori1', 'tori', 'ie1', 0.6, 4)
      .sobre('tori2', 'tori', 'ie2', 0.4, 4)
      .sobre('tori3', 'tori', 'ie2', 0.6, 4)
      .chao('hashiru1', 'hashiru', 6, 99, 10)
      .chao('aruku1', 'aruku', 55, 99, 9)
      .chao('toru1', 'toru', 88, 99, 9)
      .chao('jihanki1', 'jihanki', 36, 64, 7, { z: 3 })
      .chao('benchi1', 'benchi', 22, 98, 14)
      .sobre('kasa1', 'kasa-ao', 'benchi1', 0.3, 3)
      .sobre('boushi1', 'boushi-shiro', 'benchi1', 0.7, 4)
      .chao('kumo1', 'kumo', 36, 16, 12, { z: 0 });
  }),
];
