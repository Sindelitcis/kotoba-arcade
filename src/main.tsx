import { effect } from '@preact/signals';
import { render } from 'preact';
import { screen } from './core/app';
import { loadVoices, sfx } from './core/audio';
import { zerar } from './core/cor';
import { HelpButton } from './core/help/HelpButton';
import { AventuraGame } from './games/aventura/AventuraGame';
import { CenaGame } from './games/cena/CenaGame';
import { ConversaGame } from './games/conversa/ConversaGame';
import { GramaticaGame } from './games/gramatica/GramaticaGame';
import { KanaBeatGame } from './games/kanabeat/KanaBeatGame';
import { KanaImagensGame } from './games/kanaimagens/KanaImagensGame';
import { Booster } from './games/kanjimon/Booster';
import { Dex } from './games/kanjimon/Dex';
import { KanjiMonGame } from './games/kanjimon/KanjiMonGame';
import { PecasGame } from './games/pecas/PecasGame';
import { MemoriaGame } from './games/memoria/MemoriaGame';
import { RoguelikeGame } from './games/roguelike/RoguelikeGame';
import { Hub } from './hub/Hub';
import { JornadaTela } from './jornada/JornadaTela';
import { LicaoTela } from './jornada/LicaoTela';
import './styles.css';

// O manifesto das vozes gravadas já vem antes da primeira fala.
void loadVoices();

function App() {
  switch (screen.value) {
    case 'kanjimon':
      return <KanjiMonGame />;
    case 'kanjidex':
      return <Dex />;
    case 'booster':
      return <Booster />;
    case 'kanabeat':
      return <KanaBeatGame />;
    case 'roguelike':
      return <RoguelikeGame />;
    case 'aventura':
      return <AventuraGame />;
    case 'conversa':
      return <ConversaGame />;
    case 'gramatica':
      return <GramaticaGame />;
    case 'memoria':
      return <MemoriaGame />;
    case 'cena':
      return <CenaGame />;
    case 'jornada':
      return <JornadaTela />;
    case 'licao':
      return <LicaoTela />;
    case 'pecas':
      return <PecasGame />;
    case 'kanaimagens':
      return <KanaImagensGame />;
    default:
      return <Hub />;
  }
}

// Trocar de tela é virar a página, e a página nova começa no traço (sem cor).
let firstScreen = true;
effect(() => {
  void screen.value;
  zerar();
  if (firstScreen) firstScreen = false;
  else sfx.page();
});

/** A tela e, num canto, o botão de ajuda dela. */
function Raiz() {
  return (
    <>
      <App />
      <HelpButton tela={screen.value} />
    </>
  );
}

render(<Raiz />, document.getElementById('app') as HTMLElement);
