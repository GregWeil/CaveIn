/// main.ts
//Define the different pages and how they interact

import { Howler, Howl } from 'howler';

import * as Pages from './pages';
import * as Game from './wrapper';

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

Pages.registerHome(new Pages.Page({
  name: 'title',
  selector: '#title-page',
  setup: function() {
    window.addEventListener('keydown', startGame);
    
    showSingle(this.selector + ' .save', '.loading');
    Game.save.get().then(save => {
      showSingle(this.selector + ' .save', save ? '.exists' : '.missing');
    });
    
    showSingle(this.selector + ' .best', '.loading');
    Game.best.score().then(score => {
      showSingle(this.selector + ' .best', score > 0 ? '.exists' : '.missing');
      if (score > 0) {
        document.querySelectorAll(this.selector + ' .score').forEach(e => {
          e.textContent = score;
        });
      }
    });
  },
  teardown: function() {
    window.removeEventListener('keydown', startGame);
  }
}));

Pages.registerPage(new Pages.Page({
  name: 'tutorial',
  selector: '#tutorial-page'
}));

Pages.registerRedirect('newgame', 'game', () => {
  Game.save.clear();
});

Pages.registerPage(new Pages.Page({
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

Pages.registerPage(new Pages.Page({
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

Pages.initialize();

// Background music setup

const audioMusic = new Howl({ preload: false, src: ['/assets/cavein.wav'] });
let audioMusicId: number | null = null;

audioMusic.on('end', () => {
  audioMusicId = audioMusic.play();
}).on('play', () => {
  document.body.classList.add('music-enabled');
}).on('pause', () => {
  document.body.classList.remove('music-enabled');
});

function music(enable?: boolean) {
  if (enable === undefined) {
    enable = !localStorage.getItem('no-music');
  } else if (enable) {
    localStorage.removeItem('no-music');
  } else {
    localStorage.setItem('no-music', 'true');
  }
  
  //Make sure the page is visible
  if (document.hidden) {
    enable = false;
  }
  
  if (audioMusicId === null) {
    if (enable) {
      audioMusicId = audioMusic.play();
    }
  } else if (enable) {
    audioMusic.play(audioMusicId);
  } else {
    audioMusic.pause(audioMusicId);
  }
};

window.addEventListener('visibilitychange', () => {
  Howler.mute(document.hidden);
  music();
});

audioMusic.once('load', () => {
  console.log('music loaded');
  document.body.classList.add('music-loaded');
  music();
}).load();

// Fullscreen toggling

function fullscreenEnter() {
  const element: any = document.documentElement;
  const names = [
    'requestFullscreen',
    'webkitRequestFullscreen',
    'mozRequestFullScreen',
    'msRequestFullscreen'
  ];
  for (let i = 0; i < names.length; ++i) {
    if (element[names[i]]) {
      element[names[i]]();
      break;
    }
  }
  (window.screen as any).lock('landscape');
};

function fullscreenExit() {
  const element: any = document;
  const names = [
    'exitFullscreen',
    'webkitExitFullscreen',
    'mozCancelFullScreen',
    'msExitFullscreen'
  ];
  for (let i = 0; i < names.length; ++i) {
    if (element[names[i]]) {
      element[names[i]]();
      break;
    }
  }
};

// Attach event listeners

const listeners: { [key: string]: () => void } = {
  'enable-music': () => music(true),
  'disable-music': () => music(false),
  'enter-fullscreen': () => fullscreenEnter(),
  'exit-fullscreen': () => fullscreenExit(),
};
document.addEventListener('click', (evt) => {
  Object.entries(listeners).forEach(([key, func]) => {
    const target = evt.target as HTMLElement;
    if (target.closest('a[data-onclick-' + key + ']')) {
      func();
    }
  });
});