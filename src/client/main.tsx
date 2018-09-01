/// main.tsx
//Define the different pages and how they interact

import { render, h, Component } from 'preact';

import * as Pages from './pages';
import * as Settings from './settings';
import * as Save from './save';
import * as Game from './wrapper';

import Title from './title';
import Tutorial from './tutorial';
import { GamePage, ReplayPage } from './game';

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

class Router extends Component {
  state: {page: ''}
  onHashChange() {
    this.setState({page: window.location.hash.slice(1)});
  }
  componentDidMount() {
    this.onHashChange = this.onHashChange.bind(this);
    window.addEventListener('hashchange', this.onHashChange);
  }
  componentWillUnmount() {
    window.removeEventListener('hashchange', this.onHashChange);
  }
  render({}, {page}) {
    switch (page) {
      case 'title':
        return <Title/>;
      case 'tutorial':
        return <Tutorial/>;
      case 'game':
        return <GamePage save={state.save}/>;
      case 'replay':
        return <ReplayPage/>;
    }
    return <Title/>;
  }
}

const App = () => (
  <Router/>
);

render(App, document.getElementById('test'));