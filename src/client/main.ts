/// main.ts
//Define the different pages and how they interact

import * as Pages from './pages';
import * as Settings from './settings';
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
    Game.save.get().then(save => {
      showSingle(page.selector + ' .save', save ? '.exists' : '.missing');
    });
    
    showSingle(page.selector + ' .best', '.loading');
    Game.best.score().then(score => {
      showSingle(page.selector + ' .best', score > 0 ? '.exists' : '.missing');
      if (score > 0) {
        document.querySelectorAll(page.selector + ' .score').forEach(e => {
          e.textContent = score;
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
  Game.save.clear();
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