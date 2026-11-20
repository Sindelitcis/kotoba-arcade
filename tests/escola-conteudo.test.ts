/**
 * Conteúdo trazido da escola-japones: as mesmas conferências que ela fazia, mais a ligação
 * com o resto do arcade (ids de palavra, leituras dos kanji, pontos do Kumitate).
 */
import { describe, expect, it } from 'vitest';
import { KANJI, WORDS } from '../src/content';
import { DAILY_WORDS } from '../src/content/vida';
import { LEITURAS } from '../src/content/leituras';
import {
  acharPalavra,
  EXPRESSOES,
  FUNDAMENTOS,
  GRAMATICA,
  JORNADA_WORDS,
  KANJI_ESCOLA,
  KANJI_NOVOS,
  LEITURAS_NOVAS,
  PALAVRAS,
  PALAVRAS_TEMA,
  SITUACOES,
  SO_NA_LICAO,
} from '../src/content/escola';
import { SONS_LONGOS } from '../src/content/escola/fundamentos';
import { LACUNA } from '../src/content/escola/gramatica';
import { leitura, leituraContinua, palavras, problemasDeMarcacao, textoSimples } from '../src/content/escola/ruby';
import type { ExercicioEscrito } from '../src/content/escola/tipos';
import { kanaToRomaji } from '../src/core/kana';
import { POINTS } from '../src/games/gramatica/pontos';
import { KUMITATE_DA_LICAO } from '../src/jornada/etapas';

const KANJI_RE = /[一-鿿々]/;
const KANA_RE = /^[ぁ-ゖァ-ーー]$/;
const PONTUACAO = new Set([...'。、？！「」・～…']);

function exercicios(): ExercicioEscrito[] {
  return [...GRAMATICA.flatMap((g) => g.exercicios), ...SITUACOES.flatMap((s) => s.exercicios), ...FUNDAMENTOS.flatMap((f) => f.exercicios)];
}

const temJapones = (t: string) => /[぀-ヿ一-鿿]/.test(t) && !/[A-Za-zÀ-ÿ]/.test(t);

function textosJaponeses(): { origem: string; texto: string }[] {
  const out: { origem: string; texto: string }[] = [];
  const add = (origem: string, texto: string) => out.push({ origem, texto });
  PALAVRAS.forEach((p) => {
    add(p.id, p.jp);
    if (p.dicionario) add(`${p.id}:dicionario`, p.dicionario);
  });
  EXPRESSOES.forEach((e) => add(e.id, e.jp));
  KANJI_ESCOLA.forEach((k) => k.exemplos.forEach((ex, i) => add(`${k.id}:${i}`, ex.jp)));
  GRAMATICA.forEach((g) => g.exemplos.forEach((ex, i) => add(`${g.id}:exemplo${i}`, ex.jp)));
  SITUACOES.forEach((s) => s.falas.forEach((f, i) => add(`${s.id}:fala${i}`, f.jp)));
  FUNDAMENTOS.forEach((f) => f.paginas.forEach((p, i) => p.exemplos?.forEach((ex, j) => add(`${f.id}:${i}:${j}`, ex.jp))));
  for (const ex of exercicios()) {
    if (ex.tipo === 'lacuna') {
      add(ex.id, ex.frase.replace(LACUNA, ''));
      add(`${ex.id}:resposta`, ex.resposta);
      ex.erradas.forEach((e, i) => add(`${ex.id}:errada${i}`, e));
    } else if (ex.tipo === 'escolha') {
      [ex.correta, ...ex.erradas].filter(temJapones).forEach((e, i) => add(`${ex.id}:${i}`, e));
    } else if (ex.tipo === 'significado') add(ex.id, ex.frase);
    else ex.blocos.forEach((b, i) => add(`${ex.id}:bloco${i}`, b));
  }
  return out;
}

describe('conteúdo da escola-japones: ids', () => {
  it('são únicos entre palavras, expressões, kanji e exercícios', () => {
    const ids = [...PALAVRAS.map((p) => p.id), ...EXPRESSOES.map((e) => e.id), ...KANJI_ESCOLA.map((k) => k.id), ...exercicios().map((e) => e.id)];
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('pares parecidos apontam para palavras que existem', () => {
    const ids = new Set(PALAVRAS.map((p) => p.id));
    for (const p of PALAVRAS) for (const q of p.parecidas ?? []) expect(ids.has(q), `${p.id} → ${q}`).toBe(true);
  });

  it('chegou tudo: 4 fundamentos, 36 expressões, 14 lições de gramática, 260 palavras, 60 kanji, 8 situações', () => {
    expect([FUNDAMENTOS.length, EXPRESSOES.length, GRAMATICA.length, PALAVRAS.length, KANJI_ESCOLA.length, SITUACOES.length]).toEqual([4, 36, 14, 260, 60, 8]);
  });
});

describe('conteúdo da escola-japones: texto japonês', () => {
  const textos = textosJaponeses();

  it('a marcação de furigana está bem formada', () => {
    for (const { origem, texto } of textos) expect(problemasDeMarcacao(texto), origem).toEqual([]);
  });

  it('todo kanji tem furigana, e furigana só vai em kanji', () => {
    for (const { origem, texto } of textos) {
      for (const palavra of palavras(texto)) {
        for (const seg of palavra) {
          if (seg.leitura === undefined) expect([...seg.texto].filter((c) => KANJI_RE.test(c)), `${origem}: ${seg.texto}`).toEqual([]);
          else expect(KANJI_RE.test(seg.texto), `${origem}: furigana sem kanji em ${seg.texto}`).toBe(true);
        }
      }
    }
  });

  it('as leituras têm só kana e pontuação, e viram romaji sem sobras', () => {
    for (const { origem, texto } of textos) {
      const l = leitura(texto);
      expect([...l].filter((c) => c !== ' ' && !KANA_RE.test(c) && !PONTUACAO.has(c)), origem).toEqual([]);
      const semPontuacao = [...l].filter((c) => !PONTUACAO.has(c)).join('');
      expect(kanaToRomaji(semPontuacao), origem).toMatch(/^[a-z' -]+$/);
    }
  });
});

describe('conteúdo da escola-japones: palavras e expressões', () => {
  it('significados não se repetem dentro da escola (alternativas sempre distinguíveis)', () => {
    const pts = PALAVRAS.map((p) => p.pt);
    expect(pts.filter((p, i) => pts.indexOf(p) !== i)).toEqual([]);
    const ptsE = EXPRESSOES.map((e) => e.pt);
    expect(ptsE.filter((p, i) => ptsE.indexOf(p) !== i)).toEqual([]);
  });

  it('a mesma escrita não aparece duas vezes', () => {
    const jps = PALAVRAS.map((p) => textoSimples(p.jp));
    expect(jps.filter((p, i) => jps.indexOf(p) !== i)).toEqual([]);
  });

  it('verbos vêm na forma ます, com forma de dicionário e grupo', () => {
    for (const p of PALAVRAS.filter((x) => x.tema === 'verbos')) {
      expect(p.dicionario, p.id).toBeDefined();
      expect(p.grupoVerbo, p.id).toBeDefined();
      expect(textoSimples(p.jp).endsWith('ます'), p.id).toBe(true);
    }
  });

  it('a pronúncia explícita só troca は por わ (こんにちは)', () => {
    for (const e of [...EXPRESSOES, ...PALAVRAS]) {
      if (!e.pronuncia) continue;
      const escrita = leitura(e.jp).replace(/\s/g, '');
      const dita = e.pronuncia.replace(/\s/g, '');
      expect(dita.length, e.id).toBe(escrita.length);
      [...escrita].forEach((c, i) => {
        if (c !== dita[i]) expect(`${c}→${dita[i]}`, e.id).toBe('は→わ');
      });
    }
  });

  it('avisos de uso real continuam lá', () => {
    const anata = PALAVRAS.find((p) => p.id === 'v-anata');
    expect(anata?.nota).toMatch(/Prefira o nome/);
    expect(EXPRESSOES.find((e) => e.id === 'e-sayounara')?.quando).toMatch(/não verá por muito tempo/);
    expect(SITUACOES.find((s) => s.id === 's-saida')?.notas.join(' ')).toMatch(/さようなら não é usado entre colegas/);
  });

  it('vogal longa e っ são diferença de significado, com o par marcado nos dois lados', () => {
    const p = (id: string) => PALAVRAS.find((x) => x.id === id);
    expect(p('v-obasan')?.parecidas).toContain('v-obaasan');
    expect(p('v-obaasan')?.parecidas).toContain('v-obasan');
    expect(p('v-biru')?.parecidas).toContain('v-biiru');
    expect(SONS_LONGOS.paragrafos.join(' ')).toMatch(/っ pequeno/);
  });
});

describe('conteúdo da escola-japones: kanji', () => {
  it('leituras on em katakana e kun em hiragana', () => {
    for (const k of KANJI_ESCOLA) {
      for (const on of k.on) expect(on, k.char).toMatch(/^[ァ-ー]+$/);
      for (const kun of k.kun) expect(kun.replace('.', ''), k.char).toMatch(/^[ぁ-ゖ]+$/);
    }
  });

  it('os exemplos usam o próprio kanji', () => {
    for (const k of KANJI_ESCOLA) for (const ex of k.exemplos) expect(textoSimples(ex.jp), k.char).toContain(k.char);
  });

  it('cada kanji que o KanjiMon não tem ganhou leitura conferida, e só esses', () => {
    expect(KANJI_NOVOS.map((k) => k.char).sort()).toEqual(Object.keys(LEITURAS_NOVAS).sort());
    for (const c of Object.keys(LEITURAS_NOVAS)) expect(LEITURAS[c], c).toBeUndefined();
    expect(KANJI_NOVOS.map((k) => k.char).sort()).toEqual(['会', '分', '午', '先', '社'].sort());
  });

  it('a leitura sozinho é uma leitura real do kanji (on ou kun da escola)', () => {
    const hira = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
    for (const k of KANJI_NOVOS) {
      const l = LEITURAS_NOVAS[k.char]!;
      const reais = [...k.on.map(hira), ...k.kun.map((x) => x.split('.')[0] as string)];
      expect(reais, k.char).toContain(l.sozinho);
      expect(l.outras).not.toContain(l.sozinho);
    }
  });

  it('todo kanji da escola que o KanjiMon tem usa a leitura sozinho do KanjiMon (sem segunda versão)', () => {
    const doKanjiMon = new Set(KANJI.map((k) => k.kanji));
    for (const k of KANJI_ESCOLA) if (doKanjiMon.has(k.char)) expect(LEITURAS[k.char], k.char).toBeDefined();
  });
});

describe('conteúdo da escola-japones: exercícios', () => {
  it('alternativas diferentes, a correta fora das erradas e pelo menos 3 opções', () => {
    for (const ex of exercicios()) {
      const opcoes = ex.tipo === 'lacuna' ? [ex.resposta, ...ex.erradas] : ex.tipo === 'ordem' ? [...ex.blocos] : [ex.correta, ...ex.erradas];
      if (ex.tipo === 'ordem') continue;
      const visiveis = opcoes.map(textoSimples);
      expect(new Set(visiveis).size, ex.id).toBe(visiveis.length);
      expect(opcoes.length, ex.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('quando a resposta é に ou へ, a outra nunca é alternativa errada: as duas marcam destino', () => {
    for (const ex of exercicios()) {
      if (ex.tipo !== 'lacuna') continue;
      if (ex.resposta === 'に') expect(ex.erradas, ex.id).not.toContain('へ');
      if (ex.resposta === 'へ') expect(ex.erradas, ex.id).not.toContain('に');
    }
  });

  it('lacuna aparece uma vez só, e montar frase tem pelo menos 3 blocos', () => {
    for (const ex of exercicios()) {
      if (ex.tipo === 'lacuna') expect(ex.frase.split(LACUNA).length - 1, ex.id).toBe(1);
      if (ex.tipo === 'ordem') expect(ex.blocos.length, ex.id).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('ligação com o arcade', () => {
  const doArcade = new Map([...WORDS, ...DAILY_WORDS].map((w) => [w.id, w]));

  it('nenhuma palavra nova repete id de WORDS ou DAILY_WORDS, nem entre si', () => {
    const ids = JORNADA_WORDS.map((w) => w.id);
    expect(ids.filter((id) => doArcade.has(id))).toEqual([]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('palavra que o arcade já tinha é a mesma carta e tem a mesma leitura', () => {
    for (const p of PALAVRAS_TEMA) {
      if (!p.word || !doArcade.has(p.word.id) || p.origem === 'v-kodomo') continue;
      const forma = p.palavra.dicionario ?? p.palavra.jp;
      expect(p.word.kana, p.origem).toBe(leituraContinua(forma));
    }
    // 子ども (escola) e 子供 (KanjiMon) são a mesma palavra: uma carta só.
    expect(PALAVRAS_TEMA.find((p) => p.origem === 'v-kodomo')?.word?.id).toBe('w:子供');
  });

  it('verbos entram pela forma de dicionário, como no resto do arcade', () => {
    expect(acharPalavra('w:飲む')?.kana).toBe('のむ');
    expect(acharPalavra('w:帰る')?.kana).toBe('かえる');
    expect(acharPalavra('w:帰ります')).toBeUndefined();
  });

  it('só いる fica fora dos jogos (mesmo kana de 要る, e o áudio é achado pelo kana)', () => {
    expect([...SO_NA_LICAO]).toEqual(['v-imasu']);
    expect(PALAVRAS_TEMA.filter((p) => !p.word).map((p) => p.origem)).toEqual(['v-imasu']);
  });

  it('gramática aponta para pontos do Kumitate que existem, sem copiar nenhum', () => {
    const pontos = new Set(POINTS.map((p) => p.id));
    const licoes = new Set(GRAMATICA.map((g) => g.id));
    for (const [g, ps] of Object.entries(KUMITATE_DA_LICAO)) {
      expect(licoes.has(g), g).toBe(true);
      for (const p of ps) expect(pontos.has(p), `${g} → ${p}`).toBe(true);
    }
    const usados = Object.values(KUMITATE_DA_LICAO).flat();
    expect(usados.filter((p, i) => usados.indexOf(p) !== i)).toEqual([]);
  });
});
