import { render } from 'preact';
import { screen } from './core/app';
import { Booster } from './games/kanjimon/Booster';
import { Dex } from './games/kanjimon/Dex';
import { KanjiMonGame } from './games/kanjimon/KanjiMonGame';
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
    default:
      return <Hub />;
  }
}

render(<App />, document.getElementById('app') as HTMLElement);
