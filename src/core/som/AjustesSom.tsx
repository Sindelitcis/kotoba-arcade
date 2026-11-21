/**
 * Parte de som dos Ajustes: liga e desliga tudo, os três volumes e os créditos de cada
 * música e efeito (fonte, autor e licença).
 */
import { useState } from 'preact/hooks';
import { TRACKS, LICENCA_URL } from '../../games/kanabeat/tracks';
import { app, commit, tick } from '../app';
import { sfx } from '../audio';
import { CLIMAS, EFEITO_IDS, EFEITOS, FONTES, TRILHAS } from './catalogo';
import './som.css';

type Volume = 'volMusica' | 'volEfeitos' | 'volVoz';

const VOLUMES: readonly (readonly [Volume, string])[] = [
  ['volMusica', 'Música'],
  ['volEfeitos', 'Efeitos'],
  ['volVoz', 'Voz'],
];

export function AjustesSom() {
  // Redesenha a cada gravação (som ligado, volume novo).
  void tick.value;
  const settings = app.data.settings;
  const [creditos, setCreditos] = useState(false);

  const ligar = () => {
    settings.sound = !settings.sound;
    commit();
    sfx.click();
  };
  const mudar = (qual: Volume, valor: number) => {
    settings[qual] = valor / 100;
    commit();
  };
  // Ao soltar o controle de efeitos, um toque para ouvir o volume novo.
  const soltar = (qual: Volume) => {
    if (qual === 'volEfeitos') sfx.click();
  };

  return (
    <>
      <label class="check">
        <input type="checkbox" checked={settings.sound} onChange={ligar} data-testid="som-ligado" /> Som (música, efeitos e voz)
      </label>
      <div class="som-volumes">
        {VOLUMES.map(([qual, nome]) => (
          <label key={qual}>
            <span>{nome}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(settings[qual] * 100)}
              disabled={!settings.sound}
              onInput={(e) => mudar(qual, Number((e.target as HTMLInputElement).value))}
              onChange={() => soltar(qual)}
              data-testid={`som-${qual}`}
            />
          </label>
        ))}
      </div>
      <button class="ghost" aria-expanded={creditos} onClick={() => setCreditos(!creditos)} data-testid="som-creditos">
        Créditos do som
      </button>
      {creditos && <CreditosSom />}
    </>
  );
}

/** Lista de tudo que toca no site, com link para a origem e as regras de uso. */
export function CreditosSom() {
  return (
    <div class="som-creditos" data-testid="som-creditos-lista">
      <h3>Músicas de fundo</h3>
      <ul>
        {CLIMAS.map((c) => {
          const t = TRILHAS[c];
          return (
            <li key={c}>
              <a href={t.link} target="_blank" rel="noreferrer">
                {t.titulo}
              </a>{' '}
              · {FONTES[t.fonte].credito} · {t.onde}
            </li>
          );
        })}
      </ul>
      <h3>Músicas do Kana Beat</h3>
      <ul>
        {TRACKS.map((tr) => (
          <li key={tr.id}>
            <a href={tr.link} target="_blank" rel="noreferrer">
              {tr.titulo}
            </a>{' '}
            de {tr.autor} ·{' '}
            <a href={LICENCA_URL[tr.licenca]} target="_blank" rel="noreferrer">
              {tr.licenca}
            </a>
          </li>
        ))}
      </ul>
      <h3>Efeitos</h3>
      <ul>
        {EFEITO_IDS.map((id) => (
          <li key={id}>
            {EFEITOS[id].titulo} · {FONTES[EFEITOS[id].fonte].credito} · {EFEITOS[id].quando}
          </li>
        ))}
      </ul>
      {Object.values(FONTES).map((f) => (
        <p key={f.site} class="muted">
          <a href={f.site} target="_blank" rel="noreferrer">
            {f.nome}
          </a>
          : {f.resumo}{' '}
          <a href={f.regras} target="_blank" rel="noreferrer">
            Regras de uso
          </a>
          .
        </p>
      ))}
    </div>
  );
}
