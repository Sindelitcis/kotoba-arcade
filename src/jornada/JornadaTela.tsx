import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { alvosDaLicaoPorId, useAprofundar } from '../core/aprofundar/estado';
import { commit, go, jornadaSave, licaoAberta, screen, tick } from '../core/app';
import { cenaStyle } from '../core/arte';
import { sfx } from '../core/audio';
import { foco } from '../core/foco';
import { teclaDe } from '../core/teclas';
import { andamento, ETAPAS, etapaDa, missoesDa, NOME_JOGO, proximaMissao, type Etapa, type Missao } from './etapas';

/** Abre a missão: a lição em quadrinhos ou o jogo já recortado no conteúdo dela. */
export function iniciarMissao(m: Missao): void {
  const save = jornadaSave();
  const etapa = etapaDa(m.id);
  if (etapa) save.etapa = etapa.id;
  commit();
  sfx.click();
  if (m.acao.tipo === 'licao') {
    licaoAberta.value = { licao: m.acao.licao, missao: m.id };
    go('licao');
  } else {
    foco.value = { missao: m.id, titulo: m.titulo, ...m.acao.foco };
    go(m.acao.tela);
  }
}

function tipoDa(m: Missao): string {
  return m.acao.tipo === 'licao' ? 'Lição em quadrinhos' : NOME_JOGO[m.acao.tela];
}

function minutosDa(e: Etapa): number {
  return missoesDa(e).reduce((t, m) => t + m.minutos, 0);
}

function EtapaQuadro({ e, n, onAbrir }: { e: Etapa; n: number; onAbrir: () => void }) {
  const save = jornadaSave();
  const total = missoesDa(e).length;
  const v = andamento(e, save);
  const feitas = Math.round(v * total);
  return (
    <button class={`koma jn-etapa${total === 0 ? ' depois' : ''}`} style={cenaStyle(e.cena)} onClick={onAbrir} data-testid={`jn-etapa-${e.id}`}>
      <span class="jn-etapa-jp">{e.jp}</span>
      <span class="jn-etapa-titulo">
        {e.titulo} <kbd>{n}</kbd>
      </span>
      <span class="jn-etapa-resumo">{e.resumo}</span>
      <span class="jn-etapa-info">
        {total > 0 ? `${feitas} de ${total} missões · uns ${minutosDa(e)} min no total` : 'Ainda sem conteúdo: o caminho que vem depois'}
      </span>
      {total > 0 && (
        <span class="bar" aria-hidden="true">
          <i style={{ width: `${v * 100}%` }} />
        </span>
      )}
    </button>
  );
}

export function JornadaTela() {
  void tick.value;
  const save = jornadaSave();
  const [aberta, setAberta] = useState<Etapa | null>(() => ETAPAS.find((e) => e.id === save.etapa) ?? null);
  const proxima = proximaMissao(save, aberta && missoesDa(aberta).length > 0 ? aberta : undefined);
  const lista = aberta ? missoesDa(aberta) : [];
  const [sel, setSel] = useState(() => (proxima ? Math.max(0, lista.indexOf(proxima)) : 0));
  const listaEl = useRef<HTMLOListElement>(null);
  // Aprofundar: o assunto da missão selecionada (ponto de gramática, situação).
  const missaoSel = lista[sel];
  useAprofundar(missaoSel?.acao.tipo === 'licao' ? alvosDaLicaoPorId(missaoSel.acao.licao) : []);

  const abrir = (e: Etapa | null) => {
    const s = jornadaSave();
    if (e) s.etapa = e.id;
    else delete s.etapa;
    commit();
    setAberta(e);
    const ms = e ? missoesDa(e) : [];
    const p = e ? proximaMissao(s, ms.length > 0 ? e : undefined) : undefined;
    setSel(p ? Math.max(0, ms.indexOf(p)) : 0);
    sfx.page();
  };

  // A missão escolhida fica sempre à vista.
  useLayoutEffect(() => {
    listaEl.current?.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  }, [sel, aberta]);

  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tecla = teclaDe(e);
      if (tecla === null || screen.value !== 'jornada') return;
      if (tecla === 'Escape') {
        e.preventDefault();
        if (aberta) abrir(null);
        else go('hub');
        return;
      }
      if (tecla === 'Enter' || tecla === ' ') {
        if (e.target instanceof HTMLElement && e.target.closest('button')) return;
        e.preventDefault();
        const m = aberta ? lista[sel] : proxima;
        if (m) iniciarMissao(m);
        return;
      }
      if (aberta && (tecla === 'ArrowDown' || tecla === 'ArrowUp')) {
        e.preventDefault();
        const d = tecla === 'ArrowDown' ? 1 : -1;
        setSel((s) => Math.min(Math.max(0, s + d), Math.max(0, lista.length - 1)));
        return;
      }
      if (!aberta && /^[1-7]$/.test(tecla)) {
        const etapa = ETAPAS[Number(tecla) - 1];
        if (etapa) abrir(etapa);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [aberta, sel, proxima, lista]);

  if (aberta) {
    let i = 0;
    return (
      <main class="jn">
        <header class="jn-topo">
          <button class="ghost" onClick={() => abrir(null)}>
            ← Mapa <kbd>Esc</kbd>
          </button>
          <div>
            <h1>
              <span class="jn-topo-jp">{aberta.jp}</span> {aberta.titulo}
            </h1>
            <p class="muted">{aberta.resumo}</p>
          </div>
        </header>
        {lista.length > 0 ? (
          <p class="muted jn-dica">
            Escolha com <kbd>↑</kbd> <kbd>↓</kbd> e comece com <kbd>Enter</kbd>. Qualquer missão pode ser feita a qualquer hora, em qualquer ordem.
          </p>
        ) : (
          <p class="notice">Esta etapa ainda não tem missões. Abaixo está o que ela vai cobrir.</p>
        )}
        <ol class="jn-trilhas" ref={listaEl}>
          {aberta.trilhas.map((t) => (
            <li key={t.titulo} class="jn-trilha">
              <h2>{t.titulo}</h2>
              <ol>
                {t.missoes.map((m) => {
                  const idx = i++;
                  const vezes = save.feitas[m.id] ?? 0;
                  return (
                    <li key={m.id}>
                      <button
                        class={`jn-missao${idx === sel ? ' sel' : ''}${vezes > 0 ? ' feita' : ''}`}
                        onClick={() => iniciarMissao(m)}
                        onMouseEnter={() => setSel(idx)}
                        data-testid="jn-missao"
                      >
                        <span class="jn-missao-titulo">{m.titulo}</span>
                        <span class="jn-missao-tipo">
                          {tipoDa(m)} · {m.minutos} min{vezes > 0 ? ` · feita ${vezes}×` : ''}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
        {aberta.depois.length > 0 && (
          <section class="panel jn-depois">
            <h2>Vem depois</h2>
            <p class="muted">Temas desta etapa que ainda não têm conteúdo no arcade.</p>
            <ul>
              {aberta.depois.map((d) => (
                <li key={d.titulo}>
                  {d.titulo} <small class="muted">({d.fonte})</small>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    );
  }

  const etapaProx = proxima ? etapaDa(proxima.id) : undefined;
  return (
    <main class="jn">
      <header class="jn-topo">
        <button class="ghost" onClick={() => go('hub')}>
          ← Fliperama <kbd>Esc</kbd>
        </button>
        <div>
          <h1>
            <span class="jn-topo-jp">旅</span> Jornada
          </h1>
          <p class="muted">Do zero até trabalhar no Japão. Nada fica trancado: veja tudo, comece por onde quiser.</p>
        </div>
        <button class="ghost jn-ouvir" onClick={() => go('ouvir')} data-testid="jn-ouvir">
          Ouvir as aulas, sem olhar a tela
        </button>
      </header>

      {proxima && (
        <button
          class="play-now jn-proxima"
          style={cenaStyle(etapaProx?.cena)}
          onClick={() => iniciarMissao(proxima)}
          data-testid="jn-proxima"
        >
          <span class="hub-rotulo">Próxima missão</span>
          <span class="play-now-main">{proxima.titulo}</span>
          <span class="play-now-sub">
            {etapaProx?.titulo} · {tipoDa(proxima)} · {proxima.minutos} min <kbd>Enter</kbd>
          </span>
        </button>
      )}

      <section class="jn-mapa">
        {ETAPAS.map((e, n) => (
          <EtapaQuadro key={e.id} e={e} n={n + 1} onAbrir={() => abrir(e)} />
        ))}
      </section>
    </main>
  );
}
