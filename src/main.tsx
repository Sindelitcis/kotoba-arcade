import { render } from 'preact';
import { screen } from './core/app';
import { AventuraGame } from './games/aventura/AventuraGame';
import { KanaBeatGame } from './games/kanabeat/KanaBeatGame';
import { Booster } from './games/kanjimon/Booster';
import { Dex } from './games/kanjimon/Dex';
import { KanjiMonGame } from './games/kanjimon/KanjiMonGame';
import { RoguelikeGame } from './games/roguelike/RoguelikeGame';
import { Hub } from './hub/Hub';
import './styles.css';

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
    default:
      return <Hub />;
  }
}

render(<App />, document.getElementById('app') as HTMLElement);
