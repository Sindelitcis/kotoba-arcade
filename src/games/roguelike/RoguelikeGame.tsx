import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useClima } from '../../core/som/climas';
import { app, commit, go, roguelikeSave } from '../../core/app';
import { sfx, speak } from '../../core/audio';
import { VOZ_PALAVRA } from '../../core/vozes';
import { cenaStyle } from '../../core/arte';
import { acertou, cor, corStyle, errou, zerar } from '../../core/cor';
import { burstFrom, FX_COR, onomato, pulse } from '../../core/fx';
import type { Question } from '../../core/questions';
import { teclaDe } from '../../core/teclas';
import { alvosDasCartas, useAprofundar } from '../../core/aprofundar/estado';
import { Apresentacao } from '../../core/Apresentacao';
import { artUrl } from '../kanjimon/art';
import { cardKey, getKanji, getWord } from '../../content';
import { acharPalavra } from '../../content/escola';
import { itemDaPalavra, itemNovoDe, type ItemNovo } from '../../content/ensino';
import { EFFECTS, effectText, faceOf, NODES, RELICS, REST_HEAL, Run, SHARPEN, type Intent, type RunCard, type RunEvent } from './engine';

interface Asking {
  question: Question;
  card: RunCard;
  feedback?: { ok: boolean; chosen: string; note: string };
}

const HIT_DELAY = 520;
const MISS_DELAY = 1800;
const COLORS: Record<string, string[]> = {
  attack: [FX_COR.festa, FX_COR.raro],
  block: [FX_COR.marca],
  heal: [FX_COR.bom],
  draw: [FX_COR.raro],
};

/** A carta como apresentação: a ficha do item (o kanji vem com a arte dele). */
export function itemDaCarta(itemId: string): ItemNovo {
  const chave = cardKey(itemId, 'meaning');
  if (itemId.startsWith('k:')) {
    const k = getKanji(itemId);
    const img = artUrl(k, 'c');
    return (
      itemNovoDe(chave, { img }) ?? {
        chaves: [chave],
        alvo: { t: 'kanji', c: k.kanji },
        tipo: 'Kanji',
        grande: k.kanji,
        leitura: k.reading,
        pt: k.pt[0] ?? '',
        img,
        falas: [{ tipo: 'jp', fala: { texto: k.kanji, voz: 'palavra', kana: k.reading } }],
      }
    );
  }
  return itemDaPalavra(acharPalavra(itemId) ?? getWord(itemId), chave);
}

function newRun(): Run {
  const run = new Run({
    cards: app.data.cards,
    profile: app.data.profile,
    save: roguelikeSave(),
    rng: Math.random,
    now: () => Date.now(),
  });
  run.start();
  commit();
  return run;
}

function intentText(intent: Intent): string {
  const parts: string[] = [];
  if (intent.attack) parts.push(`ataca ${intent.attack}`);
  if (intent.block) parts.push(`defende ${intent.block}`);
  return parts.join(' e ');
}

export function RoguelikeGame() {
  const runRef = useRef<Run | null>(null);
  if (!runRef.current) runRef.current = newRun();
  const run = runRef.current;
  const [, setFrame] = useState(0);
  const redraw = () => setFrame((n) => n + 1);
  const [asking, setAsking] = useState<Asking | null>(null);
  const [typed, setTyped] = useState('');
  const [note, setNote] = useState('');
  /** Errou na prática: o item aparece de novo antes de seguir. */
  const [deNovo, setDeNovo] = useState<ItemNovo | null>(null);
  const shownAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const enemyEl = useRef<HTMLDivElement>(null);
  const playerEl = useRef<HTMLDivElement>(null);
  const fieldEl = useRef<HTMLElement>(null);
  const inputEl = useRef<HTMLInputElement>(null);

  const react = (events: RunEvent[]) => {
    for (const e of events) {
      if (e.t === 'enemy') {
        const who = run.enemy?.name ?? 'O inimigo';
        if (e.damage > 0) {
          sfx.miss();
          onomato('golpe', playerEl.current);
          pulse(playerEl.current, 'shake');
          setNote(`${who} atacou: ${e.damage} de dano${e.blocked > 0 ? `, ${e.blocked} no escudo` : ''}.`);
        } else if (e.intent.attack) {
          sfx.click();
          onomato('defesa', playerEl.current);
          setNote(`${who} atacou e o escudo segurou tudo.`);
        } else {
          sfx.click();
          setNote(`${who} se defendeu.`);
        }
      } else if (e.t === 'relic') {
        setNote(`${RELICS[e.relic].name}: ${e.note}.`);
      } else if (e.t === 'win') {
        sfx.capture(e.kind === 'combat' ? 0 : e.kind === 'elite' ? 2 : 3);
        burstFrom(enemyEl.current, COLORS.attack as string[], 50, 520);
        onomato('acerto', enemyEl.current, 'bom', 1.5);
      } else if (e.t === 'levelup') {
        sfx.levelup();
        setNote(`Nível ${e.level}!`);
      } else if (e.t === 'over') {
        if (e.won) sfx.vitoria();
        else sfx.over();
      }
    }
  };

  const endTurn = () => {
    if (asking || run.phase !== 'combat') return;
    react(run.endTurn());
    commit();
    redraw();
  };

  const play = (index: number) => {
    if (asking) return;
    const card = run.hand[index];
    const events = run.playCard(index);
    const ask = events.find((e): e is Extract<RunEvent, { t: 'ask' }> => e.t === 'ask');
    if (!ask || !card) return;
    sfx.click();
    setTyped('');
    setNote('');
    shownAt.current = performance.now();
    setAsking({ question: ask.question, card });
  };

  const submit = (input: string) => {
    if (!asking || asking.feedback) return;
    const q = asking.question;
    const events = run.answer(input, performance.now() - shownAt.current);
    commit();
    speak(q.speak, VOZ_PALAVRA, q.speakKana);
    const played = events.find((e): e is Extract<RunEvent, { t: 'play' }> => e.t === 'play');
    if (!played) return;
    const effect = asking.card.effect;
    const what = `${EFFECTS[effect].name}: ${effectText(effect, played.amount)}`;
    if (played.correct) {
      acertou(played.combo);
      sfx.hit(played.combo);
      if (played.fast) sfx.fast();
      onomato(played.fast ? 'rapido' : 'acerto', document.querySelector('.rg-ask .prompt'), 'bom');
      const target = effect === 'attack' ? enemyEl.current : playerEl.current;
      burstFrom(target, COLORS[effect] as string[], played.fast ? 34 : 20);
      pulse(target, effect === 'attack' ? 'hurt' : 'pop');
    } else {
      errou();
      sfx.miss();
      onomato('erro', document.querySelector('.rg-ask .prompt'));
      pulse(fieldEl.current, 'flash-bad');
    }
    const note = played.close
      ? `${what}. Repare na vogal longa: ${q.answer}`
      : played.correct
        ? `${what}${played.fast ? ' (rápido!)' : ''}`
        : played.pratica
          ? `${what}. Prática: a carta saiu inteira. Veja de novo.`
          : `${what} (efeito fraco)`;
    setAsking({ ...asking, feedback: { ok: played.correct, chosen: input, note } });
    react(events);
    timer.current = window.setTimeout(
      () => {
        setAsking(null);
        setTyped('');
        if (played.pratica && !played.correct) {
          setDeNovo(itemDaCarta(asking.card.itemId));
          return;
        }
        // Sem carta para jogar, o turno passa sozinho.
        if (run.phase === 'combat' && !run.canPlay) {
          react(run.endTurn());
          commit();
        }
        redraw();
      },
      played.correct && !played.close ? HIT_DELAY : MISS_DELAY,
    );
  };

  const act = (events: RunEvent[]) => {
    react(events);
    sfx.click();
    setNote('');
    commit();
    redraw();
  };

  /** Fechou o "olhe de novo": segue o combate (e passa a vez se não há o que jogar). */
  const fecharDeNovo = () => {
    setDeNovo(null);
    if (run.phase === 'combat' && !run.canPlay) {
      react(run.endTurn());
      commit();
    }
    redraw();
  };

  /** Os itens novos do baralho foram apresentados: começa o combate. */
  const apresentou = () => {
    act(run.apresentou());
  };

  const restart = () => {
    clearTimeout(timer.current);
    runRef.current = newRun();
    zerar();
    setAsking(null);
    setNote('');
    redraw();
  };

  const leave = () => {
    commit();
    go('hub');
  };

  // Ligado junto com o desenho da tela: tecla apertada logo que a tela aparece não se perde.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tecla = teclaDe(e);
      if (tecla === null) return;
      if (tecla === 'Escape') {
        e.preventDefault();
        leave();
        return;
      }
      // Apresentação na tela: as teclas são dela (core/Apresentacao.tsx).
      if (deNovo || run.phase === 'apresenta') return;
      const digit = /^[0-9]$/.test(tecla) ? Number(tecla) : -1;
      const confirm = tecla === 'Enter' || tecla === ' ';
      if (asking) {
        if (!asking.feedback && !asking.question.typing && digit >= 1 && digit <= 4) {
          const choice = asking.question.choices[digit - 1];
          if (choice) submit(choice);
        }
        return;
      }
      if (confirm) e.preventDefault();
      if (run.phase === 'combat') {
        if (digit >= 1) play(digit - 1);
        else if (confirm || tecla.toLowerCase() === 'e') endTurn();
      } else if (run.phase === 'map') {
        if (digit >= 1 && digit <= run.options.length) act(run.choose(digit - 1));
        else if (confirm) act(run.choose(0));
      } else if (run.phase === 'reward') {
        if (digit >= 1 && run.reward?.offers[digit - 1]) act(run.takeReward(digit - 1));
        else if (digit === 0 || tecla.toLowerCase() === 'p') act(run.takeReward(null));
      } else if (run.phase === 'rest') {
        if (digit === 1) act(run.rest('heal'));
        else if (digit === 2) act(run.rest('sharpen'));
      } else if (run.phase === 'shop') {
        if (digit >= 1) {
          if (run.buy(digit - 1)) act([]);
        } else if (confirm) act(run.leaveShop());
      } else if (run.phase === 'over' && confirm) {
        restart();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (asking?.question.typing && !asking.feedback) inputEl.current?.focus();
  }, [asking]);

  const q = asking?.question;
  const feedback = asking?.feedback;
  // O Aprofundar mostra o item depois da resposta: antes, ele entregaria a resposta.
  useAprofundar(feedback && q ? alvosDasCartas([q.card]) : []);
  const enemy = run.enemy;
  const inCombat = (run.phase === 'combat' || run.phase === 'question') && enemy;
  useClima(run.phase === 'over' && run.won ? 'vitoria' : inCombat && enemy.kind === 'boss' ? 'chefe' : undefined);
  const total = run.stats.correct + run.stats.wrong;

  return (
    <main class="rg" data-phase={asking ? 'question' : run.phase} data-testid="rg">
      <header class="km-top">
        <div class="rg-hp" data-testid="rg-hp" title="Vida">
          <span class="heart on">♥</span> <b>{run.hp}</b>/{run.maxHp}
          <div class="bar">
            <i class="rg-hp-fill" style={{ width: `${(run.hp / run.maxHp) * 100}%` }} />
          </div>
        </div>
        <div class={run.combo > 1 ? 'combo on' : 'combo'}>Combo x{run.combo}</div>
        <div class="stat" title="Ouro desta run, para gastar na loja">
          <span class="coin">●</span> <b data-testid="rg-gold">{run.gold}</b> ouro
        </div>
        <div class="rg-relics" data-testid="rg-relics">
          {run.relics.map((r) => (
            <span key={r} class="rg-relic" title={`${RELICS[r].name}: ${RELICS[r].text}`}>
              <i>{RELICS[r].jp}</i> {RELICS[r].name}
            </span>
          ))}
        </div>
        <button class="ghost" onClick={leave}>
          Sair <kbd>Esc</kbd>
        </button>
      </header>

      {run.phase === 'apresenta' && (
        <section class="rg-apresenta" data-testid="rg-apresenta">
          <p class="muted center">Cartas novas no baralho. Conheça antes de lutar.</p>
          <Apresentacao key={run.apresentando.join()} itens={run.apresentando.map(itemDaCarta)} onFim={apresentou} fim="Lutar" />
        </section>
      )}

      {deNovo && (
        <div class="rg-ask" data-testid="rg-de-novo">
          <Apresentacao key={deNovo.chaves[0]} itens={[deNovo]} modo="de-novo" onFim={fecharDeNovo} fim="Voltar à luta" />
        </div>
      )}

      {inCombat && (
        <section class="rg-combat" ref={fieldEl}>
          <div class="rg-field">
            <div class="rg-side" ref={playerEl}>
              <span class="rg-glyph">私</span>
              <b>Você</b>
              <span class="rg-block" data-testid="rg-block">Escudo {run.block}</span>
              <span class="rg-energy" data-testid="rg-energy">
                {Array.from({ length: Math.max(run.energy, 3) }, (_, i) => (
                  <i key={i} class={i < run.energy ? 'on' : ''} />
                ))}
                energia
              </span>
            </div>
            <div
              class={`rg-side rg-enemy k-${enemy.kind}`}
              ref={enemyEl}
              // Chefe e elite já entram em cor cheia; no combate comum o santuário ganha cor com os acertos.
              style={{ ...cenaStyle('kotodama-inari'), ...corStyle(enemy.kind === 'combat' ? cor.value : 1) }}
              data-testid="rg-enemy"
            >
              <span class="rg-glyph">{enemy.jp}</span>
              <b>{enemy.name}</b>
              <div class="bar">
                <i class="rg-enemy-fill" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
              </div>
              <span data-testid="rg-enemy-hp">
                {enemy.hp}/{enemy.maxHp}
                {enemy.block > 0 ? ` · escudo ${enemy.block}` : ''}
              </span>
              <span class="rg-intent">No fim do turno: {intentText(run.intent)}</span>
            </div>
          </div>

          <p class="rg-note" data-testid="rg-note">
            {note || RELICS[run.relics[0] ?? 'leque'].text}
          </p>

          <div class="rg-hand">
            {run.hand.map((card, i) => {
              const face = faceOf(card.itemId);
              return (
                <button key={card.uid} class={`rg-card e-${card.effect}`} disabled={!run.canPlay} onClick={() => play(i)} data-testid="rg-card">
                  <kbd>{i + 1}</kbd>
                  {run.isNew(card.itemId) && <span class="badge">NOVO</span>}
                  <span class={`rg-card-jp ${face.kind}${face.jp.length > 3 ? ' long' : ''}`}>{face.jp}</span>
                  <span class="rg-card-effect">{EFFECTS[card.effect].name}</span>
                  <span class="rg-card-text">{effectText(card.effect, run.strongAmount(card))}</span>
                </button>
              );
            })}
          </div>
          <div class="actions center">
            <button onClick={endTurn} data-testid="rg-end">
              Passar a vez <kbd>Enter</kbd>
            </button>
          </div>
        </section>
      )}

      {run.phase === 'map' && (
        <section class="rg-panel">
          <h2>Andar {run.floor + 1} de {run.map.length}</h2>
          <div class="rg-map" data-testid="rg-map">
            {run.map.map((nodes, f) => (
              <div key={f} class={f < run.floor ? 'rg-floor done' : f === run.floor ? 'rg-floor now' : 'rg-floor'}>
                {nodes.map((n, i) => (
                  <button
                    key={i}
                    class={`rg-node n-${n}${f < run.floor && run.path[f] === i ? ' went' : ''}`}
                    disabled={f !== run.floor}
                    onClick={() => act(run.choose(i))}
                  >
                    <i>{NODES[n].jp}</i>
                    <span>{NODES[n].name}</span>
                    {f === run.floor && <kbd>{nodes.length > 1 ? i + 1 : 'Enter'}</kbd>}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <p class="muted">Bom ponto para parar, se quiser. O que você estudou já está guardado.</p>
        </section>
      )}

      {run.phase === 'reward' && run.reward && (
        <section class="rg-panel" data-testid="rg-reward">
          <h2>Vitória! +{run.reward.gold} de ouro</h2>
          {run.reward.relic && (
            <p class="gain">
              Relíquia: {RELICS[run.reward.relic].name}. {RELICS[run.reward.relic].text}
            </p>
          )}
          <p class="muted">Escolha uma carta para o baralho.</p>
          <div class="rg-offers">
            {run.reward.offers.map((card, i) => (
              <Offer key={card.uid} card={card} index={i} isNew={run.isNew(card.itemId)} amount={run.strongAmount(card)} onPick={() => act(run.takeReward(i))} />
            ))}
          </div>
          <div class="actions center">
            <button class="ghost" onClick={() => act(run.takeReward(null))}>
              Pular <kbd>P</kbd>
            </button>
          </div>
        </section>
      )}

      {run.phase === 'rest' && (
        <section class="rg-panel" data-testid="rg-rest">
          <h2>Descanso</h2>
          <div class="rg-offers">
            <button class="rg-offer" onClick={() => act(run.rest('heal'))}>
              <kbd>1</kbd>
              <span class="rg-card-jp">休</span>
              <b>Dormir</b>
              <span>Cura {REST_HEAL} de vida.</span>
            </button>
            <button class="rg-offer" onClick={() => act(run.rest('sharpen'))}>
              <kbd>2</kbd>
              <span class="rg-card-jp">刀</span>
              <b>Afiar a espada</b>
              <span>Seus golpes ganham +{SHARPEN} de dano até o fim da run.</span>
            </button>
          </div>
        </section>
      )}

      {run.phase === 'shop' && (
        <section class="rg-panel" data-testid="rg-shop">
          <h2>Loja</h2>
          <p class="muted">Você tem {run.gold} de ouro.</p>
          <div class="rg-offers">
            {run.shop.map((item, i) => (
              <button key={i} class={`rg-offer${item.sold ? ' sold' : ''}${item.t === 'card' ? ` e-${item.card.effect}` : ''}`} disabled={item.sold || run.gold < item.price} onClick={() => run.buy(i) && act([])}>
                <kbd>{i + 1}</kbd>
                {item.t === 'card' && (
                  <>
                    <span class={`rg-card-jp ${faceOf(item.card.itemId).kind}`}>{faceOf(item.card.itemId).jp}</span>
                    <b>{faceOf(item.card.itemId).pt}</b>
                    <span>
                      {EFFECTS[item.card.effect].name}: {effectText(item.card.effect, run.strongAmount(item.card))}
                    </span>
                  </>
                )}
                {item.t === 'relic' && (
                  <>
                    <span class="rg-card-jp">{RELICS[item.relic].jp}</span>
                    <b>{RELICS[item.relic].name}</b>
                    <span>{RELICS[item.relic].text}</span>
                  </>
                )}
                {item.t === 'heal' && (
                  <>
                    <span class="rg-card-jp">薬</span>
                    <b>Remédio</b>
                    <span>Cura {item.amount} de vida.</span>
                  </>
                )}
                <span class="gain">{item.sold ? 'Comprado' : `${item.price} de ouro`}</span>
              </button>
            ))}
          </div>
          <div class="actions center">
            <button class="primary" onClick={() => act(run.leaveShop())}>
              Seguir viagem <kbd>Enter</kbd>
            </button>
          </div>
        </section>
      )}

      {asking && q && (
        <div class="rg-ask" data-testid="rg-ask">
          <div class="question">
            <div class={`rg-playing e-${asking.card.effect}`}>
              {q.apoio
                ? `${EFFECTS[asking.card.effect].name}: ${effectText(asking.card.effect, run.strongAmount(asking.card))}`
                : `${EFFECTS[asking.card.effect].name}: acertou, ${effectText(asking.card.effect, run.strongAmount(asking.card))}; errou, sai fraco`}
            </div>
            {q.apoio && !feedback && (
              <>
                <span class="ap-pratica" data-testid="rg-pratica">
                  Prática: errar aqui não enfraquece a carta
                </span>
                <span class="ap-dica" data-testid="rg-dica">
                  {q.dica}
                </span>
              </>
            )}
            <div key={q.prompt} class={`prompt ${q.kind}`} data-testid="prompt">
              {q.prompt}
            </div>
            {q.sub && <div class="sub">{q.sub}</div>}
            <div class="ask">{q.ask}</div>
            {q.typing ? (
              <form
                class="typing"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (typed.trim()) submit(typed);
                }}
              >
                <input
                  ref={inputEl}
                  value={typed}
                  onInput={(e) => setTyped((e.target as HTMLInputElement).value)}
                  placeholder="ex.: hitori ou ひとり"
                  autocomplete="off"
                  autocapitalize="off"
                  spellcheck={false}
                  disabled={!!feedback}
                  class={feedback ? (feedback.ok ? 'right' : 'wrong') : ''}
                  data-testid="typing"
                  data-answer={q.answer}
                />
                <button type="submit" disabled={!!feedback}>
                  Jogar <kbd>Enter</kbd>
                </button>
              </form>
            ) : (
              <div class={`choices ${q.kind}`}>
                {q.choices.map((c, i) => {
                  let cls = 'choice';
                  if (feedback) {
                    if (c === q.answer) cls += ' right';
                    else if (c === feedback.chosen) cls += ' wrong';
                    else cls += ' dim';
                  }

                  return (
                    <button key={c} class={cls} onClick={() => submit(c)} data-answer={c === q.answer ? 'yes' : undefined}>
                      <kbd>{i + 1}</kbd>
                      <span>{c}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div class={`echo${feedback ? ' show' : ''}${feedback && !feedback.ok ? ' bad' : ''}`} data-testid="rg-echo">
              {feedback && (
                <>
                  {!feedback.ok && <b>Era: {q.answer}</b>}
                  <b>{feedback.note}</b>
                  <span>{q.echo}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {run.phase === 'over' && !asking && (
        <div class={run.won ? 'overlay win' : 'overlay'} data-testid="rg-over">
          <h2 class={run.won ? 'big win' : 'big'}>{run.won ? 'Chefe derrotado!' : 'Fim da run'}</h2>
          <p class="muted">
            {run.won ? 'Você chegou ao topo.' : 'A vida acabou.'} Tudo que você estudou continua na memória.
          </p>
          <div class="summary">
            <div>
              <b>
                {run.floor}/{run.map.length}
              </b>
              <span>andares</span>
            </div>
            <div>
              <b>{total === 0 ? '-' : `${Math.round((run.stats.correct / total) * 100)}%`}</b>
              <span>de acerto</span>
            </div>
            <div>
              <b>{run.stats.bestCombo}</b>
              <span>melhor combo</span>
            </div>
            <div>
              <b>{run.stats.newItems.length > 0 ? run.stats.newItems.join(' ') : '-'}</b>
              <span>itens novos</span>
            </div>
          </div>
          <p class="gain">
            +{run.stats.coins} moedas · +{run.stats.xp} XP
          </p>
          <div class="actions center">
            <button class="primary" onClick={restart}>
              Nova run <kbd>Enter</kbd>
            </button>
            <button onClick={leave}>
              Voltar ao fliperama <kbd>Esc</kbd>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Offer({ card, index, isNew, amount, onPick }: { card: RunCard; index: number; isNew: boolean; amount: number; onPick: () => void }) {
  const face = faceOf(card.itemId);
  return (
    <button class={`rg-offer e-${card.effect}`} onClick={onPick} data-testid="rg-offer">
      <kbd>{index + 1}</kbd>
      {isNew && <span class="badge">NOVO</span>}
      <span class={`rg-card-jp ${face.kind}${face.jp.length > 3 ? ' long' : ''}`}>{face.jp}</span>
      <b>{face.pt}</b>
      {face.kana && <span class="sub">{face.kana}</span>}
      <span>
        {EFFECTS[card.effect].name}: {effectText(card.effect, amount)}
      </span>
    </button>
  );
}
