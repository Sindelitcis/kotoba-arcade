import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { KANJI, type Sentence } from '../content';
import { app, aventuraSave, cenaSave, commit, conversaSave, cursoSave, go, gramaticaSave, jornadaSave, pecasSave, kanaBeatSave, kanaImagensSave, kanjimonSave, memoriaSave, replaceSave, roguelikeSave, saved, screen, tick, type Screen } from '../core/app';
import { cenaStyle, type Cena } from '../core/arte';
import { figuraUrl } from '../core/figuras';
import { sfx, speak } from '../core/audio';
import { visitados, type Saves } from '../core/cor';
import { Icone } from '../core/Icone';
import type { ModoFurigana, Ritmo, Tema } from '../core/save';
import { useSubtelaAjuda } from '../core/help/ajuda';
import { AjustesSom } from '../core/som/AjustesSom';
import { levelInfo, readingMeter, recentDays } from '../core/progress';
import { EXPLICA_FURIGANA, EXPLICA_RITMO, exportSave, MODOS_FURIGANA, NOME_FURIGANA, NOME_RITMO, RITMOS } from '../core/save';
import { Furigana } from '../core/Furigana';
import { teclaDe } from '../core/teclas';
import { BOOSTER_COST, canOpenBooster } from '../games/kanjimon/engine';
import { etapaDa, proximaMissao } from '../jornada/etapas';
import { comecarPeloA1, continuarCurso } from '../curso/CursoTela';
import { proximoPasso } from '../curso/hoje';
import { blocosDa, NOME_BLOCO } from '../curso/motor';
import { NomeDaUnidade } from '../content/curso';

interface Tile {
  id: string;
  title: string;
  jp: string;
  blurb: string;
  screen?: Screen;
  /** Atalho de teclado no fliperama. */
  tecla: string;
  cena?: Cena;
  /** Fundo desenhado no estúdio (src/assets/lugares), para os jogos de imagem. */
  figura?: string;
}

const TILES: Tile[] = [
  { id: 'kanjimon', title: 'KanjiMon', jp: '漢字モン', blurb: 'Cace kanji, quebre os selos, complete a coleção.', screen: 'kanjimon', tecla: 'C', cena: 'kanjimon-takao' },
  { id: 'kanaimagens', title: 'Kana em imagens', jp: 'かなの絵', blurb: 'Cada kana é um desenho. Do あ às palavras em katakana.', screen: 'kanaimagens', tecla: 'I', cena: 'aventura-konbini' },
  { id: 'kanabeat', title: 'Kana Beat', jp: 'かなビート', blurb: 'Digite no ritmo. Kana e palavras no tempo da batida.', screen: 'kanabeat', tecla: 'K', cena: 'kanabeat-dotonbori' },
  { id: 'roguelike', title: 'Kotodama', jp: '言霊', blurb: 'Roguelike de cartas. Runs curtas, relíquias e um chefe no topo.', screen: 'roguelike', tecla: 'R', cena: 'kotodama-inari' },
  { id: 'aventura', title: 'Aventura', jp: '冒険', blurb: 'Você chegou ao Japão. Cenas curtas com japonês de verdade.', screen: 'aventura', tecla: 'A', cena: 'aventura-narita' },
  { id: 'gramatica', title: 'Kumitate', jp: '組み立て', blurb: 'Monte frases encaixando partículas e pontas de verbo.', screen: 'gramatica', tecla: 'G', cena: 'kumitate-gion' },
  { id: 'pecas', title: 'Kanji em peças', jp: '漢字パズル', blurb: 'Veja o kanji como desenho feito de peças. Monte, ache e adivinhe.', screen: 'pecas', tecla: 'P', cena: 'pecas-ryoanji' },
  { id: 'memoria', title: 'Memória', jp: '絵合わせ', blurb: 'Ligue imagem e palavra. Do kana ao kanji, e depois só pelo som.', screen: 'memoria', tecla: 'M', figura: 'heya' },
  { id: 'cena', title: 'Cena Viva', jp: '生きた場面', blurb: 'Lugares do Japão cheios de coisas. Ache o que a frase pede.', screen: 'cena', tecla: 'L', figura: 'konbini' },
  { id: 'conversa', title: 'Conversa por voz', jp: '会話', blurb: 'Fale japonês com personagens. A IA fica na nuvem, com senha.', screen: 'conversa', tecla: 'V', cena: 'conversa-cafe' },
];

/** Frases cujo kanji o jogador já encontrou: prova concreta de que dá para ler mais que ontem. */
function readableSentences(): Sentence[] {
  const seen = new Set(KANJI.filter((k) => app.data.cards[`${k.id}#meaning`]).map((k) => k.kanji));
  const all = new Set(KANJI.map((k) => k.kanji));
  const out: Sentence[] = [];
  for (const k of KANJI) {
    for (const s of k.sentences) {
      const needed = [...s.jp].filter((c) => all.has(c));
      if (needed.length > 0 && needed.every((c) => seen.has(c))) out.push(s);
    }
  }
  return out;
}

export function Hub() {
  void tick.value;
  const [showSettings, setShowSettings] = useState(false);
  useSubtelaAjuda(showSettings ? 'ajustes' : null);
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const { profile, settings, cards } = app.data;
  const lv = levelInfo(profile.xp);
  const meter = readingMeter(cards);
  const days = recentDays(app.data, Date.now());
  const km = kanjimonSave();
  const sentences = readableSentences();
  const sentence = sentences.length > 0 ? sentences[sentences.length - 1] : undefined;
  const nextGame: Screen =
    profile.lastGame === 'kanabeat' || profile.lastGame === 'roguelike' || profile.lastGame === 'aventura' || profile.lastGame === 'gramatica' || profile.lastGame === 'pecas' || profile.lastGame === 'kanaimagens' || profile.lastGame === 'memoria' || profile.lastGame === 'cena'
      ? profile.lastGame
      : 'kanjimon';
  const nextLabel = { kanabeat: 'Kana Beat · Próxima música', roguelike: 'Kotodama · Nova run', aventura: 'Aventura · Próxima cena', gramatica: 'Kumitate · Nova rodada', pecas: 'Kanji em peças · Nova rodada', kanaimagens: 'Kana em imagens · Nova rodada', memoria: 'Memória · Nova rodada', cena: 'Cena Viva · Nova rodada', kanjimon: 'KanjiMon · Caçada' }[nextGame];
  const booster = canOpenBooster(profile, km, cards);
  // Jogos que você já jogou ganham um sinal de visto no cartão.
  const jogados = visitados({ kanjimon: km, kanabeat: kanaBeatSave(), roguelike: roguelikeSave(), aventura: aventuraSave(), gramatica: gramaticaSave(), conversa: conversaSave(), pecas: pecasSave(), kanaimagens: kanaImagensSave(), memoria: memoriaSave(), cena: cenaSave() });
  // Jornada: o caminho principal, com a próxima missão à vista.
  const jornada = jornadaSave();
  const proxima = proximaMissao(jornada);
  const etapaProx = proxima ? etapaDa(proxima.id) : undefined;
  // Curso: a próxima lição, o caminho principal.
  const passo = proximoPasso(cursoSave(), app.data.cards, Date.now());
  const licao = passo?.tipo === 'unidade' ? passo.lugar : null;
  const parteLicao = licao ? blocosDa(licao.unidade)[licao.bloco] : undefined;

  // Ligado junto com o desenho da tela: tecla apertada logo que a tela aparece não se perde.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tecla = teclaDe(e);
      if (tecla === null) return;
      // Na troca de tela este ouvinte ainda vive por um instante: tecla de outro jogo não é do fliperama.
      if (screen.value !== 'hub') return;
      if (showSettings) {
        if (tecla === 'Escape') setShowSettings(false);
        return;
      }
      if (tecla === 'Enter' || tecla === ' ') {
        // Botão escolhido pelo Tab: o Enter e o espaço são dele.
        if (e.target instanceof HTMLElement && e.target.closest('button, a, input, select, textarea')) return;
        e.preventDefault();
        continuarCurso();
      } else if (tecla.toLowerCase() === 'u') go('curso');
      else if (tecla.toLowerCase() === 'd') go('kanjidex');
      else if (tecla.toLowerCase() === 'b' && booster === 'ok') go('booster');
      else if (tecla.toLowerCase() === 'k') go('kanabeat');
      else if (tecla.toLowerCase() === 'c') go('kanjimon');
      else if (tecla.toLowerCase() === 'r') go('roguelike');
      else if (tecla.toLowerCase() === 'a') go('aventura');
      else if (tecla.toLowerCase() === 'v') go('conversa');
      else if (tecla.toLowerCase() === 'g') go('gramatica');
      else if (tecla.toLowerCase() === 'm') go('memoria');
      else if (tecla.toLowerCase() === 'l') go('cena');
      else if (tecla.toLowerCase() === 'j') go('jornada');
      else if (tecla.toLowerCase() === 'o') go('ouvir');
      else if (tecla.toLowerCase() === 'p') go('pecas');
      else if (tecla.toLowerCase() === 'i') go('kanaimagens');
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [showSettings, booster, nextGame]);

  // Ajustes é um diálogo: o foco entra nele ao abrir, e quem usa leitor de tela sabe onde está.
  useEffect(() => {
    if (showSettings) settingsRef.current?.querySelector<HTMLElement>('input, button')?.focus();
  }, [showSettings]);

  const escolherTema = (tema: Tema) => {
    settings.tema = tema;
    commit();
    sfx.click();
  };

  const escolherRitmo = (ritmo: Ritmo) => {
    settings.ritmo = ritmo;
    commit();
    sfx.click();
  };

  const escolherFurigana = (modo: ModoFurigana) => {
    settings.furigana = modo;
    commit();
    sfx.click();
  };

  const toggle = (opcao: 'voice' | 'calm') => {
    settings[opcao] = !settings[opcao];
    commit();
    sfx.click();
  };

  const download = () => {
    const blob = new Blob([exportSave(app.data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kotoba-arcade-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMessage('Backup salvo na pasta de downloads.');
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      replaceSave(await file.text());
      setMessage('Save importado.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não deu para importar.');
    }
  };

  return (
    <main class="hub">
      <header class="hub-top">
        <div class="brand">
          <span class="brand-jp" lang="ja">
            <Furigana texto="言葉" />
          </span>
          <div>
            <h1>Kotoba Arcade</h1>
            <p>Jogue. O japonês vem junto.</p>
          </div>
        </div>
        <div class="stats">
          <div class="stat" title="Nível">
            <span class="stat-label">Nível {lv.level}</span>
            <div class="bar">
              <i style={{ width: `${(lv.into / lv.need) * 100}%` }} />
            </div>
          </div>
          <div class="stat" title="Moedas">
            <span class="coin">●</span> <b data-testid="coins">{profile.coins}</b>
          </div>
          <div class="stat week" title="Dias jogados nos últimos 7. Faltar um dia não apaga nada.">
            {days.map((on, i) => (
              <span key={i} class={on ? 'day on' : 'day'} />
            ))}
          </div>
          <button class="icon" onClick={() => setShowSettings(true)} aria-label="Ajustes" title="Ajustes">
            <Icone nome="settings" />
          </button>
        </div>
      </header>

      {!saved.value && (
        <p class="notice" role="alert" data-testid="save-failed">
          O navegador não deixou gravar o progresso. Ele continua valendo enquanto esta aba estiver aberta: em Ajustes, exporte um backup.
        </p>
      )}

      <button class="koma jornada-faixa hub-curso" style={cenaStyle('aventura-narita')} onClick={continuarCurso} data-testid="hub-curso">
        <span class="hub-rotulo">
          <Icone nome="book-open" /> Curso · {licao ? licao.unidade.nivel : passo?.tipo === 'kana' ? 'Módulo 0' : passo?.tipo === 'revisao' ? 'Revisão' : 'A1 e A2'} <kbd>Enter</kbd>
        </span>
        <span class="jornada-faixa-txt">
          {passo?.tipo === 'revisao' ? (
            <>
              <b>Revisão de hoje</b>
              <span>Uns minutos com o que está na hora de lembrar. Depois, o curso segue de onde parou.</span>
              <span class="jornada-faixa-prox">
                <Icone nome="play" /> Começar a revisão
              </span>
            </>
          ) : passo?.tipo === 'kana' ? (
            <>
              <b>Módulo 0 · {passo.licao.titulo}</b>
              <span>Primeiro o kana: a escrita que o curso inteiro usa.</span>
              <span class="jornada-faixa-prox">
                <Icone nome="play" /> Continuar o Módulo 0
              </span>
            </>
          ) : licao ? (
            <>
              <b>
                {NomeDaUnidade(licao.unidade)} · {licao.unidade.titulo}
              </b>
              <span>Ao final: “Consigo {licao.unidade.consigo}.”</span>
              <span class="jornada-faixa-prox">
                <Icone nome="play" /> Continuar o curso · {licao.prova ? 'Falta a prova da unidade' : `Parte ${licao.bloco + 1} de ${blocosDa(licao.unidade).length}: ${parteLicao ? NOME_BLOCO[parteLicao.tipo] : ''}`}
              </span>
            </>
          ) : (
            <b>O curso está feito, do A1 ao A2. Abra o curso para refazer uma unidade.</b>
          )}
        </span>
      </button>
      <button class="ghost hub-curso-mapa" onClick={() => go('curso')} data-testid="hub-curso-mapa">
        Ver as unidades <kbd>U</kbd>
      </button>
      {passo?.tipo === 'kana' && (
        <button class="ghost hub-curso-mapa" onClick={comecarPeloA1} data-testid="hub-ja-sei-kana">
          Já sei ler kana: começar pela unidade 1
        </button>
      )}

      <section class="hub-hero">
        <button class="koma jornada-faixa" style={cenaStyle(etapaProx?.cena ?? 'hub-shibuya')} onClick={() => go('jornada')} data-testid="hub-jornada">
          <span class="hub-rotulo">
            <Icone nome="map" /> Jornada <kbd>J</kbd>
          </span>
          <span class="jornada-faixa-txt">
            <b>Do zero até trabalhar no Japão</b>
            <span>Missões de 3 a 10 minutos. Nada fica trancado.</span>
            {proxima && (
              <span class="jornada-faixa-prox">
                <Icone nome="play" /> {proxima.titulo} · {proxima.minutos} min
              </span>
            )}
          </span>
        </button>

        <div class="hub-lado">
          <button class="play-now" style={cenaStyle('hub-shibuya')} onClick={() => go(nextGame)} data-testid="play-now">
            <span class="hub-rotulo">
              <Icone nome="sparkles" /> Jogar agora
            </span>
            <span class="play-now-main">{nextLabel.split(' · ')[0]}</span>
            <span class="play-now-sub">
              {nextLabel.split(' · ')[1]}
            </span>
          </button>

          <button class="koma ouvir-faixa" onClick={() => go('ouvir')} data-testid="hub-ouvir">
            <span class="jornada-faixa-jp" lang="ja">
              <Furigana texto="聞" />
            </span>
            <span class="jornada-faixa-txt">
              <b>
                Ouvir <kbd>O</kbd>
              </b>
              <span>Aulas de um a três minutos, sem olhar a tela.</span>
            </span>
          </button>
        </div>
      </section>

      <div class="secao-titulo">
        <h2>Jogos</h2>
        <span>
          {Object.values(jogados).filter(Boolean).length} de {TILES.length} já jogados
        </span>
      </div>

      <section class="tiles">
        {TILES.map((t) => (
          <button
            key={t.id}
            class={`${t.screen ? 'tile' : 'tile soon'}${jogados[t.id as keyof Saves] ? ' jogado' : ''}`}
            style={t.figura ? { '--cena': `url("${figuraUrl(t.figura)}")` } : cenaStyle(t.cena)}
            data-testid={`tile-${t.id}`}
            disabled={!t.screen}
            onClick={() => t.screen && go(t.screen)}
          >
            <span class="tile-jp" lang="ja">
              <Furigana texto={t.jp} />
            </span>
            <span class="tile-title">
              {t.title}
              <kbd>{t.tecla}</kbd>
            </span>
            <span class="tile-blurb">{t.blurb}</span>
          </button>
        ))}
      </section>

      <section class="row">
        <div class="panel">
          <h2>O que você já lê</h2>
          <div class="meter">
            <div>
              <b data-testid="kanji-seen">{meter.kanjiSeen}</b> de {meter.kanjiTotal} kanji encontrados
              <div class="bar">
                <i class="soft" style={{ width: `${(meter.kanjiSeen / meter.kanjiTotal) * 100}%` }} />
                <i style={{ width: `${(meter.kanjiKnown / meter.kanjiTotal) * 100}%` }} />
              </div>
              <small>{meter.kanjiKnown} já firmes na memória</small>
            </div>
            <div>
              <b>{meter.wordsSeen}</b> de {meter.wordsTotal} palavras
              <div class="bar">
                <i class="soft" style={{ width: `${(meter.wordsSeen / meter.wordsTotal) * 100}%` }} />
                <i style={{ width: `${(meter.wordsKnown / meter.wordsTotal) * 100}%` }} />
              </div>
              <small>{meter.wordsKnown} já firmes na memória</small>
            </div>
          </div>
          {sentence ? (
            <button class="sentence" onClick={() => speak(sentence.jp)} title="Ouvir">
              <span class="sentence-count">{sentences.length} {sentences.length === 1 ? 'frase' : 'frases'} que você já consegue ler. A mais recente:</span>
              <span class="sentence-jp" lang="ja">
                <Furigana texto={sentence.jp} />
              </span>
              <span class="sentence-pt">{sentence.romaji} · {sentence.pt}</span>
            </button>
          ) : (
            <p class="muted">Capture seus primeiros KanjiMon e as frases que você consegue ler aparecem aqui.</p>
          )}
        </div>

        <div class="panel">
          <h2>KanjiMon</h2>
          <p class="muted">
            {km.captures} capturas · {Object.keys(km.dex).length} de {KANJI.length * 4} cartas · melhor combo {km.bestCombo}
          </p>
          <div class="actions">
            <button onClick={() => go('kanjimon')}>Caçar</button>
            <button onClick={() => go('kanjidex')}>
              KanjiDex <kbd>D</kbd>
            </button>
            <button disabled={booster !== 'ok'} onClick={() => go('booster')}>
              Booster {km.boosters > 0 ? `(${km.boosters} grátis)` : `(${BOOSTER_COST} moedas)`} <kbd>B</kbd>
            </button>
          </div>
          {booster === 'sem-kanji' && <small class="muted">O booster abre depois que você encontrar 3 kanji.</small>}
        </div>
      </section>

      {showSettings && (
        <div class="modal" onClick={() => setShowSettings(false)}>
          <div class="modal-box" ref={settingsRef} role="dialog" aria-modal="true" aria-labelledby="ajustes-titulo" onClick={(e) => e.stopPropagation()}>
            <h2 id="ajustes-titulo">Ajustes</h2>
            <AjustesSom />
            <label class="check">
              <input type="checkbox" checked={settings.voice} onChange={() => toggle('voice')} /> Voz
            </label>
            <label class="check">
              <input type="checkbox" checked={settings.calm} onChange={() => toggle('calm')} /> Modo calmo (menos movimento e faíscas)
            </label>
            <h3 id="ritmo-titulo">Ritmo de estudo</h3>
            <div class="segmento" role="group" aria-labelledby="ritmo-titulo">
              {RITMOS.map((r) => (
                <button key={r} aria-pressed={settings.ritmo === r} onClick={() => escolherRitmo(r)} data-testid={`ritmo-${r}`}>
                  {NOME_RITMO[r]}
                </button>
              ))}
            </div>
            <p class="muted">{EXPLICA_RITMO[settings.ritmo]}</p>
            <h3 id="furigana-titulo">Leitura em cima do kanji</h3>
            <div class="segmento" role="group" aria-labelledby="furigana-titulo">
              {MODOS_FURIGANA.map((m) => (
                <button key={m} aria-pressed={settings.furigana === m} onClick={() => escolherFurigana(m)} data-testid={`furigana-${m}`}>
                  {NOME_FURIGANA[m]}
                </button>
              ))}
            </div>
            <p class="muted">{EXPLICA_FURIGANA[settings.furigana]}</p>
            <h3 id="tema-titulo">Tema</h3>
            <div class="segmento" role="group" aria-labelledby="tema-titulo">
              {(
                [
                  ['auto', 'Do sistema', null],
                  ['claro', 'Claro', 'sun'],
                  ['escuro', 'Escuro', 'moon'],
                ] as const
              ).map(([valor, nome, icone]) => (
                <button key={valor} aria-pressed={settings.tema === valor} onClick={() => escolherTema(valor)}>
                  {icone && <Icone nome={icone} />} {nome}
                </button>
              ))}
            </div>
            <h3>Save</h3>
            <p class="muted">O progresso fica neste navegador. Guarde um backup de vez em quando.</p>
            <div class="actions">
              <button onClick={download}>Exportar backup</button>
              <button onClick={() => fileRef.current?.click()}>Importar backup</button>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void upload((e.target as HTMLInputElement).files?.[0])} />
            </div>
            {message && <p class="notice">{message}</p>}
            <button class="ghost" onClick={() => setShowSettings(false)}>
              Fechar <kbd>Esc</kbd>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
