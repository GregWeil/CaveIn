/// main.js
//Define the different pages and how they interact

var $ = require('jquery');
var Howl = require('howler').Howl;
var storage = require('local-storage');

var Pages = require('pages.js');
var Game = require('wrapper.js');

Pages.home(new Pages.Page({
  name: 'title',
  selector: '#title-page',
  start: function(evt) {
    if (evt.key === ' ') {
      Pages.navigate('game');
    }
  },
  setup: function() {
    window.addEventListener('keydown', this.config.start);
    
    var $save = $(this.selector + ' .save');
    $save.hide().filter('.loading').show();
    Game.save.get().then(save => {
      $save.hide();
      if (save) {
        $save.filter('.exists').show();
      }
    });
    
    var $best = $(this.selector + ' .best');
    $best.hide().filter('.loading').show();
    Game.best.score().then(score => {
      $best.hide();
      if (score > 0) {
        $best.filter('.exists').show();
        $best.find('.score').text(score);
      }
    });
  },
  teardown: function() {
    window.removeEventListener('keydown', this.config.start);
  }
}));

Pages.add(new Pages.Page({
  name: 'tutorial',
  selector: '#tutorial-page'
}));

Pages.redirect('newgame', 'game', function() {
  Game.save.clear();
});

Pages.add(new Pages.Page({
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

Pages.add(new Pages.Page({
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

Pages.setup();

var audioMusic = new Howl({ preload: false, src: ['/assets/cavein.wav'] });
var audioMusicId = null;

audioMusic.on('end', function() {
  audioMusicId = audioMusic.play();
}).on('play', function() {
  document.body.classList.add('music-enabled');
}).on('pause', function() {
  document.body.classList.remove('music-enabled');
});

window.addEventListener('visibilitychange', () => window.music());

window.music = function(enable) {
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

audioMusic.once('load', function() {
  document.body.classList.add('music-loaded');
  window.music();
}).load();

window.fullscreenEnter = function() {
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
  screen.orientation.lock('landscape').catch(console.warn);
};

window.fullscreenExit = function() {
  var element = document;
  var names = [
    'exitFullscreen',
    'webkitExitFullscreen',
    'mozCancelFullScreen',
    'msExitFullscreen'
  ];
  for (var i = 0; i < names.length; ++i) {
    if (element[names[i]]) {
      element[names[i]]();
      break;
    }
  }
};