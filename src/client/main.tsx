/// main.tsx
//Define the different pages and how they interact

import { render, h, Component } from 'preact';

import * as Pages from './pages';
import * as Settings from './settings';
import * as Save from './save';
import * as Game from './wrapper';

import { FullscreenManager } from './fullscreen';
import { ReplayValidatorManager } from './validator';
import { SaveManager } from './save';

import TitlePage from './title';
import TutorialPage from './tutorial';
import { GamePage } from './game';
import ReplayPage from './replay';

function showSingle(select: string, except: string) {
  document.querySelectorAll(select).forEach(e => {
    if (e.matches(except)) {
      e.classList.remove('hidden');
    } else {
      e.classList.add('hidden');
    }
  });
}

function startGame(evt: KeyboardEvent) {
  if (evt.key === ' ') {
    Pages.navigate('game');
  }
}

Pages.register(new Pages.Page({
  name: 'title',
  selector: '#title-page',
  setup: page => {
    window.addEventListener('keydown', startGame);
    
    showSingle(page.selector + ' .save', '.loading');
    Save.getSave().then(save => {
      showSingle(page.selector + ' .save', save ? '.exists' : '.missing');
    });
    
    showSingle(page.selector + ' .best', '.loading');
    Save.getBestScore().then(score => {
      showSingle(page.selector + ' .best', score ? '.exists' : '.missing');
      if (score) {
        document.querySelectorAll(page.selector + ' .score').forEach(e => {
          e.textContent = score.toString();
        });
      }
    });
  },
  teardown: () => {
    window.removeEventListener('keydown', startGame);
  }
}));

Pages.register(new Pages.Page({
  name: 'tutorial',
  selector: '#tutorial-page'
}));

Pages.redirect('newgame', 'game', () => {
  Save.clearSave();
});

Pages.register(new Pages.Page({
  name: 'game',
  selector: '#game-page',
  setup: () => {
    Game.createPlayable();
  },
  teardown: () => {
    Game.destroy();
  }
}));

Pages.register(new Pages.Page({
  name: 'replay',
  selector: '#game-page',
  setup: () => {
    Game.createWatchable();
  },
  teardown: () => {
    Game.destroy();
  }
}));

Pages.initialize('title');
Settings.initialize();

class Router extends Component<{}, {page: string, key: number}> {
  state = {page: '', key: 0}
  onHashChange() {
    this.setState({
      page: window.location.hash.slice(1),
      key: Math.random(),
    });
  }
  componentDidMount() {
    this.onHashChange = this.onHashChange.bind(this);
    window.addEventListener('hashchange', this.onHashChange);
  }
  componentWillUnmount() {
    window.removeEventListener('hashchange', this.onHashChange);
  }
  render() {
    const {page, key} = this.state;
    switch (page) {
      case 'title':
        return <TitlePage key={key}/>;
      case 'tutorial':
        return <TutorialPage key={key}/>;
      case 'game':
        return <GamePage key={key}/>;
      case 'replay':
        return <ReplayPage key={key}/>;
    }
    return <TitlePage key={key}/>;
  }
}

const Main = () => (
  <FullscreenManager>
    <ReplayValidatorManager>
      <SaveManager>
        <Router/>
      </SaveManager>
    </ReplayValidatorManager>
  </FullscreenManager>
);

//render(<Main/>, document.getElementById('test')!);