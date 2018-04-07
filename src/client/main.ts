/// main.ts
//Define the different pages and how they interact

import * as Pages from './pages';
import * as Settings from './settings';
import * as Save from './save';
import * as Game from './wrapper';

function showSingle(select: string, except: string): void {
  document.querySelectorAll(select).forEach(e => {
    if (e.matches(except)) {
      e.classList.remove('hidden');
    } else {
      e.classList.add('hidden');
    }
  });
}

function startGame(evt: KeyboardEvent): void {
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
    Game.playable.create({
      onRetry: () => {
        Pages.navigate('newgame');
      }
    });
  },
  teardown: () => {
    Game.playable.destroy();
  }
}));

Pages.register(new Pages.Page({
  name: 'replay',
  selector: '#game-page',
  setup: () => {
    Game.watchable.create({
      onComplete: () => {
        Pages.navigate('title');
      }
    });
  },
  teardown: () => {
    Game.watchable.destroy();
  }
}));

Pages.initialize('title');
Settings.initialize();