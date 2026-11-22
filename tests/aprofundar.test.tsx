import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { alvoDaCarta, chaveDoAlvo, type Alvo } from '../src/content/aprofundar/alvo';
import { acentosDe, desenho, moras } from '../src/content/aprofundar/acento';
import { gramaticaDaFrase } from '../src/content/aprofundar/detectar';
import { falasDaFicha, falasPtDaFicha, falavelEmPt, fichaDe, todosOsAlvos } from '../src/content/aprofundar/fichas';
import { conjugateWritten, ENDINGS } from '../src/games/gramatica/engine';
import { COURSE } from '../src/games/gramatica/pontos';
import { Aprofundar, teclaDeAprofundar } from '../src/core/aprofundar/Aprofundar';
import {
  abrirAprofundar,
  deveOferecer,
  esquecerSessao,
  estudoLeve,
  fecharAprofundar,
  irPara,
  naTela,
  oferta,
  ouvirRespostas,
  pilha,
  recentes,
  useAprofundar,
  voltar,
} from '../src/core/aprofundar/estado';
import { ajudaAberta, aprofundarAberto, fecharAjuda, useAoAbrirAjuda, useAoFecharCamada } from '../src/core/help/ajuda';
import { HelpButton } from '../src/core/help/HelpButton';
import { emptySave, normalizeSave } from '../src/core/save';
import { newCard, retrievability, review, State, type CardState } from '../src/core/srs';
import { listarFalas } from '../scripts/falas';
import { listarFalasPt } from '../scripts/falas-pt';

const DIA = 86_400_000;
const ler = (arquivo: string) => readFileSync(resolve('src', arquivo), 'utf8');

/** Arquivo de cada tela do fliperama que mostra conteúdo para estudar. */
const TELAS: Record<string, string> = {
  kanjimon: 'games/kanjimon/KanjiMonGame.tsx',
  kanjidex: 'games/kanjimon/Dex.tsx',
  booster: 'games/kanjimon/Booster.tsx',
  kanabeat: 'games/kanabeat/KanaBeatGame.tsx',
  roguelike: 'games/roguelike/RoguelikeGame.tsx',
  aventura: 'games/aventura/AventuraGame.tsx',
  conversa: 'games/conversa/ConversaGame.tsx',
  gramatica: 'games/gramatica/GramaticaGame.tsx',
  jornada: 'jornada/JornadaTela.tsx',
  licao: 'jornada/LicaoTela.tsx',
  pecas: 'games/pecas/PecasGame.tsx',
  kanaimagens: 'games/kanaimagens/KanaImagensGame.tsx',
  memoria: 'games/memoria/MemoriaGame.tsx',
  cena: 'games/cena/CenaGame.tsx',
  ouvir: 'ouvir/OuvirTela.tsx',
};

describe('conteúdo do Aprofundar', () => {
  const alvos = todosOsAlvos();

  it('todo jogo diz o que está na tela', () => {
    const telas = [...ler('core/app.ts').matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    for (const tela of Object.keys(TELAS)) expect(telas).toContain(tela);
    for (const [tela, arquivo] of Object.entries(TELAS)) expect(ler(arquivo), tela).toMatch(/useAprofundar\(/);
  });

  it('todo item dos jogos tem ficha, com pelo menos uma seção e algo para ouvir', () => {
    const tipos = new Set(alvos.map((a) => a.t));
    expect([...tipos].sort()).toEqual(['cena', 'expressao', 'gramatica', 'kana', 'kanji', 'palavra']);
    const semFicha = alvos.filter((a) => !fichaDe(a)).map(chaveDoAlvo);
    expect(semFicha).toEqual([]);
    const vazias = alvos.filter((a) => {
      const f = fichaDe(a);
      return !f || f.secoes.length === 0 || f.ouvir.length === 0 || !f.grande;
    });
    expect(vazias.map(chaveDoAlvo)).toEqual([]);
  });

  it('nenhuma seção fica vazia', () => {
    for (const a of alvos) {
      for (const s of fichaDe(a)?.secoes ?? []) {
        expect(s.blocos.length, `${chaveDoAlvo(a)} ${s.titulo}`).toBeGreaterThan(0);
        for (const b of s.blocos) if ('itens' in b) expect(b.itens.length, `${chaveDoAlvo(a)} ${s.titulo}`).toBeGreaterThan(0);
      }
    }
  });

  it('kanji: leituras, traços, família e frases; a leitura é a conferida à mão', () => {
    const f = fichaDe({ t: 'kanji', c: '山' });
    expect(f?.leitura).toBe('やま');
    expect(f?.secoes.map((s) => s.titulo)).toEqual(expect.arrayContaining(['Leituras', 'Como se escreve', 'Palavras da mesma família', 'Em frases']));
    // 生 sozinho é せい? Não: é o que LEITURAS diz. O Aprofundar nunca inventa outra.
    expect(fichaDe({ t: 'kanji', c: '九' })?.leitura).toBe('きゅう');
  });

  it('kanji parecido aparece em "erros comuns"', () => {
    const erros = fichaDe({ t: 'kanji', c: '土' })?.secoes.find((s) => s.titulo === 'Erros comuns');
    expect(JSON.stringify(erros)).toContain('士');
  });

  it('gramática: regra, conjugação passo a passo, formalidade e uso no Japão', () => {
    const f = fichaDe({ t: 'gramatica', id: 'te' });
    expect(f?.secoes.map((s) => s.titulo)).toEqual(expect.arrayContaining(['A regra', 'Conjugação passo a passo', 'Formalidade', 'No Japão de verdade', 'Exemplos']));
    for (const p of COURSE.points) {
      const g = fichaDe({ t: 'gramatica', id: p.id });
      expect(g?.secoes.some((s) => s.titulo === 'Formalidade'), p.id).toBe(true);
      expect(g?.secoes.some((s) => s.titulo === 'No Japão de verdade'), p.id).toBe(true);
    }
  });

  it('a tabela de conjugação bate com o motor do Kumitate', () => {
    for (const ponta of ENDINGS) {
      const w = conjugateWritten(COURSE.verbs['飲む']!, ponta);
      expect(w.text + w.tail).toMatch(/^飲/);
    }
    const f = fichaDe({ t: 'gramatica', id: 'te' });
    const tabela = f?.secoes.flatMap((s) => s.blocos).find((b) => b.k === 'conjugacao');
    expect(tabela && tabela.k === 'conjugacao' ? tabela.linhas.map((l) => l.forma) : []).toEqual(['飲んで', '行って', '食べて', 'して', '来て']);
  });

  it('kana: traço, som, os que confundem e um exemplo', () => {
    const f = fichaDe({ t: 'kana', id: 'a:ぬ' });
    expect(f?.grande).toBe('ぬ');
    expect(JSON.stringify(f?.secoes)).toContain('め');
  });

  it('cena: vocabulário e uma frase para montar', () => {
    for (const id of ['aventura:aeroporto', 'lugar:sala']) {
      const f = fichaDe({ t: 'cena', id });
      if (!f) continue;
      expect(f.secoes.some((s) => s.titulo === 'Vocabulário da cena'), id).toBe(true);
    }
    const comMontar = todosOsAlvos().filter((a) => a.t === 'cena' && fichaDe(a)?.secoes.some((s) => s.titulo === 'Monte a frase'));
    expect(comMontar.length).toBeGreaterThan(10);
    // Toda cena da Aventura e da Cena Viva tem frase para montar.
    const semMontar = todosOsAlvos().filter((a) => a.t === 'cena' && /^(aventura|lugar):/.test(a.id) && !fichaDe(a)?.secoes.some((s) => s.titulo === 'Monte a frase'));
    expect(semMontar.map(chaveDoAlvo)).toEqual([]);
  });

  it('toda frase para montar tem as peças na ordem da frase falada', () => {
    for (const a of alvos) {
      for (const b of (fichaDe(a)?.secoes ?? []).flatMap((s) => s.blocos)) {
        if (b.k !== 'montar') continue;
        expect(b.partes.length, chaveDoAlvo(a)).toBeGreaterThan(1);
        const junto = b.partes.join('');
        const falado = (b.fala?.texto ?? '').replace(/[\s、。？！?!]/g, '');
        expect(falado.startsWith(junto.replace(/[\s、。？！?!]/g, '')) || falado.includes(b.partes[0] as string), chaveDoAlvo(a)).toBe(true);
      }
    }
  });

  it('o português falado não tem japonês no meio (a voz em português não lê kana)', () => {
    for (const a of alvos) for (const t of falasPtDaFicha(fichaDe(a)!)) expect(falavelEmPt(t), t).toBe(true);
  });

  it('todo japonês e todo português das fichas estão nas listas de gravação', () => {
    const jp = new Set(listarFalas().map((f) => `${f.voz === 'metan' ? 'palavra' : 'frase'}\n${f.texto}`));
    const textos = new Set(listarFalas().map((f) => f.texto));
    const pt = new Set(listarFalasPt().map((f) => f.texto));
    for (const a of alvos) {
      const f = fichaDe(a)!;
      for (const x of falasDaFicha(f)) expect(textos.has(x.texto), `${chaveDoAlvo(a)}: ${x.texto}`).toBe(true);
      for (const t of falasPtDaFicha(f)) expect(pt.has(t), t).toBe(true);
    }
    expect(jp.size).toBeGreaterThan(0);
  });
});

describe('acento', () => {
  it('divide em moras: きゃ é uma só, っ conta', () => {
    expect(moras('きょう')).toEqual(['きょ', 'う']);
    expect(moras('がっこう')).toEqual(['が', 'っ', 'こ', 'う']);
  });

  it('desenha alto e baixo, com a partícula no fim', () => {
    expect(desenho(3, 0)).toEqual([false, true, true, true]); // heiban: さくら? não, 桜 é 0: さ↓く↑ら↑が↑
    expect(desenho(2, 1)).toEqual([true, false, false]); // atamadaka: はし (箸)
    expect(desenho(2, 2)).toEqual([false, true, false]); // odaka: はし (橋)
  });

  it('a base de acento tem as palavras comuns', () => {
    expect(acentosDe('山', 'やま')).toEqual([2]);
  });
});

describe('gramática na frase', () => {
  it('acha a ponta do verbo sem confundir ています com ます', () => {
    expect(gramaticaDaFrase('ここで待ってください')).toEqual([{ t: 'gramatica', id: 'te' }]);
    expect(gramaticaDaFrase('東京に住んでいます')).toEqual([{ t: 'gramatica', id: 'teiru' }]);
    expect(gramaticaDaFrase('コーヒーを飲みました')).toEqual([{ t: 'gramatica', id: 'mashita' }, { t: 'gramatica', id: 'wo' }]);
    expect(gramaticaDaFrase('行きたいです')).toEqual([{ t: 'gramatica', id: 'tai' }]);
    expect(gramaticaDaFrase('食べます')).toEqual([{ t: 'gramatica', id: 'masu' }]);
    expect(gramaticaDaFrase('こんにちは')).toEqual([]);
  });
});

describe('carta da memória vira alvo', () => {
  it('kanji, palavra, kana e gramática; progresso de lição não', () => {
    expect(alvoDaCarta('k:山#meaning')).toEqual({ t: 'kanji', c: '山' });
    expect(alvoDaCarta('w:山道#reading')).toEqual({ t: 'palavra', id: 'w:山道' });
    expect(alvoDaCarta('a:あ#reading')).toEqual({ t: 'kana', id: 'a:あ' });
    expect(alvoDaCarta('g:wa#uso')).toEqual({ t: 'gramatica', id: 'wa' });
    expect(alvoDaCarta('licao:gram:g-desu')).toBeNull();
  });
});

describe('revisão leve no FSRS', () => {
  beforeEach(() => esquecerSessao());

  function vencida(now: number): CardState {
    let c = review(newCard(0), { correct: true }, now - 40 * DIA);
    c = review(c, { correct: true }, now - 30 * DIA);
    return c;
  }

  it('carta quase vencendo ganha uma revisão "difícil", que adia sem punir', () => {
    const now = Date.now();
    const antes = vencida(now);
    expect(antes.state).toBe(State.Review);
    expect(retrievability(antes, now)).toBeLessThan(0.9);
    const cards: Record<string, CardState> = { 'k:山#meaning': antes };
    expect(estudoLeve(cards, { t: 'kanji', c: '山' }, now)).toEqual(['k:山#meaning']);
    const depois = cards['k:山#meaning']!;
    expect(depois.lapses).toBe(antes.lapses);
    expect(depois.state).toBe(State.Review);
    expect(depois.due).toBeGreaterThan(now);
  });

  it('não cria carta, não mexe em carta firme e só conta uma vez por sessão', () => {
    const now = Date.now();
    const firme = review(newCard(now), { correct: true }, now);
    const cards: Record<string, CardState> = { 'k:山#reading': firme };
    expect(estudoLeve(cards, { t: 'kanji', c: '川' }, now)).toEqual([]);
    expect(cards['k:川#meaning']).toBeUndefined();
    expect(estudoLeve(cards, { t: 'kanji', c: '山' }, now)).toEqual([]);
    expect(cards['k:山#reading']).toBe(firme);
    cards['k:山#meaning'] = vencida(now);
    expect(estudoLeve(cards, { t: 'kanji', c: '山' }, now)).toEqual([]);
  });

  it('cena não tem carta', () => {
    expect(estudoLeve({}, { t: 'cena', id: 'lugar:sala' }, Date.now())).toEqual([]);
  });
});

describe('ritmo de estudo', () => {
  it('mais jogo nunca oferece; equilibrado depois do segundo erro; mais estudo depois de cada erro e de cada item novo', () => {
    expect(deveOferecer('jogo', { correct: false }, true, 5)).toBe(false);
    expect(deveOferecer('equilibrado', { correct: false }, false, 1)).toBe(false);
    expect(deveOferecer('equilibrado', { correct: false }, false, 2)).toBe(true);
    expect(deveOferecer('equilibrado', { correct: true }, true, 0)).toBe(false);
    expect(deveOferecer('estudo', { correct: false }, false, 1)).toBe(true);
    expect(deveOferecer('estudo', { correct: true }, true, 0)).toBe(true);
    expect(deveOferecer('estudo', { correct: true }, false, 0)).toBe(false);
  });

  it('o save guarda o ritmo e o padrão é equilibrado', () => {
    expect(emptySave(0).settings.ritmo).toBe('equilibrado');
    expect(normalizeSave({ v: 1, settings: { ritmo: 'estudo' } }, 0).settings.ritmo).toBe('estudo');
    expect(normalizeSave({ v: 1, settings: { ritmo: 'outro' } }, 0).settings.ritmo).toBe('equilibrado');
  });

  it('resposta do jogo vira recente e, no ritmo de estudo, oferta', async () => {
    esquecerSessao();
    const cards: Record<string, CardState> = {};
    const parar = ouvirRespostas(() => cards, () => 'estudo', () => true);
    try {
      cards['k:山#meaning'] = review(newCard(0), { correct: false }, Date.now());
      await Promise.resolve();
      expect(recentes.value).toEqual([{ t: 'kanji', c: '山' }]);
      expect(oferta.value).toEqual({ t: 'kanji', c: '山' });
    } finally {
      parar();
      esquecerSessao();
    }
  });

  it('a revisão leve não vira oferta nem recente', async () => {
    esquecerSessao();
    const now = Date.now();
    let c = review(newCard(0), { correct: true }, now - 40 * DIA);
    c = review(c, { correct: true }, now - 30 * DIA);
    const cards: Record<string, CardState> = { 'k:山#meaning': c };
    await Promise.resolve();
    esquecerSessao();
    const parar = ouvirRespostas(() => cards, () => 'estudo', () => true);
    try {
      estudoLeve(cards, { t: 'kanji', c: '山' }, now);
      await Promise.resolve();
      expect(recentes.value).toEqual([]);
      expect(oferta.value).toBeNull();
    } finally {
      parar();
    }
  });
});

describe('tecla do Aprofundar', () => {
  const ev = (key: string, target: EventTarget = document.body, mod: Partial<KeyboardEvent> = {}) => ({ key, ctrlKey: false, altKey: false, metaKey: false, target, ...mod });

  it('F4 abre sempre; ! só fora de campo de texto', () => {
    expect(teclaDeAprofundar(ev('F4'))).toBe(true);
    expect(teclaDeAprofundar(ev('!'))).toBe(true);
    const campo = document.createElement('input');
    expect(teclaDeAprofundar(ev('!', campo))).toBe(false);
    expect(teclaDeAprofundar(ev('F4', campo))).toBe(true);
    expect(teclaDeAprofundar(ev('F4', document.body, { altKey: true }))).toBe(false);
  });

  it('nenhum jogo usa F4 nem !', () => {
    for (const [tela, arquivo] of Object.entries(TELAS)) {
      const fonte = ler(arquivo);
      expect(fonte, tela).not.toMatch(/(?:\be\.key|\btecla|\bkey) [!=]== '(F4|!)'/);
    }
  });
});

describe('painel do Aprofundar', () => {
  let raiz: HTMLElement;
  const press = (key: string): void => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  };

  afterEach(async () => {
    await act(() => {
      fecharAprofundar();
      fecharAjuda();
    });
    await act(() => render(null, raiz));
    raiz.remove();
    esquecerSessao();
  });

  function Jogo({ alvos, aoPausar, aoVoltar }: { alvos: Alvo[]; aoPausar?: () => void; aoVoltar?: () => void }) {
    useAprofundar(alvos);
    useAoAbrirAjuda(() => aoPausar?.());
    useAoFecharCamada(() => aoVoltar?.());
    return <p>jogo</p>;
  }

  async function montar(alvos: Alvo[], extra: { aoPausar?: () => void; aoVoltar?: () => void } = {}) {
    raiz = document.createElement('div');
    raiz.id = 'app';
    document.body.append(raiz);
    await act(() =>
      render(
        <>
          <Jogo alvos={alvos} {...extra} />
          <HelpButton tela="kanjimon" />
          <Aprofundar />
        </>,
        raiz,
      ),
    );
  }

  it('camada por cima (a apresentação) vale enquanto está aberta; ao fechar, volta o que a tela disse', async () => {
    function Camada({ alvo }: { alvo: Alvo }) {
      useAprofundar(alvo);
      return <p>camada</p>;
    }
    raiz = document.createElement('div');
    raiz.id = 'app';
    document.body.append(raiz);
    const cena: Alvo = { t: 'kanji', c: '山' };
    const novo: Alvo = { t: 'kanji', c: '川' };
    const tela = (aberta: boolean) => (
      <>
        <Jogo alvos={[cena]} />
        {aberta && <Camada alvo={novo} />}
      </>
    );
    await act(() => render(tela(true), raiz));
    expect(naTela.value).toEqual([novo]);
    await act(() => render(tela(false), raiz));
    expect(naTela.value).toEqual([cena]);
    await act(() => render(null, raiz));
    expect(naTela.value).toEqual([]);
  });

  it('nada abre sozinho; o botão fica no canto', async () => {
    await montar([{ t: 'kanji', c: '山' }]);
    expect(aprofundarAberto.value).toBe(false);
    expect(document.querySelector('[data-testid="apr-botao"]')).not.toBeNull();
    expect(naTela.value).toEqual([{ t: 'kanji', c: '山' }]);
  });

  it('F4 abre a ficha do que está na tela, pausa o jogo; Esc fecha e o jogo volta; nenhuma tecla vaza', async () => {
    const recebidas: string[] = [];
    const jogo = (e: KeyboardEvent) => recebidas.push(e.key);
    let pausas = 0;
    let voltas = 0;
    addEventListener('keydown', jogo);
    try {
      await montar([{ t: 'kanji', c: '山' }], { aoPausar: () => pausas++, aoVoltar: () => voltas++ });
      await act(() => press('F4'));
      expect(aprofundarAberto.value).toBe(true);
      expect(pausas).toBe(1);
      expect(document.querySelector('.apr-grande')?.textContent).toBe('山');
      expect(document.getElementById('app')?.hasAttribute('inert')).toBe(true);
      await act(() => {
        press('Enter');
        press('a');
        press(' ');
        press('?');
      });
      expect(ajudaAberta.value).toBe(false);
      await act(() => press('Escape'));
      expect(aprofundarAberto.value).toBe(false);
      expect(voltas).toBe(1);
      expect(recebidas).toEqual([]);
      press('Enter');
      expect(recebidas).toEqual(['Enter']);
    } finally {
      removeEventListener('keydown', jogo);
    }
  });

  it('! também abre e fecha', async () => {
    await montar([{ t: 'kana', id: 'a:あ' }]);
    await act(() => press('!'));
    expect(aprofundarAberto.value).toBe(true);
    await act(() => press('!'));
    expect(aprofundarAberto.value).toBe(false);
  });

  it('com a ajuda aberta, F4 não abre por cima; e o jogo só volta quando as duas fecham', async () => {
    let voltas = 0;
    await montar([{ t: 'kanji', c: '山' }], { aoVoltar: () => voltas++ });
    await act(() => press('?'));
    await act(() => press('F4'));
    expect(aprofundarAberto.value).toBe(false);
    await act(() => press('Escape'));
    expect(voltas).toBe(1);
  });

  it('palavra da família abre por cima e Backspace volta', async () => {
    await montar([{ t: 'kanji', c: '山' }]);
    await act(() => abrirAprofundar());
    await act(() => irPara({ t: 'palavra', id: 'w:火山' }));
    expect(pilha.value.length).toBe(2);
    expect(document.querySelector('.apr-grande')?.textContent).toBe('火山');
    await act(() => press('Backspace'));
    expect(pilha.value.length).toBe(1);
    expect(voltar()).toBe(false);
  });

  it('sem nada na tela, mostra os respondidos há pouco', async () => {
    await montar([]);
    await act(() => {
      recentes.value = [{ t: 'kanji', c: '川' }];
    });
    await act(() => press('F4'));
    expect(document.querySelector('.apr-grande')?.textContent).toBe('川');
  });
});
