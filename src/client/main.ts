/// main.js
//Define the different pages and how they interact

import { Howler, Howl } from 'howler';
import * as storage from 'local-storage';

import * as Pages from './pages';
import * as Game from './wrapper';

function showSingle(select, except) {
  document.querySelectorAll(select).forEach(e => {
    if (e.matches(except)) {
      e.classList.remove('hidden');
    } else {
      e.classList.add('hidden');
    }
  });
}

function startGame(evt) {
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
        document.querySelector(this.selector + ' .best.exists .score').textContent = score;
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

Pages.registerRedirect('newgame', 'game', function() {
  Game.save.clear();
});

Pages.registerPage(new Pages.Page({
  name: 'game',
  selector: '#game-page',
  setup: function() {
    Game.playable.create({
      onRetry: function() {
        Pages.navigate('newgame');
      }
    });
  },
  teardown: function() {
    Game.playable.destroy();
  }
}));

Pages.registerPage(new Pages.Page({
  name: 'replay',
  selector: '#game-page',
  setup: function() {
    Game.watchable.create({
      onComplete: function() {
        Pages.navigate('title');
      }
    });
  },
  teardown: function() {
    Game.watchable.destroy();
  }
}));

Pages.initialize();

// Background music setup

const audioMusic = new Howl({ preload: false, src: ['/assets/cavein.wav'] });
let audioMusicId = null;

audioMusic.on('end', () => {
  audioMusicId = audioMusic.play();
}).on('play', () => {
  document.body.classList.add('music-enabled');
}).on('pause', () => {
  document.body.classList.remove('music-enabled');
});

function music(enable?: boolean) {
  if (enable === undefined) {
    enable = !storage.get('no-music');
  } else if (enable) {
    storage.remove('no-music');
  } else {
    storage.set('no-music', true);
  }
  
  //Make sure the page is visible
  if (document.hidden) {
    enable = false;
  }
  
  if (enable && audioMusicId === null) {
    audioMusicId = audioMusic.play();
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
});

// Fullscreen toggling

function fullscreenEnter() {
  var element = document.documentElement;
  var names = [
    'requestFullscreen',
    'webkitRequestFullscreen',
    'mozRequestFullScreen',
    'msRequestFullscreen'
  ];
  for (var i = 0; i < names.length; ++i) {
    if (element[names[i]]) {
      element[names[i]]();
      break;
    }
  }
  window.screen['orientation'].lock('landscape');
};

function fullscreenExit() {
  const names: string[] = [
    'exitFullscreen',
    'webkitExitFullscreen',
    'mozCancelFullScreen',
    'msExitFullscreen'
  ];
  for (var i = 0; i < names.length; ++i) {
    if (document[names[i]]) {
      document[names[i]]();
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